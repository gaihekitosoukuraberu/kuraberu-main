/**
 * 外壁塗装くらべる - メインJavaScript
 * 
 * このファイルは、外壁塗装くらべるのLPのメイン機能を管理します。
 * HTMLコンポーネントの読み込み、イベントリスナー設定、初期化処理を行います。
 */

// モジュールのインポート
import { loadComponents } from './modules/componentLoader.js';
import { setupFormValidation } from './modules/formValidator.js';
import { setupPriceForm } from './modules/priceForm.js';
import { setupWizard } from './modules/wizard.js';
import { zipValidator } from './modules/zipValidator.js';
import { apiStub } from './modules/apiStub.js';
import { setupFooterButtons } from './modules/footerButtons.js';

// DOM読み込み完了時の処理
document.addEventListener('DOMContentLoaded', async () => {
  // コンポーネントの読み込み
  await loadComponents();
  
  // 各機能の初期化
  initApp();
});

/**
 * アプリケーションの初期化
 */
function initApp() {
  // フォームバリデーションの設定
  setupFormValidation();
  
  // 相場表示フォームの設定
  setupPriceForm();
  
  // ウィザードの設定
  setupWizard();
  
  // フッター固定ボタンの設定
  setupFooterButtons();
  
  // グローバルのiframeメッセージハンドラー
  setupGlobalMessageHandler();
  
  // ヘッダー内のボタン処理
  setupHeaderButtons();
  
  console.log('Application initialized');
}

/**
 * グローバルのiframeメッセージハンドラーを設定
 */
function setupGlobalMessageHandler() {
  window.addEventListener('message', (event) => {
    // メッセージの検証
    if (!event.origin.match(/^https:\/\/(.*\.)?kuraberu\.com$/)) {
      return; // 許可されたオリジンからのメッセージのみ処理
    }
    
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      if (data.type === 'scrollToElement' && data.elementId) {
        // 特定の要素にスクロール
        const element = document.getElementById(data.elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
}

/**
 * ヘッダー内のボタン処理を設定
 */
function setupHeaderButtons() {
  // 見積もりボタン
  const quoteButtons = document.querySelectorAll('.js-start-wizard');
  quoteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const wizardSection = document.getElementById('wizard');
      if (wizardSection) {
        wizardSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // 相場チェックボタン
  const priceCheckButtons = document.querySelectorAll('.js-price-check');
  priceCheckButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const priceFormSection = document.getElementById('areaPrice');
      if (priceFormSection) {
        priceFormSection.scrollIntoView({ behavior: 'smooth' });
        
        // 郵便番号入力欄にフォーカス
        const postalInput = document.getElementById('postalCode');
        if (postalInput) {
          setTimeout(() => {
            postalInput.focus();
          }, 500);
        }
      }
    });
  });
}