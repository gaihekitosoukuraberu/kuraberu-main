// Auto-synced: 2025-11-21T06:33:44.914Z - Deployment: AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg
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
 * @file-version V1713-FIX-PHONE-2025-11-12T21:15:00
 * @last-update 2025-11-12T21:15:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // GAS URL - @1729 V1836（総合評価6項目平均 + メールリンクモーダル修正）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // フォールバックGAS URL（バックアップ）- @1729
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // 緊急時URL（最終フォールバック）- @1729
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

  // キャッシュバスター（V1837 - 2025-11-21 - ranking.js質問ID修正 - GAS @1729）
  CACHE_BUSTER: '1763706824914'
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
