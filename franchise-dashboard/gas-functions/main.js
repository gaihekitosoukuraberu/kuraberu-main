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
    // 安全なパラメータ取得
    let action, callback;

    console.log('[main.gs] ========== GET REQUEST START ==========');
    console.log('[main.gs] Raw e:', JSON.stringify(e));
    console.log('[main.gs] e.parameter:', JSON.stringify(e.parameter));

    if (e && e.parameter) {
      // 明示的なパラメータ取得（空文字列も考慮）
      action = e.parameter.action;
      if (!action && e.parameter.ac !== undefined) {
        action = e.parameter.ac;
      }

      callback = e.parameter.callback;
      if (!callback && e.parameter.cb !== undefined) {
        callback = e.parameter.cb;
      }

      // パラメータの完全なダンプを追加
      console.log('[main.gs] 🔍 Parameter keys:', Object.keys(e.parameter));
      console.log('[main.gs] 🔍 Parameter values:', Object.values(e.parameter));
      console.log('[main.gs] 🔍 Raw action value:', JSON.stringify(e.parameter.action));
      console.log('[main.gs] 🔍 Raw ac value:', JSON.stringify(e.parameter.ac));
    } else {
      console.error('[main.gs] ❌ e.parameter is undefined!');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Request parameters are undefined',
        debug: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    console.log('[main.gs] action:', action);
    console.log('[main.gs] callback:', callback);
    console.log('[main.gs] 🔍 Testing action matching for:', action);

    // デバッグ: どの条件にマッチするか確認
    if (action === 'getMerchantData') {
      console.log('[main.gs] DEBUG: getMerchantData detected');
      console.log('[main.gs] DEBUG: MerchantSystem exists:', typeof MerchantSystem);
    }

    // result変数を宣言
    let result;

    // アクションが未指定の場合（空文字列も含む）
    if (!action || action === '') {
      // デバッグ用：空のactionでもデバッグエンドポイントとして処理
      console.log('[main.gs] ⚠️ Empty action detected, treating as debug endpoint');
      result = {
        success: true,
        message: 'Debug endpoint - Empty action analysis',
        debug: {
          action: action,
          callback: callback,
          rawParameters: e.parameter,
          parameterKeys: Object.keys(e.parameter || {}),
          parameterValues: Object.values(e.parameter || {}),
          hasAction: !!action,
          actionType: typeof action,
          actionLength: action ? action.length : 0,
          isEmptyString: action === '',
          isUndefined: action === undefined,
          parameterAc: e.parameter?.ac,
          parameterAction: e.parameter?.action,
          detectedProblem: action === '' ? 'Empty string action' : 'No action parameter'
        }
      };
    }
    // システム別ルーティング（完全分離）
    // result変数は上記で定義済みの場合があるので、elseで続行
    else {

      // ヘルスチェック（全システム共通）
    if (action === 'health') {
      result = {
        success: true,
        message: 'API is running',
        version: '2.0.0',
        timestamp: new Date().toString()
      };
    }
    // デバッグエンドポイント（パラメータ問題を確実に特定）
    else if (action === 'debug' || !action || action === '' || action === undefined || action === null) {
      result = {
        success: true,
        message: 'Debug endpoint - Parameter analysis',
        debug: {
          action: action,
          callback: callback,
          rawParameters: e.parameter,
          parameterKeys: Object.keys(e.parameter || {}),
          parameterValues: Object.values(e.parameter || {}),
          hasAction: !!action,
          actionType: typeof action,
          actionLength: action ? action.length : 0,
          isEmptyString: action === '',
          isUndefined: action === undefined,
          parameterAc: e.parameter?.ac,
          parameterAction: e.parameter?.action
        }
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
    else if (action.startsWith('merchant_') || action.startsWith('companyinfo_') || action === 'verifyFirstLoginUrl' || action === 'verifyFirstLogin' || action === 'setPassword' || action === 'resetPassword' || action === 'verifyLogin' || action === 'getMerchantData' || action === 'updateSalesPerson' || action === 'updateMerchantStatus' || action === 'getMerchantStatus' || action === 'checkUpdate' || action === 'getPreviewSettings' || action === 'loadPreviewSettings' || action === 'getConstructionExamples' || action === 'getMerchantUrlSlug' || action === 'generateStaticHTML' || action === 'generateStaticHTMLV2' || action === 'testSimple') {
      console.log('[main.gs] ✅ GET routing to MerchantSystem for:', action);
      console.log('[main.gs] 🎯 MATCHED MerchantSystem condition!');
      try {
        if (typeof MerchantSystem === 'undefined') {
          console.error('[main.gs] ❌ MerchantSystem undefined in GET request');
          result = { success: false, error: 'MerchantSystem not available in GET' };
        } else {
          result = MerchantSystem.handle(e.parameter);
          console.log('[main.gs] ✅ MerchantSystem.handle GET result type:', typeof result);
          console.log('[main.gs] ✅ MerchantSystem.handle GET result hasGetContent:', result && typeof result.getContent === 'function');
          console.log('[main.gs] ✅ MerchantSystem.handle GET result:', JSON.stringify(result, null, 2).substring(0, 200));
        }
      } catch (error) {
        console.error('[main.gs] ❌ GET MerchantSystem error:', error);
        result = { success: false, error: 'MerchantSystem GET error: ' + error.toString() };
      }
    }
    // CVデータ管理システム
    else if (action.startsWith('cv_') || action.startsWith('cv1_') || action.startsWith('cv2_') || action === 'getCVList') {
      console.log('[main.gs] ✅ Routing to CVSheetSystem');
      result = CVSheetSystem.handle(e.parameter);
      console.log('[main.gs] CVSheetSystem result:', JSON.stringify(result));
    }
    // 不明なアクション
    else {
      console.log('[main.gs] ❌ UNKNOWN ACTION:', action);
      console.log('[main.gs] ❌ No routing matched!');
      result = {
        success: false,
        error: `Unknown action: ${action}`
      };
    }
    }  // else block closing

    // JSONP形式で返却
    // HTMLレスポンスの場合は直接返す（JSONPに変換しない）
    if (result && typeof result === 'object' && result.isHTML && result.content) {
      console.log('[main.gs] Converting HTML response to ContentService');
      return ContentService.createTextOutput(result.content)
        .setMimeType(ContentService.MimeType.HTML);
    }

    if (result && typeof result === 'object' && typeof result.getContent === 'function') {
      console.log('[main.gs] Returning HTML ContentService directly');
      return result;
    }

    console.log('[main.gs] Creating JSONP response with callback:', callback);
    console.log('[main.gs] Response data:', JSON.stringify(result));
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

    // アクションが未指定の場合（空文字列も含む）
    if (!action || action === '') {
      // デバッグ用：空のactionでもデバッグ情報を返す
      console.log('[main.gs] ⚠️ POST Empty action detected, providing debug info');
      return createJsonResponse({
        success: true,
        message: 'Debug endpoint - POST Empty action analysis',
        debug: {
          action: action,
          postData: postData,
          parameters: e.parameter,
          hasPostData: !!e.postData,
          postDataContents: e.postData ? e.postData.contents : null,
          detectedProblem: action === '' ? 'Empty string action in POST' : 'No action parameter in POST'
        }
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
    else if (action && (action.startsWith('merchant_') || action.startsWith('companyinfo_') || action === 'updateMerchantData' || action === 'setFirstPassword' || action === 'verifyLogin' || action === 'verifyFirstLogin' || action === 'setPassword' || action === 'resetPassword' || action === 'updateAutoDeliverySettings' || action === 'updatePauseSettings' || action === 'generateStaticHTML' || action === 'generateStaticHTMLV2' || action === 'savePreviewSettings' || action === 'getPreviewSettings' || action === 'loadPreviewSettings' || action === 'getConstructionExamples' || action === 'saveConstructionExample' || action === 'updateMerchantUrlAndPreviewHp' || action === 'getMerchantData' || action === 'getMerchantUrlSlug')) {
      result = MerchantSystem.handlePost(e);
    }
    // CVデータ管理システム
    else if (action.startsWith('cv_') || action.startsWith('cv1_') || action.startsWith('cv2_')) {
      result = CVSheetSystem.handle(Object.assign({}, e.parameter, postData));
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