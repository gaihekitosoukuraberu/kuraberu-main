/**
 * 📂 ファイル名: franchise_hearing_helpers.gs
 * 🎯 内容: 外壁塗装くらべるAI - 加盟店ヒアリングBOT専用ヘルパー関数
 * - 6つの統合シート専用CRUD操作
 * - BOT専用データ操作ヘルパー
 * - AI連携・住所処理ヘルパー
 * - データ分析・レポート機能
 * ✅ FranchiseHearingBot.gs から呼び出される補助関数群
 * 📌 機能保全移植版 - 既存機能完全維持
 */

const FRANCHISE_BOT_VERSION = '1.0.0';
const FRANCHISE_BOT_NAME = 'FranchiseHearingBot';

/**
 * 質問データの高度検索
 * 指定された条件に基づいて質問を検索
 * 
 * @param {Object} criteria 検索条件
 * @returns {Array} マッチした質問配列
 */
function findQuestionsByCriteria(criteria = {}) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
 * 指定ユーザーの全回答履歴を取得
 * 
 * @param {string} userId ユーザーID
 * @returns {Array} ユーザーの全回答履歴
 */
function getUserAnswerHistory(userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
 * 進捗率自動計算・タイムスタンプ付き更新
 * 
 * @param {string} userId ユーザーID
 * @param {Object} updateData 更新データ
 * @param {Object} options 更新オプション
 * @returns {Object} 更新結果
 */
function updateUserStateAdvanced(userId, updateData, options = {}) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.USER_STATE);
    
    if (!sheet) {
      throw new Error('ユーザー状態シートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let userRowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        userRowIndex = i;
        break;
      }
    }
    
    if (updateData['総回答数'] !== undefined) {
      const totalQuestions = getTotalActiveQuestions();
      const completionRate = totalQuestions > 0 ? 
        Math.round((updateData['総回答数'] / totalQuestions) * 100) : 0;
      updateData['完了率（%）'] = completionRate;
    }
    
    if (options.autoTimestamp !== false) {
      updateData['更新日時'] = new Date();
    }
    
    if (userRowIndex === -1) {
      const newRow = new Array(headers.length).fill('');
      newRow[0] = userId;
      newRow[headers.indexOf('開始日時')] = new Date();
      newRow[headers.indexOf('ヒアリング状態')] = 'in_progress';
      newRow[headers.indexOf('現在ステップ')] = 1;
      newRow[headers.indexOf('総回答数')] = 0;
      newRow[headers.indexOf('完了率（%）')] = 0;
      newRow[headers.indexOf('中断回数')] = 0;
      
      userRowIndex = data.length;
      sheet.appendRow(newRow);
    }
    
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
 * ユーザーの配信可否状態をチェック
 * 
 * @param {string} userId ユーザーID
 * @returns {Object} 配信制御情報
 */
function getDeliveryControlStatus(userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
    
    return { deliveryEnabled: true, reason: '未登録' };
    
  } catch (error) {
    Logger.log(`❌ 配信制御確認エラー: ${error.message}`);
    return { deliveryEnabled: true, reason: 'エラー' };
  }
}

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

/**
 * AI例文生成ログ記録
 * 
 * @param {string} userId ユーザーID
 * @param {Object} generationData 生成データ
 * @returns {Object} 記録結果
 */
function logAIExampleGeneration(userId, generationData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.ANSWERS);
    
    if (!sheet) {
      return { success: false, error: 'シートなし' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const recordIdIndex = headers.indexOf('記録ID');
    const aiExampleIndex = headers.indexOf('AI例文');
    
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.AREA_MANAGEMENT);
    
    if (!sheet) {
      return { success: false, error: 'エリア管理シートなし' };
    }
    
    const areaId = `AREA_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date();
    
    const addressParts = selectedAddress.split(' ');
    const prefecture = addressParts[0] || '';
    const city = addressParts[1] || '';
    
    const newRecord = [
      areaId,
      userId,
      prefecture,
      city,
      selectedAddress,
      '',
      '',
      '',
      '住所選択',
      timestamp,
      '確定',
      JSON.stringify(candidates),
      'TRUE',
      JSON.stringify({
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
 * AIテンプレートの動的生成
 * 
 * @param {Object} context コンテキスト情報
 * @returns {Object} 生成されたプロンプト
 */
function generateDynamicAIPrompt(context) {
  try {
    const { stepNumber, questionId, userAnswer, userHistory } = context;
    
    const template = getAITemplate(stepNumber, questionId);
    if (!template) {
      return { success: false, error: 'テンプレートなし' };
    }
    
    let systemPrompt = template['システムプロンプト'];
    let userPrompt = template['ユーザープロンプトテンプレート'];
    
    if (userHistory && userHistory.length > 0) {
      const recentAnswers = userHistory.slice(-3).map(h => h['回答内容']).join('、');
      systemPrompt += `\n\nユーザーの最近の回答傾向: ${recentAnswers}`;
    }
    
    userPrompt = userPrompt
      .replace('{answer}', userAnswer)
      .replace('{questionId}', questionId)
      .replace('{stepNumber}', stepNumber);
    
    return {
      success: true,
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      templateId: template['テンプレートID']
    };
    
  } catch (error) {
    Logger.log(`❌ 動的プロンプト生成エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * ヒアリング完了率統計
 * 
 * @returns {Object} 統計データ
 */
function getHearingCompletionStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
 * ヘルパー機能のテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testFranchiseHearingHelpers() {
  Logger.log('🧪 加盟店ヒアリングヘルパー機能テスト開始');
  
  try {
    const testResults = [];
    
    Logger.log('--- 質問検索テスト ---');
    try {
      const questions = findQuestionsByCriteria({ 'ステータス': 'アクティブ' });
      testResults.push({
        name: '質問検索',
        success: Array.isArray(questions),
        details: `${questions.length}件の質問を取得`
      });
    } catch (e) {
      testResults.push({
        name: '質問検索',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    Logger.log('--- 総質問数取得テスト ---');
    try {
      const totalQuestions = getTotalActiveQuestions();
      testResults.push({
        name: '総質問数取得',
        success: typeof totalQuestions === 'number',
        details: `${totalQuestions}件の質問`
      });
    } catch (e) {
      testResults.push({
        name: '総質問数取得',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    Logger.log('--- 完了率統計テスト ---');
    try {
      const stats = getHearingCompletionStats();
      testResults.push({
        name: '完了率統計',
        success: !stats.error,
        details: stats.error || `${stats.totalUsers}人のユーザー統計`
      });
    } catch (e) {
      testResults.push({
        name: '完了率統計',
        success: false,
        details: `エラー: ${e.message}`
      });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ ヘルパー機能テスト完了');
    
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
      testResults: testResults,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ ヘルパー機能テストエラー: ${error.message}`);
    
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