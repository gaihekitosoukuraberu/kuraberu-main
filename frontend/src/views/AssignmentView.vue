<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">案件割り振り</h1>
        <p class="mt-1 text-gray-600">新着案件の確認と加盟店への割り振り</p>
      </div>
      <div class="flex space-x-3">
        <button class="btn-secondary">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          フィルター
        </button>
        <button class="btn-primary neon-blue">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新規案件追加
        </button>
      </div>
    </div>
    
    <!-- 統計カード -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">未割り振り</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.unassigned }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">本日転送</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.todayTransferred }}</p>
          </div>
          <div class="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">成約待ち</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.pendingContract }}</p>
          </div>
          <div class="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-400 text-sm">緊急対応</p>
            <p class="text-2xl font-bold text-gray-800 mt-1">{{ stats.urgent }}</p>
          </div>
          <div class="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 案件テーブル -->
    <div class="card">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">新着案件一覧</h2>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-400">表示件数:</span>
          <select class="form-select w-20">
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="table-dark">
          <thead>
            <tr>
              <th>
                <input type="checkbox" class="rounded border-gray-600 bg-gray-800">
              </th>
              <th>流入日時</th>
              <th>顧客名</th>
              <th>電話番号</th>
              <th>郵便番号</th>
              <th>建物種別</th>
              <th>希望工事</th>
              <th>自動計算料金</th>
              <th>ステータス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="case_ in cases" :key="case_.id" @click="selectCase(case_)">
              <td @click.stop>
                <input type="checkbox" class="rounded border-gray-600 bg-gray-800">
              </td>
              <td>
                <div class="text-xs text-gray-500">{{ formatDate(case_.createdAt) }}</div>
                <div class="text-sm">{{ formatTime(case_.createdAt) }}</div>
              </td>
              <td class="font-medium">{{ case_.customerName }}</td>
              <td>
                <a :href="`tel:${case_.customerPhone}`" class="text-blue-400 hover:text-blue-300">
                  {{ case_.customerPhone }}
                </a>
              </td>
              <td>{{ case_.postalCode }}</td>
              <td>
                <span class="badge" :class="getBuildingTypeClass(case_.buildingType)">
                  {{ case_.buildingType }}
                  <span v-if="case_.floorCount">{{ case_.floorCount }}F</span>
                </span>
              </td>
              <td>
                <div class="max-w-xs truncate">{{ case_.constructionItems.join('、') }}</div>
              </td>
              <td class="font-semibold text-emerald-400">
                ¥{{ case_.autoCalculatedFee.toLocaleString() }}
              </td>
              <td>
                <span class="badge" :class="getStatusClass(case_.status)">
                  {{ case_.status }}
                </span>
              </td>
              <td @click.stop>
                <button @click="openAssignmentModal(case_)" class="btn-primary py-1 px-3 text-sm">
                  割り振り
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 案件詳細・割り振りモーダル -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/70 backdrop-blur-sm" @click="closeModal"></div>
          <div class="relative w-full max-w-6xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            <!-- モーダルヘッダー -->
            <div class="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold text-gray-800">案件詳細・割り振り設定</h3>
                <button @click="closeModal" class="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- モーダル本体 -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- 左側：顧客情報 -->
                <div class="space-y-6">
                  <div class="card">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">顧客情報</h4>
                    <dl class="space-y-3">
                      <div>
                        <dt class="text-sm text-gray-400">顧客名</dt>
                        <dd class="text-gray-800 font-medium">{{ selectedCase?.customerName }}</dd>
                      </div>
                      <div>
                        <dt class="text-sm text-gray-400">電話番号</dt>
                        <dd class="text-blue-400">{{ selectedCase?.customerPhone }}</dd>
                      </div>
                      <div>
                        <dt class="text-sm text-gray-400">住所</dt>
                        <dd class="text-gray-800">〒{{ selectedCase?.postalCode }} {{ selectedCase?.address }}</dd>
                      </div>
                      <div>
                        <dt class="text-sm text-gray-400">建物種別</dt>
                        <dd>
                          <span class="badge badge-info">
                            {{ selectedCase?.buildingType }}
                            <span v-if="selectedCase?.floorCount">{{ selectedCase?.floorCount }}階</span>
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt class="text-sm text-gray-400">希望工事内容</dt>
                        <dd class="text-gray-800">{{ selectedCase?.constructionItems.join('、') }}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <!-- 紹介料設定 -->
                  <div class="card">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">紹介料設定</h4>
                    <div class="space-y-4">
                      <div>
                        <label class="text-sm text-gray-400">自動計算額</label>
                        <div class="text-2xl font-bold text-emerald-400">
                          ¥{{ selectedCase?.autoCalculatedFee.toLocaleString() }}
                        </div>
                      </div>
                      
                      <div>
                        <label class="text-sm text-gray-400">手動調整</label>
                        <div class="flex space-x-2 mt-2">
                          <button 
                            v-for="preset in feePresets" 
                            :key="preset"
                            @click="setManualFee(preset)"
                            class="btn-secondary text-sm"
                            :class="{ 'ring-2 ring-blue-500': manualFee === preset }"
                          >
                            ¥{{ preset.toLocaleString() }}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label class="text-sm text-gray-400">カスタム金額</label>
                        <div class="mt-2">
                          <input 
                            type="range" 
                            v-model="manualFee"
                            min="0" 
                            max="50000" 
                            step="1000"
                            class="w-full"
                          >
                          <div class="flex justify-between text-xs text-gray-500 mt-1">
                            <span>¥0</span>
                            <span class="text-lg font-bold text-gray-800">¥{{ manualFee.toLocaleString() }}</span>
                            <span>¥50,000</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 右側：加盟店選択 -->
                <div class="space-y-6">
                  <div class="card">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">AI推薦加盟店</h4>
                    <div class="space-y-3">
                      <div 
                        v-for="franchise in recommendedFranchises" 
                        :key="franchise.id"
                        class="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                        :class="{ 'ring-2 ring-blue-500': selectedFranchises.includes(franchise.id) }"
                        @click="toggleFranchise(franchise.id)"
                      >
                        <div class="flex items-start justify-between">
                          <div class="flex items-start space-x-3">
                            <input 
                              type="checkbox" 
                              :checked="selectedFranchises.includes(franchise.id)"
                              class="mt-1 rounded border-gray-600 bg-gray-700"
                              @click.stop
                              @change="toggleFranchise(franchise.id)"
                            >
                            <div>
                              <div class="flex items-center space-x-2">
                                <span class="font-medium text-gray-800">{{ franchise.name }}</span>
                                <span class="text-xs text-gray-500">{{ franchise.code }}</span>
                              </div>
                              <div class="mt-1 text-sm text-gray-400">
                                AIスコア: <span class="text-blue-400 font-medium">{{ franchise.aiScore }}</span>
                              </div>
                              <div class="mt-2 flex flex-wrap gap-2">
                                <span v-if="franchise.hasDeposit" class="badge badge-success text-xs">
                                  デポジット有
                                </span>
                                <span v-if="franchise.isPriorityArea" class="badge badge-info text-xs">
                                  最優先エリア
                                </span>
                                <span class="badge badge-warning text-xs">
                                  ハンデ: {{ franchise.handicap > 0 ? '+' : ''}}{{ franchise.handicap }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- ステータス設定 -->
                  <div class="card">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">ステータス設定</h4>
                    <div>
                      <label class="text-sm text-gray-400">管理ステータス</label>
                      <select v-model="selectedStatus" class="form-select mt-2">
                        <option value="配信中">配信中</option>
                        <option value="配信済">配信済</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- アクションボタン -->
              <div class="mt-6 flex justify-end space-x-3">
                <button @click="closeModal" class="btn-secondary">
                  キャンセル
                </button>
                <button @click="executeAssignment" class="btn-primary neon-blue">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  転送実行
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

// 統計データ
const stats = reactive({
  unassigned: 12,
  todayTransferred: 8,
  pendingContract: 15,
  urgent: 2
});

// 案件データ（モック）
const cases = ref([
  {
    id: '1',
    createdAt: new Date(),
    customerName: '田中太郎',
    customerPhone: '090-1234-5678',
    postalCode: '150-0001',
    address: '東京都渋谷区神宮前1-1-1',
    buildingType: '戸建て',
    floorCount: null,
    constructionItems: ['外壁塗装', '屋根塗装（外壁工事含む）'],
    autoCalculatedFee: 20000,
    status: '新規'
  },
  {
    id: '2',
    createdAt: new Date(Date.now() - 3600000),
    customerName: '鈴木花子',
    customerPhone: '080-9876-5432',
    postalCode: '160-0022',
    address: '東京都新宿区新宿3-3-3',
    buildingType: 'マンション',
    floorCount: 5,
    constructionItems: ['外壁塗装', 'ベランダ防水（外壁工事含む）'],
    autoCalculatedFee: 30000,
    status: '見込み'
  }
]);

// AI推薦加盟店（モック）
const recommendedFranchises = ref([
  {
    id: 'F0001',
    code: 'F0001',
    name: '東京ペイント工業',
    aiScore: 95,
    hasDeposit: true,
    isPriorityArea: true,
    handicap: 1
  },
  {
    id: 'F0002',
    code: 'F0002',
    name: '渋谷塗装サービス',
    aiScore: 88,
    hasDeposit: true,
    isPriorityArea: false,
    handicap: 0
  },
  {
    id: 'F0003',
    code: 'F0003',
    name: '新宿リフォーム',
    aiScore: 82,
    hasDeposit: false,
    isPriorityArea: true,
    handicap: -1
  }
]);

// 選択状態
const showModal = ref(false);
const selectedCase = ref<any>(null);
const selectedFranchises = ref<string[]>([]);
const selectedStatus = ref('配信中');
const manualFee = ref(20000);
const feePresets = [5000, 10000, 20000, 30000];

// 関数
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ja-JP', { 
    month: '2-digit', 
    day: '2-digit' 
  }).format(date);
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(date);
};

const getBuildingTypeClass = (type: string) => {
  switch (type) {
    case '戸建て': return 'badge-info';
    case 'アパート': return 'badge-warning';
    case 'マンション': return 'badge-success';
    default: return 'badge';
  }
};

const getStatusClass = (status: string) => {
  switch (status) {
    case '新規': return 'badge-info';
    case '見込み': return 'badge-success';
    case '配信済': return 'badge-warning';
    default: return 'badge';
  }
};

const selectCase = (case_: any) => {
  // 行クリックで詳細表示など
};

const openAssignmentModal = (case_: any) => {
  selectedCase.value = case_;
  manualFee.value = case_.autoCalculatedFee;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedCase.value = null;
  selectedFranchises.value = [];
};

const toggleFranchise = (id: string) => {
  const index = selectedFranchises.value.indexOf(id);
  if (index > -1) {
    selectedFranchises.value.splice(index, 1);
  } else {
    selectedFranchises.value.push(id);
  }
};

const setManualFee = (fee: number) => {
  manualFee.value = fee;
};

const executeAssignment = () => {
  // 転送実行処理
  console.log('転送実行:', {
    case: selectedCase.value,
    franchises: selectedFranchises.value,
    fee: manualFee.value,
    status: selectedStatus.value
  });
  closeModal();
};
</script>

<style scoped>
/* モーダルアニメーション */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}

/* カスタムスライダー */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-track {
  background: #374151;
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: #3b82f6;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  margin-top: -7px;
}

input[type="range"]::-moz-range-track {
  background: #374151;
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-moz-range-thumb {
  background: #3b82f6;
  border: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
}
</style>