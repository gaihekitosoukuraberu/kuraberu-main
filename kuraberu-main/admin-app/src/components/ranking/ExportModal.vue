<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">
          <Icon name="download" />
          データエクスポート
        </h3>
        <button class="modal-close" @click="$emit('close')">
          <Icon name="times" />
        </button>
      </div>

      <div class="modal-body">
        <div class="export-info">
          <p class="info-text">
            {{ getExportDescription(type) }}のデータをCSV形式でエクスポートします。
          </p>
          <div class="format-selection">
            <label class="format-label">出力形式:</label>
            <div class="format-options">
              <label class="format-option">
                <input 
                  type="radio" 
                  value="csv" 
                  v-model="selectedFormat"
                  name="format"
                />
                <span class="format-text">CSV (.csv)</span>
                <span class="format-desc">Excel等で開けます</span>
              </label>
            </div>
          </div>

          <div class="export-options">
            <label class="option-item">
              <input 
                type="checkbox" 
                v-model="includeHeader"
              />
              <span class="option-text">ヘッダー行を含める</span>
            </label>
            <label class="option-item">
              <input 
                type="checkbox" 
                v-model="includeTimestamp"
              />
              <span class="option-text">エクスポート日時を含める</span>
            </label>
          </div>

          <div class="file-preview">
            <h4 class="preview-title">プレビュー:</h4>
            <div class="preview-content">
              <code class="preview-code">{{ getPreviewContent() }}</code>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button 
          class="btn btn-secondary" 
          @click="$emit('close')"
        >
          キャンセル
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleExport"
          :disabled="exporting"
        >
          <Icon name="download" :class="{ rotating: exporting }" />
          {{ exporting ? 'エクスポート中...' : 'エクスポート実行' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Icon from '@/components/common/Icon.vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['success-rate', 'response', 'sales'].includes(value)
  }
})

const emit = defineEmits(['export', 'close'])

// State
const selectedFormat = ref('csv')
const includeHeader = ref(true)
const includeTimestamp = ref(true)
const exporting = ref(false)

// Methods
const getExportDescription = (type) => {
  const descriptions = {
    'success-rate': '成約率ランキング',
    'response': '応答速度ランキング',
    'sales': '売上ランキング'
  }
  return descriptions[type] || 'ランキング'
}

const getPreviewContent = () => {
  const headers = getHeaders(props.type)
  const sampleRow = getSampleRow(props.type)
  
  let content = ''
  
  if (includeHeader.value) {
    content += headers.join(',') + '\n'
  }
  
  content += sampleRow.join(',')
  
  if (includeTimestamp.value) {
    content += `\n\n# エクスポート日時: ${new Date().toLocaleString('ja-JP')}`
  }
  
  return content
}

const getHeaders = (type) => {
  const headerMap = {
    'success-rate': ['順位', '加盟店名', '加盟店ID', '担当件数', '成約件数', '成約率(%)'],
    'response': ['順位', '加盟店名', '加盟店ID', '平均応答時間(時間)', '総応答件数'],
    'sales': ['順位', '加盟店名', '加盟店ID', '総売上金額', '成約件数', '平均案件単価']
  }
  return headerMap[type] || []
}

const getSampleRow = (type) => {
  const sampleMap = {
    'success-rate': ['1', '東京都市部塗装', 'FRANCHISE_001', '50', '20', '40.0'],
    'response': ['1', '東京都市部塗装', 'FRANCHISE_001', '2.5', '45'],
    'sales': ['1', '東京都市部塗装', 'FRANCHISE_001', '15000000', '12', '1250000']
  }
  return sampleMap[type] || []
}

const handleExport = async () => {
  try {
    exporting.value = true
    
    await new Promise(resolve => setTimeout(resolve, 1000)) // シミュレート
    
    emit('export', props.type, selectedFormat.value)
  } catch (error) {
    console.error('Export error:', error)
  } finally {
    exporting.value = false
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
  max-width: 500px;
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

.export-info {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-text {
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.format-selection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.format-label {
  font-weight: 600;
  color: #374151;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.format-option input[type="radio"] {
  margin: 0;
}

.format-text {
  font-weight: 600;
  color: #1f2937;
}

.format-desc {
  color: #6b7280;
  font-size: 0.875rem;
  margin-left: auto;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.option-item input[type="checkbox"] {
  margin: 0;
}

.option-text {
  color: #374151;
  font-weight: 500;
}

.file-preview {
  background-color: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.preview-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.preview-content {
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.75rem;
  max-height: 120px;
  overflow-y: auto;
}

.preview-code {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-all;
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