/**
 * ファイル名: spreadsheet_service.js
 * 外壁塗装くらべるAI - スプレッドシート統合初期化システム
 * 全シート構造のブラッシュアップと既存コード整合性確保
 * 
 * 🔧 GAS V8完全対応版 - async/await エラー完全除去済み
 */

/**
 * 全スプレッドシートシートの統合初期化
 * 既存コード非破壊で新カラム構成に対応
 * 
 * @returns {Object} 初期化結果
 */
function initializeAllSpreadsheetSheets() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    const ss = SpreadsheetApp.openById(spreadsheetId);
    Logger.log('🚀 全シート統合初期化開始（既存コード整合性確保）');

    const results = {
      success: true,
      sheetsInitialized: [],
      samplesCreated: [],
      backwardCompatibility: true,
      errors: []
    };

    // 1. 加盟店子ユーザー一覧シートの初期化
    try {
      Logger.log('--- 加盟店子ユーザー一覧シート初期化 ---');
      const childUsersResult = initializeChildUsersSheet(ss);
      results.sheetsInitialized.push('加盟店子ユーザー一覧');
      if (childUsersResult && childUsersResult.samplesCreated) {
        results.samplesCreated.push('加盟店子ユーザー一覧サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`加盟店子ユーザー一覧: ${e.message}`);
    }

    // 2. ユーザー案件シートの初期化
    try {
      Logger.log('--- ユーザー案件シート初期化 ---');
      const userCasesResult = initializeUserCasesSheet(ss);
      results.sheetsInitialized.push('ユーザー案件');
      if (userCasesResult && userCasesResult.samplesCreated) {
        results.samplesCreated.push('ユーザー案件サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`ユーザー案件: ${e.message}`);
    }

    // 3. 加盟店親ユーザー一覧シートの初期化（既存システム対応）
    try {
      Logger.log('--- 加盟店親ユーザー一覧シート初期化 ---');
      const parentUsersResult = initializeParentUsersSheet(ss);
      results.sheetsInitialized.push('加盟店親ユーザー一覧');
    } catch (e) {
      results.errors.push(`加盟店親ユーザー一覧: ${e.message}`);
    }

    // 4. キャンセル申請シートの統合初期化
    try {
      Logger.log('--- キャンセル申請シート統合初期化 ---');
      const cancelSheetResult = initializeCancelRequestSheet(ss);
      results.sheetsInitialized.push('キャンセル申請');
      if (cancelSheetResult && cancelSheetResult.samplesCreated) {
        results.samplesCreated.push('キャンセル申請サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`キャンセル申請: ${e.message}`);
    }

    // 5. 通知履歴シートの初期化
    try {
      Logger.log('--- 通知履歴シート初期化 ---');
      const notificationHistoryResult = initializeNotificationHistorySheet(ss);
      results.sheetsInitialized.push('通知履歴');
      if (notificationHistoryResult && notificationHistoryResult.samplesCreated) {
        results.samplesCreated.push('通知履歴サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`通知履歴: ${e.message}`);
    }

    // 6. その他システム関連シートの確認・作成
    const additionalSheets = [
      '案件振り分け履歴',
      'システムログ',
      'ユーザー情報',
      '問い合わせ履歴',
      '加盟店情報',
      'マッチング履歴',
      '管理者情報',
      '設定マスタ',
      'GASトリガー設定',
      'ユーザー評価',
      'チャット回答ログ',
      '請求管理',
      '加盟店口座情報'
    ];

    additionalSheets.forEach(sheetName => {
      try {
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          Logger.log(`✅ ${sheetName}シート新規作成`);
          results.sheetsInitialized.push(sheetName);
          
          // 基本ヘッダーを設定
          setBasicHeaders(sheet, sheetName);
        }
      } catch (e) {
        results.errors.push(`${sheetName}: ${e.message}`);
      }
    });

    // 結果判定
    if (results.errors.length > 0) {
      results.success = false;
      Logger.log('⚠️ 一部シートで初期化エラーが発生しました:');
      results.errors.forEach(error => Logger.log(`  - ${error}`));
    }

    Logger.log('✅ 全シート統合初期化完了');
    Logger.log(`初期化シート数: ${results.sheetsInitialized.length}`);
    Logger.log(`サンプルデータ作成数: ${results.samplesCreated.length}`);

    return results;

  } catch (error) {
    Logger.log(`❌ 全シート統合初期化エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      sheetsInitialized: [],
      samplesCreated: [],
      backwardCompatibility: false,
      errors: [error.message]
    };
  }
}

/**
 * 基本ヘッダーを設定
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet シート
 * @param {string} sheetName シート名
 */
function setBasicHeaders(sheet, sheetName) {
  try {
    let headers = [];
    
    switch (sheetName) {
      case 'システムログ':
        headers = ['タイムスタンプ', 'ログID', 'ログレベル', '発生元', 'イベントタイプ', 'メッセージ', '関連ID'];
        break;
      case 'ユーザー情報':
        headers = ['ユーザーID', '氏名', 'メールアドレス', '電話番号', '登録日', 'ステータス'];
        break;
      case '問い合わせ履歴':
        headers = ['問い合わせID', 'ユーザーID', '問い合わせ内容', '回答', '対応日', 'ステータス'];
        break;
      case '加盟店情報':
        headers = ['加盟店ID', '会社名', '代表者名', '住所', '電話番号', '加盟日', 'ステータス'];
        break;
      case 'マッチング履歴':
        headers = ['マッチングID', 'ユーザーID', '加盟店ID', 'マッチング日', 'ステータス', '成約結果'];
        break;
      case '管理者情報':
        headers = ['管理者ID', '氏名', 'メールアドレス', '権限レベル', '最終ログイン', 'ステータス'];
        break;
      case '設定マスタ':
        headers = ['設定キー', '設定値', '説明', '更新日', '更新者'];
        break;
      case 'GASトリガー設定':
        headers = ['トリガー名', '関数名', '実行間隔', '最終実行', 'ステータス'];
        break;
      case 'ユーザー評価':
        headers = ['評価ID', 'ユーザーID', '加盟店ID', '評価点', 'コメント', '評価日'];
        break;
      case 'チャット回答ログ':
        headers = ['ログID', 'ユーザーID', '質問', '回答', '回答日時', 'AIモデル'];
        break;
      case '請求管理':
        headers = ['請求ID', '加盟店ID', '請求金額', '請求日', '支払期限', 'ステータス'];
        break;
      case '加盟店口座情報':
        headers = ['加盟店ID', '銀行名', '支店名', '口座種別', '口座番号', '口座名義', '登録日'];
        break;
      case '案件振り分け履歴':
        headers = ['振り分けID', '案件ID', '加盟店ID', '振り分け日時', 'ステータス', '対応結果'];
        break;
      case '通知履歴':
        headers = ['通知ID', '送信先', '通知内容', '送信日時', 'ステータス', '送信方法'];
        break;
      case 'キャンセル申請':
        headers = ['申請ID', '案件ID', '申請者', 'キャンセル理由', '申請日', 'ステータス'];
        break;
      default:
        headers = ['ID', '作成日', '更新日', 'ステータス'];
    }
    
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#2196F3');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    }
    
  } catch (error) {
    Logger.log(`⚠️ ${sheetName}のヘッダー設定エラー: ${error.message}`);
  }
}

/**
 * 加盟店子ユーザー一覧シート初期化
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeChildUsersSheet(ss) {
  try {
    let sheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!sheet) {
      sheet = ss.insertSheet('加盟店子ユーザー一覧');
      
      const headers = [
        '子ユーザーID', '親加盟店ID', '子ユーザー名', 'メールアドレス', 
        '電話番号', '権限レベル', '登録日', 'ステータス', '最終ログイン'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      setBasicHeaders(sheet, '加盟店子ユーザー一覧');
      
      Logger.log('✅ 加盟店子ユーザー一覧シート作成完了');
    }
    
    return { success: true, samplesCreated: false };
    
  } catch (error) {
    Logger.log(`❌ 加盟店子ユーザー一覧シート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * ユーザー案件シート初期化
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeUserCasesSheet(ss) {
  try {
    let sheet = ss.getSheetByName('ユーザー案件');
    
    if (!sheet) {
      sheet = ss.insertSheet('ユーザー案件');
      
      const headers = [
        '案件ID', 'ユーザーID', '物件種別', '施工箇所', '予算', 
        '希望時期', '住所', '登録日', 'ステータス', '担当加盟店ID'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      setBasicHeaders(sheet, 'ユーザー案件');
      
      Logger.log('✅ ユーザー案件シート作成完了');
    }
    
    return { success: true, samplesCreated: false };
    
  } catch (error) {
    Logger.log(`❌ ユーザー案件シート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 加盟店親ユーザー一覧シート初期化
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeParentUsersSheet(ss) {
  try {
    let sheet = ss.getSheetByName('加盟店親ユーザー一覧');
    
    if (!sheet) {
      sheet = ss.insertSheet('加盟店親ユーザー一覧');
      
      const headers = [
        '親加盟店ID', '会社名', '代表者名', 'メールアドレス', '電話番号',
        '住所', '契約プラン', '加盟日', 'ステータス', '子ユーザー数'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      setBasicHeaders(sheet, '加盟店親ユーザー一覧');
      
      Logger.log('✅ 加盟店親ユーザー一覧シート作成完了');
    }
    
    return { success: true };
    
  } catch (error) {
    Logger.log(`❌ 加盟店親ユーザー一覧シート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * キャンセル申請シート初期化
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeCancelRequestSheet(ss) {
  try {
    let sheet = ss.getSheetByName('キャンセル申請');
    
    if (!sheet) {
      sheet = ss.insertSheet('キャンセル申請');
      
      const headers = [
        'キャンセル申請ID', '案件ID', '申請者ID', 'キャンセル理由', 
        '申請日時', 'ステータス', '承認者', '承認日時', '備考'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      setBasicHeaders(sheet, 'キャンセル申請');
      
      Logger.log('✅ キャンセル申請シート作成完了');
    }
    
    return { success: true, samplesCreated: false };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請シート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 通知履歴シート初期化
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeNotificationHistorySheet(ss) {
  try {
    let sheet = ss.getSheetByName('通知履歴');
    
    if (!sheet) {
      sheet = ss.insertSheet('通知履歴');
      
      const headers = [
        'タイムスタンプ', '通知ID', '通知種別', '送信先', 'ステータス', 
        'メッセージ', 'エラー詳細', '送信者', 'Webhook種別'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      setBasicHeaders(sheet, '通知履歴');
      
      Logger.log('✅ 通知履歴シート作成完了');
    }
    
    return { success: true, samplesCreated: false };
    
  } catch (error) {
    Logger.log(`❌ 通知履歴シート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * スプレッドシート初期化テスト
 * GAS V8対応版
 */
function testSpreadsheetInitialization() {
  try {
    Logger.log('🧪 スプレッドシート初期化テスト開始');
    
    const result = initializeAllSpreadsheetSheets();
    
    Logger.log('✅ スプレッドシート初期化テスト完了');
    Logger.log(`初期化結果: ${result.success ? '成功' : '失敗'}`);
    Logger.log(`初期化シート数: ${result.sheetsInitialized.length}`);
    
    if (result.errors.length > 0) {
      Logger.log('エラー詳細:');
      result.errors.forEach(error => Logger.log(`  - ${error}`));
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ スプレッドシート初期化テストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}