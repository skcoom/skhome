---
paths: src/lib/supabase/**/*.ts, src/**/*supabase*.ts
---

# Supabase連携規約

## クライアントの使い分け

| 用途 | ファイル | 使用場所 |
|------|---------|---------|
| サーバーサイド | `server.ts` | Server Components, API Routes |
| クライアントサイド | `client.ts` | Client Components |

```typescript
// Server Component / API Route
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Client Component
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

## 外部キー関係の明示（重要）

同一テーブル間に複数の外部キー関係がある場合、関係名を明示的に指定する。

```typescript
// NG: 曖昧な関係（PGRST201エラーになる）
.select(`*, project_media (*)`)

// OK: 関係名を明示
.select(`*, project_media!project_media_project_id_fkey (*)`)
```

**現在の複数関係があるテーブル:**
- `projects` ↔ `project_media`
  - `project_media_project_id_fkey`: プロジェクトの全メディア（1対多）
  - `projects_main_media_id_fkey`: メイン画像指定（多対1）

## エラーハンドリング

Supabaseのエラーは必ずチェックする。

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*');

if (error) {
  console.error('Supabase error:', error.message);
  throw new Error('データの取得に失敗しました');
}
```

## RLSポリシーの確認

テーブル操作時はRLS（Row Level Security）ポリシーを意識する。

- 公開データ: `anon` キーでアクセス可能か確認
- 認証必要データ: ユーザー認証後にアクセス
- 管理者データ: 適切なロールチェック

## 型安全なクエリ

`database.types.ts` の型定義を活用する。

```typescript
import type { Database } from '@/types/database';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
```

## 禁止事項

```typescript
// 環境変数の直接参照
const supabase = createClient(
  'https://xxx.supabase.co',  // NG: ハードコード
  'eyJhbGc...'                // NG: キーのハードコード
);

// サービスロールキーのクライアント使用
// service_role キーは絶対にクライアントサイドで使用しない
```

## DB変更時の確認事項

1. 外部キーを追加する場合、既存の関係と競合しないか確認
2. 変更後は必ずローカルで公開ページを確認
3. `npm run dev` のコンソールエラーを確認
