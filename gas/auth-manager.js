// auth-manager.gs
// 加盟店認証管理システム

// SECRET_KEY: プロパティから読み込み（フォールバックなし）
const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');

// 初回ログインURL生成
function generateFirstLoginUrl(merchantId) {
  const data = {
    merchantId: merchantId,
    expires: Date.now() + 86400000, // 24時間後
    type: 'first_login'
  };

  // 署名作成
  const signature = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(data) + SECRET_KEY
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 16);

  // Base64エンコード
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify(data));

  // URL生成（V2061: 直接指定 - プロパティ設定ミス対策）
  // FIRST_LOGIN_URLプロパティがlogin.htmlを指していたため、ハードコード
  const CORRECT_FIRST_LOGIN_URL = 'https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/first-login.html';
  console.log('[auth-manager] 🔗 生成URL:', CORRECT_FIRST_LOGIN_URL + '?data=...');
  return `${CORRECT_FIRST_LOGIN_URL}?data=${payload}&sig=${signature}`;
}

// URL検証
function verifySignedUrl(payload, signature) {
  try {
    const data = JSON.parse(Utilities.newBlob(
      Utilities.base64DecodeWebSafe(payload)
    ).getDataAsString());

    // 署名検証
    const expectedSig = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(data) + SECRET_KEY
    ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 16);

    if (signature !== expectedSig) return null;
    if (Date.now() > data.expires) return null;

    return data.merchantId;
  } catch(e) {
    return null;
  }
}

// 認証情報シート初期化
function initCredentialsSheet() {
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_IDが設定されていません');
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('認証情報');

  if (!sheet) {
    sheet = ss.insertSheet('認証情報');
    sheet.getRange(1, 1, 1, 5).setValues([[
      '加盟店ID', 'メールアドレス', 'パスワードハッシュ', '最終ログイン', 'パスワード変更日'
    ]]);
    sheet.hideSheet(); // シート非表示
  }
  return sheet;
}

// パスワード保存（ハッシュ化）
function savePassword(merchantId, plainPassword) {
  const sheet = initCredentialsSheet();
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    plainPassword + SECRET_KEY + merchantId
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  // 既存レコード検索
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[0] === merchantId);

  if (rowIndex > 0) {
    sheet.getRange(rowIndex + 1, 3).setValue(hash);
    sheet.getRange(rowIndex + 1, 5).setValue(new Date());
  } else {
    // 新規追加
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const merchantSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
    const merchantData = merchantSheet.getDataRange().getValues();
    const merchant = merchantData.find(row => row[1] === merchantId); // B列が登録ID
    const email = merchant ? merchant[22] : ''; // W列：営業用メールアドレス

    sheet.appendRow([merchantId, email, hash, '', new Date()]);
  }

  // ステータスは準備中のまま（手動でアクティブ化するため）
  // updateMerchantStatus(merchantId, 'アクティブ');

  return {success: true};
}

// ログイン検証
function verifyLogin(merchantId, inputPassword) {
  const sheet = initCredentialsSheet();
  const data = sheet.getDataRange().getValues();
  const merchant = data.find(row => row[0] === merchantId);

  if (!merchant) return false;

  const inputHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    inputPassword + SECRET_KEY + merchantId
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  const isValid = merchant[2] === inputHash;

  if (isValid) {
    // 最終ログイン更新
    const rowIndex = data.indexOf(merchant);
    sheet.getRange(rowIndex + 1, 4).setValue(new Date());
  }

  return isValid;
}

// パスワードリセット用URL生成
function generatePasswordResetUrl(email) {
  // メールから加盟店ID取得
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const merchantSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
  const data = merchantSheet.getDataRange().getValues();
  const merchant = data.find(row => row[22] === email); // W列：営業用メールアドレス

  if (!merchant) return null;

  const resetData = {
    merchantId: merchant[1], // B列：登録ID
    expires: Date.now() + 3600000, // 1時間
    type: 'password_reset'
  };

  const signature = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(resetData) + SECRET_KEY
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 16);

  const payload = Utilities.base64EncodeWebSafe(JSON.stringify(resetData));

  const PASSWORD_RESET_URL = PropertiesService.getScriptProperties().getProperty('PASSWORD_RESET_URL');
  if (!PASSWORD_RESET_URL) {
    throw new Error('PASSWORD_RESET_URLが設定されていません');
  }
  return `${PASSWORD_RESET_URL}?data=${payload}&sig=${signature}`;
}

// 加盟店ステータス更新
function updateMerchantStatus(merchantId, status) {
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[1] === merchantId); // B列が登録ID

  if (rowIndex > 0) {
    sheet.getRange(rowIndex + 1, 36).setValue(status); // AJ列：ステータス
    return true;
  }
  return false;
}

// ログイン試行回数チェック（セッションベース）
const loginAttempts = {};

function checkLoginAttempts(merchantId) {
  const now = Date.now();

  // 古いエントリをクリーンアップ
  for (const id in loginAttempts) {
    if (loginAttempts[id].expires < now) {
      delete loginAttempts[id];
    }
  }

  if (!loginAttempts[merchantId]) {
    loginAttempts[merchantId] = {
      count: 0,
      expires: now + 900000 // 15分
    };
  }

  loginAttempts[merchantId].count++;

  if (loginAttempts[merchantId].count > 5) {
    return false; // ロックアウト
  }

  return true;
}

function resetLoginAttempts(merchantId) {
  delete loginAttempts[merchantId];
}

// ====================================
// 管理者認証システム
// ====================================

// 管理者ログイン試行回数管理
const adminLoginAttempts = {};

/**
 * 管理者ログイン検証
 * @param {string} userId - 入力されたユーザーID
 * @param {string} password - 入力されたパスワード
 * @returns {Object} - {success: boolean, message: string}
 */
function verifyAdminLogin(userId, password) {
  try {
    // 入力チェック
    if (!userId || !password) {
      return {
        success: false,
        message: 'ユーザーIDとパスワードを入力してください'
      };
    }

    // ログイン試行回数チェック
    if (!checkAdminLoginAttempts(userId)) {
      return {
        success: false,
        message: 'ログイン試行回数が上限に達しました。15分後に再度お試しください。'
      };
    }

    // スクリプトプロパティから認証情報を取得
    const props = PropertiesService.getScriptProperties();
    const adminUser = props.getProperty('ADMIN_USER');
    const adminPass = props.getProperty('ADMIN_PASS');

    // 認証情報が設定されているかチェック
    if (!adminUser || !adminPass) {
      console.error('[verifyAdminLogin] 管理者認証情報が設定されていません');
      return {
        success: false,
        message: '管理者認証情報が設定されていません。システム管理者に連絡してください。'
      };
    }

    // 認証チェック
    if (userId === adminUser && password === adminPass) {
      // ログイン成功
      resetAdminLoginAttempts(userId);

      console.log('[verifyAdminLogin] 管理者ログイン成功:', userId);

      return {
        success: true,
        message: 'ログインに成功しました',
        userId: userId,
        loginTime: new Date().toISOString()
      };
    } else {
      // ログイン失敗
      console.warn('[verifyAdminLogin] 管理者ログイン失敗:', userId);

      return {
        success: false,
        message: 'ユーザーIDまたはパスワードが正しくありません'
      };
    }

  } catch (error) {
    console.error('[verifyAdminLogin] エラー:', error);
    return {
      success: false,
      message: 'ログイン処理中にエラーが発生しました'
    };
  }
}

/**
 * 管理者ログイン試行回数チェック
 * @param {string} userId - ユーザーID
 * @returns {boolean} - true: ログイン可能, false: ロックアウト
 */
function checkAdminLoginAttempts(userId) {
  const now = Date.now();

  // 古いエントリをクリーンアップ
  for (const id in adminLoginAttempts) {
    if (adminLoginAttempts[id].expires < now) {
      delete adminLoginAttempts[id];
    }
  }

  if (!adminLoginAttempts[userId]) {
    adminLoginAttempts[userId] = {
      count: 0,
      expires: now + 900000 // 15分
    };
  }

  adminLoginAttempts[userId].count++;

  if (adminLoginAttempts[userId].count > 5) {
    console.warn('[checkAdminLoginAttempts] ログイン試行回数超過:', userId);
    return false; // ロックアウト
  }

  return true;
}

/**
 * 管理者ログイン試行回数リセット
 * @param {string} userId - ユーザーID
 */
function resetAdminLoginAttempts(userId) {
  delete adminLoginAttempts[userId];
}