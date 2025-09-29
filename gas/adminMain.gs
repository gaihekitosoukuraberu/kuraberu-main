/**
 * 管理ダッシュボード用 GASメインファイル
 * このファイルはGASエディタに追加してください
 */

// ============================================
// 既存のmain.gsに追加する関数
// ============================================

/**
 * 管理ダッシュボード用ルーティング追加
 * router.gsのswitch文に以下のcaseを追加してください
 */
function getAdminRoutes() {
  return `
    // 管理ダッシュボード用のアクション
    case 'getRegistrationRequests':
      return handleGetRegistrationRequests(data.params || {});

    case 'approveRegistration':
      return handleApproveFromDashboard(data.registrationId, data.approver);

    case 'rejectRegistration':
      return handleRejectFromDashboard(data.registrationId, data.reason, data.rejector);
  `;
}

// ============================================
// 必要な設定値
// ============================================

/**
 * GASプロパティに設定が必要な項目
 * 設定方法: プロジェクトの設定 → スクリプトプロパティ
 */
const REQUIRED_PROPERTIES = {
  SPREADSHEET_ID: 'スプレッドシートのID',
  SLACK_WEBHOOK_URL: 'SlackのWebhook URL',
  DRIVE_ROOT_FOLDER_ID: 'Google DriveのルートフォルダID（オプション）'
};

// ============================================
// インストール手順
// ============================================

/**
 * セットアップ手順
 *
 * 1. GASエディタで新規ファイル作成
 *    - adminDashboardHandler.gs という名前でファイル作成
 *    - このフォルダ内のadminDashboardHandler.gsの内容をコピペ
 *
 * 2. router.gsを更新
 *    - routePostRequest関数のswitch文に上記のgetAdminRoutes()の内容を追加
 *
 * 3. プロパティを設定
 *    - プロジェクトの設定 → スクリプトプロパティ
 *    - 上記のREQUIRED_PROPERTIESの項目を設定
 *
 * 4. デプロイ
 *    - デプロイ → 新しいデプロイ
 *    - 種類: ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 *
 * 5. URLを取得
 *    - デプロイ後に表示されるURLをコピー
 *    - dist/js/dashboard-api.jsのGAS_API_URLを更新
 */