/**
 * ファイル名: api.gs
 * 外壁塗装くらべるAI - キャンセル申請機能拡張
 * Slack通知・GPT理由生成・システムログ記録の統合API
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * 🔁 機能1: Slack通知（キャンセル通知）
 * キャンセル申請時にSlackに通知を送信
 * 
 * @param {string} inquiryId - 案件ID
 * @param {string} reason - キャンセル理由
 * @param {string} operatorId - 担当者ID
 * @param {string} memo - 備考（任意）
 * @return {boolean} 送信成功可否
 */
function sendCancelNotificationToSlack_(inquiryId, reason, operatorId, memo = '') {
  try {
    console.log(`📢 Slackキャンセル通知送信開始: ${inquiryId}`);
    
    // スクリプトプロパティからWebhook URL取得
    const properties = PropertiesService.getScriptProperties();
    const webhookUrl = properties.getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL が設定されていません');
    }
    
    // 通知メッセージ作成
    const message = `【キャンセル申請】案件ID: ${inquiryId}
理由: ${reason}
担当者: ${operatorId}
備考: ${memo || ''}`;
    
    // Slack Webhook用ペイロード
    const payload = {
      text: message,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':warning:',
      attachments: [
        {
          color: 'warning',
          fields: [
            {
              title: '案件ID',
              value: inquiryId,
              short: true
            },
            {
              title: '担当者',
              value: operatorId,
              short: true
            },
            {
              title: 'キャンセル理由',
              value: reason,
              short: false
            }
          ]
        }
      ]
    };
    
    // HTTPS POST送信
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      console.log('✅ Slack通知送信成功');
      
      // 成功ログ記録
      claude_logEvent(
        'INFO',
        'Slack通知',
        'キャンセル通知送信',
        `案件ID: ${inquiryId}, 担当者: ${operatorId}`,
        inquiryId
      );
      
      return true;
    } else {
      throw new Error(`Slack送信失敗: HTTP ${responseCode} - ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ Slack通知送信エラー:', error.toString());
    
    // エラーログ記録（機密情報をマスキング）
    const maskedError = error.toString().replace(/https:\/\/hooks\.slack\.com\/[^\s]+/, '[MASKED_WEBHOOK_URL]');
    claude_logEvent(
      'ERROR',
      'Slack通知',
      'キャンセル通知送信失敗',
      `エラー: ${maskedError}`,
      inquiryId || 'UNKNOWN'
    );
    
    return false;
  }
}

/**
 * 🧠 機能2: GPTによる理由テンプレ生成
 * 自由記述のキャンセル理由を丁寧なテンプレート文に変換
 * 
 * @param {string} rawReason - 自由記述の理由文
 * @return {string} 丁寧で共感的なテンプレート文
 */
function generateCancelReasonExample_(rawReason) {
  try {
    console.log('🧠 GPTキャンセル理由テンプレ生成開始');
    
    if (!rawReason || rawReason.trim() === '') {
      console.warn('入力理由が空のため、デフォルトテンプレートを返却');
      return 'この度はお忙しい中お時間をいただき、誠にありがとうございました。またの機会によろしくお願いいたします。';
    }
    
    // aliasマッピングを考慮してAPIキー取得
    const properties = PropertiesService.getScriptProperties();
    let apiKey = properties.getProperty('GPT_API_KEY');
    if (!apiKey) {
      apiKey = properties.getProperty('OPENAI_API_KEY'); // alias対応
    }
    
    if (!apiKey) {
      throw new Error('GPT_API_KEY または OPENAI_API_KEY が設定されていません');
    }
    
    // 安全なシステムプロンプト（マスキング済み）
    const systemPrompt = `あなたはリフォーム関連サービスの営業担当者です。  
見積依頼後にユーザーから届く「キャンセル」「金額交渉」「施工内容の修正（例：屋根のみ希望）」などの申請に対して、丁寧かつ共感的な返信文を生成してください。

🧩 応答文の要件：
- 顧客の状況や申請理由に理解を示す（例：「ご事情、承知いたしました」など）
- 感謝の気持ちを表現する（例：「ご連絡ありがとうございます」）
- 申請内容に応じて、以下のいずれかを必ず含める：
  - 🔹 キャンセルの場合：「審査部署にて確認後、ご連絡差し上げます」
  - 🔹 金額交渉・施工内容修正の場合：「いただいた内容をもとに再確認し、改めてご連絡いたします」
- 「外壁塗装」「屋根修理」などのサービス名は、入力文の文脈に合わせて自然に表現する
- 文体はビジネス的かつ親しみやすく
- 全体で100文字以内にまとめ、1文で返答すること

入力された申請理由の文脈を正しく読み取り、適切なテンプレート文を生成してください。
📝 これで対応可能な例
入力文（例）    出力例（期待）
外壁屋根セットで頼んだけど、屋根だけで良かった    ご連絡ありがとうございます。屋根のみのご依頼として再確認し、改めてご連絡いたします。
金額が合わないので検討し直します    ご連絡ありがとうございます。ご希望内容を確認し、改めてご連絡いたします。
キャンセルします    ご連絡ありがとうございます。キャンセル内容は審査部署にて確認後、ご連絡差し上げます。`;
    
    const userPrompt = `キャンセル理由: ${rawReason}`;
    
    // OpenAI API呼び出し
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());
    
    if (responseCode !== 200) {
      throw new Error(`OpenAI API エラー: ${responseCode} - ${responseData.error?.message || 'Unknown error'}`);
    }
    
    // レスポンス整形
    const generatedText = responseData.choices?.[0]?.message?.content?.trim() || '';
    
    if (generatedText === '') {
      throw new Error('GPTからの応答が空です');
    }
    
    console.log('✅ GPTテンプレ生成成功');
    
    // 成功ログ記録
    claude_logEvent(
      'INFO',
      'GPT API',
      'キャンセル理由テンプレ生成',
      `入力文字数: ${rawReason.length}, 出力文字数: ${generatedText.length}`,
      'TEMPLATE_GENERATION'
    );
    
    return generatedText;
    
  } catch (error) {
    console.error('❌ GPTテンプレ生成エラー:', error.toString());
    
    // エラーログ記録（機密情報をマスキング）
    const maskedError = error.toString().replace(/Bearer [^\s]+/, 'Bearer [MASKED_API_KEY]');
    claude_logEvent(
      'ERROR',
      'GPT API',
      'キャンセル理由テンプレ生成失敗',
      `エラー: ${maskedError}`,
      'TEMPLATE_GENERATION'
    );
    
    // フォールバック対応
    return 'この度はお忙しい中お時間をいただき、誠にありがとうございました。またの機会によろしくお願いいたします。';
  }
}

/**
 * 📊 機能3: システムログ記録
 * 統合ログシステムへの記録を行う
 * 
 * @param {string} level - ログレベル（INFO, WARNING, ERROR, DEBUG）
 * @param {string} source - 発生元
 * @param {string} eventType - イベントタイプ
 * @param {string} message - メッセージ
 * @param {string} relatedId - 関連ID（任意）
 */
function claude_logEvent(level, source, eventType, message, relatedId = '') {
  try {
    const logSheet = getSheetByName_('システムログ');
    const headers = logSheet.getDataRange().getValues()[0];
    
    const now = new Date();
    const logId = `LOG-${String(now.getTime()).slice(-10)}`;
    const timestamp = now.toLocaleString('ja-JP');
    
    const logData = [];
    // システムログシートの全カラム分の配列を初期化
    for (let i = 0; i < headers.length; i++) {
      logData.push('');
    }
    
    // 必要なカラムにデータを設定
    const indexMap = claude_getColumnIndexMap(headers, [
      'ログID', 'タイムスタンプ', 'ログレベル', '発生元',
      'イベントタイプ', 'メッセージ', '関連ID'
    ], 'システムログ');
    
    logData[indexMap['ログID']] = logId;
    logData[indexMap['タイムスタンプ']] = timestamp;
    logData[indexMap['ログレベル']] = level;
    logData[indexMap['発生元']] = source;
    logData[indexMap['イベントタイプ']] = eventType;
    logData[indexMap['メッセージ']] = message;
    logData[indexMap['関連ID']] = relatedId;
    
    logSheet.appendRow(logData);
    
    console.log(`システムログ記録: ${level} - ${eventType}`);
    
  } catch (error) {
    console.error('システムログ記録エラー:', error.toString());
    // ログ記録の失敗は全体処理を停止させない
  }
}

/**
 * 🔧 機能4: Webアプリケーション統合API - doPost
 * キャンセル申請の受付エンドポイント
 * 
 * @param {Object} e - GAS doPostイベント
 * @return {Object} レスポンス
 */
function doPost(e) {
  try {
    console.log('📥 doPost API受信開始');
    
    let requestData;
    
    // Content-Type判定
    if (e.postData.type === 'application/json') {
      requestData = JSON.parse(e.postData.contents);
    } else {
      requestData = e.parameter;
    }
    
    console.log('📋 受信データ:', JSON.stringify(requestData, null, 2));
    
    const action = requestData.action;
    
    if (action === 'cancelRequest') {
      return handleCancelRequest_(requestData);
    } else if (action === 'generateTemplate') {
      return handleTemplateGeneration_(requestData);
    } else if (action === 'extractFromWebsite') {
      return handleWebsiteExtraction_(requestData);
    } else {
      throw new Error(`未対応のアクション: ${action}`);
    }
    
  } catch (error) {
    console.error('❌ doPost API エラー:', error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

/**
 * 🚫 キャンセル申請処理ハンドラー
 * 
 * @param {Object} requestData - リクエストデータ
 * @return {Object} レスポンス
 */
function handleCancelRequest_(requestData) {
  try {
    console.log('🚫 キャンセル申請処理開始');
    
    const inquiryId = requestData.inquiryId;
    const reason = requestData.reason;
    const operatorId = requestData.operatorId || 'UNKNOWN';
    const memo = requestData.memo || '';
    
    if (!inquiryId || !reason) {
      throw new Error('inquiryIdとreasonは必須です');
    }
    
    // 1. Slack通知送信
    const slackResult = sendCancelNotificationToSlack_(inquiryId, reason, operatorId, memo);
    
    // 2. GPTテンプレート生成
    const templateText = generateCancelReasonExample_(reason);
    
    // 3. システムログ記録
    claude_logEvent(
      'INFO',
      'キャンセル申請API',
      'キャンセル申請処理完了',
      `案件ID: ${inquiryId}, Slack通知: ${slackResult ? '成功' : '失敗'}`,
      inquiryId
    );
    
    const response = {
      success: true,
      inquiryId: inquiryId,
      slackNotified: slackResult,
      templateText: templateText,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ キャンセル申請処理完了');
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
    
  } catch (error) {
    console.error('❌ キャンセル申請処理エラー:', error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

/**
 * 📝 テンプレート生成処理ハンドラー
 * 
 * @param {Object} requestData - リクエストデータ
 * @return {Object} レスポンス
 */
function handleTemplateGeneration_(requestData) {
  try {
    console.log('📝 テンプレート生成処理開始');
    
    const reason = requestData.reason;
    
    if (!reason) {
      throw new Error('reasonは必須です');
    }
    
    const templateText = generateCancelReasonExample_(reason);
    
    const response = {
      success: true,
      templateText: templateText,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ テンプレート生成処理完了');
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
    
  } catch (error) {
    console.error('❌ テンプレート生成処理エラー:', error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

/**
 * 🌐 Webサイト抽出処理ハンドラー
 * 
 * @param {Object} requestData - リクエストデータ
 * @return {Object} レスポンス
 */
function handleWebsiteExtraction_(requestData) {
  try {
    console.log('🌐 Webサイト抽出処理開始');
    
    // 既存のextractFromWebsiteCore関数を呼び出し
    if (typeof extractFromWebsiteCore === 'function') {
      return extractFromWebsiteCore(requestData);
    } else {
      throw new Error('extractFromWebsiteCore関数が見つかりません');
    }
    
  } catch (error) {
    console.error('❌ Webサイト抽出処理エラー:', error.toString());
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}

/**
 * 🔧 doGet - ヘルスチェック用
 * 
 * @param {Object} e - GAS doGetイベント
 * @return {Object} レスポンス
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'health';
    
    if (action === 'health') {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
    } else {
      throw new Error(`未対応のアクション: ${action}`);
    }
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
  }
}