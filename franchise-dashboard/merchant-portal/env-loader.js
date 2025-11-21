// Auto-synced: 2025-11-21T16:30:00.000Z - Deployment: AKfycbx8zH0Af6u0BkbPgxTSqg3eG7O24Wnev3kr1ro8nsGsl7Nkajls4JIf6gRFdd82v4no1Q
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
 * @file-version V1842-REDEPLOY-2025-11-21T16:30:00
 * @last-update 2025-11-21T16:30:00
 */

const ENV = {
  // ============================================
  // URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1842 再デプロイ（V1840支払遅延FALSE + V1841完全同期）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbx8zH0Af6u0BkbPgxTSqg3eG7O24Wnev3kr1ro8nsGsl7Nkajls4JIf6gRFdd82v4no1Q/exec',

  // フォールバックGAS URL（バックアップ）- V1842
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbx8zH0Af6u0BkbPgxTSqg3eG7O24Wnev3kr1ro8nsGsl7Nkajls4JIf6gRFdd82v4no1Q/exec',

  // 緊急時URL（最終フォールバック）- V1842
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbx8zH0Af6u0BkbPgxTSqg3eG7O24Wnev3kr1ro8nsGsl7Nkajls4JIf6gRFdd82v4no1Q/exec',

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

  // キャッシュバスター（V1842 - 2025-11-21 - GAS再デプロイ V1840+V1841）
  CACHE_BUSTER: '1732197000000'
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
