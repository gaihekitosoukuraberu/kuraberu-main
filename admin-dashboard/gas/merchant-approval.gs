// merchant-approval.gs
// 加盟店承認処理と初回ログイン連携

// 既存の承認処理に追加
function approveRegistration(registrationId) {
  try {
    // 登録シートから データ取得
    const registrationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('加盟店登録');
    const registrationData = registrationSheet.getDataRange().getValues();
    const registrationRow = registrationData.find(row => row[1] === registrationId); // B列が登録ID

    if (!registrationRow) {
      return {error: '登録データが見つかりません'};
    }

    // ステータスを更新（同じシート内で更新）
    const rowIndex = registrationData.indexOf(registrationRow) + 1;
    // AJ列：ステータスを新規登録から準備中に変更
    registrationSheet.getRange(rowIndex, 36).setValue('準備中');
    // AK列：承認ステータスを申請中から承認済みに変更
    registrationSheet.getRange(rowIndex, 37).setValue('承認済み');
    // AL列：承認日時
    registrationSheet.getRange(rowIndex, 38).setValue(new Date());

    // 削除はしない（同じシート内で管理）

    // 初回ログインURL生成と送信
    const merchantId = registrationRow[1]; // B列：登録ID
    const email = registrationRow[22]; // W列：営業用メールアドレス
    const companyName = registrationRow[2]; // C列：会社名

    const loginUrl = generateFirstLoginUrl(merchantId);
    sendWelcomeEmail(email, companyName, loginUrl);

    console.log(`承認完了: ${merchantId} - ${companyName}`);
    return {
      success: true,
      message: '承認完了・初回ログインメール送信済み',
      merchantId: merchantId
    };

  } catch(error) {
    console.error('承認処理エラー:', error);
    return {error: error.toString()};
  }
}

// Web API エンドポイント
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);

    switch(params.action) {
      case 'verifyFirstLogin':
        const merchantId = verifySignedUrl(params.data, params.sig);
        return createResponse({
          success: merchantId !== null,
          merchantId: merchantId
        });

      case 'setPassword':
        // パスワード検証
        if (!validatePassword(params.password)) {
          return createResponse({
            error: 'パスワードは8文字以上で、英数字を含む必要があります'
          });
        }
        const result = savePassword(params.merchantId, params.password);
        return createResponse(result);

      case 'login':
        // ログイン試行回数チェック
        if (!checkLoginAttempts(params.merchantId)) {
          return createResponse({
            error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。'
          });
        }

        const isValid = verifyLogin(params.merchantId, params.password);

        if (isValid) {
          resetLoginAttempts(params.merchantId);
          // 加盟店情報を取得
          const merchantInfo = getMerchantInfo(params.merchantId);
          return createResponse({
            success: true,
            merchantInfo: merchantInfo
          });
        } else {
          return createResponse({
            error: '加盟店IDまたはパスワードが正しくありません'
          });
        }

      case 'requestPasswordReset':
        const resetUrl = generatePasswordResetUrl(params.email);
        if (resetUrl) {
          sendPasswordResetEmail(params.email, resetUrl);
          return createResponse({success: true});
        } else {
          return createResponse({
            error: 'メールアドレスが登録されていません'
          });
        }

      case 'resetPassword':
        const resetMerchantId = verifySignedUrl(params.data, params.sig);
        if (!resetMerchantId) {
          return createResponse({
            error: 'リセットリンクが無効または期限切れです'
          });
        }
        if (!validatePassword(params.password)) {
          return createResponse({
            error: 'パスワードは8文字以上で、英数字を含む必要があります'
          });
        }
        const resetResult = savePassword(resetMerchantId, params.password);
        return createResponse(resetResult);

      case 'resendWelcomeEmail':
        const resendResult = resendWelcomeEmail(params.merchantId);
        return createResponse(resendResult);

      case 'approveRegistration':
        const approveResult = approveRegistration(params.registrationId);
        return createResponse(approveResult);

      default:
        return createResponse({error: 'Invalid action'});
    }

  } catch(error) {
    console.error('API Error:', error);
    return createResponse({error: error.toString()});
  }
}

// レスポンス作成ヘルパー
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// パスワード検証
function validatePassword(password) {
  if (!password || password.length < 8) return false;

  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);

  return hasNumber && hasLetter;
}

// 加盟店情報取得
function getMerchantInfo(merchantId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('加盟店登録');
  const data = sheet.getDataRange().getValues();
  const merchant = data.find(row => row[1] === merchantId); // B列が登録ID

  if (merchant) {
    return {
      timestamp: merchant[0],        // A列：タイムスタンプ
      merchantId: merchant[1],       // B列：登録ID
      companyName: merchant[2],      // C列：会社名
      companyNameKana: merchant[3],  // D列：会社名カナ
      tradeName: merchant[4],        // E列：屋号
      tradeNameKana: merchant[5],    // F列：屋号カナ
      representativeName: merchant[6], // G列：代表者名
      representativeKana: merchant[7], // H列：代表者名カナ
      postalCode: merchant[8],       // I列：郵便番号
      address: merchant[9],          // J列：住所
      phone: merchant[10],           // K列：電話番号
      website: merchant[11],         // L列：ウェブサイトURL
      established: merchant[12],     // M列：設立年月
      prText: merchant[13],          // N列：PRテキスト
      branchName: merchant[14],      // O列：支店名
      branchAddress: merchant[15],   // P列：支店住所
      termsAgreed: merchant[16],     // Q列：利用規約同意
      idDocType: merchant[17],       // R列：本人確認書類種類
      idDocUrl1: merchant[18],       // S列：本人確認書類URL1
      idDocUrl2: merchant[19],       // T列：本人確認書類URL2
      infoConfirmed: merchant[20],   // U列：情報確認同意
      billingEmail: merchant[21],    // V列：請求用メールアドレス
      salesEmail: merchant[22],      // W列：営業用メールアドレス
      salesPersonName: merchant[23], // X列：営業担当者氏名
      salesPersonKana: merchant[24], // Y列：営業担当者カナ
      employees: merchant[25],       // Z列：従業員数
      salesScale: merchant[26],      // AA列：売上規模
      propertyTypes: merchant[27],   // AB列：対応可能物件種別
      maxFloors: merchant[28],       // AC列：最大対応階数
      buildingAge: merchant[29],     // AD列：築年数対応範囲
      workAreas: merchant[30],       // AE列：施工箇所
      specialItems: merchant[31],    // AF列：特殊対応項目
      prefectures: merchant[32],     // AG列：対応都道府県
      cities: merchant[33],          // AH列：対応市区町村
      priorityAreas: merchant[34],   // AI列：優先エリア
      status: merchant[35],          // AJ列：ステータス
      approvalStatus: merchant[36],  // AK列：承認ステータス
      registrationDate: merchant[37], // AL列：登録日時
      approver: merchant[38],        // AM列：承認者
      rejectionReason: merchant[39]  // AN列：却下理由
    };
  }
  return null;
}

// doGetハンドラー（テスト用）
function doGet(e) {
  return HtmlService.createHtmlOutput('API is running');
}