import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import EnvUtils from '@/utils/env'

// GAS WebApp URL確認ログ
console.log('🔧 [gaiheki-admin] GAS WebApp URL:', process.env.VUE_APP_GAS_WEBAPP_URL)

// アプリ起動時に認証情報をクリア（開発環境）
if (process.env.NODE_ENV === 'development') {
  console.log('🧹 Clearing auth data for development')
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

// 開発環境で環境変数情報を表示
EnvUtils.logEnvironmentInfo()

// 必須環境変数の検証
try {
  EnvUtils.validateRequiredEnvVars()
} catch (error) {
  console.error('環境変数の検証に失敗しました:', error.message)
  // 開発環境では継続、本番環境では停止
  if (EnvUtils.isProduction()) {
    throw error
  }
}

const app = createApp(App)

// Pinia (状態管理)
app.use(createPinia())

// Vue Router
app.use(router)

app.mount('#app')
