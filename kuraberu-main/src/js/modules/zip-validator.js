/**
 * 外壁塗装くらべる - 郵便番号バリデーター
 * 
 * このモジュールは郵便番号の入力、検証、フォーマットに関する機能を提供します。
 */

/**
 * 郵便番号のバリデーション
 * @param {string} zip - バリデーション対象の郵便番号
 * @returns {boolean} - 有効な郵便番号ならtrue
 */
export function validateZipCode(zip) {
  // ハイフンを除去して7桁の数字かをチェック
  return /^\d{7}$/.test(zip.replace(/[^\d]/g, ''));
}

/**
 * 郵便番号の入力中にハイフンを自動挿入
 * @param {Event} e - 入力イベント
 */
export function formatZipCode(e) {
  const value = e.target.value.replace(/[^\d]/g, '');
  if (value.length > 3) {
    e.target.value = value.slice(0, 3) + '-' + value.slice(3, 7);
  } else {
    e.target.value = value;
  }
}

/**
 * 郵便番号を正規化する（ハイフンの有無を統一）
 * @param {string} zip - 正規化する郵便番号
 * @param {boolean} withHyphen - ハイフンを含めるかどうか
 * @returns {string} - 正規化された郵便番号
 */
export function normalizeZipCode(zip, withHyphen = true) {
  // 数字以外を除去
  const digitsOnly = zip.replace(/[^\d]/g, '');
  
  // ハイフンを含める場合は3桁目と4桁目の間にハイフンを挿入
  if (withHyphen && digitsOnly.length >= 4) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  }
  
  return digitsOnly;
}

/**
 * 郵便番号フォームのイベントリスナーを設定
 * @param {Function} submitCallback - フォーム送信時のコールバック関数
 */
export function setupZipFormListeners(submitCallback) {
  const zipForm = document.getElementById('zip-form');
  const zipInput = document.getElementById('zip-input');
  
  if (zipForm && zipInput) {
    // フォーム送信イベント
    zipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const zipCode = zipInput.value.replace(/[^\d]/g, '');
      
      // 郵便番号のバリデーション
      if (!validateZipCode(zipCode)) {
        alert('正しい郵便番号を入力してください（例：123-4567）');
        return;
      }
      
      // コールバック関数を呼び出し
      if (typeof submitCallback === 'function') {
        submitCallback(zipCode);
      }
    });
    
    // 入力時のフォーマット
    zipInput.addEventListener('input', formatZipCode);
  }
}