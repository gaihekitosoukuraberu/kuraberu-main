<template>
  <div class="franchise-management">
    <!-- ページヘッダー -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="page-icon">🏢</span>
        加盟店管理
      </h1>
      <p class="page-description">
        加盟店の管理、審査、サポートを行います
      </p>
    </div>

    <!-- コンパクト統計カード -->
    <div class="stats-compact">
      <div class="stat-card-compact">
        <div class="stat-icon-compact">👥</div>
        <div class="stat-content-compact">
          <span class="stat-value-compact">{{ franchiseStats.total }}</span>
          <span class="stat-label-compact">総加盟店数</span>
        </div>
      </div>
      <div class="stat-card-compact active">
        <div class="stat-icon-compact">✅</div>
        <div class="stat-content-compact">
          <span class="stat-value-compact">{{ franchiseStats.active }}</span>
          <span class="stat-label-compact">アクティブ</span>
        </div>
      </div>
      <div class="stat-card-compact inactive">
        <div class="stat-icon-compact">⏸️</div>
        <div class="stat-content-compact">
          <span class="stat-value-compact">{{ franchiseStats.inactive }}</span>
          <span class="stat-label-compact">非アクティブ</span>
        </div>
      </div>
      <div class="stat-card-compact support">
        <div class="stat-icon-compact">🛠️</div>
        <div class="stat-content-compact">
          <span class="stat-value-compact">{{ franchiseStats.needsSupport }}</span>
          <span class="stat-label-compact">サポート要請中</span>
        </div>
      </div>
      <div class="stat-card-compact pending">
        <div class="stat-icon-compact">⏳</div>
        <div class="stat-content-compact">
          <span class="stat-value-compact">{{ franchiseStats.pendingReview }}</span>
          <span class="stat-label-compact">審査待ち</span>
        </div>
      </div>
    </div>

    <!-- 加盟店一覧 -->
    <div class="franchise-list">
      <div class="section-header">
        <h2 class="section-title">📋 加盟店一覧</h2>
        <div class="section-actions">
          <button @click="refreshFranchiseList" class="btn btn-outline" :disabled="isLoading">
            <span v-if="isLoading">🔄</span>
            <span v-else>↻</span>
            更新
          </button>
        </div>
      </div>

      <!-- フィルター -->
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">すべてのステータス</option>
          <option value="active">アクティブ</option>
          <option value="inactive">非アクティブ</option>
          <option value="support">サポート要請中</option>
          <option value="pending_review">審査待ち</option>
        </select>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="加盟店名で検索..." 
          class="search-input"
        >
      </div>

      <!-- 加盟店カード表示（全デバイス対応） -->
      <div class="franchise-cards">
        <div v-for="franchise in filteredFranchises" :key="franchise.id" class="franchise-card">
          <div class="card-content">
            <div class="franchise-main">
              <div class="franchise-info">
                <h3 class="franchise-name">{{ franchise.name }}</h3>
                <div class="franchise-meta">
                  <span class="franchise-id">{{ franchise.id }}</span>
                  <span class="separator">•</span>
                  <span class="last-login">{{ formatDate(franchise.lastLogin) }}</span>
                  <span class="separator">•</span>
                  <span class="case-count">{{ franchise.activeCases }}件</span>
                </div>
              </div>
              <span :class="['status-badge', franchise.status]">
                {{ getStatusLabel(franchise.status) }}
              </span>
            </div>
            
            <div class="card-actions">
              <!-- 審査待ちの場合 -->
              <div v-if="franchise.status === 'pending_review'" class="action-group">
                <button 
                  @click="changeStatus(franchise, 'active')"
                  class="btn btn-success btn-compact"
                  :disabled="processingAction[franchise.id] === 'active'"
                >
                  <span v-if="processingAction[franchise.id] === 'active'">⏳</span>
                  <span v-else>✅</span>
                  承認
                </button>
                <button 
                  @click="changeStatus(franchise, 'inactive')"
                  class="btn btn-danger btn-compact"
                  :disabled="processingAction[franchise.id] === 'inactive'"
                >
                  <span v-if="processingAction[franchise.id] === 'inactive'">⏳</span>
                  <span v-else>❌</span>
                  却下
                </button>
              </div>
              <!-- アクティブの場合 -->
              <div v-else-if="franchise.status === 'active'" class="action-group">
                <button 
                  @click="changeStatus(franchise, 'inactive')"
                  class="btn btn-warning btn-compact"
                  :disabled="processingAction[franchise.id] === 'inactive'"
                >
                  <span v-if="processingAction[franchise.id] === 'inactive'">⏳</span>
                  <span v-else>⏸️</span>
                  停止
                </button>
              </div>
              <!-- 非アクティブの場合 -->
              <div v-else-if="franchise.status === 'inactive'" class="action-group">
                <button 
                  @click="changeStatus(franchise, 'active')"
                  class="btn btn-success btn-compact"
                  :disabled="processingAction[franchise.id] === 'active'"
                >
                  <span v-if="processingAction[franchise.id] === 'active'">⏳</span>
                  <span v-else>🔄</span>
                  再承認
                </button>
              </div>
              <!-- 詳細ボタン -->
              <button 
                @click="showFranchiseDetails(franchise)"
                class="btn btn-outline btn-compact"
              >
                ℹ️ 詳細
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- ローディング表示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">🔄</div>
      <p class="loading-text">データを読み込んでいます...</p>
    </div>
    
    <!-- トースト通知 -->
    <transition name="toast">
      <div v-if="showToast" :class="['toast-notification', toastType]">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiService } from '@/services/api'

// リアクティブデータ
const isLoading = ref(false)
const statusFilter = ref('')
const searchQuery = ref('')
const processingAction = ref({}) // 処理中のアクション { franchiseId: action }
const toastMessage = ref('')
const showToast = ref(false)
const toastType = ref('success')


// 統計データ
const franchiseStats = ref({
  total: 0,
  active: 0,
  inactive: 0,
  needsSupport: 0,
  pendingReview: 0
})

// 加盟店データ（実データ）
const franchises = ref([])

// 計算プロパティ
const filteredFranchises = computed(() => {
  let filtered = franchises.value

  // ステータスフィルター
  if (statusFilter.value) {
    filtered = filtered.filter(f => f.status === statusFilter.value)
  }

  // 検索フィルター
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(query) ||
      f.location.toLowerCase().includes(query) ||
      f.id.toLowerCase().includes(query)
    )
  }

  return filtered
})

// メソッド


const refreshFranchiseList = async () => {
  isLoading.value = true
  try {
    // 加盟店一覧取得
    const response = await apiService.post('', {
      action: 'getFranchiseList'
    })
    
    if (response.success) {
      franchises.value = response.data.map(franchise => {
        // スプレッドシートのステータス列（AD列）を直接使用
        let status = 'pending_review' // デフォルト
        
        // ステータス列の値を確認（大文字小文字を考慮）
        const statusValue = String(franchise.status || '').toLowerCase()
        
        if (statusValue === '承認済み' || statusValue === '承認' || statusValue === 'active') {
          status = 'active'
        } else if (statusValue === '却下' || statusValue === '却下済み' || statusValue === 'inactive') {
          status = 'inactive'
        } else if (statusValue === 'サポート要請中' || statusValue === 'support') {
          status = 'support'
        } else if (statusValue === '審査待ち' || statusValue === 'pending' || statusValue === 'pending_review' || statusValue === '') {
          status = 'pending_review'
        }
        
        console.log(`📋 ${franchise.name}: ${franchise.status} → ${status}`)
        
        return {
          id: franchise.id,
          name: franchise.name,
          location: franchise.address,
          status: status,
          lastLogin: franchise.lastLogin || '-',
          activeCases: 0, // 後で案件数APIから取得
          registrationDate: franchise.timestamp,
          representative: franchise.representative,
          phone: franchise.phone,
          email: franchise.billingEmail,
          depositFlag: franchise.depositFlag,
          handicaps: {
            cheap: franchise.handicapCheap || 0,
            review: franchise.handicapReview || 0,
            recommend: franchise.handicapRecommend || 0,
            quality: franchise.handicapQuality || 0
          }
        }
      })
      
      // 統計情報も更新
      await updateStats()
      
      console.log('📊 加盟店リストを更新しました:', franchises.value.length)
    } else {
      throw new Error(response.error || '加盟店一覧の取得に失敗しました')
    }
  } catch (error) {
    console.error('❌ 加盟店リスト更新エラー:', error)
    showToastMessage('加盟店一覧の取得に失敗しました: ' + error.message, 'error')
  } finally {
    isLoading.value = false
  }
}

const showFranchiseDetails = (franchise) => {
  showToastMessage(`${franchise.name}の詳細: ID: ${franchise.id}, ステータス: ${getStatusLabel(franchise.status)}, 案件: ${franchise.activeCases}件`)
}

const getStatusLabel = (status) => {
  const labels = {
    active: 'アクティブ',
    inactive: '非アクティブ', 
    support: 'サポート要請中',
    pending_review: '審査待ち',
    '審査待ち': '審査待ち',
    rejected: '却下済み'
  }
  return labels[status] || status
}

// 統計情報更新
const updateStats = () => {
  // 現在の加盟店データから統計を計算
  const total = franchises.value.length
  const active = franchises.value.filter(f => f.status === 'active').length
  const inactive = franchises.value.filter(f => f.status === 'inactive').length
  const needsSupport = franchises.value.filter(f => f.status === 'support').length
  const pendingReview = franchises.value.filter(f => f.status === 'pending_review').length
  
  franchiseStats.value = {
    total,
    active,
    inactive,
    needsSupport,
    pendingReview
  }
  
  console.log('📊 統計データ更新:', franchiseStats.value)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}


// ステータス変更関数
const changeStatus = async (franchise, newStatus) => {
  console.log('🔄 ステータス変更開始:', franchise.id, newStatus)
  processingAction.value[franchise.id] = newStatus // 処理開始
  console.log('📍 processingAction設定:', processingAction.value)
  
  try {
    const response = await apiService.post('', {
      action: 'updateFranchiseStatus',
      franchiseId: franchise.id,
      status: newStatus,
      reviewer: '管理者',
      comment: `ステータスを${getStatusLabel(newStatus)}に変更`
    })
    
    if (response.success) {
      franchise.status = newStatus
      updateStats()
      showToastMessage(`${franchise.name}のステータスを${getStatusLabel(newStatus)}に変更しました`)
    } else {
      throw new Error(response.error || 'ステータス変更に失敗しました')
    }
  } catch (error) {
    console.error('❌ ステータス変更エラー:', error)
    showToastMessage('ステータス変更に失敗しました: ' + error.message, 'error')
  } finally {
    delete processingAction.value[franchise.id] // 処理終了
  }
}

// トースト通知表示
const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  // 5秒後に自動で消す
  setTimeout(() => {
    showToast.value = false
  }, 5000)
}

// ライフサイクル
onMounted(() => {
  console.log('🏢 加盟店管理ページが読み込まれました')
  refreshFranchiseList()
})
</script>

<style scoped>
.franchise-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.page-header {
  margin-bottom: 32px;
  text-align: center;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.page-icon {
  font-size: 36px;
}

.page-description {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

/* コンパクト統計カードのスタイル */
.stats-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card-compact {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-left: 3px solid #e5e7eb;
}

.stat-card-compact:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.stat-card-compact.active {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

.stat-card-compact.inactive {
  border-left-color: #ef4444;
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}

.stat-card-compact.support {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.stat-card-compact.pending {
  border-left-color: #8b5cf6;
  background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%);
}

.stat-icon-compact {
  font-size: 24px;
  flex-shrink: 0;
}

.stat-content-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value-compact {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label-compact {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* 削除：不要なスタイル */

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.active {
  border-left: 4px solid #10b981;
}

.stat-card.inactive {
  border-left: 4px solid #ef4444;
}

.stat-card.support {
  border-left: 4px solid #f59e0b;
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.stat-label {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.quick-actions {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.action-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
}

.action-card.primary {
  border-left: 4px solid #3b82f6;
}

.action-card.secondary {
  border-left: 4px solid #8b5cf6;
}

.action-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.action-content {
  flex-grow: 1;
}

.action-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.action-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  font-weight: 600;
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}

.search-input {
  flex-grow: 1;
  max-width: 300px;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.franchise-table {
  width: 100%;
  border-collapse: collapse;
}

.franchise-table th {
  background: #f9fafb;
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.franchise-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.franchise-row:hover {
  background: #f9fafb;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.support {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.pending_review {
  background: #ede9fe;
  color: #7c3aed;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.franchise-location {
  font-size: 12px;
  color: #6b7280;
}

.count-badge {
  background: #eff6ff;
  color: #2563eb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.approval-actions,
.status-actions {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  min-width: 60px;
}

.btn-success {
  background-color: #a7f3d0;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.btn-success:hover {
  background-color: #6ee7b7;
  border-color: #34d399;
}

.btn-danger {
  background-color: #fecaca;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.btn-danger:hover {
  background-color: #fca5a5;
  border-color: #f87171;
}

.btn-warning {
  background-color: #f59e0b;
  color: white;
  border: 1px solid #f59e0b;
}

.btn-warning:hover {
  background-color: #d97706;
  border-color: #d97706;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-outline {
  background: transparent;
  color: #6b7280;
  border-color: #d1d5db;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-icon {
  font-size: 14px;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.approval-actions {
  display: flex;
  gap: 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.token-info {
  color: #6b7280;
  margin-bottom: 16px;
}

.token-display {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.token-code {
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  flex-grow: 1;
  word-break: break-all;
}

.token-usage h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  font-size: 32px;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: 16px;
  color: #6b7280;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


@media (max-width: 768px) {
  .franchise-management {
    padding: 16px;
  }
  
  .stats-compact {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters {
    flex-direction: column;
  }
  
  .search-input {
    max-width: none;
  }
  
  .franchise-table {
    font-size: 14px;
  }
  
  .actions {
    flex-direction: column;
  }
  

  .stat-card-compact {
    padding: 12px;
  }
  
  .stat-value-compact {
    font-size: 18px;
  }
}

/* トースト通知のスタイル */
.toast-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #10b981;
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  max-width: 400px;
  font-size: 14px;
  font-weight: 500;
}

.toast-notification.error {
  background-color: #ef4444;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 全デバイス対応カードスタイル */
.franchise-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

@media (max-width: 768px) {
  .franchise-cards {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.franchise-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: box-shadow 0.2s ease;
}

.franchise-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-content {
  padding: 16px;
}

.franchise-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.franchise-info {
  flex: 1;
  min-width: 0;
}

.franchise-name {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.franchise-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.separator {
  color: #d1d5db;
  margin: 0 2px;
}

.franchise-id {
  font-weight: 500;
  color: #4b5563;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 6px;
  flex: 1;
}

.btn-compact {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-compact:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* コンパクトボタンカラー */
.btn-success.btn-compact {
  background-color: #a7f3d0;
  color: #065f46;
}

.btn-success.btn-compact:hover:not(:disabled) {
  background-color: #6ee7b7;
}

.btn-danger.btn-compact {
  background-color: #fecaca;
  color: #991b1b;
}

.btn-danger.btn-compact:hover:not(:disabled) {
  background-color: #fca5a5;
}

.btn-warning.btn-compact {
  background-color: #fed7aa;
  color: #9a3412;
}

.btn-warning.btn-compact:hover:not(:disabled) {
  background-color: #fdba74;
}

.btn-outline.btn-compact {
  background-color: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-outline.btn-compact:hover {
  background-color: #f1f5f9;
}

@media (max-width: 480px) {
  .franchise-main {
    flex-direction: column;
    gap: 8px;
  }
  
  .franchise-meta {
    font-size: 11px;
  }
  
  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-group {
    justify-content: center;
  }
}
</style>