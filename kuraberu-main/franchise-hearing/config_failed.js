/**
 * 外壁塗装くらべるAI - シンプル設定（Safari最適化）
 */

// 基本設定
const FRANCHISE_CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycby7srqJCwzbzEvQBKyGD4fqXxb0bN29jkttt9UACW3qFB62BEZ4PXiElTNJ-uYx-kE32g/exec',
    API_TIMEOUT: 30000,
    DEBUG_MODE: true
};

/**
 * シンプルなJSONP API呼び出し（Safari専用）
 */
async function callFranchiseAPI(action, parameters) {
    console.log('🔗 シンプルAPI呼び出し:', action);
    
    return await new Promise((resolve, reject) => {
        const callback = 'cb_' + Date.now();
        const data = { action, ...parameters };
        
        window[callback] = function(result) {
            delete window[callback];
            if (result && result.success === false) {
                reject(new Error(result.message || 'API Error'));
            } else {
                resolve(result);
            }
        };
        
        const script = document.createElement('script');
        script.src = FRANCHISE_CONFIG.API_URL + '?callback=' + callback + '&data=' + encodeURIComponent(JSON.stringify(data));
        script.onerror = () => {
            delete window[callback];
            reject(new Error('通信エラー'));
        };
        
        document.head.appendChild(script);
        
        setTimeout(() => {
            if (window[callback]) {
                delete window[callback];
                reject(new Error('タイムアウト'));
            }
        }, FRANCHISE_CONFIG.API_TIMEOUT);
    });
}

console.log('✅ シンプル設定読み込み完了');