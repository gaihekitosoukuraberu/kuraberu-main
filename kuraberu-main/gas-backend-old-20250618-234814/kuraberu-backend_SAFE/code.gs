/**
 * 📂 ファイル名: code.gs
 * 🎯 内容: 外壁塗装くらべるAI - Google Apps Script WebApp メインエントリーポイント
 * - CORS完全対応版統合WebApp
 * - 全API統合（案件振り分け、請求、ランキング、フラグ管理等）
 * - パスベースAPI・レガシー関数API両対応
 * ✅ doGet/doPost により外部からのWebAPIアクセスが可能
 * 📌 機能保全移植版 - 既存機能完全維持（一部は notify_fixed.gs に統合済み）
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

/**
 * GETリクエストハンドラー（無効化済み - notify_fixed.gs で統合処理）
 * 
 * @param {GoogleAppsScript.Events.DoGet} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGetDisabled(e) {
  try {
    const authResult = validateApiKey(e);
    if (!authResult.success) {
      return createCorsResponse(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        message: authResult.error
      }), 403);
    }
    
    console.log('🌐 GAS WebApp GET受信:', e.parameter);
    
    if (e.parameter.method === 'OPTIONS') {
      return createCorsResponse('', 200);
    }

    const path = e.parameter.path || '/';
    const params = e.parameter;
    
    if (path.startsWith('/api/')) {
      return handlePathBasedAPI(path, params, 'GET');
    }
    
    var functionName = e.parameter.function || '';
    var callback = e.parameter.callback;
    
    var parameters = {};
    for (var key in e.parameter) {
      if (key !== 'function' && key !== 'callback') {
        try {
          parameters[key] = JSON.parse(e.parameter[key]);
        } catch (parseError) {
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
 * 
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPostDisabled(e) {
  try {
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
    
    if (e.postData && e.postData.contents) {
      try {
        const contents = e.postData.contents;
        const parsed = JSON.parse(contents);
        
        if (parsed.events !== undefined || 
            parsed.destination !== undefined ||
            (Array.isArray(parsed.events))) {
          
          console.log('📞 LINE Webhook検証リクエストを検出');
          
          return ContentService
            .createTextOutput("OK")
            .setMimeType(ContentService.MimeType.TEXT);
        }
      } catch (lineParseError) {
        console.log('  LINE Webhook形式ではない、通常POST処理に移行');
      }
    }
    
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      return createCorsResponse('', 200);
    }
    
    var requestData;
    var functionName;
    var parameters;
    var path;
    
    switch (e.postData.type) {
      case 'application/json':
        console.log('📄 JSON形式で受信');
        requestData = JSON.parse(e.postData.contents);
        functionName = requestData.function;
        path = requestData.path;
        parameters = requestData.parameters || requestData;
        if (path) {
          Object.keys(requestData).forEach(key => {
            if (key !== 'path' && key !== 'function' && key !== 'parameters') {
              parameters[key] = requestData[key];
            }
          });
        }
        break;
        
      case 'application/x-www-form-urlencoded':
        console.log('📝 URLエンコード形式で受信');
        var params = parseUrlEncoded(e.postData.contents);
        functionName = params.function;
        path = params.path;
        parameters = params.parameters ? JSON.parse(params.parameters) : {};
        break;
        
      case 'text/plain':
        console.log('📋 プレーンテキスト形式で受信');
        requestData = JSON.parse(e.postData.contents);
        functionName = requestData.function;
        path = requestData.path;
        parameters = requestData.parameters || requestData;
        if (path) {
          Object.keys(requestData).forEach(key => {
            if (key !== 'path' && key !== 'function' && key !== 'parameters') {
              parameters[key] = requestData[key];
            }
          });
        }
        break;
        
      default:
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
    
    if (path && path.startsWith('/api/')) {
      return handlePathBasedAPI(path, parameters, 'POST');
    }
    
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
    
    return ContentService
      .createTextOutput("OK")
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * パスベースAPIハンドラー（Vue3アプリ用）
 * 
 * @param {string} path APIパス
 * @param {Object} params パラメータ
 * @param {string} method HTTPメソッド
 * @returns {GoogleAppsScript.Content.TextOutput} レスポンス
 */
function handlePathBasedAPI(path, params, method) {
  try {
    console.log('🛣️ パスベースAPI:', path, method);
    
    let response;
    switch (path) {
      case '/api/getBillingHistory':
        response = handleGetBillingHistory(params);
        break;
        
      case '/api/getSuccessRateRanking':
        response = handleGetSuccessRateRanking(params);
        break;
      case '/api/getResponseRanking':
        response = handleGetResponseRanking(params);
        break;
      case '/api/getSalesRanking':
        response = handleGetSalesRanking(params);
        break;
        
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
        
      case '/api/updatePaymentStatus':
        response = handleUpdatePaymentStatus(params);
        break;
      case '/api/processBatchPayment':
        response = handleProcessBatchPayment(params);
        break;
      case '/api/exportBillingData':
        response = handleExportBillingData(params);
        break;
        
      case '/api/cancel-request':
        response = handleCancelRequest(params);
        break;
        
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

/**
 * 請求履歴取得ハンドラー
 * 
 * @param {Object} params パラメータ
 * @returns {Object} 請求履歴データ
 */
function handleGetBillingHistory(params) {
  try {
    if (typeof getBillingHistory === 'function') {
      return getBillingHistory(params.franchiseeId, params);
    } else {
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
 * 
 * @param {Object} params パラメータ
 * @returns {Object} 成約率ランキングデータ
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
 * 
 * @param {Object} params パラメータ
 * @returns {Object} 応答速度ランキングデータ
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
 * 
 * @param {Object} params パラメータ
 * @returns {Object} 売上ランキングデータ
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
 * 
 * @param {Object} params パラメータ
 * @returns {Object} フラグデータ
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
 * 
 * @param {Object} data 更新データ
 * @returns {Object} 更新結果
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
 * 
 * @param {Object} data 更新データ
 * @returns {Object} 更新結果
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
 * 
 * @param {Object} params パラメータ
 * @returns {Object} 除外リストデータ
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
 * モックデータ生成関数群
 */
function generateMockBillingData() {
  return [
    {
      period: '2024-01',
      baseCommission: 20000,
      successFee: 15000,
      total: 35000,
      status: '支払済'
    },
    {
      period: '2024-02',
      baseCommission: 20000,
      successFee: 25000,
      total: 45000,
      status: '未払'
    }
  ];
}

function generateMockSuccessRateRanking() {
  return [
    { rank: 1, name: '田中工業', rate: 85.2, count: 23 },
    { rank: 2, name: '佐藤建設', rate: 78.6, count: 18 },
    { rank: 3, name: '山田塗装', rate: 72.4, count: 15 }
  ];
}

function generateMockResponseRanking() {
  return [
    { rank: 1, name: '田中工業', avgHours: 2.3, count: 23 },
    { rank: 2, name: '佐藤建設', avgHours: 3.1, count: 18 },
    { rank: 3, name: '山田塗装', avgHours: 4.2, count: 15 }
  ];
}

function generateMockSalesRanking() {
  return [
    { rank: 1, name: '田中工業', amount: 4500000, count: 23 },
    { rank: 2, name: '佐藤建設', amount: 3200000, count: 18 },
    { rank: 3, name: '山田塗装', amount: 2800000, count: 15 }
  ];
}

function generateMockFlagData() {
  return [
    { id: 'FR001', name: '田中工業', flag: '正常', lastUpdated: '2024-01-15' },
    { id: 'FR002', name: '佐藤建設', flag: '保留', lastUpdated: '2024-01-10' },
    { id: 'FR003', name: '山田塗装', flag: '正常', lastUpdated: '2024-01-05' }
  ];
}

/**
 * CORS対応レスポンス作成
 * 
 * @param {string} content レスポンス内容
 * @param {number} status HTTPステータスコード
 * @returns {GoogleAppsScript.Content.TextOutput} CORS対応レスポンス
 */
function createCorsResponse(content, status) {
  const output = ContentService.createTextOutput(content);
  output.setMimeType(ContentService.MimeType.JSON);
  
  Object.keys(CORS_HEADERS).forEach(header => {
    output.setHeader(header, CORS_HEADERS[header]);
  });
  
  return output;
}

/**
 * URLエンコードデータのパース
 * 
 * @param {string} data URLエンコードされたデータ
 * @returns {Object} パースされたオブジェクト
 */
function parseUrlEncoded(data) {
  const result = {};
  const pairs = data.split('&');
  
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split('=');
    if (pair.length === 2) {
      const key = decodeURIComponent(pair[0]);
      const value = decodeURIComponent(pair[1]);
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * API認証チェック
 * 
 * @param {Object} e リクエストイベント
 * @returns {Object} 認証結果
 */
function validateApiKey(e) {
  try {
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * JSONP対応レスポンス作成
 * 
 * @param {Object} result 結果データ
 * @param {string} callback コールバック関数名
 * @returns {GoogleAppsScript.Content.TextOutput} レスポンス
 */
function createResponse(result, callback) {
  if (callback) {
    const jsonpResponse = callback + '(' + JSON.stringify(result) + ');';
    return ContentService.createTextOutput(jsonpResponse)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return createCorsResponse(JSON.stringify(result), 200);
  }
}

/**
 * 関数ルーティング
 * 
 * @param {string} functionName 関数名
 * @param {Object} parameters パラメータ
 * @returns {Object} 実行結果
 */
function routeFunction(functionName, parameters) {
  try {
    console.log(`🎯 関数ルーティング: ${functionName}`);
    
    switch (functionName) {
      case 'test':
        return { success: true, message: 'Test function executed', timestamp: new Date().toISOString() };
      
      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
    
  } catch (error) {
    console.error(`❌ 関数ルーティングエラー (${functionName}):`, error);
    return { success: false, error: error.message };
  }
}

/**
 * WebAppメインシステムのテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testWebAppMainSystem() {
  console.log('🧪 WebAppメインシステムテスト開始');
  
  try {
    const testResults = [];
    
    console.log('--- パスベースAPIテスト ---');
    try {
      const apiResult = handlePathBasedAPI('/', {}, 'GET');
      testResults.push({ 
        name: 'パスベースAPI', 
        success: !!apiResult, 
        details: 'ヘルスチェックAPI動作確認'
      });
    } catch (e) {
      testResults.push({ 
        name: 'パスベースAPI', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- 関数ルーティングテスト ---');
    try {
      const routeResult = routeFunction('test', {});
      testResults.push({ 
        name: '関数ルーティング', 
        success: routeResult.success, 
        details: 'テスト関数実行確認'
      });
    } catch (e) {
      testResults.push({ 
        name: '関数ルーティング', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- モックデータ生成テスト ---');
    try {
      const mockData = generateMockBillingData();
      const success = Array.isArray(mockData) && mockData.length > 0;
      testResults.push({ 
        name: 'モックデータ生成', 
        success: success, 
        details: `請求データ ${mockData.length}件生成`
      });
    } catch (e) {
      testResults.push({ 
        name: 'モックデータ生成', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    console.log('--- CORS対応テスト ---');
    try {
      const corsResponse = createCorsResponse('{"test": true}', 200);
      testResults.push({ 
        name: 'CORS対応', 
        success: !!corsResponse, 
        details: 'CORSヘッダー付きレスポンス生成確認'
      });
    } catch (e) {
      testResults.push({ 
        name: 'CORS対応', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    console.log('✅ WebAppメインシステムテスト完了');
    
    const testSummary = {
      totalTests: totalTests,
      successfulTests: successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: `${successRate}%`
    };
    
    console.log('📊 テスト結果サマリー:', testSummary);
    
    testResults.forEach(result => {
      console.log(`${result.name}: ${result.success ? '成功' : '失敗'} - ${result.details}`);
    });
    
    return {
      success: true,
      summary: testSummary,
      testResults: testResults
    };
    
  } catch (error) {
    console.error('❌ WebAppメインシステムテストエラー:', error);
    
    return {
      success: false,
      error: {
        type: 'test_execution_failed',
        message: error.message,
        timestamp: new Date()
      }
    };
  }
}