# 🚀 クイックスタートガイド

**自動化された安全な開発環境**

---

## 📋 今すぐ使えるコマンド

### テスト実行

```bash
# 統合テスト（全システム動作確認）
npm run test

# 特定システムのテスト（今後実装予定）
npm run test:merchant
npm run test:admin
npm run test:franchise
npm run test:ai
```

### 変更影響チェック

```bash
# 特定ファイルの影響範囲を確認
npm run check:impact FranchiseSystem.js

# Git diffから自動検知
npm run check:impact:git
```

### デプロイ

```bash
# 安全なデプロイ（自動化）
npm run deploy

# 内部動作:
# 1. バックアップ作成
# 2. 統合テスト実行
# 3. 変更影響チェック
# 4. clasp push
# 5. 新デプロイメント作成
# 6. 全env-loader.js更新
# 7. FTPアップロード
```

### 手動デプロイ

```bash
# GASコードのみpush
npm run push

# 強制push（競合時）
npm run push:force

# バックアップ作成
npm run backup
```

### ドキュメント

```bash
# アーキテクチャ設計書を開く
npm run docs
```

---

## 🛡️ 自動検知される問題

### Gitコミット時

```bash
git add .
git commit -m "FranchiseSystem修正"
  ↓
🔍 変更影響チェック自動実行
  ↓
⚠️  高影響度の変更を検出
  ↓
- MerchantSystem.jsへの影響あり
- 統合テスト実行を推奨
  ↓
commit拒否（--no-verifyで強制可能）
```

### デプロイ時

```bash
npm run deploy
  ↓
1. バックアップ作成 ✅
2. 統合テスト実行
  ↓
❌ MerchantSystem: データ読み取りエラー
  ↓
デプロイ中止
  ↓
ロールバック方法を表示
```

---

## 📂 ファイル構成

```
franchise-register/
├── gas/
│   ├── ARCHITECTURE.md          ← システム設計書
│   ├── QUICK_START.md           ← このファイル
│   │
│   ├── main.js                  ← エントリーポイント
│   │
│   ├── systems/
│   │   ├── franchise/FranchiseSystem.js
│   │   ├── merchant/MerchantSystem.js
│   │   ├── admin/AdminSystem.js
│   │   └── ai/AISearchSystem.gs
│   │
│   ├── shared/
│   │   └── DataLayer.js         ← 統一データアクセス層
│   │
│   ├── tests/
│   │   └── integration-test.js  ← 統合テスト
│   │
│   └── scripts/
│       ├── check-impact.js      ← 変更影響検知
│       └── deploy-safe.js       ← 安全なデプロイ
│
├── .git-hooks/
│   └── pre-commit               ← Git自動チェック
│
└── package.json                 ← npmスクリプト定義
```

---

## 🔧 初回セットアップ

### 1. npm scriptsを有効化

```bash
cd /Users/ryuryu/franchise-register
npm install  # 必要に応じて
```

### 2. Git hooksが有効か確認

```bash
git config core.hooksPath
# 出力: .git-hooks
```

出力がない場合:
```bash
git config core.hooksPath .git-hooks
```

### 3. 統合テストを実行

```bash
npm run test
```

---

## 📖 使用例

### 例1: FranchiseSystem.jsを修正

```bash
# 1. 修正前にバックアップ
npm run backup

# 2. FranchiseSystem.jsを編集
vim gas/systems/franchise/FranchiseSystem.js

# 3. 影響範囲を確認
npm run check:impact FranchiseSystem.js

# 出力:
# ⚠️  影響を受けるシステム:
#   - MerchantSystem.js（データ読み取り）
#   - AdminSystem.js（管理機能）
#
# ✅ 必須テスト:
#   npm run test:integration
#   npm run test:merchant

# 4. テスト実行
npm run test

# 5. Gitコミット
git add gas/systems/franchise/FranchiseSystem.js
git commit -m "Fix: 支店住所フィルタリング追加"
  ↓
# 自動で変更影響チェック実行
  ↓
# 問題なければcommit成功

# 6. デプロイ
npm run deploy
  ↓
# 自動でバックアップ・テスト・デプロイ実行
```

### 例2: 緊急修正（テストスキップ）

```bash
# 修正
vim gas/systems/merchant/MerchantSystem.js

# テストスキップしてcommit
git add .
git commit --no-verify -m "Hotfix: 認証エラー修正"

# 手動でpush（デプロイスクリプト使わない）
npm run push:force

# 手動で新デプロイメント作成
cd gas && clasp deploy --description "Hotfix"
```

### 例3: ロールバック

```bash
# 最新のバックアップを確認
ls -lt /Users/ryuryu/gas-backup-*.tar.gz | head -1

# ロールバック実行
tar -xzf /Users/ryuryu/gas-backup-20251031_142529.tar.gz -C /Users/ryuryu/franchise-register/

# GASに反映
npm run push:force

# 新デプロイメント作成
cd gas && clasp deploy --description "Rollback"
```

---

## ⚠️ 注意事項

### DO（推奨）

✅ **必ず統合テストを実行**
```bash
npm run test
```

✅ **変更影響を確認**
```bash
npm run check:impact:git
```

✅ **自動デプロイを使用**
```bash
npm run deploy
```

✅ **DataLayerを経由**
```javascript
const data = DataLayer.getMerchantData(merchantId);
DataLayer.updateField(merchantId, 'companyName', '新社名');
```

### DON'T（非推奨）

❌ **テストなしでデプロイ**
```bash
clasp push  # 統合テストをスキップ
```

❌ **直接Spreadsheetアクセス**
```javascript
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);  // 非推奨
```

❌ **env-loader.js手動更新**
```bash
vim env-loader.js  # 更新漏れの原因
```

---

## 🚨 トラブルシューティング

### 問題: テストが失敗する

```bash
# 詳細ログを確認
npm run test 2>&1 | tee test-log.txt

# 特定システムのみテスト
# （今後実装予定）
```

### 問題: デプロイ後に動作しない

```bash
# 1. ロールバック
tar -xzf /Users/ryuryu/gas-backup-*.tar.gz -C /Users/ryuryu/franchise-register/
npm run push:force

# 2. ブラウザキャッシュクリア
# Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

# 3. env-loader.jsの同期確認
npm run check:impact env-loader.js
```

### 問題: Git hooksが動作しない

```bash
# 設定確認
git config core.hooksPath

# 再設定
git config core.hooksPath .git-hooks
chmod +x .git-hooks/pre-commit
```

---

## 📞 サポート

**ドキュメント**:
- [gas/ARCHITECTURE.md](ARCHITECTURE.md) - システム設計書

**バックアップ場所**:
- `/Users/ryuryu/gas-backup-*.tar.gz`

**ログ確認**:
```bash
# GASログ
cd gas && clasp logs

# 統合テストログ
npm run test 2>&1 | tee test-log.txt
```

---

## 🎯 次のステップ

1. ✅ npm scriptを試す: `npm run test`
2. ✅ 変更影響チェックを試す: `npm run check:impact:git`
3. ✅ 安全なデプロイを試す: `npm run deploy`
4. ✅ ARCHITECTURE.mdを読む: `npm run docs`

---

**最終更新**: 2025-10-31
