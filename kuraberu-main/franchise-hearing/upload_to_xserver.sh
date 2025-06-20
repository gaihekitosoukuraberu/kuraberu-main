#!/bin/bash

# 🚀 Xserver SFTP自動アップロードスクリプト
# 使用前に以下を設定してください:
# XSERVER_HOST="sv16424.xserver.jp"
# XSERVER_USER="your_username"
# XSERVER_PASS="your_password"  # または鍵認証

echo "⚠️  XSERVER認証情報を設定してください:"
echo "XSERVER_HOST=sv16424.xserver.jp"
echo "XSERVER_USER=your_username"
echo "XSERVER_PASS=your_password"
echo ""
echo "設定後、以下のコマンドでアップロード:"
echo ""
echo "# SFTPでアップロード:"
echo 'sftp $XSERVER_USER@$XSERVER_HOST'
echo "cd public_html/"
echo "mkdir franchise-hearing"
echo "cd franchise-hearing"
echo "put *.html"
echo "put .htaccess"
echo "quit"
echo ""
echo "# SCPでアップロード（一括）:"
echo 'scp -r /Users/ryuryu/kuraberu-main/franchise-hearing/* $XSERVER_USER@$XSERVER_HOST:public_html/franchise-hearing/'
