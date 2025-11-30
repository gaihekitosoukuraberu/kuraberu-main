/**
 * ====================================
 * メインエントリーポイント
 * V2007: 一斉配信申込記録モード対応
 * ====================================
 *
 * 【重要ルール】
 * 1. doGet/doPostはこのファイルにのみ配置
 * 2. 各システムは完全独立（依存関係なし）
 * 3. エラーは必ずJSONP形式で返す
 * 4. HTMLは絶対に返さない
 * 5. 共通関数は極力最小限にする（main.jsに集約）
 *
 * 【V1927】 2025-11-27 18:00 - Admin Dashboard チェックボックスイベントハンドラー修正デプロイトリガー
 * - initializeCheckboxes()削除によるinline onchange動作保証
 * - チェック状態のソート順変更時の永続化修正
 * - GAS再デプロイにより最新環境でテスト可能に
 *
 * 【V1882】 2025-11-26 08:30 - Google Maps Distance Matrix API統合
 * - Admin Dashboard 業者選択「距離順」ソート対応
 * - DistanceCalculator.gs作成: calculateDistances アクション実装
 * - SystemRouterに calculateDistances アクション登録
 * - 自動車ルートベースの距離・所要時間計算
 * - APIキー: GOOGLE_MAPS_DISTANCE_KEY (Script Properties)
 *
 * 【V1872】 2025-11-26 16:10 - LPContactSystem住所解析強化 - 都道府県と市区町村を完全分離
 * - Yahoo API AddressElement分離 + property.Address正規表現解析
 * - AddressElementがある場合: 都道府県（O列）と市区町村（P列）に正しく分離
 * - AddressElementがない場合: property.Addressを正規表現で解析し、都道府県と市区町村に分離
 * - 正規表現: /^(北海道|東京都|京都府|大阪府|.+?[都道府県])(.*)/
 * - これにより必ず都道府県（O列）と市区町村（P列）に分離されることを保証
 *
 * 【V1871】 2025-11-26 16:00 - LPContactSystem住所取得フォールバック実装
 * - Yahoo API AddressElement分離 + property.Addressフォールバック
 * - AddressElementがある場合: 都道府県（O列）と市区町村（P列）に正しく分離
 * - AddressElementがない場合: property.Addressを都道府県（O列）に格納（V1870以前の互換動作）
 * - これにより最低限、住所が必ず表示されることを保証
 *
 * 【V1870】 2025-11-26 14:50 - LPContactSystem住所分離修正デプロイ
 * - V1864で修正済みのYahoo API住所分離ロジックを確実にデプロイ
 * - AddressElementから都道府県（O列）と市区町村（P列）を正しく分離
 * - プレビューHP問い合わせフォームの郵便番号 → 住所自動入力を修正
 *
 * 【V1869】 2025-11-26 13:36 - GitHub Actions自動デプロイ戦略変更（組織アカウント対応）
 * - clasp deploy --deploymentId（更新）から clasp deploy（新規作成）に変更
 * - 組織アカウントではWeb Appデプロイメント更新不可の制約を回避
 * - 新規デプロイメントIDを自動抽出してenv-loader.jsに反映
 * - 完全自動化により手動デプロイ不要に
 *
 * 【V1868】 2025-11-26 04:50 - GitHub Actions FTPデプロイ診断機能追加
 * - FTPログレベルをverboseに変更（minimal → verbose）
 * - 本番サーバーデプロイ検証を強化（404検出 + exit 1）
 * - デプロイ失敗時にワークフローを確実に停止
 *
 * 【V1867】 2025-11-26 04:35 - キャッシュバスター強化（文字列+タイムスタンプ）
 * - キャッシュバスターを v{timestamp}-{random} 形式に変更
 * - 数字だけだと弱いため、ランダム文字列を追加して確実にキャッシュ無効化
 *
 * 【V1866】 2025-11-26 04:30 - GitHub Actions強制デプロイ + キャッシュバスター自動更新強化
 * - FTPデプロイ確実に実行
 * - キャッシュバスター必ず最新に更新
 *
 * 【V1864】 2025-11-26 03:20 - Yahoo API住所分離修正
 * - AddressElementから都道府県と市区町村を正しく分離
 * - Level: 'prefecture' → 都道府県（物件）
 * - Level: 'city' → 市区町村（物件）
 *
 * 【V1863】 2025-11-26 03:15 - 固定URL＋キャッシュバスター自動更新運用
 * - デプロイメントURL固定（常に1個のみ）: AKfycbwaOsSudVqD8TViYymdbRmmbu6RS8k3NVfKbiswka-GHunJ4DtDTrFzHRw2AZ0OLzrkYA
 * - キャッシュバスターは毎回自動更新 - 必ず最新が反映される
 * - clasp deploy --deploymentId で既存Web App deployment自動更新
 *
 * 【V1862】 2025-11-26 03:11 - 全env-loader最新デプロイメントID同期
 * - 正しいデプロイメントID: AKfycbwaOsSudVqD8TViYymdbRmmbu6RS8k3NVfKbiswka-GHunJ4DtDTrFzHRw2AZ0OLzrkYA
 * - LPContactSystem 73列対応 (CVID生成, Yahoo API, 電話番号保持)
 * - GitHub Actions自動同期有効化
 *
 * 【V1854】 2025-11-26 02:30 - "Unknown CV action: undefined" 修正
 * - CVSheetSystem.handle: 引数名を e → params に変更
 * - main.jsから handler(e.parameter, null) で呼ばれるため、直接 params として受け取る
 * - LPでのCV1送信エラー解消
 *
 * 【V1853】 2025-11-26 02:05 - 評価データシート加盟店ID先頭構造に完全対応
 * - getEvaluationSheet: 既存シートでもフォーマット設定適用（K列日付化防止）
 * - getRatingsForCompany: 会社名検索を列0→列1に変更
 * - syncRatingsToMaster: 列インデックス修正（会社名=列1, 総合スコア=列5）
 * - K列（顧客満足度）が日付フォーマットになる問題を解決
 *
 * 【V1852】 2025-11-26 01:15 - "Unknown admin action: undefined" 修正
 * - main.js:574 - handler(e, null) → handler(e.parameter, null)
 * - AdminSystemがparams.actionを正しく受け取れるように修正
 * - CV一覧・登録申請リスト読み込みエラー解消
 *
 * 【V1842】 2025-11-26 01:06 - clasp push緊急回避 + FTPデプロイ
 * - admin-dashboard casesListBody エラー修正
 * - GitHub Actions: clasp pushエラー無視、FTPデプロイ優先
 *
 * 【V1841】 2025-11-21 15:09 - 配信ステータス完全同期実装
 * - ステータス変換ロジック削除、完全同期に変更
 *
 * 【V1843】 2025-11-21 16:45 - mail.php GAS URL更新
 * - 加盟店詳細ページからのフォーム送信でもスプシ反映＆Slack通知が来るように修正
 * - lp/mail.php の GAS URL を新デプロイメントIDに更新
 *
 * 【V1844】 2025-11-21 17:00 - env-loader動的参照対応
 * - マスターenv-loader.js作成（/js/env-loader.js）- 単一ソース化
 * - lp/mail.phpを動的参照に変更（ハードコード削除）
 * - GitHub Actions ワークフロー更新（sync-master-env-loader.js使用）
 *
 * 【V1845】 2025-11-21 17:30 - LP問い合わせフォーム処理追加
 * - LPContactSystem作成（lp_contact_submit アクション対応）
 * - ユーザー登録シートへの書き込み機能
 * - Slack通知機能実装
 * - thanks.htmlボタンリンク修正（/lp/へ遷移）
 */

/**
 * ====================================
 * システムルーター（API境界の明確化）
 * ====================================
 *
 * 【目的】
 * - どのアクションがどのシステムに属するかを一元管理
 * - システム間の境界を明確化
 * - 変更影響範囲を最小化
 *
 * 【追加方法】
 * 新しいアクションを追加する場合は、以下のルールに従う：
 * 1. 適切なシステムのactionsリストに追加
 * 2. 必要に応じてhandlePostメソッドを実装
 * 3. npm run check:impact main.js で影響範囲を確認
 */
const SystemRouter = {
  /**
   * アクション → システムのマッピング
   */
  routes: {
    // ヘルスチェック（共通）
    'health': {
      system: 'common',
      description: 'APIヘルスチェック'
    },

    // 加盟店登録システム
    'franchise_': {
      system: 'FranchiseSystem',
      description: '加盟店登録',
      prefix: true,
      actions: ['submitRegistration', 'registerFranchise']
    },

    // 加盟店システム（認証 + 会社情報管理）
    'merchant_': {
      system: 'MerchantSystem',
      description: '加盟店ポータル',
      prefix: true,
      actions: [
        'verifyFirstLogin',
        'setPassword',
        'verifyLogin',
        'resetPassword',
        'getMerchantUrlSlug',
        'updateAutoDeliverySettings',
        'resumeAutoDelivery'
      ]
    },

    // 会社情報管理
    'companyinfo_': {
      system: 'MerchantSystem',
      description: '会社情報管理',
      prefix: true,
      actions: [
        'getConstructionExamples',
        'saveConstructionExample',
        'getPreviewSettings',
        'savePreviewSettings',
        'loadPreviewSettings',
        'generateStaticHTML',
        'updateMerchantUrlAndPreviewHp',
        'triggerFTPSync'
      ]
    },

    // 管理ダッシュボード
    'admin_': {
      system: 'AdminSystem',
      description: '管理ダッシュボード',
      prefix: true,
      actions: [
        'verifyAdminLogin',
        'getRegistrationRequests',
        'getFranchiseManagementData',
        'getMerchantData',
        'getMerchantStatus',
        'updateMerchantData',
        'approveRegistration',
        'rejectRegistration',
        'revertRegistration'
      ]
    },

    // URL短縮（管理ダッシュボード用）
    'shortenUrl': {
      system: 'UrlShortener',
      description: 'URL短縮',
      prefix: false,
      actions: ['shortenUrl']
    },

    // AI検索
    'ai_': {
      system: 'AISearchSystem',
      description: 'AI検索',
      prefix: true,
      actions: ['searchCompany']
    },

    // 評価データ管理（V1754: syncRatingsToMaster追加）
    'evaluation_': {
      system: 'EvaluationDataManager',
      description: '評価データ管理',
      prefix: true,
      actions: ['getRatingsFromSheet', 'updateCompanyRatings', 'syncRatingsToMaster']
    },

    // CVデータ管理システム
    'cv_': {
      system: 'CVSheetSystem',
      description: 'CV送信',
      prefix: true,
      actions: ['cv1_submit', 'cv2_update', 'getCVList', 'convertNameToKana', 'debugSpreadsheetStructure', 'aiCorrectMemo']
    },

    // CV更新・ステータス管理（Admin用 V1823）
    'updateCVData': {
      system: 'AdminSystem',
      description: 'CV情報更新',
      prefix: false,
      actions: ['updateCVData']
    },
    'updateCVStatus': {
      system: 'AdminSystem',
      description: 'CVステータス更新',
      prefix: false,
      actions: ['updateCVStatus']
    },
    'sendOrderTransfer': {
      system: 'AdminSystem',
      description: 'オーダー転送',
      prefix: false,
      actions: ['sendOrderTransfer']
    },

    // V2005: 転送済み業者取得・取り消し
    'getDeliveredFranchises': {
      system: 'AdminSystem',
      description: '転送済み業者取得',
      prefix: false,
      actions: ['getDeliveredFranchises']
    },
    'cancelTransfer': {
      system: 'AdminSystem',
      description: '転送取り消し',
      prefix: false,
      actions: ['cancelTransfer']
    },

    // V2006: 一斉配信システム
    'getBroadcastTargets': {
      system: 'BroadcastSystem',
      description: '一斉配信対象取得',
      prefix: false,
      actions: ['getBroadcastTargets']
    },
    'getBroadcastPreview': {
      system: 'BroadcastSystem',
      description: '一斉配信プレビュー',
      prefix: false,
      actions: ['getBroadcastPreview']
    },
    'sendBroadcast': {
      system: 'BroadcastSystem',
      description: '一斉配信実行',
      prefix: false,
      actions: ['sendBroadcast']
    },
    'getAppliedFranchises': {
      system: 'BroadcastSystem',
      description: '申込済み加盟店取得',
      prefix: false,
      actions: ['getAppliedFranchises']
    },

    // CVハートビートシステム（V1754）
    'heartbeat': {
      system: 'CVHeartbeatSystem',
      description: 'CVハートビート更新',
      prefix: false,
      actions: ['heartbeat']
    },

    // ランキング取得（V1713: RankingSystemに分離）
    'getRanking': {
      system: 'RankingSystem',
      description: 'ランキング取得',
      prefix: false,
      actions: ['getRanking']
    },

    // プレビューHP同期（V1833: 加盟店登録→加盟店マスタ同期）
    'syncPreviewHP': {
      system: 'RankingSystem',
      description: 'プレビューHP同期',
      prefix: false,
      actions: ['syncPreviewHP']
    },

    // マッチ項目同期（V1899: 特殊対応項目・最大対応階数を同期）
    'syncMatchFields': {
      system: 'RankingSystem',
      description: 'マッチ項目同期',
      prefix: false,
      actions: ['syncMatchFields']
    },

    // 会社名カナ同期（V1912: 加盟店登録D列→加盟店マスタAG列）
    'syncCompanyNameKana': {
      system: 'RankingSystem',
      description: '会社名カナ同期',
      prefix: false,
      actions: ['syncCompanyNameKana']
    },

    // 住所同期（V1913: 加盟店登録J列→加盟店マスタAH列）
    'syncAddress': {
      system: 'RankingSystem',
      description: '住所同期',
      prefix: false,
      actions: ['syncAddress']
    },

    // 全アクティブ加盟店取得（V1913: Admin Dashboard検索用）
    'getAllActiveFranchises': {
      system: 'RankingSystem',
      description: '全アクティブ加盟店取得',
      prefix: false,
      actions: ['getAllActiveFranchises']
    },

    // 距離計算（V1882: Google Maps Distance Matrix API）
    'calculateDistances': {
      system: 'DistanceCalculator',
      description: '距離計算（Google Maps API）',
      prefix: false,
      actions: ['calculateDistances']
    },

    // Slack連携
    'slack_': {
      system: 'SlackApprovalSystem',
      description: 'Slack承認システム',
      prefix: true,
      actions: []
    },


    // キャンセル申請システム
    'getCancelableCases': {
      system: 'MerchantCancelReport',
      description: 'キャンセル申請可能案件取得',
      prefix: false,
      actions: ['getCancelableCases']
    },
    'getCancelAppliedCases': {
      system: 'MerchantCancelReport',
      description: 'キャンセル申請済み案件取得（ステータス別）',
      prefix: false,
      actions: ['getCancelAppliedCases']
    },
    'submitCancelReport': {
      system: 'MerchantCancelReport',
      description: 'キャンセル申請登録',
      prefix: false,
      actions: ['submitCancelReport']
    },
    'generateAICancelText': {
      system: 'MerchantCancelAI',
      description: '加盟店キャンセル申請AI校正',
      prefix: false,
      actions: ['generateAICancelText']
    },

    // 追客終了BOXシステム
    'archiveCase': {
      system: 'MerchantCaseArchive',
      description: '案件をアーカイブ（追客終了BOXへ移動）',
      prefix: false,
      actions: ['archiveCase']
    },
    'restoreCase': {
      system: 'MerchantCaseArchive',
      description: 'アーカイブ案件を復元',
      prefix: false,
      actions: ['restoreCase']
    },
    'getArchivedCases': {
      system: 'MerchantCaseArchive',
      description: 'アーカイブ案件一覧取得',
      prefix: false,
      actions: ['getArchivedCases']
    },

    // 期限延長申請システム
    'getExtensionEligibleCases': {
      system: 'MerchantDeadlineExtension',
      description: '期限延長申請可能案件取得',
      prefix: false,
      actions: ['getExtensionEligibleCases']
    },
    'submitExtensionRequest': {
      system: 'MerchantDeadlineExtension',
      description: '期限延長申請登録',
      prefix: false,
      actions: ['submitExtensionRequest']
    },

    // 成約報告システム
    'getDeliveredCases': {
      system: 'MerchantContractReport',
      description: '配信済み案件取得（成約報告対象）',
      prefix: false,
      actions: ['getDeliveredCases']
    },
    'submitContractReport': {
      system: 'MerchantContractReport',
      description: '成約報告登録',
      prefix: false,
      actions: ['submitContractReport']
    },

    // キャンセル承認システム（管理者用）
    'approveCancelReport': {
      system: 'AdminCancelSystem',
      description: 'キャンセル申請承認',
      prefix: false,
      actions: ['approveCancelReport']
    },
    'rejectCancelReport': {
      system: 'AdminCancelSystem',
      description: 'キャンセル申請却下',
      prefix: false,
      actions: ['rejectCancelReport']
    },
    'approveExtensionRequest': {
      system: 'AdminCancelSystem',
      description: '期限延長申請承認',
      prefix: false,
      actions: ['approveExtensionRequest']
    },
    'rejectExtensionRequest': {
      system: 'AdminCancelSystem',
      description: '期限延長申請却下',
      prefix: false,
      actions: ['rejectExtensionRequest']
    },

    // テストデータ管理（開発用）
    'recreateTestData': {
      system: 'TestDataManager',
      description: 'テストデータ再作成',
      prefix: false,
      actions: ['recreateTestData']
    },
    'cleanupAllTestData': {
      system: 'TestDataManager',
      description: 'テストデータ完全削除',
      prefix: false,
      actions: ['cleanupAllTestData']
    },

    // LP問い合わせフォーム（V1845）
    'lp_contact_submit': {
      system: 'LPContactSystem',
      description: 'LP問い合わせフォーム送信',
      prefix: false,
      actions: ['lp_contact_submit']
    }
  },

  /**
   * アクションからシステムを特定
   * @param {string} action - アクション名
   * @return {Object} { system: 'SystemName', route: {...} }
   */
  getSystemForAction: function(action) {
    // ヘルスチェック
    if (action === 'health') {
      return { system: 'common', route: this.routes['health'] };
    }

    // プレフィックスマッチング
    for (const routeKey in this.routes) {
      const route = this.routes[routeKey];

      if (route.prefix && action.startsWith(routeKey)) {
        return { system: route.system, route: route };
      }

      // 個別アクション確認
      if (route.actions && route.actions.includes(action)) {
        return { system: route.system, route: route };
      }
    }

    return { system: null, route: null };
  },

  /**
   * システム名からハンドラーを取得
   * @param {string} systemName - システム名
   * @param {string} method - 'GET' or 'POST'
   * @return {Function} ハンドラー関数
   */
  getHandler: function(systemName, method) {
    if (systemName === 'common') {
      return null; // 共通処理は特別扱い
    }

    // グローバルスコープからシステムオブジェクトを取得
    const system = this.getSystemObject(systemName);
    if (!system) {
      console.error('[SystemRouter] System not found:', systemName);
      return null;
    }

    // POSTメソッドの場合はhandlePostを優先
    if (method === 'POST' && typeof system.handlePost === 'function') {
      return system.handlePost.bind(system);
    }

    // GETまたはhandlePostがない場合はhandleを使用
    if (typeof system.handle === 'function') {
      return system.handle.bind(system);
    }

    console.error('[SystemRouter] Handler not found for:', systemName, method);
    return null;
  },

  /**
   * システムオブジェクトを取得
   * @param {string} systemName - システム名
   * @return {Object} システムオブジェクト
   */
  getSystemObject: function(systemName) {
    // グローバルスコープから取得
    try {
      // FranchiseSystem, MerchantSystem, AdminSystem, AISearchSystem, etc.
      return eval(systemName);
    } catch (e) {
      console.error('[SystemRouter] Failed to get system object:', systemName, e);
      return null;
    }
  },

  /**
   * ルーティング情報を表示（デバッグ用）
   */
  printRoutes: function() {
    console.log('=== System Router Map ===');
    for (const routeKey in this.routes) {
      const route = this.routes[routeKey];
      const prefix = route.prefix ? '(prefix)' : '';
      console.log(`${routeKey} ${prefix} → ${route.system}: ${route.description}`);
      if (route.actions && route.actions.length > 0) {
        route.actions.forEach(action => {
          console.log(`  - ${action}`);
        });
      }
    }
  }
};

/**
 * GETリクエスト処理（必ずここだけ）
 * V1858: POST simulation via GET - 組織アカウント制限により匿名POSTができないため、GETでPOSTをシミュレート
 */
function doGet(e) {
  try {
    // POST simulation check (V1858)
    // 組織Googleアカウントでは「全員（匿名ユーザーを含む）」オプションが存在しないため、
    // POST requestが404エラーになる問題への対応
    if (e.parameter.method === 'POST' || e.parameter._method === 'POST') {
      console.log('[main.js] POST simulation via GET detected');

      // GETパラメータからPOSTイベント構造を作成
      const simulatedPostEvent = {
        parameter: Object.assign({}, e.parameter),
        postData: {
          contents: JSON.stringify(e.parameter),
          type: 'application/json'
        }
      };

      // method/methodパラメータを削除（実際のデータには不要）
      delete simulatedPostEvent.parameter.method;
      delete simulatedPostEvent.parameter._method;
      const callback = simulatedPostEvent.parameter.callback;
      const dataVar = simulatedPostEvent.parameter.dataVar;
      delete simulatedPostEvent.parameter.callback;
      delete simulatedPostEvent.parameter.dataVar;

      console.log('[main.js] Calling doPost with simulated event');

      // doPostを呼び出し
      const postResult = doPost(simulatedPostEvent);

      // JSONP対応: callbackまたはdataVarが指定されている場合
      if (callback || dataVar) {
        try {
          const jsonData = JSON.parse(postResult.getContent());
          return createJsonpResponse(jsonData, callback, dataVar);
        } catch (err) {
          console.error('[main.js] Failed to parse POST result for JSONP:', err);
          return postResult;
        }
      }

      return postResult;
    }

    const action = e.parameter.action;
    const callback = e.parameter.callback;
    const dataVar = e.parameter.dataVar;  // V1713-FIX: グローバル変数方式対応

    console.log('[main.js] GET request:', action);

    // アクションが未指定の場合
    if (!action) {
      return createJsonpResponse({
        success: false,
        error: 'Action parameter is required'
      }, callback, dataVar);
    }

    let result;

    // SystemRouterを使ってシステムを特定
    const { system, route } = SystemRouter.getSystemForAction(action);

    if (!system) {
      // 不明なアクション
      console.warn('[main.js] Unknown action:', action);
      result = {
        success: false,
        error: `Unknown action: ${action}`,
        hint: 'このアクションはSystemRouterに登録されていません'
      };
    } else if (system === 'common') {
      // ヘルスチェック（共通処理）
      result = {
        success: true,
        message: 'API is running',
        version: '2.1.0',
        timestamp: new Date().toString(),
        router: 'SystemRouter enabled'
      };
    } else if (action === 'broadcast_purchase' || action === 'broadcast_interest') {
      // V2006: 一斉配信のボタンクリック処理（HTMLを返す）
      console.log('[main.js] Routing to BroadcastSystem (HTML response):', action);
      return BroadcastSystem.handle(e.parameter);
    } else if (action === 'syncPostalCodes') {
      // V1948: 郵便番号一括同期 (one-time migration)
      console.log('[main.js] Running syncAllPostalCodes migration');
      result = syncAllPostalCodes();
    } else if (action === 'calculateDistances') {
      // V1949: 距離計算API (V1946: 距離順ソート対応)
      console.log('[main.js] Routing to DistanceCalculator');
      result = DistanceCalculator.handle(e.parameter, null);
    } else {
      // システムハンドラーを取得して実行
      console.log('[main.js] Routing to:', system, '(', route.description, ')');

      const handler = SystemRouter.getHandler(system, 'GET');
      if (!handler) {
        result = {
          success: false,
          error: `Handler not found for system: ${system}`
        };
      } else {
        // updateMerchantDataの場合、dataパラメータをJSONパース
        if (action === 'updateMerchantData' && e.parameter.data) {
          try {
            e.parameter.parsedData = JSON.parse(e.parameter.data);
            console.log('[main.js] Parsed data from GET:', e.parameter.parsedData);
          } catch (err) {
            console.error('[main.js] Failed to parse data parameter:', err);
          }
        }

        // updateCVDataの場合、dataパラメータをJSONパース (V1823)
        if (action === 'updateCVData' && e.parameter.data) {
          try {
            e.parameter.data = JSON.parse(e.parameter.data);

            // data内の配列フィールドもパース（api-client.jsで二重にJSON.stringifyされている）
            if (e.parameter.data.workItems && typeof e.parameter.data.workItems === 'string') {
              e.parameter.data.workItems = JSON.parse(e.parameter.data.workItems);
            }
            if (e.parameter.data.specialItems && typeof e.parameter.data.specialItems === 'string') {
              e.parameter.data.specialItems = JSON.parse(e.parameter.data.specialItems);
            }

            console.log('[main.js] Parsed updateCVData data:', e.parameter.data);
          } catch (err) {
            console.error('[main.js] Failed to parse updateCVData data parameter:', err);
          }
        }

        // sendOrderTransferの場合、複数パラメータをJSONパース (V1823)
        if (action === 'sendOrderTransfer') {
          try {
            if (e.parameter.franchises) {
              e.parameter.franchises = JSON.parse(e.parameter.franchises);
            }
            if (e.parameter.caseData) {
              e.parameter.caseData = JSON.parse(e.parameter.caseData);
            }
            console.log('[main.js] Parsed sendOrderTransfer params');
          } catch (err) {
            console.error('[main.js] Failed to parse sendOrderTransfer parameters:', err);
          }
        }

        // V2006: 一斉配信関連
        if (action === 'sendBroadcast' || action === 'getBroadcastTargets' || action === 'getBroadcastPreview' || action === 'getAppliedFranchises') {
          console.log('[main.js] Routing to BroadcastSystem:', action);
          result = BroadcastSystem.handle(e.parameter);
        } else {
          result = handler(e.parameter, null);
        }
      }
    }

    // JSONP形式で返却
    return createJsonpResponse(result, callback, dataVar);

  } catch (error) {
    console.error('[main.js] doGet error:', error);
    return createJsonpResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    }, e.parameter.callback, e.parameter.dataVar);
  }
}

/**
 * POSTリクエスト処理（必ずここだけ）
 */
function doPost(e) {
  try {
    // 🔍 詳細ロギング開始（console.log + Logger.log 両方使用）
    const logMsg = '[main.js] ========== POST REQUEST START ==========';
    console.log(logMsg);
    Logger.log(logMsg);

    const timestamp = new Date().toISOString();
    console.log('[main.js] Timestamp:', timestamp);
    Logger.log('[main.js] Timestamp: ' + timestamp);

    console.log('[main.js] Content Type:', e.contentType);
    Logger.log('[main.js] Content Type: ' + e.contentType);

    console.log('[main.js] PostData Type:', e.postData ? e.postData.type : 'No postData');
    Logger.log('[main.js] PostData Type: ' + (e.postData ? e.postData.type : 'No postData'));

    console.log('[main.js] Parameter keys:', Object.keys(e.parameter || {}));
    Logger.log('[main.js] Parameter keys: ' + Object.keys(e.parameter || {}).join(', '));

    console.log('[main.js] Parameters:', JSON.stringify(e.parameter));
    Logger.log('[main.js] Parameters: ' + JSON.stringify(e.parameter));

    console.log('[main.js] Has payload param:', !!e.parameter.payload);
    Logger.log('[main.js] Has payload param: ' + (!!e.parameter.payload));

    // Slackインタラクション専用処理（payloadがある場合）
    if (e.parameter.payload) {
      console.log('[main.js] ✅ Slack interaction detected (payload found)');
      const payloadPreview = e.parameter.payload.substring(0, 200);
      console.log('[main.js] Payload preview:', payloadPreview);

      try {
        const parsedPayload = JSON.parse(e.parameter.payload);
        console.log('[main.js] Payload type:', parsedPayload.type);
        console.log('[main.js] Routing to SlackApprovalSystem...');
      } catch (parseError) {
        console.error('[main.js] ❌ Failed to parse payload for logging:', parseError);
      }

      return SlackApprovalSystem.handlePost(e);
    }

    console.log('[main.js] ⚠️ No Slack payload found - continuing to general routing');

    // JSONボディがある場合はパース、URL-encodedの場合はe.parameterを使用
    let postData = {};
    if (e.postData && e.postData.contents) {
      // V1701: text/plainでもJSONをパースする（フロントエンドがtext/plainで送信するため）
      if (e.postData.type === 'application/json' || e.postData.type === 'text/plain') {
        try {
          postData = JSON.parse(e.postData.contents);
          console.log('[main.js] Parsed JSON POST data (type: ' + e.postData.type + '):', JSON.stringify(postData));
        } catch (err) {
          console.error('[main.js] Failed to parse JSON POST data:', err);
        }
      }
    } else if (e.parameter) {
      // URL-encoded form data (application/x-www-form-urlencoded)
      postData = e.parameter;
      console.log('[main.js] Using URL-encoded POST data from e.parameter');
    }

    // actionをPOSTデータまたはパラメータから取得
    const action = postData.action || e.parameter.action;
    console.log('[main.js] Action:', action);
    Logger.log('[main.js] Action: ' + action);

    // アクションが未指定の場合
    if (!action) {
      Logger.log('[main.js] ERROR: No action parameter');
      return createJsonResponse({
        success: false,
        error: 'Action parameter is required'
      });
    }

    let result;

    // SystemRouterを使ってシステムを特定
    const { system, route } = SystemRouter.getSystemForAction(action);
    Logger.log('[main.js] SystemRouter result - system: ' + system + ', route: ' + (route ? route.description : 'null'));

    if (!system) {
      // 不明なアクション
      console.warn('[main.js] Unknown action:', action);
      Logger.log('[main.js] WARNING: Unknown action: ' + action);
      result = {
        success: false,
        error: `Unknown action: ${action}`,
        hint: 'このアクションはSystemRouterに登録されていません'
      };
    } else {
      // システムハンドラーを取得して実行
      console.log('[main.js] Routing POST to:', system, '(', route.description, ')');
      Logger.log('[main.js] Routing POST to: ' + system + ' (' + route.description + ')');

      const handler = SystemRouter.getHandler(system, 'POST');
      Logger.log('[main.js] Handler found: ' + (!!handler));

      if (!handler) {
        console.warn('[main.js] No POST handler for:', system);
        Logger.log('[main.js] WARNING: No POST handler for: ' + system);
        // フォールバック: レガシーハンドラーを試行
        result = handleLegacyPostAction(action, e, postData);
      } else {
        Logger.log('[main.js] Calling handler for: ' + system);
        result = handler(e, postData);
        Logger.log('[main.js] Handler returned, success: ' + result.success);
      }
    }

    // JSON形式で返却
    console.log('[main.js] Returning JSON response, success:', result.success);
    console.log('[main.js] ========== POST REQUEST END ==========');
    return createJsonResponse(result);

  } catch (error) {
    console.error('[main.js] ❌ doPost error:', error);
    console.error('[main.js] Error stack:', error.stack);
    console.log('[main.js] ========== POST REQUEST ERROR END ==========');
    return createJsonResponse({
      success: false,
      error: error.toString(),
      stack: error.stack
    });
  }
}

/**
 * レガシーPOSTアクションのハンドラー（後方互換性のため）
 * @param {string} action - アクション名
 * @param {Object} e - イベントオブジェクト
 * @param {Object} postData - パース済みPOSTデータ
 * @return {Object} 処理結果
 */
function handleLegacyPostAction(action, e, postData) {
  try {
    console.log('[handleLegacyPostAction] Legacy action:', action);

    // 会社情報画像管理（レガシー）
    if (action === 'companyinfo_uploadImage' || action === 'companyinfo_addGalleryPhoto' || action === 'companyinfo_deleteImage') {
      return handleCompanyImageRequest(action, postData);
    }
    // 施工事例管理（レガシー）
    else if (action === 'saveConstructionExample') {
      return handleSaveConstructionExample(postData);
    }
    else if (action === 'getConstructionExamples') {
      return handleGetConstructionExamples(postData);
    }
    // 評価データ管理（EvaluationDataManager）
    else if (action === 'getRatingsFromSheet') {
      return EvaluationDataManager.getRatingsForCompany(postData.companyName);
    }
    else if (action === 'updateCompanyRatings') {
      return EvaluationDataManager.collectRatingsFromAPIs(
        postData.merchantId || '',
        postData.companyName,
        postData.address || ''
      );
    }
    // 不明なアクション
    else {
      return {
        success: false,
        error: `Legacy handler not found for action: ${action}`
      };
    }

  } catch (error) {
    console.error('[handleLegacyPostAction] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * OPTIONSリクエスト処理（CORSプリフライト対応）
 * V1713-FIX: XMLHttpRequest用にCORSプリフライトリクエストに対応
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
}

/**
 * JSONP形式のレスポンス作成（共通関数）
 */
function createJsonpResponse(data, callback, dataVar) {
  const jsonString = JSON.stringify(data);

  if (dataVar) {
    // V1713-FIX: グローバル変数方式（スマホ対応 - CORS不要）
    return ContentService
      .createTextOutput('window["' + dataVar + '"] = ' + jsonString + ';')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else if (callback) {
    // JSONP形式（従来の方式）
    return ContentService
      .createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 通常のJSON（callbackなしの場合）
    return ContentService
      .createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * JSON形式のレスポンス作成（POST用）
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 会社情報画像アップロードリクエストのハンドラー
 * @param {string} action - アクション名
 * @param {Object} postData - POSTデータ
 * @return {Object} 処理結果
 */
function handleCompanyImageRequest(action, postData) {
  try {
    console.log('[handleCompanyImageRequest] Action:', action);
    console.log('[handleCompanyImageRequest] Data keys:', Object.keys(postData));

    // 会社名を取得（スプレッドシートから）
    const merchantData = AdminSystem.getMerchantData(postData.merchantId);
    const companyName = merchantData.data ? merchantData.data['会社名'] : 'Unknown';

    if (action === 'companyinfo_uploadImage') {
      // メインビジュアルまたは施工事例のアップロード
      const result = saveCompanyImage({
        merchantId: postData.merchantId,
        companyName: companyName,
        base64Data: postData.base64Data,
        fileName: postData.fileName,
        imageType: postData.imageType || 'main-visual'
      });

      // スプレッドシートのAR列（メインビジュアル）を更新
      if (result.success && postData.imageType === 'main-visual') {
        AdminSystem.updateMerchantData(postData.merchantId, {
          'メインビジュアル': result.url
        });
      }

      return result;

    } else if (action === 'companyinfo_addGalleryPhoto') {
      // 写真ギャラリーのアップロード
      const result = saveCompanyImage({
        merchantId: postData.merchantId,
        companyName: companyName,
        base64Data: postData.base64Data,
        fileName: postData.fileName,
        imageType: 'gallery'
      });

      // スプレッドシートのAS列（写真ギャラリー）を更新
      if (result.success) {
        // 既存のギャラリーURLを取得
        const existingGallery = merchantData.data ? merchantData.data['写真ギャラリー'] : '';
        const galleryUrls = existingGallery ? existingGallery.split(',').map(url => url.trim()) : [];

        // 新しいURLを追加（20枚まで）
        if (galleryUrls.length < 20) {
          galleryUrls.push(result.url);
          AdminSystem.updateMerchantData(postData.merchantId, {
            '写真ギャラリー': galleryUrls.join(',')
          });
        }
      }

      return result;

    } else if (action === 'companyinfo_deleteImage') {
      // 画像削除
      return deleteCompanyImage(postData.fileId);

    } else {
      return {
        success: false,
        error: 'Unknown image action'
      };
    }

  } catch (error) {
    console.error('[handleCompanyImageRequest] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 施工事例保存のハンドラー
 * @param {Object} postData - POSTデータ
 * @return {Object} 処理結果
 */
function handleSaveConstructionExample(postData) {
  try {
    const merchantId = postData.merchantId;
    const exampleData = postData.exampleData;

    if (!merchantId || !exampleData) {
      return {
        success: false,
        error: '加盟店IDまたは施工事例データが不足しています'
      };
    }

    // 会社名を取得
    const merchantData = AdminSystem.getMerchantData(merchantId);
    const companyName = merchantData.data ? merchantData.data['会社名'] : 'Unknown';

    // Before画像をアップロード
    let beforeUrl = '';
    if (exampleData.beforeImage) {
      const beforeResult = saveCompanyImage({
        merchantId: merchantId,
        companyName: companyName,
        base64Data: exampleData.beforeImage,
        fileName: `before_${Date.now()}.jpg`,
        imageType: 'project'
      });
      if (beforeResult.success) {
        beforeUrl = beforeResult.url;
      } else {
        return beforeResult;
      }
    }

    // After画像をアップロード
    let afterUrl = '';
    if (exampleData.afterImage) {
      const afterResult = saveCompanyImage({
        merchantId: merchantId,
        companyName: companyName,
        base64Data: exampleData.afterImage,
        fileName: `after_${Date.now()}.jpg`,
        imageType: 'project'
      });
      if (afterResult.success) {
        afterUrl = afterResult.url;
      } else {
        return afterResult;
      }
    }

    // スプレッドシート「施工事例」に保存
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('施工事例');

    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet('施工事例');
      sheet.appendRow(['加盟店ID', '事例ID', 'タイトル', '築年数', '施工金額', '説明文', 'Before URL', 'After URL', '作成日時']);
    }

    // 事例IDを生成
    const exampleId = 'EXF' + merchantId.replace('FR', '') + '_' + Date.now();
    const createdAt = new Date();

    // データを追加
    sheet.appendRow([
      merchantId,
      exampleId,
      exampleData.title || '',
      exampleData.buildingAge || '',
      exampleData.price || '',
      exampleData.content || '',
      beforeUrl,
      afterUrl,
      createdAt
    ]);

    console.log('[handleSaveConstructionExample] Saved:', exampleId);

    return {
      success: true,
      exampleId: exampleId,
      beforeUrl: beforeUrl,
      afterUrl: afterUrl
    };

  } catch (error) {
    console.error('[handleSaveConstructionExample] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 施工事例取得のハンドラー
 * @param {Object} postData - POSTデータ
 * @return {Object} 処理結果
 */
function handleGetConstructionExamples(postData) {
  try {
    const merchantId = postData.merchantId;

    if (!merchantId) {
      return {
        success: false,
        error: '加盟店IDが指定されていません'
      };
    }

    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('施工事例');

    if (!sheet) {
      return {
        success: true,
        examples: []
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // 加盟店IDでフィルタ
    const examples = rows
      .filter(row => row[0] === merchantId)
      .map(row => ({
        exampleId: row[1],
        title: row[2],
        buildingAge: row[3],
        price: row[4],
        content: row[5],
        beforeUrl: row[6],
        afterUrl: row[7],
        createdAt: row[8]
      }));

    return {
      success: true,
      examples: examples
    };

  } catch (error) {
    console.error('[handleGetConstructionExamples] Error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * ====================================
 * 手動実行用: 評価データ同期
 * ====================================
 * V1754: 評価データシート → 加盟店マスタAC列（総合スコア）同期
 *
 * 使い方: GASエディタで「実行」→「syncRatingsToMasterManual」
 */
function syncRatingsToMasterManual() {
  console.log('========================================');
  console.log('評価データ同期を手動実行中...');
  console.log('========================================');

  const result = EvaluationDataManager.syncRatingsToMaster();

  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========================================');

  if (result.success) {
    console.log('✅ 同期成功');
    console.log('  - 更新:', result.updatedCount, '件');
    console.log('  - デフォルト設定:', result.notFoundCount, '件');
    console.log('  - 評価データ総数:', result.totalEvaluations, '件');
  } else {
    console.error('❌ 同期失敗:', result.error);
  }

  return result;
}

// Test trigger 20251127-064800
// Timestamp: 2025-11-27 06:48:00 - V1912 Frontend Deploy Trigger
// V1913 Deploy Trigger - 1764195989
// V1913 Frontend Deploy - Address fix + Search fix - 1764211205
// V1913 GAS Re-deploy - getAllActiveFranchises fix - 1764212400
// V1924 Deploy Trigger - Checkbox state persistence fix - 1764227000
