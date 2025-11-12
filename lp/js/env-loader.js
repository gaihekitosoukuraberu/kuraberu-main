// Auto-synced: 2025-11-12T19:50:00.000Z - Deployment: AKfycbz1kCTy9TqqKCvDN0BK0mevkMqCnarIyMksnznQF5HXPMSfrfohxtQr0BPpnFMJvEUSWQ
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
 * @file-version V1713-FIX-CONFIG-BUG-2025-11-12T19:45:00
 * @last-update 2025-11-12T19:45:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // GAS URL（V1713-DEBUG: Column index validation @1624）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbz1kCTy9TqqKCvDN0BK0mevkMqCnarIyMksnznQF5HXPMSfrfohxtQr0BPpnFMJvEUSWQ/exec',

  // フォールバックGAS URL（バックアップ）- @1624
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbz1kCTy9TqqKCvDN0BK0mevkMqCnarIyMksnznQF5HXPMSfrfohxtQr0BPpnFMJvEUSWQ/exec',

  // 緊急時URL（最終フォールバック）- @1624
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbz1kCTy9TqqKCvDN0BK0mevkMqCnarIyMksnznQF5HXPMSfrfohxtQr0BPpnFMJvEUSWQ/exec',

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

  // キャッシュバスター（V1713-DEBUG - 2025-11-12 19:50 - Column validation @1624）
  CACHE_BUSTER: '1762922689259'
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
