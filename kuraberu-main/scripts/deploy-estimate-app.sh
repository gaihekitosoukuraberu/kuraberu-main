#!/bin/bash

# estimate-app Xserver デプロイスクリプト
# 外壁塗装くらべる見積もりアプリ専用デプロイ

set -e

echo "🎯 外壁塗装くらべる見積もりアプリ - Xserver デプロイ"
echo "============================================="
echo "📅 実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="

# 設定変数
PROJECT_ROOT="/Users/ryuryu/kuraberu-main"
ESTIMATE_APP_DIR="$PROJECT_ROOT/estimate-app"
XSERVER_HOST="${XSERVER_HOST:-sv16424.xserver.jp}"
XSERVER_USER="${XSERVER_USER}"
XSERVER_PASSWORD="${XSERVER_PASSWORD}"
SFTP_PORT="${SFTP_PORT:-10022}"
REMOTE_DIR="public_html/estimate"

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
        echo "   export XSERVER_USER=your_username"
        echo "   export XSERVER_PASSWORD=your_password"
        exit 1
    fi
    
    echo "✅ 環境変数チェック完了"
}

# estimate-appディレクトリ確認
check_estimate_app() {
    echo "📁 estimate-app ディレクトリ確認中..."
    
    if [[ ! -d "$ESTIMATE_APP_DIR" ]]; then
        echo "❌ estimate-app ディレクトリが見つかりません: $ESTIMATE_APP_DIR"
        exit 1
    fi
    
    # 必要なファイルの確認
    local required_files=("index.html" "css/styles.css" "js/ranking.js" "js/chatbot.js" "js/utils.js" "js/phone-form.js")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$ESTIMATE_APP_DIR/$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        echo "❌ 必要なファイルが見つかりません:"
        for file in "${missing_files[@]}"; do
            echo "   - $file"
        done
        exit 1
    fi
    
    echo "✅ estimate-app ディレクトリ確認完了"
    echo "📦 アプリサイズ: $(du -sh "$ESTIMATE_APP_DIR" | cut -f1)"
}

# ファイル最適化
optimize_files() {
    echo "🔧 ファイル最適化中..."
    
    # 一時的な最適化ディレクトリを作成
    local temp_dir="/tmp/estimate-app-optimized"
    rm -rf "$temp_dir"
    cp -r "$ESTIMATE_APP_DIR" "$temp_dir"
    
    # HTMLファイルの最適化（改行とスペースの削除）
    if command -v sed >/dev/null 2>&1; then
        echo "📄 HTML最適化中..."
        find "$temp_dir" -name "*.html" -exec sed -i '' 's/[[:space:]]*$//' {} \;
    fi
    
    # JSファイルのコメント削除（簡易版）
    if command -v sed >/dev/null 2>&1; then
        echo "📜 JavaScript最適化中..."
        find "$temp_dir" -name "*.js" -exec sed -i '' '/^[[:space:]]*\/\//d' {} \;
    fi
    
    echo "✅ ファイル最適化完了"
    echo "🗜️ 最適化後サイズ: $(du -sh "$temp_dir" | cut -f1)"
    
    # 最適化されたディレクトリを使用
    ESTIMATE_APP_DIR="$temp_dir"
}

# SFTP用スクリプト生成
generate_sftp_script() {
    local script_file="/tmp/sftp_upload_estimate.txt"
    
    echo "📝 SFTP スクリプト生成中..."
    
    cat > "$script_file" << EOF
# SFTP upload script for estimate-app
# Generated at $(date)

# リモートディレクトリ作成・移動
-mkdir $REMOTE_DIR
cd $REMOTE_DIR

# ローカルディレクトリ設定
lcd $ESTIMATE_APP_DIR

# ファイルアップロード（再帰的）
put -r *

# 権限設定
chmod 644 *.html
chmod 644 css/*
chmod 644 js/*

# アップロード完了
quit
EOF
    
    echo "$script_file"
}

# SFTP経由でアップロード
upload_via_sftp() {
    echo "📤 SFTP アップロード開始..."
    
    # SFTPスクリプト生成
    local sftp_script=$(generate_sftp_script)
    
    # SFTP実行
    echo "🔄 SFTP接続中... ($XSERVER_HOST:$SFTP_PORT)"
    
    if command -v sshpass >/dev/null 2>&1; then
        if sshpass -p "$XSERVER_PASSWORD" sftp -P "$SFTP_PORT" -o "StrictHostKeyChecking=no" -o "UserKnownHostsFile=/dev/null" -b "$sftp_script" "$XSERVER_USER@$XSERVER_HOST"; then
            echo "✅ SFTP アップロード完了"
            rm -f "$sftp_script"
            return 0
        else
            echo "❌ SFTP アップロードに失敗"
            rm -f "$sftp_script"
            return 1
        fi
    else
        echo "⚠️ sshpass が利用できません - FTPにフォールバック"
        rm -f "$sftp_script"
        return 1
    fi
}

# FTP経由でアップロード（フォールバック）
upload_via_ftp() {
    echo "📤 FTP アップロード開始..."
    
    # FTPスクリプト生成
    local ftp_script="/tmp/ftp_upload_estimate.txt"
    
    cat > "$ftp_script" << EOF
open $XSERVER_HOST
user $XSERVER_USER $XSERVER_PASSWORD
binary
-mkdir $REMOTE_DIR
cd $REMOTE_DIR
lcd $ESTIMATE_APP_DIR
prompt off
mput -r *
quit
EOF
    
    # FTP実行
    echo "🔄 FTP接続中... ($XSERVER_HOST)"
    
    if ftp -v -n < "$ftp_script"; then
        echo "✅ FTP アップロード完了"
        rm -f "$ftp_script"
        return 0
    else
        echo "❌ FTP アップロードに失敗"
        rm -f "$ftp_script"
        return 1
    fi
}

# デプロイ実行
deploy_estimate_app() {
    echo "🚀 estimate-app デプロイ開始"
    
    # SFTP試行
    if upload_via_sftp; then
        return 0
    fi
    
    # FTPフォールバック
    echo "🔄 FTPでリトライ中..."
    if upload_via_ftp; then
        return 0
    fi
    
    echo "❌ 全ての手法でアップロードに失敗しました"
    return 1
}

# デプロイ後の疎通確認
verify_deployment() {
    echo "🧪 デプロイ後の疎通確認"
    echo "----------------------------------------"
    
    local app_url="https://gaiheki.kuraberu.com/estimate/"
    
    if command -v curl >/dev/null 2>&1; then
        echo "🔗 確認中: $app_url"
        
        if curl -I -s -k --max-time 10 "$app_url" | head -1 | grep -q "200\|301\|302"; then
            echo "✅ estimate-app アクセス確認完了"
            
            # HTMLファイルの存在確認
            if curl -s -k --max-time 10 "$app_url" | grep -q "外壁塗装くらべる"; then
                echo "✅ コンテンツ確認完了"
            else
                echo "⚠️ コンテンツに問題がある可能性があります"
            fi
        else
            echo "❌ アクセスエラー - 手動確認が必要です"
            return 1
        fi
    else
        echo "⚠️ curl が利用できません - 手動で疎通確認してください"
    fi
}

# バックアップ作成
create_backup() {
    echo "💾 デプロイ前バックアップ作成..."
    
    local backup_dir="/Users/ryuryu/kuraberu-main/backups/deploy_backup_$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "$backup_dir"
    
    # estimate-appのコピー
    cp -r "$PROJECT_ROOT/estimate-app" "$backup_dir/"
    
    # デプロイ設定の保存
    cat > "$backup_dir/deploy_info.txt" << EOF
Deploy Timestamp: $(date)
Target Server: $XSERVER_HOST
Remote Directory: $REMOTE_DIR
Local Directory: $PROJECT_ROOT/estimate-app
Git Commit: $(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo "Unknown")
Git Branch: $(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo "Unknown")
EOF
    
    echo "✅ バックアップ作成完了: $backup_dir"
}

# メイン実行
main() {
    echo "🚀 estimate-app デプロイ実行開始"
    
    # 前提条件チェック
    check_required_vars
    check_estimate_app
    
    # バックアップ作成
    create_backup
    
    # ファイル最適化
    optimize_files
    
    # デプロイ実行
    if deploy_estimate_app; then
        # 疎通確認
        verify_deployment
        
        echo ""
        echo "🎉 estimate-app デプロイ完了！"
        echo "============================================="
        echo "🔗 アプリURL: https://gaiheki.kuraberu.com/estimate/"
        echo "📱 機能："
        echo "   ✅ 郵便番号検索機能"
        echo "   ✅ 4段階ヒアリングシステム"
        echo "   ✅ 業者ランキング表示"
        echo "   ✅ モザイク効果とアニメーション"
        echo "   ✅ ソート機能（段階別解除）"
        echo ""
        echo "🎯 次のステップ:"
        echo "   1. アプリの動作確認"
        echo "   2. モバイル表示の確認"
        echo "   3. チャットボットの動作確認"
        echo "   4. スプレッドシート連携の確認"
        
        exit 0
    else
        echo ""
        echo "💥 estimate-app デプロイに失敗しました"
        echo "============================================="
        echo "🛠️ トラブルシューティング:"
        echo "   1. サーバー接続情報の確認"
        echo "   2. ディスク容量の確認"
        echo "   3. ファイル権限の確認"
        echo "   4. ネットワーク接続の確認"
        
        exit 1
    fi
}

# ヘルプ表示
show_help() {
    cat << EOF
estimate-app Xserver デプロイスクリプト

使用方法:
  $0 [オプション]

オプション:
  -h, --help     このヘルプを表示
  --no-optimize  ファイル最適化をスキップ
  --backup-only  バックアップのみ作成してデプロイしない

環境変数:
  XSERVER_USER     Xserver ユーザー名（必須）
  XSERVER_PASSWORD Xserver パスワード（必須）
  XSERVER_HOST     Xserver ホスト名（デフォルト: sv16424.xserver.jp）
  SFTP_PORT        SFTP ポート（デフォルト: 10022）

例:
  export XSERVER_USER=youruser
  export XSERVER_PASSWORD=yourpass
  $0
EOF
}

# コマンドライン引数処理
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --no-optimize)
            SKIP_OPTIMIZE=true
            shift
            ;;
        --backup-only)
            BACKUP_ONLY=true
            shift
            ;;
        *)
            echo "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# バックアップのみの場合
if [[ "$BACKUP_ONLY" == "true" ]]; then
    check_estimate_app
    create_backup
    echo "✅ バックアップのみ完了"
    exit 0
fi

# スクリプト実行
main "$@"