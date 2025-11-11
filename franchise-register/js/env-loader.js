// Auto-synced: 2025-11-08T02:55:00.000Z - Deployment: AKfycbxMaj0EwqO8HczQOCH1xGNn2wTX3jn4OTU_3en76sIs1vpxYcafIwTHX1OSrUEfHGL97w
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
 * @file-version V1695-PAST-DATA-WARNING-2025-11-11T10:30:00
 * @last-update 2025-11-11T10:30:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- 過去データ警告表示 @1612
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwrJMptuK9tpTzopgv3E101brJI-7gvQrcgRN7vt5oVMkF_j6GKATHnbX1FPwMkwKwNVA/exec',

  // フォールバックGAS URL（バックアップ）- @1612
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbwrJMptuK9tpTzopgv3E101brJI-7gvQrcgRN7vt5oVMkF_j6GKATHnbX1FPwMkwKwNVA/exec',

  // 緊急時URL（最終フォールバック）- @1612
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbwrJMptuK9tpTzopgv3E101brJI-7gvQrcgRN7vt5oVMkF_j6GKATHnbX1FPwMkwKwNVA/exec',

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

  // キャッシュバスター（V1695 - 2025-11-11 10:30 - 過去データ警告表示）
  CACHE_BUSTER: '1762825800000'
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
