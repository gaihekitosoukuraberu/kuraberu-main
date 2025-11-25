/**
 * V1713-FIX: ステータス自動同期トリガー + 成約データ自動登録
 *
 * 【目的1】加盟店ステータス同期
 * 加盟店登録の「ステータス」列が変更されたら、
 * 加盟店マスタの「配信ステータス」列を自動的に更新する
 *
 * 【変換ルール】
 * - アクティブ → アクティブ
 * - 一時停止 → ストップ
 * - 休止 → ストップ
 *
 * 【目的2】成約データ自動登録
 * ユーザー登録の「管理ステータス」が「完了」になったら、
 * 成約データシートに自動的にレコードを追加する
 *
 * 【メリット】
 * - ランキング取得時に加盟店マスタだけ読めばOK（高速化）
 * - 常に同期されているので、手動同期不要
 * - リアルタイムで反映される
 * - 成約データの登録漏れを防止
 */

/**
 * onEditトリガー
 * スプレッドシートが編集されたときに自動実行される
 */
function onEdit(e) {
  try {
    // トリガーイベントがない場合は手動実行なのでスキップ
    if (!e) {
      console.log('[StatusSyncTrigger] 手動実行のためスキップ');
      return;
    }

    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();

    // ヘッダー行は処理しない
    if (row === 1) {
      return;
    }

    // === 1. 加盟店登録シートのステータス変更処理 ===
    if (sheetName === '加盟店登録') {
      // ステータス列の取得
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const statusCol = headers.indexOf('ステータス') + 1; // 1-based

      // ステータス列が変更された場合
      if (col === statusCol) {
        // V1713-FIX: ステータスが変更されたので加盟店マスタの配信ステータスを更新
        syncStatusToMaster(e.source, sheet, row, headers);
      }
      return;
    }

    // === 2. ユーザー登録シートの管理ステータス変更処理 ===
    if (sheetName === 'ユーザー登録') {
      // 管理ステータス列の取得
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const managementStatusCol = headers.indexOf('管理ステータス') + 1; // 1-based

      // 管理ステータス列が変更された場合
      if (col === managementStatusCol) {
        const newStatus = range.getValue();

        // 「完了」になった場合、成約データシートに自動追加
        if (newStatus === '完了') {
          const cvIdCol = headers.indexOf('CV ID') + 1;
          const cvId = sheet.getRange(row, cvIdCol).getValue();

          if (cvId) {
            console.log('[ContractTrigger] 管理ステータスが「完了」になりました。CV ID:', cvId);
            const result = ContractDataSystem.addContractRecord(cvId);

            if (result.success) {
              console.log('[ContractTrigger] ✅ 成約データに自動追加しました:', cvId);
            } else {
              console.log('[ContractTrigger] ⚠️ 成約データ追加スキップ:', result.message);
            }
          }
        }
      }
      return;
    }

  } catch (error) {
    console.error('[StatusSyncTrigger] onEditエラー:', error.message);
  }
}

/**
 * ステータスを加盟店マスタの配信ステータスに同期
 * @param {Spreadsheet} ss - スプレッドシート
 * @param {Sheet} registrationSheet - 加盟店登録シート
 * @param {number} editedRow - 編集された行番号（1-based）
 * @param {Array} headers - ヘッダー配列
 */
function syncStatusToMaster(ss, registrationSheet, editedRow, headers) {
  try {
    // 編集された行のデータ取得
    const rowData = registrationSheet.getRange(editedRow, 1, 1, headers.length).getValues()[0];

    const companyNameIdx = headers.indexOf('会社名');
    const statusIdx = headers.indexOf('ステータス');
    const registrationIdIdx = headers.indexOf('加盟店ID');

    if (companyNameIdx === -1 || statusIdx === -1) {
      console.error('[StatusSyncTrigger] 必要なカラムが見つかりません');
      return;
    }

    const companyName = rowData[companyNameIdx];
    const status = rowData[statusIdx];
    const registrationId = rowData[registrationIdIdx];

    // V1841: 配信ステータス完全同期（変換なし）- 将来のステータス追加に対応
    // ステータスをそのまま配信ステータスにコピー
    const newDeliveryStatus = status || 'アクティブ'; // ステータスが空の場合のみデフォルト値

    if (!companyName) {
      console.log('[StatusSyncTrigger] 会社名が空のためスキップ');
      return;
    }

    console.log('[StatusSyncTrigger] 同期開始:', companyName, 'ステータス:', status, '→ 配信ステータス:', newDeliveryStatus, '（完全同期）');

    // 加盟店マスタシート取得
    const masterSheet = ss.getSheetByName('加盟店マスタ');
    if (!masterSheet) {
      console.error('[StatusSyncTrigger] 加盟店マスタシートが見つかりません');
      return;
    }

    const masterData = masterSheet.getDataRange().getValues();
    const masterHeaders = masterData[0];
    const masterRows = masterData.slice(1);

    const masterIdIdx = masterHeaders.indexOf('加盟店ID');
    const masterDeliveryStatusIdx = masterHeaders.indexOf('配信ステータス');

    if (masterIdIdx === -1 || masterDeliveryStatusIdx === -1) {
      console.error('[StatusSyncTrigger] 加盟店マスタに必要なカラムが見つかりません');
      return;
    }

    // 加盟店IDで検索（より確実）
    let foundRowNumber = -1;
    for (let i = 0; i < masterRows.length; i++) {
      const masterId = masterRows[i][masterIdIdx];
      if (masterId === registrationId) {
        foundRowNumber = i + 2; // +2 (ヘッダー1行 + 0-indexed)
        break;
      }
    }

    // 見つからない場合は会社名で検索（フォールバック）
    if (foundRowNumber === -1) {
      const masterCompanyNameIdx = masterHeaders.indexOf('会社名');
      if (masterCompanyNameIdx !== -1) {
        for (let i = 0; i < masterRows.length; i++) {
          const masterCompanyName = masterRows[i][masterCompanyNameIdx];
          if (masterCompanyName === companyName) {
            foundRowNumber = i + 2;
            break;
          }
        }
      }
    }

    if (foundRowNumber === -1) {
      console.log('[StatusSyncTrigger] 加盟店マスタに該当業者が見つかりません:', companyName);
      console.log('[StatusSyncTrigger] おそらくまだ承認されていない業者です');
      return;
    }

    // 配信ステータス更新
    const currentStatus = masterRows[foundRowNumber - 2][masterDeliveryStatusIdx];
    if (currentStatus === newDeliveryStatus) {
      console.log('[StatusSyncTrigger] すでに同じステータスです:', newDeliveryStatus);
      return;
    }

    masterSheet.getRange(foundRowNumber, masterDeliveryStatusIdx + 1).setValue(newDeliveryStatus);
    console.log('[StatusSyncTrigger] ✅ 加盟店マスタ更新完了（行' + foundRowNumber + '）:', currentStatus, '→', newDeliveryStatus);

  } catch (error) {
    console.error('[StatusSyncTrigger] 同期エラー:', error.message);
  }
}

/**
 * 初回一括同期（手動実行用）
 * 加盟店登録の「ステータス」列を読み取り、加盟店マスタの「配信ステータス」に同期します
 * 変換ルール: アクティブ→アクティブ、一時停止/休止→ストップ
 */
function initialSyncAllDeliveryStatus() {
  console.log('[StatusSyncTrigger] ===== 初回一括同期開始（ステータス→配信ステータス） =====');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registrationSheet = ss.getSheetByName('加盟店登録');
  const masterSheet = ss.getSheetByName('加盟店マスタ');

  if (!registrationSheet || !masterSheet) {
    console.error('[StatusSyncTrigger] 必要なシートが見つかりません');
    return;
  }

  // 加盟店登録データ取得
  const regData = registrationSheet.getDataRange().getValues();
  const regHeaders = regData[0];
  const regRows = regData.slice(1);

  const regCompanyNameIdx = regHeaders.indexOf('会社名');
  const regStatusIdx = regHeaders.indexOf('ステータス');
  const regIdIdx = regHeaders.indexOf('加盟店ID');
  const regApprovalStatusIdx = regHeaders.indexOf('承認ステータス');

  // 加盟店マスタデータ取得
  const masterData = masterSheet.getDataRange().getValues();
  const masterHeaders = masterData[0];
  const masterRows = masterData.slice(1);

  const masterIdIdx = masterHeaders.indexOf('加盟店ID');
  const masterCompanyNameIdx = masterHeaders.indexOf('会社名');
  const masterDeliveryStatusIdx = masterHeaders.indexOf('配信ステータス');

  let updateCount = 0;
  let skipCount = 0;
  let notFoundCount = 0;

  // 加盟店登録の各行を処理
  for (let i = 0; i < regRows.length; i++) {
    const regRow = regRows[i];
    const companyName = regRow[regCompanyNameIdx];
    const status = regRow[regStatusIdx];
    const registrationId = regRow[regIdIdx];
    const approvalStatus = regRow[regApprovalStatusIdx];

    // V1713-FIX: ステータス → 配信ステータス変換
    let deliveryStatus = 'アクティブ';
    if (status === '一時停止' || status === '休止') {
      deliveryStatus = 'ストップ';
    }

    // デバッグ: 最初の5件を詳細ログ出力
    if (i < 5) {
      console.log('[StatusSyncTrigger] 加盟店登録 行' + (i+2) + ':');
      console.log('  会社名: ' + companyName);
      console.log('  承認ステータス: ' + approvalStatus);
      console.log('  ステータス(I列): ' + status);
      console.log('  → 配信ステータス: ' + deliveryStatus);
      console.log('  加盟店ID: ' + registrationId);
    }

    // 承認済みのみ処理
    if (approvalStatus !== '承認済み') {
      skipCount++;
      continue;
    }

    if (!companyName || !status) {
      skipCount++;
      continue;
    }

    // 加盟店マスタで該当行を検索
    let foundRowNumber = -1;
    for (let j = 0; j < masterRows.length; j++) {
      const masterId = masterRows[j][masterIdIdx];
      if (masterId === registrationId) {
        foundRowNumber = j + 2; // +2 (ヘッダー1行 + 0-indexed)
        break;
      }
    }

    // 見つからない場合は会社名で検索
    if (foundRowNumber === -1 && masterCompanyNameIdx !== -1) {
      for (let j = 0; j < masterRows.length; j++) {
        const masterCompanyName = masterRows[j][masterCompanyNameIdx];
        if (masterCompanyName === companyName) {
          foundRowNumber = j + 2;
          break;
        }
      }
    }

    if (foundRowNumber === -1) {
      console.log('[StatusSyncTrigger] マスタに見つかりません:', companyName);
      notFoundCount++;
      continue;
    }

    // 現在の配信ステータス取得
    const currentStatus = masterRows[foundRowNumber - 2][masterDeliveryStatusIdx];

    // デバッグ: 最初の5件の比較ログ
    if (i < 5) {
      console.log('  加盟店マスタ 配信ステータス（現在）: ' + currentStatus);
      console.log('  比較結果: ' + (currentStatus === deliveryStatus ? '一致 - 更新不要' : '不一致 → ' + deliveryStatus + 'に更新'));
    }

    // 異なる場合のみ更新
    if (currentStatus !== deliveryStatus) {
      masterSheet.getRange(foundRowNumber, masterDeliveryStatusIdx + 1).setValue(deliveryStatus);
      console.log('[StatusSyncTrigger] 更新:', companyName, ':', currentStatus, '→', deliveryStatus, '(ステータス:', status, ')');
      updateCount++;
    }
  }

  console.log('[StatusSyncTrigger] ===== 一括同期完了 =====');
  console.log('  更新: ' + updateCount + '件');
  console.log('  スキップ: ' + skipCount + '件');
  console.log('  マスタに未登録: ' + notFoundCount + '件');
}

/**
 * トリガー設定関数（初回のみ手動実行）
 * GASのトリガー画面から手動で設定することもできます
 */
function setupOnEditTrigger() {
  // 既存のonEditトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // onEditトリガーを作成
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  console.log('[StatusSyncTrigger] onEditトリガー設定完了');
}

/**
 * 日次集計トリガー設定（初回のみ手動実行）
 * 毎日深夜0時に直近3ヶ月データを集計して加盟店マスタを更新
 */
function setupDailyMetricsTrigger() {
  // 既存の日次集計トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailyUpdateRecent3MonthMetrics') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 日次集計トリガーを作成（毎日午前0時〜1時）
  ScriptApp.newTrigger('dailyUpdateRecent3MonthMetrics')
    .timeBased()
    .atHour(0)
    .everyDays(1)
    .create();

  console.log('[ContractTrigger] 日次集計トリガー設定完了（毎日0時実行）');
}

/**
 * 日次集計実行関数（トリガーから自動実行される）
 */
function dailyUpdateRecent3MonthMetrics() {
  console.log('[ContractTrigger] ===== 日次集計開始 =====');
  const result = ContractDataSystem.updateRecent3MonthMetrics();

  if (result.success) {
    console.log('[ContractTrigger] ✅ 日次集計完了:', result.updateCount + '件更新');
    console.log('[ContractTrigger] 期間:', result.period.from + ' 〜 ' + result.period.to);
  } else {
    console.error('[ContractTrigger] ❌ 日次集計エラー:', result.message);
  }

  return result;
}

/**
 * テスト関数（手動実行用）
 */
function testStatusSync() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registrationSheet = ss.getSheetByName('加盟店登録');

  if (!registrationSheet) {
    console.log('加盟店登録シートが見つかりません');
    return;
  }

  const headers = registrationSheet.getRange(1, 1, 1, registrationSheet.getLastColumn()).getValues()[0];

  // 2行目（最初のデータ行）でテスト
  console.log('=== テスト実行: 2行目の配信ステータスを同期 ===');
  syncStatusToMaster(ss, registrationSheet, 2, headers);
}
