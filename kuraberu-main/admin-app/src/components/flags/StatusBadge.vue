<template>
  <span :class="['status-badge', `status-badge--${statusClass}`]">
    <Icon :name="statusIcon" class="status-icon" />
    {{ status }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  }
})

const statusClass = computed(() => {
  const classMap = {
    'アクティブ': 'active',
    '不在': 'absent',
    '保留': 'hold',
    'ブラック': 'blacklist'
  }
  return classMap[props.status] || 'default'
})

const statusIcon = computed(() => {
  const iconMap = {
    'アクティブ': 'check-circle',
    '不在': 'clock',
    '保留': 'pause-circle',
    'ブラック': 'ban'
  }
  return iconMap[props.status] || 'circle'
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-icon {
  font-size: 0.875rem;
}

.status-badge--active {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge--absent {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-badge--hold {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge--blacklist {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge--default {
  background-color: #f3f4f6;
  color: #374151;
}
</style>