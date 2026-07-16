# SKコーム 現場管理AI Worker（フェーズ1）

LINE Messaging APIのwebhookを受け、原本画像をR2へ先に保存してから、Supabaseの現場台帳とClaudeによる判定へ進むCloudflare Workerです。現場ページ、承認済み定型返信、月曜08:00 JSTの週次サマリも同じWorkerから配信します。

## 構成

- `src/services/webhook.ts`: 未加工bodyの署名検証後にイベントを受理
- `src/services/event-processor.ts`: R2先行保存、冪等化、5分バースト、台帳記録・訂正学習
- `src/engine/`: 48h/24h文脈、正規化・安全判定、Claude判定
- `prompts/site-matcher.md`: 判定プロンプトv0.1
- `src/services/site-page.ts`: HMAC署名付き現場トークンによる現場ページ・画像配信
- `src/services/admin-media.ts`: Supabaseログインとadmin/staff役割を確認する管理画面向けR2配信
- `src/services/weekly.ts`: 完工候補・7日停滞・学習ログを含む週報
- `scripts/seed-aliases.ts`: 初期辞書から既存projectsへaliasを投入
- `scripts/run-regression.ts`: JSONL回帰テストCLI

## 初期設定

リポジトリルートでmigrationを適用します。

```bash
supabase db push
```

Workerディレクトリで依存関係を入れ、今回専用のR2 bucketを作成します。

```bash
cd workers/genba-ai
npm install
npx wrangler r2 bucket create skhome-genba-ai-photos
```

`wrangler.toml` の `SUPABASE_URL` と `PUBLIC_BASE_URL` は今回のSupabaseと新Worker名に設定済みです。新規Workerには先に秘密を登録できないため、Cron・R2・外部API接続を持たない待機用Workerを作成します。この段階ではLINEのWebhook URLを変更しません。

```bash
npm run bootstrap:deployment
```

秘密値はファイルへ書かず、待機用設定を指定して次のコマンドで投入します。値の入力は発注側が行います。

```bash
npx wrangler secret put LINE_CHANNEL_SECRET --config wrangler.bootstrap.toml
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN --config wrangler.bootstrap.toml
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.bootstrap.toml
npx wrangler secret put ANTHROPIC_API_KEY --config wrangler.bootstrap.toml
npx wrangler secret put LINE_SUMMARY_USER_ID --config wrangler.bootstrap.toml
```

5件の登録後、下記のテンプレート承認と初期alias seedを完了してから本実装をデプロイします。本実装の`wrangler.toml`はこの5つの秘密名を必須宣言しているため、1件でも未登録ならWranglerがデプロイを拒否します。待機用設定には必須宣言を置かず、発注側が5件を順番に入力できるようにしています。週次サマリはLINE個人宛てだけに送信し、Discord連携は行いません。

同じCloudflareアカウントには旧実装の`sk-genba-bot`と`sk-genba-media`があります。今回の対象は`skhome-genba-ai`と`skhome-genba-ai-photos`です。旧Worker・旧R2を上書きまたは再利用しません。

Claudeは `claude-haiku-4-5` が既定です。実データの回帰結果が基準未達の場合だけ、`wrangler.toml` の `ANTHROPIC_MODEL` を `claude-sonnet-5` に変えて再検証します。

## テンプレート承認

migrationは2026-07-11版のグループ文面6種（`photo_auto`、`photo_ask`、`answer_done`、`correction_done`、`create_confirm`、`create_done`）と個人宛てのT-06/T-07を、承認前ドラフトとして登録します。`approved_at` と `approved_by` がNULLの間は送信関数が必ず拒否します。検証用グループへ接続する前に、承認者を明示して対象行を更新してください。

グループ返信関数は6種のID、push関数はT-06/T-07しか型として受け付けません。本文はDBから取得するため、コードから自由文を送る経路はありません。

```sql
UPDATE public.bot_templates
SET approved_at = NOW(), approved_by = '<承認者>'
WHERE template_id IN (
  'photo_auto', 'photo_ask', 'answer_done', 'correction_done',
  'create_confirm', 'create_done', 'T-06', 'T-07'
);
```

未登録の現場名は、写真原本をR2へ保持したまま`awaiting_confirmation`で止めます。利用者が完全一致の「はい」を返した場合だけprojectsと写真台帳を同じDB処理で確定します。記録済み写真の訂正は`訂正 現場名`という明示形式だけを受け付け、訂正先も未登録なら同じ確認を挟みます。

写真に紐づかない通常テキストは、既存現場を安全に特定できた場合だけ工程記録へ追加します。未登録現場・曖昧なテキストは、承認済みの専用文面が台帳にないため新規現場を作らず、内部では`text_requires_known_site`として観測します。

## 初期alias seed

Migration適用後、Workerディレクトリから実行します。`.env.local` は読みません。

```bash
SUPABASE_URL='https://<project-ref>.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<service-role-key>' \
npm run seed:aliases -- --input data/site-aliases.json
```

DB準備後に本実装をデプロイします。この時点で初めてR2接続とCronが有効になります。

```bash
npx wrangler deploy
```

最後に実環境のWorker・R2・5シークレット・`/health`を値を表示せず確認します。これは読み取り専用で、設定変更やデプロイは行いません。

```bash
npm run preflight:deployment
```

## 検証

型・単体テスト:

```bash
npm run typecheck
npm test
```

実DBマイグレーション契約テスト（Docker互換環境とPostgreSQL 15を使用）:

```bash
npm run test:migration
```

このテストはホスト側のポートや本番secretを使わず、使い捨てコンテナへ既存テーブルの最小契約、実migration、状態遷移、管理画面の選定→公開、匿名閲覧時の非公開写真遮断を順に流します。履歴全体のSupabase初期化ではなく、現場AIと管理画面接続が追加するDB契約を再現するテストです。成功・失敗にかかわらずコンテナは削除されます。
Docker互換環境が停止している場合は15秒以内に明示エラーで終了します。Colimaを使う環境では`colima start`後に再実行してください。

回帰20件（承認済みJSONLの絶対パスを渡す）:

```bash
npm run test:regression -- --cases '/absolute/path/to/回帰テストケース_初期版.jsonl'
```

秘密値投入後にClaude Haiku 4.5自体を測る場合:

```bash
ANTHROPIC_API_KEY='<key>' npm run test:regression -- \
  --cases '/absolute/path/to/回帰テストケース_初期版.jsonl' \
  --live --model claude-haiku-4-5
```

WebhookからR2保存までのローカルsmoke testは3つのターミナルで行います。

```bash
npm run smoke:mock-line
```

```bash
npx wrangler dev --port 8787 \
  --var LINE_CHANNEL_SECRET:local-test-secret \
  --var LINE_CHANNEL_ACCESS_TOKEN:local-access-token \
  --var LINE_DATA_API_BASE_URL:http://127.0.0.1:8788 \
  --var TEST_MODE:true
```

```bash
npm run smoke:webhook
npx wrangler r2 object get skhome-genba-ai-photos/raw/mock-group/mock-message-001 --local --pipe | shasum -a 256
```

Cron配線のローカル確認（毎分の孤児回収と月曜週報）:

```bash
curl 'http://127.0.0.1:8787/cdn-cgi/handler/scheduled?cron=0+23+*+*+SUN&format=json'
```

毎分の回収処理は、R2・DBへ退避済みなのに処理が中断した画像とtextを、初回を含め2回まで処理します（再試行は1回）。回収時点ではLINEのreply tokenを安全に再利用できないため、写真判定が`photo_ask`または`create_confirm`を必要とする場合は誤assignせずfailedにし、T-07を週報送信先へpushしてWorkerの後続処理を停止します。グループへの有料pushは行いません。

デプロイ前bundle確認とデプロイ:

```bash
npx wrangler deploy --dry-run
npx wrangler deploy
```

## LINE側の設定

デプロイ後の `https://<worker-domain>/webhook` をLINE Developers ConsoleのWebhook URLに設定し、`Use webhook` と `Webhook redelivery` を有効化してからVerifyで200を確認します。本番グループへの招待は発注側の検収・承認後に行います。

## 5分バーストとreply token

LINE公式仕様ではreply tokenは1回だけ、受信後1分以内の利用が推奨されます。そのため、最初のwebhook内の写真群を即時判定・返信し、同じ送信者から5分以内に届く後続webhookは同じ`burst_id`・同じ現場へ無返信で追加します。5分経過後に総枚数を返信する方式はreply tokenの保証時間を超えるため採用していません。

現場ページ自体は推測不能トークンと`noindex`付きで配信します。現場確定済みの返信では既存設計の`{URL}`をテンプレート変数として常に用意しますが、2026-07-11版のグループ文面はURL変数を使わないため、承認前の本文をWorkerが変更することはありません。グループ返信にもリンクを表示する場合は、発注側が`bot_templates`の該当本文・`variables`へ`URL`を追加して再承認します。週次ページの現場名からは、現在の文面を変えずに各現場ページを開けます。

## 社内写真の分離

R2キー・LINE message ID・生payloadはRLSを有効にした`line_events`だけに保存します。既存`project_media`には現場台帳との関連を示す非掲載行だけを作り、公開projectのanon queryへR2キーや現場ページtokenを出しません。現場ページtokenはDBへ保存せず、現場IDを`LINE_CHANNEL_SECRET`でHMAC署名して生成します。

管理画面の`/admin/media/:eventId`は、ブラウザのSupabase access tokenを検証し、`users.role`が`admin`または`staff`の場合だけR2原本を`private, no-store`で返します。Next.js側が同一オリジンのAPIとして中継するため、R2キーやWorkerの署名情報はブラウザへ渡しません。公開時は`selected`状態を必須とし、公開Storageへ別コピーを作ってから`published`へ更新します。

Claude Visionへ渡す画像は1枚7MB以下・最大10枚に加え、base64化後のAPIリクエストが32MB制限を超えないよう原本合計18MiBまでに制限しています。対象外になった原本もR2には残ります。
