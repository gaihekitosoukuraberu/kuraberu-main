# デプロイ前チェックリスト

このチェックリストは、GASデプロイ前に確認すべき項目をまとめたものです。
すべての項目をチェックしてからデプロイを実行してください。

---

## 📋 変更内容の確認

### システム変更のチェック
- [ ] **FranchiseSystem.js を変更した？**
  - [ ] → MerchantSystem.js のデータ読み取りロジックを確認
  - [ ] → データフォーマットの変更有無を確認
  - [ ] → 圧縮/展開ロジックの後方互換性を確認
  - [ ] → `franchise-register` フロントエンドへの影響を評価

- [ ] **MerchantSystem.js を変更した？**
  - [ ] → `franchise-dashboard` (加盟店ポータル) への影響を確認
  - [ ] → `first-login.html` (初回ログイン) への影響を確認
  - [ ] → CompanyInfoManager.js との整合性を確認
  - [ ] → 認証ロジック変更の場合、セキュリティレビュー実施

- [ ] **AdminSystem.js を変更した？**
  - [ ] → `admin-dashboard` への影響を確認
  - [ ] → Slack通知（SlackApprovalSystem）への影響を確認
  - [ ] → ステータス管理ロジックの変更有無を確認

- [ ] **main.js / SystemRouter を変更した？**
  - [ ] → 全システムへのルーティングが正常に機能するか確認
  - [ ] → 新規アクションの場合、SystemRouter.routes に登録済みか確認
  - [ ] → doGet / doPost の変更がすべてのフロントエンドに影響しないか確認

### データ構造変更のチェック
- [ ] **Script Properties を変更した？**
  - [ ] → すべてのシステムへの影響を確認（全システムがPropertiesに依存）
  - [ ] → 本番環境のScript Propertiesも更新予定か確認
  - [ ] → バックアップを取得済みか確認

- [ ] **Spreadsheetの列構造を変更した？**
  - [ ] → FranchiseSystem / MerchantSystem / AdminSystem すべてに影響
  - [ ] → DataLayer.COLUMN_MAP を更新済みか確認（実装予定）
  - [ ] → 既存データとの互換性を確認

- [ ] **圧縮/展開ロジックを変更した？**
  - [ ] → 既存の圧縮データが正常に展開できるか確認
  - [ ] → 後方互換性テストを実施済みか確認

---

## 🧪 テスト実行

### 必須テスト
- [ ] **統合テストを実行**
  ```bash
  cd franchise-register/gas
  bash test-all-systems.sh
  ```
  - [ ] すべてのテストがPASSしたか確認
  - [ ] 警告がある場合、影響範囲を評価済みか確認

### 個別システムテスト（該当システムを変更した場合）
- [ ] **FranchiseSystemのテスト**
  - [ ] 登録フローの動作確認（フォーム送信 → Spreadsheet書き込み）
  - [ ] Slack通知の送信確認

- [ ] **MerchantSystemのテスト**
  - [ ] 初回ログインURL検証の動作確認
  - [ ] パスワード設定の動作確認
  - [ ] ログイン認証の動作確認
  - [ ] 会社情報取得の動作確認

- [ ] **AdminSystemのテスト**
  - [ ] 登録申請一覧の取得確認
  - [ ] 承認/却下処理の動作確認
  - [ ] 加盟店データ更新の動作確認

---

## 📦 デプロイ準備

### バックアップ
- [ ] **現行バージョンのバックアップを作成**
  ```bash
  cd ~/
  bash simple-backup.sh
  # または
  tar -czf gas-backup-$(date +%Y%m%d_%H%M%S).tar.gz franchise-register/gas/
  ```

### デプロイ設定確認
- [ ] **.clasp.json が正しいプロジェクトを指している**
  ```bash
  cat franchise-register/gas/.clasp.json
  ```

- [ ] **.claspignore が適切に設定されている**
  - [ ] テストファイルが除外されているか確認
  - [ ] バックアップファイルが除外されているか確認
  - [ ] ログファイルが除外されているか確認

### 環境変数確認（該当する場合）
- [ ] **env-loader.js を更新した？**
  - [ ] すべてのenv-loader.jsを同期済みか確認
    - [ ] `franchise-register/dist/js/env-loader.js`
    - [ ] `franchise-dashboard/dist/merchant-portal/env-loader.js`
    - [ ] `admin-dashboard/dist/js/env-loader.js`
  - [ ] 新しいデプロイメントURLを反映済みか確認

---

## 🚀 デプロイ実行

### デプロイ手順
1. [ ] **コードをプッシュ**
   ```bash
   cd franchise-register/gas
   clasp push
   ```

2. [ ] **新しいバージョンをデプロイ**
   ```bash
   clasp deploy -d "V1XXX: [変更内容の簡潔な説明]"
   ```
   - [ ] バージョン番号を記録: `V______`
   - [ ] デプロイメントIDを記録: `____________`

3. [ ] **env-loader.js を更新（新デプロイメントの場合）**
   ```bash
   # 最新のデプロイメントIDを確認
   clasp deployments

   # env-loader.jsのGAS_URLを更新
   # 全システムで同期
   cd ~/
   node update-all-env-loaders-vXXXX.js
   ```

---

## ✅ デプロイ後確認

### 動作確認（本番環境）
- [ ] **ヘルスチェック**
  - [ ] API動作確認: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=health&callback=test`
  - [ ] 正常なレスポンスが返るか確認

- [ ] **各システムの動作確認**
  - [ ] 登録フォームからの送信テスト（FranchiseSystem）
  - [ ] 管理ダッシュボードのログイン（AdminSystem）
  - [ ] 加盟店ポータルのログイン（MerchantSystem）

### ロールバック準備
- [ ] **問題発生時のロールバック手順を確認**
  1. 前のデプロイメントIDを特定
     ```bash
     clasp deployments
     ```
  2. env-loader.jsを前のIDに戻す
  3. 必要に応じてScript Propertiesを復元

---

## 📝 デプロイ記録

### 変更内容メモ
```
バージョン: V______
デプロイ日時: ________年___月___日 __:__
デプロイメントID: AKfycb____________

【変更内容】
-

【影響範囲】
-

【テスト結果】
- 統合テスト: PASS / FAIL
- 個別テスト: PASS / FAIL

【備考】
-
```

---

## 🆘 トラブルシューティング

### よくある問題

#### デプロイ後にエラーが発生
1. ログを確認
   ```bash
   clasp logs
   ```
2. エラー内容を特定
3. 必要に応じてロールバック

#### env-loader.jsが反映されない
1. ブラウザキャッシュをクリア
2. CDNキャッシュが有効な場合はパージ
3. URLパラメータでキャッシュバスト: `?v=TIMESTAMP`

#### Script Propertiesが見つからない
1. GASエディタでScript Propertiesを確認
2. `check-properties.js` を実行して診断
   ```bash
   node franchise-register/gas/check-properties.js
   ```

---

## 📚 参考資料

- システム依存関係図: `ARCHITECTURE.md`
- 自動デプロイガイド: `AUTO_MODE.md`
- クイックスタート: `QUICK_START.md`

---

**✨ デプロイ成功を祈ります！**
