---
name: new-page
description: 新しいNext.jsページを作成 (project)
allowed-tools: Read, Write, Glob, Grep
---

# Next.js ページ作成スキル

## 使用タイミング
- 公開ページ追加（トップ、ブログ、会社概要など）
- 管理画面ページ追加（ダッシュボード、プロジェクト管理など）
- レイアウトの作成が必要な場合

## 引数
- ページパス（例: `blog/[slug]`, `admin/settings`）

## ページ作成フロー

### 1. ページタイプの判定
- **公開ページ**: `src/app/(public)/[page-name]/`
- **管理画面**: `src/app/(admin)/[page-name]/`

### 2. ファイル構成
```
page-name/
├── page.tsx          # ページコンポーネント（必須）
├── layout.tsx        # レイアウト（必要時）
└── components/       # ページ専用コンポーネント（大規模時）
```

### 3. TypeScript 要件
- すべてのPropsに型定義
- 戻り値の型を明示（JSX.Element, ReactNode など）
- `any` 型は禁止

### 4. スタイリング（Tailwind CSS）
- ユーティリティクラスのみ使用
- クラス順序: レイアウト → 余白 → サイズ → 文字 → 色
- ダークモード対応: `dark:` プレフィックス使用

## タスク
1. テンプレートファイルを参照する
2. 指定されたパスに基づいて適切な場所にpage.tsxを作成
3. プロジェクトの既存パターンに従ったコンポーネント構造を使用
4. Server Componentとして作成（必要ならClient Componentに変更）
5. Tailwind CSSでスタイリング
6. 必要に応じてlayout.tsxも作成

## テンプレート

以下のテンプレートを参照して作成する:

| 種別 | テンプレート |
|------|-------------|
| ページ | `_config/templates/PAGE_TEMPLATE.tsx` |
| コンポーネント | `_config/templates/COMPONENT_TEMPLATE.tsx` |
| APIルート | `_config/templates/API_ROUTE_TEMPLATE.ts` |

## 参考資料
- @CLAUDE.md - プロジェクト全体の規約
- @src/app - 既存ページのパターン
- @_config/templates - テンプレートファイル

$ARGUMENTS にページパスを指定してください。
