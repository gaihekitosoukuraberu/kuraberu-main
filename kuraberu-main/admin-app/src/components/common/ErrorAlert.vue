<template>
  <div :class="['alert', `alert--${type}`]" role="alert">
    <div class="alert__icon">
      <Icon :name="iconName" />
    </div>
    <div class="alert__content">
      <h4 v-if="title" class="alert__title">{{ title }}</h4>
      <p class="alert__message">{{ message }}</p>
      <div v-if="actions && actions.length > 0" class="alert__actions">
        <button 
          v-for="action in actions"
          :key="action.label"
          :class="['alert__action', action.style || 'primary']"
          @click="action.handler"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
    <button 
      v-if="closable"
      class="alert__close"
      @click="$emit('close')"
      aria-label="閉じる"
    >
      <Icon name="times" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'error',
    validator: (value) => ['success', 'warning', 'error', 'info'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  closable: {
    type: Boolean,
    default: true
  },
  actions: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close'])

const iconName = computed(() => {
  const icons = {
    success: 'check-circle',
    warning: 'exclamation-circle',
    error: 'times-circle',
    info: 'info-circle'
  }
  return icons[props.type]
})
</script>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid;
  margin-bottom: 1rem;
  position: relative;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert__icon {
  flex-shrink: 0;
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.alert__content {
  flex: 1;
  min-width: 0;
}

.alert__title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.alert__message {
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
  word-wrap: break-word;
}

.alert__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.alert__action {
  padding: 0.375rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.alert__action.primary {
  background-color: #3b82f6;
  color: white;
}

.alert__action.primary:hover {
  background-color: #2563eb;
}

.alert__action.secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.alert__action.secondary:hover {
  background-color: #d1d5db;
}

.alert__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 0.25rem;
  border-radius: 4px;
}

.alert__close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Type variants */
.alert--success {
  background-color: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.alert--success .alert__icon {
  color: #10b981;
}

.alert--warning {
  background-color: #fffbeb;
  border-color: #f59e0b;
  color: #92400e;
}

.alert--warning .alert__icon {
  color: #f59e0b;
}

.alert--error {
  background-color: #fef2f2;
  border-color: #ef4444;
  color: #991b1b;
}

.alert--error .alert__icon {
  color: #ef4444;
}

.alert--info {
  background-color: #eff6ff;
  border-color: #3b82f6;
  color: #1e40af;
}

.alert--info .alert__icon {
  color: #3b82f6;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .alert {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .alert__close {
    top: 0.5rem;
    right: 0.5rem;
  }

  .alert__actions {
    flex-direction: column;
  }

  .alert__action {
    width: 100%;
    justify-content: center;
  }
}
</style>