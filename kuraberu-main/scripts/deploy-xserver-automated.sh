#!/bin/bash
# 外壁塗装くらべるAI - Xserver自動デプロイスクリプト（CI/CD用）
# 
# GitHub Actions等のCI環境からの自動実行用
# FTP/SFTPによるファイルアップロード機能
#
# 作成日: 2025-06-20
# 更新日: 2025-06-20

set -e  # エラー時に停止

echo "🚀 Xserver 自動デプロイシステム"
echo "============================================="
echo "📅 実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🔧 環境: ${CI:-local}"
echo "🌍 Node環境: ${NODE_ENV:-development}"
echo "============================================="

# 設定変数
PROJECT_ROOT="$(pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
XSERVER_HOST="${XSERVER_HOST:-sv16424.xserver.jp}"
XSERVER_USER="${XSERVER_USER}"
XSERVER_PASSWORD="${XSERVER_PASSWORD}"
SFTP_PORT="${SFTP_PORT:-10022}"

# CI環境判定
IS_CI=${CI:-false}
if [ "$IS_CI" = "true" ]; then
    echo "🤖 CI環境での実行を検出"
else
    echo "💻 ローカル環境での実行"
fi

# 必須環境変数チェック
check_required_vars() {
    echo "🔍 環境変数チェック中..."
    
    local missing_vars=()
    
    if [[ -z "$XSERVER_USER" ]]; then
        missing_vars+=("XSERVER_USER")
    fi
    
    if [[ -z "$XSERVER_PASSWORD" ]]; then
        missing_vars+=("XSERVER_PASSWORD")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ 必須環境変数が設定されていません:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        echo ""
        echo "💡 設定方法:"
        echo "   ローカル: export XSERVER_USER=your_username"
        echo "   CI/CD: GitHub Secrets で設定"
        exit 1
    fi
    
    echo "✅ 環境変数チェック完了"
}

# ビルドディレクトリ確認
check_build_dir() {
    echo "📁 ビルドディレクトリ確認中..."
    
    if [[ ! -d "$DIST_DIR" ]]; then
        echo "❌ dist/ ディレクトリが見つかりません"
        echo "💡 npm run build を実行してください"
        exit 1
    fi
    
    # 各アプリのディレクトリ確認
    local required_dirs=("lp" "admin" "franchise" "franchise-parent")
    local missing_dirs=()
    
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$DIST_DIR/$dir" ]]; then
            missing_dirs+=("$dir")
        fi
    done
    
    if [ ${#missing_dirs[@]} -ne 0 ]; then
        echo "⚠️ 一部のビルドディレクトリが見つかりません:"
        for dir in "${missing_dirs[@]}"; do
            echo "   - dist/$dir"
        done
        echo "📦 利用可能なディレクトリ:"
        ls -la "$DIST_DIR" | grep "^d" | awk '{print "   - " $9}' | grep -v "^\.$\|^\.\.$"
    fi
    
    echo "✅ ビルドディレクトリ確認完了"
}

# ビルドサイズ分析
analyze_build_size() {
    echo "📊 ビルドサイズ分析中..."
    
    if command -v du >/dev/null 2>&1; then
        echo "📦 各アプリのサイズ:"
        for dir in "$DIST_DIR"/*; do
            if [[ -d "$dir" ]]; then
                local dir_name=$(basename "$dir")
                local size=$(du -sh "$dir" | cut -f1)
                echo "   📁 $dir_name: $size"
            fi
        done
        
        echo "📦 総ビルドサイズ: $(du -sh "$DIST_DIR" | cut -f1)"
    fi
    
    echo "✅ ビルドサイズ分析完了"
}

# SFTP用スクリプト生成
generate_sftp_script() {
    local app_name="$1"
    local local_dir="$DIST_DIR/$app_name"
    local remote_dir="public_html/$app_name"
    local script_file="/tmp/sftp_upload_${app_name}.txt"
    
    if [[ ! -d "$local_dir" ]]; then
        echo "⚠️ $app_name ディレクトリが見つかりません: $local_dir"
        return 1
    fi
    
    echo "📝 SFTP スクリプト生成中: $app_name"
    
    cat > "$script_file" << EOF
# SFTP upload script for $app_name
# Generated at $(date)

# リモートディレクトリ作成・移動
-mkdir $remote_dir
cd $remote_dir

# ローカルディレクトリ設定
lcd $local_dir

# ファイルアップロード（再帰的）
put -r *

# アップロード完了
quit
EOF
    
    echo "$script_file"
}

# SFTP経由でアップロード
upload_via_sftp() {
    local app_name="$1"
    
    echo "📤 SFTP アップロード開始: $app_name"
    
    # SFTPスクリプト生成
    local sftp_script=$(generate_sftp_script "$app_name")
    
    if [[ -z "$sftp_script" ]]; then
        echo "❌ SFTPスクリプト生成に失敗: $app_name"
        return 1
    fi
    
    # SFTP実行
    echo "🔄 SFTP接続中... ($XSERVER_HOST:$SFTP_PORT)"
    
    if sshpass -p "$XSERVER_PASSWORD" sftp -P "$SFTP_PORT" -o "StrictHostKeyChecking=no" -o "UserKnownHostsFile=/dev/null" -b "$sftp_script" "$XSERVER_USER@$XSERVER_HOST"; then
        echo "✅ $app_name アップロード完了"
        rm -f "$sftp_script"
        return 0
    else
        echo "❌ $app_name アップロードに失敗"
        rm -f "$sftp_script"
        return 1
    fi
}

# FTP経由でアップロード（フォールバック）
upload_via_ftp() {
    local app_name="$1"
    local local_dir="$DIST_DIR/$app_name"
    local remote_dir="public_html/$app_name"
    
    echo "📤 FTP アップロード開始: $app_name"
    
    if [[ ! -d "$local_dir" ]]; then
        echo "⚠️ $app_name ディレクトリが見つかりません: $local_dir"
        return 1
    fi
    
    # FTPスクリプト生成
    local ftp_script="/tmp/ftp_upload_${app_name}.txt"
    
    cat > "$ftp_script" << EOF
open $XSERVER_HOST
user $XSERVER_USER $XSERVER_PASSWORD
binary
cd $remote_dir
lcd $local_dir
prompt off
mput -r *
quit
EOF
    
    # FTP実行
    echo "🔄 FTP接続中... ($XSERVER_HOST)"
    
    if ftp -v -n < "$ftp_script"; then
        echo "✅ $app_name FTPアップロード完了"
        rm -f "$ftp_script"
        return 0
    else
        echo "❌ $app_name FTPアップロードに失敗"
        rm -f "$ftp_script"
        return 1
    fi
}

# 全アプリのデプロイ
deploy_all_apps() {
    echo "🚀 全アプリケーションデプロイ開始"
    
    local apps=()
    local failed_apps=()
    local successful_apps=()
    
    # 利用可能なアプリを検出
    for dir in "$DIST_DIR"/*; do
        if [[ -d "$dir" ]]; then
            local app_name=$(basename "$dir")
            apps+=("$app_name")
        fi
    done
    
    echo "📋 デプロイ対象アプリ: ${apps[*]}"
    
    # 各アプリをデプロイ
    for app in "${apps[@]}"; do
        echo ""
        echo "🎯 デプロイ中: $app"
        echo "----------------------------------------"
        
        # SFTP試行（sshpassが利用可能な場合）
        if command -v sshpass >/dev/null 2>&1; then
            if upload_via_sftp "$app"; then
                successful_apps+=("$app")
                continue
            fi
        fi
        
        # FTPフォールバック
        echo "🔄 FTPでリトライ中..."
        if upload_via_ftp "$app"; then
            successful_apps+=("$app")
        else
            failed_apps+=("$app")
        fi
    done
    
    # 結果レポート
    echo ""
    echo "📊 デプロイ結果レポート"
    echo "============================================="
    echo "✅ 成功: ${#successful_apps[@]}/${#apps[@]} アプリ"
    if [ ${#successful_apps[@]} -gt 0 ]; then
        for app in "${successful_apps[@]}"; do
            echo "   ✅ $app"
        done
    fi
    
    if [ ${#failed_apps[@]} -gt 0 ]; then
        echo "❌ 失敗: ${#failed_apps[@]} アプリ"
        for app in "${failed_apps[@]}"; do
            echo "   ❌ $app"
        done
    fi
    
    # 全体成功判定
    if [ ${#failed_apps[@]} -eq 0 ]; then
        echo "🎉 全アプリのデプロイが正常完了しました！"
        return 0
    else
        echo "💥 一部のアプリでデプロイに失敗しました"
        return 1
    fi
}

# デプロイ後の疎通確認
verify_deployment() {
    echo "🧪 デプロイ後の疎通確認"
    echo "----------------------------------------"
    
    local base_url="https://gaiheki.kuraberu.com"
    local endpoints=("lp" "admin" "franchise" "franchise-parent")
    local failed_checks=()
    
    if command -v curl >/dev/null 2>&1; then
        for endpoint in "${endpoints[@]}"; do
            local url="$base_url/$endpoint/"
            echo "🔗 確認中: $url"
            
            if curl -I -s -k --max-time 10 "$url" | head -1 | grep -q "200\|301\|302"; then
                echo "   ✅ OK"
            else
                echo "   ❌ エラー"
                failed_checks+=("$endpoint")
            fi
        done
        
        if [ ${#failed_checks[@]} -eq 0 ]; then
            echo "✅ 全エンドポイントの疎通確認完了"
        else
            echo "⚠️ 一部エンドポイントで問題を検出:"
            for endpoint in "${failed_checks[@]}"; do
                echo "   ⚠️ $endpoint"
            done
        fi
    else
        echo "⚠️ curl が利用できません - 手動で疎通確認してください"
    fi
}

# メイン実行
main() {
    echo "🚀 Xserver自動デプロイ実行開始"
    
    # 前提条件チェック
    check_required_vars
    check_build_dir
    analyze_build_size
    
    # デプロイ実行
    if deploy_all_apps; then
        # 疎通確認
        verify_deployment
        
        echo ""
        echo "🎉 Xserver自動デプロイ完了！"
        echo "============================================="
        echo "🔗 サイトURL確認:"
        echo "   LP: https://gaiheki.kuraberu.com/lp/"
        echo "   管理画面: https://gaiheki.kuraberu.com/admin/"
        echo "   加盟店: https://gaiheki.kuraberu.com/franchise/"
        echo "   加盟店親: https://gaiheki.kuraberu.com/franchise-parent/"
        echo ""
        echo "🎯 次のステップ:"
        echo "   1. 各URLでの動作確認"
        echo "   2. SSL証明書の確認"
        echo "   3. レスポンス速度のチェック"
        
        exit 0
    else
        echo ""
        echo "💥 Xserver自動デプロイに失敗しました"
        echo "============================================="
        echo "🛠️ トラブルシューティング:"
        echo "   1. XSERVER_USER, XSERVER_PASSWORD の確認"
        echo "   2. Xserver側のディスク容量確認"
        echo "   3. ネットワーク接続の確認"
        echo "   4. ログファイルの詳細確認"
        
        exit 1
    fi
}

# スクリプト実行
main "$@"