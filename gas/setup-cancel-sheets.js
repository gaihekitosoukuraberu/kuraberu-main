/**
 * キャンセル申請システム用シート自動作成スクリプト
 * GASエディタから手動実行してください
 */

/**
 * キャンセル申請シートと期限延長申請シートを作成
 */
function setupCancelSheets() {
  console.log('===== キャンセル申請シート作成開始 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. キャンセル申請シート作成
  createCancelApplicationSheet(ss);

  // 2. キャンセル期限延長申請シート作成
  createDeadlineExtensionSheet(ss);

  console.log('===== 全シート作成完了 =====');
  Browser.msgBox('完了', 'キャンセル申請シートとキャンセル期限延長申請シートを作成しました。', Browser.Buttons.OK);
}

/**
 * キャンセル申請シート作成
 */
function createCancelApplicationSheet(ss) {
  const sheetName = 'キャンセル申請';

  // 既存シートがあれば削除確認
  let existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    const response = Browser.msgBox(
      '確認',
      `「${sheetName}」シートが既に存在します。削除して再作成しますか？\n※データが失われます`,
      Browser.Buttons.YES_NO
    );

    if (response === 'yes') {
      ss.deleteSheet(existingSheet);
      console.log(`[${sheetName}] 既存シート削除`);
    } else {
      console.log(`[${sheetName}] 作成スキップ`);
      return;
    }
  }

  // 新規シート作成
  const sheet = ss.insertSheet(sheetName);

  // ヘッダー行作成
  const headers = [
    'タイムスタンプ',           // 1: A
    '申請ID',                   // 2: B
    'CV ID',                    // 3: C
    '顧客名',                   // 4: D
    '電話番号',                 // 5: E
    '住所',                     // 6: F
    '加盟店ID',                 // 7: G
    '加盟店名',                 // 8: H
    '申請担当者',               // 9: I
    '配信日時',                 // 10: J
    '経過日数',                 // 11: K
    '申請期限',                 // 12: L
    '期限内フラグ',             // 13: M
    '期限延長申請ID',           // 14: N
    '延長後期限',               // 15: O
    'キャンセル理由カテゴリ',   // 16: P
    'キャンセル理由詳細',       // 17: Q
    '追加情報1',                // 18: R
    '追加情報2',                // 19: S
    '追加情報3',                // 20: T
    '追加情報4',                // 21: U
    '追加情報5',                // 22: V
    '理由データJSON',           // 23: W
    '電話回数',                 // 24: X
    'SMS回数',                  // 25: Y
    '最終連絡日時',             // 26: Z
    '電話繋がった日時',         // 27: AA
    '他社業者名',               // 28: AB
    '契約時期',                 // 29: AC
    '温度感',                   // 30: AD
    'クレーム内容',             // 31: AE
    'その他詳細',               // 32: AF
    'キャンセル申請文',         // 33: AG
    '承認ステータス',           // 34: AH
    '承認者',                   // 35: AI
    '承認日時',                 // 36: AJ
    '却下理由',                 // 37: AK
    '自動不成約追加済',         // 38: AL
    '最終更新日時'              // 39: AM
  ];

  // ヘッダー設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // ヘッダーのスタイル設定
  headerRange.setBackground('#4A90E2');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 列幅調整
  sheet.setColumnWidth(1, 150);  // タイムスタンプ
  sheet.setColumnWidth(2, 120);  // 申請ID
  sheet.setColumnWidth(3, 120);  // CV ID
  sheet.setColumnWidth(4, 120);  // 顧客名
  sheet.setColumnWidth(5, 120);  // 電話番号
  sheet.setColumnWidth(6, 200);  // 住所
  sheet.setColumnWidth(7, 100);  // 加盟店ID
  sheet.setColumnWidth(8, 150);  // 加盟店名
  sheet.setColumnWidth(9, 100);  // 申請担当者
  sheet.setColumnWidth(10, 150); // 配信日時
  sheet.setColumnWidth(11, 80);  // 経過日数
  sheet.setColumnWidth(12, 150); // 申請期限
  sheet.setColumnWidth(13, 100); // 期限内フラグ
  sheet.setColumnWidth(14, 120); // 期限延長申請ID
  sheet.setColumnWidth(15, 150); // 延長後期限
  sheet.setColumnWidth(16, 180); // キャンセル理由カテゴリ
  sheet.setColumnWidth(17, 180); // キャンセル理由詳細
  sheet.setColumnWidth(18, 150); // 追加情報1
  sheet.setColumnWidth(19, 150); // 追加情報2
  sheet.setColumnWidth(20, 150); // 追加情報3
  sheet.setColumnWidth(21, 150); // 追加情報4
  sheet.setColumnWidth(22, 150); // 追加情報5
  sheet.setColumnWidth(23, 250); // 理由データJSON
  sheet.setColumnWidth(24, 80);  // 電話回数
  sheet.setColumnWidth(25, 80);  // SMS回数
  sheet.setColumnWidth(26, 150); // 最終連絡日時
  sheet.setColumnWidth(27, 150); // 電話繋がった日時
  sheet.setColumnWidth(28, 150); // 他社業者名
  sheet.setColumnWidth(29, 150); // 契約時期
  sheet.setColumnWidth(30, 100); // 温度感
  sheet.setColumnWidth(31, 200); // クレーム内容
  sheet.setColumnWidth(32, 200); // その他詳細
  sheet.setColumnWidth(33, 300); // キャンセル申請文
  sheet.setColumnWidth(34, 120); // 承認ステータス
  sheet.setColumnWidth(35, 100); // 承認者
  sheet.setColumnWidth(36, 150); // 承認日時
  sheet.setColumnWidth(37, 200); // 却下理由
  sheet.setColumnWidth(38, 120); // 自動不成約追加済
  sheet.setColumnWidth(39, 150); // 最終更新日時

  // フリーズ（ヘッダー行固定）
  sheet.setFrozenRows(1);

  console.log(`[${sheetName}] シート作成完了（${headers.length}列）`);
}

/**
 * キャンセル期限延長申請シート作成
 */
function createDeadlineExtensionSheet(ss) {
  const sheetName = 'キャンセル期限延長申請';

  // 既存シートがあれば削除確認
  let existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    const response = Browser.msgBox(
      '確認',
      `「${sheetName}」シートが既に存在します。削除して再作成しますか？\n※データが失われます`,
      Browser.Buttons.YES_NO
    );

    if (response === 'yes') {
      ss.deleteSheet(existingSheet);
      console.log(`[${sheetName}] 既存シート削除`);
    } else {
      console.log(`[${sheetName}] 作成スキップ`);
      return;
    }
  }

  // 新規シート作成
  const sheet = ss.insertSheet(sheetName);

  // ヘッダー行作成
  const headers = [
    'タイムスタンプ',           // 1: A
    '申請ID',                   // 2: B
    'CV ID',                    // 3: C
    '顧客名',                   // 4: D
    '電話番号',                 // 5: E
    '住所',                     // 6: F
    '加盟店ID',                 // 7: G
    '加盟店名',                 // 8: H
    '申請担当者',               // 9: I
    '配信日時',                 // 10: J
    '経過日数',                 // 11: K
    '申請期限',                 // 12: L
    '期限内フラグ',             // 13: M
    '連絡がついた日時',         // 14: N
    'アポ予定日',               // 15: O
    '延長理由',                 // 16: P
    '延長後期限',               // 17: Q
    '承認ステータス',           // 18: R
    '承認者',                   // 19: S
    '承認日時',                 // 20: T
    '却下理由',                 // 21: U
    '最終更新日時'              // 22: V
  ];

  // ヘッダー設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // ヘッダーのスタイル設定
  headerRange.setBackground('#E27D60');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 列幅調整
  sheet.setColumnWidth(1, 150);  // タイムスタンプ
  sheet.setColumnWidth(2, 120);  // 申請ID
  sheet.setColumnWidth(3, 120);  // CV ID
  sheet.setColumnWidth(4, 120);  // 顧客名
  sheet.setColumnWidth(5, 120);  // 電話番号
  sheet.setColumnWidth(6, 200);  // 住所
  sheet.setColumnWidth(7, 100);  // 加盟店ID
  sheet.setColumnWidth(8, 150);  // 加盟店名
  sheet.setColumnWidth(9, 100);  // 申請担当者
  sheet.setColumnWidth(10, 150); // 配信日時
  sheet.setColumnWidth(11, 80);  // 経過日数
  sheet.setColumnWidth(12, 150); // 申請期限
  sheet.setColumnWidth(13, 100); // 期限内フラグ
  sheet.setColumnWidth(14, 150); // 連絡がついた日時
  sheet.setColumnWidth(15, 120); // アポ予定日
  sheet.setColumnWidth(16, 250); // 延長理由
  sheet.setColumnWidth(17, 150); // 延長後期限
  sheet.setColumnWidth(18, 120); // 承認ステータス
  sheet.setColumnWidth(19, 100); // 承認者
  sheet.setColumnWidth(20, 150); // 承認日時
  sheet.setColumnWidth(21, 200); // 却下理由
  sheet.setColumnWidth(22, 150); // 最終更新日時

  // フリーズ（ヘッダー行固定）
  sheet.setFrozenRows(1);

  console.log(`[${sheetName}] シート作成完了（${headers.length}列）`);
}

/**
 * テスト用：シート構造確認
 */
function verifyCancelSheets() {
  console.log('===== シート構造確認 =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // キャンセル申請シート確認
  const cancelSheet = ss.getSheetByName('キャンセル申請');
  if (cancelSheet) {
    const headers = cancelSheet.getRange(1, 1, 1, cancelSheet.getLastColumn()).getValues()[0];
    console.log('[キャンセル申請] カラム数:', headers.length);
    console.log('[キャンセル申請] ヘッダー:', headers.join(', '));
  } else {
    console.log('[キャンセル申請] シートが見つかりません');
  }

  // キャンセル期限延長申請シート確認
  const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
  if (extensionSheet) {
    const headers = extensionSheet.getRange(1, 1, 1, extensionSheet.getLastColumn()).getValues()[0];
    console.log('[キャンセル期限延長申請] カラム数:', headers.length);
    console.log('[キャンセル期限延長申請] ヘッダー:', headers.join(', '));
  } else {
    console.log('[キャンセル期限延長申請] シートが見つかりません');
  }

  console.log('===== 確認完了 =====');
}
