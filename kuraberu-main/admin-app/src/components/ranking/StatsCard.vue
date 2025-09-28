<template>
  <div :class="['stats-card', `stats-card--${color}`]">
    <div class="stats-card__icon">
      <Icon :name="icon" size="1.5rem" />
    </div>
    <div class="stats-card__content">
      <h3 class="stats-card__title">{{ title }}</h3>
      <p class="stats-card__value">{{ value }}</p>
      <p v-if="subtitle" class="stats-card__subtitle">{{ subtitle }}</p>
      <div v-if="trend" class="stats-card__trend">
        <Icon 
          :name="trend.direction === 'up' ? 'trending-up' : 'trending-down'" 
          :class="['trend-icon', trend.direction === 'up' ? 'trend-up' : 'trend-down']"
        />
        <span :class="['trend-text', trend.direction === 'up' ? 'trend-up' : 'trend-down']">
          {{ trend.value }}{{ trend.unit || '%' }}
        </span>
        <span class="trend-period">{{ trend.period || '前月比' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from '@/components/common/Icon.vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'blue',
    validator: (value) => ['blue', 'green', 'red', 'orange', 'purple', 'gray'].includes(value)
  },
  trend: {
    type: Object,
    default: null,
    validator: (value) => {
      if (!value) return true
      return value.direction && ['up', 'down'].includes(value.direction) && 
             value.value !== undefined
    }
  }
})
</script>

<style scoped>
.stats-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  border-left: 4px solid;
}

.stats-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.stats-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  flex-shrink: 0;
}

.stats-card__content {
  flex: 1;
  min-width: 0;
}

.stats-card__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
  line-height: 1.2;
}

.stats-card__value {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  line-height: 1.1;
  word-break: break-all;
  overflow-wrap: break-word;
}

.stats-card__subtitle {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.stats-card__trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.trend-icon {
  font-size: 0.875rem;
}

.trend-text {
  font-weight: 600;
}

.trend-period {
  color: #9ca3af;
}

.trend-up {
  color: #10b981;
}

.trend-down {
  color: #ef4444;
}

/* Color variants */
.stats-card--blue {
  border-left-color: #3b82f6;
}

.stats-card--blue .stats-card__icon {
  background-color: #dbeafe;
  color: #3b82f6;
}

.stats-card--green {
  border-left-color: #10b981;
}

.stats-card--green .stats-card__icon {
  background-color: #d1fae5;
  color: #10b981;
}

.stats-card--red {
  border-left-color: #ef4444;
}

.stats-card--red .stats-card__icon {
  background-color: #fee2e2;
  color: #ef4444;
}

.stats-card--orange {
  border-left-color: #f59e0b;
}

.stats-card--orange .stats-card__icon {
  background-color: #fef3c7;
  color: #f59e0b;
}

.stats-card--purple {
  border-left-color: #8b5cf6;
}

.stats-card--purple .stats-card__icon {
  background-color: #ede9fe;
  color: #8b5cf6;
}

.stats-card--gray {
  border-left-color: #6b7280;
}

.stats-card--gray .stats-card__icon {
  background-color: #f3f4f6;
  color: #6b7280;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .stats-card {
    padding: 1rem;
    gap: 0.75rem;
  }

  .stats-card__icon {
    width: 2.5rem;
    height: 2.5rem;
  }

  .stats-card__value {
    font-size: 1.25rem;
  }

  .stats-card__title {
    font-size: 0.8125rem;
  }
}
</style>