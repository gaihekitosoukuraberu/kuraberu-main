/**
 * 外壁塗装チャットボット用スプレッドシート初期化
 * 4段階ヒアリングシステム + 豆知識管理
 */

function initializeChatbotSpreadsheet() {
  const ss = SpreadsheetApp.create('外壁塗装チャットボット管理シート');
  console.log('スプレッドシートが作成されました: ' + ss.getUrl());
  
  // 各シートを作成
  createQuestionsSheet(ss);
  createBranchingSheet(ss);
  createPriceCalculationSheet(ss);
  createKnowledgeTipsSheet(ss);
  createAdviceMessagesSheet(ss);
  createMediaAssetsSheet(ss);
  createUserSessionsSheet(ss);
  
  return ss.getUrl();
}

/**
 * 質問マスタシート
 */
function createQuestionsSheet(ss) {
  const sheet = ss.insertSheet('Questions_Master');
  
  // ヘッダー設定
  const headers = [
    'QuestionID', 'Stage', 'QuestionText', 'QuestionType', 
    'Choice1', 'Choice2', 'Choice3', 'Choice4', 'Choice5',
    'NextQuestionLogic', 'PriceImpact', 'MatchImpact', 'IsRequired'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // サンプルデータ
  const sampleData = [
    ['Q001', '1', '建物は何階建てですか？', 'choice', '1階建て', '2階建て', '3階建て', '', '', 'Q002', 'floor_adjust', '5', 'true'],
    ['Q002', '1', '築年数はどのくらいですか？', 'choice', '10年未満', '10-20年', '20-30年', '30年以上', '', 'Q003', 'age_adjust', '10', 'true'],
    ['Q003', '1', '建物の坪数はどのくらいですか？', 'choice', '20坪未満', '20-30坪', '30-40坪', '40坪以上', '', 'Q004', 'size_adjust', '10', 'true'],
    ['Q004', '1', '現在の外壁材質は何ですか？', 'choice', 'サイディング', 'モルタル', 'タイル', 'その他', '', 'Q005', 'material_adjust', '15', 'true'],
    ['Q005', '1', '工事の緊急度はいかがですか？', 'choice', 'すぐにでも', '3ヶ月以内', '半年以内', '1年以内', '検討中', 'STAGE2', 'urgency_adjust', '20', 'true']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  
  // 書式設定
  sheet.getRange(1, 1, 1, headers.length).setBackground('#4285F4').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 分岐ロジックシート
 */
function createBranchingSheet(ss) {
  const sheet = ss.insertSheet('Branching_Logic');
  
  const headers = [
    'RuleID', 'FromQuestionID', 'AnswerValue', 'Condition', 
    'NextQuestionID', 'NextStage', 'SkipCondition', 'Notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const sampleData = [
    ['R001', 'Q001', '1階建て', 'equals', 'Q002', '', '', '1階建ての場合の分岐'],
    ['R002', 'Q005', 'すぐにでも', 'equals', 'STAGE2', '2', '', '緊急度高い場合、第2段階へ'],
    ['R003', 'STAGE2_START', '', 'always', 'Q201', '', '', '第2段階開始時の質問'],
    ['R004', 'STAGE3_START', '', 'always', 'Q301', '', '', '第3段階（クロージング）開始']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#34A853').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 価格計算シート
 */
function createPriceCalculationSheet(ss) {
  const sheet = ss.insertSheet('Price_Calculation');
  
  const headers = [
    'CalculationID', 'ConditionType', 'ConditionValue', 'BasePrice', 
    'AdjustmentFactor', 'DisplayText', 'PriceRange', 'Notes'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const sampleData = [
    ['PC001', 'floor_adjust', '1階建て', '800000', '0.8', '1F建て戸建て', '64万〜88万円', '1階建ての場合20%減額'],
    ['PC002', 'floor_adjust', '2階建て', '800000', '1.0', '2F建て戸建て', '80万〜110万円', '2階建て基準価格'],
    ['PC003', 'floor_adjust', '3階建て', '800000', '1.3', '3F建て戸建て', '104万〜143万円', '3階建ての場合30%増額'],
    ['PC004', 'age_adjust', '10年未満', '800000', '1.0', '築10年未満', '', '築浅の場合基準価格'],
    ['PC005', 'age_adjust', '30年以上', '800000', '1.2', '築30年以上', '', '築古の場合20%増額'],
    ['PC006', 'size_adjust', '20坪未満', '800000', '0.7', '20坪未満', '', '小規模の場合30%減額'],
    ['PC007', 'size_adjust', '40坪以上', '800000', '1.4', '40坪以上', '', '大規模の場合40%増額']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#FF9900').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 豆知識・メッセージセクションシート
 */
function createKnowledgeTipsSheet(ss) {
  const sheet = ss.insertSheet('Knowledge_Tips');
  
  const headers = [
    'TipID', 'Stage', 'TriggerCondition', 'TipType', 'Title', 
    'Content', 'DisplayTiming', 'MediaType', 'MediaURL', 'IsActive'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const sampleData = [
    ['TIP001', '1', 'before_Q001', 'knowledge', '外壁塗装の適切なタイミング', '外壁塗装は一般的に10-15年に一度が目安です。早めの塗装で建物を長持ちさせましょう！', 'before_question', 'text', '', 'true'],
    ['TIP002', '1', 'before_Q002', 'advice', '築年数と塗装の関係', '築年数が古いほど下地処理が重要になります。適切な診断で最適な工法をご提案します。', 'before_question', 'text', '', 'true'],
    ['TIP003', '2', 'stage_transition', 'encouragement', 'より詳しく診断します', 'ここからはより詳細にお聞きします。あなたにピッタリの業者を見つけるため、少しお時間をいただきますね。', 'stage_start', 'text', '', 'true'],
    ['TIP004', '2', 'match_50', 'progress', 'マッチング進行中', '50%マッチしました！あなたの条件に合う業者が絞り込まれてきています。', 'progress_update', 'image', '/images/progress_50.png', 'true'],
    ['TIP005', '3', 'closing_start', 'excitement', '最適な業者が見つかりました！', 'おめでとうございます！あなたの条件にピッタリの優良業者をご紹介できます。', 'stage_start', 'video', 'https://youtube.com/shorts/abc123', 'true']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#9C27B0').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * アドバイス・メッセージシート
 */
function createAdviceMessagesSheet(ss) {
  const sheet = ss.insertSheet('Advice_Messages');
  
  const headers = [
    'MessageID', 'Stage', 'MessageType', 'TriggerCondition', 
    'Title', 'Content', 'ButtonText', 'ActionType', 'IsActive'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const sampleData = [
    ['MSG001', '1_to_2', 'transition', 'stage_complete', '物件診断完了', 'お疲れ様でした！続いて、あなたにピッタリの業者を見つけるため、もう少し詳しくお聞かせください。', '詳細診断を開始', 'next_stage', 'true'],
    ['MSG002', '2_to_3', 'transition', 'match_100', '診断完了！', '完璧です！あなたの条件に最も適した業者をご紹介する準備が整いました。', 'おすすめ業者を見る', 'next_stage', 'true'],
    ['MSG003', '3', 'closing', 'objection_other', '他社検討中ですね', '分かります。でも、この条件でこの価格の業者は滅多に見つかりません。まずは無料見積もりだけでもいかがですか？', '無料見積もりを依頼', 'retry_closing', 'true'],
    ['MSG004', '3', 'closing', 'objection_price', '価格が心配ですね', 'ご安心ください！当サービス経由なら最大50%OFF保証。他より高い場合は差額をお返しします。', '最安値で見積もり', 'retry_closing', 'true']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#F44336').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * メディア資産シート
 */
function createMediaAssetsSheet(ss) {
  const sheet = ss.insertSheet('Media_Assets');
  
  const headers = [
    'AssetID', 'AssetType', 'Category', 'Title', 'Description', 
    'URL', 'ThumbnailURL', 'UsageContext', 'Tags', 'IsActive'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  const sampleData = [
    ['MEDIA001', 'youtube_short', 'education', '外壁塗装の見極めポイント', '良い業者の選び方を60秒で解説', 'https://youtube.com/shorts/example1', 'https://img.youtube.com/vi/example1/default.jpg', 'stage2_education', 'education,tips', 'true'],
    ['MEDIA002', 'image', 'progress', 'マッチング進捗50%', 'マッチング進捗を示すビジュアル', '/images/match_progress_50.png', '', 'match_progress', 'progress,visual', 'true'],
    ['MEDIA003', 'chart', 'price_comparison', '地域別価格比較', '同地域での価格帯比較グラフ', '/charts/price_comparison.png', '', 'price_reveal', 'price,chart', 'true'],
    ['MEDIA004', 'video', 'testimonial', 'お客様の声', '実際のお客様インタビュー', 'https://youtube.com/watch?v=example2', '', 'closing_stage', 'testimonial,trust', 'true']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#795548').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * ユーザーセッションシート
 */
function createUserSessionsSheet(ss) {
  const sheet = ss.insertSheet('User_Sessions');
  
  const headers = [
    'SessionID', 'UserID', 'PostalCode', 'StartTime', 'CurrentStage', 
    'CurrentQuestionID', 'Answers', 'CalculatedPrice', 'MatchAccuracy', 
    'CompletedStages', 'LastActivity', 'Status'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // サンプルデータは空にしておく（実際のセッションデータが入る）
  sheet.getRange(1, 1, 1, headers.length).setBackground('#607D8B').setFontColor('white').setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * データ読み取り関数群
 */

// 質問データ取得
function getQuestionsByStage(stage) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = ss.getSheetByName('Questions_Master');
  const data = sheet.getDataRange().getValues();
  
  return data.filter(row => row[1] == stage && row[0] !== 'QuestionID');
}

// 豆知識取得
function getKnowledgeTip(stage, triggerCondition) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = ss.getSheetByName('Knowledge_Tips');
  const data = sheet.getDataRange().getValues();
  
  return data.find(row => row[1] == stage && row[2] == triggerCondition && row[9] == 'true');
}

// 価格計算
function calculatePrice(answers) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = ss.getSheetByName('Price_Calculation');
  const data = sheet.getDataRange().getValues();
  
  let basePrice = 800000;
  let factor = 1.0;
  let displayText = '';
  
  // 回答に基づいて価格調整
  Object.keys(answers).forEach(questionId => {
    const answer = answers[questionId];
    const adjustment = data.find(row => row[2] == answer);
    if (adjustment) {
      factor *= adjustment[4];
      if (adjustment[6]) displayText = adjustment[6];
    }
  });
  
  const finalPrice = Math.round(basePrice * factor);
  const priceRange = `${Math.round(finalPrice * 0.8)}万〜${Math.round(finalPrice * 1.1)}万円`;
  
  return {
    basePrice: finalPrice,
    priceRange: priceRange,
    displayText: displayText
  };
}

// セッション保存
function saveUserSession(sessionData) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  const sheet = ss.getSheetByName('User_Sessions');
  
  const newRow = [
    sessionData.sessionId,
    sessionData.userId || '',
    sessionData.postalCode,
    new Date(),
    sessionData.currentStage,
    sessionData.currentQuestionId,
    JSON.stringify(sessionData.answers),
    sessionData.calculatedPrice,
    sessionData.matchAccuracy,
    JSON.stringify(sessionData.completedStages),
    new Date(),
    sessionData.status || 'active'
  ];
  
  sheet.appendRow(newRow);
}

// スプレッドシートID管理（環境に応じて設定）
function getSpreadsheetId() {
  // PropertiesServiceで管理するか、直接IDを指定
  return PropertiesService.getScriptProperties().getProperty('CHATBOT_SPREADSHEET_ID');
}

function setSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('CHATBOT_SPREADSHEET_ID', id);
}