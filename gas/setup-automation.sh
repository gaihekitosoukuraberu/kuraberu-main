#!/bin/bash

##############################################
# 完全自動化セットアップマスタースクリプト
# すべての自動化機能を一括セットアップ
##############################################

set -e

echo "========================================="
echo "🚀 GAS完全自動化セットアップ"
echo "========================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SETUP_LOG="setup-automation-$(date +%Y%m%d_%H%M%S).log"

# ログ関数
log() {
  echo -e "$1" | tee -a "$SETUP_LOG"
}

log_success() {
  log "${GREEN}✅ $1${NC}"
}

log_error() {
  log "${RED}❌ $1${NC}"
}

log_info() {
  log "${BLUE}ℹ️  $1${NC}"
}

log_warning() {
  log "${YELLOW}⚠️  $1${NC}"
}

# ステップカウンター
STEP=1
total_steps=6

step() {
  log ""
  log "========================================="
  log "${BLUE}[$STEP/$total_steps] $1${NC}"
  log "========================================="
  ((STEP++))
}

##############################################
# 1. 環境チェック
##############################################
step "環境チェック"

# Gitリポジトリ確認
if [ ! -d "../../.git" ]; then
  log_error "Gitリポジトリが見つかりません"
  exit 1
fi
log_success "Gitリポジトリ検出"

# Node.js確認
if ! command -v node &> /dev/null; then
  log_error "Node.jsがインストールされていません"
  exit 1
fi
log_success "Node.js検出: $(node --version)"

# clasp確認
if ! command -v clasp &> /dev/null; then
  log_warning "claspがインストールされていません - インストール中..."
  npm install -g @google/clasp
fi
log_success "clasp検出: $(clasp --version)"

##############################################
# 2. Git Hooksセットアップ
##############################################
step "Git Hooksセットアップ（コミット前自動テスト）"

bash setup-git-hooks.sh
log_success "Git Hooksセットアップ完了"

##############################################
# 3. GitHub Actionsワークフロー確認
##############################################
step "GitHub Actionsワークフロー確認"

WORKFLOW_FILE="../../.github/workflows/gas-cicd.yml"

if [ -f "$WORKFLOW_FILE" ]; then
  log_success "GitHub Actionsワークフロー検出"
  log_info "ファイル: $WORKFLOW_FILE"
else
  log_warning "GitHub Actionsワークフローが見つかりません"
  log_info "手動でセットアップしてください: .github/workflows/gas-cicd.yml"
fi

##############################################
# 4. GitHub Secretsの設定確認
##############################################
step "GitHub Secretsの設定確認"

log_warning "以下のSecretsをGitHubリポジトリに設定する必要があります："
log ""
log "  1. CLASP_CREDENTIALS"
log "     内容: ~/.clasprc.json の内容"
log "     取得方法: cat ~/.clasprc.json"
log ""
log "  2. CLASP_PROJECT"
log "     内容: .clasp.json の内容"
log "     取得方法: cat .clasp.json"
log ""
log "設定方法:"
log "  1. GitHubリポジトリページを開く"
log "  2. Settings > Secrets and variables > Actions"
log "  3. New repository secret をクリック"
log "  4. 上記のSecretsを追加"
log ""

read -p "GitHub Secretsを設定しましたか? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_warning "後で設定してください"
fi

##############################################
# 5. 自動化スクリプトのテスト
##############################################
step "自動化スクリプトのテスト"

log_info "統合テストスクリプトのテスト..."
if bash test-all-systems.sh; then
  log_success "統合テスト成功"
else
  log_error "統合テスト失敗 - 修正が必要です"
  exit 1
fi

##############################################
# 6. セットアップ完了
##############################################
step "セットアップ完了"

log ""
log "========================================="
log "${GREEN}🎉 完全自動化セットアップ完了！${NC}"
log "========================================="
log ""

log "自動化機能:"
log "  ✅ Git Hooks（コミット前自動テスト）"
log "  ✅ GitHub Actions（push時自動デプロイ）"
log "  ✅ 自動ロールバック（デプロイ失敗時）"
log "  ✅ COLUMN_MAP自動生成"
log "  ✅ DataLayerバージョニング"
log ""

log "使い方:"
log ""
log "${BLUE}【通常の開発フロー】${NC}"
log "  1. コードを編集"
log "  2. git add ."
log "  3. git commit -m \"メッセージ\""
log "     → 自動的にテストが実行される"
log "  4. git push origin main"
log "     → GitHub Actionsが自動デプロイ"
log ""

log "${BLUE}【COLUMN_MAP更新】${NC}"
log "  node generate-column-map.js"
log "  → DataLayer.jsが自動更新される"
log ""

log "${BLUE}【ロールバック】${NC}"
log "  bash rollback.sh"
log "  → 前のバージョンに自動ロールバック"
log ""

log "${BLUE}【手動テスト】${NC}"
log "  bash test-all-systems.sh"
log ""

log "詳細ログ: $SETUP_LOG"
log ""
log "========================================="
log "${GREEN}準備完了！コードを書いてpushするだけ！${NC}"
log "========================================="
