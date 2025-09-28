/**
 * ローディングアニメーションモジュール
 * 読み込み表示とトースト通知を担当します
 */

/**
 * ローディング表示
 * 要素をローディングプレースホルダーに置き換えます
 * 
 * @param {HTMLElement} element - ローディングを表示する要素
 * @returns {string} - 元のHTML内容
 */
export async function showLoading(element) {
  const originalContent = element.innerHTML;
  
  // ローディングプレースホルダーを表示
  element.classList.remove('hidden');
  element.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">データを取得中...</p>
    </div>
  `;
  
  // 少し遅延させてローディング表示を見せる
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return originalContent;
}

/**
 * トーストメッセージ表示
 * @param {string} message - 表示するメッセージ
 * @param {string} type - メッセージタイプ（'success', 'error', 'info'）
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // 一定時間後に削除
  setTimeout(() => {
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
    
    toast.style.opacity = '0';
  }, 3000);
}

/**
 * 相場表示の更新
 * 取得したデータで相場表示エリアを更新します
 * 
 * @param {Object} data - 相場データ
 */
export function updatePriceEstimate(data) {
  const priceEstimate = document.getElementById('price-estimate');
  if (!priceEstimate) return;
  
  // 表示を更新
  priceEstimate.classList.remove('hidden');
  
  // 各要素を更新
  document.getElementById('result-zipCode').textContent = data.zipCode;
  document.getElementById('result-prefecture').textContent = data.prefecture;
  document.getElementById('result-city').textContent = data.city;
  
  document.getElementById('result-minPrice').textContent = 
    new Intl.NumberFormat('ja-JP').format(data.priceEstimate.minPrice) + '円';
  document.getElementById('result-maxPrice').textContent = 
    new Intl.NumberFormat('ja-JP').format(data.priceEstimate.maxPrice) + '円';
  document.getElementById('result-avgPrice').textContent = 
    new Intl.NumberFormat('ja-JP').format(data.priceEstimate.avgPrice) + '円';
  
  if (data.priceEstimate.note) {
    document.getElementById('result-note').textContent = data.priceEstimate.note;
  }
  
  // スクロール
  priceEstimate.scrollIntoView({ behavior: 'smooth', block: 'start' });
}