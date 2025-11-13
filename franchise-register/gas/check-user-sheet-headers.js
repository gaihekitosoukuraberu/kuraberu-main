/**
 * ユーザー登録シートのヘッダー確認
 */
function checkUserSheetHeaders() {
  console.log('===== ユーザー登録シートのヘッダー確認 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!userSheet) {
    console.error('❌ ユーザー登録シートが見つかりません');
    return;
  }

  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];

  console.log('総カラム数:', headers.length);
  console.log('\n全カラム一覧:');

  for (let i = 0; i < headers.length; i++) {
    console.log(`  ${i + 1}: "${headers[i]}"`);
  }

  // テストデータ作成に必要なカラムを検索
  const requiredColumns = [
    '申込日時',
    '会社名',
    'フリガナ',
    '代表者名',
    '電話番号',
    'メールアドレス',
    '都道府県',
    '市区町村',
    '営業担当者氏名',
    '配信ステータス',
    '配信日',
    '配信先業者一覧',
    '管理ステータス',
    'フォロー記録_電話回数',
    'フォロー記録_SMS回数'
  ];

  console.log('\n\n必要なカラムの存在確認:');

  requiredColumns.forEach(colName => {
    const index = headers.indexOf(colName);
    if (index >= 0) {
      console.log(`  ✅ "${colName}" → カラム ${index + 1}`);
    } else {
      // 部分一致を探す
      const partialMatches = headers.filter(h =>
        h && h.toString().includes(colName.replace('_', ''))
      );

      if (partialMatches.length > 0) {
        console.log(`  ⚠️ "${colName}" → 完全一致なし、類似: ${JSON.stringify(partialMatches)}`);
      } else {
        console.log(`  ❌ "${colName}" → 見つかりません`);
      }
    }
  });

  console.log('\n===== 確認終了 =====');
}
