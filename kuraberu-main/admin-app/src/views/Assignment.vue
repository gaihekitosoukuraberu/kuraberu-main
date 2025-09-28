<template>
  <div class="assignment-management">
    <!-- 案件一覧ヘッダー -->
    <div class="page-header">
      <h1 class="page-title">案件振り分け管理</h1>
      <div class="header-actions">
        <button 
          class="refresh-btn"
          @click="refreshData"
          :disabled="isLoading"
        >
          <i class="icon-refresh" :class="{ 'spinning': isLoading }"></i>
          更新
        </button>
      </div>
    </div>

    <!-- 案件一覧 -->
    <div class="case-list-section">
      <h2 class="section-title">案件一覧</h2>
      <div class="case-tabs">
        <div
          v-for="caseItem in sortedCases"
          :key="caseItem.id"
          @click="selectCase(caseItem.id)"
          :class="['case-tab', { 
            active: selectedCaseId === caseItem.id
          }]"
        >
          <div class="case-header">
            <span class="case-id">案件#{{ caseItem.id.slice(-3) }}</span>
          </div>
          <div class="case-info">
            <span class="customer-name">{{ caseItem.customerNameKanji || '未入力' }}</span>
            <span class="case-time">{{ formatTime(caseItem.createdAt) }}</span>
          </div>
          <div class="case-status">
            <span :class="['status-badge', getStatusClass(caseItem.status)]">
              {{ caseItem.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 選択された案件の詳細 -->
    <div v-if="selectedCase" class="case-detail-section">
      
      <!-- 1. ご本人さま情報 -->
      <div class="form-section">
        <h3 class="form-section-title">ご本人さま情報</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>氏名（漢字）</label>
            <input 
              v-model="selectedCase.customerNameKanji" 
              type="text" 
              class="form-input"
              placeholder="田中太郎"
            >
          </div>
          <div class="form-group">
            <label>氏名（カナ）</label>
            <input 
              v-model="selectedCase.customerNameKana" 
              type="text" 
              class="form-input"
              placeholder="タナカタロウ"
            >
          </div>
          <div class="form-group half-width">
            <label>性別</label>
            <select v-model="selectedCase.gender" class="form-select">
              <option value="">選択してください</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>年齢</label>
            <select v-model="selectedCase.ageRange" class="form-select">
              <option value="">選択してください</option>
              <option value="25歳未満">25歳未満</option>
              <option value="25~35歳">25~35歳</option>
              <option value="35~45歳">35~45歳</option>
              <option value="45~55歳">45~55歳</option>
              <option value="55~65歳">55~65歳</option>
              <option value="65歳以上">65歳以上</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group">
            <label>関係性</label>
            <select v-model="selectedCase.relationship" class="form-select">
              <option value="">選択してください</option>
              <option value="ご本人">ご本人</option>
              <option value="配偶者">配偶者</option>
              <option value="家族">家族</option>
              <option value="オーナー">オーナー</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group">
            <label>電話番号</label>
            <div class="input-with-button">
              <input 
                v-model="selectedCase.customerPhone" 
                type="tel" 
                class="form-input"
                placeholder="090-1234-5678"
              >
              <button 
                @click="copyToClipboard(selectedCase.customerPhone)"
                class="copy-btn"
                :disabled="!selectedCase.customerPhone"
                title="電話番号をコピー"
              >
                📋
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>メールアドレス</label>
            <input 
              v-model="selectedCase.email" 
              type="email" 
              class="form-input"
              placeholder="example@email.com"
            >
          </div>
        </div>
      </div>

      <!-- 2. 物件プロフィール -->
      <div class="form-section">
        <h3 class="form-section-title">物件プロフィール</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>依頼物件種別</label>
            <select v-model="selectedCase.propertyType" class="form-select">
              <option value="">選択してください</option>
              <option value="戸建て">戸建て</option>
              <option value="マンション">マンション</option>
              <option value="アパート">アパート</option>
              <option value="店舗">店舗</option>
              <option value="事務所">事務所</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>階数</label>
            <select v-model="selectedCase.floors" class="form-select">
              <option value="">選択してください</option>
              <option value="1階建て">1階建て</option>
              <option value="2階建て">2階建て</option>
              <option value="3階建て">3階建て</option>
              <option value="4階建て以上">4階建て以上</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>築年数</label>
            <input 
              v-model="selectedCase.buildingAge" 
              type="text" 
              class="form-input"
              placeholder="15年"
            >
          </div>
          <div class="form-group">
            <label>延べ床面積</label>
            <input 
              v-model="selectedCase.floorArea" 
              type="text" 
              class="form-input"
              placeholder="120㎡"
            >
          </div>
          <div class="form-group half-width">
            <label>施工回数</label>
            <select v-model="selectedCase.constructionCount" class="form-select">
              <option value="">選択してください</option>
              <option value="初回">初回</option>
              <option value="2回目">2回目</option>
              <option value="3回目">3回目</option>
              <option value="4回目以上">4回目以上</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>前回施工時期</label>
            <div class="years-ago-input">
              <input 
                v-model="lastConstructionInput"
                @input="updateLastConstructionYearsAgo"
                type="text" 
                class="form-input"
                placeholder="数字を入力"
              >
              <span class="years-suffix">年前</span>
            </div>
          </div>
          <div class="form-group half-width">
            <label>外壁材質</label>
            <select v-model="selectedCase.exteriorMaterial" class="form-select">
              <option value="">選択してください</option>
              <option value="サイディング">サイディング</option>
              <option value="モルタル">モルタル</option>
              <option value="タイル">タイル</option>
              <option value="ALC">ALC</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>屋根材質</label>
            <select v-model="selectedCase.roofMaterial" class="form-select">
              <option value="">選択してください</option>
              <option value="スレート">スレート</option>
              <option value="瓦">瓦</option>
              <option value="ガルバリウム">ガルバリウム</option>
              <option value="トタン">トタン</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div class="form-group">
            <label>郵便番号</label>
            <div class="postal-code-input">
              <input 
                v-model="selectedCase.postalCode" 
                type="text" 
                class="form-input"
                placeholder="123-4567"
              >
              <button 
                @click="fetchAddressFromPostalCode"
                class="address-fetch-btn"
                :disabled="!selectedCase.postalCode || isAddressFetching"
                title="郵便番号から住所を取得"
              >
                <span v-if="isAddressFetching">取得中...</span>
                <span v-else>🏠 住所取得</span>
              </button>
            </div>
          </div>
          <div class="form-group full-width">
            <label>対象物件住所</label>
            <div class="input-with-button">
              <input 
                v-model="selectedCase.propertyAddress" 
                type="text" 
                class="form-input"
                placeholder="東京都渋谷区..."
                @blur="updateStreetViewLink"
              >
              <button 
                @click="copyToClipboard(selectedCase.propertyAddress)"
                class="copy-btn"
                :disabled="!selectedCase.propertyAddress"
                title="住所をコピー"
              >
                📋
              </button>
            </div>
          </div>
          <div class="form-group full-width">
            <label>物件情報リンク</label>
            <div class="link-input-group">
              <input 
                v-model="selectedCase.propertyMapLink" 
                type="url" 
                class="form-input"
                placeholder="Google Map ストリートビューURL"
                readonly
              >
              <button 
                @click="generateStreetViewLink" 
                class="link-generate-btn"
                :disabled="!selectedCase.propertyAddress"
              >
                自動生成
              </button>
              <button 
                @click="openPropertyMapLink" 
                class="link-open-btn"
                :disabled="!selectedCase.propertyMapLink"
                title="新しいタブでマップを開く"
              >
                🗺️ 開く
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 見積もり・工事に関するご要望 -->
      <div class="form-section">
        <h3 class="form-section-title">見積もり・工事に関するご要望</h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>見積もり希望箇所</label>
            <div class="tag-selector">
              <div 
                v-for="area in estimateAreas"
                :key="area.id"
                @click="toggleEstimateArea(area.id)"
                :class="['tag-item', { 
                  selected: selectedCase.estimateAreas?.includes(area.id) 
                }]"
              >
                {{ area.name }}
              </div>
            </div>
          </div>
          <div class="form-group full-width">
            <label>特殊要件・対応条件</label>
            <div class="tag-selector">
              <div 
                v-for="requirement in specialRequirements"
                :key="requirement.id"
                @click="toggleSpecialRequirement(requirement.id)"
                :class="['tag-item', { 
                  selected: selectedCase.specialRequirements?.includes(requirement.id) 
                }]"
              >
                {{ requirement.name }}
              </div>
            </div>
          </div>
          <div class="form-group half-width">
            <label>希望社数</label>
            <select v-model="selectedCase.desiredCompanyCount" class="form-select">
              <option value="">選択してください</option>
              <option value="1社">1社</option>
              <option value="2社">2社</option>
              <option value="3社">3社</option>
              <option value="4社">4社</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>施工時期</label>
            <select v-model="selectedCase.constructionTiming" class="form-select">
              <option value="">選択してください</option>
              <option value="すぐに">すぐに</option>
              <option value="1ヶ月以内">1ヶ月以内</option>
              <option value="3ヶ月以内">3ヶ月以内</option>
              <option value="半年以内">半年以内</option>
              <option value="未定">未定</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>他社見積もり状況</label>
            <select v-model="selectedCase.otherEstimateStatus" class="form-select">
              <option value="">選択してください</option>
              <option value="取得済み">取得済み</option>
              <option value="依頼中">依頼中</option>
              <option value="未取得">未取得</option>
              <option value="検討中">検討中</option>
            </select>
          </div>
          <div class="form-group half-width">
            <label>他社見積もり数</label>
            <select v-model="selectedCase.otherEstimateCount" class="form-select">
              <option value="">選択してください</option>
              <option value="0">0社</option>
              <option value="1">1社</option>
              <option value="2">2社</option>
              <option value="3社以上">3社以上</option>
              <option value="不明">不明</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 4. 現地調査・立ち会い関連 -->
      <div class="form-section">
        <h3 class="form-section-title">現地調査・立ち会い関連</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>立ち会い可否</label>
            <select v-model="selectedCase.attendanceAvailable" class="form-select">
              <option value="">選択してください</option>
              <option value="可能">可能</option>
              <option value="不可">不可</option>
              <option value="要相談">要相談</option>
            </select>
          </div>
          <div class="form-group">
            <label>立ち会い者関係性</label>
            <select v-model="selectedCase.attendeeRelationship" class="form-select">
              <option value="">選択してください</option>
              <option value="本人">本人</option>
              <option value="配偶者">配偶者</option>
              <option value="家族">家族</option>
              <option value="代理人">代理人</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 5. 連絡方法・その他 -->
      <div class="form-section">
        <h3 class="form-section-title">連絡方法・その他</h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>連絡時間帯</label>
            <div class="time-selector-container">
              <div class="time-button-groups">
                <div class="button-group">
                  <span class="group-label">曜日:</span>
                  <button 
                    v-for="day in dayOptions"
                    :key="day"
                    type="button"
                    @click="addTimeOption('contactTimePreference', day)"
                    class="time-option-btn"
                  >
                    {{ day }}
                  </button>
                </div>
                <div class="button-group">
                  <span class="group-label">時間帯:</span>
                  <button 
                    v-for="time in timeOptions"
                    :key="time"
                    type="button"
                    @click="addTimeOption('contactTimePreference', time)"
                    class="time-option-btn"
                  >
                    {{ time }}
                  </button>
                </div>
              </div>
              <input 
                v-model="selectedCase.contactTimePreference" 
                type="text" 
                class="form-input"
                placeholder="ボタンを選択して連絡時間帯を入力してください"
              >
            </div>
          </div>
          <div class="form-group full-width">
            <label>見積もり送付先住所</label>
            <textarea 
              v-model="selectedCase.estimateDeliveryAddress" 
              class="form-textarea"
              placeholder="郵送希望の場合の住所"
              rows="2"
            ></textarea>
          </div>
          <div class="form-group full-width">
            <label>流入検索ワード</label>
            <input 
              v-model="selectedCase.searchKeywords" 
              type="text" 
              class="form-input"
              placeholder="外壁塗装 東京"
            >
          </div>
        </div>
      </div>

      <!-- 案件メモ -->
      <div class="form-section">
        <h3 class="form-section-title">案件メモ</h3>
        <div class="memo-container">
          <textarea 
            v-model="selectedCase.notes" 
            class="form-textarea memo-textarea"
            placeholder="顧客からの要望や特記事項を入力..."
            rows="4"
          ></textarea>
          <div class="memo-actions">
            <button 
              @click="showReviewModal"
              class="improve-btn"
            >
              <i class="icon-ai"></i>
              AI全項目添削
            </button>
          </div>
        </div>
      </div>

      <!-- 加盟店ランキング -->
      <div class="franchisee-ranking-section">
        <div class="ranking-header">
          <h3 class="section-title">
            {{ currentRankingTitle }}
            <span class="ranking-subtitle">{{ currentRankingSubtitle }}</span>
          </h3>
          <div class="ranking-controls">
            <!-- 振り分け方法ボタン -->
            <div class="method-buttons">
              <button
                v-for="method in assignmentMethods"
                :key="method.id"
                @click="selectedMethod = method.id"
                :class="['method-btn', { active: selectedMethod === method.id }]"
                :title="method.description"
              >
                {{ method.name }}
              </button>
            </div>
            
            <!-- 希望社数入力 -->
            <div class="desired-count-input">
              <label>希望社数:</label>
              <select v-model="selectedCase.desiredCompanyCount" class="count-select">
                <option value="1社">1社</option>
                <option value="2社">2社</option>
                <option value="3社">3社</option>
                <option value="4社">4社</option>
              </select>
            </div>
            
            <!-- 追加候補変更ボタン -->
            <button 
              @click="replaceNextCandidate"
              class="replace-candidate-btn"
              :disabled="selectedMethod !== 'selected' || !hasNextCandidate"
            >
              🔄 候補変更
            </button>
          </div>
        </div>

        <!-- 加盟店テーブル -->
        <div class="franchisee-table-container">
          <table class="franchisee-table">
            <thead>
              <tr>
                <th class="rank-col">順位</th>
                <th class="select-col">選択</th>
                <th class="name-col">加盟店名</th>
                <th class="area-col">対応エリア</th>
                <th class="metric-col">{{ currentMetricLabel }}</th>
                <th class="special-col">特殊対応</th>
                <th class="response-col">応答時間</th>
                <th class="detail-col">詳細</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(franchisee, index) in filteredFranchisees"
                :key="franchisee.id"
                :class="['franchisee-row', { 
                  'selected': selectedCase.selectedFranchisees?.includes(franchisee.id),
                  'unavailable': !franchisee.isAvailable,
                  'customer-selected': selectedCase.preSelectedFranchisees?.includes(franchisee.id),
                  'partial-match': getMatchScore(franchisee) > 0 && getMatchScore(franchisee) < 100
                }]"
              >
                <td class="rank-cell">{{ index + 1 }}</td>
                <td class="select-cell">
                  <input
                    type="checkbox"
                    :value="franchisee.id"
                    v-model="selectedCase.selectedFranchisees"
                    :disabled="!franchisee.isAvailable || (selectedCase.selectedFranchisees?.length >= 4 && !selectedCase.selectedFranchisees?.includes(franchisee.id))"
                    class="franchisee-checkbox"
                  >
                </td>
                <td class="name-cell">
                  <div class="franchisee-info">
                    <span class="franchisee-name">{{ franchisee.name }}</span>
                    <span class="franchisee-id">{{ franchisee.id }}</span>
                    <span 
                      v-if="selectedCase.preSelectedFranchisees?.includes(franchisee.id)" 
                      class="customer-selected-badge"
                    >
                      お客様選択
                    </span>
                  </div>
                </td>
                <td class="area-cell">
                  <span class="area-tags">
                    <span
                      v-for="area in franchisee.coverageAreas"
                      :key="area"
                      class="area-tag"
                    >
                      {{ area }}
                    </span>
                  </span>
                </td>
                <td class="metric-cell">
                  <span class="metric-value">{{ formatMetricValue(franchisee) }}</span>
                </td>
                <td class="special-cell">
                  <div class="capability-tags">
                    <span 
                      v-for="capability in franchisee.capabilities"
                      :key="capability"
                      :class="['capability-tag', {
                        'matched': selectedCase.specialRequirements?.includes(capability),
                        'unmatched': !selectedCase.specialRequirements?.includes(capability)
                      }]"
                    >
                      {{ getCapabilityName(capability) }}
                    </span>
                  </div>
                  <div class="match-score">
                    {{ getMatchScore(franchisee) }}% マッチ
                  </div>
                </td>
                <td class="response-cell">{{ franchisee.avgResponseTime }}時間</td>
                <td class="detail-cell">
                  <button
                    @click="openFranchiseeDetail(franchisee.id)"
                    class="detail-btn"
                    title="加盟店の詳細情報を確認"
                  >
                    詳細
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- アクションボタン -->
      <div class="action-section">
        <button
          @click="showAssignmentConfirm"
          :disabled="!canAssign"
          class="assign-btn"
        >
          <i class="icon-assign"></i>
          案件を振り分ける
        </button>
        <button
          @click="saveCase"
          class="save-btn"
        >
          <i class="icon-save"></i>
          保存
        </button>
      </div>
    </div>

    <!-- AI添削確認モーダル -->
    <div v-if="showReviewConfirm" class="modal-overlay" @click="closeReviewModal">
      <div class="review-modal" @click.stop>
        <div class="modal-header">
          <h3>AI添削項目確認</h3>
          <button @click="closeReviewModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p class="review-description">
            以下の項目を添削します。不要な項目は「×」をクリックして除外してください。
          </p>
          <div class="review-items">
            <div 
              v-for="item in reviewItems"
              :key="item.field"
              :class="['review-item', { 'excluded': excludedItems.includes(item.field) }]"
            >
              <div class="review-item-header">
                <span class="review-field">{{ item.label }}</span>
                <button 
                  @click="toggleExcludeItem(item.field)"
                  :class="['exclude-btn', { 'excluded': excludedItems.includes(item.field) }]"
                >
                  ×
                </button>
              </div>
              <div class="review-current">現在: {{ item.current || '未入力' }}</div>
              <div class="review-suggestion">提案: {{ item.suggestion }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeReviewModal" class="btn-cancel">キャンセル</button>
          <button @click="executeReview" class="btn-execute" :disabled="isImproving">
            <i class="icon-ai" :class="{ 'spinning': isImproving }"></i>
            {{ isImproving ? '添削実行中...' : '添削実行' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 案件振り分け確認モーダル -->
    <div v-if="showAssignmentConfirmModal" class="modal-overlay" @click="closeAssignmentConfirm">
      <div class="assignment-confirm-modal" @click.stop>
        <div class="modal-header">
          <h3>案件振り分け確認</h3>
          <button @click="closeAssignmentConfirm" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="confirm-summary">
            <h4>振り分け内容</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <label>顧客名</label>
                <span>{{ selectedCase?.customerNameKanji || '未入力' }}</span>
              </div>
              <div class="summary-item">
                <label>電話番号</label>
                <span>{{ selectedCase?.customerPhone || '未入力' }}</span>
              </div>
              <div class="summary-item">
                <label>物件住所</label>
                <span>{{ selectedCase?.propertyAddress || '未入力' }}</span>
              </div>
              <div class="summary-item">
                <label>振り分け方法</label>
                <span>{{ currentRankingTitle }}</span>
              </div>
              <div class="summary-item full-width">
                <label>選択された加盟店 ({{ selectedCase?.selectedFranchisees?.length || 0 }}社)</label>
                <div class="selected-franchisees-list">
                  <div 
                    v-for="franchiseeId in selectedCase?.selectedFranchisees" 
                    :key="franchiseeId"
                    class="franchisee-item"
                  >
                    <span class="franchisee-name">{{ getFranchiseeById(franchiseeId)?.name }}</span>
                    <span 
                      v-if="selectedCase?.preSelectedFranchisees?.includes(franchiseeId)"
                      class="customer-selected-tag"
                    >
                      お客様選択
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="confirm-warning">
            <p><strong>⚠️ 注意事項</strong></p>
            <ul>
              <li>選択された加盟店にメールが送信されます</li>
              <li>スプレッドシートが更新されます</li>
              <li>案件ステータスが「転送済み」に変更されます</li>
              <li>この操作は取り消しできません</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeAssignmentConfirm" class="btn-cancel">キャンセル</button>
          <button 
            @click="executeAssignment" 
            class="btn-execute"
            :disabled="isLoading"
          >
            <i class="icon-assign" :class="{ 'spinning': isLoading }"></i>
            {{ isLoading ? '振り分け中...' : '振り分け実行' }}
          </button>
        </div>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="error-alert">
      <div class="error-content">
        <i class="icon-error"></i>
        <span>{{ error }}</span>
        <button @click="clearError" class="error-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// リアクティブデータ
const isLoading = ref(false)
const isImproving = ref(false)
const error = ref('')
const selectedCaseId = ref(null)
const selectedMethod = ref('selected')
const showReviewConfirm = ref(false)
const showAssignmentConfirmModal = ref(false)
const excludedItems = ref([])
const lastConstructionInput = ref('')
const isAddressFetching = ref(false)

// 案件データ（スプレッドシートから取得想定）
const cases = ref([
  {
    id: 'CASE_001',
    customerName: '',
    customerNameKanji: '',
    customerNameKana: '',
    customerPhone: '090-1234-5678',
    email: '',
    gender: '',
    ageRange: '', // 自動取得対応
    relationship: '',
    propertyType: '',
    floors: '',
    floorArea: '',
    buildingAge: '',
    constructionCount: '',
    lastConstructionYearsAgo: '', // 変更
    exteriorMaterial: '',
    roofMaterial: '',
    postalCode: '150-0001', // 追加
    propertyAddress: '東京都渋谷区神宮前1-1-1',
    propertyMapLink: '',
    estimateAreas: [], // タグ式に変更
    specialRequirements: [],
    desiredCompanyCount: '3社',
    otherEstimateStatus: '',
    otherEstimateCount: '', // 選択式に変更
    constructionTiming: '',
    attendanceAvailable: '',
    attendeeRelationship: '',
    contactTimePreference: '',
    estimateDeliveryAddress: '',
    searchKeywords: '',
    notes: '',
    status: 'ヒアリング中',
    createdAt: new Date().toISOString(),
    selectedFranchisees: [],
    preSelectedFranchisees: ['FRANCHISE_001', 'FRANCHISE_002', 'FRANCHISE_003'], // CV時に選択された業者
    replacementQueue: ['FRANCHISE_004'] // 差し替え候補（5番手以降）
  }
])

// 見積もり希望箇所マスタ
const estimateAreas = ref([
  { id: 'exterior_painting', name: '外壁塗装' },
  { id: 'roof_painting', name: '屋根塗装' },
  { id: 'exterior_replacement', name: '外壁張り替え' },
  { id: 'roof_replacement', name: '屋根葺き替え' },
  { id: 'exterior_cover', name: '外壁カバー工法' },
  { id: 'roof_cover', name: '屋根カバー工法' },
  { id: 'rooftop_waterproof', name: '屋上防水' },
  { id: 'balcony_waterproof', name: 'ベランダ防水' },
  { id: 'leak_repair', name: '雨漏り修繕' },
  { id: 'interior', name: '内装' },
  { id: 'other', name: 'その他' }
])

// 時間選択オプション
const dayOptions = ref([
  '月', '火', '水', '木', '金', '土', '日', '祝', '平日', '土日'
])

const timeOptions = ref([
  '午前中', '午後', '随時', '○時頃', '○時~○時', '○時以降'
])

// 特殊要件マスタ
const specialRequirements = ref([
  { id: 'photocatalyst_paint', name: '光触媒塗料対応' },
  { id: 'inorganic_paint', name: '無機塗料対応' },
  { id: 'fluorine_paint', name: 'フッ素塗料対応' },
  { id: 'heat_shield_paint', name: '遮熱塗料対応' },
  { id: 'no_roof_access_survey', name: '屋根登らず現調' },
  { id: 'no_scaffolding', name: '足場なし工法' },
  { id: 'night_work', name: '夜間作業対応' },
  { id: 'weekend_work', name: '土日作業対応' },
  { id: 'loan_support', name: 'ローン対応' },
  { id: 'instant_estimate', name: '即日見積対応' },
  { id: '3d_diagnosis', name: '3D診断対応' },
  { id: 'drone_inspection', name: 'ドローン点検対応' }
])

// 振り分け方法
const assignmentMethods = ref([
  { id: 'selected', name: '選択中', icon: 'icon-selected', description: '流入時に選択された業者' },
  { id: 'price', name: '安い順', icon: 'icon-price', description: '平均工事単価安い順（30万円以下除く）' },
  { id: 'recommended', name: 'おすすめ順', icon: 'icon-star', description: '直近売り上げ順' },
  { id: 'reviews', name: '口コミ順', icon: 'icon-reviews', description: '成約率順' },
  { id: 'quality', name: '高品質順', icon: 'icon-quality', description: '平均工事金額高い順（30万円以下除く）' },
  { id: 'distance', name: '距離順', icon: 'icon-location', description: '物件からの距離順' }
])

// モック加盟店データ
const mockFranchisees = ref([
  {
    id: 'FRANCHISE_001',
    name: '東京都市部塗装',
    coverageAreas: ['東京都', '神奈川県'],
    avgPrice: 120000,
    totalSales: 5200000,
    successRate: 85.5,
    avgWorkPrice: 180000,
    totalCases: 32,
    avgResponseTime: 2.5,
    isAvailable: true,
    latitude: 35.6762,
    longitude: 139.6503,
    capabilities: ['photocatalyst_paint', 'loan_support', 'weekend_work', '3d_diagnosis']
  },
  {
    id: 'FRANCHISE_002',
    name: '神奈川県央建設',
    coverageAreas: ['神奈川県', '東京都'],
    avgPrice: 98000,
    totalSales: 4800000,
    successRate: 78.2,
    avgWorkPrice: 165000,
    totalCases: 28,
    avgResponseTime: 3.2,
    isAvailable: true,
    latitude: 35.5322,
    longitude: 139.7031,
    capabilities: ['inorganic_paint', 'no_roof_access_survey', 'instant_estimate']
  },
  {
    id: 'FRANCHISE_003',
    name: '千葉外装工業',
    coverageAreas: ['千葉県', '東京都'],
    avgPrice: 105000,
    totalSales: 3600000,
    successRate: 82.1,
    avgWorkPrice: 155000,
    totalCases: 24,
    avgResponseTime: 4.1,
    isAvailable: true,
    latitude: 35.6074,
    longitude: 140.1065,
    capabilities: ['fluorine_paint', 'heat_shield_paint', 'drone_inspection']
  },
  {
    id: 'FRANCHISE_004',
    name: '埼玉リフォーム',
    coverageAreas: ['埼玉県', '東京都'],
    avgPrice: 115000,
    totalSales: 4200000,
    successRate: 79.8,
    avgWorkPrice: 170000,
    totalCases: 26,
    avgResponseTime: 3.8,
    isAvailable: true,
    latitude: 35.8617,
    longitude: 139.6455,
    capabilities: ['photocatalyst_paint', 'no_scaffolding', 'night_work']
  }
])

// AI添削用データ
const reviewItems = ref([])

// 計算プロパティ
const selectedCase = computed(() => {
  return cases.value.find(c => c.id === selectedCaseId.value)
})

const sortedCases = computed(() => {
  return [...cases.value].sort((a, b) => {
    // 時系列順（新しい順）
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

const currentRankingTitle = computed(() => {
  const method = assignmentMethods.value.find(m => m.id === selectedMethod.value)
  return method ? method.name : ''
})

const currentRankingSubtitle = computed(() => {
  const method = assignmentMethods.value.find(m => m.id === selectedMethod.value)
  return method ? method.description : ''
})

const currentMetricLabel = computed(() => {
  switch (selectedMethod.value) {
    case 'selected': return '選択状況'
    case 'price': return '平均単価'
    case 'recommended': return '売上'
    case 'reviews': return '成約率'
    case 'quality': return '平均工事金額'
    case 'distance': return '距離'
    default: return '指標'
  }
})

const filteredFranchisees = computed(() => {
  let franchisees = [...mockFranchisees.value]
  
  // 「選択中」モードの場合は特別な処理
  if (selectedMethod.value === 'selected') {
    if (!selectedCase.value?.preSelectedFranchisees?.length) {
      return []
    }
    
    // 事前選択された業者を取得
    const preSelectedFranchisees = selectedCase.value.preSelectedFranchisees
      .map(id => mockFranchisees.value.find(f => f.id === id))
      .filter(Boolean)
    
    // 希望社数を取得（例: "3社" → 3）
    const desiredCount = parseInt(selectedCase.value.desiredCompanyCount?.replace('社', '') || '3')
    
    // 希望社数分は選択済みとして表示
    const result = [...preSelectedFranchisees.slice(0, desiredCount)]
    
    // 追加候補として1社表示（希望社数を超える場合）
    if (preSelectedFranchisees.length > desiredCount) {
      result.push(preSelectedFranchisees[desiredCount])
    }
    
    // 追加候補があれば表示（チェックなし）
    if (selectedCase.value.replacementQueue?.length > 0) {
      const additionalCandidate = mockFranchisees.value.find(f => 
        f.id === selectedCase.value.replacementQueue[0]
      )
      if (additionalCandidate && !result.find(r => r.id === additionalCandidate.id)) {
        result.push(additionalCandidate)
      }
    }
    
    return result
  }
  
  // エリアフィルター（選択されたケースの住所から都道府県を抽出）
  if (selectedCase.value?.propertyAddress) {
    const prefecture = extractPrefecture(selectedCase.value.propertyAddress)
    if (prefecture) {
      franchisees = franchisees.filter(f => 
        f.coverageAreas.some(area => area.includes(prefecture))
      )
    }
  }
  
  // 選択された方法でソート
  switch (selectedMethod.value) {
    case 'price':
      franchisees.sort((a, b) => a.avgPrice - b.avgPrice)
      break
    case 'recommended':
      franchisees.sort((a, b) => b.totalSales - a.totalSales)
      break
    case 'reviews':
      franchisees.sort((a, b) => b.successRate - a.successRate)
      break
    case 'quality':
      franchisees.sort((a, b) => b.avgWorkPrice - a.avgWorkPrice)
      break
    case 'distance':
      if (selectedCase.value?.propertyAddress) {
        // 距離計算（簡易版、実際はGoogle Maps API使用）
        franchisees.sort((a, b) => {
          const distanceA = calculateDistance(selectedCase.value.propertyAddress, a)
          const distanceB = calculateDistance(selectedCase.value.propertyAddress, b)
          return distanceA - distanceB
        })
      }
      break
  }
  
  // 特殊要件マッチング順でさらにソート
  if (selectedCase.value?.specialRequirements?.length > 0) {
    franchisees.sort((a, b) => {
      const scoreA = getMatchScore(a)
      const scoreB = getMatchScore(b)
      return scoreB - scoreA
    })
  }
  
  // 常に最大4社まで表示（希望社数+追加候補）
  return franchisees.slice(0, 4)
})

const canAssign = computed(() => {
  return selectedCase.value && 
         selectedCase.value.customerNameKanji && 
         selectedCase.value.customerPhone && 
         selectedCase.value.propertyAddress && 
         selectedCase.value.selectedFranchisees?.length > 0
})

const hasNextCandidate = computed(() => {
  return selectedCase.value?.replacementQueue?.length > 0
})

// メソッド
const selectCase = (caseId) => {
  selectedCaseId.value = caseId
}

const toggleEstimateArea = (areaId) => {
  if (!selectedCase.value.estimateAreas) {
    selectedCase.value.estimateAreas = []
  }
  
  const index = selectedCase.value.estimateAreas.indexOf(areaId)
  if (index > -1) {
    selectedCase.value.estimateAreas.splice(index, 1)
  } else {
    selectedCase.value.estimateAreas.push(areaId)
  }
}

const toggleSpecialRequirement = (requirementId) => {
  if (!selectedCase.value.specialRequirements) {
    selectedCase.value.specialRequirements = []
  }
  
  const index = selectedCase.value.specialRequirements.indexOf(requirementId)
  if (index > -1) {
    selectedCase.value.specialRequirements.splice(index, 1)
  } else {
    selectedCase.value.specialRequirements.push(requirementId)
  }
}

const copyToClipboard = async (text) => {
  if (!text) return
  
  try {
    await navigator.clipboard.writeText(text)
    alert('コピーしました')
  } catch (err) {
    console.error('コピーに失敗しました:', err)
    alert('コピーに失敗しました')
  }
}

const addTimeOption = (fieldName, option) => {
  if (!selectedCase.value) return
  
  const currentValue = selectedCase.value[fieldName] || ''
  let newValue = currentValue
  
  // 既存の値がある場合はカンマと空白で区切る
  if (currentValue.trim()) {
    newValue += '、' + option
  } else {
    newValue = option
  }
  
  selectedCase.value[fieldName] = newValue
}

const updateLastConstructionYearsAgo = () => {
  if (!selectedCase.value) return
  
  const inputValue = lastConstructionInput.value.trim()
  if (inputValue) {
    selectedCase.value.lastConstructionYearsAgo = inputValue + '年前'
  } else {
    selectedCase.value.lastConstructionYearsAgo = ''
  }
}

const fetchAddressFromPostalCode = async () => {
  if (!selectedCase.value?.postalCode) return
  
  try {
    isAddressFetching.value = true
    
    // 郵便番号から-を除去
    const cleanPostalCode = selectedCase.value.postalCode.replace(/-/g, '')
    
    // 郵便番号が7桁でない場合はエラー
    if (cleanPostalCode.length !== 7 || !/^\d{7}$/.test(cleanPostalCode)) {
      alert('正しい郵便番号を入力してください（例: 123-4567）')
      return
    }
    
    // zipcloud APIを使用して住所を取得
    const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`)
    const data = await response.json()
    
    if (data.status === 200 && data.results && data.results.length > 0) {
      const result = data.results[0]
      
      // 都道府県 + 市区町村 + 町域名を結合
      const fullAddress = `${result.address1}${result.address2}${result.address3}`
      
      // 既存の住所がある場合は上書き確認
      if (selectedCase.value.propertyAddress && selectedCase.value.propertyAddress.trim()) {
        const shouldOverwrite = confirm(
          `現在の住所: ${selectedCase.value.propertyAddress}\n\n` +
          `取得した住所: ${fullAddress}\n\n` +
          '住所を上書きしますか？'
        )
        if (!shouldOverwrite) return
      }
      
      selectedCase.value.propertyAddress = fullAddress
      
      // ストリートビューリンクも自動更新
      updateStreetViewLink()
      
      console.log('住所取得成功:', result)
      
    } else {
      alert('住所が見つかりませんでした。郵便番号を確認してください。')
    }
    
  } catch (error) {
    console.error('住所取得エラー:', error)
    alert('住所の取得に失敗しました。ネットワーク接続を確認してください。')
  } finally {
    isAddressFetching.value = false
  }
}

const replaceNextCandidate = () => {
  if (!selectedCase.value?.replacementQueue?.length) return
  
  // 現在の追加候補を取得
  const currentAdditional = selectedCase.value.replacementQueue[0]
  
  // 次の候補があるかチェック（実際にはもっと多くの候補があると仮定）
  const allAvailableFranchisees = mockFranchisees.value.filter(f => 
    f.isAvailable && 
    !selectedCase.value.preSelectedFranchisees.includes(f.id) &&
    !selectedCase.value.replacementQueue.includes(f.id)
  )
  
  if (allAvailableFranchisees.length > 0) {
    // 現在の候補を削除し、新しい候補を追加
    selectedCase.value.replacementQueue.shift()
    selectedCase.value.replacementQueue.push(allAvailableFranchisees[0].id)
    
    console.log(`追加候補変更: ${currentAdditional} → ${allAvailableFranchisees[0].id}`)
  } else {
    alert('これ以上の追加候補がありません')
  }
}

const getCapabilityName = (capabilityId) => {
  const requirement = specialRequirements.value.find(req => req.id === capabilityId)
  return requirement ? requirement.name : capabilityId
}

const getMatchScore = (franchisee) => {
  if (!selectedCase.value?.specialRequirements?.length) return 100
  
  const totalRequirements = selectedCase.value.specialRequirements.length
  const matchedRequirements = selectedCase.value.specialRequirements.filter(req => 
    franchisee.capabilities.includes(req)
  ).length
  
  return Math.round((matchedRequirements / totalRequirements) * 100)
}



const getFranchiseeById = (id) => {
  return mockFranchisees.value.find(f => f.id === id)
}

const openFranchiseeDetail = (franchiseeId) => {
  // 加盟店詳細ページのURL（後で実装予定）
  const detailUrl = `/franchisee/${franchiseeId}`
  
  // 新しいタブで詳細ページを開く
  window.open(detailUrl, '_blank', 'noopener,noreferrer')
  
  console.log(`加盟店詳細ページを開く: ${franchiseeId}`)
}

const formatMetricValue = (franchisee) => {
  switch (selectedMethod.value) {
    case 'selected': {
      if (!selectedCase.value?.preSelectedFranchisees) return '-'
      const desiredCount = parseInt(selectedCase.value.desiredCompanyCount?.replace('社', '') || '3')
      const franchiseeIndex = selectedCase.value.preSelectedFranchisees.indexOf(franchisee.id)
      
      // 追加候補かチェック
      if (selectedCase.value.replacementQueue?.includes(franchisee.id)) {
        return '追加候補'
      }
      
      if (franchiseeIndex < desiredCount) {
        return '選択済み'
      } else {
        return '追加候補'
      }
    }
    case 'price':
      return `¥${franchisee.avgPrice.toLocaleString()}`
    case 'recommended':
      return `¥${franchisee.totalSales.toLocaleString()}`
    case 'reviews':
      return `${franchisee.successRate}%`
    case 'quality':
      return `¥${franchisee.avgWorkPrice.toLocaleString()}`
    case 'distance':
      return `${calculateDistance(selectedCase.value?.propertyAddress, franchisee)}km`
    default:
      return '-'
  }
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusClass = (status) => {
  const statusClasses = {
    'ヒアリング中': 'status-pending',
    '転送済み': 'status-sent',
    '対応完了': 'status-completed'
  }
  return statusClasses[status] || 'status-pending'
}

const extractPrefecture = (address) => {
  const prefectures = ['東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '愛知県', '福岡県']
  return prefectures.find(pref => address.includes(pref))
}

const calculateDistance = (_address, _franchisee) => {
  // 簡易版距離計算（実際はGoogle Maps API使用）
  return Math.round(Math.random() * 20 + 1)
}

const generateStreetViewLink = async () => {
  if (!selectedCase.value.propertyAddress) return
  
  try {
    // 実際のGoogle Mapsリンクを生成（住所ベース）
    const encodedAddress = encodeURIComponent(selectedCase.value.propertyAddress)
    
    // Google Mapsの検索リンクを生成
    selectedCase.value.propertyMapLink = 
      `https://www.google.com/maps/search/${encodedAddress}`
      
    console.log('マップリンク生成成功:', selectedCase.value.propertyMapLink)
      
  } catch (error) {
    console.error('ストリートビューリンク生成エラー:', error)
    alert('マップリンクの生成に失敗しました')
  }
}

const openPropertyMapLink = () => {
  if (!selectedCase.value?.propertyMapLink) return
  
  try {
    // 新しいタブでマップリンクを開く
    window.open(selectedCase.value.propertyMapLink, '_blank', 'noopener,noreferrer')
    console.log('物件マップを開く:', selectedCase.value.propertyMapLink)
  } catch (error) {
    console.error('マップリンクオープンエラー:', error)
    alert('リンクを開けませんでした。URLを確認してください。')
  }
}

const updateStreetViewLink = () => {
  generateStreetViewLink()
}

// AI添削機能
const showReviewModal = () => {
  generateReviewItems()
  showReviewConfirm.value = true
  excludedItems.value = []
}

const closeReviewModal = () => {
  showReviewConfirm.value = false
}

const toggleExcludeItem = (field) => {
  const index = excludedItems.value.indexOf(field)
  if (index > -1) {
    excludedItems.value.splice(index, 1)
  } else {
    excludedItems.value.push(field)
  }
}

const generateReviewItems = () => {
  reviewItems.value = [
    {
      field: 'customerNameKanji',
      label: '氏名（漢字）',
      current: selectedCase.value.customerNameKanji,
      suggestion: '田中 太郎（敬称略）'
    },
    {
      field: 'customerNameKana',
      label: '氏名（カナ）',
      current: selectedCase.value.customerNameKana,
      suggestion: 'タナカ タロウ'
    },
    {
      field: 'propertyAddress',
      label: '物件住所',
      current: selectedCase.value.propertyAddress,
      suggestion: '東京都渋谷区神南1-2-3（住居表示整理）'
    },
    {
      field: 'notes',
      label: '案件メモ',
      current: selectedCase.value.notes,
      suggestion: '【案件概要】\n外壁塗装に関するご相談です。\n\n【特記事項】\n・緊急度: 通常\n・施工時期: 未定\n\nよろしくお願いいたします。'
    }
  ].filter(item => item.current) // 入力済み項目のみ
}

const executeReview = async () => {
  try {
    isImproving.value = true
    
    // AI添削実行（モック）
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 除外されていない項目を添削
    reviewItems.value.forEach(item => {
      if (!excludedItems.value.includes(item.field)) {
        selectedCase.value[item.field] = item.suggestion
      }
    })
    
    alert('AI添削が完了しました！')
    closeReviewModal()
    
  } catch (error) {
    error.value = 'AI添削に失敗しました'
  } finally {
    isImproving.value = false
  }
}

const assignCase = async () => {
  try {
    isLoading.value = true
    
    const assignmentData = {
      caseInfo: selectedCase.value,
      selectedFranchisees: selectedCase.value.selectedFranchisees,
      assignmentMethod: selectedMethod.value,
      timestamp: new Date().toISOString()
    }
    
    // スプレッドシート更新 + メール送信 + システム通知
    console.log('案件振り分け実行:', assignmentData)
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // ステータス更新
    selectedCase.value.status = '転送済み'
    
    alert('案件振り分けが完了しました！\n・スプレッドシートを更新\n・加盟店にメール送信\n・システム通知を送信')
    
  } catch (err) {
    error.value = err.message || '案件振り分けに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const showAssignmentConfirm = () => {
  showAssignmentConfirmModal.value = true
}

const closeAssignmentConfirm = () => {
  showAssignmentConfirmModal.value = false
}

const executeAssignment = async () => {
  showAssignmentConfirmModal.value = false
  await assignCase()
}

const saveCase = async () => {
  try {
    isLoading.value = true
    
    // スプレッドシート保存
    console.log('案件保存:', selectedCase.value)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    alert('案件情報を保存しました')
    
  } catch (err) {
    error.value = err.message || '保存に失敗しました'
  } finally {
    isLoading.value = false
  }
}

const clearError = () => {
  error.value = ''
}

// 自動保存機能
watch(selectedCase, (newCase) => {
  if (newCase) {
    // 5秒後に自動保存（実際はdebounce使用）
    setTimeout(() => {
      console.log('自動保存:', newCase.id)
    }, 5000)
  }
}, { deep: true })

// 振り分け方法変更時の再初期化
watch(selectedMethod, () => {
  if (selectedCase.value) {
    initializeFranchiseeSelection()
  }
})

// 希望社数変更時の再初期化
watch(() => selectedCase.value?.desiredCompanyCount, () => {
  if (selectedCase.value) {
    initializeFranchiseeSelection()
  }
})

// ライフサイクル
onMounted(() => {
  selectedCaseId.value = cases.value[0]?.id
  initializeFranchiseeSelection()
})

// 加盟店選択の初期化
const initializeFranchiseeSelection = () => {
  if (!selectedCase.value) return
  
  const desiredCount = parseInt(selectedCase.value.desiredCompanyCount?.replace('社', '') || '3')
  
  if (selectedMethod.value === 'selected' && selectedCase.value?.preSelectedFranchisees?.length) {
    // 「選択中」モードの場合は事前選択された業者から希望社数分を選択
    selectedCase.value.selectedFranchisees = selectedCase.value.preSelectedFranchisees.slice(0, desiredCount)
  } else {
    // その他の振り分け方法の場合は上位から希望社数分を選択
    const topFranchisees = filteredFranchisees.value.slice(0, desiredCount)
    selectedCase.value.selectedFranchisees = topFranchisees.map(f => f.id)
  }
}
</script>

<style scoped>
.assignment-management {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #0056b3;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-refresh.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 案件一覧 */
.case-list-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 20px 0;
}

.case-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.case-tab {
  background: #f8f9fa;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.case-tab:hover {
  border-color: #007bff;
}

.case-tab.active {
  border-color: #007bff;
  background: #e3f2fd;
}

.case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.case-id {
  font-weight: 600;
  color: #374151;
}

.case-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.customer-name {
  font-weight: 500;
  color: #1a1a1a;
}

.case-time {
  font-size: 12px;
  color: #6b7280;
}

.case-status {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.status-sent {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge.status-completed {
  background: #d4edda;
  color: #155724;
}

/* フォームセクション */
.case-detail-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.form-section-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group.half-width {
  grid-column: span 1;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.checkbox-label {
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
  margin-top: 24px;
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-checkbox {
  transform: scale(1.2);
}

/* コピーボタン付き入力フィールド */
.input-with-button {
  display: flex;
  gap: 8px;
}

.input-with-button .form-input {
  flex: 1;
}

.copy-btn {
  padding: 10px 12px;
  background: #f8f9fa;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}

.copy-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.copy-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 特殊要件タグセレクター */
.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.tag-item {
  background: #f3f4f6;
  color: #374151;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.tag-item:hover {
  background: #e5e7eb;
}

.tag-item.selected {
  background: #007bff;
  color: white;
}

/* ストリートビューリンク生成 */
.link-input-group {
  display: flex;
  gap: 8px;
}

.link-input-group .form-input {
  flex: 1;
}

.link-generate-btn {
  padding: 10px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.link-generate-btn:hover:not(:disabled) {
  background: #218838;
}

.link-generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-open-btn {
  padding: 10px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.link-open-btn:hover:not(:disabled) {
  background: #0056b3;
}

.link-open-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #6c757d;
}

/* メモ */
.memo-container {
  position: relative;
}

.memo-textarea {
  width: 100%;
  min-height: 120px;
}

.memo-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.improve-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #6f42c1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.improve-btn:hover:not(:disabled) {
  background: #5a2d91;
}

.improve-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.icon-ai.spinning {
  animation: spin 1s linear infinite;
}

/* 加盟店ランキング */
.franchisee-ranking-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.ranking-subtitle {
  font-size: 14px;
  color: #6b7280;
  font-weight: normal;
  margin-left: 12px;
}

.ranking-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

/* 振り分け方法ボタン */
.method-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.method-btn {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.method-btn:hover {
  background: #e9ecef;
}

.method-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

/* 希望社数入力 */
.desired-count-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.desired-count-input label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.count-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  min-width: 60px;
}

.replace-candidate-btn {
  padding: 8px 16px;
  background: #fd7e14;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.replace-candidate-btn:hover:not(:disabled) {
  background: #e8681e;
}

.replace-candidate-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

/* 加盟店テーブル */
.franchisee-table-container {
  overflow-x: auto;
}

.franchisee-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.franchisee-table th,
.franchisee-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.franchisee-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.rank-col { width: 60px; }
.select-col { width: 60px; }
.name-col { width: 200px; }
.area-col { width: 120px; }
.metric-col { width: 100px; }
.special-col { width: 200px; }
.response-col { width: 80px; }
.detail-col { width: 80px; }

.franchisee-row {
  transition: background-color 0.2s;
}

.franchisee-row:hover {
  background: #f8f9fa;
}

.franchisee-row.selected {
  background: #e3f2fd;
}

.franchisee-row.customer-selected {
  background: #fff3e0;
}

.franchisee-row.unavailable {
  opacity: 0.6;
}

.franchisee-row.partial-match {
  background: #fefcbf;
}

.franchisee-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.franchisee-name {
  font-weight: 500;
  color: #1a1a1a;
}

.franchisee-id {
  font-size: 12px;
  color: #6b7280;
}

.customer-selected-badge {
  background: #ff9800;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
}

.area-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.area-tag {
  background: #e5e7eb;
  color: #374151;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
}

.metric-value {
  font-weight: 600;
  color: #007bff;
}

.capability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.capability-tag {
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
}

.capability-tag.matched {
  background: #d4edda;
  color: #155724;
}

.capability-tag.unmatched {
  background: #f8f9fa;
  color: #6c757d;
}

.match-score {
  font-size: 11px;
  color: #007bff;
  font-weight: 500;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}


.franchisee-checkbox {
  transform: scale(1.2);
}

.detail-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.detail-btn:hover {
  background: #0056b3;
}


/* アクションボタン */
.action-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 32px;
  flex-wrap: wrap;
}

.assign-btn,
.save-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.assign-btn {
  background: #28a745;
  color: white;
}

.assign-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn {
  background: #17a2b8;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #138496;
}

.assign-btn:disabled,
.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* AI添削確認モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.review-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.review-description {
  color: #6b7280;
  margin-bottom: 20px;
  line-height: 1.5;
}

.review-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.review-item.excluded {
  opacity: 0.5;
  background: #f9fafb;
}

.review-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.review-field {
  font-weight: 600;
  color: #374151;
}

.exclude-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.exclude-btn:hover {
  background: #dc2626;
}

.exclude-btn.excluded {
  background: #6b7280;
}

.review-current {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.review-suggestion {
  font-size: 14px;
  color: #374151;
  background: #f0f9ff;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #0ea5e9;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-execute {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-execute {
  background: #6f42c1;
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-execute:hover:not(:disabled) {
  background: #5a2d91;
}

.btn-execute:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 案件振り分け確認モーダル */
.assignment-confirm-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.confirm-summary {
  margin-bottom: 24px;
}

.confirm-summary h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item.full-width {
  grid-column: 1 / -1;
}

.summary-item label {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
}

.summary-item span {
  font-size: 16px;
  color: #1a1a1a;
  font-weight: 500;
}

.selected-franchisees-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.franchisee-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #007bff;
}

.franchisee-name {
  font-weight: 500;
  color: #1a1a1a;
}

.customer-selected-tag {
  background: #ff9800;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.confirm-warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
}

.confirm-warning p {
  margin: 0 0 12px 0;
  color: #856404;
}

.confirm-warning ul {
  margin: 0;
  padding-left: 20px;
  color: #856404;
}

.confirm-warning li {
  margin-bottom: 4px;
}

/* 前回施工時期入力 */
.years-ago-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.years-ago-input .form-input {
  flex: 1;
  max-width: 100px;
}

.years-suffix {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
  white-space: nowrap;
}

/* 郵便番号住所取得 */
.postal-code-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.postal-code-input .form-input {
  flex: 1;
  max-width: 150px;
}

.address-fetch-btn {
  padding: 8px 12px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 90px;
}

.address-fetch-btn:hover:not(:disabled) {
  background: #138496;
}

.address-fetch-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.7;
}

/* 時間選択機能 */
.time-selector-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-button-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.button-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.group-label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
  min-width: 60px;
  flex-shrink: 0;
}

.time-option-btn {
  padding: 4px 8px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: all 0.2s;
  white-space: nowrap;
}

.time-option-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.time-option-btn:active {
  background: #007bff;
  color: white;
  border-color: #007bff;
  transform: scale(0.98);
}

/* エラー表示 */
.error-alert {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 12px;
  margin-top: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #721c24;
}

.error-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #721c24;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .assignment-management {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .case-tabs {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-group.half-width {
    grid-column: span 1;
  }
  
  .ranking-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .ranking-controls {
    width: 100%;
    justify-content: flex-start;
    gap: 8px;
  }
  
  .method-buttons {
    order: 1;
  }
  
  .desired-count-input {
    order: 2;
  }
  
  .replace-candidate-btn {
    order: 3;
    margin-top: 8px;
  }
  
  .action-section {
    flex-direction: column;
  }
  
  .review-modal {
    width: 95%;
    max-height: 95vh;
  }
  
  .input-with-button {
    gap: 4px;
  }
  
  .input-with-button .form-input {
    flex: 1;
    min-width: 0;
  }
  
  .copy-btn {
    padding: 8px 10px;
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
  }
}
</style>