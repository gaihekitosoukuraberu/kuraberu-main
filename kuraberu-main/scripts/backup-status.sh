#!/bin/bash

# Backup Status Script for kuraberu-main project
# This script shows the current backup status and recent backups

set -e

BACKUP_ROOT="/Users/ryuryu/kuraberu-main/backups"
LOG_FILE="$BACKUP_ROOT/backup.log"

echo "📊 KURABERU-MAIN BACKUP STATUS"
echo "================================"

# バックアップディレクトリの確認
if [ ! -d "$BACKUP_ROOT" ]; then
    echo "❌ Backup directory not found: $BACKUP_ROOT"
    exit 1
fi

# Cron job の状態確認
echo ""
echo "🕐 CRON JOB STATUS:"
if crontab -l 2>/dev/null | grep -q "kuraberu-main.*local-backup.sh"; then
    echo "✅ Automatic backups are ENABLED (every 15 minutes)"
    echo "📅 Next backup: within 15 minutes"
else
    echo "⚠️ Automatic backups are DISABLED"
    echo "💡 Run setup-cron.sh to enable automatic backups"
fi

# バックアップファイルの統計
echo ""
echo "💾 BACKUP STATISTICS:"
backup_count=$(ls -1 "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | wc -l)
echo "📦 Total backups: $backup_count"

if [ $backup_count -gt 0 ]; then
    # 最新のバックアップ情報
    latest_backup=$(ls -1t "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | head -1)
    latest_size=$(du -h "$latest_backup" 2>/dev/null | cut -f1)
    latest_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$latest_backup" 2>/dev/null || stat -c "%y" "$latest_backup" 2>/dev/null | cut -d'.' -f1)
    
    echo "📅 Latest backup: $(basename "$latest_backup")"
    echo "📏 Latest size: $latest_size"
    echo "🕒 Created: $latest_date"
    
    # 合計サイズ
    total_size=$(du -ch "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | tail -1 | cut -f1)
    echo "💽 Total size: $total_size"
    
    # 最古のバックアップ
    oldest_backup=$(ls -1tr "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | head -1)
    oldest_date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$oldest_backup" 2>/dev/null || stat -c "%y" "$oldest_backup" 2>/dev/null | cut -d'.' -f1)
    echo "🏺 Oldest backup: $oldest_date"
fi

# 最近のバックアップ一覧
echo ""
echo "📋 RECENT BACKUPS (latest 10):"
if [ $backup_count -gt 0 ]; then
    ls -1t "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | head -10 | while read backup; do
        size=$(du -h "$backup" | cut -f1)
        date=$(stat -f "%Sm" -t "%m/%d %H:%M" "$backup" 2>/dev/null || stat -c "%y" "$backup" 2>/dev/null | cut -d'.' -f1 | cut -d' ' -f2)
        echo "  📦 $(basename "$backup") - $size - $date"
    done
else
    echo "  (No backups found)"
fi

# ログファイルの状態
echo ""
echo "📝 LOG STATUS:"
if [ -f "$LOG_FILE" ]; then
    log_size=$(du -h "$LOG_FILE" | cut -f1)
    log_lines=$(wc -l < "$LOG_FILE")
    echo "📄 Log file: $log_size ($log_lines lines)"
    
    # 最新のログエントリ
    echo "🔍 Latest log entries:"
    tail -5 "$LOG_FILE" | sed 's/^/  /'
else
    echo "⚠️ No log file found"
fi

# Git 状態
echo ""
echo "🔍 GIT STATUS:"
cd "/Users/ryuryu/kuraberu-main"
if git rev-parse --git-dir > /dev/null 2>&1; then
    current_branch=$(git branch --show-current 2>/dev/null || echo "Unknown")
    current_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")
    echo "🌿 Current branch: $current_branch"
    echo "🔗 Current commit: $current_commit"
    
    # 未コミットの変更
    if ! git diff --quiet 2>/dev/null; then
        echo "⚠️ Uncommitted changes detected"
    else
        echo "✅ Working directory clean"
    fi
else
    echo "❌ Not a git repository"
fi

# ディスク容量
echo ""
echo "💽 DISK USAGE:"
df -h "$BACKUP_ROOT" | tail -1 | awk '{print "🖥️ Available space: " $4 " (" $5 " used)"}'

echo ""
echo "================================"
echo "💡 COMMANDS:"
echo "  View live logs: tail -f $BACKUP_ROOT/cron.log"
echo "  Manual backup: /Users/ryuryu/kuraberu-main/scripts/local-backup.sh"
echo "  Setup auto backup: /Users/ryuryu/kuraberu-main/scripts/setup-cron.sh"
echo "  Clean old backups: find $BACKUP_ROOT -name 'backup_*.tar.gz' -mtime +7 -delete"