/**
 * V2002: ユーザー登録シートの「配信ステータス」列の入力規則を更新
 * 「配信中」を追加
 *
 * 実行方法: GASエディタで fixDeliveryStatusValidation() を実行
 */

function fixDeliveryStatusValidation() {
  console.log('===== 配信ステータス入力規則修正 開始 =====');

  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!userSheet) {
    console.error('ユーザー登録シートが見つかりません');
    return;
  }

  // ヘッダー行を取得
  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
  const deliveryStatusIdx = headers.indexOf('配信ステータス');

  if (deliveryStatusIdx === -1) {
    console.error('配信ステータス列が見つかりません');
    return;
  }

  console.log('配信ステータス列インデックス:', deliveryStatusIdx + 1, '列目');

  // 新しい入力規則を作成（配信中を追加）
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['配信中', '配信済み', '成約', '失注', 'キャンセル承認済み'], true)
    .setAllowInvalid(false)
    .setHelpText('配信中, 配信済み, 成約, 失注, キャンセル承認済み のいずれかを選択')
    .build();

  // 2行目以降の配信ステータス列に入力規則を設定
  const lastRow = Math.max(userSheet.getLastRow(), 2);
  const range = userSheet.getRange(2, deliveryStatusIdx + 1, lastRow - 1, 1);
  range.setDataValidation(rule);

  console.log('✅ 配信ステータス列の入力規則を更新しました');
  console.log('   許可値: 配信中, 配信済み, 成約, 失注, キャンセル承認済み');
  console.log('===== 完了 =====');
}
