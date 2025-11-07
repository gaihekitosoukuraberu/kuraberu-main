// Auto-synced: 2025-11-07T13:47:29.484Z - Deployment: AKfycbyW--2bwfkG3Acc_nfcwP0dFH_j2HYJcdUuRV9erJ3_hbIh2p28cDvrPFg2-ncWTti0NQ
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
 * @file-version V1553-MAPS-FIX-2025-11-03T00:00:00
 * @last-update 2025-11-03T00:00:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- CV対応版 @1593 (getRanking追加 + 完全パラメータマッピング修正)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyW--2bwfkG3Acc_nfcwP0dFH_j2HYJcdUuRV9erJ3_hbIh2p28cDvrPFg2-ncWTti0NQ/exec',

  // フォールバックGAS URL（バックアップ）- @1591
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbyW--2bwfkG3Acc_nfcwP0dFH_j2HYJcdUuRV9erJ3_hbIh2p28cDvrPFg2-ncWTti0NQ/exec',

  // 緊急時URL（最終フォールバック）- @1580
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbyW--2bwfkG3Acc_nfcwP0dFH_j2HYJcdUuRV9erJ3_hbIh2p28cDvrPFg2-ncWTti0NQ/exec',

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

  // キャッシュバスター（V1593 - 2025-11-07 16:30 - getRanking追加 + 全BOT質問マッピング修正完了）
  CACHE_BUSTER: '1762523249484'
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
