# V2218: ステータス同期機能 実装仕様書

## 概要
フランチャイズとアドミン間でステータスを双方向同期する機能

## 現状のデータ構造

### ユーザー登録シート（CV単位）
- **BN列「管理ステータス」**: アドミンが見るステータス
- 配信前: 新規/不在/再架電/見込み/ロスト/配信中/配信済み/他社契約済/無効/クレーム
- 配信後: 配信管理シートの「詳細ステータス」から最進捗を自動反映

### 配信管理シート（加盟店×CV単位）
- **F列「配信ステータス」**: 大分類（配信済み/成約/失注/キャンセル承認済み）
- **G列「詳細ステータス」**: 小分類（16種類）
  - 追客中: 新着/未アポ/アポ済/現調済/見積提出済
  - 成約済: 入金予定・未着工/.../完了
  - 終了: 現調前キャンセル/現調後失注/他社契約済/別加盟店契約済/顧客クレーム

---

## タスク1: 入力規則削除（即時対応）

**GASエディタで実行:**
- 関数: `removeUserSheetStatusValidation`
- ファイル: `update-detail-status-validation.js`
- 目的: ユーザー登録シート「管理ステータス」列の入力規則を削除し、GASから自由に書き込めるようにする

---

## タスク2: 転送テスト

入力規則削除後、転送機能が正常に動作することを確認

---

## タスク3: フランチャイズ→アドミン同期

### トリガー
- フランチャイズが配信管理シートの「詳細ステータス」を更新した時

### 処理フロー
```
1. MerchantContractReport.updateCaseStatus() が呼ばれる
2. 配信管理シートのG列（詳細ステータス）を更新
3. 同じCV IDの全レコードから「最も進んだステータス」を計算
4. ユーザー登録シートのBN列（管理ステータス）を更新
```

### 最進捗ステータス判定ロジック
```javascript
const statusOrder = {
  // 追客中: 1-5
  '新着': 1, '未アポ': 2, 'アポ済': 3, '現調済': 4, '見積提出済': 5,
  // 成約済: 10-20（成約系は最優先）
  '入金予定・未着工': 10, '入金予定・施工中': 11, '入金予定・工事済': 12,
  '入金済・未着工': 13, '入金済・施工中': 14, '完了': 20,
  // 終了系: 負の値（成約より優先しない）
  '現調前キャンセル': -1, '現調後失注': -2, '他社契約済': -3,
  '別加盟店契約済': -4, '顧客クレーム': -5
};
// 最大値のステータスを採用（成約があれば成約優先）
```

### 修正対象ファイル
- `gas/systems/merchant/MerchantContractReport.js`
  - `updateCaseStatus()` 関数内で同期処理を追加
- 既存関数: `_getMostAdvancedStatus()` (Line 1443-1485) が使える

---

## タスク4: アドミン→フランチャイズ同期（キャンセル系のみ）

### トリガー
- アドミンがCRMでキャンセル系ステータスを選択した時
- 既存: `statusChangeNotifyModal` が表示される

### 処理フロー
```
1. アドミンがキャンセル系ステータス選択
2. 通知モーダル表示（既存: statusChangeNotifyModal）
3. ユーザーが「通知して変更」を選択
4. ユーザー登録シートのBN列を更新
5. 配信管理シートの該当CV全レコードのG列を一括更新
6. 各加盟店にメール送信
```

### 修正対象ファイル
- `gas/systems/admin/AdminSystem.js`
  - 新規関数: `bulkUpdateDeliveryStatus(cvId, newStatus)` 追加
  - `sendCancelNotify()` 内で呼び出し

---

## タスク5: キャンセル通知メールUI

### 機能要件
1. **キャンセルタイプ選択**
   - 全社キャンセル（返金あり）
   - 全社キャンセル（返金なし）
   - 1社契約 + 他社お断り
   - カスタム（自由選択）

2. **加盟店個別設定**
   - チェックボックスで対象加盟店選択
   - 加盟店ごとに課金/返金を設定
   - 加盟店ごとにステータスを設定

3. **メール内容編集**
   - テンプレート選択
   - 本文編集可能
   - プレビュー表示

### HTML追加（admin-dashboard/index.html）
```html
<!-- cancelNotifyDetailModal -->
<div id="cancelNotifyDetailModal" class="fixed inset-0 z-50 hidden">
  <!-- キャンセルタイプ選択 -->
  <!-- 加盟店リスト（チェックボックス+課金/返金+ステータス） -->
  <!-- メール内容編集エリア -->
  <!-- プレビュー -->
  <!-- 送信ボタン -->
</div>
```

### JS追加
- `openCancelNotifyDetailModal(cvId)`
- `selectCancelType(type)`
- `updateMerchantCancelSetting(franchiseId, field, value)`
- `previewCancelEmail()`
- `sendBulkCancelNotification()`

---

## タスク6: キャンセル通知メールAPI

### 新規GAS関数
```javascript
// AdminSystem.js に追加
sendBulkCancelNotification: function(params) {
  // params: { cvId, cancelType, merchants: [{ franchiseId, refund, status, emailContent }] }

  // 1. ユーザー登録シート更新
  // 2. 配信管理シート各社更新
  // 3. 返金処理（freee連携 or フラグ設定）
  // 4. メール送信（各社個別）
  // 5. 通知履歴記録
}
```

### 課金/返金判定ロジック
```javascript
// 配信後48時間以内のキャンセル = 返金対象
// 配信後48時間超 = 課金（返金なし）
// 成約後のキャンセル = 状況による（手動判断）
```

---

## 参照ファイル

### GAS
- `gas/systems/admin/AdminSystem.js` - sendOrderTransfer, updateUserSheetDeliveryStatus
- `gas/systems/merchant/MerchantContractReport.js` - updateCaseStatus, _getMostAdvancedStatus
- `gas/update-detail-status-validation.js` - removeUserSheetStatusValidation

### フロント
- `admin-dashboard/index.html` - statusChangeNotifyModal (Line 2625-2675)
- `admin-dashboard/js/cv-list-manager.js` - CVListManager

### ステータス定義
- `gas/systems/common/StatusDefinitions.js`

---

## デプロイメント情報
- **GASデプロイID**: AKfycbzHJiSj68LiAtoUczeByZpQoEJdOBgmHu42DljI13ut2wkVIqY78zW5rZq89EYYlOtK3A
- **最新バージョン**: @2232
