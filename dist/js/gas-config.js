/**
 * GAS設定管理（管理ダッシュボード用）
 * プロパティからWeb App URLを動的に取得
 */

// ブートストラップURL（プロパティ取得用・これは避けられない）
// GASを再デプロイした場合はここを更新
const CONFIG_PROVIDER_URL = 'https://script.google.com/macros/s/AKfycbwC4yGSEdGqR2LFFxBI0WIfhIMIFuvhSN5dSQsDBPZ0anDGQo-AzIj7yf1VoDjrsBTWiA/exec';

// キャッシュ用の変数
let gasWebAppUrl = null;
let configPromise = null;

/**
 * GAS Web App URLを取得（JSONP形式）
 * @returns {Promise<string>} Web App URL
 */
function getGasWebAppUrlJsonp() {
    return new Promise((resolve, reject) => {
        // 既にキャッシュがある場合はそれを返す
        if (gasWebAppUrl) {
            resolve(gasWebAppUrl);
            return;
        }

        const callbackName = 'gasConfigCallback_' + Date.now();

        window[callbackName] = function(data) {
            gasWebAppUrl = data.GAS_WEBAPP_URL;
            console.log('[GAS Config] Web App URL取得:', gasWebAppUrl);

            // クリーンアップ
            delete window[callbackName];
            document.head.removeChild(script);

            resolve(gasWebAppUrl);
        };

        const script = document.createElement('script');
        script.src = CONFIG_PROVIDER_URL + '?callback=' + callbackName;
        script.onerror = () => {
            console.error('[GAS Config] URL取得エラー');
            delete window[callbackName];
            document.head.removeChild(script);

            // フォールバック（CONFIG_PROVIDER_URLを使用）
            gasWebAppUrl = CONFIG_PROVIDER_URL;
            console.warn('[GAS Config] フォールバックURL使用');
            resolve(gasWebAppUrl);
        };

        document.head.appendChild(script);
    });
}

// エクスポート
window.GasConfig = {
    getUrlJsonp: getGasWebAppUrlJsonp
};