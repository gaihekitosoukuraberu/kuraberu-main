// Auto-synced: 2025-11-08T09:55:20.000Z - Deployment: AKfycbxMaj0EwqO8HczQOCH1xGNn2wTX3jn4OTU_3en76sIs1vpxYcafIwTHX1OSrUEfHGL97w
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
 * @file-version V1611-FOOTER-2025-11-08T09:55:20
 * @last-update 2025-11-08T09:55:20
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- 加盟店マスタ対応版 @1610
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzUgYiBWX9mr-M6nF3WfxNOE0NNIl80cbi5pWNw3eny2O_S85uLY5jymQdFOoqtaG3IoQ/exec',

  // フォールバックGAS URL（バックアップ）- @1610
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbzUgYiBWX9mr-M6nF3WfxNOE0NNIl80cbi5pWNw3eny2O_S85uLY5jymQdFOoqtaG3IoQ/exec',

  // 緊急時URL（最終フォールバック）- @1610
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbzUgYiBWX9mr-M6nF3WfxNOE0NNIl80cbi5pWNw3eny2O_S85uLY5jymQdFOoqtaG3IoQ/exec',

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

  // キャッシュバスター（V1693 - 2025-11-11 09:40 - デバッグログ削除）
  CACHE_BUSTER: '1762822402758'
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
