/**
 * 請求システムテスト用関数
 * GASエディタから直接実行可能
 */

/**
 * 1. シートセットアップ実行
 * 請求管理シート作成 + 加盟店マスタ・成約データシートにカラム追加
 */
function testBillingSetup() {
  console.log('========== 請求システムセットアップ開始 ==========');
  const result = BillingSystem.setupBillingSheets();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 2. 紹介料集計テスト（今月分）
 */
function testGetReferralFees() {
  console.log('========== 紹介料集計テスト ==========');
  const result = BillingSystem.getReferralFees();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 3. 成約手数料集計テスト
 */
function testGetCommissionFees() {
  console.log('========== 成約手数料集計テスト ==========');
  const result = BillingSystem.getCommissionFees();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 4. 請求生成テスト（紹介料）
 */
function testGenerateReferralInvoices() {
  console.log('========== 紹介料請求生成テスト ==========');
  const result = BillingSystem.generateInvoices(null, 'referral');
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 5. 請求生成テスト（成約手数料）
 */
function testGenerateCommissionInvoices() {
  console.log('========== 成約手数料請求生成テスト ==========');
  const result = BillingSystem.generateInvoices(null, 'commission');
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 6. 請求一覧取得テスト
 */
function testGetInvoices() {
  console.log('========== 請求一覧取得テスト ==========');
  const result = BillingSystem.getInvoices();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 7. 未入金督促テスト
 */
function testSendReminders() {
  console.log('========== 未入金督促テスト ==========');
  const result = BillingSystem.sendReminders();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 全テスト実行（順番に）
 */
function runAllBillingTests() {
  console.log('★★★★★ 請求システム全テスト開始 ★★★★★');

  // 1. セットアップ
  testBillingSetup();

  // 2. 紹介料集計
  testGetReferralFees();

  // 3. 成約手数料集計
  testGetCommissionFees();

  // 4-5. 請求生成は手動で実行（重複生成防止）
  console.log('請求生成は testGenerateReferralInvoices / testGenerateCommissionInvoices を個別実行してください');

  console.log('★★★★★ 全テスト完了 ★★★★★');
}
