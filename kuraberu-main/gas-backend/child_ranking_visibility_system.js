/**
 * 📂 ファイル名: child_ranking_visibility_system.gs
 * 🎯 内容: 外壁塗装くらべるAI - 子加盟店ランキング表示設定システム
 * - 子加盟店ごとのランキング情報表示可否管理
 * - 成約率・成約金額・対応スピード表示制御
 * - 個別設定更新・取得機能
 * ✅ initializeChildRankingVisibilitySystem() により子ランキング表示設定シートを自動生成
 */

/**
 * 子加盟店ランキング表示設定システムの初期化
 * 子ランキング表示設定シートの作成とサンプルデータ投入
 * 
 * @returns {Object} 初期化結果
 */
function initializeChildRankingVisibilitySystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('👥 子加盟店ランキング表示設定システム初期化開始');

    // 子ランキング表示設定シートの作成
    createChildRankingVisibilitySheet(ss);
    
    Logger.log('✅ 子加盟店ランキング表示設定システム初期化完了');
    
    return {
      success: true,
      message: '子加盟店ランキング表示設定システムの初期化が完了しました',
      sheetsCreated: ['子ランキング表示設定'],
      featuresEnabled: ['個別表示設定', '項目別制御', '設定更新', '一括取得'],
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 子加盟店ランキング表示設定システム初期化エラー:', error);
    fallbackChildVisibilityLog(`[システム初期化] ${error.message}`);
    throw new Error(`子加盟店ランキング表示設定システム初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 子ランキング表示設定シートの作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createChildRankingVisibilitySheet(ss) {
  const sheetName = '子ランキング表示設定';
  
  try {
    // 既存シートがあれば削除
    const existingSheet = ss.getSheetByName(sheetName);
    if (existingSheet) {
      ss.deleteSheet(existingSheet);
      Logger.log(`🗑️ 既存の${sheetName}シートを削除`);
    }
    
    // 新規作成
    const sheet = ss.insertSheet(sheetName);
    const headers = [
      '子加盟店ID',
      '成約率表示',
      '成約金額表示',
      '対応スピード表示',
      '最終更新者',
      '最終更新日'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#9C27B0');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅の調整
    sheet.setColumnWidth(1, 150);  // 子加盟店ID
    sheet.setColumnWidth(2, 100);  // 成約率表示
    sheet.setColumnWidth(3, 120);  // 成約金額表示
    sheet.setColumnWidth(4, 130);  // 対応スピード表示
    sheet.setColumnWidth(5, 120);  // 最終更新者
    sheet.setColumnWidth(6, 140);  // 最終更新日
    
    // サンプルデータの追加
    const sampleData = [
      [
        'CHILD_001',                          // 子加盟店ID
        'ON',                                 // 成約率表示
        'ON',                                 // 成約金額表示
        'OFF',                                // 対応スピード表示
        'システム管理者',                     // 最終更新者
        new Date()                            // 最終更新日
      ],
      [
        'CHILD_002',                          // 子加盟店ID
        'OFF',                                // 成約率表示
        'ON',                                 // 成約金額表示
        'ON',                                 // 対応スピード表示
        '営業マネージャー',                   // 最終更新者
        new Date()                            // 最終更新日
      ],
      [
        'CHILD_003',                          // 子加盟店ID
        'ON',                                 // 成約率表示
        'OFF',                                // 成約金額表示
        'OFF',                                // 対応スピード表示
        'システム管理者',                     // 最終更新者
        new Date()                            // 最終更新日
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
 * 子加盟店ランキング表示設定の登録・更新
 * 
 * @param {string} childId 子加盟店ID
 * @param {string} contractRateDisplay 成約率表示（ON/OFF）
 * @param {string} contractAmountDisplay 成約金額表示（ON/OFF）
 * @param {string} responseSpeedDisplay 対応スピード表示（ON/OFF）
 * @param {string} updatedBy 最終更新者
 * @returns {Object} 設定結果
 */
function updateChildRankingVisibility(childId, contractRateDisplay, contractAmountDisplay, responseSpeedDisplay, updatedBy) {
  try {
    Logger.log(`👥 子加盟店ランキング表示設定更新開始 (子ID: ${childId})`);
    
    // 必須パラメータの検証
    if (!childId || !updatedBy) {
      throw new Error('必須パラメータが不足しています（childId, updatedBy）');
    }
    
    // 表示設定の検証とデフォルト値設定
    const validatedContractRateDisplay = validateChildDisplaySetting(contractRateDisplay, 'ON');
    const validatedContractAmountDisplay = validateChildDisplaySetting(contractAmountDisplay, 'ON');
    const validatedResponseSpeedDisplay = validateChildDisplaySetting(responseSpeedDisplay, 'ON');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 子加盟店の存在確認
    const childExists = validateChildExists(ss, childId);
    if (!childExists) {
      Logger.log(`⚠️ 子加盟店ID ${childId} が子ユーザー一覧に見つかりません（設定は保存されます）`);
    }
    
    // 設定をシートに保存
    const saveResult = saveChildVisibilityToSheet(ss, {
      childId: childId,
      contractRateDisplay: validatedContractRateDisplay,
      contractAmountDisplay: validatedContractAmountDisplay,
      responseSpeedDisplay: validatedResponseSpeedDisplay,
      updatedBy: updatedBy
    });
    
    if (!saveResult.success) {
      throw new Error(`設定保存に失敗: ${saveResult.error}`);
    }
    
    // 設定変更履歴をログに記録
    const logMessage = `[子設定更新] 子ID: ${childId}, ` +
      `成約率: ${validatedContractRateDisplay}, 金額: ${validatedContractAmountDisplay}, ` +
      `スピード: ${validatedResponseSpeedDisplay}, 更新者: ${updatedBy}, ` +
      `操作: ${saveResult.isUpdate ? '更新' : '新規'}`;
    
    fallbackChildVisibilityLog(logMessage);
    
    Logger.log('✅ 子加盟店ランキング表示設定更新完了');
    
    return {
      success: true,
      childId: childId,
      settings: {
        contractRateDisplay: validatedContractRateDisplay,
        contractAmountDisplay: validatedContractAmountDisplay,
        responseSpeedDisplay: validatedResponseSpeedDisplay
      },
      updatedBy: updatedBy,
      updatedAt: new Date(),
      isUpdate: saveResult.isUpdate,
      childExists: childExists
    };
    
  } catch (error) {
    Logger.log('❌ 子加盟店ランキング表示設定更新エラー:', error);
    fallbackChildVisibilityLog(`[子設定更新エラー] 子ID: ${childId}, エラー: ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'child_visibility_update_failed',
        message: error.message,
        childId: childId
      }
    };
  }
}

/**
 * 子加盟店ランキング表示設定の取得
 * 
 * @param {string} childId 子加盟店ID
 * @returns {Object} 設定情報
 */
function getChildRankingVisibility(childId) {
  try {
    Logger.log(`📋 子加盟店ランキング表示設定取得開始 (子ID: ${childId})`);
    
    if (!childId) {
      throw new Error('子加盟店IDが必要です');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const visibilitySheet = ss.getSheetByName('子ランキング表示設定');
    
    if (!visibilitySheet) {
      throw new Error('子ランキング表示設定シートが見つかりません');
    }
    
    const dataRange = visibilitySheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const childIdColIndex = headers.indexOf('子加盟店ID');
    const contractRateColIndex = headers.indexOf('成約率表示');
    const contractAmountColIndex = headers.indexOf('成約金額表示');
    const responseSpeedColIndex = headers.indexOf('対応スピード表示');
    const updatedByColIndex = headers.indexOf('最終更新者');
    const updatedDateColIndex = headers.indexOf('最終更新日');
    
    // 該当する設定を検索
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[childIdColIndex] === childId) {
        const config = {
          childId: childId,
          contractRateDisplay: row[contractRateColIndex] || 'OFF',
          contractAmountDisplay: row[contractAmountColIndex] || 'OFF',
          responseSpeedDisplay: row[responseSpeedColIndex] || 'OFF',
          updatedBy: row[updatedByColIndex] || '不明',
          updatedDate: row[updatedDateColIndex] || null
        };
        
        Logger.log('✅ 子加盟店ランキング表示設定取得完了');
        
        return {
          success: true,
          config: config
        };
      }
    }
    
    // 設定が見つからない場合はデフォルト設定を返す
    const defaultConfig = {
      childId: childId,
      contractRateDisplay: 'OFF',
      contractAmountDisplay: 'OFF',
      responseSpeedDisplay: 'OFF',
      updatedBy: 'システムデフォルト',
      updatedDate: null
    };
    
    Logger.log('⚠️ 設定が見つかりません。デフォルト設定を返します');
    
    return {
      success: true,
      config: defaultConfig,
      isDefault: true
    };
    
  } catch (error) {
    Logger.log('❌ 子加盟店ランキング表示設定取得エラー:', error);
    
    return {
      success: false,
      error: {
        type: 'child_visibility_get_failed',
        message: error.message,
        childId: childId
      }
    };
  }
}

/**
 * 全子加盟店ランキング表示設定の一覧取得
 * 
 * @returns {Object} 設定一覧
 */
function getAllChildRankingVisibilities() {
  try {
    Logger.log('📋 全子加盟店ランキング表示設定一覧取得開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const visibilitySheet = ss.getSheetByName('子ランキング表示設定');
    
    if (!visibilitySheet) {
      throw new Error('子ランキング表示設定シートが見つかりません');
    }
    
    const dataRange = visibilitySheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const configs = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const config = {
        childId: row[0] || '',
        contractRateDisplay: row[1] || 'OFF',
        contractAmountDisplay: row[2] || 'OFF',
        responseSpeedDisplay: row[3] || 'OFF',
        updatedBy: row[4] || '不明',
        updatedDate: row[5] || null
      };
      
      if (config.childId) {
        configs.push(config);
      }
    }
    
    Logger.log('✅ 全子加盟店ランキング表示設定一覧取得完了');
    
    return {
      success: true,
      configs: configs,
      totalCount: configs.length
    };
    
  } catch (error) {
    Logger.log('❌ 全子加盟店ランキング表示設定一覧取得エラー:', error);
    
    return {
      success: false,
      error: {
        type: 'child_visibilities_get_failed',
        message: error.message
      }
    };
  }
}

/**
 * 子加盟店の存在確認
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {string} childId 子加盟店ID
 * @returns {boolean} 存在するかどうか
 */
function validateChildExists(ss, childId) {
  try {
    const childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childUsersSheet) return false;
    
    const dataRange = childUsersSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const childIdColIndex = headers.indexOf('子ユーザーID');
    if (childIdColIndex === -1) return false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][childIdColIndex] === childId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('❌ 子加盟店存在確認エラー:', error);
    return false;
  }
}

/**
 * 表示設定の検証
 * 
 * @param {string} value 設定値
 * @param {string} defaultValue デフォルト値
 * @returns {string} 検証済み設定値
 */
function validateChildDisplaySetting(value, defaultValue = 'OFF') {
  if (!value || typeof value !== 'string') {
    return defaultValue;
  }
  
  const upperValue = value.toUpperCase();
  if (['ON', 'OFF'].includes(upperValue)) {
    return upperValue;
  }
  
  // boolean型の場合の変換
  if (value === true || value === 'true') {
    return 'ON';
  }
  
  if (value === false || value === 'false') {
    return 'OFF';
  }
  
  return defaultValue;
}

/**
 * 子加盟店ランキング表示設定をシートに保存
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {Object} visibilityData 表示設定データ
 * @returns {Object} 保存結果
 */
function saveChildVisibilityToSheet(ss, visibilityData) {
  try {
    const visibilitySheet = ss.getSheetByName('子ランキング表示設定');
    if (!visibilitySheet) {
      throw new Error('子ランキング表示設定シートが見つかりません');
    }
    
    const dataRange = visibilitySheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const childIdColIndex = headers.indexOf('子加盟店ID');
    
    // 既存レコードの確認と更新
    for (let i = 1; i < data.length; i++) {
      if (data[i][childIdColIndex] === visibilityData.childId) {
        // 既存レコードを更新
        const updateRow = [
          visibilityData.childId,                   // 子加盟店ID
          visibilityData.contractRateDisplay,       // 成約率表示
          visibilityData.contractAmountDisplay,     // 成約金額表示
          visibilityData.responseSpeedDisplay,      // 対応スピード表示
          visibilityData.updatedBy,                 // 最終更新者
          new Date()                                // 最終更新日
        ];
        
        visibilitySheet.getRange(i + 1, 1, 1, updateRow.length).setValues([updateRow]);
        
        Logger.log(`✅ 子加盟店ランキング表示設定更新完了: ${visibilityData.childId}`);
        
        return { success: true, isUpdate: true };
      }
    }
    
    // 新規レコード追加
    const newRow = [
      visibilityData.childId,                   // 子加盟店ID
      visibilityData.contractRateDisplay,       // 成約率表示
      visibilityData.contractAmountDisplay,     // 成約金額表示
      visibilityData.responseSpeedDisplay,      // 対応スピード表示
      visibilityData.updatedBy,                 // 最終更新者
      new Date()                                // 最終更新日
    ];
    
    visibilitySheet.appendRow(newRow);
    
    Logger.log(`✅ 子加盟店ランキング表示設定新規作成完了: ${visibilityData.childId}`);
    
    return { success: true, isUpdate: false };
    
  } catch (error) {
    Logger.log('❌ 子加盟店ランキング表示設定保存エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * フォールバックログ記録（子加盟店ランキング表示設定システム専用）
 * 
 * @param {string} message ログメッセージ
 */
function fallbackChildVisibilityLog(message) {
  try {
    Logger.log(`📝 子加盟店ランキング表示設定システムログ: ${message}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('システムログ');
      logSheet.getRange(1, 1, 1, 4).setValues([['日時', 'システム', 'メッセージ', 'レベル']]);
    }
    
    logSheet.appendRow([new Date(), '子加盟店ランキング表示設定システム', message, 'INFO']);
    
  } catch (e) {
    Logger.log(`ログ記録エラー: ${e.message}`);
  }
}

/**
 * 子加盟店ランキング表示設定システムのテスト（模擬実行）
 */
function testChildRankingVisibilitySystem() {
  Logger.log('🧪 子加盟店ランキング表示設定システム模擬テスト開始');
  
  try {
    // 1. 初期化テスト
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeChildRankingVisibilitySystem();
    Logger.log('初期化結果:', initResult);
    
    // 2. 設定登録テスト（新規）
    Logger.log('--- 設定登録テスト（新規）---');
    const createResult = updateChildRankingVisibility(
      'TEST_CHILD_001',
      'ON',
      'OFF',
      'ON',
      'テスト管理者'
    );
    Logger.log('設定登録結果（新規）:', createResult);
    
    // 3. 設定更新テスト（既存）
    Logger.log('--- 設定更新テスト（既存）---');
    const updateResult = updateChildRankingVisibility(
      'TEST_CHILD_001',
      'OFF',
      'ON',
      'OFF',
      'テスト更新者'
    );
    Logger.log('設定更新結果（既存）:', updateResult);
    
    // 4. 単一設定取得テスト
    Logger.log('--- 単一設定取得テスト ---');
    const getResult = getChildRankingVisibility('TEST_CHILD_001');
    Logger.log('単一設定取得結果:', getResult);
    
    // 5. 全設定取得テスト
    Logger.log('--- 全設定取得テスト ---');
    const getAllResult = getAllChildRankingVisibilities();
    Logger.log('全設定取得結果:', getAllResult);
    
    // 6. 異常系テスト（空ID）
    Logger.log('--- 異常系テスト（空ID）---');
    const errorResult = updateChildRankingVisibility('', 'ON', 'ON', 'ON', '');
    Logger.log('異常系テスト結果:', errorResult);
    
    // 7. 存在しない子ID取得テスト
    Logger.log('--- 存在しない子ID取得テスト ---');
    const notFoundResult = getChildRankingVisibility('NONEXISTENT_CHILD');
    Logger.log('存在しない子ID取得結果:', notFoundResult);
    
    Logger.log('✅ 子加盟店ランキング表示設定システム模擬テスト完了');
    
    // テスト結果サマリー
    const testSummary = {
      initialization: initResult.success,
      settingCreate: createResult.success,
      settingUpdate: updateResult.success,
      settingGet: getResult.success,
      getAllSettings: getAllResult.success,
      errorHandling: !errorResult.success, // エラーケースは失敗が正常
      defaultSettingHandling: notFoundResult.success, // デフォルト設定取得は成功が正常
      totalTests: 7,
      successfulTests: [initResult, createResult, updateResult, getResult, getAllResult, notFoundResult].filter(r => r.success).length
    };
    
    Logger.log('📊 テスト結果サマリー:', testSummary);
    
    return {
      success: true,
      summary: testSummary,
      testResults: {
        initialization: initResult,
        settingCreate: createResult,
        settingUpdate: updateResult,
        settingGet: getResult,
        getAllSettings: getAllResult,
        errorCase: errorResult,
        notFoundCase: notFoundResult
      }
    };
    
  } catch (error) {
    Logger.log('❌ 子加盟店ランキング表示設定システム模擬テストエラー:', error);
    fallbackChildVisibilityLog(`[システムテスト] ${error.message}`);
    throw error;
  }
}