/**
 * デバウンス関数
 * 短時間内の連続した関数呼び出しを制御し、最後の呼び出しのみを実行する
 * 
 * @param {Function} func - 実行する関数
 * @param {number} delay - 遅延時間（ミリ秒）
 * @returns {Function} デバウンス化された関数
 */
export function debounce(func, delay = 300) {
  let timeoutId
  
  return function debounced(...args) {
    // 前回のタイマーをクリア
    clearTimeout(timeoutId)
    
    // 新しいタイマーを設定
    timeoutId = setTimeout(() => {
      func.apply(this, args)
    }, delay)
  }
}

/**
 * スロットル関数
 * 指定された間隔でのみ関数を実行する
 * 
 * @param {Function} func - 実行する関数
 * @param {number} interval - 実行間隔（ミリ秒）
 * @returns {Function} スロットル化された関数
 */
export function throttle(func, interval = 300) {
  let lastExecuted = 0
  
  return function throttled(...args) {
    const now = Date.now()
    
    if (now - lastExecuted >= interval) {
      lastExecuted = now
      func.apply(this, args)
    }
  }
}

/**
 * 即座に実行されるデバウンス関数
 * 最初の呼び出しは即座に実行し、その後のデバウンスを適用
 * 
 * @param {Function} func - 実行する関数
 * @param {number} delay - 遅延時間（ミリ秒）
 * @returns {Function} 即座実行デバウンス化された関数
 */
export function debounceImmediate(func, delay = 300) {
  let timeoutId
  let callNow = true
  
  return function debounced(...args) {
    const later = () => {
      timeoutId = null
      callNow = true
    }
    
    if (callNow) {
      func.apply(this, args)
      callNow = false
    }
    
    clearTimeout(timeoutId)
    timeoutId = setTimeout(later, delay)
  }
}