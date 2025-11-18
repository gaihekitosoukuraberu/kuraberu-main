# Claude Code ワークフロー完全ガイド

**最終更新**: 2025-11-18
**最新GASデプロイ**: @1685 (AKfycbzSymyPnl_wTagTs_dIzdbtB1XnvyI389_yv3BLxXcF4vGFSvUHt3QLq4gUHOuwGpEsaA)

このドキュメントは、Claude Codeが**セッション開始時に必ず読む**べき、完全なワークフローガイドです。

---

## 🚨 最重要ルール：git pull 絶対禁止

### ❌ 絶対にやってはいけないこと

```bash
git pull  # 絶対に実行するな！
```

### 理由

- **ローカルが最新**の可能性がある（Cyberduckで直接アップロード済み）
- **GitHubが古い**可能性がある（pushしていない）
- **過去に数十時間の損失**を引き起こした実績がある

### git status で "behind" と表示されたら

```bash
# ❌ 間違った対応
git pull  # これはダメ！

# ✅ 正しい対応
1. ローカルの最終更新日時を確認
   git log -1 --format="%ci" HEAD

2. ユーザーに確認を取る
   「GitHubの方が新しいようですが、pullしますか？」

3. ユーザーのOKが出てから初めて git pull
```

---

## 📋 バックエンド（GAS）編集の完全フロー

### 手順

```bash
# 1. ローカルファイル編集
# franchise-register/gas/ 内のファイルを編集

# 2. GASにコードをアップロード
cd /Users/ryuryu/projects/kuraberu-main/franchise-register/gas
clasp push --force

# 3. 新しいデプロイメントを作成
clasp deploy -d "V1XXX: 修正内容の簡潔な説明"
# → デプロイメントIDが出力される（例：AKfycbzSymy...）

# 4. デプロイメントIDをコピー（重要！）

# 5. プロジェクトルートに戻る
cd /Users/ryuryu/projects/kuraberu-main

# 6. 全env-loader.jsを最新GAS URLに更新
node sync-all-env-loaders.js <DEPLOYMENT_ID>
# → 8ファイル更新される：
#   - admin-dashboard/js/env-loader.js
#   - franchise-register/js/env-loader.js
#   - franchise-dashboard/merchant-portal/env-loader.js
#   - estimate-keep-system/js/env-loader.js
#   - lp/js/env-loader.js
#   - lp/js/cv-api.js
#   - lp/js/utils.js
#   - lp/mail.php

# 7. GitHubに保存
git add -A
git commit -m "V1XXX: 修正内容 - GAS URL更新"
git push origin main

# 8. GitHub Actionsが自動実行（待つだけ）
# → frontend-deploy.yml が発火
# → 全フロントエンドがXserverにFTPデプロイ
```

### 所要時間

約5-8分（GitHub Actions完了まで）

---

## 📋 フロントエンド編集の完全フロー

### 手順

```bash
# 1. ローカルファイル編集
# admin-dashboard/, lp/, estimate-keep-system/, franchise-dashboard/ など

# 2. GitHubに保存
git add -A
git commit -m "修正内容の簡潔な説明"
git push origin main

# 3. GitHub Actionsが自動実行（待つだけ）
# → frontend-deploy.yml が発火
# → 変更されたシステムのみXserverにFTPデプロイ
```

### 注意

**env-loader.js更新は不要**です。フロント編集時にenv-loader.jsを触るのは、GASデプロイ時のみ。

### 所要時間

約3-5分（GitHub Actions完了まで）

---

## 🔄 自動化されていること

### 15分おきの自動保存（auto-save.sh）

```bash
# Cron設定
*/15 * * * * /Users/ryuryu/projects/kuraberu-main/auto-save.sh

# 動作
1. 変更があるかチェック（git diff）
2. 変更がある場合のみ：
   - git add -A
   - git commit -m "auto-save: ..."
   - git push origin main
3. 変更がなければ何もしない
```

**保存先**: GitHub（https://github.com/gaihekitosoukuraberu/kuraberu-main）

**制限**: ProプランなのでGitHub Actions 3,000分/年（実際の使用は240分/年）

### GitHub Actions自動デプロイ

#### 1. gas-cicd.yml（GAS CI/CD Pipeline）

**トリガー**: `franchise-register/gas/**` の変更

**処理フロー**:
```
1. Run Tests（構文チェック）
2. clasp push & deploy（GASデプロイ）
3. Health Check（success:true確認）
4. Sync env-loader.js（全8ファイル更新）
5. git commit & push（自動）
6. [失敗時] Rollback（前バージョンに復元）
```

#### 2. frontend-deploy.yml（Frontend Auto-Deploy）

**トリガー**: 各システムディレクトリの変更

**処理フロー**:
```
1. Admin Dashboard → Xserver FTP
2. Franchise Dashboard → Xserver FTP
3. Franchise Register → Xserver FTP
4. Estimate Keep System → Xserver FTP
5. LP → Xserver FTP
```

---

## 📁 重要なファイル・ディレクトリ

```
/Users/ryuryu/projects/kuraberu-main/
├── franchise-register/gas/        ← GASバックエンド（全システムのAPI）
│   ├── main.js                   ← エントリーポイント・SystemRouter
│   ├── systems/
│   │   ├── cv/CVSheetSystem.js   ← CV管理
│   │   ├── admin/AdminSystem.js  ← 管理ダッシュボード
│   │   └── merchant/MerchantSystem.js ← 加盟店ポータル
│   └── .clasp.json               ← GAS設定
│
├── admin-dashboard/              ← 管理画面フロント
├── lp/                          ← LPフロント
├── franchise-dashboard/         ← 加盟店ダッシュボードフロント
├── estimate-keep-system/        ← 見積もりシステムフロント
│
├── sync-all-env-loaders.js      ← env-loader.js一括更新スクリプト
├── auto-save.sh                 ← 15分おき自動保存スクリプト
│
└── .github/
    ├── workflows/
    │   ├── gas-cicd.yml         ← GAS自動デプロイ
    │   └── frontend-deploy.yml  ← フロント自動デプロイ
    └── CLAUDE_WORKFLOW.md       ← このファイル
```

---

## 🎯 Claude Codeが守るべき原則

### 1. git pull禁止

`git status` で "behind" と表示されても、**ユーザー確認なしでpullしない**

### 2. バックエンド編集時の完全フロー厳守

```bash
1. ローカル編集
2. clasp push --force
3. clasp deploy -d "..."
4. node sync-all-env-loaders.js <ID>
5. git add -A && git commit && git push
```

**このフロー全体を必ず実行**すること。途中で止めない。

### 3. フロント編集時の完全フロー厳守

```bash
1. ローカル編集
2. git add -A && git commit && git push
```

env-loader.js更新は**不要**。

### 4. GitHub Actionsを信頼

git push後は、GitHub Actionsが自動的に全てデプロイする。手動FTPアップロードは不要。

### 5. デプロイ成功確認

GitHub Actions完了まで待つ（約5分）。エラーがないか確認。

---

## 🚨 緊急時対応

### GitHub Actions失敗時

1. https://github.com/gaihekitosoukuraberu/kuraberu-main/actions を確認
2. エラーログを読む
3. 必要に応じてRe-run（ユーザーに確認）

### ロールバックが必要な場合

```bash
cd franchise-register/gas
clasp deployments  # 前のバージョンID確認
# → gas-cicd.yml が自動ロールバック済みのはず
```

### env-loader.jsが古い場合

```bash
# 最新のデプロイメントIDを確認
cd franchise-register/gas
clasp deployments | head -3

# 手動同期
cd /Users/ryuryu/projects/kuraberu-main
node sync-all-env-loaders.js <最新のDEPLOYMENT_ID>
git add -A
git commit -m "fix: env-loader.js手動同期"
git push origin main
```

---

## 📊 システム構成図

```
┌─────────────────────────────────────────────┐
│  ローカル（Mac）                              │
│  /Users/ryuryu/projects/kuraberu-main/      │
│                                             │
│  ├─ admin-dashboard/        (フロント)      │
│  ├─ lp/                     (フロント)      │
│  ├─ franchise-register/gas/ (GASコード)     │
│  └─ sync-all-env-loaders.js (同期スクリプト) │
└─────────────────────────────────────────────┘
          │                        │
          │ git push              │ clasp push & deploy
          ↓                        ↓
┌──────────────────┐    ┌──────────────────────┐
│   GitHub         │    │  Google Apps Script  │
│  (コード保管)     │    │  (バックエンドAPI)    │
└──────────────────┘    └──────────────────────┘
          │                        │
          │ GitHub Actions         │ JSONP API呼び出し
          ↓                        ↓
┌─────────────────────────────────────────────┐
│  Xserver FTP                                │
│  gaihekikuraberu.com/public_html/           │
│                                             │
│  ├─ admin-dashboard/  (フロント本番)         │
│  ├─ lp/              (フロント本番)          │
│  └─ env-loader.js    (GAS URLを参照)        │
└─────────────────────────────────────────────┘
```

**重要**: GitHubとGASは**完全に独立**しており、直接通信しない

---

## 🤖 セッション開始時のチェックリスト

Claudeがセッション開始時に実行すべきこと：

```bash
# 1. このファイルを読む
cat .github/CLAUDE_WORKFLOW.md

# 2. 現在のブランチ確認
git branch

# 3. 最新コミット確認
git log --oneline -5

# 4. 変更状況確認
git status

# 5. 最新GASデプロイ確認
cd franchise-register/gas && clasp deployments | head -3
```

---

## 📝 最新情報

### 最新GASデプロイ

- **デプロイID**: AKfycbzSymyPnl_wTagTs_dIzdbtB1XnvyI389_yv3BLxXcF4vGFSvUHt3QLq4gUHOuwGpEsaA
- **バージョン**: @1685
- **デプロイ日時**: 2025-11-18 10:37 JST
- **内容**: 物件情報マッピング修正 - addressKana対応

### 本番URL

- **Admin**: https://gaihekikuraberu.com/admin-dashboard/
- **Franchise Dashboard**: https://gaihekikuraberu.com/franchise-dashboard/
- **Register**: https://gaihekikuraberu.com/franchise-register/
- **Estimate**: https://gaihekikuraberu.com/estimate-keep-system/
- **LP**: https://gaihekikuraberu.com/lp/

---

**🎯 このファイルを読んだら、Claudeは完璧にワークフローを理解できている**
