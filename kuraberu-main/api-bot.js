// APIを活用したAIヒアリングボット修正スクリプト
document.addEventListener('DOMContentLoaded', function() {
  console.log('API対応BOT修正スクリプト実行');
  
  // グローバル変数
  let sessionId = generateSessionId();
  let currentQuestionIndex = 0;
  let userAnswers = [];
  let questions = [];
  
  // 基本質問セット（API取得前の初期値）
  const baseQuestions = [
    {
      question: "Q1. 外壁の状態はどうですか？",
      options: [
        { text: "良好（目立った劣化なし）", value: "良好" },
        { text: "やや劣化（部分的な汚れあり）", value: "やや劣化" },
        { text: "劣化（ひび割れあり）", value: "劣化" },
        { text: "かなり劣化（はがれ・浮きあり）", value: "かなり劣化" }
      ]
    },
    {
      question: "Q2. 施工時の重視ポイントは？",
      options: [
        { text: "価格の安さ", value: "価格重視" },
        { text: "品質の高さ", value: "品質重視" },
        { text: "保証の充実", value: "保証重視" },
        { text: "対応の速さ", value: "スピード重視" }
      ]
    },
    {
      question: "Q3. 希望する塗装工事のタイミングは？",
      options: [
        { text: "すぐにでも（1ヶ月以内）", value: "緊急" },
        { text: "3ヶ月以内", value: "3ヶ月以内" },
        { text: "半年以内", value: "半年以内" },
        { text: "検討中（1年以内）", value: "検討中" }
      ]
    },
    {
      question: "Q4. 塗装面積はおよそどれくらいですか？",
      options: [
        { text: "小さめ（15坪以下）", value: "小" },
        { text: "やや小さめ（16〜25坪）", value: "中小" },
        { text: "一般的（26〜35坪）", value: "中" },
        { text: "大きめ（36坪以上）", value: "大" }
      ]
    }
  ];
  
  // 追加質問セット（APIからの応答に基づいて追加されるもの）
  const additionalQuestions = {
    "劣化": {
      question: "ひび割れはどの程度ですか？",
      options: [
        { text: "細いひび割れが少しある", value: "軽微なひび割れ" },
        { text: "複数の場所にひび割れがある", value: "複数箇所のひび割れ" },
        { text: "大きなひび割れがある", value: "大きなひび割れ" },
        { text: "よくわからない", value: "不明" }
      ]
    },
    "かなり劣化": {
      question: "外壁の浮きやはがれの範囲はどの程度ですか？",
      options: [
        { text: "部分的に少し", value: "部分的な劣化" },
        { text: "複数箇所に広がっている", value: "広範囲な劣化" },
        { text: "外壁全体に及んでいる", value: "全体的な劣化" },
        { text: "よくわからない", value: "不明" }
      ]
    }
  };
  
  // セッションID生成関数
  function generateSessionId() {
    return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  // ボタンのイベントハンドラーを設定
  const showAccuratePriceBtn = document.getElementById('showAccuratePrice');
  if (showAccuratePriceBtn) {
    console.log('ボタンを発見しました');
    showAccuratePriceBtn.addEventListener('click', function() {
      console.log('ボタンクリック：正確な相場を表示');

      // ヒアリングボットセクションをスムーズに表示
      const hearingBotSection = document.getElementById('hearingBotSection');
      if (hearingBotSection) {
        // コンテンツを準備
        const botQuestion = document.getElementById('botQuestion');
        const typingContent = document.getElementById('typingContent');

        if (botQuestion && typingContent) {
          // 先に内容をリセット
          typingContent.textContent = '';

          // 初期設定を適用
          botQuestion.style.opacity = '0';
          botQuestion.style.transform = 'translateY(10px)';
          botQuestion.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

          // まずセクションを表示
          hearingBotSection.classList.remove('hidden');
          hearingBotSection.style.opacity = '0';
          hearingBotSection.style.transition = 'opacity 0.4s ease';

          // フェードイン
          setTimeout(() => {
            hearingBotSection.style.opacity = '1';

            // 少し遅れて質問エリアをフェードイン
            setTimeout(() => {
              botQuestion.style.opacity = '1';
              botQuestion.style.transform = 'translateY(0)';

              // APIから質問を取得して初期化
              initChatBot();
            }, 150);
          }, 50);
        } else {
          // フォールバック: 要素が見つからない場合は単純に表示
          hearingBotSection.classList.remove('hidden');
          initChatBot();
        }
      } else {
        console.error('hearingBotSectionが見つかりません');
      }
      
      // ボタン自体を非表示
      this.style.display = 'none';
    });
  } else {
    console.error('showAccuratePriceボタンが見つかりません');
  }
  
  // チャットボット初期化（APIから質問を取得）
  async function initChatBot() {
    try {
      console.log('チャットボット初期化を開始');
      
      // APIから質問を取得（またはローカルの基本質問を使用）
      const response = await callScriptApi('getInitialQuestions');
      
      if (response.success && response.questions) {
        console.log('APIから質問を取得しました');
        questions = response.questions;
      } else {
        console.log('ローカルの基本質問を使用します');
        questions = [...baseQuestions];
      }
      
      // 最初の質問を表示
      currentQuestionIndex = 0;
      userAnswers = [];
      
      // 最初の質問を表示（タイピングアニメーション付き）
      showQuestion(0);
    } catch (error) {
      console.error('チャットボット初期化エラー:', error);
      
      // エラー時はローカルの質問を使用
      questions = [...baseQuestions];
      showQuestion(0);
    }
  }
  
  // 質問表示関数（タイピングアニメーション付き）
  function showQuestion(index) {
    console.log('質問表示：', index);
    
    const botQuestion = document.getElementById('botQuestion');
    const botChoices = document.getElementById('botChoices');
    const typingContent = document.getElementById('typingContent');
    const backButton = document.getElementById('backButton');

    if (!botQuestion || !botChoices || !typingContent) {
      console.error('ボット要素が見つかりません');
      return;
    }
    
    // 質問インデックスの検証
    if (index >= questions.length) {
      console.error('質問インデックスが範囲外です');
      return;
    }
    
    const question = questions[index];
    currentQuestionIndex = index;
    
    // 戻るボタンの表示・非表示
    if (backButton) {
      if (index > 0) {
        backButton.classList.remove('hidden');
      } else {
        backButton.classList.add('hidden');
      }
    }
    
    // 質問番号の更新は削除
    
    // 選択肢の非表示（タイピングアニメーション中）
    botChoices.style.opacity = '0';
    
    // タイピングアニメーション開始
    startTypingAnimation(question.question, botChoices, question.options);
  }
  
  // タイピングアニメーション
  function startTypingAnimation(questionText, botChoices, options) {
    const typingContent = document.getElementById('typingContent');
    if (!typingContent || !botChoices) return;

    let currentText = '';
    let charIndex = 0;
    const typingInterval = 30; // 文字間のタイピング速度（少し速めに）

    // 初期状態: 完全に空にする
    typingContent.textContent = '';

    // すぐにカーソルを表示
    typingContent.innerHTML = '<span class="typing-cursor">|</span>';

    // スムーズに見えるようディレイを少しだけ入れる
    setTimeout(() => {
      // タイピングエフェクト
      const typingTimer = setInterval(() => {
        if (charIndex < questionText.length) {
          currentText += questionText.charAt(charIndex);
          typingContent.innerHTML = currentText + '<span class="typing-cursor">|</span>';
          charIndex++;
        } else {
          // タイピング完了
          clearInterval(typingTimer);

          // 選択肢ボタンをスムーズに表示
          botChoices.style.display = 'grid';
          botChoices.style.transform = 'translateY(5px)';
          botChoices.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

          // 少しだけ遅延してフェードイン（より自然に見せる）
          setTimeout(() => {
            botChoices.style.opacity = '1';
            botChoices.style.transform = 'translateY(0)';
            setChoiceButtons(botChoices, options);
          }, 100);
        }
      }, typingInterval);
    }, 50);
  }
  
  // 選択肢ボタンを設定
  function setChoiceButtons(botChoices, options) {
    botChoices.innerHTML = '';
    
    // 選択肢ボタンを作成
    options.forEach(option => {
      const button = document.createElement('button');
      button.className = 'botAnswer bg-gray-100 hover:bg-kuraberu-blue hover:text-white py-2 px-3 rounded-lg text-sm text-left transition-colors';
      button.setAttribute('data-answer', option.value);
      button.textContent = option.text;
      
      // クリックイベント
      button.addEventListener('click', function() {
        handleAnswer(currentQuestionIndex, option.value);
      });
      
      botChoices.appendChild(button);
    });
    
    // 選択肢を表示（フェードイン）
    botChoices.style.display = 'grid';
    setTimeout(() => {
      botChoices.style.opacity = '1';
    }, 50);
  }
  
  // 回答処理関数
  async function handleAnswer(index, answer) {
    console.log('回答処理：', index, answer);
    
    // 回答を保存
    userAnswers[index] = answer;
    
    // 選択肢を一時的に非表示
    const botChoices = document.getElementById('botChoices');
    if (botChoices) {
      botChoices.style.opacity = '0';
      
      // APIに回答を送信して次のステップを決定
      try {
        const response = await callScriptApi('processAnswer', {
          questionIndex: index,
          answer: answer,
          userAnswers: userAnswers
        });
        
        // 動的な質問追加の処理（APIレスポンスまたはローカルルールに基づく）
        if (response.success && response.additionalQuestion) {
          // APIからの追加質問を挿入
          questions.splice(index + 1, 0, response.additionalQuestion);
          console.log('APIからの追加質問を挿入:', response.additionalQuestion.question);
        } else if (additionalQuestions[answer] && index < questions.length - 1) {
          // ローカルの追加質問ルールを適用
          questions.splice(index + 1, 0, additionalQuestions[answer]);
          console.log('ローカルの追加質問を挿入:', additionalQuestions[answer].question);
        }
        
        // 次の質問へ進む
        currentQuestionIndex++;
        
        if (currentQuestionIndex < questions.length) {
          // まだ質問が残っている場合
          setTimeout(() => {
            showQuestion(currentQuestionIndex);
          }, 300);
        } else {
          // すべての質問が完了した場合
          console.log('すべての質問が完了しました');
          completeQuestionnaire();
        }
      } catch (error) {
        console.error('回答処理中のエラー:', error);
        
        // エラー時もフォールバックとして次の質問へ進む
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
          setTimeout(() => {
            showQuestion(currentQuestionIndex);
          }, 300);
        } else {
          completeQuestionnaire();
        }
      }
    }
  }
  
  // 回答履歴の更新関数は削除
  
  // 質問完了処理
  async function completeQuestionnaire() {
    // 完了メッセージの表示
    const botQuestion = document.getElementById('botQuestion');
    const botChoices = document.getElementById('botChoices');
    const completionMessage = document.getElementById('completionMessage');

    if (botQuestion && botChoices && completionMessage) {
      // 質問エリアと選択肢を非表示
      botQuestion.style.display = 'none';
      botChoices.style.display = 'none';

      // 完了メッセージを表示
      completionMessage.classList.remove('hidden');
      
      // 戻るボタンを非表示
      const backButton = document.getElementById('backButton');
      if (backButton) {
        backButton.classList.add('hidden');
      }
      
      // API: 回答の最終提出
      try {
        const finalResponse = await callScriptApi('completeQuestionnaire', {
          userAnswers: userAnswers,
          sessionId: sessionId
        });
        
        if (finalResponse.success) {
          console.log('回答が正常に送信されました');
          
          // 業者ランキングの表示/更新
          updateCompanyRanking(finalResponse.companies || []);
        }
      } catch (error) {
        console.error('回答送信エラー:', error);
      }
      
      // ソートボタンを表示（存在する場合）
      const sortButtons = document.getElementById('sortButtons');
      if (sortButtons) {
        sortButtons.classList.remove('hidden');
      }
    }
  }
  
  // 業者ランキングの表示/更新
  function updateCompanyRanking(companies) {
    // この部分はサイトの業者ランキング表示機能に応じて実装
    console.log('業者ランキングを更新:', companies);
    
    // 既存のランキング機能を邪魔しないようにする簡易実装
    const allCompanies = document.getElementById('allCompanies');
    if (allCompanies && companies.length > 0) {
      // 必要に応じてランキング表示の更新
    }
  }
  
  // APIリクエスト関数
  async function callScriptApi(action, data = {}) {
    console.log('API呼び出し（エミュレート）:', action, data);
    
    // API呼び出しをエミュレート（実際のAPIを使う場合はここを修正）
    return new Promise((resolve) => {
      setTimeout(() => {
        // アクションに応じたダミーレスポンスを返す
        switch (action) {
          case 'getInitialQuestions':
            resolve({
              success: true,
              questions: baseQuestions
            });
            break;
            
          case 'processAnswer':
            // 回答に基づく追加質問の判定
            let additionalQuestion = null;
            if (data.answer === '劣化' || data.answer === 'かなり劣化') {
              additionalQuestion = additionalQuestions[data.answer];
            }
            
            resolve({
              success: true,
              additionalQuestion: additionalQuestion
            });
            break;
            
          case 'completeQuestionnaire':
            // ダミーの業者リスト
            const dummyCompanies = [
              { id: 1, name: 'T社', rating: 4.9, price: '78万円〜', features: ['地元密着', '保証充実', '即日対応'], work: 1200 },
              { id: 2, name: 'S社', rating: 4.7, price: '83万円〜', features: ['最低価格保証', '職人直営'], work: 980 },
              { id: 3, name: 'K社', rating: 4.5, price: '85万円〜', features: ['定期点検付', '環境配慮'], work: 850 }
            ];
            
            resolve({
              success: true,
              companies: dummyCompanies
            });
            break;
            
          default:
            resolve({
              success: false,
              error: 'Unknown action'
            });
        }
      }, 500); // 実際のAPI通信を模倣した遅延
    });
  }
  
  // 戻るボタンの設定
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', function() {
      if (currentQuestionIndex > 0) {
        // 現在の回答を削除
        userAnswers.pop();
        
        // 前の質問に戻る
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
      }
    });
  }
  
  // 既存のヒアリングボットを初期化（既に表示されている場合）
  const hearingBotSection = document.getElementById('hearingBotSection');
  if (hearingBotSection && !hearingBotSection.classList.contains('hidden')) {
    // ページ読み込み時にボットが表示されていた場合、一旦隠して再表示する
    hearingBotSection.classList.add('hidden');

    // ページの他の要素が読み込まれるまで少し待機
    setTimeout(() => {
      hearingBotSection.classList.remove('hidden');
      initChatBot();
    }, 300);
  }
});