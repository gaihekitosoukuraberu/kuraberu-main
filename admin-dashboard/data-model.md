# Data Model: Admin Dashboard

## Core Entities

### Case (案件)
```typescript
interface Case {
  id: string;                    // UUID
  customerName: string;           // 顧客名
  customerPhone: string;          // 電話番号
  customerEmail?: string;         // メールアドレス
  address: string;                // 住所
  buildingType: 'detached' | 'apartment'; // 戸建て | 集合住宅
  description: string;            // 案件詳細
  estimatedValue?: number;        // 見積予想額
  urgency: 'low' | 'medium' | 'high'; // 緊急度
  preferredSchedule?: string;     // 希望時期
  source: string;                 // 案件源
  hqStatus: HQStatus;            // 本部ステータス
  createdAt: Date;               // 作成日時
  updatedAt: Date;               // 更新日時
}

enum HQStatus {
  UNASSIGNED = '未振分',
  ASSIGNED = '振分済',
  IN_PROGRESS = '進行中',
  COMPLETED = '完了',
  CANCELLED = 'キャンセル'
}
```

### Franchise (加盟店)
```typescript
interface Franchise {
  id: string;                    // UUID
  code: string;                  // 加盟店コード
  name: string;                  // 加盟店名
  representativeName: string;    // 代表者名
  phone: string;                 // 電話番号
  email: string;                 // メールアドレス
  address: string;               // 住所
  serviceAreas: string[];        // 対応可能エリア
  capacity: number;              // 月間対応可能件数
  currentLoad: number;           // 現在の案件数
  handicap: number;              // ハンディキャップ (-3 to +3)
  isActive: boolean;             // アクティブ状態
  joinedAt: Date;               // 加盟日
  performance: Performance;      // パフォーマンス指標
}

interface Performance {
  successRate: number;           // 成約率
  averageResponseTime: number;   // 平均応答時間（時間）
  customerSatisfaction: number;  // 顧客満足度 (1-5)
  totalCases: number;           // 総案件数
  completedCases: number;       // 完了案件数
}
```

### Assignment (振り分け)
```typescript
interface Assignment {
  id: string;                    // UUID
  caseId: string;               // 案件ID
  franchiseId: string;          // 加盟店ID
  aiScore: number;              // AIスコア (0-100)
  aiReasons: string[];          // AI推薦理由
  manualOverride: boolean;      // 手動調整フラグ
  overrideReason?: string;      // 手動調整理由
  franchiseStatus: FranchiseStatus; // 加盟店ステータス
  assignedBy: string;           // 振り分け実行者
  assignedAt: Date;             // 振り分け日時
  respondedAt?: Date;           // 応答日時
  quotedAt?: Date;              // 見積提出日時
  contractedAt?: Date;          // 成約日時
  completedAt?: Date;           // 完了日時
}

enum FranchiseStatus {
  RECEIVED = '受信',
  RESPONDING = '対応中',
  QUOTED = '見積提出',
  CONTRACTED = '成約',
  LOST = '失注',
  DECLINED = '辞退'
}
```

### StatusHistory (ステータス履歴)
```typescript
interface StatusHistory {
  id: string;                    // UUID
  entityType: 'case' | 'assignment'; // エンティティタイプ
  entityId: string;              // エンティティID
  previousStatus: string;        // 変更前ステータス
  newStatus: string;             // 変更後ステータス
  changedBy: string;             // 変更者
  changedAt: Date;               // 変更日時
  note?: string;                 // 備考
}
```

### Transaction (取引)
```typescript
interface Transaction {
  id: string;                    // UUID
  assignmentId: string;          // 振り分けID
  caseId: string;                // 案件ID
  franchiseId: string;           // 加盟店ID
  contractAmount: number;        // 成約金額
  buildingType: 'detached' | 'apartment'; // 建物種別
  feeRate: number;               // 紹介料率 (0.10 or 0.15)
  feeAmount: number;             // 紹介料額
  invoiceNumber?: string;        // 請求書番号
  invoiceStatus: InvoiceStatus; // 請求書ステータス
  paymentDue: Date;              // 支払期限
  paidAt?: Date;                 // 支払日
  createdAt: Date;               // 作成日時
}

enum InvoiceStatus {
  PENDING = '未発行',
  ISSUED = '発行済',
  SENT = '送付済',
  PAID = '支払済',
  OVERDUE = '期限超過'
}
```

### Preference (わがまま設定)
```typescript
interface Preference {
  id: string;                    // UUID
  franchiseId: string;           // 加盟店ID
  preferenceType: PreferenceType; // 設定タイプ
  conditions: Record<string, any>; // 条件（JSON）
  priority: number;              // 優先度 (1-10)
  isActive: boolean;             // 有効フラグ
  createdAt: Date;               // 作成日時
  updatedAt: Date;               // 更新日時
}

enum PreferenceType {
  AREA = 'エリア',
  BUILDING_TYPE = '建物種別',
  VALUE_RANGE = '金額範囲',
  SCHEDULE = 'スケジュール',
  CUSTOMER_TYPE = '顧客タイプ'
}
```

### Ranking (ランキング)
```typescript
interface Ranking {
  id: string;                    // UUID
  period: string;                // 期間 (YYYY-MM)
  franchiseId: string;           // 加盟店ID
  baseScore: number;             // 基本スコア
  handicapAdjustment: number;    // ハンディキャップ調整値
  finalScore: number;            // 最終スコア
  rank: number;                  // 順位
  metrics: RankingMetrics;       // 詳細指標
  calculatedAt: Date;            // 計算日時
}

interface RankingMetrics {
  successRate: number;           // 成約率
  responseSpeed: number;         // 応答速度スコア
  customerSatisfaction: number;  // 顧客満足度
  caseVolume: number;           // 案件処理量
  revenueContribution: number;  // 売上貢献度
}
```

### User (ユーザー)
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // メールアドレス
  name: string;                  // 氏名
  role: UserRole;                // 役割
  department?: string;           // 部署
  isActive: boolean;             // アクティブ状態
  lastLoginAt?: Date;            // 最終ログイン日時
  createdAt: Date;               // 作成日時
}

enum UserRole {
  ADMIN = '管理者',
  MANAGER = 'マネージャー',
  OPERATOR = 'オペレーター',
  VIEWER = '閲覧者'
}
```

### Notification (通知)
```typescript
interface Notification {
  id: string;                    // UUID
  recipientType: 'user' | 'franchise'; // 受信者タイプ
  recipientId: string;           // 受信者ID
  type: NotificationType;        // 通知タイプ
  title: string;                 // タイトル
  message: string;               // メッセージ
  data?: Record<string, any>;    // 追加データ
  channels: NotificationChannel[]; // 通知チャネル
  sentAt?: Date;                 // 送信日時
  readAt?: Date;                 // 既読日時
  createdAt: Date;               // 作成日時
}

enum NotificationType {
  CASE_ASSIGNED = '案件振り分け',
  STATUS_CHANGED = 'ステータス変更',
  PAYMENT_DUE = '支払期限',
  RANKING_UPDATED = 'ランキング更新',
  SYSTEM_ALERT = 'システムアラート'
}

enum NotificationChannel {
  EMAIL = 'メール',
  SLACK = 'Slack',
  LINE = 'LINE',
  IN_APP = 'アプリ内'
}
```

## Relationships

### Entity Relationships
```
Case (1) --- (0..n) Assignment
Franchise (1) --- (0..n) Assignment
Franchise (1) --- (0..n) Preference
Assignment (1) --- (0..1) Transaction
Assignment (1) --- (0..n) StatusHistory
Case (1) --- (0..n) StatusHistory
Franchise (1) --- (0..n) Ranking
User (1) --- (0..n) StatusHistory (changedBy)
```

## Validation Rules

### Case Validation
- customerName: Required, max 100 characters
- customerPhone: Required, valid Japanese phone format
- address: Required, valid address format
- buildingType: Required, must be 'detached' or 'apartment'
- urgency: Default to 'medium' if not specified

### Franchise Validation
- code: Unique, format: F[0-9]{4}
- email: Valid email format
- handicap: Integer between -3 and +3
- capacity: Positive integer
- currentLoad: Cannot exceed capacity

### Assignment Validation
- aiScore: Number between 0 and 100
- Cannot assign to inactive franchise
- Cannot assign if franchise at capacity
- Status transitions must follow defined flow

### Transaction Validation
- feeRate: 0.15 for detached, 0.10 for apartment
- feeAmount: Auto-calculated from contractAmount * feeRate
- paymentDue: 30 days from invoice issue date

## Indexes

### Performance Indexes
```sql
-- Case indexes
CREATE INDEX idx_case_hq_status ON cases(hq_status);
CREATE INDEX idx_case_created_at ON cases(created_at);

-- Assignment indexes
CREATE INDEX idx_assignment_case_franchise ON assignments(case_id, franchise_id);
CREATE INDEX idx_assignment_franchise_status ON assignments(franchise_id, franchise_status);

-- Transaction indexes
CREATE INDEX idx_transaction_invoice_status ON transactions(invoice_status);
CREATE INDEX idx_transaction_payment_due ON transactions(payment_due);

-- Ranking indexes
CREATE INDEX idx_ranking_period_rank ON rankings(period, rank);
```

## Data Retention

### Retention Policies
- Cases: 7 years (legal requirement)
- Assignments: 7 years (linked to cases)
- Transactions: 10 years (tax requirement)
- StatusHistory: 3 years (audit trail)
- Notifications: 1 year (cleanup after read)
- Rankings: Indefinite (historical analysis)