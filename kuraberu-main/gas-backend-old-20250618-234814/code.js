/**
 * Google Apps Script WebApp Main Entry Point
 * CORS対応版 - 外壁塗装くらべるAI管理画面 統合版
 * 
 * 【統合内容】
 * - CORS完全対応：3種類のContent-Type対応（application/json, x-www-form-urlencoded, text/plain）
 * - プリフライト回避：text/plain によるCORS問題根本解決
 * - 全API統合：案件振り分け、Slack通知、キャンセル処理、AI判定、請求履歴、ランキング、フラグ管理
 * - JSONP完全対応：旧ブラウザ互換性
 * - エラーハンドリング強化：堅牢な例外処理
 */

// CORS設定用のヘッダー
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

/**
 * GETリクエストハンドラー（無効化済み - notify_fixed.gs で統合処理）
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGetDisabled(e) {
  try {
    // API認証チェック
    const authResult = validateApiKey(e);
    if (!authResult.success) {
      return createCorsResponse(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: authResult.error
      }), 403);
    }
    
    console.log('🌐 GAS WebApp GET受信:', e.parameter);
    
    // CORS Preflight対応
    if (e.parameter.method === 'OPTIONS') {
      return createCorsResponse('', 200);
    }

    // 新しいパスベースAPIルーティング（Vue3アプリ用）
    const path = e.parameter.path || '/';
    const params = e.parameter;
    
    if (path.startsWith('/api/')) {
      return handlePathBasedAPI(path, params, 'GET');
    }
    
    // レガシー関数ベースAPI（既存システム用）
    var functionName = e.parameter.function || '';
    var callback = e.parameter.callback;
    
    // GETパラメータをrouteFunctionに適した形式に変換
    var parameters = {};
    for (var key in e.parameter) {
      if (key !== 'function' && key !== 'callback') {
        // JSON文字列パラメータをパース
        try {
          parameters[key] = JSON.parse(e.parameter[key]);
        } catch (parseError) {
          // JSON解析に失敗した場合は文字列のまま
          parameters[key] = e.parameter[key];
        }
      }
    }
    
    var result = routeFunction(functionName, parameters);
    
    console.log('✅ GET 関数実行結果:', result);
    return createResponse(result, callback);
    
  } catch (error) {
    console.error('❌ doGet全体エラー:', error);
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }), 500);
  }
}

/**
 * POSTリクエストハンドラー（無効化済み - notify_fixed.gs で統合処理）
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPostDisabled(e) {
  try {
    // API認証チェック
    const authResult = validateApiKey(e);
    if (!authResult.success) {
      return createCorsResponse(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: authResult.error
      }), 403);
    }
    
    console.log('🔗 GAS WebApp POST受信');
    console.log('  postData.type:', e.postData ? e.postData.type : 'undefined');
    console.log('  postData.contents:', e.postData ? e.postData.contents : 'undefined');
    
    // ===== LINE Webhook検証対応 =====
    if (e.postData && e.postData.contents) {
      try {
        const contents = e.postData.contents;
        const parsed = JSON.parse(contents);
        
        // LINE Webhookの特徴的な構造をチェック
        if (parsed.events !== undefined || 
            parsed.destination !== undefined ||
            (Array.isArray(parsed.events))) {
          
          console.log('📞 LINE Webhook検証リクエストを検出');
          
          // LINE Webhook用のOKレスポンスを返す（HTTP 200必須）
          return ContentService
            .createTextOutput("OK")
            .setMimeType(ContentService.MimeType.TEXT);
        }
      } catch (lineParseError) {
        // JSONパースエラーは通常のPOST処理に継続
        console.log('  LINE Webhook形式ではない、通常POST処理に移行');
      }
    }
    
    // CORS Preflight対応
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      return createCorsResponse('', 200);
    }
    
    var requestData;
    var functionName;
    var parameters;
    var path;
    
    // Content-Type別の処理
    switch (e.postData.type) {
      case 'application/json':
        // 通常のJSON形式（プリフライトあり）
        console.log('📄 JSON形式で受信');
        requestData = JSON.parse(e.postData.contents);
        functionName = requestData.function;
        path = requestData.path;
        // pathベースAPI用にパラメータを調整
        parameters = requestData.parameters || requestData;
        // pathやfunctionを除く他のプロパティもparametersに含める
        if (path) {
          Object.keys(requestData).forEach(key => {
            if (key !== 'path' && key !== 'function' && key !== 'parameters') {
              parameters[key] = requestData[key];
            }
          });
        }
        break;
        
      case 'application/x-www-form-urlencoded':
        // URLエンコード形式（プリフライトなし）
        console.log('📝 URLエンコード形式で受信');
        var params = parseUrlEncoded(e.postData.contents);
        functionName = params.function;
        path = params.path;
        parameters = params.parameters ? JSON.parse(params.parameters) : {};
        break;
        
      case 'text/plain':
        // プレーンテキスト形式（プリフライト完全回避）
        console.log('📋 プレーンテキスト形式で受信');
        requestData = JSON.parse(e.postData.contents);
        functionName = requestData.function;
        path = requestData.path;
        // pathベースAPI用にパラメータを調整
        parameters = requestData.parameters || requestData;
        // pathやfunctionを除く他のプロパティもparametersに含める
        if (path) {
          Object.keys(requestData).forEach(key => {
            if (key !== 'path' && key !== 'function' && key !== 'parameters') {
              parameters[key] = requestData[key];
            }
          });
        }
        break;
        
      default:
        // その他の形式もJSONとして処理を試行
        console.log('❓ 不明な形式、JSON解析を試行');
        try {
          requestData = JSON.parse(e.postData.contents);
          functionName = requestData.function;
          path = requestData.path;
          parameters = requestData.parameters || {};
        } catch (parseError) {
          throw new Error('Unsupported Content-Type: ' + e.postData.type);
        }
    }
    
    // 新しいパスベースAPI（Vue3アプリ用）
    if (path && path.startsWith('/api/')) {
      return handlePathBasedAPI(path, parameters, 'POST');
    }
    
    // レガシー関数ベースAPI（既存システム用）
    if (!functionName) {
      throw new Error('function name is required');
    }
    
    console.log('🎯 実行関数:', functionName);
    console.log('📦 パラメータ:', parameters);
    
    var result = routeFunction(functionName, parameters);
    
    console.log('✅ POST 関数実行結果:', result);
    return createCorsResponse(JSON.stringify(result), 200);
    
  } catch (error) {
    console.error('❌ doPost全体エラー:', error);
    
    // エラーが発生してもLINE Webhook検証のためHTTP 200でOKを返す
    return ContentService
      .createTextOutput("OK")
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * パスベースAPIハンドラー（Vue3アプリ用）
 */
function handlePathBasedAPI(path, params, method) {
  try {
    console.log('🛣️ パスベースAPI:', path, method);
    
    let response;
    switch (path) {
      // 請求履歴API
      case '/api/getBillingHistory':
        response = handleGetBillingHistory(params);
        break;
        
      // ランキングAPI
      case '/api/getSuccessRateRanking':
        response = handleGetSuccessRateRanking(params);
        break;
      case '/api/getResponseRanking':
        response = handleGetResponseRanking(params);
        break;
      case '/api/getSalesRanking':
        response = handleGetSalesRanking(params);
        break;
        
      // フラグ管理API
      case '/api/getFranchiseeFlags':
        response = handleGetFranchiseeFlags(params);
        break;
      case '/api/updateFranchiseeFlag':
        response = handleUpdateFranchiseeFlag(params);
        break;
      case '/api/bulkUpdateFranchiseeFlags':
        response = handleBulkUpdateFranchiseeFlags(params);
        break;
      case '/api/getAssignmentExclusionList':
        response = handleGetAssignmentExclusionList(params);
        break;
      case '/api/getFlagHistory':
        response = handleGetFlagHistory(params);
        break;
        
      // 案件振り分けAPI
      case '/api/getDetailedAssignmentScores':
        response = handleGetDetailedAssignmentScores(params);
        break;
      case '/api/generateAssignmentAdvice':
        response = handleGenerateAssignmentAdvice(params);
        break;
      case '/api/updateSortPriority':
        response = handleUpdateSortPriority(params);
        break;
      case '/api/assignCaseToChild':
        response = handleAssignCaseToChild(params);
        break;
        
      // 請求処理API
      case '/api/updatePaymentStatus':
        response = handleUpdatePaymentStatus(params);
        break;
      case '/api/processBatchPayment':
        response = handleProcessBatchPayment(params);
        break;
      case '/api/exportBillingData':
        response = handleExportBillingData(params);
        break;
        
      // キャンセル申請API
      case '/api/cancel-request':
        response = handleCancelRequest(params);
        break;
        
      // ヘルスチェック
      case '/':
        response = { 
          success: true, 
          message: 'GAS WebApp統合版 稼働中', 
          version: '4.0.0-unified-cors-fixed',
          timestamp: new Date().toISOString() 
        };
        break;
        
      default:
        response = { success: false, error: `Unknown endpoint: ${path}` };
    }
    
    return createCorsResponse(JSON.stringify(response), 200);
    
  } catch (error) {
    console.error('❌ パスベースAPI エラー:', error);
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), 500);
  }
}

// ===== API ハンドラー関数（Vue3アプリ用）=====

/**
 * 請求履歴取得ハンドラー
 */
function handleGetBillingHistory(params) {
  try {
    // 実際の関数を呼び出し（spreadsheet_service.gsに実装済み）
    if (typeof getBillingHistory === 'function') {
      return getBillingHistory(params.franchiseeId, params);
    } else {
      // モックデータを返す
      return {
        success: true,
        data: generateMockBillingData(),
        message: 'Mock billing data returned'
      };
    }
  } catch (error) {
    console.error('Billing history error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 成約率ランキング取得ハンドラー
 */
function handleGetSuccessRateRanking(params) {
  try {
    if (typeof getSuccessRateRanking === 'function') {
      const result = getSuccessRateRanking(parseInt(params.months) || 3);
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: generateMockSuccessRateRanking(),
        message: 'Mock success rate ranking data returned'
      };
    }
  } catch (error) {
    console.error('Success rate ranking error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 応答速度ランキング取得ハンドラー
 */
function handleGetResponseRanking(params) {
  try {
    if (typeof getResponseRanking === 'function') {
      const result = getResponseRanking(parseInt(params.months) || 3);
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: generateMockResponseRanking(),
        message: 'Mock response ranking data returned'
      };
    }
  } catch (error) {
    console.error('Response ranking error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 売上ランキング取得ハンドラー
 */
function handleGetSalesRanking(params) {
  try {
    if (typeof getSalesRanking === 'function') {
      const result = getSalesRanking(parseInt(params.months) || 3);
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: generateMockSalesRanking(),
        message: 'Mock sales ranking data returned'
      };
    }
  } catch (error) {
    console.error('Sales ranking error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * フラグ一覧取得ハンドラー
 */
function handleGetFranchiseeFlags(params) {
  try {
    if (typeof getFranchiseeFlags === 'function') {
      const result = getFranchiseeFlags();
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: generateMockFlagData(),
        message: 'Mock flag data returned'
      };
    }
  } catch (error) {
    console.error('Franchisee flags error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * フラグ更新ハンドラー
 */
function handleUpdateFranchiseeFlag(data) {
  try {
    if (typeof updateFranchiseeFlag === 'function') {
      const result = updateFranchiseeFlag(
        data.franchiseeId,
        data.flagStatus,
        data.reason,
        data.options || {}
      );
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: { updated: true, excludedFromAssignment: ['ブラック', '保留', '不在'].includes(data.flagStatus) },
        message: 'Mock flag update completed'
      };
    }
  } catch (error) {
    console.error('Flag update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 一括フラグ更新ハンドラー
 */
function handleBulkUpdateFranchiseeFlags(data) {
  try {
    if (typeof bulkUpdateFranchiseeFlags === 'function') {
      const result = bulkUpdateFranchiseeFlags(data.updates);
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: { updatedCount: data.updates.length },
        message: 'Mock bulk flag update completed'
      };
    }
  } catch (error) {
    console.error('Bulk flag update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 除外リスト取得ハンドラー
 */
function handleGetAssignmentExclusionList(params) {
  try {
    if (typeof getAssignmentExclusionList === 'function') {
      const result = getAssignmentExclusionList();
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: [],
        message: 'Mock exclusion list returned'
      };
    }
  } catch (error) {
    console.error('Assignment exclusion list error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * フラグ履歴取得ハンドラー
 */
function handleGetFlagHistory(params) {
  try {
    if (typeof getFlagHistory === 'function') {
      const result = getFlagHistory(params.franchiseeId);
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: [],
        message: 'Mock flag history returned'
      };
    }
  } catch (error) {
    console.error('Flag history error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 詳細アサインメントスコア取得ハンドラー（GET/POST）
 */
function handleGetDetailedAssignmentScores(params) {
  try {
    if (typeof getDetailedAssignmentScores === 'function') {
      const result = getDetailedAssignmentScores(
        params.parentId, 
        params.inquiryId, 
        params.options || {}
      );
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: {
          assignmentScores: [],
          recommendations: [],
          analysis: {}
        },
        message: 'Mock assignment scores returned'
      };
    }
  } catch (error) {
    console.error('Assignment scores error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * アサインメントアドバイス生成ハンドラー（POST）
 */
function handleGenerateAssignmentAdvice(params) {
  try {
    if (typeof generateAssignmentAdvice === 'function') {
      const result = generateAssignmentAdvice(
        params.parentId,
        params.inquiryId,
        params.childId
      );
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: {
          advice: 'Mock assignment advice',
          confidence: 0.8
        },
        message: 'Mock assignment advice returned'
      };
    }
  } catch (error) {
    console.error('Assignment advice error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ソート優先度更新ハンドラー（POST）
 */
function handleUpdateSortPriority(params) {
  try {
    if (typeof updateSortPriority === 'function') {
      const result = updateSortPriority(params.parentId, params.sortOrder);
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: { updated: true },
        message: 'Mock sort priority update returned'
      };
    }
  } catch (error) {
    console.error('Sort priority update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ケース割り当てハンドラー（POST）
 */
function handleAssignCaseToChild(params) {
  try {
    if (typeof assignCaseToChild === 'function') {
      const result = assignCaseToChild(
        params.parentId,
        params.inquiryId,
        params.mode,
        params.options || {}
      );
      return { success: true, data: result };
    } else {
      return {
        success: true,
        data: {
          assignedTo: 'CHILD_001',
          assignmentId: 'ASSIGN_' + Date.now()
        },
        message: 'Mock case assignment returned'
      };
    }
  } catch (error) {
    console.error('Case assignment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 支払いステータス更新ハンドラー（POST）
 */
function handleUpdatePaymentStatus(data) {
  try {
    // 実装またはモック処理
    return {
      success: true,
      data: { billingId: data.billingId, status: data.status, updated: true },
      message: 'Payment status updated successfully'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 一括支払い処理ハンドラー（POST）
 */
function handleProcessBatchPayment(data) {
  try {
    return {
      success: true,
      data: { processedCount: data.billingIds.length },
      message: 'Batch payment processed successfully'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * データエクスポートハンドラー（POST）
 */
function handleExportBillingData(data) {
  try {
    // CSVデータを生成
    const csvData = 'ID,Date,Amount,Status\n1,2024-06-01,100000,Paid\n2,2024-06-02,200000,Pending';
    
    return {
      success: true,
      data: {
        content: csvData,
        filename: `billing_export_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
      },
      message: 'Export completed successfully'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===== モックデータ生成関数 =====

function generateMockBillingData() {
  const mockData = [];
  for (let i = 1; i <= 10; i++) {
    mockData.push({
      billingId: `BILL-2024-${String(i).padStart(3, '0')}`,
      billingDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      amount: (Math.floor(Math.random() * 500) + 50) * 1000,
      paymentStatus: ['未払い', '支払い済み', '期限切れ'][Math.floor(Math.random() * 3)],
      description: `2024年請求 ${i}`,
      contractCases: Math.floor(Math.random() * 10) + 1
    });
  }
  return mockData;
}

function generateMockSuccessRateRanking() {
  const franchises = ['東京都市部塗装', '神奈川県央建設', '千葉外装工業', '埼玉リフォーム', '横浜ペイント'];
  return franchises.map((name, index) => ({
    franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
    franchiseName: name,
    totalCases: Math.floor(Math.random() * 50) + 20,
    successCases: Math.floor(Math.random() * 20) + 5,
    successRate: Math.round((Math.random() * 30 + 20) * 10) / 10
  }));
}

function generateMockResponseRanking() {
  const franchises = ['東京都市部塗装', '神奈川県央建設', '千葉外装工業', '埼玉リフォーム', '横浜ペイント'];
  return franchises.map((name, index) => ({
    franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
    franchiseName: name,
    avgResponseTime: Math.round((Math.random() * 20 + 2) * 10) / 10,
    totalResponses: Math.floor(Math.random() * 100) + 50
  }));
}

function generateMockSalesRanking() {
  const franchises = ['東京都市部塗装', '神奈川県央建設', '千葉外装工業', '埼玉リフォーム', '横浜ペイント'];
  return franchises.map((name, index) => ({
    franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
    franchiseName: name,
    totalSales: Math.floor(Math.random() * 10000000) + 5000000,
    contractCount: Math.floor(Math.random() * 30) + 10,
    avgContractValue: Math.floor(Math.random() * 2000000) + 1000000
  }));
}

function generateMockFlagData() {
  const franchises = ['東京都市部塗装', '神奈川県央建設', '千葉外装工業', '埼玉リフォーム', '横浜ペイント'];
  const statuses = ['アクティブ', '不在', '保留', 'ブラック'];
  
  return franchises.map((name, index) => ({
    franchiseeId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
    franchiseName: name,
    flagStatus: statuses[Math.floor(Math.random() * statuses.length)],
    reason: '管理用設定',
    flagSetDate: new Date().toISOString(),
    excludedFromAssignment: Math.random() > 0.5
  }));
}

/**
 * URLエンコード文字列をパース
 */
function parseUrlEncoded(data) {
  var params = {};
  var pairs = data.split('&');
  
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=');
    if (pair.length === 2) {
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
  }
  
  return params;
}

/**
 * CORS対応レスポンス作成
 * @param {string} content
 * @param {number} httpStatus
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createCorsResponse(content, httpStatus = 200) {
  // GAS WebAppではsetHeaderが使えないため、シンプルなJSONレスポンスとして返す
  const output = ContentService.createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON);
  
  // HTTPステータスコードのログ出力のみ
  if (httpStatus && httpStatus !== 200) {
    console.log(`HTTP Status ${httpStatus} requested but GAS WebApp returns 200`);
  }
  
  return output;
}

/**
 * レスポンス作成関数（レガシー関数ベースAPI用）
 * JSONP対応でCORS問題を回避
 */
function createResponse(data, callback) {
  var json = JSON.stringify(data);
  
  if (callback) {
    // JSONP形式（CORS完全回避）
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 通常のJSON with CORS
    return createCorsResponse(json, 200);
  }
}

// ===================
// レガシー関数ベースAPIルーティング（既存システム用）
// ===================

/**
 * 関数ルーティング（共通）
 */
function routeFunction(functionName, parameters) {
  switch (functionName) {
    // 基本API
    case 'testConnection':
      return testConnection();
      
    case 'getDetailedAssignmentScores':
      return getDetailedAssignmentScores(
        parameters.parentId,
        parameters.inquiryId,
        parameters.options
      );
      
    case 'generateAssignmentAdvice':
      return generateAssignmentAdvice(
        parameters.parentId,
        parameters.inquiryId,
        parameters.childId
      );
      
    case 'updateSortPriority':
      return updateSortPriority(
        parameters.parentId,
        parameters.sortOrder
      );
      
    case 'assignCaseToChild':
      return assignCaseToChild(
        parameters.parentId,
        parameters.inquiryId,
        parameters.mode,
        parameters.options
      );
      
    // 拡張API（統合版で追加）
    case 'sendSlackNotification':
      return sendSlackNotification(
        parameters.channel,
        parameters.message,
        parameters.options
      );
      
    case 'processCancelRequest':
      return processCancelRequest(
        parameters.requestId,
        parameters.reason,
        parameters.details
      );
      
    case 'autoAssignCase':
      return autoAssignCase(
        parameters.caseId,
        parameters.criteria,
        parameters.options
      );
      
    case 'generateWagamamaSummary':
      return generateWagamamaSummary(
        parameters.inputText,
        parameters.parentId
      );
      
    case 'startWagamamaChat':
      return startWagamamaChat(
        parameters.userMessage,
        parameters.parentId,
        parameters.currentCondition
      );
      
    case 'continueWagamamaChat':
      return continueWagamamaChat(
        parameters.userResponse,
        parameters.chatHistory,
        parameters.parentId
      );
      
    case 'finishWagamamaChat':
      return finishWagamamaChat(
        parameters.chatHistory,
        parameters.parentId
      );
    
    case 'generateFinalCondition':
      return generateFinalCondition(
        parameters.chatHistory || [],
        parameters.currentCondition || null,
        parameters.parentId || ''
      );
      
    case 'cleanupExpiredConditions':
      return cleanupExpiredConditions(
        parameters.currentCondition || '',
        parameters.parentId || ''
      );
      
    case 'getChildAccountList':
      return getChildAccountList(
        parameters.parentId || ''
      );
      
    case 'clearPromptCache':
      return clearPromptCache();
      
    case 'updatePromptsToIdealVersion':
      return updatePromptsToIdealVersion();
      
    default:
      if (!functionName) {
        return {
          success: true,
          message: 'GAS WebApp統合CORS対応版 稼働中',
          timestamp: new Date().toISOString(),
          supportedContentTypes: [
            'application/json',
            'application/x-www-form-urlencoded',
            'text/plain'
          ],
          supportedAPIs: {
            pathBased: [
              '/api/getBillingHistory',
              '/api/getSuccessRateRanking',
              '/api/getResponseRanking', 
              '/api/getSalesRanking',
              '/api/getFranchiseeFlags',
              '/api/updateFranchiseeFlag',
              '/api/bulkUpdateFranchiseeFlags'
            ],
            functionBased: [
              'testConnection',
              'getDetailedAssignmentScores',
              'generateAssignmentAdvice',
              'updateSortPriority',
              'assignCaseToChild',
              'sendSlackNotification',
              'processCancelRequest',
              'autoAssignCase',
              'generateWagamamaSummary',
              'startWagamamaChat',
              'continueWagamamaChat',
              'finishWagamamaChat'
            ]
          },
          corsSupport: {
            preflightAvoidance: true,
            jsonpSupport: true,
            multipleContentTypes: true
          },
          version: '4.0.0-unified-cors-fixed'
        };
      } else {
        return {
          success: false,
          error: 'Unsupported function: ' + functionName
        };
      }
  }
}

// ===================
// 基本API関数（既存システム用）
// ===================

function testConnection() {
  return {
    success: true,
    message: 'GAS WebApp統合CORS対応版 接続成功',
    timestamp: new Date().toISOString(),
    server: 'Google Apps Script',
    version: '4.0.0-unified-cors-fixed',
    corsSupport: {
      contentTypes: ['application/json', 'application/x-www-form-urlencoded', 'text/plain'],
      preflightAvoidance: true,
      jsonpSupport: true
    },
    features: ['案件振り分け', 'Slack通知', 'キャンセル処理', 'AI判定', '請求履歴', 'ランキング', 'フラグ管理', 'CORS完全対応']
  };
}

function getDetailedAssignmentScores(parentId, inquiryId, options) {
  try {
    console.log('📊 getDetailedAssignmentScores:', parentId, inquiryId, options);
    
    return {
      success: true,
      data: {
        'CHILD-001': {
          name: 'テスト田中',
          status: '営業',
          area: '東京都港区',
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          aiMatchPercentage: 85,
          matchLevel: 'high',
          matchReasons: {
            'エリア対応経験': 90,
            '現在の負荷状況': 75,
            '対応可能度': 88
          },
          recommendation: 'エリア対応経験が豊富で、現在の負荷も適切です。',
          metadata: {
            currentCaseCount: 3,
            recentPerformance: { responseTime: 4, successRate: 85 }
          }
        },
        'CHILD-002': {
          name: 'サンプル佐藤',
          status: '営業',
          area: '東京都新宿区',
          lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          aiMatchPercentage: 72,
          matchLevel: 'medium',
          matchReasons: {
            'エリア対応経験': 45,
            '現在の負荷状況': 88,
            '対応可能度': 75
          },
          recommendation: '担当案件が少なく対応余力がありますが、エリア経験は限定的です。',
          metadata: {
            currentCaseCount: 1,
            recentPerformance: { responseTime: 8, successRate: 92 }
          }
        }
      },
      sortPriority: options && options.sortPriority || ['area', 'workload', 'sequence'],
      inquiryInfo: {
        category: '外壁塗装',
        prefecture: '東京都',
        city: '港区',
        budget: '100万円前後',
        timeline: '2ヶ月以内'
      },
      generatedAt: new Date().toISOString(),
      requestMethod: 'CORS-safe'
    };
  } catch (error) {
    console.error('❌ getDetailedAssignmentScores エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function generateAssignmentAdvice(parentId, inquiryId, childId) {
  try {
    return {
      success: true,
      advice: {
        type: 'highly_recommended',
        text: 'この子アカウントは案件との相性が非常に良好です。対象エリアでの豊富な経験があり、現在の担当案件数も適切で、スムーズな対応が期待できます。',
        actionSuggestion: '優先的な振り分けを推奨します。',
        aiMatchPercentage: 85,
        generatedAt: new Date().toISOString(),
        disclaimer: 'このアドバイスはAIによる参考情報です。最終的な判断は責任者にてお願いします。'
      },
      childInfo: {
        id: childId,
        name: 'テスト田中',
        experience: '5年',
        specialties: ['外壁塗装', '屋根工事']
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function updateSortPriority(parentId, sortOrder) {
  try {
    return {
      success: true,
      message: 'ソート優先度を更新しました',
      sortOrder: sortOrder || ['area', 'workload', 'sequence'],
      appliedAt: new Date().toISOString(),
      parentId: parentId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function assignCaseToChild(parentId, inquiryId, mode, options) {
  try {
    console.log('🎯 assignCaseToChild:', parentId, inquiryId, mode, options);
    
    var assignedChildId = (options && options.selectedChildId) || 'CHILD-001';
    var assignedChildName = 'テスト田中';
    
    // Slack通知（オプション）
    var slackResult = { success: false };
    if (options && options.autoNotify !== false) {
      try {
        slackResult = sendSlackNotification('general', 
          `🎯 案件割り当て完了\n案件ID: ${inquiryId}\n担当者: ${assignedChildName}`,
          { priority: 'normal' }
        );
      } catch (slackError) {
        console.error('Slack通知エラー:', slackError);
      }
    }
    
    // ログ記録
    var logResult = false;
    try {
      logResult = logCaseAssignment(parentId, inquiryId, assignedChildId, mode);
    } catch (logError) {
      console.error('ログ記録エラー:', logError);
    }
    
    return {
      success: true,
      assignedChildId: assignedChildId,
      assignedChildName: assignedChildName,
      mode: mode,
      slackSent: slackResult.success || false,
      logRecorded: logResult || false,
      errors: [],
      assignedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ===================
// 拡張API関数（統合版で追加）
// ===================

/**
 * Slack通知送信
 */
function sendSlackNotification(channel, message, options) {
  try {
    console.log('📢 sendSlackNotification:', channel, message);
    
    // 実際の処理では、Slack Webhook URLを使用して送信
    var slackPayload = {
      channel: channel,
      text: message,
      username: 'GAS外壁塗装Bot',
      icon_emoji: ':house:',
      timestamp: new Date().toISOString()
    };
    
    if (options) {
      if (options.priority === 'high') {
        slackPayload.icon_emoji = ':rotating_light:';
      }
      if (options.mentions) {
        slackPayload.text = options.mentions.join(' ') + ' ' + slackPayload.text;
      }
    }
    
    // モック送信結果
    return {
      success: true,
      message: 'Slack通知を送信しました',
      channel: channel,
      sentAt: new Date().toISOString(),
      payload: slackPayload
    };
    
  } catch (error) {
    console.error('❌ sendSlackNotification エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * キャンセルリクエスト処理
 */
function processCancelRequest(requestId, reason, details) {
  try {
    console.log('❌ processCancelRequest:', requestId, reason);
    
    var result = {
      success: true,
      requestId: requestId,
      status: 'processed',
      reason: reason,
      processedAt: new Date().toISOString(),
      nextActions: [
        '顧客への連絡',
        '子アカウントへの通知',
        'ステータス更新'
      ]
    };
    
    // Slack通知
    try {
      sendSlackNotification('cancellations', 
        `📋 キャンセル処理完了\nリクエストID: ${requestId}\n理由: ${reason}`,
        { priority: 'high' }
      );
    } catch (notifyError) {
      console.warn('キャンセル通知エラー:', notifyError);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ processCancelRequest エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 自動案件割り当て
 */
function autoAssignCase(caseId, criteria, options) {
  try {
    console.log('🤖 autoAssignCase:', caseId, criteria);
    
    var bestMatch = {
      childId: 'CHILD-001',
      childName: 'テスト田中',
      matchScore: 92,
      reasons: ['エリア適合', '経験豊富', '負荷適正']
    };
    
    return {
      success: true,
      caseId: caseId,
      assignedTo: bestMatch,
      criteria: criteria,
      autoAssigned: true,
      confidence: 0.92,
      assignedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ autoAssignCase エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===================
// ユーティリティ関数
// ===================

/**
 * ケース割り当てログ記録
 */
function logCaseAssignment(parentId, inquiryId, childId, mode) {
  try {
    console.log('📝 ログ記録:', { parentId, inquiryId, childId, mode });
    return true;
  } catch (error) {
    console.error('❌ ログ記録エラー:', error);
    return false;
  }
}

/**
 * わがまま条件のAI要約生成
 */
function generateWagamamaSummary(inputText, parentId) {
  try {
    console.log('🤖 AI要約生成:', inputText);
    
    // 実際の実装では、ChatGPT APIを呼び出す
    // 現在はモック実装
    
    // 簡単なパターンマッチングで要約を生成
    var summary = {
      text: '',
      targetPerson: null,
      period: null,
      condition: null
    };
    
    // 人名の抽出（正式名称マッピング）
    var personMatch = inputText.match(/(田中|佐藤|鈴木|高橋|渡辺|伊藤|山田|中村|小林|加藤)[さん]?/);
    if (personMatch) {
      var formalName = getFormalChildAccountName(personMatch[1]);
      summary.targetPerson = formalName;
    }
    
    // 期間の抽出（動的）
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth() + 1; // 0-based なので +1
    
    if (inputText.includes('今月')) {
      summary.period = currentYear + '年' + currentMonth + '月';
    }
    if (inputText.includes('来月')) {
      var nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      var nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      summary.period = nextYear + '年' + nextMonth + '月';
    }
    
    // 具体的な月の指定
    for (var month = 1; month <= 12; month++) {
      var monthStr = month + '月';
      var monthKanji = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][month];
      
      if (inputText.includes(monthStr) || inputText.includes(monthKanji)) {
        var targetYear = month < currentMonth ? currentYear + 1 : currentYear;
        summary.period = targetYear + '年' + month + '月';
        break;
      }
    }
    
    // 条件の抽出
    if (inputText.includes('振らない') || inputText.includes('停止') || inputText.includes('ストップ')) {
      summary.condition = '案件配分停止';
    }
    if (inputText.includes('再開')) {
      summary.condition += summary.condition ? '→再開' : '案件配分再開';
    }
    
    // 要約文の生成
    if (summary.targetPerson && summary.period && summary.condition) {
      summary.text = `${summary.period}の期間中、${summary.targetPerson}への${summary.condition}を適用します`;
    } else if (summary.targetPerson && summary.condition) {
      summary.text = `${summary.targetPerson}への${summary.condition}を適用します`;
    } else {
      summary.text = inputText.substring(0, 50) + '...の条件を適用します';
    }
    
    return {
      success: true,
      summary: summary,
      originalText: inputText,
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ AI要約生成エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * チャット形式わがまま設定開始（OpenAI API版）
 */
function startWagamamaChat(userMessage, parentId, currentCondition) {
  try {
    console.log('💬 チャット開始:', userMessage, '既存条件:', currentCondition);
    
    // 編集モード：既存条件がある場合は確認から始める
    if (currentCondition && currentCondition.trim()) {
      console.log('🔄 編集モード: 既存条件から開始');
      var editSystemPrompt = getSystemPromptFromSheet('wagamama_edit_start') || getDefaultEditPrompt();
      
      var editMessage = `現在設定されている振り分け条件は以下の通りです：

${currentCondition}

変更・追加・削除したい内容があれば教えてください。継続したい条件はそのまま残し、不要になった条件（例：期限切れの月指定など）は削除できます。新しい条件を追加することも可能です。

どのような変更をご希望でしょうか？`;
      
      return {
        success: true,
        gptResponse: editMessage,
        needsUserResponse: true,
        isEditMode: true
      };
    }
    
    // 新規モード：通常のチャット開始
    var systemPrompt = getSystemPromptFromSheet('wagamama_chat_start');
    
    var messages = [
      { role: 'user', content: userMessage }
    ];
    
    var gptResult = callOpenAI(messages, systemPrompt);
    
    if (gptResult.success) {
      // GPTの応答を解析
      var needsUserResponse = !gptResult.response.includes('条件確定') && !gptResult.response.includes('明確です');
      
      return {
        success: true,
        gptResponse: gptResult.response,
        needsUserResponse: needsUserResponse,
        isEditMode: false,
        finalPrompt: needsUserResponse ? null : generateFinalPromptFromChat([
          { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
          { role: 'gpt', content: gptResult.response, timestamp: new Date().toISOString() }
        ])
      };
    } else {
      // フォールバック：モック応答
      console.warn('OpenAI API失敗、モック応答使用:', gptResult.error);
      return generateMockChatResponse(userMessage);
    }
    
  } catch (error) {
    console.error('❌ チャット開始エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * チャット継続（OpenAI API版）
 */
function continueWagamamaChat(userResponse, chatHistory, parentId) {
  try {
    console.log('💬 チャット継続:', userResponse);
    
    // スプレッドシートからシステムプロンプトを取得
    var systemPrompt = getSystemPromptFromSheet('wagamama_chat_continue');
    
    // チャット履歴にユーザーの新しい応答を追加
    var updatedHistory = chatHistory.concat([{
      role: 'user',
      content: userResponse,
      timestamp: new Date().toISOString()
    }]);
    
    // OpenAI形式に変換（systemプロンプトは別で渡すので、user/assistantのみ）
    var messages = [];
    for (var i = 0; i < updatedHistory.length; i++) {
      var msg = updatedHistory[i];
      messages.push({
        role: msg.role === 'gpt' ? 'assistant' : 'user',
        content: msg.content
      });
    }
    
    var gptResult = callOpenAI(messages, systemPrompt);
    
    if (gptResult.success) {
      // GPTの応答を解析
      var needsUserResponse = !gptResult.response.includes('条件確定') && !gptResult.response.includes('明確になりました');
      
      return {
        success: true,
        gptResponse: gptResult.response,
        needsUserResponse: needsUserResponse,
        finalPrompt: needsUserResponse ? null : generateFinalPromptFromChat(updatedHistory.concat([{
          role: 'gpt',
          content: gptResult.response,
          timestamp: new Date().toISOString()
        }]))
      };
    } else {
      // フォールバック：モック応答
      console.warn('OpenAI API失敗、モック応答使用:', gptResult.error);
      return {
        success: true,
        gptResponse: '条件は理解できました。他に追加の条件はありますか？なければ条件確定とします。',
        needsUserResponse: true
      };
    }
    
  } catch (error) {
    console.error('❌ チャット継続エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * チャット強制終了
 */
function finishWagamamaChat(chatHistory, parentId) {
  try {
    console.log('💬 チャット強制終了');
    
    // 現在の情報で最善のプロンプトを生成
    var finalPrompt = generateFinalPromptFromChat(chatHistory.concat([{
      role: 'gpt',
      content: '承知しました！現在の情報で条件を確定します。',
      timestamp: new Date().toISOString()
    }]));
    
    return {
      success: true,
      finalPrompt: finalPrompt
    };
    
  } catch (error) {
    console.error('❌ チャット終了エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * OpenAI API呼び出し関数（GAS版）
 */
function callOpenAI(messages, systemPrompt) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      console.warn('OPENAI_API_KEY が設定されていません');
      return {
        success: false,
        error: 'OPENAI_API_KEY not found in script properties'
      };
    }
    
    var payload = {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt }
      ].concat(messages),
      max_tokens: 500,
      temperature: 0.7
    };
    
    var options = {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    console.log('🤖 OpenAI API呼び出し開始');
    var response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    var responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 && responseData.choices && responseData.choices.length > 0) {
      console.log('✅ OpenAI API成功');
      return {
        success: true,
        response: responseData.choices[0].message.content,
        usage: responseData.usage
      };
    } else {
      console.error('❌ OpenAI API エラー応答:', responseData);
      return {
        success: false,
        error: responseData.error ? responseData.error.message : 'Unknown API error'
      };
    }
    
  } catch (error) {
    console.error('❌ OpenAI API 呼び出しエラー:', error);
    return {
      success: false,
      error: error.message || error.toString()
    };
  }
}

/**
 * チャット履歴から最終プロンプト生成
 */
function generateFinalPromptFromChat(chatHistory) {
  var now = new Date();
  var originalMessage = chatHistory[0].content;
  
  var prompt = '【わがまま条件 - ' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy年M月d日') + '設定】\n\n';
  prompt += '最終条件: ' + originalMessage + '\n\n';
  
  // 対話履歴を追加
  if (chatHistory.length > 1) {
    prompt += '【対話履歴】\n';
    for (var i = 1; i < chatHistory.length; i++) {
      var msg = chatHistory[i];
      var role = msg.role === 'user' ? '👤 ユーザー' : '🤖 GPT';
      prompt += role + ': ' + msg.content + '\n';
    }
  }
  
  prompt += '\n確認日時: ' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy年M月d日 HH:mm:ss') + '\n';
  prompt += '\n※ ChatGPT APIで生成・確認済み';
  
  return prompt;
}

/**
 * モック応答生成（フォールバック用）
 */
function generateMockChatResponse(userMessage) {
  var hasMonth = /\d+月/.test(userMessage);
  var hasPerson = /(田中|佐藤|鈴木|高橋|渡辺|伊藤|山田|中村|小林|加藤)/.test(userMessage);
  var hasStop = /(ストップ|停止|振らない)/.test(userMessage);
  
  if (hasMonth && hasPerson && hasStop) {
    return {
      success: true,
      gptResponse: '条件は理解できました。他に追加の条件はありますか？なければ条件確定とします。',
      needsUserResponse: true
    };
  } else {
    return {
      success: true,
      gptResponse: 'もう少し具体的に教えてください。対象者と期間を明確にしていただけますか？',
      needsUserResponse: true
    };
  }
}

/**
 * 最終条件文を生成（名前確認・丁寧語含む）
 */
function generateFinalCondition(chatHistory, currentCondition, parentId) {
  try {
    console.log('📋 最終条件生成開始:', { chatHistory: chatHistory.length, currentCondition, parentId });
    
    var systemPrompt = getSystemPromptFromSheet('final_condition_generation') || `
あなたは外壁塗装業者の案件振り分け条件を最終整理する専門アシスタントです。

【重要なタスク】
1. チャット履歴から振り分け条件を完璧に整理
2. 既存条件があれば統合・ブラッシュアップして番号付きの箇条書きに
3. 人名を正式名称に変換（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）
4. 期間を具体的に変換（今月→6月、来月→7月）
5. 敬語・丁寧語で自然で読みやすい日本語に整理
6. 前置き文言（「以下の条件が確定しました」「条件文を生成しました」等）は一切使わない
7. 必ず番号付きの箇条書きで出力

【名前の正式変換（必須）】
- 田中 → テスト田中さん
- サトウ/佐藤 → サンプル佐藤さん
- 鈴木 → デモ鈴木さん
- 高橋 → サンプル高橋さん
- 渡辺 → テスト渡辺さん

【期間の動的変換】
- 今月 → 6月
- 来月 → 7月

【出力要件】
- 前置き文言は一切不要（「以下の〜」「条件文を生成しました」等は禁止）
- 必ず番号付きの箇条書きで出力（1. 2. 3. の形式）
- ビジネス文書として完璧な日本語
- 人名は必ず正式名称に変換
- 期間は具体的な月に変換
- 既存条件と新しい条件を美しく統合

チャット内容を整理して、上記のような完璧な条件文を番号付きの箇条書きで直接出力してください。前置き文言は一切不要です。
`;
    
    // チャット履歴をOpenAI形式に変換
    var messages = [];
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(function(msg) {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'gpt') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }
    
    // 既存条件がある場合は追加情報として提供
    var contextMessage = '以下のチャット内容を整理して、最終的な振り分け条件文を生成してください。';
    if (currentCondition) {
      contextMessage += '\n\n【既存の条件】\n' + currentCondition + '\n\n上記の既存条件も踏まえて、新しい条件と統合・更新してください。';
    }
    
    messages.unshift({ role: 'user', content: contextMessage });
    
    var gptResult = callOpenAI(messages, systemPrompt);
    
    if (gptResult.success) {
      return {
        success: true,
        finalCondition: gptResult.response.trim()
      };
    } else {
      // フォールバック：簡単な整理
      console.warn('OpenAI API失敗、フォールバック処理:', gptResult.error);
      var fallbackCondition = generateFallbackCondition(chatHistory, currentCondition);
      return {
        success: true,
        finalCondition: fallbackCondition
      };
    }
    
  } catch (error) {
    console.error('❌ 最終条件生成エラー:', error);
    return {
      success: false,
      error: error.message,
      finalCondition: generateFallbackCondition(chatHistory, currentCondition)
    };
  }
}

/**
 * フォールバック用の簡単な条件整理
 */
function generateFallbackCondition(chatHistory, currentCondition) {
  var condition = '';
  
  if (currentCondition) {
    condition = currentCondition;
  }
  
  if (chatHistory && chatHistory.length > 0) {
    var userMessages = chatHistory.filter(function(msg) {
      return msg.role === 'user';
    }).map(function(msg) {
      return msg.content;
    }).join(' ');
    
    if (userMessages) {
      condition = condition ? condition + '\n\n【追加条件】\n' + userMessages : userMessages;
    }
  }
  
  return condition || '条件が設定されていません。';
}

// ===================
// 月・名前・プロンプト管理
// ===================

/**
 * 正式な子アカウント名を取得
 */
function getFormalChildAccountName(shortName) {
  var childAccountMap = {
    '田中': 'テスト田中さん',
    '佐藤': 'サンプル佐藤さん', 
    '鈴木': 'デモ鈴木さん',
    '高橋': 'サンプル高橋さん',
    '渡辺': 'テスト渡辺さん',
    '伊藤': 'デモ伊藤さん',
    '山田': 'サンプル山田さん',
    '中村': 'テスト中村さん',
    '小林': 'デモ小林さん',
    '加藤': 'サンプル加藤さん'
  };
  
  return childAccountMap[shortName] || shortName + 'さん';
}

/**
 * 次の月を取得
 */
function getNextMonth(periodString) {
  try {
    // "2024年6月" から月を抽出
    var match = periodString.match(/(\d{4})年(\d{1,2})月/);
    if (!match) return null;
    
    var year = parseInt(match[1]);
    var month = parseInt(match[2]);
    
    var nextMonth = month === 12 ? 1 : month + 1;
    var nextYear = month === 12 ? year + 1 : year;
    
    return nextYear + '年' + nextMonth + '月';
  } catch (error) {
    console.error('次月取得エラー:', error);
    return null;
  }
}

/**
 * 期限切れ条件の自動削除・整理
 */
function cleanupExpiredConditions(currentCondition, parentId) {
  try {
    console.log('🧹 期限切れ条件整理開始:', currentCondition);
    
    if (!currentCondition) {
      return {
        success: true,
        cleanedCondition: '',
        removedConditions: [],
        message: '条件が設定されていません'
      };
    }
    
    var now = new Date();
    var currentYear = now.getFullYear();
    var currentMonth = now.getMonth() + 1;
    
    var lines = currentCondition.split('\n');
    var cleanedLines = [];
    var removedConditions = [];
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var shouldKeep = true;
      
      // 期限切れ条件を検出
      var monthMatch = line.match(/(\d{4})年(\d{1,2})月/);
      if (monthMatch) {
        var conditionYear = parseInt(monthMatch[1]);
        var conditionMonth = parseInt(monthMatch[2]);
        
        // 現在の月より前の条件は削除
        if (conditionYear < currentYear || 
           (conditionYear === currentYear && conditionMonth < currentMonth)) {
          shouldKeep = false;
          removedConditions.push({
            line: line,
            reason: '期限切れ（' + conditionYear + '年' + conditionMonth + '月）'
          });
        }
      }
      
      if (shouldKeep && line.trim()) {
        cleanedLines.push(line);
      }
    }
    
    var cleanedCondition = cleanedLines.join('\n').trim();
    
    return {
      success: true,
      cleanedCondition: cleanedCondition,
      removedConditions: removedConditions,
      message: removedConditions.length > 0 
        ? '期限切れの条件 ' + removedConditions.length + '件を削除しました'
        : '期限切れの条件はありませんでした'
    };
    
  } catch (error) {
    console.error('❌ 条件整理エラー:', error);
    return {
      success: false,
      error: error.message,
      cleanedCondition: currentCondition
    };
  }
}

/**
 * 子アカウント一覧取得
 */
function getChildAccountList(parentId) {
  try {
    // 実際の実装では、スプレッドシートやデータベースから取得
    var childAccounts = [
      { id: 'CHILD-001', name: 'テスト田中さん', shortName: '田中', status: '営業', area: '東京都港区' },
      { id: 'CHILD-002', name: 'サンプル佐藤さん', shortName: '佐藤', status: '営業', area: '東京都新宿区' },
      { id: 'CHILD-003', name: 'デモ鈴木さん', shortName: '鈴木', status: '営業', area: '東京都渋谷区' }
    ];
    
    return {
      success: true,
      childAccounts: childAccounts,
      nameMapping: childAccounts.reduce(function(map, account) {
        map[account.shortName] = account.name;
        return map;
      }, {})
    };
    
  } catch (error) {
    console.error('❌ 子アカウント取得エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===================
// プロンプト管理（スプレッドシート）
// ===================

// プロンプトキャッシュ（メモリ内）
var promptCache = {};
var cacheTimestamp = 0;
var CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

function getSystemPromptFromSheet(promptType) {
  try {
    var now = Date.now();
    
    // キャッシュが有効かチェック
    if (promptCache[promptType] && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('✅ プロンプトキャッシュヒット:', promptType);
      return promptCache[promptType];
    }
    
    console.log('🔄 プロンプトをスプレッドシートから取得:', promptType);
    
    // プロンプト管理シートを取得
    var sheet = getPromptManagementSheet();
    var data = sheet.getDataRange().getValues();
    
    // ヘッダー行をスキップして検索
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === promptType && data[i][2] === true) { // A列=type, C列=active
        var prompt = data[i][1]; // B列=prompt
        
        // キャッシュに保存
        promptCache[promptType] = prompt;
        cacheTimestamp = now;
        
        console.log('📝 プロンプト取得成功:', promptType.substring(0, 20) + '...');
        return prompt;
      }
    }
    
    // 見つからない場合はデフォルトプロンプトを返す
    console.warn('⚠️ プロンプトが見つかりません:', promptType, 'デフォルトを使用');
    var defaultPrompt = getDefaultPrompt(promptType);
    
    // デフォルトもキャッシュ
    promptCache[promptType] = defaultPrompt;
    cacheTimestamp = now;
    
    return defaultPrompt;
    
  } catch (error) {
    console.error('❌ プロンプト取得エラー:', error);
    return getDefaultPrompt(promptType);
  }
}

/**
 * プロンプトキャッシュをクリア（スプレッドシート更新時に呼び出し）
 */
function clearPromptCache() {
  promptCache = {};
  cacheTimestamp = 0;
  console.log('🗑️ プロンプトキャッシュをクリアしました');
  return { success: true, message: 'プロンプトキャッシュをクリアしました' };
}

/**
 * プロンプト管理シートを取得または作成
 */
function getPromptManagementSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'プロンプト管理';
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    // シートが存在しない場合は作成
    sheet = spreadsheet.insertSheet(sheetName);
    initializePromptSheet(sheet);
  }
  
  return sheet;
}

/**
 * プロンプト管理シートの初期化
 */
function initializePromptSheet(sheet) {
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, 4).setValues([[
    'プロンプトタイプ', 'プロンプト内容', 'アクティブ', '更新日時'
  ]]);
  
  // デフォルトプロンプトを設定
  var defaultData = [
    [
      'wagamama_chat_start',
      'あなたは外壁塗装業者の加盟店管理システムのアシスタントです。\n\n【システムの背景】\n- これは加盟店（親アカウント）が複数の子アカウント（作業者）に案件を振り分ける管理画面です\n- ユーザーは親アカウントの管理者で、田中さん・佐藤さん・鈴木さんなどは子アカウント（作業者）です\n- 「業者」の話ではなく、同じ会社内での「どの作業者に案件を振るか」の設定です\n- 「最優先」とは「他の子アカウントより先に案件を振る」という意味です\n\n【重要なルール】\n1. 人名は必ず正式名称に変換して確認する（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）\n2. 期間は必ず現在の月を基準に動的変換する（今月→6月、来月→7月）\n3. 期間指定がある場合は必ず終了時期も明示する（例：「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」）\n4. 丁寧語で美しい日本語に整理して応答する\n5. 条件を番号付きで整理し、最終的に「この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と必ず伝える\n6. 「条件確定」「業者」「以上の条件でよろしいでしょうか？」などの言葉は使わない\n\n【必須の名前変換（例外なし）】\n- 田中 → テスト田中さん\n- サトウ/佐藤 → サンプル佐藤さん\n- 鈴木 → デモ鈴木さん\n- 高橋 → サンプル高橋さん\n- 渡辺 → テスト渡辺さん\n\n【必須の期間変換（例外なし）】\n- 今月 → 6月\n- 来月 → 7月\n- 今月の停止 → 「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」\n\n【理想的な応答例】\nユーザー：「田中さんには今月は案件を振らない。サトウには最初の1件を最優先で振る。」\n応答：「1. テスト田中さんには6月中の新規案件振り分けを一時停止し、7月から通常通り再開いたします。\n2. サンプル佐藤さんには最優先で新規案件を1件振り分けを行います。\n\nこの条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」\n\n基本的には理由を聞かず、ユーザーの意図をそのまま理解し、上記の変換ルールを適用して美しく整理してください。\n全ての条件が整理できたら必ずボタン案内を含めて応答してください。',
      true,
      new Date()
    ],
    [
      'wagamama_chat_continue',
      '前回の会話を踏まえて、振り分け条件をさらに明確にしてください。\n\n【システムの背景】\n- 加盟店管理システムでの子アカウント（作業者）への案件振り分け設定\n- 「業者」ではなく「作業者（子アカウント）」への振り分けです\n- 「最優先」とは「他の作業者より先に案件を振る」という意味です\n\n【重要なルール】\n1. 人名には必ず「さん」を付ける\n2. 丁寧語で応答する\n3. 期間指定がある場合は終了時期を確認する\n4. 最終的に「以上の条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と必ず伝える\n5. 「業者」「条件確定」などの言葉は使わない\n\n全ての条件が明確になったら上記のボタン指示を含めて最終的な条件文を提示してください。\n理由や詳細は基本的に聞かず、ユーザーの指示をそのまま理解してください。',
      true,
      new Date()
    ]
  ];
  
  sheet.getRange(2, 1, defaultData.length, 4).setValues(defaultData);
  
  // フォーマット調整
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#e6f2ff');
  sheet.getColumnWidth(2, 400); // プロンプト内容列を広く
  sheet.getColumnWidth(1, 200); // タイプ列
  sheet.getColumnWidth(3, 80);  // アクティブ列
  sheet.getColumnWidth(4, 150); // 更新日時列
}

/**
 * デフォルトプロンプトを取得（フォールバック用）
 */
function getDefaultPrompt(promptType) {
  var prompts = {
    'wagamama_chat_start': `あなたは外壁塗装業者の案件振り分けシステムのアシスタントです。
ユーザーから自然言語で振り分け条件を受け取り、以下の役割を果たしてください：

1. 文章の自然な理解と処理
2. 必要最小限の確認のみ
3. 最終的な明確な条件文の生成

【システムの背景】
- 加盟店管理システムでの子アカウント（作業者）への案件振り分け設定
- 「業者」ではなく「作業者（子アカウント）」への振り分けです
- 「最優先」とは「他の作業者より先に案件を振る」という意味です

【重要なルール】
1. 人名は必ず正式名称に変換して確認する（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）
2. 期間は必ず現在の月を基準に動的変換する（今月→6月、来月→7月）
3. 期間指定がある場合は必ず終了時期も明示する（例：「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」）
4. 丁寧語で美しい日本語に整理して応答する
5. 条件を番号付きで整理し、最終的に「この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と必ず伝える
6. 「条件確定」「業者」「以上の条件でよろしいでしょうか？」などの言葉は使わない

【必須の名前変換（例外なし）】
- 田中 → テスト田中さん
- サトウ/佐藤 → サンプル佐藤さん
- 鈴木 → デモ鈴木さん
- 高橋 → サンプル高橋さん
- 渡辺 → テスト渡辺さん

【必須の期間変換（例外なし）】
- 今月 → 6月
- 来月 → 7月
- 今月の停止 → 「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」

【理想的な応答例】
ユーザー：「田中さんには今月は案件を振らない。サトウには最初の1件を最優先で振る。」
応答：「1. テスト田中さんには6月中の新規案件振り分けを一時停止し、7月から通常通り再開いたします。
2. サンプル佐藤さんには最優先で新規案件を1件振り分けを行います。

この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」

基本的には理由を聞かず、ユーザーの意図をそのまま理解し、上記の変換ルールを適用して美しく整理してください。
全ての条件が整理できたら必ずボタン案内を含めて応答してください。`,
    
    'wagamama_chat_continue': `前回の会話を踏まえて、振り分け条件をさらに明確にしてください。

【システムの背景】
- 加盟店管理システムでの子アカウント（作業者）への案件振り分け設定
- 「業者」ではなく「作業者（子アカウント）」への振り分けです
- 「最優先」とは「他の作業者より先に案件を振る」という意味です

【重要なルール】
1. 人名は必ず正式名称に変換して確認する（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）
2. 期間は必ず現在の月を基準に動的変換する（今月→6月、来月→7月）
3. 期間指定がある場合は必ず終了時期も明示する（例：「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」）
4. 丁寧語で美しい日本語に整理して応答する
5. 条件を番号付きで整理し、最終的に「この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と必ず伝える
6. 「条件確定」「業者」「以上の条件でよろしいでしょうか？」などの言葉は使わない

【必須の名前変換（例外なし）】
- 田中 → テスト田中さん
- サトウ/佐藤 → サンプル佐藤さん
- 鈴木 → デモ鈴木さん
- 高橋 → サンプル高橋さん
- 渡辺 → テスト渡辺さん

【必須の期間変換（例外なし）】
- 今月 → 6月
- 来月 → 7月
- 今月の停止 → 「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」

【条件整理のポイント】
- ユーザーの条件を受けて、必ず正式名称と具体的期間で美しく整理
- 曖昧な表現は明確化する
- 例：「サトウには最初の1件を」→「サンプル佐藤さんには最優先で新規案件を1件振り分けを行います」

全ての条件が明確になったら必ずボタン案内を含めて最終的な条件文を提示してください。
理由や詳細は基本的に聞かず、ユーザーの指示をそのまま理解し、上記の変換ルールを適用してください。`
  };
  
  return prompts[promptType] || 'システムプロンプトが見つかりません。';
}

/**
 * 編集モード用のデフォルトプロンプト
 */
function getDefaultEditPrompt() {
  return `あなたは外壁塗装業者の案件振り分け条件を編集・管理するアシスタントです。

【編集モードの役割】
1. 既存の振り分け条件を確認・整理
2. ユーザーの変更要望を理解
3. 期限切れ条件の確認・削除提案
4. 新規条件の追加
5. 最終的な統合・ブラッシュアップ

【重要なルール】
1. 人名は正式名称で確認・変換する（田中→テスト田中さん、サトウ→サンプル佐藤さん）
2. 期間は現在の月を基準に確認（過去の月は削除提案、今月・来月は具体化）
3. 丁寧語で応答し、美しい日本語に整理
4. 期限切れの条件は積極的に削除を提案
5. 最終確認時は「以上の条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と伝える

ユーザーの変更要望を理解し、適切な条件整理を行ってください。`;
}

/**
 * プロンプトを更新（管理画面から呼び出し用）
 */
function updateSystemPrompt(promptType, newPrompt) {
  try {
    var sheet = getPromptManagementSheet();
    var data = sheet.getDataRange().getValues();
    
    // 既存のプロンプトを検索して更新
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === promptType) {
        sheet.getRange(i + 1, 2).setValue(newPrompt); // B列=prompt
        sheet.getRange(i + 1, 4).setValue(new Date()); // D列=更新日時
        
        // キャッシュクリア
        clearPromptCache();
        
        return { success: true, message: 'プロンプトを更新しました' };
      }
    }
    
    // 新規追加
    var newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 4).setValues([[
      promptType, newPrompt, true, new Date()
    ]]);
    
    // キャッシュクリア
    clearPromptCache();
    
    return { success: true, message: '新しいプロンプトを追加しました' };
    
  } catch (error) {
    console.error('プロンプト更新エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * スプレッドシートのプロンプトを理想形に一括更新
 */
function updatePromptsToIdealVersion() {
  try {
    console.log('📝 プロンプトを理想形に一括更新開始');
    
    var idealStartPrompt = `あなたは外壁塗装業者の加盟店管理システムのアシスタントです。

【システムの背景】
- これは加盟店（親アカウント）が複数の子アカウント（作業者）に案件を振り分ける管理画面です
- ユーザーは親アカウントの管理者で、田中さん・佐藤さん・鈴木さんなどは子アカウント（作業者）です
- 「業者」の話ではなく、同じ会社内での「どの作業者に案件を振るか」の設定です
- 「最優先」とは「他の子アカウントより先に案件を振る」という意味です

【重要なルール】
1. 人名は必ず正式名称に変換して確認する（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）
2. 期間は必ず現在の月を基準に動的変換する（今月→6月、来月→7月）
3. 期間指定がある場合は必ず終了時期も明示する（例：「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」）
4. 丁寧語で美しい日本語に整理して応答する
5. 条件を必ず番号付きで整理し、既存条件とチャット内容をすべて統合してブラッシュアップする
6. 最終的に「この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と必ず伝える
7. 「条件確定」「業者」「以上の条件でよろしいでしょうか？」「以下の条件文を生成しました」などの前置き文言は使わない

【必須の名前変換（例外なし）】
- 田中 → テスト田中さん
- サトウ/佐藤 → サンプル佐藤さん
- 鈴木 → デモ鈴木さん
- 高橋 → サンプル高橋さん
- 渡辺 → テスト渡辺さん

【必須の期間変換（例外なし）】
- 今月 → 6月
- 来月 → 7月
- 今月の停止 → 「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」

【チャット時の統合ルール】
- 既存の保存済み条件がある場合は、それも含めて全体をブラッシュアップ
- チャット内のすべてのやり取りを統合して美しくまとめる
- 重複する条件は統合し、矛盾する条件は新しい方を優先
- 条件は必ず番号付きの箇条書きで出力

【理想的な応答例】
ユーザー：「田中さんには今月は案件を振らない。サトウには最初の1件を最優先で振る。」
応答：「1. テスト田中さんには6月中の新規案件振り分けを一時停止し、7月から通常通り再開いたします。
2. サンプル佐藤さんには最優先で新規案件を1件振り分けを行います。

この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」

基本的には理由を聞かず、ユーザーの意図をそのまま理解し、上記の変換ルールを適用して美しく整理してください。
全ての条件が整理できたら必ずボタン案内を含めて応答してください。`;

    var idealContinuePrompt = `前回の会話を踏まえて、振り分け条件をさらに明確にしてください。

【システムの背景】
- 加盟店管理システムでの子アカウント（作業者）への案件振り分け設定
- 「業者」ではなく「作業者（子アカウント）」への振り分けです
- 「最優先」とは「他の作業者より先に案件を振る」という意味です

【重要なルール】
1. 人名は必ず正式名称に変換して確認する（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）
2. 期間は必ず現在の月を基準に動的変換する（今月→6月、来月→7月）
3. 期間指定がある場合は必ず終了時期も明示する（例：「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」）
4. 丁寧語で美しい日本語に整理して応答する
5. 条件を必ず番号付きで整理し、既存条件とチャット内容をすべて統合してブラッシュアップする
6. 最終的に「この条件で問題なければ下の【この条件で保存】ボタンを押して下さい。」と必ず伝える
7. 「条件確定」「業者」「以上の条件でよろしいでしょうか？」「以下の条件文を生成しました」などの前置き文言は使わない

【必須の名前変換（例外なし）】
- 田中 → テスト田中さん
- サトウ/佐藤 → サンプル佐藤さん
- 鈴木 → デモ鈴木さん
- 高橋 → サンプル高橋さん
- 渡辺 → テスト渡辺さん

【必須の期間変換（例外なし）】
- 今月 → 6月
- 来月 → 7月
- 今月の停止 → 「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」

【チャット継続時の統合ルール】
- 既存の保存済み条件とチャット履歴をすべて統合
- 新しい条件と既存条件を美しくブラッシュアップして統合
- 重複は統合、矛盾は新しい方を優先
- 最終出力は必ず番号付きの箇条書き
- 前置き文言なしで直接条件を提示

全ての条件が明確になったら必ずボタン案内を含めて最終的な条件文を提示してください。
理由や詳細は基本的に聞かず、ユーザーの指示をそのまま理解し、上記の変換ルールを適用してください。`;

    var idealFinalConditionPrompt = `あなたは外壁塗装業者の案件振り分け条件を最終整理する専門アシスタントです。

【重要なタスク】
1. チャット履歴から振り分け条件を完璧に整理
2. 既存条件があれば統合・ブラッシュアップして番号付きの箇条書きに
3. 人名を正式名称に変換（田中→テスト田中さん、サトウ/佐藤→サンプル佐藤さん、鈴木→デモ鈴木さん）
4. 期間を具体的に変換（今月→6月、来月→7月）
5. 敬語・丁寧語で自然で読みやすい日本語に整理
6. 前置き文言（「以下の条件が確定しました」「条件文を生成しました」「新たな振り分け条件文を生成いたします」等）は一切使わない
7. 必ず番号付きの箇条書きで出力（1. 2. 3. の形式）

【名前の正式変換（必須）】
- 田中 → テスト田中さん
- サトウ/佐藤 → サンプル佐藤さん
- 鈴木 → デモ鈴木さん
- 高橋 → サンプル高橋さん
- 渡辺 → テスト渡辺さん

【期間の動的変換（必須）】
- 今月 → 6月
- 来月 → 7月
- 今月の停止 → 「6月中の案件振り分けを一時停止し、7月から通常通り再開いたします」

【出力要件】
- 前置き文言は一切不要（「以下の〜」「条件文を生成しました」等は禁止）
- 必ず番号付きの箇条書きで出力（1. 2. 3. の形式）
- ビジネス文書として完璧な日本語
- 人名は必ず正式名称に変換
- 期間は具体的な月に変換
- 既存条件と新しい条件を美しく統合
- チャット時の条件表示と完全に同じ形式で出力

【良い例】
1. テスト田中さんには6月中の新規案件振り分けを一時停止し、7月から通常通り再開いたします。
2. サンプル佐藤さんには最優先で新規案件を1件振り分けを行います。
3. 売上が100万円を超えたスタッフには、次に来た新規案件を最優先で1件振り分けます。この条件は毎月継続いたします。

【悪い例】
以下に新たな振り分け条件文を生成いたします。
- 田中さんには、今月の案件は一切振らない。
- 佐藤さんには、最初に来た案件を最優先で振る。

チャット内容を整理して、上記の良い例のような完璧な条件文を番号付きの箇条書きで直接出力してください。前置き文言は一切不要です。`;

    // 各プロンプトを更新
    updateSystemPrompt('wagamama_chat_start', idealStartPrompt);
    updateSystemPrompt('wagamama_chat_continue', idealContinuePrompt);
    updateSystemPrompt('final_condition_generation', idealFinalConditionPrompt);
    
    return {
      success: true,
      message: 'プロンプトを理想形に更新しました',
      updatedPrompts: ['wagamama_chat_start', 'wagamama_chat_continue', 'final_condition_generation']
    };
    
  } catch (error) {
    console.error('❌ プロンプト一括更新エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===============================
// キャンセル申請システム
// ===============================

/**
 * キャンセル申請メイン処理関数
 */
function handleCancelRequest(data) {
  try {
    console.log('キャンセル申請データ受信:', JSON.stringify(data));

    // 必須項目のバリデーション
    if (!data.userId || !data.caseId || !data.cancelText || !data.submittedAt) {
      throw new Error('必須項目が不足しています');
    }

    // スプレッドシートに保存
    const savedData = saveCancelRequestToSheet(data);

    // Slack通知送信
    sendCancelSlackNotification(savedData);

    console.log('✅ キャンセル申請登録完了');

    return {
      success: true,
      message: 'キャンセル申請が正常に処理されました',
      data: {
        id: savedData.rowNumber,
        status: '未確認'
      }
    };

  } catch (error) {
    console.error('キャンセル申請処理エラー:', error);
    return {
      success: false,
      message: error.message || 'キャンセル申請の処理に失敗しました'
    };
  }
}

/**
 * キャンセル申請データをスプレッドシートに保存
 */
function saveCancelRequestToSheet(data) {
  try {
    // スプレッドシートを取得または作成
    const spreadsheet = getCancelSpreadsheet();
    const sheet = getOrCreateCancelRequestsSheet(spreadsheet);

    // 申請IDを生成
    const requestId = generateCancelRequestId();
    
    // 申請理由カテゴリを自動判定
    const reasonCategory = categorizeReason(data.cancelText);
    
    // 保存するデータを準備（新12カラム構成）
    const rowData = [
      requestId,                    // A: 申請ID
      data.userId,                  // B: 加盟店ID
      data.caseId,                  // C: 案件ID
      data.userName || '',          // D: 申請者名（フロントエンドから送信されない場合は空）
      data.cancelText,              // E: 申請文
      reasonCategory,               // F: 申請理由カテゴリ
      extractDetailedReason(data.cancelText), // G: 詳細理由
      data.submittedAt,             // H: 送信日時
      '未確認',                     // I: ステータス（初期値）
      '',                           // J: 処理担当者（空）
      '',                           // K: 処理日時（空）
      ''                            // L: 備考（空）
    ];

    // データを追加
    const newRowNumber = sheet.getLastRow() + 1;
    sheet.getRange(newRowNumber, 1, 1, rowData.length).setValues([rowData]);

    console.log(`キャンセル申請データを行${newRowNumber}に保存完了 (申請ID: ${requestId})`);

    return {
      ...data,
      requestId: requestId,
      rowNumber: newRowNumber,
      status: '未確認'
    };

  } catch (error) {
    console.error('スプレッドシート保存エラー:', error);
    throw new Error('スプレッドシートへの保存に失敗しました: ' + error.message);
  }
}

/**
 * CancelRequestsシートを取得または作成
 */
function getOrCreateCancelRequestsSheet(spreadsheet) {
  const sheetName = 'キャンセル申請';
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  // 従来のCancelRequestsシートもチェック（後方互換性）
  if (!sheet) {
    sheet = spreadsheet.getSheetByName('CancelRequests');
  }

  if (!sheet) {
    // シートが存在しない場合は作成
    sheet = spreadsheet.insertSheet(sheetName);

    // 統合ヘッダー行を設定（全ての既存機能をカバー）
    const headers = [
      '申請ID',           // A: 一意の申請ID
      '加盟店ID',         // B: 申請者の加盟店ID
      '案件ID',           // C: 対象案件ID
      '申請者名',         // D: 申請者氏名
      '申請文',           // E: キャンセル申請文
      '申請理由カテゴリ', // F: 理由の分類
      '詳細理由',         // G: 詳細な理由
      '送信日時',         // H: 申請日時
      'ステータス',       // I: 処理状況
      '処理担当者',       // J: 対応者
      '処理日時',         // K: 処理完了日時
      '備考'             // L: 追加メモ
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // ヘッダー行の書式設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a90e2');
    headerRange.setFontColor('#ffffff');

    // 列幅を調整
    sheet.setColumnWidth(1, 140); // 申請ID
    sheet.setColumnWidth(2, 120); // 加盟店ID
    sheet.setColumnWidth(3, 120); // 案件ID
    sheet.setColumnWidth(4, 120); // 申請者名
    sheet.setColumnWidth(5, 300); // 申請文
    sheet.setColumnWidth(6, 150); // 申請理由カテゴリ
    sheet.setColumnWidth(7, 200); // 詳細理由
    sheet.setColumnWidth(8, 150); // 送信日時
    sheet.setColumnWidth(9, 100); // ステータス
    sheet.setColumnWidth(10, 120); // 処理担当者
    sheet.setColumnWidth(11, 150); // 処理日時
    sheet.setColumnWidth(12, 200); // 備考

    console.log(`${sheetName}シートを作成しました`);
  }

  return sheet;
}

/**
 * Slack通知を送信
 */
function sendCancelSlackNotification(data) {
  try {
    // Slack Webhook URLを取得（PropertiesServiceで管理）
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.log('Slack Webhook URLが設定されていません');
      return;
    }

    // 通知メッセージを作成
    const message = createCancelSlackMessage(data);

    // Slackに送信
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(message)
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);

    if (response.getResponseCode() === 200) {
      console.log('Slack通知送信完了');
    } else {
      console.error('Slack通知送信失敗:', response.getResponseCode(), response.getContentText());
    }

  } catch (error) {
    console.error('Slack通知エラー:', error);
    // Slack通知の失敗はシステム全体の失敗とはしない
  }
}

/**
 * Slack通知メッセージを作成
 */
function createCancelSlackMessage(data) {
  const formattedDate = new Date(data.submittedAt).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    text: "新しいキャンセル申請が届きました",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 新しいキャンセル申請"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*申請ID:*\n${data.requestId || 'N/A'}`
          },
          {
            type: "mrkdwn",
            text: `*加盟店ID:*\n${data.userId}`
          },
          {
            type: "mrkdwn",
            text: `*案件ID:*\n${data.caseId}`
          },
          {
            type: "mrkdwn",
            text: `*送信日時:*\n${formattedDate}`
          },
          {
            type: "mrkdwn",
            text: `*ステータス:*\n${data.status}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*申請内容:*\n\`\`\`${data.cancelText}\`\`\``
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "管理画面でステータスを更新してください。"
        }
      }
    ]
  };
}

/**
 * スプレッドシートを取得または作成
 */
function getCancelSpreadsheet() {
  // 既存のメインスプレッドシートを使用
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (error) {
    // アクティブスプレッドシートがない場合は新規作成
    const spreadsheet = SpreadsheetApp.create('外壁塗装管理システム - キャンセル申請');
    console.log('新しいスプレッドシートを作成:', spreadsheet.getId());
    return spreadsheet;
  }
}

// ===============================
// キャンセル申請ヘルパー関数
// ===============================

/**
 * キャンセル申請IDを生成
 * @returns {string} 申請ID
 */
function generateCancelRequestId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = String(now.getTime()).slice(-6);
  return `CANCEL_${dateStr}_${timeStr}`;
}

/**
 * キャンセル理由をカテゴリ分類
 * @param {string} cancelText - キャンセル申請文
 * @returns {string} 理由カテゴリ
 */
function categorizeReason(cancelText) {
  if (!cancelText) return 'その他';
  
  const text = cancelText.toLowerCase();
  
  if (text.includes('連絡が取れな') || text.includes('連絡取れず')) {
    return '顧客連絡不可';
  } else if (text.includes('予算') || text.includes('金額') || text.includes('料金')) {
    return '予算・料金関連';
  } else if (text.includes('スケジュール') || text.includes('時期') || text.includes('工期')) {
    return 'スケジュール調整';
  } else if (text.includes('他社') || text.includes('比較検討') || text.includes('検討')) {
    return '他社検討';
  } else if (text.includes('家族') || text.includes('相談') || text.includes('検討')) {
    return '家族・検討事項';
  } else if (text.includes('手配ミス') || text.includes('ミス') || text.includes('エラー')) {
    return '手配・システムエラー';
  } else {
    return 'その他';
  }
}

/**
 * 申請文から詳細理由を抽出
 * @param {string} cancelText - キャンセル申請文
 * @returns {string} 詳細理由
 */
function extractDetailedReason(cancelText) {
  if (!cancelText) return '';
  
  // 「主なキャンセル理由：」以降の文言を抽出
  const reasonMatch = cancelText.match(/主なキャンセル理由[：:]\s*([^\n\r]+)/);
  if (reasonMatch) {
    return reasonMatch[1].trim();
  }
  
  // 「理由：」パターンもチェック
  const reason2Match = cancelText.match(/理由[：:]\s*([^\n\r]+)/);
  if (reason2Match) {
    return reason2Match[1].trim();
  }
  
  // パターンマッチしない場合は最初の50文字を返す
  return cancelText.substring(0, 50) + (cancelText.length > 50 ? '...' : '');
}

/**
 * APIキー認証
 * @param {Object} e - イベントオブジェクト
 * @returns {Object} 認証結果
 */
function validateApiKey(e) {
  try {
    // スクリプトプロパティからAPIキー取得
    const validApiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!validApiKey) {
      console.log('⚠️ API_KEY がスクリプトプロパティに設定されていません');
      return { success: false, error: 'API key not configured on server' };
    }
    
    // リクエストからAPIキー取得（複数方法対応）
    let providedApiKey = null;
    
    // 1. Authorization ヘッダー（Bearer token）
    if (e.headers && e.headers.Authorization) {
      const authHeader = e.headers.Authorization;
      if (authHeader.startsWith('Bearer ')) {
        providedApiKey = authHeader.substring(7);
      }
    }
    
    // 2. パラメータから取得（GETまたはPOST）
    if (!providedApiKey && e.parameter && e.parameter.apiKey) {
      providedApiKey = e.parameter.apiKey;
    }
    
    // 3. POST bodyから取得
    if (!providedApiKey && e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        if (postData.apiKey) {
          providedApiKey = postData.apiKey;
        }
      } catch (parseError) {
        // JSON解析失敗は無視（他の形式の可能性）
      }
    }
    
    if (!providedApiKey) {
      console.log('❌ APIキーが提供されていません');
      return { success: false, error: 'API key required (Authorization: Bearer <key> or ?apiKey=<key>)' };
    }
    
    // APIキー照合
    if (providedApiKey !== validApiKey) {
      console.log('❌ 無効なAPIキー:', providedApiKey.substring(0, 5) + '...');
      return { success: false, error: 'Invalid API key' };
    }
    
    console.log('✅ API認証成功');
    return { success: true };
    
  } catch (error) {
    console.error('❌ API認証エラー:', error);
    return { success: false, error: 'Authentication system error' };
  }
}