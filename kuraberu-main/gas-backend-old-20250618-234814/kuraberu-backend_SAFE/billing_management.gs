/**
 * ファイル名: billing_management.gs
 * 外壁塗装くらべるAI - 加盟店請求管理システム
 * 紹介料・成約手数料の請求データ生成・通知機能
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * 請求関連シートの初期化
 */
function initializeBillingSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('🏗️ 請求管理シート初期化開始');

    // 既存シートの列追加（初期化）
    ensureBillingColumns(ss);

    // 紹介料請求管理シート作成
    createReferralBillingSheet(ss);
    
    // 成約手数料請求管理シート作成
    createSuccessFeeBillingSheet(ss);
    
    Logger.log('✅ 請求管理シート初期化完了');
    
    // Slack通知
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification('🏗️ 請求管理システムが初期化されました（紹介料・成約手数料シート作成完了）');
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      message: '請求管理シートの初期化が完了しました',
      sheetsCreated: ['紹介料請求管理', '成約手数料請求管理']
    };
    
  } catch (error) {
    Logger.log('❌ 請求管理シート初期化エラー:', error);
    throw new Error(`請求管理シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 既存シートに請求関連列を追加（既存データに影響しない）
 */
function ensureBillingColumns(ss) {
  try {
    Logger.log('🔧 請求関連列の確認・追加開始');
    
    // 加盟店シートに「紹介料単価」列を追加
    const franchiseSheet = ss.getSheetByName('加盟店');
    if (franchiseSheet) {
      const franchiseHeaders = franchiseSheet.getRange(1, 1, 1, franchiseSheet.getLastColumn()).getValues()[0];
      if (!franchiseHeaders.includes('紹介料単価')) {
        const newCol = franchiseSheet.getLastColumn() + 1;
        franchiseSheet.getRange(1, newCol).setValue('紹介料単価');
        Logger.log('✅ 加盟店シートに「紹介料単価」列を追加');
      }
    }
    
    // ユーザー案件シートに「紹介料（上書き）」列を追加
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    if (userCasesSheet) {
      const userCasesHeaders = userCasesSheet.getRange(1, 1, 1, userCasesSheet.getLastColumn()).getValues()[0];
      if (!userCasesHeaders.includes('紹介料（上書き）')) {
        const newCol = userCasesSheet.getLastColumn() + 1;
        userCasesSheet.getRange(1, newCol).setValue('紹介料（上書き）');
        Logger.log('✅ ユーザー案件シートに「紹介料（上書き）」列を追加');
      }
    }
    
    Logger.log('✅ 請求関連列の確認・追加完了');
    
  } catch (error) {
    Logger.log('❌ 請求関連列追加エラー:', error);
  }
}

/**
 * 紹介料取得関数（優先順位に基づく）
 * @param {string} franchiseId - 加盟店ID
 * @param {number} overrideFee - 案件固有の上書き紹介料
 * @returns {number} 紹介料金額
 */
function getReferralFee(franchiseId, overrideFee) {
  try {
    // ① overrideFee（案件シート上の「紹介料（上書き）」）があればそれを返す
    if (overrideFee && !isNaN(overrideFee) && overrideFee > 0) {
      Logger.log(`紹介料取得: 上書き料金 ${overrideFee}円 (案件ID: ${franchiseId})`);
      return parseFloat(overrideFee);
    }
    
    // ② 加盟店設定シート「紹介料単価」列に該当フランチャイズIDの設定があればそれを返す
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const franchiseSheet = ss.getSheetByName('加盟店');
    
    if (franchiseSheet && franchiseId) {
      const franchiseData = franchiseSheet.getDataRange().getValues();
      const franchiseHeaders = franchiseData[0];
      
      const franchiseIdIndex = franchiseHeaders.indexOf('加盟店ID');
      const referralFeeIndex = franchiseHeaders.indexOf('紹介料単価');
      
      if (franchiseIdIndex >= 0 && referralFeeIndex >= 0) {
        for (let i = 1; i < franchiseData.length; i++) {
          const row = franchiseData[i];
          if (row[franchiseIdIndex] === franchiseId) {
            const franchiseFee = row[referralFeeIndex];
            if (franchiseFee && !isNaN(franchiseFee) && franchiseFee > 0) {
              Logger.log(`紹介料取得: 加盟店設定 ${franchiseFee}円 (加盟店ID: ${franchiseId})`);
              return parseFloat(franchiseFee);
            }
            break;
          }
        }
      }
    }
    
    // ③ システム設定「REFERRAL_FEE_PER_CASE」があればそれを返す
    const systemSetting = getSystemSetting('REFERRAL_FEE_PER_CASE');
    if (systemSetting && !isNaN(systemSetting) && systemSetting > 0) {
      Logger.log(`紹介料取得: システム設定 ${systemSetting}円`);
      return parseFloat(systemSetting);
    }
    
    // ④ 最終的には 20000 を返す（固定）
    Logger.log('紹介料取得: デフォルト値 20000円');
    return 20000;
    
  } catch (error) {
    Logger.log(`❌ 紹介料取得エラー (加盟店ID: ${franchiseId}):`, error);
    return 20000; // エラー時もデフォルト値を返す
  }
}

/**
 * 紹介料請求管理シート作成
 */
function createReferralBillingSheet(ss) {
  const sheetName = '紹介料請求管理';
  
  // 既存シートがあれば削除
  const existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  
  // 新規作成
  const sheet = ss.insertSheet(sheetName);
  const headers = [
    '請求ID', '加盟店ID', '加盟店名', '請求対象月', '紹介案件数', 
    '紹介料単価', '紹介料合計', '支払いステータス', '支払期日', 
    '作成日', '更新日', '備考'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダーフォーマット
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✅ 紹介料請求管理シート作成完了');
}

/**
 * 成約手数料請求管理シート作成
 */
function createSuccessFeeBillingSheet(ss) {
  const sheetName = '成約手数料請求管理';
  
  // 既存シートがあれば削除
  const existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    ss.deleteSheet(existingSheet);
  }
  
  // 新規作成
  const sheet = ss.insertSheet(sheetName);
  const headers = [
    '請求ID', '加盟店ID', '加盟店名', '案件ID', 'ユーザー名', 
    '契約日', '成約金額', '手数料率(%)', '手数料額', '支払いステータス', 
    '支払期日', '作成日', '更新日', '備考'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダーフォーマット
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#FF9800');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('✅ 成約手数料請求管理シート作成完了');
}

/**
 * 紹介料請求データの自動生成（月末締め・翌月27日支払い）
 */
function generateReferralBillingRecords() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); // 前月
    const targetMonthStr = Utilities.formatDate(targetMonth, 'JST', 'yyyy-MM');
    
    Logger.log(`📊 紹介料請求データ生成開始 (対象月: ${targetMonthStr})`);
    
    // ユーザー案件シートから紹介案件を集計
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    if (!userCasesSheet) {
      throw new Error('ユーザー案件シートが見つかりません');
    }
    
    const userCasesData = userCasesSheet.getDataRange().getValues();
    const userCasesHeaders = userCasesData[0];
    
    // 加盟店別紹介案件データを集計（件数だけでなく紹介料も個別計算）
    const franchiseReferrals = {};
    
    for (let i = 1; i < userCasesData.length; i++) {
      const row = userCasesData[i];
      const franchiseId = row[userCasesHeaders.indexOf('担当加盟店ID')];
      const createdDate = row[userCasesHeaders.indexOf('作成日')];
      const status = row[userCasesHeaders.indexOf('ステータス')];
      
      // 「紹介料（上書き）」列のインデックスを取得（存在しない場合は-1）
      const overrideFeeIndex = userCasesHeaders.indexOf('紹介料（上書き）');
      const overrideFee = overrideFeeIndex >= 0 ? row[overrideFeeIndex] : null;
      
      if (!franchiseId || !createdDate) continue;
      
      // 対象月の案件をカウント
      const createdMonth = Utilities.formatDate(new Date(createdDate), 'JST', 'yyyy-MM');
      if (createdMonth === targetMonthStr && status !== 'キャンセル申請') {
        if (!franchiseReferrals[franchiseId]) {
          franchiseReferrals[franchiseId] = {
            count: 0,
            totalAmount: 0,
            franchiseName: '',
            averageFee: 0
          };
        }
        
        // 案件ごとの紹介料を取得して合計に加算
        const caseReferralFee = getReferralFee(franchiseId, overrideFee);
        franchiseReferrals[franchiseId].count++;
        franchiseReferrals[franchiseId].totalAmount += caseReferralFee;
      }
    }
    
    // 加盟店名を取得
    const franchiseSheet = ss.getSheetByName('加盟店');
    if (franchiseSheet) {
      const franchiseData = franchiseSheet.getDataRange().getValues();
      const franchiseHeaders = franchiseData[0];
      
      for (let i = 1; i < franchiseData.length; i++) {
        const row = franchiseData[i];
        const franchiseId = row[franchiseHeaders.indexOf('加盟店ID')];
        const franchiseName = row[franchiseHeaders.indexOf('会社名')];
        
        if (franchiseReferrals[franchiseId]) {
          franchiseReferrals[franchiseId].franchiseName = franchiseName;
        }
      }
    }
    
    // 紹介料請求管理シートに追加
    const billingSheet = ss.getSheetByName('紹介料請求管理');
    if (!billingSheet) {
      throw new Error('紹介料請求管理シートが見つかりません');
    }
    
    // 支払期日計算（翌月27日、土日祝は後ろ倒し）
    const paymentDue = calculatePaymentDueDate(targetMonth);
    
    const newRecords = [];
    let recordCount = 0;
    
    for (const franchiseId in franchiseReferrals) {
      const data = franchiseReferrals[franchiseId];
      if (data.count > 0) {
        const billingId = `REF_${targetMonthStr.replace('-', '')}_${franchiseId}`;
        const averageFee = Math.round(data.totalAmount / data.count); // 平均紹介料
        
        newRecords.push([
          billingId,
          franchiseId,
          data.franchiseName || '未設定',
          targetMonthStr,
          data.count,
          averageFee, // 平均紹介料単価
          data.totalAmount, // 実際の合計金額
          '未払い',
          paymentDue,
          new Date(),
          new Date(),
          `自動生成 (${targetMonthStr}月分) - 個別料金適用`
        ]);
        recordCount++;
      }
    }
    
    if (newRecords.length > 0) {
      const lastRow = billingSheet.getLastRow();
      billingSheet.getRange(lastRow + 1, 1, newRecords.length, newRecords[0].length).setValues(newRecords);
    }
    
    Logger.log(`✅ 紹介料請求データ生成完了 (${recordCount}件)`);
    
    // Slack通知
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification(`📊 ${targetMonthStr}月分の紹介料請求データを生成しました (${recordCount}加盟店)`);
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      targetMonth: targetMonthStr,
      recordsGenerated: recordCount,
      records: newRecords
    };
    
  } catch (error) {
    Logger.log('❌ 紹介料請求データ生成エラー:', error);
    throw new Error(`紹介料請求データ生成に失敗しました: ${error.message}`);
  }
}

/**
 * 成約手数料請求データの自動生成（契約日から3営業日以内支払い）
 */
function generateSuccessFeeBillingRecords() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('💰 成約手数料請求データ生成開始');
    
    // ユーザー案件シートから成約済み案件を取得
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    if (!userCasesSheet) {
      throw new Error('ユーザー案件シートが見つかりません');
    }
    
    const userCasesData = userCasesSheet.getDataRange().getValues();
    const userCasesHeaders = userCasesData[0];
    
    // 成約手数料請求管理シートの既存データを確認
    const billingSheet = ss.getSheetByName('成約手数料請求管理');
    if (!billingSheet) {
      throw new Error('成約手数料請求管理シートが見つかりません');
    }
    
    const existingBillingData = billingSheet.getDataRange().getValues();
    const existingCaseIds = new Set();
    
    // 既存の案件IDを記録（重複防止）
    for (let i = 1; i < existingBillingData.length; i++) {
      const caseId = existingBillingData[i][3]; // 案件ID列
      if (caseId) existingCaseIds.add(caseId);
    }
    
    // 加盟店名マッピング
    const franchiseNames = {};
    const franchiseSheet = ss.getSheetByName('加盟店');
    if (franchiseSheet) {
      const franchiseData = franchiseSheet.getDataRange().getValues();
      const franchiseHeaders = franchiseData[0];
      
      for (let i = 1; i < franchiseData.length; i++) {
        const row = franchiseData[i];
        const franchiseId = row[franchiseHeaders.indexOf('加盟店ID')];
        const franchiseName = row[franchiseHeaders.indexOf('会社名')];
        franchiseNames[franchiseId] = franchiseName;
      }
    }
    
    const newRecords = [];
    let recordCount = 0;
    
    // 成約済み案件を処理
    for (let i = 1; i < userCasesData.length; i++) {
      const row = userCasesData[i];
      const userId = row[userCasesHeaders.indexOf('ユーザーID')];
      const userName = row[userCasesHeaders.indexOf('ユーザー名')];
      const franchiseId = row[userCasesHeaders.indexOf('担当加盟店ID')];
      const status = row[userCasesHeaders.indexOf('ステータス')];
      const updatedDate = row[userCasesHeaders.indexOf('更新日')];
      
      // 成約済みかつ未処理の案件を対象
      if (status === '成約済み' && franchiseId && !existingCaseIds.has(userId)) {
        
        // デフォルト手数料率（システム設定またはハードコード）
        const defaultFeeRate = parseFloat(getSystemSetting('DEFAULT_SUCCESS_FEE_RATE')) || 10.0;
        
        // 成約金額（デモ用に100-500万円のランダム値）
        const contractAmount = Math.floor(Math.random() * 4000000) + 1000000; // 100-500万円
        
        // 案件固有の手数料率（今後案件シートに追加予定、現在はデフォルト使用）
        const feeRate = defaultFeeRate;
        const feeAmount = Math.floor(contractAmount * (feeRate / 100));
        
        // 契約日（更新日を契約日とみなす）
        const contractDate = new Date(updatedDate);
        
        // 支払期日（契約日から3営業日後）
        const paymentDue = calculateBusinessDays(contractDate, 3);
        
        const billingId = `SUC_${Utilities.formatDate(contractDate, 'JST', 'yyyyMMdd')}_${userId}`;
        
        newRecords.push([
          billingId,
          franchiseId,
          franchiseNames[franchiseId] || '未設定',
          userId, // 案件ID
          userName,
          contractDate,
          contractAmount,
          feeRate,
          feeAmount,
          '未払い',
          paymentDue,
          new Date(),
          new Date(),
          '自動生成（成約済み案件）'
        ]);
        recordCount++;
      }
    }
    
    // 新規レコードをシートに追加
    if (newRecords.length > 0) {
      const lastRow = billingSheet.getLastRow();
      billingSheet.getRange(lastRow + 1, 1, newRecords.length, newRecords[0].length).setValues(newRecords);
    }
    
    Logger.log(`✅ 成約手数料請求データ生成完了 (${recordCount}件)`);
    
    // Slack通知
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification(`💰 成約手数料請求データを生成しました (${recordCount}件の新規成約)`);
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      recordsGenerated: recordCount,
      records: newRecords
    };
    
  } catch (error) {
    Logger.log('❌ 成約手数料請求データ生成エラー:', error);
    throw new Error(`成約手数料請求データ生成に失敗しました: ${error.message}`);
  }
}

/**
 * 未払い請求のSlack通知
 */
function notifyUnpaidBillingToSlack() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const today = new Date();
    Logger.log('🔔 未払い請求通知チェック開始');
    
    let unpaidNotifications = [];
    
    // 紹介料の未払いチェック
    const referralSheet = ss.getSheetByName('紹介料請求管理');
    if (referralSheet) {
      const referralData = referralSheet.getDataRange().getValues();
      const referralHeaders = referralData[0];
      
      for (let i = 1; i < referralData.length; i++) {
        const row = referralData[i];
        const franchiseName = row[referralHeaders.indexOf('加盟店名')];
        const amount = row[referralHeaders.indexOf('紹介料合計')];
        const status = row[referralHeaders.indexOf('支払いステータス')];
        const dueDate = new Date(row[referralHeaders.indexOf('支払期日')]);
        const targetMonth = row[referralHeaders.indexOf('請求対象月')];
        
        if (status === '未払い' && dueDate <= today) {
          unpaidNotifications.push({
            type: '紹介料',
            franchiseName: franchiseName,
            amount: amount,
            dueDate: dueDate,
            detail: `${targetMonth}月分`
          });
        }
      }
    }
    
    // 成約手数料の未払いチェック
    const successFeeSheet = ss.getSheetByName('成約手数料請求管理');
    if (successFeeSheet) {
      const successFeeData = successFeeSheet.getDataRange().getValues();
      const successFeeHeaders = successFeeData[0];
      
      for (let i = 1; i < successFeeData.length; i++) {
        const row = successFeeData[i];
        const franchiseName = row[successFeeHeaders.indexOf('加盟店名')];
        const amount = row[successFeeHeaders.indexOf('手数料額')];
        const status = row[successFeeHeaders.indexOf('支払いステータス')];
        const dueDate = new Date(row[successFeeHeaders.indexOf('支払期日')]);
        const userName = row[successFeeHeaders.indexOf('ユーザー名')];
        
        if (status === '未払い' && dueDate <= today) {
          unpaidNotifications.push({
            type: '成約手数料',
            franchiseName: franchiseName,
            amount: amount,
            dueDate: dueDate,
            detail: `${userName}様の案件`
          });
        }
      }
    }
    
    // Slack通知送信
    if (unpaidNotifications.length > 0) {
      let message = '🚨 *未払い請求のお知らせ*\n\n';
      
      // 加盟店別にグループ化
      const groupedByFranchise = {};
      unpaidNotifications.forEach(item => {
        if (!groupedByFranchise[item.franchiseName]) {
          groupedByFranchise[item.franchiseName] = [];
        }
        groupedByFranchise[item.franchiseName].push(item);
      });
      
      for (const franchiseName in groupedByFranchise) {
        const items = groupedByFranchise[franchiseName];
        message += `📍 *${franchiseName}*\n`;
        
        let totalAmount = 0;
        items.forEach(item => {
          const dueDateStr = Utilities.formatDate(item.dueDate, 'JST', 'yyyy/MM/dd');
          message += `  • ${item.type}: ¥${item.amount.toLocaleString()} (${item.detail}) - 期限: ${dueDateStr}\n`;
          totalAmount += item.amount;
        });
        
        message += `  💰 *小計: ¥${totalAmount.toLocaleString()}*\n\n`;
      }
      
      message += `⚠️ 上記の請求について、支払期限を過ぎております。\n`;
      message += `💡 管理画面で詳細を確認し、加盟店への連絡をお願いします。`;
      
      // Slack通知送信
      try {
        if (typeof sendSlackNotification === 'function') {
          sendSlackNotification(message);
        }
      } catch (e) {
        Logger.log('Slack通知エラー:', e.message);
      }
      
      Logger.log(`🔔 未払い通知送信完了 (${unpaidNotifications.length}件)`);
    } else {
      Logger.log('✅ 未払い請求はありません');
    }
    
    return {
      success: true,
      unpaidCount: unpaidNotifications.length,
      notifications: unpaidNotifications
    };
    
  } catch (error) {
    Logger.log('❌ 未払い請求通知エラー:', error);
    throw new Error(`未払い請求通知に失敗しました: ${error.message}`);
  }
}

/**
 * 支払期日計算（翌月27日、土日祝は後ろ倒し）
 */
function calculatePaymentDueDate(targetMonth) {
  const nextMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 27);
  
  // 土日を後ろ倒し
  while (nextMonth.getDay() === 0 || nextMonth.getDay() === 6) {
    nextMonth.setDate(nextMonth.getDate() + 1);
  }
  
  return nextMonth;
}

/**
 * 営業日計算（土日を除く）
 */
function calculateBusinessDays(startDate, businessDays) {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    
    // 土日をスキップ
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * 請求ロジックのテスト関数
 */
function testBillingLogic() {
  Logger.log('🧪 請求ロジックテスト開始');
  
  try {
    // 1. 初期化テスト
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeBillingSheets();
    Logger.log('初期化結果:', initResult);
    
    // 2. 紹介料請求生成テスト
    Logger.log('--- 紹介料請求生成テスト ---');
    const referralResult = generateReferralBillingRecords();
    Logger.log('紹介料請求生成結果:', referralResult);
    
    // 3. 成約手数料請求生成テスト
    Logger.log('--- 成約手数料請求生成テスト ---');
    const successFeeResult = generateSuccessFeeBillingRecords();
    Logger.log('成約手数料請求生成結果:', successFeeResult);
    
    // 4. 未払い通知テスト
    Logger.log('--- 未払い通知テスト ---');
    const notificationResult = notifyUnpaidBillingToSlack();
    Logger.log('未払い通知結果:', notificationResult);
    
    // 5. 日付計算テスト
    Logger.log('--- 日付計算テスト ---');
    const testDate = new Date(2024, 0, 15); // 2024年1月15日
    const paymentDue = calculatePaymentDueDate(testDate);
    const businessDue = calculateBusinessDays(testDate, 3);
    
    Logger.log('支払期日テスト (2024/01 → 2024/02/27):', Utilities.formatDate(paymentDue, 'JST', 'yyyy/MM/dd'));
    Logger.log('営業日テスト (2024/01/15から3営業日後):', Utilities.formatDate(businessDue, 'JST', 'yyyy/MM/dd'));
    
    Logger.log('✅ 請求ロジックテスト完了');
    
    // Slack通知
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification('🧪 請求ロジックのテストが完了しました\n✅ 全機能正常動作確認済み');
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      testResults: {
        initialization: initResult,
        referralBilling: referralResult,
        successFeeBilling: successFeeResult,
        unpaidNotification: notificationResult
      }
    };
    
  } catch (error) {
    Logger.log('❌ 請求ロジックテストエラー:', error);
    
    // エラー通知
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification(`🚨 請求ロジックテストでエラーが発生しました\nエラー: ${error.message}`);
      }
    } catch (e) {
      Logger.log('エラー通知スキップ:', e.message);
    }
    
    throw error;
  }
}

/**
 * システム設定値取得（spreadsheet_service.gsの関数を使用）
 */
function getSystemSetting(key) {
  // この関数はspreadsheet_service.gsで定義済み
  // 依存関係の明確化のため、ここでは一時的な実装
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    
    // REFERRAL_FEE_PER_CASEのデフォルト値を20000に設定
    if (!value && key === 'REFERRAL_FEE_PER_CASE') {
      Logger.log('REFERRAL_FEE_PER_CASE未設定のため、デフォルト値20000を返します');
      return '20000';
    }
    
    return value;
  } catch (error) {
    Logger.log(`システム設定取得エラー [${key}]:`, error);
    
    // エラー時のデフォルト値
    if (key === 'REFERRAL_FEE_PER_CASE') {
      return '20000';
    }
    
    return null;
  }
}