/**
 * 配信管理システム テストデータ作成
 *
 * 実行方法: GASエディタで createCVDeliveryTestData() を実行
 *
 * 【作成されるデータ】
 * - CV（顧客）データ: 2件
 * - 配信レコード: CV1に4社、CV2に3社
 * - 追客状況: 一部の加盟店は活動中、一部は未対応
 */

function createCVDeliveryTestData() {
  console.log('===== 配信管理テストデータ作成開始 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');
  const deliverySheet = ss.getSheetByName('配信管理');

  if (!userSheet) {
    console.error('❌ ユーザー登録シートが見つかりません');
    return;
  }

  if (!deliverySheet) {
    console.error('❌ 配信管理シートが見つかりません');
    console.log('先に setupCVDeliverySheet() を実行してください');
    return;
  }

  // テスト用の加盟店ID（実際には加盟店マスタに存在するIDを使用）
  const testMerchants = [
    { id: 'FR251112004600', name: 'テスト加盟店A' },
    { id: 'FR251112004601', name: 'テスト加盟店B' },
    { id: 'FR251112004602', name: 'テスト加盟店C' },
    { id: 'FR251112004603', name: 'テスト加盟店D' }
  ];

  // CV ID生成
  const generateCvId = () => 'CVTEST' + Date.now() + Math.floor(Math.random() * 1000);

  // 配信日時（6日前）
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  sixDaysAgo.setHours(10, 0, 0, 0);

  // 登録日時（配信日の3日前）
  const registrationDate = new Date(sixDaysAgo);
  registrationDate.setDate(registrationDate.getDate() - 3);

  // ==========================================
  // CV 1: 4社に配信、2社が追客中
  // ==========================================
  const cv1Id = generateCvId();
  const cv1Name = 'テスト太郎（4社配信）';

  console.log('\n--- CV1作成: ' + cv1Id + ' ---');

  // ユーザー登録シートにCV1を追加
  addCVToUserSheet(userSheet, {
    cvId: cv1Id,
    name: cv1Name,
    kana: 'テストタロウ',
    tel: '03-1111-2222',
    email: 'test-cv1@example.com',
    prefecture: '東京都',
    city: '渋谷区',
    registrationDate: registrationDate,
    deliveredAt: sixDaysAgo,
    deliveredMerchants: testMerchants.map(m => m.id).join(',')
  });

  // 配信管理シートに4社分のレコードを追加
  // A社: 追客中（電話3回、SMS2回、アポ確定）
  addDeliveryRecordForTest({
    cvId: cv1Id,
    merchantId: testMerchants[0].id,
    deliveredAt: sixDaysAgo,
    rank: 1,
    detailStatus: 'アポ確定',
    phoneCount: 3,
    smsCount: 2,
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1日前
    appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後
    contactHistory: [
      { date: sixDaysAgo, type: '電話', result: '不在', memo: '留守電あり' },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: 'SMS', result: '送信', memo: '日程調整のお願い' },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), type: '電話', result: 'アポ獲得', memo: '3日後10時訪問' }
    ],
    memo: '外壁塗装希望。予算150万円程度'
  });

  // B社: 追客中（電話2回、SMS1回）
  addDeliveryRecordForTest({
    cvId: cv1Id,
    merchantId: testMerchants[1].id,
    deliveredAt: sixDaysAgo,
    rank: 2,
    detailStatus: '追客中',
    phoneCount: 2,
    smsCount: 1,
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前
    contactHistory: [
      { date: sixDaysAgo, type: '電話', result: '不在' },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: 'SMS', result: '送信' }
    ],
    memo: '連絡がつきにくい'
  });

  // C社: 未対応
  addDeliveryRecordForTest({
    cvId: cv1Id,
    merchantId: testMerchants[2].id,
    deliveredAt: sixDaysAgo,
    rank: 3,
    detailStatus: '未対応',
    phoneCount: 0,
    smsCount: 0
  });

  // D社: 未対応
  addDeliveryRecordForTest({
    cvId: cv1Id,
    merchantId: testMerchants[3].id,
    deliveredAt: sixDaysAgo,
    rank: 4,
    detailStatus: '未対応',
    phoneCount: 0,
    smsCount: 0
  });

  console.log('✅ CV1の配信レコードを4件作成しました');

  // ==========================================
  // CV 2: 3社に配信、1社が追客中、1社未対応、1社がキャンセル申請予定
  // ==========================================
  const cv2Id = generateCvId();
  const cv2Name = 'テスト花子（3社配信）';

  console.log('\n--- CV2作成: ' + cv2Id + ' ---');

  // ユーザー登録シートにCV2を追加
  addCVToUserSheet(userSheet, {
    cvId: cv2Id,
    name: cv2Name,
    kana: 'テストハナコ',
    tel: '03-3333-4444',
    email: 'test-cv2@example.com',
    prefecture: '神奈川県',
    city: '横浜市',
    registrationDate: registrationDate,
    deliveredAt: sixDaysAgo,
    deliveredMerchants: [testMerchants[0].id, testMerchants[1].id, testMerchants[2].id].join(',')
  });

  // 配信管理シートに3社分のレコードを追加
  // A社: 追客中（電話4回、訪問済み）
  addDeliveryRecordForTest({
    cvId: cv2Id,
    merchantId: testMerchants[0].id,
    deliveredAt: sixDaysAgo,
    rank: 1,
    detailStatus: '訪問済み',
    phoneCount: 4,
    smsCount: 0,
    visitCount: 1,
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1日前
    contactHistory: [
      { date: sixDaysAgo, type: '電話', result: '本人と会話', memo: 'アポ取得' },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), type: '訪問', result: '見積提示', memo: '150万円で提案' }
    ],
    memo: '見積検討中。週末に返事'
  });

  // B社: 未対応
  addDeliveryRecordForTest({
    cvId: cv2Id,
    merchantId: testMerchants[1].id,
    deliveredAt: sixDaysAgo,
    rank: 2,
    detailStatus: '未対応',
    phoneCount: 0,
    smsCount: 0
  });

  // C社: これがキャンセル申請する想定（電話1回のみ）
  addDeliveryRecordForTest({
    cvId: cv2Id,
    merchantId: testMerchants[2].id,
    deliveredAt: sixDaysAgo,
    rank: 3,
    detailStatus: '追客中',
    phoneCount: 1,
    smsCount: 0,
    lastContact: sixDaysAgo,
    contactHistory: [
      { date: sixDaysAgo, type: '電話', result: '不在' }
    ],
    memo: 'この加盟店がキャンセル申請する想定'
  });

  console.log('✅ CV2の配信レコードを3件作成しました');

  console.log('\n===== テストデータ作成完了 =====');
  console.log('\n【テストシナリオ】');
  console.log('1. CV1: 加盟店C or D がキャンセル申請 → A社とB社が追客中のため警告表示');
  console.log('2. CV2: 加盟店C がキャンセル申請 → A社が訪問済みのため警告表示（却下推奨）');
  console.log('\n【確認方法】');
  console.log('1. 配信管理シートを開いて色分けを確認');
  console.log('2. フロントから加盟店C (FR251112004602) でログイン');
  console.log('3. キャンセル申請を実行してSlack通知を確認');
}

/**
 * ユーザー登録シートにCVデータを追加
 */
function addCVToUserSheet(userSheet, cvData) {
  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
  const getColIndex = (colName) => headers.indexOf(colName) + 1;

  const lastRow = userSheet.getLastRow();
  const newRow = lastRow + 1;

  const colIndexes = {
    'CV ID': getColIndex('CV ID'),
    '登録日時': getColIndex('登録日時'),
    '氏名': getColIndex('氏名'),
    'フリガナ': getColIndex('フリガナ'),
    '電話番号': getColIndex('電話番号'),
    'メールアドレス': getColIndex('メールアドレス'),
    '都道府県（物件）': getColIndex('都道府県（物件）'),
    '市区町村（物件）': getColIndex('市区町村（物件）'),
    '配信ステータス': getColIndex('配信ステータス'),
    '配信日時': getColIndex('配信日時'),
    '配信先業者一覧': getColIndex('配信先業者一覧'),
    '管理ステータス': getColIndex('管理ステータス')
  };

  if (colIndexes['CV ID'] > 0) userSheet.getRange(newRow, colIndexes['CV ID']).setValue(cvData.cvId);
  if (colIndexes['登録日時'] > 0) userSheet.getRange(newRow, colIndexes['登録日時']).setValue(cvData.registrationDate);
  if (colIndexes['氏名'] > 0) userSheet.getRange(newRow, colIndexes['氏名']).setValue(cvData.name);
  if (colIndexes['フリガナ'] > 0) userSheet.getRange(newRow, colIndexes['フリガナ']).setValue(cvData.kana);
  if (colIndexes['電話番号'] > 0) userSheet.getRange(newRow, colIndexes['電話番号']).setValue(cvData.tel);
  if (colIndexes['メールアドレス'] > 0) userSheet.getRange(newRow, colIndexes['メールアドレス']).setValue(cvData.email);
  if (colIndexes['都道府県（物件）'] > 0) userSheet.getRange(newRow, colIndexes['都道府県（物件）']).setValue(cvData.prefecture);
  if (colIndexes['市区町村（物件）'] > 0) userSheet.getRange(newRow, colIndexes['市区町村（物件）']).setValue(cvData.city);
  if (colIndexes['配信ステータス'] > 0) userSheet.getRange(newRow, colIndexes['配信ステータス']).setValue('配信済み');
  if (colIndexes['配信日時'] > 0) userSheet.getRange(newRow, colIndexes['配信日時']).setValue(cvData.deliveredAt);
  if (colIndexes['配信先業者一覧'] > 0) userSheet.getRange(newRow, colIndexes['配信先業者一覧']).setValue(cvData.deliveredMerchants);
  if (colIndexes['管理ステータス'] > 0) userSheet.getRange(newRow, colIndexes['管理ステータス']).setValue('配信後未成約');

  console.log(`  - ユーザー登録: ${cvData.name} (${cvData.cvId})`);
}

/**
 * 配信管理シートにレコードを追加（テストデータ用）
 */
function addDeliveryRecordForTest(params) {
  const {
    cvId,
    merchantId,
    deliveredAt,
    rank,
    detailStatus = '未対応',
    phoneCount = 0,
    smsCount = 0,
    mailCount = 0,
    visitCount = 0,
    lastContact = null,
    appointmentDate = null,
    contactHistory = [],
    memo = ''
  } = params;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('配信管理');

  if (!sheet) {
    throw new Error('配信管理シートが見つかりません');
  }

  const recordId = 'DL' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyMMddHHmmss') +
                   String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const now = new Date();

  // 実際にデータがある最後の行を見つける
  const data = sheet.getDataRange().getValues();
  let actualLastRow = 1; // ヘッダー行
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // レコードIDがあれば
      actualLastRow = i + 1;
    }
  }

  // 連絡履歴JSONを生成
  const historyJson = contactHistory.map((contact, index) => ({
    id: 'CONTACT' + Date.now() + index,
    date: Utilities.formatDate(new Date(contact.date), 'Asia/Tokyo', 'yyyy-MM-dd\'T\'HH:mm:ss'),
    type: contact.type,
    duration: contact.duration || '',
    result: contact.result || '',
    memo: contact.memo || '',
    recordedBy: 'テスト',
    recordedAt: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd\'T\'HH:mm:ss')
  }));

  // サマリー生成
  let summary = '';
  if (contactHistory.length > 0) {
    const recent3 = historyJson.slice(-3).reverse();
    recent3.forEach(c => {
      const date = c.date.split('T')[0].replace(/-/g, '/');
      const time = c.date.split('T')[1].substring(0, 5);
      summary += `${date} ${time} ${c.type}: ${c.result}\n`;
    });
  }

  const newRow = [
    recordId,                                    // 1. レコードID
    cvId,                                        // 2. CV ID
    merchantId,                                  // 3. 加盟店ID
    deliveredAt,                                 // 4. 配信日時
    rank,                                        // 5. 配信順位
    '配信済み',                                  // 6. 配信ステータス
    detailStatus,                                // 7. 詳細ステータス
    now,                                         // 8. ステータス更新日時
    now,                                         // 9. 最終更新日時
    phoneCount,                                  // 10. 電話回数
    smsCount,                                    // 11. SMS回数
    mailCount,                                   // 12. メール送信回数
    visitCount,                                  // 13. 訪問回数
    lastContact || '',                           // 14. 最終連絡日時
    '',                                          // 15. 次回連絡予定日時
    appointmentDate || '',                       // 16. アポ予定日時
    '',                                          // 17. 訪問予定日時
    '',                                          // 18. 見積提出予定日
    JSON.stringify(historyJson),                 // 19. 連絡履歴JSON
    summary.trim(),                              // 20. 連絡履歴サマリー
    '[]',                                        // 21. リマインド設定JSON
    '[]',                                        // 22. 通知履歴JSON
    '',                                          // 23. AI生成SMS文
    '',                                          // 24. AI生成メール文
    memo,                                        // 25. 営業メモ
    '',                                          // 26. 社内メモ
    '',                                          // 27. 顧客反応スコア
    '',                                          // 28. 見積金額
    '',                                          // 29. 見積提出日時
    '',                                          // 30. 成約日時
    '',                                          // 31. 成約金額
    '',                                          // 32. 辞退理由
    '',                                          // 33. 辞退日時
    '',                                          // 34. キャンセル申請ID
    '',                                          // 35. 期限延長申請ID
    false                                        // 36. お断りメール送信済みフラグ
  ];

  // actualLastRowを使って正しい位置に挿入
  sheet.getRange(actualLastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  console.log(`  - 配信レコード: ${merchantId} (順位${rank}, ${detailStatus})`);
}

/**
 * テストデータを削除（クリーンアップ用）
 */
function deleteDeliveryTestData() {
  console.log('===== 配信管理テストデータ削除開始 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ユーザー登録シートのテストデータ削除
  const userSheet = ss.getSheetByName('ユーザー登録');
  if (userSheet) {
    const data = userSheet.getDataRange().getValues();
    const headers = data[0];
    const cvIdIdx = headers.indexOf('CV ID');
    const nameIdx = headers.indexOf('氏名');

    let deletedCount = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      const cvId = data[i][cvIdIdx];
      const name = data[i][nameIdx];
      if (cvId && (cvId.toString().startsWith('CVTEST') || (name && name.toString().startsWith('テスト')))) {
        userSheet.deleteRow(i + 1);
        deletedCount++;
        console.log(`  - ユーザー登録削除: ${name} (${cvId})`);
      }
    }
    console.log(`✅ ユーザー登録から${deletedCount}件削除`);
  }

  // 配信管理シートのテストデータ削除
  const deliverySheet = ss.getSheetByName('配信管理');
  if (deliverySheet) {
    const data = deliverySheet.getDataRange().getValues();
    const headers = data[0];
    const cvIdIdx = headers.indexOf('CV ID');

    let deletedCount = 0;
    for (let i = data.length - 1; i >= 1; i--) {
      const cvId = data[i][cvIdIdx];
      if (cvId && cvId.toString().startsWith('CVTEST')) {
        deliverySheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    console.log(`✅ 配信管理から${deletedCount}件削除`);
  }

  console.log('===== テストデータ削除完了 =====');
}
