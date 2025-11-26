/**
 * ============================================
 * 業者選択ハンドラー V1881
 * ============================================
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
 */

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

      // 希望社数を計算
      const desiredCount = this.calculateDesiredCount(selectedCompanies);

      // RankingSystemから業者リストを取得（V1880: 新実装）
      console.log('[BusinessSelection] RankingSystemから業者データ取得開始...');
      const franchises = await this.fetchRankingData(currentCaseData);
      this.allFranchises = franchises;

      console.log('[BusinessSelection] 業者データ取得完了:', franchises.length, '件');

      return {
        desiredCount,
        selectedCompanies,
        allFranchises: franchises
      };

    } catch (error) {
      console.error('[BusinessSelection] データ読み込みエラー:', error);
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

      // RankingSystemのgetRankingを呼び出し
      const response = await window.apiClient.jsonpRequest({
        action: 'getRanking',
        ...params
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'ランキング取得失敗');
      }

      console.log('[BusinessSelection] getRanking APIレスポンス:', response);

      // ランキングデータを統合（recommended, cheap, review, premiumから重複除去してマージ）
      const allFranchises = this.mergeRankingData(response.rankings);

      console.log('[BusinessSelection] 統合後の業者数:', allFranchises.length);

      return allFranchises;

    } catch (error) {
      console.error('[BusinessSelection] RankingSystem取得エラー:', error);
      // フォールバック: サンプルデータを返す
      console.warn('[BusinessSelection] フォールバック: サンプルデータを使用');
      return this.getSampleFranchises();
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
    return {
      franchiseId: business.companyName, // IDの代わりに会社名を使用
      companyName: business.companyName,
      serviceAreas: [business.prefecture].filter(p => p),
      city: business.city || '',
      workTypes: (business.constructionTypes || '').split(',').map(t => t.trim()).filter(t => t),
      avgContractAmount: business.avgContractAmount || 0,
      rating: business.rating || 4.2,
      reviewCount: business.reviewCount || 0,
      contractCount: business.contractCount || 0,
      // V1880: 距離ソート用のデータ
      distance: null,  // 後で計算
      distanceText: '',
      // V1880: previewHP
      previewHP: business.previewHP || ''
    };
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
      const response = await window.apiClient.jsonpRequest({
        action: 'calculateDistances',
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
   * 業者リストをソート（V1880: 5種類のソート対応 - 修正版）
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

    // V1890: 三段階ソート実装（マッチ度優先 → ソート条件）
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

    // 検索クエリでフィルタリング（AS列以外の業者）
    const filtered = others.filter(f => {
      const companyName = f.companyName || '';
      // 漢字/ひらがな部分一致
      return companyName.includes(query);
    });

    // AS列業者を最初に配置（検索中でも常に表示）
    return [...userSelected, ...filtered];
  },

  /**
   * 業者カードを生成（V1880: 新実装）
   * @param {object} selectionData - { desiredCount, selectedCompanies, allFranchises }
   * @param {string} sortType - ソート順
   * @param {boolean} showAll - もっと見る状態
   * @param {string} searchQuery - 検索クエリ
   * @returns {Array} 表示用業者カード配列
   */
  generateBusinessCards(selectionData, sortType = 'user', showAll = false, searchQuery = '') {
    const { allFranchises } = selectionData;

    // ソート（AS列業者が上位に来る）
    let sorted = this.sortFranchises(sortType, allFranchises);

    // 検索（AS列業者は常に表示、それ以外をフィルタ）
    if (searchQuery) {
      sorted = this.filterBySearch(searchQuery, sorted);
    }

    // 表示件数を制限
    const limit = showAll ? 8 : 4;
    const topFranchises = sorted.slice(0, limit);

    // カード生成
    return topFranchises.map((franchise, index) => {
      const rank = index + 1;
      const isUserSelected = this.isUserSelected(franchise.companyName);

      // マッチ率を計算
      const matchRate = this.calculateMatchRate(franchise);

      // デフォルトチェック条件: AS列業者 AND 100%マッチのみ
      const shouldCheck = isUserSelected && matchRate.total === 100;

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
        durationText: franchise.durationText
      };
    });
  },

  /**
   * マッチ率を計算（V1880: 新実装）
   * @param {object} franchise - 業者データ
   * @returns {object} { total: number, details: object }
   */
  calculateMatchRate(franchise) {
    let total = 0;
    const details = {
      area: { matched: false, required: '', available: [], score: 0, maxScore: 40 },
      workTypes: { matched: [], unmatched: [], score: 0, maxScore: 60 }
    };

    // エリアマッチング（40%）- 都道府県 OR 市区町村対応
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
      total += 40;
      details.area.matched = true;
      details.area.score = 40;
    }

    // 工事種別マッチング（60%）
    const caseWorkTypes = this.extractWorkTypes();
    const franchiseWorkTypes = franchise.workTypes || [];

    if (caseWorkTypes.length > 0 && franchiseWorkTypes.length > 0) {
      const matched = caseWorkTypes.filter(w => franchiseWorkTypes.includes(w));
      const unmatched = caseWorkTypes.filter(w => !franchiseWorkTypes.includes(w));
      const matchRatio = matched.length / caseWorkTypes.length;
      const score = Math.round(matchRatio * 60);

      total += score;
      details.workTypes.matched = matched;
      details.workTypes.unmatched = unmatched;
      details.workTypes.score = score;
    }

    return { total, details };
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
   * UIを更新（V1880: 新実装）
   * @param {Array} businessCards - 業者カード配列
   * @param {string} desiredCount - 希望社数
   */
  updateUI(businessCards, desiredCount) {
    // 1. 希望社数ドロップダウンを更新
    const franchiseCountSelect = document.getElementById('franchiseCount');
    if (franchiseCountSelect) {
      franchiseCountSelect.value = desiredCount;
      console.log('[BusinessSelection] 希望社数設定:', desiredCount);
    }

    // 2. 業者リストコンテナを取得
    const container = document.getElementById('franchiseListContainer');
    if (!container) {
      console.error('[BusinessSelection] franchiseListContainerが見つかりません');
      return;
    }

    // 3. 既存の業者カードをクリア
    container.innerHTML = '';

    // 4. 新しい業者カードを生成
    businessCards.forEach(card => {
      const cardElement = this.createFranchiseCardElement(card);
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
   * 業者カードDOMを生成（V1881: カラーコーディング + ホバー効果）
   * @param {object} card - 業者カード情報
   * @returns {HTMLElement} カードDOM
   */
  createFranchiseCardElement(card) {
    const div = document.createElement('div');

    // カラーコーディング（V1881: 新実装）
    const { borderClass, bgClass, hoverClass, ringClass } = this.getCardColor(
      card.isUserSelected,
      card.matchRate,
      card.shouldCheck
    );

    // ホバー効果: 光る外枠 + 拡大 + 影 + クリック時縮小
    div.className = `franchise-item ${card.shouldCheck ? 'selected' : ''} cursor-pointer border-2 ${borderClass} ${bgClass} rounded-lg p-2 sm:p-4 ${hoverClass} hover:ring-4 ${ringClass} ring-offset-2 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out`;
    div.setAttribute('onclick', 'toggleFranchise(this)');
    div.setAttribute('data-franchise-id', card.franchiseId);
    div.setAttribute('data-match-rate', card.matchRate);
    div.setAttribute('data-user-selected', card.isUserSelected ? 'true' : 'false');

    // matchDetailsをJSON文字列として保存
    if (card.matchDetails) {
      div.setAttribute('data-match-details', JSON.stringify(card.matchDetails));
    }

    // サービスエリア表示（都道府県）
    const areasText = card.serviceAreas.slice(0, 3).join(' ') || '全国対応';

    // マッチ率の色を決定（100% = 緑、それ以外 = オレンジ）
    const matchRateColor = card.matchRate === 100 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white';
    const matchRateId = `match-rate-${card.franchiseId}`;

    // 住所情報（マップアイコン用）
    const fullAddress = `${card.serviceAreas[0] || ''}${card.city || ''}`;

    // 追加情報（評価・距離）
    let additionalInfo = '';
    if (card.rating > 0) {
      additionalInfo += `<div class="text-xs text-yellow-600">★${card.rating}</div>`;
    }
    if (card.distanceText) {
      additionalInfo += `<div class="text-xs text-blue-600">${card.distanceText} / ${card.durationText}</div>`;
    }

    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center flex-1 min-w-0">
          <div class="text-base sm:text-lg font-semibold mr-2 sm:mr-3 text-pink-600 flex-shrink-0">${card.rank}</div>
          <input type="checkbox" ${card.shouldCheck ? 'checked' : ''} class="mr-2 sm:mr-4 w-4 h-4 sm:w-5 sm:h-5 text-pink-600 rounded flex-shrink-0" onclick="event.stopPropagation()">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="font-semibold text-gray-900 text-sm sm:text-lg">${card.companyName}</div>
              ${card.isUserSelected ? '<span class="relative inline-block group cursor-help" onclick="event.stopPropagation();"><span class="inline-block px-2 py-0.5 bg-pink-600 text-white text-sm font-bold rounded">📋</span><span class="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap transition-opacity duration-200 z-50 pointer-events-none">ユーザー選択</span></span>' : ''}
              ${fullAddress ? `<span class="relative inline-block group cursor-help" onclick="event.stopPropagation();">
                📍
                <span class="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap transition-opacity duration-200 z-50 pointer-events-none">
                  ${fullAddress}
                </span>
              </span>` : ''}
            </div>
            ${additionalInfo}
          </div>
        </div>
        <div class="text-right ml-2 sm:ml-4 flex-shrink-0">
          <div class="text-xs sm:text-sm text-gray-600 hidden sm:block">${areasText}</div>
          <div id="${matchRateId}" class="inline-block px-2 py-1 rounded-full text-xs sm:text-sm font-bold cursor-pointer hover:shadow-lg transition-shadow ${matchRateColor}"
               onclick="event.stopPropagation();"
               title="クリックで詳細を表示">
            ${card.matchRate}% マッチ
          </div>
        </div>
      </div>
    `;

    // マッチ率バッジにクリックイベントを追加
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

    const modalHTML = `
      <div id="matchDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target === this) this.remove()">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
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
            <!-- エリアマッチング -->
            <div class="border-l-4 ${matchDetails.area.matched ? 'border-green-500' : 'border-red-500'} pl-3">
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold text-gray-700">エリア適合</span>
                <span class="text-sm ${matchDetails.area.matched ? 'text-green-600' : 'text-red-600'}">
                  ${matchDetails.area.score} / ${matchDetails.area.maxScore}点
                </span>
              </div>
              <div class="text-sm text-gray-600">
                <div><span class="text-gray-500">案件エリア:</span> <span class="font-medium text-gray-900">${matchDetails.area.required || '未設定'}</span></div>
                <div><span class="text-gray-500">業者の対応エリア:</span> <span class="font-medium ${matchDetails.area.matched ? 'text-green-600' : 'text-gray-900'}">${matchDetails.area.available.length > 0 ? matchDetails.area.available.join(', ') : '未設定'}</span></div>
                ${!matchDetails.area.matched ? '<div class="text-red-600 font-semibold mt-1">→ 業者に ${matchDetails.area.required} への対応追加を依頼</div>' : ''}
              </div>
            </div>

            <!-- 工事種別マッチング -->
            <div class="border-l-4 ${matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0 ? 'border-green-500' : 'border-orange-500'} pl-3">
              <div class="flex items-center justify-between mb-1">
                <span class="font-semibold text-gray-700">工事種別適合</span>
                <span class="text-sm ${matchDetails.workTypes.unmatched.length === 0 && matchDetails.workTypes.matched.length > 0 ? 'text-green-600' : 'text-orange-600'}">
                  ${matchDetails.workTypes.score} / ${matchDetails.workTypes.maxScore}点
                </span>
              </div>
              <div class="text-sm space-y-2">
                ${matchDetails.workTypes.matched.length > 0 ? `
                  <div>
                    <div class="text-green-600 font-semibold">✓ 対応可能 (現在の登録)</div>
                    <div class="text-gray-700 ml-3">${matchDetails.workTypes.matched.join(', ')}</div>
                  </div>
                ` : ''}
                ${matchDetails.workTypes.unmatched.length > 0 ? `
                  <div>
                    <div class="text-red-600 font-semibold">✗ 対応不可 (案件に必要)</div>
                    <div class="text-red-700 ml-3 font-medium">${matchDetails.workTypes.unmatched.join(', ')}</div>
                    <div class="text-red-600 font-semibold mt-1">→ 業者にこれらの工事種別の追加を依頼</div>
                  </div>
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
   * ソート順を変更（V1880: 新実装）
   * @param {string} sortType - ソート順 ('user', 'cheap', 'review', 'premium', 'distance')
   */
  async changeSortOrder(sortType) {
    this.currentSortType = sortType;

    // 距離順の場合は距離計算を実行
    if (sortType === 'distance' && this.currentCaseData) {
      const originAddress = this.currentCaseData.address ||
                           `${this.currentCaseData.prefecture || ''}${this.currentCaseData.city || ''}`;

      if (originAddress) {
        this.allFranchises = await this.calculateDistances(originAddress, this.allFranchises);
      }
    }

    // カードを再生成して表示
    const businessCards = this.generateBusinessCards({
      allFranchises: this.allFranchises
    }, sortType, this.showAll, this.searchQuery);

    this.updateUI(businessCards, this.calculateDesiredCount(this.userSelectedCompanies));
  },

  /**
   * もっと見る切り替え（V1880: 新実装）
   */
  toggleShowMore() {
    this.showAll = !this.showAll;

    // カードを再生成して表示
    const businessCards = this.generateBusinessCards({
      allFranchises: this.allFranchises
    }, this.currentSortType, this.showAll, this.searchQuery);

    this.updateUI(businessCards, this.calculateDesiredCount(this.userSelectedCompanies));
  },

  /**
   * 検索実行（V1880: 新実装）
   * @param {string} query - 検索クエリ
   */
  searchFranchises(query) {
    this.searchQuery = query;

    // カードを再生成して表示
    const businessCards = this.generateBusinessCards({
      allFranchises: this.allFranchises
    }, this.currentSortType, this.showAll, query);

    this.updateUI(businessCards, this.calculateDesiredCount(this.userSelectedCompanies));
  },

  /**
   * サンプル加盟店データ（フォールバック用）
   */
  getSampleFranchises() {
    return [
      {
        franchiseId: 'FRANCHISE_001',
        companyName: '東京都市部塗装',
        serviceAreas: ['東京都', '神奈川県'],
        city: '渋谷区',
        workTypes: ['外壁塗装', '屋根塗装'],
        avgContractAmount: 1200000,
        rating: 4.5,
        reviewCount: 120,
        contractCount: 50
      },
      {
        franchiseId: 'FRANCHISE_002',
        companyName: '神奈川県央建設',
        serviceAreas: ['神奈川県', '東京都'],
        city: '横浜市',
        workTypes: ['外壁塗装', '屋根塗装', '防水工事'],
        avgContractAmount: 1100000,
        rating: 4.3,
        reviewCount: 95,
        contractCount: 42
      },
      {
        franchiseId: 'FRANCHISE_003',
        companyName: '千葉外装工業',
        serviceAreas: ['千葉県'],
        city: '千葉市',
        workTypes: ['外壁塗装', '外壁カバー工法'],
        avgContractAmount: 950000,
        rating: 4.2,
        reviewCount: 78,
        contractCount: 35
      },
      {
        franchiseId: 'FRANCHISE_004',
        companyName: '埼玉リフォーム',
        serviceAreas: ['埼玉県'],
        city: 'さいたま市',
        workTypes: ['外壁塗装', '屋根塗装', 'リフォーム'],
        avgContractAmount: 1300000,
        rating: 4.6,
        reviewCount: 150,
        contractCount: 60
      },
      {
        franchiseId: 'F001',
        companyName: '田中ホームテクノ株式会社',
        serviceAreas: ['神奈川県', '東京都'],
        city: '藤沢市',
        workTypes: ['外壁塗装', '屋根塗装'],
        avgContractAmount: 1150000,
        rating: 4.4,
        reviewCount: 110,
        contractCount: 48
      },
      {
        franchiseId: 'F002',
        companyName: '株式会社湘南ウィンクル',
        serviceAreas: ['神奈川県'],
        city: '茅ヶ崎市',
        workTypes: ['外壁塗装', '屋根塗装', '防水工事'],
        avgContractAmount: 1050000,
        rating: 4.3,
        reviewCount: 88,
        contractCount: 40
      },
      {
        franchiseId: 'F003',
        companyName: '株式会社39ホーム',
        serviceAreas: ['東京都', '神奈川県', '埼玉県'],
        city: '町田市',
        workTypes: ['外壁塗装', '屋根塗装'],
        avgContractAmount: 1280000,
        rating: 4.5,
        reviewCount: 135,
        contractCount: 55
      },
      {
        franchiseId: 'F004',
        companyName: '株式会社やまもとくん',
        serviceAreas: ['神奈川県', '東京都'],
        city: '相模原市',
        workTypes: ['外壁塗装', '屋根塗装', 'リフォーム'],
        avgContractAmount: 1100000,
        rating: 4.4,
        reviewCount: 102,
        contractCount: 45
      }
    ];
  }
};

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.BusinessSelectionHandler = BusinessSelectionHandler;
}
