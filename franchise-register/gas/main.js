/**
 * ====================================
 * メインエントリーポイント
 * ====================================
 *
 * 【重要ルール】
 * 1. doGet/doPostはこのファイルにのみ配置
 * 2. 各システムは完全独立（依存関係なし）
 * 3. エラーは必ずJSONP形式で返す
 * 4. HTMLは絶対に返さない
 *
 * 【自動デプロイテスト】 2025-11-01 04:18 - persist-credentials修正後の動作確認
 */

/**
 * ====================================
 * システムルーター（API境界の明確化）
 * ====================================
 *
 * 【目的】
 * - どのアクションがどのシステムに属するかを一元管理
 * - システム間の境界を明確化
 * - 変更影響範囲を最小化
 *
 * 【追加方法】
 * 新しいアクションを追加する場合は、以下のルールに従う：
 * 1. 適切なシステムのactionsリストに追加
 * 2. 必要に応じてhandlePostメソッドを実装
 * 3. npm run check:impact main.js で影響範囲を確認
 */
const SystemRouter = {
  /**
   * アクション → システムのマッピング
   */
  routes: {
    // ヘルスチェック（共通）
    'health': {
      system: 'common',
      description: 'APIヘルスチェック'
    },

    // 加盟店登録システム
    'franchise_': {
      system: 'FranchiseSystem',
      description: '加盟店登録',
      prefix: true,
      actions: ['submitRegistration', 'registerFranchise']
    },

    // 加盟店システム（認証 + 会社情報管理）
    'merchant_': {
      system: 'MerchantSystem',
      description: '加盟店ポータル',
      prefix: true,
      actions: [
        'verifyFirstLogin',
        'setPassword',
        'verifyLogin',
        'resetPassword',
        'getMerchantUrlSlug',
        'updateAutoDeliverySettings'
      ]
    },

    // 会社情報管理
    'companyinfo_': {
      system: 'MerchantSystem',
      description: '会社情報管理',
      prefix: true,
      actions: [
        'getConstructionExamples',
        'saveConstructionExample',
        'getPreviewSettings',
        'savePreviewSettings',
        'loadPreviewSettings',
        'generateStaticHTML',
        'updateMerchantUrlAndPreviewHp',
        'triggerFTPSync'
      ]
    },

    // 管理ダッシュボード
    'admin_': {
      system: 'AdminSystem',
      description: '管理ダッシュボード',
      prefix: true,
      actions: [
        'getRegistrationRequests',
        'getFranchiseManagementData',
        'getMerchantData',
        'getMerchantStatus',
        'updateMerchantData',
        'approveRegistration',
        'rejectRegistration',
        'revertRegistration'
      ]
    },

    // AI検索
    'ai_': {
      system: 'AISearchSystem',
      description: 'AI検索',
      prefix: true,
      actions: ['searchCompany']
    },

    // 評価データ管理
    'evaluation_': {
      system: 'EvaluationDataManager',
      description: '評価データ管理',
      prefix: true,
      actions: ['getRatingsFromSheet', 'updateCompanyRatings']
    },

    // CVデータ管理システム
    'cv_': {
      system: 'CVSheetSystem',
      description: 'CV送信',
      prefix: true,
      actions: ['cv1_submit', 'cv2_update', 'getCVList']
    },

    // ランキング取得
    'getRanking': {
      system: 'AISearchSystem',
      description: 'ランキング取得',
      prefix: false,
      actions: ['getRanking']
    },

    // Slack連携
    'slack_': {
      system: 'SlackApprovalSystem',
      description: 'Slack承認システム',
      prefix: true,
      actions: []
    },

    // LP問い合わせフォーム
    'lp_contact_submit': {
      system: 'LPContactHandler',
      description: 'LP問い合わせフォーム送信',
      prefix: false,
      actions: ['lp_contact_submit']
    }
  },

  /**
   * アクションからシステムを特定
   * @param {string} action - アクション名
   * @return {Object} { system: 'SystemName', route: {...} }
   */
  getSystemForAction: function(action) {
    // ヘルスチェック
    if (action === 'health') {
      return { system: 'common', route: this.routes['health'] };
    }

    // プレフィックスマッチング
    for (const routeKey in this.routes) {
      const route = this.routes[routeKey];

      if (route.prefix && action.startsWith(routeKey)) {
        return { system: route.system, route: route };
      }

      // 個別アクション確認
      if (route.actions && route.actions.includes(action)) {
        return { system: route.system, route: route };
      }
    }

    return { system: null, route: null };
  },

  /**
   * システム名からハンドラーを取得
   * @param {string} systemName - システム名
   * @param {string} method - 'GET' or 'POST'
   * @return {Function} ハンドラー関数
   */
  getHandler: function(systemName, method) {
    if (systemName === 'common') {
      return null; // 共通処理は特別扱い
    }

    // グローバルスコープからシステムオブジェクトを取得
    const system = this.getSystemObject(systemName);
    if (!system) {
      console.error('[SystemRouter] System not found:', systemName);
      return null;
    }

    // POSTメソッドの場合はhandlePostを優先
    if (method === 'POST' && typeof system.handlePost === 'function') {
      return system.handlePost.bind(system);
    }

    // GETまたはhandlePostがない場合はhandleを使用
    if (typeof system.handle === 'function') {
      return system.handle.bind(system);
    }

    console.error('[SystemRouter] Handler not found for:', systemName, method);
    return null;
  },

  /**
   * システムオブジェクトを取得
   * @param {string} systemName - システム名
   * @return {Object} システムオブジェクト
   */
  getSystemObject: function(systemName) {
    // グローバルスコープから取得
    try {
      // FranchiseSystem, MerchantSystem, AdminSystem, AISearchSystem, etc.
      return eval(systemName);
    } catch (e) {
      console.error('[SystemRouter] Failed to get system object:', systemName, e);
      return null;
    }
  },

  /**
   * ルーティング情報を表示（デバッグ用）
   */
  printRoutes: function() {
    console.log('=== System Router Map ===');
    for (const routeKey in this.routes) {
      const route = this.routes[routeKey];
      const prefix = route.prefix ? '(prefix)' : '';
      console.log(`${routeKey} ${prefix} → ${route.system}: ${route.description}`);
      if (route.actions && route.actions.length > 0) {
        route.actions.forEach(action => {
          console.log(`  - ${action}`);
        });
      }
    }
  }
};

/**
 * GETリクエスト処理（必ずここだけ）
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;

    console.log('[main.js] GET request:', action);

    // アクションが未指定の場合
    if (!action) {
      return createJsonpResponse({
        success: false,
        error: 'Action parameter is required'
      }, callback);
    }

    let result;

    // SystemRouterを使ってシステムを特定
    const { system, route } = SystemRouter.getSystemForAction(action);

    if (!system) {
      // 不明なアクション
      console.warn('[main.js] Unknown action:', action);
      result = {
        success: false,
        error: `Unknown action: ${action}`,
        hint: 'このアクションはSystemRouterに登録されていません'
      };
    } else if (system === 'common') {
      // ヘルスチェック（共通処理）
      result = {
        success: true,
        message: 'API is running',
        version: '2.1.0',
        timestamp: new Date().toString(),
        router: 'SystemRouter enabled'
      };
    } else {
      // システムハンドラーを取得して実行
      console.log('[main.js] Routing to:', system, '(', route.description, ')');

      const handler = SystemRouter.getHandler(system, 'GET');
      if (!handler) {
        result = {
          success: false,
          error: `Handler not found for system: ${system}`
        };
      } else {
        // updateMerchantDataの場合、dataパラメータをJSONパース
        if (action === 'updateMerchantData' && e.parameter.data) {
          try {
            e.parameter.parsedData = JSON.parse(e.parameter.data);
            console.log('[main.js] Parsed data from GET:', e.parameter.parsedData);
          } catch (err) {
            console.error('[main.js] Failed to parse data parameter:', err);
          }
        }

        result = handler(e.parameter);
      }
    }

    // JSONP形式で返却
    return createJsonpResponse(result, callback);

  } catch (error) {
    console.error('[main.js] doGet error:', error);
    return createJsonpResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    }, e.parameter.callback);
  }
}

/**
 * POSTリクエスト処理（必ずここだけ）
 */
function doPost(e) {
  try {
    console.log('[main.js] POST request received');
    console.log('[main.js] Parameters:', JSON.stringify(e.parameter));
    console.log('[main.js] PostData:', e.postData ? e.postData.contents : 'No postData');

    // Slackインタラクション専用処理（payloadがある場合）
    if (e.parameter.payload) {
      console.log('[main.js] Slack interaction detected - routing to SlackApprovalSystem');
      return SlackApprovalSystem.handlePost(e);
    }

    // JSONボディがある場合はパース、URL-encodedの場合はe.parameterを使用
    let postData = {};
    if (e.postData && e.postData.contents) {
      // V1701: text/plainでもJSONをパースする（フロントエンドがtext/plainで送信するため）
      if (e.postData.type === 'application/json' || e.postData.type === 'text/plain') {
        try {
          postData = JSON.parse(e.postData.contents);
          console.log('[main.js] Parsed JSON POST data (type: ' + e.postData.type + '):', JSON.stringify(postData));
        } catch (err) {
          console.error('[main.js] Failed to parse JSON POST data:', err);
        }
      }
    } else if (e.parameter) {
      // URL-encoded form data (application/x-www-form-urlencoded)
      postData = e.parameter;
      console.log('[main.js] Using URL-encoded POST data from e.parameter');
    }

    // actionをPOSTデータまたはパラメータから取得
    const action = postData.action || e.parameter.action;
    console.log('[main.js] Action:', action);

    // アクションが未指定の場合
    if (!action) {
      return createJsonResponse({
        success: false,
        error: 'Action parameter is required'
      });
    }

    let result;

    // SystemRouterを使ってシステムを特定
    const { system, route } = SystemRouter.getSystemForAction(action);

    if (!system) {
      // 不明なアクション
      console.warn('[main.js] Unknown action:', action);
      result = {
        success: false,
        error: `Unknown action: ${action}`,
        hint: 'このアクションはSystemRouterに登録されていません'
      };
    } else {
      // システムハンドラーを取得して実行
      console.log('[main.js] Routing POST to:', system, '(', route.description, ')');

      const handler = SystemRouter.getHandler(system, 'POST');
      if (!handler) {
        console.warn('[main.js] No POST handler for:', system);
        // フォールバック: レガシーハンドラーを試行
        result = handleLegacyPostAction(action, e, postData);
      } else {
        result = handler(e, postData);
      }
    }

    // JSON形式で返却
    return createJsonResponse(result);

  } catch (error) {
    console.error('[main.js] doPost error:', error);
    return createJsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * レガシーPOSTアクションのハンドラー（後方互換性のため）
 * @param {string} action - アクション名
 * @param {Object} e - イベントオブジェクト
 * @param {Object} postData - パース済みPOSTデータ
 * @return {Object} 処理結果
 */
function handleLegacyPostAction(action, e, postData) {
  try {
    console.log('[handleLegacyPostAction] Legacy action:', action);

    // 会社情報画像管理（レガシー）
    if (action === 'companyinfo_uploadImage' || action === 'companyinfo_addGalleryPhoto' || action === 'companyinfo_deleteImage') {
      return handleCompanyImageRequest(action, postData);
    }
    // 施工事例管理（レガシー）
    else if (action === 'saveConstructionExample') {
      return handleSaveConstructionExample(postData);
    }
    else if (action === 'getConstructionExamples') {
      return handleGetConstructionExamples(postData);
    }
    // 評価データ管理（EvaluationDataManager）
    else if (action === 'getRatingsFromSheet') {
      return EvaluationDataManager.getRatingsForCompany(postData.companyName);
    }
    else if (action === 'updateCompanyRatings') {
      return EvaluationDataManager.collectRatingsFromAPIs(
        postData.companyName,
        postData.address || ''
      );
    }
    // 不明なアクション
    else {
      return {
        success: false,
        error: `Legacy handler not found for action: ${action}`
      };
    }

  } catch (error) {
    console.error('[handleLegacyPostAction] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * JSONP形式のレスポンス作成（共通関数）
 */
function createJsonpResponse(data, callback) {
  const jsonString = JSON.stringify(data);

  if (callback) {
    // JSONP形式
    return ContentService
      .createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 通常のJSON（callbackなしの場合）
    return ContentService
      .createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * JSON形式のレスポンス作成（POST用）
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 会社情報画像アップロードリクエストのハンドラー
 * @param {string} action - アクション名
 * @param {Object} postData - POSTデータ
 * @return {Object} 処理結果
 */
function handleCompanyImageRequest(action, postData) {
  try {
    console.log('[handleCompanyImageRequest] Action:', action);
    console.log('[handleCompanyImageRequest] Data keys:', Object.keys(postData));

    // 会社名を取得（スプレッドシートから）
    const merchantData = AdminSystem.getMerchantData(postData.merchantId);
    const companyName = merchantData.data ? merchantData.data['会社名'] : 'Unknown';

    if (action === 'companyinfo_uploadImage') {
      // メインビジュアルまたは施工事例のアップロード
      const result = saveCompanyImage({
        merchantId: postData.merchantId,
        companyName: companyName,
        base64Data: postData.base64Data,
        fileName: postData.fileName,
        imageType: postData.imageType || 'main-visual'
      });

      // スプレッドシートのAR列（メインビジュアル）を更新
      if (result.success && postData.imageType === 'main-visual') {
        AdminSystem.updateMerchantData(postData.merchantId, {
          'メインビジュアル': result.url
        });
      }

      return result;

    } else if (action === 'companyinfo_addGalleryPhoto') {
      // 写真ギャラリーのアップロード
      const result = saveCompanyImage({
        merchantId: postData.merchantId,
        companyName: companyName,
        base64Data: postData.base64Data,
        fileName: postData.fileName,
        imageType: 'gallery'
      });

      // スプレッドシートのAS列（写真ギャラリー）を更新
      if (result.success) {
        // 既存のギャラリーURLを取得
        const existingGallery = merchantData.data ? merchantData.data['写真ギャラリー'] : '';
        const galleryUrls = existingGallery ? existingGallery.split(',').map(url => url.trim()) : [];

        // 新しいURLを追加（20枚まで）
        if (galleryUrls.length < 20) {
          galleryUrls.push(result.url);
          AdminSystem.updateMerchantData(postData.merchantId, {
            '写真ギャラリー': galleryUrls.join(',')
          });
        }
      }

      return result;

    } else if (action === 'companyinfo_deleteImage') {
      // 画像削除
      return deleteCompanyImage(postData.fileId);

    } else {
      return {
        success: false,
        error: 'Unknown image action'
      };
    }

  } catch (error) {
    console.error('[handleCompanyImageRequest] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 施工事例保存のハンドラー
 * @param {Object} postData - POSTデータ
 * @return {Object} 処理結果
 */
function handleSaveConstructionExample(postData) {
  try {
    const merchantId = postData.merchantId;
    const exampleData = postData.exampleData;

    if (!merchantId || !exampleData) {
      return {
        success: false,
        error: '加盟店IDまたは施工事例データが不足しています'
      };
    }

    // 会社名を取得
    const merchantData = AdminSystem.getMerchantData(merchantId);
    const companyName = merchantData.data ? merchantData.data['会社名'] : 'Unknown';

    // Before画像をアップロード
    let beforeUrl = '';
    if (exampleData.beforeImage) {
      const beforeResult = saveCompanyImage({
        merchantId: merchantId,
        companyName: companyName,
        base64Data: exampleData.beforeImage,
        fileName: `before_${Date.now()}.jpg`,
        imageType: 'project'
      });
      if (beforeResult.success) {
        beforeUrl = beforeResult.url;
      } else {
        return beforeResult;
      }
    }

    // After画像をアップロード
    let afterUrl = '';
    if (exampleData.afterImage) {
      const afterResult = saveCompanyImage({
        merchantId: merchantId,
        companyName: companyName,
        base64Data: exampleData.afterImage,
        fileName: `after_${Date.now()}.jpg`,
        imageType: 'project'
      });
      if (afterResult.success) {
        afterUrl = afterResult.url;
      } else {
        return afterResult;
      }
    }

    // スプレッドシート「施工事例」に保存
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('施工事例');

    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet('施工事例');
      sheet.appendRow(['加盟店ID', '事例ID', 'タイトル', '築年数', '施工金額', '説明文', 'Before URL', 'After URL', '作成日時']);
    }

    // 事例IDを生成
    const exampleId = 'EXF' + merchantId.replace('FR', '') + '_' + Date.now();
    const createdAt = new Date();

    // データを追加
    sheet.appendRow([
      merchantId,
      exampleId,
      exampleData.title || '',
      exampleData.buildingAge || '',
      exampleData.price || '',
      exampleData.content || '',
      beforeUrl,
      afterUrl,
      createdAt
    ]);

    console.log('[handleSaveConstructionExample] Saved:', exampleId);

    return {
      success: true,
      exampleId: exampleId,
      beforeUrl: beforeUrl,
      afterUrl: afterUrl
    };

  } catch (error) {
    console.error('[handleSaveConstructionExample] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 施工事例取得のハンドラー
 * @param {Object} postData - POSTデータ
 * @return {Object} 処理結果
 */
function handleGetConstructionExamples(postData) {
  try {
    const merchantId = postData.merchantId;

    if (!merchantId) {
      return {
        success: false,
        error: '加盟店IDが指定されていません'
      };
    }

    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('施工事例');

    if (!sheet) {
      return {
        success: true,
        examples: []
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // 加盟店IDでフィルタ
    const examples = rows
      .filter(row => row[0] === merchantId)
      .map(row => ({
        exampleId: row[1],
        title: row[2],
        buildingAge: row[3],
        price: row[4],
        content: row[5],
        beforeUrl: row[6],
        afterUrl: row[7],
        createdAt: row[8]
      }));

    return {
      success: true,
      examples: examples
    };

  } catch (error) {
    console.error('[handleGetConstructionExamples] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}// Test trigger 20251031-171429
// Timestamp: 2025-11-04 02:26:19
