/**
 * ユーザー登録シートのF列（年齢）の入力規則を削除（元に戻す）
 */
function restoreUserSheetColumnF() {
  console.log('===== ユーザー登録シート F列 復元 =====');

  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('ユーザー登録');

  if (!sheet) {
    console.error('ユーザー登録シートが見つかりません');
    return;
  }

  const fHeader = sheet.getRange(1, 6).getValue();
  console.log('F列ヘッダー:', fHeader);

  // F列の入力規則を削除
  const lastRow = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, 6, lastRow - 1, 1).clearDataValidations();

  console.log('✅ ユーザー登録シート F列の入力規則を削除しました');
}

/**
 * V2038: 配信管理シートのF列（配信ステータス）の入力規則を修正
 * 実行: GASエディタで fixDeliverySheetColumnF() を実行
 */
function fixDeliverySheetColumnF() {
  console.log('===== 配信管理シート F列 修正 =====');

  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('配信管理');

  if (!sheet) {
    console.error('配信管理シートが見つかりません');
    return;
  }

  // F列ヘッダー確認
  const fHeader = sheet.getRange(1, 6).getValue();
  console.log('F列ヘッダー:', fHeader);

  // 既存規則確認
  const existingRule = sheet.getRange(2, 6).getDataValidation();
  if (existingRule) {
    console.log('既存規則:', existingRule.getCriteriaValues());
  }

  // 新しい入力規則（配信済みを追加）
  const allowedValues = ['配信済み', '成約', '失注', 'キャンセル承認済み'];
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedValues, true)
    .setAllowInvalid(true)
    .build();

  const lastRow = Math.max(sheet.getLastRow(), 2);
  sheet.getRange(2, 6, lastRow - 1, 1).setDataValidation(rule);

  console.log('✅ 完了 許可値:', allowedValues.join(', '));
}

/**
 * V2037: ユーザー登録シートの「管理ステータス」列と「配信ステータス」列の入力規則を更新
 */
function fixDeliveryStatusValidation() {
  console.log('===== ステータス入力規則修正 V2037 開始 =====');

  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!userSheet) {
    console.error('ユーザー登録シートが見つかりません');
    return;
  }

  // ヘッダー行を取得
  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];

  // V2037: 統一された許可値リスト
  const allowedValues = ['新規', '配信中', '配信済み', '成約', '失注', 'キャンセル承認済み'];

  // 新しい入力規則を作成
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedValues, true)
    .setAllowInvalid(false)
    .setHelpText(allowedValues.join(', ') + ' のいずれかを選択')
    .build();

  const lastRow = Math.max(userSheet.getLastRow(), 2);

  // 1. F列（6列目）を直接更新
  console.log('F列（6列目）のヘッダー:', headers[5]);
  const fRange = userSheet.getRange(2, 6, lastRow - 1, 1);
  fRange.setDataValidation(rule);
  console.log('✅ F列（6列目）の入力規則を更新');

  // 2. 管理ステータス列を更新（F列と別の場合）
  const managementStatusIdx = headers.indexOf('管理ステータス');
  if (managementStatusIdx !== -1 && managementStatusIdx !== 5) {
    console.log('管理ステータス列:', managementStatusIdx + 1, '列目');
    const mgmtRange = userSheet.getRange(2, managementStatusIdx + 1, lastRow - 1, 1);
    mgmtRange.setDataValidation(rule);
    console.log('✅ 管理ステータス列の入力規則を更新');
  }

  // 3. 配信ステータス列も更新
  const deliveryStatusIdx = headers.indexOf('配信ステータス');
  if (deliveryStatusIdx !== -1) {
    console.log('配信ステータス列:', deliveryStatusIdx + 1, '列目');
    const deliveryRange = userSheet.getRange(2, deliveryStatusIdx + 1, lastRow - 1, 1);
    deliveryRange.setDataValidation(rule);
    console.log('✅ 配信ステータス列の入力規則を更新');
  }

  console.log('許可値:', allowedValues.join(', '));
  console.log('===== 完了 =====');
}
