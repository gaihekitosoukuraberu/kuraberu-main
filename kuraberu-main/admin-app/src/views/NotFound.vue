<template>
  <div class="not-found">
    <div class="not-found-container">
      <div class="error-illustration">
        <div class="error-number">404</div>
        <div class="error-icon">🏗️</div>
      </div>
      
      <div class="error-content">
        <h1 class="error-title">ページが見つかりません</h1>
        <p class="error-description">
          申し訳ございません。お探しのページは存在しないか、移動された可能性があります。
        </p>
        
        <div class="error-actions">
          <router-link to="/billing" class="btn-primary">
            請求履歴に戻る
          </router-link>
          
          <router-link to="/dashboard" class="btn-secondary">
            ダッシュボードに戻る
          </router-link>
          
          <button @click="goBack" class="btn-secondary">
            前のページに戻る
          </button>
        </div>

        <!-- よくアクセスされるページ -->
        <div class="popular-pages">
          <h3 class="popular-title">よくアクセスされるページ</h3>
          <div class="popular-links">
            <router-link to="/billing" class="popular-link">
              <div class="link-icon">📋</div>
              <div class="link-content">
                <div class="link-title">請求履歴</div>
                <div class="link-description">請求情報の確認・管理</div>
              </div>
            </router-link>
            
            <router-link to="/dashboard" class="popular-link">
              <div class="link-icon">📊</div>
              <div class="link-content">
                <div class="link-title">ダッシュボード</div>
                <div class="link-description">統計情報とクイックアクション</div>
              </div>
            </router-link>
            
            <router-link to="/settings" class="popular-link">
              <div class="link-icon">⚙️</div>
              <div class="link-content">
                <div class="link-title">設定</div>
                <div class="link-description">システムの各種設定</div>
              </div>
            </router-link>
          </div>
        </div>

        <!-- エラー情報（開発モードのみ） -->
        <div v-if="isDevelopment" class="debug-info">
          <h4 class="debug-title">🔧 デバッグ情報</h4>
          <div class="debug-content">
            <p><strong>要求されたパス:</strong> {{ $route.fullPath }}</p>
            <p><strong>現在時刻:</strong> {{ currentTime }}</p>
            <p><strong>リファラー:</strong> {{ referrer || 'なし' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Router
const router = useRouter()

// リアクティブデータ
const isDevelopment = ref(process.env.NODE_ENV === 'development')
const currentTime = ref('')
const referrer = ref('')

// メソッド
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/billing')
  }
}

const updateTime = () => {
  currentTime.value = new Date().toLocaleString('ja-JP')
}

// ライフサイクル
onMounted(() => {
  updateTime()
  
  // ブラウザ環境でのみreferrerを取得
  if (typeof document !== 'undefined') {
    referrer.value = document.referrer
  }
  
  // ページビューログ（分析用）
  console.log('404 Error:', {
    path: window.location.pathname,
    referrer: referrer.value,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  })
})
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.not-found-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.error-illustration {
  margin-bottom: 32px;
  position: relative;
}

.error-number {
  font-size: 120px;
  font-weight: 900;
  color: #e9ecef;
  line-height: 1;
  margin-bottom: -20px;
}

.error-icon {
  font-size: 60px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.error-content {
  text-align: left;
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 16px 0;
  text-align: center;
}

.error-description {
  font-size: 16px;
  color: #6c757d;
  line-height: 1.6;
  margin: 0 0 32px 0;
  text-align: center;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
  transform: translateY(-1px);
}

.popular-pages {
  margin-bottom: 32px;
}

.popular-title {
  font-size: 18px;
  font-weight: 600;
  color: #495057;
  margin: 0 0 16px 0;
}

.popular-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popular-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.popular-link:hover {
  background: #e9ecef;
  border-color: #ced4da;
  transform: translateY(-1px);
}

.link-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 8px;
}

.link-content {
  flex: 1;
  text-align: left;
}

.link-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.link-description {
  font-size: 14px;
  color: #6c757d;
}

.debug-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  text-align: left;
}

.debug-title {
  font-size: 14px;
  font-weight: 600;
  color: #856404;
  margin: 0 0 12px 0;
}

.debug-content {
  font-size: 12px;
  color: #856404;
}

.debug-content p {
  margin: 4px 0;
}

.debug-content strong {
  font-weight: 600;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .not-found-container {
    padding: 24px;
    margin: 0;
  }
  
  .error-number {
    font-size: 80px;
  }
  
  .error-icon {
    font-size: 40px;
  }
  
  .error-title {
    font-size: 24px;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    text-align: center;
  }
  
  .popular-links {
    gap: 8px;
  }
  
  .popular-link {
    padding: 12px;
  }
  
  .link-icon {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }
  
  .link-title {
    font-size: 14px;
  }
  
  .link-description {
    font-size: 12px;
  }
}
</style>