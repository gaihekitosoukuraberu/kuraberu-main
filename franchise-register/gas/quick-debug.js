function quickDebug() {
  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const deliverySheet = ss.getSheetByName('配信管理');
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!deliverySheet || !userSheet) {
    console.log('シートが見つかりません');
    return;
  }

  // 配信管理シートのデータ
  const deliveryData = deliverySheet.getDataRange().getValues();
  const deliveryHeaders = deliveryData[0];
  const deliveryRows = deliveryData.slice(1);

  const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
  const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
  const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');

  console.log('=== 配信管理シート ===');
  console.log('ヘッダー:', deliveryHeaders.join(', '));
  console.log('');

  let count = 0;
  deliveryRows.forEach((row, idx) => {
    const rowMerchantId = row[delMerchantIdIdx];
    if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
      count++;
      console.log('【配信' + count + '件目】行' + (idx + 2));
      console.log('  CV ID:', row[delCvIdIdx]);
      console.log('  加盟店ID:', rowMerchantId, '(type:', typeof rowMerchantId, ')');
      console.log('  配信ステータス:', '"' + row[delStatusIdx] + '"', '(length:', (row[delStatusIdx] || '').length, ')');
      console.log('');
    }
  });

  console.log('合計:', count, '件');
  console.log('');

  // ユーザー登録シートで成約状況確認
  const userData = userSheet.getDataRange().getValues();
  const userHeaders = userData[0];
  const userRows = userData.slice(1);

  const userCvIdIdx = userHeaders.indexOf('CV ID');
  const userNameIdx = userHeaders.indexOf('氏名');
  const contractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');

  console.log('=== ユーザー登録シート（この加盟店の配信案件のみ） ===');

  deliveryRows.forEach((row) => {
    const rowMerchantId = row[delMerchantIdIdx];
    if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
      const cvId = row[delCvIdIdx];
      const userRow = userRows.find(r => r[userCvIdIdx] === cvId);
      if (userRow) {
        console.log('CV ID:', cvId);
        console.log('  氏名:', userRow[userNameIdx]);
        console.log('  成約加盟店ID:', '"' + (userRow[contractMerchantIdIdx] || '') + '"');
        console.log('');
      }
    }
  });
}
