<template>
  <div class="gas-api-demo">
    <h2>🏠 GAS WebApp API テスト</h2>
    
    <!-- 接続テスト -->
    <div class="test-section">
      <h3>接続テスト</h3>
      
      <!-- GET接続テスト -->
      <div class="button-group">
        <button 
          @click="handleTestConnection" 
          :disabled="isLoading"
          class="btn-primary"
        >
          {{ isLoading ? '接続中...' : 'GET 接続テスト' }}
        </button>
        
        <!-- POST接続テスト -->
        <button 
          @click="handleTestConnectionPost" 
          :disabled="isLoading"
          class="btn-secondary"
        >
          {{ isLoading ? '送信中...' : 'POST 接続テスト' }}
        </button>
        
        <!-- POST Safe接続テスト -->
        <button 
          @click="handleTestConnectionPostSafe" 
          :disabled="isLoading"
          class="btn-success"
        >
          {{ isLoading ? '送信中...' : 'POST Safe 接続テスト' }}
        </button>
      </div>
      
      <div v-if="connectionResult" class="result-box success">
        <h4>✅ 接続成功</h4>
        <pre>{{ JSON.stringify(connectionResult, null, 2) }}</pre>
      </div>
    </div>

    <!-- 詳細アサインメントスコア取得 -->
    <div class="test-section">
      <h3>詳細アサインメントスコア取得</h3>
      <div class="form-group">
        <label>Parent ID:</label>
        <input v-model="parentId" placeholder="PARENT-001" />
      </div>
      <div class="form-group">
        <label>Inquiry ID:</label>
        <input v-model="inquiryId" placeholder="INQ-001" />
      </div>
      <button 
        @click="handleGetAssignmentScores" 
        :disabled="isLoading"
        class="btn-primary"
      >
        {{ isLoading ? '取得中...' : 'スコア取得' }}
      </button>
      
      <div v-if="assignmentScores" class="result-box success">
        <h4>📊 アサインメントスコア</h4>
        <pre>{{ JSON.stringify(assignmentScores, null, 2) }}</pre>
      </div>
    </div>

    <!-- ケース割り当て -->
    <div class="test-section">
      <h3>ケース割り当て</h3>
      <div class="form-group">
        <label>Mode:</label>
        <select v-model="assignmentMode">
          <option value="auto">自動割り当て</option>
          <option value="manual">手動割り当て</option>
        </select>
      </div>
      <button 
        @click="handleAssignCase" 
        :disabled="isLoading"
        class="btn-primary"
      >
        {{ isLoading ? '割り当て中...' : 'ケース割り当て' }}
      </button>
      
      <div v-if="assignmentResult" class="result-box success">
        <h4>🎯 割り当て結果</h4>
        <pre>{{ JSON.stringify(assignmentResult, null, 2) }}</pre>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="result-box error">
      <h4>❌ エラー</h4>
      <p>{{ error }}</p>
    </div>

    <!-- JSONPテストボタン（常に表示） -->
    <div class="fallback-suggestion">
      <p><strong>💡 JSONPフォールバック接続テスト：</strong></p>
      <button 
        @click="handleTestConnectionJsonp" 
        :disabled="isLoading"
        class="btn-secondary"
      >
        {{ isLoading ? 'JSONP送信中...' : 'JSONP で接続テスト' }}
      </button>
    </div>

    <!-- デバッグ情報 -->
    <div class="debug-section">
      <h3>🔧 デバッグ情報</h3>
      <p><strong>GAS WebApp URL:</strong> {{ gasApiService.baseUrl }}</p>
      <p><strong>現在の状態:</strong> {{ isLoading ? 'Loading' : 'Ready' }}</p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useGasApi } from '../vue-gas-api-service.js';

export default {
  name: 'GasApiDemo',
  setup() {
    // GAS API コンポーザブルを使用
    const {
      isLoading,
      error,
      gasApiService,
      testConnection,
      testConnectionPost,
      testConnectionPostSafe,
      testConnectionJsonp,
      getDetailedAssignmentScores,
      assignCaseToChild
    } = useGasApi();

    // リアクティブデータ
    const connectionResult = ref(null);
    const assignmentScores = ref(null);
    const assignmentResult = ref(null);
    
    const parentId = ref('PARENT-TEST-001');
    const inquiryId = ref('INQ-TEST-001');
    const assignmentMode = ref('auto');

    // 接続テスト（通常のGET）
    const handleTestConnection = async () => {
      try {
        const result = await testConnection();
        connectionResult.value = result;
        console.log('✅ 接続テスト成功:', result);
      } catch (err) {
        // Network ErrorをCORS Errorに補正
        if (err.message && err.message.includes('Network')) {
          error.value = 'CORS Network Error';
        }
        console.error('❌ 接続テストエラー:', err);
      }
    };

    // 接続テスト（POST URLエンコード版）
    const handleTestConnectionPost = async () => {
      try {
        const result = await testConnectionPost();
        connectionResult.value = result;
        console.log('✅ POST接続テスト成功:', result);
      } catch (err) {
        // Network ErrorをCORS Errorに補正
        if (err.message && err.message.includes('Network')) {
          error.value = 'CORS Network Error';
        }
        console.error('❌ POST接続テストエラー:', err);
      }
    };

    // 接続テスト（POST Safe版）
    const handleTestConnectionPostSafe = async () => {
      try {
        const result = await testConnectionPostSafe();
        connectionResult.value = result;
        console.log('✅ POST Safe接続テスト成功:', result);
      } catch (err) {
        // Network ErrorをCORS Errorに補正
        if (err.message && err.message.includes('Network')) {
          error.value = 'CORS Network Error';
        }
        console.error('❌ POST Safe接続テストエラー:', err);
      }
    };

    // 接続テスト（JSONPフォールバック）
    const handleTestConnectionJsonp = async () => {
      try {
        console.log('🔄 JSONP接続テスト開始...');
        // エラーをクリア
        error.value = null;
        const result = await testConnectionJsonp();
        // 結果を画面に表示
        connectionResult.value = result;
        console.log('✅ JSONP接続テスト成功:', result);
      } catch (err) {
        console.error('❌ JSONP接続テストエラー:', err);
        // JSONPエラーをわかりやすく表示
        if (err.message && err.message.includes('timeout')) {
          error.value = 'JSONP接続がタイムアウトしました。GAS WebAppの設定を確認してください。';
        } else if (err.message && err.message.includes('failed')) {
          error.value = 'JSONP接続に失敗しました。GAS WebAppが動作していない可能性があります。';
        } else {
          error.value = `JSONP接続エラー: ${err.message}`;
        }
        // 結果表示をクリア
        connectionResult.value = null;
      }
    };

    // 詳細アサインメントスコア取得
    const handleGetAssignmentScores = async () => {
      try {
        const result = await getDetailedAssignmentScores(
          parentId.value,
          inquiryId.value,
          { includeRecommendations: true }
        );
        assignmentScores.value = result;
        console.log('✅ スコア取得成功:', result);
      } catch (err) {
        // Network ErrorをCORS Errorに補正
        if (err.message && err.message.includes('Network')) {
          error.value = 'CORS Network Error';
        }
        console.error('❌ スコア取得エラー:', err);
      }
    };

    // ケース割り当て
    const handleAssignCase = async () => {
      try {
        const result = await assignCaseToChild(
          parentId.value,
          inquiryId.value,
          assignmentMode.value,
          { autoNotify: true }
        );
        assignmentResult.value = result;
        console.log('✅ ケース割り当て成功:', result);
      } catch (err) {
        // Network ErrorをCORS Errorに補正
        if (err.message && err.message.includes('Network')) {
          error.value = 'CORS Network Error';
        }
        console.error('❌ ケース割り当てエラー:', err);
      }
    };

    return {
      // 状態
      isLoading,
      error,
      connectionResult,
      assignmentScores,
      assignmentResult,
      
      // フォームデータ
      parentId,
      inquiryId,
      assignmentMode,
      
      // API サービス
      gasApiService,
      
      // ハンドラー関数
      handleTestConnection,
      handleTestConnectionPost,
      handleTestConnectionPostSafe,
      handleTestConnectionJsonp,
      handleGetAssignmentScores,
      handleAssignCase
    };
  }
};
</script>

<style scoped>
.gas-api-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 200px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.result-box {
  margin-top: 15px;
  padding: 15px;
  border-radius: 4px;
}

.result-box.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.result-box.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.result-box pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.fallback-suggestion {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(255, 193, 7, 0.1);
  border-left: 4px solid #ffc107;
}

.debug-section {
  margin-top: 30px;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 4px;
  font-size: 12px;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

h3 {
  color: #555;
  margin-bottom: 15px;
}

h4 {
  margin-bottom: 10px;
}
</style>