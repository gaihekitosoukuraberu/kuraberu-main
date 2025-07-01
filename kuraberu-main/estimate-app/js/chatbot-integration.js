/**
 * 📂 ファイル名: chatbot-integration.js
 * 🎯 内容: スプレッドシート参照型AI風チャットシステム
 * 
 * 【責務】
 * - 郵便番号入力後のランキングカード（モザイク状態）表示
 * - Googleスプレッドシートから質問データ取得
 * - タイプライター演出で段階的質問表示
 * - 第1ヒアリング段階終了時にモザイク解除
 * - GPT API不使用（将来的に追加可能性あり）
 */

// ===========================================
// グローバル変数
// ===========================================

let questionsData = [];           // スプレッドシートから取得した質問データ
let currentQuestionIndex = 0;     // 現在の質問インデックス
let userAnswers = [];            // ユーザーの回答履歴
let questionsCompleted = 0;      // 完了した質問数
let questionsDataCached = false; // キャッシュフラグ
let isTyping = false;            // タイプライター演出中フラグ
let chatbotVisible = false;      // チャットボット表示状態
let questionAnswered = false;    // 現在の質問に回答済みかのフラグ

// 設定値（動的に計算される）
let FIRST_STAGE_COMPLETION_THRESHOLD = 3; // 第1段階完了の閾値（物件規模ヒアリング）
let SECOND_STAGE_COMPLETION_THRESHOLD = 6; // 第2段階完了の閾値（詳細条件ヒアリング）
let THIRD_STAGE_COMPLETION_THRESHOLD = 9; // 第3段階完了の閾値（クロージングセクション）
let FOURTH_STAGE_COMPLETION_THRESHOLD = 10; // 第4段階完了の閾値（電話番号入力）

// GASエンドポイントURL（統合_質問豆知識管理スプレッドシート）
const SPREADSHEET_GAS_URL = 'https://script.google.com/macros/s/AKfycbxfZORORWCrlRNP4NQjWoyHquwvCh4fZt5nSC8h3apROWNSFzC39GQS7Nbk-A4hAkHtQQ/exec';

// ===========================================
// スプレッドシートからの質問データ取得
// ===========================================

/**
 * スプレッドシートから質問データを取得
 */
async function loadQuestionsFromSpreadsheet() {
  try {
    // キャッシュされたデータがある場合はそれを使用
    if (questionsDataCached && questionsData.length > 0) {
      console.log('⚡ キャッシュされた質問データを使用');
      return true;
    }
    
    console.log('📋 スプレッドシートから質問データを取得中...');
    
    try {
      const requestData = {
        action: 'getQuestionsByStage',
        stage: 'all', // 全段階の質問を取得
        requiredOnly: false
      };
      
      console.log('📤 スプレッドシートリクエスト:', requestData);
      console.log('📤 GAS URL:', SPREADSHEET_GAS_URL);
      
      // JSONP方式でGASからデータを取得
      const result = await new Promise((resolve, reject) => {
        const callbackName = 'gasCallback_' + Date.now();
        const params = new URLSearchParams({
          action: 'getQuestionsByStage',
          stage: 'all',
          requiredOnly: 'false',
          callback: callbackName
        });
        
        console.log('📤 JSONPコールバック名:', callbackName);
        
        // グローバルコールバック関数を作成
        window[callbackName] = function(data) {
          console.log('📥 GASからのレスポンス:', data);
          // クリーンアップ
          setTimeout(() => {
            try {
              if (script && script.parentNode) {
                document.head.removeChild(script);
              }
              delete window[callbackName];
            } catch (e) {
              // 無視
            }
          }, 100);
          resolve(data);
        };
        
        // スクリプトタグでJSONPリクエスト
        const script = document.createElement('script');
        script.src = `${SPREADSHEET_GAS_URL}?${params}`;
        script.onerror = function() {
          // クリーンアップ
          try {
            document.head.removeChild(script);
            delete window[callbackName];
          } catch (e) {
            // 無視
          }
          reject(new Error('JSONPリクエスト失敗'));
        };
        
        document.head.appendChild(script);
        
        // タイムアウト
        setTimeout(() => {
          if (window[callbackName]) {
            try {
              document.head.removeChild(script);
              delete window[callbackName];
            } catch (e) {
              // 無視
            }
            reject(new Error('タイムアウト'));
          }
        }, 10000);
      });
      
      console.log('📥 質問データAPIレスポンス:', result);
      console.log('🔍 GAS応答の詳細分析:', {
        success: result.success,
        hasQuestions: !!result.questions,
        questionsLength: result.questions ? result.questions.length : 0,
        allKeys: Object.keys(result),
        timestamp: result.timestamp,
        message: result.message
      });
      
      if (result.success && result.questions && result.questions.length > 0) {
        console.log('📊 スプレッドシート生データ:', result.questions);
        console.log('📊 生データ最初の3件:', result.questions.slice(0, 3));
        
        // スプレッドシートデータをそのままの順序で使用（行番号順）
        questionsData = result.questions.map(q => {
          // ヒアリング段階列のデータを正しくマッピング
          const hearingStage = q['ヒアリング段階'] || q.hearingStage || q.stage;
          console.log(`質問データマッピング: ${q.questionText || q.question} -> 段階: ${hearingStage}`);
          
          // 選択肢データの詳細デバッグ
          console.log('🔍 元データの選択肢情報:', {
            choices: q.choices,
            choice1: q.choice1,
            choice2: q.choice2,
            choice3: q.choice3,
            choice4: q.choice4,
            choice5: q.choice5,
            '選択肢1': q['選択肢1'],
            '選択肢2': q['選択肢2'],
            '選択肢3': q['選択肢3'],
            '選択肢4': q['選択肢4'],
            '選択肢5': q['選択肢5']
          });
          
          // より柔軟な選択肢抽出
          let choices = [];
          
          // 1. choicesが配列で存在する場合
          if (q.choices && Array.isArray(q.choices) && q.choices.length > 0) {
            choices = q.choices.filter(c => c && c.toString().trim());
          }
          // 2. 英語カラム名から抽出
          else {
            const choiceFields = [
              q.choice1 || q['選択肢1'],
              q.choice2 || q['選択肢2'], 
              q.choice3 || q['選択肢3'], 
              q.choice4 || q['選択肢4'],
              q.choice5 || q['選択肢5']
            ];
            choices = choiceFields.filter(c => c && c.toString().trim());
          }
          
          console.log('🔍 抽出された選択肢:', choices);
          
          // 分岐先データのデバッグ
          // 🎯 Q001の分岐データのみデバッグ
          if (q.id === 'Q001') {
            console.log('🎯 Q001分岐デバッグ:', {
              branches: q.branches,
              branch1: q.branch1,
              branch2: q.branch2
            });
          }
          
          // 分岐先データの抽出
          let branches = [];
          
          // 1. branchesが配列で存在する場合
          if (q.branches && Array.isArray(q.branches) && q.branches.length > 0) {
            branches = q.branches.filter(b => b && b.toString().trim());
          }
          // 2. スプレッドシートの実際のカラム構造に基づく分岐先抽出
          else {
            // スプレッドシートの画像から確認できるカラム構造に対応
            const allKeys = Object.keys(q);
            
            // デバッグ用：全フィールドを表示（Q001のみ）
            if (q.id === 'Q001' || q.questionId === 'Q001') {
              console.log('🔍 Q001の全フィールド:', allKeys);
              console.log('🔍 Q001の生データ:', q);
            }
            
            // 様々なパターンの分岐先フィールドを試行
            const branchFields = [];
            
            // パターン1: 分岐先1, 分岐先2, 分岐先3, 分岐先4
            for (let i = 1; i <= 4; i++) {
              const branch = q[`分岐先${i}`] || q[`分岐先${i}`] || q[`branch${i}`] || q[`nextQuestion${i}`];
              if (branch && branch.toString().trim()) {
                branchFields.push(branch.toString().trim());
              }
            }
            
            // パターン2: 英語カラム名
            ['branch1', 'branch2', 'branch3', 'branch4'].forEach(field => {
              if (q[field] && q[field].toString().trim() && !branchFields.includes(q[field].toString().trim())) {
                branchFields.push(q[field].toString().trim());
              }
            });
            
            // パターン3: 選択肢に埋め込まれた分岐先（例：「はい → Q002」）
            ['choice1', 'choice2', 'choice3', 'choice4'].forEach(choiceField => {
              const choice = q[choiceField];
              if (choice && choice.toString().includes('→')) {
                const branchMatch = choice.toString().match(/→\s*([QM]\d+)/);
                if (branchMatch && !branchFields.includes(branchMatch[1])) {
                  branchFields.push(branchMatch[1]);
                }
              }
            });
            
            branches = branchFields;
          }
          
          console.log(`🔗 ${q.id || q['質問ID']}: 抽出された分岐先:`, branches);
          console.log(`🔍 ${q.id || q['質問ID']}: 分岐先関連フィールド:`, {
            '分岐先1': q['分岐先1'],
            '分岐先2': q['分岐先2'], 
            '分岐先3': q['分岐先3'],
            '分岐先4': q['分岐先4'],
            'branch1': q['branch1'],
            'branch2': q['branch2'],
            'branches': q['branches'],
            'allKeys': Object.keys(q).filter(k => k.includes('分岐') || k.includes('branch'))
          });
          
          return {
            ...q,
            id: q.id || q.questionId || q['質問ID'], // IDフィールドを正しくマッピング
            stage: hearingStage, // ヒアリング段階列の値を使用
            type: q.type || q['質問タイプ'], // タイプフィールドを正しくマッピング
            question: q.questionText || q.question || q['質問文'],
            questionText: q.questionText || q.question || q['質問文'], // 互換性のため両方設定
            choices: choices,
            branches: branches // 分岐先データを追加
          };
        }).sort((a, b) => {
          // 行番号順でソート（スプレッドシートの順序を保持）
          if (a.rowNumber !== undefined && b.rowNumber !== undefined) {
            return parseInt(a.rowNumber) - parseInt(b.rowNumber);
          }
          return 0;
        });
        
        // 動的段階閾値の計算
        calculateDynamicStageThresholds();
        
        questionsDataCached = true;
        console.log(`✅ スプレッドシート質問データ取得・ソート完了: ${questionsData.length}件`);
        console.log('📋 スプレッドシート取得順序確認:');
        questionsData.forEach((q, i) => {
          console.log(`  ${i+1}. [行${q.rowNumber || '?'}] ${q.stage || '段階不明'} - ${q.orderIndex || q.id || '?'}: ${q.question ? q.question.substring(0, 40) : 'No question'}...`);
        });
        
        // 質問順序の検証
        validateQuestionSequence();
        
        return true;
      } else {
        console.error('❌ スプレッドシートデータ検証失敗:', {
          success: result.success,
          questionsExists: !!result.questions,
          questionsLength: result.questions ? result.questions.length : 0,
          result: result
        });
        console.error('❌ スプレッドシートからのデータ取得に失敗。緊急フォールバック使用。');
        loadEmergencyFallback();
        return true;
      }
      
    } catch (error) {
      console.error('❌ スプレッドシート取得失敗:', error.message);
      console.error('❌ ネットワークエラーまたはGASエラー。緊急フォールバック使用。');
      try {
        loadEmergencyFallback();
        return true;
      } catch (fallbackError) {
        console.error('❌ 緊急フォールバックでもエラー:', fallbackError);
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ スプレッドシート質問取得エラー:', error);
    console.error('❌ 全体的なエラー。緊急フォールバック使用。');
    try {
      loadEmergencyFallback();
      return true;
    } catch (fallbackError) {
      console.error('❌ 最終フォールバックでもエラー:', fallbackError);
      alert('システムの初期化に失敗しました。ページを再読み込みしてください。');
      return false;
    }
  }
}

/**
 * 緊急フォールバック（スプレッドシートの正確なデータに基づく）
 */
function loadEmergencyFallback() {
  console.log('🚨 緊急フォールバック：スプレッドシート構造に合わせた正確なデータ使用');
  
  questionsDataCached = true;
  currentQuestionIndex = 0;
  userAnswers = [];
  questionsCompleted = 0;
  isTyping = false;
  questionAnswered = false;
  
  // GitHubから取得した最新の質問フロー構造に基づくフォールバックデータ
  questionsData = [
    {
      rowNumber: 2,
      questionId: 'W001',
      'ヒアリング段階': '第1段階',
      type: 'message',
      questionText: '外壁塗装の専門アドバイザーです！お住まいの状況をお聞かせいただき、最適な業者と価格をご提案させていただきます。',
      stage: '第1段階'
    },
    {
      rowNumber: 3,
      questionId: 'Q001',
      'ヒアリング段階': '第1段階',
      type: '必須',
      questionText: 'お住まいの戸建て2階建てのご自宅ですか？',
      choice1: 'はい',
      choice2: 'いいえ',
      '選択肢1': 'はい',
      '選択肢2': 'いいえ',
      '分岐先1': 'Q003',
      '分岐先2': 'Q102',
      stage: '第1段階'
    },
    {
      rowNumber: 4,
      questionId: 'Q102',
      'ヒアリング段階': '第1段階',
      type: '分岐',
      questionText: 'どのタイプの建物ですか？',
      choice1: '2階建て以外の自宅',
      choice2: 'アパート・マンション',
      choice3: '実家・別荘・所有物件',
      choice4: '店舗・事務所・倉庫',
      '選択肢1': '2階建て以外の自宅',
      '選択肢2': 'アパート・マンション',
      '選択肢3': '実家・別荘・所有物件',
      '選択肢4': '店舗・事務所・倉庫',
      stage: '第1段階'
    },
    {
      rowNumber: 5,
      questionId: 'Q002',
      'ヒアリング段階': '第1段階',
      type: '必須',
      questionText: '建物は何階建てですか？',
      choice1: '1階建て',
      choice2: '2階建て',
      choice3: '3階建て',
      choice4: '4階建て以上',
      '選択肢1': '1階建て',
      '選択肢2': '2階建て',
      '選択肢3': '3階建て',
      '選択肢4': '4階建て以上',
      stage: '第1段階'
    }
  ];
  
  // フロントエンドが期待する形式にマッピング
  questionsData = questionsData.map(q => ({
    ...q,
    question: q.questionText,
    choices: [q.choice1, q.choice2, q.choice3, q.choice4].filter(c => c && c.trim())
  }));
  
  calculateDynamicStageThresholds();
  
  console.log('🚨 緊急フォールバック準備完了:', questionsData.length, '件');
  console.log('📋 最初の質問:', questionsData[0].questionText);
}

/**
 * 動的段階閾値計算（スプレッドシートのヒアリング段階列に基づく）
 */
function calculateDynamicStageThresholds() {
  const stageCounts = {};
  const stageEndPositions = {};
  
  // スプレッドシート順序で段階の終了位置を特定
  questionsData.forEach((q, index) => {
    const stage = q.stage || '未分類';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    stageEndPositions[stage] = index + 1; // 1ベースのインデックス
  });
  
  // ヒアリング段階の完了閾値を設定（スプレッドシートの実際の段階に基づく）
  FIRST_STAGE_COMPLETION_THRESHOLD = stageEndPositions['1'] || stageEndPositions['第1段階'] || 3;
  SECOND_STAGE_COMPLETION_THRESHOLD = stageEndPositions['2'] || stageEndPositions['第2段階'] || 6;
  THIRD_STAGE_COMPLETION_THRESHOLD = stageEndPositions['3'] || stageEndPositions['第3段階'] || 9;
  FOURTH_STAGE_COMPLETION_THRESHOLD = stageEndPositions['4'] || stageEndPositions['第4段階'] || questionsData.length;
  
  console.log('📊 スプレッドシート順序ベース段階閾値:', {
    '第1段階完了': FIRST_STAGE_COMPLETION_THRESHOLD,
    '第2段階完了': SECOND_STAGE_COMPLETION_THRESHOLD,
    '第3段階完了': THIRD_STAGE_COMPLETION_THRESHOLD,
    '第4段階完了': FOURTH_STAGE_COMPLETION_THRESHOLD,
    '段階別質問数': stageCounts,
    '段階終了位置': stageEndPositions
  });
}

/**
 * 質問順序の検証（スプレッドシート順序重視）
 */
function validateQuestionSequence() {
  console.log('🔍 スプレッドシート質問順序検証開始');
  
  // 行番号順に並んでいるかチェック
  let rowNumberIssues = [];
  for (let i = 1; i < questionsData.length; i++) {
    const prev = questionsData[i-1];
    const curr = questionsData[i];
    
    if (prev.rowNumber && curr.rowNumber) {
      if (parseInt(prev.rowNumber) >= parseInt(curr.rowNumber)) {
        rowNumberIssues.push(`質問${i+1}: 行${prev.rowNumber} → 行${curr.rowNumber} (順序逆転)`);
      }
    }
  }
  
  if (rowNumberIssues.length > 0) {
    console.warn('⚠️ スプレッドシート行番号順序に問題があります:', rowNumberIssues);
  } else {
    console.log('✅ スプレッドシート行番号順序 - 問題なし');
  }
  
  // 各段階の質問数も表示
  const stageCounts = {};
  questionsData.forEach(q => {
    const stage = q.stage || '段階不明';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  });
  console.log('📊 段階別質問数:', stageCounts);
  
  // 最初の3問の内容を詳しく表示
  console.log('🔍 最初の3問の詳細:');
  questionsData.slice(0, 3).forEach((q, i) => {
    console.log(`  ${i+1}. [行${q.rowNumber}] "${q.question}" (段階: ${q.stage})`);
  });
}

// ===========================================
// 分岐ロジック
// ===========================================

/**
 * 分岐先の質問IDを取得（スプレッドシート分岐データ優先版）
 * @param {Object} question - 現在の質問
 * @param {string} choice - 選択された回答
 * @param {number} index - 選択肢のインデックス
 * @returns {Promise<string|null>} - 分岐先の質問ID
 */
async function getBranchDestination(question, choice, index) {
  if (!question) return null;
  
  const questionId = question.id || question.questionId;
  console.log('🔀 分岐判定開始:', {
    questionId: questionId,
    choice: choice,
    index: index,
    branches: question.branches,
    choicesLength: question.choices?.length
  });
  
  // 1. スプレッドシートの分岐先データを優先してチェック（branches配列）
  if (question.branches && Array.isArray(question.branches) && question.branches.length > index) {
    const branchId = question.branches[index];
    if (branchId && branchId.toString().trim() !== '') {
      console.log('✅ スプレッドシート branches配列で分岐:', branchId);
      return branchId.toString().trim();
    }
  }
  
  // 2. スプレッドシートの分岐先カラムから直接チェック（分岐先1, 分岐先2...）
  const branchKey = `分岐先${index + 1}`;
  const branchId = question[branchKey];
  if (branchId && branchId.toString().trim() !== '') {
    console.log(`✅ スプレッドシート ${branchKey}カラムで分岐:`, branchId);
    return branchId.toString().trim();
  }
  
  // 3. フォールバック: 選択肢テキストに分岐情報が含まれているかチェック
  const selectedChoice = question.choices ? question.choices[index] : null;
  if (selectedChoice && (selectedChoice.includes('→') || selectedChoice.includes('へ'))) {
    console.log('🤖 選択肢テキスト分岐パターン検出、GPT解析開始:', selectedChoice);
    const branchId = await analyzeBranchWithGPT(questionId, selectedChoice, choice);
    return branchId;
  }
  
  console.log('⏭️ 分岐なし、通常フローで次の質問へ');
  return null; // 分岐なし、通常の次の質問へ
}

/**
 * GPT APIで分岐パターンを解析
 * @param {string} questionId - 現在の質問ID
 * @param {string} choiceText - 選択肢テキスト
 * @param {string} cleanChoice - クリーンな選択肢（表示用）
 * @returns {Promise<string|null>} - 分岐先の質問ID
 */
async function analyzeBranchWithGPT(questionId, choiceText, cleanChoice) {
  try {
    const prompt = `以下の選択肢テキストから分岐先の質問IDを抽出してください。

選択肢テキスト: "${choiceText}"
現在の質問ID: "${questionId}"

【抽出ルール】
1. "→ Q3へ" → "Q003"
2. "→ Q1-2へ" → "Q102" 
3. "→ Q3-2へ" → "Q302"
4. "→ Q3-5へ" → "Q305"
5. 数字は3桁にゼロパディング（Q3 → Q003）
6. Q1-2のような形式はQ + 最初の数字 + ゼロパディングした2番目の数字（Q1-2 → Q102）

分岐先が見つからない場合は "null" を返してください。
回答は質問IDのみ（例: "Q003" または "null"）`;

    console.log('🤖 GPT分岐解析リクエスト:', prompt);
    
    // OpenAI API呼び出し（モック実装 - 実際のAPIキーが必要）
    const branchId = await callOpenAIForBranchAnalysis(prompt);
    
    console.log('🤖 GPT分岐解析結果:', branchId);
    return branchId;
    
  } catch (error) {
    console.error('❌ GPT分岐解析エラー:', error);
    // フォールバック: 正規表現で基本的な分岐パターンを解析
    return extractBranchWithRegex(choiceText);
  }
}

/**
 * OpenAI APIを呼び出し（実装版）
 * @param {string} prompt - 解析プロンプト
 * @returns {Promise<string|null>} - 分岐先の質問ID
 */
async function callOpenAIForBranchAnalysis(prompt) {
  try {
    console.log('🤖 OpenAI API呼び出し開始');
    
    // GASからOpenAI APIキーを取得してAPI呼び出し
    const response = await callGASForOpenAI(prompt);
    
    if (response && response.success && response.result) {
      const branchId = response.result.trim();
      console.log('✅ OpenAI API解析成功:', branchId);
      
      // "null"文字列の場合はnullを返す
      if (branchId === 'null' || branchId === 'NULL') {
        return null;
      }
      
      return branchId;
    } else {
      console.warn('⚠️ OpenAI API応答が無効、正規表現フォールバック使用');
      throw new Error('OpenAI API応答が無効');
    }
    
  } catch (error) {
    console.error('❌ OpenAI API呼び出しエラー:', error.message);
    console.log('🔄 正規表現フォールバックを使用');
    
    // フォールバック: 正規表現で解析
    const choiceText = prompt.match(/選択肢テキスト: "(.+?)"/);
    if (choiceText && choiceText[1]) {
      return extractBranchWithRegex(choiceText[1]);
    }
    return null;
  }
}

/**
 * GAS経由でOpenAI APIを呼び出し
 * @param {string} prompt - 解析プロンプト
 * @returns {Promise<Object>} - GAS応答
 */
async function callGASForOpenAI(prompt) {
  return new Promise((resolve, reject) => {
    const callbackName = 'openaiCallback_' + Date.now();
    const params = new URLSearchParams({
      action: 'callOpenAI',
      prompt: prompt,
      maxTokens: '50',
      temperature: '0.1',
      callback: callbackName
    });
    
    console.log('📤 GAS OpenAI呼び出し:', SPREADSHEET_GAS_URL);
    
    // グローバルコールバック関数を作成
    window[callbackName] = function(data) {
      console.log('📥 GAS OpenAI応答:', data);
      // クリーンアップ
      setTimeout(() => {
        try {
          if (script && script.parentNode) {
            document.head.removeChild(script);
          }
          delete window[callbackName];
        } catch (e) {
          // 無視
        }
      }, 100);
      resolve(data);
    };
    
    // スクリプトタグでJSONPリクエスト
    const script = document.createElement('script');
    script.src = `${SPREADSHEET_GAS_URL}?${params}`;
    script.onerror = function() {
      // クリーンアップ
      try {
        document.head.removeChild(script);
        delete window[callbackName];
      } catch (e) {
        // 無視
      }
      reject(new Error('GAS OpenAI APIリクエスト失敗'));
    };
    
    document.head.appendChild(script);
    
    // タイムアウト（10秒）
    setTimeout(() => {
      if (window[callbackName]) {
        try {
          document.head.removeChild(script);
          delete window[callbackName];
        } catch (e) {
          // 無視
        }
        reject(new Error('GAS OpenAI APIタイムアウト'));
      }
    }, 10000);
  });
}

/**
 * 正規表現で分岐パターンを抽出（フォールバック）
 * @param {string} choiceText - 選択肢テキスト
 * @returns {string|null} - 分岐先の質問ID
 */
function extractBranchWithRegex(choiceText) {
  if (!choiceText) return null;
  
  // パターン1: "→ Q3へ" → "Q003"
  const pattern1 = /→\s*Q(\d+)へ/;
  const match1 = choiceText.match(pattern1);
  if (match1) {
    const num = match1[1].padStart(3, '0');
    return `Q${num}`;
  }
  
  // パターン2: "→ Q1-2へ" → "Q102"
  const pattern2 = /→\s*Q(\d+)-(\d+)へ/;
  const match2 = choiceText.match(pattern2);
  if (match2) {
    const num1 = match2[1];
    const num2 = match2[2].padStart(2, '0');
    return `Q${num1}${num2}`;
  }
  
  // パターン3: "→ Q3-5へ" → "Q305"  
  const pattern3 = /→\s*Q(\d+)-(\d+)へ/;
  const match3 = choiceText.match(pattern3);
  if (match3) {
    const num1 = match3[1];
    const num2 = match3[2].padStart(2, '0');
    return `Q${num1}${num2}`;
  }
  
  console.log('⚠️ 分岐パターンが見つかりません:', choiceText);
  return null;
}

/**
 * 分岐ナビゲーションの処理
 * @param {string} choice - 選択された回答
 * @param {string} nextQuestionId - 分岐先の質問ID
 */
function handleBranchNavigation(choice, nextQuestionId) {
  // 回答を記録
  recordUserAnswer(choice);
  
  // 分岐先の質問を見つける（複数のIDフィールドをチェック）
  const nextQuestionIndex = questionsData.findIndex(q => 
    q.id === nextQuestionId || 
    q.questionId === nextQuestionId ||
    q['質問ID'] === nextQuestionId
  );
  
  if (nextQuestionIndex !== -1) {
    // 質問インデックスを更新
    currentQuestionIndex = nextQuestionIndex - 1; // displayCurrentQuestionでインクリメントされるため-1
    questionAnswered = false;
    
    console.log(`🔀 分岐ナビゲーション成功: ${nextQuestionId} (インデックス: ${nextQuestionIndex})`);
    
    // ボタンの状態をクリック済みに更新
    const choiceButtons = document.querySelectorAll('.choice-btn');
    const selectedIndex = questionsData[currentQuestionIndex + 1]?.choices?.indexOf(choice) || 0;
    updateButtonStates(selectedIndex);
    
    // 次の質問を表示
    setTimeout(() => {
      currentQuestionIndex = nextQuestionIndex; // 正しいインデックスに設定
      displayCurrentQuestion();
    }, 800);
  } else {
    console.error('❌ 分岐先の質問が見つかりません:', nextQuestionId);
    console.log('🔍 利用可能な質問ID一覧:', questionsData.map(q => q.id || q.questionId || q['質問ID']));
    // フォールバック: 通常の次の質問処理
    continueNormalFlow(choice, 0);
  }
}

// ===========================================
// タイプライター演出
// ===========================================

/**
 * タイプライター演出で文字を1文字ずつ表示
 * @param {string} text - 表示するテキスト
 * @param {string} targetElementId - 表示先要素のID
 * @param {number} speed - 表示速度（ミリ秒）
 */
function typeWriterEffect(text, targetElementId, speed = 30) {
  return new Promise((resolve) => {
    // テキストの検証
    if (!text || typeof text !== 'string') {
      console.error('❌ タイプライター演出: テキストが無効です:', text);
      resolve();
      return;
    }
    
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
      console.error(`❌ 要素が見つかりません: ${targetElementId}`);
      resolve();
      return;
    }
    
    isTyping = true;
    targetElement.textContent = '';
    let index = 0;
    
    const typeInterval = setInterval(() => {
      if (index < text.length) {
        targetElement.textContent += text.charAt(index);
        index++;
      } else {
        clearInterval(typeInterval);
        isTyping = false;
        resolve();
      }
    }, speed);
  });
}

// ===========================================
// 質問表示制御
// ===========================================

/**
 * 現在の質問を表示
 */
async function displayCurrentQuestion() {
  try {
    if (currentQuestionIndex >= questionsData.length) {
      completeAllHearing();
      return;
    }
    
    if (!questionsData || questionsData.length === 0) {
      console.error('❌ 質問データが存在しません');
      alert('質問データの読み込みに失敗しました。ページを再読み込みしてください。');
      return;
    }
  
  // 回答済みフラグをリセット
  questionAnswered = false;
  
  // ボタンを事前にリセット
  const choiceButtons = document.querySelectorAll('.choice-btn');
  choiceButtons.forEach((btn) => {
    btn.className = 'choice-btn bg-white p-4 rounded-lg text-sm transition-colors duration-200 border-2 border-gray-300 font-medium text-gray-700';
  });
  
  const question = questionsData[currentQuestionIndex];
  console.log(`📝 質問表示: ${currentQuestionIndex + 1}/${questionsData.length}`, question);
  
  // 質問データの検証と詳細ログ
  console.log('🔍 質問データ詳細:', {
    id: question.id,
    questionText: question.questionText || question.question,
    gptMessage: question.gptMessage,
    choices: question.choices || question.options,
    stage: question.stage,
    allProperties: Object.keys(question || {})
  });
  
  // スプレッドシートの列名に対応
  const questionText = question.questionText || question.question || question.text;
  const gptMessage = question.gptMessage || '';
  
  if (!question || !questionText) {
    console.error('❌ 質問データが不正です:', question);
    console.error('❌ 利用可能なプロパティ:', Object.keys(question || {}));
    return;
  }
  
  // GPTメッセージがある場合は先に表示
  if (gptMessage && gptMessage.trim()) {
    const gptTalkContent = document.getElementById('gptTalkContent');
    if (gptTalkContent) {
      await typeWriterEffect(gptMessage, 'gptTalkContent', 30);
      await new Promise(resolve => setTimeout(resolve, 500)); // 少し間を空ける
    }
  }
  
  // triggerSortEnable フラグをチェック（ソートボタン有効化）
  if (question.triggerSortEnable) {
    console.log('🎯 ソートボタン有効化フラグ検出:', question.triggerSortEnable);
    setTimeout(() => {
      if (typeof window.enableSortButtons === 'function') {
        console.log('🎯 ソートボタン有効化実行');
        window.enableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
        // ヒアリング段階も更新
        if (typeof window.completeHearingStage === 'function') {
          window.completeHearingStage(parseInt(question.triggerSortEnable));
        }
      }
    }, 500);
  }
  
  // triggerPhoneForm フラグをチェック（電話番号フォーム表示）
  if (question.triggerPhoneForm) {
    console.log('📞 電話番号フォーム表示フラグ検出');
    // 回答によって処理を分岐（質問10の許諾確認）
    // この処理は回答選択時に handleChoiceSelection で実行される
  }
  
  // 質問文をタイプライター演出で表示
  await typeWriterEffect(questionText, 'currentQuestion', 30);
  
  // タイプライター演出完了後、必ずisTypingをfalseに設定
  isTyping = false;
  console.log('📝 質問文表示完了 - isTyping = false');
  
  // 選択肢データの取得（スプレッドシートの列名に対応）
  let choices = [];
  
  console.log('🔍 質問オブジェクトの全プロパティ:', Object.keys(question));
  console.log('🔍 選択肢関連データ:', {
    choices: question.choices,
    options: question.options,
    choice1: question.choice1,
    choice2: question.choice2,
    choice3: question.choice3,
    choice4: question.choice4,
    choice5: question.choice5,
    '選択肢1': question['選択肢1'],
    '選択肢2': question['選択肢2'],
    '選択肢3': question['選択肢3'],
    '選択肢4': question['選択肢4'],
    '選択肢5': question['選択肢5']
  });
  
  // 優先順位1：配列形式の場合（GASから返される形式）
  if (question.choices && Array.isArray(question.choices) && question.choices.length > 0) {
    choices = question.choices.filter(c => c && c.toString().trim());
    console.log('✅ 選択肢をchoices配列から取得:', choices);
  }
  // 優先順位2：options配列の場合
  else if (question.options && Array.isArray(question.options) && question.options.length > 0) {
    choices = question.options.filter(c => c && c.toString().trim());
    console.log('✅ 選択肢をoptions配列から取得:', choices);
  }
  // 優先順位3：英語カラム名（choice1, choice2...）
  else {
    const individualChoices = [
      question.choice1,
      question.choice2,
      question.choice3,
      question.choice4,
      question.choice5
    ].filter(c => c && c.toString().trim());
    if (individualChoices.length > 0) {
      choices = individualChoices;
      console.log('✅ 選択肢をchoice1-5から取得:', choices);
    }
  }
  
  // 優先順位4：日本語カラム名（選択肢1、選択肢2...）
  if (choices.length === 0) {
    const japaneseChoices = [];
    for (let i = 1; i <= 10; i++) {
      const choiceKey = `選択肢${i}`;
      if (question[choiceKey] && question[choiceKey].toString().trim()) {
        japaneseChoices.push(question[choiceKey]);
      }
    }
    if (japaneseChoices.length > 0) {
      choices = japaneseChoices;
      console.log('✅ 選択肢を選択肢1-10から取得:', choices);
    }
  }
  
  console.log('🔘 最終的な選択肢データ:', choices);
  console.log('🔘 選択肢数:', choices.length);
  console.log('📋 質問タイプ:', question.type);
  
  // messageタイプの質問は選択肢なし（次へボタンのみ）
  if (question.type === 'message' || question.type === 'closing') {
    console.log('📢 メッセージタイプのため、選択肢なし');
    // 選択肢ボタンを非表示にして、次へボタンを表示
    hideChoiceButtonsShowNext();
  } else {
    // 選択肢がない場合のフォールバック
    if (choices.length === 0) {
      console.error('❌ 選択肢データが存在しません:', question);
      console.error('❌ 選択肢でねーぞ！！！w');
      choices = ['選択肢1', '選択肢2', '選択肢3', '選択肢4'];
    }
    
    updateChoiceButtons(choices);
  }
  
  } catch (error) {
    console.error('❌ 質問表示でエラーが発生しました:', error);
    alert('質問の表示中にエラーが発生しました。ページを再読み込みしてください。');
  }
}

/**
 * messageタイプの質問用：選択肢ボタンを非表示にして次へボタンを表示
 */
function hideChoiceButtonsShowNext() {
  const choiceButtons = document.querySelectorAll('.choice-btn');
  
  // 最初の3つのボタンを非表示
  choiceButtons.forEach((btn, index) => {
    if (index < 3) {
      btn.style.display = 'none';
    }
  });
  
  // 4番目のボタンを「次へ」ボタンとして使用
  if (choiceButtons[3]) {
    const nextButton = choiceButtons[3];
    nextButton.style.display = 'block';
    nextButton.textContent = '次へ';
    nextButton.className = 'choice-btn bg-blue-500 text-white p-4 rounded-lg text-sm transition-colors duration-200 border-2 border-blue-500 font-medium hover:bg-blue-600';
    
    // クリックハンドラーを設定
    const handler = () => {
      if (!questionAnswered) {
        handleAnswer(0, '次へ'); // インデックス0、値は「次へ」
      }
    };
    
    nextButton.onclick = handler;
    nextButton._chatbotHandler = handler;
  }
}

/**
 * 選択肢ボタンを更新
 * @param {Array} choices - 選択肢配列
 */
function updateChoiceButtons(choices) {
  const choiceButtons = document.querySelectorAll('.choice-btn');
  
  // 全てのボタンをデフォルト状態にリセット
  choiceButtons.forEach((btn, index) => {
    btn.style.display = 'block';
    btn.className = 'choice-btn bg-white p-4 rounded-lg text-sm transition-colors duration-200 border-2 border-gray-300 font-medium text-gray-700';
    btn.style.pointerEvents = 'auto';
    btn.style.cursor = 'pointer';
    btn.onclick = null;
    // 既存のイベントリスナーもクリア
    if (btn._chatbotHandler) {
      btn.removeEventListener('click', btn._chatbotHandler);
    }
  });
  
  // 選択肢データを設定
  choices.forEach((choice, index) => {
    if (choiceButtons[index]) {
      choiceButtons[index].textContent = choice;
      choiceButtons[index].style.display = 'block';
      
      // 既存のイベントリスナーをクリア
      choiceButtons[index].onclick = null;
      choiceButtons[index].removeEventListener('click', choiceButtons[index]._chatbotHandler);
      
      // 新しいイベントリスナーを設定
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔘 選択肢ボタンクリック:', choice, 'インデックス:', index);
        handleChoiceSelection(choice, index);
      };
      
      choiceButtons[index]._chatbotHandler = handler;
      choiceButtons[index].addEventListener('click', handler);
      choiceButtons[index].onclick = handler;
      
      console.log(`🔧 ボタン${index + 1}設定完了:`, choice);
    }
  });
  
  // 使用しないボタンは非表示
  for (let i = choices.length; i < choiceButtons.length; i++) {
    if (choiceButtons[i]) {
      choiceButtons[i].style.display = 'none';
    }
  }
  
  // console.log('🔘 選択肢ボタン更新完了');
}

/**
 * 選択肢が選択された時の処理
 * @param {string} choice - 選択された回答
 * @param {number} index - ボタンのインデックス
 */
function handleChoiceSelection(choice, index) {
  console.log('🔘 選択肢クリック検出:', choice, 'インデックス:', index);
  
  if (isTyping) {
    console.log('⚠️ タイプライター演出中のため選択を無視');
    return;
  }
  
  if (questionAnswered) {
    console.log('⚠️ この質問には既に回答済みのため選択を無視');
    return;
  }
  
  const currentQuestion = questionsData[currentQuestionIndex];
  
  // 分岐ロジックの処理（非同期）
  console.log('🔍 分岐チェック開始:', {
    questionId: currentQuestion.id || currentQuestion.questionId,
    choice: choice,
    index: index,
    branches: currentQuestion.branches,
    '分岐先1': currentQuestion['分岐先1'],
    '分岐先2': currentQuestion['分岐先2'],
    '分岐先3': currentQuestion['分岐先3'],
    '分岐先4': currentQuestion['分岐先4']
  });
  
  getBranchDestination(currentQuestion, choice, index).then(nextQuestionId => {
    if (nextQuestionId) {
      console.log('🔀 分岐処理:', currentQuestion.id || currentQuestion.questionId, choice, '→', nextQuestionId);
      handleBranchNavigation(choice, nextQuestionId);
      return;
    }
    
    // 分岐なしの場合は通常処理を続行
    console.log('⏭️ 分岐なし、通常フローで次の質問へ');
    continueNormalFlow(choice, index);
  }).catch(error => {
    console.error('❌ 分岐処理エラー:', error);
    // エラー時は通常処理を続行
    continueNormalFlow(choice, index);
  });
  
  return; // 非同期処理なので一旦return
}

/**
 * 通常の質問フロー処理
 * @param {string} choice - 選択された回答
 * @param {number} index - 選択肢のインデックス
 */
function continueNormalFlow(choice, index) {
  const currentQuestion = questionsData[currentQuestionIndex];
  
  // 第4段階の電話番号入力チェック
  if (currentQuestion && currentQuestion['ヒアリング段階'] === '第4段階') {
    const phoneInput = document.getElementById('phoneNumber');
    const phoneValue = phoneInput ? phoneInput.value.trim().replace(/[^0-9]/g, '') : '';
    
    if (!phoneValue || phoneValue.length < 10) {
      console.log('📞 第4段階: 電話番号入力が必要');
      
      // 電話番号入力フォームにスクロール
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // フォーカスを電話番号入力欄に移動
        setTimeout(() => {
          if (phoneInput) {
            phoneInput.focus();
            phoneInput.style.border = '3px solid #ef4444';
            phoneInput.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
            
            // 一時的なメッセージ表示
            const message = document.createElement('div');
            message.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            message.textContent = '電話番号を入力してから選択してください';
            document.body.appendChild(message);
            
            setTimeout(() => {
              if (message.parentNode) {
                document.body.removeChild(message);
              }
              phoneInput.style.border = '';
              phoneInput.style.boxShadow = '';
            }, 3000);
          }
        }, 500);
      }
      
      return; // 電話番号入力まで処理を停止
    }
  }
  
  console.log(`✅ 回答選択: ${choice}`);
  console.log('📊 現在の状態:', {
    currentQuestionIndex,
    questionsDataLength: questionsData.length,
    questionsCompleted,
    isTyping,
    questionAnswered
  });
  
  // 回答済みフラグをセット
  questionAnswered = true;
  
  // ボタンの見た目を更新
  updateButtonStates(index);
  
  // 回答を記録
  recordUserAnswer(choice);
  
  // 質問10（許諾確認）の場合の特別処理
  if (currentQuestionIndex < questionsData.length) {
    const currentQuestion = questionsData[currentQuestionIndex];
    if (currentQuestion && currentQuestion.triggerPhoneForm) {
      handleConsentResponse(choice);
      return;
    }
  }
  
  // 少し待ってから次の質問へ進む（演出完了を待つ）
  console.log('🔄 次の質問への進行を開始...');
  setTimeout(() => {
    console.log('⏰ タイムアウト実行 - moveToNextQuestion呼び出し');
    moveToNextQuestion();
  }, 100); // より高速化
}

/**
 * 許諾確認の回答処理
 * @param {string} choice - 選択された回答
 */
function handleConsentResponse(choice) {
  console.log(`📞 許諾確認回答: ${choice}`);
  
  if (choice === "はい、相談を希望します") {
    // 許諾あり：電話番号フォーム表示
    setTimeout(() => {
      completeFourthStage();
    }, 1000);
  } else {
    // 許諾なし：丁寧にお断り
    setTimeout(() => {
      const gptTalkContent = document.getElementById('gptTalkContent');
      if (gptTalkContent) {
        gptTalkContent.innerHTML = `
          <div class="completion-message">
            <p class="font-semibold text-blue-600 mb-2">承知いたしました</p>
            <p class="text-gray-700">引き続きランキングをご参考にしていただき、ご検討ください。</p>
            <p class="text-sm text-gray-500 mt-2">いつでもお気軽にお声がけください。</p>
          </div>
        `;
      }
      
      // 選択肢ボタンを非表示
      const choiceButtons = document.querySelectorAll('.choice-btn');
      choiceButtons.forEach(btn => {
        btn.style.display = 'none';
      });
    }, 1000);
  }
}

/**
 * ボタンの状態を更新（選択状態を表示）
 * @param {number} selectedIndex - 選択されたボタンのインデックス
 */
function updateButtonStates(selectedIndex) {
  const choiceButtons = document.querySelectorAll('.choice-btn');
  
  // 選択されたボタンのみ緑色に変更、他は触らない
  choiceButtons.forEach((btn, index) => {
    if (index === selectedIndex) {
      // 選択されたボタンのみ緑色にしてselectedクラス追加
      btn.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
      btn.classList.add('bg-green-500', 'text-white', 'border-green-500', 'selected');
    }
    // 他のボタンは何も変更しない（現状維持）
  });
}

/**
 * ユーザーの回答を記録
 * @param {string} choice - 選択された回答
 */
function recordUserAnswer(choice) {
  // 質問インデックスの範囲チェック
  if (currentQuestionIndex >= questionsData.length) {
    console.error('❌ 質問インデックスが範囲外です:', currentQuestionIndex, 'データ長:', questionsData.length);
    return;
  }
  
  const currentQuestion = questionsData[currentQuestionIndex];
  
  if (!currentQuestion) {
    console.error('❌ 現在の質問データが取得できません:', currentQuestionIndex);
    return;
  }
  
  const answer = {
    questionId: `q${currentQuestionIndex + 1}`,
    question: currentQuestion.question || currentQuestion.text,
    answer: choice,
    timestamp: new Date().toISOString(),
    stage: currentQuestion.stage || `第${Math.ceil((currentQuestionIndex + 1) / 3)}段階`
  };
  
  userAnswers.push(answer);
  questionsCompleted++;
  
  console.log(`📊 回答記録: ${questionsCompleted}/${questionsData.length}`, answer);
}

/**
 * 次の質問に進む（改善されたバウンドチェック付き）
 */
function moveToNextQuestion() {
  console.log('🚀 moveToNextQuestion開始');
  console.log('📊 現在の状況:', {
    currentQuestionIndex,
    questionsDataLength: questionsData.length,
    questionsCompleted
  });
  
  // 今完了した質問の段階をチェック（段階3なら電話番号フォーム表示）
  const justCompletedQuestion = questionsData[currentQuestionIndex];
  console.log('🔍 今完了した質問の段階チェック:', justCompletedQuestion?.stage);
  console.log('🔍 今完了した質問の詳細:', justCompletedQuestion);
  
  // ヒアリング段階の変化チェック（段階が変わる時のみエフェクト発動）
  const nextQuestion = questionsData[currentQuestionIndex + 1];
  
  // 第1段階 → 第2段階の変化時
  if (justCompletedQuestion && justCompletedQuestion['ヒアリング段階'] === '第1段階' &&
      nextQuestion && nextQuestion['ヒアリング段階'] === '第2段階') {
    console.log('🏠 ヒアリング段階変化: 第1段階 → 第2段階 - モザイク解除');
    completeFirstStage();
    if (typeof window.completeHearingStage === 'function') {
      window.completeHearingStage(1);
    }
  }
  
  // 第2段階 → 第3段階の変化時
  if (justCompletedQuestion && justCompletedQuestion['ヒアリング段階'] === '第2段階' &&
      nextQuestion && nextQuestion['ヒアリング段階'] === '第3段階') {
    console.log('🎯 ヒアリング段階変化: 第2段階 → 第3段階');
    completeSecondStage();
  }
  
  // 第3段階 → 第4段階の変化時（電話番号フォーム表示）
  if (justCompletedQuestion && justCompletedQuestion['ヒアリング段階'] === '第3段階' &&
      nextQuestion && nextQuestion['ヒアリング段階'] === '第4段階') {
    console.log('📞 ヒアリング段階変化: 第3段階 → 第4段階 - 電話番号フォーム表示');
    completeThirdStage();
    showPhoneNumberForm();
  }
  
  // 全ての質問が完了したかチェック（インデックス増加前）
  if (currentQuestionIndex + 1 >= questionsData.length) {
    console.log('🎉 全質問完了');
    completeFourthStage();
    return;
  }
  
  currentQuestionIndex++;
  questionsCompleted++;
  
  // 重要: 次の質問のために回答済みフラグをリセット
  questionAnswered = false;
  
  console.log(`🔄 質問進行: ${currentQuestionIndex + 1}/${questionsData.length}, 完了数: ${questionsCompleted}`);
  
  // 通常の次の質問を表示
  if (currentQuestionIndex < questionsData.length) {
    console.log(`📝 次の質問表示: インデックス${currentQuestionIndex + 1}/${questionsData.length}`);
    displayCurrentQuestion();
  } else {
    console.log('✅ 全質問完了！電話番号入力フォーム表示');
    completeFourthStage();
  }
}

// ===========================================
// ランキング制御
// ===========================================

/**
 * 第1段階完了処理（物件規模ヒアリング）
 */
function completeFirstStage() {
  console.log('🏠 第1段階完了: 物件規模ヒアリング');
  
  // 物件規模に応じて相場金額を更新
  updatePriceByPropertySize();
}

/**
 * 第2段階開始処理（詳細条件ヒアリング）
 */
function startSecondStage() {
  console.log('🔍 第2段階開始: 詳細条件ヒアリング');
  
  // ranking.jsの段階管理
  if (typeof window.completeHearingStage === 'function') {
    window.completeHearingStage(1); // 第1段階完了を通知
  }
  
  // モザイクオーバーレイメッセージを消去
  setTimeout(() => {
    const overlayMessage = document.getElementById('rankingOverlayMessage');
    if (overlayMessage) {
      overlayMessage.remove();
      console.log('🗑️ モザイクオーバーレイメッセージを削除');
    }
  }, 500);
  
  // エフェクト付きでモザイクを解除
  setTimeout(() => {
    unmaskRankingCards(); // 派手なエフェクト付き
  }, 1000);
}

/**
 * 第2段階完了処理
 */
function completeSecondStage() {
  console.log('🔍 第2段階完了: 詳細条件ヒアリング完了');
}

/**
 * 第3段階開始処理（クロージングセクション）
 */
function startThirdStage() {
  console.log('🎯 第3段階開始: クロージングセクション');
}

/**
 * 第3段階完了処理
 */
function completeThirdStage() {
  console.log('🎯 第3段階完了: クロージング完了');
  
  // ranking.jsの段階管理
  if (typeof window.completeHearingStage === 'function') {
    window.completeHearingStage(3); // 第3段階完了
  }
}

/**
 * 第4段階開始処理（許諾確認）
 */
function startFourthStage() {
  console.log('📞 第4段階開始: 許諾確認');
}

/**
 * 第4段階完了処理（電話番号入力フォーム表示）
 */
function completeFourthStage() {
  console.log('📞 第4段階完了: 電話番号入力フォーム表示');
  
  // 質問終了メッセージ
  const gptTalkContent = document.getElementById('gptTalkContent');
  if (gptTalkContent) {
    gptTalkContent.innerHTML = `
      <div class="completion-message">
        <p class="font-semibold text-green-600 mb-2">✅ ヒアリング完了！</p>
        <p class="text-gray-700">最適な業者をご紹介いたします。</p>
      </div>
    `;
  }
  
  // 選択肢ボタンを非表示
  const choiceButtons = document.querySelectorAll('.choice-btn');
  choiceButtons.forEach(btn => {
    btn.style.display = 'none';
  });
  
  // 電話番号入力フォームを表示
  showPhoneNumberForm();
}

/**
 * 物件規模に応じた相場金額更新
 */
function updatePriceByPropertySize() {
  // userAnswersから物件情報を取得して相場を計算
  let basePrice = 120; // 基準価格（万円）
  let maxPrice = 200;
  
  // 階数による調整（1問目）
  const floors = userAnswers.find(a => a.questionId === 'q1');
  if (floors) {
    switch (floors.answer) {
      case '平屋': basePrice *= 0.8; maxPrice *= 0.8; break;
      case '3階建て': basePrice *= 1.3; maxPrice *= 1.3; break;
      case '4階建て以上': basePrice *= 1.5; maxPrice *= 1.5; break;
    }
  }
  
  // 延べ床面積による調整（2問目）
  const area = userAnswers.find(a => a.questionId === 'q2');
  if (area) {
    switch (area.answer) {
      case '80㎡未満': basePrice *= 0.7; maxPrice *= 0.7; break;
      case '120〜160㎡': basePrice *= 1.2; maxPrice *= 1.2; break;
      case '160㎡以上': basePrice *= 1.4; maxPrice *= 1.4; break;
    }
  }
  
  // 外壁材質による調整（3問目）
  const material = userAnswers.find(a => a.questionId === 'q3');
  if (material) {
    switch (material.answer) {
      case 'ALC': basePrice *= 1.2; maxPrice *= 1.2; break;
      case 'その他': basePrice *= 1.1; maxPrice *= 1.1; break;
    }
  }
  
  // 相場表示を更新
  const priceRange = document.getElementById('priceRange');
  if (priceRange) {
    priceRange.textContent = `${Math.round(basePrice)}万円〜${Math.round(maxPrice)}万円`;
  }
  
  console.log(`💰 相場更新: ${Math.round(basePrice)}万円〜${Math.round(maxPrice)}万円`);
}

/**
 * 電話番号入力フォーム表示
 */
function showPhoneNumberForm() {
  console.log('📞 電話番号入力フォーム表示');
  
  const phoneSection = document.getElementById('phoneSection');
  if (phoneSection) {
    phoneSection.style.display = 'block';
    
    // フォームまでスクロール
    setTimeout(() => {
      phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }
}


/**
 * 全ヒアリング段階完了処理
 */
function completeAllHearing() {
  console.log('🎉 全ヒアリング段階完了！');
  
  // 最終段階完了を通知
  if (typeof window.completeHearingStage === 'function') {
    window.completeHearingStage(3); // 最終段階完了
  }
  
  // 完了メッセージを表示
  const gptTalkContent = document.getElementById('gptTalkContent');
  if (gptTalkContent) {
    gptTalkContent.innerHTML = `
      <div class="completion-message">
        <p class="font-semibold text-green-600 mb-2">✅ ヒアリング完了！</p>
        <p class="text-gray-700">お客様に最適な業者ランキングをご確認いただけます。</p>
        <p class="text-sm text-blue-600 mt-2">すべての並び替えオプションがご利用いただけます。</p>
      </div>
    `;
  }
  
  // 選択肢ボタンを非表示
  const choiceButtons = document.querySelectorAll('.choice-btn');
  choiceButtons.forEach(btn => {
    btn.style.display = 'none';
  });
  
  // チャットボットのプログレスバーを100%に
  const progressBar = document.querySelector('#chatbotContainer .bg-blue-600');
  if (progressBar) {
    progressBar.style.width = '100%';
  }
}

/**
 * ランキングカードのモザイクを解除
 */
function unmaskRankingCards() {
  console.log('🎭 ランキングカードのモザイク解除開始');
  
  // モザイク効果のある要素を検索して解除
  const mosaicElements = document.querySelectorAll('.mosaic-effect, .blur-effect, .filter-blur');
  
  mosaicElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.remove('mosaic-effect', 'blur-effect', 'filter-blur');
      element.style.filter = 'none';
      element.style.opacity = '1';
      
      // アニメーション効果を追加
      element.style.transition = 'all 0.5s ease-in-out';
      element.style.transform = 'scale(1.02)';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
      
    }, index * 200); // 順次解除
  });
  
  // ranking.jsのヒアリング段階完了関数を呼び出し
  if (typeof window.completeHearingStage === 'function') {
    window.completeHearingStage(1); // 第1段階完了
  }
  
  // ソートボタンを有効化
  if (typeof window.enableSortButtons === 'function') {
    window.enableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
  }
  
  console.log('✅ ランキングカードのモザイク解除完了');
}

// ===========================================
// チャットボット制御
// ===========================================

/**
 * チャットボットを起動
 */
async function launchSpreadsheetChatbot() {
  console.log('🤖 スプレッドシート参照型チャットボット起動（データ読み込み中）');
  
  // 初期化
  currentQuestionIndex = 0;
  userAnswers = [];
  questionsCompleted = 0;
  isTyping = false;
  questionAnswered = false;
  console.log('🔄 チャットボット状態初期化完了');
  
  // スプレッドシートから直接データを取得
  console.log('📊 スプレッドシートから質問データを取得中...');
  const loaded = await loadQuestionsFromSpreadsheet();
  
  if (loaded && questionsData.length > 0) {
    console.log('✅ スプレッドシートデータ準備完了:', questionsData.length, '件');
    console.log('✅ 最初の質問:', questionsData[0]);
    showChatbotWithFirstQuestion();
  } else {
    console.error('❌ スプレッドシートデータ取得失敗');
  }
}

/**
 * BOTウィンドウを表示して最初の質問を開始
 */
async function showChatbotWithFirstQuestion() {
  console.log('💬 BOTウィンドウ表示＆質問開始');
  
  // チャットボットコンテナを表示
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (chatbotContainer) {
    chatbotContainer.classList.remove('hidden');
    chatbotContainer.style.transform = 'translateY(0)';
    chatbotVisible = true;
    
    // コンテンツの余白を調整
    if (typeof window.adjustContentMarginForChatbot === 'function') {
      window.adjustContentMarginForChatbot(true);
    }
  }
  
  // 挨拶メッセージと最初の実際の質問を連続表示
  await displayWelcomeAndFirstQuestion();
}

/**
 * 挨拶メッセージをスキップして最初の実際の質問を表示
 */
async function displayWelcomeAndFirstQuestion() {
  console.log('🎉 挨拶メッセージ＋最初の質問を連続表示');
  
  const gptTalkContent = document.getElementById('gptTalkContent');
  
  // 1問目が挨拶メッセージの場合はスキップして2問目から開始
  let startIndex = 0;
  if (questionsData.length > 0 && 
      (questionsData[0].type === 'message' || 
       questionsData[0].id === 'W001' ||
       !questionsData[0].choices || 
       questionsData[0].choices.length === 0)) {
    
    // 挨拶メッセージを表示
    const welcomeMessage = questionsData[0].question || questionsData[0].questionText;
    if (gptTalkContent && welcomeMessage) {
      await typeWriterEffect(welcomeMessage, 'gptTalkContent', 30);
      await new Promise(resolve => setTimeout(resolve, 800)); // 少し間を空ける
    }
    
    // 次の質問に進む
    startIndex = 1;
    console.log('📝 挨拶メッセージ表示完了、実際の質問から開始');
  }
  
  // 実際の質問を開始
  if (startIndex < questionsData.length) {
    currentQuestionIndex = startIndex;
    await displayCurrentQuestion();
  } else {
    console.error('❌ 表示する質問がありません');
  }
}

/**
 * チャットボットを非表示
 */
function hideChatbot() {
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (chatbotContainer) {
    chatbotContainer.style.transform = 'translateY(100%)';
    chatbotVisible = false;
    
    // コンテンツの余白を調整
    if (typeof window.adjustContentMarginForChatbot === 'function') {
      window.adjustContentMarginForChatbot(false);
    }
  }
}

// ===========================================
// 初期化
// ===========================================

/**
 * システム初期化（質問データ事前読み込み付き）
 */
function initializeSpreadsheetChatbot() {
  console.log('🚀 スプレッドシート参照型チャットシステム初期化');
  
  // BOTウィンドウを非表示にしておく
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (chatbotContainer) {
    chatbotContainer.classList.add('hidden');
    chatbotContainer.style.transform = 'translateY(100%)';
    chatbotVisible = false;
  }
  
  // 選択肢ボタンの初期設定（テキストは設定しない）
  const choiceButtons = document.querySelectorAll('.choice-btn');
  choiceButtons.forEach((btn, index) => {
    btn.style.display = 'none'; // 最初は非表示
    btn.onclick = null; // 既存のイベントリスナーをクリア
  });
  
  // 🚀 質問データを事前に読み込み（バックグラウンドで実行）
  console.log('⚡ 質問データ事前読み込み開始');
  loadQuestionsFromSpreadsheet().then(success => {
    if (success) {
      console.log('✅ 質問データ事前読み込み完了 - BOT起動が高速化されます');
    } else {
      console.log('⚠️ 質問データ事前読み込み失敗 - フォールバックで動作します');
    }
  }).catch(error => {
    console.log('⚠️ 質問データ事前読み込みエラー - フォールバックで動作します:', error.message);
  });
  
  // デバッグ情報追加
  window.debugChatbotStatus = function() {
    console.log('🔍 チャットボット状態:');
    console.log('- questionsData:', questionsData);
    console.log('- questionsData.length:', questionsData.length);
    console.log('- currentQuestionIndex:', currentQuestionIndex);
    console.log('- questionsCompleted:', questionsCompleted);
    console.log('- FIRST_STAGE_COMPLETION_THRESHOLD:', FIRST_STAGE_COMPLETION_THRESHOLD);
    console.log('- SECOND_STAGE_COMPLETION_THRESHOLD:', SECOND_STAGE_COMPLETION_THRESHOLD);
    console.log('- THIRD_STAGE_COMPLETION_THRESHOLD:', THIRD_STAGE_COMPLETION_THRESHOLD);
    console.log('- FOURTH_STAGE_COMPLETION_THRESHOLD:', FOURTH_STAGE_COMPLETION_THRESHOLD);
  };
  
  console.log('✅ スプレッドシート参照型チャットシステム初期化完了');
}


// ===========================================
// グローバル関数エクスポート
// ===========================================

// HTMLのonclick属性から呼び出される関数
window.handleChoiceClick = function(button, index) {
  console.log('🔘 HTML onclick呼び出し:', button.textContent, 'インデックス:', index);
  
  if (button.textContent.includes('選択肢を読み込み中')) {
    console.log('⚠️ まだ選択肢が読み込まれていません');
    return;
  }
  
  const choice = button.textContent;
  handleChoiceSelection(choice, index);
};

// utils.jsから呼び出されるために必要
window.launchGPTChatbot = launchSpreadsheetChatbot;
window.launchSpreadsheetChatbot = launchSpreadsheetChatbot;
window.unmaskRankingCards = unmaskRankingCards;

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
  initializeSpreadsheetChatbot();
});

// デバッグ用関数
window.debugChatbot = function() {
  console.log('🔍 チャットボットデバッグ情報');
  console.log('questionsData:', questionsData);
  console.log('currentQuestionIndex:', currentQuestionIndex);
  console.log('userAnswers:', userAnswers);
  console.log('questionsCompleted:', questionsCompleted);
  console.log('chatbotVisible:', chatbotVisible);
  console.log('isTyping:', isTyping);
  console.log('questionAnswered:', questionAnswered);
  
  // 現在の質問と次の質問を表示
  if (questionsData.length > 0) {
    console.log('📝 現在の質問:', questionsData[currentQuestionIndex] || '範囲外');
    console.log('📝 次の質問:', questionsData[currentQuestionIndex + 1] || '最後の質問');
  }
  
  // 選択肢ボタンの状態確認
  const choiceButtons = document.querySelectorAll('.choice-btn');
  console.log('🔘 選択肢ボタン数:', choiceButtons.length);
  choiceButtons.forEach((btn, i) => {
    console.log(`ボタン${i+1}:`, {
      text: btn.textContent,
      visible: btn.style.display !== 'none',
      onclick: !!btn.onclick
    });
  });
};

// 手動で質問を進めるデバッグ関数
window.debugNextQuestion = function() {
  console.log('🔧 手動で次の質問に進みます');
  moveToNextQuestion();
};

// 手動で選択肢をクリックするデバッグ関数
window.debugClickChoice = function(index) {
  console.log('🔧 手動で選択肢', index, 'をクリック');
  const choiceButtons = document.querySelectorAll('.choice-btn');
  if (choiceButtons[index]) {
    const choice = choiceButtons[index].textContent;
    handleChoiceSelection(choice, index);
  }
};

// スプレッドシート質問順序確認用関数
window.debugQuestionOrder = function() {
  console.log('📋 スプレッドシート質問順序詳細:');
  questionsData.forEach((q, i) => {
    console.log(`${i+1}. [行${q.rowNumber || '?'}] "${q.question}" (段階: ${q.stage}, orderIndex: ${q.orderIndex})`);
  });
};