/**
 * レスポンスユーティリティ
 */

/**
 * JSON形式のレスポンスを作成
 * @param {boolean} success - 成功/失敗フラグ
 * @param {string} message - メッセージ
 * @param {Object} data - 返却データ
 * @return {ContentService.TextOutput} レスポンスオブジェクト
 */
function createResponse(success, message, data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: success,
      message: message,
      data: data || {},
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * エラーレスポンスを作成
 * @param {string} message - エラーメッセージ
 * @param {Error} error - エラーオブジェクト
 * @return {ContentService.TextOutput} レスポンスオブジェクト
 */
function createErrorResponse(message, error) {
  console.error(message, error);
  return createResponse(false, message, {
    error: error?.toString(),
    stack: error?.stack
  });
}

/**
 * 成功レスポンスを作成
 * @param {string} message - 成功メッセージ
 * @param {Object} data - 返却データ
 * @return {ContentService.TextOutput} レスポンスオブジェクト
 */
function createSuccessResponse(message, data) {
  return createResponse(true, message, data);
}