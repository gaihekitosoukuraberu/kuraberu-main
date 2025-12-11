/**
 * ====================================
 * V2207: ステータス定義 一元管理（全面改定）
 * ====================================
 *
 * 【ステータス体系】
 *
 * 1. 管理ステータス（ユーザー登録シート・CV単位）
 *    - 配信前: アドミンが管理（新規→配信済）
 *    - 配信後: 加盟店の詳細ステータスから最も進んだものを自動反映
 *
 * 2. 詳細ステータス（配信管理シート・加盟店×CV単位）
 *    - 加盟店が各案件をどう追客しているかを表す
 *    - 成約後は入金×工事の組み合わせステータス
 *
 * 【利用箇所】
 * - setup-cv-delivery-sheet.js（データバリデーション）
 * - MerchantContractReport.js（ステータス更新）
 * - フランチャイズダッシュボード（ステータス選択UI）
 * - アドミンダッシュボード
 */

var StatusDefinitions = {

  // =====================================================
  // 配信前ステータス（ユーザー登録シート・アドミン管理）
  // =====================================================
  preDeliveryStatus: {
    NEW: { value: '新規', order: 1, description: '新規流入案件' },
    ABSENT: { value: '不在', order: 2, description: '電話に出ない' },
    RECALL: { value: '再架電', order: 3, description: '再度電話予定' },
    PROSPECT: { value: '見込み', order: 4, description: '配信候補として有望' },
    LOST: { value: 'ロスト', order: 5, description: '失注' },
    DELIVERING: { value: '配信中', order: 6, description: '加盟店選定・配信作業中' },
    DELIVERED: { value: '配信済', order: 7, description: '加盟店への転送完了' },
    OTHER_COMPANY: { value: '他社契約済', order: 8, description: '他社で契約決定' },
    INVALID: { value: '無効', order: 9, description: 'BOTや重複等の無効案件' },
    CLAIM: { value: 'クレーム', order: 10, description: '顧客からのクレーム案件（運営へ）' }
  },

  // =====================================================
  // 詳細ステータス（配信管理シート・加盟店×CV単位）
  // 配信後のユーザー登録シート管理ステータスもこれと同一
  // =====================================================
  merchantStatus: {
    // --- 追客中 ---
    NEW: {
      value: '新着',
      category: 'active',
      isActive: true,
      order: 1,
      description: '配信後未着手'
    },
    NO_APPOINTMENT: {
      value: '未アポ',
      category: 'active',
      isActive: true,
      order: 2,
      description: '電話したがアポ取れず'
    },
    APPOINTMENT_SET: {
      value: 'アポ済',
      category: 'active',
      isActive: true,
      order: 3,
      description: '現調日時確定'
    },
    SITE_SURVEY_DONE: {
      value: '現調済',
      category: 'active',
      isActive: true,
      order: 4,
      description: '現地調査完了'
    },
    QUOTE_SUBMITTED: {
      value: '見積提出済',
      category: 'active',
      isActive: true,
      order: 5,
      description: '見積書を顧客に提出'
    },

    // --- 成約済（入金×工事の組み合わせ）---
    PAYMENT_PENDING_NOT_STARTED: {
      value: '入金予定・未着工',
      category: 'contracted',
      isActive: false,
      order: 10,
      description: '成約→入金待ち・工事未開始'
    },
    PAYMENT_PENDING_IN_PROGRESS: {
      value: '入金予定・施工中',
      category: 'contracted',
      isActive: false,
      order: 11,
      description: '成約→入金待ち・工事中'
    },
    PAYMENT_PENDING_WORK_DONE: {
      value: '入金予定・工事済',
      category: 'contracted',
      isActive: false,
      order: 12,
      description: '成約→入金待ち・工事完了'
    },
    PAYMENT_RECEIVED_NOT_STARTED: {
      value: '入金済・未着工',
      category: 'contracted',
      isActive: false,
      order: 13,
      description: '成約→入金済・工事未開始'
    },
    PAYMENT_RECEIVED_IN_PROGRESS: {
      value: '入金済・施工中',
      category: 'contracted',
      isActive: false,
      order: 14,
      description: '成約→入金済・工事中'
    },
    COMPLETED: {
      value: '完了',
      category: 'contracted',
      isActive: false,
      order: 20,
      description: '入金済・工事済（全処理完了）'
    },

    // --- 終了（失注・キャンセル）---
    PRE_SURVEY_CANCEL: {
      value: '現調前キャンセル',
      category: 'closed_failed',
      isActive: false,
      order: 30,
      description: '現調前に顧客都合でキャンセル'
    },
    POST_SURVEY_LOST: {
      value: '現調後失注',
      category: 'closed_failed',
      isActive: false,
      order: 31,
      description: '現調後断られた'
    },
    OTHER_COMPANY_CONTRACT: {
      value: '他社契約済',
      category: 'closed_failed',
      isActive: false,
      order: 32,
      description: '他の一般業者で契約'
    },
    OTHER_FRANCHISE_CONTRACT: {
      value: '別加盟店契約済',
      category: 'closed_failed',
      isActive: false,
      order: 33,
      description: '他の加盟店で契約'
    },
    CUSTOMER_CLAIM: {
      value: '顧客クレーム',
      category: 'closed_failed',
      isActive: false,
      order: 34,
      description: '顧客からのクレーム・問題発生'
    }
  },

  // =====================================================
  // 配信ステータス（大分類・配信管理シート用）
  // =====================================================
  deliveryStatus: {
    DELIVERED: { value: '配信済み', description: '加盟店に配信済み（追客中）' },
    CONTRACT: { value: '成約', description: '成約完了' },
    LOST: { value: '失注', description: '失注（他社成約含む）' },
    CANCELLED: { value: 'キャンセル承認済み', description: 'キャンセル申請が承認された' }
  },

  // =====================================================
  // ヘルパー関数
  // =====================================================

  /**
   * 配信前ステータスのリストを返す
   */
  getPreDeliveryStatuses: function() {
    return Object.values(this.preDeliveryStatus).map(s => s.value);
  },

  /**
   * アクティブな追客ステータスのリストを返す
   */
  getActiveStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.isActive)
      .map(s => s.value);
  },

  /**
   * 成約済ステータスのリストを返す
   */
  getContractedStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.category === 'contracted')
      .map(s => s.value);
  },

  /**
   * 終了ステータスのリストを返す（失注・キャンセル系）
   */
  getClosedFailedStatuses: function() {
    return Object.values(this.merchantStatus)
      .filter(s => s.category === 'closed_failed')
      .map(s => s.value);
  },

  /**
   * 全ての詳細ステータスのリストを返す（データバリデーション用）
   */
  getAllMerchantStatuses: function() {
    return Object.values(this.merchantStatus).map(s => s.value);
  },

  /**
   * 全ての配信ステータスのリストを返す
   */
  getAllDeliveryStatuses: function() {
    return Object.values(this.deliveryStatus).map(s => s.value);
  },

  /**
   * ステータスがアクティブな追客かどうか判定
   */
  isActiveStatus: function(status) {
    return this.getActiveStatuses().includes(status);
  },

  /**
   * ステータスが成約済かどうか判定
   */
  isContractedStatus: function(status) {
    return this.getContractedStatuses().includes(status);
  },

  /**
   * ステータスが終了状態かどうか判定
   */
  isClosedStatus: function(status) {
    return this.getClosedFailedStatuses().includes(status);
  },

  /**
   * ステータスの優先順位を取得（同期用）
   */
  getStatusOrder: function(status) {
    // 詳細ステータスから検索
    for (const key in this.merchantStatus) {
      if (this.merchantStatus[key].value === status) {
        return this.merchantStatus[key].order;
      }
    }
    // 配信前ステータスから検索
    for (const key in this.preDeliveryStatus) {
      if (this.preDeliveryStatus[key].value === status) {
        return this.preDeliveryStatus[key].order;
      }
    }
    return 0;
  }
};
