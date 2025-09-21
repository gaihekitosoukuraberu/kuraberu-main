# Data Model: 加盟店管理画面

## Core Entities

### User (認証ユーザー)
```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // ログインID
  hashedPassword: string;        // bcrypt
  role: 'admin' | 'sales';      // 権限
  companyId: string;             // 所属会社
  isFirstLogin: boolean;         // 初回ログインフラグ
  loginAttempts: number;         // ログイン試行回数
  lockedUntil?: Date;           // アカウントロック期限
  createdAt: Date;
  updatedAt: Date;
}
```

### Company (加盟店情報)
```typescript
interface Company {
  id: string;                    // K+日付+4桁
  name: string;                  // 会社名
  representativeName: string;    // 代表者名
  corporateNumber?: string;      // 法人番号
  establishedDate?: Date;        // 設立年月日
  address: string;               // 本社所在地
  phone: string;                 // 電話番号
  contractPlan: string;          // 契約プラン
  settings: CompanySettings;     // 各種設定
  createdAt: Date;
  updatedAt: Date;
}

interface CompanySettings {
  areas: string[];               // 対応エリア
  priorityAreas: string[];       // 優先エリア（最大3）
  propertyTypes: string[];       // 対応物件種別
  buildingAge: {min: number, max: number}; // 築年数範囲
  autoDistribution: boolean;     // 自動配信ON/OFF
  monthlyLimit: number;          // 月間上限
  isPaused: boolean;            // 一時休止
  notificationChannels: ('sms' | 'line' | 'email')[];
  notificationTiming: NotificationTiming;
}
```

### Case (案件)
```typescript
interface Case {
  id: string;                    // UUID
  companyId: string;             // 加盟店ID
  assignedTo?: string;           // 担当営業ID
  status: CaseStatus;            // ステータス
  customer: CustomerInfo;        // 顧客情報
  property: PropertyInfo;        // 物件情報
  temperatureLevel: 1 | 2 | 3 | 4 | 5; // 温度感
  memos: Memo[];                 // メモ
  files: FileAttachment[];       // 添付ファイル
  history: HistoryEntry[];       // 操作履歴
  appointment?: Appointment;     // アポイント情報
  quote?: Quote;                 // 見積情報
  contract?: Contract;           // 契約情報
  createdAt: Date;
  updatedAt: Date;
}

enum CaseStatus {
  UNHANDLED = '未対応',
  CALLED_NO_APPOINTMENT = '架電済_未アポ',
  APPOINTED = 'アポ済',
  SURVEYED = '現調済',
  CANCELLED_BEFORE_SURVEY = '現調前キャンセル',
  QUOTE_SUBMITTED = '見積提出済',
  CONTRACTED = '成約',
  PAYMENT_PENDING = '入金予定',
  PAYMENT_COMPLETED = '入金済',
  LOST = '失注'
}

interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
}

interface PropertyInfo {
  type: string;                  // 物件種別
  buildingAge: number;           // 築年数
  wallMaterial: string;          // 外壁材質
  floors: number;                // 階数
}
```

### SalesAccount (営業アカウント)
```typescript
interface SalesAccount {
  id: string;                    // User.id と同じ
  name: string;                  // 営業担当者名
  email: string;                 // メールアドレス
  phone?: string;                // 電話番号
  companyId: string;             // 所属会社
  assignedCases: number;         // 担当案件数
  monthlyContracts: number;      // 今月の成約数
  status: 'active' | 'away' | 'inactive'; // 稼働状況
  maxCases: number;              // 最大案件数
  notificationSettings: NotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

### Invoice (請求)
```typescript
interface Invoice {
  id: string;                    // UUID
  companyId: string;             // 加盟店ID
  yearMonth: string;             // YYYY-MM
  referralFee: number;           // 紹介料（2万円×件数）
  successFee: number;            // 成約報酬（工事金額の10%）
  totalAmount: number;           // 合計金額
  depositUsed: number;           // デポジット消費数
  depositBalance: number;        // デポジット残高
  status: 'pending' | 'paid';   // 支払いステータス
  pdfUrl?: string;              // 請求書PDF URL
  createdAt: Date;
  paidAt?: Date;
}
```

### Deposit (デポジット)
```typescript
interface Deposit {
  id: string;                    // UUID
  companyId: string;             // 加盟店ID
  amount: number;                // 金額
  quantity: number;              // 件数
  type: 'charge' | 'use' | 'refund'; // 種別
  description: string;           // 説明
  balance: number;               // 残高（履歴時点）
  createdAt: Date;
}
```

### CancelRequest (キャンセル申請)
```typescript
interface CancelRequest {
  id: string;                    // UUID
  caseId: string;                // 案件ID
  reason: CancelReason;          // キャンセル理由
  reasonDetail: string;          // 詳細説明
  evidence?: string;             // エビデンスURL
  status: 'pending' | 'approved' | 'rejected'; // 承認状態
  isFree: boolean;              // 無料キャンセルか
  requestedBy: string;          // 申請者ID
  reviewedBy?: string;          // 承認者ID
  createdAt: Date;
  reviewedAt?: Date;
}

enum CancelReason {
  CUSTOMER_CANCEL = '顧客都合によるキャンセル',
  COMPETITOR_WON = '他社で決定',
  BUDGET_MISMATCH = '予算が合わない',
  POSTPONED = '時期の延期',
  OTHER = 'その他'
}
```

### Notification (通知)
```typescript
interface Notification {
  id: string;                    // UUID
  recipientId: string;          // 受信者ID
  type: NotificationType;       // 通知種別
  channel: 'sms' | 'line' | 'email'; // 配信チャネル
  title: string;                // タイトル
  message: string;              // 本文
  metadata?: any;               // メタデータ
  isRead: boolean;              // 既読フラグ
  sentAt: Date;
  readAt?: Date;
}

enum NotificationType {
  NEW_CASE = '新規案件',
  REMINDER = 'リマインダー',
  ALERT = '警告',
  REPORT = 'レポート',
  SYSTEM = 'システム通知'
}
```

## Relationships

1. **Company** ← 1:N → **User**: 会社に複数のユーザー
2. **Company** ← 1:N → **Case**: 会社に複数の案件
3. **User** ← 1:N → **Case**: 営業担当者が複数案件を担当
4. **Company** ← 1:N → **Invoice**: 会社に複数の請求
5. **Company** ← 1:N → **Deposit**: 会社に複数のデポジット履歴
6. **Case** ← 1:1 → **CancelRequest**: 案件にキャンセル申請
7. **User** ← 1:N → **Notification**: ユーザーに複数の通知

## Validation Rules

- Email: RFC 5322準拠
- Phone: 日本の電話番号形式
- Password: 8文字以上、英数字混在
- CompanyId: K + YYYYMMDD + 4桁数字
- File size: 最大10MB
- Memo: 最大500文字
- Priority areas: 最大3つ
- Cancel requests: 月3件まで無料

## State Transitions

### Case Status Flow
```
未対応 → 架電済_未アポ → アポ済 → 現調済 → 見積提出済 → 成約 → 入金予定 → 入金済
                ↓         ↓        ↓         ↓
              失注   現調前キャンセル  失注     失注
```

### User Account States
```
Active → Locked (3 failed logins) → Active (5 minutes or password reset)
Active → Inactive (manual deactivation)
```