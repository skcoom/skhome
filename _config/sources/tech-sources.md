# 技術情報ソース一覧

SKhomeプロジェクトで使用している技術の公式情報源。
`/tech-updates` コマンドでチェックする対象。

---

## チェック対象ソース

### 高優先度（毎週チェック）

| ソース | URL | last_checked |
|--------|-----|--------------|
| Next.js Blog | https://nextjs.org/blog | 2026-01-12 |
| React Blog | https://react.dev/blog | 2026-01-12 |
| Supabase Blog | https://supabase.com/blog | 2026-01-12 |
| @supabase/ssr Releases | https://github.com/supabase/ssr/releases | 2026-01-12 |

### 中優先度（月1回チェック）

| ソース | URL | last_checked |
|--------|-----|--------------|
| Claude Code GitHub | https://github.com/anthropics/claude-code | - |
| Anthropic Docs | https://docs.anthropic.com | - |
| Tailwind CSS Blog | https://tailwindcss.com/blog | 2026-01-12 |
| Anthropic News | https://www.anthropic.com/news | 2026-01-12 |
| TypeScript Releases | https://github.com/microsoft/TypeScript/releases | 2026-01-12 |

### 低優先度（四半期チェック）

| ソース | URL | last_checked |
|--------|-----|--------------|
| ESLint Blog | https://eslint.org/blog | 2026-01-12 |
| Vercel Blog | https://vercel.com/blog | 2026-01-12 |

---

## ウォッチリスト（特定の変更を追跡）

プロジェクトに影響する可能性がある、まだ対応されていない技術的変更。
`/tech-updates` 実行時にこれらの項目も確認する。

| 項目 | 関連技術 | 状況 | 追跡開始日 | 参考URL |
|------|---------|------|-----------|---------|
| Supabase SSR の Next.js proxy 対応 | Supabase, Next.js | 待機中 | 2026-01-12 | https://supabase.com/docs/guides/auth/server-side/nextjs |

### ウォッチリスト詳細

#### Supabase SSR の Next.js proxy 対応
- **背景**: Next.js 16 で `middleware` が非推奨となり `proxy` への移行が推奨されている
- **現状**: Supabase SSR (`@supabase/ssr`) はまだ middleware ベースの実装のみ対応
- **影響ファイル**: `src/middleware.ts`, `src/lib/supabase/middleware.ts`
- **対応方針**: Supabase が公式に proxy 対応を発表したら移行を検討
- **確認ポイント**: Supabase Blog または GitHub (@supabase/ssr) で proxy 対応のアナウンス

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
