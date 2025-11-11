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
    console.log('[SlackApproval.approve] ==== 承認処理開始 ====');
    console.log('[SlackApproval.approve] ID:', registrationId, 'Approver:', approver);

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      console.log('[SlackApproval.approve] Spreadsheet ID:', SPREADSHEET_ID);

      if (!SPREADSHEET_ID) {
        throw new Error('スプレッドシートIDが設定されていません');
      }

      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');

      if (!sheet) {
        throw new Error('シートが見つかりません');
      }

      // ヘッダーとデータを取得
      const dataRange = sheet.getDataRange();
      console.log('[SlackApproval.approve] Data range rows:', dataRange.getNumRows(), 'cols:', dataRange.getNumColumns());
      const data = dataRange.getValues();
      const headers = data[0];
      console.log('[SlackApproval.approve] Headers:', JSON.stringify(headers));

      // カラムインデックスを動的に取得
      const idIndex = headers.indexOf('登録ID');
      const statusIndex = headers.indexOf('ステータス');
      const approvalStatusIndex = headers.indexOf('承認ステータス');
      const approvalDateIndex = headers.indexOf('登録日時');
      let approverIndex = headers.indexOf('承認者');
      const rejectReasonIndex = headers.indexOf('却下理由');
      const pauseFlagIndex = headers.indexOf('一時停止フラグ');
      const pauseStartDateIndex = headers.indexOf('一時停止開始日');
      const pauseEndDateIndex = headers.indexOf('一時停止再開予定日');

      // デバッグ用ログ
      console.log('[SlackApproval.approve] Headers found:', headers.length);
      console.log('[SlackApproval.approve] Column indices - ID:', idIndex, 'Status:', statusIndex, 'ApprovalStatus:', approvalStatusIndex, 'Date:', approvalDateIndex, 'Approver:', approverIndex);

      // 必須カラムの存在確認
      if (idIndex === -1 || statusIndex === -1 || approvalStatusIndex === -1) {
        throw new Error(`必須カラムが見つかりません - ID:${idIndex}, Status:${statusIndex}, ApprovalStatus:${approvalStatusIndex}`);
      }

      // 承認者カラムが存在しない場合は追加する
      if (approverIndex === -1) {
        console.log('[SlackApproval.approve] 承認者カラムを追加中...');
        const lastColumn = headers.length;
        sheet.getRange(1, lastColumn + 1).setValue('承認者');
        approverIndex = lastColumn;
        console.log('[SlackApproval.approve] 承認者カラムを追加完了:', approverIndex);
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
      const now = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss');
      const approvalDate = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');

      // 承認ステータス → "承認済み"
      sheet.getRange(targetRow, approvalStatusIndex + 1).setValue('承認済み');
      // ステータス → "休止"
      sheet.getRange(targetRow, statusIndex + 1).setValue('休止');
      // 承認者 → 実際のSlackユーザー名を使用
      sheet.getRange(targetRow, approverIndex + 1).setValue(approver);
      // 注：登録日時は元の日時を保持（承認日時としては使わない）

      // 一時停止設定を自動設定
      if (pauseFlagIndex !== -1) {
        sheet.getRange(targetRow, pauseFlagIndex + 1).setValue('TRUE');
      }
      if (pauseStartDateIndex !== -1) {
        sheet.getRange(targetRow, pauseStartDateIndex + 1).setValue(approvalDate);
      }
      if (pauseEndDateIndex !== -1) {
        sheet.getRange(targetRow, pauseEndDateIndex + 1).setValue('未定');
      }

      console.log('[SlackApproval] 承認完了:', registrationId);
      console.log('[SlackApproval] 更新された行:', targetRow);
      console.log('[SlackApproval] 更新されたカラム - Status:', statusIndex + 1, 'ApprovalStatus:', approvalStatusIndex + 1, 'Approver:', approverIndex + 1);

      // 初回ログインメールを送信
      console.log('[SlackApproval] ===== メール送信処理開始 =====');
      console.log('[SlackApproval] targetRow:', targetRow, 'idIndex:', idIndex);
      console.log('[SlackApproval] headers:', JSON.stringify(headers));

      try {
        const merchantRow = data[targetRow - 1];
        console.log('[SlackApproval] merchantRow取得完了');

        const merchantId = merchantRow[idIndex];
        console.log('[SlackApproval] merchantId:', merchantId);

        const emailIndex1 = headers.indexOf('営業用メールアドレス');
        const emailIndex2 = headers.indexOf('請求用メールアドレス');
        const companyIndex1 = headers.indexOf('会社名');
        const companyIndex2 = headers.indexOf('会社名（法人名）');

        console.log('[SlackApproval] emailIndex1:', emailIndex1, 'emailIndex2:', emailIndex2);
        console.log('[SlackApproval] companyIndex1:', companyIndex1, 'companyIndex2:', companyIndex2);

        const salesEmail = merchantRow[emailIndex1] || merchantRow[emailIndex2];
        const companyName = merchantRow[companyIndex1] || merchantRow[companyIndex2];

        console.log('[SlackApproval] salesEmail:', salesEmail, 'companyName:', companyName);

        if (salesEmail && companyName) {
          console.log('[SlackApproval] 初回ログインメール送信開始');
          console.log('[SlackApproval] generateFirstLoginUrl関数存在確認:', typeof generateFirstLoginUrl);
          console.log('[SlackApproval] sendWelcomeEmail関数存在確認:', typeof sendWelcomeEmail);

          const loginUrl = generateFirstLoginUrl(merchantId);
          console.log('[SlackApproval] ログインURL生成完了:', loginUrl);

          sendWelcomeEmail(salesEmail, companyName, loginUrl, merchantId);
          console.log('[SlackApproval] sendWelcomeEmail呼び出し完了');
        } else {
          console.error('[SlackApproval] メールアドレスまたは会社名が見つかりません');
          console.error('[SlackApproval] Email:', salesEmail, 'Company:', companyName);
        }
      } catch (emailError) {
        console.error('[SlackApproval] メール送信エラー:', emailError);
        console.error('[SlackApproval] エラー詳細:', emailError.stack);
        console.error('[SlackApproval] エラーメッセージ:', emailError.message);
      }

      console.log('[SlackApproval] ===== メール送信処理終了 =====');

      // Slack承認通知を送信
      this.sendApprovalNotification(data[targetRow - 1], registrationId);

      // 評価データ自動収集
      try {
        console.log('[SlackApproval] ===== 評価データ収集開始 =====');
        const companyIndex = headers.indexOf('会社名') !== -1 ? headers.indexOf('会社名') : headers.indexOf('会社名（法人名）');
        const addressIndex = headers.indexOf('住所');
        const companyName = data[targetRow - 1][companyIndex];
        const address = data[targetRow - 1][addressIndex] || '';

        console.log('[SlackApproval] 評価データ収集対象:', companyName, 'Address:', address);

        // EvaluationDataManagerが存在する場合のみ実行
        if (typeof EvaluationDataManager !== 'undefined') {
          const ratingsResult = EvaluationDataManager.collectRatingsFromAPIs(companyName, address);
          console.log('[SlackApproval] 評価データ収集結果:', JSON.stringify(ratingsResult));
        } else {
          console.warn('[SlackApproval] EvaluationDataManager未定義、評価データ収集スキップ');
        }
      } catch (evalError) {
        console.error('[SlackApproval] 評価データ収集エラー:', evalError);
        console.error('[SlackApproval] エラースタック:', evalError.stack);
      }
      console.log('[SlackApproval] ===== 評価データ収集終了 =====');

      return {
        success: true,
        message: '承認完了',
        registrationId: registrationId
      };

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
   * Slack用レスポンス作成
   */
  createSlackResponse: function(text = '') {
    // Slackには常に200 OKを返す（空のレスポンス）
    return ContentService
      .createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT);
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
  }
};