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
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('[SlackCancel] Webhook URLが設定されていません');
      return { success: false, message: 'Slack設定エラー' };
    }

    // キャンセル申請文を整形（長すぎる場合は省略）
    const appTextPreview = data.cancelApplicationText?.length > 200
      ? data.cancelApplicationText.substring(0, 200) + '...'
      : data.cancelApplicationText;

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

    // 最終連絡日時を整形
    const lastContactStr = data.lastContactDate
      ? Utilities.formatDate(new Date(data.lastContactDate), 'JST', 'yyyy-MM-dd HH:mm')
      : '未設定';

    // フィールド配列を構築
    const fields = [
      {
        title: '申請ID',
        value: data.applicationId,
        short: true
      },
      {
        title: 'CV ID',
        value: data.cvId,
        short: true
      },
      {
        title: '顧客名',
        value: data.customerName,
        short: true
      },
      {
        title: '加盟店',
        value: `${data.merchantName} (ID: ${data.merchantId})`,
        short: true
      },
      {
        title: 'キャンセル理由',
        value: `${data.cancelReasonCategory} - ${data.cancelReasonDetail}`,
        short: false
      },
      {
        title: '電話回数',
        value: `${data.phoneCallCount || 0}回`,
        short: true
      },
      {
        title: 'SMS回数',
        value: `${data.smsCount || 0}回`,
        short: true
      },
      {
        title: '最終連絡日時',
        value: lastContactStr,
        short: true
      }
    ];

    // キャンセル申請文がある場合は追加
    if (appTextPreview) {
      fields.push({
        title: 'キャンセル申請文',
        value: appTextPreview,
        short: false
      });
    }

    const message = {
      text: competitorCheck.hasActiveCompetitors
        ? `@channel 🚫⚠️ キャンセル申請（他社追客中）`
        : `@channel 🚫 キャンセル申請が提出されました`,
      attachments: [
        {
          color: competitorCheck.hasActiveCompetitors ? 'warning' : 'good',
          title: 'キャンセル申請詳細',
          text: competitorWarningText || undefined,
          fields: fields,
          footer: '外壁塗装くらべるAI - 加盟店管理システム',
          ts: Math.floor(Date.now() / 1000)
        }
      ],
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
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ 却下',
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
    console.log('[SlackCancel] 送信するペイロード:', JSON.stringify(message, null, 2));

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);

    if (response.getResponseCode() === 200) {
      console.log('[SlackCancel] 通知送信成功:', data.applicationId);
      return {
        success: true,
        message: 'Slack通知を送信しました'
      };
    } else {
      const errorText = response.getContentText();
      console.error('[SlackCancel] 通知送信失敗 (Status:', response.getResponseCode(), ')');
      console.error('[SlackCancel] エラー詳細:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[SlackCancel] Slackエラー:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        // JSON parse失敗時はそのまま表示
      }
      return {
        success: false,
        message: 'Slack通知の送信に失敗しました'
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
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('[SlackExtension] Webhook URLが設定されていません');
      return { success: false, message: 'Slack設定エラー' };
    }

    // 日時フォーマット
    const contactDateStr = data.contactDate
      ? Utilities.formatDate(new Date(data.contactDate), 'JST', 'yyyy-MM-dd HH:mm')
      : '未設定';
    const appointmentDateStr = data.appointmentDate
      ? Utilities.formatDate(new Date(data.appointmentDate), 'JST', 'yyyy-MM-dd')
      : '未設定';
    const extendedDeadlineStr = data.extendedDeadline
      ? Utilities.formatDate(new Date(data.extendedDeadline), 'JST', 'yyyy-MM-dd HH:mm')
      : '未設定';

    // シンプルな構造に統一
    const summaryText = `*⏰ キャンセル期限延長申請*\n申請ID: ${data.extensionId}\n顧客: ${data.customerName} | 加盟店: ${data.merchantName}`;

    const message = {
      text: `@channel ⏰ キャンセル期限延長申請が提出されました`,
      attachments: [
        {
          color: 'good',
          title: '期限延長申請',
          fields: [
            {
              title: '申請ID',
              value: data.extensionId,
              short: true
            },
            {
              title: '顧客名',
              value: data.customerName,
              short: true
            },
            {
              title: '加盟店',
              value: data.merchantName,
              short: true
            },
            {
              title: '延長後期限',
              value: extendedDeadlineStr,
              short: true
            }
          ]
        }
      ],
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: summaryText
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
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ 却下',
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
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);

    if (response.getResponseCode() === 200) {
      console.log('[SlackExtension] 通知送信成功:', data.extensionId);
      return {
        success: true,
        message: 'Slack通知を送信しました'
      };
    } else {
      console.error('[SlackExtension] 通知送信失敗:', response.getContentText());
      return {
        success: false,
        message: 'Slack通知の送信に失敗しました'
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
