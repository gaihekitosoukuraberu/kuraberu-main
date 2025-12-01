/**
 * V2038: F列（6列目）のデータ入力規則を直接修正
 * エラー: セル F28 に入力したデータは、このセルで設定しているデータの入力規則に違反しています
 *
 * 実行方法: GASエディタで fixColumnF() を実行
 */

/**
 * 配信管理シートのF列を確認・修正
 */
function fixColumnF() {
  console.log('===== 配信管理シートF列 入力規則修正 V2038 開始 =====');

  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 配信管理シートを確認
  const deliverySheet = ss.getSheetByName('配信管理');
  if (deliverySheet) {
    console.log('--- 配信管理シート ---');
    const headers = deliverySheet.getRange(1, 1, 1, 10).getValues()[0];
    console.log('配信管理シート ヘッダー(A-J):', headers);

    const fHeader = deliverySheet.getRange(1, 6).getValue();
    console.log('配信管理シート F列ヘッダー:', fHeader);

    const existingRule = deliverySheet.getRange(2, 6).getDataValidation();
    if (existingRule) {
      const criteria = existingRule.getCriteriaType();
      const args = existingRule.getCriteriaValues();
      console.log('配信管理シート F列 既存規則:', criteria.toString(), JSON.stringify(args));

      // 配信ステータスの入力規則を更新
      const allowedValues = ['配信済み', '配信済', '成約', '失注', 'キャンセル承認済み', '未対応', '対応中', '商談中'];
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(allowedValues, true)
        .setAllowInvalid(true)  // 無効な値も許可（エラー回避）
        .build();

      const lastRow = Math.max(deliverySheet.getLastRow(), 2);
      deliverySheet.getRange(2, 6, lastRow - 1, 1).setDataValidation(rule);
      console.log('✅ 配信管理シート F列の入力規則を更新');
    } else {
      console.log('配信管理シート F列に入力規則なし');
    }
  }

  // ユーザー登録シートも確認
  const userSheet = ss.getSheetByName('ユーザー登録');
  if (userSheet) {
    console.log('--- ユーザー登録シート ---');
    const headers = userSheet.getRange(1, 1, 1, 10).getValues()[0];
    console.log('ユーザー登録シート ヘッダー(A-J):', headers);
  }

  console.log('===== 完了 =====');
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
