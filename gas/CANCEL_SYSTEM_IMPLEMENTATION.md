# キャンセル申請システム 実装完了ドキュメント

## 概要

加盟店が配信案件に対してキャンセル申請を行うシステムと、配信期限を延長するための期限延長申請システムを実装しました。

## 実装完了日
2025-01-14

---

## 目次
1. [システム構成](#システム構成)
2. [実装したファイル](#実装したファイル)
3. [スプレッドシート設計](#スプレッドシート設計)
4. [API仕様](#api仕様)
5. [キャンセル理由の階層構造](#キャンセル理由の階層構造)
6. [Slack通知仕様](#slack通知仕様)
7. [フロントエンド実装ガイド](#フロントエンド実装ガイド)
8. [テスト方法](#テスト方法)

---

## システム構成

### 1. キャンセル申請システム
- **目的**: 加盟店が配信案件をキャンセルする際の申請・承認フロー
- **申請条件**: 配信日から6〜7日（基本）、または期限延長承認済みの場合は配信日の翌月末まで
- **フォローアップ必須**: カテゴリによって最低電話回数・SMS回数の要件あり

### 2. キャンセル期限延長申請システム
- **目的**: 配信日から7日以内に顧客と連絡が取れたが、アポが7日以降になる場合の期限延長
- **申請条件**: 配信日から7日以内に申請
- **延長後期限**: 配信日の翌月末23:59:59まで

---

## 実装したファイル

### バックエンド（GAS）

#### 1. データレイヤー・設計書
- `CANCEL_SHEET_DESIGN.md` - キャンセル申請シート設計書
- `DEADLINE_EXTENSION_SHEET_DESIGN.md` - 期限延長申請シート設計書

#### 2. キャンセル理由定義
- `CANCEL_REASONS_STRUCTURE.js` - キャンセル理由の階層構造定義
  - 5つのメインカテゴリ
  - 各カテゴリごとのサブカテゴリと質問フロー
  - フォローアップ履歴の最低要件定義

#### 3. 加盟店向けAPI
- `MerchantCancelReport.js` - キャンセル申請システム
  - `getCancelableCases({ merchantId })` - 申請可能案件取得
  - `submitCancelReport({ ... })` - キャンセル申請登録
  - `generateCancelApplicationText({ ... })` - AI申請文生成

- `MerchantDeadlineExtension.js` - 期限延長申請システム
  - `getExtensionEligibleCases({ merchantId })` - 申請可能案件取得
  - `submitExtensionRequest({ ... })` - 期限延長申請登録
  - `calculateExtendedDeadline(deliveredDate)` - 延長後期限計算

#### 4. 管理者向けAPI
- `AdminCancelSystem.js` - キャンセル申請管理システム
  - `approveCancelReport({ applicationId, approverName })` - キャンセル申請承認
  - `rejectCancelReport({ applicationId, approverName, rejectReason })` - キャンセル申請却下
  - `approveExtensionRequest({ extensionId, approverName })` - 期限延長申請承認
  - `rejectExtensionRequest({ extensionId, approverName, rejectReason })` - 期限延長申請却下
  - `updateUserSheetForCancel(userSheet, cvId, merchantId)` - ユーザー登録シート更新

#### 5. Slack通知システム
- `SlackCancelNotifications.js` - Slack通知関数
  - `sendSlackCancelNotification({ ... })` - キャンセル申請通知
  - `sendSlackExtensionNotification({ ... })` - 期限延長申請通知

- `SlackApprovalSystem.js` - Slackボタン処理（既存ファイルに追加）
  - キャンセル申請承認/却下ボタン処理
  - 期限延長申請承認/却下ボタン処理

#### 6. テスト関数
- `test-cancel-functions.js` - テスト関数集
  - 全10個のテスト関数
  - 読み取り専用テストバッチ実行関数

---

## スプレッドシート設計

### 1. キャンセル申請シート

| No | カラム名 | 説明 |
|----|---------|------|
| 1 | タイムスタンプ | 申請日時 |
| 2 | 申請ID | CN + yyMMddHHmmss |
| 3 | CV ID | ユーザー登録シートから取得 |
| 4 | 顧客名 | 自動取得 |
| 5 | 電話番号 | 自動取得 |
| 6 | 住所 | 自動取得 |
| 7 | 加盟店ID | 申請者の加盟店ID |
| 8 | 加盟店名 | 申請者の加盟店名 |
| 9 | 申請担当者 | ログイン中ユーザー名 |
| 10 | 配信日時 | 自動取得 |
| 11 | 経過日数 | 配信日時からの経過日数 |
| 12 | 申請期限 | 配信日時 + 7日 |
| 13 | 期限内フラグ | TRUE/FALSE |
| 14 | 期限延長申請ID | 関連する期限延長申請ID |
| 15 | 延長後期限 | 配信日の翌月末（期限延長承認時） |
| 16 | キャンセル理由カテゴリ | メインカテゴリ |
| 17 | キャンセル理由詳細 | サブカテゴリ |
| 18-22 | 追加情報1〜5 | 階層的質問の回答 |
| 23 | 理由データJSON | 階層的選択の完全なデータ |
| 24 | 電話回数 | 電話をかけた回数 |
| 25 | SMS回数 | SMSを送った回数 |
| 26 | 最終連絡日時 | 最後に連絡を試みた日時 |
| 27 | 電話繋がった日時 | 電話が繋がった日時 |
| 28 | 他社業者名 | 他社で契約した業者名 |
| 29 | 契約時期 | 他社で契約した時期 |
| 30 | 温度感 | 顧客の温度感 |
| 31 | クレーム内容 | クレームの内容 |
| 32 | その他詳細 | その他の詳細情報 |
| 33 | キャンセル申請文 | AI生成の申請文 |
| 34 | 承認ステータス | 申請中/承認済み/却下 |
| 35 | 承認者 | 承認/却下した管理者名 |
| 36 | 承認日時 | 承認/却下した日時 |
| 37 | 却下理由 | 却下理由 |
| 38 | 自動不成約追加済 | TRUE/FALSE |
| 39 | 最終更新日時 | 最終更新日時 |

### 2. キャンセル期限延長申請シート

| No | カラム名 | 説明 |
|----|---------|------|
| 1 | タイムスタンプ | 申請日時 |
| 2 | 申請ID | DE + yyMMddHHmmss |
| 3 | CV ID | ユーザー登録シートから取得 |
| 4 | 顧客名 | 自動取得 |
| 5 | 電話番号 | 自動取得 |
| 6 | 住所 | 自動取得 |
| 7 | 加盟店ID | 申請者の加盟店ID |
| 8 | 加盟店名 | 申請者の加盟店名 |
| 9 | 申請担当者 | ログイン中ユーザー名 |
| 10 | 配信日時 | 自動取得 |
| 11 | 経過日数 | 配信日時からの経過日数 |
| 12 | 申請期限 | 配信日時 + 7日 |
| 13 | 期限内フラグ | TRUE/FALSE |
| 14 | 連絡がついた日時 | 顧客と電話が繋がった日時 |
| 15 | アポ予定日 | 訪問・商談予定日 |
| 16 | 延長理由 | 期限延長が必要な理由 |
| 17 | 延長後期限 | 配信日の翌月末23:59:59 |
| 18 | 承認ステータス | 申請中/承認済み/却下 |
| 19 | 承認者 | 承認/却下した管理者名 |
| 20 | 承認日時 | 承認/却下した日時 |
| 21 | 却下理由 | 却下理由 |
| 22 | 最終更新日時 | 最終更新日時 |

---

## API仕様

### 1. キャンセル申請可能案件取得

**エンドポイント**: `MerchantCancelReport.getCancelableCases`

**リクエスト**:
```javascript
{
  merchantId: String // 加盟店ID
}
```

**レスポンス**:
```javascript
{
  success: Boolean,
  cases: [
    {
      cvId: String,
      customerName: String,
      tel: String,
      address: String,
      workCategory: String,
      deliveredAt: Date,
      daysElapsed: Number,
      deadlineDate: Date,
      isWithinDeadline: Boolean,
      managementStatus: String
    }
  ],
  error: String // エラー時のみ
}
```

### 2. キャンセル申請登録

**エンドポイント**: `MerchantCancelReport.submitCancelReport`

**リクエスト**:
```javascript
{
  merchantId: String, // 必須
  merchantName: String, // 必須
  applicantName: String, // 必須（ログイン中ユーザー）
  cvId: String, // 必須
  cancelReasonCategory: String, // 必須
  cancelReasonDetail: String, // 必須
  reasonData: Object, // 階層的選択の完全なデータ（JSON）
  additionalInfo1: String,
  additionalInfo2: String,
  additionalInfo3: String,
  additionalInfo4: String,
  additionalInfo5: String,
  phoneCallCount: Number, // フォローアップ履歴
  smsCount: Number, // フォローアップ履歴
  lastContactDate: Date,
  contactDate: Date, // 電話が繋がった日時
  otherCompany: String, // 他社業者名
  contractTiming: String, // 契約時期
  customerSentiment: String, // 温度感
  complaintDetail: String, // クレーム内容
  otherDetail: String // その他詳細
}
```

**レスポンス**:
```javascript
{
  success: Boolean,
  message: String,
  data: {
    applicationId: String,
    cvId: String,
    isWithinDeadline: Boolean,
    extensionApproved: Boolean
  },
  error: String // エラー時のみ
}
```

### 3. 期限延長申請可能案件取得

**エンドポイント**: `MerchantDeadlineExtension.getExtensionEligibleCases`

**リクエスト**:
```javascript
{
  merchantId: String // 加盟店ID
}
```

**レスポンス**:
```javascript
{
  success: Boolean,
  cases: [
    {
      cvId: String,
      customerName: String,
      tel: String,
      address: String,
      workCategory: String,
      deliveredAt: Date,
      daysElapsed: Number,
      applicationDeadline: Date, // 申請期限（配信日+7日）
      extendedDeadline: Date, // 延長後期限（翌月末）
      managementStatus: String
    }
  ],
  error: String // エラー時のみ
}
```

### 4. 期限延長申請登録

**エンドポイント**: `MerchantDeadlineExtension.submitExtensionRequest`

**リクエスト**:
```javascript
{
  merchantId: String, // 必須
  merchantName: String, // 必須
  applicantName: String, // 必須（ログイン中ユーザー）
  cvId: String, // 必須
  contactDate: Date, // 必須：連絡がついた日時
  appointmentDate: Date, // 必須：アポ予定日
  extensionReason: String // 必須：延長理由
}
```

**レスポンス**:
```javascript
{
  success: Boolean,
  message: String,
  data: {
    extensionId: String,
    cvId: String,
    extendedDeadline: Date,
    isWithinDeadline: Boolean
  },
  error: String // エラー時のみ
}
```

### 5. キャンセル申請承認（管理者用）

**エンドポイント**: `AdminCancelSystem.approveCancelReport`

**リクエスト**:
```javascript
{
  applicationId: String, // 必須
  approverName: String // 必須
}
```

**レスポンス**:
```javascript
{
  success: Boolean,
  message: String,
  data: {
    applicationId: String,
    cvId: String,
    userSheetUpdated: Boolean
  },
  error: String // エラー時のみ
}
```

**承認時の自動処理**:
1. 承認ステータスを「承認済み」に更新
2. ユーザー登録シートの「管理ステータス」を「配信後未成約」に更新
3. 「配信先業者一覧」からこの加盟店IDを削除
4. 自動不成約追加済フラグをTRUEに設定

### 6. キャンセル申請却下（管理者用）

**エンドポイント**: `AdminCancelSystem.rejectCancelReport`

**リクエスト**:
```javascript
{
  applicationId: String, // 必須
  approverName: String, // 必須
  rejectReason: String // 必須
}
```

**レスポンス**:
```javascript
{
  success: Boolean,
  message: String,
  data: {
    applicationId: String,
    cvId: String
  },
  error: String // エラー時のみ
}
```

---

## キャンセル理由の階層構造

### メインカテゴリ（5つ）

#### 1. 連絡が繋がらない
- **フォローアップ必須**: はい
- **最低電話回数**: 3回
- **最低SMS回数**: 2回

**サブカテゴリ**:
- 複数回電話したが出ない
- 番号が無効（音声ガイダンス・使われていない）
- 間違い電話（別人が出た）
- その他 → 詳細ヒアリング

#### 2. 電話繋がったがアポ取れず、その後不通
- **フォローアップ必須**: はい
- **最低電話回数**: 2回
- **最低SMS回数**: 1回

**サブカテゴリ**:
- アポ取得を断られた後、不通
- 後日連絡と言われたが、その後繋がらず
- その他 → 詳細ヒアリング

#### 3. お客様から電話でキャンセルされた
- **フォローアップ必須**: いいえ

**サブカテゴリ**:
- 既に他社で契約済み
- やっぱり工事しない・興味がない
- タイミングが合わない
- 自分で申し込んでいない（覚えがない）
- その他 → 詳細ヒアリング

#### 4. お客様からSMSでキャンセルされた
- **フォローアップ必須**: いいえ

**サブカテゴリ**:
- SMSで断りの連絡が来た
- SMSで他社契約済みと連絡が来た
- その他 → 詳細ヒアリング

#### 5. クレーム
- **フォローアップ必須**: いいえ
- **詳細必須**: はい

**サブカテゴリ**:
- 電話・SMSがしつこい
- 対応が悪い・失礼
- 個人情報の扱いに不安
- その他 → 詳細ヒアリング

### 質問フローの例

各サブカテゴリには、質問リストが定義されています。例：

**「複数回電話したが出ない」の質問フロー**:
1. 電話をかけた回数（数値、必須、最低3回）
2. SMSを送った回数（数値、必須、最低2回）
3. 最終連絡日時（日時、必須）
4. 送信したSMS内容（テキストエリア、任意）

---

## Slack通知仕様

### 1. キャンセル申請通知

**送信タイミング**: キャンセル申請登録時

**通知内容**:
- 申請ID
- CV ID
- 顧客名
- 加盟店名・ID
- キャンセル理由（カテゴリ + 詳細）
- フォローアップ履歴（電話回数、SMS回数）
- キャンセル申請文（プレビュー）

**ボタン**:
- ✅ 承認
- ❌ 却下
- 📊 スプレッドシートを開く

**Action ID**:
- `approve_cancel_report`
- `reject_cancel_report`

### 2. 期限延長申請通知

**送信タイミング**: 期限延長申請登録時

**通知内容**:
- 申請ID
- CV ID
- 顧客名
- 加盟店名・ID
- 連絡がついた日時
- アポ予定日
- 延長後期限（配信日の翌月末）
- 延長理由

**ボタン**:
- ✅ 承認
- ❌ 却下
- 📊 スプレッドシートを開く

**Action ID**:
- `approve_extension_request`
- `reject_extension_request`

---

## フロントエンド実装ガイド

### メニュー構成（推奨）

```
各種申請
├── 成約報告
├── キャンセル申請
└── キャンセル期限延長申請
```

### 1. キャンセル申請フォーム

#### ステップ1: 申請可能案件一覧

```javascript
// API呼び出し
const response = await fetch(`${API_URL}?action=getCancelableCases&merchantId=${merchantId}`);
const result = await response.json();

// 表示内容
result.cases.forEach(case => {
  // CV ID
  // 顧客名
  // 配信日時
  // 経過日数
  // 申請期限
  // 期限内フラグ（色分け表示）
});
```

#### ステップ2: キャンセル理由選択（第1階層）

5つのメインカテゴリから選択

#### ステップ3: サブカテゴリ選択（第2階層）

選択したカテゴリに応じたサブカテゴリを表示

#### ステップ4: 階層的質問フロー

サブカテゴリに応じた質問を順番に表示
- 質問タイプ: number, text, textarea, select, date, datetime
- 必須チェック
- バリデーション（最低値など）

#### ステップ5: 確認画面

入力内容を確認して送信

**送信データ例**:
```javascript
{
  merchantId: "M12345",
  merchantName: "テスト加盟店",
  applicantName: "山田太郎", // ログイン中ユーザー
  cvId: "CV20250114001",
  cancelReasonCategory: "1. 連絡が繋がらない",
  cancelReasonDetail: "複数回電話したが出ない",
  reasonData: {
    category: "no_contact",
    subCategory: "no_answer_multiple",
    answers: {
      phone_count: 5,
      sms_count: 3,
      last_contact_date: "2025-01-14T15:30:00",
      sms_content: "お見積りのご案内をさせていただきたく..."
    }
  },
  additionalInfo1: "電話回数: 5回",
  additionalInfo2: "SMS回数: 3回",
  additionalInfo3: "最終連絡: 2025-01-14 15:30",
  phoneCallCount: 5,
  smsCount: 3,
  lastContactDate: "2025-01-14T15:30:00"
}
```

### 2. 期限延長申請フォーム

#### ステップ1: 申請可能案件一覧

```javascript
// API呼び出し
const response = await fetch(`${API_URL}?action=getExtensionEligibleCases&merchantId=${merchantId}`);
const result = await response.json();

// 表示内容
result.cases.forEach(case => {
  // CV ID
  // 顧客名
  // 配信日時
  // 経過日数
  // 申請期限（配信日+7日）
  // 延長後期限（翌月末）
});
```

#### ステップ2: 期限延長理由入力

- 連絡がついた日時（必須）
- アポ予定日（必須）
- 延長理由（必須、テキストエリア）

#### ステップ3: 確認画面

入力内容を確認して送信

---

## テスト方法

### 1. GASエディタでのテスト

`test-cancel-functions.js` ファイルを開き、各テスト関数を実行します。

#### 読み取りテストのみ実行（安全）

```javascript
runAllReadOnlyTests();
```

このバッチ関数は以下を実行します：
- キャンセル申請可能案件取得テスト
- 期限延長申請可能案件取得テスト
- 延長後期限計算ロジックテスト
- キャンセル理由構造確認テスト

#### 個別テスト実行

各テスト関数を個別に実行できます：

```javascript
// キャンセル申請可能案件取得
testGetCancelableCases();

// 期限延長申請可能案件取得
testGetExtensionEligibleCases();

// 延長後期限計算ロジック
testExtendedDeadlineCalculation();

// キャンセル理由構造確認
testCancelReasonsStructure();
```

### 2. 書き込みテスト（注意が必要）

以下のテストは実際にスプレッドシートに書き込みを行います。
**必ずテスト用の加盟店IDとCV IDに置き換えてから実行してください。**

```javascript
// キャンセル申請登録テスト
testSubmitCancelReport();

// 期限延長申請登録テスト
testSubmitExtensionRequest();

// キャンセル申請承認テスト
testApproveCancelReport();

// キャンセル申請却下テスト
testRejectCancelReport();

// 期限延長申請承認テスト
testApproveExtensionRequest();

// 期限延長申請却下テスト
testRejectExtensionRequest();
```

### 3. Slack通知テスト

1. PropertiesServiceに `SLACK_WEBHOOK_URL` が設定されていることを確認
2. キャンセル申請または期限延長申請を登録
3. Slackにボタン付き通知が届くことを確認
4. Slackのボタンから承認/却下を実行
5. スプレッドシートのステータスが更新されることを確認

---

## 注意事項

### 1. 期限管理

- **基本期限**: 配信日 + 7日
- **延長承認後**: 配信日の翌月末23:59:59
- **期限延長申請**: 配信日から7日以内に申請必須

### 2. フォローアップ履歴チェック

キャンセル理由カテゴリによっては、最低限のフォローアップ履歴が必要です：
- 「連絡が繋がらない」: 電話3回以上、SMS2回以上
- 「電話繋がったがアポ取れず、その後不通」: 電話2回以上、SMS1回以上

これらの要件を満たさない場合、申請は受け付けられません。

### 3. 承認時の自動処理

キャンセル申請が承認されると、以下が自動的に実行されます：
1. ユーザー登録シートの「管理ステータス」 → 「配信後未成約」
2. 「配信先業者一覧」から該当加盟店IDを削除

この処理が失敗した場合でも承認自体は完了します（ログに記録）。

### 4. データの整合性

- CV IDは重複申請を防止するためユニークチェックされます
- 同じCV IDに対して同じ加盟店から複数回のキャンセル申請はできません
- 期限延長申請も同様に重複を防止します

---

## 今後の拡張案

### 1. 統計ダッシュボード（未実装）

- キャンセル理由の集計・分析
- 加盟店ごとのキャンセル率
- 期限延長申請の承認率
- クレーム内容の分析

### 2. 再申請フロー

- 却下されたキャンセル申請の再申請機能
- 却下理由に応じたガイダンス表示

### 3. 通知の改善

- メール通知の追加
- 加盟店への申請結果通知

---

## 関連ドキュメント

- `CANCEL_SHEET_DESIGN.md` - キャンセル申請シート詳細設計
- `DEADLINE_EXTENSION_SHEET_DESIGN.md` - 期限延長申請シート詳細設計
- `CANCEL_REASONS_STRUCTURE.js` - キャンセル理由の階層構造コード

---

## サポート

質問や問題が発生した場合は、GASログを確認してください。
すべての主要な処理でログ出力を行っています。

ログの見方：
1. GASエディタを開く
2. 「表示」→「ログ」
3. 「[MerchantCancelReport]」「[AdminCancelSystem]」などのプレフィックスでフィルタ

---

**実装完了日**: 2025-01-14
**実装者**: Claude Code
