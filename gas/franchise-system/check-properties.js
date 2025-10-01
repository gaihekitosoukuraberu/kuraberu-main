/**
 * スクリプトプロパティを確認（デバッグ用）
 */
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const firstLoginUrl = props.getProperty('FIRST_LOGIN_URL');

  console.log('=== Script Properties ===');
  console.log('FIRST_LOGIN_URL:', firstLoginUrl);

  return {
    FIRST_LOGIN_URL: firstLoginUrl
  };
}

/**
 * FIRST_LOGIN_URLを更新
 */
function updateFirstLoginUrl() {
  const props = PropertiesService.getScriptProperties();
  const newUrl = 'https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/first-login.html';

  props.setProperty('FIRST_LOGIN_URL', newUrl);

  console.log('✅ FIRST_LOGIN_URL updated to:', newUrl);

  return {
    success: true,
    newUrl: newUrl
  };
}
