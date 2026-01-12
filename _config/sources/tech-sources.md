# 技術情報ソース一覧

SKhomeプロジェクトで使用している技術の公式情報源。
`/tech-updates` コマンドでチェックする対象。

---

## チェック対象ソース

### 高優先度（毎週チェック）

| ソース | URL | last_checked |
|--------|-----|--------------|
| Next.js Blog | https://nextjs.org/blog | - |
| React Blog | https://react.dev/blog | - |
| Supabase Blog | https://supabase.com/blog | - |

### 中優先度（月1回チェック）

| ソース | URL | last_checked |
|--------|-----|--------------|
| Tailwind CSS Blog | https://tailwindcss.com/blog | - |
| Anthropic News | https://www.anthropic.com/news | - |
| TypeScript Releases | https://github.com/microsoft/TypeScript/releases | - |

### 低優先度（四半期チェック）

| ソース | URL | last_checked |
|--------|-----|--------------|
| ESLint Blog | https://eslint.org/blog | - |
| Vercel Blog | https://vercel.com/blog | - |

---

## チェック時の判定基準

### 🔴 要対応（コード修正が必要）

- 使用中のAPIが非推奨化
- セキュリティ脆弱性の発表
- 現在のバージョンのサポート終了
- 破壊的変更がある新バージョンのリリース

### 🟡 参考情報（把握しておくべき）

- 新機能の追加
- パフォーマンス改善
- ベストプラクティスの更新
- 将来の非推奨化予告

### 🟢 対応不要

- 使用していない機能の更新
- 実験的機能の変更
- ドキュメントのみの更新

---

## last_checked の更新ルール

1. `/tech-updates` コマンド実行後、チェックしたソースの `last_checked` を更新
2. 形式: `YYYY-MM-DD`
3. `-` は未チェックを意味する

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-01-12 | 初版作成 |
