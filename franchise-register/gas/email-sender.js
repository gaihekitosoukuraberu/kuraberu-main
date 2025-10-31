// email-sender.gs
// メール送信管理システム

// 初回ログインメール送信
function sendWelcomeEmail(email, companyName, loginUrl, merchantId) {
  try {
    // merchantIdが渡されていない場合はURLから抽出を試みる
    if (!merchantId) {
      merchantId = decodeURIComponent(loginUrl).match(/merchantId":"([^"]+)"/)?.[1] || '不明';
    }

    console.log('[email-sender] sendWelcomeEmail開始');
    console.log('[email-sender] email:', email);
    console.log('[email-sender] companyName:', companyName);
    console.log('[email-sender] merchantId:', merchantId);

    const subject = '【外壁塗装くらべる】加盟店登録完了・初回ログインのご案内';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif; line-height: 1.8; color: #333; background: #f7f7f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .warning { background: #fef3c7; padding: 15px 20px; border-left: 4px solid #f59e0b; margin: 25px 0; border-radius: 5px; }
    .info-box { background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #bae6fd; }
    .merchant-id { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }
    .button-table { width: 100%; margin: 25px 0; }
    .button-cell { text-align: center; padding: 0; }
    .button-link { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">外壁塗装くらべる</div>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">加盟店管理システム</p>
    </div>
    <h2 style="color: #1e40af; margin-bottom: 25px;">加盟店登録完了のお知らせ</h2>

    <p><strong>${companyName}</strong> 様</p>
    <p>このたびは「外壁塗装くらべる」への加盟店登録をいただき、誠にありがとうございます。</p>
    <p>審査が完了し、加盟店登録が承認されました。<br>以下の情報をご確認の上、<strong>必ず24時間以内に</strong>初回ログインをお願いいたします。</p>
    <div class="warning">
      <div style="font-weight: bold; color: #d97706; margin-bottom: 8px; font-size: 15px;">⚠️ 必ずお読みください</div>
      <p style="margin: 5px 0; font-size: 14px; line-height: 1.6;">
        初回ログイン＝即配信開始ではございませんので、ご安心ください。<br>
        ただし、システムの都合上、<strong>このリンクは24時間で無効</strong>になりますので、<br>
        お手数ですが初回ログインは必ずすぐに行っていただけますようお願いいたします。
      </p>
    </div>
    <div class="info-box">
      <div style="font-weight: bold; color: #0369a1; font-size: 14px; margin-bottom: 5px;">あなたの加盟店ID</div>
      <div class="merchant-id">${merchantId}</div>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">※この加盟店IDは今後のログイン時に必要となります。大切に保管してください。</p>
    </div>
    <table class="button-table" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="button-cell">
          <a href="${loginUrl}" class="button-link">初回ログインを開始する</a>
        </td>
      </tr>
    </table>
    <div style="background: #f0f9ff; padding: 15px 20px; border-radius: 5px; margin: 25px 0; font-size: 14px;">
      <div style="font-weight: bold; color: #0369a1; margin-bottom: 8px;">初回ログイン時の設定内容</div>
      <ul style="margin: 5px 0; padding-left: 20px; line-height: 1.8;">
        <li>新しいパスワードを設定してください</li>
        <li>パスワードは8文字以上、英数字を含む必要があります</li>
        <li>設定後、すぐに加盟店ダッシュボードをご利用いただけます</li>
      </ul>
    </div>
    <div class="footer">
      <p><strong>ご不明な点がございましたら</strong><br>サポートデスク: info@gaihekikuraberu.com<br>営業時間: 9:00-18:00</p>
      <p style="margin-top: 15px;">※このメールに心当たりがない場合は、お手数ですが削除してください。</p>
    </div>
  </div>
</body>
</html>`;

    // メール送信（MailAppを使用 - fromアドレスはGoogleアカウントのメールになる）
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: '外壁塗装くらべる運営事務局'
      // replyToを削除（なりすまし防止）
    });
    console.log('[email-sender] 初回メール送信成功:', email, merchantId);
  } catch (mailError) {
    console.error('[email-sender] メール送信失敗:', mailError);
    console.error('[email-sender] エラー詳細:', mailError.stack);
    throw new Error('メール送信に失敗しました: ' + mailError.toString());
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
      パス��ードリセットのリクエストを受け付けました。<br>
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

  // メール送信（MailAppを使用）
  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: '外壁塗装くらべる運営事務局'
      // replyToを削除（なりすまし防止）
    });
    console.log(`パスワードリセットメール送信成功: ${email}`);
  } catch (mailError) {
    console.error('メール送信失敗:', mailError);
    console.error('エラー詳細:', mailError.stack);
    throw new Error('メール送信に失敗しました: ' + mailError.toString());
  }
}

// 初回ログインURL生成関数（auth-manager.gsの関数を使用）
// この関数は互換性のために残しているが、実際はauth-manager.gsのgenerateFirstLoginUrlを使用
// function generateFirstLoginUrl(merchantId) {
//   return auth-manager.generateFirstLoginUrl(merchantId);
// }

// 再送信機能
function resendWelcomeEmail(merchantId) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');

  if (!SPREADSHEET_ID) {
    console.error('SPREADSHEET_IDが設定されていません');
    return {error: 'システム設定エラー'};
  }

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();
    const merchant = data.find(row => row[1] === merchantId); // B列が登録ID

    if (merchant && merchant.length > 22) {
      const email = merchant[22]; // W列：メールアドレス
      const companyName = merchant[2]; // C列：会社名

      if (!email || !companyName) {
        return {error: 'メールアドレスまたは会社名が見つかりません'};
      }

      const newUrl = generateFirstLoginUrl(merchantId);
      sendWelcomeEmail(email, companyName, newUrl, merchantId);
      return {success: true, message: '再送信完了'};
    }
    return {error: '加盟店が見つかりません'};
  } catch (error) {
    console.error('再送信エラー:', error);
    return {error: 'メール再送信に失敗しました'};
  }
}
