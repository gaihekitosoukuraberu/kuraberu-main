<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1 class="login-title">外壁塗装くらべるAI</h1>
        <p class="login-subtitle">管理画面</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">メールアドレス</label>
          <input
            id="email"
            type="text"
            v-model="loginForm.email"
            class="form-input"
            :class="{ 'error': errors.email }"
            placeholder="admin@example.com"
            autocomplete="username"
            required
          >
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">パスワード</label>
          <div class="password-input-container">
            <input
              id="password"
              :type="showPassword ? 'text' : 'password'"
              v-model="loginForm.password"
              class="form-input"
              :class="{ 'error': errors.password }"
              placeholder="パスワードを入力"
              required
            >
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="loginForm.rememberMe"
              class="checkbox-input"
            >
            <span class="checkbox-text">ログイン状態を保持する</span>
          </label>
        </div>

        <button
          type="submit"
          class="login-btn"
          :disabled="isLoading"
        >
          <span v-if="isLoading">ログイン中...</span>
          <span v-else>ログイン</span>
        </button>

        <div v-if="loginError" class="login-error">
          {{ loginError }}
        </div>
      </form>

      <div class="login-footer">
        <a href="#" class="forgot-password" @click.prevent="handleForgotPassword">
          パスワードを忘れた方はこちら
        </a>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Router & Store
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// リアクティブデータ
const isLoading = ref(false)
const showPassword = ref(false)
const loginError = ref('')

const loginForm = reactive({
  email: '',
  password: '',
  rememberMe: false
})

// メール入力監視 - mailto:を自動削除
watch(() => loginForm.email, (newEmail) => {
  if (newEmail && newEmail.startsWith('mailto:')) {
    loginForm.email = newEmail.replace('mailto:', '')
  }
})

const errors = reactive({
  email: '',
  password: ''
})

// バリデーション
const validateForm = () => {
  errors.email = ''
  errors.password = ''
  
  let isValid = true
  
  if (!loginForm.email) {
    errors.email = 'メールアドレスは必須です'
    isValid = false
  }
  
  if (!loginForm.password) {
    errors.password = 'パスワードは必須です'
    isValid = false
  }
  
  return isValid
}


// ログイン処理
const handleLogin = async () => {
  if (!validateForm()) {
    return
  }
  
  try {
    isLoading.value = true
    loginError.value = ''
    
    // 認証ストアを使用してログイン
    const result = await authStore.login({
      email: loginForm.email,
      password: loginForm.password
    })
    
    console.log('Login result:', result)
    
    if (result.success) {
      // ログイン成功時の処理
      console.log('Login successful, redirecting to dashboard')
      
      // 認証状態を確認
      console.log('Auth store state:', {
        isAuthenticated: authStore.isAuthenticated,
        user: authStore.user,
        token: authStore.token
      })
      
      // Vue Routerで正常遷移
      await router.push('/dashboard')
    } else {
      console.log('Login failed:', result.error)
      loginError.value = result.error || 'ログインに失敗しました'
    }
    
  } catch (error) {
    loginError.value = error.message || 'ログインに失敗しました'
  } finally {
    isLoading.value = false
  }
}


// パスワード忘れ
const handleForgotPassword = () => {
  alert('パスワードリセット機能は準備中です')
}

// ライフサイクル
onMounted(async () => {
  // 認証状態をチェック
  await authStore.initializeAuth()
  
  // 既にログイン済みの場合はリダイレクト
  if (authStore.isAuthenticated) {
    const redirectPath = route.query.redirect || '/dashboard'
    router.push(redirectPath)
  }
  
  // Remember Me の場合は情報を復元
  if (localStorage.getItem('rememberMe') === 'true') {
    const savedEmail = localStorage.getItem('userEmail')
    if (savedEmail) {
      loginForm.email = savedEmail
      loginForm.rememberMe = true
    }
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 16px;
  color: #6c757d;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-input.error {
  border-color: #dc3545;
}

.password-input-container {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

.error-message {
  font-size: 12px;
  color: #dc3545;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
}

.checkbox-input {
  width: 16px;
  height: 16px;
}

.checkbox-text {
  user-select: none;
}

.login-btn {
  padding: 14px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.login-btn:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.login-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.login-error {
  padding: 12px 16px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
}

.forgot-password {
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
}

.forgot-password:hover {
  text-decoration: underline;
}


/* レスポンシブ対応 */
@media (max-width: 480px) {
  .login-container {
    padding: 24px;
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  .login-title {
    font-size: 20px;
  }
  
  .form-input {
    font-size: 16px; /* iOS での拡大を防ぐ */
  }
}
</style>