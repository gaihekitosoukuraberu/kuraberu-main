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
 */

/**
 * GETリクエスト処理（必ずここだけ）
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;

    console.log('[main.gs] GET request:', action);

    // アクションが未指定の場合
    if (!action) {
      return createJsonpResponse({
        success: false,
        error: 'Action parameter is required'
      }, callback);
    }

    // システム別ルーティング（完全分離）
    let result;

    // ヘルスチェック（全システム共通）
    if (action === 'health') {
      result = {
        success: true,
        message: 'API is running',
        version: '2.0.0',
        timestamp: new Date().toString()
      };
    }
    // 加盟店登録システム
    else if (action.startsWith('franchise_') || action === 'submitRegistration' || action === 'registerFranchise') {
      result = FranchiseSystem.handle(e.parameter);
    }
    // 管理ダッシュボード
    else if (action.startsWith('admin_') || action === 'getRegistrationRequests' || action === 'getFranchiseManagementData' || action === 'approveRegistration' || action === 'rejectRegistration' || action === 'revertRegistration' || action === 'updateMerchantStatusFromAdmin') {
      result = AdminSystem.handle(e.parameter);
    }
    // AI検索
    else if (action.startsWith('ai_') || action === 'searchCompany') {
      result = AISearchSystem.handle(e.parameter);
    }
    // 加盟店向けシステム
    else if (action.startsWith('merchant_') || action.startsWith('companyinfo_') || action === 'verifyFirstLoginUrl' || action === 'verifyFirstLogin' || action === 'setPassword' || action === 'resetPassword' || action === 'verifyLogin' || action === 'getMerchantData' || action === 'updateSalesPerson' || action === 'updateMerchantStatus' || action === 'getMerchantStatus' || action === 'checkUpdate') {
      result = MerchantSystem.handle(e.parameter);
    }
    // 不明なアクション
    else {
      result = {
        success: false,
        error: `Unknown action: ${action}`
      };
    }

    // JSONP形式で返却
    return createJsonpResponse(result, callback);

  } catch (error) {
    console.error('[main.gs] doGet error:', error);
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
    Logger.log('[main.gs] POST request received');
    Logger.log('[main.gs] Parameters: ' + JSON.stringify(e.parameter));
    Logger.log('[main.gs] PostData: ' + (e.postData ? e.postData.contents : 'No postData'));

    // Slackインタラクション専用処理（payloadがある場合）
    if (e.parameter.payload) {
      console.log('[main.gs] Slack interaction detected - routing to SlackApprovalSystem');
      return SlackApprovalSystem.handlePost(e);
    }

    // JSONボディがある場合はパース
    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
        console.log('[main.gs] Parsed POST data:', JSON.stringify(postData));
      } catch (err) {
        console.error('[main.gs] Failed to parse POST data:', err);
      }
    }

    // actionをPOSTデータまたはパラメータから取得
    const action = postData.action || e.parameter.action;
    console.log('[main.gs] Action:', action);

    // アクションが未指定の場合
    if (!action) {
      return createJsonResponse({
        success: false,
        error: 'Action parameter is required'
      });
    }

    // システム別ルーティング（完全分離）
    let result;

    // 加盟店登録システム
    if (action.startsWith('franchise_') || action === 'submitRegistration' || action === 'registerFranchise') {
      // POSTデータを含むeオブジェクトとパース済みデータを渡す
      result = FranchiseSystem.handlePost(e, postData);
    }
    // 管理ダッシュボード
    else if (action.startsWith('admin_') || action === 'approveRegistration' || action === 'rejectRegistration' || action === 'revertRegistration') {
      result = AdminSystem.handlePost(e, postData);
    }
    // 加盟店向けシステム
    else if (action.startsWith('merchant_') || action.startsWith('companyinfo_') || action === 'setFirstPassword' || action === 'verifyLogin' || action === 'verifyFirstLogin' || action === 'setPassword' || action === 'resetPassword' || action === 'updateAutoDeliverySettings' || action === 'updatePauseSettings' || action === 'generateStaticHTML') {
      result = MerchantSystem.handlePost(e);
    }
    // 不明なアクション
    else {
      result = {
        success: false,
        error: `Unknown action: ${action}`
      };
    }

    // JSON形式で返却
    return createJsonResponse(result);

  } catch (error) {
    console.error('[main.gs] doPost error:', error);
    return createJsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
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