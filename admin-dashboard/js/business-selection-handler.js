/**
 * ============================================
 * 業者選択ハンドラー V1936
 * ============================================
 *
 * 🔥 V1936: フォールバック処理削除（2025-11-27 21:50 JST）
 * - 【根本原因修正】getSampleFranchises()フォールバックを完全削除
 * - GAS API失敗時は空配列を返し、エラーメッセージを表示
 * - サンプルデータによるチェックボックス誤動作を防止
 * - 問題の2社（湘南ウィンクル、やまもとくん）がデフォルトチェックされるバグ修正
 *
 * 🔥 V1932: handleFranchiseCheck関数実装 - 根本修正（2025-11-27 20:35 JST）
 * - 【根本原因発見】handleFranchiseCheck関数が定義されていなかった！
 * - window.handleFranchiseCheckをグローバル関数として実装
 * - チェックボックスのonchange属性から正常に呼び出されるようになった
 * - チェック状態をcheckedCompanies Setに確実に追加/削除
 * - 希望社数制限機能も実装（超過時はアラート表示）
 *
 * 🔥 V1931: onchange属性HTMLパースエラー修正（2025-11-27 19:45 JST）
 * - V1930で複雑なデバッグログをonchange属性に埋め込みHTMLパースエラー発生
 * - onchange属性をシンプルに修正: onchange="handleFranchiseCheck(this, 'companyName')"
 * - しかしhandleFranchiseCheck関数自体が存在しなかった（V1932で実装）
 *
 * 🔥 V1930: デバッグログ強化失敗 - onchange属性が無効化（2025-11-27 19:15 JST）
 * - チェックボックスonchange属性に複雑なログを埋め込み → HTMLパースエラー
 * - onchange属性がnullになり、イベントが発火しなかった
 *
 * 🔥 V1929: ブラウザキャッシュ対策 - バージョンチェック機能追加（2025-11-27 19:00 JST）
 * - V1928の修正内容は全て含まれている（チェックボックス永続化は完璧に動作）
 * - 古いキャッシュを検出して警告を表示する機能を追加
 * - ユーザーに強制リフレッシュを促す
 *
 * 🔥 V1928: チェックボックス状態永続化 - 最終修正（2025-11-27 18:30 JST）
 * - V1927: index.htmlから initializeCheckboxes() 削除（完了）
 * - V1928: JSファイル側もV1927対応に更新、デバッグログクリーンアップ
 * - checkedCompanies Set を唯一のソース（Single Source of Truth）
 * - ソート変更時も handleFranchiseCheck 時もチェック状態完全保持
 * - inline onchange 属性で正常動作（addEventListener 不使用）
 *
 * 目的: RankingSystemと統合した動的業者選定システム
 * 依存: ApiClient（api-client.js）, RankingSystem (GAS)
 *
 * 主な機能:
 * - RankingSystemから業者データ取得（LP と同じデータソース）
 * - AS列業者を常に上位に表示（「ユーザー選択」ラベル付き）
 * - 5種類のソート順（ユーザー選択/安い順/口コミ順/高品質順/距離順）
 * - Google Maps Distance Matrix API による距離順ソート
 * - 業者検索機能（漢字/ひらがな部分一致）
 * - もっと見る機能（4社 → 8社）
 * - チェックボックス転送候補選択機能（デフォルト: AS列 + 100%マッチのみ）
 * - カラーコーディング（V1881）:
 *   - 赤: AS列 + 100%マッチ（最優先）
 *   - ピンク: AS列だがマッチ度不足
 *   - オレンジ: 100%マッチだが非AS列
 *   - 黄色: 高マッチ（>70%）
 *   - 黄緑: 中マッチ（50-70%）
 *   - 水色: 低マッチ（<50%）
 *   - チェック時は濃い色に変化
 * - V1903: 工事種別料金計算（1社紹介時 ¥20,000固定、複数社時は最高料金）
 */

// ============================================
// 🔥 バージョン定数（V1947-POSTAL-CODE-FILTERING）
// ============================================
const BUSINESS_SELECTION_HANDLER_VERSION = 1947;
const EXPECTED_MIN_VERSION = 1947;

// ============================================
// 🔥 バージョン確認ログ（V1947）
// ============================================
console.log('%c[BusinessSelectionHandler] V1947 loaded successfully', 'color: #00ff00; font-weight: bold; font-size: 18px');
console.log('[BusinessSelectionHandler] Version: ' + BUSINESS_SELECTION_HANDLER_VERSION);
console.log('[BusinessSelectionHandler] Timestamp: 2025-11-28 22:00 JST');
console.log('[BusinessSelectionHandler] V1947 Features: 郵便番号フィルタリング最適化 - 距離計算前に郵便番号で8-10社に絞り込み');
console.log('[BusinessSelectionHandler] V1947: Performance optimization for 1000+ franchises');

// ============================================
// 🔥 V1929: バージョンチェック & キャッシュ警告バナー表示
// ============================================
window.BusinessSelectionHandlerVersion = BUSINESS_SELECTION_HANDLER_VERSION;
window.ExpectedMinVersion = EXPECTED_MIN_VERSION;

// DOMContentLoadedで警告バナーを表示（古いバージョンの場合）
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const currentVersion = window.BusinessSelectionHandlerVersion || 0;
    const minVersion = window.ExpectedMinVersion || 1929;

    if (currentVersion < minVersion) {
      console.error('%c[V1929] 古いバージョンが読み込まれています！ブラウザキャッシュをクリアしてください！', 'color: #ff0000; font-weight: bold; font-size: 20px; background: yellow;');
      console.error('[V1929] 現在のバージョン:', currentVersion, '/ 必要なバージョン:', minVersion);

      // 警告バナーを画面上部に表示
      const banner = document.createElement('div');
      banner.id = 'version-warning-banner';
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
        color: white;
        padding: 20px;
        text-align: center;
        z-index: 999999;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      `;
      banner.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto;">
          <div style="font-size: 24px; margin-bottom: 10px;">⚠️ 古いバージョンが読み込まれています ⚠️</div>
          <div style="font-size: 16px; margin-bottom: 15px;">
            チェックボックスの不具合を修正しましたが、ブラウザキャッシュが原因で古いコードが実行されています
          </div>
          <div style="font-size: 14px; margin-bottom: 15px;">
            現在のバージョン: V${currentVersion} / 必要なバージョン: V${minVersion}
          </div>
          <div style="font-size: 16px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
            <strong>解決方法:</strong> Ctrl+Shift+R (Windows) または Cmd+Shift+R (Mac) でページを<strong>強制再読み込み</strong>してください
          </div>
          <button onclick="location.reload(true)" style="background: white; color: #ff0000; border: none; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
            今すぐ再読み込み
          </button>
          <button onclick="document.getElementById('version-warning-banner').remove()" style="background: rgba(255,255,255,0.3); color: white; border: 2px solid white; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-left: 10px;">
            このまま続ける（非推奨）
          </button>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.9; }
          }
        </style>
      `;

      // ページの一番上に挿入
      if (document.body) {
        document.body.insertBefore(banner, document.body.firstChild);
      } else {
        // bodyがまだない場合は少し待つ
        setTimeout(function() {
          if (document.body) {
            document.body.insertBefore(banner, document.body.firstChild);
          }
        }, 100);
      }
    } else {
      console.log('%c[V1929] ✅ 最新バージョンが読み込まれています', 'color: #00ff00; font-weight: bold; font-size: 14px');
    }
  });
}

// ============================================
// V1903: 工事種別料金マッピング（ハードコード）
// ============================================
const WORK_TYPE_PRICES = {
  // 通常料金 ¥20,000（15種類）
  '外壁塗装': 20000,
  '外壁カバー工法': 20000,
  '外壁張替え': 20000,
  '屋根塗装（外壁工事含む）': 20000,
  '屋上防水（外壁工事含む）': 20000,
  '屋根葺き替え・張り替え※スレート・ガルバリウム等': 20000,
  '屋根葺き替え・張り替え※瓦': 20000,
  '屋根カバー工法': 20000,
  '外壁補修（外壁工事含む）': 20000,
  '屋根補修（外壁工事含む）': 20000,
  'ベランダ防水（外壁工事含む）': 20000,
  '内装水回り（バス・キッチン・トイレ）（外壁工事含む）': 20000,
  '内装（フローリングや畳などの床・クロス等）（外壁工事含む）': 20000,
  '外壁雨漏り修繕（外壁工事含む）': 20000,
  '屋根雨漏り修繕（屋根工事含む）': 20000,

  // 単品料金（7種類）
  '屋根塗装単品': 10000,
  '屋上防水単品': 10000,
  '外壁補修単品': 5000,
  '屋根補修単品': 5000,
  'ベランダ防水単品': 5000,
  '外壁雨漏り修繕単品': 5000,
  '屋根雨漏り修繕単品': 5000
};

// ============================================
// V1903: 工事種別分類（マッチング用）
// ============================================
const MAJOR_WALL_WORKS = ['外壁塗装', '外壁カバー工法', '外壁張替え'];
const MAJOR_ROOF_WORKS = ['屋根葺き替え・張り替え※スレート・ガルバリウム等', '屋根葺き替え・張り替え※瓦', '屋根カバー工法'];

const BusinessSelectionHandler = {

  /**
   * 現在のデータキャッシュ
   */
  currentCaseData: null,
  allFranchises: [],          // RankingSystemから取得した全業者
  userSelectedCompanies: [],  // AS列の業者名配列
  currentSortType: 'user',    // 現在のソート順
  showAll: false,             // もっと見る状態
  searchQuery: '',            // 検索クエリ
  checkedCompanies: new Set(), // V1921: チェック済み業者名（グローバル管理）

  /**
   * 初期化
   */
  init() {
    if (!window.apiClient) {
      console.error('[BusinessSelection] ApiClient未初期化');
      return false;
    }
    console.log('[BusinessSelection] 初期化完了');
    return true;
  },

  /**
   * AS列（業者選定履歴）をパースして業者名配列を取得
   * @param {string} businessHistoryText - AS列のテキスト
   * @returns {Array<string>} 業者名の配列
   */
  parseBusinessHistory(businessHistoryText) {
    if (!businessHistoryText || typeof businessHistoryText !== 'string') {
      return [];
    }

    // カンマで分割
    const companies = businessHistoryText.split(',').map(s => s.trim()).filter(s => s);

    // フォーマットを正規化
    return companies.map(company => {
      // "S社:おすすめ順:1位" → "S社" のような略称を抽出
      if (company.includes(':')) {
        return company.split(':')[0].trim();
      }

      // フルネームはそのまま
      return company;
    });
  },

  /**
   * 希望社数を計算
   * @param {Array<string>} companies - 業者名配列
   * @returns {string} "1社", "2社", "3社", "4社"
   */
  calculateDesiredCount(companies) {
    const count = Math.min(companies.length, 4);
    return `${count}社`;
  },

  /**
   * 業者データをRankingSystemから取得（V1880: 新実装）
   * @param {string} caseId - 案件ID
   * @param {object} currentCaseData - 現在の案件データ（AS列含む）
   * @returns {Promise<object>} { desiredCount, selectedCompanies, allFranchises }
   */
  async loadBusinessSelectionData(caseId, currentCaseData) {
    try {
      // V1904: ローディングスピナーを表示
      this.showLoadingSpinner();

      if (!this.init()) {
        throw new Error('BusinessSelection初期化失敗');
      }

      // キャッシュに保存
      this.currentCaseData = currentCaseData;

      // AS列から業者名を取得
      const businessHistory = currentCaseData.businessHistory || '';
      const selectedCompanies = this.parseBusinessHistory(businessHistory);
      this.userSelectedCompanies = selectedCompanies;

      console.log('[BusinessSelection] AS列パース結果:', {
        raw: businessHistory,
        parsed: selectedCompanies,
        count: selectedCompanies.length
      });

      // V1923: 希望社数をCF列から取得（フォールバック: CB列 → AS列）
      let desiredCount;
      if (currentCaseData.desiredCompanyCount) {
        // CF列に値がある場合はそれを使用（数値のみ抽出して"N社"フォーマットに変換）
        const count = parseInt(currentCaseData.desiredCompanyCount);
        desiredCount = isNaN(count) ? this.calculateDesiredCount(selectedCompanies) : `${count}社`;
        console.log('[BusinessSelection] CF列から希望社数取得:', desiredCount);
      } else if (currentCaseData.companiesCount) {
        // CF列が空でCB列に値がある場合（既存データ用フォールバック）
        desiredCount = currentCaseData.companiesCount;
        console.log('[BusinessSelection] CB列から希望社数取得:', desiredCount);
      } else {
        // 両方空の場合はAS列からカウント（最終フォールバック）
        desiredCount = this.calculateDesiredCount(selectedCompanies);
        console.log('[BusinessSelection] AS列から希望社数計算:', desiredCount);
      }

      // RankingSystemから業者リストを取得（V1880: 新実装）
      console.log('[BusinessSelection] RankingSystemから業者データ取得開始...');
      const franchises = await this.fetchRankingData(currentCaseData);
      this.allFranchises = franchises;

      console.log('[BusinessSelection] 業者データ取得完了:', franchises.length, '件');

      // V1946: 距離情報を初期ロード時に計算（全ソートで表示可能にする）
      const originAddress = currentCaseData.address ||
                           `${currentCaseData.prefecture || ''}${currentCaseData.city || ''}`;
      const originPostalCode = currentCaseData.postalCode || '';

      if (originAddress) {
        console.log('[V1947] 距離情報を計算中... 起点:', originAddress);
        console.log('[V1947] 起点郵便番号:', originPostalCode);

        // V1947: 郵便番号フィルタリング（パフォーマンス最適化）
        let franchisesForDistance = this.allFranchises;
        if (originPostalCode && originPostalCode.length === 7 && this.allFranchises.length > 10) {
          console.log('[V1947] 郵便番号フィルタリングを実行（業者数: ' + this.allFranchises.length + '）');
          franchisesForDistance = this.filterByPostalCode(originPostalCode, this.allFranchises, 10);
          console.log('[V1947] フィルタリング後の業者数: ' + franchisesForDistance.length);
        } else {
          console.log('[V1947] 郵便番号フィルタリングをスキップ（条件不適合）');
        }

        // 距離計算（フィルタリングされた業者のみ）
        const franchisesWithDistance = await this.calculateDistances(originAddress, franchisesForDistance);

        // フィルタリングされた業者の距離情報を元のリストにマージ
        const distanceMap = new Map();
        franchisesWithDistance.forEach(f => {
          distanceMap.set(f.companyName, {
            distance: f.distance,
            distanceText: f.distanceText,
            durationText: f.durationText
          });
        });

        this.allFranchises = this.allFranchises.map(f => {
          const distanceInfo = distanceMap.get(f.companyName);
          if (distanceInfo) {
            return { ...f, ...distanceInfo };
          }
          return f;
        });

        console.log('[V1947] 距離情報計算完了');
      } else {
        console.warn('[V1947] 起点住所が取得できないため距離計算をスキップ');
      }

      return {
        desiredCount,
        selectedCompanies,
        allFranchises: this.allFranchises
      };

    } catch (error) {
      console.error('[BusinessSelection] データ読み込みエラー:', error);
      // V1904: エラー時もスピナーを非表示
      this.hideLoadingSpinner();
      throw error;
    }
  },

  /**
   * RankingSystemから業者データを取得（V1880: 新実装）
   * @param {object} caseData - 案件データ
   * @returns {Promise<Array>} 業者リスト
   */
  async fetchRankingData(caseData) {
    try {
      // 案件データから必要なパラメータを抽出
      const params = this.extractRankingParams(caseData);

      console.log('[BusinessSelection] getRanking APIリクエスト:', params);

      // RankingSystemのgetRankingを呼び出し（V1900修正: 引数を正しく渡す）
      const response = await window.apiClient.jsonpRequest('getRanking', params);

      if (!response || !response.success) {
        throw new Error(response?.error || 'ランキング取得失敗');
      }

      console.log('[BusinessSelection] getRanking APIレスポンス:', response);

      // ランキングデータを統合（recommended, cheap, review, premiumから重複除去してマージ）
      const allFranchises = this.mergeRankingData(response.rankings);

      console.log('[V1900-DEBUG] 統合後の業者数:', allFranchises.length);
      console.log('[V1900-DEBUG] 統合後の業者一覧:', allFranchises.map(f => ({
        name: f.companyName,
        maxFloors: f.maxFloors,
        citiesCount: f.citiesArray?.length,
        buildingAge: `${f.buildingAgeMin}-${f.buildingAgeMax}`
      })));

      return allFranchises;

    } catch (error) {
      console.error('[V1936] RankingSystem取得エラー:', error);
      console.error('[V1936] フォールバック削除 - 空配列を返します');
      alert('業者データの取得に失敗しました。ページをリロードしてください。');
      return [];
    }
  },

  /**
   * 案件データからgetRankingのパラメータを抽出（V1880: 新実装）
   * @param {object} caseData - 案件データ
   * @returns {object} getRankingパラメータ
   */
  extractRankingParams(caseData) {
    const rawData = caseData._rawData || {};
    const botAnswers = rawData.botAnswers || {};

    // 郵便番号（zipcode）
    const zipcode = caseData.postalCode || rawData.postalCode || '';

    // V1900: 都道府県・市区町村を直接抽出（zipcodeが無い場合の fallback）
    const prefecture = caseData.prefecture || rawData.prefecture || '';
    const city = caseData.city || rawData.city || '';

    // 外壁・屋根の材質と工事内容
    const wallMaterial = caseData.wallMaterial || botAnswers.q6_wallMaterial || '';
    const roofMaterial = caseData.roofMaterial || botAnswers.q7_roofMaterial || '';
    const wallWorkType = botAnswers.q9_wallWorkType || '';
    const roofWorkType = botAnswers.q10_roofWorkType || '';

    // 築年数の範囲を計算
    const buildingAge = parseInt(caseData.buildingAge || rawData.buildingAge || 0);
    const buildingAgeMin = Math.max(0, buildingAge - 5);
    const buildingAgeMax = buildingAge + 5;

    // 気になる箇所（単品 vs 複合工事の判定用）
    let concernedArea = '';
    if (wallWorkType && roofWorkType) {
      concernedArea = '外壁と屋根';
    } else if (wallWorkType) {
      concernedArea = '外壁';
    } else if (roofWorkType) {
      concernedArea = '屋根';
    }

    return {
      zipcode,
      prefecture, // V1900: 追加
      city, // V1900: 追加
      wallMaterial,
      roofMaterial,
      wallWorkType,
      roofWorkType,
      buildingAgeMin,
      buildingAgeMax,
      concernedArea
    };
  },

  /**
   * ランキングデータをマージして重複を除去（V1880: 新実装）
   * @param {object} rankings - { recommended: [], cheap: [], review: [], premium: [] }
   * @returns {Array} マージ済み業者リスト
   */
  mergeRankingData(rankings) {
    const merged = [];
    const seen = new Set();

    // recommendedランキングを基準にマージ
    const lists = [
      ...(rankings.recommended || []),
      ...(rankings.cheap || []),
      ...(rankings.review || []),
      ...(rankings.premium || [])
    ];

    lists.forEach(business => {
      const key = business.companyName;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(this.convertToFranchiseFormat(business));
      }
    });

    return merged;
  },

  /**
   * RankingSystemの業者データをフランチャイズ形式に変換（V1880: 新実装）
   * @param {object} business - RankingSystemの業者オブジェクト
   * @returns {object} フランチャイズ形式のオブジェクト
   */
  convertToFranchiseFormat(business) {
    const converted = {
      franchiseId: business.companyName, // IDの代わりに会社名を使用
      companyName: business.companyName,
      serviceAreas: [business.prefecture].filter(p => p),
      city: business.city || '',
      // V1917: GASは改行区切り、getRankingはカンマ区切り → 両方対応
      citiesArray: business.citiesArray || (business.cities || '').split(/[,\n]/).map(c => c.trim()).filter(c => c),
      workTypes: (business.constructionTypes || '').split(',').map(t => t.trim()).filter(t => t),
      specialSupport: business.specialSupport || '',
      maxFloors: business.maxFloors || '', // V1895: 最大対応階数（物件種別と階数を含む）
      buildingAgeRange: business.buildingAgeRange || '', // V1895: 築年数対応範囲 {min=0, max=95}
      buildingAgeMin: business.buildingAgeMin || 0, // V1895: 互換性のため残す
      buildingAgeMax: business.buildingAgeMax || 100, // V1895: 互換性のため残す
      avgContractAmount: business.avgContractAmount || 0,
      rating: business.rating || 4.2,
      reviewCount: business.reviewCount || 0,
      contractCount: business.contractCount || 0,
      // V1880: 距離ソート用のデータ
      distance: null,  // 後で計算
      distanceText: '',
      // V1880: previewHP
      previewHP: business.previewHP || '',
      // V1911: 住所・支店住所・会社名カナ追加
      address: business.address || '',
      branchAddress: business.branchAddress || '',
      companyNameKana: business.companyNameKana || ''
    };

    // V1900: 変換デバッグログ
    console.log('[V1900-CONVERT] ' + business.companyName + ':', {
      inputMaxFloors: business.maxFloors,
      inputCities: business.cities?.substring(0, 50),
      outputMaxFloors: converted.maxFloors,
      outputCitiesCount: converted.citiesArray.length
    });

    return converted;
  },

  /**
   * V1947: 郵便番号による業者フィルタリング（パフォーマンス最適化）
   * @param {string} originPostalCode - 起点郵便番号（7桁）
   * @param {Array} franchises - 業者リスト
   * @param {number} limit - 抽出する業者数（デフォルト10）
   * @returns {Array} フィルタリング後の業者リスト
   */
  filterByPostalCode(originPostalCode, franchises, limit = 10) {
    console.log('[V1947] 郵便番号フィルタリング開始');
    console.log('[V1947] 起点郵便番号:', originPostalCode);
    console.log('[V1947] 対象業者数:', franchises.length);

    // 郵便番号がない場合はフィルタリングしない
    if (!originPostalCode || originPostalCode.length !== 7) {
      console.warn('[V1947] 起点郵便番号が無効 - フィルタリングスキップ');
      return franchises;
    }

    // 各業者に郵便番号マッチ度を計算
    const scored = franchises.map(franchise => {
      const postalCode = franchise.postalCode || '';

      // 郵便番号がない業者はマッチ度0
      if (!postalCode || postalCode.length !== 7) {
        return {
          franchise: franchise,
          score: 0,
          matchDigits: 0
        };
      }

      // 左から何桁一致するかカウント
      let matchDigits = 0;
      for (let i = 0; i < 7; i++) {
        if (originPostalCode[i] === postalCode[i]) {
          matchDigits++;
        } else {
          break; // 不一致があったら終了
        }
      }

      // スコア計算（左の桁ほど重要）
      // 7桁一致: 1000点, 6桁一致: 100点, 5桁一致: 50点, 4桁一致: 10点, 3桁一致: 5点
      const score = matchDigits >= 7 ? 1000 :
                   matchDigits >= 6 ? 100 :
                   matchDigits >= 5 ? 50 :
                   matchDigits >= 4 ? 10 :
                   matchDigits >= 3 ? 5 : 0;

      return {
        franchise: franchise,
        score: score,
        matchDigits: matchDigits
      };
    });

    // スコアで降順ソート
    scored.sort((a, b) => b.score - a.score);

    // 上位limit件を抽出
    const filtered = scored.slice(0, limit).map(item => item.franchise);

    console.log('[V1947] フィルタリング結果:');
    console.log('[V1947] - 抽出業者数:', filtered.length);
    scored.slice(0, Math.min(10, scored.length)).forEach((item, index) => {
      console.log(`[V1947] - ${index + 1}位: ${item.franchise.companyName} (${item.franchise.postalCode || '郵便番号なし'}) マッチ度: ${item.matchDigits}桁 スコア: ${item.score}`);
    });

    return filtered;
  },

  /**
   * Google Maps Distance Matrix APIで距離を計算（V1880: 新実装）
   * @param {string} originAddress - 起点住所（物件）
   * @param {Array} franchises - 業者リスト
   * @returns {Promise<Array>} 距離情報付き業者リスト
   */
  async calculateDistances(originAddress, franchises) {
    try {
      console.log('[BusinessSelection] 距離計算開始:', originAddress);

      // GASに距離計算を依頼
      const response = await window.apiClient.jsonpRequest('calculateDistances', {
        origin: originAddress,
        destinations: franchises.map(f => {
          // 支店住所があれば支店、なければ本社住所を使用
          return f.city ? `${f.serviceAreas[0]}${f.city}` : f.serviceAreas[0];
        })
      });

      if (!response || !response.success) {
        console.warn('[BusinessSelection] 距離計算失敗:', response?.error);
        return franchises; // 距離情報なしで返す
      }

      // 距離情報を業者リストに追加
      const distances = response.distances || [];
      franchises.forEach((franchise, index) => {
        if (distances[index]) {
          franchise.distance = distances[index].distanceValue || 999999; // メートル単位
          franchise.distanceText = distances[index].distanceText || '';
          franchise.durationText = distances[index].durationText || '';
        }
      });

      console.log('[BusinessSelection] 距離計算完了');
      return franchises;

    } catch (error) {
      console.error('[BusinessSelection] 距離計算エラー:', error);
      return franchises; // エラー時も距離情報なしで返す
    }
  },

  /**
   * V1913: ソート順を変更してUIを再描画（async対応）
   * @param {string} sortType - 'user', 'cheap', 'review', 'premium', 'distance'
   */
  async applySortAndRender(sortType) {
    // ソート順を保存
    this.currentSortType = sortType;

    // ========== V1925: デバッグログ追加 ==========
    console.log('%c[V1925-DEBUG] applySortAndRender開始', 'color: #0000ff; font-weight: bold; font-size: 16px');
    console.log('[V1925-DEBUG] 現在のcheckedCompanies:', Array.from(this.checkedCompanies));
    console.log('[V1925-DEBUG] sortType:', sortType);

    // V1924: 現在の希望社数ドロップダウンの値を取得（ユーザー変更を尊重）
    const franchiseCountSelect = document.getElementById('franchiseCount');
    const currentDesiredCount = franchiseCountSelect?.value || '3社';

    // 現在のデータでカードを再生成
    const selectionData = {
      desiredCount: currentDesiredCount,
      selectedCompanies: this.userSelectedCompanies,
      allFranchises: this.allFranchises
    };

    const businessCards = await this.generateBusinessCards(
      selectionData,
      this.currentSortType,
      this.showAll,
      this.searchQuery
    );

    // ========== V1925: デバッグログ追加 ==========
    console.log('[V1925-DEBUG] 生成されたカード数:', businessCards.length);
    businessCards.forEach(c => {
      console.log(`[V1925-DEBUG] ${c.companyName}: shouldCheck=${c.shouldCheck}`);
    });

    // UIを更新（V1924: 希望社数は上書きしない）
    this.updateUI(businessCards, currentDesiredCount, false);

    console.log('[V1913] ソート順変更:', {
      sortType: this.currentSortType,
      cardsCount: businessCards.length,
      desiredCount: currentDesiredCount
    });
  },

  /**
   * 業者リストをソート（V1890: マッチ度優先 → 同率内でソート条件適用）
   * @param {string} sortType - 'user', 'cheap', 'review', 'premium', 'distance'
   * @param {Array} franchises - 業者リスト
   * @returns {Array} ソート済み業者リスト
   */
  sortFranchises(sortType, franchises) {
    // AS列業者とそれ以外に分離
    const userSelected = [];
    const others = [];

    franchises.forEach(f => {
      const isUserSelected = this.isUserSelected(f.companyName);
      if (isUserSelected) {
        userSelected.push(f);
      } else {
        others.push(f);
      }
    });

    // V1890: マッチ度を計算して各業者に付与
    const othersWithMatchRate = others.map(f => {
      const matchResult = this.calculateMatchRate(f);
      return {
        ...f,
        _matchRate: matchResult.total
      };
    });

    // V1890: 三段階ソート実装（ユーザー選択 > マッチ度 > ソート条件）
    let sortedOthers = [...othersWithMatchRate];

    // 第一段階: マッチ度でソート（降順 = 高い方が優先）
    sortedOthers.sort((a, b) => {
      return (b._matchRate || 0) - (a._matchRate || 0);
    });

    // 第二段階: マッチ度が同じ場合、ソート条件を適用
    // Stable sortを実現するため、同じマッチ度のグループごとにソート
    const groupedByMatchRate = {};
    sortedOthers.forEach(f => {
      const rate = f._matchRate || 0;
      if (!groupedByMatchRate[rate]) {
        groupedByMatchRate[rate] = [];
      }
      groupedByMatchRate[rate].push(f);
    });

    // 各マッチ度グループ内でソート条件を適用
    sortedOthers = [];
    Object.keys(groupedByMatchRate)
      .sort((a, b) => parseFloat(b) - parseFloat(a)) // マッチ度降順
      .forEach(rate => {
        let group = groupedByMatchRate[rate];

        // sortTypeに応じてグループ内をソート
        switch (sortType) {
          case 'user':
            // ユーザー選択（おすすめ順）: 売上高順
            group = this.sortByRevenue(group);
            break;
          case 'cheap':
            // 安い順: 価格昇順
            group = this.sortByPrice(group);
            break;
          case 'review':
            // 口コミ順: レビュー評価順
            group = this.sortByReview(group);
            break;
          case 'premium':
            // 高品質順: 高額順
            group = this.sortByPremium(group);
            break;
          case 'distance':
            // 距離順: 距離昇順
            group = this.sortByDistance(group);
            break;
          default:
            // デフォルトはマッチ度順のまま
            break;
        }

        sortedOthers.push(...group);
      });

    // AS列業者を最初に配置（希望社数分の枠を占有）
    // V1890: ユーザー選択 > マッチ度 > ソート条件 の三段階ソート完成
    return [...userSelected, ...sortedOthers];
  },

  /**
   * AS列業者かどうかを判定
   * @param {string} companyName - 会社名
   * @returns {boolean}
   */
  isUserSelected(companyName) {
    return this.userSelectedCompanies.some(selected => {
      return companyName && companyName.includes(selected) ||
             selected.includes(companyName || '');
    });
  },

  /**
   * 売上高順ソート（おすすめ順）
   * @param {Array} franchises - 業者リスト
   * @returns {Array} ソート済みリスト
   */
  sortByRevenue(franchises) {
    return [...franchises].sort((a, b) => {
      // 売上高 = 平均成約金額 × 成約件数
      const revenueA = (a.avgContractAmount || 0) * (a.contractCount || 0);
      const revenueB = (b.avgContractAmount || 0) * (b.contractCount || 0);
      return revenueB - revenueA;
    });
  },

  /**
   * 価格昇順ソート（安い順）
   * @param {Array} franchises - 業者リスト
   * @returns {Array} ソート済みリスト
   */
  sortByPrice(franchises) {
    return [...franchises].sort((a, b) => {
      return (a.avgContractAmount || 999999) - (b.avgContractAmount || 999999);
    });
  },

  /**
   * 口コミ順ソート
   * @param {Array} franchises - 業者リスト
   * @returns {Array} ソート済みリスト
   */
  sortByReview(franchises) {
    return [...franchises].sort((a, b) => {
      // 評価 → 口コミ件数の順
      if (b.rating !== a.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });
  },

  /**
   * 高品質順ソート（高額順）
   * @param {Array} franchises - 業者リスト
   * @returns {Array} ソート済みリスト
   */
  sortByPremium(franchises) {
    return [...franchises].sort((a, b) => {
      return (b.avgContractAmount || 0) - (a.avgContractAmount || 0);
    });
  },

  /**
   * 距離順ソート
   * @param {Array} franchises - 業者リスト
   * @returns {Array} ソート済みリスト
   */
  sortByDistance(franchises) {
    return [...franchises].sort((a, b) => {
      return (a.distance || 999999) - (b.distance || 999999);
    });
  },

  /**
   * V1921: 現在チェックされている業者名を取得（グローバルSet管理）
   * @returns {Array<string>} チェック済み業者名の配列
   */
  getCheckedCompanies() {
    return Array.from(this.checkedCompanies);
  },

  /**
   * V1921: チェック状態を同期（DOMとSetを同期）
   */
  syncCheckedState() {
    // DOMの現在のチェック状態をSetに反映
    const checkboxes = document.querySelectorAll('.franchise-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const card = checkbox.closest('.franchise-item');
      if (card) {
        const companyName = card.getAttribute('data-franchise-id');
        if (companyName) {
          if (checkbox.checked) {
            this.checkedCompanies.add(companyName);
          } else {
            this.checkedCompanies.delete(companyName);
          }
        }
      }
    });
    console.log('[V1921] Synced checked state:', Array.from(this.checkedCompanies));
  },

  /**
   * V1913: ひらがなをカタカナに変換
   * @param {string} str - 変換する文字列
   * @returns {string} カタカナに変換された文字列
   */
  hiraganaToKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  },

  /**
   * V1913: 全アクティブ加盟店を取得（検索用）
   * @returns {Promise<Array>} 全アクティブ加盟店配列
   */
  async getAllActiveFranchises() {
    try {
      console.log('[BusinessSelection] 全アクティブ加盟店取得開始');
      const response = await window.apiClient.jsonpRequest('getAllActiveFranchises', {});

      if (!response || !response.success) {
        throw new Error(response?.error || '全加盟店取得失敗');
      }

      console.log('[BusinessSelection] 全アクティブ加盟店数:', response.count);
      return response.franchises || [];

    } catch (error) {
      console.error('[BusinessSelection] 全アクティブ加盟店取得エラー:', error);
      return [];
    }
  },

  /**
   * 検索フィルタリング（V1880: 修正版 - チェックボックスは転送候補選択用）
   * @param {string} query - 検索クエリ
   * @param {Array} franchises - 業者リスト
   * @returns {Array} フィルタ済みリスト
   */
  filterBySearch(query, franchises) {
    if (!query) return franchises;

    // AS列業者とそれ以外に分離
    const userSelected = [];
    const others = [];

    franchises.forEach(f => {
      const isUserSelected = this.isUserSelected(f.companyName);
      if (isUserSelected) {
        userSelected.push(f);
      } else {
        others.push(f);
      }
    });

    // V1911: 検索クエリでフィルタリング（AS列以外の業者、かな検索対応）
    const filtered = others.filter(f => {
      const companyName = f.companyName || '';
      const companyNameKana = f.companyNameKana || '';
      // 会社名（漢字）またはカナで部分一致
      return companyName.includes(query) || companyNameKana.includes(query);
    });

    // AS列業者を最初に配置（検索中でも常に表示）
    return [...userSelected, ...filtered];
  },

  /**
   * 業者カードを生成（V1913: 全加盟店検索 + ひらがな対応）
   * @param {object} selectionData - { desiredCount, selectedCompanies, allFranchises }
   * @param {string} sortType - ソート順
   * @param {boolean} showAll - もっと見る状態
   * @param {string} searchQuery - 検索クエリ
   * @returns {Array} 表示用業者カード配列
   */
  async generateBusinessCards(selectionData, sortType = 'user', showAll = false, searchQuery = '') {
    const { allFranchises } = selectionData;

    let displayFranchises = [];
    const currentCheckedCompanies = this.getCheckedCompanies();

    // V1920: 検索時 vs 通常時の処理を完全分離
    if (searchQuery) {
      // === 検索モード: allFranchises から検索（マッチ率保持） ===
      console.log('[V1920-SEARCH] 検索モード開始:', searchQuery);

      // ひらがな→カタカナ変換
      const katakanaQuery = this.hiraganaToKatakana(searchQuery);
      console.log('[V1920-SEARCH] カタカナ変換:', searchQuery, '→', katakanaQuery);

      // V1920: allFranchises から検索（マッチ率データが既に含まれている）
      const matchedFranchises = allFranchises.filter(f => {
        const companyName = f.companyName || '';
        const companyNameKana = f.companyNameKana || '';

        return companyName.includes(searchQuery) ||
               companyName.includes(katakanaQuery) ||
               companyNameKana.includes(searchQuery) ||
               companyNameKana.includes(katakanaQuery);
      });

      // V1920: チェック済みを先頭にグループ化
      const checkedMatched = matchedFranchises.filter(f =>
        currentCheckedCompanies.includes(f.companyName)
      );
      const uncheckedMatched = matchedFranchises.filter(f =>
        !currentCheckedCompanies.includes(f.companyName)
      );

      displayFranchises = [...checkedMatched, ...uncheckedMatched];
      console.log('[V1920-SEARCH] 検索結果:', matchedFranchises.length, '件（✓', checkedMatched.length, '+ 未', uncheckedMatched.length, '）');
    } else {
      // === 通常モード: ソート順で表示 ===
      displayFranchises = this.sortFranchises(sortType, allFranchises);

      // V1920: チェック済みを先頭にグループ化、各グループ内でソート順維持
      const limit = showAll ? 8 : 4;

      if (currentCheckedCompanies.length > 0) {
        // チェック済みグループ（ソート順維持、全件表示）
        const checkedFranchises = displayFranchises.filter(f =>
          currentCheckedCompanies.includes(f.companyName)
        );

        // 未チェックグループ（ソート順維持、件数制限あり）
        const uncheckedFranchises = displayFranchises.filter(f =>
          !currentCheckedCompanies.includes(f.companyName)
        ).slice(0, limit);

        displayFranchises = [...checkedFranchises, ...uncheckedFranchises];
        console.log('[V1920-NORMAL] チェック済み先頭: ✓', checkedFranchises.length, '件 → 未', uncheckedFranchises.length, '件');
      } else {
        // チェックなし: 通常の件数制限
        displayFranchises = displayFranchises.slice(0, limit);
      }
    }

    const topFranchises = displayFranchises;

    // V1920: カード生成（チェックボックス状態を保持）
    return topFranchises.map((franchise, index) => {
      const rank = index + 1;
      const isUserSelected = this.isUserSelected(franchise.companyName);

      // マッチ率を計算
      const matchRate = this.calculateMatchRate(franchise);

      // V1924: チェック条件 = Set に含まれるか（ユーザー操作を完全に尊重）
      const shouldCheck = this.checkedCompanies.has(franchise.companyName);

      return {
        rank,
        franchiseId: franchise.franchiseId,
        companyName: franchise.companyName,
        serviceAreas: franchise.serviceAreas,
        city: franchise.city,
        matchRate: matchRate.total,
        isUserSelected,
        matchDetails: matchRate.details,
        shouldCheck,
        avgContractAmount: franchise.avgContractAmount,
        rating: franchise.rating,
        reviewCount: franchise.reviewCount,
        distance: franchise.distance,
        distanceText: franchise.distanceText,
        durationText: franchise.durationText,
        // V1911: 住所情報追加
        address: franchise.address,
        branchAddress: franchise.branchAddress,
        companyNameKana: franchise.companyNameKana
      };
    });
  },

  /**
   * マッチ率を計算（V1895: 5項目に拡張 - エリア20点、工事40点、築年数15点、物件種別15点、階数10点）
   * @param {object} franchise - 業者データ
   * @returns {object} { total: number, details: object }
   */
  calculateMatchRate(franchise) {
    let total = 0;
    const details = {
      area: { matched: false, required: '', available: [], score: 0, maxScore: 20 },
      workTypes: { matched: [], unmatched: [], score: 0, maxScore: 40 },
      buildingAge: { matched: false, caseAge: 0, franchiseMin: 0, franchiseMax: 0, score: 0, maxScore: 15 },
      propertyType: { matched: false, caseType: '', franchiseTypes: [], score: 0, maxScore: 15 },
      floors: { matched: false, caseFloors: 0, franchiseMax: '', score: 0, maxScore: 10 }
    };

    // エリアマッチング（20点）- 都道府県 OR 市区町村対応
    const casePrefecture = this.currentCaseData?.prefecture || this.currentCaseData?._rawData?.prefecture || '';
    const caseCity = this.currentCaseData?.city || this.currentCaseData?._rawData?.city || '';
    const franchiseAreas = franchise.serviceAreas || [];
    const franchiseCities = franchise.citiesArray || [];

    details.area.required = caseCity || casePrefecture;
    details.area.available = franchiseAreas;

    // 都道府県の接尾辞を除外して比較
    const normalizePrefecture = (pref) => {
      if (!pref) return '';
      return pref.replace(/[都道府県]$/, '');
    };

    // 都道府県マッチング
    const normalizedCase = normalizePrefecture(casePrefecture);
    const isPrefectureMatch = casePrefecture && franchiseAreas.some(area => {
      const normalizedArea = normalizePrefecture(area);
      return normalizedCase === normalizedArea;
    });

    // 市区町村マッチング（E列「対応市区町村」との照合）
    const isCityMatch = caseCity && franchiseCities.length > 0 && franchiseCities.some(city => {
      // 完全一致 または 部分一致（横浜市西区 vs 横浜市西区 or 西区 vs 横浜市西区）
      return city.includes(caseCity) || caseCity.includes(city);
    });

    // エリアマッチ = 都道府県マッチ OR 市区町村マッチ
    const isAreaMatch = isPrefectureMatch || isCityMatch;

    if (isAreaMatch) {
      total += 20;
      details.area.matched = true;
      details.area.score = 20;
    }

    // 工事種別マッチング（40点）- V1901: イレギュラーパターン対応
    const caseWorkTypes = this.extractWorkTypes();
    const franchiseWorkTypes = franchise.workTypes || [];

    if (caseWorkTypes.length > 0 && franchiseWorkTypes.length > 0) {
      // V1902: お客様が依頼している外壁・屋根工事を抽出
      const caseWallWorks = caseWorkTypes.filter(w => w.startsWith('外壁'));
      const caseRoofWorks = caseWorkTypes.filter(w => w.startsWith('屋根'));

      const matched = []; // V1908: 業者が持っているマッチした工事種別（業者側の正式名称）
      const unmatched = [];

      // 各工事種別を個別にチェック
      caseWorkTypes.forEach(caseWork => {
        let isMatched = false;

        // 完全一致チェック
        if (franchiseWorkTypes.includes(caseWork)) {
          matched.push(caseWork); // 完全一致の場合は同じ名称
          isMatched = true;
        } else {
          // V1903: イレギュラーパターンの厳格マッチング（外壁主要工事・屋根主要工事ベース）
          for (const franchiseWork of franchiseWorkTypes) {
            // パターン1: 「X（外壁工事含む）」
            // 条件: お客様が外壁主要工事（外壁塗装/カバー工法/張替え）を依頼 + 業者がその外壁主要工事を持っている
            // 例: 業者["外壁塗装", "屋根塗装（外壁工事含む）"] + お客様["外壁塗装", "屋根塗装"] → 両方マッチ
            // 逆例: 業者["外壁張替え", "屋根塗装（外壁工事含む）"] + お客様["外壁塗装", "屋根塗装"] → 屋根塗装はNG
            if (franchiseWork.includes('（外壁工事含む）')) {
              const baseWork = franchiseWork.replace('（外壁工事含む）', '').trim();
              if (baseWork === caseWork) {
                // お客様が外壁主要工事を依頼しているかチェック
                const caseMajorWallWorks = caseWorkTypes.filter(w => MAJOR_WALL_WORKS.includes(w));
                if (caseMajorWallWorks.length > 0) {
                  // 業者がお客様の希望する外壁主要工事を持っているかチェック
                  const franchiseHasMajorWallWork = caseMajorWallWorks.some(majorWork =>
                    franchiseWorkTypes.includes(majorWork)
                  );
                  if (franchiseHasMajorWallWork) {
                    matched.push(franchiseWork); // V1908: 業者��の正式名称を追加
                    isMatched = true;
                    break;
                  }
                }
              }
            }

            // パターン2: 「X（屋根工事含む）」
            // 条件: お客様が屋根主要工事（屋根葺き替え/カバー工法）を依頼 + 業者がその屋根主要工事を持っている
            // 例: 業者["屋根カバー工法", "屋根雨漏り修繕（屋根工事含む）"] + お客様["屋根カバー工法", "屋根雨漏り修繕"] → 両方マッチ
            if (franchiseWork.includes('（屋根工事含む）')) {
              const baseWork = franchiseWork.replace('（屋根工事含む）', '').trim();
              if (baseWork === caseWork) {
                // お客様が屋根主要工事を依頼しているかチェック
                const caseMajorRoofWorks = caseWorkTypes.filter(w => MAJOR_ROOF_WORKS.includes(w));
                if (caseMajorRoofWorks.length > 0) {
                  // 業者がお客様の希望する屋根主要工事を持っているかチェック
                  const franchiseHasMajorRoofWork = caseMajorRoofWorks.some(majorWork =>
                    franchiseWorkTypes.includes(majorWork)
                  );
                  if (franchiseHasMajorRoofWork) {
                    matched.push(franchiseWork); // V1908: 業者側の正式名称を追加
                    isMatched = true;
                    break;
                  }
                }
              }
            }

            // パターン3: 「X単品」は単独カテゴリ依頼時にXをカバー
            // 正式名称は「屋根塗装単品」「外壁補修単品」など（括弧なし）
            // 条件: お客様がそのカテゴリ（外壁 or 屋根）のみを依頼している
            if (franchiseWork.endsWith('単品')) {
              const baseWork = franchiseWork.replace('単品', '').trim();
              if (baseWork === caseWork) {
                // 外壁系単品 → 外壁のみ依頼、屋根系単品 → 屋根のみ依頼
                const isWallWork = caseWork.startsWith('外壁');
                const isRoofWork = caseWork.startsWith('屋根');

                if (isWallWork && caseWallWorks.length > 0 && caseRoofWorks.length === 0) {
                  // 外壁のみ依頼
                  matched.push(franchiseWork); // V1908: 業者側の正式名称を追加
                  isMatched = true;
                  break;
                } else if (isRoofWork && caseRoofWorks.length > 0 && caseWallWorks.length === 0) {
                  // 屋根のみ依頼
                  matched.push(franchiseWork); // V1908: 業者側の正式名称を追加
                  isMatched = true;
                  break;
                }
              }
            }
          }
        }

        if (!isMatched) {
          unmatched.push(caseWork);
        }
      });

      const matchRatio = matched.length / caseWorkTypes.length;
      const score = Math.round(matchRatio * 40);

      total += score;
      details.workTypes.matched = matched;
      details.workTypes.unmatched = unmatched;
      details.workTypes.score = score;
    }

    // 築年数マッチング（15点）
    const rawData = this.currentCaseData?._rawData || {};
    const caseBuildingAge = parseInt(this.currentCaseData?.buildingAge || rawData.buildingAge || 0);

    // 築年数対応範囲を取得（buildingAgeMin/Max優先、なければbuildingAgeRangeをパース）
    let franchiseBuildingAgeMin = franchise.buildingAgeMin || 0;
    let franchiseBuildingAgeMax = franchise.buildingAgeMax || 100;

    // buildingAgeRangeが存在する場合はそちらを優先
    if (franchise.buildingAgeRange && !franchise.buildingAgeMin && !franchise.buildingAgeMax) {
      const parsed = this.parseBuildingAgeRange(franchise.buildingAgeRange);
      franchiseBuildingAgeMin = parsed.min;
      franchiseBuildingAgeMax = parsed.max;
    }

    details.buildingAge.caseAge = caseBuildingAge;
    details.buildingAge.franchiseMin = franchiseBuildingAgeMin;
    details.buildingAge.franchiseMax = franchiseBuildingAgeMax;

    if (caseBuildingAge >= franchiseBuildingAgeMin && caseBuildingAge <= franchiseBuildingAgeMax) {
      total += 15;
      details.buildingAge.matched = true;
      details.buildingAge.score = 15;
    }

    // 物件種別と階数の統合マッチング（25点: 物件種別15点 + 階数10点）
    // maxFloorsから物件種別と階数情報を解析: 「戸建て住宅(4階以上まで),アパート・マンション(3階まで)」
    const botAnswers = rawData.botAnswers || {};
    const casePropertyType = botAnswers.q1_propertyType || this.currentCaseData?.propertyType || '';
    const caseFloors = parseInt(botAnswers.q2_floors || this.currentCaseData?.floors || 0);

    const maxFloorsData = this.parseMaxFloorsData(franchise.maxFloors);
    const franchisePropertyTypes = maxFloorsData.propertyTypes;

    details.propertyType.caseType = casePropertyType;
    details.propertyType.franchiseTypes = franchisePropertyTypes;
    details.floors.caseFloors = caseFloors;
    details.floors.franchiseMax = franchise.maxFloors;

    // 物件種別マッチング（15点）
    if (casePropertyType && franchisePropertyTypes.length > 0) {
      // 物件種別を正規化して比較（「戸建て」=「戸建て住宅」、「アパート」=「アパート・マンション」）
      const normalizePropertyType = (type) => {
        if (!type) return '';
        type = type.trim();
        if (type.includes('戸建て') || type.includes('戸建')) return '戸建て';
        if (type.includes('アパート') || type.includes('マンション')) return 'アパート・マンション';
        return type;
      };

      const normalizedCase = normalizePropertyType(casePropertyType);
      const matchedPropertyType = franchisePropertyTypes.find(type => {
        const normalizedFranchise = normalizePropertyType(type);
        return normalizedCase === normalizedFranchise ||
               type.includes(casePropertyType) ||
               casePropertyType.includes(type);
      });

      if (matchedPropertyType) {
        total += 15;
        details.propertyType.matched = true;
        details.propertyType.score = 15;

        // 階数マッチング（10点）- マッチした物件種別の階数制限をチェック
        if (caseFloors > 0) {
          const maxFloorsForType = maxFloorsData.floorsMap[matchedPropertyType];
          if (maxFloorsForType && maxFloorsForType >= caseFloors) {
            total += 10;
            details.floors.matched = true;
            details.floors.score = 10;
          }
        } else {
          // 階数情報がない場合は満点
          total += 10;
          details.floors.matched = true;
          details.floors.score = 10;
        }
      }
    }

    return { total, details };
  },

  /**
   * 築年数対応範囲をパース
   * @param {string} range - 「{min=0, max=95}」形式の文字列
   * @returns {object} { min: number, max: number }
   */
  parseBuildingAgeRange(range) {
    if (!range) return { min: 0, max: 100 };

    try {
      // {min=0, max=95} 形式をパース
      const minMatch = range.match(/min=(\d+)/);
      const maxMatch = range.match(/max=(\d+)/);

      return {
        min: minMatch ? parseInt(minMatch[1]) : 0,
        max: maxMatch ? parseInt(maxMatch[1]) : 100
      };
    } catch (e) {
      return { min: 0, max: 100 };
    }
  },

  /**
   * 最大対応階数データをパース（物件種別と階数を含む）
   * @param {string} maxFloorsStr - 「戸建て住宅(4階以上まで),アパート・マンション(3階まで)」形式
   * @returns {object} { propertyTypes: string[], floorsMap: object }
   */
  parseMaxFloorsData(maxFloorsStr) {
    if (!maxFloorsStr) return { propertyTypes: [], floorsMap: {} };

    const propertyTypes = [];
    const floorsMap = {};

    try {
      // カンマ区切りで分割
      const items = maxFloorsStr.split(',').map(item => item.trim());

      items.forEach(item => {
        // 「戸建て住宅(4階以上まで)」→ propertyType=戸建て住宅, maxFloors=999
        // 「アパート・マンション(3階まで)」→ propertyType=アパート・マンション, maxFloors=3
        const match = item.match(/^(.+?)\((.+?)\)$/);

        if (match) {
          const propertyType = match[1].trim();
          const floorsText = match[2].trim();

          propertyTypes.push(propertyType);

          // 階数を数値に変換
          if (floorsText.includes('以上') || floorsText.includes('高層')) {
            floorsMap[propertyType] = 999;
          } else {
            const numMatch = floorsText.match(/(\d+)/);
            floorsMap[propertyType] = numMatch ? parseInt(numMatch[1]) : 999;
          }
        }
      });
    } catch (e) {
      console.error('[BusinessSelection] maxFloorsパースエラー:', e);
    }

    return { propertyTypes, floorsMap };
  },

  /**
   * 案件データから工事種別を抽出
   * @returns {Array<string>} 工事種別の配列
   */
  extractWorkTypes() {
    const rawData = this.currentCaseData?._rawData || {};
    const botAnswers = rawData.botAnswers || {};
    const workTypes = [];

    // Q9_希望工事内容_外壁
    const wallWorkType = botAnswers.q9_wallWorkType || '';
    if (wallWorkType) {
      workTypes.push(`外壁${wallWorkType}`);
    }

    // Q10_希望工事内容_屋根
    const roofWorkType = botAnswers.q10_roofWorkType || '';
    if (roofWorkType) {
      workTypes.push(`屋根${roofWorkType}`);
    }

    return workTypes;
  },

  /**
   * V1904: 紹介料金を計算（動的ルール対応）
   * @param {number} franchiseCount - 紹介業者数
   * @returns {number} 紹介料金
   *
   * ルール:
   * 1. 1社紹介 → ¥20,000 固定（単品も含む全て）
   * 2. 複数社 + 3F以上 + 戸建て以外 → ¥30,000（ただし単品のみの場合は除外）
   * 3. 複数社 + (戸建てまたは2F以下) → 工事種別の最高料金
   * 4. 複数社 + 単品のみ → 単品料金（¥5,000 or ¥10,000）
   */
  calculateReferralPrice(franchiseCount) {
    // 1社紹介の場合は必ず¥20,000
    if (franchiseCount === 1) {
      return 20000;
    }

    // 工事種別を取得
    const caseWorkTypes = this.extractWorkTypes();
    if (caseWorkTypes.length === 0) {
      return 20000; // デフォルト
    }

    // 単品工事種別（7種類）
    const SINGLE_ITEM_WORKS = [
      '屋根塗装単品',
      '屋上防水単品',
      '外壁補修単品',
      '屋根補修単品',
      'ベランダ防水単品',
      '外壁雨漏り修繕単品',
      '屋根雨漏り修繕単品'
    ];

    // 全て単品かチェック
    const allSingleItems = caseWorkTypes.every(work => SINGLE_ITEM_WORKS.includes(work));

    // 物件種別と階数を取得
    const botAnswers = this.currentCaseData?._rawData?.botAnswers || {};
    const propertyType = botAnswers.q1_propertyType || this.currentCaseData?.propertyType || '';
    const floors = parseInt(botAnswers.q2_floors || this.currentCaseData?.floors || 0);

    // 複数社紹介 + 3階以上 + 戸建て以外 の場合は¥30,000（ただし単品のみは除外）
    if (franchiseCount > 1 && floors >= 3 && propertyType !== '戸建て' && !allSingleItems) {
      console.log('[V1904-PRICE] 3F以上 非戸建て（単品以外）→ ¥30,000');
      return 30000;
    }

    // 通常ケース: 最高料金を返す
    let maxPrice = 0;
    caseWorkTypes.forEach(workType => {
      const price = WORK_TYPE_PRICES[workType] || 20000;
      if (price > maxPrice) {
        maxPrice = price;
      }
    });

    console.log('[V1904-PRICE] 通常料金（最高額）→ ¥' + maxPrice);
    return maxPrice;
  },

  /**
   * 料金をフォーマット（例: 20000 → "¥20,000"）
   * @param {number} price - 料金
   * @returns {string} フォーマット済み料金
   */
  formatReferralPrice(price) {
    return `¥${price.toLocaleString()}`;
  },

  /**
   * チェック済み業者IDを取得
   * @returns {Array<string>}
   */
  getCheckedFranchiseIds() {
    const container = document.getElementById('franchiseListContainer');
    if (!container) return [];

    const checked = container.querySelectorAll('.franchise-item input[type="checkbox"]:checked');
    return Array.from(checked).map(checkbox => {
      return checkbox.closest('.franchise-item').getAttribute('data-franchise-id');
    }).filter(id => id);
  },

  /**
   * V1904: ローディングスピナーを表示
   */
  showLoadingSpinner() {
    const spinner = document.getElementById('franchiseLoadingSpinner');
    const container = document.getElementById('franchiseListContainer');

    if (spinner) {
      spinner.classList.remove('hidden');
      spinner.classList.add('flex');
    }

    if (container) {
      container.classList.add('hidden');
    }
  },

  /**
   * V1904: ローディングスピナーを非表示
   */
  hideLoadingSpinner() {
    const spinner = document.getElementById('franchiseLoadingSpinner');
    const container = document.getElementById('franchiseListContainer');

    if (spinner) {
      spinner.classList.add('hidden');
      spinner.classList.remove('flex');
    }

    if (container) {
      container.classList.remove('hidden');
    }
  },

  /**
   * UIを更新（V1880: 新実装）
   * @param {Array} businessCards - 業者カード配列
   * @param {string} desiredCount - 希望社数
   * @param {boolean} updateDesiredCount - 希望社数を更新するか（V1924: デフォルトtrue）
   */
  updateUI(businessCards, desiredCount, updateDesiredCount = true) {
    // V1904: ローディングスピナーを非表示
    this.hideLoadingSpinner();

    // 1. 希望社数ドロップダウンを更新（V1924: updateDesiredCountがtrueの場合のみ）
    if (updateDesiredCount) {
      const franchiseCountSelect = document.getElementById('franchiseCount');
      if (franchiseCountSelect) {
        // V1924: 現在チェックされている数に基づいて希望社数を設定
        const currentCheckedCount = this.checkedCompanies.size;
        const finalDesiredCount = currentCheckedCount > 0 ? `${currentCheckedCount}社` : desiredCount;
        franchiseCountSelect.value = finalDesiredCount;
        console.log('[BusinessSelection] 希望社数設定:', finalDesiredCount, '(チェック数:', currentCheckedCount, ')');
      }
    }

    // 2. 業者リストコンテナを取得
    const container = document.getElementById('franchiseListContainer');
    if (!container) {
      console.error('[BusinessSelection] franchiseListContainerが見つかりません');
      return;
    }

    // 3. 既存の業者カードをクリア
    container.innerHTML = '';

    // V1903: 紹介業者数を計算（料金計算に使用）
    const franchiseCount = desiredCount;

    // 4. 新しい業者カードを生成
    businessCards.forEach(card => {
      const cardElement = this.createFranchiseCardElement(card, franchiseCount);
      container.appendChild(cardElement);
    });

    // 5. もっと見るボタンの更新
    this.updateShowMoreButton(businessCards.length);

    console.log('[BusinessSelection] UI更新完了:', {
      desiredCount,
      cardsCount: businessCards.length
    });
  },

  /**
   * もっと見るボタンを更新（V1880: 新実装）
   * @param {number} displayedCount - 表示中の業者数
   */
  updateShowMoreButton(displayedCount) {
    const showMoreBtn = document.getElementById('showMoreFranchisesBtn');
    if (!showMoreBtn) return;

    if (displayedCount >= 8 || this.allFranchises.length <= 4) {
      // 8社表示中 or 全体で4社以下の場合はボタンを非表示
      showMoreBtn.style.display = 'none';
    } else {
      showMoreBtn.style.display = 'block';
      showMoreBtn.textContent = this.showAll ? '閉じる' : 'もっと見る（+4社）';
    }
  },

  /**
   * 業者カードの色を決定（V1881: カラーコーディング実装）
   * @param {boolean} isUserSelected - AS列業者かどうか
   * @param {number} matchRate - マッチ率
   * @param {boolean} isChecked - チェック状態
   * @returns {object} { borderClass, bgClass, hoverClass, ringClass }
   */
  getCardColor(isUserSelected, matchRate, isChecked) {
    let borderClass, bgClass, ringClass;

    if (isUserSelected && matchRate === 100) {
      // 1. 100%マッチ + ユーザー選択（AS列）→ 赤
      borderClass = isChecked ? 'border-red-600' : 'border-red-500';
      bgClass = isChecked ? 'bg-red-100' : 'bg-red-50';
      ringClass = 'hover:ring-red-400 focus:ring-red-500';
    } else if (isUserSelected && matchRate < 100) {
      // 2. ユーザー選択だがマッチ度不足 → ピンク
      borderClass = isChecked ? 'border-pink-600' : 'border-pink-500';
      bgClass = isChecked ? 'bg-pink-100' : 'bg-pink-50';
      ringClass = 'hover:ring-pink-400 focus:ring-pink-500';
    } else if (!isUserSelected && matchRate === 100) {
      // 3. 100%マッチだが非ユーザー選択 → オレンジ
      borderClass = isChecked ? 'border-orange-600' : 'border-orange-500';
      bgClass = isChecked ? 'bg-orange-100' : 'bg-orange-50';
      ringClass = 'hover:ring-orange-400 focus:ring-orange-500';
    } else if (!isUserSelected && matchRate > 70) {
      // 4. 高マッチ (>70%) → 黄色
      borderClass = isChecked ? 'border-yellow-600' : 'border-yellow-500';
      bgClass = isChecked ? 'bg-yellow-100' : 'bg-yellow-50';
      ringClass = 'hover:ring-yellow-400 focus:ring-yellow-500';
    } else if (!isUserSelected && matchRate >= 50) {
      // 5. 中マッチ (50-70%) → 黄緑
      borderClass = isChecked ? 'border-lime-600' : 'border-lime-500';
      bgClass = isChecked ? 'bg-lime-100' : 'bg-lime-50';
      ringClass = 'hover:ring-lime-400 focus:ring-lime-500';
    } else {
      // 6. 低マッチ (<50%) → 水色
      borderClass = isChecked ? 'border-sky-600' : 'border-sky-500';
      bgClass = isChecked ? 'bg-sky-100' : 'bg-sky-50';
      ringClass = 'hover:ring-sky-400 focus:ring-sky-500';
    }

    // ホバー時の背景色 (常に同系統の少し濃い色)
    const hoverColorMap = {
      'red': 'hover:bg-red-100',
      'pink': 'hover:bg-pink-100',
      'orange': 'hover:bg-orange-100',
      'yellow': 'hover:bg-yellow-100',
      'lime': 'hover:bg-lime-100',
      'sky': 'hover:bg-sky-100'
    };
    const colorKey = borderClass.split('-')[1]; // 'red', 'pink', etc.
    const hoverClass = hoverColorMap[colorKey] || 'hover:bg-gray-100';

    return { borderClass, bgClass, hoverClass, ringClass };
  },

  /**
   * 業者カードDOMを生成（V1903: 料金表示追加）
   * @param {object} card - 業者カード情報
   * @param {number} franchiseCount - 紹介業者数
   * @returns {HTMLElement} カードDOM
   */
  createFranchiseCardElement(card, franchiseCount = 1) {
    const div = document.createElement('div');

    // カラーコーディング（V1881: 新実装）
    const { borderClass, bgClass, hoverClass, ringClass } = this.getCardColor(
      card.isUserSelected,
      card.matchRate,
      card.shouldCheck
    );

    // V1903: 紹介料金を計算
    const referralPrice = this.calculateReferralPrice(franchiseCount);
    const formattedPrice = this.formatReferralPrice(referralPrice);

    // V1951: iPhone SE最適化 - padding調整 (p-3で統一)
    // ホバー効果: 光る外枠 + 拡大 + 影 + クリック時縮小
    div.className = `franchise-item ${card.shouldCheck ? 'selected' : ''} cursor-pointer border-2 ${borderClass} ${bgClass} rounded-lg p-3 sm:p-4 ${hoverClass} hover:ring-4 ${ringClass} ring-offset-2 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out`;
    div.setAttribute('onclick', 'toggleFranchise(this)');
    div.setAttribute('data-franchise-id', card.franchiseId);
    div.setAttribute('data-match-rate', card.matchRate);
    div.setAttribute('data-user-selected', card.isUserSelected ? 'true' : 'false');
    div.setAttribute('data-referral-price', referralPrice); // V1903: 料金を属性として保存

    // matchDetailsをJSON文字列として保存
    if (card.matchDetails) {
      div.setAttribute('data-match-details', JSON.stringify(card.matchDetails));
    }

    // V1911: 都道府県表示削除、住所をツールチップに表示
    // マッチ率の色を決定（100% = 緑、それ以外 = オレンジ）
    const matchRateColor = card.matchRate === 100 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white';
    const matchRateId = `match-rate-${card.franchiseId}`;

    // V1945: 住所ツールチップ（横書き + 支店箇条書きのみ、星・距離は除外）
    let addressTooltip = '';
    if (card.address || card.branchAddress) {
      addressTooltip = '<div class="text-left">';

      // 本社住所
      if (card.address) {
        addressTooltip += `<div class="font-semibold">本社:</div>`;
        addressTooltip += `<div class="ml-2 mb-1">${card.address}</div>`;
      }

      // 支店住所（箇条書き）
      if (card.branchAddress) {
        const branches = card.branchAddress.split(',').map(b => b.trim()).filter(b => b);
        if (branches.length > 0) {
          addressTooltip += `<div class="font-semibold mt-1">支店:</div>`;
          addressTooltip += '<ul class="list-disc ml-4">';
          branches.forEach(branch => {
            addressTooltip += `<li class="mb-0.5">${branch}</li>`;
          });
          addressTooltip += '</ul>';
        }
      }

      addressTooltip += '</div>';
    } else {
      addressTooltip = '<div>住所未登録</div>';
    }

    // V1951: iPhone SE最適化 - text-xs → text-sm, gap-2 → gap-1.5
    // V1945: 追加情報（評価と距離を同じ行に表示 - 星の右に距離）
    let additionalInfo = '';
    if (card.rating > 0 || card.distanceText) {
      additionalInfo += '<div class="flex items-center gap-1.5 text-sm mt-1">';
      if (card.rating > 0) {
        additionalInfo += `<span class="text-yellow-600">★${card.rating}</span>`;
      }
      if (card.distanceText) {
        additionalInfo += `<span class="text-blue-600">📍 ${card.distanceText}</span>`;
      }
      additionalInfo += '</div>';
    }

    // V1956: モバイル完全縦積みレイアウト - 左寄せ最適化
    div.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <!-- 左側コンテンツ（モバイル: 縦積み / PC: 横並び） -->
        <div class="flex-1">
          <!-- 1行目: 順位 + チェックボックス（モバイル: 左寄せ / PC: 会社名と同じ行） -->
          <div class="flex items-center gap-2 mb-1.5 md:mb-0">
            <div class="text-lg font-semibold text-pink-600 flex-shrink-0 w-7">${card.rank}</div>
            <input type="checkbox" ${card.shouldCheck ? 'checked' : ''} class="w-5 h-5 text-pink-600 rounded flex-shrink-0" onclick="event.stopPropagation()" onchange="handleFranchiseCheck(this, '${card.companyName.replace(/'/g, "\\'")}')">
            <!-- PC時のみ: 会社名を同じ行に表示 -->
            <div class="hidden md:block flex-1 min-w-0">
              <div class="font-semibold text-gray-900 text-base leading-tight">${card.companyName}</div>
            </div>
          </div>

          <!-- 2行目: 会社名（モバイルのみ / PC: 非表示） -->
          <div class="md:hidden mb-1.5">
            <div class="font-semibold text-gray-900 text-base leading-tight">${card.companyName}</div>
          </div>

          <!-- 3行目: アイコン類（ユーザー選択、地図、星評価・距離） -->
          <div class="flex items-center gap-2 flex-wrap">
            ${card.isUserSelected ? '<span class="relative inline-block group cursor-help" onclick="event.stopPropagation();"><span class="inline-flex items-center justify-center w-5 h-5 bg-pink-600 text-white rounded"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg></span><span class="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap transition-opacity duration-200 z-50 pointer-events-none">ユーザー選択</span></span>' : ''}
            <span class="relative inline-block group cursor-help" onclick="event.stopPropagation();">
              <span class="inline-flex items-center justify-center w-5 h-5 text-yellow-500">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </span>
              <span class="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded transition-opacity duration-200 z-50 pointer-events-none min-w-max max-w-sm" style="writing-mode: horizontal-tb !important;">
                ${addressTooltip}
              </span>
            </span>
            ${additionalInfo}
          </div>
        </div>

        <!-- 右側: マッチ率・金額（モバイル: 右下 / PC: 右端） -->
        <div class="text-right flex-shrink-0 self-end md:self-center">
          <div id="${matchRateId}" class="inline-block px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer hover:shadow-lg transition-shadow ${matchRateColor}"
               onclick="event.stopPropagation();"
               title="クリックで詳細を表示">
            ${card.matchRate}%
          </div>
          <div class="mt-1 text-sm font-bold text-green-600 whitespace-nowrap">
            ${formattedPrice}
          </div>
        </div>
      </div>
    `;

    // V1922: マッチ率バッジにクリックイベントを追加
    setTimeout(() => {
      const matchRateBadge = document.getElementById(matchRateId);
      if (matchRateBadge && card.matchDetails) {
        matchRateBadge.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showMatchDetailsModal(card.matchDetails, card.companyName, card.matchRate);
        });
      }
    }, 0);

    return div;
  },

  /**
   * 価格をフォーマット
   * @param {number} price - 価格
   * @returns {string} フォーマット済み価格
   */
  formatPrice(price) {
    if (price >= 10000) {
      return `${Math.round(price / 10000)}万円`;
    }
    return `${price.toLocaleString()}円`;
  },

  /**
   * マッチ度詳細モーダルを表示
   * @param {object} matchDetails - マッチ詳細情報
   * @param {string} companyName - 業者名
   * @param {number} matchRate - マッチ率
   */
  showMatchDetailsModal(matchDetails, companyName, matchRate) {
    if (!matchDetails) return;

    // 案件データから詳細情報を取得
    const caseCity = this.currentCaseData?.city || this.currentCaseData?._rawData?.city || '';
    const rawData = this.currentCaseData?._rawData || {};
    const botAnswers = rawData.botAnswers || {};

    // ユーザーの希望工事内容を取得
    const userWallWork = botAnswers.q9_wallWorkType || '';
    const userRoofWork = botAnswers.q10_roofWorkType || '';
    const userWorkTypes = [];
    if (userWallWork) userWorkTypes.push(`外壁${userWallWork}`);
    if (userRoofWork) userWorkTypes.push(`屋根${userRoofWork}`);

    // 業者データを取得（業者の全工事種別と特殊対応を取得）
    const franchise = this.allFranchises.find(f => f.companyName === companyName);
    const allFranchiseWorkTypes = franchise?.workTypes || [];
    const specialSupport = franchise?.specialSupport || '';
    const franchiseCities = franchise?.citiesArray || [];

    // V1900: 徹底デバッグログ - データ取得状況確認
    console.log('[V1900-DEBUG] モーダル表示データ:', {
      companyName,
      matchRate,
      allFranchisesCount: this.allFranchises.length,
      allFranchisesCompanies: this.allFranchises.map(f => f.companyName),
      franchise: franchise,
      citiesArray: franchise?.citiesArray,
      maxFloors: franchise?.maxFloors,
      buildingAgeMin: franchise?.buildingAgeMin,
      buildingAgeMax: franchise?.buildingAgeMax,
      specialSupport: franchise?.specialSupport
    });

    if (!franchise) {
      console.error('[V1900-ERROR] franchise not found for:', companyName);
      console.error('[V1900-ERROR] Available franchises:', this.allFranchises);
    } else if (!franchise.maxFloors) {
      console.error('[V1900-ERROR] maxFloors is empty for:', companyName, franchise);
    }

    const modalHTML = `
      <div id="matchDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target === this) this.remove()">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-900">${companyName}</h3>
            <button onclick="document.getElementById('matchDetailsModal').remove()" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-2xl font-bold ${matchRate === 100 ? 'text-green-600' : 'text-orange-600'}">${matchRate}%</span>
              ${matchRate === 100
                ? '<span class="text-sm text-green-600 font-semibold">✓ 自動転送可能</span>'
                : '<span class="text-sm text-red-600 font-semibold">✗ 自動転送不可</span>'}
            </div>
          </div>

          ${matchRate < 100 ? `
            <!-- 不足項目サマリー -->
            <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 class="font-bold text-red-700 mb-2">⚠ 業者へ連絡が必要な不足項目</h4>
              <div class="text-sm text-red-800 space-y-1">
                ${!matchDetails.area.matched ? `
                  <div>• <span class="font-semibold">エリア不足:</span> ${matchDetails.area.required} への対応が必要です</div>
                ` : ''}
                ${matchDetails.workTypes.unmatched.length > 0 ? `
                  <div>• <span class="font-semibold">工事種別不足:</span> ${matchDetails.workTypes.unmatched.join(', ')} への対応が必要です</div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <div class="space-y-4">
            <!-- V1907: エリアマッチング（記号追加 + 色統一） -->
            <div class="border-l-4 ${matchDetails.area.matched ? 'border-green-500' : 'border-red-500'} pl-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold ${matchDetails.area.matched ? 'text-green-600' : 'text-red-600'}">${matchDetails.area.matched ? '◎エリアマッチ' : '✗エリア非マッチ'}</span>
                <span class="text-sm ${matchDetails.area.matched ? 'text-green-600' : 'text-red-600'}">
                  ${matchDetails.area.score} / ${matchDetails.area.maxScore}点
                </span>
              </div>
              <div class="text-sm space-y-2">
                <!-- 案件エリア詳細 -->
                <div class="bg-blue-50 p-2 rounded">
                  <div class="font-semibold text-blue-900 mb-1">📍 案件エリア（お客様）</div>
                  ${caseCity ? `<div class="text-blue-800">市区町村: <span class="font-medium">${caseCity}</span></div>` : '<div class="text-gray-500">未設定</div>'}
                </div>
                <!-- 業者対応エリア詳細 -->
                <div class="${matchDetails.area.matched ? 'bg-green-50' : 'bg-red-50'} p-2 rounded">
                  <div class="font-semibold ${matchDetails.area.matched ? 'text-green-900' : 'text-red-900'} mb-1">🏢 業者の対応エリア（市区町村）</div>
                  <div class="${matchDetails.area.matched ? 'text-green-700' : 'text-red-700'}">
                    ${(() => {
                      if (franchiseCities.length === 0) return '未設定';

                      // マッチした市区町村を先頭に表示
                      const matchedCity = caseCity && franchiseCities.find(c => c.includes(caseCity) || caseCity.includes(c));
                      const otherCities = franchiseCities.filter(c => c !== matchedCity);

                      let html = '';
                      if (matchedCity) {
                        html += `<div class="font-semibold text-green-700">• ${matchedCity}</div>`;
                      }

                      if (otherCities.length > 0) {
                        const otherId = 'other-cities-' + Math.random().toString(36).substring(2, 11);
                        html += `<button onclick="document.getElementById('${otherId}').classList.toggle('hidden')" class="mt-1 text-sm text-blue-600 hover:text-blue-800 underline">
                          その他 (+${otherCities.length}市区町村)
                        </button>`;
                        html += `<div id="${otherId}" class="hidden mt-2 text-sm">${otherCities.sort().map(c => `• ${c}`).join('<br>')}</div>`;
                      }

                      return html || '未設定';
                    })()}
                  </div>
                </div>
                ${!matchDetails.area.matched ? `
                  <div class="text-red-600 font-semibold">→ 業者に ${matchDetails.area.required} への対応追加を依頼</div>
                ` : ''}
              </div>
            </div>

            <!-- V1907: 工事種別マッチング（記号追加 + 色統一） -->
            <div class="border-l-4 ${
              matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                ? 'border-green-500'
                : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                  ? 'border-yellow-500'
                  : 'border-red-500'
            } pl-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold ${
                  matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                    ? 'text-green-600'
                    : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }">${
                  matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                    ? '◎工事種別マッチ'
                    : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                      ? '△工事種別一部マッチ'
                      : '✗工事種別非マッチ'
                }</span>
                <span class="text-sm ${
                  matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                    ? 'text-green-600'
                    : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }">
                  ${matchDetails.workTypes.score} / ${matchDetails.workTypes.maxScore}点
                </span>
              </div>
              <div class="text-sm space-y-2">
                <!-- お客様の希望工事 -->
                <div class="bg-blue-50 p-2 rounded">
                  <div class="font-semibold text-blue-900 mb-1">📋 お客様の見積もり希望箇所</div>
                  ${userWorkTypes.length > 0 ? userWorkTypes.map(work => `
                    <div class="text-blue-800">• ${work}</div>
                  `).join('') : '<div class="text-gray-500">未設定</div>'}
                </div>

                <!-- V1907: 業者の対応可能な工事種別（色統一） -->
                <div class="${
                  matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                    ? 'bg-green-50'
                    : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                      ? 'bg-yellow-50'
                      : 'bg-red-50'
                } p-2 rounded">
                  <div class="${
                    matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                      ? 'text-green-900'
                      : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                        ? 'text-yellow-900'
                        : 'text-red-900'
                  } font-semibold mb-1 flex items-center gap-1">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                    対応可能な工事種別（業者登録済み）
                  </div>
                  ${(() => {
                    if (allFranchiseWorkTypes.length === 0) return '<div class="text-gray-500">未設定</div>';

                    // V1906: マッチした工事種別は全て表示、非マッチのみ折りたたみ
                    const matchedWorks = allFranchiseWorkTypes.filter(work => matchDetails.workTypes.matched.includes(work));
                    const otherWorks = allFranchiseWorkTypes.filter(work => !matchDetails.workTypes.matched.includes(work));

                    // マッチした工事種別を全て表示（制限なし）
                    const textColor = matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0
                      ? 'text-green-700'
                      : matchDetails.workTypes.matched.length > 0 && matchDetails.workTypes.unmatched.length > 0
                        ? 'text-yellow-700'
                        : 'text-red-700';

                    let html = matchedWorks.map(work =>
                      '<div class="' + textColor + ' font-semibold">• ' + work + ' ✓</div>'
                    ).join('');

                    // 非マッチ項目があれば折りたたみボタン
                    if (otherWorks.length > 0) {
                      const otherId = 'other-works-' + Math.random().toString(36).substring(2, 11);
                      html += '<button onclick="document.getElementById(\'' + otherId + '\').classList.toggle(\'hidden\')" class="mt-1 text-sm text-blue-600 hover:text-blue-800 underline">' +
                        'その他 (+' + otherWorks.length + '工事種別)' +
                      '</button>';
                      html += '<div id="' + otherId + '" class="hidden mt-2 text-sm space-y-1">' + otherWorks.map(work =>
                        '<div class="' + textColor + '">• ' + work + '</div>'
                      ).join('') + '</div>';
                    }

                    return html;
                  })()}
                </div>

                ${specialSupport ? `
                  <!-- 特殊対応項目 -->
                  <div class="bg-purple-50 p-2 rounded border border-purple-200">
                    <div class="text-purple-700 font-semibold mb-1 flex items-center gap-1">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>
                      特殊対応項目
                    </div>
                    <div class="text-purple-700">${specialSupport}</div>
                  </div>
                ` : ''}

                ${matchDetails.workTypes.unmatched.length > 0 ? `
                  <!-- マッチしていない工事（不足） -->
                  <div class="bg-red-50 p-2 rounded border border-red-200">
                    <div class="text-red-700 font-semibold mb-1 flex items-center gap-1">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>
                      対応不可（業者に追加依頼が必要）
                    </div>
                    ${matchDetails.workTypes.unmatched.map(work => `
                      <div class="text-red-700 font-medium">• ${work}</div>
                    `).join('')}
                    <div class="text-red-600 font-semibold mt-2 text-xs bg-red-100 p-2 rounded">
                      → 業者にこれらの工事種別の追加を依頼してください
                    </div>
                  </div>
                ` : ''}

              </div>
            </div>

            <!-- V1907: 築年数マッチング（記号追加 + 色統一） -->
            <div class="border-l-4 ${matchDetails.buildingAge.matched ? 'border-green-500' : 'border-red-500'} pl-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold ${matchDetails.buildingAge.matched ? 'text-green-600' : 'text-red-600'}">${matchDetails.buildingAge.matched ? '◎築年数マッチ' : '✗築年数非マッチ'}</span>
                <span class="text-sm ${matchDetails.buildingAge.matched ? 'text-green-600' : 'text-red-600'}">
                  ${matchDetails.buildingAge.score} / ${matchDetails.buildingAge.maxScore}点
                </span>
              </div>
              <div class="text-sm space-y-2">
                <div class="bg-blue-50 p-2 rounded">
                  <div class="font-semibold text-blue-900 mb-1">🏠 お客様の物件築年数</div>
                  <div class="text-blue-800">${matchDetails.buildingAge.caseAge}年</div>
                </div>
                <div class="${matchDetails.buildingAge.matched ? 'bg-green-50' : 'bg-red-50'} p-2 rounded">
                  <div class="font-semibold ${matchDetails.buildingAge.matched ? 'text-green-900' : 'text-red-900'} mb-1">🏢 業者の対応築年数範囲</div>
                  <div class="${matchDetails.buildingAge.matched ? 'text-green-700' : 'text-red-700'} font-semibold">${matchDetails.buildingAge.franchiseMin}年 〜 ${matchDetails.buildingAge.franchiseMax}年</div>
                </div>
                ${!matchDetails.buildingAge.matched ? `
                  <div class="text-red-600 font-semibold">→ 業者に築年数範囲の拡大を依頼</div>
                ` : ''}
              </div>
            </div>

            <!-- V1907: 物件種別マッチング（記号追加 + 色統一） -->
            <div class="border-l-4 ${matchDetails.propertyType.matched ? 'border-green-500' : 'border-red-500'} pl-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold ${matchDetails.propertyType.matched ? 'text-green-600' : 'text-red-600'}">${matchDetails.propertyType.matched ? '◎物件種別マッチ' : '✗物件種別非マッチ'}</span>
                <span class="text-sm ${matchDetails.propertyType.matched ? 'text-green-600' : 'text-red-600'}">
                  ${matchDetails.propertyType.score} / ${matchDetails.propertyType.maxScore}点
                </span>
              </div>
              <div class="text-sm space-y-2">
                <div class="bg-blue-50 p-2 rounded">
                  <div class="font-semibold text-blue-900 mb-1">🏠 お客様の物件種別</div>
                  <div class="text-blue-800">${matchDetails.propertyType.caseType || '未設定'}</div>
                </div>
                <div class="${matchDetails.propertyType.matched ? 'bg-green-50' : 'bg-red-50'} p-2 rounded">
                  <div class="font-semibold ${matchDetails.propertyType.matched ? 'text-green-900' : 'text-red-900'} mb-1">🏢 業者の対応可能物件種別</div>
                  <div class="${matchDetails.propertyType.matched ? 'text-green-700' : 'text-red-700'} font-semibold">${matchDetails.propertyType.franchiseTypes.length > 0 ? matchDetails.propertyType.franchiseTypes.join(', ') : '未設定'}</div>
                </div>
                ${!matchDetails.propertyType.matched ? `
                  <div class="text-red-600 font-semibold">→ 業者に物件種別の追加を依頼</div>
                ` : ''}
              </div>
            </div>

            <!-- V1907: 階数マッチング（記号追加 + 色統一） -->
            <div class="border-l-4 ${matchDetails.floors.matched ? 'border-green-500' : 'border-red-500'} pl-3">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold ${matchDetails.floors.matched ? 'text-green-600' : 'text-red-600'}">${matchDetails.floors.matched ? '◎階数マッチ' : '✗階数非マッチ'}</span>
                <span class="text-sm ${matchDetails.floors.matched ? 'text-green-600' : 'text-red-600'}">
                  ${matchDetails.floors.score} / ${matchDetails.floors.maxScore}点
                </span>
              </div>
              <div class="text-sm space-y-2">
                <div class="bg-blue-50 p-2 rounded">
                  <div class="font-semibold text-blue-900 mb-1">🏠 お客様の物件階数</div>
                  <div class="text-blue-800">${matchDetails.floors.caseFloors}階</div>
                </div>
                <div class="${matchDetails.floors.matched ? 'bg-green-50' : 'bg-red-50'} p-2 rounded">
                  <div class="font-semibold ${matchDetails.floors.matched ? 'text-green-900' : 'text-red-900'} mb-1">🏢 業者の対応可能階数</div>
                  <div class="${matchDetails.floors.matched ? 'text-green-700' : 'text-red-700'} font-semibold text-xs">${matchDetails.floors.franchiseMax || '未設定'}</div>
                </div>
                ${!matchDetails.floors.matched ? `
                  <div class="text-red-600 font-semibold">→ 業者に階数対応の拡大を依頼</div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="mt-6 text-center">
            <button onclick="document.getElementById('matchDetailsModal').remove()" class="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;

    // 既存のモーダルを削除
    const existingModal = document.getElementById('matchDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // 新しいモーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  /**
   * ソート順を変更（V1913: async対応、V1946: 距離計算は初期ロード時のみ）
   * @param {string} sortType - ソート順 ('user', 'cheap', 'review', 'premium', 'distance')
   */
  async changeSortOrder(sortType) {
    this.currentSortType = sortType;

    // V1946: 距離情報は初期ロード時に計算済みのため、ここでの再計算は不要

    // V1924: 現在の希望社数ドロップダウンの値を取得（ユーザー変更を尊重）
    const franchiseCountSelect = document.getElementById('franchiseCount');
    const currentDesiredCount = franchiseCountSelect?.value || '3社';

    // カードを再生成して表示
    const businessCards = await this.generateBusinessCards({
      allFranchises: this.allFranchises
    }, sortType, this.showAll, this.searchQuery);

    // V1924: 希望社数は上書きしない
    this.updateUI(businessCards, currentDesiredCount, false);
  },

  /**
   * もっと見る切り替え（V1913: async対応）
   */
  async toggleShowMore() {
    this.showAll = !this.showAll;

    // V1924: 現在の希望社数ドロップダウンの値を取得（ユーザー変更を尊重）
    const franchiseCountSelect = document.getElementById('franchiseCount');
    const currentDesiredCount = franchiseCountSelect?.value || '3社';

    // カードを再生成して表示
    const businessCards = await this.generateBusinessCards({
      allFranchises: this.allFranchises
    }, this.currentSortType, this.showAll, this.searchQuery);

    // V1924: 希望社数は上書きしない
    this.updateUI(businessCards, currentDesiredCount, false);
  },

  /**
   * 検索実行（V1913: async対応 + 全加盟店検索）
   * @param {string} query - 検索クエリ
   */
  async searchFranchises(query) {
    this.searchQuery = query;

    // V1924: 現在の希望社数ドロップダウンの値を取得（ユーザー変更を尊重）
    const franchiseCountSelect = document.getElementById('franchiseCount');
    const currentDesiredCount = franchiseCountSelect?.value || '3社';

    // カードを再生成して表示
    const businessCards = await this.generateBusinessCards({
      allFranchises: this.allFranchises
    }, this.currentSortType, this.showAll, query);

    // V1924: 希望社数は上書きしない
    this.updateUI(businessCards, currentDesiredCount, false);
  },

  // V1936: getSampleFranchises()削除 - フォールバック処理不要
};

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.BusinessSelectionHandler = BusinessSelectionHandler;

  /**
   * V1932: グローバル関数 - チェックボックス変更ハンドラー（必須実装）
   * @param {HTMLInputElement} checkbox - チェックボックス要素
   * @param {string} companyName - 業者名
   */
  window.handleFranchiseCheck = function(checkbox, companyName) {
    console.log('[V1932-handleFranchiseCheck] チェックボックスクリック:', {
      companyName: companyName,
      checked: checkbox.checked,
      現在のcheckedCompanies: Array.from(window.BusinessSelectionHandler.checkedCompanies)
    });

    try {
      // チェック状態をグローバルSetに反映
      if (checkbox.checked) {
        window.BusinessSelectionHandler.checkedCompanies.add(companyName);
        console.log(`[V1932-handleFranchiseCheck] ✅ ${companyName} を追加`);
      } else {
        window.BusinessSelectionHandler.checkedCompanies.delete(companyName);
        console.log(`[V1932-handleFranchiseCheck] ❌ ${companyName} を削除`);
      }

      // 希望社数制限チェック
      const franchiseCountSelect = document.getElementById('franchiseCount');
      const desiredCount = franchiseCountSelect ? parseInt(franchiseCountSelect.value) : 3;
      const checkedCount = window.BusinessSelectionHandler.checkedCompanies.size;

      console.log(`[V1932-handleFranchiseCheck] チェック数: ${checkedCount} / 希望社数: ${desiredCount}`);

      // 希望社数を超えた場合の制御（確認モーダル + 自動インクリメント）
      if (checkbox.checked && checkedCount > desiredCount) {
        console.warn(`[V1942-handleFranchiseCheck] ⚠️ 希望社数(${desiredCount}社)を超えています`);

        // 確認モーダル: 社数を増やすか確認
        const confirmed = confirm(`現在の希望社数は${desiredCount}社です。\n${desiredCount + 1}社に変更しますか？`);

        if (confirmed) {
          // 希望社数を自動更新
          const newCount = desiredCount + 1;
          if (franchiseCountSelect) {
            franchiseCountSelect.value = `${newCount}社`;
          }
          console.log(`[V1942-handleFranchiseCheck] ✅ 希望社数を ${desiredCount}社 → ${newCount}社 に更新`);

          // CF列に保存（非同期）
          if (typeof saveFranchiseCountChange === 'function') {
            saveFranchiseCountChange(`${newCount}社`).catch(err => {
              console.error('[V1942-handleFranchiseCheck] CF列保存エラー:', err);
            });
          }
        } else {
          // キャンセル: チェックを外す
          checkbox.checked = false;
          window.BusinessSelectionHandler.checkedCompanies.delete(companyName);
          console.log(`[V1942-handleFranchiseCheck] ❌ ユーザーがキャンセル - チェックを外しました`);
          return;
        }
      }

      console.log('[V1932-handleFranchiseCheck] ✅ 処理完了:', {
        最終checkedCompanies: Array.from(window.BusinessSelectionHandler.checkedCompanies)
      });

    } catch (error) {
      console.error('[V1932-handleFranchiseCheck] エラー:', error);
      // エラー時はチェックを元に戻す
      checkbox.checked = !checkbox.checked;
    }
  };
}

// V1935 Deploy Trigger v2 - Workflow env var fix + fetch-depth - 20251127-2048
