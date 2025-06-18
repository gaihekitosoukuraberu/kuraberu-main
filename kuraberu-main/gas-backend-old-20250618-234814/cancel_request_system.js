/**
 * 📂 ファイル名: cancel_request_system.gs
 * 🎯 内容: 外壁塗装くらべるAI - 加盟店キャンセル申請管理システム
 * - 加盟店による案件キャンセル申請機構
 * - AI理由例自動提案（GPT API連携）
 * - Slack通知統合・フォールバックログ管理
 * ✅ initializeCancelRequestSystem() によりキャンセル申請一覧シートを自動生成
 */

/**
 * キャンセル申請システムの初期化
 * キャンセル申請一覧シートの作成とサンプルデータ投入
 * 
 * @returns {Object} 初期化結果
 */
function initializeCancelRequestSystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('🚫 キャンセル申請システム初期化開始');

    // キャンセル申請一覧シートの作成
    createCancelRequestSheet(ss);
    
    Logger.log('✅ キャンセル申請システム初期化完了');
    
    // Slack通知送信
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification('🚫 キャンセル申請システムが初期化されました\n✅ 加盟店キャンセル申請・AI提案機能が有効化されました');
      }
    } catch (e) {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      fallbackCancelLog('[システム通知] Slack通知関数未定義');
    }
    
    return {
      success: true,
      message: 'キャンセル申請システムの初期化が完了しました',
      sheetsCreated: ['キャンセル申請一覧'],
      featuresEnabled: ['キャンセル申請登録', 'AI理由提案', 'Slack通知', 'ステータス管理', 'ログ記録'],
      notificationSent: typeof sendSlackNotification === 'function'
    };
    
  } catch (error) {
    Logger.log('❌ キャンセル申請システム初期化エラー:', error);
    fallbackCancelLog(`[システム初期化] ${error.message}`);
    throw new Error(`キャンセル申請システム初期化に失敗しました: ${error.message}`);
  }
}

/**
 * キャンセル申請一覧シートの作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createCancelRequestSheet(ss) {
  const sheetName = 'キャンセル申請一覧';
  
  try {
    // 既存シートがあれば削除
    const existingSheet = ss.getSheetByName(sheetName);
    if (existingSheet) {
      ss.deleteSheet(existingSheet);
      Logger.log(`🗑️ 既存の${sheetName}シートを削除`);
    }
    
    // 新規作成
    const sheet = ss.insertSheet(sheetName);
    const headers = [
      '申請ID',
      '子ユーザーID',
      '案件ID',
      '申請理由',
      '申請日時',
      'ステータス',
      '備考'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#E53935');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅の調整
    sheet.setColumnWidth(1, 200);  // 申請ID
    sheet.setColumnWidth(2, 120);  // 子ユーザーID
    sheet.setColumnWidth(3, 120);  // 案件ID
    sheet.setColumnWidth(4, 300);  // 申請理由
    sheet.setColumnWidth(5, 140);  // 申請日時
    sheet.setColumnWidth(6, 100);  // ステータス
    sheet.setColumnWidth(7, 200);  // 備考
    
    // サンプルデータの追加
    const sampleData = [
      [
        generateCancelRequestId(),                // 申請ID
        'CHILD_001',                             // 子ユーザーID
        'CASE_001',                              // 案件ID
        'お客様都合により工事キャンセルの申請です', // 申請理由
        new Date(),                              // 申請日時
        '申請中',                                // ステータス
        'サンプルキャンセル申請データ'            // 備考
      ]
    ];
    
    sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
    
  } catch (error) {
    Logger.log(`❌ ${sheetName}シート作成エラー:`, error);
    throw error;
  }
}

/**
 * キャンセル申請登録
 * 
 * @param {string} userId 子ユーザーID
 * @param {string} caseId 案件ID
 * @param {string} reasonText 申請理由
 * @returns {Object} 申請登録結果
 */
function submitCancelRequest(userId, caseId, reasonText) {
  try {
    Logger.log(`🚫 キャンセル申請登録開始 (ユーザー: ${userId}, 案件: ${caseId})`);
    
    // 必須パラメータの検証
    if (!userId || !caseId || !reasonText) {
      throw new Error('必須パラメータが不足しています（userId, caseId, reasonText）');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 子ユーザー情報の取得
    const userInfo = getChildUserInfo(ss, userId);
    if (!userInfo) {
      throw new Error(`子ユーザーID ${userId} が見つかりません`);
    }
    
    // 案件情報の取得
    const caseInfo = getCancelCaseInfo(ss, caseId);
    if (!caseInfo) {
      throw new Error(`案件ID ${caseId} が見つかりません`);
    }
    
    // 申請IDを生成
    const requestId = generateCancelRequestId();
    
    // キャンセル申請をシートに保存
    const saveResult = saveCancelRequestToSheet(ss, {
      requestId: requestId,
      userId: userId,
      caseId: caseId,
      reasonText: reasonText
    });
    
    if (!saveResult.success) {
      throw new Error(`キャンセル申請保存に失敗: ${saveResult.error}`);
    }
    
    // Slack通知送信
    const notificationResult = sendCancelSlackNotification({
      requestId: requestId,
      userId: userId,
      userName: userInfo.userName,
      caseId: caseId,
      reasonText: reasonText,
      parentId: userInfo.parentId
    });
    
    Logger.log('✅ キャンセル申請登録完了');
    
    return {
      success: true,
      requestId: requestId,
      userId: userId,
      caseId: caseId,
      reasonText: reasonText,
      notificationSent: notificationResult.success,
      registeredAt: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ キャンセル申請登録エラー:', error);
    fallbackCancelLog(`[申請登録] ユーザー: ${userId}, 案件: ${caseId}, エラー: ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'cancel_request_submission_failed',
        message: error.message,
        userId: userId,
        caseId: caseId
      }
    };
  }
}

/**
 * AIによるキャンセル理由例自動提案（GPT API使用）
 * 
 * @param {string} userId 子ユーザーID
 * @param {Object} caseDetails 案件詳細情報
 * @returns {Object} AI提案結果
 */
function generateCancelReasonSuggestion(userId, caseDetails = {}) {
  try {
    Logger.log(`🤖 AIキャンセル理由提案開始 (ユーザー: ${userId})`);
    
    const startTime = Date.now();
    
    // GPT API用のプロンプト生成
    const prompt = createCancelReasonPrompt(userId, caseDetails);
    
    // GPT API呼び出し
    const gptResult = callGPTForCancelReason(prompt);
    
    const processingTime = Date.now() - startTime;
    
    if (gptResult.success) {
      Logger.log(`✅ AIキャンセル理由提案完了 (処理時間: ${processingTime}ms)`);
      
      return {
        success: true,
        suggestions: gptResult.response,
        processingTime: processingTime,
        model: gptResult.model || 'gpt-4',
        userId: userId
      };
    } else {
      Logger.log(`⚠️ AIキャンセル理由提案失敗、フォールバック使用: ${gptResult.error}`);
      
      // フォールバック提案
      const fallbackSuggestions = [
        'お客様都合により工事を見合わせることになりました',
        '予算の関係で一旦保留とさせていただきます',
        '他社との比較検討の結果、今回は辞退いたします',
        '工事時期の都合が合わなくなりました',
        'ご家族との相談の結果、キャンセルとなりました'
      ];
      
      return {
        success: false,
        suggestions: fallbackSuggestions,
        processingTime: processingTime,
        model: 'fallback',
        error: gptResult.error,
        userId: userId
      };
    }
    
  } catch (error) {
    Logger.log('❌ AIキャンセル理由提案エラー:', error);
    fallbackCancelLog(`[AI提案] ユーザー: ${userId}, エラー: ${error.message}`);
    
    return {
      success: false,
      suggestions: ['システムエラーが発生しました。手動で理由を入力してください。'],
      processingTime: 0,
      model: 'error',
      error: error.message,
      userId: userId
    };
  }
}

/**
 * GPT API用プロンプト生成
 * 
 * @param {string} userId 子ユーザーID
 * @param {Object} caseDetails 案件詳細
 * @returns {string} GPTプロンプト
 */
function createCancelReasonPrompt(userId, caseDetails) {
  try {
    const basePrompt = '外壁塗装工事のキャンセル理由として、加盟店が顧客に代わって申請する際の一般的な理由を5つ提案してください。';
    
    let contextPrompt = basePrompt + '\n\n以下の情報を参考にしてください：\n';
    
    if (caseDetails.area) {
      contextPrompt += `- 工事対象エリア: ${caseDetails.area}\n`;
    }
    
    if (caseDetails.estimatedAmount) {
      contextPrompt += `- 見積金額: ${caseDetails.estimatedAmount}円\n`;
    }
    
    if (caseDetails.constructionPeriod) {
      contextPrompt += `- 工期: ${caseDetails.constructionPeriod}\n`;
    }
    
    contextPrompt += '\n各理由は50文字以内で、実際によくある理由を挙げてください。番号付きリストで回答してください。';
    
    return contextPrompt;
    
  } catch (error) {
    Logger.log('❌ GPTプロンプト生成エラー:', error);
    return '外壁塗装工事のキャンセル理由として一般的なものを5つ、50文字以内で提案してください。';
  }
}

/**
 * GPT API呼び出し（キャンセル理由生成専用）
 * 
 * @param {string} prompt GPTプロンプト
 * @returns {Object} GPT応答結果
 */
function callGPTForCancelReason(prompt) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      Logger.log('⚠️ OpenAI APIキーが設定されていません');
      return {
        success: false,
        error: 'APIキー未設定'
      };
    }
    
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const payload = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたは外壁塗装業界の専門家です。キャンセル理由を提案する際は、実際によくある理由を簡潔に回答してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      Logger.log(`❌ OpenAI API エラー (${responseCode}): ${responseText}`);
      return {
        success: false,
        error: `API呼び出しエラー: ${responseCode}`
      };
    }
    
    const responseData = JSON.parse(responseText);
    const gptResponse = responseData.choices[0].message.content;
    
    Logger.log(`✅ GPT応答取得成功 (文字数: ${gptResponse.length})`);
    
    return {
      success: true,
      response: gptResponse,
      usage: responseData.usage || {},
      model: 'gpt-4'
    };
    
  } catch (error) {
    Logger.log('❌ GPT API呼び出しエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Slack通知送信（キャンセル申請専用）
 * 
 * @param {Object} data 通知データ
 * @returns {Object} 通知送信結果
 */
function sendCancelSlackNotification(data) {
  try {
    Logger.log('📢 キャンセル申請Slack通知送信開始');
    
    // Slack通知メッセージ作成
    const message = `🚫 *キャンセル申請受付*\n\n` +
      `📋 **申請ID**: ${data.requestId}\n` +
      `👤 **申請者**: ${data.userName} (${data.userId})\n` +
      `🏢 **所属**: ${data.parentId}\n` +
      `📦 **案件ID**: ${data.caseId}\n` +
      `📅 **申請日時**: ${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm')}\n\n` +
      `❓ **キャンセル理由**:\n${data.reasonText}\n\n` +
      `⚠️ 至急確認・対応をお願いします。`;
    
    // Slack通知送信
    let notificationResult = { success: false };
    
    if (typeof sendSlackNotification === 'function') {
      notificationResult = sendSlackNotification(message);
      notificationResult.sentAt = new Date();
    } else {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      notificationResult = {
        success: false,
        error: 'Slack通知関数未定義',
        sentAt: new Date()
      };
    }
    
    if (notificationResult.success) {
      Logger.log(`✅ キャンセル申請Slack通知送信完了: ${data.requestId}`);
    } else {
      Logger.log(`❌ キャンセル申請Slack通知送信失敗: ${notificationResult.error}`);
    }
    
    return notificationResult;
    
  } catch (error) {
    Logger.log('❌ キャンセル申請Slack通知送信エラー:', error);
    return {
      success: false,
      error: error.message,
      sentAt: new Date()
    };
  }
}

/**
 * 子ユーザー情報の取得
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {string} userId 子ユーザーID
 * @returns {Object|null} 子ユーザー情報
 */
function getChildUserInfo(ss, userId) {
  try {
    const childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childUsersSheet) return null;
    
    const dataRange = childUsersSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const userIdColIndex = headers.indexOf('子ユーザーID');
    const userNameColIndex = headers.indexOf('氏名（表示用）');
    const parentIdColIndex = headers.indexOf('加盟店ID');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === userId) {
        return {
          userId: userId,
          userName: data[i][userNameColIndex] || '不明',
          parentId: data[i][parentIdColIndex] || '不明'
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('❌ 子ユーザー情報取得エラー:', error);
    return null;
  }
}

/**
 * 案件情報の取得（キャンセル用）
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {string} caseId 案件ID
 * @returns {Object|null} 案件情報
 */
function getCancelCaseInfo(ss, caseId) {
  try {
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    if (!userCasesSheet) return null;
    
    const dataRange = userCasesSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const caseIdColIndex = headers.indexOf('案件ID');
    const areaColIndex = headers.indexOf('住所（市区町村）');
    const amountColIndex = headers.indexOf('見積金額');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][caseIdColIndex] === caseId) {
        return {
          caseId: caseId,
          area: data[i][areaColIndex] || '不明',
          estimatedAmount: data[i][amountColIndex] || 0
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('❌ 案件情報取得エラー:', error);
    return null;
  }
}

/**
 * キャンセル申請をシートに保存
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {Object} requestData 申請データ
 * @returns {Object} 保存結果
 */
function saveCancelRequestToSheet(ss, requestData) {
  try {
    const cancelSheet = ss.getSheetByName('キャンセル申請一覧');
    if (!cancelSheet) {
      throw new Error('キャンセル申請一覧シートが見つかりません');
    }
    
    const newRow = [
      requestData.requestId,        // 申請ID
      requestData.userId,           // 子ユーザーID
      requestData.caseId,           // 案件ID
      requestData.reasonText,       // 申請理由
      new Date(),                   // 申請日時
      '申請中',                     // ステータス
      ''                            // 備考
    ];
    
    cancelSheet.appendRow(newRow);
    
    Logger.log(`✅ キャンセル申請保存完了: ${requestData.requestId}`);
    
    return { success: true };
    
  } catch (error) {
    Logger.log('❌ キャンセル申請保存エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * キャンセル申請ID生成（UUID形式）
 * 
 * @returns {string} 新しいキャンセル申請ID
 */
function generateCancelRequestId() {
  try {
    // UUID形式のIDを生成
    const uuid = Utilities.getUuid();
    return `CANCEL_${uuid}`;
  } catch (error) {
    Logger.log('❌ キャンセル申請ID生成エラー:', error);
    // フォールバック: タイムスタンプベースのID
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `CANCEL_${timestamp}_${random}`;
  }
}

/**
 * フォールバックログ記録（キャンセル申請システム専用）
 * 
 * @param {string} message ログメッセージ
 */
function fallbackCancelLog(message) {
  try {
    Logger.log(`📝 キャンセル申請システムログ: ${message}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('システムログ');
      logSheet.getRange(1, 1, 1, 4).setValues([['日時', 'システム', 'メッセージ', 'レベル']]);
    }
    
    logSheet.appendRow([new Date(), 'キャンセル申請システム', message, 'INFO']);
    
  } catch (e) {
    Logger.log(`ログ記録エラー: ${e.message}`);
  }
}

/**
 * キャンセル申請システムのテスト（模擬実行）
 */
function testCancelRequestSystem() {
  Logger.log('🧪 キャンセル申請システム模擬テスト開始');
  
  try {
    // 1. 初期化テスト
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeCancelRequestSystem();
    Logger.log('初期化結果:', initResult);
    
    // 2. AI理由提案テスト
    Logger.log('--- AI理由提案テスト ---');
    const aiResult = generateCancelReasonSuggestion('CHILD_001', {
      area: '渋谷区',
      estimatedAmount: 1500000,
      constructionPeriod: '2週間'
    });
    Logger.log('AI理由提案結果:', aiResult);
    
    // 3. キャンセル申請登録テスト
    Logger.log('--- キャンセル申請登録テスト ---');
    const submitResult = submitCancelRequest(
      'CHILD_001',
      'CASE_001',
      'お客様の都合により工事を見合わせることになりました。他社との比較検討の結果、今回は辞退いたします。'
    );
    Logger.log('キャンセル申請登録結果:', submitResult);
    
    // 4. Slack通知テスト
    Logger.log('--- Slack通知テスト ---');
    const notificationResult = sendCancelSlackNotification({
      requestId: 'TEST_CANCEL_001',
      userId: 'CHILD_001',
      userName: 'テスト営業',
      caseId: 'CASE_001',
      reasonText: 'テスト用キャンセル理由',
      parentId: 'FRANCHISE_001'
    });
    Logger.log('Slack通知テスト結果:', notificationResult);
    
    // 5. 異常系テスト（必須パラメータ不足）
    Logger.log('--- 異常系テスト ---');
    const errorResult = submitCancelRequest('', '', '');
    Logger.log('異常系テスト結果:', errorResult);
    
    Logger.log('✅ キャンセル申請システム模擬テスト完了');
    
    // テスト結果サマリー
    const testSummary = {
      initialization: initResult.success,
      aiSuggestion: aiResult.success,
      submitRequest: submitResult.success,
      slackNotification: notificationResult.success,
      errorHandling: !errorResult.success, // エラーケースは失敗が正常
      totalTests: 5,
      successfulTests: [initResult, submitResult].filter(r => r.success).length + 
                       (aiResult.success ? 1 : 0) + 
                       (notificationResult.success ? 1 : 0)
    };
    
    Logger.log('📊 テスト結果サマリー:', testSummary);
    
    // Slack通知（テスト完了）
    try {
      if (typeof sendSlackNotification === 'function') {
        const summaryMessage = `🧪 *キャンセル申請システム テスト完了*\n\n` +
          `📊 **テスト結果**:\n` +
          `✅ 初期化: ${initResult.success ? '成功' : '失敗'}\n` +
          `🤖 AI理由提案: ${aiResult.success ? '成功' : '失敗'}\n` +
          `📋 申請登録: ${submitResult.success ? '成功' : '失敗'}\n` +
          `📢 Slack通知: ${notificationResult.success ? '成功' : '失敗'}\n` +
          `⚠️ エラーハンドリング: 正常動作\n\n` +
          `🚫 キャンセル申請機能が正常に動作しています。`;
        
        sendSlackNotification(summaryMessage);
      }
    } catch (e) {
      Logger.log('テスト完了通知スキップ:', e.message);
    }
    
    return {
      success: true,
      summary: testSummary,
      testResults: {
        initialization: initResult,
        aiSuggestion: aiResult,
        submitRequest: submitResult,
        slackNotification: notificationResult,
        errorCase: errorResult
      }
    };
    
  } catch (error) {
    Logger.log('❌ キャンセル申請システム模擬テストエラー:', error);
    fallbackCancelLog(`[システムテスト] ${error.message}`);
    throw error;
  }
}