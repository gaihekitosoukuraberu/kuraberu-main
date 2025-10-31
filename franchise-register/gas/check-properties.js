/**
 * スクリプトプロパティを確認（デバッグ用）
 * Test: デバッグログ付きワークフローをトリガー
 */
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const firstLoginUrl = props.getProperty('FIRST_LOGIN_URL');
  const driveFolderId = props.getProperty('DRIVE_ROOT_FOLDER_ID');
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');

  console.log('=== Script Properties ===');
  console.log('FIRST_LOGIN_URL:', firstLoginUrl);
  console.log('DRIVE_ROOT_FOLDER_ID:', driveFolderId);
  console.log('SPREADSHEET_ID:', spreadsheetId);

  // フォルダアクセステスト
  if (driveFolderId) {
    try {
      const folder = DriveApp.getFolderById(driveFolderId);
      console.log('✅ Drive folder accessible:', folder.getName());
    } catch (e) {
      console.error('❌ Drive folder NOT accessible:', e.toString());
    }
  } else {
    console.error('❌ DRIVE_ROOT_FOLDER_ID not set');
  }

  return {
    FIRST_LOGIN_URL: firstLoginUrl,
    DRIVE_ROOT_FOLDER_ID: driveFolderId,
    SPREADSHEET_ID: spreadsheetId
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
// Test auto-deploy 20251031-164120
// Test 20251031-171619
// Test: 自動ロールバック機能テスト
