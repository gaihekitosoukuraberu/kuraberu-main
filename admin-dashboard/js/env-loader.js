// Auto-synced: 2025-11-13T00:00:00.000Z - Deployment: AKfycbwZUVAvM6NPTvFpozEvY6Hm7xy4XmvLFYwLcqbxCm92sjalOjajNhIjJROYd25IcTrrww
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
 * @file-version V1748-CV-FETCH-MAPPING-FIX-2025-11-15T18:00:00
 * @last-update 2025-11-15T18:00:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1750: RankingSystem追加 - @HEAD 常に最新版
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj/exec',

  // フォールバックGAS URL（バックアップ）- @1660
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbzUu1nHQ6J1vHD-DuuZ4eClkPj5K1YfHnMB3nr9qIY50bvJn75jTVYkCQSerkfk5lNArg/exec',

  // 緊急時URL（最終フォールバック）- @1633
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbwq1BZnulofjYn2tSm3Sd80YDylEABSzyIDNbRlBeGwEYo7ZbALHqXqaHeB1ghBc-wS/exec',

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

  // キャッシュバスター（V1754 - 2025-11-15 - Slack通知＆ハートビート監視システム）
  CACHE_BUSTER: '1763252000000'
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
