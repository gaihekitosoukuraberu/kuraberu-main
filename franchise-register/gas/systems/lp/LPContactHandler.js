/**
 * ============================================
 * LP問い合わせフォーム処理ハンドラー
 * ============================================
 *
 * 目的: LP下部の問い合わせフォームからの送信を処理
 * - スプレッドシート「ユーザー登録」シートに保存
 * - Slack通知を送信
 */

const LPContactHandler = {
  /**
   * スプレッドシートIDを取得
   */
  getSpreadsheetId() {
    return '1eHAUiuDbTdv9WC-RfpMUdp9HGlaqd1C7MHtgntKbSIU';
  },

  /**
   * LP問い合わせフォーム送信処理
   */
  submitContact(params) {
    try {
      console.log('[LPContactHandler] 問い合わせフォーム送信処理開始');
      console.log('[LPContactHandler] Params:', JSON.stringify(params));
      console.log('[LPContactHandler] params.name:', params.name);
      console.log('[LPContactHandler] params.email:', params.email);
      console.log('[LPContactHandler] params.phone:', params.phone);
      console.log('[LPContactHandler] params.postalCode:', params.postalCode);
      console.log('[LPContactHandler] params.inquiryContent:', params.inquiryContent);

      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      // CV ID生成
      const cvId = 'LP' + new Date().getTime();
      const timestamp = new Date();

      // データ行構築
      // LP問い合わせは最小限の情報のみ保存
      const row = [
        cvId,                                        // A: CV ID
        timestamp,                                   // B: 登録日時
        params.name || '',                           // C: 氏名
        '',                                          // D: フリガナ
        '',                                          // E: 性別
        '',                                          // F: 年齢
        params.phone ? ("'" + params.phone) : '',    // G: 電話番号
        params.email || '',                          // H: メールアドレス
        '',                                          // I: 続柄

        '',                                          // J-M: 2人目情報
        '',
        '',
        '',

        params.postalCode ? "'" + params.postalCode : '',  // N: 郵便番号（物件）
        '',                                          // O: 都道府県
        '',                                          // P: 市区町村
        '',                                          // Q: 住所詳細（物件）

        'FALSE',                                     // R: 自宅住所フラグ
        '',                                          // S-U: 自宅住所
        '',
        '',

        '',                                          // V-Y: 物件詳細
        '',
        '',
        '',

        '',                                          // Z: Q1_物件種別
        '',                                          // AA: Q2_階数
        '',                                          // AB: Q3_築年数
        '',                                          // AC: Q4_工事歴
        '',                                          // AD: Q5_前回施工時期
        '',                                          // AE: Q6_外壁材質
        '',                                          // AF: Q7_屋根材質
        '',                                          // AG: Q8_気になる箇所
        '',                                          // AH: Q9_希望工事内容_外壁
        '',                                          // AI: Q10_希望工事内容_屋根
        '',                                          // AJ: Q11_見積もり保有数
        '',                                          // AK: Q12_見積もり取得先
        '',                                          // AL: Q13_訪問業者有無
        '',                                          // AM: Q14_比較意向
        '',                                          // AN: Q15_訪問業者名
        '',                                          // AO: Q16_現在の劣化状況
        '',                                          // AP: Q17_業者選定条件

        '',                                          // AQ: 現地調査希望日時
        '',                                          // AR: 業者選定履歴

        params.inquiryContent || '',                 // AS: 案件メモ（お問い合わせ内容）
        '',                                          // AT: 連絡時間帯
        '',                                          // AU: 見積もり送付先
        '',                                          // AV: 予備項目1

        '未配信',                                     // AW: 配信ステータス
        0,                                           // AX: 配信先加盟店数
        '',                                          // AY: 配信日時
        'FALSE',                                     // AZ: 成約フラグ
        '',                                          // BA: 成約日時
        '',                                          // BB: 成約加盟店ID
        '',                                          // BC: 成約金額

        '',                                          // BD: 流入元URL
        'LP問い合わせフォーム',                        // BE: 検索キーワード
        '',                                          // BF: UTMパラメータ

        1,                                           // BG: 訪問回数
        timestamp,                                   // BH: 最終訪問日時
        'FALSE',                                     // BI: ブロックフラグ

        '',                                          // BJ: 架電履歴
        '',                                          // BK: 次回架電日時
        '',                                          // BL: メモ

        '新規',                                       // BM: 管理ステータス
        '',                                          // BN: 加盟店別ステータス（JSON）
        '',                                          // BO: 初回架電日時
        timestamp,                                   // BP: 最終更新日時
        '',                                          // BQ: 配信予定日時
        '',                                          // BR: 担当者名
        ''                                           // BS: 最終架電日時
      ];

      // 最終行に追加
      const lastRow = sheet.getLastRow() + 1;
      sheet.appendRow(row);

      // 電話番号と郵便番号を文字列形式に設定
      sheet.getRange(lastRow, 7).setNumberFormat('@STRING@');  // G: 電話番号
      sheet.getRange(lastRow, 14).setNumberFormat('@STRING@'); // N: 郵便番号（物件）

      console.log('[LPContactHandler] スプレッドシート保存完了:', cvId);

      // Slack通知送信
      try {
        this.sendSlackNotification({
          cvId: cvId,
          name: params.name || '',
          email: params.email || '',
          phone: params.phone || '',
          postalCode: params.postalCode || '',
          inquiryContent: params.inquiryContent || '',
          timestamp: timestamp
        });
        console.log('[LPContactHandler] Slack通知送信完了');
      } catch (slackError) {
        console.error('[LPContactHandler] Slack通知送信エラー:', slackError);
        // Slack通知失敗してもスプレッドシート保存は成功とする
      }

      return {
        success: true,
        cvId: cvId,
        message: 'LP問い合わせ受付完了'
      };

    } catch (error) {
      console.error('[LPContactHandler] LP問い合わせ送信エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Slack通知送信
   */
  sendSlackNotification(data) {
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

      if (!webhookUrl) {
        console.error('[LPContactHandler] Slack Webhook URLが設定されていません');
        return;
      }

      // お問い合わせ内容を改行で整形
      const inquiryText = data.inquiryContent
        ? data.inquiryContent.split(',').map(item => `• ${item.trim()}`).join('\n')
        : 'なし';

      const message = {
        text: '@channel 📧 LP問い合わせフォームから新規問い合わせがありました',
        attachments: [
          {
            color: '#36a64f',
            title: 'LP問い合わせ詳細',
            fields: [
              {
                title: '受付ID',
                value: data.cvId,
                short: true
              },
              {
                title: '受付日時',
                value: Utilities.formatDate(data.timestamp, 'JST', 'yyyy/MM/dd HH:mm:ss'),
                short: true
              },
              {
                title: 'お名前',
                value: data.name || '未入力',
                short: true
              },
              {
                title: 'メールアドレス',
                value: data.email || '未入力',
                short: true
              },
              {
                title: '電話番号',
                value: data.phone || '未入力',
                short: true
              },
              {
                title: '郵便番号',
                value: data.postalCode || '未入力',
                short: true
              },
              {
                title: 'お問い合わせ内容',
                value: inquiryText,
                short: false
              }
            ],
            footer: '外壁塗装くらべる LP問い合わせフォーム',
            ts: Math.floor(Date.now() / 1000)
          }
        ],
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📧 LP問い合わせフォーム*\nお名前: *${data.name || '未入力'}*\n電話番号: ${data.phone || '未入力'}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '📊 スプレッドシートを開く',
                  emoji: true
                },
                url: this.getSpreadsheetUrl()
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
        console.log('[LPContactHandler] Slack通知送信成功:', data.cvId);
      } else {
        console.error('[LPContactHandler] Slack通知送信失敗:', response.getContentText());
      }

    } catch (error) {
      console.error('[LPContactHandler] Slack通知エラー:', error);
      throw error;
    }
  },

  /**
   * スプレッドシートのURLを取得
   */
  getSpreadsheetUrl() {
    const ssId = this.getSpreadsheetId();
    return `https://docs.google.com/spreadsheets/d/${ssId}/edit`;
  },

  /**
   * POSTハンドラー（main.jsから呼ばれる）
   */
  handlePost(e, postData) {
    console.log('[LPContactHandler] handlePost called');
    console.log('[LPContactHandler] postData:', JSON.stringify(postData));

    const action = postData.action || e.parameter.action;
    console.log('[LPContactHandler] action:', action);

    if (action === 'lp_contact_submit') {
      return this.submitContact(postData);
    }

    return {
      success: false,
      error: 'Unknown action: ' + action
    };
  }
};
