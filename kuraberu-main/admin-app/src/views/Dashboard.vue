<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">ダッシュボード</h1>
      <p class="page-subtitle">管理画面のメインダッシュボードです</p>
    </div>

    <div class="dashboard-grid">
      <!-- 統計カード -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <h3 class="stat-title">未払い請求</h3>
            <p class="stat-value">5件</p>
            <p class="stat-subtitle">¥450,000</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <h3 class="stat-title">今月の売上</h3>
            <p class="stat-value">¥1,250,000</p>
            <p class="stat-subtitle">前月比 +15%</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3 class="stat-title">アクティブ加盟店</h3>
            <p class="stat-value">28店舗</p>
            <p class="stat-subtitle">今月新規 3店舗</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <h3 class="stat-title">成約率</h3>
            <p class="stat-value">23.5%</p>
            <p class="stat-subtitle">前月比 +2.3%</p>
          </div>
        </div>
      </div>

      <!-- クイックアクション -->
      <div class="quick-actions">
        <h2 class="section-title">クイックアクション</h2>
        <div class="action-buttons">
          <router-link to="/billing" class="action-btn">
            <div class="action-icon">📋</div>
            <span>請求履歴を確認</span>
          </router-link>
          
          <button class="action-btn" @click="exportData">
            <div class="action-icon">📥</div>
            <span>データをエクスポート</span>
          </button>
          
          <router-link to="/settings" class="action-btn">
            <div class="action-icon">⚙️</div>
            <span>設定を変更</span>
          </router-link>
        </div>
      </div>

      <!-- 最近のアクティビティ -->
      <div class="recent-activity">
        <h2 class="section-title">最近のアクティビティ</h2>
        <div class="activity-list">
          <div class="activity-item">
            <div class="activity-icon">💳</div>
            <div class="activity-content">
              <p class="activity-title">請求 #2024-001 が支払い完了</p>
              <p class="activity-time">2時間前</p>
            </div>
          </div>
          
          <div class="activity-item">
            <div class="activity-icon">🏪</div>
            <div class="activity-content">
              <p class="activity-title">新規加盟店が登録されました</p>
              <p class="activity-time">4時間前</p>
            </div>
          </div>
          
          <div class="activity-item">
            <div class="activity-icon">📊</div>
            <div class="activity-content">
              <p class="activity-title">月次レポートが生成されました</p>
              <p class="activity-time">1日前</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

// メソッド
const exportData = () => {
  alert('データエクスポート機能は準備中です')
}

// ライフサイクル
onMounted(() => {
  console.log('Dashboard mounted')
})
</script>

<style scoped>
.dashboard {
  padding: 24px;
  max-width: 1200px;
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

.dashboard-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 12px;
}

.stat-content {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  margin: 0 0 4px 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.stat-subtitle {
  font-size: 12px;
  color: #28a745;
  margin: 0;
}

.quick-actions,
.recent-activity {
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
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  text-decoration: none;
  color: #495057;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.action-btn:hover {
  background: #e9ecef;
  border-color: #ced4da;
  transform: translateY(-1px);
}

.action-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 18px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.activity-time {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  
  .stats-section {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .action-buttons {
    grid-template-columns: 1fr;
  }
  
  .page-title {
    font-size: 24px;
  }
}
</style>