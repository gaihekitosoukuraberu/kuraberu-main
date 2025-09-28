import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BillingHistory from '@/views/BillingHistory.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: '/login'
  },
  {
    path: '/billing',
    name: 'BillingHistory',
    component: BillingHistory,
    meta: {
      title: '請求履歴一覧',
      requiresAuth: true
    }
  },
  {
    path: '/billing/:id',
    name: 'BillingDetail',
    component: BillingHistory,
    props: true,
    meta: {
      title: '請求詳細',
      requiresAuth: true
    }
  },
  {
    path: '/ranking',
    name: 'Ranking',
    component: () => import('@/views/Ranking.vue'),
    meta: {
      title: 'ランキング',
      requiresAuth: true
    }
  },
  {
    path: '/flag-management',
    name: 'FlagManagement',
    component: () => import('@/views/FlagManagement.vue'),
    meta: {
      title: 'フラグ管理',
      requiresAuth: true
    }
  },
  {
    path: '/assignment',
    name: 'Assignment',
    component: () => import('@/views/Assignment.vue'),
    meta: {
      title: '案件振り分け',
      requiresAuth: true
    }
  },
  {
    path: '/franchise-management',
    name: 'FranchiseManagement',
    component: () => import('@/views/FranchiseManagement.vue'),
    meta: {
      title: '加盟店管理',
      requiresAuth: true
    }
  },
  // 将来の拡張用ルート
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: 'ダッシュボード',
      requiresAuth: true
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: {
      title: '設定',
      requiresAuth: true
    }
  },
  {
    path: '/cancel-requests',
    name: 'CancelRequests',
    component: () => import('@/views/CancelRequests.vue'),
    meta: {
      title: 'キャンセル申請管理',
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: 'ログイン',
      requiresAuth: false
    }
  },
  // 404 Not Found
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: {
      title: 'ページが見つかりません'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // ページ遷移時のスクロール位置制御
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// ナビゲーションガード
router.beforeEach(async (to, from, next) => {
  // ページタイトルの設定
  if (to.meta.title) {
    document.title = `${to.meta.title} | 外壁塗装くらべるAI 管理画面`
  }

  const authStore = useAuthStore()
  
  // 認証状態を初期化（アプリ起動時のみ一度だけ）
  if (!authStore.initialized) {
    await authStore.initializeAuth()
    authStore.initialized = true
  }

  // 認証チェック
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated && to.name !== 'Login') {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
  } else if (to.name === 'Login') {
    if (authStore.isAuthenticated) {
      next('/dashboard')
      return
    }
  }

  next()
})


// ルーター後の処理
router.afterEach((to, from) => {
  // ページ遷移の分析やログ記録用
  console.log(`Route changed from ${from.fullPath} to ${to.fullPath}`)
})

export default router