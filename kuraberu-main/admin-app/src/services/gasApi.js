/**
 * Google Apps Script API Service
 * GAS WebApp エンドポイントとの通信を管理
 */

import EnvUtils from '@/utils/env'

class GasApiService {
  constructor() {
    const config = EnvUtils.getApiConfig()
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout
    this.retryCount = config.retryCount
    this.retryDelay = 1000 // 1秒
    
    // 開発環境でのデバッグ情報表示
    if (EnvUtils.isDevelopment() && EnvUtils.isDebugMode()) {
      console.log('🔧 GAS API Service initialized:', {
        baseUrl: this.baseUrl,
        timeout: this.timeout,
        retryCount: this.retryCount
      })
    }
  }

  /**
   * GET リクエスト
   * @param {string} endpoint - エンドポイントパス
   * @param {Object} params - クエリパラメータ
   * @param {Object} options - リクエストオプション
   * @returns {Promise<Object>} レスポンスデータ
   */
  async get(endpoint, params = {}, options = {}) {
    const url = this.buildUrl(endpoint, params)
    
    return this.request(url, {
      method: 'GET',
      ...options
    })
  }

  /**
   * POST リクエスト
   * @param {string} endpoint - エンドポイントパス
   * @param {Object} data - リクエストボディ
   * @param {Object} options - リクエストオプション
   * @returns {Promise<Object>} レスポンスデータ
   */
  async post(endpoint, data = {}, options = {}) {
    const url = this.buildUrl(endpoint)
    
    // CORS回避のためtext/plain Content-Typeを使用
    const requestData = {
      path: endpoint,
      ...data
    }
    
    return this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...options.headers
      },
      body: JSON.stringify(requestData),
      ...options
    })
  }

  /**
   * HTTPリクエストを実行
   * @param {string} url - リクエストURL
   * @param {Object} options - リクエストオプション
   * @returns {Promise<Object>} レスポンスデータ
   */
  async request(url, options = {}) {
    // 開発環境用モック
    if (EnvUtils.isDevelopment()) {
      return this.getMockResponse(url, options)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await this.retryRequest(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return await this.handleResponse(response)
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleError(error)
    }
  }

  /**
   * リトライ機能付きリクエスト
   */
  async retryRequest(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok || response.status === 302) {
        return response
      }
      
      if (response.status >= 500 && attempt < this.retryCount) {
        await this.delay(this.retryDelay * attempt)
        return this.retryRequest(url, options, attempt + 1)
      }
      
      return response
    } catch (error) {
      if (attempt < this.retryCount && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * attempt)
        return this.retryRequest(url, options, attempt + 1)
      }
      throw error
    }
  }

  /**
   * レスポンス処理
   */
  async handleResponse(response) {
    try {
      const text = await response.text()
      
      try {
        const data = JSON.parse(text)
        return this.normalizeGasResponse(data)
      } catch (parseError) {
        if (text.includes('<html>')) {
          throw new Error('GAS WebApp からHTMLレスポンスが返されました。')
        }
        return { success: true, data: text }
      }
    } catch (error) {
      throw new Error(`レスポンスの解析に失敗しました: ${error.message}`)
    }
  }

  /**
   * GASレスポンスの正規化
   */
  normalizeGasResponse(data) {
    if (typeof data === 'object' && data !== null) {
      if (Object.prototype.hasOwnProperty.call(data, 'success')) {
        return data
      }
      if (data.error) {
        return { success: false, error: data.error, details: data.details || null }
      }
      return { success: true, data: data }
    }
    return { success: true, data: data }
  }

  /**
   * エラーハンドリング
   */
  handleError(error) {
    console.error('API request error:', error)
    
    if (error.name === 'AbortError') {
      return new Error('リクエストがタイムアウトしました。')
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new Error('ネットワークエラーが発生しました。')
    }
    
    return error
  }

  /**
   * リトライ対象エラーの判定
   */
  isRetryableError(error) {
    return (
      error.name === 'TypeError' ||
      error.name === 'AbortError' ||
      error.message.includes('fetch')
    )
  }

  /**
   * URL構築
   */
  buildUrl(endpoint, params = {}) {
    const url = new URL(this.baseUrl)
    
    if (endpoint && endpoint !== '/') {
      url.searchParams.set('path', endpoint)
    }
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.set(key, params[key])
      }
    })
    
    return url.toString()
  }

  /**
   * 遅延処理
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 開発環境用モックレスポンス
   */
  async getMockResponse(url, options = {}) {
    // リクエストをシミュレート
    await this.delay(500)
    
    console.log('🎭 モックAPI応答:', { url, options })
    
    return {
      success: true,
      data: {
        message: '開発環境用モックデータ',
        timestamp: new Date().toISOString(),
        mockData: true
      },
      timestamp: new Date().toISOString()
    }
  }

  setBaseUrl(url) {
    this.baseUrl = url
  }
}

export const gasApiService = new GasApiService()
export default gasApiService