<template>
  <div class="franchise-management">
    <!-- ページヘッダー -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="page-icon">🏢</span>
        加盟店管理
      </h1>
      <p class="page-description">
        加盟店の管理、サポート、および加盟店視点での画面確認を行います
      </p>
    </div>

    <!-- 統計カード -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <h3 class="stat-value">{{ franchiseStats.total }}</h3>
          <p class="stat-label">総加盟店数</p>
        </div>
      </div>
      <div class="stat-card active">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <h3 class="stat-value">{{ franchiseStats.active }}</h3>
          <p class="stat-label">アクティブ</p>
        </div>
      </div>
      <div class="stat-card inactive">
        <div class="stat-icon">⏸️</div>
        <div class="stat-content">
          <h3 class="stat-value">{{ franchiseStats.inactive }}</h3>
          <p class="stat-label">非アクティブ</p>
        </div>
      </div>
      <div class="stat-card support">
        <div class="stat-icon">🛠️</div>
        <div class="stat-content">
          <h3 class="stat-value">{{ franchiseStats.needsSupport }}</h3>
          <p class="stat-label">サポート要請中</p>
        </div>
      </div>
    </div>

    <!-- 管理者用クイックアクション -->
    <div class="quick-actions">
      <div class="section-header">
        <h2 class="section-title">🚀 クイックアクション</h2>
      </div>
      <div class="action-cards">
        <div class="action-card secondary" @click="generateAdminToken">
          <div class="action-icon">🔑</div>
          <div class="action-content">
            <h3 class="action-title">管理者トークン生成</h3>
            <p class="action-description">一時的な管理者アクセス用トークンを発行</p>
          </div>
          <div class="action-button">
            <span class="button-text">トークン生成</span>
            <span class="button-icon">⚡</span>
          </div>
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
        </select>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="加盟店名で検索..." 
          class="search-input"
        >
      </div>

      <!-- 加盟店テーブル -->
      <div class="table-container">
        <table class="franchise-table">
          <thead>
            <tr>
              <th>ステータス</th>
              <th>加盟店名</th>
              <th>加盟店ID</th>
              <th>最終ログイン</th>
              <th>案件数</th>
              <th>アクション</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="franchise in filteredFranchises" :key="franchise.id" class="franchise-row">
              <td>
                <span :class="['status-badge', franchise.status]">
                  {{ getStatusLabel(franchise.status) }}
                </span>
              </td>
              <td class="franchise-name">
                <div class="name-cell">
                  <strong>{{ franchise.name }}</strong>
                  <span class="franchise-location">{{ franchise.location }}</span>
                </div>
              </td>
              <td class="franchise-id">{{ franchise.id }}</td>
              <td class="last-login">
                <time :datetime="franchise.lastLogin">
                  {{ formatDate(franchise.lastLogin) }}
                </time>
              </td>
              <td class="case-count">
                <span class="count-badge">{{ franchise.activeCases }}</span>
              </td>
              <td class="actions">
                <button 
                  @click="showFranchiseDetails(franchise)"
                  class="btn btn-outline btn-sm"
                  title="詳細情報を表示"
                >
                  <span class="btn-icon">ℹ️</span>
                  詳細
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 管理者トークン表示モーダル -->
    <div v-if="showTokenModal" class="modal-overlay" @click="closeTokenModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">🔑 管理者トークン</h3>
          <button @click="closeTokenModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="token-info">
            このトークンは1時間有効です。加盟店画面へのアクセスに使用されます。
          </p>
          <div class="token-display">
            <code class="token-code">{{ generatedToken }}</code>
            <button @click="copyToken" class="btn btn-outline btn-sm">
              📋 コピー
            </button>
          </div>
          <div class="token-usage">
            <h4>使用方法:</h4>
            <p>加盟店画面のURLに <code>?admin_token={{ generatedToken }}</code> を付加</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">🔄</div>
      <p class="loading-text">データを読み込んでいます...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// リアクティブデータ
const isLoading = ref(false)
const statusFilter = ref('')
const searchQuery = ref('')
const showTokenModal = ref(false)
const generatedToken = ref('')

// 統計データ
const franchiseStats = ref({
  total: 12,
  active: 8,
  inactive: 3,
  needsSupport: 1
})

// 加盟店データ（モック）
const franchises = ref([
  {
    id: 'FRANCHISE_001',
    name: '東京外壁塗装',
    location: '東京都渋谷区',
    status: 'active',
    lastLogin: '2024-06-05T10:30:00Z',
    activeCases: 5
  },
  {
    id: 'FRANCHISE_002', 
    name: '関西リフォーム',
    location: '大阪府大阪市',
    status: 'active',
    lastLogin: '2024-06-05T09:15:00Z',
    activeCases: 3
  },
  {
    id: 'FRANCHISE_003',
    name: '神奈川塗装工業',
    location: '神奈川県横浜市', 
    status: 'support',
    lastLogin: '2024-06-04T16:45:00Z',
    activeCases: 7
  },
  {
    id: 'FRANCHISE_004',
    name: '埼玉ホームペイント',
    location: '埼玉県さいたま市',
    status: 'inactive',
    lastLogin: '2024-06-01T14:20:00Z',
    activeCases: 0
  }
])

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

const generateAdminToken = () => {
  generatedToken.value = generateTokenString()
  showTokenModal.value = true
}

const generateTokenString = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `admin_${timestamp}_${random}`
}

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(generatedToken.value)
    alert('トークンをクリップボードにコピーしました！')
  } catch (err) {
    console.error('クリップボードへのコピーに失敗:', err)
    // フォールバック: テキスト選択
    const textArea = document.createElement('textarea')
    textArea.value = generatedToken.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('トークンをクリップボードにコピーしました！')
  }
}

const closeTokenModal = () => {
  showTokenModal.value = false
  generatedToken.value = ''
}

const refreshFranchiseList = async () => {
  isLoading.value = true
  try {
    // API呼び出し（モック）
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('📊 加盟店リストを更新しました')
  } finally {
    isLoading.value = false
  }
}

const showFranchiseDetails = (franchise) => {
  alert(`${franchise.name}の詳細情報\n\nID: ${franchise.id}\n場所: ${franchise.location}\nステータス: ${getStatusLabel(franchise.status)}\nアクティブ案件: ${franchise.activeCases}件`)
}

const getStatusLabel = (status) => {
  const labels = {
    active: 'アクティブ',
    inactive: '非アクティブ', 
    support: 'サポート要請中'
  }
  return labels[status] || status
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

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
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .action-cards {
    grid-template-columns: 1fr;
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
}
</style>