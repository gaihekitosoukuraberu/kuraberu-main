/**
 * 加盟店データ管理ハンドラー
 * キャッシュ機能付きデータ取得・更新
 */

/**
 * キャッシュ付き加盟店情報取得
 * @param {string} merchantId - 加盟店ID
 * @return {Object} 加盟店情報
 */
function getMerchantInfoWithCache(merchantId) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `merchant_${merchantId}`;

  // キャッシュチェック
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Cache hit for:', merchantId);
    return JSON.parse(cached);
  }

  // キャッシュミスの場合、通常の取得
  const data = getMerchantInfo(merchantId);

  if (data) {
    // 5分間キャッシュ
    cache.put(cacheKey, JSON.stringify(data), 300);
    console.log('Cached data for:', merchantId);
  }

  return data;
}

/**
 * 加盟店情報取得（スプレッドシートから）
 * @param {string} merchantId - 加盟店ID
 * @return {Object|null} 加盟店情報
 */
function getMerchantInfo(merchantId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('加盟店登録');
  const data = sheet.getDataRange().getValues();
  const merchant = data.find(row => row[1] === merchantId); // B列が登録ID

  if (merchant) {
    console.log('Merchant data found for ID:', merchantId);

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
      prText: merchant[13],          // N列：PRテキスト（完全版）
      prTextFull: merchant[13],      // N列の完全版を別フィールドでも提供
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

/**
 * 加盟店データ更新
 * @param {string} merchantId - 加盟店ID
 * @param {Object} updates - 更新データ
 * @return {Object} 結果
 */
function updateMerchantData(merchantId, updates) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(row => row[1] === merchantId) + 1;

    if (rowIndex === 0) {
      return {success: false, error: '加盟店が見つかりません'};
    }

    // 各カラムを更新（updatesオブジェクトに含まれるフィールドのみ）
    if (updates.companyName !== undefined) sheet.getRange(rowIndex, 3).setValue(updates.companyName); // C列
    if (updates.companyNameKana !== undefined) sheet.getRange(rowIndex, 4).setValue(updates.companyNameKana); // D列
    if (updates.tradeName !== undefined) sheet.getRange(rowIndex, 5).setValue(updates.tradeName); // E列
    if (updates.tradeNameKana !== undefined) sheet.getRange(rowIndex, 6).setValue(updates.tradeNameKana); // F列
    if (updates.representative !== undefined) sheet.getRange(rowIndex, 7).setValue(updates.representative); // G列
    if (updates.representativeKana !== undefined) sheet.getRange(rowIndex, 8).setValue(updates.representativeKana); // H列
    if (updates.zipCode !== undefined) sheet.getRange(rowIndex, 9).setValue(updates.zipCode); // I列
    if (updates.address !== undefined) sheet.getRange(rowIndex, 10).setValue(updates.address); // J列
    if (updates.phone !== undefined) sheet.getRange(rowIndex, 11).setValue(updates.phone); // K列
    if (updates.website !== undefined) sheet.getRange(rowIndex, 12).setValue(updates.website); // L列
    if (updates.established !== undefined) sheet.getRange(rowIndex, 13).setValue(updates.established); // M列
    if (updates.prText !== undefined) sheet.getRange(rowIndex, 14).setValue(updates.prText); // N列
    if (updates.branchName !== undefined) sheet.getRange(rowIndex, 15).setValue(updates.branchName); // O列
    if (updates.branchAddress !== undefined) sheet.getRange(rowIndex, 16).setValue(updates.branchAddress); // P列
    if (updates.billingEmail !== undefined) sheet.getRange(rowIndex, 22).setValue(updates.billingEmail); // V列
    if (updates.salesEmail !== undefined) sheet.getRange(rowIndex, 23).setValue(updates.salesEmail); // W列
    if (updates.salesPersonName !== undefined) sheet.getRange(rowIndex, 24).setValue(updates.salesPersonName); // X列
    if (updates.salesPersonKana !== undefined) sheet.getRange(rowIndex, 25).setValue(updates.salesPersonKana); // Y列
    if (updates.employees !== undefined) sheet.getRange(rowIndex, 26).setValue(updates.employees); // Z列
    if (updates.salesScale !== undefined) sheet.getRange(rowIndex, 27).setValue(updates.salesScale); // AA列

    // 配列データの処理（カンマ区切りで保存）
    if (updates.propertyTypes !== undefined) {
      const value = Array.isArray(updates.propertyTypes) ? updates.propertyTypes.join('、') : updates.propertyTypes;
      sheet.getRange(rowIndex, 28).setValue(value); // AB列
    }
    if (updates.areas !== undefined) {
      const value = Array.isArray(updates.areas) ? updates.areas.join('、') : updates.areas;
      sheet.getRange(rowIndex, 33).setValue(value); // AG列
    }
    if (updates.constructionTypes !== undefined) {
      const value = Array.isArray(updates.constructionTypes) ? updates.constructionTypes.join('、') : updates.constructionTypes;
      sheet.getRange(rowIndex, 31).setValue(value); // AE列
    }

    if (updates.maxFloors !== undefined) sheet.getRange(rowIndex, 29).setValue(updates.maxFloors); // AC列
    if (updates.buildingAge !== undefined) sheet.getRange(rowIndex, 30).setValue(updates.buildingAge); // AD列
    if (updates.specialItems !== undefined) sheet.getRange(rowIndex, 32).setValue(updates.specialItems); // AF列
    if (updates.cities !== undefined) sheet.getRange(rowIndex, 34).setValue(updates.cities); // AH列
    if (updates.priorityAreas !== undefined) sheet.getRange(rowIndex, 35).setValue(updates.priorityAreas); // AI列

    // キャッシュをクリア
    const cache = CacheService.getScriptCache();
    cache.remove(`merchant_${merchantId}`);

    console.log(`Updated merchant data for: ${merchantId}`);
    return {success: true, message: 'データを更新しました'};

  } catch(error) {
    console.error('Update error:', error);
    return {success: false, error: error.toString()};
  }
}

/**
 * 加盟店データ取得ハンドラー（router.gsから呼ばれる）
 */
function handleGetMerchantData(data) {
  if (!data.merchantId) {
    return createResponse(false, '加盟店IDが必要です');
  }

  const merchantData = getMerchantInfoWithCache(data.merchantId);

  if (merchantData) {
    return createResponse(true, 'データ取得成功', {
      // 会社基本情報
      companyName: merchantData.companyName || '',
      companyNameKana: merchantData.companyNameKana || '',
      tradeName: merchantData.tradeName || '',
      tradeNameKana: merchantData.tradeNameKana || '',
      representative: merchantData.representativeName || '',
      representativeKana: merchantData.representativeKana || '',

      // 連絡先情報
      zipCode: merchantData.postalCode || '',
      address: merchantData.address || '',
      phone: merchantData.phone || '',
      website: merchantData.website || '',
      established: merchantData.established || '',

      // 支店情報
      branchName: merchantData.branchName || '',
      branchAddress: merchantData.branchAddress || '',

      // メール情報
      billingEmail: merchantData.billingEmail || '',
      salesEmail: merchantData.salesEmail || '',
      email: merchantData.salesEmail || merchantData.billingEmail || '',
      salesPersonName: merchantData.salesPersonName || '',
      salesPersonKana: merchantData.salesPersonKana || '',

      // 事業情報
      employees: merchantData.employees || '',
      salesScale: merchantData.salesScale || '',

      // 対応可能エリア・物件情報（日本語の読点で分割）
      areas: merchantData.prefectures ? merchantData.prefectures.split('、').map(a => a.trim()) : [],
      constructionTypes: merchantData.workAreas ? merchantData.workAreas.split('、').map(t => t.trim()) : [],
      propertyTypes: merchantData.propertyTypes ? merchantData.propertyTypes.split('、').map(p => p.trim()) : [],
      maxFloors: merchantData.maxFloors || '',
      buildingAge: merchantData.buildingAge || '',
      specialItems: merchantData.specialItems || '',
      cities: merchantData.cities || '',
      priorityAreas: merchantData.priorityAreas || '',

      // PRテキスト
      prText: merchantData.prText || '',

      // 自動配信設定
      autoDeliverySettings: {
        propertyTypes: merchantData.propertyTypes ? merchantData.propertyTypes.split('、').map(p => p.trim()) : [],
        areas: merchantData.prefectures ? merchantData.prefectures.split('、').map(a => a.trim()) : [],
        constructionTypes: merchantData.workAreas ? merchantData.workAreas.split('、').map(t => t.trim()) : [],
        ageRange: { min: 10, max: 100 },
        availableTimes: ['平日午前', '平日午後', '土日']
      }
    });
  } else {
    return createResponse(false, '加盟店データが見つかりません');
  }
}

/**
 * 加盟店データ更新ハンドラー（router.gsから呼ばれる）
 */
function handleUpdateMerchantData(data) {
  if (!data.merchantId || !data.updates) {
    return createResponse(false, '加盟店IDと更新データが必要です');
  }

  const result = updateMerchantData(data.merchantId, data.updates);
  return createResponse(result.success, result.message || result.error);
}

/**
 * loginケースのデバッグテスト
 */
function testLoginCase() {
  console.log('===== LOGIN CASE TEST =====');

  // 実際のログインアクションをシミュレート
  const testData = {
    action: 'login',
    merchantId: 'FR09242320',
    password: 'test1234' // 実際のパスワードと置き換えてください
  };

  // 1. getMerchantInfoWithCacheを直接テスト
  console.log('\n1. getMerchantInfoWithCache直接呼び出し:');
  const merchantData = getMerchantInfoWithCache(testData.merchantId);

  if (merchantData) {
    console.log('✓ データ取得成功');
    console.log('companyName: ' + merchantData.companyName);
    console.log('representativeName: ' + merchantData.representativeName);
    console.log('phone: ' + merchantData.phone);
    console.log('prefectures: ' + merchantData.prefectures);
    console.log('全フィールド数: ' + Object.keys(merchantData).length);
  } else {
    console.log('✗ データ取得失敗');
  }

  // 2. createResponseで正しく返されるか確認
  console.log('\n2. createResponse関数テスト:');

  if (merchantData) {
    const responseData = {
      merchantId: testData.merchantId,
      merchantName: merchantData.companyName,
      data: {
        companyName: merchantData.companyName || '',
        companyNameKana: merchantData.companyNameKana || '',
        tradeName: merchantData.tradeName || '',
        tradeNameKana: merchantData.tradeNameKana || '',
        representative: merchantData.representativeName || '',
        representativeKana: merchantData.representativeKana || '',
        zipCode: String(merchantData.postalCode || ''),
        address: merchantData.address || '',
        phone: merchantData.phone || '',
        website: merchantData.website || '',
        established: merchantData.established || '',
        branchName: merchantData.branchName || '',
        branchAddress: merchantData.branchAddress || '',
        billingEmail: merchantData.billingEmail || '',
        salesEmail: merchantData.salesEmail || '',
        email: merchantData.salesEmail || merchantData.billingEmail || '',
        salesPersonName: merchantData.salesPersonName || '',
        salesPersonKana: merchantData.salesPersonKana || '',
        employees: merchantData.employees || '',
        salesScale: merchantData.salesScale || '',
        areas: merchantData.prefectures ?
          merchantData.prefectures.includes(',') ?
            merchantData.prefectures.split(',').map(a => a.trim()) :
            merchantData.prefectures.split('、').map(a => a.trim())
          : [],
        constructionTypes: merchantData.workAreas ?
          merchantData.workAreas.includes(',') ?
            merchantData.workAreas.split(',').map(t => t.trim()) :
            merchantData.workAreas.split('、').map(t => t.trim())
          : [],
        propertyTypes: merchantData.propertyTypes ?
          merchantData.propertyTypes.includes(',') ?
            merchantData.propertyTypes.split(',').map(p => p.trim()) :
            merchantData.propertyTypes.split('、').map(p => p.trim())
          : [],
        maxFloors: merchantData.maxFloors || '',
        buildingAge: merchantData.buildingAge || '',
        specialItems: merchantData.specialItems || '',
        cities: merchantData.cities || '',
        priorityAreas: merchantData.priorityAreas || '',
        prText: merchantData.prText || '',
        autoDeliverySettings: {
          propertyTypes: merchantData.propertyTypes ?
            merchantData.propertyTypes.includes(',') ?
              merchantData.propertyTypes.split(',').map(p => p.trim()) :
              merchantData.propertyTypes.split('、').map(p => p.trim())
            : [],
          areas: merchantData.prefectures ?
            merchantData.prefectures.includes(',') ?
              merchantData.prefectures.split(',').map(a => a.trim()) :
              merchantData.prefectures.split('、').map(a => a.trim())
            : [],
          constructionTypes: merchantData.workAreas ?
            merchantData.workAreas.includes(',') ?
              merchantData.workAreas.split(',').map(t => t.trim()) :
              merchantData.workAreas.split('、').map(t => t.trim())
            : [],
          ageRange: { min: 10, max: 100 },
          availableTimes: ['平日午前', '平日午後', '土日']
        }
      }
    };

    const response = createResponse(true, 'ログイン成功', responseData);

    if (response && response.getContent) {
      const content = response.getContent();
      const parsed = JSON.parse(content);

      console.log('✓ createResponse成功');
      console.log('レスポンスのdata.companyName: ' + parsed.data.data.companyName);
      console.log('レスポンスのdata.representative: ' + parsed.data.data.representative);
      console.log('レスポンスのdata.areas数: ' + parsed.data.data.areas.length);

      // 空でないフィールドをカウント
      const nonEmptyFields = Object.keys(parsed.data.data).filter(key => {
        const value = parsed.data.data[key];
        if (typeof value === 'string') return value !== '';
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return true;
        return false;
      });

      console.log('値があるフィールド数: ' + nonEmptyFields.length);
      console.log('空のフィールド: ');
      Object.keys(parsed.data.data).forEach(key => {
        const value = parsed.data.data[key];
        const isEmpty = (typeof value === 'string' && value === '') ||
                       (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          console.log('  - ' + key + ': 空');
        }
      });
    }
  }

  console.log('\n===== TEST COMPLETE =====');
}