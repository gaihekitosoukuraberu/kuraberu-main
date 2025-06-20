<template>
  <div class="container">
    <h1>Step 3: 確認・送信</h1>
    
    <div class="confirmation-card">
      <h3>入力内容をご確認ください</h3>
      
      <div class="info-section">
        <h4>基本情報</h4>
        <div class="info-item">
          <span class="label">会社名:</span>
          <span class="value">{{ registrationData.companyName }}</span>
        </div>
        <div class="info-item">
          <span class="label">代表者名:</span>
          <span class="value">{{ registrationData.representative }}</span>
        </div>
        <div class="info-item">
          <span class="label">電話番号:</span>
          <span class="value">{{ registrationData.phone }}</span>
        </div>
        <div class="info-item">
          <span class="label">メールアドレス:</span>
          <span class="value">{{ registrationData.email }}</span>
        </div>
      </div>
      
      <div class="info-section">
        <h4>対応エリア</h4>
        <div class="area-list">
          <span v-for="area in selectedAreaNames" :key="area" class="area-tag">
            {{ area }}
          </span>
        </div>
      </div>
      
      <div class="form-actions">
        <router-link to="/area-selection" class="btn btn-secondary">戻る</router-link>
        <button @click="submitRegistration" class="btn btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? '送信中...' : '登録を送信する' }}
        </button>
      </div>
    </div>
    
    <!-- 成功メッセージ -->
    <div v-if="isSuccess" class="success-message">
      <h3>🎉 登録が完了しました！</h3>
      <p>ご登録いただきありがとうございます。担当者より3営業日以内にご連絡いたします。</p>
      <router-link to="/" class="btn btn-primary">トップページに戻る</router-link>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'Confirmation',
  setup() {
    const registrationData = ref({})
    const isSubmitting = ref(false)
    const isSuccess = ref(false)
    
    const areas = {
      'tokyo': '東京都',
      'kanagawa': '神奈川県',
      'chiba': '千葉県',
      'saitama': '埼玉県',
      'osaka': '大阪府',
      'kyoto': '京都府',
      'hyogo': '兵庫県',
      'aichi': '愛知県'
    }
    
    const selectedAreaNames = computed(() => {
      if (!registrationData.value.selectedAreas) return []
      return registrationData.value.selectedAreas.map(areaId => areas[areaId])
    })
    
    const submitRegistration = async () => {
      isSubmitting.value = true
      
      try {
        // TODO: 実際のAPI呼び出しを実装
        console.log('Submitting registration:', registrationData.value)
        
        // 模擬的な送信処理
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        isSuccess.value = true
        localStorage.removeItem('franchiseRegistration')
      } catch (error) {
        console.error('Registration failed:', error)
        alert('送信に失敗しました。もう一度お試しください。')
      } finally {
        isSubmitting.value = false
      }
    }
    
    onMounted(() => {
      const data = JSON.parse(localStorage.getItem('franchiseRegistration') || '{}')
      registrationData.value = data
    })
    
    return {
      registrationData,
      selectedAreaNames,
      isSubmitting,
      isSuccess,
      submitRegistration
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 40px auto;
  padding: 0 20px;
}

.confirmation-card {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.info-section {
  margin-bottom: 30px;
}

.info-section h4 {
  margin-bottom: 15px;
  color: var(--text-primary);
  border-bottom: 2px solid #007bff;
  padding-bottom: 5px;
}

.info-item {
  display: flex;
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.label {
  font-weight: 500;
  min-width: 120px;
  color: var(--text-secondary);
}

.value {
  color: var(--text-primary);
}

.area-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.area-tag {
  background: #007bff;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.success-message {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  margin-top: 20px;
}

.success-message h3 {
  color: #155724;
  margin-bottom: 15px;
}

.success-message p {
  color: #155724;
  margin-bottom: 20px;
}
</style>