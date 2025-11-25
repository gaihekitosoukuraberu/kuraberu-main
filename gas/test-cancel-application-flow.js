/**
 * ====================================
 * キャンセル申請フロー E2Eテスト
 * ====================================
 *
 * 【テスト内容】
 * 1. テストデータ（CV2、C社申請）でキャンセル申請を実行
 * 2. CVDeliveryCheckerが他社（A社、B社）を検出
 * 3. Slack通知が警告付きで送信される
 *
 * 【実行方法】
 * GASエディタで testCancelApplicationFlow() を実行
 *
 * ⚠️ 注意: 実際にSlack通知が送信されます
 * ⚠️ 注意: キャンセル申請シートにテストレコードが追加されます
 */

function testCancelApplicationFlow() {
  console.log('===== キャンセル申請フロー E2Eテスト開始 =====\n');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const deliverySheet = ss.getSheetByName('配信管理');

  if (!deliverySheet) {
    console.error('❌ 配信管理シートが見つかりません');
    return;
  }

  // CV2のCV IDを取得（5行目のB列）
  const cv2Id = deliverySheet.getRange('B5').getValue();

  console.log('【テストシナリオ】');
  console.log('- CV ID:', cv2Id);
  console.log('- 申請加盟店: FR251112004602 (C社)');
  console.log('- 期待される検出他社: A社、B社（いずれも追客中）');
  console.log('');

  // テスト申請データ
  const testData = {
    merchantId: 'FR251112004602',
    merchantName: 'C社',
    applicantName: 'テスト担当者',
    cvId: cv2Id,
    cancelReasonCategory: '電話繋がらず',
    cancelReasonDetail: '不在',
    reasonData: {
      category: '電話繋がらず',
      detail: '不在'
    },
    phoneCallCount: 3,
    smsCount: 1,
    lastContactDate: new Date(),
    additionalInfo1: 'E2Eテストデータ'
  };

  console.log('【ステップ1】 キャンセル申請実行');
  console.log('MerchantCancelReport.submitCancelReport() を呼び出します...\n');

  const result = MerchantCancelReport.submitCancelReport(testData);

  if (!result.success) {
    console.error('❌ キャンセル申請失敗:', result.error);
    return;
  }

  console.log('✅ キャンセル申請成功');
  console.log('申請ID:', result.data.applicationId);
  console.log('');

  console.log('【ステップ2】 CVDeliveryChecker 動作確認');
  const competitorCheck = CVDeliveryChecker.checkOtherMerchantsStatus(cv2Id, 'FR251112004602');

  if (competitorCheck.hasActiveCompetitors) {
    console.log('✅ 他社の追客活動を検出しました');
    console.log('警告対象の他社数:', competitorCheck.competitorDetails.length);

    competitorCheck.competitorDetails.forEach((comp, index) => {
      console.log(`\n--- 他社 ${index + 1} ---`);
      console.log('加盟店名:', comp.merchantName);
      console.log('ステータス:', comp.status);
      console.log('電話回数:', comp.phoneCount);
      console.log('最終連絡:', comp.lastContact);
    });
  } else {
    console.log('⚠️ 他社の追客活動は検出されませんでした（想定外）');
  }

  console.log('\n【ステップ3】 Slack通知確認');
  console.log('⚠️ Slackチャンネルを確認してください');
  console.log('期待される通知内容:');
  console.log('- ヘッダー: 🚫⚠️ キャンセル申請（要確認）');
  console.log('- 警告ブロック: ⚠️ *他社で追客活動が確認されています:*');
  console.log('- ボタンスタイル: 承認=default、却下=danger');
  console.log('- @channelメッセージ: 🚫⚠️ キャンセル申請（他社追客中）');

  console.log('\n===== テスト完了 =====');
  console.log('\n【後処理】');
  console.log('テストデータを削除する場合は、キャンセル申請シートから');
  console.log('申請ID:', result.data.applicationId, 'の行を削除してください');
}

/**
 * テストデータクリーンアップ
 * 最新のキャンセル申請レコードを削除
 */
function cleanupTestCancelApplication() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cancelSheet = ss.getSheetByName('キャンセル申請');

  if (!cancelSheet) {
    console.error('❌ キャンセル申請シートが見つかりません');
    return;
  }

  const lastRow = cancelSheet.getLastRow();

  if (lastRow <= 1) {
    console.log('⚠️ 削除するデータがありません');
    return;
  }

  // 最終行を削除
  cancelSheet.deleteRow(lastRow);
  console.log('✅ 最新のキャンセル申請レコードを削除しました（行番号:', lastRow, '）');
}
