/**
 * ====================================
 * Slack承認システム
 * ====================================
 * 完全独立モジュール
 * 他システムに影響を与えない設計
 */

const SlackApprovalSystem = {
  /**
   * Slackインタラクション処理
   * POSTリクエストのエントリーポイント
   */
  handlePost: function(e) {
    try {
      // Slackからのpayloadを取得
      const payload = e.parameter.payload ?
        JSON.parse(e.parameter.payload) :
        null;

      if (!payload) {
        console.log('[SlackApproval] ERROR: payloadがありません');
        return this.createSlackResponse('Payload not found');
      }

      // ブロックアクション（ボタン押下）の処理
      if (payload.type === 'block_actions') {
        return this.handleBlockActions(payload);
      }

      // モーダル送信処理
      if (payload.type === 'view_submission') {
        return this.handleViewSubmission(payload);
      }

      return this.createSlackResponse('Unknown interaction type');

    } catch (error) {
      console.error('[SlackApproval] エラー:', error);
      return this.createSlackResponse('Error: ' + error.toString());
    }
  },

  /**
   * ブロックアクション（承認/却下ボタン）処理
   */
  handleBlockActions: function(payload) {
    try {
      // 🚀 Bot Tokenを最初に一度だけ取得（パフォーマンス最適化）
      const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');

      const action = payload.actions[0];
      const user = payload.user?.name || payload.user?.username || payload.user?.id || 'Slackユーザー';
      const triggerId = payload.trigger_id;

      // 承認ボタン
      if (action.action_id === 'approve_registration') {
        console.log('[SlackApproval] 承認ボタン押下検出');
        const registrationId = action.value.replace('approve_', '');
        console.log('[SlackApproval] 処理対象ID:', registrationId);
        const result = this.approveRegistration(registrationId, user);
        console.log('[SlackApproval] 承認処理結果:', JSON.stringify(result));

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '✅ 承認済み', registrationId, user);
        return this.createSlackResponse();
      }

      // サイレントで承認ボタン（V1695）
      else if (action.action_id === 'approve_silent_registration') {
        console.log('[SlackApproval] サイレント承認ボタン押下検出');
        const registrationId = action.value.replace('approve_silent_', '');
        console.log('[SlackApproval] 処理対象ID:', registrationId);
        const result = this.approveSilentRegistration(registrationId, user);
        console.log('[SlackApproval] サイレント承認処理結果:', JSON.stringify(result));

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '🔇 サイレント承認済み', registrationId, user);
        return this.createSlackResponse();
      }

      // 却下ボタン
      else if (action.action_id === 'reject_registration') {
        const registrationId = action.value.replace('reject_', '');
        const result = this.rejectRegistration(registrationId, user);

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '❌ 却下済み', registrationId, user);
        return this.createSlackResponse();
      }

      // キャンセル申請承認ボタン
      else if (action.action_id === 'approve_cancel_report') {
        console.log('[SlackApproval] キャンセル申請承認ボタン押下検出');
        const applicationId = action.value.replace('approve_cancel_', '');
        console.log('[SlackApproval] 処理対象ID:', applicationId);
        const result = this.approveCancelReport(applicationId, user);
        console.log('[SlackApproval] キャンセル申請承認処理結果:', JSON.stringify(result));

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '✅ キャンセル申請承認済み', applicationId, user);
        return this.createSlackResponse();
      }

      // キャンセル申請却下プルダウン選択
      else if (action.action_id === 'reject_cancel_select') {
        const selectedValue = action.selected_option.value;
        let [applicationId, rejectionReason] = selectedValue.split('::');
        const cleanId = applicationId.replace('reject_cancel_', '');

        // 🔥 DEADLINE_TEXT の場合は動的に期限情報を埋め込む
        if (rejectionReason === 'DEADLINE_TEXT') {
          const applicationData = this.getCancelApplicationData(cleanId);
          if (applicationData && applicationData.cancelDeadline) {
            const deadlineDate = new Date(applicationData.cancelDeadline);
            const formattedDeadline = Utilities.formatDate(deadlineDate, 'JST', 'yyyy年MM月dd日');
            rejectionReason = `キャンセル申請期限は${formattedDeadline}です。期限までは引き続き追客をお願いいたします。`;
          } else {
            rejectionReason = '期限までは引き続き追客をお願いいたします。';
          }
        }

        const result = this.rejectCancelReport(cleanId, user, rejectionReason);

        // 却下通知送信
        const notificationResult = this.sendRejectionNotification(cleanId, rejectionReason, 'cancel');

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '❌ キャンセル申請却下済み', cleanId, user);
        return this.createSlackResponse();
      }

      // キャンセル申請却下カスタムボタン -> モーダルを開く
      else if (action.action_id === 'reject_cancel_report') {
        const applicationId = action.value.replace('reject_cancel_', '');
        const channelId = payload.channel?.id || payload.container?.channel_id;
        let messageTs = payload.message?.ts || payload.container?.message_ts;

        // Message TSを文字列に変換して精度保持
        if (messageTs && typeof messageTs === 'number') {
          messageTs = messageTs.toString();
        }

        // モーダルを開く
        this.openCancelRejectionModal(triggerId, applicationId, user, channelId, messageTs, botToken);
        return this.createSlackResponse();
      }

      // 期限延長申請承認ボタン
      else if (action.action_id === 'approve_extension_request') {
        console.log('[SlackApproval] 期限延長申請承認ボタン押下検出');
        const extensionId = action.value.replace('approve_extension_', '');
        console.log('[SlackApproval] 処理対象ID:', extensionId);
        const result = this.approveExtensionRequest(extensionId, user);
        console.log('[SlackApproval] 期限延長申請承認処理結果:', JSON.stringify(result));

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '✅ 期限延長申請承認済み', extensionId, user);
        return this.createSlackResponse();
      }

      // 期限延長申請却下プルダウン選択
      else if (action.action_id === 'reject_extension_select') {
        const selectedValue = action.selected_option.value;
        const [extensionId, rejectionReason] = selectedValue.split('::');
        const cleanId = extensionId.replace('reject_extension_', '');

        const result = this.rejectExtensionRequest(cleanId, user, rejectionReason);

        // 却下通知送信
        const notificationResult = this.sendRejectionNotification(cleanId, rejectionReason, 'extension');

        // Slackメッセージを更新
        this.updateSlackMessage(payload, '❌ 期限延長申請却下済み', cleanId, user);
        return this.createSlackResponse();
      }

      // 期限延長申請却下カスタムボタン -> モーダルを開く
      else if (action.action_id === 'reject_extension_request') {
        const extensionId = action.value.replace('reject_extension_', '');
        const channelId = payload.channel?.id || payload.container?.channel_id;
        let messageTs = payload.message?.ts || payload.container?.message_ts;

        // Message TSを文字列に変換して小数点以下を保持
        if (messageTs && typeof messageTs === 'number') {
          messageTs = messageTs.toString();
        }

        // モーダルを開く
        this.openExtensionRejectionModal(triggerId, extensionId, user, channelId, messageTs, botToken);
        return this.createSlackResponse();
      }

      return this.createSlackResponse('Unknown action');

    } catch (error) {
      console.error('[SlackApproval] Block action error:', error);
      return this.createSlackResponse('Error: ' + error.toString());
    }
  },

  /**
   * 承認処理
   */
  approveRegistration: function(registrationId, approver) {
    console.log('[SlackApproval.approve] ==== 承認処理開始（AdminSystemに委譲）====');
    console.log('[SlackApproval.approve] ID:', registrationId, 'Approver:', approver);

    try {
      // AdminSystem.approveRegistrationを呼び出し（V1696）
      if (typeof AdminSystem === 'undefined' || typeof AdminSystem.approveRegistration !== 'function') {
        throw new Error('AdminSystem.approveRegistration が見つかりません');
      }

      const result = AdminSystem.approveRegistration({
        registrationId: registrationId,
        approver: approver
      });

      if (result.success) {
        console.log('[SlackApproval] AdminSystem承認成功:', registrationId);

        // Slack承認通知を送信
        const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const idIndex = headers.indexOf('登録ID');

        let targetRow = -1;
        for (let i = 1; i < data.length; i++) {
          if (data[i][idIndex] === registrationId) {
            targetRow = i;
            break;
          }
        }

        if (targetRow !== -1) {
          this.sendApprovalNotification(data[targetRow], registrationId);
        }
      } else {
        console.error('[SlackApproval] AdminSystem承認失敗:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval] 承認エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * サイレント承認処理（V1695）
   * AdminSystem.approveSilentRegistrationを呼び出す
   */
  approveSilentRegistration: function(registrationId, approver) {
    console.log('[SlackApproval.approveSilent] ==== サイレント承認処理開始 ====');
    console.log('[SlackApproval.approveSilent] ID:', registrationId, 'Approver:', approver);

    try {
      // AdminSystem.approveSilentRegistrationを呼び出し
      if (typeof AdminSystem === 'undefined' || typeof AdminSystem.approveSilentRegistration !== 'function') {
        throw new Error('AdminSystem.approveSilentRegistration が見つかりません');
      }

      const result = AdminSystem.approveSilentRegistration({
        registrationId: registrationId,
        approver: approver
      });

      if (result.success) {
        console.log('[SlackApproval.approveSilent] サイレント承認成功:', registrationId);

        // Slack承認通知を送信
        const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const idIndex = headers.indexOf('登録ID');

        let targetRow = -1;
        for (let i = 1; i < data.length; i++) {
          if (data[i][idIndex] === registrationId) {
            targetRow = i;
            break;
          }
        }

        if (targetRow !== -1) {
          this.sendSilentApprovalNotification(data[targetRow], registrationId);
        }
      } else {
        console.error('[SlackApproval.approveSilent] サイレント承認失敗:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval.approveSilent] エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 却下処理
   */
  rejectRegistration: function(registrationId, rejector, reason = 'Slackから却下') {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');

      if (!sheet) {
        throw new Error('シートが見つかりません');
      }

      // ヘッダーとデータを取得
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // カラムインデックスを動的に取得
      const idIndex = headers.indexOf('登録ID');
      const statusIndex = headers.indexOf('ステータス');
      const approvalStatusIndex = headers.indexOf('承認ステータス');
      let approverIndex = headers.indexOf('承認者');
      let rejectReasonIndex = headers.indexOf('却下理由');

      // 承認者カラムが存在しない場合は追加
      if (approverIndex === -1) {
        const lastColumn = headers.length;
        sheet.getRange(1, lastColumn + 1).setValue('承認者');
        approverIndex = lastColumn;
        // 却下理由も一緒にチェック
        if (rejectReasonIndex === -1) {
          sheet.getRange(1, lastColumn + 2).setValue('却下理由');
          rejectReasonIndex = lastColumn + 1;
        }
      } else if (rejectReasonIndex === -1) {
        // 承認者カラムがあるが却下理由カラムがない場合
        const lastColumn = headers.length;
        sheet.getRange(1, lastColumn + 1).setValue('却下理由');
        rejectReasonIndex = lastColumn;
      }

      // 登録IDで該当行を検索
      let targetRow = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow === -1) {
        throw new Error('登録IDが見つかりません: ' + registrationId);
      }

      // ステータス更新
      // 承認ステータス → "却下"
      sheet.getRange(targetRow, approvalStatusIndex + 1).setValue('却下');
      // ステータス → "却下"
      sheet.getRange(targetRow, statusIndex + 1).setValue('却下');
      // 承認者（却下者） → 実際のSlackユーザー名を使用
      sheet.getRange(targetRow, approverIndex + 1).setValue(rejector);
      // 却下理由
      if (rejectReasonIndex !== -1) {
        sheet.getRange(targetRow, rejectReasonIndex + 1).setValue(reason);
      }

      console.log('[SlackApproval] 却下完了:', registrationId);

      return {
        success: true,
        message: '却下完了',
        registrationId: registrationId
      };

    } catch (error) {
      console.error('[SlackApproval] 却下エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Slack承認通知送信
   */
  sendApprovalNotification: function(rowData, registrationId) {
    try {
      const SLACK_WEBHOOK = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

      if (!SLACK_WEBHOOK) {
        console.log('[SlackApproval] 承認通知Webhook未設定');
        return;
      }

      const companyName = rowData[2]; // C列: 会社名
      const representative = rowData[6]; // G列: 代表者名

      const message = {
        text: '加盟店登録が承認されました',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ 加盟店登録承認完了'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*登録ID:*\n${registrationId}`
              },
              {
                type: 'mrkdwn',
                text: `*会社名:*\n${companyName}`
              },
              {
                type: 'mrkdwn',
                text: `*代表者:*\n${representative}`
              },
              {
                type: 'mrkdwn',
                text: `*ステータス:*\n承認済み ✅`
              }
            ]
          }
        ]
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      };

      UrlFetchApp.fetch(SLACK_WEBHOOK, options);
      console.log('[SlackApproval] 承認通知送信完了');

    } catch (error) {
      console.error('[SlackApproval] 承認通知エラー:', error);
    }
  },

  /**
   * Slackサイレント承認通知送信（V1695）
   */
  sendSilentApprovalNotification: function(rowData, registrationId) {
    try {
      const SLACK_WEBHOOK = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

      if (!SLACK_WEBHOOK) {
        console.log('[SlackApproval] サイレント承認通知Webhook未設定');
        return;
      }

      const companyName = rowData[2]; // C列: 会社名
      const representative = rowData[6]; // G列: 代表者名

      const message = {
        text: '加盟店登録がサイレント承認されました',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔇 加盟店登録サイレント承認完了'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*登録ID:*\n${registrationId}`
              },
              {
                type: 'mrkdwn',
                text: `*会社名:*\n${companyName}`
              },
              {
                type: 'mrkdwn',
                text: `*代表者:*\n${representative}`
              },
              {
                type: 'mrkdwn',
                text: `*ステータス:*\nサイレント承認済み 🔇`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '⚠️ この業者はランキング表示されません（サイレントフラグ: TRUE）'
              }
            ]
          }
        ]
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      };

      UrlFetchApp.fetch(SLACK_WEBHOOK, options);
      console.log('[SlackApproval] サイレント承認通知送信完了');

    } catch (error) {
      console.error('[SlackApproval] サイレント承認通知エラー:', error);
    }
  },

  /**
   * Slackメッセージ更新
   */
  updateSlackMessage: function(payload, status, registrationId, user) {
    try {
      const responseUrl = payload.response_url;
      if (!responseUrl) {
        console.log('[SlackApproval] response_urlがありません');
        return;
      }

      // 元のメッセージを更新
      const originalMessage = payload.message;
      const updatedBlocks = [...originalMessage.blocks];

      // ボタンを削除して、ステータステキストに置き換え
      const actionsIndex = updatedBlocks.findIndex(block => block.type === 'actions');
      if (actionsIndex !== -1) {
        updatedBlocks[actionsIndex] = {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${status} by ${user} at ${new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'})}`
          }
        };
      }

      const updateMessage = {
        replace_original: true,
        blocks: updatedBlocks
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(updateMessage),
        muteHttpExceptions: true
      };

      UrlFetchApp.fetch(responseUrl, options);
      console.log('[SlackApproval] メッセージ更新完了');

    } catch (error) {
      console.error('[SlackApproval] メッセージ更新エラー:', error);
    }
  },

  /**
   * キャンセル申請承認処理
   */
  approveCancelReport: function(applicationId, approver) {
    console.log('[SlackApproval.approveCancelReport] 承認処理開始（AdminCancelSystemに委譲）');
    console.log('[SlackApproval.approveCancelReport] ID:', applicationId, 'Approver:', approver);

    try {
      // AdminCancelSystem.approveCancelReportを呼び出し
      if (typeof AdminCancelSystem === 'undefined' || typeof AdminCancelSystem.approveCancelReport !== 'function') {
        throw new Error('AdminCancelSystem.approveCancelReport が見つかりません');
      }

      const result = AdminCancelSystem.approveCancelReport({
        applicationId: applicationId,
        approverName: approver
      });

      if (result.success) {
        console.log('[SlackApproval] キャンセル申請承認成功:', applicationId);

        // 🔥 加盟店に承認通知を送信 🔥
        this.sendApprovalNotificationToMerchant(applicationId, approver, 'cancel');
      } else {
        console.error('[SlackApproval] キャンセル申請承認失敗:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval] キャンセル申請承認エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * キャンセル申請却下処理
   */
  rejectCancelReport: function(applicationId, rejector, reason = 'Slackから却下') {
    console.log('[SlackApproval.rejectCancelReport] 却下処理開始（AdminCancelSystemに委譲）');
    console.log('[SlackApproval.rejectCancelReport] ID:', applicationId, 'Rejector:', rejector);

    try {
      // AdminCancelSystem.rejectCancelReportを呼び出し
      if (typeof AdminCancelSystem === 'undefined' || typeof AdminCancelSystem.rejectCancelReport !== 'function') {
        throw new Error('AdminCancelSystem.rejectCancelReport が見つかりません');
      }

      const result = AdminCancelSystem.rejectCancelReport({
        applicationId: applicationId,
        approverName: rejector,
        rejectReason: reason
      });

      if (result.success) {
        console.log('[SlackApproval] キャンセル申請却下成功:', applicationId);
      } else {
        console.error('[SlackApproval] キャンセル申請却下失敗:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval] キャンセル申請却下エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 期限延長申請承認処理
   */
  approveExtensionRequest: function(extensionId, approver) {
    console.log('[SlackApproval.approveExtensionRequest] 承認処理開始（AdminCancelSystemに委譲）');
    console.log('[SlackApproval.approveExtensionRequest] ID:', extensionId, 'Approver:', approver);

    try {
      // AdminCancelSystem.approveExtensionRequestを呼び出し
      if (typeof AdminCancelSystem === 'undefined' || typeof AdminCancelSystem.approveExtensionRequest !== 'function') {
        throw new Error('AdminCancelSystem.approveExtensionRequest が見つかりません');
      }

      const result = AdminCancelSystem.approveExtensionRequest({
        extensionId: extensionId,
        approverName: approver
      });

      if (result.success) {
        console.log('[SlackApproval] 期限延長申請承認成功:', extensionId);

        // 🔥 加盟店に承認通知を送信 🔥
        this.sendApprovalNotificationToMerchant(extensionId, approver, 'extension');
      } else {
        console.error('[SlackApproval] 期限延長申請承認失敗:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval] 期限延長申請承認エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 期限延長申請却下処理
   */
  rejectExtensionRequest: function(extensionId, rejector, reason = 'Slackから却下') {
    console.log('[SlackApproval.rejectExtensionRequest] 却下処理開始（AdminCancelSystemに委譲）');
    console.log('[SlackApproval.rejectExtensionRequest] ID:', extensionId, 'Rejector:', rejector);

    try {
      // AdminCancelSystem.rejectExtensionRequestを呼び出し
      if (typeof AdminCancelSystem === 'undefined' || typeof AdminCancelSystem.rejectExtensionRequest !== 'function') {
        throw new Error('AdminCancelSystem.rejectExtensionRequest が見つかりません');
      }

      const result = AdminCancelSystem.rejectExtensionRequest({
        extensionId: extensionId,
        approverName: rejector,
        rejectReason: reason
      });

      if (result.success) {
        console.log('[SlackApproval] 期限延長申請却下成功:', extensionId);
      } else {
        console.error('[SlackApproval] 期限延長申請却下失敗:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval] 期限延長申請却下エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Slack用レスポンス作成
   */
  createSlackResponse: function(text = '') {
    // Slackには常に200 OKを返す（空のJSONレスポンス）
    return ContentService
      .createTextOutput(JSON.stringify({}))
      .setMimeType(ContentService.MimeType.JSON);
  },

  /**
   * デバッグ用：カラム情報表示
   */
  debugColumnInfo: function() {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      console.log('[SlackApproval.debug] Total columns:', headers.length);
      headers.forEach((header, index) => {
        console.log(`[SlackApproval.debug] Column ${index + 1}: "${header}"`);
      });

      // 重要カラムのインデックスを表示
      console.log('[SlackApproval.debug] Key column indices:');
      console.log('  登録ID:', headers.indexOf('登録ID'));
      console.log('  ステータス:', headers.indexOf('ステータス'));
      console.log('  承認ステータス:', headers.indexOf('承認ステータス'));
      console.log('  登録日時:', headers.indexOf('登録日時'));
      console.log('  承認者:', headers.indexOf('承認者'));
      console.log('  却下理由:', headers.indexOf('却下理由'));

      return {
        success: true,
        headers: headers,
        columnCount: headers.length
      };

    } catch (error) {
      console.error('[SlackApproval.debug] エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * キャンセル申請却下モーダルを開く
   * @param {String} triggerId - Slack trigger ID
   * @param {String} applicationId - 申請ID
   * @param {String} user - ユーザー名
   * @param {String} channelId - Slack channel ID
   * @param {String} messageTs - Slack message timestamp
   * @param {String} botToken - Slack Bot Token
   */
  openCancelRejectionModal: function(triggerId, applicationId, user, channelId, messageTs, botToken) {
    try {
      const aiReason = '追客回数が不足しているため、キャンセルは承認できません。お客様のニーズを十分に把握するため、もう少し追客を続けてください。';

      // モーダルビューを構築
      const modalView = {
        type: 'modal',
        callback_id: 'cancel_rejection_modal',
        title: {
          type: 'plain_text',
          text: 'キャンセル申請却下'
        },
        submit: {
          type: 'plain_text',
          text: '却下を確定'
        },
        close: {
          type: 'plain_text',
          text: 'キャンセル'
        },
        private_metadata: JSON.stringify({
          applicationId: applicationId,
          user: user,
          channelId: channelId,
          messageTs: String(messageTs)  // 🔥 文字列に変換してからJSON化（精度保持）
        }),
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*キャンセル申請却下*\n申請ID: ${applicationId}`
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'input',
            block_id: 'rejection_reason_block',
            label: {
              type: 'plain_text',
              text: '却下理由（編集可能）'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'rejection_reason_input',
              multiline: true,
              initial_value: aiReason,
              placeholder: {
                type: 'plain_text',
                text: '却下理由を入力してください'
              }
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'ℹ️ 却下理由を編集してください'
              }
            ]
          }
        ]
      };

      // Slack API (views.open) を呼び出し
      this.openSlackModal(triggerId, modalView, botToken);

    } catch (error) {
      console.error('[SlackApproval] モーダル表示エラー:', error);
    }
  },

  /**
   * 期限延長申請却下モーダルを開く
   * @param {String} triggerId - Slack trigger ID
   * @param {String} extensionId - 申請ID
   * @param {String} user - ユーザー名
   * @param {String} channelId - Slack channel ID
   * @param {String} messageTs - Slack message timestamp
   * @param {String} botToken - Slack Bot Token
   */
  openExtensionRejectionModal: function(triggerId, extensionId, user, channelId, messageTs, botToken) {
    try {
      const aiReason = '期限延長の理由が不十分です。より具体的な理由とアポイント予定日を明記して再申請してください。';

      // モーダルビューを構築
      const modalView = {
        type: 'modal',
        callback_id: 'extension_rejection_modal',
        title: {
          type: 'plain_text',
          text: '期限延長申請却下'
        },
        submit: {
          type: 'plain_text',
          text: '却下を確定'
        },
        close: {
          type: 'plain_text',
          text: 'キャンセル'
        },
        private_metadata: JSON.stringify({
          extensionId: extensionId,
          user: user,
          channelId: channelId,
          messageTs: String(messageTs)  // 🔥 文字列に変換してからJSON化（精度保持）
        }),
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*期限延長申請却下*\n申請ID: ${extensionId}`
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'input',
            block_id: 'rejection_reason_block',
            label: {
              type: 'plain_text',
              text: '却下理由（編集可能）'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'rejection_reason_input',
              multiline: true,
              initial_value: aiReason,
              placeholder: {
                type: 'plain_text',
                text: '却下理由を入力してください'
              }
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'ℹ️ 却下理由を編集してください'
              }
            ]
          }
        ]
      };

      // Slack API (views.open) を呼び出し
      this.openSlackModal(triggerId, modalView, botToken);

    } catch (error) {
      console.error('[SlackApproval] モーダル表示エラー:', error);
    }
  },

  /**
   * Slackモーダルを開く（views.open API呼び出し）
   * @param {String} triggerId - Trigger ID
   * @param {Object} modalView - モーダルビュー定義
   * @param {String} botToken - Slack Bot Token
   */
  openSlackModal: function(triggerId, modalView, botToken) {
    try {
      if (!botToken) {
        console.error('[SlackApproval] SLACK_BOT_TOKENが設定されていません');
        return;
      }

      const payload = {
        trigger_id: triggerId,
        view: modalView
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + botToken
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch('https://slack.com/api/views.open', options);
      const responseData = JSON.parse(response.getContentText());

      if (!responseData.ok) {
        console.error('[SlackApproval] モーダル表示失敗:', responseData.error);
      }

    } catch (error) {
      console.error('[SlackApproval] Slackモーダル表示エラー:', error);
    }
  },

  /**
   * モーダル送信処理（view_submission）
   * 🚨 重要: Slackは3秒以内のレスポンスを要求するため、即座に応答を返す
   * @param {Object} payload - Slackペイロード
   */
  handleViewSubmission: function(payload) {
    console.log('[SlackApproval] ========== VIEW_SUBMISSION START ==========');

    // 🚨 最速レスポンス: データ保存して即座に200 OKを返す
    // 処理は時間制限トリガーで別途実行する

    try {
      const callbackId = payload.view.callback_id;
      const user = payload.user?.name || payload.user?.username || payload.user?.id || 'Slackユーザー';
      const privateMetadata = JSON.parse(payload.view.private_metadata);
      const rejectionReason = payload.view.state.values.rejection_reason_block.rejection_reason_input.value;

      console.log('[SlackApproval] Callback ID:', callbackId);
      console.log('[SlackApproval] User:', user);

      // 🔥 処理データを一時保存シートに書き込む（超軽量）
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let tempSheet = ss.getSheetByName('一時処理キュー');

      if (!tempSheet) {
        tempSheet = ss.insertSheet('一時処理キュー');
        tempSheet.appendRow(['タイムスタンプ', 'タイプ', 'ID', 'ユーザー', '却下理由', 'Slack Channel ID', 'Slack Message TS', '処理済み']);

        // Message TS列（G列）を書式なしテキストに設定
        const lastColumn = tempSheet.getLastColumn();
        const messageTsColumn = 7; // G列
        tempSheet.getRange(2, messageTsColumn, 1000, 1).setNumberFormat('@STRING@');
        console.log('[SlackApproval] Message TS列を文字列フォーマットに設定');
      }

      if (callbackId === 'cancel_rejection_modal') {
        const applicationId = privateMetadata.applicationId;
        const channelId = privateMetadata.channelId || '';
        const messageTs = privateMetadata.messageTs || '';

        console.log('[SlackApproval] Message TS (保存前):', messageTs);
        console.log('[SlackApproval] Message TS type:', typeof messageTs);

        // 🔥 Message TSを文字列に変換（精度保持のため）
        const messageTsStr = String(messageTs);
        console.log('[SlackApproval] Message TS (文字列変換後):', messageTsStr);

        // 次の行番号を取得
        const nextRow = tempSheet.getLastRow() + 1;

        // データを書き込み
        tempSheet.getRange(nextRow, 1, 1, 8).setValues([[
          new Date(),
          'cancel_rejection',
          applicationId,
          user,
          rejectionReason,
          channelId,
          messageTsStr,  // 文字列として書き込む
          'false'
        ]]);

        console.log('[SlackApproval] キャンセル却下データを一時保存:', applicationId);
        console.log('[SlackApproval] Message TS保存完了');
      } else if (callbackId === 'extension_rejection_modal') {
        const extensionId = privateMetadata.extensionId;
        const channelId = privateMetadata.channelId || '';
        const messageTs = privateMetadata.messageTs || '';

        console.log('[SlackApproval] Message TS (保存前):', messageTs);
        console.log('[SlackApproval] Message TS type:', typeof messageTs);

        // 🔥 Message TSを文字列に変換（精度保持のため）
        const messageTsStr = String(messageTs);
        console.log('[SlackApproval] Message TS (文字列変換後):', messageTsStr);

        // 次の行番号を取得
        const nextRow = tempSheet.getLastRow() + 1;

        // データを書き込み
        tempSheet.getRange(nextRow, 1, 1, 8).setValues([[
          new Date(),
          'extension_rejection',
          extensionId,
          user,
          rejectionReason,
          channelId,
          messageTsStr,  // 文字列として書き込む
          'false'
        ]]);

        console.log('[SlackApproval] 期限延長却下データを一時保存:', extensionId);
        console.log('[SlackApproval] Message TS保存完了');
      }

      // 🚨 即座にレスポンスを返す準備
      console.log('[SlackApproval] データ保存完了、レスポンス準備中');
      const response = this.createSlackResponse();

      // 🔥 レスポンス準備後、即座にキュー処理を実行（非同期的に）
      console.log('[SlackApproval] 却下キュー処理を即座に実行中...');
      try {
        this.processRejectionQueue();
      } catch (queueError) {
        console.error('[SlackApproval] キュー処理エラー（ログのみ、レスポンスには影響なし）:', queueError);
      }

      console.log('[SlackApproval] レスポンス返却');
      return response;

    } catch (error) {
      console.error('[SlackApproval] ❌ エラー:', error);
      return this.createSlackResponse();
    } finally {
      console.log('[SlackApproval] ========== VIEW_SUBMISSION END ==========');
    }
  },

  /**
   * キャンセル申請データを取得
   * @param {String} applicationId - 申請ID
   * @return {Object} 申請データ
   */
  getCancelApplicationData: function(applicationId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cancelSheet = ss.getSheetByName('キャンセル申請');

      if (!cancelSheet) {
        console.error('[SlackApproval] キャンセル申請シートが見つかりません');
        return null;
      }

      const data = cancelSheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('申請ID');
      const customerNameIndex = headers.indexOf('顧客名');
      const cvIdIndex = headers.indexOf('CV ID');
      const phoneCountIndex = headers.indexOf('電話回数');
      const smsCountIndex = headers.indexOf('SMS回数');
      const categoryIndex = headers.indexOf('キャンセル理由カテゴリ');
      const detailIndex = headers.indexOf('キャンセル理由詳細');
      const lastContactIndex = headers.indexOf('最終連絡日時');
      const merchantIdIndex = headers.indexOf('加盟店ID');
      const basicDeadlineIndex = headers.indexOf('申請期限（基本）');
      const extendedDeadlineIndex = headers.indexOf('延長後期限');

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === applicationId) {
          // 延長後期限があればそれを使用、なければ基本期限
          const cancelDeadline = data[i][extendedDeadlineIndex] || data[i][basicDeadlineIndex];

          return {
            customerName: data[i][customerNameIndex],
            cvId: data[i][cvIdIndex],
            phoneCallCount: data[i][phoneCountIndex],
            smsCount: data[i][smsCountIndex],
            cancelReasonCategory: data[i][categoryIndex],
            cancelReasonDetail: data[i][detailIndex],
            lastContactDate: data[i][lastContactIndex],
            merchantId: data[i][merchantIdIndex],
            cancelDeadline: cancelDeadline
          };
        }
      }

      return null;

    } catch (error) {
      console.error('[SlackApproval] 申請データ取得エラー:', error);
      return null;
    }
  },

  /**
   * 期限延長申請データを取得
   * @param {String} extensionId - 申請ID
   * @return {Object} 申請データ
   */
  getExtensionApplicationData: function(extensionId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const extensionSheet = ss.getSheetByName('期限延長申請');

      if (!extensionSheet) {
        console.error('[SlackApproval] 期限延長申請シートが見つかりません');
        return null;
      }

      const data = extensionSheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('申請ID');
      const customerNameIndex = headers.indexOf('顧客名');
      const cvIdIndex = headers.indexOf('CV ID');
      const contactDateIndex = headers.indexOf('連絡がついた日時');
      const appointmentDateIndex = headers.indexOf('アポ予定日');
      const extensionReasonIndex = headers.indexOf('延長理由');
      const merchantIdIndex = headers.indexOf('加盟店ID');

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === extensionId) {
          return {
            customerName: data[i][customerNameIndex],
            cvId: data[i][cvIdIndex],
            contactDate: data[i][contactDateIndex],
            appointmentDate: data[i][appointmentDateIndex],
            extensionReason: data[i][extensionReasonIndex],
            merchantId: data[i][merchantIdIndex]
          };
        }
      }

      return null;

    } catch (error) {
      console.error('[SlackApproval] 申請データ取得エラー:', error);
      return null;
    }
  },

  /**
   * 一時処理キューを処理する
   * 未処理のデータを取得して、却下処理・通知送信・Slack更新を実行
   */
  processRejectionQueue: function() {
    console.log('[SlackApproval] ===== 一時処理キュー処理開始 =====');

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const tempSheet = ss.getSheetByName('一時処理キュー');

      if (!tempSheet) {
        console.log('[SlackApproval] 一時処理キューシートが存在しません');
        return { success: true, message: 'キューシートなし', processed: 0 };
      }

      // 🔥 getDisplayValues()を使用して、Message TSの精度を保持
      const data = tempSheet.getDataRange().getDisplayValues();
      const headers = data[0];
      const rows = data.slice(1);

      // カラムインデックス
      const timestampIdx = 0;
      const typeIdx = 1;
      const idIdx = 2;
      const userIdx = 3;
      const reasonIdx = 4;
      const channelIdIdx = 5;
      const messageTsIdx = 6;
      const processedIdx = 7;

      let processedCount = 0;
      const processedIds = new Set();  // 🔥 重複処理を防止

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const isProcessed = row[processedIdx] === 'true' || row[processedIdx] === true || row[processedIdx] === 'TRUE';

        if (isProcessed) {
          console.log('[SlackApproval] 行', i + 2, 'は処理済みスキップ');
          continue;
        }

        const type = row[typeIdx];
        const id = row[idIdx];
        const user = row[userIdx];
        const reason = row[reasonIdx];
        const channelId = row[channelIdIdx];
        let messageTs = row[messageTsIdx];

        // 🔥 同じIDを複数回処理しないようにチェック
        if (processedIds.has(id)) {
          console.log(`[SlackApproval] 行 ${i + 2} は既に処理済み（ID重複）: ${id}`);
          tempSheet.getRange(i + 2, processedIdx + 1).setValue('true');  // 重複行も処理済みにする
          continue;
        }
        processedIds.add(id);

        // Message TSの先頭に'がある場合は削除（文字列として保存したため）
        if (messageTs && typeof messageTs === 'string' && messageTs.startsWith("'")) {
          messageTs = messageTs.substring(1);
        }

        console.log(`[SlackApproval] ========== 行 ${i + 2} 処理開始 ==========`);
        console.log(`[SlackApproval] タイプ: ${type}`);
        console.log(`[SlackApproval] ID: ${id}`);
        console.log(`[SlackApproval] ユーザー: ${user}`);
        console.log(`[SlackApproval] 却下理由: ${reason}`);
        console.log(`[SlackApproval] Channel ID: "${channelId}"`);
        console.log(`[SlackApproval] Message TS (raw): "${row[messageTsIdx]}"`);
        console.log(`[SlackApproval] Message TS (cleaned): "${messageTs}"`);

        try {
          if (type === 'cancel_rejection') {
            // キャンセル申請却下処理
            console.log('[SlackApproval] キャンセル申請却下処理実行中...');
            const result = this.rejectCancelReport(id, user, reason);

            if (result.success) {
              console.log('[SlackApproval] ✅ 却下処理成功:', id);

              // 通知送信（結果を取得）
              let notificationResult = null;
              try {
                console.log('[SlackApproval] 却下通知送信中...');
                notificationResult = this.sendRejectionNotification(id, reason, 'cancel');
                console.log('[SlackApproval] ✅ 却下通知送信完了:', notificationResult);
              } catch (notifError) {
                console.error('[SlackApproval] ❌ 通知送信エラー（継続）:', notifError);
                notificationResult = {
                  success: false,
                  message: notifError.toString(),
                  channels: []
                };
              }

              // Slackメッセージ更新
              if (channelId && messageTs) {
                console.log('[SlackApproval] Slackメッセージ更新を実行します');
                console.log(`[SlackApproval] 更新対象 - Channel: ${channelId}, TS: ${messageTs}`);
                this.updateSlackMessageWithResult(channelId, messageTs, {
                  type: 'cancel_rejection',
                  id: id,
                  user: user,
                  reason: reason,
                  success: true,
                  notificationResult: notificationResult
                });
              } else {
                console.warn('[SlackApproval] ⚠️ Channel IDまたはMessage TSが空のため、Slack更新スキップ');
                console.warn(`[SlackApproval] channelId="${channelId}", messageTs="${messageTs}"`);
              }

              // 処理済みフラグを更新
              console.log('[SlackApproval] 処理済みフラグを設定中...');
              tempSheet.getRange(i + 2, processedIdx + 1).setValue('true');
              processedCount++;
              console.log('[SlackApproval] ✅ 処理完了');

            } else {
              console.error('[SlackApproval] ❌ 却下処理失敗:', result.error);
            }

          } else if (type === 'extension_rejection') {
            // 期限延長申請却下処理
            console.log('[SlackApproval] 期限延長申請却下処理実行中...');
            const result = this.rejectExtensionRequest(id, user, reason);

            if (result.success) {
              console.log('[SlackApproval] ✅ 却下処理成功:', id);

              // 通知送信（結果を取得）
              let notificationResult = null;
              try {
                console.log('[SlackApproval] 却下通知送信中...');
                notificationResult = this.sendRejectionNotification(id, reason, 'extension');
                console.log('[SlackApproval] ✅ 却下通知送信完了:', notificationResult);
              } catch (notifError) {
                console.error('[SlackApproval] ❌ 通知送信エラー（継続）:', notifError);
                notificationResult = {
                  success: false,
                  message: notifError.toString(),
                  channels: []
                };
              }

              // Slackメッセージ更新
              if (channelId && messageTs) {
                console.log('[SlackApproval] Slackメッセージ更新を実行します');
                console.log(`[SlackApproval] 更新対象 - Channel: ${channelId}, TS: ${messageTs}`);
                this.updateSlackMessageWithResult(channelId, messageTs, {
                  type: 'extension_rejection',
                  id: id,
                  user: user,
                  reason: reason,
                  success: true,
                  notificationResult: notificationResult
                });
              } else {
                console.warn('[SlackApproval] ⚠️ Channel IDまたはMessage TSが空のため、Slack更新スキップ');
                console.warn(`[SlackApproval] channelId="${channelId}", messageTs="${messageTs}"`);
              }

              // 処理済みフラグを更新
              console.log('[SlackApproval] 処理済みフラグを設定中...');
              tempSheet.getRange(i + 2, processedIdx + 1).setValue('true');
              processedCount++;
              console.log('[SlackApproval] ✅ 処理完了');

            } else {
              console.error('[SlackApproval] ❌ 却下処理失敗:', result.error);
            }
          }

        } catch (error) {
          console.error(`[SlackApproval] 行 ${i + 2} の処理エラー:`, error);
          // エラーが発生しても次の行を処理
        }
      }

      console.log(`[SlackApproval] ===== 処理完了: ${processedCount}件処理 =====`);
      return { success: true, message: `${processedCount}件処理`, processed: processedCount };

    } catch (error) {
      console.error('[SlackApproval] キュー処理エラー:', error);
      return { success: false, error: error.toString(), processed: 0 };
    }
  },

  /**
   * Slackメッセージを結果で更新
   * @param {String} channelId - Slack channel ID
   * @param {String} messageTs - Message timestamp
   * @param {Object} result - 処理結果
   */
  updateSlackMessageWithResult: function(channelId, messageTs, result) {
    console.log('[SlackApproval] ========== Slackメッセージ更新開始 ==========');
    console.log('[SlackApproval] channelId:', channelId);
    console.log('[SlackApproval] messageTs (raw):', messageTs);
    console.log('[SlackApproval] messageTs type:', typeof messageTs);
    console.log('[SlackApproval] result:', JSON.stringify(result));

    try {
      const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');

      if (!botToken) {
        console.error('[SlackApproval] ❌ SLACK_BOT_TOKENが設定されていません');
        return;
      }

      console.log('[SlackApproval] Bot Token取得成功（先頭10文字）:', botToken.substring(0, 10) + '...');

      // channelIdとmessageTsが空でないか確認
      if (!channelId || channelId === '') {
        console.error('[SlackApproval] ❌ channelIdが空です');
        return;
      }

      if (!messageTs || messageTs === '') {
        console.error('[SlackApproval] ❌ messageTsが空です');
        return;
      }

      // Message TSを文字列に変換（数値の場合も対応）
      const messageTsString = String(messageTs);
      console.log('[SlackApproval] messageTs (文字列変換後):', messageTsString);

      // 結果メッセージを構築
      const typeLabel = result.type === 'cancel_rejection' ? 'キャンセル申請' : '期限延長申請';
      const statusEmoji = result.success ? '❌' : '⚠️';
      const statusText = result.success ? '却下済み' : '却下失敗';

      console.log('[SlackApproval] メッセージ種別:', typeLabel);
      console.log('[SlackApproval] ステータス:', statusText);

      // 通知結果を構築
      let notificationStatusText = '';
      if (result.notificationResult) {
        if (result.notificationResult.success) {
          const channels = result.notificationResult.channels || [];
          if (channels.length > 0) {
            const channelNames = channels.map(ch => {
              if (ch === 'email') return 'メール';
              if (ch === 'line') return 'LINE';
              if (ch === 'slack') return 'Slack';
              return ch;
            }).join('、');
            notificationStatusText = `✅ 通知送信完了（${channelNames}）`;
          } else {
            notificationStatusText = '✅ 通知送信完了';
          }
        } else {
          notificationStatusText = `⚠️ 通知送信失敗: ${result.notificationResult.message}`;
        }
      } else {
        notificationStatusText = '⚠️ 通知送信結果不明';
      }

      // 却下情報だけのシンプルなブロック（元のメッセージは保持しない）
      const updatedBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji} *${typeLabel}${statusText}*\n申請ID: ${result.id}\n却下者: ${result.user}\n却下日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n\n*却下理由:*\n${result.reason}\n\n${notificationStatusText}`
          }
        }
      ];

      // 🔥 chat.updateは精度問題でエラーになるため、スレッド返信で通知
      const payload = {
        channel: channelId,
        blocks: updatedBlocks,
        text: `${statusEmoji} ${typeLabel}${statusText}`
      };

      console.log('[SlackApproval] Slack API (chat.postMessage) 呼び出し中...');

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + botToken
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
      const responseText = response.getContentText();
      console.log('[SlackApproval] Slack APIレスポンス:', responseText);

      const responseData = JSON.parse(responseText);

      if (!responseData.ok) {
        console.error('[SlackApproval] ❌ Slackメッセージ更新失敗');
        console.error('[SlackApproval] エラー詳細:', responseData.error);
        console.error('[SlackApproval] 完全なレスポンス:', JSON.stringify(responseData));
      } else {
        console.log('[SlackApproval] ✅ Slackメッセージ更新成功！');
      }

      console.log('[SlackApproval] ========== Slackメッセージ更新終了 ==========');

    } catch (error) {
      console.error('[SlackApproval] ❌ Slackメッセージ更新エラー:', error);
      console.error('[SlackApproval] エラースタック:', error.stack);
    }
  },

  /**
   * 却下通知を加盟店に送信
   * @param {String} applicationId - 申請ID
   * @param {String} rejectionReason - 却下理由
   * @param {String} type - 'cancel' or 'extension'
   */
  sendRejectionNotification: function(applicationId, rejectionReason, type) {
    try {
      console.log('[SlackApproval] 却下通知送信開始:', applicationId, type);

      // 申請データから加盟店IDとユーザーIDを取得
      let merchantId = null;
      let applicationData = null;

      if (type === 'cancel') {
        applicationData = this.getCancelApplicationData(applicationId);
        merchantId = applicationData?.merchantId;
      } else if (type === 'extension') {
        applicationData = this.getExtensionApplicationData(applicationId);
        merchantId = applicationData?.merchantId;
      }

      if (!merchantId) {
        console.error('[SlackApproval] 加盟店IDが取得できません');
        return;
      }

      // 通知データを構築
      const notificationData = {
        ...applicationData,
        applicationId: type === 'cancel' ? applicationId : undefined,
        extensionId: type === 'extension' ? applicationId : undefined,
        aiReason: rejectionReason,
        rejectedBy: '管理者',
        rejectedAt: new Date()
      };

      const notificationType = type === 'cancel' ? 'cancelRejection' : 'extensionRejection';

      // NotificationDispatcherを使って通知送信
      const result = NotificationDispatcher.dispatchToMerchant(merchantId, notificationType, notificationData);

      if (result.success) {
        console.log('[SlackApproval] 却下通知送信成功:', result.message);
      } else {
        console.error('[SlackApproval] 却下通知送信失敗:', result.message);
      }

      return result;

    } catch (error) {
      console.error('[SlackApproval] 却下通知送信エラー:', error);
      return {
        success: false,
        message: error.toString(),
        channels: []
      };
    }
  },

  /**
   * 承認通知を加盟店に送信
   * @param {String} applicationId - 申請ID
   * @param {String} approver - 承認者
   * @param {String} type - 'cancel' or 'extension'
   */
  sendApprovalNotificationToMerchant: function(applicationId, approver, type) {
    try {
      console.log('[SlackApproval] 承認通知送信開始:', applicationId, type);

      // 申請データから加盟店IDを取得
      let merchantId = null;
      let applicationData = null;

      if (type === 'cancel') {
        applicationData = this.getCancelApplicationData(applicationId);
        merchantId = applicationData?.merchantId;
      } else if (type === 'extension') {
        applicationData = this.getExtensionApplicationData(applicationId);
        merchantId = applicationData?.merchantId;
      }

      if (!merchantId) {
        console.error('[SlackApproval] 加盟店IDが取得できません');
        return;
      }

      // 通知データを構築
      const notificationData = {
        ...applicationData,
        applicationId: type === 'cancel' ? applicationId : undefined,
        extensionId: type === 'extension' ? applicationId : undefined,
        approvedBy: approver,
        approvedAt: new Date()
      };

      const notificationType = type === 'cancel' ? 'cancelApproval' : 'extensionApproval';

      // NotificationDispatcherを使って通知送信
      const result = NotificationDispatcher.dispatchToMerchant(merchantId, notificationType, notificationData);

      if (result.success) {
        console.log('[SlackApproval] 承認通知送信成功:', result.message);
      } else {
        console.error('[SlackApproval] 承認通知送信失敗:', result.message);
      }

    } catch (error) {
      console.error('[SlackApproval] 承認通知送信エラー:', error);
    }
  }
};