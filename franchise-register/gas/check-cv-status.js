/**
 * CV IDの状態確認 - フロント表示されない理由を調査
 */
function checkCVStatus() {
  const merchantId = 'FR251112004600';
  const testCvIds = ['CV1759897538494', 'CV1759899075390', 'CV1759904787968'];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');
  const cancelSheet = ss.getSheetByName('キャンセル申請');

  console.log('=== CV ID 状態確認 ===');
  console.log('対象加盟店: ' + merchantId);
  console.log('');

  // ユーザー登録シートのデータ取得
  const userData = userSheet.getDataRange().getValues();
  const userHeaders = userData[0];
  const userRows = userData.slice(1);

  const cvIdIdx = userHeaders.indexOf('CV ID');
  const nameIdx = userHeaders.indexOf('氏名');
  const contractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');
  const archiveStatusIdx = userHeaders.indexOf('アーカイブ状態');
  const archiveMerchantIdIdx = userHeaders.indexOf('アーカイブ加盟店ID');

  // キャンセル申請シートから申請済みCV IDを取得
  const appliedCvIds = new Set();
  if (cancelSheet) {
    const cancelData = cancelSheet.getDataRange().getValues();
    const cancelHeaders = cancelData[0];
    const cancelRows = cancelData.slice(1);
    const cancelCvIdIdx = cancelHeaders.indexOf('CV ID');
    const cancelMerchantIdIdx = cancelHeaders.indexOf('加盟店ID');

    for (let i = 0; i < cancelRows.length; i++) {
      const cvId = cancelRows[i][cancelCvIdIdx];
      const cancelMerchantId = cancelRows[i][cancelMerchantIdIdx];
      if (cvId && (cancelMerchantId === merchantId || cancelMerchantId === String(merchantId))) {
        appliedCvIds.add(cvId);
      }
    }
  }

  testCvIds.forEach(cvId => {
    console.log('━━━━━━━━━━━━━━━━━━━━');
    console.log('CV ID: ' + cvId);
    console.log('');

    // ユーザー登録シートで検索
    let found = false;
    for (let i = 0; i < userRows.length; i++) {
      if (userRows[i][cvIdIdx] === cvId) {
        found = true;
        const name = userRows[i][nameIdx];
        const contractMerchantId = userRows[i][contractMerchantIdIdx] || '';
        const archiveStatus = archiveStatusIdx >= 0 ? userRows[i][archiveStatusIdx] : '';
        const archiveMerchantId = archiveMerchantIdIdx >= 0 ? userRows[i][archiveMerchantIdIdx] : '';

        console.log('✅ ユーザー登録シートに存在');
        console.log('氏名: ' + name);
        console.log('成約加盟店ID: ' + (contractMerchantId ? contractMerchantId : '（未成約）'));
        console.log('アーカイブ状態: ' + (archiveStatus ? archiveStatus : '（未アーカイブ）'));
        console.log('アーカイブ加盟店ID: ' + (archiveMerchantId ? archiveMerchantId : '（なし）'));
        console.log('');

        // 表示されない理由を判定
        const reasons = [];

        if (contractMerchantId && contractMerchantId !== '') {
          reasons.push('❌ 成約済み（成約加盟店ID: ' + contractMerchantId + '）');
        }

        if (appliedCvIds.has(cvId)) {
          reasons.push('❌ キャンセル申請済み');
        }

        if (archiveStatus === 'archived' &&
            (archiveMerchantId === merchantId || archiveMerchantId === String(merchantId))) {
          reasons.push('❌ アーカイブ済み（追客終了BOX）');
        }

        if (reasons.length > 0) {
          console.log('【フロント表示されない理由】');
          reasons.forEach(reason => console.log(reason));
        } else {
          console.log('✅ フロント表示条件を満たしています');
        }

        break;
      }
    }

    if (!found) {
      console.log('❌ ユーザー登録シートに存在しません');
      console.log('→ これが表示されない原因です！');
    }

    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('【推奨対応】');
  console.log('1. cleanupAllTestData() を実行して古いデータを削除');
  console.log('2. ユーザー登録シートで未成約のCV IDを確認');
  console.log('3. recreateTestData() を再実行');
}
