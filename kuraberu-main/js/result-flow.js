/**
 * 外壁塗装くらべる - 動的結果表示フロー
 * 
 * 郵便番号送信時のフォーム処理をインターセプトし、
 * 相場表示・AIヒアリングウィザード・フッター固定ボタンを
 * 動的に生成して表示する機能を実装します。
 */

document.addEventListener('DOMContentLoaded', () => {
  // フォーム要素の取得
  const zipForm = document.getElementById('zip-form');
  const zipInput = document.getElementById('zip-input');
  const loadingOverlay = document.getElementById('loading-overlay');
  
  // ウィザードの状態管理
  const wizardState = {
    currentStep: 0,
    answers: [],
    completed: false
  };
  
  // ウィザードの質問データ
  const wizardQuestions = [
    {
      id: 'property-type',
      question: 'お住まいの種類を教えてください',
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
      options: [
        { value: 'asap', label: 'すぐにでも' },
        { value: 'within-3months', label: '3ヶ月以内' },
        { value: 'within-6months', label: '半年以内' },
        { value: 'undecided', label: '未定・検討中' }
      ]
    }
  ];
  
  // 郵便番号の入力中にハイフンを自動挿入
  if (zipInput) {
    zipInput.addEventListener('input', function(e) {
      const value = e.target.value.replace(/[^\d]/g, '');
      if (value.length > 3) {
        e.target.value = value.slice(0, 3) + '-' + value.slice(3, 7);
      } else {
        e.target.value = value;
      }
    });
  }
  
  // フォーム送信イベントをインターセプト
  if (zipForm) {
    zipForm.addEventListener('submit', handleZipSubmit);
  }
  
  /**
   * 郵便番号フォーム送信処理
   * @param {Event} e - フォーム送信イベント
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
    
    // ローディング表示
    if (loadingOverlay) {
      loadingOverlay.classList.remove('hidden');
    }
    
    // ZipCloud APIを使用して住所を取得
    fetchAddressFromZipCode(zipCode);
  }
  
  /**
   * 郵便番号のバリデーション
   * @param {string} zip - 郵便番号
   * @returns {boolean} - 郵便番号が有効な場合はtrue
   */
  function validateZipCode(zip) {
    return /^\d{7}$/.test(zip);
  }
  
  /**
   * 郵便番号から住所を取得するAPI呼び出し
   * @param {string} zipCode - 郵便番号
   */
  function fetchAddressFromZipCode(zipCode) {
    const apiUrl = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipCode}`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('APIリクエストに失敗しました');
        }
        return response.json();
      })
      .then(data => {
        if (data.status === 200 && data.results) {
          const addressInfo = data.results[0];
          const prefecture = addressInfo.address1; // 都道府県
          const city = addressInfo.address2;       // 市区町村
          
          // ローディングを非表示
          if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
          }
          
          // 結果エリアを生成して表示
          createResultArea(prefecture, city);
        } else {
          throw new Error('該当する住所が見つかりません');
        }
      })
      .catch(error => {
        console.error('エラー:', error);
        
        // ローディングを非表示
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        
        alert('通信に失敗しました');
      });
  }
  
  /**
   * 結果エリアを作成（チュートリアルモーダルを表示せず直接ウィザードを表示するように変更）
   * @param {string} prefecture - 都道府県
   * @param {string} city - 市区町村
   */
  function createResultArea(prefecture, city) {
    // 既存の結果エリアを削除（もし存在すれば）
    const existingResultArea = document.getElementById('resultArea');
    if (existingResultArea) {
      existingResultArea.remove();
    }
    
    // 結果エリアを作成
    const resultArea = document.createElement('div');
    resultArea.id = 'resultArea';
    
    // 相場カードを作成
    const priceCard = createPriceCard(prefecture, city);
    resultArea.appendChild(priceCard);
    
    // ウィザードを作成
    const wizard = createWizard();
    resultArea.appendChild(wizard);
    
    // bodyの末尾に追加
    document.body.appendChild(resultArea);
    
    // 滑らかにスクロール
    resultArea.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * 相場カード要素を作成
   * @param {string} prefecture - 都道府県
   * @param {string} city - 市区町村
   * @returns {HTMLElement} - 相場カード要素
   */
  function createPriceCard(prefecture, city) {
    const priceCard = document.createElement('div');
    priceCard.className = 'price-card';
    
    // ダミー価格を設定（本来はAPIからの取得や計算が必要）
    const minPrice = 70;
    const maxPrice = 110;
    
    priceCard.innerHTML = `
      <div class="price-card-header">
        ${prefecture}${city}の外壁塗装相場
      </div>
      <div class="price-card-body">
        <div class="house-specs">2F建て戸建て築25年の場合（30坪）</div>
        <div class="price-value">${minPrice}万〜${maxPrice}万円</div>
        <div class="price-note">※建物の状態や使用材料により価格は変動します</div>
      </div>
    `;
    
    return priceCard;
  }
  
  /**
   * ウィザード要素を作成
   * @returns {HTMLElement} - ウィザード要素
   */
  function createWizard() {
    const wizard = document.createElement('div');
    wizard.id = 'wizard';
    
    // ウィザードのヘッダー（進捗バーとステップ）
    wizard.innerHTML = `
      <div class="wizard-header">
        <div class="wizard-progress">
          <div class="wizard-progress-bar" style="width: 20%"></div>
        </div>
        <div class="wizard-steps">
          <span class="wizard-step active">1</span>
          <span class="wizard-step">2</span>
          <span class="wizard-step">3</span>
          <span class="wizard-step">4</span>
          <span class="wizard-step">5</span>
        </div>
      </div>
      <div class="wizard-content">
        <div class="question-area" id="question-area">
          <!-- ここに質問が動的に挿入される -->
        </div>
        <div class="wizard-actions">
          <button id="back-btn" class="wizard-btn back" disabled>戻る</button>
          <button id="next-btn" class="wizard-btn next" disabled>次へ</button>
        </div>
      </div>
    `;
    
    // ウィザードを初期化
    setTimeout(() => {
      renderCurrentQuestion();
      
      // ナビゲーションボタンにイベントリスナーを設定
      const backBtn = document.getElementById('back-btn');
      const nextBtn = document.getElementById('next-btn');
      
      if (backBtn) {
        backBtn.addEventListener('click', goToPreviousStep);
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', goToNextStep);
      }
    }, 100);
    
    return wizard;
  }
  
  /**
   * 現在のステップの質問を描画
   */
  function renderCurrentQuestion() {
    const questionArea = document.getElementById('question-area');
    if (!questionArea) return;
    
    const currentQuestion = wizardQuestions[wizardState.currentStep];
    if (!currentQuestion) return;
    
    // 質問エリアを初期化
    questionArea.innerHTML = `
      <div class="question-title">${currentQuestion.question}</div>
      <div class="options-container" id="options-container">
        ${currentQuestion.options.map((option, index) => `
          <div class="option-item" data-value="${option.value}">
            <div class="radio-indicator"></div>
            ${option.label}
          </div>
        `).join('')}
      </div>
    `;
    
    // オプションにイベントリスナーを設定
    const optionItems = questionArea.querySelectorAll('.option-item');
    optionItems.forEach(item => {
      item.addEventListener('click', function() {
        // 選択済みクラスをすべて削除
        optionItems.forEach(el => el.classList.remove('selected'));
        
        // クリックした要素に選択済みクラスを追加
        this.classList.add('selected');
        
        // 回答を保存
        const value = this.getAttribute('data-value');
        wizardState.answers[wizardState.currentStep] = {
          questionId: currentQuestion.id,
          value: value
        };
        
        // 次へボタンを有効化
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
          nextBtn.disabled = false;
        }
      });
    });
    
    // 既に回答済みの場合は選択状態を復元
    const savedAnswer = wizardState.answers[wizardState.currentStep];
    if (savedAnswer) {
      const selectedOption = questionArea.querySelector(`.option-item[data-value="${savedAnswer.value}"]`);
      if (selectedOption) {
        selectedOption.classList.add('selected');
        
        // 次へボタンを有効化
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
          nextBtn.disabled = false;
        }
      }
    }
    
    // 戻るボタンの状態を更新
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.disabled = wizardState.currentStep === 0;
    }
    
    // 次へボタンのテキストを更新
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
      if (wizardState.currentStep === wizardQuestions.length - 1) {
        nextBtn.textContent = '完了';
      } else {
        nextBtn.textContent = '次へ';
      }
    }
    
    // 進捗バーを更新
    updateProgressBar();
  }
  
  /**
   * 進捗バーを更新
   */
  function updateProgressBar() {
    const progressBar = document.querySelector('.wizard-progress-bar');
    if (progressBar) {
      const progress = ((wizardState.currentStep + 1) / wizardQuestions.length) * 100;
      progressBar.style.width = `${progress}%`;
    }
    
    // ステップマーカーを更新
    const steps = document.querySelectorAll('.wizard-step');
    if (steps) {
      steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < wizardState.currentStep) {
          step.classList.add('completed');
        } else if (index === wizardState.currentStep) {
          step.classList.add('active');
        }
      });
    }
  }
  
  /**
   * 前のステップに戻る
   */
  function goToPreviousStep() {
    if (wizardState.currentStep > 0) {
      wizardState.currentStep--;
      renderCurrentQuestion();
    }
  }
  
  /**
   * 次のステップに進む
   */
  function goToNextStep() {
    // 最終ステップの場合
    if (wizardState.currentStep === wizardQuestions.length - 1) {
      completeWizard();
      return;
    }
    
    // 次のステップへ
    wizardState.currentStep++;
    renderCurrentQuestion();
  }
  
  /**
   * ウィザードを完了し、フッターボタンを表示（関数名変更）
   */
  function completeWizard() {
    const wizard = document.getElementById('wizard');
    if (!wizard) return;
    
    // ウィザードの内容を完了メッセージに変更
    wizard.innerHTML = `
      <div class="wizard-completion">
        <div class="completion-title">情報の入力が完了しました！</div>
        <div class="completion-message">
          あなたの状況に最適な外壁塗装業者をマッチングしました。
          下記のボタンから詳細な見積もりを確認できます。
        </div>
        <div class="loading-spinner"></div>
        <div class="loading-message">業者情報を取得中...</div>
      </div>
    `;
    
    wizardState.completed = true;
    
    // ウィザード完了時のみフッターボタンを表示
    setTimeout(() => {
      createFooterButtons();
    }, 2000);
  }
  
  /**
   * フッター固定ボタンを作成（関数名変更: showBottomButtons → createFooterButtons）
   */
  function createFooterButtons() {
    // 既存のボタンを削除
    const existingButtons = document.querySelector('.fixed-buttons');
    if (existingButtons) {
      existingButtons.remove();
    }
    
    // ボタンコンテナを作成
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'fixed-buttons';
    
    // ボタンを設定
    buttonsContainer.innerHTML = `
      <div class="fixed-button">
        <img src="https://placehold.co/24x24/0099cc/ffffff?text=▶" alt="動画アイコン">
        <span>見積もりの流れ動画</span>
      </div>
      <div class="fixed-button">
        <img src="https://placehold.co/24x24/ffcc00/ffffff?text=★" alt="キープアイコン">
        <span>キープ中業者を見る</span>
        <span class="badge">3</span>
      </div>
      <div class="fixed-button">
        <img src="https://placehold.co/24x24/ff6600/ffffff?text=✉" alt="メールアイコン">
        <span>無料見積もりを依頼</span>
        <span class="badge">3</span>
      </div>
    `;
    
    // bodyの末尾に追加
    document.body.appendChild(buttonsContainer);
    
    // ローディングアニメーションを非表示
    const loadingSpinner = document.querySelector('.loading-spinner');
    const loadingMessage = document.querySelector('.loading-message');
    
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
    
    if (loadingMessage) {
      loadingMessage.textContent = 'マッチング完了！下記のボタンから進めてください';
    }
  }
});