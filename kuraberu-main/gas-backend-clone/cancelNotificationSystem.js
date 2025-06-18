/**
 * キャンセル通知システム - GAS完全互換版
 * async/await問題修正済み
 */

/**
 * キャンセル通知Webhook確保・初期化（GAS対応版）
 * CI/CDのトップレベルawaitエラー修正
 */
function initializeCancelNotificationSystem() {
  try {
    Logger.log('🔧 キャンセル通知システム初期化開始（GAS対応）');
    
    // 同期的な初期化処理
    const webhookResult = ensureCancelNotifyWebhookSync();
    
    if (!webhookResult.success) {
      Logger.log(`❌ Webhook保存失敗: ${webhookResult.error}`);
      // エラー通知（同期版）
      notifyGptErrorChannelSync(`キャンセル通知Webhook保存失敗: ${webhookResult.error}`);
    } else {
      Logger.log('✅ キャンセル通知システム初期化成功');
    }
    
    return webhookResult;
    
  } catch (error) {
    Logger.log(`❌ キャンセル通知システム初期化エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * キャンセル通知処理（同期版）
 */
function processCancelNotification(requestData) {
  try {
    Logger.log('📨 キャンセル通知処理開始');
    
    // Webhook確保（同期版）
    const webhookResult = ensureCancelNotifyWebhookSync();
    
    if (!webhookResult.success) {
      Logger.log(`❌ Webhook確保失敗: ${webhookResult.error}`);
      notifyGptErrorChannelSync(`キャンセル通知Webhook確保失敗: ${webhookResult.error}`);
      return { success: false, error: 'Webhook確保失敗' };
    }
    
    // 通知送信処理
    Logger.log('✅ キャンセル通知処理完了');
    return { success: true };
    
  } catch (error) {
    Logger.log(`❌ キャンセル通知処理エラー: ${error.message}`);
    notifyGptErrorChannelSync(`キャンセル通知処理エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}