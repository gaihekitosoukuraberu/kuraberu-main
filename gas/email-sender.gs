// email-sender.gs
// メール送信管理システム

// 初回ログインメール送信
function sendWelcomeEmail(email, companyName, loginUrl) {
  // URLから加盟店IDを抽出
  const merchantId = decodeURIComponent(loginUrl).match(/merchantId":"([^"]+)"/)?.[1] || '不明';

  const subject = '【くらべる】加盟店登録完了・初回ログインのご案内';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Noto Sans JP', sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f7f7f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      padding: 30px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 14px 40px;
      text-decoration: none;
      border-radius: 8px;
      margin: 25px 0;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .warning {
      background: #fef3c7;
      padding: 15px 20px;
      border-left: 4px solid #f59e0b;
      margin: 25px 0;
      border-radius: 5px;
    }
    .warning-title {
      font-weight: bold;
      color: #d97706;
      margin-bottom: 8px;
      font-size: 15px;
    }
    .info-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      border: 1px solid #bae6fd;
    }
    .info-title {
      font-weight: bold;
      color: #0369a1;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .merchant-id {
      font-size: 24px;
      font-weight: bold;
      color: #0284c7;
      letter-spacing: 1px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }
    .center {
      text-align: center;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 5px 0;
      color: #92400e;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">くらべる</div>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
        加盟店管理システム
      </p>
    </div>

    <h2 style="color: #1e40af; margin-bottom: 25px;">
      加盟店登録完了のお知らせ
    </h2>

    <p><strong>${companyName}</strong> 様</p>

    <p>
      このたびは「くらべる」への加盟店登録をいただき、<br>
      誠にありがとうございます。
    </p>

    <p>
      審査が完了し、加盟店登録が承認されました。<br>
      以下の情報をご確認の上、初回ログインをお願いいたします。
    </p>

    <div class="info-box">
      <div class="info-title">あなたの加盟店ID</div>
      <div class="merchant-id">${merchantId}</div>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">
        ※この加盟店IDは今後のログイン時に必要となります。<br>
        大切に保管してください。
      </p>
    </div>

    <div class="center">
      <a href="${loginUrl}" class="button">
        初回ログインを開始する
      </a>
    </div>

    <div class="warning">
      <div class="warning-title">⚠️ 重要なお知らせ</div>
      <ul>
        <li>このリンクは<strong>24時間</strong>で無効になります</li>
        <li>クリック後、新しいパスワードを設定してください</li>
        <li>パスワードは8文字以上、英数字を含む必要があります</li>
        <li>パスワード設定完了後、すぐにサービスをご利用いただけます</li>
      </ul>
    </div>

    <p style="margin-top: 30px;">
      <strong>次のステップ：</strong>
    </p>
    <ol style="margin: 10px 0; padding-left: 25px; color: #4b5563;">
      <li>上記ボタンをクリックして初回ログインページへ</li>
      <li>新しいパスワードを設定</li>
      <li>プロフィール情報を確認・更新</li>
      <li>サービスの利用開始</li>
    </ol>

    <div class="footer">
      <p>
        <strong>ご不明な点がございましたら</strong><br>
        サポートデスク: support@kuraberu.com<br>
        営業時間: 平日 9:00-18:00
      </p>
      <p style="margin-top: 15px;">
        ※このメールに心当たりがない場合は、お手数ですが削除してください。<br>
        ※このメールアドレスは送信専用です。返信はできません。
      </p>
    </div>
  </div>
</body>
</html>`;

  // Gmail認証を使用してメール送信
  try {
    GmailApp.sendEmail(
      email,
      subject,
      '', // プレーンテキスト版（HTMLメールの簡易版）
      {
        from: 'info@gaihekikuraberu.com',
        name: 'くらべる運営事務局',
        htmlBody: htmlBody,
        replyTo: 'info@gaihekikuraberu.com'
      }
    );
    console.log(`初回メール送信成功 (Gmail): ${email} (${merchantId})`);
  } catch (gmailError) {
    // GmailApp失敗時はMailAppにフォールバック
    console.log('Gmail送信失敗、MailAppにフォールバック:', gmailError);
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        name: 'くらべる運営事務局',
        replyTo: 'info@gaihekikuraberu.com'
      });
      console.log(`初回メール送信成功 (MailApp): ${email} (${merchantId})`);
    } catch (mailError) {
      console.error('メール送信完全失敗:', mailError);
      throw new Error('メール送信に失敗しました');
    }
  }
}

// パスワードリセットメール送信
function sendPasswordResetEmail(email, resetUrl) {
  const subject = '【くらべる】パスワードリセットのご案内';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Noto Sans JP', sans-serif;
      line-height: 1.8;
      color: #333;
      background: #f7f7f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      padding: 30px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
      color: white;
      padding: 14px 40px;
      text-decoration: none;
      border-radius: 8px;
      margin: 25px 0;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }
    .warning {
      background: #fee2e2;
      padding: 15px 20px;
      border-left: 4px solid #ef4444;
      margin: 25px 0;
      border-radius: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #6b7280;
    }
    .center {
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">くらべる</div>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
        パスワードリセット
      </p>
    </div>

    <h2 style="color: #dc2626; margin-bottom: 25px;">
      パスワードリセットのご案内
    </h2>

    <p>
      パスワードリセットのリクエストを受け付けました。<br>
      以下のボタンから新しいパスワードを設定してください。
    </p>

    <div class="center">
      <a href="${resetUrl}" class="button">
        パスワードをリセットする
      </a>
    </div>

    <div class="warning">
      <strong>⚠️ ご注意</strong><br>
      ・このリンクは<strong>1時間</strong>で無効になります<br>
      ・心当たりがない場合は、このメールを削除してください<br>
      ・パスワードは他人に教えないでください
    </div>

    <div class="footer">
      <p>
        ※このメールに心当たりがない場合は削除してください<br>
        ※セキュリティ上の理由により、リンクは1時間で無効となります
      </p>
    </div>
  </div>
</body>
</html>`;

  // Gmail認証を使用してメール送信
  try {
    GmailApp.sendEmail(
      email,
      subject,
      '', // プレーンテキスト版
      {
        from: 'info@gaihekikuraberu.com',
        name: 'くらべる運営事務局',
        htmlBody: htmlBody,
        replyTo: 'info@gaihekikuraberu.com'
      }
    );
    console.log(`パスワードリセットメール送信成功 (Gmail): ${email}`);
  } catch (gmailError) {
    // GmailApp失敗時はMailAppにフォールバック
    console.log('Gmail送信失敗、MailAppにフォールバック:', gmailError);
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        name: 'くらべる運営事務局',
        replyTo: 'info@gaihekikuraberu.com'
      });
      console.log(`パスワードリセットメール送信成功 (MailApp): ${email}`);
    } catch (mailError) {
      console.error('メール送信完全失敗:', mailError);
      throw new Error('メール送信に失敗しました');
    }
  }
}

// 再送信機能
function resendWelcomeEmail(merchantId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('加盟店登録');
  const data = sheet.getDataRange().getValues();
  const merchant = data.find(row => row[1] === merchantId); // B列が登録ID

  if (merchant) {
    const newUrl = generateFirstLoginUrl(merchantId);
    sendWelcomeEmail(merchant[22], merchant[2], newUrl); // W列：メール、C列：会社名
    return {success: true, message: '再送信完了'};
  }
  return {error: '加盟店が見つかりません'};
}