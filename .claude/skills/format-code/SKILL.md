---
name: format
description: コードをESLintでチェックして問題を報告 (project)
allowed-tools: Bash(npm run lint:*), Bash(npm run lint), Read
---

# コードフォーマットチェックスキル

## 使用タイミング
- コミット前のコードチェック
- CI/CD前の事前確認
- コード品質の定期チェック

## タスク
1. ESLintを実行してコードの問題を検出
2. 検出された問題を日本語で説明
3. 修正案を提示

$ARGUMENTS が指定されている場合はそのファイルを、なければプロジェクト全体をチェックしてください。

## 実行コマンド
```bash
# プロジェクト全体
npm run lint

# 特定ファイル
npm run lint -- [ファイルパス]
```

## 出力形式

```
## ESLintチェック結果

### エラー (修正必須)
1. `src/app/page.tsx:10` - 未使用の変数 `foo`
   → 削除するか、使用してください

### 警告 (推奨)
1. `src/components/Button.tsx:5` - any型の使用
   → 具体的な型に置き換えてください

### 合計
- エラー: X件
- 警告: X件
```
