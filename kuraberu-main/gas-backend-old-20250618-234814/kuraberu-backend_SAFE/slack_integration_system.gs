/**
 * 📂 ファイル名: slack_integration_system.gs
 * 🎯 内容: 外壁塗装くらべるAI - Slack連携共通処理システム
 * - Slack Webhook通知の統一処理
 * - フォールバックログ記録機能
 * - 通知テスト・エラーハンドリング
 * ✅ sendSlackNotification() により他システムから共通利用可能
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * Slack通知送信（共通処理）
 * 
 * @param {string} message 送信メッセージ
 * @returns {Object} 送信結果
 */
function sendSlackNotification(message) {
  try {
    Logger.log('📢 Slack通知送信開始');
    
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      const errorMsg = 'SLACK_WEBHOOK_URLが設定されていません';
      Logger.log(`❌ ${errorMsg}`);
      fallbackSlackLog(`[Slack通知失敗] ${errorMsg}`);
      
      return {
        success: false,
        error: 'WEBHOOK_URL_NOT_SET',
        message: errorMsg,
        timestamp: new Date()
      };
    }
    
    if (!message || typeof message !== 'string') {
      const errorMsg = '無効なメッセージ形式です';
      Logger.log(`❌ ${errorMsg}`);
      fallbackSlackLog(`[Slack通知失敗] ${errorMsg}`);
      
      return {
        success: false,
        error: 'INVALID_MESSAGE',
        message: errorMsg,
        timestamp: new Date()
      };
    }
    
    const payload = {
      text: message,
      mrkdwn: true,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':robot_face:'
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      Logger.log('✅ Slack通知送信成功');
      fallbackSlackLog(`[Slack通知成功] メッセージ送信完了`);
      
      return {
        success: true,
        responseCode: responseCode,
        responseText: responseText,
        messageLength: message.length,
        timestamp: new Date()
      };
    } else {
      const errorMsg = `HTTP ${responseCode}: ${responseText}`;
      Logger.log(`❌ Slack通知送信失敗: ${errorMsg}`);
      fallbackSlackLog(`[Slack通知失敗] ${errorMsg}`);
      
      return {
        success: false,
        error: 'HTTP_ERROR',
        responseCode: responseCode,
        responseText: responseText,
        message: errorMsg,
        timestamp: new Date()
      };
    }
    
  } catch (error) {
    const errorMsg = `Slack通知処理エラー: ${error.message}`;
    Logger.log(`❌ ${errorMsg}`);
    fallbackSlackLog(`[Slack通知エラー] ${errorMsg}`);
    
    return {
      success: false,
      error: 'EXCEPTION',
      message: errorMsg,
      exception: error.toString(),
      timestamp: new Date()
    };
  }
}

/**
 * フォールバックログ記録（Slack送信失敗時やテスト用）
 * 
 * @param {string} message ログメッセージ
 * @returns {Object} ログ記録結果
 */
function fallbackSlackLog(message) {
  try {
    Logger.log(`📝 Slackフォールバックログ: ${message}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('システムログ');
      
      const headers = ['日時', 'システム', 'メッセージ', 'レベル'];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      const headerRange = logSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#34495E');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      logSheet.setFrozenRows(1);
      
      logSheet.setColumnWidth(1, 140); // 日時
      logSheet.setColumnWidth(2, 200); // システム
      logSheet.setColumnWidth(3, 400); // メッセージ
      logSheet.setColumnWidth(4, 80);  // レベル
      
      Logger.log('✅ システムログシート新規作成完了');
    }
    
    const logEntry = [
      new Date(),                    // 日時
      'Slack連携システム',           // システム
      message,                       // メッセージ
      'INFO'                         // レベル
    ];
    
    logSheet.appendRow(logEntry);
    
    return {
      success: true,
      message: 'ログ記録完了',
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ フォールバックログ記録エラー: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Slack連携システムのテスト（模擬実行）
 * 
 * @returns {Object} テスト結果
 */
function testSlackIntegrationSystem() {
  Logger.log('🧪 Slack連携システムテスト開始');
  
  try {
    const testResults = [];
    
    Logger.log('--- 設定確認テスト ---');
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    const configTest = {
      name: '設定確認',
      success: !!webhookUrl,
      details: webhookUrl ? 'SLACK_WEBHOOK_URL設定済み' : 'SLACK_WEBHOOK_URL未設定'
    };
    testResults.push(configTest);
    Logger.log(`設定確認結果: ${configTest.success ? '成功' : '失敗'} - ${configTest.details}`);
    
    Logger.log('--- フォールバックログテスト ---');
    const logTestMessage = `テストログメッセージ - ${new Date().toISOString()}`;
    const logTest = fallbackSlackLog(`[テスト実行] ${logTestMessage}`);
    const logTestResult = {
      name: 'フォールバックログ',
      success: logTest.success,
      details: logTest.success ? 'ログ記録成功' : `ログ記録失敗: ${logTest.error}`
    };
    testResults.push(logTestResult);
    Logger.log(`フォールバックログテスト結果: ${logTestResult.success ? '成功' : '失敗'} - ${logTestResult.details}`);
    
    Logger.log('--- 正常メッセージ送信テスト ---');
    const testMessage = `🧪 *Slack連携システム テスト*\n\n` +
      `📅 **実行日時**: ${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss')}\n` +
      `🎯 **テスト目的**: Slack通知機能の動作確認\n` +
      `💡 **ステータス**: 正常動作中\n\n` +
      `✅ このメッセージが表示されていれば、Slack連携は正常に動作しています。`;
    
    const normalTest = sendSlackNotification(testMessage);
    const normalTestResult = {
      name: '正常メッセージ送信',
      success: normalTest.success,
      details: normalTest.success 
        ? `送信成功 (${normalTest.responseCode})` 
        : `送信失敗: ${normalTest.message}`,
      responseCode: normalTest.responseCode,
      error: normalTest.error || null
    };
    testResults.push(normalTestResult);
    Logger.log(`正常メッセージ送信テスト結果: ${normalTestResult.success ? '成功' : '失敗'} - ${normalTestResult.details}`);
    
    Logger.log('--- 異常系テスト（空メッセージ）---');
    const emptyTest = sendSlackNotification('');
    const emptyTestResult = {
      name: '空メッセージテスト',
      success: !emptyTest.success,
      details: emptyTest.success ? '予期しない成功' : `期待通りの失敗: ${emptyTest.error}`,
      error: emptyTest.error || null
    };
    testResults.push(emptyTestResult);
    Logger.log(`空メッセージテスト結果: ${emptyTestResult.success ? '成功' : '失敗'} - ${emptyTestResult.details}`);
    
    Logger.log('--- 異常系テスト（nullメッセージ）---');
    const nullTest = sendSlackNotification(null);
    const nullTestResult = {
      name: 'nullメッセージテスト',
      success: !nullTest.success,
      details: nullTest.success ? '予期しない成功' : `期待通りの失敗: ${nullTest.error}`,
      error: nullTest.error || null
    };
    testResults.push(nullTestResult);
    Logger.log(`nullメッセージテスト結果: ${nullTestResult.success ? '成功' : '失敗'} - ${nullTestResult.details}`);
    
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ Slack連携システムテスト完了');
    
    const testSummary = {
      totalTests: totalTests,
      successfulTests: successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: `${successRate}%`,
      configurationValid: configTest.success,
      normalNotificationWorking: normalTestResult.success,
      errorHandlingWorking: emptyTestResult.success && nullTestResult.success
    };
    
    Logger.log('📊 テスト結果サマリー:', testSummary);
    
    fallbackSlackLog(`[テスト完了] 合計: ${totalTests}件, 成功: ${successfulTests}件, 成功率: ${successRate}%`);
    
    if (normalTestResult.success) {
      try {
        const completionMessage = `🧪 *Slack連携システム テスト完了*\n\n` +
          `📊 **テスト結果サマリー**:\n` +
          `✅ **成功**: ${successfulTests}/${totalTests}件\n` +
          `📈 **成功率**: ${successRate}%\n` +
          `⚙️ **設定状況**: ${configTest.success ? '正常' : '要確認'}\n` +
          `📢 **通知機能**: ${normalTestResult.success ? '正常' : '異常'}\n` +
          `🛡️ **エラーハンドリング**: ${emptyTestResult.success && nullTestResult.success ? '正常' : '要確認'}\n\n` +
          `💡 全システムでSlack通知が利用可能です。`;
        
        sendSlackNotification(completionMessage);
      } catch (e) {
        Logger.log('テスト完了通知スキップ:', e.message);
      }
    }
    
    return {
      success: true,
      summary: testSummary,
      testResults: testResults,
      details: {
        configuration: configTest,
        normalNotification: normalTestResult,
        errorHandling: {
          emptyMessage: emptyTestResult,
          nullMessage: nullTestResult
        },
        logging: logTestResult
      }
    };
    
  } catch (error) {
    Logger.log('❌ Slack連携システムテストエラー:', error);
    fallbackSlackLog(`[テストエラー] ${error.message}`);
    
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