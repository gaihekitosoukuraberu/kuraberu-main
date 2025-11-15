/**
 * 加盟店データ診断スクリプト
 * FR251112004600 でどのデータが見えるか確認
 */

function debugMerchantData() {
  const merchantId = 'FR251112004600';
  console.log('===== 加盟店データ診断 =====');
  console.log('加盟店ID:', merchantId);
  console.log('');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 配信管理シートの確認
  console.log('【1. 配信管理シート - この加盟店への配信データ】');
  const deliverySheet = ss.getSheetByName('配信管理');
  if (deliverySheet) {
    const deliveryData = deliverySheet.getDataRange().getValues();
    const deliveryHeaders = deliveryData[0];
    const deliveryRows = deliveryData.slice(1);

    console.log('ヘッダー:', deliveryHeaders.slice(0, 10).join(', '));
    console.log('');

    const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
    const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
    const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');
    const delDetailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');
    const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');

    console.log('列インデックス:');
    console.log('  CV ID:', delCvIdIdx);
    console.log('  加盟店ID:', delMerchantIdIdx);
    console.log('  配信ステータス:', delStatusIdx);
    console.log('  詳細ステータス:', delDetailStatusIdx);
    console.log('');

    let count = 0;
    deliveryRows.forEach((row, idx) => {
      const rowMerchantId = row[delMerchantIdIdx];
      if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
        count++;
        console.log(`配信${count}件目（行${idx + 2}）:`);
        console.log('  CV ID:', row[delCvIdIdx]);
        console.log('  加盟店ID:', rowMerchantId);
        console.log('  配信ステータス:', row[delStatusIdx]);
        console.log('  詳細ステータス:', row[delDetailStatusIdx]);
        console.log('  配信日時:', row[delDeliveredAtIdx]);
        console.log('');
      }
    });

    console.log(`✅ 合計 ${count} 件の配信データが見つかりました`);
  } else {
    console.log('❌ 配信管理シートが見つかりません');
  }
  console.log('');

  // 2. ユーザー登録シートの確認
  console.log('【2. ユーザー登録シート - 顧客データ】');
  const userSheet = ss.getSheetByName('ユーザー登録');
  if (userSheet) {
    const userData = userSheet.getDataRange().getValues();
    const userHeaders = userData[0];
    const userRows = userData.slice(1);

    const cvIdIdx = userHeaders.indexOf('CV ID');
    const nameIdx = userHeaders.indexOf('氏名');
    const contractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');
    const archiveStatusIdx = userHeaders.indexOf('アーカイブ状態');
    const archiveMerchantIdx = userHeaders.indexOf('アーカイブ加盟店ID');

    console.log('列インデックス:');
    console.log('  CV ID:', cvIdIdx);
    console.log('  氏名:', nameIdx);
    console.log('  成約加盟店ID:', contractMerchantIdIdx);
    console.log('  アーカイブ状態:', archiveStatusIdx);
    console.log('  アーカイブ加盟店ID:', archiveMerchantIdx);
    console.log('');

    // 配信管理シートにあるCV IDを確認
    const deliveryData2 = deliverySheet.getDataRange().getValues();
    const deliveryHeaders2 = deliveryData2[0];
    const deliveryRows2 = deliveryData2.slice(1);
    const delCvIdIdx2 = deliveryHeaders2.indexOf('CV ID');
    const delMerchantIdIdx2 = deliveryHeaders2.indexOf('加盟店ID');

    const merchantCvIds = new Set();
    deliveryRows2.forEach(row => {
      if (row[delMerchantIdIdx2] === merchantId || row[delMerchantIdIdx2] === String(merchantId)) {
        merchantCvIds.add(row[delCvIdIdx2]);
      }
    });

    console.log('この加盟店に配信されているCV ID:', Array.from(merchantCvIds).join(', '));
    console.log('');

    let foundCount = 0;
    merchantCvIds.forEach(cvId => {
      const userRow = userRows.find(row => row[cvIdIdx] === cvId);
      if (userRow) {
        foundCount++;
        console.log(`顧客データ ${foundCount}:`);
        console.log('  CV ID:', userRow[cvIdIdx]);
        console.log('  氏名:', userRow[nameIdx]);
        console.log('  成約加盟店ID:', userRow[contractMerchantIdIdx] || '(なし)');
        if (archiveStatusIdx >= 0) {
          console.log('  アーカイブ状態:', userRow[archiveStatusIdx] || '(なし)');
          console.log('  アーカイブ加盟店ID:', userRow[archiveMerchantIdx] || '(なし)');
        }
        console.log('');
      } else {
        console.log(`❌ CV ID ${cvId} がユーザー登録シートに見つかりません`);
      }
    });

    console.log(`✅ ${foundCount}件の顧客データが見つかりました`);
  } else {
    console.log('❌ ユーザー登録シートが見つかりません');
  }
  console.log('');

  // 3. キャンセル申請シートの確認
  console.log('【3. キャンセル申請シート - 既存申請】');
  const cancelSheet = ss.getSheetByName('キャンセル申請');
  if (cancelSheet) {
    const cancelData = cancelSheet.getDataRange().getValues();
    const cancelHeaders = cancelData[0];
    const cancelRows = cancelData.slice(1);

    const cancelCvIdIdx = cancelHeaders.indexOf('CV ID');
    const cancelMerchantIdIdx = cancelHeaders.indexOf('加盟店ID');
    const cancelStatusIdx = cancelHeaders.indexOf('承認ステータス');

    let count = 0;
    cancelRows.forEach((row, idx) => {
      const rowMerchantId = row[cancelMerchantIdIdx];
      if (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) {
        count++;
        console.log(`申請${count}件目（行${idx + 2}）:`);
        console.log('  CV ID:', row[cancelCvIdIdx]);
        console.log('  承認ステータス:', row[cancelStatusIdx]);
        console.log('');
      }
    });

    console.log(`✅ ${count}件のキャンセル申請が見つかりました`);
  } else {
    console.log('❌ キャンセル申請シートが見つかりません');
  }
  console.log('');

  // 4. MerchantCancelReport.getCancelableCases をシミュレート
  console.log('【4. キャンセル申請可能案件の判定シミュレーション】');
  if (deliverySheet && userSheet) {
    const deliveryData3 = deliverySheet.getDataRange().getValues();
    const deliveryHeaders3 = deliveryData3[0];
    const deliveryRows3 = deliveryData3.slice(1);

    const userData3 = userSheet.getDataRange().getValues();
    const userHeaders3 = userData3[0];
    const userRows3 = userData3.slice(1);

    // ユーザーマップ作成
    const userMap = {};
    const cvIdIdx3 = userHeaders3.indexOf('CV ID');
    const contractMerchantIdIdx3 = userHeaders3.indexOf('成約加盟店ID');
    const archiveStatusIdx3 = userHeaders3.indexOf('アーカイブ状態');
    const archiveMerchantIdx3 = userHeaders3.indexOf('アーカイブ加盟店ID');

    userRows3.forEach(row => {
      const cvId = row[cvIdIdx3];
      if (cvId) {
        userMap[cvId] = {
          contractMerchantId: contractMerchantIdIdx3 >= 0 ? row[contractMerchantIdIdx3] : '',
          archiveStatus: archiveStatusIdx3 >= 0 ? row[archiveStatusIdx3] : '',
          archiveMerchantId: archiveMerchantIdx3 >= 0 ? row[archiveMerchantIdx3] : ''
        };
      }
    });

    // キャンセル申請済みCV ID
    const appliedCvIds = new Set();
    if (cancelSheet) {
      const cancelData3 = cancelSheet.getDataRange().getValues();
      const cancelHeaders3 = cancelData3[0];
      const cancelRows3 = cancelData3.slice(1);
      const cancelCvIdIdx3 = cancelHeaders3.indexOf('CV ID');
      const cancelMerchantIdIdx3 = cancelHeaders3.indexOf('加盟店ID');

      cancelRows3.forEach(row => {
        const cvId = row[cancelCvIdIdx3];
        const cancelMerchantId = row[cancelMerchantIdIdx3];
        if (cvId && (cancelMerchantId === merchantId || cancelMerchantId === String(merchantId))) {
          appliedCvIds.add(cvId);
        }
      });
    }

    // 配信管理から抽出
    const delCvIdIdx3 = deliveryHeaders3.indexOf('CV ID');
    const delMerchantIdIdx3 = deliveryHeaders3.indexOf('加盟店ID');
    const delStatusIdx3 = deliveryHeaders3.indexOf('配信ステータス');
    const delDetailStatusIdx3 = deliveryHeaders3.indexOf('詳細ステータス');

    let cancelableCount = 0;
    deliveryRows3.forEach((row, idx) => {
      const cvId = row[delCvIdIdx3];
      const rowMerchantId = row[delMerchantIdIdx3];
      const deliveryStatus = row[delStatusIdx3];

      if (!cvId) return;

      console.log(`--- 配信データ（行${idx + 2}）の判定 ---`);
      console.log('  CV ID:', cvId);
      console.log('  加盟店ID:', rowMerchantId);

      // 条件1: 加盟店IDチェック
      if (rowMerchantId !== merchantId && rowMerchantId !== String(merchantId)) {
        console.log('  ❌ この加盟店に配信されていない');
        return;
      }
      console.log('  ✅ この加盟店に配信されている');

      // 条件2: 配信ステータス
      console.log('  配信ステータス:', deliveryStatus);
      if (deliveryStatus !== '配信済み') {
        console.log('  ❌ 配信ステータスが「配信済み」でない');
        return;
      }
      console.log('  ✅ 配信ステータスOK');

      // 条件3: ユーザー登録シートに存在
      const userInfo = userMap[cvId];
      if (!userInfo) {
        console.log('  ❌ ユーザー登録シートにない');
        return;
      }
      console.log('  ✅ ユーザー登録シートに存在');

      // 条件4: 成約報告済みでない
      console.log('  成約加盟店ID:', userInfo.contractMerchantId || '(なし)');
      if (userInfo.contractMerchantId && userInfo.contractMerchantId !== '') {
        console.log('  ❌ すでに成約報告済み');
        return;
      }
      console.log('  ✅ 未成約');

      // 条件5: キャンセル申請済みでない
      if (appliedCvIds.has(cvId)) {
        console.log('  ❌ すでにキャンセル申請済み');
        return;
      }
      console.log('  ✅ キャンセル未申請');

      // 条件6: アーカイブされていない
      if (userInfo.archiveStatus === 'archived' &&
          (userInfo.archiveMerchantId === merchantId || userInfo.archiveMerchantId === String(merchantId))) {
        console.log('  ❌ この加盟店によってアーカイブ済み');
        return;
      }
      console.log('  ✅ アーカイブされていない');

      console.log('  ✅✅✅ この案件はキャンセル申請可能です！');
      cancelableCount++;
      console.log('');
    });

    console.log(`===== キャンセル申請可能案件: ${cancelableCount}件 =====`);
  }

  console.log('');
  console.log('===== 診断完了 =====');
}
