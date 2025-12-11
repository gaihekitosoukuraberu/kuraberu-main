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
 * ※ 支払期限を過ぎた発行済み/未入金の請求に督促メールを送信
 */
function testSendReminders() {
  console.log('========== 未入金督促テスト ==========');
  const result = BillingSystem.sendReminders();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 8. 入金確認テスト
 * ※ 請求IDを指定して入金を記録し、Slack通知を送信
 */
function testConfirmPayment() {
  console.log('========== 入金確認テスト ==========');

  // まず請求一覧を取得
  const invoices = BillingSystem.getInvoices();
  if (!invoices.success || invoices.invoices.length === 0) {
    console.log('請求がありません');
    return;
  }

  // 最初の発行済み or 未入金の請求をテスト対象に
  const targetInvoice = invoices.invoices.find(inv =>
    inv['ステータス'] === '発行済み' || inv['ステータス'] === '未入金'
  );

  if (!targetInvoice) {
    console.log('発行済み/未入金の請求がありません');
    console.log('既存の請求:', invoices.invoices.map(inv => ({
      id: inv['請求ID'],
      status: inv['ステータス'],
      amount: inv['税込金額']
    })));
    return;
  }

  console.log('テスト対象請求:', {
    id: targetInvoice['請求ID'],
    merchant: targetInvoice['加盟店名'],
    amount: targetInvoice['税込金額'],
    status: targetInvoice['ステータス']
  });

  // 入金確認（全額入金をシミュレート）
  const result = BillingSystem.confirmPayment(
    targetInvoice['請求ID'],
    targetInvoice['税込金額'], // 全額入金
    new Date()
  );

  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 9. 督促ルール確認テスト（ドライラン）
 * メール送信せず、どの請求が督促対象かを確認
 */
function testCheckOverdueInvoices() {
  console.log('========== 督促対象確認（ドライラン）==========');

  const invoices = BillingSystem.getInvoices();
  if (!invoices.success) {
    console.log('エラー:', invoices.error);
    return;
  }

  const now = new Date();
  const overdueList = [];

  for (const inv of invoices.invoices) {
    const status = inv['ステータス'];
    if (status !== '発行済み' && status !== '未入金') continue;

    const dueDate = new Date(inv['支払期限']);
    if (dueDate >= now) continue;

    const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    const reminderCount = inv['督促回数'] || 0;

    overdueList.push({
      請求ID: inv['請求ID'],
      加盟店名: inv['加盟店名'],
      税込金額: inv['税込金額'],
      支払期限: inv['支払期限'],
      経過日数: daysPastDue + '日',
      督促回数: reminderCount,
      次回督促: reminderCount === 0 ? '1日後' :
                reminderCount === 1 ? '3日後' :
                reminderCount === 2 ? '7日後' : '7日ごと'
    });
  }

  console.log('期限超過請求:', overdueList.length + '件');
  console.log(JSON.stringify(overdueList, null, 2));
  console.log('========== 完了 ==========');
  return overdueList;
}

/**
 * 10. 請求ステータス更新テスト（発行済みに変更）
 */
function testUpdateInvoiceStatus() {
  console.log('========== 請求ステータス更新テスト ==========');

  const invoices = BillingSystem.getInvoices();
  if (!invoices.success || invoices.invoices.length === 0) {
    console.log('請求がありません');
    return;
  }

  // 未発行の請求を発行済みに
  const pending = invoices.invoices.find(inv => inv['ステータス'] === '未発行');
  if (!pending) {
    console.log('未発行の請求がありません');
    return;
  }

  console.log('対象:', pending['請求ID'], pending['加盟店名']);

  const result = BillingSystem.updateInvoiceStatus(pending['請求ID'], '発行済み');
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

// ========================================
// 自動実行トリガー関連
// ========================================

/**
 * 毎日実行: 未入金督促チェック
 * トリガーで毎日9:00に実行
 */
function dailyBillingReminders() {
  console.log('[DailyTrigger] 未入金督促チェック開始');
  const result = BillingSystem.sendReminders();
  console.log('[DailyTrigger] 結果:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 月次実行: 紹介料請求生成
 * トリガーで毎月1日に実行（前月分）
 */
function monthlyReferralBilling() {
  console.log('[MonthlyTrigger] 紹介料請求生成開始');

  // 前月を計算
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  console.log('[MonthlyTrigger] 対象月:', month);

  const result = BillingSystem.generateInvoices(month, 'referral');
  console.log('[MonthlyTrigger] 結果:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 請求システムのトリガーをセットアップ
 */
function setupBillingTriggers() {
  console.log('========== 請求システムトリガーセットアップ ==========');

  // 既存の関連トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  let deletedCount = 0;
  for (const trigger of triggers) {
    const funcName = trigger.getHandlerFunction();
    if (funcName === 'dailyBillingReminders' || funcName === 'monthlyReferralBilling') {
      ScriptApp.deleteTrigger(trigger);
      deletedCount++;
    }
  }
  console.log('削除した既存トリガー:', deletedCount + '件');

  // 毎日9:00に督促チェック
  ScriptApp.newTrigger('dailyBillingReminders')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
  console.log('作成: dailyBillingReminders (毎日 9:00)');

  // 毎月1日 10:00に紹介料請求生成
  ScriptApp.newTrigger('monthlyReferralBilling')
    .timeBased()
    .onMonthDay(1)
    .atHour(10)
    .create();
  console.log('作成: monthlyReferralBilling (毎月1日 10:00)');

  console.log('========== トリガーセットアップ完了 ==========');

  return {
    success: true,
    triggers: [
      { name: 'dailyBillingReminders', schedule: '毎日 9:00' },
      { name: 'monthlyReferralBilling', schedule: '毎月1日 10:00' }
    ]
  };
}

/**
 * 請求システムのトリガー一覧表示
 */
function listBillingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const billingTriggers = [];

  for (const trigger of triggers) {
    const funcName = trigger.getHandlerFunction();
    if (funcName.includes('Billing') || funcName.includes('billing')) {
      billingTriggers.push({
        function: funcName,
        type: trigger.getEventType().toString()
      });
    }
  }

  console.log('請求関連トリガー:', JSON.stringify(billingTriggers, null, 2));
  return billingTriggers;
}

/**
 * freee取引先一覧を確認（デバッグ用）
 */
function testListFreeePartners() {
  console.log('========== freee取引先一覧 ==========');
  const partners = FreeeAPI.getPartners();

  if (partners.partners) {
    console.log('取引先数:', partners.partners.length);
    partners.partners.forEach(p => {
      console.log('  ID:', p.id, '| 名前:', p.name, '| コード:', p.shortcut1 || '(なし)');
    });
  } else {
    console.log('取引先なし or エラー');
  }

  return partners;
}

// ========================================
// V2183: キャンセル時の請求取り消しテスト
// ========================================

/**
 * キャンセル承認済みCV一覧を確認
 */
function testGetCancelledCVs() {
  console.log('========== キャンセル承認済みCV一覧 ==========');

  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const cancelledCVs = BillingSystem._getCancelledCVs(ss);

  console.log('キャンセル承認済みCV数:', cancelledCVs.size);
  if (cancelledCVs.size > 0) {
    console.log('CV一覧:', Array.from(cancelledCVs));
  }

  console.log('========== 完了 ==========');
  return Array.from(cancelledCVs);
}

/**
 * 紹介料集計でキャンセル済みCVが除外されることを確認
 */
function testReferralFeesWithCancelCheck() {
  console.log('========== 紹介料集計（キャンセル除外確認）==========');

  // まずキャンセル済みCVを確認
  const cancelledCVs = testGetCancelledCVs();
  console.log('\n');

  // 紹介料集計
  const result = BillingSystem.getReferralFees();
  if (!result.success) {
    console.log('エラー:', result.error);
    return;
  }

  console.log('集計結果:');
  console.log('  加盟店数:', result.summary.totalMerchants);
  console.log('  総件数:', result.summary.totalCount);
  console.log('  総額（税込）:', result.summary.totalWithTax);

  // キャンセル済みCVが含まれていないか確認
  let foundCancelledCV = false;
  for (const fee of result.data) {
    for (const cvId of fee.cvIds) {
      if (cancelledCVs.includes(cvId)) {
        console.log('⚠️ 警告: キャンセル済みCVが含まれています:', cvId);
        foundCancelledCV = true;
      }
    }
  }

  if (!foundCancelledCV && cancelledCVs.length > 0) {
    console.log('✓ OK: キャンセル済みCVは正しく除外されています');
  }

  console.log('========== 完了 ==========');
  return result;
}

/**
 * 請求取り消し処理の単体テスト（ドライラン）
 * 実際には更新せず、対象請求を確認
 */
function testCancelBillingDryRun() {
  console.log('========== 請求取り消しドライラン ==========');

  // テスト用CV ID（実際に存在するキャンセル済みCVを指定）
  const testCvId = 'CV-TEST-001'; // ← 実際のCV IDに変更
  const testMerchantId = 'TESTHOUSEKAI'; // ← 実際の加盟店IDに変更

  console.log('テスト対象:');
  console.log('  CV ID:', testCvId);
  console.log('  加盟店ID:', testMerchantId);

  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(ssId);
  const billingSheet = ss.getSheetByName('請求管理');

  if (!billingSheet) {
    console.log('請求管理シートがありません');
    return;
  }

  const data = billingSheet.getDataRange().getValues();
  const headers = data[0];
  const invoiceIdIdx = headers.indexOf('請求ID');
  const merchantIdIdx = headers.indexOf('加盟店ID');
  const cvIdsIdx = headers.indexOf('対象CV ID');
  const statusIdx = headers.indexOf('ステータス');

  console.log('\n該当する請求:');
  let found = false;
  for (let i = 1; i < data.length; i++) {
    const rowMerchantId = data[i][merchantIdIdx];
    const rowCvIds = data[i][cvIdsIdx] || '';
    const rowStatus = data[i][statusIdx];

    if (rowMerchantId === testMerchantId && rowCvIds.includes(testCvId)) {
      found = true;
      console.log('  請求ID:', data[i][invoiceIdIdx]);
      console.log('  ステータス:', rowStatus);
      console.log('  対象CV:', rowCvIds);
      console.log('  → 取り消し可能:', rowStatus !== '入金済み' ? 'はい' : 'いいえ（入金済み）');
    }
  }

  if (!found) {
    console.log('  該当なし');
  }

  console.log('========== 完了 ==========');
}

/**
 * AdminCancelSystemの請求取り消し処理テスト
 * ※ 実際に更新する。テスト後はスプシを確認
 */
function testCancelBillingForCV() {
  console.log('========== 請求取り消し処理テスト ==========');

  // テスト用（実際のCV IDと加盟店IDに変更してください）
  const testCvId = 'CV-TEST-001';
  const testMerchantId = 'TESTHOUSEKAI';

  console.log('対象:');
  console.log('  CV ID:', testCvId);
  console.log('  加盟店ID:', testMerchantId);

  const result = AdminCancelSystem.cancelBillingForCV(testCvId, testMerchantId);
  console.log('結果:', JSON.stringify(result, null, 2));

  console.log('========== 完了 ==========');
  return result;
}

/**
 * フランチャイズダッシュボード向けAPI テスト
 * 紹介料履歴を取得
 */
function testGetReferralHistory() {
  console.log('========== 紹介料履歴取得テスト ==========');
  const testMerchantId = 'FR251121143810';
  console.log('加盟店ID:', testMerchantId);

  const result = BillingSystem.getReferralHistory(testMerchantId, null);
  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('件数:', result.count);
  }
  return result;
}

/**
 * 財務サマリー取得テスト
 */
function testGetFinancialSummary() {
  console.log('========== 財務サマリー取得テスト ==========');
  const testMerchantId = 'FR251121143810';
  console.log('加盟店ID:', testMerchantId);

  const result = BillingSystem.getFinancialSummary(testMerchantId);
  console.log('結果:', JSON.stringify(result, null, 2));
  return result;
}
