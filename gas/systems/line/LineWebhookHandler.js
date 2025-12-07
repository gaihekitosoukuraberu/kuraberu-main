/**
 * ====================================
 * LINE Webhook Handler
 * ====================================
 *
 * LINE Messaging API からの Webhook イベントを処理
 * - follow: 友達追加時
 * - message: メッセージ受信時（加盟店ID連携用）
 */

const LineWebhookHandler = {

  /**
   * LINE Webhookイベントを処理
   * @param {Object} body - LINE Webhookのリクエストボディ
   * @return {Object} 処理結果
   */
  handleWebhook(body) {
    try {
      console.log('[LineWebhookHandler] Webhook received');

      if (!body.events || !Array.isArray(body.events)) {
        console.log('[LineWebhookHandler] No events in body');
        return { success: true, message: 'No events' };
      }

      const results = [];

      for (const event of body.events) {
        console.log('[LineWebhookHandler] Event type:', event.type);

        switch (event.type) {
          case 'follow':
            results.push(this.handleFollow(event));
            break;
          case 'message':
            results.push(this.handleMessage(event));
            break;
          case 'unfollow':
            results.push(this.handleUnfollow(event));
            break;
          default:
            console.log('[LineWebhookHandler] Unhandled event type:', event.type);
            results.push({ type: event.type, handled: false });
        }
      }

      return { success: true, results };

    } catch (error) {
      console.error('[LineWebhookHandler] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 友達追加イベント処理
   * @param {Object} event - LINEイベント
   */
  handleFollow(event) {
    try {
      const userId = event.source.userId;
      console.log('[LineWebhookHandler] Follow event from:', userId);

      // ウェルカムメッセージを送信
      const message = `友達追加ありがとうございます！

このアカウントは「外壁塗装くらべる」加盟店向けの通知システムです。

LINE連携を完了するには、ダッシュボードの設定画面に表示されている「連携コード」をこのチャットに送信してください。

例: LINK-XXXX-XXXX`;

      this.sendMessage(userId, message);

      return { type: 'follow', userId, success: true };

    } catch (error) {
      console.error('[LineWebhookHandler] Follow error:', error);
      return { type: 'follow', success: false, error: error.toString() };
    }
  },

  /**
   * メッセージ受信イベント処理
   * @param {Object} event - LINEイベント
   */
  handleMessage(event) {
    try {
      const userId = event.source.userId;
      const messageType = event.message.type;

      if (messageType !== 'text') {
        this.sendMessage(userId, 'テキストメッセージで連携コードを送信してください。');
        return { type: 'message', messageType, handled: false };
      }

      const text = event.message.text.trim();
      console.log('[LineWebhookHandler] Message from', userId, ':', text);

      // 連携コードのパターンチェック (LINK-XXXX-XXXX)
      const linkCodeMatch = text.match(/^LINK-([A-Z0-9]{4})-([A-Z0-9]{4})$/i);

      if (linkCodeMatch) {
        return this.processLinkCode(userId, text.toUpperCase());
      }

      // 加盟店IDのパターンチェック (FC-XXXXXX-XXXX)
      const merchantIdMatch = text.match(/^FC-\d{6}-[A-Z0-9]{4}$/i);

      if (merchantIdMatch) {
        return this.linkMerchantDirectly(userId, text.toUpperCase());
      }

      // パターンに合わない場合
      this.sendMessage(userId, `連携コードの形式が正しくありません。

ダッシュボードの設定画面に表示されている連携コード（LINK-XXXX-XXXX）を送信してください。`);

      return { type: 'message', handled: false, reason: 'Invalid format' };

    } catch (error) {
      console.error('[LineWebhookHandler] Message error:', error);
      return { type: 'message', success: false, error: error.toString() };
    }
  },

  /**
   * 連携コードを処理
   * @param {String} lineUserId - LINE ユーザーID
   * @param {String} linkCode - 連携コード
   */
  processLinkCode(lineUserId, linkCode) {
    try {
      console.log('[LineWebhookHandler] Processing link code:', linkCode);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const linkSheet = ss.getSheetByName('LINE連携コード');

      if (!linkSheet) {
        this.sendMessage(lineUserId, 'システムエラーが発生しました。管理者にお問い合わせください。');
        return { success: false, error: 'Link sheet not found' };
      }

      const data = linkSheet.getDataRange().getValues();
      let merchantId = null;
      let rowIndex = -1;

      // 連携コードを検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === linkCode && data[i][3] === '未使用') {
          merchantId = data[i][0];
          rowIndex = i + 1;
          break;
        }
      }

      if (!merchantId) {
        this.sendMessage(lineUserId, `連携コードが見つからないか、既に使用済みです。

ダッシュボードで新しい連携コードを発行してください。`);
        return { success: false, error: 'Link code not found or already used' };
      }

      // 加盟店にLINE IDを保存
      const saveResult = this.saveMerchantLineId(merchantId, lineUserId);

      if (saveResult.success) {
        // 連携コードを使用済みに更新
        linkSheet.getRange(rowIndex, 4).setValue('使用済み');
        linkSheet.getRange(rowIndex, 5).setValue(new Date());
        linkSheet.getRange(rowIndex, 6).setValue(lineUserId);

        this.sendMessage(lineUserId, `LINE連携が完了しました！

加盟店ID: ${merchantId}

今後、案件の通知などをこのLINEでお届けします。`);

        return { success: true, merchantId, lineUserId };
      } else {
        this.sendMessage(lineUserId, '連携処理中にエラーが発生しました。もう一度お試しください。');
        return saveResult;
      }

    } catch (error) {
      console.error('[LineWebhookHandler] processLinkCode error:', error);
      this.sendMessage(lineUserId, 'システムエラーが発生しました。');
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 加盟店IDで直接連携（管理者用）
   * @param {String} lineUserId - LINE ユーザーID
   * @param {String} merchantId - 加盟店ID
   */
  linkMerchantDirectly(lineUserId, merchantId) {
    try {
      console.log('[LineWebhookHandler] Direct link:', merchantId);

      // 管理者確認（LINE_ADMIN_USER_ID と一致するか）
      const adminUserId = PropertiesService.getScriptProperties().getProperty('LINE_ADMIN_USER_ID');

      if (lineUserId !== adminUserId) {
        this.sendMessage(lineUserId, `加盟店IDでの直接連携は管理者のみ可能です。

連携コード（LINK-XXXX-XXXX）を使用してください。`);
        return { success: false, error: 'Not admin' };
      }

      const saveResult = this.saveMerchantLineId(merchantId, lineUserId);

      if (saveResult.success) {
        this.sendMessage(lineUserId, `管理者権限でLINE連携しました。

加盟店ID: ${merchantId}`);
      } else {
        this.sendMessage(lineUserId, `連携に失敗しました: ${saveResult.error}`);
      }

      return saveResult;

    } catch (error) {
      console.error('[LineWebhookHandler] linkMerchantDirectly error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 友達解除イベント処理
   * @param {Object} event - LINEイベント
   */
  handleUnfollow(event) {
    try {
      const userId = event.source.userId;
      console.log('[LineWebhookHandler] Unfollow event from:', userId);

      // 加盟店のLINE IDをクリア
      this.clearLineIdByUserId(userId);

      return { type: 'unfollow', userId, success: true };

    } catch (error) {
      console.error('[LineWebhookHandler] Unfollow error:', error);
      return { type: 'unfollow', success: false, error: error.toString() };
    }
  },

  /**
   * 加盟店にLINE IDを保存
   * @param {String} merchantId - 加盟店ID
   * @param {String} lineUserId - LINE ユーザーID
   */
  saveMerchantLineId(merchantId, lineUserId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('加盟店登録');

      if (!sheet) {
        return { success: false, error: '加盟店登録シートが見つかりません' };
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // LINE ID列を探す（なければ追加）
      let lineIdCol = headers.indexOf('LINE_USER_ID');

      if (lineIdCol === -1) {
        // LINE_USER_ID列を追加
        lineIdCol = headers.length;
        sheet.getRange(1, lineIdCol + 1).setValue('LINE_USER_ID');
        console.log('[LineWebhookHandler] Added LINE_USER_ID column at:', lineIdCol + 1);
      }

      // 加盟店IDの列を探す
      const merchantIdCol = headers.indexOf('加盟店ID');
      if (merchantIdCol === -1) {
        return { success: false, error: '加盟店ID列が見つかりません' };
      }

      // 該当の加盟店を探してLINE IDを保存
      for (let i = 1; i < data.length; i++) {
        if (data[i][merchantIdCol] === merchantId) {
          sheet.getRange(i + 1, lineIdCol + 1).setValue(lineUserId);
          console.log('[LineWebhookHandler] Saved LINE ID for merchant:', merchantId);
          return { success: true, merchantId, lineUserId };
        }
      }

      return { success: false, error: '加盟店が見つかりません: ' + merchantId };

    } catch (error) {
      console.error('[LineWebhookHandler] saveMerchantLineId error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * LINE User IDから加盟店のLINE IDをクリア
   * @param {String} lineUserId - LINE ユーザーID
   */
  clearLineIdByUserId(lineUserId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('加盟店登録');

      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const lineIdCol = headers.indexOf('LINE_USER_ID');

      if (lineIdCol === -1) return;

      for (let i = 1; i < data.length; i++) {
        if (data[i][lineIdCol] === lineUserId) {
          sheet.getRange(i + 1, lineIdCol + 1).setValue('');
          console.log('[LineWebhookHandler] Cleared LINE ID at row:', i + 1);
        }
      }

    } catch (error) {
      console.error('[LineWebhookHandler] clearLineIdByUserId error:', error);
    }
  },

  /**
   * LINEメッセージを送信
   * @param {String} userId - 送信先LINE ユーザーID
   * @param {String} message - メッセージ本文
   */
  sendMessage(userId, message) {
    try {
      const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');

      if (!accessToken) {
        console.error('[LineWebhookHandler] LINE_ACCESS_TOKEN not set');
        return false;
      }

      const endpoint = 'https://api.line.me/v2/bot/message/push';

      const payload = {
        to: userId,
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
        console.log('[LineWebhookHandler] Message sent to:', userId);
        return true;
      } else {
        console.error('[LineWebhookHandler] Message send failed:', response.getContentText());
        return false;
      }

    } catch (error) {
      console.error('[LineWebhookHandler] sendMessage error:', error);
      return false;
    }
  },

  /**
   * 連携コードを生成
   * @param {String} merchantId - 加盟店ID
   * @return {Object} 生成結果（コードを含む）
   */
  generateLinkCode(merchantId) {
    try {
      // ランダムコード生成 (LINK-XXXX-XXXX)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外
      let code = 'LINK-';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code += '-';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // シートに保存
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName('LINE連携コード');

      if (!sheet) {
        sheet = ss.insertSheet('LINE連携コード');
        sheet.getRange(1, 1, 1, 6).setValues([['加盟店ID', '連携コード', '作成日時', 'ステータス', '使用日時', 'LINE_USER_ID']]);
        sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      // 既存の未使用コードを無効化
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId && data[i][3] === '未使用') {
          sheet.getRange(i + 1, 4).setValue('無効化');
        }
      }

      // 新しいコードを追加
      sheet.appendRow([merchantId, code, new Date(), '未使用', '', '']);

      console.log('[LineWebhookHandler] Generated link code:', code, 'for', merchantId);

      return { success: true, code, merchantId };

    } catch (error) {
      console.error('[LineWebhookHandler] generateLinkCode error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 加盟店のLINE連携状態を取得
   * @param {String} merchantId - 加盟店ID
   * @return {Object} 連携状態
   */
  getLinkStatus(merchantId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('加盟店登録');

      if (!sheet) {
        return { success: false, linked: false, error: 'Sheet not found' };
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const merchantIdCol = headers.indexOf('加盟店ID');
      const lineIdCol = headers.indexOf('LINE_USER_ID');

      if (merchantIdCol === -1) {
        return { success: false, linked: false, error: 'Merchant ID column not found' };
      }

      for (let i = 1; i < data.length; i++) {
        if (data[i][merchantIdCol] === merchantId) {
          const lineUserId = lineIdCol >= 0 ? data[i][lineIdCol] : '';
          return {
            success: true,
            linked: !!lineUserId,
            lineUserId: lineUserId || null
          };
        }
      }

      return { success: false, linked: false, error: 'Merchant not found' };

    } catch (error) {
      console.error('[LineWebhookHandler] getLinkStatus error:', error);
      return { success: false, linked: false, error: error.toString() };
    }
  }

};
