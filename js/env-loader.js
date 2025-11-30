// Auto-synced: 2025-11-30T12:21:29.844Z - Deployment: AKfycbz8nId5T1iqrn4GyBUDx-XP2ffVvIPvgXmsPnKAdmSJXXUcoCV1IW1Ea18PnaTjTGxK
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
 * @file-version V1862-MASTER-@HEAD-2025-11-26T03:10:40
 * @last-update 2025-11-26T03:10:40
 */

const ENV = {
  // ============================================
  // 🎯 URL設定（完全一元管理）
  // ============================================

  // プライマリGAS URL（メイン運用）- V1997 最新デプロイメント
  GAS_URL: 'https://script.google.com/macros/s/AKfycbz8nId5T1iqrn4GyBUDx-XP2ffVvIPvgXmsPnKAdmSJXXUcoCV1IW1Ea18PnaTjTGxK/exec',

  // フォールバックGAS URL（バックアップ）- V1997 最新デプロイメント
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/AKfycbz8nId5T1iqrn4GyBUDx-XP2ffVvIPvgXmsPnKAdmSJXXUcoCV1IW1Ea18PnaTjTGxK/exec',

  // 緊急時URL（最終フォールバック）- V1997 最新デプロイメント
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/AKfycbz8nId5T1iqrn4GyBUDx-XP2ffVvIPvgXmsPnKAdmSJXXUcoCV1IW1Ea18PnaTjTGxK/exec',

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

  // キャッシュバスター（V1997 - 配信管理シート空行対策・日時フォーマット修正）
  CACHE_BUSTER: 'v1764512437-fed3ce39'
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
