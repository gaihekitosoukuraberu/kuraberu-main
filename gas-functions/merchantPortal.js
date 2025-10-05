/**
 * 加盟店ポータル機能
 * 会社情報の保存・プレビュー設定の管理
 */

/**
 * 加盟店情報を保存
 */
function saveMerchantData(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('加盟店データ');

    if (!sheet) {
      return createErrorResponse('加盟店データシートが見つかりません');
    }

    const merchantId = params.merchantId;
    if (!merchantId) {
      return createErrorResponse('merchantIdが指定されていません');
    }

    // 加盟店IDから行を特定
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === merchantId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return createErrorResponse('指定された加盟店IDが見つかりません');
    }

    // データを保存（カラム位置は実際のシート構造に合わせて調整）
    if (params.companyData) {
      // 会社情報の保存処理
      const companyData = params.companyData;
      // 例: sheet.getRange(targetRow, 列番号).setValue(値);
    }

    // プレビュー設定を保存
    if (params.previewSettings) {
      savePreviewSettings(merchantId, params.previewSettings);
    }

    return createSuccessResponse({
      message: '保存完了',
      merchantId: merchantId
    });

  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

/**
 * プレビュー設定を保存
 */
function savePreviewSettings(merchantId, previewSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('プレビュー');

  // プレビューシートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet('プレビュー');
    // ヘッダー行を作成
    sheet.getRange(1, 1, 1, 7).setValues([[
      '加盟店ID',
      'メインビジュアル位置X',
      'メインビジュアル位置Y',
      'メインビジュアルズーム',
      'メインビジュアル明るさ',
      'メインビジュアル文字色',
      '更新日時'
    ]]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // 既存データを検索
  const data = sheet.getDataRange().getValues();
  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === merchantId) {
      targetRow = i + 1;
      break;
    }
  }

  // 新規行の場合
  if (targetRow === -1) {
    targetRow = sheet.getLastRow() + 1;
  }

  // データを保存
  const row = [
    merchantId,
    previewSettings.imagePositionX || 50,
    previewSettings.imagePositionY || 50,
    previewSettings.imageZoom || 100,
    previewSettings.imageBrightness || 100,
    previewSettings.textColor || 'white',
    new Date()
  ];

  sheet.getRange(targetRow, 1, 1, 7).setValues([row]);

  Logger.log(`[savePreviewSettings] Saved for merchantId: ${merchantId}`);

  return {
    success: true,
    merchantId: merchantId,
    row: targetRow
  };
}

/**
 * プレビュー設定を読み込み
 */
function loadPreviewSettings(merchantId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('プレビュー');

    const defaultSettings = {
      imagePositionX: 50,
      imagePositionY: 50,
      imageZoom: 100,
      imageBrightness: 100,
      textColor: 'white'
    };

    if (!sheet) {
      // シートが存在しない場合はデフォルト値を返す
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        settings: defaultSettings
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === merchantId) {
        const settings = {
          imagePositionX: data[i][1] || 50,
          imagePositionY: data[i][2] || 50,
          imageZoom: data[i][3] || 100,
          imageBrightness: data[i][4] || 100,
          textColor: data[i][5] || 'white'
        };
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          settings: settings
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // データが見つからない場合はデフォルト値
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      settings: defaultSettings
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

/**
 * 成功レスポンスを作成
 */
function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(errorMessage) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: errorMessage
  })).setMimeType(ContentService.MimeType.JSON);
}
