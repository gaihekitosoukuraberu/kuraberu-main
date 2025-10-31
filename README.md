# 外壁塗装くらべるAI - 本体GASバックエンド

**外壁塗装くらべるAI**の統合バックエンド＆フロントエンドシステム

---

## 🎯 プロジェクト概要

外壁塗装業者のマッチングプラットフォーム「くらべるAI」の完全統合システム。
Google Apps Script（GAS）をバックエンドとし、4つのフロントエンドシステムが連携して動作。

### 主要機能
- 🤖 **AI検索** - DeepSeekを使った企業情報自動抽出
- 📝 **加盟店登録** - フォーム＆データ管理
- 📊 **管理ダッシュボード** - 案件管理・承認フロー
- 🏢 **加盟店ポータル** - 企業情報管理・HP生成

---

## 🏗 システム構成

### バックエンド：Google Apps Script

**場所**: `franchise-register/gas/`

| ファイル | 役割 |
|---------|------|
| `main.js` | メインエントリーポイント・SystemRouter |
| `systems/ai/AISearchSystem.gs` | AI企業情報検索（DeepSeek） |
| `systems/franchise/FranchiseSystem.js` | 加盟店登録処理 |
| `systems/admin/AdminSystem.js` | 管理ダッシュボードAPI |
| `systems/merchant/MerchantSystem.js` | 加盟店ポータルAPI |

**デプロイ**: GitHub Actions完全自動化（push → テスト → デプロイ → ロールバック可能）

### フロントエンド：4つのシステム

| システム | パス | 本番URL | 説明 |
|---------|------|---------|------|
| **Admin Dashboard** | `admin-dashboard/dist/` | https://gaihekikuraberu.com/admin-dashboard/ | 管理者用ダッシュボード |
| **Franchise Dashboard** | `franchise-dashboard/dist/` | https://gaihekikuraberu.com/franchise-dashboard/ | 加盟店管理システム |
| **Franchise Register** | `franchise-register/dist/` | https://gaihekikuraberu.com/franchise-register/ | 加盟店新規登録フォーム |
| **Estimate Keep System** | `estimate-keep-system/dist/` | https://gaihekikuraberu.com/estimate-keep-system/ | 見積もり管理 |

**デプロイ**: GitHub Actions → Xserver FTP自動アップロード

---

## 🚀 完全自動化フロー

### 1. GAS更新時

```
開発者: GASコード編集 & git push
  ↓
GitHub Actions: GAS CI/CD Pipeline
  1. 構文チェック（全.jsファイル）
  2. GASデプロイ（clasp push & deploy）
  3. ヘルスチェック（success:true確認）
  4. 全env-loader.js自動更新（URL同期）
  5. 自動commit & push
  ↓
GitHub Actions: Frontend Auto-Deploy（自動トリガー）
  6. 全4システム自動FTPアップロード
  ↓
完了！本番サイト更新
```

### 2. フロントエンド更新時

```
開発者: HTMLファイル編集 & git push
  ↓
GitHub Actions: Frontend Auto-Deploy
  1. 変更されたシステムを検出
  2. Xserver FTP自動アップロード
  ↓
完了！本番サイト更新
```

---

## 🤖 GitHub Actions（完全自動化）

### ワークフロー1: `gas-cicd.yml`

**トリガー**: `franchise-register/gas/**` の変更

**処理内容**:
- ✅ Run Tests（JavaScript構文チェック）
- ✅ Deploy to GAS（clasp push & deploy）
- ✅ Health Check（API動作確認）
- ✅ Sync env-loader.js（全システムURL同期）
- ✅ Rollback on Failure（失敗時自動復元）

### ワークフロー2: `frontend-deploy.yml`

**トリガー**: 各システムディレクトリの変更

**処理内容**:
- ✅ Admin Dashboard → FTP
- ✅ Franchise Dashboard → FTP
- ✅ Franchise Register → FTP
- ✅ Estimate Keep System → FTP

---

## 📁 ディレクトリ構造

```
kuraberu-main/
├── .github/workflows/          ← GitHub Actions（自動化）
│   ├── gas-cicd.yml           ← GAS CI/CD Pipeline
│   └── frontend-deploy.yml    ← Frontend Auto-Deploy
│
├── franchise-register/gas/     ← GASバックエンド ⭐重要
│   ├── main.js                ← メインエントリーポイント
│   ├── systems/
│   │   ├── ai/AISearchSystem.gs           ← AI検索
│   │   ├── franchise/FranchiseSystem.js   ← 加盟店登録
│   │   ├── admin/AdminSystem.js           ← 管理ダッシュボード
│   │   └── merchant/MerchantSystem.js     ← 加盟店ポータル
│   ├── .clasp.json            ← GAS設定
│   └── .claspignore           ← デプロイ除外ファイル
│
├── admin-dashboard/dist/       ← 管理画面（本番）
├── franchise-dashboard/dist/   ← 加盟店ダッシュボード（本番）
├── franchise-register/dist/    ← 加盟店登録（本番）
├── estimate-keep-system/dist/  ← 見積もりシステム（本番）
│
├── shared/                     ← 共通ファイル
│   └── env-loader.js          ← GAS URL マスター
│
├── sync-all-env-loaders.js     ← env-loader.js自動同期スクリプト
├── CURRENT_STATUS.md           ← システム現在状態（Claude Code用）
└── README.md                   ← このファイル
```

---

## 🛠 技術スタック

### Backend
- **Google Apps Script** (JavaScript/Google Script)
- **Google Spreadsheet** - データベース
- **Google Drive** - ファイルストレージ
- **DeepSeek API** - AI企業情報抽出
- **Google Search API** - Web検索

### Frontend
- **HTML5 + JavaScript** (Vanilla JS)
- **Bootstrap 5** - UI Framework
- **jQuery** - DOM操作
- **env-loader.js** - GAS URL動的読み込み

### DevOps
- **GitHub Actions** - CI/CD自動化
- **clasp** - GASデプロイツール
- **FTP-Deploy-Action** - Xserver自動アップロード

---

## 📝 開発ガイド

### 1. GASコード変更

```bash
# 1. ファイル編集
vim franchise-register/gas/systems/ai/AISearchSystem.gs

# 2. コミット＆プッシュ
git add franchise-register/gas/
git commit -m "feat: AI検索改善"
git push origin main

# 3. GitHub Actionsが自動実行
#    → GASデプロイ → env-loader更新 → FTPアップロード
```

### 2. フロントエンド変更

```bash
# 1. HTMLファイル編集
vim admin-dashboard/dist/index.html

# 2. コミット＆プッシュ
git add admin-dashboard/
git commit -m "fix: UI改善"
git push origin main

# 3. GitHub Actionsが自動FTPアップロード
```

### 3. 手動GASデプロイ（ローカル）

```bash
cd franchise-register/gas
clasp push --force
clasp deploy -d "V1234: 説明"
```

### 4. env-loader.js手動同期

```bash
# 最新のGAS Deployment IDを取得
cd franchise-register/gas
clasp deployments

# 全env-loader.jsを同期
node sync-all-env-loaders.js <DEPLOYMENT_ID>
git add */dist/*/env-loader.js
git commit -m "sync: env-loader.js更新"
git push
```

---

## 🔍 トラブルシューティング

### GitHub Actions失敗時

1. https://github.com/gaihekitosoukuraberu/kuraberu-main/actions を確認
2. エラーログを読む
3. 必要に応じてRe-run

### ロールバックが必要な場合

```bash
cd franchise-register/gas
clasp deployments  # 前のバージョンID確認
# GitHub Actionsが自動ロールバック済みのはず
```

### env-loader.jsが古い場合

```bash
node sync-all-env-loaders.js <最新のDEPLOYMENT_ID>
git add */dist/*/env-loader.js
git commit -m "fix: env-loader.js手動同期"
git push
```

---

## 📊 システム状態確認

### 現在の状態を確認

```bash
# プロジェクト全体の状態
cat CURRENT_STATUS.md

# 最新コミット
git log --oneline -10

# 変更状況
git status

# GAS最新デプロイ
cd franchise-register/gas
clasp deployments | head -5
```

### GitHub Actions状態

- **Actions**: https://github.com/gaihekitosoukuraberu/kuraberu-main/actions
- **最新ワークフロー**: ワークフロー一覧で確認

---

## 🚨 重要な原則

1. **安定性最優先** - 本番稼働中のため、リスクのある変更は避ける
2. **自動化を信頼** - GitHub Actionsが正常動作している
3. **バージョン管理** - 全変更をgitにcommit
4. **ロールバック可能** - いつでも前のバージョンに戻せる状態を維持
5. **ドキュメント更新** - CURRENT_STATUS.mdを常に最新に保つ

---

## 📚 関連ドキュメント

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - システム現在状態（Claude Code用）
- [FRONTEND_AUTOMATION.md](./FRONTEND_AUTOMATION.md) - フロントエンド自動化詳細
- [.github/workflows/](-./.github/workflows/) - GitHub Actions設定

---

## 🤝 貢献

このプロジェクトは内部システムです。

---

## 📄 ライセンス

Proprietary - 外壁塗装くらべるAI

---

**最終更新**: 2025-10-31
