/**
 * CV用シート初期化関数（手動実行用）
 *
 * GASエディタで実行してください：
 * 1. この関数を選択
 * 2. ▶実行ボタンをクリック
 */
function initCVSheets() {
  try {
    console.log('=== CV用シート初期化開始 ===');

    const result = CVSheetSystem.handle({action: 'cv_init'});

    console.log('結果:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ シート初期化完了');
      console.log('スプレッドシートID:', result.spreadsheetId);
      console.log('URL: https://docs.google.com/spreadsheets/d/' + result.spreadsheetId);
    } else {
      console.error('❌ シート初期化失敗:', result.error);
    }

    return result;

  } catch (error) {
    console.error('❌ エラー:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
