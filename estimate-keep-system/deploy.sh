#!/bin/bash

# サーバーアップロードスクリプト
# 使用方法: ./deploy.sh

echo "🚀 外壁塗装くらべるシステム - サーバーアップロード開始"

# アップロード先（環境に合わせて変更してください）
SERVER_USER="your-username"
SERVER_HOST="gaihekikuraberu.com"
SERVER_PATH="/path/to/estimate-keep-system/"

# アップロードするファイル
FILES=(
    "gaiheki-embed.css"
    "gaiheki-embed.js"
    "zip-word-bot.json"
    "images/avatars/319260ba-0b3d-47d0-b18f-abf530c2793e.png"
)

echo "📦 アップロードするファイル:"
for file in "${FILES[@]}"; do
    if [ -f "$file" ] || [ -d "$(dirname "$file")" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file （見つかりません）"
    fi
done

echo ""
echo "⚠️  このスクリプトはサンプルです。"
echo "    実際のデプロイ方法（FTP/SFTP/rsync等）に合わせて修正してください。"
echo ""
echo "例: rsync -avz gaiheki-embed.* $SERVER_USER@$SERVER_HOST:$SERVER_PATH"
echo "例: scp gaiheki-embed.* $SERVER_USER@$SERVER_HOST:$SERVER_PATH"
