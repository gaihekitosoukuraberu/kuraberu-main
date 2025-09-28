<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">
          <Icon name="history" />
          フラグ履歴 - {{ franchiseeName }}
        </h3>
        <button class="modal-close" @click="$emit('close')">
          <Icon name="times" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>履歴を読み込み中...</p>
        </div>

        <div v-else-if="history.length === 0" class="empty-state">
          <Icon name="history" class="empty-icon" />
          <p>フラグ履歴がありません</p>
        </div>

        <div v-else class="history-list">
          <div 
            v-for="item in history" 
            :key="item.id"
            class="history-item"
          >
            <div class="history-header">
              <StatusBadge :status="item.flagStatus" />
              <span class="history-date">{{ formatDateTime(item.setDate) }}</span>
            </div>
            <div class="history-content">
              <p class="history-reason">{{ item.reason }}</p>
              <div class="history-meta">
                <span class="history-user">設定者: {{ item.setByUserName }}</span>
                <span v-if="item.expireDate" class="history-expire">
                  期限: {{ formatDate(item.expireDate) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Icon from '@/components/common/Icon.vue'
import StatusBadge from './StatusBadge.vue'

defineProps({
  franchiseeId: {
    type: String,
    required: true
  },
  franchiseeName: {
    type: String,
    required: true
  }
})

defineEmits(['close'])

// State
const loading = ref(true)
const history = ref([])

// Methods
const fetchHistory = async () => {
  try {
    loading.value = true
    
    // モックデータ（実際はAPIから取得）
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    history.value = [
      {
        id: 1,
        flagStatus: 'アクティブ',
        reason: '営業再開',
        setDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
        setByUserName: 'システム管理者',
        expireDate: null
      },
      {
        id: 2,
        flagStatus: '不在',
        reason: '担当者休暇中',
        setDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        setByUserName: '営業マネージャー',
        expireDate: new Date(Date.now() - 1000 * 60 * 60 * 24)
      },
      {
        id: 3,
        flagStatus: 'アクティブ',
        reason: '初期設定',
        setDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        setByUserName: 'システム管理者',
        expireDate: null
      }
    ]
  } catch (error) {
    console.error('Failed to fetch flag history:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ja-JP')
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('ja-JP')
}

// Lifecycle
onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
  padding: 0.5rem;
  border-radius: 6px;
}

.modal-close:hover {
  color: #374151;
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #9ca3af;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f8fafc;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.history-date {
  font-size: 0.875rem;
  color: #6b7280;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-reason {
  color: #374151;
  font-weight: 500;
  margin: 0;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #6b7280;
}

.history-user,
.history-expire {
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f8fafc;
}

.btn {
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

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #d1d5db;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }

  .history-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>