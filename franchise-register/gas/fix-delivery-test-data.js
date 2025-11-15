/**
 * 配信管理シートのテストデータを修正
 * ユーザー登録シートにある既存のCV IDを使用
 */
function fixDeliveryTestData() {
  const merchantId = 'FR251112004600';
  const merchantName = '大野建装';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');
  const deliverySheet = ss.getSheetByName('配信管理');

  if (!userSheet || !deliverySheet) {
    console.log('シートが見つかりません');
    return;
  }

  // ユーザー登録シートから最初の5件のCV IDを取得
  const userData = userSheet.getDataRange().getValues();
  const userHeaders = userData[0];
  const userRows = userData.slice(1);

  const cvIdIdx = userHeaders.indexOf('CV ID');
  const nameIdx = userHeaders.indexOf('氏名');
  const contractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');

  console.log('【ユーザー登録シートから未成約のCV IDを取得】');

  // 未成約で、アーカイブされていない案件を5件取得
  const availableCvIds = [];
  for (let i = 0; i < userRows.length && availableCvIds.length < 5; i++) {
    const row = userRows[i];
    const cvId = row[cvIdIdx];
    const name = row[nameIdx];
    const contractMerchantId = row[contractMerchantIdIdx] || '';

    if (cvId && !contractMerchantId) {
      availableCvIds.push({
        cvId: cvId,
        name: name
      });
      console.log(availableCvIds.length + ':', cvId, '-', name);
    }
  }

  if (availableCvIds.length === 0) {
    console.log('❌ 利用可能なCV IDが見つかりませんでした');
    return;
  }

  console.log('');
  console.log('【配信管理シートの既存データを削除】');

  // 配信管理シートから FR251112004600 のデータを削除
  const deliveryData = deliverySheet.getDataRange().getValues();
  const deliveryHeaders = deliveryData[0];
  const deliveryRows = deliveryData.slice(1);

  const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');

  let deletedCount = 0;
  // 後ろから削除（行番号がずれないように）
  for (let i = deliveryRows.length - 1; i >= 0; i--) {
    const rowMerchantId = deliveryRows[i][delMerchantIdIdx];
    if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
      deliverySheet.deleteRow(i + 2); // ヘッダー分+1
      deletedCount++;
    }
  }
  console.log('削除件数:', deletedCount, '件');

  console.log('');
  console.log('【新しい配信管理データを作成】');

  // 配信管理シートのヘッダーインデックス取得
  const freshDeliveryHeaders = deliverySheet.getRange(1, 1, 1, deliverySheet.getLastColumn()).getValues()[0];

  const delCvIdIdx = freshDeliveryHeaders.indexOf('CV ID');
  const delDeliveredAtIdx = freshDeliveryHeaders.indexOf('配信日時');
  const delStatusIdx = freshDeliveryHeaders.indexOf('配信ステータス');
  const delDetailStatusIdx = freshDeliveryHeaders.indexOf('詳細ステータス');
  const delRecordIdIdx = freshDeliveryHeaders.indexOf('レコードID');
  const delRankIdx = freshDeliveryHeaders.indexOf('配信順位');
  const delStatusUpdateIdx = freshDeliveryHeaders.indexOf('ステータス更新日時');
  const delLastUpdateIdx = freshDeliveryHeaders.indexOf('最終更新日時');

  // 3件の配信データを作成
  const now = new Date();
  const deliveredAt1 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3日前
  const deliveredAt2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5日前
  const deliveredAt3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2日前

  const testData = [
    {
      cvId: availableCvIds[0].cvId,
      deliveredAt: deliveredAt1,
      status: '配信済み',
      detailStatus: '配信済み',
      rank: 1
    },
    {
      cvId: availableCvIds[1] ? availableCvIds[1].cvId : availableCvIds[0].cvId,
      deliveredAt: deliveredAt2,
      status: '配信済み',
      detailStatus: '配信済み',
      rank: 1
    },
    {
      cvId: availableCvIds[2] ? availableCvIds[2].cvId : availableCvIds[0].cvId,
      deliveredAt: deliveredAt3,
      status: '配信済み',
      detailStatus: '配信済み',
      rank: 1
    }
  ];

  testData.forEach((data, idx) => {
    const recordId = 'DEL' + Utilities.formatDate(now, 'JST', 'yyMMddHHmmss') + (idx + 1);

    // 新しい行を作成（全列分）
    const newRow = new Array(freshDeliveryHeaders.length).fill('');

    newRow[delRecordIdIdx] = recordId;
    newRow[delCvIdIdx] = data.cvId;
    newRow[delMerchantIdIdx] = merchantId;
    newRow[delDeliveredAtIdx] = data.deliveredAt;
    newRow[delRankIdx] = data.rank;
    newRow[delStatusIdx] = data.status;
    newRow[delDetailStatusIdx] = data.detailStatus;
    newRow[delStatusUpdateIdx] = data.deliveredAt;
    newRow[delLastUpdateIdx] = data.deliveredAt;

    deliverySheet.appendRow(newRow);

    console.log((idx + 1) + '件目:', data.cvId, '配信日時:', Utilities.formatDate(data.deliveredAt, 'JST', 'yyyy-MM-dd HH:mm'));
  });

  console.log('');
  console.log('✅ 配信管理データの修正が完了しました');
  console.log('加盟店ID:', merchantId);
  console.log('作成件数:', testData.length, '件');
}
