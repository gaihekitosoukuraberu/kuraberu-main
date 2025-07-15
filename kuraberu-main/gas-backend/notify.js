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

// ❌ 削除済み: OpenAI GPT関連の関数を削除



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
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') || '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';
    
    // 1. 質問フローを取得
    const questionFlowUrl = 'https://raw.githubusercontent.com/gaihekitosoukuraberu/kuraberu-mainchatbot/main/01_question_flow.md';
    const salesTalkUrl = 'https://raw.githubusercontent.com/gaihekitosoukuraberu/kuraberu-mainchatbot/main/02_sales_talk_templates.md';
    const closingPatternsUrl = 'https://raw.githubusercontent.com/gaihekitosoukuraberu/kuraberu-mainchatbot/main/03_closing_patterns.md';
    
    console.log('🔑 Token exists:', !!token);
    
    // 全てのMDファイルを取得
    const allData = {};
    
    // 1. 質問フローを取得
    console.log('📄 1/3: 質問フロー取得中...');
    let response;
    try {
      response = UrlFetchApp.fetch(questionFlowUrl, {
        headers: { 
          'Authorization': `token ${token}`,
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
      const contentsUrl = 'https://api.github.com/repos/gaihekitosoukuraberu/kuraberu-mainchatbot/contents/01_question_flow.md';
      const contentsResponse = UrlFetchApp.fetch(contentsUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KuraberuAI-GAS'
        },
        muteHttpExceptions: true
      });
      
      if (contentsResponse.getResponseCode() === 200) {
        const contentsData = JSON.parse(contentsResponse.getContentText());
        // Base64デコード
        const content = Utilities.base64Decode(contentsData.content);
        const markdown = Utilities.newBlob(content).getDataAsString();
        console.log('✅ Contents API経由で取得成功:', markdown.length, '文字');
        
        // 以降の処理を続行
        const questions = parseGitHubMarkdown(markdown);
        console.log('✅ 質問解析完了:', questions.length, '個');
        updateSpreadsheetDirectly(questions);
        
        const cache = CacheService.getScriptCache();
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
      throw new Error(`GitHub取得失敗: ${response.getResponseCode()} - ${response.getContentText()}`);
    }
    
    const questionFlowMd = response.getContentText();
    console.log('✅ 質問フロー取得成功:', questionFlowMd.length, '文字');
    
    // 2. 豆知識・安心トークを取得
    console.log('📄 2/3: 豆知識・安心トーク取得中...');
    const salesTalkResponse = UrlFetchApp.fetch(salesTalkUrl, {
      headers: { 
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'KuraberuAI-GAS'
      },
      muteHttpExceptions: true
    });
    
    const salesTalkMd = salesTalkResponse.getResponseCode() === 200 ? salesTalkResponse.getContentText() : '';
    console.log('✅ 豆知識取得:', salesTalkMd.length, '文字');
    
    // 3. クロージングパターンを取得
    console.log('📄 3/3: クロージングパターン取得中...');
    const closingResponse = UrlFetchApp.fetch(closingPatternsUrl, {
      headers: { 
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.raw',
        'User-Agent': 'KuraberuAI-GAS'
      },
      muteHttpExceptions: true
    });
    
    const closingMd = closingResponse.getResponseCode() === 200 ? closingResponse.getContentText() : '';
    console.log('✅ クロージング取得:', closingMd.length, '文字');
    
    // MDを解析（3ファイル統合）
    const questions = parseAllMarkdownFiles(questionFlowMd, salesTalkMd, closingMd);
    console.log('✅ 統合解析完了:', questions.length, '個');
    
    // スプレッドシートに反映（拡張カラム対応）
    updateSpreadsheetWithExtendedColumns(questions);
    
    // 変更をGASのデプロイに即座に反映させるためのキャッシュクリア
    const cache = CacheService.getScriptCache();
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName('統合_質問豆知識管理');
    
    if (!sourceSheet) {
      console.log('⚠️ バックアップ対象シートが見つかりません');
      return;
    }
    
    // 現在の日時を取得
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const backupSheetName = `バックアップ_${timestamp}`;
    
    console.log(`📦 バックアップ作成開始: ${backupSheetName}`);
    
    // バックアップシートを作成
    const backupSheet = ss.insertSheet(backupSheetName);
    
    // 元のシートの全データを取得
    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();
    
    if (lastRow > 0 && lastCol > 0) {
      const sourceData = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
      
      // バックアップシートにデータを貼り付け
      backupSheet.getRange(1, 1, lastRow, lastCol).setValues(sourceData);
      
      // 書式もコピー
      const sourceFormatting = sourceSheet.getRange(1, 1, lastRow, lastCol);
      const backupFormatting = backupSheet.getRange(1, 1, lastRow, lastCol);
      sourceFormatting.copyTo(backupFormatting, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    }
    
    console.log(`✅ バックアップ作成完了: ${backupSheetName}`);
    
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    // バックアップシートのみを抽出
    const backupSheets = sheets.filter(sheet => 
      sheet.getName().startsWith('バックアップ_')
    );
    
    // 名前（タイムスタンプ）でソート（新しい順）
    backupSheets.sort((a, b) => b.getName().localeCompare(a.getName()));
    
    // 5個を超える古いバックアップを削除
    const sheetsToDelete = backupSheets.slice(5);
    
    sheetsToDelete.forEach(sheet => {
      try {
        ss.deleteSheet(sheet);
        console.log(`🗑️ 古いバックアップを削除: ${sheet.getName()}`);
      } catch (deleteError) {
        console.error(`❌ バックアップ削除エラー: ${sheet.getName()}`, deleteError);
      }
    });
    
    console.log(`✅ バックアップクリーンアップ完了: ${backupSheets.length}個中${sheetsToDelete.length}個を削除`);
    
  } catch (error) {
    console.error('❌ バックアップクリーンアップエラー:', error);
  }
}

/**
 * 3つのMDファイルを統合解析
 */
function parseAllMarkdownFiles(questionFlowMd, salesTalkMd, closingMd) {
  // 1. 質問フローを解析
  const questions = parseGitHubMarkdown(questionFlowMd);
  
  // 2. 豆知識・安心トークを解析して質問にマージ
  const salesTalkData = parseSalesTalkMarkdown(salesTalkMd);
  
  
  questions.forEach(q => {
    // MDファイルは実際のスプレッドシート質問IDを使用（Q008, Q011, Q014, Q015, Q900-Q903, C999）
    const questionId = q.id;
    
    if (salesTalkData[questionId]) {
      const knowledgeData = salesTalkData[questionId];
      q.knowledgeTitle = knowledgeData.titleHint || knowledgeData.title || `${q.id}の豆知識`;
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
      console.log(`⚠️ 豆知識なし: ${q.id}`);
    }
  });
  
  // 3. クロージングパターンを解析して追加
  const closingData = parseClosingPatterns(closingMd);
  Object.keys(closingData).forEach(closingId => {
    const existingQ = questions.find(q => q.id === closingId);
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
  const salesTalkData = {};
  const lines = markdown.split('\n');
  
  let currentQuestionId = null;
  let currentSection = null;
  let buffer = [];
  let currentTitle = null; // タイトルを保持
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // ## Q004（築年数）のような形式を検出
    if (line.match(/^##\s*[QC]\d+/)) {
      // 前のデータを保存
      if (currentQuestionId && currentSection && buffer.length > 0) {
        salesTalkData[currentQuestionId][currentSection] = buffer.join('\n').trim();
      }
      
      // 新しい質問IDとタイトルを抽出
      const match = line.match(/([QC]\d+)[^（]*(?:（([^）]+)）)?/);
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
      const cleanLine = line.startsWith('>') ? line.substring(1).trim() : line;
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
      salesTalkData[qId].title = `${qId}の豆知識`;
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
  const closingData = {};
  const lines = markdown.split('\n');
  
  let currentQuestionId = null;
  let buffer = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // ## Q900形式を検出
    if (line.match(/^##\s*Q\d/)) {
      // 前のデータを保存
      if (currentQuestionId && buffer.length > 0) {
        closingData[currentQuestionId] = {
          pattern: buffer.join('\n').trim()
        };
      }
      
      // 新しい質問ID
      const match = line.match(/Q(\d+)/);
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
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('統合_質問豆知識管理');
    
    if (!sheet) {
      console.log('⚠️ シート作成');
      sheet = ss.insertSheet('統合_質問豆知識管理');
    }
    
    // 拡張ヘッダー設定
    const headers = [
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
    const data = questions.map((q, index) => {
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
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('統合_質問豆知識管理');
    
    if (!sheet) {
      console.log('⚠️ シート作成');
      sheet = ss.insertSheet('統合_質問豆知識管理');
    }
    
    // ヘッダー設定
    const headers = [
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
    const data = questions.map((q, index) => {
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
  const questions = [];
  const lines = markdown.split('\n');
  
  
  let currentStage = '第1段階'; // デフォルト段階
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // ## ■ 第1段階、第2段階などを検出
    if (line.match(/^##\s*■\s*第(\d)段階/)) {
      const stageMatch = line.match(/第(\d)段階/);
      if (stageMatch) {
        currentStage = `第${stageMatch[1]}段階`;
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
      const questionMatch = line.match(/Q(\d+(?:-\d+)?)/);
      if (!questionMatch) {
        console.log('⚠️ 質問ID抽出失敗');
        continue;
      }
      
      let questionId = questionMatch[1];
      
      // Q1-2 → Q012 に変換
      if (questionId.includes('-')) {
        const parts = questionId.split('-');
        questionId = parts[0].padStart(2, '0') + parts[1];
      }
      questionId = 'Q' + questionId.padStart(3, '0');
      
      let questionText = '';
      const choices = [];
      const branches = [];
      
      // Q999特別処理
      if (questionId === 'Q999') {
        questionText = 'その他、未ヒアリング事項をお伺いします。';
        // Q999は複数ページのフォーム形式なので選択肢なし
        console.log('🎯 Q999特別処理: 複数ページフォーム形式');
      } else {
        // 通常の質問内容を取得
        for (let j = i + 1; j < lines.length && j < i + 30; j++) {
          const nextLine = lines[j].trim();
          
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
            const choiceText = nextLine.replace(/^\d+\.\s+/, '');
            
            if (choiceText.includes('→')) {
              const parts = choiceText.split('→');
              const choice = parts[0].trim();
              const branchText = parts[1].trim();
              
              choices.push(choice);
              
              // 分岐先のQ番号を抽出・正規化
              const branchMatch = branchText.match(/Q(\d+(?:-\d+)?)/);
              if (branchMatch) {
                let branchId = branchMatch[1];
                if (branchId.includes('-')) {
                  const branchParts = branchId.split('-');
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
        console.log(`⚠️ 質問文が見つからず: ${questionId}`);
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
        const requiredOnly = parameters.requiredOnly === 'true' || parameters.requiredOnly === true;
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
          const setupResult = setupAndInitialize();
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
      case 'startAIHearing':
        // extractFromWebsiteの場合は専用処理
        if (parameters.action === 'extractFromWebsite') {
            result = extractFromWebsiteNotify(parameters);
        } else {
          // FranchiseHearingAI_New.gsのstartAIHearing関数を呼び出し
          if (typeof startAIHearing === 'function') {
            result = startAIHearing(parameters);
          } else {
            console.error('❌ startAIHearing関数が見つかりません');
            result = {
              success: false,
              error: 'startAIHearing関数が定義されていません。FranchiseHearingAI_New.gsを確認してください。'
            };
          }
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
      // 旧版ルーティング削除済み
      case 'getFranchiseNotificationSettings':
        result = getFranchiseNotificationSettings(parameters.franchiseId);
        break;
        
      // 🎯 加盟店登録システム（新規追加）
      case 'submitFranchiseRegistration':
        
        // 圧縮データの場合は展開処理を追加
        if (parameters.areasCompressed && !parameters.areas) {
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
        
        // extractFromWebsiteかどうかチェック
        const hasExtractAction = parameters && (parameters.action === 'extractFromWebsite' || parameters.websiteUrl);
        
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
            const properties = PropertiesService.getScriptProperties().getProperties();
            const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
            const openaiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
            
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
            const hearingManager = new FourStageHearingManager();
            const stageNum = parseInt(parameters.currentStage.replace('第', '').replace('段階', '')) || 1;
            const stageResult = hearingManager.processStage('temp-session', stageNum, [], null);
            
            result = {
              success: true,
              response: `ありがとうございます。${parameters.userMessage}について承知いたしました。`,
              hasQuestion: true,
              questionOptions: generateBasicQuestionOptions(parameters.currentStage),
              nextStage: parameters.currentStage
            };
          } else {
            result = {
              success: true,
              response: `ありがとうございます。${parameters.userMessage}について承知いたしました。`,
              hasQuestion: true,
              questionOptions: generateBasicQuestionOptions(parameters.currentStage),
              nextStage: parameters.currentStage
            };
          }
        } catch (error) {
          result = {
            success: true,
            response: `ありがとうございます。${parameters.userMessage}について承知いたしました。`,
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
          const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          if (!spreadsheetId) {
            throw new Error('スプレッドシートIDが設定されていません');
          }
          
          const ss = SpreadsheetApp.openById(spreadsheetId);
          let sheet = ss.getSheetByName('統合_ヒアリング結果');
          
          // シートが存在しない場合は作成
          if (!sheet) {
            sheet = ss.insertSheet('統合_ヒアリング結果');
            const headers = [
              'タイムスタンプ', '電話番号', '郵便番号', '回答数', 
              '外壁材質', '建物面積', '外壁状態', '工事時期', 
              '詳細状況', '屋根状況', '予算', '重視点', '色希望', '連絡方法',
              '全回答データ', 'IPアドレス', 'ユーザーエージェント'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setBackground('#607d8b').setFontColor('white').setFontWeight('bold');
          }
          
          // 回答データから主要項目を抽出
          const answers = parameters.userAnswers || [];
          const answerMap = {};
          answers.forEach(answer => {
            answerMap[answer.questionId] = answer.answer;
          });
          
          const newRow = [
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
          const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          if (!spreadsheetId) {
            throw new Error('スプレッドシートIDが設定されていません');
          }
          
          const ss = SpreadsheetApp.openById(spreadsheetId);
          let sheet = ss.getSheetByName('統合_CV記録');
          
          // シートが存在しない場合は作成
          if (!sheet) {
            sheet = ss.insertSheet('統合_CV記録');
            const headers = [
              'タイムスタンプ', '電話番号', '郵便番号', '段階', '回答数', 
              '外壁材質', '建物面積', '外壁状態', '工事時期', 
              '詳細状況', '屋根状況', '予算', '全回答データ', 'IPアドレス'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setBackground('#28a745').setFontColor('white').setFontWeight('bold');
          }
          
          // 回答データから主要項目を抽出
          const answers = parameters.userAnswers || [];
          const answerMap = {};
          answers.forEach(answer => {
            answerMap[answer.questionId] = answer.answer;
          });
          
          const newRow = [
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
          const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
          if (!spreadsheetId) {
            throw new Error('スプレッドシートIDが設定されていません');
          }
          
          const ss = SpreadsheetApp.openById(spreadsheetId);
          let sheet = ss.getSheetByName('統合_最終結果');
          
          // シートが存在しない場合は作成
          if (!sheet) {
            sheet = ss.insertSheet('統合_最終結果');
            const headers = [
              'タイムスタンプ', '電話番号', '第1-3段階回答数', '第4段階回答数', 
              '現地調査希望', '業者数希望', '心配事', '選択業者数',
              '選択業者リスト', '全回答データ', '第4段階データ', 'IPアドレス'
            ];
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setBackground('#dc3545').setFontColor('white').setFontWeight('bold');
          }
          
          // 第4段階回答から主要項目を抽出
          const stage4Answers = parameters.stage4Answers || [];
          const stage4Map = {};
          stage4Answers.forEach(answer => {
            stage4Map[answer.questionId] = answer.answer;
          });
          
          const newRow = [
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
            message: `未対応のアクション: ${functionName}`,
            error: 'UNSUPPORTED_ACTION'
          };
      }
    
    
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
    console.log('🌐 GAS WebApp GET受信:', e.parameter);
    
    // パラメータなしの場合は質問データを直接返す（シンプルAPI）
    if (!e.parameter || Object.keys(e.parameter).length === 0) {
      return getQuestionsDirectly();
    }
    
    // 直接的なURLパラメータでのgetQuestionsByStageリクエスト処理
    if (e.parameter.action === 'getQuestionsByStage') {
      console.log('📋 直接URLパラメータでgetQuestionsByStage受信');
      const stage = e.parameter.stage || 'all';
      const requiredOnly = e.parameter.requiredOnly === 'true' || e.parameter.requiredOnly === true;
      const callback = e.parameter.callback;
      
      console.log('📤 getQuestionsByStage呼び出し:', { stage, requiredOnly });
      const result = getQuestionsByStage(stage, requiredOnly);
      console.log('📥 getQuestionsByStage結果:', result.totalCount, '件');
      
      if (callback) {
        // JSONP形式で返す
        const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        // 通常のJSON形式で返す
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 直接的なURLパラメータでのgetAddressByPostalCodeリクエスト処理
    if (e.parameter.action === 'getAddressByPostalCode') {
      console.log('📮 直接URLパラメータでgetAddressByPostalCode受信');
      const postalCode = e.parameter.postalCode;
      const callback = e.parameter.callback;
      
      console.log('📤 getAddressByPostalCode呼び出し:', { postalCode });
      const result = getAddressByPostalCode(postalCode);
      console.log('📥 getAddressByPostalCode結果:', result);
      
      if (callback) {
        // JSONP形式で返す
        const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        // 通常のJSON形式で返す
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // データパラメータがある場合の処理（JSONP対応含む）
    if (e.parameter.data) {
      console.log('🔄 JSONP処理開始');
      console.log('📋 生データ:', e.parameter.data.substring(0, 200) + '...');
      
      let postData;
      try {
        // GASでは e.parameter.data は既にURLデコードされているため、直接パース
        postData = JSON.parse(e.parameter.data);
      } catch (directParseError) {
        console.log('⚠️ 直接パース失敗、decodeURIComponentを試行');
        try {
          postData = JSON.parse(decodeURIComponent(e.parameter.data));
        } catch (parseError) {
          console.error('❌ 全てのJSON Parse方法が失敗:', parseError.message);
          
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
        
        // 認証関連
        case 'auth/login':
          result = handleLogin(parameters);
          break;
        
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
        case 'getQuestionsByStage':
          console.log('📋 JSONPでgetQuestionsByStage受信');
          const stage_jsonp = parameters.stage || 'all';
          const requiredOnly_jsonp = parameters.requiredOnly === 'true' || parameters.requiredOnly === true;
          console.log('📤 getQuestionsByStage呼び出し:', { stage: stage_jsonp, requiredOnly: requiredOnly_jsonp });
          result = getQuestionsByStage(stage_jsonp, requiredOnly_jsonp);
          console.log('📥 getQuestionsByStage結果:', result.totalCount, '件');
          break;
        
        // 🎯 加盟店登録システム
        case 'submitFranchiseRegistration':
          
          // 圧縮データの場合は展開処理を追加
          if (parameters.areasCompressed && !parameters.areas) {
            console.log('圧縮エリアデータを検出');
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
          const sessionId = parameters.sessionId || 'default_session';
          const stage = parseInt(parameters.stage) || 1;
          const userAnswers = parameters.userAnswers || null;
          const customPrompt = parameters.customPrompt || null;
          
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
        
        // 📊 質問データ取得API（統合済み - 上記で処理）

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
            const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
            if (!spreadsheetId) {
              throw new Error('スプレッドシートIDが設定されていません');
            }
            
            const ss = SpreadsheetApp.openById(spreadsheetId);
            let sheet = ss.getSheetByName('統合_CV記録');
            
            // シートが存在しない場合は作成
            if (!sheet) {
              sheet = ss.insertSheet('統合_CV記録');
              const headers = [
                'タイムスタンプ', '電話番号', '郵便番号', '段階', '回答数', 
                '外壁材質', '建物面積', '外壁状態', '工事時期', 
                '詳細状況', '屋根状況', '予算', '全回答データ', 'IPアドレス'
              ];
              sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
              sheet.getRange(1, 1, 1, headers.length).setBackground('#28a745').setFontColor('white').setFontWeight('bold');
            }
            
            // 回答データから主要項目を抽出
            const answers = parameters.userAnswers || [];
            const answerMap = {};
            answers.forEach(answer => {
              answerMap[answer.questionId] = answer.answer;
            });
            
            const newRow = [
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
            // 直接StreamingChatManagerを使用
            const manager = new StreamingChatManager();
            const setupResult = manager.initializeAllSheets();
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
            const greetingResult = generateGPTGreeting(parameters);
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
        
        // 📊 質問データ取得API（doGet用）
        case 'getQuestionsByStage':
          const isRequiredOnly = parameters.requiredOnly === 'true' || parameters.requiredOnly === true;
          result = getQuestionsByStageAPI(parameters.stage, isRequiredOnly);
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
    
    // パス処理の前にdataパラメータ処理をチェック
    if (e.parameter && e.parameter.data) {
      console.log('🔄 GET dataパラメータが見つかりました。dataパラメータ処理を優先します。');
      // dataパラメータ処理は既に上で完了している
      // ここに到達した場合はdataパラメータ処理が完了しているのでreturn
      // コールバック処理
      if (e.parameter.callback) {
        const callback = e.parameter.callback;
        const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
        
        console.log('✅ JSONP応答準備完了（data処理後）');
        console.log('📋 コールバック名:', callback);
        
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        console.log('✅ 通常のJSON応答を返却（data処理後）');
        return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
      }
    }
    
    // URLパラメータでaction指定がある場合（dataパラメータなし）
    if (e.parameter && e.parameter.action) {
      console.log('🎯 URLパラメータからアクション実行:', e.parameter.action);
      
      const action = e.parameter.action;
      const parameters = e.parameter;
      let result;
      
      // アクションによる分岐処理
      switch (action) {
        case 'auth/login':
            result = handleLogin(parameters);
          break;
        
        case 'getQuestionsByStage':
          result = getQuestionsByStageAPI(parameters.stage, parameters.requiredOnly);
          break;
        
        case 'getAddressByPostalCode':
          result = getAddressByPostalCode(parameters.postalCode);
          break;
        
        default:
          console.log('⚠️ 未知のアクション:', action);
          result = {
            success: false,
            message: `未対応のアクション: ${action}`,
            error: 'UNSUPPORTED_ACTION'
          };
      }
      
      console.log('✅ URLパラメータアクション処理完了:', JSON.stringify(result));
      
      // コールバックパラメータがある場合はJSONP、ない場合は通常のJSON
      if (e.parameter.callback) {
        const callback = e.parameter.callback;
        const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
        
        console.log('✅ JSONP応答準備完了（URLパラメータ）');
        console.log('📋 コールバック名:', callback);
        
        return ContentService
          .createTextOutput(jsonpResponse)
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        console.log('✅ 通常のJSON応答を返却（URLパラメータ）');
        return createCorsResponse(JSON.stringify(result), result.success ? 200 : 400);
      }
    }
    
    // URLパラメータからパスを取得（dataパラメータもactionパラメータもない場合のみ）
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
    
    // コールバックパラメータがある場合はJSONP、ない場合は通常のJSON
    if (e.parameter && e.parameter.callback) {
      const callback = e.parameter.callback;
      const jsonpResponse = `${callback}(${JSON.stringify(result)});`;
      
      console.log('✅ JSONP応答準備完了（パス処理）');
      console.log('📋 コールバック名:', callback);
      
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return createCorsResponse(JSON.stringify(result), 200);
    }
    
  } catch (error) {
    console.error('❌ doGet エラー:', error);
    
    // JSONP エラー処理（安全なアクセス）
    if (e && e.parameter && e.parameter.callback) {
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
  
  // GAS では setHeaders は使用できないため、レスポンスヘッダーはWebApp設定で制御
  // 「アクセスできるユーザー」を「全員」に設定することでCORSが自動的に許可される
  
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
  try {
    Logger.log("🔔 全通知チャネルテスト開始（実送信版・旧GAS互換）");
    console.log("🔔 全通知チャネルテスト開始（実送信版・旧GAS互換）");
    
    const testMessage = `🧪 通知テスト - ${new Date().toLocaleString('ja-JP')}`;
    const results = [];
    
    // 環境変数事前チェック
    Logger.log("🔍 環境変数事前チェック開始");
    const requiredSettings = [
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
    
    const missingSettings = [];
    for (const setting of requiredSettings) {
      const value = PropertiesService.getScriptProperties().getProperty(setting);
      if (!value) {
        missingSettings.push(setting);
        Logger.log(`❌ 未設定: ${setting}`);
      } else {
        Logger.log(`✅ 設定済み: ${setting} = ${setting.includes('TOKEN') || setting.includes('KEY') ? '***' : value.substring(0, 20)}...`);
      }
    }
    
    if (missingSettings.length > 0) {
      const errorMsg = `❌ 必須設定が不足: ${missingSettings.join(', ')}`;
      Logger.log(errorMsg);
      sendSlackNotification(errorMsg, {});
      return;
    }
    
    // 1. Slack通知テスト
    Logger.log("📱 Slack通知テスト");
    try {
      const slackResult = sendSlackNotification(testMessage, {});
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
      const lineAdminUserId = PropertiesService.getScriptProperties().getProperty('LINE_ADMIN_USER_ID');
      Logger.log("🔍 LINE_ADMIN_USER_ID: " + lineAdminUserId);
      
      const lineResult = sendLineNotification(testMessage, { userId: lineAdminUserId });
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
      const phoneAdminNumber = PropertiesService.getScriptProperties().getProperty('PHONE_ADMIN_NUMBER');
      Logger.log("🔍 PHONE_ADMIN_NUMBER: " + phoneAdminNumber);
      
      const smsResult = sendTwilioSMS(testMessage, { phoneNumber: phoneAdminNumber });
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
      const emailTo = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL_TO');
      Logger.log("🔍 NOTIFY_EMAIL_TO: " + emailTo);
      
      // デフォルトはgmail方式のみでテスト（重複回避）
      const emailResult = sendEmailWithMethod(emailTo, '🧪 通知テスト', testMessage, 'gmail');
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
      const phoneAdminNumber = PropertiesService.getScriptProperties().getProperty('PHONE_ADMIN_NUMBER');
      Logger.log("🔍 電話発信前チェック:");
      Logger.log("  - phoneAdminNumber: " + phoneAdminNumber);
      Logger.log("  - testMessage: " + testMessage);
      
      const voiceResult = makeTwilioCall(phoneAdminNumber, testMessage);
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
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const summaryMessage = `🧪 通知テスト結果: ${successCount}/${totalCount} 成功\n\n` +
                          results.map(r => `${r.success ? '✅' : '❌'} ${r.channel}: ${r.success ? '成功' : r.error || '失敗'}`).join('\n');
    
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
    const errorMessage = `❌ testNotify_All総合エラー: ${error.message}\nスタック: ${error.stack}`;
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
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      console.log('⚠️ SPREADSHEET_ID未設定 - ログ記録をスキップ');
      return false;
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName('SystemLogs');
    
    if (!logSheet) {
      // シートが存在しない場合は作成
      logSheet = ss.insertSheet('SystemLogs');
      logSheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'Level', 'Action', 'Message', 'Details']
      ]);
    }
    
    const timestamp = new Date().toLocaleString('ja-JP');
    logSheet.appendRow([timestamp, level, action, message, '']);
    
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
    const userId = (options && options.userId) || PropertiesService.getScriptProperties().getProperty('LINE_ADMIN_USER_ID') || 'U0123456789abcdef0123456789abcdef0';
    Logger.log("🔍 LINE送信パラメータ: userId=" + userId + ", message=" + message);
    
    const result = sendLinePushMessage(userId, message);
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
    const phoneNumber = (options && options.phoneNumber) || PropertiesService.getScriptProperties().getProperty('PHONE_ADMIN_NUMBER') || '+815012345678';
    Logger.log("🔍 SMS送信パラメータ: phoneNumber=" + phoneNumber + ", message=" + message);
    
    const result = sendSMS(phoneNumber, message);
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
    Logger.log(`📧 sendEmailWithMethod開始: method=${method}, to=${to}`);
    
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
        Logger.log(`⚠️ 不明な送信方式: ${method}, gmailにフォールバック`);
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
    
    const gmailResult = sendEmailViaGmail(to, subject, message);
    const sendgridResult = sendEmailViaSendGrid(to, subject, message);
    
    const overallSuccess = gmailResult.success || sendgridResult.success;
    
    Logger.log(`📊 両方送信結果: Gmail=${gmailResult.success}, SendGrid=${sendgridResult.success}`);
    
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
    const email = (options && options.email) || PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL_TO') || 'test@example.com';
    const subject = (options && options.subject) || '🧪 通知テスト';
    const method = (options && options.method) || 'gmail';
    
    Logger.log("🔍 Email送信パラメータ: email=" + email + ", subject=" + subject + ", method=" + method);
    
    const result = sendEmailWithMethod(email, subject, message, method);
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
    const sid = PropertiesService.getScriptProperties().getProperty('TWILIO_ACCOUNT_SID');
    const token = PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN');
    const from = PropertiesService.getScriptProperties().getProperty('TWILIO_FROM_NUMBER');
    
    if (!sid || !token || !from) {
      return { success: false, error: "Twilio音声設定が不完全です" };
    }
    
    // TwiMLを生成（音声メッセージ）
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                   <Response>
                     <Say voice="alice" language="ja-JP">${message}</Say>
                   </Response>`;
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`;
    const payload = {
      To: to,
      From: from,
      Twiml: twiml
    };
    
    const options = {
      method: "post",
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(sid + ":" + token)
      },
      payload: payload,
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`📞 Twilio Voice response: ${responseCode} - ${responseText}`);
    
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
  console.log('🔐 ログイン処理開始:', params);
  
  // ロールチェック（admin/franchise/child）
  const role = params.role || 'franchise';
  
  if (role === 'admin') {
    // 管理者ログイン
    console.log('👤 管理者ログイン処理');
    
    // 簡易的な認証（本番環境では適切な認証を実装）
    // 実際の認証はスプレッドシートや外部認証サービスと連携
    const validAdminEmails = [
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
    const validation = validateRegistrationData(registrationData);
    if (!validation.success) {
      throw new Error(`データ検証エラー: ${validation.error}`);
    }
    console.log('✅ データ検証完了');
    
    // 2. 加盟店IDを生成（1つのIDのみ使用）
    console.log('🏷️ 加盟店ID生成中...');
    const franchiseId = generateFranchiseId();
    console.log('✅ 生成された加盟店ID:', franchiseId);
    
    // 3. スプレッドシートに保存（notify.gs内で直接処理）
    console.log('💾 スプレッドシート保存開始...');
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('加盟店登録');
    
    if (!sheet) {
      throw new Error('加盟店登録シートが見つかりません');
    }
    
    // 電話番号クリーニング（ハイフンなし、頭の0保持）
    function cleanPhoneNumber(phone) {
      if (!phone) return '';
      if (Array.isArray(phone)) phone = phone[0] || '';
      return "'" + phone.toString().replace(/[^\d]/g, ''); // ハイフン除去、先頭'で文字列として保存
    }
    
    // 郵便番号クリーニング（ハイフンなし、頭の0保持）
    function cleanPostalCode(postalCode) {
      if (!postalCode) return '';
      return "'" + postalCode.toString().replace(/[^\d]/g, ''); // ハイフン除去、先頭'で文字列として保存
    }
    
    // サービスコード展開（圧縮されたコードを日本語に戻す）
    function decompressServiceList(compressedCodes) {
      if (!compressedCodes) return '';
      
      const serviceMap = {
        // 施工箇所マップ
        'A1': '外壁塗装のみ',
        'A2': '屋根塗装のみ', 
        'A3': '外壁・屋根塗装',
        'B1': '屋根塗装（外壁工事含む）',
        'B2': '外壁張り替え・重ね張り',
        'B3': '屋根葺き替え・重ね葺き',
        'B4': '雨樋工事',
        'B5': 'ベランダ・バルコニー防水',
        'C1': 'エクステリア・外構工事',
        'C2': 'その他外装リフォーム',
        
        // 特殊対応項目マップ
        'F1': '夜間・早朝対応可能',
        'F2': '立ち会いなし・見積もり手渡し希望',
        'F3': '遠方につき立ち会いなし・見積もり郵送・電話で商談希望',
        'F4': '外国語対応可能（英語・中国語等）',
        'F5': '高齢者・身体不自由な方への配慮',
        'F6': 'ペット飼育世帯への特別配慮'
      };
      
      // 配列の場合は文字列として結合
      if (Array.isArray(compressedCodes)) {
        return compressedCodes.join(', ');
      }
      
      // 文字列の場合はコード展開処理
      if (typeof compressedCodes === 'string') {
        return compressedCodes.split(',').map(code => 
          serviceMap[code.trim()] || code.trim()
        ).join(', ');
      }
      
      return compressedCodes;
    }
    
    // データ配列を作成（A-AG列まで33列）
    
    const rowData = [
      franchiseId,                                        // A: 加盟店ID（画面表示と同じID）
      new Date(),                                         // B: タイムスタンプ
      registrationData.legalName || '',                   // C: 会社名
      registrationData.legalNameKana || '',               // D: 会社名カナ
      registrationData.representative || '',              // E: 代表者名
      registrationData.representativeKana || '',          // F: 代表者カナ
      cleanPostalCode(registrationData.postalCode),       // G: 郵便番号（ハイフンなし）
      registrationData.address || '',                     // H: 住所
      cleanPhoneNumber(registrationData.phone),           // I: 電話番号
      registrationData.websiteUrl || '',                  // J: ウェブサイトURL
      registrationData.employees || '',                   // K: 従業員数
      registrationData.revenue || '',                     // L: 売上規模
      registrationData.billingEmail || '',                // M: 請求用メールアドレス
      registrationData.salesEmail || '',                  // N: 営業用メールアドレス
      registrationData.salesPersonName || '',             // O: 営業担当者氏名
      registrationData.salesPersonContact || '',          // P: 営業担当者連絡先
      Array.isArray(registrationData.propertyTypes) ? registrationData.propertyTypes.join(', ') : (registrationData.propertyTypes || '戸建て3階、アパート・マンション10階、倉庫・店舗3階'), // Q: 対応物件種別・階数
      (function() {
        console.log('施工エリア:', registrationData.constructionAreas?.length || 0, '件');
        const result = decompressServiceList(registrationData.constructionAreas) || '';
        return result;
      })(),           // R: 施工箇所
      (function() {
        console.log('特殊サービス:', registrationData.specialServices?.length || 0, '件');
        const result = decompressServiceList(registrationData.specialServices) || '';
        return result;
      })(),             // S: 特殊対応項目
      registrationData.buildingAgeRange || '',            // T: 築年数対応範囲
      registrationData.tradeName || '',                   // U: 屋号
      registrationData.tradeNameKana || '',               // V: 屋号カナ
      registrationData.branchInfo || '',                  // W: 支店情報
      registrationData.establishedDate || '',             // X: 設立年月日
      registrationData.companyPR || '',                   // Y: 特徴・PR文
      registrationData.areasCompressed || '',             // Z: 対応エリア
      registrationData.priorityAreas || '',               // AA: 優先対応エリア
      new Date(),                                         // AB: 登録日
      '',                                                 // AC: 最終ログイン日時
      '審査待ち',                                         // AD: ステータス
      '',                                                 // AE: 審査担当者
      '',                                                 // AF: 審査完了日
      ''                                                  // AG: 備考
    ];
    
    // データを追加
    const newRow = sheet.getLastRow() + 1;
    console.log('🔍 DEBUG: rowDataの長さ:', rowData.length);
    console.log('🔍 DEBUG: シートの列数:', sheet.getLastColumn());
    console.log('🔍 DEBUG: Q列のデータ:', rowData[16]); // Q列は17番目なので16
    console.log('🔍 DEBUG: Y列のデータ:', rowData[24]); // Y列は25番目なので24
    
    sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
    
    console.log('✅ スプレッドシート保存完了 - Q列から Y列まで正しく保存');
    
    // 4. 管理者に通知（Slack等）
    try {
      console.log('📢 管理者通知送信中...');
      notifyNewFranchiseRegistration(franchiseId, registrationData);
      console.log('✅ 管理者通知完了');
    } catch (notifyError) {
      console.warn('⚠️ 管理者通知エラー（登録は継続）:', notifyError.message);
    }
    
    console.log('✅ 加盟店登録完了:', franchiseId);
    console.log('🔍 DEBUG: レスポンスで返すID:', franchiseId);
    
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
    console.log('AI企業検索実行中...');
    console.log('渡すパラメータ:', Object.keys(params));
    
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
    console.log('extractFromWebsiteNotify実行開始');
    console.log('パラメータkeys:', params ? Object.keys(params) : 'N/A');
    
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

/**
 * 削除済み - 古い関数（不要）
 */
function submitFranchiseRegistrationCorrect_DELETED(registrationData) {
  try {
    console.log('🔄 [notify.gs] 正しいsubmitFranchiseRegistration関数にリダイレクト');
    
    // FranchiseHearingAI_New.gsのsubmitFranchiseRegistration関数を呼び出し
    // 注意: 関数名の競合を避けるため、FranchiseHearingAI_New.gsの関数をそのまま呼び出し
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 
                           PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID');
    
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('加盟店親ユーザー一覧');
    
    if (!sheet) {
      throw new Error('加盟店親ユーザー一覧シートが見つかりません');
    }
    
    // 現在の日時
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    
    // 短い加盟店IDを生成（最大12文字）
    const franchiseId = Utilities.formatDate(now, 'Asia/Tokyo', 'yyMMddHHmm') + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // 電話番号クリーニング
    function cleanPhoneNumber(phone) {
      if (!phone) return '';
      if (Array.isArray(phone)) {
        phone = phone[0] || '';
      }
      return phone.toString().replace(/[^\d-]/g, '');
    }
    
    // ヘッダー行を取得して列インデックスをマッピング  
    const headerRow = sheet.getRange(1, 1, 1, 33).getValues()[0]; // AG列(33列)まで固定取得
    console.log('📋 現在のヘッダー行:', JSON.stringify(headerRow));
    
    const columnMap = {};
    headerRow.forEach((header, index) => {
      if (header && header.trim() !== '') { // 空でない列名のみマッピング
        columnMap[header.trim()] = index + 1;
      }
    });
    console.log('📋 列マッピング:', JSON.stringify(columnMap));
    
    // 必須列の存在チェック
    const requiredColumns = ['加盟店ID', '会社名', '対応物件種別・階数', '施工箇所', '特殊対応項目', '屋号', '支店情報', '特徴・PR文'];
    const missingColumns = requiredColumns.filter(col => !columnMap[col]);
    if (missingColumns.length > 0) {
      console.log('❌ 不足している列:', missingColumns);
      throw new Error('必要な列が見つかりません: ' + missingColumns.join(', '));
    }
    
    // データオブジェクトを作成（列名で正確にマッピング）
    const dataObject = {
      '加盟店ID': franchiseId,
      'タイムスタンプ': timestamp,
      '会社名': registrationData.legalName || '',
      '会社名カナ': registrationData.legalNameKana || '',
      '代表者名': registrationData.representative || '',
      '代表者カナ': registrationData.representativeKana || '',
      '郵便番号': registrationData.postalCode || '',
      '住所': registrationData.address || '',
      '電話番号': "'" + cleanPhoneNumber(registrationData.phone),
      'ウェブサイトURL': registrationData.websiteUrl || '',
      '従業員数': registrationData.employees || '',
      '売上規模': registrationData.revenue || '',
      '請求用メールアドレス': registrationData.billingEmail || '',
      '営業用メールアドレス': registrationData.salesEmail || '',
      '営業担当者氏名': registrationData.salesPersonName || '',
      '営業担当者連絡先': registrationData.salesPersonContact || '',
      '対応物件種別・階数': (function() {
        try {
          if (registrationData.propertyTypes && Array.isArray(registrationData.propertyTypes)) {
            return registrationData.propertyTypes.join(', ');
          } else if (registrationData.propertyTypes && typeof registrationData.propertyTypes === 'string') {
            return registrationData.propertyTypes;
          } else {
            return '';
          }
        } catch (e) {
          console.log('propertyTypes処理エラー: ' + e.message);
          return registrationData.propertyTypes ? String(registrationData.propertyTypes) : '';
        }
      })(),
      '施工箇所': registrationData.constructionAreas || '',
      '特殊対応項目': registrationData.specialServices || '',
      '築年数対応範囲': registrationData.buildingAgeRange || '',
      '屋号': registrationData.tradeName || '',
      '屋号カナ': registrationData.tradeNameKana || '',
      '支店情報': registrationData.branchInfo || '',
      '設立年月日': registrationData.establishedDate || '',
      '特徴・PR文': registrationData.companyPR || '',
      '対応エリア': registrationData.areasCompressed || '',
      '優先対応エリア': registrationData.priorityAreas || '',
      '登録日': timestamp,
      '最終ログイン日時': '',
      'ステータス': '審査待ち',
      '審査担当者': '',
      '審査完了日': '',
      '備考': ''
    };
    
    // 新しい行を作成
    const newRow = sheet.getLastRow() + 1;
    
    // 各列にデータを設定
    Object.keys(dataObject).forEach(columnName => {
      const columnIndex = columnMap[columnName];
      if (columnIndex) {
        sheet.getRange(newRow, columnIndex).setValue(dataObject[columnName]);
      } else {
        console.log('警告: 列が見つかりません: ' + columnName);
      }
    });
    
    console.log('✅ 加盟店登録完了:', franchiseId);
    
    return {
      success: true,
      franchiseId: franchiseId,
      timestamp: timestamp,
      message: '加盟店登録が完了しました'
    };
    
  } catch (error) {
    console.log('❌ [notify.gs] 加盟店登録エラー:', error.message);
    return {
      success: false,
      error: '登録処理でエラーが発生しました: ' + error.message
    };
  }
}

// ==========================================
// 4択チャットシステムAPI関数
// ==========================================

/**
 * 指定段階の質問を取得するAPI
 */
function getQuestionsByStageAPI(stage, requiredOnly = false) {
  try {
    console.log(`🚀 getQuestionsByStageAPI呼び出し: stage=${stage}, requiredOnly=${requiredOnly}`);
    const result = getQuestionsByStage(stage, requiredOnly);
    console.log(`✅ getQuestionsByStageAPI成功: ${result.totalCount}件の質問を取得`);
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
    const spreadsheetId = '1eHAUiuDbTdv9WC-RfpMUdp9HGlaqd1C7M';
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('統合_質問豆知識管理');
    const data = sheet.getDataRange().getValues();

    const headers = data[0];
    const questions = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      questions.push({
        id: row[0],
        questionText: row[3],
        choices: [row[4], row[5], row[6], row[7]].filter(x => x),
        branches: [row[8], row[9], row[10], row[11]].filter(x => x)
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        questions: questions
      }))
      .setMimeType(ContentService.MimeType.JSON)

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: e.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

/**
 * AI自律質問選択API - 会話コンテキストに基づいて最適な次の質問を選択
 */
function selectNextQuestionWithAI(parameters) {
  try {
    console.log('🧠 AI自律質問選択開始');
    console.log('受信パラメータ:', Object.keys(parameters));
    
    const { conversationContext, availableQuestions, userAnswers } = parameters;
    
    if (!availableQuestions || availableQuestions.length === 0) {
      return {
        success: false,
        error: '利用可能な質問がありません'
      };
    }
    
    // AI判断のためのプロンプト作成
    const aiPrompt = `
あなたは外壁塗装の専門アドバイザーです。以下の会話履歴を基に、お客様にとって最も適切な次の質問を選択してください。

会話履歴:
${conversationContext}

利用可能な質問:
${availableQuestions.map((q, index) => 
  `${index + 1}. ${q.question} (カテゴリ: ${q.category}, 優先度: ${q.priority})`
).join('\n')}

選択基準:
1. お客様の回答に基づいて、最も関連性の高い質問
2. 外壁塗装の見積もりに必要な重要な情報
3. 自然な会話の流れを重視
4. 優先度も考慮するが、会話の文脈を最優先

選択した質問の番号（1-${availableQuestions.length}）のみを返してください。理由は不要です。
    `;
    
    // AI判断 - 実際にはOpenAI APIを呼び出すか、簡易ロジックを使用
    let selectedIndex = 0;
    
    // 簡易AI判断ロジック（実装例）
    if (conversationContext.includes('モルタル') || conversationContext.includes('塗り壁')) {
      // モルタル関連の回答がある場合、状態に関する質問を優先
      selectedIndex = availableQuestions.findIndex(q => 
        q.question.includes('状態') || q.question.includes('劣化') || q.question.includes('ひび割れ')
      );
      if (selectedIndex === -1) selectedIndex = 0;
    } else if (conversationContext.includes('早く') || conversationContext.includes('すぐ')) {
      // 急ぎの場合、予算や業者に関する質問を優先
      selectedIndex = availableQuestions.findIndex(q => 
        q.question.includes('予算') || q.question.includes('業者') || q.question.includes('希望')
      );
      if (selectedIndex === -1) selectedIndex = 0;
    } else {
      // デフォルト: 優先度順
      const sortedQuestions = availableQuestions
        .map((q, index) => ({ question: q, originalIndex: index }))
        .sort((a, b) => a.question.priority - b.question.priority);
      selectedIndex = sortedQuestions[0].originalIndex;
    }
    
    const selectedQuestion = availableQuestions[selectedIndex];
    
    console.log('✅ AI選択質問:', selectedQuestion.question);
    console.log('🎯 選択理由: インデックス', selectedIndex);
    
    return {
      success: true,
      selectedQuestion: selectedQuestion,
      selectedIndex: selectedIndex,
      totalAvailable: availableQuestions.length,
      aiReasoning: `会話コンテキストに基づき、最も適切な質問として選択`
    };
    
  } catch (error) {
    console.error('❌ AI質問選択エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}


/**
 * ヒアリング段階処理API
 */
function processHearingStageAPI(parameters) {
  try {
    const { sessionId, stage, userAnswers, customPrompt } = parameters;
    
    // 4段階ヒアリングマネージャーを使用
    const result = processHearingStage(sessionId, stage, userAnswers, customPrompt);
    
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
  const basicOptions = {
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
    
    const context = parameters.context || '外壁塗装相談';
    const timeOfDay = parameters.timeOfDay || '昼';
    
    // OpenAI API設定
    const openAIKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!openAIKey) {
      console.warn('⚠️ OpenAI APIキーが設定されていません、フォールバック挨拶使用');
      return {
        success: false,
        error: 'OpenAI APIキーが設定されていません',
        greeting: 'こんにちは！外壁塗装の専門アドバイザーです。お住まいの状況をお聞かせください。最適な業者をご提案させていただきます。'
      };
    }
    
    // GPTプロンプト作成
    const prompt = `あなたは外壁塗装の専門アドバイザーです。以下の条件で自然で親しみやすい挨拶を1文で生成してください。

条件:
- 時間帯: ${timeOfDay}
- 相談内容: ${context}
- トーン: 専門的でありながら親しみやすい
- 長さ: 30-50文字程度
- 目的: お客様の状況をヒアリングして最適な業者提案

例: 「こんにちは！外壁塗装のご相談ですね。お住まいの状況を詳しくお聞かせください。」

挨拶のみ出力してください:`;
    
    // OpenAI API呼び出し
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestPayload = {
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
    
    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestPayload)
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`OpenAI API error: ${response.getResponseCode()}`);
    }
    
    const responseData = JSON.parse(response.getContentText());
    const generatedGreeting = responseData.choices[0].message.content.trim();
    
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
    const fallbackGreeting = 'こんにちは！外壁塗装の専門アドバイザーです。お住まいの状況をお聞かせください。最適な業者をご提案させていただきます。';
    
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
  
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID が設定されていません');
  }
  
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('郵便番号DB');
  
  if (!sheet) {
    throw new Error('郵便番号DB sheet not found');
  }
  
  const values = sheet.getDataRange().getValues();
  console.log(`📊 キャッシュ対象データ: ${values.length}行`);
  
  const cache = CacheService.getScriptCache();
  let cacheCount = 0;
  
  // 個別の郵便番号をCacheServiceに保存
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const postalCode = row[0] ? row[0].toString().replace(/[^0-9]/g, '') : '';
    
    if (postalCode && postalCode.length === 7) {
      const addressData = {
        success: true,
        prefecture: row[1] || '',
        city: row[2] || '',
        town: row[3] || ''
      };
      
      try {
        cache.put(`postal_${postalCode}`, JSON.stringify(addressData), 3600); // 1時間キャッシュ
        cacheCount++;
      } catch (error) {
        console.log(`⚠️ キャッシュ保存失敗: ${postalCode}`);
      }
    }
  }
  
  console.timeEnd('⚡ 郵便番号キャッシュ構築');
  console.log(`✅ CacheService保存完了: ${cacheCount}件`);
  
  return cacheCount;
}

/**
 * 郵便番号から住所を検索する関数（CacheService最適化版）
 * @param {string} postalCode - 郵便番号（7桁の数字）
 * @returns {Object} 住所情報 { success, prefecture, city, town } または { success: false, error }
 */
function getAddressByPostalCode(postalCode) {
  try {
    console.time('🔍 郵便番号検索');
    
    // 入力チェック
    if (!postalCode) {
      return {
        success: false,
        error: 'postalCode parameter is required'
      };
    }
    
    // 郵便番号の正規化
    const normalizedPostalCode = postalCode.toString().replace(/[^0-9]/g, '');
    
    if (normalizedPostalCode.length !== 7) {
      return {
        success: false,
        error: 'postalCode must be 7 digits'
      };
    }
    
    const cache = CacheService.getScriptCache();
    const cacheKey = `postal_${normalizedPostalCode}`;
    
    // キャッシュから取得を試行
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.timeEnd('🔍 郵便番号検索');
      console.log('✅ キャッシュヒット:', normalizedPostalCode);
      return JSON.parse(cachedResult);
    }
    
    // キャッシュにない場合、キャッシュを構築
    console.log('⚠️ キャッシュミス、キャッシュ構築開始');
    buildPostalCodeCache();
    
    // 再度キャッシュから取得
    const result = cache.get(cacheKey);
    console.timeEnd('🔍 郵便番号検索');
    
    if (result) {
      console.log('✅ 郵便番号検索成功（キャッシュ構築後）');
      return JSON.parse(result);
    } else {
      console.log('⚠️ 郵便番号が見つかりません:', normalizedPostalCode);
      return {
        success: false,
        error: 'not found'
      };
    }
    
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
    console.log(`🔍 getQuestionsByStage開始: stage=${stage}, requiredOnly=${requiredOnly}`);
    
    // スプレッドシート取得（アクティブ→ID指定の順で試行）
    let ss, sheet;
    let spreadsheetInfo = {};
    
    try {
      // まずアクティブスプレッドシートを試行
      ss = SpreadsheetApp.getActiveSpreadsheet();
      spreadsheetInfo.accessMethod = 'active';
      spreadsheetInfo.spreadsheetId = ss.getId();
      spreadsheetInfo.spreadsheetName = ss.getName();
      sheet = ss.getSheetByName('統合_質問豆知識管理');
      console.log(`✅ アクティブスプレッドシート取得成功: ${spreadsheetInfo.spreadsheetName}`);
    } catch (activeError) {
      console.log('⚠️ アクティブスプレッドシート失敗、ID指定で再試行');
      
      // フォールバック: SPREADSHEET_IDを使用
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      
      if (!spreadsheetId) {
        throw new Error('SPREADSHEET_IDが設定されていません。Web App経由の場合はSPREADSHEET_IDプロパティを設定してください。');
      }
      
      ss = SpreadsheetApp.openById(spreadsheetId);
      spreadsheetInfo.accessMethod = 'byId';
      spreadsheetInfo.spreadsheetId = spreadsheetId;
      spreadsheetInfo.spreadsheetName = ss.getName();
      sheet = ss.getSheetByName('統合_質問豆知識管理');
      console.log(`✅ ID指定スプレッドシート取得成功: ${spreadsheetInfo.spreadsheetName}`);
    }
    
    if (!sheet) {
      // 利用可能なシート名を取得
      const availableSheets = ss.getSheets().map(s => s.getName());
      console.error('❌ 対象シートが見つかりません');
      console.error('利用可能なシート:', availableSheets);
      throw new Error(`シート「統合_質問豆知識管理」が見つかりません。利用可能なシート: ${availableSheets.join(', ')}`);
    }
    
    console.log(`✅ シート「統合_質問豆知識管理」取得成功`);
    
    const data = sheet.getDataRange().getValues();
    console.log(`📊 データ取得完了: ${data.length}行 x ${data[0]?.length || 0}列`);
    
    
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
    const headers = data[0];
    console.log(`📋 ヘッダー情報:`, headers);
    console.log(`🔍 重要カラム確認:`, {
      hasQuestionId: headers.includes('質問ID') || headers.includes('ID'),
      hasStage: headers.includes('ヒアリング段階') || headers.includes('段階'),
      hasQuestionText: headers.includes('質問文') || headers.includes('質問'),
      hasActiveFlag: headers.includes('有効フラグ'),
      hasRequiredFlag: headers.includes('必須フラグ')
    });
    
    const questions = [];
    
    // データ行を処理（2行目 = data[1] から開始）
    let processedRows = 0;
    let filteredOutRows = 0;
    let stageFilteredRows = 0;
    let requiredFilteredRows = 0;
    let activeFilteredRows = 0;
    
    console.log(`🔍 フィルタリング開始: stage=${stage}, requiredOnly=${requiredOnly}`);
    
    for (let i = 1; i < data.length; i++) {
      processedRows++;
      const row = data[i];
      
      // 行データをオブジェクトに変換
      const questionObj = {};
      headers.forEach((header, index) => {
        questionObj[header] = row[index];
      });
      
      // 最初の5行の詳細情報をログ出力
      if (i <= 5) {
        console.log(`行${i}データ:`, {
          questionId: questionObj['質問ID'] || questionObj['ID'],
          questionStage: questionObj['ヒアリング段階'] || questionObj['段階'],
          questionText: questionObj['質問文'] || questionObj['質問'],
          activeFlag: questionObj['有効フラグ'],
          requiredFlag: questionObj['必須フラグ']
        });
      }
      
      // 段階フィルタリング（stageがundefinedの場合は'all'として扱う）
      const requestedStage = stage || 'all';
      const questionStage = questionObj['ヒアリング段階'] || questionObj['段階'];
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
      const isActive = questionObj['有効フラグ'];
      const shouldExclude = isActive === false || isActive === 'FALSE' || isActive === 0 || isActive === '0';
      if (shouldExclude) {
        activeFilteredRows++;
        continue;
      }
      
      // 選択肢を配列に変換
      const choices = [];
      for (let j = 1; j <= 4; j++) {
        const choice = questionObj[`選択肢${j}`] || questionObj[`choice${j}`];
        if (choice && choice.toString().trim()) {
          choices.push(choice.toString().trim());
        }
      }
      
      // 分岐先を配列に変換（複数のパターンをチェック）
      const branches = [];
      
      // パターン1: 分岐先1, 分岐先2...形式
      for (let j = 1; j <= 4; j++) {
        const branchKey = `分岐先${j}`;
        const branch = questionObj[branchKey];
        if (branch && branch.toString().trim()) {
          branches.push(branch.toString().trim());
        }
      }
      
      // パターン2: 列インデックスでの直接参照（J, K, L, M列）
      if (branches.length === 0) {
        // J列=9, K列=10, L列=11, M列=12 (0ベース)
        const branchColumnIndices = [9, 10, 11, 12]; // J, K, L, M列
        for (let colIndex of branchColumnIndices) {
          const branch = row[colIndex];
          if (branch && branch.toString().trim()) {
            branches.push(branch.toString().trim());
          }
        }
      }
      
      // 正規化された質問オブジェクト
      const normalizedQuestion = {
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
function testGetQuestionsByStage() {
  console.log('=== getQuestionsByStage動作テスト ===');
  
  try {
    // まず生データを確認
    console.log('🔍 Step 1: 生データ確認');
    debugSpreadsheetRawData();
    
    // 実際にgetQuestionsByStage関数を呼び出してテスト
    console.log('🔍 Step 2: 関数実行テスト');
    const result = getQuestionsByStage('all', false);
    
    console.log('📊 結果summary:', {
      success: result.success,
      questionsCount: result.totalCount,
      hasDebugInfo: !!result.debug
    });
    
    if (result.questions && result.questions.length > 0) {
      console.log('📋 全質問一覧:');
      result.questions.forEach((q, i) => {
        console.log(`  ${i+1}. ${q.id || q.questionId}: ${q.questionText || q.question}`);
      });
      
      // Q001とQ004のデータを特別に確認
      const q001 = result.questions.find(q => (q.id || q.questionId) === 'Q001');
      const q004 = result.questions.find(q => (q.id || q.questionId) === 'Q004');
      const q005 = result.questions.find(q => (q.id || q.questionId) === 'Q005');
      
      console.log('🚨 Q001データ:', q001 ? {
        id: q001.id,
        questionText: q001.questionText,
        choices: q001.choices,
        branches: q001.branches,
        '分岐先1': q001['分岐先1'],
        '分岐先2': q001['分岐先2']
      } : 'Q001が見つかりません');
      
      console.log('🚨 Q004データ:', q004 ? {
        id: q004.id,
        questionText: q004.questionText,
        存在: 'あり'
      } : 'Q004が見つかりません');
      
      console.log('🚨 Q005データ:', q005 ? {
        id: q005.id,
        questionText: q005.questionText,
        存在: 'あり'
      } : 'Q005が見つかりません');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.error('エラースタック:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * スプレッドシートの生データを直接確認
 */
function debugSpreadsheetRawData() {
  console.log('=== スプレッドシート生データ確認 ===');
  
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('統合_質問豆知識管理');
    const data = sheet.getDataRange().getValues();
    
    console.log('📊 シート全データ行数:', data.length);
    console.log('📊 ヘッダー行:', data[0]);
    
    if (data.length <= 1) {
      console.log('🚨 問題発見: スプレッドシートにデータ行がありません！');
      console.log('📋 利用可能なシート一覧:');
      ss.getSheets().forEach(sheet => {
        console.log(`  - ${sheet.getName()}: ${sheet.getLastRow()}行`);
      });
      
      // GitHub同期を実行してデータを投入
      console.log('🔄 GitHub同期を実行してデータを投入します...');
      const syncResult = syncGitHubToSpreadsheet();
      console.log('📊 同期結果:', syncResult);
      
      return { success: false, error: 'データなし、同期実行済み' };
    }
    
    // Q001とQ004の行データを特定
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const questionId = row[0]; // A列が質問ID
      
      if (questionId === 'Q001' || questionId === 'Q004' || questionId === 'Q005') {
        console.log(`🔍 ${questionId}の生データ (行${i+1}):`, row);
        console.log(`  質問文: ${row[3]}`); // D列
        console.log(`  選択肢1: ${row[4]}`); // E列
        console.log(`  選択肢2: ${row[5]}`); // F列
        console.log(`  分岐先1: ${row[9]}`); // J列
        console.log(`  分岐先2: ${row[10]}`); // K列
      }
    }
    
    return { success: true, dataLength: data.length };
    
  } catch (error) {
    console.error('❌ 生データ確認エラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 基本的な質問データを手動で投入（緊急対応）
 */
function addBasicQuestions() {
  console.log('=== 基本質問データ投入 ===');
  
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('統合_質問豆知識管理');
    
    // 基本的な質問データ
    const basicQuestions = [
      ['Q001', '第1段階', '必須', 'まずは外壁塗装の検討状況をお聞かせください', 'はい', 'いいえ', '', '', true, 'Q004', 'Q002', '', '', '', '', '', '', ''],
      ['Q002', '第1段階', '必須', 'どのような理由で外壁塗装をお考えでしょうか？', '汚れが気になる', 'ひび割れがある', 'その他', '', true, 'Q003', 'Q003', 'Q003', '', '', '', '', '', ''],
      ['Q003', '第1段階', '必須', 'ご検討の時期はいつ頃をお考えでしょうか？', '今すぐ', '3ヶ月以内', '半年以内', '1年以内', true, 'Q004', 'Q004', 'Q004', 'Q004', '', '', '', '', ''],
      ['Q004', '第2段階', '必須', '具体的にどの工事が気になりますか？', '外壁塗装', '屋根塗装', '防水工事', 'その他', true, 'Q005', 'Q006', 'Q007', 'Q008', '', '', '', '', ''],
      ['Q005', '第2段階', '必須', 'どのような色をご希望でしょうか？', '現在と同じ色', '明るい色', '落ち着いた色', 'その他', true, 'Q009', 'Q009', 'Q009', 'Q009', '', '', '', '', '']
    ];
    
    console.log('📝 基本質問データを投入中...');
    
    // データを投入
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, basicQuestions.length, basicQuestions[0].length).setValues(basicQuestions);
    
    console.log(`✅ ${basicQuestions.length}件の質問データを投入完了`);
    
    // 投入後のデータ確認
    const newData = sheet.getDataRange().getValues();
    console.log('📊 投入後のデータ行数:', newData.length);
    
    return { success: true, addedQuestions: basicQuestions.length };
    
  } catch (error) {
    console.error('❌ 質問データ投入エラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * SPREADSHEET_IDを正しいIDに修正
 */
function fixSpreadsheetId() {
  console.log('🔧 SPREADSHEET_IDを修正中...');
  
  try {
    // アクティブスプレッドシートの実際のIDを取得
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const correctId = activeSpreadsheet.getId();
    const currentId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    
    console.log('現在設定されているID:', currentId);
    console.log('実際のスプレッドシートID:', correctId);
    
    if (currentId !== correctId) {
      // 正しいIDに設定
      PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', correctId);
      console.log('✅ SPREADSHEET_IDを正しいIDに修正しました');
    } else {
      console.log('✅ SPREADSHEET_IDは既に正しく設定されています');
    }
    
    // 確認のため設定後の値を表示
    const newId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    console.log('修正後のSPREADSHEET_ID:', newId);
    
    return {
      success: true,
      oldId: currentId,
      newId: newId,
      spreadsheetName: activeSpreadsheet.getName()
    };
    
  } catch (error) {
    console.error('❌ SPREADSHEET_ID修正エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * バインドされたスプレッドシートの確認
 */
function checkBoundSpreadsheet() {
  console.log('=== バインドされたスプレッドシート確認 ===');
  
  try {
    // 1. アクティブスプレッドシートの確認
    console.log('📋 1. アクティブスプレッドシートの確認');
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log('✅ アクティブスプレッドシート名:', activeSpreadsheet.getName());
    console.log('✅ アクティブスプレッドシートID:', activeSpreadsheet.getId());
    
    // 2. 全シートの確認
    console.log('📋 2. 全シートの確認');
    const sheets = activeSpreadsheet.getSheets();
    console.log('総シート数:', sheets.length);
    sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()}`);
    });
    
    // 3. 対象シートの確認
    console.log('📋 3. 対象シートの確認');
    const targetSheet = activeSpreadsheet.getSheetByName('統合_質問豆知識管理');
    if (targetSheet) {
      console.log('✅ 「統合_質問豆知識管理」シートが見つかりました');
      const data = targetSheet.getDataRange().getValues();
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
function testSpreadsheetConnection() {
  console.log('=== スプレッドシート接続テスト開始 ===');
  
  try {
    // 1. 基本的なスプレッドシート情報の確認
    console.log('📋 1. スプレッドシート基本情報の確認');
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
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
    let spreadsheet;
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
    const sheets = spreadsheet.getSheets();
    console.log('総シート数:', sheets.length);
    sheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.getName()}`);
    });
    
    // 4. 「統合_質問豆知識管理」シートの存在確認
    console.log('📋 4. 「統合_質問豆知識管理」シートの存在確認');
    const targetSheetName = '統合_質問豆知識管理';
    const targetSheet = spreadsheet.getSheetByName(targetSheetName);
    
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
    const lastRow = targetSheet.getLastRow();
    const lastCol = targetSheet.getLastColumn();
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
    const headerRow = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    console.log('ヘッダー行:', headerRow);
    console.log('ヘッダー数:', headerRow.length);
    
    // 重要なヘッダーの存在確認
    const requiredHeaders = ['質問ID', 'ヒアリング段階', '質問文', '選択肢1', '分岐先1'];
    const missingHeaders = requiredHeaders.filter(header => !headerRow.includes(header));
    
    if (missingHeaders.length > 0) {
      console.warn('⚠️ 不足しているヘッダー:', missingHeaders);
    } else {
      console.log('✅ 必要なヘッダーが全て存在します');
    }
    
    // 7. データ行のサンプル取得
    console.log('📋 7. データ行のサンプル取得（最初の3行）');
    const dataRows = Math.min(3, lastRow - 1);
    if (dataRows > 0) {
      const sampleData = targetSheet.getRange(2, 1, dataRows, lastCol).getValues();
      sampleData.forEach((row, index) => {
        console.log(`データ行${index + 1}:`, row);
      });
    }
    
    // 8. getQuestionsByStage関数の簡易テスト
    console.log('📋 8. getQuestionsByStage関数の簡易テスト');
    try {
      const testResult = getQuestionsByStage('基本情報');
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
    const stages = ['基本情報', '地域選択', '詳細条件', '最終確認'];
    const stageCounts = {};
    
    for (const stage of stages) {
      try {
        const result = getQuestionsByStage(stage);
        stageCounts[stage] = result.questions.length;
        console.log(`${stage}: ${result.questions.length}件`);
      } catch (error) {
        console.error(`${stage}の取得でエラー:`, error.message);
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
