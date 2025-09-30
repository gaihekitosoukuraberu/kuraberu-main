/**
 * Slack通知ハンドラー
 * 加盟店登録時の通知と承認フローを管理
 */

/**
 * 加盟店登録をSlackに通知
 * @param {Object} registrationData - 登録データ
 * @return {Object} 通知結果
 */
function sendSlackRegistrationNotification(registrationData) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('Slack Webhook URLが設定されていません');
      return { success: false, message: 'Slack設定エラー' };
    }

    // 登録IDを生成または取得
    const registrationId = registrationData.registrationId || 'FR' + Utilities.formatDate(new Date(), 'JST', 'yyyyMMddHHmmss');

    // 支店情報のフォーマット
    const branches = registrationData.companyInfo?.branches || [];
    const branchText = branches.length > 0
      ? branches.map(b => `• ${b.name}: ${b.address}`).join('\n')
      : '支店情報なし';

    // Slackメッセージの構築
    const message = {
      text: '@channel 🎉 新規加盟店登録がありました',
      attachments: [
        {
          color: 'good',
          title: '加盟店登録申請',
          fields: [
            {
              title: '登録ID',
              value: registrationId,
              short: true
            },
            {
              title: '会社名',
              value: registrationData.companyInfo?.legalName || registrationData.companyName,
              short: true
            },
            {
              title: '代表者名',
              value: registrationData.companyInfo?.representative || '未入力',
              short: true
            },
            {
              title: '電話番号',
              value: registrationData.companyInfo?.phone || '未入力',
              short: true
            },
            {
              title: '住所',
              value: registrationData.companyInfo?.fullAddress || '未入力',
              short: false
            },
            {
              title: '対応エリア',
              value: registrationData.selectedPrefectures?.join(', ') || '未選択',
              short: false
            },
            {
              title: '支店情報',
              value: branchText,
              short: false
            },
            {
              title: '登録日時',
              value: Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss'),
              short: true
            },
            {
              title: 'ステータス',
              value: '承認待ち',
              short: true
            }
          ],
          footer: '外壁塗装くらべるAI',
          ts: Math.floor(Date.now() / 1000)
        }
      ],
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*新規加盟店登録*\n会社名: *${registrationData.companyInfo?.legalName || registrationData.companyName}*`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ 承認',
                emoji: true
              },
              style: 'primary',
              value: `approve_${registrationId}`,
              action_id: 'approve_registration'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ 却下',
                emoji: true
              },
              style: 'danger',
              value: `reject_${registrationId}`,
              action_id: 'reject_registration'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 スプレッドシートを開く',
                emoji: true
              },
              url: getSpreadsheetUrl(),
              action_id: 'open_spreadsheet'
            }
          ]
        }
      ]
    };

    // Slack APIにPOST
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);

    if (response.getResponseCode() === 200) {
      console.log('Slack通知送信成功:', registrationId);
      return {
        success: true,
        message: 'Slack通知を送信しました',
        registrationId: registrationId
      };
    } else {
      console.error('Slack通知送信失敗:', response.getContentText());
      return {
        success: false,
        message: 'Slack通知の送信に失敗しました'
      };
    }

  } catch (error) {
    console.error('Slack通知エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 承認処理の実行
 * @param {string} registrationId - 登録ID
 * @param {string} approver - 承認者（Slackユーザー名）
 * @return {Object} 処理結果
 */
function approveRegistration(registrationId, approver = 'Slack承認') {
  try {
    console.log('承認処理開始:', registrationId);

    // スプレッドシートのステータスと承認者を更新
    updateRegistrationStatus(registrationId, '承認済み', approver);

    // 承認完了通知をSlackに送信
    sendApprovalNotification(registrationId, true, approver);

    // 初回ログインURL生成とメール送信
    // TODO: メール送信機能は後で実装
    // 現在は承認ステータスの更新とSlack通知のみ実行
    /*
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      // 登録IDで該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === registrationId) {
          const email = data[i][22] || data[i][21]; // W列(営業)またはV列(請求)メールアドレス
          const companyName = data[i][2]; // C列：会社名

          if (email) {
            // 初回ログインURL生成とメール送信
            // const loginUrl = generateFirstLoginUrl(registrationId);
            // sendWelcomeEmail(email, companyName, loginUrl);
            console.log(`メール送信予定: ${email} (${registrationId})`);
          } else {
            console.warn('メールアドレスが登録されていません');
          }
          break;
        }
      }
    } catch (emailError) {
      console.error('メール送信エラー:', emailError);
      // メール送信に失敗しても承認処理は続行
    }
    */

    return {
      success: true,
      message: '承認処理が完了しました'
    };

  } catch (error) {
    console.error('承認処理エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 却下処理の実行
 * @param {string} registrationId - 登録ID
 * @param {string} reason - 却下理由
 * @param {string} rejector - 却下者（Slackユーザー名）
 * @return {Object} 処理結果
 */
function rejectRegistration(registrationId, reason = '', rejector = 'Slack却下') {
  try {
    console.log('却下処理開始:', registrationId);

    // スプレッドシートのステータス、却下者、理由を更新
    updateRegistrationStatus(registrationId, '却下', rejector, reason);

    // 却下通知をSlackに送信
    sendApprovalNotification(registrationId, false, rejector, reason);

    return {
      success: true,
      message: '却下処理が完了しました'
    };

  } catch (error) {
    console.error('却下処理エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 承認/却下の結果をSlackに通知
 * @param {string} registrationId - 登録ID
 * @param {boolean} isApproved - 承認/却下
 * @param {string} user - 処理者
 * @param {string} reason - 却下理由（却下時のみ）
 */
function sendApprovalNotification(registrationId, isApproved, user = '', reason = '') {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('[Slack] Webhook URLが設定されていません');
      return;
    }

    const fields = [
      {
        title: 'ステータス',
        value: isApproved ? '承認済み' : '却下',
        short: true
      },
      {
        title: '処理者',
        value: user || (isApproved ? '管理者' : '管理者'),
        short: true
      },
      {
        title: '処理日時',
        value: Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss'),
        short: true
      }
    ];

    // 却下理由がある場合は追加
    if (!isApproved && reason) {
      fields.push({
        title: '却下理由',
        value: reason,
        short: false
      });
    }

    const message = {
      text: isApproved
        ? `@channel ✅ 登録ID: ${registrationId} が承認されました`
        : `@channel ❌ 登録ID: ${registrationId} が却下されました`,
      attachments: [
        {
          color: isApproved ? 'good' : 'danger',
          fields: fields
        }
      ]
    };

    console.log('[Slack] 通知送信中 - ID:', registrationId, 'Approved:', isApproved);

    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      console.log('[Slack] 通知送信成功 - ID:', registrationId);
    } else {
      console.error('[Slack] 通知送信失敗:', response.getContentText());
    }

  } catch (error) {
    console.error('[Slack] 通知エラー:', error);
  }
}

/**
 * スプレッドシートのステータスを更新
 * @param {string} registrationId - 登録ID
 * @param {string} status - 新しいステータス
 * @param {string} user - 処理者（承認者/却下者）
 * @param {string} reason - 却下理由（却下時のみ）
 */
function updateRegistrationStatus(registrationId, status, user = '', reason = '') {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('スプレッドシートIDが設定されていません');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    if (!sheet) {
      throw new Error('加盟店登録シートが見つかりません');
    }

    // 登録IDで行を検索
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    let found = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === registrationId) { // B列が登録ID（インデックス1）
        const row = i + 1;

        // AJ列（36列目）：ステータスを更新
        // 承認済みの場合は「準備中」に、却下の場合は「却下」に設定
        const ajStatus = status === '承認済み' ? '準備中' : '却下';
        sheet.getRange(row, 36).setValue(ajStatus);

        // AK列（37列目）：承認ステータスを更新
        sheet.getRange(row, 37).setValue(status);

        // AL列（38列目）：処理日時を更新
        sheet.getRange(row, 38).setValue(new Date());

        // AM列（39列目）：処理者（承認者/却下者）を更新
        if (user) {
          sheet.getRange(row, 39).setValue(user);
        }

        // AN列（40列目）：却下理由を更新（却下時のみ）
        if (status === '却下' && reason) {
          sheet.getRange(row, 40).setValue(reason);
        }

        // 承認時に初回ログインメールを送信
        if (status === '承認済み') {
          try {
            console.log('[SlackNotification] 初回ログインメール送信開始');

            const email = values[i][22]; // W列: 営業用メールアドレス
            const companyName = values[i][2]; // C列: 会社名

            console.log('[SlackNotification] メール送信先:', email);
            console.log('[SlackNotification] 会社名:', companyName);

            if (email && companyName) {
              // 初回ログインURL生成
              console.log('[SlackNotification] URL生成中...');
              const loginUrl = generateFirstLoginUrl(registrationId);
              console.log('[SlackNotification] 生成されたURL:', loginUrl);

              // メール送信
              console.log('[SlackNotification] メール送信中...');
              sendWelcomeEmail(email, companyName, loginUrl);
              console.log('[SlackNotification] 初回ログインメール送信成功:', email, registrationId);
            } else {
              console.error('[SlackNotification] メールアドレスまたは会社名が見つかりません');
              console.error('[SlackNotification] Email:', email, 'CompanyName:', companyName, 'ID:', registrationId);
            }
          } catch (emailErr) {
            console.error('[SlackNotification] 初回ログインメール送信エラー:', emailErr);
            console.error('[SlackNotification] エラー詳細:', emailErr.stack);
          }
        }

        // 更新後に明示的に保存
        SpreadsheetApp.flush();
        console.log(`ステータス更新完了: ${registrationId} → ${status} (処理者: ${user})`);
        found = true;
        break;
      }
    }

    // 該当する登録IDが見つからなかった場合
    if (!found) {
      console.error(`[updateRegistrationStatus] 登録IDが見つかりません: ${registrationId}`);
      throw new Error(`登録IDが見つかりません: ${registrationId}`);
    }

  } catch (error) {
    console.error('ステータス更新エラー:', error);
    throw error;
  }
}

/**
 * スプレッドシートのURLを取得
 * @return {string} スプレッドシートのURL
 */
function getSpreadsheetUrl() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }
  return 'https://docs.google.com/spreadsheets/';
}


/**
 * Slack Interactionの処理（main.gsから呼び出される）
 * @param {Object} data - リクエストデータ
 * @return {Object} 処理結果
 */
function handleSlackInteraction(data) {
  try {
    // data.payloadが既にオブジェクトの場合とJSON文字列の場合の両方に対応
    const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
    console.log('[Slack Interaction] 処理開始:', payload.type);

    if (payload.type === 'block_actions') {
      const action = payload.actions[0];
      const user = payload.user ? payload.user.name : 'Slackユーザー';

      console.log('[Slack Interaction] Action:', action.action_id);

      if (action.action_id === 'approve_registration') {
        const registrationId = action.value.replace('approve_', '');
        console.log('[Slack Interaction] 承認処理:', registrationId);

        // updateRegistrationStatusでステータス更新のみ実行（通知は送らない）
        updateRegistrationStatus(registrationId, '承認済み', user);

        // 承認完了通知を1回だけ送信
        sendApprovalNotification(registrationId, true, user);

        // Slackに即座にレスポンスを返す（200 OK）
        return ContentService
          .createTextOutput(JSON.stringify({
            text: `✅ 承認処理を実行しました\nID: ${registrationId}\n処理者: ${user}`
          }))
          .setMimeType(ContentService.MimeType.JSON);

      } else if (action.action_id === 'reject_registration') {
        const registrationId = action.value.replace('reject_', '');
        console.log('[Slack Interaction] 却下処理:', registrationId);

        // updateRegistrationStatusでステータス更新のみ実行（通知は送らない）
        updateRegistrationStatus(registrationId, '却下', user, '');

        // 却下通知を1回だけ送信
        sendApprovalNotification(registrationId, false, user, '');

        // Slackに即座にレスポンスを返す（200 OK）
        return ContentService
          .createTextOutput(JSON.stringify({
            text: `❌ 却下処理を実行しました\nID: ${registrationId}\n処理者: ${user}`
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // デフォルトレスポンス
    return ContentService
      .createTextOutput(JSON.stringify({text: 'OK'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Slack Webhook処理エラー:', error);
    // エラーでも200 OKを返す
    return ContentService
      .createTextOutput(JSON.stringify({
        text: `エラーが発生しました: ${error.toString()}`
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}