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
    console.log('[SlackApproval] ==== handlePost開始 ====');
    console.log('[SlackApproval] Raw parameters:', JSON.stringify(e.parameter));
    console.log('[SlackApproval] Content Type:', e.contentType);
    console.log('[SlackApproval] Post Data:', e.postData?.contents);

    try {
      // Slackからのpayloadを取得
      const payload = e.parameter.payload ?
        JSON.parse(e.parameter.payload) :
        null;

      if (!payload) {
        console.log('[SlackApproval] ERROR: payloadがありません');
        return this.createSlackResponse('Payload not found');
      }

      console.log('[SlackApproval] Payload解析成功');
      console.log('[SlackApproval] Full Payload:', JSON.stringify(payload));
      console.log('[SlackApproval] Interaction Type:', payload.type);
      console.log('[SlackApproval] User:', payload.user?.name || payload.user?.username);
      console.log('[SlackApproval] Team:', payload.team?.domain);
      console.log('[SlackApproval] Actions:', JSON.stringify(payload.actions));

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
      const action = payload.actions[0];
      const user = payload.user?.name || payload.user?.username || payload.user?.id || 'Slackユーザー';
      const triggerId = payload.trigger_id;

      console.log('[SlackApproval] Action ID:', action.action_id);
      console.log('[SlackApproval] Value:', action.value);

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

      // キャンセル申請却下ボタン -> モーダルを開く
      else if (action.action_id === 'reject_cancel_report') {
        console.log('[SlackApproval] キャンセル申請却下ボタン押下検出');
        const applicationId = action.value.replace('reject_cancel_', '');
        console.log('[SlackApproval] 処理対象ID:', applicationId);

        // モーダルを開く
        this.openCancelRejectionModal(triggerId, applicationId, user);
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

      // 期限延長申請却下ボタン -> モーダルを開く
      else if (action.action_id === 'reject_extension_request') {
        console.log('[SlackApproval] 期限延長申請却下ボタン押下検出');
        const extensionId = action.value.replace('reject_extension_', '');
        console.log('[SlackApproval] 処理対象ID:', extensionId);

        // モーダルを開く
        this.openExtensionRejectionModal(triggerId, extensionId, user);
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
   */
  openCancelRejectionModal: function(triggerId, applicationId, user) {
    try {
      console.log('[SlackApproval] キャンセル却下モーダル表示開始:', applicationId);

      // 申請データを取得
      const applicationData = this.getCancelApplicationData(applicationId);

      if (!applicationData) {
        console.error('[SlackApproval] 申請データが見つかりません:', applicationId);
        return;
      }

      // デフォルト却下理由を使用（Slackタイムアウト対策でAI生成はスキップ）
      console.log('[SlackApproval] デフォルト却下理由を使用（タイムアウト対策）');
      const aiReason = AIReasonGenerator._getDefaultCancelRejectionReason(applicationData);

      console.log('[SlackApproval] 却下理由:', aiReason);

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
          user: user
        }),
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*顧客: ${applicationData.customerName}*\n申請ID: ${applicationId}`
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
                text: 'ℹ️ デフォルト理由（編集可能）'
              }
            ]
          }
        ]
      };

      // Slack API (views.open) を呼び出し
      this.openSlackModal(triggerId, modalView);

    } catch (error) {
      console.error('[SlackApproval] モーダル表示エラー:', error);
    }
  },

  /**
   * 期限延長申請却下モーダルを開く
   * @param {String} triggerId - Slack trigger ID
   * @param {String} extensionId - 申請ID
   * @param {String} user - ユーザー名
   */
  openExtensionRejectionModal: function(triggerId, extensionId, user) {
    try {
      console.log('[SlackApproval] 期限延長却下モーダル表示開始:', extensionId);

      // 申請データを取得
      const extensionData = this.getExtensionApplicationData(extensionId);

      if (!extensionData) {
        console.error('[SlackApproval] 申請データが見つかりません:', extensionId);
        return;
      }

      // デフォルト却下理由を使用（Slackタイムアウト対策でAI生成はスキップ）
      console.log('[SlackApproval] デフォルト却下理由を使用（タイムアウト対策）');
      const aiReason = AIReasonGenerator._getDefaultExtensionRejectionReason(extensionData);

      console.log('[SlackApproval] 却下理由:', aiReason);

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
          user: user
        }),
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*顧客: ${extensionData.customerName}*\n申請ID: ${extensionId}`
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
                text: 'ℹ️ デフォルト理由（編集可能）'
              }
            ]
          }
        ]
      };

      // Slack API (views.open) を呼び出し
      this.openSlackModal(triggerId, modalView);

    } catch (error) {
      console.error('[SlackApproval] モーダル表示エラー:', error);
    }
  },

  /**
   * Slackモーダルを開く（views.open API呼び出し）
   * @param {String} triggerId - Trigger ID
   * @param {Object} modalView - モーダルビュー定義
   */
  openSlackModal: function(triggerId, modalView) {
    try {
      const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');

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
      } else {
        console.log('[SlackApproval] モーダル表示成功');
      }

    } catch (error) {
      console.error('[SlackApproval] Slackモーダル表示エラー:', error);
    }
  },

  /**
   * モーダル送信処理（view_submission）
   * @param {Object} payload - Slackペイロード
   */
  handleViewSubmission: function(payload) {
    try {
      const callbackId = payload.view.callback_id;
      const user = payload.user?.name || payload.user?.username || payload.user?.id || 'Slackユーザー';
      const privateMetadata = JSON.parse(payload.view.private_metadata);

      console.log('[SlackApproval] モーダル送信処理:', callbackId);

      // 却下理由を取得
      const rejectionReason = payload.view.state.values.rejection_reason_block.rejection_reason_input.value;

      if (callbackId === 'cancel_rejection_modal') {
        const applicationId = privateMetadata.applicationId;
        console.log('[SlackApproval] キャンセル却下確定:', applicationId);

        // 却下処理実行（通知送信は一旦スキップして軽量化）
        const result = this.rejectCancelReport(applicationId, user, rejectionReason);
        console.log('[SlackApproval] 却下処理完了:', result.success);

        // TODO: 通知送信は別途トリガーで実行予定

        return this.createSlackResponse();
      }

      if (callbackId === 'extension_rejection_modal') {
        const extensionId = privateMetadata.extensionId;
        console.log('[SlackApproval] 期限延長却下確定:', extensionId);

        // 却下処理実行（通知送信は一旦スキップして軽量化）
        const result = this.rejectExtensionRequest(extensionId, user, rejectionReason);
        console.log('[SlackApproval] 却下処理完了:', result.success);

        // TODO: 通知送信は別途トリガーで実行予定

        return this.createSlackResponse();
      }

      return this.createSlackResponse();

    } catch (error) {
      console.error('[SlackApproval] モーダル送信エラー:', error);
      return this.createSlackResponse('Error: ' + error.toString());
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

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === applicationId) {
          return {
            customerName: data[i][customerNameIndex],
            cvId: data[i][cvIdIndex],
            phoneCallCount: data[i][phoneCountIndex],
            smsCount: data[i][smsCountIndex],
            cancelReasonCategory: data[i][categoryIndex],
            cancelReasonDetail: data[i][detailIndex],
            lastContactDate: data[i][lastContactIndex],
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

    } catch (error) {
      console.error('[SlackApproval] 却下通知送信エラー:', error);
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