<template>
  <div class="container">
    <h1>Step 1: 基本情報入力</h1>
    
    <form @submit.prevent="nextStep" class="form">
      <div class="form-group">
        <label for="companyName">会社名 *</label>
        <input 
          type="text" 
          id="companyName" 
          v-model="formData.companyName" 
          required 
          placeholder="株式会社◯◯"
        />
      </div>
      
      <div class="form-group">
        <label for="representative">代表者名 *</label>
        <input 
          type="text" 
          id="representative" 
          v-model="formData.representative" 
          required 
          placeholder="山田 太郎"
        />
      </div>
      
      <div class="form-group">
        <label for="phone">電話番号 *</label>
        <input 
          type="tel" 
          id="phone" 
          v-model="formData.phone" 
          required 
          placeholder="03-1234-5678"
        />
      </div>
      
      <div class="form-group">
        <label for="email">メールアドレス *</label>
        <input 
          type="email" 
          id="email" 
          v-model="formData.email" 
          required 
          placeholder="contact@example.com"
        />
      </div>
      
      <div class="form-actions">
        <router-link to="/" class="btn btn-secondary">戻る</router-link>
        <button type="submit" class="btn btn-primary">次へ</button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'BasicInfo',
  setup() {
    const router = useRouter()
    
    const formData = ref({
      companyName: '',
      representative: '',
      phone: '',
      email: ''
    })
    
    const nextStep = () => {
      // フォームデータを保存（localStorage等）
      localStorage.setItem('franchiseRegistration', JSON.stringify(formData.value))
      router.push('/area-selection')
    }
    
    return {
      formData,
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

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: var(--text-primary);
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
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

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>