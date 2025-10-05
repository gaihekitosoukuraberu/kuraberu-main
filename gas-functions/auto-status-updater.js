/**
 * 一時停止ステータス自動更新
 * 毎日実行されるトリガー関数
 */

/**
 * 毎日実行: 一時停止開始日・再開日をチェックしてステータスを自動更新
 */
function checkAndUpdatePauseStatus() {
  try {
    console.log('[AutoStatusUpdater] 一時停止ステータス自動更新開始');

    const sheet = DataAccessLayer.getRegistrationSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      console.log('[AutoStatusUpdater] データなし');
      return;
    }

    const headers = data[0];
    const rows = data.slice(1);

    // 列インデックス取得
    const statusCol = headers.indexOf('ステータス') + 1;
    const pauseFlagCol = headers.indexOf('一時停止フラグ') + 1;
    const pauseStartCol = headers.indexOf('一時停止開始日') + 1;
    const pauseEndCol = headers.indexOf('一時停止再開予定日') + 1;

    if (!statusCol || !pauseFlagCol || !pauseStartCol || !pauseEndCol) {
      console.error('[AutoStatusUpdater] 必要な列が見つかりません');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updateCount = 0;

    rows.forEach((row, index) => {
      const rowIndex = index + 2; // シート行番号（1ベース + ヘッダー）

      const pauseFlag = row[pauseFlagCol - 1];
      const pauseStartDate = row[pauseStartCol - 1];
      const pauseEndDate = row[pauseEndCol - 1];
      const currentStatus = row[statusCol - 1];

      // 一時停止フラグがOFFの場合はスキップ
      if (!pauseFlag) {
        return;
      }

      let newStatus = null;

      // 開始日チェック
      if (pauseStartDate) {
        const startDate = new Date(pauseStartDate);
        startDate.setHours(0, 0, 0, 0);

        // 開始日が今日以前の場合、正しいステータスを計算
        if (startDate <= today) {
          // 再開予定日で判定
          const expectedStatus = (pauseEndDate === '未定' || !pauseEndDate) ? '休止' : '一時停止';

          // 現在のステータスが期待値と異なる場合のみ更新
          if (currentStatus !== expectedStatus) {
            newStatus = expectedStatus;
          }
        }
      }

      // 再開日チェック
      if (pauseEndDate && pauseEndDate !== '未定') {
        const endDate = new Date(pauseEndDate);
        endDate.setHours(0, 0, 0, 0);

        // 再開日が今日以前で、まだ一時停止または休止の場合
        if (endDate <= today && (currentStatus === '一時停止' || currentStatus === '休止')) {
          newStatus = 'アクティブ';
          // 一時停止フラグもOFFに
          sheet.getRange(rowIndex, pauseFlagCol).setValue(false);
          sheet.getRange(rowIndex, pauseStartCol).setValue('');
          sheet.getRange(rowIndex, pauseEndCol).setValue('');
        }
      }

      // ステータス更新
      if (newStatus && newStatus !== currentStatus) {
        sheet.getRange(rowIndex, statusCol).setValue(newStatus);
        updateCount++;
        console.log(`[AutoStatusUpdater] 行${rowIndex}: ${currentStatus} → ${newStatus}`);
      }
    });

    console.log(`[AutoStatusUpdater] 完了: ${updateCount}件更新`);

  } catch (error) {
    console.error('[AutoStatusUpdater] エラー:', error);
  }
}

/**
 * トリガー設定関数（初回のみ手動実行）
 */
function setupDailyTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkAndUpdatePauseStatus') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 毎日午前2時に実行
  ScriptApp.newTrigger('checkAndUpdatePauseStatus')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();

  console.log('[AutoStatusUpdater] トリガー設定完了: 毎日午前2時実行');
}
