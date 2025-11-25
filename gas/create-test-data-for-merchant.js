/**
 * 特定加盟店用のキャンセル申請テストデータ作成
 * 加盟店ID: FR251112004600 専用
 */

function createTestDataForMerchant() {
  console.log('===== FR251112004600用テストデータ作成開始 =====');

  const merchantId = 'FR251112004600';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!userSheet) {
    console.error('❌ ユーザー登録シートが見つかりません');
    return;
  }

  // ヘッダー行を取得
  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
  console.log('カラム数:', headers.length);

  // 必要なカラムのインデックスを取得
  const getColIndex = (colName) => headers.indexOf(colName) + 1;

  const colIndexes = {
    'CV ID': getColIndex('CV ID'),
    登録日時: getColIndex('登録日時'),
    氏名: getColIndex('氏名'),
    フリガナ: getColIndex('フリガナ'),
    電話番号: getColIndex('電話番号'),
    メールアドレス: getColIndex('メールアドレス'),
    '都道府県（物件）': getColIndex('都道府県（物件）'),
    '市区町村（物件）': getColIndex('市区町村（物件）'),
    配信ステータス: getColIndex('配信ステータス'),
    配信日時: getColIndex('配信日時'),
    配信先業者一覧: getColIndex('配信先業者一覧'),
    管理ステータス: getColIndex('管理ステータス'),
    担当者名: getColIndex('担当者名'),
    架電履歴: getColIndex('架電履歴')
  };

  console.log('カラムインデックス:', JSON.stringify(colIndexes, null, 2));

  // 6日前の日付（キャンセル申請可能期間内）
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  sixDaysAgo.setHours(10, 0, 0, 0);

  // 申込日時（配信日の3日前）
  const applicationDate = new Date(sixDaysAgo);
  applicationDate.setDate(applicationDate.getDate() - 3);

  // CV ID生成
  const generateCvId = () => 'CVTEST' + Date.now() + Math.floor(Math.random() * 1000);

  // テストデータ3件作成
  const cvId1 = generateCvId();
  const cvId2 = generateCvId();
  const cvId3 = generateCvId();

  const testData = [
    {
      'CV ID': cvId1,
      登録日時: applicationDate,
      氏名: 'テスト太郎A',
      フリガナ: 'テストタロウA',
      電話番号: '03-1234-5678',
      メールアドレス: 'test-a@example.com',
      '都道府県（物件）': '東京都',
      '市区町村（物件）': '渋谷区',
      配信ステータス: '配信済み',
      配信日時: sixDaysAgo,
      配信先業者一覧: merchantId,
      管理ステータス: '配信後未成約',
      担当者名: 'テスト営業A',
      架電履歴: JSON.stringify([
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: 'SMS' },
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: 'SMS' },
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: 'SMS' },
        { date: sixDaysAgo.toISOString(), type: '電話' }
      ])
    },
    {
      'CV ID': cvId2,
      登録日時: applicationDate,
      氏名: 'テスト花子B（フォロー不足）',
      フリガナ: 'テストハナコB',
      電話番号: '03-2345-6789',
      メールアドレス: 'test-b@example.com',
      '都道府県（物件）': '東京都',
      '市区町村（物件）': '新宿区',
      配信ステータス: '配信済み',
      配信日時: sixDaysAgo,
      配信先業者一覧: merchantId,
      管理ステータス: '配信後未成約',
      担当者名: 'テスト営業B',
      架電履歴: JSON.stringify([
        { date: sixDaysAgo.toISOString(), type: '電話' }
      ])
    },
    {
      'CV ID': cvId3,
      登録日時: applicationDate,
      氏名: 'テスト一郎C（期限延長済み）',
      フリガナ: 'テストイチロウC',
      電話番号: '03-3456-7890',
      メールアドレス: 'test-c@example.com',
      '都道府県（物件）': '神奈川県',
      '市区町村（物件）': '横浜市',
      配信ステータス: '配信済み',
      配信日時: sixDaysAgo,
      配信先業者一覧: merchantId,
      管理ステータス: '配信後未成約',
      担当者名: 'テスト営業C',
      架電履歴: JSON.stringify([
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: 'SMS' },
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: 'SMS' },
        { date: sixDaysAgo.toISOString(), type: '電話' },
        { date: sixDaysAgo.toISOString(), type: '電話' }
      ])
    }
  ];

  // データを追加
  let addedCount = 0;
  testData.forEach((data, index) => {
    const lastRow = userSheet.getLastRow();
    const newRow = lastRow + 1;

    // 各カラムに値を設定
    Object.keys(colIndexes).forEach(colName => {
      const colIndex = colIndexes[colName];
      if (colIndex > 0 && data[colName] !== undefined) {
        userSheet.getRange(newRow, colIndex).setValue(data[colName]);
      }
    });

    addedCount++;
    console.log(`✅ テストデータ${index + 1}を追加: ${data.氏名} (行${newRow}, CV ID: ${data['CV ID']})`);
  });

  // テストデータCに期限延長申請を追加（承認済み）
  const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
  if (extensionSheet) {
    const extensionHeaders = extensionSheet.getRange(1, 1, 1, extensionSheet.getLastColumn()).getValues()[0];
    const getExtColIndex = (colName) => extensionHeaders.indexOf(colName) + 1;

    const extLastRow = extensionSheet.getLastRow();
    const extNewRow = extLastRow + 1;

    const now = new Date();
    const extendedDeadline = new Date(sixDaysAgo);
    extendedDeadline.setMonth(extendedDeadline.getMonth() + 2);
    extendedDeadline.setDate(0); // 翌月末
    extendedDeadline.setHours(23, 59, 59, 999);

    // キャンセル期限延長申請IDを生成
    const extensionId = 'DE' + Utilities.formatDate(now, 'JST', 'yyMMddHHmmss');

    extensionSheet.getRange(extNewRow, getExtColIndex('タイムスタンプ')).setValue(now);
    extensionSheet.getRange(extNewRow, getExtColIndex('申請ID')).setValue(extensionId);
    extensionSheet.getRange(extNewRow, getExtColIndex('CV ID')).setValue(cvId3);
    extensionSheet.getRange(extNewRow, getExtColIndex('顧客名')).setValue('テスト一郎C（期限延長済み）');
    extensionSheet.getRange(extNewRow, getExtColIndex('電話番号')).setValue('03-3456-7890');
    extensionSheet.getRange(extNewRow, getExtColIndex('住所')).setValue('神奈川県横浜市');
    extensionSheet.getRange(extNewRow, getExtColIndex('加盟店ID')).setValue(merchantId);
    extensionSheet.getRange(extNewRow, getExtColIndex('加盟店名')).setValue('テスト加盟店');
    extensionSheet.getRange(extNewRow, getExtColIndex('申請担当者')).setValue('テスト営業C');
    extensionSheet.getRange(extNewRow, getExtColIndex('配信日時')).setValue(sixDaysAgo);
    extensionSheet.getRange(extNewRow, getExtColIndex('経過日数')).setValue(6);
    extensionSheet.getRange(extNewRow, getExtColIndex('申請期限')).setValue(new Date(sixDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000));
    extensionSheet.getRange(extNewRow, getExtColIndex('期限内フラグ')).setValue('TRUE');
    extensionSheet.getRange(extNewRow, getExtColIndex('連絡がついた日時')).setValue(sixDaysAgo);
    extensionSheet.getRange(extNewRow, getExtColIndex('アポ予定日')).setValue(new Date(sixDaysAgo.getTime() + 14 * 24 * 60 * 60 * 1000));
    extensionSheet.getRange(extNewRow, getExtColIndex('延長理由')).setValue('連絡がついたがアポが来週になったため');
    extensionSheet.getRange(extNewRow, getExtColIndex('延長後期限')).setValue(extendedDeadline);
    extensionSheet.getRange(extNewRow, getExtColIndex('承認ステータス')).setValue('承認済み');
    extensionSheet.getRange(extNewRow, getExtColIndex('承認者')).setValue('管理者テスト');
    extensionSheet.getRange(extNewRow, getExtColIndex('承認日時')).setValue(now);
    extensionSheet.getRange(extNewRow, getExtColIndex('最終更新日時')).setValue(now);

    console.log('✅ 期限延長申請データを追加（承認済み）');
  }

  console.log(`\n===== 完了 =====`);
  console.log(`加盟店ID: ${merchantId}`);
  console.log(`追加したテストデータ: ${addedCount}件`);
  console.log(`配信日: ${Utilities.formatDate(sixDaysAgo, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')}`);
  console.log(`経過日数: 6日（申請可能期間内）`);
  console.log(`\nテストケース:`);
  console.log(`1. テスト太郎A (CV: ${cvId1}) - フォロー履歴充分（電話5回、SMS3回）→ キャンセル申請可能`);
  console.log(`2. テスト花子B (CV: ${cvId2}) - フォロー履歴不足（電話1回、SMS0回）→ バリデーションエラーになる想定`);
  console.log(`3. テスト一郎C (CV: ${cvId3}) - 期限延長承認済み → 延長後の期限が適用される`);

  Browser.msgBox('完了', `FR251112004600用のテストデータを${addedCount}件作成しました。`, Browser.Buttons.OK);
}
