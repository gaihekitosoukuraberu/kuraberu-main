// Auto-synced: 2025-11-03T00:00:00.000Z - Deployment: AKfycbyYyvnqHXEZNSLu2NbbRSP4cRu46_9qD3QSoXMWF9qnzF3fKoVRHd_zYlXoFXuJgNUULQ
/**
 * 環境変数ローダー（全システム共通）- 🔥マスターファイル🔥
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 🔥 重要：CACHE_BUSTERを変更するだけで全JSファイルが更新されます 🔥
 * マスター場所：shared/env-loader.js
 *
 * 自動同期先（GitHub Actions）：
 * - franchise-dashboard/dist/merchant-portal/env-loader.js
 * - franchise-dashboard/dist/js/env-loader.js
 * - franchise-register/dist/js/env-loader.js
 * - admin-dashboard/dist/js/env-loader.js
 * - estimate-keep-system/dist/js/env-loader.js
 *
 * @file-version V1553-MAPS-FIX-2025-11-03T00:00:00
 * @last-update 2025-11-03T00:00:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1553 @1580: Google Maps APIキー修正（2025-11-03 00:00）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyYyvnqHXEZNSLu2NbbRSP4cRu46_9qD3QSoXMWF9qnzF3fKoVRHd_zYlXoFXuJgNUULQ/exec',

  // フォールバックGAS URL（バックアップ）- V1465: トップヒット2件版
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbzRqV7gMc7exteuOBwpESCZSm6VggDEwmagDIQxXIhI3QcGxj2DROKQfiKpC8297mmydw/exec',

  // 緊急時URL（最終フォールバック）- V1463: 3回検索版（旧安定版）
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbzRqV7gMc7exteuOBwpESCZSm6VggDEwmagDIQxXIhI3QcGxj2DROKQfiKpC8297mmydw/exec',

  // ============================================
  // 🔧 システム設定
  // ============================================

  // デバッグモード
  DEBUG: false,

  // タイムアウト設定
  TIMEOUT: 60000, // 60秒

  // リトライ設定
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒

  // キャッシュバスター（V1553 - 2025-11-03 00:00）
  CACHE_BUSTER: '1553_20251103_0000'
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
