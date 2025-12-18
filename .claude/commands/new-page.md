---
description: 新しいNext.jsページを作成
---

## 新規ページ作成

### 引数
- ページパス（例: `blog/[slug]`, `admin/settings`）

### タスク
1. 指定されたパスに基づいて適切な場所にpage.tsxを作成
2. プロジェクトの既存パターンに従ったコンポーネント構造を使用
3. Server Componentとして作成（必要ならClient Componentに変更）
4. Tailwind CSSでスタイリング
5. 必要に応じてlayout.tsxも作成

### テンプレート
- 公開ページ: `src/app/(public)/` に作成
- 管理画面: `src/app/(admin)/` に作成

$ARGUMENTS にページパスを指定してください。
