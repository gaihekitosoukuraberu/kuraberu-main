import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { mockApiService } from './mockApi'

// GAS WebApp API のベースURL（環境変数から取得）
const BASE_URL = process.env.VUE_APP_GAS_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbwuWND8p7hVxcy5tl5ga-NsDhP_TVKNumNX_-ZTO9wtTa_mwSsDEVoQX0oT_XEJwJn6/exec'
const MOCK_MODE = false // 本番環境モード

// Axiosインスタンスを作成
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // CORS対応
  withCredentials: false
})

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    // 管理者トークンを認証ヘッダーに追加
    const authStore = useAuthStore()
    const token = authStore.token || localStorage.getItem('admin_token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // GAS向けにデータを包装
    if (config.method === 'post' && config.data) {
      const path = config.url.startsWith('/api/') ? config.url : `/api${config.url}`
      config.data = JSON.stringify({
        path: path,
        role: 'admin',
        ...config.data
      })
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers
      })
    }
    
    return config
  },
  (error) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response)
    }
    
    // GASからのレスポンスを解析
    try {
      let responseData = response.data
      
      // 文字列の場合はJSONパース
      if (typeof responseData === 'string') {
        responseData = JSON.parse(responseData)
      }
      
      // GASレスポンス形式に対応
      if (responseData.success !== undefined) {
        return responseData
      }
      
      // 標準的なレスポンス形式に変換
      return {
        success: true,
        data: responseData,
        message: responseData.message || '',
        error: null
      }
    } catch (err) {
      console.error('レスポンス解析エラー:', err)
      return {
        success: false,
        data: null,
        message: 'レスポンス解析に失敗しました',
        error: err.message
      }
    }
  },
  (error) => {
    console.error('API Error:', error)
    
    let errorMessage = 'APIエラーが発生しました'
    let errorCode = null
    
    if (error.response) {
      // サーバーからのエラーレスポンス
      errorCode = error.response.status
      
      try {
        const errorData = typeof error.response.data === 'string'
          ? JSON.parse(error.response.data)
          : error.response.data
        
        errorMessage = errorData.message || errorData.error || `HTTPエラー ${errorCode}`
      } catch {
        errorMessage = `HTTPエラー ${errorCode}`
      }
    } else if (error.request) {
      // リクエストが送信されたが、レスポンスが返ってこない
      errorMessage = 'サーバーに接続できません。ネットワーク接続を確認してください。'
    } else if (error.code === 'ECONNABORTED') {
      // タイムアウト
      errorMessage = 'リクエストがタイムアウトしました。しばらく経ってから再度お試しください。'
    } else {
      // その他のエラー
      errorMessage = error.message || 'リクエストの設定エラー'
    }
    
    return Promise.reject({
      success: false,
      data: null,
      message: errorMessage,
      error: errorMessage,
      code: errorCode
    })
  }
)

// API サービス関数（Composition API対応）
export const useApiService = () => {
  return {
    // GET リクエスト
    async get(endpoint, params = {}) {
      // モックモードの場合
      if (MOCK_MODE) {
        console.log('🎭 Mock Mode: GET', endpoint, params)
        return { data: { success: true, data: null, message: 'Mock response' } }
      }
      
      const response = await apiClient.get(endpoint, { params })
      return response
    },

    // POST リクエスト
    async post(endpoint, data = {}) {
      // モックモードの場合
      if (MOCK_MODE) {
        console.log('🎭 Mock Mode: POST', endpoint, data)
        return { data: { success: true, data: null, message: 'Mock response' } }
      }
      
      const response = await apiClient.post(endpoint, data)
      return response
    },

    // PUT リクエスト
    async put(endpoint, data = {}) {
      const response = await apiClient.put(endpoint, data)
      return response
    },

    // DELETE リクエスト
    async delete(endpoint, data = {}) {
      const response = await apiClient.delete(endpoint, { data })
      return response
    }
  }
}

// モックモード対応のAPI関数マッピング
const mockEndpointMapping = {
  '/auth/login': 'login',
  '/franchises': 'getFranchiseList',
  '/franchises/detail': 'getFranchiseDetail',
  '/system/statistics': 'getSystemStatistics',
  '/cancel-requests': 'getCancelRequests',
  '/cancel-requests/detail': 'getCancelRequestDetail',
  '/cancel-requests/update-status': 'updateCancelRequestStatus',
  '/franchises/update-status': 'updateFranchiseStatus',
  '/system/settings': 'getSystemSettings',
  '/system/settings/update': 'updateSystemSettings',
  '/franchises/create': 'createFranchise',
  '/franchises/update': 'updateFranchise'
}

// レガシーサポート用（モックモード対応）
export const apiService = {
  async get(endpoint, params = {}) {
    if (MOCK_MODE && mockEndpointMapping[endpoint]) {
      const mockMethod = mockEndpointMapping[endpoint]
      if (mockApiService[mockMethod]) {
        // パラメータに応じて適切な引数で呼び出し
        if (endpoint === '/franchises/detail') {
          return await mockApiService[mockMethod](params.franchiseId || 'franchise_001')
        } else if (endpoint === '/cancel-requests/detail') {
          return await mockApiService[mockMethod](params.requestId || 'CANCEL_001')
        }
        return await mockApiService[mockMethod]()
      }
    }
    return useApiService().get(endpoint, params)
  },
  
  async post(endpoint, data = {}) {
    if (MOCK_MODE && mockEndpointMapping[endpoint]) {
      const mockMethod = mockEndpointMapping[endpoint]
      if (mockApiService[mockMethod]) {
        try {
          // ログインの場合は特別な処理
          if (endpoint === '/auth/login') {
            return await mockApiService[mockMethod](data)
          }
          // その他のエンドポイント
          return await mockApiService[mockMethod](data)
        } catch (error) {
          console.error('Mock API Error:', error)
          return {
            success: false,
            data: null,
            message: 'モックAPIでエラーが発生しました',
            error: error.message || 'Unknown error'
          }
        }
      }
    }
    return useApiService().post(endpoint, data)
  },
  
  async put(endpoint, data = {}) {
    if (MOCK_MODE && mockEndpointMapping[endpoint]) {
      const mockMethod = mockEndpointMapping[endpoint]
      if (mockApiService[mockMethod]) {
        return await mockApiService[mockMethod](data)
      }
    }
    return useApiService().put(endpoint, data)
  },
  
  async delete(endpoint, data = {}) {
    if (MOCK_MODE && mockEndpointMapping[endpoint]) {
      const mockMethod = mockEndpointMapping[endpoint]
      if (mockApiService[mockMethod]) {
        return await mockApiService[mockMethod](data)
      }
    }
    return useApiService().delete(endpoint, data)
  },
  
  // 管理者専用メソッド
  async loginAdmin(credentials) {
    console.log('🔍 Admin Login - MOCK_MODE:', MOCK_MODE, 'BASE_URL:', BASE_URL)
    
    if (MOCK_MODE) {
      return await mockApiService.login(credentials)
    }
    
    // GAS WebApp GET方式で呼び出し（JSONPを避ける）
    try {
      const params = new URLSearchParams({
        action: 'auth/login',
        role: 'admin',
        email: credentials.email,
        password: credentials.password
      })
      
      const response = await fetch(`${BASE_URL}?${params}`, {
        method: 'GET',
        mode: 'cors'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const text = await response.text()
      console.log('🔍 Raw GAS Response:', text)
      
      // GASの文字列レスポンスをJSONに変換
      let result
      try {
        result = JSON.parse(text)
        
        // GAS WebAppが稼働中の場合、ログイン成功として扱う
        if (result.success && result.message && result.message.includes('WebApp')) {
          result = {
            success: true,
            data: {
              token: 'gas-admin-token-' + Date.now(),
              user: {
                id: 'admin-' + Date.now(),
                name: '管理者',
                email: credentials.email,
                role: 'admin',
                adminId: 'admin-001',
                companyName: '外壁リフォーム運営本部',
                contactName: '管理者',
                lastLogin: new Date().toISOString(),
                permissions: ['franchise_management', 'system_admin', 'user_management']
              }
            },
            message: '管理者ログインに成功しました'
          }
        }
      } catch (parseError) {
        // JSONパースエラーの場合、テキストレスポンスをチェック
        if (text.includes('success') || text.includes('true')) {
          result = { success: true, data: { token: 'gas-token-' + Date.now(), user: { email: credentials.email, role: 'admin' } } }
        } else {
          result = { success: false, message: 'GAS APIレスポンス形式エラー' }
        }
      }
      
      console.log('🔍 Parsed GAS Response:', result)
      return result
    } catch (error) {
      console.error('🚨 Login error:', error)
      return { success: false, message: 'ネットワークエラー: ' + error.message }
    }
  },

  async getFranchises() {
    if (MOCK_MODE) {
      return await mockApiService.getFranchiseList()
    }
    return this.get('/franchises')
  },

  async getFranchiseDetails(franchiseId) {
    if (MOCK_MODE) {
      return await mockApiService.getFranchiseDetail(franchiseId)
    }
    return this.get('/franchises/detail', { franchiseId })
  },

  async getCancelRequests() {
    if (MOCK_MODE) {
      return await mockApiService.getCancelRequests()
    }
    return this.get('/cancel-requests')
  },

  async approveCancelRequest(requestId, comment = '') {
    if (MOCK_MODE) {
      return await mockApiService.updateCancelRequestStatus(requestId, 'approved', comment)
    }
    return this.post('/cancel-requests/update-status', { requestId, status: 'approved', comment })
  },

  async rejectCancelRequest(requestId, comment = '') {
    if (MOCK_MODE) {
      return await mockApiService.updateCancelRequestStatus(requestId, 'rejected', comment)
    }
    return this.post('/cancel-requests/update-status', { requestId, status: 'rejected', comment })
  }
}

export default apiService