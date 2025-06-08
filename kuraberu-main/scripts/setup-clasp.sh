#!/bin/bash

# GAS CI/CD - clasp初期セットアップスクリプト
set -e

echo "🔧 GAS CI/CD clasp初期セットアップを開始します"

# 色付きメッセージ用関数
print_success() { echo -e "\e[32m✅ $1\e[0m"; }
print_error() { echo -e "\e[31m❌ $1\e[0m"; }
print_warning() { echo -e "\e[33m⚠️  $1\e[0m"; }
print_info() { echo -e "\e[34mℹ️  $1\e[0m"; }

# 必要なツールの確認
check_dependencies() {
    print_info "依存関係をチェックしています..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js がインストールされていません"
        echo "https://nodejs.org/ からインストールしてください"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm がインストールされていません"
        exit 1
    fi
    
    print_success "依存関係チェック完了"
}

# clasp のインストール
install_clasp() {
    print_info "clasp をインストールしています..."
    
    if command -v clasp &> /dev/null; then
        print_warning "clasp は既にインストールされています"
        clasp --version
    else
        npm install -g @google/clasp
        print_success "clasp インストール完了"
    fi
}

# Google Apps Script API有効化の案内
show_api_setup() {
    print_warning "以下の設定が必要です:"
    echo ""
    echo "1. https://script.google.com/home/usersettings にアクセス"
    echo "2. 'Google Apps Script API' をオンにする"
    echo "3. 設定完了後、このスクリプトを続行してください"
    echo ""
    
    read -p "Google Apps Script API を有効化しましたか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Google Apps Script API を有効化してから再実行してください"
        exit 1
    fi
}

# clasp ログイン
clasp_login() {
    print_info "Google アカウントでログインしてください..."
    
    if [ -f ~/.clasprc.json ]; then
        print_warning "既存のclasp認証情報が見つかりました"
        read -p "再ログインしますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            clasp logout
            clasp login
        fi
    else
        clasp login
    fi
    
    print_success "clasp ログイン完了"
}

# プロジェクトセットアップ
setup_project() {
    print_info "プロジェクトセットアップを開始します..."
    
    # gas-backend ディレクトリに移動
    cd "$(dirname "$0")/../gas-backend"
    
    echo ""
    echo "📂 プロジェクトセットアップを選択してください:"
    echo "1. 新規プロジェクト作成"
    echo "2. 既存プロジェクト設定"
    read -p "選択 (1-2): " -n 1 -r
    echo
    
    if [[ $REPLY == "1" ]]; then
        create_new_project
    elif [[ $REPLY == "2" ]]; then
        setup_existing_project
    else
        print_error "無効な選択です"
        exit 1
    fi
}

# 新規プロジェクト作成
create_new_project() {
    print_info "新規GASプロジェクトを作成します..."
    
    echo ""
    echo "📝 プロジェクト情報を入力してください:"
    read -p "開発環境プロジェクト名: " DEV_PROJECT_NAME
    read -p "本番環境プロジェクト名: " PROD_PROJECT_NAME
    
    # 開発環境プロジェクト作成
    print_info "開発環境プロジェクトを作成中..."
    clasp create --type standalone --title "$DEV_PROJECT_NAME"
    
    # 開発環境設定を保存
    mv .clasp.json .clasp.dev.json
    DEV_SCRIPT_ID=$(cat .clasp.dev.json | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)
    
    print_success "開発環境プロジェクト作成完了"
    print_info "開発環境 Script ID: $DEV_SCRIPT_ID"
    
    # 本番環境プロジェクト作成
    print_info "本番環境プロジェクトを作成中..."
    clasp create --type standalone --title "$PROD_PROJECT_NAME"
    
    # 本番環境設定を保存
    PROD_SCRIPT_ID=$(cat .clasp.json | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)
    
    print_success "本番環境プロジェクト作成完了"
    print_info "本番環境 Script ID: $PROD_SCRIPT_ID"
    
    create_config_files "$DEV_SCRIPT_ID" "$PROD_SCRIPT_ID"
}

# 既存プロジェクト設定
setup_existing_project() {
    print_info "既存プロジェクトの設定を行います..."
    
    echo ""
    read -p "開発環境 Script ID: " DEV_SCRIPT_ID
    read -p "本番環境 Script ID: " PROD_SCRIPT_ID
    
    create_config_files "$DEV_SCRIPT_ID" "$PROD_SCRIPT_ID"
}

# 設定ファイル作成
create_config_files() {
    local dev_id=$1
    local prod_id=$2
    
    # 開発環境設定
    cat > .clasp.dev.json << EOF
{
  "scriptId": "$dev_id",
  "rootDir": ".",
  "filePushOrder": [
    "appsscript.json",
    "billing_system.gs",
    "assignment_system.gs",
    "cancel_request_system.gs",
    "ranking_system.gs",
    "slack_integration_system.gs",
    "parent_admin_config_system.gs",
    "child_ranking_visibility_system.gs",
    "chatbotSpreadsheet.gs",
    "webApp.gs",
    "areaResolver.gs"
  ]
}
EOF

    # 本番環境設定
    cat > .clasp.json << EOF
{
  "scriptId": "$prod_id",
  "rootDir": ".",
  "filePushOrder": [
    "appsscript.json",
    "billing_system.gs",
    "assignment_system.gs",
    "cancel_request_system.gs",
    "ranking_system.gs",
    "slack_integration_system.gs",
    "parent_admin_config_system.gs",
    "child_ranking_visibility_system.gs",
    "chatbotSpreadsheet.gs",
    "webApp.gs",
    "areaResolver.gs"
  ]
}
EOF

    print_success "設定ファイル作成完了"
}

# GitHub Secrets設定案内
show_github_secrets_guide() {
    print_info "GitHub Secrets設定が必要です..."
    
    echo ""
    echo "📋 以下のSecretsをGitHubリポジトリに設定してください:"
    echo ""
    echo "1. CLASP_CREDENTIALS"
    echo "   ファイル: ~/.clasprc.json の内容"
    echo ""
    echo "2. CLASP_DEV_CONFIG"
    echo "   ファイル: gas-backend/.clasp.dev.json の内容"
    echo ""
    echo "3. CLASP_PROD_CONFIG"
    echo "   ファイル: gas-backend/.clasp.json の内容"
    echo ""
    
    echo "🔗 設定方法:"
    echo "   1. GitHub リポジトリ → Settings → Secrets and variables → Actions"
    echo "   2. 'New repository secret' をクリック"
    echo "   3. 上記の名前と内容で3つのSecretsを作成"
    echo ""
    
    if command -v gh &> /dev/null; then
        echo "💡 GitHub CLI を使用して自動設定しますか？"
        read -p "GitHub CLI で Secrets を設定しますか？ (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_github_secrets_with_cli
        fi
    fi
}

# GitHub CLI でのSecrets設定
setup_github_secrets_with_cli() {
    print_info "GitHub CLI を使用してSecrets設定中..."
    
    # CLASP_CREDENTIALS
    if [ -f ~/.clasprc.json ]; then
        gh secret set CLASP_CREDENTIALS < ~/.clasprc.json
        print_success "CLASP_CREDENTIALS 設定完了"
    else
        print_error "~/.clasprc.json が見つかりません"
    fi
    
    # CLASP_DEV_CONFIG
    if [ -f .clasp.dev.json ]; then
        gh secret set CLASP_DEV_CONFIG < .clasp.dev.json
        print_success "CLASP_DEV_CONFIG 設定完了"
    else
        print_error ".clasp.dev.json が見つかりません"
    fi
    
    # CLASP_PROD_CONFIG
    if [ -f .clasp.json ]; then
        gh secret set CLASP_PROD_CONFIG < .clasp.json
        print_success "CLASP_PROD_CONFIG 設定完了"
    else
        print_error ".clasp.json が見つかりません"
    fi
}

# 初回デプロイテスト
test_deployment() {
    print_info "初回デプロイテストを実行します..."
    
    read -p "開発環境にテストデプロイしますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "開発環境にデプロイ中..."
        cp .clasp.dev.json .clasp.json
        clasp push --force
        mv .clasp.json .clasp.dev.json
        
        # 本番環境設定を復元
        create_config_files "$(cat .clasp.dev.json | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)" "$(cat .clasp.json | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)"
        
        print_success "開発環境デプロイテスト完了"
    fi
}

# メイン実行
main() {
    echo "🚀 GAS CI/CD Pipeline Setup"
    echo "=========================="
    
    check_dependencies
    install_clasp
    show_api_setup
    clasp_login
    setup_project
    show_github_secrets_guide
    test_deployment
    
    echo ""
    print_success "🎉 GAS CI/CD セットアップが完了しました！"
    echo ""
    echo "📋 次のステップ:"
    echo "1. GitHub に変更をプッシュ"
    echo "2. develop ブランチ → 開発環境自動デプロイ"
    echo "3. main ブランチ → 本番環境自動デプロイ"
    echo ""
    echo "🔗 参考リンク:"
    echo "- 開発環境: https://script.google.com/d/$(cat gas-backend/.clasp.dev.json | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)/edit"
    echo "- 本番環境: https://script.google.com/d/$(cat gas-backend/.clasp.json | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)/edit"
}

# スクリプト実行
main "$@"