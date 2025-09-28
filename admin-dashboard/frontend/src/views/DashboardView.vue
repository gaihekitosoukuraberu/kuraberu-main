<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div>
      <h1 class="text-3xl font-bold text-gray-800">ダッシュボード</h1>
      <p class="mt-1 text-gray-600">リアルタイムモニター</p>
    </div>
    
    <!-- 上段：主要指標 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card card-hover">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-400">未承認加盟店申請</span>
          <span class="badge badge-danger">緊急</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-3xl font-bold text-gray-900">{{ metrics.pendingApprovals }}</span>
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="mt-3 text-xs text-gray-500">
          24時間以内に対応必要
        </div>
      </div>
      
      <div class="card card-hover">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-400">新着案件数</span>
          <span class="text-xs text-emerald-400">+12%</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-3xl font-bold text-gray-800">{{ metrics.newCases }}</span>
          <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div class="mt-3 flex items-center space-x-2 text-xs">
          <div class="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-blue-500 to-blue-400" :style="`width: ${metrics.newCases}%`"></div>
          </div>
          <span class="text-gray-500">目標: 50</span>
        </div>
      </div>
      
      <div class="card card-hover">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-400">本日の転送数</span>
          <span class="badge badge-success">順調</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-3xl font-bold text-gray-800">{{ metrics.todayTransfers }}</span>
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <div class="mt-3 text-xs text-gray-500">
          平均応答時間: 2.3時間
        </div>
      </div>
      
      <div class="card card-hover">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-400">本日の成約通知</span>
          <span class="text-xs text-amber-400">¥2.4M</span>
        </div>
        <div class="flex items-baseline justify-between">
          <span class="text-3xl font-bold text-gray-800">{{ metrics.todayContracts }}</span>
          <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="mt-3 text-xs text-gray-500">
          成約率: 32.5%
        </div>
      </div>
    </div>
    
    <!-- 中段：グラフエリア -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 流入経路別グラフ -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">流入経路別分析</h3>
        <div class="h-64 flex items-center justify-center">
          <canvas ref="inflowChart"></canvas>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-400">郵便番号フォーム</span>
            <span class="text-gray-800 font-medium">65%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">検索ワードリンク</span>
            <span class="text-gray-800 font-medium">35%</span>
          </div>
        </div>
      </div>
      
      <!-- 時間別案件流入 -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">時間別案件流入</h3>
        <div class="h-64 flex items-center justify-center">
          <canvas ref="timeChart"></canvas>
        </div>
        <div class="mt-4 flex items-center justify-between text-sm">
          <span class="text-gray-400">ピーク時間帯</span>
          <span class="text-gray-800 font-medium">14:00 - 16:00</span>
        </div>
      </div>
    </div>
    
    <!-- 緊急アラート -->
    <div class="card bg-red-900/20 border-red-800">
      <div class="flex items-start space-x-3">
        <svg class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800 mb-2">緊急対応が必要な項目</h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <span class="text-gray-300">未対応案件（3時間以上）</span>
              <span class="badge badge-danger">3件</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <span class="text-gray-300">デポジット残1件以下</span>
              <span class="badge badge-warning">2社</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <span class="text-gray-300">キャンセル申請</span>
              <span class="badge badge-danger">1件</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 下段：加盟店稼働状況 -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-800">加盟店稼働状況</h3>
        <button class="btn-secondary text-sm">
          詳細を見る
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">稼働中</span>
            <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          </div>
          <div class="text-2xl font-bold text-gray-800">{{ franchiseStatus.active }}</div>
          <div class="mt-2 text-xs text-gray-500">
            対応可能: {{ franchiseStatus.available }}社
          </div>
        </div>
        
        <div class="p-4 bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">一時停止</span>
            <span class="w-2 h-2 bg-amber-400 rounded-full"></span>
          </div>
          <div class="text-2xl font-bold text-gray-800">{{ franchiseStatus.paused }}</div>
          <div class="mt-2 text-xs text-gray-500">
            本日復帰予定: 2社
          </div>
        </div>
        
        <div class="p-4 bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-400">休止中</span>
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
          </div>
          <div class="text-2xl font-bold text-gray-800">{{ franchiseStatus.inactive }}</div>
          <div class="mt-2 text-xs text-gray-500">
            30日以上: 1社
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// チャート参照
const inflowChart = ref<HTMLCanvasElement>();
const timeChart = ref<HTMLCanvasElement>();
let inflowChartInstance: Chart | null = null;
let timeChartInstance: Chart | null = null;

// メトリクスデータ
const metrics = reactive({
  pendingApprovals: 3,
  newCases: 24,
  todayTransfers: 18,
  todayContracts: 6
});

// 加盟店ステータス
const franchiseStatus = reactive({
  active: 42,
  available: 38,
  paused: 5,
  inactive: 3
});

// リアルタイム更新シミュレーション
let updateInterval: NodeJS.Timeout;

onMounted(() => {
  // グラフ初期化
  initCharts();
  
  // リアルタイム更新（デモ用）
  updateInterval = setInterval(() => {
    // ランダムに値を更新
    metrics.newCases = Math.floor(Math.random() * 10) + 20;
    metrics.todayTransfers = Math.floor(Math.random() * 5) + 15;
  }, 5000);
});

onUnmounted(() => {
  // クリーンアップ
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (inflowChartInstance) {
    inflowChartInstance.destroy();
  }
  if (timeChartInstance) {
    timeChartInstance.destroy();
  }
});

const initCharts = () => {
  // 流入経路別グラフ
  if (inflowChart.value) {
    inflowChartInstance = new Chart(inflowChart.value, {
      type: 'doughnut',
      data: {
        labels: ['郵便番号フォーム', '検索ワードリンク'],
        datasets: [{
          data: [65, 35],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(168, 85, 247, 0.8)'
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(168, 85, 247, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#9CA3AF',
              padding: 20
            }
          }
        }
      }
    });
  }
  
  // 時間別案件流入グラフ
  if (timeChart.value) {
    timeChartInstance = new Chart(timeChart.value, {
      type: 'line',
      data: {
        labels: ['0時', '4時', '8時', '12時', '16時', '20時'],
        datasets: [{
          label: '案件数',
          data: [2, 1, 5, 12, 18, 8],
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(75, 85, 99, 0.3)'
            },
            ticks: {
              color: '#9CA3AF'
            }
          },
          y: {
            grid: {
              color: 'rgba(75, 85, 99, 0.3)'
            },
            ticks: {
              color: '#9CA3AF'
            }
          }
        }
      }
    });
  }
};
</script>