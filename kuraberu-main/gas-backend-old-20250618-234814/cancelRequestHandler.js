/**
 * Claude Code共通ユーティリティ関数
 * getColumnIndex_()のフェールセーフ強化・共通処理
 */

/**
 * 強化版getColumnIndex_() - フェールセーフ・近似候補提案付き
 * @param {Array} headers - ヘッダー行配列
 * @param {string} columnName - 検索対象カラム名
 * @param {string} sheetName - シート名（エラー時の詳細情報用）
 * @return {number} カラムインデックス（0ベース）
 * @throws {Error} カラム未検出時
 */
function getColumnIndex_(headers, columnName, sheetName = '不明') {
  try {
    // 厳密一致チェック
    const exactIndex = headers.indexOf(columnName);
    if (exactIndex !== -1) {
      return exactIndex;
    }
    
    // 空白・大小文字を無視した一致チェック
    const normalizedTarget = columnName.trim().toLowerCase();
    for (let i = 0; i < headers.length; i++) {
      const normalizedHeader = String(headers[i]).trim().toLowerCase();
      if (normalizedHeader === normalizedTarget) {
        console.warn(`カラム名の大小文字・空白違い検出: "${headers[i]}" → "${columnName}"`);
        return i;
      }
    }
    
    // 部分一致チェック
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]);
      if (header.includes(columnName) || columnName.includes(header)) {
        console.warn(`カラム名の部分一致検出: "${header}" ≈ "${columnName}"`);
        return i;
      }
    }
    
    // 類似カラム名検索
    const similarColumn = findSimilarColumn_(columnName, headers);
    const suggestion = similarColumn ? `もしかして「${similarColumn}」？` : '類似カラムなし';
    
    // 詳細エラー情報
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
 * @param {string} sheetName - シート名
 * @return {GoogleAppsScript.Spreadsheet.Sheet} シートオブジェクト
 * @throws {Error} シート未検出時
 */
function getSheetByName_(sheetName) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
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
 * @param {string} sheetName - シート名
 * @param {Array<string>} requiredColumns - 必須カラム名（任意）
 * @return {Object} {data: 全データ, headers: ヘッダー行, rows: データ行}
 */
function claude_getSafeSheetData(sheetName, requiredColumns = []) {
  try {
    console.log(`安全なデータ取得開始: ${sheetName}`);
    
    // 事前検証（必須カラムが指定されている場合）
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
 * @param {Array} headers - ヘッダー行
 * @param {Array<string>} columnNames - 必要なカラム名配列
 * @param {string} sheetName - シート名
 * @return {Object} {カラム名: インデックス}
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
 * @param {Array} headers - ヘッダー行
 * @param {Array} row - データ行
 * @return {Object} {カラム名: 値}
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
 * @param {Array} headers - ヘッダー行
 * @param {Array<Array>} rows - データ行配列
 * @return {Array<Object>} 連想配列の配列
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
 * @param {Array} row - データ行
 * @param {number} index - カラムインデックス
 * @param {any} defaultValue - デフォルト値
 * @return {any} 取得した値またはデフォルト値
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
 * @param {string} level - ログレベル（INFO, WARNING, ERROR, DEBUG）
 * @param {string} source - 発生元
 * @param {string} eventType - イベントタイプ
 * @param {string} message - メッセージ
 * @param {string} relatedId - 関連ID（任意）
 */
function claude_logEvent(level, source, eventType, message, relatedId = '') {
  try {
    const logSheet = getSheetByName_('システムログ');
    const headers = logSheet.getDataRange().getValues()[0];
    
    const now = new Date();
    const logId = `LOG-${String(now.getTime()).slice(-10)}`;
    const timestamp = now.toLocaleString('ja-JP');
    
    const logData = [];
    // システムログシートの全カラム分の配列を初期化
    for (let i = 0; i < headers.length; i++) {
      logData.push('');
    }
    
    // 必要なカラムにデータを設定
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
    // ログ記録の失敗は全体処理を停止させない
  }
}

/**
 * パフォーマンス測定ヘルパー
 * @param {string} operationName - 操作名
 * @param {Function} operation - 実行する関数
 * @return {any} 関数の戻り値
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