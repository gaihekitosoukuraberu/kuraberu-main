/**
 * ====================================
 * URL短縮システム
 * ====================================
 *
 * is.gd APIを使用してURLを短縮
 * CORS制限回避のためGAS経由で処理
 */

const UrlShortener = {
  /**
   * URL短縮処理
   * @param {Object} params - { url: string }
   * @returns {Object} { success: boolean, shortUrl: string }
   */
  handlePost: function(params) {
    try {
      console.log('[UrlShortener] URL短縮リクエスト:', params);

      const url = params.url;

      if (!url) {
        return {
          success: false,
          error: 'url parameter is required'
        };
      }

      // is.gd APIを使用してURL短縮
      const shortUrl = this.shortenWithIsGd(url);

      if (!shortUrl) {
        // 短縮失敗時は元のURLを返す
        return {
          success: true,
          shortUrl: url,
          fallback: true
        };
      }

      return {
        success: true,
        shortUrl: shortUrl
      };

    } catch (error) {
      console.error('[UrlShortener] エラー:', error);
      // エラー時も元のURLを返す
      return {
        success: true,
        shortUrl: params.url || '',
        fallback: true,
        error: error.toString()
      };
    }
  },

  /**
   * is.gd APIでURL短縮
   * @param {string} url - 短縮したいURL
   * @returns {string|null} 短縮URL
   */
  shortenWithIsGd: function(url) {
    try {
      const apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;

      const response = UrlFetchApp.fetch(apiUrl, {
        method: 'get',
        muteHttpExceptions: true
      });

      const shortUrl = response.getContentText().trim();

      // エラーチェック（is.gdはエラー時も200を返すが、"Error:"で始まる）
      if (shortUrl.startsWith('Error:')) {
        console.error('[UrlShortener] is.gd APIエラー:', shortUrl);
        return null;
      }

      console.log('[UrlShortener] 短縮成功:', shortUrl);
      return shortUrl;

    } catch (error) {
      console.error('[UrlShortener] is.gd API呼び出しエラー:', error);
      return null;
    }
  }
};
