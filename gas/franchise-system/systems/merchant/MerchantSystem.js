/**
 * ====================================
 * 加盟店向けシステム
 * ====================================
 * 加盟店のログイン・パスワード設定・ダッシュボード用
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

        case 'updateAutoDeliverySettings':
          return this.updateAutoDeliverySettings(params);

        case 'checkUpdate':
          return this.checkUpdate(params);

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
      console.log('[MerchantSystem] POST action:', action);

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

      // auth-manager.jsのverifySignedUrlを使用
      if (typeof verifySignedUrl !== 'function') {
        throw new Error('verifySignedUrl関数が見つかりません');
      }

      const merchantId = verifySignedUrl(data, sig);

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
        if (typeof verifySignedUrl !== 'function') {
          throw new Error('verifySignedUrl関数が見つかりません');
        }

        const verifiedId = verifySignedUrl(data, sig);
        if (!verifiedId || verifiedId !== merchantId) {
          return {
            success: false,
            error: 'URLが無効または期限切れです'
          };
        }
      }

      // パスワード保存（auth-manager.jsを使用）
      if (typeof savePassword !== 'function') {
        throw new Error('savePassword関数が見つかりません');
      }

      const result = savePassword(merchantId, password);

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
      if (typeof verifySignedUrl !== 'function') {
        throw new Error('verifySignedUrl関数が見つかりません');
      }

      const merchantId = verifySignedUrl(data, sig);
      if (!merchantId) {
        return {
          success: false,
          error: 'URLが無効または期限切れです'
        };
      }

      // パスワード保存
      if (typeof savePassword !== 'function') {
        throw new Error('savePassword関数が見つかりません');
      }

      const result = savePassword(merchantId, password);

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

      // X列は24列目（インデックス23、0ベース）
      // A=0, B=1, ..., X=23
      const salesPersonIndex = 23;
      merchantData.salesPerson = merchantRow[salesPersonIndex] || '';

      console.log('[MerchantSystem] getMerchantData - merchantId:', merchantId);
      console.log('[MerchantSystem] getMerchantData - 施工箇所:', merchantData['施工箇所']);
      console.log('[MerchantSystem] getMerchantData - 対応市区町村:', merchantData['対応市区町村']);
      console.log('[MerchantSystem] getMerchantData - 優先エリア:', merchantData['優先エリア']);

      return {
        success: true,
        data: merchantData
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

      // ログイン検証（auth-manager.jsを使用）
      if (typeof verifyLogin !== 'function') {
        throw new Error('verifyLogin関数が見つかりません');
      }

      const isValid = verifyLogin(merchantId, password);

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
      const { merchantId, propertyTypes, maxFloors, ageRange, constructionTypes, specialServices, prefectures, cities, priorities, pauseFlag, pauseStartDate, pauseEndDate } = params;

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
        const flagValue = (pauseFlag === 'true' || pauseFlag === true);
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
  }
};