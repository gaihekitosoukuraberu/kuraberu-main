/**
 * 統一APIクライアント
 * 全システムで共通使用するAPI通信モジュール
 *
 * 特徴：
 * - エラーハンドリング完備
 * - 自動リトライ
 * - タイムアウト処理
 * - JSONP/JSON両対応
 */

class ApiClient {
  constructor() {
    if (!window.ENV) {
      throw new Error('ENV not loaded. env-loader.jsを先に読み込んでください');
    }

    this.baseUrl = window.ENV.GAS_URL;
    this.timeout = window.ENV.TIMEOUT || 60000;
    this.maxRetries = window.ENV.MAX_RETRIES || 3;
    this.retryDelay = window.ENV.RETRY_DELAY || 1000;

    // JSONP用のコールバックカウンター
    this.callbackCounter = 0;

    console.log('[ApiClient] 初期化完了:', this.baseUrl);
  }

  /**
   * JSONP リクエスト（CORS回避用）
   * @param {string} action - アクション名
   * @param {Object} params - パラメータ
   * @param {number} retryCount - リトライ回数
   * @returns {Promise<Object>} レスポンス
   */
  async jsonpRequest(action, params = {}, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const callbackName = `jsonpCallback_${Date.now()}_${++this.callbackCounter}`;
      let timeoutId = null;
      let script = null;

      // アクション別タイムアウト設定（AI検索は100秒、他は60秒）
      const actionTimeout = action === 'searchCompany' ? 100000 : this.timeout;

      // クリーンアップ関数
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (window[callbackName]) {
          delete window[callbackName];
        }
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      // タイムアウト処理
      timeoutId = setTimeout(() => {
        cleanup();

        // リトライ処理
        if (retryCount < this.maxRetries) {
          console.log(`[ApiClient] タイムアウト。リトライ ${retryCount + 1}/${this.maxRetries}`);
          setTimeout(() => {
            this.jsonpRequest(action, params, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, this.retryDelay);
        } else {
          reject(new Error(`タイムアウト: ${action} (${actionTimeout}ms)`));
        }
      }, actionTimeout);

      // グローバルコールバック関数
      window[callbackName] = (response) => {
        cleanup();

        // エラーチェック
        if (response && response.error) {
          console.error(`[ApiClient] APIエラー: ${action}`, response.error);
          reject(new Error(response.error));
        } else {
          console.log(`[ApiClient] 成功: ${action}`);
          resolve(response);
        }
      };

      // URLパラメータ構築
      const urlParams = new URLSearchParams({
        action: action,
        ...params,
        callback: callbackName,
        timestamp: Date.now() // キャッシュ回避
      });

      // スクリプトタグ作成
      script = document.createElement('script');
      const url = `${this.baseUrl}?${urlParams.toString()}`;

      console.log(`[ApiClient] リクエスト: ${action}`, url);

      script.src = url;
      script.onerror = () => {
        cleanup();

        // リトライ処理
        if (retryCount < this.maxRetries) {
          console.log(`[ApiClient] ネットワークエラー。リトライ ${retryCount + 1}/${this.maxRetries}`);
          setTimeout(() => {
            this.jsonpRequest(action, params, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, this.retryDelay);
        } else {
          reject(new Error(`ネットワークエラー: ${action}`));
        }
      };

      document.body.appendChild(script);
    });
  }

  /**
   * POST リクエスト（FormData使用）
   * @param {string} action - アクション名
   * @param {Object} data - 送信データ
   * @returns {Promise<Object>} レスポンス
   */
  async postRequest(action, data = {}) {
    const formData = new FormData();
    formData.append('action', action);

    // データをFormDataに追加
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;

    } catch (error) {
      console.error(`[ApiClient] POSTエラー: ${action}`, error);

      // フォールバック：hidden iframe経由のPOST
      return this.postViaIframe(action, data);
    }
  }

  /**
   * Hidden iframe経由のPOST（CORSエラー回避）
   * @private
   */
  async postViaIframe(action, data) {
    return new Promise((resolve) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = this.baseUrl;
      form.target = 'hiddenFrame_' + Date.now();
      form.style.display = 'none';

      // データをフォームに追加
      const actionInput = document.createElement('input');
      actionInput.type = 'hidden';
      actionInput.name = 'action';
      actionInput.value = action;
      form.appendChild(actionInput);

      Object.keys(data).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof data[key] === 'object' ?
          JSON.stringify(data[key]) : data[key];
        form.appendChild(input);
      });

      // iframe作成
      const iframe = document.createElement('iframe');
      iframe.name = form.target;
      iframe.style.display = 'none';

      iframe.onload = () => {
        setTimeout(() => {
          document.body.removeChild(form);
          document.body.removeChild(iframe);
          resolve({ success: true, message: '処理を実行しました' });
        }, 1000);
      };

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    });
  }

  /**
   * ヘルスチェック
   * @returns {Promise<boolean>} 接続可能かどうか
   */
  async healthCheck() {
    try {
      const result = await this.jsonpRequest('health', {}, 0);
      return result && result.success;
    } catch (error) {
      console.error('[ApiClient] ヘルスチェック失敗:', error);
      return false;
    }
  }
}

// グローバルに公開
window.ApiClient = ApiClient;