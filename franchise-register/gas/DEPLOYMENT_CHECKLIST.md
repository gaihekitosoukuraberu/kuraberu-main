# GAS デプロイメント運用ルール（@HEAD固定）

## 🎯 デプロイメント方針

**@HEAD 1個だけ使用 - バージョン付きデプロイメントは作成しない**

- 複数デプロイメントの管理は複雑化するため、@HEADのみ使用
- `clasp push`でコードを更新すると、@HEADに自動反映
- Web App URLは固定（変更なし）

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

### POSTが404エラーになる

**原因**: Web Appが「全員」に設定されていない

**解決策**:
1. GASエディタで「デプロイ」→「デプロイを管理」
2. @HEADの編集（鉛筆アイコン）
3. 「アクセスできるユーザー」を「全員（匿名ユーザーを含む）」に変更
4. 「デプロイ」をクリック

### GETは動くがPOSTが動かない

**原因**: claspで作成したdeploymentはCode deploymentであり、Web App deploymentではない

**解決策**: 本ドキュメントの「初回セットアップ」を実行

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

**更新日**: 2025-11-21
**バージョン**: V1852 - @HEAD固定運用
