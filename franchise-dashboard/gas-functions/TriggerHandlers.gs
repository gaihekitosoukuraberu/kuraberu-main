/**
 * ============================================
 * トリガーハンドラー（onEdit等）
 * ============================================
 *
 * スプレッドシート編集時の自動処理
 * V1833: ステータス↔配信ステータス連動
 */

/**
 * onEditトリガー
 * スプレッドシートのセルが編集されたときに自動実行
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    console.log('[onEdit] シート:', sheetName, '行:', row, '列:', col);

    // 加盟店マスタでの編集のみ処理
    if (sheetName !== '加盟店マスタ') {
      return;
    }

    // ヘッダー行（1行目）は除外
    if (row === 1) {
      return;
    }

    // ヘッダー取得
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const editedColumn = headers[col - 1];

    console.log('[onEdit] 編集列:', editedColumn);

    // 「ステータス」列が編集された場合、配信ステータスを連動
    if (editedColumn === 'ステータス') {
      syncDeliveryStatus(sheet, row, headers);
    }

  } catch (error) {
    console.error('[onEdit] エラー:', error.toString());
  }
}

/**
 * ステータス↔配信ステータス連動
 * @param {Sheet} sheet - シートオブジェクト
 * @param {number} row - 編集された行番号
 * @param {Array} headers - ヘッダー配列
 */
function syncDeliveryStatus(sheet, row, headers) {
  try {
    const statusIndex = headers.indexOf('ステータス');
    const deliveryStatusIndex = headers.indexOf('配信ステータス');

    if (statusIndex === -1 || deliveryStatusIndex === -1) {
      console.warn('[syncDeliveryStatus] 必要な列が見つかりません');
      return;
    }

    // 現在のステータス値を取得
    const currentStatus = sheet.getRange(row, statusIndex + 1).getValue();

    console.log('[syncDeliveryStatus] 行:', row, 'ステータス:', currentStatus);

    // ステータスに応じて配信ステータスを設定
    let newDeliveryStatus = '';

    if (currentStatus === 'アクティブ') {
      newDeliveryStatus = 'アクティブ';
    } else if (currentStatus === '休止') {
      newDeliveryStatus = 'ストップ';
    } else {
      // その他のステータス（配信停止、強制停止等）
      newDeliveryStatus = 'ストップ';
    }

    // 配信ステータスを更新
    sheet.getRange(row, deliveryStatusIndex + 1).setValue(newDeliveryStatus);

    console.log('[syncDeliveryStatus] 配信ステータス更新:', newDeliveryStatus);

  } catch (error) {
    console.error('[syncDeliveryStatus] エラー:', error.toString());
  }
}
