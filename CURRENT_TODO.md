# 現在の作業TODO

**作業開始**: 2025-12-04 22:40 JST

## 目標: メンバー招待システムGAS実装

### 完了済み（フロントエンド）
- [x] 招待モーダルUI（権限選択、リンク生成、コピー/LINE/SMS共有）
- [x] メンバー管理カードUI（招待中/既存メンバー表示）
- [x] メンバー登録ページ（`member-register.html`）

### TODO（GASバックエンド）
- [ ] `generateInviteLink` - 招待リンク生成API
  - トークン生成（data + signature方式）
  - スプレッドシートに招待情報保存
  - 24時間有効期限
- [ ] `verifyMemberInvite` - 招待トークン検証API（JSONP）
  - 署名検証
  - 有効期限チェック
  - 招待情報を返す
- [ ] `registerMember` - メンバー登録API（JSONP）
  - トークン検証
  - メンバー情報保存
  - 招待を使用済みに更新

## 進捗メモ
- フロントエンドは `franchise-dashboard/index.html` 14860行目〜
- メンバー登録ページは `merchant-portal/member-register.html`
- GASは `gas/systems/merchant/MerchantSystem.js` に追加

## 関連ファイル
- `franchise-dashboard/index.html` - 招待UI（完成）
- `franchise-dashboard/merchant-portal/member-register.html` - 登録ページ（完成）
- `gas/systems/merchant/MerchantSystem.js` - ここにAPI追加
- `gas/main.js` - ルーティング確認

## 期待するAPI仕様

### generateInviteLink（POST）
```javascript
// リクエスト
{
  system: 'merchant',
  action: 'generateInviteLink',
  merchantId: 'xxx',
  role: 'leader' | 'standard' | 'office',
  expiryHours: 24,
  additionalPermissions: { caseViewAll, caseEdit, reportAll }
}

// レスポンス
{
  success: true,
  inviteLink: "https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/member-register.html?data=xxx&sig=xxx"
}
```

### verifyMemberInvite（GET/JSONP）
```javascript
// リクエスト
?action=verifyMemberInvite&data=xxx&sig=xxx&callback=jsonp_xxx

// レスポンス
jsonp_xxx({
  success: true,
  invite: {
    merchantId: 'xxx',
    merchantName: '加盟店名',
    role: 'standard',
    additionalPermissions: {...}
  }
})
```

### registerMember（GET/JSONP）
```javascript
// リクエスト
?action=registerMember&data=xxx&sig=xxx&name=山田太郎&password=xxx&callback=jsonp_xxx

// レスポンス
jsonp_xxx({
  success: true,
  memberId: 'xxx'
})
```
