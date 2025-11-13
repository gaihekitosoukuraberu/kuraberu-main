/**
 * ====================================
 * 加盟店システム（データ読み取り・認証）
 * ====================================
 *
 * 【依存関係】
 * - FranchiseSystem.js（データ書き込み - データフォーマットに依存）
 * - CompanyInfoManager.js（画像管理・会社情報更新）
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（加盟店ポータル）
 * - フロント: first-login.html（初回ログイン）
 * - データ: Spreadsheet読み取り（全列）
 *
 * 【変更時の注意】
 * ⚠️  データ読み取りロジック変更時はFranchiseSystemのフォーマットを確認
 * ⚠️  圧縮データの自動展開は必須（後方互換性）
 * ⚠️  認証ロジック変更時はfirst-login.htmlも確認
 *
 * 【必須テスト】
 * - npm run test:integration
 * - npm run test:merchant
 * - npm run check:impact MerchantSystem.js
 *
 * 【内部関数】
 * - _verifySignedUrl: URL署名検証
 * - _initCredentialsSheet: 認証情報シート初期化
 * - _savePassword: パスワードハッシュ保存
 * - _verifyLogin: ログイン検証
 */

const MerchantSystem = {
  /**
   * GETリクエスト処理
   */
  handle: function(params) {
    try {
      const action = params.action;

      switch (action) {
        case 'merchant_test':
          return {
            success: true,
            message: 'Merchant system is running'
          };

        case 'verifyFirstLoginUrl':
        case 'verifyFirstLogin':
          return this.verifyFirstLoginUrl(params);

        case 'setPassword':
        case 'setFirstPassword':
          return this.setFirstPassword(params);

        case 'resetPassword':
          return this.resetPassword(params);

        case 'verifyLogin':
          return this.verifyLogin(params);

        case 'getMerchantData':
          return this.getMerchantData(params);

        case 'updateSalesPerson':
          return this.updateSalesPerson(params);

        case 'updateMerchantStatus':
          return this.updateMerchantStatus(params);

        case 'getMerchantStatus':
          return this.getMerchantStatus(params);

        case 'getMerchantUrlSlug':
          return this.getMerchantUrlSlug(params);

        case 'getPreviewSettings':
        case 'loadPreviewSettings':
          return this.getPreviewSettings(params);

        case 'updateAutoDeliverySettings':
          return this.updateAutoDeliverySettings(params);

        case 'updateMerchantUrlAndPreviewHp':
          return this.updateMerchantUrlAndPreviewHp(params);

        case 'checkUpdate':
          return this.checkUpdate(params);

        // 成約報告機能（MerchantContractReportに委譲）
        case 'getDeliveredCases':
        case 'submitContractReport':
          return MerchantContractReport[action](params);

        // 会社情報管理（CompanyInfoManagerに委譲）
        case 'companyinfo_uploadImage':
        case 'companyinfo_uploadMainVisual':
        case 'companyinfo_deleteMainVisual':
        case 'companyinfo_addGalleryPhoto':
        case 'companyinfo_deleteGalleryPhoto':
        case 'companyinfo_reorderGalleryPhotos':
        case 'companyinfo_updatePhotoGallery':
        case 'companyinfo_saveConstructionExample':
        case 'companyinfo_getConstructionExamples':
        case 'companyinfo_deleteConstructionExample':
        case 'companyinfo_saveQualifications':
        case 'companyinfo_saveInsurances':
          return CompanyInfoManager.handle(params);

        default:
          return {
            success: false,
            error: `Unknown merchant action: ${action}`
          };
      }

    } catch (error) {
      console.error('[MerchantSystem] Error:', error);
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
      // POSTボディからもパラメータを取得
      let params = e.parameter;
      if (e.postData && e.postData.contents) {
        try {
          const postData = JSON.parse(e.postData.contents);
          params = Object.assign({}, params, postData);
        } catch (err) {
          console.error('[MerchantSystem] POST data parse error:', err);
        }
      }

      const action = params.action;

      switch (action) {
        case 'verifyFirstLogin':
        case 'verifyFirstLoginUrl':
          return this.verifyFirstLoginUrl(params);

        case 'setFirstPassword':
        case 'setPassword':
          return this.setFirstPassword(params);

        case 'resetPassword':
          return this.resetPassword(params);

        case 'verifyLogin':
          return this.verifyLogin(params);

        case 'updateAutoDeliverySettings':
          return this.updateAutoDeliverySettings(params);

        case 'updatePauseSettings':
          return this.updatePauseSettings(params);

        case 'resumeAutoDelivery':
          return this.resumeAutoDelivery(params);

        case 'merchant_updateCompanyInfo':
          return this.updateCompanyInfo(params);

        // 会社情報画像アップロード（直接処理）
        case 'companyinfo_uploadImage':
          return this.uploadMainVisualDirect(params);

        case 'companyinfo_uploadMainVisual':
          return CompanyInfoManager.uploadMainVisual(params);

        case 'companyinfo_deleteMainVisual':
          return CompanyInfoManager.deleteMainVisual(params);

        case 'companyinfo_uploadPhotoGallery':
          return CompanyInfoManager.uploadPhotoGallery(params);

        case 'companyinfo_updatePhotoGallery':
          return CompanyInfoManager.updatePhotoGallery(params);

        case 'companyinfo_deletePhotoGallery':
          return CompanyInfoManager.deletePhotoGallery(params);

        case 'companyinfo_saveQualifications':
          return CompanyInfoManager.saveQualifications(params);

        case 'companyinfo_saveInsurances':
          return CompanyInfoManager.saveInsurances(params);

        case 'saveConstructionExample':
        case 'companyinfo_saveConstructionExample':
          return CompanyInfoManager.saveConstructionExample(params);

        case 'companyinfo_deleteConstructionExample':
          return CompanyInfoManager.deleteConstructionExample(params);

        case 'getConstructionExamples':
        case 'companyinfo_getConstructionExamples':
          return CompanyInfoManager.getConstructionExamples(params);

        case 'updateMerchantData':
          return this.updateMerchantData(params);

        case 'companyinfo_addGalleryPhoto':
          return CompanyInfoManager.addGalleryPhoto(params);

        case 'companyinfo_deleteGalleryPhoto':
          return CompanyInfoManager.deleteGalleryPhoto(params);

        case 'saveGalleryData':
          return CompanyInfoManager.saveGalleryData(params);

        case 'generateStaticHTML':
          return generateStaticHTML(params);

        case 'getPreviewSettings':
        case 'loadPreviewSettings':
          return this.getPreviewSettings(params);

        case 'savePreviewSettings':
          return this.savePreviewSettings(params);

        case 'getMerchantUrlSlug':
          return this.getMerchantUrlSlug(params);

        case 'updateMerchantUrlAndPreviewHp':
          return this.updateMerchantUrlAndPreviewHp(params);

        case 'triggerFTPSync':
          return this.triggerFTPSync();

        // 成約報告機能（MerchantContractReportに委譲）
        case 'getDeliveredCases':
        case 'submitContractReport':
          return MerchantContractReport[action](params);

        default:
          return {
            success: false,
            error: `Unknown merchant POST action: ${action}`
          };
      }

    } catch (error) {
      console.error('[MerchantSystem] POST Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 初回ログインURL検証
   */
  verifyFirstLoginUrl: function(params) {
    try {
      const { data, sig } = params;

      if (!data || !sig) {
        return {
          success: false,
          error: 'パラメータが不足しています'
        };
      }

      const merchantId = this._verifySignedUrl(data, sig);

      if (!merchantId) {
        return {
          success: false,
          error: 'URLが無効または期限切れです'
        };
      }

      return {
        success: true,
        merchantId: merchantId
      };

    } catch (error) {
      console.error('[MerchantSystem] verifyFirstLoginUrl error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 初回パスワード設定
   */
  setFirstPassword: function(params) {
    try {
      const { merchantId, password, data, sig } = params;

      if (!merchantId || !password) {
        return {
          success: false,
          error: 'パラメータが不足しています'
        };
      }

      // URL検証
      if (data && sig) {
        const verifiedId = this._verifySignedUrl(data, sig);
        if (!verifiedId || verifiedId !== merchantId) {
          return {
            success: false,
            error: 'URLが無効または期限切れです'
          };
        }
      }

      const result = this._savePassword(merchantId, password);

      if (result.success) {
        return {
          success: true,
          message: 'パスワードが設定されました'
        };
      } else {
        return {
          success: false,
          error: 'パスワード設定に失敗しました'
        };
      }

    } catch (error) {
      console.error('[MerchantSystem] setFirstPassword error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * パスワードリセット（初回ログインと同じ処理）
   */
  resetPassword: function(params) {
    try {
      const { data, sig, password } = params;

      if (!data || !sig || !password) {
        return {
          success: false,
          error: 'パラメータが不足しています'
        };
      }

      // URL検証
      const merchantId = this._verifySignedUrl(data, sig);
      if (!merchantId) {
        return {
          success: false,
          error: 'URLが無効または期限切れです'
        };
      }

      const result = this._savePassword(merchantId, password);

      if (result.success) {
        return {
          success: true,
          message: 'パスワードがリセットされました'
        };
      } else {
        return {
          success: false,
          error: 'パスワードリセットに失敗しました'
        };
      }

    } catch (error) {
      console.error('[MerchantSystem] resetPassword error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店データ取得
   */
  getMerchantData: function(params) {
    try {
      const { merchantId } = params;

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      // DataAccessLayerを使用してデータ取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const headers = data[0];
      const rows = data.slice(1);

      // 加盟店IDで検索（B列 = インデックス1）
      // A列はタイムスタンプ、B列が登録ID（加盟店ID）
      const merchantRow = rows.find(row => row[1] === merchantId);

      if (!merchantRow) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // 圧縮される可能性のある列のインデックス（0ベース）
      const compressedColumns = [
        15, // 支店住所（P列 = 16列目 = インデックス15） - 旧バージョンで圧縮されていた
        28, // 最大対応階数（AC列 = 29列目 = インデックス28） - 旧バージョンで圧縮されていた
        30, // 施工箇所（AE列 = 31列目 = インデックス30）
        31, // 特殊対応項目（AF列 = 32列目 = インデックス31）
        32, // 対応都道府県（AG列 = 33列目 = インデックス32）
        33, // 対応市区町村（AH列 = 34列目 = インデックス33）
        34  // 優先エリア（AI列 = 35列目 = インデックス34）
      ];

      // 圧縮データを展開する関数（再帰的に展開）
      const expandCompressedText = (text) => {
        if (!text) return '';
        if (text.startsWith('{') && text.includes('"type":"compressed"')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.type === 'compressed' && parsed.full) {
              // 再帰的に展開（二重圧縮対応）
              return expandCompressedText(parsed.full);
            }
          } catch (e) {
            console.log('[MerchantSystem] 展開エラー:', e);
          }
        }
        return text;
      };

      // データをオブジェクトに変換（圧縮データを展開）
      const merchantData = {};
      headers.forEach((header, index) => {
        let value = merchantRow[index];
        // 圧縮列の場合は展開
        if (compressedColumns.includes(index)) {
          value = expandCompressedText(value);
          console.log(`[MerchantSystem] Expanded ${header} (index ${index}):`, value);
        }
        merchantData[header] = value;
      });

      // 設立年月（M列、インデックス12）は表示値を取得してスプシの生データをそのまま使用
      const merchantRowNumber = rows.indexOf(merchantRow) + 2; // ヘッダー行を除く + 1ベースに変換
      const establishedDisplayValue = sheet.getRange(merchantRowNumber, 13).getDisplayValue(); // M列
      if (establishedDisplayValue && establishedDisplayValue.trim() !== '') {
        merchantData['設立年月'] = establishedDisplayValue;
        console.log(`[MerchantSystem] Using display value for 設立年月: ${establishedDisplayValue}`);
      }

      // X列は24列目（インデックス23、0ベース）
      // A=0, B=1, ..., X=23
      const salesPersonIndex = 23;
      merchantData.salesPerson = merchantRow[salesPersonIndex] || '';

      // デバッグ: 行の列数を確認
      console.log('[MerchantSystem] merchantRow length:', merchantRow.length);
      console.log('[MerchantSystem] merchantRow[43] (AR列 メインビジュアル):', merchantRow[43]);
      console.log('[MerchantSystem] merchantRow[44] (AS列 写真ギャラリー):', merchantRow[44]);
      console.log('[MerchantSystem] merchantRow[45] (AT列 保有資格):', merchantRow[45]);
      console.log('[MerchantSystem] merchantRow[46] (AU列 加入保険):', merchantRow[46]);

      // 画像関連データを追加
      // AR列（44列目、インデックス43）= メインビジュアル
      merchantData.mainVisual = merchantRow[43] || '';

      // AS列（45列目、インデックス44）= 写真ギャラリー
      merchantData.photoGallery = merchantRow[44] || '';

      // AT列（46列目、インデックス45）= 保有資格
      merchantData.qualifications = merchantRow[45] || '';

      // AU列（47列目、インデックス46）= 加入保険
      merchantData.insurances = merchantRow[46] || '';

      console.log('[MerchantSystem] getMerchantData - merchantId:', merchantId);
      console.log('[MerchantSystem] getMerchantData - 施工箇所:', merchantData['施工箇所']);
      console.log('[MerchantSystem] getMerchantData - 対応市区町村:', merchantData['対応市区町村']);
      console.log('[MerchantSystem] getMerchantData - 優先エリア:', merchantData['優先エリア']);
      console.log('[MerchantSystem] getMerchantData - メインビジュアル:', merchantData.mainVisual);
      console.log('[MerchantSystem] getMerchantData - 写真ギャラリー:', merchantData.photoGallery);

      return {
        success: true,
        data: merchantData,
        status: merchantData['ステータス'] || 'アクティブ'
      };

    } catch (error) {
      console.error('[MerchantSystem] getMerchantData error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店のURLスラッグ情報取得
   */
  getMerchantUrlSlug: function(params) {
    try {
      const { merchantId } = params;

      if (!merchantId) {
        return {
          success: false,
          error: 'merchantIdが指定されていません'
        };
      }

      console.log('[MerchantSystem] getMerchantUrlSlug - merchantId:', merchantId);

      // スプレッドシートから現在のURLスラッグ情報を取得
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
      const dataRange = sheet.getDataRange();
      const allData = dataRange.getValues();
      const headers = allData[0];

      // 列インデックスを取得
      const merchantIdColIndex = headers.indexOf('登録ID');
      const urlSlugColIndex = headers.indexOf('ウェブページ用ID');
      const areaColIndex = headers.indexOf('エリア（AX列）');

      if (merchantIdColIndex === -1) {
        return {
          success: false,
          error: '登録IDの列が見つかりません'
        };
      }

      // 加盟店データを検索
      const targetRowIndex = allData.findIndex((row, index) => {
        return index > 0 && row[merchantIdColIndex] === merchantId;
      });

      if (targetRowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店が見つかりません'
        };
      }

      const merchantData = allData[targetRowIndex];
      const currentUrlSlug = urlSlugColIndex !== -1 ? merchantData[urlSlugColIndex] : '';
      const currentArea = areaColIndex !== -1 ? merchantData[areaColIndex] : '';

      console.log('[MerchantSystem] getMerchantUrlSlug - currentUrlSlug:', currentUrlSlug);
      console.log('[MerchantSystem] getMerchantUrlSlug - currentArea:', currentArea);

      return {
        success: true,
        urlSlug: currentUrlSlug || '',
        area: currentArea || '',
        fullUrl: currentUrlSlug ? `https://gaihekikuraberu.com/${currentArea}/${currentUrlSlug}` : ''
      };

    } catch (error) {
      console.error('[MerchantSystem] getMerchantUrlSlug error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 営業担当者氏名更新
   */
  updateSalesPerson: function(params) {
    try {
      const { merchantId, salesPerson } = params;

      if (!merchantId || !salesPerson) {
        return {
          success: false,
          error: 'パラメータが不足しています'
        };
      }

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const rows = data.slice(1);

      // B列（インデックス1）で加盟店ID検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // X列（インデックス23）を更新
      // シートの行番号は1ベース + ヘッダー行なので +2
      const sheetRowIndex = rowIndex + 2;
      const salesPersonColumnIndex = 24; // X列 = 24列目

      sheet.getRange(sheetRowIndex, salesPersonColumnIndex).setValue(salesPerson);

      console.log('[MerchantSystem] updateSalesPerson - Updated row:', sheetRowIndex, 'to:', salesPerson);

      return {
        success: true,
        message: '営業担当者氏名を更新しました'
      };

    } catch (error) {
      console.error('[MerchantSystem] updateSalesPerson error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ステータス更新（AJ列）
   */
  updateMerchantStatus: function(params) {
    try {
      const { merchantId, status } = params;

      if (!merchantId || !status) {
        return {
          success: false,
          error: 'パラメータが不足しています'
        };
      }

      // ステータスのマッピング（フロントエンド → スプレッドシート）
      const statusMap = {
        'active': 'アクティブ',
        'paused': '一時停止'
      };

      const sheetStatus = statusMap[status] || status;

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const rows = data.slice(1);

      // B列（インデックス1）で加盟店ID検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // AJ列（インデックス35、列番号36）を更新
      // A=0...Z=25, AA=26...AJ=35
      const sheetRowIndex = rowIndex + 2;
      const statusColumnIndex = 36; // AJ列 = 36列目

      sheet.getRange(sheetRowIndex, statusColumnIndex).setValue(sheetStatus);

      console.log('[MerchantSystem] updateMerchantStatus - Updated row:', sheetRowIndex, 'to:', sheetStatus);

      return {
        success: true,
        message: 'ステータスを更新しました'
      };

    } catch (error) {
      console.error('[MerchantSystem] updateMerchantStatus error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ステータス取得（AJ列）
   */
  getMerchantStatus: function(params) {
    try {
      const { merchantId } = params;

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const rows = data.slice(1);

      // B列（インデックス1）で加盟店ID検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // AJ列（インデックス35）からステータス取得
      const merchantRow = rows[rowIndex];
      const sheetStatus = merchantRow[35] || '休止'; // デフォルトは休止

      // ステータスのマッピング（スプレッドシート → 加盟店フロントエンド）
      // Adminの「アクティブ/非アクティブ/サイレント」→ 加盟店「アクティブ」
      // Adminの「一時停止/休止/退会」→ 加盟店「一時停止」
      const statusMap = {
        'アクティブ': 'active',
        '非アクティブ': 'active',
        'サイレント': 'active',
        '一時停止': 'paused',
        '休止': 'paused',
        '退会': 'paused'
      };

      const status = statusMap[sheetStatus] || 'paused';

      console.log('[MerchantSystem] getMerchantStatus - merchantId:', merchantId, 'status:', status, 'sheetStatus:', sheetStatus);

      return {
        success: true,
        status: status,
        sheetStatus: sheetStatus
      };

    } catch (error) {
      console.error('[MerchantSystem] getMerchantStatus error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ログイン検証
   */
  verifyLogin: function(params) {
    try {
      const { merchantId, password } = params;

      if (!merchantId || !password) {
        return {
          success: false,
          error: '加盟店IDとパスワードを入力してください'
        };
      }

      // ログイン試行回数チェック（auth-manager.jsを使用）
      if (typeof checkLoginAttempts === 'function') {
        if (!checkLoginAttempts(merchantId)) {
          return {
            success: false,
            error: 'ログイン試行回数が上限に達しました。しばらく時間をおいてから再度お試しください。'
          };
        }
      }

      const isValid = this._verifyLogin(merchantId, password);

      if (isValid) {
        // ログイン成功 - 試行回数リセット
        if (typeof resetLoginAttempts === 'function') {
          resetLoginAttempts(merchantId);
        }

        return {
          success: true,
          message: 'ログイン成功',
          merchantId: merchantId
        };
      } else {
        return {
          success: false,
          error: '加盟店IDまたはパスワードが正しくありません'
        };
      }

    } catch (error) {
      console.error('[MerchantSystem] verifyLogin error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 自動配信設定を更新
   */
  updateAutoDeliverySettings: function(params) {
    try {
      const { merchantId, propertyTypes, maxFloors, ageRange, constructionTypes, specialServices, prefectures, cities, priorities, pauseFlag, pauseStartDate, pauseEndDate, status } = params;

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const headers = data[0];
      const rows = data.slice(1);

      // B列（インデックス1）で加盟店ID検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // シートの行番号は1ベース + ヘッダー行なので +2
      const sheetRowIndex = rowIndex + 2;

      // 圧縮関数は完全削除 - 生データのまま保存

      // ヘッダーから各列のインデックスを取得
      const propertyTypesCol = headers.indexOf('対応可能物件種別') + 1;
      const maxFloorsCol = headers.indexOf('最大対応階数') + 1;
      const ageRangeCol = headers.indexOf('築年数対応範囲') + 1;
      const constructionTypesCol = headers.indexOf('施工箇所') + 1;
      const specialServicesCol = headers.indexOf('特殊対応項目') + 1;
      const prefecturesCol = headers.indexOf('対応都道府県') + 1;
      const citiesCol = headers.indexOf('対応市区町村') + 1;
      const prioritiesCol = headers.indexOf('優先エリア') + 1;

      // 各列を更新（圧縮データを抽出してから再圧縮）
      if (propertyTypesCol > 0 && propertyTypes !== undefined) {
        sheet.getRange(sheetRowIndex, propertyTypesCol).setValue(propertyTypes);
      }
      if (maxFloorsCol > 0 && maxFloors !== undefined) {
        sheet.getRange(sheetRowIndex, maxFloorsCol).setValue(maxFloors);
      }
      if (ageRangeCol > 0 && ageRange !== undefined) {
        sheet.getRange(sheetRowIndex, ageRangeCol).setValue(ageRange);
      }
      if (constructionTypesCol > 0 && constructionTypes !== undefined) {
        sheet.getRange(sheetRowIndex, constructionTypesCol).setValue(constructionTypes);
      }
      if (specialServicesCol > 0 && specialServices !== undefined) {
        sheet.getRange(sheetRowIndex, specialServicesCol).setValue(specialServices);
      }
      if (prefecturesCol > 0 && prefectures !== undefined) {
        sheet.getRange(sheetRowIndex, prefecturesCol).setValue(prefectures);
      }
      if (citiesCol > 0 && cities !== undefined) {
        sheet.getRange(sheetRowIndex, citiesCol).setValue(cities);
      }
      if (prioritiesCol > 0 && priorities !== undefined) {
        sheet.getRange(sheetRowIndex, prioritiesCol).setValue(priorities);
      }

      // 一時停止データを保存（AO/AP/AQ列）
      const pauseFlagCol = headers.indexOf('一時停止フラグ') + 1;
      const pauseStartCol = headers.indexOf('一時停止開始日') + 1;
      const pauseEndCol = headers.indexOf('一時停止再開予定日') + 1;
      const statusCol = headers.indexOf('ステータス') + 1;

      // 一時停止フラグの保存（TRUE/FALSE）
      if (pauseFlagCol > 0 && pauseFlag !== undefined) {
        const flagValue = (pauseFlag === 'TRUE' || pauseFlag === 'true' || pauseFlag === true);
        sheet.getRange(sheetRowIndex, pauseFlagCol).setValue(flagValue);
      }

      // 一時停止開始日の保存
      if (pauseStartCol > 0 && pauseStartDate !== undefined && pauseStartDate !== '') {
        sheet.getRange(sheetRowIndex, pauseStartCol).setValue(pauseStartDate);
      }

      // 一時停止再開予定日の保存
      if (pauseEndCol > 0) {
        if (pauseEndDate !== undefined && pauseEndDate !== '') {
          sheet.getRange(sheetRowIndex, pauseEndCol).setValue(pauseEndDate);
        } else {
          // 未定の場合は空白
          sheet.getRange(sheetRowIndex, pauseEndCol).setValue('');
        }
      }

      // ステータス（AJ列）を更新 - フロントエンドから送られたstatusをそのまま使用
      if (statusCol > 0 && status !== undefined) {
        sheet.getRange(sheetRowIndex, statusCol).setValue(status);
        console.log('[MerchantSystem] Status updated to:', status);
      }

      console.log('[MerchantSystem] updateAutoDeliverySettings - Updated row:', sheetRowIndex);

      return {
        success: true,
        message: '自動配信設定を更新しました'
      };

    } catch (error) {
      console.error('[MerchantSystem] updateAutoDeliverySettings error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 一時停止設定のみ更新（即時反映用）
   */
  updatePauseSettings(params) {
    try {
      console.log('[MerchantSystem] updatePauseSettings called with params:', params);

      const { merchantId, pauseFlag, pauseStartDate, pauseEndDate, status } = params;

      if (!merchantId) {
        return {
          success: false,
          error: 'merchantIdが指定されていません'
        };
      }

      // スプレッドシートを取得
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEETS.FRANCHISE_MERCHANTS);

      if (!sheet) {
        throw new Error('加盟店シートが見つかりません');
      }

      // ヘッダー行を取得
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      // merchantIdで行を検索
      const merchantIdCol = headers.indexOf('加盟店ID') + 1;
      const allData = sheet.getDataRange().getValues();
      let sheetRowIndex = -1;

      for (let i = 1; i < allData.length; i++) {
        if (allData[i][merchantIdCol - 1] === merchantId) {
          sheetRowIndex = i + 1;
          break;
        }
      }

      if (sheetRowIndex === -1) {
        return {
          success: false,
          error: '加盟店が見つかりません'
        };
      }

      // 一時停止データを保存（AO/AP/AQ列）
      const pauseFlagCol = headers.indexOf('一時停止フラグ') + 1;
      const pauseStartCol = headers.indexOf('一時停止開始日') + 1;
      const pauseEndCol = headers.indexOf('一時停止再開予定日') + 1;
      const statusCol = headers.indexOf('ステータス') + 1;

      // 一時停止フラグの保存（TRUE/FALSE）
      if (pauseFlagCol > 0 && pauseFlag !== undefined) {
        const flagValue = (pauseFlag === 'true' || pauseFlag === true);
        sheet.getRange(sheetRowIndex, pauseFlagCol).setValue(flagValue);
        console.log('[MerchantSystem] Pause flag updated to:', flagValue);
      }

      // 一時停止開始日の保存
      if (pauseStartCol > 0 && pauseStartDate !== undefined && pauseStartDate !== '') {
        sheet.getRange(sheetRowIndex, pauseStartCol).setValue(pauseStartDate);
        console.log('[MerchantSystem] Pause start date updated to:', pauseStartDate);
      }

      // 一時停止再開予定日の保存
      if (pauseEndCol > 0) {
        if (pauseEndDate !== undefined && pauseEndDate !== '') {
          sheet.getRange(sheetRowIndex, pauseEndCol).setValue(pauseEndDate);
          console.log('[MerchantSystem] Pause end date updated to:', pauseEndDate);
        } else {
          sheet.getRange(sheetRowIndex, pauseEndCol).setValue('');
          console.log('[MerchantSystem] Pause end date cleared');
        }
      }

      // ステータス（AJ列）を更新
      // - アクティブ: pauseFlag = false
      // - 一時停止: pauseFlag = true + 再開予定日あり
      // - 休止: pauseFlag = true + 再開予定日なし（未定）
      if (statusCol > 0) {
        let statusValue = 'アクティブ';
        const isPaused = (pauseFlag === 'true' || pauseFlag === true);

        if (isPaused) {
          if (pauseEndDate && pauseEndDate !== '') {
            statusValue = '一時停止';
          } else {
            statusValue = '休止';
          }
        }

        sheet.getRange(sheetRowIndex, statusCol).setValue(statusValue);
        console.log('[MerchantSystem] Status updated to:', statusValue);
      }

      console.log('[MerchantSystem] updatePauseSettings - Updated row:', sheetRowIndex);

      return {
        success: true,
        message: '一時停止設定を更新しました'
      };

    } catch (error) {
      console.error('[MerchantSystem] updatePauseSettings error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 一時停止を解除してアクティブに戻す（V1702）
   * ヘッダーのステータスクリックから呼ばれる
   */
  resumeAutoDelivery: function(params) {
    try {
      console.log('[MerchantSystem] resumeAutoDelivery called with params:', params);

      const { merchantId } = params;

      if (!merchantId) {
        return {
          success: false,
          error: 'merchantIdが指定されていません'
        };
      }

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const headers = data[0];
      const rows = data.slice(1);

      // B列（インデックス1）で加盟店ID検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // シートの行番号は1ベース + ヘッダー行なので +2
      const sheetRowIndex = rowIndex + 2;

      // 一時停止関連の列インデックスを取得
      const pauseFlagCol = headers.indexOf('一時停止フラグ') + 1;
      const pauseStartCol = headers.indexOf('一時停止開始日') + 1;
      const pauseEndCol = headers.indexOf('一時停止再開予定日') + 1;
      const statusCol = headers.indexOf('ステータス') + 1;

      // 一時停止フラグをFALSEに設定
      if (pauseFlagCol > 0) {
        sheet.getRange(sheetRowIndex, pauseFlagCol).setValue(false);
        console.log('[MerchantSystem] Pause flag set to FALSE');
      }

      // 一時停止開始日をクリア
      if (pauseStartCol > 0) {
        sheet.getRange(sheetRowIndex, pauseStartCol).setValue('');
        console.log('[MerchantSystem] Pause start date cleared');
      }

      // 一時停止再開予定日をクリア
      if (pauseEndCol > 0) {
        sheet.getRange(sheetRowIndex, pauseEndCol).setValue('');
        console.log('[MerchantSystem] Pause end date cleared');
      }

      // ステータスをアクティブに設定
      if (statusCol > 0) {
        sheet.getRange(sheetRowIndex, statusCol).setValue('アクティブ');
        console.log('[MerchantSystem] Status set to アクティブ');
      }

      console.log('[MerchantSystem] resumeAutoDelivery - Successfully resumed row:', sheetRowIndex);

      return {
        success: true,
        message: '一時停止を解除しました'
      };

    } catch (error) {
      console.error('[MerchantSystem] resumeAutoDelivery error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 一時停止自動復帰チェック（日次トリガーで実行）
   * 再開予定日が今日の加盟店を自動的にアクティブに戻す
   */
  checkAndResumePausedMerchants() {
    try {
      console.log('[MerchantSystem] checkAndResumePausedMerchants - Start');

      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEETS.FRANCHISE_MERCHANTS);

      if (!sheet) {
        throw new Error('加盟店シートが見つかりません');
      }

      // ヘッダー行を取得
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const pauseFlagCol = headers.indexOf('一時停止フラグ') + 1;
      const pauseEndCol = headers.indexOf('一時停止再開予定日') + 1;
      const pauseStartCol = headers.indexOf('一時停止開始日') + 1;
      const statusCol = headers.indexOf('ステータス') + 1;

      if (pauseFlagCol === 0 || pauseEndCol === 0 || statusCol === 0) {
        console.error('[MerchantSystem] Required columns not found');
        return {
          success: false,
          error: '必要な列が見つかりません'
        };
      }

      // 今日の日付（YYYY-MM-DD形式）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

      console.log('[MerchantSystem] Today:', todayStr);

      // 全データを取得
      const allData = sheet.getDataRange().getValues();
      let resumedCount = 0;

      // 2行目から処理（1行目はヘッダー）
      for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        const pauseFlag = row[pauseFlagCol - 1];
        const pauseEndDate = row[pauseEndCol - 1];

        // 一時停止フラグがTRUEで、再開予定日が今日の場合
        if (pauseFlag === true && pauseEndDate) {
          let endDateStr = '';

          // 日付型の場合
          if (pauseEndDate instanceof Date) {
            endDateStr = Utilities.formatDate(pauseEndDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
          }
          // 文字列の場合
          else if (typeof pauseEndDate === 'string') {
            endDateStr = pauseEndDate;
          }

          console.log('[MerchantSystem] Checking row', i + 1, '- End date:', endDateStr);

          // 再開予定日が今日と一致する場合
          if (endDateStr === todayStr) {
            const rowIndex = i + 1;

            // 一時停止フラグをFALSEに
            sheet.getRange(rowIndex, pauseFlagCol).setValue(false);

            // 一時停止開始日をクリア
            if (pauseStartCol > 0) {
              sheet.getRange(rowIndex, pauseStartCol).setValue('');
            }

            // 一時停止再開予定日をクリア
            sheet.getRange(rowIndex, pauseEndCol).setValue('');

            // ステータスをアクティブに
            sheet.getRange(rowIndex, statusCol).setValue('アクティブ');

            resumedCount++;
            console.log('[MerchantSystem] Resumed merchant at row:', rowIndex);
          }
        }
      }

      console.log('[MerchantSystem] checkAndResumePausedMerchants - Completed. Resumed:', resumedCount);

      return {
        success: true,
        message: `${resumedCount}件の加盟店を自動復帰しました`,
        resumedCount: resumedCount
      };

    } catch (error) {
      console.error('[MerchantSystem] checkAndResumePausedMerchants error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * キャッシュ更新チェック（軽量API）
   * フロントエンドのキャッシュが古いかどうかを判定
   */
  checkUpdate: function(params) {
    try {
      const merchantId = params.merchantId;
      const lastUpdate = parseInt(params.lastUpdate) || 0;

      if (!merchantId) {
        return {
          success: false,
          error: 'merchantId is required'
        };
      }

      console.log('[MerchantSystem] checkUpdate - merchantId:', merchantId, 'lastUpdate:', new Date(lastUpdate));

      // スプレッドシート取得
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.MERCHANT_SHEET_NAME);

      if (!sheet) {
        return {
          success: false,
          error: 'Sheet not found'
        };
      }

      // シートの最終更新日時を取得
      const sheetLastModified = sheet.getLastUpdated().getTime();

      console.log('[MerchantSystem] Sheet last modified:', new Date(sheetLastModified));
      console.log('[MerchantSystem] Client last update:', new Date(lastUpdate));

      // 更新があるかチェック（5秒のバッファを持たせる）
      const hasUpdate = sheetLastModified > (lastUpdate + 5000);

      console.log('[MerchantSystem] hasUpdate:', hasUpdate);

      return {
        success: true,
        hasUpdate: hasUpdate,
        lastModified: sheetLastModified
      };

    } catch (error) {
      console.error('[MerchantSystem] checkUpdate error:', error);
      // エラー時は更新なしとして返す（フロントエンドがキャッシュを使い続ける）
      return {
        success: true,
        hasUpdate: false,
        error: error.toString()
      };
    }
  },

  /**
   * 会社情報を更新（基本情報のみ、画像は別のAPIで処理）
   */
  updateCompanyInfo: function(params) {
    try {
      console.log('[MerchantSystem] updateCompanyInfo params:', JSON.stringify(params));

      const merchantId = params.merchantId;
      const data = params.data;

      if (!merchantId || !data) {
        console.error('[MerchantSystem] Missing params - merchantId:', merchantId, 'data:', data);
        return {
          success: false,
          error: '必須パラメータが不足しています'
        };
      }

      console.log('[MerchantSystem] updateCompanyInfo merchantId:', merchantId);

      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');

      if (!sheet) {
        throw new Error('加盟店登録シートが見つかりません');
      }

      const allData = sheet.getDataRange().getValues();
      let rowIndex = -1;

      // 加盟店IDで行を検索（B列 = index 1）
      console.log('[MerchantSystem] Searching for merchantId:', merchantId, 'in', allData.length, 'rows');
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][1] === merchantId) { // B列：加盟店ID
          rowIndex = i;
          console.log('[MerchantSystem] Found at row:', rowIndex);
          break;
        }
      }

      if (rowIndex === -1) {
        console.error('[MerchantSystem] Merchant not found:', merchantId);
        return {
          success: false,
          error: '加盟店が見つかりません（ID: ' + merchantId + '）'
        };
      }

      // データを更新
      const row = rowIndex + 1;

      console.log('[MerchantSystem] Data to save:', JSON.stringify(data));
      console.log('[MerchantSystem] Row to update:', row);

      // 各フィールドを対応する列に保存
      // 基本情報
      if (data.companyName !== undefined) {
        sheet.getRange(row, 3).setValue(data.companyName); // C列：会社名
      }
      if (data.companyNameKana !== undefined) {
        sheet.getRange(row, 4).setValue(data.companyNameKana); // D列：会社名カナ
      }
      if (data.tradeName !== undefined) {
        sheet.getRange(row, 5).setValue(data.tradeName); // E列：屋号
      }
      if (data.tradeNameKana !== undefined) {
        sheet.getRange(row, 6).setValue(data.tradeNameKana); // F列：屋号カナ
      }
      if (data.representative !== undefined) {
        sheet.getRange(row, 7).setValue(data.representative); // G列：代表者名
      }
      if (data.representativeKana !== undefined) {
        sheet.getRange(row, 8).setValue(data.representativeKana); // H列：代表者名カナ
      }

      // 住所情報
      if (data.postalCode !== undefined) {
        sheet.getRange(row, 9).setValue(data.postalCode); // I列：郵便番号
      }
      if (data.address !== undefined) {
        sheet.getRange(row, 10).setValue(data.address); // J列：住所
      }
      if (data.phone !== undefined) {
        sheet.getRange(row, 11).setValue(data.phone); // K列：電話番号
      }
      if (data.website !== undefined) {
        sheet.getRange(row, 12).setValue(data.website); // L列：ウェブサイト
      }

      // 設立年月とPR文
      if (data.established !== undefined) {
        sheet.getRange(row, 13).setValue(data.established); // M列：設立年月
      }
      if (data.prText !== undefined) {
        sheet.getRange(row, 14).setValue(data.prText); // N列：PR文
      }

      // 支店情報（O列〜P列あたりと仮定、実際の列を確認してください）
      if (data.branchName !== undefined) {
        sheet.getRange(row, 15).setValue(data.branchName); // O列：支店名（要確認）
      }
      if (data.branchAddress !== undefined) {
        sheet.getRange(row, 16).setValue(data.branchAddress); // P列：支店住所（要確認）
      }

      // 事業詳細
      if (data.employees !== undefined) {
        sheet.getRange(row, 17).setValue(data.employees); // Q列：従業員数（要確認）
      }
      if (data.salesScale !== undefined) {
        sheet.getRange(row, 18).setValue(data.salesScale); // R列：売上規模（要確認）
      }
      if (data.businessHours !== undefined) {
        sheet.getRange(row, 19).setValue(data.businessHours); // S列：営業時間（要確認）
      }
      if (data.holidays !== undefined) {
        sheet.getRange(row, 20).setValue(data.holidays); // T列：定休日（要確認）
      }
      if (data.paymentMethods !== undefined) {
        sheet.getRange(row, 21).setValue(data.paymentMethods); // U列：支払方法（要確認）
      }

      // メールアドレス
      if (data.billingEmail !== undefined) {
        sheet.getRange(row, 22).setValue(data.billingEmail); // V列：請求用メール
      }
      if (data.salesEmail !== undefined) {
        sheet.getRange(row, 23).setValue(data.salesEmail); // W列：営業用メール
      }

      // 営業担当者情報
      if (data.salesPersonName !== undefined) {
        sheet.getRange(row, 24).setValue(data.salesPersonName); // X列：営業担当者氏名
      }
      if (data.salesPersonKana !== undefined) {
        sheet.getRange(row, 25).setValue(data.salesPersonKana); // Y列：営業担当者カナ
      }

      // 連絡先情報
      if (data.contactPerson !== undefined) {
        sheet.getRange(row, 26).setValue(data.contactPerson); // Z列：担当者名（要確認）
      }
      if (data.contactPersonKana !== undefined) {
        sheet.getRange(row, 27).setValue(data.contactPersonKana); // AA列：担当者名カナ（要確認）
      }
      if (data.contactPhone !== undefined) {
        sheet.getRange(row, 28).setValue(data.contactPhone); // AB列：担当者電話（要確認）
      }
      if (data.contactEmail !== undefined) {
        sheet.getRange(row, 29).setValue(data.contactEmail); // AC列：担当者メール（要確認）
      }

      console.log('[MerchantSystem] Company info updated for:', merchantId);

      return {
        success: true,
        message: '会社情報を更新しました'
      };

    } catch (error) {
      console.error('[MerchantSystem] updateCompanyInfo error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店データ更新（会社情報画面から）
   */
  updateMerchantData: function(params) {
    try {
      const { merchantId, data } = params;

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが必要です'
        };
      }

      if (!data) {
        return {
          success: false,
          error: '更新データが必要です'
        };
      }

      // 🔍 プライバシー設定のデバッグログ
      console.log('[updateMerchantData] 🔍 プライバシー設定受信確認:', {
        merchantId: merchantId,
        representativeHide: data.representativeHide,
        addressHide: data.addressHide,
        hasRepresentativeHide: data.hasOwnProperty('representativeHide'),
        hasAddressHide: data.hasOwnProperty('addressHide'),
        allDataKeys: Object.keys(data)
      });

      // DataAccessLayerを使用（利用できない場合は直接アクセス）
      let sheet;
      try {
        if (typeof DataAccessLayer !== 'undefined' && DataAccessLayer.getRegistrationSheet) {
          sheet = DataAccessLayer.getRegistrationSheet();
        } else {
          // 直接アクセス
          const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          const ss = SpreadsheetApp.openById(spreadsheetId);
          sheet = ss.getSheetByName('加盟店登録');
        }
      } catch (dataAccessError) {
        console.error('[updateMerchantData] DataAccessLayer error, using direct access:', dataAccessError);
        // 直接アクセス
        const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        const ss = SpreadsheetApp.openById(spreadsheetId);
        sheet = ss.getSheetByName('加盟店登録');
      }

      if (!sheet) {
        throw new Error('加盟店登録シートが見つかりません');
      }

      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const rows = allData.slice(1);

      // B列で加盟店IDを検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '加盟店が見つかりません'
        };
      }

      const row = rowIndex + 2; // ヘッダー行を考慮

      // ヘッダーと列インデックスのマッピング
      const columnMap = {};
      headers.forEach((header, index) => {
        columnMap[header] = index + 1; // 1-based index
      });

      // 全フィールドを更新
      // 基本情報
      if (data.companyName !== undefined) sheet.getRange(row, columnMap['会社名'] || 3).setValue(data.companyName);
      if (data.companyNameKana !== undefined) sheet.getRange(row, columnMap['会社名カナ'] || 4).setValue(data.companyNameKana);
      if (data.tradeName !== undefined) sheet.getRange(row, columnMap['屋号'] || 5).setValue(data.tradeName);
      if (data.tradeNameKana !== undefined) sheet.getRange(row, columnMap['屋号カナ'] || 6).setValue(data.tradeNameKana);
      if (data.representative !== undefined) sheet.getRange(row, columnMap['代表者名'] || 7).setValue(data.representative);
      if (data.representativeKana !== undefined) sheet.getRange(row, columnMap['代表者名カナ'] || 8).setValue(data.representativeKana);
      // zipCode と postalCode の両方に対応
      if (data.zipCode !== undefined) sheet.getRange(row, columnMap['郵便番号'] || 9).setValue(data.zipCode);
      if (data.postalCode !== undefined) sheet.getRange(row, columnMap['郵便番号'] || 9).setValue(data.postalCode);
      if (data.address !== undefined) sheet.getRange(row, columnMap['住所'] || 10).setValue(data.address);
      if (data.phone !== undefined) sheet.getRange(row, columnMap['電話番号'] || 11).setValue(data.phone);
      if (data.website !== undefined) sheet.getRange(row, columnMap['ウェブサイトURL'] || 12).setValue(data.website);
      if (data.established !== undefined) sheet.getRange(row, columnMap['設立年月'] || 13).setValue(data.established);
      if (data.prText !== undefined) sheet.getRange(row, columnMap['PRテキスト'] || 14).setValue(data.prText);
      if (data.branchName !== undefined) sheet.getRange(row, columnMap['支店名'] || 15).setValue(data.branchName);
      if (data.branchAddress !== undefined) sheet.getRange(row, columnMap['支店住所'] || 16).setValue(data.branchAddress);
      if (data.billingEmail !== undefined) sheet.getRange(row, columnMap['請求用メールアドレス'] || 22).setValue(data.billingEmail);
      if (data.salesEmail !== undefined) sheet.getRange(row, columnMap['営業用メールアドレス'] || 23).setValue(data.salesEmail);
      if (data.salesPersonName !== undefined) sheet.getRange(row, columnMap['営業担当者氏名'] || 24).setValue(data.salesPersonName);
      if (data.salesPersonKana !== undefined) sheet.getRange(row, columnMap['営業担当者カナ'] || 25).setValue(data.salesPersonKana);
      if (data.employees !== undefined) sheet.getRange(row, columnMap['従業員数'] || 26).setValue(data.employees);
      if (data.salesScale !== undefined) sheet.getRange(row, columnMap['売上規模'] || 27).setValue(data.salesScale);

      // 自動配信設定
      if (data.propertyTypes !== undefined) sheet.getRange(row, columnMap['対応可能物件種別'] || 28).setValue(data.propertyTypes);
      if (data.maxFloors !== undefined) sheet.getRange(row, columnMap['最大対応階数'] || 29).setValue(data.maxFloors);
      if (data.buildingAge !== undefined) sheet.getRange(row, columnMap['築年数対応範囲'] || 30).setValue(data.buildingAge);
      if (data.constructionTypes !== undefined) sheet.getRange(row, columnMap['施工箇所'] || 31).setValue(data.constructionTypes);
      if (data.specialServices !== undefined) sheet.getRange(row, columnMap['特殊対応項目'] || 32).setValue(data.specialServices);
      if (data.prefectures !== undefined) sheet.getRange(row, columnMap['対応都道府県'] || 33).setValue(data.prefectures);
      if (data.cities !== undefined) sheet.getRange(row, columnMap['対応市区町村'] || 34).setValue(data.cities);
      if (data.priorityAreas !== undefined) sheet.getRange(row, columnMap['優先エリア'] || 35).setValue(data.priorityAreas);
      if (data.status !== undefined) sheet.getRange(row, columnMap['ステータス'] || 36).setValue(data.status);
      if (data.pauseFlag !== undefined) sheet.getRange(row, columnMap['一時停止フラグ'] || 41).setValue(data.pauseFlag);
      if (data.pauseStartDate !== undefined) sheet.getRange(row, columnMap['一時停止開始日'] || 42).setValue(data.pauseStartDate);
      if (data.pauseEndDate !== undefined) sheet.getRange(row, columnMap['一時停止再開予定日'] || 43).setValue(data.pauseEndDate);

      // メインビジュアル・ギャラリー
      if (data['メインビジュアル'] !== undefined) sheet.getRange(row, columnMap['メインビジュアル'] || 44).setValue(data['メインビジュアル']);
      if (data['写真ギャラリー'] !== undefined) sheet.getRange(row, columnMap['写真ギャラリー'] || 45).setValue(data['写真ギャラリー']);

      // 保有資格・加入保険
      if (data.qualifications !== undefined) sheet.getRange(row, columnMap['保有資格'] || 46).setValue(data.qualifications);
      if (data.insurance !== undefined) sheet.getRange(row, columnMap['加入保険'] || 47).setValue(data.insurance);

      // 🚀 プライバシー設定（AY・AZ列）
      if (data.representativeHide !== undefined) {
        const ayColumn = columnMap['代表者名非表示'] || 51; // AY列 (1-based index: 51)
        sheet.getRange(row, ayColumn).setValue(data.representativeHide);
        console.log(`[updateMerchantData] 代表者名非表示設定をAY列(${ayColumn})に保存:`, data.representativeHide);
      }
      if (data.addressHide !== undefined) {
        const azColumn = columnMap['住所非表示'] || 52; // AZ列 (1-based index: 52)
        sheet.getRange(row, azColumn).setValue(data.addressHide);
        console.log(`[updateMerchantData] 住所非表示設定をAZ列(${azColumn})に保存:`, data.addressHide);
      }

      return {
        success: true,
        message: 'データを更新しました'
      };

    } catch (error) {
      console.error('[updateMerchantData] Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * プレビュー設定を保存
   */
  savePreviewSettings: function(params) {
    try {
      const merchantId = params.merchantId;
      const previewSettings = params.previewSettings;

      if (!merchantId) {
        return {
          success: false,
          error: 'merchantIdが指定されていません'
        };
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName('プレビュー');

      // シートが存在しない場合は作成
      if (!sheet) {
        sheet = ss.insertSheet('プレビュー');
        sheet.getRange(1, 1, 1, 8).setValues([[
          '加盟店ID',
          'メインビジュアル位置X',
          'メインビジュアル位置Y',
          'メインビジュアルズーム',
          'メインビジュアル明るさ',
          'メインビジュアル文字色',
          '会社名表示',
          '更新日時'
        ]]);
        sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      // 既存データを検索
      const data = sheet.getDataRange().getValues();
      let targetRow = -1;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId) {
          targetRow = i + 1;
          break;
        }
      }

      // 新規行の場合
      if (targetRow === -1) {
        targetRow = sheet.getLastRow() + 1;
      }

      // データを保存
      const row = [
        merchantId,
        previewSettings.imagePositionX || 50,
        previewSettings.imagePositionY || 50,
        previewSettings.imageZoom || 100,
        previewSettings.imageBrightness || 100,
        previewSettings.textColor || '#000000',
        previewSettings.companyNameDisplay || 'company',
        new Date()
      ];

      // セルフォーマットを設定（特にF列を文字列に）
      const range = sheet.getRange(targetRow, 1, 1, 8);
      range.setValues([row]);

      // F列（文字色）を文字列フォーマットに設定
      sheet.getRange(targetRow, 6).setNumberFormat('@STRING@');

      // G列（会社名表示）も文字列フォーマットに設定
      sheet.getRange(targetRow, 7).setNumberFormat('@STRING@');

      console.log(`[savePreviewSettings] Saved for merchantId: ${merchantId} at row ${targetRow}`);

      return {
        success: true,
        merchantId: merchantId,
        row: targetRow,
        message: 'プレビュー設定を保存しました'
      };

    } catch (error) {
      console.error('[savePreviewSettings] Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * プレビュー設定を読み込み
   */
  getPreviewSettings: function(params) {
    try {
      const merchantId = params.merchantId;

      if (!merchantId) {
        return {
          success: false,
          error: 'merchantIdが指定されていません'
        };
      }

      console.log('[getPreviewSettings] merchantId:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('プレビュー');

      const defaultSettings = {
        imagePositionX: 50,
        imagePositionY: 50,
        imageZoom: 100,
        imageBrightness: 100,
        textColor: '#000000',
        companyNameDisplay: 'company'
      };

      if (!sheet) {
        console.log('[getPreviewSettings] シート「プレビュー」が見つかりません');
        return {
          success: true,
          settings: defaultSettings
        };
      }

      const data = sheet.getDataRange().getValues();
      console.log('[getPreviewSettings] データ行数:', data.length);

      for (let i = 1; i < data.length; i++) {
        console.log('[getPreviewSettings] 行', i, 'ID:', data[i][0], 'vs', merchantId);
        if (data[i][0] === merchantId) {
          console.log('[getPreviewSettings] ✅ マッチ！設定を返します:', data[i]);
          return {
            success: true,
            settings: {
              imagePositionX: data[i][1] !== undefined && data[i][1] !== '' ? data[i][1] : 50,
              imagePositionY: data[i][2] !== undefined && data[i][2] !== '' ? data[i][2] : 50,
              imageZoom: data[i][3] !== undefined && data[i][3] !== '' ? data[i][3] : 100,
              imageBrightness: data[i][4] !== undefined && data[i][4] !== '' ? data[i][4] : 100,
              textColor: data[i][5] || '#000000',
              companyNameDisplay: data[i][6] || 'company' // G列=会社名表示
            }
          };
        }
      }

      // データが見つからない場合はデフォルト値
      console.log('[getPreviewSettings] ❌ データが見つかりませんでした');
      return {
        success: true,
        settings: defaultSettings
      };

    } catch (error) {
      console.error('[getPreviewSettings] Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * URLスラッグとプレビューHPを更新（重複チェック付き）
   */
  updateMerchantUrlAndPreviewHp: function(params) {
    try {
      console.log('[MerchantSystem] updateMerchantUrlAndPreviewHp called with params:', JSON.stringify(params));

      const { merchantId, urlSlug } = params;

      if (!merchantId || !urlSlug) {
        return {
          success: false,
          error: '加盟店IDとURLスラッグが必要です'
        };
      }

      // URLスラッグの形式チェック（英数字とハイフンのみ）
      const urlSlugPattern = /^[a-zA-Z0-9\-]+$/;
      if (!urlSlugPattern.test(urlSlug)) {
        return {
          success: false,
          error: 'URLスラッグは英数字とハイフン（-）のみ使用できます'
        };
      }

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const headers = data[0];
      const rows = data.slice(1);

      // AV列（URLスラッグ）とAX列（プレビューHP）のインデックスを取得
      // AV列 = 48列目（A=1, B=2, ..., AV=48）= インデックス47
      // AX列 = 50列目（A=1, B=2, ..., AX=50）= インデックス49
      const urlSlugColIndex = 47; // AV列（0ベースで47）
      const previewHpColIndex = 49; // AX列（0ベースで49）

      // B列（インデックス1）で現在の加盟店を検索
      const currentRowIndex = rows.findIndex(row => row[1] === merchantId);

      if (currentRowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // 他の加盟店で同じURLスラッグが使われていないかチェック
      // URLスラッグは会社名部分のみで比較（AV列の値から会社名部分を抽出）
      const duplicateRowIndex = rows.findIndex((row, index) => {
        if (index === currentRowIndex) return false; // 自分自身は除外
        if (!row[urlSlugColIndex]) return false; // 値が存在しない場合は除外

        const existingUrlSlug = row[urlSlugColIndex].toString();
        // AV列から会社名部分を抽出（エリア/会社名 の形式の場合）
        const existingCompanySlug = existingUrlSlug.includes('/')
          ? existingUrlSlug.split('/').pop()
          : existingUrlSlug;

        console.log(`[重複チェック] 既存: ${existingCompanySlug} vs 新規: ${urlSlug}`);
        return existingCompanySlug.toLowerCase() === urlSlug.toLowerCase();
      });

      if (duplicateRowIndex !== -1) {
        const duplicateMerchantId = rows[duplicateRowIndex][1];
        return {
          success: false,
          error: `このURLスラッグは既に他の加盟店（ID: ${duplicateMerchantId}）で使用されています。別のURLスラッグを設定してください。`,
          isDuplicate: true
        };
      }

      // シートの行番号は1ベース + ヘッダー行なので +2
      const sheetRowIndex = currentRowIndex + 2;
      const urlSlugColumnIndex = 48; // AV列 = 48列目
      const previewHpColumnIndex = 50; // AX列 = 50列目

      // 現在のAX列の値からエリア情報を取得
      const currentPreviewHp = rows[currentRowIndex][previewHpColIndex] || '';
      let area = 'city'; // デフォルトエリア

      if (currentPreviewHp) {
        // 既存のプレビューHPからエリア部分を抽出
        const urlParts = currentPreviewHp.split('/').filter(part => part.length > 0);
        if (urlParts.length >= 3) {
          area = urlParts[2]; // https, domain, area の順
        }
        console.log(`[エリア取得] 既存URL: ${currentPreviewHp} → エリア: ${area}`);
      }

      // プレビューHP URLを生成（正しいエリア構造）
      const previewHpUrl = `https://gaihekikuraberu.com/${area}/${urlSlug}/`;
      console.log(`[URL生成] 新しいプレビューHP: ${previewHpUrl}`);

      // AV列に保存する値（エリア/会社名の形式）
      const fullUrlSlug = `${area}/${urlSlug}`;

      // 両方の列を更新
      sheet.getRange(sheetRowIndex, urlSlugColumnIndex).setValue(fullUrlSlug);
      sheet.getRange(sheetRowIndex, previewHpColumnIndex).setValue(previewHpUrl);

      console.log('[MerchantSystem] AV列（URLスラッグ）:', fullUrlSlug);
      console.log('[MerchantSystem] AX列（プレビューHP）:', previewHpUrl);

      console.log('[MerchantSystem] updateMerchantUrlAndPreviewHp - Updated row:', sheetRowIndex);
      console.log('[MerchantSystem] URLスラッグ updated to:', urlSlug);
      console.log('[MerchantSystem] プレビューHP updated to:', previewHpUrl);

      // HP生成とGoogleドライブ保存を実行
      console.log('[MerchantSystem] HP生成開始...');

      try {
        // 加盟店データを取得
        const merchantData = {};
        headers.forEach((header, index) => {
          merchantData[header] = rows[currentRowIndex][index];
        });

        // HTML生成
        if (typeof generateStaticHTML === 'function') {
          const html = generateStaticHTML(merchantData);
          console.log('[MerchantSystem] HTML生成完了:', Math.round(html.length / 1024) + 'KB');

          // Googleドライブに保存
          if (typeof StaticHTMLGenerator !== 'undefined' && StaticHTMLGenerator.saveToGoogleDrive) {
            const saveResult = StaticHTMLGenerator.saveToGoogleDrive(html, area, urlSlug, merchantData);
            console.log('[MerchantSystem] Google Drive保存結果:', saveResult);
          }
        } else {
          console.error('[MerchantSystem] generateStaticHTML関数が見つかりません');
        }
      } catch (htmlError) {
        console.error('[MerchantSystem] HP生成エラー:', htmlError);
        // エラーがあってもURLスラッグ更新は成功として返す
      }

      return {
        success: true,
        message: 'URLスラッグとプレビューHPを更新しました',
        urlSlug: fullUrlSlug,
        companySlug: urlSlug,
        previewHpUrl: previewHpUrl,
        area: area
      };

    } catch (error) {
      console.error('[MerchantSystem] updateMerchantUrlAndPreviewHp error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  // ========================================
  // 内部関数（認証関連）
  // ========================================

  /**
   * URL署名検証（内部関数）
   * @param {string} payload - Base64エンコードされたデータ
   * @param {string} signature - 署名
   * @return {string|null} - merchantId or null
   */
  _verifySignedUrl: function(payload, signature) {
    try {
      const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
      console.log('[_verifySignedUrl] payload:', payload);
      console.log('[_verifySignedUrl] signature:', signature);

      const data = JSON.parse(Utilities.newBlob(
        Utilities.base64DecodeWebSafe(payload)
      ).getDataAsString());

      console.log('[_verifySignedUrl] decoded data:', JSON.stringify(data));

      // 署名検証
      const expectedSig = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        JSON.stringify(data) + SECRET_KEY
      ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').substring(0, 16);

      console.log('[_verifySignedUrl] expected sig:', expectedSig);
      console.log('[_verifySignedUrl] received sig:', signature);
      console.log('[_verifySignedUrl] sig match:', signature === expectedSig);

      if (signature !== expectedSig) {
        console.error('[_verifySignedUrl] Signature mismatch');
        return null;
      }

      const now = Date.now();
      console.log('[_verifySignedUrl] now:', now, 'expires:', data.expires);

      if (now > data.expires) {
        console.error('[_verifySignedUrl] Token expired');
        return null;
      }

      console.log('[_verifySignedUrl] Success! merchantId:', data.merchantId);
      return data.merchantId;
    } catch(e) {
      console.error('[_verifySignedUrl] Exception:', e.toString());
      return null;
    }
  },

  /**
   * 認証情報シート初期化（内部関数）
   * @return {Sheet} - 認証情報シート
   */
  _initCredentialsSheet: function() {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('認証情報');

    if (!sheet) {
      sheet = ss.insertSheet('認証情報');
      sheet.getRange(1, 1, 1, 5).setValues([[
        '加盟店ID', 'メールアドレス', 'パスワードハッシュ', '最終ログイン', 'パスワード変更日'
      ]]);
      sheet.hideSheet(); // シート非表示
    }
    return sheet;
  },

  /**
   * パスワード保存（内部関数）
   * @param {string} merchantId - 加盟店ID
   * @param {string} plainPassword - 平文パスワード
   * @return {object} - 成功/失敗
   */
  _savePassword: function(merchantId, plainPassword) {
    console.log('[_savePassword] 開始 - ID:', merchantId, 'Pass長:', plainPassword.length);
    const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
    console.log('[_savePassword] SECRET_KEY:', SECRET_KEY);

    const sheet = this._initCredentialsSheet();
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      plainPassword + SECRET_KEY + merchantId
    ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');

    // 既存レコード検索
    const data = sheet.getDataRange().getValues();
    const rowIndex = data.findIndex(function(row) { return row[0] === merchantId; });

    if (rowIndex > 0) {
      sheet.getRange(rowIndex + 1, 3).setValue(hash);
      sheet.getRange(rowIndex + 1, 5).setValue(new Date());
    } else {
      // 新規追加
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const merchantSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const merchantData = merchantSheet.getDataRange().getValues();
      const merchant = merchantData.find(function(row) { return row[1] === merchantId; }); // B列が登録ID
      const email = merchant ? merchant[22] : ''; // W列：営業用メールアドレス

      sheet.appendRow([merchantId, email, hash, '', new Date()]);
    }

    return {success: true};
  },

  /**
   * ログイン検証（内部関数）
   * @param {string} merchantId - 加盟店ID
   * @param {string} inputPassword - 入力されたパスワード
   * @return {boolean} - 認証成功/失敗
   */
  _verifyLogin: function(merchantId, inputPassword) {
    console.log('[_verifyLogin] 開始 - ID:', merchantId);
    const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');

    const sheet = this._initCredentialsSheet();
    const data = sheet.getDataRange().getValues();
    const merchant = data.find(function(row) { return row[0] === merchantId; });

    if (!merchant) return false;

    const inputHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      inputPassword + SECRET_KEY + merchantId
    ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');

    console.log('[_verifyLogin] 保存ハッシュ:', merchant[2]);
    console.log('[_verifyLogin] 入力ハッシュ:', inputHash);

    const isValid = merchant[2] === inputHash;
    console.log('[_verifyLogin] 結果:', isValid);

    if (isValid) {
      // 最終ログイン更新
      const rowIndex = data.indexOf(merchant);
      sheet.getRange(rowIndex + 1, 4).setValue(new Date());
    }

    return isValid;
  },

  /**
   * メインビジュアル画像を直接アップロード（CompanyInfoManagerが利用できない場合のフォールバック）
   */
  uploadMainVisualDirect: function(params) {
    try {
      console.log('[MerchantSystem] uploadMainVisualDirect called with params:', Object.keys(params));

      const { merchantId, base64Data, imageType, fileName } = params;

      if (!merchantId || !base64Data) {
        return { success: false, error: '必須パラメータが不足しています (merchantId, base64Data)' };
      }

      // 対応するimageTypeをチェック
      const allowedImageTypes = ['main-visual', 'construction-example', 'gallery'];
      if (!allowedImageTypes.includes(imageType)) {
        return { success: false, error: `対応していない画像タイプです: ${imageType}. 対応タイプ: ${allowedImageTypes.join(', ')}` };
      }

      // Base64データの検証
      const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return { success: false, error: '無効なBase64データ形式です' };
      }

      const mimeType = base64Match[1];
      const base64Content = base64Match[2];

      // 許可されるファイル形式をチェック
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return { success: false, error: '対応していない画像形式です: ' + mimeType };
      }

      // Base64をデコード
      const decoded = Utilities.base64Decode(base64Content);

      // ファイルサイズチェック (10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (decoded.length > MAX_FILE_SIZE) {
        return { success: false, error: 'ファイルサイズが10MBを超えています' };
      }

      // Google Driveにアップロード
      const scriptProperties = PropertiesService.getScriptProperties();
      const rootFolderId = scriptProperties.getProperty('DRIVE_ROOT_FOLDER_ID');

      if (!rootFolderId) {
        return { success: false, error: 'DRIVE_ROOT_FOLDER_ID が設定されていません' };
      }

      const rootFolder = DriveApp.getFolderById(rootFolderId);

      // /加盟店画像/ フォルダを取得または作成
      let merchantImagesFolder;
      const merchantImagesFolders = rootFolder.getFoldersByName('加盟店画像');
      if (merchantImagesFolders.hasNext()) {
        merchantImagesFolder = merchantImagesFolders.next();
      } else {
        merchantImagesFolder = rootFolder.createFolder('加盟店画像');
      }

      // /{merchantId}/ フォルダを取得または作成
      let merchantFolder;
      const merchantFolders = merchantImagesFolder.getFoldersByName(merchantId);
      if (merchantFolders.hasNext()) {
        merchantFolder = merchantFolders.next();
      } else {
        merchantFolder = merchantImagesFolder.createFolder(merchantId);
      }

      // imageTypeに応じたサブフォルダを取得または作成
      let targetFolder;
      const subFolderName = imageType === 'construction-example' ? 'construction-examples' :
                           imageType === 'gallery' ? 'photo-gallery' : 'main-visual';

      const targetFolders = merchantFolder.getFoldersByName(subFolderName);
      if (targetFolders.hasNext()) {
        targetFolder = targetFolders.next();
      } else {
        targetFolder = merchantFolder.createFolder(subFolderName);
      }

      // ファイル名を生成
      const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
      const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');

      let defaultFileName;
      switch (imageType) {
        case 'construction-example':
          defaultFileName = 'construction_' + timestamp + '.' + extension;
          break;
        case 'gallery':
          defaultFileName = 'gallery_' + timestamp + '.' + extension;
          break;
        default: // main-visual
          defaultFileName = 'main_visual_' + timestamp + '.' + extension;
          break;
      }

      const finalFileName = fileName || defaultFileName;

      // ファイルを作成
      const blob = Utilities.newBlob(decoded, mimeType, finalFileName);
      const file = targetFolder.createFile(blob);

      // ファイルを公開設定
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileId = file.getId();
      const url = 'https://drive.google.com/uc?export=view&id=' + fileId;

      console.log('[MerchantSystem] アップロード成功:', finalFileName, 'DriveID:', fileId);

      // main-visualの場合のみスプレッドシートのメインビジュアル列を更新（AR列 = 44列目）
      if (imageType === 'main-visual') {
        const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
        const ss = SpreadsheetApp.openById(spreadsheetId);
        const sheet = ss.getSheetByName('加盟店登録');
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
          if (data[i][1] === merchantId) { // B列：加盟店ID
            sheet.getRange(i + 1, 44).setValue(url); // AR列 = 44列目
            console.log('[MerchantSystem] スプレッドシート更新完了:', url);
            break;
          }
        }
      } else {
        console.log('[MerchantSystem] 非main-visual画像のため、スプレッドシート更新をスキップ');
      }

      return {
        success: true,
        url: url,
        fileId: fileId,
        fileName: finalFileName
      };

    } catch (error) {
      console.error('[MerchantSystem] uploadMainVisualDirect error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * GitHub Actions ワークフローを実行（FTP同期）
   */
  triggerFTPSync: function() {
    try {
      console.log('[MerchantSystem] GitHub Actions FTP同期開始');

      // GitHub Personal Access Token取得
      const githubToken = PropertiesService.getScriptProperties().getProperty('GH_PAT');
      if (!githubToken) {
        console.error('[MerchantSystem] GH_PAT not found in Script Properties');
        return {
          success: false,
          error: 'GitHub Token not configured'
        };
      }

      // GitHub Actions workflow_dispatch APIを実行
      const url = 'https://api.github.com/repos/gaihekitosoukuraberu/kuraberu-main/actions/workflows/google-drive-to-ftp.yml/dispatches';

      const payload = {
        ref: 'main' // mainブランチで実行
      };

      const options = {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + githubToken,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      console.log('[MerchantSystem] GitHub API実行:', url);
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();

      console.log('[MerchantSystem] GitHub API Response Code:', responseCode);

      if (responseCode === 204) {
        console.log('[MerchantSystem] ✅ GitHub Actions実行成功（FTP同期開始）');
        return {
          success: true,
          message: 'FTP sync triggered successfully'
        };
      } else {
        const responseText = response.getContentText();
        console.error('[MerchantSystem] GitHub API Error:', responseText);
        return {
          success: false,
          error: 'GitHub API returned: ' + responseCode + ' - ' + responseText
        };
      }

    } catch (error) {
      console.error('[MerchantSystem] triggerFTPSync error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
};