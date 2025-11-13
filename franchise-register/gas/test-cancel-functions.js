/**
 * ====================================
 * キャンセル申請システム テスト関数
 * ====================================
 *
 * GASエディタから手動実行してテストする関数群
 */

/**
 * テスト1: キャンセル申請可能案件一覧取得
 */
function testGetCancelableCases() {
  console.log('===== testGetCancelableCases 開始 =====');

  const params = {
    merchantId: 'TEST_MERCHANT_ID' // 実際の加盟店IDに置き換えてください
  };

  const result = MerchantCancelReport.getCancelableCases(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
    console.log('案件数:', result.cases.length);
    if (result.cases.length > 0) {
      console.log('最初の案件:', JSON.stringify(result.cases[0], null, 2));
    }
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testGetCancelableCases 終了 =====');
}

/**
 * テスト2: キャンセル申請登録
 */
function testSubmitCancelReport() {
  console.log('===== testSubmitCancelReport 開始 =====');

  const params = {
    merchantId: 'TEST_MERCHANT_ID', // 実際の加盟店IDに置き換えてください
    merchantName: 'テスト加盟店',
    applicantName: 'テスト担当者',
    cvId: 'TEST_CV_ID', // 実際のCV IDに置き換えてください
    cancelReasonCategory: '1. 連絡が繋がらない',
    cancelReasonDetail: '複数回電話したが出ない',
    reasonData: {
      category: 'no_contact',
      subCategory: 'no_answer_multiple',
      answers: {
        phone_count: 5,
        sms_count: 3,
        last_contact_date: new Date()
      }
    },
    additionalInfo1: '電話回数: 5回',
    additionalInfo2: 'SMS回数: 3回',
    additionalInfo3: '最終連絡: ' + Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm'),
    phoneCallCount: 5,
    smsCount: 3,
    lastContactDate: new Date()
  };

  const result = MerchantCancelReport.submitCancelReport(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
    console.log('申請ID:', result.data.applicationId);
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testSubmitCancelReport 終了 =====');
}

/**
 * テスト3: 期限延長申請可能案件一覧取得
 */
function testGetExtensionEligibleCases() {
  console.log('===== testGetExtensionEligibleCases 開始 =====');

  const params = {
    merchantId: 'TEST_MERCHANT_ID' // 実際の加盟店IDに置き換えてください
  };

  const result = MerchantDeadlineExtension.getExtensionEligibleCases(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
    console.log('案件数:', result.cases.length);
    if (result.cases.length > 0) {
      console.log('最初の案件:', JSON.stringify(result.cases[0], null, 2));
    }
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testGetExtensionEligibleCases 終了 =====');
}

/**
 * テスト4: 期限延長申請登録
 */
function testSubmitExtensionRequest() {
  console.log('===== testSubmitExtensionRequest 開始 =====');

  const params = {
    merchantId: 'TEST_MERCHANT_ID', // 実際の加盟店IDに置き換えてください
    merchantName: 'テスト加盟店',
    applicantName: 'テスト担当者',
    cvId: 'TEST_CV_ID', // 実際のCV IDに置き換えてください
    contactDate: new Date(),
    appointmentDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後
    extensionReason: '顧客と連絡が取れましたが、10日後に訪問予定のため期限延長を申請します。'
  };

  const result = MerchantDeadlineExtension.submitExtensionRequest(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
    console.log('申請ID:', result.data.extensionId);
    console.log('延長後期限:', result.data.extendedDeadline);
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testSubmitExtensionRequest 終了 =====');
}

/**
 * テスト5: キャンセル申請承認
 */
function testApproveCancelReport() {
  console.log('===== testApproveCancelReport 開始 =====');

  const params = {
    applicationId: 'CN250114120000', // 実際の申請IDに置き換えてください
    approverName: 'テスト管理者'
  };

  const result = AdminCancelSystem.approveCancelReport(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testApproveCancelReport 終了 =====');
}

/**
 * テスト6: キャンセル申請却下
 */
function testRejectCancelReport() {
  console.log('===== testRejectCancelReport 開始 =====');

  const params = {
    applicationId: 'CN250114120000', // 実際の申請IDに置き換えてください
    approverName: 'テスト管理者',
    rejectReason: 'フォローアップ回数が不足しています'
  };

  const result = AdminCancelSystem.rejectCancelReport(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testRejectCancelReport 終了 =====');
}

/**
 * テスト7: 期限延長申請承認
 */
function testApproveExtensionRequest() {
  console.log('===== testApproveExtensionRequest 開始 =====');

  const params = {
    extensionId: 'DE250114120000', // 実際の申請IDに置き換えてください
    approverName: 'テスト管理者'
  };

  const result = AdminCancelSystem.approveExtensionRequest(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testApproveExtensionRequest 終了 =====');
}

/**
 * テスト8: 期限延長申請却下
 */
function testRejectExtensionRequest() {
  console.log('===== testRejectExtensionRequest 開始 =====');

  const params = {
    extensionId: 'DE250114120000', // 実際の申請IDに置き換えてください
    approverName: 'テスト管理者',
    rejectReason: 'アポ予定日が期限内に収まるため延長不要'
  };

  const result = AdminCancelSystem.rejectExtensionRequest(params);

  console.log('結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ テスト成功');
  } else {
    console.log('❌ テスト失敗:', result.error);
  }

  console.log('===== testRejectExtensionRequest 終了 =====');
}

/**
 * テスト9: 延長後期限計算ロジックテスト
 */
function testExtendedDeadlineCalculation() {
  console.log('===== testExtendedDeadlineCalculation 開始 =====');

  const testCases = [
    { deliveredDate: new Date(2025, 0, 15), expected: new Date(2025, 1, 28, 23, 59, 59, 999) }, // 1/15 → 2/28
    { deliveredDate: new Date(2025, 1, 10), expected: new Date(2025, 2, 31, 23, 59, 59, 999) }, // 2/10 → 3/31
    { deliveredDate: new Date(2025, 2, 25), expected: new Date(2025, 3, 30, 23, 59, 59, 999) }, // 3/25 → 4/30
    { deliveredDate: new Date(2024, 0, 15), expected: new Date(2024, 1, 29, 23, 59, 59, 999) }  // 2024年1/15 → 2/29(閏年)
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result = MerchantDeadlineExtension.calculateExtendedDeadline(testCase.deliveredDate);

    console.log(`テストケース ${i + 1}:`);
    console.log('  配信日:', Utilities.formatDate(testCase.deliveredDate, 'JST', 'yyyy-MM-dd'));
    console.log('  計算結果:', Utilities.formatDate(result, 'JST', 'yyyy-MM-dd HH:mm:ss'));
    console.log('  期待値:', Utilities.formatDate(testCase.expected, 'JST', 'yyyy-MM-dd HH:mm:ss'));

    if (result.getTime() === testCase.expected.getTime()) {
      console.log('  ✅ 正しい');
    } else {
      console.log('  ❌ 誤り');
    }
  }

  console.log('===== testExtendedDeadlineCalculation 終了 =====');
}

/**
 * テスト10: キャンセル理由構造確認
 */
function testCancelReasonsStructure() {
  console.log('===== testCancelReasonsStructure 開始 =====');

  if (typeof CancelReasons === 'undefined') {
    console.log('❌ CancelReasonsが定義されていません');
    return;
  }

  console.log('カテゴリ数:', CancelReasons.categories.length);

  for (let i = 0; i < CancelReasons.categories.length; i++) {
    const category = CancelReasons.categories[i];
    console.log(`\nカテゴリ ${i + 1}: ${category.label} (${category.id})`);
    console.log('  フォローアップ必須:', category.requiresFollowUp);
    if (category.minPhoneCalls) {
      console.log('  最低電話回数:', category.minPhoneCalls);
    }
    if (category.minSMS) {
      console.log('  最低SMS回数:', category.minSMS);
    }

    const subCategories = CancelReasons.getSubCategories(category.id);
    console.log('  サブカテゴリ数:', subCategories.length);

    for (let j = 0; j < subCategories.length; j++) {
      const subCat = subCategories[j];
      console.log(`    - ${subCat.label} (質問数: ${subCat.questions.length})`);
    }
  }

  console.log('\n✅ テスト完了');
  console.log('===== testCancelReasonsStructure 終了 =====');
}

/**
 * 全テスト実行（読み取りテストのみ）
 */
function runAllReadOnlyTests() {
  console.log('\n\n========================================');
  console.log('全読み取りテスト実行開始');
  console.log('========================================\n\n');

  testGetCancelableCases();
  console.log('\n\n');

  testGetExtensionEligibleCases();
  console.log('\n\n');

  testExtendedDeadlineCalculation();
  console.log('\n\n');

  testCancelReasonsStructure();

  console.log('\n\n========================================');
  console.log('全読み取りテスト実行終了');
  console.log('========================================\n\n');
}
