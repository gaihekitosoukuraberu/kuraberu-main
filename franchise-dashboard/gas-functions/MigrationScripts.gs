/**
 * ============================================
 * マイグレーションスクリプト
 * ============================================
 *
 * データ移行・一括更新用のスクリプト
 * V1833: 既存業者の配信ステータス一括更新
 */

/**
 * V1833: 承認済み業者の配信ステータス一括更新
 *
 * 実行方法：
 * 1. GASエディタでこの関数を選択
 * 2. 実行ボタンをクリック
 * 3. 初回は権限承認が必要
 */
function migratev1833_updateDeliveryStatus() {
  try {
    console.log('[Migration] V1833: 配信ステータス一括更新開始');

    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('加盟店マスタ');

    if (!sheet) {
      console.error('[Migration] 加盟店マスタシートが見つかりません');
      return;
    }

    // ヘッダー取得
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIndex = headers.indexOf('ステータス');
    const deliveryStatusIndex = headers.indexOf('配信ステータス');
    const approvalStatusIndex = headers.indexOf('承認ステータス');

    if (statusIndex === -1 || deliveryStatusIndex === -1 || approvalStatusIndex === -1) {
      console.error('[Migration] 必要な列が見つかりません');
      console.error('  ステータス:', statusIndex);
      console.error('  配信ステータス:', deliveryStatusIndex);
      console.error('  承認ステータス:', approvalStatusIndex);
      return;
    }

    // 全データ取得（ヘッダー除く）
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.log('[Migration] データがありません');
      return;
    }

    const allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    let updateCount = 0;
    let skipCount = 0;

    console.log('[Migration] 総行数:', allData.length);

    // 全業者をループ
    for (let i = 0; i < allData.length; i++) {
      const row = allData[i];
      const rowNumber = i + 2; // ヘッダー分+1、配列インデックス分+1
      const approvalStatus = row[approvalStatusIndex];
      const currentStatus = row[statusIndex];
      const currentDeliveryStatus = row[deliveryStatusIndex];

      // 承認済みの業者のみ処理
      if (approvalStatus !== '承認済み') {
        skipCount++;
        continue;
      }

      // ステータスに応じて配信ステータスを決定
      let newDeliveryStatus = '';

      if (currentStatus === 'アクティブ') {
        newDeliveryStatus = 'アクティブ';
      } else if (currentStatus === '休止') {
        newDeliveryStatus = 'ストップ';
      } else {
        newDeliveryStatus = 'ストップ';
      }

      // 既に正しい値なら更新しない
      if (currentDeliveryStatus === newDeliveryStatus) {
        console.log('[Migration] 行' + rowNumber + ': スキップ（既に正しい値）');
        skipCount++;
        continue;
      }

      // 配信ステータスを更新
      sheet.getRange(rowNumber, deliveryStatusIndex + 1).setValue(newDeliveryStatus);

      console.log('[Migration] 行' + rowNumber + ': 更新 ' + currentDeliveryStatus + ' → ' + newDeliveryStatus);
      updateCount++;
    }

    console.log('[Migration] 完了:');
    console.log('  更新:', updateCount + '件');
    console.log('  スキップ:', skipCount + '件');
    console.log('  合計:', allData.length + '件');

    // GUIで結果を表示
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'V1833 マイグレーション完了',
      '配信ステータス更新:\n' +
      '  更新: ' + updateCount + '件\n' +
      '  スキップ: ' + skipCount + '件\n' +
      '  合計: ' + allData.length + '件',
      ui.ButtonSet.OK
    );

  } catch (error) {
    console.error('[Migration] エラー:', error.toString());
    const ui = SpreadsheetApp.getUi();
    ui.alert('エラー', error.toString(), ui.ButtonSet.OK);
  }
}
