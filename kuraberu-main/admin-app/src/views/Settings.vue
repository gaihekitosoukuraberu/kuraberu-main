<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="settings">
    <div class="page-header">
      <h1 class="page-title">設定</h1>
      <p class="page-subtitle">システムの各種設定を管理します</p>
    </div>

    <div class="settings-content">
      <!-- システム設定 -->
      <div class="settings-section">
        <h2 class="section-title">システム設定</h2>
        
        <div class="setting-group">
          <div class="setting-item">
            <label for="gas-url" class="setting-label">GAS WebApp URL</label>
            <input
              id="gas-url"
              type="url"
              v-model="settings.gasUrl"
              class="setting-input"
              placeholder="https://script.google.com/macros/s/..."
            >
            <p class="setting-description">Google Apps Script WebApp のデプロイURL</p>
          </div>

          <div class="setting-item">
            <label for="timeout" class="setting-label">API タイムアウト (秒)</label>
            <input
              id="timeout"
              type="number"
              v-model="settings.timeout"
              class="setting-input"
              min="10"
              max="300"
            >
            <p class="setting-description">API リクエストのタイムアウト時間</p>
          </div>

          <div class="setting-item">
            <label class="setting-label">デバッグモード</label>
            <div class="setting-toggle">
              <input
                id="debug-mode"
                type="checkbox"
                v-model="settings.debugMode"
                class="toggle-input"
              >
              <label for="debug-mode" class="toggle-label">
                <span class="toggle-switch"></span>
                {{ settings.debugMode ? '有効' : '無効' }}
              </label>
            </div>
            <p class="setting-description">開発者向けのデバッグ情報を表示</p>
          </div>
        </div>
      </div>

      <!-- 通知設定 -->
      <div class="settings-section">
        <h2 class="section-title">通知設定</h2>
        
        <div class="setting-group">
          <div class="setting-item">
            <label class="setting-label">メール通知</label>
            <div class="setting-toggle">
              <input
                id="email-notification"
                type="checkbox"
                v-model="settings.emailNotification"
                class="toggle-input"
              >
              <label for="email-notification" class="toggle-label">
                <span class="toggle-switch"></span>
                {{ settings.emailNotification ? '有効' : '無効' }}
              </label>
            </div>
            <p class="setting-description">重要な更新をメールで受信</p>
          </div>

          <div class="setting-item">
            <label for="notification-email" class="setting-label">通知先メールアドレス</label>
            <input
              id="notification-email"
              type="email"
              v-model="settings.notificationEmail"
              class="setting-input"
              :disabled="!settings.emailNotification"
              placeholder="admin@example.com"
            >
          </div>
        </div>
      </div>

      <!-- 表示設定 -->
      <div class="settings-section">
        <h2 class="section-title">表示設定</h2>
        
        <div class="setting-group">
          <div class="setting-item">
            <label for="items-per-page" class="setting-label">1ページあたりの表示件数</label>
            <select
              id="items-per-page"
              v-model="settings.itemsPerPage"
              class="setting-select"
            >
              <option value="10">10件</option>
              <option value="25">25件</option>
              <option value="50">50件</option>
              <option value="100">100件</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="date-format" class="setting-label">日付形式</label>
            <select
              id="date-format"
              v-model="settings.dateFormat"
              class="setting-select"
            >
              <option value="YYYY/MM/DD">YYYY/MM/DD</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>

          <div class="setting-item">
            <label class="setting-label">ダークモード</label>
            <div class="setting-toggle">
              <input
                id="dark-mode"
                type="checkbox"
                v-model="settings.darkMode"
                class="toggle-input"
              >
              <label for="dark-mode" class="toggle-label">
                <span class="toggle-switch"></span>
                {{ settings.darkMode ? '有効' : '無効' }}
              </label>
            </div>
            <p class="setting-description">ダークテーマを適用 (近日対応予定)</p>
          </div>
        </div>
      </div>

      <!-- セキュリティ設定 -->
      <div class="settings-section">
        <h2 class="section-title">セキュリティ設定</h2>
        
        <div class="setting-group">
          <div class="setting-item">
            <label for="session-timeout" class="setting-label">セッションタイムアウト (分)</label>
            <input
              id="session-timeout"
              type="number"
              v-model="settings.sessionTimeout"
              class="setting-input"
              min="15"
              max="480"
            >
            <p class="setting-description">自動ログアウトまでの時間</p>
          </div>

          <div class="setting-item">
            <label class="setting-label">2段階認証</label>
            <div class="setting-toggle">
              <input
                id="two-factor"
                type="checkbox"
                v-model="settings.twoFactorAuth"
                class="toggle-input"
              >
              <label for="two-factor" class="toggle-label">
                <span class="toggle-switch"></span>
                {{ settings.twoFactorAuth ? '有効' : '無効' }}
              </label>
            </div>
            <p class="setting-description">アカウントのセキュリティを強化 (近日対応予定)</p>
          </div>
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="settings-actions">
        <button 
          class="btn-save"
          @click="saveSettings"
          :disabled="saving"
        >
          <span v-if="saving">保存中...</span>
          <span v-else>設定を保存</span>
        </button>
        
        <button 
          class="btn-reset"
          @click="resetSettings"
        >
          デフォルトに戻す
        </button>
        
        <button 
          class="btn-export"
          @click="exportSettings"
        >
          設定をエクスポート
        </button>
      </div>

      <!-- 保存成功メッセージ -->
      <div v-if="saveMessage" class="save-message">
        {{ saveMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

// リアクティブデータ
const saving = ref(false)
const saveMessage = ref('')

const settings = ref({
  gasUrl: '',
  timeout: 30,
  debugMode: false,
  emailNotification: true,
  notificationEmail: '',
  itemsPerPage: 25,
  dateFormat: 'YYYY/MM/DD',
  darkMode: false,
  sessionTimeout: 60,
  twoFactorAuth: false
})

// デフォルト設定
const defaultSettings = {
  gasUrl: '',
  timeout: 30,
  debugMode: false,
  emailNotification: true,
  notificationEmail: '',
  itemsPerPage: 25,
  dateFormat: 'YYYY/MM/DD',
  darkMode: false,
  sessionTimeout: 60,
  twoFactorAuth: false
}

// メソッド
const loadSettings = () => {
  try {
    const saved = localStorage.getItem('gaiheki-admin-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.value = { ...defaultSettings, ...parsed }
    } else {
      // 環境変数から初期値を設定
      settings.value.gasUrl = process.env.VUE_APP_GAS_BASE_URL || ''
    }
  } catch (error) {
    console.error('設定の読み込みに失敗:', error)
    settings.value = { ...defaultSettings }
  }
}

const saveSettings = async () => {
  try {
    saving.value = true
    saveMessage.value = ''
    
    // ローカルストレージに保存
    localStorage.setItem('gaiheki-admin-settings', JSON.stringify(settings.value))
    
    // 保存の遅延をシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    saveMessage.value = '設定を保存しました'
    
    // メッセージを3秒後に非表示
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('設定の保存に失敗:', error)
    saveMessage.value = '設定の保存に失敗しました'
  } finally {
    saving.value = false
  }
}

const resetSettings = () => {
  if (confirm('設定をデフォルトに戻しますか？')) {
    settings.value = { ...defaultSettings }
    localStorage.removeItem('gaiheki-admin-settings')
    saveMessage.value = 'デフォルト設定に戻しました'
    
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
  }
}

const exportSettings = () => {
  try {
    const dataStr = JSON.stringify(settings.value, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'gaiheki-admin-settings.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    
    saveMessage.value = '設定をエクスポートしました'
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('設定のエクスポートに失敗:', error)
    saveMessage.value = 'エクスポートに失敗しました'
  }
}

// ウォッチャー
watch(
  () => settings.value.emailNotification,
  (newValue) => {
    if (!newValue) {
      settings.value.notificationEmail = ''
    }
  }
)

// ライフサイクル
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6c757d;
  margin: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.settings-section {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #f8f9fa;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.setting-input,
.setting-select {
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.setting-input:focus,
.setting-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.setting-input:disabled {
  background: #f8f9fa;
  color: #6c757d;
}

.setting-description {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
}

.setting-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-input {
  display: none;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: #ced4da;
  border-radius: 12px;
  transition: background 0.2s;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-label .toggle-switch {
  background: #28a745;
}

.toggle-input:checked + .toggle-label .toggle-switch::before {
  transform: translateX(20px);
}

.settings-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 8px;
}

.btn-save,
.btn-reset,
.btn-export {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  background: #28a745;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #218838;
}

.btn-save:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-reset {
  background: #dc3545;
  color: white;
}

.btn-reset:hover {
  background: #c82333;
}

.btn-export {
  background: #007bff;
  color: white;
}

.btn-export:hover {
  background: #0056b3;
}

.save-message {
  padding: 12px 16px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .settings {
    padding: 16px;
  }
  
  .settings-section {
    padding: 16px;
  }
  
  .settings-actions {
    flex-direction: column;
  }
  
  .btn-save,
  .btn-reset,
  .btn-export {
    width: 100%;
  }
}
</style>