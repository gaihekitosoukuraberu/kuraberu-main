<template>
  <div class="test-panel">
    <div class="test-header">
      <h3>🧪 GAS WebApp 接続テスト</h3>
      <button class="btn btn-sm btn-secondary" @click="togglePanel">
        {{ showPanel ? '閉じる' : '開く' }}
      </button>
    </div>
    
    <div v-if="showPanel" class="test-content">
      <!-- 環境変数確認 -->
      <div class="test-section">
        <h4>🔧 環境変数確認</h4>
        <div class="env-check">
          <div class="env-item">
            <strong>VUE_APP_GAS_WEBAPP_URL:</strong>
            <span :class="gasUrlStatus.class">{{ gasUrlStatus.value }}</span>
          </div>
        </div>
      </div>
      
      <!-- 接続テスト -->
      <div class="test-section">
        <h4>🔗 接続テスト</h4>
        <button 
          class="btn btn-primary btn-sm" 
          @click="testConnection" 
          :disabled="connectionTest.loading"
        >
          <span v-if="connectionTest.loading">テスト中...</span>
          <span v-else>接続テスト実行</span>
        </button>
        
        <div v-if="connectionTest.result" class="test-result">
          <div :class="connectionTest.result.success ? 'result-success' : 'result-error'">
            <strong>結果:</strong> {{ connectionTest.result.success ? '✅ 成功' : '❌ 失敗' }}
          </div>
          <div class="result-details">
            <pre>{{ JSON.stringify(connectionTest.result, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <!-- API関数テスト -->
      <div class="test-section">
        <h4>📊 API関数テスト</h4>
        <div class="function-tests">
          <button 
            v-for="func in testFunctions" 
            :key="func.name"
            class="btn btn-sm btn-secondary"
            @click="testFunction(func)"
            :disabled="func.loading"
          >
            <span v-if="func.loading">{{ func.name }} テスト中...</span>
            <span v-else>{{ func.name }} テスト</span>
          </button>
        </div>
        
        <div v-if="functionTest.result" class="test-result">
          <div :class="functionTest.result.success ? 'result-success' : 'result-error'">
            <strong>{{ functionTest.lastFunction }} 結果:</strong> 
            {{ functionTest.result.success ? '✅ 成功' : '❌ 失敗' }}
          </div>
          <div class="result-details">
            <pre>{{ JSON.stringify(functionTest.result, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <!-- AI条件設定エリア -->
      <div class="test-section">
        <h4>🤖 AI条件設定</h4>
        <div class="conditions-container">
          <!-- 条件リスト -->
          <div v-if="aiConditions.length > 0" class="conditions-list">
            <div 
              v-for="(condition, index) in aiConditions" 
              :key="condition.id"
              class="condition-item"
            >
              <div class="condition-content">
                <input 
                  v-model="condition.content"
                  type="text"
                  class="condition-input"
                  :placeholder="condition.placeholder || '条件を入力してください'"
                  @blur="updateCondition(index)"
                />
              </div>
              <button 
                class="btn btn-sm btn-danger"
                @click="confirmDeleteCondition(index)"
                :title="'削除: ' + condition.content"
              >
                🗑️ 削除
              </button>
            </div>
          </div>
          
          <!-- 空の状態 -->
          <div v-else class="empty-conditions">
            <p>条件がまだ設定されていません</p>
          </div>
          
          <!-- 追加ボタン -->
          <div class="add-condition-section">
            <button 
              class="btn btn-primary btn-add"
              @click="showAddModal = true"
            >
              ➕ 新しい条件を追加
            </button>
          </div>
        </div>
      </div>
      
      <!-- デバッグ情報 -->
      <div class="test-section">
        <h4>🐛 デバッグ情報</h4>
        <div class="debug-info">
          <div><strong>User Agent:</strong> {{ userAgent }}</div>
          <div><strong>Current URL:</strong> {{ currentUrl }}</div>
          <div><strong>Timestamp:</strong> {{ new Date().toISOString() }}</div>
          <div><strong>AI条件数:</strong> {{ aiConditions.length }}</div>
        </div>
      </div>
    </div>
    
    <!-- 削除確認モーダル -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h4>🗑️ 条件の削除</h4>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete this condition?</p>
          <div class="condition-preview">
            "{{ aiConditions[deleteIndex]?.content || '(空の条件)' }}"
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelDelete">
            キャンセル
          </button>
          <button class="btn btn-danger" @click="executeDelete">
            削除する
          </button>
        </div>
      </div>
    </div>
    
    <!-- 条件追加モーダル -->
    <div v-if="showAddModal" class="modal-overlay" @click="cancelAdd">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h4>➕ 新しい条件を追加</h4>
        </div>
        <div class="modal-body">
          <div class="add-option-tabs">
            <button 
              class="tab-btn"
              :class="{ active: addMode === 'custom' }"
              @click="addMode = 'custom'"
            >
              🖊️ カスタム入力
            </button>
            <button 
              class="tab-btn"
              :class="{ active: addMode === 'template' }"
              @click="addMode = 'template'"
            >
              📋 テンプレート選択
            </button>
          </div>
          
          <!-- カスタム入力 -->
          <div v-if="addMode === 'custom'" class="custom-input-section">
            <input 
              v-model="newConditionText"
              type="text"
              class="condition-input full-width"
              placeholder="新しい条件を入力してください..."
              ref="newConditionInput"
            />
          </div>
          
          <!-- テンプレート選択 -->
          <div v-if="addMode === 'template'" class="template-section">
            <div class="template-list">
              <div 
                v-for="template in conditionTemplates" 
                :key="template.id"
                class="template-item"
                :class="{ selected: selectedTemplate === template.id }"
                @click="selectTemplate(template)"
              >
                <div class="template-title">{{ template.title }}</div>
                <div class="template-content">{{ template.content }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelAdd">
            キャンセル
          </button>
          <button 
            class="btn btn-primary" 
            @click="executeAdd"
            :disabled="!canAdd"
          >
            追加する
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
import axios from 'axios'

export default {
  name: 'AssignmentTestPanel',
  setup() {
    const showPanel = ref(false)
    
    const connectionTest = reactive({
      loading: false,
      result: null
    })
    
    const functionTest = reactive({
      loading: false,
      result: null,
      lastFunction: ''
    })
    
    // AI条件管理
    const aiConditions = ref([
      {
        id: 1,
        content: '対応エリア: 東京都内',
        placeholder: 'エリアを指定してください'
      },
      {
        id: 2,
        content: '予算範囲: 100万円〜300万円',
        placeholder: '予算範囲を入力してください'
      },
      {
        id: 3,
        content: '希望時期: 3ヶ月以内',
        placeholder: '希望時期を入力してください'
      }
    ])
    
    const showDeleteModal = ref(false)
    const showAddModal = ref(false)
    const deleteIndex = ref(-1)
    const addMode = ref('custom') // 'custom' | 'template'
    const newConditionText = ref('')
    const selectedTemplate = ref(null)
    
    const conditionTemplates = ref([
      {
        id: 'area',
        title: 'エリア条件',
        content: '対応エリア: 東京都〇〇区'
      },
      {
        id: 'budget',
        title: '予算条件',
        content: '予算範囲: 〇万円〜〇万円'
      },
      {
        id: 'timeline',
        title: '時期条件',
        content: '希望時期: 〇ヶ月以内'
      },
      {
        id: 'experience',
        title: '経験条件',
        content: '必要経験: 〇年以上'
      },
      {
        id: 'certification',
        title: '資格条件',
        content: '必要資格: 〇〇資格'
      }
    ])
    
    const testFunctions = ref([
      {
        name: 'getDetailedAssignmentScores',
        loading: false,
        params: {
          parentId: 'PARENT-TEST-001',
          inquiryId: 'INQ-TEST-002',
          options: {}
        }
      },
      {
        name: 'generateAssignmentAdvice',
        loading: false,
        params: {
          parentId: 'PARENT-TEST-001',
          inquiryId: 'INQ-TEST-002',
          childId: 'CHILD-MOCK-001'
        }
      },
      {
        name: 'updateSortPriority',
        loading: false,
        params: {
          parentId: 'PARENT-TEST-001',
          sortOrder: ['area', 'workload', 'sequence']
        }
      }
    ])
    
    const gasUrlStatus = computed(() => {
      const url = process.env.VUE_APP_GAS_WEBAPP_URL
      if (!url) {
        return {
          value: '❌ 未設定',
          class: 'status-error'
        }
      }
      if (url.includes('script.google.com')) {
        return {
          value: `✅ ${url}`,
          class: 'status-success'
        }
      }
      return {
        value: `⚠️ ${url}`,
        class: 'status-warning'
      }
    })
    
    const canAdd = computed(() => {
      if (addMode.value === 'custom') {
        return newConditionText.value.trim().length > 0
      }
      if (addMode.value === 'template') {
        return selectedTemplate.value !== null
      }
      return false
    })
    
    // 安全なnavigator/window参照
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'Unknown'
    
    const togglePanel = () => {
      showPanel.value = !showPanel.value
    }
    
    const testConnection = async () => {
      connectionTest.loading = true
      connectionTest.result = null
      
      try {
        const payload = {
          function: 'testConnection',
          parameters: {}
        }
        
        console.log('🔗 接続テスト開始:', payload)
        
        const response = await axios.post(process.env.VUE_APP_GAS_WEBAPP_URL, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })
        
        console.log('✅ 接続テスト応答:', response.data)
        connectionTest.result = response.data
        
      } catch (error) {
        console.error('❌ 接続テストエラー:', error)
        
        let errorMsg = '不明なエラー'
        if (error.code === 'ECONNABORTED') {
          errorMsg = 'タイムアウト'
        } else if (error.response) {
          errorMsg = `HTTP ${error.response.status}: ${error.response.statusText}`
        } else if (error.request) {
          errorMsg = 'ネットワークエラー（サーバーに接続できません）'
        } else {
          errorMsg = error.message
        }
        
        connectionTest.result = {
          success: false,
          error: errorMsg,
          details: {
            code: error.code,
            message: error.message,
            url: process.env.VUE_APP_GAS_WEBAPP_URL
          }
        }
      } finally {
        connectionTest.loading = false
      }
    }
    
    const testFunction = async (func) => {
      func.loading = true
      functionTest.result = null
      functionTest.lastFunction = func.name
      
      try {
        const payload = {
          function: func.name,
          parameters: func.params
        }
        
        console.log(`🧪 ${func.name} テスト開始:`, payload)
        
        const response = await axios.post(process.env.VUE_APP_GAS_WEBAPP_URL, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        })
        
        console.log(`✅ ${func.name} テスト応答:`, response.data)
        functionTest.result = response.data
        
      } catch (error) {
        console.error(`❌ ${func.name} テストエラー:`, error)
        
        functionTest.result = {
          success: false,
          error: error.message,
          function: func.name
        }
      } finally {
        func.loading = false
      }
    }
    
    // AI条件管理関数
    const updateCondition = (index) => {
      console.log('条件更新:', index, aiConditions.value[index])
      // 既存の更新処理があればここで呼び出し
    }
    
    const confirmDeleteCondition = (index) => {
      deleteIndex.value = index
      showDeleteModal.value = true
    }
    
    const cancelDelete = () => {
      showDeleteModal.value = false
      deleteIndex.value = -1
    }
    
    const executeDelete = () => {
      if (deleteIndex.value >= 0 && deleteIndex.value < aiConditions.value.length) {
        console.log('条件削除:', aiConditions.value[deleteIndex.value])
        aiConditions.value.splice(deleteIndex.value, 1)
        cancelDelete()
      }
    }
    
    const cancelAdd = () => {
      showAddModal.value = false
      newConditionText.value = ''
      selectedTemplate.value = null
      addMode.value = 'custom'
    }
    
    const selectTemplate = (template) => {
      selectedTemplate.value = template.id
      console.log('テンプレート選択:', template)
    }
    
    const executeAdd = () => {
      let newCondition = null
      
      if (addMode.value === 'custom' && newConditionText.value.trim()) {
        newCondition = {
          id: Date.now(),
          content: newConditionText.value.trim(),
          placeholder: '条件を編集してください'
        }
      } else if (addMode.value === 'template' && selectedTemplate.value) {
        const template = conditionTemplates.value.find(t => t.id === selectedTemplate.value)
        if (template) {
          newCondition = {
            id: Date.now(),
            content: template.content,
            placeholder: template.title + 'を編集してください'
          }
        }
      }
      
      if (newCondition) {
        console.log('条件追加:', newCondition)
        aiConditions.value.push(newCondition)
        cancelAdd()
      }
    }
    
    return {
      showPanel,
      connectionTest,
      functionTest,
      testFunctions,
      gasUrlStatus,
      userAgent,
      currentUrl,
      togglePanel,
      testConnection,
      testFunction,
      // AI条件管理
      aiConditions,
      showDeleteModal,
      showAddModal,
      deleteIndex,
      addMode,
      newConditionText,
      selectedTemplate,
      conditionTemplates,
      canAdd,
      updateCondition,
      confirmDeleteCondition,
      cancelDelete,
      executeDelete,
      cancelAdd,
      selectTemplate,
      executeAdd
    }
  }
}
</script>

<style scoped>
.test-panel {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: white;
  border: 2px solid #e3f2fd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #e3f2fd;
  border-bottom: 1px solid #bbdefb;
}

.test-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1976d2;
}

.test-content {
  padding: 16px;
}

.test-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.test-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.test-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.env-check {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.env-item {
  margin-bottom: 4px;
}

.status-success {
  color: #2e7d32;
  font-weight: 600;
}

.status-error {
  color: #c62828;
  font-weight: 600;
}

.status-warning {
  color: #f57c00;
  font-weight: 600;
}

.function-tests {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.test-result {
  margin-top: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.result-success {
  background: #e8f5e8;
  color: #2e7d32;
  padding: 8px 12px;
  font-weight: 600;
}

.result-error {
  background: #ffebee;
  color: #c62828;
  padding: 8px 12px;
  font-weight: 600;
}

.result-details {
  background: #f8f9fa;
  padding: 12px;
  border-top: 1px solid #ddd;
}

.result-details pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.debug-info {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
}

.debug-info div {
  margin-bottom: 4px;
  word-wrap: break-word;
}

/* AI条件設定 */
.conditions-container {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
}

.conditions-list {
  margin-bottom: 12px;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.condition-content {
  flex: 1;
}

.condition-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 12px;
  outline: none;
}

.condition-input:focus {
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.condition-input.full-width {
  margin-top: 8px;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-danger:hover {
  background: #c82333;
  border-color: #bd2130;
}

.btn-add {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
}

.empty-conditions {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.add-condition-section {
  margin-top: 12px;
}

/* モーダル */
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
  z-index: 2000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  background: #f8f9fa;
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  border-radius: 8px 8px 0 0;
}

.modal-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #dee2e6;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.condition-preview {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  border-left: 4px solid #dc3545;
  font-family: monospace;
  font-size: 12px;
  margin-top: 8px;
}

/* 追加モーダル */
.add-option-tabs {
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid #dee2e6;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 12px;
  color: #6c757d;
  transition: all 0.2s ease;
}

.tab-btn.active {
  color: #2196f3;
  border-bottom-color: #2196f3;
}

.tab-btn:hover {
  color: #495057;
}

.custom-input-section {
  padding: 12px 0;
}

.template-section {
  padding: 12px 0;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-item {
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-item:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.template-item.selected {
  background: #e3f2fd;
  border-color: #2196f3;
}

.template-title {
  font-weight: 600;
  font-size: 12px;
  color: #333;
  margin-bottom: 4px;
}

.template-content {
  font-size: 11px;
  color: #6c757d;
}

@media (max-width: 768px) {
  .test-panel {
    position: static;
    margin: 20px;
    max-width: none;
    max-height: none;
  }
  
  .modal-container {
    width: 95%;
    margin: 20px;
  }
}
</style>