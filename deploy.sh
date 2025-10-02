#!/bin/bash

# 🚀 franchise-dashboard Xserver自動デプロイスクリプト

set -e

echo "🚀 franchise-dashboard デプロイ開始"
echo "=================================="

# 設定
PROJECT_DIR="/Users/ryuryu/franchise-dashboard"
DIST_DIR="$PROJECT_DIR/dist"
XSERVER_HOST="${XSERVER_HOST:-sv16424.xserver.jp}"
XSERVER_USER="${XSERVER_USER}"
REMOTE_DIR="public_html/franchise-dashboard"

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
if [[ ! -d "$DIST_DIR" ]]; then
    echo "❌ distディレクトリが存在しません: $DIST_DIR"
    exit 1
fi

# ファイル一覧
echo "📁 dist/"
ls -lah "$DIST_DIR/index.html" 2>/dev/null && echo "✅ index.html"
echo ""
echo "📁 dist/merchant-portal/"
ls -lah "$DIST_DIR/merchant-portal/" 2>/dev/null | grep -E "\.html|\.js|\.htaccess"

# デプロイ確認
echo ""
read -p "🚀 デプロイを実行しますか？ [y/N]: " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ デプロイをキャンセルしました"
    exit 1
fi

# rsyncデプロイ実行
echo "🔄 rsync デプロイ開始..."
rsync -avz --progress \
    --delete \
    --exclude=".DS_Store" \
    --exclude="*.bak" \
    --exclude="*.backup" \
    --exclude="*.server" \
    --exclude="*.restored" \
    "$DIST_DIR/" \
    "xserver:$REMOTE_DIR/"

# デプロイ後確認
echo -e "\n🧪 デプロイ後確認:"
echo "--------------------------------"
echo "🔗 メインURL:"
echo "https://gaihekikuraberu.com/franchise-dashboard/"
echo ""
echo "🔗 ログイン関連:"
echo "https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/login.html"
echo "https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/first-login.html"

# 自動確認（curl）
if command -v curl >/dev/null 2>&1; then
    echo -e "\n📡 接続テスト中..."
    if curl -I -s -k "https://gaihekikuraberu.com/franchise-dashboard/" | head -1 | grep -q "200\|301\|302"; then
        echo "✅ サーバー応答OK"
    else
        echo "⚠️  サーバー応答要確認"
    fi
fi

echo -e "\n✅ franchise-dashboard デプロイ完了！"
echo "🎯 ブラウザで確認："
echo "https://gaihekikuraberu.com/franchise-dashboard/"