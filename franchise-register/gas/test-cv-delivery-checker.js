/**
 * CVDeliveryChecker テスト関数
 *
 * 実行方法: GASエディタで testCVDeliveryChecker() を実行
 */

function testCVDeliveryChecker() {
  console.log('===== CVDeliveryChecker テスト開始 =====\n');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('配信管理');

  if (!sheet) {
    console.error('❌ 配信管理シートが見つかりません');
    return;
  }

  // CV2のCV IDを取得（5行目のB列）
  const cv2Id = sheet.getRange('B5').getValue();
  console.log('テスト対象のCV ID:', cv2Id);
  console.log('申請加盟店: FR251112004602 (C社)');
  console.log('');

  // CVDeliveryCheckerを実行
  console.log('[実行] CVDeliveryChecker.checkOtherMerchantsStatus()');
  const result = CVDeliveryChecker.checkOtherMerchantsStatus(cv2Id, 'FR251112004602');

  console.log('\n===== テスト結果 =====\n');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n===== 結果の解析 =====\n');

  if (result.hasActiveCompetitors) {
    console.log('✅ 他社の追客活動を検出しました');
    console.log('警告対象の他社数:', result.competitorDetails.length);

    result.competitorDetails.forEach((comp, index) => {
      console.log(`\n--- 他社 ${index + 1} ---`);
      console.log('加盟店ID:', comp.merchantId);
      console.log('加盟店名:', comp.merchantName);
      console.log('電話回数:', comp.phoneCount);
      console.log('SMS回数:', comp.smsCount);
      console.log('最終連絡:', comp.lastContact);
      console.log('ステータス:', comp.status);
      if (comp.appointmentDate) {
        console.log('アポ予定:', comp.appointmentDate);
      }
    });

    console.log('\n--- Slack通知用の警告メッセージ ---');
    console.log(result.warningMessage);
  } else {
    console.log('⚠️ 他社の追客活動は検出されませんでした');
  }

  console.log('\n===== テスト完了 =====');
}
