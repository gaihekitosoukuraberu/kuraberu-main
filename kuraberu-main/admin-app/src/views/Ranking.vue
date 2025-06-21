<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="ranking-container">
    <!-- ヘッダー -->
    <div class="ranking-header">
      <h1 class="ranking-title">
        <Icon name="trophy" class="title-icon" />
        ランキング
      </h1>
      <p class="ranking-subtitle">
        加盟店のパフォーマンス指標を可視化
      </p>
    </div>

    <!-- コントロールパネル -->
    <div class="control-panel">
      <div class="period-selector">
        <label for="period">集計期間:</label>
        <select id="period" v-model="selectedPeriod" @change="handlePeriodChange">
          <option value="1">過去1ヶ月</option>
          <option value="3">過去3ヶ月</option>
          <option value="6">過去6ヶ月</option>
          <option value="12">過去12ヶ月</option>
        </select>
      </div>
      
      <div class="action-buttons">
        <button 
          class="refresh-btn"
          @click="refreshRankings"
          :disabled="loading"
        >
          <Icon name="refresh" :class="{ rotating: loading }" />
          更新
        </button>
        
        <button 
          class="export-btn"
          @click="showExportModal = true"
          :disabled="loading || !hasData"
        >
          <Icon name="download" />
          エクスポート
        </button>
      </div>
    </div>

    <!-- 統計サマリー -->
    <div class="stats-grid" v-if="!loading">
      <StatsCard
        title="加盟店数"
        :value="rankingStats.totalFranchisees"
        icon="building"
        color="blue"
      />
      <StatsCard
        title="平均成約率"
        :value="`${rankingStats.averageSuccessRate}%`"
        icon="percentage"
        color="green"
      />
      <StatsCard
        title="平均応答時間"
        :value="`${rankingStats.averageResponseTime}時間`"
        icon="clock"
        color="orange"
      />
      <StatsCard
        title="総売上"
        :value="formatCurrency(rankingStats.totalSales)"
        icon="yen-sign"
        color="purple"
      />
    </div>

    <!-- エラー表示 -->
    <ErrorAlert 
      v-if="error && !loading"
      :message="error"
      @close="clearError"
    />

    <!-- タブナビゲーション -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <Icon :name="tab.icon" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ランキングコンテンツ -->
    <div class="ranking-content">
      <!-- ローディング表示 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>ランキングデータを読み込み中...</p>
      </div>

      <!-- 成約率ランキング -->
      <div v-else-if="activeTab === 'success-rate'" class="ranking-section">
        <SuccessRateRanking 
          :data="successRateRanking"
          :loading="loading"
          @export="handleExport"
        />
      </div>

      <!-- 応答速度ランキング -->
      <div v-else-if="activeTab === 'response'" class="ranking-section">
        <ResponseRanking 
          :data="responseRanking"
          :loading="loading"
          @export="handleExport"
        />
      </div>

      <!-- 売上ランキング -->
      <div v-else-if="activeTab === 'sales'" class="ranking-section">
        <SalesRanking 
          :data="salesRanking"
          :loading="loading"
          @export="handleExport"
        />
      </div>
    </div>

    <!-- エクスポートモーダル -->
    <ExportModal
      v-if="showExportModal"
      :type="activeTab"
      @export="handleExport"
      @close="showExportModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRankingStore } from '@/stores/ranking'
import Icon from '@/components/common/Icon.vue'
import StatsCard from '@/components/ranking/StatsCard.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import SuccessRateRanking from '@/components/ranking/SuccessRateRanking.vue'
import ResponseRanking from '@/components/ranking/ResponseRanking.vue'
import SalesRanking from '@/components/ranking/SalesRanking.vue'
import ExportModal from '@/components/ranking/ExportModal.vue'

// Store
const rankingStore = useRankingStore()

// Reactive state
const selectedPeriod = ref(3)
const activeTab = ref('success-rate')
const showExportModal = ref(false)

// Computed
const {
  successRateRanking,
  responseRanking,
  salesRanking,
  loading,
  error,
  rankingStats
} = rankingStore

const hasData = computed(() => {
  switch (activeTab.value) {
    case 'success-rate':
      return successRateRanking.length > 0
    case 'response':
      return responseRanking.length > 0
    case 'sales':
      return salesRanking.length > 0
    default:
      return false
  }
})

const tabs = computed(() => [
  {
    id: 'success-rate',
    label: '成約率',
    icon: 'trophy',
    count: successRateRanking.length
  },
  {
    id: 'response',
    label: '応答速度',
    icon: 'clock',
    count: responseRanking.length
  },
  {
    id: 'sales',
    label: '売上',
    icon: 'yen-sign',
    count: salesRanking.length
  }
])

// Methods
const handlePeriodChange = async () => {
  try {
    await rankingStore.fetchAllRankings(selectedPeriod.value)
  } catch (err) {
    console.error('Period change error:', err)
  }
}

const refreshRankings = async () => {
  try {
    await rankingStore.refreshRankings(selectedPeriod.value)
  } catch (err) {
    console.error('Refresh error:', err)
  }
}

const handleExport = async (type, format = 'csv') => {
  try {
    await rankingStore.exportRankingData(type, format)
    showExportModal.value = false
  } catch (err) {
    console.error('Export error:', err)
  }
}

const clearError = () => {
  rankingStore.clearError()
}

const formatCurrency = (amount) => {
  if (!amount) return '¥0'
  
  // 1億以上の場合は億円単位で表示
  if (amount >= 100000000) {
    const okuAmount = amount / 100000000
    return `¥${okuAmount.toFixed(1)}億円`
  }
  
  // 1万以上の場合は万円単位で表示
  if (amount >= 10000) {
    const manAmount = amount / 10000
    return `¥${manAmount.toFixed(0)}万円`
  }
  
  // 1万未満の場合はそのまま表示
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0
  }).format(amount)
}

// Lifecycle
onMounted(async () => {
  try {
    if (rankingStore.shouldRefresh()) {
      await rankingStore.fetchAllRankings(selectedPeriod.value)
    }
  } catch (err) {
    console.error('Initial load error:', err)
  }
})

// Watchers
watch(activeTab, () => {
  // タブ切り替え時にエラーをクリア
  if (error) {
    clearError()
  }
})
</script>

<style scoped>
.ranking-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background-color: #f8fafc;
}

.ranking-header {
  text-align: center;
  margin-bottom: 2rem;
}

.ranking-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.title-icon {
  color: #f59e0b;
}

.ranking-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0.5rem 0 0 0;
}

.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.period-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.period-selector label {
  font-weight: 600;
  color: #374151;
}

.period-selector select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.period-selector select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.refresh-btn,
.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn {
  background-color: #3b82f6;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-btn {
  background-color: #10b981;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background-color: #059669;
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.tabs-container {
  margin-bottom: 2rem;
}

.tabs {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.tab:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.tab.active {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.25);
}

.ranking-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 500px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #6b7280;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.ranking-section {
  height: 100%;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .ranking-container {
    padding: 1rem;
  }

  .ranking-title {
    font-size: 2rem;
  }

  .control-panel {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    flex-direction: column;
  }

  .tab {
    justify-content: flex-start;
  }
}
</style>