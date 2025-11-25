/**
 * スプレッドシートユーティリティ
 */

/**
 * スプレッドシートIDを取得（なければ作成）
 * @return {string} スプレッドシートID
 */
function getOrCreateSpreadsheetId() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    // スプレッドシートIDが設定されていない場合はエラー
    throw new Error('スプレッドシートIDが設定されていません。スクリプトプロパティにSPREADSHEET_IDを設定してください。');
  }

  return spreadsheetId;
}

/**
 * 加盟店登録シートを取得（なければ作成）
 * @return {Sheet} シートオブジェクト
 */
function getFranchiseSheet() {
  const spreadsheetId = getOrCreateSpreadsheetId();
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  let sheet = spreadsheet.getSheetByName('加盟店登録');

  if (!sheet) {
    sheet = createFranchiseSheet(spreadsheet);
  } else {
    // 既存シートのヘッダーを確認
    const currentHeaders = sheet.getRange(1, 1, 1, 36).getValues()[0];
    const expectedHeaders = getFranchiseHeaders();

    // ヘッダーが一致しない場合は警告
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (currentHeaders[i] !== expectedHeaders[i]) {
        console.error(`ヘッダー不一致 列${i+1}: 現在="${currentHeaders[i]}", 期待="${expectedHeaders[i]}"`);
      }
    }
  }

  return sheet;
}

/**
 * 加盟店登録シートを作成
 * @param {Spreadsheet} spreadsheet - スプレッドシート
 * @return {Sheet} 作成したシート
 */
function createFranchiseSheet(spreadsheet) {
  // 既存のシートがあればそのまま返す（削除しない）
  const existingSheet = spreadsheet.getSheetByName('加盟店登録');
  if (existingSheet) {
    console.log('既存のシートを使用します');
    return existingSheet;
  }

  // 新しいシートを作成
  const sheet = spreadsheet.insertSheet('加盟店登録');

  // ヘッダー行を設定
  const headers = getFranchiseHeaders();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダー行を装飾
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // 列幅を調整
  sheet.autoResizeColumns(1, headers.length);

  return sheet;
}

/**
 * 加盟店シートのヘッダーを取得
 * @return {Array} ヘッダー配列
 */
function getFranchiseHeaders() {
  return [
    'タイムスタンプ',      // A
    '登録ID',              // B
    '会社名',              // C
    '会社名カナ',          // D
    '屋号',                // E
    '屋号カナ',            // F
    '代表者名',            // G
    '代表者名カナ',        // H
    '郵便番号',            // I
    '住所',                // J
    '電話番号',            // K
    'ウェブサイトURL',     // L
    '設立年月',            // M
    'PRテキスト',          // N
    '支店名',              // O
    '支店住所',            // P
    '利用規約同意',        // Q
    '本人確認書類種類',    // R
    '本人確認書類URL1',    // S
    '本人確認書類URL2',    // T
    '情報確認同意',        // U
    '請求用メールアドレス',// V
    '営業用メールアドレス',// W
    '営業担当者氏名',      // X
    '営業担当者カナ',      // Y
    '従業員数',            // Z
    '売上規模',            // AA
    '対応可能物件種別',    // AB
    '最大対応階数',        // AC
    '築年数対応範囲',      // AD
    '施工箇所',            // AE
    '特殊対応項目',        // AF
    '対応都道府県',        // AG
    '対応市区町村',        // AH
    '優先エリア',          // AI
    'ステータス',          // AJ
    '承認ステータス',      // AK
    '登録日時'             // AL
  ];
}

/**
 * スプレッドシートのバックアップを作成
 * @return {Object} バックアップ情報
 */
function backupSpreadsheet() {
  try {
    const spreadsheetId = getOrCreateSpreadsheetId();
    const original = SpreadsheetApp.openById(spreadsheetId);
    const backupName = original.getName() + '_backup_' +
                      Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');

    const backup = original.copy(backupName);

    return {
      success: true,
      backupId: backup.getId(),
      backupName: backupName
    };
  } catch(error) {
    console.error('Backup error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * シートをリセット（古いヘッダーを削除して新規作成）
 * 一度だけ実行してください
 */
function resetSheet() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');

  if (spreadsheetId) {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const oldSheet = spreadsheet.getSheetByName('加盟店登録');

    if (oldSheet) {
      spreadsheet.deleteSheet(oldSheet);
      console.log('古いシート削除完了');
    }

    // 新しいシートを正しいヘッダーで作成
    const newSheet = getFranchiseSheet();
    console.log('新しいシート作成完了');

    return '完了：シートをリセットしました';
  }

  return 'エラー：スプレッドシートIDが見つかりません';
}