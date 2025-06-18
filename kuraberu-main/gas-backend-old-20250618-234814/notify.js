/**
 * 外壁塗装くらべるAI システム - 統合通知システム（完全版）
 * Slack / SendGrid / Twilio / LINE Messaging API + LINE連携管理
 * 通知対象ユーザー抽出・履歴管理機能統合済み
 */

// ===================
// GAS WebApp API統合
// ===================

/**
 * LINE Webhook判定（エラー回避重視）
 * @param {Object} e リクエスト
 * @returns {boolean} LINE Webhookかどうか
 */
function isLineWebhook(e) {
  try {
    // Content-Typeチェック
    const contentType = e.postData && e.postData.type;
    if (contentType && contentType.includes('application/json')) {
      // LINEのWebhookデータ構造チェック
      const data = JSON.parse(e.postData.contents);
      return data && Array.isArray(data.events);
    }
    return false;
  } catch (error) {
    console.log('⚠️ LINE Webhook判定エラー（無視）:', error.message);
    return false;
  }
}

/**
 * 統合LINE Webhook処理（エラー回避重視）
 * @param {Object} e リクエスト
 * @returns {Object} レスポンス
 */
function handleLineWebhookUnified(e) {
  try {
    console.log('🤖 統合LINE Webhook処理開始');
    
    const requestBody = JSON.parse(e.postData.contents);
    const events = requestBody.events || [];
    
    if (events.length === 0) {
      console.log('⚠️ イベントが空 - 成功レスポンス返却');
      return createCorsResponse(JSON.stringify({ success: true, message: 'No events' }));
    }
    
    const results = [];
    
    // 各イベントを安全に処理
    events.forEach((event, index) => {
      try {
        console.log(`📱 イベント${index + 1}処理: ${event.type}`);
        
        // BOTヒアリング処理判定
        if (isFranchiseBotEvent(event)) {
          console.log('🎯 加盟店ヒアリングBOT処理へ');
          const botResult = processBotEvent(event);
          results.push({ eventIndex: index, type: 'bot', result: botResult });
        } else {
          console.log('📢 一般通知処理へ');
          // 既存の通知処理（必要に応じて）
          results.push({ eventIndex: index, type: 'notification', result: { success: true } });
        }
        
      } catch (eventError) {
        console.error(`❌ イベント${index + 1}処理エラー:`, eventError.message);
        results.push({ eventIndex: index, type: 'error', error: eventError.message });
      }
    });
    
    console.log('✅ 統合LINE Webhook処理完了');
    
    return createCorsResponse(JSON.stringify({
      success: true,
      processedEvents: results.length,
      results: results
    }));
    
  } catch (error) {
    console.error('❌ 統合LINE Webhook処理エラー:', error.message);
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

/**
 * 加盟店BOTイベント判定（エラー回避重視）
 * @param {Object} event LINE イベント
 * @returns {boolean} BOT対象かどうか
 */
function isFranchiseBotEvent(event) {
  try {
    // 簡単な判定ロジック（拡張可能）
    return event.type === 'message' || event.type === 'postback';
  } catch (error) {
    console.log('⚠️ BOTイベント判定エラー（一般処理へ）:', error.message);
    return false;
  }
}

/**
 * 統合POSTリクエストハンドラー（通知+BOT+API）
 * エラー回避重視の安全設計
 */
function doPost(e) {
  try {
    console.log('🔗 統合 WebApp POST受信');
    console.log('  postData.type:', e.postData ? e.postData.type : 'undefined');
    console.log('  postData.contents:', e.postData ? e.postData.contents : 'undefined');
    console.log('  parameter.method:', e.parameter ? e.parameter.method : 'undefined');
    
    // CORS Preflight対応
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      return createCorsResponse('', 200);
    }
    
    // 1. LINE Webhook判定（最優先）
    if (isLineWebhook(e)) {
      console.log('📱 LINE Webhook検出 - 専用処理へ');
      return handleLineWebhookUnified(e);
    }
    
    // 2. 通常のAPI処理
    var requestData;
    var functionName;
    var parameters;
    var path;
    
    try {
      // Safari Form送信検出
      if (e.parameter && e.parameter.safari && e.parameter.data) {
        console.log('🍎 Safari Form送信検出');
        requestData = JSON.parse(e.parameter.data);
        functionName = requestData.action || requestData.function;
        parameters = requestData.parameters || requestData;
        path = requestData.path;
        
        console.log('🍎 Safari Form解析完了:', {
          functionName: functionName,
          parameters: parameters,
          path: path
        });
      } else if (e.postData && e.postData.contents) {
        requestData = JSON.parse(e.postData.contents);
        functionName = requestData.action || requestData.function;
        parameters = requestData.parameters || requestData;
        path = requestData.path;
        
        console.log('📋 解析されたリクエスト:', {
          functionName: functionName,
          parameters: parameters,
          path: path
        });
        console.log('📋 requestData:', JSON.stringify(requestData, null, 2));
      } else if (e.parameter && e.parameter.data) {
        // JSONP GETパラメータ処理
        console.log('🔗 JSONP GETパラメータ検出');
        requestData = JSON.parse(e.parameter.data);
        functionName = requestData.action || requestData.function;
        parameters = requestData;
        path = requestData.path;
        
        console.log('🔗 JSONP解析完了:', {
          functionName: functionName,
          parameters: parameters,
          path: path
        });
        console.log('🔗 requestData:', JSON.stringify(requestData, null, 2));
      } else {
        throw new Error('リクエストデータが見つかりません');
      }
    } catch (parseError) {
      console.error('❌ リクエスト解析エラー:', parseError);
      return createCorsResponse(JSON.stringify({
        success: false,
        message: 'リクエストの解析に失敗しました',
        error: parseError.toString()
      }), 400);
    }
    
    // API ルーティング
    console.log('🎯 ルーティング開始 - functionName:', functionName);
    console.log('🎯 parameters:', JSON.stringify(parameters, null, 2));
    console.log('🎯 e.parameter:', JSON.stringify(e.parameter, null, 2));
    console.log('🎯 e.postData:', e.postData ? JSON.stringify(e.postData, null, 2) : 'null');
    
    var result;
    
    switch (functionName) {
        // 認証関連
        case 'auth/login':
          result = handleLogin(parameters);
          break;
        
      // 通知設定関連
      case 'getNotificationSettings':
        result = getNotificationSettings(parameters.childId);
        break;
      case 'updateNotificationSettings':
        result = updateNotificationSettings(parameters.childId, parameters);
        break;
        
      // LINE連携関連
      case 'api/line-connected-status':
        result = getLineConnectedStatus(parameters.childId);
        break;
      case 'api/disconnect-line':
        result = disconnectLine(parameters.childId);
        break;
      case 'recordLineConnection':
        result = recordLineConnection(parameters);
        break;
        
      // 案件関連
      case 'getInquiriesForChildUser':
        result = getInquiriesForChildUser(parameters.childId);
        break;
      case 'getFranchiseInquiries':
        result = getFranchiseInquiries(parameters.franchiseId);
        break;
      case 'getFranchiseChildUsers':
        result = getFranchiseChildUsers(parameters.franchiseId);
        break;
      case 'executeManualChildAssignment':
        result = executeManualChildAssignment(parameters);
        break;
      case 'respondToInquiry':
        result = respondToInquiry(parameters.childId, parameters);
        break;
        
      // 通知テンプレート管理API
      case 'templates':
        result = getTemplatesAPI();
        break;
      case 'templates/preview':
        result = getTemplatePreviewAPI(parameters);
        break;
        
      // LINEテンプレート関連（既存）
      case 'getLineTemplates':
        result = getLineTemplates(parameters.childId);
        break;
      case 'saveLineTemplate':
        result = saveLineTemplate(parameters);
        break;
      case 'generateAITemplate':
        result = generateAITemplate(parameters);
        break;
      case 'testLineNotification':
        result = testLineNotification(parameters);
        break;
        
      // 案件振り分け通知関連
      case 'notifyFranchiseAssignment':
        result = notifyFranchiseAssignment(parameters);
        break;
      case 'executeManualChildAssignment':
        result = executeManualChildAssignment(parameters);
        break;
        
      // 🎯 加盟店AIヒアリングBOT関連（新仕様）
      case 'startAIHearing':
        // extractFromWebsiteの場合は専用処理
        if (parameters.action === 'extractFromWebsite') {
          console.log('🌐 【場所1】startAIHearing経由でextractFromWebsite実行');
          console.log('🌐 【場所1】parametersの詳細:', JSON.stringify(parameters, null, 2));
          result = extractFromWebsiteNotify(parameters);
        } else {
          result = startAIHearing(parameters);
        }
        break;
      case 'selectCandidate':
        result = selectCandidate(parameters);
        break;
      case 'confirmAICandidate':
        result = confirmAICandidate(parameters);
        break;
      case 'searchCompanyDetails':
        result = searchCompanyDetails(parameters);
        break;
      case 'updateCorrectionData':
        result = updateCorrectionData(parameters);
        break;
      case 'generatePRSuggestion':
        result = generatePRSuggestion(parameters);
        break;
      case 'processHumanHearing':
        result = processHumanHearing(parameters);
        break;
      case 'completeHearing':
        result = completeHearing(parameters);
        break;
      case 'extractFromWebsite':
        console.log('🌐 【直接ルート】extractFromWebsite実行開始');
        console.log('📤 【直接ルート】受信パラメータ:', JSON.stringify(parameters, null, 2));
        console.log('📤 【直接ルート】functionName:', functionName);
        
        // デバッグ：関数存在確認
        if (typeof extractFromWebsiteNotify === 'function') {
          console.log('✅ 【場所2】extractFromWebsiteNotify関数が存在します');
          console.log('🌐 【場所2】parametersの詳細:', JSON.stringify(parameters, null, 2));
          result = extractFromWebsiteNotify(parameters);
        } else {
          console.log('❌ extractFromWebsiteNotify関数が見つかりません');
          result = {
            success: false,
            error: 'extractFromWebsiteNotify関数が定義されていません',
            debug: typeof extractFromWebsiteNotify
          };
        }
        
        console.log('📥 extractFromWebsite結果:', JSON.stringify(result, null, 2));
        break;
      // ✅ 第2段階詳細検索 - 2025年6月14日 23:59更新
      // 旧版ルーティング削除済み
      case 'getFranchiseNotificationSettings':
        result = getFranchiseNotificationSettings(parameters.franchiseId);
        break;
        
      // 🎯 加盟店登録システム（新規追加）
      case 'submitFranchiseRegistration':
        console.log('📝 加盟店登録API呼び出し開始');
        console.log('📤 受信パラメータ:', JSON.stringify(parameters, null, 2));
        
        // 圧縮データの場合は展開処理を追加
        if (parameters.areasCompressed && !parameters.areas) {
          console.log('📦 圧縮エリアデータを検出:', parameters.areasCompressed);
          parameters.areas = [{
            prefecture: 'エリア情報',
            city: parameters.areasCompressed,
            towns: [],
            isPriority: false
          }];
        }
        
        result = submitFranchiseRegistration(parameters);
        console.log('📝 加盟店登録API結果:', JSON.stringify(result, null, 2));
        break;
      
      // 接続テスト
      case 'connectionTest':
        console.log('🔗 connectionTest実行開始');
        console.log('📤 全パラメータ:', JSON.stringify(parameters, null, 2));
        
        // extractFromWebsiteかどうかチェック
        const hasExtractAction = parameters && (parameters.action === 'extractFromWebsite' || parameters.websiteUrl);
        console.log('🔍 extractFromWebsite判定:', hasExtractAction);
        
        if (hasExtractAction) {
          console.log('🌐 【場所3】connectionTest経由でextractFromWebsite実行');
          console.log('🔍 【場所3】parameters詳細:', {
            parameters: parameters,
            type: typeof parameters,
            keys: parameters ? Object.keys(parameters) : 'N/A',
            websiteUrl: parameters ? parameters.websiteUrl : 'N/A',
            action: parameters ? parameters.action : 'N/A'
          });
          
          // extractFromWebsiteNotify関数を呼び出し
          result = extractFromWebsiteNotify(parameters);
        } else {
          result = {
            success: true,
            message: 'GAS WebApp接続正常',
            timestamp: new Date().toISOString()
          };
        }
        break;
        
      // Cloud Functions連携用
      case 'getScriptProperties':
        result = getScriptPropertiesForCloudFunctions(parameters);
        break;
      case 'logLineMessageToSpreadsheet':
        result = logLineMessageToSpreadsheetForCloudFunctions(parameters);
        break;
        
      case 'testAPISettings':
        result = testAPISettings(parameters);
        break;
        
        // その他
        default:
          console.log('⚠️ 未知のアクション:', functionName);
          result = {
            success: false,
            message: `未対応のアクション: ${functionName}`,
            error: 'UNSUPPORTED_ACTION'
          };
      }
    
    console.log('✅ API処理結果:', result);
    
    return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
    
  } catch (error) {
    console.error('❌ doPost全体エラー:', error);
    
    return createCorsResponse(JSON.stringify({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.toString()
    }), 500);
  }
}

/**
 * GETリクエストハンドラー
 */
function doGet(e) {
  try {
    console.log('🔗 GAS WebApp GET受信');
    console.log('📋 パラメータ:', JSON.stringify(e.parameter));
    
    
    // データパラメータがある場合の処理（JSONP対応含む）
    if (e.parameter.data) {
      console.log('🔄 JSONP処理開始');
      console.log('📋 生データ:', e.parameter.data.substring(0, 200) + '...');
      
      let postData;
      try {
        // GASでは e.parameter.data は既にURLデコードされているため、直接パース
        postData = JSON.parse(e.parameter.data);
        console.log('✅ 直接JSONパース成功');
      } catch (directParseError) {
        console.log('⚠️ 直接パース失敗、decodeURIComponentを試行');
        console.log('❌ 直接パースエラー:', directParseError.message);
        try {
          postData = JSON.parse(decodeURIComponent(e.parameter.data));
          console.log('✅ decodeURIComponentパース成功');
        } catch (parseError) {
          console.error('❌ 全てのJSON Parse方法が失敗:', parseError.message);
          console.log('📋 デバッグ - 生データの最初の500文字:', e.parameter.data.substring(0, 500));
          
          const callback = e.parameter.callback;
          const errorResponse = `${callback}(${JSON.stringify({
            success: false,
            error: 'JSONパースエラー: ' + parseError.message,
            rawDataStart: e.parameter.data.substring(0, 100),
            rawDataLength: e.parameter.data.length,
            debugInfo: 'GAS doGet JSONパース失敗'
          })});`;
          return ContentService
            .createTextOutput(errorResponse)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
      }
      
      const action = postData.action;
      
      console.log('🎯 実行アクション:', action);
      
      // doPost関数と同じルーティングロジックを使用
      const parameters = postData;
      let result;
      
      // アクションによる分岐処理（doPost関数と同様）
      switch (action) {
        
        // 🎯 加盟店AIヒアリングBOT関連
        case 'startAIHearing':
          result = startAIHearing(parameters);
          break;
        case 'searchCompanyDetails':
          result = searchCompanyDetails(parameters);
          break;
        case 'confirmAICandidate':
          result = confirmAICandidate(parameters);
          break;
        
        // 🎯 加盟店登録システム
        case 'submitFranchiseRegistration':
          console.log('📝 JSONP加盟店登録API呼び出し開始');
          console.log('📤 JSONP受信パラメータ:', JSON.stringify(parameters, null, 2));
          
          // 圧縮データの場合は展開処理を追加
          if (parameters.areasCompressed && !parameters.areas) {
            console.log('📦 圧縮エリアデータを検出:', parameters.areasCompressed);
            parameters.areas = [{
              prefecture: 'エリア情報',
              city: parameters.areasCompressed,
              towns: [],
              isPriority: false
            }];
          }
          
          // FranchiseHearingAI_New.gs の関数を呼び出し
          try {
            if (typeof submitFranchiseRegistration === 'function') {
              result = submitFranchiseRegistration(parameters);
            } else {
              console.error('❌ submitFranchiseRegistration関数が見つかりません');
              result = {
                success: false,
                error: 'submitFranchiseRegistration関数が定義されていません'
              };
            }
          } catch (callError) {
            console.error('❌ submitFranchiseRegistration呼び出しエラー:', callError.message);
            result = {
              success: false,
              error: 'submitFranchiseRegistration呼び出しエラー: ' + callError.message
            };
          }
          console.log('📝 JSONP加盟店登録API結果:', JSON.stringify(result, null, 2));
          break;
        
        // 接続テスト
        case 'connectionTest':
          result = {
            success: true,
            message: 'GAS WebApp接続正常',
            timestamp: new Date().toISOString()
          };
          break;
        
        default:
          console.log('⚠️ 未知のアクション:', action);
          result = {
            success: false,
            message: `未対応のアクション: ${action}`,
            error: 'UNSUPPORTED_ACTION'
          };
      }
      
      console.log('✅ データ処理完了:', JSON.stringify(result));
      
      // コールバックパラメータがある場合はJSONP、ない場合は通常のJSON
      if (e.parameter.callback) {
        const callback = e.parameter.callback;
        const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
        
        console.log('✅ JSONP応答準備完了');
        console.log('📋 コールバック名:', callback);
        console.log('📋 レスポンス内容:', jsonpResponse.substring(0, 200) + '...');
        
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        console.log('✅ 通常のJSON応答を返却');
        return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
      }
    }
    
    // URLパラメータからパスを取得
    var path = e.parameter.path || '';
    console.log('GET Path:', path);
    
    var result;
    
    // GETルーティング
    switch (path) {
      case 'templates':
        result = getTemplatesAPI();
        break;
      
      default:
        result = {
          success: true,
          message: 'GAS WebApp is running',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        };
    }
    
    return createCorsResponse(JSON.stringify(result), 200);
    
  } catch (error) {
    console.error('❌ doGet エラー:', error);
    
    // JSONP エラー処理
    if (e.parameter.callback) {
      const callback = e.parameter.callback;
      const errorResponse = `${callback}(${JSON.stringify({success: false, error: error.toString()})});`;
      
      return ContentService
        .createTextOutput(errorResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return createCorsResponse(JSON.stringify({
      success: false,
      message: 'GETリクエスト処理エラー',
      error: error.toString()
    }), 500);
  }
}

/**
 * OPTIONSリクエストハンドラー（CORS Preflight対応）
 */
function doOptions(e) {
  return createCorsResponse('', 200);
}

/**
 * CORS対応レスポンス作成
 */
function createCorsResponse(content, statusCode) {
  var output = ContentService.createTextOutput(content);
  output.setMimeType(ContentService.MimeType.JSON);
  
  // GAS WebAppの基本設定のみ（addHeaderは使用不可）
  // 「アクセスできるユーザー」を「全員」に設定することでCORS制限が緩和される
  
  // LINEのWebhook要件: 必ずステータスコード200を返す
  if (statusCode && statusCode !== 200) {
    console.log('⚠️ LINE Webhook用に強制的にステータス200を返却');
  }
  
  return output;
}

// ===================
// Slack通知統合版
// ===================

/**
 * Slack基本通知（統一関数名）
 * @param {string} message - 送信メッセージ
 * @param {Object} options - 送信オプション
 * @return {Object} 送信結果
 */
function sendSlack(message, options = {}) {
  return sendSlackNotification(message, options);
}

/**
 * Slack詳細通知
 * @param {string} message - 送信メッセージ
 * @param {Object} options - 送信オプション（channel, priority, mentions, attachments等）
 * @return {Object} 送信結果
 */
function sendSlackNotification(message, options = {}) {
  try {
    const url = getSystemSetting("SLACK_WEBHOOK_URL");
    if (!url || url.includes('YOUR')) {
      Logger.log("⚠️ SLACK_WEBHOOK_URL未設定 - モックモードで実行");
      return mockSlackResponse(message, options);
    }
    
    if (!message || message.trim() === "") message = "(メッセージなし)";
    
    const payload = createSlackPayload(message, options);
    const requestOptions = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const res = UrlFetchApp.fetch(url, requestOptions);
    const responseCode = res.getResponseCode();
    const responseText = res.getContentText();
    
    Logger.log("📨 Slack response: " + responseText);
    
    const result = {
      success: responseCode === 200,
      responseCode: responseCode,
      responseText: responseText,
      channel: options.channel || 'default',
      sentAt: new Date().toISOString()
    };
    
    // 通知履歴を記録
    recordNotificationHistory(
      options.userId || 'system',
      'SLACK_NOTIFICATION',
      'default',
      { channel: options.channel, ...options },
      result
    );
    
    return result;
  } catch (error) {
    Logger.log("❌ Slack送信エラー:", error);
    const errorResult = { success: false, error: error.message };
    
    // エラーも履歴に記録
    recordNotificationHistory(
      options.userId || 'system',
      'SLACK_NOTIFICATION',
      'default',
      { channel: options.channel, ...options },
      errorResult
    );
    
    return errorResult;
  }
}

/**
 * Slackペイロード作成
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @return {Object} Slackペイロード
 */
function createSlackPayload(message, options) {
  const channels = getSlackChannelConfig();
  const targetChannel = options.channel ? (channels[options.channel] || options.channel) : null;
  
  const payload = {
    text: message,
    username: options.username || 'GAS外壁塗装Bot',
    icon_emoji: options.icon || ':house:',
    mrkdwn: true
  };
  
  // チャンネル指定
  if (targetChannel) {
    payload.channel = targetChannel;
  }
  
  // 優先度による装飾
  if (options.priority === 'high') {
    payload.icon_emoji = ':rotating_light:';
    payload.text = '🚨 ' + payload.text;
  } else if (options.priority === 'low') {
    payload.icon_emoji = ':information_source:';
  }
  
  // メンション追加
  if (options.mentions && Array.isArray(options.mentions)) {
    payload.text = options.mentions.join(' ') + ' ' + payload.text;
  }
  
  // 添付ファイル（リッチフォーマット）
  if (options.attachments) {
    payload.attachments = options.attachments;
  }
  
  return payload;
}

/**
 * Slackチャンネル設定
 * @return {Object} チャンネル設定
 */
function getSlackChannelConfig() {
  return {
    general: '#general',
    assignments: '#案件割り当て',
    cancellations: '#キャンセル',
    alerts: '#アラート',
    logs: '#ログ'
  };
}

/**
 * モックSlack応答（開発用）
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @return {Object} モック応答
 */
function mockSlackResponse(message, options) {
  Logger.log('🔧 モックSlack送信:', {
    message: message,
    options: options
  });
  
  return {
    success: true,
    message: 'Slack通知を送信しました（モック）',
    channel: options.channel || 'default',
    sentAt: new Date().toISOString(),
    mock: true
  };
}

// ===================
// 案件関連Slack通知
// ===================

/**
 * 案件割り当て通知
 * @param {Object} assignmentData - 割り当て情報
 * @return {Object} 送信結果
 */
function notifyAssignment(assignmentData) {
  try {
    Logger.log('🎯 案件割り当て通知送信開始（統合版）');
    
    const message = `🎯 **案件割り当て完了**

📋 **案件ID**: ${assignmentData.inquiryId}
👤 **担当者**: ${assignmentData.assignedChildName} (${assignmentData.assignedChildId})
⚙️ **割り当てモード**: ${assignmentData.mode === 'auto' ? '自動' : '手動'}
🏠 **エリア**: ${assignmentData.area || '未設定'}
💼 **経験**: ${assignmentData.experience || '未設定'}
📅 **処理時刻**: ${new Date().toLocaleString('ja-JP')}`;
    
    // 統合通知システムを使用
    return sendIntegratedNotification('assignment_notification', message, {
      messageId: `ASSIGN_${Date.now()}`,
      priority: 'normal',
      senderId: 'assignment_system',
      icon: ':dart:',
      username: '案件割り当て通知',
      subject: '案件割り当て完了通知'
    });
    
  } catch (error) {
    Logger.log('❌ 割り当て通知エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 割り当て添付ファイル作成
 * @param {Object} data - 割り当て情報
 * @return {Object} 添付ファイル
 */
function createAssignmentAttachment(data) {
  return {
    color: 'good',
    fields: [
      {
        title: '案件情報',
        value: `ID: ${data.inquiryId}\nエリア: ${data.area || '未設定'}`,
        short: true
      },
      {
        title: '担当者情報',
        value: `${data.assignedChildName}\n経験: ${data.experience || '未設定'}`,
        short: true
      }
    ]
  };
}

/**
 * キャンセル通知
 * @param {Object} cancelData - キャンセル情報
 * @return {Object} 送信結果
 */
function notifyCancel(cancelData) {
  try {
    Logger.log('🚫 キャンセル申請通知送信開始（統合版）');
    
    // メッセージ作成
    const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss');
    const userName = cancelData.applicant || cancelData.user_name || '申請者不明';
    const caseName = cancelData.requestId || cancelData.caseId || cancelData.case_name || '案件不明';
    const reason = cancelData.reason || cancelData.cancel_reason || 'キャンセル理由不明';
    
    const message = `🚫 **キャンセル申請がありました**

📋 **申請者名**: ${userName}
🏠 **案件名**: ${caseName}
❓ **理由**: ${reason}
📅 **日時**: ${timestamp}

⚠️ 至急確認・対応をお願いします。`;
    
    // 統合通知システムを使用
    return sendIntegratedNotification('cancel_request', message, {
      messageId: `CANCEL_${Date.now()}`,
      priority: 'high',
      senderId: 'cancel_system',
      icon: ':no_entry:',
      username: 'キャンセル申請通知',
      subject: 'キャンセル申請通知'
    });
    
  } catch (error) {
    Logger.log('❌ キャンセル通知エラー:', error);
    // エラー通知
    try {
      notifyGptErrorChannel(`キャンセル通知エラー: ${error.message}`);
    } catch (e) {
      Logger.log('エラー通知も失敗:', e.message);
    }
    return { success: false, error: error.message };
  }
}

/**
 * システムアラート通知
 * @param {string} alertType - アラート種別
 * @param {string} description - 説明
 * @param {Object} details - 詳細情報
 * @return {Object} 送信結果
 */
function notifySystemAlert(alertType, description, details = {}) {
  try {
    Logger.log('🚨 システムアラート通知送信開始（統合版）');
    
    let message = `🚨 **システムアラート [${alertType}]**

📝 **内容**: ${description}
📅 **発生時刻**: ${new Date().toLocaleString('ja-JP')}`;
    
    if (details.errorCode) {
      message += `\n🔢 **エラーコード**: ${details.errorCode}`;
    }
    
    if (details.stack) {
      message += `\n📊 **スタックトレース**: \`\`\`${details.stack}\`\`\``;
    }
    
    if (details.affectedUsers) {
      message += `\n👥 **影響ユーザー**: ${details.affectedUsers}`;
    }
    
    // 統合通知システムを使用
    return sendIntegratedNotification('system_alert', message, {
      messageId: `ALERT_${Date.now()}`,
      priority: 'high',
      senderId: 'alert_system',
      icon: ':warning:',
      username: 'システムアラート',
      subject: `システムアラート - ${alertType}`,
      mentions: details.mentions || ['@channel']
    });
    
  } catch (error) {
    Logger.log('❌ システムアラート通知エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 日次レポート送信
 * @param {Object} reportData - レポートデータ
 * @return {Object} 送信結果
 */
function sendDailyReport(reportData) {
  try {
    const message = `📊 日次レポート ${new Date().toLocaleDateString('ja-JP')}

本日の実績:
• 新規案件: ${reportData.newCases || 0}件
• 割り当て完了: ${reportData.assignedCases || 0}件
• キャンセル: ${reportData.cancelledCases || 0}件
• 成約: ${reportData.contractedCases || 0}件

詳細レポートは管理画面でご確認ください。`;
    
    return sendSlackNotification(message, {
      channel: 'general',
      priority: 'low',
      icon: ':bar_chart:'
    });
    
  } catch (error) {
    Logger.log('❌ 日次レポート送信エラー:', error);
    return { success: false, error: error.message };
  }
}

// ✅ SendGridメール送信
function sendEmail(to, subject, body) {
  try {
    const apiKey = getSystemSetting("SENDGRID_KEY");
    if (!apiKey) {
      Logger.log("⚠️ SENDGRID_KEY が設定されていません");
      return { success: false, error: "API Key未設定" };
    }
    
    const url = "https://api.sendgrid.com/v3/mail/send";
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "info@gaihekikuraberu.com" },
      subject: subject,
      content: [{ type: "text/plain", value: body }]
    };
    const options = {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const res = UrlFetchApp.fetch(url, options);
    const responseCode = res.getResponseCode();
    const responseText = res.getContentText();
    
    Logger.log("📧 SendGrid response: " + responseText);
    
    return {
      success: responseCode === 202,
      responseCode: responseCode,
      responseText: responseText
    };
  } catch (error) {
    Logger.log("❌ SendGrid送信エラー:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Twilio SMS
function sendSMS(to, body) {
  try {
    const sid = getSystemSetting("TWILIO_ACCOUNT_SID");
    const token = getSystemSetting("TWILIO_AUTH_TOKEN");
    const from = getSystemSetting("TWILIO_FROM_NUMBER");
    
    if (!sid || !token || !from) {
      Logger.log("⚠️ Twilio設定が不完全です");
      return { success: false, error: "Twilio設定未完了" };
    }
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    Logger.log("📤 Sending SMS to: " + to);

    const payload = {
      To: to,
      From: from,
      Body: body
    };
    const options = {
      method: "post",
      payload: payload,
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    const responseCode = res.getResponseCode();
    const responseText = res.getContentText();
    
    Logger.log("📨 Twilio SMS response: " + responseText);
    
    return {
      success: responseCode === 201,
      responseCode: responseCode,
      responseText: responseText
    };
  } catch (error) {
    Logger.log("❌ Twilio SMS送信エラー:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Twilio 音声通話（日本語読み上げ修正版）
function makeCall(to) {
  try {
    const sid = getSystemSetting("TWILIO_ACCOUNT_SID");
    const token = getSystemSetting("TWILIO_AUTH_TOKEN");
    const from = getSystemSetting("TWILIO_FROM_NUMBER");

    if (!sid || !token || !from) {
      Logger.log("⚠️ Twilio設定が不完全です");
      return { success: false, error: "Twilio設定未完了" };
    }

    Logger.log("📞 発信開始: " + to);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;

    const payload = {
      To: to,
      From: from,
      Twiml: `<Response><Say language="ja-JP" voice="alice">こんにちは。こちらは外壁塗装くらべるAIです。これはテスト通話です。</Say></Response>`
    };

    const options = {
      method: "post",
      payload: payload,
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    const responseCode = res.getResponseCode();
    const responseText = res.getContentText();
    
    Logger.log("📞 Twilio Call response: " + responseText);
    
    return {
      success: responseCode === 201,
      responseCode: responseCode,
      responseText: responseText
    };
  } catch (error) {
    Logger.log("❌ Twilio通話エラー:", error);
    return { success: false, error: error.message };
  }
}

// ✅ LINE Push（統一関数名）
function sendLinePush(userId, message, imageUrl) {
  return sendLinePushMessage(userId, message, imageUrl);
}

function sendLinePushMessage(userId, message, imageUrl) {
  try {
    const token = getSystemSetting("LINE_ACCESS_TOKEN");
    if (!token) {
      Logger.log("⚠️ LINE_ACCESS_TOKEN が設定されていません");
      return { success: false, error: "Access Token未設定" };
    }
    
    if (!userId || !message) {
      Logger.log("⚠️ LINE Push送信エラー: userIdまたはmessage未指定");
      return { success: false, error: "必須パラメータ未指定" };
    }

    // userIdバリデーション
    if (!userId.startsWith('U') || userId.length !== 33) {
      Logger.log(`⚠️ 不正なLINE UserID形式: ${userId}`);
      return { success: false, error: "不正なUserID形式" };
    }

    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }

    const url = "https://api.line.me/v2/bot/message/push";
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    };

    const messages = [{ type: "text", text: message }];
    if (imageUrl) {
      messages.push({
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      });
    }

    const payload = {
      to: userId,
      messages: messages
    };

    const options = {
      method: "post",
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const res = UrlFetchApp.fetch(url, options);
    const responseCode = res.getResponseCode();
    const responseText = res.getContentText();
    
    Logger.log("📨 LINE Push response: " + responseText);
    
    return {
      success: responseCode === 200,
      responseCode: responseCode,
      responseText: responseText
    };
  } catch (error) {
    Logger.log("❌ LINE Push送信エラー:", error);
    return { success: false, error: error.message };
  }
}

// ✅ 動作テスト（すべての通知送信）
function testNotify_All() {
  Logger.log("🔔 通知系関数テスト開始");

  const tel = "+819019947162";
  const lineUserId = "U90d261a80c65baa2d2afc42e9e9be00a";
  const email = "ryuryuyamauchi@gmail.com";

  const slackResult = sendSlackNotification("✅ Slack通知テスト（本番）");
  const emailResult = sendEmail(email, "✅ メールテスト", "info@gaihekikuraberu.comから送信されました");
  const smsResult = sendSMS(tel, "✅ Twilio SMSテスト（Messaging API）");
  const callResult = makeCall(tel);
  const lineResult = sendLinePushMessage(lineUserId, "✅ LINE Pushテストです（Messaging API）");

  Logger.log("📊 テスト結果:");
  Logger.log("Slack:", slackResult);
  Logger.log("Email:", emailResult);
  Logger.log("SMS:", smsResult);
  Logger.log("Call:", callResult);
  Logger.log("LINE:", lineResult);

  Logger.log("✅ 通知テスト完了");
}

// =============================================================================
// LINE連携管理API
// =============================================================================

/**
 * LINE連携状況を確認
 */
function getLineConnectedStatus(childId) {
  try {
    console.log('📞 LINE連携状況確認:', childId);
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var lineConnectionSheet = ss.getSheetByName('LineConnections');
    
    // シートが存在しない場合は作成
    if (!lineConnectionSheet) {
      lineConnectionSheet = ss.insertSheet('LineConnections');
      lineConnectionSheet.getRange(1, 1, 1, 5).setValues([
        ['childId', 'userId', 'connectedAt', 'status', 'lastActivityAt']
      ]);
    }
    
    // 該当するchildIdの連携情報を検索
    var data = lineConnectionSheet.getDataRange().getValues();
    var headerRow = data[0];
    var childIdCol = headerRow.indexOf('childId');
    var userIdCol = headerRow.indexOf('userId');
    var connectedAtCol = headerRow.indexOf('connectedAt');
    var statusCol = headerRow.indexOf('status');
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][childIdCol] === childId && data[i][statusCol] === 'connected') {
        return {
          success: true,
          data: {
            connected: true,
            userId: data[i][userIdCol],
            connectedAt: data[i][connectedAtCol]
          }
        };
      }
    }
    
    // 連携情報が見つからない場合
    return {
      success: true,
      data: {
        connected: false,
        userId: null,
        connectedAt: null
      }
    };
    
  } catch (error) {
    console.error('❌ LINE連携状況確認エラー:', error);
    return {
      success: false,
      message: 'LINE連携状況の確認に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * LINE連携を解除
 */
function disconnectLine(childId) {
  try {
    console.log('📞 LINE連携解除:', childId);
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var lineConnectionSheet = ss.getSheetByName('LineConnections');
    
    if (!lineConnectionSheet) {
      return {
        success: false,
        message: 'LINE連携データが見つかりません'
      };
    }
    
    // 該当するchildIdの連携情報を削除
    var data = lineConnectionSheet.getDataRange().getValues();
    var headerRow = data[0];
    var childIdCol = headerRow.indexOf('childId');
    var statusCol = headerRow.indexOf('status');
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][childIdCol] === childId) {
        // statusを'disconnected'に変更
        lineConnectionSheet.getRange(i + 1, statusCol + 1).setValue('disconnected');
        
        return {
          success: true,
          data: {
            disconnected: true,
            disconnectedAt: new Date().toISOString()
          },
          message: 'LINE連携を解除しました'
        };
      }
    }
    
    return {
      success: false,
      message: '該当するLINE連携が見つかりません'
    };
    
  } catch (error) {
    console.error('❌ LINE連携解除エラー:', error);
    return {
      success: false,
      message: 'LINE連携の解除に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * LINE連携を記録（Cloud Functionsから呼び出される）
 */
function recordLineConnection(params) {
  try {
    console.log('📞 LINE連携記録:', params);
    
    var userId = params.userId;
    var eventType = params.eventType;
    var connectedAt = params.connectedAt;
    
    if (!userId) {
      return {
        success: false,
        message: 'ユーザーIDが指定されていません'
      };
    }
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var lineConnectionSheet = ss.getSheetByName('LineConnections');
    
    // シートが存在しない場合は作成
    if (!lineConnectionSheet) {
      lineConnectionSheet = ss.insertSheet('LineConnections');
      lineConnectionSheet.getRange(1, 1, 1, 5).setValues([
        ['childId', 'userId', 'connectedAt', 'status', 'lastActivityAt']
      ]);
    }
    
    // 一意のchildIdを生成（実際の実装では適切なマッピング方法を使用）
    var childId = 'child-' + userId.substring(0, 8);
    
    // 新しい連携情報を追加
    var newRow = [
      childId,
      userId,
      connectedAt || new Date().toISOString(),
      'connected',
      new Date().toISOString()
    ];
    
    lineConnectionSheet.appendRow(newRow);
    
    return {
      success: true,
      data: {
        childId: childId,
        userId: userId,
        connectedAt: connectedAt
      },
      message: 'LINE連携を記録しました'
    };
    
  } catch (error) {
    console.error('❌ LINE連携記録エラー:', error);
    return {
      success: false,
      message: 'LINE連携の記録に失敗しました',
      error: error.toString()
    };
  }
}

// =============================================================================
// 既存API関数（簡易実装）
// =============================================================================

/**
 * ログイン処理
 */
function handleLogin(params) {
  return {
    success: true,
    data: {
      token: 'gas-mock-token-' + Date.now(),
      user: {
        id: 1,
        name: '外壁リフォーム株式会社',
        email: params.email,
        role: 'franchise',
        childId: 'test-child-id'
      }
    },
    message: 'ログインに成功しました'
  };
}

/**
 * 通知設定取得
 */
function getNotificationSettings(childId) {
  return {
    success: true,
    data: {
      line: { enabled: false },
      email: { enabled: true, address: 'test@example.com' },
      sms: { enabled: false }
    }
  };
}

/**
 * 通知設定更新
 */
function updateNotificationSettings(childId, settings) {
  return {
    success: true,
    message: '通知設定を更新しました'
  };
}

/**
 * 案件取得（子ユーザー用）
 */
function getInquiriesForChildUser(childId) {
  return {
    success: true,
    data: []
  };
}

/**
 * 加盟店案件取得（親ユーザー用）
 */
function getFranchiseInquiries(franchiseId) {
  try {
    console.log('📋 加盟店案件取得開始:', franchiseId);
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const caseSheet = ss.getSheetByName('案件管理');
    
    if (!caseSheet) {
      // サンプルデータを返す
      return {
        success: true,
        data: generateSampleInquiries(franchiseId)
      };
    }
    
    const data = caseSheet.getDataRange().getValues();
    const headers = data[0];
    const inquiries = [];
    
    // 加盟店IDでフィルタリング
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowFranchiseId = row[headers.indexOf('加盟店ID')];
      
      if (rowFranchiseId === franchiseId) {
        inquiries.push({
          id: row[headers.indexOf('CV案件ID')],
          title: `${row[headers.indexOf('お客様名')]}様の${row[headers.indexOf('建物種別')]}工事`,
          customerName: row[headers.indexOf('お客様名')],
          location: row[headers.indexOf('エリア')],
          workType: row[headers.indexOf('建物種別')],
          status: mapStatusToInquiryStatus(row[headers.indexOf('ステータス')]),
          priority: 'medium',
          createdAt: row[headers.indexOf('割り当て日')] || new Date(),
          assignedChildId: row[headers.indexOf('担当子ユーザーID')],
          assignedChildName: getChildUserName(row[headers.indexOf('担当子ユーザーID')]),
          assignedAt: row[headers.indexOf('割り当て日')],
          desiredTiming: row[headers.indexOf('緊急度')] || '相談',
          description: row[headers.indexOf('備考')] || ''
        });
      }
    }
    
    return {
      success: true,
      data: inquiries
    };
    
  } catch (error) {
    console.error('❌ 加盟店案件取得エラー:', error);
    return {
      success: false,
      message: '案件データの取得に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * 加盟店子ユーザー一覧取得
 */
function getFranchiseChildUsers(franchiseId) {
  try {
    console.log('👥 加盟店子ユーザー取得開始:', franchiseId);
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!childUsersSheet) {
      // サンプルデータを返す
      return generateSampleChildUsers(franchiseId);
    }
    
    const data = childUsersSheet.getDataRange().getValues();
    const headers = data[0];
    const childUsers = [];
    
    // 加盟店IDでフィルタリング
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowFranchiseId = row[headers.indexOf('加盟店ID')];
      
      if (rowFranchiseId === franchiseId) {
        childUsers.push({
          id: row[headers.indexOf('子ユーザーID')],
          name: row[headers.indexOf('ユーザー名')],
          role: row[headers.indexOf('役職')] || '営業担当',
          experience: row[headers.indexOf('経験年数')] || '未設定',
          status: row[headers.indexOf('ステータス')] || 'アクティブ',
          activeCases: getActiveCasesCount(row[headers.indexOf('子ユーザーID')])
        });
      }
    }
    
    return childUsers;
    
  } catch (error) {
    console.error('❌ 加盟店子ユーザー取得エラー:', error);
    return generateSampleChildUsers(franchiseId);
  }
}

/**
 * 手動案件割り当て実行
 */
function executeManualChildAssignment(params) {
  try {
    console.log('🎯 手動案件割り当て実行:', params);
    
    const { inquiryId, childUserId } = params;
    
    if (!inquiryId || !childUserId) {
      return {
        success: false,
        message: '案件IDまたは子ユーザーIDが指定されていません'
      };
    }
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const caseSheet = ss.getSheetByName('案件管理');
    
    if (!caseSheet) {
      return {
        success: true,
        message: '案件の割り当てが完了しました（サンプルモード）'
      };
    }
    
    const data = caseSheet.getDataRange().getValues();
    const headers = data[0];
    
    // 案件を見つけて更新
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowInquiryId = row[headers.indexOf('CV案件ID')];
      
      if (rowInquiryId === inquiryId) {
        // 担当子ユーザーIDを更新
        const childUserIdCol = headers.indexOf('担当子ユーザーID') + 1;
        const statusCol = headers.indexOf('ステータス') + 1;
        const updateDateCol = headers.indexOf('最終更新日') + 1;
        
        caseSheet.getRange(i + 1, childUserIdCol).setValue(childUserId);
        caseSheet.getRange(i + 1, statusCol).setValue('割当済');
        caseSheet.getRange(i + 1, updateDateCol).setValue(new Date());
        
        // 子ユーザーに通知送信
        sendChildUserAssignmentNotification(childUserId, inquiryId, row);
        
        break;
      }
    }
    
    return {
      success: true,
      message: '案件の割り当てが完了しました'
    };
    
  } catch (error) {
    console.error('❌ 手動案件割り当てエラー:', error);
    return {
      success: false,
      message: '案件の割り当てに失敗しました',
      error: error.toString()
    };
  }
}

/**
 * サンプル案件データ生成
 */
function generateSampleInquiries(franchiseId) {
  const sampleInquiries = [
    {
      id: 'INQ001',
      title: '田中様の戸建て外壁塗装',
      customerName: '田中太郎',
      location: '東京都渋谷区',
      workType: '外壁塗装',
      status: 'pending_assignment',
      priority: 'high',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      desiredTiming: '来月中',
      description: '築15年の戸建て住宅。外壁の劣化が目立つため塗装を希望'
    },
    {
      id: 'INQ002',
      title: '佐藤様のマンション外壁塗装',
      customerName: '佐藤花子',
      location: '東京都新宿区',
      workType: '外壁塗装',
      status: 'assigned',
      priority: 'medium',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      assignedChildId: 'CHILD001',
      assignedChildName: '山田営業',
      assignedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      desiredTiming: '3ヶ月以内',
      description: 'マンションの外壁塗装。管理組合承認済み'
    },
    {
      id: 'INQ003',
      title: '鈴木様の屋根工事',
      customerName: '鈴木一郎',
      location: '東京都品川区',
      workType: '屋根工事',
      status: 'in_progress',
      priority: 'medium',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      assignedChildId: 'CHILD002',
      assignedChildName: '田中営業',
      assignedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      desiredTiming: '急ぎ',
      description: '雨漏りのため緊急性あり'
    }
  ];
  
  return sampleInquiries;
}

/**
 * サンプル子ユーザーデータ生成
 */
function generateSampleChildUsers(franchiseId) {
  return [
    {
      id: 'CHILD001',
      name: '山田営業',
      role: '営業担当',
      experience: '5年',
      status: 'アクティブ',
      activeCases: 3
    },
    {
      id: 'CHILD002',
      name: '田中営業',
      role: '営業主任',
      experience: '8年',
      status: 'アクティブ',
      activeCases: 2
    },
    {
      id: 'CHILD003',
      name: '鈴木営業',
      role: '営業担当',
      experience: '2年',
      status: 'アクティブ',
      activeCases: 1
    }
  ];
}

/**
 * ステータスマッピング
 */
function mapStatusToInquiryStatus(status) {
  const statusMap = {
    '新規': 'new',
    '手動振り分け待ち': 'pending_assignment',
    '割当済': 'assigned',
    '対応中': 'in_progress',
    '見積済': 'quoted',
    '完了': 'completed',
    'キャンセル': 'cancelled'
  };
  
  return statusMap[status] || 'pending_assignment';
}

/**
 * 子ユーザー名取得
 */
function getChildUserName(childUserId) {
  if (!childUserId) return null;
  
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!childUsersSheet) return childUserId;
    
    const data = childUsersSheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[headers.indexOf('子ユーザーID')] === childUserId) {
        return row[headers.indexOf('ユーザー名')];
      }
    }
    
    return childUserId;
  } catch (error) {
    return childUserId;
  }
}

/**
 * アクティブ案件数取得
 */
function getActiveCasesCount(childUserId) {
  if (!childUserId) return 0;
  
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const caseSheet = ss.getSheetByName('案件管理');
    
    if (!caseSheet) return Math.floor(Math.random() * 5);
    
    const data = caseSheet.getDataRange().getValues();
    const headers = data[0];
    let count = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const assignedUserId = row[headers.indexOf('担当子ユーザーID')];
      const status = row[headers.indexOf('ステータス')];
      
      if (assignedUserId === childUserId && 
          (status === '対応中' || status === '割当済')) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    return Math.floor(Math.random() * 5);
  }
}

/**
 * 子ユーザーへの割り当て通知送信
 */
function sendChildUserAssignmentNotification(childUserId, inquiryId, caseData) {
  try {
    const customerName = caseData[4] || 'お客様'; // お客様名の列インデックス
    const area = caseData[5] || ''; // エリアの列インデックス
    
    // LINE通知送信（子ユーザーのLINE IDが分かる場合）
    const lineUserId = getChildUserLineId(childUserId);
    if (lineUserId) {
      const message = `🎯 新規案件が割り当てられました\n\n案件ID: ${inquiryId}\nお客様: ${customerName}様\nエリア: ${area}\n\n速やかにご対応をお願いします。`;
      sendLinePushMessage(lineUserId, message);
    }
    
    // Slack通知
    if (typeof sendSlackNotification === 'function') {
      const slackMessage = `📋 案件割り当て完了\n\n案件ID: ${inquiryId}\n担当者: ${getChildUserName(childUserId)}\nお客様: ${customerName}様\nエリア: ${area}`;
      sendSlackNotification(slackMessage);
    }
    
  } catch (error) {
    console.error('❌ 子ユーザー割り当て通知エラー:', error);
  }
}

/**
 * 子ユーザーのLINE ID取得
 */
function getChildUserLineId(childUserId) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const lineConnectionSheet = ss.getSheetByName('LineConnections');
    
    if (!lineConnectionSheet) return null;
    
    const data = lineConnectionSheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[headers.indexOf('childId')] === childUserId && 
          row[headers.indexOf('status')] === 'connected') {
        return row[headers.indexOf('userId')];
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 案件回答
 */
function respondToInquiry(childId, params) {
  return {
    success: true,
    message: '回答を送信しました'
  };
}

// =============================================================================
// LINEテンプレート管理API
// =============================================================================

/**
 * LINEテンプレート取得
 */
function getLineTemplates(childId) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let templateSheet = ss.getSheetByName('LineTemplates');
    
    // デフォルトテンプレート（line-notification-templates.gsから取得）
    const defaultTemplates = LINE_TEMPLATES;
    const customTemplates = {};
    
    // カスタムテンプレートの取得
    if (templateSheet) {
      const data = templateSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const templateType = data[i][0];
        const style = data[i][1];
        const content = data[i][2];
        customTemplates[`${templateType}_${style}`] = content;
      }
    }
    
    return {
      success: true,
      data: {
        templates: defaultTemplates,
        customTemplates: customTemplates
      }
    };
    
  } catch (error) {
    console.error('❌ テンプレート取得エラー:', error);
    return {
      success: false,
      message: 'テンプレートの取得に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * LINEテンプレート保存
 */
function saveLineTemplate(params) {
  try {
    const { templateType, style, content } = params;
    
    return saveCustomLineTemplate(templateType, style, content);
    
  } catch (error) {
    console.error('❌ テンプレート保存エラー:', error);
    return {
      success: false,
      message: 'テンプレートの保存に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * AIテンプレート生成
 */
function generateAITemplate(params) {
  try {
    const { templateType, style, customPrompt } = params;
    
    return generateTemplateWithAI(templateType, style, customPrompt);
    
  } catch (error) {
    console.error('❌ AIテンプレート生成エラー:', error);
    return {
      success: false,
      message: 'AIテンプレート生成に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * LINEテスト通知送信
 */
function testLineNotification(params) {
  try {
    const { templateType, style, variables } = params;
    
    // テスト用LINE User ID（実際の環境では適切に設定）
    const testUserId = getSystemSetting('TEST_LINE_USER_ID') || 'U90d261a80c65baa2d2afc42e9e9be00a';
    
    const result = sendFranchiseLineNotification(testUserId, templateType, style, variables, {
      isTest: true
    });
    
    return {
      success: result.success,
      data: result,
      message: result.success ? 'テスト通知を送信しました' : 'テスト通知の送信に失敗しました'
    };
    
  } catch (error) {
    console.error('❌ テスト通知エラー:', error);
    return {
      success: false,
      message: 'テスト通知の送信に失敗しました',
      error: error.toString()
    };
  }
}

// =============================================================================
// 通知テンプレート管理API（新規実装）
// =============================================================================

/**
 * GET /templates - 通知テンプレート一覧取得API
 * @return {Object} テンプレート一覧
 */
function getTemplatesAPI() {
  try {
    console.log('📋 通知テンプレート一覧取得');
    
    // テンプレート定義（基本テンプレート）
    const baseTemplates = {
      NEW_ASSIGNMENT: {
        formal: {
          title: "案件割り当て通知（敬語）",
          content: "{{customerName}}様の案件（{{area}}）が割り当てられました。\n期限：{{deadline}}\n予算：{{estimatedBudget}}\nご要望：{{customerRequests}}",
          variables: ["customerName", "area", "deadline", "estimatedBudget", "customerRequests"]
        },
        casual: {
          title: "案件割り当て通知（カジュアル）",
          content: "新しい案件だよ！\n{{customerName}}さん（{{area}}）\n期限：{{deadline}}\n予算：{{estimatedBudget}}",
          variables: ["customerName", "area", "deadline", "estimatedBudget"]
        }
      },
      CANCELLATION: {
        formal: {
          title: "キャンセル通知（敬語）",
          content: "{{customerName}}様の案件がキャンセルされました。\n理由：{{reason}}\n処理日：{{cancelDate}}",
          variables: ["customerName", "reason", "cancelDate"]
        },
        casual: {
          title: "キャンセル通知（カジュアル）",
          content: "案件キャンセルのお知らせ\n{{customerName}}さん - {{reason}}",
          variables: ["customerName", "reason"]
        }
      },
      STATUS_UPDATE: {
        formal: {
          title: "ステータス更新通知（敬語）",
          content: "案件{{inquiryId}}のステータスが「{{newStatus}}」に更新されました。\n更新日時：{{updateDate}}",
          variables: ["inquiryId", "newStatus", "updateDate"]
        },
        casual: {
          title: "ステータス更新通知（カジュアル）",
          content: "案件{{inquiryId}}が{{newStatus}}になったよ！",
          variables: ["inquiryId", "newStatus"]
        }
      }
    };
    
    // カスタムテンプレートをスプレッドシートから取得
    const customTemplates = getCustomTemplatesFromSheet();
    
    return {
      success: true,
      data: {
        templates: baseTemplates,
        customTemplates: customTemplates,
        availableVariables: {
          common: ["customerName", "area", "receivedDate", "deadline"],
          assignment: ["estimatedBudget", "customerRequests", "assignedDate"],
          cancellation: ["reason", "cancelDate", "refundAmount"],
          status: ["inquiryId", "newStatus", "oldStatus", "updateDate"]
        }
      },
      message: "テンプレート一覧を取得しました"
    };
    
  } catch (error) {
    console.error('❌ テンプレート一覧取得エラー:', error);
    return {
      success: false,
      message: 'テンプレート一覧の取得に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * POST /templates/preview - テンプレートプレビューAPI
 * @param {Object} params - プレビューパラメータ
 * @return {Object} プレビュー結果
 */
function getTemplatePreviewAPI(params) {
  try {
    console.log('👁️ テンプレートプレビュー生成:', params);
    
    const { templateType, style, variables, customTemplate } = params;
    
    if (!templateType || !style) {
      return {
        success: false,
        message: 'templateType と style は必須です'
      };
    }
    
    var templateContent;
    
    // カスタムテンプレートが指定されている場合
    if (customTemplate) {
      templateContent = customTemplate;
    } else {
      // 基本テンプレートから取得
      const templates = getTemplatesAPI().data.templates;
      
      if (!templates[templateType] || !templates[templateType][style]) {
        return {
          success: false,
          message: `指定されたテンプレート (${templateType}/${style}) が見つかりません`
        };
      }
      
      templateContent = templates[templateType][style].content;
    }
    
    // 変数置換処理
    var previewText = templateContent;
    
    if (variables && typeof variables === 'object') {
      Object.keys(variables).forEach(function(key) {
        const placeholder = '{{' + key + '}}';
        const value = variables[key] || '';
        previewText = previewText.replace(new RegExp(placeholder, 'g'), value);
      });
    }
    
    // 未置換の変数をチェック
    const unreplacedVariables = [];
    const variablePattern = /\{\{([^}]+)\}\}/g;
    var match;
    while ((match = variablePattern.exec(previewText)) !== null) {
      unreplacedVariables.push(match[1]);
    }
    
    return {
      success: true,
      data: {
        originalTemplate: templateContent,
        previewText: previewText,
        appliedVariables: variables || {},
        unreplacedVariables: unreplacedVariables,
        characterCount: previewText.length
      },
      message: 'プレビューを生成しました'
    };
    
  } catch (error) {
    console.error('❌ テンプレートプレビューエラー:', error);
    return {
      success: false,
      message: 'プレビューの生成に失敗しました',
      error: error.toString()
    };
  }
}

/**
 * カスタムテンプレートをスプレッドシートから取得
 * @return {Object} カスタムテンプレート
 */
function getCustomTemplatesFromSheet() {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      console.log('⚠️ SPREADSHEET_ID未設定 - カスタムテンプレートをスキップ');
      return {};
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let templateSheet = ss.getSheetByName('LineTemplates');
    
    // シートが存在しない場合は作成
    if (!templateSheet) {
      templateSheet = ss.insertSheet('LineTemplates');
      templateSheet.getRange(1, 1, 1, 6).setValues([
        ['templateType', 'style', 'title', 'content', 'variables', 'createdAt']
      ]);
      console.log('📋 LineTemplatesシートを作成しました');
      return {};
    }
    
    const data = templateSheet.getDataRange().getValues();
    const customTemplates = {};
    
    // ヘッダー行をスキップ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const templateType = row[0];
      const style = row[1];
      const title = row[2];
      const content = row[3];
      const variables = row[4] ? row[4].split(',').map(v => v.trim()) : [];
      
      if (templateType && style && content) {
        if (!customTemplates[templateType]) {
          customTemplates[templateType] = {};
        }
        
        customTemplates[templateType][style] = {
          title: title,
          content: content,
          variables: variables,
          isCustom: true
        };
      }
    }
    
    return customTemplates;
    
  } catch (error) {
    console.error('❌ カスタムテンプレート取得エラー:', error);
    return {};
  }
}

/**
 * GPT API を使用したテンプレート自動生成
 * @param {string} templateType - テンプレート種別
 * @param {string} style - 文体
 * @param {string} customPrompt - カスタムプロンプト
 * @return {Object} 生成結果
 */
function generateTemplateWithGPT(templateType, style, customPrompt) {
  try {
    console.log('🤖 GPT テンプレート生成開始:', { templateType, style, customPrompt });
    
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      console.log('⚠️ OPENAI_API_KEY未設定 - モックテンプレートを返します');
      return generateMockTemplate(templateType, style);
    }
    
    // GPT用プロンプトの構築
    /*
    プロンプト例:
    
    外壁塗装業界の営業担当者向けのLINE通知テンプレートを作成してください。
    
    テンプレート種別: NEW_ASSIGNMENT (新規案件割り当て)
    文体: formal (敬語・丁寧語)
    
    以下の変数を使用できます:
    - {{customerName}}: 顧客名
    - {{area}}: 地域
    - {{estimatedBudget}}: 予算
    - {{deadline}}: 対応期限
    - {{customerRequests}}: 顧客要望
    
    要件:
    - 150文字以内
    - 営業担当者が即座に理解できる内容
    - 緊急度が伝わる表現
    - 顧客情報が適切に配置されている
    
    出力形式: プレーンテキストで変数を{{変数名}}形式で含む
    */
    
    var systemPrompt = "あなたは外壁塗装業界の営業支援システムの専門家です。営業担当者向けのLINE通知テンプレートを作成してください。";
    
    var userPrompt = `テンプレート種別: ${templateType}
文体: ${style === 'formal' ? '敬語・丁寧語' : 'カジュアル・親しみやすい'}

${customPrompt || ''}

以下の変数を適切に使用してください:
- {{customerName}}: 顧客名
- {{area}}: 地域  
- {{estimatedBudget}}: 予算
- {{deadline}}: 対応期限
- {{customerRequests}}: 顧客要望

要件:
- 150文字以内
- 営業担当者が即座に理解できる内容
- 重要な情報が見逃されない構成
- LINEメッセージとして自然な文章

変数は{{変数名}}形式で記述してください。`;
    
    const url = 'https://api.openai.com/v1/chat/completions';
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
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
    
    console.log('🤖 GPT レスポンス:', responseCode, responseText);
    
    if (responseCode !== 200) {
      throw new Error(`GPT API エラー: ${responseCode} - ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    const generatedTemplate = data.choices[0].message.content.trim();
    
    // 生成されたテンプレートから変数を抽出
    const variables = [];
    const variablePattern = /\{\{([^}]+)\}\}/g;
    var match;
    while ((match = variablePattern.exec(generatedTemplate)) !== null) {
      if (variables.indexOf(match[1]) === -1) {
        variables.push(match[1]);
      }
    }
    
    return {
      success: true,
      data: {
        template: generatedTemplate,
        variables: variables,
        templateType: templateType,
        style: style,
        generatedBy: 'OpenAI GPT',
        generatedAt: new Date().toISOString()
      },
      message: 'GPTによるテンプレート生成が完了しました'
    };
    
  } catch (error) {
    console.error('❌ GPT テンプレート生成エラー:', error);
    
    // エラー時はモックテンプレートを返す
    console.log('🔄 モックテンプレートにフォールバック');
    return generateMockTemplate(templateType, style);
  }
}

/**
 * モックテンプレート生成（GPT API未設定時）
 * @param {string} templateType - テンプレート種別
 * @param {string} style - 文体
 * @return {Object} モック生成結果
 */
function generateMockTemplate(templateType, style) {
  const mockTemplates = {
    NEW_ASSIGNMENT: {
      formal: "【案件割り当て】\n{{customerName}}様（{{area}}）の案件が割り当てられました。\n期限：{{deadline}}\n予算：{{estimatedBudget}}\nお客様のご要望：{{customerRequests}}\n\nよろしくお願いいたします。",
      casual: "新案件だよ！\n{{customerName}}さん@{{area}}\n期限：{{deadline}}\n予算：{{estimatedBudget}}\n頑張って！💪"
    },
    CANCELLATION: {
      formal: "【キャンセル通知】\n{{customerName}}様の案件がキャンセルされました。\n理由：{{reason}}\n処理日：{{cancelDate}}",
      casual: "案件キャンセル😢\n{{customerName}}さん\n理由：{{reason}}"
    }
  };
  
  const template = mockTemplates[templateType] && mockTemplates[templateType][style] 
    ? mockTemplates[templateType][style]
    : "{{customerName}}様の{{templateType}}通知です。";
  
  // 変数抽出
  const variables = [];
  const variablePattern = /\{\{([^}]+)\}\}/g;
  var match;
  while ((match = variablePattern.exec(template)) !== null) {
    if (variables.indexOf(match[1]) === -1) {
      variables.push(match[1]);
    }
  }
  
  return {
    success: true,
    data: {
      template: template,
      variables: variables,
      templateType: templateType,
      style: style,
      generatedBy: 'Mock Generator',
      generatedAt: new Date().toISOString(),
      isMock: true
    },
    message: 'モックテンプレートを生成しました（GPT API未設定）'
  };
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * システム設定取得
 * @param {string} key - 設定キー
 * @return {string} 設定値
 */
function getSystemSetting(key) {
  try {
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (error) {
    console.error(`❌ システム設定取得エラー (${key}):`, error);
    return null;
  }
}

/**
 * デバッグ用：LINEテンプレートシステム動作テスト
 */
function testLineTemplateSystem() {
  console.log('🧪 LINEテンプレートシステム テスト開始');
  
  // 1. テンプレート一覧取得テスト
  console.log('📋 テンプレート一覧取得テスト');
  const templatesResult = getTemplatesAPI();
  console.log('結果:', templatesResult);
  
  // 2. プレビュー生成テスト
  console.log('👁️ プレビュー生成テスト');
  const previewParams = {
    templateType: 'NEW_ASSIGNMENT',
    style: 'formal',
    variables: {
      customerName: '田中',
      area: '東京都渋谷区',
      deadline: '2024/06/10 17:00',
      estimatedBudget: '150万円',
      customerRequests: '外壁の塗り替えを希望'
    }
  };
  const previewResult = getTemplatePreviewAPI(previewParams);
  console.log('結果:', previewResult);
  
  // 3. GPTテンプレート生成テスト
  console.log('🤖 GPTテンプレート生成テスト');
  const gptResult = generateTemplateWithGPT('NEW_ASSIGNMENT', 'casual', '親しみやすい雰囲気で');
  console.log('結果:', gptResult);
  
  console.log('✅ LINEテンプレートシステム テスト完了');
}

// =============================================================================
// 通知履歴管理機能
// =============================================================================

/**
 * 通知履歴を記録
 * @param {string} userId - ユーザーID
 * @param {string} templateType - テンプレートタイプ
 * @param {string} style - スタイル
 * @param {Object} variables - 変数
 * @param {Object} result - 送信結果
 */
function recordNotificationHistory(userId, templateType, style, variables, result) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let historySheet = ss.getSheetByName('通知履歴');
    
    // シートが存在しない場合は作成
    if (!historySheet) {
      historySheet = ss.insertSheet('通知履歴');
      historySheet.getRange(1, 1, 1, 8).setValues([
        ['送信日時', 'ユーザーID', 'テンプレート種別', 'スタイル', '変数', '送信結果', 'エラー内容', 'メッセージ長']
      ]);
      
      // ヘッダー行の書式設定
      const headerRange = historySheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f0f0f0');
      
      // 列幅を調整
      historySheet.setColumnWidth(1, 150); // 送信日時
      historySheet.setColumnWidth(2, 120); // ユーザーID
      historySheet.setColumnWidth(3, 150); // テンプレート種別
      historySheet.setColumnWidth(4, 100); // スタイル
      historySheet.setColumnWidth(5, 300); // 変数
      historySheet.setColumnWidth(6, 100); // 送信結果
      historySheet.setColumnWidth(7, 200); // エラー内容
      historySheet.setColumnWidth(8, 100); // メッセージ長
    }
    
    // 履歴データ追加
    historySheet.appendRow([
      new Date().toISOString(),
      userId,
      templateType,
      style,
      JSON.stringify(variables),
      result.success || false,
      result.error || '',
      (result.message || '').length
    ]);
    
    // 古い履歴削除（30日以上前）
    cleanupOldNotificationHistory();
    
  } catch (error) {
    console.error('❌ 通知履歴記録エラー:', error);
  }
}

/**
 * 古い通知履歴をクリーンアップ（30日以上前のデータを削除）
 */
function cleanupOldNotificationHistory() {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const historySheet = ss.getSheetByName('通知履歴');
    
    if (!historySheet) return;
    
    const data = historySheet.getDataRange().getValues();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30日前
    
    // ヘッダー行を除く
    const rowsToDelete = [];
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][0]); // 送信日時
      if (rowDate < cutoffDate) {
        rowsToDelete.push(i + 1); // 1ベースのインデックス
      }
    }
    
    // 後ろから削除（インデックスの変更を避けるため）
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      historySheet.deleteRow(rowsToDelete[i]);
    }
    
    if (rowsToDelete.length > 0) {
      console.log(`🗑️ 古い通知履歴 ${rowsToDelete.length} 件を削除しました`);
    }
    
  } catch (error) {
    console.error('❌ 通知履歴クリーンアップエラー:', error);
  }
}

/**
 * 通知履歴の取得
 * @param {string} userId - ユーザーID（オプション）
 * @param {number} limit - 取得件数（デフォルト: 100）
 * @returns {Array} 通知履歴の配列
 */
function getNotificationHistory(userId = null, limit = 100) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const historySheet = ss.getSheetByName('通知履歴');
    
    if (!historySheet) {
      return { success: true, data: [] };
    }
    
    const data = historySheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // ユーザーIDでフィルタ
    let filteredRows = rows;
    if (userId) {
      filteredRows = rows.filter(row => row[1] === userId); // ユーザーID列
    }
    
    // 日付で降順ソート
    filteredRows.sort((a, b) => new Date(b[0]) - new Date(a[0]));
    
    // 件数制限
    if (limit > 0) {
      filteredRows = filteredRows.slice(0, limit);
    }
    
    // オブジェクト形式に変換
    const history = filteredRows.map(row => ({
      送信日時: row[0],
      ユーザーID: row[1],
      テンプレート種別: row[2],
      スタイル: row[3],
      変数: row[4],
      送信結果: row[5],
      エラー内容: row[6],
      メッセージ長: row[7]
    }));
    
    return {
      success: true,
      data: history,
      total: filteredRows.length
    };
    
  } catch (error) {
    console.error('❌ 通知履歴取得エラー:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// =============================================================================
// 案件振り分け通知システム
// =============================================================================

/**
 * 加盟店案件振り分け通知（メイン関数）
 * @param {Object} params - 振り分けパラメータ
 * @returns {Object} 通知結果
 */
function notifyFranchiseAssignment(params) {
  try {
    const { cvCaseId, selectedFranchises, caseData } = params;
    console.log('📋 案件振り分け通知開始:', cvCaseId);
    
    const results = [];
    
    // 各選択加盟店に対して振り分け処理
    for (const franchise of selectedFranchises) {
      const franchiseId = franchise.franchiseId || franchise.id;
      
      // 振り分け設定を取得
      const settings = getFranchiseNotificationSettings(franchiseId);
      
      if (settings.assignmentMode === '自動') {
        // 自動振り分け: 親子同時通知
        const result = processAutoAssignment(cvCaseId, franchiseId, caseData, settings);
        results.push(result);
      } else {
        // 手動振り分け: 親のみ通知
        const result = processManualAssignment(cvCaseId, franchiseId, caseData, settings);
        results.push(result);
      }
    }
    
    // 管理者向けSlack通知
    sendAssignmentSlackSummary(cvCaseId, selectedFranchises, results);
    
    return {
      success: true,
      cvCaseId: cvCaseId,
      assignmentResults: results,
      totalFranchises: selectedFranchises.length
    };
    
  } catch (error) {
    console.error('❌ 案件振り分け通知エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 自動振り分け処理（親子同時通知）
 */
function processAutoAssignment(cvCaseId, franchiseId, caseData, settings) {
  try {
    console.log(`🤖 自動振り分け処理: ${franchiseId}`);
    
    // 加盟店情報取得
    const franchiseInfo = getFranchiseInfo(franchiseId);
    const notifications = [];
    
    // 親ユーザーに通知
    if (franchiseInfo.parentUserId) {
      const message = createAssignmentMessage('PARENT_AUTO', cvCaseId, caseData, franchiseInfo);
      const parentResult = sendMultiChannelNotification(franchiseInfo.parentUserId, message, settings);
      notifications.push({
        target: 'parent',
        userId: franchiseInfo.parentUserId,
        result: parentResult
      });
    }
    
    // 子ユーザーに同時通知
    for (const childUser of franchiseInfo.childUsers || []) {
      if (childUser.status === 'アクティブ') {
        const message = createAssignmentMessage('CHILD_AUTO', cvCaseId, caseData, franchiseInfo);
        const childResult = sendMultiChannelNotification(childUser.userId, message, settings);
        notifications.push({
          target: 'child',
          userId: childUser.userId,
          result: childResult
        });
      }
    }
    
    // 案件管理システムに登録
    registerCaseToSystem(cvCaseId, franchiseId, caseData, '自動振り分け');
    
    return {
      success: true,
      franchiseId: franchiseId,
      assignmentMode: '自動',
      notifications: notifications
    };
    
  } catch (error) {
    console.error(`❌ 自動振り分け処理エラー (${franchiseId}):`, error);
    return {
      success: false,
      franchiseId: franchiseId,
      error: error.message
    };
  }
}

/**
 * 手動振り分け処理（親のみ通知）
 */
function processManualAssignment(cvCaseId, franchiseId, caseData, settings) {
  try {
    console.log(`✋ 手動振り分け処理: ${franchiseId}`);
    
    // 加盟店情報取得
    const franchiseInfo = getFranchiseInfo(franchiseId);
    const notifications = [];
    
    // 親ユーザーのみに通知
    if (franchiseInfo.parentUserId) {
      const message = createAssignmentMessage('PARENT_MANUAL', cvCaseId, caseData, franchiseInfo);
      const parentResult = sendMultiChannelNotification(franchiseInfo.parentUserId, message, settings);
      notifications.push({
        target: 'parent',
        userId: franchiseInfo.parentUserId,
        result: parentResult
      });
    }
    
    // 案件管理システムに登録（手動振り分け待ち）
    registerCaseToSystem(cvCaseId, franchiseId, caseData, '手動振り分け待ち');
    
    return {
      success: true,
      franchiseId: franchiseId,
      assignmentMode: '手動',
      notifications: notifications,
      awaitingManualAssignment: true
    };
    
  } catch (error) {
    console.error(`❌ 手動振り分け処理エラー (${franchiseId}):`, error);
    return {
      success: false,
      franchiseId: franchiseId,
      error: error.message
    };
  }
}

/**
 * 案件振り分けメッセージ作成
 */
function createAssignmentMessage(messageType, cvCaseId, caseData, franchiseInfo) {
  const customerName = caseData.customerName || 'お客様';
  const area = caseData.address || caseData.area || '';
  const propertyType = caseData.propertyType || '戸建て';
  const budget = caseData.budget || '要相談';
  const urgency = caseData.urgency || '普通';
  
  const templates = {
    PARENT_AUTO: {
      line: `🎯 新規案件割り当て（自動）\n\n【案件情報】\n案件ID: ${cvCaseId}\nお客様: ${customerName}様\nエリア: ${area}\n建物: ${propertyType}\n予算: ${budget}\n緊急度: ${urgency}\n\n子ユーザーにも同時通知済みです。\n詳細は案件管理ページでご確認ください。`,
      email: `新規案件が自動で割り当てられました。\n\n案件ID: ${cvCaseId}\nお客様名: ${customerName}様\n対象エリア: ${area}\n建物種別: ${propertyType}\n予算: ${budget}\n\n子ユーザーにも通知しておりますので、速やかに対応をお願いいたします。`,
      sms: `【案件割り当て】${customerName}様（${area}）の案件が自動割り当てされました。案件ID: ${cvCaseId}`,
      subject: `【自動割り当て】新規案件のお知らせ - ${cvCaseId}`
    },
    PARENT_MANUAL: {
      line: `✋ 新規案件（手動振り分け要）\n\n【案件情報】\n案件ID: ${cvCaseId}\nお客様: ${customerName}様\nエリア: ${area}\n建物: ${propertyType}\n予算: ${budget}\n緊急度: ${urgency}\n\n管理画面で担当者を選択し、手動で振り分けてください。`,
      email: `新規案件の手動振り分けが必要です。\n\n案件ID: ${cvCaseId}\nお客様名: ${customerName}様\n対象エリア: ${area}\n建物種別: ${propertyType}\n予算: ${budget}\n\n管理画面にアクセスして適切な担当者に振り分けをお願いいたします。`,
      sms: `【要振り分け】${customerName}様（${area}）の案件。管理画面で担当者を選択してください。ID: ${cvCaseId}`,
      subject: `【要振り分け】新規案件のお知らせ - ${cvCaseId}`
    },
    CHILD_AUTO: {
      line: `🎯 新規案件担当のお知らせ\n\n【担当案件】\n案件ID: ${cvCaseId}\nお客様: ${customerName}様\nエリア: ${area}\n建物: ${propertyType}\n予算: ${budget}\n緊急度: ${urgency}\n\n速やかにお客様へご連絡をお願いします。\n案件管理ページで詳細をご確認ください。`,
      email: `新しい案件の担当になりました。\n\n案件ID: ${cvCaseId}\nお客様名: ${customerName}様\n対象エリア: ${area}\n建物種別: ${propertyType}\n予算: ${budget}\n\nお客様への初回連絡を速やかにお願いいたします。`,
      sms: `【新規担当】${customerName}様（${area}）の案件担当になりました。速やかにご連絡ください。ID: ${cvCaseId}`,
      subject: `【新規担当】案件割り当てのお知らせ - ${cvCaseId}`
    },
    CHILD_MANUAL_ASSIGNED: {
      line: `👨‍💼 案件割り当て完了\n\n【担当案件】\n案件ID: ${cvCaseId}\nお客様: ${customerName}様\nエリア: ${area}\n建物: ${propertyType}\n予算: ${budget}\n緊急度: ${urgency}\n\n親ユーザーより割り当てられました。\n速やかにお客様へご連絡をお願いします。`,
      email: `案件の割り当てが完了しました。\n\n案件ID: ${cvCaseId}\nお客様名: ${customerName}様\n対象エリア: ${area}\n建物種別: ${propertyType}\n予算: ${budget}\n\n担当案件として割り当てられましたので、お客様への対応をお願いいたします。`,
      sms: `【担当決定】${customerName}様（${area}）の案件担当に決定。速やかにご連絡ください。ID: ${cvCaseId}`,
      subject: `【担当決定】案件割り当て完了のお知らせ - ${cvCaseId}`
    }
  };
  
  return templates[messageType] || {
    line: `案件通知: ${cvCaseId}`,
    email: `案件に関する通知です。案件ID: ${cvCaseId}`,
    sms: `案件通知: ${cvCaseId}`,
    subject: `案件通知 - ${cvCaseId}`
  };
}

/**
 * マルチチャンネル通知送信
 */
function sendMultiChannelNotification(userId, message, settings) {
  try {
    const results = {
      line: { enabled: false, success: false },
      email: { enabled: false, success: false },
      sms: { enabled: false, success: false }
    };
    
    // LINE通知
    if (settings.lineEnabled) {
      results.line.enabled = true;
      const lineUserId = getUserLineId(userId);
      if (lineUserId) {
        const lineResult = sendLinePushMessage(lineUserId, message.line);
        results.line.success = lineResult.success;
        results.line.details = lineResult;
      }
    }
    
    // メール通知
    if (settings.emailEnabled) {
      results.email.enabled = true;
      const emailAddress = getUserEmailAddress(userId);
      if (emailAddress) {
        const emailResult = sendEmail(emailAddress, message.subject, message.email);
        results.email.success = emailResult.success;
        results.email.details = emailResult;
      }
    }
    
    // SMS通知
    if (settings.smsEnabled) {
      results.sms.enabled = true;
      const phoneNumber = getUserPhoneNumber(userId);
      if (phoneNumber) {
        const smsResult = sendSMS(phoneNumber, message.sms);
        results.sms.success = smsResult.success;
        results.sms.details = smsResult;
      }
    }
    
    const overallSuccess = Object.values(results).some(r => r.enabled && r.success);
    
    return {
      success: overallSuccess,
      userId: userId,
      results: results,
      sentAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ マルチチャンネル通知送信エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 案件をシステムに登録
 */
function registerCaseToSystem(cvCaseId, franchiseId, caseData, status) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let caseSheet = ss.getSheetByName('案件管理');
    
    // シートが存在しない場合は作成
    if (!caseSheet) {
      caseSheet = ss.insertSheet('案件管理');
      const headers = [
        'CV案件ID', '加盟店ID', '担当子ユーザーID', 'ステータス', 'お客様名',
        'エリア', '建物種別', '予算', '緊急度', '割り当て日', '最終更新日', '備考'
      ];
      caseSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = caseSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#2196F3');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      caseSheet.setFrozenRows(1);
      caseSheet.autoResizeColumns(1, headers.length);
    }
    
    // 案件データを追加
    const newRow = [
      cvCaseId,
      franchiseId,
      '', // 担当子ユーザーID（後で設定）
      status,
      caseData.customerName || '',
      caseData.address || caseData.area || '',
      caseData.propertyType || '戸建て',
      caseData.budget || '',
      caseData.urgency || '普通',
      new Date(),
      new Date(),
      `振り分け方式: ${status}`
    ];
    
    caseSheet.appendRow(newRow);
    console.log(`✅ 案件管理システムに登録: ${cvCaseId} → ${franchiseId}`);
    
  } catch (error) {
    console.error('❌ 案件管理システム登録エラー:', error);
  }
}

/**
 * 振り分け完了Slack通知
 */
function sendAssignmentSlackSummary(cvCaseId, selectedFranchises, results) {
  try {
    const successCount = results.filter(r => r.success).length;
    const autoCount = results.filter(r => r.assignmentMode === '自動').length;
    const manualCount = results.filter(r => r.assignmentMode === '手動').length;
    
    let message = `📋 *案件振り分け完了*\n\n`;
    message += `🆔 **案件ID**: ${cvCaseId}\n`;
    message += `🏢 **対象加盟店**: ${selectedFranchises.length}社\n`;
    message += `✅ **成功**: ${successCount}/${results.length}\n`;
    message += `🤖 **自動振り分け**: ${autoCount}社\n`;
    message += `✋ **手動振り分け**: ${manualCount}社\n\n`;
    
    if (manualCount > 0) {
      message += `⚠️ **手動振り分け待ちの案件があります**\n`;
      message += `管理画面で担当者を選択してください。`;
    }
    
    sendSlackNotification(message, {
      channel: 'assignments',
      priority: 'normal'
    });
    
  } catch (error) {
    console.error('❌ 振り分け完了Slack通知エラー:', error);
  }
}

// ==========================================
// キャンセル申請通知システム強化関数
// ==========================================

/**
 * キャンセル通知用Webhook確保（検証・作成・保存）
 */
function ensureCancelNotifyWebhook() {
  try {
    Logger.log('🔍 キャンセル通知Webhook確保開始');
    
    // 1. 既存Webhook確認
    const existingWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK');
    
    if (existingWebhook) {
      Logger.log('📌 既存Webhook発見、検証開始');
      
      // 既存Webhook検証
      const validationResult = validateCancelWebhook(existingWebhook);
      if (validationResult.success) {
        Logger.log('✅ 既存Webhook有効');
        return {
          success: true,
          webhookUrl: existingWebhook,
          source: 'existing_validated'
        };
      } else {
        Logger.log(`⚠️ 既存Webhook無効: ${validationResult.error}`);
      }
    }
    
    // 2. 一時的にメインWebhook使用
    Logger.log('🔄 メインWebhookで代替使用');
    const fallbackWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (fallbackWebhook) {
      Logger.log('🔄 一時的にメインWebhook使用');
      return {
        success: true,
        webhookUrl: fallbackWebhook,
        source: 'fallback_main_webhook',
        requiresManualSetup: true
      };
    }
    
    return {
      success: false,
      error: 'NO_WEBHOOK_AVAILABLE',
      message: 'キャンセル通知用WebhookもメインWebhookも利用できません'
    };
    
  } catch (error) {
    Logger.log(`❌ Webhook確保エラー: ${error.message}`);
    return {
      success: false,
      error: 'WEBHOOK_ENSURE_ERROR',
      message: error.message
    };
  }
}

/**
 * Webhook有効性検証
 */
function validateCancelWebhook(webhookUrl) {
  try {
    const testPayload = {
      text: '🧪 Webhook検証テスト（無視してください）',
      username: 'キャンセル通知テスト',
      icon_emoji: ':test_tube:'
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true, message: 'Webhook有効' };
    } else {
      return { 
        success: false, 
        error: `HTTP ${responseCode}: ${response.getContentText()}` 
      };
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: `検証エラー: ${error.message}` 
    };
  }
}

/**
 * #gpt通知エラー チャンネルへのエラー通知
 */
function notifyGptErrorChannel(errorMessage) {
  try {
    const gptErrorWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_GPT_ERROR_WEBHOOK') ||
                            PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!gptErrorWebhook) {
      Logger.log('⚠️ GPTエラー通知用Webhook未設定');
      return { success: false, error: 'NO_ERROR_WEBHOOK' };
    }
    
    const errorNotificationMessage = `🚨 **キャンセル通知システムエラー**

❌ **エラー内容**: ${errorMessage}
📅 **発生日時**: ${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss')}
🔧 **システム**: notify_fixed.gs

対応が必要です。`;
    
    const payload = {
      text: errorNotificationMessage,
      mrkdwn: true,
      username: 'キャンセル通知エラー',
      icon_emoji: ':warning:',
      channel: '#gpt通知エラー'
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(gptErrorWebhook, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ GPTエラーチャンネル通知送信成功');
      return { success: true, message: 'エラー通知送信成功' };
    } else {
      Logger.log(`❌ GPTエラーチャンネル通知送信失敗: HTTP ${responseCode}`);
      return { success: false, error: `HTTP ${responseCode}` };
    }
    
  } catch (error) {
    Logger.log(`❌ GPTエラーチャンネル通知エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * キャンセル通知Webhook手動設定用ヘルパー関数
 */
function setCancelNotifyWebhook(webhookUrl) {
  try {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      throw new Error('有効なWebhook URLを指定してください');
    }
    
    // URL形式の簡易検証
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('SlackのWebhook URLの形式が正しくありません');
    }
    
    // ScriptPropertiesに保存
    PropertiesService.getScriptProperties().setProperty('SLACK_CANCEL_NOTIFY_WEBHOOK', webhookUrl);
    
    Logger.log('✅ キャンセル通知Webhook設定完了');
    
    // 設定テスト
    const testResult = validateCancelWebhook(webhookUrl);
    
    return {
      success: true,
      message: 'キャンセル通知Webhook設定完了',
      webhookUrl: webhookUrl,
      validated: testResult.success,
      validationMessage: testResult.success ? '検証成功' : testResult.error,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ Webhook設定エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// ===========================================
// 統合システムテスト関数
// ===========================================

/**
 * 統合ハンドラーテスト
 */
function testNotifyUnifiedHandlers() {
  try {
    Logger.log('🔗 統合ハンドラーテスト開始');
    
    // 1. LINE Webhook判定テスト
    const mockLineEvent = {
      postData: {
        type: 'application/json',
        contents: JSON.stringify({
          events: [
            {
              type: 'message',
              message: { type: 'text', text: 'テスト' },
              source: { userId: 'TEST_USER_123' }
            }
          ]
        })
      }
    };
    
    const isLine = isLineWebhook(mockLineEvent);
    Logger.log(`LINE Webhook判定: ${isLine ? '✅' : '❌'}`);
    
    // 2. BOTイベント判定テスト
    const botEvent = { type: 'message' };
    const isBot = isFranchiseBotEvent(botEvent);
    Logger.log(`BOTイベント判定: ${isBot ? '✅' : '❌'}`);
    
    Logger.log('✅ 統合ハンドラーテスト完了');
    return { success: true };
    
  } catch (error) {
    Logger.log(`❌ 統合ハンドラーテストエラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * データベース整合性テスト
 */
function testDatabaseIntegrity() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requiredSheets = [
      '統合_質問リスト',
      '統合_回答記録',
      '統合_ユーザー状態',
      '統合_配信制御',
      '統合_エリア管理',
      '統合_AI例文テンプレート'
    ];
    
    let validSheets = 0;
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        validSheets++;
      } else {
        Logger.log(`⚠️ 欠損シート: ${sheetName}`);
      }
    });
    
    return {
      success: validSheets === requiredSheets.length,
      validSheets: validSheets,
      totalRequired: requiredSheets.length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 統合システム全体テスト
 */
function testEntireIntegratedSystem() {
  try {
    Logger.log('🧪 統合システム全体テスト開始');
    
    const results = [];
    
    // 1. 統合ハンドラーテスト
    Logger.log('--- 統合ハンドラーテスト ---');
    const handlerTest = testNotifyUnifiedHandlers();
    results.push({
      name: '統合ハンドラー',
      success: handlerTest.success,
      details: handlerTest.success ? '判定ロジック正常' : handlerTest.error
    });
    
    // 2. BOTシステムテスト
    Logger.log('--- BOTシステムテスト ---');
    const botTest = testIntegratedFranchiseHearingSystem();
    results.push({
      name: 'BOTシステム',
      success: botTest.success,
      details: botTest.success ? botTest.message : botTest.error
    });
    
    // 3. データベース整合性テスト
    Logger.log('--- データベース整合性テスト ---');
    const dbTest = testDatabaseIntegrity();
    results.push({
      name: 'データベース整合性',
      success: dbTest.success,
      details: dbTest.success ? `${dbTest.validSheets}個のシート確認` : dbTest.error
    });
    
    // 結果集計
    const totalTests = results.length;
    const successfulTests = results.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ 統合システム全体テスト完了');
    
    return {
      success: true,
      summary: {
        totalTests: totalTests,
        successfulTests: successfulTests,
        successRate: `${successRate}%`
      },
      results: results,
      message: `統合システムテスト: ${successfulTests}/${totalTests} 成功`
    };
    
  } catch (error) {
    Logger.log(`❌ 統合システム全体テストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * BOTイベント処理（kuraberu-backend LINE連携）
 * @param {Object} event LINE イベント
 * @returns {Object} 処理結果
 */
function processBotEvent(event) {
  try {
    const userId = event.source.userId;
    console.log(`🤖 BOT処理開始: ${userId}`);
    
    // メッセージタイプ別処理
    if (event.type === 'message') {
      return processMessageEvent(event);
    } else if (event.type === 'postback') {
      return processPostbackEvent(event);
    } else {
      return {
        success: true,
        userId: userId,
        eventType: event.type,
        message: 'その他のイベント',
        processed: true
      };
    }
    
  } catch (error) {
    console.error('❌ BOT処理エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * メッセージイベント処理
 * @param {Object} event メッセージイベント
 * @returns {Object} 処理結果
 */
function processMessageEvent(event) {
  try {
    const userId = event.source.userId;
    const messageText = event.message.text;
    
    console.log(`📝 メッセージ処理: ${userId} - "${messageText}"`);
    
    // 簡単な自動応答（拡張可能）
    let replyText = 'メッセージを受信しました。';
    
    if (messageText.includes('こんにちは') || messageText.includes('hello')) {
      replyText = 'こんにちは！外壁塗装くらべるAIです。';
    } else if (messageText.includes('料金') || messageText.includes('価格')) {
      replyText = '料金についてのお問い合わせありがとうございます。詳細をご案内いたします。';
    }
    
    // LINE応答送信（オプション）
    // sendLineReply(event.replyToken, replyText);
    
    return {
      success: true,
      userId: userId,
      messageText: messageText,
      replyText: replyText,
      processed: true
    };
    
  } catch (error) {
    console.error('❌ メッセージ処理エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ポストバックイベント処理
 * @param {Object} event ポストバックイベント
 * @returns {Object} 処理結果
 */
function processPostbackEvent(event) {
  try {
    const userId = event.source.userId;
    const postbackData = event.postback.data;
    
    console.log(`🎯 ポストバック処理: ${userId} - "${postbackData}"`);
    
    // ポストバックデータの解析と処理
    let actionResult = '選択を受け付けました。';
    
    if (postbackData.includes('quote')) {
      actionResult = '見積もり依頼を承りました。';
    } else if (postbackData.includes('contact')) {
      actionResult = 'お問い合わせありがとうございます。';
    }
    
    return {
      success: true,
      userId: userId,
      postbackData: postbackData,
      actionResult: actionResult,
      processed: true
    };
    
  } catch (error) {
    console.error('❌ ポストバック処理エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * LINE応答送信（オプション機能）
 * @param {string} replyToken 応答トークン
 * @param {string} message メッセージ
 * @returns {Object} 送信結果
 */
function sendLineReply(replyToken, message) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
    if (!accessToken) {
      console.log('⚠️ LINE_ACCESS_TOKEN が設定されていません');
      return { success: false, error: 'TOKEN未設定' };
    }
    
    const requestBody = {
      replyToken: replyToken,
      messages: [{
        type: 'text',
        text: message
      }]
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestBody)
    };
    
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', options);
    
    return {
      success: response.getResponseCode() === 200,
      responseCode: response.getResponseCode()
    };
    
  } catch (error) {
    console.error('❌ LINE応答送信エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * kuraberu-backend LINE Webhook テスト
 * @returns {Object} テスト結果
 */
function testKuraberuBackendLineWebhook() {
  try {
    console.log('🧪 kuraberu-backend LINE Webhook テスト開始');
    
    // モックLINE Webhookイベント
    const mockEvent = {
      postData: {
        type: 'application/json',
        contents: JSON.stringify({
          events: [
            {
              type: 'message',
              message: {
                type: 'text',
                text: 'こんにちは'
              },
              source: {
                userId: 'TEST_USER_KURABERU'
              },
              replyToken: 'MOCK_REPLY_TOKEN'
            }
          ]
        })
      }
    };
    
    const result = doPost(mockEvent);
    console.log('テスト結果:', result.getContent());
    
    console.log('✅ kuraberu-backend LINE Webhook テスト完了');
    return { success: true };
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 設定状況確認
 */
function checkCancelNotificationConfig() {
  try {
    const cancelWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK');
    const mainWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    const gptErrorWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_GPT_ERROR_WEBHOOK');
    
    return {
      cancelNotifyWebhook: {
        configured: !!cancelWebhook,
        value: cancelWebhook ? '設定済み' : '未設定'
      },
      mainWebhook: {
        configured: !!mainWebhook,
        value: mainWebhook ? '設定済み' : '未設定'
      },
      gptErrorWebhook: {
        configured: !!gptErrorWebhook,
        value: gptErrorWebhook ? '設定済み' : '未設定（メインWebhookで代替）'
      },
      systemStatus: cancelWebhook ? '完全設定' : mainWebhook ? '一部設定（代替使用）' : '未設定',
      timestamp: new Date()
    };
    
  } catch (error) {
    return {
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * キャンセル通知システムテスト（GAS対応版）
 */
function testCancelNotificationSystem() {
  try {
    Logger.log('🧪 キャンセル通知システムテスト開始');
    
    // Webhook確保テスト（同期版使用）
    const webhookResult = ensureCancelNotifyWebhookSync();
    
    if (!webhookResult.success) {
      throw new Error(`Webhook確保失敗: ${webhookResult.error}`);
    }
    
    Logger.log('✅ キャンセル通知システムテスト完了');
    
    return {
      success: true,
      message: 'キャンセル通知システム基本機能確認完了',
      webhookStatus: webhookResult,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ テストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 統合通知システム総合テスト
 * 統合後の全機能をテストする包括的なテスト関数
 * 
 * @returns {Object} テスト結果
 */
function testIntegratedNotificationSystem() {
  try {
    Logger.log('🧪 統合通知システム総合テスト開始');
    
    const allTestResults = [];
    let overallSuccess = true;
    
    // 1. 通知対象ユーザー抽出システムテスト
    Logger.log('--- 通知対象ユーザー抽出システムテスト ---');
    const targetServiceTest = testNotificationTargetService();
    allTestResults.push({
      section: '通知対象ユーザー抽出システム',
      result: targetServiceTest
    });
    
    if (!targetServiceTest.success) {
      overallSuccess = false;
    }
    
    // 2. 統合通知送信テスト
    Logger.log('--- 統合通知送信テスト ---');
    try {
      const integrationTestMessage = `🧪 **統合システムテスト**

📋 **テスト対象**: 統合通知システム
📅 **実行日時**: ${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss')}
🎯 **目的**: 対象ユーザー抽出→送信→履歴記録の一連の流れをテスト

✅ このメッセージが正常に表示されていれば、統合通知システムは完全に動作しています。`;

      const integrationResult = sendIntegratedNotification(
        'system_alert',
        integrationTestMessage,
        {
          messageId: `INTEGRATION_TEST_${Date.now()}`,
          priority: 'low',
          senderId: 'integration_test_system'
        }
      );
      
      allTestResults.push({
        section: '統合通知送信',
        result: integrationResult
      });
      
      if (!integrationResult.success) {
        overallSuccess = false;
      }
      
    } catch (error) {
      Logger.log(`❌ 統合通知送信テストエラー: ${error.message}`);
      allTestResults.push({
        section: '統合通知送信',
        result: {
          success: false,
          error: error.message,
          timestamp: new Date()
        }
      });
      overallSuccess = false;
    }
    
    // 3. キャンセル通知システムテスト
    Logger.log('--- キャンセル通知システムテスト ---');
    const cancelTest = testCancelNotificationSystem();
    allTestResults.push({
      section: 'キャンセル通知システム',
      result: cancelTest
    });
    
    if (!cancelTest.success) {
      overallSuccess = false;
    }
    
    // 4. LINE送信機能テスト（childId変換含む）
    Logger.log('--- LINE送信機能テスト ---');
    try {
      // モックLINEユーザーでテスト
      const mockLineUser = {
        userId: 'child-12345678', // childId形式
        name: 'テストユーザー（LINE）'
      };
      
      const lineTestMessage = '🧪 LINE送信機能テスト - childId変換とAPI連携';
      const lineResult = sendLineToUser(mockLineUser, lineTestMessage, {});
      
      allTestResults.push({
        section: 'LINE送信機能（childId変換）',
        result: lineResult
      });
      
      if (!lineResult.success && lineResult.error !== 'LINE未連携') {
        // LINE未連携は想定内のエラーなので失敗としない
        overallSuccess = false;
      }
      
    } catch (error) {
      Logger.log(`❌ LINE送信機能テストエラー: ${error.message}`);
      allTestResults.push({
        section: 'LINE送信機能（childId変換）',
        result: {
          success: false,
          error: error.message,
          timestamp: new Date()
        }
      });
      overallSuccess = false;
    }
    
    // 5. サンプル通知実行テスト
    Logger.log('--- サンプル通知実行テスト ---');
    const sampleTest = executeSampleNotification('system_alert');
    allTestResults.push({
      section: 'サンプル通知実行',
      result: sampleTest
    });
    
    if (!sampleTest.success) {
      overallSuccess = false;
    }
    
    // テスト結果統計
    const totalSections = allTestResults.length;
    const successfulSections = allTestResults.filter(test => test.result.success || 
      (test.result.error && test.result.error === 'LINE未連携')).length;
    const failedSections = totalSections - successfulSections;
    const successRate = (successfulSections / totalSections * 100).toFixed(1);
    
    Logger.log('✅ 統合通知システム総合テスト完了');
    Logger.log(`📊 テスト結果: ${successfulSections}/${totalSections} セクション成功 (成功率: ${successRate}%)`);
    
    return {
      success: overallSuccess,
      summary: {
        totalSections: totalSections,
        successfulSections: successfulSections,
        failedSections: failedSections,
        successRate: `${successRate}%`,
        integrationComplete: true
      },
      testResults: allTestResults,
      timestamp: new Date(),
      message: `統合通知システム総合テスト完了: ${successfulSections}/${totalSections} セクション成功`
    };
    
  } catch (error) {
    Logger.log(`❌ 統合システムテストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
      message: '統合通知システム総合テストでエラーが発生しました'
    };
  }
}

// ==========================================
// セクション12: 通知対象ユーザー抽出・履歴管理機能（統合版）
// ==========================================

// ===========================================
// 通知対象ユーザー抽出機能
// ===========================================

/**
 * 通知種別ごとの対象ユーザー抽出
 * 
 * @param {string} notificationType 通知種別
 *   - 'cancel_request' - キャンセル申請通知
 *   - 'payment_reminder' - 未払いリマインド
 *   - 'system_alert' - システムアラート
 *   - 'assignment_notification' - 案件振り分け通知
 *   - 'franchise_update' - 加盟店更新通知
 * @returns {Object} 通知対象ユーザー情報
 *   {
 *     slack: [{ userId: 'U1234', channelId: '#general', name: 'ユーザー名' }],
 *     line: [{ userId: 'LINE123', name: 'ユーザー名', pushEnabled: true }],
 *     email: [{ email: 'user@example.com', name: 'ユーザー名' }],
 *     totalTargets: 10,
 *     extractedAt: Date
 *   }
 */
function getNotificationTargetsByType(notificationType) {
  try {
    Logger.log(`📬 通知対象ユーザー抽出開始: ${notificationType}`);
    
    // 通知範囲ユーザー一覧シート取得
    const targetSheet = getOrCreateNotificationTargetSheet();
    if (!targetSheet) {
      throw new Error('通知範囲ユーザー一覧シートの取得に失敗しました');
    }
    
    // シートデータ取得
    const data = targetSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // ヘッダーインデックス取得
    const headerIndex = getHeaderIndex(headers);
    
    // 通知種別に基づくフィルタリング
    const filteredUsers = filterUsersByNotificationType(rows, headerIndex, notificationType);
    
    // チャネル別に分類
    const targetsByChannel = categorizeUsersByChannel(filteredUsers, headerIndex);
    
    const result = {
      slack: targetsByChannel.slack,
      line: targetsByChannel.line,
      email: targetsByChannel.email,
      totalTargets: filteredUsers.length,
      notificationType: notificationType,
      extractedAt: new Date(),
      success: true
    };
    
    Logger.log(`✅ 対象ユーザー抽出完了: 合計${result.totalTargets}名`);
    Logger.log(`  - Slack: ${result.slack.length}名`);
    Logger.log(`  - LINE: ${result.line.length}名`);
    Logger.log(`  - Email: ${result.email.length}名`);
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ 通知対象ユーザー抽出エラー: ${error.message}`);
    return {
      slack: [],
      line: [],
      email: [],
      totalTargets: 0,
      notificationType: notificationType,
      extractedAt: new Date(),
      success: false,
      error: error.message
    };
  }
}

/**
 * 通知範囲ユーザー一覧シートの取得または作成
 * 
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} シートオブジェクト
 */
function getOrCreateNotificationTargetSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = '通知範囲ユーザー一覧';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`📄 ${sheetName}シートを新規作成`);
      sheet = ss.insertSheet(sheetName);
      
      // ヘッダー設定
      const headers = [
        'ユーザーID',
        'ユーザー名',
        '役割',
        'SlackユーザーID',
        'Slackチャンネル',
        'LINEユーザーID',
        'LINE通知有効',
        'メールアドレス',
        'メール通知有効',
        'キャンセル通知',
        '支払いリマインド',
        'システムアラート',
        '案件振り分け通知',
        '加盟店更新通知',
        'ステータス',
        '最終更新日'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4A90E2');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      
      // 列幅調整
      sheet.setColumnWidth(1, 120);  // ユーザーID
      sheet.setColumnWidth(2, 150);  // ユーザー名
      sheet.setColumnWidth(3, 100);  // 役割
      sheet.setColumnWidth(4, 150);  // SlackユーザーID
      sheet.setColumnWidth(5, 120);  // Slackチャンネル
      sheet.setColumnWidth(6, 150);  // LINEユーザーID
      sheet.setColumnWidth(7, 100);  // LINE通知有効
      sheet.setColumnWidth(8, 200);  // メールアドレス
      sheet.setColumnWidth(9, 120);  // メール通知有効
      sheet.setColumnWidth(10, 100); // キャンセル通知
      sheet.setColumnWidth(11, 120); // 支払いリマインド
      sheet.setColumnWidth(12, 120); // システムアラート
      sheet.setColumnWidth(13, 140); // 案件振り分け通知
      sheet.setColumnWidth(14, 140); // 加盟店更新通知
      sheet.setColumnWidth(15, 80);  // ステータス
      sheet.setColumnWidth(16, 120); // 最終更新日
      
      // サンプルデータ追加
      const sampleData = [
        [
          'ADMIN_001',
          '管理者テスト',
          '管理者',
          'U1234567890',
          '#キャンセル通知',
          'LINE_ADMIN_001',
          'TRUE',
          'admin@example.com',
          'TRUE',
          'TRUE',
          'TRUE',
          'TRUE',
          'FALSE',
          'FALSE',
          'アクティブ',
          new Date()
        ],
        [
          'MANAGER_001',
          'マネージャーテスト',
          'マネージャー',
          'U0987654321',
          '#gpt通知エラー',
          '',
          'FALSE',
          'manager@example.com',
          'TRUE',
          'TRUE',
          'TRUE',
          'TRUE',
          'TRUE',
          'TRUE',
          'アクティブ',
          new Date()
        ]
      ];
      
      sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      
      Logger.log(`✅ ${sheetName}シート作成完了`);
    }
    
    return sheet;
    
  } catch (error) {
    Logger.log(`❌ 通知範囲ユーザー一覧シート取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * ヘッダーインデックスマップ作成
 * 
 * @param {Array} headers ヘッダー配列
 * @returns {Object} ヘッダーインデックスマップ
 */
function getHeaderIndex(headers) {
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[header] = index;
  });
  
  return {
    userId: headerMap['ユーザーID'] || 0,
    userName: headerMap['ユーザー名'] || 1,
    role: headerMap['役割'] || 2,
    slackUserId: headerMap['SlackユーザーID'] || 3,
    slackChannel: headerMap['Slackチャンネル'] || 4,
    lineUserId: headerMap['LINEユーザーID'] || 5,
    lineEnabled: headerMap['LINE通知有効'] || 6,
    email: headerMap['メールアドレス'] || 7,
    emailEnabled: headerMap['メール通知有効'] || 8,
    cancelNotification: headerMap['キャンセル通知'] || 9,
    paymentReminder: headerMap['支払いリマインド'] || 10,
    systemAlert: headerMap['システムアラート'] || 11,
    assignmentNotification: headerMap['案件振り分け通知'] || 12,
    franchiseUpdate: headerMap['加盟店更新通知'] || 13,
    status: headerMap['ステータス'] || 14,
    lastUpdated: headerMap['最終更新日'] || 15
  };
}

/**
 * 通知種別に基づくユーザーフィルタリング
 * 
 * @param {Array} rows データ行
 * @param {Object} headerIndex ヘッダーインデックス
 * @param {string} notificationType 通知種別
 * @returns {Array} フィルタリング済みユーザー
 */
function filterUsersByNotificationType(rows, headerIndex, notificationType) {
  const notificationTypeMap = {
    'cancel_request': headerIndex.cancelNotification,
    'payment_reminder': headerIndex.paymentReminder,
    'system_alert': headerIndex.systemAlert,
    'assignment_notification': headerIndex.assignmentNotification,
    'franchise_update': headerIndex.franchiseUpdate
  };
  
  const targetColumnIndex = notificationTypeMap[notificationType];
  
  if (targetColumnIndex === undefined) {
    Logger.log(`⚠️ 不明な通知種別: ${notificationType}`);
    return [];
  }
  
  return rows.filter(row => {
    // ステータスがアクティブかつ、該当通知種別が有効
    const isActive = (row[headerIndex.status] || '').toString().toUpperCase().includes('アクティブ');
    const isNotificationEnabled = (row[targetColumnIndex] || '').toString().toUpperCase() === 'TRUE';
    
    return isActive && isNotificationEnabled;
  });
}

/**
 * ユーザーをチャネル別に分類
 * 
 * @param {Array} users フィルタリング済みユーザー
 * @param {Object} headerIndex ヘッダーインデックス
 * @returns {Object} チャネル別ユーザー
 */
function categorizeUsersByChannel(users, headerIndex) {
  const result = {
    slack: [],
    line: [],
    email: []
  };
  
  users.forEach(user => {
    const userName = user[headerIndex.userName] || '不明';
    const userId = user[headerIndex.userId] || '';
    
    // Slack
    const slackUserId = user[headerIndex.slackUserId] || '';
    const slackChannel = user[headerIndex.slackChannel] || '';
    if (slackUserId) {
      result.slack.push({
        userId: slackUserId,
        channelId: slackChannel,
        name: userName,
        internalUserId: userId
      });
    }
    
    // LINE
    const lineUserId = user[headerIndex.lineUserId] || '';
    const lineEnabled = (user[headerIndex.lineEnabled] || '').toString().toUpperCase() === 'TRUE';
    if (lineUserId && lineEnabled) {
      result.line.push({
        userId: lineUserId,
        name: userName,
        pushEnabled: lineEnabled,
        internalUserId: userId
      });
    }
    
    // Email
    const email = user[headerIndex.email] || '';
    const emailEnabled = (user[headerIndex.emailEnabled] || '').toString().toUpperCase() === 'TRUE';
    if (email && emailEnabled) {
      result.email.push({
        email: email,
        name: userName,
        internalUserId: userId
      });
    }
  });
  
  return result;
}

// ===========================================
// 通知履歴管理機能
// ===========================================

/**
 * 通知履歴への記録
 * 
 * @param {string} type 通知種別
 * @param {Object} targets 通知対象
 * @param {string} message 送信メッセージ
 * @param {Object} options 追加オプション
 * @returns {Object} 記録結果
 */
function logNotificationHistory(type, targets, message, options = {}) {
  try {
    Logger.log(`📝 通知履歴記録開始: ${type}`);
    
    const historySheet = getOrCreateNotificationHistorySheet();
    if (!historySheet) {
      throw new Error('通知履歴シートの取得に失敗しました');
    }
    
    const timestamp = new Date();
    const logId = generateNotificationLogId(timestamp);
    
    // メイン履歴レコード
    const mainRecord = [
      logId,                           // ログID
      timestamp,                       // 送信日時
      type,                           // 通知種別
      message.substring(0, 100) + (message.length > 100 ? '...' : ''), // メッセージ（短縮）
      targets.totalTargets || 0,      // 対象者数
      targets.slack?.length || 0,     // Slack送信数
      targets.line?.length || 0,      // LINE送信数
      targets.email?.length || 0,     // Email送信数
      options.status || '送信中',     // ステータス
      options.messageId || '',        // メッセージID（将来のテンプレート用）
      options.priority || 'normal',   // 優先度
      options.senderId || 'system',   // 送信者
      '',                             // エラー内容
      timestamp                       // 記録日時
    ];
    
    historySheet.appendRow(mainRecord);
    
    // 詳細履歴（チャネル別）
    logDetailedHistory(historySheet, logId, targets, timestamp);
    
    Logger.log(`✅ 通知履歴記録完了: ${logId}`);
    
    return {
      success: true,
      logId: logId,
      timestamp: timestamp,
      recordedTargets: targets.totalTargets || 0
    };
    
  } catch (error) {
    Logger.log(`❌ 通知履歴記録エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 通知履歴シートの取得または作成
 * 
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} シートオブジェクト
 */
function getOrCreateNotificationHistorySheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = '通知履歴';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`📄 ${sheetName}シートを新規作成`);
      sheet = ss.insertSheet(sheetName);
      
      // ヘッダー設定
      const headers = [
        'ログID',
        '送信日時',
        '通知種別',
        'メッセージ',
        '対象者数',
        'Slack送信数',
        'LINE送信数',
        'Email送信数',
        'ステータス',
        'メッセージID',
        '優先度',
        '送信者',
        'エラー内容',
        '記録日時'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#E67E22');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      
      // 列幅調整
      sheet.setColumnWidth(1, 150);  // ログID
      sheet.setColumnWidth(2, 140);  // 送信日時
      sheet.setColumnWidth(3, 120);  // 通知種別
      sheet.setColumnWidth(4, 300);  // メッセージ
      sheet.setColumnWidth(5, 80);   // 対象者数
      sheet.setColumnWidth(6, 100);  // Slack送信数
      sheet.setColumnWidth(7, 100);  // LINE送信数
      sheet.setColumnWidth(8, 100);  // Email送信数
      sheet.setColumnWidth(9, 80);   // ステータス
      sheet.setColumnWidth(10, 120); // メッセージID
      sheet.setColumnWidth(11, 80);  // 優先度
      sheet.setColumnWidth(12, 100); // 送信者
      sheet.setColumnWidth(13, 200); // エラー内容
      sheet.setColumnWidth(14, 140); // 記録日時
      
      Logger.log(`✅ ${sheetName}シート作成完了`);
    }
    
    return sheet;
    
  } catch (error) {
    Logger.log(`❌ 通知履歴シート取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * 詳細履歴の記録（チャネル別）
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} historySheet 履歴シート
 * @param {string} logId ログID
 * @param {Object} targets 通知対象
 * @param {Date} timestamp タイムスタンプ
 */
function logDetailedHistory(historySheet, logId, targets, timestamp) {
  try {
    // 詳細履歴用の別シートまたは同シート内の別範囲に記録
    // ここでは簡素化のためコメント形式で記録
    
    const detailComments = [];
    
    // Slack詳細
    if (targets.slack && targets.slack.length > 0) {
      targets.slack.forEach(user => {
        detailComments.push(`Slack: ${user.name} (${user.userId}) → ${user.channelId}`);
      });
    }
    
    // LINE詳細  
    if (targets.line && targets.line.length > 0) {
      targets.line.forEach(user => {
        detailComments.push(`LINE: ${user.name} (${user.userId})`);
      });
    }
    
    // Email詳細
    if (targets.email && targets.email.length > 0) {
      targets.email.forEach(user => {
        detailComments.push(`Email: ${user.name} (${user.email})`);
      });
    }
    
    // 詳細情報をメモとして最後の行に追加
    if (detailComments.length > 0) {
      const lastRow = historySheet.getLastRow();
      const noteCell = historySheet.getRange(lastRow, 4); // メッセージ列
      noteCell.setNote(`詳細送信先:\n${detailComments.join('\n')}`);
    }
    
  } catch (error) {
    Logger.log(`⚠️ 詳細履歴記録エラー: ${error.message}`);
  }
}

/**
 * 通知ログID生成
 * 
 * @param {Date} timestamp タイムスタンプ
 * @returns {string} ログID
 */
function generateNotificationLogId(timestamp) {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hour = String(timestamp.getHours()).padStart(2, '0');
  const minute = String(timestamp.getMinutes()).padStart(2, '0');
  const second = String(timestamp.getSeconds()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `LOG_${year}${month}${day}${hour}${minute}${second}_${random}`;
}

// ===========================================
// 通知履歴更新機能
// ===========================================

/**
 * 通知ステータス更新
 * 
 * @param {string} logId ログID
 * @param {string} status 新しいステータス
 * @param {string} errorMessage エラーメッセージ（オプション）
 * @returns {Object} 更新結果
 */
function updateNotificationStatus(logId, status, errorMessage = '') {
  try {
    const historySheet = getOrCreateNotificationHistorySheet();
    if (!historySheet) {
      throw new Error('通知履歴シートの取得に失敗しました');
    }
    
    const data = historySheet.getDataRange().getValues();
    
    // ログIDで該当行を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === logId) {
        // ステータス更新（列インデックス8）
        historySheet.getRange(i + 1, 9).setValue(status);
        
        // エラー内容更新（列インデックス12）
        if (errorMessage) {
          historySheet.getRange(i + 1, 13).setValue(errorMessage);
        }
        
        Logger.log(`✅ 通知ステータス更新完了: ${logId} → ${status}`);
        return {
          success: true,
          logId: logId,
          newStatus: status,
          updatedAt: new Date()
        };
      }
    }
    
    throw new Error(`ログID ${logId} が見つかりません`);
    
  } catch (error) {
    Logger.log(`❌ 通知ステータス更新エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// ===========================================
// テスト・ユーティリティ機能
// ===========================================

/**
 * 通知対象ユーザー抽出サービステスト
 * 
 * @returns {Object} テスト結果
 */
function testNotificationTargetService() {
  try {
    Logger.log('🧪 通知対象ユーザー抽出サービステスト開始');
    
    const testResults = [];
    
    // 1. 各通知種別でのユーザー抽出テスト
    const notificationTypes = [
      'cancel_request',
      'payment_reminder', 
      'system_alert',
      'assignment_notification',
      'franchise_update'
    ];
    
    Logger.log('--- 通知種別別ユーザー抽出テスト ---');
    for (const type of notificationTypes) {
      const targets = getNotificationTargetsByType(type);
      testResults.push({
        name: `ユーザー抽出: ${type}`,
        success: targets.success,
        details: targets.success 
          ? `合計${targets.totalTargets}名 (Slack:${targets.slack.length}, LINE:${targets.line.length}, Email:${targets.email.length})`
          : targets.error,
        data: targets
      });
      
      Logger.log(`${type}: ${targets.success ? '成功' : '失敗'} - ${testResults[testResults.length - 1].details}`);
    }
    
    // 2. 通知履歴記録テスト
    Logger.log('--- 通知履歴記録テスト ---');
    const testTargets = getNotificationTargetsByType('cancel_request');
    const testMessage = `🧪 テスト通知メッセージ - ${new Date().toISOString()}`;
    
    const historyResult = logNotificationHistory(
      'test_notification',
      testTargets,
      testMessage,
      {
        status: 'テスト送信',
        messageId: 'TEST_MSG_001',
        priority: 'low',
        senderId: 'test_system'
      }
    );
    
    testResults.push({
      name: '通知履歴記録',
      success: historyResult.success,
      details: historyResult.success 
        ? `ログID: ${historyResult.logId}, 対象: ${historyResult.recordedTargets}名`
        : historyResult.error
    });
    
    // 3. ステータス更新テスト
    if (historyResult.success) {
      Logger.log('--- ステータス更新テスト ---');
      const statusUpdateResult = updateNotificationStatus(
        historyResult.logId,
        'テスト完了',
        ''
      );
      
      testResults.push({
        name: 'ステータス更新',
        success: statusUpdateResult.success,
        details: statusUpdateResult.success 
          ? `${statusUpdateResult.logId} → ${statusUpdateResult.newStatus}`
          : statusUpdateResult.error
      });
    }
    
    // テスト統計
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ 通知対象ユーザー抽出サービステスト完了');
    
    return {
      success: true,
      summary: {
        totalTests: totalTests,
        successfulTests: successfulTests,
        failedTests: totalTests - successfulTests,
        successRate: `${successRate}%`
      },
      testResults: testResults,
      timestamp: new Date(),
      message: `テスト完了: ${successfulTests}/${totalTests} 成功 (成功率: ${successRate}%)`
    };
    
  } catch (error) {
    Logger.log(`❌ テストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * サンプル通知実行（全チャネルテスト）
 * 
 * @param {string} notificationType 通知種別
 * @returns {Object} 実行結果
 */
function executeSampleNotification(notificationType = 'system_alert') {
  try {
    Logger.log(`📢 サンプル通知実行: ${notificationType}`);
    
    // 対象ユーザー抽出
    const targets = getNotificationTargetsByType(notificationType);
    
    if (!targets.success) {
      throw new Error(`対象ユーザー抽出失敗: ${targets.error}`);
    }
    
    if (targets.totalTargets === 0) {
      throw new Error('通知対象ユーザーが見つかりません');
    }
    
    // サンプルメッセージ作成
    const message = `🧪 **サンプル通知テスト**

📋 **通知種別**: ${notificationType}
📅 **実行日時**: ${Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss')}
👥 **対象者数**: ${targets.totalTargets}名
📱 **チャネル**: Slack(${targets.slack.length}) / LINE(${targets.line.length}) / Email(${targets.email.length})

✅ このメッセージが表示されていれば、通知対象ユーザー抽出システムは正常に動作しています。`;
    
    // 履歴記録
    const historyResult = logNotificationHistory(
      notificationType,
      targets,
      message,
      {
        status: 'サンプル送信',
        messageId: `SAMPLE_${Date.now()}`,
        priority: 'low',
        senderId: 'notification_test_system'
      }
    );
    
    Logger.log(`✅ サンプル通知実行完了: ${historyResult.logId}`);
    
    return {
      success: true,
      targets: targets,
      message: message,
      historyLogId: historyResult.logId,
      executedAt: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ サンプル通知実行エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// ==========================================
// 統合通知ヘルパー関数
// ==========================================

/**
 * 統合通知送信ヘルパー
 * 統合通知システムによる対象ユーザー抽出→送信→履歴記録を一括処理
 * 
 * @param {string} notificationType 通知種別
 * @param {string} message 送信メッセージ
 * @param {Object} options 送信オプション
 * @returns {Object} 送信結果
 */
function sendIntegratedNotification(notificationType, message, options = {}) {
  try {
    Logger.log(`📬 統合通知送信開始: ${notificationType}`);
    
    // 1. 対象ユーザー抽出
    const targets = getNotificationTargetsByType(notificationType);
    if (!targets.success) {
      throw new Error(`対象ユーザー抽出失敗: ${targets.error}`);
    }
    
    if (targets.totalTargets === 0) {
      Logger.log(`⚠️ 通知対象ユーザーなし: ${notificationType}`);
      return {
        success: true,
        message: '通知対象ユーザーなし',
        targets: targets,
        skipped: true
      };
    }
    
    // 2. 履歴記録（送信前）
    const historyResult = logNotificationHistory(
      notificationType,
      targets,
      message,
      {
        status: '送信中',
        messageId: options.messageId || `MSG_${Date.now()}`,
        priority: options.priority || 'normal',
        senderId: options.senderId || 'system'
      }
    );
    
    const logId = historyResult.logId;
    const sendResults = {
      slack: { success: 0, failed: 0, results: [] },
      line: { success: 0, failed: 0, results: [] },
      email: { success: 0, failed: 0, results: [] }
    };
    
    // 3. Slack送信
    if (targets.slack.length > 0) {
      Logger.log(`📱 Slack送信開始: ${targets.slack.length}件`);
      for (const slackUser of targets.slack) {
        try {
          const slackResult = sendSlackToUser(slackUser, message, options);
          if (slackResult.success) {
            sendResults.slack.success++;
          } else {
            sendResults.slack.failed++;
          }
          sendResults.slack.results.push({
            user: slackUser,
            result: slackResult
          });
        } catch (error) {
          Logger.log(`❌ Slack送信エラー (${slackUser.name}): ${error.message}`);
          sendResults.slack.failed++;
          sendResults.slack.results.push({
            user: slackUser,
            result: { success: false, error: error.message }
          });
        }
      }
    }
    
    // 4. LINE送信
    if (targets.line.length > 0) {
      Logger.log(`📱 LINE送信開始: ${targets.line.length}件`);
      for (const lineUser of targets.line) {
        try {
          const lineResult = sendLineToUser(lineUser, message, options);
          if (lineResult.success) {
            sendResults.line.success++;
          } else {
            sendResults.line.failed++;
          }
          sendResults.line.results.push({
            user: lineUser,
            result: lineResult
          });
        } catch (error) {
          Logger.log(`❌ LINE送信エラー (${lineUser.name}): ${error.message}`);
          sendResults.line.failed++;
          sendResults.line.results.push({
            user: lineUser,
            result: { success: false, error: error.message }
          });
        }
      }
    }
    
    // 5. Email送信
    if (targets.email.length > 0) {
      Logger.log(`📧 Email送信開始: ${targets.email.length}件`);
      for (const emailUser of targets.email) {
        try {
          const emailResult = sendEmailToUser(emailUser, message, options);
          if (emailResult.success) {
            sendResults.email.success++;
          } else {
            sendResults.email.failed++;
          }
          sendResults.email.results.push({
            user: emailUser,
            result: emailResult
          });
        } catch (error) {
          Logger.log(`❌ Email送信エラー (${emailUser.name}): ${error.message}`);
          sendResults.email.failed++;
          sendResults.email.results.push({
            user: emailUser,
            result: { success: false, error: error.message }
          });
        }
      }
    }
    
    // 6. 送信結果集計
    const totalSuccess = sendResults.slack.success + sendResults.line.success + sendResults.email.success;
    const totalFailed = sendResults.slack.failed + sendResults.line.failed + sendResults.email.failed;
    const overallSuccess = totalSuccess > 0 && totalFailed === 0;
    
    // 7. 履歴更新
    const finalStatus = overallSuccess ? '送信完了' : 
                       totalSuccess > 0 ? '一部失敗' : '送信失敗';
    
    // 詳細なエラーメッセージ生成
    let errorDetails = [];
    if (sendResults.slack.failed > 0) {
      errorDetails.push(`Slack失敗: ${sendResults.slack.failed}件`);
    }
    if (sendResults.line.failed > 0) {
      const lineErrors = sendResults.line.results.filter(r => !r.result.success);
      const lineUnconnected = lineErrors.filter(r => r.result.error === 'LINE未連携').length;
      const lineApiErrors = lineErrors.filter(r => r.result.error !== 'LINE未連携').length;
      
      if (lineUnconnected > 0 || lineApiErrors > 0) {
        let lineErrorMsg = `LINE失敗: ${sendResults.line.failed}件`;
        if (lineUnconnected > 0) lineErrorMsg += ` (未連携: ${lineUnconnected})`;
        if (lineApiErrors > 0) lineErrorMsg += ` (API失敗: ${lineApiErrors})`;
        errorDetails.push(lineErrorMsg);
      }
    }
    if (sendResults.email.failed > 0) {
      errorDetails.push(`Email失敗: ${sendResults.email.failed}件`);
    }
    
    const errorMessage = errorDetails.length > 0 ? errorDetails.join(', ') : '';
    
    updateNotificationStatus(logId, finalStatus, errorMessage);
    
    Logger.log(`✅ 統合通知送信完了: 成功${totalSuccess}件, 失敗${totalFailed}件`);
    
    return {
      success: overallSuccess,
      logId: logId,
      targets: targets,
      sendResults: sendResults,
      summary: {
        totalTargets: targets.totalTargets,
        totalSuccess: totalSuccess,
        totalFailed: totalFailed,
        successRate: targets.totalTargets > 0 ? (totalSuccess / targets.totalTargets * 100).toFixed(1) + '%' : '0%'
      },
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ 統合通知送信エラー: ${error.message}`);
    
    // エラー時も履歴更新
    if (logId) {
      updateNotificationStatus(logId, '送信エラー', error.message);
    }
    
    return {
      success: false,
      error: error.message,
      notificationType: notificationType,
      timestamp: new Date()
    };
  }
}

/**
 * 個別Slack送信
 */
function sendSlackToUser(slackUser, message, options) {
  try {
    // 既存のSlack送信機能を活用
    const slackOptions = {
      channel: slackUser.channelId || options.defaultChannel,
      priority: options.priority || 'normal',
      icon: options.icon || ':robot_face:',
      username: options.username || '外壁塗装くらべるAI'
    };
    
    return sendSlackNotification(message, slackOptions);
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 個別LINE送信
 */
function sendLineToUser(lineUser, message, options) {
  try {
    Logger.log(`📱 LINE送信開始: ${lineUser.name} (${lineUser.userId})`);
    
    let actualUserId = lineUser.userId;
    
    // childId → userId 変換が必要な場合
    if (lineUser.userId && lineUser.userId.startsWith('child-')) {
      const convertedUserId = getChildUserLineId(lineUser.userId);
      if (convertedUserId) {
        actualUserId = convertedUserId;
        Logger.log(`🔄 childId変換: ${lineUser.userId} → ${actualUserId}`);
      } else {
        Logger.log(`⚠️ LINE未連携ユーザー: ${lineUser.name} (${lineUser.userId})`);
        return {
          success: false,
          channel: 'line',
          userId: lineUser.userId,
          error: 'LINE未連携',
          message: 'ユーザーのLINE連携が見つかりません'
        };
      }
    }
    
    // LINE UserID形式チェック
    if (!actualUserId || !actualUserId.startsWith('U') || actualUserId.length !== 33) {
      Logger.log(`❌ 不正なLINE UserID: ${actualUserId}`);
      return {
        success: false,
        channel: 'line',
        userId: lineUser.userId,
        error: '不正なUserID形式',
        message: 'LINE UserIDの形式が正しくありません'
      };
    }
    
    // 実際のLINE Messaging API呼び出し
    const lineResult = sendLinePushMessage(actualUserId, message, options?.imageUrl);
    
    if (lineResult.success) {
      Logger.log(`✅ LINE送信成功: ${lineUser.name} (${actualUserId})`);
      return {
        success: true,
        channel: 'line',
        userId: lineUser.userId,
        actualUserId: actualUserId,
        message: 'LINE送信完了',
        responseCode: lineResult.responseCode
      };
    } else {
      Logger.log(`❌ LINE送信失敗: ${lineUser.name} - ${lineResult.error}`);
      return {
        success: false,
        channel: 'line',
        userId: lineUser.userId,
        actualUserId: actualUserId,
        error: lineResult.error,
        message: 'LINE送信に失敗しました',
        responseCode: lineResult.responseCode,
        responseText: lineResult.responseText
      };
    }
    
  } catch (error) {
    Logger.log(`❌ LINE送信エラー: ${error.message}`);
    return {
      success: false,
      channel: 'line',
      userId: lineUser.userId,
      error: error.message,
      message: 'LINE送信処理でエラーが発生しました'
    };
  }
}

/**
 * 個別Email送信
 */
function sendEmailToUser(emailUser, message, options) {
  try {
    const subject = options.subject || '外壁塗装くらべるAI - 通知';
    
    // GAS標準のメール送信
    GmailApp.sendEmail(
      emailUser.email,
      subject,
      message,
      {
        htmlBody: message.replace(/\n/g, '<br>'),
        name: options.senderName || '外壁塗装くらべるAI'
      }
    );
    
    return {
      success: true,
      channel: 'email',
      email: emailUser.email,
      message: 'Email送信完了'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cloud Functions用：スクリプトプロパティ取得
 */
function getScriptPropertiesForCloudFunctions(parameters) {
  try {
    console.log('🔑 Cloud Functions用スクリプトプロパティ取得:', parameters);
    
    const properties = PropertiesService.getScriptProperties();
    const keys = parameters.keys || [];
    const result = {};
    
    for (const key of keys) {
      result[key] = properties.getProperty(key);
    }
    
    console.log('✅ スクリプトプロパティ取得成功:', Object.keys(result));
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('❌ スクリプトプロパティ取得エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cloud Functions用：LINE問い合わせログをSpreadsheetに記録
 */
function logLineMessageToSpreadsheetForCloudFunctions(parameters) {
  try {
    console.log('📝 Cloud Functions用スプレッドシートログ記録:', parameters);
    
    const { userId, message, timestamp, replyMessage } = parameters;
    const japanTime = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    
    // spreadsheet_service.gsの関数を呼び出し
    const result = logLineMessageToSpreadsheet({
      userId: userId,
      message: message,
      timestamp: timestamp || new Date().toISOString(),
      japanTime: japanTime,
      replyMessage: replyMessage || '',
      status: '受信完了'
    });
    
    console.log('✅ Cloud Functions用スプレッドシートログ記録成功');
    
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('❌ Cloud Functions用スプレッドシートログ記録エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// =============================================================================
// 🎯 加盟店登録システム（新規実装）
// =============================================================================

/**
 * 加盟店登録メイン処理
 * @param {Object} registrationData - 登録フォームデータ
 * @returns {Object} 登録結果
 */
function submitFranchiseRegistration(registrationData) {
  try {
    console.log('🎯 [notify.gs] 加盟店登録処理開始');
    console.log('📋 受信データの型:', typeof registrationData);
    console.log('📋 受信データのキー:', Object.keys(registrationData || {}));
    console.log('📋 圧縮データフラグ:', registrationData?.isCompressed);
    console.log('📋 legalName:', registrationData?.legalName);
    console.log('📋 companyName:', registrationData?.companyName);
    
    if (!registrationData) {
      throw new Error('登録データが空です');
    }
    
    // 1. データ検証
    console.log('🔍 データ検証開始...');
    const validation = validateRegistrationData(registrationData);
    if (!validation.success) {
      throw new Error(`データ検証エラー: ${validation.error}`);
    }
    console.log('✅ データ検証完了');
    
    // 2. 加盟店IDを生成
    console.log('🏷️ 加盟店ID生成中...');
    const franchiseId = generateFranchiseId();
    console.log('✅ 生成された加盟店ID:', franchiseId);
    console.log('🔍 IDの長さ:', franchiseId.length);
    console.log('🔍 IDの形式チェック:', /^FC-\d{6}-[A-Z0-9]{4}$/.test(franchiseId));
    
    // 3. スプレッドシートに保存（spreadsheet_service.gsの統一関数を使用）
    console.log('💾 スプレッドシート保存開始...');
    const saveResult = saveFranchiseRegistration(franchiseId, registrationData);
    if (!saveResult.success) {
      throw new Error(`データ保存エラー: ${saveResult.error}`);
    }
    console.log('✅ スプレッドシート保存完了');
    
    // 4. 管理者に通知（Slack等）
    try {
      console.log('📢 管理者通知送信中...');
      notifyNewFranchiseRegistration(franchiseId, registrationData);
      console.log('✅ 管理者通知完了');
    } catch (notifyError) {
      console.warn('⚠️ 管理者通知エラー（登録は継続）:', notifyError.message);
    }
    
    console.log('✅ 加盟店登録完了:', franchiseId);
    
    return {
      success: true,
      franchiseId: franchiseId,
      message: '加盟店登録が正常に完了しました',
      timestamp: new Date().toISOString(),
      compressed: registrationData?.isCompressed || false
    };
    
  } catch (error) {
    console.error('❌ 加盟店登録エラー:', error.message);
    console.error('❌ エラースタック:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      debugInfo: 'submitFranchiseRegistration関数内エラー'
    };
  }
}

/**
 * 登録データの検証
 */
function validateRegistrationData(data) {
  try {
    console.log('🔍 バリデーション開始 - 受信データ:', JSON.stringify(data, null, 2));
    
    const requiredFields = [
      'legalName', 'representative', 'address', 'phone',
      'billingEmail', 'salesEmail', 'salesPersonName', 'salesPersonContact'
    ];
    
    console.log('🔍 必須フィールド:', requiredFields);
    
    const missingFields = [];
    
    for (const field of requiredFields) {
      let hasValue = false;
      
      if (field === 'legalName') {
        // legalNameまたはcompanyNameがあればOK
        hasValue = !!(data.legalName || data.companyName);
      } else if (field === 'phone') {
        // 電話番号は配列の場合もある
        hasValue = !!(Array.isArray(data[field]) ? data[field][0] : data[field]);
      } else {
        hasValue = !!(data[field] && (typeof data[field] !== 'string' || data[field].trim() !== ''));
      }
      
      if (!hasValue) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `必須項目が不足: ${missingFields.join(', ')}`
      };
    }
    
    // メールアドレス形式チェック
    const emailFields = ['billingEmail', 'salesEmail'];
    for (const field of emailFields) {
      if (data[field] && !isValidEmail(data[field])) {
        return {
          success: false,
          error: `メールアドレス形式が不正: ${field}`
        };
      }
    }
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: `検証処理エラー: ${error.message}`
    };
  }
}

/**
 * メールアドレス形式チェック
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 物件種別データをフォーマット
 */
function formatPropertyTypes(propertyTypes) {
  if (!Array.isArray(propertyTypes)) {
    return '';
  }
  
  return propertyTypes.map(item => {
    if (typeof item === 'object' && item.type && item.maxFloors) {
      return `${item.type}(最大${item.maxFloors})`;
    }
    return item;
  }).join(', ');
}

/**
 * 加盟店ID生成
 */
function generateFranchiseId() {
  // 現在の日付を yyMMdd 形式で取得
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // 下2桁
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = year + month + day;
  
  // 4桁の乱数を生成（0-9, A-Z の組み合わせ）
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let random = '';
  for (let i = 0; i < 4; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // FC-yyMMdd-4桁乱数 形式で生成（合計14文字）
  return `FC-${dateStr}-${random}`;
}

/**
 * スプレッドシートに登録データを保存
 */
function saveFranchiseRegistrationDirect(franchiseId, data) {
  try {
    console.log('💾 スプレッドシート保存開始:', franchiseId);
    console.log('📋 保存データ:', JSON.stringify(data, null, 2));
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    console.log('📊 スプレッドシートID:', SPREADSHEET_ID);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 加盟店登録シートを取得または作成
    let registrationSheet = ss.getSheetByName('加盟店登録');
    if (!registrationSheet) {
      console.log('📝 新しい登録シートを作成中...');
      registrationSheet = createFranchiseRegistrationSheet(ss);
    }
    
    console.log('✅ シート準備完了');
    
    // 電話番号の処理（先頭の0が削除されないように）
    let phoneNumber = '';
    if (data.phone) {
      if (Array.isArray(data.phone)) {
        phoneNumber = data.phone[0] || '';
      } else {
        phoneNumber = data.phone;
      }
      // 文字列として保持（先頭の0を保持）
      phoneNumber = phoneNumber.toString();
    }
    
    // 登録データを整理（正式会社名削除、電話番号修正、ずれ修正）
    const registrationRow = [
      franchiseId,                          // A: 加盟店ID
      new Date(),                          // B: 登録日時
      data.legalName || '',                // C: 会社名
      data.legalNameKana || '',            // D: 会社名カナ
      data.representative || '',           // E: 代表者名
      data.representativeKana || '',       // F: 代表者カナ
      data.postalCode || '',              // G: 郵便番号
      data.address || '',                 // H: 住所
      phoneNumber,                        // I: 電話番号（先頭0保持）
      data.websiteUrl || '',              // J: ウェブサイトURL
      data.tradeName || '',               // K: 屋号
      data.tradeNameKana || '',           // L: 屋号カナ
      data.employees || '',               // M: 従業員数
      data.revenue || '',                 // N: 売上規模
      data.billingEmail || '',            // O: 請求用メール
      data.salesEmail || '',              // P: 営業用メール
      data.salesPersonName || '',        // Q: 営業担当者名
      data.salesPersonContact || '',     // R: 営業担当者連絡先
      formatPropertyTypes(data.propertyTypes), // S: 対応物件種別
      Array.isArray(data.constructionAreas) ? data.constructionAreas.join(', ') : '', // T: 施工箇所
      Array.isArray(data.specialServices) ? data.specialServices.join(', ') : '', // U: 特殊対応項目
      data.minBuildingAge && data.maxBuildingAge ? `${data.minBuildingAge}年〜${data.maxBuildingAge}年` : '', // V: 築年数対応範囲
      data.establishedDate || '',         // W: 設立年月
      data.companyPR || '',               // X: 特徴・PR文
      '審査待ち',                          // Y: ステータス
      '',                                 // Z: 審査担当者
      '',                                 // AA: 審査完了日
      ''                                  // AB: 備考
    ];
    
    // エリア選択データも処理（新しい圧縮データ対応）
    let priorityAreasText = '';
    let totalAreasText = '';
    let totalAreasCount = 0;
    
    if (data.areasCompressed) {
      // 新しい圧縮形式（フロントエンドから送信された圧縮データ）
      console.log('📦 圧縮エリアデータを処理中:', data.areasCompressed);
      totalAreasText = data.areasCompressed;
      totalAreasCount = (data.areasCompressed.match(/,/g) || []).length + 1; // カンマの数+1でエリア数を推定
      priorityAreasText = ''; // 圧縮データでは優先エリアの区別なし
    } else if (data.isCompressed) {
      // 旧式の圧縮形式
      if (data.priorityAreas && Array.isArray(data.priorityAreas)) {
        priorityAreasText = data.priorityAreas.map(area => area.replace(':', '(')).map(area => area + ')').join(', ');
      }
      totalAreasCount = data.totalAreas || 0;
      const normalCount = totalAreasCount - (data.priorityCount || 0);
      totalAreasText = normalCount > 0 ? `その他${normalCount}地域（圧縮データのため省略）` : '';
    } else {
      // 従来の非圧縮形式
      const areaData = data.areas || [];
      const priorityAreas = areaData.filter(area => area.isPriority).map(area => `${area.city}(${area.prefecture})`);
      const normalAreas = areaData.filter(area => !area.isPriority).map(area => `${area.city}(${area.prefecture})`);
      priorityAreasText = priorityAreas.join(', ');
      totalAreasText = normalAreas.join(', ');
      totalAreasCount = areaData.length;
    }
    
    registrationRow.push(priorityAreasText);  // AC: 優先エリア
    registrationRow.push(totalAreasText);     // AD: 対応エリア
    registrationRow.push(totalAreasCount);    // AE: 総エリア数
    
    // データを追加
    console.log('📝 スプレッドシートにデータ追加中...', registrationRow.length, '列');
    registrationSheet.appendRow(registrationRow);
    
    console.log('✅ スプレッドシートに登録データ保存完了');
    
    return { success: true, message: 'データ保存成功' };
    
  } catch (error) {
    console.error('❌ スプレッドシート保存エラー:', error.message);
    console.error('❌ エラースタック:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 加盟店登録シートを作成
 */
function createFranchiseRegistrationSheet(ss) {
  try {
    const sheet = ss.insertSheet('加盟店登録');
    
    // ヘッダー行を設定
    const headers = [
      '加盟店ID', '登録日時', '会社名', '会社名カナ', '正式会社名',
      '代表者名', '代表者カナ', '郵便番号', '住所', '電話番号',
      'ウェブサイトURL', '従業員数', '売上規模', '請求用メール', '営業用メール',
      '営業担当者名', '営業担当者連絡先', '代表者が営業担当', '屋号', '屋号カナ',
      '設立年月', '特徴・PR文', '対応物件種別', '施工箇所', '特殊対応項目',
      '築年数対応範囲', 'ステータス', '審査担当者', '審査完了日', '備考',
      '優先エリア', '対応エリア', '総エリア数'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーの書式設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    
    // 列幅を自動調整
    headers.forEach((header, index) => {
      sheet.setColumnWidth(index + 1, 120);
    });
    
    // 特定の列は幅を調整
    sheet.setColumnWidth(1, 150);  // 加盟店ID
    sheet.setColumnWidth(2, 150);  // 登録日時
    sheet.setColumnWidth(22, 300); // 特徴・PR文
    sheet.setColumnWidth(31, 200); // 優先エリア
    sheet.setColumnWidth(32, 300); // 対応エリア
    
    console.log('✅ 加盟店登録シート作成完了');
    return sheet;
    
  } catch (error) {
    console.error('❌ 加盟店登録シート作成エラー:', error);
    throw error;
  }
}

/**
 * 新規加盟店登録の管理者通知
 */
function notifyNewFranchiseRegistration(franchiseId, data) {
  try {
    const message = `🎯 **新規加盟店登録**

**加盟店ID**: ${franchiseId}
**会社名**: ${data.companyName || data.legalName}
**代表者**: ${data.representative}
**電話番号**: ${data.phone}
**メール**: ${data.billingEmail}
**営業担当者**: ${data.salesPersonName}

**対応エリア**: ${(data.areas || []).length}地域
**登録日時**: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

審査をお願いします。`;
    
    // Slack通知（利用可能な場合）
    if (typeof sendSlackNotification === 'function') {
      sendSlackNotification(message);
    }
    
    console.log('✅ 管理者通知送信完了');
    
  } catch (error) {
    console.warn('⚠️ 管理者通知エラー:', error.message);
  }
}

// startAIHearing関数は重複削除 - FranchiseHearingAI_New.gsで実装済み

/**
 * 会社詳細情報検索（第2段階）
 * 屋号、支店情報、設立年月日、PR文を検索
 */
function searchCompanyDetails(params) {
  try {
    console.log('🔍 第2段階詳細検索開始:', params);
    
    const { companyName, address, websiteUrl } = params;
    
    if (!companyName) {
      return {
        success: false,
        error: '会社名が指定されていません'
      };
    }
    
    // FranchiseHearingAI_New.gsのsearchCompanyDetailsFromAI関数を直接呼び出し
    console.log('🔄 searchCompanyDetailsFromAI関数を呼び出し中...');
    console.log('🔄 渡すパラメータ:', JSON.stringify(params));
    
    try {
      // GAS環境では同じプロジェクト内の関数は直接呼び出し可能
      const result = searchCompanyDetailsFromAI(params);
      console.log('🔄 searchCompanyDetailsFromAI応答:', JSON.stringify(result));
      console.log('🔍 DEBUG: result.details.companyPR =', result.details ? result.details.companyPR : 'details is null');
      console.log('🔍 DEBUG: result.details =', result.details);
      return result;
    } catch (callError) {
      console.error('❌ searchCompanyDetailsFromAI関数呼び出しエラー:', callError);
      return {
        success: false,
        error: `searchCompanyDetailsFromAI関数の呼び出しに失敗しました: ${callError.message}`
      };
    }
    
  } catch (error) {
    console.error('❌ 第2段階詳細検索エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}




/**
 * Webサイトから企業情報を抽出
 */
function extractFromWebsiteNotify(params) {
  try {
    console.log('🔍 extractFromWebsiteNotify実データ実行開始');
    console.log('📤 受信パラメータ:', JSON.stringify(params, null, 2));
    console.log('📤 パラメータtype:', typeof params);
    console.log('📤 パラメータkeys:', params ? Object.keys(params) : 'N/A');
    console.log('🔍 関数呼び出し元スタックトレース:', new Error().stack);
    
    // パラメータがundefinedやnullの場合の対応
    if (!params || typeof params !== 'object') {
      console.log('❌ パラメータが無効です - 実際のWebサイトでテスト実行');
      params = { websiteUrl: 'https://www.google.co.jp' };
    }
    
    const websiteUrl = params.websiteUrl || params.url || '';
    
    if (!websiteUrl || websiteUrl.trim() === '') {
      Logger.log('❌ WebサイトURL未入力');
      return {
        success: false,
        error: 'WebサイトURLを入力してください'
      };
    }
    
    Logger.log(`🌐 実際のWebスクレイピング開始: ${websiteUrl}`);
    
    // notify.gs内のextractFromWebsite関数を呼び出し
    const result = extractFromWebsiteCore({ websiteUrl: websiteUrl });
    
    Logger.log(`✅ extractFromWebsite結果:`, JSON.stringify(result));
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ Webサイト抽出エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 成功レスポンス作成
 */
function createSuccessResponseNotify(data) {
  return {
    success: true,
    ...data,
    timestamp: new Date().toISOString()
  };
}

/**
 * エラーレスポンス作成
 */
function createErrorResponseNotify(message) {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Webサイトから企業情報を抽出（コア機能）
 */
function extractFromWebsiteCore(params) {
  try {
    const { websiteUrl } = params;
    
    Logger.log(`🔍 extractFromWebsiteCore実行 - 受信パラメータ: ${JSON.stringify(params)}`);
    
    if (!websiteUrl || websiteUrl.trim() === '') {
      Logger.log(`❌ WebサイトURL未入力`);
      return createErrorResponseNotify('WebサイトURLを入力してください');
    }
    
    Logger.log(`🌐 WebサイトからAI抽出開始: ${websiteUrl}`);
    
    // Webサイトのコンテンツをスクレイピング
    Logger.log(`🔄 scrapeWebContent開始...`);
    const websiteContent = scrapeWebContent(websiteUrl);
    Logger.log(`📄 スクレイピング結果: ${websiteContent ? websiteContent.length + '文字' : 'null'}`);
    
    if (!websiteContent || websiteContent.length < 100) {
      Logger.log(`❌ Webサイトコンテンツ取得失敗: ${websiteUrl} - 取得文字数: ${websiteContent ? websiteContent.length : 0}`);
      return createErrorResponseNotify('Webサイトの内容を取得できませんでした。URLを確認してください。');
    }
    
    Logger.log(`✅ Webサイトコンテンツ取得成功: ${websiteContent.length}文字`);
    
    // DeepSeekでWebサイトコンテンツから企業情報を抽出
    const systemPrompt = `🏢 Webサイト企業情報抽出AI 🏢

あなたは企業ホームページから情報を抽出する専門AIです。提供されたWebサイトコンテンツから企業情報を正確に抽出してください。

🎯 【抽出方針】
Webサイトの内容から企業の基本情報を可能な限り抽出してください。

📊 【抽出項目】
== 基本情報 ==
- legalName: 会社名（株式会社○○建設）
- legalNameKana: 会社名カナ（推測可・○○ケンセツ）
- tradeName: 屋号・営業名・ブランド名
- tradeNameKana: 屋号カナ（推測可）

== 代表者・担当者 ==  
- representative: 代表者名（山田太郎）
- representativeKana: 代表者カナ（ヤマダタロウ・推測可）

== 所在地・拠点 ==
- postalCode: 郵便番号（123-4567）
- address: 本社住所（完全住所）
- branchName: 支店名・営業所名
- branchAddress: 支店住所・営業所住所

== 設立・財務 ==
- foundedDate: 設立年月（1985年4月・昭和60年4月等）
- capital: 資本金（1000万円・推測可）
- employees: 従業員数（50名・推測可）
- revenue: 売上規模（5億円・推測可）

== 連絡先 ==
- websiteUrl: 提供されたURL
- phone: 電話番号（配列形式["03-1234-5678", "090-1234-5678"]）
- billingEmail: 請求用メール（info@等を仮採用）
- salesEmail: 営業用メール（sales@等を仮採用）

== 事業・特徴 ==
- constructionServices: 主な施工サービス（外壁塗装、屋根塗装、防水工事等）
- specialServices: 特殊対応サービス（緊急対応、日曜対応等）
- companyDescription: 会社特徴・強み・実績
- companyPR: HPから生成したオリジナルPR文（100-200文字程度）

🔥 【重要指示】
1. Webサイトに記載されている情報のみを抽出
2. 推測でもOK（業界から資本金や従業員数を推測）
3. カナは音読みで推測生成
4. メールは問い合わせアドレスを請求・営業用に仮採用
5. 不明な項目は省略（空白・ダミー禁止）

📋 【出力形式】
JSON形式で単一オブジェクト
データ不明項目は省略（空白・ダミー禁止）

**重要: 必ず有効なJSONオブジェクト形式で応答してください。**
例: {"legalName": "株式会社○○建設", "address": "東京都...", "representative": "山田太郎", "websiteUrl": "${websiteUrl}"}`;

    const userPrompt = `WebサイトURL: ${websiteUrl}

以下のWebサイトコンテンツから企業情報を抽出してください：

${websiteContent.substring(0, 10000)}

上記の内容から企業の基本情報を可能な限り抽出して、JSON形式で出力してください。`;

    Logger.log(`🤖 OpenRouter API呼び出し開始...`);
    
    const deepSeekResponse = callOpenRouterAPI(systemPrompt, userPrompt);
    Logger.log(`🤖 OpenRouter API応答: ${JSON.stringify(deepSeekResponse)}`);
    
    if (!deepSeekResponse.success) {
      Logger.log(`❌ OpenRouter Webサイト抽出失敗: ${deepSeekResponse.error}`);
      return createErrorResponseNotify('AI解析に失敗しました: ' + deepSeekResponse.error);
    }
    
    // JSONパース試行
    let extractedInfo;
    try {
      Logger.log(`🔍 JSON解析開始: ${deepSeekResponse.content.substring(0, 500)}...`);
      extractedInfo = JSON.parse(deepSeekResponse.content);
      Logger.log(`✅ JSON解析成功`);
    } catch (jsonError) {
      Logger.log(`❌ JSON解析失敗: ${jsonError.message}`);
      Logger.log(`📄 原文: ${deepSeekResponse.content}`);
      
      try {
        const cleaned = deepSeekResponse.content.replace(/```json|```/g, '').trim();
        extractedInfo = JSON.parse(cleaned);
        Logger.log(`✅ クリーンアップ後JSON解析成功`);
      } catch (cleanError) {
        Logger.log(`❌ クリーンアップ後も解析失敗: ${cleanError.message}`);
        return createErrorResponseNotify('AI応答の解析に失敗しました');
      }
    }
    
    // Webサイト情報を追加
    extractedInfo.websiteUrl = websiteUrl;
    
    Logger.log(`🎯 最終抽出結果: ${JSON.stringify(extractedInfo, null, 2)}`);
    
    return {
      success: true,
      companyInfo: extractedInfo,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log(`❌ extractFromWebsiteCore エラー: ${error.message}`);
    Logger.log(`🔍 スタックトレース: ${error.stack}`);
    return createErrorResponseNotify(error.message);
  }
}

/**
 * Webサイトコンテンツをスクレイピング
 */
function scrapeWebContent(url) {
  try {
    Logger.log(`🌐 Webスクレイピング開始: ${url}`);
    
    // URLの正規化
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
      },
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false
    });
    
    const responseCode = response.getResponseCode();
    Logger.log(`🌐 HTTP レスポンスコード: ${responseCode}`);
    
    if (responseCode !== 200) {
      Logger.log(`❌ HTTP エラー: ${responseCode} for ${url}`);
      return null;
    }
    
    const htmlContent = response.getContentText();
    Logger.log(`📄 HTML取得成功: ${htmlContent.length}文字`);
    
    // HTMLからテキストコンテンツを抽出（簡易版）
    let textContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    Logger.log(`✅ テキスト抽出完了: ${textContent.length}文字`);
    return textContent;
    
  } catch (error) {
    Logger.log(`❌ Webスクレイピングエラー: ${error.message}`);
    return null;
  }
}

/**
 * OpenRouter API呼び出し
 */
function callOpenRouterAPI(systemPrompt, userPrompt) {
  try {
    const OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
    
    Logger.log(`🔑 OpenRouter APIキー確認: ${OPENROUTER_API_KEY ? '設定済み (' + OPENROUTER_API_KEY.substring(0, 10) + '...)' : '❌ 未設定'}`);
    
    if (!OPENROUTER_API_KEY) {
      Logger.log('❌ OpenRouter APIキーが設定されていません');
      return {
        success: false,
        error: 'OpenRouter APIキーが設定されていません'
      };
    }
    
    const requestBody = {
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userPrompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      timeout: 60
    };
    
    Logger.log(`🚀 DeepSeek API via OpenRouter リクエスト送信中...`);
    
    const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://franchise-hearing.com',
        'X-Title': 'Franchise Hearing AI'
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true,
      timeout: 60000
    });
    
    const responseCode = response.getResponseCode();
    Logger.log(`📥 HTTP ステータス: ${responseCode}`);
    const responseText = response.getContentText();
    
    if (responseCode !== 200) {
      Logger.log(`❌ OpenRouter API エラー: ${responseCode} - ${responseText}`);
      return {
        success: false,
        error: `API エラー: ${responseCode} - ${responseText}`
      };
    }
    
    const apiResponse = JSON.parse(responseText);
    
    if (!apiResponse.choices || apiResponse.choices.length === 0) {
      Logger.log(`❌ API応答にchoicesがありません: ${JSON.stringify(apiResponse)}`);
      return {
        success: false,
        error: 'API応答が不正です'
      };
    }
    
    const content = apiResponse.choices[0].message.content;
    Logger.log(`✅ OpenRouter API 成功`);
    
    return {
      success: true,
      content: content
    };
    
  } catch (error) {
    Logger.log(`❌ OpenRouter API呼び出しエラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===================
// GAS CI/CD対応: async/await問題修正
// ===================

/**
 * キャンセル通知Webhook確保・初期化（GAS対応版）
 * CI/CDのトップレベルawaitエラー修正
 */
function initializeWebhookAndNotifyGasFixed() {
  try {
    Logger.log('🔧 キャンセル通知Webhook初期化開始（GAS対応）');
    
    // 同期的な初期化処理
    const webhookResult = ensureCancelNotifyWebhookSync();
    
    if (!webhookResult.success) {
      Logger.log(`❌ Webhook保存失敗: ${webhookResult.error}`);
      // エラー通知（同期版）
      notifyGptErrorChannelSync(`キャンセル通知Webhook保存失敗: ${webhookResult.error}`);
    } else {
      Logger.log('✅ Webhook確保成功');
    }
    
    return webhookResult;
    
  } catch (error) {
    Logger.log(`❌ 初期化エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Webhook確保処理（同期版）
 */
function ensureCancelNotifyWebhookSync() {
  try {
    // スクリプトプロパティからWebhook URL確認
    const existingWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK_URL');
    
    if (existingWebhook) {
      Logger.log('✅ 既存キャンセル通知Webhook URL確認済み');
      return {
        success: true,
        webhook: existingWebhook,
        action: 'existing'
      };
    }
    
    // メインSlack Webhookをキャンセル通知用として流用
    const mainWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!mainWebhook) {
      throw new Error('SLACK_WEBHOOK_URLが設定されていません');
    }
    
    // キャンセル通知用として保存
    PropertiesService.getScriptProperties().setProperty('SLACK_CANCEL_NOTIFY_WEBHOOK_URL', mainWebhook);
    Logger.log('✅ キャンセル通知Webhook URL設定完了');
    
    return {
      success: true,
      webhook: mainWebhook,
      action: 'created_from_main'
    };
    
  } catch (error) {
    Logger.log(`❌ Webhook確保エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * GPTエラーチャンネル通知（同期版）
 */
function notifyGptErrorChannelSync(message) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      Logger.log('⚠️ Slack Webhook未設定 - エラー通知スキップ');
      return false;
    }
    
    const payload = {
      text: `🚨 *システムエラー通知*\n\n${message}`,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':warning:'
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ GPTエラーチャンネル通知送信成功');
      return true;
    } else {
      Logger.log(`⚠️ GPTエラーチャンネル通知失敗: ${responseCode}`);
      return false;
    }
    
  } catch (error) {
    Logger.log(`❌ GPTエラーチャンネル通知エラー: ${error.message}`);
    return false;
  }
}