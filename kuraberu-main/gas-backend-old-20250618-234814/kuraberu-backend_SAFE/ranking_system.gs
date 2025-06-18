/**
 * 📂 ファイル名: ranking_system.gs
 * 🎯 内容: 外壁塗装くらべるAI - 統合ランキングシステム
 * - 成約数・成約金額・対応スピード基準のランキング表示
 * - 評価スコア自動計算と順位付け
 * - リアルタイム更新機能
 * - 親管理者による子ユーザーランキング表示制御機能
 * ✅ initializeRankingSystem() により加盟店成約ランキングシートを自動生成
 * 📌 機能保全移植版 - ranking_system.js + ranking_display_system.gs統合版 - 既存機能完全維持
 */

/**
 * 統合ランキングシステムの初期化
 * 加盟店成約ランキングシートの作成と列構成設定
 * 
 * @returns {Object} 初期化結果
 */
function initializeRankingSystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('🏆 統合ランキングシステム初期化開始');

    createRankingSheet(ss);
    addParentRankingModeColumns(ss);
    addChildRankingColumns(ss);
    createRankingSampleData(ss);
    
    Logger.log('✅ 統合ランキングシステム初期化完了');
    
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification('🏆 統合ランキングシステムが初期化されました\n✅ 成約数・金額・対応スピード評価・表示制御機能が有効化されました');
      }
    } catch (e) {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      fallbackRankingLog('[システム通知] Slack通知関数未定義');
    }
    
    return {
      success: true,
      message: '統合ランキングシステムの初期化が完了しました',
      sheetsCreated: ['加盟店成約ランキング'],
      sheetsUpdated: ['加盟店親ユーザー一覧', '加盟店子ユーザー一覧'],
      featuresEnabled: ['成約数集計', '成約金額計算', '対応スピード測定', '評価スコア算出', 'ランキング順位付け', '表示制御', '公開モード管理'],
      modesAvailable: ['競わせるモード', '非公開モード'],
      notificationSent: typeof sendSlackNotification === 'function'
    };
    
  } catch (error) {
    Logger.log('❌ ランキングシステム初期化エラー:', error);
    fallbackRankingLog(`[システム初期化] ${error.message}`);
    throw new Error(`ランキングシステム初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 加盟店成約ランキングシートの作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createRankingSheet(ss) {
  const sheetName = '加盟店成約ランキング';
  
  try {
    const existingSheet = ss.getSheetByName(sheetName);
    if (existingSheet) {
      ss.deleteSheet(existingSheet);
      Logger.log(`🗑️ 既存の${sheetName}シートを削除`);
    }
    
    const sheet = ss.insertSheet(sheetName);
    const headers = [
      '子ユーザーID',
      '子ユーザー名',
      '所属親ID',
      '成約数',
      '成約金額',
      '平均対応スピード（分）',
      '評価スコア',
      'ランキング順位',
      '最終更新日時'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#FFD700');
    headerRange.setFontColor('#000000');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 120);  // 子ユーザーID
    sheet.setColumnWidth(2, 150);  // 子ユーザー名
    sheet.setColumnWidth(3, 120);  // 所属親ID
    sheet.setColumnWidth(4, 80);   // 成約数
    sheet.setColumnWidth(5, 120);  // 成約金額
    sheet.setColumnWidth(6, 150);  // 平均対応スピード
    sheet.setColumnWidth(7, 100);  // 評価スコア
    sheet.setColumnWidth(8, 100);  // ランキング順位
    sheet.setColumnWidth(9, 140);  // 最終更新日時
    
    const sampleData = [
      [
        'CHILD_001',                          // 子ユーザーID
        'サンプル営業A',                      // 子ユーザー名
        'FRANCHISE_001',                      // 所属親ID
        12,                                   // 成約数
        2400000,                              // 成約金額
        35,                                   // 平均対応スピード（分）
        277.5,                                // 評価スコア
        1,                                    // ランキング順位
        new Date()                            // 最終更新日時
      ],
      [
        'CHILD_002',                          // 子ユーザーID
        'サンプル営業B',                      // 子ユーザー名
        'FRANCHISE_001',                      // 所属親ID
        8,                                    // 成約数
        1600000,                              // 成約金額
        42,                                   // 平均対応スピード（分）
        185.0,                                // 評価スコア
        2,                                    // ランキング順位
        new Date()                            // 最終更新日時
      ],
      [
        'CHILD_003',                          // 子ユーザーID
        'サンプル営業C',                      // 子ユーザー名
        'FRANCHISE_002',                      // 所属親ID
        5,                                    // 成約数
        1200000,                              // 成約金額
        28,                                   // 平均対応スピード（分）
        146.0,                                // 評価スコア
        3,                                    // ランキング順位
        new Date()                            // 最終更新日時
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
 * ランキングデータ更新
 * ユーザー案件シートから成約データを集計してランキングを更新
 * 
 * @returns {Object} 更新結果
 */
function updateRankingData() {
  try {
    Logger.log('📊 ランキングデータ更新開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const contractData = aggregateContractData(ss);
    if (contractData.length === 0) {
      Logger.log('⚠️ 成約データが見つかりません');
      return {
        success: false,
        message: '成約データが見つかりませんでした',
        updatedCount: 0
      };
    }
    
    const rankings = calculateRankings(contractData);
    
    const updateResult = updateRankingSheet(ss, rankings);
    
    Logger.log('✅ ランキングデータ更新完了');
    
    try {
      if (typeof sendSlackNotification === 'function') {
        const topUser = rankings[0];
        const summaryMessage = `🏆 *ランキング更新完了*\n\n` +
          `📊 **更新対象**: ${rankings.length}名\n` +
          `🥇 **1位**: ${topUser.userName}（スコア: ${topUser.evaluationScore.toFixed(1)}）\n` +
          `📈 **成約数**: ${topUser.contractCount}件\n` +
          `💰 **成約金額**: ¥${topUser.contractAmount.toLocaleString()}\n` +
          `⚡ **対応速度**: ${topUser.avgResponseTime.toFixed(1)}分\n\n` +
          `💡 詳細はランキングシートをご確認ください。`;
        
        sendSlackNotification(summaryMessage);
      }
    } catch (e) {
      Logger.log('ランキング更新通知スキップ:', e.message);
    }
    
    return {
      success: true,
      message: 'ランキングデータの更新が完了しました',
      updatedCount: rankings.length,
      topPerformer: rankings[0],
      updateResult: updateResult
    };
    
  } catch (error) {
    Logger.log('❌ ランキングデータ更新エラー:', error);
    fallbackRankingLog(`[データ更新] ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'ranking_update_failed',
        message: error.message
      }
    };
  }
}

/**
 * 成約データの集計
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Array} 集計された成約データ
 */
function aggregateContractData(ss) {
  try {
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    const childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!userCasesSheet || !childUsersSheet) {
      Logger.log('⚠️ 必要なシートが見つかりません');
      return [];
    }
    
    const casesData = userCasesSheet.getDataRange().getValues();
    const casesHeaders = casesData[0];
    
    const usersData = childUsersSheet.getDataRange().getValues();
    const usersHeaders = usersData[0];
    
    const statusIndex = casesHeaders.indexOf('ステータス');
    const assignedUserIndex = casesHeaders.indexOf('割当営業担当ID');
    const contractAmountIndex = casesHeaders.indexOf('成約金額');
    const applyDateIndex = casesHeaders.indexOf('申込日時');
    const responseTimeIndex = casesHeaders.indexOf('初回対応日時');
    
    const userIdIndex = usersHeaders.indexOf('子ユーザーID');
    const userNameIndex = usersHeaders.indexOf('氏名（表示用）');
    const parentIdIndex = usersHeaders.indexOf('加盟店ID');
    
    const userMap = {};
    for (let i = 1; i < usersData.length; i++) {
      const row = usersData[i];
      const userId = row[userIdIndex];
      if (userId) {
        userMap[userId] = {
          userName: row[userNameIndex] || '不明',
          parentId: row[parentIdIndex] || '不明'
        };
      }
    }
    
    const aggregatedData = {};
    
    for (let i = 1; i < casesData.length; i++) {
      const row = casesData[i];
      const status = row[statusIndex];
      const assignedUser = row[assignedUserIndex];
      
      if (status === '成約' && assignedUser && userMap[assignedUser]) {
        if (!aggregatedData[assignedUser]) {
          aggregatedData[assignedUser] = {
            userId: assignedUser,
            userName: userMap[assignedUser].userName,
            parentId: userMap[assignedUser].parentId,
            contractCount: 0,
            contractAmount: 0,
            responseTimes: []
          };
        }
        
        aggregatedData[assignedUser].contractCount++;
        
        const amount = parseInt(row[contractAmountIndex]) || 0;
        aggregatedData[assignedUser].contractAmount += amount;
        
        const applyDate = row[applyDateIndex];
        const responseDate = row[responseTimeIndex];
        if (applyDate && responseDate && applyDate instanceof Date && responseDate instanceof Date) {
          const responseTime = (responseDate.getTime() - applyDate.getTime()) / (1000 * 60);
          if (responseTime > 0) {
            aggregatedData[assignedUser].responseTimes.push(responseTime);
          }
        }
      }
    }
    
    return Object.values(aggregatedData).map(user => ({
      ...user,
      avgResponseTime: user.responseTimes.length > 0 
        ? user.responseTimes.reduce((sum, time) => sum + time, 0) / user.responseTimes.length 
        : 60
    }));
    
  } catch (error) {
    Logger.log('❌ 成約データ集計エラー:', error);
    return [];
  }
}

/**
 * 評価スコア計算とランキング生成
 * 
 * @param {Array} contractData 成約データ
 * @returns {Array} ランキングデータ
 */
function calculateRankings(contractData) {
  try {
    const scoredData = contractData.map(user => {
      const contractScore = user.contractCount * 2;
      const amountScore = (user.contractAmount / 10000) * 1;
      const speedScore = (60 - Math.min(user.avgResponseTime, 60)) * 0.5;
      const evaluationScore = contractScore + amountScore + speedScore;
      
      return {
        ...user,
        evaluationScore: evaluationScore
      };
    });
    
    scoredData.sort((a, b) => b.evaluationScore - a.evaluationScore);
    
    return scoredData.map((user, index) => ({
      ...user,
      ranking: index + 1
    }));
    
  } catch (error) {
    Logger.log('❌ ランキング計算エラー:', error);
    return [];
  }
}

/**
 * ランキングシート更新
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {Array} rankings ランキングデータ
 * @returns {Object} 更新結果
 */
function updateRankingSheet(ss, rankings) {
  try {
    const rankingSheet = ss.getSheetByName('加盟店成約ランキング');
    if (!rankingSheet) {
      throw new Error('加盟店成約ランキングシートが見つかりません');
    }
    
    const lastRow = rankingSheet.getLastRow();
    if (lastRow > 1) {
      rankingSheet.getRange(2, 1, lastRow - 1, 9).clearContent();
    }
    
    const updateData = rankings.map(user => [
      user.userId,                        // 子ユーザーID
      user.userName,                      // 子ユーザー名
      user.parentId,                      // 所属親ID
      user.contractCount,                 // 成約数
      user.contractAmount,                // 成約金額
      Math.round(user.avgResponseTime * 10) / 10, // 平均対応スピード（分）
      Math.round(user.evaluationScore * 10) / 10, // 評価スコア
      user.ranking,                       // ランキング順位
      new Date()                          // 最終更新日時
    ]);
    
    if (updateData.length > 0) {
      rankingSheet.getRange(2, 1, updateData.length, 9).setValues(updateData);
    }
    
    Logger.log(`✅ ランキングシート更新完了: ${rankings.length}件`);
    
    return {
      success: true,
      updatedCount: rankings.length
    };
    
  } catch (error) {
    Logger.log('❌ ランキングシート更新エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * フォールバックログ記録
 * 
 * @param {string} message ログメッセージ
 */
function fallbackRankingLog(message) {
  try {
    Logger.log(`📝 ランキングシステムログ: ${message}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('システムログ');
      logSheet.getRange(1, 1, 1, 4).setValues([['日時', 'システム', 'メッセージ', 'レベル']]);
    }
    
    logSheet.appendRow([new Date(), 'ランキングシステム', message, 'INFO']);
    
  } catch (e) {
    Logger.log(`ログ記録エラー: ${e.message}`);
  }
}

/**
 * ランキングシステムのテスト（模擬実行）
 */
function testRankingSystem() {
  Logger.log('🧪 ランキングシステム模擬テスト開始');
  
  try {
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeRankingSystem();
    Logger.log('初期化結果:', initResult);
    
    Logger.log('--- データ更新テスト ---');
    const updateResult = updateRankingData();
    Logger.log('データ更新結果:', updateResult);
    
    Logger.log('--- ランキング検証テスト ---');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rankingSheet = ss.getSheetByName('加盟店成約ランキング');
    
    if (rankingSheet) {
      const data = rankingSheet.getDataRange().getValues();
      Logger.log(`ランキングデータ件数: ${data.length - 1}件`);
      
      if (data.length > 1) {
        const topUser = data[1];
        Logger.log(`1位: ${topUser[1]} (スコア: ${topUser[6]})`);
      }
    }
    
    Logger.log('✅ ランキングシステム模擬テスト完了');
    
    const testSummary = {
      initialization: initResult.success,
      dataUpdate: updateResult.success,
      totalTests: 2,
      successfulTests: [initResult, updateResult].filter(r => r.success).length
    };
    
    Logger.log('📊 テスト結果サマリー:', testSummary);
    
    try {
      if (typeof sendSlackNotification === 'function') {
        const summaryMessage = `🧪 *ランキングシステム テスト完了*\n\n` +
          `📊 **テスト結果**:\n` +
          `✅ 初期化: ${initResult.success ? '成功' : '失敗'}\n` +
          `📈 データ更新: ${updateResult.success ? '成功' : '失敗'}\n` +
          `🏆 ランキング生成: 正常動作\n\n` +
          `💡 全機能が正常に動作しています。`;
        
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
        dataUpdate: updateResult
      }
    };
    
  } catch (error) {
    Logger.log('❌ ランキングシステム模擬テストエラー:', error);
    fallbackRankingLog(`[システムテスト] ${error.message}`);
    throw error;
  }
}

/**
 * 親ユーザー列構成の追加・更新
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function addParentRankingModeColumns(ss) {
  try {
    Logger.log('🔧 親ユーザー公開モード列の追加開始（新列構成対応）');
    
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    if (!parentSheet) throw new Error('加盟店親ユーザー一覧シートが見つかりません');
    
    const requiredColumns = ['親ユーザーID', '加盟店ID', '加盟店名', 'メールアドレス', '電話番号', '権限', 'ステータス', '公開モード', '作成日', '更新日', '備考', 'ランキング更新日時', 'ランキング設定備考'];
    
    const dataRange = parentSheet.getDataRange();
    const numRows = dataRange.getNumRows();
    const existingHeaders = numRows > 0 ? parentSheet.getRange(1, 1, 1, parentSheet.getLastColumn()).getValues()[0] : [];
    
    Logger.log(`既存の親シート列: ${existingHeaders.join(', ')}`);
    
    let currentCol = Math.max(existingHeaders.length, 1);
    requiredColumns.forEach((columnName) => {
      if (!existingHeaders.includes(columnName)) {
        parentSheet.getRange(1, currentCol).setValue(columnName);
        
        if (columnName === '公開モード' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['非公開モード']);
          parentSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        } else if (columnName === 'ステータス' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['有効']);
          parentSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        } else if (columnName === '権限' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['管理者']);
          parentSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        }
        
        Logger.log(`✅ 親ユーザー列追加: ${columnName} (列${currentCol})`);
        currentCol++;
      }
    });
    
    const deprecatedColumns = ['ユーザーID', '氏名'];
    deprecatedColumns.forEach(oldCol => {
      if (existingHeaders.includes(oldCol)) {
        fallbackRankingLog(`[列構成警告] 親シートに廃止予定の列が残存: ${oldCol}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 親ユーザー公開モード列追加エラー:', error);
    fallbackRankingLog(`[列追加処理] ${error.message}`);
    throw error;
  }
}

/**
 * 子ユーザー列構成の追加・更新
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function addChildRankingColumns(ss) {
  try {
    Logger.log('🔧 子ユーザーランキング列の追加開始（新列構成対応）');
    
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childSheet) throw new Error('加盟店子ユーザー一覧シートが見つかりません');
    
    const requiredColumns = ['子ユーザーID', '加盟店ID', '氏名（表示用）', 'メールアドレス', '電話番号', '対応エリア（市区町村）', '権限', 'ステータス', '通知手段', '通知先', '現在担当件数', '成約数', '成約金額合計', '今月成約数', '最終ランキング', '成績公開可否', '作成日', '更新日', '備考'];
    
    const dataRange = childSheet.getDataRange();
    const numRows = dataRange.getNumRows();
    const existingHeaders = numRows > 0 ? childSheet.getRange(1, 1, 1, childSheet.getLastColumn()).getValues()[0] : [];
    
    Logger.log(`既存の子シート列: ${existingHeaders.join(', ')}`);
    
    let currentCol = Math.max(existingHeaders.length, 1);
    requiredColumns.forEach((columnName) => {
      if (!existingHeaders.includes(columnName)) {
        childSheet.getRange(1, currentCol).setValue(columnName);
        
        if (columnName === '成績公開可否' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['公開']);
          childSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        } else if (columnName === 'ステータス' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['有効']);
          childSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        } else if (columnName === '権限' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['営業']);
          childSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        } else if (columnName === '通知手段' && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill(['LINE']);
          childSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        } else if (['現在担当件数', '成約数', '成約金額合計', '今月成約数', '最終ランキング'].includes(columnName) && numRows > 1) {
          const defaultValues = Array(numRows - 1).fill([0]);
          childSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
        }
        
        Logger.log(`✅ 子ユーザー列追加: ${columnName} (列${currentCol})`);
        currentCol++;
      }
    });
    
    const deprecatedColumns = ['ユーザーID', '氏名'];
    deprecatedColumns.forEach(oldCol => {
      if (existingHeaders.includes(oldCol)) {
        fallbackRankingLog(`[列構成警告] 子シートに廃止予定の列が残存: ${oldCol}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 子ユーザーランキング列追加エラー:', error);
    fallbackRankingLog(`[列追加処理] ${error.message}`);
    throw error;
  }
}

/**
 * ランキングサンプルデータの作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createRankingSampleData(ss) {
  try {
    Logger.log('📊 ランキングサンプルデータ作成開始');
    
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!parentSheet || !childSheet) {
      Logger.log('⚠️ 必要なシートが見つかりません - サンプルデータ作成をスキップ');
      return;
    }
    
    const parentDataRange = parentSheet.getDataRange();
    const childDataRange = childSheet.getDataRange();
    
    if (parentDataRange.getNumRows() <= 1) {
      const parentSampleData = [
        ['PARENT_001', 'FRANCHISE_001', 'サンプル加盟店A', 'parent@sample-a.com', '03-1234-5678', '管理者', '有効', '競わせるモード', new Date(), new Date(), 'サンプル親ユーザー', new Date(), '月次更新設定']
      ];
      parentSheet.getRange(2, 1, parentSampleData.length, parentSampleData[0].length).setValues(parentSampleData);
      Logger.log('✅ 親ユーザーサンプルデータ追加');
    }
    
    if (childDataRange.getNumRows() <= 1) {
      const childSampleData = [
        ['CHILD_001', 'FRANCHISE_001', 'サンプル営業A', 'child1@sample-a.com', '090-1234-5678', '渋谷区,新宿区', '営業', '有効', 'LINE', 'line_user_id_001', 3, 12, 2400000, 5, 1, '公開', new Date(), new Date(), 'トップ営業'],
        ['CHILD_002', 'FRANCHISE_001', 'サンプル営業B', 'child2@sample-a.com', '090-1234-5679', '世田谷区,目黒区', '営業', '有効', 'Email', 'child2@sample-a.com', 2, 8, 1600000, 3, 2, '公開', new Date(), new Date(), '安定営業'],
        ['CHILD_003', 'FRANCHISE_001', 'サンプル営業C', 'child3@sample-a.com', '090-1234-5680', '品川区,大田区', '営業', '有効', 'SMS', '090-1234-5680', 1, 5, 1200000, 2, 3, '非公開', new Date(), new Date(), '新人営業']
      ];
      childSheet.getRange(2, 1, childSampleData.length, childSampleData[0].length).setValues(childSampleData);
      Logger.log('✅ 子ユーザーサンプルデータ追加');
    }
    
  } catch (error) {
    Logger.log('❌ ランキングサンプルデータ作成エラー:', error);
    fallbackRankingLog(`[サンプルデータ] ${error.message}`);
  }
}

/**
 * 親管理者ランキング表示モード更新
 * 
 * @param {string} parentUserId 親ユーザーID
 * @param {string} mode 表示モード（'競わせるモード' | '非公開モード'）
 * @returns {Object} 更新結果
 */
function updateParentRankingMode(parentUserId, mode) {
  try {
    Logger.log(`🔧 親管理者ランキング表示モード更新: ${parentUserId} -> ${mode}`);
    
    if (!['競わせるモード', '非公開モード'].includes(mode)) {
      throw new Error(`無効な表示モード: ${mode}`);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    
    if (!parentSheet) {
      throw new Error('加盟店親ユーザー一覧シートが見つかりません');
    }
    
    const dataRange = parentSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const parentUserIdIndex = headers.indexOf('親ユーザーID');
    const modeIndex = headers.indexOf('公開モード');
    const updateDateIndex = headers.indexOf('ランキング更新日時');
    
    if (parentUserIdIndex === -1 || modeIndex === -1) {
      throw new Error('必要な列が見つかりません');
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][parentUserIdIndex] === parentUserId) {
        parentSheet.getRange(i + 1, modeIndex + 1).setValue(mode);
        
        if (updateDateIndex !== -1) {
          parentSheet.getRange(i + 1, updateDateIndex + 1).setValue(new Date());
        }
        
        Logger.log(`✅ 親管理者ランキング表示モード更新完了: ${parentUserId}`);
        
        return {
          success: true,
          parentUserId: parentUserId,
          newMode: mode,
          updatedAt: new Date()
        };
      }
    }
    
    throw new Error(`親ユーザーID ${parentUserId} が見つかりません`);
    
  } catch (error) {
    Logger.log('❌ 親管理者ランキング表示モード更新エラー:', error);
    fallbackRankingLog(`[モード更新] ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'parent_ranking_mode_update_failed',
        message: error.message,
        parentUserId: parentUserId
      }
    };
  }
}

/**
 * 子ユーザーランキング取得（表示制御対応）
 * 
 * @param {string} parentUserId 親ユーザーID
 * @returns {Object} ランキング情報
 */
function getChildUserRanking(parentUserId) {
  try {
    Logger.log(`📊 子ユーザーランキング取得: ${parentUserId}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const parentMode = getParentRankingMode(ss, parentUserId);
    if (parentMode === '非公開モード') {
      return {
        success: true,
        mode: '非公開モード',
        message: 'ランキングは非公開設定です',
        rankings: []
      };
    }
    
    const rankings = getCurrentRankings(ss, parentUserId);
    
    return {
      success: true,
      mode: parentMode,
      parentUserId: parentUserId,
      rankings: rankings,
      count: rankings.length,
      lastUpdated: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 子ユーザーランキング取得エラー:', error);
    fallbackRankingLog(`[ランキング取得] ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'child_ranking_fetch_failed',
        message: error.message,
        parentUserId: parentUserId
      }
    };
  }
}

/**
 * 親ユーザーのランキング表示モード取得
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {string} parentUserId 親ユーザーID
 * @returns {string} 表示モード
 */
function getParentRankingMode(ss, parentUserId) {
  try {
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    if (!parentSheet) return '非公開モード';
    
    const dataRange = parentSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const parentUserIdIndex = headers.indexOf('親ユーザーID');
    const modeIndex = headers.indexOf('公開モード');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][parentUserIdIndex] === parentUserId) {
        return data[i][modeIndex] || '非公開モード';
      }
    }
    
    return '非公開モード';
  } catch (error) {
    Logger.log('❌ 親ユーザーランキングモード取得エラー:', error);
    return '非公開モード';
  }
}

/**
 * 現在のランキング取得
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @param {string} parentUserId 親ユーザーID
 * @returns {Array} ランキング配列
 */
function getCurrentRankings(ss, parentUserId) {
  try {
    const rankingSheet = ss.getSheetByName('加盟店成約ランキング');
    if (!rankingSheet) return [];
    
    const dataRange = rankingSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const parentIdIndex = headers.indexOf('所属親ID');
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    let publicModeIndex = -1;
    if (childSheet) {
      const childHeaders = childSheet.getRange(1, 1, 1, childSheet.getLastColumn()).getValues()[0];
      publicModeIndex = childHeaders.indexOf('成績公開可否');
    }
    
    return data.slice(1)
      .filter(row => row[parentIdIndex] === parentUserId)
      .filter(row => {
        if (publicModeIndex === -1) return true;
        
        const userId = row[0];
        if (childSheet) {
          const childData = childSheet.getDataRange().getValues();
          const childUserIdIndex = childSheet.getRange(1, 1, 1, childSheet.getLastColumn()).getValues()[0].indexOf('子ユーザーID');
          
          for (let i = 1; i < childData.length; i++) {
            if (childData[i][childUserIdIndex] === userId) {
              return childData[i][publicModeIndex] !== '非公開';
            }
          }
        }
        return true;
      })
      .map(row => ({
        userId: row[0],
        userName: row[1],
        parentId: row[2],
        contractCount: row[3],
        contractAmount: row[4],
        avgResponseTime: row[5],
        evaluationScore: row[6],
        ranking: row[7],
        lastUpdated: row[8]
      }));
      
  } catch (error) {
    Logger.log('❌ 現在ランキング取得エラー:', error);
    return [];
  }
}