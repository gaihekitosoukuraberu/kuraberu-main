#!/bin/bash

##############################################
# GASデプロイメント自動ロールバックスクリプト
##############################################

set -e

echo "========================================="
echo "🔄 GASデプロイメント自動ロールバック"
echo "========================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 現在のデプロイメント一覧を取得
echo "📋 デプロイメント一覧を取得中..."
DEPLOYMENTS=$(clasp deployments)

echo "$DEPLOYMENTS"
echo ""

# 最新のデプロイメントID（@HEADを除く）
LATEST_VERSION=$(echo "$DEPLOYMENTS" | grep -v "@HEAD" | grep -oP '@\d+' | head -1 | tr -d '@')

if [ -z "$LATEST_VERSION" ]; then
  echo -e "${RED}❌ デプロイメントが見つかりませんでした${NC}"
  exit 1
fi

echo -e "${YELLOW}現在のバージョン: @$LATEST_VERSION${NC}"

# 1つ前のバージョンを取得
PREVIOUS_VERSION=$(echo "$DEPLOYMENTS" | grep -v "@HEAD" | grep -oP '@\d+' | sed -n '2p' | tr -d '@')

if [ -z "$PREVIOUS_VERSION" ]; then
  echo -e "${RED}❌ ロールバック先のバージョンが見つかりませんでした${NC}"
  exit 1
fi

echo -e "${GREEN}ロールバック先: @$PREVIOUS_VERSION${NC}"
echo ""

# 前のバージョンのデプロイメントIDを取得
PREVIOUS_DEPLOYMENT_ID=$(echo "$DEPLOYMENTS" | grep "@$PREVIOUS_VERSION" | grep -oP 'AKfycb[a-zA-Z0-9_-]+' | head -1)

if [ -z "$PREVIOUS_DEPLOYMENT_ID" ]; then
  echo -e "${RED}❌ 前のデプロイメントIDを取得できませんでした${NC}"
  exit 1
fi

echo -e "${YELLOW}ロールバック実行中...${NC}"
echo "前のデプロイメントID: $PREVIOUS_DEPLOYMENT_ID"
echo ""

# .clasp.jsonのdeploymentIdを更新する方法もあるが、
# 実際には新しいデプロイメントを作成し、env-loader.jsを更新する

# バックアップのタイムスタンプ
ROLLBACK_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ロールバック情報を記録
cat > rollback-log-$ROLLBACK_TIMESTAMP.txt <<EOF
========================================
ロールバック実行ログ
========================================
実行日時: $(date)
ロールバック元: @$LATEST_VERSION
ロールバック先: @$PREVIOUS_VERSION
デプロイメントID: $PREVIOUS_DEPLOYMENT_ID

理由: 自動ロールバック（デプロイ失敗検出）
========================================
EOF

echo -e "${GREEN}✅ ロールバック情報を記録しました${NC}"
echo "ログファイル: rollback-log-$ROLLBACK_TIMESTAMP.txt"
echo ""

# env-loader.jsの更新（全システム）
echo "📝 env-loader.jsを更新中..."

# 全env-loader.jsのGAS_URLを更新
find ../../ -name "env-loader.js" -type f | while read -r file; do
  if grep -q "GAS_URL" "$file"; then
    # 現在のGAS_URLを置換
    sed -i.rollback "s|https://script.google.com/macros/s/AKfycb[a-zA-Z0-9_-]*/exec|https://script.google.com/macros/s/$PREVIOUS_DEPLOYMENT_ID/exec|g" "$file"
    echo "  - 更新: $file"
  fi
done

echo ""
echo -e "${GREEN}✅ ロールバック完了！${NC}"
echo ""
echo "次のステップ:"
echo "1. env-loader.jsの変更をコミット・プッシュ"
echo "2. ブラウザキャッシュをクリア"
echo "3. 各システムの動作確認"
echo ""
echo "ロールバック先デプロイメントID:"
echo "$PREVIOUS_DEPLOYMENT_ID"
