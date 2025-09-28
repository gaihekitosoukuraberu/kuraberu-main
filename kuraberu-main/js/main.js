/**
 * 外壁塗装くらべる - メインJavaScript
 * 
 * このファイルはページの初期化とコンポーネント読み込みを担当します。
 */

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  // コンポーネントを読み込む
  loadComponents().then(() => {
    // イベントリスナーを設定
    setupEventListeners();
    
    // デモ用: 結果エリアを表示（実際はAPIリクエスト後に表示）
    // document.getElementById('result-area').classList.remove('hidden');
  });
});

/**
 * HTMLコンポーネントを読み込む
 * @returns {Promise} 全てのコンポーネント読み込み完了時に解決するPromise
 */
async function loadComponents() {
  try {
    // ヘッダーを読み込み
    const headerResponse = await fetch('components/header.html');
    const headerHtml = await headerResponse.text();
    document.getElementById('header-container').innerHTML = headerHtml;
    
    // ヒーローセクションを読み込み
    const heroResponse = await fetch('components/hero.html');
    const heroHtml = await heroResponse.text();
    document.getElementById('hero-container').innerHTML = heroHtml;
    
    // 郵便番号フォームを読み込み
    const priceFormResponse = await fetch('components/priceForm.html');
    const priceFormHtml = await priceFormResponse.text();
    document.getElementById('price-form-container').innerHTML = priceFormHtml;
    
    // フッターを読み込み
    const footerResponse = await fetch('components/footer.html');
    const footerHtml = await footerResponse.text();
    document.getElementById('footer-container').innerHTML = footerHtml;
    
    console.log('全コンポーネントの読み込みが完了しました');
    return true;
  } catch (error) {
    console.error('コンポーネントの読み込み中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * 相場カードコンポーネントを読み込む
 * @param {string} zipCode - 郵便番号
 * @returns {Promise<Element>} 読み込まれた相場カード要素
 */
async function loadPriceCard(zipCode) {
  try {
    const priceCardResponse = await fetch('components/priceCard.html');
    const priceCardHtml = await priceCardResponse.text();
    
    // 郵便番号と地域名を置換（実際はAPIから取得したデータを使用）
    const updatedHtml = priceCardHtml
      .replace('123-4567', formatZipCode(zipCode))
      .replace('東京都新宿区', getLocationName(zipCode));
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = updatedHtml;
    
    return tempDiv.firstElementChild;
  } catch (error) {
    console.error('相場カードの読み込み中にエラーが発生しました:', error);
    return null;
  }
}

/**
 * ウィザードコンポーネントを読み込む
 * @returns {Promise<Element>} 読み込まれたウィザード要素
 */
async function loadWizard() {
  try {
    const wizardResponse = await fetch('components/wizard.html');
    const wizardHtml = await wizardResponse.text();
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = wizardHtml;
    
    return tempDiv.firstElementChild;
  } catch (error) {
    console.error('ウィザードの読み込み中にエラーが発生しました:', error);
    return null;
  }
}

/**
 * ランキングコンポーネントを読み込む
 * @param {string} location - 地域名
 * @returns {Promise<Element>} 読み込まれたランキング要素
 */
async function loadRanking(location = '東京都新宿区') {
  try {
    const rankingResponse = await fetch('components/ranking.html');
    const rankingHtml = await rankingResponse.text();
    
    // 地域名を置換
    const updatedHtml = rankingHtml.replace(
      '<span class="ranking__area">東京都新宿区</span>', 
      `<span class="ranking__area">${location}</span>`
    );
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = updatedHtml;
    
    return tempDiv.firstElementChild;
  } catch (error) {
    console.error('ランキングの読み込み中にエラーが発生しました:', error);
    return null;
  }
}

/**
 * イベントリスナーを設定する
 */
function setupEventListeners() {
  // 郵便番号フォームのイベントリスナー
  const zipForm = document.getElementById('zip-form');
  if (zipForm) {
    zipForm.addEventListener('submit', handleZipSubmit);
    
    // 郵便番号入力のハイフン自動挿入
    const zipInput = document.getElementById('zip-input');
    if (zipInput) {
      zipInput.addEventListener('input', formatZipInputOnType);
    }
  }
  
  // ドキュメント全体のイベント委任（動的に追加される要素用）
  document.addEventListener('click', event => {
    // ウィザード開始ボタン
    if (event.target.id === 'start-wizard-button' || 
        event.target.closest('#start-wizard-button')) {
      startWizard();
    }
  });
}

/**
 * 郵便番号フォーム送信処理
 * @param {Event} e - フォーム送信イベント
 */
async function handleZipSubmit(e) {
  e.preventDefault();
  
  // 郵便番号を取得
  const zipInput = document.getElementById('zip-input');
  const zipCode = zipInput.value.replace(/[^\d]/g, '');
  
  // 郵便番号のバリデーション
  if (\!validateZipCode(zipCode)) {
    alert('正しい郵便番号を入力してください（例：123-4567）');
    return;
  }
  
  // ローディング表示
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
    simulateLoading();
  }
  
  // 実際のアプリではここでAPIリクエストを行う
  // このデモでは3秒後に結果表示
  setTimeout(async () => {
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    
    const resultArea = document.getElementById('result-area');
    if (resultArea) {
      // 結果エリアを初期化
      resultArea.innerHTML = '';
      resultArea.classList.remove('hidden');
      
      // 相場カードを読み込んで追加
      const priceCard = await loadPriceCard(zipCode);
      if (priceCard) {
        resultArea.appendChild(priceCard);
      }
      
      // 画面をスクロール
      resultArea.scrollIntoView({ behavior: 'smooth' });
    }
  }, 3000);
}

/**
 * 郵便番号から地域名を取得する
 * このデモでは郵便番号の最初の桁に基づいて固定の地域名を返す
 * @param {string} zipCode - 郵便番号
 * @returns {string} - 地域名
 */
function getLocationName(zipCode) {
  // 実際のアプリでは郵便番号APIなどを使用して地域名を取得
  const firstDigit = zipCode.charAt(0);
  const locations = {
    '0': '北海道札幌市',
    '1': '東京都新宿区',
    '2': '神奈川県横浜市',
    '3': '埼玉県さいたま市',
    '4': '愛知県名古屋市',
    '5': '大阪府大阪市',
    '6': '京都府京都市',
    '7': '兵庫県神戸市',
    '8': '福岡県福岡市',
    '9': '沖縄県那覇市'
  };
  
  return locations[firstDigit] || '東京都新宿区';
}

/**
 * ローディングアニメーションをシミュレート
 */
function simulateLoading() {
  const progressBar = document.getElementById('progress-bar');
  const step1 = document.getElementById('loading-step1');
  const step2 = document.getElementById('loading-step2');
  const step3 = document.getElementById('loading-step3');
  
  // ステップ1
  setTimeout(() => {
    if (progressBar) progressBar.style.width = '30%';
    if (step1) step1.classList.add('active');
  }, 300);
  
  // ステップ2
  setTimeout(() => {
    if (progressBar) progressBar.style.width = '60%';
    if (step1) {
      step1.classList.remove('active');
      step1.classList.add('complete');
    }
    if (step2) step2.classList.add('active');
  }, 1200);
  
  // ステップ3
  setTimeout(() => {
    if (progressBar) progressBar.style.width = '100%';
    if (step2) {
      step2.classList.remove('active');
      step2.classList.add('complete');
    }
    if (step3) step3.classList.add('active');
  }, 2000);
  
  // 完了
  setTimeout(() => {
    if (step3) {
      step3.classList.remove('active');
      step3.classList.add('complete');
    }
  }, 2800);
}

/**
 * ウィザードを開始する
 */
async function startWizard() {
  const resultArea = document.getElementById('result-area');
  if (\!resultArea) return;
  
  // 既存のウィザードがあれば削除
  const existingWizard = document.getElementById('wizard-container');
  if (existingWizard) {
    existingWizard.remove();
  }
  
  // ウィザードを読み込んで追加
  const wizard = await loadWizard();
  if (wizard) {
    resultArea.appendChild(wizard);
    
    // ウィザードまでスクロール
    wizard.scrollIntoView({ behavior: 'smooth' });
    
    // ウィザードの初期化（wizard.jsで実装）
    if (typeof initWizard === 'function') {
      initWizard();
    }
  }
}

/**
 * 郵便番号入力時のフォーマット
 * @param {Event} e - 入力イベント
 */
function formatZipInputOnType(e) {
  if (typeof formatZipCode === 'function') {
    formatZipCode(e); // zipValidator.jsの関数を呼び出す
  }
}
EOL < /dev/null