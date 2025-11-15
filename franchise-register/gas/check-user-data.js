function checkUserData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!userSheet) {
    console.log('ユーザー登録シートが見つかりません');
    return;
  }

  const userData = userSheet.getDataRange().getValues();
  const userHeaders = userData[0];
  const userRows = userData.slice(1);

  const cvIdIdx = userHeaders.indexOf('CV ID');
  const nameIdx = userHeaders.indexOf('氏名');

  console.log('=== ユーザー登録シート ===');
  console.log('CV ID列のインデックス:', cvIdIdx);
  console.log('氏名列のインデックス:', nameIdx);
  console.log('総行数（ヘッダー除く）:', userRows.length);
  console.log('');

  // 配信管理シートで見つかったCV IDを確認
  const targetCvIds = ['CVTEST1763085613249146', 'CVTEST176308561718344'];

  console.log('【配信管理シートにあるCV IDの検索】');
  targetCvIds.forEach(targetCvId => {
    console.log('');
    console.log('検索CV ID:', targetCvId);

    const found = userRows.find(row => row[cvIdIdx] === targetCvId);
    if (found) {
      console.log('  ✅ 見つかりました');
      console.log('  氏名:', found[nameIdx]);
    } else {
      console.log('  ❌ ユーザー登録シートに存在しません');
    }
  });

  console.log('');
  console.log('【ユーザー登録シートの最初の5件のCV ID】');
  userRows.slice(0, 5).forEach((row, idx) => {
    console.log((idx + 1) + ':', row[cvIdIdx], '-', row[nameIdx]);
  });
}
