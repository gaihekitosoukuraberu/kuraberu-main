/**
 * ====================================
 * Slack キャンセル申請通知システム
 * ====================================
 *
 * 【機能】
 * - キャンセル申請通知（承認/却下ボタン付き）
 * - 期限延長申請通知（承認/却下ボタン付き）
 * - 他社追客状況チェック機能（CVDeliveryChecker統合）
 *
 * 【依存関係】
 * - AdminCancelSystem（承認/却下処理）
 * - CVDeliveryChecker（他社状況チェック）
 * - PropertiesService（SLACK_WEBHOOK_URL）
 *
 * 【影響範囲】
 * - MerchantCancelReport.js
 * - MerchantDeadlineExtension.js
 */

/**
 * キャンセル申請をSlackに通知
 * @param {Object} data - {
 *   applicationId: 申請ID,
 *   cvId: CV ID,
 *   customerName: 顧客名,
 *   merchantId: 加盟店ID,
 *   merchantName: 加盟店名,
 *   cancelReasonCategory: キャンセル理由カテゴリ,
 *   cancelReasonDetail: キャンセル理由詳細,
 *   cancelApplicationText: キャンセル申請文,
 *   phoneCallCount: 電話回数,
 *   smsCount: SMS回数
 * }
 * @return {Object} 通知結果
 */
function sendSlackCancelNotification(data) {
  try {
    // Bot Tokenを使用（Webhook代わり）- メッセージ更新のため
    const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
    const slackChannel = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID') || '#加盟店管理';

    if (!botToken) {
      console.error('[SlackCancel] SLACK_BOT_TOKENが設定されていません');
      return { success: false, message: 'Slack設定エラー' };
    }

    // 🔥 他社の追客状況をチェック 🔥
    const competitorCheck = CVDeliveryChecker.checkOtherMerchantsStatus(data.cvId, data.merchantId);

    console.log('[SlackCancel] 他社追客チェック結果:', competitorCheck.hasActiveCompetitors ? '警告あり' : '問題なし');

    // 他社の追客状況テキストを構築
    let competitorWarningText = '';
    if (competitorCheck.hasActiveCompetitors) {
      competitorWarningText = '⚠️ *他社で追客活動が確認されています:*\n';
      competitorCheck.competitorDetails.forEach((comp) => {
        const lastContactStr = comp.lastContact || '不明';
        competitorWarningText += `• *${comp.merchantName}* (${comp.status}) - 電話${comp.phoneCount}回 - 最終連絡: ${lastContactStr}\n`;
      });
    }

    // 期限情報をフォーマット
    let deadlineText = '期限までは引き続き追客をお願いいたします。';
    if (data.cancelDeadline) {
      const deadlineDate = new Date(data.cancelDeadline);
      const formattedDeadline = Utilities.formatDate(deadlineDate, 'JST', 'yyyy年MM月dd日');
      deadlineText = `キャンセル申請期限は${formattedDeadline}です。期限までは引き続き追客をお願いいたします。`;
    }

    // Bot Token APIペイロード（chat.postMessage）
    const payload = {
      channel: slackChannel,
      text: competitorCheck.hasActiveCompetitors
        ? `🚫⚠️ キャンセル申請（他社追客中）`
        : `🚫 キャンセル申請が提出されました`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: competitorCheck.hasActiveCompetitors
              ? `*🚫⚠️ キャンセル申請（他社追客中）*\n申請ID: ${data.applicationId}\n顧客: ${data.customerName} | 加盟店: ${data.merchantName}\n\n${competitorWarningText}`
              : `*🚫 キャンセル申請*\n申請ID: ${data.applicationId}\n顧客: ${data.customerName} | 加盟店: ${data.merchantName}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*CV ID*\n${data.cvId}`
            },
            {
              type: 'mrkdwn',
              text: `*キャンセル理由*\n${data.cancelReasonCategory} - ${data.cancelReasonDetail}`
            },
            {
              type: 'mrkdwn',
              text: `*電話回数*\n${data.phoneCallCount || 0}回`
            },
            {
              type: 'mrkdwn',
              text: `*SMS回数*\n${data.smsCount || 0}回`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📝 キャンセル申請文*\n${data.cancelApplicationText || '未記入'}`
          }
        },
        {
          type: 'divider'
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
              value: `approve_cancel_${data.applicationId}`,
              action_id: 'approve_cancel_report'
            },
            {
              type: 'static_select',
              placeholder: {
                type: 'plain_text',
                text: '❌ 却下理由を選択',
                emoji: true
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '追客回数不足',
                    emoji: true
                  },
                  value: `reject_cancel_${data.applicationId}::追客回数が不足しているため、キャンセル申請を承認できません。引き続きご対応をお願いいたします。`
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '連絡未確認（他社アポ取得済）',
                    emoji: true
                  },
                  value: `reject_cancel_${data.applicationId}::他社様でアポイントが取得されているのが確認されております。引き続き追客をお願いいたします。`
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '連絡回数不足',
                    emoji: true
                  },
                  value: `reject_cancel_${data.applicationId}::電話${data.phoneCallCount || 0}回、SMS${data.smsCount || 0}回は他社様と比較してもアクションが少ない状況です。引き続き追客をお願いいたします。`
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '期限前',
                    emoji: true
                  },
                  value: `reject_cancel_${data.applicationId}::DEADLINE_TEXT`
                }
              ],
              action_id: 'reject_cancel_select'
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✏️ カスタム理由を入力',
                emoji: true
              },
              style: 'danger',
              value: `reject_cancel_${data.applicationId}`,
              action_id: 'reject_cancel_report'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 スプレッドシートを開く',
                emoji: true
              },
              url: getSpreadsheetUrl(),
              action_id: 'open_spreadsheet_cancel'
            }
          ]
        }
      ]
    };

    // デバッグ: 送信するJSONをログ出力
    console.log('[SlackCancel] 送信するペイロード:', JSON.stringify(payload, null, 2));

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
    console.log('[SlackCancel] Slack APIレスポンス:', responseText);

    const responseData = JSON.parse(responseText);

    if (responseData.ok) {
      console.log('[SlackCancel] 通知送信成功:', data.applicationId);
      console.log('[SlackCancel] Message TS:', responseData.ts);
      console.log('[SlackCancel] Channel ID:', responseData.channel);

      return {
        success: true,
        message: 'Slack通知を送信しました',
        channelId: responseData.channel,
        messageTs: responseData.ts
      };
    } else {
      console.error('[SlackCancel] 通知送信失敗:', responseData.error);
      return {
        success: false,
        message: 'Slack通知の送信に失敗しました: ' + responseData.error
      };
    }

  } catch (error) {
    console.error('[SlackCancel] 通知エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * キャンセル期限延長申請をSlackに通知
 * @param {Object} data - {
 *   extensionId: 申請ID,
 *   cvId: CV ID,
 *   customerName: 顧客名,
 *   merchantId: 加盟店ID,
 *   merchantName: 加盟店名,
 *   contactDate: 連絡がついた日時,
 *   appointmentDate: アポ予定日,
 *   extensionReason: 延長理由,
 *   extendedDeadline: 延長後期限
 * }
 * @return {Object} 通知結果
 */
function sendSlackExtensionNotification(data) {
  try {
    // Bot Tokenを使用（Webhook代わり）- メッセージ更新のため
    const botToken = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
    const slackChannel = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL_ID') || '#加盟店管理';

    if (!botToken) {
      console.error('[SlackExtension] SLACK_BOT_TOKENが設定されていません');
      return { success: false, message: 'Slack設定エラー' };
    }

    // 日時フォーマット
    const contactDateStr = data.contactDate
      ? Utilities.formatDate(new Date(data.contactDate), 'JST', 'yyyy/MM/dd HH:mm')
      : '未設定';
    const appointmentDateStr = data.appointmentDate
      ? Utilities.formatDate(new Date(data.appointmentDate), 'JST', 'yyyy/MM/dd')
      : '未設定';
    const extendedDeadlineStr = data.extendedDeadline
      ? Utilities.formatDate(new Date(data.extendedDeadline), 'JST', 'yyyy/MM/dd HH:mm')
      : '未設定';

    // Bot Token APIペイロード（chat.postMessage）
    const payload = {
      channel: slackChannel,
      text: `⏰ キャンセル期限延長申請が提出されました`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*⏰ キャンセル期限延長申請*\n申請ID: ${data.extensionId}\n顧客: ${data.customerName} | 加盟店: ${data.merchantName}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*CV ID*\n${data.cvId}`
            },
            {
              type: 'mrkdwn',
              text: `*連絡がついた日時*\n${contactDateStr}`
            },
            {
              type: 'mrkdwn',
              text: `*アポ予定日*\n${appointmentDateStr}`
            },
            {
              type: 'mrkdwn',
              text: `*希望期限*\n${extendedDeadlineStr}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*延長理由*\n${data.extensionReason || '未記入'}`
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
              value: `approve_extension_${data.extensionId}`,
              action_id: 'approve_extension_request'
            },
            {
              type: 'static_select',
              placeholder: {
                type: 'plain_text',
                text: '❌ 却下理由を選択',
                emoji: true
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '理由不十分',
                    emoji: true
                  },
                  value: `reject_extension_${data.extensionId}::期限延長の理由が不十分なため、申請を承認できません。より具体的な理由とアポイント予定日を明記して再申請をお願いいたします。`
                }
              ],
              action_id: 'reject_extension_select'
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✏️ カスタム理由を入力',
                emoji: true
              },
              style: 'danger',
              value: `reject_extension_${data.extensionId}`,
              action_id: 'reject_extension_request'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 スプレッドシートを開く',
                emoji: true
              },
              url: getSpreadsheetUrl(),
              action_id: 'open_spreadsheet_extension'
            }
          ]
        }
      ]
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

    const response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
    const responseText = response.getContentText();
    console.log('[SlackExtension] Slack APIレスポンス:', responseText);

    const responseData = JSON.parse(responseText);

    if (responseData.ok) {
      console.log('[SlackExtension] 通知送信成功:', data.extensionId);
      console.log('[SlackExtension] Message TS:', responseData.ts);
      console.log('[SlackExtension] Channel ID:', responseData.channel);

      return {
        success: true,
        message: 'Slack通知を送信しました',
        channelId: responseData.channel,
        messageTs: responseData.ts
      };
    } else {
      console.error('[SlackExtension] 通知送信失敗:', responseData.error);
      return {
        success: false,
        message: 'Slack通知の送信に失敗しました: ' + responseData.error
      };
    }

  } catch (error) {
    console.error('[SlackExtension] 通知エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * スプレッドシートURLを取得
 * @return {String} スプレッドシートURL
 */
function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}
