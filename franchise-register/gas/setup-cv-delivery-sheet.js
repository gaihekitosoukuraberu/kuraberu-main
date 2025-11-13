/**
 * 配信管理シート セットアップスクリプト
 *
 * 実行方法: GASエディタで setupCVDeliverySheet() を実行
 *
 * 【機能】
 * - 配信管理シートを自動作成
 * - 36カラムのヘッダー設定
 * - データバリデーション設定
 * - 条件付き書式設定（配信順位の色分け）
 */

function setupCVDeliverySheet() {
  console.log('===== 配信管理シート セットアップ開始 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = '配信管理';

  // 既存シートの確認
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    console.log('⚠️  既存の配信管理シートが見つかりました');
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '配信管理シートが既に存在します',
      '削除して新規作成しますか？\n（既存データは失われます）',
      ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
      ss.deleteSheet(sheet);
      console.log('既存シートを削除しました');
    } else {
      console.log('セットアップをキャンセルしました');
      return;
    }
  }

  // 新規シート作成
  sheet = ss.insertSheet(sheetName);
  console.log('✅ 配信管理シートを作成しました');

  // ヘッダー行の定義（36カラム）
  const headers = [
    // A. 基本情報 (1-5)
    'レコードID',
    'CV ID',
    '加盟店ID',
    '配信日時',
    '配信順位',

    // B. ステータス管理 (6-9)
    '配信ステータス',
    '詳細ステータス',
    'ステータス更新日時',
    '最終更新日時',

    // C. 追客カウンター (10-14)
    '電話回数',
    'SMS回数',
    'メール送信回数',
    '訪問回数',
    '最終連絡日時',

    // D. スケジュール管理 (15-18)
    '次回連絡予定日時',
    'アポ予定日時',
    '訪問予定日時',
    '見積提出予定日',

    // E. 連絡履歴詳細 (19-20)
    '連絡履歴JSON',
    '連絡履歴サマリー',

    // F. リマインド・通知 (21-22)
    'リマインド設定JSON',
    '通知履歴JSON',

    // G. AI生成コンテンツ (23-24)
    'AI生成SMS文',
    'AI生成メール文',

    // H. メモ・コメント (25-27)
    '営業メモ',
    '社内メモ',
    '顧客反応スコア',

    // I. 成約・見積情報 (28-31)
    '見積金額',
    '見積提出日時',
    '成約日時',
    '成約金額',

    // J. 辞退・キャンセル関連 (32-35)
    '辞退理由',
    '辞退日時',
    'キャンセル申請ID',
    '期限延長申請ID',

    // K. 自動化管理 (36)
    'お断りメール送信済みフラグ'
  ];

  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダー行の書式設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285F4');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  headerRange.setWrap(true);

  console.log('✅ ヘッダー行を設定しました（' + headers.length + 'カラム）');

  // カラム幅の調整
  sheet.setColumnWidth(1, 150);  // レコードID
  sheet.setColumnWidth(2, 120);  // CV ID
  sheet.setColumnWidth(3, 120);  // 加盟店ID
  sheet.setColumnWidth(4, 150);  // 配信日時
  sheet.setColumnWidth(5, 80);   // 配信順位
  sheet.setColumnWidth(6, 120);  // 配信ステータス
  sheet.setColumnWidth(7, 120);  // 詳細ステータス
  sheet.setColumnWidth(8, 150);  // ステータス更新日時
  sheet.setColumnWidth(9, 150);  // 最終更新日時
  sheet.setColumnWidth(10, 80);  // 電話回数
  sheet.setColumnWidth(11, 80);  // SMS回数
  sheet.setColumnWidth(12, 100); // メール送信回数
  sheet.setColumnWidth(13, 80);  // 訪問回数
  sheet.setColumnWidth(14, 150); // 最終連絡日時
  sheet.setColumnWidth(15, 150); // 次回連絡予定日時
  sheet.setColumnWidth(16, 150); // アポ予定日時
  sheet.setColumnWidth(17, 150); // 訪問予定日時
  sheet.setColumnWidth(18, 120); // 見積提出予定日
  sheet.setColumnWidth(19, 200); // 連絡履歴JSON
  sheet.setColumnWidth(20, 200); // 連絡履歴サマリー
  sheet.setColumnWidth(21, 200); // リマインド設定JSON
  sheet.setColumnWidth(22, 200); // 通知履歴JSON
  sheet.setColumnWidth(23, 200); // AI生成SMS文
  sheet.setColumnWidth(24, 200); // AI生成メール文
  sheet.setColumnWidth(25, 200); // 営業メモ
  sheet.setColumnWidth(26, 200); // 社内メモ
  sheet.setColumnWidth(27, 80);  // 顧客反応スコア
  sheet.setColumnWidth(28, 100); // 見積金額
  sheet.setColumnWidth(29, 150); // 見積提出日時
  sheet.setColumnWidth(30, 150); // 成約日時
  sheet.setColumnWidth(31, 100); // 成約金額
  sheet.setColumnWidth(32, 150); // 辞退理由
  sheet.setColumnWidth(33, 150); // 辞退日時
  sheet.setColumnWidth(34, 150); // キャンセル申請ID
  sheet.setColumnWidth(35, 150); // 期限延長申請ID
  sheet.setColumnWidth(36, 120); // お断りメール送信済みフラグ

  console.log('✅ カラム幅を調整しました');

  // データバリデーション設定

  // 配信順位（1-4）
  const rankRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 4)
    .setAllowInvalid(false)
    .setHelpText('1-4の数値を入力してください')
    .build();
  sheet.getRange('E2:E').setDataValidation(rankRule);

  // 配信ステータス
  const deliveryStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['配信済み', '辞退', '成約', 'キャンセル承認済み'])
    .setAllowInvalid(false)
    .build();
  sheet.getRange('F2:F').setDataValidation(deliveryStatusRule);

  // 詳細ステータス
  const detailStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      '未対応',
      '追客中',
      'アポ確定',
      '訪問済み',
      '見積提出済み',
      '検討中',
      '成約',
      '辞退',
      'キャンセル'
    ])
    .setAllowInvalid(false)
    .build();
  sheet.getRange('G2:G').setDataValidation(detailStatusRule);

  // 顧客反応スコア（1-5）
  const scoreRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 5)
    .setAllowInvalid(false)
    .setHelpText('1-5の数値を入力してください（1:低 5:高）')
    .build();
  sheet.getRange('AA2:AA').setDataValidation(scoreRule);

  // お断りメール送信済みフラグ（TRUE/FALSE）
  const booleanRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .build();
  sheet.getRange('AJ2:AJ').setDataValidation(booleanRule);

  console.log('✅ データバリデーションを設定しました');

  // 条件付き書式設定（配信順位の色分け）

  // 1位: 青
  const rule1 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2=1')
    .setBackground('#C9DAF8')
    .setRanges([sheet.getRange('A2:AJ')])
    .build();

  // 2位: 黄
  const rule2 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2=2')
    .setBackground('#FFF2CC')
    .setRanges([sheet.getRange('A2:AJ')])
    .build();

  // 3位: オレンジ
  const rule3 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2=3')
    .setBackground('#FCE5CD')
    .setRanges([sheet.getRange('A2:AJ')])
    .build();

  // 4位: 灰色
  const rule4 = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2=4')
    .setBackground('#EFEFEF')
    .setRanges([sheet.getRange('A2:AJ')])
    .build();

  const rules = [rule1, rule2, rule3, rule4];
  sheet.setConditionalFormatRules(rules);

  console.log('✅ 条件付き書式を設定しました（配信順位で色分け）');

  // 行の固定（ヘッダー行）
  sheet.setFrozenRows(1);
  console.log('✅ ヘッダー行を固定しました');

  console.log('\n===== セットアップ完了 =====');
  console.log('シート名: ' + sheetName);
  console.log('カラム数: ' + headers.length);
  console.log('\n【次のステップ】');
  console.log('1. テストデータを作成: createCVDeliveryTestData()');
  console.log('2. キャンセル申請システムを修正して他社状況チェック機能を追加');
}

/**
 * レコードID生成関数
 * DL + YYMMDDHHmmss + 連番3桁
 */
function generateRecordId() {
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyMMddHHmmss');

  // 同じタイムスタンプの連番を取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('配信管理');

  if (!sheet) {
    return 'DL' + timestamp + '001';
  }

  const data = sheet.getDataRange().getValues();
  const records = data.slice(1); // ヘッダー除く

  let maxSeq = 0;
  const prefix = 'DL' + timestamp;

  for (let i = 0; i < records.length; i++) {
    const recordId = records[i][0];
    if (recordId && recordId.toString().startsWith(prefix)) {
      const seq = parseInt(recordId.toString().substr(prefix.length));
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return prefix + nextSeq;
}

/**
 * CV配信レコード作成関数
 * @param {Object} params - {cvId, merchantId, deliveredAt, rank}
 * @return {String} - 作成されたレコードID
 */
function createCVDeliveryRecord(params) {
  const {
    cvId,
    merchantId,
    deliveredAt,
    rank
  } = params;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('配信管理');

  if (!sheet) {
    throw new Error('配信管理シートが見つかりません');
  }

  const recordId = generateRecordId();
  const now = new Date();

  const newRow = [
    recordId,                    // 1. レコードID
    cvId,                        // 2. CV ID
    merchantId,                  // 3. 加盟店ID
    deliveredAt,                 // 4. 配信日時
    rank,                        // 5. 配信順位
    '配信済み',                  // 6. 配信ステータス
    '未対応',                    // 7. 詳細ステータス
    now,                         // 8. ステータス更新日時
    now,                         // 9. 最終更新日時
    0,                           // 10. 電話回数
    0,                           // 11. SMS回数
    0,                           // 12. メール送信回数
    0,                           // 13. 訪問回数
    '',                          // 14. 最終連絡日時
    '',                          // 15. 次回連絡予定日時
    '',                          // 16. アポ予定日時
    '',                          // 17. 訪問予定日時
    '',                          // 18. 見積提出予定日
    '[]',                        // 19. 連絡履歴JSON
    '',                          // 20. 連絡履歴サマリー
    '[]',                        // 21. リマインド設定JSON
    '[]',                        // 22. 通知履歴JSON
    '',                          // 23. AI生成SMS文
    '',                          // 24. AI生成メール文
    '',                          // 25. 営業メモ
    '',                          // 26. 社内メモ
    '',                          // 27. 顧客反応スコア
    '',                          // 28. 見積金額
    '',                          // 29. 見積提出日時
    '',                          // 30. 成約日時
    '',                          // 31. 成約金額
    '',                          // 32. 辞退理由
    '',                          // 33. 辞退日時
    '',                          // 34. キャンセル申請ID
    '',                          // 35. 期限延長申請ID
    false                        // 36. お断りメール送信済みフラグ
  ];

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  console.log('✅ CV配信レコードを作成: ' + recordId);
  return recordId;
}
