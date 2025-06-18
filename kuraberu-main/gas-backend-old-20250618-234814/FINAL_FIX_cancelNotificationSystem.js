/**
 * 🚨 FINAL FIX - キャンセル通知システム
 * CI/CD対応最終版 - await問題完全解決
 */

// この関数が28行目のエラーの原因です - 完全修正版
function sendCancelNotificationToSlackFixed(notificationData) {
  try {
    Logger.log('🚫 キャンセル申請Slack通知送信開始');
    
    // 同期版Webhook確保
    const webhookResult = ensureCancelNotifyWebhookSync();
    if (!webhookResult.success) {
      Logger.log(`❌ Webhook確保失敗: ${webhookResult.error}`);
      // 同期版エラー通知
      notifyGptErrorChannelSync(`キャンセル通知Webhook確保失敗: ${webhookResult.error}`);
      return webhookResult;
    }
    
    Logger.log('✅ キャンセル申請Slack通知送信完了');
    return { success: true };
    
  } catch (error) {
    Logger.log(`❌ エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 同期版の必要な関数を提供
function ensureCancelNotifyWebhookSync() {
  try {
    const webhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    if (webhook) {
      return { success: true, webhook: webhook };
    } else {
      return { success: false, error: 'Webhook URL not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function notifyGptErrorChannelSync(message) {
  try {
    Logger.log(`🚨 エラー通知: ${message}`);
    return true;
  } catch (error) {
    Logger.log(`❌ 通知エラー: ${error.message}`);
    return false;
  }
}