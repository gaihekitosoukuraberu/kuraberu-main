# 🚀 GAS CI/CD Pipeline

外壁塗装くらべるAIシステムの Google Apps Script CI/CD パイプライン

## 📋 目次

- [概要](#概要)
- [前提条件](#前提条件)
- [初期セットアップ](#初期セットアップ)
- [使用方法](#使用方法)
- [ワークフロー](#ワークフロー)
- [トラブルシューティング](#トラブルシューティング)
- [セキュリティ](#セキュリティ)

## 🎯 概要

このプロジェクトは、Google Apps Script のコードを GitHub で管理し、自動デプロイを実現する CI/CD パイプラインです。

### 特徴

- ✅ **GitHub Actions** による自動デプロイ
- ✅ **clasp** を使用した GAS プロジェクト管理
- ✅ **開発環境・本番環境** の分離
- ✅ **セキュリティ** を考慮した設定ファイル管理
- ✅ **手動デプロイ** スクリプト対応
- ✅ **GAS エディタ不要** でのコード反映

### アーキテクチャ

```
kuraberu-main/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions ワークフロー
├── gas-backend/                # GAS ソースコード
│   ├── *.gs                   # Google Apps Script ファイル
│   ├── appsscript.json        # GAS マニフェスト
│   └── .clasp.*.json.template # clasp 設定テンプレート
├── scripts/
│   ├── setup-clasp.sh         # 初期セットアップスクリプト
│   └── deploy.sh              # 手動デプロイスクリプト
└── package.json               # Node.js プロジェクト設定
```

## 🔧 前提条件

### 必要なツール

- **Node.js** (v18以上) - [ダウンロード](https://nodejs.org/)
- **npm** (Node.js に含まれる)
- **Git** - [ダウンロード](https://git-scm.com/)
- **GitHub CLI** (オプション) - [ダウンロード](https://cli.github.com/)

### 必要なアカウント

- **Google アカウント** (Google Apps Script 用)
- **GitHub アカウント** (リポジトリ管理用)

### Google Apps Script API 有効化

1. [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) にアクセス
2. **「Google Apps Script API」** をオンにする

## 🚀 初期セットアップ

### 1. リポジトリクローン

```bash
git clone https://github.com/your-org/kuraberu-ai-gas.git
cd kuraberu-ai-gas
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. clasp セットアップ

```bash
npm run setup
```

このコマンドで以下が自動実行されます：

- clasp のインストール
- Google アカウントでのログイン
- 開発環境・本番環境の GAS プロジェクト作成
- 設定ファイルの生成

### 4. GitHub Secrets 設定

GitHub リポジトリの **Settings → Secrets and variables → Actions** で以下の Secrets を設定：

| Secret 名 | 値 | 説明 |
|-----------|-----|------|
| `CLASP_CREDENTIALS` | `~/.clasprc.json` の内容 | clasp 認証情報 |
| `CLASP_DEV_CONFIG` | `gas-backend/.clasp.dev.json` の内容 | 開発環境設定 |
| `CLASP_PROD_CONFIG` | `gas-backend/.clasp.json` の内容 | 本番環境設定 |

#### GitHub CLI での自動設定（推奨）

```bash
# GitHub CLI でログイン
gh auth login

# Secrets 自動設定
gh secret set CLASP_CREDENTIALS < ~/.clasprc.json
gh secret set CLASP_DEV_CONFIG < gas-backend/.clasp.dev.json
gh secret set CLASP_PROD_CONFIG < gas-backend/.clasp.json
```

## 📱 使用方法

### 自動デプロイ

#### 開発環境デプロイ

```bash
# develop ブランチにプッシュ
git checkout develop
git add .
git commit -m "feat: 新機能追加"
git push origin develop
```

→ 自動的に開発環境にデプロイされます

#### 本番環境デプロイ

```bash
# main ブランチにマージ
git checkout main
git merge develop
git push origin main
```

→ 自動的に本番環境にデプロイされます

### 手動デプロイ

#### 開発環境

```bash
npm run deploy:dev
```

#### 本番環境

```bash
npm run deploy:prod
```

#### 強制デプロイ（確認スキップ）

```bash
npm run deploy:prod:force
```

#### バージョン説明付きデプロイ

```bash
./scripts/deploy.sh prod --version "Bug fix: 請求システム修正"
```

### その他の便利コマンド

```bash
# GAS プロジェクトをブラウザで開く
npm run clasp:open:dev    # 開発環境
npm run clasp:open:prod   # 本番環境

# GAS からローカルにコードを取得
npm run clasp:pull:dev    # 開発環境から
npm run clasp:pull:prod   # 本番環境から

# clasp ログイン/ログアウト
npm run clasp:login
npm run clasp:logout

# デプロイのテスト（dry-run）
npm test
```

## 🔄 ワークフロー

### GitHub Actions ワークフロー

#### Pull Request 時

1. **コードチェック**
2. **開発環境への試験デプロイ**
3. **PR にテスト結果をコメント**

#### develop ブランチプッシュ時

1. **開発環境自動デプロイ**
2. **バージョン作成**

#### main ブランチプッシュ時

1. **本番環境自動デプロイ**
2. **バージョン作成**
3. **バックアップ作成**

### ブランチ戦略

```
main (本番環境)
├── develop (開発環境)
│   ├── feature/billing-system
│   ├── feature/chat-bot
│   └── hotfix/urgent-fix
```

### 開発フロー

1. **Feature ブランチ作成**
   ```bash
   git checkout develop
   git checkout -b feature/new-feature
   ```

2. **開発・コミット**
   ```bash
   git add .
   git commit -m "feat: 新機能実装"
   ```

3. **Push & Pull Request**
   ```bash
   git push origin feature/new-feature
   # GitHub で Pull Request 作成
   ```

4. **develop ブランチにマージ**
   - 自動的に開発環境にデプロイ

5. **本番デプロイ**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

## 🛠️ トラブルシューティング

### よくある問題

#### clasp ログインエラー

```bash
Error: Not logged in.
```

**解決方法:**
```bash
npm run clasp:login
```

#### Google Apps Script API 無効

```bash
Error: User has not enabled the Apps Script API.
```

**解決方法:**
1. [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) にアクセス
2. **Google Apps Script API** をオンにする

#### GitHub Secrets 設定エラー

```bash
Error: Required secret CLASP_CREDENTIALS not found
```

**解決方法:**
1. GitHub リポジトリの Settings → Secrets and variables → Actions
2. 必要な Secrets を設定

#### デプロイ権限エラー

```bash
Error: You do not have permission to modify this script.
```

**解決方法:**
1. GAS プロジェクトの所有者を確認
2. 正しい Google アカウントでログインしているか確認

### ログの確認

#### GitHub Actions ログ

1. GitHub リポジトリの **Actions** タブ
2. 該当するワークフロー実行をクリック
3. 詳細ログを確認

#### ローカルログ

```bash
# デプロイスクリプトのログ
./scripts/deploy.sh prod --verbose

# clasp のログ
clasp push --verbose
```

### 設定ファイルの復旧

#### 設定ファイルが壊れた場合

```bash
# クリーンアップ
npm run clean

# 再セットアップ
npm run setup
```

#### GitHub Secrets の再設定

```bash
# 新しい認証情報で更新
clasp logout
clasp login
gh secret set CLASP_CREDENTIALS < ~/.clasprc.json
```

## 🔒 セキュリティ

### 機密情報の管理

- ✅ `.clasp.json` は `.gitignore` で除外
- ✅ 認証情報は GitHub Secrets で管理
- ✅ 本番環境設定は暗号化して保存

### アクセス権限

- **開発環境**: 開発チーム全員
- **本番環境**: 限定メンバーのみ
- **GitHub Secrets**: 管理者のみ

### 監査ログ

- GitHub Actions の実行ログ
- GAS バージョン履歴
- Git コミット履歴

### セキュリティチェックリスト

- [ ] Google Apps Script API が有効
- [ ] 認証情報が GitHub Secrets に設定済み
- [ ] 本番環境アクセス権限が適切
- [ ] `.clasp.json` が Git 除外されている
- [ ] バックアップが定期実行されている

## 📚 参考リンク

- [Google Apps Script](https://script.google.com/)
- [clasp Documentation](https://github.com/google/clasp)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js](https://nodejs.org/)

## 🤝 サポート

問題や質問がある場合：

1. [Issues](https://github.com/your-org/kuraberu-ai-gas/issues) で報告
2. [Discussions](https://github.com/your-org/kuraberu-ai-gas/discussions) で質問
3. 開発チームに直接連絡

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 👥 貢献者

- **Kuraberu AI Team** - 初期開発・メンテナンス

---

**🎉 これで GAS エディタを一切触らずにコードを反映できます！**