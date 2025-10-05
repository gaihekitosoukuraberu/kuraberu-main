/**
 * メインルーティング
 * すべてのdoPost/doGetリクエストをここで処理
 */

/**
 * POSTリクエストのメインハンドラー
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = e.parameter.action || params.action;

    Logger.log(`[doPost] action: ${action}`);

    // システムごとにルーティング
    switch (action) {
      // 静的HTML生成システム
      case 'generateStaticHTML':
        return generateStaticHTML(params);

      // 加盟店ポータルシステム
      case 'saveMerchantData':
        return saveMerchantData(params);

      case 'savePreviewSettings':
        return savePreviewSettings(params.merchantId, params.previewSettings);

      case 'getPreviewSettings':
      case 'loadPreviewSettings':
        return loadPreviewSettings(params.merchantId);

      // 未知のアクション
      default:
        return createErrorResponse(`Unknown action: ${action}`);
    }

  } catch (error) {
    Logger.log(`[doPost] Error: ${error.toString()}`);
    return createErrorResponse(error.toString());
  }
}

/**
 * GETリクエストのメインハンドラー
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    Logger.log(`[doGet] action: ${action}`);

    switch (action) {
      case 'getPreviewSettings':
      case 'loadPreviewSettings':
        const merchantId = e.parameter.merchantId;
        return loadPreviewSettings(merchantId);

      default:
        return createErrorResponse(`Unknown action: ${action}`);
    }

  } catch (error) {
    Logger.log(`[doGet] Error: ${error.toString()}`);
    return createErrorResponse(error.toString());
  }
}

/**
 * 共通: 成功レスポンスを作成
 */
function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 共通: エラーレスポンスを作成
 */
function createErrorResponse(errorMessage) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: errorMessage
  })).setMimeType(ContentService.MimeType.JSON);
}
