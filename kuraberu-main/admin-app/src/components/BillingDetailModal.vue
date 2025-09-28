<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">請求詳細</h2>
        <button class="close-btn" @click="closeModal">
          <i class="icon-close">×</i>
        </button>
      </div>

      <div class="modal-content">
        <div v-if="loading" class="loading-section">
          <div class="loading-spinner"></div>
          <p>詳細情報を読み込み中...</p>
        </div>

        <div v-else-if="error" class="error-section">
          <div class="error-message">
            <i class="icon-error">⚠</i>
            <span>{{ error }}</span>
          </div>
          <button class="retry-btn" @click="loadDetail">再試行</button>
        </div>

        <div v-else-if="billing" class="detail-sections">
          <!-- 基本情報 -->
          <div class="detail-section">
            <h3 class="section-title">基本情報</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>請求ID</label>
                <span class="value">{{ billing.billingId }}</span>
              </div>
              <div class="detail-item">
                <label>請求日</label>
                <span class="value">{{ formatDate(billing.billingDate) }}</span>
              </div>
              <div class="detail-item">
                <label>請求金額</label>
                <span class="value amount">¥{{ formatNumber(billing.amount) }}</span>
              </div>
              <div class="detail-item">
                <label>支払期限</label>
                <span class="value" :class="{ 'overdue': billing.isOverdue }">
                  {{ formatDate(billing.paymentDueDate) }}
                  <span v-if="billing.isOverdue" class="overdue-badge">期限切れ</span>
                </span>
              </div>
              <div class="detail-item">
                <label>ステータス</label>
                <span class="status-badge" :class="getStatusClass(billing.paymentStatus)">
                  {{ billing.paymentStatus }}
                </span>
              </div>
              <div v-if="billing.paymentDate" class="detail-item">
                <label>支払日</label>
                <span class="value">{{ formatDate(billing.paymentDate) }}</span>
              </div>
            </div>
          </div>

          <!-- 請求内容詳細 -->
          <div class="detail-section">
            <h3 class="section-title">請求内容</h3>
            <div class="billing-description">
              <p>{{ billing.description || '詳細な説明が記録されていません' }}</p>
            </div>
            
            <div v-if="billing.items && billing.items.length > 0" class="billing-items">
              <h4 class="items-title">明細</h4>
              <div class="items-table">
                <div class="items-header">
                  <span>項目</span>
                  <span>数量</span>
                  <span>単価</span>
                  <span>金額</span>
                </div>
                <div 
                  v-for="item in billing.items" 
                  :key="item.id"
                  class="items-row"
                >
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-quantity">{{ item.quantity }}</span>
                  <span class="item-price">¥{{ formatNumber(item.unitPrice) }}</span>
                  <span class="item-total">¥{{ formatNumber(item.total) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 関連情報 -->
          <div class="detail-section">
            <h3 class="section-title">関連情報</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>契約案件数</label>
                <span class="value">{{ billing.contractCases || 0 }}件</span>
              </div>
              <div class="detail-item">
                <label>対象期間</label>
                <span class="value">{{ billing.billingPeriod || '-' }}</span>
              </div>
              <div v-if="billing.notes" class="detail-item full-width">
                <label>備考</label>
                <span class="value notes">{{ billing.notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-actions">
          <button class="secondary-btn" @click="closeModal">
            閉じる
          </button>
          <button 
            v-if="billing && billing.paymentStatus === '未払い'"
            class="primary-btn"
            @click="markAsPaid"
            :disabled="processing"
          >
            <span v-if="processing">処理中...</span>
            <span v-else>支払い完了にする</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useBillingStore } from '@/stores/billing'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  billingId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'updated'])

// Store
const billingStore = useBillingStore()

// Reactive data
const loading = ref(false)
const error = ref('')
const processing = ref(false)
const billing = ref(null)

// Computed
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('ja-JP')
}

const formatNumber = (num) => {
  return Number(num).toLocaleString('ja-JP')
}

const getStatusClass = (status) => {
  return {
    'status-paid': status === '支払い済み',
    'status-unpaid': status === '未払い',
    'status-overdue': status === '期限切れ'
  }
}

// Methods
const loadDetail = async () => {
  if (!props.billingId) return
  
  try {
    loading.value = true
    error.value = ''
    
    // 既存のデータから取得を試行
    const existingBilling = billingStore.getBillingById(props.billingId)
    if (existingBilling) {
      billing.value = existingBilling
    }
    
    // 詳細情報をAPIから取得
    const detailData = await billingStore.getBillingDetail(props.billingId)
    billing.value = { ...billing.value, ...detailData }
    
  } catch (err) {
    error.value = err.message || '詳細情報の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

const markAsPaid = async () => {
  if (!billing.value) return
  
  try {
    processing.value = true
    
    const paymentDate = new Date().toISOString()
    await billingStore.updatePaymentStatus(
      billing.value.billingId, 
      '支払い済み', 
      paymentDate
    )
    
    // ローカルデータを更新
    billing.value.paymentStatus = '支払い済み'
    billing.value.paymentDate = paymentDate
    billing.value.isOverdue = false
    
    emit('updated', billing.value)
    closeModal()
    
  } catch (err) {
    error.value = err.message || '支払いステータスの更新に失敗しました'
  } finally {
    processing.value = false
  }
}

const closeModal = () => {
  emit('close')
  // リセット
  billing.value = null
  error.value = ''
  loading.value = false
  processing.value = false
}

// Watchers
watch(
  () => props.isVisible,
  (newValue) => {
    if (newValue && props.billingId) {
      loadDetail()
    }
  }
)

watch(
  () => props.billingId,
  (newValue) => {
    if (newValue && props.isVisible) {
      loadDetail()
    }
  }
)
</script>

<style scoped>
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
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #6c757d;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.loading-section,
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc3545;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #495057;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #dee2e6;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
}

.detail-item .value {
  font-size: 16px;
  color: #1a1a1a;
}

.detail-item .value.amount {
  font-weight: 600;
  color: #28a745;
  font-size: 18px;
}

.detail-item .value.overdue {
  color: #dc3545;
}

.detail-item .value.notes {
  white-space: pre-wrap;
  line-height: 1.5;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  width: fit-content;
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

.billing-description {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.billing-items {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  overflow: hidden;
}

.items-title {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin: 0 0 12px 0;
  padding: 16px 16px 0 16px;
}

.items-table {
  display: flex;
  flex-direction: column;
}

.items-header,
.items-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 12px 16px;
  align-items: center;
}

.items-header {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
  border-bottom: 1px solid #dee2e6;
}

.items-row {
  border-bottom: 1px solid #f1f3f4;
}

.items-row:last-child {
  border-bottom: none;
}

.item-quantity,
.item-price,
.item-total {
  text-align: right;
}

.item-total {
  font-weight: 600;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.secondary-btn,
.primary-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn {
  background: #6c757d;
  color: white;
}

.secondary-btn:hover {
  background: #5a6268;
}

.primary-btn {
  background: #28a745;
  color: white;
}

.primary-btn:hover {
  background: #218838;
}

.primary-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* モバイル対応 */
@media (max-width: 768px) {
  .modal-container {
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .items-header,
  .items-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .items-header span,
  .items-row span {
    display: flex;
    justify-content: space-between;
  }
  
  .items-header span::before,
  .items-row span::before {
    content: attr(data-label);
    font-weight: 500;
    color: #6c757d;
  }
  
  .footer-actions {
    flex-direction: column;
  }
  
  .secondary-btn,
  .primary-btn {
    width: 100%;
  }
}
</style>