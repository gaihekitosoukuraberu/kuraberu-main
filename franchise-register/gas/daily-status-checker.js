/**
 * 毎日実行: 一時停止ステータスの自動更新
 * トリガー設定: 毎日深夜0時に実行
 */

/**
 * 全加盟店の一時停止ステータスをチェックして自動更新
 */
function checkAndUpdatePauseStatus() {
  try {
    console.log('[DailyStatusChecker] Starting daily pause status check...');
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 必要な列のインデックス
    const statusIndex = headers.indexOf('ステータス');
    const pauseFlagIndex = headers.indexOf('一時停止フラグ');
    const pauseStartDateIndex = headers.indexOf('一時停止開始日');
    const pauseEndDateIndex = headers.indexOf('一時停止再開予定日');
    const idIndex = headers.indexOf('登録ID');
    
    if (statusIndex === -1 || pauseFlagIndex === -1 || pauseStartDateIndex === -1 || pauseEndDateIndex === -1) {
      console.error('[DailyStatusChecker] Required columns not found');
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻をリセット
    
    let updatedCount = 0;
    
    // 各行をチェック（ヘッダー行をスキップ）
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const merchantId = row[idIndex];
      
      if (!merchantId) continue; // 空行スキップ
      
      const pauseFlag = row[pauseFlagIndex] === 'TRUE' || row[pauseFlagIndex] === true;
      const pauseStartDate = row[pauseStartDateIndex];
      const pauseEndDate = row[pauseEndDateIndex];
      const currentStatus = row[statusIndex];
      
      let newStatus = null;
      
      // 一時停止フラグがONの場合
      if (pauseFlag && pauseStartDate) {
        const startDate = new Date(pauseStartDate);
        startDate.setHours(0, 0, 0, 0);
        
        // 開始日が今日または過去の場合
        if (startDate <= today) {
          // 再開日をチェック
          if (pauseEndDate === '未定') {
            newStatus = '休止';
          } else if (pauseEndDate) {
            const endDate = new Date(pauseEndDate);
            endDate.setHours(0, 0, 0, 0);
            
            // 再開日が今日または過去の場合 → アクティブに戻す
            if (endDate <= today) {
              newStatus = 'アクティブ';
              // 一時停止フラグもOFFにする
              sheet.getRange(i + 1, pauseFlagIndex + 1).setValue('FALSE');
              console.log(`[DailyStatusChecker] ${merchantId}: 再開日到達 → アクティブに復帰`);
            } else {
              // 再開日が未来 → 一時停止
              newStatus = '一時停止';
            }
          } else {
            // 再開日が設定されていない → 一時停止
            newStatus = '一時停止';
          }
        } else {
          // 開始日が未来の場合 → アクティブのまま
          newStatus = 'アクティブ';
        }
      } else {
        // 一時停止フラグがOFFの場合 → アクティブ
        newStatus = 'アクティブ';
      }
      
      // ステータスが変更された場合のみ更新
      if (newStatus && newStatus !== currentStatus) {
        sheet.getRange(i + 1, statusIndex + 1).setValue(newStatus);
        updatedCount++;
        console.log(`[DailyStatusChecker] ${merchantId}: ${currentStatus} → ${newStatus}`);
      }
    }
    
    console.log(`[DailyStatusChecker] Completed. ${updatedCount} merchants updated.`);
    return {
      success: true,
      updatedCount: updatedCount,
      message: `${updatedCount}件の加盟店ステータスを更新しました`
    };
    
  } catch (error) {
    console.error('[DailyStatusChecker] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * トリガー設定用のヘルパー関数
 * 手動実行してトリガーを設定
 */
function setupDailyTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkAndUpdatePauseStatus') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 新しいトリガーを設定（毎日深夜0時〜1時の間に実行）
  ScriptApp.newTrigger('checkAndUpdatePauseStatus')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
  
  console.log('[DailyStatusChecker] Trigger setup completed: Daily at 00:00');
  return 'トリガー設定完了: 毎日深夜0時に実行';
}
