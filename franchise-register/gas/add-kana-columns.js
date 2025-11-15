/**
 * フリガナ列を各シートに追加するセットアップスクリプト
 *
 * 実行方法：
 * 1. Google Apps Script エディタでこのファイルを開く
 * 2. 関数 addKanaColumnsToAllSheets を実行
 * 3. 既存データのフリガナは手動で入力するか、郵便番号APIで自動入力
 */

function addKanaColumnsToAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ユーザー登録シートは既に「フリガナ」列があるので確認のみ
  checkUserRegistrationSheet(ss);

  // キャンセル申請シートに列追加
  addKanaToSheet(ss, 'キャンセル申請', {
    afterColumn: '顧客名',
    newColumns: ['顧客名フリガナ', '住所フリガナ']
  });

  // キャンセル期限延長申請シートに列追加
  addKanaToSheet(ss, 'キャンセル期限延長申請', {
    afterColumn: '顧客名',
    newColumns: ['顧客名フリガナ', '住所フリガナ']
  });

  // 成約データシートには既存データがあるので慎重に
  // addKanaToSheet(ss, '成約データ', {
  //   afterColumn: '顧客名',
  //   newColumns: ['顧客名フリガナ', '住所フリガナ']
  // });

  Logger.log('✅ フリガナ列の追加が完了しました');
}

/**
 * ユーザー登録シートの確認
 */
function checkUserRegistrationSheet(ss) {
  const sheet = ss.getSheetByName('ユーザー登録');
  if (!sheet) {
    Logger.log('⚠️ ユーザー登録シートが見つかりません');
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const kanaIdx = headers.indexOf('フリガナ');

  if (kanaIdx >= 0) {
    Logger.log('✅ ユーザー登録シート: 「フリガナ」列が存在します（列' + String.fromCharCode(65 + kanaIdx) + '）');
  } else {
    Logger.log('⚠️ ユーザー登録シート: 「フリガナ」列が見つかりません');
  }
}

/**
 * 指定シートにフリガナ列を追加
 */
function addKanaToSheet(ss, sheetName, config) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`⚠️ ${sheetName}シートが見つかりません`);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const afterColumnIdx = headers.indexOf(config.afterColumn);

  if (afterColumnIdx === -1) {
    Logger.log(`⚠️ ${sheetName}: 「${config.afterColumn}」列が見つかりません`);
    return;
  }

  // 既に列が存在するか確認
  const existingColumns = [];
  const missingColumns = [];

  config.newColumns.forEach(colName => {
    if (headers.indexOf(colName) >= 0) {
      existingColumns.push(colName);
    } else {
      missingColumns.push(colName);
    }
  });

  if (existingColumns.length > 0) {
    Logger.log(`✅ ${sheetName}: 既に存在 - ${existingColumns.join(', ')}`);
  }

  if (missingColumns.length === 0) {
    Logger.log(`✅ ${sheetName}: すべてのフリガナ列が既に存在します`);
    return;
  }

  // 列を追加
  const insertPosition = afterColumnIdx + 2; // afterColumnの次の位置（1-indexed）
  sheet.insertColumnsAfter(afterColumnIdx + 1, missingColumns.length);

  // ヘッダーを設定
  missingColumns.forEach((colName, idx) => {
    const col = insertPosition + idx;
    sheet.getRange(1, col).setValue(colName);
    Logger.log(`✅ ${sheetName}: 「${colName}」列を追加しました（列${String.fromCharCode(64 + col)}）`);
  });
}

/**
 * ユーザー登録シートから既存のフリガナデータをコピー
 * キャンセル申請・期限延長申請シートに自動入力
 */
function copyKanaFromUserRegistration() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName('ユーザー登録');

  if (!userSheet) {
    Logger.log('⚠️ ユーザー登録シートが見つかりません');
    return;
  }

  // ユーザー登録シートからデータ取得
  const userData = userSheet.getDataRange().getValues();
  const userHeaders = userData[0];
  const userRows = userData.slice(1);

  const cvIdIdx = userHeaders.indexOf('CV ID');
  const nameIdx = userHeaders.indexOf('氏名');
  const kanaIdx = userHeaders.indexOf('フリガナ');

  if (cvIdIdx === -1 || nameIdx === -1 || kanaIdx === -1) {
    Logger.log('⚠️ ユーザー登録シート: 必要な列が見つかりません');
    return;
  }

  // CV ID → フリガナのマップを作成
  const kanaMap = {};
  userRows.forEach(row => {
    const cvId = row[cvIdIdx];
    const kana = row[kanaIdx];
    if (cvId && kana) {
      kanaMap[cvId] = kana;
    }
  });

  Logger.log(`✅ ${Object.keys(kanaMap).length}件のフリガナデータを取得しました`);

  // キャンセル申請シートに適用
  updateKanaInSheet(ss, 'キャンセル申請', kanaMap);

  // 期限延長申請シートに適用
  updateKanaInSheet(ss, 'キャンセル期限延長申請', kanaMap);
}

/**
 * 指定シートのフリガナ列を更新
 */
function updateKanaInSheet(ss, sheetName, kanaMap) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`⚠️ ${sheetName}シートが見つかりません`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const cvIdIdx = headers.indexOf('CV ID');
  const kanaColIdx = headers.indexOf('顧客名フリガナ');

  if (cvIdIdx === -1 || kanaColIdx === -1) {
    Logger.log(`⚠️ ${sheetName}: CV IDまたは顧客名フリガナ列が見つかりません`);
    return;
  }

  let updateCount = 0;

  rows.forEach((row, idx) => {
    const cvId = row[cvIdIdx];
    if (cvId && kanaMap[cvId]) {
      // 既にフリガナが入っている場合はスキップ
      if (!row[kanaColIdx]) {
        sheet.getRange(idx + 2, kanaColIdx + 1).setValue(kanaMap[cvId]);
        updateCount++;
      }
    }
  });

  Logger.log(`✅ ${sheetName}: ${updateCount}件のフリガナを自動入力しました`);
}

/**
 * 郵便番号から住所フリガナを取得（無料API使用）
 * ※ 都道府県・市区町村のみ。番地以降は含まれない
 */
function fetchAddressKanaFromZipCode(zipCode) {
  try {
    // ハイフンを除去
    const cleanZip = zipCode.replace(/-/g, '');

    // 郵便番号検索API（無料）
    const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`;
    const response = UrlFetchApp.fetch(url);
    const result = JSON.parse(response.getContentText());

    if (result.status === 200 && result.results && result.results.length > 0) {
      const address = result.results[0];
      // カタカナのフリガナを取得
      const kana = `${address.kana1}${address.kana2}${address.kana3}`;
      return kana;
    }

    return '';
  } catch (error) {
    Logger.log('郵便番号検索エラー:', error);
    return '';
  }
}

/**
 * ユーザー登録シートの住所フリガナを郵便番号から自動生成
 * ※ 注意: APIリクエストが多いため、少しずつ実行すること
 */
function generateAddressKanaForUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ユーザー登録');

  if (!sheet) {
    Logger.log('⚠️ ユーザー登録シートが見つかりません');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const zipIdx = headers.indexOf('郵便番号（物件）');
  const addressKanaIdx = headers.indexOf('住所フリガナ');

  if (zipIdx === -1) {
    Logger.log('⚠️ 郵便番号（物件）列が見つかりません');
    return;
  }

  if (addressKanaIdx === -1) {
    Logger.log('⚠️ 住所フリガナ列が見つかりません。先にaddKanaColumnsToAllSheets()を実行してください');
    return;
  }

  let updateCount = 0;
  const maxRows = 50; // 一度に処理する最大行数（API制限対策）

  for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
    const row = rows[i];
    const zipCode = row[zipIdx];
    const existingKana = row[addressKanaIdx];

    // 既にフリガナがある、または郵便番号がない場合はスキップ
    if (existingKana || !zipCode) continue;

    const kana = fetchAddressKanaFromZipCode(zipCode);
    if (kana) {
      sheet.getRange(i + 2, addressKanaIdx + 1).setValue(kana);
      updateCount++;
      Utilities.sleep(100); // API負荷対策
    }
  }

  Logger.log(`✅ ${updateCount}件の住所フリガナを自動生成しました`);

  if (rows.length > maxRows) {
    Logger.log(`⚠️ まだ${rows.length - maxRows}件残っています。再度実行してください`);
  }
}
