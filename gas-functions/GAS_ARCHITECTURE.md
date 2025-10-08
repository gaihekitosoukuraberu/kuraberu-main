# GAS完全独立分離アーキテクチャ設計書

## 🎯 設計思想

**完全独立分離により、スパゲッティ化を完全回避**

```
各Systemファイルは完全に独立
共通関数の重複を許容（独立性優先）
外部依存を全てSystem内に内包
```

---

## 📁 現在の構造（リファクタリング前）

### ❌ スパゲッティ化した依存関係

```
main.js
├── AdminSystem.js
│   ├── ❌ sendApprovalNotification() (slackNotificationHandler.js)
│   ├── ❌ DataAccessLayer (DataAccessLayer.js)
│   ├── ✅ _generateFirstLoginUrl() (内包済み)
│   └── ✅ _sendWelcomeEmail() (内包済み)
│
├── FranchiseSystem.js
│   ├── ❌ saveIdentityDocument() (utils/driveUtils.js)
│   └── ❌ sendSlackRegistrationNotification() (slackNotificationHandler.js)
│
├── MerchantSystem.js
│   ├── ❌ verifySignedUrl() (auth-manager.js)
│   ├── ❌ savePassword() (auth-manager.js)
│   ├── ❌ verifyLogin() (auth-manager.js)
│   ├── ❌ CompanyInfoManager (systems/merchant/CompanyInfoManager.js - 955行)
│   └── ❌ DataAccessLayer (DataAccessLayer.js)
│
├── SlackApprovalSystem.js
│   ├── ❌ generateFirstLoginUrl() (auth-manager.js)
│   └── ❌ sendWelcomeEmail() (email-sender.js)
│
└── AISearchSystem.js
    └── ✅ 完全独立（外部API呼び出しのみ）
```

### 📊 現在のファイルサイズ

| ファイル | 行数 | サイズ | 依存数 | 独立性 |
|---------|------|--------|--------|--------|
| AdminSystem.js | 853 | 33KB | 2 | ⚠️ 中 |
| FranchiseSystem.js | 319 | 12KB | 2 | ⚠️ 中 |
| MerchantSystem.js | 1574 | 55KB | 4+ | ❌ 低 |
| SlackApprovalSystem.js | 489 | 18KB | 2 | ⚠️ 中 |
| AISearchSystem.js | 877 | 33KB | 0 | ✅ 高 |
| CompanyInfoManager.js | 955 | 31KB | - | - |
| auth-manager.js | 234 | 7KB | - | - |
| email-sender.js | 267 | 10KB | - | - |
| slackNotificationHandler.js | 333 | 12KB | - | - |
| DataAccessLayer.js | 268 | 9KB | - | - |

**合計**: 5,169行、220KB

---

## 🔧 完全独立分離アーキテクチャ（リファクタリング後）

### ✅ 完全独立した構造

```
main.js (ルーティングのみ)
│
├── AdminSystem.js (完全独立)
│   ├── ✅ _getSpreadsheet() (内包)
│   ├── ✅ _generateFirstLoginUrl() (内包)
│   ├── ✅ _sendWelcomeEmail() (内包)
│   ├── ✅ _sendSlackNotification() (内包)
│   └── ✅ _updateSheet() (内包)
│
├── FranchiseSystem.js (完全独立)
│   ├── ✅ _getSpreadsheet() (内包)
│   ├── ✅ _saveIdentityDocument() (内包)
│   ├── ✅ _uploadToDrive() (内包)
│   └── ✅ _sendSlackNotification() (内包)
│
├── MerchantSystem.js (完全独立)
│   ├── ✅ _getSpreadsheet() (内包)
│   ├── ✅ _verifySignedUrl() (内包)
│   ├── ✅ _savePassword() (内包)
│   ├── ✅ _verifyLogin() (内包)
│   ├── ✅ _uploadImage() (内包)
│   ├── ✅ _deleteImage() (内包)
│   ├── ✅ _saveConstructionExample() (内包)
│   └── ✅ _checkLoginAttempts() (内包)
│
├── SlackApprovalSystem.js (完全独立)
│   ├── ✅ _getSpreadsheet() (内包)
│   ├── ✅ _generateFirstLoginUrl() (内包)
│   └── ✅ _sendWelcomeEmail() (内包)
│
└── AISearchSystem.js (完全独立 - 変更なし)
    └── ✅ 外部API呼び出しのみ
```

### 📊 リファクタリング後のファイルサイズ予測

| ファイル | 行数予測 | サイズ予測 | 依存数 | 独立性 |
|---------|----------|-----------|--------|--------|
| AdminSystem.js | ~1,200 | ~50KB | 0 | ✅ 完全 |
| FranchiseSystem.js | ~600 | ~25KB | 0 | ✅ 完全 |
| MerchantSystem.js | ~2,800 | ~110KB | 0 | ✅ 完全 |
| SlackApprovalSystem.js | ~800 | ~35KB | 0 | ✅ 完全 |
| AISearchSystem.js | 877 | 33KB | 0 | ✅ 完全 |
| main.js | ~200 | ~8KB | - | - |

**合計**: ~6,477行、~261KB（+25%増加だが完全独立）

---

## 🔗 各Systemの完全独立化計画

### 1. **AdminSystem.js** - 管理ダッシュボード

#### 現在の外部依存
- ❌ `sendApprovalNotification()` (slackNotificationHandler.js)
- ❌ `DataAccessLayer` (DataAccessLayer.js)

#### 内包する関数（完全版）

```javascript
const AdminSystem = {
  // ========================================
  // スプレッドシート操作（内包）
  // ========================================
  _getSpreadsheet: function() {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('SPREADSHEET_IDが設定されていません');
    return SpreadsheetApp.openById(id);
  },

  _getRegistrationSheet: function() {
    const sheet = this._getSpreadsheet().getSheetByName('加盟店登録');
    if (!sheet) throw new Error('加盟店登録シートが見つかりません');
    return sheet;
  },

  // ========================================
  // 認証関連（内包 - auth-manager.jsから複製）
  // ========================================
  _generateFirstLoginUrl: function(merchantId) {
    const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
    const data = {
      merchantId: merchantId,
      expires: Date.now() + 86400000,
      type: 'first_login'
    };
    const signature = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(data) + SECRET_KEY
    ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 16);

    const payload = Utilities.base64EncodeWebSafe(JSON.stringify(data));
    const baseUrl = PropertiesService.getScriptProperties().getProperty('FIRST_LOGIN_URL');
    if (!baseUrl) throw new Error('FIRST_LOGIN_URLが設定されていません');
    return `${baseUrl}?data=${payload}&sig=${signature}`;
  },

  // ========================================
  // メール送信（内包 - email-sender.jsから複製）
  // ========================================
  _sendWelcomeEmail: function(email, companyName, loginUrl, merchantId) {
    const subject = '【外壁塗装くらべる】加盟店登録完了・初回ログインのご案内';
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif; line-height: 1.8; color: #333; background: #f7f7f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .merchant-id { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }
    .button-link { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">外壁塗装くらべる</div>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">加盟店管理システム</p>
    </div>
    <h2 style="color: #1e40af; margin-bottom: 25px;">加盟店登録完了のお知らせ</h2>
    <p><strong>${companyName}</strong> 様</p>
    <p>このたびは「外壁塗装くらべる」への加盟店登録をいただき、誠にありがとうございます。</p>
    <div class="merchant-id">${merchantId}</div>
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 25px 0;">
      <tr>
        <td style="text-align: center;">
          <a href="${loginUrl}" class="button-link">初回ログインを開始する</a>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: '外壁塗装くらべる運営事務局'
    });
    console.log('[AdminSystem] メール送信成功:', email, merchantId);
  },

  // ========================================
  // Slack通知（内包 - slackNotificationHandler.jsから複製）
  // ========================================
  _sendSlackNotification: function(registrationId, isApproved, user, reason) {
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
      if (!webhookUrl) {
        console.log('[AdminSystem] Slack Webhook URL未設定');
        return;
      }

      const message = {
        text: isApproved
          ? `@channel ✅ 登録ID: ${registrationId} が承認されました`
          : `@channel ❌ 登録ID: ${registrationId} が却下されました`,
        attachments: [{
          color: isApproved ? 'good' : 'danger',
          fields: [
            { title: 'ステータス', value: isApproved ? '承認済み' : '却下', short: true },
            { title: '処理者', value: user || '管理者', short: true },
            { title: '処理日時', value: Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss'), short: true }
          ]
        }]
      };

      if (!isApproved && reason) {
        message.attachments[0].fields.push({
          title: '却下理由',
          value: reason,
          short: false
        });
      }

      UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      });

      console.log('[AdminSystem] Slack通知送信完了');
    } catch (error) {
      console.error('[AdminSystem] Slack通知エラー:', error);
    }
  },

  // ========================================
  // 既存の公開API
  // ========================================
  handle: function(params) { /* ... */ },
  handlePost: function(e, postData) { /* ... */ },
  getRegistrationRequests: function(params) { /* ... */ },
  approveRegistration: function(params) { /* ... */ },
  rejectRegistration: function(params) { /* ... */ }
};
```

---

### 2. **FranchiseSystem.js** - 加盟店登録

#### 現在の外部依存
- ❌ `saveIdentityDocument()` (utils/driveUtils.js)
- ❌ `sendSlackRegistrationNotification()` (slackNotificationHandler.js)

#### 内包する関数（完全版）

```javascript
const FranchiseSystem = {
  // ========================================
  // スプレッドシート操作（内包）
  // ========================================
  _getSpreadsheet: function() {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('SPREADSHEET_IDが設定されていません');
    return SpreadsheetApp.openById(id);
  },

  _getRegistrationSheet: function() {
    const sheet = this._getSpreadsheet().getSheetByName('加盟店登録');
    if (!sheet) throw new Error('加盟店登録シートが見つかりません');
    return sheet;
  },

  // ========================================
  // Drive操作（内包 - driveUtils.jsから複製）
  // ========================================
  _uploadToDrive: function(base64Data, merchantId, fileName) {
    try {
      // Base64デコード
      const contentType = base64Data.match(/data:([^;]+);/)[1];
      const data = base64Data.split(',')[1];
      const decoded = Utilities.base64Decode(data);
      const blob = Utilities.newBlob(decoded, contentType, fileName);

      // フォルダ取得または作成
      const rootFolderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
      const rootFolder = rootFolderId ? DriveApp.getFolderById(rootFolderId) : DriveApp.getRootFolder();

      let merchantFolder;
      const folders = rootFolder.getFoldersByName(merchantId);
      if (folders.hasNext()) {
        merchantFolder = folders.next();
      } else {
        merchantFolder = rootFolder.createFolder(merchantId);
      }

      // アップロード
      const file = merchantFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return {
        success: true,
        fileId: file.getId(),
        fileUrl: `https://drive.google.com/uc?export=view&id=${file.getId()}`
      };

    } catch (error) {
      console.error('[FranchiseSystem] Drive upload error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  _saveIdentityDocument: function(imageData, registrationId, companyName) {
    const fileName = `${companyName}_${imageData.side}_${Date.now()}.jpg`;
    return this._uploadToDrive(imageData.data, registrationId, fileName);
  },

  // ========================================
  // Slack通知（内包）
  // ========================================
  _sendSlackRegistrationNotification: function(registrationData) {
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
      if (!webhookUrl) {
        console.log('[FranchiseSystem] Slack Webhook URL未設定');
        return;
      }

      const message = {
        text: '@channel 🎉 新規加盟店登録がありました',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*新規加盟店登録*\n会社名: *${registrationData.companyName}*`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '✅ 承認', emoji: true },
                style: 'primary',
                value: `approve_${registrationData.registrationId}`,
                action_id: 'approve_registration'
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '❌ 却下', emoji: true },
                style: 'danger',
                value: `reject_${registrationData.registrationId}`,
                action_id: 'reject_registration'
              }
            ]
          }
        ]
      };

      UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      });

      console.log('[FranchiseSystem] Slack通知送信完了');
    } catch (error) {
      console.error('[FranchiseSystem] Slack通知エラー:', error);
    }
  },

  // ========================================
  // 既存の公開API
  // ========================================
  handle: function(params) { /* ... */ },
  handlePost: function(e) { /* ... */ },
  registerFranchise: function(params) { /* ... */ }
};
```

---

### 3. **MerchantSystem.js** - 加盟店向けシステム

#### 現在の外部依存
- ❌ `verifySignedUrl()` (auth-manager.js)
- ❌ `savePassword()` (auth-manager.js)
- ❌ `verifyLogin()` (auth-manager.js)
- ❌ `CompanyInfoManager` (systems/merchant/CompanyInfoManager.js - 955行)
- ❌ `DataAccessLayer` (DataAccessLayer.js)

#### CompanyInfoManager完全統合計画

**CompanyInfoManager.js (955行)をMerchantSystem.js内に完全統合**

```javascript
const MerchantSystem = {
  // ========================================
  // スプレッドシート操作（内包）
  // ========================================
  _getSpreadsheet: function() { /* ... */ },
  _getRegistrationSheet: function() { /* ... */ },

  // ========================================
  // 認証関連（内包 - auth-manager.jsから複製）
  // ========================================
  _verifySignedUrl: function(payload, signature) { /* ... */ },
  _savePassword: function(merchantId, plainPassword) { /* ... */ },
  _verifyLogin: function(merchantId, inputPassword) { /* ... */ },
  _checkLoginAttempts: function(merchantId) { /* ... */ },
  _resetLoginAttempts: function(merchantId) { /* ... */ },

  // ========================================
  // 画像管理（内包 - CompanyInfoManagerから複製）
  // ========================================
  _uploadBase64Image: function(base64Data, merchantId, folder, fileName) { /* ... */ },
  _deleteFile: function(fileId) { /* ... */ },
  _uploadMainVisual: function(params) { /* ... */ },
  _deleteMainVisual: function(params) { /* ... */ },
  _addGalleryPhoto: function(params) { /* ... */ },
  _deleteGalleryPhoto: function(params) { /* ... */ },
  _saveConstructionExample: function(params) { /* ... */ },
  _getConstructionExamples: function(params) { /* ... */ },
  _deleteConstructionExample: function(params) { /* ... */ },
  _saveQualifications: function(params) { /* ... */ },
  _saveInsurances: function(params) { /* ... */ },

  // ========================================
  // 既存の公開API
  // ========================================
  handle: function(params) { /* ... */ },
  handlePost: function(e) { /* ... */ },
  verifyFirstLoginUrl: function(params) { /* ... */ },
  setFirstPassword: function(params) { /* ... */ },
  getMerchantData: function(params) { /* ... */ },
  updateAutoDeliverySettings: function(params) { /* ... */ }
};
```

---

### 4. **SlackApprovalSystem.js** - Slack承認ボタン処理

#### 現在の外部依存
- ❌ `generateFirstLoginUrl()` (auth-manager.js)
- ❌ `sendWelcomeEmail()` (email-sender.js)

#### 内包する関数（完全版）

```javascript
const SlackApprovalSystem = {
  // ========================================
  // スプレッドシート操作（内包）
  // ========================================
  _getSpreadsheet: function() { /* ... */ },
  _getRegistrationSheet: function() { /* ... */ },

  // ========================================
  // 認証関連（内包 - auth-manager.jsから複製）
  // ========================================
  _generateFirstLoginUrl: function(merchantId) {
    const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
    const data = {
      merchantId: merchantId,
      expires: Date.now() + 86400000,
      type: 'first_login'
    };
    const signature = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(data) + SECRET_KEY
    ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 16);

    const payload = Utilities.base64EncodeWebSafe(JSON.stringify(data));
    const baseUrl = PropertiesService.getScriptProperties().getProperty('FIRST_LOGIN_URL');
    if (!baseUrl) throw new Error('FIRST_LOGIN_URLが設定されていません');
    return `${baseUrl}?data=${payload}&sig=${signature}`;
  },

  // ========================================
  // メール送信（内包 - email-sender.jsから複製）
  // ========================================
  _sendWelcomeEmail: function(email, companyName, loginUrl, merchantId) { /* ... */ },

  // ========================================
  // 既存の公開API
  // ========================================
  handlePost: function(e) { /* ... */ },
  handleBlockActions: function(payload) { /* ... */ },
  approveRegistration: function(registrationId, approver) { /* ... */ },
  rejectRegistration: function(registrationId, rejector, reason) { /* ... */ }
};
```

---

### 5. **AISearchSystem.js** - AI会社情報検索

**✅ 既に完全独立 - 変更不要**

---

## 📋 リファクタリング手順

### ステップ1: AdminSystem.js 完全独立化

1. `_getSpreadsheet()`, `_getRegistrationSheet()` 追加
2. `_generateFirstLoginUrl()` を auth-manager.js から複製
3. `_sendWelcomeEmail()` を email-sender.js から複製
4. `_sendSlackNotification()` を slackNotificationHandler.js から複製
5. 既存の `sendApprovalNotification()` 呼び出しを `_sendSlackNotification()` に置き換え
6. `DataAccessLayer` 呼び出しを全て削除し、直接スプレッドシート操作に変更

### ステップ2: FranchiseSystem.js 完全独立化

1. `_getSpreadsheet()`, `_getRegistrationSheet()` 追加
2. `_uploadToDrive()`, `_saveIdentityDocument()` を driveUtils.js から複製
3. `_sendSlackRegistrationNotification()` を slackNotificationHandler.js から複製
4. 既存の外部関数呼び出しを全て内部関数に置き換え

### ステップ3: MerchantSystem.js 完全独立化

1. `_getSpreadsheet()`, `_getRegistrationSheet()` 追加
2. auth-manager.js から以下を複製:
   - `_verifySignedUrl()`
   - `_savePassword()`
   - `_verifyLogin()`
   - `_checkLoginAttempts()`
   - `_resetLoginAttempts()`
3. CompanyInfoManager.js (955行)を完全統合:
   - 全ての関数を `_` プレフィックス付きで内包
   - ImageUploadUtils依存を全て内部実装に置き換え
4. `DataAccessLayer` 呼び出しを全て削除

### ステップ4: SlackApprovalSystem.js 完全独立化

1. `_getSpreadsheet()`, `_getRegistrationSheet()` 追加
2. `_generateFirstLoginUrl()` を auth-manager.js から複製
3. `_sendWelcomeEmail()` を email-sender.js から複製
4. 既存の外部関数呼び出しを全て内部関数に置き換え

### ステップ5: main.js クリーンアップ

1. ルーティングのみに特化
2. 各Systemへの依存をインポートのみに限定

### ステップ6: 不要ファイル削除

以下のファイルは各Systemに統合されたため削除可能（バックアップ後）:
- ❌ `auth-manager.js`
- ❌ `email-sender.js`
- ❌ `slackNotificationHandler.js`
- ❌ `DataAccessLayer.js`
- ❌ `systems/merchant/CompanyInfoManager.js`

---

## 🧪 テスト計画

### 機能テスト

1. **AdminSystem**
   - ✅ getRegistrationRequests
   - ✅ approveRegistration (メール送信・Slack通知含む)
   - ✅ rejectRegistration (Slack通知含む)
   - ✅ updateMerchantStatusFromAdmin

2. **FranchiseSystem**
   - ✅ registerFranchise (画像アップロード・Slack通知含む)

3. **MerchantSystem**
   - ✅ verifyFirstLoginUrl
   - ✅ setFirstPassword
   - ✅ verifyLogin
   - ✅ getMerchantData
   - ✅ updateAutoDeliverySettings
   - ✅ 画像アップロード・削除（メインビジュアル・ギャラリー）
   - ✅ 施工事例CRUD
   - ✅ 保有資格・加入保険保存

4. **SlackApprovalSystem**
   - ✅ Slack承認ボタン → メール送信
   - ✅ Slack却下ボタン → ステータス更新

5. **AISearchSystem**
   - ✅ searchCompany

### デプロイテスト

```bash
# 1. clasp push
cd /Users/ryuryu/franchise-dashboard/gas-functions
clasp push

# 2. 動作確認（各action）
# - Admin: approveRegistration
# - Franchise: registerFranchise
# - Merchant: setFirstPassword
# - Slack: Slackボタン押下
```

---

## ✅ 完全独立分離のメリット

### 1. **保守性の向上**
- 各Systemファイルのみで完結
- 他のファイルを見なくても理解可能
- バグ修正が局所的に完結

### 2. **拡張性の向上**
- 新機能追加時に他のSystemに影響なし
- 関数の重複を気にせず実装可能

### 3. **デバッグの容易化**
- エラーが起きたSystemファイルのみ確認すればOK
- 依存関係の追跡不要

### 4. **デプロイの安全性**
- 1つのSystemファイルのみ変更
- 他のSystemへの影響ゼロ

---

## 🎉 結論

**完全独立分離により、スパゲッティ化を完全回避！**

- ✅ 各Systemは完全独立
- ✅ 共通関数の重複を許容（独立性優先）
- ✅ 外部依存ゼロ
- ✅ 拡張性が高い
- ✅ メンテナンスが容易

**ファイルサイズ**: +25%増加（220KB → 261KB）
**スパゲッティ化リスク**: ゼロ 🎯
