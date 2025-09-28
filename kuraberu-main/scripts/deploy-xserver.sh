#!/bin/bash

# 🚀 Xserver自動デプロイスクリプト
# franchise-hearing を Xserver に自動アップロード

set -e

echo "🚀 Xserver自動デプロイ開始"
echo "=================================="

# 設定
PROJECT_DIR="/Users/ryuryu/kuraberu-main"
FRANCHISE_DIR="$PROJECT_DIR/franchise-hearing"
XSERVER_HOST="${XSERVER_HOST:-sv16424.xserver.jp}"
XSERVER_USER="${XSERVER_USER}"
XSERVER_PASS="${XSERVER_PASS}"
REMOTE_DIR="public_html/franchise-hearing"

# 必須環境変数チェック
if [[ -z "$XSERVER_USER" ]]; then
    echo "❌ XSERVER_USER環境変数が設定されていません"
    echo "💡 設定方法: export XSERVER_USER=your_username"
    exit 1
fi

# SSH設定確認
SSH_CONFIG="$HOME/.ssh/config"
if [[ ! -f "$SSH_CONFIG" ]] || ! grep -q "Host xserver" "$SSH_CONFIG"; then
    echo "⚙️  SSH設定を作成中..."
    mkdir -p "$HOME/.ssh"
    cat >> "$SSH_CONFIG" << EOF

# Xserver設定
Host xserver
    HostName $XSERVER_HOST
    User $XSERVER_USER
    Port 10022
    IdentityFile ~/.ssh/id_rsa
EOF
    chmod 600 "$SSH_CONFIG"
    echo "✅ SSH設定作成完了"
fi

# デプロイ前確認
echo "📋 デプロイ対象ファイル確認:"
echo "--------------------------------"
if [[ ! -d "$FRANCHISE_DIR" ]]; then
    echo "❌ franchise-hearingディレクトリが存在しません: $FRANCHISE_DIR"
    exit 1
fi

# ファイル一覧
FILES_TO_DEPLOY=(
    "01_basic_info.html"
    "02_area_selection.html" 
    "03_confirmation.html"
    ".htaccess"
    "index.html"
)

for file in "${FILES_TO_DEPLOY[@]}"; do
    if [[ -f "$FRANCHISE_DIR/$file" ]]; then
        echo "✅ $file ($(ls -lh "$FRANCHISE_DIR/$file" | awk '{print $5}'))"
    else
        echo "❌ $file 不在"
        exit 1
    fi
done

# デプロイ方法選択
echo -e "\n🎯 デプロイ方法選択:"
echo "1. rsync (推奨・差分同期)"
echo "2. scp (全ファイル転送)"
echo "3. SFTP (インタラクティブ)"

read -p "選択してください [1-3]: " DEPLOY_METHOD

case $DEPLOY_METHOD in
    1)
        echo "🔄 rsync デプロイ開始..."
        rsync -avz --progress \
            --delete \
            --exclude="*.gs" \
            --exclude="*.js" \
            --exclude="config_*.js" \
            --exclude="temp_*.js" \
            --exclude="debug_*.html" \
            --exclude="DEPLOY_INSTRUCTIONS.md" \
            "$FRANCHISE_DIR/" \
            "xserver:$REMOTE_DIR/"
        ;;
    2)
        echo "📤 scp デプロイ開始..."
        ssh xserver "mkdir -p $REMOTE_DIR"
        for file in "${FILES_TO_DEPLOY[@]}"; do
            echo "📤 $file をアップロード中..."
            scp "$FRANCHISE_DIR/$file" "xserver:$REMOTE_DIR/"
        done
        ;;
    3)
        echo "🔧 SFTP接続情報:"
        echo "Host: $XSERVER_HOST"
        echo "User: $XSERVER_USER"
        echo "Port: 10022"
        echo "Remote Dir: $REMOTE_DIR"
        echo ""
        echo "SFTPコマンド例:"
        echo "sftp -P 10022 $XSERVER_USER@$XSERVER_HOST"
        echo "cd $REMOTE_DIR"
        echo "put $FRANCHISE_DIR/*.html"
        echo "put $FRANCHISE_DIR/.htaccess"
        echo "quit"
        exit 0
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac

# デプロイ後確認
echo -e "\n🧪 デプロイ後確認:"
echo "--------------------------------"
echo "🔗 URL確認:"
echo "https://gaiheki.kuraberu.com/franchise-hearing/"
echo "https://gaiheki.kuraberu.com/franchise-hearing/01_basic_info.html"

# 自動確認（curl）
if command -v curl >/dev/null 2>&1; then
    echo -e "\n📡 接続テスト中..."
    if curl -I -s -k "https://gaiheki.kuraberu.com/franchise-hearing/" | head -1 | grep -q "200\|404"; then
        echo "✅ サーバー応答OK"
    else
        echo "⚠️  サーバー応答要確認"
    fi
fi

echo -e "\n✅ Xserverデプロイ完了！"
echo "🎯 次のステップ："
echo "1. https://gaiheki.kuraberu.com/franchise-hearing/ でテスト"
echo "2. SSL証明書設定確認"
echo "3. iframe埋め込みテスト"