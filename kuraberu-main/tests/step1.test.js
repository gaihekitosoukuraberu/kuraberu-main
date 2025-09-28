/**
 * 外壁塗装くらべる - Step1テスト
 * 郵便番号入力と相場表示機能のテスト
 * 
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// HTML/CSS/JSを読み込み
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '../css/wizard.css'), 'utf8');
const js = fs.readFileSync(path.resolve(__dirname, '../js/wizard.js'), 'utf8');

describe('Step1: 郵便番号入力と相場表示', () => {
  let zipForm;
  let zipInput;
  let zipSubmit;
  let loadingOverlay;
  let priceResult;
  let consoleLogSpy;
  
  beforeEach(() => {
    // DOM設定
    document.documentElement.innerHTML = html;
    
    // スタイルを適用
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);
    
    // JavaScriptを読み込み
    eval(js);
    
    // DOMContentLoadedイベントを発火
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    // DOM要素を取得
    zipForm = document.getElementById('zip-form');
    zipInput = document.getElementById('zip-input');
    zipSubmit = document.getElementById('zip-submit');
    loadingOverlay = document.getElementById('loading-overlay');
    priceResult = document.getElementById('price-result');
    
    // コンソール出力をモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // alert関数をモック
    window.alert = jest.fn();
    
    // タイマーをモック
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    // スパイをリセット
    consoleLogSpy.mockRestore();
    
    // タイマーをリセット
    jest.useRealTimers();
  });
  
  test('郵便番号フォームが存在する', () => {
    expect(zipForm).not.toBeNull();
    expect(zipInput).not.toBeNull();
    expect(zipSubmit).not.toBeNull();
  });
  
  test('郵便番号入力フィールドはパターン検証がある', () => {
    expect(zipInput.getAttribute('pattern')).toBe('\\d{3}-?\\d{4}');
  });
  
  test('郵便番号入力時にハイフンが自動挿入される', () => {
    zipInput.value = '';
    zipInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(zipInput.value).toBe('');
    
    zipInput.value = '123';
    zipInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(zipInput.value).toBe('123');
    
    zipInput.value = '1234';
    zipInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(zipInput.value).toBe('123-4');
    
    zipInput.value = '1234567';
    zipInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(zipInput.value).toBe('123-4567');
  });
  
  test('不正な郵便番号を送信するとアラートが表示される', () => {
    zipInput.value = '123'; // 不完全な郵便番号
    zipForm.dispatchEvent(new Event('submit', { cancelable: true }));
    
    expect(window.alert).toHaveBeenCalledWith('正しい郵便番号を入力してください（例：123-4567）');
    expect(loadingOverlay.classList.contains('hidden')).toBe(true);
  });
  
  test('正しい郵便番号を送信するとローディングが表示される', () => {
    zipInput.value = '123-4567';
    zipForm.dispatchEvent(new Event('submit', { cancelable: true }));
    
    expect(loadingOverlay.classList.contains('hidden')).toBe(false);
  });
  
  test('ローディング後に相場結果が表示される', () => {
    zipInput.value = '220-0012'; // 横浜市
    zipForm.dispatchEvent(new Event('submit', { cancelable: true }));
    
    // ローディング中
    expect(loadingOverlay.classList.contains('hidden')).toBe(false);
    expect(priceResult.classList.contains('hidden')).toBe(true);
    
    // 3秒後
    jest.advanceTimersByTime(3000);
    
    // 結果表示
    expect(loadingOverlay.classList.contains('hidden')).toBe(true);
    expect(priceResult.classList.contains('hidden')).toBe(false);
    
    // 神奈川県横浜市の相場が表示される
    const locationDisplay = document.getElementById('location-display');
    const priceRange = document.getElementById('price-range');
    
    expect(locationDisplay.textContent).toContain('神奈川県横浜市');
    expect(priceRange.textContent).toContain('80万～115万円');
  });
  
  test('異なる郵便番号で異なる相場が表示される', () => {
    // 窓口関数を直接呼び出して検証
    const debug = window.debug;
    
    // 東京都千代田区のケース
    debug.showPriceResult('1000001');
    expect(document.getElementById('location-display').textContent).toContain('東京都千代田区');
    expect(document.getElementById('price-range').textContent).toContain('90万～135万円');
    
    // 埼玉県さいたま市のケース
    debug.showPriceResult('3300001');
    expect(document.getElementById('location-display').textContent).toContain('埼玉県さいたま市');
    expect(document.getElementById('price-range').textContent).toContain('70万～100万円');
  });
});