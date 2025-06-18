/**
 * 外壁塗装くらべる - フローテスト
 * 
 * このファイルは郵便番号入力から相場表示、ウィザード、フッターボタン表示までの
 * 一連のフローをテストします。
 */

// DOM要素をモックするための準備
document.body.innerHTML = `
  <div id="header-container"></div>
  <main>
    <div id="hero-container"></div>
    <div id="price-form-container">
      <form id="zip-form">
        <input type="text" id="zip-input" value="1500013">
        <button type="submit" id="zip-submit">検索</button>
      </form>
      <div id="loading-overlay" class="loading hidden"></div>
      <div id="result-area" class="result-area hidden"></div>
    </div>
  </main>
  <div id="footer-container"></div>
`;

// fetchのモック
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('モックされたHTML')
  })
);

// 基本的なテスト構造
describe('外壁塗装くらべるフロー', () => {
  beforeEach(() => {
    // DOMをリセット
    document.body.innerHTML = `
      <div id="header-container"></div>
      <main>
        <div id="hero-container"></div>
        <div id="price-form-container">
          <form id="zip-form">
            <input type="text" id="zip-input" value="1500013">
            <button type="submit" id="zip-submit">検索</button>
          </form>
          <div id="loading-overlay" class="loading hidden"></div>
          <div id="result-area" class="result-area hidden"></div>
        </div>
      </main>
      <div id="footer-container"></div>
    `;
    
    // DOMのscrollIntoViewをモック
    Element.prototype.scrollIntoView = jest.fn();
    
    // フェッチをリセット
    fetch.mockClear();
  });
  
  test('コンポーネントが読み込まれる', async () => {
    // モジュールをインポート
    await import('../src/js/main.js');
    
    // fetchが4回呼ばれることを検証（4つのコンポーネント）
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch).toHaveBeenCalledWith('components/header.html');
    expect(fetch).toHaveBeenCalledWith('components/hero.html');
    expect(fetch).toHaveBeenCalledWith('components/priceForm.html');
    expect(fetch).toHaveBeenCalledWith('components/footer.html');
  });
  
  // ここに追加のテストケースを実装予定
  // - 郵便番号フォーム送信のテスト
  // - ローディング表示のテスト
  // - 相場結果表示のテスト
  // - ウィザード進行のテスト
  // - フッターボタン表示のテスト
});

// 注: これはStep-1の基本的なテスト構造です。
// 今後のステップで完全なテストケースを実装していきます。