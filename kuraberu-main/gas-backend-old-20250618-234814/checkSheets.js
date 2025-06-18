/**
 * スプレッドシートのシート状況確認＋クリーンアップ
 * 
 * 【実行手順】
 * 1. このコードをGASエディタにコピー
 * 2. checkAndCleanupSheets() を実行
 * 3. ログで確認後、実際の削除を承認
 */

function checkAndCleanupSheets() {
  try {
    Logger.log('🔍 スプレッドシートのシート確認開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    
    // 削除対象の旧シート名
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
    
    // 新システムで使用する6シート
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
    
    return {
      totalSheets: allSheets.length,
      deprecatedFound: foundDeprecated,
      newSystemSheetsStatus: newSystemSheets.map(name => ({
        name: name,
        exists: ss.getSheetByName(name) !== null
      }))
    };
    
  } catch (error) {
    Logger.log(`❌ シート確認エラー: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * 実際に旧シートを削除/バックアップ
 * checkAndCleanupSheets() で確認後に実行
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
    
    deprecatedSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        
        if (data.length > 1) {
          // データがある場合はバックアップとしてリネーム
          const backupName = `${sheetName}_backup_${Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd')}`;
          sheet.setName(backupName);
          Logger.log(`📋 バックアップ: ${sheetName} → ${backupName}`);
        } else {
          // データがない場合は削除
          ss.deleteSheet(sheet);
          Logger.log(`🗑️ 削除: ${sheetName} (データなし)`);
        }
        processedCount++;
      }
    });
    
    Logger.log(`✅ クリーンアップ完了: ${processedCount}個のシートを処理`);
    
    return {
      success: true,
      processedCount: processedCount
    };
    
  } catch (error) {
    Logger.log(`❌ クリーンアップエラー: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * 新システムシートを初期化
 * FranchiseHearingBot.gs の initializeFranchiseHearingDatabase() と同等
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
}