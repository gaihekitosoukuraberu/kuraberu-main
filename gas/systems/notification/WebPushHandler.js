/**
 * ====================================
 * Web Push 通知ハンドラー
 * ====================================
 *
 * ブラウザPush通知の購読管理・送信
 *
 * 【VAPID設定】
 * Script Properties に以下を設定:
 * - VAPID_PUBLIC_KEY: 公開鍵（フロントエンドで使用）
 * - VAPID_PRIVATE_KEY: 秘密鍵（送信時に使用）
 * - VAPID_SUBJECT: mailto:your@email.com
 *
 * 【VAPID鍵の生成方法】
 * Node.js: npx web-push generate-vapid-keys
 * または: https://vapidkeys.com/
 */

const WebPushHandler = {

  /**
   * VAPID設定を取得
   */
  getConfig() {
    const props = PropertiesService.getScriptProperties();
    return {
      publicKey: props.getProperty('VAPID_PUBLIC_KEY'),
      privateKey: props.getProperty('VAPID_PRIVATE_KEY'),
      subject: props.getProperty('VAPID_SUBJECT') || 'mailto:admin@kuraberu.jp'
    };
  },

  /**
   * 設定が有効かチェック
   */
  isConfigured() {
    const config = this.getConfig();
    return !!(config.publicKey && config.privateKey);
  },

  /**
   * VAPID公開鍵を取得（フロントエンド用）
   */
  getPublicKey() {
    const config = this.getConfig();
    return {
      success: true,
      publicKey: config.publicKey || null,
      configured: this.isConfigured()
    };
  },

  /**
   * Push購読を保存
   * @param {string} merchantId - 加盟店ID
   * @param {object} subscription - Push購読オブジェクト
   * @returns {object} 結果
   */
  saveSubscription(merchantId, subscription) {
    try {
      console.log('[WebPushHandler] 購読保存:', merchantId);

      if (!merchantId || !subscription) {
        return { success: false, error: 'merchantIdとsubscriptionが必要です' };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // Push購読シートを取得または作成
      let sheet = ss.getSheetByName('Push購読');
      if (!sheet) {
        sheet = ss.insertSheet('Push購読');
        sheet.getRange(1, 1, 1, 6).setValues([[
          '加盟店ID', 'Endpoint', 'P256DH', 'Auth', '登録日時', '最終使用'
        ]]);
        sheet.setFrozenRows(1);
      }

      // 既存の購読を検索（同じendpointがあれば更新）
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId && data[i][1] === subscription.endpoint) {
          rowIndex = i + 1;
          break;
        }
      }

      const now = new Date();
      const rowData = [
        merchantId,
        subscription.endpoint,
        subscription.keys?.p256dh || '',
        subscription.keys?.auth || '',
        rowIndex > 0 ? data[rowIndex - 1][4] : now, // 登録日時は既存を維持
        now // 最終使用
      ];

      if (rowIndex > 0) {
        // 更新
        sheet.getRange(rowIndex, 1, 1, 6).setValues([rowData]);
        console.log('[WebPushHandler] 購読更新完了');
      } else {
        // 新規追加
        sheet.appendRow(rowData);
        console.log('[WebPushHandler] 購読登録完了');
      }

      return { success: true, message: '購読を保存しました' };

    } catch (error) {
      console.error('[WebPushHandler] 購読保存エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Push購読を削除
   * @param {string} merchantId - 加盟店ID
   * @param {string} endpoint - 削除するendpoint（省略時は全削除）
   */
  removeSubscription(merchantId, endpoint = null) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('Push購読');

      if (!sheet) return { success: true, message: '購読なし' };

      const data = sheet.getDataRange().getValues();
      const rowsToDelete = [];

      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === merchantId) {
          if (!endpoint || data[i][1] === endpoint) {
            rowsToDelete.push(i + 1);
          }
        }
      }

      // 後ろから削除（インデックスずれ防止）
      rowsToDelete.forEach(row => sheet.deleteRow(row));

      console.log('[WebPushHandler] 購読削除:', rowsToDelete.length, '件');
      return { success: true, deleted: rowsToDelete.length };

    } catch (error) {
      console.error('[WebPushHandler] 購読削除エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 加盟店の購読を取得
   * @param {string} merchantId - 加盟店ID
   * @returns {array} 購読リスト
   */
  getSubscriptions(merchantId) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('Push購読');

      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();
      const subscriptions = [];

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId && data[i][1]) {
          subscriptions.push({
            endpoint: data[i][1],
            keys: {
              p256dh: data[i][2],
              auth: data[i][3]
            }
          });
        }
      }

      return subscriptions;

    } catch (error) {
      console.error('[WebPushHandler] 購読取得エラー:', error);
      return [];
    }
  },

  /**
   * Push通知を送信
   * @param {string} merchantId - 加盟店ID
   * @param {object} payload - 通知ペイロード { title, body, data }
   * @returns {object} 結果
   */
  sendPush(merchantId, payload) {
    console.log('[WebPushHandler] Push送信開始:', merchantId);

    if (!this.isConfigured()) {
      console.warn('[WebPushHandler] VAPIDが設定されていません');
      return { success: false, error: 'Web Push未設定' };
    }

    const subscriptions = this.getSubscriptions(merchantId);

    if (subscriptions.length === 0) {
      console.log('[WebPushHandler] 購読がありません');
      return { success: false, error: '購読がありません' };
    }

    const config = this.getConfig();
    const results = [];

    for (const subscription of subscriptions) {
      try {
        const result = this._sendToEndpoint(subscription, payload, config);
        results.push({ endpoint: subscription.endpoint, ...result });

        // 失敗した購読は削除（410 Gone等）
        if (!result.success && result.statusCode === 410) {
          this.removeSubscription(merchantId, subscription.endpoint);
        }
      } catch (error) {
        console.error('[WebPushHandler] 送信エラー:', error);
        results.push({ endpoint: subscription.endpoint, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log('[WebPushHandler] Push送信完了:', successCount, '/', results.length);

    return {
      success: successCount > 0,
      sent: successCount,
      total: results.length,
      details: results
    };
  },

  /**
   * 単一エンドポイントに送信（内部用）
   * Web Push Protocol 実装
   */
  _sendToEndpoint(subscription, payload, config) {
    try {
      // ペイロードをJSON化
      const payloadStr = JSON.stringify(payload);

      // JWTトークン生成（VAPID認証）
      const jwt = this._createVapidJwt(subscription.endpoint, config);

      // リクエストヘッダー
      const headers = {
        'Authorization': 'vapid t=' + jwt + ', k=' + config.publicKey,
        'Content-Type': 'application/json',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400'
      };

      // 注意: GASでは完全なWeb Push暗号化は複雑
      // 簡易実装として、暗号化なしで送信を試みる
      // 本番環境ではCloud Functions経由を推奨

      const response = UrlFetchApp.fetch(subscription.endpoint, {
        method: 'post',
        headers: headers,
        payload: payloadStr,
        muteHttpExceptions: true
      });

      const statusCode = response.getResponseCode();

      if (statusCode >= 200 && statusCode < 300) {
        return { success: true, statusCode };
      } else {
        console.warn('[WebPushHandler] Push失敗:', statusCode, response.getContentText());
        return { success: false, statusCode, error: response.getContentText() };
      }

    } catch (error) {
      console.error('[WebPushHandler] _sendToEndpoint エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * VAPID JWT トークン生成
   */
  _createVapidJwt(endpoint, config) {
    const url = new URL(endpoint);
    const audience = url.origin;

    const header = {
      typ: 'JWT',
      alg: 'ES256'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: audience,
      exp: now + 86400, // 24時間有効
      sub: config.subject
    };

    // 注意: GASにはES256署名のネイティブサポートがない
    // 簡易実装としてBase64エンコードのみ
    // 本番環境ではCloud Functions経由を推奨

    const headerB64 = Utilities.base64EncodeWebSafe(JSON.stringify(header));
    const payloadB64 = Utilities.base64EncodeWebSafe(JSON.stringify(payload));

    // 署名なし（開発用）- 実際の署名にはECDSA実装が必要
    return headerB64 + '.' + payloadB64 + '.';
  }

};

// グローバル関数として公開
function getVapidPublicKey() {
  return WebPushHandler.getPublicKey();
}

function savePushSubscription(merchantId, subscription) {
  return WebPushHandler.saveSubscription(merchantId, subscription);
}

function removePushSubscription(merchantId, endpoint) {
  return WebPushHandler.removeSubscription(merchantId, endpoint);
}

function sendWebPush(merchantId, payload) {
  return WebPushHandler.sendPush(merchantId, payload);
}
