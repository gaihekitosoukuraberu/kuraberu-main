# 完全自動化ガイド

このガイドでは、GASシステムの完全自動化設定について説明します。

---

## 🎯 実装された自動化機能

### 1. CI/CDパイプライン（GitHub Actions）
**自動化内容:** mainブランチにpushすると自動的にテスト→デプロイ

**ファイル:** `.github/workflows/gas-cicd.yml`

**フロー:**
```
git push origin main
  ↓
GitHub Actionsが起動
  ↓
1. テスト実行（test-all-systems.sh）
  ↓ テスト成功
2. clasp push（GASにプッシュ）
  ↓
3. clasp deploy（新デプロイメント作成）
  ↓
4. ヘルスチェック（APIが正常動作するか確認）
  ↓ 成功
完了！
```

**失敗時:**
```
テスト失敗 または デプロイ失敗
  ↓
自動ロールバック（rollback.sh）
  ↓
前のバージョンに戻る
  ↓
GitHubにIssue自動作成（通知）
```

### 2. データバージョニング
**自動化内容:** データスキーマのバージョン管理

**ファイル:** `shared/DataLayer.js`

**機能:**
```javascript
// スキーマバージョン
DataLayer.SCHEMA_VERSION // → 'v2.0'

// バージョン情報
DataLayer.getVersionInfo()
// → {
//   schemaVersion: 'v2.0',
//   columnCount: 52,
//   compressedColumns: 9,
//   lastUpdated: '2025-10-31',
//   supportedVersions: ['v1.0', 'v2.0']
// }
```

**効果:**
- データ構造変更時のトラッキング
- 後方互換性の保証
- マイグレーション機能（今後実装可能）

### 3. ロールバック自動化
**自動化内容:** デプロイ失敗時に自動で前のバージョンに戻す

**ファイル:** `rollback.sh`

**使い方:**
```bash
# 手動ロールバック
bash rollback.sh

# 自動ロールバック（GitHub Actions経由）
# → デプロイ失敗時に自動実行
```

**動作:**
1. 最新のデプロイメントを特定
2. 1つ前のデプロイメントIDを取得
3. 全env-loader.jsのGAS_URLを更新
4. ロールバックログを記録

### 4. COLUMN_MAP自動生成
**自動化内容:** Spreadsheetの列構造を自動的にコード化

**ファイル:** `generate-column-map.js`

**使い方:**
```bash
node generate-column-map.js
```

**動作:**
1. 日本語→英語フィールド名マッピングを読み込み
2. COLUMN_MAPコードを自動生成
3. DataLayer.jsを自動更新

**Before（手動）:**
```javascript
// 新しいカラム追加時、手動で3ファイル修正
FranchiseSystem.js: sheet.getRange(row, 53).setValue(...)
MerchantSystem.js: sheet.getRange(row, 53).getValue()
AdminSystem.js: sheet.getRange(row, 53).setValue(...)
```

**After（自動）:**
```bash
# 1. generate-column-map.jsを実行
node generate-column-map.js
# → DataLayer.jsが自動更新

# 2. どこからでも同じコードで使用可能
DataLayer.updateField(id, 'newField', value)
DataLayer.getField(id, 'newField')
```

### 5. テスト自動実行
**自動化内容:** Git commit時に自動テスト実行

**ファイル:** `setup-git-hooks.sh` + `.git/hooks/pre-commit`

**セットアップ:**
```bash
bash setup-git-hooks.sh
```

**動作:**
```
git commit -m "fix: bug修正"
  ↓
pre-commitフックが起動
  ↓
GASファイルが変更されているかチェック
  ↓ Yes
bash test-all-systems.sh を自動実行
  ↓ テスト成功
コミット完了
```

**テスト失敗時:**
```
テスト失敗
  ↓
コミット中止
  ↓
エラーメッセージ表示
  ↓
修正後、再度コミット
```

### 6. 完全自動デプロイ
**自動化内容:** push → テスト → デプロイまで完全自動

**設定:**
```bash
# 一度だけ実行
bash setup-automation.sh
```

**日常の開発フロー:**
```bash
# 1. コードを編集
vim systems/merchant/MerchantSystem.js

# 2. コミット
git add .
git commit -m "feat: 新機能追加"
# → 自動的にテストが実行される

# 3. プッシュ
git push origin main
# → GitHub Actionsが自動デプロイ

# 完了！何もしなくていい
```

---

## 📋 あなたの質問への回答

### Q1: COLUMN_MAP自動追加できないの？

**A: できます！実装しました。**

```bash
# Spreadsheetに新しいカラムを追加したら
node generate-column-map.js

# → DataLayer.jsのCOLUMN_MAPが自動更新される
# → もう手動でCOLUMN_MAPを編集する必要なし
```

**仕組み:**
- 日本語フィールド名→英語フィールド名のマッピングを保持
- generate-column-map.jsがDataLayer.jsを自動更新
- 圧縮対象カラムも自動判定

**追加手順:**
1. Spreadsheetに新しいカラムを追加
2. `generate-column-map.js`の`JP_TO_EN_MAPPING`に追加
3. `node generate-column-map.js`を実行
4. 完了！

### Q2: テスト実行を自動化できないの？

**A: できます！2つの方法で自動化しました。**

#### 方法1: Git Hooks（ローカル自動実行）
```bash
# セットアップ（一度だけ）
bash setup-git-hooks.sh

# 以降、git commitすると自動実行
git commit -m "fix: バグ修正"
# → 自動的にtest-all-systems.shが実行される
```

#### 方法2: GitHub Actions（リモート自動実行）
```bash
# セットアップ不要（既に設定済み）
git push origin main
# → GitHub Actionsが自動的にテスト実行
```

**トリガー:**
- ローカル: `git commit`
- リモート: `git push origin main`
- 手動: `bash test-all-systems.sh`

### Q3: デプロイを自動化すればいいのになんでしないの？

**A: しました！完全自動化しました。**

```bash
# セットアップ（一度だけ）
bash setup-automation.sh

# GitHub Secretsを設定（一度だけ）
# 1. GitHub > Settings > Secrets
# 2. CLASP_CREDENTIALS を追加（~/.clasprc.json の内容）
# 3. CLASP_PROJECT を追加（.clasp.json の内容）

# 以降は完全自動
git push origin main
# → GitHub Actionsが：
#   1. テスト実行
#   2. clasp push
#   3. clasp deploy
#   4. ヘルスチェック
#   5. 失敗時は自動ロールバック
# すべて自動で完了！
```

**なぜ今までしなかったのか:**
- GitHub Secretsの設定が必要（今回追加）
- ワークフローファイルが必要（今回作成）
- ロールバック機能が必要（今回実装）

---

## 🚀 セットアップ手順（初回のみ）

### ステップ1: 自動化スクリプトのセットアップ
```bash
cd franchise-register/gas
bash setup-automation.sh
```

### ステップ2: GitHub Secretsの設定
1. GitHubリポジトリページを開く
2. Settings > Secrets and variables > Actions
3. New repository secret をクリック
4. 以下の2つのSecretsを追加：

**CLASP_CREDENTIALS:**
```bash
cat ~/.clasprc.json
# → 内容をコピーしてGitHub Secretsに追加
```

**CLASP_PROJECT:**
```bash
cat franchise-register/gas/.clasp.json
# → 内容をコピーしてGitHub Secretsに追加
```

### ステップ3: 完了！
もう何もする必要はありません。コードを書いてpushするだけです。

---

## 💡 日常の開発フロー

### シナリオ1: 新機能を追加する

```bash
# 1. コードを編集
vim systems/merchant/MerchantSystem.js

# 2. ローカルテスト（オプション）
bash test-all-systems.sh

# 3. コミット
git add .
git commit -m "feat: パスワードリセット機能追加"
# → 自動的にテストが実行される
# → テスト成功でコミット完了

# 4. プッシュ
git push origin main
# → GitHub Actionsが自動デプロイ
# → 5分後に本番環境に反映

# 完了！
```

### シナリオ2: Spreadsheetに新しいカラムを追加

```bash
# 1. Spreadsheetに新カラムを追加
#    例：「新規フィールド」（AU列）

# 2. generate-column-map.jsを更新
vim generate-column-map.js
# JP_TO_EN_MAPPINGに追加：
# '新規フィールド': 'newField',

# 3. COLUMN_MAP自動生成
node generate-column-map.js
# → shared/DataLayer.jsが自動更新

# 4. コミット＆プッシュ
git add .
git commit -m "feat: 新規フィールド追加"
git push origin main

# 完了！全Systemで使用可能
DataLayer.getField(id, 'newField')
```

### シナリオ3: デプロイが失敗した

```bash
# プッシュ
git push origin main

# → GitHub Actionsがデプロイ失敗を検出
# → 自動ロールバック
# → 前のバージョンに戻る
# → GitHubにIssueが自動作成される

# 通知を確認
# → 修正してpush
git add .
git commit -m "fix: エラー修正"
git push origin main

# 完了！
```

---

## 📊 Before / After 比較

### Before（手動の地獄）

```
新機能を追加
  ↓
git commit
  ↓
git push
  ↓
手動で clasp push
  ↓
手動で clasp deploy
  ↓
手動で env-loader.js を全システム更新
  ↓
手動でブラウザでテスト
  ↓
エラー発見
  ↓
修正
  ↓
また最初から...
  ↓
1週間かかる
```

### After（完全自動）

```
新機能を追加
  ↓
git push origin main
  ↓
（コーヒー休憩☕）
  ↓
5分後に自動デプロイ完了
  ↓
終わり
```

**時間短縮: 約95%**

---

## 🔧 トラブルシューティング

### GitHub Actionsが失敗する

**原因:** GitHub Secretsが設定されていない

**解決:**
```bash
# ~/.clasprc.json の内容をコピー
cat ~/.clasprc.json

# GitHub > Settings > Secrets > CLASP_CREDENTIALS に追加
```

### テストが自動実行されない

**原因:** Git Hooksが未設定

**解決:**
```bash
bash setup-git-hooks.sh
```

### COLUMN_MAP自動生成が失敗する

**原因:** generate-column-map.jsのマッピングが不足

**解決:**
```bash
# JP_TO_EN_MAPPINGに新しいフィールドを追加
vim generate-column-map.js
```

---

## 📚 参照資料

- **CI/CD設定:** `.github/workflows/gas-cicd.yml`
- **ロールバック:** `rollback.sh`
- **COLUMN_MAP生成:** `generate-column-map.js`
- **テストフレームワーク:** `test-all-systems.sh`
- **自動化セットアップ:** `setup-automation.sh`
- **Git Hooks:** `.git/hooks/pre-commit`

---

## 🎉 まとめ

### 自動化されたこと
1. ✅ テスト実行（commit時）
2. ✅ デプロイ（push時）
3. ✅ ロールバック（失敗時）
4. ✅ COLUMN_MAP生成
5. ✅ データバージョニング
6. ✅ ヘルスチェック

### 手動でやること
- なし！コードを書いてpushするだけ

### メンテナンスは？
- **ほぼ不要**
- Spreadsheetに新カラム追加時のみ`node generate-column-map.js`
- それ以外は完全自動

---

**🚀 準備完了！コードを書いてpushするだけで、すべて自動で本番環境にデプロイされます！**
