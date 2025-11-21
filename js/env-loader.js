// Auto-synced: 2025-11-21T10:09:54.502Z - Deployment: AKfycbyd4UlBN4wocmP5Go-umYOP9qfVSa-PIxD-3g56FF2dlVOVwm2U55ePsUC63WpJLbQK9g
/**
 * 🔥 環境変数ローダー - マスターファイル（全システム共通） 🔥
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 📍 このファイルが唯一のソース（Single Source of Truth）
 * 📍 場所: /js/env-loader.js
 *
 * 参照方法（HTML）:
 * <script src="/js/env-loader.js"></script>
 *
 * 参照方法（PHP）:
 * このファイルを読み込んでGAS_URLを抽出
 *
 * @file-version V1843-MASTER-SINGLE-SOURCE-2025-11-21T16:50:00
 * @last-update 2025-11-21T16:50:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1843（支払遅延FALSE + 配信ステータス完全同期 + mail.php対応）
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyd4UlBN4wocmP5Go-umYOP9qfVSa-PIxD-3g56FF2dlVOVwm2U55ePsUC63WpJLbQK9g/exec',

  // フォールバックGAS URL（バックアップ）- V1843
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbyd4UlBN4wocmP5Go-umYOP9qfVSa-PIxD-3g56FF2dlVOVwm2U55ePsUC63WpJLbQK9g/exec',

  // 緊急時URL（最終フォールバック）- V1843
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbyd4UlBN4wocmP5Go-umYOP9qfVSa-PIxD-3g56FF2dlVOVwm2U55ePsUC63WpJLbQK9g/exec',

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

  // キャッシュバスター（V1843 - 2025-11-21 - 動的参照対応）
  CACHE_BUSTER: '1763719794502'
};

// グローバルに公開（全てのファイルから参照可能）
if (typeof window !== 'undefined') {
  window.ENV = ENV;

  // デバッグログ（常に表示）
  console.log('[ENV] 環境変数ロード完了 (Master):', {
    GAS_URL: ENV.GAS_URL,
    DEBUG: ENV.DEBUG,
    source: '/js/env-loader.js'
  });

  // URLが正しく設定されているかチェック
  if (!ENV.GAS_URL || !ENV.GAS_URL.startsWith('https://')) {
    console.error('[ENV] ERROR: GAS_URLが正しく設定されていません');
    alert('システムエラー: 設定が正しくありません。管理者に連絡してください。');
  }
}

// Node.js環境用のエクスポート（PHP読み込み用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV;
}
