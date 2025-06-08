/**
 * webApp.gs - Google Apps Script Webアプリケーションエントリーポイント
 * フォーム送信リクエストを処理し、データを保存してSlack通知を送信する
 */

// ウェブアプリケーションの設定
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'error', message: 'GET requests are not supported' })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * POSTリクエストを処理する
 * @param {Object} e - リクエストパラメータ
 * @returns {TextOutput} - JSON形式のレスポンス
 */
function doPost(e) {
  try {
    // CORSヘッダーを設定（エラー回避）
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // POSTデータを検証
    if (!e || !e.parameter) {
      const error = new Error('無効なリクエストデータです');
      error.name = 'ValidationError';
      // 統一エラーハンドラーを使用
      const errorInfo = ErrorHandler.formatUserError(error, 'doPost - request validation');
      return createErrorResponse(errorInfo.userMessage, headers, errorInfo.errorId);
    }

    // POSTデータを取得
    const formData = e.parameter;
    console.log('受信データ:', JSON.stringify(formData));

    // 必須フィールドを検証
    const requiredFields = ['name', 'phone', 'postalCode', 'address', 'email', 'buildingType', 'timeFrame'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      const error = new Error(`必須フィールドが不足しています: ${missingFields.join(', ')}`);
      error.name = 'ValidationError';
      // 統一エラーハンドラーを使用
      const errorInfo = ErrorHandler.formatUserError(error, 'doPost - field validation', { missingFields });
      return createErrorResponse(errorInfo.userMessage, headers, errorInfo.errorId);
    }

    // リトライカウントを確認（デバッグとモニタリング用）
    const retryCount = parseInt(formData.retry_count || '0', 10);
    const submissionId = formData.submission_id || `submission_${Date.now()}`;

    // トレース情報の収集
    const traceInfo = {
      clientIp: formData.ip_address || 'unknown',
      userAgent: formData.user_agent || 'unknown',
      submissionId: submissionId,
      retryCount: retryCount,
      formSource: formData.page_url || 'unknown',
      timestamp: new Date().toISOString()
    };

    console.log(`処理開始 - 送信ID: ${submissionId}, リトライ: ${retryCount}`);

    // スプレッドシートに保存 - トライキャッチでラップ
    const sheetResult = ErrorHandler.tryCatch(
      () => SpreadsheetWriter.saveFormData(formData),
      'doPost - spreadsheet save',
      { formData, traceInfo }
    );

    if (!sheetResult.success) {
      // スプレッドシート保存に失敗した場合でもSlack通知は継続する
      console.warn(`スプレッドシート保存エラー(${sheetResult.errorId}), Slack通知のみ実行します`);
    }

    // Slackに通知 - トライキャッチでラップ
    const slackResult = ErrorHandler.tryCatch(
      () => SlackNotifier.sendNotification(formData),
      'doPost - slack notification',
      { formData, traceInfo }
    );

    // どちらか一方が成功していれば部分的成功として返す
    const isPartialSuccess = sheetResult.success || slackResult.success;

    if (isPartialSuccess) {
      // 成功または部分的成功レスポンスを返す
      return ContentService.createTextOutput(
        JSON.stringify({
          status: sheetResult.success && slackResult.success ? 'success' : 'partial_success',
          message: sheetResult.success && slackResult.success
                  ? 'データが正常に処理されました'
                  : '一部の処理が成功しました',
          submissionId: submissionId,
          details: {
            spreadsheet: sheetResult.success ? sheetResult.result : { error: sheetResult.userMessage },
            slack: slackResult.success ? slackResult.result : { error: slackResult.userMessage }
          }
        })
      ).setMimeType(ContentService.MimeType.JSON)
       .setHeaders(headers);
    } else {
      // 両方とも失敗した場合
      const error = new Error('データの保存と通知の両方が失敗しました');
      error.name = 'ProcessingError';

      // エラー情報を組み合わせる
      const errorInfo = ErrorHandler.formatUserError(error, 'doPost - complete failure', {
        sheetErrorId: sheetResult.errorId,
        slackErrorId: slackResult.errorId,
        traceInfo: traceInfo
      });

      return createErrorResponse(errorInfo.userMessage, headers, errorInfo.errorId);
    }

  } catch (error) {
    // 予期せぬエラーをログに記録
    const errorInfo = ErrorHandler.logError(error, 'doPost - unexpected error');
    console.error(`予期せぬエラーが発生しました(${errorInfo}):`, error);

    // エラーレスポンスを返す
    return createErrorResponse(
      ErrorHandler.getUserFriendlyMessage(error),
      {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      errorInfo
    );
  }
}

/**
 * エラーレスポンスを作成する
 * @param {string} message - エラーメッセージ
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} errorId - エラー識別ID（省略可）
 * @returns {TextOutput} - JSON形式のエラーレスポンス
 */
function createErrorResponse(message, headers = {}, errorId = null) {
  const response = ContentService.createTextOutput(
    JSON.stringify({
      status: 'error',
      message: message,
      errorId: errorId,
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);

  // ヘッダーがある場合は設定
  if (Object.keys(headers).length > 0) {
    response.setHeaders(headers);
  }

  return response;
}

/**
 * アプリケーション設定を取得する
 * @returns {Object} - アプリケーション設定
 */
function getAppConfig() {
  return {
    spreadsheetId: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '1RoG65zwQsuZ-V4TjoVFazLtKCyhskjaEqmSg-GTPrGo',
    slackWebhookUrl: PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_NEW_LEAD') || '',
    openaiApiKey: PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY') || ''
  };
}

/**
 * アプリケーション設定をテストおよび検証する
 * (GASエディタからテスト用に直接実行可能)
 */
function testConfig() {
  const config = getAppConfig();
  
  Logger.log('現在の設定:');
  Logger.log('- スプレッドシートID: ' + config.spreadsheetId);
  Logger.log('- Slack Webhook URL: ' + config.slackWebhookUrl);
  Logger.log('- OpenAI API Key: ' + (config.openaiApiKey ? '設定済み（非表示）' : '未設定'));
  
  // スプレッドシートが存在するかチェック
  try {
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    Logger.log('スプレッドシートが見つかりました: ' + ss.getName());
  } catch (e) {
    Logger.log('スプレッドシートエラー: ' + e.message);
  }
  
  return config;
}

/**
 * テスト用の送信データを生成する
 * (GASエディタからテスト用に直接実行可能)
 */
function generateTestFormSubmission() {
  const testData = {
    name: 'テスト 太郎',
    phone: '090-1234-5678',
    postalCode: '123-4567',
    address: '東京都新宿区西新宿1-1-1',
    email: 'test@example.com',
    buildingType: 'detached',
    timeFrame: '3months',
    message: 'これはテスト送信です。',
    utm_source: 'test',
    utm_medium: 'script',
    utm_campaign: 'debug'
  };
  
  Logger.log('テストデータでフォーム送信をシミュレートします...');
  
  // スプレッドシートへの保存をテスト
  const sheetResult = SpreadsheetWriter.saveFormData(testData);
  Logger.log('スプレッドシート結果: ' + JSON.stringify(sheetResult));
  
  // Slack通知をテスト
  const slackResult = SlackNotifier.sendNotification(testData);
  Logger.log('Slack通知結果: ' + JSON.stringify(slackResult));
  
  return {
    status: 'テスト完了',
    spreadsheet: sheetResult,
    slack: slackResult
  };
}