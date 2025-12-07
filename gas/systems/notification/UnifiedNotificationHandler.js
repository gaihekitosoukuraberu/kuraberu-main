/**
 * ====================================
 * 統合通知ハンドラー
 * ====================================
 *
 * LINE優先 → Web Push → SMSフォールバックの通知システム
 *
 * 【優先順位】
 * 1. LINE連携済み → LINE送信（1円）
 * 2. Web Push購読済み → ブラウザ通知（無料）
 * 3. どちらもなし → SMS送信（8円〜）
 *
 * - ユーザー向け: SMS固定（LINE連携なし）
 *
 * 【使用例】
 * // 加盟店に通知（LINE優先）
 * UnifiedNotificationHandler.notifyMerchant('FC-123456-ABCD', '新規案件があります', { cvId: 'CV123' });
 *
 * // エンドユーザーに通知（SMS固定）
 * UnifiedNotificationHandler.notifyUser('09012345678', 'お申込みありがとうございます', { cvId: 'CV123' });
 */

const UnifiedNotificationHandler = {

  /**
   * 加盟店に通知を送信（LINE優先、SMSフォールバック）
   * @param {string} merchantId - 加盟店ID
   * @param {string} message - メッセージ本文
   * @param {object} options - オプション（cvId等）
   * @returns {object} 結果オブジェクト
   */
  notifyMerchant(merchantId, message, options = {}) {
    console.log('[UnifiedNotification] 加盟店通知開始:', merchantId);

    try {
      // 加盟店情報を取得
      const merchantInfo = this.getMerchantInfo(merchantId);

      if (!merchantInfo) {
        console.error('[UnifiedNotification] 加盟店が見つかりません:', merchantId);
        return {
          success: false,
          channel: null,
          error: '加盟店が見つかりません'
        };
      }

      // ===== 優先度1: LINE =====
      if (merchantInfo.lineUserId) {
        console.log('[UnifiedNotification] LINE送信:', merchantInfo.lineUserId);
        const lineResult = this.sendLine(merchantInfo.lineUserId, message);

        if (lineResult.success) {
          this.recordNotificationHistory({
            channel: 'LINE',
            merchantId,
            message,
            success: true,
            ...options
          });

          return {
            success: true,
            channel: 'LINE',
            message: 'LINE送信完了'
          };
        }
        console.log('[UnifiedNotification] LINE送信失敗、次のチャネルへ');
      }

      // ===== 優先度2: Web Push（無料）=====
      if (this.hasWebPushSubscription(merchantId)) {
        console.log('[UnifiedNotification] Web Push送信:', merchantId);
        const pushResult = this.sendWebPush(merchantId, message, options);

        if (pushResult.success) {
          this.recordNotificationHistory({
            channel: 'WebPush',
            merchantId,
            message,
            success: true,
            ...options
          });

          return {
            success: true,
            channel: 'WebPush',
            message: 'ブラウザ通知送信完了'
          };
        }
        console.log('[UnifiedNotification] Web Push送信失敗、SMSへフォールバック');
      }

      // ===== 優先度3: SMS（有料）=====
      if (merchantInfo.phone) {
        console.log('[UnifiedNotification] SMS送信:', merchantInfo.phone);
        const smsResult = this.sendSms(merchantInfo.phone, message, {
          merchantId,
          ...options
        });

        this.recordNotificationHistory({
          channel: 'SMS',
          merchantId,
          toPhone: merchantInfo.phone,
          message,
          success: smsResult.success,
          ...options
        });

        return {
          success: smsResult.success,
          channel: 'SMS',
          message: smsResult.success ? 'SMS送信完了' : smsResult.error
        };
      }

      // 連絡先なし
      console.error('[UnifiedNotification] 連絡先がありません:', merchantId);
      return {
        success: false,
        channel: null,
        error: '連絡先（LINE/WebPush/電話番号）が登録されていません'
      };

    } catch (error) {
      console.error('[UnifiedNotification] エラー:', error);
      return {
        success: false,
        channel: null,
        error: error.message || '通知送信中にエラーが発生しました'
      };
    }
  },

  /**
   * エンドユーザーに通知を送信（SMS固定）
   * @param {string} phone - 電話番号
   * @param {string} message - メッセージ本文
   * @param {object} options - オプション（cvId等）
   * @returns {object} 結果オブジェクト
   */
  notifyUser(phone, message, options = {}) {
    console.log('[UnifiedNotification] ユーザー通知開始:', phone);

    try {
      const smsResult = this.sendSms(phone, message, options);

      this.recordNotificationHistory({
        channel: 'SMS',
        toPhone: phone,
        message,
        success: smsResult.success,
        targetType: 'user',
        ...options
      });

      return {
        success: smsResult.success,
        channel: 'SMS',
        message: smsResult.success ? 'SMS送信完了' : smsResult.error,
        sid: smsResult.sid
      };

    } catch (error) {
      console.error('[UnifiedNotification] エラー:', error);
      return {
        success: false,
        channel: 'SMS',
        error: error.message || 'SMS送信中にエラーが発生しました'
      };
    }
  },

  /**
   * 加盟店情報を取得
   * @param {string} merchantId - 加盟店ID
   * @returns {object|null} 加盟店情報
   */
  getMerchantInfo(merchantId) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('加盟店登録');

      if (!sheet) {
        console.error('[UnifiedNotification] 加盟店登録シートが見つかりません');
        return null;
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // カラムインデックスを取得
      const idCol = headers.indexOf('登録ID');
      const phoneCol = headers.indexOf('電話番号');
      const lineIdCol = headers.indexOf('LINE_USER_ID');
      const companyCol = headers.indexOf('会社名');

      if (idCol === -1) {
        console.error('[UnifiedNotification] 登録IDカラムが見つかりません');
        return null;
      }

      // 加盟店を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idCol] === merchantId) {
          return {
            merchantId: data[i][idCol],
            phone: phoneCol >= 0 ? data[i][phoneCol] : null,
            lineUserId: lineIdCol >= 0 ? data[i][lineIdCol] : null,
            companyName: companyCol >= 0 ? data[i][companyCol] : null
          };
        }
      }

      return null;

    } catch (error) {
      console.error('[UnifiedNotification] getMerchantInfo エラー:', error);
      return null;
    }
  },

  /**
   * LINE送信
   * @param {string} lineUserId - LINE ユーザーID
   * @param {string} message - メッセージ本文
   * @returns {object} 結果
   */
  sendLine(lineUserId, message) {
    try {
      const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');

      if (!accessToken) {
        console.error('[UnifiedNotification] LINE_ACCESS_TOKENが設定されていません');
        return { success: false, error: 'LINE設定エラー' };
      }

      const endpoint = 'https://api.line.me/v2/bot/message/push';

      const payload = {
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(endpoint, options);
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        console.log('[UnifiedNotification] LINE送信成功:', lineUserId);
        return { success: true };
      } else {
        console.error('[UnifiedNotification] LINE送信失敗:', response.getContentText());
        return { success: false, error: 'LINE送信失敗' };
      }

    } catch (error) {
      console.error('[UnifiedNotification] LINE送信エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Web Push購読があるかチェック
   * @param {string} merchantId - 加盟店ID
   * @returns {boolean}
   */
  hasWebPushSubscription(merchantId) {
    if (typeof WebPushHandler !== 'undefined') {
      const subscriptions = WebPushHandler.getSubscriptions(merchantId);
      return subscriptions.length > 0;
    }
    return false;
  },

  /**
   * Web Push送信
   * @param {string} merchantId - 加盟店ID
   * @param {string} message - メッセージ本文
   * @param {object} options - オプション
   * @returns {object} 結果
   */
  sendWebPush(merchantId, message, options = {}) {
    if (typeof WebPushHandler !== 'undefined') {
      const payload = {
        title: options.title || 'くらべる通知',
        body: message,
        data: {
          cvId: options.cvId || '',
          url: '/franchise-dashboard/index.html'
        }
      };
      return WebPushHandler.sendPush(merchantId, payload);
    }

    console.warn('[UnifiedNotification] WebPushHandlerが見つかりません');
    return { success: false, error: 'Web Push未設定' };
  },

  /**
   * SMS送信（TwilioSmsHandler または MediaSmsHandler を使用）
   * @param {string} phone - 電話番号
   * @param {string} message - メッセージ本文
   * @param {object} options - オプション
   * @returns {object} 結果
   */
  sendSms(phone, message, options = {}) {
    // TwilioSmsHandler が存在すれば使用（後でMediaSmsHandlerに差し替え可能）
    if (typeof TwilioSmsHandler !== 'undefined' && TwilioSmsHandler.isConfigured()) {
      return TwilioSmsHandler.sendSms(phone, message, options);
    }

    // SMS設定なしの場合
    console.warn('[UnifiedNotification] SMSプロバイダーが設定されていません');
    return {
      success: false,
      error: 'SMSプロバイダーが設定されていません。管理者に連絡してください。'
    };
  },

  /**
   * 通知履歴を記録
   * @param {object} data - 履歴データ
   */
  recordNotificationHistory(data) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // 通知履歴シートを取得または作成
      let sheet = ss.getSheetByName('通知履歴');
      if (!sheet) {
        sheet = ss.insertSheet('通知履歴');
        sheet.getRange(1, 1, 1, 9).setValues([[
          '送信日時', 'チャネル', '対象', '加盟店ID', 'CV ID', '送信先', 'メッセージ', 'ステータス', '備考'
        ]]);
        sheet.setFrozenRows(1);
      }

      const now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'),
        data.channel || '',
        data.targetType || 'merchant',
        data.merchantId || '',
        data.cvId || '',
        data.toPhone || data.lineUserId || '',
        (data.message || '').substring(0, 100), // 100文字まで
        data.success ? '成功' : '失敗',
        data.error || ''
      ]);

      console.log('[UnifiedNotification] 履歴記録完了');

    } catch (error) {
      console.error('[UnifiedNotification] 履歴記録エラー:', error);
      // 履歴記録失敗はメイン処理に影響させない
    }
  },

  /**
   * 通知チャネルの状態を確認
   * @returns {object} 各チャネルの設定状態
   */
  getChannelStatus() {
    const lineConfigured = !!PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
    const webPushConfigured = typeof WebPushHandler !== 'undefined' && WebPushHandler.isConfigured();
    const smsConfigured = typeof TwilioSmsHandler !== 'undefined' && TwilioSmsHandler.isConfigured();

    return {
      line: {
        configured: lineConfigured,
        name: 'LINE',
        cost: '1円/通'
      },
      webPush: {
        configured: webPushConfigured,
        name: 'ブラウザ通知',
        cost: '無料'
      },
      sms: {
        configured: smsConfigured,
        provider: smsConfigured ? 'Twilio' : 'なし',
        name: 'SMS',
        cost: '8円〜/通'
      }
    };
  }

};

// グローバル関数として公開
function notifyMerchant(merchantId, message, options) {
  return UnifiedNotificationHandler.notifyMerchant(merchantId, message, options);
}

function notifyUser(phone, message, options) {
  return UnifiedNotificationHandler.notifyUser(phone, message, options);
}

function getNotificationChannelStatus() {
  return UnifiedNotificationHandler.getChannelStatus();
}
