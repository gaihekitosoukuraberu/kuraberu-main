/**
 * ============================================
 * 業者選択ハンドラー
 * ============================================
 *
 * 目的: 業者選定履歴（AS列）から動的に業者リストを生成
 * 依存: ApiClient（api-client.js）
 *
 * 主な機能:
 * - AS列のパース（カンマ区切り業者名）
 * - 希望社数の自動計算と表示
 * - 業者カードの動的生成（1-2枠: AS列、3-4枠: マッチ率高）
 * - マッチ率計算（エリア40% + 工事種別60% = 100%）
 * - マッチ率優先ソート（AS列は表示順序のみに影響）
 * - チェックボックス自動選択（100%マッチのみ）
 */

const BusinessSelectionHandler = {

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
   *
   * 対応フォーマット:
   * 1. フルネーム: "田中ホームテクノ株式会社, 株式会社湘南ウィンクル"
   * 2. 略称付き: "S社:おすすめ順:1位,K社:おすすめ順:2位"
   * 3. コード付き: "F001:おすすめ順:1位,F003:おすすめ順:2位"
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
   * 業者データを希望社数・ソート順に応じてロード
   * @param {string} caseId - 案件ID
   * @param {object} currentCaseData - 現在の案件データ（AS列含む）
   * @returns {Promise<object>} { desiredCount, selectedCompanies, allFranchises }
   */
  async loadBusinessSelectionData(caseId, currentCaseData) {
    try {
      if (!this.init()) {
        throw new Error('BusinessSelection初期化失敗');
      }

      // AS列から業者名を取得
      const businessHistory = currentCaseData['業者選定履歴'] || currentCaseData.businessHistory || '';
      const selectedCompanies = this.parseBusinessHistory(businessHistory);

      console.log('[BusinessSelection] AS列パース結果:', {
        raw: businessHistory,
        parsed: selectedCompanies,
        count: selectedCompanies.length
      });

      // 希望社数を計算
      const desiredCount = this.calculateDesiredCount(selectedCompanies);

      // AS列の業者名から簡易的な業者リストを生成
      const allFranchises = selectedCompanies.map((companyName, index) => ({
        franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
        companyName: companyName,
        serviceAreas: [currentCaseData['都道府県（物件）'] || '全国'], // 物件と同じエリアを仮設定
        workTypes: [], // 工事種別は未設定
        matchRate: 100, // AS列選択なので100%
        isUserSelected: true,
        matchDetails: {
          area: {
            matched: true,
            required: currentCaseData['都道府県（物件）'] || '',
            available: [currentCaseData['都道府県（物件）'] || '全国'],
            score: 40,
            maxScore: 40
          },
          workTypes: {
            matched: [],
            unmatched: [],
            score: 60,
            maxScore: 60
          }
        }
      }));

      console.log('[BusinessSelection] 生成された業者リスト:', allFranchises);

      return {
        desiredCount,
        selectedCompanies,
        allFranchises
      };

    } catch (error) {
      console.error('[BusinessSelection] データ読み込みエラー:', error);
      throw error;
    }
  },

  /**
   * マッチ率を計算
   * @param {Array} franchises - 加盟店リスト
   * @param {Array<string>} selectedCompanies - AS列の業者名（表示順序のみに使用）
   * @param {object} caseData - 案件データ（都道府県などマッチング条件）
   * @returns {Array} マッチ率付き加盟店リスト
   */
  calculateMatchRates(franchises, selectedCompanies, caseData) {
    return franchises.map(franchise => {
      let matchRate = 0;
      const matchDetails = {
        area: { matched: false, required: '', available: [], score: 0, maxScore: 40 },
        workTypes: { matched: [], unmatched: [], score: 0, maxScore: 60 }
      };

      // AS列選択フラグ（表示順序用、マッチ率計算には使わない）
      const isSelected = selectedCompanies.some(companyName => {
        return franchise.companyName && franchise.companyName.includes(companyName) ||
               companyName.includes(franchise.companyName || '') ||
               franchise.franchiseId === companyName;
      });

      // 1. エリアマッチング（都道府県）: 40%
      const casePrefecture = caseData['都道府県（物件）'] || caseData.prefecture || '';
      const franchiseAreas = franchise.serviceAreas || [];
      matchDetails.area.required = casePrefecture;
      matchDetails.area.available = franchiseAreas;

      if (casePrefecture && franchiseAreas.includes(casePrefecture)) {
        matchRate += 40;
        matchDetails.area.matched = true;
        matchDetails.area.score = 40;
      }

      // 2. 工事種別マッチング: 60%（全種別一致で満点）
      const caseWorkTypes = this.extractWorkTypes(caseData);
      const franchiseWorkTypes = franchise.workTypes || [];

      if (caseWorkTypes.length > 0 && franchiseWorkTypes.length > 0) {
        const matchingTypes = caseWorkTypes.filter(w => franchiseWorkTypes.includes(w));
        const unmatchedTypes = caseWorkTypes.filter(w => !franchiseWorkTypes.includes(w));
        const matchRatio = matchingTypes.length / caseWorkTypes.length;
        const workTypeScore = Math.round(matchRatio * 60);

        matchRate += workTypeScore;
        matchDetails.workTypes.matched = matchingTypes;
        matchDetails.workTypes.unmatched = unmatchedTypes;
        matchDetails.workTypes.score = workTypeScore;
      }

      return {
        ...franchise,
        matchRate,
        isUserSelected: isSelected,
        matchDetails
      };
    });
  },

  /**
   * 案件データから工事種別を抽出
   * @param {object} caseData - 案件データ
   * @returns {Array<string>} 工事種別の配列
   */
  extractWorkTypes(caseData) {
    const workTypes = [];

    // Q9_希望工事内容_外壁
    const exteriorWork = caseData['Q9_希望工事内容_外壁'] || caseData.exteriorWork || '';
    if (exteriorWork) {
      workTypes.push(`外壁${exteriorWork}`);
    }

    // Q10_希望工事内容_屋根
    const roofWork = caseData['Q10_希望工事内容_屋根'] || caseData.roofWork || '';
    if (roofWork) {
      workTypes.push(`屋根${roofWork}`);
    }

    // フォールバック: workTypes配列が直接渡されている場合
    if (caseData.workTypes && Array.isArray(caseData.workTypes)) {
      workTypes.push(...caseData.workTypes);
    }

    return [...new Set(workTypes)]; // 重複除去
  },

  /**
   * 業者カードを生成
   * @param {object} selectionData - { desiredCount, selectedCompanies, allFranchises }
   * @returns {Array} 表示用業者カード配列（最大4件）
   */
  generateBusinessCards(selectionData) {
    const { desiredCount, selectedCompanies, allFranchises } = selectionData;

    // マッチ率でソート（降順）
    const sortedFranchises = [...allFranchises].sort((a, b) => {
      // ユーザー選択を最優先（表示順序のみ）
      if (a.isUserSelected && !b.isUserSelected) return -1;
      if (!a.isUserSelected && b.isUserSelected) return 1;

      // 次にマッチ率
      return b.matchRate - a.matchRate;
    });

    // 上位4件を取得
    const topFranchises = sortedFranchises.slice(0, 4);

    // カード生成
    return topFranchises.map((franchise, index) => {
      const rank = index + 1;
      // 100%マッチの業者のみチェック
      const shouldCheck = franchise.matchRate === 100;

      return {
        rank,
        franchiseId: franchise.franchiseId || `FRANCHISE_${String(rank).padStart(3, '0')}`,
        companyName: franchise.companyName || '未設定',
        serviceAreas: franchise.serviceAreas || [],
        matchRate: franchise.matchRate || 0,
        isUserSelected: franchise.isUserSelected || false,
        matchDetails: franchise.matchDetails || null,
        shouldCheck
      };
    });
  },

  /**
   * UIを更新
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

    console.log('[BusinessSelection] UI更新完了:', {
      desiredCount,
      cardsCount: businessCards.length
    });
  },

  /**
   * 業者カードDOMを生成
   * @param {object} card - 業者カード情報
   * @returns {HTMLElement} カードDOM
   */
  createFranchiseCardElement(card) {
    const div = document.createElement('div');
    div.className = `franchise-item ${card.shouldCheck ? 'selected' : ''} cursor-pointer border-2 ${
      card.shouldCheck ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'
    } rounded-lg p-2 sm:p-4 hover:bg-pink-100 transition-all`;
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

    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center flex-1 min-w-0">
          <div class="text-base sm:text-lg font-semibold mr-2 sm:mr-3 text-pink-600 flex-shrink-0">${card.rank}</div>
          <input type="checkbox" ${card.shouldCheck ? 'checked' : ''} class="mr-2 sm:mr-4 w-4 h-4 sm:w-5 sm:h-5 text-pink-600 rounded flex-shrink-0" onclick="event.stopPropagation()">
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 text-sm sm:text-lg">${card.companyName}</div>
          </div>
        </div>
        <div class="text-right ml-2 sm:ml-4 flex-shrink-0">
          <div class="text-xs sm:text-sm text-gray-600 hidden sm:block">${areasText}</div>
          ${card.isUserSelected ? '<div class="text-pink-600 text-xs sm:text-sm font-semibold">ユーザー選択</div>' : ''}
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
                <div>必要エリア: <span class="font-medium">${matchDetails.area.required || '未設定'}</span></div>
                <div>対応エリア: <span class="font-medium">${matchDetails.area.available.length > 0 ? matchDetails.area.available.join(', ') : '未設定'}</span></div>
                ${!matchDetails.area.matched ? '<div class="text-red-600 mt-1">⚠ エリア不一致</div>' : ''}
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
              <div class="text-sm text-gray-600">
                ${matchDetails.workTypes.matched.length > 0 ? `
                  <div class="mb-1">
                    <span class="text-green-600">✓ 対応可能:</span> ${matchDetails.workTypes.matched.join(', ')}
                  </div>
                ` : ''}
                ${matchDetails.workTypes.unmatched.length > 0 ? `
                  <div class="text-red-600">
                    ✗ 対応不可: ${matchDetails.workTypes.unmatched.join(', ')}
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
   * サンプル加盟店データ（フォールバック用）
   */
  getSampleFranchises() {
    return [
      {
        franchiseId: 'FRANCHISE_001',
        companyName: '東京都市部塗装',
        serviceAreas: ['東京都', '神奈川県'],
        workTypes: ['外壁塗装', '屋根塗装']
      },
      {
        franchiseId: 'FRANCHISE_002',
        companyName: '神奈川県央建設',
        serviceAreas: ['神奈川県', '東京都'],
        workTypes: ['外壁塗装', '屋根塗装', '防水工事']
      },
      {
        franchiseId: 'FRANCHISE_003',
        companyName: '千葉外装工業',
        serviceAreas: ['千葉県'],
        workTypes: ['外壁塗装', '外壁カバー工法']
      },
      {
        franchiseId: 'FRANCHISE_004',
        companyName: '埼玉リフォーム',
        serviceAreas: ['埼玉県'],
        workTypes: ['外壁塗装', '屋根塗装', 'リフォーム']
      },
      {
        franchiseId: 'F001',
        companyName: '田中ホームテクノ株式会社',
        serviceAreas: ['神奈川県', '東京都'],
        workTypes: ['外壁塗装', '屋根塗装']
      },
      {
        franchiseId: 'F002',
        companyName: '株式会社湘南ウィンクル',
        serviceAreas: ['神奈川県'],
        workTypes: ['外壁塗装', '屋根塗装', '防水工事']
      },
      {
        franchiseId: 'F003',
        companyName: '株式会社39ホーム',
        serviceAreas: ['東京都', '神奈川県', '埼玉県'],
        workTypes: ['外壁塗装', '屋根塗装']
      },
      {
        franchiseId: 'F004',
        companyName: '株式会社やまもとくん',
        serviceAreas: ['神奈川県', '東京都'],
        workTypes: ['外壁塗装', '屋根塗装', 'リフォーム']
      }
    ];
  },

  /**
   * ソート機能（マッチ率優先 + セカンダリソート）
   * @param {string} sortType - 'selected', 'distance', 'recommend', 'price', 'review', 'quality'
   */
  sortFranchises(sortType) {
    const container = document.getElementById('franchiseListContainer');
    if (!container) return;

    const franchiseItems = Array.from(container.querySelectorAll('.franchise-item'));

    // ソート関数
    franchiseItems.sort((a, b) => {
      // 1. ユーザー選択を最優先
      const aUserSelected = a.getAttribute('data-user-selected') === 'true';
      const bUserSelected = b.getAttribute('data-user-selected') === 'true';

      if (aUserSelected && !bUserSelected) return -1;
      if (!aUserSelected && bUserSelected) return 1;

      // 2. マッチ率でソート（降順）
      const aMatchRate = parseInt(a.getAttribute('data-match-rate')) || 0;
      const bMatchRate = parseInt(a.getAttribute('data-match-rate')) || 0;

      if (sortType !== 'selected') {
        if (aMatchRate !== bMatchRate) {
          return bMatchRate - aMatchRate;
        }
      }

      // 3. セカンダリソート（sortTypeによる）
      // TODO: 距離、価格、口コミなどのデータが追加されたら実装

      return 0;
    });

    // DOMを再配置
    franchiseItems.forEach((item, index) => {
      // ランク番号を更新
      const rankElement = item.querySelector('.text-pink-600');
      if (rankElement) {
        rankElement.textContent = index + 1;
      }
      container.appendChild(item);
    });

    console.log('[BusinessSelection] ソート完了:', sortType);
  }
};

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.BusinessSelectionHandler = BusinessSelectionHandler;
}
