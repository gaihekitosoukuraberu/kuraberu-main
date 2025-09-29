import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: 'ダッシュボード', icon: 'dashboard' }
      },
      {
        path: '/assignment',
        name: 'Assignment',
        component: () => import('../views/AssignmentView.vue'),
        meta: { title: '案件割り振り', icon: 'assignment' }
      },
      {
        path: '/franchises',
        name: 'Franchises',
        component: () => import('../views/FranchisesView.vue'),
        meta: { title: '加盟店管理', icon: 'store' }
      },
      {
        path: '/financial',
        name: 'Financial',
        component: () => import('../views/FinancialView.vue'),
        meta: { title: '請求・財務', icon: 'payment' }
      },
      {
        path: '/ranking',
        name: 'Ranking',
        component: () => import('../views/RankingView.vue'),
        meta: { title: 'ランキング', icon: 'leaderboard' }
      },
      {
        path: '/analytics',
        name: 'Analytics',
        component: () => import('../views/AnalyticsView.vue'),
        meta: { title: '分析・レポート', icon: 'analytics' }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('../views/SettingsView.vue'),
        meta: { title: 'システム設定', icon: 'settings' }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// ナビゲーションガード
router.beforeEach((to, from, next) => {
  // タイトル設定
  const title = to.meta?.title as string;
  document.title = title ? `${title} | 本部管理画面` : '本部管理画面';
  
  // 認証チェック（後で実装）
  // if (to.path !== '/login' && !isAuthenticated()) {
  //   next('/login');
  // } else {
  //   next();
  // }
  
  next();
});

export default router;