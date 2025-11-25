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

      // 行データを準備（CSVカラム順に合わせる）
      // CV ID,登録日時,氏名,フリガナ,性別,年齢,電話番号,メールアドレス,続柄,氏名（2人目）,電話番号（2人目）,続柄（2人目）,備考（2人目）,郵便番号（物件）,都道府県（物件）,市区町村（物件）,住所詳細（物件）,住所フリガナ,...
      const rowData = [
        '',                           // CV ID（空）
        timestamp,                    // 登録日時
        data.name || '',              // 氏名
        '',                           // フリガナ（空）
        '',                           // 性別（空）
        '',                           // 年齢（空）
        data.phone || '',             // 電話番号
        data.email || '',             // メールアドレス
        '',                           // 続柄（空）
        '',                           // 氏名（2人目）（空）
        '',                           // 電話番号（2人目）（空）
        '',                           // 続柄（2人目）（空）
        '',                           // 備考（2人目）（空）
        data.postalCode || '',        // 郵便番号（物件）
        '',                           // 都道府県（物件）（空）
        '',                           // 市区町村（物件）（空）
        '',                           // 住所詳細（物件）（空）
        '',                           // 住所フリガナ（空）
        '',                           // 自宅住所フラグ（空）
        '',                           // 郵便番号（自宅）（空）
        '',                           // 都道府県（自宅）（空）
        '',                           // 住所詳細（自宅）（空）
        '',                           // 物件種別（空）
        '',                           // 築年数（空）
        '',                           // 建物面積（空）
        '',                           // 階数（空）
        '',                           // Q1_物件種別（空）
        '',                           // Q2_階数（空）
        '',                           // Q3_築年数（空）
        '',                           // Q4_工事歴（空）
        '',                           // Q5_前回施工時期（空）
        '',                           // Q6_外壁材質（空）
        '',                           // Q7_屋根材質（空）
        '',                           // Q8_気になる箇所（空）
        '',                           // Q9_希望工事内容_外壁（空）
        '',                           // Q10_希望工事内容_屋根（空）
        '',                           // Q11_見積もり保有数（空）
        '',                           // Q12_見積もり取得先（空）
        '',                           // Q13_訪問業者有無（空）
        '',                           // Q14_比較意向（空）
        '',                           // Q15_訪問業者名（空）
        '',                           // Q16_現在の劣化状況（空）
        '',                           // Q17_業者選定条件（空）
        '',                           // 現地調査希望日時（空）
        '',                           // 業者選定履歴（空）
        data.inquiryContent || '',    // 案件メモ
        '',                           // 連絡時間帯（空）
        '',                           // 見積もり送付先（空）
        '',                           // ワードリンク回答（空）
        '',                           // 配信ステータス（空）
        '',                           // 配信先加盟店数（空）
        '',                           // 配信日時（空）
        '',                           // 成約フラグ（空）
        '',                           // 成約日時（空）
        '',                           // 成約加盟店ID（空）
        '',                           // 成約金額（空）
        '',                           // 流入元URL（空）
        '',                           // 検索キーワード（空）
        '',                           // UTMパラメータ（空）
        '',                           // 訪問回数（空）
        '',                           // 最終訪問日時（空）
        '',                           // ブロックフラグ（空）
        '',                           // 架電履歴（空）
        '',                           // 次回架電日時（空）
        '',                           // メモ（空）
        '未対応'                      // 管理ステータス
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
