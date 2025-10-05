/**
 * テキスト圧縮・展開ユーティリティ
 * スプレッドシートのセル文字数制限対策
 */

/**
 * 圧縮されたテキストを展開
 * @param {string} text - 圧縮されたテキストまたは通常のテキスト
 * @return {string} 展開されたテキスト
 */
function expandCompressedText(text) {
  if (!text) return '';

  // JSON形式かチェック
  if (text.startsWith('{') && text.includes('"type":"compressed"')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'compressed' && parsed.full) {
        return parsed.full;
      }
    } catch (e) {
      // JSONパースエラーの場合は元のテキストを返す
      console.log('展開エラー:', e);
    }
  }

  return text;
}

/**
 * スプレッドシートの行データから圧縮されたテキストを展開
 * @param {Array} rowData - スプレッドシートの行データ
 * @param {Array} compressedColumns - 圧縮される可能性のある列番号の配列
 * @return {Array} 展開された行データ
 */
function expandRowData(rowData, compressedColumns) {
  const expanded = [...rowData];

  compressedColumns.forEach(col => {
    if (expanded[col]) {
      expanded[col] = expandCompressedText(expanded[col]);
    }
  });

  return expanded;
}

/**
 * 加盟店登録データの圧縮カラム定義
 */
const FRANCHISE_COMPRESSED_COLUMNS = [
  15, // 支店住所（P列）
  28, // 最大対応階数（AC列）
  30, // 施工箇所（AE列）
  31, // 特殊対応項目（AF列）
  32, // 対応都道府県（AG列）
  33, // 対応市区町村（AH列）
  34  // 優先エリア（AI列）
];

/**
 * 加盟店データを展開して取得
 * @param {string} registrationId - 登録ID
 * @return {Object} 展開された加盟店データ
 */
function getFranchiseDataExpanded(registrationId) {
  const sheet = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  ).getSheetByName('加盟店登録');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // 登録IDで検索
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === registrationId) { // B列が登録ID
      const expandedRow = expandRowData(data[i], FRANCHISE_COMPRESSED_COLUMNS);

      // オブジェクトに変換
      const result = {};
      headers.forEach((header, index) => {
        result[header] = expandedRow[index];
      });

      return result;
    }
  }

  return null;
}