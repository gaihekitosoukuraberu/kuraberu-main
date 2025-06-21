<template>
  <div class="app-layout">
    <slot />
  </div>
</template>

<script setup>
// シンプルなレイアウトコンポーネント
// 既存のApp.vueでナビゲーションを管理しているため、
// ここではコンテンツのレイアウトのみを担当
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #f8fafc;
}
</style>