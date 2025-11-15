/**
 * 配信管理シートのデバッグ - FR251112004600のデータ確認
 */
function debugDeliverySheet() {
  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const deliverySheet = ss.getSheetByName('配信管理');

  if (!deliverySheet) {
    console.log('❌ 配信管理シートが見つかりません');
    return;
  }

  console.log('=== 配信管理シート デバッグ ===');
  console.log('');

  // ヘッダー行を取得
  const headers = deliverySheet.getRange(1, 1, 1, deliverySheet.getLastColumn()).getValues()[0];
  console.log('【列名一覧】(' + headers.length + '列)');
  headers.forEach((header, idx) => {
    console.log((idx + 1) + ': ' + header);
  });

  console.log('');
  console.log('【FR251112004600のデータ】');

  // データ取得
  const data = deliverySheet.getDataRange().getValues();
  const merchantIdIdx = headers.indexOf('加盟店ID');
  const cvIdIdx = headers.indexOf('CV ID');
  const deliveredAtIdx = headers.indexOf('配信日時');
  const statusIdx = headers.indexOf('配信ステータス');
  const detailStatusIdx = headers.indexOf('詳細ステータス');

  if (merchantIdIdx === -1) {
    console.log('❌ 「加盟店ID」列が見つかりません');
    return;
  }

  let count = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[merchantIdIdx] === merchantId) {
      count++;
      console.log('');
      console.log('--- ' + count + '件目 ---');
      console.log('CV ID: ' + row[cvIdIdx]);
      console.log('配信日時: ' + row[deliveredAtIdx]);
      console.log('配信ステータス: ' + row[statusIdx]);
      console.log('詳細ステータス: ' + row[detailStatusIdx]);
      console.log('行番号: ' + (i + 1));
    }
  }

  console.log('');
  console.log('合計: ' + count + '件');
  console.log('');

  // 重要な列のインデックス確認
  console.log('【重要な列のインデックス確認】');
  console.log('レコードID: ' + headers.indexOf('レコードID'));
  console.log('CV ID: ' + cvIdIdx);
  console.log('加盟店ID: ' + merchantIdIdx);
  console.log('配信日時: ' + deliveredAtIdx);
  console.log('配信順位: ' + headers.indexOf('配信順位'));
  console.log('配信ステータス: ' + statusIdx);
  console.log('詳細ステータス: ' + detailStatusIdx);
  console.log('ステータス更新日時: ' + headers.indexOf('ステータス更新日時'));
  console.log('最終更新日時: ' + headers.indexOf('最終更新日時'));
}
