<template>
  <div id="app">
    <!-- 認証済みの場合のみ表示 -->
    <div v-if="isAuthenticated" class="app-layout">
      <!-- ヘッダー -->
      <header class="app-header">
        <button class="menu-toggle" @click="toggleSidebar" :class="{ active: sidebarOpen }">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1 class="app-title">外壁塗装くらべるAI 管理画面</h1>
      </header>

      <!-- サイドバー -->
      <nav class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="logo">🏠 外壁塗装くらべるAI</div>
          <div class="admin-title">管理者ダッシュボード</div>
        </div>
        
        <div class="menu-items">
          <router-link to="/dashboard" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">📊</span>
            <span class="menu-text">ダッシュボード</span>
          </router-link>
          <router-link to="/assignment" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">🎯</span>
            <span class="menu-text">案件振り分け</span>
          </router-link>
          <router-link to="/ranking" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">🏆</span>
            <span class="menu-text">ランキング</span>
          </router-link>
          <router-link to="/flag-management" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">🏁</span>
            <span class="menu-text">フラグ管理</span>
          </router-link>
          <router-link to="/franchise-management" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">🏢</span>
            <span class="menu-text">加盟店管理</span>
          </router-link>
          <router-link to="/cancel-requests" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">🚫</span>
            <span class="menu-text">キャンセル申請</span>
          </router-link>
          <router-link to="/billing" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">💰</span>
            <span class="menu-text">請求履歴</span>
          </router-link>
          <router-link to="/settings" class="menu-item" @click="closeMobileMenu">
            <span class="menu-icon">⚙️</span>
            <span class="menu-text">設定</span>
          </router-link>
          
          <!-- ログアウトボタン -->
          <div class="menu-divider"></div>
          <button @click="logout" class="menu-item logout-menu-item">
            <span class="menu-icon">🚪</span>
            <span class="menu-text">ログアウト</span>
          </button>
        </div>
      </nav>

      <!-- メインコンテンツ -->
      <main class="main-content" :class="{ shifted: sidebarOpen }">
        <div class="router-container">
          <Suspense>
            <template #default>
              <router-view />
            </template>
            <template #fallback>
              <div class="loading">🔄 読み込み中...</div>
            </template>
          </Suspense>
        </div>
      </main>

      <!-- モバイル用オーバーレイ -->
      <div v-if="sidebarOpen && isMobile" class="sidebar-overlay" @click="closeSidebar"></div>
    </div>


    <!-- 未認証ユーザー用のコンテンツ -->
    <div v-if="!isAuthenticated" class="auth-content">
      <router-view />
    </div>

    <!-- エラーバウンダリ -->
    <div v-if="appError" class="error-boundary">
      <h3>❌ アプリケーションエラー</h3>
      <p>{{ appError }}</p>
      <button @click="reloadApp" class="btn-reload">再読み込み</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onErrorCaptured, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'App',
  setup() {
    const authStore = useAuthStore()
    const appError = ref(null)
    const sidebarOpen = ref(true)
    const isMobile = ref(false)
    
    // 認証状態
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    
    // 開発環境判定
    const isDevelopment = computed(() => process.env.NODE_ENV === 'development')

    // レスポンシブ対応
    const checkScreenSize = () => {
      isMobile.value = window.innerWidth <= 768
      if (isMobile.value) {
        sidebarOpen.value = false
      }
    }

    // サイドバートグル
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value
    }

    const closeSidebar = () => {
      sidebarOpen.value = false
    }

    const closeMobileMenu = () => {
      if (isMobile.value) {
        sidebarOpen.value = false
      }
    }

    // ログアウト
    const logout = async () => {
      await authStore.logout()
      // 強制リロードを削除、単純にルートページへ
    }

    // グローバルエラーハンドリング
    onErrorCaptured((error, instance, info) => {
      console.error('❌ Vue エラーキャッチ:', error)
      console.error('  コンポーネント:', instance)
      console.error('  エラー情報:', info)
      
      appError.value = `${error.message} (${info})`
      return false // エラーの伝播を停止
    })

    // アプリ再読み込み
    const reloadApp = () => {
      appError.value = null
      // 強制リロードを削除
    }

    onMounted(() => {
      checkScreenSize()
      window.addEventListener('resize', checkScreenSize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', checkScreenSize)
    })

    return {
      appError,
      isAuthenticated,
      isDevelopment,
      sidebarOpen,
      isMobile,
      toggleSidebar,
      closeSidebar,
      closeMobileMenu,
      logout,
      reloadApp,
      $env: process.env
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
}

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ヘッダー */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: 60px;
  padding: 0 20px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.menu-toggle {
  background: #333333;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  transition: all 0.3s ease;
}

.menu-toggle:hover {
  background: #555555;
}

.menu-toggle span {
  width: 18px;
  height: 2px;
  background: white;
  transition: all 0.3s ease;
}

.menu-toggle.active span:nth-child(1) {
  transform: rotate(45deg) translate(4px, 4px);
}

.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active span:nth-child(3) {
  transform: rotate(-45deg) translate(4px, -4px);
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  flex: 1;
  text-align: center;
}


/* サイドバー */
.sidebar {
  width: 280px;
  height: 100vh;
  background: #1a1a1a;
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 999;
  overflow-y: auto;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  padding: 80px 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.admin-title {
  font-size: 13px;
  opacity: 0.8;
}

.menu-items {
  padding: 20px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;
  color: white;
  text-decoration: none;
  transition: all 0.3s;
  border-left: 4px solid transparent;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-left-color: rgba(255, 255, 255, 0.5);
}

.menu-item.router-link-active {
  background: rgba(255, 255, 255, 0.15);
  border-left-color: white;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
}

/* メニュー区切り線 */
.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 10px 20px;
}

/* ログアウトメニューボタン */
.logout-menu-item {
  background: none !important;
  border: none;
  color: white;
  width: 100%;
  text-align: left;
  font-family: inherit;
  margin-top: 10px;
}

.logout-menu-item:hover {
  background: rgba(220, 53, 69, 0.2) !important;
  border-left-color: #dc3545 !important;
}

/* メインコンテンツ */
.main-content {
  margin-top: 60px;
  padding: 20px;
  transition: margin-left 0.3s ease;
  min-height: calc(100vh - 60px);
  overflow-y: auto;
}

.main-content.shifted {
  margin-left: 280px;
}

.router-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 未認証ユーザー用スタイル */
.auth-content {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* オーバーレイ */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.error-boundary {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 20px;
  border-radius: 4px;
  margin: 20px;
}

.btn-reload {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

/* レスポンシブ対応 */
@media (min-width: 769px) {
  .sidebar.open {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 280px;
  }
  
  .sidebar {
    transform: translateX(0);
  }
  
  .sidebar-overlay {
    display: none;
  }
}

@media (max-width: 768px) {
  .app-title {
    font-size: 16px;
  }
  
  .main-content {
    margin-left: 0;
    padding: 15px;
  }
  
  .menu-item {
    padding: 12px 20px;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 14px;
  }
  
  .main-content {
    padding: 10px;
  }
  
  .menu-toggle {
    width: 35px;
    height: 35px;
  }
  
  .menu-toggle span {
    width: 16px;
  }
}
</style>