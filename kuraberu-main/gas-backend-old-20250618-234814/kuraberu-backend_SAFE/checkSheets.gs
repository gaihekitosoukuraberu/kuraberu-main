/**
 * 📂 ファイル名: checkSheets.gs
 * 🎯 内容: 外壁塗装くらべるAI - スプレッドシート状況確認・シートクリーンアップシステム
 * - 旧システムシートの確認・削除・バックアップ機能
 * - 新システムシート（統合_）の存在確認
 * - 安全なクリーンアップ処理（データ保持優先）
 * ✅ checkAndCleanupSheets() によりシート状況確認が可能
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * スプレッドシートのシート状況確認・クリーンアップ
 * 旧システムシートの存在確認と削除対象の特定
 * 
 * @returns {Object} 確認結果
 */
function checkAndCleanupSheets() {
  try {
    Logger.log('🔍 スプレッドシートのシート確認開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    
    const deprecatedSheets = [
      '加盟店ヒアリング管理',
      '加盟店ヒアリング回答記録',
      '加盟店ヒアリング管理GPT',
      '加盟店ヒアリング回答記録GPT',
      'フロー定義',
      'ユーザー案件',
      'チャットログ',
      '加盟店子ユーザー一覧'
    ];
    
    const newSystemSheets = [
      '統合_質問リスト',
      '統合_回答記録', 
      '統合_ユーザー状態',
      '統合_配信制御',
      '統合_エリア管理',
      '統合_AI例文テンプレート'
    ];
    
    Logger.log('📋 全シート一覧:');
    allSheets.forEach(sheet => {
      Logger.log(`  - ${sheet.getName()}`);
    });
    
    Logger.log('');
    Logger.log('🗑️ 削除対象シートの確認:');
    let foundDeprecated = [];
    
    deprecatedSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const rowCount = sheet.getLastRow();
        Logger.log(`  ❌ 【削除対象】 ${sheetName} (${rowCount}行)`);
        foundDeprecated.push(sheetName);
      } else {
        Logger.log(`  ✅ 【存在しない】 ${sheetName}`);
      }
    });
    
    Logger.log('');
    Logger.log('✅ 新システムシートの確認:');
    newSystemSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        Logger.log(`  ✅ 【存在】 ${sheetName}`);
      } else {
        Logger.log(`  ⚠️ 【未作成】 ${sheetName}`);
      }
    });
    
    Logger.log('');
    Logger.log('📊 確認結果:');
    Logger.log(`  削除対象シート: ${foundDeprecated.length}個`);
    Logger.log(`  削除対象: ${foundDeprecated.join(', ')}`);
    
    if (foundDeprecated.length > 0) {
      Logger.log('');
      Logger.log('⚠️ 次のステップ:');
      Logger.log('1. 上記の削除対象シートを確認');
      Logger.log('2. 必要であれば executeCleanup() を実行して削除');
      Logger.log('3. または手動でシートを削除');
    } else {
      Logger.log('🎉 削除対象シートは存在しません！');
    }
    
    try {
      if (typeof sendSlackNotification === 'function') {
        let message = '🔍 *シート状況確認完了*\n\n';
        message += `📋 **全シート数**: ${allSheets.length}個\n`;
        message += `🗑️ **削除対象**: ${foundDeprecated.length}個\n`;
        
        if (foundDeprecated.length > 0) {
          message += `📝 **削除対象シート**:\n`;
          foundDeprecated.forEach(sheetName => {
            message += `• ${sheetName}\n`;
          });
          message += '\n⚠️ executeCleanup() で安全削除が可能です。';
        } else {
          message += '\n✅ 削除対象シートはありません。';
        }
        
        sendSlackNotification(message);
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      totalSheets: allSheets.length,
      deprecatedFound: foundDeprecated,
      newSystemSheetsStatus: newSystemSheets.map(name => ({
        name: name,
        exists: ss.getSheetByName(name) !== null
      }))
    };
    
  } catch (error) {
    Logger.log(`❌ シート確認エラー: ${error.message}`);
    return { 
      success: false,
      error: error.message 
    };
  }
}

/**
 * 実際に旧シートを削除・バックアップ
 * checkAndCleanupSheets() で確認後に実行する安全削除処理
 * 
 * @returns {Object} クリーンアップ結果
 */
function executeCleanup() {
  try {
    Logger.log('🧹 シートクリーンアップ実行開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const deprecatedSheets = [
      '加盟店ヒアリング管理',
      '加盟店ヒアリング回答記録',
      '加盟店ヒアリング管理GPT', 
      '加盟店ヒアリング回答記録GPT',
      'フロー定義',
      'ユーザー案件',
      'チャットログ',
      '加盟店子ユーザー一覧'
    ];
    
    let processedCount = 0;
    let backedUpSheets = [];
    let deletedSheets = [];
    
    deprecatedSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        
        if (data.length > 1) {
          const backupName = `${sheetName}_backup_${Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd')}`;
          sheet.setName(backupName);
          Logger.log(`📋 バックアップ: ${sheetName} → ${backupName}`);
          backedUpSheets.push(backupName);
        } else {
          ss.deleteSheet(sheet);
          Logger.log(`🗑️ 削除: ${sheetName} (データなし)`);
          deletedSheets.push(sheetName);
        }
        processedCount++;
      }
    });
    
    Logger.log(`✅ クリーンアップ完了: ${processedCount}個のシートを処理`);
    
    try {
      if (typeof sendSlackNotification === 'function') {
        let message = '🧹 *シートクリーンアップ完了*\n\n';
        message += `📊 **処理結果**: ${processedCount}個のシートを処理\n\n`;
        
        if (backedUpSheets.length > 0) {
          message += `📋 **バックアップ作成** (${backedUpSheets.length}個):\n`;
          backedUpSheets.forEach(sheetName => {
            message += `• ${sheetName}\n`;
          });
          message += '\n';
        }
        
        if (deletedSheets.length > 0) {
          message += `🗑️ **削除完了** (${deletedSheets.length}個):\n`;
          deletedSheets.forEach(sheetName => {
            message += `• ${sheetName}\n`;
          });
          message += '\n';
        }
        
        message += '✅ スプレッドシートのクリーンアップが完了しました。';
        
        sendSlackNotification(message);
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      processedCount: processedCount,
      backedUpSheets: backedUpSheets,
      deletedSheets: deletedSheets
    };
    
  } catch (error) {
    Logger.log(`❌ クリーンアップエラー: ${error.message}`);
    return { 
      success: false,
      error: error.message 
    };
  }
}

/**
 * 新システムシート初期化ガイダンス
 * 実際の初期化は franchise_hearing_bot.gs を使用
 * 
 * @returns {Object} ガイダンス情報
 */
function initializeNewSystemSheets() {
  Logger.log('🔄 新システムシート初期化は FranchiseHearingBot.gs の initializeFranchiseHearingDatabase() を使用してください');
  Logger.log('または以下の関数を個別実行:');
  Logger.log('- initializeQuestionListSheet()');
  Logger.log('- initializeAnswerRecordSheet()');
  Logger.log('- initializeUserStateSheet()');
  Logger.log('- initializeDeliveryControlSheet()');
  Logger.log('- initializeAreaManagementSheet()');
  Logger.log('- initializeAITemplateSheet()');
  
  return {
    success: true,
    message: '新システムシート初期化は franchise_hearing_bot.gs の関数を使用してください',
    recommendedFunction: 'initializeFranchiseHearingDatabase()',
    individualFunctions: [
      'initializeQuestionListSheet()',
      'initializeAnswerRecordSheet()',
      'initializeUserStateSheet()',
      'initializeDeliveryControlSheet()',
      'initializeAreaManagementSheet()',
      'initializeAITemplateSheet()'
    ]
  };
}

/**
 * シート状況確認システムのテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testSheetCheckSystem() {
  Logger.log('🧪 シート状況確認システムテスト開始');
  
  try {
    const testResults = [];
    
    Logger.log('--- シート状況確認テスト ---');
    try {
      const checkResult = checkAndCleanupSheets();
      testResults.push({ 
        name: 'シート状況確認', 
        success: checkResult.success, 
        details: `全シート: ${checkResult.totalSheets}個, 削除対象: ${checkResult.deprecatedFound ? checkResult.deprecatedFound.length : 0}個`
      });
    } catch (e) {
      testResults.push({ 
        name: 'シート状況確認', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    Logger.log('--- 新システムシート初期化ガイダンステスト ---');
    try {
      const initResult = initializeNewSystemSheets();
      testResults.push({ 
        name: '新システムシート初期化ガイダンス', 
        success: initResult.success, 
        details: 'ガイダンス表示確認'
      });
    } catch (e) {
      testResults.push({ 
        name: '新システムシート初期化ガイダンス', 
        success: false, 
        details: `エラー: ${e.message}`
      });
    }
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ シート状況確認システムテスト完了');
    
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
    Logger.log('❌ シート状況確認システムテストエラー:', error);
    
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