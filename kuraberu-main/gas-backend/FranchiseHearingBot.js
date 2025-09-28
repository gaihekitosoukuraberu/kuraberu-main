/**
 * 📂 ファイル名: FranchiseHearingBot.gs
 * 🎯 内容: 統合加盟店ヒアリングBOT システム（唯一のBOT本体）
 * 
 * 【統合済み機能】
 * ✅ franchise_hearing_bot.gs - 高度なLINE UI・住所入力支援
 * ✅ franchise_bot_gpt.gs     - GPT-4営業トーク・AI応答生成
 * ✅ franchise_bot.gs         - 基本ヒアリング・シンプルフロー
 * ✅ chatFlowBotEngine.gs     - ユーザー状態管理・ステップ制御
 * 
 * 【主要機能】
 * - LINE BOT による4択質問形式のヒアリング
 * - GAS バックエンドでの状態管理・フロー制御
 * - AI例文生成・住所候補機能・営業トーク生成
 * - スプレッドシート連携でのデータ管理
 * - 統一Webhook受信処理
 * 
 * 【アーカイブ済みファイル】
 * - chatFlowBotEngine.gs → _archive/
 * - engine_chat_logic_engine.gs → _archive/
 * - franchise_bot.gs → _archive/
 * - franchise_bot_gpt.gs → _archive/
 */

// ===========================================
// 統合BOT設定・定数定義
// ===========================================

// 統合BOT用の設定・定数定義（重複回避のため名前変更）
const BOT_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId();

// 旧システムとの互換性のため、削除対象シート名を定義
const BOT_DEPRECATED_SHEETS = [
  'フロー定義',
  'ユーザー案件', 
  'チャットログ',
  '加盟店子ユーザー一覧',
  '加盟店ヒアリング管理',
  '加盟店ヒアリング回答記録',
  '加盟店ヒアリング管理GPT',
  '加盟店ヒアリング回答記録GPT'
];

// 統合BOTで使用するシート名（重複回避）
const BOT_SHEETS = {
  QUESTIONS: '統合_質問リスト',
  ANSWERS: '統合_回答記録',
  USER_STATE: '統合_ユーザー状態',
  DELIVERY_CONTROL: '統合_配信制御',
  AREA_MANAGEMENT: '統合_エリア管理',
  AI_TEMPLATES: '統合_AI例文テンプレート'
};

// ===========================================
// データベース初期化・シート管理
// ===========================================

/**
 * ヒアリングBOT用データベース初期化
 * 必要なシートを自動作成し、初期データを設定
 * 
 * @returns {Object} 初期化結果
 */
function initializeFranchiseHearingDatabase() {
  try {
    Logger.log('🗃️ 統合加盟店ヒアリングBOT データベース初期化開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const initializedSheets = [];
    
    // 0. 旧シートのクリーンアップ（オプション）
    cleanupDeprecatedSheets(ss);
    
    // 1. 質問リストシート初期化
    const questionSheet = initializeQuestionListSheet(ss);
    initializedSheets.push(BOT_SHEETS.QUESTIONS);
    
    // 2. 回答記録シート初期化
    const answerSheet = initializeAnswerRecordSheet(ss);
    initializedSheets.push(FRANCHISE_HEARING_SHEETS.ANSWERS);
    
    // 3. ユーザー状態管理シート初期化
    const userStateSheet = initializeUserStateSheet(ss);
    initializedSheets.push(FRANCHISE_HEARING_SHEETS.USER_STATE);
    
    // 4. 配信制御シート初期化
    const deliveryControlSheet = initializeDeliveryControlSheet(ss);
    initializedSheets.push(FRANCHISE_HEARING_SHEETS.DELIVERY_CONTROL);
    
    // 5. エリア管理シート初期化
    const areaManagementSheet = initializeAreaManagementSheet(ss);
    initializedSheets.push(FRANCHISE_HEARING_SHEETS.AREA_MANAGEMENT);
    
    // 6. AI例文テンプレートシート初期化
    const aiTemplateSheet = initializeAITemplateSheet(ss);
    initializedSheets.push(FRANCHISE_HEARING_SHEETS.AI_TEMPLATES);
    
    Logger.log('✅ 統合加盟店ヒアリングBOT データベース初期化完了');
    
    return {
      success: true,
      initializedSheets: initializedSheets,
      cleanedUpSheets: DEPRECATED_SHEETS.length,
      message: `${initializedSheets.length}個のシートを初期化、${DEPRECATED_SHEETS.length}個の旧シートをクリーンアップしました`,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ データベース初期化エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 旧システムのシートをクリーンアップ
 * 重複や不要なシートを整理
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function cleanupDeprecatedSheets(ss) {
  try {
    Logger.log('🧹 旧システムシートのクリーンアップ開始');
    
    let cleanedCount = 0;
    
    BOT_DEPRECATED_SHEETS.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        // データがある場合は「_backup」をつけてリネーム
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          const backupName = `${sheetName}_backup_${Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd')}`;
          sheet.setName(backupName);
          Logger.log(`📋 バックアップとしてリネーム: ${sheetName} → ${backupName}`);
        } else {
          // データがない場合は削除
          ss.deleteSheet(sheet);
          Logger.log(`🗑️ 空シートを削除: ${sheetName}`);
        }
        cleanedCount++;
      }
    });
    
    Logger.log(`✅ クリーンアップ完了: ${cleanedCount}個のシートを処理`);
    
  } catch (error) {
    Logger.log(`⚠️ クリーンアップエラー: ${error.message}`);
  }
}

/**
 * 質問リストシート初期化
 * ヒアリング質問のマスターデータを管理
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function initializeQuestionListSheet(ss) {
  const sheetName = BOT_SHEETS.QUESTIONS;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📄 ${sheetName}シートを新規作成`);
    sheet = ss.insertSheet(sheetName);
    
    // ヘッダー設定
    const headers = [
      'ステップ番号',
      '質問ID', 
      '質問タイトル',
      '質問内容',
      '質問タイプ',
      '選択肢1',
      '選択肢2', 
      '選択肢3',
      '選択肢4',
      '次ステップ条件',
      'AI例文プロンプト',
      '住所入力支援',
      'エリア操作対象',
      'ステータス',
      '作成日',
      '更新日'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#2E7D32');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅調整
    sheet.setColumnWidth(1, 80);   // ステップ番号
    sheet.setColumnWidth(2, 120);  // 質問ID
    sheet.setColumnWidth(3, 200);  // 質問タイトル
    sheet.setColumnWidth(4, 300);  // 質問内容
    sheet.setColumnWidth(5, 100);  // 質問タイプ
    sheet.setColumnWidth(6, 150);  // 選択肢1-4
    sheet.setColumnWidth(7, 150);  
    sheet.setColumnWidth(8, 150);  
    sheet.setColumnWidth(9, 150);  
    sheet.setColumnWidth(10, 200); // 次ステップ条件
    sheet.setColumnWidth(11, 300); // AI例文プロンプト
    sheet.setColumnWidth(12, 100); // 住所入力支援
    sheet.setColumnWidth(13, 120); // エリア操作対象
    sheet.setColumnWidth(14, 80);  // ステータス
    sheet.setColumnWidth(15, 120); // 作成日
    sheet.setColumnWidth(16, 120); // 更新日
    
    // サンプル質問データ追加
    const sampleQuestions = [
      [
        1, 'Q001', '加盟動機の確認', 
        '外壁塗装事業への加盟を検討された理由は何ですか？', 
        '4択',
        '独立開業したい', '新規事業を始めたい', '既存事業の拡張', 'その他',
        'all→2', 
        '加盟動機について、より具体的な背景や将来のビジョンを教えてください。',
        'FALSE', '', 'アクティブ', new Date(), new Date()
      ],
      [
        2, 'Q002', '事業経験の確認',
        '建設・リフォーム関連の事業経験はありますか？',
        '4択', 
        '5年以上の経験あり', '1-5年の経験あり', '関連業界での経験あり', '未経験',
        'all→3',
        '事業経験の詳細について、具体的な業務内容や得意分野を教えてください。',
        'FALSE', '', 'アクティブ', new Date(), new Date()
      ],
      [
        3, 'Q003', '対応エリアの希望',
        'どちらのエリアでの事業展開をお考えですか？',
        '4択',
        '首都圏（東京・神奈川・埼玉・千葉）', '関西圏（大阪・京都・兵庫・奈良）', 
        '地方都市部', '詳細な住所を入力したい',
        '1,2,3→4 | 4→address_input',
        '希望エリアでの市場調査や競合分析についてアドバイスいたします。',
        'TRUE', 'prefecture,city', 'アクティブ', new Date(), new Date()
      ],
      [
        4, 'Q004', '投資予算の確認',
        '초기 투자 예산은 어느 정도로 계획하고 계십니까？',
        '4択',
        '500万円未満', '500-1000万円', '1000-2000万円', '2000万円以上',
        'all→5',
        '投資予算に合わせた最適な加盟プランをご提案いたします。',
        'FALSE', '', 'アクティブ', new Date(), new Date()
      ],
      [
        5, 'Q005', '開業希望時期',
        '事業開始の希望時期はいつ頃でしょうか？',
        '4択',
        '3ヶ月以内', '6ヶ月以内', '1年以内', '時期は未定',
        'all→complete',
        '開業に向けたスケジュールと準備項目をご案内いたします。',
        'FALSE', '', 'アクティブ', new Date(), new Date()
      ]
    ];
    
    sheet.getRange(2, 1, sampleQuestions.length, sampleQuestions[0].length).setValues(sampleQuestions);
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
  }
  
  return sheet;
}

/**
 * 回答記録シート初期化
 * ユーザーの回答履歴を記録
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function initializeAnswerRecordSheet(ss) {
  const sheetName = FRANCHISE_HEARING_SHEETS.ANSWERS;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📄 ${sheetName}シートを新規作成`);
    sheet = ss.insertSheet(sheetName);
    
    // ヘッダー設定
    const headers = [
      '記録ID',
      'ユーザーID',
      'ユーザー名',
      'ステップ番号',
      '質問ID',
      '質問内容',
      '回答内容',
      '選択肢番号',
      'AI例文',
      '住所情報',
      'エリア操作',
      '回答日時',
      'セッションID',
      '所要時間（秒）',
      'メタデータ'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1565C0');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅調整
    sheet.setColumnWidth(1, 150);  // 記録ID
    sheet.setColumnWidth(2, 150);  // ユーザーID
    sheet.setColumnWidth(3, 120);  // ユーザー名
    sheet.setColumnWidth(4, 80);   // ステップ番号
    sheet.setColumnWidth(5, 120);  // 質問ID
    sheet.setColumnWidth(6, 300);  // 質問内容
    sheet.setColumnWidth(7, 200);  // 回答内容
    sheet.setColumnWidth(8, 80);   // 選択肢番号
    sheet.setColumnWidth(9, 300);  // AI例文
    sheet.setColumnWidth(10, 200); // 住所情報
    sheet.setColumnWidth(11, 150); // エリア操作
    sheet.setColumnWidth(12, 140); // 回答日時
    sheet.setColumnWidth(13, 150); // セッションID
    sheet.setColumnWidth(14, 100); // 所要時間
    sheet.setColumnWidth(15, 200); // メタデータ
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
  }
  
  return sheet;
}

/**
 * ユーザー状態管理シート初期化
 * 各ユーザーの現在のヒアリング進行状況を管理
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function initializeUserStateSheet(ss) {
  const sheetName = FRANCHISE_HEARING_SHEETS.USER_STATE;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📄 ${sheetName}シートを新規作成`);
    sheet = ss.insertSheet(sheetName);
    
    // ヘッダー設定
    const headers = [
      'ユーザーID',
      'ユーザー名',
      '現在ステップ',
      '現在質問ID',
      'セッションID',
      'ヒアリング状態',
      '開始日時',
      '最終回答日時',
      '中断回数',
      '総回答数',
      '完了率（%）',
      '一時停止中',
      '再開予定日',
      'メモ',
      '更新日時'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#E65100');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅調整
    sheet.setColumnWidth(1, 150);  // ユーザーID
    sheet.setColumnWidth(2, 120);  // ユーザー名
    sheet.setColumnWidth(3, 80);   // 現在ステップ
    sheet.setColumnWidth(4, 120);  // 現在質問ID
    sheet.setColumnWidth(5, 150);  // セッションID
    sheet.setColumnWidth(6, 100);  // ヒアリング状態
    sheet.setColumnWidth(7, 140);  // 開始日時
    sheet.setColumnWidth(8, 140);  // 最終回答日時
    sheet.setColumnWidth(9, 80);   // 中断回数
    sheet.setColumnWidth(10, 80);  // 総回答数
    sheet.setColumnWidth(11, 80);  // 完了率
    sheet.setColumnWidth(12, 80);  // 一時停止中
    sheet.setColumnWidth(13, 120); // 再開予定日
    sheet.setColumnWidth(14, 200); // メモ
    sheet.setColumnWidth(15, 140); // 更新日時
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
  }
  
  return sheet;
}

/**
 * 配信制御シート初期化
 * 自動配信の停止・再開設定を管理
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function initializeDeliveryControlSheet(ss) {
  const sheetName = FRANCHISE_HEARING_SHEETS.DELIVERY_CONTROL;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📄 ${sheetName}シートを新規作成`);
    sheet = ss.insertSheet(sheetName);
    
    // ヘッダー設定
    const headers = [
      '制御ID',
      'ユーザーID',
      'ユーザー名',
      '配信状態',
      '停止開始日時',
      '停止終了日時',
      '停止理由',
      '自動再開',
      '再開条件',
      '手動操作者',
      '作成日時',
      '更新日時'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#6A1B9A');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅調整
    sheet.setColumnWidth(1, 120);  // 制御ID
    sheet.setColumnWidth(2, 150);  // ユーザーID
    sheet.setColumnWidth(3, 120);  // ユーザー名
    sheet.setColumnWidth(4, 80);   // 配信状態
    sheet.setColumnWidth(5, 140);  // 停止開始日時
    sheet.setColumnWidth(6, 140);  // 停止終了日時
    sheet.setColumnWidth(7, 200);  // 停止理由
    sheet.setColumnWidth(8, 80);   // 自動再開
    sheet.setColumnWidth(9, 150);  // 再開条件
    sheet.setColumnWidth(10, 120); // 手動操作者
    sheet.setColumnWidth(11, 140); // 作成日時
    sheet.setColumnWidth(12, 140); // 更新日時
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
  }
  
  return sheet;
}

/**
 * エリア管理シート初期化
 * 都道府県・市区町村の追加・削除操作を管理
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function initializeAreaManagementSheet(ss) {
  const sheetName = FRANCHISE_HEARING_SHEETS.AREA_MANAGEMENT;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📄 ${sheetName}シートを新規作成`);
    sheet = ss.insertSheet(sheetName);
    
    // ヘッダー設定
    const headers = [
      'エリアID',
      'ユーザーID',
      '都道府県',
      '市区町村',
      '詳細住所',
      '郵便番号',
      '緯度',
      '経度',
      '操作種別',
      '操作日時',
      'ステータス',
      'ChatGPT候補',
      '確認済み',
      'メタデータ'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#2E7D32');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅調整
    sheet.setColumnWidth(1, 120);  // エリアID
    sheet.setColumnWidth(2, 150);  // ユーザーID
    sheet.setColumnWidth(3, 100);  // 都道府県
    sheet.setColumnWidth(4, 120);  // 市区町村
    sheet.setColumnWidth(5, 200);  // 詳細住所
    sheet.setColumnWidth(6, 100);  // 郵便番号
    sheet.setColumnWidth(7, 80);   // 緯度
    sheet.setColumnWidth(8, 80);   // 経度
    sheet.setColumnWidth(9, 80);   // 操作種別
    sheet.setColumnWidth(10, 140); // 操作日時
    sheet.setColumnWidth(11, 80);  // ステータス
    sheet.setColumnWidth(12, 300); // ChatGPT候補
    sheet.setColumnWidth(13, 80);  // 確認済み
    sheet.setColumnWidth(14, 200); // メタデータ
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
  }
  
  return sheet;
}

/**
 * AI例文テンプレートシート初期化
 * ChatGPTによる例文生成のテンプレートを管理
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function initializeAITemplateSheet(ss) {
  const sheetName = FRANCHISE_HEARING_SHEETS.AI_TEMPLATES;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📄 ${sheetName}シートを新規作成`);
    sheet = ss.insertSheet(sheetName);
    
    // ヘッダー設定
    const headers = [
      'テンプレートID',
      'ステップ番号',
      '質問ID',
      'プロンプトタイプ',
      'システムプロンプト',
      'ユーザープロンプトテンプレート',
      '例文パターン数',
      '文字数制限',
      'トーン設定',
      '業界専門用語',
      'ステータス',
      '作成日',
      '更新日'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#FF6F00');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 列幅調整
    sheet.setColumnWidth(1, 150);  // テンプレートID
    sheet.setColumnWidth(2, 80);   // ステップ番号
    sheet.setColumnWidth(3, 120);  // 質問ID
    sheet.setColumnWidth(4, 120);  // プロンプトタイプ
    sheet.setColumnWidth(5, 400);  // システムプロンプト
    sheet.setColumnWidth(6, 400);  // ユーザープロンプトテンプレート
    sheet.setColumnWidth(7, 100);  // 例文パターン数
    sheet.setColumnWidth(8, 100);  // 文字数制限
    sheet.setColumnWidth(9, 100);  // トーン設定
    sheet.setColumnWidth(10, 150); // 業界専門用語
    sheet.setColumnWidth(11, 80);  // ステータス
    sheet.setColumnWidth(12, 120); // 作成日
    sheet.setColumnWidth(13, 120); // 更新日
    
    // サンプルAIテンプレートデータ追加
    const sampleTemplates = [
      [
        'AI_001', 1, 'Q001', '例文生成',
        'あなたは外壁塗装業界の経験豊富なコンサルタントです。加盟希望者の動機を深く理解し、共感しながら具体的なアドバイスを提供してください。',
        'ユーザーが「{answer}」と回答しました。この動機についてより詳しく教えてもらうための、親しみやすく具体的な質問を3つ生成してください。各質問は50文字以内で、業界の専門知識を活かした内容にしてください。',
        3, 50, '親しみやすい', '外壁塗装,独立開業,フランチャイズ', 'アクティブ', new Date(), new Date()
      ],
      [
        'AI_002', 3, 'Q003', '住所候補',
        'あなたは日本の地理に詳しい専門家です。ユーザーが入力した住所情報から、正確で候補となる住所を提案してください。',
        'ユーザーが「{input}」と入力しました。この入力から考えられる都道府県・市区町村の候補を5つまで、正確性の高い順に提案してください。各候補は「都道府県 市区町村」の形式で提示してください。',
        5, 20, '正確', '都道府県,市区町村,住所', 'アクティブ', new Date(), new Date()
      ]
    ];
    
    sheet.getRange(2, 1, sampleTemplates.length, sampleTemplates[0].length).setValues(sampleTemplates);
    
    Logger.log(`✅ ${sheetName}シート作成完了`);
  }
  
  return sheet;
}

// ===========================================
// 統合Webhook受信処理
// ===========================================

/**
 * 加盟店ヒアリングBOT専用 - Webhook受信ハンドラー（無効化済み）
 * notify_fixed.gs のhandleLineWebhookUnified()から呼び出される
 * 
 * @param {Object} e POST リクエスト
 * @returns {Object} 処理結果
 */
function doPostFranchiseHearingDisabled(e) {
  try {
    Logger.log('🎯 統合BOT Webhook受信開始');
    
    const requestBody = JSON.parse(e.postData.contents);
    const events = requestBody.events;
    
    if (!events || events.length === 0) {
      Logger.log('⚠️ イベントが空です');
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'No events' }));
    }
    
    const results = [];
    
    // 各イベントを処理
    events.forEach(event => {
      const result = handleLineWebhookForHearing(event);
      results.push(result);
    });
    
    Logger.log(`✅ Webhook処理完了: ${results.length}件`);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      processedEvents: results.length,
      results: results
    }));
    
  } catch (error) {
    Logger.log(`❌ Webhook処理エラー: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

/**
 * LINE プッシュメッセージ送信（統合版）
 * 名前衝突を回避するため sendLinePushFranchise に変更
 * 
 * @param {string} userId ユーザーID
 * @param {string} message メッセージ
 * @returns {Object} 送信結果
 */
function sendLinePushFranchise(userId, message) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
    if (!accessToken) {
      return {
        success: false,
        error: 'LINE アクセストークンが設定されていません'
      };
    }
    
    const requestBody = {
      to: userId,
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
    
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    
    return {
      success: response.getResponseCode() === 200,
      responseCode: response.getResponseCode(),
      responseText: response.getContentText()
    };
    
  } catch (error) {
    Logger.log(`❌ LINE プッシュメッセージ送信エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===========================================
// BOT フロー制御・状態管理
// ===========================================

/**
 * LINE BOTメッセージ受信ハンドラー
 * Webhookからの受信を処理し、適切なフローに振り分け
 * 
 * @param {Object} event LINE Webhook イベント
 * @returns {Object} 処理結果
 */
function handleLineWebhookForHearing(event) {
  try {
    Logger.log('🤖 LINE BOT ヒアリング受信ハンドラー開始');
    Logger.log(`イベントタイプ: ${event.type}, ユーザーID: ${event.source.userId}`);
    
    if (event.type === 'message' && event.message.type === 'text') {
      // テキストメッセージ受信
      return handleTextMessage(event);
    } else if (event.type === 'postback') {
      // ポストバック（4択回答等）受信
      return handlePostbackMessage(event);
    } else {
      Logger.log(`⚠️ 未対応イベントタイプ: ${event.type}`);
      return { success: true, message: '未対応イベント' };
    }
    
  } catch (error) {
    Logger.log(`❌ LINE BOT ハンドラーエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * テキストメッセージ処理
 * ユーザーからの自由入力テキストを処理
 * 
 * @param {Object} event LINE イベント
 * @returns {Object} 処理結果
 */
function handleTextMessage(event) {
  try {
    const userId = event.source.userId;
    const userText = event.message.text;
    const replyToken = event.replyToken;
    
    Logger.log(`📝 テキストメッセージ処理: ${userId} - "${userText}"`);
    
    // ユーザー状態取得
    const userState = getUserState(userId);
    
    // 特別コマンド処理
    if (userText.startsWith('/')) {
      return handleSpecialCommand(userId, userText, replyToken);
    }
    
    // 住所入力処理
    if (userState && userState.currentStep === 'address_input') {
      return handleAddressInput(userId, userText, replyToken);
    }
    
    // 新規ヒアリング開始 or 再開
    if (!userState || userState.status === 'completed') {
      return startNewHearing(userId, replyToken);
    } else {
      return resumeHearing(userId, replyToken);
    }
    
  } catch (error) {
    Logger.log(`❌ テキストメッセージ処理エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * ポストバック処理
 * 4択質問などの回答を処理
 * 
 * @param {Object} event LINE イベント
 * @returns {Object} 処理結果
 */
function handlePostbackMessage(event) {
  try {
    const userId = event.source.userId;
    const postbackData = JSON.parse(event.postback.data);
    const replyToken = event.replyToken;
    
    Logger.log(`🎯 ポストバック処理: ${userId} - ${JSON.stringify(postbackData)}`);
    
    // 回答記録
    const recordResult = recordUserAnswer(userId, postbackData);
    
    if (!recordResult.success) {
      throw new Error(`回答記録失敗: ${recordResult.error}`);
    }
    
    // AI例文生成（ヘルパー関数活用）
    const aiExampleResult = generateAIExample(userId, postbackData);
    
    // AI例文ログ記録
    if (aiExampleResult.success && recordResult.recordId) {
      logAIExampleGeneration(userId, {
        recordId: recordResult.recordId,
        aiContent: aiExampleResult.aiContent
      });
    }
    
    // 次のステップに進行
    const nextStepResult = proceedToNextStep(userId, postbackData, replyToken);
    
    return {
      success: true,
      recordResult: recordResult,
      aiExampleResult: aiExampleResult,
      nextStepResult: nextStepResult,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ ポストバック処理エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ===========================================
// 質問送信・UI表示機能
// ===========================================

/**
 * リッチな4択質問をLINEに送信
 * 
 * @param {string} userId ユーザーID
 * @param {Object} questionObject 質問オブジェクト
 * @param {string} replyToken 応答トークン
 * @returns {Object} 送信結果
 */
function sendRichQuestionToLine(userId, questionObject, replyToken) {
  try {
    Logger.log(`📤 リッチ質問送信: ${userId} - ${questionObject.questionId}`);
    
    // クイックリプライボタン作成
    const quickReply = {
      items: []
    };
    
    for (let i = 1; i <= 4; i++) {
      const choiceKey = `choice${i}`;
      if (questionObject[choiceKey]) {
        quickReply.items.push({
          type: 'action',
          action: {
            type: 'postback',
            label: questionObject[choiceKey],
            data: JSON.stringify({
              questionId: questionObject.questionId,
              stepNumber: questionObject.stepNumber,
              choiceNumber: i,
              choiceText: questionObject[choiceKey]
            })
          }
        });
      }
    }
    
    // メッセージ構築
    const message = {
      type: 'text',
      text: `【ステップ ${questionObject.stepNumber}】\n${questionObject.questionTitle}\n\n${questionObject.questionContent}\n\n以下から選択してください：`,
      quickReply: quickReply
    };
    
    // LINE API送信
    const sendResult = sendLineReplyMessage(replyToken, [message]);
    
    if (sendResult.success) {
      // ユーザー状態更新
      updateUserState(userId, {
        currentStep: questionObject.stepNumber,
        currentQuestionId: questionObject.questionId,
        lastInteractionAt: new Date()
      });
    }
    
    return sendResult;
    
  } catch (error) {
    Logger.log(`❌ リッチ質問送信エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * ヒアリング完了メッセージ送信
 * 
 * @param {string} userId ユーザーID
 * @param {string} replyToken 応答トークン
 * @returns {Object} 送信結果
 */
function sendHearingCompletionMessage(userId, replyToken) {
  try {
    Logger.log(`🎉 ヒアリング完了メッセージ送信: ${userId}`);
    
    const completionMessage = {
      type: 'text',
      text: `🎉 ヒアリングが完了しました！\n\nご回答いただき、ありがとうございました。\n担当者から詳細なご提案をお送りいたします。\n\n引き続き、どうぞよろしくお願いいたします。`
    };
    
    // ユーザー状態を完了に更新
    updateUserState(userId, {
      status: 'completed',
      completedAt: new Date(),
      completionRate: 100
    });
    
    return sendLineReplyMessage(replyToken, [completionMessage]);
    
  } catch (error) {
    Logger.log(`❌ 完了メッセージ送信エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// ===========================================
// データ管理・状態管理機能
// ===========================================

/**
 * ユーザー状態取得
 * 
 * @param {string} userId ユーザーID
 * @returns {Object|null} ユーザー状態
 */
function getUserState(userId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.USER_STATE);
    
    if (!sheet) {
      Logger.log('⚠️ ユーザー状態シートが見つかりません');
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        const userState = {};
        headers.forEach((header, index) => {
          userState[header] = data[i][index];
        });
        return userState;
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`❌ ユーザー状態取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * ユーザー状態更新（ヘルパー関数活用版）
 * 
 * @param {string} userId ユーザーID
 * @param {Object} updateData 更新データ
 * @returns {Object} 更新結果
 */
function updateUserState(userId, updateData) {
  // ヘルパー関数を使用して高度な更新処理を実行
  return updateUserStateAdvanced(userId, updateData, { autoTimestamp: true });
}

/**
 * 質問データをステップ番号で取得（ヘルパー関数活用版）
 * 
 * @param {number} stepNumber ステップ番号
 * @returns {Object|null} 質問データ
 */
function getQuestionByStep(stepNumber) {
  // ヘルパー関数を使用して質問を検索
  const questions = findQuestionsByCriteria({
    'ステップ番号': stepNumber,
    'ステータス': 'アクティブ'
  });
  
  return questions.length > 0 ? questions[0] : null;
}

/**
 * ユーザー回答記録
 * 
 * @param {string} userId ユーザーID
 * @param {Object} answerData 回答データ
 * @returns {Object} 記録結果
 */
function recordUserAnswer(userId, answerData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.ANSWERS);
    
    if (!sheet) {
      throw new Error('回答記録シートが見つかりません');
    }
    
    const recordId = `ANS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = new Date();
    
    const newRecord = [
      recordId,                    // 記録ID
      userId,                      // ユーザーID
      '',                          // ユーザー名（後で取得）
      answerData.stepNumber,       // ステップ番号
      answerData.questionId,       // 質問ID
      answerData.questionContent || '',  // 質問内容
      answerData.choiceText,       // 回答内容
      answerData.choiceNumber,     // 選択肢番号
      '',                          // AI例文（後で生成）
      answerData.addressInfo || '', // 住所情報
      answerData.areaOperation || '', // エリア操作
      timestamp,                   // 回答日時
      answerData.sessionId || '',  // セッションID
      answerData.responseTime || 0, // 所要時間
      JSON.stringify(answerData)   // メタデータ
    ];
    
    sheet.appendRow(newRecord);
    
    Logger.log(`✅ 回答記録完了: ${recordId}`);
    
    return {
      success: true,
      recordId: recordId,
      userId: userId,
      timestamp: timestamp
    };
    
  } catch (error) {
    Logger.log(`❌ 回答記録エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 新規ヒアリング開始
 * 
 * @param {string} userId ユーザーID
 * @param {string} replyToken 応答トークン
 * @returns {Object} 開始結果
 */
function startNewHearing(userId, replyToken) {
  try {
    Logger.log(`🆕 新規ヒアリング開始: ${userId}`);
    
    // ユーザー状態初期化
    const sessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    updateUserState(userId, {
      'セッションID': sessionId,
      '現在ステップ': 1,
      '現在質問ID': 'Q001',
      'ヒアリング状態': 'in_progress',
      '開始日時': new Date()
    });
    
    // 最初の質問取得・送信
    const firstQuestion = getQuestionByStep(1);
    if (!firstQuestion) {
      throw new Error('最初の質問が見つかりません');
    }
    
    return sendRichQuestionToLine(userId, firstQuestion, replyToken);
    
  } catch (error) {
    Logger.log(`❌ 新規ヒアリング開始エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * ヒアリング再開
 * 
 * @param {string} userId ユーザーID
 * @param {string} replyToken 応答トークン
 * @returns {Object} 再開結果
 */
function resumeHearing(userId, replyToken) {
  try {
    Logger.log(`🔄 ヒアリング再開: ${userId}`);
    
    const userState = getUserState(userId);
    if (!userState) {
      return startNewHearing(userId, replyToken);
    }
    
    // 現在ステップの質問取得・送信
    const currentQuestion = getQuestionByStep(userState['現在ステップ']);
    if (!currentQuestion) {
      throw new Error('現在の質問が見つかりません');
    }
    
    // 中断回数を更新
    updateUserState(userId, {
      '中断回数': (userState['中断回数'] || 0) + 1,
      '最終回答日時': new Date()
    });
    
    // 再開メッセージ付きで質問送信
    const resumeMessage = {
      type: 'text',
      text: `ヒアリングを再開します。\n前回の続きからお答えください。`
    };
    
    sendLineReplyMessage(replyToken, [resumeMessage]);
    
    // 少し遅延してから質問送信（メッセージが混在しないように）
    Utilities.sleep(1000);
    
    return sendRichQuestionToLine(userId, currentQuestion, replyToken);
    
  } catch (error) {
    Logger.log(`❌ ヒアリング再開エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 次のステップに進行
 * 
 * @param {string} userId ユーザーID
 * @param {Object} answerData 回答データ
 * @param {string} replyToken 応答トークン
 * @returns {Object} 進行結果
 */
function proceedToNextStep(userId, answerData, replyToken) {
  try {
    Logger.log(`➡️ 次ステップ進行: ${userId} - ステップ${answerData.stepNumber}`);
    
    // 現在の質問データ取得
    const currentQuestion = getQuestionByStep(answerData.stepNumber);
    if (!currentQuestion) {
      throw new Error('現在の質問データが見つかりません');
    }
    
    // 次ステップ判定
    const nextStepCondition = currentQuestion['次ステップ条件'];
    const nextStep = determineNextStep(nextStepCondition, answerData);
    
    Logger.log(`次ステップ判定結果: ${nextStep}`);
    
    if (nextStep === 'complete') {
      // ヒアリング完了
      return sendHearingCompletionMessage(userId, replyToken);
    } else if (nextStep === 'address_input') {
      // 住所入力モード
      return startAddressInputMode(userId, replyToken);
    } else if (typeof nextStep === 'number') {
      // 通常の次の質問
      const nextQuestion = getQuestionByStep(nextStep);
      if (!nextQuestion) {
        throw new Error(`次の質問が見つかりません: ステップ${nextStep}`);
      }
      
      // ユーザー状態更新（ヘルパー関数で進捗率自動計算）
      const currentState = getUserState(userId);
      updateUserState(userId, {
        '現在ステップ': nextStep,
        '現在質問ID': nextQuestion['質問ID'],
        '総回答数': (currentState['総回答数'] || 0) + 1
      });
      
      return sendRichQuestionToLine(userId, nextQuestion, replyToken);
    } else {
      throw new Error(`不正な次ステップ: ${nextStep}`);
    }
    
  } catch (error) {
    Logger.log(`❌ 次ステップ進行エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 次ステップ判定
 * 
 * @param {string} condition 条件文字列
 * @param {Object} answerData 回答データ
 * @returns {number|string} 次ステップ
 */
function determineNextStep(condition, answerData) {
  try {
    // 条件解析: "1,2,3→4 | 4→address_input" 形式
    const conditions = condition.split(' | ');
    
    for (const cond of conditions) {
      const [choices, target] = cond.split('→');
      
      if (choices === 'all') {
        return target === 'complete' ? 'complete' : 
               target === 'address_input' ? 'address_input' : 
               parseInt(target);
      }
      
      const choiceNumbers = choices.split(',').map(n => parseInt(n.trim()));
      if (choiceNumbers.includes(answerData.choiceNumber)) {
        return target === 'complete' ? 'complete' : 
               target === 'address_input' ? 'address_input' : 
               parseInt(target);
      }
    }
    
    // デフォルト: 次のステップ
    return answerData.stepNumber + 1;
    
  } catch (error) {
    Logger.log(`❌ 次ステップ判定エラー: ${error.message}`);
    return answerData.stepNumber + 1;
  }
}

/**
 * 住所入力モード開始
 * 
 * @param {string} userId ユーザーID
 * @param {string} replyToken 応答トークン
 * @returns {Object} 開始結果
 */
function startAddressInputMode(userId, replyToken) {
  try {
    Logger.log(`📍 住所入力モード開始: ${userId}`);
    
    // ユーザー状態を住所入力モードに更新
    updateUserState(userId, {
      '現在ステップ': 'address_input',
      '現在質問ID': 'ADDRESS_INPUT'
    });
    
    const addressInputMessage = {
      type: 'text',
      text: `📍 詳細な住所入力\n\n希望するエリアの住所を入力してください。\n\n例：\n・東京都渋谷区\n・大阪市中央区\n・札幌市北区\n\n入力いただいた内容から、候補をご提案いたします。`
    };
    
    return sendLineReplyMessage(replyToken, [addressInputMessage]);
    
  } catch (error) {
    Logger.log(`❌ 住所入力モード開始エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 住所入力処理
 * 
 * @param {string} userId ユーザーID
 * @param {string} addressInput 住所入力
 * @param {string} replyToken 応答トークン
 * @returns {Object} 処理結果
 */
function handleAddressInput(userId, addressInput, replyToken) {
  try {
    Logger.log(`📍 住所入力処理: ${userId} - "${addressInput}"`);
    
    // ChatGPTで住所候補生成
    const addressCandidates = generateAddressCandidates(addressInput);
    
    // 住所候補をクイックリプライで表示
    const quickReply = {
      items: []
    };
    
    addressCandidates.forEach((candidate, index) => {
      if (index < 10) { // LINE制限
        quickReply.items.push({
          type: 'action',
          action: {
            type: 'postback',
            label: candidate,
            data: JSON.stringify({
              type: 'address_confirm',
              address: candidate,
              originalInput: addressInput
            })
          }
        });
      }
    });
    
    // 「その他」オプション追加
    quickReply.items.push({
      type: 'action',
      action: {
        type: 'postback',
        label: '🔄 再入力する',
        data: JSON.stringify({
          type: 'address_retry',
          originalInput: addressInput
        })
      }
    });
    
    const candidateMessage = {
      type: 'text',
      text: `📍 住所候補\n\n「${addressInput}」から以下の候補を生成しました。\n該当するものを選択してください：`,
      quickReply: quickReply
    };
    
    const result = sendLineReplyMessage(replyToken, [candidateMessage]);
    
    // 住所候補生成ログ記録
    if (result.success) {
      logAddressSelection(userId, addressInput, addressCandidates, '候補提示完了');
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ 住所入力処理エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * AI例文生成
 * 
 * @param {string} userId ユーザーID
 * @param {Object} answerData 回答データ
 * @returns {Object} 生成結果
 */
function generateAIExample(userId, answerData) {
  try {
    Logger.log(`🤖 AI例文生成開始: ${userId} - ${answerData.questionId}`);
    
    // AI例文テンプレート取得
    const template = getAITemplate(answerData.stepNumber, answerData.questionId);
    if (!template) {
      Logger.log('⚠️ AIテンプレートが見つかりません');
      return { success: false, message: 'テンプレート未設定' };
    }
    
    // プロンプト構築
    const userPrompt = template['ユーザープロンプトテンプレート']
      .replace('{answer}', answerData.choiceText)
      .replace('{questionId}', answerData.questionId)
      .replace('{stepNumber}', answerData.stepNumber);
    
    // ChatGPT API呼び出し
    const aiResponse = callChatGPTAPI(template['システムプロンプト'], userPrompt);
    
    if (aiResponse.success) {
      // AI例文をLINEで送信
      const exampleMessage = {
        type: 'text',
        text: `💡 AI例文・アドバイス\n\n${aiResponse.content}\n\n───────────────\n次の質問に進みます...`
      };
      
      // プッシュメッセージで送信（replyTokenとは別）
      sendLinePushFranchise(userId, exampleMessage.text);
      
      return {
        success: true,
        aiContent: aiResponse.content,
        promptUsed: userPrompt
      };
    } else {
      Logger.log(`⚠️ ChatGPT API失敗: ${aiResponse.error}`);
      return {
        success: false,
        error: aiResponse.error
      };
    }
    
  } catch (error) {
    Logger.log(`❌ AI例文生成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * AIテンプレート取得
 * 
 * @param {number} stepNumber ステップ番号
 * @param {string} questionId 質問ID
 * @returns {Object|null} AIテンプレート
 */
function getAITemplate(stepNumber, questionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FRANCHISE_HEARING_SHEETS.AI_TEMPLATES);
    
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      if ((data[i][1] === stepNumber || data[i][1] === '') && 
          (data[i][2] === questionId || data[i][2] === '') &&
          data[i][headers.indexOf('ステータス')] === 'アクティブ') {
        const template = {};
        headers.forEach((header, index) => {
          template[header] = data[i][index];
        });
        return template;
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`❌ AIテンプレート取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * ChatGPT住所候補生成
 * 
 * @param {string} addressInput 住所入力
 * @returns {Array} 住所候補リスト
 */
function generateAddressCandidates(addressInput) {
  try {
    const systemPrompt = "あなたは日本の地理に詳しい専門家です。ユーザーが入力した住所情報から、正確で候補となる住所を提案してください。";
    const userPrompt = `「${addressInput}」から考えられる都道府県・市区町村の候補を5つまで、正確性の高い順に提案してください。各候補は「都道府県 市区町村」の形式で、改行区切りで提示してください。`;
    
    const response = callChatGPTAPI(systemPrompt, userPrompt);
    
    if (response.success) {
      const candidates = response.content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
      
      return candidates;
    } else {
      Logger.log(`⚠️ 住所候補生成失敗: ${response.error}`);
      // フォールバック候補
      return [
        `${addressInput}市`,
        `${addressInput}区`,
        `${addressInput}町`,
        `${addressInput}村`
      ].slice(0, 3);
    }
    
  } catch (error) {
    Logger.log(`❌ 住所候補生成エラー: ${error.message}`);
    return [`${addressInput}（確認中）`];
  }
}

/**
 * ChatGPT API呼び出し
 * 
 * @param {string} systemPrompt システムプロンプト
 * @param {string} userPrompt ユーザープロンプト
 * @returns {Object} API応答
 */
function callChatGPTAPI(systemPrompt, userPrompt) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI APIキーが設定されていません'
      };
    }
    
    const requestBody = {
      model: "gpt-3.5-turbo",
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
      max_tokens: 500,
      temperature: 0.7
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(requestBody)
    };
    
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const responseData = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200 && responseData.choices && responseData.choices.length > 0) {
      return {
        success: true,
        content: responseData.choices[0].message.content.trim()
      };
    } else {
      return {
        success: false,
        error: responseData.error ? responseData.error.message : '不明なエラー'
      };
    }
    
  } catch (error) {
    Logger.log(`❌ ChatGPT API呼び出しエラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * LINE応答メッセージ送信
 * 
 * @param {string} replyToken 応答トークン
 * @param {Array} messages メッセージ配列
 * @returns {Object} 送信結果
 */
function sendLineReplyMessage(replyToken, messages) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
    if (!accessToken) {
      return {
        success: false,
        error: 'LINE アクセストークンが設定されていません'
      };
    }
    
    const requestBody = {
      replyToken: replyToken,
      messages: messages
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
      responseCode: response.getResponseCode(),
      responseText: response.getContentText()
    };
    
  } catch (error) {
    Logger.log(`❌ LINE応答メッセージ送信エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 特別コマンド処理
 * 
 * @param {string} userId ユーザーID
 * @param {string} command コマンド
 * @param {string} replyToken 応答トークン
 * @returns {Object} 処理結果
 */
function handleSpecialCommand(userId, command, replyToken) {
  try {
    Logger.log(`⚡ 特別コマンド処理: ${userId} - "${command}"`);
    
    switch (command.toLowerCase()) {
      case '/start':
      case '/restart':
        return startNewHearing(userId, replyToken);
        
      case '/status':
        const userState = getUserState(userId);
        const statusMessage = {
          type: 'text',
          text: userState ? 
            `📊 ヒアリング状況\n\n現在ステップ: ${userState['現在ステップ']}\n進行状況: ${userState['ヒアリング状態']}\n回答数: ${userState['総回答数'] || 0}` :
            '❌ ヒアリング情報が見つかりません'
        };
        return sendLineReplyMessage(replyToken, [statusMessage]);
        
      case '/help':
        const helpMessage = {
          type: 'text',
          text: `🤖 加盟店ヒアリングBOT ヘルプ\n\n利用可能なコマンド：\n/start - ヒアリング開始\n/restart - ヒアリング再開始\n/status - 進行状況確認\n/help - このヘルプ\n\n通常のヒアリングを開始するには、何かメッセージを送信してください。`
        };
        return sendLineReplyMessage(replyToken, [helpMessage]);
        
      default:
        const unknownMessage = {
          type: 'text',
          text: `❓ 不明なコマンド: ${command}\n\n/help でコマンド一覧を確認できます。`
        };
        return sendLineReplyMessage(replyToken, [unknownMessage]);
    }
    
  } catch (error) {
    Logger.log(`❌ 特別コマンド処理エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

// ===========================================
// テスト・デバッグ機能
// ===========================================

/**
 * 統合システムテスト（ヘルパー関数連携版）
 * 
 * @returns {Object} テスト結果
 */
function testIntegratedFranchiseHearingSystem() {
  try {
    Logger.log('🧪 統合加盟店ヒアリングシステムテスト開始');
    
    const testResults = [];
    
    // 1. ヘルパー関数テスト
    Logger.log('--- ヘルパー関数テスト ---');
    const helperTest = testFranchiseHearingHelpers();
    testResults.push({
      name: 'ヘルパー関数',
      success: helperTest.success,
      details: helperTest.success ? 
        `${helperTest.summary.successfulTests}/${helperTest.summary.totalTests} 成功` : 
        helperTest.error
    });
    
    // 2. データベース初期化テスト
    Logger.log('--- データベース初期化テスト ---');
    const dbInitResult = initializeFranchiseHearingDatabase();
    testResults.push({
      name: 'データベース初期化',
      success: dbInitResult.success,
      details: dbInitResult.success ? 
        `${dbInitResult.initializedSheets.length}個のシート初期化` : 
        dbInitResult.error
    });
    
    // 3. 統合質問取得テスト
    Logger.log('--- 統合質問取得テスト ---');
    const questionTest = getQuestionByStep(1);
    testResults.push({
      name: '統合質問取得',
      success: questionTest !== null,
      details: questionTest ? 
        `ステップ1質問取得: ${questionTest['質問ID']}` : 
        '質問データ取得失敗'
    });
    
    // 4. 統合ユーザー状態管理テスト
    Logger.log('--- 統合ユーザー状態管理テスト ---');
    const testUserId = 'TEST_INTEGRATED_001';
    const stateUpdateResult = updateUserState(testUserId, {
      'ユーザー名': 'テスト統合ユーザー',
      '現在ステップ': 1,
      'ヒアリング状態': 'in_progress',
      '総回答数': 2
    });
    testResults.push({
      name: '統合ユーザー状態管理',
      success: stateUpdateResult.success,
      details: stateUpdateResult.success ? 
        `ユーザー状態更新完了（進捗率自動計算）: ${testUserId}` : 
        stateUpdateResult.error
    });
    
    // 5. 進捗サマリーテスト
    Logger.log('--- 進捗サマリーテスト ---');
    const progressSummary = getUserProgressSummary(testUserId);
    testResults.push({
      name: '進捗サマリー',
      success: !progressSummary.error,
      details: progressSummary.error || 
        `進捗率: ${progressSummary.completionRate}%, 回答数: ${progressSummary.answeredCount}`
    });
    
    // 6. 統計機能テスト
    Logger.log('--- 統計機能テスト ---');
    const stats = getHearingCompletionStats();
    testResults.push({
      name: '統計機能',
      success: !stats.error,
      details: stats.error || 
        `${stats.totalUsers}人, 完了率平均: ${stats.averageCompletionRate}%`
    });
    
    // テスト統計
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ 統合システムテスト完了');
    
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
      message: `統合テスト完了: ${successfulTests}/${totalTests} 成功 (成功率: ${successRate}%)`
    };
    
  } catch (error) {
    Logger.log(`❌ 統合システムテストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * 加盟店ヒアリングBOTシステムテスト
 * 全機能の動作確認を実行
 * 
 * @returns {Object} テスト結果
 */
function testFranchiseHearingBotSystem() {
  try {
    Logger.log('🧪 加盟店ヒアリングBOTシステムテスト開始');
    
    const testResults = [];
    
    // 1. データベース初期化テスト
    Logger.log('--- データベース初期化テスト ---');
    const dbInitResult = initializeFranchiseHearingDatabase();
    testResults.push({
      name: 'データベース初期化',
      success: dbInitResult.success,
      details: dbInitResult.success ? 
        `${dbInitResult.initializedSheets.length}個のシート初期化` : 
        dbInitResult.error
    });
    
    // 2. 質問データ取得テスト
    Logger.log('--- 質問データ取得テスト ---');
    const questionTest = getQuestionByStep(1);
    testResults.push({
      name: '質問データ取得',
      success: questionTest !== null,
      details: questionTest ? 
        `ステップ1質問取得: ${questionTest.questionId}` : 
        '質問データ取得失敗'
    });
    
    // 3. ユーザー状態管理テスト
    Logger.log('--- ユーザー状態管理テスト ---');
    const testUserId = 'TEST_USER_001';
    const stateUpdateResult = updateUserState(testUserId, {
      'ユーザー名': 'テストユーザー',
      '現在ステップ': 1,
      'ヒアリング状態': 'in_progress'
    });
    testResults.push({
      name: 'ユーザー状態管理',
      success: stateUpdateResult.success,
      details: stateUpdateResult.success ? 
        `ユーザー状態更新完了: ${testUserId}` : 
        stateUpdateResult.error
    });
    
    // 4. 回答記録テスト
    Logger.log('--- 回答記録テスト ---');
    const answerRecordResult = recordUserAnswer(testUserId, {
      questionId: 'Q001',
      stepNumber: 1,
      choiceNumber: 1,
      choiceText: 'テスト回答'
    });
    testResults.push({
      name: '回答記録',
      success: answerRecordResult.success,
      details: answerRecordResult.success ? 
        `回答記録完了: ${answerRecordResult.recordId}` : 
        answerRecordResult.error
    });
    
    // テスト統計
    const totalTests = testResults.length;
    const successfulTests = testResults.filter(test => test.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);
    
    Logger.log('✅ 加盟店ヒアリングBOTシステムテスト完了');
    
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
    Logger.log(`❌ システムテストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * フランチャイズ加盟店ヒアリングBOT
 * スプレッドシート管理による分岐システム
 */

// ヒアリング設定
const HEARING_CONFIG = {
  spreadsheetId: null, // 初期化時にプロパティから取得
  sheetNames: {
    franchiseData: '加盟店情報',
    hearingFlow: 'ヒアリングフロー',
    areaData: '対応エリアマスタ',
    serviceData: '施工箇所マスタ'
  },
  sessionTimeout: 30 * 60 * 1000 // 30分
};

/**
 * ヒアリングBOT初期化
 */
function initializeFranchiseHearingBot() {
  try {
    console.log('🤖 フランチャイズヒアリングBOT初期化開始');
    
    // スプレッドシートID取得
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    HEARING_CONFIG.spreadsheetId = spreadsheetId;
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // 必要なシートを初期化
    initializeHearingFlowSheet(ss);
    initializeAreaMasterSheet(ss);
    initializeServiceMasterSheet(ss);
    initializeFranchiseDataSheet(ss);
    
    console.log('✅ フランチャイズヒアリングBOT初期化完了');
    return { success: true };
    
  } catch (error) {
    console.error('❌ ヒアリングBOT初期化エラー:', error);
    throw error;
  }
}

/**
 * ヒアリングフローシート初期化
 */
function initializeHearingFlowSheet(ss) {
  const sheetName = HEARING_CONFIG.sheetNames.hearingFlow;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // ヘッダー設定
  const headers = [
    'ステップID', '質問タイプ', '質問文', '選択肢データ', '必須フラグ', 
    '次ステップ条件', '入力検証', 'GPT補助フラグ', 'スキップ条件', '説明文'
  ];
  
  // 既存データをチェック
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length <= 1) {
    // ヒアリングフローデータを設定
    const flowData = [
      headers,
      ['step1', 'text', '会社名を入力してください', '', 'true', 'step2', 'required', 'false', '', '正式な会社名をご入力ください'],
      ['step2', 'confirm', '会社名の読み方は「{kana}」でお間違いないですか？', 'はい,いいえ', 'true', 'step2b:いいえ,step3:はい', '', 'true', '', ''],
      ['step2b', 'text', '会社名の正しい読み方（カナ）を入力してください', '', 'true', 'step3', 'katakana', 'false', '', 'カタカナで入力してください'],
      ['step3', 'text', '屋号があれば入力してください', '', 'false', 'step4', '', 'false', '', '会社名と同じであればスキップしてください'],
      ['step4', 'confirm', '屋号の読み方は「{kana}」でお間違いないですか？', 'はい,いいえ', 'false', 'step4b:いいえ,step5:はい', '', 'true', 'skip_if_empty_step3', ''],
      ['step4b', 'text', '屋号の正しい読み方（カナ）を入力してください', '', 'true', 'step5', 'katakana', 'false', '', ''],
      ['step5', 'text', '代表者名（フルネーム）を入力してください', '', 'true', 'step6', 'required', 'false', '', ''],
      ['step6', 'select', '代表者ご本人が登録作業をされていますか？', 'はい,いいえ', 'true', 'step10:はい,step7:いいえ', '', 'false', '', ''],
      ['step7', 'text', '担当者名を入力してください', '', 'true', 'step8', 'required', 'false', '', '例：営業部の佐藤'],
      ['step8', 'text', '担当者の電話番号を入力してください', '', 'true', 'step9', 'phone', 'false', '', '例：080-1234-5678'],
      ['step9', 'text', '担当者のメールアドレスを入力してください', '', 'true', 'step10', 'email', 'false', '', '例：tanaka@example.com'],
      ['step10', 'postcode', '会社の郵便番号を入力してください', '', 'true', 'step11', 'postcode', 'false', '', '住所を自動入力します'],
      ['step11', 'text', '会社住所の続き（番地・建物名等）を入力してください', '', 'true', 'step12', 'required', 'false', '', ''],
      ['step12', 'area_select', '対応可能エリアを選択してください', 'prefecture', 'true', 'step13', '', 'false', '', '複数選択可能です'],
      ['step13', 'area_priority', '最優先エリアを選択してください（最大3つ）', '', 'false', 'step14', '', 'false', '', '特に優先したい地域がなければスキップ可能'],
      ['step14', 'text', '会社固定電話番号を入力してください', '', 'false', 'step15', 'phone', 'false', '', '例：03-1234-5678'],
      ['step15', 'date_select', '会社設立年月を選択してください', 'year_month', 'false', 'step16', '', 'false', '', '不明な場合は年だけでも可'],
      ['step16', 'text', '法人番号を入力してください（13桁）', '', 'false', 'step17', 'corporate_number', 'false', '', ''],
      ['step17', 'text', '支店名があれば入力してください', '', 'false', 'step18', '', 'false', '', '支店がない場合はスキップ'],
      ['step18', 'text', 'ホームページURLを入力してください', '', 'false', 'step19', 'url', 'false', '', '例：https://example.com'],
      ['step19', 'text', '会社の特徴を入力してください', '', 'false', 'step20', '', 'true', '', 'GPT補助で例文提示します'],
      ['step20', 'text', '施工実績について入力してください', '', 'false', 'step21', '', 'true', '', '年間件数や得意分野など'],
      ['step21', 'text', 'PR文を入力してください', '', 'false', 'step22', '', 'true', '', 'お客様へのアピールポイント'],
      ['step22', 'checkbox', '対応可能な物件種別を選択してください', 'property_types', 'true', 'step23', '', 'false', '', '複数選択可'],
      ['step23', 'service_select', '対応可能な施工箇所を選択してください', 'services', 'true', 'step24', '', 'false', '', '料金も表示されます'],
      ['step24', 'checkbox', '特殊対応が可能な項目を選択してください', 'special_services', 'false', 'step25', '', 'false', '', ''],
      ['step25', 'text', '対応可能な築年数範囲を入力してください', '', 'false', 'step26', '', 'false', '', '例：5年〜40年まで対応可能'],
      ['step26', 'number', '月間配信上限件数を入力してください', '', 'true', 'step27', 'positive_number', 'false', '', '月初〜月末までの最大受信件数'],
      ['step27', 'number', '週間配信上限件数を入力してください', '', 'true', 'step28', 'positive_number', 'false', '', '月曜〜日曜までの最大受信件数'],
      ['step28', 'confirm', '入力内容を確認してください', 'この内容で登録する,修正する', 'true', 'complete:この内容で登録する,step1:修正する', '', 'false', '', ''],
      ['complete', 'message', '登録完了しました！', '', 'false', '', '', 'false', '', 'ご登録ありがとうございます。内容は管理画面からいつでも編集可能です']
    ];
    
    sheet.getRange(1, 1, flowData.length, flowData[0].length).setValues(flowData);
    
    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold').setBackground('#E8F0FE');
  }
  
  console.log('✅ ヒアリングフローシート初期化完了');
}

/**
 * 対応エリアマスタシート初期化
 */
function initializeAreaMasterSheet(ss) {
  const sheetName = HEARING_CONFIG.sheetNames.areaData;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  const headers = ['都道府県コード', '都道府県名', '市区町村コード', '市区町村名', '表示順'];
  const existingData = sheet.getDataRange().getValues();
  
  if (existingData.length <= 1) {
    // 画像から読み取った都道府県・市区町村データ
    const areaData = [
      headers,
      ['01', '北海道', '', '', 1],
      ['02', '青森県', '', '', 2],
      ['03', '秋田県', '', '', 3],
      ['04', '岩手県', '', '', 4],
      ['05', '宮城県', '', '', 5],
      ['06', '山形県', '', '', 6],
      ['07', '福島県', '', '', 7],
      ['08', '茨城県', '', '', 8],
      ['09', '栃木県', '', '', 9],
      ['10', '群馬県', '', '', 10],
      ['11', '埼玉県', '', '', 11],
      ['12', '千葉県', '', '', 12],
      ['13', '東京都', '', '', 13],
      ['13', '東京都', '13000', '東京都全域', 1],
      ['13', '東京都', '13001', '東京23区全域', 2],
      ['13', '東京都', '13101', '千代田区', 3],
      ['13', '東京都', '13102', '中央区', 4],
      ['13', '東京都', '13103', '港区', 5],
      ['13', '東京都', '13104', '新宿区', 6],
      ['13', '東京都', '13105', '文京区', 7],
      ['13', '東京都', '13106', '台東区', 8],
      ['13', '東京都', '13107', '墨田区', 9],
      ['13', '東京都', '13108', '江東区', 10],
      ['13', '東京都', '13109', '品川区', 11],
      ['13', '東京都', '13110', '目黒区', 12],
      ['13', '東京都', '13111', '大田区', 13],
      ['13', '東京都', '13112', '世田谷区', 14],
      ['13', '東京都', '13113', '渋谷区', 15],
      ['13', '東京都', '13114', '中野区', 16],
      ['13', '東京都', '13115', '杉並区', 17],
      ['13', '東京都', '13116', '豊島区', 18],
      ['13', '東京都', '13117', '北区', 19],
      ['14', '神奈川県', '', '', 14],
      ['15', '新潟県', '', '', 15],
      ['16', '富山県', '', '', 16],
      ['17', '石川県', '', '', 17],
      ['18', '福井県', '', '', 18],
      ['19', '山梨県', '', '', 19],
      ['20', '長野県', '', '', 20],
      ['21', '岐阜県', '', '', 21]
    ];
    
    sheet.getRange(1, 1, areaData.length, areaData[0].length).setValues(areaData);
    
    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold').setBackground('#E8F0FE');
  }
  
  console.log('✅ 対応エリアマスタシート初期化完了');
}

/**
 * 施工箇所マスタシート初期化
 */
function initializeServiceMasterSheet(ss) {
  const sheetName = HEARING_CONFIG.sheetNames.serviceData;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  const headers = ['サービスID', 'サービス名', '基本料金', '説明', 'カテゴリ', '表示順'];
  const existingData = sheet.getDataRange().getValues();
  
  if (existingData.length <= 1) {
    // 画像から読み取った施工箇所と料金データ
    const serviceData = [
      headers,
      ['service01', '外壁塗装', '20000', '外壁塗装一式', 'basic', 1],
      ['service02', '外壁カバー工法', '20000', '', 'basic', 2],
      ['service03', '外壁張替え', '20000', '', 'basic', 3],
      ['service04', '屋根塗装（外壁工事含む）', '20000', '', 'basic', 4],
      ['service05', '屋上防水（外壁工事含む）', '20000', '', 'basic', 5],
      ['service06', '屋根葺き替え・張り替え ※スレート・ガルバリウム等', '20000', '', 'basic', 6],
      ['service07', '屋根葺き替え・張り替え ※瓦', '20000', '', 'basic', 7],
      ['service08', '屋根カバー工法', '20000', '', 'basic', 8],
      ['service09', '外壁補修（外壁工事含む）', '20000', '', 'basic', 9],
      ['service10', '屋根補修（外壁工事含む）', '20000', '', 'basic', 10],
      ['service11', 'ベランダ防水（外壁工事含む）', '20000', '', 'basic', 11],
      ['service12', '内装水回り（バス・キッチン・トイレ）（外壁工事含む）', '20000', '', 'basic', 12],
      ['service13', '内装（フローリングや畳などの床・クロス等）（外壁工事含む）', '20000', '', 'basic', 13],
      ['service14', '屋根塗装単品（1万円・但し1社紹介時は定価）', '10000', '但し1社紹介時は定価', 'single', 14],
      ['service15', '屋上防水単品（1万円・但し1社紹介時は定価）', '10000', '但し1社紹介時は定価', 'single', 15],
      ['service16', '外壁補修単品（5千円・但し1社紹介時は定価）', '5000', '但し1社紹介時は定価', 'repair', 16],
      ['service17', '屋根補修単品（5千円・但し1社紹介時は定価）', '5000', '但し1社紹介時は定価', 'repair', 17],
      ['service18', 'ベランダ防水単品（5千円・但し1社紹介時は定価）', '5000', '但し1社紹介時は定価', 'repair', 18]
    ];
    
    sheet.getRange(1, 1, serviceData.length, serviceData[0].length).setValues(serviceData);
    
    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold').setBackground('#E8F0FE');
  }
  
  console.log('✅ 施工箇所マスタシート初期化完了');
}

/**
 * 加盟店情報シート初期化
 */
function initializeFranchiseDataSheet(ss) {
  const sheetName = HEARING_CONFIG.sheetNames.franchiseData;
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  const headers = [
    '加盟店ID', 'タイムスタンプ', '会社名', '会社名カナ', '屋号', '屋号カナ',
    '代表者名', '担当者名', '担当者電話', '担当者メール', '会社住所', '郵便番号',
    '対応エリア', '最優先エリア', '会社電話', '設立年月', '法人番号', '支店名',
    'ホームページURL', '特徴', '実績', 'PR文', '対応物件種別', '施工箇所',
    '特殊対応', '対応築年数', '月間配信上限', '週間配信上限', '基本定価',
    'ヒアリング完了フラグ', 'セッションID'
  ];
  
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold').setBackground('#E8F0FE');
  }
  
  console.log('✅ 加盟店情報シート初期化完了');
}

/**
 * フランチャイズヒアリング開始
 */
function startFranchiseHearing(userId, replyToken) {
  try {
    console.log(`🆕 フランチャイズヒアリング開始: ${userId}`);
    
    // ヒアリングシステム初期化
    initializeFranchiseHearingBot();
    
    // 最初の質問を送信
    const welcomeMessage = {
      type: 'text',
      text: `🏢 フランチャイズ加盟店ヒアリングを開始します！\n\n26項目の質問にお答えいただき、加盟店情報を登録いたします。\n\nまず最初の質問です：\n\n【ステップ1/26】\n会社名を入力してください\n\n正式な会社名をご入力ください。`
    };
    
    // セッション開始
    const sessionId = `session_${userId}_${Date.now()}`;
    saveHearingSession(userId, {
      sessionId: sessionId,
      currentStep: 'step1',
      startTime: new Date().toISOString(),
      responses: {}
    });
    
    // LINE応答送信
    return sendLineReplyMessage(replyToken, [welcomeMessage]);
    
  } catch (error) {
    console.error('❌ フランチャイズヒアリング開始エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ヒアリングセッション保存
 */
function saveHearingSession(userId, sessionData) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const sessionKey = `hearing_${userId}`;
    properties.setProperty(sessionKey, JSON.stringify(sessionData));
    
    console.log(`💾 ヒアリングセッション保存: ${userId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ セッション保存エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ヒアリングセッション取得
 */
function getHearingSession(userId) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const sessionKey = `hearing_${userId}`;
    const sessionJson = properties.getProperty(sessionKey);
    
    return sessionJson ? JSON.parse(sessionJson) : null;
    
  } catch (error) {
    console.error('❌ セッション取得エラー:', error);
    return null;
  }
}

/**
 * LINE応答メッセージ送信
 */
function sendLineReplyMessage(replyToken, messages) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
    if (!accessToken) {
      return {
        success: false,
        error: 'LINEアクセストークンが設定されていません'
      };
    }
    
    const requestBody = {
      replyToken: replyToken,
      messages: messages
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
      responseCode: response.getResponseCode(),
      responseText: response.getContentText()
    };
    
  } catch (error) {
    console.error('❌ LINE応答送信エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * テスト用：ヒアリングBOT動作確認
 */
function testFranchiseHearingBot() {
  try {
    console.log('🧪 ヒアリングBOTテスト開始');
    
    // 初期化
    initializeFranchiseHearingBot();
    
    console.log('✅ ヒアリングBOTテスト完了');
    
  } catch (error) {
    console.error('❌ ヒアリングBOTテストエラー:', error);
  }
}