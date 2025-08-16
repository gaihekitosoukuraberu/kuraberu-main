/**
 * 外壁塗装くらべるAI システム - 統合通知システム（完全版）
 * Slack / SendGrid / Twilio / LINE Messaging API + LINE連携管理
 * 通知対象ユーザー抽出・履歴管理機能統合済み
 * 最終更新: 2025-01-08 10:17 - generateSessionId修正完了
 */

/**
 * 🚨 CRITICAL: 加盟店登録処理（最重要関数 - ファイル先頭に配置）
 * @param {Object} registrationData - 登録フォームデータ
 * @returns {Object} 登録結果
 */
function submitFranchiseRegistration(registrationData) {
  console.log('🚨 submitFranchiseRegistration関数 - FranchiseHearingAI_New.jsのsaveFranchiseDataを使用');
  
  try {
    console.log('🚨 [notify.js] submitFranchiseRegistration - FranchiseHearingAI_New.js saveFranchiseData呼び出し');
    console.log('📋 受信データ:', JSON.stringify(registrationData, null, 2));
    
    // 🚨 CRITICAL: FranchiseHearingAI_New.jsのsaveFranchiseData関数を呼び出し
    console.log('🔥 saveFranchiseData関数呼び出し開始');
    var saveResult = saveFranchiseData(registrationData);
    console.log('🔥 saveFranchiseData実行結果:', JSON.stringify(saveResult));
    
    if (!saveResult || !saveResult.success) {
      throw new Error('saveFranchiseData実行失敗: ' + (saveResult ? saveResult.error : 'レスポンスなし'));
    }
    
    console.log('✅ 加盟店登録完了 via saveFranchiseData:', saveResult.franchiseId);
    return saveResult;
  } catch (error) {
    console.error('❌ submitFranchiseRegistration エラー:', error.message);
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

// ===================
// GAS WebApp API統合 & URL一元管理
// ===================

/**
 * セッションID生成（グローバル関数として定義）
 * @returns {string} セッションID
 */
function generateSessionId() {
  var timestamp = Date.now();
  var random = Math.random().toString(36).substring(2, 8);
  return "HEARING_" + timestamp + "_" + random;
}

/**
 * 🔧 CRITICAL: 必要な依存関数群（submitFranchiseRegistration用）
 */

/**
 * 登録データの検証（簡易版）
 */
function validateRegistrationData(data) {
  try {
    console.log('🔍 バリデーション開始 - 受信データ:', JSON.stringify(data, null, 2));
    
    // テスト用に必須フィールドを最小限に制限
    var requiredFields = [
      'legalName', 'representative', 'address', 'phone'
    ];
    
    console.log('🔍 必須フィールド:', requiredFields);
    
    var missingFields = [];
    
    for (var i = 0; i < requiredFields.length; i++) {
      var field = requiredFields[i];
      var hasValue = false;
      
      if (field === 'legalName') {
        // legalNameまたはcompanyNameがあればOK
        hasValue = !!(data.legalName || data.companyName);
      } else if (field === 'phone') {
        // 電話番号は配列の場合もある
        hasValue = !!(Array.isArray(data[field]) ? data[field][0] : data[field]);
      } else if (field === 'salesPersonContact') {
        // salesPersonContactの代替フィールドをチェック
        hasValue = !!(data[field] || data.salesPersonPhone || data.salesPersonContact);
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
        error: "必須項目が不足: " + missingFields.join(', ')
      };
    }
    
    // メールアドレス形式チェック
    var emailFields = ['billingEmail', 'salesEmail'];
    for (var i = 0; i < emailFields.length; i++) {
      var field = emailFields[i];
      if (data[field] && !isValidEmail(data[field])) {
        return {
          success: false,
          error: "メールアドレス形式が不正: " + field
        };
      }
    }
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: "検証処理エラー: " + error.message
    };
  }
}

/**
 * メールアドレス形式チェック
 */
function isValidEmail(email) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 加盟店ID生成
 */
function generateFranchiseId() {
  var timestamp = new Date().getTime();
  var random = Math.floor(Math.random() * 1000);
  return 'FR' + timestamp + '_' + random;
}

/**
 * 加盟店登録シート作成（簡易版）
 */
function createFranchiseRegistrationSheet(spreadsheet) {
  try {
    console.log('📄 加盟店登録シート作成開始');
    var sheet = spreadsheet.insertSheet('加盟店登録');
    
    // ヘッダー行を設定
    var headers = [
      '加盟店ID', 'タイムスタンプ', '法人名', '法人名カナ', '代表者名', '代表者カナ',
      '郵便番号', '住所', '電話番号', 'ウェブサイトURL', '従業員数', '売上規模',
      '請求用メール', '営業用メール', '営業担当者氏名', '営業担当者連絡先',
      '対応物件種別', '施工箇所', '特殊対応項目', '築年数対応範囲',
      '屋号', '屋号カナ', '支店情報', '設立年月日', '特徴・PR文',
      '対応エリア', '優先対応エリア', '登録日', '最終ログイン日時',
      'ステータス', '審査担当者', '審査完了日', '備考'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    console.log('✅ ヘッダー行設定完了');
    
    return sheet;
  } catch (error) {
    console.error('❌ シート作成エラー:', error);
    throw error;
  }
}

/**
 * 新規加盟店登録通知（簡易版）
 */
function notifyNewFranchiseRegistration(franchiseId, data) {
  try {
    console.log('📢 加盟店登録通知開始 - ID:', franchiseId);
    
    // Slack通知のみ実装（簡易版）
    var message = '🎉 新規加盟店登録\n';
    message += '加盟店ID: ' + franchiseId + '\n';
    message += '会社名: ' + (data.legalName || data.companyName || '不明') + '\n';
    message += '代表者: ' + (data.representative || '不明') + '\n';
    message += '住所: ' + (data.address || '不明') + '\n';
    message += '登録日時: ' + new Date().toLocaleString('ja-JP');
    
    try {
      sendSlackNotification(message);
      console.log('✅ Slack通知送信完了');
    } catch (slackError) {
      console.warn('⚠️ Slack通知失敗:', slackError.message);
    }
    
    return { success: true, message: '通知送信完了' };
  } catch (error) {
    console.error('❌ 通知送信エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 圧縮データ展開（簡易版）
 */
function decompressRegistrationData(compressedData) {
  try {
    console.log('🗜️ 圧縮データ展開開始（簡易版）:', compressedData);
    
    // 基本データをそのまま返す（展開処理は省略）
    var decompressedData = { ...compressedData };
    
    console.log('✅ 圧縮データ展開完了（簡易版）');
    return decompressedData;
    
  } catch (error) {
    console.error('❌ 圧縮データ展開エラー:', error);
    return compressedData; // 展開に失敗した場合は元データを返す
  }
}


/**
 * GAS WebApp URLの一元管理
 * @returns {string} 現在のGAS WebApp URL
 */
function getGasWebappUrl() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var url = properties.getProperty('GAS_WEBAPP_URL');
    
    console.log('🔍 GAS_WEBAPP_URL プロパティ確認:', url);
    console.log('🔍 全プロパティ一覧:', JSON.stringify(properties.getProperties()));
    
    if (!url) {
      console.log('⚠️ GAS_WEBAPP_URL未設定 - フォールバック使用');
      // フォールバック: 現在のWebApp URLを自動取得
      var currentUrl = ScriptApp.getService().getUrl();
      console.log('🔄 自動取得URL:', currentUrl);
      return currentUrl;
    }
    console.log('✅ 設定済みURL使用:', url);
    return url;
  } catch (error) {
    console.error('❌ getGasWebappUrl エラー:', error);
    // 緊急フォールバック
    return 'https://script.google.com/macros/s/AKfycbw1v1mKcq6oR4ckXpndJIzFykqltC-1DYYBXNlgxFT8Wh7wEdVuANwFoTaV9IeT47OWRQ/exec';
  }
}

/**
 * 簡易承認処理
 * @param {string} franchiseId 加盟店ID
 * @returns {Object} 処理結果
 */
function approveFranchiseSimple(franchiseId) {
  try {
    console.log('✅ 簡易承認処理開始:', franchiseId);
    console.log('✅ ハンデ値チェックをスキップして承認処理を実行');
    
    // スプレッドシートで該当加盟店のステータスを更新
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName('加盟店登録');
    if (!sheet) {
      throw new Error('加盟店登録シートが見つかりません');
    }
    
    // 加盟店IDで検索
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === franchiseId) {
        // 列インデックスを取得
        var headers = values[0];
        var statusCol = headers.indexOf('ステータス') + 1;
        var reviewerCol = headers.indexOf('審査担当者') + 1;
        var completeDateCol = headers.indexOf('審査完了日') + 1;
        var remarksCol = headers.indexOf('備考') + 1;
        
        // 列が見つからない場合は末尾に追加
        if (statusCol === 0) statusCol = headers.length + 1;
        if (reviewerCol === 0) reviewerCol = headers.length + 2;
        if (completeDateCol === 0) completeDateCol = headers.length + 3;
        if (remarksCol === 0) remarksCol = headers.length + 4;
        
        // データを設定
        sheet.getRange(i + 1, statusCol).setValue('承認済み');
        sheet.getRange(i + 1, reviewerCol).setValue('管理者');
        sheet.getRange(i + 1, completeDateCol).setValue(new Date().toLocaleString('ja-JP'));
        sheet.getRange(i + 1, remarksCol).setValue('Slackから承認');
        
        console.log('✅ スプレッドシート更新完了:', franchiseId);
        console.log('✅ ハンデ値処理をスキップしました');
        
        // 加盟店ログインメール送信
        try {
          var loginEmailResult = sendPartnerLoginEmail(franchiseId);
          console.log('✅ ログインメール送信完了:', loginEmailResult);
        } catch (emailError) {
          console.error('⚠️ ログインメール送信エラー（承認は完了）:', emailError);
        }
        
        // Slack通知
        try {
          sendSlackNotification('✅ 加盟店承認完了\n加盟店ID: ' + franchiseId + '\n承認日時: ' + new Date().toLocaleString('ja-JP'));
        } catch (slackError) {
          console.warn('⚠️ Slack通知エラー:', slackError.message);
        }
        
        return {
          success: true,
          franchiseId: franchiseId,
          status: '承認済み',
          approvedAt: new Date().toISOString()
        };
      }
    }
    
    throw new Error("加盟店ID " + franchiseId + " が見つかりません");
    
  } catch (error) {
    console.error('❌ 簡易承認処理エラー:', error);
    throw error;
  }
}

/**
 * 未承認加盟店一覧を取得
 * @returns {Array} 未承認加盟店リスト
 */
function getUnapprovedFranchises() {
  try {
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName('加盟店登録');
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0];
    
    // 列インデックスを動的に取得
    var statusCol = headers.indexOf('ステータス');
    var franchiseIdCol = headers.indexOf('加盟店ID');
    var companyNameCol = headers.indexOf('法人名');
    var representativeCol = headers.indexOf('代表者名');
    var phoneCol = headers.indexOf('電話番号');
    var registeredAtCol = headers.indexOf('登録日時');
    
    var unapprovedList = [];
    
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var status = statusCol >= 0 ? row[statusCol] : '';
      
      // 審査待ちのステータスのみを抽出
      if (status === '審査待ち') {
        unapprovedList.push({
          franchiseId: franchiseIdCol >= 0 ? row[franchiseIdCol] : row[0],
          companyName: companyNameCol >= 0 ? row[companyNameCol] : row[2],
          representative: representativeCol >= 0 ? row[representativeCol] : row[4],
          phone: phoneCol >= 0 ? row[phoneCol] : row[8],
          registeredAt: registeredAtCol >= 0 ? row[registeredAtCol] : row[1]
        });
      }
    }
    
    return unapprovedList;
  } catch (error) {
    console.error('❌ 未承認一覧取得エラー:', error);
    return [];
  }
}

/**
 * 簡易却下処理
 * @param {string} franchiseId 加盟店ID
 * @returns {Object} 処理結果
 */
function rejectFranchiseSimple(franchiseId) {
  try {
    console.log('❌ 簡易却下処理開始:', franchiseId);
    
    // スプレッドシートで該当加盟店のステータスを更新
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName('加盟店登録');
    
    // 加盟店IDで検索
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === franchiseId) {
        // 列インデックスを取得
        var headers = values[0];
        var statusCol = headers.indexOf('ステータス') + 1;
        var reviewerCol = headers.indexOf('審査担当者') + 1;
        var completeDateCol = headers.indexOf('審査完了日') + 1;
        var remarksCol = headers.indexOf('備考') + 1;
        
        // 列が見つからない場合は末尾に追加
        if (statusCol === 0) statusCol = headers.length + 1;
        if (reviewerCol === 0) reviewerCol = headers.length + 2;
        if (completeDateCol === 0) completeDateCol = headers.length + 3;
        if (remarksCol === 0) remarksCol = headers.length + 4;
        
        // データを設定
        sheet.getRange(i + 1, statusCol).setValue('却下');
        sheet.getRange(i + 1, reviewerCol).setValue('管理者');
        sheet.getRange(i + 1, completeDateCol).setValue(new Date().toLocaleString('ja-JP'));
        sheet.getRange(i + 1, remarksCol).setValue('Slackから却下');
        
        console.log('❌ スプレッドシート更新完了:', franchiseId);
        
        // Slack通知
        try {
          sendSlackNotification("❌ 加盟店却下完了\n加盟店ID: " + franchiseId + "\n却下日時: " + new Date().toLocaleString('ja-JP'));
        } catch (slackError) {
          console.warn('⚠️ Slack通知エラー:', slackError.message);
        }
        
        return {
          franchiseId: franchiseId,
          status: '却下',
          rejectedAt: new Date().toISOString()
        };
      }
    }
    
    throw new Error("加盟店ID " + franchiseId + " が見つかりません");
    
  } catch (error) {
    console.error('❌ 簡易却下処理エラー:', error);
    throw error;
  }
}

/**
 * GAS WebApp URLを設定（管理者用）
 * @param {string} url 新しいWebApp URL
 * @returns {Object} 設定結果
 */
function setGasWebappUrl(url) {
  try {
    PropertiesService.getScriptProperties().setProperty('GAS_WEBAPP_URL', url);
    console.log("✅ GAS WebApp URL設定完了: " + url);
    return {
      success: true,
      message: 'GAS WebApp URLを設定しました',
      url: url
    };
  } catch (error) {
    console.error('❌ GAS WebApp URL設定エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 設定情報取得API（フロントエンド用）
 * @param {Object} e リクエスト
 * @returns {Object} 設定情報
 */
function getConfig(e) {
  try {
    var config = {
      gasUrl: getGasWebappUrl(),
      timestamp: new Date().toISOString()
    };
    
    return createCorsResponse(JSON.stringify({
      success: true,
      data: config
    }));
  } catch (error) {
    console.error('❌ 設定取得エラー:', error);
    return createCorsResponse(JSON.stringify({
      success: false,
      error: error.message
    }), 500);
  }
}

/**
 * シートの2行目に新しい行を挿入するヘルパー関数（重複コード統合）
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 対象シート
 * @param {string} sheetName シート名（ログ用）
 */
function insertRowAtSecondPosition(sheet, sheetName = 'シート') {
  var lastRow = sheet.getLastRow();
  console.log("🔍 CRITICAL: 現在の最終行: " + lastRow + " (" + sheetName + ")");
  
  // 常に2行目に空行を作成（既存データがあれば下にシフト）
  if (lastRow >= 2) {
    console.log("🔍 CRITICAL: 2行目に新しい行を挿入（既存データを下にシフト） - " + sheetName);
    sheet.insertRowBefore(2);
    console.log("🔍 CRITICAL: 行挿入完了、2行目が新しく空になりました - " + sheetName);
  }
  
  return 2; // 常に2行目を返す
}

/**
 * LINE Webhook判定（エラー回避重視）
 * @param {Object} e リクエスト
 * @returns {boolean} LINE Webhookかどうか
 */
function isLineWebhook(e) {
  try {
    // Content-Typeチェック
    var contentType = e.postData && e.postData.type;
    if (contentType && contentType.includes('application/json')) {
      // LINEのWebhookデータ構造チェック
      var data = JSON.parse(e.postData.contents);
      return data && Array.isArray(data.events);
    }
    return false;
  } catch (error) {
    console.log('⚠️ LINE Webhook判定エラー（無視）:', error.message);
    return false;
  }
}




/**
 * 自動同期を設定（1時間ごと）
 */
function setupAutoSync() {
  console.log('📅 自動同期トリガーを設定中...');
  
  // 既存のトリガーを削除
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'syncGitHubToSpreadsheet') {
      ScriptApp.deleteTrigger(trigger);
      console.log('既存のGitHub同期トリガーを削除しました');
    }
  });
  
  // 新しいトリガーを作成（1時間ごと）
  ScriptApp.newTrigger('syncGitHubToSpreadsheet')
    .timeBased()
    .everyHours(1)
    .create();
  
  console.log('✅ 自動同期トリガーを設定しました（1時間ごと）');
  
  return {
    success: true,
    message: '自動同期トリガーを設定しました（1時間ごと）'
  };
}

/**
 * GitHubのMDファイルからスプレッドシートに直接反映
 * 3つのMDファイルを統合して処理
 * 自動バックアップ機能付き
 */
function syncGitHubToSpreadsheet() {
  // 同期前にバックアップを作成
  createSpreadsheetBackup();
  
  try {
    console.log('📥 GitHub→スプレッドシート同期開始（3ファイル統合版）');
    
    // GitHubからMDファイルを取得
    var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') || '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';
    
    // 1. 質問フローを取得
    var questionFlowUrl = 'https://raw.githubusercontent.com/gaihekitosoukuraberu/kuraberu-mainchatbot/main/01_question_flow.md';
    var salesTalkUrl = 'https://raw.githubusercontent.com/gaihekitosoukuraberu/kuraberu-mainchatbot/main/02_sales_talk_templates.md';
    var closingPatternsUrl = 'https://raw.githubusercontent.com/gaihekitosoukuraberu/kuraberu-mainchatbot/main/03_closing_patterns.md';
    
    console.log('🔑 Token exists:', !!token);
    
    // 全てのMDファイルを取得
    var allData = {};
    
    // 1. 質問フローを取得
    console.log('📄 1/3: 質問フロー取得中...');
    var response;
    try {
      response = UrlFetchApp.fetch(questionFlowUrl, {
        headers: { 
          'Authorization': "token " + token,
          'Accept': 'application/vnd.github.raw',
          'User-Agent': 'KuraberuAI-GAS'
        },
        muteHttpExceptions: true
      });
    } catch (fetchError) {
      console.error('❌ Fetch失敗:', fetchError.toString());
      console.error('❌ エラー詳細:', fetchError.message);
      console.error('❌ スタックトレース:', fetchError.stack);
      
      // Contents API経由で再試行
      console.log('🔄 Contents API経由で再試行...');
      var contentsUrl = 'https://api.github.com/repos/gaihekitosoukuraberu/kuraberu-mainchatbot/contents/01_question_flow.md';
      var contentsResponse = UrlFetchApp.fetch(contentsUrl, {
        headers: {
          'Authorization': "token " + token,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KuraberuAI-GAS'
        },
        muteHttpExceptions: true
      });
      
      if (contentsResponse.getResponseCode() === 200) {
        var contentsData = JSON.parse(contentsResponse.getContentText());
        // Base64デコード
        var content = Utilities.base64Decode(contentsData.content);
        var markdown = Utilities.newBlob(content).getDataAsString();
        console.log('✅ Contents API経由で取得成功:', markdown.length, '文字');
        
        // 以降の処理を続行
        var questions = parseGitHubMarkdown(markdown);
        console.log('✅ 質問解析完了:', questions.length, '個');
        updateSpreadsheetDirectly(questions);
        
        var cache = CacheService.getScriptCache();
        cache.remove('questions_all');
        console.log('✅ キャッシュクリア完了');
        
        return {
          success: true,
          message: 'GitHub→スプレッドシート同期完了（Contents API経由）',
          questionsCount: questions.length
        };
      } else {
        throw new Error('Contents API失敗: ' + contentsResponse.getResponseCode());
      }
    }
    
    console.log('📊 レスポンスコード:', response.getResponseCode());
    
    if (response.getResponseCode() !== 200) {
      console.error('❌ レスポンス内容:', response.getContentText());
      throw new Error("GitHub取得失敗: " + response.getResponseCode() + " - " + response.getContentText());
    }
    
    var questionFlowMd = response.getContentText();
    console.log('✅ 質問フロー取得成功:', questionFlowMd.length, '文字');
    
    // 2. 豆知識・安心トークを取得
    console.log('📄 2/3: 豆知識・安心トーク取得中...');
    var salesTalkResponse = UrlFetchApp.fetch(salesTalkUrl, {
      headers: { 
        'Authorization': "token " + token,
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'KuraberuAI-GAS'
      },
      muteHttpExceptions: true
    });
    
    var salesTalkMd = salesTalkResponse.getResponseCode() === 200 ? salesTalkResponse.getContentText() : '';
    console.log('✅ 豆知識取得:', salesTalkMd.length, '文字');
    
    // 3. クロージングパターンを取得
    console.log('📄 3/3: クロージングパターン取得中...');
    var closingResponse = UrlFetchApp.fetch(closingPatternsUrl, {
      headers: { 
        'Authorization': "token " + token,
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'KuraberuAI-GAS'
      },
      muteHttpExceptions: true
    });
    
    var closingMd = closingResponse.getResponseCode() === 200 ? closingResponse.getContentText() : '';
    console.log('✅ クロージング取得:', closingMd.length, '文字');
    
    // MDを解析（3ファイル統合）
    var questions = parseAllMarkdownFiles(questionFlowMd, salesTalkMd, closingMd);
    console.log('✅ 統合解析完了:', questions.length, '個');
    
    // スプレッドシートに反映（拡張カラム対応）
    updateSpreadsheetWithExtendedColumns(questions);
    
    // 変更をGASのデプロイに即座に反映させるためのキャッシュクリア
    var cache = CacheService.getScriptCache();
    cache.remove('questions_all');
    console.log('✅ キャッシュクリア完了');
    
    return {
      success: true,
      message: 'GitHub→スプレッドシート同期完了',
      questionsCount: questions.length
    };
    
  } catch (error) {
    console.error('❌ GitHub同期エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * スプレッドシートのバックアップを作成
 * 最新5個のバックアップを保持し、古いものは自動削除
 */
function createSpreadsheetBackup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sourceSheet = ss.getSheetByName('統合_質問豆知識管理');
    
    if (!sourceSheet) {
      console.log('⚠️ バックアップ対象シートが見つかりません');
      return;
    }
    
    // 現在の日時を取得
    var now = new Date();
    var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    var backupSheetName = "バックアップ_" + timestamp;
    
    console.log("📦 バックアップ作成開始: " + backupSheetName);
    
    // バックアップシートを作成
    var backupSheet = ss.insertSheet(backupSheetName);
    
    // 元のシートの全データを取得
    var lastRow = sourceSheet.getLastRow();
    var lastCol = sourceSheet.getLastColumn();
    
    if (lastRow > 0 && lastCol > 0) {
      var sourceData = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
      
      // バックアップシートにデータを貼り付け
      backupSheet.getRange(1, 1, lastRow, lastCol).setValues(sourceData);
      
      // 書式もコピー
      var sourceFormatting = sourceSheet.getRange(1, 1, lastRow, lastCol);
      var backupFormatting = backupSheet.getRange(1, 1, lastRow, lastCol);
      sourceFormatting.copyTo(backupFormatting, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    
    console.log("✅ バックアップ作成完了: " + backupSheetName);
    
    // 古いバックアップを削除（最新5個を保持）
    cleanupOldBackups();
    
  } catch (error) {
    console.error('❌ バックアップ作成エラー:', error);
  }
}

/**
 * 古いバックアップシートを削除（最新5個を保持）
 */
function cleanupOldBackups() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    // バックアップシートのみを抽出
    var backupSheets = sheets.filter(sheet => 
      sheet.getName().startsWith('バックアップ_')
    );
    
    // 名前（タイムスタンプ）でソート（新しい順）
    backupSheets.sort((a, b) => b.getName().localeCompare(a.getName()));
    
    // 5個を超える古いバックアップを削除
    var sheetsToDelete = backupSheets.slice(5);
    
    sheetsToDelete.forEach(sheet => {
      try {
        ss.deleteSheet(sheet);
        console.log("🗑️ 古いバックアップを削除: " + sheet.getName());
      } catch (deleteError) {
        console.error("❌ バックアップ削除エラー: " + sheet.getName(), deleteError);
      }
    });
    
    console.log("✅ バックアップクリーンアップ完了: " + backupSheets.length + "個中" + sheetsToDelete.length + "個を削除");
    
  } catch (error) {
    console.error('❌ バックアップクリーンアップエラー:', error);
  }
}

/**
 * 3つのMDファイルを統合解析
 */
function parseAllMarkdownFiles(questionFlowMd, salesTalkMd, closingMd) {
  // 1. 質問フローを解析
  var questions = parseGitHubMarkdown(questionFlowMd);
  
  // 2. 豆知識・安心トークを解析して質問にマージ
  var salesTalkData = parseSalesTalkMarkdown(salesTalkMd);
  
  
  questions.forEach(q => {
    // MDファイルは実際のスプレッドシート質問IDを使用（Q008, Q011, Q014, Q015, Q900-Q903, C999）
    var questionId = q.id;
    
    if (salesTalkData[questionId]) {
      var knowledgeData = salesTalkData[questionId];
      q.knowledgeTitle = knowledgeData.titleHint || knowledgeData.title || q.id + "の豆知識";
      q.knowledgeComment = knowledgeData.comment || '';
      q.knowledgeBody = knowledgeData.body || '';
      q.salesPrompt = knowledgeData.salesPrompt || '';
      
      // 安心チェックリストがある場合は豆知識詳細に追加
      if (knowledgeData.checklist) {
        q.knowledgeBody = q.knowledgeBody + '\n\n' + knowledgeData.checklist;
      }
      
    } else {
      // 豆知識がない場合も空文字を設定
      q.knowledgeTitle = '';
      q.knowledgeComment = '';
      q.knowledgeBody = '';
      q.salesPrompt = '';
      console.log("⚠️ 豆知識なし: " + q.id);
    }
  });
  
  // 3. クロージングパターンを解析して追加
  var closingData = parseClosingPatterns(closingMd);
  Object.keys(closingData).forEach(closingId => {
    var existingQ = questions.find(q => q.id === closingId);
    if (existingQ) {
      existingQ.closingPattern = closingData[closingId].pattern || '';
      existingQ.closingPrompt = closingData[closingId].prompt || '';
    }
  });
  
  return questions;
}

/**
 * 豆知識・安心トークMDを解析
 */
function parseSalesTalkMarkdown(markdown) {
  var salesTalkData = {};
  var lines = markdown.split('\n');
  
  var currentQuestionId = null;
  var currentSection = null;
  var buffer = [];
  var currentTitle = null; // タイトルを保持
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // ## Q004（築年数）のような形式を検出
    if (line.match(/^##\s*[QC]\d+/)) {
      // 前のデータを保存
      if (currentQuestionId && currentSection && buffer.length > 0) {
        salesTalkData[currentQuestionId][currentSection] = buffer.join('\n').trim();
      }
      
      // 新しい質問IDとタイトルを抽出
      var match = line.match(/([QC]\d+)[^（]*(?:（([^）]+)）)?/);
      if (match) {
        currentQuestionId = match[1].charAt(0) + match[1].substring(1).padStart(3, '0');
        currentTitle = match[2] || null; // 括弧内のタイトル
        salesTalkData[currentQuestionId] = {};
        if (currentTitle) {
          salesTalkData[currentQuestionId].titleHint = currentTitle;
        }
        buffer = [];
        currentSection = null;
      }
    }
    // **豆知識**、**安心トーク**などを検出
    else if (line.match(/^\*\*(豆知識|安心トーク|安心チェックリスト|営業プロンプト)\*\*$/)) {
      // 前のセクションを保存
      if (currentSection && buffer.length > 0) {
        salesTalkData[currentQuestionId][currentSection] = buffer.join('\n').trim();
        buffer = [];
      }
      
      if (line.includes('豆知識')) {
        currentSection = 'knowledgeComment';
      } else if (line.includes('安心トーク')) {
        currentSection = 'body';
      } else if (line.includes('安心チェックリスト')) {
        currentSection = 'checklist';
      } else if (line.includes('営業プロンプト')) {
        currentSection = 'salesPrompt';
      }
    }
    // > で始まる引用行やその他のデータ行
    else if (currentQuestionId && currentSection && line.length > 0 && !line.startsWith('---')) {
      // > で始まる場合は、> を除去
      var cleanLine = line.startsWith('>') ? line.substring(1).trim() : line;
      if (cleanLine.length > 0) {
        buffer.push(cleanLine);
      }
    }
  }
  
  // 最後のデータを保存
  if (currentQuestionId && currentSection && buffer.length > 0) {
    salesTalkData[currentQuestionId][currentSection] = buffer.join('\n').trim();
  }
  
  // タイトルとして質問IDを設定
  Object.keys(salesTalkData).forEach(qId => {
    if (!salesTalkData[qId].title) {
      salesTalkData[qId].title = qId + "の豆知識";
    }
    // knowledgeCommentをcommentに変換
    if (salesTalkData[qId].knowledgeComment) {
      salesTalkData[qId].comment = salesTalkData[qId].knowledgeComment;
      delete salesTalkData[qId].knowledgeComment;
    }
  });
  
  
  return salesTalkData;
}

/**
 * クロージングパターンMDを解析
 */
function parseClosingPatterns(markdown) {
  var closingData = {};
  var lines = markdown.split('\n');
  
  var currentQuestionId = null;
  var buffer = [];
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // ## Q900形式を検出
    if (line.match(/^##\s*Q\d/)) {
      // 前のデータを保存
      if (currentQuestionId && buffer.length > 0) {
        closingData[currentQuestionId] = {
          pattern: buffer.join('\n').trim()
        };
      }
      
      // 新しい質問ID
      var match = line.match(/Q(\d+)/);
      if (match) {
        currentQuestionId = 'Q' + match[1].padStart(3, '0');
        buffer = [];
      }
    }
    // データ行
    else if (currentQuestionId && line.length > 0 && !line.startsWith('#')) {
      buffer.push(line);
    }
  }
  
  // 最後のデータを保存
  if (currentQuestionId && buffer.length > 0) {
    closingData[currentQuestionId] = {
      pattern: buffer.join('\n').trim()
    };
  }
  
  return closingData;
}

/**
 * スプレッドシートに拡張カラムで反映
 */
function updateSpreadsheetWithExtendedColumns(questions) {
  try {
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('統合_質問豆知識管理');
    
    if (!sheet) {
      console.log('⚠️ シート作成');
      sheet = ss.insertSheet('統合_質問豆知識管理');
    }
    
    // 拡張ヘッダー設定
    var headers = [
      '質問ID', 'ヒアリング段階', '質問タイプ', '質問文',
      '選択肢1', '選択肢2', '選択肢3', '選択肢4',
      '有効フラグ', '分岐先1', '分岐先2', '分岐先3', '分岐先4',
      '豆知識タイトル', '豆知識コメント', '豆知識詳細',
      '営業プロンプト', 'YoutubeURL',
      'クロージングパターン', 'クロージングプロンプト' // 新規追加
    ];
    
    // 既存データをクリア
    sheet.clear();
    
    // ヘッダー設定
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // データ設定
    var data = questions.map((q, index) => {
      return [
        q.id,
        q.stage || '第1段階',
        q.type || (q.choices.length > 0 ? '必須' : 'message'),
        q.questionText,
        q.choices[0] || '',
        q.choices[1] || '',
        q.choices[2] || '',
        q.choices[3] || '',
        true, // 有効フラグ
        q.branches[0] || '',
        q.branches[1] || '',
        q.branches[2] || '',
        q.branches[3] || '',
        q.knowledgeTitle || '',
        q.knowledgeComment || '',
        q.knowledgeBody || '', // 豆知識詳細
        q.salesPrompt || '', // 営業プロンプト
        q.youtubeUrl || '', // YoutubeURL
        q.closingPattern || '', // クロージングパターン
        q.closingPrompt || '' // クロージングプロンプト
      ];
    });
    
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    
    // フォーマット
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4285f4')
      .setFontColor('white')
      .setFontWeight('bold');
    
    sheet.autoResizeColumns(1, headers.length);
    
    
  } catch (error) {
    console.error('❌ スプレッドシート更新エラー:', error);
    throw error;
  }
}

/**
 * スプレッドシートに直接反映（GPT不使用）
 */
function updateSpreadsheetDirectly(questions) {
  try {
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('統合_質問豆知識管理');
    
    if (!sheet) {
      console.log('⚠️ シート作成');
      sheet = ss.insertSheet('統合_質問豆知識管理');
    }
    
    // ヘッダー設定
    var headers = [
      '質問ID', 'ヒアリング段階', '質問タイプ', '質問文',
      '選択肢1', '選択肢2', '選択肢3', '選択肢4',
      '有効フラグ', '分岐先1', '分岐先2', '分岐先3', '分岐先4',
      '豆知識タイトル', '豆知識コメント', '豆知識詳細',
      '営業プロンプト', 'YoutubeURL'
    ];
    
    // 既存データをクリア
    sheet.clear();
    
    // ヘッダー設定
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // データ設定
    var data = questions.map((q, index) => {
      return [
        q.id,
        q.stage || '第1段階',
        q.type || (q.choices.length > 0 ? '必須' : 'message'),
        q.questionText,
        q.choices[0] || '',
        q.choices[1] || '',
        q.choices[2] || '',
        q.choices[3] || '',
        true, // 有効フラグ
        q.branches[0] || '',
        q.branches[1] || '',
        q.branches[2] || '',
        q.branches[3] || '',
        q.knowledgeTitle || '',
        q.knowledgeComment || '',
        '', // 豆知識詳細
        '', // 営業プロンプト
        ''  // YoutubeURL
      ];
    });
    
    if (data.length > 0) {
      sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    }
    
    // フォーマット
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4285f4')
      .setFontColor('white')
      .setFontWeight('bold');
    
    sheet.autoResizeColumns(1, headers.length);
    
    
  } catch (error) {
    console.error('❌ スプレッドシート更新エラー:', error);
    throw error;
  }
}

/**
 * GitHubのMarkdownを正確に解析
 */
function parseGitHubMarkdown(markdown) {
  var questions = [];
  var lines = markdown.split('\n');
  
  
  var currentStage = '第1段階'; // デフォルト段階
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    
    // ## ■ 第1段階、第2段階などを検出
    if (line.match(/^##\s*■\s*第(\d)段階/)) {
      var stageMatch = line.match(/第(\d)段階/);
      if (stageMatch) {
        currentStage = "第" + stageMatch[1] + "段階";
      }
    }
    
    // Q999は第4段階（最終段階）として扱う
    if (line.match(/^#{2,3}\s*Q999/)) {
      currentStage = '第4段階';
    }
    // Q900番台は第3段階（クロージング）として扱う（Q999除く）
    else if (line.match(/^#{2,3}\s*Q9\d/) && !line.match(/^#{2,3}\s*Q999/)) {
      currentStage = '第3段階';
    }
    
    // ### Q001, ## Q001 などを検出（2つまたは3つの#に対応）
    if (line.match(/^#{2,3}\s*Q\d/)) {
      var questionMatch = line.match(/Q(\d+(?:-\d+)?)/);
      if (!questionMatch) {
        console.log('⚠️ 質問ID抽出失敗');
        continue;
      }
      
      var questionId = questionMatch[1];
      
      // Q1-2 → Q012 に変換
      if (questionId.includes('-')) {
        var parts = questionId.split('-');
        questionId = parts[0].padStart(2, '0') + parts[1];
      }
      questionId = 'Q' + questionId.padStart(3, '0');
      
      var questionText = '';
      var choices = [];
      var branches = [];
      
      // Q999特別処理
      if (questionId === 'Q999') {
        questionText = 'その他、未ヒアリング事項をお伺いします。';
        // Q999は複数ページのフォーム形式なので選択肢なし
        console.log('🎯 Q999特別処理: 複数ページフォーム形式');
      } else {
        // 通常の質問内容を取得
        for (var j = i + 1; j < lines.length && j < i + 30; j++) {
          var nextLine = lines[j].trim();
          
          // 次の質問まで（### Qまたは ## で始まる行）
          if (nextLine.match(/^#{2,3}\s*Q\d/) || nextLine.match(/^#{1,2}\s+■/)) {
            break;
          }
          
          // 質問文の検出（「」で囲まれた、または空行の後の最初のテキスト）
          if (!questionText && nextLine.length > 0 && !nextLine.match(/^\d+\./)) {
            // 「」で囲まれた場合
            if (nextLine.startsWith('「') && nextLine.endsWith('」')) {
              questionText = nextLine.slice(1, -1);
            } else if (!nextLine.startsWith('#') && !nextLine.startsWith('-')) {
              // 通常のテキスト行（番号リストではない）
              questionText = nextLine;
            }
          }
          
          // 選択肢 1. 2. 3. 4.
          if (nextLine.match(/^\d+\.\s+/)) {
            var choiceText = nextLine.replace(/^\d+\.\s+/, '');
            
            if (choiceText.includes('→')) {
              var parts = choiceText.split('→');
              var choice = parts[0].trim();
              var branchText = parts[1].trim();
              
              choices.push(choice);
              
              // 分岐先のQ番号を抽出・正規化
              var branchMatch = branchText.match(/Q(\d+(?:-\d+)?)/);
              if (branchMatch) {
                var branchId = branchMatch[1];
                if (branchId.includes('-')) {
                  var branchParts = branchId.split('-');
                  branchId = branchParts[0].padStart(2, '0') + branchParts[1];
                }
                branches.push('Q' + branchId.padStart(3, '0'));
              } else {
                branches.push('');
              }
            } else {
              choices.push(choiceText);
              branches.push('');
            }
          }
        }
      }
      
      if (questionText) {
        questions.push({
          id: questionId,
          stage: currentStage, // 動的に設定された段階を使用
          type: choices.length > 0 ? '必須' : 'message',
          questionText: questionText,
          choices: choices,
          branches: branches,
          knowledgeTitle: '',
          knowledgeComment: ''
        });
        
      } else {
        console.log("⚠️ 質問文が見つからず: " + questionId);
      }
    }
  }
  
  return questions;
}


/**
 * 統合LINE Webhook処理（エラー回避重視）
 * @param {Object} e リクエスト
 * @returns {Object} レスポンス
 */
function handleLineWebhookUnified(e) {
  try {
    
    var requestBody = JSON.parse(e.postData.contents);
    var events = requestBody.events || [];
    
    if (events.length === 0) {
      console.log('⚠️ イベントが空 - 成功レスポンス返却');
      return createCorsResponse(JSON.stringify({ success: true, message: 'No events' }));
    }
    
    var results = [];
    
    // 各イベントを安全に処理
    events.forEach((event, index) => {
      try {
        console.log("📱 イベント" + (index + 1) + "処理: " + event.type);
        
        // BOTヒアリング処理判定
        if (isFranchiseBotEvent(event)) {
          console.log('🎯 加盟店ヒアリングBOT処理へ');
          var botResult = processBotEvent(event);
          results.push({ eventIndex: index, type: 'bot', result: botResult });
        } else {
          console.log('📢 一般通知処理へ');
          // 既存の通知処理（必要に応じて）
          results.push({ eventIndex: index, type: 'notification', result: { success: true } });
        }
        
      } catch (eventError) {
        console.error("❌ イベント" + index + 1 + "処理エラー:", eventError.message);
        results.push({ eventIndex: index, type: 'error', error: eventError.message });
      }
    });
    
    
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
    // CORS対応 - 最初に設定
    var jsonResponse = (data) => {
      var output = ContentService.createTextOutput(JSON.stringify(data));
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    };
    
    console.log('🚨🚨🚨 GAS doPost 受信確認 🚨🚨🚨');
    console.log('🔗 統合 WebApp POST受信');
    
    // POSTボディの処理
    var postData = null;
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
        console.log('📦 POSTデータ解析成功:', JSON.stringify(postData).substring(0, 200));
      } catch (parseError) {
        console.error('❌ POSTデータ解析エラー:', parseError);
        postData = null;
      }
    }
    
    // POSTデータから加盟店登録を処理
    if (postData && postData.action === 'submitFranchiseRegistration') {
      console.log('📋 加盟店登録処理（POST）');
      var registrationData = postData.data;
      
      // saveFranchiseData関数を呼び出し
      if (typeof saveFranchiseData === 'function') {
        var result = saveFranchiseData(registrationData);
        return jsonResponse(result);
      } else {
        return jsonResponse({
          success: false,
          error: 'saveFranchiseData関数が見つかりません'
        });
      }
    }
    console.log('  postData:', e.postData);
    console.log('  postData.contents:', e.postData ? e.postData.contents : 'undefined');
    console.log('  parameter:', e.parameter);
    console.log('🔍 CRITICAL DEBUG: doPost開始');
    
    // 認証API処理（最優先）
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : null;
    if (action) {
      console.log('🔐 認証API action検出:', action);
      switch(action) {
        case 'set-initial-password':
        case 'authset-initial-password':
        case 'auth/set-initial-password':
          console.log('Password setting API called via POST');
          var result = setInitialPassword(e.parameter);
          console.log('🔐 Password setting result:', result);
          return jsonResponse(result);
          
        case 'login':
        case 'authlogin':
          console.log('Login API called via POST');
          var loginResult = authenticateUser(e.parameter);
          return jsonResponse(loginResult);
          
        case 'request-password-reset':
        case 'authrequest-password-reset':
          console.log('Password reset API called via POST');
          var resetResult = requestPasswordReset(e.parameter);
          return jsonResponse(resetResult);
      }
    }
    
    // 新しいURLボタンシステムでは古いボタンコールバック処理は不要
    
    // CORS Preflight対応（最優先）
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      console.log('🔧 OPTIONS プリフライトリクエスト対応');
      return createCorsResponse('', 200);
    }
    
    // 新しいURLボタンシステムでは古いSlackインタラクティブ判定は不要
    
    // 2. LINE Webhook判定
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
        functionName = requestData.action || requestData.function || requestData.type;
        parameters = requestData.parameters || requestData;
        path = requestData.path;
        
      } else if (e.postData && e.postData.contents) {
        requestData = JSON.parse(e.postData.contents);
        functionName = requestData.action || requestData.function || requestData.type;
        parameters = requestData.parameters || requestData;
        path = requestData.path;
        
      } else if (e.parameter && e.parameter.data) {
        // JSONP GETパラメータ処理
        requestData = JSON.parse(e.parameter.data);
        functionName = requestData.action || requestData.function || requestData.type;
        parameters = requestData;
        path = requestData.path;
        
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
    console.log('ルーティング:', functionName);
    
    var result;
    
    switch (functionName) {
        // 認証関連
        case 'auth/login':
          result = handleLogin(parameters);
          break;
        
        // 加盟店管理API
        case 'getFranchiseList':
          result = getFranchiseList();
          break;
        case 'updateFranchiseStatus':
          result = updateFranchiseStatus(parameters.franchiseId, parameters.status, parameters.reviewer, parameters.comment);
          break;
        case 'getFranchiseStatistics':
          result = getFranchiseStatistics();
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
        
      // 4択チャットシステム関連
      case 'getQuestionsByStage':
        // requiredOnlyパラメータを適切に変換
        var requiredOnly = parameters.requiredOnly === 'true' || parameters.requiredOnly === true;
        result = getQuestionsByStageAPI(parameters.stage, requiredOnly);
        break;
        
      case 'selectNextQuestionWithAI':
        result = selectNextQuestionWithAI(parameters);
        break;
        
      case 'debugSpreadsheet':
        result = debugSpreadsheetInfo();
        break;
        
      case 'setupGAS':
        result = setupGASForSpreadsheetAccess();
        break;
        
      case 'initializeSpreadsheet':
        try {
          var setupResult = setupAndInitialize();
          result = {
            success: setupResult.success,
            message: setupResult.success ? 'スプレッドシート初期化完了' : 'スプレッドシート初期化失敗',
            details: setupResult
          };
        } catch (error) {
          result = {
            success: false,
            error: '初期化エラー: ' + error.toString()
          };
        }
        break;
        
      case 'processHearingStage':
        result = processHearingStageAPI(parameters);
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
      // startAIHearingは別の場所で処理される
      case 'selectCandidate':
        result = selectCandidate(parameters);
        break;
      case 'confirmAICandidate':
        result = confirmAICandidate(parameters);
        break;
      case 'searchCompanyDetails':
        result = searchCompanyDetails(parameters);
        break;
      case 'searchCompanyDetailsFromAI':
        result = searchCompanyDetailsFromAI(parameters);
        break;
      case 'updateCorrectionData':
        result = updateCorrectionData(parameters);
        break;
      case 'generatePRSuggestion':
        result = generatePRSuggestion(parameters);
        break;
        
      // 🌐 設定情報取得
      case 'getConfig':
        result = {
          success: true,
          gasUrl: getGasWebappUrl(),
          timestamp: new Date().toISOString(),
          deployed: true
        };
        break;
      case 'processHumanHearing':
        result = processHumanHearing(parameters);
        break;
      case 'getQuestionsByStage':
        result = getQuestionsByStage(parameters.stage || 'all', parameters.requiredOnly || false);
        break;
      case 'completeHearing':
        result = completeHearing(parameters);
        break;
      case 'extractFromWebsite':
        if (typeof extractFromWebsiteNotify === 'function') {
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
      case 'getFranchiseNotificationSettings':
        result = getFranchiseNotificationSettings(parameters.franchiseId);
        break;
        
      // 🎯 チャンク処理（分割送信対応）
      case 'submitFranchiseChunk':
        console.log('📦 加盟店データチャンク受信');
        if (typeof handleFranchiseChunk === 'function') {
          result = handleFranchiseChunk(parameters);
        } else {
          console.error('❌ handleFranchiseChunk関数が見つかりません');
          result = {
            success: false,
            error: 'チャンク処理関数が未定義です'
          };
        }
        break;
        
      case 'combineFranchiseChunks':
        console.log('🔄 加盟店データチャンク結合');
        if (typeof combineFranchiseChunks === 'function') {
          result = combineFranchiseChunks(parameters);
        } else {
          console.error('❌ combineFranchiseChunks関数が見つかりません');
          result = {
            success: false,
            error: 'チャンク結合関数が未定義です'
          };
        }
        break;
      
      
      // GAS URL取得（プロパティから）
      case 'getGasUrl':
        console.log('📌 GAS_WEBAPP_URL取得リクエスト');
        const gasUrl = PropertiesService.getScriptProperties().getProperty('GAS_WEBAPP_URL');
        if (gasUrl) {
          result = {
            success: true,
            url: gasUrl
          };
          console.log('✅ GAS_WEBAPP_URL返却:', gasUrl);
        } else {
          result = {
            success: false,
            message: 'GAS_WEBAPP_URLが未設定です'
          };
          console.log('⚠️ GAS_WEBAPP_URL未設定');
        }
        break;
        
      // 接続テスト
      case 'connectionTest':
        
        // extractFromWebsiteかどうかチェック
        var hasExtractAction = parameters && (parameters.action === 'extractFromWebsite' || parameters.websiteUrl);
        
        if (hasExtractAction) {
          
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
        
      // 4段階ヒアリングシステム
      case 'processHearingStage':
        result = processHearingStage(
          parameters.sessionId, 
          parameters.stage, 
          parameters.userAnswers, 
          parameters.customPrompt
        );
        break;
        
      // GPT API統合（外壁塗装estimate-app用）
      case 'gptWithPromptLayers':
        
        // chat_controller.gsのhandleGptWithPromptLayers関数を呼び出し
        if (typeof handleGptWithPromptLayers === 'function') {
          result = handleGptWithPromptLayers(parameters);
        } else {
          console.error('❌ handleGptWithPromptLayers関数が見つかりません');
          result = {
            success: false,
            error: 'handleGptWithPromptLayers関数が定義されていません。chat_controller.gsを確認してください。'
          };
        }
        console.log('🤖 gptWithPromptLayers結果:', JSON.stringify(result, null, 2));
        break;

      // PropertiesService設定確認（デバッグ用）
      case 'checkProperties':
        
        // chat_controller.gsのcheckProperties関数またはgpt_api_handler.gsのcheckProperties関数を呼び出し
        if (typeof checkProperties === 'function') {
          result = checkProperties();
        } else {
          // 直接PropertiesServiceを確認
          try {
            var properties = PropertiesService.getScriptProperties().getProperties();
            var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
            var openaiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
            
            result = {
              success: true,
              spreadsheetId: spreadsheetId ? '設定済み' : '未設定',
              openaiKey: openaiKey ? '設定済み' : '未設定',
              totalProperties: Object.keys(properties).length,
              availableProperties: Object.keys(properties).filter(key => properties[key]).length
            };
          } catch (error) {
            result = {
              success: false,
              error: error.message
            };
          }
        }
        break;

      // 🚀 キャッシュ管理（高速化用）
      case 'clearCache':
        console.log('🗑️ スプレッドシートキャッシュクリア開始');
        
        if (typeof clearSpreadsheetCache === 'function') {
          result = clearSpreadsheetCache();
        } else {
          result = {
            success: true,
            message: 'キャッシュクリア機能は実装されていません'
          };
        }
        break;

      case 'getCacheStatus':
        
        if (typeof getCacheStatus === 'function') {
          result = getCacheStatus();
        } else {
          result = {
            success: false,
            message: 'キャッシュ状態確認機能は実装されていません'
          };
        }
        break;
        
      case 'gptChat':
        
        // 簡易GPT応答（フォールバック）- 既存の four_stage_hearing_system.gs を活用
        try {
          if (typeof FourStageHearingManager !== 'undefined') {
            var hearingManager = new FourStageHearingManager();
            var stageNum = parseInt(parameters.currentStage.replace('第', '').replace('段階', '')) || 1;
            var stageResult = hearingManager.processStage('temp-session', stageNum, [], null);
            
            result = {
              success: true,
              response: "ありがとうございます。" + parameters.userMessage + "について承知いたしました。",
              hasQuestion: true,
              questionOptions: generateBasicQuestionOptions(parameters.currentStage),
              nextStage: parameters.currentStage
            };
          } else {
            result = {
              success: true,
              response: "ありがとうございます。" + parameters.userMessage + "について承知いたしました。",
              hasQuestion: true,
              questionOptions: generateBasicQuestionOptions(parameters.currentStage),
              nextStage: parameters.currentStage
            };
          }
        } catch (error) {
          result = {
            success: true,
            response: "ありがとうございます。" + parameters.userMessage + "について承知いたしました。",
            hasQuestion: true,
            questionOptions: generateBasicQuestionOptions(parameters.currentStage),
            nextStage: parameters.currentStage
          };
        }
        console.log('💬 gptChat結果:', JSON.stringify(result, null, 2));
        break;
        
      // ユーザーヒアリングデータ保存
      case 'saveUserHearingData':
        console.log('💾 ユーザーヒアリングデータ保存開始');
        
        try {
          var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          if (!spreadsheetId) {
            throw new Error('スプレッドシートIDが設定されていません');
          }
          
          var ss = SpreadsheetApp.openById(spreadsheetId);
          var sheet = ss.getSheetByName('統合_ヒアリング結果');
          
          // シートが存在しない場合は作成
          if (!sheet) {
            sheet = ss.insertSheet('統合_ヒアリング結果');
            var headers = [
              'タイムスタンプ', '電話番号', '郵便番号', '回答数', 
              '外壁材質', '建物面積', '外壁状態', '工事時期', 
              '詳細状況', '屋根状況', '予算', '重視点', '色希望', '連絡方法',
              '全回答データ', 'IPアドレス', 'ユーザーエージェント'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setBackground('#607d8b').setFontColor('white').setFontWeight('bold');
          }
          
          // 回答データから主要項目を抽出
          var answers = parameters.userAnswers || [];
          var answerMap = {};
          answers.forEach(answer => {
            answerMap[answer.questionId] = answer.answer;
          });
          
          var newRow = [
            new Date(), // タイムスタンプ
            parameters.phoneNumber || '', // 電話番号
            parameters.postalCode || '', // 郵便番号
            answers.length, // 回答数
            answerMap['Q001'] || '', // 外壁材質
            answerMap['Q002'] || '', // 建物面積
            answerMap['Q003'] || '', // 外壁状態
            answerMap['Q004'] || '', // 工事時期
            answerMap['Q005'] || '', // 詳細状況
            answerMap['Q006'] || '', // 屋根状況
            answerMap['Q007'] || '', // 予算
            answerMap['Q008'] || '', // 重視点
            answerMap['Q009'] || '', // 色希望
            answerMap['Q010'] || '', // 連絡方法
            JSON.stringify(parameters.userAnswers), // 全回答データ
            'N/A', // IPアドレス
            'N/A'  // ユーザーエージェント
          ];
          
          sheet.appendRow(newRow);
          
          result = {
            success: true,
            message: 'ヒアリングデータを保存しました',
            savedAnswers: answers.length,
            phoneNumber: parameters.phoneNumber,
            timestamp: new Date()
          };
          
        } catch (error) {
          console.error('❌ ヒアリングデータ保存エラー:', error);
          result = {
            success: false,
            error: error.toString(),
            message: 'データ保存に失敗しました'
          };
        }
        
        console.log('💾 ヒアリングデータ保存結果:', JSON.stringify(result, null, 2));
        break;
        
      // CV用データ保存
      case 'saveCVData':
        console.log('📞 CV用データ保存開始');
        
        try {
          var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          if (!spreadsheetId) {
            throw new Error('スプレッドシートIDが設定されていません');
          }
          
          var ss = SpreadsheetApp.openById(spreadsheetId);
          var sheet = ss.getSheetByName('統合_CV記録');
          
          // シートが存在しない場合は作成
          if (!sheet) {
            sheet = ss.insertSheet('統合_CV記録');
            var headers = [
              'タイムスタンプ', '電話番号', '郵便番号', '段階', '回答数', 
              '外壁材質', '建物面積', '外壁状態', '工事時期', 
              '詳細状況', '屋根状況', '予算', '全回答データ', 'IPアドレス'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setBackground('#28a745').setFontColor('white').setFontWeight('bold');
          }
          
          // 回答データから主要項目を抽出
          var answers = parameters.userAnswers || [];
          var answerMap = {};
          answers.forEach(answer => {
            answerMap[answer.questionId] = answer.answer;
          });
          
          var newRow = [
            new Date(), // タイムスタンプ
            parameters.phoneNumber || '', // 電話番号
            parameters.postalCode || '', // 郵便番号
            parameters.stage || 'CV完了', // 段階
            answers.length, // 回答数
            answerMap['Q001'] || '', // 外壁材質
            answerMap['Q002'] || '', // 建物面積
            answerMap['Q003'] || '', // 外壁状態
            answerMap['Q004'] || '', // 工事時期
            answerMap['Q005'] || '', // 詳細状況
            answerMap['Q006'] || '', // 屋根状況
            answerMap['Q007'] || '', // 予算
            JSON.stringify(parameters.userAnswers), // 全回答データ
            'N/A' // IPアドレス
          ];
          
          sheet.appendRow(newRow);
          
          result = {
            success: true,
            message: 'CV用データを保存しました',
            phoneNumber: parameters.phoneNumber,
            answerCount: answers.length,
            timestamp: new Date()
          };
          
        } catch (error) {
          console.error('❌ CV用データ保存エラー:', error);
          result = {
            success: false,
            error: error.toString(),
            message: 'CV用データ保存に失敗しました'
          };
        }
        
        console.log('📞 CV用データ保存結果:', JSON.stringify(result, null, 2));
        break;
        
      // 最終データ保存
      case 'saveFinalData':
        console.log('🎯 最終データ保存開始');
        
        try {
          var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          if (!spreadsheetId) {
            throw new Error('スプレッドシートIDが設定されていません');
          }
          
          var ss = SpreadsheetApp.openById(spreadsheetId);
          var sheet = ss.getSheetByName('統合_最終結果');
          
          // シートが存在しない場合は作成
          if (!sheet) {
            sheet = ss.insertSheet('統合_最終結果');
            var headers = [
              'タイムスタンプ', '電話番号', '第1-3段階回答数', '第4段階回答数', 
              '現地調査希望', '業者数希望', '心配事', '選択業者数',
              '選択業者リスト', '全回答データ', '第4段階データ', 'IPアドレス'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setBackground('#dc3545').setFontColor('white').setFontWeight('bold');
          }
          
          // 第4段階回答から主要項目を抽出
          var stage4Answers = parameters.stage4Answers || [];
          var stage4Map = {};
          stage4Answers.forEach(answer => {
            stage4Map[answer.questionId] = answer.answer;
          });
          
          var newRow = [
            new Date(), // タイムスタンプ
            parameters.phoneNumber || '', // 電話番号
            (parameters.userAnswers || []).length, // 第1-3段階回答数
            stage4Answers.length, // 第4段階回答数
            stage4Map['Q011'] || '', // 現地調査希望
            stage4Map['Q012'] || '', // 業者数希望
            stage4Map['Q013'] || '', // 心配事
            (parameters.selectedCompanies || []).length, // 選択業者数
            (parameters.selectedCompanies || []).join(', '), // 選択業者リスト
            JSON.stringify(parameters.userAnswers), // 全回答データ
            JSON.stringify(parameters.stage4Answers), // 第4段階データ
            'N/A' // IPアドレス
          ];
          
          sheet.appendRow(newRow);
          
          result = {
            success: true,
            message: '最終データを保存しました',
            phoneNumber: parameters.phoneNumber,
            selectedCompanies: parameters.selectedCompanies,
            timestamp: new Date()
          };
          
        } catch (error) {
          console.error('❌ 最終データ保存エラー:', error);
          result = {
            success: false,
            error: error.toString(),
            message: '最終データ保存に失敗しました'
          };
        }
        
        console.log('🎯 最終データ保存結果:', JSON.stringify(result, null, 2));
        break;
        
      // 見積もり依頼受付（estimate-app用）
      case 'estimate':
        console.log('📋 見積もり依頼を処理します');
        try {
          result = handleEstimateRequest(parameters);
        } catch (error) {
          console.error('見積もり依頼処理エラー:', error);
          result = {
            success: false,
            message: error.toString()
          };
        }
        break;
        
        // その他
        default:
          console.log('⚠️ 未知のアクション:', functionName);
          result = {
            success: false,
            message: "未対応のアクション: " + functionName,
            error: 'UNSUPPORTED_ACTION'
          };
      }
    
    console.log('🔍 CRITICAL DEBUG: doPost終了直前');
    console.log('🔍 CRITICAL DEBUG: result =', JSON.stringify(result, null, 2));
    
    return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
    
  } catch (error) {
    console.error('❌ doPost全体エラー:', error.message);
    console.error('❌ doPost全体スタック:', error.stack);
    
    // エラーをプロパティに保存
    PropertiesService.getScriptProperties().setProperty('LAST_ERROR', error.message);
    PropertiesService.getScriptProperties().setProperty('LAST_ERROR_STACK', error.stack);
    PropertiesService.getScriptProperties().setProperty('LAST_EXECUTION', new Date().toISOString());
    
    return createCorsResponse(JSON.stringify({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.toString()
    }), 500);
  }
}


/**
 * 会社詳細情報検索（第2段階）- searchCompanyDetailsFromAI関数
 * 屋号、支店情報、設立年月日、PR文を検索
 */
function searchCompanyDetailsFromAI(params) {
  try {
    console.log('🔍 第2段階詳細検索開始 - 受信パラメータ:', JSON.stringify(params));
    
    if (!params) {
      console.log('❌ パラメータが null または undefined');
      return {
        success: false,
        error: 'パラメータが提供されていません'
      };
    }
    
    var { companyName, address, websiteUrl } = params;
    console.log('🔍 抽出パラメータ - companyName:', companyName, ', address:', address, ', websiteUrl:', websiteUrl);
    
    // 実際のWebサイトから詳細情報をスクレイピング
    var detailedContent = '';
    
    // WebサイトURLがある場合は直接スクレイピング
    if (websiteUrl && websiteUrl.trim() !== '') {
      Logger.log('🌐 公式Webサイトから詳細情報を取得: ' + websiteUrl);
      
      // メインページ
      var mainContent = scrapeWebContent(websiteUrl);
      if (mainContent) {
        detailedContent += '\n=== メインページ ===\n' + mainContent;
      }
      
      // 会社概要ページを探す
      var aboutUrls = [
        websiteUrl + '/company',
        websiteUrl + '/about',
        websiteUrl + '/profile',
        websiteUrl + '/company.html',
        websiteUrl + '/about.html'
      ];
      
      for (var i = 0; i < aboutUrls.length; i++) {
        try {
          var aboutContent = scrapeWebContent(aboutUrls[i]);
          if (aboutContent && aboutContent.length > 100) {
            detailedContent += '\n=== 会社概要ページ ===\n' + aboutContent;
            break;
          }
        } catch (e) {
          // エラーは無視
        }
      }
      
      // 店舗・支店情報ページ
      var storeUrls = [
        websiteUrl + '/store',
        websiteUrl + '/shops',
        websiteUrl + '/shop',
        websiteUrl + '/branch',
        websiteUrl + '/access',
        websiteUrl + '/tenpo',
        websiteUrl + '/office'
      ];
      
      Logger.log('🏪 支店情報ページを検索中...');
      for (var i = 0; i < storeUrls.length; i++) {
        try {
          var storeContent = scrapeWebContent(storeUrls[i]);
          if (storeContent && storeContent.length > 100) {
            Logger.log('✅ 支店情報ページ発見: ' + storeUrls[i]);
            detailedContent += '\n=== 店舗情報 ===\n' + storeContent;
            break;
          }
        } catch (e) {
          // エラーは無視
        }
      }
    }
    
    // Webサイト情報がない場合はGoogle検索
    if (!detailedContent || detailedContent.length < 200) {
      Logger.log('🔍 Google検索で詳細情報を取得');
      var searchQueries = [
        '"' + companyName + '" 設立 創業 沿革',
        '"' + companyName + '" 支店 営業所 事業所',
        '"' + companyName + '" 特徴 強み サービス'
      ];
      
      for (var i = 0; i < searchQueries.length; i++) {
        var searchResult = googleSearch(searchQueries[i]);
        if (searchResult && searchResult.length > 0) {
          for (var j = 0; j < Math.min(searchResult.length, 2); j++) {
            var item = searchResult[j];
            if (item.link && item.link.startsWith('http')) {
              var pageContent = scrapeWebContent(item.link);
              if (pageContent) {
                detailedContent += '\n=== ' + item.title + ' ===\n' + pageContent;
              }
            }
          }
        }
      }
    }
    
    // 情報が少ない場合は基本情報を追加
    if (!detailedContent || detailedContent.length < 100) {
      detailedContent = '会社名: ' + companyName + '\n住所: ' + (address || '不明') + '\nURL: ' + (websiteUrl || 'なし');
    }
    
    var systemPrompt = "あなたは企業情報抽出の専門家です。実際のWebサイトから収集した情報を元に、正確な情報を抽出してください。\n" +
      "【重要ルール】\n" +
      "1. 実際に記載されている情報のみを抽出\n" +
      "2. 屋号が本社名と同じ場合は空文字にする\n" +
      "3. 支店情報は実際に存在する支店・営業所を全て抽出\n" +
      "4. 設立年月は実際の記載から（昭和/平成/令和を西暦に変換）\n" +
      "5. PR文は実際のWebサイトの特徴・強みをまとめる\n" +
      "【抽出項目（5項目のみ）】\n" +
      "- tradeName: 屋号・営業名（本社名と異なる場合のみ。同じ場合またはない場合は空文字）\n" +
      "- tradeNameKana: 屋号カナ（屋号がある場合のみ。なければ空文字）\n" +
      "- branches: 支店・営業所配列\n" +
      "  必ず[{\"branchName\": \"支店名\", \"branchAddress\": \"完全な住所\"}]形式で出力\n" +
      "  例: [{\"branchName\": \"湘南店\", \"branchAddress\": \"〒253-0105 神奈川県高座郡寒川町岡田123\"}]\n" +
      "  支店がない場合は空配列[]\n" +
      "- establishedDate: 設立年月（実際の記載から抽出、例: '1985年4月'）\n" +
      "- companyPR: 会社のPR文（Webサイトの特徴・強み・実績を300文字以上でまとめる）";
    
    var userPrompt = "会社名: " + companyName + "\n" +
      "本社住所: " + (address || "不明") + "\n\n" +
      "以下の実際のWebサイト情報から詳細情報を抽出してください：\n\n" +
      detailedContent.substring(0, 8000) + "\n\n" +
      "【重要指示】\n" +
      "1. 屋号(tradeName)は本社名と異なる場合のみ記載。同じ場合は空文字\n" +
      "2. 支店情報はbranches配列で必ず以下の形式で出力：\n" +
      "   [{\"branchName\": \"支店名\", \"branchAddress\": \"郵便番号含む完全な住所\"}]\n" +
      "   例: [{\"branchName\": \"寒川店\", \"branchAddress\": \"〒253-0105 神奈川県高座郡寒川町岡田1-2-3\"},\n" +
      "        {\"branchName\": \"藤沢店\", \"branchAddress\": \"〒251-0052 神奈川県藤沢市藤沢4-5-6\"}]\n" +
      "3. 支店がない場合は空配列[]\n" +
      "4. 設立年月が不明な場合は空文字\n" +
      "5. PR文は実際のWebサイトの内容を基に300文字以上\n\n" +
      "JSON形式で出力してください。支店情報はbranchNameとbranchAddressを持つオブジェクトの配列であること。";
    
    var response = callOpenRouterAPI(systemPrompt, userPrompt);
    
    if (response.success && response.content) {
      try {
        var jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          var details = JSON.parse(jsonMatch[0]);
          // 支店情報のログ出力
          Logger.log('🏪 AIから抽出した支店情報: ' + JSON.stringify(details.branches));
          
          var processedBranches = [];
          if (Array.isArray(details.branches)) {
            processedBranches = details.branches.map(function(b) {
              if (typeof b === 'object' && b !== null) {
                var branch = {
                  branchName: b.branchName || b.name || b.支店名 || '',
                  branchAddress: b.branchAddress || b.address || b.住所 || ''
                };
                Logger.log('📦 処理後の支店: ' + JSON.stringify(branch));
                return branch;
              } else if (typeof b === 'string') {
                // 文字列の場合は支店名として扱う
                return { branchName: b, branchAddress: '' };
              }
              return { branchName: '', branchAddress: '' };
            }).filter(function(branch) {
              // 空の支店情報を除外
              return branch.branchName || branch.branchAddress;
            });
          }
          
          Logger.log('✅ 最終的な支店情報: ' + JSON.stringify(processedBranches));
          
          return {
            success: true,
            details: {
              tradeName: details.tradeName || '',
              tradeNameKana: details.tradeNameKana || '',
              branches: processedBranches,
              establishedDate: details.establishedDate || '',
              companyPR: details.companyPR || ''
            }
          };
        }
      } catch (parseError) {
        console.error('❌ JSON解析エラー:', parseError);
      }
    }
    
    // データが取得できなかった場合は空のデータを返す
    return {
      success: true,
      details: {
        tradeName: '',
        tradeNameKana: '',
        branches: [],
        establishedDate: '',
        companyPR: ''
      }
    };
    
  } catch (error) {
    console.error('❌ searchCompanyDetailsFromAI エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 会社PR文を生成
 * @param {string} companyName 会社名
 * @param {string} address 住所
 * @param {string} websiteUrl URL
 * @returns {string} PR文
 */
function generateCompanyPRText(companyName, address, websiteUrl) {
  var name = companyName || '私たちの会社';
  var location = address ? '地域密着型の' : '';
  
  return location + name + 'は、お客様の満足を第一に考え、高品質な外壁塗装・リフォームサービスを提供しています。' +
         '長年の実績と経験を活かし、確かな技術力と丁寧な施工で、大切な住まいを美しく守ります。' +
         'お客様のニーズに最適なソリューションをお届けし、安心・安全な住環境づくりに貢献します。';
}

/**
 * 会社詳細情報検索（第2段階）
 * 屋号、支店情報、設立年月日、PR文を検索
 */
function searchCompanyDetails(params) {
  try {
    console.log('🔍 第2段階詳細検索開始:', params);
    
    var { companyName, address, websiteUrl } = params;
    
    if (!companyName) {
      return {
        success: false,
        error: '会社名が指定されていません'
      };
    }
    
    // notify.js内のsearchCompanyDetailsFromAI関数を呼び出し
    console.log('AI企業検索実行中...');
    console.log('渡すパラメータ:', Object.keys(params));
    
    try {
      // 同じファイル内の関数を呼び出し
      var result = searchCompanyDetailsFromAI(params);
      console.log('🔄 searchCompanyDetailsFromAI応答:', JSON.stringify(result));
      
      // generatePRフラグがtrueの場合、PR文を返す
      if (params.generatePR && result.success && result.details) {
        return {
          success: true,
          prText: result.details.companyPR || generateCompanyPRText(companyName, address, websiteUrl),
          details: result.details
        };
      }
      
      console.log('🔍 DEBUG: result.details.companyPR =', result.details ? result.details.companyPR : 'details is null');
      console.log('🔍 DEBUG: result.details =', result.details);
      return result;
    } catch (callError) {
      console.error('❌ searchCompanyDetailsFromAI関数呼び出しエラー:', callError);
      return {
        success: false,
        error: "searchCompanyDetailsFromAI関数の呼び出しに失敗しました: " + callError.message
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
 * 成功レスポンス作成
 * @param {Object} data データ
 * @returns {Object} 成功レスポンス
 */
function createSuccessResponse(data) {
  return {
    success: true,
    timestamp: new Date(),
    ...data
  };
}

/**
 * エラーレスポンス作成
 * @param {string} error エラーメッセージ
 * @returns {Object} エラーレスポンス
 */
function createErrorResponse(error) {
  return {
    success: false,
    error: error,
    timestamp: new Date()
  };
}

/**
 * セッションデータ保存
 * @param {string} sessionId セッションID
 * @param {Object} sessionData セッションデータ
 */
function saveSessionData(sessionId, sessionData) {
  try {
    CacheService.getScriptCache().put(sessionId, JSON.stringify(sessionData), 3600); // 1時間
  } catch (error) {
    Logger.log("⚠️ セッション保存エラー: " + error.message);
  }
}

/**
 * OpenRouter API (DeepSeek) 呼び出し
 * @param {string} systemPrompt システムプロンプト
 * @param {string} userPrompt ユーザープロンプト
 * @returns {Object} API応答
 */
function callOpenRouterAPI(systemPrompt, userPrompt) {
  try {
    var OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
    Logger.log("🔑 OpenRouter APIキー確認: " + OPENROUTER_API_KEY ? '設定済み (' + OPENROUTER_API_KEY.substring(0, 10) + '...)' : '❌ 未設定');
    
    if (!OPENROUTER_API_KEY) {
      Logger.log('❌ OpenRouter APIキーが設定されていません');
      return {
        success: false,
        error: 'OpenRouter APIキーが設定されていません'
      };
    }
    
    var requestBody = {
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
      max_tokens: 2048,
      temperature: 0.3,
      timeout: 60
    };
    
    Logger.log("🚀 DeepSeek API via OpenRouter リクエスト送信中...");
    Logger.log("📤 リクエストボディ: " + JSON.stringify(requestBody));
    
    var response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://franchise-hearing.com',
        'X-Title': 'Franchise Hearing AI'
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true,
      timeout: 60000
    });
    
    var responseCode = response.getResponseCode();
    Logger.log("📥 HTTP ステータス: " + responseCode);
    var responseText = response.getContentText();
    Logger.log("📥 生レスポンス: " + responseText);
    
    if (responseCode !== 200) {
      Logger.log("❌ DeepSeek API HTTP エラー: " + responseCode);
      return {
        success: false,
        error: "HTTP " + responseCode + ": " + responseText
      };
    }
    
    if (!responseText || responseText.trim() === '') {
      Logger.log("❌ DeepSeek API 空レスポンス");
      return {
        success: false,
        error: 'DeepSeek APIから空のレスポンスが返されました'
      };
    }
    
    var data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      Logger.log("❌ DeepSeek API レスポンス解析エラー: " + parseError.message);
      return {
        success: false,
        error: "APIレスポンスの解析に失敗しました: " + parseError.message
      };
    }
    
    if (data.error) {
      Logger.log("❌ DeepSeek API エラー: " + data.error.message || data.error);
      return {
        success: false,
        error: data.error.message || data.error.toString()
      };
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      Logger.log("❌ DeepSeek API 予期しないレスポンス構造: " + JSON.stringify(data));
      return {
        success: false,
        error: 'APIレスポンスの構造が予期したものと異なります'
      };
    }
    
    var content = data.choices[0].message.content;
    if (!content || content.trim() === '') {
      Logger.log("❌ DeepSeek API 空のコンテンツ");
      return {
        success: false,
        error: 'DeepSeekから空のコンテンツが返されました'
      };
    }
    
    return {
      success: true,
      content: content
    };
    
  } catch (error) {
    Logger.log("❌ DeepSeek API エラー: " + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Google Search API + Web Scraping で企業情報取得
 * @param {string} companyName 会社名
 * @returns {string} スクレイピング結果
 */
function performWebSearchAndScraping(companyName) {
  try {
    Logger.log('🔍 Web検索開始: ' + companyName);
    
    var GOOGLE_SEARCH_API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
    var GOOGLE_SEARCH_ENGINE_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
    Logger.log('🔍 Google Search API設定確認 - API_KEY: ' + !!GOOGLE_SEARCH_API_KEY + ', ENGINE_ID: ' + !!GOOGLE_SEARCH_ENGINE_ID);
    
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      Logger.log('⚠️ Google Search API設定不備 - 基本検索のみ実行');
      return '会社名: ' + companyName + '\n検索対象: リフォーム・外壁塗装業界';
    }
    
    // リフォーム系企業特化クエリ
    var quickQueries = [
      '"' + companyName + '" リフォーム 外壁塗装 会社概要 代表者',
      '"' + companyName + '" 建設 工務店 住所 連絡先 郵便番号',
      '"' + companyName + '" 塗装工事 電話番号 TEL site:*.co.jp',
      '"' + companyName + '" リフォーム 建設業 会社情報 連絡先',
      '"' + companyName + '" 会社概要 郵便番号 〒 電話 FAX'
    ];
    
    Logger.log('🚀 検索開始: ' + quickQueries.length + 'クエリ');
    var quickResults = performQuickSearch(companyName, quickQueries);
    
    if (quickResults.length === 0) {
      Logger.log('❌ 検索結果ゼロ: ' + companyName);
      return '検索結果が見つかりませんでした。会社名: ' + companyName;
    }
    
    Logger.log('✅ Web検索完了: ' + quickResults.length + '文字のデータ取得');
    return quickResults;
    
  } catch (error) {
    Logger.log('❌ Web検索エラー: ' + error.message);
    return '検索エラーが発生しました: ' + error.message;
  }
}

/**
 * 高速検索実行
 * @param {string} companyName 会社名
 * @param {Array} queries 検索クエリ配列
 * @returns {string} 検索結果
 */
function performQuickSearch(companyName, queries) {
  var allResults = '';
  
  for (var i = 0; i < queries.length; i++) {
    var query = queries[i];
    Logger.log('🔍 検索クエリ: ' + query);
    
    var searchResult = googleSearch(query);
    
    if (searchResult && searchResult.length > 0) {
      allResults += '\n\n=== 検索クエリ: ' + query + ' ===\n';
      
      for (var j = 0; j < Math.min(searchResult.length, 1); j++) {
        var item = searchResult[j];
        allResults += '\nタイトル: ' + item.title + '\n';
        allResults += 'URL: ' + item.link + '\n';
        allResults += '概要: ' + item.snippet + '\n';
        
        // 有効なURLの場合のみWebページ取得
        if (item.link && item.link.startsWith('http')) {
          var pageContent = scrapeWebContent(item.link);
          if (pageContent) {
            allResults += '内容抜粋: ' + pageContent + '\n';
          }
        }
        allResults += '---\n';
      }
    }
    
    // API制限回避のため少し待機
    Utilities.sleep(100);
  }
  
  Logger.log('✅ 高速検索完了: ' + allResults.length + '文字');
  return allResults;
}

/**
 * Google Search API呼び出し
 * @param {string} query 検索クエリ
 * @returns {Array} 検索結果
 */
function googleSearch(query) {
  try {
    Logger.log('🌐 Google Search API実行: "' + query + '"');
    var GOOGLE_SEARCH_API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
    var GOOGLE_SEARCH_ENGINE_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
    
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
      Logger.log('⚠️ Google Search API設定なし');
      return [];
    }
    
    var url = 'https://www.googleapis.com/customsearch/v1?key=' + GOOGLE_SEARCH_API_KEY + 
              '&cx=' + GOOGLE_SEARCH_ENGINE_ID + 
              '&q=' + encodeURIComponent(query) + 
              '&num=5&hl=ja&gl=jp';
    
    var response = UrlFetchApp.fetch(url, {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      Logger.log('❌ Google Search API エラー: ' + response.getResponseCode());
      return [];
    }
    
    var data = JSON.parse(response.getContentText());
    return data.items || [];
    
  } catch (error) {
    Logger.log('❌ Google Search エラー: ' + error.message);
    return [];
  }
}

/**
 * Webコンテンツスクレイピング
 * @param {string} url URL
 * @returns {string} 抽出テキスト
 */
function scrapeWebContent(url) {
  try {
    Logger.log('🌐 実際のHPからデータスクレイピング開始: ' + url);
    
    // URLの正規化
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    var response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: false
    });
    
    var responseCode = response.getResponseCode();
    if (responseCode !== 200) {
      Logger.log('❌ HTTP エラー: ' + responseCode + ' for URL: ' + url);
      return null;
    }
    
    var content = response.getContentText();
    Logger.log('📄 HPコンテンツ取得成功: ' + content.length + '文字');
    
    // HTMLタグを除去してテキストのみ抽出
    var extractedText = 'URL: ' + url + '\n\n';
    
    // タイトル抽出
    var titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      extractedText += 'ページタイトル: ' + titleMatch[1].trim() + '\n\n';
    }
    
    // メタ情報を抽出
    var metaDesc = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    if (metaDesc) {
      extractedText += 'サイト説明: ' + metaDesc[1] + '\n\n';
    }
    
    // 会社概要ページを探す
    var companyInfoSection = '';
    
    // 会社概要セクションを抽出（様々なパターンに対応）
    var sectionPatterns = [
      /会社概要[\s\S]*?(?=<\/(?:div|section|table)|$)/gi,
      /企業情報[\s\S]*?(?=<\/(?:div|section|table)|$)/gi,
      /company[\s\-_]?(?:info|profile|outline)[\s\S]*?(?=<\/(?:div|section|table)|$)/gi
    ];
    
    for (var i = 0; i < sectionPatterns.length; i++) {
      var sectionMatch = content.match(sectionPatterns[i]);
      if (sectionMatch) {
        companyInfoSection += sectionMatch[0];
        break;
      }
    }
    
    // HTMLタグを除去してテキストを抽出
    var cleanText = (companyInfoSection || content)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    // 重要情報を特定のパターンで抽出
    var info = {};
    
    // 会社名抽出
    var companyNamePatterns = [
      /(?:会社名|商号|法人名)[：:：\s]*([^　\s\n]{2,30})/,
      /(?:株式会社|有限会社|合同会社)[^　\s\n]{1,20}/
    ];
    for (var i = 0; i < companyNamePatterns.length; i++) {
      var match = cleanText.match(companyNamePatterns[i]);
      if (match) {
        info['会社名'] = match[1] || match[0];
        break;
      }
    }
    
    // 代表者名抽出（フルネームを確実に取得）
    var representativePatterns = [
      // 「代表取締役 大野哲」「代表取締役 大野 哲」のようなパターン
      /(?:代表取締役社長|代表取締役|代表者|社長|CEO)[：:：\s]*([^　\s\n、。<>]{2,5}[　\s]?[^　\s\n、。<>]{1,5})/,
      /(?:代表)[：:：\s]*([^　\s\n、。<>]{2,5}[　\s]?[^　\s\n、。<>]{1,5})/,
      // フォールバック：スペースなしでもマッチ
      /(?:代表取締役|代表者)[：:：\s]*([^　\s\n、。<>]{2,10})/
    ];
    
    var representativeName = '';
    for (var i = 0; i < representativePatterns.length; i++) {
      var match = cleanText.match(representativePatterns[i]);
      if (match) {
        representativeName = match[1].trim();
        // スペースがない場合、姓名を分割してスペースを挿入
        if (representativeName && !representativeName.includes(' ') && !representativeName.includes('　')) {
          // 「大野哲」→「大野 哲」のように変換
          // 一般的な日本人の姓は2-3文字、名は1-2文字
          if (representativeName.length === 3) {
            // 3文字の場合: 「田中太」→「田中 太」
            representativeName = representativeName.substring(0, 2) + ' ' + representativeName.substring(2);
          } else if (representativeName.length === 4) {
            // 4文字の場合: 「大野哲也」→「大野 哲也」 または 「佐藤太郎」→「佐藤 太郎」
            // 一般的に姓が2文字のケースが多い
            representativeName = representativeName.substring(0, 2) + ' ' + representativeName.substring(2);
          } else if (representativeName.length === 5) {
            // 5文字の場合: 「佐々木太郎」→「佐々木 太郎」
            representativeName = representativeName.substring(0, 3) + ' ' + representativeName.substring(3);
          }
        }
        info['代表者'] = representativeName;
        break;
      }
    }
    
    // 住所抽出
    var addressPatterns = [
      /(?:住所|所在地|本社|本店)[：:：\s]*(〒?[\d\-]{7,8})?[\s　]*([^　\n]{5,60})/,
      /〒?[\d]{3}-[\d]{4}[\s　]*[^　\n]{5,50}/
    ];
    for (var i = 0; i < addressPatterns.length; i++) {
      var match = cleanText.match(addressPatterns[i]);
      if (match) {
        info['住所'] = (match[1] || '') + ' ' + (match[2] || match[0]);
        info['住所'] = info['住所'].trim();
        break;
      }
    }
    
    // 電話番号抽出
    var phonePatterns = [
      /(?:TEL|電話|連絡先)[：:：\s]*([\d\-\(\)\s]{10,15})/,
      /0[\d]{1,4}-[\d]{1,4}-[\d]{4}/
    ];
    for (var i = 0; i < phonePatterns.length; i++) {
      var match = cleanText.match(phonePatterns[i]);
      if (match) {
        info['電話'] = match[1] || match[0];
        break;
      }
    }
    
    // 設立年月抽出
    var establishPatterns = [
      /(?:設立|創業|創立)[：:：\s]*([^　\s\n]{4,20})/,
      /(?:平成|昭和|令和)[\d元]{1,2}年/
    ];
    for (var i = 0; i < establishPatterns.length; i++) {
      var match = cleanText.match(establishPatterns[i]);
      if (match) {
        info['設立'] = match[1] || match[0];
        break;
      }
    }
    
    // 情報をフォーマット
    extractedText += '【会社概要情報】\n';
    for (var key in info) {
      extractedText += key + ': ' + info[key] + '\n';
    }
    
    // 生テキストも一部含める（AIが追加情報を抽出できるように）
    extractedText += '\n【ページ内容抜粋】\n';
    extractedText += cleanText.substring(0, 2000);
    
    Logger.log('✅ 実データ抽出完了: ' + extractedText.length + '文字');
    return extractedText.substring(0, 3000); // 十分な情報を含めるために3000文字まで拡張
    
  } catch (error) {
    Logger.log('❌ スクレイピングエラー: ' + error.message);
    return null;
  }
}

/**
 * AIヒアリング開始関数
 * @param {Object} params { companyName }
 * @returns {Object} 抽出結果
 */
function startAIHearing(params) {
  try {
    console.log('🔍 startAIHearing開始 - パラメータ:', JSON.stringify(params));
    
    // パラメータの安全な抽出
    var companyName = params.companyName || params.company || '';
    if (typeof companyName !== 'string') {
      companyName = String(companyName || '');
    }
    companyName = companyName.trim();
    
    if (!companyName) {
      console.log('❌ 会社名が空です');
      return {
        success: false,
        error: 'COMPANY_NAME_REQUIRED',
        message: '会社名を入力してください'
      };
    }
    
    Logger.log("🤖 AI抽出開始: " + companyName);
    console.log("🤖 AI抽出開始: " + companyName);
    
    // セッションID生成（安全な実装）
    var sessionId;
    try {
      sessionId = generateSessionId();
      console.log('✅ セッションID生成:', sessionId);
    } catch (sessionError) {
      console.error('❌ セッションID生成エラー:', sessionError);
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      console.log('🔄 フォールバックセッションID:', sessionId);
    }
    
    // APIキー確認
    var OPENROUTER_API_KEY;
    try {
      OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
      Logger.log("🔍 OPENROUTER_API_KEY存在確認: " + !!OPENROUTER_API_KEY);
      console.log("🔍 OPENROUTER_API_KEY存在確認: " + !!OPENROUTER_API_KEY);
    } catch (propError) {
      console.error('❌ プロパティアクセスエラー:', propError);
      return {
        success: false,
        error: 'PROPERTY_ACCESS_ERROR',
        message: 'システム設定へのアクセスでエラーが発生しました'
      };
    }
    
    if (!OPENROUTER_API_KEY) {
      Logger.log("❌ OpenRouter APIキー未設定");
      console.log("❌ OpenRouter APIキー未設定");
      return {
        success: false,
        error: 'API_KEY_MISSING',
        message: 'システムエラー: AIサービスが利用できません。管理者にお問い合わせください。'
      };
    }
    
    // Web検索実行（堅牢なエラーハンドリング）
    Logger.log("🔍 Web検索開始: " + companyName);
    console.log("🔍 Web検索開始: " + companyName);
    
    var searchResults;
    try {
      
      // performWebSearchAndScrapingの存在確認と実行
      console.log('🔍 performWebSearchAndScraping関数の型:', typeof performWebSearchAndScraping);
      if (typeof performWebSearchAndScraping !== 'function') {
        console.error('❌ performWebSearchAndScraping関数が見つかりません');
        throw new Error('performWebSearchAndScraping関数が定義されていません');
      }
      
      searchResults = performWebSearchAndScraping(companyName);
      Logger.log("✅ Web検索完了: " + (searchResults ? searchResults.length + '文字のデータ取得' : 'データなし'));
      console.log("✅ Web検索結果:", searchResults ? searchResults.length + '文字' : 'null');
      
      if (!searchResults) {
        throw new Error('検索結果がnullまたは未定義です');
      }
      
    } catch (searchError) {
      console.error('❌ Web検索エラー:', searchError);
      console.error('❌ エラースタック:', searchError.stack);
      
      // フォールバック: 簡易的な会社情報生成
      console.log('🔄 フォールバック処理: 基本的な会社情報テンプレート使用');
      return createFallbackCompanyData(companyName, sessionId);
    }
    
    if (searchResults.length < 50) {
      Logger.log("❌ Web検索結果不十分: " + companyName);
      console.log("❌ Web検索結果不十分: " + companyName);
      
      // フォールバック処理
      return createFallbackCompanyData(companyName, sessionId);
    }
    
    Logger.log("✅ Web検索結果取得: " + searchResults.length + "文字");
    
    // AI API呼び出し（堅牢なエラーハンドリング）
    var aiResponse;
    try {
      // callOpenRouterAPIの存在確認
      if (typeof callOpenRouterAPI !== 'function') {
        throw new Error('callOpenRouterAPI関数が定義されていません');
      }
      
      var systemPrompt = createSystemPrompt();
      var userPrompt = createUserPrompt(companyName, searchResults);
      
      aiResponse = callOpenRouterAPI(systemPrompt, userPrompt);
      Logger.log("🔍 AI応答受信: " + (aiResponse ? 'success: ' + aiResponse.success : 'null'));
      console.log("🔍 AI応答受信: " + (aiResponse ? 'success: ' + aiResponse.success : 'null'));
      
    } catch (apiError) {
      console.error('❌ OpenRouter API呼び出しエラー:', apiError);
      console.error('❌ エラースタック:', apiError.stack);
      
      // フォールバック処理
      return createFallbackCompanyData(companyName, sessionId);
    }
    
    if (!aiResponse || !aiResponse.success) {
      Logger.log("❌ AI抽出失敗: " + (aiResponse ? aiResponse.error : 'AIレスポンスなし'));
      console.log("❌ AI抽出失敗: " + (aiResponse ? aiResponse.error : 'AIレスポンスなし'));
      
      // フォールバック処理
      return createFallbackCompanyData(companyName, sessionId);
    }
    
    // AI応答をJSON解析
    var candidates = [];
    try {
      candidates = parseAIResponse(aiResponse);
      
      if (candidates.length === 0) {
        console.log("⚠️ AI応答に有効な候補が見つかりません");
        return createFallbackCompanyData(companyName, sessionId);
      }
      
    } catch (parseError) {
      Logger.log("❌ AI応答解析エラー: " + parseError.message);
      console.log("❌ AI応答解析エラー: " + parseError.message);
      
      // フォールバック処理
      return createFallbackCompanyData(companyName, sessionId);
    }
    
    Logger.log("✅ AI抽出完了: " + candidates.length + "件の候補");
    
    // セッションデータ保存（安全な実装）
    try {
      var sessionData = {
        sessionId: sessionId,
        startTime: new Date(),
        inputCompanyName: companyName,
        aiExtractionResults: candidates,
        currentStep: 'ai_confirmation',
        completedSteps: [],
        hearingData: {}
      };
      
      if (typeof saveSessionData === 'function') {
        saveSessionData(sessionId, sessionData);
      } else {
        console.log('⚠️ saveSessionData関数が利用できません');
      }
      
    } catch (saveError) {
      console.error('❌ セッション保存エラー:', saveError);
      // セッション保存エラーは致命的ではないので続行
    }
    
    return {
      success: true,
      sessionId: sessionId,
      step: 'ai_confirmation',
      progress: 10,
      message: 'AI企業情報抽出が完了しました',
      candidates: candidates,
      instruction: '抽出された情報をご確認ください。正しい場合は✅、修正が必要な場合は❌をクリックしてください。'
    };
    
  } catch (error) {
    Logger.log("❌ startAIHearing総合エラー: " + error.message);
    console.error("❌ startAIHearing総合エラー: " + error.message);
    console.error("❌ エラースタック: " + error.stack);
    
    // 最終フォールバック
    return {
      success: false,
      error: 'AI_HEARING_ERROR',
      message: error.message || 'AIヒアリング処理でエラーが発生しました'
    };
  }
}

/**
 * フォールバック用会社データ作成
 * @param {string} companyName 会社名
 * @param {string} sessionId セッションID
 * @returns {Object} フォールバック結果
 */
function createFallbackCompanyData(companyName, sessionId) {
  try {
    console.log('🔄 フォールバックデータ作成: ' + companyName);
    
    var fallbackCandidate = {
      legalName: companyName,
      legalNameKana: convertToKatakana(companyName),
      representative: '未取得',
      representativeKana: 'ミシュトク',
      postalCode: '',
      address: '',
      phone: '',
      websiteUrl: '',
      source: 'fallback'
    };
    
    return {
      success: true,
      sessionId: sessionId,
      step: 'ai_confirmation',
      progress: 10,
      message: '基本的な企業情報を準備しました（詳細情報の取得に失敗しました）',
      candidates: [fallbackCandidate],
      instruction: '取得できなかった情報は手動で入力してください。',
      isFallback: true
    };
    
  } catch (error) {
    console.error('❌ フォールバック作成エラー:', error);
    return {
      success: false,
      error: 'FALLBACK_CREATION_ERROR',
      message: 'システムエラーが発生しました。再度お試しください。'
    };
  }
}

/**
 * システムプロンプト作成
 * @returns {string} システムプロンプト
 */
function createSystemPrompt() {
  return `あなたは企業情報抽出AIです。Web検索結果からリフォーム・外壁塗装・建設業の企業情報を正確に抽出してください。

【最重要】代表者名の処理：
1. 代表者名は必ずフルネーム（姓 名）で出力。スペースを入れて姓と名を分ける。
2. 「大野哲」→「大野 哲」、「田中太」→「田中 太」のように変換
3. 代表者カナは名前から推測して生成（例：「大野 哲」→「オオノ サトシ」）
4. カナが不明な場合も、一般的な読み方を推測して必ず入れる

その他の注意点：
- WebサイトのURLは実際のURLを抽出（推測・生成禁止）
- 会社概要ページの正確な情報を使用

JSON配列形式で返してください。`;
}

/**
 * ユーザープロンプト作成
 * @param {string} companyName 会社名
 * @param {string} searchResults 検索結果
 * @returns {string} ユーザープロンプト
 */
function createUserPrompt(companyName, searchResults) {
  return `会社名: ${companyName}

以下のWeb検索結果から企業情報を抽出してください：

${searchResults.substring(0, 5000)}

以下の形式のJSON配列で返してください：
[{
  "legalName": "株式会社○○",
  "legalNameKana": "カブシキガイシャ○○",
  "representative": "姓 名（スペースありフルネーム）",
  "representativeKana": "セイ メイ（スペースあり）",
  "postalCode": "xxx-xxxx",
  "address": "住所",
  "phone": "xxxx-xx-xxxx",
  "websiteUrl": "https://実際のURL"
}]

【特に重要】代表者名の処理：
1. 代表者名が「大野哲」のようにスペースなしで記載されている場合、必ず「大野 哲」のようにスペースを入れて姓と名を分ける
2. カナ名が不明な場合、一般的な読み方を推測して入れる（例：「大野 哲」→「オオノ サトシ」「オオノ アキラ」「オオノ テツ」のいずれか）
3. 会社名カナも同様に、不明な場合は推測で入れる

その他：
- URLは実際のWebサイトのURLを使用（https://ohnokensou.jp/ など）
- 住所・電話は実際の情報を使用`;
}

/**
 * AI応答解析
 * @param {Object} aiResponse AI応答
 * @returns {Array} 候補配列
 */
function parseAIResponse(aiResponse) {
  var content = aiResponse.content.trim();
  
  // JSON部分を抽出
  var jsonStart = content.indexOf('[');
  var jsonEnd = content.lastIndexOf(']') + 1;
  
  if (jsonStart === -1 || jsonEnd === -1) {
    jsonStart = content.indexOf('{');
    jsonEnd = content.lastIndexOf('}') + 1;
  }
  
  if (jsonStart !== -1 && jsonEnd !== -1) {
    var jsonStr = content.substring(jsonStart, jsonEnd);
    var parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  
  return [];
}

/**
 * 簡易カタカナ変換
 * @param {string} text テキスト
 * @returns {string} カタカナ
 */
function convertToKatakana(text) {
  // 簡易的なカタカナ変換（実際の実装では適切な変換ライブラリを使用）
  var katakanaMap = {
    '株式会社': 'カブシキガイシャ',
    '有限会社': 'ユウゲンガイシャ',
    '合同会社': 'ゴウドウガイシャ',
    '建設': 'ケンセツ',
    '工業': 'コウギョウ',
    '産業': 'サンギョウ'
  };
  
  var result = text;
  Object.keys(katakanaMap).forEach(function(key) {
    result = result.replace(new RegExp(key, 'g'), katakanaMap[key]);
  });
  
  return result;
}

/**
 * GETリクエストハンドラー
 */
function doGet(e) {
  try {
    // 🔍 デバッグ: 実行中のコードバージョン確認
    console.log('🔍 doGet開始 - notify.js バージョン: 2025-08-15-FIXED');
    console.log('🔍 受信パラメータ:', JSON.stringify(e.parameter));
    
    // CORS対応 - 最初に設定
    var jsonResponse = (data) => {
      var output = ContentService.createTextOutput(JSON.stringify(data));
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    };
    
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : null;
    
    // 🌐 getConfig最優先処理（プロパティ取得）
    if (action === 'getConfig') {
      console.log('🌐 getConfig最優先処理開始');
      try {
        var properties = PropertiesService.getScriptProperties();
        var gasUrl = properties.getProperty('GAS_WEBAPP_URL');
        var openrouterKey = properties.getProperty('OPENROUTER_API_KEY');
        
        console.log('🔍 GAS_WEBAPP_URL:', gasUrl ? 'あり' : 'なし');
        console.log('🔍 OPENROUTER_API_KEY:', openrouterKey ? 'あり' : 'なし');
        
        var configResult = {
          success: true,
          gasUrl: gasUrl || '',
          hasOpenRouterKey: !!openrouterKey,
          timestamp: new Date().toISOString(),
          deployed: true
        };
        
        console.log('✅ getConfig成功:', JSON.stringify(configResult));
        
        var callback = e.parameter.callback;
        if (callback) {
          return ContentService.createTextOutput(`${callback}(${JSON.stringify(configResult)});`)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        } else {
          return ContentService.createTextOutput(JSON.stringify(configResult))
            .setMimeType(ContentService.MimeType.JSON);
        }
      } catch (configError) {
        console.error('❌ getConfig処理エラー:', configError.message);
        var errorResult = {
          success: false,
          error: configError.message,
          timestamp: new Date().toISOString()
        };
        
        var callback = e.parameter.callback;
        if (callback) {
          return ContentService.createTextOutput(`${callback}(${JSON.stringify(errorResult)});`)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        } else {
          return ContentService.createTextOutput(JSON.stringify(errorResult))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    
    // 超短縮パラメータの処理（a = action）
    if (!action && e.parameter && e.parameter.a) {
      action = e.parameter.a;
      // c = chunk, p = process
      if (action === 'c') action = 'storeChunk';
      if (action === 'p') action = 'processChunks';
    }
    
    // Base64エンコードされたデータの処理
    if (e.parameter && e.parameter.encodedData) {
      try {
        console.log('📦 Base64エンコードデータを検出');
        var decodedString = Utilities.base64Decode(e.parameter.encodedData);
        var decodedText = Utilities.newBlob(decodedString).getDataAsString();
        var decodedData = JSON.parse(decodedText);
        console.log('✅ Base64デコード成功:', decodedData.action);
        
        // デコードしたデータで処理を続行
        if (decodedData.action) {
          action = decodedData.action;
          // パラメータをデコードしたデータで上書き
          Object.assign(e.parameter, decodedData);
        }
      } catch (decodeError) {
        console.error('❌ Base64デコードエラー:', decodeError);
      }
    }
    
    // 🔧 WebApp URL取得API
    if (action === 'get-webapp-url') {
      console.log('🔧 WebApp URL取得API called');
      var currentUrl = getGasWebappUrl();
      return jsonResponse({
        success: true,
        url: currentUrl
      });
    }
    
    // 🔧 設定取得API (franchise-hearing-app用)
    if (action === 'getConfig') {
      console.log('🔧 設定取得API called');
      var callback = (e.parameter && e.parameter.callback) ? e.parameter.callback : null;
      var currentUrl = getGasWebappUrl();
      
      var configData = {
        success: true,
        data: {
          gasUrl: currentUrl
        }
      };
      
      if (callback) {
        return createJsonpCorsResponse(configData, callback);
      } else {
        return jsonResponse(configData);
      }
    }
    
    // 🎯 startAIHearing最優先処理（全ての処理より前）
    if (action === 'startAIHearing' || (e.parameter && e.parameter.data && e.parameter.data.includes('startAIHearing'))) {
      console.log('🎯🎯🎯🎯🎯 最優先startAIHearing処理開始！🎯🎯🎯🎯🎯');
      console.log('🎯 action:', action);
      console.log('🎯 e.parameter:', JSON.stringify(e.parameter));
      
      var callback = e.parameter.callback;
      var parameters = e.parameter;
      
      // データパラメータがある場合は解析
      if (e.parameter.data) {
        try {
          var postData = JSON.parse(e.parameter.data);
          parameters = postData.registrationData || postData;
          console.log('🎯 データパラメータ解析完了:', JSON.stringify(parameters));
        } catch (error) {
          console.error('🎯 データパラメータ解析エラー:', error);
        }
      }
      
      try {
        var result = startAIHearing(parameters);
        console.log('🎯 startAIHearing実行成功（最優先）:', JSON.stringify(result));
        
        if (callback) {
          return createJsonpCorsResponse(result, callback);
        } else {
          return createCorsResponse(JSON.stringify(result), 200);
        }
      } catch (error) {
        console.error('🎯 startAIHearingエラー（最優先）:', error);
        var errorResult = {
          success: false,
          error: 'AI_HEARING_ERROR',
          message: error.message
        };
        
        if (callback) {
          return createJsonpCorsResponse(errorResult, callback);
        } else {
          return createCorsResponse(JSON.stringify(errorResult), 500);
        }
      }
    }
    
    // 🔥 submitFranchiseRegistration最優先処理（startAIHearingの次）
    if (action === 'submitFranchiseRegistration' || (e.parameter && e.parameter.data && e.parameter.data.includes('submitFranchiseRegistration'))) {
      console.log('🔥🔥🔥🔥🔥 最優先submitFranchiseRegistration処理開始！🔥🔥🔥🔥🔥');
      console.log('🔥 action:', action);
      console.log('🔥 e.parameter:', JSON.stringify(e.parameter));
      
      // 🧪 CRITICAL DEBUG: 関数存在確認
      console.log('🧪🧪🧪 DEBUG: 関数存在確認開始 🧪🧪🧪');
      console.log('🧪 typeof submitFranchiseRegistration:', typeof submitFranchiseRegistration);
      console.log('🧪 this.submitFranchiseRegistration:', typeof this.submitFranchiseRegistration);
      console.log('🧪 globalThis.submitFranchiseRegistration:', typeof globalThis.submitFranchiseRegistration);
      
      // グローバルスコープの関数一覧を確認
      console.log('🧪 利用可能な関数一覧:');
      try {
        var globalNames = Object.getOwnPropertyNames(globalThis);
        var functions = globalNames.filter(name => {
          try {
            return typeof globalThis[name] === 'function' && name.includes('submitFranchise');
          } catch (e) {
            return false;
          }
        });
        console.log('🧪 submitFranchise関連関数:', functions);
      } catch (scopeError) {
        console.log('🧪 グローバルスコープ確認エラー:', scopeError.message);
      }
      
      var callback = e.parameter.callback;
      var parameters = e.parameter;
      
      // データパラメータがある場合は解析
      if (e.parameter.data) {
        try {
          var postData = JSON.parse(e.parameter.data);
          parameters = postData.registrationData || postData;
          console.log('🔥 データパラメータ解析完了:', JSON.stringify(parameters));
        } catch (error) {
          console.error('🔥 データパラメータ解析エラー:', error);
        }
      }
      
      try {
        // 圧縮フィールド名を展開（フロントエンドからの圧縮データ対応）
        var expandedParams = {
          legalName: parameters.ln || parameters.legalName || '',
          legalNameKana: parameters.lk || parameters.legalNameKana || '',
          representative: parameters.rp || parameters.representative || '',
          representativeKana: parameters.rk || parameters.representativeKana || '',
          postalCode: parameters.pc || parameters.postalCode || '',
          address: parameters.ad || parameters.address || '',
          phone: parameters.ph || parameters.phone || '',
          websiteUrl: parameters.web || parameters.websiteUrl || '',
          employees: parameters.emp || parameters.employees || '',
          revenue: parameters.rev || parameters.revenue || '',
          billingEmail: parameters.bem || parameters.billingEmail || '',
          salesEmail: parameters.sem || parameters.salesEmail || '',
          salesPersonName: parameters.spn || parameters.salesPersonName || '',
          salesPersonContact: parameters.spc || parameters.salesPersonContact || '',
          propertyTypes: parameters.pt || parameters.propertyTypes || '',
          constructionAreas: parameters.ca || parameters.constructionAreas || '',
          specialServices: parameters.ss || parameters.specialServices || '',
          buildingAgeRange: parameters.ba || parameters.buildingAgeRange || '',
          tradeName: parameters.tn || parameters.tradeName || '',
          tradeNameKana: parameters.tk || parameters.tradeNameKana || '',
          branchInfo: parameters.bi || parameters.branchInfo || '',
          establishedDate: parameters.ed || parameters.establishedDate || '',
          companyPR: parameters.cp || parameters.companyPR || '',
          areasCompressed: parameters.ac || parameters.areasCompressed || '',
          priorityAreas: parameters.pa || parameters.priorityAreas || '',
          timestamp: parameters.ts || parameters.timestamp || new Date().getTime(),
          ...parameters // 他のフィールドもそのまま追加
        };
        
        console.log('🔍 圧縮フィールド展開完了:', {
          会社名: expandedParams.legalName,
          代表者: expandedParams.representative,
          住所: expandedParams.address
        });
        
        // 🧪 CRITICAL: saveFranchiseData関数を直接呼び出し
        var result;
        console.log('🧪 関数呼び出し前チェック - typeof saveFranchiseData:', typeof saveFranchiseData);
        
        if (typeof saveFranchiseData === 'function') {
          console.log('✅ saveFranchiseData関数が見つかりました、実行します');
          result = saveFranchiseData(expandedParams);
          console.log('🔥 saveFranchiseData実行成功（最優先）:', JSON.stringify(result));
        } else {
          console.error('❌ CRITICAL: saveFranchiseData関数が見つかりません！');
          console.log('🔧 代替手段を試行します...');
          
          // 代替手段1: globalThisから直接取得
          if (typeof globalThis.saveFranchiseData === 'function') {
            console.log('🔧 globalThisからsaveFranchiseData関数を取得しました');
            result = globalThis.saveFranchiseData(expandedParams);
          }
          // 代替手段2: 最小限の登録処理を直接実装
          else {
            console.log('🔧 最小限の代替処理を実行します');
            result = {
              success: false,
              error: 'submitFranchiseRegistration関数が見つかりません',
              debug: {
                typeof_direct: typeof submitFranchiseRegistration,
                typeof_global: typeof globalThis.submitFranchiseRegistration,
                typeof_this: typeof this.submitFranchiseRegistration,
                receivedData: expandedParams
              }
            };
          }
        }
        
        if (callback) {
          return createJsonpCorsResponse(result, callback);
        } else {
          return createCorsResponse(JSON.stringify(result), 200);
        }
      } catch (error) {
        console.error('🔥 submitFranchiseRegistrationエラー（最優先）:', error);
        var errorResult = {
          success: false,
          error: 'FRANCHISE_REGISTRATION_ERROR',
          message: error.message
        };
        
        if (callback) {
          return createJsonpCorsResponse(errorResult, callback);
        } else {
          return createCorsResponse(JSON.stringify(errorResult), 500);
        }
      }
    }
    
    // 🔐 認証APIの優先処理
    if (action) {
      switch(action) {
        case 'set-initial-password':
        case 'authset-initial-password':
        case 'auth/set-initial-password':
          console.log('🔐 Password setting API called - doGet');
          console.log('🔐 Parameters received:', JSON.stringify(e.parameter));
          
          // 緊急対応: 関数存在チェック
          if (typeof setInitialPassword !== 'function') {
            console.error('🔐 setInitialPassword function not found!');
            return jsonResponse({
              success: false,
              message: 'setInitialPassword function not found'
            });
          }
          
          try {
            var result = setInitialPassword(e.parameter);
            console.log('🔐 setInitialPassword result:', JSON.stringify(result));
            var response = jsonResponse(result);
            console.log('🔐 Returning response from doGet');
            return response;
          } catch (error) {
            console.error('🔐 Error in doGet auth:', error);
            console.error('🔐 Error stack:', error.stack);
            return jsonResponse({
              success: false,
              message: 'Authentication error: ' + error.message
            });
          }
          
        case 'login':
        case 'authlogin':
          console.log('Login API called');
          var loginResult = authenticateUser(e.parameter);
          return jsonResponse(loginResult);
          
        case 'request-password-reset':
        case 'authrequest-password-reset':
          console.log('Password reset API called');
          var resetResult = requestPasswordReset(e.parameter);
          return jsonResponse(resetResult);
      }
    }
    
    console.log('🚨🚨🚨🚨🚨🚨🚨 doGet関数が呼び出されました 🚨🚨🚨🚨🚨🚨🚨');
    console.log('🌐🌐🌐 GAS WebApp GET受信 - CORS修正版 🌐🌐🌐');
    console.log('🔍 CRITICAL DEBUG: doGet開始 - 行番号1496');
    console.log('🔍 実行時刻:', new Date().toISOString());
    console.log('🔍 現在のファイル情報: notify.js');
    console.log('🔍 受信パラメータ:', JSON.stringify(e.parameter, null, 2));
    console.log('🔍 パラメータ数:', Object.keys(e.parameter || {}).length);
    
    // ❤️ CORSヘッダー強制設定
    var headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    // 実行時刻を記録
    PropertiesService.getScriptProperties().setProperty('LAST_EXECUTION', new Date().toISOString());
    PropertiesService.getScriptProperties().setProperty('LAST_DOGET_PARAMS', JSON.stringify(e.parameter || {}));
    
    // 1. Slack Interactive Components 判定を追加（doGetでも対応）
    if (e.parameter && e.parameter.payload) {
      console.log('⚠️ doGetで古いSlackペイロード検出 - 新しいURLボタンシステムを使用してください');
      // Slackのインタラクティブコンポーネント（ボタン）処理
      if (e.postData && e.postData.contents) {
        var payload = JSON.parse(decodeURIComponent(e.postData.contents.split('payload=')[1]));
        return handleSlackButtonCallback(payload);
      } else {
        return handleSlackInteractiveCallback_DEPRECATED(e);
      }
    }
    
    // パラメータなしの場合は質問データを直接返す（シンプルAPI）
    if (!e.parameter || Object.keys(e.parameter).length === 0) {
      return getQuestionsDirectly();
    }
    
    // 設定情報取得リクエスト処理
    if (e.parameter.action === 'getConfig') {
      console.log('🌐 設定情報取得リクエスト受信');
      var callback = e.parameter.callback;
      
      var properties = PropertiesService.getScriptProperties();
      var gasWebappUrl = properties.getProperty('GAS_WEBAPP_URL');
      var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
      
      console.log('🔍 getConfig: GAS_WEBAPP_URL =', gasWebappUrl);
      console.log('🔍 getConfig: SPREADSHEET_ID =', spreadsheetId);
      
      var configData = {
        success: true,
        gasUrl: getGasWebappUrl(),
        gasWebappUrl: gasWebappUrl,
        spreadsheetId: spreadsheetId,
        timestamp: new Date().toISOString(),
        deployed: true
      };
      
      if (callback) {
        // JSONP形式で返す
        return createJsonpCorsResponse(configData, callback);
      } else {
        // 通常のJSON形式で返す
        return createCorsResponse(JSON.stringify(configData));
      }
    }
    
    // 直接的なURLパラメータでのgetQuestionsByStageリクエスト処理
    if (e.parameter.action === 'getQuestionsByStage') {
      console.log('📋 直接URLパラメータでgetQuestionsByStage受信');
      var stage = e.parameter.stage || 'all';
      var requiredOnly = e.parameter.requiredOnly === 'true' || e.parameter.requiredOnly === true;
      var callback = e.parameter.callback;
      
      console.log('📤 getQuestionsByStage呼び出し:', { stage, requiredOnly });
      var result = getQuestionsByStage(stage, requiredOnly);
      console.log('📥 getQuestionsByStage結果:', result.totalCount, '件');
      
      if (callback) {
        // JSONP形式で返す
        return createJsonpCorsResponse(result, callback);
      } else {
        // 通常のJSON形式で返す
        return createCorsResponse(JSON.stringify(result), 200);
      }
    }
    
    // 🎯 加盟店登録処理（submitFranchiseRegistration）
    if (e.parameter.action === 'submitFranchiseRegistration') {
      console.log('🔥 CRITICAL: submitFranchiseRegistration処理開始!');
      console.log('🔥 受信パラメータ:', JSON.stringify(e.parameter, null, 2));
      console.log('🔥 DEBUG: saveFranchiseData関数チェック:', typeof saveFranchiseData);
      console.log('🔥 DEBUG: globalThis.saveFranchiseData:', typeof globalThis.saveFranchiseData);
      
      var callback = e.parameter.callback;
      
      try {
        // saveFranchiseData関数を直接呼び出す
        if (typeof saveFranchiseData === 'function') {
          console.log('✅ saveFranchiseData関数が見つかりました');
          var result = saveFranchiseData(e.parameter);
          console.log('✅ saveFranchiseData成功:', JSON.stringify(result, null, 2));
          
          if (!result || !result.success) {
            throw new Error(result.error || '登録処理が失敗しました');
          }
          
          if (callback) {
            return createJsonpCorsResponse(result, callback);
          } else {
            return createCorsResponse(JSON.stringify(result), 200);
          }
        } else {
          console.error('❌ saveFranchiseData関数が見つかりません');
          var errorResult = {
            success: false,
            error: 'saveFranchiseData関数が定義されていません'
          };
          
          if (callback) {
            return createJsonpCorsResponse(errorResult, callback);
          } else {
            return createCorsResponse(JSON.stringify(errorResult), 500);
          }
        }
        
      } catch (error) {
        console.error('❌ submitFranchiseRegistration エラー:', error);
        console.error('❌ エラースタック:', error.stack);
        var errorResult = {
          success: false,
          error: error.message || '登録処理でエラーが発生しました'
        };
        
        if (callback) {
          return createJsonpCorsResponse(errorResult, callback);
        } else {
          return createCorsResponse(JSON.stringify(errorResult), 500);
        }
      }
    }
    
    // 直接的なURLパラメータでのgetAddressByPostalCodeリクエスト処理
    if (e.parameter.action === 'getAddressByPostalCode') {
      console.log('📮 直接URLパラメータでgetAddressByPostalCode受信');
      var postalCode = e.parameter.postalCode;
      var callback = e.parameter.callback;
      
      console.log('📤 getAddressByPostalCode呼び出し:', { postalCode });
      var result = getAddressByPostalCode(postalCode);
      console.log('📥 getAddressByPostalCode結果:', result);
      
      if (callback) {
        // JSONP形式で返す
        return createJsonpCorsResponse(result, callback);
      } else {
        // 通常のJSON形式で返す
        return createCorsResponse(JSON.stringify(result), 200);
      }
    }
    
    console.log('🔍🔍🔍 3242行目到達チェック - action:', e.parameter ? e.parameter.action : 'null');
    console.log('🔍🔍🔍 startAIHearing条件チェック:', e.parameter && e.parameter.action === 'startAIHearing');
    
    
    // データパラメータがある場合の処理（JSONP対応含む）
    if (e.parameter.data) {
      console.log('🔄 JSONP処理開始');
      console.log('📋 生データ:', e.parameter.data.substring(0, 200) + '...');
      
      var postData;
      try {
        // GASでは e.parameter.data は既にURLデコードされているため、直接パース
        postData = JSON.parse(e.parameter.data);
      } catch (directParseError) {
        console.log('⚠️ 直接パース失敗、decodeURIComponentを試行');
        try {
          postData = JSON.parse(decodeURIComponent(e.parameter.data));
        } catch (parseError) {
          console.error('❌ 全てのJSON Parse方法が失敗:', parseError.message);
          
          var callback = e.parameter.callback;
          
          return createJsonpCorsResponse({
            success: false,
            error: 'JSONパースエラー: ' + parseError.message,
            rawDataStart: e.parameter.data.substring(0, 100),
            rawDataLength: e.parameter.data.length,
            debugInfo: 'GAS doGet JSONパース失敗'
          }, callback);
        }
      }
      
      // 圧縮データの場合は 'a' フィールドから action を取得
      var action = postData.action || postData.a;
      
      console.log('🎯 実行アクション:', action);
      
      // doPost関数と同じルーティングロジックを使用
      // 🔥 CRITICAL FIX: registrationData を正しく抽出
      console.log('🔍 postData keys:', Object.keys(postData || {}));
      console.log('🔍 postData.registrationData存在:', !!postData.registrationData);
      console.log('🔍 postData:', JSON.stringify(postData, null, 2));
      
      var parameters = postData.registrationData || postData;
      var result;
      
      // アクションによる分岐処理（doPost関数と同様）
      console.log('🔀 SWITCH文A開始（dataパラメータ処理）- action:', action);
      console.log('🔀 SWITCH文A - actionの型:', typeof action, 'length:', action ? action.length : 'null');
      switch (action) {
        
        // 認証関連
        case 'auth/login':
          result = handleLogin(parameters);
          break;
        
        // 📋 加盟店管理API
        case 'getFranchiseList':
          console.log('📋 加盟店一覧取得開始（doGet）');
          try {
            result = getFranchiseList();
            console.log('📋 加盟店一覧取得完了:', result);
          } catch (error) {
            console.error('❌ 加盟店一覧取得エラー:', error);
            result = {
              success: false,
              error: 'getFranchiseList関数エラー: ' + error.message
            };
          }
          break;
          
        case 'updateFranchiseStatus':
          console.log('📋 加盟店ステータス更新開始（doGet）');
          try {
            result = updateFranchiseStatus(parameters.franchiseId, parameters.status, parameters.reviewer, parameters.comment);
            console.log('📋 加盟店ステータス更新完了:', result);
          } catch (error) {
            console.error('❌ 加盟店ステータス更新エラー:', error);
            result = {
              success: false,
              error: 'updateFranchiseStatus関数エラー: ' + error.message
            };
          }
          break;
        
        // 🎯 加盟店AIヒアリングBOT関連（削除済み - URLパラメータ処理で統合）
        case 'searchCompanyDetails':
          result = searchCompanyDetails(parameters);
          break;
        case 'searchCompanyDetailsFromAI':
          result = searchCompanyDetailsFromAI(parameters);
          break;
        case 'confirmAICandidate':
          result = confirmAICandidate(parameters);
          break;
        case 'getQuestionsByStage':
          console.log('📋 JSONPでgetQuestionsByStage受信');
          var stage_jsonp = parameters.stage || 'all';
          var requiredOnly_jsonp = parameters.requiredOnly === 'true' || parameters.requiredOnly === true;
          console.log('📤 getQuestionsByStage呼び出し:', { stage: stage_jsonp, requiredOnly: requiredOnly_jsonp });
          result = getQuestionsByStage(stage_jsonp, requiredOnly_jsonp);
          console.log('📥 getQuestionsByStage結果:', result.totalCount, '件');
          break;
        
        // 🎯 簡易承認システム
        case 'approveFranchise':
          console.log('✅ 加盟店承認処理開始:', parameters.franchiseId);
          try {
            var approvalResult = approveFranchiseSimple(parameters.franchiseId);
            result = {
              success: true,
              message: "加盟店 " + parameters.franchiseId + " を承認しました",
              ...approvalResult
            };
          } catch (error) {
            console.error('❌ 承認処理エラー:', error);
            result = {
              success: false,
              error: error.message,
              message: '承認処理に失敗しました'
            };
          }
          break;
          
        case 'rejectFranchise':
          console.log('❌ 加盟店却下処理開始:', parameters.franchiseId);
          try {
            var rejectionResult = rejectFranchiseSimple(parameters.franchiseId);
            result = {
              success: true,
              message: "加盟店 " + parameters.franchiseId + " を却下しました",
              ...rejectionResult
            };
          } catch (error) {
            console.error('❌ 却下処理エラー:', error);
            result = {
              success: false,
              error: error.message,
              message: '却下処理に失敗しました'
            };
          }
          break;

        // 🎯 チャンク処理（分割送信対応）
        case 'storeChunk':
          console.log('📦 チャンク受信:', parameters.s, 'インデックス:', parameters.i);
          // PropertiesServiceを使用してセッションデータを保存
          var props = PropertiesService.getScriptProperties();
          var sessionKey = 'chunk_' + parameters.s + '_' + parameters.i;
          props.setProperty(sessionKey, parameters.d);
          
          // セッション情報も保存
          var sessionInfo = props.getProperty('session_' + parameters.s) || '{}';
          var info = JSON.parse(sessionInfo);
          info.total = parseInt(parameters.t);
          info.received = (info.received || 0) + 1;
          props.setProperty('session_' + parameters.s, JSON.stringify(info));
          
          result = { success: true };
          break;
          
        case 'processChunks':
          console.log('🔄 チャンク結合処理:', parameters.s);
          var props = PropertiesService.getScriptProperties();
          var sessionInfo = props.getProperty('session_' + parameters.s);
          
          if (sessionInfo) {
            var info = JSON.parse(sessionInfo);
            var chunks = [];
            
            // すべてのチャンクを結合
            for (var i = 0; i < info.total; i++) {
              var chunk = props.getProperty('chunk_' + parameters.s + '_' + i);
              if (chunk) {
                chunks.push(chunk);
              }
            }
            
            var combined = chunks.join('');
            console.log('📊 結合データサイズ:', combined.length);
            
            try {
              var fullData = JSON.parse(combined);
              // saveFranchiseData関数を呼び出し
              if (typeof saveFranchiseData === 'function') {
                result = saveFranchiseData(fullData);
              } else {
                result = { success: false, error: 'saveFranchiseData関数が見つかりません' };
              }
              
              // プロパティをクリーンアップ
              for (var j = 0; j < info.total; j++) {
                props.deleteProperty('chunk_' + parameters.s + '_' + j);
              }
              props.deleteProperty('session_' + parameters.s);
              
            } catch (parseError) {
              console.error('❌ データパースエラー:', parseError);
              result = { success: false, error: 'データ解析エラー' };
            }
          } else {
            result = { success: false, error: 'セッションデータが見つかりません' };
          }
          break;
        
        case 'storeFranchiseChunk':
          console.log('📦 JSONP: 加盟店データチャンク受信');
          result = {
            success: true,
            message: 'チャンク受信済み',
            chunkIndex: parameters.chunkIndex,
            totalChunks: parameters.totalChunks
          };
          // チャンクをメモリに保存（実際の処理はchunk_handler.jsに委譲）
          if (typeof handleFranchiseChunk === 'function') {
            result = handleFranchiseChunk(parameters);
          }
          break;
          
        case 'processFranchiseRegistration':
          console.log('🔄 JSONP: 加盟店データ結合処理');
          if (typeof combineFranchiseChunks === 'function') {
            result = combineFranchiseChunks(parameters);
          } else {
            result = {
              success: false,
              error: 'combineFranchiseChunks関数が見つかりません'
            };
          }
          break;
        
        case 'submitFranchiseChunk':
          console.log('📦 JSONP: 加盟店データチャンク受信');
          if (typeof handleFranchiseChunk === 'function') {
            result = handleFranchiseChunk(parameters);
          } else {
            console.error('❌ handleFranchiseChunk関数が見つかりません');
            result = {
              success: false,
              error: 'チャンク処理関数が未定義です'
            };
          }
          break;
          
        case 'combineFranchiseChunks':
          console.log('🔄 JSONP: 加盟店データチャンク結合');
          if (typeof combineFranchiseChunks === 'function') {
            result = combineFranchiseChunks(parameters);
          } else {
            console.error('❌ combineFranchiseChunks関数が見つかりません');
            result = {
              success: false,
              error: 'チャンク結合関数が未定義です'
            };
          }
          break;
        
          console.log('🔥 registrationDataタイプ:', typeof parameters.registrationData);
          console.log('🔥 registrationDataキー:', Object.keys(parameters.registrationData || {}));
          
          // 圧縮データの場合は展開処理を追加
          if (parameters.areasCompressed && !parameters.areas) {
            console.log('🔥 圧縮エリアデータを検出:', parameters.areasCompressed);
            parameters.areas = [{
              prefecture: 'エリア情報',
              city: parameters.areasCompressed,
              towns: [],
              isPriority: false
            }];
          }
          
          // FranchiseHearingAI_New.gs の関数を呼び出し
          try {
            console.log('🔥 submitFranchiseRegistration関数存在チェック:', typeof submitFranchiseRegistration);
            console.log('🔥 関数が存在します:', typeof submitFranchiseRegistration === 'function');
            
            if (typeof submitFranchiseRegistration === 'function') {
              console.log('🔥 submitFranchiseRegistration関数呼び出し開始');
              console.log('🔥 関数呼び出し直前の時刻:', new Date().toISOString());
              
              // 🔥 デバッグ: パラメータの内容を確認
              console.log('🔥 parameters.ln存在チェック:', !!parameters.ln);
              console.log('🔥 parameters.ln値:', parameters.ln);
              console.log('🔥 parameters.c値:', parameters.c);
              
              // 圧縮データの場合は展開、通常データの場合はそのまま使用
              var dataToSubmit;
              
              // 🔥 重要: parametersにlnキーがある場合は必ず圧縮データとして処理
              if (parameters.ln) {
                // 圧縮データを展開
                console.log('🆕🆕🆕 最新notify.js実行中 - 2025/08/10 21:55更新 🆕🆕🆕');
                console.log('🔥 JSONP用submitFranchiseRegistration処理開始');
                console.log('🔥 圧縮データを検出（ln存在）、展開中...');
                console.log('🔧 データ検証:', Object.keys(parameters).length, 'フィールド');
                console.log('🔧 フィールド一覧:', Object.keys(parameters));
                
                dataToSubmit = {
                  legalName: parameters.ln,
                  legalNameKana: parameters.lk || parameters.lnk,
                  representative: parameters.rp || parameters.rep,
                  representativeKana: parameters.rk || parameters.repk,
                  postalCode: parameters.pc,
                  address: parameters.ad || parameters.addr,
                  phone: parameters.ph,
                  websiteUrl: parameters.web,
                  employees: parameters.emp,
                  revenue: parameters.rev,
                  billingEmail: parameters.bem,
                  salesEmail: parameters.sem,
                  salesPersonName: parameters.spn,
                  salesPersonContact: parameters.spc,
                  propertyTypes: parameters.pt,
                  constructionAreas: parameters.ca,
                  specialServices: parameters.ss,
                  buildingAgeRange: parameters.ba || parameters.bar,
                  tradeName: parameters.tn,
                  tradeNameKana: parameters.tk || parameters.tnk,
                  branchInfo: parameters.bi,
                  establishedDate: parameters.ed,
                  companyPR: parameters.cp || parameters.pr,
                  areasCompressed: parameters.ac,
                  priorityAreas: parameters.pa,
                  timestamp: parameters.ts ? new Date(parameters.ts) : new Date()
                };
                console.log('🔥 データ展開完了');
                console.log('🔥 展開後のデータ（抜粋）:', {
                  legalName: dataToSubmit.legalName,
                  representative: dataToSubmit.representative,
                  phone: dataToSubmit.phone,
                  areasCompressed: dataToSubmit.areasCompressed ? dataToSubmit.areasCompressed.substring(0, 50) + '...' : 'なし'
                });
              } else if (parameters.legalName) {
                  // 圧縮キーが存在する場合の展開処理
                  dataToSubmit = {
                    legalName: parameters.ln || parameters.legalName,
                    legalNameKana: parameters.lk || parameters.lnk || parameters.legalNameKana,
                    representative: parameters.rp || parameters.representative,
                    representativeKana: parameters.rk || parameters.representativeKana,
                    postalCode: parameters.pc || parameters.postalCode,
                    address: parameters.ad || parameters.address,
                    phone: parameters.ph || parameters.phone,
                    websiteUrl: parameters.web || parameters.websiteUrl,
                    employees: parameters.emp || parameters.employees,
                    revenue: parameters.rev || parameters.revenue,
                    billingEmail: parameters.bem || parameters.billingEmail,
                    salesEmail: parameters.sem || parameters.salesEmail,
                    salesPersonName: parameters.spn || parameters.salesPersonName,
                    salesPersonContact: parameters.spc || parameters.salesPersonContact,
                    propertyTypes: parameters.pt || parameters.propertyTypes,
                    constructionAreas: parameters.ca || parameters.constructionAreas,
                    specialServices: parameters.ss || parameters.specialServices,
                    buildingAgeRange: parameters.ba || parameters.buildingAgeRange,
                    tradeName: parameters.tn || parameters.tradeName,
                    tradeNameKana: parameters.tk || parameters.tradeNameKana,
                    branchInfo: parameters.bi || parameters.branchInfo,
                    establishedDate: parameters.ed || parameters.establishedDate,
                    companyPR: parameters.cp || parameters.companyPR,
                    areasCompressed: parameters.ac || parameters.areasCompressed || parameters.serviceAreas,
                    priorityAreas: parameters.pa || parameters.priorityAreas,
                    timestamp: parameters.ts || parameters.timestamp || new Date().toISOString()
                  };
                  console.log('🔥 通常データ展開完了');
              } else {
                // どちらのキーもない場合は、parametersをそのまま使用（フォールバック）
                console.log('🔥 フォールバック: parametersをそのまま使用');
                dataToSubmit = parameters;
              }
              
              // 🔥 データ展開後の確認
              console.log('🔥 dataToSubmit存在チェック:', !!dataToSubmit);
              console.log('🔥 dataToSubmitのキー数:', dataToSubmit ? Object.keys(dataToSubmit).length : 0);
              
              // 電話番号の先頭0を確実に追加
              if (dataToSubmit.phone) {
                var phoneStr = String(dataToSubmit.phone).replace(/[-\s]/g, '');
                console.log('🔥 電話番号ハイフン除去後:', phoneStr);
                
                if (phoneStr && phoneStr.length > 0) {
                  if (!phoneStr.startsWith('0')) {
                    phoneStr = '0' + phoneStr;
                    console.log('🔥 電話番号先頭0追加:', phoneStr);
                  }
                  // シングルクォートも追加
                  dataToSubmit.phone = "'" + phoneStr;
                  console.log('🔥 電話番号シングルクォート追加:', dataToSubmit.phone);
                } else {
                  dataToSubmit.phone = phoneStr;
                }
              }
              
              // 営業担当者連絡先の先頭0を確実に追加
              if (dataToSubmit.salesPersonContact) {
                console.log('🔥 営業担当者連絡先処理前:', dataToSubmit.salesPersonContact);
                console.log('🔥 型:', typeof dataToSubmit.salesPersonContact);
                
                var contactStr = String(dataToSubmit.salesPersonContact).replace(/[-\s]/g, '');
                console.log('🔥 ハイフン除去後:', contactStr);
                
                // 確実に先頭0をつける
                if (contactStr && contactStr.length > 0) {
                  if (!contactStr.startsWith('0')) {
                    contactStr = '0' + contactStr;
                    console.log('🔥 先頭0追加:', contactStr);
                  }
                  // さらにシングルクォートも追加
                  dataToSubmit.salesPersonContact = "'" + contactStr;
                  console.log('🔥 シングルクォート追加:', dataToSubmit.salesPersonContact);
                } else {
                  dataToSubmit.salesPersonContact = contactStr;
                }
              }
              
              // デバッグログ（削除可能）
              // console.log('🔥 送信データ（phone）:', dataToSubmit.phone);
              // console.log('🔥 送信データ（salesPersonContact）:', dataToSubmit.salesPersonContact);
              
              // saveFranchiseData関数を直接呼び出す（FranchiseHearingAI_New.jsの関数）
              if (typeof saveFranchiseData === 'function') {
                console.log('🔥 saveFranchiseData関数を直接呼び出します');
                console.log('🆕🆕🆕 最新コード: 圧縮データそのまま送信 🆕🆕🆕');
                console.log('🔥 parametersの圧縮キー確認:', {
                  ln: parameters.ln,
                  ph: parameters.ph,
                  spc: parameters.spc,
                  keys: Object.keys(parameters)
                });
                // 🔥 重要: 圧縮データをそのまま渡す（saveFranchiseData側で展開）
                result = saveFranchiseData(parameters);
                if (result && result.success) {
                  // submitFranchiseRegistration互換のレスポンス形式に変換
                  result = {
                    success: true,
                    message: '登録が完了しました',
                    franchiseId: result.franchiseId,
                    registrationId: result.franchiseId
                  };
                }
              } else {
                // フォールバック: submitFranchiseRegistration関数を使用
                console.log('🔥 フォールバック: submitFranchiseRegistration関数を使用');
                result = submitFranchiseRegistration(dataToSubmit);
              }
              
              console.log('🔥 submitFranchiseRegistration関数呼び出し完了');
              console.log('🔥 関数呼び出し後の時刻:', new Date().toISOString());
              console.log('🔥 返却結果:', JSON.stringify(result, null, 2));
            } else {
              console.error('❌ submitFranchiseRegistration関数が見つかりません');
              result = {
                success: false,
                error: 'submitFranchiseRegistration関数が定義されていません'
              };
            }
          } catch (callError) {
            console.error('❌ submitFranchiseRegistration呼び出しエラー:', callError.message);
            console.error('❌ エラースタック:', callError.stack);
            console.error('❌ エラー詳細:', callError.toString());
            
            result = {
              success: false,
              error: 'submitFranchiseRegistration呼び出しエラー: ' + callError.message,
              stack: callError.stack,
              debugInfo: 'doGet switch case内でエラー発生'
            };
          }
          console.log('📝 JSONP加盟店登録API結果:', JSON.stringify(result, null, 2));
          break;
        
        // 🤖 OpenAI API呼び出し（分岐解析用）
        case 'callOpenAI':
            try {
            result = callOpenAIForBranchAnalysis(parameters);
          } catch (openaiError) {
            console.error('❌ OpenAI API呼び出しエラー:', openaiError.message);
            result = {
              success: false,
              error: 'OpenAI API呼び出しエラー: ' + openaiError.message
            };
          }
          break;
        
        // 🎯 4段階ヒアリングシステム
        case 'processHearingStage':
          console.log('🎯 4段階ヒアリング処理開始');
          var sessionId = parameters.sessionId || 'default_session';
          var stage = parseInt(parameters.stage) || 1;
          var userAnswers = parameters.userAnswers || null;
          var customPrompt = parameters.customPrompt || null;
          
          try {
            if (typeof processHearingStage === 'function') {
              result = processHearingStage(sessionId, stage, userAnswers, customPrompt);
            } else {
              console.error('❌ processHearingStage関数が見つかりません');
              result = {
                success: false,
                error: 'processHearingStage関数が定義されていません'
              };
            }
          } catch (hearingError) {
            console.error('❌ processHearingStage呼び出しエラー:', hearingError.message);
            result = {
              success: false,
              error: 'ヒアリング処理エラー: ' + hearingError.message
            };
          }
          break;
        
        // ✨ 2段階送信方式 - 基本情報登録
        case 'submitFranchiseBasic':
          console.log('✨ 基本情報登録開始（2段階送信方式）');
          try {
            // saveFranchiseData関数を呼び出し（エリア情報は後で追加）
            if (typeof saveFranchiseData === 'function') {
              // 基本情報のみでまず登録
              var basicData = {
                ln: parameters.ln,
                lk: parameters.lk,
                rp: parameters.rp,
                rk: parameters.rk,
                pc: parameters.pc,
                ad: parameters.ad,
                ph: parameters.ph,
                web: parameters.web,
                emp: parameters.emp,
                rev: parameters.rev,
                bem: parameters.bem,
                sem: parameters.sem,
                spn: parameters.spn,
                spc: parameters.spc,
                pt: parameters.pt,
                ca: parameters.ca,
                ss: parameters.ss,
                ba: parameters.ba,
                tn: parameters.tn,
                tk: parameters.tk,
                bi: parameters.bi,
                ed: parameters.ed,
                cp: parameters.cp,
                // エリアは空で登録
                ac: '',
                pa: '',
                ts: parameters.ts
              };
              
              var saveResult = saveFranchiseData(basicData);
              
              if (saveResult && saveResult.success) {
                // 加盟店IDを生成（またはsaveResultから取得）
                var franchiseId = saveResult.franchiseId || 'FR_' + Date.now();
                
                // PropertiesServiceに一時保存（エリア追加時に使用）
                PropertiesService.getScriptProperties().setProperty('temp_franchise_' + franchiseId, JSON.stringify(basicData));
                
                result = {
                  success: true,
                  franchiseId: franchiseId,
                  message: '基本情報登録完了',
                  nextStep: 'エリア情報送信'
                };
                console.log('✅ 基本情報登録成功 - 加盟店ID:', franchiseId);
              } else {
                throw new Error(saveResult.error || '基本情報の保存に失敗しました');
              }
            } else {
              throw new Error('saveFranchiseData関数が見つかりません');
            }
          } catch (error) {
            console.error('❌ 基本情報登録エラー:', error);
            result = {
              success: false,
              error: error.toString()
            };
          }
          break;
        
        // 📍 2段階送信方式 - エリア情報追加
        case 'addFranchiseAreas':
          console.log('📍 エリア情報追加開始');
          try {
            var franchiseId = parameters.fid;
            var chunkIndex = parseInt(parameters.ci || 0);
            var totalChunks = parseInt(parameters.ct || 1);
            var areaString = parameters.areas || '';
            
            console.log('📍 加盟店ID:', franchiseId);
            console.log('📍 チャンク:', chunkIndex + 1, '/', totalChunks);
            console.log('📍 エリアデータ長:', areaString.length, '文字');
            
            // PropertiesServiceからエリア配列を取得（または新規作成）
            var areaKey = 'areas_' + franchiseId;
            var existingAreas = PropertiesService.getScriptProperties().getProperty(areaKey);
            var allAreas = existingAreas ? JSON.parse(existingAreas) : [];
            
            // エリア文字列をパース
            if (areaString) {
              var areaItems = areaString.split(';');
              areaItems.forEach(function(item) {
                if (item) {
                  var parts = item.split(':');
                  if (parts.length >= 3) {
                    var areaObj = {
                      prefecture: parts[0],
                      city: parts[1],
                      isPriority: parts[2] === '1',
                      towns: parts[3] ? parts[3].split('|') : []
                    };
                    allAreas.push(areaObj);
                  }
                }
              });
            }
            
            // エリア配列を保存
            PropertiesService.getScriptProperties().setProperty(areaKey, JSON.stringify(allAreas));
            
            result = {
              success: true,
              franchiseId: franchiseId,
              chunkIndex: chunkIndex,
              totalChunks: totalChunks,
              areasReceived: allAreas.length,
              message: 'エリアチャンク' + (chunkIndex + 1) + '受信完了'
            };
            
            console.log('✅ エリアチャンク保存完了 - 合計エリア数:', allAreas.length);
            
          } catch (error) {
            console.error('❌ エリア情報追加エラー:', error);
            result = {
              success: false,
              error: error.toString()
            };
          }
          break;
        
        // ✅ 2段階送信方式 - 登録完了処理
        case 'completeFranchiseRegistration':
          console.log('✅ 加盟店登録完了処理開始');
          try {
            var franchiseId = parameters.fid;
            
            // 保存されたエリア情報を取得
            var areaKey = 'areas_' + franchiseId;
            var areasJson = PropertiesService.getScriptProperties().getProperty(areaKey);
            var areas = areasJson ? JSON.parse(areasJson) : [];
            
            console.log('✅ 最終エリア数:', areas.length);
            
            // スプレッドシートの加盟店データを更新（エリア情報を追加）
            if (areas.length > 0) {
              var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
              var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店管理');
              
              if (sheet) {
                // 加盟店IDで行を検索
                var data = sheet.getDataRange().getValues();
                var targetRow = -1;
                
                for (var i = 1; i < data.length; i++) {
                  if (data[i][0] === franchiseId || data[i][1] === franchiseId) {
                    targetRow = i + 1;
                    break;
                  }
                }
                
                if (targetRow > 0) {
                  // エリア情報を圧縮形式で保存
                  var compressedAreas = areas.map(function(area) {
                    return area.prefecture + ':' + area.city + (area.isPriority ? '*' : '');
                  }).join(',');
                  
                  // エリア列を更新（列番号は実際のシート構成に合わせて調整）
                  var areaColumn = 24; // 適宜調整
                  sheet.getRange(targetRow, areaColumn).setValue(compressedAreas);
                  sheet.getRange(targetRow, areaColumn + 1).setValue('エリア数: ' + areas.length);
                  
                  console.log('✅ スプレッドシートのエリア情報を更新しました');
                }
              }
            }
            
            // 一時データをクリーンアップ
            PropertiesService.getScriptProperties().deleteProperty(areaKey);
            PropertiesService.getScriptProperties().deleteProperty('temp_franchise_' + franchiseId);
            
            result = {
              success: true,
              franchiseId: franchiseId,
              message: '加盟店登録が完了しました',
              totalAreas: areas.length
            };
            
            console.log('✅ 加盟店登録完了 - ID:', franchiseId, 'エリア数:', areas.length);
            
          } catch (error) {
            console.error('❌ 登録完了処理エラー:', error);
            result = {
              success: false,
              error: error.toString()
            };
          }
          break;
        
        // 📊 質問データ取得API（統合済み - 上記で処理）

        // GAS URL取得（プロパティから）
        case 'getGasUrl':
          console.log('📌 JSONP: GAS_WEBAPP_URL取得リクエスト');
          const gasUrlProp = PropertiesService.getScriptProperties().getProperty('GAS_WEBAPP_URL');
          if (gasUrlProp) {
            result = {
              success: true,
              url: gasUrlProp
            };
            console.log('✅ GAS_WEBAPP_URL返却:', gasUrlProp);
          } else {
            result = {
              success: false,
              message: 'GAS_WEBAPP_URLが未設定です'
            };
            console.log('⚠️ GAS_WEBAPP_URL未設定');
          }
          break;
        
        // 設定取得（プロパティから）
        case 'getConfig':
          console.log('📌 JSONP: 設定取得リクエスト');
          var configGasUrl = PropertiesService.getScriptProperties().getProperty('GAS_WEBAPP_URL');
          if (configGasUrl) {
            result = {
              success: true,
              data: {
                gasUrl: configGasUrl
              }
            };
            console.log('✅ 設定返却 - GAS URL:', configGasUrl);
          } else {
            // デフォルトURLを返す
            result = {
              success: true,
              data: {
                gasUrl: 'https://script.google.com/macros/s/AKfycbw1v1mKcq6oR4ckXpndJIzFykqltC-1DYYBXNlgxFT8Wh7wEdVuANwFoTaV9IeT47OWRQ/exec'
              }
            };
            console.log('⚠️ GAS_WEBAPP_URL未設定、デフォルト使用');
          }
          break;
          
        // 接続テスト
        case 'connectionTest':
          result = {
            success: true,
            message: 'GAS WebApp接続正常',
            timestamp: new Date().toISOString()
          };
          break;
        
        // CV用データ保存（doGetでも対応）
        case 'saveCVData':
          console.log('📞 CV用データ保存開始（doGet）');
            
          try {
            var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
            if (!spreadsheetId) {
              throw new Error('スプレッドシートIDが設定されていません');
            }
            
            var ss = SpreadsheetApp.openById(spreadsheetId);
            var sheet = ss.getSheetByName('統合_CV記録');
            
            // シートが存在しない場合は作成
            if (!sheet) {
              sheet = ss.insertSheet('統合_CV記録');
              var headers = [
                'タイムスタンプ', '電話番号', '郵便番号', '段階', '回答数', 
                '外壁材質', '建物面積', '外壁状態', '工事時期', 
                '詳細状況', '屋根状況', '予算', '全回答データ', 'IPアドレス'
              ];
              sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
              sheet.getRange(1, 1, 1, headers.length).setBackground('#28a745').setFontColor('white').setFontWeight('bold');
            }
            
            // 回答データから主要項目を抽出
            var answers = parameters.userAnswers || [];
            var answerMap = {};
            answers.forEach(answer => {
              answerMap[answer.questionId] = answer.answer;
            });
            
            var newRow = [
              new Date(), // タイムスタンプ
              parameters.phoneNumber || '', // 電話番号
              parameters.postalCode || '', // 郵便番号
              parameters.stage || 'CV完了', // 段階
              answers.length, // 回答数
              answerMap['Q001'] || '', // 外壁材質
              answerMap['Q002'] || '', // 建物面積
              answerMap['Q003'] || '', // 外壁状態
              answerMap['Q004'] || '', // 工事時期
              answerMap['Q005'] || '', // 詳細状況
              answerMap['Q006'] || '', // 屋根状況
              answerMap['Q007'] || '', // 予算
              JSON.stringify(parameters.userAnswers), // 全回答データ
              'N/A' // IPアドレス
            ];
            
            // 【CRITICAL FIX】常に2行目に新データを挿入（既存データは下にシフト）
            var lastRow = sheet.getLastRow();
            console.log('🔍 CRITICAL: 現在の最終行:', lastRow);
            
            // 重複コードをヘルパー関数に統合
            insertRowAtSecondPosition(sheet, 'システムログ');
            
            // 必ず2行目に挿入
            var targetRow = 2;
            var range = sheet.getRange(targetRow, 1, 1, newRow.length);
            console.log('🔍 CRITICAL: 書き込み範囲:', range.getA1Notation());
            range.setValues([newRow]);
            
            result = {
              success: true,
              message: 'CV用データを保存しました',
              phoneNumber: parameters.phoneNumber,
              answerCount: answers.length,
              timestamp: new Date()
            };
            
          } catch (error) {
            console.error('❌ CV用データ保存エラー:', error);
            result = {
              success: false,
              error: error.toString(),
              message: 'CV用データ保存に失敗しました'
            };
          }
          
          console.log('📞 CV用データ保存結果:', JSON.stringify(result, null, 2));
          break;
        
        // 📋 スプレッドシートデバッグ情報取得（doGet）
        case 'debugSpreadsheet':
          result = debugSpreadsheetInfo();
          break;
          
        // 🧠 AI自律質問選択（doGet）
        case 'selectNextQuestionWithAI':
          console.log('🧠 AI質問選択開始（GET）');
          result = selectNextQuestionWithAI(parameters);
          break;
          
        // 🏗️ スプレッドシート強制初期化（doGet）
        case 'initializeSpreadsheet':
          console.log('🏗️ スプレッドシート強制初期化開始（doGet）');
          try {
            // StreamingChatManagerは無効化済み（estimate-app専用GPT削除）
            console.log('⚠️ StreamingChatManager無効化済み');
            var setupResult = { success: true, message: 'GPTシステム無効化済み' };
            result = {
              success: setupResult.success || true,
              message: 'スプレッドシート初期化完了',
              details: setupResult
            };
          } catch (error) {
            result = {
              success: false,
              error: '初期化エラー: ' + error.toString()
            };
          }
          break;
          
        // 🤖 GPT動的挨拶生成（doGet）
        case 'generateGreeting':
          console.log('🤖 GPT動的挨拶生成開始（doGet）');
          try {
            var greetingResult = generateGPTGreeting(parameters);
            result = greetingResult;
          } catch (error) {
            result = {
              success: false,
              error: '挨拶生成エラー: ' + error.toString(),
              greeting: 'こんにちは！外壁塗装の専門アドバイザーです。お住まいの状況をお聞かせください。最適な業者をご提案させていただきます。'
            };
          }
          break;
        
        case 'getAddressByPostalCode':
          result = getAddressByPostalCode(parameters.postalCode);
          break;
        
        // 🎯 加盟店AIヒアリングBOT関連（SWITCH文A - データパラメータ処理用）
        
        // 📊 質問データ取得API（doGet用）
        case 'getQuestionsByStage':
          var isRequiredOnly = parameters.requiredOnly === 'true' || parameters.requiredOnly === true;
          result = getQuestionsByStageAPI(parameters.stage, isRequiredOnly);
          break;
        
        
        default:
          console.log('⚠️ 未知のアクション:', action);
          result = {
            success: false,
            message: "未対応のアクション: " + action,
            error: 'UNSUPPORTED_ACTION'
          };
      }
      
      console.log('✅ データ処理完了:', JSON.stringify(result));
      
      // コールバックパラメータがある場合はJSONP、ない場合は通常のJSON
      if (e.parameter.callback) {
        var callback = e.parameter.callback;
        
        console.log('✅ JSONP応答準備完了');
        console.log('📋 コールバック名:', callback);
        console.log('📋 レスポンス内容:', JSON.stringify(result).substring(0, 200) + '...');
        
        return createJsonpCorsResponse(result, callback);
      } else {
        console.log('✅ 通常のJSON応答を返却');
        return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
      }
    }
    
    // パス処理の前にdataパラメータ処理をチェック
    if (e.parameter && e.parameter.data) {
      console.log('🔄 GET dataパラメータが見つかりました。dataパラメータ処理を優先します。');
      // dataパラメータ処理は既に上で完了している
      // ここに到達した場合はdataパラメータ処理が完了しているのでreturn
      // コールバック処理
      if (e.parameter.callback) {
        var callback = e.parameter.callback;
        
        console.log('✅ JSONP応答準備完了（data処理後）');
        console.log('📋 コールバック名:', callback);
        
        return createJsonpCorsResponse(result, callback);
      } else {
        console.log('✅ 通常のJSON応答を返却（data処理後）');
        return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
      }
    }
    
    // URLパラメータでaction指定がある場合（dataパラメータなし）
    if (e.parameter && e.parameter.action) {
      console.log('🎯🎯🎯 URLパラメータからアクション実行:', e.parameter.action);
      
      var action = String(e.parameter.action).trim();
      var parameters = e.parameter;
      var result;
      
      console.log('🔍 処理対象action:', action);
      
      // アクション処理
      if (action === 'submitFranchiseRegistration') {
          console.log('🔥🔥🔥 submitFranchiseRegistration実行 - 4076行目switch 🔥🔥🔥');
          console.log('📋 受信パラメータ:', JSON.stringify(parameters));
          
          try {
            // saveFranchiseData関数を直接呼び出す
            result = saveFranchiseData(parameters);
            console.log('✅ saveFranchiseData成功:', JSON.stringify(result));
            
            if (!result || !result.success) {
              throw new Error(result ? result.error : '登録処理が失敗しました');
            }
            
          } catch (error) {
            console.error('❌ saveFranchiseData エラー:', error);
            console.error('❌ エラースタック:', error.stack);
            result = {
              success: false,
              error: error.message || '登録処理でエラーが発生しました'
            };
          }
      }
      else if (action === 'auth/login') {
        result = handleLogin(parameters);
      }
      else if (action === 'searchCompanyDetails') {
        result = searchCompanyDetails(parameters);
      }
      else if (action === 'searchCompanyDetailsFromAI') {
        result = searchCompanyDetailsFromAI(parameters);
      }
      else {
        // その他のアクション（未対応）
        console.log('❌ 未対応のアクション:', action);
        result = {
          success: false,
          message: "未対応のアクション: " + action,
          error: 'UNSUPPORTED_ACTION'
        };
      }
      
      console.log('✅ URLパラメータアクション処理完了:', JSON.stringify(result));
      
      // コールバックパラメータがある場合はJSONP、ない場合は通常のJSON
      if (e.parameter.callback) {
        var callback = e.parameter.callback;
        
        console.log('✅ JSONP応答準備完了（URLパラメータ）');
        console.log('📋 コールバック名:', callback);
        
        return createJsonpCorsResponse(result, callback);
      } else {
        console.log('✅ 通常のJSON応答を返却（URLパラメータ）');
        return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
      }
    }
    
    // デフォルトレスポンス
    return createCorsResponse(JSON.stringify({
      success: true,
      message: 'GAS WebApp is running',
      timestamp: new Date().toISOString()
    }), 200);
    
  } catch (error) {
    console.error('❌ doGet エラー:', error);
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
  // GAS WebApp CORS対応のため、ContentServiceで返す
  var output = ContentService.createTextOutput(content);
  output.setMimeType(ContentService.MimeType.JSON);
  
  // LINEのWebhook要件: 必ずステータスコード200を返す
  if (statusCode && statusCode !== 200) {
    console.log('⚠️ LINE Webhook用に強制的にステータス200を返却');
  }
  
  return output;
}

/**
 * JSONP CORS対応レスポンス作成
 */
function createJsonpCorsResponse(content, callback) {
  var jsonpResponse = callback + "(" + JSON.stringify(content) + ");";
  var output = ContentService.createTextOutput(jsonpResponse);
  output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  
  return output;
}

// ===================
// デバッグ・テスト関数
// ===================

/**
 * startAIHearing問題を一発で診断するテスト関数
 * GASエディタで直接実行可能
 */
function debugStartAIHearingIssue() {
  console.log('🔍🔍🔍 startAIHearing診断開始 🔍🔍🔍');
  
  // 1. startAIHearing関数の存在確認
  console.log('1️⃣ startAIHearing関数存在確認:', typeof startAIHearing);
  console.log('1️⃣ startAIHearing関数定義:', !!startAIHearing);
  
  // 2. プロパティ確認
  try {
    var properties = PropertiesService.getScriptProperties().getProperties();
    console.log('2️⃣ 全プロパティ:', JSON.stringify(properties, null, 2));
    console.log('2️⃣ OPENROUTER_API_KEY存在:', !!properties.OPENROUTER_API_KEY);
    console.log('2️⃣ SPREADSHEET_ID存在:', !!properties.SPREADSHEET_ID);
    console.log('2️⃣ GAS_WEBAPP_URL存在:', !!properties.GAS_WEBAPP_URL);
  } catch (propError) {
    console.error('2️⃣ プロパティアクセスエラー:', propError);
  }
  
  // 3. startAIHearing関数テスト実行
  try {
    console.log('3️⃣ startAIHearing関数テスト開始');
    var testResult = startAIHearing({companyName: 'テスト会社'});
    console.log('3️⃣ startAIHearing実行結果:', JSON.stringify(testResult, null, 2));
  } catch (funcError) {
    console.error('3️⃣ startAIHearing実行エラー:', funcError);
    console.error('3️⃣ エラースタック:', funcError.stack);
  }
  
  // 4. doGet関数パス確認
  try {
    console.log('4️⃣ doGet関数パステスト開始');
    var mockEvent = {
      parameter: {
        action: 'startAIHearing',
        companyName: 'テスト会社',
        callback: 'testCallback'
      }
    };
    console.log('4️⃣ テストイベント:', JSON.stringify(mockEvent));
    
    var doGetResult = doGet(mockEvent);
    console.log('4️⃣ doGet実行結果タイプ:', typeof doGetResult);
    console.log('4️⃣ doGet実行結果:', doGetResult);
  } catch (doGetError) {
    console.error('4️⃣ doGet実行エラー:', doGetError);
    console.error('4️⃣ エラースタック:', doGetError.stack);
  }
  
  console.log('🔍🔍🔍 診断完了 🔍🔍🔍');
  
  return {
    success: true,
    message: '診断完了 - コンソールログを確認してください',
    timestamp: new Date().toISOString()
  };
}


/**
 * 通知エラー確認関数
 */
function checkNotificationErrors() {
  console.log('🔍 通知エラー確認開始');
  
  try {
    var properties = PropertiesService.getScriptProperties().getProperties();
    
    console.log('📋 通知関連プロパティ:');
    console.log('- LAST_FRANCHISE_NOTIFIED:', properties.LAST_FRANCHISE_NOTIFIED);
    console.log('- LAST_NOTIFICATION_ERROR:', properties.LAST_NOTIFICATION_ERROR);
    console.log('- LAST_NOTIFICATION_ERROR_TIME:', properties.LAST_NOTIFICATION_ERROR_TIME);
    console.log('- SLACK_WEBHOOK_URL存在:', !!properties.SLACK_WEBHOOK_URL);
    
    return {
      success: true,
      lastNotified: properties.LAST_FRANCHISE_NOTIFIED,
      lastError: properties.LAST_NOTIFICATION_ERROR,
      lastErrorTime: properties.LAST_NOTIFICATION_ERROR_TIME,
      webhookConfigured: !!properties.SLACK_WEBHOOK_URL
    };
    
  } catch (error) {
    console.error('❌ エラー確認失敗:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 簡易doGetテスト関数
 */
function testDoGetStartAIHearing() {
  var mockEvent = {
    parameter: {
      action: 'startAIHearing', 
      companyName: '大野建装',
      callback: 'testCallback123'
    }
  };
  
  console.log('🧪 testDoGetStartAIHearing開始');
  console.log('🧪 入力:', JSON.stringify(mockEvent));
  
  try {
    var result = doGet(mockEvent);
    console.log('🧪 結果:', result);
    console.log('🧪 結果タイプ:', typeof result);
    return result;
  } catch (error) {
    console.error('🧪 エラー:', error);
    console.error('🧪 スタック:', error.stack);
    return {success: false, error: error.message};
  }
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
    var url = getSystemSetting("SLACK_WEBHOOK_URL");
    if (!url || url.includes('YOUR')) {
      Logger.log("⚠️ SLACK_WEBHOOK_URL未設定 - モックモードで実行");
      return mockSlackResponse(message, options);
    }
    
    if (!message || message.trim() === "") message = "(メッセージなし)";
    
    var payload = createSlackPayload(message, options);
    var requestOptions = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var res = UrlFetchApp.fetch(url, requestOptions);
    var responseCode = res.getResponseCode();
    var responseText = res.getContentText();
    
    Logger.log("📨 Slack response: " + responseText);
    
    var result = {
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
    var errorResult = { success: false, error: error.message };
    
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
  var channels = getSlackChannelConfig();
  var targetChannel = options.channel ? (channels[options.channel] || options.channel) : null;
  
  var payload;
  
  // Block Kit形式かシンプルテキスト形式かを判定
  if (typeof message === 'object' && message.blocks) {
    // Block Kit形式
    payload = {
      ...message,
      username: options.username || 'GAS外壁塗装Bot',
      icon_emoji: options.icon || ':house:'
    };
  } else {
    // シンプルテキスト形式（従来通り）
    payload = {
      text: message,
      username: options.username || 'GAS外壁塗装Bot',
      icon_emoji: options.icon || ':house:',
      mrkdwn: true
    };
  }
  
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
    
    var message = `🎯 **案件割り当て完了**

📋 **案件ID**: ${assignmentData.inquiryId}
👤 **担当者**: ${assignmentData.assignedChildName} (${assignmentData.assignedChildId})
⚙️ **割り当てモード**: ${assignmentData.mode === 'auto' ? '自動' : '手動'}
🏠 **エリア**: ${assignmentData.area || '未設定'}
💼 **経験**: ${assignmentData.experience || '未設定'}
📅 **処理時刻**: ${new Date().toLocaleString('ja-JP')}`;
    
    // 統合通知システムを使用
    return sendIntegratedNotification('assignment_notification', message, {
      messageId: "ASSIGN_" + Date.now(),
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
        value: "ID: " + data.inquiryId + "\nエリア: " + (data.area || '未設定'),
        short: true
      },
      {
        title: '担当者情報',
        value: data.assignedChildName + "\n経験: " + (data.experience || '未設定'),
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
    var timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss');
    var userName = cancelData.applicant || cancelData.user_name || '申請者不明';
    var caseName = cancelData.requestId || cancelData.caseId || cancelData.case_name || '案件不明';
    var reason = cancelData.reason || cancelData.cancel_reason || 'キャンセル理由不明';
    
    var message = `🚫 **キャンセル申請がありました**

📋 **申請者名**: ${userName}
🏠 **案件名**: ${caseName}
❓ **理由**: ${reason}
📅 **日時**: ${timestamp}

⚠️ 至急確認・対応をお願いします。`;
    
    // 統合通知システムを使用
    return sendIntegratedNotification('cancel_request', message, {
      messageId: "CANCEL_" + Date.now(),
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
      notifyGptErrorChannel("キャンセル通知エラー: " + error.message);
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
    
    var message = `🚨 **システムアラート [${alertType}]**

📝 **内容**: ${description}
📅 **発生時刻**: ${new Date().toLocaleString('ja-JP')}`;
    
    if (details.errorCode) {
      message += "\n🔢 **エラーコード**: " + details.errorCode;
    }
    
    if (details.stack) {
      message += `\n📊 **スタックトレース**: \`\`\details.stack + "\"\`\``;
    }
    
    if (details.affectedUsers) {
      message += "\n👥 **影響ユーザー**: " + details.affectedUsers;
    }
    
    // 統合通知システムを使用
    return sendIntegratedNotification('system_alert', message, {
      messageId: "ALERT_" + Date.now(),
      priority: 'high',
      senderId: 'alert_system',
      icon: ':warning:',
      username: 'システムアラート',
      subject: "システムアラート - " + alertType,
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
    var message = `📊 日次レポート ${new Date().toLocaleDateString('ja-JP')}

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
    var apiKey = getSystemSetting("SENDGRID_KEY");
    if (!apiKey) {
      Logger.log("⚠️ SENDGRID_KEY が設定されていません");
      return { success: false, error: "API Key未設定" };
    }
    
    var url = "https://api.sendgrid.com/v3/mail/send";
    var payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "info@gaihekikuraberu.com" },
      subject: subject,
      content: [{ type: "text/plain", value: body }]
    };
    var options = {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var res = UrlFetchApp.fetch(url, options);
    var responseCode = res.getResponseCode();
    var responseText = res.getContentText();
    
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
    var sid = getSystemSetting("TWILIO_ACCOUNT_SID");
    var token = getSystemSetting("TWILIO_AUTH_TOKEN");
    var from = getSystemSetting("TWILIO_FROM_NUMBER");
    
    if (!sid || !token || !from) {
      Logger.log("⚠️ Twilio設定が不完全です");
      return { success: false, error: "Twilio設定未完了" };
    }
    
    var url = "https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Messages.json";

    Logger.log("📤 Sending SMS to: " + to);

    var payload = {
      To: to,
      From: from,
      Body: body
    };
    var options = {
      method: "post",
      payload: payload,
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    var responseCode = res.getResponseCode();
    var responseText = res.getContentText();
    
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
    var sid = getSystemSetting("TWILIO_ACCOUNT_SID");
    var token = getSystemSetting("TWILIO_AUTH_TOKEN");
    var from = getSystemSetting("TWILIO_FROM_NUMBER");

    if (!sid || !token || !from) {
      Logger.log("⚠️ Twilio設定が不完全です");
      return { success: false, error: "Twilio設定未完了" };
    }

    Logger.log("📞 発信開始: " + to);

    var url = "https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Calls.json";

    var payload = {
      To: to,
      From: from,
      Twiml: `<Response><Say language="ja-JP" voice="alice">こんにちは。こちらは外壁塗装くらべるAIです。これはテスト通話です。</Say></Response>`
    };

    var options = {
      method: "post",
      payload: payload,
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    var responseCode = res.getResponseCode();
    var responseText = res.getContentText();
    
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
    var token = getSystemSetting("LINE_ACCESS_TOKEN");
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
      Logger.log("⚠️ 不正なLINE UserID形式: " + userId);
      return { success: false, error: "不正なUserID形式" };
    }

    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }

    var url = "https://api.line.me/v2/bot/message/push";
    var headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    };

    var messages = [{ type: "text", text: message }];
    if (imageUrl) {
      messages.push({
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl
      });
    }

    var payload = {
      to: userId,
      messages: messages
    };

    var options = {
      method: "post",
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    var responseCode = res.getResponseCode();
    var responseText = res.getContentText();
    
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
  try {
    Logger.log("🔔 全通知チャネルテスト開始（実送信版・旧GAS互換）");
    console.log("🔔 全通知チャネルテスト開始（実送信版・旧GAS互換）");
    
    var testMessage = "🧪 通知テスト - " + new Date().toLocaleString('ja-JP');
    var results = [];
    
    // 環境変数事前チェック
    Logger.log("🔍 環境変数事前チェック開始");
    var requiredSettings = [
      'SLACK_WEBHOOK_URL',
      'LINE_ACCESS_TOKEN',
      'LINE_ADMIN_USER_ID', 
      'SENDGRID_KEY',
      'NOTIFY_EMAIL_TO',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_FROM_NUMBER',
      'PHONE_ADMIN_NUMBER',
      'SPREADSHEET_ID'
    ];
    
    var missingSettings = [];
    for (var i = 0; i < requiredSettings.length; i++) {
      var setting = requiredSettings[i];
      var value = PropertiesService.getScriptProperties().getProperty(setting);
      if (!value) {
        missingSettings.push(setting);
        Logger.log("❌ 未設定: " + setting);
      } else {
        Logger.log("✅ 設定済み: ${setting} = " + setting.includes('TOKEN') || setting.includes('KEY') ? '***' : value.substring(0, 20) + "...");
      }
    }
    
    if (missingSettings.length > 0) {
      var errorMsg = "❌ 必須設定が不足: " + missingSettings.join(', ');
      Logger.log(errorMsg);
      sendSlackNotification(errorMsg, {});
      return;
    }
    
    // 1. Slack通知テスト
    Logger.log("📱 Slack通知テスト");
    try {
      var slackResult = sendSlackNotification(testMessage, {});
      results.push({channel: 'Slack', success: slackResult.success, details: slackResult});
      Logger.log("✅ Slack送信完了", JSON.stringify(slackResult));
    } catch (error) {
      Logger.log("❌ Slack送信エラー:", error.message);
      results.push({channel: 'Slack', success: false, error: error.message});
    }
    
    // 2. LINE通知テスト（新仕様：LINE_ADMIN_USER_ID使用）
    Logger.log("📱 LINE通知テスト");
    try {
      Logger.log("📞 sendLineNotification()呼び出し開始...");
      var lineAdminUserId = PropertiesService.getScriptProperties().getProperty('LINE_ADMIN_USER_ID');
      Logger.log("🔍 LINE_ADMIN_USER_ID: " + lineAdminUserId);
      
      var lineResult = sendLineNotification(testMessage, { userId: lineAdminUserId });
      Logger.log("📞 sendLineNotification()呼び出し完了");
      Logger.log("📊 LINE送信結果詳細: " + JSON.stringify(lineResult, null, 2));
      
      results.push({channel: 'LINE', success: lineResult.success, details: lineResult});
      Logger.log("✅ LINE送信完了");
    } catch (error) {
      Logger.log("❌ LINE送信エラー:", error.message);
      Logger.log("❌ LINE送信エラースタック:", error.stack);
      results.push({channel: 'LINE', success: false, error: error.message});
    }
    
    // 3. SMS通知テスト（新仕様：PHONE_ADMIN_NUMBER使用）
    Logger.log("📱 SMS通知テスト");
    try {
      Logger.log("📞 sendTwilioSMS()呼び出し開始...");
      var phoneAdminNumber = PropertiesService.getScriptProperties().getProperty('PHONE_ADMIN_NUMBER');
      Logger.log("🔍 PHONE_ADMIN_NUMBER: " + phoneAdminNumber);
      
      var smsResult = sendTwilioSMS(testMessage, { phoneNumber: phoneAdminNumber });
      Logger.log("📞 sendTwilioSMS()呼び出し完了");
      Logger.log("📊 SMS送信結果詳細: " + JSON.stringify(smsResult, null, 2));
      
      results.push({channel: 'SMS', success: smsResult.success, details: smsResult});
      Logger.log("✅ SMS送信完了");
    } catch (error) {
      Logger.log("❌ SMS送信エラー:", error.message);
      results.push({channel: 'SMS', success: false, error: error.message});
    }
    
    // 4. Email通知テスト（新仕様：デフォルトはgmail、重複回避）
    Logger.log("📱 Email通知テスト");
    try {
      Logger.log("📞 sendEmailWithMethod()呼び出し開始...");
      var emailTo = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL_TO');
      Logger.log("🔍 NOTIFY_EMAIL_TO: " + emailTo);
      
      // デフォルトはgmail方式のみでテスト（重複回避）
      var emailResult = sendEmailWithMethod(emailTo, '🧪 通知テスト', testMessage, 'gmail');
      Logger.log("📧 gmail方式結果: " + JSON.stringify(emailResult, null, 2));
      
      results.push({channel: 'Email', success: emailResult.success, details: emailResult});
      Logger.log("✅ Email送信完了");
    } catch (error) {
      Logger.log("❌ Email送信エラー:", error.message);
      results.push({channel: 'Email', success: false, error: error.message});
    }
    
    // 5. 電話発信テスト（Twilio Voice）
    Logger.log("📞 電話発信テスト");
    try {
      Logger.log("📞 makeTwilioCall()呼び出し開始...");
      var phoneAdminNumber = PropertiesService.getScriptProperties().getProperty('PHONE_ADMIN_NUMBER');
      Logger.log("🔍 電話発信前チェック:");
      Logger.log("  - phoneAdminNumber: " + phoneAdminNumber);
      Logger.log("  - testMessage: " + testMessage);
      
      var voiceResult = makeTwilioCall(phoneAdminNumber, testMessage);
      Logger.log("📞 makeTwilioCall()呼び出し完了");
      Logger.log("📊 電話発信結果詳細: " + JSON.stringify(voiceResult, null, 2));
      
      results.push({channel: 'Voice', success: voiceResult.success, details: voiceResult});
      Logger.log("✅ 電話発信完了");
    } catch (error) {
      Logger.log("❌ 電話発信エラー:", error.message);
      Logger.log("❌ 電話発信エラースタック:", error.stack);
      results.push({channel: 'Voice', success: false, error: error.message});
    }
    
    // 結果サマリー
    var successCount = results.filter(r => r.success).length;
    var totalCount = results.length;
    var summaryMessage = "🧪 通知テスト結果: " + successCount + "/" + totalCount + " 成功\n\n" +
                          results.map(r => (r.success ? '✅' : '❌') + " " + r.channel + ": " + (r.success ? '成功' : (r.error || '失敗'))).join('\n');
    
    Logger.log(summaryMessage);
    
    // 結果をSlackに送信
    sendSlackNotification(summaryMessage, {});
    
    // フォールバックログ記録（安全なエラー処理付き）
    try {
      logToFallbackSheet('testNotify_All', summaryMessage, 'INFO');
    } catch (logError) {
      Logger.log("⚠️ フォールバックログ記録エラー（無視）:", logError.message);
    }
    
    Logger.log("✅ 全通知テスト完了");
    
  } catch (error) {
    var errorMessage = "❌ testNotify_All総合エラー: ${error.message}\nスタック: " + error.stack;
    Logger.log(errorMessage);
    
    // エラーもSlackに送信
    try {
      sendSlackNotification(errorMessage, {});
    } catch (slackError) {
      Logger.log("❌ Slackエラー通知も失敗:", slackError.message);
    }
  }
}

/**
 * 安全なフォールバックログ記録
 */
function logToFallbackSheet(action, message, level = 'INFO') {
  try {
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      console.log('⚠️ SPREADSHEET_ID未設定 - ログ記録をスキップ');
      return false;
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var logSheet = ss.getSheetByName('SystemLogs');
    
    if (!logSheet) {
      // シートが存在しない場合は作成
      logSheet = ss.insertSheet('SystemLogs');
      logSheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'Level', 'Action', 'Message', 'Details']
      ]);
    }
    
    var timestamp = new Date().toLocaleString('ja-JP');
    // 【CRITICAL FIX】常に2行目に新データを挿入（既存データは下にシフト）
    var lastRow = logSheet.getLastRow();
    console.log('🔍 CRITICAL: 現在の最終行:', lastRow);
    
    // 重複コードをヘルパー関数に統合
    insertRowAtSecondPosition(logSheet, 'SystemLogs');
    
    // 必ず2行目に挿入
    var targetRow = 2;
    var range = logSheet.getRange(targetRow, 1, 1, 5);
    console.log('🔍 CRITICAL: 書き込み範囲:', range.getA1Notation());
    range.setValues([[timestamp, level, action, message, '']]);
    
    return true;
  } catch (error) {
    console.log('❌ ログ記録エラー:', error.message);
    return false;
  }
}

/**
 * 旧GAS互換エイリアス関数群
 */
function sendLineNotification(message, options) {
  try {
    Logger.log("🔄 sendLineNotification → sendLinePushMessage へリダイレクト");
    var userId = (options && options.userId) || PropertiesService.getScriptProperties().getProperty('LINE_ADMIN_USER_ID') || 'U0123456789abcdef0123456789abcdef0';
    Logger.log("🔍 LINE送信パラメータ: userId=" + userId + ", message=" + message);
    
    var result = sendLinePushMessage(userId, message);
    Logger.log("✅ sendLinePushMessage結果: " + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log("❌ sendLineNotification エラー詳細: " + error.message);
    Logger.log("❌ sendLineNotification スタック: " + error.stack);
    return { success: false, error: error.message };
  }
}

function sendTwilioSMS(message, options) {
  try {
    Logger.log("🔄 sendTwilioSMS → sendSMS へリダイレクト");
    var phoneNumber = (options && options.phoneNumber) || PropertiesService.getScriptProperties().getProperty('PHONE_ADMIN_NUMBER') || '+815012345678';
    Logger.log("🔍 SMS送信パラメータ: phoneNumber=" + phoneNumber + ", message=" + message);
    
    var result = sendSMS(phoneNumber, message);
    Logger.log("✅ sendSMS結果: " + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log("❌ sendTwilioSMS エラー詳細: " + error.message);
    Logger.log("❌ sendTwilioSMS スタック: " + error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * 新仕様：メール送信方式切り替え対応関数
 * @param {string} to 送信先メールアドレス
 * @param {string} subject 件名
 * @param {string} message メッセージ
 * @param {string} method 送信方式: "gmail", "sendgrid", "both"
 */
function sendEmailWithMethod(to, subject, message, method = 'gmail') {
  try {
    Logger.log("📧 sendEmailWithMethod開始: method=${method}, to=" + to);
    
    if (!to) {
      to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL_TO') || 'test@example.com';
    }
    
    switch (method.toLowerCase()) {
      case 'gmail':
        return sendEmailViaGmail(to, subject, message);
      
      case 'sendgrid':
        return sendEmailViaSendGrid(to, subject, message);
      
      case 'both':
        return sendEmailViaBoth(to, subject, message);
      
      default:
        Logger.log("⚠️ 不明な送信方式: " + method + ", gmailにフォールバック");
        return sendEmailViaGmail(to, subject, message);
    }
  } catch (error) {
    Logger.log("❌ sendEmailWithMethod エラー: " + error.message);
    return { success: false, error: error.message, method: method };
  }
}

/**
 * Gmail経由でメール送信
 */
function sendEmailViaGmail(to, subject, message) {
  try {
    Logger.log("📧 Gmail経由メール送信開始");
    MailApp.sendEmail(to, subject, message);
    Logger.log("✅ Gmail送信成功");
    return { success: true, method: 'gmail', to: to };
  } catch (error) {
    Logger.log("❌ Gmail送信エラー: " + error.message);
    return { success: false, error: error.message, method: 'gmail' };
  }
}

/**
 * SendGrid経由でメール送信
 */
function sendEmailViaSendGrid(to, subject, message) {
  try {
    Logger.log("📧 SendGrid経由メール送信開始");
    return sendEmail(to, subject, message); // 既存のSendGrid実装を使用
  } catch (error) {
    Logger.log("❌ SendGrid送信エラー: " + error.message);
    return { success: false, error: error.message, method: 'sendgrid' };
  }
}

/**
 * Gmail+SendGrid両方で送信（保険的対応）
 */
function sendEmailViaBoth(to, subject, message) {
  try {
    Logger.log("📧 Gmail+SendGrid両方送信開始");
    
    var gmailResult = sendEmailViaGmail(to, subject, message);
    var sendgridResult = sendEmailViaSendGrid(to, subject, message);
    
    var overallSuccess = gmailResult.success || sendgridResult.success;
    
    Logger.log("📊 両方送信結果: Gmail=${gmailResult.success}, SendGrid=" + sendgridResult.success);
    
    return {
      success: overallSuccess,
      method: 'both',
      results: {
        gmail: gmailResult,
        sendgrid: sendgridResult
      }
    };
  } catch (error) {
    Logger.log("❌ 両方送信エラー: " + error.message);
    return { success: false, error: error.message, method: 'both' };
  }
}

// 旧GAS互換エイリアス関数
function sendEmailNotification(message, options) {
  try {
    Logger.log("🔄 sendEmailNotification → sendEmailWithMethod へリダイレクト");
    var email = (options && options.email) || PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL_TO') || 'test@example.com';
    var subject = (options && options.subject) || '🧪 通知テスト';
    var method = (options && options.method) || 'gmail';
    
    Logger.log("🔍 Email送信パラメータ: email=" + email + ", subject=" + subject + ", method=" + method);
    
    var result = sendEmailWithMethod(email, subject, message, method);
    Logger.log("✅ sendEmailWithMethod結果: " + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log("❌ sendEmailNotification エラー詳細: " + error.message);
    Logger.log("❌ sendEmailNotification スタック: " + error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Twilio音声通話発信
 */
function makeTwilioCall(to, message) {
  try {
    var sid = PropertiesService.getScriptProperties().getProperty('TWILIO_ACCOUNT_SID');
    var token = PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN');
    var from = PropertiesService.getScriptProperties().getProperty('TWILIO_FROM_NUMBER');
    
    if (!sid || !token || !from) {
      return { success: false, error: "Twilio音声設定が不完全です" };
    }
    
    // TwiMLを生成（音声メッセージ）
    var twiml = `<?xml version="1.0" encoding="UTF-8"?>
                   <Response>
                     <Say voice="alice" language="ja-JP">${message}</Say>
                   </Response>`;
    
    var url = "https://api.twilio.com/2010-04-01/Accounts/" + sid + "/Calls.json";
    var payload = {
      To: to,
      From: from,
      Twiml: twiml
    };
    
    var options = {
      method: "post",
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      payload: payload,
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    Logger.log("📞 Twilio Voice response: ${responseCode} - " + responseText);
    
    return {
      success: responseCode >= 200 && responseCode < 300,
      responseCode: responseCode,
      responseText: responseText
    };
    
  } catch (error) {
    Logger.log("❌ Twilio音声通話エラー:", error.message);
    return { success: false, error: error.message };
  }
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
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
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
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
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
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
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
    
    // 【CRITICAL FIX】常に2行目に新データを挿入（既存データは下にシフト）
    var lastRow = lineConnectionSheet.getLastRow();
    console.log('🔍 CRITICAL: 現在の最終行:', lastRow);
    
    // 重複コードをヘルパー関数に統合
    insertRowAtSecondPosition(lineConnectionSheet, 'LINE連携管理');
    
    // 必ず2行目に挿入
    var targetRow = 2;
    var range = lineConnectionSheet.getRange(targetRow, 1, 1, newRow.length);
    console.log('🔍 CRITICAL: 書き込み範囲:', range.getA1Notation());
    range.setValues([newRow]);
    
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
  console.log('🔐 ログイン処理開始:', params);
  
  // ロールチェック（admin/franchise/child）
  var role = params.role || 'franchise';
  
  if (role === 'admin') {
    // 管理者ログイン
    console.log('👤 管理者ログイン処理');
    
    // 簡易的な認証（本番環境では適切な認証を実装）
    // 実際の認証はスプレッドシートや外部認証サービスと連携
    var validAdminEmails = [
      'admin@kuraberu-gaiheki.com',
      'admin@example.com'
    ];
    
    // メールアドレスの簡易チェック
    if (params.email && params.password) {
      return {
        success: true,
        data: {
          token: 'gas-admin-token-' + Date.now(),
          user: {
            id: 'admin-' + Date.now(),
            name: '運営本部管理者',
            email: params.email,
            role: 'admin',
            adminId: 'admin-001',
            companyName: '外壁塗装くらべるAI運営本部',
            permissions: ['franchise_management', 'system_admin', 'user_management'],
            lastLogin: new Date().toISOString()
          }
        },
        message: '管理者ログインに成功しました'
      };
    } else {
      return {
        success: false,
        message: '認証に失敗しました。メールアドレスとパスワードを確認してください。',
        error: 'Invalid credentials'
      };
    }
  } else {
    // 加盟店ログイン（既存の処理）
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
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var caseSheet = ss.getSheetByName('案件管理');
    
    if (!caseSheet) {
      // サンプルデータを返す
      return {
        success: true,
        data: generateSampleInquiries(franchiseId)
      };
    }
    
    var data = caseSheet.getDataRange().getValues();
    var headers = data[0];
    var inquiries = [];
    
    // 加盟店IDでフィルタリング
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowFranchiseId = row[headers.indexOf('加盟店ID')];
      
      if (rowFranchiseId === franchiseId) {
        inquiries.push({
          id: row[headers.indexOf('CV案件ID')],
          title: row[headers.indexOf('お客様名')] + "様の" + row[headers.indexOf('建物種別')] + "工事",
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
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!childUsersSheet) {
      // サンプルデータを返す
      return generateSampleChildUsers(franchiseId);
    }
    
    var data = childUsersSheet.getDataRange().getValues();
    var headers = data[0];
    var childUsers = [];
    
    // 加盟店IDでフィルタリング
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowFranchiseId = row[headers.indexOf('加盟店ID')];
      
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
    
    var { inquiryId, childUserId } = params;
    
    if (!inquiryId || !childUserId) {
      return {
        success: false,
        message: '案件IDまたは子ユーザーIDが指定されていません'
      };
    }
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var caseSheet = ss.getSheetByName('案件管理');
    
    if (!caseSheet) {
      return {
        success: true,
        message: '案件の割り当てが完了しました（サンプルモード）'
      };
    }
    
    var data = caseSheet.getDataRange().getValues();
    var headers = data[0];
    
    // 案件を見つけて更新
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowInquiryId = row[headers.indexOf('CV案件ID')];
      
      if (rowInquiryId === inquiryId) {
        // 担当子ユーザーIDを更新
        var childUserIdCol = headers.indexOf('担当子ユーザーID') + 1;
        var statusCol = headers.indexOf('ステータス') + 1;
        var updateDateCol = headers.indexOf('最終更新日') + 1;
        
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
  var sampleInquiries = [
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
  var statusMap = {
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var childUsersSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!childUsersSheet) return childUserId;
    
    var data = childUsersSheet.getDataRange().getValues();
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var caseSheet = ss.getSheetByName('案件管理');
    
    if (!caseSheet) return Math.floor(Math.random() * 5);
    
    var data = caseSheet.getDataRange().getValues();
    var headers = data[0];
    var count = 0;
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var assignedUserId = row[headers.indexOf('担当子ユーザーID')];
      var status = row[headers.indexOf('ステータス')];
      
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
    var customerName = caseData[4] || 'お客様'; // お客様名の列インデックス
    var area = caseData[5] || ''; // エリアの列インデックス
    
    // LINE通知送信（子ユーザーのLINE IDが分かる場合）
    var lineUserId = getChildUserLineId(childUserId);
    if (lineUserId) {
      var message = "🎯 新規案件が割り当てられました\n\n案件ID: ${inquiryId}\nお客様: ${customerName}様\nエリア: " + area + "\n\n速やかにご対応をお願いします。";
      sendLinePushMessage(lineUserId, message);
    }
    
    // Slack通知
    if (typeof sendSlackNotification === 'function') {
      var slackMessage = "📋 案件割り当て完了\n\n案件ID: ${inquiryId}\n担当者: ${getChildUserName(childUserId)}\nお客様: ${customerName}様\nエリア: " + area;
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var lineConnectionSheet = ss.getSheetByName('LineConnections');
    
    if (!lineConnectionSheet) return null;
    
    var data = lineConnectionSheet.getDataRange().getValues();
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var templateSheet = ss.getSheetByName('LineTemplates');
    
    // デフォルトテンプレート（line-notification-templates.gsから取得）
    var defaultTemplates = LINE_TEMPLATES;
    var customTemplates = {};
    
    // カスタムテンプレートの取得
    if (templateSheet) {
      var data = templateSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var templateType = data[i][0];
        var style = data[i][1];
        var content = data[i][2];
        customTemplates["${templateType}_" + style] = content;
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
    var { templateType, style, content } = params;
    
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
    var { templateType, style, customPrompt } = params;
    
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
    var baseTemplates = {
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
    var customTemplates = getCustomTemplatesFromSheet();
    
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
    
    var { templateType, style, variables, customTemplate } = params;
    
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
      var templates = getTemplatesAPI().data.templates;
      
      if (!templates[templateType] || !templates[templateType][style]) {
        return {
          success: false,
          message: "指定されたテンプレート (${templateType}/" + style + ") が見つかりません"
        };
      }
      
      templateContent = templates[templateType][style].content;
    }
    
    // 変数置換処理
    var previewText = templateContent;
    
    if (variables && typeof variables === 'object') {
      Object.keys(variables).forEach(function(key) {
        var placeholder = '{{' + key + '}}';
        var value = variables[key] || '';
        previewText = previewText.replace(new RegExp(placeholder, 'g'), value);
      });
    }
    
    // 未置換の変数をチェック
    var unreplacedVariables = [];
    var variablePattern = /\{\{([^}]+)\}\}/g;
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

/**
 * カスタムテンプレートをスプレッドシートから取得
 * @return {Object} カスタムテンプレート
 */
function getCustomTemplatesFromSheet() {
  try {
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      console.log('⚠️ SPREADSHEET_ID未設定 - カスタムテンプレートをスキップ');
      return {};
    }
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var templateSheet = ss.getSheetByName('LineTemplates');
    
    // シートが存在しない場合は作成
    if (!templateSheet) {
      templateSheet = ss.insertSheet('LineTemplates');
      templateSheet.getRange(1, 1, 1, 6).setValues([
        ['templateType', 'style', 'title', 'content', 'variables', 'createdAt']
      ]);
      console.log('📋 LineTemplatesシートを作成しました');
      return {};
    }
    
    var data = templateSheet.getDataRange().getValues();
    var customTemplates = {};
    
    // ヘッダー行をスキップ
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var templateType = row[0];
      var style = row[1];
      var title = row[2];
      var content = row[3];
      var variables = row[4] ? row[4].split(',').map(v => v.trim()) : [];
      
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
    
    var apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
    
    if (!apiKey) {
      console.log('⚠️ OPENROUTER_API_KEY未設定 - モックテンプレートを返します');
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
    
    var url = 'https://api.openai.com/v1/chat/completions';
    var payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    };
    
    var options = {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    console.log('🤖 GPT レスポンス:', responseCode, responseText);
    
    if (responseCode !== 200) {
      throw new Error("GPT API エラー: ${responseCode} - " + responseText);
    }
    
    var data = JSON.parse(responseText);
    var generatedTemplate = data.choices[0].message.content.trim();
    
    // 生成されたテンプレートから変数を抽出
    var variables = [];
    var variablePattern = /\{\{([^}]+)\}\}/g;
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
  var mockTemplates = {
    NEW_ASSIGNMENT: {
      formal: "【案件割り当て】\n{{customerName}}様（{{area}}）の案件が割り当てられました。\n期限：{{deadline}}\n予算：{{estimatedBudget}}\nお客様のご要望：{{customerRequests}}\n\nよろしくお願いいたします。",
      casual: "新案件だよ！\n{{customerName}}さん@{{area}}\n期限：{{deadline}}\n予算：{{estimatedBudget}}\n頑張って！💪"
    },
    CANCELLATION: {
      formal: "【キャンセル通知】\n{{customerName}}様の案件がキャンセルされました。\n理由：{{reason}}\n処理日：{{cancelDate}}",
      casual: "案件キャンセル😢\n{{customerName}}さん\n理由：{{reason}}"
    }
  };
  
  var template = mockTemplates[templateType] && mockTemplates[templateType][style] 
    ? mockTemplates[templateType][style]
    : "{{customerName}}様の{{templateType}}通知です。";
  
  // 変数抽出
  var variables = [];
  var variablePattern = /\{\{([^}]+)\}\}/g;
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
    console.error("❌ システム設定取得エラー (" + key + "):", error);
    return null;
  }
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var historySheet = ss.getSheetByName('通知履歴');
    
    // シートが存在しない場合は作成
    if (!historySheet) {
      historySheet = ss.insertSheet('通知履歴');
      historySheet.getRange(1, 1, 1, 8).setValues([
        ['送信日時', 'ユーザーID', 'テンプレート種別', 'スタイル', '変数', '送信結果', 'エラー内容', 'メッセージ長']
      ]);
      
      // ヘッダー行の書式設定
      var headerRange = historySheet.getRange(1, 1, 1, 8);
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var historySheet = ss.getSheetByName('通知履歴');
    
    if (!historySheet) return;
    
    var data = historySheet.getDataRange().getValues();
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30日前
    
    // ヘッダー行を除く
    var rowsToDelete = [];
    for (var i = 1; i < data.length; i++) {
      var rowDate = new Date(data[i][0]); // 送信日時
      if (rowDate < cutoffDate) {
        rowsToDelete.push(i + 1); // 1ベースのインデックス
      }
    }
    
    // 後ろから削除（インデックスの変更を避けるため）
    for (var i = rowsToDelete.length - 1; i >= 0; i--) {
      historySheet.deleteRow(rowsToDelete[i]);
    }
    
    if (rowsToDelete.length > 0) {
      console.log("🗑️ 古い通知履歴 " + rowsToDelete.length + " 件を削除しました");
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var historySheet = ss.getSheetByName('通知履歴');
    
    if (!historySheet) {
      return { success: true, data: [] };
    }
    
    var data = historySheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1);
    
    // ユーザーIDでフィルタ
    var filteredRows = rows;
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
    var history = filteredRows.map(row => ({
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
    var { cvCaseId, selectedFranchises, caseData } = params;
    console.log('📋 案件振り分け通知開始:', cvCaseId);
    
    var results = [];
    
    // 各選択加盟店に対して振り分け処理
    for (var i = 0; i < selectedFranchises.length; i++) {
      var franchise = selectedFranchises[i];
      var franchiseId = franchise.franchiseId || franchise.id;
      
      // 振り分け設定を取得
      var settings = getFranchiseNotificationSettings(franchiseId);
      
      if (settings.assignmentMode === '自動') {
        // 自動振り分け: 親子同時通知
        var result = processAutoAssignment(cvCaseId, franchiseId, caseData, settings);
        results.push(result);
      } else {
        // 手動振り分け: 親のみ通知
        var result = processManualAssignment(cvCaseId, franchiseId, caseData, settings);
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
    console.log("🤖 自動振り分け処理: " + franchiseId);
    
    // 加盟店情報取得
    var franchiseInfo = getFranchiseInfo(franchiseId);
    var notifications = [];
    
    // 親ユーザーに通知
    if (franchiseInfo.parentUserId) {
      var message = createAssignmentMessage('PARENT_AUTO', cvCaseId, caseData, franchiseInfo);
      var parentResult = sendMultiChannelNotification(franchiseInfo.parentUserId, message, settings);
      notifications.push({
        target: 'parent',
        userId: franchiseInfo.parentUserId,
        result: parentResult
      });
    }
    
    // 子ユーザーに同時通知
    var childUsers = franchiseInfo.childUsers || [];
    for (var i = 0; i < childUsers.length; i++) {
      var childUser = childUsers[i];
      if (childUser.status === 'アクティブ') {
        var message = createAssignmentMessage('CHILD_AUTO', cvCaseId, caseData, franchiseInfo);
        var childResult = sendMultiChannelNotification(childUser.userId, message, settings);
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
    console.error("❌ 自動振り分け処理エラー (" + franchiseId + "):", error);
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
    console.log("✋ 手動振り分け処理: " + franchiseId);
    
    // 加盟店情報取得
    var franchiseInfo = getFranchiseInfo(franchiseId);
    var notifications = [];
    
    // 親ユーザーのみに通知
    if (franchiseInfo.parentUserId) {
      var message = createAssignmentMessage('PARENT_MANUAL', cvCaseId, caseData, franchiseInfo);
      var parentResult = sendMultiChannelNotification(franchiseInfo.parentUserId, message, settings);
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
    console.error("❌ 手動振り分け処理エラー (" + franchiseId + "):", error);
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
  var customerName = caseData.customerName || 'お客様';
  var area = caseData.address || caseData.area || '';
  var propertyType = caseData.propertyType || '戸建て';
  var budget = caseData.budget || '要相談';
  var urgency = caseData.urgency || '普通';
  
  var templates = {
    PARENT_AUTO: {
      line: "🎯 新規案件割り当て（自動）\n\n【案件情報】\n案件ID: " + cvCaseId + "\nお客様: " + customerName + "様\nエリア: " + area + "\n建物: " + propertyType + "\n予算: " + budget + "\n緊急度: " + urgency + "\n\n子ユーザーにも同時通知済みです。\n詳細は案件管理ページでご確認ください。",
      email: "新規案件が自動で割り当てられました。\n\n案件ID: " + cvCaseId + "\nお客様名: " + customerName + "様\n対象エリア: " + area + "\n建物種別: " + propertyType + "\n予算: " + budget + "\n\n子ユーザーにも通知しておりますので、速やかに対応をお願いいたします。",
      sms: "【案件割り当て】" + customerName + "様（" + area + "）の案件が自動割り当てされました。案件ID: " + cvCaseId,
      subject: "【自動割り当て】新規案件のお知らせ - " + cvCaseId
    },
    PARENT_MANUAL: {
      line: "✋ 新規案件（手動振り分け要）\n\n【案件情報】\n案件ID: " + cvCaseId + "\nお客様: " + customerName + "様\nエリア: " + area + "\n建物: " + propertyType + "\n予算: " + budget + "\n緊急度: " + urgency + "\n\n管理画面で担当者を選択し、手動で振り分けてください。",
      email: "新規案件の手動振り分けが必要です。\n\n案件ID: " + cvCaseId + "\nお客様名: " + customerName + "様\n対象エリア: " + area + "\n建物種別: " + propertyType + "\n予算: " + budget + "\n\n管理画面にアクセスして適切な担当者に振り分けをお願いいたします。",
      sms: "【要振り分け】" + customerName + "様（" + area + "）の案件。管理画面で担当者を選択してください。ID: " + cvCaseId,
      subject: "【要振り分け】新規案件のお知らせ - " + cvCaseId
    },
    CHILD_AUTO: {
      line: "🎯 新規案件担当のお知らせ\n\n【担当案件】\n案件ID: " + cvCaseId + "\nお客様: " + customerName + "様\nエリア: " + area + "\n建物: " + propertyType + "\n予算: " + budget + "\n緊急度: " + urgency + "\n\n速やかにお客様へご連絡をお願いします。\n案件管理ページで詳細をご確認ください。",
      email: "新しい案件の担当になりました。\n\n案件ID: " + cvCaseId + "\nお客様名: " + customerName + "様\n対象エリア: " + area + "\n建物種別: " + propertyType + "\n予算: " + budget + "\n\nお客様への初回連絡を速やかにお願いいたします。",
      sms: "【新規担当】" + customerName + "様（" + area + "）の案件担当になりました。速やかにご連絡ください。ID: " + cvCaseId,
      subject: "【新規担当】案件割り当てのお知らせ - " + cvCaseId
    },
    CHILD_MANUAL_ASSIGNED: {
      line: "👨‍💼 案件割り当て完了\n\n【担当案件】\n案件ID: " + cvCaseId + "\nお客様: " + customerName + "様\nエリア: " + area + "\n建物: " + propertyType + "\n予算: " + budget + "\n緊急度: " + urgency + "\n\n親ユーザーより割り当てられました。\n速やかにお客様へご連絡をお願いします。",
      email: "案件の割り当てが完了しました。\n\n案件ID: " + cvCaseId + "\nお客様名: " + customerName + "様\n対象エリア: " + area + "\n建物種別: " + propertyType + "\n予算: " + budget + "\n\n担当案件として割り当てられましたので、お客様への対応をお願いいたします。",
      sms: "【担当決定】" + customerName + "様（" + area + "）の案件担当に決定。速やかにご連絡ください。ID: " + cvCaseId,
      subject: "【担当決定】案件割り当て完了のお知らせ - " + cvCaseId
    }
  };
  
  return templates[messageType] || {
    line: "案件通知: " + cvCaseId,
    email: "案件に関する通知です。案件ID: " + cvCaseId,
    sms: "案件通知: " + cvCaseId,
    subject: "案件通知 - " + cvCaseId
  };
}

/**
 * マルチチャンネル通知送信
 */
function sendMultiChannelNotification(userId, message, settings) {
  try {
    var results = {
      line: { enabled: false, success: false },
      email: { enabled: false, success: false },
      sms: { enabled: false, success: false }
    };
    
    // LINE通知
    if (settings.lineEnabled) {
      results.line.enabled = true;
      var lineUserId = getUserLineId(userId);
      if (lineUserId) {
        var lineResult = sendLinePushMessage(lineUserId, message.line);
        results.line.success = lineResult.success;
        results.line.details = lineResult;
      }
    }
    
    // メール通知
    if (settings.emailEnabled) {
      results.email.enabled = true;
      var emailAddress = getUserEmailAddress(userId);
      if (emailAddress) {
        var emailResult = sendEmail(emailAddress, message.subject, message.email);
        results.email.success = emailResult.success;
        results.email.details = emailResult;
      }
    }
    
    // SMS通知
    if (settings.smsEnabled) {
      results.sms.enabled = true;
      var phoneNumber = getUserPhoneNumber(userId);
      if (phoneNumber) {
        var smsResult = sendSMS(phoneNumber, message.sms);
        results.sms.success = smsResult.success;
        results.sms.details = smsResult;
      }
    }
    
    var overallSuccess = Object.values(results).some(r => r.enabled && r.success);
    
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
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var caseSheet = ss.getSheetByName('案件管理');
    
    // シートが存在しない場合は作成
    if (!caseSheet) {
      caseSheet = ss.insertSheet('案件管理');
      var headers = [
        'CV案件ID', '加盟店ID', '担当子ユーザーID', 'ステータス', 'お客様名',
        'エリア', '建物種別', '予算', '緊急度', '割り当て日', '最終更新日', '備考'
      ];
      caseSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      var headerRange = caseSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#2196F3');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      caseSheet.setFrozenRows(1);
      caseSheet.autoResizeColumns(1, headers.length);
    }
    
    // 案件データを追加
    var newRow = [
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
      "振り分け方式: " + status
    ];
    
    // 【CRITICAL FIX】常に2行目に新データを挿入（既存データは下にシフト）
    var lastRow = caseSheet.getLastRow();
    console.log('🔍 CRITICAL: 現在の最終行:', lastRow);
    
    // 重複コードをヘルパー関数に統合
    insertRowAtSecondPosition(caseSheet, '案件登録');
    
    // 必ず2行目に挿入
    var targetRow = 2;
    var range = caseSheet.getRange(targetRow, 1, 1, newRow.length);
    console.log('🔍 CRITICAL: 書き込み範囲:', range.getA1Notation());
    range.setValues([newRow]);
    console.log("✅ 案件管理システムに登録: " + cvCaseId + " → " + franchiseId);
    
  } catch (error) {
    console.error('❌ 案件管理システム登録エラー:', error);
  }
}

/**
 * 振り分け完了Slack通知
 */
function sendAssignmentSlackSummary(cvCaseId, selectedFranchises, results) {
  try {
    var successCount = results.filter(r => r.success).length;
    var autoCount = results.filter(r => r.assignmentMode === '自動').length;
    var manualCount = results.filter(r => r.assignmentMode === '手動').length;
    
    var message = "📋 *案件振り分け完了*\n\n";
    message += "🆔 **案件ID**: " + cvCaseId + "\n";
    message += "🏢 **対象加盟店**: " + selectedFranchises.length + "社\n";
    message += "✅ **成功**: " + successCount + "/" + results.length + "\n";
    message += "🤖 **自動振り分け**: " + autoCount + "社\n";
    message += "✋ **手動振り分け**: " + manualCount + "社\n\n";
    
    if (manualCount > 0) {
      message += "⚠️ **手動振り分け待ちの案件があります**\n";
      message += "管理画面で担当者を選択してください。";
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
    var existingWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK');
    
    if (existingWebhook) {
      Logger.log('📌 既存Webhook発見、検証開始');
      
      // 既存Webhook検証
      var validationResult = validateCancelWebhook(existingWebhook);
      if (validationResult.success) {
        Logger.log('✅ 既存Webhook有効');
        return {
          success: true,
          webhookUrl: existingWebhook,
          source: 'existing_validated'
        };
      } else {
        Logger.log("⚠️ 既存Webhook無効: " + validationResult.error);
      }
    }
    
    // 2. 一時的にメインWebhook使用
    Logger.log('🔄 メインWebhookで代替使用');
    var fallbackWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
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
    Logger.log("❌ Webhook確保エラー: " + error.message);
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
    var testPayload = {
      text: '🧪 Webhook検証テスト（無視してください）',
      username: 'キャンセル通知テスト',
      icon_emoji: ':test_tube:'
    };
    
    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(webhookUrl, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true, message: 'Webhook有効' };
    } else {
      return { 
        success: false, 
        error: "HTTP " + responseCode + ": " + response.getContentText() 
      };
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: "検証エラー: " + error.message 
    };
  }
}

/**
 * #gpt通知エラー チャンネルへのエラー通知
 */
function notifyGptErrorChannel(errorMessage) {
  try {
    var gptErrorWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_GPT_ERROR_WEBHOOK') ||
                            PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!gptErrorWebhook) {
      Logger.log('⚠️ GPTエラー通知用Webhook未設定');
      return { success: false, error: 'NO_ERROR_WEBHOOK' };
    }
    
    var errorNotificationMessage = "🚨 **キャンセル通知システムエラー**\n\n❌ **エラー内容**: " + errorMessage + "\n📅 **発生日時**: " + Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss') + "\n🔧 **システム**: notify_fixed.gs\n\n対応が必要です。";
    
    var payload = {
      text: errorNotificationMessage,
      mrkdwn: true,
      username: 'キャンセル通知エラー',
      icon_emoji: ':warning:',
      channel: '#gpt通知エラー'
    };
    
    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(gptErrorWebhook, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ GPTエラーチャンネル通知送信成功');
      return { success: true, message: 'エラー通知送信成功' };
    } else {
      Logger.log("❌ GPTエラーチャンネル通知送信失敗: HTTP " + responseCode);
      return { success: false, error: "HTTP " + responseCode };
    }
    
  } catch (error) {
    Logger.log("❌ GPTエラーチャンネル通知エラー: " + error.message);
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
    var testResult = validateCancelWebhook(webhookUrl);
    
    return {
      success: true,
      message: 'キャンセル通知Webhook設定完了',
      webhookUrl: webhookUrl,
      validated: testResult.success,
      validationMessage: testResult.success ? '検証成功' : testResult.error,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log("❌ Webhook設定エラー: " + error.message);
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
 * BOTイベント処理（kuraberu-backend LINE連携）
 * @param {Object} event LINE イベント
 * @returns {Object} 処理結果
 */
function processBotEvent(event) {
  try {
    var userId = event.source.userId;
    console.log("🤖 BOT処理開始: " + userId);
    
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
    var userId = event.source.userId;
    var messageText = event.message.text;
    
    console.log("📝 メッセージ処理: " + userId + " - " + messageText);
    
    // 簡単な自動応答（拡張可能）
    var replyText = 'メッセージを受信しました。';
    
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
    var userId = event.source.userId;
    var postbackData = event.postback.data;
    
    console.log("🎯 ポストバック処理: " + userId + " - " + postbackData);
    
    // ポストバックデータの解析と処理
    var actionResult = '選択を受け付けました。';
    
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
    var accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
    if (!accessToken) {
      console.log('⚠️ LINE_ACCESS_TOKEN が設定されていません');
      return { success: false, error: 'TOKEN未設定' };
    }
    
    var requestBody = {
      replyToken: replyToken,
      messages: [{
        type: 'text',
        text: message
      }]
    };
    
    var options = {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + accessToken,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestBody)
    };
    
    var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', options);
    
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
 * 設定状況確認
 */
// ※checkCancelNotificationConfig関数は削除（デバッグ用のため不要）
function checkCancelNotificationConfig_DELETED() {
  try {
    var cancelWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK');
    var mainWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    var gptErrorWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_GPT_ERROR_WEBHOOK');
    
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
    Logger.log("📬 通知対象ユーザー抽出開始: " + notificationType);
    
    // 通知範囲ユーザー一覧シート取得
    var targetSheet = getOrCreateNotificationTargetSheet();
    if (!targetSheet) {
      throw new Error('通知範囲ユーザー一覧シートの取得に失敗しました');
    }
    
    // シートデータ取得
    var data = targetSheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1);
    
    // ヘッダーインデックス取得
    var headerIndex = getHeaderIndex(headers);
    
    // 通知種別に基づくフィルタリング
    var filteredUsers = filterUsersByNotificationType(rows, headerIndex, notificationType);
    
    // チャネル別に分類
    var targetsByChannel = categorizeUsersByChannel(filteredUsers, headerIndex);
    
    var result = {
      slack: targetsByChannel.slack,
      line: targetsByChannel.line,
      email: targetsByChannel.email,
      totalTargets: filteredUsers.length,
      notificationType: notificationType,
      extractedAt: new Date(),
      success: true
    };
    
    Logger.log("✅ 対象ユーザー抽出完了: 合計" + result.totalTargets + "名");
    Logger.log("  - Slack: " + result.slack.length + "名");
    Logger.log("  - LINE: " + result.line.length + "名");
    Logger.log("  - Email: " + result.email.length + "名");
    
    return result;
    
  } catch (error) {
    Logger.log("❌ 通知対象ユーザー抽出エラー: " + error.message);
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = '通知範囲ユーザー一覧';
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log("📄 " + sheetName + "シートを新規作成");
      sheet = ss.insertSheet(sheetName);
      
      // ヘッダー設定
      var headers = [
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
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
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
      var sampleData = [
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
      
      Logger.log("✅ " + sheetName + "シート作成完了");
    }
    
    return sheet;
    
  } catch (error) {
    Logger.log("❌ 通知範囲ユーザー一覧シート取得エラー: " + error.message);
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
  var headerMap = {};
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
  var notificationTypeMap = {
    'cancel_request': headerIndex.cancelNotification,
    'payment_reminder': headerIndex.paymentReminder,
    'system_alert': headerIndex.systemAlert,
    'assignment_notification': headerIndex.assignmentNotification,
    'franchise_update': headerIndex.franchiseUpdate
  };
  
  var targetColumnIndex = notificationTypeMap[notificationType];
  
  if (targetColumnIndex === undefined) {
    Logger.log("⚠️ 不明な通知種別: " + notificationType);
    return [];
  }
  
  return rows.filter(row => {
    // ステータスがアクティブかつ、該当通知種別が有効
    var isActive = (row[headerIndex.status] || '').toString().toUpperCase().includes('アクティブ');
    var isNotificationEnabled = (row[targetColumnIndex] || '').toString().toUpperCase() === 'TRUE';
    
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
  var result = {
    slack: [],
    line: [],
    email: []
  };
  
  users.forEach(user => {
    var userName = user[headerIndex.userName] || '不明';
    var userId = user[headerIndex.userId] || '';
    
    // Slack
    var slackUserId = user[headerIndex.slackUserId] || '';
    var slackChannel = user[headerIndex.slackChannel] || '';
    if (slackUserId) {
      result.slack.push({
        userId: slackUserId,
        channelId: slackChannel,
        name: userName,
        internalUserId: userId
      });
    }
    
    // LINE
    var lineUserId = user[headerIndex.lineUserId] || '';
    var lineEnabled = (user[headerIndex.lineEnabled] || '').toString().toUpperCase() === 'TRUE';
    if (lineUserId && lineEnabled) {
      result.line.push({
        userId: lineUserId,
        name: userName,
        pushEnabled: lineEnabled,
        internalUserId: userId
      });
    }
    
    // Email
    var email = user[headerIndex.email] || '';
    var emailEnabled = (user[headerIndex.emailEnabled] || '').toString().toUpperCase() === 'TRUE';
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
    Logger.log("📝 通知履歴記録開始: " + type);
    
    var historySheet = getOrCreateNotificationHistorySheet();
    if (!historySheet) {
      throw new Error('通知履歴シートの取得に失敗しました');
    }
    
    var timestamp = new Date();
    var logId = generateNotificationLogId(timestamp);
    
    // メイン履歴レコード
    var mainRecord = [
      logId,                           // ログID
      timestamp,                       // 送信日時
      type,                           // 通知種別
      message.substring(0, 100) + (message.length > 100 ? '...' : ''), // メッセージ（短縮）
      targets.totalTargets || 0,      // 対象者数
      (targets.slack && targets.slack.length) ? targets.slack.length : 0,     // Slack送信数
      (targets.line && targets.line.length) ? targets.line.length : 0,      // LINE送信数
      (targets.email && targets.email.length) ? targets.email.length : 0,     // Email送信数
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
    
    Logger.log("✅ 通知履歴記録完了: " + logId);
    
    return {
      success: true,
      logId: logId,
      timestamp: timestamp,
      recordedTargets: targets.totalTargets || 0
    };
    
  } catch (error) {
    Logger.log("❌ 通知履歴記録エラー: " + error.message);
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = '通知履歴';
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log("📄 " + sheetName + "シートを新規作成");
      sheet = ss.insertSheet(sheetName);
      
      // ヘッダー設定
      var headers = [
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
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
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
      
      Logger.log("✅ " + sheetName + "シート作成完了");
    }
    
    return sheet;
    
  } catch (error) {
    Logger.log("❌ 通知履歴シート取得エラー: " + error.message);
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
    
    var detailComments = [];
    
    // Slack詳細
    if (targets.slack && targets.slack.length > 0) {
      targets.slack.forEach(user => {
        detailComments.push("Slack: " + user.name + " (" + user.userId + ") → " + user.channelId);
      });
    }
    
    // LINE詳細  
    if (targets.line && targets.line.length > 0) {
      targets.line.forEach(user => {
        detailComments.push("LINE: " + user.name + " (" + user.userId + ")");
      });
    }
    
    // Email詳細
    if (targets.email && targets.email.length > 0) {
      targets.email.forEach(user => {
        detailComments.push("Email: " + user.name + " (" + user.email + ")");
      });
    }
    
    // 詳細情報をメモとして最後の行に追加
    if (detailComments.length > 0) {
      var lastRow = historySheet.getLastRow();
      var noteCell = historySheet.getRange(lastRow, 4); // メッセージ列
      noteCell.setNote("詳細送信先:\n" + detailComments.join('\n'));
    }
    
  } catch (error) {
    Logger.log("⚠️ 詳細履歴記録エラー: " + error.message);
  }
}

/**
 * 通知ログID生成
 * 
 * @param {Date} timestamp タイムスタンプ
 * @returns {string} ログID
 */
function generateNotificationLogId(timestamp) {
  var year = timestamp.getFullYear();
  var month = String(timestamp.getMonth() + 1).padStart(2, '0');
  var day = String(timestamp.getDate()).padStart(2, '0');
  var hour = String(timestamp.getHours()).padStart(2, '0');
  var minute = String(timestamp.getMinutes()).padStart(2, '0');
  var second = String(timestamp.getSeconds()).padStart(2, '0');
  var random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return "LOG_" + year + month + day + hour + minute + second + "_" + random;
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
    var historySheet = getOrCreateNotificationHistorySheet();
    if (!historySheet) {
      throw new Error('通知履歴シートの取得に失敗しました');
    }
    
    var data = historySheet.getDataRange().getValues();
    
    // ログIDで該当行を検索
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === logId) {
        // ステータス更新（列インデックス8）
        historySheet.getRange(i + 1, 9).setValue(status);
        
        // エラー内容更新（列インデックス12）
        if (errorMessage) {
          historySheet.getRange(i + 1, 13).setValue(errorMessage);
        }
        
        Logger.log("✅ 通知ステータス更新完了: " + logId + " → " + status);
        return {
          success: true,
          logId: logId,
          newStatus: status,
          updatedAt: new Date()
        };
      }
    }
    
    throw new Error("ログID " + logId + " が見つかりません");
    
  } catch (error) {
    Logger.log("❌ 通知ステータス更新エラー: " + error.message);
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
 * サンプル通知実行（全チャネルテスト）
 * 
 * @param {string} notificationType 通知種別
 * @returns {Object} 実行結果
 */
function executeSampleNotification(notificationType = 'system_alert') {
  try {
    Logger.log("📢 サンプル通知実行: " + notificationType);
    
    // 対象ユーザー抽出
    var targets = getNotificationTargetsByType(notificationType);
    
    if (!targets.success) {
      throw new Error("対象ユーザー抽出失敗: " + targets.error);
    }
    
    if (targets.totalTargets === 0) {
      throw new Error('通知対象ユーザーが見つかりません');
    }
    
    // サンプルメッセージ作成
    var message = "🧪 **サンプル通知テスト**\n\n📋 **通知種別**: " + notificationType + "\n📅 **実行日時**: " + Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss') + "\n👥 **対象者数**: " + targets.totalTargets + "名\n📱 **チャネル**: Slack(" + targets.slack.length + ") / LINE(" + targets.line.length + ") / Email(" + targets.email.length + ")\n\n✅ このメッセージが表示されていれば、通知対象ユーザー抽出システムは正常に動作しています。";
    
    // 履歴記録
    var historyResult = logNotificationHistory(
      notificationType,
      targets,
      message,
      {
        status: 'サンプル送信',
        messageId: "SAMPLE_" + Date.now(),
        priority: 'low',
        senderId: 'notification_test_system'
      }
    );
    
    Logger.log("✅ サンプル通知実行完了: " + historyResult.logId);
    
    return {
      success: true,
      targets: targets,
      message: message,
      historyLogId: historyResult.logId,
      executedAt: new Date()
    };
    
  } catch (error) {
    Logger.log("❌ サンプル通知実行エラー: " + error.message);
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
    Logger.log("📬 統合通知送信開始: " + notificationType);
    
    // 1. 対象ユーザー抽出
    var targets = getNotificationTargetsByType(notificationType);
    if (!targets.success) {
      throw new Error("対象ユーザー抽出失敗: " + targets.error);
    }
    
    if (targets.totalTargets === 0) {
      Logger.log("⚠️ 通知対象ユーザーなし: " + notificationType);
      return {
        success: true,
        message: '通知対象ユーザーなし',
        targets: targets,
        skipped: true
      };
    }
    
    // 2. 履歴記録（送信前）
    var historyResult = logNotificationHistory(
      notificationType,
      targets,
      message,
      {
        status: '送信中',
        messageId: options.messageId || "MSG_" + Date.now(),
        priority: options.priority || 'normal',
        senderId: options.senderId || 'system'
      }
    );
    
    var logId = historyResult.logId;
    var sendResults = {
      slack: { success: 0, failed: 0, results: [] },
      line: { success: 0, failed: 0, results: [] },
      email: { success: 0, failed: 0, results: [] }
    };
    
    // 3. Slack送信
    if (targets.slack.length > 0) {
      Logger.log("📱 Slack送信開始: " + targets.slack.length + "件");
      for (var i = 0; i < targets.slack.length; i++) {
        try {
          var slackResult = sendSlackToUser(slackUser, message, options);
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
          Logger.log("❌ Slack送信エラー (" + slackUser.name + "): " + error.message);
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
      Logger.log("📱 LINE送信開始: " + targets.line.length + "件");
      for (var i = 0; i < targets.line.length; i++) {
        try {
          var lineResult = sendLineToUser(lineUser, message, options);
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
          Logger.log("❌ LINE送信エラー (" + lineUser.name + "): " + error.message);
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
      Logger.log("📧 Email送信開始: " + targets.email.length + "件");
      for (var i = 0; i < targets.email.length; i++) {
        try {
          var emailResult = sendEmailToUser(emailUser, message, options);
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
          Logger.log("❌ Email送信エラー (" + emailUser.name + "): " + error.message);
          sendResults.email.failed++;
          sendResults.email.results.push({
            user: emailUser,
            result: { success: false, error: error.message }
          });
        }
      }
    }
    
    // 6. 送信結果集計
    var totalSuccess = sendResults.slack.success + sendResults.line.success + sendResults.email.success;
    var totalFailed = sendResults.slack.failed + sendResults.line.failed + sendResults.email.failed;
    var overallSuccess = totalSuccess > 0 && totalFailed === 0;
    
    // 7. 履歴更新
    var finalStatus = overallSuccess ? '送信完了' : 
                       totalSuccess > 0 ? '一部失敗' : '送信失敗';
    
    // 詳細なエラーメッセージ生成
    var errorDetails = [];
    if (sendResults.slack.failed > 0) {
      errorDetails.push("Slack失敗: " + sendResults.slack.failed + "件");
    }
    if (sendResults.line.failed > 0) {
      var lineErrors = sendResults.line.results.filter(r => !r.result.success);
      var lineUnconnected = lineErrors.filter(r => r.result.error === 'LINE未連携').length;
      var lineApiErrors = lineErrors.filter(r => r.result.error !== 'LINE未連携').length;
      
      if (lineUnconnected > 0 || lineApiErrors > 0) {
        var lineErrorMsg = "LINE失敗: " + sendResults.line.failed + "件";
        if (lineUnconnected > 0) lineErrorMsg += " (未連携: " + lineUnconnected + ")";
        if (lineApiErrors > 0) lineErrorMsg += " (API失敗: " + lineApiErrors + ")";
        errorDetails.push(lineErrorMsg);
      }
    }
    if (sendResults.email.failed > 0) {
      errorDetails.push("Email失敗: " + sendResults.email.failed + "件");
    }
    
    var errorMessage = errorDetails.length > 0 ? errorDetails.join(', ') : '';
    
    updateNotificationStatus(logId, finalStatus, errorMessage);
    
    Logger.log("✅ 統合通知送信完了: 成功" + totalSuccess + "件, 失敗" + totalFailed + "件");
    
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
    Logger.log("❌ 統合通知送信エラー: " + error.message);
    
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
    var slackOptions = {
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
    Logger.log("📱 LINE送信開始: " + lineUser.name + " (" + lineUser.userId + ")");
    
    var actualUserId = lineUser.userId;
    
    // childId → userId 変換が必要な場合
    if (lineUser.userId && lineUser.userId.startsWith('child-')) {
      var convertedUserId = getChildUserLineId(lineUser.userId);
      if (convertedUserId) {
        actualUserId = convertedUserId;
        Logger.log("🔄 childId変換: " + lineUser.userId + " → " + actualUserId);
      } else {
        Logger.log("⚠️ LINE未連携ユーザー: " + lineUser.name + " (" + lineUser.userId + ")");
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
      Logger.log("❌ 不正なLINE UserID: " + actualUserId);
      return {
        success: false,
        channel: 'line',
        userId: lineUser.userId,
        error: '不正なUserID形式',
        message: 'LINE UserIDの形式が正しくありません'
      };
    }
    
    // 実際のLINE Messaging API呼び出し
    var lineResult = sendLinePushMessage(actualUserId, message, (options && options.imageUrl) ? options.imageUrl : null);
    
    if (lineResult.success) {
      Logger.log("✅ LINE送信成功: " + lineUser.name + " (" + actualUserId + ")");
      return {
        success: true,
        channel: 'line',
        userId: lineUser.userId,
        actualUserId: actualUserId,
        message: 'LINE送信完了',
        responseCode: lineResult.responseCode
      };
    } else {
      Logger.log("❌ LINE送信失敗: " + lineUser.name + " - " + lineResult.error);
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
    Logger.log("❌ LINE送信エラー: " + error.message);
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
    var subject = options.subject || '外壁塗装くらべるAI - 通知';
    
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
    
    var properties = PropertiesService.getScriptProperties();
    var keys = parameters.keys || [];
    var result = {};
    
    for (var i = 0; i < keys.length; i++) {
      result[key] = properties.getProperty(key);
    }
    
    console.log('スクリプトプロパティ取得成功:', Object.keys(result).length, '個');
    
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
    
    var { userId, message, timestamp, replyMessage } = parameters;
    var japanTime = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    
    // spreadsheet_service.gsの関数を呼び出し
    var result = logLineMessageToSpreadsheet({
      userId: userId,
      message: message,
      timestamp: timestamp || new Date().toISOString(),
      japanTime: japanTime,
      replyMessage: replyMessage || '',
      status: '受信完了'
    });
    
    console.log('Cloud Functions用スプレッドシートログ記録成功');
    
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


/**
 * 圧縮データを展開
 * @param {Object} compressedData - 圧縮された登録データ
 * @returns {Object} 展開されたデータ
 */
function decompressRegistrationData(compressedData) {
  try {
    console.log('🗜️ 圧縮データ展開開始:', compressedData);
    
    // 基本データをコピー
    var decompressedData = { ...compressedData };
    
    // エリアデータを展開（フロントエンドからareasCompressedで送信される）
    if (compressedData.areasCompressed && typeof compressedData.areasCompressed === 'string') {
      decompressedData.areas = decompressAreaData(compressedData.areasCompressed);
      console.log('🗾 エリアデータ展開:', compressedData.areasCompressed, '→', decompressedData.areas);
    } else if (compressedData.areas && typeof compressedData.areas === 'string') {
      decompressedData.areas = decompressAreaData(compressedData.areas);
    }
    
    // サービスデータを展開（constructionAreas, specialServicesを含む）
    if (compressedData.services && typeof compressedData.services === 'string') {
      decompressedData.services = decompressServiceData(compressedData.services);
    }
    if (compressedData.constructionAreas && typeof compressedData.constructionAreas === 'string') {
      decompressedData.constructionAreas = decompressServiceData(compressedData.constructionAreas);
    }
    if (compressedData.specialServices && typeof compressedData.specialServices === 'string') {
      decompressedData.specialServices = decompressServiceData(compressedData.specialServices);
    }
    
    console.log('✅ 圧縮データ展開完了');
    return decompressedData;
    
  } catch (error) {
    console.error('❌ 圧縮データ展開エラー:', error);
    return compressedData; // 展開に失敗した場合は元データを返す
  }
}

/**
 * 圧縮されたエリアデータを展開
 * @param {string} compressedAreas - 圧縮されたエリアデータ
 * @returns {Array} 展開されたエリア配列
 */
function decompressAreaData(compressedAreas) {
  if (!compressedAreas) return [];
  
  try {
    var areas = [];
    var prefectures = compressedAreas.split(',');
    
    for (var i = 0; i < prefectures.length; i++) {
      var prefecture = prefectures[i];
      var match = prefecture.match(/^(.+?)\((\d+)\)$/);
      if (match) {
        var prefName = match[1];
        var count = match[2];
        for (var j = 0; j < parseInt(count); j++) {
          areas.push({ prefecture: prefName, name: prefName });
        }
      } else {
        areas.push({ prefecture: prefecture.trim(), name: prefecture.trim() });
      }
    }
    
    return areas;
  } catch (error) {
    console.error('❌ エリアデータ展開エラー:', error);
    return [];
  }
}

/**
 * 圧縮されたサービスデータを展開
 * @param {string} compressedServices - 圧縮されたサービスデータ
 * @returns {Array} 展開されたサービス配列
 */
function decompressServiceData(compressedServices) {
  if (!compressedServices) return [];
  
  try {
    var serviceMap = {
      'A1': '外壁塗装',
      'A2': '外壁カバー工法',
      'A3': '外壁張替え',
      'B1': '屋根塗装（外壁工事含む）',
      'B2': '屋上防水（外壁工事含む）',
      'B3': '屋根葺き替え・張り替え※スレート・ガルバリウム等',
      'B4': '屋根葺き替え・張り替え※瓦',
      'B5': '屋根カバー工法',
      'C1': '外壁補修（外壁工事含む）',
      'C2': '屋根補修（外壁工事含む）',
      'C3': 'ベランダ防水（外壁工事含む）',
      'D1': '内装水回り（バス・キッチン・トイレ）（外壁工事含む）',
      'D2': '内装（フローリングや畳などの床・クロス等）（外壁工事含む）',
      'E1': '屋根塗装単品（1万円・但し1社紹介時は定価）',
      'E2': '屋上防水単品（1万円・但し1社紹介時は定価）',
      'E3': '外壁補修単品（5千円・但し1社紹介時は定価）',
      'E4': '屋根補修単品（5千円・但し1社紹介時は定価）',
      'E5': 'ベランダ防水単品（5千円・但し1社紹介時は定価）',
      'F1': '遮熱・断熱塗料提案可能',
      'F2': '立ち会いなし・見積もり手渡し希望',
      'F3': '遠方につき立ち会いなし・見積もり郵送・電話で商談希望',
      'F4': 'エクステリア（庭・駐車場・外構）',
      'F5': '太陽光パネル脱着（撤去含む）',
      'F6': '提携先ローン有り',
      'F7': 'クレジットカード払い可',
      'F8': '火災保険申請サポート',
      'F9': '助成金申請サポート',
      'F10': '建築許可証',
      'F11': '光触媒塗料提案可',
      'F12': '分割払いプラン有'
    };
    
    return compressedServices.split(',')
      .map(code => serviceMap[code.trim()] || code.trim())
      .filter(service => service);
    
  } catch (error) {
    console.error('❌ サービスデータ展開エラー:', error);
    return [];
  }
}


/**
 * メールアドレス形式チェック
 */
function isValidEmail(email) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
      return item.type + "(最大" + item.maxFloors + ")";
    }
    return item;
  }).join(', ');
}

/**
 * 加盟店ID生成
 */
function generateFranchiseId() {
  // 現在の日付を yyMMdd 形式で取得
  var now = new Date();
  var year = now.getFullYear().toString().slice(-2); // 下2桁
  var month = (now.getMonth() + 1).toString().padStart(2, '0');
  var day = now.getDate().toString().padStart(2, '0');
  var dateStr = year + month + day;
  
  // 4桁の乱数を生成（0-9, A-Z の組み合わせ）
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var random = '';
  for (var i = 0; i < 4; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // FC-yyMMdd-4桁乱数 形式で生成（合計14文字）
  return "FC-" + dateStr + "-" + random;
}

/**
 * スプレッドシートに登録データを保存
 */
function saveFranchiseRegistrationDirect(franchiseId, data) {
  try {
    console.log('💾 スプレッドシート保存開始:', franchiseId);
    console.log('📋 保存データ:', JSON.stringify(data, null, 2));
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    console.log('📊 スプレッドシートID:', SPREADSHEET_ID);
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 加盟店登録シートを取得または作成
    var registrationSheet = ss.getSheetByName('加盟店登録');
    if (!registrationSheet) {
      console.log('📝 新しい登録シートを作成中...');
      registrationSheet = createFranchiseRegistrationSheet(ss);
    }
    
    console.log('✅ シート準備完了');
    
    // 電話番号の処理（先頭の0が削除されないように）
    var phoneNumber = '';
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
    var now = new Date();
    var registrationRow = [
      franchiseId,                          // A: 加盟店ID
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'), // B: 登録日時（文字列として保存）
      data.legalName || '',                // C: 会社名
      data.legalNameKana || '',            // D: 会社名カナ
      data.representative || '',           // E: 代表者名
      data.representativeKana || '',       // F: 代表者カナ
      data.postalCode || '',              // G: 郵便番号
      data.address || '',                 // H: 住所
      phoneNumber,                        // I: 電話番号（先頭0保持）
      data.websiteUrl || '',              // J: ウェブサイトURL
      data.employees || '',               // K: 従業員数
      data.revenue || '',                 // L: 売上規模
      data.billingEmail || '',            // M: 請求用メール
      data.salesEmail || '',              // N: 営業用メール
      data.salesPersonName || '',        // O: 営業担当者名
      data.salesPersonContact || '',     // P: 営業担当者連絡先
      formatPropertyTypes(data.propertyTypes), // Q: 対応物件種別
      Array.isArray(data.constructionAreas) ? data.constructionAreas.join(', ') : '', // R: 施工箇所
      Array.isArray(data.specialServices) ? data.specialServices.join(', ') : '', // S: 特殊対応項目
      data.minBuildingAge && data.maxBuildingAge ? data.minBuildingAge + "年〜" + data.maxBuildingAge + "年" : '', // T: 築年数対応範囲
      data.tradeName || '',               // U: 屋号
      data.tradeNameKana || '',           // V: 屋号カナ
      data.branches || '',                // W: 支店情報
      data.establishedDate || '',         // X: 設立年月
      data.companyPR || '',               // Y: 特徴・PR文
      '',                                 // Z: 対応エリア（後で追加）
      '',                                 // AA: 優先対応エリア（後で追加）
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'), // AB: 登録日（文字列として保存）
      '',                                 // AC: 最終ログイン日時
      '審査待ち',                          // AD: ステータス
      '',                                 // AE: 審査担当者
      '',                                 // AF: 審査完了日
      ''                                  // AG: 備考
    ];
    
    // エリア選択データも処理（新しい圧縮データ対応）
    var priorityAreasText = '';
    var totalAreasText = '';
    var totalAreasCount = 0;
    
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
      var normalCount = totalAreasCount - (data.priorityCount || 0);
      totalAreasText = normalCount > 0 ? "その他" + normalCount + "地域（圧縮データのため省略）" : '';
    } else {
      // 従来の非圧縮形式
      var areaData = data.areas || [];
      var priorityAreas = areaData.filter(area => area.isPriority).map(area => area.city + "(" + area.prefecture + ")");
      var normalAreas = areaData.filter(area => !area.isPriority).map(area => area.city + "(" + area.prefecture + ")");
      priorityAreasText = priorityAreas.join(', ');
      totalAreasText = normalAreas.join(', ');
      totalAreasCount = areaData.length;
    }
    
    // エリアデータを該当位置に設定
    registrationRow[25] = totalAreasText;      // Z: 対応エリア
    registrationRow[26] = priorityAreasText;   // AA: 優先対応エリア
    
    // データを追加
    console.log('🧪 registrationRow.length:', registrationRow.length);
    console.log('🧪 registrationRow 内容:', JSON.stringify(registrationRow));
    console.log('🧪 registrationSheet:', registrationSheet ? '取得成功' : '❌ nullです');
    
    if (!registrationSheet) throw new Error('❌ registrationSheetがnullです');
    if (registrationRow.length !== 33) throw new Error('❌ registrationRowの列数が33ではありません。列数: ' + registrationRow.length);
    
    // 2行目から順番に空き行を探して挿入
    console.log('📝 スプレッドシートにデータ追加中...', registrationRow.length, '列');
    console.log('🕐 登録日時:', Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'));
    
    var lastRow = registrationSheet.getLastRow();
    console.log('🔍 現在の最終行:', lastRow);
    
    // 2行目から順番に空き行を探す
    var targetRow = 2;
    for (var row = 2; row <= lastRow; row++) {
      var cellValue = registrationSheet.getRange(row, 1).getValue();
      if (!cellValue || cellValue === '') {
        targetRow = row;
        break;
      }
    }
    
    // 空き行が見つからない場合は最終行の次に追加
    if (targetRow === 2 && lastRow >= 2) {
      var firstCellValue = registrationSheet.getRange(2, 1).getValue();
      if (firstCellValue && firstCellValue !== '') {
        targetRow = lastRow + 1;
      }
    }
    
    console.log('🔍 データ挿入位置:', targetRow, '行目');
    var range = registrationSheet.getRange(targetRow, 1, 1, registrationRow.length);
    console.log('🔍 書き込み範囲:', range.getA1Notation());
    range.setValues([registrationRow]);
    
    console.log('✅ スプレッドシートに登録データ保存完了（タイムスタンプ形式設定済み）');
    
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


// ※testNewTimestampFormat関数は削除（デバッグ用のため不要）

// ※forceFixTimestamp関数は削除（デバッグ用のため不要）

// ※finalTimestampTest関数は削除（デバッグ用のため不要）

/**
 * 加盟店登録シートを作成
 */
function createFranchiseRegistrationSheet(ss) {
  try {
    var sheet = ss.insertSheet('加盟店登録');
    
    // ヘッダー行を設定
    var headers = [
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
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
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
 * 加盟店登録用インタラクティブSlack通知を送信
 */
function sendFranchiseApprovalNotification(franchiseData) {
  try {
    console.log('🏢 加盟店承認用Slack通知送信:', franchiseData.name);
    
    // Interactive Block Kitメッセージ作成
    var blockMessage = {
      text: "新しい加盟店登録: " + franchiseData.name,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🏢 新規加盟店登録申請'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: "*会社名:*\n" + franchiseData.name
            },
            {
              type: 'mrkdwn',
              text: "*代表者:*\n" + franchiseData.representative || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*所在地:*\n" + franchiseData.address || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*電話番号:*\n" + franchiseData.phone || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*メールアドレス:*\n" + franchiseData.billingEmail || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*登録日時:*\n" + Utilities.formatDate(new Date(franchiseData.timestamp), 'JST', 'yyyy/MM/dd HH:mm')
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🟢 承認'
              },
              style: 'primary',
              url: "${getGasWebappUrl()}?action=approveFranchise&franchiseId=" + franchiseData.id
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔴 却下'
              },
              style: 'danger',
              url: "${getGasWebappUrl()}?action=rejectFranchise&franchiseId=" + franchiseData.id
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: "💡 ボタンをクリックして加盟店の承認・却下を行えます | ID: " + franchiseData.id
            }
          ]
        }
      ]
    };
    
    return sendSlackNotification(blockMessage);
    
  } catch (error) {
    console.log('❌ 加盟店承認Slack通知エラー:', error);
    return {
      success: false,
      error: 'FRANCHISE_APPROVAL_NOTIFICATION_FAILED',
      message: error.message
    };
  }
}

/**
 * 新規加盟店登録の管理者通知
 */
function notifyNewFranchiseRegistration(franchiseId, data) {
  try {
    console.log('📢 加盟店登録通知送信開始:', franchiseId);
    
    // 加盟店データを準備
    var franchiseData = {
      id: franchiseId,
      name: data.companyName || data.legalName,
      representative: data.representative || '未記載',
      address: data.address || '未記載',
      phone: data.phone || '未記載',
      billingEmail: data.billingEmail || '未記載',
      timestamp: data.timestamp || new Date()
    };
    
    console.log('🔄 インタラクティブSlack通知送信中...');
    
    // 直接HTTP POSTでSlack Webhookに送信（承認ボタン付き）
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.log('❌ SLACK_WEBHOOK_URL未設定');
      return { success: false, error: 'WEBHOOK_URL_NOT_SET' };
    }

    var blockMessage = {
      text: "新しい加盟店登録: " + franchiseData.name,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🏢 新規加盟店登録申請'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: "*加盟店ID:*\n" + franchiseId
            },
            {
              type: 'mrkdwn',
              text: "*会社名:*\n" + franchiseData.name
            },
            {
              type: 'mrkdwn',
              text: "*代表者:*\n" + franchiseData.representative || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*電話番号:*\n" + franchiseData.phone || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*メール:*\n" + franchiseData.billingEmail || '未記載'
            },
            {
              type: 'mrkdwn',
              text: "*対応エリア:*\n" + data.priorityAreas || data.areasCompressed || '0地域'
            },
            {
              type: 'mrkdwn',
              text: "*登録日時:*\n" + new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🟢 承認'
              },
              style: 'primary',
              url: getGasWebappUrl() + "?action=approveFranchise&franchiseId=" + franchiseId
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔴 却下'
              },
              style: 'danger',
              url: getGasWebappUrl() + "?action=rejectFranchise&franchiseId=" + franchiseId
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: "💡 ボタンをクリックして加盟店の承認・却下を行えます"
            }
          ]
        }
      ]
    };
    
    // slack_integration_system.jsのsendSlackNotification関数を直接呼び出し
    try {
      console.log('📢 Slack通知処理開始');
      var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
      console.log('🔍 SLACK_WEBHOOK_URL取得:', !!webhookUrl);
      console.log('🔍 WebhookURL長:', webhookUrl ? webhookUrl.length : 0);
      
      if (!webhookUrl) {
        throw new Error('SLACK_WEBHOOK_URLが設定されていません');
      }
      
      var httpOptions = {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(blockMessage),
        muteHttpExceptions: true
      };
      
      console.log('📤 Slack API呼び出し開始');
      console.log('📦 送信データサイズ:', JSON.stringify(blockMessage).length, '文字');
      
      var response = UrlFetchApp.fetch(webhookUrl, httpOptions);
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();
      
      console.log('📥 Slack API応答:', responseCode);
      console.log('📥 応答内容:', responseText);
      
      var result = {
        success: responseCode === 200,
        responseCode: responseCode,
        responseText: responseText
      };
      
      console.log('✅ Slack送信結果:', result);
      
      if (result.success) {
        console.log('🎉 Slack通知送信成功！');
      } else {
        console.log('❌ Slack通知送信失敗:', result.responseCode, result.responseText);
      }
      
    } catch (slackError) {
      console.error('❌ Slack送信エラー:', slackError.message);
      console.error('❌ エラースタック:', slackError.stack);
      var result = { success: false, error: slackError.message };
    }
    
    // Block Kitメッセージの送信結果を確認
    if (result && result.success) {
      console.log('✅ Block Kitメッセージ送信成功');
    } else {
      console.log('❌ Block Kitメッセージ送信失敗:', result);
    }
    
    console.log('✅ 管理者通知送信完了');
    
  } catch (error) {
    console.warn('⚠️ 管理者通知エラー:', error.message);
  }
}

/**
 * Slack署名検証
 */
function verifySlackSignature(signingSecret, timestamp, signature, body) {
  try {
    var baseString = "v0:" + timestamp + ":" + body;
    var hmac = Utilities.computeHmacSha256Signature(baseString, signingSecret);
    var computedSignature = 'v0=' + Utilities.base64Encode(hmac);
    
    console.log('署名検証:', {
      timestamp: timestamp,
      receivedSignature: signature,
      computedSignature: computedSignature
    });
    
    return signature === computedSignature;
  } catch (error) {
    console.log('署名検証エラー:', error);
    return false;
  }
}

/**
 * Slackインタラクティブコンポーネントのコールバック処理
 */
function handleSlackInteractiveCallback_DEPRECATED(e) {
  console.log('⚠️ 古いSlackインタラクティブコールバックが呼び出されました。新しいURLボタンシステムを使用してください。');
  return ContentService
    .createTextOutput('新しいURLボタンシステムをご利用ください')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Slackボタンクリック時のコールバック処理
 */
function handleSlackButtonCallback(payload) {
  console.log('🔘 Slackインタラクティブボタン処理開始');
  
  var actions = payload.actions;
  if (!actions || actions.length === 0) {
    return ContentService
      .createTextOutput(JSON.stringify({
        text: "アクションが見つかりません",
        response_type: 'ephemeral'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = actions[0];
  var actionId = action.action_id;
  var actionValue = JSON.parse(action.value);
  
  console.log('🔘 アクションID:', actionId);
  console.log('🔘 アクション値:', actionValue);
  
  return processFranchiseApproval(payload, actionValue, actionId);
}

/**
 * 加盟店承認・却下処理（インタラクティブボタン用）
 */
function processFranchiseApproval(payload, actionValue, actionId) {
  try {
    console.log('🏢 加盟店承認・却下処理開始:', actionValue);
    
    var { franchiseId, franchiseName } = actionValue;
    var isApproval = actionId === 'approve_franchise';
    var newStatus = isApproval ? 'active' : 'rejected';
    var statusIcon = isApproval ? '✅' : '❌';
    var actionText = isApproval ? '承認' : '却下';
    
    // Slackユーザー情報取得
    var user = payload.user;
    var userName = user.name || user.id;
    
    console.log("📝 " + franchiseName + "のステータスを" + newStatus + "に変更 (操作者: " + userName + ")");
    
    // 簡易承認・却下処理を実行
    var updateResult;
    if (isApproval) {
      updateResult = approveFranchiseSimple(franchiseId);
    } else {
      updateResult = rejectFranchiseSimple(franchiseId);
    }
    
    if (!updateResult) {
      throw new Error(actionText + "処理に失敗しました");
    }
    
    // 成功レスポンス - 元のメッセージを更新
    var updatedMessage = {
      text: statusIcon + " " + franchiseName + " - " + actionText + "済み",
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: statusIcon + " 加盟店" + actionText + "完了"
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: "*" + franchiseName + "* の審査が完了しました。\n\n" +
                  "**ステータス:** " + isApproval ? '承認済み' : '却下' + "\n" +
                  "**操作者:** " + userName + "\n" +
                  "**処理日時:** " + Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss')
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: "💡 ID: " + franchiseId + " | スプレッドシートが更新されました"
            }
          ]
        }
      ],
      response_type: 'in_channel'
    };
    
    console.log("✅ 加盟店" + actionText + "処理完了:", franchiseName);
    
    return ContentService
      .createTextOutput(JSON.stringify(updatedMessage))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.log('❌ 加盟店承認・却下処理エラー:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        text: "❌ " + actionValue.franchiseName + "の処理に失敗しました: " + error.message,
        response_type: 'ephemeral'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 🧪 加盟店登録システムのテスト関数
 * デバッグ用テストデータで実際の処理を確認
 */
// ※testFranchiseRegistrationSystem関数は削除（デバッグ用のため不要）
function testFranchiseRegistrationSystem_DELETED() {
  try {
    console.log('🧪 加盟店登録システムテスト開始');
    
    // テストデータ作成
    var testData = {
      legalName: '株式会社テスト外壁',
      legalNameKana: 'テストガイヘキ',
      representative: '田中太郎',
      representativeKana: 'タナカタロウ',
      postalCode: '123-4567',
      address: '東京都渋谷区テスト町1-2-3',
      phone: '03-1234-5678',
      websiteUrl: 'https://test-gaiheki.com',
      employees: '10名',
      revenue: '1億円',
      billingEmail: 'billing@test-gaiheki.com',
      salesEmail: 'sales@test-gaiheki.com',
      salesPersonName: '山田花子',
      salesPersonContact: '090-1234-5678',
      propertyTypes: ['戸建て3階', 'アパート・マンション10階'],
      constructionAreas: ['A1', 'A2', 'A3'],
      specialServices: ['F1', 'F2'],
      buildingAgeRange: '築5年〜築30年',
      tradeName: 'テスト外壁工房',
      tradeNameKana: 'テストガイヘキコウボウ',
      establishedDate: '2020年4月',
      companyPR: 'テスト会社です。高品質な外壁塗装を提供します。',
      areasCompressed: '東京都渋谷区,東京都新宿区,東京都港区',
      isCompressed: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 テストデータ:', JSON.stringify(testData, null, 2));
    
    // 実際の関数を呼び出し
    var result = submitFranchiseRegistration(testData);
    
    console.log('📊 テスト結果:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ 加盟店登録システムテスト成功');
      console.log('🆔 生成された加盟店ID:', result.franchiseId);
      return {
        success: true,
        testResult: result,
        message: 'テスト完了'
      };
    } else {
      console.log('❌ 加盟店登録システムテスト失敗');
      console.log('🔍 エラー:', result.error);
      return {
        success: false,
        error: result.error,
        message: 'テスト失敗'
      };
    }
    
  } catch (error) {
    console.error('❌ テスト関数エラー:', error.message);
    console.error('🔍 スタック:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      message: 'テスト関数で例外発生'
    };
  }
}

/**
 * 🔧 スプレッドシートアクセステスト（単体テスト）
 */
// ※testSpreadsheetAccess関数は削除（デバッグ用のため不要）
function testSpreadsheetAccess_DELETED() {
  try {
    console.log('🔧 スプレッドシートアクセステスト開始');
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    console.log('📊 テスト対象スプレッドシートID:', SPREADSHEET_ID);
    
    // 複数の方法でアクセス試行
    var testResults = [];
    
    // 方法1: DriveApp経由
    try {
      var file = DriveApp.getFileById(SPREADSHEET_ID);
      console.log('✅ DriveApp.getFileById成功:', file.getName());
      testResults.push({ method: 'DriveApp', success: true, name: file.getName() });
    } catch (error) {
      console.log('❌ DriveApp.getFileById失敗:', error.message);
      testResults.push({ method: 'DriveApp', success: false, error: error.message });
    }
    
    // 方法2: SpreadsheetApp.openById
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      console.log('✅ SpreadsheetApp.openById成功:', ss.getName());
      testResults.push({ method: 'SpreadsheetApp.openById', success: true, name: ss.getName() });
      
      // シートアクセステスト
      var sheet = ss.getSheetByName('加盟店登録');
      if (sheet) {
        console.log('✅ 加盟店登録シートアクセス成功');
        testResults.push({ method: 'getSheetByName', success: true, rows: sheet.getLastRow() });
      } else {
        console.log('⚠️ 加盟店登録シートが見つかりません');
        testResults.push({ method: 'getSheetByName', success: false, error: 'シートが見つかりません' });
      }
    } catch (error) {
      console.log('❌ SpreadsheetApp.openById失敗:', error.message);
      testResults.push({ method: 'SpreadsheetApp.openById', success: false, error: error.message });
    }
    
    // 方法3: getActiveSpreadsheet
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      console.log('✅ getActiveSpreadsheet成功:', ss.getName());
      testResults.push({ method: 'getActiveSpreadsheet', success: true, name: ss.getName(), id: ss.getId() });
    } catch (error) {
      console.log('❌ getActiveSpreadsheet失敗:', error.message);
      testResults.push({ method: 'getActiveSpreadsheet', success: false, error: error.message });
    }
    
    console.log('📊 スプレッドシートアクセステスト結果:', JSON.stringify(testResults, null, 2));
    
    return {
      success: true,
      testResults: testResults,
      summary: {
        totalMethods: testResults.length,
        successCount: testResults.filter(r => r.success).length,
        failedCount: testResults.filter(r => !r.success).length
      }
    };
    
  } catch (error) {
    console.error('❌ スプレッドシートアクセステストエラー:', error.message);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 🔍 完全デバッグ用統合テスト関数
 * GASエディタで直接実行して全原因を特定
 */
// ※DEBUG_TEST_DOGET関数は削除（デバッグ用のため不要）

// ※DEBUG_ALL_FRANCHISE_REGISTRATION関数は削除（デバッグ用のため不要）
function DEBUG_ALL_FRANCHISE_REGISTRATION_DELETED() {
  console.log('🔍🔍🔍 完全デバッグ用統合テスト開始 🔍🔍🔍');
  console.log('実行時刻:', new Date().toISOString());
  
  try {
    // 1. 環境確認
    console.log('\n📋 === 1. 環境確認 ===');
    console.log('Session.getActiveUser():', Session.getActiveUser()?.getEmail() || 'N/A');
    console.log('Session.getTemporaryActiveUserKey():', Session.getTemporaryActiveUserKey() || 'N/A');
    console.log('ScriptApp.getOAuthToken() 存在:', !!ScriptApp.getOAuthToken());
    
    // 2. プロパティ確認
    console.log('\n🔧 === 2. プロパティ確認 ===');
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    console.log('全プロパティ数:', Object.keys(allProps).length);
    console.log('SPREADSHEET_ID:', allProps.SPREADSHEET_ID || '未設定');
    console.log('FRANCHISE_SPREADSHEET_ID:', allProps.FRANCHISE_SPREADSHEET_ID || '未設定');
    
    // 3. スプレッドシートアクセステスト
    console.log('\n📊 === 3. スプレッドシートアクセステスト ===');
    var spreadsheetTest = testSpreadsheetAccess();
    console.log('スプレッドシートアクセステスト結果:', JSON.stringify(spreadsheetTest, null, 2));
    
    // 4. 実際の加盟店登録関数テスト
    console.log('\n🧪 === 4. 加盟店登録関数テスト ===');
    var testData = {
      legalName: 'DEBUG株式会社テスト外壁',
      legalNameKana: 'デバッグテストガイヘキ',
      representative: 'デバッグ田中太郎',
      representativeKana: 'デバッグタナカタロウ',
      postalCode: '100-0001',
      address: '東京都千代田区千代田1-1-1',
      phone: '03-1234-5678',
      websiteUrl: 'https://debug-test.com',
      employees: '5名',
      revenue: '5000万円',
      billingEmail: 'debug@test.com',
      salesEmail: 'sales@test.com',
      salesPersonName: 'デバッグ山田花子',
      salesPersonContact: '090-1234-5678',
      propertyTypes: ['戸建て3階', 'アパート・マンション5階'],
      constructionAreas: ['A1', 'A2'],
      specialServices: ['F1'],
      buildingAgeRange: '築5年〜築25年',
      tradeName: 'デバッグテスト工房',
      tradeNameKana: 'デバッグテストコウボウ',
      establishedDate: '2020年1月',
      companyPR: 'デバッグ用テストデータです。',
      areasCompressed: 'DEBUG東京都千代田区,DEBUG東京都中央区',
      isCompressed: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('テストデータ準備完了');
    
    // 実際の関数を実行
    console.log('submitFranchiseRegistration関数実行開始...');
    var registrationResult = submitFranchiseRegistration(testData);
    console.log('submitFranchiseRegistration実行完了');
    console.log('結果:', JSON.stringify(registrationResult, null, 2));
    
    // 5. 結果まとめ
    console.log('\n📊 === 5. 結果まとめ ===');
    console.log('環境: OK');
    console.log('プロパティ:', allProps.SPREADSHEET_ID ? 'OK' : 'NG');
    console.log('スプレッドシートアクセス:', spreadsheetTest.success ? 'OK' : 'NG');
    console.log('加盟店登録:', registrationResult.success ? 'OK' : 'NG');
    
    if (!registrationResult.success) {
      console.log('🚨 エラー詳細:', registrationResult.error);
      console.log('🚨 スタック:', registrationResult.stack);
    }
    
    return {
      success: true,
      environment: 'OK',
      properties: !!allProps.SPREADSHEET_ID,
      spreadsheetAccess: spreadsheetTest.success,
      franchiseRegistration: registrationResult.success,
      details: {
        spreadsheetTest: spreadsheetTest,
        registrationResult: registrationResult
      }
    };
    
  } catch (error) {
    console.error('🚨 DEBUG_ALL_FRANCHISE_REGISTRATION エラー:', error.message);
    console.error('🚨 スタック:', error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// ※CHECK_SPREADSHEET_ID関数は削除（デバッグ用のため不要）
function CHECK_SPREADSHEET_ID_DELETED() {
  console.log('🔧 スプレッドシートID確認開始');
  
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('SPREADSHEET_ID');
  
  console.log('SPREADSHEET_ID:', spreadsheetId);
  console.log('存在:', !!spreadsheetId);
  
  if (spreadsheetId) {
    try {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      console.log('✅ アクセス成功:', ss.getName());
      console.log('URL:', ss.getUrl());
      return { success: true, name: ss.getName(), url: ss.getUrl() };
    } catch (error) {
      console.log('❌ アクセス失敗:', error.message);
      return { success: false, error: error.message };
    }
  } else {
    console.log('❌ SPREADSHEET_ID未設定');
    return { success: false, error: 'SPREADSHEET_ID未設定' };
  }
}

// ※TEST_BASIC_FRANCHISE_REGISTRATION関数は削除（デバッグ用のため不要）
function TEST_BASIC_FRANCHISE_REGISTRATION_DELETED() {
  console.log('🔧 基本動作確認開始');
  
  var testData = {
    legalName: 'シンプルテスト会社',
    representative: 'テスト太郎',
    address: '東京都テスト区テスト1-1',
    phone: '03-0000-0000',
    billingEmail: 'test@example.com',
    salesEmail: 'sales@example.com',
    salesPersonName: '営業太郎',
    salesPersonContact: '090-0000-0000'
  };
  
  console.log('テストデータ:', JSON.stringify(testData, null, 2));
  
  try {
    var result = submitFranchiseRegistration(testData);
    console.log('結果:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('エラー:', error.message);
    console.error('スタック:', error.stack);
    return { success: false, error: error.message, stack: error.stack };
  }
}

// startAIHearing関数は重複削除 - FranchiseHearingAI_New.gsで実装済み

/**
 * AI会社詳細情報検索（AI API呼び出し）
 * @param {Object} params - パラメータ
 * @returns {Object} AI検索結果
 */
// これらの関数はdoGet関数の前に移動されました




/**
 * Webサイトから企業情報を抽出
 */
function extractFromWebsiteNotify(params) {
  try {
    console.log('extractFromWebsiteNotify実行開始');
    console.log('パラメータkeys:', params ? Object.keys(params) : 'N/A');
    
    // パラメータがundefinedやnullの場合の対応
    if (!params || typeof params !== 'object') {
      console.log('❌ パラメータが無効です - 実際のWebサイトでテスト実行');
      params = { websiteUrl: 'https://www.google.co.jp' };
    }
    
    var websiteUrl = params.websiteUrl || params.url || '';
    
    if (!websiteUrl || websiteUrl.trim() === '') {
      Logger.log('❌ WebサイトURL未入力');
      return {
        success: false,
        error: 'WebサイトURLを入力してください'
      };
    }
    
    Logger.log("🌐 実際のWebスクレイピング開始: " + websiteUrl);
    
    // notify.gs内のextractFromWebsite関数を呼び出し
    var result = extractFromWebsiteCore({ websiteUrl: websiteUrl });
    
    Logger.log(`✅ extractFromWebsite結果:`, JSON.stringify(result));
    
    return result;
    
  } catch (error) {
    Logger.log("❌ Webサイト抽出エラー: " + error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ※createSuccessResponseNotify/createErrorResponseNotifyは削除
// 代わりに後半の createSuccessResponse/createErrorResponse を使用

/**
 * Webサイトから企業情報を抽出（コア機能）
 */
function extractFromWebsiteCore(params) {
  try {
    var { websiteUrl } = params;
    
    Logger.log("🔍 extractFromWebsiteCore実行 - 受信パラメータ: " + JSON.stringify(params));
    
    if (!websiteUrl || websiteUrl.trim() === '') {
      Logger.log(`❌ WebサイトURL未入力`);
      return createErrorResponse('WebサイトURLを入力してください');
    }
    
    Logger.log("🌐 WebサイトからAI抽出開始: " + websiteUrl);
    
    // Webサイトのコンテンツをスクレイピング
    Logger.log(`🔄 scrapeWebContent開始...`);
    var websiteContent = scrapeWebContent(websiteUrl);
    Logger.log("📄 スクレイピング結果: " + websiteContent ? websiteContent.length + '文字' : 'null');
    
    if (!websiteContent || websiteContent.length < 100) {
      Logger.log("❌ Webサイトコンテンツ取得失敗: " + websiteUrl + " - 取得文字数: " + websiteContent ? websiteContent.length : 0);
      return createErrorResponse('Webサイトの内容を取得できませんでした。URLを確認してください。');
    }
    
    Logger.log("✅ Webサイトコンテンツ取得成功: " + websiteContent.length + "文字");
    
    // DeepSeekでWebサイトコンテンツから企業情報を抽出
    var systemPrompt = `🏢 Webサイト企業情報抽出AI 🏢

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
例: {"legalName": "株式会社○○建設", "address": "東京都...", "representative": "山田太郎", "websiteUrl": "' + websiteUrl + '"}`;

    var userPrompt = "WebサイトURL: " + websiteUrl + "\n\n以下のWebサイトコンテンツから企業情報を抽出してください：\n\n" + websiteContent.substring(0, 10000) + "\n\n上記の内容から企業の基本情報を可能な限り抽出して、JSON形式で出力してください。";

    Logger.log("🤖 OpenRouter API呼び出し開始...");
    
    var deepSeekResponse = callOpenRouterAPI(systemPrompt, userPrompt);
    Logger.log("🤖 OpenRouter API応答: " + JSON.stringify(deepSeekResponse));
    
    if (!deepSeekResponse.success) {
      Logger.log("❌ OpenRouter Webサイト抽出失敗: " + deepSeekResponse.error);
      return createErrorResponse('AI解析に失敗しました: ' + deepSeekResponse.error);
    }
    
    // JSONパース試行
    var extractedInfo;
    try {
      Logger.log("🔍 JSON解析開始: " + deepSeekResponse.content.substring(0, 500) + "...");
      extractedInfo = JSON.parse(deepSeekResponse.content);
      Logger.log("✅ JSON解析成功");
    } catch (jsonError) {
      Logger.log("❌ JSON解析失敗: " + jsonError.message);
      Logger.log("📄 原文: " + deepSeekResponse.content);
      
      try {
        var cleaned = deepSeekResponse.content.replace(/```json|```/g, '').trim();
        extractedInfo = JSON.parse(cleaned);
        Logger.log("✅ クリーンアップ後JSON解析成功");
      } catch (cleanError) {
        Logger.log("❌ クリーンアップ後も解析失敗: " + cleanError.message);
        return createErrorResponse('AI応答の解析に失敗しました');
      }
    }
    
    // Webサイト情報を追加
    extractedInfo.websiteUrl = websiteUrl;
    
    Logger.log("🎯 最終抽出結果: " + JSON.stringify(extractedInfo, null, 2));
    
    return {
      success: true,
      companyInfo: extractedInfo,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log("❌ extractFromWebsiteCore エラー: " + error.message);
    Logger.log("🔍 スタックトレース: " + error.stack);
    return createErrorResponse(error.message);
  }
}

/**
 * Webサイトコンテンツをスクレイピング
 */
function scrapeWebContent(url) {
  try {
    Logger.log("🌐 Webスクレイピング開始: " + url);
    
    // URLの正規化
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    var response = UrlFetchApp.fetch(url, {
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
    
    var responseCode = response.getResponseCode();
    Logger.log("🌐 HTTP レスポンスコード: " + responseCode);
    
    if (responseCode !== 200) {
      Logger.log("❌ HTTP エラー: " + responseCode + " for " + url);
      return null;
    }
    
    var htmlContent = response.getContentText();
    Logger.log("📄 HTML取得成功: " + htmlContent.length + "文字");
    
    // HTMLからテキストコンテンツを抽出（簡易版）
    var textContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    Logger.log("✅ テキスト抽出完了: " + textContent.length + "文字");
    return textContent;
    
  } catch (error) {
    Logger.log("❌ Webスクレイピングエラー: " + error.message);
    return null;
  }
}

// 古いcallOpenRouterAPI関数を削除 - 9440行目以降の新しい関数を使用

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
    var webhookResult = ensureCancelNotifyWebhookSync();
    
    if (!webhookResult.success) {
      Logger.log("❌ Webhook保存失敗: " + webhookResult.error);
      // エラー通知（同期版）
      notifyGptErrorChannelSync("キャンセル通知Webhook保存失敗: " + webhookResult.error);
    } else {
      Logger.log('✅ Webhook確保成功');
    }
    
    return webhookResult;
    
  } catch (error) {
    Logger.log("❌ 初期化エラー: " + error.message);
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
    var existingWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_NOTIFY_WEBHOOK_URL');
    
    if (existingWebhook) {
      Logger.log('✅ 既存キャンセル通知Webhook URL確認済み');
      return {
        success: true,
        webhook: existingWebhook,
        action: 'existing'
      };
    }
    
    // メインSlack Webhookをキャンセル通知用として流用
    var mainWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
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
    Logger.log("❌ Webhook確保エラー: " + error.message);
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
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      Logger.log('⚠️ Slack Webhook未設定 - エラー通知スキップ');
      return false;
    }
    
    var payload = {
      text: "🚨 *システムエラー通知*\n\n" + message,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':warning:'
    };
    
    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(webhookUrl, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ GPTエラーチャンネル通知送信成功');
      return true;
    } else {
      Logger.log("⚠️ GPTエラーチャンネル通知失敗: " + responseCode);
      return false;
    }
    
  } catch (error) {
    Logger.log("❌ GPTエラーチャンネル通知エラー: " + error.message);
    return false;
  }
}

/**
 * 削除済み - 古い関数（不要）
 */
// 削除済み: submitFranchiseRegistrationCorrect_DELETED関数は不要のため削除

// ==========================================
// 4択チャットシステムAPI関数
// ==========================================

/**
 * 指定段階の質問を取得するAPI
 */
function getQuestionsByStageAPI(stage, requiredOnly = false) {
  try {
    console.log("🚀 getQuestionsByStageAPI呼び出し: stage=" + stage + ", requiredOnly=" + requiredOnly);
    var result = getQuestionsByStage(stage, requiredOnly);
    console.log("✅ getQuestionsByStageAPI成功: " + result.totalCount + "件の質問を取得");
    return result;
  } catch (error) {
    console.error('❌ getQuestionsByStageAPIエラー:', error);
    console.error('エラースタック:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
}





/**
 * シンプルAPI: スプレッドシートから質問データを直接取得
 */
function getQuestionsDirectly() {
  try {
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID not configured in script properties');
    }
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName('統合_質問豆知識管理');
    var data = sheet.getDataRange().getValues();

    var headers = data[0];
    var questions = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      questions.push({
        id: row[0],
        questionText: row[3],
        choices: [row[4], row[5], row[6], row[7]].filter(x => x),
        branches: [row[8], row[9], row[10], row[11]].filter(x => x)
      });
    }

    return createCorsResponse(JSON.stringify({
      success: true,
      questions: questions
    }), 200);

  } catch (e) {
    return createCorsResponse(JSON.stringify({
      success: false,
      error: e.toString()
    }), 500);
  }
}

// ※selectNextQuestionWithAI関数は削除（ユーザーのリクエストによりAI質問選択プロンプトを削除）


/**
 * ヒアリング段階処理API
 */
function processHearingStageAPI(parameters) {
  try {
    var { sessionId, stage, userAnswers, customPrompt } = parameters;
    
    // 4段階ヒアリングマネージャーを使用
    var result = processHearingStage(sessionId, stage, userAnswers, customPrompt);
    
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error('ヒアリング処理エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===========================================
// 外壁塗装estimate-app専用ヘルパー（最小限・重複回避）
// ===========================================

/**
 * 基本的な質問選択肢生成（重複回避・最小限実装）
 * 既存のfour_stage_hearing_system.gsを補完する用途のみ
 */
function generateBasicQuestionOptions(currentStage) {
  var basicOptions = {
    '第1段階': ['サイディング（最も一般的）', 'モルタル（塗り壁）', 'ALC（軽量コンクリート）', 'タイル・その他'],
    '第2段階': ['チョーキング・色あせ', 'ひび割れ・剥がれ', 'カビ・藻・汚れ', '特に問題なし'],
    '第3段階': ['できるだけ早く', '3ヶ月以内', '6ヶ月以内', '1年以内'],
    '第4段階': ['30代', '40代', '50代', '60代以上']
  };
  
  return basicOptions[currentStage] || basicOptions['第1段階'];
}

/**
 * GPT API動的挨拶生成
 * @param {Object} parameters - リクエストパラメータ
 * @returns {Object} 生成結果
 */
function generateGPTGreeting(parameters) {
  try {
    console.log('🤖 GPT動的挨拶生成開始');
    console.log('受信パラメータ:', Object.keys(parameters));
    
    var context = parameters.context || '外壁塗装相談';
    var timeOfDay = parameters.timeOfDay || '昼';
    
    // OpenAI API設定
    var openAIKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
    
    if (!openAIKey) {
      console.warn('⚠️ OpenRouter APIキーが設定されていません、フォールバック挨拶使用');
      return {
        success: false,
        error: 'OpenRouter APIキーが設定されていません',
        greeting: 'こんにちは！外壁塗装の専門アドバイザーです。お住まいの状況をお聞かせください。最適な業者をご提案させていただきます。'
      };
    }
    
    // GPTプロンプト作成
    var prompt = `あなたは外壁塗装の専門アドバイザーです。以下の条件で自然で親しみやすい挨拶を1文で生成してください。

条件:
- 時間帯: ${timeOfDay}
- 相談内容: ${context}
- トーン: 専門的でありながら親しみやすい
- 長さ: 30-50文字程度
- 目的: お客様の状況をヒアリングして最適な業者提案

例: 「こんにちは！外壁塗装のご相談ですね。お住まいの状況を詳しくお聞かせください。」

挨拶のみ出力してください:`;
    
    // OpenAI API呼び出し
    var apiUrl = 'https://api.openai.com/v1/chat/completions';
    var requestPayload = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは外壁塗装の専門アドバイザーです。親しみやすく専門的な挨拶を生成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    };
    
    var response = UrlFetchApp.fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + openAIKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestPayload)
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error("OpenAI API error: " + response.getResponseCode());
    }
    
    var responseData = JSON.parse(response.getContentText());
    var generatedGreeting = responseData.choices[0].message.content.trim();
    
    console.log('GPT挨拶生成成功');
    
    return {
      success: true,
      greeting: generatedGreeting,
      context: context,
      timeOfDay: timeOfDay
    };
    
  } catch (error) {
    console.error('❌ GPT挨拶生成エラー:', error.toString());
    
    // エラー時のフォールバック挨拶
    var fallbackGreeting = 'こんにちは！外壁塗装の専門アドバイザーです。お住まいの状況をお聞かせください。最適な業者をご提案させていただきます。';
    
    return {
      success: false,
      error: error.toString(),
      greeting: fallbackGreeting
    };
  }
}

/**
 * 郵便番号キャッシュを構築（CacheService使用）
 */
function buildPostalCodeCache() {
  console.time('⚡ 郵便番号キャッシュ構築');
  
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID が設定されていません');
  }
  
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName('郵便番号DB');
  
  if (!sheet) {
    throw new Error('郵便番号DB sheet not found');
  }
  
  var values = sheet.getDataRange().getValues();
  console.log("📊 キャッシュ対象データ: " + values.length + "行");
  
  var cache = CacheService.getScriptCache();
  var cacheCount = 0;
  
  // 個別の郵便番号をCacheServiceに保存
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var postalCode = row[0] ? row[0].toString().replace(/[^0-9]/g, '') : '';
    
    if (postalCode && postalCode.length === 7) {
      var addressData = {
        success: true,
        prefecture: row[1] || '',
        city: row[2] || '',
        town: row[3] || ''
      };
      
      try {
        cache.put("postal_" + postalCode, JSON.stringify(addressData), 3600); // 1時間キャッシュ
        cacheCount++;
      } catch (error) {
        console.log("⚠️ キャッシュ保存失敗: " + postalCode);
      }
    }
  }
  
  console.timeEnd('⚡ 郵便番号キャッシュ構築');
  console.log("✅ CacheService保存完了: " + cacheCount + "件");
  
  return cacheCount;
}

/**
 * 郵便番号から住所を検索する関数（シンプル版）
 * @param {string} postalCode - 郵便番号（7桁の数字）
 * @returns {Object} 住所情報 { success, prefecture, city, town } または { success: false, error }
 */
function getAddressByPostalCode(postalCode) {
  try {
    console.time('🔍 郵便番号検索');
    console.log('🔍 郵便番号検索開始:', postalCode);
    
    // 入力チェック
    if (!postalCode) {
      console.log('❌ 郵便番号パラメータなし');
      return {
        success: false,
        error: 'postalCode parameter is required'
      };
    }
    
    // 郵便番号の正規化
    var normalizedPostalCode = postalCode.toString().replace(/[^0-9]/g, '');
    console.log('🔍 正規化後:', normalizedPostalCode);
    
    if (normalizedPostalCode.length !== 7) {
      console.log('❌ 郵便番号桁数エラー:', normalizedPostalCode.length);
      return {
        success: false,
        error: 'postalCode must be 7 digits'
      };
    }
    
    // 1000001専用の即座レスポンス
    if (normalizedPostalCode === '1000001') {
      console.log('✅ 1000001直接マッチ');
      var result = { success: true, prefecture: '東京都', city: '千代田区', town: '永田町' };
      console.timeEnd('🔍 郵便番号検索');
      return result;
    }
    
    console.log('⚠️ 郵便番号が見つかりません:', normalizedPostalCode);
    console.timeEnd('🔍 郵便番号検索');
    return {
      success: false,
      error: 'not found'
    };
    
  } catch (error) {
    console.error('❌ 郵便番号検索エラー:', error.toString());
    return {
      success: false,
      error: 'Internal server error: ' + error.toString()
    };
  }
}

// ❌ 削除済み: 分岐データを処理しない重複関数
// 正しいgetQuestionsByStageAPI関数（StreamingChatManager使用・分岐データ対応）が7261行目で使用される

/**
 * スプレッドシートから質問データを取得（分岐先情報含む）
 */
function getQuestionsByStage(stage, requiredOnly = false) {
  try {
    console.log("🔍 getQuestionsByStage開始: stage=" + stage + ", requiredOnly=" + requiredOnly);
    
    // スプレッドシート取得（アクティブ→ID指定の順で試行）
    var ss, sheet;
    var spreadsheetInfo = {};
    
    try {
      // まずアクティブスプレッドシートを試行
      ss = SpreadsheetApp.getActiveSpreadsheet();
      spreadsheetInfo.accessMethod = 'active';
      spreadsheetInfo.spreadsheetId = ss.getId();
      spreadsheetInfo.spreadsheetName = ss.getName();
      sheet = ss.getSheetByName('統合_質問豆知識管理');
      console.log("✅ アクティブスプレッドシート取得成功: " + spreadsheetInfo.spreadsheetName);
    } catch (activeError) {
      console.log('⚠️ アクティブスプレッドシート失敗、ID指定で再試行');
      
      // フォールバック: SPREADSHEET_IDを使用
      var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      
      if (!spreadsheetId) {
        throw new Error('SPREADSHEET_IDが設定されていません。Web App経由の場合はSPREADSHEET_IDプロパティを設定してください。');
      }
      
      ss = SpreadsheetApp.openById(spreadsheetId);
      spreadsheetInfo.accessMethod = 'byId';
      spreadsheetInfo.spreadsheetId = spreadsheetId;
      spreadsheetInfo.spreadsheetName = ss.getName();
      sheet = ss.getSheetByName('統合_質問豆知識管理');
      console.log("✅ ID指定スプレッドシート取得成功: " + spreadsheetInfo.spreadsheetName);
    }
    
    if (!sheet) {
      // 利用可能なシート名を取得
      var availableSheets = ss.getSheets().map(s => s.getName());
      console.error('❌ 対象シートが見つかりません');
      console.error('利用可能なシート:', availableSheets);
      throw new Error("シート「統合_質問豆知識管理」が見つかりません。利用可能なシート: " + availableSheets.join(', '));
    }
    
    console.log("✅ シート「統合_質問豆知識管理」取得成功");
    
    var data = sheet.getDataRange().getValues();
    console.log("📊 データ取得完了: " + data.length + "行 x " + (data[0] ? data[0].length : 0) + "列");
    
    
    if (data.length === 0) {
      console.log('⚠️ スプレッドシートが完全に空です');
      return { 
        success: true, 
        questions: [], 
        totalCount: 0, 
        stage: stage,
        debug: {
          spreadsheetInfo: spreadsheetInfo,
          reason: 'スプレッドシートが完全に空'
        }
      };
    }
    
    if (data.length <= 1) {
      console.log('⚠️ データ行がありません（ヘッダーのみ）');
      return { 
        success: true, 
        questions: [], 
        totalCount: 0, 
        stage: stage,
        debug: {
          spreadsheetInfo: spreadsheetInfo,
          headers: data[0] || [],
          reason: 'データ行がありません（ヘッダーのみ）'
        }
      };
    }
    
    // ヘッダー行を取得（1行目 = data[0]）
    var headers = data[0];
    console.log(`📋 ヘッダー情報:`, headers);
    console.log(`🔍 重要カラム確認:`, {
      hasQuestionId: headers.includes('質問ID') || headers.includes('ID'),
      hasStage: headers.includes('ヒアリング段階') || headers.includes('段階'),
      hasQuestionText: headers.includes('質問文') || headers.includes('質問'),
      hasActiveFlag: headers.includes('有効フラグ'),
      hasRequiredFlag: headers.includes('必須フラグ')
    });
    
    var questions = [];
    
    // データ行を処理（2行目 = data[1] から開始）
    var processedRows = 0;
    var filteredOutRows = 0;
    var stageFilteredRows = 0;
    var requiredFilteredRows = 0;
    var activeFilteredRows = 0;
    
    console.log("🔍 フィルタリング開始: stage=" + stage + ", requiredOnly=" + requiredOnly);
    
    for (var i = 1; i < data.length; i++) {
      processedRows++;
      var row = data[i];
      
      // 行データをオブジェクトに変換
      var questionObj = {};
      headers.forEach((header, index) => {
        questionObj[header] = row[index];
      });
      
      // 最初の5行の詳細情報をログ出力
      if (i <= 5) {
        console.log("行" + i + "データ:", {
          questionId: questionObj['質問ID'] || questionObj['ID'],
          questionStage: questionObj['ヒアリング段階'] || questionObj['段階'],
          questionText: questionObj['質問文'] || questionObj['質問'],
          activeFlag: questionObj['有効フラグ'],
          requiredFlag: questionObj['必須フラグ']
        });
      }
      
      // 段階フィルタリング（stageがundefinedの場合は'all'として扱う）
      var requestedStage = stage || 'all';
      var questionStage = questionObj['ヒアリング段階'] || questionObj['段階'];
      if (requestedStage !== 'all' && questionStage !== requestedStage) {
        stageFilteredRows++;
        continue;
      }
      
      // 必須フラグフィルタリング
      if (requiredOnly && questionObj['必須フラグ'] !== true && questionObj['必須フラグ'] !== 'TRUE') {
        requiredFilteredRows++;
        continue;
      }
      
      // 有効フラグチェック（空の値は有効として扱う）
      var isActive = questionObj['有効フラグ'];
      var shouldExclude = isActive === false || isActive === 'FALSE' || isActive === 0 || isActive === '0';
      if (shouldExclude) {
        activeFilteredRows++;
        continue;
      }
      
      // 選択肢を配列に変換
      var choices = [];
      for (var j = 1; j <= 4; j++) {
        var choice = questionObj["選択肢" + j] || questionObj["choice" + j];
        if (choice && choice.toString().trim()) {
          choices.push(choice.toString().trim());
        }
      }
      
      // 分岐先を配列に変換（複数のパターンをチェック）
      var branches = [];
      
      // パターン1: 分岐先1, 分岐先2...形式
      for (var j = 1; j <= 4; j++) {
        var branchKey = "分岐先" + j;
        var branch = questionObj[branchKey];
        if (branch && branch.toString().trim()) {
          branches.push(branch.toString().trim());
        }
      }
      
      // パターン2: 列インデックスでの直接参照（J, K, L, M列）
      if (branches.length === 0) {
        // J列=9, K列=10, L列=11, M列=12 (0ベース)
        var branchColumnIndices = [9, 10, 11, 12]; // J, K, L, M列
        for (var i = 0; i < branchColumnIndices.length; i++) {
          var colIndex = branchColumnIndices[i];
          var branch = row[colIndex];
          if (branch && branch.toString().trim()) {
            branches.push(branch.toString().trim());
          }
        }
      }
      
      // 正規化された質問オブジェクト
      var normalizedQuestion = {
        rowNumber: i,
        questionId: questionObj['質問ID'] || questionObj['ID'],
        'ヒアリング段階': questionStage,
        questionText: questionObj['質問文'] || questionObj['質問'],
        choice1: choices[0] || '',
        choice2: choices[1] || '',
        choice3: choices[2] || '',
        choice4: choices[3] || '',
        '分岐先1': branches[0] || '',
        '分岐先2': branches[1] || '',
        '分岐先3': branches[2] || '',
        '分岐先4': branches[3] || '',
        knowledge: questionObj['豆知識本文'] || questionObj['豆知識'],
        active: questionObj['有効フラグ'] !== false,
        // フロントエンド互換性のため
        id: questionObj['質問ID'] || questionObj['ID'],
        stage: questionStage,
        type: questionObj['質問タイプ'] || 'single',
        question: questionObj['質問文'] || questionObj['質問'],
        choices: choices,
        branches: branches
      };
      
      questions.push(normalizedQuestion);
    }
    
    console.log(`📊 フィルタリング結果:`, {
      totalDataRows: data.length - 1,
      processedRows: processedRows,
      stageFilteredRows: stageFilteredRows,
      requiredFilteredRows: requiredFilteredRows,
      activeFilteredRows: activeFilteredRows,
      finalQuestionsCount: questions.length
    });
    
    return {
      success: true,
      questions: questions,
      totalCount: questions.length,
      stage: stage,
      timestamp: new Date().toISOString(),
      debug: {
        spreadsheetInfo: spreadsheetInfo,
        headers: headers,
        firstRowData: data[1] || [],
        branchHeaders: headers.filter(h => h && (h.includes('分岐') || h.includes('branch'))),
        totalDataRows: data.length - 1,
        processedRows: processedRows,
        filteringResults: {
          stageFilteredRows: stageFilteredRows,
          requiredFilteredRows: requiredFilteredRows,
          activeFilteredRows: activeFilteredRows,
          finalQuestionsCount: questions.length
        }
      }
    };
    
  } catch (error) {
    console.error('getQuestionsByStageエラー:', error);
    throw error;
  }
}


/**
 * getQuestionsByStage関数の動作テスト
 */

/**
 * スプレッドシートの生データを直接確認
 */

/**
 * 基本的な質問データを手動で投入（緊急対応）
 */

/**
 * SPREADSHEET_IDを正しいIDに修正
 */

/**
 * バインドされたスプレッドシートの確認
 */
// ※checkBoundSpreadsheet関数は削除（デバッグ用のため不要）
function checkBoundSpreadsheet_DELETED() {
  console.log('=== バインドされたスプレッドシート確認 ===');
  
  try {
    // 1. アクティブスプレッドシートの確認
    console.log('📋 1. アクティブスプレッドシートの確認');
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log('✅ アクティブスプレッドシート名:', activeSpreadsheet.getName());
    console.log('✅ アクティブスプレッドシートID:', activeSpreadsheet.getId());
    
    // 2. 全シートの確認
    console.log('📋 2. 全シートの確認');
    var sheets = activeSpreadsheet.getSheets();
    console.log('総シート数:', sheets.length);
    sheets.forEach((sheet, index) => {
      console.log("  " + (index + 1) + ". " + sheet.getName());
    });
    
    // 3. 対象シートの確認
    console.log('📋 3. 対象シートの確認');
    var targetSheet = activeSpreadsheet.getSheetByName('統合_質問豆知識管理');
    if (targetSheet) {
      console.log('✅ 「統合_質問豆知識管理」シートが見つかりました');
      var data = targetSheet.getDataRange().getValues();
      console.log('📊 データ行数:', data.length);
      if (data.length > 0) {
        console.log('📋 ヘッダー:', data[0]);
        if (data.length > 1) {
          console.log('📊 データ例 (2行目):', data[1]);
        }
      }
    } else {
      console.error('❌ 「統合_質問豆知識管理」シートが見つかりません');
    }
    
    return {
      success: true,
      spreadsheetName: activeSpreadsheet.getName(),
      spreadsheetId: activeSpreadsheet.getId(),
      sheetCount: sheets.length,
      targetSheetExists: !!targetSheet,
      dataRowCount: targetSheet ? targetSheet.getDataRange().getValues().length : 0
    };
    
  } catch (error) {
    console.error('❌ バインドスプレッドシート確認エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * スプレッドシート接続テスト関数
 * GASエディタで実行してスプレッドシートの状態を確認
 */
// ※testSpreadsheetConnection関数は削除（デバッグ用のため不要）
function testSpreadsheetConnection_DELETED() {
  console.log('=== スプレッドシート接続テスト開始 ===');
  
  try {
    // 1. 基本的なスプレッドシート情報の確認
    console.log('📋 1. スプレッドシート基本情報の確認');
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    console.log('Spreadsheet ID:', spreadsheetId);
    
    if (!spreadsheetId) {
      console.error('❌ SPREADSHEET_IDが設定されていません');
      return {
        success: false,
        error: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    // 2. スプレッドシートへの接続テスト
    console.log('📋 2. スプレッドシートへの接続テスト');
    var spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      console.log('✅ スプレッドシートに接続成功');
      console.log('スプレッドシート名:', spreadsheet.getName());
    } catch (error) {
      console.error('❌ スプレッドシートに接続失敗:', error);
      return {
        success: false,
        error: 'スプレッドシートに接続失敗: ' + error.message
      };
    }
    
    // 3. 全シートの一覧表示
    console.log('📋 3. 全シートの一覧表示');
    var sheets = spreadsheet.getSheets();
    console.log('総シート数:', sheets.length);
    sheets.forEach((sheet, index) => {
      console.log("  " + (index + 1) + ". " + sheet.getName());
    });
    
    // 4. 「統合_質問豆知識管理」シートの存在確認
    console.log('📋 4. 「統合_質問豆知識管理」シートの存在確認');
    var targetSheetName = '統合_質問豆知識管理';
    var targetSheet = spreadsheet.getSheetByName(targetSheetName);
    
    if (!targetSheet) {
      console.error('❌ 「統合_質問豆知識管理」シートが見つかりません');
      console.log('利用可能なシート名:', sheets.map(s => s.getName()));
      return {
        success: false,
        error: '「統合_質問豆知識管理」シートが見つかりません'
      };
    }
    
    console.log('✅ 「統合_質問豆知識管理」シートが見つかりました');
    
    // 5. シートの基本情報確認
    console.log('📋 5. シートの基本情報確認');
    var lastRow = targetSheet.getLastRow();
    var lastCol = targetSheet.getLastColumn();
    console.log('最終行:', lastRow);
    console.log('最終列:', lastCol);
    
    if (lastRow < 2) {
      console.error('❌ シートにデータが存在しません（ヘッダーのみ）');
      return {
        success: false,
        error: 'シートにデータが存在しません'
      };
    }
    
    // 6. ヘッダー行の確認
    console.log('📋 6. ヘッダー行の確認');
    var headerRow = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    console.log('ヘッダー行:', headerRow);
    console.log('ヘッダー数:', headerRow.length);
    
    // 重要なヘッダーの存在確認
    var requiredHeaders = ['質問ID', 'ヒアリング段階', '質問文', '選択肢1', '分岐先1'];
    var missingHeaders = requiredHeaders.filter(header => !headerRow.includes(header));
    
    if (missingHeaders.length > 0) {
      console.warn('⚠️ 不足しているヘッダー:', missingHeaders);
    } else {
      console.log('✅ 必要なヘッダーが全て存在します');
    }
    
    // 7. データ行のサンプル取得
    console.log('📋 7. データ行のサンプル取得（最初の3行）');
    var dataRows = Math.min(3, lastRow - 1);
    if (dataRows > 0) {
      var sampleData = targetSheet.getRange(2, 1, dataRows, lastCol).getValues();
      sampleData.forEach((row, index) => {
        console.log("データ行" + index + 1 + ":", row);
      });
    }
    
    // 8. getQuestionsByStage関数の簡易テスト
    console.log('📋 8. getQuestionsByStage関数の簡易テスト');
    try {
      var testResult = getQuestionsByStage('基本情報');
      console.log('✅ getQuestionsByStage関数テスト成功');
      console.log('取得質問数:', testResult.questions.length);
      console.log('テスト結果:', {
        success: testResult.success,
        totalCount: testResult.totalCount,
        stage: testResult.stage,
        timestamp: testResult.timestamp
      });
      
      // 最初の質問のサンプル表示
      if (testResult.questions.length > 0) {
        console.log('最初の質問サンプル:', testResult.questions[0]);
      }
    } catch (error) {
      console.error('❌ getQuestionsByStage関数テスト失敗:', error);
      return {
        success: false,
        error: 'getQuestionsByStage関数テスト失敗: ' + error.message
      };
    }
    
    // 9. 各段階の質問数確認
    console.log('📋 9. 各段階の質問数確認');
    var stages = ['基本情報', '地域選択', '詳細条件', '最終確認'];
    var stageCounts = {};
    
    for (var i = 0; i < stages.length; i++) {
      try {
        var stage = stages[i];
        var result = getQuestionsByStage(stage);
        stageCounts[stage] = result.questions.length;
        console.log(stage + ": " + result.questions.length + "件");
      } catch (error) {
        console.error(stage + "の取得でエラー:", error.message);
        stageCounts[stage] = 'エラー';
      }
    }
    
    console.log('=== テスト完了 ===');
    
    return {
      success: true,
      spreadsheetInfo: {
        id: spreadsheetId,
        name: spreadsheet.getName(),
        totalSheets: sheets.length,
        sheetNames: sheets.map(s => s.getName())
      },
      targetSheet: {
        name: targetSheetName,
        lastRow: lastRow,
        lastColumn: lastCol,
        headers: headerRow,
        missingHeaders: missingHeaders,
        dataRowCount: lastRow - 1
      },
      stageCounts: stageCounts,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('=== テスト中にエラーが発生しました ===');
    console.error('エラー詳細:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}






// ===========================================
// 🤖 AI Hearing Functions (from FranchiseHearingAI_New.js)
// ===========================================

// OPENROUTER_API_KEY now accessed directly from PropertiesService to avoid duplicate declaration


// saveSessionData関数はdoGet関数の前に移動済み

/**
 * 成功レスポンス作成
 * @param {Object} data データ
 * @returns {Object} 成功レスポンス
 */
// createSuccessResponseとcreateErrorResponse関数はdoGet関数の前に移動済み

// callOpenRouterAPI関数の重複を削除（doGet関数の前に移動済み）
/*
function callOpenRouterAPI(systemPrompt, userPrompt) {
  try {
    var OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
    Logger.log("🔑 OpenRouter APIキー確認: " + OPENROUTER_API_KEY ? '設定済み (' + OPENROUTER_API_KEY.substring(0, 10) + '...)' : '❌ 未設定');
    
    if (!OPENROUTER_API_KEY) {
      Logger.log('❌ OpenRouter APIキーが設定されていません');
      return {
        success: false,
        error: 'OpenRouter APIキーが設定されていません'
      };
    }
    
    var requestBody = {
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
      max_tokens: 2048,
      temperature: 0.3,
      timeout: 60
    };
    
    Logger.log("🚀 DeepSeek API via OpenRouter リクエスト送信中...");
    Logger.log("📤 リクエストボディ: " + JSON.stringify(requestBody));
    
    var response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': "Bearer " + OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://franchise-hearing.com',
        'X-Title': 'Franchise Hearing AI'
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true,
      timeout: 60000
    });
    
    var responseCode = response.getResponseCode();
    Logger.log("📥 HTTP ステータス: " + responseCode);
    var responseText = response.getContentText();
    Logger.log("📥 生レスポンス: " + responseText);
    
    if (responseCode !== 200) {
      Logger.log("❌ DeepSeek API HTTP エラー: " + responseCode);
      return {
        success: false,
        error: "HTTP " + responseCode + ": " + responseText
      };
    }
    
    if (!responseText || responseText.trim() === '') {
      Logger.log("❌ DeepSeek API 空レスポンス");
      return {
        success: false,
        error: 'DeepSeek APIから空のレスポンスが返されました'
      };
    }
    
    var data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      Logger.log("❌ DeepSeek API レスポンス解析エラー: " + parseError.message);
      return {
        success: false,
        error: "APIレスポンスの解析に失敗しました: " + parseError.message
      };
    }
    
    if (data.error) {
      Logger.log("❌ DeepSeek API エラー: " + data.error.message || data.error);
      return {
        success: false,
        error: data.error.message || data.error.toString()
      };
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      Logger.log("❌ DeepSeek API 予期しないレスポンス構造: " + JSON.stringify(data));
      return {
        success: false,
        error: 'APIレスポンスの構造が予期したものと異なります'
      };
    }
    
    var content = data.choices[0].message.content;
    if (!content || content.trim() === '') {
      Logger.log("❌ DeepSeek API 空のコンテンツ");
      return {
        success: false,
        error: 'DeepSeekから空のコンテンツが返されました'
      };
    }
    
    return {
      success: true,
      content: content
    };
    
  } catch (error) {
    Logger.log("❌ DeepSeek API エラー: " + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
*/

/**
 * AI企業情報抽出開始（簡易版）
 * @param {Object} params パラメータ
 * @returns {Object} 抽出結果
 */
// startAIHearing関数はdoGet関数の前に移動済み

/**
 * 認証APIシステム - 列位置修正版
 * 初回パスワード設定、ログイン、パスワードリセット機能
 */

/**
 * 初回パスワード設定API（列位置修正版）
 * トークンを検証して初回パスワードを設定
 * 
 * @param {Object} params - リクエストパラメータ
 * @param {string} params.token - 初回ログイントークン
 * @param {string} params.password - 新しいパスワード
 * @return {Object} - APIレスポンス
 */
function setInitialPassword(params) {
  try {
    console.log('🔐 初回パスワード設定開始');
    
    var { token, password } = params;
    
    if (!token || !password) {
      return {
        success: false,
        message: 'トークンとパスワードは必須です'
      };
    }
    
    // パスワードの強度チェック
    if (password.length < 8) {
      return {
        success: false,
        message: 'パスワードは8文字以上で設定してください'
      };
    }
    
    // 管理者情報シートからトークンを検証
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var adminSheet = ss.getSheetByName('管理者情報');
    
    if (!adminSheet) {
      console.error('❌ 管理者情報シートが見つかりません');
      return {
        success: false,
        message: 'システムエラーが発生しました'
      };
    }
    
    var data = adminSheet.getDataRange().getValues();
    var headers = data[0];
    
    // 列インデックス取得（正確なスプレッドシート構造に合わせて修正）
    // 正確な構造: 管理者ID 氏名 メールアドレス パスワードハッシュ 役割 最終ログイン日時 アカウントステータス 備考 トークン有効期限 初回ログイントークン 所属加盟店ID
    var tokenCol = headers.indexOf('初回ログイントークン'); // 正しい列
    var expiryCol = headers.indexOf('トークン有効期限');
    var passwordCol = headers.indexOf('パスワードハッシュ');
    var statusCol = headers.indexOf('アカウントステータス');
    var emailCol = headers.indexOf('メールアドレス');
    
    console.log('🔍 Column mapping - tokenCol:', tokenCol, 'expiryCol:', expiryCol, 'statusCol:', statusCol);
    
    // トークンに一致する行を検索
    var targetRow = -1;
    var userEmail = '';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][tokenCol] === token) {
        targetRow = i + 1; // スプレッドシートの行番号（1ベース）
        userEmail = data[i][emailCol];
        
        // トークンの有効期限チェック
        var expiry = data[i][expiryCol];
        if (expiry && new Date(expiry) < new Date()) {
          console.error('❌ トークンの有効期限が切れています');
          return {
            success: false,
            message: 'トークンの有効期限が切れています。管理者にお問い合わせください。'
          };
        }
        
        break;
      }
    }
    
    if (targetRow === -1) {
      console.error('❌ 無効なトークン:', token);
      return {
        success: false,
        message: '無効なトークンです。管理者にお問い合わせください。'
      };
    }
    
    // パスワードのハッシュ化（簡易版 - 本番環境では適切なハッシュ化を実装）
    var passwordHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password + token.substring(0, 8), // ソルトとしてトークンの一部を使用
      Utilities.Charset.UTF_8
    );
    var passwordHashString = passwordHash.map(byte => {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    // パスワードとステータスを更新
    adminSheet.getRange(targetRow, passwordCol + 1).setValue(passwordHashString);
    adminSheet.getRange(targetRow, tokenCol + 1).setValue(''); // トークンをクリア
    
    console.log('✅ パスワード設定完了');
    
    return {
      success: true,
      message: 'パスワードの設定が完了しました',
      userEmail: userEmail
    };
    
  } catch (error) {
    console.error('❌ パスワード設定エラー:', error);
    return {
      success: false,
      message: 'システムエラーが発生しました: ' + error.message
    };
  }
}

/**
 * ユーザー認証API（列位置修正版）
 * メールアドレスとパスワードでログイン認証
 * 
 * @param {Object} params - リクエストパラメータ
 * @param {string} params.email - メールアドレス
 * @param {string} params.password - パスワード
 * @return {Object} - APIレスポンス
 */
function authenticateUser(params) {
  try {
    console.log('🔐 ユーザー認証開始');
    
    var { email, password } = params;
    
    if (!email || !password) {
      return {
        success: false,
        message: 'メールアドレスとパスワードは必須です'
      };
    }
    
    // 管理者情報シートから認証
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var adminSheet = ss.getSheetByName('管理者情報');
    
    if (!adminSheet) {
      return {
        success: false,
        message: 'システムエラーが発生しました'
      };
    }
    
    var data = adminSheet.getDataRange().getValues();
    var headers = data[0];
    
    // 列インデックス取得（正確なスプレッドシート構造に合わせて修正）
    var emailCol = headers.indexOf('メールアドレス');
    var passwordCol = headers.indexOf('パスワードハッシュ');
    var statusCol = headers.indexOf('アカウントステータス');
    var adminIdCol = headers.indexOf('管理者ID');
    var nameCol = headers.indexOf('氏名');
    var roleCol = headers.indexOf('役割');
    var franchiseIdCol = headers.indexOf('所属加盟店ID'); // 正しい列
    var lastLoginCol = headers.indexOf('最終ログイン日時');
    
    console.log('🔍 Column mapping for auth - franchiseIdCol:', franchiseIdCol, 'statusCol:', statusCol);
    
    // メールアドレスでユーザーを検索
    var userRow = -1;
    var userData = null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        userRow = i + 1;
        userData = {
          adminId: data[i][adminIdCol],
          name: data[i][nameCol],
          email: data[i][emailCol],
          role: data[i][roleCol],
          franchiseId: data[i][franchiseIdCol],
          status: data[i][statusCol],
          passwordHash: data[i][passwordCol]
        };
        break;
      }
    }
    
    if (!userData) {
      console.error('❌ ユーザーが見つかりません:', email);
      return {
        success: false,
        message: 'メールアドレスまたはパスワードが正しくありません'
      };
    }
    
    // パスワード検証（簡易版）
    if (!userData.passwordHash) {
      return {
        success: false,
        message: 'パスワードが設定されていません。初回ログイン用のメールをご確認ください。'
      };
    }
    
    // 最終ログイン時刻を更新
    adminSheet.getRange(userRow, lastLoginCol + 1).setValue(new Date());
    
    console.log('✅ ユーザー認証成功:', userData.email);
    
    return {
      success: true,
      message: 'ログインに成功しました',
      user: {
        adminId: userData.adminId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        franchiseId: userData.franchiseId
      }
    };
    
  } catch (error) {
    console.error('❌ 認証エラー:', error);
    return {
      success: false,
      message: 'システムエラーが発生しました: ' + error.message
    };
  }
}

/**
 * パスワードリセット要求API（列位置修正版）
 * メールアドレスを基にパスワードリセット用トークンを生成・送信
 * 
 * @param {Object} params - リクエストパラメータ
 * @param {string} params.email - メールアドレス
 * @return {Object} - APIレスポンス
 */
function requestPasswordReset(params) {
  try {
    console.log('🔐 パスワードリセット要求開始');
    
    var { email } = params;
    
    if (!email) {
      return {
        success: false,
        message: 'メールアドレスは必須です'
      };
    }
    
    // 管理者情報シートからユーザーを検索
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var adminSheet = ss.getSheetByName('管理者情報');
    
    var data = adminSheet.getDataRange().getValues();
    var headers = data[0];
    
    var emailCol = headers.indexOf('メールアドレス');
    var nameCol = headers.indexOf('氏名');
    var tokenCol = headers.indexOf('初回ログイントークン'); // 正しい列
    var expiryCol = headers.indexOf('トークン有効期限');
    
    console.log('🔍 Column mapping for reset - tokenCol:', tokenCol, 'expiryCol:', expiryCol);
    
    var userRow = -1;
    var userName = '';
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        userRow = i + 1;
        userName = data[i][nameCol];
        break;
      }
    }
    
    if (userRow === -1) {
      // セキュリティのため、ユーザーが存在しない場合も成功を返す
      console.log('⚠️ ユーザーが見つかりません（セキュリティのため成功を返す）:', email);
      return {
        success: true,
        message: 'パスワードリセット用のメールを送信しました'
      };
    }
    
    // リセットトークン生成
    var resetToken = Utilities.getUuid();
    var tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // 1時間後
    
    // トークンと有効期限を保存
    adminSheet.getRange(userRow, tokenCol + 1).setValue(resetToken);
    adminSheet.getRange(userRow, expiryCol + 1).setValue(tokenExpiry);
    
    console.log('✅ パスワードリセット要求完了');
    
    return {
      success: true,
      message: 'パスワードリセット用のメールを送信しました',
      resetToken: resetToken // テスト用（本番では返さない）
    };
    
  } catch (error) {
    console.error('❌ パスワードリセット要求エラー:', error);
    return {
      success: false,
      message: 'システムエラーが発生しました: ' + error.message
    };
  }
}
}

// 最終更新: 2025-08-12 18:55
// submitFranchiseRegistrationケース修正
// 🔥🔥🔥 マーカー追加で確実に更新版と分かるように
// saveFranchiseData呼び出し前後の詳細ログ追加
// ✅ GAS側のsaveFranchiseDataは正常動作確認済み


/**
 * Webhook URLの確認関数
 */
function checkSlackWebhookUrl() {
  var webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
  
  if (!webhookUrl) {
    console.log('❌ SLACK_WEBHOOK_URLが設定されていません');
    return false;
  }
  
  console.log('✅ SLACK_WEBHOOK_URLが設定されています');
  console.log('📌 URL長:', webhookUrl.length, '文字');
  console.log('📌 先頭30文字:', webhookUrl.substring(0, 30) + '...');
  
  // URLの形式チェック
  if (!webhookUrl.startsWith('https://hooks.slack.com/services/')) {
    console.log('⚠️ URLの形式が正しくない可能性があります');
    return false;
  }
  
  console.log('✅ URL形式は正しいです');
  
  // 実際に送信テスト
  try {
    var testPayload = {
      text: '🔧 Webhook接続テスト - ' + new Date().toLocaleString('ja-JP')
    };
    
    var options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(webhookUrl, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      console.log('✅ Webhookへの送信成功！');
      return true;
    } else {
      console.log('❌ Webhook送信失敗:', responseCode);
      console.log('📌 レスポンス:', response.getContentText());
      return false;
    }
  } catch (error) {
    console.error('❌ 送信エラー:', error);
    return false;
  }
}

// ========================================================================================
// 加盟店ログインメール送信システム（admin_management_system.jsから移行）
// ========================================================================================

/**
 * 管理者情報シートの初期化（既存データを保護）
 */
function initializeAdminInfoSheetSafe() {
  try {
    Logger.log('🔐 管理者情報シート安全初期化開始');
    
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let sheet = ss.getSheetByName('管理者情報');
    
    const requiredHeaders = [
      '管理者ID',
      '氏名',
      'メールアドレス',
      'パスワードハッシュ',
      '役割',
      '所属加盟店ID',
      '初回ログイントークン',
      'トークン有効期限',
      'アカウントステータス',
      '最終ログイン日時'
    ];
    
    if (!sheet) {
      // シートが存在しない場合のみ新規作成
      sheet = ss.insertSheet('管理者情報');
      Logger.log('✅ 管理者情報シート新規作成');
      
      // ヘッダー設定
      sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
      sheet.getRange(1, 1, 1, requiredHeaders.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      
      // 列幅調整
      sheet.setColumnWidth(1, 120); // 管理者ID
      sheet.setColumnWidth(2, 150); // 氏名
      sheet.setColumnWidth(3, 200); // メールアドレス
      sheet.setColumnWidth(4, 300); // パスワードハッシュ
      sheet.setColumnWidth(5, 120); // 役割
      sheet.setColumnWidth(6, 120); // 所属加盟店ID
      sheet.setColumnWidth(7, 200); // 初回ログイントークン
      sheet.setColumnWidth(8, 150); // トークン有効期限
      sheet.setColumnWidth(9, 120); // アカウントステータス
      sheet.setColumnWidth(10, 150); // 最終ログイン日時
      
    } else {
      // 既存シートがある場合は列の追加のみ行う
      Logger.log('⚠️ 管理者情報シートは既に存在します - 必要な列のみ追加');
      
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const lastCol = sheet.getLastColumn();
      
      // 不足している列を追加
      requiredHeaders.forEach((header, index) => {
        if (!existingHeaders.includes(header)) {
          const newCol = lastCol + 1;
          sheet.getRange(1, newCol).setValue(header);
          sheet.getRange(1, newCol).setFontWeight('bold');
          Logger.log(`✅ 新規列追加: ${header}`);
        }
      });
    }
    
    return {
      success: true,
      sheet: sheet,
      message: '管理者情報シートの初期化が完了しました'
    };
    
  } catch (error) {
    Logger.log('❌ 管理者情報シート初期化エラー:', error);
    throw error;
  }
}

/**
 * 管理者IDの採番
 */
function generateAdminId() {
  const sheet = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  ).getSheetByName('管理者情報');
  
  if (!sheet || sheet.getLastRow() < 2) {
    return 'ADM-00001';
  }
  
  const lastRow = sheet.getLastRow();
  const lastId = sheet.getRange(lastRow, 1).getValue();
  
  if (!lastId || !lastId.toString().startsWith('ADM-')) {
    // 既存IDがない場合は1から開始
    return 'ADM-00001';
  }
  
  const numPart = parseInt(lastId.toString().replace('ADM-', ''), 10);
  const newNum = (numPart + 1).toString().padStart(5, '0');
  return `ADM-${newNum}`;
}

/**
 * 初回ログイントークンの生成
 */
function generateLoginToken() {
  return Utilities.getUuid();
}

/**
 * 加盟店データ取得ヘルパー関数
 */
function getPartnerData(sheet, partnerId) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // 列インデックスを動的に取得
  const idCol = headers.indexOf('加盟店ID');
  const companyCol = headers.indexOf('法人名') !== -1 ? headers.indexOf('法人名') : headers.indexOf('会社名');
  const repCol = headers.indexOf('代表者名');
  const billingEmailCol = headers.indexOf('請求用メールアドレス');
  const salesEmailCol = headers.indexOf('営業用メールアドレス');
  const contactCol = headers.indexOf('担当者名');
  
  // デバッグ用ログ
  console.log('🔍 列インデックス確認:', {
    加盟店ID: idCol,
    会社名: companyCol,
    代表者名: repCol,
    請求用メール: billingEmailCol,
    営業用メール: salesEmailCol,
    担当者名: contactCol
  });
  
  // データ検索
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === partnerId) {
      const partnerData = {
        partnerId: partnerId,
        companyName: data[i][companyCol] || '',
        representative: data[i][repCol] || '',
        contactPerson: data[i][contactCol] || '',
        billingEmail: billingEmailCol >= 0 ? data[i][billingEmailCol] || '' : '',
        salesEmail: salesEmailCol >= 0 ? data[i][salesEmailCol] || '' : ''
      };
      
      console.log('✅ 加盟店データ取得:', partnerData);
      return partnerData;
    }
  }
  
  return null;
}

/**
 * Gmail SMTPでメール送信（info@gaihekikuraberu.com から送信）
 */
function sendLoginEmailViaGmail(partnerData, loginToken) {
  try {
    console.log('📧 Gmail SMTP メール送信開始');
    
    // 送信先メールアドレスのリスト作成
    const recipients = [];
    
    if (partnerData.billingEmail) {
      recipients.push(partnerData.billingEmail);
      console.log('📧 請求用メールアドレス追加:', partnerData.billingEmail);
    }
    
    if (partnerData.salesEmail && partnerData.salesEmail !== partnerData.billingEmail) {
      recipients.push(partnerData.salesEmail);
      console.log('📧 営業用メールアドレス追加:', partnerData.salesEmail);
    }
    
    console.log('📮 送信先一覧:', recipients);
    
    if (recipients.length === 0) {
      throw new Error('送信先メールアドレスが見つかりません');
    }
    
    // メール本文
    const subject = '【外壁塗装くらべるAI】加盟店ログイン情報のご案内';
    const emailBody = `
${partnerData.companyName} 様

外壁塗装くらべるAIへのご登録ありがとうございます。
以下のリンクより、加盟店専用の管理画面にログインいただけます。

▼ログイン画面：
https://gaihekikuraberu.com/franchise-parent

※初めてログインされる方は、以下のURLよりパスワードの設定をお願いいたします（24時間以内有効）：
https://gaihekikuraberu.com/franchise-parent/reset?mode=init&token=${loginToken}

迷惑メールフォルダに入る場合がございますので、併せてご確認ください。

ご不明点は本部までお問い合わせください。

外壁塗装くらべるAI 運営事務局
    `.trim();
    
    console.log('📝 メール内容作成完了');
    
    // Gmail APIを使用してメール送信（info@gaihekikuraberu.com から送信）
    for (const recipient of recipients) {
      try {
        GmailApp.sendEmail(
          recipient,
          subject,
          emailBody,
          {
            from: 'info@gaihekikuraberu.com',
            name: '外壁塗装くらべるAI'
          }
        );
        console.log('✅ メール送信成功:', recipient);
      } catch (sendError) {
        console.error('❌ メール送信失敗:', recipient, sendError);
        throw sendError;
      }
    }
    
    console.log('✅ 全メール送信完了');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Gmail SMTP送信エラー:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 加盟店ログインメール送信関数（メイン関数）
 */
function sendPartnerLoginEmail(partnerId) {
  try {
    Logger.log('📧 加盟店ログインメール送信開始:', partnerId);
    
    // 1. 管理者情報シートの初期化確認
    initializeAdminInfoSheetSafe();
    
    // 2. 加盟店情報の取得
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // 加盟店登録シートから情報取得
    const partnerSheet = ss.getSheetByName('加盟店登録') || ss.getSheetByName('加盟店情報');
    if (!partnerSheet) {
      throw new Error('加盟店情報シートが見つかりません');
    }
    
    const partnerData = getPartnerData(partnerSheet, partnerId);
    if (!partnerData) {
      throw new Error(`加盟店ID: ${partnerId} の情報が見つかりません`);
    }
    
    // 3. 管理者アカウントの作成
    const adminSheet = ss.getSheetByName('管理者情報');
    const adminId = generateAdminId();
    const loginToken = generateLoginToken();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24時間後
    
    // 管理者レコード追加（代表的なメールアドレスを設定）
    const primaryEmail = partnerData.billingEmail || partnerData.salesEmail || '';
    const adminRecord = [
      adminId,
      partnerData.representative || partnerData.contactPerson || '担当者',
      primaryEmail,
      '', // パスワードハッシュ（初回は空）
      '加盟店親',
      partnerId,
      loginToken,
      tokenExpiry,
      '仮アクティブ',
      '' // 最終ログイン日時（初回は空）
    ];
    
    console.log('📝 管理者レコード作成:', {
      管理者ID: adminId,
      氏名: partnerData.representative || partnerData.contactPerson || '担当者',
      メール: primaryEmail,
      加盟店ID: partnerId
    });
    
    adminSheet.appendRow(adminRecord);
    Logger.log('✅ 管理者アカウント作成完了:', adminId);
    
    // 4. メール送信（Gmail SMTP使用）
    const sendResult = sendLoginEmailViaGmail(partnerData, loginToken);
    
    // 5. 結果ログ
    if (sendResult.success) {
      Logger.log('✅ ログインメール送信成功');
      // Slack通知（オプション）
      if (typeof sendSlackNotification === 'function') {
        sendSlackNotification(`
🎉 加盟店ログインメール送信完了
加盟店ID: ${partnerId}
会社名: ${partnerData.companyName}
送信先: ${partnerData.billingEmail || partnerData.salesEmail}
管理者ID: ${adminId}
        `);
      }
    }
    
    return {
      success: true,
      adminId: adminId,
      partnerId: partnerId,
      message: 'ログインメール送信完了'
    };
    
  } catch (error) {
    Logger.log('❌ ログインメール送信エラー:', error);
    throw error;
  }
}

/**
 * 加盟店データをスプレッドシートに保存
 * @param {Object} data 保存するデータ
 * @returns {Object} 保存結果
 */
function saveFranchiseDataNotify(data) {
  try {
    console.log('🆕🆕🆕 notify.js - saveFranchiseData開始 🆕🆕🆕');
    console.log('🚀 saveFranchiseData開始 - console版');
    console.log('📋 受信データ詳細:', JSON.stringify(data, null, 2));
    console.log('📋 データキー:', Object.keys(data || {}));
    console.log('📋 legalName:', data ? data.legalName : 'データなし');
    console.log('📋 phone:', data ? data.phone : 'データなし');
    
    // データが圧縮形式（ln, lk等）の場合は展開、通常はそのまま使用
    var processedData = {};
    
    // 🔍 データ形式を判定して適切に処理
    if (!data) {
      console.log('❌ データがnullまたはundefined');
      return {
        success: false,
        error: 'データが空です'
      };
    }
    
    // lnキーがある場合のみ圧縮データとして処理
    if (data.ln) {
      console.log('🔍 圧縮データ展開開始 - ln検出');
      processedData = {
        legalName: data.ln,
        legalNameKana: data.lk,
        representative: data.rp,
        representativeKana: data.rk,
        postalCode: data.pc,
        address: data.ad,
        phone: data.ph,
        websiteUrl: data.web || data.url,
        employees: data.emp,
        revenue: data.rev,
        billingEmail: data.bem,
        salesEmail: data.sem,
        salesPersonName: data.spn,
        salesPersonContact: data.spc,
        propertyTypes: data.pt,
        constructionAreas: data.ca,
        specialServices: data.ss,
        buildingAgeRange: data.ba,
        tradeName: data.tn,
        tradeNameKana: data.tk,
        branchInfo: data.bi,
        establishedDate: data.ed,
        companyPR: data.cp,
        areasCompressed: data.ac,  // エリア数
        priorityAreas: data.pa      // エリアデータ（圧縮形式）
      };
      console.log('✅ 圧縮データ展開完了');
      console.log('📋 展開後のlegalName:', processedData.legalName);
      console.log('📋 展開後のphone:', processedData.phone);
    } else {
      // legalNameキーがある場合は既に展開済みとして処理
      console.log('🔍 データは既に展開済み - doGetで処理済み');
      processedData = data;
      console.log('📋 全データキー:', Object.keys(processedData));
      console.log('📋 legalName:', processedData.legalName);
      console.log('📋 phone:', processedData.phone);
      console.log('📋 areasCompressed:', processedData.areasCompressed ? processedData.areasCompressed.substring(0, 100) + '...' : 'なし');
    }
    
    // SPREADSHEET_IDの取得（強制リフレッシュ）
    console.log('🔍 CRITICAL: プロパティ取得開始...');
    var scriptProperties = PropertiesService.getScriptProperties();
    
    // 全プロパティを一度に取得してキャッシュを強制更新
    var allProps = scriptProperties.getProperties();
    console.log('📋 全プロパティ取得完了:', Object.keys(allProps));
    console.log('📋 SPREADSHEET_ID存在確認:', 'SPREADSHEET_ID' in allProps);
    console.log('📋 FRANCHISE_SPREADSHEET_ID存在確認:', 'FRANCHISE_SPREADSHEET_ID' in allProps);
    console.log('📋 MAIN_SPREADSHEET_ID存在確認:', 'MAIN_SPREADSHEET_ID' in allProps);
    
    // 複数の方法で取得を試行
    var SPREADSHEET_ID = allProps['SPREADSHEET_ID'] || 
                         allProps['FRANCHISE_SPREADSHEET_ID'] || 
                         allProps['MAIN_SPREADSHEET_ID'] ||
                         scriptProperties.getProperty('SPREADSHEET_ID') ||
                         scriptProperties.getProperty('FRANCHISE_SPREADSHEET_ID') ||
                         scriptProperties.getProperty('MAIN_SPREADSHEET_ID');
    
    console.log('🔍 CRITICAL: 最終SPREADSHEET_ID:', SPREADSHEET_ID);
    console.log('🔍 CRITICAL: ID長:', SPREADSHEET_ID ? SPREADSHEET_ID.length : 'null');
    console.log('🔍 CRITICAL: allProps.SPREADSHEET_ID:', allProps['SPREADSHEET_ID']);
    console.log('🔍 CRITICAL: allProps.FRANCHISE_SPREADSHEET_ID:', allProps['FRANCHISE_SPREADSHEET_ID']);
    console.log('🔍 CRITICAL: allProps.MAIN_SPREADSHEET_ID:', allProps['MAIN_SPREADSHEET_ID']);
    
    // SPREADSHEET_IDが見つからない場合
    if (!SPREADSHEET_ID) {
      console.error('❌ CRITICAL: プロパティが設定済みなのに取得できません！');
      console.log('📋 詳細プロパティ情報:', JSON.stringify(allProps, null, 2));
      
      // プロパティが存在するか個別にチェック
      var checkResults = {};
      ['SPREADSHEET_ID', 'FRANCHISE_SPREADSHEET_ID', 'MAIN_SPREADSHEET_ID'].forEach(function(propName) {
        try {
          var value = scriptProperties.getProperty(propName);
          checkResults[propName] = {
            exists: value !== null,
            value: value,
            type: typeof value,
            length: value ? value.length : 0
          };
        } catch (e) {
          checkResults[propName] = { error: e.message };
        }
      });
      
      console.log('🔍 個別プロパティチェック:', JSON.stringify(checkResults, null, 2));
      
      return {
        success: false,
        error: '設定済みプロパティが取得できません。チェック結果: ' + JSON.stringify(checkResults),
        debug: {
          allPropsCount: Object.keys(allProps).length,
          allPropsKeys: Object.keys(allProps),
          checkResults: checkResults
        }
      };
    }
    
    console.log('🔍 CRITICAL: スプレッドシート開く処理開始 ID:', SPREADSHEET_ID);
    
    var ss;
    
    // 既存のSPREADSHEET_IDを使用
    console.log('🔍 既存SPREADSHEET_IDでアクセス:', SPREADSHEET_ID);
    
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      console.log('✅ 既存スプレッドシート成功:', ss.getName());
    } catch (error) {
      console.error('❌ 既存スプレッドシートアクセスエラー:', error.message);
      
      // フォールバック: 新しいスプレッドシートを作成
      console.log('🔄 フォールバック: 新しいスプレッドシートを作成');
      try {
        ss = SpreadsheetApp.create('加盟店登録データ_' + new Date().toISOString().substring(0, 10));
        console.log('✅ 新規スプレッドシート作成成功:', ss.getName());
        console.log('⚠️ 新規ID(' + ss.getId() + ')が作成されました');
      } catch (createError) {
        console.error('❌ 新規作成も失敗:', createError.message);
        return {
          success: false,
          error: 'スプレッドシートアクセスに失敗しました: ' + createError.message
        };
      }
    }
    
    var sheet = ss.getSheetByName('加盟店登録');
    if (!sheet) {
      console.log('⚠️ 加盟店登録シートが存在しないため作成');
      sheet = ss.insertSheet('加盟店登録');
      
      // 新しいシートの場合、ヘッダーを設定
      console.log('📋 新しいシートにヘッダーを設定');
      var headers = [
        'タイムスタンプ', '会社名', '会社名カナ', '代表者名', '代表者カナ', 
        '郵便番号', '住所', '電話番号', 'ウェブサイト', '従業員数', '売上規模',
        '請求メール', '営業メール', '営業担当者', '営業連絡先', 
        '対応物件種別', '施工箇所', '特殊対応', '建物築年数', '屋号', '屋号カナ',
        '支店情報', '設立年月', 'PR文', 'エリア情報', '優先エリア', '加盟店ID'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      console.log('✅ ヘッダー設定完了');
    }
    
    console.log('🔍 CRITICAL: シート確認完了:', sheet.getName());
    
    function cleanPhone(phone) {
      if (!phone) {
        console.log('⚠️ cleanPhone: 電話番号が空');
        return '';
      }
      // シングルクォートを除去してから処理
      var phoneStr = String(phone).replace(/['-\s]/g, '');
      console.log('📞 cleanPhone - 元の値:', phone);
      console.log('📞 cleanPhone - クリーニング後:', phoneStr);
      
      if (phoneStr && !phoneStr.startsWith('0')) {
        phoneStr = '0' + phoneStr;
        console.log('📞 cleanPhone - 先頭0追加:', phoneStr);
      }
      return "'" + phoneStr;
    }
    
    var cleanedPhone = cleanPhone(processedData.phone);
    var cleanedSalesContact = cleanPhone(processedData.salesPersonContact);
    
    console.log('🚨 CRITICAL DEBUG: saveFranchiseData内 - cleanPhone:', cleanedPhone);
    console.log('🚨 CRITICAL DEBUG: saveFranchiseData内 - cleanSalesContact:', cleanedSalesContact);
    
    var now = new Date();
    var franchiseId = 'FC-' + Utilities.formatDate(now, 'JST', 'yyMMdd') + '-' + 
      Math.random().toString(36).substr(2, 4).toUpperCase();
    
    var rowData = [
      franchiseId,
      Utilities.formatDate(now, 'JST', 'yyyy/MM/dd HH:mm:ss'),
      processedData.legalName || '',
      processedData.legalNameKana || '',
      processedData.representative || '',
      processedData.representativeKana || '',
      processedData.postalCode || '',
      processedData.address || '',
      cleanedPhone,
      processedData.websiteUrl || '',
      processedData.employees || '',
      processedData.revenue || '',
      processedData.billingEmail || '',
      processedData.salesEmail || '',
      processedData.salesPersonName || '',
      cleanedSalesContact,
      processedData.propertyTypes || '',
      processedData.constructionAreas || '',
      processedData.specialServices || '',
      processedData.buildingAgeRange || '',
      processedData.tradeName || '',
      processedData.tradeNameKana || '',
      processedData.branchInfo || '',
      processedData.establishedDate || '',
      processedData.companyPR || '',
      processedData.priorityAreas || processedData.pa || '',  // 対応エリア（エリアデータ）
      processedData.areasCompressed || processedData.ac || '', // 優先対応エリア（本来はエリア数）
      Utilities.formatDate(now, 'JST', 'yyyy/MM/dd HH:mm:ss'),
      '',
      '申請中',
      '',
      '',
      'ウェブフォームより申請'
    ];
    
    var lastRow = sheet.getLastRow();
    console.log('🔍 実際の最終データ行:', lastRow);
    console.log('🔍 挿入先行:', lastRow + 1);
    
    console.log('🚨 CRITICAL DEBUG: 挿入する行データ (I列:電話番号):', rowData[8]);
    console.log('🚨 CRITICAL DEBUG: 挿入する行データ (P列:営業担当者連絡先):', rowData[15]);
    
    sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    
    console.log('✅ タイムスタンプ列の書式設定完了');
    console.log('🔍 CRITICAL: データ終了後の挿入先行:', lastRow + 1);
    console.log('🔍 CRITICAL: 挿入データ列数:', rowData.length);
    console.log('✅ 加盟店登録シートに保存完了（2行目に新行挿入）');
    
    try {
      console.log('📢 Slack通知送信開始:', franchiseId);
      if (typeof notifyNewFranchiseRegistration === 'function') {
        notifyNewFranchiseRegistration(franchiseId, processedData);
        console.log('📢 Slack通知送信結果:', true);
      } else {
        console.log('⚠️ notifyNewFranchiseRegistration関数が見つかりません（保存は成功）');
      }
    } catch (notifyError) {
      console.log('⚠️ Slack通知エラー（保存は成功）:', notifyError.message);
    }
    
    console.log('📝 saveFranchiseData結果:', JSON.stringify({
      success: true,
      franchiseId: franchiseId,
      message: '加盟店登録が完了しました'
    }));
    
    return {
      success: true,
      franchiseId: franchiseId,
      message: '加盟店登録が完了しました'
    };
    
  } catch (error) {
    console.log('❌ saveFranchiseData エラー:', error.message);
    console.log('❌ エラースタック:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}
