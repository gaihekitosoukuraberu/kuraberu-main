#!/bin/bash

# GAS CI/CD - 手動デプロイスクリプト
set -e

# 色付きメッセージ用関数
print_success() { echo -e "\e[32m✅ $1\e[0m"; }
print_error() { echo -e "\e[31m❌ $1\e[0m"; }
print_warning() { echo -e "\e[33m⚠️  $1\e[0m"; }
print_info() { echo -e "\e[34mℹ️  $1\e[0m"; }

# ヘルプ表示
show_help() {
    echo "🚀 GAS Manual Deployment Script"
    echo ""
    echo "使用方法:"
    echo "  $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "環境:"
    echo "  dev, development     開発環境にデプロイ"
    echo "  prod, production     本番環境にデプロイ"
    echo ""
    echo "オプション:"
    echo "  -f, --force         強制デプロイ（確認スキップ）"
    echo "  -v, --version DESC  バージョン説明を指定"
    echo "  -h, --help          このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 dev                    # 開発環境にデプロイ"
    echo "  $0 prod --force           # 本番環境に強制デプロイ"
    echo "  $0 prod -v \"Bug fix\"      # バージョン説明付きで本番デプロイ"
}

# 引数解析
ENVIRONMENT=""
FORCE=false
VERSION_DESC=""

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|development)
            ENVIRONMENT="dev"
            shift
            ;;
        prod|production)
            ENVIRONMENT="prod"
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--version)
            VERSION_DESC="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 環境が指定されていない場合
if [[ -z "$ENVIRONMENT" ]]; then
    print_error "デプロイ環境を指定してください"
    show_help
    exit 1
fi

# 作業ディレクトリを設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GAS_DIR="$PROJECT_ROOT/gas-backend"

cd "$GAS_DIR"

# clasp の存在確認
if ! command -v clasp &> /dev/null; then
    print_error "clasp がインストールされていません"
    echo "npm install -g @google/clasp を実行してください"
    exit 1
fi

# 認証確認
if [[ ! -f ~/.clasprc.json ]]; then
    print_error "clasp 認証が設定されていません"
    echo "clasp login を実行してください"
    exit 1
fi

# 環境別設定ファイルの確認と設定
setup_environment() {
    local env=$1
    
    if [[ "$env" == "dev" ]]; then
        CONFIG_FILE=".clasp.dev.json"
        ENV_NAME="開発環境"
    else
        CONFIG_FILE=".clasp.json"
        ENV_NAME="本番環境"
    fi
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "$CONFIG_FILE が見つかりません"
        echo "scripts/setup-clasp.sh を実行してプロジェクトを初期化してください"
        exit 1
    fi
    
    # 一時的に設定ファイルをコピー
    cp "$CONFIG_FILE" ".clasp.current.json"
    
    # Script IDを取得
    SCRIPT_ID=$(cat "$CONFIG_FILE" | grep -o '"scriptId":"[^"]*"' | cut -d'"' -f4)
    
    print_info "$ENV_NAME の Script ID: $SCRIPT_ID"
}

# 確認プロンプト
confirm_deployment() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi
    
    echo ""
    print_warning "$ENV_NAME へデプロイしようとしています"
    echo "Script ID: $SCRIPT_ID"
    echo ""
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "デプロイをキャンセルしました"
        exit 0
    fi
}

# ファイル変更確認
check_file_changes() {
    print_info "デプロイ対象ファイルを確認しています..."
    
    local files=(
        "appsscript.json"
        "billing_system.gs"
        "assignment_system.gs"
        "cancel_request_system.gs"
        "ranking_system.gs"
        "slack_integration_system.gs"
        "parent_admin_config_system.gs"
        "child_ranking_visibility_system.gs"
        "chatbotSpreadsheet.gs"
        "webApp.gs"
        "areaResolver.gs"
    )
    
    echo "📁 デプロイファイル一覧:"
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file (見つかりません)"
        fi
    done
    echo ""
}

# デプロイ実行
execute_deployment() {
    print_info "$ENV_NAME にデプロイしています..."
    
    # 設定ファイルを一時的に適用
    cp ".clasp.current.json" ".clasp.json"
    
    # デプロイ実行
    if clasp push --force; then
        print_success "デプロイが正常に完了しました！"
    else
        print_error "デプロイに失敗しました"
        cleanup_and_exit 1
    fi
    
    # バージョン作成
    create_version
}

# バージョン作成
create_version() {
    if [[ -z "$VERSION_DESC" ]]; then
        if [[ "$ENVIRONMENT" == "prod" ]]; then
            VERSION_DESC="Manual production deployment $(date '+%Y-%m-%d %H:%M:%S')"
        else
            VERSION_DESC="Manual development deployment $(date '+%Y-%m-%d %H:%M:%S')"
        fi
    fi
    
    print_info "バージョンを作成しています..."
    
    if clasp version "$VERSION_DESC"; then
        print_success "バージョン作成完了: $VERSION_DESC"
    else
        print_warning "バージョン作成に失敗しましたが、デプロイは成功しています"
    fi
}

# クリーンアップと終了
cleanup_and_exit() {
    local exit_code=${1:-0}
    
    # 一時ファイルを削除
    [[ -f ".clasp.current.json" ]] && rm ".clasp.current.json"
    
    # 元の設定ファイルを復元（本番環境設定をデフォルトに）
    if [[ -f ".clasp.json.backup" ]]; then
        mv ".clasp.json.backup" ".clasp.json"
    fi
    
    exit $exit_code
}

# プロジェクト情報表示
show_project_info() {
    echo ""
    print_info "プロジェクト情報:"
    echo "🔗 GAS エディタ: https://script.google.com/d/$SCRIPT_ID/edit"
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        echo "🌐 Web App URL: https://script.google.com/macros/s/$SCRIPT_ID/exec"
    fi
    
    echo "📋 Script ID: $SCRIPT_ID"
    echo "🕐 デプロイ時刻: $(date '+%Y-%m-%d %H:%M:%S')"
}

# メイン実行
main() {
    echo "🚀 GAS Manual Deployment"
    echo "======================="
    
    # 元の本番設定をバックアップ
    [[ -f ".clasp.json" ]] && cp ".clasp.json" ".clasp.json.backup"
    
    # 環境設定
    setup_environment "$ENVIRONMENT"
    
    # ファイル確認
    check_file_changes
    
    # デプロイ確認
    confirm_deployment
    
    # デプロイ実行
    execute_deployment
    
    # プロジェクト情報表示
    show_project_info
    
    # クリーンアップ
    cleanup_and_exit 0
}

# エラーハンドリング
trap 'cleanup_and_exit 1' ERR INT TERM

# スクリプト実行
main "$@"