/**
 * 初期設定スクリプト
 * 一度だけ実行してシステムを初期化
 */

/**
 * 全体の初期設定を実行
 */
function runFullSetup() {
  console.log('=== 初期設定開始 ===');

  // 1. スプレッドシート設定
  const spreadsheetId = getOrCreateSpreadsheetId();
  console.log('✅ スプレッドシートID:', spreadsheetId);

  // 2. 加盟店シート作成
  const franchiseSheet = getFranchiseSheet();
  console.log('✅ 加盟店シート:', franchiseSheet.getName());

  // 3. Google Drive設定
  const driveConfig = setupDrive();
  console.log('✅ Driveフォルダ設定:', driveConfig);

  // 4. ファイルインデックスシート作成
  const indexSheet = getFileIndexSheet();
  console.log('✅ ファイルインデックスシート:', indexSheet.getName());

  // 5. 認証関連の設定
  setupAuthProperties();
  console.log('✅ 認証関連プロパティ設定完了');

  // 6. 設定確認
  const properties = PropertiesService.getScriptProperties().getProperties();
  console.log('=== 設定値一覧 ===');
  for (const key in properties) {
    if (key.includes('ID') || key.includes('FOLDER') || key.includes('URL')) {
      console.log(`${key}: ${properties[key]}`);
    }
  }

  console.log('=== 初期設定完了 ===');

  return {
    spreadsheetId: spreadsheetId,
    driveConfig: driveConfig
  };
}

/**
 * スプレッドシートIDを正しいものに修正して再設定
 */
function fixAndResetSpreadsheet() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // スプレッドシートIDをプロパティから取得（なければエラー）
  let spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_IDが設定されていません。プロパティに設定してください。');
  }

  console.log('使用するスプレッドシートID:', spreadsheetId);

  try {
    // スプレッドシートを取得して名前を更新
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    spreadsheet.rename('加盟店管理システム');

    // 既存の「加盟店登録」シートを削除（あれば）
    const oldSheet = spreadsheet.getSheetByName('加盟店登録');
    if (oldSheet) {
      spreadsheet.deleteSheet(oldSheet);
      console.log('既存のシートを削除しました');
    }

    // 加盟店シートを新規作成（36列の正しいヘッダーで）
    const franchiseSheet = createFranchiseSheet(spreadsheet);
    console.log('加盟店シートを再作成しました:', franchiseSheet.getName());

    return spreadsheetId; // 正しい変数を返す
  } catch (error) {
    console.error('エラー:', error);
    return null;
  }
}

/**
 * 加盟店シートを完全に削除して再作成
 */
function recreateFranchiseSheet() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    console.error('スプレッドシートIDが設定されていません');
    return null;
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    // 既存の加盟店登録シートを削除
    const existingSheet = spreadsheet.getSheetByName('加盟店登録');
    if (existingSheet) {
      spreadsheet.deleteSheet(existingSheet);
      console.log('既存の加盟店登録シートを削除しました');
    }

    // 新しいシートを作成（36列の正しいヘッダーで）
    const newSheet = spreadsheet.insertSheet('加盟店登録');

    // ヘッダーを設定（36列）
    const headers = getFranchiseHeaders();
    console.log('ヘッダー数:', headers.length);
    console.log('ヘッダー内容:', headers);

    // ヘッダー行を設定
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // ヘッダー行を装飾
    const headerRange = newSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 列幅を調整
    newSheet.autoResizeColumns(1, headers.length);

    console.log('新しい加盟店登録シートを作成しました（36列）');
    return newSheet;

  } catch (error) {
    console.error('シート再作成エラー:', error);
    return null;
  }
}

/**
 * Drive設定のみリセット（テスト用）
 */
function resetDriveSettings() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // Drive関連のプロパティを削除
  scriptProperties.deleteProperty('DRIVE_ROOT_FOLDER_ID');
  scriptProperties.deleteProperty('MERCHANTS_FOLDER_ID');
  scriptProperties.deleteProperty('PROJECTS_FOLDER_ID');
  scriptProperties.deleteProperty('ARCHIVES_FOLDER_ID');

  console.log('Drive設定をリセットしました');

  // 再設定
  return setupDrive();
}

/**
 * ストレージ使用状況を確認
 */
function checkStorageStatus() {
  const report = generateStorageReport();

  console.log('=== ストレージ使用状況 ===');
  console.log(`使用量: ${report.usedGB}GB / ${report.totalGB}GB (${report.percentUsed}%)`);
  console.log(`残容量: ${report.remainingGB}GB`);
  console.log(`保存ドキュメント数: ${report.documentCount}`);
  console.log(`ドキュメント合計サイズ: ${report.documentSizeGB}GB`);

  // 警告チェック
  if (report.percentUsed > 80) {
    console.warn('⚠️ ストレージ使用率が80%を超えています');
  }
  if (report.percentUsed > 50) {
    console.warn('📊 ストレージ使用率が50%を超えています');
  }

  return report;
}

/**
 * テスト用：サンプルドキュメントを保存
 */
function testSaveDocument() {
  // テストデータ
  const testDocument = {
    type: 'drivers_license',
    side: 'front',
    data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=' // 1x1の透明画像
  };

  const registrationId = 'FR999999'; // テスト用ID
  const companyName = 'テスト株式会社';

  const result = saveIdentityDocument(testDocument, registrationId, companyName);

  if (result.success) {
    console.log('✅ テスト保存成功:', result.fileInfo);
  } else {
    console.error('❌ テスト保存失敗:', result.error);
  }

  return result;
}

/**
 * 認証関連のプロパティを設定
 */
function setupAuthProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // SECRET_KEYが未設定の場合は生成（すでに設定済みならスキップ）
  if (!scriptProperties.getProperty('SECRET_KEY')) {
    const secretKey = Utilities.getUuid() + '-' + Utilities.getUuid();
    scriptProperties.setProperty('SECRET_KEY', secretKey);
    console.log('✅ SECRET_KEYを生成しました');
  } else {
    console.log('ℹ️ SECRET_KEYはすでに設定済みです');
  }

  // 初回ログインURLを設定
  if (!scriptProperties.getProperty('FIRST_LOGIN_URL')) {
    scriptProperties.setProperty('FIRST_LOGIN_URL', 'https://gaihekikuraberu.com/merchant-portal/first-login.html');
    console.log('✅ FIRST_LOGIN_URLを設定しました');
  }

  // パスワードリセットURLを設定
  if (!scriptProperties.getProperty('PASSWORD_RESET_URL')) {
    scriptProperties.setProperty('PASSWORD_RESET_URL', 'https://gaihekikuraberu.com/franchise-dashboard/reset-password.html');
    console.log('✅ PASSWORD_RESET_URLを設定しました');
  }

  // 認証情報シートを初期化
  try {
    initCredentialsSheet();
    console.log('✅ 認証情報シートを初期化しました');
  } catch (error) {
    console.error('認証情報シートの初期化に失敗:', error);
  }
}

/**
 * GitHub Personal Access Tokenを設定
 *
 * 使い方：
 * 1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
 * 2. Generate new token (classic)
 * 3. Scopes: repo, workflow にチェック
 * 4. トークンをコピー (ghp_で始まる文字列)
 * 5. この関数を実行: setGitHubToken('ghp_xxxxxxxxxxxx')
 */
function setGitHubToken(token) {
  if (!token || !token.startsWith('ghp_')) {
    console.error('❌ 無効なトークン形式です。ghp_で始まるトークンを指定してください。');
    return false;
  }

  try {
    PropertiesService.getScriptProperties().setProperty('GH_PAT', token);
    console.log('✅ GitHub Personal Access Tokenを設定しました');
    console.log('ℹ️ トークンは安全に保存されました（Script Propertiesに格納）');
    return true;
  } catch (error) {
    console.error('❌ トークンの保存に失敗:', error);
    return false;
  }
}

/**
 * 設定済みのGitHub Tokenを確認（セキュリティのため最初の10文字のみ表示）
 */
function checkGitHubToken() {
  const token = PropertiesService.getScriptProperties().getProperty('GH_PAT');

  if (!token) {
    console.log('❌ GitHub Tokenが設定されていません');
    console.log('ℹ️ setGitHubToken("ghp_xxxxx") を実行してトークンを設定してください');
    return false;
  }

  console.log('✅ GitHub Tokenが設定されています');
  console.log(`ℹ️ トークン: ${token.substring(0, 10)}... (セキュリティのため一部のみ表示)`);
  return true;
}