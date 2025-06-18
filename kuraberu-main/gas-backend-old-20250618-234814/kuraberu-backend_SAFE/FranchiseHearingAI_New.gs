/**
 * 📂 ファイル名: FranchiseHearingAI_New.gs
 * 🎯 内容: 外壁塗装くらべるAI - 加盟店AIヒアリングシステム・新仕様版
 * - DeepSeekによる自動企業情報抽出・補完
 * - ユーザーは最小限入力・修正のみ
 * - スクレイピング・外部API不使用
 * - AI候補 ⇒ ✅/❌ 指摘式確認
 * - プロデザイナー品質UI
 * - 動的AIフロー（都度分岐型）
 * ✅ 完全統合AIヒアリングシステム
 * 📌 機能保全移植版 - 既存機能完全維持
 */

const OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
const GOOGLE_SEARCH_API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
const GOOGLE_SEARCH_ENGINE_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
const AI_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 
                         PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID');

/**
 * ヒアリング開始・会社基本情報AI抽出
 * 
 * @param {Object} params { companyName }
 * @returns {Object} 抽出結果
 */
function startAIHearing(params) {
  try {
    const { companyName } = params;
    
    if (!companyName || companyName.trim() === '') {
      return createErrorResponse('会社名を入力してください');
    }
    
    Logger.log(`🤖 AI抽出開始（第1段階・高速）: ${companyName}`);
    Logger.log(`🔍 OPENROUTER_API_KEY存在確認: ${!!OPENROUTER_API_KEY}`);
    
    const sessionId = generateSessionId();
    
    Logger.log(`🚀 FORCING REAL DEEPSEEK EXTRACTION - ZERO TOLERANCE FOR FAKE DATA`);
    Logger.log(`🔍 API Key Status: ${OPENROUTER_API_KEY ? 'EXISTS (' + OPENROUTER_API_KEY.substring(0, 15) + '...)' : 'MISSING'}`);
    
    if (!OPENROUTER_API_KEY) {
      Logger.log(`❌ BLOCKING EXECUTION: No OpenRouter API Key configured`);
      return createErrorResponse('システムエラー: OpenRouter APIキーが設定されていません。管理者にお問い合わせください。');
    }
    
    const aiExtraction = extractCompanyInfoWithDeepSeek(companyName);
    Logger.log(`🔍 DEEPSEEK EXTRACTION RESULT: ${JSON.stringify(aiExtraction, null, 2)}`);
    
    if (!aiExtraction.success) {
      Logger.log(`❌ DEEPSEEK EXTRACTION FAILED: ${aiExtraction.error}`);
      return createErrorResponse('DeepSeek API抽出エラー: ' + aiExtraction.error);
    }
    
    Logger.log(`✅ REAL DEEPSEEK DATA EXTRACTED: ${aiExtraction.candidates?.length || 0} candidates`);
    
    const sessionData = {
      sessionId: sessionId,
      startTime: new Date(),
      inputCompanyName: companyName,
      aiExtractionResults: aiExtraction.candidates,
      currentStep: 'ai_confirmation',
      completedSteps: [],
      hearingData: {}
    };
    
    saveSessionData(sessionId, sessionData);
    
    return createSuccessResponse({
      sessionId: sessionId,
      step: 'ai_confirmation',
      progress: 10,
      message: 'AI企業情報抽出が完了しました',
      candidates: aiExtraction.candidates,
      instruction: '抽出された情報をご確認ください。正しい場合は✅、修正が必要な場合は❌をクリックしてください。'
    });
    
  } catch (error) {
    Logger.log(`❌ AI抽出エラー: ${error.message}`);
    return createErrorResponse(error.message);
  }
}

/**
 * WebサイトURLから企業情報抽出
 * 
 * @param {Object} params { websiteUrl }
 * @returns {Object} 抽出結果
 */
function extractFromWebsite(params) {
  try {
    const { websiteUrl } = params;
    
    if (!websiteUrl || websiteUrl.trim() === '') {
      return createErrorResponse('WebサイトURLを入力してください');
    }
    
    Logger.log(`🌐 WebサイトURL抽出開始: ${websiteUrl}`);
    
    if (!OPENROUTER_API_KEY) {
      return createErrorResponse('システムエラー: OpenRouter APIキーが設定されていません。');
    }
    
    const sessionId = generateSessionId();
    const webExtraction = extractCompanyInfoFromWebsite(websiteUrl);
    
    if (!webExtraction.success) {
      Logger.log(`❌ WebサイトURL抽出失敗: ${webExtraction.error}`);
      return createErrorResponse('WebサイトURL抽出エラー: ' + webExtraction.error);
    }
    
    const sessionData = {
      sessionId: sessionId,
      startTime: new Date(),
      inputWebsiteUrl: websiteUrl,
      aiExtractionResults: webExtraction.candidates,
      currentStep: 'ai_confirmation',
      completedSteps: [],
      hearingData: {}
    };
    
    saveSessionData(sessionId, sessionData);
    
    return createSuccessResponse({
      sessionId: sessionId,
      step: 'ai_confirmation',
      progress: 10,
      message: 'WebサイトURL企業情報抽出が完了しました',
      candidates: webExtraction.candidates,
      instruction: '抽出された情報をご確認ください。正しい場合は✅、修正が必要な場合は❌をクリックしてください。'
    });
    
  } catch (error) {
    Logger.log(`❌ WebサイトURL抽出エラー: ${error.message}`);
    return createErrorResponse(error.message);
  }
}

/**
 * DeepSeekによる企業情報抽出
 * 
 * @param {string} companyName 会社名
 * @returns {Object} 抽出結果
 */
function extractCompanyInfoWithDeepSeek(companyName) {
  try {
    Logger.log(`🧠 DeepSeek企業情報抽出: ${companyName}`);
    
    const systemPrompt = `あなたは企業情報抽出の専門家です。会社名から以下の情報を抽出してください：

1. 正式会社名（法人格含む）
2. 所在地（都道府県・市区町村）
3. 業界・業種
4. 事業内容
5. 代表者名
6. 設立年
7. 従業員数（概算）
8. 資本金（概算）
9. WebサイトURL（推測）
10. 電話番号（推測）

JSON形式で回答してください。不明な項目は"不明"としてください。`;

    const userPrompt = `会社名: ${companyName}\n\n上記の会社についての詳細情報を抽出してください。`;
    
    const payload = {
      "model": "deepseek/deepseek-chat",
      "messages": [
        { "role": "system", "content": systemPrompt },
        { "role": "user", "content": userPrompt }
      ],
      "max_tokens": 800,
      "temperature": 0.3
    };
    
    const options = {
      "method": "POST",
      "headers": {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch("https://openrouter.ai/api/v1/chat/completions", options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.error) {
      throw new Error(`DeepSeek APIエラー: ${responseData.error.message}`);
    }
    
    const aiResponse = responseData.choices[0].message.content;
    Logger.log(`🤖 DeepSeek回答: ${aiResponse}`);
    
    let extractedData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON形式の回答が見つかりません');
      }
    } catch (parseError) {
      Logger.log(`⚠️ JSON解析エラー、フォールバック処理: ${parseError.message}`);
      extractedData = parseAIResponseFallback(aiResponse, companyName);
    }
    
    const candidates = [{
      companyName: extractedData.正式会社名 || extractedData.companyName || companyName,
      location: extractedData.所在地 || extractedData.location || '不明',
      industry: extractedData.業界業種 || extractedData.industry || '不明',
      businessContent: extractedData.事業内容 || extractedData.businessContent || '不明',
      representative: extractedData.代表者名 || extractedData.representative || '不明',
      establishedYear: extractedData.設立年 || extractedData.establishedYear || '不明',
      employeeCount: extractedData.従業員数 || extractedData.employeeCount || '不明',
      capital: extractedData.資本金 || extractedData.capital || '不明',
      websiteUrl: extractedData.WebサイトURL || extractedData.websiteUrl || '不明',
      phoneNumber: extractedData.電話番号 || extractedData.phoneNumber || '不明',
      source: 'DeepSeek AI',
      confidence: 0.8
    }];
    
    return {
      success: true,
      candidates: candidates,
      source: 'DeepSeek'
    };
    
  } catch (error) {
    Logger.log(`❌ DeepSeek抽出エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * WebサイトURLから企業情報抽出
 * 
 * @param {string} websiteUrl WebサイトURL
 * @returns {Object} 抽出結果
 */
function extractCompanyInfoFromWebsite(websiteUrl) {
  try {
    Logger.log(`🌐 WebサイトURL企業情報抽出: ${websiteUrl}`);
    
    const systemPrompt = `あなたは企業WebサイトからCorporate情報を抽出する専門家です。以下のWebサイトURLから企業情報を推測・抽出してください：

抽出項目：
1. 会社名（正式名称）
2. 所在地
3. 業界・業種
4. 事業内容
5. 代表者名
6. 設立年
7. 従業員数
8. 資本金
9. 電話番号
10. その他の特徴

JSON形式で回答してください。`;

    const userPrompt = `WebサイトURL: ${websiteUrl}\n\nこのURLから推測できる企業情報を抽出してください。ドメイン名やURL構造から推測される情報も含めてください。`;
    
    const payload = {
      "model": "deepseek/deepseek-chat",
      "messages": [
        { "role": "system", "content": systemPrompt },
        { "role": "user", "content": userPrompt }
      ],
      "max_tokens": 800,
      "temperature": 0.3
    };
    
    const options = {
      "method": "POST",
      "headers": {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      "payload": JSON.stringify(payload)
    };
    
    const response = UrlFetchApp.fetch("https://openrouter.ai/api/v1/chat/completions", options);
    const responseData = JSON.parse(response.getContentText());
    
    if (responseData.error) {
      throw new Error(`DeepSeek APIエラー: ${responseData.error.message}`);
    }
    
    const aiResponse = responseData.choices[0].message.content;
    Logger.log(`🤖 WebサイトURL抽出回答: ${aiResponse}`);
    
    let extractedData;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON形式の回答が見つかりません');
      }
    } catch (parseError) {
      Logger.log(`⚠️ JSON解析エラー、フォールバック処理: ${parseError.message}`);
      extractedData = parseAIResponseFallback(aiResponse, websiteUrl);
    }
    
    const candidates = [{
      companyName: extractedData.会社名 || extractedData.companyName || 'URL分析中',
      location: extractedData.所在地 || extractedData.location || '不明',
      industry: extractedData.業界業種 || extractedData.industry || '不明',
      businessContent: extractedData.事業内容 || extractedData.businessContent || '不明',
      representative: extractedData.代表者名 || extractedData.representative || '不明',
      establishedYear: extractedData.設立年 || extractedData.establishedYear || '不明',
      employeeCount: extractedData.従業員数 || extractedData.employeeCount || '不明',
      capital: extractedData.資本金 || extractedData.capital || '不明',
      websiteUrl: websiteUrl,
      phoneNumber: extractedData.電話番号 || extractedData.phoneNumber || '不明',
      source: 'DeepSeek AI (URL分析)',
      confidence: 0.6
    }];
    
    return {
      success: true,
      candidates: candidates,
      source: 'DeepSeek URL分析'
    };
    
  } catch (error) {
    Logger.log(`❌ WebサイトURL抽出エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * AI回答のフォールバック解析
 * 
 * @param {string} aiResponse AI回答テキスト
 * @param {string} input 入力値
 * @returns {Object} 解析結果
 */
function parseAIResponseFallback(aiResponse, input) {
  try {
    const fallbackData = {
      companyName: input,
      location: '不明',
      industry: '不明',
      businessContent: '不明',
      representative: '不明',
      establishedYear: '不明',
      employeeCount: '不明',
      capital: '不明',
      websiteUrl: '不明',
      phoneNumber: '不明'
    };
    
    const lines = aiResponse.split('\n');
    lines.forEach(line => {
      if (line.includes('会社名') || line.includes('companyName')) {
        const match = line.match(/[:：]\s*(.+)/);
        if (match) fallbackData.companyName = match[1].trim();
      }
      if (line.includes('所在地') || line.includes('location')) {
        const match = line.match(/[:：]\s*(.+)/);
        if (match) fallbackData.location = match[1].trim();
      }
      if (line.includes('業界') || line.includes('industry')) {
        const match = line.match(/[:：]\s*(.+)/);
        if (match) fallbackData.industry = match[1].trim();
      }
    });
    
    return fallbackData;
    
  } catch (error) {
    Logger.log(`❌ フォールバック解析エラー: ${error.message}`);
    return {
      companyName: input,
      location: '不明',
      industry: '不明',
      businessContent: '不明',
      representative: '不明',
      establishedYear: '不明',
      employeeCount: '不明',
      capital: '不明',
      websiteUrl: '不明',
      phoneNumber: '不明'
    };
  }
}

/**
 * セッションID生成
 * 
 * @returns {string} セッションID
 */
function generateSessionId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${timestamp}_${random}`;
}

/**
 * セッションデータ保存
 * 
 * @param {string} sessionId セッションID
 * @param {Object} data セッションデータ
 */
function saveSessionData(sessionId, data) {
  try {
    const ss = SpreadsheetApp.openById(AI_SPREADSHEET_ID);
    let sessionSheet = ss.getSheetByName('AIヒアリングセッション');
    
    if (!sessionSheet) {
      sessionSheet = ss.insertSheet('AIヒアリングセッション');
      const headers = ['セッションID', 'データ', '作成日時', '更新日時'];
      sessionSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const jsonData = JSON.stringify(data);
    const newRow = [sessionId, jsonData, new Date(), new Date()];
    sessionSheet.appendRow(newRow);
    
    Logger.log(`✅ セッションデータ保存完了: ${sessionId}`);
    
  } catch (error) {
    Logger.log(`❌ セッションデータ保存エラー: ${error.message}`);
  }
}

/**
 * セッションデータ取得
 * 
 * @param {string} sessionId セッションID
 * @returns {Object} セッションデータ
 */
function getSessionData(sessionId) {
  try {
    const ss = SpreadsheetApp.openById(AI_SPREADSHEET_ID);
    const sessionSheet = ss.getSheetByName('AIヒアリングセッション');
    
    if (!sessionSheet) {
      return null;
    }
    
    const data = sessionSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sessionId) {
        return JSON.parse(data[i][1]);
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`❌ セッションデータ取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * 成功レスポンス作成
 * 
 * @param {Object} data レスポンスデータ
 * @returns {Object} 成功レスポンス
 */
function createSuccessResponse(data) {
  return {
    success: true,
    timestamp: new Date(),
    ...data
  };
}

/**
 * エラーレスポンス作成
 * 
 * @param {string} message エラーメッセージ
 * @returns {Object} エラーレスポンス
 */
function createErrorResponse(message) {
  return {
    success: false,
    error: message,
    timestamp: new Date()
  };
}

/**
 * AI確認結果処理
 * 
 * @param {Object} params 確認結果パラメータ
 * @returns {Object} 処理結果
 */
function processAIConfirmation(params) {
  try {
    const { sessionId, confirmations } = params;
    
    if (!sessionId) {
      return createErrorResponse('セッションIDが見つかりません');
    }
    
    const sessionData = getSessionData(sessionId);
    if (!sessionData) {
      return createErrorResponse('セッションデータが見つかりません');
    }
    
    sessionData.aiConfirmations = confirmations;
    sessionData.currentStep = 'business_details';
    sessionData.completedSteps.push('ai_confirmation');
    
    saveSessionData(sessionId, sessionData);
    
    return createSuccessResponse({
      sessionId: sessionId,
      step: 'business_details',
      progress: 30,
      message: 'AI確認が完了しました。事業詳細をお聞かせください。',
      confirmedData: confirmations
    });
    
  } catch (error) {
    Logger.log(`❌ AI確認処理エラー: ${error.message}`);
    return createErrorResponse(error.message);
  }
}

/**
 * 事業詳細ヒアリング処理
 * 
 * @param {Object} params 事業詳細パラメータ
 * @returns {Object} 処理結果
 */
function processBusinessDetails(params) {
  try {
    const { sessionId, businessData } = params;
    
    if (!sessionId) {
      return createErrorResponse('セッションIDが見つかりません');
    }
    
    const sessionData = getSessionData(sessionId);
    if (!sessionData) {
      return createErrorResponse('セッションデータが見つかりません');
    }
    
    sessionData.businessDetails = businessData;
    sessionData.currentStep = 'franchise_interest';
    sessionData.completedSteps.push('business_details');
    
    saveSessionData(sessionId, sessionData);
    
    return createSuccessResponse({
      sessionId: sessionId,
      step: 'franchise_interest',
      progress: 60,
      message: '事業詳細の登録が完了しました。フランチャイズへの関心についてお聞かせください。',
      businessData: businessData
    });
    
  } catch (error) {
    Logger.log(`❌ 事業詳細処理エラー: ${error.message}`);
    return createErrorResponse(error.message);
  }
}

/**
 * フランチャイズ関心度処理
 * 
 * @param {Object} params フランチャイズ関心度パラメータ
 * @returns {Object} 処理結果
 */
function processFranchiseInterest(params) {
  try {
    const { sessionId, interestData } = params;
    
    if (!sessionId) {
      return createErrorResponse('セッションIDが見つかりません');
    }
    
    const sessionData = getSessionData(sessionId);
    if (!sessionData) {
      return createErrorResponse('セッションデータが見つかりません');
    }
    
    sessionData.franchiseInterest = interestData;
    sessionData.currentStep = 'completion';
    sessionData.completedSteps.push('franchise_interest');
    sessionData.completionTime = new Date();
    
    saveSessionData(sessionId, sessionData);
    
    const finalReport = generateHearingReport(sessionData);
    
    return createSuccessResponse({
      sessionId: sessionId,
      step: 'completion',
      progress: 100,
      message: 'ヒアリングが完了しました。ありがとうございました。',
      report: finalReport
    });
    
  } catch (error) {
    Logger.log(`❌ フランチャイズ関心度処理エラー: ${error.message}`);
    return createErrorResponse(error.message);
  }
}

/**
 * ヒアリングレポート生成
 * 
 * @param {Object} sessionData セッションデータ
 * @returns {Object} ヒアリングレポート
 */
function generateHearingReport(sessionData) {
  try {
    const report = {
      sessionId: sessionData.sessionId,
      companyInfo: {
        inputName: sessionData.inputCompanyName || sessionData.inputWebsiteUrl,
        extractedInfo: sessionData.aiExtractionResults?.[0] || {},
        confirmedInfo: sessionData.aiConfirmations || {}
      },
      businessDetails: sessionData.businessDetails || {},
      franchiseInterest: sessionData.franchiseInterest || {},
      timeline: {
        startTime: sessionData.startTime,
        completionTime: sessionData.completionTime,
        duration: sessionData.completionTime ? 
          Math.round((sessionData.completionTime - sessionData.startTime) / 1000) : null
      },
      completedSteps: sessionData.completedSteps || [],
      score: calculateInterestScore(sessionData)
    };
    
    saveHearingReport(report);
    
    return report;
    
  } catch (error) {
    Logger.log(`❌ レポート生成エラー: ${error.message}`);
    return {
      error: error.message,
      sessionId: sessionData?.sessionId
    };
  }
}

/**
 * 関心度スコア計算
 * 
 * @param {Object} sessionData セッションデータ
 * @returns {number} 関心度スコア
 */
function calculateInterestScore(sessionData) {
  try {
    let score = 0;
    
    if (sessionData.completedSteps?.length >= 3) {
      score += 30;
    }
    
    if (sessionData.franchiseInterest?.investmentBudget) {
      score += 25;
    }
    
    if (sessionData.franchiseInterest?.timeline) {
      score += 20;
    }
    
    if (sessionData.businessDetails?.experience) {
      score += 15;
    }
    
    if (sessionData.aiConfirmations && Object.keys(sessionData.aiConfirmations).length > 0) {
      score += 10;
    }
    
    return Math.min(score, 100);
    
  } catch (error) {
    Logger.log(`❌ スコア計算エラー: ${error.message}`);
    return 0;
  }
}

/**
 * ヒアリングレポート保存
 * 
 * @param {Object} report ヒアリングレポート
 */
function saveHearingReport(report) {
  try {
    const ss = SpreadsheetApp.openById(AI_SPREADSHEET_ID);
    let reportSheet = ss.getSheetByName('AIヒアリングレポート');
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet('AIヒアリングレポート');
      const headers = [
        'セッションID', '会社名', '関心度スコア', '投資予算', '開始時期',
        '事業経験', '完了ステップ数', 'ヒアリング時間', '完了日時', 'レポートデータ'
      ];
      reportSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const newRow = [
      report.sessionId,
      report.companyInfo?.inputName || '不明',
      report.score || 0,
      report.franchiseInterest?.investmentBudget || '不明',
      report.franchiseInterest?.timeline || '不明',
      report.businessDetails?.experience || '不明',
      report.completedSteps?.length || 0,
      report.timeline?.duration || 0,
      report.timeline?.completionTime || new Date(),
      JSON.stringify(report)
    ];
    
    reportSheet.appendRow(newRow);
    
    Logger.log(`✅ ヒアリングレポート保存完了: ${report.sessionId}`);
    
  } catch (error) {
    Logger.log(`❌ ヒアリングレポート保存エラー: ${error.message}`);
  }
}

/**
 * AIヒアリングシステムのテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testAIHearingSystem() {
  Logger.log('🧪 AIヒアリングシステムテスト開始');
  
  try {
    const testResults = [];
    
    Logger.log('--- セッションID生成テスト ---');
    try {
      const sessionId = generateSessionId();
      testResults.push({
        name: 'セッションID生成',
        success: !!sessionId && sessionId.startsWith('session_'),
        details: `生成ID: ${sessionId}`
      });
    } catch (e) {
      testResults.push({
        name: 'セッションID生成',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    Logger.log('--- API接続確認テスト ---');
    try {
      const apiKeyExists = !!OPENROUTER_API_KEY;
      testResults.push({
        name: 'API接続確認',
        success: apiKeyExists,
        details: apiKeyExists ? 'APIキー設定済み' : 'APIキー未設定'
      });
    } catch (e) {
      testResults.push({
        name: 'API接続確認',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    Logger.log('--- レスポンス作成テスト ---');
    try {
      const successResponse = createSuccessResponse({ test: 'data' });
      const errorResponse = createErrorResponse('テストエラー');
      testResults.push({
        name: 'レスポンス作成',
        success: successResponse.success === true && errorResponse.success === false,
        details: '成功・エラーレスポンス作成確認'
      });
    } catch (e) {
      testResults.push({
        name: 'レスポンス作成',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ AIヒアリングシステムテスト完了');
    
    const testSummary = {
      totalTests: totalTests,
      successfulTests: successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: `${successRate}%`
    };
    
    Logger.log('📊 テスト結果サマリー:', testSummary);
    
    testResults.forEach(result => {
      Logger.log(`${result.name}: ${result.success ? '成功' : '失敗'} - ${result.details}`);
    });
    
    return {
      success: true,
      summary: testSummary,
      testResults: testResults
    };
    
  } catch (error) {
    Logger.log('❌ AIヒアリングシステムテストエラー:', error);
    
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