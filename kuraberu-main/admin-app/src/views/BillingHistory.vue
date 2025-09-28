<template>
  <div class="billing-history">
    <!-- ページヘッダー -->
    <div class="page-header">
      <h1 class="page-title">請求履歴一覧</h1>
      <div class="header-actions">
        <button 
          class="refresh-btn"
          @click="refreshData"
          :disabled="isLoading"
        >
          <i class="icon-refresh" :class="{ 'spinning': isLoading }"></i>
          更新
        </button>
      </div>
    </div>

    <!-- フィルター・検索エリア -->
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-group">
          <label for="status-filter">ステータス</label>
          <select 
            id="status-filter"
            v-model="filters.status"
            @change="applyFilters"
          >
            <option value="">すべて</option>
            <option value="未払い">未払い</option>
            <option value="支払い済み">支払い済み</option>
            <option value="期限切れ">期限切れ</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="period-filter">期間</label>
          <select 
            id="period-filter"
            v-model="filters.period"
            @change="applyFilters"
          >
            <option value="">すべて</option>
            <option value="current-month">今月</option>
            <option value="last-month">先月</option>
            <option value="last-3-months">直近3ヶ月</option>
            <option value="last-6-months">直近6ヶ月</option>
          </select>
        </div>

        <div class="filter-group search-group">
          <label for="search-input">検索</label>
          <input
            id="search-input"
            type="text"
            v-model="filters.search"
            @input="debounceSearch"
            placeholder="請求ID、説明で検索"
            class="search-input"
          >
        </div>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="error-alert">
      <div class="error-content">
        <i class="icon-error"></i>
        <span>{{ error }}</span>
        <button @click="clearError" class="error-close">×</button>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>請求履歴を読み込み中...</p>
    </div>

    <!-- データテーブル -->
    <div v-else-if="!error" class="table-container">
      <div class="table-header">
        <div class="table-info">
          <span class="record-count">{{ filteredBillings.length }}件の請求履歴</span>
        </div>
        <div class="table-controls">
          <button 
            class="export-btn"
            @click="exportData"
            :disabled="filteredBillings.length === 0"
          >
            <i class="icon-download"></i>
            エクスポート
          </button>
        </div>
      </div>

      <!-- レスポンシブテーブル -->
      <div class="responsive-table">
        <table class="billing-table">
          <thead>
            <tr>
              <th @click="setSortColumn('billingId')" class="sortable">
                請求ID
                <i class="sort-indicator" :class="getSortClass('billingId')"></i>
              </th>
              <th @click="setSortColumn('billingDate')" class="sortable">
                請求日
                <i class="sort-indicator" :class="getSortClass('billingDate')"></i>
              </th>
              <th @click="setSortColumn('amount')" class="sortable">
                請求金額
                <i class="sort-indicator" :class="getSortClass('amount')"></i>
              </th>
              <th @click="setSortColumn('paymentDueDate')" class="sortable">
                支払期限
                <i class="sort-indicator" :class="getSortClass('paymentDueDate')"></i>
              </th>
              <th @click="setSortColumn('paymentStatus')" class="sortable">
                ステータス
                <i class="sort-indicator" :class="getSortClass('paymentStatus')"></i>
              </th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="billing in sortedBillings" 
              :key="billing.billingId"
              :class="{ 'overdue': billing.isOverdue }"
            >
              <td class="billing-id-cell">
                {{ billing.billingId }}
              </td>
              <td class="date-cell">
                {{ formatDate(billing.billingDate) }}
              </td>
              <td class="amount-cell">
                ¥{{ formatNumber(billing.amount) }}
              </td>
              <td class="date-cell">
                {{ formatDate(billing.paymentDueDate) }}
                <span v-if="billing.isOverdue" class="overdue-badge">期限切れ</span>
              </td>
              <td class="status-cell">
                <span class="status-badge" :class="getStatusClass(billing.paymentStatus)">
                  {{ billing.paymentStatus }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button 
                    class="detail-btn"
                    @click="viewDetail(billing)"
                    title="詳細表示"
                  >
                    <i class="icon-detail"></i>
                  </button>
                  <button 
                    v-if="billing.paymentStatus === '未払い'"
                    class="payment-btn"
                    @click="processPayment(billing)"
                    title="支払い処理"
                  >
                    <i class="icon-payment"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 空状態 -->
        <div v-if="filteredBillings.length === 0" class="empty-state">
          <div class="empty-content">
            <i class="icon-empty"></i>
            <h3>請求履歴がありません</h3>
            <p>現在の条件に該当する請求履歴が見つかりませんでした。</p>
            <button @click="clearFilters" class="clear-filters-btn">
              フィルターをクリア
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- モバイル対応カードビュー -->
    <div v-if="!isLoading && !error && isMobile" class="mobile-cards">
      <div 
        v-for="billing in sortedBillings"
        :key="billing.billingId"
        class="billing-card"
        :class="{ 'overdue': billing.isOverdue }"
      >
        <div class="card-header">
          <span class="billing-id">{{ billing.billingId }}</span>
          <span class="status-badge" :class="getStatusClass(billing.paymentStatus)">
            {{ billing.paymentStatus }}
          </span>
        </div>
        <div class="card-content">
          <div class="card-row">
            <span class="label">請求日:</span>
            <span class="value">{{ formatDate(billing.billingDate) }}</span>
          </div>
          <div class="card-row">
            <span class="label">金額:</span>
            <span class="value amount">¥{{ formatNumber(billing.amount) }}</span>
          </div>
          <div class="card-row">
            <span class="label">支払期限:</span>
            <span class="value">
              {{ formatDate(billing.paymentDueDate) }}
              <span v-if="billing.isOverdue" class="overdue-badge">期限切れ</span>
            </span>
          </div>
        </div>
        <div class="card-actions">
          <button class="detail-btn" @click="viewDetail(billing)">
            詳細表示
          </button>
          <button 
            v-if="billing.paymentStatus === '未払い'"
            class="payment-btn"
            @click="processPayment(billing)"
          >
            支払い処理
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBillingStore } from '@/stores/billing'
import { useBreakpoints } from '@/composables/useBreakpoints'
import { debounce } from '@/utils/debounce'

// ストア
const billingStore = useBillingStore()

// レスポンシブ
const { isMobile } = useBreakpoints()

// リアクティブデータ
const isLoading = ref(false)
const error = ref('')
const filters = ref({
  status: '',
  period: '',
  search: ''
})
const sortColumn = ref('billingDate')
const sortDirection = ref('desc')

// フィルター処理
const filteredBillings = computed(() => {
  let result = billingStore.billings

  // ステータスフィルター
  if (filters.value.status) {
    result = result.filter(billing => billing.paymentStatus === filters.value.status)
  }

  // 期間フィルター
  if (filters.value.period) {
    const now = new Date()
    let startDate

    switch (filters.value.period) {
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        break
      case 'last-3-months':
        startDate = new Date(now.setMonth(now.getMonth() - 3))
        break
      case 'last-6-months':
        startDate = new Date(now.setMonth(now.getMonth() - 6))
        break
    }

    if (startDate) {
      result = result.filter(billing => new Date(billing.billingDate) >= startDate)
    }
  }

  // 検索フィルター
  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase()
    result = result.filter(billing => 
      billing.billingId.toLowerCase().includes(searchTerm) ||
      billing.description.toLowerCase().includes(searchTerm)
    )
  }

  return result
})

// ソート処理
const sortedBillings = computed(() => {
  return [...filteredBillings.value].sort((a, b) => {
    let aVal = a[sortColumn.value]
    let bVal = b[sortColumn.value]

    // 日付と数値の特別処理
    if (sortColumn.value.includes('Date')) {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    } else if (sortColumn.value === 'amount') {
      aVal = Number(aVal)
      bVal = Number(bVal)
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
})

// メソッド
const loadBillingHistory = async () => {
  try {
    isLoading.value = true
    error.value = ''
    await billingStore.fetchBillingHistory()
  } catch (err) {
    error.value = err.message || '請求履歴の取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

const refreshData = () => {
  loadBillingHistory()
}

const applyFilters = () => {
  // フィルターが変更された際の処理
}

const debounceSearch = debounce(() => {
  applyFilters()
}, 300)

const setSortColumn = (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const getSortClass = (column) => {
  if (sortColumn.value !== column) return ''
  return sortDirection.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

const getStatusClass = (status) => {
  return {
    'status-paid': status === '支払い済み',
    'status-unpaid': status === '未払い',
    'status-overdue': status === '期限切れ'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('ja-JP')
}

const formatNumber = (num) => {
  return Number(num).toLocaleString('ja-JP')
}

const clearFilters = () => {
  filters.value = {
    status: '',
    period: '',
    search: ''
  }
}

const clearError = () => {
  error.value = ''
}

const viewDetail = (billing) => {
  // 詳細表示モーダルを開く
  billingStore.setSelectedBilling(billing)
  // TODO: モーダル表示ロジック
}

const processPayment = () => {
  // 支払い処理
  // TODO: 支払い処理ロジック
}

const exportData = () => {
  // データエクスポート
  // TODO: CSV/Excel エクスポート
}

// ライフサイクル
onMounted(() => {
  loadBillingHistory()
})
</script>

<style scoped>
.billing-history {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #e9ecef;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-refresh.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.filter-section {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.search-group {
  flex: 1;
  min-width: 200px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.filter-group select,
.search-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.error-alert {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #721c24;
}

.error-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #721c24;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.table-container {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.record-count {
  font-size: 14px;
  color: #6c757d;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.export-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.responsive-table {
  overflow-x: auto;
}

.billing-table {
  width: 100%;
  border-collapse: collapse;
}

.billing-table th,
.billing-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.billing-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.billing-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.billing-table th.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  margin-left: 4px;
  opacity: 0.5;
}

.sort-indicator.sort-asc::before {
  content: '↑';
  opacity: 1;
}

.sort-indicator.sort-desc::before {
  content: '↓';
  opacity: 1;
}

.billing-table tr.overdue {
  background: #fff5f5;
}

.amount-cell {
  font-weight: 600;
  text-align: right;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-paid {
  background: #d4edda;
  color: #155724;
}

.status-badge.status-unpaid {
  background: #fff3cd;
  color: #856404;
}

.status-badge.status-overdue {
  background: #f8d7da;
  color: #721c24;
}

.overdue-badge {
  background: #dc3545;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  margin-left: 4px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.detail-btn,
.payment-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.detail-btn {
  background: #f8f9fa;
  color: #495057;
}

.payment-btn {
  background: #28a745;
  color: white;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-content h3 {
  margin: 16px 0 8px;
  color: #495057;
}

.empty-content p {
  color: #6c757d;
  margin-bottom: 20px;
}

.clear-filters-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* モバイル対応 */
.mobile-cards {
  display: none;
}

@media (max-width: 768px) {
  .billing-history {
    padding: 16px;
  }
  
  .table-container {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
  
  .billing-card {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }
  
  .billing-card.overdue {
    border-color: #dc3545;
    background: #fff5f5;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .billing-id {
    font-weight: 600;
    color: #495057;
  }
  
  .card-content {
    margin-bottom: 16px;
  }
  
  .card-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .card-row .label {
    color: #6c757d;
    font-size: 14px;
  }
  
  .card-row .value {
    font-weight: 500;
  }
  
  .card-row .value.amount {
    color: #28a745;
  }
  
  .card-actions {
    display: flex;
    gap: 8px;
  }
  
  .card-actions button {
    flex: 1;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-group {
    min-width: auto;
  }
}
</style>