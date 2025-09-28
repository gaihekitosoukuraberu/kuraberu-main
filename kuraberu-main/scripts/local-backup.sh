#!/bin/bash

# Local Backup Script for kuraberu-main project
# This script creates local backups every 15 minutes

set -e

# 設定
PROJECT_ROOT="/Users/ryuryu/kuraberu-main"
BACKUP_ROOT="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
LOG_FILE="$BACKUP_ROOT/backup.log"

# バックアップディレクトリの作成
mkdir -p "$BACKUP_ROOT"

# ログ関数
log() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "🚀 Starting local backup process..."

# 古いバックアップの削除（7日以上前）
log "🧹 Cleaning old backups (7+ days old)..."
find "$BACKUP_ROOT" -name "backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true

# バックアップの作成
BACKUP_NAME="backup_$TIMESTAMP"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_NAME"
BACKUP_FILE="$BACKUP_ROOT/$BACKUP_NAME.tar.gz"

mkdir -p "$BACKUP_DIR"

log "📦 Creating backup: $BACKUP_NAME"

# 重要なディレクトリのバックアップ
directories=("estimate-app" "gas" "admin-app" "franchise-app" "franchise-parent-app" "src" "css" "js")

for dir in "${directories[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        log "📁 Backing up: $dir"
        cp -r "$PROJECT_ROOT/$dir" "$BACKUP_DIR/" 2>/dev/null || log "⚠️ Warning: Could not backup $dir"
    fi
done

# 重要なファイルのバックアップ
files=("package.json" "package-lock.json" "README.md" "tailwind.config.js" "vite.config.js" ".gitignore")

for file in "${files[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        log "📄 Backing up: $file"
        cp "$PROJECT_ROOT/$file" "$BACKUP_DIR/" 2>/dev/null || log "⚠️ Warning: Could not backup $file"
    fi
done

# Gitの状態も保存
log "🔍 Saving git status..."
cd "$PROJECT_ROOT"
git status > "$BACKUP_DIR/git_status.txt" 2>/dev/null || true
git log --oneline -10 > "$BACKUP_DIR/git_log.txt" 2>/dev/null || true
git diff > "$BACKUP_DIR/git_diff.txt" 2>/dev/null || true

# バックアップメタデータの作成
cat > "$BACKUP_DIR/backup_metadata.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "Unknown")
Git branch: $(git branch --show-current 2>/dev/null || echo "Unknown")
System: $(uname -a)
User: $(whoami)
Working directory: $PROJECT_ROOT
EOF

# アーカイブの作成
log "🗜️ Creating archive..."
cd "$BACKUP_ROOT"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME/" 2>/dev/null

# 一時ディレクトリの削除
rm -rf "$BACKUP_DIR"

# バックアップサイズの計算
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

log "✅ Backup completed successfully!"
log "📦 Backup file: $BACKUP_FILE"
log "📏 Size: $BACKUP_SIZE"
log "📅 Timestamp: $TIMESTAMP"

# バックアップリストの更新
echo "$TIMESTAMP - $BACKUP_SIZE - $BACKUP_FILE" >> "$BACKUP_ROOT/backup_list.txt"

# 古いリストエントリの削除（最新50件のみ保持）
tail -50 "$BACKUP_ROOT/backup_list.txt" > "$BACKUP_ROOT/backup_list_temp.txt"
mv "$BACKUP_ROOT/backup_list_temp.txt" "$BACKUP_ROOT/backup_list.txt"

log "📊 Total backups: $(ls -1 $BACKUP_ROOT/backup_*.tar.gz | wc -l)"
log "🏁 Backup process completed."

echo "Backup created: $BACKUP_FILE"