/**
 * ====================================
 * 加盟店登録システム（データ書き込み）
 * ====================================
 *
 * 【依存関係】
 * - MerchantSystem.js（データ読み取り - データフォーマットに依存）
 * - AdminSystem.js（管理機能 - ステータス管理に依存）
 *
 * 【影響範囲】
 * - フロント: franchise-register
 * - バック: MerchantSystem, AdminSystem
 * - データ: Spreadsheet書き込み（全列）
 *
 * 【変更時の注意】
 * ⚠️  データフォーマット変更時は必ずMerchantSystem.jsを確認
 * ⚠️  圧縮/展開ロジック変更時は後方互換性を保持
 * ⚠️  カラム変更時はDataLayer.COLUMN_MAPを更新
 *
 * 【必須テスト】
 * - npm run test:integration
 * - npm run test:merchant
 * - npm run check:impact FranchiseSystem.js
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
        // 空の名前を除外
        branchNames = companyInfo.branches
          .map(b => b.name || '')
          .filter(n => n.trim())
          .join('、');
        // 空の住所を除外（住所がない支店はスキップ）
        branchAddresses = companyInfo.branches
          .map(b => b.address || '')
          .filter(a => a.trim())
          .join('、');
      }

      // 画像URLを取得（Google Driveに保存）
      let imageUrl1 = '';
      let imageUrl2 = '';

      console.log('[FranchiseSystem] 本人確認書類チェック開始');
      console.log('[FranchiseSystem] identityDocument:', JSON.stringify(identityDocument));
      console.log('[FranchiseSystem] identityDocument.images 存在:', !!(identityDocument.images));
      console.log('[FranchiseSystem] identityDocument.images 長さ:', identityDocument.images ? identityDocument.images.length : 0);

      if (identityDocument.images && identityDocument.images.length > 0) {
        console.log('[FranchiseSystem] 画像保存処理開始:', identityDocument.images.length, '個の画像');

        // 全ての画像を保存
        for (let i = 0; i < identityDocument.images.length; i++) {
          const image = identityDocument.images[i];
          console.log('[FranchiseSystem] 画像', i, 'を保存中...');

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
            const fileUrl = saveResult.fileInfo.fileUrl;
            console.log('[FranchiseSystem] 画像', i, '保存成功');
            console.log('[FranchiseSystem] ファイル名:', saveResult.fileInfo.fileName);
            console.log('[FranchiseSystem] URL:', fileUrl);

            if (i === 0) {
              imageUrl1 = fileUrl;
            } else if (i === 1) {
              imageUrl2 = fileUrl;
            }
          } else {
            console.error('[FranchiseSystem] 画像', i, '保存失敗:', saveResult.error);
            // エラー時は空文字列（スプレッドシートにエラーメッセージを入れない）
            // エラー詳細はGASログで確認可能
          }
        }
      } else {
        console.log('[FranchiseSystem] 画像データなし or 空配列');
      }

      console.log('[FranchiseSystem] 最終的な imageUrl1:', imageUrl1);
      console.log('[FranchiseSystem] 最終的な imageUrl2:', imageUrl2);

      // 長いテキストを圧縮する関数
      function compressLongText(text, maxLength = 500) {
        if (!text || text.length <= maxLength) return text;

        // JSON形式で圧縮（後で展開可能）
        const compressed = {
          type: 'compressed',
          full: text,
          preview: text.substring(0, maxLength) + '...'
        };
        return JSON.stringify(compressed);
      }

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
        branchAddresses,                // 支店住所（圧縮なし - 全文保存）
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
        detailInfo.propertyTypes ? (Array.isArray(detailInfo.propertyTypes) ? detailInfo.propertyTypes.join(',') : detailInfo.propertyTypes) : '', // 対応可能物件種別
        detailInfo.propertyFloors || detailInfo.maxFloors || '',     // 最大対応階数（圧縮なし）
        detailInfo.buildingAgeRange || detailInfo.buildingAge || '',   // 築年数対応範囲
        detailInfo.constructionTypes ? (Array.isArray(detailInfo.constructionTypes) ? detailInfo.constructionTypes.join(',') : detailInfo.constructionTypes) : '', // 施工箇所（圧縮なし）
        detailInfo.specialServices ? (Array.isArray(detailInfo.specialServices) ? detailInfo.specialServices.join(',') : detailInfo.specialServices) : '', // 特殊対応項目（圧縮なし）
        selectedAreas.prefectures || '', // 対応都道府県（圧縮なし）
        selectedAreas.cities || '',     // 対応市区町村（圧縮なし）
        selectedAreas.priorityAreas || '', // 優先エリア（圧縮なし）
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