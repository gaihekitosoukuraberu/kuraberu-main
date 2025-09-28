<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">
          <Icon name="edit" />
          一括フラグ更新
        </h3>
        <button class="modal-close" @click="$emit('close')">
          <Icon name="times" />
        </button>
      </div>

      <div class="modal-body">
        <div class="bulk-info">
          <p class="info-text">
            選択した {{ selectedCount }} 件の加盟店のフラグを一括更新します。
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="bulk-form">
          <div class="form-group">
            <label for="flagStatus" class="form-label">新しいステータス:</label>
            <select
              id="flagStatus"
              v-model="formData.flagStatus"
              class="form-select"
              required
            >
              <option value="">選択してください</option>
              <option value="アクティブ">アクティブ</option>
              <option value="不在">不在</option>
              <option value="保留">保留</option>
              <option value="ブラック">ブラック</option>
            </select>
          </div>

          <div class="form-group">
            <label for="reason" class="form-label">更新理由:</label>
            <textarea
              id="reason"
              v-model="formData.reason"
              class="form-textarea"
              rows="3"
              placeholder="フラグ更新の理由を入力してください"
              required
            ></textarea>
          </div>

          <div v-if="formData.flagStatus && formData.flagStatus !== 'アクティブ'" class="form-group">
            <label for="expireDate" class="form-label">期限日 (オプション):</label>
            <input
              id="expireDate"
              type="date"
              v-model="formData.expireDate"
              class="form-input"
              :min="today"
            />
            <small class="form-help">
              期限日を設定すると、その日以降に自動的にアクティブに戻ります
            </small>
          </div>

          <div class="warning-box">
            <Icon name="exclamation-circle" class="warning-icon" />
            <div class="warning-content">
              <p class="warning-title">注意事項</p>
              <ul class="warning-list">
                <li>この操作は選択した全ての加盟店に適用されます</li>
                <li>ブラック・保留・不在に設定すると案件割り当て対象から除外されます</li>
                <li>この操作は元に戻すことができません</li>
              </ul>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button 
          type="button"
          class="btn btn-secondary" 
          @click="$emit('close')"
        >
          キャンセル
        </button>
        <button 
          type="button"
          class="btn btn-primary" 
          @click="handleSubmit"
          :disabled="!isFormValid || processing"
        >
          <Icon name="edit" :class="{ rotating: processing }" />
          {{ processing ? '更新中...' : `${selectedCount}件を一括更新` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from '@/components/common/Icon.vue'

defineProps({
  selectedCount: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['bulk-update', 'close'])

// State
const processing = ref(false)
const formData = ref({
  flagStatus: '',
  reason: '',
  expireDate: ''
})

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const isFormValid = computed(() => {
  return formData.value.flagStatus && formData.value.reason.trim()
})

// Methods
const handleSubmit = async () => {
  if (!isFormValid.value || processing.value) return

  try {
    processing.value = true

    const updateData = {
      flagStatus: formData.value.flagStatus,
      reason: formData.value.reason.trim(),
      expireDate: formData.value.expireDate || null
    }

    emit('bulk-update', updateData)
  } catch (error) {
    console.error('Bulk update submission error:', error)
  } finally {
    processing.value = false
  }
}
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
}

.bulk-info {
  margin-bottom: 1.5rem;
}

.info-text {
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.bulk-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-select,
.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #374151;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-help {
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.4;
}

.warning-box {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
}

.warning-icon {
  color: #f59e0b;
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
}

.warning-list {
  margin: 0;
  padding-left: 1rem;
  color: #92400e;
  font-size: 0.75rem;
  line-height: 1.5;
}

.warning-list li {
  margin-bottom: 0.25rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #d1d5db;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-1px);
}

.rotating {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    justify-content: center;
  }
}
</style>