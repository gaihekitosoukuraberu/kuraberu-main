// Auto-synced: 2025-11-18T01:37:48.955Z - Deployment: AKfycbzSymyPnl_wTagTs_dIzdbtB1XnvyI389_yv3BLxXcF4vGFSvUHt3QLq4gUHOuwGpEsaA
/**
 * 環境変数ローダー（全システム共通）
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 🔥 重要：GASデプロイ時に自動的に最新URLに更新されます 🔥
 *
 * 自動同期先（GitHub Actions - gas-cicd.yml）：
 * - admin-dashboard/js/env-loader.js
 * - franchise-register/js/env-loader.js
 * - franchise-dashboard/merchant-portal/env-loader.js
 * - estimate-keep-system/js/env-loader.js
 * - lp/js/env-loader.js
 *
 * @file-version V1816
 * @last-update 2025-11-17T22:22:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1816: 最新デプロイ - @HEAD 常に最新版
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzSymyPnl_wTagTs_dIzdbtB1XnvyI389_yv3BLxXcF4vGFSvUHt3QLq4gUHOuwGpEsaA/exec',

  // フォールバックGAS URL（バックアップ）- @1660
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbzSymyPnl_wTagTs_dIzdbtB1XnvyI389_yv3BLxXcF4vGFSvUHt3QLq4gUHOuwGpEsaA/exec',

  // 緊急時URL（最終フォールバック）- @1633
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbzSymyPnl_wTagTs_dIzdbtB1XnvyI389_yv3BLxXcF4vGFSvUHt3QLq4gUHOuwGpEsaA/exec',

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

  // キャッシュバスター（V1818 - 2025-11-18 - iPhone修正版）
  CACHE_BUSTER: '1763429868956'
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
