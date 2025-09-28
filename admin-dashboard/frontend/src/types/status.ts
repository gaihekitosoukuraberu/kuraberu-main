// 管理ステータス（本部が案件全体を管理）- 19種類
export enum HQStatus {
  // 配信前ステータス
  NEW = '新規',
  ABSENT = '不在',
  RECALL = '再架電',
  PROSPECT = '見込み',
  LOST = 'ロスト',
  DISTRIBUTING = '配信中',
  DISTRIBUTED = '配信済',
  COMPETITOR_CONTRACT = '他社契約済',
  INVALID = '無効',
  CLAIM = 'クレーム',
  
  // 配信後ステータス
  APPOINTED = 'アポ済',
  SURVEYED = '現調済',
  QUOTED = '見積提出済',
  PAYMENT_PENDING = '入金予定',
  COMPLETED = '完了',
  CANCELLED_AFTER_REFERRAL = '紹介後キャンセル',
  CANCELLED_BEFORE_SURVEY = '現調前キャンセル',
  LOST_AFTER_SURVEY = '現調後ロスト',
  OTHER_FRANCHISE_CONTRACT = '他社契約済'
}

// 加盟店ステータス（各加盟店ごとの進捗管理）- 12種類
export enum FranchiseStatus {
  UNHANDLED = '未対応',
  CALLED_NO_APPOINTMENT = '架電済/未アポ',
  APPOINTED = 'アポ済',
  SURVEYED = '現調済',
  CANCELLED_BEFORE_SURVEY = '現調前キャンセル',
  QUOTED = '見積提出済',
  CONTRACTED = '成約',
  COMPETITOR_CONTRACT = '他社契約済',
  OTHER_FRANCHISE_CONTRACT = '別加盟店契約済',
  PAYMENT_PENDING = '入金予定',
  PAID = '入金済',
  CLAIM_OR_LOST = 'クレーム or 失注'
}

// ステータスカテゴリ（UI表示用）
export const StatusCategory = {
  PRE_DISTRIBUTION: '配信前',
  POST_DISTRIBUTION: '配信後',
  FRANCHISE_INDIVIDUAL: '加盟店個別'
} as const;

// ステータスの色設定（UI用）
export const StatusColors: Record<string, string> = {
  // HQStatus colors
  '新規': 'bg-blue-100 text-blue-800',
  '不在': 'bg-gray-100 text-gray-800',
  '再架電': 'bg-yellow-100 text-yellow-800',
  '見込み': 'bg-green-100 text-green-800',
  'ロスト': 'bg-red-100 text-red-800',
  '配信中': 'bg-indigo-100 text-indigo-800',
  '配信済': 'bg-purple-100 text-purple-800',
  '他社契約済': 'bg-orange-100 text-orange-800',
  '無効': 'bg-gray-100 text-gray-800',
  'クレーム': 'bg-red-100 text-red-800',
  'アポ済': 'bg-cyan-100 text-cyan-800',
  '現調済': 'bg-teal-100 text-teal-800',
  '見積提出済': 'bg-blue-100 text-blue-800',
  '入金予定': 'bg-amber-100 text-amber-800',
  '完了': 'bg-green-100 text-green-800',
  '紹介後キャンセル': 'bg-red-100 text-red-800',
  '現調前キャンセル': 'bg-red-100 text-red-800',
  '現調後ロスト': 'bg-red-100 text-red-800',
  
  // FranchiseStatus colors
  '未対応': 'bg-gray-100 text-gray-800',
  '架電済/未アポ': 'bg-yellow-100 text-yellow-800',
  '成約': 'bg-green-100 text-green-800',
  '別加盟店契約済': 'bg-orange-100 text-orange-800',
  '入金済': 'bg-green-100 text-green-800',
  'クレーム or 失注': 'bg-red-100 text-red-800'
};