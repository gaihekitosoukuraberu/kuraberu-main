/**
 * 配信管理シート診断スクリプト
 *
 * 実行方法: GASエディタで debugDeliverySheet() を実行
 */

function debugDeliverySheet() {
  console.log('===== 配信管理シート診断開始 =====\n');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 全シート名を確認
  console.log('【1. スプレッドシート内の全シート名】');
  const sheets = ss.getSheets();
  sheets.forEach((sheet, index) => {
    console.log(`  ${index + 1}. "${sheet.getName()}"`);
  });
  console.log('');

  // 2. 配信管理シートの存在確認
  console.log('【2. 配信管理シートの確認】');
  const deliverySheet = ss.getSheetByName('配信管理');
  if (deliverySheet) {
    console.log('✅ 配信管理シートが見つかりました');
    console.log('  - 行数:', deliverySheet.getLastRow());
    console.log('  - 列数:', deliverySheet.getLastColumn());

    if (deliverySheet.getLastRow() > 0) {
      const headers = deliverySheet.getRange(1, 1, 1, deliverySheet.getLastColumn()).getValues()[0];
      console.log('  - ヘッダー数:', headers.length);
      console.log('  - 最初の5カラム:', headers.slice(0, 5).join(', '));
    }
  } else {
    console.log('❌ 配信管理シートが見つかりません');
    console.log('→ setupCVDeliverySheet() を実行してください');
  }
  console.log('');

  // 3. ユーザー登録シートの確認
  console.log('【3. ユーザー登録シートの確認】');
  const userSheet = ss.getSheetByName('ユーザー登録');
  if (userSheet) {
    console.log('✅ ユーザー登録シートが見つかりました');
    console.log('  - 行数:', userSheet.getLastRow());

    // テストデータの確認
    if (userSheet.getLastRow() > 1) {
      const data = userSheet.getDataRange().getValues();
      const headers = data[0];
      const cvIdIdx = headers.indexOf('CV ID');
      const nameIdx = headers.indexOf('氏名');

      let testCount = 0;
      for (let i = 1; i < data.length; i++) {
        if (data[i][cvIdIdx] && data[i][cvIdIdx].toString().startsWith('CVTEST')) {
          testCount++;
          if (testCount <= 3) {
            console.log(`  - テストCV: ${data[i][nameIdx]} (${data[i][cvIdIdx]})`);
          }
        }
      }
      console.log(`  - テストデータ件数: ${testCount}件`);
    }
  } else {
    console.log('❌ ユーザー登録シートが見つかりません');
  }
  console.log('');

  // 4. 関数の存在確認
  console.log('【4. 関数の存在確認】');
  try {
    console.log('  - createCVDeliveryRecord:', typeof createCVDeliveryRecord === 'function' ? '✅ 存在' : '❌ なし');
    console.log('  - addDeliveryRecordForTest:', typeof addDeliveryRecordForTest === 'function' ? '✅ 存在' : '❌ なし');
    console.log('  - createCVDeliveryTestData:', typeof createCVDeliveryTestData === 'function' ? '✅ 存在' : '❌ なし');
    console.log('  - deleteDeliveryTestData:', typeof deleteDeliveryTestData === 'function' ? '✅ 存在' : '❌ なし');
  } catch (e) {
    console.error('関数チェックエラー:', e);
  }
  console.log('');

  console.log('===== 診断完了 =====');
}

/**
 * 超シンプルなテストレコード作成（1件のみ）
 */
function createSingleTestRecord() {
  console.log('===== シンプルテストレコード作成 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('配信管理');

  if (!sheet) {
    console.error('❌ 配信管理シートが見つかりません');
    return;
  }

  const now = new Date();
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const testRow = [
    'DL_TEST_001',                  // 1. レコードID
    'CVTEST_SIMPLE',                // 2. CV ID
    'FR251112004600',               // 3. 加盟店ID
    sixDaysAgo,                     // 4. 配信日時
    1,                              // 5. 配信順位
    '配信済み',                     // 6. 配信ステータス
    'アポ確定',                     // 7. 詳細ステータス
    now,                            // 8. ステータス更新日時
    now,                            // 9. 最終更新日時
    3,                              // 10. 電話回数
    2,                              // 11. SMS回数
    0,                              // 12. メール送信回数
    0,                              // 13. 訪問回数
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 14. 最終連絡日時
    '',                             // 15. 次回連絡予定日時
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 16. アポ予定日時
    '',                             // 17. 訪問予定日時
    '',                             // 18. 見積提出予定日
    '[]',                           // 19. 連絡履歴JSON
    'テスト',                       // 20. 連絡履歴サマリー
    '[]',                           // 21. リマインド設定JSON
    '[]',                           // 22. 通知履歴JSON
    '',                             // 23. AI生成SMS文
    '',                             // 24. AI生成メール文
    'テストメモ',                   // 25. 営業メモ
    '',                             // 26. 社内メモ
    '',                             // 27. 顧客反応スコア
    '',                             // 28. 見積金額
    '',                             // 29. 見積提出日時
    '',                             // 30. 成約日時
    '',                             // 31. 成約金額
    '',                             // 32. 辞退理由
    '',                             // 33. 辞退日時
    '',                             // 34. キャンセル申請ID
    '',                             // 35. 期限延長申請ID
    false                           // 36. お断りメール送信済みフラグ
  ];

  try {
    const lastRow = sheet.getLastRow();
    console.log('現在の行数:', lastRow);

    sheet.getRange(lastRow + 1, 1, 1, testRow.length).setValues([testRow]);

    console.log('✅ テストレコードを追加しました');
    console.log('  - 行番号:', lastRow + 1);
    console.log('  - CV ID: CVTEST_SIMPLE');
    console.log('  - 加盟店ID: FR251112004600');
    console.log('  - 配信順位: 1 (青色になるはず)');
    console.log('  - 詳細ステータス: アポ確定');
    console.log('  - 電話回数: 3');

    console.log('\n配信管理シートを開いて確認してください！');

  } catch (e) {
    console.error('❌ エラー:', e);
    console.error('スタックトレース:', e.stack);
  }
}
