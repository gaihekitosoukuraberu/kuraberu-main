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

// V1704: revealCompanyNames()関数削除 - 実データのみ使用

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
    showCompanyNamesBtn.addEventListener('click', async function() {
      const phoneInput = document.getElementById('phoneNumber');
      const phoneNumber = phoneInput.value.trim();

      console.log('入力された電話番号:', phoneNumber, '文字数:', phoneNumber.length);

      if (phoneNumber.length < 8) {
        alert('正しい電話番号を入力してください');
        return;
      }

      console.log('電話番号検証OK、業者名を表示中...');

      // V1713-UX: ローディング表示
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        const loadingHtml = `
          <div id="phoneLoadingIndicator" class="container mx-auto px-4">
            <div class="max-w-2xl mx-auto">
              <div class="flex items-center justify-center py-8">
                <div class="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-lg">
                  <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="text-base text-blue-600 font-medium">業者名を表示中...</span>
                </div>
              </div>
            </div>
          </div>
        `;
        phoneSection.innerHTML = loadingHtml;
      }

      // 電話番号を保存（先に保存）
      localStorage.setItem('userPhone', phoneNumber);

      // V1713-UX: CV1送信をバックグラウンド実行（UIブロックしない）
      console.log('📞 CV1送信開始（バックグラウンド）- 電話番号:', phoneNumber);
      if (window.CVAPI && typeof window.CVAPI.sendCV1 === 'function') {
        // awaitせずにバックグラウンドで実行
        window.CVAPI.sendCV1(phoneNumber).then(result => {
          if (result.success) {
            console.log('✅ CV1送信成功（バックグラウンド）- ID:', result.cvId);
          } else {
            console.error('❌ CV1送信失敗（バックグラウンド）:', result.error);
            console.warn('⚠️ CV2送信時に統合モードで再送します');
          }
        }).catch(error => {
          console.error('❌ CV1送信エラー（バックグラウンド）:', error);
          console.warn('⚠️ CV2送信時に統合モードで再送します');
        });
      } else {
        console.error('❌ CVAPI.sendCV1が見つかりません');
      }

      // 電話番号入力後：ランキングを再表示（V1704 - 実データのみ使用）
      console.log('🔓 ランキング再表示');

      // すでにGASから取得済みの場合は、実名で再表示
      if (window.dynamicRankings) {
        console.log('✅ すでにランキング取得済み、実名表示に切り替え');
        if (typeof window.displayRanking === 'function') {
          window.displayRanking();
        }
      } else {
        // 未取得の場合は、ここで取得
        console.log('⚠️ ランキング未取得のため、ここで取得します');
        if (typeof window.fetchRankingFromGAS === 'function') {
          const success = await window.fetchRankingFromGAS();
          if (success && typeof window.displayRanking === 'function') {
            window.displayRanking();
          }
        }
      }

      // V1713-UX: ローディング削除してサンクスメッセージ表示
      const phoneLoadingIndicator = document.getElementById('phoneLoadingIndicator');
      if (phoneLoadingIndicator && phoneSection) {
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
        console.log('✅ ローディング削除 → サンクスメッセージ表示');
      }

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
      if (typeof window.displayRanking === 'function') {
        window.displayRanking();
        console.log('✅ ランキング再描画完了' + (rankingFetched ? '（動的データ）' : '（デフォルトデータ）'));
      } else {
        console.log('displayRanking関数がまだ定義されていません');
      }
      
      // 1秒後にランキングセクション上部へ素早くスクロール
      setTimeout(() => {
        const rankingSection = document.getElementById('rankingSection') || document.getElementById('companyRanking');
        if (rankingSection) {
          // 相場カードの上部に少し余白が見えるようにスクロール調整
          const areaPrice = document.getElementById('areaPrice');
          if (areaPrice) {
            const offsetPosition = areaPrice.offsetTop + 10;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          } else {
            // フォールバック：ランキングセクションにスクロール
            const offsetPosition = rankingSection.offsetTop + 10;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
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
      if (typeof window.showKeepBox === 'function') {
        window.showKeepBox();
      } else {
        console.log('showKeepBox関数がまだ定義されていません');
      }
    });
  }
  
  // キープボックス閉じるボタン
  const closeKeepBox = document.getElementById('closeKeepBox');
  if (closeKeepBox) {
    closeKeepBox.addEventListener('click', function() {
      if (typeof window.hideKeepBox === 'function') {
        window.hideKeepBox();
      } else {
        console.log('hideKeepBox関数がまだ定義されていません');
      }
    });
  }
  
  // モーダル背景クリックで閉じる
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.addEventListener('click', function(e) {
      if (e.target === keepBoxModal) {
        if (typeof window.hideKeepBox === 'function') {
          window.hideKeepBox();
        } else {
          console.log('hideKeepBox関数がまだ定義されていません');
        }
      }
    });
  }
});

// グローバル関数としてエクスポート（V1704: revealCompanyNames削除）
window.showPhoneInputForm = showPhoneInputForm;
window.formatPhoneNumber = formatPhoneNumber;