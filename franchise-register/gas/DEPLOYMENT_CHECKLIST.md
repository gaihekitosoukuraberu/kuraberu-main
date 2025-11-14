# 通知システム デプロイメントチェックリスト

## 🎯 実装完了機能

### Phase 1-7 すべて完了 ✅

1. ✅ **通知設定管理基盤** - NotificationSettingsManager.js
2. ✅ **AI却下理由生成** - AIReasonGenerator.js (OpenRouter統合)
3. ✅ **メール送信プロバイダー** - NotificationDispatcher.js
4. ✅ **LINE送信プロバイダー** - NotificationDispatcher.js
5. ✅ **ブラウザ通知システム** - NotificationDispatcher.js
6. ✅ **Slackモーダル対応** - SlackApprovalSystem.js (却下理由入力UI)
7. ✅ **通知フロー統合** - 承認・却下時の自動通知

---

## 📋 デプロイ前の必須設定

### 1. **Slackボットトークンの設定**

モーダル機能を使用するには、Webhook URLだけでなくBot Tokenが必要です。

#### 手順:
1. [Slack API](https://api.slack.com/apps)にアクセス
2. 既存のアプリを選択（または新規作成）
3. **OAuth & Permissions** → **Bot Token Scopes** で以下を追加:
   - `chat:write`
   - `chat:write.public`
4. **Install App to Workspace** でトークンを取得
5. GASスクリプトプロパティに追加:

```javascript
// GASエディタで実行
function setSlackBotToken() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SLACK_BOT_TOKEN', 'xoxb-YOUR-BOT-TOKEN-HERE');
  console.log('✅ SLACK_BOT_TOKEN設定完了');
}
```

### 2. **OpenRouter API設定確認**

すでに設定済みですが、念のため確認:

```javascript
function checkOpenRouterKey() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('OPENROUTER_API_KEY');
  console.log(key ? '✅ OpenRouter設定済み' : '❌ OpenRouter未設定');
}
```

### 3. **LINE Messaging API設定確認**

```javascript
function checkLineSettings() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('LINE_ACCESS_TOKEN');
  const userId = props.getProperty('LINE_ADMIN_USER_ID');
  const secret = props.getProperty('LINE_CHANNEL_SECRET');

  console.log('LINE_ACCESS_TOKEN:', token ? '✅' : '❌');
  console.log('LINE_ADMIN_USER_ID:', userId ? '✅' : '❌');
  console.log('LINE_CHANNEL_SECRET:', secret ? '✅' : '❌');
}
```

---

## 🧪 テスト手順

### テスト1: キャンセル申請却下フロー（Slackモーダル）

**目的**: AI生成理由→モーダル表示→編集→送信→加盟店通知

#### 実行手順:

1. **テストデータで申請作成**:
```javascript
function testCancelApplicationFlow() {
  // 既存のtest-cancel-application-flow.jsを実行
  testCancelApplicationFlow();
}
```

2. **Slackで却下ボタンクリック**:
   - モーダルが開くか確認 ✅
   - AI生成理由が表示されるか確認 ✅
   - 理由を編集可能か確認 ✅

3. **却下を確定**:
   - Slackメッセージが「❌ キャンセル申請却下」に更新されるか ✅
   - 加盟店にメール/LINE/ブラウザ通知が送信されるか ✅

4. **ログ確認**:
```javascript
// GASエディタ → 実行ログで以下を確認
[AIReasonGenerator] AI理由生成開始...
[AIReasonGenerator] API呼び出し成功
[SlackApproval] モーダル表示成功
[NotificationDispatcher] 通知配信開始
[NotificationDispatcher] メール送信成功
[NotificationDispatcher] LINE送信成功
[NotificationDispatcher] ブラウザ通知保存成功
```

---

### テスト2: 期限延長申請承認フロー

#### 実行手順:

1. **期限延長申請を作成** (仮のテストデータ):
```javascript
function createTestExtensionApplication() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const extensionSheet = ss.getSheetByName('期限延長申請');

  if (!extensionSheet) {
    console.error('期限延長申請シートが見つかりません');
    return;
  }

  const testData = [
    'EXT_TEST_' + new Date().getTime(), // 申請ID
    'FR251112004602', // 加盟店ID
    'C社', // 加盟店名
    'テスト担当者', // 申請者名
    'CV00002', // CV ID
    '田中太郎', // 顧客名
    new Date(), // 連絡がついた日時
    new Date(Date.now() + 86400000), // アポ予定日（明日）
    '顧客都合により日程調整が必要', // 延長理由
    new Date(Date.now() + 7 * 86400000), // 延長後期限（1週間後）
    '申請中', // ステータス
    new Date() // 申請日時
  ];

  extensionSheet.appendRow(testData);

  console.log('✅ テスト期限延長申請作成完了');
  console.log('申請ID:', testData[0]);

  // Slack通知を送信
  const result = SlackCancelNotifications.sendSlackExtensionNotification({
    extensionId: testData[0],
    cvId: testData[4],
    customerName: testData[5],
    merchantId: testData[1],
    merchantName: testData[2],
    contactDate: testData[6],
    appointmentDate: testData[7],
    extensionReason: testData[8],
    extendedDeadline: testData[9]
  });

  console.log('Slack通知結果:', result);

  return testData[0]; // 申請IDを返す
}
```

2. **Slackで承認ボタンクリック**:
   - Slackメッセージが「✅ 期限延長申請承認済み」に更新 ✅
   - 加盟店に承認通知が送信される ✅

---

### テスト3: 通知設定の動作確認

#### 通知設定の保存テスト:

```javascript
function testNotificationSettings() {
  // テストユーザーの設定を保存
  const result = NotificationSettingsManager.saveSettings(
    'test_user_001',
    'FR251112004602',
    {
      email: true,
      line: true,
      browser: false,
      alerts: {
        cancelApplication: true,
        deadlineExtension: true,
        appointmentReminder: false,
        callReminder: false
      }
    }
  );

  console.log('設定保存結果:', result);

  // 設定を取得して確認
  const settings = NotificationSettingsManager.getSettings('test_user_001', 'FR251112004602');
  console.log('取得した設定:', settings);

  // チャネル有効性を確認
  console.log('メール有効:', NotificationSettingsManager.isChannelEnabled('test_user_001', 'email'));
  console.log('LINE有効:', NotificationSettingsManager.isChannelEnabled('test_user_001', 'line'));
  console.log('ブラウザ有効:', NotificationSettingsManager.isChannelEnabled('test_user_001', 'browser'));
}
```

---

### テスト4: AI理由生成の動作確認

#### OpenRouter APIテスト:

```javascript
function testAIReasonGeneration() {
  const testData = {
    customerName: '田中太郎',
    phoneCallCount: 2,
    smsCount: 1,
    cancelReasonCategory: '電話繋がらず',
    cancelReasonDetail: '不在',
    lastContactDate: new Date(),
    hasActiveCompetitors: true,
    competitorDetails: [
      { merchantName: 'A社', phoneCount: 5, status: '追客中' },
      { merchantName: 'B社', phoneCount: 3, status: '追客中' }
    ]
  };

  console.log('=== AI理由生成テスト開始 ===');
  const result = AIReasonGenerator.generateCancelRejectionReason(testData);

  console.log('生成成功:', result.success);
  console.log('フォールバック使用:', result.fallback);
  console.log('生成理由:\n' + result.reason);
}
```

---

## 🚀 デプロイ手順

### 1. **コードをプッシュ**

```bash
cd /Users/ryuryu/projects/kuraberu-main/franchise-register/gas
clasp push --force
```

### 2. **新しいバージョンをデプロイ**

```bash
# 古いデプロイメントを削除（必要に応じて）
clasp deployments

# 新しいデプロイメントを作成
clasp deploy --description "V1800: マルチチャネル通知システム実装 - AI却下理由生成・Slackモーダル対応"
```

### 3. **Webアプリのバージョン更新**

GASエディタで:
1. **デプロイ** → **デプロイを管理**
2. 最新バージョンを選択
3. **更新**をクリック

---

## ⚠️ トラブルシューティング

### エラー: "SLACK_BOT_TOKEN が設定されていません"

**原因**: モーダル表示にはBot Tokenが必要

**解決策**:
```javascript
function setSlackBotToken() {
  PropertiesService.getScriptProperties()
    .setProperty('SLACK_BOT_TOKEN', 'xoxb-YOUR-TOKEN-HERE');
}
```

---

### エラー: "AI生成に失敗しました"

**原因**: OpenRouter APIキーの問題または料金不足

**解決策**:
1. [OpenRouter Dashboard](https://openrouter.ai/)でクレジット残高を確認
2. APIキーが正しいか確認
3. フォールバック理由が自動的に使用されるため、機能は継続

---

### エラー: "メールアドレスが登録されていません"

**原因**: 加盟店管理シートにメールアドレスが未登録

**解決策**:
- 加盟店管理シートのE列にメールアドレスを入力
- または `NotificationDispatcher._getUserEmail()` を修正して別のシートから取得

---

### エラー: "LINE IDが登録されていません"

**原因**: ユーザー管理シートにLINE IDが未登録

**解決策**:
- ユーザー管理シートにLINE IDを登録
- または `NotificationDispatcher._getUserLineId()` を修正

---

## 📊 実装されたファイル一覧

```
gas/
├── systems/
│   ├── notification/
│   │   ├── NotificationSettingsManager.js    ← NEW
│   │   ├── NotificationDispatcher.js         ← NEW
│   │   ├── NotificationTemplates.js          ← NEW
│   │   └── AIReasonGenerator.js              ← NEW
│   └── slack/
│       ├── SlackApprovalSystem.js            ← UPDATED (モーダル対応)
│       └── SlackCancelNotifications.js       ← 既存
├── test-cancel-application-flow.js           ← 既存（テスト用）
└── DEPLOYMENT_CHECKLIST.md                   ← NEW
```

---

## 🎉 完了した機能

- ✅ Slackモーダルで却下理由を編集可能
- ✅ AI生成の却下理由（OpenRouter統合）
- ✅ マルチチャネル通知（メール、LINE、ブラウザ）
- ✅ ユーザーごとの通知設定管理
- ✅ 承認・却下時の自動通知
- ✅ フォールバック処理（AI失敗時）
- ✅ 丁寧で建設的な却下理由
- ✅ スパゲッティ化を防ぐモジュラー設計

---

## 🔜 次のステップ

1. **必須設定の確認**
   - [ ] SLACK_BOT_TOKEN設定
   - [ ] OpenRouter API残高確認
   - [ ] LINE設定確認
   - [ ] メールアドレス登録確認

2. **テスト実行**
   - [ ] テスト1: キャンセル却下フロー
   - [ ] テスト2: 期限延長承認フロー
   - [ ] テスト3: 通知設定
   - [ ] テスト4: AI理由生成

3. **デプロイ**
   - [ ] clasp push
   - [ ] clasp deploy
   - [ ] Webアプリバージョン更新

4. **本番環境で動作確認**
   - [ ] Slackモーダル表示確認
   - [ ] 通知送信確認
   - [ ] ログ確認

---

**担当**: Claude Code
**作成日**: 2025-11-14
**バージョン**: V1800
