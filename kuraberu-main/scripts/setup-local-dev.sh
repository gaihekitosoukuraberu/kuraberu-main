#!/bin/bash
# 外壁塗装くらべるAI - ローカル開発環境セットアップスクリプト
# 
# このスクリプトは開発者がローカル環境でGASプロジェクトを
# 開発するための環境を自動セットアップします
#
# 作成日: 2025-06-20
# 更新日: 2025-06-20

set -e  # エラー時に停止

echo "🏗️ 外壁塗装くらべるAI - ローカル開発環境セットアップ"
echo "============================================================"

# 必要なツールの確認
echo "📋 環境チェック..."

# Node.js のチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.js がインストールされていません"
    echo "   https://nodejs.org/ からインストールしてください"
    exit 1
else
    echo "✅ Node.js: $(node --version)"
fi

# npm のチェック
if ! command -v npm &> /dev/null; then
    echo "❌ npm がインストールされていません"
    exit 1
else
    echo "✅ npm: $(npm --version)"
fi

# clasp のインストール確認
if ! command -v clasp &> /dev/null; then
    echo "📦 clasp をインストールしています..."
    npm install -g @google/clasp
    echo "✅ clasp インストール完了"
else
    echo "✅ clasp: $(clasp --version)"
fi

# プロジェクトディレクトリの確認
if [ ! -f "package.json" ]; then
    echo "❌ プロジェクトルートディレクトリで実行してください"
    exit 1
fi

# プロジェクトの依存関係インストール
echo "📦 プロジェクト依存関係をインストール中..."
npm install

# .clasp.json の設定
echo "⚙️ clasp設定ファイルのセットアップ..."

if [ ! -f ".clasp.json" ]; then
    if [ -f ".clasp.json.sample" ]; then
        cp .clasp.json.sample .clasp.json
        echo "✅ .clasp.json をサンプルからコピーしました"
        echo "📝 .clasp.json を編集してGASスクリプトIDを設定してください"
    else
        echo "❌ .clasp.json.sample が見つかりません"
        exit 1
    fi
else
    echo "✅ .clasp.json は既に存在します"
fi

# .clasprc.json の設定確認
echo "🔐 clasp認証設定の確認..."

if [ ! -f "$HOME/.clasprc.json" ]; then
    echo "⚠️ clasp認証設定が見つかりません"
    echo "📝 以下のコマンドでGoogle認証を実行してください:"
    echo "   clasp login"
    echo ""
    echo "💡 または .clasprc.json.sample を参考に手動で設定してください"
else
    echo "✅ clasp認証設定が見つかりました"
fi

# gas/.clasp.json の設定
echo "⚙️ GASディレクトリのclasp設定..."

cd gas
if [ ! -f ".clasp.json" ]; then
    echo '{"scriptId":"YOUR_GAS_SCRIPT_ID_HERE","rootDir":"./"}' > .clasp.json
    echo "✅ gas/.clasp.json を作成しました"
    echo "📝 gas/.clasp.json を編集してGASスクリプトIDを設定してください"
else
    echo "✅ gas/.clasp.json は既に存在します"
fi
cd ..

# テスト環境の確認
echo "🧪 テスト環境の確認..."

if command -v jest &> /dev/null; then
    echo "✅ Jest: $(jest --version)"
else
    echo "⚠️ Jest がインストールされていません（フロントエンドテスト用）"
fi

# 開発用スクリプトの確認
echo "📜 開発用スクリプトの作成..."

# package.json に開発用スクリプトを追加（既存の場合は表示のみ）
cat << 'EOF' > dev-scripts.json
{
  "scripts": {
    "gas:push": "cd gas && clasp push",
    "gas:pull": "cd gas && clasp pull",
    "gas:test": "cd gas && clasp run 'runAllTests'",
    "gas:test-ci": "cd gas && clasp run 'runTestsForCI'",
    "gas:logs": "cd gas && clasp logs",
    "gas:open": "cd gas && clasp open",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "dev:setup": "./scripts/setup-local-dev.sh",
    "deploy:xserver": "./scripts/deploy-xserver.sh"
  }
}
EOF

echo "✅ 開発用スクリプト一覧を dev-scripts.json に保存しました"

# gitignore の確認
echo "📄 .gitignore の確認..."

GITIGNORE_ITEMS=(
    "node_modules/"
    ".env"
    ".env.local"
    "*.log"
    ".DS_Store"
    "coverage/"
    ".nyc_output/"
    "dist/"
    ".clasprc.json"
    ".clasp.json"
)

if [ ! -f ".gitignore" ]; then
    echo "📝 .gitignore を作成しています..."
    touch .gitignore
fi

for item in "${GITIGNORE_ITEMS[@]}"; do
    if ! grep -Fxq "$item" .gitignore; then
        echo "$item" >> .gitignore
        echo "➕ .gitignore に $item を追加しました"
    fi
done

echo "✅ .gitignore の確認完了"

# セットアップ完了メッセージ
echo ""
echo "🎉 ローカル開発環境セットアップ完了！"
echo "============================================================"
echo ""
echo "📝 次のステップ:"
echo "1. clasp認証（未設定の場合）:"
echo "   clasp login"
echo ""
echo "2. GASスクリプトIDの設定:"
echo "   • .clasp.json を編集"
echo "   • gas/.clasp.json を編集"
echo ""
echo "3. 開発開始:"
echo "   npm run gas:pull    # GASコードをローカルに同期"
echo "   npm run gas:push    # ローカルコードをGASに送信"
echo "   npm run gas:test    # GASテストの実行"
echo ""
echo "🔗 便利なコマンド:"
echo "   npm run gas:open    # GASエディタを開く"
echo "   npm run gas:logs    # GASログを表示"
echo "   npm run test        # フロントエンドテスト実行"
echo ""
echo "📚 詳細な手順は README.md を参照してください"
echo ""