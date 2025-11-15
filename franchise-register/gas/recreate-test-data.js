/**
 * FR251112004600（大野建装）のテストデータを再作成
 */
function recreateTestData() {
  const merchantId = 'FR251112004600';
  const merchantName = '大野建装';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');
  const deliverySheet = ss.getSheetByName('配信管理');

  if (!userSheet || !deliverySheet) {
    console.log('シートが見つかりません');
    return;
  }

  console.log('=== テストデータ再作成開始 ===');
  console.log('加盟店ID:', merchantId);
  console.log('');

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
  console.log('【配信管理シートに新しいデータを作成】');

  // 配信管理シートのヘッダーインデックス取得
  const deliveryHeaders = deliverySheet.getRange(1, 1, 1, deliverySheet.getLastColumn()).getValues()[0];

  const delRecordIdIdx = deliveryHeaders.indexOf('レコードID');
  const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
  const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
  const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');
  const delRankIdx = deliveryHeaders.indexOf('配信順位');
  const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');
  const delDetailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');
  const delStatusUpdateIdx = deliveryHeaders.indexOf('ステータス更新日時');
  const delLastUpdateIdx = deliveryHeaders.indexOf('最終更新日時');

  // 3件の配信データを作成
  const now = new Date();
  const deliveredAt1 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3日前
  const deliveredAt2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5日前
  const deliveredAt3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2日前

  const testData = [
    {
      cvId: availableCvIds[0].cvId,
      name: availableCvIds[0].name,
      deliveredAt: deliveredAt1,
      status: '配信済み',
      detailStatus: '配信済み',
      rank: 1
    },
    {
      cvId: availableCvIds[1] ? availableCvIds[1].cvId : availableCvIds[0].cvId,
      name: availableCvIds[1] ? availableCvIds[1].name : availableCvIds[0].name,
      deliveredAt: deliveredAt2,
      status: '配信済み',
      detailStatus: '配信済み',
      rank: 1
    },
    {
      cvId: availableCvIds[2] ? availableCvIds[2].cvId : availableCvIds[0].cvId,
      name: availableCvIds[2] ? availableCvIds[2].name : availableCvIds[0].name,
      deliveredAt: deliveredAt3,
      status: '配信済み',
      detailStatus: '配信済み',
      rank: 1
    }
  ];

  testData.forEach((data, idx) => {
    const recordId = 'DEL' + Utilities.formatDate(now, 'JST', 'yyMMddHHmmss') + (idx + 1);

    // 新しい行を作成（全列分）
    const newRow = new Array(deliveryHeaders.length).fill('');

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

    console.log((idx + 1) + '件目:', data.name, '(CV:', data.cvId + ') - 配信日時:', Utilities.formatDate(data.deliveredAt, 'JST', 'yyyy-MM-dd HH:mm'));
  });

  console.log('');
  console.log('✅ テストデータの再作成が完了しました');
  console.log('加盟店ID:', merchantId);
  console.log('作成件数:', testData.length, '件');
  console.log('');
  console.log('【確認事項】');
  console.log('これらの配信データは以下のすべてのメニューで表示されます:');
  console.log('1. キャンセル申請 > 申請可能: 3件表示されるはず');
  console.log('2. 成約報告: 3件表示されるはず');
  console.log('3. 期限延長申請 > 延長可能: 3件すべて（7日以内）');
  console.log('');
  console.log('【注意】');
  console.log('- 同じ配信データが3つのメニューすべてで共有されます');
  console.log('- キャンセル申請・成約報告すると、他のメニューから消えます');
}

/**
 * テストデータを完全にクリーンアップ
 * 配信管理、キャンセル申請、期限延長申請のすべてを削除
 */
function cleanupAllTestData() {
  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  console.log('=== テストデータ完全クリーンアップ開始 ===');
  console.log('加盟店ID:', merchantId);
  console.log('');

  let totalDeleted = 0;

  // 1. 配信管理シート
  const deliverySheet = ss.getSheetByName('配信管理');
  if (deliverySheet) {
    const deliveryData = deliverySheet.getDataRange().getValues();
    const delMerchantIdIdx = deliveryData[0].indexOf('加盟店ID');
    let count = 0;

    for (let i = deliveryData.length - 1; i >= 1; i--) {
      if (deliveryData[i][delMerchantIdIdx] === merchantId) {
        deliverySheet.deleteRow(i + 1);
        count++;
      }
    }
    console.log('配信管理: ' + count + '件削除');
    totalDeleted += count;
  }

  // 2. キャンセル申請シート
  const cancelSheet = ss.getSheetByName('キャンセル申請');
  if (cancelSheet) {
    const cancelData = cancelSheet.getDataRange().getValues();
    const cancelMerchantIdIdx = cancelData[0].indexOf('加盟店ID');
    let count = 0;

    for (let i = cancelData.length - 1; i >= 1; i--) {
      if (cancelData[i][cancelMerchantIdIdx] === merchantId) {
        cancelSheet.deleteRow(i + 1);
        count++;
      }
    }
    console.log('キャンセル申請: ' + count + '件削除');
    totalDeleted += count;
  }

  // 3. キャンセル期限延長申請シート
  const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
  if (extensionSheet) {
    const extensionData = extensionSheet.getDataRange().getValues();
    const extMerchantIdIdx = extensionData[0].indexOf('加盟店ID');
    let count = 0;

    for (let i = extensionData.length - 1; i >= 1; i--) {
      if (extensionData[i][extMerchantIdIdx] === merchantId) {
        extensionSheet.deleteRow(i + 1);
        count++;
      }
    }
    console.log('期限延長申請: ' + count + '件削除');
    totalDeleted += count;
  }

  console.log('');
  console.log('✅ クリーンアップ完了: 合計 ' + totalDeleted + ' 件削除');
}
