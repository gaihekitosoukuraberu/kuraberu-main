/**
 * 外壁塗装くらべる - ローディングアニメーション
 * 
 * このモジュールはローディング表示に関する機能を提供します。
 */

/**
 * ローディングオーバーレイを表示する
 */
export function showLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
    simulateLoading();
  }
}

/**
 * ローディングオーバーレイを非表示にする
 */
export function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}

/**
 * ローディングアニメーションをシミュレートする
 * 3ステップのプログレスアニメーションを実行
 */
export function simulateLoading() {
  const progressBar = document.getElementById('progress-bar');
  const step1 = document.getElementById('loading-step1');
  const step2 = document.getElementById('loading-step2');
  const step3 = document.getElementById('loading-step3');
  
  // ステップ1: 30%
  setTimeout(() => {
    if (progressBar) progressBar.style.width = '30%';
    if (step1) step1.classList.add('active');
  }, 300);
  
  // ステップ2: 60%
  setTimeout(() => {
    if (progressBar) progressBar.style.width = '60%';
    if (step1) {
      step1.classList.remove('active');
      step1.classList.add('complete');
    }
    if (step2) step2.classList.add('active');
  }, 1200);
  
  // ステップ3: 100%
  setTimeout(() => {
    if (progressBar) progressBar.style.width = '100%';
    if (step2) {
      step2.classList.remove('active');
      step2.classList.add('complete');
    }
    if (step3) step3.classList.add('active');
  }, 2000);
  
  // 完了
  setTimeout(() => {
    if (step3) {
      step3.classList.remove('active');
      step3.classList.add('complete');
    }
  }, 2800);
}

/**
 * カスタムローディングメッセージでローディングを表示
 * @param {string} message - 表示するメッセージ
 * @param {number} duration - ローディング表示時間（ミリ秒）
 * @returns {Promise} - 指定時間後に解決するPromise
 */
export function showLoadingWithMessage(message, duration = 2000) {
  return new Promise((resolve) => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingTitle = document.querySelector('.loading__title');
    
    if (loadingOverlay && loadingTitle) {
      // メッセージを設定
      const originalMessage = loadingTitle.textContent;
      loadingTitle.textContent = message;
      
      // ローディングを表示
      loadingOverlay.classList.remove('hidden');
      simulateLoading();
      
      // 指定時間後に非表示にして解決
      setTimeout(() => {
        loadingOverlay.classList.add('hidden');
        loadingTitle.textContent = originalMessage; // 元のメッセージに戻す
        resolve();
      }, duration);
    } else {
      // 要素が見つからない場合はすぐに解決
      resolve();
    }
  });
}