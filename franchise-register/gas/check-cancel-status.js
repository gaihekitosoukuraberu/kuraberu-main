/**
 * キャンセル申請シートのステータス確認
 */
function checkCancelStatus() {
  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cancelSheet = ss.getSheetByName('キャンセル申請');

  if (!cancelSheet) {
    console.log('キャンセル申請シートが見つかりません');
    return;
  }

  const cancelData = cancelSheet.getDataRange().getValues();
  const cancelHeaders = cancelData[0];
  const cancelRows = cancelData.slice(1);

  console.log('=== キャンセル申請シートのヘッダー ===');
  console.log(cancelHeaders.join(', '));
  console.log('');

  const cvIdIdx = cancelHeaders.indexOf('CV ID');
  const merchantIdIdx = cancelHeaders.indexOf('加盟店ID');
  const statusIdx = cancelHeaders.indexOf('承認ステータス');
  const customerNameIdx = cancelHeaders.indexOf('顧客名');
  const applicationIdIdx = cancelHeaders.indexOf('申請ID');
  const approverIdx = cancelHeaders.indexOf('承認者');
  const approvedAtIdx = cancelHeaders.indexOf('承認日時');
  const rejectionReasonIdx = cancelHeaders.indexOf('却下理由');

  console.log('列インデックス:');
  console.log('  CV ID:', cvIdIdx);
  console.log('  加盟店ID:', merchantIdIdx);
  console.log('  承認ステータス:', statusIdx);
  console.log('  承認者:', approverIdx);
  console.log('  承認日時:', approvedAtIdx);
  console.log('  却下理由:', rejectionReasonIdx);
  console.log('');

  console.log('=== FR251112004600 の申請データ ===');

  let count = 0;
  cancelRows.forEach((row, idx) => {
    const rowMerchantId = row[merchantIdIdx];
    if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
      count++;
      console.log('【申請' + count + '件目】行' + (idx + 2));
      console.log('  申請ID:', row[applicationIdIdx]);
      console.log('  CV ID:', row[cvIdIdx]);
      console.log('  顧客名:', row[customerNameIdx]);
      console.log('  承認ステータス:', '"' + row[statusIdx] + '"');
      console.log('  承認者:', row[approverIdx] || '(なし)');
      console.log('  承認日時:', row[approvedAtIdx] || '(なし)');
      console.log('  却下理由:', row[rejectionReasonIdx] || '(なし)');
      console.log('');
    }
  });

  console.log('合計:', count, '件');
  console.log('');

  // ステータス別集計
  console.log('=== ステータス別集計（全体） ===');
  const statusCount = {};
  cancelRows.forEach(row => {
    const status = row[statusIdx] || '(空)';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  Object.keys(statusCount).forEach(status => {
    console.log('  "' + status + '": ' + statusCount[status] + '件');
  });
}
