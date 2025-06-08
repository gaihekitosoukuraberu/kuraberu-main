/**
 * slackNotifier.gs - Slack通知を送信する
 */

/**
 * SlackNotifierオブジェクト - Slack通知機能を提供
 */
const SlackNotifier = {
  /**
   * フォームデータに基づいてSlack通知を送信する
   * @param {Object} formData - フォームから送信されたデータ
   * @returns {Object} - 通知結果の情報
   */
  sendNotification: function(formData) {
    try {
      // アプリケーション設定を取得
      const config = getAppConfig();
      
      // Webhook URLが設定されていない場合は早期リターン
      if (!config.slackWebhookUrl || config.slackWebhookUrl.trim() === '') {
        console.log('Slack Webhook URLが設定されていないため、通知はスキップされました');
        return {
          success: false,
          message: 'Slack Webhook URLが設定されていません',
          timestamp: new Date().toString()
        };
      }
      
      // 現在の時間を記録（ログ用）
      const startTime = new Date();
      console.log(`Slack通知処理開始: ${startTime.toISOString()}`);

      // Slackメッセージを作成
      const payload = this.createSlackPayload(formData);

      // デバッグ用にペイロードをログ出力（機密情報は編集）
      const debugPayload = JSON.parse(JSON.stringify(payload)); // ディープコピー
      if (debugPayload.blocks) {
        // 電話番号とメールアドレスを保護
        debugPayload.blocks.forEach(block => {
          if (block.fields) {
            block.fields.forEach(field => {
              if (field.text && (field.text.includes('電話番号') || field.text.includes('メールアドレス'))) {
                field.text = field.text.replace(/\n.+$/, '\n[編集済み]');
              }
            });
          }
        });
      }
      console.log('Slack通知ペイロード:', JSON.stringify(debugPayload));

      // Webhook URLにPOSTリクエストを送信
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true, // HTTPエラーを無視してレスポンスを取得
        validateHttpsCertificates: true // SSL証明書を検証
      };

      console.log('Slack通知を送信します: ' + config.slackWebhookUrl.substring(0, 30) + '...');
      const response = UrlFetchApp.fetch(config.slackWebhookUrl, options);
      
      // レスポンスを確認
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      console.log(`Slackレスポンス: ${responseCode} - ${responseText}`);
      
      if (responseCode === 200 && responseText === 'ok') {
        return {
          success: true,
          message: 'Slack通知が正常に送信されました',
          timestamp: new Date().toString()
        };
      } else {
        throw new Error(`Slack API エラー: ${responseCode} - ${responseText}`);
      }
      
    } catch (error) {
      console.error('Slack通知の送信中にエラーが発生しました:', error);
      
      return {
        success: false,
        message: `Slack通知エラー: ${error.message}`,
        timestamp: new Date().toString()
      };
    }
  },
  
  /**
   * Slack用のペイロードを作成する
   * @param {Object} formData - フォームから送信されたデータ
   * @returns {Object} - Slack APIに送信するペイロード
   */
  createSlackPayload: function(formData) {
    // 建物タイプの日本語表記への変換
    const buildingTypeMap = {
      'detached': '戸建て住宅',
      'apartment': 'マンション・アパート',
      'store': '店舗・事務所',
      'other': 'その他'
    };
    
    // 希望施工時期の日本語表記への変換
    const timeFrameMap = {
      'asap': 'すぐにでも（1ヶ月以内）',
      '3months': '3ヶ月以内',
      '6months': '半年以内',
      'undecided': '検討中・未定'
    };
    
    // 現在の日時
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    
    // フィールドを生成
    const fields = [
      {
        title: 'お名前',
        value: formData.name || '(未入力)',
        short: true
      },
      {
        title: '電話番号',
        value: formData.phone || '(未入力)',
        short: true
      },
      {
        title: 'メールアドレス',
        value: formData.email || '(未入力)',
        short: true
      },
      {
        title: '住所',
        value: `〒${formData.postalCode || ''} ${formData.address || '(未入力)'}`,
        short: false
      },
      {
        title: '建物タイプ',
        value: buildingTypeMap[formData.buildingType] || formData.buildingType || '(未選択)',
        short: true
      },
      {
        title: '希望施工時期',
        value: timeFrameMap[formData.timeFrame] || formData.timeFrame || '(未選択)',
        short: true
      }
    ];
    
    // お問い合わせ内容がある場合は追加
    if (formData.message && formData.message.trim() !== '') {
      fields.push({
        title: 'お問い合わせ内容',
        value: formData.message,
        short: false
      });
    }
    
    // UTM情報がある場合は追加
    const utmInfo = [];
    if (formData.utm_source) utmInfo.push(`ソース: ${formData.utm_source}`);
    if (formData.utm_medium) utmInfo.push(`メディア: ${formData.utm_medium}`);
    if (formData.utm_campaign) utmInfo.push(`キャンペーン: ${formData.utm_campaign}`);
    
    if (utmInfo.length > 0) {
      fields.push({
        title: '広告トラッキング',
        value: utmInfo.join('\n'),
        short: false
      });
    }
    
    // Slackメッセージを作成
    return {
      text: '🔔 *外壁塗装くらべる: 新しい見積もり依頼*',
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🏠 新規見積もり依頼",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${formattedDate}に新しい見積もり依頼がありました*\n外壁塗装くらべるウェブサイトより`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*お名前:*\n${formData.name || '(未入力)'}`
            },
            {
              type: "mrkdwn",
              text: `*電話番号:*\n${formData.phone || '(未入力)'}`
            }
          ]
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*メールアドレス:*\n${formData.email || '(未入力)'}`
            },
            {
              type: "mrkdwn",
              text: `*郵便番号:*\n${formData.postalCode || '(未入力)'}`
            }
          ]
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*住所:*\n${formData.address || '(未入力)'}`
            }
          ]
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*建物タイプ:*\n${buildingTypeMap[formData.buildingType] || formData.buildingType || '(未選択)'}`
            },
            {
              type: "mrkdwn",
              text: `*希望施工時期:*\n${timeFrameMap[formData.timeFrame] || formData.timeFrame || '(未選択)'}`
            }
          ]
        },
        // お問い合わせ内容がある場合
        ...(formData.message && formData.message.trim() !== '' ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*お問い合わせ内容:*\n${formData.message}`
            }
          }
        ] : []),

        // UTM情報がある場合
        ...(utmInfo.length > 0 ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*広告トラッキング:*\n${utmInfo.join('\n')}`
            }
          }
        ] : []),

        // フッター
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `送信元ページ: ${formData.page_url || '不明'}`
            }
          ]
        }
      ]
    };
  }
};