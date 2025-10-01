/**
 * ルーター - リクエスト振り分け処理
 */

/**
 * POSTリクエストのルーティング
 */
function routePostRequest(data) {
  try {
    const action = data.action;

    switch(action) {
      case 'registerFranchise':
        return handleFranchiseRegister(data);

      case 'updateFranchise':
        return handleFranchiseUpdate(data);

      case 'getFranchiseData':
        return handleGetFranchiseData(data);

      case 'searchCompany':
        return handleSearchCompany(data);

      case 'slackInteraction':
        // Slackインタラクションの処理結果を取得
        const slackResult = handleSlackInteraction(data);
        // Slackには常に200 OKを返す（エラーでもリトライを防ぐため）
        return ContentService
          .createTextOutput('')
          .setMimeType(ContentService.MimeType.TEXT);

      // 管理ダッシュボード用のアクション
      case 'getRegistrationRequests':
        return handleGetRegistrationRequests(data.params || {});

      case 'approveRegistration':
        return handleApproveFromDashboard(data.registrationId, data.approver);

      case 'rejectRegistration':
        return handleRejectFromDashboard(data.registrationId, data.reason, data.rejector);

      case 'getFranchiseManagementData':
        return getFranchiseManagementData(data.params || {});

      case 'updateFranchiseManagementStatus':
        return updateFranchiseManagementStatus(data.franchiseId, data.status, data.updatedBy);

      // 認証関連のアクション
      case 'verifyFirstLogin':
        const merchantId = verifySignedUrl(data.payload, data.signature);
        return createResponse(!!merchantId, merchantId ? {
          merchantId: merchantId,
          message: 'トークン検証成功'
        } : '無効または期限切れのトークンです');

      case 'setPassword':
        if (!data.merchantId || !data.password) {
          return createResponse(false, '加盟店IDとパスワードが必要です');
        }
        // パスワードポリシーチェック（8文字以上、英数字含む）
        if (data.password.length < 8 || !/[a-zA-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
          return createResponse(false, 'パスワードは8文字以上で、英字と数字を含む必要があります');
        }
        const passwordResult = savePassword(data.merchantId, data.password);
        return createResponse(passwordResult.success, passwordResult.success ? 'パスワード設定完了' : 'パスワード設定に失敗しました');

      case 'login':
        if (!data.merchantId || !data.password) {
          return createResponse(false, '加盟店IDとパスワードが必要です');
        }
        // ログイン試行回数チェック
        if (!checkLoginAttempts(data.merchantId)) {
          return createResponse(false, 'ログイン試行回数が上限を超えました。15分後に再試行してください');
        }
        const isValid = verifyLogin(data.merchantId, data.password);

        if (isValid) {
          // ログイン成功時、加盟店データも取得して返す
          const merchantData = getMerchantInfoWithCache(data.merchantId);

          return createResponse(true, 'ログイン成功', {
            merchantId: data.merchantId,
            merchantName: merchantData ? merchantData.companyName : data.merchantId,
            data: merchantData ? {
              // 会社基本情報
              companyName: merchantData.companyName || '',
              companyNameKana: merchantData.companyNameKana || '',
              tradeName: merchantData.tradeName || '',
              tradeNameKana: merchantData.tradeNameKana || '',
              representative: merchantData.representativeName || '',
              representativeKana: merchantData.representativeKana || '',

              // 連絡先情報
              zipCode: String(merchantData.postalCode || ''),
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

              // 対応可能エリア・物件情報（カンマ区切りと読点区切りの両方に対応）
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

              // 追加フィールド
              maxFloors: merchantData.maxFloors || '',
              buildingAge: merchantData.buildingAge || '',
              specialItems: merchantData.specialItems || '',
              cities: merchantData.cities || '',
              priorityAreas: merchantData.priorityAreas || '',

              // PRテキスト
              prText: merchantData.prText || '',

              // 自動配信設定
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
            } : null
          });
        } else {
          return createResponse(false, '加盟店IDまたはパスワードが違います');
        }

      case 'requestPasswordReset':
        if (!data.email) {
          return createResponse(false, 'メールアドレスが必要です');
        }
        try {
          const resetUrl = generatePasswordResetUrl(data.email);
          if (resetUrl) {
            sendPasswordResetEmail(data.email, resetUrl);
            return createResponse(true, 'パスワードリセットメールを送信しました');
          } else {
            return createResponse(false, '登録されたメールアドレスが見つかりません');
          }
        } catch (error) {
          console.error('パスワードリセットエラー:', error);
          return createResponse(false, 'パスワードリセットの処理に失敗しました');
        }

      // ===== 2025/09/25 追加: 加盟店データ管理 =====

      // 加盟店データ取得（キャッシュ利用）
      case 'getMerchantData':
        return handleGetMerchantData(data);

      // 加盟店データ更新
      case 'updateMerchantData':
        return handleUpdateMerchantData(data);

      // ===== 追加ここまで =====

      default:
        // Slackからのペイロードをチェック
        if (data.payload) {
          return handleSlackInteraction(data);
        }
        return createResponse(false, '不明なアクションです: ' + action);
    }
  } catch(error) {
    console.error('Routing error:', error);
    return createResponse(false, 'ルーティングエラー: ' + error.toString());
  }
}

/**
 * GETリクエストのルーティング
 */
function routeGetRequest(params) {
  try {
    // デバッグログ追加
    console.log('[Router GET] 受信パラメータ:', JSON.stringify(params));

    // パラメータが配列の場合は最初の要素を取得
    const action = params.action ? (Array.isArray(params.action) ? params.action[0] : params.action) : null;

    console.log('[Router GET] アクション:', action);

    switch(action) {
      case 'health': {
        const healthCallback = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        const healthData = {
          success: true,
          message: 'API is running',
          version: '1.0.0',
          timestamp: new Date().toString()
        };

        if (healthCallback) {
          const jsonpResponse = healthCallback + '(' + JSON.stringify(healthData) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return createResponse(true, 'API is running', {
          version: '1.0.0',
          timestamp: new Date().toString()
        });
      }

      // AI会社検索（JSONP対応） - 上部に配置して優先度を上げる
      case 'searchCompany':
        const companyName = params.companyName ?
          (Array.isArray(params.companyName) ? params.companyName[0] : params.companyName) : '';
        const callback = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        console.log('[Router] searchCompany called - companyName:', companyName, 'callback:', callback);

        const result = handleSearchCompany({
          companyName: companyName
        });

        console.log('[Router] searchCompany result:', JSON.stringify(result));

        // JSONP形式で返す場合
        if (callback) {
          const jsonpResponse = callback + '(' + JSON.stringify(result) + ')';
          console.log('[Router] Returning JSONP response');
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getConfig':
        // 設定情報を返す（config-provider.gsの関数を呼び出し）
        return handleGetConfig(params);

      // プロパティ取得用エンドポイント（JSONP対応）
      case 'getProperty': {
        const callbackProp = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        // プロパティからURLを取得
        const gasUrl = PropertiesService.getScriptProperties().getProperty('GAS_WEBAPP_URL') ||
                      Utilities.getWebAppUrl(); // フォールバック

        const result = {
          GAS_WEBAPP_URL: gasUrl
        };

        if (callbackProp) {
          const jsonpResponse = callbackProp + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Web App URL取得専用エンドポイント（JSONP対応）
      case 'getWebAppUrl': {
        const callbackProp = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        // プロパティからURLを取得
        const gasUrl = PropertiesService.getScriptProperties().getProperty('GAS_WEBAPP_URL') ||
                      Utilities.getWebAppUrl(); // フォールバック

        const result = {
          success: true,
          url: gasUrl,
          timestamp: new Date().toISOString()
        };

        if (callbackProp) {
          const jsonpResponse = callbackProp + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 管理ダッシュボード用 - getFranchiseApplications（getRegistrationRequestsのエイリアス）
      case 'getFranchiseApplications': {
        const callbackFA = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const status = params.status ?
          (Array.isArray(params.status) ? params.status[0] : params.status) : 'all';
        const limit = params.limit ?
          (Array.isArray(params.limit) ? params.limit[0] : params.limit) : '100';
        const page = params.page ?
          (Array.isArray(params.page) ? params.page[0] : params.page) : '1';
        const daysRange = params.daysRange ?
          (Array.isArray(params.daysRange) ? params.daysRange[0] : params.daysRange) : '30';

        const result = handleGetRegistrationRequests({
          status: status,
          limit: parseInt(limit),
          page: parseInt(page),
          daysRange: parseInt(daysRange)
        });

        if (callbackFA) {
          const jsonpResponse = callbackFA + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      case 'getFranchiseList':
        return handleGetFranchiseList(params);

      // 加盟店登録（JSONP対応）
      case 'registerFranchise': {
        const callback = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const dataStr = params.data ?
          (Array.isArray(params.data) ? params.data[0] : params.data) : '{}';

        try {
          const data = JSON.parse(dataStr);
          const resultOutput = handleFranchiseRegister(data);

          // ContentService.TextOutputからJSONを取り出す
          const resultJson = resultOutput.getContent();
          const result = JSON.parse(resultJson);

          if (callback) {
            const jsonpResponse = callback + '(' + JSON.stringify(result) + ')';
            return ContentService
              .createTextOutput(jsonpResponse)
              .setMimeType(ContentService.MimeType.JAVASCRIPT);
          }
          return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
        } catch (error) {
          console.error('[Router] 加盟店登録エラー:', error);
          const errorResult = {
            success: false,
            message: 'データ処理エラー: ' + error.toString()
          };

          if (callback) {
            const jsonpResponse = callback + '(' + JSON.stringify(errorResult) + ')';
            return ContentService
              .createTextOutput(jsonpResponse)
              .setMimeType(ContentService.MimeType.JAVASCRIPT);
          }
          return ContentService
            .createTextOutput(JSON.stringify(errorResult))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      // 管理ダッシュボード用（JSONP対応）
      case 'getRegistrationRequests': {
        const callbackReg = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const status = params.status ?
          (Array.isArray(params.status) ? params.status[0] : params.status) : 'all';
        const limit = params.limit ?
          (Array.isArray(params.limit) ? params.limit[0] : params.limit) : '100';
        const page = params.page ?
          (Array.isArray(params.page) ? params.page[0] : params.page) : '1';
        const daysRange = params.daysRange ?
          (Array.isArray(params.daysRange) ? params.daysRange[0] : params.daysRange) : '30';

        const result = AdminSystem.getRegistrationRequests({
          status: status,
          limit: parseInt(limit),
          page: parseInt(page),
          daysRange: parseInt(daysRange)
        });

        if (callbackReg) {
          const jsonpResponse = callbackReg + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 登録詳細取得（JSONP対応）
      case 'getRegistrationDetail': {
        const callbackDetail = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const registrationId = params.registrationId ?
          (Array.isArray(params.registrationId) ? params.registrationId[0] : params.registrationId) : '';

        const result = handleGetRegistrationDetail(registrationId);

        if (callbackDetail) {
          const jsonpResponse = callbackDetail + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 承認処理（GETリクエスト対応）
      case 'approveRegistration': {
        const registrationId = params.registrationId ?
          (Array.isArray(params.registrationId) ? params.registrationId[0] : params.registrationId) : '';
        const approver = params.approver ?
          (Array.isArray(params.approver) ? params.approver[0] : params.approver) : '管理者';
        const callback = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        console.log('[Router] ====== 承認処理開始 ======');
        console.log('[Router] 承認処理 - ID:', registrationId, 'Approver:', approver, 'Callback:', callback);

        // テスト用：すぐに結果を返す
        if (!registrationId) {
          const errorResult = {success: false, message: '登録IDが指定されていません'};
          console.log('[Router] エラー: 登録IDなし');
          if (callback) {
            return ContentService
              .createTextOutput(callback + '(' + JSON.stringify(errorResult) + ')')
              .setMimeType(ContentService.MimeType.JAVASCRIPT);
          }
          return ContentService.createTextOutput(JSON.stringify(errorResult)).setMimeType(ContentService.MimeType.JSON);
        }

        const result = handleApproveFromDashboard(registrationId, approver);
        console.log('[Router] 承認結果:', JSON.stringify(result));
        console.log('[Router] ====== 承認処理終了 ======');

        if (callback) {
          const jsonpResponse = callback + '(' + JSON.stringify(result) + ')';
          console.log('[Router] JSONP形式で返信:', jsonpResponse.substring(0, 100) + '...');
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 却下処理（GETリクエスト対応）
      case 'rejectRegistration': {
        const registrationId = params.registrationId ?
          (Array.isArray(params.registrationId) ? params.registrationId[0] : params.registrationId) : '';
        const reason = params.reason ?
          (Array.isArray(params.reason) ? params.reason[0] : params.reason) : '';
        const rejector = params.rejector ?
          (Array.isArray(params.rejector) ? params.rejector[0] : params.rejector) : '管理者';
        const callback = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        console.log('[Router] 却下処理 - ID:', registrationId, 'Reason:', reason, 'Rejector:', rejector, 'Callback:', callback);
        const result = handleRejectFromDashboard(registrationId, reason, rejector);
        console.log('[Router] 却下結果:', JSON.stringify(result));

        if (callback) {
          const jsonpResponse = callback + '(' + JSON.stringify(result) + ')';
          console.log('[Router] JSONP形式で返信:', jsonpResponse.substring(0, 100) + '...');
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 加盟店管理データ取得（JSONP対応）
      case 'getFranchiseManagementData': {
        const callbackFM = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const status = params.status ?
          (Array.isArray(params.status) ? params.status[0] : params.status) : 'all';
        const limit = params.limit ?
          (Array.isArray(params.limit) ? params.limit[0] : params.limit) : '100';

        const result = AdminSystem.getFranchiseManagementData({
          status: status,
          limit: parseInt(limit)
        });

        if (callbackFM) {
          const jsonpResponse = callbackFM + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // 加盟店ステータス更新（JSONP対応）
      case 'updateFranchiseManagementStatus': {
        const callbackUpdate = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const franchiseId = params.franchiseId ?
          (Array.isArray(params.franchiseId) ? params.franchiseId[0] : params.franchiseId) : '';
        const newStatus = params.status ?
          (Array.isArray(params.status) ? params.status[0] : params.status) : '';
        const updatedBy = params.updatedBy ?
          (Array.isArray(params.updatedBy) ? params.updatedBy[0] : params.updatedBy) : '管理者';

        console.log('[Router] ステータス更新 - ID:', franchiseId, 'Status:', newStatus, 'UpdatedBy:', updatedBy);

        const result = updateFranchiseManagementStatus(franchiseId, newStatus, updatedBy);

        if (callbackUpdate) {
          const jsonpResponse = callbackUpdate + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // テスト用エンドポイント
      case 'testJsonp':
        return handleTestJsonp(params);

      case 'testDataJsonp':
        return handleTestDataJsonp(params);

      case 'debugParams':
        return handleDebugParams(params);

      // 加盟店データ取得（getFranchiseData）- JSONP対応
      case 'getFranchiseData': {
        const callbackFD = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;
        const status = params.status ?
          (Array.isArray(params.status) ? params.status[0] : params.status) : 'all';
        const limit = params.limit ?
          (Array.isArray(params.limit) ? params.limit[0] : params.limit) : '100';

        // getFranchiseManagementDataを呼び出す（同じ機能）
        const result = getFranchiseManagementData({
          status: status,
          limit: parseInt(limit)
        });

        if (callbackFD) {
          const jsonpResponse = callbackFD + '(' + JSON.stringify(result) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }

      default:
        // callbackパラメータがある場合はJSONPで返す
        const defaultCallback = params.callback ?
          (Array.isArray(params.callback) ? params.callback[0] : params.callback) : null;

        const defaultResponse = {
          success: false,
          message: 'Unknown action: ' + action,
          requestedAction: action,
          availableActions: [
            'getRegistrationRequests',
            'getFranchiseApplications',
            'searchCompany',
            'approveRegistration',
            'rejectRegistration'
          ]
        };

        if (defaultCallback) {
          const jsonpResponse = defaultCallback + '(' + JSON.stringify(defaultResponse) + ')';
          return ContentService
            .createTextOutput(jsonpResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }

        return ContentService
          .createTextOutput(JSON.stringify(defaultResponse))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(error) {
    console.error('GET routing error:', error);

    // paramsが未定義の場合の対処
    const errorParams = params || {};
    const errorCallback = errorParams.callback ?
      (Array.isArray(errorParams.callback) ? errorParams.callback[0] : errorParams.callback) : null;

    const errorResponse = {
      success: false,
      message: 'ルーティングエラー: ' + error.toString(),
      error: error.stack
    };

    if (errorCallback) {
      const jsonpResponse = errorCallback + '(' + JSON.stringify(errorResponse) + ')';
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}