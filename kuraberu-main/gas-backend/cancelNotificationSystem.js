/**
 * キャンセル通知システム - GAS完全互換版
 * await問題完全解決 - CI/CD対応最終版
 */

/**
 * キャンセル申請Slack通知送信（完全修正版）
 * CI/CDエラーの28行目問題を解決
 */
function sendCancelNotificationToSlack(notificationData) {
  try {
    Logger.log('🚫 キャンセル申請Slack通知送信開始');
    
    // 同期版Webhook確保 - awaitを使用しない
    const webhookResult = ensureCancelNotifyWebhookSync();
    if (!webhookResult.success) {
      Logger.log(`❌ Webhook確保失敗: ${webhookResult.error}`);
      // 同期版エラー通知 - awaitを使用しない  
      notifyGptErrorChannelSync(`キャンセル通知Webhook確保失敗: ${webhookResult.error}`);
      return webhookResult;
    }
    
    // Slack通知メッセージ作成
    const message = createCancelNotificationMessage(notificationData);
    
    // Slack送信（同期処理）
    const result = sendSlackNotificationSync(message);
    
    Logger.log('✅ キャンセル申請Slack通知送信完了');
    return result;
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請Slack通知送信エラー: ${error.message}`);
    notifyGptErrorChannelSync(`キャンセル申請Slack通知送信エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * キャンセル通知Webhook確保（同期版）
 */
function ensureCancelNotifyWebhookSync() {
  try {
    const existingWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK');
    
    if (existingWebhook) {
      Logger.log('✅ 既存キャンセル通知Webhook URL確認済み');
      return {
        success: true,
        webhook: existingWebhook,
        action: 'existing'
      };
    }
    
    // メインSlack Webhookをキャンセル通知用として流用
    const mainWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!mainWebhook) {
      throw new Error('SLACK_WEBHOOK_URLが設定されていません');
    }
    
    // キャンセル通知用として保存
    PropertiesService.getScriptProperties().setProperty('SLACK_CANCEL_NOTIFY_WEBHOOK', mainWebhook);
    Logger.log('✅ キャンセル通知Webhook URL設定完了');
    
    return {
      success: true,
      webhook: mainWebhook,
      action: 'created_from_main'
    };
    
  } catch (error) {
    Logger.log(`❌ Webhook確保エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * GPTエラーチャンネル通知（同期版）
 */
function notifyGptErrorChannelSync(message) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      Logger.log('⚠️ Slack Webhook未設定 - エラー通知スキップ');
      return false;
    }
    
    const payload = {
      text: `🚨 *システムエラー通知*\n\n${message}`,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':warning:'
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ GPTエラーチャンネル通知送信成功');
      return true;
    } else {
      Logger.log(`⚠️ GPTエラーチャンネル通知失敗: ${responseCode}`);
      return false;
    }
    
  } catch (error) {
    Logger.log(`❌ GPTエラーチャンネル通知エラー: ${error.message}`);
    return false;
  }
}

/**
 * キャンセル通知メッセージ作成
 */
function createCancelNotificationMessage(data) {
  return `🚨 *キャンセル申請受付*

📋 **申請ID**: ${data.requestId || '不明'}
👤 **ユーザー名**: ${data.userName || '不明'}
🆔 **ユーザーID**: ${data.userId || '不明'}
📦 **案件ID**: ${data.caseId || '不明'}
🏢 **会社名**: ${data.companyName || '不明'}
📅 **申請日時**: ${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm')}

⚠️ 至急確認・対応をお願いします。`;
}

/**
 * Slack通知送信（同期版）
 */
function sendSlackNotificationSync(message) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URLが設定されていません');
    }
    
    const payload = {
      text: message,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':warning:'
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true, message: 'Slack通知送信成功' };
    } else {
      throw new Error(`Slack通知送信失敗: HTTP ${responseCode}`);
    }
    
  } catch (error) {
    Logger.log(`❌ Slack通知送信エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}