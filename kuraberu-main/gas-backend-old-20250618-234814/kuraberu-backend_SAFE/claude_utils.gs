/**
 * 📂 ファイル名: claude_utils.gs
 * 🎯 内容: 外壁塗装くらべるAI - Claude Code共通ユーティリティ関数（拡張版）
 * - getColumnIndex_()のフェールセーフ強化・共通処理
 * - 安全なシート・データ取得機能
 * - スクリプトプロパティ整合性検証機能
 * ✅ claude_checkScriptProperties() によりプロパティ検証が可能
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * 強化版getColumnIndex_() - フェールセーフ・近似候補提案付き
 * 
 * @param {Array} headers ヘッダー行配列
 * @param {string} columnName 検索対象カラム名
 * @param {string} sheetName シート名（エラー時の詳細情報用）
 * @returns {number} カラムインデックス（0ベース）
 * @throws {Error} カラム未検出時
 */
function getColumnIndex_(headers, columnName, sheetName = '不明') {
  try {
    const exactIndex = headers.indexOf(columnName);
    if (exactIndex !== -1) {
      return exactIndex;
    }
    
    const normalizedTarget = columnName.trim().toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      const normalizedHeader = String(headers[i]).trim().toLowerCase();
      if (normalizedHeader === normalizedTarget) {
        console.warn(`カラム名の大小文字・空白違い検出: "${headers[i]}" → "${columnName}"`);
        return i;
      }
    }
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]);
      if (header.includes(columnName) || columnName.includes(header)) {
        console.warn(`カラム名の部分一致検出: "${header}" ≈ "${columnName}"`);
        return i;
      }
    }
    
    const similarColumn = findSimilarColumn_(columnName, headers);
    const suggestion = similarColumn ? `もしかして「${similarColumn}」？` : '類似カラムなし';
    
    const errorDetails = `
📛 カラム検索失敗
対象シート: ${sheetName}
検索カラム: 「${columnName}」
利用可能カラム: ${headers.join(', ')}
近似候補: ${suggestion}

💡 対処法:
1. sheets_structure.md の列名定義を確認
2. スプレッドシートのヘッダー行を確認
3. claude_verifySheetColumns() で事前検証を実行`;
    
    throw new Error(errorDetails);
    
  } catch (error) {
    console.error('getColumnIndex_エラー:', error.toString());
    throw error;
  }
}

/**
 * 安全なシート取得 - 存在チェック付き
 * 
 * @param {string} sheetName シート名
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} シートオブジェクト
 * @throws {Error} シート未検出時
 */
function getSheetByName_(sheetName) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        const availableSheets = ss.getSheets().map(s => s.getName()).join(', ');
        throw new Error(`📛 シート未検出: 「${sheetName}」
利用可能シート: ${availableSheets}

💡 対処法:
1. シート名の確認（大小文字・空白に注意）
2. sheets_structure.md の定義確認
3. スプレッドシートの実際のシート名確認`);
      }
      
      return sheet;
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      const availableSheets = ss.getSheets().map(s => s.getName()).join(', ');
      throw new Error(`📛 シート未検出: 「${sheetName}」
利用可能シート: ${availableSheets}

💡 対処法:
1. シート名の確認（大小文字・空白に注意）
2. sheets_structure.md の定義確認
3. スプレッドシートの実際のシート名確認`);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('getSheetByName_エラー:', error.toString());
    throw error;
  }
}

/**
 * 安全なデータ取得 - 空チェック付き
 * 
 * @param {string} sheetName シート名
 * @param {Array<string>} requiredColumns 必須カラム名（任意）
 * @returns {Object} {data: 全データ, headers: ヘッダー行, rows: データ行}
 */
function claude_getSafeSheetData(sheetName, requiredColumns = []) {
  try {
    console.log(`安全なデータ取得開始: ${sheetName}`);
    
    if (requiredColumns.length > 0) {
      claude_verifySheetColumns(sheetName, requiredColumns);
    }
    
    const sheet = getSheetByName_(sheetName);
    const dataRange = sheet.getDataRange();
    
    if (dataRange.getNumRows() === 0) {
      console.warn(`データなし: ${sheetName}`);
      return { data: [], headers: [], rows: [] };
    }
    
    const allData = dataRange.getValues();
    const headers = allData[0];
    const rows = allData.slice(1);
    
    console.log(`データ取得成功: ${sheetName} (${rows.length}行)`);
    
    return {
      data: allData,
      headers: headers,
      rows: rows
    };
    
  } catch (error) {
    console.error(`安全なデータ取得エラー: ${sheetName}`, error.toString());
    throw error;
  }
}

/**
 * カラムインデックスマップ生成
 * 
 * @param {Array} headers ヘッダー行
 * @param {Array<string>} columnNames 必要なカラム名配列
 * @param {string} sheetName シート名
 * @returns {Object} {カラム名: インデックス}
 */
function claude_getColumnIndexMap(headers, columnNames, sheetName = '不明') {
  try {
    const indexMap = {};
    
    for (const columnName of columnNames) {
      indexMap[columnName] = getColumnIndex_(headers, columnName, sheetName);
    }
    
    console.log(`カラムインデックスマップ生成完了: ${sheetName}`, indexMap);
    return indexMap;
    
  } catch (error) {
    console.error(`カラムインデックスマップ生成エラー: ${sheetName}`, error.toString());
    throw error;
  }
}

/**
 * 行データを連想配列に変換
 * 
 * @param {Array} headers ヘッダー行
 * @param {Array} row データ行
 * @returns {Object} {カラム名: 値}
 */
function claude_rowToObject(headers, row) {
  try {
    const obj = {};
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = i < row.length ? row[i] : '';
      obj[header] = value;
    }
    
    return obj;
    
  } catch (error) {
    console.error('行データ変換エラー:', error.toString());
    throw error;
  }
}

/**
 * 複数行データを連想配列に変換
 * 
 * @param {Array} headers ヘッダー行
 * @param {Array<Array>} rows データ行配列
 * @returns {Array<Object>} 連想配列の配列
 */
function claude_rowsToObjects(headers, rows) {
  try {
    return rows.map(row => claude_rowToObject(headers, row));
    
  } catch (error) {
    console.error('複数行データ変換エラー:', error.toString());
    throw error;
  }
}

/**
 * 安全な値取得 - 空値・エラーハンドリング付き
 * 
 * @param {Array} row データ行
 * @param {number} index カラムインデックス
 * @param {any} defaultValue デフォルト値
 * @returns {any} 取得した値またはデフォルト値
 */
function claude_getSafeValue(row, index, defaultValue = '') {
  try {
    if (!Array.isArray(row) || index < 0 || index >= row.length) {
      return defaultValue;
    }
    
    const value = row[index];
    return (value === null || value === undefined || value === '') ? defaultValue : value;
    
  } catch (error) {
    console.error('安全な値取得エラー:', error.toString());
    return defaultValue;
  }
}

/**
 * システムログ記録ヘルパー
 * 
 * @param {string} level ログレベル（INFO, WARNING, ERROR, DEBUG）
 * @param {string} source 発生元
 * @param {string} eventType イベントタイプ
 * @param {string} message メッセージ
 * @param {string} relatedId 関連ID（任意）
 */
function claude_logEvent(level, source, eventType, message, relatedId = '') {
  try {
    const logSheet = getSheetByName_('システムログ');
    const headers = logSheet.getDataRange().getValues()[0];
    
    const now = new Date();
    const logId = `LOG-${String(now.getTime()).slice(-10)}`;
    const timestamp = now.toLocaleString('ja-JP');
    
    const logData = [];
    for (let i = 0; i < headers.length; i++) {
      logData.push('');
    }
    
    const indexMap = claude_getColumnIndexMap(headers, [
      'ログID', 'タイムスタンプ', 'ログレベル', '発生元',
      'イベントタイプ', 'メッセージ', '関連ID'
    ], 'システムログ');
    
    logData[indexMap['ログID']] = logId;
    logData[indexMap['タイムスタンプ']] = timestamp;
    logData[indexMap['ログレベル']] = level;
    logData[indexMap['発生元']] = source;
    logData[indexMap['イベントタイプ']] = eventType;
    logData[indexMap['メッセージ']] = message;
    logData[indexMap['関連ID']] = relatedId;
    
    logSheet.appendRow(logData);
    
    console.log(`システムログ記録: ${level} - ${eventType}`);
    
  } catch (error) {
    console.error('システムログ記録エラー:', error.toString());
  }
}

/**
 * パフォーマンス測定ヘルパー
 * 
 * @param {string} operationName 操作名
 * @param {Function} operation 実行する関数
 * @returns {any} 関数の戻り値
 */
function claude_measurePerformance(operationName, operation) {
  try {
    const startTime = new Date().getTime();
    console.log(`⏱️ パフォーマンス測定開始: ${operationName}`);
    
    const result = operation();
    
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    
    console.log(`⏱️ パフォーマンス測定完了: ${operationName} (${duration}ms)`);
    claude_logEvent('INFO', 'パフォーマンス測定', operationName, `実行時間: ${duration}ms`);
    
    return result;
    
  } catch (error) {
    console.error(`パフォーマンス測定エラー: ${operationName}`, error.toString());
    claude_logEvent('ERROR', 'パフォーマンス測定', operationName, `エラー: ${error.toString()}`);
    throw error;
  }
}

/**
 * スクリプトプロパティ整合性検証
 * 必須プロパティの存在確認とシステム安全性向上
 * 
 * @returns {Object} 検証結果
 * @throws {Error} 必須プロパティが不足している場合
 */
function claude_checkScriptProperties() {
  try {
    console.log('🔒 スクリプトプロパティ整合性検証開始');
    
    const requiredProperties = [
      'SPREADSHEET_ID',
      'SENDGRID_API_KEY', 
      'LINE_NOTIFY_TOKEN',
      'SLACK_WEBHOOK_URL',
      'GPT_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN'
    ];
    
    const aliasMap = {
      SENDGRID_API_KEY: 'SENDGRID_KEY',
      GPT_API_KEY: 'OPENAI_API_KEY',
      LINE_NOTIFY_TOKEN: 'LINE_ACCESS_TOKEN'
    };
    
    const properties = PropertiesService.getScriptProperties();
    const missingProperties = [];
    const existingProperties = [];
    const emptyProperties = [];
    
    requiredProperties.forEach(key => {
      let value = properties.getProperty(key);
      let actualKey = key;
      
      if ((value === null || value === undefined) && aliasMap[key]) {
        value = properties.getProperty(aliasMap[key]);
        if (value !== null && value !== undefined) {
          actualKey = aliasMap[key];
        }
      }
      
      if (value === null || value === undefined) {
        missingProperties.push(key);
      } else if (value.trim() === '') {
        emptyProperties.push(key);
        existingProperties.push(`${key}(${actualKey})`);
      } else {
        existingProperties.push(`${key}(${actualKey})`);
      }
    });
    
    if (missingProperties.length > 0 || emptyProperties.length > 0) {
      let errorMessage = '🚨 スクリプトプロパティ設定エラー\n\n';
      
      if (missingProperties.length > 0) {
        errorMessage += `❌ 未設定プロパティ (${missingProperties.length}件):\n`;
        missingProperties.forEach(key => {
          errorMessage += `  - ${key}\n`;
        });
        errorMessage += '\n';
      }
      
      if (emptyProperties.length > 0) {
        errorMessage += `⚠️ 空値プロパティ (${emptyProperties.length}件):\n`;
        emptyProperties.forEach(key => {
          errorMessage += `  - ${key}\n`;
        });
        errorMessage += '\n';
      }
      
      errorMessage += `✅ 正常設定済み: ${existingProperties.length - emptyProperties.length}件\n`;
      errorMessage += `📊 設定完了率: ${Math.round(((existingProperties.length - emptyProperties.length) / requiredProperties.length) * 100)}%\n\n`;
      
      errorMessage += '💡 対処法:\n';
      errorMessage += '1. GASエディタ → プロジェクトの設定 → スクリプト プロパティ\n';
      errorMessage += '2. 上記の未設定・空値プロパティを追加・修正してください\n';
      errorMessage += '3. 各APIキーは対応するサービスから取得してください';
      
      claude_logEvent(
        'ERROR',
        'スクリプトプロパティ検証',
        'プロパティ不足',
        `未設定: ${missingProperties.join(', ')}, 空値: ${emptyProperties.join(', ')}`
      );
      
      throw new Error(errorMessage);
    }
    
    console.log('✅ スクリプトプロパティチェック成功');
    console.log(`📊 設定確認済み: ${existingProperties.length}/${requiredProperties.length}件`);
    
    claude_logEvent(
      'INFO',
      'スクリプトプロパティ検証',
      'プロパティ正常',
      `全 ${requiredProperties.length}件のプロパティが正常に設定済み`
    );
    
    return {
      success: true,
      totalProperties: requiredProperties.length,
      existingProperties: existingProperties.length,
      missingProperties: 0,
      emptyProperties: 0,
      completionRate: 100
    };
    
  } catch (error) {
    console.error('スクリプトプロパティ検証エラー:', error.toString());
    
    if (!error.message.includes('スクリプトプロパティ設定エラー')) {
      claude_logEvent('ERROR', 'スクリプトプロパティ検証', 'システムエラー', error.toString());
    }
    
    throw error;
  }
}

/**
 * 現在のスクリプトプロパティ状態を確認（デバッグ用）
 * 機密情報は表示せず、設定状況のみを確認
 * 
 * @returns {boolean} 確認成功可否
 */
function claude_debugScriptProperties() {
  try {
    console.log('🔍 現在のスクリプトプロパティ状態確認');
    
    const requiredProperties = [
      'SPREADSHEET_ID',
      'SENDGRID_API_KEY', 
      'LINE_NOTIFY_TOKEN',
      'SLACK_WEBHOOK_URL',
      'GPT_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN'
    ];
    
    const aliasMap = {
      SENDGRID_API_KEY: 'SENDGRID_KEY',
      GPT_API_KEY: 'OPENAI_API_KEY',
      LINE_NOTIFY_TOKEN: 'LINE_ACCESS_TOKEN'
    };
    
    const properties = PropertiesService.getScriptProperties();
    
    console.log('📋 必須プロパティ状態 (alias対応):');
    requiredProperties.forEach(key => {
      let value = properties.getProperty(key);
      let actualKey = key;
      let isAlias = false;
      
      if ((value === null || value === undefined) && aliasMap[key]) {
        value = properties.getProperty(aliasMap[key]);
        if (value !== null && value !== undefined) {
          actualKey = aliasMap[key];
          isAlias = true;
        }
      }
      
      let status;
      if (value === null || value === undefined) {
        status = '❌ 未定義';
        if (aliasMap[key]) {
          status += ` (${key} または ${aliasMap[key]} が必要)`;
        }
      } else if (value.trim() === '') {
        status = '⚠️ 空値';
      } else {
        status = `✅ 設定済み (${value.length}文字)`;
      }
      
      const displayKey = isAlias ? `${key} → ${actualKey}` : key;
      console.log(`  ${displayKey}: ${status}`);
    });
    
    console.log('\n🔍 その他設定済みプロパティ:');
    const allAliases = Object.values(aliasMap);
    const otherProperties = ['LINE_TOKEN', 'TWILIO_SID', 'TWILIO_TOKEN'];
    [...allAliases, ...otherProperties].forEach(key => {
      const value = properties.getProperty(key);
      if (value !== null && value !== undefined && value.trim() !== '') {
        const isUsedAsAlias = Object.entries(aliasMap).some(([, alias]) => alias === key);
        if (!isUsedAsAlias) {
          console.log(`  ${key}: ✅ 設定済み (${value.length}文字) - ※別用途`);
        }
      }
    });
    
    return true;
    
  } catch (error) {
    console.error('スクリプトプロパティ状態確認エラー:', error.toString());
    return false;
  }
}

/**
 * 類似カラム名検索（レーベンシュタイン距離ベース）
 * 
 * @param {string} target 検索対象カラム名
 * @param {Array<string>} candidates 候補カラム名配列
 * @returns {string|null} 最も類似するカラム名
 */
function findSimilarColumn_(target, candidates) {
  try {
    let bestMatch = null;
    let bestScore = Infinity;
    const threshold = Math.ceil(target.length * 0.3);
    
    for (const candidate of candidates) {
      const distance = levenshteinDistance_(target, candidate);
      if (distance < bestScore && distance <= threshold) {
        bestScore = distance;
        bestMatch = candidate;
      }
    }
    
    return bestMatch;
    
  } catch (error) {
    console.error('類似カラム名検索エラー:', error.toString());
    return null;
  }
}

/**
 * レーベンシュタイン距離計算
 * 
 * @param {string} a 文字列A
 * @param {string} b 文字列B
 * @returns {number} 編集距離
 */
function levenshteinDistance_(a, b) {
  try {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
    
  } catch (error) {
    console.error('レーベンシュタイン距離計算エラー:', error.toString());
    return Infinity;
  }
}

/**
 * Claude共通ユーティリティ拡張版のテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testClaudeUtilsExtendedSystem() {
  console.log('🧪 Claude共通ユーティリティ拡張版テスト開始');
  
  try {
    const testResults = [];
    
    console.log('--- スクリプトプロパティ検証テスト ---');
    try {
      const propCheck = claude_checkScriptProperties();
      testResults.push({ 
        name: 'スクリプトプロパティ検証', 
        success: propCheck.success, 
        details: `設定完了率: ${propCheck.completionRate}%`
      });
    } catch (e) {
      testResults.push({ 
        name: 'スクリプトプロパティ検証', 
        success: false, 
        details: `エラー: ${e.message.split('\n')[0]}`
      });
    }
    
    console.log('--- スクリプトプロパティデバッグテスト ---');
    try {
      const debugResult = claude_debugScriptProperties();
      testResults.push({ 
        name: 'スクリプトプロパティデバッグ', 
        success: debugResult, 
        details: 'プロパティ状態確認完了'
      });
    } catch (e) {
      testResults.push({ 
        name: 'スクリプトプロパティデバッグ', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- 基本ユーティリティテスト ---');
    try {
      const headers = ['ユーザーID', '氏名', '電話番号', 'メールアドレス'];
      const testObj = claude_rowToObject(headers, ['U001', '太郎', '090-1234-5678', 'test@example.com']);
      const success = testObj['ユーザーID'] === 'U001' && testObj['氏名'] === '太郎';
      testResults.push({ 
        name: '基本ユーティリティ', 
        success: success, 
        details: '行データ変換機能確認'
      });
    } catch (e) {
      testResults.push({ 
        name: '基本ユーティリティ', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- パフォーマンス測定テスト ---');
    try {
      const result = claude_measurePerformance('テスト操作', () => {
        return 'テスト完了';
      });
      testResults.push({ 
        name: 'パフォーマンス測定', 
        success: result === 'テスト完了', 
        details: 'パフォーマンス測定機能動作確認'
      });
    } catch (e) {
      testResults.push({ 
        name: 'パフォーマンス測定', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    console.log('✅ Claude共通ユーティリティ拡張版テスト完了');
    
    const testSummary = {
      totalTests: totalTests,
      successfulTests: successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: `${successRate}%`
    };
    
    console.log('📊 テスト結果サマリー:', testSummary);
    
    testResults.forEach(result => {
      console.log(`${result.name}: ${result.success ? '成功' : '失敗'} - ${result.details}`);
    });
    
    return {
      success: true,
      summary: testSummary,
      testResults: testResults
    };
    
  } catch (error) {
    console.error('❌ Claude共通ユーティリティ拡張版テストエラー:', error);
    
    return {
      success: false,
      error: {
        type: 'test_execution_failed',
        message: error.message,
        timestamp: new Date()
      }
    };
  }
}