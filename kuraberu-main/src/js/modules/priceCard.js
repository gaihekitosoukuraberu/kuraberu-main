/**
 * 外壁塗装くらべる - 相場結果カードモジュール
 * 
 * このモジュールは郵便番号検索後に表示される相場結果カードを生成します。
 */

import { showElement } from './ui-helpers.js';
import { normalizeZipCode } from './zip-validator.js';

/**
 * 相場結果カードを生成する
 * @param {string} zipCode - ユーザーが入力した郵便番号
 * @param {Object} priceData - API/スタブから取得した相場データ
 * @returns {HTMLElement} - 生成された相場カード要素
 */
export function createPriceCard(zipCode, priceData) {
  // デフォルト値を設定（APIから取得できない場合や開発中用）
  const data = priceData || {
    prefecture: '東京都',
    city: '新宿区',
    minPrice: 80,
    maxPrice: 120,
    avgPrice: 98,
    houseType: '一般的な戸建て',
    houseSize: '30坪',
    paintType: '高級シリコン塗料',
    discount: 15
  };

  // 相場カードのコンテナを作成
  const cardContainer = document.createElement('div');
  cardContainer.className = 'price-card';

  // 地域情報
  const locationInfo = document.createElement('div');
  locationInfo.className = 'price-card__location';
  locationInfo.innerHTML = `
    <div class="price-card__zip">${normalizeZipCode(zipCode, true)}</div>
    <div class="price-card__area">${data.prefecture}${data.city}</div>
  `;

  // 価格情報
  const priceInfo = document.createElement('div');
  priceInfo.className = 'price-card__price-info';
  priceInfo.innerHTML = `
    <h3 class="price-card__title">お住まいの外壁塗装相場</h3>
    <div class="price-card__price-range">
      <span class="price-card__price-min">${data.minPrice}</span>
      <span class="price-card__price-unit">万円</span>
      <span class="price-card__price-separator">〜</span>
      <span class="price-card__price-max">${data.maxPrice}</span>
      <span class="price-card__price-unit">万円</span>
    </div>
    <div class="price-card__average">平均: ${data.avgPrice}万円</div>
    <div class="price-card__house-info">※${data.houseType} / ${data.houseSize} / ${data.paintType}の場合</div>
  `;

  // 特典情報
  const discountInfo = document.createElement('div');
  discountInfo.className = 'price-card__discount';
  discountInfo.innerHTML = `
    <div class="price-card__discount-badge">期間限定 最大${data.discount}%割引</div>
    <p class="price-card__discount-text">今なら特別割引価格でご案内可能です！</p>
  `;

  // ウィザード案内
  const wizardPrompt = document.createElement('div');
  wizardPrompt.className = 'price-card__wizard-prompt';
  wizardPrompt.innerHTML = `
    <h3 class="price-card__wizard-title">さらに精度の高い見積もりを取得</h3>
    <p class="price-card__wizard-text">5つの質問に答えて、あなたの家に最適な見積もりを取得しましょう。</p>
    <button class="price-card__wizard-button" id="start-wizard-button">
      <span class="price-card__wizard-icon">📋</span> 質問に答える（最短1分）
    </button>
  `;

  // 相場カードに各セクションを追加
  cardContainer.appendChild(locationInfo);
  cardContainer.appendChild(priceInfo);
  cardContainer.appendChild(discountInfo);
  cardContainer.appendChild(wizardPrompt);

  return cardContainer;
}

/**
 * 結果エリアに相場カードを表示する
 * @param {string} zipCode - ユーザーが入力した郵便番号
 * @param {Object} priceData - APIから取得した相場データ
 */
export function displayPriceCard(zipCode, priceData) {
  const resultArea = document.getElementById('result-area');
  if (!resultArea) return;

  // 以前の結果をクリア
  resultArea.innerHTML = '';
  
  // 結果エリアを表示
  showElement(resultArea);

  // 相場カードを生成して追加
  const priceCard = createPriceCard(zipCode, priceData);
  resultArea.appendChild(priceCard);
}

