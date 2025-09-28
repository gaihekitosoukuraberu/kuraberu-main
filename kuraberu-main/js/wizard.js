/**
 * 外壁塗装くらべる - ウィザードJS
 * 
 * このファイルはLPの機能を実装するJavaScriptファイルです。
 * Step1では郵便番号入力と相場表示の基本機能を実装します。
 * Step2ではチュートリアルモーダルとAIヒアリングウィザードを実装します。
 */

// DOM読み込み完了時に実行
document.addEventListener('DOMContentLoaded', function() {
  // DOM要素の取得 - 郵便番号フォーム関連
  const zipForm = document.getElementById('zip-form');
  const zipInput = document.getElementById('zip-input');
  const zipSubmit = document.getElementById('zip-submit');
  const loadingOverlay = document.getElementById('loading-overlay');
  const progressBar = document.getElementById('progress-bar');
  const loadingSteps = {
    step1: document.getElementById('loading-step1'),
    step2: document.getElementById('loading-step2'),
    step3: document.getElementById('loading-step3')
  };
  const priceResult = document.getElementById('price-result');
  const locationDisplay = document.getElementById('location-display');
  const priceRange = document.getElementById('price-range');
  
  // DOM要素の取得 - チュートリアルとウィザード関連
  const tutorialModal = document.getElementById('tutorial-modal');
  const startWizardBtn = document.getElementById('start-wizard');
  const wizardContainer = document.getElementById('wizard-container');
  const wizardProgressBar = document.getElementById('wizard-progress-bar');
  const wizardSteps = document.getElementById('wizard-steps').querySelectorAll('.wizard-step');
  const questionContainer = document.getElementById('question-container');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  
  // 地域ごとの相場情報（実際のアプリではAPIから取得）
  const priceData = {
    '100': { location: '東京都千代田区', min: 90, max: 135 },
    '150': { location: '東京都渋谷区', min: 95, max: 140 },
    '160': { location: '東京都新宿区', min: 90, max: 130 },
    '210': { location: '神奈川県川崎市', min: 85, max: 120 },
    '220': { location: '神奈川県横浜市', min: 80, max: 115 },
    '225': { location: '神奈川県横浜市', min: 70, max: 110 },
    '230': { location: '神奈川県横浜市', min: 75, max: 110 },
    '240': { location: '神奈川県横浜市', min: 70, max: 105 },
    '330': { location: '埼玉県さいたま市', min: 70, max: 100 },
    '340': { location: '埼玉県草加市', min: 65, max: 95 },
    '350': { location: '埼玉県川越市', min: 60, max: 90 },
    '270': { location: '千葉県松戸市', min: 65, max: 95 },
    '260': { location: '千葉県千葉市', min: 60, max: 90 },
    // デフォルト値
    'default': { location: '全国平均', min: 75, max: 110 }
  };
  
  // ウィザードの質問データ
  const wizardQuestions = [
    {
      id: 'property-type',
      question: 'お住まいの種類を教えてください',
      type: 'radio',
      options: [
        { value: 'detached', label: '一戸建て' },
        { value: 'apartment', label: 'マンション' },
        { value: 'shop', label: '店舗' },
        { value: 'other', label: 'その他' }
      ]
    },
    {
      id: 'property-age',
      question: '建物の築年数を教えてください',
      type: 'radio',
      options: [
        { value: 'less-than-5', label: '5年未満' },
        { value: '5-to-15', label: '5年～15年' },
        { value: '15-to-30', label: '15年～30年' },
        { value: 'more-than-30', label: '30年以上' }
      ]
    },
    {
      id: 'property-size',
      question: 'お住まいの大きさを教えてください',
      type: 'radio',
      options: [
        { value: 'less-than-20', label: '20坪未満' },
        { value: '20-to-30', label: '20坪～30坪' },
        { value: '30-to-40', label: '30坪～40坪' },
        { value: 'more-than-40', label: '40坪以上' }
      ]
    },
    {
      id: 'paint-condition',
      question: '現在の外壁の状態を教えてください',
      type: 'radio',
      options: [
        { value: 'good', label: '問題なし' },
        { value: 'slight-damage', label: '少しひび割れあり' },
        { value: 'peeling', label: '塗装が剥がれている' },
        { value: 'severe-damage', label: '大きな損傷あり' }
      ]
    },
    {
      id: 'desired-timing',
      question: '工事予定はいつ頃でしょうか？',
      type: 'radio',
      options: [
        { value: 'asap', label: 'すぐにでも' },
        { value: 'within-3months', label: '3ヶ月以内' },
        { value: 'within-6months', label: '半年以内' },
        { value: 'undecided', label: '未定・検討中' }
      ]
    }
  ];
  
  // 現在のウィザードステップとユーザー回答
  let currentStep = 0;
  const userAnswers = {};

  // 郵便番号入力フォームにイベントリスナーを追加
  zipForm.addEventListener('submit', handleZipSubmit);
  
  // 郵便番号の入力中にハイフンを自動挿入
  zipInput.addEventListener('input', function(e) {
    const value = e.target.value.replace(/[^\d]/g, '');
    if (value.length > 3) {
      e.target.value = value.slice(0, 3) + '-' + value.slice(3, 7);
    } else {
      e.target.value = value;
    }
  });
  
  // チュートリアルスタートボタンにイベントリスナーを追加
  if (startWizardBtn) {
    startWizardBtn.addEventListener('click', startWizard);
  }
  
  // ナビゲーションボタンにイベントリスナーを追加
  if (prevButton) {
    prevButton.addEventListener('click', goToPreviousStep);
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', goToNextStep);
  }

  /**
   * 郵便番号送信処理
   * @param {Event} e - フォームのsubmitイベント
   */
  function handleZipSubmit(e) {
    e.preventDefault();
    
    // 郵便番号を取得して整形
    const zipCode = zipInput.value.replace(/[^\d]/g, '');
    
    // 郵便番号のバリデーション
    if (!validateZipCode(zipCode)) {
      alert('正しい郵便番号を入力してください（例：123-4567）');
      return;
    }
    
    // ローディング表示開始
    showLoading();
    
    // 実際のアプリではここでAPIリクエストを行う
    // このデモでは3秒後に結果を表示
    setTimeout(() => {
      // ローディング完了後、結果表示
      showPriceResult(zipCode);
      
      // チュートリアルモーダルを表示（Step2で追加）
      setTimeout(() => {
        showTutorial();
      }, 1000);
    }, 3000);
  }
  
  /**
   * 郵便番号のバリデーション
   * @param {string} zip - バリデーション対象の郵便番号
   * @returns {boolean} - 有効な郵便番号ならtrue
   */
  function validateZipCode(zip) {
    return /^\d{7}$/.test(zip);
  }
  
  /**
   * ローディング表示の開始
   */
  function showLoading() {
    // オーバーレイを表示
    loadingOverlay.classList.remove('hidden');
    
    // プログレスバーと各ステップの表示を操作
    setTimeout(() => {
      progressBar.style.width = '30%';
      loadingSteps.step1.classList.add('active');
    }, 300);
    
    setTimeout(() => {
      progressBar.style.width = '60%';
      loadingSteps.step1.classList.remove('active');
      loadingSteps.step1.classList.add('complete');
      loadingSteps.step2.classList.add('active');
    }, 1200);
    
    setTimeout(() => {
      progressBar.style.width = '100%';
      loadingSteps.step2.classList.remove('active');
      loadingSteps.step2.classList.add('complete');
      loadingSteps.step3.classList.add('active');
    }, 2000);
    
    setTimeout(() => {
      loadingSteps.step3.classList.remove('active');
      loadingSteps.step3.classList.add('complete');
    }, 2800);
  }
  
  /**
   * 相場結果の表示
   * @param {string} zipCode - 郵便番号
   */
  function showPriceResult(zipCode) {
    // ローディングを非表示
    loadingOverlay.classList.add('hidden');
    
    // 郵便番号から地域情報を取得
    const areaCode = zipCode.substring(0, 3);
    const priceInfo = priceData[areaCode] || priceData['default'];
    
    // 地域名と価格を表示
    locationDisplay.textContent = `${priceInfo.location}の外壁塗装相場`;
    priceRange.textContent = `${priceInfo.min}万～${priceInfo.max}万円`;
    
    // 結果表示エリアを表示
    priceResult.classList.remove('hidden');
    
    // 結果をコンソールに出力（デバッグ・テスト用）
    console.log('相場表示：', {
      zipCode: zipCode,
      location: priceInfo.location,
      priceRange: `${priceInfo.min}万～${priceInfo.max}万円`
    });
  }
  
  /**
   * チュートリアルモーダルを表示
   */
  function showTutorial() {
    if (tutorialModal) {
      tutorialModal.classList.remove('hidden');
      tutorialModal.classList.add('fade-in');
    }
  }
  
  /**
   * AIヒアリングウィザードを開始
   */
  function startWizard() {
    if (tutorialModal && wizardContainer) {
      // チュートリアルを非表示
      tutorialModal.classList.add('fade-out');
      setTimeout(() => {
        tutorialModal.classList.add('hidden');
        
        // ウィザードを表示
        wizardContainer.classList.remove('hidden');
        wizardContainer.classList.add('fade-in');
        
        // 最初の質問を表示
        renderCurrentQuestion();
        updateNavigation();
      }, 300);
    }
  }
  
  /**
   * 現在の質問を表示
   */
  function renderCurrentQuestion() {
    if (!questionContainer) return;
    
    const currentQuestion = wizardQuestions[currentStep];
    if (!currentQuestion) return;
    
    let questionHTML = '';
    
    // 質問タイプに応じたHTMLを生成
    if (currentQuestion.type === 'radio') {
      questionHTML = `
        <div class="wizard-question">
          <h4>${currentQuestion.question}</h4>
          <div class="question-options">
            ${currentQuestion.options.map((option, index) => `
              <div class="option-item ${userAnswers[currentQuestion.id] === option.value ? 'selected' : ''}" data-value="${option.value}">
                <label>
                  <span class="radio-indicator"></span>
                  ${option.label}
                </label>
                <input type="radio" name="${currentQuestion.id}" value="${option.value}" ${userAnswers[currentQuestion.id] === option.value ? 'checked' : ''}>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (currentQuestion.type === 'text') {
      questionHTML = `
        <div class="wizard-question">
          <h4>${currentQuestion.question}</h4>
          <input type="text" class="text-input" id="${currentQuestion.id}" value="${userAnswers[currentQuestion.id] || ''}" placeholder="${currentQuestion.placeholder || ''}">
        </div>
      `;
    }
    
    // 質問内容を表示
    questionContainer.innerHTML = questionHTML;
    
    // ラジオボタンのオプションにイベントリスナーを設定
    if (currentQuestion.type === 'radio') {
      const optionItems = questionContainer.querySelectorAll('.option-item');
      optionItems.forEach(item => {
        item.addEventListener('click', function() {
          const value = this.getAttribute('data-value');
          userAnswers[currentQuestion.id] = value;
          
          // 選択状態を更新
          optionItems.forEach(el => el.classList.remove('selected'));
          this.classList.add('selected');
          
          // ラジオボタンをチェック
          const radio = this.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
          
          // 次へボタンを有効化
          nextButton.disabled = false;
        });
      });
    } else if (currentQuestion.type === 'text') {
      const textInput = questionContainer.querySelector('.text-input');
      if (textInput) {
        textInput.addEventListener('input', function() {
          userAnswers[currentQuestion.id] = this.value;
          nextButton.disabled = !this.value.trim();
        });
        // フォーカスを設定
        textInput.focus();
      }
    }
  }
  
  /**
   * ナビゲーションボタンの状態を更新
   */
  function updateNavigation() {
    if (!prevButton || !nextButton) return;
    
    // 「戻る」ボタンは最初のステップでは無効
    prevButton.disabled = currentStep === 0;
    
    // 「次へ」ボタンは回答が選択されていない場合は無効
    const currentQuestion = wizardQuestions[currentStep];
    if (currentQuestion) {
      nextButton.disabled = !userAnswers[currentQuestion.id];
    }
    
    // 最後のステップでは「次へ」を「完了」に変更
    if (currentStep === wizardQuestions.length - 1) {
      nextButton.textContent = '完了';
    } else {
      nextButton.textContent = '次へ';
    }
    
    // プログレスバーとステップインジケーターを更新
    updateProgressIndicators();
  }
  
  /**
   * プログレスインジケーターを更新
   */
  function updateProgressIndicators() {
    if (!wizardProgressBar || !wizardSteps) return;
    
    // プログレスバーを更新
    const progressPercentage = ((currentStep + 1) / wizardQuestions.length) * 100;
    wizardProgressBar.style.width = `${progressPercentage}%`;
    
    // ステップインジケーターを更新
    wizardSteps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index < currentStep) {
        step.classList.add('completed');
      } else if (index === currentStep) {
        step.classList.add('active');
      }
    });
  }
  
  /**
   * 前のステップに戻る
   */
  function goToPreviousStep() {
    if (currentStep > 0) {
      currentStep--;
      renderCurrentQuestion();
      updateNavigation();
    }
  }
  
  /**
   * 次のステップに進む
   */
  function goToNextStep() {
    const currentQuestion = wizardQuestions[currentStep];
    
    // 現在の質問に回答されているか確認
    if (!userAnswers[currentQuestion.id]) {
      // 回答が選択されていない場合は何もしない
      return;
    }
    
    // 最後のステップの場合
    if (currentStep === wizardQuestions.length - 1) {
      completeWizard();
      return;
    }
    
    // 次のステップに進む
    currentStep++;
    renderCurrentQuestion();
    updateNavigation();
  }
  
  /**
   * ウィザードを完了する
   */
  function completeWizard() {
    if (!wizardContainer) return;
    
    // ウィザードの回答をコンソールに出力（デバッグ・テスト用）
    console.log('ウィザード回答：', userAnswers);
    
    // ウィザードを非表示
    wizardContainer.classList.add('fade-out');
    setTimeout(() => {
      wizardContainer.classList.add('hidden');
      
      // Step3での実装のために、一時的にアラートを表示
      alert('ウィザードが完了しました。Step3でランキング表示を実装します。');
    }, 300);
  }
  
  /**
   * 指定したミリ秒間待機する
   * @param {number} ms - 待機ミリ秒
   * @returns {Promise} - 指定時間後に解決するPromise
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // デバッグ用: グローバルに関数を公開
  window.debug = {
    validateZipCode,
    showPriceResult,
    startWizard,
    goToNextStep,
    goToPreviousStep
  };
});