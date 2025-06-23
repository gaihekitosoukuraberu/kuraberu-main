/**
 * ランキング表示機能
 * estimate-app専用
 */

// サンプル会社データ（モザイク処理済み）
const allCompanies = [
  { rank: 1, name: 'T社', price: '78万円〜', rating: 4.9, reviews: 245, features: ['地元密着', '保証充実', '即日対応'] },
  { rank: 2, name: 'S社', price: '83万円〜', rating: 4.7, reviews: 189, features: ['最低価格保証', '職人直営'] },
  { rank: 3, name: 'K社', price: '85万円〜', rating: 4.5, reviews: 156, features: ['定期点検付', '環境配慮'] },
  { rank: 4, name: 'P社', price: '92万円〜', rating: 4.3, reviews: 123, features: ['10年保証', '高級塗料使用'] },
  { rank: 5, name: 'M社', price: '94万円〜', rating: 4.2, reviews: 98, features: ['無料保証', '迅速対応'] },
  { rank: 6, name: 'A社', price: '96万円〜', rating: 4.1, reviews: 87, features: ['高品質塗料', '技術力'] },
  { rank: 7, name: 'B社', price: '98万円〜', rating: 4.0, reviews: 76, features: ['老舗企業', '安心実績'] },
  { rank: 8, name: 'C社', price: '99万円〜', rating: 3.9, reviews: 65, features: ['価格重視', '短期施工'] }
];

let showingAll = false;
let namesRevealed = false;

// ヒアリング段階の管理
let currentHearingStage = 0; // 0: 未開始, 1: 第1段階完了, 2: 第2段階完了, 3: 第3段階完了, 4: 第4段階完了
const realCompanies = ['田中塗装', '山田ペイント', '佐藤工業', '鈴木建装', '松本塗装', '高橋ペイント', '伊藤建装', '渡辺塗装'];

// キープリスト管理（ページ読み込み時にクリア）
let keepList = [];

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
function showRankingSection() {
  const rankingSection = document.getElementById('rankingSection');
  const phoneSection = document.getElementById('phoneSection');
  
  if (rankingSection) {
    rankingSection.classList.remove('hidden');
    
    // サンプルランキングデータを表示
    displayRanking();
    console.log('ランキング表示完了、rankingListの内容:', document.getElementById('rankingList')?.innerHTML);
    
    // 相場セクションまでスクロール
    const areaPrice = document.getElementById('areaPrice');
    if (areaPrice) {
      areaPrice.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
    
    // 表示後にモザイクをかけるとメッセージを追加
    setTimeout(() => {
      console.log('モザイクをかけています...');
      
      // h2タイトル以外の部分にモザイクをかける（並び替えも含む）
      const rankingList = document.getElementById('rankingList');
      const sortingContainer = document.getElementById('sortingContainer');
      const sortingSection = sortingContainer ? sortingContainer.parentElement : null;
      const toggleButton = document.getElementById('toggleAllCompanies');
      
      if (rankingList) rankingList.classList.add('mosaic-blur');
      if (sortingSection) sortingSection.classList.add('mosaic-blur');
      if (toggleButton) toggleButton.parentElement.classList.add('mosaic-blur');
      
      // メッセージをランキングセクションの中央に追加（ボタンなし）
      const messageDiv = document.createElement('div');
      messageDiv.className = 'ranking-overlay-message';
      messageDiv.innerHTML = `
        <div style="color: #0ea5e9; font-size: 24px; margin-bottom: 8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block;">
            <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z" fill="#0ea5e9"/>
          </svg>
        </div>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333;">業者の比較ランキング！</div>
        <div style="font-size: 14px; line-height: 1.5; color: #666;">
          質問に答えて正確な相場と<br>
          業者情報を確認しましょう！
        </div>
      `;
      messageDiv.id = 'rankingOverlayMessage';
      rankingSection.appendChild(messageDiv);
      
      // 電話番号フォームにもモザイクをかける
      if (phoneSection) {
        phoneSection.classList.add('mosaic-blur');
      }
    }, 100);
  }
  
  // ソートボタンを無効化（おすすめ順以外）
  disableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
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
  const rankingList = document.getElementById('rankingList');
  if (!rankingList) {
    console.error('rankingList要素が見つかりません');
    return;
  }
  
  // 表示する会社数を決定（初期4社、もっと見るで5~8位まで）
  const companiesToShow = showingAll ? allCompanies : allCompanies.slice(0, 4);
  
  // ランキングカードを動的生成
  rankingList.innerHTML = companiesToShow.map(company => {
    const companyName = window.namesRevealed && realCompanies[company.rank - 1] ? 
      realCompanies[company.rank - 1] : company.name;
    
    const keepButtonState = getKeepButtonState(company.rank);
    
    // 1,2,3位の数字を金銀銅色に
    let rankColorClass = 'bg-blue-500';
    if (company.rank === 1) rankColorClass = 'bg-yellow-400 text-yellow-900'; // 金
    else if (company.rank === 2) rankColorClass = 'bg-gray-400 text-gray-900'; // 銀
    else if (company.rank === 3) rankColorClass = 'bg-yellow-600 text-yellow-100'; // 銅
    
    return `
      <div class="ranking-card bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="w-6 h-6 md:w-8 md:h-8 ${rankColorClass} rounded-full flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">
                  ${company.rank}
                </div>
                <h3 class="company-name font-bold text-sm md:text-base text-gray-900">${companyName}</h3>
              </div>
              <div class="flex items-center text-yellow-500">
                ${generateStarRating(company.rating)}
              </div>
            </div>
            
            <div class="flex items-center justify-between mb-2">
              <span class="text-orange-500 text-lg md:text-xl font-bold">${company.price}</span>
              <span class="text-xs md:text-sm text-gray-600">クチコミ(${company.reviews}件)</span>
            </div>
            
            <div class="flex flex-wrap gap-1 mb-3">
              ${company.features.map(feature => 
                `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${feature}</span>`
              ).join('')}
            </div>
            
          </div>
        </div>
        
        <!-- 3つのボタン：詳細を見る、キープ、業者名を見る -->
        <div class="flex gap-1 md:gap-2 mt-3">
          <button 
            onclick="showCompanyDetail(${company.rank})" 
            class="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 md:px-3 py-2 rounded text-xs md:text-sm font-medium flex-1"
          >
            詳細を見る
          </button>
          <button 
            onclick="toggleKeep(${company.rank}, '${companyName}')"
            class="${keepButtonState.classes} px-2 md:px-3 py-2 rounded text-xs md:text-sm font-medium flex-1"
          >
            ${keepButtonState.text}
          </button>
          <button 
            onclick="scrollToPhoneForm()" 
            class="${window.namesRevealed ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-pink-200 hover:bg-pink-300 text-pink-700'} px-2 md:px-3 py-2 rounded text-xs md:text-sm font-medium flex-1"
          >
            ${window.namesRevealed ? '無料見積もり' : '業者名を見る'}
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  console.log('ランキング表示完了（正しい仕様に復元）');
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
        <button class="text-red-500 hover:text-red-700" onclick="removeFromKeepList('${company.id}')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// キープリストから削除
function removeFromKeepList(companyId) {
  keepList = keepList.filter(item => item.id !== companyId);
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
  
  // ヒアリング段階チェック
  if (tabType !== 'tabRecommend' && currentHearingStage < 2) {
    console.log('第2ヒアリング段階が完了していないため、このタブは利用できません');
    return;
  }
  
  // すべてのタブの背景色をリセット（無効化されていないもののみ）
  const tabs = ['tabRecommend', 'tabCheap', 'tabReview', 'tabQuality'];
  tabs.forEach(tabId => {
    const tab = document.getElementById(tabId);
    if (tab && !tab.classList.contains('sort-tab-disabled')) {
      tab.className = tab.className.replace(/bg-\w+-\d+/g, 'bg-white');
      tab.classList.remove('border-blue-300', 'border-orange-300', 'border-green-300', 'border-purple-300');
      tab.classList.add('border-gray-200');
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
      case 'tabRecommend':
        activeTab.classList.add('bg-blue-50', 'border-blue-200');
        console.log('おすすめ順: 青色背景適用');
        break;
      case 'tabCheap':
        activeTab.classList.add('bg-yellow-50', 'border-yellow-200');
        console.log('安い順: 黄色背景適用');
        break;
      case 'tabReview':
        activeTab.classList.add('bg-green-50', 'border-green-200');
        console.log('クチコミ順: 緑色背景適用');
        break;
      case 'tabQuality':
        activeTab.classList.add('bg-purple-50', 'border-purple-200');
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
      case 'tabRecommend':
        rankingSection.classList.add('bg-blue-50');
        rankingSection.classList.add('ranking-section-blue');
        backgroundColor = '#eff6ff';
        customClass = 'ranking-section-blue';
        console.log('ランキング背景: 青色適用');
        break;
      case 'tabCheap':
        rankingSection.classList.add('bg-yellow-50');
        rankingSection.classList.add('ranking-section-yellow');
        backgroundColor = '#fefce8';
        customClass = 'ranking-section-yellow';
        console.log('ランキング背景: 黄色適用');
        break;
      case 'tabReview':
        rankingSection.classList.add('bg-green-50');
        rankingSection.classList.add('ranking-section-green');
        backgroundColor = '#f0fdf4';
        customClass = 'ranking-section-green';
        console.log('ランキング背景: 緑色適用');
        break;
      case 'tabQuality':
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
  }
  
  // 第2段階以降の処理は、chatbot.jsのtriggerSortEnableで制御
}

// グローバル関数としてエクスポート
window.displayRanking = displayRanking;
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
});