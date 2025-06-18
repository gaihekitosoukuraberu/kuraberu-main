/**
 * 通知サービス
 * LINE・メールでの通知機能を提供します
 */

/**
 * 通知を送信する関数
 * @param {Object} opt - 通知オプション
 * @param {string} opt.type - 通知タイプ ('LINE' または 'EMAIL')
 * @param {string} opt.message - 通知メッセージ
 * @param {string} [opt.lineToken] - カスタムLINEトークン（省略時はスクリプトプロパティから取得）
 * @param {string} [opt.email] - 通知先メールアドレス（EMAIL時のみ）
 * @returns {HTTPResponse} 通知サービスからのレスポンス
 */
function sendNotification(opt) {
  const { type, message } = opt;
  if (!type || !message) throw new Error('type / message required');

  if (type === 'LINE') {
    const token =
      opt.lineToken || PropertiesService.getScriptProperties().getProperty('LINE_NOTIFY_TOKEN');
    const payload = { message };
    const res = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
      method: 'post',
      payload: payload,
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    });
    return res;
  }

  if (type === 'EMAIL') {
    const apiKey = PropertiesService.getScriptProperties().getProperty('SENDGRID_API_KEY');
    const body = {
      personalizations: [{ to: [{ email: opt.email || getDefaultEmail() }] }],
      from: { email: 'no-reply@kuraberu.jp', name: '外壁塗装くらべる' },
      subject: '【くらべる】新規リードが入りました',
      content: [{ type: 'text/plain', value: message }],
    };
    const res = UrlFetchApp.fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'post',
      payload: JSON.stringify(body),
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true,
    });
    return res;
  }

  throw new Error('Unsupported notification type: ' + type);
}

/**
 * デフォルトの通知先メールアドレスを取得
 * @returns {string} デフォルトメールアドレス
 */
function getDefaultEmail() {
  return PropertiesService.getScriptProperties().getProperty('DEFAULT_NOTIFICATION_EMAIL') 
    || Session.getActiveUser().getEmail()
    || 'admin@kuraberu.jp';
}

/**
 * LINE通知のテスト
 * デプロイ確認用の関数
 */
function testLineNotify() {
  try {
    const res = sendNotification({
      type: 'LINE',
      message: '通知テスト: ' + new Date().toLocaleString('ja-JP')
    });
    
    Logger.log('LINE通知テスト結果:');
    Logger.log('ステータスコード: ' + res.getResponseCode());
    Logger.log('レスポンス: ' + res.getContentText());
    
    return res.getResponseCode() === 200;
  } catch (error) {
    Logger.log('LINE通知テストエラー: ' + error.message);
    return false;
  }
}

/**
 * メール通知のテスト
 * デプロイ確認用の関数
 * @param {string} [testEmail] - テスト用メールアドレス
 */
function testEmailNotify(testEmail) {
  try {
    const email = testEmail || PropertiesService.getScriptProperties().getProperty('TEST_EMAIL');
    
    if (!email) {
      Logger.log('テスト用メールアドレスが指定されていません');
      return false;
    }
    
    const res = sendNotification({
      type: 'EMAIL',
      message: '通知テスト: ' + new Date().toLocaleString('ja-JP'),
      email: email
    });
    
    Logger.log('メール通知テスト結果:');
    Logger.log('ステータスコード: ' + res.getResponseCode());
    Logger.log('レスポンス: ' + res.getContentText());
    
    return res.getResponseCode() === 202; // SendGridは成功時に202を返す
  } catch (error) {
    Logger.log('メール通知テストエラー: ' + error.message);
    return false;
  }
}

/**
 * 通知設定の確認
 * スクリプトプロパティに必要な設定があるか確認
 * @returns {Object} 設定ステータス
 */
function checkNotificationSettings() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const properties = scriptProperties.getProperties();
  
  const results = {
    LINE: {
      configured: Boolean(properties.LINE_NOTIFY_TOKEN),
      token: properties.LINE_NOTIFY_TOKEN ? '設定済み（表示されません）' : '未設定'
    },
    EMAIL: {
      configured: Boolean(properties.SENDGRID_API_KEY),
      apiKey: properties.SENDGRID_API_KEY ? '設定済み（表示されません）' : '未設定',
      defaultEmail: getDefaultEmail()
    }
  };
  
  return results;
}