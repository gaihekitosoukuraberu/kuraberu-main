/**
 * ====================================
 * ステータス定義 一元管理
 * ====================================
 *
 * 【機能】
 * - 配信管理シートの詳細ステータス定義
 * - 配信ステータス定義
 * - ステータスカテゴリ分類（アクティブ、終了、未対応）
 * - 各システムで再利用可能
 *
 * 【利用箇所】
 * - setup-cv-delivery-sheet.js（データバリデーション）
 * - CVDeliveryChecker.js（他社追客判定）
 * - フロントエンド（ステータス選択UI）
 */

var StatusDefinitions = {
  /**
   * V2003: 詳細ステータス（配信管理シート用・13種類）
   * 加盟店が各案件をどう追客しているかを表す
   */
  merchantStatus: {
    // === 1. 未対応 ===
    PENDING: {
      value: '未対応',
      category: 'pending',
      isActive: false,
      order: 1,
      description: '配信後未着手'
    },

    // === 2. 架電済/未アポ ===
    CALLED_NO_APPOINTMENT: {
      value: '架電済/未アポ',
      category: 'active',
      isActive: true,
      order: 2,
      description: '電話したがアポ取れず'
    },

    // === 3. アポ済 ===
    APPOINTMENT_SET: {
      value: 'アポ済',
      category: 'active',
      isActive: true,
      order: 3,
      description: '現調日時確定'
    },

    // === 4. 現調済 ===
    SITE_SURVEY_DONE: {
      value: '現調済',
      category: 'active',
      isActive: true,
      order: 4,
      description: '現地調査完了'
    },

    // === 5. 現調前キャンセル ===
    PRE_SURVEY_CANCEL: {
      value: '現調前キャンセル',
      category: 'closed_failed',
      isActive: false,
      order: 5,
      description: '現調前に顧客都合でキャンセル'
    },

    // === 6. 現調後失注 ===
    POST_SURVEY_LOST: {
      value: '現調後失注',
      category: 'closed_failed',
      isActive: false,
      order: 6,
      description: '現調後断られた'
    },

    // === 7. 見積提出済 ===
    QUOTE_SUBMITTED: {
      value: '見積提出済',
      category: 'active',
      isActive: true,
      order: 7,
      description: '見積書を顧客に提出'
    },

    // === 8. 成約 ===
    CONTRACT: {
      value: '成約',
      category: 'closed_success',
      isActive: false,
      order: 8,
      description: '自社で契約締結'
    },

    // === 9. 他社契約済 ===
    OTHER_COMPANY_CONTRACT: {
      value: '他社契約済',
      category: 'closed_failed',
      isActive: false,
      order: 9,
      description: '他の一般業者で契約'
    },

    // === 10. 別加盟店契約済 ===
    OTHER_FRANCHISE_CONTRACT: {
      value: '別加盟店契約済',
      category: 'closed_failed',
      isActive: false,
      order: 10,
      description: '他の加盟店で契約'
    },

    // === 11. 入金予定 ===
    PAYMENT_PENDING: {
      value: '入金予定',
      category: 'closed_success',
      isActive: false,
      order: 11,
      description: '契約金の入金待ち'
    },

    // === 12. 入金済 ===
    PAYMENT_RECEIVED: {
      value: '入金済',
      category: 'closed_success',
      isActive: false,
      order: 12,
      description: '入金確認完了'
    },

    // === 13. クレーム or 失注 ===
    CLAIM_OR_LOST: {
      value: 'クレーム or 失注',
      category: 'closed_failed',
      isActive: false,
      order: 13,
      description: '問題発生または失注'
    }
  },

  /**
   * 配信ステータス（大分類）
   */
  deliveryStatus: {
    DELIVERED: {
      value: '配信済み',
      description: '加盟店に配信済み（追客中）'
    },
    CONTRACT: {
      value: '成約',
      description: '成約完了'
    },
    LOST: {
      value: '失注',
      description: '失注（他社成約含む）'
    },
    CANCELLED: {
      value: 'キャンセル承認済み',
      description: 'キャンセル申請が承認された'
    }
  },

  /**
   * アクティブな追客ステータスのリストを返す
   * @return {Array<String>}
   */
  getActiveStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.isActive)
      .map(s => s.value);
  },

  /**
   * 終了ステータスのリストを返す（成功+失敗）
   * @return {Array<String>}
   */
  getClosedStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.category === 'closed_success' || s.category === 'closed_failed')
      .map(s => s.value);
  },

  /**
   * 成功終了ステータスのリストを返す
   * @return {Array<String>}
   */
  getClosedSuccessStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.category === 'closed_success')
      .map(s => s.value);
  },

  /**
   * 失敗終了ステータスのリストを返す
   * @return {Array<String>}
   */
  getClosedFailedStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.category === 'closed_failed')
      .map(s => s.value);
  },

  /**
   * 未対応ステータスのリストを返す
   * @return {Array<String>}
   */
  getPendingStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.category === 'pending')
      .map(s => s.value);
  },

  /**
   * 全ての詳細ステータスのリストを返す（データバリデーション用）
   * @return {Array<String>}
   */
  getAllMerchantStatuses: function() {
    return Object.values(this.merchantStatus).map(s => s.value);
  },

  /**
   * 全ての配信ステータスのリストを返す（データバリデーション用）
   * @return {Array<String>}
   */
  getAllDeliveryStatuses: function() {
    return Object.values(this.deliveryStatus).map(s => s.value);
  },

  /**
   * ステータスがアクティブな追客かどうか判定
   * @param {String} status - 詳細ステータス
   * @return {Boolean}
   */
  isActiveStatus: function(status) {
    return this.getActiveStatuses().includes(status);
  },

  /**
   * ステータスが終了状態かどうか判定
   * @param {String} status - 詳細ステータス
   * @return {Boolean}
   */
  isClosedStatus: function(status) {
    return this.getClosedStatuses().includes(status);
  }
};
