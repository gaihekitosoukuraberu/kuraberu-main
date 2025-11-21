// Auto-synced: 2025-11-21T06:11:25.858Z - Deployment: AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg
/**
 * 環境変数ローダー（全システム共通）- マスターファイル
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 重要：CACHE_BUSTERを変更するだけで全JSファイルが更新されます
 * マスター場所：shared/env-loader.js
 *
 * 自動同期先（GitHub Actions）：
 * - franchise-dashboard/dist/merchant-portal/env-loader.js
 * - franchise-dashboard/dist/js/env-loader.js
 * - franchise-register/dist/js/env-loader.js
 * - admin-dashboard/dist/js/env-loader.js
 * - estimate-keep-system/dist/js/env-loader.js
 *
 * @file-version V1752-DELIVERY-SHEET-2025-11-15T22:00:00
 * @last-update 2025-11-15T22:00:00
 */

const ENV = {
  // ============================================
  // URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- @1731 V1839 加盟店マスタ同期機能実装版
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // フォールバックGAS URL（バックアップ）- @1731
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // 緊急時URL（最終フォールバック）- @1731
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbxbG224ldBf6nbUGXt7EtNZ2JXTxZZyCUzhvX631W7zW7fg1BVjzZk6nuyOuN3fTVn5Bg/exec',

  // ============================================
  // システム設定
  // ============================================

  // デバッグモード
  DEBUG: false,

  // タイムアウト設定
  TIMEOUT: 60000, // 60秒

  // リトライ設定
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1秒

  // キャッシュバスター（V1839 - 2025-11-21 - 加盟店マスタ同期機能実装）
  CACHE_BUSTER: '1763705485858'
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
