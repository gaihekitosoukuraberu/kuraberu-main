/**
 * 環境変数ローダー（全システム共通・一元管理）
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 🔥 重要：このファイル1つだけを編集すれば全システムが更新される
 * 🚫 個別のenv-loader.jsファイルは編集しない
 */

const ENV = {
  // GAS デプロイメントURL（これ1箇所だけで管理）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyv-cB71ew3WmWz3XkMI9iH57T97QsiqlCR2k1D15hgKMAB--6ydaK_mDrmXiCqtH_fKA/exec',

  // フランチャイズダッシュボードのindex.html（AI検索用）
  INDEX_URL: 'https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/index.html',

  // デバッグモード
  DEBUG: true,

  // タイムアウト設定
  TIMEOUT: 60000, // 60秒

  // リトライ設定
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒

  // キャッシュバスター（🔥一箇所管理🔥）
  CACHE_BUSTER: '2025-10-22T02:30:00-V1358-STATS-ERROR-FIX-COMPLETE'
};

// グローバルに公開（全てのファイルから参照可能）
window.ENV = ENV;

// ロードログ（重要）
console.log('[ENV] 🔥共有環境変数ロード完了🔥:', {
  GAS_URL: ENV.GAS_URL,
  DEBUG: ENV.DEBUG,
  CACHE_BUSTER: ENV.CACHE_BUSTER,
  source: 'shared/env-loader.js'
});

// URLが正しく設定されているかチェック
if (!ENV.GAS_URL || !ENV.GAS_URL.startsWith('https://')) {
  console.error('[ENV] ERROR: GAS_URLが正しく設定されていません');
  alert('システムエラー: 設定が正しくありません。管理者に連絡してください。');
}

// キャッシュバスター動的生成機能（オプション）
ENV.generateCacheBuster = () => {
  const now = new Date();
  const timestamp = now.toISOString().split('.')[0];
  return `${timestamp}-AUTO-GENERATED`;
};

// 開発者向けデバッグ情報
if (ENV.DEBUG) {
  console.log('[ENV] 🛠️ デバッグ情報:', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 50) + '...',
    location: window.location.href
  });
}