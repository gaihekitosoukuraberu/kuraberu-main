<template>
  <div class="flag-management-container">
    <!-- ヘッダー -->
    <div class="flag-header">
      <h1 class="flag-title">
        <Icon name="flag" class="title-icon" />
        フラグ管理
      </h1>
      <p class="flag-subtitle">
        加盟店の対応状況と割り当て除外設定
      </p>
    </div>

    <!-- コントロールパネル -->
    <div class="control-panel">
      <div class="filter-section">
        <div class="filter-group">
          <label for="statusFilter">ステータス:</label>
          <select id="statusFilter" v-model="selectedStatus" @change="applyFilters">
            <option value="">すべて</option>
            <option 
              v-for="option in flagStatusOptions" 
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="excludedFilter">割り当て除外:</label>
          <select id="excludedFilter" v-model="selectedExcluded" @change="applyFilters">
            <option value="">すべて</option>
            <option value="true">除外中</option>
            <option value="false">対象</option>
          </select>
        </div>

        <div class="search-group">
          <Icon name="search" class="search-icon" />
          <input
            type="text"
            placeholder="加盟店名で検索..."
            v-model="searchQuery"
            @input="applyFilters"
            class="search-input"
          />
        </div>
      </div>
      
      <div class="action-buttons">
        <button 
          class="refresh-btn"
          @click="refreshFlags"
          :disabled="loading"
        >
          <Icon name="refresh" :class="{ rotating: loading }" />
          更新
        </button>
        
        <button 
          class="bulk-action-btn"
          @click="showBulkModal = true"
          :disabled="loading || selectedFlags.length === 0"
        >
          <Icon name="edit" />
          一括操作 ({{ selectedFlags.length }})
        </button>
        
        <button 
          class="export-btn"
          @click="handleExport"
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
        title="総加盟店数"
        :value="flagStats.total"
        icon="building"
        color="blue"
      />
      <StatsCard
        title="アクティブ"
        :value="flagStats.active"
        icon="check-circle"
        color="green"
      />
      <StatsCard
        title="非アクティブ"
        :value="flagStats.inactive"
        icon="x-circle"
        color="red"
      />
      <StatsCard
        title="稼働率"
        :value="`${flagStats.activeRate}%`"
        icon="percentage"
        color="purple"
      />
    </div>

    <!-- エラー表示 -->
    <ErrorAlert 
      v-if="error && !loading"
      :message="error"
      @close="clearError"
    />

    <!-- フラグ一覧 -->
    <div class="flags-content">
      <!-- ローディング表示 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>フラグデータを読み込み中...</p>
      </div>

      <!-- フラグテーブル -->
      <div v-else class="flags-table-container">
        <FlagTable
          :flags="filteredFlags"
          :loading="loading"
          :selected="selectedFlags"
          @update-flag="handleUpdateFlag"
          @selection-change="selectedFlags = $event"
          @view-history="handleViewHistory"
        />
      </div>
    </div>

    <!-- 一括操作モーダル -->
    <BulkActionModal
      v-if="showBulkModal"
      :selected-count="selectedFlags.length"
      @bulk-update="handleBulkUpdate"
      @close="showBulkModal = false"
    />

    <!-- フラグ履歴モーダル -->
    <FlagHistoryModal
      v-if="showHistoryModal"
      :franchisee-id="selectedFranchiseeId"
      :franchisee-name="selectedFranchiseeName"
      @close="showHistoryModal = false"
    />

    <!-- フラグ更新モーダル -->
    <FlagUpdateModal
      v-if="showUpdateModal"
      :flag="selectedFlag"
      @update="handleUpdateFlag"
      @close="showUpdateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useFlagStore } from '@/stores/flags'
import Icon from '@/components/common/Icon.vue'
import StatsCard from '@/components/ranking/StatsCard.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import FlagTable from '@/components/flags/FlagTable.vue'
import BulkActionModal from '@/components/flags/BulkActionModal.vue'
import FlagHistoryModal from '@/components/flags/FlagHistoryModal.vue'
import FlagUpdateModal from '@/components/flags/FlagUpdateModal.vue'

// Store
const flagStore = useFlagStore()

// Reactive state
const selectedStatus = ref('')
const selectedExcluded = ref('')
const searchQuery = ref('')
const selectedFlags = ref([])
const showBulkModal = ref(false)
const showHistoryModal = ref(false)
const showUpdateModal = ref(false)
const selectedFranchiseeId = ref('')
const selectedFranchiseeName = ref('')
const _selectedFlag = ref(null)

// Computed
const {
  flags,
  loading,
  error,
  flagStats,
  flagStatusOptions
} = flagStore

const hasData = computed(() => flags.length > 0)

const filteredFlags = computed(() => {
  let filtered = [...flags]

  // ステータスフィルタ
  if (selectedStatus.value) {
    filtered = filtered.filter(flag => flag.flagStatus === selectedStatus.value)
  }

  // 除外フィルタ
  if (selectedExcluded.value !== '') {
    const isExcluded = selectedExcluded.value === 'true'
    filtered = filtered.filter(flag => flag.excludedFromAssignment === isExcluded)
  }

  // 検索フィルタ
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    filtered = filtered.filter(flag => 
      flag.franchiseName.toLowerCase().includes(query) ||
      flag.franchiseeId.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Methods
const applyFilters = () => {
  // フィルタ適用時に選択をクリア
  selectedFlags.value = []
}

const refreshFlags = async () => {
  try {
    await flagStore.refreshFlags()
    selectedFlags.value = []
  } catch (err) {
    console.error('Refresh error:', err)
  }
}

const handleUpdateFlag = async (_flagUpdate) => {
  try {
    await flagStore.updateFranchiseeFlag(
      _flagUpdate.franchiseeId,
      _flagUpdate.flagStatus,
      _flagUpdate.reason,
      _flagUpdate.options || {}
    )
    showUpdateModal.value = false
    _selectedFlag.value = null
  } catch (err) {
    console.error('Flag update error:', err)
  }
}

const handleBulkUpdate = async (updateData) => {
  try {
    const updates = selectedFlags.value.map(flagId => {
      return {
        franchiseeId: flagId,
        flagStatus: updateData.flagStatus,
        reason: updateData.reason
      }
    })

    await flagStore.bulkUpdateFlags(updates)
    selectedFlags.value = []
    showBulkModal.value = false
  } catch (err) {
    console.error('Bulk update error:', err)
  }
}

const handleViewHistory = (franchiseeId, franchiseeName) => {
  selectedFranchiseeId.value = franchiseeId
  selectedFranchiseeName.value = franchiseeName
  showHistoryModal.value = true
}

const handleExport = async () => {
  try {
    await flagStore.exportFlagData()
  } catch (err) {
    console.error('Export error:', err)
  }
}

const clearError = () => {
  flagStore.clearError()
}

// Lifecycle
onMounted(async () => {
  try {
    if (flagStore.shouldRefresh()) {
      await flagStore.fetchFranchiseeFlags()
    }
  } catch (err) {
    console.error('Initial load error:', err)
  }
})

// Watchers
watch(selectedStatus, () => {
  if (error) {
    clearError()
  }
})
</script>

<style scoped>
.flag-management-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  background-color: #f8fafc;
}

.flag-header {
  text-align: center;
  margin-bottom: 2rem;
}

.flag-title {
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
  color: #ef4444;
}

.flag-subtitle {
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
  gap: 2rem;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 160px;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.filter-group select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  flex: 1;
}

.filter-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-group {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.refresh-btn,
.bulk-action-btn,
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
  white-space: nowrap;
}

.refresh-btn {
  background-color: #3b82f6;
  color: white;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.bulk-action-btn {
  background-color: #7c3aed;
  color: white;
}

.bulk-action-btn:hover:not(:disabled) {
  background-color: #6d28d9;
  transform: translateY(-1px);
}

.export-btn {
  background-color: #10b981;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background-color: #059669;
  transform: translateY(-1px);
}

.refresh-btn:disabled,
.bulk-action-btn:disabled,
.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
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

.flags-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 600px;
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

.flags-table-container {
  height: 100%;
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .control-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .flag-management-container {
    padding: 1rem;
  }

  .flag-title {
    font-size: 2rem;
  }

  .filter-group {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>