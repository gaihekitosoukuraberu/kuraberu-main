/**
 * 外壁塗装くらべる - UI ヘルパー関数
 * 
 * このモジュールはUIに関する共通のヘルパー関数を提供します。
 */

/**
 * 固定フッターボタンを表示する
 * ウィザード完了時に呼び出される
 */
export function showFixedButtons() {
  // テンプレートからボタンを複製
  const template = document.getElementById('footer-buttons-template');
  if (template) {
    const footerButtons = template.content.cloneNode(true);
    document.body.appendChild(footerButtons);
    
    // ボタンを表示（少し遅延させてアニメーション効果を出す）
    setTimeout(() => {
      const buttonsContainer = document.querySelector('.fixed-buttons');
      if (buttonsContainer) {
        buttonsContainer.classList.add('visible');
      }
    }, 100);
  }
}

/**
 * 要素を表示する（フェードイン効果付き）
 * @param {HTMLElement} element - 表示する要素
 */
export function showElement(element) {
  if (element) {
    element.classList.remove('hidden');
    element.classList.add('fade-in');
  }
}

/**
 * 要素を非表示にする（フェードアウト効果付き）
 * @param {HTMLElement} element - 非表示にする要素
 */
export function hideElement(element) {
  if (element) {
    element.classList.add('fade-out');
    // アニメーション完了後に非表示
    setTimeout(() => {
      element.classList.add('hidden');
      element.classList.remove('fade-out');
    }, 300);
  }
}

/**
 * 指定した要素までスクロールする
 * @param {HTMLElement} element - スクロール先の要素
 * @param {Object} options - スクロールオプション
 */
export function scrollToElement(element, options = { behavior: 'smooth' }) {
  if (element) {
    element.scrollIntoView(options);
  }
}