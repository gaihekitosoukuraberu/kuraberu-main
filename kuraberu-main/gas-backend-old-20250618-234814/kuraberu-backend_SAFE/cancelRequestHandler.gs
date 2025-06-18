/**
 * 📂 ファイル名: cancelRequestHandler.gs
 * 🎯 内容: 外壁塗装くらべるAI - Claude Code共通ユーティリティ関数
 * - getColumnIndex_()のフェールセーフ強化・共通処理
 * - 安全なシート・データ取得機能
 * - パフォーマンス測定・システムログ記録機能
 * ✅ claude_getSafeSheetData() により安全なデータ取得が可能
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
 * Claude Code共通ユーティリティのテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testClaudeUtilsSystem() {
  console.log('🧪 Claude Code共通ユーティリティテスト開始');
  
  try {
    const testResults = [];
    
    console.log('--- 安全なシート取得テスト ---');
    try {
      const testSheet = getSheetByName_('ユーザー情報');
      testResults.push({ name: 'シート取得', success: !!testSheet, details: 'ユーザー情報シート取得成功' });
    } catch (e) {
      testResults.push({ name: 'シート取得', success: false, details: `エラー: ${e.message}` });
    }
    
    console.log('--- 安全なデータ取得テスト ---');
    try {
      const testData = claude_getSafeSheetData('ユーザー情報');
      const success = testData && testData.headers && Array.isArray(testData.rows);
      testResults.push({ 
        name: 'データ取得', 
        success: success, 
        details: success ? `ヘッダー: ${testData.headers.length}列, データ: ${testData.rows.length}行` : 'データ取得失敗'
      });
    } catch (e) {
      testResults.push({ name: 'データ取得', success: false, details: `エラー: ${e.message}` });
    }
    
    console.log('--- カラムインデックス検索テスト ---');
    try {
      const headers = ['ユーザーID', '氏名', '電話番号', 'メールアドレス'];
      const index = getColumnIndex_(headers, 'ユーザーID', 'テストシート');
      testResults.push({ 
        name: 'カラムインデックス検索', 
        success: index === 0, 
        details: `「ユーザーID」のインデックス: ${index}`
      });
    } catch (e) {
      testResults.push({ name: 'カラムインデックス検索', success: false, details: `エラー: ${e.message}` });
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
      testResults.push({ name: 'パフォーマンス測定', success: false, details: `エラー: ${e.message}` });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    console.log('✅ Claude Code共通ユーティリティテスト完了');
    
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
    console.error('❌ Claude Code共通ユーティリティテストエラー:', error);
    
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