/**
 * 環境変数ローダー（全システム共通）
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 重要：このファイルだけを編集すればURLが変更できる
 */

const ENV = {
  // GAS デプロイメントURL（これ1箇所だけで管理）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxBQ6WkuSnrmPHRqBqAyIwIC115T_W79GhCWADquPqsv6p34Oncnoxj91QQIUrCFETyZw/exec',

  // デバッグモード
  DEBUG: false,

  // タイムアウト設定
  TIMEOUT: 60000, // 60秒

  // リトライ設定
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒
};

// グローバルに公開（全てのファイルから参照可能）
window.ENV = ENV;

// デバッグログ（常に表示）
console.log('[ENV] 環境変数ロード完了:', {
  GAS_URL: ENV.GAS_URL,
  DEBUG: ENV.DEBUG
});

// URLが正しく設定されているかチェック
if (!ENV.GAS_URL || !ENV.GAS_URL.startsWith('https://')) {
  console.error('[ENV] ERROR: GAS_URLが正しく設定されていません');
  alert('システムエラー: 設定が正しくありません。管理者に連絡してください。');
}