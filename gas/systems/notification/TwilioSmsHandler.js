/**
 * TwilioSmsHandler.js
 * Twilio APIを使用したSMS送信ハンドラー
 *
 * 使用方法:
 * 1. ScriptPropertiesに以下を設定:
 *    - TWILIO_ACCOUNT_SID: Twilioアカウント SID
 *    - TWILIO_AUTH_TOKEN: Twilio認証トークン
 *    - TWILIO_PHONE_NUMBER: Twilioの送信元電話番号（+81から始まる形式）
 */

const TwilioSmsHandler = {

  /**
   * Twilio設定を取得
   */
  getConfig() {
    const props = PropertiesService.getScriptProperties();
    return {
      accountSid: props.getProperty('TWILIO_ACCOUNT_SID'),
      authToken: props.getProperty('TWILIO_AUTH_TOKEN'),
      fromNumber: props.getProperty('TWILIO_PHONE_NUMBER')
    };
  },

  /**
   * 設定が有効かチェック
   */
  isConfigured() {
    const config = this.getConfig();
    return !!(config.accountSid && config.authToken && config.fromNumber);
  },

  /**
   * 電話番号を国際形式に変換
   * 例: 09012345678 -> +819012345678
   */
  formatPhoneNumber(phone) {
    // クリーンアップ
    let cleaned = phone.replace(/[-\s()（）]/g, '');

    // 既に+81で始まっている場合はそのまま
    if (cleaned.startsWith('+81')) {
      return cleaned;
    }

    // 81で始まっている場合は+を追加
    if (cleaned.startsWith('81')) {
      return '+' + cleaned;
    }

    // 0で始まる場合は+81に変換
    if (cleaned.startsWith('0')) {
      return '+81' + cleaned.substring(1);
    }

    // それ以外は+81を付与
    return '+81' + cleaned;
  },

  /**
   * SMS送信
   * @param {string} toPhone - 送信先電話番号
   * @param {string} message - メッセージ本文
   * @param {object} options - オプション（cvId, merchantId等）
   * @returns {object} 結果オブジェクト
   */
  sendSms(toPhone, message, options = {}) {
    console.log('[TwilioSmsHandler] SMS送信開始:', { toPhone, messageLength: message.length });

    // 設定チェック
    if (!this.isConfigured()) {
      console.error('[TwilioSmsHandler] Twilioが設定されていません');
      return {
        success: false,
        error: 'Twilioが設定されていません。管理者に連絡してください。'
      };
    }

    const config = this.getConfig();
    const formattedPhone = this.formatPhoneNumber(toPhone);

    console.log('[TwilioSmsHandler] 送信先:', formattedPhone);

    try {
      // Twilio API URL
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

      // 認証ヘッダー
      const authHeader = Utilities.base64Encode(`${config.accountSid}:${config.authToken}`);

      // リクエストボディ
      const payload = {
        'To': formattedPhone,
        'From': config.fromNumber,
        'Body': message
      };

      // POSTリクエスト
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: {
          'Authorization': 'Basic ' + authHeader
        },
        payload: payload,
        muteHttpExceptions: true
      });

      const responseCode = response.getResponseCode();
      const responseBody = JSON.parse(response.getContentText());

      console.log('[TwilioSmsHandler] レスポンス:', responseCode, responseBody.sid || responseBody.message);

      if (responseCode >= 200 && responseCode < 300) {
        // 送信成功 - 履歴を記録
        this.recordSmsHistory({
          success: true,
          toPhone: formattedPhone,
          message: message,
          twilioSid: responseBody.sid,
          ...options
        });

        return {
          success: true,
          sid: responseBody.sid,
          message: 'SMS送信完了'
        };
      } else {
        // エラー
        console.error('[TwilioSmsHandler] Twilioエラー:', responseBody);
        return {
          success: false,
          error: responseBody.message || 'SMS送信に失敗しました',
          code: responseBody.code
        };
      }

    } catch (error) {
      console.error('[TwilioSmsHandler] 例外:', error);
      return {
        success: false,
        error: error.message || 'SMS送信中にエラーが発生しました'
      };
    }
  },

  /**
   * SMS送信履歴を記録
   */
  recordSmsHistory(data) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // SMS履歴シートを取得または作成
      let sheet = ss.getSheetByName('SMS送信履歴');
      if (!sheet) {
        sheet = ss.insertSheet('SMS送信履歴');
        // ヘッダー行を追加
        sheet.getRange(1, 1, 1, 8).setValues([[
          '送信日時', 'CV ID', '加盟店ID', '送信先', 'メッセージ', 'Twilio SID', 'ステータス', '送信元'
        ]]);
        sheet.setFrozenRows(1);
      }

      // 履歴を追加
      const now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'),
        data.cvId || '',
        data.merchantId || '',
        data.toPhone || '',
        data.message || '',
        data.twilioSid || '',
        data.success ? '成功' : '失敗',
        'Twilio (PC)'
      ]);

      console.log('[TwilioSmsHandler] 履歴記録完了');

    } catch (error) {
      console.error('[TwilioSmsHandler] 履歴記録エラー:', error);
      // 履歴記録失敗はメイン処理に影響させない
    }
  }
};

// グローバル関数として公開（main.jsから呼び出し用）
function sendSmsByTwilio(toPhone, message, options) {
  return TwilioSmsHandler.sendSms(toPhone, message, options);
}

function isTwilioConfigured() {
  return TwilioSmsHandler.isConfigured();
}
