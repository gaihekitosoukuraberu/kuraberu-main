import { defineStore } from 'pinia'
import { apiService } from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: '',
    role: 'admin', // 本部管理者は admin ロール
    initialized: false
  }),

  getters: {
    isAdmin: (state) => state.role === 'admin',
    getUserInfo: (state) => state.user,
    getToken: (state) => state.token
  },

  actions: {
    async login(credentials) {
      try {
        this.loading = true
        this.error = ''
        
        console.log('Admin login attempt:', credentials)
        
        const response = await apiService.loginAdmin(credentials)
        console.log('Login response:', response)
        
        if (response && response.success) {
          // GAS APIからの正常レスポンス処理
          this.user = response.data?.user || {
            id: 'admin-' + Date.now(),
            name: '管理者',
            email: credentials.email,
            role: 'admin'
          }
          this.token = response.data?.token || 'admin-token-' + Date.now()
          this.isAuthenticated = true
          this.role = this.user.role || 'admin'
          
          localStorage.setItem('admin_token', this.token)
          localStorage.setItem('admin_user', JSON.stringify(this.user))
          
          console.log('Auth store after login:', {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            token: this.token
          })
          
          return { success: true, user: this.user }
        } else {
          this.error = response?.message || 'ログインに失敗しました'
          return { success: false, error: this.error }
        }
      } catch (error) {
        console.error('Login error:', error)
        this.error = error.message || 'ログイン処理でエラーが発生しました'
        return { success: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      this.role = null
      this.error = ''
      
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    },

    async checkAuth() {
      // ローカルストレージから認証情報を復元
      const token = localStorage.getItem('admin_token')
      const userStr = localStorage.getItem('admin_user')
      
      if (token && userStr) {
        try {
          this.token = token
          this.user = JSON.parse(userStr)
          this.isAuthenticated = true
          this.role = this.user.role || 'admin'
          return true
        } catch (e) {
          console.error('Failed to parse user data:', e)
          this.logout()
          return false
        }
      }
      
      this.logout()
      return false
    },

    async initializeAuth() {
      // 強制的にログアウト状態にして認証を要求
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      this.user = null
      this.token = null
      this.isAuthenticated = false
      this.role = 'admin'
      return false
    },

    clearError() {
      this.error = ''
    }
  }
})