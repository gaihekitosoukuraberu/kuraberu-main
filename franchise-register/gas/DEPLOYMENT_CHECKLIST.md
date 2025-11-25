# GAS デプロイメント運用ルール（V1758固定運用）

## 🎯 デプロイメント方針（2025-11-25更新）

**V1758固定デプロイメント使用 - 組織アカウント制限の回避策**

- 組織アカウントでは@HEADが作成できないため、V1758を@HEAD相当として運用
- `clasp push`でコードを更新、V1758デプロイメントは固定
- Web App URLは永続的に固定: `AKfycbzzFPNZ3uO9InJlzXGaWIT3y0uALwVHY9miqtQKuMsWQNRTUw2KQAGynf5X5C-Nk42jvQ`
- キャッシュバスターのみ更新で、URLは変更しない

---

## ⚠️ 【重要】clasp の制限について

### claspで作成されるのは「Code deployment」のみ

**重要:** `clasp deploy` では **Web App deployment を作成できません**。これはGASの仕様です。

```bash
# これは Code deployment を作成する（GETのみ、ライブラリ用）
clasp deploy --description "V1234: 〇〇機能追加"
```

#### Code deployment と Web App deployment の違い

| 種類 | 作成方法 | GET対応 | POST対応 | 用途 |
|------|---------|--------|---------|------|
| **Code deployment** | `clasp deploy` | ✅ | ❌ | ライブラリとして他のGASから呼び出し |
| **Web App deployment** | GAS UI で手動作成 | ✅ | ✅ | 外部からのHTTPリクエスト受付 |

#### POSTが404エラーになる原因

以下のコマンドで表示されるdeploymentは、**Code deployment**です:

```bash
clasp deployments
# 出力例:
# - AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj @HEAD
# - AKfycbwHlJ12PvmgkmVTsoEzfFGCDk_jm8PxbUYYeXxsKh0mnPblxui-43m4279aO4j9B2kF2A @1753
```

**これらのURLにPOSTリクエストを送ると、「ページが見つかりません」エラーが返されます。**

---

## ⚠️ 【重要】初回セットアップ（1度だけ必要）

GASでは`clasp`でWeb Appの権限設定ができないため、**初回1度だけGAS UIで手動設定が必要です**。

### 手順:

1. **GASエディタを開く**
   ```
   https://script.google.com/home/projects/1VALw14wYqzPq_lBaJZxboFkrG5FTJ_2X2XFaBxisK3lQZ5ppQFYxpHMg/edit
   ```

2. **新しいデプロイを作成**
   - 右上「デプロイ」→「新しいデプロイ」をクリック

3. **ウェブアプリとして設定**
   - 「種類を選択」→ **「ウェブアプリ」** を選択
   - 説明: `@HEAD Web App (固定)`
   - 次のユーザーとして実行: **自分（メールアドレス）**
   - アクセスできるユーザー: **全員（匿名ユーザーを含む）**
   - 「デプロイ」をクリック

4. **Web App URLをコピー**
   ```
   https://script.google.com/macros/s/XXXXXXXX/exec
   ```
   ↑ このURLを[env-loader.js](../../js/env-loader.js)と[mail.php](../../lp/mail.php)に設定

---

## 📝 日常のデプロイ手順（2回目以降）

初回セットアップ完了後は、以下のコマンドだけでOK：

### 1. コード修正後にpush

```bash
cd /Users/ryuryu/projects/kuraberu-main/franchise-register/gas
clasp push --force
```

これだけで@HEADに反映され、Web App URLは変わりません。

### 2. 動作確認

```bash
# GET test
curl -L "https://script.google.com/macros/s/XXXXXXXX/exec?action=health"

# POST test
curl -X POST "https://script.google.com/macros/s/XXXXXXXX/exec" \
  -d "action=health" \
  -L
```

---

## 🚫 やってはいけないこと

### ❌ バージョン付きデプロイメントを作成しない

```bash
# これはやらない
clasp deploy --description "V1234: 〇〇機能追加"
```

理由:
- 複数デプロイメント管理が複雑化
- URLが変わるたびにenv-loader.jsとmail.phpを更新する必要がある
- @HEADだけで十分

### ❌ GAS UIで「新しいバージョン」を作成しない

- GASエディタの「デプロイ」→「新しいデプロイ」は使わない（初回以外）
- `clasp push`だけでOK

---

## 🔧 設定ファイルの管理

### Single Source of Truth: [js/env-loader.js](../../js/env-loader.js)

```javascript
const ENV = {
  GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  FALLBACK_GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  EMERGENCY_GAS_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  // ...
};
```

- このファイルが全システム共通の設定元
- フロントエンド（HTML/JS）もバックエンド（PHP）も全てここを参照
- Web App URL変更時はここだけ更新すればOK

---

## 🤖 CI/CD自動化（GitHub Actions）

### [.github/workflows/gas-cicd.yml](../../.github/workflows/gas-cicd.yml)

```yaml
- name: Push to GAS (@HEAD only)
  run: |
    clasp push --force
    # @HEADのデプロイメントIDを取得してenv-loader.jsを自動更新
    DEPLOYMENT_ID=$(clasp deployments | grep "@HEAD" | awk '{print $2}' | tr -d '-')
    node sync-master-env-loader.js "$DEPLOYMENT_ID"
```

- `main`ブランチにpushすると自動的に@HEADに反映
- env-loader.jsとmail.phpも自動更新
- FTPで本番サーバーにデプロイ

---

## 📋 システム構成

### main.js - エントリーポイント

```javascript
function doGet(e) {
  // GETリクエスト処理
  // SystemRouterでルーティング
}

function doPost(e) {
  // POSTリクエスト処理
  // SystemRouterでルーティング
}
```

**重要**: doGetとdoPostはmain.jsに集約
- 共通関数は最小限
- スパゲッティ化を防ぐためmodule化

### systems/ - 機能別モジュール

```
systems/
├── admin/
│   ├── AdminSystem.js
│   └── AdminCancelSystem.js
├── merchant/
│   ├── MerchantSystem.js
│   └── MerchantCancelReport.js
├── franchise/
│   └── FranchiseSystem.js
├── lp/
│   └── LPContactSystem.js  ← LP問い合わせフォーム
├── notification/
│   ├── NotificationDispatcher.js
│   └── NotificationSettingsManager.js
└── slack/
    ├── SlackApprovalSystem.js
    └── SlackCancelNotifications.js
```

- 1つのGASに複数システムを混在
- SystemRouterで振り分け
- 各システムは独立したファイル

---

## ⚠️ トラブルシューティング

### POSTが「ページが見つかりません」エラーになる

**症状**:
- GETリクエストは成功する ✅
- POSTリクエストが404エラー/「ページが見つかりません」を返す ❌
- doPostの実行ログは存在するが、詳細が見れない

**原因**: `clasp deploy`で作成したdeploymentは**Code deployment**であり、**Web App deployment**ではない

**確認方法**:
```bash
clasp deployments
# 出力例:
# - AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj @HEAD
# - AKfycbwHlJ12PvmgkmVTsoEzfFGCDk_jm8PxbUYYeXxsKh0mnPblxui-43m4279aO4j9B2kF2A @1753
```

↑ これらは**Code deployment**なので、POSTは動きません。

**POSTリクエストテスト**:
```bash
# Code deploymentにPOSTすると「ページが見つかりません」エラーが返る
curl -X POST 'https://script.google.com/macros/s/AKfycb.../exec' \
  -d 'action=health' -L
# 結果: <!DOCTYPE html>...<title>ページが見つかりません</title>...
```

**解決策**:
1. **GAS UIで「デプロイ」→「デプロイを管理」を開く**
2. **「ウェブアプリ」タイプのdeploymentが存在するか確認**
   - 存在する → その「ウェブアプリ URL」を使用
   - 存在しない → 次のステップへ
3. **「新しいデプロイ」→「種類を選択」→「ウェブアプリ」を選択**
   - 説明: `LPContactSystem Web App`
   - 次のユーザーとして実行: **自分（メールアドレス）**
   - アクセスできるユーザー: **全員（匿名ユーザーを含む）** ← 重要！
   - 「デプロイ」ボタンをクリック
4. **表示された「ウェブアプリ URL」をコピーして使用**

**重要**: clasp では Web App deployment を作成できません。GAS UI での手動作成が必須です。

### GETは動くがPOSTが動かない（権限エラー）

**原因**: Web App の権限設定が「全員（Googleアカウント必須）」になっている

**解決策**:
1. GASエディタで「デプロイ」→「デプロイを管理」
2. Web App deploymentの編集（鉛筆アイコン）
3. 「アクセスできるユーザー」を確認:
   - ❌ 「全員」（Googleアカウント必須） ← これだとPOSTに認証が必要
   - ✅ 「全員（匿名ユーザーを含む）」 ← これが正しい
4. 「新しいバージョンとして保存」をクリック

### env-loader.jsのURLが古い

**原因**: GitHub Actionsの自動更新が失敗している

**解決策**:
```bash
# 手動で更新
cd /Users/ryuryu/projects/kuraberu-main
DEPLOYMENT_ID="AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj"  # @HEADのID
node sync-master-env-loader.js "$DEPLOYMENT_ID"
git add js/env-loader.js lp/mail.php
git commit -m "fix: Update env-loader.js to @HEAD"
git push
```

---

## 🔜 次の作業

1. **初回セットアップ完了確認**
   - [ ] GAS UIでWeb App設定済み
   - [ ] Web App URLをコピー済み
   - [ ] env-loader.jsに設定済み
   - [ ] mail.phpに設定済み
   - [ ] POST動作確認済み

2. **日常運用**
   - [ ] コード修正
   - [ ] `clasp push --force`
   - [ ] 動作確認

---

**更新日**: 2025-11-25
**バージョン**: V1758 - POST Simulation対応（組織アカウント制限回避）
