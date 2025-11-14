/**
 * ====================================
 * 通知システム統合テスト
 * ====================================
 *
 * 【実行方法】
 * GASエディタで関数を選択して実行
 *
 * 【テスト順序】
 * 1. checkRequiredSettings() - 必須設定の確認
 * 2. testNotificationSettings() - 通知設定のテスト
 * 3. testAIReasonGeneration() - AI理由生成のテスト
 * 4. testFullCancelRejectionFlow() - 完全な却下フローテスト
 */

/**
 * ステップ1: 必須設定の確認
 */
function checkRequiredSettings() {
  console.log('===== 必須設定チェック開始 =====\n');

  const props = PropertiesService.getScriptProperties();
  const settings = {
    'SLACK_WEBHOOK_URL': props.getProperty('SLACK_WEBHOOK_URL'),
    'SLACK_BOT_TOKEN': props.getProperty('SLACK_BOT_TOKEN'),
    'OPENROUTER_API_KEY': props.getProperty('OPENROUTER_API_KEY'),
    'LINE_ACCESS_TOKEN': props.getProperty('LINE_ACCESS_TOKEN'),
    'LINE_ADMIN_USER_ID': props.getProperty('LINE_ADMIN_USER_ID'),
    'LINE_CHANNEL_SECRET': props.getProperty('LINE_CHANNEL_SECRET')
  };

  let allOk = true;

  Object.keys(settings).forEach((key) => {
    const value = settings[key];
    const status = value ? '✅ 設定済み' : '❌ 未設定';
    const preview = value ? value.substring(0, 20) + '...' : '(なし)';

    console.log(`${key}: ${status}`);
    console.log(`  値: ${preview}`);

    if (!value && (key === 'SLACK_BOT_TOKEN' || key === 'OPENROUTER_API_KEY')) {
      console.log(`  ⚠️ ${key}は必須です！`);
      allOk = false;
    }
  });

  console.log('\n===== チェック完了 =====');

  if (allOk) {
    console.log('✅ すべての必須設定が完了しています');
  } else {
    console.log('❌ 一部の設定が不足しています。DEPLOYMENT_CHECKLIST.mdを確認してください');
  }

  return allOk;
}

/**
 * ステップ2: 通知設定のテスト
 */
function testNotificationSettings() {
  console.log('===== 通知設定テスト開始 =====\n');

  const testUserId = 'test_user_' + new Date().getTime();
  const testMerchantId = 'FR251112004602';

  // 設定を保存
  console.log('【1】設定を保存中...');
  const saveResult = NotificationSettingsManager.saveSettings(
    testUserId,
    testMerchantId,
    {
      email: true,
      line: true,
      browser: false,
      alerts: {
        cancelApplication: true,
        deadlineExtension: true,
        appointmentReminder: false,
        callReminder: false
      }
    }
  );

  console.log('保存結果:', saveResult.success ? '✅ 成功' : '❌ 失敗');
  console.log('メッセージ:', saveResult.message);

  // 設定を取得
  console.log('\n【2】設定を取得中...');
  const settings = NotificationSettingsManager.getSettings(testUserId, testMerchantId);

  console.log('取得した設定:');
  console.log('  メール:', settings.email ? '✅ 有効' : '❌ 無効');
  console.log('  LINE:', settings.line ? '✅ 有効' : '❌ 無効');
  console.log('  ブラウザ:', settings.browser ? '✅ 有効' : '❌ 無効');
  console.log('  キャンセル申請通知:', settings.details?.cancelApplication ? '✅ 有効' : '❌ 無効');
  console.log('  期限延長通知:', settings.details?.deadlineExtension ? '✅ 有効' : '❌ 無効');

  // チャネル有効性を確認
  console.log('\n【3】チャネル有効性を確認中...');
  const emailEnabled = NotificationSettingsManager.isChannelEnabled(testUserId, 'email');
  const lineEnabled = NotificationSettingsManager.isChannelEnabled(testUserId, 'line');
  const browserEnabled = NotificationSettingsManager.isChannelEnabled(testUserId, 'browser');

  console.log('  メール有効:', emailEnabled ? '✅' : '❌');
  console.log('  LINE有効:', lineEnabled ? '✅' : '❌');
  console.log('  ブラウザ有効:', browserEnabled ? '✅' : '❌');

  console.log('\n===== 通知設定テスト完了 =====');

  return saveResult.success && settings.email === true && settings.line === true;
}

/**
 * ステップ3: AI理由生成のテスト
 */
function testAIReasonGeneration() {
  console.log('===== AI理由生成テスト開始 =====\n');

  // キャンセル申請却下理由のテスト
  console.log('【1】キャンセル申請却下理由を生成中...');
  const cancelData = {
    customerName: '田中太郎',
    phoneCallCount: 2,
    smsCount: 1,
    cancelReasonCategory: '電話繋がらず',
    cancelReasonDetail: '不在',
    lastContactDate: new Date(),
    hasActiveCompetitors: true,
    competitorDetails: [
      { merchantName: 'A社', phoneCount: 5, status: '追客中' },
      { merchantName: 'B社', phoneCount: 3, status: '追客中' }
    ]
  };

  const cancelResult = AIReasonGenerator.generateCancelRejectionReason(cancelData);

  console.log('生成成功:', cancelResult.success ? '✅' : '❌');
  console.log('フォールバック使用:', cancelResult.fallback ? '⚠️ はい' : '✅ いいえ');
  console.log('\n【生成された却下理由】');
  console.log(cancelResult.reason);
  console.log('');

  // 期限延長申請却下理由のテスト
  console.log('【2】期限延長申請却下理由を生成中...');
  const extensionData = {
    customerName: '鈴木花子',
    contactDate: new Date(),
    appointmentDate: null, // アポ未設定
    extensionReason: '顧客と連絡が取れた',
    phoneCallCount: 1,
    smsCount: 0
  };

  const extensionResult = AIReasonGenerator.generateExtensionRejectionReason(extensionData);

  console.log('生成成功:', extensionResult.success ? '✅' : '❌');
  console.log('フォールバック使用:', extensionResult.fallback ? '⚠️ はい' : '✅ いいえ');
  console.log('\n【生成された却下理由】');
  console.log(extensionResult.reason);

  console.log('\n===== AI理由生成テスト完了 =====');

  return cancelResult.success && extensionResult.success;
}

/**
 * ステップ4: テンプレート生成のテスト
 */
function testNotificationTemplates() {
  console.log('===== 通知テンプレート生成テスト開始 =====\n');

  // キャンセル承認テンプレート
  console.log('【1】キャンセル承認テンプレートを生成中...');
  const approvalTemplates = NotificationTemplates.generate('cancelApproval', {
    customerName: '田中太郎',
    applicationId: 'APP001',
    cvId: 'CV00001',
    approvedBy: '管理者',
    approvedAt: new Date()
  });

  if (approvalTemplates) {
    console.log('✅ テンプレート生成成功');
    console.log('  メール件名:', approvalTemplates.email.subject);
    console.log('  LINEメッセージ長:', approvalTemplates.line.message.length, '文字');
    console.log('  ブラウザ通知タイトル:', approvalTemplates.browser.title);
  } else {
    console.log('❌ テンプレート生成失敗');
  }

  // キャンセル却下テンプレート（AI理由付き）
  console.log('\n【2】キャンセル却下テンプレート（AI理由付き）を生成中...');
  const rejectionTemplates = NotificationTemplates.generate('cancelRejection', {
    customerName: '鈴木花子',
    applicationId: 'APP002',
    cvId: 'CV00002',
    rejectedBy: '管理者',
    rejectedAt: new Date(),
    aiReason: 'テスト用のAI生成理由です。追客を継続してください。'
  });

  if (rejectionTemplates) {
    console.log('✅ テンプレート生成成功');
    console.log('  メール件名:', rejectionTemplates.email.subject);
    console.log('  LINEメッセージプレビュー:');
    console.log('  ' + rejectionTemplates.line.message.substring(0, 100) + '...');
  } else {
    console.log('❌ テンプレート生成失敗');
  }

  console.log('\n===== 通知テンプレート生成テスト完了 =====');

  return approvalTemplates !== null && rejectionTemplates !== null;
}

/**
 * ステップ5: ブラウザ通知保存のテスト
 */
function testBrowserNotification() {
  console.log('===== ブラウザ通知保存テスト開始 =====\n');

  const testUserId = 'test_user_' + new Date().getTime();
  const testMerchantId = 'FR251112004602';

  const result = NotificationDispatcher.saveBrowserNotification(
    testUserId,
    testMerchantId,
    {
      title: 'テスト通知',
      body: 'これはテスト通知です',
      icon: '🔔'
    }
  );

  console.log('保存結果:', result.success ? '✅ 成功' : '❌ 失敗');
  console.log('メッセージ:', result.message);
  console.log('通知ID:', result.notificationId);

  console.log('\n===== ブラウザ通知保存テスト完了 =====');

  return result.success;
}

/**
 * 統合テスト: すべてのテストを順番に実行
 */
function runAllTests() {
  console.log('========================================');
  console.log('   通知システム 統合テスト');
  console.log('========================================\n');

  const results = {
    settings: false,
    notificationSettings: false,
    aiReason: false,
    templates: false,
    browserNotification: false
  };

  // 1. 必須設定チェック
  results.settings = checkRequiredSettings();
  console.log('\n');

  // 2. 通知設定テスト
  try {
    results.notificationSettings = testNotificationSettings();
  } catch (error) {
    console.error('通知設定テストエラー:', error);
  }
  console.log('\n');

  // 3. AI理由生成テスト
  try {
    results.aiReason = testAIReasonGeneration();
  } catch (error) {
    console.error('AI理由生成テストエラー:', error);
  }
  console.log('\n');

  // 4. テンプレート生成テスト
  try {
    results.templates = testNotificationTemplates();
  } catch (error) {
    console.error('テンプレート生成テストエラー:', error);
  }
  console.log('\n');

  // 5. ブラウザ通知保存テスト
  try {
    results.browserNotification = testBrowserNotification();
  } catch (error) {
    console.error('ブラウザ通知保存テストエラー:', error);
  }
  console.log('\n');

  // 結果サマリー
  console.log('========================================');
  console.log('   テスト結果サマリー');
  console.log('========================================');
  console.log('必須設定チェック:', results.settings ? '✅ PASS' : '❌ FAIL');
  console.log('通知設定テスト:', results.notificationSettings ? '✅ PASS' : '❌ FAIL');
  console.log('AI理由生成テスト:', results.aiReason ? '✅ PASS' : '❌ FAIL');
  console.log('テンプレート生成テスト:', results.templates ? '✅ PASS' : '❌ FAIL');
  console.log('ブラウザ通知保存テスト:', results.browserNotification ? '✅ PASS' : '❌ FAIL');
  console.log('========================================');

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('次のステップ: DEPLOYMENT_CHECKLIST.mdを参照してデプロイしてください');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました');
    console.log('DEPLOYMENT_CHECKLIST.mdのトラブルシューティングを確認してください');
  }

  return allPassed;
}

/**
 * Slack Bot Tokenを設定するヘルパー関数
 * @param {String} token - Slack Bot Token (xoxb-で始まる)
 */
function setSlackBotToken(token) {
  if (!token || !token.startsWith('xoxb-')) {
    console.error('❌ 無効なトークンです。トークンは xoxb- で始まる必要があります');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('SLACK_BOT_TOKEN', token);
  console.log('✅ SLACK_BOT_TOKEN設定完了');
  console.log('プレビュー:', token.substring(0, 20) + '...');
}

/**
 * OpenRouter API Keyを設定するヘルパー関数
 * @param {String} apiKey - OpenRouter API Key
 */
function setOpenRouterKey(apiKey) {
  if (!apiKey) {
    console.error('❌ APIキーが空です');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);
  console.log('✅ OPENROUTER_API_KEY設定完了');
  console.log('プレビュー:', apiKey.substring(0, 20) + '...');
}
