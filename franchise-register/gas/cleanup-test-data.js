/**
 * FR251112004600（大野建装）のテストデータをクリーンアップ
 */
function cleanupTestData() {
  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  console.log('=== テストデータクリーンアップ開始 ===');
  console.log('対象加盟店ID:', merchantId);
  console.log('');

  // 1. 配信管理シートのクリーンアップ
  console.log('【1. 配信管理シート】');
  const deliverySheet = ss.getSheetByName('配信管理');
  if (deliverySheet) {
    const deliveryData = deliverySheet.getDataRange().getValues();
    const deliveryHeaders = deliveryData[0];
    const deliveryRows = deliveryData.slice(1);

    const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
    const delCvIdIdx = deliveryHeaders.indexOf('CV ID');

    let deletedCount = 0;
    // 後ろから削除（行番号がずれないように）
    for (let i = deliveryRows.length - 1; i >= 0; i--) {
      const rowMerchantId = deliveryRows[i][delMerchantIdIdx];
      if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
        console.log('  削除: 行' + (i + 2) + ' - CV ID:', deliveryRows[i][delCvIdIdx]);
        deliverySheet.deleteRow(i + 2);
        deletedCount++;
      }
    }
    console.log('  ✅ 削除件数:', deletedCount, '件');
  } else {
    console.log('  ⚠️ 配信管理シートが見つかりません');
  }
  console.log('');

  // 2. キャンセル申請シートのクリーンアップ
  console.log('【2. キャンセル申請シート】');
  const cancelSheet = ss.getSheetByName('キャンセル申請');
  if (cancelSheet) {
    const cancelData = cancelSheet.getDataRange().getValues();
    const cancelHeaders = cancelData[0];
    const cancelRows = cancelData.slice(1);

    const cancelMerchantIdIdx = cancelHeaders.indexOf('加盟店ID');
    const cancelAppIdIdx = cancelHeaders.indexOf('申請ID');

    let deletedCount = 0;
    // 後ろから削除
    for (let i = cancelRows.length - 1; i >= 0; i--) {
      const rowMerchantId = cancelRows[i][cancelMerchantIdIdx];
      if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
        console.log('  削除: 行' + (i + 2) + ' - 申請ID:', cancelRows[i][cancelAppIdIdx]);
        cancelSheet.deleteRow(i + 2);
        deletedCount++;
      }
    }
    console.log('  ✅ 削除件数:', deletedCount, '件');
  } else {
    console.log('  ⚠️ キャンセル申請シートが見つかりません');
  }
  console.log('');

  // 3. キャンセル期限延長申請シートのクリーンアップ
  console.log('【3. キャンセル期限延長申請シート】');
  const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
  if (extensionSheet) {
    const extensionData = extensionSheet.getDataRange().getValues();
    const extensionHeaders = extensionData[0];
    const extensionRows = extensionData.slice(1);

    const extMerchantIdIdx = extensionHeaders.indexOf('加盟店ID');
    const extAppIdIdx = extensionHeaders.indexOf('申請ID');

    let deletedCount = 0;
    // 後ろから削除
    for (let i = extensionRows.length - 1; i >= 0; i--) {
      const rowMerchantId = extensionRows[i][extMerchantIdIdx];
      if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
        console.log('  削除: 行' + (i + 2) + ' - 申請ID:', extensionRows[i][extAppIdIdx]);
        extensionSheet.deleteRow(i + 2);
        deletedCount++;
      }
    }
    console.log('  ✅ 削除件数:', deletedCount, '件');
  } else {
    console.log('  ⚠️ キャンセル期限延長申請シートが見つかりません');
  }
  console.log('');

  console.log('=== クリーンアップ完了 ===');
}
