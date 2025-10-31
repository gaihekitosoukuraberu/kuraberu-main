#!/bin/bash

# 自動保存スクリプト（変更があったときだけコミット＆プッシュ）
# Cron: */15 * * * * /Users/ryuryu/projects/kuraberu-main/auto-save.sh >> /Users/ryuryu/auto-save.log 2>&1

cd /Users/ryuryu/projects/kuraberu-main || exit 1

# 変更があるかチェック
if git diff --quiet && git diff --cached --quiet; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - 変更なし"
  exit 0
fi

# 変更があったので保存
echo "$(date '+%Y-%m-%d %H:%M:%S') - 変更検出、自動保存開始"

# 全ファイルをステージング
git add -A

# コミット（変更内容を簡単に記録）
CHANGED_FILES=$(git diff --cached --name-only | wc -l | xargs)
git commit -m "auto-save: $(date '+%Y-%m-%d %H:%M:%S') - ${CHANGED_FILES} files changed"

# プッシュ
if git push origin main; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ✅ 自動保存完了（${CHANGED_FILES}ファイル）"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ❌ プッシュ失敗"
  exit 1
fi
