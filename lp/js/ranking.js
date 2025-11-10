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

// サンプル会社データ（モザイク処理済み）- デフォルトのフォールバックデータ
let allCompanies = [
  { rank: 1, name: 'T社', price: '78万円〜', rating: 4.9, reviews: 245, features: ['地元密着', '保証充実', '即日対応'] },
  { rank: 2, name: 'S社', price: '83万円〜', rating: 4.7, reviews: 189, features: ['最低価格保証', '職人直営'] },
  { rank: 3, name: 'K社', price: '85万円〜', rating: 4.5, reviews: 156, features: ['定期点検付', '環境配慮'] },
  { rank: 4, name: 'P社', price: '92万円〜', rating: 4.3, reviews: 123, features: ['10年保証', '高級塗料使用'] },
  { rank: 5, name: 'M社', price: '94万円〜', rating: 4.2, reviews: 98, features: ['無料保証', '迅速対応'] },
  { rank: 6, name: 'A社', price: '96万円〜', rating: 4.1, reviews: 87, features: ['高品質塗料', '技術力'] },
  { rank: 7, name: 'B社', price: '98万円〜', rating: 4.0, reviews: 76, features: ['老舗企業', '安心実績'] },
  { rank: 8, name: 'C社', price: '99万円〜', rating: 3.9, reviews: 65, features: ['価格重視', '短期施工'] }
];

// GASから取得したランキングデータ（キャッシュ）
let dynamicRankings = null;
let currentSortType = 'recommended'; // recommended, cheap, review, quality

let showingAll = false;
let namesRevealed = false;

// ============================================
// GASからランキングデータを取得
// ============================================
async function fetchRankingFromGAS() {
  try {
    console.log('🏆 GASからランキング取得開始');

    // BotConfigから必要なパラメータを取得
    if (!window.BotConfig || !window.BotConfig.state) {
      console.error('❌ BotConfigが見つかりません');
      return false;
    }

    const zipcode = window.BotConfig.state.currentZipcode;
    if (!zipcode) {
      console.error('❌ 郵便番号が見つかりません');
      return false;
    }

    // BOT回答から施工箇所と築年数を取得
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

    const params = {
      zipcode: zipcode,
      workTypes: workTypes,
      buildingAgeMin: buildingAgeMin,
      buildingAgeMax: buildingAgeMax
    };

    console.log('📤 ランキングリクエストパラメータ:', params);

    // CVAPI.getRankingを呼び出し
    if (!window.CVAPI || !window.CVAPI.getRanking) {
      console.error('❌ CVAPI.getRankingが見つかりません');
      return false;
    }

    const response = await window.CVAPI.getRanking(params);

    if (!response.success) {
      console.error('❌ ランキング取得失敗:', response.error);
      return false;
    }

    console.log('✅ ランキング取得成功:', response);

    // レスポンスをキャッシュ
    dynamicRankings = response.rankings;
    window.dynamicRankings = dynamicRankings; // グローバルスコープにも反映

    console.log('📦 ランキングデータをキャッシュしました');

    return true;

  } catch (error) {
    console.error('❌ ランキング取得エラー:', error);
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
    console.warn('⚠️ 動的ランキングデータがありません、デフォルトデータをソート');
    // デフォルトデータをソート
    sortDefaultData(sortType);
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
    console.warn('⚠️ ランキングデータが空です、デフォルトデータをソート');
    sortDefaultData(sortType);
    return;
  }

  console.log(`📊 ${sortType}順のランキングを適用 (${rankingList.length}件)`);

  // GASレスポンスをallCompanies形式に変換
  allCompanies = rankingList.map((company, index) => ({
    rank: index + 1,
    name: company.companyName || `${index + 1}位業者`,
    price: company.avgContractAmount ? `${Math.floor(company.avgContractAmount / 10000)}万円〜` : '見積もり必要',
    rating: company.rating || 4.0,
    reviews: company.reviewCount || 0,
    features: extractFeatures(company),
    // 元データも保持
    _original: company
  }));

  console.log('✅ allCompanies更新完了:', allCompanies.length, '件');
}

// デフォルトデータをソート
function sortDefaultData(sortType) {
  const sortedCompanies = [...allCompanies];

  switch(sortType) {
    case 'cheap':
      // 価格で昇順ソート
      sortedCompanies.sort((a, b) => {
        const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
        const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
        return priceA - priceB;
      });
      break;
    case 'review':
      // レビュー数で降順ソート
      sortedCompanies.sort((a, b) => b.reviews - a.reviews);
      break;
    case 'premium':
      // 評価で降順ソート
      sortedCompanies.sort((a, b) => b.rating - a.rating);
      break;
    case 'recommended':
    default:
      // デフォルト順（変更なし）
      break;
  }

  // ランクを再割り当て
  allCompanies = sortedCompanies.map((company, index) => ({
    ...company,
    rank: index + 1
  }));

  console.log(`📊 デフォルトデータを${sortType}順でソート完了`);
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
const realCompanies = ['田中塗装', '山田ペイント', '佐藤工業', '鈴木建装', '松本塗装', '高橋ペイント', '伊藤建装', '渡辺塗装'];

// キープリスト管理（ページ読み込み時にクリア）
let keepList = [];

// キープマネージャー（業者名ベースで管理）
const keepManager = {
  // キープ状態をチェック
  isKept(companyName) {
    return keepList.some(item => item.name === companyName);
  },

  // キープ切り替え
  toggle(rank, companyName, buttonElement) {
    const existingIndex = keepList.findIndex(item => item.name === companyName);

    if (existingIndex > -1) {
      // 既にキープされている場合は削除
      keepList.splice(existingIndex, 1);
      console.log('🗑️ キープ解除:', companyName);
    } else {
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

    // 無料見積もりボタンの表示制御（V1670）
    const estimateBtnContainer = document.getElementById('estimateBtnContainer');
    if (estimateBtnContainer) {
      if (keepList.length > 0) {
        estimateBtnContainer.classList.remove('hidden');
        estimateBtnContainer.style.display = 'block';
        console.log('✅ 無料見積もりボタン表示');
      } else {
        estimateBtnContainer.classList.add('hidden');
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

  // ボタンの表示を更新
  updateButton(buttonElement, companyName) {
    if (!buttonElement) return;

    const isKept = this.isKept(companyName);
    const textElement = buttonElement.querySelector('.keep-text');

    if (isKept) {
      buttonElement.className = 'keep-btn bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap';
      if (textElement) textElement.textContent = 'キープ中！';
    } else {
      buttonElement.className = 'keep-btn bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap';
      if (textElement) textElement.textContent = 'キープ';
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
        console.warn('⚠️ ランキングデータ取得失敗、デフォルトデータで表示');
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

    // スマホ版の場合はランキングセクションにスクロール（1秒後）
    if (window.innerWidth < 768) {
      setTimeout(() => {
        rankingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 1000);
    } else {
      // PC版は相場セクションまでスクロール
      const areaPrice = document.getElementById('areaPrice');
      if (areaPrice) {
        // 相場カードの上部に少し余白が見えるようにスクロール調整
        const offsetPosition = areaPrice.offsetTop + 10;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }
  
  // ソートボタンを無効化（おすすめ順以外）
  disableSortButtons(['sortCheap', 'sortReview', 'sortQuality']);
}

// 星レーティング生成関数（5つ星）
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // 満ちた星
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '★';
  }
  
  // 半分の星
  if (hasHalfStar) {
    starsHtml += '☆'; // または半分の星を表現
  }
  
  // 空の星
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '☆';
  }
  
  return `<span class="text-sm">${starsHtml}</span><span class="text-xs ml-1">${rating}</span>`;
}

// ランキング表示（正しい仕様に復元）
function displayRanking() {
  try {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) {
      console.error('rankingList要素が見つかりません');
      return;
    }
  
  // 表示する会社数を決定（初期4社、もっと見るで5~8位まで）
  const companiesToShow = showingAll ? allCompanies : allCompanies.slice(0, 4);
  
  // ランキングカードを動的生成（samplesフォーマット）
  rankingList.innerHTML = companiesToShow.map(company => {
    // GASから取得した実名を使用（イニシャルではなく実名表示）
    const companyName = company.name;

    // 1位は青、2位以降はグレー
    let rankColorClass = company.rank === 1 ? 'text-blue-600' : 'text-gray-600';

    // 星評価（5つ星表示）
    const fullStars = Math.floor(company.rating);
    const emptyStars = 5 - fullStars;
    const starsHtml = '⭐'.repeat(fullStars) + '☆'.repeat(emptyStars);

    return `
      <div class="ranking-item border border-gray-300 rounded-lg p-2 bg-white">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="${rankColorClass} text-lg font-bold">${company.rank}</span>
            <h3 class="text-base font-bold">${companyName}</h3>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-yellow-500 text-sm">${starsHtml}</span>
            <span class="font-bold text-sm">${company.rating}</span>
          </div>
        </div>
        <div class="flex items-center justify-between mb-1">
          <div class="flex gap-1">
            ${company.features.slice(0, 3).map((feature, idx) => {
              const colors = [
                'bg-blue-200 text-blue-800',
                'bg-green-200 text-green-800',
                'bg-red-200 text-red-800'
              ];
              return `<span class="${colors[idx % 3]} text-xs px-1.5 py-0.5 rounded">${feature}</span>`;
            }).join('')}
          </div>
          <div class="text-gray-600 text-xs">
            施工実績: ${company.reviews || 0}件
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-gray-700">見積もり価格: ${company.price}</span>
          </div>
          <div class="flex gap-1">
            <button class="detail-btn bg-blue-200 text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-300 text-xs font-medium w-[90px] whitespace-nowrap">
              詳細
            </button>
            <button onclick="keepManager.toggle('${company.rank}', '${companyName}', this)" class="keep-btn px-2 py-1 rounded-lg text-xs font-medium w-[90px] whitespace-nowrap">
              <span class="keep-text">キープ</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  console.log('ランキング表示完了（正しい仕様に復元）');

  // 「もっと見る」ボタンの表示制御
  const toggleButton = document.getElementById('toggleAllCompanies');
  if (toggleButton) {
    if (showingAll || allCompanies.length <= 4) {
      // 全て表示中、または業者数が4社以下の場合は非表示
      toggleButton.style.display = 'none';
    } else {
      // 4社のみ表示中かつ5社以上ある場合は表示
      toggleButton.style.display = 'block';
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

// 業者名の開示状態を更新（動的生成のためランキングを再描画）
function updateCompanyNames() {
  // 動的生成の場合はランキングを再描画するだけ
  // displayRanking()関数内でwindow.namesRevealedの状態をチェックして適切な表示を行う
  console.log('業者名更新処理省略（動的生成のため）');
}

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

// 会社詳細表示
function showCompanyDetail(companyRank) {
  const company = allCompanies.find(c => c.rank === companyRank);
  if (!company) return;
  
  const companyName = window.namesRevealed && realCompanies[company.rank - 1] ? 
    realCompanies[company.rank - 1] : company.name;
  
  // モーダル作成
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">${companyName}</h3>
        <button id="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-3">
        <div><strong>料金:</strong> ${company.price}</div>
        <div><strong>評価:</strong> ${company.rating} (${company.reviews}件)</div>
        <div><strong>特徴:</strong> ${company.features.join(', ')}</div>
        <div class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-600">この業者の詳細情報や口コミをご確認いただけます。</p>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex-1">
          見積もり依頼
        </button>
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

// キープリストの実名更新
function updateKeepListWithRealNames() {
  keepList.forEach(item => {
    const companyIndex = parseInt(item.id) - 1;
    if (realCompanies[companyIndex]) {
      item.name = realCompanies[companyIndex];
    }
  });
  localStorage.setItem('keepList', JSON.stringify(keepList));
}

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

// ソートボタンの無効化関数
function disableSortButtons(buttonIds) {
  buttonIds.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add('sort-tab-disabled');
    }
  });
}

// ソートボタンの有効化関数
function enableSortButtons(buttonIds) {
  console.log('🎯 ソートボタン有効化開始:', buttonIds);
  buttonIds.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    console.log('ボタン確認:', buttonId, 'ボタン要素:', button);
    if (button) {
      console.log('有効化前のクラス:', button.className);
      button.classList.remove('sort-tab-disabled');
      console.log('有効化後のクラス:', button.className);
    } else {
      console.log('⚠️ ボタンが見つかりません:', buttonId);
    }
  });
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
    
    // 第1段階完了時にソートボタンを有効化
    enableSortButtons(['sortCheap', 'sortReview', 'sortQuality']);
    console.log('第1段階完了: 全ソートボタン有効化');
  }
  
  // 第2段階以降の処理は、chatbot.jsのtriggerSortEnableで制御
}

// グローバル変数・関数としてエクスポート
window.dynamicRankings = dynamicRankings;
window.fetchRankingFromGAS = fetchRankingFromGAS;
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
window.disableSortButtons = disableSortButtons;
window.enableSortButtons = enableSortButtons;

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