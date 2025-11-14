/**
 * ====================================
 * 通知ディスパッチャー
 * ====================================
 *
 * 【機能】
 * - マルチチャネル通知の統合管理
 * - ユーザー設定に基づいた通知ルーティング
 * - メール、LINE、ブラウザ通知の送信
 *
 * 【依存関係】
 * - NotificationSettingsManager（設定管理）
 * - NotificationTemplates（テンプレート生成）
 * - PropertiesService（API キー管理）
 *
 * 【使用例】
 * const result = NotificationDispatcher.dispatch('user123', 'FR123', 'cancelApproval', {
 *   customerName: '田中太郎',
 *   applicationId: 'APP001'
 * });
 */

const NotificationDispatcher = {

  /**
   * 通知タイプの定義
   */
  NOTIFICATION_TYPES: {
    CANCEL_APPROVAL: 'cancelApproval',
    CANCEL_REJECTION: 'cancelRejection',
    EXTENSION_APPROVAL: 'extensionApproval',
    EXTENSION_REJECTION: 'extensionRejection',
    APPOINTMENT_REMINDER: 'appointmentReminder',
    CALL_REMINDER: 'callReminder'
  },

  /**
   * メイン送信関数：ユーザー設定に基づいて適切なチャネルに通知を送信
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @param {String} notificationType - 通知タイプ
   * @param {Object} data - 通知データ
   * @return {Object} 送信結果
   */
  dispatch(userId, merchantId, notificationType, data) {
    try {
      console.log('[NotificationDispatcher] 通知配信開始:', {
        userId,
        merchantId,
        notificationType
      });

      // ユーザーの通知設定を取得
      const settings = NotificationSettingsManager.getSettings(userId, merchantId);

      // 通知テンプレートを生成
      const templates = NotificationTemplates.generate(notificationType, data);

      if (!templates) {
        console.error('[NotificationDispatcher] テンプレート生成失敗:', notificationType);
        return {
          success: false,
          message: 'テンプレートの生成に失敗しました'
        };
      }

      const results = {
        email: { sent: false, enabled: false },
        line: { sent: false, enabled: false },
        browser: { sent: false, enabled: false }
      };

      // メール通知
      if (settings.email && templates.email) {
        console.log('[NotificationDispatcher] メール送信開始');
        results.email.enabled = true;
        const emailResult = this.sendEmail(userId, merchantId, templates.email);
        results.email.sent = emailResult.success;
        results.email.details = emailResult;
      }

      // LINE通知
      if (settings.line && templates.line) {
        console.log('[NotificationDispatcher] LINE送信開始');
        results.line.enabled = true;
        const lineResult = this.sendLINE(userId, templates.line);
        results.line.sent = lineResult.success;
        results.line.details = lineResult;
      }

      // ブラウザ通知（フロントエンド用データを保存）
      if (settings.browser && templates.browser) {
        console.log('[NotificationDispatcher] ブラウザ通知登録開始');
        results.browser.enabled = true;
        const browserResult = this.saveBrowserNotification(userId, merchantId, templates.browser);
        results.browser.sent = browserResult.success;
        results.browser.details = browserResult;
      }

      // 少なくとも1つのチャネルで送信成功したか
      const anySent = results.email.sent || results.line.sent || results.browser.sent;

      console.log('[NotificationDispatcher] 通知配信完了:', JSON.stringify(results));

      return {
        success: anySent,
        message: anySent ? '通知を送信しました' : '有効な通知チャネルがありません',
        details: results
      };

    } catch (error) {
      console.error('[NotificationDispatcher] 配信エラー:', error);
      return {
        success: false,
        message: '通知の送信に失敗しました: ' + error.toString()
      };
    }
  },

  /**
   * 加盟店の全ユーザーに通知を送信
   * @param {String} merchantId - 加盟店ID
   * @param {String} notificationType - 通知タイプ
   * @param {Object} data - 通知データ
   * @return {Object} 送信結果
   */
  dispatchToMerchant(merchantId, notificationType, data) {
    try {
      console.log('[NotificationDispatcher] 加盟店通知配信開始:', merchantId);

      const users = NotificationSettingsManager.getMerchantUsers(merchantId);

      if (users.length === 0) {
        console.log('[NotificationDispatcher] 通知先ユーザーが見つかりません');
        return {
          success: false,
          message: '通知先ユーザーが見つかりません'
        };
      }

      const results = [];

      users.forEach((user) => {
        const result = this.dispatch(user.userId, merchantId, notificationType, data);
        results.push({
          userId: user.userId,
          ...result
        });
      });

      const successCount = results.filter(r => r.success).length;

      console.log('[NotificationDispatcher] 加盟店通知配信完了:', successCount, '/', users.length);

      return {
        success: successCount > 0,
        message: `${successCount}/${users.length} ユーザーに通知しました`,
        details: results
      };

    } catch (error) {
      console.error('[NotificationDispatcher] 加盟店通知配信エラー:', error);
      return {
        success: false,
        message: '加盟店への通知に失敗しました: ' + error.toString()
      };
    }
  },

  /**
   * メール送信
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @param {Object} emailTemplate - メールテンプレート
   * @return {Object} 送信結果
   */
  sendEmail(userId, merchantId, emailTemplate) {
    try {
      // ユーザーのメールアドレスを取得（ユーザー管理シートから）
      const emailAddress = this._getUserEmail(userId, merchantId);

      if (!emailAddress) {
        console.error('[NotificationDispatcher] メールアドレスが見つかりません:', userId);
        return {
          success: false,
          message: 'メールアドレスが登録されていません'
        };
      }

      // GmailApp または MailApp を使用してメール送信
      if (emailTemplate.html) {
        // HTMLメール
        GmailApp.sendEmail(emailAddress, emailTemplate.subject, emailTemplate.body, {
          htmlBody: emailTemplate.html,
          name: '外壁塗装くらべるAI'
        });
      } else {
        // テキストメール
        MailApp.sendEmail(emailAddress, emailTemplate.subject, emailTemplate.body);
      }

      console.log('[NotificationDispatcher] メール送信成功:', emailAddress);

      return {
        success: true,
        message: 'メールを送信しました',
        to: emailAddress
      };

    } catch (error) {
      console.error('[NotificationDispatcher] メール送信エラー:', error);
      return {
        success: false,
        message: 'メールの送信に失敗しました: ' + error.toString()
      };
    }
  },

  /**
   * LINE送信
   * @param {String} userId - ユーザーID
   * @param {Object} lineTemplate - LINEテンプレート
   * @return {Object} 送信結果
   */
  sendLINE(userId, lineTemplate) {
    try {
      const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');

      if (!accessToken) {
        console.error('[NotificationDispatcher] LINE_ACCESS_TOKENが設定されていません');
        return {
          success: false,
          message: 'LINE設定エラー'
        };
      }

      // ユーザーのLINE IDを取得（ユーザー管理シートから）
      const lineUserId = this._getUserLineId(userId);

      if (!lineUserId) {
        console.error('[NotificationDispatcher] LINE IDが見つかりません:', userId);
        return {
          success: false,
          message: 'LINE IDが登録されていません'
        };
      }

      // LINE Messaging API Push Message
      const endpoint = 'https://api.line.me/v2/bot/message/push';

      const payload = {
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: lineTemplate.message
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

      if (response.getResponseCode() === 200) {
        console.log('[NotificationDispatcher] LINE送信成功:', lineUserId);
        return {
          success: true,
          message: 'LINEメッセージを送信しました',
          to: lineUserId
        };
      } else {
        console.error('[NotificationDispatcher] LINE送信失敗:', response.getContentText());
        return {
          success: false,
          message: 'LINEメッセージの送信に失敗しました'
        };
      }

    } catch (error) {
      console.error('[NotificationDispatcher] LINE送信エラー:', error);
      return {
        success: false,
        message: 'LINEメッセージの送信に失敗しました: ' + error.toString()
      };
    }
  },

  /**
   * ブラウザ通知をシートに保存（フロントエンドが取得）
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @param {Object} browserTemplate - ブラウザ通知テンプレート
   * @return {Object} 保存結果
   */
  saveBrowserNotification(userId, merchantId, browserTemplate) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName('ブラウザ通知');

      // シートが存在しない場合は作成
      if (!sheet) {
        sheet = ss.insertSheet('ブラウザ通知');
        const headers = ['通知ID', 'ユーザーID', '加盟店ID', 'タイトル', 'メッセージ', '既読', '作成日時'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      const notificationId = 'NOTIF_' + new Date().getTime();
      const timestamp = new Date();

      const rowData = [
        notificationId,
        userId,
        merchantId,
        browserTemplate.title,
        browserTemplate.body,
        '未読',
        timestamp
      ];

      sheet.appendRow(rowData);

      console.log('[NotificationDispatcher] ブラウザ通知保存成功:', notificationId);

      return {
        success: true,
        message: 'ブラウザ通知を登録しました',
        notificationId: notificationId
      };

    } catch (error) {
      console.error('[NotificationDispatcher] ブラウザ通知保存エラー:', error);
      return {
        success: false,
        message: 'ブラウザ通知の保存に失敗しました: ' + error.toString()
      };
    }
  },

  /**
   * ユーザーのメールアドレスを取得
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @return {String} メールアドレス
   * @private
   */
  _getUserEmail(userId, merchantId) {
    try {
      // TODO: 実際のユーザー管理シートから取得する実装
      // 現在は仮実装（加盟店管理シートから取得）
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const merchantSheet = ss.getSheetByName('加盟店管理');

      if (!merchantSheet) {
        console.error('[NotificationDispatcher] 加盟店管理シートが見つかりません');
        return null;
      }

      const data = merchantSheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId) {
          // E列（4番目）にメールアドレスがあると仮定
          return data[i][4] || null;
        }
      }

      return null;

    } catch (error) {
      console.error('[NotificationDispatcher] メールアドレス取得エラー:', error);
      return null;
    }
  },

  /**
   * ユーザーのLINE IDを取得
   * @param {String} userId - ユーザーID
   * @return {String} LINE ID
   * @private
   */
  _getUserLineId(userId) {
    try {
      // TODO: 実際のユーザー管理シートから取得する実装
      // 現在は仮実装
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const userSheet = ss.getSheetByName('ユーザー管理');

      if (!userSheet) {
        console.log('[NotificationDispatcher] ユーザー管理シートが見つかりません');
        return null;
      }

      const data = userSheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId) {
          // LINE ID列から取得（仮: F列）
          return data[i][5] || null;
        }
      }

      return null;

    } catch (error) {
      console.error('[NotificationDispatcher] LINE ID取得エラー:', error);
      return null;
    }
  }

};
