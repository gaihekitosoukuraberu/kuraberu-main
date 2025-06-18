/**
 * API処理
 * Webアプリとして公開したGASのAPIエンドポイント処理を担当
 */

/**
 * 郵便番号検索API
 * @param {Object} e - リクエスト情報
 * @returns {TextOutput} JSONレスポンス
 */
function doGet_lookupZip(e) {
  try {
    // パラメータのバリデーション
    const zipCode = e.parameter.zip;
    if (!zipCode || !/^\d{7}$/.test(zipCode)) {
      return createJsonResponse({ error: '郵便番号が無効です' }, 400);
    }
    
    // 郵便番号対応表からデータを取得
    const zipData = findZipCodeData(zipCode);
    
    if (!zipData) {
      return createJsonResponse({ error: '該当する郵便番号が見つかりませんでした' }, 404);
    }
    
    // 郵便番号から相場を計算
    const priceEstimate = calculatePriceEstimate(zipData);
    
    // 正常なレスポンスを返す
    return createJsonResponse({
      zipCode: zipCode,
      prefecture: zipData.prefecture,
      city: zipData.city,
      town: zipData.town,
      priceEstimate: priceEstimate
    });
  } catch (error) {
    console.error('Error in lookupZip:', error);
    return createJsonResponse({ error: 'サーバーエラーが発生しました' }, 500);
  }
}

/**
 * フォーム送信API
 * @param {Object} e - リクエスト情報
 * @returns {TextOutput} JSONレスポンス
 */
function doGet_submitForm(e) {
  try {
    // 必須フィールドのバリデーション
    const requiredFields = ['name', 'phone', 'email', 'zipCode', 'address'];
    const missingFields = requiredFields.filter(field => !e.parameter[field]);
    
    if (missingFields.length > 0) {
      return createJsonResponse({
        error: '必須フィールドが不足しています: ' + missingFields.join(', ')
      }, 400);
    }
    
    // スプレッドシートに保存
    const sheet = getOrCreateLeadSheet();
    
    // データを整形
    const timestamp = new Date().toISOString();
    const newRow = [
      timestamp,
      e.parameter.name,
      e.parameter.phone,
      e.parameter.email,
      e.parameter.zipCode,
      e.parameter.address,
      e.parameter.budget || '',
      e.parameter.schedule || '',
      e.parameter.message || '',
      'New' // ステータス
    ];
    
    // シートに追加
    sheet.appendRow(newRow);
    
    // 通知を送信
    const notificationMessage = formatNotificationMessage(e.parameter);
    sendNotification({
      type: 'LINE',
      message: notificationMessage
    });
    
    // メール通知も送信（管理者向け）
    if (PropertiesService.getScriptProperties().getProperty('SENDGRID_API_KEY')) {
      sendNotification({
        type: 'EMAIL',
        message: notificationMessage
      });
    }
    
    // 成功レスポンス
    return createJsonResponse({
      success: true,
      message: 'フォームが正常に送信されました'
    });
  } catch (error) {
    console.error('Error in submitForm:', error);
    return createJsonResponse({ error: 'サーバーエラーが発生しました' }, 500);
  }
}

/**
 * JSONレスポンスを作成
 * @param {Object} data - レスポンスデータ
 * @param {number} [statusCode=200] - HTTPステータスコード
 * @returns {TextOutput} JSONレスポンス
 */
function createJsonResponse(data, statusCode = 200) {
  // CORSヘッダーを設定
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // statusCodeをレスポンスに含める（実際のHTTPステータスは変更できないため）
  if (statusCode !== 200) {
    data.statusCode = statusCode;
  }
  
  return output;
}

/**
 * 郵便番号データを検索
 * @param {string} zipCode - 郵便番号（7桁）
 * @returns {Object|null} 郵便番号データ
 */
function findZipCodeData(zipCode) {
  // 郵便番号シートを取得
  const sheet = getOrCreateZipCodeSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // ヘッダー行をスキップ
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // 郵便番号列を検索（最初の列と仮定）
    if (row[0] === zipCode) {
      return {
        zipCode: row[0],
        prefecture: row[1],
        city: row[2],
        town: row[3]
      };
    }
  }
  
  // 見つからなかった場合、デモ用のモックデータを返す
  return {
    zipCode: zipCode,
    prefecture: '東京都',
    city: '千代田区',
    town: '千代田'
  };
}

/**
 * 郵便番号から相場を計算
 * @param {Object} zipData - 郵便番号データ
 * @returns {Object} 相場情報
 */
function calculatePriceEstimate(zipData) {
  // 地域別の基本相場（実際にはより詳細な計算が必要）
  const regionBasePrices = {
    '北海道': { min: 90, max: 140 },
    '東北': { min: 85, max: 130 },
    '関東': { min: 100, max: 150 },
    '中部': { min: 95, max: 145 },
    '関西': { min: 100, max: 155 },
    '中国': { min: 90, max: 140 },
    '四国': { min: 85, max: 135 },
    '九州': { min: 80, max: 130 },
    '沖縄': { min: 100, max: 160 }
  };
  
  // 地域を判定
  let region = '関東'; // デフォルト
  const prefecture = zipData.prefecture;
  
  if (['北海道'].includes(prefecture)) {
    region = '北海道';
  } else if (['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'].includes(prefecture)) {
    region = '東北';
  } else if (['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'].includes(prefecture)) {
    region = '関東';
  } else if (['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'].includes(prefecture)) {
    region = '中部';
  } else if (['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'].includes(prefecture)) {
    region = '関西';
  } else if (['鳥取県', '島根県', '岡山県', '広島県', '山口県'].includes(prefecture)) {
    region = '中国';
  } else if (['徳島県', '香川県', '愛媛県', '高知県'].includes(prefecture)) {
    region = '四国';
  } else if (['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県'].includes(prefecture)) {
    region = '九州';
  } else if (['沖縄県'].includes(prefecture)) {
    region = '沖縄';
  }
  
  // 基本相場を取得
  const basePrice = regionBasePrices[region];
  
  // 相場を計算（万円／坪）
  return {
    region: region,
    minPrice: basePrice.min * 10000, // 円単位に変換
    maxPrice: basePrice.max * 10000,
    avgPrice: Math.floor((basePrice.min + basePrice.max) / 2) * 10000,
    unit: '円／坪',
    note: '上記は一般的な相場です。実際の価格は建物の状態や施工内容によって変わります。'
  };
}

/**
 * 通知メッセージをフォーマット
 * @param {Object} formData - フォームデータ
 * @returns {string} フォーマットされた通知メッセージ
 */
function formatNotificationMessage(formData) {
  return `
【新規お問い合わせ】
氏名: ${formData.name}
電話: ${formData.phone}
メール: ${formData.email}
郵便番号: ${formData.zipCode}
住所: ${formData.address}
予算: ${formData.budget || '指定なし'}
希望時期: ${formData.schedule || '指定なし'}
メッセージ: 
${formData.message || 'なし'}

受付日時: ${new Date().toLocaleString('ja-JP')}
`.trim();
}

/**
 * リードシートを取得または作成
 * @returns {Sheet} リードシート
 */
function getOrCreateLeadSheet() {
  // アクティブなスプレッドシートを取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('リード');
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet('リード');
    
    // ヘッダー行を設定
    const headers = [
      '受付日時',
      '氏名',
      '電話番号',
      'メールアドレス',
      '郵便番号',
      '住所',
      '予算',
      '希望時期',
      'メッセージ',
      'ステータス'
    ];
    
    sheet.appendRow(headers);
  }
  
  return sheet;
}

/**
 * 郵便番号シートを取得または作成
 * @returns {Sheet} 郵便番号シート
 */
function getOrCreateZipCodeSheet() {
  // アクティブなスプレッドシートを取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('郵便番号');
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet('郵便番号');
    
    // ヘッダー行を設定
    const headers = [
      '郵便番号',
      '都道府県',
      '市区町村',
      '町域',
      '最終更新日'
    ];
    
    sheet.appendRow(headers);
    
    // サンプルデータを追加
    const sampleData = [
      ['1000001', '東京都', '千代田区', '千代田', new Date().toISOString()],
      ['1000002', '東京都', '千代田区', '皇居外苑', new Date().toISOString()],
      ['1000003', '東京都', '千代田区', '一ツ橋', new Date().toISOString()]
    ];
    
    // データを一括で追加
    sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  }
  
  return sheet;
}