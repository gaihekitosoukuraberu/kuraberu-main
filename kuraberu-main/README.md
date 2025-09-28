# 🏠 外壁塗装くらべるAI - 統合システム

> AIで最適な外壁塗装業者を無料で比較するプラットフォーム

[![CI/CD](https://github.com/gaihekitosoukuraberu/lp_project/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/gaihekitosoukuraberu/lp_project/actions/workflows/ci-cd.yml)
[![Security Score](https://img.shields.io/badge/Security%20Score-74%2F100-yellow)](./SECURITY_REVIEW_REPORT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 📋 プロジェクト概要

外壁塗装くらべるAIは、顧客が最適な外壁塗装業者を見つけるためのWebプラットフォームです。AI診断、地域別業者マッチング、リアルタイム価格比較、加盟店管理システムを統合し、透明性の高いサービスを提供します。

### 🎯 主要機能

- **🤖 AI診断システム**: 物件情報から最適な施工プランを提案
- **📍 地域別業者マッチング**: 郵便番号ベースで最適な加盟店を自動選定
- **💰 リアルタイム価格比較**: 複数業者からの見積もり比較
- **🏢 加盟店管理システム**: 業者向けの案件管理・スケジュール調整
- **👥 管理者ダッシュボード**: 全体統計・売上管理・品質監視
- **🎯 4段階ヒアリングシステム**: プログレッシブUI解除による段階的情報収集
- **✨ モザイク効果**: 派手なアニメーションとスパークルエフェクト
- **🔄 動的ソート機能**: 段階別解除による業者ランキング操作
- **📱 多デバイス対応**: レスポンシブデザインによる最適化

## 🚀 アプリケーション一覧

### 💡 estimate-app（見積もりアプリ）
- **URL**: `https://gaiheki.kuraberu.com/estimate/`
- **機能**: 4段階ヒアリングシステムによる見積もり取得
- **特徴**: 
  - 郵便番号検索による地域相場表示
  - プログレッシブUI解除（モザイク効果）
  - 段階別ソート機能（おすすめ順→全機能）
  - 派手なアニメーション（スパークルエフェクト）
  - レスポンシブ対応チャットボット

### 👨‍💼 admin-app（管理者ダッシュボード）
- **URL**: `https://gaiheki.kuraberu.com/admin/`
- **機能**: 全体統計・売上管理・品質監視

### 🏢 franchise-app（加盟店管理）
- **URL**: `https://gaiheki.kuraberu.com/franchise/`
- **機能**: 案件管理・スケジュール調整

### 👨‍👩‍👧‍👦 franchise-parent-app（加盟店親管理）
- **URL**: `https://gaiheki.kuraberu.com/franchise-parent/`
- **機能**: 複数店舗統括管理

## 🛠️ 技術スタック

### フロントエンド
- **Vue.js 3** - プログレッシブフレームワーク
- **Vite** - 高速ビルドツール
- **Tailwind CSS** - ユーティリティファーストCSS
- **Alpine.js** - 軽量リアクティブフレームワーク
- **Jest** - テストフレームワーク

### バックエンド
- **Google Apps Script (GAS)** - サーバーレスバックエンド
- **Google Sheets** - データベース
- **Google Drive** - ファイルストレージ

### 外部API連携
- **Slack API** - チーム通知システム
- **SendGrid** - メール配信サービス
- **Twilio** - SMS通知サービス
- **OpenRouter + DeepSeek** - AI分析エンジン

### インフラ・CI/CD
- **Xserver** - ホスティングサービス
- **GitHub Actions** - 自動デプロイメント
- **Clasp** - GAS開発ツール

## 🏗️ システム構成図

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   顧客LP            │    │   管理者ダッシュボード │    │   加盟店システム    │
│   (gaiheki.com)     │    │   (admin/)           │    │   (franchise/)      │
├─────────────────────┤    ├──────────────────────┤    ├─────────────────────┤
│ ✓ AI診断フォーム    │    │ ✓ 案件管理           │    │ ✓ 案件一覧          │
│ ✓ 業者マッチング    │    │ ✓ 売上分析           │    │ ✓ スケジュール管理  │
│ ✓ 価格比較          │    │ ✓ 加盟店監視         │    │ ✓ 顧客対応履歴      │
│ ✓ 見積もり依頼      │    │ ✓ システム監視       │    │ ✓ 請求書生成        │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                          │                          │
           └──────────────────────────┼──────────────────────────┘
                                      │
                ┌─────────────────────────────────────────┐
                │          Google Apps Script             │
                │          (gas/ ディレクトリ)             │
                ├─────────────────────────────────────────┤
                │ ✓ API統合エンドポイント                  │
                │ ✓ 認証・セキュリティ                    │
                │ ✓ データベース操作                      │
                │ ✓ AI分析処理                           │
                │ ✓ 通知システム                         │
                └─────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
┌───────────────┐          ┌─────────────────┐          ┌─────────────────┐
│ Google Sheets │          │  外部APIサービス │          │  通知システム   │
├───────────────┤          ├─────────────────┤          ├─────────────────┤
│ ✓ 顧客データ  │          │ ✓ OpenRouter     │          │ ✓ Slack         │
│ ✓ 案件管理    │          │ ✓ DeepSeek AI    │          │ ✓ SendGrid      │
│ ✓ 加盟店情報  │          │ ✓ 地域データAPI  │          │ ✓ Twilio        │
│ ✓ 売上データ  │          │ ✓ 郵便番号API    │          │ ✓ LINE Notify   │
└───────────────┘          └─────────────────┘          └─────────────────┘
```

## 🚀 クイックスタート

### 前提条件

- **Node.js** v18以上
- **npm** または **yarn**
- **Google Apps Script** プロジェクトへのアクセス
- **Git** バージョン管理システム

### 1. リポジトリのクローン

```bash
git clone https://github.com/gaihekitosoukuraberu/lp_project.git
cd kuraberu-main
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
# .env ファイルを作成
cp .env.example .env

# 必要な環境変数を設定
nano .env
```

**必要な環境変数:**
```env
# GAS設定
VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_GAS_SCRIPT_ID=YOUR_SCRIPT_ID

# API設定
VITE_API_BASE_URL=https://gaiheki.kuraberu.com/api
VITE_ADMIN_API_KEY=your-admin-api-key

# 外部サービス
SLACK_WEBHOOK_URL=https://hooks.slack.com/YOUR_WEBHOOK
SENDGRID_API_KEY=your-sendgrid-api-key
TWILIO_AUTH_TOKEN=your-twilio-token
OPENROUTER_API_KEY=your-openrouter-key
```

### 4. Google Apps Script の設定

```bash
# Clasp認証
npm install -g @google/clasp
clasp login

# GASプロジェクトの設定
cd gas
clasp create --title "外壁塗装くらべるAI" --type webapp
# または既存プロジェクトにクローン
clasp clone YOUR_SCRIPT_ID

# 初回デプロイ
clasp push
```

### 5. 開発サーバーの起動

```bash
# フロントエンド開発サーバー
npm run start

# GAS監視（別ターミナル）
npm run gas:logs
```

開発サーバーが `http://localhost:3000` で起動します。

## 📂 プロジェクト構成

```
kuraberu-main/
├── src/                     # フロントエンドソースコード
│   ├── components/          # Vueコンポーネント
│   ├── css/                # スタイルシート
│   ├── js/                 # JavaScriptモジュール
│   │   ├── modules/        # 機能別モジュール
│   │   └── security.js     # セキュリティユーティリティ
│   └── index.html          # メインHTMLファイル
│
├── gas/                     # Google Apps Script
│   ├── code.gs             # メインAPIエンドポイント
│   ├── security_utils.gs   # セキュリティフレームワーク
│   ├── security_patches.gs # 自動セキュリティパッチ
│   ├── tests/              # GASテストスイート
│   └── *.gs               # 各種機能モジュール
│
├── estimate-app/           # 見積もりアプリ（4段階ヒアリングシステム）
│   ├── css/
│   │   └── styles.css     # カスタムスタイル（モザイク効果、アニメーション）
│   ├── js/
│   │   ├── chatbot.js     # 4段階ヒアリングチャットボット
│   │   ├── ranking.js     # 業者ランキング＆ソート機能
│   │   ├── utils.js       # 郵便番号検索、相場表示
│   │   └── phone-form.js  # 電話番号入力、業者名開示
│   └── index.html         # メインHTMLファイル
│
├── admin-app/              # 管理者ダッシュボード（ビルド済み）
├── franchise-app/          # 加盟店システム（ビルド済み）
├── franchise-parent-app/   # 加盟店親システム（ビルド済み）
│
├── scripts/                # デプロイ・運用スクリプト
│   ├── deploy-xserver-automated.sh    # 全アプリ自動デプロイ
│   ├── deploy-estimate-app.sh          # estimate-app専用デプロイ
│   ├── local-backup.sh                 # ローカル自動バックアップ
│   ├── backup-status.sh                # バックアップ状況確認
│   ├── setup-cron.sh                   # Cron自動バックアップ設定
│   └── setup-local-dev.sh              # 開発環境セットアップ
│
├── tests/                  # フロントエンドテスト
├── .github/workflows/      # CI/CDパイプライン
│
├── package.json            # NPM設定
├── vite.config.js         # Viteビルド設定
├── tailwind.config.js     # TailwindCSS設定
└── README.md              # プロジェクト説明（本ファイル）
```

## 🔧 開発ワークフロー

### フロントエンド開発

```bash
# 開発サーバー起動
npm run start

# ビルドテスト
npm run build

# テスト実行
npm run test
npm run test:coverage

# コード品質チェック
npm run lint
npm run lint:fix
```

### Google Apps Script 開発

```bash
# コードのプッシュ
npm run gas:push

# テスト実行
npm run gas:test

# ログ監視
npm run gas:logs

# Web App URL確認
npm run gas:open
```

### フルシステムテスト

```bash
# 統合テスト
npm run gas:test && npm run test

# 本番デプロイ準備
npm run build:production
npm run gas:deploy
```

## 🚀 デプロイメント

### 手動デプロイ

```bash
# 1. GASデプロイ
npm run gas:deploy

# 2. フロントエンドビルド
npm run build:production

# 3. Xserverアップロード
npm run deploy:xserver
```

### 自動デプロイ（GitHub Actions）

```bash
# mainブランチにプッシュすると自動デプロイ
git push origin main
```

**デプロイフロー:**
1. **テスト実行** - GAS・フロントエンド両方
2. **GASデプロイ** - `clasp push`
3. **フロントエンドビルド** - Vite本番ビルド
4. **Xserverアップロード** - SFTP自動転送
5. **Slack通知** - デプロイ結果報告

### CI/CD設定（GitHub Secrets）

```
CLASP_CREDENTIALS         # Clasp認証JSON
GAS_SCRIPT_ID            # GASプロジェクトID
XSERVER_HOST             # Xserver FTPホスト
XSERVER_USER             # FTPユーザー名
XSERVER_PASSWORD         # FTPパスワード
SLACK_TEST_SUCCESS_WEBHOOK_URL  # 成功通知Webhook
SLACK_TEST_FAILURE_WEBHOOK_URL  # 失敗通知Webhook
```

## 💾 バックアップシステム

### 自動バックアップ

本プロジェクトは2つのバックアップシステムを運用しています：

#### 1. GitHub Actions 自動バックアップ
- **頻度**: 15分おき
- **保存期間**: 30日
- **保存場所**: GitHub Actions Artifacts
- **対象**: 全重要ファイル

#### 2. ローカル自動バックアップ
- **頻度**: 15分おき（Cron）
- **保存期間**: 7日（自動削除）
- **保存場所**: `/Users/ryuryu/kuraberu-main/backups/`
- **対象**: estimate-app, gas, admin-app, franchise-app, franchise-parent-app

### バックアップ管理コマンド

```bash
# バックアップ状況確認
./scripts/backup-status.sh

# 手動バックアップ実行
./scripts/local-backup.sh

# 自動バックアップ設定（初回のみ）
./scripts/setup-cron.sh

# バックアップのみ作成（デプロイなし）
./scripts/deploy-estimate-app.sh --backup-only
```

### バックアップ内容

各バックアップには以下が含まれます：
- **ソースコード**: 全アプリケーションファイル
- **設定ファイル**: package.json, 環境設定
- **Git情報**: コミット履歴、変更状況
- **メタデータ**: タイムスタンプ、サイズ情報

### バックアップ監視

```bash
# リアルタイムログ監視
tail -f /Users/ryuryu/kuraberu-main/backups/cron.log

# バックアップ一覧表示
ls -la /Users/ryuryu/kuraberu-main/backups/backup_*.tar.gz

# 古いバックアップ手動削除
find /Users/ryuryu/kuraberu-main/backups -name "backup_*.tar.gz" -mtime +7 -delete
```

## 🔒 セキュリティ

本プロジェクトは包括的なセキュリティ対策を実装しています。

### セキュリティスコア: 74/100

詳細は [セキュリティレビュー報告書](./SECURITY_REVIEW_REPORT.md) を参照してください。

**主要なセキュリティ機能:**
- **認証・認可** - API キー認証
- **入力バリデーション** - XSS・SQLインジェクション対策
- **レート制限** - DoS攻撃防止
- **CSRF保護** - ワンタイムトークン
- **セキュリティログ** - 監査ログシステム
- **暗号化通信** - HTTPS強制

### セキュリティ設定の確認

```bash
# セキュリティ診断実行
cd gas
clasp run 'diagnoseSecurityStatus'

# セキュリティパッチ適用
clasp run 'manuallyApplySecurityPatches'
```

## 🧪 テストガイド

### フロントエンドテスト

```bash
# 全テスト実行
npm test

# 監視モード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

### GASテスト

```bash
# 全GASテスト実行
npm run gas:test

# CI用テスト（軽量版）
npm run gas:test-ci

# ヘルスチェック
npm run gas:health
```

### テストカバレッジ

- **フロントエンド**: 85%以上
- **GAS関数**: 75%以上
- **API エンドポイント**: 90%以上

## 🐛 トラブルシューティング

### よくある問題と解決策

#### 1. GAS認証エラー
```bash
# 解決: Clasp再認証
clasp logout
clasp login
```

#### 2. Viteビルドエラー
```bash
# 解決: 依存関係再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 3. API接続エラー
```bash
# 確認: GAS Web App URL
echo $VITE_GAS_WEB_APP_URL

# 解決: URL更新
npm run update-gas-url
```

#### 4. デプロイ失敗
```bash
# 解決: 手動デプロイテスト
npm run deploy:xserver
```

### デバッグモード

```bash
# 開発モードでの詳細ログ
NODE_ENV=development npm run start

# GASログ監視
npm run gas:logs --watch
```

### サポートチャンネル

- **Slack**: `#外壁塗装-dev`
- **Issues**: [GitHub Issues](https://github.com/gaihekitosoukuraberu/lp_project/issues)
- **Wiki**: [プロジェクトWiki](https://github.com/gaihekitosoukuraberu/lp_project/wiki)

## 📊 監視・分析

### パフォーマンス監視

- **Core Web Vitals** - Lighthouse自動測定
- **API レスポンス時間** - GAS監視ダッシュボード
- **エラー率** - セキュリティログ分析

### 分析ダッシュボード

管理者画面 (`/admin/`) で以下の指標を確認できます：

- 日次・月次のコンバージョン率
- 地域別業者パフォーマンス
- AI診断精度の分析
- システム稼働率とエラー統計

## 🤝 コントリビューション

### 開発参加方法

1. **Issue作成** - バグ報告・機能要求
2. **Fork & Clone** - 個人リポジトリで開発
3. **Pull Request** - レビュー後マージ

### コーディング規約

- **JavaScript**: ESLint設定に準拠
- **CSS**: Tailwind CSS + BEM記法
- **GAS**: Google Apps Script ベストプラクティス
- **コミット**: Conventional Commits形式

### 開発環境の推奨設定

- **VS Code** + 拡張機能（ESLint, Prettier, Vetur）
- **Node.js** v18 LTS
- **Git** + GitHub CLI

## 📋 ライセンス

本プロジェクトは **MIT License** の下で公開されています。

```
MIT License

Copyright (c) 2025 外壁塗装くらべるAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🔗 関連リンク

- **本番サイト**: [https://gaiheki.kuraberu.com](https://gaiheki.kuraberu.com)
- **管理画面**: [https://gaiheki.kuraberu.com/admin/](https://gaiheki.kuraberu.com/admin/)
- **加盟店システム**: [https://gaiheki.kuraberu.com/franchise/](https://gaiheki.kuraberu.com/franchise/)
- **GitHub**: [プロジェクトリポジトリ](https://github.com/gaihekitosoukuraberu/lp_project)
- **Wiki**: [技術ドキュメント](https://github.com/gaihekitosoukuraberu/lp_project/wiki)

---

**最終更新**: 2025-06-20  
**バージョン**: 1.0.0  
**メンテナー**: 外壁塗装くらべるAI開発チーム

> 💡 **ヒント**: 開発で困ったことがあれば、まずは本README.mdの「トラブルシューティング」セクションを確認してください。解決しない場合はSlackやGitHub Issuesでお気軽にご相談ください。