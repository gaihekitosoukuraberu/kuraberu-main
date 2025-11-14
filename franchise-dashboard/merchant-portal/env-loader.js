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
 * @file-version V1703-HEADER-STATUS-CLICK-2025-11-12T05:30:00
 * @last-update 2025-11-12T05:30:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- キャンセル申請システム有効化 @1708
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxIzA24iyWU6a2a8O7AGhbxRwynQiAdtn19LDhzStICmxvrWkLn83q_rmwXluTrW7k-Xg/exec',

  // フォールバックGAS URL（バックアップ）- @1708
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbxIzA24iyWU6a2a8O7AGhbxRwynQiAdtn19LDhzStICmxvrWkLn83q_rmwXluTrW7k-Xg/exec',

  // 緊急時URL（最終フォールバック）- @1708
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbxIzA24iyWU6a2a8O7AGhbxRwynQiAdtn19LDhzStICmxvrWkLn83q_rmwXluTrW7k-Xg/exec',

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

  // キャッシュバスター（V1708 - 2025-11-14 03:10 - 最新コードプッシュ＆新デプロイ：302リダイレクト解決）
  CACHE_BUSTER: '1763127804788'
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
