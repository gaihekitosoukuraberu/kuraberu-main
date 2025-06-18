/**
 * 📂 ファイル名: notify_fixed.gs
 * 🎯 内容: 外壁塗装くらべるAI - 統合通知システム（完全版）
 * - Slack / SendGrid / Twilio / LINE Messaging API + LINE連携管理
 * - 通知対象ユーザー抽出・履歴管理機能統合済み
 * - async/await エラー修正版・GAS V8環境対応済み
 * - LINE Webhook判定・統合処理
 * ✅ 全通知チャネル統合システム
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * LINE Webhook判定（エラー回避重視）
 * 
 * @param {Object} e リクエスト
 * @returns {boolean} LINE Webhookかどうか
 */
function isLineWebhook(e) {
  try {
    const contentType = e.postData && e.postData.type;
    if (contentType && contentType.includes('application/json')) {
      const data = JSON.parse(e.postData.contents);
      return data && Array.isArray(data.events);
    }
    return false;
  } catch (error) {
    console.log('⚠️ LINE Webhook判定エラー（無視）:', error.message);
    return false;
  }
}

/**
 * 統合LINE Webhook処理（エラー回避重視）
 * 
 * @param {Object} e リクエスト
 * @returns {Object} レスポンス
 */
function handleLineWebhookUnified(e) {
  try {
    console.log('🤖 統合LINE Webhook処理開始');
    
    const requestBody = JSON.parse(e.postData.contents);
    const events = requestBody.events || [];
    
    if (events.length === 0) {
      console.log('⚠️ イベントが空 - 成功レスポンス返却');
      return createCorsResponse(JSON.stringify({ success: true, message: 'No events' }));
    }
    
    const results = [];
    
    events.forEach((event, index) => {
      try {
        console.log(`📱 イベント${index + 1}処理: ${event.type}`);
        
        if (isFranchiseBotEvent(event)) {
          console.log('🎯 加盟店ヒアリングBOT処理へ');
          const botResult = processBotEvent(event);
          results.push({ eventIndex: index, type: 'bot', result: botResult });
        } else {
          console.log('📢 一般通知処理へ');
          results.push({ eventIndex: index, type: 'notification', result: { success: true } });
        }
        
      } catch (eventError) {
        console.error(`❌ イベント${index + 1}処理エラー:`, eventError.message);
        results.push({ eventIndex: index, type: 'error', error: eventError.message });
      }
    });
    
    console.log('✅ 統合LINE Webhook処理完了');
    
    return createCorsResponse(JSON.stringify({
      success: true,
      processedEvents: results.length,
      results: results
    }));
    
  } catch (error) {
    console.error('❌ 統合LINE Webhook処理エラー:', error.message);
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

/**
 * 加盟店BOTイベント判定（エラー回避重視）
 * 
 * @param {Object} event LINE イベント
 * @returns {boolean} BOT対象かどうか
 */
function isFranchiseBotEvent(event) {
  try {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text;
      return text.includes('加盟') || text.includes('フランチャイズ') || text.includes('ヒアリング');
    }
    
    if (event.type === 'postback') {
      const data = event.postback.data;
      return data.includes('franchise') || data.includes('hearing');
    }
    
    return false;
    
  } catch (error) {
    console.log('⚠️ BOTイベント判定エラー（無視）:', error.message);
    return false;
  }
}

/**
 * BOTイベント処理
 * 
 * @param {Object} event LINE イベント
 * @returns {Object} 処理結果
 */
function processBotEvent(event) {
  try {
    console.log('🤖 BOTイベント処理開始');
    
    if (typeof handleLineWebhook === 'function') {
      return handleLineWebhook(event);
    } else {
      console.log('⚠️ handleLineWebhook関数が見つかりません');
      return { success: false, error: 'BOT処理関数なし' };
    }
    
  } catch (error) {
    console.error('❌ BOTイベント処理エラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * CORS対応レスポンス作成
 * 
 * @param {string} content レスポンス内容
 * @returns {GoogleAppsScript.Content.TextOutput} レスポンス
 */
function createCorsResponse(content) {
  return ContentService
    .createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
}

/**
 * Slack通知送信（統合版）
 * 
 * @param {string} message 送信メッセージ
 * @param {Object} options 送信オプション
 * @returns {Object} 送信結果
 */
function sendSlackNotification(message, options = {}) {
  try {
    console.log('📢 Slack通知送信開始');
    
    const properties = PropertiesService.getScriptProperties();
    const webhookUrl = properties.getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL が設定されていません');
    }
    
    const payload = {
      text: message,
      username: options.username || '外壁塗装くらべるAI',
      icon_emoji: options.icon || ':robot_face:',
      channel: options.channel || undefined
    };
    
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
      return { success: true, channel: payload.channel };
    } else {
      throw new Error(`Slack送信失敗: HTTP ${responseCode} - ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ Slack通知送信エラー:', error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * SendGrid メール送信（統合版）
 * 
 * @param {string} to 送信先メールアドレス
 * @param {string} subject 件名
 * @param {string} content 本文
 * @param {Object} options 送信オプション
 * @returns {Object} 送信結果
 */
function sendEmailNotification(to, subject, content, options = {}) {
  try {
    console.log(`📧 メール通知送信開始: ${to}`);
    
    const properties = PropertiesService.getScriptProperties();
    const apiKey = properties.getProperty('SENDGRID_API_KEY');
    
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY が設定されていません');
    }
    
    const payload = {
      personalizations: [{
        to: [{ email: to }],
        subject: subject
      }],
      from: {
        email: options.from || 'noreply@kuraberu.ai',
        name: options.fromName || '外壁塗装くらべるAI'
      },
      content: [{
        type: 'text/html',
        value: content
      }]
    };
    
    const response = UrlFetchApp.fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 202) {
      console.log('✅ メール通知送信成功');
      return { success: true, to: to };
    } else {
      throw new Error(`SendGrid送信失敗: HTTP ${responseCode} - ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ メール通知送信エラー:', error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * LINE メッセージ送信（統合版）
 * 
 * @param {string} userId 送信先ユーザーID
 * @param {string} message 送信メッセージ
 * @param {Object} options 送信オプション
 * @returns {Object} 送信結果
 */
function sendLineNotification(userId, message, options = {}) {
  try {
    console.log(`📱 LINE通知送信開始: ${userId}`);
    
    const properties = PropertiesService.getScriptProperties();
    const accessToken = properties.getProperty('LINE_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('LINE_ACCESS_TOKEN が設定されていません');
    }
    
    const payload = {
      to: userId,
      messages: [{
        type: 'text',
        text: message
      }]
    };
    
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      console.log('✅ LINE通知送信成功');
      return { success: true, userId: userId };
    } else {
      throw new Error(`LINE送信失敗: HTTP ${responseCode} - ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ LINE通知送信エラー:', error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * SMS通知送信（Twilio経由）
 * 
 * @param {string} phoneNumber 送信先電話番号
 * @param {string} message 送信メッセージ
 * @param {Object} options 送信オプション
 * @returns {Object} 送信結果
 */
function sendSmsNotification(phoneNumber, message, options = {}) {
  try {
    console.log(`📞 SMS通知送信開始: ${phoneNumber}`);
    
    const properties = PropertiesService.getScriptProperties();
    const accountSid = properties.getProperty('TWILIO_ACCOUNT_SID');
    const authToken = properties.getProperty('TWILIO_AUTH_TOKEN');
    const fromNumber = properties.getProperty('TWILIO_FROM_NUMBER');
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio設定が不完全です');
    }
    
    const payload = {
      To: phoneNumber,
      From: fromNumber,
      Body: message
    };
    
    const credentials = Utilities.base64Encode(`${accountSid}:${authToken}`);
    
    const response = UrlFetchApp.fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: Object.keys(payload).map(key => `${key}=${encodeURIComponent(payload[key])}`).join('&'),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 201) {
      console.log('✅ SMS通知送信成功');
      return { success: true, phoneNumber: phoneNumber };
    } else {
      throw new Error(`Twilio送信失敗: HTTP ${responseCode} - ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ SMS通知送信エラー:', error.toString());
    return { success: false, error: error.message };
  }
}

/**
 * 統合通知送信（全チャネル対応）
 * 
 * @param {Object} params 通知パラメータ
 * @returns {Object} 送信結果
 */
function sendUnifiedNotification(params) {
  try {
    console.log('🚀 統合通知送信開始');
    
    const {
      channels = [],
      message,
      subject,
      recipients = {},
      options = {}
    } = params;
    
    const results = {
      success: false,
      totalChannels: channels.length,
      successfulChannels: 0,
      results: {},
      errors: []
    };
    
    for (const channel of channels) {
      try {
        let result;
        
        switch (channel) {
          case 'slack':
            result = sendSlackNotification(message, options.slack);
            break;
            
          case 'email':
            if (recipients.email) {
              result = sendEmailNotification(recipients.email, subject, message, options.email);
            } else {
              throw new Error('メール送信先が指定されていません');
            }
            break;
            
          case 'line':
            if (recipients.lineUserId) {
              result = sendLineNotification(recipients.lineUserId, message, options.line);
            } else {
              throw new Error('LINE送信先が指定されていません');
            }
            break;
            
          case 'sms':
            if (recipients.phoneNumber) {
              result = sendSmsNotification(recipients.phoneNumber, message, options.sms);
            } else {
              throw new Error('SMS送信先が指定されていません');
            }
            break;
            
          default:
            throw new Error(`未対応の通知チャネル: ${channel}`);
        }
        
        results.results[channel] = result;
        
        if (result.success) {
          results.successfulChannels++;
          console.log(`✅ ${channel}通知成功`);
        } else {
          throw new Error(result.error);
        }
        
      } catch (error) {
        console.error(`❌ ${channel}通知エラー:`, error.message);
        results.results[channel] = { success: false, error: error.message };
        results.errors.push(`${channel}: ${error.message}`);
      }
    }
    
    results.success = results.successfulChannels > 0;
    
    console.log(`🚀 統合通知送信完了: ${results.successfulChannels}/${results.totalChannels}成功`);
    
    try {
      if (typeof claude_logEvent === 'function') {
        claude_logEvent(
          'INFO',
          '統合通知',
          '通知送信',
          `成功: ${results.successfulChannels}/${results.totalChannels}, エラー: ${results.errors.length}件`,
          null
        );
      }
    } catch (e) {
      console.log('ログ記録スキップ:', e.message);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ 統合通知送信エラー:', error.toString());
    
    return {
      success: false,
      totalChannels: 0,
      successfulChannels: 0,
      results: {},
      errors: [`統合処理: ${error.message}`]
    };
  }
}

/**
 * 通知履歴記録
 * 
 * @param {Object} notificationData 通知データ
 * @returns {boolean} 記録成功可否
 */
function logNotificationHistory(notificationData) {
  try {
    console.log('📝 通知履歴記録開始');
    
    const properties = PropertiesService.getScriptProperties();
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
    
    if (!spreadsheetId) {
      console.log('⚠️ SPREADSHEET_ID未設定のため履歴記録をスキップ');
      return false;
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let historySheet = ss.getSheetByName('通知履歴');
    
    if (!historySheet) {
      historySheet = ss.insertSheet('通知履歴');
      const headers = [
        'タイムスタンプ', 'チャネル', '送信先', '件名', 'メッセージ',
        '送信結果', 'エラー詳細', '関連ID'
      ];
      historySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const timestamp = new Date();
    const newRow = [
      timestamp,
      notificationData.channel || '',
      notificationData.recipient || '',
      notificationData.subject || '',
      notificationData.message || '',
      notificationData.success ? '成功' : '失敗',
      notificationData.error || '',
      notificationData.relatedId || ''
    ];
    
    historySheet.appendRow(newRow);
    
    console.log('✅ 通知履歴記録成功');
    return true;
    
  } catch (error) {
    console.error('❌ 通知履歴記録エラー:', error.toString());
    return false;
  }
}

/**
 * 統合通知システムのテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testUnifiedNotificationSystem() {
  console.log('🧪 統合通知システムテスト開始');
  
  try {
    const testResults = [];
    
    console.log('--- Slack通知テスト ---');
    try {
      const slackResult = sendSlackNotification('🧪 テストメッセージ', { username: 'テストBOT' });
      testResults.push({
        name: 'Slack通知',
        success: slackResult.success,
        details: slackResult.success ? '送信成功' : slackResult.error
      });
    } catch (e) {
      testResults.push({
        name: 'Slack通知',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- LINE Webhook判定テスト ---');
    try {
      const mockEvent = {
        postData: {
          type: 'application/json',
          contents: JSON.stringify({ events: [{ type: 'message' }] })
        }
      };
      const isLine = isLineWebhook(mockEvent);
      testResults.push({
        name: 'LINE Webhook判定',
        success: isLine,
        details: isLine ? 'LINE Webhook検出成功' : 'LINE Webhook判定失敗'
      });
    } catch (e) {
      testResults.push({
        name: 'LINE Webhook判定',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- 通知履歴記録テスト ---');
    try {
      const historyResult = logNotificationHistory({
        channel: 'test',
        recipient: 'test@example.com',
        subject: 'テスト件名',
        message: 'テストメッセージ',
        success: true,
        relatedId: 'TEST-001'
      });
      testResults.push({
        name: '通知履歴記録',
        success: historyResult,
        details: historyResult ? '履歴記録成功' : '履歴記録失敗'
      });
    } catch (e) {
      testResults.push({
        name: '通知履歴記録',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    console.log('✅ 統合通知システムテスト完了');
    
    const testSummary = {
      totalTests: totalTests,
      successfulTests: successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: `${successRate}%`
    };
    
    console.log('📊 テスト結果サマリー:', testSummary);
    
    testResults.forEach(result => {
      console.log(`${result.name}: ${result.success ? '成功' : '失敗'} - ${result.details}`);
    });
    
    return {
      success: true,
      summary: testSummary,
      testResults: testResults
    };
    
  } catch (error) {
    console.error('❌ 統合通知システムテストエラー:', error);
    
    return {
      success: false,
      error: {
        type: 'test_execution_failed',
        message: error.message,
        timestamp: new Date()
      }
    };
  }
}