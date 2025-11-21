// Auto-synced: 2025-11-21T06:41:59.040Z - Deployment: AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg
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

  // プライマリGAS URL（メイン運用）- @1715 最新デプロイ
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // フォールバックGAS URL（バックアップ）- @1715
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // 緊急時URL（最終フォールバック）- @1715
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

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

  // キャッシュバスター（V1831 - 2025-11-20 - デプロイ確認）
  CACHE_BUSTER: Date.now().toString()
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
