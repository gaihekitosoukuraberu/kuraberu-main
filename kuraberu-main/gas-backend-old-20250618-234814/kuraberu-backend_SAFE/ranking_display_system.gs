/**
 * ファイル名: ranking_display_system.gs
 * 外壁塗装くらべるAI - ランキング公開システム（新列構成対応）
 * 親管理者による子ユーザーランキング表示制御機能
 * 📌 機能保全移植版 - 既存機能完全維持
 */

function initializeRankingDisplaySystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('🎯 ランキング表示システム初期化開始（新列構成対応）');

    addParentRankingModeColumns(ss);
    addChildRankingColumns(ss);
    createRankingSampleData(ss);
    
    Logger.log('✅ ランキング表示システム初期化完了（新列構成対応）');
    
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification('🎯 ランキング表示システムが初期化されました（新列構成対応）\n✅ 親管理者による成果公開制御が利用可能です');
      }
    } catch (e) {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      fallbackLog('[システム通知] Slack通知関数未定義');
    }
    
    return {
      success: true,
      message: 'ランキング表示システムの初期化が完了しました（新列構成対応）',
      sheetsUpdated: ['加盟店親ユーザー一覧', '加盟店子ユーザー一覧'],
      modesAvailable: ['競わせるモード', '非公開モード'],
      columnSchemaUpdated: true,
      notificationSent: typeof sendSlackNotification === 'function'
    };
    
  } catch (error) {
    Logger.log('❌ ランキング表示システム初期化エラー:', error);
    fallbackLog(`[システム初期化] ${error.message}`);
    throw new Error(`ランキング表示システム初期化に失敗しました: ${error.message}`);
  }
}

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
        fallbackLog(`[列構成警告] 親シートに廃止予定の列が残存: ${oldCol}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 親ユーザー公開モード列追加エラー:', error);
    fallbackLog(`[列追加処理] ${error.message}`);
    throw error;
  }
}

function addChildRankingColumns(ss) {
  try {
    Logger.log('🔧 子ユーザーランキング列の追加開始（新列構成対応）');
    
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childSheet) throw new Error('加盟店子ユーザー一覧シートが見つかりません');
    
    const requiredColumns = ['子ユーザーID', '加盟店ID', '氏名（表示用）', 'メールアドレス', '電話番号', '権限', 'ステータス', '対応エリア（市区町村）', '通知手段', '通知先', '現在担当件数', '最終割当日時', '作成日', '更新日', '備考', '通知成功回数', '通知失敗回数', '今月成約数', '今月成約金額', '今月対応件数', '平均対応時間（分）', '成約率（%）', 'ランキング表示許可', '最終更新日時', 'パフォーマンス備考'];
    
    const dataRange = childSheet.getDataRange();
    const numRows = dataRange.getNumRows();
    const existingHeaders = numRows > 0 ? childSheet.getRange(1, 1, 1, childSheet.getLastColumn()).getValues()[0] : [];
    
    Logger.log(`既存の子シート列: ${existingHeaders.join(', ')}`);
    
    let currentCol = Math.max(existingHeaders.length, 1);
    requiredColumns.forEach((columnName) => {
      if (!existingHeaders.includes(columnName)) {
        childSheet.getRange(1, currentCol).setValue(columnName);
        
        if (numRows > 1) {
          let defaultValue = '';
          switch (columnName) {
            case 'ランキング表示許可': defaultValue = 'true'; break;
            case 'ステータス': defaultValue = '有効'; break;
            case '権限': defaultValue = '営業'; break;
            case '通知手段': defaultValue = 'LINE'; break;
            case '今月成約数': case '今月成約金額': case '今月対応件数': case '平均対応時間（分）': case '成約率（%）': case '現在担当件数': case '通知成功回数': case '通知失敗回数': defaultValue = 0; break;
          }
          
          if (defaultValue !== '') {
            const defaultValues = Array(numRows - 1).fill([defaultValue]);
            childSheet.getRange(2, currentCol, numRows - 1, 1).setValues(defaultValues);
          }
        }
        
        Logger.log(`✅ 子ユーザー列追加: ${columnName} (列${currentCol})`);
        currentCol++;
      }
    });
    
    const deprecatedColumns = ['ユーザーID', '親ユーザーID', '氏名'];
    deprecatedColumns.forEach(oldCol => {
      if (existingHeaders.includes(oldCol)) {
        fallbackLog(`[列構成警告] 子シートに廃止予定の列が残存: ${oldCol}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ 子ユーザーランキング列追加エラー:', error);
    fallbackLog(`[列追加処理] ${error.message}`);
    throw error;
  }
}

function createRankingSampleData(ss) {
  try {
    Logger.log('📊 ランキングサンプルデータ作成開始（新列構成対応）');
    
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (parentSheet && parentSheet.getDataRange().getNumRows() <= 1) {
      const parentSampleData = [
        ['PARENT_001', 'FRANCHISE_001', 'サンプル加盟店A', 'sample-a@test.com', '080-1111-1111', '管理者', '有効', '競わせるモード', new Date(), new Date(), '売上向上のため競争促進', new Date(), '売上向上のため競争促進'],
        ['PARENT_002', 'FRANCHISE_001', 'サンプル加盟店B', 'sample-b@test.com', '080-2222-2222', '管理者', '有効', '非公開モード', new Date(), new Date(), '個人情報保護重視', new Date(), '個人情報保護重視']
      ];
      
      parentSampleData.forEach((row, index) => {
        parentSheet.getRange(index + 2, 1, 1, row.length).setValues([row]);
      });
      
      Logger.log('✅ 親ユーザーサンプルデータ作成完了');
    }
    
    if (childSheet && childSheet.getDataRange().getNumRows() <= 1) {
      const childSampleData = [
        ['CHILD_001', 'FRANCHISE_001', 'サンプル営業A', 'child-a@test.com', '080-4444-4444', '営業', '有効', '渋谷区', 'LINE', 'U123456789abcdef', 2, new Date(), new Date(), new Date(), '優秀な営業担当者', 25, 2, 5, 2500000, 12, 45, 41.7, 'true', new Date(), '優秀な成績'],
        ['CHILD_002', 'FRANCHISE_001', 'サンプル営業B', 'child-b@test.com', '080-5555-5555', '営業', '有効', '世田谷区', 'SMS', '080-5555-5555', 1, new Date(), new Date(), new Date(), '対応速度重視', 18, 1, 3, 1800000, 15, 38, 20.0, 'true', new Date(), '対応速度良好'],
        ['CHILD_003', 'FRANCHISE_001', 'サンプル営業C', 'child-c@test.com', '080-6666-6666', '営業', '有効', '横浜市', 'Email', 'child-c@test.com', 3, new Date(), new Date(), new Date(), '安定した営業力', 30, 0, 7, 3200000, 18, 52, 38.9, 'true', new Date(), '成約数トップ']
      ];
      
      childSampleData.forEach((row, index) => {
        childSheet.getRange(index + 2, 1, 1, row.length).setValues([row]);
      });
      
      Logger.log('✅ 子ユーザーサンプルデータ作成完了');
    }
    
    Logger.log('✅ ランキングサンプルデータ作成完了（新列構成対応）');
    
  } catch (error) {
    Logger.log('❌ ランキングサンプルデータ作成エラー:', error);
    fallbackLog(`[サンプルデータ] ${error.message}`);
  }
}

function getColumnIndexByName(headers, columnName) {
  const index = headers.indexOf(columnName);
  if (index === -1) {
    fallbackLog(`[列構成エラー] 列が見つかりません: ${columnName}`);
  }
  return index;
}

function getParentRankingMode(ss, parentUserId) {
  try {
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    if (!parentSheet) return null;
    
    const dataRange = parentSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const userIdColIndex = getColumnIndexByName(headers, '親ユーザーID');
    const modeColIndex = getColumnIndexByName(headers, '公開モード');
    
    if (userIdColIndex === -1 || modeColIndex === -1) {
      fallbackLog(`[列構成エラー] 必要な列が見つかりません - 親ユーザーID: ${userIdColIndex}, 公開モード: ${modeColIndex}`);
      return null;
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === parentUserId) {
        return data[i][modeColIndex] || '非公開モード';
      }
    }
    
    fallbackLog(`[モード取得] 親ユーザー ${parentUserId} が見つかりません`);
    return null;
    
  } catch (error) {
    Logger.log('❌ 親ユーザーモード取得エラー:', error);
    fallbackLog(`[モード取得] ${error.message}`);
    return null;
  }
}

function getChildUserRanking(parentUserId, rankingMode = null) {
  try {
    Logger.log(`🏆 ランキング取得開始 (親ID: ${parentUserId}, モード: ${rankingMode})`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const actualMode = rankingMode || getParentRankingMode(ss, parentUserId);
    if (!actualMode) {
      throw new Error(`親ユーザー ${parentUserId} のランキング設定が見つかりません`);
    }
    
    const childData = getChildPerformanceData(ss, parentUserId, actualMode);
    const rankings = calculateRankings(childData, actualMode);
    
    Logger.log(`✅ ランキング取得完了 (${rankings.length}件)`);
    
    return {
      success: true,
      parentUserId: parentUserId,
      rankingMode: actualMode,
      rankings: rankings,
      totalUsers: rankings.length,
      generatedAt: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ ランキング取得エラー:', error);
    fallbackLog(`[ランキング取得] 親ID: ${parentUserId}, エラー: ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'ranking_generation_failed',
        parentUserId: parentUserId,
        message: error.message
      }
    };
  }
}

function getChildPerformanceData(ss, parentUserId, rankingMode) {
  try {
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childSheet) return [];
    
    const dataRange = childSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const requiredColumns = ['子ユーザーID', '加盟店ID', '氏名（表示用）', '今月成約数', '今月成約金額', '今月対応件数', '平均対応時間（分）', '成約率（%）', 'ランキング表示許可'];
    
    const columnIndices = {};
    requiredColumns.forEach(col => {
      columnIndices[col] = getColumnIndexByName(headers, col);
    });
    
    const missingColumns = requiredColumns.filter(col => columnIndices[col] === -1);
    if (missingColumns.length > 0) {
      fallbackLog(`[列構成エラー] 必要な列が見つかりません: ${missingColumns.join(', ')}`);
      throw new Error(`必要な列が見つかりません: ${missingColumns.join(', ')}`);
    }
    
    const childUsers = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      if (row[columnIndices['加盟店ID']] !== parentUserId) continue;
      
      const displayPermission = row[columnIndices['ランキング表示許可']];
      if (displayPermission !== 'true' && displayPermission !== true && displayPermission !== '表示可') continue;
      
      const userPerformance = {
        userId: row[columnIndices['子ユーザーID']],
        name: row[columnIndices['氏名（表示用）']],
        contracts: parseInt(row[columnIndices['今月成約数']]) || 0,
        amount: parseInt(row[columnIndices['今月成約金額']]) || 0,
        cases: parseInt(row[columnIndices['今月対応件数']]) || 0,
        responseTime: parseFloat(row[columnIndices['平均対応時間（分）']]) || 0,
        contractRate: parseFloat(row[columnIndices['成約率（%）']]) || 0
      };
      
      childUsers.push(userPerformance);
    }
    
    return childUsers;
    
  } catch (error) {
    Logger.log('❌ 子ユーザーデータ取得エラー:', error);
    fallbackLog(`[子データ取得] ${error.message}`);
    return [];
  }
}

function calculateRankings(childData, rankingMode) {
  try {
    if (!childData || childData.length === 0) return [];
    
    const contractRanking = [...childData].sort((a, b) => b.contracts - a.contracts);
    const amountRanking = [...childData].sort((a, b) => b.amount - a.amount);
    const rateRanking = [...childData].sort((a, b) => b.contractRate - a.contractRate);
    const speedRanking = [...childData].sort((a, b) => a.responseTime - b.responseTime);
    
    const rankings = childData.map(user => {
      const contractRank = contractRanking.findIndex(u => u.userId === user.userId) + 1;
      const amountRank = amountRanking.findIndex(u => u.userId === user.userId) + 1;
      const rateRank = rateRanking.findIndex(u => u.userId === user.userId) + 1;
      const speedRank = speedRanking.findIndex(u => u.userId === user.userId) + 1;
      
      const result = {
        userId: user.userId,
        name: user.name,
        performance: {
          contracts: user.contracts,
          amount: user.amount,
          contractRate: user.contractRate,
          responseTime: user.responseTime
        },
        rankings: {
          contracts: contractRank,
          amount: amountRank,
          rate: rateRank,
          speed: speedRank
        },
        displayMode: rankingMode
      };
      
      if (rankingMode === '非公開モード') {
        result.totalUsers = childData.length;
        result.note = '個人成績のみ表示（他ユーザー非公開）';
      } else {
        result.totalUsers = childData.length;
        result.note = '全ユーザー比較表示';
      }
      
      return result;
    });
    
    return rankings;
    
  } catch (error) {
    Logger.log('❌ ランキング計算エラー:', error);
    fallbackLog(`[ランキング計算] ${error.message}`);
    return [];
  }
}

function updateParentRankingMode(parentUserId, newMode) {
  try {
    Logger.log(`🔄 公開モード更新開始 (親ID: ${parentUserId}, 新モード: ${newMode})`);
    
    const validModes = ['競わせるモード', '非公開モード'];
    if (!validModes.includes(newMode)) {
      throw new Error(`無効な公開モード: ${newMode}`);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    if (!parentSheet) {
      throw new Error('加盟店親ユーザー一覧シートが見つかりません');
    }
    
    const dataRange = parentSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const userIdColIndex = getColumnIndexByName(headers, '親ユーザーID');
    const modeColIndex = getColumnIndexByName(headers, '公開モード');
    const updateColIndex = getColumnIndexByName(headers, 'ランキング更新日時');
    
    if (userIdColIndex === -1 || modeColIndex === -1) {
      throw new Error('必要な列が見つかりません');
    }
    
    let updated = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === parentUserId) {
        parentSheet.getRange(i + 1, modeColIndex + 1).setValue(newMode);
        if (updateColIndex !== -1) {
          parentSheet.getRange(i + 1, updateColIndex + 1).setValue(new Date());
        }
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      throw new Error(`親ユーザー ${parentUserId} が見つかりません`);
    }
    
    Logger.log('✅ 公開モード更新完了');
    
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification(`🔄 ランキング公開モード更新\n👤 親ID: ${parentUserId}\n📊 新モード: ${newMode}`);
      }
    } catch (e) {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      fallbackLog('[モード更新通知] Slack通知関数未定義');
    }
    
    return {
      success: true,
      parentUserId: parentUserId,
      previousMode: data.find(row => row[userIdColIndex] === parentUserId)?.[modeColIndex],
      newMode: newMode,
      updatedAt: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 公開モード更新エラー:', error);
    fallbackLog(`[モード更新] 親ID: ${parentUserId}, エラー: ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'mode_update_failed',
        parentUserId: parentUserId,
        requestedMode: newMode,
        message: error.message
      }
    };
  }
}

function fallbackLog(message) {
  try {
    Logger.log(`📝 フォールバックログ: ${message}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('システムログ');
      logSheet.getRange(1, 1, 1, 4).setValues([['日時', 'システム', 'メッセージ', 'レベル']]);
    }
    
    logSheet.appendRow([new Date(), 'ランキング表示', message, 'INFO']);
    
  } catch (e) {
    Logger.log(`ログ記録エラー: ${e.message}`);
  }
}

function testRankingDisplaySystem() {
  try {
    Logger.log('🧪 ランキング表示システムテスト開始（新列構成対応）');
    
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeRankingDisplaySystem();
    Logger.log('初期化結果:', initResult);
    
    Logger.log('--- 親ユーザーモード取得テスト ---');
    const testParentIds = ['PARENT_001', 'PARENT_002'];
    const modeResults = [];
    
    testParentIds.forEach(parentId => {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const mode = getParentRankingMode(ss, parentId);
      modeResults.push({ parentId, mode });
      Logger.log(`親ID ${parentId} のモード: ${mode}`);
    });
    
    Logger.log('--- 競わせるモードランキングテスト ---');
    const competitiveRanking = getChildUserRanking('FRANCHISE_001', '競わせるモード');
    Logger.log('競わせるモード結果:', competitiveRanking);
    
    Logger.log('--- 非公開モードランキングテスト ---');
    const privateRanking = getChildUserRanking('FRANCHISE_001', '非公開モード');
    Logger.log('非公開モード結果:', privateRanking);
    
    Logger.log('--- モード更新テスト ---');
    const updateTests = [
      { parentId: 'PARENT_001', newMode: '非公開モード' },
      { parentId: 'INVALID_PARENT', newMode: '競わせるモード' }
    ];
    
    const updateResults = [];
    updateTests.forEach(test => {
      const result = updateParentRankingMode(test.parentId, test.newMode);
      updateResults.push({ test, result });
      Logger.log(`モード更新テスト [${test.parentId}]:`, result);
    });
    
    const stats = {
      modeRetrievalSuccessRate: modeResults.filter(r => r.mode).length / modeResults.length * 100,
      rankingGenerationSuccessRate: [competitiveRanking, privateRanking].filter(r => r.success).length / 2 * 100,
      modeUpdateSuccessRate: updateResults.filter(r => r.result.success).length / updateResults.length * 100
    };
    
    Logger.log('📊 テスト統計:', stats);
    Logger.log('✅ ランキング表示システムテスト完了（新列構成対応）');
    
    try {
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification(`🧪 ランキング表示システムテスト完了（新列構成対応）\n📊 成功率: ${stats.rankingGenerationSuccessRate}%`);
      }
    } catch (e) {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      fallbackLog('[テスト通知] Slack通知関数未定義');
    }
    
    return {
      success: true,
      testResults: {
        initialization: initResult,
        modeRetrieval: modeResults,
        competitiveRanking: competitiveRanking,
        privateRanking: privateRanking,
        modeUpdates: updateResults,
        statistics: stats
      }
    };
    
  } catch (error) {
    Logger.log('❌ ランキング表示システムテストエラー:', error);
    fallbackLog(`[システムテスト] ${error.message}`);
    
    return {
      success: false,
      error: {
        type: 'system_test_failed',
        message: error.message
      }
    };
  }
}