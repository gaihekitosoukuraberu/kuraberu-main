#!/bin/bash

# Cron Setup Script for kuraberu-main local backups
# This script sets up automatic backups every 15 minutes

set -e

BACKUP_SCRIPT="/Users/ryuryu/kuraberu-main/scripts/local-backup.sh"
CRON_JOB="*/15 * * * * $BACKUP_SCRIPT >> /Users/ryuryu/kuraberu-main/backups/cron.log 2>&1"

echo "🔧 Setting up automatic backup cron job..."

# 現在のcrontabをバックアップ
crontab -l > /tmp/current_crontab 2>/dev/null || echo "" > /tmp/current_crontab

# kuraberu backup jobが既に存在するかチェック
if grep -q "kuraberu-main.*local-backup.sh" /tmp/current_crontab; then
    echo "⚠️ Kuraberu backup job already exists. Removing old entry..."
    grep -v "kuraberu-main.*local-backup.sh" /tmp/current_crontab > /tmp/new_crontab
    mv /tmp/new_crontab /tmp/current_crontab
fi

# 新しいcron jobを追加
echo "# Kuraberu-main automatic backup (every 15 minutes)" >> /tmp/current_crontab
echo "$CRON_JOB" >> /tmp/current_crontab

# 新しいcrontabを設定
crontab /tmp/current_crontab

# 一時ファイルを削除
rm /tmp/current_crontab

echo "✅ Cron job setup completed!"
echo "📅 Backup schedule: Every 15 minutes"
echo "📁 Backup location: /Users/ryuryu/kuraberu-main/backups/"
echo "📝 Log file: /Users/ryuryu/kuraberu-main/backups/cron.log"

# 現在のcron jobsを表示
echo ""
echo "📋 Current cron jobs:"
crontab -l

# テストバックアップを実行
echo ""
echo "🧪 Running test backup..."
$BACKUP_SCRIPT

echo ""
echo "🎉 Setup completed successfully!"
echo "💡 To view backup logs: tail -f /Users/ryuryu/kuraberu-main/backups/cron.log"
echo "💡 To list backups: ls -la /Users/ryuryu/kuraberu-main/backups/"
echo "💡 To disable backups: crontab -e (and remove the kuraberu backup line)"