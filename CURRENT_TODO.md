# 現在の作業TODO

**作業開始**: 2025-12-04 22:45 JST
**最終更新**: 2025-12-04 23:10 JST

---

## 決定事項

### スプシ設計（確定）

**認証情報シート（既存列維持 + 後ろに追加）**
```
A: 加盟店ID        ← 既存（変更なし）
B: メールアドレス   ← 既存（変更なし）
C: パスワードハッシュ ← 既存（変更なし）
D: 最終ログイン     ← 既存（変更なし）
E: パスワード変更日  ← 既存（変更なし）
---ここから追加---
F: 親加盟店ID      ← オーナーは空、メンバーは親のID
G: 氏名           ← メンバー用
H: 役職           ← leader/standard/office
I: 追加権限JSON    ← {caseViewAll, caseEdit, reportAll}
J: ステータス      ← pending/active/disabled
K: 招待有効期限
L: 招待作成日時
M: 登録日時
N: 署名
```

**既存シート活用**
- 通知設定シート → Phase3でそのまま使う
- ブラウザ通知シート → そのまま使う
- 配信管理シート → Phase2で担当者列追加

---

## Phase 1: メンバー招待システム（GAS）★最優先

- [x] 1-1. スプシ設計確定
- [ ] 1-2. `generateInviteLink` API実装
- [ ] 1-3. `verifyMemberInvite` API実装（JSONP）
- [ ] 1-4. `registerMember` API実装（JSONP）
- [ ] 1-5. フロントと結合テスト

**ファイル:**
- `gas/systems/merchant/MerchantMemberInvite.js` ← 新規作成
- `gas/systems/merchant/MerchantSystem.js` ← ルーティング追加
- `gas/main.js` ← SystemRouter追加

---

## Phase 2: 案件担当振り分け機能

- [ ] 2-1. 配信管理シートに「担当者ID」列追加（既存列の後ろ）
- [ ] 2-2. 担当者選択UI（案件詳細モーダル内）
- [ ] 2-3. 担当者変更API（GAS）
- [ ] 2-4. 案件カードに担当名表示
- [ ] 2-5. メンバー一覧取得API（ドロップダウン用）

**ファイル:**
- `franchise-dashboard/index.html` - UI
- `gas/systems/merchant/MerchantSystem.js` または `MerchantContractReport.js` - API

---

## Phase 3: 通知設定（担当ごと個別）

- [ ] 3-1. 通知設定UIをメンバー管理画面に追加
- [ ] 3-2. 通知設定保存API（既存シート活用）
- [ ] 3-3. 通知送信時の担当別フィルタリング

**通知種類:**
- 新規案件通知
- ステータス変更通知
- リマインダー通知
- 本部からの通知（ブラウザ通知シート）

**ファイル:**
- `franchise-dashboard/index.html` - UI
- 既存の通知設定シート活用

---

## 設計原則（厳守）

1. **既存列は絶対変更しない** - 後ろに追加のみ
2. **doPost/doGetはmainに集約** - 各システムはhandler関数のみ
3. **共通関数は最小限** - 各ファイルで独立
4. **機能ごとにファイル分離** - スパゲッティ化防止
5. **区切りごとにボスに確認** - 勝手に進めない

---

## API仕様（Phase1）

### generateInviteLink（POST）
```javascript
{
  system: 'merchant',
  action: 'generateInviteLink',
  merchantId: 'FR251121163819',
  role: 'leader' | 'standard' | 'office',
  expiryHours: 24,
  additionalPermissions: { caseViewAll: true, caseEdit: false, reportAll: true }
}
// → { success: true, inviteLink: "https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/member-register.html?data=xxx&sig=xxx" }
```

### verifyMemberInvite（GET/JSONP）
```
?action=verifyMemberInvite&data=xxx&sig=xxx&callback=jsonp_xxx
// → jsonp_xxx({ success: true, invite: { merchantId, merchantName, role, additionalPermissions } })
```

### registerMember（GET/JSONP）
```
?action=registerMember&data=xxx&sig=xxx&name=山田太郎&password=xxx&callback=jsonp_xxx
// → jsonp_xxx({ success: true, memberId: 'MEM_xxx' })
```

---

## 進捗メモ

### 完了済み（フロントエンド）
- [x] 招待モーダルUI - `index.html:7131-7237`
- [x] メンバー管理カードUI - `index.html:14885-15002`
- [x] メンバー登録ページ - `member-register.html`

### 次のアクション
→ Phase 1-2: generateInviteLink API実装開始
