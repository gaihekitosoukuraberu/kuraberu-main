/**
 * 環境変数ローダー（全システム共通）- 🔥マスターファイル🔥
 * .envファイルの代わりにJavaScriptで定数管理
 *
 * 🔥 重要：このファイルを編集すると全システムに自動反映されます 🔥
 * マスター場所：shared/env-loader.js
 *
 * 自動同期先（GitHub Actions）：
 * - franchise-dashboard/dist/merchant-portal/env-loader.js
 * - franchise-dashboard/dist/js/env-loader.js
 * - franchise-register/dist/js/env-loader.js
 * - admin-dashboard/dist/js/env-loader.js
 * - estimate-keep-system/dist/js/env-loader.js
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1470: 完全修正版 - 新DriveフォルダID適用
  GAS_URL: 'https://script.google.com/macros/s/AKfycbx-4ciHOeL5XqDIA9OC1qbq7gyh14ZMLQBY0VCIdmaYnnpzkAUzJW4LGtyxPV-OPTYDcA/exec',

  // フォールバックGAS URL（バックアップ）
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbwVDOQU-OAFsQJ1Az6HCm7qQT7KRcXFZAZKJNzK7vs05qJA_e8G4gTC8yaioUPa6S-1aw/exec',

  // 緊急時URL（最終フォールバック・env-loader.js障害時用）
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbwVDOQU-OAFsQJ1Az6HCm7qQT7KRcXFZAZKJNzK7vs05qJA_e8G4gTC8yaioUPa6S-1aw/exec',

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

  // キャッシュバスター（🔥一箇所管理🔥）
  CACHE_BUSTER: '2025-10-31T08:00:00-MERCHANT-PORTAL-V1470-DRIVE-FIX'
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