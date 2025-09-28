<template>
  <div class="response-ranking">
    <div class="ranking-header">
      <h2 class="ranking-title">
        <Icon name="clock" class="title-icon" />
        応答速度ランキング
      </h2>
      <button 
        class="export-btn"
        @click="$emit('export', 'response')"
        :disabled="loading || !hasData"
      >
        <Icon name="download" />
        CSVエクスポート
      </button>
    </div>

    <div v-if="!hasData && !loading" class="no-data">
      <Icon name="clock" class="no-data-icon" />
      <p>表示するデータがありません</p>
    </div>

    <div v-else class="ranking-table-container">
      <table class="ranking-table">
        <thead>
          <tr>
            <th class="rank-col">順位</th>
            <th class="name-col">加盟店名</th>
            <th class="time-col">平均応答時間</th>
            <th class="responses-col">総応答件数</th>
            <th class="bar-col">速度グラフ</th>
            <th class="performance-col">評価</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(item, index) in data" 
            :key="item.franchiseId"
            :class="['ranking-row', getRankClass(index)]"
          >
            <td class="rank-cell">
              <div class="rank-display">
                <Icon 
                  v-if="index < 3" 
                  :name="getRankIcon(index)" 
                  :class="getRankIconClass(index)"
                />
                <span v-else class="rank-number">{{ index + 1 }}</span>
              </div>
            </td>
            <td class="name-cell">
              <div class="franchise-info">
                <span class="franchise-name">{{ item.franchiseName }}</span>
                <span class="franchise-id">{{ item.franchiseId }}</span>
              </div>
            </td>
            <td class="time-cell">
              <div class="time-display">
                <span class="time-number">{{ item.avgResponseTime }}</span>
                <span class="time-unit">時間</span>
              </div>
            </td>
            <td class="responses-cell">
              <span class="responses-number">{{ item.totalResponses }}</span>
              <span class="responses-unit">件</span>
            </td>
            <td class="bar-cell">
              <div class="response-bar">
                <div 
                  class="response-fill"
                  :class="getResponseSpeedClass(item.avgResponseTime)"
                  :style="{ width: `${getResponseBarWidth(item.avgResponseTime)}%` }"
                ></div>
              </div>
            </td>
            <td class="performance-cell">
              <span :class="['performance-badge', getPerformanceClass(item.avgResponseTime)]">
                {{ getPerformanceLabel(item.avgResponseTime) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hasData" class="ranking-footer">
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-label">最速応答:</span>
          <span class="stat-value">{{ fastestResponse }}時間</span>
        </div>
        <div class="stat">
          <span class="stat-label">平均応答:</span>
          <span class="stat-value">{{ averageResponse }}時間</span>
        </div>
        <div class="stat">
          <span class="stat-label">総応答件数:</span>
          <span class="stat-value">{{ totalResponses }}件</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['export'])

const hasData = computed(() => props.data.length > 0)

const fastestResponse = computed(() => {
  if (!hasData.value) return 0
  return Math.min(...props.data.map(item => item.avgResponseTime))
})

const averageResponse = computed(() => {
  if (!hasData.value) return 0
  const total = props.data.reduce((sum, item) => sum + item.avgResponseTime, 0)
  return Math.round((total / props.data.length) * 10) / 10
})

const totalResponses = computed(() => {
  if (!hasData.value) return 0
  return props.data.reduce((sum, item) => sum + item.totalResponses, 0)
})

const getRankClass = (index) => {
  if (index === 0) return 'rank-1st'
  if (index === 1) return 'rank-2nd'
  if (index === 2) return 'rank-3rd'
  return ''
}

const getRankIcon = (index) => {
  const icons = ['trophy', 'medal', 'medal']
  return icons[index]
}

const getRankIconClass = (index) => {
  const classes = ['rank-icon gold', 'rank-icon silver', 'rank-icon bronze']
  return classes[index]
}

const getResponseBarWidth = (responseTime) => {
  // 24時間を最大値として正規化（応答が早いほどバーが長い）
  const maxTime = 24
  const normalizedTime = Math.min(responseTime, maxTime)
  return Math.max(10, 100 - (normalizedTime / maxTime) * 90)
}

const getResponseSpeedClass = (responseTime) => {
  if (responseTime <= 2) return 'speed-excellent'
  if (responseTime <= 6) return 'speed-good'
  if (responseTime <= 12) return 'speed-average'
  return 'speed-slow'
}

const getPerformanceClass = (responseTime) => {
  if (responseTime <= 2) return 'excellent'
  if (responseTime <= 6) return 'good'
  if (responseTime <= 12) return 'average'
  return 'slow'
}

const getPerformanceLabel = (responseTime) => {
  if (responseTime <= 2) return '優秀'
  if (responseTime <= 6) return '良好'
  if (responseTime <= 12) return '普通'
  return '要改善'
}
</script>

<style scoped>
.response-ranking {
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.ranking-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.title-icon {
  color: #3b82f6;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled) {
  background-color: #059669;
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
  flex: 1;
}

.no-data-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.ranking-table-container {
  flex: 1;
  overflow-x: auto;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.ranking-table th {
  background-color: #f8fafc;
  color: #374151;
  font-weight: 600;
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}

.ranking-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.ranking-row:hover {
  background-color: #f8fafc;
}

.rank-1st {
  background-color: #fef3c7;
}

.rank-2nd {
  background-color: #f3f4f6;
}

.rank-3rd {
  background-color: #fde68a;
}

.rank-col { width: 80px; }
.name-col { width: 200px; }
.time-col { width: 120px; }
.responses-col { width: 100px; }
.bar-col { width: 150px; }
.performance-col { width: 100px; }

.rank-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-icon {
  font-size: 1.25rem;
}

.rank-icon.gold {
  color: #f59e0b;
}

.rank-icon.silver {
  color: #6b7280;
}

.rank-icon.bronze {
  color: #d97706;
}

.rank-number {
  font-weight: 600;
  font-size: 1.125rem;
  color: #374151;
}

.franchise-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.franchise-name {
  font-weight: 600;
  color: #1f2937;
}

.franchise-id {
  font-size: 0.75rem;
  color: #6b7280;
}

.time-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}

.time-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: #3b82f6;
}

.time-unit {
  color: #6b7280;
}

.responses-cell {
  text-align: center;
}

.responses-number {
  font-weight: 600;
  color: #1f2937;
}

.responses-unit {
  color: #6b7280;
  margin-left: 0.25rem;
}

.response-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.response-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.speed-excellent {
  background: linear-gradient(90deg, #10b981, #059669);
}

.speed-good {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.speed-average {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.speed-slow {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.performance-cell {
  text-align: center;
}

.performance-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.performance-badge.excellent {
  background-color: #d1fae5;
  color: #065f46;
}

.performance-badge.good {
  background-color: #dbeafe;
  color: #1e40af;
}

.performance-badge.average {
  background-color: #fef3c7;
  color: #92400e;
}

.performance-badge.slow {
  background-color: #fee2e2;
  color: #991b1b;
}

.ranking-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .response-ranking {
    padding: 1rem;
  }

  .ranking-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .ranking-title {
    font-size: 1.25rem;
    justify-content: center;
  }

  .export-btn {
    justify-content: center;
  }

  .ranking-table {
    font-size: 0.75rem;
  }

  .ranking-table th,
  .ranking-table td {
    padding: 0.5rem 0.25rem;
  }

  .franchise-info {
    gap: 0.125rem;
  }

  .franchise-name {
    font-size: 0.75rem;
  }

  .franchise-id {
    font-size: 0.625rem;
  }

  .summary-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>