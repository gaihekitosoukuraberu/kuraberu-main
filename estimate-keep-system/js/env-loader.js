// Auto-synced: 2025-11-08T02:55:00.000Z - Deployment: AKfycbyyPTMmaNv5euO7QaYFz-IZMQVxL4_Mh0g2YlL8NlFplya78UpoPHvyeygj7CDU5j3_hQ
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
 * @file-version V1603-LP-CONTACT-2025-11-08T02:55:00
 * @last-update 2025-11-08T02:55:00
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1754: 審査中マッピング修正 + 申請取り消しボタン
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwlTB8M9fvOM4H8SFvGklkUFNWkH9W7YjRd2lZDE6Ep8Kfd2uFx-ZQX__9NnGsqMuEn-Q/exec',

  // フォールバックGAS URL（バックアップ）- @1603
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbyyPTMmaNv5euO7QaYFz-IZMQVxL4_Mh0g2YlL8NlFplya78UpoPHvyeygj7CDU5j3_hQ/exec',

  // 緊急時URL（最終フォールバック）- @1603
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbyyPTMmaNv5euO7QaYFz-IZMQVxL4_Mh0g2YlL8NlFplya78UpoPHvyeygj7CDU5j3_hQ/exec',

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

  // キャッシュバスター（V1603 - 2025-11-08 11:55 - LP問い合わせフォーム統合完了）
  CACHE_BUSTER: '1763194157000'
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
