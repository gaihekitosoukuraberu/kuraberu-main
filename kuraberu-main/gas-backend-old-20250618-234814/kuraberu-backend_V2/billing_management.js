/**
 * ファイル名: billing_management.js
 * 外壁塗装くらべるAI - 請求管理システム
 * 加盟店料金計算・請求書発行・支払い管理
 * 
 * 🔧 GAS V8完全対応版 - async/await エラー完全除去済み
 */

/**
 * 請求管理システム初期化
 * @returns {Object} 初期化結果
 */
function initializeBillingSystem() {
  try {
    Logger.log('💰 請求管理システム初期化開始');
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 請求管理シート作成
    createBillingManagementSheet(ss);
    
    // 請求設定マスタシート作成
    createBillingSettingsSheet(ss);
    
    // 支払い履歴シート作成
    createPaymentHistorySheet(ss);
    
    Logger.log('✅ 請求管理システム初期化完了');
    
    return {
      success: true,
      message: '請求管理システムの初期化が完了しました',
      sheetsCreated: ['請求管理', '請求設定マスタ', '支払い履歴'],
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ 請求管理システム初期化エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 請求管理シート作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createBillingManagementSheet(ss) {
  try {
    let sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      sheet = ss.insertSheet('請求管理');
      
      const headers = [
        '請求ID', '加盟店ID', '請求期間開始', '請求期間終了', '基本料金',
        'オプション料金', '成約手数料', '割引額', '請求金額合計', '請求日',
        '支払期限', 'ステータス', '支払日', '備考'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log('✅ 請求管理シート作成完了');
    }
    
  } catch (error) {
    Logger.log(`❌ 請求管理シート作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 請求設定マスタシート作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createBillingSettingsSheet(ss) {
  try {
    let sheet = ss.getSheetByName('請求設定マスタ');
    
    if (!sheet) {
      sheet = ss.insertSheet('請求設定マスタ');
      
      const headers = [
        '設定ID', '加盟店プラン', '基本月額料金', '成約手数料率', '最低保証料金',
        '無料案件数', '追加案件単価', '有効期間開始', '有効期間終了', 'ステータス'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // サンプルデータ追加
      const sampleData = [
        ['SET001', 'スタンダード', 30000, 0.05, 10000, 10, 500, new Date('2024-01-01'), new Date('2024-12-31'), '有効'],
        ['SET002', 'プレミアム', 50000, 0.03, 5000, 20, 300, new Date('2024-01-01'), new Date('2024-12-31'), '有効'],
        ['SET003', 'エンタープライズ', 100000, 0.02, 0, 50, 200, new Date('2024-01-01'), new Date('2024-12-31'), '有効']
      ];
      
      sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#FF9800');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log('✅ 請求設定マスタシート作成完了');
    }
    
  } catch (error) {
    Logger.log(`❌ 請求設定マスタシート作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 支払い履歴シート作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createPaymentHistorySheet(ss) {
  try {
    let sheet = ss.getSheetByName('支払い履歴');
    
    if (!sheet) {
      sheet = ss.insertSheet('支払い履歴');
      
      const headers = [
        '支払いID', '請求ID', '加盟店ID', '支払い金額', '支払い方法',
        '支払い日時', '処理ステータス', 'トランザクションID', '手数料', '備考'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#9C27B0');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log('✅ 支払い履歴シート作成完了');
    }
    
  } catch (error) {
    Logger.log(`❌ 支払い履歴シート作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 月次請求書作成
 * @param {string} franchiseId 加盟店ID
 * @param {Date} billingMonth 請求対象月
 * @returns {Object} 請求書作成結果
 */
function createMonthlyBill(franchiseId, billingMonth) {
  try {
    Logger.log(`💰 月次請求書作成開始: ${franchiseId} - ${billingMonth.toLocaleDateString()}`);
    
    // 1. 加盟店情報取得
    const franchiseInfo = getFranchiseInfo(franchiseId);
    if (!franchiseInfo) {
      throw new Error(`加盟店情報が見つかりません: ${franchiseId}`);
    }
    
    // 2. 請求設定取得
    const billingSettings = getBillingSettings(franchiseInfo.plan);
    if (!billingSettings) {
      throw new Error(`請求設定が見つかりません: ${franchiseInfo.plan}`);
    }
    
    // 3. 当月の案件実績取得
    const monthlyStats = getMonthlyStats(franchiseId, billingMonth);
    
    // 4. 請求金額計算
    const billingCalculation = calculateBillingAmount(billingSettings, monthlyStats);
    
    // 5. 請求書データ作成
    const billData = {
      billingId: generateBillingId(),
      franchiseId: franchiseId,
      billingPeriodStart: new Date(billingMonth.getFullYear(), billingMonth.getMonth(), 1),
      billingPeriodEnd: new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0),
      basicFee: billingCalculation.basicFee,
      optionFee: billingCalculation.optionFee,
      commissionFee: billingCalculation.commissionFee,
      discount: billingCalculation.discount,
      totalAmount: billingCalculation.totalAmount,
      billingDate: new Date(),
      dueDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30日後
      status: '請求中',
      notes: `案件数: ${monthlyStats.totalCases}, 成約数: ${monthlyStats.contractedCases}`
    };
    
    // 6. スプレッドシートに保存
    const saveResult = saveBillingData(billData);
    
    if (saveResult.success) {
      // 7. 請求書通知送信
      notifyBillingCreated(billData, franchiseInfo);
      
      Logger.log('✅ 月次請求書作成完了');
      
      return {
        success: true,
        billingId: billData.billingId,
        totalAmount: billData.totalAmount,
        dueDate: billData.dueDate,
        billingData: billData,
        timestamp: new Date()
      };
    } else {
      throw new Error(saveResult.error);
    }
    
  } catch (error) {
    Logger.log(`❌ 月次請求書作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      franchiseId: franchiseId,
      timestamp: new Date()
    };
  }
}

/**
 * 請求金額計算
 * @param {Object} settings 請求設定
 * @param {Object} stats 月次実績
 * @returns {Object} 計算結果
 */
function calculateBillingAmount(settings, stats) {
  try {
    let basicFee = settings.basicMonthlyFee || 0;
    let optionFee = 0;
    let commissionFee = 0;
    let discount = 0;
    
    // 基本料金
    const basicAmount = basicFee;
    
    // 追加案件料金
    const additionalCases = Math.max(0, stats.totalCases - settings.freeCaseCount);
    const additionalFee = additionalCases * settings.additionalCasePrice;
    optionFee += additionalFee;
    
    // 成約手数料
    const commissionAmount = stats.contractedAmount * settings.commissionRate;
    commissionFee = commissionAmount;
    
    // 最低保証料金チェック
    const subtotal = basicAmount + optionFee + commissionFee;
    const guaranteedMin = settings.minimumGuaranteeFee || 0;
    
    if (subtotal < guaranteedMin) {
      const adjustment = guaranteedMin - subtotal;
      optionFee += adjustment;
    }
    
    const totalAmount = basicAmount + optionFee + commissionFee - discount;
    
    Logger.log(`請求金額計算完了: 基本=${basicAmount}, オプション=${optionFee}, 手数料=${commissionFee}, 合計=${totalAmount}`);
    
    return {
      basicFee: basicAmount,
      optionFee: optionFee,
      commissionFee: commissionFee,
      discount: discount,
      totalAmount: totalAmount,
      calculation: {
        additionalCases: additionalCases,
        additionalFee: additionalFee,
        commissionAmount: commissionAmount,
        guaranteedMinApplied: subtotal < guaranteedMin
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 請求金額計算エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 加盟店情報取得
 * @param {string} franchiseId 加盟店ID
 * @returns {Object} 加盟店情報
 */
function getFranchiseInfo(franchiseId) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('加盟店情報');
    
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === franchiseId) {
        return {
          franchiseId: row[0],
          companyName: row[1],
          plan: row[6] || 'スタンダード',
          status: row[7]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`❌ 加盟店情報取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * 請求設定取得
 * @param {string} plan プラン名
 * @returns {Object} 請求設定
 */
function getBillingSettings(plan) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('請求設定マスタ');
    
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === plan && row[9] === '有効') {
        return {
          settingId: row[0],
          plan: row[1],
          basicMonthlyFee: row[2],
          commissionRate: row[3],
          minimumGuaranteeFee: row[4],
          freeCaseCount: row[5],
          additionalCasePrice: row[6]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`❌ 請求設定取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * 月次実績取得
 * @param {string} franchiseId 加盟店ID
 * @param {Date} targetMonth 対象月
 * @returns {Object} 月次実績
 */
function getMonthlyStats(franchiseId, targetMonth) {
  try {
    // 仮の実績データ（実際は案件データから集計）
    const stats = {
      totalCases: 15,
      contractedCases: 8,
      contractedAmount: 2400000,
      cancelledCases: 2
    };
    
    Logger.log(`月次実績取得: ${franchiseId} - 案件数=${stats.totalCases}, 成約数=${stats.contractedCases}`);
    
    return stats;
    
  } catch (error) {
    Logger.log(`❌ 月次実績取得エラー: ${error.message}`);
    return {
      totalCases: 0,
      contractedCases: 0,
      contractedAmount: 0,
      cancelledCases: 0
    };
  }
}

/**
 * 請求ID生成
 * @returns {string} 請求ID
 */
function generateBillingId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `BILL-${year}${month}-${timestamp}`;
}

/**
 * 請求データ保存
 * @param {Object} billData 請求データ
 * @returns {Object} 保存結果
 */
function saveBillingData(billData) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      createBillingManagementSheet(ss);
      sheet = ss.getSheetByName('請求管理');
    }
    
    const newRow = [
      billData.billingId,
      billData.franchiseId,
      billData.billingPeriodStart,
      billData.billingPeriodEnd,
      billData.basicFee,
      billData.optionFee,
      billData.commissionFee,
      billData.discount,
      billData.totalAmount,
      billData.billingDate,
      billData.dueDate,
      billData.status,
      '', // 支払日
      billData.notes
    ];
    
    sheet.appendRow(newRow);
    Logger.log(`✅ 請求データ保存完了: ${billData.billingId}`);
    
    return { success: true, billingId: billData.billingId };
    
  } catch (error) {
    Logger.log(`❌ 請求データ保存エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 請求書作成通知
 * @param {Object} billData 請求データ
 * @param {Object} franchiseInfo 加盟店情報
 */
function notifyBillingCreated(billData, franchiseInfo) {
  try {
    const message = `💰 **請求書発行通知**

📋 **請求ID**: ${billData.billingId}
🏢 **加盟店**: ${franchiseInfo.companyName} (${billData.franchiseId})
📅 **請求期間**: ${billData.billingPeriodStart.toLocaleDateString()} 〜 ${billData.billingPeriodEnd.toLocaleDateString()}
💵 **請求金額**: ¥${billData.totalAmount.toLocaleString()}
📅 **支払期限**: ${billData.dueDate.toLocaleDateString()}

**内訳:**
• 基本料金: ¥${billData.basicFee.toLocaleString()}
• オプション料金: ¥${billData.optionFee.toLocaleString()}
• 成約手数料: ¥${billData.commissionFee.toLocaleString()}
• 割引: ¥${billData.discount.toLocaleString()}

**備考**: ${billData.notes}`;

    // 統合通知システムを使用
    sendIntegratedNotification('billing_created', message, {
      username: '請求管理システム',
      icon: ':money_with_wings:',
      channel: '#請求管理'
    });
    
    Logger.log('✅ 請求書作成通知送信完了');
    
  } catch (error) {
    Logger.log(`❌ 請求書作成通知エラー: ${error.message}`);
  }
}

/**
 * 支払い処理
 * @param {string} billingId 請求ID
 * @param {Object} paymentData 支払いデータ
 * @returns {Object} 処理結果
 */
function processPayment(billingId, paymentData) {
  try {
    Logger.log(`💳 支払い処理開始: ${billingId}`);
    
    // 1. 請求データ取得
    const billData = getBillingData(billingId);
    if (!billData) {
      throw new Error(`請求データが見つかりません: ${billingId}`);
    }
    
    // 2. 支払いデータ作成
    const payment = {
      paymentId: generatePaymentId(),
      billingId: billingId,
      franchiseId: billData.franchiseId,
      amount: paymentData.amount,
      method: paymentData.method,
      paymentDate: new Date(),
      status: '処理完了',
      transactionId: paymentData.transactionId || '',
      fee: paymentData.fee || 0,
      notes: paymentData.notes || ''
    };
    
    // 3. 支払い履歴保存
    const saveResult = savePaymentHistory(payment);
    
    if (saveResult.success) {
      // 4. 請求ステータス更新
      updateBillingStatus(billingId, '支払い完了', new Date());
      
      // 5. 支払い完了通知
      notifyPaymentCompleted(payment, billData);
      
      Logger.log('✅ 支払い処理完了');
      
      return {
        success: true,
        paymentId: payment.paymentId,
        message: '支払い処理が完了しました',
        timestamp: new Date()
      };
    } else {
      throw new Error(saveResult.error);
    }
    
  } catch (error) {
    Logger.log(`❌ 支払い処理エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      billingId: billingId,
      timestamp: new Date()
    };
  }
}

/**
 * 請求データ取得
 * @param {string} billingId 請求ID
 * @returns {Object} 請求データ
 */
function getBillingData(billingId) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === billingId) {
        return {
          billingId: row[0],
          franchiseId: row[1],
          totalAmount: row[8],
          status: row[11]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`❌ 請求データ取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * 支払いID生成
 * @returns {string} 支払いID
 */
function generatePaymentId() {
  return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 支払い履歴保存
 * @param {Object} payment 支払いデータ
 * @returns {Object} 保存結果
 */
function savePaymentHistory(payment) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('支払い履歴');
    
    if (!sheet) {
      createPaymentHistorySheet(ss);
      sheet = ss.getSheetByName('支払い履歴');
    }
    
    const newRow = [
      payment.paymentId,
      payment.billingId,
      payment.franchiseId,
      payment.amount,
      payment.method,
      payment.paymentDate,
      payment.status,
      payment.transactionId,
      payment.fee,
      payment.notes
    ];
    
    sheet.appendRow(newRow);
    Logger.log(`✅ 支払い履歴保存完了: ${payment.paymentId}`);
    
    return { success: true, paymentId: payment.paymentId };
    
  } catch (error) {
    Logger.log(`❌ 支払い履歴保存エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 請求ステータス更新
 * @param {string} billingId 請求ID
 * @param {string} status ステータス
 * @param {Date} paymentDate 支払日
 */
function updateBillingStatus(billingId, status, paymentDate) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === billingId) {
        sheet.getRange(i + 1, 12).setValue(status); // ステータス
        if (paymentDate) {
          sheet.getRange(i + 1, 13).setValue(paymentDate); // 支払日
        }
        Logger.log(`✅ 請求ステータス更新完了: ${billingId} → ${status}`);
        break;
      }
    }
    
  } catch (error) {
    Logger.log(`❌ 請求ステータス更新エラー: ${error.message}`);
  }
}

/**
 * 支払い完了通知
 * @param {Object} payment 支払いデータ
 * @param {Object} billData 請求データ
 */
function notifyPaymentCompleted(payment, billData) {
  try {
    const message = `💳 **支払い完了通知**

✅ **支払いID**: ${payment.paymentId}
📋 **請求ID**: ${payment.billingId}
🏢 **加盟店ID**: ${payment.franchiseId}
💵 **支払い金額**: ¥${payment.amount.toLocaleString()}
💳 **支払い方法**: ${payment.method}
📅 **支払い日時**: ${payment.paymentDate.toLocaleString()}

支払い処理が正常に完了しました。`;

    // 統合通知システムを使用
    sendIntegratedNotification('payment_completed', message, {
      username: '支払い処理システム',
      icon: ':credit_card:',
      channel: '#請求管理'
    });
    
    Logger.log('✅ 支払い完了通知送信完了');
    
  } catch (error) {
    Logger.log(`❌ 支払い完了通知エラー: ${error.message}`);
  }
}

/**
 * 請求管理システムテスト
 * @returns {Object} テスト結果
 */
function testBillingManagementSystem() {
  try {
    Logger.log('🧪 請求管理システムテスト開始');
    
    const testResults = {
      initialization: false,
      billingCalculation: false,
      paymentProcessing: false
    };
    
    // 1. 初期化テスト
    try {
      const initResult = initializeBillingSystem();
      testResults.initialization = initResult.success;
      Logger.log(`初期化テスト: ${initResult.success ? '✅' : '❌'}`);
    } catch (error) {
      Logger.log(`初期化テストエラー: ${error.message}`);
    }
    
    // 2. 請求計算テスト
    try {
      const testSettings = {
        basicMonthlyFee: 30000,
        commissionRate: 0.05,
        minimumGuaranteeFee: 10000,
        freeCaseCount: 10,
        additionalCasePrice: 500
      };
      const testStats = {
        totalCases: 15,
        contractedCases: 8,
        contractedAmount: 2000000,
        cancelledCases: 2
      };
      
      const calculation = calculateBillingAmount(testSettings, testStats);
      testResults.billingCalculation = calculation.totalAmount > 0;
      Logger.log(`請求計算テスト: ${testResults.billingCalculation ? '✅' : '❌'} (合計: ¥${calculation.totalAmount})`);
    } catch (error) {
      Logger.log(`請求計算テストエラー: ${error.message}`);
    }
    
    const overallSuccess = Object.values(testResults).every(result => result);
    
    Logger.log(`✅ 請求管理システムテスト完了: ${overallSuccess ? '成功' : '一部失敗'}`);
    
    return {
      success: overallSuccess,
      results: testResults,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ 請求管理システムテストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}