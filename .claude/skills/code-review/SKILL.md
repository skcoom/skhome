---
name: review
description: コードレビューを実施 (project)
allowed-tools: Read, Grep, Glob, Bash(git diff:*)
---

# コードレビュースキル

## 使用タイミング
- 新機能実装後のレビュー
- バグ修正後の確認
- リファクタリング後のチェック

## レビュー項目

### セキュリティ
- APIキーはハードコードされていないか？ → `.env.local` に配置するか確認
- XSS脆弱性はないか？ → ユーザー入力は `dangerouslySetInnerHTML` 以外を使用
- SQLインジェクション対策は？ → Supabaseパラメータ化クエリを使用

### TypeScript
- すべての変数・関数に型定義があるか？
- `any` 型は使用していないか？
- インターフェースは `export` で定義されているか？

### React
- Server Componentをデフォルトで使用しているか？
- Client Componentのみ `'use client'` ディレクティブを使用しているか？
- 不要な useEffect や useState はないか？

### パフォーマンス
- 大規模な配列のrender時にkeyを使用しているか？
- React.memoやuseMemoの使用は適切か？

### Tailwind CSS
- クラス順序は統一されているか？
  - layout → spacing → sizing → typography → colors
- 重複クラスがないか？
- ダークモードは実装されているか？（必要時）

### コーディング規約
- CLAUDE.mdの規約に準拠しているか

## タスク
$ARGUMENTS が指定されている場合はそのファイルを、なければ `git diff` で変更されたファイルをレビューしてください。

問題点と改善提案を日本語で具体的に説明してください。

## チェックリスト出力形式

```
## レビュー結果

### セキュリティ
- [x] APIキーのハードコードなし
- [x] XSS対策済み

### TypeScript
- [ ] 問題あり: ○○に型定義がない

### 改善提案
1. ○○を修正してください
```
