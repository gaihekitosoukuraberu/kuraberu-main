/**
 * デバッグ: 全シート名を表示
 */
function debugListSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const name = sheet.getName();
    const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
    console.log(`シート: "${name}" | G列ヘッダー: "${headers[6]}"`);
  });
}

/**
 * 配信管理シートのG列（詳細ステータス）の入力規則を更新
 * 新しいステータス選択肢に変更
 */
function updateDetailStatusValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  // V2212: 最新の詳細ステータス選択肢（StatusDefinitionsと同期）
  const newStatuses = [
    // 追客中
    '新着',
    '未アポ',
    'アポ済',
    '現調済',
    '見積提出済',
    // 成約済（入金×工事の組み合わせ）
    '入金予定・未着工',
    '入金予定・施工中',
    '入金予定・工事済',
    '入金済・未着工',
    '入金済・施工中',
    '完了',
    // 終了（失注・キャンセル）
    '現調前キャンセル',
    '現調後失注',
    '他社契約済',
    '別加盟店契約済',
    '顧客クレーム'
  ];

  // 入力規則を作成
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(newStatuses, true)
    .setAllowInvalid(false)
    .build();

  let updatedCount = 0;

  // 全シートをチェック
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();

    // ヘッダーを確認してG列が「詳細ステータス」かチェック
    const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
    const gColHeader = headers[6]; // G列 = index 6

    if (gColHeader !== '詳細ステータス') {
      return;
    }

    console.log(`[${sheetName}] 対象シート検出！G列: ${gColHeader}`);

    // データがある行数を取得
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.log(`[${sheetName}] データ行なし、スキップ`);
      return;
    }

    // G列（詳細ステータス）に入力規則を適用
    const range = sheet.getRange(2, 7, lastRow - 1, 1); // G2から最終行まで
    range.setDataValidation(rule);

    console.log(`[${sheetName}] G列の入力規則を更新しました（${lastRow - 1}行）`);
    updatedCount++;
  });

  console.log(`完了: ${updatedCount}シートの詳細ステータス入力規則を更新しました`);
  return { success: true, updatedSheets: updatedCount };
}

/**
 * 既存データのステータスを新しい名前にマイグレーション
 */
function migrateDetailStatusValues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  // 旧ステータス → 新ステータスのマッピング
  const statusMapping = {
    '未対応': '新着',
    '不在': '未アポ',
    '架電済/未アポ': '未アポ',
    '再訪問': 'アポ済',
    '検討中': '見積提出済み',
    '入金完了': '入金済',
    '工事完了': '入金済',
    '失注': '現調後失注',
    'キャンセル': '現調前キャンセル'
  };

  let totalUpdated = 0;

  sheets.forEach(sheet => {
    const sheetName = sheet.getName();

    // ヘッダー確認（G列が「詳細ステータス」のシートのみ対象）
    const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
    if (headers[6] !== '詳細ステータス') {
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // G列のデータを取得
    const range = sheet.getRange(2, 7, lastRow - 1, 1);
    const values = range.getValues();
    let sheetUpdated = 0;

    // マッピングに従って変換
    const newValues = values.map(row => {
      const oldValue = row[0];
      if (statusMapping[oldValue]) {
        sheetUpdated++;
        return [statusMapping[oldValue]];
      }
      return row;
    });

    if (sheetUpdated > 0) {
      range.setValues(newValues);
      console.log(`[${sheetName}] ${sheetUpdated}件のステータスをマイグレーション`);
      totalUpdated += sheetUpdated;
    }
  });

  console.log(`完了: 合計${totalUpdated}件のステータスをマイグレーションしました`);
  return { success: true, totalUpdated: totalUpdated };
}

/**
 * 両方実行（入力規則削除 + データマイグレーション）
 */
function updateAllDetailStatus() {
  console.log('=== 詳細ステータス更新開始 ===');

  // 1. まず入力規則を削除（自由入力に）
  console.log('--- 入力規則の削除 ---');
  const removeResult = removeDetailStatusValidation();

  // 2. 既存データをマイグレーション
  console.log('--- ステータス値のマイグレーション ---');
  const migrateResult = migrateDetailStatusValues();

  console.log('=== 完了 ===');
  return {
    removeValidation: removeResult,
    migration: migrateResult
  };
}

/**
 * G列の入力規則を削除
 */
function removeDetailStatusValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let updatedCount = 0;

  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];

    if (headers[6] !== '詳細ステータス') {
      return;
    }

    console.log(`[${sheetName}] 入力規則を削除中...`);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    // G列の入力規則を削除
    const range = sheet.getRange(2, 7, lastRow - 1, 1);
    range.clearDataValidations();

    console.log(`[${sheetName}] G列の入力規則を削除しました`);
    updatedCount++;
  });

  console.log(`完了: ${updatedCount}シートの入力規則を削除`);
  return { success: true, updatedSheets: updatedCount };
}
