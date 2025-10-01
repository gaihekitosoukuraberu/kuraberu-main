// config-provider.gs
// クライアント側へ設定情報を提供する関数

/**
 * 設定情報を取得
 * @param {Object} params - パラメータ（callback含む）
 * @return {TextOutput} レスポンス
 */
function handleGetConfig(params) {
  // プロパティからWeb App URLを取得（ハードコードなし）
  const webAppUrl = getWebAppUrlFromProperties();

  const config = {
    GAS_WEBAPP_URL: webAppUrl,
    timestamp: new Date().toISOString()
  };

  // JSONP対応
  const callback = params.callback;
  let output;

  if (callback) {
    // JSONP形式で返す
    output = ContentService
      .createTextOutput(callback + '(' + JSON.stringify(config) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 通常のJSONで返す
    output = ContentService
      .createTextOutput(JSON.stringify(config))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return output;
}

/**
 * 設定情報を返す（POSTアクション用）
 */
function getConfig() {
  // プロパティからWeb App URLを取得（ハードコードなし）
  const webAppUrl = getWebAppUrlFromProperties();

  return {
    GAS_WEBAPP_URL: webAppUrl
  };
}

/**
 * プロパティからWeb App URLを取得（フォールバック機能付き）
 * @return {string} Web App URL
 */
function getWebAppUrlFromProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // メインのWeb App URL
  let webAppUrl = scriptProperties.getProperty('GAS_WEBAPP_URL');

  if (webAppUrl) {
    return webAppUrl;
  }

  // フォールバック1: CONFIG_PROVIDER_URL
  webAppUrl = scriptProperties.getProperty('CONFIG_PROVIDER_URL');
  if (webAppUrl) {
    console.log('CONFIG_PROVIDER_URLをフォールバックとして使用');
    return webAppUrl;
  }

  // フォールバック2: 現在のWeb App URL
  webAppUrl = Utilities.getWebAppUrl();
  if (webAppUrl) {
    console.log('Utilities.getWebAppUrl()をフォールバックとして使用');
    return webAppUrl;
  }

  // 最終フォールバック: エラー
  throw new Error('Web App URLが設定されていません。プロパティを確認してください。');
}