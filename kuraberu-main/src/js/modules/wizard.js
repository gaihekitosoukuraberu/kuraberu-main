/**
 * ウィザードモジュール
 * 
 * 外壁塗装に関する質問フローと結果表示を管理します。
 * ユーザーの回答に基づいて最適な業者を表示します。
 */

import { apiStub } from './apiStub.js';
import { zipValidator } from './zipValidator.js';
import { updateWizardCompletionState } from './footerButtons.js';

// ウィザードの現在のステップを追跡
let currentStep = 0;
let wizardData = {
  postalCode: '',
  houseType: '',
  buildYear: '',
  wallMaterial: '',
  lastPaintYear: '',
  urgency: '',
  budget: '',
  additionalRequests: ''
};

/**
 * ウィザードの初期設定を行います
 */
export function setupWizard() {
  // DOM要素の取得
  const wizardSection = document.getElementById('wizard');
  if (!wizardSection) return;

  // 「今すぐ見積もり」ボタンのクリックイベント
  const startButtons = document.querySelectorAll('.js-start-wizard');
  startButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      showWizard();
    });
  });

  // 「次へ」ボタンのクリックイベント
  const nextButtons = document.querySelectorAll('.wizard__next-button');
  nextButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (validateCurrentStep()) {
        saveCurrentStepData();
        goToNextStep();
      }
    });
  });

  // 「戻る」ボタンのクリックイベント
  const prevButtons = document.querySelectorAll('.wizard__prev-button');
  prevButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      goToPrevStep();
    });
  });

  // 各質問の選択肢のクリックイベント
  const optionButtons = document.querySelectorAll('.wizard__option');
  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 同じグループの他のボタンから選択状態を解除
      const group = button.closest('.wizard__options-group');
      if (group) {
        group.querySelectorAll('.wizard__option').forEach(btn => {
          btn.classList.remove('wizard__option--selected');
        });
      }
      
      // 選択状態を適用
      button.classList.add('wizard__option--selected');
      
      // 次へボタンを有効化
      const step = button.closest('.wizard__step');
      if (step) {
        const nextButton = step.querySelector('.wizard__next-button');
        if (nextButton) {
          nextButton.removeAttribute('disabled');
        }
      }
    });
  });

  // フォーム送信イベント
  const wizardForm = document.getElementById('wizardForm');
  if (wizardForm) {
    wizardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitWizardData();
    });
  }
  
  initializeWizard();
}

/**
 * ウィザードを初期状態に戻します
 */
function initializeWizard() {
  // すべてのステップを非表示
  const steps = document.querySelectorAll('.wizard__step');
  steps.forEach(step => {
    step.classList.add('hidden');
  });
  
  // 最初のステップのみ表示
  const firstStep = document.querySelector('.wizard__step[data-step="0"]');
  if (firstStep) {
    firstStep.classList.remove('hidden');
  }
  
  // 結果表示を非表示
  const resultContainer = document.getElementById('wizardResult');
  if (resultContainer) {
    resultContainer.classList.add('hidden');
  }
  
  // 進捗バーを初期化
  updateProgressBar(0);
  
  // データをリセット
  resetWizardData();
  
  // カウンターをリセット
  currentStep = 0;
  
  // フッターボタンの状態を更新
  updateWizardCompletionState(false);
}

/**
 * ウィザードセクションを表示します
 */
function showWizard() {
  const wizardSection = document.getElementById('wizard');
  if (wizardSection) {
    // ページ内リンクでスクロール
    wizardSection.scrollIntoView({ behavior: 'smooth' });
    
    // 画面に表示されていることを確認するためのクラスを追加
    wizardSection.classList.add('wizard--active');
  }
}

/**
 * 現在のステップのデータを検証します
 * @returns {boolean} 検証結果
 */
function validateCurrentStep() {
  const currentStepElement = document.querySelector(`.wizard__step[data-step="${currentStep}"]`);
  if (!currentStepElement) return false;
  
  let isValid = true;
  
  // 郵便番号の検証（ステップ0の場合）
  if (currentStep === 0) {
    const postalCodeInput = currentStepElement.querySelector('input[name="postalCode"]');
    if (postalCodeInput) {
      isValid = zipValidator.validate(postalCodeInput.value);
      if (!isValid) {
        // エラー表示
        const errorElement = currentStepElement.querySelector('.wizard__error');
        if (errorElement) {
          errorElement.textContent = '正しい郵便番号を入力してください（例: 123-4567）';
          errorElement.classList.remove('hidden');
        }
      }
    }
  } else {
    // 選択肢の検証（他のステップの場合）
    const selectedOption = currentStepElement.querySelector('.wizard__option--selected');
    isValid = !!selectedOption;
    
    if (!isValid) {
      // エラー表示
      const errorElement = currentStepElement.querySelector('.wizard__error');
      if (errorElement) {
        errorElement.textContent = 'いずれかの選択肢を選んでください';
        errorElement.classList.remove('hidden');
      }
    }
  }
  
  return isValid;
}

/**
 * 現在のステップのデータを保存します
 */
function saveCurrentStepData() {
  const currentStepElement = document.querySelector(`.wizard__step[data-step="${currentStep}"]`);
  if (!currentStepElement) return;
  
  // ステップに応じてデータを保存
  switch (currentStep) {
    case 0:
      const postalCodeInput = currentStepElement.querySelector('input[name="postalCode"]');
      if (postalCodeInput) {
        wizardData.postalCode = postalCodeInput.value;
      }
      break;
    case 1:
      const houseTypeOption = currentStepElement.querySelector('.wizard__option--selected');
      if (houseTypeOption) {
        wizardData.houseType = houseTypeOption.dataset.value;
      }
      break;
    case 2:
      const buildYearOption = currentStepElement.querySelector('.wizard__option--selected');
      if (buildYearOption) {
        wizardData.buildYear = buildYearOption.dataset.value;
      }
      break;
    case 3:
      const wallMaterialOption = currentStepElement.querySelector('.wizard__option--selected');
      if (wallMaterialOption) {
        wizardData.wallMaterial = wallMaterialOption.dataset.value;
      }
      break;
    case 4:
      const lastPaintYearOption = currentStepElement.querySelector('.wizard__option--selected');
      if (lastPaintYearOption) {
        wizardData.lastPaintYear = lastPaintYearOption.dataset.value;
      }
      break;
    case 5:
      const urgencyOption = currentStepElement.querySelector('.wizard__option--selected');
      if (urgencyOption) {
        wizardData.urgency = urgencyOption.dataset.value;
      }
      break;
    case 6:
      const budgetOption = currentStepElement.querySelector('.wizard__option--selected');
      if (budgetOption) {
        wizardData.budget = budgetOption.dataset.value;
      }
      break;
    case 7:
      const requestsTextarea = currentStepElement.querySelector('textarea[name="additionalRequests"]');
      if (requestsTextarea) {
        wizardData.additionalRequests = requestsTextarea.value;
      }
      break;
  }
}

/**
 * 次のステップに進みます
 */
function goToNextStep() {
  // 現在のステップを非表示
  const currentStepElement = document.querySelector(`.wizard__step[data-step="${currentStep}"]`);
  if (currentStepElement) {
    currentStepElement.classList.add('hidden');
  }
  
  // カウンターを増やす
  currentStep++;
  
  // 最終ステップの場合、結果表示へ
  const totalSteps = document.querySelectorAll('.wizard__step').length;
  if (currentStep >= totalSteps) {
    showResults();
    return;
  }
  
  // 次のステップを表示
  const nextStepElement = document.querySelector(`.wizard__step[data-step="${currentStep}"]`);
  if (nextStepElement) {
    nextStepElement.classList.remove('hidden');
    
    // エラーメッセージをリセット
    const errorElement = nextStepElement.querySelector('.wizard__error');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.add('hidden');
    }
  }
  
  // 進捗バーを更新
  updateProgressBar(currentStep / (totalSteps - 1));
}

/**
 * 前のステップに戻ります
 */
function goToPrevStep() {
  // 現在のステップが0の場合、何もしない
  if (currentStep <= 0) return;
  
  // 現在のステップを非表示
  const currentStepElement = document.querySelector(`.wizard__step[data-step="${currentStep}"]`);
  if (currentStepElement) {
    currentStepElement.classList.add('hidden');
  }
  
  // カウンターを減らす
  currentStep--;
  
  // 前のステップを表示
  const prevStepElement = document.querySelector(`.wizard__step[data-step="${currentStep}"]`);
  if (prevStepElement) {
    prevStepElement.classList.remove('hidden');
  }
  
  // 進捗バーを更新
  const totalSteps = document.querySelectorAll('.wizard__step').length;
  updateProgressBar(currentStep / (totalSteps - 1));
}

/**
 * 進捗バーを更新します
 * @param {number} progress - 0から1の間の進捗率
 */
function updateProgressBar(progress) {
  const progressBar = document.querySelector('.wizard__progress-fill');
  if (progressBar) {
    progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
  }
  
  // 進捗テキストも更新
  const progressText = document.querySelector('.wizard__progress-text');
  if (progressText) {
    progressText.textContent = `${Math.round(progress * 100)}%`;
  }
}

/**
 * ウィザードデータをリセットします
 */
function resetWizardData() {
  wizardData = {
    postalCode: '',
    houseType: '',
    buildYear: '',
    wallMaterial: '',
    lastPaintYear: '',
    urgency: '',
    budget: '',
    additionalRequests: ''
  };
}

/**
 * 結果を表示します
 */
async function showResults() {
  // ローディング表示
  const loadingElement = document.getElementById('wizardLoading');
  const resultContainer = document.getElementById('wizardResult');
  
  if (loadingElement && resultContainer) {
    loadingElement.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    // 進捗バーアニメーション
    const progressBar = document.querySelector('.wizard__loading-progress-fill');
    if (progressBar) {
      progressBar.style.width = '0%';
      setTimeout(() => {
        progressBar.style.width = '100%';
      }, 100);
    }
    
    try {
      // API経由で業者データを取得
      const companies = await apiStub.getCompanies(wizardData.postalCode, wizardData);
      
      // ローディング終了
      setTimeout(() => {
        loadingElement.classList.add('hidden');
        
        // 結果のHTMLを生成
        renderResults(companies, resultContainer);
        
        // 結果を表示
        resultContainer.classList.remove('hidden');
        
        // フッターボタンの状態を更新
        updateWizardCompletionState(true);
      }, 2000); // ローディングアニメーションのため2000ms待機
    } catch (error) {
      console.error('Error fetching results:', error);
      
      // エラー表示
      loadingElement.classList.add('hidden');
      resultContainer.innerHTML = `
        <div class="wizard__error-message">
          <h3>エラーが発生しました</h3>
          <p>データの取得中にエラーが発生しました。お手数ですが、再度お試しください。</p>
          <button class="wizard__retry-button" onclick="location.reload()">再試行</button>
        </div>
      `;
      resultContainer.classList.remove('hidden');
    }
  }
}

/**
 * 結果のHTMLを生成して表示します
 * @param {Array} companies - 業者データの配列
 * @param {HTMLElement} container - 結果を表示するコンテナ
 */
function renderResults(companies, container) {
  if (!container) return;
  
  // 結果がない場合
  if (!companies || companies.length === 0) {
    container.innerHTML = `
      <div class="wizard__no-results">
        <h3>対応可能な業者が見つかりませんでした</h3>
        <p>お住まいの地域には、現在対応可能な業者がありません。他の地域をお試しいただくか、お電話でご相談ください。</p>
        <p class="wizard__contact">お電話: 0120-XXX-XXX（平日9:00-18:00）</p>
      </div>
    `;
    return;
  }
  
  // 結果のHTMLを構築
  let html = `
    <div class="wizard__results-header">
      <h3 class="wizard__results-title">あなたにおすすめの業者</h3>
      <p class="wizard__results-subtitle">回答内容に基づいて、${companies.length}社の業者をご紹介します</p>
    </div>
    <div class="wizard__companies">
  `;
  
  // 各業者のカードを生成
  companies.forEach((company, index) => {
    html += `
      <div class="wizard__company-card">
        <div class="wizard__company-header">
          <h4 class="wizard__company-name">${company.name}</h4>
          ${index === 0 ? '<span class="wizard__company-recommended">最もおすすめ</span>' : ''}
        </div>
        <div class="wizard__company-body">
          <div class="wizard__company-info">
            <p><strong>所在地:</strong> ${company.address || '情報なし'}</p>
            <p><strong>評価:</strong> 
              <span class="wizard__company-rating">
                ${'★'.repeat(company.rating || 3)}${'☆'.repeat(5 - (company.rating || 3))}
              </span>
            </p>
            <p><strong>対応エリア:</strong> ${company.areas?.join(', ') || '情報なし'}</p>
            <p><strong>特徴:</strong> ${company.features?.join(', ') || '情報なし'}</p>
          </div>
          <div class="wizard__company-actions">
            <button class="wizard__company-detail-button" data-company-id="${company.id}">詳細を見る</button>
            <button class="wizard__company-contact-button" data-company-id="${company.id}">無料見積もり依頼</button>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
    </div>
    <div class="wizard__results-footer">
      <button class="wizard__restart-button" id="restartWizard">もう一度診断する</button>
    </div>
  `;
  
  // HTMLをコンテナに挿入
  container.innerHTML = html;
  
  // イベントハンドラーの設定
  const restartButton = container.querySelector('#restartWizard');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      initializeWizard();
    });
  }
  
  // 詳細ボタンのイベント
  const detailButtons = container.querySelectorAll('.wizard__company-detail-button');
  detailButtons.forEach(button => {
    button.addEventListener('click', () => {
      const companyId = button.dataset.companyId;
      showCompanyDetail(companyId, companies);
    });
  });
  
  // 無料見積もりボタンのイベント
  const contactButtons = container.querySelectorAll('.wizard__company-contact-button');
  contactButtons.forEach(button => {
    button.addEventListener('click', () => {
      const companyId = button.dataset.companyId;
      showContactForm(companyId, companies);
    });
  });
}

/**
 * 業者の詳細を表示するモーダルを開きます
 * @param {string} companyId - 業者ID
 * @param {Array} companies - 業者データの配列
 */
function showCompanyDetail(companyId, companies) {
  const company = companies.find(c => c.id === companyId);
  if (!company) return;
  
  // モーダル要素を作成
  const modalElement = document.createElement('div');
  modalElement.className = 'wizard__modal';
  modalElement.innerHTML = `
    <div class="wizard__modal-content">
      <div class="wizard__modal-header">
        <h3>${company.name}</h3>
        <button class="wizard__modal-close">&times;</button>
      </div>
      <div class="wizard__modal-body">
        <div class="wizard__company-detail">
          <div class="wizard__company-image">
            <img src="${company.image || 'src/img/company-placeholder.jpg'}" alt="${company.name}">
          </div>
          <div class="wizard__company-info-detailed">
            <p><strong>所在地:</strong> ${company.address || '情報なし'}</p>
            <p><strong>設立:</strong> ${company.foundedYear || '情報なし'}</p>
            <p><strong>従業員数:</strong> ${company.employees || '情報なし'}</p>
            <p><strong>評価:</strong> 
              <span class="wizard__company-rating">
                ${'★'.repeat(company.rating || 3)}${'☆'.repeat(5 - (company.rating || 3))}
              </span>
            </p>
            <p><strong>対応エリア:</strong> ${company.areas?.join(', ') || '情報なし'}</p>
            <p><strong>特徴:</strong> ${company.features?.join(', ') || '情報なし'}</p>
            <p><strong>保証:</strong> ${company.warranty || '情報なし'}</p>
          </div>
        </div>
        <div class="wizard__company-description">
          <h4>会社概要</h4>
          <p>${company.description || '情報がありません'}</p>
        </div>
        <div class="wizard__company-works">
          <h4>施工事例</h4>
          <div class="wizard__company-works-grid">
            ${(company.works || []).map(work => `
              <div class="wizard__company-work">
                <img src="${work.image || 'src/img/work-placeholder.jpg'}" alt="施工事例">
                <p>${work.description || '詳細情報なし'}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="wizard__modal-footer">
        <button class="wizard__company-contact-button" data-company-id="${company.id}">この業者に無料見積もり依頼する</button>
      </div>
    </div>
  `;
  
  // モーダルをドキュメントに追加
  document.body.appendChild(modalElement);
  
  // スクロール防止
  document.body.style.overflow = 'hidden';
  
  // 閉じるボタンのイベント
  const closeButton = modalElement.querySelector('.wizard__modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalElement);
      document.body.style.overflow = '';
    });
  }
  
  // モーダル外クリックで閉じる
  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) {
      document.body.removeChild(modalElement);
      document.body.style.overflow = '';
    }
  });
  
  // 無料見積もりボタンのイベント
  const contactButton = modalElement.querySelector('.wizard__company-contact-button');
  if (contactButton) {
    contactButton.addEventListener('click', () => {
      document.body.removeChild(modalElement);
      document.body.style.overflow = '';
      showContactForm(companyId, companies);
    });
  }
}

/**
 * 見積もり依頼フォームを表示します
 * @param {string} companyId - 業者ID
 * @param {Array} companies - 業者データの配列
 */
function showContactForm(companyId, companies) {
  const company = companies.find(c => c.id === companyId);
  if (!company) return;
  
  // モーダル要素を作成
  const modalElement = document.createElement('div');
  modalElement.className = 'wizard__modal';
  modalElement.innerHTML = `
    <div class="wizard__modal-content">
      <div class="wizard__modal-header">
        <h3>${company.name}に見積もり依頼</h3>
        <button class="wizard__modal-close">&times;</button>
      </div>
      <div class="wizard__modal-body">
        <form id="contactForm" class="wizard__contact-form">
          <input type="hidden" name="companyId" value="${company.id}">
          <input type="hidden" name="postalCode" value="${wizardData.postalCode}">
          
          <div class="wizard__form-group">
            <label for="contactName">お名前 <span class="wizard__required">*</span></label>
            <input type="text" id="contactName" name="name" required>
          </div>
          
          <div class="wizard__form-group">
            <label for="contactEmail">メールアドレス <span class="wizard__required">*</span></label>
            <input type="email" id="contactEmail" name="email" required>
          </div>
          
          <div class="wizard__form-group">
            <label for="contactPhone">電話番号 <span class="wizard__required">*</span></label>
            <input type="tel" id="contactPhone" name="phone" required>
          </div>
          
          <div class="wizard__form-group">
            <label for="contactAddress">住所 <span class="wizard__required">*</span></label>
            <input type="text" id="contactAddress" name="address" required>
          </div>
          
          <div class="wizard__form-group">
            <label for="contactMessage">ご要望・相談内容</label>
            <textarea id="contactMessage" name="message" rows="4"></textarea>
          </div>
          
          <div class="wizard__form-group">
            <label class="wizard__checkbox-label">
              <input type="checkbox" name="agreement" required>
              <span class="wizard__checkbox-text">個人情報の取り扱いについて同意します</span>
            </label>
          </div>
          
          <div class="wizard__form-error hidden"></div>
        </form>
      </div>
      <div class="wizard__modal-footer">
        <button type="submit" form="contactForm" class="wizard__submit-button">送信する</button>
      </div>
    </div>
  `;
  
  // モーダルをドキュメントに追加
  document.body.appendChild(modalElement);
  
  // スクロール防止
  document.body.style.overflow = 'hidden';
  
  // 閉じるボタンのイベント
  const closeButton = modalElement.querySelector('.wizard__modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalElement);
      document.body.style.overflow = '';
    });
  }
  
  // モーダル外クリックで閉じる
  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) {
      document.body.removeChild(modalElement);
      document.body.style.overflow = '';
    }
  });
  
  // フォーム送信イベント
  const contactForm = modalElement.querySelector('#contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // 送信ボタンを無効化
      const submitButton = modalElement.querySelector('.wizard__submit-button');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '送信中...';
      }
      
      // フォームデータを取得
      const formData = new FormData(contactForm);
      const formDataObj = {};
      for (const [key, value] of formData.entries()) {
        formDataObj[key] = value;
      }
      
      // ウィザードデータも追加
      formDataObj.wizardData = wizardData;
      
      try {
        // API経由でデータを送信
        const result = await apiStub.submitQuoteRequest(formDataObj);
        
        // 成功メッセージを表示
        modalElement.querySelector('.wizard__modal-body').innerHTML = `
          <div class="wizard__success-message">
            <div class="wizard__success-icon">✓</div>
            <h3>送信完了</h3>
            <p>${result.message || '見積もり依頼を受け付けました。担当者からご連絡いたします。'}</p>
            <p>リクエストID: ${result.requestId || '-'}</p>
          </div>
        `;
        
        // フッターボタンを変更
        modalElement.querySelector('.wizard__modal-footer').innerHTML = `
          <button class="wizard__close-button">閉じる</button>
        `;
        
        // 閉じるボタンのイベント
        const closeButton = modalElement.querySelector('.wizard__close-button');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            document.body.removeChild(modalElement);
            document.body.style.overflow = '';
          });
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        
        // エラーメッセージを表示
        const errorElement = modalElement.querySelector('.wizard__form-error');
        if (errorElement) {
          errorElement.textContent = '送信中にエラーが発生しました。お手数ですが、再度お試しください。';
          errorElement.classList.remove('hidden');
        }
        
        // 送信ボタンを再有効化
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = '送信する';
        }
      }
    });
  }
}

/**
 * ウィザードデータを送信します
 */
async function submitWizardData() {
  // フォームデータのバリデーション
  if (!validateAllFields()) {
    return;
  }
  
  try {
    // 結果表示
    await showResults();
  } catch (error) {
    console.error('Error submitting wizard data:', error);
  }
}

/**
 * すべてのフィールドを検証します
 * @returns {boolean} 検証結果
 */
function validateAllFields() {
  // 必須フィールドをすべて検証
  return true; // 実装省略
}