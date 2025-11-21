/**
 * ランキング表示機能
 * estimate-app専用
 */

// 二重読み込み防止ガード（V1669）
if (window.RANKING_JS_LOADED) {
  console.error('❌ ranking.js が既に読み込まれています！二重読み込みを防止しました。');
  throw new Error('[V1669] ranking.js duplicate load prevented');
}
window.RANKING_JS_LOADED = true;
console.log('✅ ranking.js 読み込み開始 (V1669 - 二重読み込み防止ガード有効)');

// V1704: ダミーデータ削除 - 加盟店マスタの実データのみ使用
// V1713-FIX: BOT起動時はランキング非表示（郵便番号入力後に実データを表示）
let allCompanies = [];

// GASから取得したランキングデータ（キャッシュ）
let dynamicRankings = null;
let currentSortType = 'recommended'; // recommended, cheap, review, quality

let showingAll = false;
// V1704: namesRevealedフラグ削除 - 実データのみ使用

// V1713-PERF: 重複実行防止フラグ
let isRankingFetching = false;

// ============================================
// GASからランキングデータを取得
// ============================================
async function fetchRankingFromGAS() {
  // V1713-PERF: 既に取得中の場合はスキップ
  if (isRankingFetching) {
    console.warn('⚠️ ランキング取得中のため、重複リクエストをスキップします');
    return false;
  }

  try {
    isRankingFetching = true;
    console.log('🏆 GASからランキング取得開始');

    // BotConfigから必要なパラメータを取得
    if (!window.BotConfig || !window.BotConfig.state) {
      console.error('❌ BotConfigが見つかりません');
      isRankingFetching = false;
      return false;
    }

    // sessionStorageから郵便番号と回答を復元（データ永続化）
    if (typeof window.BotConfig.loadFromSessionStorage === 'function') {
      window.BotConfig.loadFromSessionStorage();
      console.log('✅ sessionStorageからBotConfig復元完了');
    }

    const zipcode = window.BotConfig.state.currentZipcode;
    if (!zipcode) {
      console.error('❌ 郵便番号が見つかりません');
      console.error('📋 BotConfig.state:', JSON.stringify(window.BotConfig.state, null, 2));
      console.error('📋 sessionStorage bot_zipcode:', sessionStorage.getItem('bot_zipcode'));
      isRankingFetching = false;
      return false;
    }

    console.log('✅ 郵便番号取得成功:', zipcode);

    // BOT回答から施工箇所と築年数を取得（V1705拡張）
    const answers = window.BotConfig.state.userAnswers || {};
    const workTypes = [];
    let buildingAgeMin = 0;
    let buildingAgeMax = 100;

    // Q008: 気になる箇所
    if (answers.Q008 && answers.Q008.choice) {
      workTypes.push(answers.Q008.choice);
    }

    // Q003: 築年数
    if (answers.Q003 && answers.Q003.choice) {
      const ageRange = parseAgeRange(answers.Q003.choice);
      if (ageRange) {
        buildingAgeMin = ageRange.min;
        buildingAgeMax = ageRange.max;
      }
    }

    // V1705: 材質・工事内容追加
    const wallMaterial = answers.Q006 && answers.Q006.choice ? answers.Q006.choice : '';
    const roofMaterial = answers.Q007 && answers.Q007.choice ? answers.Q007.choice : '';
    const wallWorkType = answers.Q009 && answers.Q009.choice ? answers.Q009.choice : '';
    const roofWorkType = answers.Q010 && answers.Q010.choice ? answers.Q010.choice : '';

    // V1830: 気になる箇所（単品 vs 複合工事判定用）
    const concernedArea = answers.Q004B && answers.Q004B.choice ? answers.Q004B.choice : '';

    const params = {
      zipcode: zipcode,
      workTypes: workTypes,
      buildingAgeMin: buildingAgeMin,
      buildingAgeMax: buildingAgeMax,
      wallMaterial: wallMaterial,
      roofMaterial: roofMaterial,
      wallWorkType: wallWorkType,
      roofWorkType: roofWorkType,
      concernedArea: concernedArea
    };

    console.log('📤 ランキングリクエストパラメータ:', params);

    // CVAPI.getRankingを呼び出し
    if (!window.CVAPI || !window.CVAPI.getRanking) {
      console.error('❌ CVAPI.getRankingが見つかりません');
      isRankingFetching = false;
      return false;
    }

    const response = await window.CVAPI.getRanking(params);

    if (!response.success) {
      console.error('❌ ランキング取得失敗:', response.error);
      isRankingFetching = false;
      return false;
    }

    console.log('✅ ランキング取得成功:', response);

    // レスポンスをキャッシュ
    dynamicRankings = response.rankings;
    window.dynamicRankings = dynamicRankings; // グローバルスコープにも反映

    console.log('📦 ランキングデータをキャッシュしました');

    isRankingFetching = false;
    return true;

  } catch (error) {
    console.error('❌ ランキング取得エラー:', error);
    isRankingFetching = false;
    return false;
  }
}

// ============================================
// 築年数文字列をパース
// ============================================
function parseAgeRange(ageStr) {
  if (!ageStr) return null;

  // "0-5年" → {min: 0, max: 5}
  // "6-10年" → {min: 6, max: 10}
  // "30年以上" → {min: 30, max: 100}

  const match = ageStr.match(/(\d+)-(\d+)/);
  if (match) {
    return {
      min: parseInt(match[1]),
      max: parseInt(match[2])
    };
  }

  const overMatch = ageStr.match(/(\d+)年以上/);
  if (overMatch) {
    return {
      min: parseInt(overMatch[1]),
      max: 100
    };
  }

  return null;
}

// ============================================
// 動的ランキングからallCompaniesを更新
// ============================================
function updateAllCompaniesFromDynamic(sortType) {
  currentSortType = sortType;

  if (!dynamicRankings) {
    console.error('❌ 動的ランキングデータがありません（V1704: デフォルトデータなし）');
    allCompanies = [];
    return;
  }

  // ソートタイプに応じたランキングを取得
  let rankingList = [];
  switch(sortType) {
    case 'cheap':
      rankingList = dynamicRankings.cheap || [];
      break;
    case 'recommended':
      rankingList = dynamicRankings.recommended || [];
      break;
    case 'review':
      rankingList = dynamicRankings.review || [];
      break;
    case 'premium':
      rankingList = dynamicRankings.premium || [];
      break;
    default:
      rankingList = dynamicRankings.recommended || [];
  }

  if (rankingList.length === 0) {
    console.error('❌ ランキングデータが空です（V1704: デフォルトデータなし）');
    allCompanies = [];
    return;
  }

  console.log(`📊 ${sortType}順のランキングを適用 (${rankingList.length}件)`);

  // GASレスポンスをallCompanies形式に変換
  allCompanies = rankingList.map((company, index) => {
    // V1765: rating値のデバッグログ
    console.log(`[V1765-DEBUG] ${company.companyName}: rating=${company.rating} (型: ${typeof company.rating})`);

    return {
      rank: index + 1,
      name: company.companyName || `${index + 1}位業者`,
      price: company.avgContractAmount ? `${Math.floor(company.avgContractAmount / 10000)}万円〜` : '見積もり必要',
      rating: company.rating || 4.0,
      reviews: company.reviewCount || 0,
      features: extractFeatures(company),
      // 元データも保持
      _original: company
    };
  });

  console.log('✅ allCompanies更新完了:', allCompanies.length, '件');
}

// V1704: sortDefaultData関数削除 - デフォルトデータなし、実データのみ使用

// ============================================
// V1765: カスタムスムーススクロール（ふわっとしたアニメーション）
// ============================================
function smoothScrollTo(targetY, duration = 800) {
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  const startTime = performance.now();

  // イージング関数（ease-in-out）
  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animation(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * ease);

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

// ============================================
// V1766: クロスランキング判定（他のランキングでの順位を取得）
// ============================================
function getCrossRankingBadges(companyName, currentSortType) {
  if (!dynamicRankings) return [];

  const badges = [];
  const rankingTypes = [
    { key: 'recommended', label: 'おすすめ', icon: '⭐', sortType: 'recommended' },
    { key: 'cheap', label: '安い順', icon: '💰', sortType: 'cheap' },
    { key: 'review', label: 'クチコミ', icon: '💬', sortType: 'review' },
    { key: 'premium', label: '高品質', icon: '💎', sortType: 'premium' }
  ];

  rankingTypes.forEach(rankingType => {
    // 現在のソートタイプはスキップ（メダルで表示するため）
    if (rankingType.sortType === currentSortType) return;

    const rankingList = dynamicRankings[rankingType.key] || [];
    const position = rankingList.findIndex(company => company.companyName === companyName);

    // トップ3に入っている場合のみバッジ表示
    if (position >= 0 && position < 3) {
      badges.push({
        label: `${rankingType.icon} ${rankingType.label}${position + 1}位`,
        icon: rankingType.icon,
        rank: position + 1,
        type: rankingType.key
      });
    }
  });

  return badges;
}

// ============================================
// 会社データから特徴を抽出
// ============================================
function extractFeatures(company) {
  const features = [];

  // 対応都道府県
  if (company.prefecture) {
    features.push(`${company.prefecture}対応`);
  }

  // 最大対応階数
  if (company.maxFloors) {
    features.push(`${company.maxFloors}階建対応`);
  }

  // 特殊対応項目
  if (company.specialSupport && company.specialSupport.length > 0) {
    features.push(...company.specialSupport.slice(0, 2));
  }

  // 施工実績
  if (company.contractCount) {
    features.push(`実績${company.contractCount}件`);
  }

  // 最大3つまで
  return features.slice(0, 3);
}

// ヒアリング段階の管理
let currentHearingStage = 0; // 0: 未開始, 1: 第1段階完了, 2: 第2段階完了, 3: 第3段階完了, 4: 第4段階完了
// V1704: realCompanies削除 - 実データのみ使用

// キープリスト管理（ページ読み込み時にクリア）
let keepList = [];

// キープマネージャー（業者名ベースで管理）
const keepManager = {
  // キープ状態をチェック
  isKept(companyName) {
    return keepList.some(item => item.name === companyName);
  },

  // キープ切り替え（V1692 - 4社制限追加）
  toggle(rank, companyName, buttonElement) {
    const existingIndex = keepList.findIndex(item => item.name === companyName);

    if (existingIndex > -1) {
      // 既にキープされている場合は削除
      keepList.splice(existingIndex, 1);
      console.log('🗑️ キープ解除:', companyName);
    } else {
      // 4社制限チェック（V1692）
      if (keepList.length >= 4) {
        alert('最大4社まで選択できます');
        console.log('⚠️ キープ上限到達（4社）');
        return;
      }

      // キープされていない場合は追加
      keepList.push({
        name: companyName,
        rank: rank  // 現在のランク（表示用）
      });
      console.log('✅ キープ追加:', companyName);
    }

    // localStorageに保存
    localStorage.setItem('keepList', JSON.stringify(keepList));

    // ボタンの表示を更新
    this.updateButton(buttonElement, companyName);

    // キープ数バッジを更新
    updateKeepCountBadge();

    // V1713-UX: 無料見積もりボタンの表示制御（完全固定・インラインスタイルで制御）
    const estimateBtnContainer = document.getElementById('estimateBtnContainer');
    if (estimateBtnContainer) {
      if (keepList.length > 0) {
        estimateBtnContainer.style.display = 'block';
        console.log('✅ 無料見積もりボタン表示（固定位置）');
      } else {
        estimateBtnContainer.style.display = 'none';
        console.log('❌ 無料見積もりボタン非表示');
      }
    }

    // キープボタンの表示制御
    const keepButton = document.getElementById('keepButton');
    if (keepButton) {
      if (keepList.length > 0) {
        keepButton.classList.remove('hidden');
      } else {
        keepButton.classList.add('hidden');
      }
    }
  },

  // ボタンの表示を更新（V1754: グラデーションデザイン・元のサイズ）
  updateButton(buttonElement, companyName) {
    if (!buttonElement) return;

    const isKept = this.isKept(companyName);
    const textElement = buttonElement.querySelector('.keep-text');

    if (isKept) {
      // キープ中はオレンジ色（グラデーション・無料見積もりボタンと同じ色）
      buttonElement.className = 'keep-btn bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 active:from-orange-600 active:to-orange-700 text-white px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center';
      if (textElement) textElement.textContent = '❤️ キープ中';
    } else {
      // 未キープは黄色（グラデーション）
      buttonElement.className = 'keep-btn bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 active:from-orange-500 active:to-orange-600 text-white px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center';
      if (textElement) textElement.textContent = '❤️ キープ';
    }
  },

  // 全ボタンの表示を更新（ランキング再描画後に使用）
  updateAllButtons() {
    document.querySelectorAll('.keep-btn').forEach(button => {
      // onclick属性から業者名を抽出
      // 例: keepManager.toggle('1', '田中塗装', this)
      const onclick = button.getAttribute('onclick');
      if (onclick) {
        // 2番目のパラメータ（業者名）を抽出
        const matches = onclick.match(/keepManager\.toggle\('([^']+)',\s*'([^']+)'/);
        if (matches && matches[2]) {
          const companyName = matches[2];  // 2番目のキャプチャグループが業者名
          this.updateButton(button, companyName);
        }
      }
    });
  },

  // キープリストを取得（V1671 - モーダル表示用）
  getList() {
    return keepList;
  },

  // V1835: 業者名だけでキープに追加（プレビューHP内から使用）
  addByName(companyName) {
    if (!companyName) {
      console.error('❌ addByName: 業者名が指定されていません');
      return false;
    }

    // 既にキープ済みかチェック
    if (this.isKept(companyName)) {
      console.log('✅ 既にキープ済み:', companyName);
      return true;
    }

    // allCompaniesから会社情報を検索
    const company = allCompanies.find(c => c.name === companyName);
    if (!company) {
      console.error('❌ addByName: 業者が見つかりません:', companyName);
      return false;
    }

    // キープリストに追加
    keepList.push({
      id: company.rank.toString(),
      name: companyName,
      rank: company.rank
    });
    console.log('✅ キープ追加:', companyName);

    // localStorageに保存
    localStorage.setItem('keepList', JSON.stringify(keepList));

    // 全ボタンの表示を更新
    this.updateAllButtons();

    // キープ数バッジを更新
    updateKeepCountBadge();

    // V1713-UX: 無料見積もりボタンの表示制御
    const estimateBtnContainer = document.getElementById('estimateBtnContainer');
    if (estimateBtnContainer) {
      if (keepList.length > 0) {
        estimateBtnContainer.style.display = 'block';
        console.log('✅ 無料見積もりボタン表示（固定位置）');
      }
    }

    // キープボタンの表示制御
    const keepButton = document.getElementById('keepButton');
    if (keepButton && keepList.length > 0) {
      keepButton.classList.remove('hidden');
    }

    return true;
  }
};

// キープボタンの状態をチェックする関数（淡い色に変更）
function getKeepButtonState(companyRank) {
  const isKept = keepList.some(item => item.id === companyRank.toString());
  return {
    text: isKept ? 'キープ中！' : 'キープ',
    classes: isKept
      ? 'keep-btn bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs flex-1'
      : 'keep-btn bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded text-xs flex-1'
  };
}

// ランキングセクション表示（モザイク付き）
async function showRankingSection() {
  const rankingSection = document.getElementById('rankingSection');

  if (rankingSection) {
    rankingSection.classList.remove('hidden');

    // GASからランキングデータを取得（未取得の場合のみ）
    if (!dynamicRankings) {
      console.log('🔄 GASからランキングデータ取得開始');
      const success = await fetchRankingFromGAS();
      if (success) {
        console.log('✅ ランキングデータ取得成功、動的データで表示');
        // 動的データを「おすすめ順」で表示
        updateAllCompaniesFromDynamic('recommended');
      } else {
        console.error('❌ ランキングデータ取得失敗（V1704: デフォルトデータなし）');
        allCompanies = [];
      }
    } else {
      console.log('✅ ランキングデータは既に取得済み（キャッシュ使用）');
      // 既存の動的データを使用
      updateAllCompaniesFromDynamic('recommended');
    }

    // ランキングデータを表示
    displayRanking();
    console.log('ランキング表示完了');

    // モザイクを即座に適用（時間差なし）
    console.log('モザイクをかけています...');

    // h2タイトル以外の部分にモザイクをかける（並び替えも含む）
    const rankingList = document.getElementById('rankingList');
    const sortingContainer = document.getElementById('sortingContainer');
    const sortingSection = sortingContainer ? sortingContainer.parentElement : null;
    const toggleButton = document.getElementById('toggleAllCompanies');

    if (rankingList) rankingList.classList.add('mosaic-blur');
    if (sortingSection) sortingSection.classList.add('mosaic-blur');
    if (toggleButton) toggleButton.parentElement.classList.add('mosaic-blur');

    // V1765: ふわっとしたスクロール（遅延を短く・カスタムイージング使用）
    setTimeout(() => {
      if (window.innerWidth < 768) {
        // スマホ版: ランキングセクションにスクロール
        const targetY = rankingSection.offsetTop - 20;
        smoothScrollTo(targetY, 1000); // 1秒かけてふわっと
      } else {
        // PC版: 相場セクションまでスクロール
        const areaPrice = document.getElementById('areaPrice');
        if (areaPrice) {
          const targetY = areaPrice.offsetTop + 10;
          smoothScrollTo(targetY, 1000); // 1秒かけてふわっと
        }
      }
    }, 600); // 遅延を1秒→600msに短縮
  }
}

// 星レーティング生成関数（5つ星 - V1834: 白抜き星で半星表示・小数点1桁表示）
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const decimal = rating - fullStars;
  const hasHalfStar = decimal >= 0.3; // 4.3から半星表示
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHtml = '';

  // 満ちた星
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '⭐';
  }

  // 半分の星（白抜き星で表現）
  if (hasHalfStar) {
    starsHtml += '<span style="color: #FCD34D; font-size: 1.1em;">☆</span>';
  }

  // 空の星
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<span style="color: #d1d5db;">☆</span>';
  }

  // 小数点1桁表示（4.3 → "4.3"）
  const ratingText = rating.toFixed(1);
  return `<div class="flex items-center gap-1"><span class="text-sm leading-none">${starsHtml}</span><span class="text-xs font-bold leading-none">${ratingText}</span></div>`;
}

// ランキング表示（V1713-FIX: 動的更新対応）
function displayRanking() {
  try {
    // V1747-UX: 進捗バーの非表示はsubmitPhoneNumber()でのみ実行
    // 削除: モバイル進捗バー自動非表示 - 電話番号送信後のみ非表示にする

    const rankingList = document.getElementById('rankingList');
    if (!rankingList) {
      console.error('rankingList要素が見つかりません');
      return;
    }

  // V1713-FIX: 空配列時はプレースホルダー表示（ソートボタンは常に表示）
  if (!allCompanies || allCompanies.length === 0) {
    rankingList.innerHTML = `
      <div class="flex items-center justify-center h-full min-h-[300px]">
        <div class="text-center text-gray-500 px-4">
          <div class="mb-3">
            <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
          <p class="text-sm font-medium mb-1">質問に答えると</p>
          <p class="text-sm font-medium">最適なランキングが表示されます</p>
        </div>
      </div>
    `;
    console.log('📭 ランキングデータなし - プレースホルダー表示');

    // もっと見るボタンを非表示
    const toggleButton = document.getElementById('toggleAllCompanies');
    if (toggleButton) {
      toggleButton.style.display = 'none';
    }
    return;
  }

  // 表示する会社数を決定（初期4社、もっと見るで5~8位まで）
  const companiesToShow = showingAll ? allCompanies : allCompanies.slice(0, 4);

  // ランキングカードを動的生成（V1766: メダル&バッジシステム追加）
  rankingList.innerHTML = companiesToShow.map(company => {
    // GASから取得した実名を使用（イニシャルではなく実名表示）
    const companyName = company.name;

    // V1766: メダル表示（トップ3のみ）
    let medalHtml = '';
    if (company.rank === 1) {
      medalHtml = '<span class="medal-icon text-2xl">🥇</span>';
    } else if (company.rank === 2) {
      medalHtml = '<span class="medal-icon text-2xl">🥈</span>';
    } else if (company.rank === 3) {
      medalHtml = '<span class="medal-icon text-2xl">🥉</span>';
    }

    // 1位は青、2位以降はグレー
    let rankColorClass = company.rank === 1 ? 'text-blue-600' : 'text-gray-600';

    // 星評価（半星対応・小数点表示）
    const starsHtml = generateStarRating(company.rating);

    // V1766: クロスランキングバッジ取得
    const crossBadges = getCrossRankingBadges(companyName, currentSortType);

    // バッジHTML生成（控えめなタグ風デザイン）
    let badgeHtml = '';
    if (crossBadges.length > 0) {
      // バッジカラーマッピング（薄めの色で控えめに）
      const getBadgeColor = (type) => {
        switch(type) {
          case 'recommended': return 'bg-blue-100 text-blue-700';
          case 'cheap': return 'bg-yellow-100 text-yellow-700';
          case 'review': return 'bg-green-100 text-green-700';
          case 'premium': return 'bg-purple-100 text-purple-700';
          default: return 'bg-gray-100 text-gray-700';
        }
      };

      const badgeItems = crossBadges.map((badge) =>
        `<span class="badge-item ${getBadgeColor(badge.type)}">${badge.label}</span>`
      ).join('');

      badgeHtml = `
        <div class="flex gap-1 mb-2">
          ${badgeItems}
        </div>
      `;
    }

    return `
      <div class="ranking-item border border-gray-300 rounded-lg p-2 bg-white ${company.rank <= 3 ? 'medal-card' : ''}">
        <div class="flex items-center gap-2 mb-2">
          ${medalHtml ? `<div class="medal-wrapper">${medalHtml}</div>` : ''}
          <span class="${rankColorClass} text-lg font-bold ${medalHtml ? 'ml-1' : ''}">${company.rank}</span>
          <h3 class="text-xl font-bold">${companyName}</h3>
        </div>
        ${badgeHtml}
        <div class="flex items-center justify-between">
          ${starsHtml}
          <div class="flex items-center gap-2">
            <button onclick="showCompanyDetail(${company.rank})" class="detail-btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
              📋 詳細
            </button>
            <button onclick="keepManager.toggle('${company.rank}', '${companyName}', this)" class="keep-btn bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 active:from-orange-500 active:to-orange-600 text-white px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center">
              <span class="keep-text">❤️ キープ</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  console.log('✅ ランキング表示完了（' + companiesToShow.length + '社）');

  // 「もっと見る」ボタンの表示制御（V1687 - flex表示に修正）
  const toggleButton = document.getElementById('toggleAllCompanies');
  if (toggleButton) {
    if (showingAll || allCompanies.length <= 4) {
      // 全て表示中、または業者数が4社以下の場合は非表示
      toggleButton.style.display = 'none';
    } else {
      // 4社のみ表示中かつ5社以上ある場合は表示（flexで中央配置を維持）
      toggleButton.style.display = 'flex';
    }
  }

  // キープボタンの状態を更新（ソート切り替え後もキープ状態を維持）
  setTimeout(() => {
    keepManager.updateAllButtons();
  }, 0);

  } catch (error) {
    console.error('❌ ランキング表示でエラーが発生しました:', error);
    // フォールバック表示
    if (rankingList) {
      rankingList.innerHTML = '<div class="text-center py-4 text-gray-500">ランキングの読み込みに失敗しました</div>';
    }
  }
}

// V1704: updateCompanyNames削除 - 実データのみ使用

// キープ機能
function toggleKeep(companyRank, companyName) {
  const existingIndex = keepList.findIndex(item => item.id === companyRank.toString());
  
  if (existingIndex > -1) {
    // 既にキープされている場合は削除
    keepList.splice(existingIndex, 1);
  } else {
    // キープされていない場合は追加
    keepList.push({
      id: companyRank.toString(),
      name: companyName,
      rank: companyRank
    });
  }
  
  // localStorageに保存
  localStorage.setItem('keepList', JSON.stringify(keepList));
  
  // 表示を更新
  displayRanking();
  updateKeepCountBadge();
  
  // キープボタンの表示制御
  const keepButton = document.getElementById('keepButton');
  if (keepButton) {
    if (keepList.length > 0) {
      keepButton.classList.remove('hidden');
    } else {
      keepButton.classList.add('hidden');
    }
  }
}

// キープ数バッジ更新
function updateKeepCountBadge() {
  const keepCountBadge = document.getElementById('keepCountBadge');
  const keepCountBadgeTop = document.getElementById('keepCountBadgeTop');
  
  if (keepList.length > 0) {
    if (keepCountBadge) {
      keepCountBadge.textContent = keepList.length;
      keepCountBadge.classList.remove('hidden');
    }
    if (keepCountBadgeTop) {
      keepCountBadgeTop.textContent = keepList.length;
      keepCountBadgeTop.classList.remove('hidden');
    }
  } else {
    if (keepCountBadge) {
      keepCountBadge.classList.add('hidden');
    }
    if (keepCountBadgeTop) {
      keepCountBadgeTop.classList.add('hidden');
    }
  }
}

// 会社詳細表示（V1766: プレビューHP埋め込み）
function showCompanyDetail(companyRank) {
  const company = allCompanies.find(c => c.rank === companyRank);
  if (!company) {
    console.error(`[V1774] ランク${companyRank}の会社が見つかりません`);
    return;
  }

  const companyName = company.name;
  const previewHP = company._original?.previewHP || '';

  // デバッグログ
  console.log('[V1774-DEBUG] 会社詳細表示:', {
    rank: companyRank,
    companyName: companyName,
    previewHP: previewHP,
    _original: company._original
  });

  // プレビューHPがない場合はアラート表示
  if (!previewHP) {
    console.warn(`[V1774] プレビューHPが設定されていません: ${companyName}`);
    alert(`${companyName}のプレビューHPが設定されていません。\n管理者に連絡してください。`);
    return;
  }

  // モーダル作成
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-4 max-w-5xl w-full h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-bold">${companyName} のプレビュー</h3>
        <button id="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-hidden">
        <iframe
          id="preview-iframe"
          src="${previewHP}"
          class="w-full h-full border border-gray-200 rounded"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          loading="lazy"
        ></iframe>
      </div>
      <div class="mt-3 flex gap-2">
        <button id="closeModalBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded flex-1">
          閉じる
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // モーダル閉じるイベント
  const closeModal = () => {
    document.body.removeChild(modal);
  };

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// もっと見る切り替え（簡略表示は無し）
function toggleAllCompanies() {
  if (!showingAll) {
    // もっと見るを押した時のみ5~8位まで表示
    showingAll = true;
    displayRanking();
    
    // ボタンを非表示
    const toggleButton = document.getElementById('toggleAllCompanies');
    if (toggleButton) {
      toggleButton.style.display = 'none';
    }
  }
}

// キープボックス表示
function showKeepBox() {
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.classList.remove('hidden');
    updateKeepBoxContent();
  }
}

// キープボックス非表示
function hideKeepBox() {
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.classList.add('hidden');
  }
}

// キープボックス内容更新
function updateKeepBoxContent() {
  const keepBoxContent = document.getElementById('keepBoxContent');
  if (!keepBoxContent) return;
  
  if (keepList.length === 0) {
    keepBoxContent.innerHTML = '<p class="text-gray-500 text-center py-4">キープ中の業者はありません</p>';
    return;
  }
  
  keepBoxContent.innerHTML = keepList.map(company => `
    <div class="border border-gray-200 rounded-lg p-3 mb-2">
      <div class="flex justify-between items-center">
        <div>
          <h4 class="font-medium">${company.name}</h4>
          <p class="text-sm text-gray-500">ランキング${company.rank}位</p>
        </div>
        <button class="text-red-500 hover:text-red-700" onclick="removeFromKeepList('${company.name}')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// キープリストから削除
function removeFromKeepList(companyName) {
  keepList = keepList.filter(item => item.name !== companyName);
  localStorage.setItem('keepList', JSON.stringify(keepList));

  // 表示を更新
  displayRanking();
  updateKeepCountBadge();
  updateKeepBoxContent();

  // キープが0になったら右上ボタンを非表示
  if (keepList.length === 0) {
    const keepButton = document.getElementById('keepButton');
    if (keepButton) {
      keepButton.classList.add('hidden');
    }
    hideKeepBox();
  }
}

// V1704: updateKeepListWithRealNames削除 - 実データのみ使用

// 業者名を見るボタンで電話番号フォームにスクロール
function scrollToPhoneForm() {
  const phoneSection = document.getElementById('phoneSection');
  if (phoneSection) {
    phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // フォーカスを電話番号入力欄に移動
    setTimeout(() => {
      const phoneInput = document.getElementById('phoneNumber');
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 500);
  }
}

// 並び替えタブの処理（段階制限付き）
function switchSortTab(tabType) {
  console.log('ソートタブ切り替え:', tabType, 'ヒアリング段階:', currentHearingStage);

  // ヒアリング段階チェック（第1段階完了でソート機能解放）
  if (tabType !== 'sortRecommended' && currentHearingStage < 1) {
    console.log('第1ヒアリング段階が完了していないため、このタブは利用できません');
    return;
  }

  // 動的ランキングデータがあれば、ソートタイプに応じてallCompaniesを更新
  if (dynamicRankings) {
    let sortType = 'recommended';
    switch(tabType) {
      case 'sortRecommended':
        sortType = 'recommended';
        break;
      case 'sortCheap':
        sortType = 'cheap';
        break;
      case 'sortReview':
        sortType = 'review';
        break;
      case 'sortQuality':
        sortType = 'premium';
        break;
    }
    updateAllCompaniesFromDynamic(sortType);
    displayRanking(); // ランキングを再描画
  }

  // ランキングタイトルを変更（BOTコンテナ内と通常ページ両方）
  const titleMap = {
    'sortRecommended': 'おすすめ業者ランキング',
    'sortCheap': '安い順ランキング',
    'sortReview': '口コミ順ランキング',
    'sortQuality': '高品質順ランキング'
  };
  const newTitle = titleMap[tabType] || 'おすすめ業者ランキング';

  // BOTコンテナ内のrankingTitle（gaiheki-bot-loader.js内）
  const rankingTitleBot = document.querySelector('#mainContentContainer #rankingTitle');
  if (rankingTitleBot) {
    rankingTitleBot.textContent = newTitle;
    console.log(`✅ BOTコンテナ内のタイトル更新: ${newTitle}`);
  }

  // 通常ページのrankingTitle（index.html内）
  const rankingTitlePage = document.querySelector('#rankingSection #rankingTitle');
  if (rankingTitlePage) {
    rankingTitlePage.textContent = newTitle;
    console.log(`✅ 通常ページのタイトル更新: ${newTitle}`);
  }
  
  // すべてのタブの背景色をリセット（無効化されていないもののみ）
  const tabs = ['sortRecommended', 'sortCheap', 'sortReview', 'sortQuality'];
  tabs.forEach(tabId => {
    const tab = document.getElementById(tabId);
    if (tab && !tab.classList.contains('sort-tab-disabled')) {
      tab.className = tab.className.replace(/bg-\w+-\d+/g, 'bg-white');
      tab.className = tab.className.replace(/text-\w+-\d+/g, '');
      tab.classList.remove('border-blue-300', 'border-yellow-300', 'border-green-300', 'border-purple-300');
      tab.classList.add('border-gray-200', 'text-gray-700');
    }
  });

  // 選択されたタブの背景色を変更（無効化されていない場合のみ）
  const activeTab = document.getElementById(tabType);
  console.log('選択されたタブ:', tabType, 'ボタン要素:', activeTab);
  console.log('無効化クラス確認:', activeTab ? activeTab.classList.contains('sort-tab-disabled') : 'ボタンなし');
  console.log('現在のクラス:', activeTab ? activeTab.className : 'ボタンなし');

  if (activeTab && !activeTab.classList.contains('sort-tab-disabled')) {
    console.log('ボタン背景色変更を実行中...');
    activeTab.classList.remove('bg-white', 'border-gray-200');

    switch(tabType) {
      case 'sortRecommended':
        activeTab.classList.add('bg-blue-100', 'border-blue-300', 'text-blue-800');
        console.log('おすすめ順: 青色背景適用');
        break;
      case 'sortCheap':
        activeTab.classList.add('bg-yellow-100', 'border-yellow-300', 'text-yellow-800');
        console.log('安い順: 黄色背景適用');
        break;
      case 'sortReview':
        activeTab.classList.add('bg-green-100', 'border-green-300', 'text-green-800');
        console.log('クチコミ順: 緑色背景適用');
        break;
      case 'sortQuality':
        activeTab.classList.add('bg-purple-100', 'border-purple-300', 'text-purple-800');
        console.log('高品質順: 紫色背景適用');
        break;
    }
    console.log('変更後のクラス:', activeTab.className);
  } else {
    console.log('ボタン背景色変更をスキップ - 理由:', !activeTab ? 'ボタンが存在しない' : 'sort-tab-disabledクラスが付いている');
  }
  
  // sortingContainer（ボタンのすぐ外側）は白のまま
  const sortingContainer = document.getElementById('sortingContainer');
  const rankingSection = document.getElementById('rankingSection');
  
  if (sortingContainer) {
    // sortingContainerは常に白
    sortingContainer.className = sortingContainer.className.replace(/bg-\w+-\d+/g, '');
    sortingContainer.classList.add('bg-white');
  }
  
  // ランキングセクション全体（紫の外側エリア）の背景を変更
  console.log('ランキングセクション背景色変更開始:', rankingSection);
  if (rankingSection) {
    console.log('変更前のランキングセクションクラス:', rankingSection.className);
    
    // 既存の背景色クラスを削除
    rankingSection.className = rankingSection.className.replace(/bg-gray-\d+/g, '');
    rankingSection.className = rankingSection.className.replace(/bg-\w+-\d+/g, '');
    rankingSection.className = rankingSection.className.replace(/ranking-section-\w+/g, '');
    
    // インラインスタイルもリセット
    rankingSection.style.backgroundColor = '';
    
    let backgroundColor = '';
    let customClass = '';
    
    switch(tabType) {
      case 'sortRecommended':
        rankingSection.classList.add('bg-blue-50');
        rankingSection.classList.add('ranking-section-blue');
        backgroundColor = '#eff6ff';
        customClass = 'ranking-section-blue';
        console.log('ランキング背景: 青色適用');
        break;
      case 'sortCheap':
        rankingSection.classList.add('bg-yellow-50');
        rankingSection.classList.add('ranking-section-yellow');
        backgroundColor = '#fefce8';
        customClass = 'ranking-section-yellow';
        console.log('ランキング背景: 黄色適用');
        break;
      case 'sortReview':
        rankingSection.classList.add('bg-green-50');
        rankingSection.classList.add('ranking-section-green');
        backgroundColor = '#f0fdf4';
        customClass = 'ranking-section-green';
        console.log('ランキング背景: 緑色適用');
        break;
      case 'sortQuality':
        rankingSection.classList.add('bg-purple-50');
        rankingSection.classList.add('ranking-section-purple');
        backgroundColor = '#faf5ff';
        customClass = 'ranking-section-purple';
        console.log('ランキング背景: 紫色適用');
        break;
      default:
        rankingSection.classList.add('bg-blue-50');
        rankingSection.classList.add('ranking-section-blue');
        backgroundColor = '#eff6ff';
        customClass = 'ranking-section-blue';
        console.log('ランキング背景: デフォルト青色適用');
    }
    
    // 最終手段: インラインスタイルで直接設定
    setTimeout(() => {
      rankingSection.style.backgroundColor = backgroundColor;
      console.log('インラインスタイル設定:', backgroundColor);
      console.log('最終的な背景色:', window.getComputedStyle(rankingSection).backgroundColor);
    }, 50);
    
    console.log('変更後のランキングセクションクラス:', rankingSection.className);
    console.log('追加されたカスタムクラス:', customClass);
  } else {
    console.log('⚠️ ランキングセクションが見つかりません');
  }
}

// ヒアリング段階完了処理
function completeHearingStage(stage) {
  currentHearingStage = stage;
  
  if (stage >= 1) {
    // 第1ヒアリング完了: 派手なモザイク解除エフェクト
    const rankingSection = document.getElementById('rankingSection');
    const phoneSection = document.getElementById('phoneSection');
    const overlayMessage = document.getElementById('rankingOverlayMessage');
    const rankingList = document.getElementById('rankingList');
    const sortingContainer = document.getElementById('sortingContainer');
    const toggleButton = document.getElementById('toggleAllCompanies');
    const sortingSection = document.getElementById('sortingContainer')?.parentElement;
    
    // 派手なスパークルエフェクトを作成
    const createSparkles = () => {
      const sparkleContainer = document.createElement('div');
      sparkleContainer.style.position = 'absolute';
      sparkleContainer.style.top = '0';
      sparkleContainer.style.left = '0';
      sparkleContainer.style.width = '100%';
      sparkleContainer.style.height = '100%';
      sparkleContainer.style.pointerEvents = 'none';
      sparkleContainer.style.zIndex = '1500';
      
      // 複数のスパークルを生成
      for (let i = 0; i < 15; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle-effect';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 0.5 + 's';
        sparkleContainer.appendChild(sparkle);
      }
      
      if (rankingSection) {
        rankingSection.appendChild(sparkleContainer);
        // 2秒後にスパークルコンテナを削除
        setTimeout(() => {
          if (sparkleContainer.parentNode) {
            sparkleContainer.parentNode.removeChild(sparkleContainer);
          }
        }, 2000);
      }
    };
    
    // フラッシュエフェクトを適用
    if (rankingSection) {
      rankingSection.classList.add('flash-reveal');
    }
    
    // スパークルエフェクトを開始
    createSparkles();
    
    // モザイクエフェクトを段階的に削除
    const elementsToRemoveMosaic = [
      rankingList,
      sortingSection,
      toggleButton?.parentElement,
      phoneSection
    ].filter(Boolean);
    
    elementsToRemoveMosaic.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add('mosaic-removing');
        // アニメーション完了後にモザイククラスを削除
        setTimeout(() => {
          element.classList.remove('mosaic-blur', 'mosaic-removing');
        }, 1000);
      }, index * 200); // 段階的に削除
    });
    
    // オーバーレイメッセージを派手に削除
    if (overlayMessage) {
      overlayMessage.style.animation = 'sparkleExplosion 1s ease-out forwards';
      setTimeout(() => {
        overlayMessage.remove();
      }, 1000);
    }
    
    console.log('第1ヒアリング完了: 派手なモザイク解除エフェクト実行');
  }

  // 第2段階以降の処理は、chatbot.jsのtriggerSortEnableで制御
}

// ============================================
// V1713-FIX: 全国版ランキング取得（郵便番号なし）
// ============================================
async function fetchNationalRanking() {
  try {
    console.log('🌏 全国版ランキング取得開始');

    const params = {
      zipcode: '', // 空文字で全国版
      workTypes: [],
      buildingAgeMin: 0,
      buildingAgeMax: 100
    };

    console.log('📤 全国版ランキングリクエスト:', params);

    if (!window.CVAPI || !window.CVAPI.getRanking) {
      console.error('❌ CVAPI.getRankingが見つかりません');
      return false;
    }

    const response = await window.CVAPI.getRanking(params);

    if (!response.success) {
      console.error('❌ 全国版ランキング取得失敗:', response.error);
      return false;
    }

    console.log('✅ 全国版ランキング取得成功:', response);

    dynamicRankings = response.rankings;
    window.dynamicRankings = dynamicRankings;

    // おすすめ順で表示
    updateAllCompaniesFromDynamic('recommended');
    displayRanking();

    console.log('📦 全国版ランキング表示完了');
    return true;

  } catch (error) {
    console.error('❌ 全国版ランキング取得エラー:', error);
    return false;
  }
}

// ============================================
// V1713-FIX: 動的ランキング更新（BOT質問ごとに自動更新）
// ============================================
async function updateRankingDynamically() {
  try {
    // 郵便番号がなければスキップ（全国版→地域版に切り替わるまで待つ）
    if (!window.BotConfig || !window.BotConfig.state || !window.BotConfig.state.currentZipcode) {
      console.log('🔄 郵便番号未入力のため動的更新スキップ');
      return false;
    }

    console.log('🔄 ランキング動的更新開始（モザイクの裏で更新）');

    // fetchRankingFromGAS()を呼び出してランキング再取得
    const success = await fetchRankingFromGAS();

    if (success) {
      // 現在のソートタイプを維持してallCompaniesを更新
      updateAllCompaniesFromDynamic(currentSortType);

      // displayRanking()を呼び出して表示更新（モザイクはそのまま）
      displayRanking();

      console.log('✅ ランキング動的更新完了（' + allCompanies.length + '社）');
      return true;
    } else {
      console.warn('⚠️ ランキング動的更新失敗');
      return false;
    }

  } catch (error) {
    console.error('❌ ランキング動的更新エラー:', error);
    return false;
  }
}

// グローバル変数・関数としてエクスポート
window.dynamicRankings = dynamicRankings;
window.fetchRankingFromGAS = fetchRankingFromGAS;
window.fetchNationalRanking = fetchNationalRanking;
window.updateRankingDynamically = updateRankingDynamically; // V1713-FIX: 動的更新
window.updateAllCompaniesFromDynamic = updateAllCompaniesFromDynamic;
window.displayRanking = displayRanking;
window.keepManager = keepManager;  // 業者名ベースのキープ管理
window.toggleKeep = toggleKeep;
window.showCompanyDetail = showCompanyDetail;
window.toggleAllCompanies = toggleAllCompanies;
window.showKeepBox = showKeepBox;
window.hideKeepBox = hideKeepBox;
window.removeFromKeepList = removeFromKeepList;
window.showRankingSection = showRankingSection;
window.scrollToPhoneForm = scrollToPhoneForm;
window.switchSortTab = switchSortTab;
window.completeHearingStage = completeHearingStage;

// 初期化時にキープリストをクリア
document.addEventListener('DOMContentLoaded', function() {
  console.log('📊 ページロード完了、初期化開始');

  // ページ読み込み時にlocalStorageとキープリストをクリア
  localStorage.removeItem('keepList');
  keepList = [];

  // キープ数バッジを更新
  updateKeepCountBadge();

  // キープボタンを非表示
  const keepButton = document.getElementById('keepButton');
  if (keepButton) {
    keepButton.classList.add('hidden');
  }

  console.log('✅ 初期化完了（ランキングはBOT開始時に表示）');
});