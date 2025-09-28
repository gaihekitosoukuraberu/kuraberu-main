/**
 * 共通ユーティリティ関数
 * estimate-app専用
 */

// GAS URL動的取得（キャッシュ付き）
let cachedGasUrl = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

async function getGasUrl() {
  // キャッシュが有効な場合は使用
  if (cachedGasUrl && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return cachedGasUrl;
  }
  
  // フォールバックURL（初回接続用）
  const fallbackUrls = [
    'https://script.google.com/macros/s/AKfycbziBoGkAHAvEtXJQ79JBxjdmti52E6NKE5b0W0CK6rrWu92rw9yBw_f5d7_lF81jGLwRQ/exec',
    'https://script.google.com/macros/s/AKfycbyC7utt6PUGGMLEq1XkbXuKfWls53Q9uANPEKs7vYUNSQh4OItyKSdcqrJyRIvkPcxZ9Q/exec'
  ];
  
  for (const fallbackUrl of fallbackUrls) {
    try {
      const response = await fetch(`${fallbackUrl}?action=getConfig`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });
      
      if (!response.ok) continue;
      
      const result = await response.json();
      if (result.success && result.data && result.data.gasUrl) {
        cachedGasUrl = result.data.gasUrl;
        cacheTimestamp = Date.now();
        return cachedGasUrl;
      }
    } catch (error) {
      console.warn('GAS URL取得失敗:', error.message);
      continue;
    }
  }
  
  // フォールバック
  cachedGasUrl = fallbackUrls[0];
  cacheTimestamp = Date.now();
  return cachedGasUrl;
}

// チャットセッション関連
function initializeChatSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  console.log('チャットセッション初期化: ', sessionId);
  
  // 簡単な検索キーワード取得（URLパラメータから）
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q') || '';
  console.log('検索キーワード: ', keyword);
  
  return sessionId;
}

// 相場表示関数
function showPriceResult(postalCode) {
  // 相場セクションを表示
  const areaPrice = document.getElementById('areaPrice');
  if (areaPrice) {
    areaPrice.classList.remove('hidden');
  }
  
  // モザイクランキングも表示
  showRankingSection();
  
  console.log(`郵便番号 ${postalCode} の相場を表示しました`);
}

// ランキングセクション表示関数
function showRankingSection() {
  // 元のHTMLの構造に合わせて修正
  const rankingSection = document.querySelector('.bg-gray-100.rounded-xl') || document.getElementById('rankingSection');
  if (rankingSection) {
    rankingSection.style.display = 'block';
    rankingSection.classList.remove('hidden');
    
    // ランキングを表示
    if (typeof displayRanking === 'function') {
      displayRanking();
    }
  } else {
    console.error('ランキングセクションが見つかりません');
  }
}

// 郵便番号検索関数（スプレッドシート連携）
async function searchByPostalCode() {
  try {
    const postalInput = document.getElementById('postalCode');
    if (!postalInput) {
      console.error('郵便番号入力フィールドが見つかりません');
      return;
    }
    
    const postalValue = postalInput.value.trim().replace(/[^0-9]/g, ''); // 数字のみ抽出
    console.log('郵便番号検索:', postalValue);
    
    if (postalValue.length < 7) {
      alert('郵便番号を正しく入力してください（7桁）');
      return;
    }
    
    // 🚀 即座にローディング開始
    startImmediateLoading();
    
    try {
      // 郵便番号DBスプレッドシートから住所を取得
      const addressData = await getAddressFromPostalCode(postalValue);
      
      if (addressData && addressData.success) {
        const areaText = `${addressData.prefecture}${addressData.city}の相場`;
        console.log('取得した住所:', areaText);
        showAreaPriceWithData(areaText);
      } else {
        // 見つからない場合は郵便番号に基づいた推測を使用
        console.log('住所が見つからないため、郵便番号に基づいた推測を使用');
        const areaText = getAreaFromPostalCode(postalValue) + 'の相場';
        showAreaPriceWithData(areaText);
      }
    } catch (error) {
      console.error('郵便番号検索エラー:', error);
      // エラー時は郵便番号に基づいた推測を使用
      const areaText = getAreaFromPostalCode(postalValue) + 'の相場';
      showAreaPriceWithData(areaText);
    }
  } catch (error) {
    console.error('郵便番号検索関数でエラーが発生しました:', error);
    alert('検索中にエラーが発生しました。もう一度お試しください。');
  }
}

// 🚀 即座にローディング開始
function startImmediateLoading() {
  // 相場セクションを表示
  const areaPrice = document.getElementById('areaPrice');
  if (areaPrice) {
    areaPrice.classList.remove('hidden');
  }
  
  // 既存のローディングセクションを表示
  const priceRevealAnimation = document.getElementById('priceRevealAnimation');
  if (priceRevealAnimation) {
    priceRevealAnimation.style.display = 'block';
  }
  
  // 結果セクションを非表示
  const priceResult = document.getElementById('priceResult');
  if (priceResult) {
    priceResult.classList.add('hidden');
  }
  
  // プログレスバーの滑らかなアニメーション
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.transition = 'width 0.3s ease-out';
    
    // 段階的に滑らかに進行（高速化）
    setTimeout(() => { progressBar.style.width = '50%'; }, 50);
    setTimeout(() => { progressBar.style.width = '80%'; }, 150);
    setTimeout(() => { progressBar.style.width = '95%'; }, 300);
    
    // インターバルIDをクリア用に保存（実際には使用しない）
    window.currentProgressInterval = null;
  }
}

// データ取得完了後の表示（ローディング既に表示済み）
function showAreaPriceWithData(areaText = '東京都杉並区の相場') {
  console.log('showAreaPriceWithData呼び出し:', areaText);
  
  // プログレスバーを100%にして完了
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'width 0.1s ease-in-out'; // より高速
    progressBar.style.width = '100%';
  }
  
  // プログレスインターバルをクリア（新方式では不要だが念のため）
  if (window.currentProgressInterval) {
    clearInterval(window.currentProgressInterval);
  }
  
  // 少し待ってから結果を表示
  setTimeout(() => {
    // ローディングアニメーションを非表示
    const priceRevealAnimation = document.getElementById('priceRevealAnimation');
    if (priceRevealAnimation) {
      priceRevealAnimation.style.display = 'none';
    }
    
    // areaNameも更新
    const areaName = document.getElementById('areaName');
    if (areaName) {
      areaName.textContent = areaText;
      console.log('✅ areaName更新:', areaText);
    } else {
      console.log('❌ areaName要素が見つかりません');
    }
    
    // 結果セクションを表示
    const priceResult = document.getElementById('priceResult');
    if (priceResult) {
      // 結果の内容を更新
      priceResult.innerHTML = `
        <h2 class="text-center text-lg font-bold mb-3 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-kuraberu-blue mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span id="locationHeading">${areaText}</span>
        </h2>
        
        <div class="bg-white p-4 rounded-xl mb-4 border border-blue-200">
          <p class="text-sm text-gray-600 mb-1 text-center" id="buildingInfo">2F建て戸建て築25年の場合（30坪）</p>
          <div class="relative">
            <div class="text-3xl font-extrabold text-center mb-2">
              <span class="text-kuraberu-blue" id="priceRange">60万円〜180万円</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 text-center mb-2">※建物の状態や使用材料により価格は変動します</p>
        </div>
      `;
      priceResult.classList.remove('hidden');
    }
    
    // 後続処理
    completeAreaPriceDisplay();
  }, 20); // 0.02秒に短縮
}

// エリア価格表示完了後の処理
function completeAreaPriceDisplay() {
  // 電話番号入力フォームを表示
  const phoneSection = document.getElementById('phoneSection');
  if (phoneSection) {
    phoneSection.style.display = 'block';
  }
  
  // 相場セクションを表示
  const areaPrice = document.getElementById('areaPrice');
  if (areaPrice) {
    areaPrice.classList.remove('hidden');
  }
  
  // ランキングセクションを表示（モザイク付き）
  if (typeof window.showRankingSection === 'function') {
    window.showRankingSection();
  } else {
    console.log('showRankingSection関数がまだ定義されていません');
    const rankingSection = document.getElementById('rankingSection');
    if (rankingSection) {
      rankingSection.classList.remove('hidden');
      if (typeof window.displayRanking === 'function') {
        window.displayRanking();
      }
    }
  }
  
  // GPTチャットボットを即座に自動起動
  if (typeof window.launchGPTChatbot === 'function') {
    window.launchGPTChatbot();
  } else {
    console.log('launchGPTChatbot関数がまだ定義されていません');
  }
}

// 郵便番号から地域を推測する関数
function getAreaFromPostalCode(postalCode) {
  const code = postalCode.substring(0, 3); // 最初の3桁で判定
  
  // 主要な郵便番号と地域のマッピング
  const postalCodeMap = {
    // 東京都
    '100': '東京都千代田区', '101': '東京都千代田区', '102': '東京都千代田区',
    '103': '東京都中央区', '104': '東京都中央区', '105': '東京都港区',
    '106': '東京都港区', '107': '東京都港区', '108': '東京都港区',
    '150': '東京都渋谷区', '151': '東京都渋谷区', '152': '東京都目黒区',
    '153': '東京都目黒区', '154': '東京都世田谷区', '155': '東京都世田谷区',
    '156': '東京都世田谷区', '157': '東京都世田谷区', '158': '東京都世田谷区',
    '160': '東京都新宿区', '161': '東京都新宿区', '162': '東京都新宿区',
    '163': '東京都新宿区', '164': '東京都中野区', '165': '東京都中野区',
    '166': '東京都杉並区', '167': '東京都杉並区', '168': '東京都杉並区',
    '169': '東京都新宿区', '170': '東京都豊島区', '171': '東京都豊島区',
    
    // 神奈川県
    '210': '神奈川県川崎市川崎区', '211': '神奈川県川崎市中原区', '212': '神奈川県川崎市幸区',
    '213': '神奈川県川崎市高津区', '214': '神奈川県川崎市多摩区', '215': '神奈川県川崎市麻生区',
    '220': '神奈川県横浜市西区', '221': '神奈川県横浜市神奈川区', '222': '神奈川県横浜市港北区',
    '223': '神奈川県横浜市港北区', '224': '神奈川県横浜市都筑区', '225': '神奈川県横浜市青葉区',
    '226': '神奈川県横浜市緑区', '227': '神奈川県横浜市青葉区', '228': '神奈川県座間市',
    '230': '神奈川県横浜市鶴見区', '231': '神奈川県横浜市中区', '232': '神奈川県横浜市南区',
    '233': '神奈川県横浜市港南区', '234': '神奈川県横浜市港南区', '235': '神奈川県横浜市磯子区',
    '236': '神奈川県横浜市金沢区', '240': '神奈川県横浜市保土ケ谷区', '241': '神奈川県横浜市旭区',
    '242': '神奈川県横浜市旭区', '244': '神奈川県横浜市戸塚区', '245': '神奈川県横浜市戸塚区',
    '246': '神奈川県横浜市瀬谷区', '247': '神奈川県横浜市栄区', '248': '神奈川県鎌倉市',
    '249': '神奈川県逗子市', '250': '神奈川県小田原市', '251': '神奈川県藤沢市',
    '252': '神奈川県相模原市中央区', '253': '神奈川県茅ヶ崎市', '254': '神奈川県平塚市',
    
    // 千葉県
    '260': '千葉県千葉市中央区', '261': '千葉県千葉市美浜区', '262': '千葉県千葉市花見川区',
    '263': '千葉県千葉市稲毛区', '264': '千葉県千葉市若葉区', '265': '千葉県千葉市若葉区',
    '266': '千葉県千葉市緑区', '270': '千葉県松戸市', '271': '千葉県松戸市',
    '272': '千葉県市川市', '273': '千葉県船橋市', '274': '千葉県船橋市',
    
    // 埼玉県
    '330': '埼玉県さいたま市浦和区', '331': '埼玉県さいたま市西区', '332': '埼玉県川口市',
    '333': '埼玉県川口市', '334': '埼玉県川口市', '335': '埼玉県蕨市',
    '336': '埼玉県さいたま市浦和区', '337': '埼玉県さいたま市見沼区', '338': '埼玉県さいたま市中央区',
    '339': '埼玉県さいたま市岩槻区', '340': '埼玉県草加市', '341': '埼玉県三郷市'
  };
  
  return postalCodeMap[code] || '東京都杉並区'; // デフォルト値
}

// 郵便番号DBスプレッドシートから住所を取得
async function getAddressFromPostalCode(postalCode) {
  try {
    // 動的GAS URL取得
    const gasUrl = await getGasUrl();
    
    console.log('🔍 郵便番号検索:', postalCode);
    
    // notify.jsのdoGetに合わせたパラメータ形式（actionを使用）
    const url = `${gasUrl}?action=getAddressByPostalCode&postalCode=${encodeURIComponent(postalCode)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ 郵便番号APIレスポンス:', result);
    
    return result;
    
  } catch (error) {
    console.log('⚠️ 郵便番号API呼び出しエラー（フォールバック使用）:', error.message);
    return { success: false, error: error.toString() };
  }
}

// グローバル関数としてエクスポート
window.showAreaPrice = showAreaPrice;
window.showAreaPriceWithData = showAreaPriceWithData;
window.startImmediateLoading = startImmediateLoading;
window.showPriceResult = showPriceResult;
window.showRankingSection = showRankingSection;
window.formatPostalCode = formatPostalCode;
window.adjustContentMarginForChatbot = adjustContentMarginForChatbot;
window.toggleChatbot = toggleChatbot;
window.closeChatbot = closeChatbot;
window.searchByPostalCode = searchByPostalCode;
window.completeAreaPriceDisplay = completeAreaPriceDisplay;

// エリア価格表示（showAreaPriceWithDataから統合）
function showAreaPrice(areaText = '東京都杉並区の相場') {
  console.log('showAreaPrice呼び出し:', areaText);
  
  // すでにローディングが表示されている場合は結果表示のみ行う
  const priceRevealAnimation = document.getElementById('priceRevealAnimation');
  const isLoadingVisible = priceRevealAnimation && priceRevealAnimation.style.display !== 'none';
  
  if (isLoadingVisible) {
    // ローディングが既に表示されている場合は、showAreaPriceWithDataの処理を実行
    showAreaPriceWithData(areaText);
    return;
  }
  
  // 新規のローディング開始処理
  startImmediateLoading();
  
  // データ表示処理を少し遅延して実行
  setTimeout(() => {
    showAreaPriceWithData(areaText);
  }, 400);
}

// 検索回数制限チェック（テスト用にコメントアウト）
function checkSearchLimit() {
  // const today = new Date().toDateString();
  // const searchData = JSON.parse(localStorage.getItem('priceSearchData') || '{}');
  
  // if (searchData.date !== today) {
  //   // 新しい日付の場合、カウントをリセット
  //   searchData.date = today;
  //   searchData.count = 0;
  // }
  
  // if (searchData.count >= 5) {
  //   alert('本日の検索回数の上限に達しました。明日再度お試しください。');
  //   return false;
  // }
  
  // // 検索回数を増加
  // searchData.count++;
  // localStorage.setItem('priceSearchData', JSON.stringify(searchData));
  
  // テスト用：常にtrue
  return true;
}

// チャットボット制御
function toggleChatbot() {
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (!chatbotContainer) return;
  
  if (chatbotContainer.classList.contains('translate-y-full')) {
    // 表示
    chatbotContainer.classList.remove('translate-y-full');
    chatbotVisible = true;
    adjustContentMarginForChatbot(true);
  } else {
    // 非表示
    chatbotContainer.classList.add('translate-y-full');
    chatbotVisible = false;
    adjustContentMarginForChatbot(false);
  }
}

function closeChatbot() {
  const chatbotContainer = document.getElementById('chatbotContainer');
  if (chatbotContainer) {
    chatbotContainer.classList.add('translate-y-full');
    chatbotVisible = false;
    adjustContentMarginForChatbot(false);
  }
}

// チャットボット表示状態に応じてコンテンツの余白を調整
function adjustContentMarginForChatbot(isVisible) {
  const body = document.body;
  
  if (isVisible) {
    // チャットボット表示時：bodyにクラスを追加
    body.classList.add('chatbot-visible');
    console.log('チャットボット表示：余白追加');
  } else {
    // チャットボット非表示時：bodyからクラスを削除
    body.classList.remove('chatbot-visible');
    console.log('チャットボット非表示：余白削除');
  }
}

// 郵便番号自動フォーマット関数（大文字→小文字、自動ハイフン）
function formatPostalCode(input) {
  // 大文字を小文字に、英数字以外を削除
  let value = input.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
  
  // アルファベットを数字に変換（郵便番号でよくある間違い）
  value = value.replace(/[A-Z]/g, function(match) {
    const alphaToNum = {
      'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2',
      'B': '8', 'G': '6', 'T': '7', 'A': '4'
    };
    return alphaToNum[match] || match;
  });
  
  // 数字のみを抽出
  value = value.replace(/[^0-9]/g, '');
  
  // 7桁で制限
  if (value.length > 7) {
    value = value.substring(0, 7);
  }
  
  // 3桁目と4桁目の間にハイフンを自動挿入
  if (value.length >= 4) {
    value = value.substring(0, 3) + '-' + value.substring(3);
  }
  
  input.value = value;
}

// ページ初期化
function initializePage() {
  // チャットセッション初期化
  const sessionId = initializeChatSession();
  
  // 基本的なイベントリスナー設定
  const postalInput = document.getElementById('postalCode');
  if (postalInput) {
    // 郵便番号入力時の自動フォーマット
    postalInput.addEventListener('input', function() {
      formatPostalCode(this);
    });
    
    postalInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (checkSearchLimit()) {
          searchByPostalCode();
        }
      }
    });
  }
  
  const searchBtn = document.getElementById('searchButton');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      if (checkSearchLimit()) {
        searchByPostalCode();
      }
    });
  }
  
  // チャットボット制御ボタン
  const closeChatbotBtn = document.getElementById('closeChatbot');
  if (closeChatbotBtn) {
    closeChatbotBtn.addEventListener('click', closeChatbot);
  }
  
  return sessionId;
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
  initializePage();
  
  // 初期状態ではチャットボットが非表示なので余白を削除
  setTimeout(() => {
    adjustContentMarginForChatbot(false);
  }, 100);
  
  console.log('estimate-app初期化完了');
});