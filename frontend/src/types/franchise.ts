// 加盟店インターフェース
export interface Franchise {
  id: string;
  code: string; // F0001形式
  companyName: string;
  representativeName: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  serviceAreas: string[]; // 対応可能エリア（郵便番号または市区町村）
  priorityAreas: string[]; // 最優先エリア（最大3つ）
  capacity: number; // 月間対応可能件数
  currentLoad: number; // 現在の案件数
  handicap: number; // ハンディキャップ (-3 to +3)
  depositRemaining: number; // デポジット残
  cancelCredits: number; // キャンセル分残
  isActive: boolean;
  isPaused: boolean; // 一時停止中
  joinedAt: Date;
  performance: FranchisePerformance;
  preferences?: FranchisePreference[]; // わがまま設定
  contractDocuments?: string[]; // 契約書類URL
  lastActivityAt?: Date;
}

// 加盟店パフォーマンス
export interface FranchisePerformance {
  successRate: number; // 成約率 (%)
  averageResponseTime: number; // 平均応答時間（時間）
  customerSatisfaction: number; // 顧客満足度 (1-5)
  totalCases: number; // 総案件数
  completedCases: number; // 完了案件数
  contractedCases: number; // 成約案件数
  averageContractAmount: number; // 平均成約金額
  totalContractAmount: number; // 合計成約金額
  monthlyMetrics?: MonthlyMetrics[]; // 月別実績
}

// 月別実績
export interface MonthlyMetrics {
  month: string; // YYYY-MM
  cases: number;
  contracts: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
}

// わがまま設定タイプ
export enum PreferenceType {
  AREA = 'エリア',
  BUILDING_TYPE = '建物種別',
  VALUE_RANGE = '金額範囲',
  SCHEDULE = 'スケジュール',
  CUSTOMER_TYPE = '顧客タイプ'
}

// わがまま設定
export interface FranchisePreference {
  id: string;
  franchiseId: string;
  preferenceType: PreferenceType;
  conditions: {
    areas?: string[]; // エリア条件
    buildingTypes?: string[]; // 建物種別条件
    minValue?: number; // 最小金額
    maxValue?: number; // 最大金額
    availableDays?: string[]; // 対応可能曜日
    availableHours?: { start: string; end: string }; // 対応可能時間帯
    customerTypes?: string[]; // 顧客タイプ
    excludeConditions?: boolean; // 除外条件として使用
  };
  priority: number; // 優先度 (1-10)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 加盟店申請
export interface FranchiseApplication {
  id: string;
  companyName: string;
  representativeName: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  serviceAreas: string[];
  constructionTypes: string[]; // 施工可能種別
  employeeCount: number;
  yearEstablished: number;
  licenses: string[]; // 保有資格
  insurances: string[]; // 加入保険
  bankAccount: {
    bankName: string;
    branchName: string;
    accountType: string;
    accountNumber: string;
    accountHolder: string;
  };
  documents: {
    companyProfile?: string;
    license?: string;
    insurance?: string;
    portfolio?: string;
  };
  applicationDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

// AI推薦結果
export interface AIRecommendation {
  franchiseId: string;
  franchiseName: string;
  franchiseCode: string;
  score: number; // 0-100
  reasons: string[]; // 推薦理由
  scoreBreakdown: {
    distance: number; // 距離スコア
    capacity: number; // キャパシティスコア
    performance: number; // パフォーマンススコア
    preference: number; // 希望条件マッチスコア
  };
  hasDeposit: boolean;
  hasCancelCredit: boolean;
  isPriorityArea: boolean;
  currentHandicap: number;
  effectiveRank: number; // ハンディキャップ適用後の実効順位
}