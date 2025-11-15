/**
 * ============================================
 * CVシート ヘッダー更新スクリプト
 * ============================================
 *
 * 目的: BU-BX列のヘッダーを既存シートに追加
 * 実行方法: GASエディタでこの関数を手動実行
 */

function updateCVSheetHeaders() {
  try {
    console.log('[UpdateHeaders] ヘッダー更新開始');

    // スプレッドシート取得
    const ssId = CVSheetSystem.getSpreadsheetId();
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName('ユーザー登録');

    if (!sheet) {
      throw new Error('ユーザー登録シートが見つかりません');
    }

    // BU-BX列のヘッダーを設定
    const headers = [
      '最終ハートビート時刻',   // BU(74)
      'サイト滞在時間（秒）',    // BV(75)
      'CV1→CV2時間差（秒）',   // BW(76)
      'デバイス種別'            // BX(77)
    ];

    // 74列目（BU列）から4つのヘッダーを設定
    const headerRange = sheet.getRange(1, 74, 1, headers.length);
    headerRange.setValues([headers]);

    // ヘッダー行のスタイル設定
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 列幅自動調整
    for (let i = 74; i <= 77; i++) {
      sheet.autoResizeColumn(i);
    }

    console.log('[UpdateHeaders] ✅ ヘッダー更新完了');

    return {
      success: true,
      message: 'BU-BX列のヘッダーを更新しました'
    };

  } catch (error) {
    console.error('[UpdateHeaders] エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}
