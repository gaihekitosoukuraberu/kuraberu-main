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

      // 承認ステータス → "承認済み"
      sheet.getRange(targetRow, approvalStatusIndex + 1).setValue('承認済み');
      // ステータス → "休止"
      sheet.getRange(targetRow, statusIndex + 1).setValue('休止');
      // 承認者 → 実際のSlackユーザー名を使用
      sheet.getRange(targetRow, approverIndex + 1).setValue(approver);

      // 登録日時（AL列）を設定
      const registrationDateIndex = headers.indexOf('登録日時');
      if (registrationDateIndex !== -1) {
        sheet.getRange(targetRow, registrationDateIndex + 1).setValue(
          Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')
        );
      }

      // 一時停止関連の初期値を設定（AO/AP/AQ列）
      const pauseFlagIndex = headers.indexOf('一時停止フラグ');
      const pauseStartIndex = headers.indexOf('一時停止開始日');
      const pauseEndIndex = headers.indexOf('一時停止再開予定日');

      // 一時停止フラグをTRUE（承認直後は休止状態）
      if (pauseFlagIndex !== -1) {
        sheet.getRange(targetRow, pauseFlagIndex + 1).setValue(true);
      }

      // 一時停止開始日を今日
      if (pauseStartIndex !== -1) {
        sheet.getRange(targetRow, pauseStartIndex + 1).setValue(
          Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd')
        );
      }

      // 一時停止再開予定日は空（未定）
      if (pauseEndIndex !== -1) {
        sheet.getRange(targetRow, pauseEndIndex + 1).setValue('');
      }

      console.log('[SlackApproval] 承認完了:', registrationId);
      console.log('[SlackApproval] 更新された行:', targetRow);
      console.log('[SlackApproval] 更新されたカラム - Status:', statusIndex + 1, 'ApprovalStatus:', approvalStatusIndex + 1, 'Approver:', approverIndex + 1);

      // 承認通知を送信
      this.sendApprovalNotification(data[targetRow - 1], registrationId);

      // 初回ログインメール送信
      try {
        const rowData = data[targetRow - 1];
        const companyName = rowData[2] || '';
        const salesEmail = rowData[22] || '';

        if (!salesEmail) {
          console.error('[SlackApproval] メール送信スキップ - メールアドレスが空');
        } else if (!companyName) {
          console.error('[SlackApproval] メール送信スキップ - 会社名が空');
        } else {
          if (typeof generateFirstLoginUrl !== 'function' || typeof sendWelcomeEmail !== 'function') {
            throw new Error('メール送信関数が見つかりません');
          }

          const loginUrl = generateFirstLoginUrl(registrationId);
          if (!loginUrl) {
            throw new Error('URL生成失敗');
          }

          sendWelcomeEmail(salesEmail, companyName, loginUrl, registrationId);
          console.log('[SlackApproval] 初回ログインメール送信完了:', salesEmail);
        }
      } catch (emailErr) {
        console.error('[SlackApproval] メール送信エラー:', emailErr.toString());
      }

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