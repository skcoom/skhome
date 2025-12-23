# SK-KOMU System - Claude Code Memory

## Project Overview

企業向けWebサイト（SK-KOMU）のNext.js 16アプリケーション。
管理画面と公開ページを持ち、Supabaseをバックエンド、Claude APIをAI機能に使用。

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth)
- **AI Integration**: Anthropic Claude SDK v0.71.2
- **Icons**: Lucide React
- **Code Quality**: ESLint 9

## Project Structure

```
src/
├── app/
│   ├── (public)/          # 公開ページ（トップ、会社概要、ブログ等）
│   ├── (admin)/           # 管理画面（ダッシュボード、プロジェクト管理）
│   ├── api/               # APIルート
│   └── auth/              # 認証関連
├── components/
│   ├── ui/                # 共通UIコンポーネント
│   └── admin/             # 管理画面専用コンポーネント
├── lib/
│   ├── supabase/          # Supabaseクライアント設定
│   └── claude/            # Claude APIクライアント
└── types/                 # TypeScript型定義
```

## Development Commands

```bash
npm run dev      # 開発サーバー起動 (localhost:3000)
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLintでコードチェック
```

## Coding Standards

### TypeScript
- 厳密な型定義を使用（anyは避ける）
- インターフェースはexport前提で定義
- 関数の戻り値型を明示

### React/Next.js
- Server Componentsをデフォルトで使用
- Client Componentsには`'use client'`を明示
- 機能コンポーネントとhooksを使用

### Tailwind CSS
- ユーティリティクラスのみ使用（カスタムCSSは避ける）
- クラス順序: layout → spacing → sizing → typography → colors
- ダークモード対応: `dark:`プレフィックス使用

### ファイル命名
- コンポーネント: PascalCase (`Button.tsx`)
- ユーティリティ: camelCase (`formatDate.ts`)
- ページ: Next.js規約に従う (`page.tsx`, `layout.tsx`)

## Important Notes

### 触ってはいけないファイル
- `.env.local` - 環境変数（絶対に読み取らない）
- `package-lock.json` - 自動生成ファイル
- `.git/` - Gitディレクトリ

### API連携
- Anthropic API: 環境変数`ANTHROPIC_API_KEY`を使用
- Supabase: 環境変数`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`を使用
- APIキーはコードにハードコードしない

### Git運用
- ブランチ命名: `feature/機能名`, `fix/バグ名`
- コミットメッセージ: 日本語OK、現在形で記述
- mainブランチへの直接pushは避ける

## Common Tasks

### 新しいページを追加
1. `src/app/(public)/` または `src/app/(admin)/` に `page.tsx` を作成
2. 必要に応じて `layout.tsx` を追加
3. コンポーネントは `src/components/` に配置

### 新しいAPIエンドポイントを追加
1. `src/app/api/` にディレクトリと `route.ts` を作成
2. Next.js Route Handlers形式で実装
3. エラーハンドリングを必ず実装

### Supabaseテーブル操作
1. `src/lib/supabase/server.ts` のクライアントを使用
2. 型定義は `src/types/database.ts` に追加
3. RLSポリシーの確認を忘れずに

### Supabase外部キー設計ルール
同一テーブル間に複数の外部キー関係がある場合、クエリで関係名を明示的に指定する必要がある。

```typescript
// NG: 曖昧な関係（エラーになる）
.select(`*, project_media (*)`)

// OK: 関係名を明示
.select(`*, project_media!project_media_project_id_fkey (*)`)
```

**現在の複数関係があるテーブル:**
- `projects` ↔ `project_media`
  - `project_media_project_id_fkey`: プロジェクトの全メディア（1対多）
  - `projects_main_media_id_fkey`: メイン画像指定（多対1）

**DB変更時の確認事項:**
1. 外部キーを追加する場合、既存の関係と競合しないか確認
2. 変更後は必ずローカルで公開ページを確認
3. `npm run dev`のコンソールエラーを確認

## 環境変数と認証

### 開発環境 vs 本番環境
- **開発**: `.env.local` に記載（gitignore済み）
- **本番**: 環境変数としてCI/CDに注入
- **決してコードにハードコードしない**

### 秘密鍵の扱い
```typescript
// NG: コードに直接記載
const API_KEY = "sk-ant-***";

// OK: 環境変数から取得
const API_KEY = process.env.ANTHROPIC_API_KEY;
```

## セキュリティチェックリスト

新機能や変更時に確認：
- APIキーはコードに含まれていないか
- ユーザー入力の検証は実装されているか
- SQLインジェクション対策があるか（Supabaseパラメータ化）
- エラーメッセージで機密情報を露出していないか
- XSS対策がされているか（dangerouslySetInnerHTML禁止）

## デバッグTips

### よくある問題と解決策

**環境変数が読み込まれない**
```
症状: process.env.* が undefined
対策:
  - .env.local ファイルの存在確認
  - 環境変数名が正確か確認（大文字小文字区別）
  - サーバー再起動
```

**CORSエラー**
```
症状: クライアントからAPIへのリクエストが失敗
確認: Supabaseの CORS 設定を確認
```

**ESLintエラー**
```
自動修正: npm run lint -- --fix
手動修正が必要な場合: エラー内容を確認してドキュメント参照
```

**Hydration Error**
```
症状: Server/Client の HTML が一致しない
原因:
  - Server ComponentでuseState等を使用
  - 日時など動的な値をServer側でレンダリング
対策: 該当コンポーネントを 'use client' に変更
```

**Supabase外部キー曖昧エラー (PGRST201)**
```
症状: 公開ページでデータが表示されない（管理画面では表示される）
エラー: "Could not embed because more than one relationship was found"
原因: 同一テーブル間に複数の外部キー関係がある
対策: クエリで関係名を明示的に指定
  例: project_media!project_media_project_id_fkey (*)
確認: npm run dev のコンソールログにエラーが出力される
```
