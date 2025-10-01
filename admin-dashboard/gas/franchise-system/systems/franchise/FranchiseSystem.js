/**
 * ====================================
 * 加盟店登録システム
 * ====================================
 * 完全独立モジュール
 */

const FranchiseSystem = {
  /**
   * GETリクエスト処理
   */
  handle: function(params) {
    try {
      const action = params.action;

      switch (action) {
        case 'franchise_test':
          return {
            success: true,
            message: 'Franchise system is running'
          };

        case 'registerFranchise':
          return this.registerFranchise(params);

        default:
          return {
            success: false,
            error: `Unknown franchise action: ${action}`
          };
      }

    } catch (error) {
      console.error('[FranchiseSystem] Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * POSTリクエスト処理
   */
  handlePost: function(e) {
    try {
      const action = e.parameter.action;

      switch (action) {
        case 'submitRegistration':
          return this.submitRegistration(e);

        case 'registerFranchise':
          return this.registerFranchisePost(e);

        default:
          return {
            success: false,
            error: `Unknown franchise POST action: ${action}`
          };
      }

    } catch (error) {
      console.error('[FranchiseSystem] POST Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店登録処理（GET経由）
   */
  registerFranchise: function(params) {
    try {
      console.log('[FranchiseSystem] registerFranchise開始');

      // スプレッドシートID（プロパティから取得）
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!SPREADSHEET_ID) {
        throw new Error('スプレッドシートIDが設定されていません');
      }

      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      if (!sheet) {
        throw new Error('シートが見つかりません: 加盟店登録');
      }

      // 登録IDを生成
      const registrationId = 'FR' + Utilities.formatDate(new Date(), 'JST', 'yyMMddHHmmss');
      const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss');

      // JSONデータをパース
      let companyInfo = {};
      let detailInfo = {};
      let selectedAreas = {};
      let identityDocument = {};

      try {
        if (params.companyInfo) {
          companyInfo = JSON.parse(params.companyInfo);
        }
        if (params.detailInfo) {
          detailInfo = JSON.parse(params.detailInfo);
        }
        if (params.selectedAreas) {
          selectedAreas = JSON.parse(params.selectedAreas);
        }
        if (params.identityDocument) {
          identityDocument = JSON.parse(params.identityDocument);
        }
      } catch (e) {
        console.error('[FranchiseSystem] JSONパースエラー:', e);
      }


      // 支店情報を処理
      let branchNames = '';
      let branchAddresses = '';
      let branchCount = 0;

      if (companyInfo.branches && Array.isArray(companyInfo.branches)) {
        branchCount = companyInfo.branches.length;
        branchNames = companyInfo.branches.map(b => b.name).join('、');
        branchAddresses = companyInfo.branches.map(b => b.address).join('、');
      }

      // 画像URLを取得（Google Driveに保存）
      let imageUrl1 = '';
      let imageUrl2 = '';
      if (identityDocument.images && identityDocument.images.length > 0) {
        // 全ての画像を保存
        for (let i = 0; i < identityDocument.images.length; i++) {
          const image = identityDocument.images[i];
          const saveResult = saveIdentityDocument(
            {
              data: image.data,
              type: identityDocument.type || 'drivers_license',
              side: image.side || (i === 0 ? 'front' : 'back')
            },
            registrationId,
            companyInfo.companyName || ''
          );

          if (saveResult.success) {
            if (i === 0) {
              imageUrl1 = saveResult.fileInfo.fileUrl;
            } else if (i === 1) {
              imageUrl2 = saveResult.fileInfo.fileUrl;
            }
            console.log('[FranchiseSystem] 画像保存成功:', saveResult.fileInfo.fileName);
          } else {
            console.error('[FranchiseSystem] 画像保存失敗:', saveResult.error);
          }
        }
      }

      // 圧縮関数は完全削除 - 生データのまま保存

      // 施工箇所と特殊対応項目のデータを処理（圧縮しない、生データのまま保存）
      const extractedConstructionTypes = detailInfo.constructionTypes ?
        (Array.isArray(detailInfo.constructionTypes) ? detailInfo.constructionTypes.join('、') : detailInfo.constructionTypes)
        : '';

      const extractedSpecialServices = detailInfo.specialServices ?
        (Array.isArray(detailInfo.specialServices) ? detailInfo.specialServices.join('、') : detailInfo.specialServices)
        : '';

      // エリア関連データも生データのまま処理（圧縮しない）
      // 配列・オブジェクトを文字列に変換
      let extractedPrefectures = selectedAreas.prefectures || '';
      let extractedCities = selectedAreas.cities || '';
      let extractedPriorities = selectedAreas.priorityAreas || '';

      // 配列の場合はカンマ区切り文字列に変換
      if (Array.isArray(extractedPrefectures)) {
        extractedPrefectures = extractedPrefectures.join('、');
      }

      if (Array.isArray(extractedPriorities)) {
        extractedPriorities = extractedPriorities.join('、');
      }

      // citiesがオブジェクト形式（{都道府県: [市区町村]}）の場合は変換
      if (typeof extractedCities === 'object' && !Array.isArray(extractedCities)) {
        const citiesArray = [];
        Object.keys(extractedCities).forEach(pref => {
          if (Array.isArray(extractedCities[pref])) {
            citiesArray.push(...extractedCities[pref]);
          }
        });
        extractedCities = citiesArray.join('、');
      } else if (Array.isArray(extractedCities)) {
        extractedCities = extractedCities.join('、');
      }

      console.log('[FranchiseSystem] エリアデータ変換結果:');
      console.log('  - Prefectures:', extractedPrefectures, '(type:', typeof extractedPrefectures + ')');
      console.log('  - Cities:', extractedCities, '(type:', typeof extractedCities + ')');
      console.log('  - Priorities:', extractedPriorities, '(type:', typeof extractedPriorities + ')');

      // データ整形（スプレッドシートの列順に合わせる）
      const rowData = [
        timestamp,                      // タイムスタンプ
        registrationId,                 // 登録ID
        companyInfo.companyName || '',  // 会社名
        companyInfo.companyNameKana || '', // 会社名カナ
        companyInfo.businessName || '', // 屋号
        companyInfo.businessNameKana || '', // 屋号カナ
        companyInfo.representative || '', // 代表者名
        companyInfo.representativeKana || '', // 代表者名カナ
        companyInfo.postalCode || '',   // 郵便番号
        companyInfo.fullAddress || '',  // 住所
        companyInfo.phone || '',        // 電話番号
        companyInfo.websiteUrl || '',   // ウェブサイトURL
        companyInfo.establishedDate || '', // 設立年月
        companyInfo.prText || '',       // PRテキスト
        branchNames,                    // 支店名
        branchAddresses, // 支店住所（生データ）
        params.termsAgreed === 'true' ? 'はい' : 'いいえ', // 利用規約同意
        identityDocument.type || '',    // 本人確認書類種類
        imageUrl1,                      // 本人確認書類URL1
        imageUrl2,                      // 本人確認書類URL2
        params.informationCheck === 'true' ? 'はい' : 'いいえ', // 情報確認同意
        detailInfo.billingEmail || '',  // 請求用メールアドレス
        detailInfo.salesEmail || '',    // 営業用メールアドレス
        detailInfo.salesPersonName || detailInfo.salesPerson || '',   // 営業担当者氏名
        detailInfo.salesPersonKana || '', // 営業担当者カナ
        detailInfo.employees || detailInfo.employeeCount || '', // 従業員数
        detailInfo.revenue || detailInfo.salesScale || '',    // 売上規模
        detailInfo.propertyTypes ? (Array.isArray(detailInfo.propertyTypes) ? detailInfo.propertyTypes.join('、') : detailInfo.propertyTypes) : '', // 対応可能物件種別
        detailInfo.propertyFloors || detailInfo.maxFloors || '',     // 最大対応階数（生データ）
        detailInfo.buildingAgeRange || detailInfo.buildingAge || '',   // 築年数対応範囲
        extractedConstructionTypes, // 施工箇所（生データ）
        extractedSpecialServices, // 特殊対応項目（生データ）
        extractedPrefectures, // 対応都道府県（生データ）
        extractedCities,     // 対応市区町村（生データ）
        extractedPriorities, // 優先エリア（生データ）
        '新規登録',                     // ステータス
        '申請中',                       // 承認ステータス
        '',                            // 登録日時（承認後に入力）
        '',                            // 承認者
        ''                             // 却下理由
      ];

      // スプレッドシートに追加
      sheet.appendRow(rowData);

      console.log('[FranchiseSystem] 登録完了:', registrationId);

      // Slack通知
      try {
        // 既存のslackNotificationHandlerを使用
        const registrationData = {
          registrationId: registrationId,
          companyInfo: companyInfo,
          companyName: companyInfo.companyName,
          selectedPrefectures: selectedAreas.prefectures ? selectedAreas.prefectures.split(',') : []
        };

        if (typeof sendSlackRegistrationNotification === 'function') {
          sendSlackRegistrationNotification(registrationData);
          console.log('[FranchiseSystem] Slack通知送信完了');
        } else {
          console.log('[FranchiseSystem] Slack通知関数が見つかりません');
        }
      } catch (slackError) {
        console.error('[FranchiseSystem] Slack通知エラー:', slackError);
      }

      return {
        success: true,
        message: '登録が完了しました',
        registrationId: registrationId
      };

    } catch (error) {
      console.error('[FranchiseSystem] registerFranchise error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店登録処理（POST経由）
   */
  registerFranchisePost: function(e) {
    try {
      console.log('[FranchiseSystem] registerFranchisePost開始');
      console.log('[FranchiseSystem] e.parameter:', JSON.stringify(e.parameter));

      // FormDataから直接パラメータを取得
      const params = {
        action: e.parameter.action,
        companyInfo: e.parameter.companyInfo,
        detailInfo: e.parameter.detailInfo,
        selectedAreas: e.parameter.selectedAreas,
        identityDocument: e.parameter.identityDocument,
        termsAgreed: e.parameter.termsAgreed,
        informationCheck: e.parameter.informationCheck
      };

      console.log('[FranchiseSystem] params取得完了');

      // 既存のregisterFranchise関数を呼び出す
      return this.registerFranchise(params);

    } catch (error) {
      console.error('[FranchiseSystem] registerFranchisePost error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
};