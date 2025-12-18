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
