/**
 * 📂 ファイル名: parent_admin_config_system.gs
 * 🎯 内容: 外壁塗装くらべるAI - 親管理者設定システム
 * - ランキング公開設定制御機能
 * - 成約率・成約金額・対応スピード表示管理
 * - 設定変更履歴記録機能
 * ✅ initializeParentAdminConfigSystem() により親管理設定シートを自動生成
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * 親管理者設定システムの初期化
 * 親管理設定シートの作成とサンプルデータ投入
 * 
 * @returns {Object} 初期化結果
 */
function initializeParentAdminConfigSystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('⚙️ 親管理者設定システム初期化開始');

    createParentAdminConfigSheet(ss);
    
    Logger.log('✅ 親管理者設定システム初期化完了');
    
    return {
      success: true,
      message: '親管理者設定システムの初期化が完了しました',
      sheetsCreated: ['親管理設定'],
      featuresEnabled: ['ランキング公開設定', '表示項目制御', '設定変更履歴', 'データ管理'],
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 親管理者設定システム初期化エラー:', error);
    fallbackConfigLog(`[システム初期化] ${error.message}`);
    throw new Error(`親管理者設定システム初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 親管理設定シートの作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createParentAdminConfigSheet(ss) {
  const sheetName = '親管理設定';
  
  try {
    const existingSheet = ss.getSheetByName(sheetName);
    if (existingSheet) {
      ss.deleteSheet(existingSheet);
      Logger.log(`🗑️ 既存の${sheetName}シートを削除`);
    }
    
    const sheet = ss.insertSheet(sheetName);
    const headers = [
      '親ID',
      '表示モード',
      '成約率表示',
      '成約金額表示',
      '対応スピード表示',
      '設定日',
      '最終更新者'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4A90E2');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 150);  // 親ID
    sheet.setColumnWidth(2, 100);  // 表示モード
    sheet.setColumnWidth(3, 100);  // 成約率表示
    sheet.setColumnWidth(4, 120);  // 成約金額表示
    sheet.setColumnWidth(5, 130);  // 対応スピード表示
    sheet.setColumnWidth(6, 140);  // 設定日
    sheet.setColumnWidth(7, 120);  // 最終更新者
    
    const sampleData = [
      [
        'PARENT_001',                         // 親ID
        '公開',                               // 表示モード
        'ON',                                 // 成約率表示
        'ON',                                 // 成約金額表示
        'OFF',                                // 対応スピード表示
        new Date(),                           // 設定日
        'システム管理者'                      // 最終更新者
      ],
      [
        'PARENT_002',                         // 親ID
        '非公開',                             // 表示モード
        'OFF',                                // 成約率表示
        'OFF',                                // 成約金額表示
        'OFF',                                // 対応スピード表示
        new Date(),                           // 設定日
        'システム管理者'                      // 最終更新者
      ],
      [
        'PARENT_001',                         // 親ID（重複許可）
        '公開',                               // 表示モード
        'ON',                                 // 成約率表示
        'OFF',                                // 成約金額表示
        'ON',                                 // 対応スピード表示
        new Date(),                           // 設定日
        '副管理者A'                           // 最終更新者
      ]
    ];
    
    sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
    
  } catch (error) {
    Logger.log(`❌ ${sheetName}シート作成エラー:`, error);
    throw error;
  }
}

/**
 * 親管理者設定の登録・更新
 * 
 * @param {string} parentId 親ID
 * @param {string} displayMode 表示モード（公開/非公開）
 * @param {string} contractRateDisplay 成約率表示（ON/OFF）
 * @param {string} contractAmountDisplay 成約金額表示（ON/OFF）
 * @param {string} responseSpeedDisplay 対応スピード表示（ON/OFF）
 * @param {string} updatedBy 最終更新者
 * @returns {Object} 設定結果
 */
function updateParentAdminConfig(parentId, displayMode, contractRateDisplay, contractAmountDisplay, responseSpeedDisplay, updatedBy) {
  try {
    Logger.log(`⚙️ 親管理者設定更新開始 (親ID: ${parentId})`);
    
    if (!parentId || !displayMode || !updatedBy) {
      throw new Error('必須パラメータが不足しています（parentId, displayMode, updatedBy）');
    }
    
    if (!['公開', '非公開'].includes(displayMode)) {
      throw new Error('表示モードは「公開」または「非公開」である必要があります');
    }
    
    const validatedContractRateDisplay = validateDisplaySetting(contractRateDisplay, 'ON');
    const validatedContractAmountDisplay = validateDisplaySetting(contractAmountDisplay, 'ON');
    const validatedResponseSpeedDisplay = validateDisplaySetting(responseSpeedDisplay, 'ON');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const saveResult = saveParentAdminConfigToSheet(ss, {
      parentId: parentId,
      displayMode: displayMode,
      contractRateDisplay: validatedContractRateDisplay,
      contractAmountDisplay: validatedContractAmountDisplay,
      responseSpeedDisplay: validatedResponseSpeedDisplay,
      updatedBy: updatedBy
    });
    
    if (!saveResult.success) {
      throw new Error(`設定保存に失敗: ${saveResult.error}`);
    }
    
    const logMessage = `[設定更新] 親ID: ${parentId}, 表示: ${displayMode}, ` +
      `成約率: ${validatedContractRateDisplay}, 金額: ${validatedContractAmountDisplay}, ` +
      `スピード: ${validatedResponseSpeedDisplay}, 更新者: ${updatedBy}`;
    
    fallbackConfigLog(logMessage);
    
    Logger.log('✅ 親管理者設定更新完了');
    
    return {
      success: true,
      parentId: parentId,
      displayMode: displayMode,
      settings: {
        contractRateDisplay: validatedContractRateDisplay,
        contractAmountDisplay: validatedContractAmountDisplay,
        responseSpeedDisplay: validatedResponseSpeedDisplay
      },
      updatedBy: updatedBy,
      updatedAt: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 親管理者設定更新エラー:', error);
    fallbackConfigLog(`[設定更新エラー] 親ID: ${parentId}, エラー: ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'config_update_failed',
        message: error.message,
        parentId: parentId
      }
    };
  }
}

/**
 * 親管理者設定の取得
 * 
 * @param {string} parentId 親ID
 * @returns {Object} 設定情報
 */
function getParentAdminConfig(parentId) {
  try {
    Logger.log(`📋 親管理者設定取得開始 (親ID: ${parentId})`);
    
    if (!parentId) {
      throw new Error('親IDが必要です');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('親管理設定');
    
    if (!configSheet) {
      throw new Error('親管理設定シートが見つかりません');
    }
    
    const dataRange = configSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const parentIdColIndex = headers.indexOf('親ID');
    const displayModeColIndex = headers.indexOf('表示モード');
    const contractRateColIndex = headers.indexOf('成約率表示');
    const contractAmountColIndex = headers.indexOf('成約金額表示');
    const responseSpeedColIndex = headers.indexOf('対応スピード表示');
    const settingDateColIndex = headers.indexOf('設定日');
    const updatedByColIndex = headers.indexOf('最終更新者');
    
    let latestConfig = null;
    let latestDate = null;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[parentIdColIndex] === parentId) {
        const settingDate = row[settingDateColIndex];
        
        if (!latestDate || (settingDate instanceof Date && settingDate > latestDate)) {
          latestDate = settingDate;
          latestConfig = {
            parentId: parentId,
            displayMode: row[displayModeColIndex] || '非公開',
            contractRateDisplay: row[contractRateColIndex] || 'OFF',
            contractAmountDisplay: row[contractAmountColIndex] || 'OFF',
            responseSpeedDisplay: row[responseSpeedColIndex] || 'OFF',
            settingDate: settingDate,
            updatedBy: row[updatedByColIndex] || '不明'
          };
        }
      }
    }
    
    if (!latestConfig) {
      latestConfig = {
        parentId: parentId,
        displayMode: '非公開',
        contractRateDisplay: 'OFF',
        contractAmountDisplay: 'OFF',
        responseSpeedDisplay: 'OFF',
        settingDate: null,
        updatedBy: 'システムデフォルト'
      };
    }
    
    Logger.log('✅ 親管理者設定取得完了');
    
    return {
      success: true,
      config: latestConfig
    };
    
  } catch (error) {
    Logger.log('❌ 親管理者設定取得エラー:', error);
    
    return {
      success: false,
      error: {
        type: 'config_get_failed',
        message: error.message,
        parentId: parentId
      }
    };
  }
}

/**
 * 表示設定の検証
 * 
 * @param {string} value 設定値
 * @param {string} defaultValue デフォルト値
 * @returns {string} 検証済み設定値
 */
function validateDisplaySetting(value, defaultValue = 'OFF') {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  
  const upperValue = value.toUpperCase();
  if (['ON', 'OFF'].includes(upperValue)) {
    return upperValue;
  }
  
  if (value === true || value === 'true') {
    return 'ON';
  }
  
  if (value === false || value === 'false') {
    return 'OFF';
  }
  
  return defaultValue;
}

/**
 * 親管理者設定をシートに保存
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {Object} configData 設定データ
 * @returns {Object} 保存結果
 */
function saveParentAdminConfigToSheet(ss, configData) {
  try {
    const configSheet = ss.getSheetByName('親管理設定');
    if (!configSheet) {
      throw new Error('親管理設定シートが見つかりません');
    }
    
    const newRow = [
      configData.parentId,                  // 親ID
      configData.displayMode,               // 表示モード
      configData.contractRateDisplay,       // 成約率表示
      configData.contractAmountDisplay,     // 成約金額表示
      configData.responseSpeedDisplay,      // 対応スピード表示
      new Date(),                           // 設定日
      configData.updatedBy                  // 最終更新者
    ];
    
    configSheet.appendRow(newRow);
    
    Logger.log(`✅ 親管理者設定保存完了: ${configData.parentId}`);
    
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ 親管理者設定保存エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 全親管理者設定の一覧取得
 * 
 * @returns {Object} 設定一覧
 */
function getAllParentAdminConfigs() {
  try {
    Logger.log('📋 全親管理者設定一覧取得開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('親管理設定');
    
    if (!configSheet) {
      throw new Error('親管理設定シートが見つかりません');
    }
    
    const dataRange = configSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const configs = [];
    const latestConfigMap = new Map();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const parentId = row[0];
      const settingDate = row[5];
      
      if (!latestConfigMap.has(parentId) || 
          (settingDate instanceof Date && settingDate > latestConfigMap.get(parentId).settingDate)) {
        
        latestConfigMap.set(parentId, {
          parentId: parentId,
          displayMode: row[1] || '非公開',
          contractRateDisplay: row[2] || 'OFF',
          contractAmountDisplay: row[3] || 'OFF',
          responseSpeedDisplay: row[4] || 'OFF',
          settingDate: settingDate,
          updatedBy: row[6] || '不明'
        });
      }
    }
    
    latestConfigMap.forEach(config => {
      configs.push(config);
    });
    
    Logger.log('✅ 全親管理者設定一覧取得完了');
    
    return {
      success: true,
      configs: configs,
      totalCount: configs.length
    };
    
  } catch (error) {
    Logger.log('❌ 全親管理者設定一覧取得エラー:', error);
    
    return {
      success: false,
      error: {
        type: 'configs_get_failed',
        message: error.message
      }
    };
  }
}

/**
 * フォールバックログ記録（親管理者設定システム専用）
 * 
 * @param {string} message ログメッセージ
 */
function fallbackConfigLog(message) {
  try {
    Logger.log(`📝 親管理者設定システムログ: ${message}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('システムログ');
      logSheet.getRange(1, 1, 1, 4).setValues([['日時', 'システム', 'メッセージ', 'レベル']]);
    }
    
    logSheet.appendRow([new Date(), '親管理者設定システム', message, 'INFO']);
    
  } catch (e) {
    Logger.log(`ログ記録エラー: ${e.message}`);
  }
}

/**
 * 親管理者設定システムのテスト（模擬実行）
 */
function testParentAdminConfigSystem() {
  Logger.log('🧪 親管理者設定システム模擬テスト開始');
  
  try {
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeParentAdminConfigSystem();
    Logger.log('初期化結果:', initResult);
    
    Logger.log('--- 設定更新テスト ---');
    const updateResult = updateParentAdminConfig(
      'TEST_PARENT_001',
      '公開',
      'ON',
      'OFF',
      'ON',
      'テスト管理者'
    );
    Logger.log('設定更新結果:', updateResult);
    
    Logger.log('--- 設定取得テスト ---');
    const getResult = getParentAdminConfig('TEST_PARENT_001');
    Logger.log('設定取得結果:', getResult);
    
    Logger.log('--- 全設定取得テスト ---');
    const getAllResult = getAllParentAdminConfigs();
    Logger.log('全設定取得結果:', getAllResult);
    
    Logger.log('--- 異常系テスト ---');
    const errorResult = updateParentAdminConfig('', '', '', '', '', '');
    Logger.log('異常系テスト結果:', errorResult);
    
    Logger.log('--- 存在しない親ID取得テスト ---');
    const notFoundResult = getParentAdminConfig('NONEXISTENT_PARENT');
    Logger.log('存在しない親ID取得結果:', notFoundResult);
    
    Logger.log('✅ 親管理者設定システム模擬テスト完了');
    
    const testSummary = {
      initialization: initResult.success,
      configUpdate: updateResult.success,
      configGet: getResult.success,
      getAllConfigs: getAllResult.success,
      errorHandling: !errorResult.success,
      defaultConfigHandling: notFoundResult.success,
      totalTests: 6,
      successfulTests: [initResult, updateResult, getResult, getAllResult, notFoundResult].filter(r => r.success).length
    };
    
    Logger.log('📊 テスト結果サマリー:', testSummary);
    
    return {
      success: true,
      summary: testSummary,
      testResults: {
        initialization: initResult,
        configUpdate: updateResult,
        configGet: getResult,
        getAllConfigs: getAllResult,
        errorCase: errorResult,
        notFoundCase: notFoundResult
      }
    };
    
  } catch (error) {
    Logger.log('❌ 親管理者設定システム模擬テストエラー:', error);
    fallbackConfigLog(`[システムテスト] ${error.message}`);
    throw error;
  }
}