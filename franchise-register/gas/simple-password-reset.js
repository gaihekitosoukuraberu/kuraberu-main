/**
 * シンプルなパスワードリセット（HTMLページなし版）
 * 新しいパスワードをランダム生成してメールで送る
 */
function simplePasswordReset(merchantId) {
  console.log('===== シンプルパスワードリセット =====');

  try {
    // 加盟店情報を取得
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();

    // 加盟店を検索
    const rowIndex = data.findIndex(row => row[1] === merchantId);
    if (rowIndex < 1) {
      return {success: false, error: '加盟店が見つかりません'};
    }

    const merchant = data[rowIndex];
    const email = merchant[22]; // W列：メールアドレス
    const companyName = merchant[2]; // C列：会社名

    // ランダムパスワード生成（英大文字小文字数字記号を含む12文字）
    const newPassword = generateRandomPassword();

    console.log('新しいパスワード生成:', newPassword);
    console.log('送信先:', email);

    // シンプルなパスワード通知メール送信
    sendSimplePasswordEmail(email, companyName, merchantId, newPassword);

    return {
      success: true,
      message: '新しいパスワードをメールで送信しました',
      details: {
        merchantId: merchantId,
        companyName: companyName,
        email: email
      }
    };

  } catch (error) {
    console.error('エラー:', error);
    return {success: false, error: error.toString()};
  }
}

/**
 * ランダムパスワード生成
 */
function generateRandomPassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%';

  let password = '';

  // 各種文字を最低1つずつ含める
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // 残り8文字をランダムに追加
  const allChars = upper + lower + numbers + symbols;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // シャッフル
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * シンプルなパスワード通知メール
 */
function sendSimplePasswordEmail(email, companyName, merchantId, newPassword) {
  const subject = '【外壁塗装くらべる】新しいパスワードのお知らせ';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.8;
      color: #333;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 30px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 10px;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
    }
    .password-box {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #3b82f6;
      text-align: center;
    }
    .password {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      letter-spacing: 2px;
      font-family: monospace;
    }
    .warning {
      background: #fef3c7;
      padding: 15px;
      border-left: 4px solid #f59e0b;
      margin: 20px 0;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">外壁塗装くらべる</div>
      <p style="margin: 10px 0; color: #6b7280;">加盟店管理システム</p>
    </div>

    <h2 style="color: #1e40af;">新しいパスワードのお知らせ</h2>

    <p>${companyName} 様</p>

    <p>パスワードをリセットしました。<br>
    以下の新しいパスワードでログインしてください。</p>

    <div class="password-box">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">加盟店ID</p>
      <p style="font-size: 20px; font-weight: bold; margin: 5px 0;">${merchantId}</p>
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">新しいパスワード</p>
      <p class="password">${newPassword}</p>
    </div>

    <div class="warning">
      <strong>⚠️ ご注意</strong><br>
      • このパスワードは自動生成されました<br>
      • ログイン後、必要に応じて変更してください<br>
      • パスワードは大切に保管してください
    </div>

    <p style="margin-top: 30px; text-align: center;">
      <strong>ログインページ</strong><br>
      ※ 現在、ログインページは準備中です<br>
      後日、ログインURLをお送りします
    </p>

    <p style="margin-top: 30px; font-size: 13px; color: #6b7280;">
      ※このメールは管理者による確認後に送信されています<br>
      ※ご不明な点はサポートまでお問い合わせください<br>
      info@gaihekikuraberu.com
    </p>
  </div>
</body>
</html>`;

  // メール送信
  try {
    GmailApp.sendEmail(
      email,
      subject,
      `新しいパスワード: ${newPassword}`, // プレーンテキスト版
      {
        from: 'info@gaihekikuraberu.com',
        name: '外壁塗装くらべる運営事務局',
        htmlBody: htmlBody,
        replyTo: 'info@gaihekikuraberu.com'
      }
    );
    console.log(`パスワード通知メール送信成功: ${email}`);
  } catch (error) {
    console.error('メール送信エラー:', error);
    throw error;
  }
}

/**
 * テスト用：シンプルリセットを実行
 */
function testSimpleReset() {
  const merchantId = 'FR09191528';
  const result = simplePasswordReset(merchantId);
  console.log('結果:', result);
  return result;
}