# PROJECT MAP - くらベる プロジェクト全体構成図
更新日時: 2025-09-26

## 🏢 プロジェクト構成

### 1. **admin-dashboard/** - 管理ダッシュボード
```
admin-dashboard/
├── frontend/           # React管理画面
├── gas/               # Google Apps Script バックエンド
├── dist/              # ビルド済みファイル
├── js/                # JavaScript モジュール
├── contracts/         # 契約管理
├── scripts/           # ユーティリティスクリプト
├── templates/         # HTMLテンプレート
└── memory/            # データストレージ
```

**主要機能:**
- フランチャイズ管理
- 加盟店管理
- 請求・課金管理
- データ分析ダッシュボード

**技術スタック:**
- Frontend: React, Material-UI
- Backend: Google Apps Script
- Database: Google Sheets
- Deployment: clasp

### 2. **franchise-dashboard/** - フランチャイズ向けダッシュボード
```
franchise-dashboard/
├── frontend/          # React フロントエンド
├── backend/           # Node.js バックエンド
├── dist/             # ビルド済みファイル
├── merchant-portal/  # 加盟店ポータル
├── scripts/          # ユーティリティ
├── templates/        # HTMLテンプレート
└── specs/            # 仕様書
```

**主要機能:**
- 加盟店一覧・管理
- 売上分析
- レポート生成
- 加盟店とのコミュニケーション

**スタンドアロン版:**
- `franchise-dashboard-standalone.html` - オフライン対応版

### 3. **franchise-register/** - フランチャイズ登録システム
```
franchise-register/
├── gas/              # Google Apps Script
│   ├── main.gs      # メインエントリーポイント
│   ├── router.gs    # ルーティング処理
│   ├── handlers/    # リクエストハンドラー
│   └── services/    # ビジネスロジック
├── js/              # フロントエンド JavaScript
├── css/             # スタイルシート
└── dist/            # ビルド済みファイル
```

**主要機能:**
- 新規フランチャイズ登録
- 加盟店情報登録
- AI検索機能
- データ検証・保存

### 4. **その他の主要ディレクトリ**
```
/
├── .claude/          # Claude AI設定
├── .cursor/          # Cursor IDE設定
├── privacy-policy-site/  # プライバシーポリシーサイト
└── ARCHIVE_OLD_PROJECTS/  # アーカイブ済みプロジェクト
```

## 🔗 システム連携図

```
┌─────────────────────────────────────────┐
│         Admin Dashboard                  │
│  (システム全体管理・データ分析)           │
└──────────────┬──────────────────────────┘
               │
               ↓ データ同期
┌──────────────┴──────────────────────────┐
│      Google Sheets Database              │
│  (中央データストレージ)                   │
└──────────┬───────────────┬──────────────┘
           │               │
           ↓               ↓
┌──────────────────┐ ┌────────────────────┐
│ Franchise        │ │ Franchise Register │
│ Dashboard        │ │ (登録フォーム)      │
│ (FC向け管理画面)  │ │                   │
└──────────────────┘ └────────────────────┘
```

## 📊 データフロー

1. **登録フロー**
   - franchise-register → Google Sheets → 管理承認 → 有効化

2. **管理フロー**
   - admin-dashboard → データ更新 → franchise-dashboard反映

3. **分析フロー**
   - 各システムからデータ収集 → Google Sheets集約 → ダッシュボード表示

## 🚀 デプロイメント状況

| プロジェクト | デプロイ方法 | ステータス |
|------------|------------|----------|
| admin-dashboard | clasp + GAS | ✅ Active |
| franchise-dashboard | スタンドアロンHTML | ✅ Active |
| franchise-register | clasp + GAS | ✅ Active |

## 📝 重要ファイル

- `.clasp.json` - Google Apps Scriptデプロイ設定
- `.env` - 環境変数設定
- 各プロジェクトの`README.md` - プロジェクト別詳細ドキュメント

## 🔧 開発環境

- Node.js v22.14.0
- npm/yarn パッケージマネージャー
- Google Apps Script CLI (clasp)
- Git バージョン管理

## 📌 注意事項

1. Google Apps Scriptプロジェクトは`clasp push`でデプロイ
2. 環境変数は`.env`ファイルで管理（gitignore対象）
3. 本番環境へのデプロイ前に必ずテスト環境で検証
4. データベース操作は慎重に（Google Sheetsが中央DB）

## 🔄 最近の変更

- 2025-09-26: プロジェクト構成の整理完了
- 2025-09-25: AI検索機能の修正対応
- 各種ドキュメントファイルの削除・整理

---

*このドキュメントは定期的に更新されます*