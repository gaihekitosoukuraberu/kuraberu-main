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
   * 詳細ステータス（加盟店ステータス13種類）
   */
  merchantStatus: {
    // === 未対応系 ===
    PENDING: {
      value: '未対応',
      category: 'pending',
      isActive: false,
      description: '配信されたが未だ対応していない'
    },
    ABSENT: {
      value: '不在',
      category: 'pending',
      isActive: false,
      description: '複数回連絡したが不在'
    },

    // === アクティブ追客系 ===
    CALLED_NO_APPOINTMENT: {
      value: '架電済/未アポ',
      category: 'active',
      isActive: true,
      description: '電話連絡は取れたがアポ未確定'
    },
    APPOINTMENT_SET: {
      value: 'アポ済',
      category: 'active',
      isActive: true,
      description: 'アポイントメント確定済み'
    },
    SITE_SURVEY_DONE: {
      value: '現調済',
      category: 'active',
      isActive: true,
      description: '現地調査完了'
    },
    QUOTE_SUBMITTED: {
      value: '見積提出済み',
      category: 'active',
      isActive: true,
      description: '見積書を提出済み'
    },
    REVISIT: {
      value: '再訪問',
      category: 'active',
      isActive: true,
      description: '再度訪問予定または訪問済み'
    },
    CONSIDERING: {
      value: '検討中',
      category: 'active',
      isActive: true,
      description: '顧客が検討中（見積後等）'
    },

    // === 終了系（成功） ===
    CONTRACT: {
      value: '成約',
      category: 'closed_success',
      isActive: false,
      description: '契約成立'
    },
    PAYMENT_RECEIVED: {
      value: '入金完了',
      category: 'closed_success',
      isActive: false,
      description: '入金確認完了'
    },
    CONSTRUCTION_COMPLETE: {
      value: '工事完了',
      category: 'closed_success',
      isActive: false,
      description: '工事・施工完了'
    },

    // === 終了系（失敗） ===
    LOST: {
      value: '失注',
      category: 'closed_failed',
      isActive: false,
      description: '他社に決定、または顧客辞退'
    },
    CANCELLED: {
      value: 'キャンセル',
      category: 'closed_failed',
      isActive: false,
      description: 'キャンセル承認済み（連絡取れず等）'
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
