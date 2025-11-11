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
 * @file-version V1700-SYSTEMROUTER-FIX-2025-11-12T01:45:00
 * @last-update 2025-11-12T01:45:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- SystemRouter修正 @1619
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxBLkqTP-DhinAMGID4OJZ3Jp-dMlwgiWQbKEuQoHxnLmf03Bdnaxjt_sa1rpQiXMGN8w/exec',

  // フォールバックGAS URL（バックアップ）- @1619
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxBLkqTP-DhinAMGID4OJZ3Jp-dMlwgiWQbKEuQoHxnLmf03Bdnaxjt_sa1rpQiXMGN8w/exec',

  // 緊急時URL（最終フォールバック）- @1619
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbxBLkqTP-DhinAMGID4OJZ3Jp-dMlwgiWQbKEuQoHxnLmf03Bdnaxjt_sa1rpQiXMGN8w/exec',

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

  // キャッシュバスター（V1700 - 2025-11-12 02:10 - SystemRouter修正 @1619デプロイ完了）
  CACHE_BUSTER: '1731347400000'
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
