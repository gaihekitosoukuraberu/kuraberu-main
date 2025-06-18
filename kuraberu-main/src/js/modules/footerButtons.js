/**
 * フッター固定ボタンモジュール
 * 
 * 画面下部に固定表示するCTAボタンを管理します。
 */

/**
 * フッター固定ボタンの初期化
 */
export function setupFooterButtons() {
  // ウィザードの状態を確認
  const wizard = document.getElementById('wizard');
  if (!wizard) return;
  
  // 固定ボタンを追加
  appendFixedButtons();
  
  // スクロールイベントを設定
  setupScrollEvents();
}

/**
 * 固定ボタンを追加する
 */
function appendFixedButtons() {
  // ウィザードが完了しているか確認
  const wizardComplete = isWizardComplete();
  
  // ウィザード完了時のみボタンを表示
  if (wizardComplete) {
    // 既存のボタンがあれば削除
    const existingButtons = document.querySelector('.footer-buttons');
    if (existingButtons) {
      existingButtons.remove();
    }
    
    // 新しいボタンを作成
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'footer-buttons';
    
    // ボタンのHTMLを設定
    buttonsContainer.innerHTML = `
      <div class="footer-buttons__container">
        <button class="footer-buttons__cta js-start-wizard">
          <svg xmlns="http://www.w3.org/2000/svg" class="footer-buttons__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span>無料で見積もりを依頼する</span>
        </button>
      </div>
    `;
    
    // bodyに追加
    document.body.appendChild(buttonsContainer);
    
    // イベントリスナーを設定
    const ctaButton = buttonsContainer.querySelector('.js-start-wizard');
    if (ctaButton) {
      ctaButton.addEventListener('click', (e) => {
        e.preventDefault();
        
        const wizardSection = document.getElementById('wizard');
        if (wizardSection) {
          wizardSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }
}

/**
 * ウィザードが完了しているかどうかを確認
 * @returns {boolean} 完了していればtrue
 */
function isWizardComplete() {
  // wizardResult要素が表示されているかどうかで完了状態を判定
  const wizardResult = document.getElementById('wizardResult');
  if (!wizardResult) return false;
  
  // hiddenクラスがなければ表示されている = 完了している
  return !wizardResult.classList.contains('hidden');
}

/**
 * スクロールイベントを設定
 */
function setupScrollEvents() {
  window.addEventListener('scroll', handleScroll);
}

/**
 * スクロール時の処理
 */
function handleScroll() {
  const footerButtons = document.querySelector('.footer-buttons');
  if (!footerButtons) return;
  
  // フッターが表示されているか
  const footer = document.querySelector('footer');
  if (!footer) return;
  
  const footerRect = footer.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  
  // フッターが画面内に入ったらボタンを非表示
  if (footerRect.top < windowHeight) {
    footerButtons.classList.add('footer-buttons--hidden');
  } else {
    footerButtons.classList.remove('footer-buttons--hidden');
  }
}

/**
 * ウィザードの完了状態が変わったときに呼び出す
 * @param {boolean} isComplete - ウィザードが完了したかどうか
 */
export function updateWizardCompletionState(isComplete) {
  // 状態を保存
  // localStorage.setItem('wizardComplete', isComplete);
  
  // ボタンの表示を更新
  appendFixedButtons();
}