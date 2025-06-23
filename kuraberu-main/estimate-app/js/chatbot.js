/**
 * 4段階ヒアリングチャットボットシステム
 * estimate-app専用
 */

// グローバル変数
let chatbotVisible = false;
let chatbotInitialized = false;
let currentStage = '第1段階';
let currentQuestions = [];
let stageAnswers = [];
let currentQuestionIndex = 0;
let userAnswers = [];

// GAS API呼び出し関数
async function callGASAPI(action, parameters = {}) {
  try {
    const gasUrl = 'https://script.google.com/macros/s/AKfycbwZwxFeAimcpQ2FtAO02Sy83yRoyxeBcItJcl2R1-66gaNIrBtZ-lEu5CMPIKxWSZAv/exec';
    
    const requestBody = {
      action: action,
      ...parameters
    };
    
    console.log('GAS API呼び出し:', action, parameters);
    
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('GAS APIレスポンス:', result);
    
    return result;
  } catch (error) {
    console.error('GAS API呼び出しエラー:', error);
    // フォールバック: デフォルトのデータを返す
    console.log('⚠️ API失敗 - デフォルトデータを使用');
    return { success: false, error: error.toString() };
  }
}

// スプレッドシートから質問データを取得
async function getQuestionsFromSpreadsheet(stage, requiredOnly = false) {
  try {
    console.log('📊 スプレッドシートから質問取得開始:', stage, requiredOnly);
    const result = await callGASAPI('getQuestionsByStage', {
      stage: stage,
      requiredOnly: requiredOnly.toString()
    });
    
    console.log('📊 API結果:', result);
    
    if (result.success && result.questions && result.questions.length > 0) {
      console.log('✅ 質問取得成功:', result.questions.length + '件');
      return result.questions;
    } else {
      console.error('❌ 質問取得失敗:', result.error || '質問データが空');
      return [];
    }
  } catch (error) {
    console.error('❌ 質問取得エラー:', error);
    return [];
  }
}

// スプレッドシートの質問データを内部形式に変換
function convertSpreadsheetQuestions(spreadsheetQuestions) {
  let questionCounter = 0;
  return spreadsheetQuestions.map((q, index) => {
    // メッセージタイプの場合は質問番号を付けない
    let questionText;
    if (q.type === 'message') {
      questionText = q.question;
    } else {
      questionCounter++;
      questionText = `Q${questionCounter}. ${q.question}`;
    }

    return {
      id: q.id,
      question: questionText,
      options: q.choices && q.choices.filter(choice => choice && choice.trim() !== '').map(choice => ({
        text: choice,
        value: choice
      })) || [],
      knowledge: {
        title: q.knowledgeTitle,
        content: q.knowledgeContent,
        youtubeUrl: q.youtubeUrl
      },
      stage: q.stage,
      type: q.type,
      required: q.required,
      triggerMosaicRemoval: q.triggerMosaicRemoval ? parseInt(q.triggerMosaicRemoval) : null,
      triggerSortEnable: q.triggerSortEnable ? parseInt(q.triggerSortEnable) : null
    };
  });
}

// 即座にチャットボットを表示する関数（API呼び出しは並行処理）
function showChatbotImmediate() {
  // 重複初期化を防止
  if (chatbotInitialized) {
    console.log('⚠️ チャットボット既に初期化済み');
    return;
  }
  
  chatbotInitialized = true;
  console.log('🚀 チャットボット初期化開始');
  
  // まずUIを即座に表示
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (chatbotContainer) {
    chatbotContainer.classList.remove('hidden');
    
    // 下からスライドイン
    setTimeout(() => {
      chatbotContainer.classList.remove('translate-y-full');
      
      // BOT表示時に電話番号フォームにマージンを追加
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection && phoneSection.style.display !== 'none') {
        phoneSection.style.marginBottom = '420px';
        console.log('📱 電話番号フォームにマージン追加');
      }
    }, 100);
    
    // 初期化
    currentQuestionIndex = 0;
    userAnswers = [];
    stageAnswers = [];
    currentQuestions = []; // 空にしてバックグラウンド取得を待つ
    
    // 即座に仮の挨拶を表示
    showTemporaryGreeting();
    
    // バックグラウンドでスプレッドシートから質問を取得
    loadQuestionsInBackground();
  }
}

// 仮の挨拶を表示
function showTemporaryGreeting() {
  const currentQuestionElement = document.getElementById('currentQuestion');
  const knowledgeSection = document.getElementById('knowledgeSection');
  const choiceButtons = document.getElementById('choiceButtons');
  
  if (currentQuestionElement) {
    currentQuestionElement.textContent = 'こんにちは！相場をお調べいただき、ありがとうございます。';
  }
  // 挨拶時は豆知識セクションを非表示
  if (knowledgeSection) {
    knowledgeSection.style.display = 'none';
  }
  if (choiceButtons) {
    choiceButtons.style.display = 'none';
  }
}

// バックグラウンドで質問をロードして更新
async function loadQuestionsInBackground() {
  // まずデフォルト質問を設定（フォールバック）
  currentQuestions = createDefaultQuestions();
  console.log('🔄 デフォルト質問を設定:', currentQuestions.length + '件');
  
  try {
    console.log('🔄 バックグラウンドで質問データを取得中...');
    const spreadsheetQuestions = await getQuestionsFromSpreadsheet('第1段階', true);
    
    if (spreadsheetQuestions && spreadsheetQuestions.length > 0) {
      currentQuestions = convertSpreadsheetQuestions(spreadsheetQuestions);
      console.log('✅ スプレッドシート連携成功! 質問数:', currentQuestions.length);
      console.log('最初の質問:', currentQuestions[0]);
    } else {
      console.log('⚠️ スプレッドシートデータが空のため、デフォルト質問を使用');
    }
  } catch (error) {
    console.error('❌ スプレッドシート取得エラー:', error);
    console.log('⚠️ デフォルト質問を続行使用');
  }
  
  // インデックスをリセットして最初から開始
  currentQuestionIndex = 0;
  userAnswers = [];
  
  // 2秒後に正式な質問フローを開始
  setTimeout(() => {
    showQuestion(0);
  }, 2000);
}

// 全段階の質問データを作成
function createDefaultQuestions() {
  return [
    // 第1段階: 基本情報収集
    {
      id: 'M001',
      question: 'こんにちは！相場をお調べいただき、ありがとうございます。',
      type: 'message',
      stage: 1,
      options: [],
      knowledge: { content: '' }
    },
    {
      id: 'Q001',
      question: 'Q1. 建物の外壁材質を教えてください',
      type: '必須',
      stage: 1,
      options: [
        { text: 'サイディング', value: 'サイディング' },
        { text: 'モルタル', value: 'モルタル' },
        { text: 'ALC', value: 'ALC' },
        { text: 'タイル', value: 'タイル' }
      ],
      knowledge: { content: 'サイディングは最も一般的で、塗装費用は80-120万円程度。' }
    },
    {
      id: 'Q002',
      question: 'Q2. 建物の延床面積はどのくらいですか？',
      type: '必須',
      stage: 1,
      options: [
        { text: '100㎡未満', value: '100㎡未満' },
        { text: '100-150㎡', value: '100-150㎡' },
        { text: '150-200㎡', value: '150-200㎡' },
        { text: '200㎡以上', value: '200㎡以上' }
      ],
      knowledge: { content: '面積が大きいほど塗装費用も比例して増加します。' }
    },
    {
      id: 'M101',
      question: '基本情報をお聞きしました。続いて現在の状況を確認させてください。',
      type: 'message',
      stage: 2,
      options: [],
      knowledge: { content: '' },
      triggerMosaicRemoval: 1
    },
    // 第2段階: 現状診断
    {
      id: 'Q101',
      question: 'Q3. 外壁の状態はいかがですか？',
      type: '必須',
      stage: 2,
      options: [
        { text: 'きれいな状態', value: 'きれいな状態' },
        { text: '少し汚れが目立つ', value: '少し汚れが目立つ' },
        { text: 'ひび割れがある', value: 'ひび割れがある' },
        { text: 'かなり劣化している', value: 'かなり劣化している' }
      ],
      knowledge: { content: '劣化状況により工事内容と費用が大きく変わります。' }
    },
    {
      id: 'M201',
      question: 'ありがとうございます。お客様にぴったりのご提案をさせていただきます。',
      type: 'message',
      stage: 3,
      options: [],
      knowledge: { content: '' },
      triggerSortEnable: 2
    },
    // 第3段階: クロージング
    {
      id: 'Q201',
      question: 'Q4. 無料の現地調査はいかがでしょうか？',
      type: '必須',
      stage: 3,
      options: [
        { text: 'はい、お願いします', value: 'はい、お願いします' },
        { text: '検討したい', value: '検討したい' },
        { text: '他社と比較したい', value: '他社と比較したい' },
        { text: 'まだ決められない', value: 'まだ決められない' }
      ],
      knowledge: { content: '無料現地調査で正確なお見積もりをご提示できます。' },
      triggerMosaicRemoval: 4
    },
    {
      id: 'M301',
      question: 'ありがとうございます！それでは詳細をお聞かせください。',
      type: 'message',
      stage: 4,
      options: [],
      knowledge: { content: '' }
    },
    // 第4段階: 最終確認
    {
      id: 'Q301',
      question: 'Q5. ご希望の工事時期はいつ頃ですか？',
      type: '必須',
      stage: 4,
      options: [
        { text: '1ヶ月以内', value: '1ヶ月以内' },
        { text: '3ヶ月以内', value: '3ヶ月以内' },
        { text: '半年以内', value: '半年以内' },
        { text: '1年以内', value: '1年以内' }
      ],
      knowledge: { content: '季節により工事の適性が変わります。' },
      triggerMosaicRemoval: 5
    },
    {
      id: 'M401',
      question: 'ヒアリング完了です！担当者よりご連絡いたします。',
      type: 'message',
      stage: 5,
      options: [],
      knowledge: { content: '' }
    }
  ];
}

// 質問表示関数
function showQuestion(index) {
  // 最下部固定チャットボットの要素を使用
  const currentQuestionElement = document.getElementById('currentQuestion');
  const choiceButtons = document.getElementById('choiceButtons');
  const knowledgeContent = document.getElementById('knowledgeContent');
  const backButton = document.getElementById('chatbotBackButton');
  
  if (!currentQuestionElement || !choiceButtons) return;
  
  const question = currentQuestions[index];
  if (!question) return;
  
  console.log('質問表示:', question.type, question.question);
  
  // バックボタンの表示/非表示を設定
  if (index > 0 && backButton) {
    backButton.style.display = 'flex';
  } else if (backButton) {
    backButton.style.display = 'none';
  }
  
  // 質問文を直接設定（タイピングアニメーションは簡略化）
  currentQuestionElement.textContent = question.question;
  
  // 豆知識を表示（内容がある場合のみ）
  const knowledgeSection = document.getElementById('knowledgeSection');
  if (knowledgeContent && question.knowledge && question.knowledge.content && question.knowledge.content.trim() !== '') {
    knowledgeContent.innerHTML = `<p>${question.knowledge.content}</p>`;
    
    // 豆知識セクションをスライドイン表示
    if (knowledgeSection) {
      knowledgeSection.style.display = 'block';
      knowledgeSection.style.transform = 'translateY(20px)';
      knowledgeSection.style.opacity = '0';
      
      setTimeout(() => {
        knowledgeSection.style.transition = 'all 0.3s ease-out';
        knowledgeSection.style.transform = 'translateY(0)';
        knowledgeSection.style.opacity = '1';
      }, 100);
    }
  } else {
    // 豆知識がない場合は非表示
    if (knowledgeSection) {
      knowledgeSection.style.display = 'none';
    }
  }
  
  // 質問タイプに応じてUI生成
  if (question.type === 'message') {
    // メッセージタイプでも4択と同じ高さを保持
    choiceButtons.innerHTML = `
      <div class="message-placeholder bg-gray-50 p-4 rounded-lg text-center text-gray-600 text-sm">
        メッセージを確認して次に進んでいます...
      </div>
    `;
    choiceButtons.style.display = 'grid';
    
    // メッセージタイプの場合は2秒後に自動で次に進む
    setTimeout(() => {
      // メッセージタイプでもモザイク解除チェック
      if (question.triggerMosaicRemoval) {
        console.log('🎆 メッセージでモザイク解除フラグが設定されています:', question.triggerMosaicRemoval);
        
        setTimeout(() => {
          if (typeof window.completeHearingStage === 'function') {
            console.log('🎆 派手なモザイク解除エフェクトを開始 (メッセージベース)');
            window.completeHearingStage(parseInt(question.triggerMosaicRemoval));
          }
        }, 500);
      }
      
      // ソートボタン有効化チェック
      if (question.triggerSortEnable) {
        console.log('🎯 メッセージでソートボタン有効化フラグが設定されています:', question.triggerSortEnable);
        
        setTimeout(() => {
          if (typeof window.enableSortButtons === 'function') {
            console.log('🎯 ソートボタン有効化 (メッセージベース)');
            window.enableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
            // ヒアリング段階も更新
            if (typeof window.completeHearingStage === 'function') {
              window.completeHearingStage(parseInt(question.triggerSortEnable));
            }
          }
        }, 500);
      }
      
      currentQuestionIndex++;
      if (currentQuestionIndex < currentQuestions.length) {
        showQuestion(currentQuestionIndex);
      } else {
        completeHearing();
      }
    }, 2000);
  } else if (question.type === 'slider') {
    // スライダータイプの場合
    const minValue = question.options[0]?.value || 0;
    const maxValue = question.options[1]?.value || 50;
    const stepValue = question.options[2]?.value || 1;
    const unit = question.options[3]?.value || '';
    
    choiceButtons.innerHTML = `
      <div class="slider-container bg-white p-4 rounded-lg border border-gray-200">
        <!-- チェックボックス選択 -->
        <div class="mb-4">
          <div class="flex gap-4">
            <label class="flex items-center">
              <input type="radio" name="accuracy_${currentQuestionIndex}" value="おおよそ" checked class="mr-2">
              <span class="text-sm">おおよそ</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="accuracy_${currentQuestionIndex}" value="正確に" class="mr-2">
              <span class="text-sm">正確に</span>
            </label>
          </div>
        </div>
        
        <!-- スライダー -->
        <div class="mb-4">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600">${minValue}${unit}</span>
            <input 
              type="range" 
              id="slider_${currentQuestionIndex}"
              min="${minValue}" 
              max="${maxValue}" 
              step="${stepValue}" 
              value="10"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            >
            <span class="text-sm text-gray-600">${maxValue}${unit}</span>
          </div>
          <div class="text-center mt-2">
            <span id="slider_value_${currentQuestionIndex}" class="text-lg font-bold text-blue-600">10${unit}</span>
          </div>
        </div>
        
        <!-- 確定ボタン -->
        <div class="text-center">
          <button 
            id="slider_confirm_${currentQuestionIndex}"
            class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-lg text-sm font-medium transition-colors"
          >
            この値で決定
          </button>
        </div>
      </div>
    `;
    
    choiceButtons.style.display = 'block';
    choiceButtons.style.opacity = '1';
    choiceButtons.style.visibility = 'visible';
    
    console.log('🎚️ スライダー表示設定完了');
    console.log('🎚️ スライダーHTML:', choiceButtons.innerHTML);
    
    // スライダーのイベントリスナーを設定
    setupSliderEvents(currentQuestionIndex);
  } else {
    // 通常の4択の場合
    choiceButtons.innerHTML = question.options.map((option, idx) => `
      <button class="choice-btn bg-white hover:bg-blue-500 hover:text-white p-4 rounded-lg text-sm transition-colors duration-200 border-2 border-gray-300 font-medium" data-answer="${option.value}">
        ${option.text}
      </button>
    `).join('');
    
    choiceButtons.style.display = 'grid';
    choiceButtons.style.opacity = '1';
    choiceButtons.style.visibility = 'visible';
    
    console.log('🔘 ボタンHTML:', choiceButtons.innerHTML);
    console.log('🔘 ボタン表示状態:', choiceButtons.style.display);
    console.log('🔘 ボタン透明度:', choiceButtons.style.opacity);
    
    // ボタンにイベントリスナーを設定
    const choiceBtns = choiceButtons.querySelectorAll('.choice-btn');
    console.log('🔘 ボタン設定:', choiceBtns.length + '個のボタン');
    choiceBtns.forEach((button, idx) => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const answer = this.getAttribute('data-answer');
        console.log('🎯 ボタンクリック:', answer, 'index:', currentQuestionIndex);
        console.log('🎯 Button element:', this);
        console.log('🎯 Current questions:', currentQuestions);
        handleAnswer(currentQuestionIndex, answer);
      });
    });
  }
}

// スライダーイベント設定
function setupSliderEvents(questionIndex) {
  const slider = document.getElementById(`slider_${questionIndex}`);
  const valueDisplay = document.getElementById(`slider_value_${questionIndex}`);
  const confirmButton = document.getElementById(`slider_confirm_${questionIndex}`);
  
  if (!slider || !valueDisplay || !confirmButton) return;
  
  // 現在の質問を取得して単位を決定
  const currentQuestion = currentQuestions[questionIndex];
  const unit = currentQuestion.options[3]?.value || '';
  
  // スライダーの値変更イベント
  slider.addEventListener('input', function() {
    valueDisplay.textContent = this.value + unit;
  });
  
  // 確定ボタンのイベント
  confirmButton.addEventListener('click', function() {
    const sliderValue = slider.value;
    const accuracyRadio = document.querySelector(`input[name="accuracy_${questionIndex}"]:checked`);
    const accuracy = accuracyRadio ? accuracyRadio.value : 'おおよそ';
    
    // 回答を「正確性 + 値 + 単位」の形で作成
    const answer = `${accuracy}${sliderValue}${unit}`;
    
    console.log('スライダー回答:', answer);
    handleAnswer(questionIndex, answer);
  });
}

// 回答処理関数（動的質問に対応したバージョン）
function handleAnswer(index, answer) {
  console.log('📝 回答処理開始:', answer, 'index:', index);
  console.log('📝 Current questions array:', currentQuestions);
  console.log('📝 Current question:', currentQuestions[index]);
  
  // 重複実行防止
  if (userAnswers.length > index) {
    console.log('⚠️ 重複回答をスキップ');
    return;
  }
  
  // 回答を保存
  userAnswers.push(answer);
  console.log('📝 回答保存完了. 現在の回答数:', userAnswers.length);

  const currentQuestion = currentQuestions[index];
  
  // モザイク解除タイミングをチェック
  if (currentQuestion && currentQuestion.triggerMosaicRemoval) {
    console.log('🎆 質問でモザイク解除フラグが設定されています:', currentQuestion.triggerMosaicRemoval);
    
    setTimeout(() => {
      if (typeof window.completeHearingStage === 'function') {
        console.log('🎆 派手なモザイク解除エフェクトを開始 (質問ベース)');
        window.completeHearingStage(parseInt(currentQuestion.triggerMosaicRemoval));
      }
    }, 800);
  }
  
  // ソートボタン有効化チェック
  if (currentQuestion && currentQuestion.triggerSortEnable) {
    console.log('🎯 質問でソートボタン有効化フラグが設定されています:', currentQuestion.triggerSortEnable);
    
    setTimeout(() => {
      if (typeof window.enableSortButtons === 'function') {
        console.log('🎯 ソートボタン有効化 (質問ベース)');
        window.enableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
        // ヒアリング段階も更新
        if (typeof window.completeHearingStage === 'function') {
          window.completeHearingStage(parseInt(currentQuestion.triggerSortEnable));
        }
      }
    }, 800);
  }

  // 特別処理: 第3段階（クロージング）で「はい、お願いします」が選択された場合
  if (currentQuestion && currentQuestion.stage === 3 && answer === 'はい、お願いします') {
    console.log('🎯 クロージング成功！電話番号フォームを表示');
    
    // 少し待ってから電話番号フォームを表示
    setTimeout(() => {
      showPhoneInputForm();
    }, 1000);
  }

  // 回答履歴を表示
  updateAnswerHistory(index, answer);
  
  // ボタンを一時的に非表示
  const choiceButtons = document.getElementById('choiceButtons');
  if (choiceButtons) {
    choiceButtons.style.opacity = '0';
    setTimeout(() => {
      choiceButtons.style.display = 'none';
      
      // 回答をAPIに送信し次のアクションを決定
      processAnswer(index, answer);
    }, 300);
  } else {
    console.error('❌ choiceButtons要素が見つかりません');
  }
}

// 回答を処理して次の質問を決定する関数
function processAnswer(index, answer) {
  try {
    console.log('🔄 回答を処理:', answer, 'for question index:', index);

    // 次の質問へ進む
    currentQuestionIndex++;
    
    console.log('📊 質問進行状況:', `${currentQuestionIndex}/${currentQuestions.length}`);
    console.log('📊 現在の質問配列:', currentQuestions);
    
    if (currentQuestionIndex < currentQuestions.length) {
      // まだ質問が残っている場合
      console.log('➡️ 次の質問に進む:', currentQuestions[currentQuestionIndex]);
      setTimeout(() => {
        showQuestion(currentQuestionIndex);
      }, 300);
    } else {
      // 全ての質問が終わった場合
      console.log('✅ 全質問完了 - ヒアリング終了');
      completeHearing();
    }
  } catch (error) {
    console.error('❌ 回答処理中のエラー:', error);
  }
}

// 回答履歴の更新
function updateAnswerHistory(index, answer) {
  const botHistory = document.getElementById('botHistory');
  const currentQuestion = currentQuestions[index];
  
  if (!botHistory || !currentQuestion) return;
  
  // 回答履歴を表示
  botHistory.classList.remove('hidden');
  
  // 必要な履歴要素を追加（最大4つまで）
  let historyItemCount = botHistory.querySelectorAll('div.flex').length;
  const displayIndex = index + 1; // 1-indexedの表示用
  
  // 既存の回答要素を検索
  let answerElement = document.getElementById(`answer${displayIndex}`);
  
  if (!answerElement) {
    // 要素が存在しない場合は新規作成
    const historyItem = document.createElement('div');
    historyItem.className = 'flex items-start mb-1';
    historyItem.innerHTML = `
      <span class="font-bold mr-2">Q${displayIndex}:</span>
      <span id="answer${displayIndex}">${answer}</span>
    `;
    botHistory.appendChild(historyItem);
  } else {
    // 存在する場合は更新
    answerElement.textContent = answer;
    answerElement.parentElement.classList.remove('hidden');
  }
}

// ヒアリング完了関数（APIでデータを処理）
async function completeHearing() {
  try {
    // 質問エリアを完了メッセージに変更
    const botQuestion = document.getElementById('botQuestion');
    if (botQuestion) {
      botQuestion.innerHTML = `
        <div class="text-center py-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-kuraberu-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="font-bold text-kuraberu-blue mb-1">ヒアリング完了！</p>
          <p class="text-sm text-gray-600">あなたにぴったりの業者を表示しています</p>
        </div>
      `;
    }
    
    // スキップボタンを非表示
    const skipHearing = document.getElementById('skipHearing');
    if (skipHearing) {
      skipHearing.classList.add('hidden');
    }
    
    console.log('✅ 4段階ヒアリング完了');
    
  } catch (error) {
    console.error('❌ ヒアリング完了処理エラー:', error);
  }
}

// 第4段階（最終確認・日程調整）に進む関数
function proceedToStage4() {
  console.log('🎯 第4段階に進みます');
  
  // 現在の質問から第4段階の質問を見つける
  const stage4Questions = currentQuestions.filter(q => q.stage === 4);
  if (stage4Questions.length === 0) {
    console.log('⚠️ 第4段階の質問が見つかりません。ヒアリング完了');
    return;
  }
  
  // 第4段階の最初の質問のインデックスを見つける
  const stage4StartIndex = currentQuestions.findIndex(q => q.stage === 4);
  if (stage4StartIndex === -1) {
    console.log('⚠️ 第4段階の開始インデックスが見つかりません');
    return;
  }
  
  // BOTを第4段階の質問に切り替え
  currentQuestionIndex = stage4StartIndex;
  console.log('📍 第4段階開始位置:', stage4StartIndex);
  
  // BOTセクションを表示して第4段階の質問を開始
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (chatbotContainer && chatbotContainer.classList.contains('translate-y-full')) {
    // BOTが隠れている場合は再表示
    chatbotContainer.classList.remove('translate-y-full');
  }
  
  // 第4段階の質問を表示
  showQuestion(currentQuestionIndex);
}

// グローバル関数としてエクスポート
window.showChatbotImmediate = showChatbotImmediate;
window.proceedToStage4 = proceedToStage4;