<template>
  <div class="assignment-container" :class="modeBackgroundClass">
    <!-- 開発環境のみ表示 -->
    <AssignmentTestPanel v-if="isDevelopment" />
    
    <!-- モード切り替えタブ -->
    <div class="mode-tabs-container">
      <div class="mode-tabs">
        <button 
          class="mode-tab"
          :class="{ active: state.assignmentMode === 'manual' }"
          @click="switchMode('manual')"
        >
          🖱️ 手動モード
        </button>
        <button 
          class="mode-tab"
          :class="{ active: state.assignmentMode === 'auto' }"
          @click="switchMode('auto')"
        >
          🤖 自動モード
        </button>
      </div>
    </div>
    
    <!-- ヘッダーセクション -->
    <div class="header-section">
      <h2>案件振り分け - {{ state.inquiryId }}</h2>
      <div v-if="state.inquiryInfo" class="inquiry-details">
        <p><strong>案件詳細:</strong> {{ state.inquiryInfo.category }} @ {{ state.inquiryInfo.prefecture }}{{ state.inquiryInfo.city }}</p>
        <p v-if="state.inquiryInfo.budget"><strong>予算:</strong> {{ state.inquiryInfo.budget }} | <strong>希望時期:</strong> {{ state.inquiryInfo.timeline }}</p>
      </div>
      
      <div class="assignment-mode-section">
        <label class="checkbox-label" v-if="state.assignmentMode === 'auto'">
          <input 
            type="checkbox" 
            v-model="state.excludePausedAccounts"
            @change="onExcludePausedChange"
          > 
          一時停止中アカウントを除外
        </label>
      </div>
      
      <!-- 条件設定ボタン -->
      <div class="condition-settings-toggle" v-if="!state.apiStatus.loading && !state.apiStatus.error">
        <button 
          class="btn btn-secondary btn-settings"
          @click="toggleConditionSettings"
        >
          <span v-if="state.showConditionSettings">🔽 条件設定を閉じる</span>
          <span v-else>⚙️ 条件設定</span>
        </button>
      </div>
    </div>
    
    <!-- 通信状態表示 -->
    <div v-if="state.apiStatus.loading" class="api-status loading">
      <div class="loading-spinner"></div>
      <p>{{ state.apiStatus.message }}</p>
    </div>
    
    <div v-if="state.apiStatus.error" class="api-status error">
      <p>❌ {{ state.apiStatus.error }}</p>
      <button class="btn btn-secondary btn-sm" @click="refreshData">再試行</button>
    </div>
    
    <!-- 条件設定セクション（統合） -->
    <div class="condition-settings-section" v-if="state.showConditionSettings && !state.apiStatus.loading">
      
      <!-- ソート優先度設定 -->
      <div class="sort-priority-section">
        <h3>ソート優先度設定 <small>(共通設定・ドラッグで順序変更)</small></h3>
        
        <!-- 固定項目（わがまま設定） -->
        <div class="priority-items">
          <div class="priority-item fixed-item">
            <span class="priority-badge">1</span>
            <span class="priority-label">わがまま設定（最優先）</span>
            <span class="fixed-badge">🔒 固定</span>
          </div>
        </div>
        
        <!-- ドラッグ可能な項目 -->
        <draggable 
          v-model="draggableSortItems" 
          class="priority-items"
          item-key="key"
          :disabled="state.sortUpdating"
          @end="updateSortPriority"
        >
          <template #item="{ element, index }">
            <div 
              class="priority-item"
              :class="{ 'updating': state.sortUpdating }"
            >
              <span class="priority-badge">{{ index + 2 }}</span>
              <span class="priority-label">{{ element.label }}</span>
              <span class="drag-handle">⋮⋮</span>
            </div>
          </template>
        </draggable>
        <p v-if="state.sortUpdating" class="sort-status">ソート優先度を更新中...</p>
      </div>
      
      <!-- 自動振り分け実行ボタン（自動モード時のみ） -->
      <div class="auto-assignment-action" v-if="state.assignmentMode === 'auto'">
        <button 
          class="btn btn-primary btn-large" 
          @click="executeAutoAssignment"
          :disabled="state.autoAssigning"
        >
          <span v-if="state.autoAssigning">自動振り分け実行中...</span>
          <span v-else>🤖 自動振り分け実行</span>
        </button>
        <p class="auto-assignment-description">
          💡 最適な子アカウントを自動選択して振り分けを実行します
        </p>
      </div>
      
      <!-- わがまま設定セクション（LINEライクUI） -->
      <div class="wagamama-settings-section">
      <h3>📝 リスト振り分けわがまま設定</h3>
      
      <!-- プロンプト表示窓 -->
      <div class="prompt-display-window" v-if="state.finalPrompt || state.currentWagamamaCondition">
        <div class="prompt-header">
          <h4>🎯 現在のわがまま条件</h4>
          <div class="header-buttons">
            <button 
              class="btn-edit" 
              @click="editPrompt"
              :disabled="state.chatting"
            >
              ✏️ 修正
            </button>
            <button 
              class="btn-delete" 
              @click="deletePrompt"
              :disabled="state.chatting"
            >
              🗑️ 削除
            </button>
          </div>
        </div>
        <div class="prompt-content">
          <div class="formatted-condition-display">
            <div v-for="(line, index) in formattedCurrentConditionLines" :key="index" class="condition-line-display">
              {{ line }}
            </div>
          </div>
        </div>
        <div class="prompt-meta" v-if="state.currentWagamamaCondition">
          <span class="created-date">作成: {{ formatDateTime(state.currentWagamamaCondition.createdAt) }}</span>
        </div>
      </div>
      
      <!-- 初期時は新規作成ボタンを表示 -->
      <div v-if="!state.finalPrompt && !state.currentWagamamaCondition && !state.showChatInterface" class="new-condition-section">
        <p class="hint-text">🤖 AIとチャットしてわがまま条件を作成しましょう</p>
        <button 
          class="btn btn-primary btn-lg"
          @click="startNewCondition"
        >
          💬 新規作成
        </button>
      </div>
      
      <!-- LINEライクチャットUI -->
      <div class="line-chat-container" v-show="state.showChatInterface">
        <!-- チャットメッセージエリア -->
        <div class="chat-messages-area" ref="chatMessagesArea">
          <!-- 初期メッセージ -->
          <div v-if="state.chatHistory.length === 0" class="welcome-message">
            <div class="gpt-bubble">
              <div class="bubble-content">
                😊 こんにちは！わがままな振り分け条件を教えてください。<br>
                例：「3月は鈴木さんストップして。田中さんには最優先で1件振って」
              </div>
            </div>
          </div>
          
          <!-- チャットメッセージ -->
          <div 
            v-for="(message, index) in state.chatHistory" 
            :key="index"
            class="message-wrapper"
            :class="message.role"
          >
            <div v-if="message.role === 'user'" class="user-bubble">
              <div class="bubble-content">{{ message.content }}</div>
              <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>
            </div>
            
            <div v-else class="gpt-bubble">
              <div class="gpt-avatar">🤖</div>
              <div class="bubble-wrapper">
                <div class="bubble-content">{{ message.content }}</div>
                <div class="message-time">{{ formatMessageTime(message.timestamp) }}</div>
              </div>
            </div>
          </div>
          
          <!-- タイピングインジケーター -->
          <div v-if="state.chatting && !state.waitingForUserResponse" class="typing-indicator">
            <div class="gpt-bubble">
              <div class="gpt-avatar">🤖</div>
              <div class="bubble-wrapper">
                <div class="typing-animation">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 入力エリア -->
        <div class="chat-input-area">
          <div class="input-container">
            <textarea 
              v-model="currentInputText"
              :placeholder="inputPlaceholder"
              class="chat-textarea"
              rows="3"
              @input="adjustTextareaHeight"
              ref="chatInput"
            ></textarea>
            <button 
              class="send-button"
              @click="handleSendMessage"
              :disabled="!currentInputText.trim() || (state.chatting && !state.waitingForUserResponse)"
            >
              📤
            </button>
          </div>
          
          <!-- 操作ボタン -->
          <div v-if="state.showChatInterface" class="action-buttons">
            <button 
              class="btn btn-primary btn-sm"
              @click="applyPromptFromChat"
              :disabled="state.savingCondition || state.confirmationLoading || (!state.finalWagamamaPrompt && state.chatHistory.length === 0)"
            >
              <span v-if="state.savingCondition || state.confirmationLoading">
                <div class="button-loading">
                  <div class="loading-spinner-small"></div>
                  <span>処理中...</span>
                </div>
              </span>
              <span v-else>💾 この条件で保存</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 最終確認モーダル -->
      <div v-if="state.showFinalConfirmation" class="final-confirmation-modal">
        <div class="modal-overlay" @click="cancelFinalConfirmation"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>📋 わがまま条件の最終確認</h3>
          </div>
          <div class="modal-body">
            <div v-if="state.confirmationLoading" class="confirmation-loading">
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: state.loadingProgress + '%' }"></div>
                </div>
                <div class="progress-text">{{ state.loadingStage }}</div>
              </div>
              <div class="loading-steps">
                <div class="step" :class="{ active: state.loadingStep >= 1, completed: state.loadingStep > 1 }">
                  <span class="step-icon">🔍</span>
                  <span class="step-text">チャット履歴を解析中</span>
                </div>
                <div class="step" :class="{ active: state.loadingStep >= 2, completed: state.loadingStep > 2 }">
                  <span class="step-icon">🤖</span>
                  <span class="step-text">AI条件整理中</span>
                </div>
                <div class="step" :class="{ active: state.loadingStep >= 3, completed: state.loadingStep > 3 }">
                  <span class="step-icon">✨</span>
                  <span class="step-text">最終ブラッシュアップ中</span>
                </div>
              </div>
            </div>
            <div v-else class="condition-preview">
              <h4>🎯 設定される条件：</h4>
              <div class="condition-text formatted-condition">
                <div v-for="(line, index) in formattedConditionLines" :key="index" class="condition-line">
                  {{ line }}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button 
              class="btn btn-secondary"
              @click="cancelFinalConfirmation"
            >
              ❌ キャンセル
            </button>
            <button 
              class="btn btn-primary"
              @click="confirmFinalCondition"
              :disabled="state.confirmationLoading"
            >
              <span v-if="state.confirmationLoading">処理中...</span>
              <span v-else>✅ この内容で確定</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- AI要約結果 -->
      <div v-if="state.wagamamaSummary" class="wagamama-summary-section">
        <h4>AI要約結果：</h4>
        <div class="summary-preview">
          <p class="summary-text">{{ state.wagamamaSummary.text }}</p>
          <div class="summary-details">
            <p><strong>対象者：</strong>{{ state.wagamamaSummary.targetPerson || '指定なし' }}</p>
            <p><strong>期間：</strong>{{ state.wagamamaSummary.period || '指定なし' }}</p>
            <p><strong>条件：</strong>{{ state.wagamamaSummary.condition || '指定なし' }}</p>
          </div>
        </div>
        
        <!-- GPT確認質問 -->
        <div v-if="state.wagamamaSummary.questions && state.wagamamaSummary.questions.length > 0" class="gpt-questions-section">
          <h5>🤖 GPTからの確認質問：</h5>
          <div v-for="(question, index) in state.wagamamaSummary.questions" :key="index" class="question-item">
            <p class="question-text">{{ question.text }}</p>
            <div class="question-options">
              <button 
                v-for="option in question.options" 
                :key="option.value"
                class="btn btn-option"
                :class="{ 'selected': question.selectedAnswer === option.value }"
                @click="selectQuestionAnswer(index, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
            <div v-if="question.allowCustomInput" class="custom-input-section">
              <input 
                v-model="question.customAnswer"
                placeholder="その他の回答を入力..."
                class="custom-input"
              />
            </div>
          </div>
          
          <div class="questions-actions">
            <button 
              class="btn btn-primary"
              @click="processQuestionsAndSave"
              :disabled="!allQuestionsAnswered || state.savingCondition"
            >
              <span v-if="state.savingCondition">条件確定中...</span>
              <span v-else>✅ 回答完了 - 条件を保存</span>
            </button>
          </div>
        </div>
        
        <!-- 質問がない場合の通常保存 -->
        <div v-else class="summary-actions">
          <button 
            class="btn btn-primary"
            @click="saveWagamamaCondition"
            :disabled="state.savingCondition"
          >
            <span v-if="state.savingCondition">保存中...</span>
            <span v-else>💾 条件を保存</span>
          </button>
          <button 
            class="btn btn-secondary"
            @click="clearWagamamaSummary"
          >
            キャンセル
          </button>
        </div>
      </div>
      
    </div>
    
    </div>
    
    <!-- 子アカウント一覧 -->
    <div v-if="!state.apiStatus.loading && !state.apiStatus.error" class="child-accounts-list">
      <h3>対象子アカウント一覧</h3>
      
      <div 
        v-for="(child, childId) in sortedChildAccounts" 
        :key="childId"
        class="child-account-card"
        :class="getCardClass(child.matchLevel)"
      >
        <!-- アカウントヘッダー -->
        <div class="account-header">
          <div class="account-name">
            <span class="status-indicator" :class="getStatusIndicatorClass(child.matchLevel)">
              {{ getStatusEmoji(child.matchLevel) }}
            </span>
            {{ child.name }} ({{ child.status }})
          </div>
          <div class="ai-match-score">
            <div class="score-label">AIマッチ度: <strong>{{ child.aiMatchPercentage }}%</strong></div>
            <div class="score-bar-container">
              <div class="score-bar-bg">
                <div 
                  class="score-bar-fill"
                  :class="getScoreBarColor(child.aiMatchPercentage)"
                  :style="{ width: getScoreBarWidth(child.aiMatchPercentage) }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- アカウント統計情報 -->
        <div class="account-stats">
          <div class="stat-item">
            <span class="stat-label">エリア対応:</span>
            <span class="stat-value">{{ getAreaMatchText(child.matchReasons['エリア対応経験']) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最終ログイン:</span>
            <span class="stat-value">{{ formatLastLogin(child.lastLogin) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">担当案件:</span>
            <span class="stat-value">{{ child.metadata.currentCaseCount }}件</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">対応余力:</span>
            <span class="stat-value">{{ getWorkloadText(child.matchReasons['現在の負荷状況']) }}</span>
          </div>
        </div>
        
        <!-- アクションボタン -->
        <div class="account-actions">
          <button 
            class="btn btn-secondary btn-sm"
            @click="showMatchReasons(childId)"
            :disabled="loadingDetails[childId]"
          >
            <span v-if="loadingDetails[childId]">読み込み中...</span>
            <span v-else>マッチ根拠 ▼</span>
          </button>
          <button 
            class="btn btn-secondary btn-sm"
            @click="showAIAdvice(childId)"
            :disabled="loadingAdvice[childId]"
          >
            <span v-if="loadingAdvice[childId]">生成中...</span>
            <span v-else>💡 AIアドバイス</span>
          </button>
          <button 
            class="btn btn-primary"
            @click="confirmAssignment(childId)"
            :disabled="state.assigningChildId === childId"
          >
            <span v-if="state.assigningChildId === childId">振り分け中...</span>
            <span v-else>選択して振り分け</span>
          </button>
        </div>
      </div>
      
      <!-- アカウントが見つからない場合 -->
      <div v-if="Object.keys(state.childAccounts).length === 0" class="no-accounts-message">
        <p>💡 対象の子アカウントが見つかりません</p>
        <p>親アカウントに紐づく有効な子アカウントを確認してください。</p>
        <button class="btn btn-primary" @click="refreshData">データを再読み込み</button>
      </div>
    </div>
    
    <!-- マッチ根拠詳細モーダル -->
    <div v-if="state.showMatchModal" class="modal" @click="closeMatchModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>マッチ根拠詳細</h3>
          <button class="close-btn" @click="closeMatchModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="state.selectedChildForMatch" class="match-reasons-detail">
            <h4>{{ state.selectedChildForMatch.name }}さんとの相性分析</h4>
            
            <div class="reason-item" v-for="(value, reason) in state.selectedChildForMatch.matchReasons" :key="reason">
              <div class="reason-header">
                <span class="reason-label">{{ reason }}</span>
                <span class="reason-score">{{ Math.round(value) }}%</span>
              </div>
              <div class="reason-bar">
                <div 
                  class="reason-fill" 
                  :style="{ width: value + '%' }"
                  :class="getReasonBarClass(value)"
                ></div>
              </div>
              <p class="reason-description">{{ getReasonDescription(reason, value) }}</p>
            </div>
            
            <div class="total-match">
              <h4>総合マッチ度: {{ state.selectedChildForMatch.aiMatchPercentage }}%</h4>
              <div class="score-bar-container">
                <div class="score-bar-bg">
                  <div 
                    class="score-bar-fill"
                    :class="getScoreBarColor(state.selectedChildForMatch.aiMatchPercentage)"
                    :style="{ width: getScoreBarWidth(state.selectedChildForMatch.aiMatchPercentage) }"
                  ></div>
                </div>
              </div>
              <p class="match-summary">{{ state.selectedChildForMatch.recommendation }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- AIアドバイスモーダル -->
    <div v-if="state.showAdviceModal" class="modal" @click="closeAdviceModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>💡 AIアドバイス</h3>
          <button class="close-btn" @click="closeAdviceModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="state.currentAdvice.loading" class="advice-loading">
            <div class="loading-spinner"></div>
            <p>AIアドバイスを生成中...</p>
          </div>
          
          <div v-else-if="state.currentAdvice.data" class="advice-content">
            <div class="advice-header">
              <span 
                class="advice-type-badge" 
                :class="getAdviceTypeClass(state.currentAdvice.data.type)"
              >
                {{ getAdviceTypeLabel(state.currentAdvice.data.type) }}
              </span>
              <div class="advice-match">
                <span>マッチ度: {{ state.currentAdvice.data.aiMatchPercentage }}%</span>
                <div class="score-bar-container inline">
                  <div class="score-bar-bg">
                    <div 
                      class="score-bar-fill"
                      :class="getScoreBarColor(state.currentAdvice.data.aiMatchPercentage)"
                      :style="{ width: getScoreBarWidth(state.currentAdvice.data.aiMatchPercentage) }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="advice-text">
              <p>{{ state.currentAdvice.data.text }}</p>
              <p v-if="state.currentAdvice.data.actionSuggestion" class="action-suggestion">
                <strong>{{ state.currentAdvice.data.actionSuggestion }}</strong>
              </p>
            </div>
            
            <div class="advice-disclaimer">
              <small>{{ state.currentAdvice.data.disclaimer }}</small>
            </div>
          </div>
          
          <div v-else-if="state.currentAdvice.error" class="advice-error">
            <p>❌ {{ state.currentAdvice.error }}</p>
            <button class="btn btn-secondary" @click="retryAdvice">再試行</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 振り分け確認モーダル -->
    <div v-if="state.showConfirmModal" class="modal" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>案件振り分け確認</h3>
          <button class="close-btn" @click="closeConfirmModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="state.selectedChildForAssignment" class="assignment-confirmation">
            <p>以下の子アカウントに案件を振り分けしますか？</p>
            
            <div class="selected-child-summary">
              <h4>{{ state.selectedChildForAssignment.name }}</h4>
              <div class="confirmation-score">
                <p>AIマッチ度: <strong>{{ state.selectedChildForAssignment.aiMatchPercentage }}%</strong></p>
                <div class="score-bar-container">
                  <div class="score-bar-bg">
                    <div 
                      class="score-bar-fill"
                      :class="getScoreBarColor(state.selectedChildForAssignment.aiMatchPercentage)"
                      :style="{ width: getScoreBarWidth(state.selectedChildForAssignment.aiMatchPercentage) }"
                    ></div>
                  </div>
                </div>
              </div>
              <p>{{ state.selectedChildForAssignment.recommendation }}</p>
            </div>
            
            <div class="confirmation-actions">
              <button class="btn btn-secondary" @click="closeConfirmModal">
                キャンセル
              </button>
              <button 
                class="btn btn-primary" 
                @click="executeAssignment"
                :disabled="state.assigningChildId"
              >
                <span v-if="state.assigningChildId">振り分け実行中...</span>
                <span v-else>振り分け実行</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- エラートースト -->
    <div v-if="state.toast.show" class="toast" :class="state.toast.type">
      <div class="toast-content">
        <span class="toast-icon">{{ state.toast.type === 'error' ? '❌' : '✅' }}</span>
        <span class="toast-message">{{ state.toast.message }}</span>
        <button class="toast-close" @click="hideToast">&times;</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, nextTick, toRef } from 'vue'
import axios from 'axios'
import draggable from 'vuedraggable'
import AssignmentTestPanel from './AssignmentTestPanel.vue'

export default {
  name: 'AssignmentView',
  components: {
    draggable,
    AssignmentTestPanel
  },
  setup() {
    const isDevelopment = ref(process.env.NODE_ENV === 'development')
    
    const state = reactive({
      // 基本データ
      parentId: 'PARENT-TEST-001',
      inquiryId: 'INQ-TEST-002',
      assignmentMode: 'manual', // 'auto' | 'manual'
      excludePausedAccounts: true,
      
      // 子アカウントデータ
      childAccounts: {},
      inquiryInfo: null,
      
      // ソート設定
      sortPriorityItems: [
        { key: 'wagamama', label: 'わがまま設定（最優先）', fixed: true },
        { key: 'area', label: 'エリア一致度' },
        { key: 'workload', label: '案件保有数' },
        { key: 'sequence', label: '担当順' }
      ],
      sortUpdating: false,
      
      // API状態管理
      apiStatus: {
        loading: false,
        error: null,
        message: ''
      },
      
      // モーダル状態
      showMatchModal: false,
      selectedChildForMatch: null,
      showAdviceModal: false,
      currentAdvice: {
        loading: false,
        data: null,
        error: null,
        childId: null
      },
      showConfirmModal: false,
      selectedChildForAssignment: null,
      
      // 振り分け処理
      assigningChildId: null,
      autoAssigning: false,
      
      // 条件設定表示管理
      showConditionSettings: false,
      
      // わがまま設定（単一統合プロンプト仕様）
      wagamamaInput: '',
      wagamamaSummary: null,
      generatingSummary: false,
      savingCondition: false,
      currentWagamamaCondition: null, // 現在有効な条件（1つのみ）
      
      // チャット形式わがまま設定
      chatHistory: [],
      chatting: false,
      waitingForUserResponse: false,
      chatCompleted: false,
      finalWagamamaPrompt: '',
      finalPrompt: '', // プロンプト表示窓用
      showChatInterface: false, // チャット画面の表示制御
      
      // 入力関連
      currentInputText: '',
      
      // 最終確認画面
      showFinalConfirmation: false,
      finalConditionText: '',
      confirmationLoading: false,
      loadingProgress: 0,
      loadingStep: 0,
      loadingStage: '',
      
      // トースト通知
      toast: {
        show: false,
        type: 'success', // 'success' | 'error'
        message: ''
      }
    })
    
    const loadingDetails = ref({})
    const loadingAdvice = ref({})
    
    const sortedChildAccounts = computed(() => {
      const accounts = Object.entries(state.childAccounts)
      
      // ソート優先度に基づいてソート
      return accounts
        .sort(([, a], [, b]) => {
          // AIマッチ度の降順でソート
          return b.aiMatchPercentage - a.aiMatchPercentage
        })
        .reduce((acc, [id, account]) => {
          acc[id] = account
          return acc
        }, {})
    })
    
    // 条件テキストを改行で分割してフォーマット（最終確認用）
    const formattedConditionLines = computed(() => {
      if (!state.finalConditionText) return []
      
      // 番号付きの行を検出して分割
      const lines = []
      const text = state.finalConditionText
      
      // 1. 2. 3. などの番号で分割
      const parts = text.split(/(?=\d+\.\s)/)
      
      parts.forEach(part => {
        const trimmed = part.trim()
        if (trimmed) {
          lines.push(trimmed)
        }
      })
      
      return lines.length > 0 ? lines : [text]
    })
    
    // 現在の条件テキストを改行で分割してフォーマット（現在条件表示用）
    const formattedCurrentConditionLines = computed(() => {
      const currentText = state.finalPrompt || state.currentWagamamaCondition?.text
      if (!currentText) return ['条件未設定']
      
      // 番号付きの行を検出して分割
      const lines = []
      const text = currentText
      
      // 1. 2. 3. などの番号で分割
      const parts = text.split(/(?=\d+\.\s)/)
      
      parts.forEach(part => {
        const trimmed = part.trim()
        if (trimmed) {
          lines.push(trimmed)
        }
      })
      
      return lines.length > 0 ? lines : [text]
    })
    
    // ドラッグ可能なソート項目（わがまま設定を除外）
    const draggableSortItems = computed({
      get() {
        return state.sortPriorityItems.filter(item => !item.fixed)
      },
      set(newValue) {
        // わがまま設定を先頭に保持して、残りを更新
        state.sortPriorityItems = [
          state.sortPriorityItems.find(item => item.fixed),
          ...newValue
        ]
      }
    })
    
    // API通信関連（CORS対応版）
    const callGASAPI = async (functionName, params) => {
      try {
        // text/plainでプリフライト回避（CORS対応）
        const payload = JSON.stringify({
          function: functionName,
          parameters: params
        })
        
        console.log(`🔗 GAS API呼び出し (CORS対応): ${functionName}`, params)
        
        const response = await axios.post(process.env.VUE_APP_GAS_WEBAPP_URL, payload, {
          headers: {
            'Content-Type': 'text/plain'  // プリフライト回避
          },
          timeout: 30000 // 30秒タイムアウト
        })
        
        console.log(`✅ GAS API応答: ${functionName}`, response.data)
        return response.data
        
      } catch (error) {
        console.error(`❌ GAS API エラー: ${functionName}`, error)
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('通信がタイムアウトしました。しばらく時間をおいて再試行してください。')
        } else if (error.response) {
          throw new Error(`サーバーエラー: ${error.response.status} - ${error.response.statusText}`)
        } else if (error.request) {
          throw new Error('サーバーに接続できませんでした。ネットワーク接続を確認してください。')
        } else {
          throw new Error(`通信エラー: ${error.message}`)
        }
      }
    }
    
    // データ読み込み
    const loadAssignmentData = async () => {
      state.apiStatus = {
        loading: true,
        error: null,
        message: '子アカウント情報を取得中...'
      }
      
      try {
        const response = await callGASAPI('getDetailedAssignmentScores', {
          parentId: state.parentId,
          inquiryId: state.inquiryId,
          options: {}
        })
        
        if (response.success) {
          state.childAccounts = response.data || {}
          state.inquiryInfo = response.inquiryInfo || null
          
          // ソート優先度を復元
          if (response.sortPriority) {
            restoreSortPriority(response.sortPriority)
          }
          
          showToast('success', '子アカウント情報を読み込みました')
        } else {
          throw new Error(response.error || response.message || '子アカウント情報の取得に失敗しました')
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error)
        state.apiStatus.error = error.message
        showToast('error', `データ読み込みエラー: ${error.message}`)
      } finally {
        state.apiStatus.loading = false
      }
    }
    
    const refreshData = async () => {
      state.apiStatus.error = null
      await loadAssignmentData()
    }
    
    // モード切り替え
    const setAssignmentMode = (mode) => {
      state.assignmentMode = mode
    }
    
    const switchMode = async (mode) => {
      if (state.assignmentMode === mode) return
      
      state.assignmentMode = mode
      console.log(`🔄 モード切り替え: ${mode}`)
      
      // データを再読み込み
      await loadAssignmentData()
    }
    
    // 背景色クラス
    const modeBackgroundClass = computed(() => {
      return {
        'manual-mode': state.assignmentMode === 'manual',
        'auto-mode': state.assignmentMode === 'auto'
      }
    })
    
    const onExcludePausedChange = () => {
      console.log('一時停止中除外設定:', state.excludePausedAccounts)
    }
    
    // 条件設定表示切り替え
    const toggleConditionSettings = () => {
      state.showConditionSettings = !state.showConditionSettings
      console.log('条件設定表示:', state.showConditionSettings)
    }
    
    // ソート優先度管理
    const updateSortPriority = async () => {
      if (state.sortUpdating) return
      
      state.sortUpdating = true
      
      try {
        const sortOrder = state.sortPriorityItems.map(item => item.key)
        
        const response = await callGASAPI('updateSortPriority', {
          parentId: state.parentId,
          sortOrder: sortOrder
        })
        
        if (response.success) {
          console.log('ソート優先度更新成功:', sortOrder)
          showToast('success', 'ソート優先度を更新しました')
          await loadAssignmentData()
        } else {
          throw new Error(response.error || 'ソート優先度の更新に失敗しました')
        }
      } catch (error) {
        console.error('ソート優先度更新エラー:', error)
        showToast('error', `ソート更新エラー: ${error.message}`)
      } finally {
        state.sortUpdating = false
      }
    }
    
    const restoreSortPriority = (savedOrder) => {
      if (Array.isArray(savedOrder) && savedOrder.length === state.sortPriorityItems.length) {
        const newOrder = savedOrder.map(key => 
          state.sortPriorityItems.find(item => item.key === key)
        ).filter(Boolean)
        
        if (newOrder.length === state.sortPriorityItems.length) {
          state.sortPriorityItems = newOrder
        }
      }
    }
    
    // マッチ根拠表示
    const showMatchReasons = (childId) => {
      state.selectedChildForMatch = state.childAccounts[childId]
      state.showMatchModal = true
    }
    
    const closeMatchModal = () => {
      state.showMatchModal = false
      state.selectedChildForMatch = null
    }
    
    // AIアドバイス表示
    const showAIAdvice = async (childId) => {
      state.showAdviceModal = true
      state.currentAdvice = {
        loading: true,
        data: null,
        error: null,
        childId: childId
      }
      
      loadingAdvice.value[childId] = true
      
      try {
        const response = await callGASAPI('generateAssignmentAdvice', {
          parentId: state.parentId,
          inquiryId: state.inquiryId,
          childId: childId
        })
        
        if (response.success) {
          state.currentAdvice.data = response.advice
        } else {
          throw new Error(response.error || response.message || 'アドバイス生成に失敗しました')
        }
      } catch (error) {
        console.error('AIアドバイス取得エラー:', error)
        state.currentAdvice.error = error.message
        showToast('error', `アドバイス生成エラー: ${error.message}`)
      } finally {
        state.currentAdvice.loading = false
        loadingAdvice.value[childId] = false
      }
    }
    
    const closeAdviceModal = () => {
      state.showAdviceModal = false
      state.currentAdvice = {
        loading: false,
        data: null,
        error: null,
        childId: null
      }
    }
    
    const retryAdvice = async () => {
      if (state.currentAdvice.childId) {
        await showAIAdvice(state.currentAdvice.childId)
      }
    }
    
    // 振り分け処理
    const confirmAssignment = (childId) => {
      state.selectedChildForAssignment = state.childAccounts[childId]
      state.showConfirmModal = true
    }
    
    const closeConfirmModal = () => {
      state.showConfirmModal = false
      state.selectedChildForAssignment = null
    }
    
    const executeAssignment = async () => {
      if (!state.selectedChildForAssignment) return
      
      const childId = Object.keys(state.childAccounts).find(id => 
        state.childAccounts[id] === state.selectedChildForAssignment
      )
      
      state.assigningChildId = childId
      
      try {
        const response = await callGASAPI('assignCaseToChild', {
          parentId: state.parentId,
          inquiryId: state.inquiryId,
          mode: 'manual',
          options: { selectedChildId: childId }
        })
        
        if (response.success) {
          showToast('success', `振り分けが完了しました！担当者: ${state.selectedChildForAssignment.name}`)
          closeConfirmModal()
        } else {
          throw new Error(response.errors?.join(', ') || response.error || '振り分けに失敗しました')
        }
      } catch (error) {
        console.error('振り分け実行エラー:', error)
        showToast('error', `振り分けエラー: ${error.message}`)
      } finally {
        state.assigningChildId = null
      }
    }
    
    // トースト通知
    const showToast = (type, message) => {
      state.toast = {
        show: true,
        type: type,
        message: message
      }
      
      setTimeout(() => {
        hideToast()
      }, 5000)
    }
    
    const hideToast = () => {
      state.toast.show = false
    }
    
    // ユーティリティ関数
    const getCardClass = (matchLevel) => {
      return {
        'high-match': matchLevel === 'high',
        'medium-match': matchLevel === 'medium', 
        'low-match': matchLevel === 'low'
      }
    }
    
    const getStatusIndicatorClass = (matchLevel) => {
      return `status-${matchLevel}`
    }
    
    const getStatusEmoji = (matchLevel) => {
      const emojiMap = {
        'high': '🟢',
        'medium': '🟡',
        'low': '🔴'
      }
      return emojiMap[matchLevel] || '⚪'
    }
    
    const getAreaMatchText = (percentage) => {
      if (percentage >= 80) return '経験豊富'
      if (percentage >= 50) return '部分対応可'
      return '経験限定'
    }
    
    const getWorkloadText = (percentage) => {
      if (percentage >= 80) return '余力あり'
      if (percentage >= 50) return '適正'
      return '負荷高'
    }
    
    const formatLastLogin = (loginTime) => {
      if (!loginTime) return '不明'
      
      try {
        const date = new Date(loginTime)
        const now = new Date()
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60))
        
        if (diffHours < 1) return '1時間以内'
        if (diffHours < 24) return `${diffHours}時間前`
        
        const diffDays = Math.floor(diffHours / 24)
        return `${diffDays}日前`
      } catch {
        return '不明'
      }
    }
    
    // スコアバー表示用ヘルパー関数
    const getScoreBarColor = (score) => {
      if (score >= 80) return 'bg-green-500'
      if (score >= 50) return 'bg-yellow-500'
      return 'bg-red-500'
    }
    
    const getScoreBarWidth = (score) => {
      return Math.min(Math.max(score || 0, 0), 100) + '%'
    }
    
    const getReasonBarClass = (value) => {
      if (value >= 80) return 'reason-high'
      if (value >= 50) return 'reason-medium'
      return 'reason-low'
    }
    
    const getReasonDescription = (reason, value) => {
      const descriptions = {
        'エリア対応経験': {
          high: '対象エリアでの豊富な実績があります',
          medium: '対象エリアでの経験が一部あります',
          low: '対象エリアでの経験は限定的です'
        },
        '現在の負荷状況': {
          high: '現在の担当案件数は適正で、新規対応の余力があります',
          medium: '現在の担当案件数は平均的です',
          low: '現在多くの案件を担当中で、負荷が高い状況です'
        },
        '対応可能度': {
          high: '最近のログイン状況から、迅速な対応が期待できます',
          medium: '通常の対応スピードが見込まれます',
          low: '最近のログインが少なく、対応に時間がかかる可能性があります'
        }
      }
      
      const level = value >= 80 ? 'high' : value >= 50 ? 'medium' : 'low'
      return descriptions[reason]?.[level] || ''
    }
    
    const getAdviceTypeClass = (type) => {
      return {
        'advice-highly': type === 'highly_recommended',
        'advice-moderate': type === 'moderately_recommended',
        'advice-consider': type === 'consider_alternatives',
        'advice-error': type === 'error'
      }
    }
    
    const getAdviceTypeLabel = (type) => {
      const labels = {
        'highly_recommended': '高マッチ',
        'moderately_recommended': '中マッチ',
        'consider_alternatives': '要検討',
        'error': 'エラー'
      }
      return labels[type] || '不明'
    }
    
    // 自動振り分け実行
    const executeAutoAssignment = async () => {
      if (state.autoAssigning) return
      
      state.autoAssigning = true
      
      try {
        console.log('🤖 自動振り分け実行開始')
        
        // 最適な子アカウントを自動選択（最初の子アカウントを選択）
        const sortedAccounts = Object.entries(state.childAccounts)
        if (sortedAccounts.length === 0) {
          throw new Error('振り分け対象の子アカウントが見つかりません')
        }
        
        // 一時停止中除外の場合はフィルタリング
        let eligibleAccounts = sortedAccounts
        if (state.excludePausedAccounts) {
          eligibleAccounts = sortedAccounts.filter(([, child]) => 
            child.status !== '一時停止'
          )
        }
        
        if (eligibleAccounts.length === 0) {
          throw new Error('条件に合う子アカウントが見つかりません')
        }
        
        // 最もマッチ度が高いアカウントを自動選択
        const bestMatch = eligibleAccounts.reduce((best, [childId, child]) => {
          if (!best || child.aiMatchPercentage > best.child.aiMatchPercentage) {
            return { childId, child }
          }
          return best
        }, null)
        
        console.log('✨ 自動選択された子アカウント:', bestMatch.child.name)
        
        // 自動振り分け実行（確認なし）
        const response = await callGASAPI('assignCaseToChild', {
          parentId: state.parentId,
          inquiryId: state.inquiryId,
          mode: 'auto',
          options: {
            selectedChildId: bestMatch.childId,
            autoNotify: true,
            excludePaused: state.excludePausedAccounts
          }
        })
        
        if (response.success) {
          showToast('success', 
            `🎯 自動振り分け完了！${bestMatch.child.name}さんに割り当てました`
          )
          console.log('✅ 自動振り分け成功:', response)
        } else {
          throw new Error(response.error || '自動振り分けに失敗しました')
        }
        
      } catch (error) {
        console.error('❌ 自動振り分けエラー:', error)
        showToast('error', `自動振り分けエラー: ${error.message}`)
      } finally {
        state.autoAssigning = false
      }
    }
    
    // わがまま設定関連の関数
    const generateWagamamaSummary = async () => {
      if (!state.wagamamaInput.trim()) return
      
      state.generatingSummary = true
      
      try {
        console.log('🤖 わがまま条件のAI要約生成開始')
        
        const response = await callGASAPI('generateWagamamaSummary', {
          inputText: state.wagamamaInput,
          parentId: state.parentId
        })
        
        if (response.success) {
          state.wagamamaSummary = response.summary
          console.log('✅ AI要約生成成功:', response.summary)
        } else {
          throw new Error(response.error || 'AI要約生成に失敗しました')
        }
        
      } catch (error) {
        console.error('❌ AI要約生成エラー:', error)
        showToast('error', `AI要約生成エラー: ${error.message}`)
      } finally {
        state.generatingSummary = false
      }
    }
    
    const saveWagamamaCondition = () => {
      if (!state.wagamamaSummary) return
      
      const newCondition = {
        ...state.wagamamaSummary,
        createdAt: new Date().toISOString(),
        enabled: true,
        id: Date.now()
      }
      
      state.savedWagamamaConditions.push(newCondition)
      
      // ローカルストレージに保存
      localStorage.setItem(
        `wagamama_conditions_${state.parentId}`, 
        JSON.stringify(state.savedWagamamaConditions)
      )
      
      // 入力をクリア
      state.wagamamaInput = ''
      state.wagamamaSummary = null
      
      showToast('success', 'わがまま条件を保存しました')
      console.log('💾 わがまま条件保存完了:', newCondition)
    }
    
    const clearWagamamaSummary = () => {
      state.wagamamaSummary = null
    }
    
    const toggleWagamamaCondition = (index) => {
      state.savedWagamamaConditions[index].enabled = !state.savedWagamamaConditions[index].enabled
      
      // ローカルストレージに保存
      localStorage.setItem(
        `wagamama_conditions_${state.parentId}`, 
        JSON.stringify(state.savedWagamamaConditions)
      )
      
      const condition = state.savedWagamamaConditions[index]
      const status = condition.enabled ? 'ON' : 'OFF'
      showToast('success', `条件「${condition.text}」を${status}にしました`)
    }
    
    const deleteWagamamaCondition = (index) => {
      const condition = state.savedWagamamaConditions[index]
      state.savedWagamamaConditions.splice(index, 1)
      
      // ローカルストレージに保存
      localStorage.setItem(
        `wagamama_conditions_${state.parentId}`, 
        JSON.stringify(state.savedWagamamaConditions)
      )
      
      showToast('success', `条件「${condition.text}」を削除しました`)
    }
    
    const loadWagamamaConditions = () => {
      try {
        const saved = localStorage.getItem(`wagamama_condition_${state.parentId}`)
        if (saved) {
          state.currentWagamamaCondition = JSON.parse(saved)
        }
      } catch (error) {
        console.error('わがまま条件の読み込みエラー:', error)
      }
    }
    
    const editCurrentCondition = () => {
      if (state.currentWagamamaCondition) {
        // 現在の条件を編集用にテキストエリアに設定
        state.wagamamaInput = state.currentWagamamaCondition.text
        // チャット履歴をクリア（新しいチャットで修正）
        state.chatHistory = []
        state.chatCompleted = false
        state.finalWagamamaPrompt = ''
        showToast('success', '📝 条件を編集モードにしました。修正後、再度チャットで確認してください。')
      }
    }
    
    const clearCurrentCondition = () => {
      state.currentWagamamaCondition = null
      localStorage.removeItem(`wagamama_condition_${state.parentId}`)
      showToast('success', '🗑️ わがまま条件を削除しました')
    }
    
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch (error) {
        return '不明'
      }
    }
    
    // GPT確認質問の処理
    const selectQuestionAnswer = (questionIndex, value) => {
      if (state.wagamamaSummary && state.wagamamaSummary.questions) {
        state.wagamamaSummary.questions[questionIndex].selectedAnswer = value
        
        // カスタム入力オプションの場合、カスタム入力をクリア
        if (value !== 'custom') {
          state.wagamamaSummary.questions[questionIndex].customAnswer = ''
        }
      }
    }
    
    const allQuestionsAnswered = computed(() => {
      if (!state.wagamamaSummary || !state.wagamamaSummary.questions) {
        return true
      }
      
      return state.wagamamaSummary.questions.every(question => {
        if (question.selectedAnswer === 'custom') {
          return question.customAnswer && question.customAnswer.trim() !== ''
        }
        return question.selectedAnswer !== null && question.selectedAnswer !== undefined
      })
    })
    
    const inputPlaceholder = computed(() => {
      if (state.chatting && !state.waitingForUserResponse) {
        return 'AIが応答中...'
      } else if (state.waitingForUserResponse) {
        return '返答を入力（送信ボタンでメッセージ送信）'
      } else if (state.chatHistory.length === 0) {
        return 'わがまま条件を入力（送信ボタンでメッセージ送信）'
      } else {
        return 'メッセージを入力（送信ボタンでメッセージ送信）'
      }
    })
    
    const processQuestionsAndSave = async () => {
      if (!allQuestionsAnswered.value) return
      
      state.savingCondition = true
      
      try {
        // 質問の回答を条件に反映
        let finalSummary = { ...state.wagamamaSummary }
        
        // 各質問の回答を処理して最終的な条件を確定
        if (finalSummary.questions) {
          finalSummary.questions.forEach(question => {
            const answer = question.selectedAnswer === 'custom' 
              ? question.customAnswer 
              : question.selectedAnswer
            
            // 回答に基づいて条件を更新
            if (question.type === 'period_confirmation') {
              if (answer === 'yes' || answer.includes('再開')) {
                finalSummary.period += '→自動再開'
              } else if (answer === 'no' || answer.includes('継続')) {
                finalSummary.period += '→継続停止'
              }
            }
            
            if (question.type === 'scope_confirmation') {
              if (answer.includes('全案件')) {
                finalSummary.condition = '全案件配分停止'
              } else if (answer.includes('特定')) {
                finalSummary.condition = '特定条件配分停止'
              }
            }
          })
          
          // 最終的な要約文を更新
          finalSummary.text = `${finalSummary.period}の期間中、${finalSummary.targetPerson}への${finalSummary.condition}を適用します（AI確認済み）`
        }
        
        // 確認済みマークを追加
        finalSummary.gptConfirmed = true
        finalSummary.questions = undefined // 質問は保存時に削除
        
        // 条件を保存
        const newCondition = {
          ...finalSummary,
          createdAt: new Date().toISOString(),
          enabled: true,
          id: Date.now()
        }
        
        state.savedWagamamaConditions.push(newCondition)
        
        // ローカルストレージに保存
        localStorage.setItem(
          `wagamama_conditions_${state.parentId}`, 
          JSON.stringify(state.savedWagamamaConditions)
        )
        
        // 入力をクリア
        state.wagamamaInput = ''
        state.wagamamaSummary = null
        
        showToast('success', '✅ GPT確認完了 - わがまま条件を保存しました')
        console.log('🤖 GPT確認フロー完了:', newCondition)
        
      } catch (error) {
        console.error('❌ GPT確認処理エラー:', error)
        showToast('error', `GPT確認処理エラー: ${error.message}`)
      } finally {
        state.savingCondition = false
      }
    }
    
    // チャット形式わがまま設定の関数群
    const startWagamamaChat = async () => {
      if (!state.wagamamaInput.trim()) return
      
      state.chatting = true
      state.chatHistory = []
      state.waitingForUserResponse = false
      state.chatCompleted = false
      
      // 最初のユーザーメッセージを履歴に追加
      addChatMessage('user', state.wagamamaInput)
      
      try {
        console.log('💬 GPTチャット開始:', state.wagamamaInput)
        
        // システムプロンプトはGAS側で定義されているため削除
        
        // GAS経由でGPT APIを呼び出し
        const response = await callGASAPI('startWagamamaChat', {
          userMessage: state.wagamamaInput,
          parentId: state.parentId,
          currentCondition: state.finalWagamamaPrompt
        })
        
        if (response.success) {
          // GPTの応答を履歴に追加
          addChatMessage('gpt', response.gptResponse)
          
          // 応答を解析して次のアクションを決定
          if (response.needsUserResponse) {
            // 質問がある場合はユーザー応答待ち
            state.waitingForUserResponse = true
          } else {
            // 条件が明確な場合は完了
            state.finalWagamamaPrompt = response.finalPrompt || generateFinalPrompt(state.chatHistory)
            state.chatCompleted = true
            state.chatting = false
          }
        } else {
          throw new Error(response.error || 'チャット開始に失敗しました')
        }
        
      } catch (error) {
        console.error('❌ チャット開始エラー:', error)
        showToast('error', `チャット開始エラー: ${error.message}`)
        state.chatting = false
      }
    }
    
    const sendChatResponse = async () => {
      if (!state.chatResponse.trim()) return
      
      // ユーザーの返信を履歴に追加
      addChatMessage('user', state.chatResponse)
      const userResponse = state.chatResponse
      state.chatResponse = ''
      state.waitingForUserResponse = false
      
      try {
        console.log('💬 GPT応答送信:', userResponse)
        
        // システムプロンプトはGAS側で定義されているため削除
        
        // GAS経由でGPT APIを呼び出し
        const response = await callGASAPI('continueWagamamaChat', {
          userResponse: userResponse,
          chatHistory: state.chatHistory,
          parentId: state.parentId
        })
        
        if (response.success) {
          // GPTの応答を履歴に追加
          addChatMessage('gpt', response.gptResponse)
          
          // 応答を解析
          if (response.needsUserResponse) {
            // 継続
            state.waitingForUserResponse = true
          } else {
            // チャット完了
            state.finalWagamamaPrompt = response.finalPrompt || generateFinalPrompt(state.chatHistory)
            state.chatCompleted = true
            state.chatting = false
          }
        } else {
          throw new Error(response.error || 'チャット継続に失敗しました')
        }
        
      } catch (error) {
        console.error('❌ チャット応答エラー:', error)
        showToast('error', `チャット応答エラー: ${error.message}`)
      }
    }
    
    const finishWagamamaChat = async () => {
      try {
        console.log('💬 チャット強制終了')
        
        // GAS経由でチャット終了
        const response = await callGASAPI('finishWagamamaChat', {
          chatHistory: state.chatHistory,
          parentId: state.parentId
        })
        
        if (response.success) {
          state.finalWagamamaPrompt = response.finalPrompt
          state.chatCompleted = true
          state.chatting = false
          state.waitingForUserResponse = false
          
          addChatMessage('gpt', '承知しました！現在の情報で条件を確定します。')
        } else {
          throw new Error(response.error || 'チャット終了に失敗しました')
        }
        
      } catch (error) {
        console.error('❌ チャット終了エラー:', error)
        showToast('error', `チャット終了エラー: ${error.message}`)
      }
    }
    
    const saveWagamamaFromChat = () => {
      if (!state.finalWagamamaPrompt) return
      
      // 最終的なまとめ文章のみを保存（チャット履歴は保存しない）
      state.currentWagamamaCondition = {
        text: state.finalWagamamaPrompt,
        createdAt: new Date().toISOString(),
        type: 'gpt_summarized',
        gptConfirmed: true
      }
      
      // ローカルストレージに保存
      localStorage.setItem(
        `wagamama_condition_${state.parentId}`, 
        JSON.stringify(state.currentWagamamaCondition)
      )
      
      // リセット
      restartWagamamaChat()
      
      showToast('success', '💾 わがまま条件を保存しました')
      console.log('💾 わがまま条件保存完了:', state.currentWagamamaCondition)
    }
    
    const restartWagamamaChat = () => {
      // チャットをリセット（入力テキストはクリア）
      state.chatHistory = []
      state.chatting = false
      state.waitingForUserResponse = false
      state.chatCompleted = false
      state.finalWagamamaPrompt = ''
      state.currentInputText = ''
      state.showChatInterface = false
    }
    
    const editPrompt = () => {
      // プロンプト修正時の処理
      state.showChatInterface = true
      state.chatHistory = []
      state.chatCompleted = false
      state.chatting = false
      state.waitingForUserResponse = false
      state.currentInputText = state.finalPrompt || state.currentWagamamaCondition?.text || ''
      
      nextTick(() => {
        // テキストエリアにフォーカス
        const textarea = document.querySelector('.chat-textarea')
        if (textarea) {
          textarea.focus()
        }
      })
    }
    
    const applyPromptFromChat = async () => {
      // チャット履歴がない場合でも現在の条件で処理
      if (!state.finalWagamamaPrompt && state.chatHistory.length === 0 && !state.currentWagamamaCondition) {
        showToast('error', 'まずはチャットで条件を入力してください')
        return
      }
      
      state.confirmationLoading = true
      state.loadingProgress = 0
      state.loadingStep = 1
      state.loadingStage = 'チャット履歴を解析中...'
      
      // 進捗アニメーション
      const progressTimer = setInterval(() => {
        if (state.loadingProgress < 90) {
          state.loadingProgress += Math.random() * 10
        }
      }, 200)
      
      try {
        // ステップ1: チャット履歴解析
        await new Promise(resolve => setTimeout(resolve, 800))
        state.loadingStep = 2
        state.loadingStage = 'AI条件整理中...'
        state.loadingProgress = 40
        
        // ステップ2: AI処理
        const response = await callGASAPI('generateFinalCondition', {
          chatHistory: state.chatHistory,
          currentCondition: state.finalWagamamaPrompt || state.currentWagamamaCondition?.text || null,
          parentId: state.parentId
        })
        
        state.loadingStep = 3
        state.loadingStage = '最終ブラッシュアップ中...'
        state.loadingProgress = 80
        
        // ステップ3: 最終整理
        await new Promise(resolve => setTimeout(resolve, 500))
        state.loadingProgress = 100
        
        clearInterval(progressTimer)
        
        if (response.success) {
          state.finalConditionText = response.finalCondition
          state.showFinalConfirmation = true
        } else {
          // フォールバック：既存のテキストまたは簡単な整理
          let fallbackText = ''
          if (state.finalWagamamaPrompt) {
            fallbackText = extractFinalPromptOnly(state.finalWagamamaPrompt)
          } else if (state.currentWagamamaCondition) {
            fallbackText = state.currentWagamamaCondition.text
          } else if (state.chatHistory.length > 0) {
            // チャット履歴から簡単に条件を抽出
            const userMessages = state.chatHistory
              .filter(msg => msg.role === 'user')
              .map(msg => msg.content)
              .join(' ')
            fallbackText = userMessages || '条件が設定されていません'
          }
          state.finalConditionText = fallbackText
          state.showFinalConfirmation = true
        }
      } catch (error) {
        console.error('最終条件生成エラー:', error)
        clearInterval(progressTimer)
        
        // エラー時のフォールバック
        let fallbackText = ''
        if (state.finalWagamamaPrompt) {
          fallbackText = extractFinalPromptOnly(state.finalWagamamaPrompt)
        } else if (state.currentWagamamaCondition) {
          fallbackText = state.currentWagamamaCondition.text
        } else {
          fallbackText = '条件の生成でエラーが発生しました'
        }
        state.finalConditionText = fallbackText
        state.showFinalConfirmation = true
      } finally {
        state.confirmationLoading = false
        state.loadingProgress = 0
        state.loadingStep = 0
        state.loadingStage = ''
      }
    }
    
    const confirmFinalCondition = () => {
      // 最終確認後の保存処理
      state.finalPrompt = state.finalConditionText
      state.currentWagamamaCondition = {
        text: state.finalConditionText,
        createdAt: new Date().toISOString(),
        type: 'gpt_summarized',
        gptConfirmed: true
      }
      
      // ローカルストレージに保存
      localStorage.setItem(
        `wagamama_condition_${state.parentId}`, 
        JSON.stringify(state.currentWagamamaCondition)
      )
      
      // 画面をリセット
      state.showFinalConfirmation = false
      state.showChatInterface = false
      state.finalConditionText = ''
      restartWagamamaChat()
      
      showToast('success', '✅ わがまま条件を保存しました')
      console.log('✅ 最終条件保存完了:', state.currentWagamamaCondition)
    }
    
    const cancelFinalConfirmation = () => {
      state.showFinalConfirmation = false
      state.finalConditionText = ''
    }
    
    const extractFinalPromptOnly = (fullPrompt) => {
      // 【最終条件:】や【対話履歴】などを除去して、純粋な条件文のみを抽出
      let cleanPrompt = fullPrompt
      
      // 【わがまま条件 - 日付】の部分を除去
      cleanPrompt = cleanPrompt.replace(/【わがまま条件[^】]*】\s*/g, '')
      
      // 【最終条件:】から次の【まで、または【対話履歴】までを抽出
      const finalConditionMatch = cleanPrompt.match(/最終条件[：:]\s*([^【]*)/s)
      if (finalConditionMatch) {
        cleanPrompt = finalConditionMatch[1].trim()
      }
      
      // 【対話履歴】以降をすべて除去
      cleanPrompt = cleanPrompt.split('【対話履歴】')[0]
      
      // 確認日時以降を除去
      cleanPrompt = cleanPrompt.split('確認日時:')[0]
      
      // ChatGPT APIの署名を除去
      cleanPrompt = cleanPrompt.split('※ ChatGPT')[0]
      
      // 余分な空白を整理
      cleanPrompt = cleanPrompt.trim()
      
      return cleanPrompt || fullPrompt // 抽出に失敗した場合は元のテキストを返す
    }
    
    const formatDateTime = (isoString) => {
      try {
        const date = new Date(isoString)
        return date.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        return ''
      }
    }
    
    const startNewCondition = () => {
      state.showChatInterface = true
      nextTick(() => {
        const textarea = document.querySelector('.chat-textarea')
        if (textarea) {
          textarea.focus()
        }
      })
    }
    
    const deletePrompt = () => {
      // 確認ダイアログ
      if (!confirm('わがまま条件を削除しますか？')) {
        return
      }
      
      // 状態をクリア
      state.finalPrompt = ''
      state.currentWagamamaCondition = null
      state.showChatInterface = false
      
      // ローカルストレージからも削除
      localStorage.removeItem(`wagamama_condition_${state.parentId}`)
      
      showToast('success', '🗑️ わがまま条件を削除しました')
      console.log('🗑️ わがまま条件削除完了')
    }
    
    const addChatMessage = (role, content) => {
      state.chatHistory.push({
        role: role,
        content: content,
        timestamp: new Date().toISOString()
      })
      // メッセージ追加後に最下部にスクロール
      nextTick(() => {
        scrollToBottom()
      })
    }
    
    // LINEライクチャット関数群
    const handleSendMessage = async () => {
      if (!state.currentInputText.trim()) return
      
      const messageText = state.currentInputText.trim()
      
      // テキストエリアを即座にクリア（重複送信防止）
      state.currentInputText = ''
      
      // DOM上のテキストエリアも確実にクリア
      nextTick(() => {
        const textarea = document.querySelector('.chat-textarea')
        if (textarea) {
          textarea.value = ''
          adjustTextareaHeight()
        }
      })
      
      
      if (state.chatHistory.length === 0) {
        // 最初のメッセージ = チャット開始
        await startChatConversation(messageText)
      } else {
        // 継続メッセージ
        await sendChatContinuation(messageText)
      }
    }
    
    const startChatConversation = async (message) => {
      // ユーザーメッセージを追加
      addChatMessage('user', message)
      
      state.chatting = true
      state.waitingForUserResponse = false
      
      try {
        // GAS経由でGPT APIを呼び出し
        const response = await callGASAPI('startWagamamaChat', {
          userMessage: message,
          parentId: state.parentId
        })
        
        if (response.success) {
          // GPTの応答を履歴に追加
          addChatMessage('gpt', response.gptResponse)
          
          if (response.needsUserResponse) {
            state.waitingForUserResponse = true
          } else {
            state.finalWagamamaPrompt = response.finalPrompt || generateFinalPrompt(state.chatHistory)
            state.chatCompleted = true
            state.chatting = false
          }
        } else {
          throw new Error(response.error || 'チャット開始に失敗しました')
        }
      } catch (error) {
        console.error('❌ チャット開始エラー:', error)
        addChatMessage('gpt', '申し訳ございません。エラーが発生しました。もう一度お試しください。')
        state.chatting = false
        showToast('error', `チャット開始エラー: ${error.message}`)
      }
    }
    
    const sendChatContinuation = async (message) => {
      // ユーザーメッセージを追加
      addChatMessage('user', message)
      
      state.waitingForUserResponse = false
      state.chatting = true
      
      try {
        // GAS経由でGPT APIを呼び出し
        const response = await callGASAPI('continueWagamamaChat', {
          userResponse: message,
          chatHistory: state.chatHistory,
          parentId: state.parentId
        })
        
        if (response.success) {
          // GPTの応答を履歴に追加
          addChatMessage('gpt', response.gptResponse)
          
          if (response.needsUserResponse) {
            state.waitingForUserResponse = true
            state.chatting = false
          } else {
            state.finalWagamamaPrompt = response.finalPrompt || generateFinalPrompt(state.chatHistory)
            state.chatCompleted = true
            state.chatting = false
          }
        } else {
          throw new Error(response.error || 'チャット継続に失敗しました')
        }
      } catch (error) {
        console.error('❌ チャット継続エラー:', error)
        addChatMessage('gpt', '申し訳ございません。エラーが発生しました。もう一度お試しください。')
        state.chatting = false
        showToast('error', `チャット継続エラー: ${error.message}`)
      }
    }
    
    const scrollToBottom = () => {
      const chatArea = document.querySelector('.chat-messages-area')
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight
      }
    }
    
    const adjustTextareaHeight = () => {
      const textarea = document.querySelector('.chat-textarea')
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      }
    }
    
    
    const formatMessageTime = (timestamp) => {
      try {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        return ''
      }
    }
    
    // Enterキーでのチャット開始を削除（ボタンクリックのみ）
    // const handleChatSubmit = (event) => {
    //   if (event.shiftKey) return // Shift+Enterは改行
    //   event.preventDefault()
    //   if (!state.chatting) {
    //     startWagamamaChat()
    //   }
    // }
    
    // GAS経由でOpenAI APIを使用するため、Vue側のOpenAI関数は削除
    
    // 最終プロンプト生成関数
    const generateFinalPrompt = (chatHistory) => {
      // チャット履歴から最終プロンプトを生成
      const now = new Date()
      const originalMessage = chatHistory[0].content
      
      let prompt = `【わがまま条件 - ${now.toLocaleDateString('ja-JP')}設定】\n\n`
      prompt += `最終条件: ${originalMessage}\n\n`
      
      // ユーザーとGPTの対話履歴を追加
      const conversationSummary = chatHistory.slice(1).map((msg) => {
        const role = msg.role === 'user' ? '👤 ユーザー' : '🤖 GPT'
        return `${role}: ${msg.content}`
      }).join('\n')
      
      if (conversationSummary) {
        prompt += `\n【対話履歴】\n${conversationSummary}\n`
      }
      
      prompt += `\n確認日時: ${now.toLocaleString('ja-JP')}\n`
      prompt += process.env.VUE_APP_USE_REAL_GPT === 'true' 
        ? '\n※ ChatGPT APIで生成・確認済み' 
        : '\n※ モック版での生成（本番では GPT API 使用）'
      
      return prompt
    }
    
    // GAS側でOpenAI APIを処理するため、Vue側のモック関数は不要
    
    // 以下のモック関数はGAS側で処理されるため不要（コメントアウト済み）
    /*
    const generateMockChatResponse = (userMessage) => {
      // GAS側で処理されるためコメントアウト
    }
    
    const generateMockContinueResponse = (userResponse, chatHistory) => {
      // GAS側で処理されるためコメントアウト
    }
    */
    
    // generateMockFinalPrompt もGAS側で処理されるためコメントアウト
    // const generateMockFinalPrompt = (chatHistory) => { ... }
    
    onMounted(() => {
      loadAssignmentData()
      loadWagamamaConditions()
      
      console.log('🚀 GAS経由でChatGPT API を使用します')
      showToast('success', '🤖 GAS経由でChatGPT API動作（OpenAI_API_KEY設定済み）')
    })
    
    return {
      isDevelopment,
      state,
      loadingDetails,
      loadingAdvice,
      sortedChildAccounts,
      formattedConditionLines,
      formattedCurrentConditionLines,
      draggableSortItems,
      refreshData,
      setAssignmentMode,
      switchMode,
      modeBackgroundClass,
      onExcludePausedChange,
      toggleConditionSettings,
      updateSortPriority,
      showMatchReasons,
      closeMatchModal,
      showAIAdvice,
      closeAdviceModal,
      retryAdvice,
      confirmAssignment,
      closeConfirmModal,
      executeAssignment,
      executeAutoAssignment,
      generateWagamamaSummary,
      saveWagamamaCondition,
      clearWagamamaSummary,
      toggleWagamamaCondition,
      deleteWagamamaCondition,
      formatDate,
      hideToast,
      getCardClass,
      getStatusIndicatorClass,
      getStatusEmoji,
      getAreaMatchText,
      getWorkloadText,
      formatLastLogin,
      getScoreBarColor,
      getScoreBarWidth,
      getReasonBarClass,
      getReasonDescription,
      getAdviceTypeClass,
      getAdviceTypeLabel,
      selectQuestionAnswer,
      processQuestionsAndSave,
      allQuestionsAnswered,
      inputPlaceholder,
      startWagamamaChat,
      sendChatResponse,
      finishWagamamaChat,
      saveWagamamaFromChat,
      restartWagamamaChat,
      handleSendMessage,
      startChatConversation,
      sendChatContinuation,
      scrollToBottom,
      adjustTextareaHeight,
      formatMessageTime,
      editCurrentCondition,
      clearCurrentCondition,
      currentInputText: toRef(state, 'currentInputText'),
      editPrompt,
      applyPromptFromChat,
      extractFinalPromptOnly,
      formatDateTime,
      startNewCondition,
      deletePrompt,
      confirmFinalCondition,
      cancelFinalConfirmation
    }
  }
}
</script>

<style scoped>
.assignment-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  transition: background-color 0.3s ease;
}

/* モード別背景色 */
.assignment-container.manual-mode {
  background-color: #f5f5f5;
}

.assignment-container.auto-mode {
  background-color: #f0f8ff;
}

/* モードタブセクション */
.mode-tabs-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.mode-tabs {
  display: flex;
  gap: 12px;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
}

.mode-tab {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid #ddd;
  border-radius: 25px;
  background: white;
  color: #666;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
}

.mode-tab:hover {
  background: #f8f9fa;
  border-color: #aaa;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.mode-tab.active {
  background: linear-gradient(135deg, #2196f3, #64b5f6);
  color: white;
  border-color: #1976d2;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  transform: translateY(-2px);
}

.mode-tab.active:hover {
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  transform: translateY(-2px);
}

/* ヘッダーセクション */
.header-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e9ecef;
}

.header-section h2 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 24px;
}

.inquiry-details {
  margin: 16px 0;
  color: #666;
  line-height: 1.5;
}

.assignment-mode-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
  color: #666;
  cursor: pointer;
}

/* 条件設定ボタン */
.condition-settings-toggle {
  text-align: center;
  margin: 20px 0;
}

.btn-settings {
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 25px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-settings:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

/* 条件設定セクション */
.condition-settings-section {
  background: #fff;
  border-radius: 12px;
  border: 2px solid #e9ecef;
  margin-bottom: 24px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* API状態表示 */
.api-status {
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: center;
}

.api-status.loading {
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  color: #1976d2;
}

.api-status.error {
  background: #ffebee;
  border: 1px solid #ffcdd2;
  color: #c62828;
}

/* ソート優先度セクション */
.sort-priority-section {
  background: #e3f2fd;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #bbdefb;
}

.sort-priority-section h3 {
  margin: 0 0 16px 0;
  color: #1976d2;
  font-size: 18px;
}

.sort-priority-section small {
  color: #666;
  font-weight: normal;
}

.priority-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.priority-item {
  background: white;
  border: 2px solid #2196f3;
  border-radius: 24px;
  padding: 10px 20px;
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.priority-item:hover {
  background: #f3e5f5;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.priority-item:active {
  cursor: grabbing;
  opacity: 0.8;
}

.priority-item.updating {
  opacity: 0.6;
  cursor: not-allowed;
}

.priority-item.fixed-item {
  background: linear-gradient(135deg, #ff6b6b, #ffa726);
  border: 2px solid #ff5722;
  color: white;
  cursor: default;
  position: relative;
}

.priority-item.fixed-item:hover {
  background: linear-gradient(135deg, #ff6b6b, #ffa726);
  transform: none;
  box-shadow: 0 4px 8px rgba(255, 87, 34, 0.3);
}

.priority-badge {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 8px;
}

.priority-label {
  flex: 1;
}

.fixed-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 8px;
}

.drag-handle {
  color: #999;
  cursor: grab;
  margin-left: 8px;
  user-select: none;
}

.sort-status {
  margin-top: 12px;
  color: #666;
  font-style: italic;
  font-size: 14px;
}

/* ローディング・エラー */
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* スコアバー表示 */
.score-bar-container {
  margin-top: 8px;
  width: 100%;
  max-width: 300px;
}

.score-bar-container.inline {
  display: inline-block;
  width: 120px;
  max-width: 120px;
  margin-left: 12px;
  margin-top: 4px;
  vertical-align: middle;
}

.score-bar-bg {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.score-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease-in-out;
  position: relative;
}

.score-bar-fill.bg-green-500 {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.score-bar-fill.bg-yellow-500 {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.score-bar-fill.bg-red-500 {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.score-label {
  margin-bottom: 4px;
}

.confirmation-score {
  margin: 12px 0;
}

.advice-match {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 子アカウント一覧 */
.child-accounts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.child-accounts-list h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
}

.child-account-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.1);
  border-left: 5px solid;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.child-account-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.child-account-card.high-match {
  border-left-color: #4caf50;
}

.child-account-card.medium-match {
  border-left-color: #ff9800;
}

.child-account-card.low-match {
  border-left-color: #f44336;
}

/* アカウントヘッダー */
.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.account-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  font-size: 16px;
}

.ai-match-score {
  background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
  color: #2e7d32;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #a5d6a7;
}

/* アカウント統計 */
.account-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.stat-label {
  color: #666;
  margin-right: 8px;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

/* アクションボタン */
.account-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: white;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.btn-primary:hover {
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #eeeeee;
  color: #555;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

/* メッセージ */
.no-accounts-message {
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fa;
  border-radius: 12px;
  color: #666;
  border: 1px solid #e9ecef;
}

/* モーダル */
.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.modal-body {
  padding: 24px;
}

/* マッチ根拠詳細 */
.match-reasons-detail h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 16px;
}

.reason-item {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.reason-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reason-label {
  font-weight: 600;
  color: #333;
}

.reason-score {
  font-weight: 700;
  color: #2196f3;
}

.reason-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.reason-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.reason-fill.reason-high {
  background: linear-gradient(90deg, #4caf50, #66bb6a);
}

.reason-fill.reason-medium {
  background: linear-gradient(90deg, #ff9800, #ffb74d);
}

.reason-fill.reason-low {
  background: linear-gradient(90deg, #f44336, #ef5350);
}

.reason-description {
  margin: 0;
  color: #666;
  font-size: 13px;
  line-height: 1.4;
}

.total-match {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
  border-radius: 8px;
  border: 1px solid #a5d6a7;
}

.total-match h4 {
  margin: 0 0 8px 0;
  color: #2e7d32;
}

.match-summary {
  margin: 0;
  color: #4a4a4a;
  font-style: italic;
}

/* AIアドバイス */
.advice-loading {
  text-align: center;
  padding: 40px 20px;
}

.advice-content {
  line-height: 1.6;
}

.advice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.advice-type-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.advice-type-badge.advice-highly {
  background: #e8f5e8;
  color: #2e7d32;
}

.advice-type-badge.advice-moderate {
  background: #fff3e0;
  color: #f57c00;
}

.advice-type-badge.advice-consider {
  background: #ffebee;
  color: #c62828;
}

.advice-type-badge.advice-error {
  background: #fce4ec;
  color: #ad1457;
}

.advice-match {
  font-size: 14px;
  color: #666;
}

.advice-text {
  margin: 16px 0;
}

.action-suggestion {
  margin-top: 12px;
  padding: 12px;
  background: #e3f2fd;
  border-radius: 6px;
  border-left: 4px solid #2196f3;
}

.advice-disclaimer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
  color: #999;
}

.advice-error {
  text-align: center;
  padding: 20px;
  color: #c53030;
}

/* 振り分け確認 */
.assignment-confirmation {
  text-align: center;
}

.selected-child-summary {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.selected-child-summary h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.confirmation-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

/* トースト通知 */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1100;
  min-width: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  animation: slideInRight 0.3s ease-out;
}

.toast.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.toast.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.toast-icon {
  font-size: 18px;
}

.toast-message {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.toast-close:hover {
  background: rgba(0,0,0,0.1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .assignment-container {
    padding: 16px;
  }
  
  .account-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .account-stats {
    grid-template-columns: 1fr;
  }
  
  .account-actions {
    flex-direction: column;
  }
  
  .priority-items {
    flex-direction: column;
  }
  
  .assignment-mode-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .checkbox-label {
    margin-left: 0;
    margin-top: 12px;
  }
  
  .modal-content {
    margin: 10px;
    max-width: calc(100% - 20px);
  }
  
  .confirmation-actions {
    flex-direction: column;
  }
  
  .advice-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .toast {
    right: 10px;
    left: 10px;
    width: auto;
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .header-section {
    padding: 16px;
  }
  
  .sort-priority-section {
    padding: 16px;
  }
  
  .child-account-card {
    padding: 16px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .btn {
    padding: 12px 16px;
    font-size: 14px;
  }
}

/* 自動振り分けアクション */
.auto-assignment-action {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  text-align: center;
}

.btn-large {
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  min-width: 280px;
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn-large:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.btn-large:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.auto-assignment-description {
  color: white;
  margin: 12px 0 0 0;
  font-size: 14px;
  opacity: 0.9;
}

/* わがまま設定 */
.wagamama-settings-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  border: 1px solid #e9ecef;
}

.wagamama-description {
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.5;
}

.wagamama-input-section {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.wagamama-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
}

.wagamama-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.wagamama-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.wagamama-summary-section {
  background: white;
  border: 2px solid #28a745;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.summary-preview {
  margin-bottom: 20px;
}

.summary-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.summary-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.summary-details p {
  margin: 0;
  padding: 8px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 14px;
}

.summary-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.saved-conditions-section {
  margin-top: 24px;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.condition-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.condition-item.active {
  border-color: #28a745;
  background: #f8fff9;
}

.condition-content {
  flex: 1;
}

.condition-text {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.condition-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.condition-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-toggle {
  min-width: 60px;
  font-weight: 600;
}

.btn-success {
  background-color: #28a745;
  border-color: #28a745;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
  padding: 6px 12px;
  font-size: 12px;
}

/* GPT確認質問セクション */
.gpt-questions-section {
  margin-top: 20px;
  padding: 20px;
  background: #fff3cd;
  border: 2px solid #ffeaa7;
  border-radius: 8px;
}

.gpt-questions-section h5 {
  margin: 0 0 16px 0;
  color: #856404;
  font-size: 16px;
  font-weight: 600;
}

.question-item {
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.question-text {
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  font-size: 14px;
}

.question-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.btn-option {
  padding: 8px 16px;
  border: 2px solid #e9ecef;
  background: white;
  color: #495057;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn-option:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.btn-option.selected {
  border-color: #007bff;
  background: #007bff;
  color: white;
}

.custom-input-section {
  margin-top: 12px;
}

.custom-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 4px;
  font-size: 14px;
}

.custom-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.questions-actions {
  margin-top: 20px;
  text-align: center;
}

/* プロンプト表示窓 */
.prompt-display-window {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.prompt-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.btn-edit, .btn-delete {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-edit:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-delete:hover:not(:disabled) {
  background: rgba(255, 82, 82, 0.3);
  border-color: rgba(255, 82, 82, 0.5);
  transform: translateY(-1px);
}

.btn-edit:disabled, .btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prompt-content {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.prompt-content p {
  margin: 0;
  line-height: 1.6;
  font-size: 15px;
}

.prompt-meta {
  font-size: 12px;
  opacity: 0.8;
  text-align: right;
}

/* 新規作成セクション */
.new-condition-section {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 16px;
  margin-bottom: 20px;
}

.hint-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
  line-height: 1.5;
}

.btn-lg {
  padding: 12px 32px;
  font-size: 16px;
  border-radius: 25px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
}

/* LINEライクチャットUI */
.line-chat-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #e9ecef;
  height: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.chat-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  background: #fafafa;
  scroll-behavior: smooth;
}

/* ウェルカムメッセージ */
.welcome-message {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
}

/* メッセージラッパー */
.message-wrapper {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-end;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.gpt {
  justify-content: flex-start;
}

/* GPTバブル（左側） */
.gpt-bubble {
  display: flex;
  align-items: flex-end;
  max-width: 75%;
}

.gpt-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #00c851;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  margin-right: 8px;
  flex-shrink: 0;
}

.bubble-wrapper {
  flex: 1;
}

.gpt-bubble .bubble-content {
  background: white;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  color: #333;
  line-height: 1.4;
  font-size: 14px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

/* ユーザーバブル（右側） */
.user-bubble {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-bubble .bubble-content {
  background: #00c851;
  color: white;
  border-radius: 18px;
  border-bottom-right-radius: 4px;
  padding: 12px 16px;
  line-height: 1.4;
  font-size: 14px;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* メッセージ時間 */
.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding: 0 4px;
}

/* タイピングインジケーター */
.typing-indicator {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
}

.typing-animation {
  background: white;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-animation span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-animation span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-animation span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 入力エリア */
.chat-input-area {
  background: white;
  border-top: 1px solid #e9ecef;
  padding: 12px 16px;
  min-height: 60px;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}

.chat-textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 10px 16px;
  font-size: 14px;
  resize: none;
  outline: none;
  min-height: 20px;
  max-height: 100px;
  line-height: 1.4;
  font-family: inherit;
}

.chat-textarea:focus {
  border-color: #00c851;
}

.send-button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #00c851;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #00a041;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* アクションボタン */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-success {
  background: #00c851;
  color: white;
}

.btn-success:hover {
  background: #00a041;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-outline {
  background: transparent;
  color: #00c851;
  border: 1px solid #00c851;
}

.btn-outline:hover {
  background: #00c851;
  color: white;
}

/* スクロールバーのスタイリング */
.chat-messages-area::-webkit-scrollbar {
  width: 4px;
}

.chat-messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages-area::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 2px;
}

.chat-messages-area::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 最終確認モーダル */
.final-confirmation-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1001;
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.condition-preview {
  margin-bottom: 24px;
}

.condition-preview h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #495057;
}

.condition-text {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #dee2e6;
  border-radius: 12px;
  padding: 20px;
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  font-family: "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
}

.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-footer .btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.modal-footer .btn-secondary {
  background: #6c757d;
  color: white;
}

.modal-footer .btn-secondary:hover {
  background: #545b62;
}

.modal-footer .btn-primary {
  background: #007bff;
  color: white;
}

.modal-footer .btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.modal-footer .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .line-chat-container {
    height: 400px;
    border-radius: 12px;
  }
  
  .chat-messages-area {
    padding: 16px 12px;
  }
  
  .gpt-bubble, .user-bubble {
    max-width: 85%;
  }
  
  .gpt-avatar {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }
  
  .bubble-content {
    font-size: 13px !important;
    padding: 10px 14px !important;
  }
  
  .chat-textarea {
    font-size: 13px;
  }
  
  .modal-content {
    width: 95%;
    margin: 20px;
  }
  
  .modal-header {
    padding: 20px 16px 12px;
  }
  
  .modal-body {
    padding: 16px;
  }
  
  .modal-footer {
    padding: 12px 16px 20px;
    flex-direction: column;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
}

/* ボタンローディング */
.button-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* プログレス関連 */
.progress-container {
  text-align: center;
  margin-bottom: 24px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #28a745);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.loading-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;
  opacity: 0.4;
}

.step.active {
  opacity: 1;
  background: rgba(0, 123, 255, 0.1);
}

.step.completed {
  opacity: 0.7;
  background: rgba(40, 167, 69, 0.1);
}

.step-icon {
  font-size: 18px;
  width: 32px;
  text-align: center;
}

.step-text {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

/* 条件テキストフォーマット */
.formatted-condition {
  line-height: 1.6;
}

.condition-line {
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.condition-line:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.condition-line:hover {
  background: rgba(0, 123, 255, 0.05);
  border-radius: 4px;
  padding: 8px 12px;
  margin: 0 -12px 12px -12px;
}

/* 現在の条件表示用 */
.formatted-condition-display {
  line-height: 1.7;
}

.condition-line-display {
  margin-bottom: 16px;
  padding: 12px 0;
  color: #fff;
  font-weight: 500;
}

.condition-line-display:last-child {
  margin-bottom: 0;
}

/* 現在の条件セクション */
.current-condition-section {
  margin-top: 24px;
  background: #e8f5e8;
  border: 2px solid #28a745;
  border-radius: 12px;
  padding: 20px;
}

.current-condition-section h4 {
  margin: 0 0 16px 0;
  color: #155724;
  font-size: 16px;
  font-weight: 600;
}

.current-condition-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #c3e6cb;
}

.current-condition-item .condition-content {
  flex: 1;
}

.current-condition-item .condition-text {
  font-weight: 600;
  color: #155724;
  margin-bottom: 8px;
  font-size: 15px;
  line-height: 1.4;
}

.current-condition-item .condition-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6c757d;
}

.condition-status {
  font-weight: 600;
  color: #28a745;
}

.current-condition-item .condition-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>