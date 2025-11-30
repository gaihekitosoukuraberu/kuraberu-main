/**
 * ====================================
 * V2005: 予約転送トリガーシステム
 * ====================================
 *
 * 【機能】
 * - 毎時0分に実行されるトリガー関数
 * - 「配信予定日時」が現在時刻以前の案件を検索
 * - 予約転送データJSONを読み取り、sendOrderTransferを呼び出し
 * - 完了後、配信予定日時と予約転送データをクリア
 *
 * 【トリガー設定】
 * GASエディタ → トリガー → processScheduledTransfers → 時間主導型 → 毎時
 */

/**
 * 予約転送を処理するメイン関数（トリガーから呼び出し）
 */
function processScheduledTransfers() {
  try {
    console.log('[processScheduledTransfers] V2005 開始:', new Date().toISOString());

    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      console.error('[processScheduledTransfers] SPREADSHEET_ID未設定');
      return;
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const userSheet = ss.getSheetByName('ユーザー登録');

    if (!userSheet) {
      console.error('[processScheduledTransfers] ユーザー登録シートが見つかりません');
      return;
    }

    const data = userSheet.getDataRange().getValues();
    const headers = data[0];

    const cvIdIdx = headers.indexOf('CV ID');
    const scheduledDateIdx = headers.indexOf('配信予定日時');
    const scheduledDataIdx = headers.indexOf('予約転送データJSON');
    const deliveryStatusIdx = headers.indexOf('配信ステータス');

    if (cvIdIdx === -1 || scheduledDateIdx === -1) {
      console.error('[processScheduledTransfers] 必要なカラムが見つかりません');
      return;
    }

    const now = new Date();
    let processedCount = 0;
    let errorCount = 0;

    // 配信予定日時が設定されている行を検索
    for (let i = 1; i < data.length; i++) {
      const scheduledDateStr = data[i][scheduledDateIdx];
      if (!scheduledDateStr) continue;

      // 配信予定日時をパース
      const scheduledDate = new Date(scheduledDateStr);
      if (isNaN(scheduledDate.getTime())) {
        console.warn('[processScheduledTransfers] 無効な日時:', scheduledDateStr, 'at row', i + 1);
        continue;
      }

      // 予約時刻が現在時刻以前かチェック
      if (scheduledDate > now) {
        continue; // まだ時間が来ていない
      }

      const cvId = data[i][cvIdIdx];
      console.log('[processScheduledTransfers] 処理対象:', cvId, scheduledDateStr);

      // 予約転送データJSONを読み取り
      let scheduledData = null;
      if (scheduledDataIdx !== -1 && data[i][scheduledDataIdx]) {
        try {
          scheduledData = JSON.parse(data[i][scheduledDataIdx]);
        } catch (parseError) {
          console.error('[processScheduledTransfers] JSONパースエラー:', cvId, parseError);
          errorCount++;
          continue;
        }
      }

      if (!scheduledData || !scheduledData.franchises || scheduledData.franchises.length === 0) {
        console.warn('[processScheduledTransfers] 転送データなし:', cvId);
        // データがない場合はクリアのみ
        clearScheduledTransferData(userSheet, i + 1, scheduledDateIdx, scheduledDataIdx);
        continue;
      }

      // sendOrderTransferを呼び出し
      try {
        const result = AdminSystem.sendOrderTransfer({
          cvId: cvId,
          franchises: scheduledData.franchises
        });

        if (result.success) {
          console.log('[processScheduledTransfers] 転送成功:', cvId, result.message);
          processedCount++;
        } else {
          console.error('[processScheduledTransfers] 転送失敗:', cvId, result.error);
          errorCount++;
        }
      } catch (transferError) {
        console.error('[processScheduledTransfers] 転送エラー:', cvId, transferError);
        errorCount++;
      }

      // 配信予定日時と予約転送データをクリア（成功・失敗に関わらず）
      clearScheduledTransferData(userSheet, i + 1, scheduledDateIdx, scheduledDataIdx);
    }

    console.log('[processScheduledTransfers] 完了: 処理', processedCount, '件, エラー', errorCount, '件');

  } catch (error) {
    console.error('[processScheduledTransfers] 致命的エラー:', error);
  }
}

/**
 * 予約転送データをクリア
 */
function clearScheduledTransferData(sheet, row, scheduledDateIdx, scheduledDataIdx) {
  try {
    // 配信予定日時をクリア
    if (scheduledDateIdx !== -1) {
      sheet.getRange(row, scheduledDateIdx + 1).setValue('');
    }
    // 予約転送データJSONをクリア
    if (scheduledDataIdx !== -1) {
      sheet.getRange(row, scheduledDataIdx + 1).setValue('');
    }
    console.log('[clearScheduledTransferData] クリア完了: row', row);
  } catch (error) {
    console.error('[clearScheduledTransferData] クリアエラー: row', row, error);
  }
}

/**
 * トリガーを設定するユーティリティ関数
 * GASエディタから手動で1回実行してトリガーを設定
 */
function setupScheduledTransferTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processScheduledTransfers') {
      ScriptApp.deleteTrigger(trigger);
      console.log('[setupScheduledTransferTrigger] 既存トリガー削除');
    }
  });

  // 新しいトリガーを設定（毎時0分）
  ScriptApp.newTrigger('processScheduledTransfers')
    .timeBased()
    .everyHours(1)
    .create();

  console.log('[setupScheduledTransferTrigger] トリガー設定完了: 毎時実行');
}

/**
 * トリガーを削除するユーティリティ関数
 */
function removeScheduledTransferTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processScheduledTransfers') {
      ScriptApp.deleteTrigger(trigger);
      console.log('[removeScheduledTransferTrigger] トリガー削除完了');
    }
  });
}
