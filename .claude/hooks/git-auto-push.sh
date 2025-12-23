#!/bin/bash

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 1

# mainブランチへの直接pushは避ける
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
  exit 0
fi

# .env系ファイルはスキップ
if [[ "$FILE_PATH" =~ ^\.env ]]; then
  exit 0
fi

# node_modulesはスキップ
if [[ "$FILE_PATH" =~ node_modules ]]; then
  exit 0
fi

# ファイルをステージング
git add "$FILE_PATH" 2>/dev/null

# 変更をコミット
FILENAME=$(basename "$FILE_PATH")
git commit -m "chore: update $FILENAME" 2>/dev/null

# pushを実行
git push 2>/dev/null

exit 0
