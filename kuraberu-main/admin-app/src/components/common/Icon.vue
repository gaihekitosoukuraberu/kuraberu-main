<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <i :class="iconClass" :style="iconStyle"></i>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: '1rem'
  },
  color: {
    type: String,
    default: 'currentColor'
  }
})

const iconClass = computed(() => {
  // Font Awesome Free のアイコンマッピング
  const iconMap = {
    // UI Icons
    'chevron-left': 'fas fa-chevron-left',
    'chevron-right': 'fas fa-chevron-right',
    'chevron-up': 'fas fa-chevron-up',
    'chevron-down': 'fas fa-chevron-down',
    'arrow-left': 'fas fa-arrow-left',
    'arrow-right': 'fas fa-arrow-right',
    'arrow-up': 'fas fa-arrow-up',
    'arrow-down': 'fas fa-arrow-down',
    'plus': 'fas fa-plus',
    'minus': 'fas fa-minus',
    'times': 'fas fa-times',
    'check': 'fas fa-check',
    'search': 'fas fa-search',
    'filter': 'fas fa-filter',
    'sort': 'fas fa-sort',
    'sort-up': 'fas fa-sort-up',
    'sort-down': 'fas fa-sort-down',
    'refresh': 'fas fa-sync-alt',
    'download': 'fas fa-download',
    'upload': 'fas fa-upload',
    'edit': 'fas fa-edit',
    'trash': 'fas fa-trash',
    'copy': 'fas fa-copy',
    'external-link': 'fas fa-external-link-alt',
    
    // Status Icons
    'check-circle': 'fas fa-check-circle',
    'times-circle': 'fas fa-times-circle',
    'exclamation-circle': 'fas fa-exclamation-circle',
    'info-circle': 'fas fa-info-circle',
    'question-circle': 'fas fa-question-circle',
    'warning': 'fas fa-exclamation-triangle',
    'ban': 'fas fa-ban',
    
    // Business Icons
    'trophy': 'fas fa-trophy',
    'medal': 'fas fa-medal',
    'star': 'fas fa-star',
    'star-outline': 'far fa-star',
    'flag': 'fas fa-flag',
    'bookmark': 'fas fa-bookmark',
    'bookmark-outline': 'far fa-bookmark',
    'heart': 'fas fa-heart',
    'heart-outline': 'far fa-heart',
    
    // Data Icons
    'chart-bar': 'fas fa-chart-bar',
    'chart-line': 'fas fa-chart-line',
    'chart-pie': 'fas fa-chart-pie',
    'chart-area': 'fas fa-chart-area',
    'analytics': 'fas fa-chart-line',
    'trending-up': 'fas fa-arrow-trend-up',
    'trending-down': 'fas fa-arrow-trend-down',
    'percentage': 'fas fa-percentage',
    
    // Time Icons
    'clock': 'fas fa-clock',
    'calendar': 'fas fa-calendar',
    'calendar-alt': 'fas fa-calendar-alt',
    'stopwatch': 'fas fa-stopwatch',
    'history': 'fas fa-history',
    
    // Finance Icons
    'yen-sign': 'fas fa-yen-sign',
    'dollar-sign': 'fas fa-dollar-sign',
    'euro-sign': 'fas fa-euro-sign',
    'coins': 'fas fa-coins',
    'money-bill': 'fas fa-money-bill',
    'credit-card': 'fas fa-credit-card',
    'wallet': 'fas fa-wallet',
    'piggy-bank': 'fas fa-piggy-bank',
    
    // Business Objects
    'building': 'fas fa-building',
    'store': 'fas fa-store',
    'industry': 'fas fa-industry',
    'warehouse': 'fas fa-warehouse',
    'home': 'fas fa-home',
    'office': 'fas fa-building',
    
    // People Icons
    'user': 'fas fa-user',
    'users': 'fas fa-users',
    'user-plus': 'fas fa-user-plus',
    'user-minus': 'fas fa-user-minus',
    'user-check': 'fas fa-user-check',
    'user-times': 'fas fa-user-times',
    'user-tie': 'fas fa-user-tie',
    'user-friends': 'fas fa-user-friends',
    
    // Communication Icons
    'envelope': 'fas fa-envelope',
    'phone': 'fas fa-phone',
    'mobile': 'fas fa-mobile-alt',
    'fax': 'fas fa-fax',
    'comment': 'fas fa-comment',
    'comments': 'fas fa-comments',
    'bell': 'fas fa-bell',
    'bell-slash': 'fas fa-bell-slash',
    
    // Settings Icons
    'cog': 'fas fa-cog',
    'cogs': 'fas fa-cogs',
    'tools': 'fas fa-tools',
    'wrench': 'fas fa-wrench',
    'sliders': 'fas fa-sliders-h',
    'toggle-on': 'fas fa-toggle-on',
    'toggle-off': 'fas fa-toggle-off',
    
    // File Icons
    'file': 'fas fa-file',
    'file-alt': 'fas fa-file-alt',
    'file-pdf': 'fas fa-file-pdf',
    'file-excel': 'fas fa-file-excel',
    'file-word': 'fas fa-file-word',
    'file-csv': 'fas fa-file-csv',
    'folder': 'fas fa-folder',
    'folder-open': 'fas fa-folder-open',
    
    // Navigation Icons
    'bars': 'fas fa-bars',
    'ellipsis': 'fas fa-ellipsis-h',
    'ellipsis-v': 'fas fa-ellipsis-v',
    'expand': 'fas fa-expand',
    'compress': 'fas fa-compress',
    'fullscreen': 'fas fa-expand-arrows-alt',
    
    // Lock/Security Icons
    'lock': 'fas fa-lock',
    'unlock': 'fas fa-unlock',
    'key': 'fas fa-key',
    'shield': 'fas fa-shield-alt',
    'eye': 'fas fa-eye',
    'eye-slash': 'fas fa-eye-slash'
  }

  return iconMap[props.name] || `fas fa-${props.name}`
})

const iconStyle = computed(() => ({
  fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
  color: props.color
}))
</script>

<style scoped>
/* Font Awesome CDN を使用する場合はこのスタイルは不要 */
/* プロジェクトで Font Awesome を使用していない場合は、
   適切なアイコンフォントライブラリを導入するか、
   SVG アイコンコンポーネントに置き換えてください */
</style>