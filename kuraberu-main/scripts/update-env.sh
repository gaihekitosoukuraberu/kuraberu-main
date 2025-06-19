#!/bin/bash

# 🔄 .env VUE_APP_GAS_URL 自動更新スクリプト
# clasp deployments から最新URLを取得して .env を更新

set -e

echo "🔄 .env VUE_APP_GAS_URL 自動更新開始"
echo "=================================="

PROJECT_DIR="/Users/ryuryu/kuraberu-main"
GAS_DIR="$PROJECT_DIR/gas"
ENV_FILE="$PROJECT_DIR/.env"

# .clasp.json 確認
if [[ ! -f "$GAS_DIR/.clasp.json" ]]; then
    echo "❌ .clasp.json が見つかりません: $GAS_DIR/.clasp.json"
    exit 1
fi

# clasp コマンド確認
if ! command -v clasp >/dev/null 2>&1; then
    echo "❌ clasp コマンドが見つかりません"
    echo "💡 インストール: npm install -g @google/clasp"
    exit 1
fi

# GASディレクトリに移動
cd "$GAS_DIR"

echo "📋 現在の設定:"
echo "--------------------------------"
echo "📁 GAS Dir: $GAS_DIR"
echo "📄 Env File: $ENV_FILE"

# 現在の .env の VUE_APP_GAS_URL を表示
if [[ -f "$ENV_FILE" ]]; then
    CURRENT_URL=$(grep "^VUE_APP_GAS_URL=" "$ENV_FILE" | cut -d'=' -f2)
    echo "🔗 現在のURL: $CURRENT_URL"
else
    echo "⚠️  .env ファイルが存在しません"
fi

# clasp deployments 実行
echo -e "\n🚀 clasp deployments 取得中..."
DEPLOYMENTS_OUTPUT=$(clasp deployments 2>/dev/null || echo "ERROR")

if [[ "$DEPLOYMENTS_OUTPUT" == "ERROR" ]]; then
    echo "❌ clasp deployments に失敗しました"
    echo "💡 認証確認: clasp login"
    echo "💡 権限確認: clasp open"
    exit 1
fi

echo "📊 Deployments一覧:"
echo "$DEPLOYMENTS_OUTPUT"

# 最新のWeb app URLを抽出
# deployments出力例: "- AKfycbw... @1 - Web app." または "- AKfycbw... @1 - Description"
# 最初の有効なデプロイメントIDを取得（Web appの記載がなくても）
LATEST_DEPLOYMENT_ID=$(echo "$DEPLOYMENTS_OUTPUT" | grep -E "^- AK[A-Za-z0-9_-]+" | head -1 | sed -E 's/^- ([A-Za-z0-9_-]+) @.*/\1/')

if [[ -z "$LATEST_DEPLOYMENT_ID" ]]; then
    echo "❌ Web app デプロイメントが見つかりません"
    echo "💡 新しいデプロイメント作成: clasp deploy"
    exit 1
fi

# 完全なURLを構築
NEW_GAS_URL="https://script.google.com/macros/s/${LATEST_DEPLOYMENT_ID}/exec"

echo -e "\n🎯 更新情報:"
echo "--------------------------------"
echo "🆔 最新Deployment ID: $LATEST_DEPLOYMENT_ID"
echo "🔗 新しいURL: $NEW_GAS_URL"

# .env ファイル更新
if [[ -f "$ENV_FILE" ]]; then
    # 既存の VUE_APP_GAS_URL を置換
    if grep -q "^VUE_APP_GAS_URL=" "$ENV_FILE"; then
        # macOS sed の場合は -i '' を使用
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^VUE_APP_GAS_URL=.*|VUE_APP_GAS_URL=$NEW_GAS_URL|" "$ENV_FILE"
        else
            sed -i "s|^VUE_APP_GAS_URL=.*|VUE_APP_GAS_URL=$NEW_GAS_URL|" "$ENV_FILE"
        fi
        echo "✅ VUE_APP_GAS_URL を更新しました"
    else
        # VUE_APP_GAS_URL が存在しない場合は追加
        echo "VUE_APP_GAS_URL=$NEW_GAS_URL" >> "$ENV_FILE"
        echo "✅ VUE_APP_GAS_URL を追加しました"
    fi
else
    # .env ファイルが存在しない場合は作成
    cat > "$ENV_FILE" << EOF
# 🌍 Environment Variables
# VUE_APP_GAS_URL will be auto-updated by npm run update-env

VUE_APP_GAS_URL=$NEW_GAS_URL
EOF
    echo "✅ .env ファイルを作成しました"
fi

# 更新後の確認
echo -e "\n📋 更新後の .env:"
echo "=================================="
cat "$ENV_FILE"

# HTMLファイル内のURL更新確認
echo -e "\n🔍 HTMLファイル内のURL確認:"
echo "--------------------------------"
FRANCHISE_HTML_FILES=(
    "$PROJECT_DIR/franchise-hearing/01_basic_info.html"
    "$PROJECT_DIR/franchise-hearing/02_area_selection.html"
    "$PROJECT_DIR/franchise-hearing/03_confirmation.html"
)

for html_file in "${FRANCHISE_HTML_FILES[@]}"; do
    if [[ -f "$html_file" ]]; then
        if grep -q "script.google.com/macros/s" "$html_file"; then
            CURRENT_HTML_URL=$(grep -o "https://script.google.com/macros/s/[A-Za-z0-9_-]*/exec" "$html_file" | head -1)
            if [[ "$CURRENT_HTML_URL" != "$NEW_GAS_URL" ]]; then
                echo "⚠️  $(basename "$html_file"): $CURRENT_HTML_URL"
                echo "   → 手動更新が必要: $NEW_GAS_URL"
            else
                echo "✅ $(basename "$html_file"): URL最新"
            fi
        fi
    fi
done

echo -e "\n✅ .env VUE_APP_GAS_URL 更新完了！"
echo "🎯 次のステップ："
echo "1. フロントエンドビルド/再起動"
echo "2. HTMLファイル内のURL手動更新（必要に応じて）"
echo "3. テスト実行"