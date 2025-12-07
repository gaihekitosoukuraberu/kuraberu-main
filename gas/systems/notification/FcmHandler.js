/**
 * ====================================
 * Firebase Cloud Messaging ハンドラー
 * ====================================
 *
 * FCMを使用したPush通知送信
 *
 * 【設定】
 * Script Properties に以下を設定:
 * - FCM_PROJECT_ID: Firebase プロジェクトID
 * - FCM_SERVICE_ACCOUNT_EMAIL: サービスアカウントメール
 * - FCM_PRIVATE_KEY: サービスアカウント秘密鍵
 *
 * 【FCMトークン管理】
 * 加盟店ごとにFCMトークンをスプレッドシートで管理
 */

const FcmHandler = {

  /**
   * FCM設定を取得
   */
  getConfig() {
    const props = PropertiesService.getScriptProperties();
    return {
      projectId: props.getProperty('FCM_PROJECT_ID'),
      serviceAccountEmail: props.getProperty('FCM_SERVICE_ACCOUNT_EMAIL'),
      privateKey: props.getProperty('FCM_PRIVATE_KEY')
    };
  },

  /**
   * 設定が有効かチェック
   */
  isConfigured() {
    const config = this.getConfig();
    return !!(config.projectId && config.serviceAccountEmail && config.privateKey);
  },

  /**
   * FCMトークンを保存
   * @param {string} merchantId - 加盟店ID
   * @param {string} token - FCMトークン
   * @returns {object} 結果
   */
  saveToken(merchantId, token) {
    try {
      console.log('[FcmHandler] トークン保存:', merchantId);

      if (!merchantId || !token) {
        return { success: false, error: 'merchantIdとtokenが必要です' };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // FCMトークンシートを取得または作成
      let sheet = ss.getSheetByName('FCMトークン');
      if (!sheet) {
        sheet = ss.insertSheet('FCMトークン');
        sheet.getRange(1, 1, 1, 4).setValues([[
          '加盟店ID', 'FCMトークン', '登録日時', '最終使用'
        ]]);
        sheet.setFrozenRows(1);
      }

      // 既存のトークンを検索
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId && data[i][1] === token) {
          rowIndex = i + 1;
          break;
        }
      }

      const now = new Date();
      const rowData = [
        merchantId,
        token,
        rowIndex > 0 ? data[rowIndex - 1][2] : now,
        now
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, 4).setValues([rowData]);
        console.log('[FcmHandler] トークン更新完了');
      } else {
        // 同じ加盟店の古いトークンを削除（1加盟店1トークン）
        for (let i = data.length - 1; i >= 1; i--) {
          if (data[i][0] === merchantId) {
            sheet.deleteRow(i + 1);
          }
        }
        sheet.appendRow(rowData);
        console.log('[FcmHandler] トークン登録完了');
      }

      return { success: true, message: 'トークンを保存しました' };

    } catch (error) {
      console.error('[FcmHandler] トークン保存エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * FCMトークンを取得
   * @param {string} merchantId - 加盟店ID
   * @returns {string|null} FCMトークン
   */
  getToken(merchantId) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('FCMトークン');

      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId && data[i][1]) {
          return data[i][1];
        }
      }

      return null;

    } catch (error) {
      console.error('[FcmHandler] トークン取得エラー:', error);
      return null;
    }
  },

  /**
   * FCMトークンがあるかチェック
   * @param {string} merchantId - 加盟店ID
   * @returns {boolean}
   */
  hasToken(merchantId) {
    return !!this.getToken(merchantId);
  },

  /**
   * FCMトークンを削除
   * @param {string} merchantId - 加盟店ID
   */
  removeToken(merchantId) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('FCMトークン');

      if (!sheet) return { success: true };

      const data = sheet.getDataRange().getValues();

      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === merchantId) {
          sheet.deleteRow(i + 1);
        }
      }

      return { success: true };

    } catch (error) {
      console.error('[FcmHandler] トークン削除エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * OAuth2アクセストークンを取得
   * @returns {string} アクセストークン
   */
  getAccessToken() {
    const config = this.getConfig();

    if (!config.serviceAccountEmail || !config.privateKey) {
      throw new Error('FCMサービスアカウントが設定されていません');
    }

    // 秘密鍵の改行を復元
    const privateKey = config.privateKey.replace(/\\n/g, '\n');

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: config.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    // JWTを作成
    const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimSet = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
    const signatureInput = header + '.' + claimSet;

    // RS256署名
    const signature = Utilities.base64EncodeWebSafe(
      Utilities.computeRsaSha256Signature(signatureInput, privateKey)
    );

    const jwt = signatureInput + '.' + signature;

    // アクセストークンを取得
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      },
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.access_token) {
      return result.access_token;
    } else {
      console.error('[FcmHandler] アクセストークン取得失敗:', result);
      throw new Error('FCMアクセストークン取得失敗');
    }
  },

  /**
   * Push通知を送信
   * @param {string} merchantId - 加盟店ID
   * @param {object} payload - 通知ペイロード { title, body, data }
   * @returns {object} 結果
   */
  sendPush(merchantId, payload) {
    console.log('[FcmHandler] Push送信開始:', merchantId);

    if (!this.isConfigured()) {
      console.warn('[FcmHandler] FCMが設定されていません');
      return { success: false, error: 'FCM未設定' };
    }

    const token = this.getToken(merchantId);

    if (!token) {
      console.log('[FcmHandler] トークンがありません');
      return { success: false, error: 'FCMトークンがありません' };
    }

    try {
      const config = this.getConfig();
      const accessToken = this.getAccessToken();

      const message = {
        message: {
          token: token,
          notification: {
            title: payload.title || 'くらべる通知',
            body: payload.body || ''
          },
          webpush: {
            notification: {
              icon: '/franchise-dashboard/images/5.png',
              badge: '/franchise-dashboard/images/5.png',
              vibrate: [200, 100, 200],
              requireInteraction: false
            },
            fcm_options: {
              link: payload.data?.url || '/franchise-dashboard/index.html'
            }
          },
          data: payload.data || {}
        }
      };

      const response = UrlFetchApp.fetch(
        `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
        {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'Authorization': 'Bearer ' + accessToken
          },
          payload: JSON.stringify(message),
          muteHttpExceptions: true
        }
      );

      const responseCode = response.getResponseCode();
      const responseBody = JSON.parse(response.getContentText());

      if (responseCode === 200) {
        console.log('[FcmHandler] Push送信成功:', responseBody.name);
        return { success: true, messageId: responseBody.name };
      } else {
        console.error('[FcmHandler] Push送信失敗:', responseBody);

        // トークンが無効な場合は削除
        if (responseBody.error?.details?.some(d =>
          d['@type']?.includes('UNREGISTERED') ||
          d.errorCode === 'UNREGISTERED'
        )) {
          this.removeToken(merchantId);
          console.log('[FcmHandler] 無効なトークンを削除');
        }

        return { success: false, error: responseBody.error?.message || 'FCM送信失敗' };
      }

    } catch (error) {
      console.error('[FcmHandler] Push送信エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Firebase設定情報を取得（フロントエンド用）
   */
  getFirebaseConfig() {
    const props = PropertiesService.getScriptProperties();
    return {
      success: true,
      config: {
        apiKey: props.getProperty('FIREBASE_API_KEY') || '',
        authDomain: props.getProperty('FIREBASE_AUTH_DOMAIN') || '',
        projectId: props.getProperty('FCM_PROJECT_ID') || '',
        storageBucket: props.getProperty('FIREBASE_STORAGE_BUCKET') || '',
        messagingSenderId: props.getProperty('FIREBASE_MESSAGING_SENDER_ID') || '',
        appId: props.getProperty('FIREBASE_APP_ID') || '',
        vapidKey: props.getProperty('FIREBASE_VAPID_KEY') || ''
      },
      configured: this.isConfigured()
    };
  }

};

// グローバル関数として公開
function saveFcmToken(merchantId, token) {
  return FcmHandler.saveToken(merchantId, token);
}

function removeFcmToken(merchantId) {
  return FcmHandler.removeToken(merchantId);
}

function sendFcmPush(merchantId, payload) {
  return FcmHandler.sendPush(merchantId, payload);
}

function getFirebaseConfig() {
  return FcmHandler.getFirebaseConfig();
}
