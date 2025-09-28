/**
 * 価格フォームモジュール
 * 
 * 郵便番号に基づいて地域ごとの価格相場を表示する機能を提供します。
 */

import { zipValidator } from './zipValidator.js';
import { apiStub } from './apiStub.js';

/**
 * 価格フォームの設定を行います
 */
export function setupPriceForm() {
  const priceForm = document.getElementById('priceForm');
  if (!priceForm) return;
  
  // 郵便番号入力フィールド
  const postalInput = document.getElementById('postalCode');
  if (!postalInput) return;
  
  // 検索ボタン
  const searchButton = document.getElementById('searchPriceButton');
  if (!searchButton) return;
  
  // フォーム送信イベント
  priceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const postalCode = postalInput.value;
    
    // 郵便番号の検証
    if (!zipValidator.validate(postalCode)) {
      showError('正しい郵便番号を入力してください（例: 123-4567）');
      return;
    }
    
    // エラーメッセージをクリア
    clearError();
    
    // ボタンを無効化
    searchButton.disabled = true;
    searchButton.classList.add('button--disabled');
    searchButton.textContent = '検索中...';
    
    try {
      // 相場エリアを表示
      const areaPrice = document.getElementById('areaPrice');
      if (areaPrice) {
        areaPrice.classList.remove('hidden');
      }
      
      // ローディングアニメーション開始
      startLoadingAnimation();
      
      // 地域情報を取得
      const regionInfo = await zipValidator.getRegionInfo(postalCode);
      
      // 価格データを取得
      const priceData = await apiStub.getAreaPriceData(postalCode);
      
      // 地域見出しを更新
      updateLocationHeading(regionInfo);
      
      // ローディング完了後に結果を表示
      setTimeout(() => {
        showPriceResults(priceData);
        
        // ボタンを再有効化
        searchButton.disabled = false;
        searchButton.classList.remove('button--disabled');
        searchButton.textContent = '検索';
      }, 1500); // アニメーション完了を待つ
      
    } catch (error) {
      console.error('Error fetching price data:', error);
      
      // エラーメッセージを表示
      showError('価格データの取得中にエラーが発生しました。もう一度お試しください。');
      
      // ボタンを再有効化
      searchButton.disabled = false;
      searchButton.classList.remove('button--disabled');
      searchButton.textContent = '検索';
      
      // ローディングアニメーションを非表示
      const loadingElement = document.getElementById('priceRevealAnimation');
      if (loadingElement) {
        loadingElement.classList.add('hidden');
      }
    }
  });
}

/**
 * ローディングアニメーションを開始
 */
function startLoadingAnimation() {
  // ローディング要素を表示
  const loadingElement = document.getElementById('priceRevealAnimation');
  const resultElement = document.getElementById('priceResult');
  
  if (loadingElement && resultElement) {
    loadingElement.classList.remove('hidden');
    resultElement.classList.add('hidden');
    
    // プログレスバーアニメーション
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.width = '0%';
      
      // アニメーション開始
      setTimeout(() => {
        progressBar.style.width = '100%';
      }, 100);
    }
  }
}

/**
 * 地域の見出しを更新
 * @param {Object} regionInfo - 地域情報
 */
function updateLocationHeading(regionInfo) {
  const headingElement = document.getElementById('locationHeading');
  if (headingElement && regionInfo) {
    headingElement.textContent = `${regionInfo.prefecture}${regionInfo.city}の外壁塗装相場`;
  }
}

/**
 * 価格結果を表示
 * @param {Object} priceData - 価格データ
 */
function showPriceResults(priceData) {
  const loadingElement = document.getElementById('priceRevealAnimation');
  const resultElement = document.getElementById('priceResult');
  
  if (loadingElement && resultElement) {
    // ローディングを非表示
    loadingElement.classList.add('hidden');
    
    // 結果HTMLを生成
    let html = `
      <div class="price-form__result">
        <div class="price-form__average">
          <div class="price-form__average-title">坪単価（平均）</div>
          <div class="price-form__average-price">${priceData.averagePrice}<span class="price-form__unit">万円</span></div>
          <div class="price-form__average-range">${priceData.minPrice}万円〜${priceData.maxPrice}万円</div>
        </div>
        
        <div class="price-form__details">
          <h3 class="price-form__details-title">建物サイズ別の相場</h3>
          <div class="price-form__details-grid">
    `;
    
    // サイズ別の価格詳細
    Object.entries(priceData.details).forEach(([key, detail]) => {
      html += `
        <div class="price-form__detail-item">
          <div class="price-form__detail-size">${detail.size}</div>
          <div class="price-form__detail-price">${detail.price}</div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
        
        <div class="price-form__note">
          <p>※相場はあくまで目安です。実際の価格は現地調査後に決定します。</p>
        </div>
        
        <div class="price-form__actions">
          <button type="button" class="button button--primary button--lg js-start-wizard">
            無料で見積もりを依頼する
          </button>
        </div>
      </div>
    `;
    
    // 結果を表示
    resultElement.innerHTML = html;
    resultElement.classList.remove('hidden');
    
    // 見積もりボタンにイベントを追加
    const quoteButtons = resultElement.querySelectorAll('.js-start-wizard');
    quoteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const wizardSection = document.getElementById('wizard');
        if (wizardSection) {
          wizardSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
}

/**
 * エラーメッセージを表示
 * @param {string} message - エラーメッセージ
 */
function showError(message) {
  const errorElement = document.getElementById('priceFormError');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

/**
 * エラーメッセージをクリア
 */
function clearError() {
  const errorElement = document.getElementById('priceFormError');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
  }
}