<template>
  <AppLayout>
    <div class="cancel-requests">
      <!-- ヘッダー -->
      <div class="page-header">
        <h2 class="page-title">
          <span class="page-icon">📋</span>
          キャンセル申請管理
        </h2>
        <p class="page-subtitle">
          加盟店からのキャンセル申請を確認・承認処理します。
        </p>
      </div>

      <!-- フィルター -->
      <div class="filter-section">
        <div class="filter-group">
          <label class="filter-label">申請状況:</label>
          <select v-model="statusFilter" class="filter-select">
            <option value="">全て</option>
            <option value="pending">承認待ち</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">申請者:</label>
          <input 
            v-model="searchText" 
            type="text" 
            class="filter-input" 
            placeholder="加盟店名、担当者名で検索..."
          />
        </div>
        
        <div class="filter-group">
          <label class="filter-label">期間:</label>
          <input v-model="dateFrom" type="date" class="filter-date" />
          <span class="date-separator">〜</span>
          <input v-model="dateTo" type="date" class="filter-date" />
        </div>
      </div>

      <!-- 申請一覧 -->
      <div class="requests-list">
        <div v-if="filteredRequests.length === 0" class="empty-state">
          <div class="empty-icon">📄</div>
          <p>キャンセル申請がありません</p>
        </div>
        
        <div v-else class="requests-grid">
          <div 
            v-for="request in filteredRequests" 
            :key="request.id"
            class="request-card"
            :class="[request.status, { urgent: request.urgent }]"
          >
            <!-- カードヘッダー -->
            <div class="card-header">
              <div class="request-info">
                <h4 class="case-name">{{ request.caseName }}</h4>
                <div class="meta-info">
                  <span class="franchise-name">{{ request.franchiseName }}</span>
                  <span class="request-date">{{ formatDate(request.requestDate) }}</span>
                </div>
              </div>
              <div class="status-badge" :class="request.status">
                {{ getStatusLabel(request.status) }}
              </div>
            </div>

            <!-- 申請詳細 -->
            <div class="card-content">
              <div class="customer-info">
                <p><strong>お客様:</strong> {{ request.customerName }}</p>
                <p><strong>住所:</strong> {{ request.customerAddress }}</p>
                <p><strong>電話:</strong> {{ request.customerPhone }}</p>
              </div>
              
              <div class="cancel-reason">
                <p class="reason-label"><strong>キャンセル理由:</strong></p>
                <div class="reason-text">{{ request.reason }}</div>
              </div>
              
              <div v-if="request.aiAnalysis" class="ai-analysis">
                <h5>🤖 AI分析結果</h5>
                <p><strong>緊急度:</strong> {{ request.aiAnalysis.urgency }}/5</p>
                <p><strong>推奨対応:</strong> {{ request.aiAnalysis.recommendation }}</p>
              </div>
            </div>

            <!-- アクション -->
            <div class="card-actions">
              <button 
                v-if="request.status === 'pending'"
                @click="approveRequest(request)"
                class="btn btn-approve"
              >
                ✅ 承認
              </button>
              <button 
                v-if="request.status === 'pending'"
                @click="rejectRequest(request)"
                class="btn btn-reject"
              >
                ❌ 却下
              </button>
              <button @click="viewDetails(request)" class="btn btn-view">
                👁️ 詳細
              </button>
              <button @click="contactFranchise(request)" class="btn btn-contact">
                📞 連絡
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 詳細モーダル -->
      <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>キャンセル申請詳細</h3>
            <button @click="closeDetailModal" class="modal-close">✕</button>
          </div>
          
          <div v-if="selectedRequest" class="modal-body">
            <div class="detail-section">
              <h4>案件情報</h4>
              <table class="detail-table">
                <tr><td>案件名</td><td>{{ selectedRequest.caseName }}</td></tr>
                <tr><td>お客様名</td><td>{{ selectedRequest.customerName }}</td></tr>
                <tr><td>住所</td><td>{{ selectedRequest.customerAddress }}</td></tr>
                <tr><td>電話番号</td><td>{{ selectedRequest.customerPhone }}</td></tr>
                <tr><td>案件価格</td><td>{{ formatPrice(selectedRequest.caseValue) }}円</td></tr>
              </table>
            </div>
            
            <div class="detail-section">
              <h4>申請情報</h4>
              <table class="detail-table">
                <tr><td>申請者</td><td>{{ selectedRequest.franchiseName }}</td></tr>
                <tr><td>申請日時</td><td>{{ formatDateTime(selectedRequest.requestDate) }}</td></tr>
                <tr><td>申請理由</td><td><div class="reason-detail">{{ selectedRequest.reason }}</div></td></tr>
              </table>
            </div>
            
            <div v-if="selectedRequest.aiAnalysis" class="detail-section">
              <h4>AI分析</h4>
              <div class="ai-detail">
                <p><strong>緊急度:</strong> {{ selectedRequest.aiAnalysis.urgency }}/5</p>
                <p><strong>分析:</strong> {{ selectedRequest.aiAnalysis.analysis }}</p>
                <p><strong>推奨:</strong> {{ selectedRequest.aiAnalysis.recommendation }}</p>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button @click="closeDetailModal" class="btn btn-outline">閉じる</button>
            <button 
              v-if="selectedRequest?.status === 'pending'"
              @click="approveRequest(selectedRequest)"
              class="btn btn-approve"
            >
              承認
            </button>
            <button 
              v-if="selectedRequest?.status === 'pending'"
              @click="rejectRequest(selectedRequest)"
              class="btn btn-reject"
            >
              却下
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'

// リアクティブデータ
const statusFilter = ref('')
const searchText = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const showDetailModal = ref(false)
const selectedRequest = ref(null)

// モックデータ
const requests = ref([
  {
    id: 1,
    caseName: '田中様邸 外壁塗装工事',
    customerName: '田中太郎',
    customerAddress: '東京都新宿区西新宿1-1-1',
    customerPhone: '03-1234-5678',
    caseValue: 1200000,
    franchiseName: '新宿加盟店',
    franchiseContact: '山田花子',
    requestDate: '2024-01-15T10:30:00',
    status: 'pending',
    urgent: true,
    reason: 'お客様のご都合により、工事開始を延期したいとのご連絡をいただきました。新築工事の遅延により、外壁塗装の着工時期を3ヶ月程度遅らせる必要があるとのことです。お客様は工事自体をキャンセルするわけではなく、時期の調整を希望されています。',
    aiAnalysis: {
      urgency: 3,
      analysis: '工事延期の要望であり、完全なキャンセルではないため、緊急度は中程度です。',
      recommendation: 'お客様と再スケジュールの調整を行い、工事時期を再設定することを推奨します。'
    }
  },
  {
    id: 2,
    caseName: '佐藤様邸 屋根・外壁リフォーム',
    customerName: '佐藤次郎',
    customerAddress: '東京都渋谷区渋谷2-2-2',
    customerPhone: '03-9876-5432',
    caseValue: 2500000,
    franchiseName: '渋谷加盟店',
    franchiseContact: '鈴木一郎',
    requestDate: '2024-01-14T14:15:00',
    status: 'approved',
    urgent: false,
    reason: 'お客様より、予算の都合上、今回の工事をキャンセルしたいとのご連絡がありました。他社でより安価な見積もりを取得されたとのことで、弊社での工事は見送りたいとのご意向です。',
    aiAnalysis: {
      urgency: 2,
      analysis: '価格競争によるキャンセルのため、一般的なケースです。',
      recommendation: '今後の関係性維持のため、丁寧な対応を心がけてください。'
    }
  },
  {
    id: 3,
    caseName: '高橋様邸 外壁修繕工事',
    customerName: '高橋三郎',
    customerAddress: '東京都品川区大崎3-3-3',
    customerPhone: '03-5555-1234',
    caseValue: 800000,
    franchiseName: '品川加盟店',
    franchiseContact: '田中美咲',
    requestDate: '2024-01-13T09:45:00',
    status: 'rejected',
    urgent: false,
    reason: 'お客様のご家族の反対により、工事を中止したいとのことです。配偶者の方が外壁塗装の必要性を感じておられず、今回は見送ることになりました。',
    aiAnalysis: {
      urgency: 1,
      analysis: '家族間の意見相違によるキャンセルで、よくあるケースです。',
      recommendation: 'ご家族への説明資料を提供し、理解促進を図ることを提案します。'
    }
  }
])

// 計算プロパティ
const filteredRequests = computed(() => {
  let filtered = requests.value

  // ステータスフィルター
  if (statusFilter.value) {
    filtered = filtered.filter(req => req.status === statusFilter.value)
  }

  // 検索フィルター
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    filtered = filtered.filter(req => 
      req.franchiseName.toLowerCase().includes(search) ||
      req.franchiseContact.toLowerCase().includes(search) ||
      req.customerName.toLowerCase().includes(search) ||
      req.caseName.toLowerCase().includes(search)
    )
  }

  // 日付フィルター
  if (dateFrom.value) {
    filtered = filtered.filter(req => req.requestDate >= dateFrom.value + 'T00:00:00')
  }
  if (dateTo.value) {
    filtered = filtered.filter(req => req.requestDate <= dateTo.value + 'T23:59:59')
  }

  // 緊急度でソート（緊急 → 承認待ち → その他）
  return filtered.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.requestDate) - new Date(a.requestDate)
  })
})

// メソッド
const getStatusLabel = (status) => {
  const labels = {
    pending: '承認待ち',
    approved: '承認済み',
    rejected: '却下'
  }
  return labels[status] || status
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (price) => {
  return price.toLocaleString()
}

const viewDetails = (request) => {
  selectedRequest.value = request
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRequest.value = null
}

const approveRequest = async (request) => {
  if (confirm(`${request.caseName}のキャンセル申請を承認しますか？`)) {
    try {
      // 実際のAPI呼び出し（モック）
      console.log('Approving request:', request.id)
      
      // ステータス更新
      request.status = 'approved'
      request.approvedDate = new Date().toISOString()
      
      alert('✅ キャンセル申請を承認しました')
      closeDetailModal()
    } catch (error) {
      console.error('Approval error:', error)
      alert('❌ 承認処理に失敗しました')
    }
  }
}

const rejectRequest = async (request) => {
  const reason = prompt(`${request.caseName}のキャンセル申請を却下する理由を入力してください：`)
  
  if (reason) {
    try {
      // 実際のAPI呼び出し（モック）
      console.log('Rejecting request:', request.id, 'Reason:', reason)
      
      // ステータス更新
      request.status = 'rejected'
      request.rejectedDate = new Date().toISOString()
      request.rejectionReason = reason
      
      alert('❌ キャンセル申請を却下しました')
      closeDetailModal()
    } catch (error) {
      console.error('Rejection error:', error)
      alert('❌ 却下処理に失敗しました')
    }
  }
}

const contactFranchise = (request) => {
  const message = `${request.franchiseName}（担当：${request.franchiseContact}）に連絡します。`
  if (confirm(message)) {
    // 実際は連絡手段の選択（電話、メール、チャットなど）
    alert('📞 連絡機能は準備中です')
  }
}

// ライフサイクル
onMounted(() => {
  // 初期データの取得
  console.log('Cancel requests loaded:', requests.value.length)
})
</script>

<style scoped>
.cancel-requests {
  padding: 24px;
}

/* ページヘッダー */
.page-header {
  margin-bottom: 32px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.page-icon {
  font-size: 32px;
}

.page-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

/* フィルターセクション */
.filter-section {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.filter-select, .filter-input, .filter-date {
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}

.filter-select:focus, .filter-input:focus, .filter-date:focus {
  outline: none;
  border-color: #3b82f6;
}

.date-separator {
  color: #6b7280;
  margin: 0 4px;
}

/* 申請一覧 */
.requests-list {
  margin-top: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.requests-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
}

/* リクエストカード */
.request-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s ease;
  border-left: 4px solid #e5e7eb;
}

.request-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.request-card.pending {
  border-left-color: #f59e0b;
}

.request-card.approved {
  border-left-color: #10b981;
}

.request-card.rejected {
  border-left-color: #ef4444;
}

.request-card.urgent {
  border-left-color: #dc2626;
  border-left-width: 6px;
}

/* カードヘッダー */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 0 20px;
}

.request-info h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.meta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: #6b7280;
}

.franchise-name {
  font-weight: 500;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

/* カードコンテンツ */
.card-content {
  padding: 20px;
}

.customer-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.customer-info p {
  margin: 4px 0;
  font-size: 14px;
}

.cancel-reason {
  margin-bottom: 16px;
}

.reason-label {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.reason-text {
  padding: 12px;
  background: #fffbeb;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
}

.ai-analysis {
  padding: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 8px;
}

.ai-analysis h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

.ai-analysis p {
  margin: 4px 0;
  font-size: 13px;
  color: #1f2937;
}

/* カードアクション */
.card-actions {
  display: flex;
  gap: 8px;
  padding: 0 20px 20px 20px;
  flex-wrap: wrap;
}

/* ボタンスタイル */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  text-decoration: none;
}

.btn-approve {
  background: #10b981;
  color: white;
}

.btn-approve:hover {
  background: #059669;
}

.btn-reject {
  background: #ef4444;
  color: white;
}

.btn-reject:hover {
  background: #dc2626;
}

.btn-view {
  background: #3b82f6;
  color: white;
}

.btn-view:hover {
  background: #2563eb;
}

.btn-contact {
  background: #6b7280;
  color: white;
}

.btn-contact:hover {
  background: #4b5563;
}

.btn-outline {
  background: transparent;
  color: #6b7280;
  border: 2px solid #d1d5db;
}

.btn-outline:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  padding: 8px;
  border-radius: 4px;
}

.modal-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: top;
}

.detail-table td:first-child {
  font-weight: 500;
  color: #374151;
  width: 120px;
}

.reason-detail {
  line-height: 1.5;
  color: #1f2937;
}

.ai-detail {
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
}

.ai-detail p {
  margin: 8px 0;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .cancel-requests {
    padding: 16px;
  }
  
  .filter-section {
    flex-direction: column;
    gap: 12px;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .requests-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .card-actions {
    justify-content: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>