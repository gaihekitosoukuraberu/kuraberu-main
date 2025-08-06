/**
 * 📂 ファイル名: franchise_hearing_helpers.gs
 * 🎯 内容: 加盟店ヒアリングBOT専用ヘルパー関数
 * 
 * 【責務】
 * - 6つの統合シート専用CRUD操作
 * - BOT専用データ操作ヘルパー
 * - AI連携・住所処理ヘルパー
 * - FranchiseHearingBot.gs から呼び出される補助関数
 * 
 * 【対象シート】
 * - 統合_質問リスト
 * - 統合_回答記録
 * - 統合_ユーザー状態
 * - 統合_配信制御
 * - 統合_エリア管理
 * - 統合_AI例文テンプレート
 */

// ===========================================
// 統合BOT設定・定数定義
// ===========================================

// 注意: 以下の定数は既存ファイルで定義済みのため、ここでは定義しない
// - FRANCHISE_HEARING_SPREADSHEET_ID (spreadsheet_service.gs)
// - DEPRECATED_SHEETS
// - FRANCHISE_HEARING_SHEETS

// BOT専用のローカル定数のみ定義
const FRANCHISE_BOT_VERSION = '1.0.0';
const FRANCHISE_BOT_NAME = 'FranchiseHearingBot';

/**
 * 対象スプレッドシート取得
 */
function getTargetSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('FRANCHISE_HEARING_SPREADSHEET_IDが設定されていません');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

// ===========================================
// 統合シート専用CRUD操作
// ===========================================

/**
 * 質問データの高度検索
 * 
 * @param {Object} criteria 検索条件
 * @returns {Array} マッチした質問配列
 */
function findQuestionsByCriteria(criteria = {}) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.QUESTIONS);
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let matches = true;
      
      // 検索条件をチェック
      Object.keys(criteria).forEach(key => {
        const columnIndex = headers.indexOf(key);
        if (columnIndex !== -1 && row[columnIndex] !== criteria[key]) {
          matches = false;
        }
      });
      
      if (matches) {
        const questionObj = {};
        headers.forEach((header, index) => {
          questionObj[header] = row[index];
        });
        results.push(questionObj);
      }
    }
    
    return results;
    
  } catch (error) {
    Logger.log(`❌ 質問検索エラー: ${error.message}`);
    return [];
  }
}

/**
 * 回答記録の一括取得（ユーザー別）
 * 
 * @param {string} userId ユーザーID
 * @returns {Array} ユーザーの全回答履歴
 */
function getUserAnswerHistory(userId) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.ANSWERS);
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdIndex = headers.indexOf('ユーザーID');
    const results = [];
    
    if (userIdIndex === -1) {
      return [];
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdIndex] === userId) {
        const answerObj = {};
        headers.forEach((header, index) => {
          answerObj[header] = data[i][index];
        });
        results.push(answerObj);
      }
    }
    
    // 回答日時順でソート
    results.sort((a, b) => {
      const dateA = new Date(a['回答日時']);
      const dateB = new Date(b['回答日時']);
      return dateA - dateB;
    });
    
    return results;
    
  } catch (error) {
    Logger.log(`❌ 回答履歴取得エラー: ${error.message}`);
    return [];
  }
}

/**
 * ユーザー状態の高度更新
 * 
 * @param {string} userId ユーザーID
 * @param {Object} updateData 更新データ
 * @param {Object} options 更新オプション
 * @returns {Object} 更新結果
 */
function updateUserStateAdvanced(userId, updateData, options = {}) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.USER_STATE);
    
    if (!sheet) {
      throw new Error('ユーザー状態シートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let userRowIndex = -1;
    
    // 既存ユーザー検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        userRowIndex = i;
        break;
      }
    }
    
    // 進捗率計算
    if (updateData['総回答数'] !== undefined) {
      const totalQuestions = getTotalActiveQuestions();
      const completionRate = totalQuestions > 0 ? 
        Math.round((updateData['総回答数'] / totalQuestions) * 100) : 0;
      updateData['完了率（%）'] = completionRate;
    }
    
    // 自動タイムスタンプ
    if (options.autoTimestamp !== false) {
      updateData['更新日時'] = new Date();
    }
    
    // 新規ユーザーの場合
    if (userRowIndex === -1) {
      const newRow = new Array(headers.length).fill('');
      newRow[0] = userId; // ユーザーID
      newRow[headers.indexOf('開始日時')] = new Date();
      newRow[headers.indexOf('ヒアリング状態')] = 'in_progress';
      newRow[headers.indexOf('現在ステップ')] = 1;
      newRow[headers.indexOf('総回答数')] = 0;
      newRow[headers.indexOf('完了率（%）')] = 0;
      newRow[headers.indexOf('中断回数')] = 0;
      
      userRowIndex = data.length;
      sheet.appendRow(newRow);
    }
    
    // データ更新
    Object.keys(updateData).forEach(key => {
      const columnIndex = headers.indexOf(key);
      if (columnIndex !== -1) {
        sheet.getRange(userRowIndex + 1, columnIndex + 1).setValue(updateData[key]);
      }
    });
    
    Logger.log(`✅ ユーザー状態高度更新完了: ${userId}`);
    
    return {
      success: true,
      userId: userId,
      updatedFields: Object.keys(updateData),
      completionRate: updateData['完了率（%）'] || null,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ ユーザー状態高度更新エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 配信制御状態確認
 * 
 * @param {string} userId ユーザーID
 * @returns {Object} 配信制御情報
 */
function getDeliveryControlStatus(userId) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.DELIVERY_CONTROL);
    
    if (!sheet) {
      return { deliveryEnabled: true, reason: 'シートなし' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdIndex = headers.indexOf('ユーザーID');
    const statusIndex = headers.indexOf('配信状態');
    
    if (userIdIndex === -1 || statusIndex === -1) {
      return { deliveryEnabled: true, reason: 'カラムなし' };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdIndex] === userId) {
        const status = data[i][statusIndex];
        const deliveryEnabled = status !== '停止中';
        
        const controlInfo = {};
        headers.forEach((header, index) => {
          controlInfo[header] = data[i][index];
        });
        
        return {
          deliveryEnabled: deliveryEnabled,
          status: status,
          controlInfo: controlInfo
        };
      }
    }
    
    // 未登録ユーザーは配信可能
    return { deliveryEnabled: true, reason: '未登録' };
    
  } catch (error) {
    Logger.log(`❌ 配信制御確認エラー: ${error.message}`);
    return { deliveryEnabled: true, reason: 'エラー' };
  }
}

// ===========================================
// BOT専用データ操作ヘルパー
// ===========================================

/**
 * アクティブな質問の総数取得
 * 
 * @returns {number} アクティブ質問数
 */
function getTotalActiveQuestions() {
  try {
    const questions = findQuestionsByCriteria({ 'ステータス': 'アクティブ' });
    return questions.length;
  } catch (error) {
    Logger.log(`❌ 総質問数取得エラー: ${error.message}`);
    return 0;
  }
}

/**
 * ユーザーのヒアリング進捗サマリー取得
 * 
 * @param {string} userId ユーザーID
 * @returns {Object} 進捗サマリー
 */
function getUserProgressSummary(userId) {
  try {
    const userState = getUserState(userId);
    const answerHistory = getUserAnswerHistory(userId);
    const deliveryStatus = getDeliveryControlStatus(userId);
    const totalQuestions = getTotalActiveQuestions();
    
    return {
      userId: userId,
      currentStep: userState ? userState['現在ステップ'] : 1,
      answeredCount: answerHistory.length,
      totalQuestions: totalQuestions,
      completionRate: userState ? userState['完了率（%）'] : 0,
      status: userState ? userState['ヒアリング状態'] : 'not_started',
      deliveryEnabled: deliveryStatus.deliveryEnabled,
      lastAnswerDate: answerHistory.length > 0 ? 
        answerHistory[answerHistory.length - 1]['回答日時'] : null,
      sessionId: userState ? userState['セッションID'] : null
    };
    
  } catch (error) {
    Logger.log(`❌ 進捗サマリー取得エラー: ${error.message}`);
    return {
      userId: userId,
      error: error.message
    };
  }
}

/**
 * 複数ユーザーの一括進捗確認
 * 
 * @param {Array} userIds ユーザーID配列
 * @returns {Array} 進捗サマリー配列
 */
function getBulkUserProgress(userIds) {
  try {
    const results = [];
    
    userIds.forEach(userId => {
      const summary = getUserProgressSummary(userId);
      results.push(summary);
    });
    
    return results;
    
  } catch (error) {
    Logger.log(`❌ 一括進捗確認エラー: ${error.message}`);
    return [];
  }
}

// ===========================================
// AI連携・住所処理ヘルパー
// ===========================================

/**
 * AI例文生成ログ記録
 * 
 * @param {string} userId ユーザーID
 * @param {Object} generationData 生成データ
 * @returns {Object} 記録結果
 */
function logAIExampleGeneration(userId, generationData) {
  try {
    // 回答記録シートのAI例文カラムを更新
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.ANSWERS);
    
    if (!sheet) {
      return { success: false, error: 'シートなし' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const recordIdIndex = headers.indexOf('記録ID');
    const aiExampleIndex = headers.indexOf('AI例文');
    
    // 最新の回答記録を更新
    if (generationData.recordId) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][recordIdIndex] === generationData.recordId) {
          if (aiExampleIndex !== -1) {
            sheet.getRange(i + 1, aiExampleIndex + 1).setValue(generationData.aiContent);
          }
          break;
        }
      }
    }
    
    Logger.log(`✅ AI例文ログ記録完了: ${userId}`);
    return { success: true };
    
  } catch (error) {
    Logger.log(`❌ AI例文ログ記録エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 住所候補の履歴管理
 * 
 * @param {string} userId ユーザーID
 * @param {string} originalInput 元入力
 * @param {Array} candidates 候補配列
 * @param {string} selectedAddress 選択された住所
 * @returns {Object} 記録結果
 */
function logAddressSelection(userId, originalInput, candidates, selectedAddress) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.AREA_MANAGEMENT);
    
    if (!sheet) {
      return { success: false, error: 'エリア管理シートなし' };
    }
    
    const areaId = `AREA_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date();
    
    // 選択された住所を解析
    const addressParts = selectedAddress.split(' ');
    const prefecture = addressParts[0] || '';
    const city = addressParts[1] || '';
    
    const newRecord = [
      areaId,                                    // エリアID
      userId,                                    // ユーザーID
      prefecture,                                // 都道府県
      city,                                      // 市区町村
      selectedAddress,                           // 詳細住所
      '',                                        // 郵便番号
      '',                                        // 緯度
      '',                                        // 経度
      '住所選択',                                // 操作種別
      timestamp,                                 // 操作日時
      '確定',                                    // ステータス
      JSON.stringify(candidates),                // ChatGPT候補
      'TRUE',                                    // 確認済み
      JSON.stringify({                           // メタデータ
        originalInput: originalInput,
        selectedIndex: candidates.indexOf(selectedAddress),
        timestamp: timestamp
      })
    ];
    
    sheet.appendRow(newRecord);
    
    Logger.log(`✅ 住所選択ログ記録完了: ${userId} → ${selectedAddress}`);
    
    return {
      success: true,
      areaId: areaId,
      selectedAddress: selectedAddress
    };
    
  } catch (error) {
    Logger.log(`❌ 住所選択ログ記録エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 3層プロンプトを使用したGPT連携処理
 * 
 * @param {Object} context コンテキスト情報
 * @returns {Object} GPT応答結果
 */
function processGPTWithPromptLayers(context) {
  try {
    const { currentStage, questionId, userMessage, collectedData, userHistory } = context;
    
    // 3層プロンプト組み立て
    const completePrompt = buildCompletePrompt(currentStage, questionId, collectedData);
    
    // ユーザーメッセージの構築
    const userPrompt = buildUserMessage(userMessage, userHistory);
    
    // GPT API呼び出し
    const gptResponse = callOpenAIAPI(completePrompt, userPrompt);
    
    if (!gptResponse.success) {
      return {
        success: false,
        error: gptResponse.error,
        fallbackResponse: generateFallbackResponse(currentStage, questionId)
      };
    }
    
    // レスポンス解析とバリデーション
    const parsedResponse = parseGPTResponse(gptResponse.response);
    
    return {
      success: true,
      response: parsedResponse.response,
      hasQuestion: parsedResponse.hasQuestion,
      questionOptions: parsedResponse.questionOptions,
      nextStage: parsedResponse.nextStage,
      dataToCollect: parsedResponse.dataToCollect,
      usedPromptLayers: {
        stage: currentStage,
        questionId: questionId,
        promptLength: completePrompt.length
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 3層プロンプトGPT処理エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      fallbackResponse: generateFallbackResponse(context.currentStage, context.questionId)
    };
  }
}

/**
 * ユーザーメッセージ構築
 */
function buildUserMessage(userMessage, userHistory = []) {
  let message = `ユーザーの回答: ${userMessage}`;
  
  if (userHistory && userHistory.length > 0) {
    const recentHistory = userHistory.slice(-3);
    message += `\n\n最近の回答履歴:\n`;
    recentHistory.forEach((history, index) => {
      message += `${index + 1}. ${history.question}: ${history.answer}\n`;
    });
  }
  
  return message;
}

/**
 * OpenAI API呼び出し
 */
function callOpenAIAPI(systemPrompt, userPrompt) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }
    
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const payload = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: userPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload)
    };
    
    Logger.log('🤖 OpenAI API呼び出し開始');
    
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`OpenAI API エラー: ${responseData.error?.message || 'Unknown error'}`);
    }
    
    const gptResponse = responseData.choices[0].message.content;
    
    Logger.log('✅ OpenAI API呼び出し成功');
    
    return {
      success: true,
      response: gptResponse
    };
    
  } catch (error) {
    Logger.log(`❌ OpenAI API呼び出しエラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * GPTレスポンス解析
 */
function parseGPTResponse(gptResponse) {
  try {
    // JSON形式の場合
    if (gptResponse.trim().startsWith('{')) {
      const parsed = JSON.parse(gptResponse);
      return {
        response: parsed.response || gptResponse,
        hasQuestion: parsed.hasQuestion || false,
        questionOptions: parsed.questionOptions || [],
        nextStage: parsed.nextStage || null,
        dataToCollect: parsed.dataToCollect || null
      };
    }
    
    // プレーンテキストの場合のフォールバック
    return {
      response: gptResponse,
      hasQuestion: true,
      questionOptions: generateDefaultOptions(),
      nextStage: null,
      dataToCollect: null
    };
    
  } catch (error) {
    Logger.log(`⚠️ GPTレスポンス解析エラー: ${error.message}`);
    
    // 解析失敗時のフォールバック
    return {
      response: gptResponse,
      hasQuestion: true,
      questionOptions: generateDefaultOptions(),
      nextStage: null,
      dataToCollect: null
    };
  }
}

/**
 * フォールバック応答生成
 */
function generateFallbackResponse(currentStage, questionId) {
  const fallbackResponses = {
    '第1段階': 'お住まいの基本情報を教えてください。材質、面積、築年数から最適な提案をいたします。',
    '第2段階': '現在の外壁の状態を確認させてください。劣化状況に応じて最適な工事をご提案いたします。',
    '第3段階': 'ご希望の工事時期と予算について教えてください。最適なプランをご提案いたします。',
    '第4段階': 'お客様の情報を教えてください。より詳細で最適なご提案をいたします。'
  };
  
  return {
    response: fallbackResponses[currentStage] || '外壁塗装について詳しくお聞かせください。',
    hasQuestion: true,
    questionOptions: generateDefaultOptions(),
    nextStage: currentStage,
    dataToCollect: null
  };
}

/**
 * デフォルト選択肢生成
 */
function generateDefaultOptions() {
  return [
    'はい、教えてください',
    'もう少し詳しく',
    '他の選択肢は？',
    '後で決めます'
  ];
}

/**
 * AIテンプレートの動的生成（互換性のため残存）
 * 
 * @param {Object} context コンテキスト情報
 * @returns {Object} 生成されたプロンプト
 */
function generateDynamicAIPrompt(context) {
  try {
    const { stepNumber, questionId, userAnswer, userHistory } = context;
    
    // 新しい3層プロンプトシステムに移行
    const newContext = {
      currentStage: `第${stepNumber}段階`,
      questionId: questionId,
      userMessage: userAnswer,
      collectedData: {},
      userHistory: userHistory
    };
    
    return processGPTWithPromptLayers(newContext);
    
  } catch (error) {
    Logger.log(`❌ 動的プロンプト生成エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ===========================================
// データ分析・レポート機能
// ===========================================

/**
 * ヒアリング完了率統計
 * 
 * @returns {Object} 統計データ
 */
function getHearingCompletionStats() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.USER_STATE);
    
    if (!sheet) {
      return { error: 'ユーザー状態シートなし' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusIndex = headers.indexOf('ヒアリング状態');
    const completionRateIndex = headers.indexOf('完了率（%）');
    
    const stats = {
      totalUsers: data.length - 1,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      averageCompletionRate: 0,
      completionRateDistribution: {
        '0-25%': 0,
        '26-50%': 0,
        '51-75%': 0,
        '76-99%': 0,
        '100%': 0
      }
    };
    
    let totalCompletionRate = 0;
    
    for (let i = 1; i < data.length; i++) {
      const status = data[i][statusIndex];
      const completionRate = data[i][completionRateIndex] || 0;
      
      totalCompletionRate += completionRate;
      
      // ステータス分類
      switch (status) {
        case 'completed':
          stats.completed++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        default:
          stats.notStarted++;
      }
      
      // 完了率分布
      if (completionRate === 100) {
        stats.completionRateDistribution['100%']++;
      } else if (completionRate >= 76) {
        stats.completionRateDistribution['76-99%']++;
      } else if (completionRate >= 51) {
        stats.completionRateDistribution['51-75%']++;
      } else if (completionRate >= 26) {
        stats.completionRateDistribution['26-50%']++;
      } else {
        stats.completionRateDistribution['0-25%']++;
      }
    }
    
    stats.averageCompletionRate = stats.totalUsers > 0 ? 
      Math.round(totalCompletionRate / stats.totalUsers) : 0;
    
    return stats;
    
  } catch (error) {
    Logger.log(`❌ 完了率統計エラー: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * テスト用関数：ヘルパー機能の動作確認
 * 
 * @returns {Object} テスト結果
 */
function testFranchiseHearingHelpers() {
  try {
    Logger.log('🧪 加盟店ヒアリングヘルパー機能テスト開始');
    
    const testResults = [];
    
    // 1. 質問検索テスト
    const questions = findQuestionsByCriteria({ 'ステータス': 'アクティブ' });
    testResults.push({
      name: '質問検索',
      success: Array.isArray(questions),
      details: `${questions.length}件の質問を取得`
    });
    
    // 2. 総質問数テスト
    const totalQuestions = getTotalActiveQuestions();
    testResults.push({
      name: '総質問数取得',
      success: typeof totalQuestions === 'number',
      details: `${totalQuestions}件の質問`
    });
    
    // 3. 統計テスト
    const stats = getHearingCompletionStats();
    testResults.push({
      name: '完了率統計',
      success: !stats.error,
      details: stats.error || `${stats.totalUsers}人のユーザー統計`
    });
    
    const successCount = testResults.filter(test => test.success).length;
    const successRate = (successCount / testResults.length * 100).toFixed(1);
    
    Logger.log('✅ ヘルパー機能テスト完了');
    
    return {
      success: true,
      summary: {
        totalTests: testResults.length,
        successfulTests: successCount,
        successRate: `${successRate}%`
      },
      testResults: testResults,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ ヘルパー機能テストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}