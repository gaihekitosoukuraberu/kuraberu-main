/**
 * ====================================
 * Slack承認システム（完全独立版）
 * ====================================
 * 完全独立モジュール - 外部依存ゼロ
 * 他システムに影響を与えない設計
 *
 * 依存関係: なし
 * 内包関数: _generateFirstLoginUrl, _sendWelcomeEmail
 */

const SlackApprovalSystem = {
  // ========================================
  // 内部関数: 初回ログインURL生成
  // ========================================
  _generateFirstLoginUrl: function(merchantId) {
    try {
      const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
      if (!SECRET_KEY) {
        console.error('[SlackApproval._generateFirstLoginUrl] SECRET_KEYが設定されていません');
        return null;
      }

      const data = {
        merchantId: merchantId,
        expires: Date.now() + 86400000, // 24時間後
        type: 'first_login'
      };

      // 署名作成
      const signature = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        JSON.stringify(data) + SECRET_KEY
      ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').substring(0, 16);

      // Base64エンコード
      const payload = Utilities.base64EncodeWebSafe(JSON.stringify(data));

      // URL生成（直接指定 - V2060: プロパティ設定ミス対策）
      const baseUrl = 'https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/first-login.html';
      const url = baseUrl + '?data=' + payload + '&sig=' + signature;
      console.log('[SlackApproval._generateFirstLoginUrl] 🔗 生成URL:', url);
      console.log('[SlackApproval._generateFirstLoginUrl] URL生成成功:', merchantId);
      return url;

    } catch (error) {
      console.error('[SlackApproval._generateFirstLoginUrl] エラー:', error);
      return null;
    }
  },

  // ========================================
  // 内部関数: 初回ログインメール送信
  // ========================================
  _sendWelcomeEmail: function(email, companyName, loginUrl, merchantId) {
    try {
      if (!merchantId) {
        merchantId = decodeURIComponent(loginUrl).match(/merchantId":"([^"]+)"/);
        merchantId = merchantId ? merchantId[1] : '不明';
      }

      console.log('[SlackApproval._sendWelcomeEmail] メール送信開始');
      console.log('[SlackApproval._sendWelcomeEmail] email:', email);
      console.log('[SlackApproval._sendWelcomeEmail] companyName:', companyName);
      console.log('[SlackApproval._sendWelcomeEmail] merchantId:', merchantId);

      const subject = '【外壁塗装くらべる】加盟店登録完了・初回ログインのご案内';

      const htmlBody = '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '  <style>\n' +
        '    body { font-family: \'Noto Sans JP\', \'Hiragino Sans\', sans-serif; line-height: 1.8; color: #333; background: #f7f7f7; margin: 0; padding: 0; }\n' +
        '    .container { max-width: 600px; margin: 20px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n' +
        '    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 30px; }\n' +
        '    .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }\n' +
        '    .warning { background: #fef3c7; padding: 15px 20px; border-left: 4px solid #f59e0b; margin: 25px 0; border-radius: 5px; }\n' +
        '    .info-box { background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #bae6fd; }\n' +
        '    .merchant-id { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }\n' +
        '    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }\n' +
        '    .button-table { width: 100%; margin: 25px 0; }\n' +
        '    .button-cell { text-align: center; padding: 0; }\n' +
        '    .button-link { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }\n' +
        '  </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '  <div class="container">\n' +
        '    <div class="header">\n' +
        '      <div class="logo">外壁塗装くらべる</div>\n' +
        '      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">加盟店管理システム</p>\n' +
        '    </div>\n' +
        '    <h2 style="color: #1e40af; margin-bottom: 25px;">加盟店登録完了のお知らせ</h2>\n' +
        '    <p><strong>' + companyName + '</strong> 様</p>\n' +
        '    <p>このたびは「外壁塗装くらべる」への加盟店登録をいただき、誠にありがとうございます。</p>\n' +
        '    <p>審査が完了し、加盟店登録が承認されました。<br>以下の情報をご確認の上、<strong>必ず24時間以内に</strong>初回ログインをお願いいたします。</p>\n' +
        '    <div class="warning">\n' +
        '      <div style="font-weight: bold; color: #d97706; margin-bottom: 8px; font-size: 15px;">⚠️ 必ずお読みください</div>\n' +
        '      <p style="margin: 5px 0; font-size: 14px; line-height: 1.6;">\n' +
        '        初回ログイン＝即配信開始ではございませんので、ご安心ください。<br>\n' +
        '        ただし、システムの都合上、<strong>このリンクは24時間で無効</strong>になりますので、<br>\n' +
        '        お手数ですが初回ログインは必ずすぐに行っていただけますようお願いいたします。\n' +
        '      </p>\n' +
        '    </div>\n' +
        '    <div class="info-box">\n' +
        '      <div style="font-weight: bold; color: #0369a1; font-size: 14px; margin-bottom: 5px;">あなたの加盟店ID</div>\n' +
        '      <div class="merchant-id">' + merchantId + '</div>\n' +
        '      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">※この加盟店IDは今後のログイン時に必要となります。大切に保管してください。</p>\n' +
        '    </div>\n' +
        '    <table class="button-table" cellpadding="0" cellspacing="0" border="0">\n' +
        '      <tr>\n' +
        '        <td class="button-cell">\n' +
        '          <a href="' + loginUrl + '" class="button-link">初回ログインを開始する</a>\n' +
        '        </td>\n' +
        '      </tr>\n' +
        '    </table>\n' +
        '    <div style="background: #f0f9ff; padding: 15px 20px; border-radius: 5px; margin: 25px 0; font-size: 14px;">\n' +
        '      <div style="font-weight: bold; color: #0369a1; margin-bottom: 8px;">初回ログイン時の設定内容</div>\n' +
        '      <ul style="margin: 5px 0; padding-left: 20px; line-height: 1.8;">\n' +
        '        <li>新しいパスワードを設定してください</li>\n' +
        '        <li>パスワードは8文字以上、英数字を含む必要があります</li>\n' +
        '        <li>設定後、すぐに加盟店ダッシュボードをご利用いただけます</li>\n' +
        '      </ul>\n' +
        '    </div>\n' +
        '    <div class="footer">\n' +
        '      <p><strong>ご不明な点がございましたら</strong><br>サポートデスク: info@gaihekikuraberu.com<br>営業時間: 9:00-18:00</p>\n' +
        '      <p style="margin-top: 15px;">※このメールに心当たりがない場合は、お手数ですが削除してください。</p>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</body>\n' +
        '</html>';

      // メール送信
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        name: '外壁塗装くらべる運営事務局'
      });

      console.log('[SlackApproval._sendWelcomeEmail] メール送信成功:', email, merchantId);
      return true;

    } catch (mailError) {
      console.error('[SlackApproval._sendWelcomeEmail] メール送信失敗:', mailError);
      console.error('[SlackApproval._sendWelcomeEmail] エラー詳細:', mailError.stack);
      return false;
    }
  },

  // ========================================
  // 公開API
  // ========================================
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

      // 初回ログインメール送信（内部関数を使用）
      try {
        const rowData = data[targetRow - 1];
        const companyName = rowData[2] || '';
        const salesEmail = rowData[22] || '';

        if (!salesEmail) {
          console.error('[SlackApproval] メール送信スキップ - メールアドレスが空');
        } else if (!companyName) {
          console.error('[SlackApproval] メール送信スキップ - 会社名が空');
        } else {
          // 内部関数でURL生成
          const loginUrl = this._generateFirstLoginUrl(registrationId);
          if (!loginUrl) {
            throw new Error('URL生成失敗');
          }

          // 内部関数でメール送信
          const emailSent = this._sendWelcomeEmail(salesEmail, companyName, loginUrl, registrationId);
          if (emailSent) {
            console.log('[SlackApproval] 初回ログインメール送信完了:', salesEmail);
          } else {
            console.error('[SlackApproval] メール送信失敗');
          }
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