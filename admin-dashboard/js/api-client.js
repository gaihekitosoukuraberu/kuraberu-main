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
   * JSONP リクエスト（CORS回避用・GAS redirect対応）
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

      // クリーンアップ関数
      // V2237: 遅延レスポンス対策 - 即削除ではなく空関数に置き換えてエラー防止
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (window[callbackName]) {
          // 遅延レスポンスが来てもエラーにならないよう空関数に置き換え
          window[callbackName] = function() {
            console.log(`[ApiClient] 遅延レスポンス受信（無視）: ${callbackName}`);
          };
          // 10秒後に完全削除
          setTimeout(() => { delete window[callbackName]; }, 10000);
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
          reject(new Error(`タイムアウト: ${action} (${this.timeout}ms)`));
        }
      }, this.timeout);

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

      // まずGASリダイレクトURLを取得
      this.getRedirectUrl(`${this.baseUrl}?${urlParams.toString()}`)
        .then(finalUrl => {
          // スクリプトタグ作成
          script = document.createElement('script');

          console.log(`[ApiClient] リクエスト: ${action}`, finalUrl);

          script.src = finalUrl;
          script.onerror = (errorEvent) => {
            cleanup();

            // エラー詳細をログ出力
            console.error(`[ApiClient] スクリプト読み込みエラー:`, {
              action: action,
              url: finalUrl,
              baseUrl: this.baseUrl,
              errorEvent: errorEvent
            });

            // リトライ処理
            if (retryCount < this.maxRetries) {
              console.log(`[ApiClient] ネットワークエラー。リトライ ${retryCount + 1}/${this.maxRetries}`);
              setTimeout(() => {
                this.jsonpRequest(action, params, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, this.retryDelay);
            } else {
              // スマホデバッグ用：詳細なエラーメッセージ
              const errorMsg = `ネットワークエラー: ${action}\nURL: ${this.baseUrl}\n\n設定を確認:\n1. ブラウザキャッシュをクリア\n2. プライベートモードで試す\n3. WiFi/モバイルデータを切り替える`;
              console.error('[ApiClient] 最終エラー:', errorMsg);
              reject(new Error(errorMsg));
            }
          };

          document.body.appendChild(script);
        })
        .catch(error => {
          cleanup();
          reject(error);
        });
    });
  }

  /**
   * GAS リダイレクトURLを取得
   * @param {string} url - 元のURL
   * @returns {Promise<string>} 最終的なURL
   */
  async getRedirectUrl(url) {
    // JSONP はブラウザが自動的にリダイレクトを処理するため、
    // fetchを使わず元のURLをそのまま返す（CORS回避）
    return Promise.resolve(url);
  }

  /**
   * GET リクエスト（JSONP経由 - CORS回避）
   * @param {string} action - アクション名
   * @param {Object} params - パラメータ
   * @returns {Promise<Object>} レスポンス
   */
  async getRequest(action, params = {}) {
    console.log(`[ApiClient] GET (via JSONP): ${action}`);
    return this.jsonpRequest(action, params);
  }

  /**
   * POST リクエスト（JSONP経由 - CORS回避）
   * @param {string} action - アクション名
   * @param {Object} data - 送信データ
   * @returns {Promise<Object>} レスポンス
   */
  async postRequest(action, data = {}) {
    // POSTの場合もJSONPを使用（GASはGETでも動作する）
    console.log(`[ApiClient] POST (via JSONP): ${action}`);

    // 複雑なオブジェクトをJSON文字列化してシリアライズ
    const serializedData = {};
    for (const key in data) {
      const value = data[key];
      // オブジェクトまたは配列の場合はJSON.stringify
      if (typeof value === 'object' && value !== null) {
        serializedData[key] = JSON.stringify(value);
      } else {
        serializedData[key] = value;
      }
    }

    // V2032: シリアライズ後のデータサイズをログ出力
    if (action === 'sendOrderTransfer') {
      const franchisesStr = serializedData.franchises || '';
      console.log('[V2032-DEBUG] ApiClient sendOrderTransfer:', {
        franchisesLength: franchisesStr.length,
        franchisesData: franchisesStr
      });
    }

    return this.jsonpRequest(action, serializedData);
  }

  /**
   * V1995: 真のPOSTリクエスト（fetch使用 - 大きなデータ用）
   * GASのdoPostにJSONボディを送信
   * @param {string} action - アクション名
   * @param {Object} data - 送信データ
   * @returns {Promise<Object>} レスポンス
   */
  async fetchPost(action, data = {}) {
    console.log(`[ApiClient] fetchPost: ${action}`);

    const payload = {
      action: action,
      ...data
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        mode: 'no-cors', // GASはCORS対応してないのでno-cors
        headers: {
          'Content-Type': 'text/plain' // GASがパースできる形式
        },
        body: JSON.stringify(payload)
      });

      // no-corsモードではレスポンスが読めないため、成功を仮定
      // 実際の結果確認は別途必要
      console.log(`[ApiClient] fetchPost sent: ${action}`);
      return { success: true, message: 'リクエスト送信完了' };

    } catch (error) {
      console.error(`[ApiClient] fetchPost error: ${action}`, error);
      throw error;
    }
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