/**
 * ====================================
 * 【V2156で廃止】加盟店 キャンセル期限延長申請システム
 * ====================================
 *
 * ⚠️ このファイルは廃止されました（2025-12-10）
 * ⚠️ 理由: 架電履歴・メモ履歴でアポ状況が確認できるため、事前申請は不要と判断
 * ⚠️ main.jsのルーティングからも削除済み
 *
 * 【旧機能】
 * - 期限延長申請可能案件一覧取得
 * - 期限延長申請登録
 * - 申請期限チェック（配信日+7日以内）
 * - 延長後期限自動計算（配信日の翌月末）
 */

// V2156: 全関数を無効化（万が一呼び出されてもエラーを返す）
var MerchantDeadlineExtension = {
  getExtensionEligibleCases: function(params) {
    console.log('[MerchantDeadlineExtension] この機能は廃止されました（V2156）');
    return {
      success: false,
      error: 'この機能は廃止されました（V2156）。架電履歴で状況確認できるため、期限延長申請は不要です。',
      cases: []
    };
  },

  submitExtensionRequest: function(params) {
    console.log('[MerchantDeadlineExtension] この機能は廃止されました（V2156）');
    return {
      success: false,
      error: 'この機能は廃止されました（V2156）。架電履歴で状況確認できるため、期限延長申請は不要です。'
    };
  },

  // 後方互換用のハンドラ
  handleAction: function(action, params) {
    console.log('[MerchantDeadlineExtension] 廃止済み機能が呼び出されました:', action);
    return {
      success: false,
      error: 'この機能は廃止されました（V2156）。'
    };
  }
};
