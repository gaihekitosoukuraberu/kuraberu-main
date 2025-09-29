<template>
  <div class="min-h-screen bg-gray-100">
    <!-- トップバー -->
    <div class="fixed top-0 left-0 right-0 z-50 h-16 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800">
      <div class="flex items-center justify-between h-full px-4">
        <!-- 左側：メニューボタンとロゴ -->
        <div class="flex items-center space-x-4">
          <!-- メニューボタン -->
          <button
            @click="toggleSidebar"
            class="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <!-- ロゴ -->
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">本</span>
            </div>
            <span class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              本部管理システム
            </span>
          </div>
        </div>
        
        <!-- 右側：通知とユーザー -->
        <div class="flex items-center space-x-4">
          <!-- 通知 -->
          <button class="relative p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span v-if="notificationCount > 0" class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          
          <!-- ユーザー -->
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full"></div>
            <span class="text-sm text-gray-300">管理者</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- サイドバー（オーバーレイ） -->
    <Transition name="sidebar">
      <div v-if="sidebarOpen" class="fixed inset-0 z-40 flex">
        <!-- 背景オーバーレイ -->
        <div 
          class="fixed inset-0 bg-black/50 backdrop-blur-sm"
          @click="closeSidebar"
        ></div>
        
        <!-- サイドバー本体 -->
        <div class="relative w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800">
          <div class="h-full overflow-y-auto pt-20 pb-4">
            <nav class="px-3 space-y-1">
              <RouterLink
                v-for="item in menuItems"
                :key="item.path"
                :to="item.path"
                class="sidebar-item group"
                :class="{ 'active': $route.path === item.path }"
                @click="closeSidebar"
              >
                <!-- アイコン -->
                <component :is="item.icon" class="w-5 h-5 mr-3 flex-shrink-0" />
                <!-- ラベル -->
                <span>{{ item.label }}</span>
                <!-- 新着バッジ -->
                <span v-if="item.badge" class="ml-auto badge" :class="item.badgeClass">
                  {{ item.badge }}
                </span>
              </RouterLink>
            </nav>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- メインコンテンツ -->
    <main class="pt-16">
      <div class="p-6">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

// アイコンコンポーネント（簡易版）
const DashboardIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>`
};

const AssignmentIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>`
};

const StoreIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>`
};

const PaymentIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>`
};

const LeaderboardIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>`
};

const AnalyticsIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>`
};

const SettingsIcon = {
  template: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>`
};

const route = useRoute();
const sidebarOpen = ref(false);
const notificationCount = ref(3);

const menuItems = [
  { path: '/', label: 'ダッシュボード', icon: DashboardIcon, badge: null },
  { path: '/assignment', label: '案件割り振り', icon: AssignmentIcon, badge: '5', badgeClass: 'badge-danger' },
  { path: '/franchises', label: '加盟店管理', icon: StoreIcon, badge: '2', badgeClass: 'badge-warning' },
  { path: '/financial', label: '請求・財務', icon: PaymentIcon, badge: null },
  { path: '/ranking', label: 'ランキング', icon: LeaderboardIcon, badge: null },
  { path: '/analytics', label: '分析・レポート', icon: AnalyticsIcon, badge: null },
  { path: '/settings', label: 'システム設定', icon: SettingsIcon, badge: null }
];

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
};
</script>

<style scoped>
/* サイドバーアニメーション */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: opacity 0.3s ease;
}

.sidebar-enter-active > div:last-child,
.sidebar-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
}

.sidebar-enter-from > div:last-child,
.sidebar-leave-to > div:last-child {
  transform: translateX(-100%);
}

/* ページ遷移アニメーション */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>