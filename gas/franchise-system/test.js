/**
 * Slack通知テスト関数
 */
function testSlackNotification() {
  console.log('=== Slack通知テスト開始 ===');

  // テストデータ
  const testData = {
    registrationId: 'TEST' + new Date().getTime(),
    companyName: 'テスト会社',
    companyInfo: {
      legalName: '株式会社テスト',
      representative: 'テスト太郎',
      phone: '03-1234-5678',
      fullAddress: '東京都テスト区テスト1-2-3',
      branches: [
        {name: 'テスト支店', address: 'テスト県テスト市'}
      ]
    },
    selectedPrefectures: ['東京都']
  };

  try {
    // Slack通知関数を直接呼び出し
    const result = sendSlackRegistrationNotification(testData);
    console.log('テスト結果:', result);
    return result;
  } catch (error) {
    console.error('テストエラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Webhookテスト
 */
function testWebhook() {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URLが設定されていません');
    return;
  }

  console.log('Webhook URL取得成功（最初の30文字）:', webhookUrl.substring(0, 30));

  const testMessage = {
    text: 'テストメッセージ from GAS ' + new Date().toISOString()
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(testMessage),
      muteHttpExceptions: true
    });

    console.log('レスポンスコード:', response.getResponseCode());
    console.log('レスポンス内容:', response.getContentText());

    return {
      success: response.getResponseCode() === 200,
      code: response.getResponseCode(),
      content: response.getContentText()
    };
  } catch (error) {
    console.error('Webhookエラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * メール送信テスト
 * GASエディタから実行してメールが送信されるか確認
 */
function testEmailSending() {
  console.log('=== メール送信テスト開始 ===');

  try {
    // テスト用メールアドレス
    const testEmail = 'ryuryumauchi@gmail.com';
    const testMerchantId = 'TEST123';
    const testCompanyName = 'テスト株式会社';

    // URL生成
    console.log('URL生成中...');
    const loginUrl = generateFirstLoginUrl(testMerchantId);
    console.log('生成されたURL:', loginUrl);

    // メール送信
    console.log('メール送信中...');
    console.log('送信先:', testEmail);
    console.log('会社名:', testCompanyName);

    sendWelcomeEmail(testEmail, testCompanyName, loginUrl);

    console.log('=== メール送信テスト完了 ===');
    return 'テストメール送信成功';

  } catch (error) {
    console.error('メール送信テストエラー:', error);
    console.error('エラー詳細:', error.stack);
    return 'メール送信失敗: ' + error.toString();
  }
}

/**
 * シンプルメール送信テスト（最小構成）
 */
function testSimpleEmail() {
  console.log('=== シンプルメールテスト ===');

  try {
    // MailAppを直接使用
    MailApp.sendEmail({
      to: 'ryuryumauchi@gmail.com',
      subject: 'テストメール from GAS',
      body: 'これはGASからのテストメールです。\n\nメールが届いていれば、メール送信機能は正常です。\n\n送信日時: ' + new Date()
    });

    console.log('シンプルメール送信成功');
    return 'メール送信成功';

  } catch (error) {
    console.error('シンプルメールエラー:', error);
    return 'メール送信失敗: ' + error.toString();
  }
}