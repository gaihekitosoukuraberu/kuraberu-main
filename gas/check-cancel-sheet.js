/**
 * キャンセル申請シートの実データ確認
 */
function checkCancelSheet() {
  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cancelSheet = ss.getSheetByName('キャンセル申請');

  if (!cancelSheet) {
    console.log('❌ キャンセル申請シートが見つかりません');
    return;
  }

  console.log('=== キャンセル申請シート 実データ確認 ===');
  console.log('対象加盟店: ' + merchantId);
  console.log('');

  // データ取得
  const data = cancelSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  console.log('【列名】');
  headers.forEach((header, idx) => {
    console.log((idx + 1) + ': ' + header);
  });
  console.log('');

  const cvIdIdx = headers.indexOf('CV ID');
  const customerNameIdx = headers.indexOf('顧客名');
  const merchantIdIdx = headers.indexOf('加盟店ID');
  const applicationIdIdx = headers.indexOf('申請ID');
  const statusIdx = headers.indexOf('承認ステータス');
  const timestampIdx = headers.indexOf('タイムスタンプ');

  console.log('【FR251112004600のキャンセル申請データ】');

  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowMerchantId = row[merchantIdIdx];

    if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
      count++;
      console.log('');
      console.log('━━━ ' + count + '件目 ━━━');
      console.log('申請ID: ' + row[applicationIdIdx]);
      console.log('CV ID: ' + row[cvIdIdx]);
      console.log('顧客名: ' + row[customerNameIdx]);
      console.log('承認ステータス: ' + row[statusIdx]);
      console.log('申請日時: ' + row[timestampIdx]);
      console.log('行番号: ' + (i + 2));
    }
  }

  console.log('');
  console.log('合計: ' + count + '件');
  console.log('');

  // ステータス別集計
  const statusCount = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowMerchantId = row[merchantIdIdx];
    if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
      const status = row[statusIdx] || '(未設定)';
      statusCount[status] = (statusCount[status] || 0) + 1;
    }
  }

  console.log('【ステータス別集計】');
  Object.keys(statusCount).forEach(status => {
    console.log(status + ': ' + statusCount[status] + '件');
  });
}
