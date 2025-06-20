<template>
  <div class="container">
    <h1>Step 2: 対応エリア選択</h1>
    
    <form @submit.prevent="nextStep" class="form">
      <div class="form-group">
        <label>対応可能エリアを選択してください *</label>
        <div class="checkbox-grid">
          <div v-for="area in areas" :key="area.id" class="checkbox-item">
            <input 
              type="checkbox" 
              :id="area.id" 
              :value="area.id"
              v-model="selectedAreas"
            />
            <label :for="area.id">{{ area.name }}</label>
          </div>
        </div>
      </div>
      
      <div class="form-actions">
        <router-link to="/basic-info" class="btn btn-secondary">戻る</router-link>
        <button type="submit" class="btn btn-primary" :disabled="selectedAreas.length === 0">
          次へ
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'AreaSelection',
  setup() {
    const router = useRouter()
    
    const areas = ref([
      { id: 'tokyo', name: '東京都' },
      { id: 'kanagawa', name: '神奈川県' },
      { id: 'chiba', name: '千葉県' },
      { id: 'saitama', name: '埼玉県' },
      { id: 'osaka', name: '大阪府' },
      { id: 'kyoto', name: '京都府' },
      { id: 'hyogo', name: '兵庫県' },
      { id: 'aichi', name: '愛知県' }
    ])
    
    const selectedAreas = ref([])
    
    const nextStep = () => {
      // 既存のデータを取得
      const existingData = JSON.parse(localStorage.getItem('franchiseRegistration') || '{}')
      
      // エリア情報を追加
      const updatedData = {
        ...existingData,
        selectedAreas: selectedAreas.value
      }
      
      localStorage.setItem('franchiseRegistration', JSON.stringify(updatedData))
      router.push('/confirmation')
    }
    
    onMounted(() => {
      // 既存データがあれば復元
      const existingData = JSON.parse(localStorage.getItem('franchiseRegistration') || '{}')
      if (existingData.selectedAreas) {
        selectedAreas.value = existingData.selectedAreas
      }
    })
    
    return {
      areas,
      selectedAreas,
      nextStep
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

.form {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 20px;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.checkbox-item:hover {
  background-color: #f8f9fa;
}

.checkbox-item input {
  margin-right: 8px;
  width: auto;
}

.checkbox-item label {
  margin: 0;
  cursor: pointer;
  font-weight: normal;
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

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: var(--text-primary);
}
</style>