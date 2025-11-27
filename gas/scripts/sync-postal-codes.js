/**
 * ====================================
 * V1948: 郵便番号一括同期スクリプト
 * ====================================
 *
 * 【目的】
 * 既存の加盟店マスタに郵便番号を一括で同期する（V1947のバックフィル）
 *
 * 【処理フロー】
 * 1. 加盟店登録シートから全レコードの郵便番号を読み込む
 * 2. 加盟店マスタシートの対応レコードを更新
 * 3. 同期結果をログ出力
 *
 * 【使用方法】
 * Google Apps Scriptエディタで syncAllPostalCodes() を実行
 */

function syncAllPostalCodes() {
  console.log('[V1948] ===== 郵便番号一括同期開始 =====');

  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const registrationSheet = ss.getSheetByName('加盟店登録');
    const masterSheet = ss.getSheetByName('加盟店マスタ');

    if (!registrationSheet) {
      throw new Error('加盟店登録シートが見つかりません');
    }
    if (!masterSheet) {
      throw new Error('加盟店マスタシートが見つかりません');
    }

    // 加盟店登録からデータを取得
    const regData = registrationSheet.getDataRange().getValues();
    const regHeaders = regData[0];
    const regIdIndex = regHeaders.indexOf('登録ID');
    const regCompanyIndex = regHeaders.indexOf('会社名');
    const regPostalIndex = regHeaders.indexOf('郵便番号');

    if (regIdIndex === -1 || regCompanyIndex === -1 || regPostalIndex === -1) {
      throw new Error('加盟店登録に必要な列が見つかりません');
    }

    console.log('[V1948] 加盟店登録の列インデックス:', {
      registrationId: regIdIndex,
      companyName: regCompanyIndex,
      postalCode: regPostalIndex
    });

    // 加盟店マスタからデータを取得
    const masterData = masterSheet.getDataRange().getValues();
    const masterHeaders = masterData[0];
    const masterIdIndex = masterHeaders.indexOf('登録ID');
    const masterCompanyIndex = masterHeaders.indexOf('会社名');
    const masterPostalIndex = masterHeaders.indexOf('郵便番号');

    if (masterIdIndex === -1 || masterCompanyIndex === -1 || masterPostalIndex === -1) {
      throw new Error('加盟店マスタに必要な列が見つかりません');
    }

    console.log('[V1948] 加盟店マスタの列インデックス:', {
      registrationId: masterIdIndex,
      companyName: masterCompanyIndex,
      postalCode: masterPostalIndex
    });

    // 郵便番号データをマップに格納（登録ID → 郵便番号）
    const postalCodeMap = {};
    let regCount = 0;

    for (let i = 1; i < regData.length; i++) {
      const registrationId = regData[i][regIdIndex];
      const postalCode = regData[i][regPostalIndex];
      const companyName = regData[i][regCompanyIndex];

      if (registrationId && postalCode) {
        postalCodeMap[registrationId] = {
          postalCode: postalCode,
          companyName: companyName
        };
        regCount++;
      }
    }

    console.log('[V1948] 加盟店登録から', regCount, '件の郵便番号を読み込みました');

    // 加盟店マスタを更新
    let updateCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const updateLog = [];

    for (let i = 1; i < masterData.length; i++) {
      const registrationId = masterData[i][masterIdIndex];
      const currentPostalCode = masterData[i][masterPostalIndex];
      const companyName = masterData[i][masterCompanyIndex];

      if (!registrationId) {
        console.log('[V1948] 行', (i + 1), '登録IDが空 - スキップ');
        skipCount++;
        continue;
      }

      // 登録IDで照合
      const postalData = postalCodeMap[registrationId];

      if (postalData) {
        const newPostalCode = postalData.postalCode;

        // 既に郵便番号が入っている場合はスキップ（上書きしない）
        if (currentPostalCode && currentPostalCode !== '') {
          console.log('[V1948] 行', (i + 1), companyName, '- 既に郵便番号あり:', currentPostalCode);
          skipCount++;
          continue;
        }

        // 郵便番号を更新
        try {
          masterSheet.getRange(i + 1, masterPostalIndex + 1).setValue(newPostalCode);
          updateCount++;
          updateLog.push({
            row: i + 1,
            registrationId: registrationId,
            companyName: companyName,
            postalCode: newPostalCode
          });
          console.log('[V1948] ✅ 更新成功 - 行', (i + 1), companyName, '郵便番号:', newPostalCode);
        } catch (updateError) {
          errorCount++;
          console.error('[V1948] ❌ 更新失敗 - 行', (i + 1), companyName, 'エラー:', updateError);
        }
      } else {
        console.log('[V1948] 行', (i + 1), companyName, '- 加盟店登録に郵便番号なし');
        skipCount++;
      }
    }

    // 結果サマリー
    console.log('[V1948] ===== 同期完了 =====');
    console.log('[V1948] 📊 結果サマリー:');
    console.log('[V1948]   - 更新成功:', updateCount, '件');
    console.log('[V1948]   - スキップ:', skipCount, '件');
    console.log('[V1948]   - エラー:', errorCount, '件');
    console.log('[V1948]   - 処理対象:', (masterData.length - 1), '件');

    if (updateCount > 0) {
      console.log('[V1948] ===== 更新詳細 =====');
      updateLog.forEach(log => {
        console.log('[V1948]   行', log.row, '-', log.companyName, ':', log.postalCode);
      });
    }

    return {
      success: true,
      updated: updateCount,
      skipped: skipCount,
      errors: errorCount,
      total: masterData.length - 1,
      updateLog: updateLog
    };

  } catch (error) {
    console.error('[V1948] ❌ 同期エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}
