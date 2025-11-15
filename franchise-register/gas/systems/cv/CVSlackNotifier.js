/**
 * ============================================
 * CV Slack通知システム（V1754）
 * ============================================
 *
 * 目的: CV関連の通知をSlackに送信
 * 機能:
 * - CV1送信通知
 * - CV2送信通知
 * - 離脱検知通知
 */

class CVSlackNotifier {
  /**
   * Slack Webhook URL
   */
  static get WEBHOOK_URL() {
    return PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL') ||
           'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';
  }

  /**
   * CV1送信通知
   * @param {Object} params - { cvId, phone, prefecture, city, workTypes }
   */
  static sendCV1Notification(params) {
    try {
      const { cvId, phone, prefecture, city, workTypes } = params;

      const message = {
        text: '🔥 新規リード獲得！',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔥 新規リード獲得！',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*📱 電話番号:*\n${phone || '未入力'}`
              },
              {
                type: 'mrkdwn',
                text: `*📍 エリア:*\n${prefecture || ''}${city || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*🏠 施工箇所:*\n${workTypes || '未選択'}`
              },
              {
                type: 'mrkdwn',
                text: `*CV ID:*\n${cvId}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👉 *<https://gaihekikuraberu.com/admin-dashboard/#assignment|案件管理画面へ>*`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📅 ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
              }
            ]
          }
        ]
      };

      return this.sendToSlack(message);

    } catch (error) {
      console.error('[CVSlack] CV1通知エラー:', error);
      return false;
    }
  }

  /**
   * CV2送信通知
   * @param {Object} params - { cvId, name, email, phone, address, surveyDates, requests }
   */
  static sendCV2Notification(params) {
    try {
      const { cvId, name, email, phone, address, surveyDates, requests } = params;

      const message = {
        text: '📝 詳細情報登録完了',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📝 詳細情報登録完了',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*👤 名前:*\n${name || '未入力'}`
              },
              {
                type: 'mrkdwn',
                text: `*📱 電話:*\n${phone || '未入力'}`
              },
              {
                type: 'mrkdwn',
                text: `*📧 メール:*\n${email || '未入力'}`
              },
              {
                type: 'mrkdwn',
                text: `*📍 住所:*\n${address || '未入力'}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📅 調査希望:*\n${surveyDates || '未選択'}\n\n*💬 要望:*\n${requests || 'なし'}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👉 *<https://gaihekikuraberu.com/admin-dashboard/#assignment|案件管理画面へ>*`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `CV ID: ${cvId} | ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
              }
            ]
          }
        ]
      };

      return this.sendToSlack(message);

    } catch (error) {
      console.error('[CVSlack] CV2通知エラー:', error);
      return false;
    }
  }

  /**
   * 離脱検知通知
   * @param {Object} params - { cvId, phone, prefecture, city, lastHeartbeat }
   */
  static sendAbandonmentNotification(params) {
    try {
      const { cvId, phone, prefecture, city, lastHeartbeat } = params;

      const now = new Date();
      const minutesAgo = Math.floor((now - new Date(lastHeartbeat)) / 1000 / 60);

      const message = {
        text: '⚠️ CV1後に離脱の可能性',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ CV1後に離脱の可能性',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*📱 電話番号:*\n${phone || '未入力'}`
              },
              {
                type: 'mrkdwn',
                text: `*📍 エリア:*\n${prefecture || ''}${city || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*⏱️ 最終活動:*\n${minutesAgo}分前`
              },
              {
                type: 'mrkdwn',
                text: `*CV ID:*\n${cvId}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '💡 *すぐ架電推奨！*'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👉 *<https://gaihekikuraberu.com/admin-dashboard/#assignment|案件管理画面へ>*`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
              }
            ]
          }
        ]
      };

      return this.sendToSlack(message);

    } catch (error) {
      console.error('[CVSlack] 離脱通知エラー:', error);
      return false;
    }
  }

  /**
   * Slackにメッセージ送信
   * @param {Object} message - Slack message payload
   * @return {boolean} 成功/失敗
   */
  static sendToSlack(message) {
    try {
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(this.WEBHOOK_URL, options);
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        console.log('[CVSlack] 送信成功');
        return true;
      } else {
        console.error('[CVSlack] 送信失敗:', responseCode, response.getContentText());
        return false;
      }

    } catch (error) {
      console.error('[CVSlack] 送信エラー:', error);
      return false;
    }
  }
}
