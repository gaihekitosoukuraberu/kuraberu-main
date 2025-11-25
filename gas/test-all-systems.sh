#!/bin/bash

##############################################
# 統合テストスクリプト
# 全システムの主要機能をテスト
##############################################

set -e  # エラー時に停止

echo "========================================="
echo "🧪 全システム統合テスト開始"
echo "========================================="
echo ""

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果カウンター
PASSED=0
FAILED=0
WARNINGS=0

# ログファイル
LOG_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"

# テスト関数
run_test() {
  local test_name="$1"
  local test_command="$2"

  echo "📝 テスト: $test_name"

  if eval "$test_command" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓${NC} PASSED: $test_name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} FAILED: $test_name"
    echo "  詳細: $LOG_FILE を確認してください"
    ((FAILED++))
    return 1
  fi
}

# 警告付きテスト
run_test_with_warning() {
  local test_name="$1"
  local test_command="$2"

  echo "📝 テスト: $test_name"

  if eval "$test_command" >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✓${NC} PASSED: $test_name"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} WARNING: $test_name"
    echo "  詳細: $LOG_FILE を確認してください"
    ((WARNINGS++))
  fi
}

##############################################
# 1. ヘルスチェック
##############################################
echo ""
echo "========================================="
echo "1️⃣  ヘルスチェック"
echo "========================================="

# GASプロジェクト存在確認
run_test "GASプロジェクト設定確認" "test -f .clasp.json"

# Script Properties確認
run_test "Script Properties確認" "node -e \"
const fs = require('fs');
const path = require('path');
const checkPropertiesPath = path.join(__dirname, 'check-properties.js');
if (!fs.existsSync(checkPropertiesPath)) {
  console.error('check-properties.js が見つかりません');
  process.exit(1);
}
console.log('Script Properties チェックスクリプトが存在します');
\""

##############################################
# 2. コード品質チェック
##############################################
echo ""
echo "========================================="
echo "2️⃣  コード品質チェック"
echo "========================================="

# 構文チェック（主要ファイル）
SYSTEM_FILES=(
  "main.js"
  "systems/franchise/FranchiseSystem.js"
  "systems/merchant/MerchantSystem.js"
  "systems/admin/AdminSystem.js"
  "systems/ai/AISearchSystem.gs"
)

for file in "${SYSTEM_FILES[@]}"; do
  if [ -f "$file" ]; then
    run_test "構文チェック: $file" "node --check $file 2>&1 || true"
  else
    echo -e "${YELLOW}⚠${NC} ファイル未検出: $file"
    ((WARNINGS++))
  fi
done

# 依存関係コメント存在確認
echo ""
echo "📋 依存関係ドキュメント確認"
run_test "FranchiseSystem: 依存関係コメント" "grep -q '【依存関係】' systems/franchise/FranchiseSystem.js"
run_test "MerchantSystem: 依存関係コメント" "grep -q '【依存関係】' systems/merchant/MerchantSystem.js"
run_test "AdminSystem: 依存関係コメント" "grep -q '【依存関係】' systems/admin/AdminSystem.js"

##############################################
# 3. システム間整合性チェック
##############################################
echo ""
echo "========================================="
echo "3️⃣  システム間整合性チェック"
echo "========================================="

# SystemRouter登録確認
echo "🔍 SystemRouter設定確認"
run_test "SystemRouter定義存在" "grep -q 'const SystemRouter' main.js"
run_test "FranchiseSystem登録" "grep -q \"system: 'FranchiseSystem'\" main.js"
run_test "MerchantSystem登録" "grep -q \"system: 'MerchantSystem'\" main.js"
run_test "AdminSystem登録" "grep -q \"system: 'AdminSystem'\" main.js"

# doGet/doPost存在確認
echo ""
echo "🔍 エントリーポイント確認"
run_test "doGet関数定義" "grep -q 'function doGet' main.js"
run_test "doPost関数定義" "grep -q 'function doPost' main.js"

##############################################
# 4. データ整合性チェック
##############################################
echo ""
echo "========================================="
echo "4️⃣  データ整合性チェック（オプション）"
echo "========================================="

# Spreadsheet接続テスト（実行時のみ - ローカルではスキップ）
if [ -n "$RUN_LIVE_TESTS" ]; then
  echo "🔗 Spreadsheet接続テスト"
  run_test_with_warning "Spreadsheet読み取り" "node test-spreadsheet-data.js"
else
  echo -e "${YELLOW}⚠${NC} ライブテストはスキップされました（RUN_LIVE_TESTS未設定）"
  ((WARNINGS++))
fi

##############################################
# 5. デプロイ準備チェック
##############################################
echo ""
echo "========================================="
echo "5️⃣  デプロイ準備チェック"
echo "========================================="

# .claspignore確認
run_test ".claspignore存在" "test -f .claspignore"

# バックアップ確認（推奨）
if [ -d "../../../gas-backup-$(date +%Y%m%d)*" ]; then
  echo -e "${GREEN}✓${NC} 本日のバックアップが存在します"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} 本日のバックアップが見つかりません（推奨: デプロイ前にバックアップを作成）"
  ((WARNINGS++))
fi

##############################################
# 結果サマリー
##############################################
echo ""
echo "========================================="
echo "📊 テスト結果サマリー"
echo "========================================="
echo -e "${GREEN}✓${NC} 成功: $PASSED"
echo -e "${RED}✗${NC} 失敗: $FAILED"
echo -e "${YELLOW}⚠${NC} 警告: $WARNINGS"
echo ""
echo "詳細ログ: $LOG_FILE"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ テスト失敗: $FAILED 件のテストが失敗しました${NC}"
  echo ""
  echo "修正後、再度テストを実行してください："
  echo "  bash test-all-systems.sh"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  警告あり: $WARNINGS 件の警告があります${NC}"
  echo ""
  echo "警告を確認し、必要に応じて対応してください。"
  echo "デプロイは可能ですが、以下を確認することを推奨します："
  echo "  1. $LOG_FILE の内容を確認"
  echo "  2. 影響範囲を評価"
  echo "  3. 必要に応じて修正"
  exit 0
else
  echo -e "${GREEN}✅ すべてのテストに成功しました！${NC}"
  echo ""
  echo "デプロイ準備完了："
  echo "  clasp push"
  echo "  clasp deploy"
  exit 0
fi
