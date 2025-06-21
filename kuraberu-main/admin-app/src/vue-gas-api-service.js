/**
 * Vue 3 + GAS WebApp 連携サービス
 * GASの302リダイレクト仕様とCORS制限を回避する最適解
 */

import axios from 'axios';

/**
 * GAS WebApp APIサービスクラス
 */
class GasApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.useJsonp = false; // 必要に応じてJSONP使用
  }

  /**
   * 【推奨】GET方式でGASと通信
   * 理由：POSTの302リダイレクト + CORS問題を完全回避
   * 
   * @param {string} functionName - 実行するGAS関数名
   * @param {Object} params - パラメータオブジェクト
   * @returns {Promise<Object>} レスポンスデータ
   */
  async callFunction(functionName, params = {}) {
    try {
      const urlParams = new URLSearchParams({
        function: functionName,
        ...this.flattenParams(params)
      });

      const response = await axios.get(`${this.baseUrl}?${urlParams.toString()}`, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json'
        }
      });

      // GASから正常なJSONが返ってきた場合
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }

      // HTMLが返ってきた場合（GASエラー等）
      if (typeof response.data === 'string' && response.data.includes('<html>')) {
        throw new Error('GAS returned HTML instead of JSON. Check deployment settings.');
      }

      return response.data;

    } catch (error) {
      console.error('❌ GAS API通信エラー:', error);
      
      // CORSエラーの場合はJSONPフォールバック提案
      if (error.message.includes('CORS') || error.message.includes('ERR_FAILED')) {
        console.warn('🔄 CORS detected. Consider using JSONP fallback.');
        throw new Error('CORS error detected. Please check GAS deployment settings or use JSONP mode.');
      }
      
      throw error;
    }
  }

  /**
   * JSONP方式でGASと通信（CORS完全回避）
   * 
   * @param {string} functionName - 実行するGAS関数名
   * @param {Object} params - パラメータオブジェクト
   * @returns {Promise<Object>} レスポンスデータ
   */
  async callFunctionJsonp(functionName, params = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = `gasCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let script = null;
      let timeoutId = null;
      
      console.log('🔄 JSONP通信開始:', functionName, callbackName);
      
      // クリーンアップ関数
      const cleanup = () => {
        if (window[callbackName]) {
          delete window[callbackName];
        }
        if (script && script.parentNode) {
          document.head.removeChild(script);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      // グローバルコールバック関数を作成
      window[callbackName] = (data) => {
        console.log('✅ JSONPコールバック受信:', data);
        cleanup();
        resolve(data);
      };

      // URLパラメータ構築
      const urlParams = new URLSearchParams({
        function: functionName,
        callback: callbackName,
        ...this.flattenParams(params)
      });

      const fullUrl = `${this.baseUrl}?${urlParams.toString()}`;
      console.log('📡 JSONP URL:', fullUrl);

      // JSONPスクリプトタグ作成
      script = document.createElement('script');
      script.src = fullUrl;
      script.onerror = (error) => {
        console.error('❌ JSONPスクリプトロードエラー:', error);
        cleanup();
        reject(new Error('JSONP script load failed - check GAS WebApp URL and deployment'));
      };

      // タイムアウト設定（10秒に短縮）
      timeoutId = setTimeout(() => {
        console.error('❌ JSONP timeout after 10 seconds');
        cleanup();
        reject(new Error('JSONP request timeout after 10 seconds - GAS WebApp may be slow or unresponsive'));
      }, 10000);

      // スクリプトをDOMに追加
      document.head.appendChild(script);
      console.log('📜 JSONPスクリプトタグ追加完了');
    });
  }

  /**
   * 【CORS回避】POST方式（プリフライト回避版）
   * Content-Type: application/x-www-form-urlencoded でプリフライト回避
   */
  async callFunctionPost(functionName, params = {}) {
    try {
      console.log('📤 CORS回避POST送信:', functionName);
      
      // URLエンコード形式でデータを送信（プリフライト回避）
      const formData = new URLSearchParams();
      formData.append('function', functionName);
      formData.append('parameters', JSON.stringify(params));
      
      const response = await axios.post(this.baseUrl, formData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // GASから正常なJSONが返ってきた場合
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }

      // HTMLが返ってきた場合（GASエラー等）
      if (typeof response.data === 'string' && response.data.includes('<html>')) {
        throw new Error('GAS returned HTML instead of JSON. Check deployment settings.');
      }

      return response.data;

    } catch (error) {
      console.error('❌ POST request failed:', error);
      
      // CORSエラーの場合はJSONPフォールバック提案
      if (error.message.includes('CORS') || error.message.includes('ERR_FAILED')) {
        console.warn('🔄 CORS detected. Consider using JSONP fallback.');
        throw new Error('CORS error detected. Please check GAS deployment settings or use JSONP mode.');
      }
      
      throw error;
    }
  }

  /**
   * 【本番推奨】CORS完全回避POST通信
   * プリフライト発生しないContent-Typeを使用
   */
  async callFunctionPostSafe(functionName, params = {}) {
    try {
      console.log('🛡️ CORS安全POST送信:', functionName);
      
      // text/plain でプリフライト完全回避
      const payload = JSON.stringify({
        function: functionName,
        parameters: params
      });
      
      const response = await axios.post(this.baseUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      // レスポンス処理
      if (response.data && typeof response.data === 'object') {
        return response.data;
      }

      if (typeof response.data === 'string' && response.data.includes('<html>')) {
        throw new Error('GAS returned HTML instead of JSON. Check deployment settings.');
      }

      return response.data;

    } catch (error) {
      console.error('❌ Safe POST request failed:', error);
      throw error;
    }
  }

  /**
   * パラメータをURLパラメータ用にフラット化
   * ネストしたオブジェクトはJSON文字列として送信
   */
  flattenParams(params) {
    const flattened = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (typeof value === 'object') {
        // オブジェクトや配列はJSON文字列として送信
        flattened[key] = JSON.stringify(value);
      } else {
        flattened[key] = String(value);
      }
    }
    
    return flattened;
  }

  // ===================
  // 具体的なAPI関数
  // ===================

  /**
   * 接続テスト
   */
  async testConnection() {
    return this.callFunction('testConnection');
  }

  /**
   * 詳細アサインメントスコア取得
   */
  async getDetailedAssignmentScores(parentId, inquiryId, options = {}) {
    return this.callFunction('getDetailedAssignmentScores', {
      parentId,
      inquiryId,
      options
    });
  }

  /**
   * アサインメントアドバイス生成
   */
  async generateAssignmentAdvice(parentId, inquiryId, childId) {
    return this.callFunction('generateAssignmentAdvice', {
      parentId,
      inquiryId,
      childId
    });
  }

  /**
   * ソート優先度更新
   */
  async updateSortPriority(parentId, sortOrder) {
    return this.callFunction('updateSortPriority', {
      parentId,
      sortOrder
    });
  }

  /**
   * ケース割り当て
   */
  async assignCaseToChild(parentId, inquiryId, mode, options = {}) {
    return this.callFunction('assignCaseToChild', {
      parentId,
      inquiryId,
      mode,
      options
    });
  }
}

// ===================
// Vue 3 Composition API用のコンポーザブル
// ===================

import { ref } from 'vue';

/**
 * GAS API用のコンポーザブル
 */
export function useGasApi() {
  // 環境変数からGAS WebApp URLを取得
  const gasApiService = new GasApiService(
    process.env.VUE_APP_GAS_WEBAPP_URL || 
    'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
  );

  const isLoading = ref(false);
  const error = ref(null);

  /**
   * API実行ヘルパー
   */
  const executeApi = async (apiCall) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await apiCall();
      
      if (!result.success) {
        throw new Error(result.error || 'API call failed');
      }
      
      return result;
    } catch (err) {
      error.value = err.message;
      console.error('❌ API実行エラー:', err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // 状態
    isLoading,
    error,
    
    // APIサービス
    gasApiService,
    
    // ヘルパー関数
    executeApi,
    
    // 具体的なAPI関数（GET版）
    async testConnection() {
      return executeApi(() => gasApiService.testConnection());
    },
    
    async getDetailedAssignmentScores(parentId, inquiryId, options) {
      return executeApi(() => 
        gasApiService.getDetailedAssignmentScores(parentId, inquiryId, options)
      );
    },
    
    async generateAssignmentAdvice(parentId, inquiryId, childId) {
      return executeApi(() => 
        gasApiService.generateAssignmentAdvice(parentId, inquiryId, childId)
      );
    },
    
    async updateSortPriority(parentId, sortOrder) {
      return executeApi(() => 
        gasApiService.updateSortPriority(parentId, sortOrder)
      );
    },
    
    async assignCaseToChild(parentId, inquiryId, mode, options) {
      return executeApi(() => 
        gasApiService.assignCaseToChild(parentId, inquiryId, mode, options)
      );
    },

    // CORS回避POST通信版
    async testConnectionPost() {
      return executeApi(() => gasApiService.callFunctionPost('testConnection', {}));
    },

    async testConnectionPostSafe() {
      return executeApi(() => gasApiService.callFunctionPostSafe('testConnection', {}));
    },

    async getDetailedAssignmentScoresPost(parentId, inquiryId, options) {
      return executeApi(() => 
        gasApiService.callFunctionPost('getDetailedAssignmentScores', {
          parentId, inquiryId, options
        })
      );
    },

    async getDetailedAssignmentScoresPostSafe(parentId, inquiryId, options) {
      return executeApi(() => 
        gasApiService.callFunctionPostSafe('getDetailedAssignmentScores', {
          parentId, inquiryId, options
        })
      );
    },

    // JSONP通信版（CORS完全回避）
    async testConnectionJsonp() {
      return executeApi(() => gasApiService.callFunctionJsonp('testConnection', {}));
    },

    async getDetailedAssignmentScoresJsonp(parentId, inquiryId, options) {
      return executeApi(() => 
        gasApiService.callFunctionJsonp('getDetailedAssignmentScores', {
          parentId, inquiryId, options
        })
      );
    }
  };
}

export default GasApiService;