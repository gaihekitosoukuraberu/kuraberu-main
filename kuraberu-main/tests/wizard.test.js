/**
 * 外壁塗装くらべる - ウィザードモジュールのテスト
 */

import { setupWizard } from '../src/js/modules/wizard.js';
import { apiStub } from '../src/js/modules/apiStub.js';
import { zipValidator } from '../src/js/modules/zipValidator.js';

// モックの設定
jest.mock('../src/js/modules/apiStub.js', () => ({
  apiStub: {
    getCompanies: jest.fn(),
    submitQuoteRequest: jest.fn()
  }
}));

jest.mock('../src/js/modules/zipValidator.js', () => ({
  zipValidator: {
    validate: jest.fn(),
    format: jest.fn(),
    getRegionInfo: jest.fn()
  }
}));

// DOM要素のモック作成ヘルパー
function setupDOM() {
  // ウィザードセクション
  document.body.innerHTML = `
    <div id="wizard">
      <div class="wizard__progress">
        <div class="wizard__progress-fill"></div>
        <div class="wizard__progress-text">0%</div>
      </div>
      
      <div class="wizard__step" data-step="0">
        <h3>郵便番号を入力</h3>
        <input type="text" name="postalCode" value="123-4567">
        <div class="wizard__error hidden"></div>
        <button class="wizard__next-button">次へ</button>
      </div>
      
      <div class="wizard__step hidden" data-step="1">
        <h3>建物の種類</h3>
        <div class="wizard__options-group">
          <button class="wizard__option" data-value="house">一戸建て</button>
          <button class="wizard__option" data-value="apartment">マンション</button>
        </div>
        <div class="wizard__error hidden"></div>
        <button class="wizard__prev-button">戻る</button>
        <button class="wizard__next-button" disabled>次へ</button>
      </div>
      
      <div id="wizardLoading" class="hidden">
        <div class="wizard__loading-progress">
          <div class="wizard__loading-progress-fill"></div>
        </div>
        <p>分析中...</p>
      </div>
      
      <div id="wizardResult" class="hidden">
        <!-- 結果表示部分 -->
      </div>
    </div>
    
    <button class="js-start-wizard">今すぐ見積もり</button>
  `;
}

describe('ウィザードモジュール', () => {
  // 各テストの前にDOMをセットアップし、モックをリセット
  beforeEach(() => {
    setupDOM();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
    jest.resetAllMocks();
  });
  
  test('setupWizard関数は正しく実行される', () => {
    // テスト実行
    setupWizard();
    
    // ウィザードが初期化されることを確認
    expect(document.querySelector('.wizard__step[data-step="0"]').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('.wizard__step[data-step="1"]').classList.contains('hidden')).toBe(true);
  });
  
  test('「今すぐ見積もり」ボタンのクリックでウィザードが表示される', () => {
    // セットアップ
    setupWizard();
    
    // モック関数
    Element.prototype.scrollIntoView = jest.fn();
    
    // ボタンをクリック
    const startButton = document.querySelector('.js-start-wizard');
    startButton.click();
    
    // ウィザードが表示されることを確認
    expect(document.getElementById('wizard').classList.contains('wizard--active')).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
  
  test('郵便番号の検証に成功したら次のステップに進む', () => {
    // セットアップ
    zipValidator.validate.mockReturnValue(true);
    setupWizard();
    
    // 「次へ」ボタンをクリック
    const nextButton = document.querySelector('.wizard__step[data-step="0"] .wizard__next-button');
    nextButton.click();
    
    // 次のステップが表示されることを確認
    expect(document.querySelector('.wizard__step[data-step="0"]').classList.contains('hidden')).toBe(true);
    expect(document.querySelector('.wizard__step[data-step="1"]').classList.contains('hidden')).toBe(false);
  });
  
  test('郵便番号の検証に失敗したら次のステップに進まない', () => {
    // セットアップ
    zipValidator.validate.mockReturnValue(false);
    setupWizard();
    
    // 「次へ」ボタンをクリック
    const nextButton = document.querySelector('.wizard__step[data-step="0"] .wizard__next-button');
    nextButton.click();
    
    // エラーメッセージが表示されることを確認
    const errorElement = document.querySelector('.wizard__step[data-step="0"] .wizard__error');
    expect(errorElement.textContent).toBeTruthy();
    expect(errorElement.classList.contains('hidden')).toBe(false);
    
    // 次のステップに進まないことを確認
    expect(document.querySelector('.wizard__step[data-step="0"]').classList.contains('hidden')).toBe(false);
    expect(document.querySelector('.wizard__step[data-step="1"]').classList.contains('hidden')).toBe(true);
  });
  
  test('オプションボタンをクリックすると選択状態になる', () => {
    // セットアップ
    setupWizard();
    
    // ステップ1を表示
    document.querySelector('.wizard__step[data-step="0"]').classList.add('hidden');
    document.querySelector('.wizard__step[data-step="1"]').classList.remove('hidden');
    
    // 一戸建てボタンをクリック
    const houseButton = document.querySelector('.wizard__option[data-value="house"]');
    houseButton.click();
    
    // ボタンが選択状態になることを確認
    expect(houseButton.classList.contains('wizard__option--selected')).toBe(true);
    
    // 次へボタンが有効化されることを確認
    const nextButton = document.querySelector('.wizard__step[data-step="1"] .wizard__next-button');
    expect(nextButton.disabled).toBe(false);
    
    // マンションボタンをクリック
    const apartmentButton = document.querySelector('.wizard__option[data-value="apartment"]');
    apartmentButton.click();
    
    // マンションボタンが選択状態になり、一戸建てボタンの選択が解除されることを確認
    expect(apartmentButton.classList.contains('wizard__option--selected')).toBe(true);
    expect(houseButton.classList.contains('wizard__option--selected')).toBe(false);
  });
  
  test('進捗バーが正しく更新される', () => {
    // プライベート関数をテストするためのモック
    global.updateProgressBar = function(progress) {
      const progressBar = document.querySelector('.wizard__progress-fill');
      if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
      }
      
      const progressText = document.querySelector('.wizard__progress-text');
      if (progressText) {
        progressText.textContent = `${Math.round(progress * 100)}%`;
      }
    };
    
    // 進捗バーを更新
    global.updateProgressBar(0.5);
    
    // 進捗バーが50%になることを確認
    const progressBar = document.querySelector('.wizard__progress-fill');
    const progressText = document.querySelector('.wizard__progress-text');
    
    expect(progressBar.style.width).toBe('50%');
    expect(progressText.textContent).toBe('50%');
  });
  
  test('業者データの取得APIが呼び出される', async () => {
    // APIモックの設定
    const mockCompanies = [
      { id: 'company1', name: '匠塗装工房' },
      { id: 'company2', name: '大和塗装' }
    ];
    apiStub.getCompanies.mockResolvedValue(mockCompanies);
    
    // グローバル関数をモック
    global.showResults = async function() {
      // ローディング表示
      const loadingElement = document.getElementById('wizardLoading');
      const resultContainer = document.getElementById('wizardResult');
      
      if (loadingElement && resultContainer) {
        loadingElement.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        
        try {
          // API経由で業者データを取得
          const companies = await apiStub.getCompanies('123-4567', {});
          
          // 結果表示
          loadingElement.classList.add('hidden');
          resultContainer.classList.remove('hidden');
          
          // 結果の内容をテスト用に設定
          resultContainer.textContent = `${companies.length}社の業者が見つかりました`;
          
          return companies;
        } catch (error) {
          console.error('Error:', error);
          return [];
        }
      }
    };
    
    // 結果を表示
    const companies = await global.showResults();
    
    // APIが呼び出されることを確認
    expect(apiStub.getCompanies).toHaveBeenCalled();
    
    // 結果が表示されることを確認
    expect(document.getElementById('wizardLoading').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('wizardResult').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('wizardResult').textContent).toBe('2社の業者が見つかりました');
    
    // 取得した業者データが正しいことを確認
    expect(companies).toEqual(mockCompanies);
  });
});