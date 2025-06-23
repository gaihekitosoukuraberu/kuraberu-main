/**
 * 電話番号入力フォーム機能
 * estimate-app専用
 */

// 電話番号入力フォームを表示する関数
function showPhoneInputForm() {
  const phoneSection = document.getElementById('phoneSection');
  if (phoneSection) {
    // スムーズにスクロールして表示
    phoneSection.style.display = 'block';
    phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    console.log('📱 電話番号フォーム表示完了');
    
    // フォーカスを電話番号入力欄に移動
    setTimeout(() => {
      const phoneInput = document.getElementById('phoneNumber');
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 500);
  }
}

// 電話番号自動フォーマット関数
function formatPhoneNumber(input) {
  let value = input.value.replace(/[^0-9]/g, ''); // 数字以外を削除
  
  if (value.length >= 3 && value.length <= 7) {
    value = value.slice(0, 3) + '-' + value.slice(3);
  } else if (value.length > 7) {
    value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
  }
  
  input.value = value;
}

// 業者名をイニシャルから実名に変更する関数
function revealCompanyNames() {
  console.log('revealCompanyNames実行開始');
  
  // グローバルフラグを設定（イニシャルに戻ることを防ぐ）
  window.namesRevealed = true;
  console.log('window.namesRevealed =', window.namesRevealed);
  
  // T社、S社などを実名に変更
  const companyNameElements = document.querySelectorAll('.company-name, h4, h3');
  console.log('会社名要素数:', companyNameElements.length);
  
  companyNameElements.forEach(element => {
    const text = element.textContent;
    if (text.includes('T社')) {
      element.textContent = text.replace('T社', '田中ホームテック');
      console.log('T社を田中ホームテックに変更');
    } else if (text.includes('S社')) {
      element.textContent = text.replace('S社', '佐藤建装');
      console.log('S社を佐藤建装に変更');
    } else if (text.includes('Y社')) {
      element.textContent = text.replace('Y社', '山田塗装工業');
      console.log('Y社を山田塗装工業に変更');
    } else if (text.includes('H社')) {
      element.textContent = text.replace('H社', 'ハート工務店');
      console.log('H社をハート工務店に変更');
    } else if (text.includes('M社')) {
      element.textContent = text.replace('M社', '松本リフォーム');
      console.log('M社を松本リフォームに変更');
    } else if (text.includes('K社')) {
      element.textContent = text.replace('K社', '加藤建設');
      console.log('K社を加藤建設に変更');
    } else if (text.includes('W社')) {
      element.textContent = text.replace('W社', '渡辺塗装店');
      console.log('W社を渡辺塗装店に変更');
    } else if (text.includes('N社')) {
      element.textContent = text.replace('N社', '中村ペイント');
      console.log('N社を中村ペイントに変更');
    }
  });
  
  // 「※電話番号入力後に詳細開示」の文言を削除
  const noteElements = document.querySelectorAll('p, span');
  noteElements.forEach(element => {
    if (element.textContent.includes('※電話番号入力後に詳細開示')) {
      element.style.display = 'none';
    }
  });
  
  // 「業者名を見る」ボタンを「無料見積もり」に変更
  const companyButtons = document.querySelectorAll('button');
  companyButtons.forEach(button => {
    if (button.textContent.includes('業者名を見る')) {
      button.innerHTML = button.innerHTML.replace('業者名を見る', '無料見積もり');
    }
  });
  
  console.log('revealCompanyNames実行完了');
}

// 電話番号入力フォームのイベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
  // 「業者名を見る」ボタンのイベントリスナー
  const showCompanyBtn = document.getElementById('showCompanyNamesFloatingBtn');
  if (showCompanyBtn) {
    showCompanyBtn.addEventListener('click', function() {
      // 電話番号入力セクションに自動スクロール
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 「もう一度見る」ボタンのイベントリスナー
  const showAgainBtn = document.getElementById('showCompanyNamesAgainBtn');
  if (showAgainBtn) {
    showAgainBtn.addEventListener('click', function() {
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 電話番号入力の「表示する」ボタンのイベントリスナー
  const showCompanyNamesBtn = document.getElementById('showCompanyNamesBtn');
  if (showCompanyNamesBtn) {
    showCompanyNamesBtn.addEventListener('click', function() {
      const phoneInput = document.getElementById('phoneNumber');
      const phoneNumber = phoneInput.value.trim();
      
      console.log('入力された電話番号:', phoneNumber, '文字数:', phoneNumber.length);
      
      if (phoneNumber.length < 8) {
        alert('正しい電話番号を入力してください');
        return;
      }
      
      console.log('電話番号検証OK、業者名を表示中...');
      
      // 電話番号入力フォームをサンクスメッセージに切り替え
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.innerHTML = `
          <div class="container mx-auto px-4">
            <div class="max-w-2xl mx-auto">
              <div class="bg-green-50 p-8 rounded-2xl border-2 border-green-300 shadow-lg text-center">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="font-bold text-lg sm:text-xl md:text-xl lg:text-xl text-green-800 mb-2 whitespace-nowrap">おめでとうございます！</h3>
                <p class="text-sm sm:text-base md:text-base lg:text-base text-green-700 whitespace-nowrap">無料見積もりが可能になりました！</p>
              </div>
            </div>
          </div>
        `;
      }
      
      // 業者名をイニシャルから実名に変更
      revealCompanyNames();
      
      // 下部ボタンを「無料見積もり」に変更
      const showCompanyBtn = document.getElementById('showCompanyNamesFloatingBtn');
      if (showCompanyBtn) {
        showCompanyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          業者名を見る
        `;
      }
      
      // ランキングを再描画して「無料見積もり」ボタンに更新
      displayRanking();
      
      // 1秒後にランキングセクション上部へ素早くスクロール
      setTimeout(() => {
        const rankingSection = document.getElementById('rankingSection') || document.getElementById('companyRanking');
        if (rankingSection) {
          rankingSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 1000);
      
      // 電話番号入力完了後、第4段階（最終確認）に進む
      setTimeout(() => {
        if (typeof window.proceedToStage4 === 'function') {
          window.proceedToStage4();
        } else {
          console.log('proceedToStage4関数がまだ定義されていません');
        }
      }, 3000);
    });
  }

  // キープボタン関連のイベントリスナー
  const viewKeptCompaniesTop = document.getElementById('viewKeptCompaniesTop');
  if (viewKeptCompaniesTop) {
    viewKeptCompaniesTop.addEventListener('click', function() {
      showKeepBox();
    });
  }
  
  // キープボックス閉じるボタン
  const closeKeepBox = document.getElementById('closeKeepBox');
  if (closeKeepBox) {
    closeKeepBox.addEventListener('click', function() {
      hideKeepBox();
    });
  }
  
  // モーダル背景クリックで閉じる
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.addEventListener('click', function(e) {
      if (e.target === keepBoxModal) {
        hideKeepBox();
      }
    });
  }
});

// グローバル関数としてエクスポート
window.showPhoneInputForm = showPhoneInputForm;
window.revealCompanyNames = revealCompanyNames;
window.formatPhoneNumber = formatPhoneNumber;