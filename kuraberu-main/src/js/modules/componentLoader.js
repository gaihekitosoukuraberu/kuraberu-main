/**
 * コンポーネントローダーモジュール
 * 
 * HTMLコンポーネントをロードするための機能を提供します。
 */

/**
 * data-include属性を持つすべての要素を検索し、そのHTMLコンテンツを非同期に読み込みます
 * @returns {Promise} すべてのコンポーネントの読み込みが完了したときに解決するPromise
 */
export function loadComponents() {
  const includes = document.querySelectorAll('[data-include]');
  const promises = [];

  includes.forEach(element => {
    const file = element.getAttribute('data-include');
    promises.push(
      fetch(file)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Error loading component: ${file}`);
          }
          return response.text();
        })
        .then(html => {
          element.innerHTML = html;
        })
        .catch(error => {
          console.error(error);
          element.innerHTML = `<p class="text-red-500">Error loading component: ${file}</p>`;
        })
    );
  });

  return Promise.all(promises);
}