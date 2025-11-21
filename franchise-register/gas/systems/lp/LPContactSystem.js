/**
 * ====================================
 * LP問い合わせフォーム管理システム
 * ====================================
 *
 * 【機能】
 * - LPフォームからの問い合わせデータをスプレッドシートに保存
 * - Slack通知送信
 *
 * 【V1845】 2025-11-21 17:30 - LP問い合わせ処理システム作成
 * - lp_contact_submit アクション対応
 * - ユーザー登録シートへの書き込み
 * - Slack通知機能実装
 */

const LPContactSystem = {
  /**
   * 名前
   */
  name: 'LPContactSystem',

  /**
   * スプレッドシートID（環境変数から取得）
   */
  get SPREADSHEET_ID() {
    return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  },

  /**
   * POSTリクエスト処理
   * @param {Object} e - イベントオブジェクト
   * @param {Object} postData - POSTデータ
   * @return {Object} 処理結果
   */
  handlePost: function(e, postData) {
    try {
      console.log('[LPContactSystem] handlePost called');
      console.log('[LPContactSystem] postData:', JSON.stringify(postData));

      const action = postData.action || e.parameter.action;

      if (action === 'lp_contact_submit') {
        return this.saveLPContact(postData);
      }

      return {
        success: false,
        error: `Unknown action: ${action}`
      };

    } catch (error) {
      console.error('[LPContactSystem] handlePost error:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * LP問い合わせデータを保存
   * @param {Object} data - フォームデータ
   * @return {Object} 処理結果
   */
  saveLPContact: function(data) {
    try {
      console.log('[LPContactSystem] saveLPContact start');
      console.log('[LPContactSystem] Received data:', JSON.stringify(data));

      // データ検証
      if (!data.name || !data.email || !data.phone) {
        return {
          success: false,
          error: '必須項目が不足しています（name, email, phone）'
        };
      }

      // スプレッドシート取得
      const ss = SpreadsheetApp.openById(this.SPREADSHEET_ID);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        console.error('[LPContactSystem] ユーザー登録シートが見つかりません');
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // タイムスタンプ
      const timestamp = new Date();

      // 行データを準備
      const rowData = [
        timestamp,                    // タイムスタンプ
        data.name || '',              // 名前
        '',                           // フリガナ（空）
        data.email || '',             // メールアドレス
        data.phone || '',             // 電話番号
        data.postalCode || '',        // 郵便番号
        '',                           // 住所（都道府県）
        '',                           // 住所（市区町村）
        '',                           // 住所詳細（物件）
        '',                           // 住所フリガナ
        data.inquiryContent || '',    // お問い合わせ内容
        '未対応',                     // 管理ステータス
        ''                            // 備考
      ];

      console.log('[LPContactSystem] Appending row:', JSON.stringify(rowData));

      // シートに追加
      sheet.appendRow(rowData);

      console.log('[LPContactSystem] Row appended successfully');

      // Slack通知送信
      this.sendSlackNotification(data);

      return {
        success: true,
        message: 'LP問い合わせデータを保存しました',
        timestamp: timestamp.toISOString()
      };

    } catch (error) {
      console.error('[LPContactSystem] saveLPContact error:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * Slack通知送信
   * @param {Object} data - フォームデータ
   */
  sendSlackNotification: function(data) {
    try {
      console.log('[LPContactSystem] sendSlackNotification start');

      // Slack Webhook URLを環境変数から取得
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

      if (!webhookUrl) {
        console.error('[LPContactSystem] SLACK_WEBHOOK_URLが設定されていません');
        return;
      }

      const message = {
        text: '📝 LP問い合わせが届きました',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📝 LP問い合わせフォーム送信',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*お名前:*\n${data.name || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*電話番号:*\n${data.phone || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*メールアドレス:*\n${data.email || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*郵便番号:*\n${data.postalCode || ''}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*お問い合わせ内容:*\n${data.inquiryContent || ''}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⏰ ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
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
      const responseCode = response.getResponseCode();

      console.log('[LPContactSystem] Slack notification sent, response code:', responseCode);

      if (responseCode !== 200) {
        console.error('[LPContactSystem] Slack notification failed:', response.getContentText());
      }

    } catch (error) {
      console.error('[LPContactSystem] sendSlackNotification error:', error);
      // Slack通知失敗はエラーとして扱わない（データ保存は成功している）
    }
  }
};

/**
 * テスト関数: LPContactSystemをGASエディタから直接テスト
 */
function testLPContactSystem() {
  console.log('===== LPContactSystem Test Start =====');

  const testData = {
    action: 'lp_contact_submit',
    name: 'テスト太郎',
    email: 'test@example.com',
    phone: '090-1234-5678',
    postalCode: '123-4567',
    inquiryContent: 'これはテストです'
  };

  console.log('Test data:', JSON.stringify(testData));

  const result = LPContactSystem.handlePost({parameter: testData}, testData);

  console.log('Result:', JSON.stringify(result));
  console.log('===== LPContactSystem Test End =====');

  return result;
}
