# 現在の作業TODO

**作業開始**: 2025-12-04 22:45 JST

## 全体目標: メンバー管理 & 案件担当システム実装

---

## Phase 1: メンバー招待システム（GAS）★最優先
- [ ] 1-1. 招待用スプレッドシート設計・作成
- [ ] 1-2. `generateInviteLink` API実装
- [ ] 1-3. `verifyMemberInvite` API実装（JSONP）
- [ ] 1-4. `registerMember` API実装（JSONP）
- [ ] 1-5. フロントと結合テスト

**関連ファイル:**
- `gas/systems/merchant/MerchantMemberInvite.js` ← 新規作成
- `gas/main.js` - ルーティング追加

---

## Phase 2: 案件担当振り分け機能
- [ ] 2-1. 担当者選択UI（案件詳細モーダル内）
- [ ] 2-2. 担当者変更API（GAS）
- [ ] 2-3. 案件カードに担当名表示

**関連ファイル:**
- `franchise-dashboard/index.html` - UI
- `gas/systems/merchant/MerchantSystem.js` - API

---

## Phase 3: 通知設定（担当ごと個別）
- [ ] 3-1. 通知設定UI（メンバー管理画面内）
- [ ] 3-2. 通知設定保存API
- [ ] 3-3. 通知送信時の担当別フィルタリング

**通知種類（想定）:**
- 新規案件通知
- ステータス変更通知
- リマインダー通知
- 本部からの通知

---

## 設計原則（厳守）

1. **doPost/doGetはmainに集約** - 各システムはhandler関数のみ
2. **共通関数は最小限** - 各ファイルで独立
3. **機能ごとにファイル分離** - スパゲッティ化防止
4. **区切りごとにボスに確認** - 勝手に進めない

---

## 進捗メモ

### 完了済み（フロントエンド）
- [x] 招待モーダルUI - `index.html:7131-7237`
- [x] メンバー管理カードUI - `index.html:14885-15002`
- [x] メンバー登録ページ - `member-register.html`

### 次のアクション
→ Phase 1-1: 招待用スプシ設計から開始

---

## API仕様

### generateInviteLink（POST）
```javascript
{
  system: 'merchant',
  action: 'generateInviteLink',
  merchantId: 'xxx',
  role: 'leader' | 'standard' | 'office',
  expiryHours: 24,
  additionalPermissions: { caseViewAll, caseEdit, reportAll }
}
// → { success: true, inviteLink: "https://..." }
```

### verifyMemberInvite（GET/JSONP）
```
?action=verifyMemberInvite&data=xxx&sig=xxx&callback=jsonp_xxx
// → jsonp_xxx({ success: true, invite: {...} })
```

### registerMember（GET/JSONP）
```
?action=registerMember&data=xxx&sig=xxx&name=xxx&password=xxx&callback=jsonp_xxx
// → jsonp_xxx({ success: true, memberId: 'xxx' })
```
