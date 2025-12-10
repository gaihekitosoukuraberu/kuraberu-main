// V2169: CORSエラー修正 - 最新デプロイURL
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
 * @file-version V2169-MASTER-2025-12-10
 * @last-update 2025-12-10
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V2170 @2147
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwQi539Xl5X1NL56Wye_3o03Xg7pTUAj6Y9vy5j3DPL6hMj3_nJRYFN4BgtwbRuyKix8A/exec',

  // フォールバックGAS URL（バックアップ）- V2170 @2147
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbwQi539Xl5X1NL56Wye_3o03Xg7pTUAj6Y9vy5j3DPL6hMj3_nJRYFN4BgtwbRuyKix8A/exec',

  // 緊急時URL（最終フォールバック）- V2170 @2147
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbwQi539Xl5X1NL56Wye_3o03Xg7pTUAj6Y9vy5j3DPL6hMj3_nJRYFN4BgtwbRuyKix8A/exec',

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

  // キャッシュバスター（V2169 - 強制更新）
  CACHE_BUSTER: 'v1765381157' + Date.now()
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
