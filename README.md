# 加盟店管理システム - Franchise Dashboard

外壁塗装くらべるAIの加盟店管理システム（管理者版）

## 🚀 概要

このシステムは、外壁塗装の加盟店を管理するための包括的なダッシュボードアプリケーションです。案件管理、営業取次店管理、請求管理などの機能を提供します。

## 📋 機能

- **ダッシュボード**: リアルタイムの統計情報と分析
- **案件管理**: 案件の作成、割り当て、ステータス管理
- **営業取次店管理**: 取次店の登録、パフォーマンス追跡
- **請求管理**: 請求書発行、入金管理
- **設定**: 加盟店情報、対応エリア、通知設定

## 🛠 技術スタック

### Backend
- Node.js + TypeScript
- Express.js
- PostgreSQL + TypeORM
- Redis (キャッシュ・セッション)
- JWT認証
- Twilio (SMS通知)
- LINE Messaging API

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router v6
- Zustand (状態管理)

## 📦 インストール

### 前提条件
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (オプション)

### セットアップ

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd franchise-dashboard
```

2. 環境変数を設定:
```bash
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

3. Dockerでサービスを起動:
```bash
docker-compose up -d
```

4. バックエンドの依存関係をインストール:
```bash
cd backend
npm install
npm run migrate
npm run dev
```

5. フロントエンドの依存関係をインストール:
```bash
cd ../frontend
npm install
npm run dev
```

6. ブラウザで http://localhost:5173 を開く

## 🧪 テスト

### バックエンドテスト:
```bash
cd backend
npm run test           # 全テスト実行
npm run test:unit      # ユニットテストのみ
npm run test:contract  # 契約テストのみ
npm run test:integration # 統合テストのみ
```

### フロントエンドテスト:
```bash
cd frontend
npm run test          # ユニットテスト
npm run test:e2e      # E2Eテスト (Playwright)
```

## 📝 API ドキュメント

APIドキュメントは `http://localhost:3000/api-docs` で確認できます。

主要なエンドポイント:
- `POST /api/auth/login` - ログイン
- `GET /api/dashboard/stats` - ダッシュボード統計
- `GET /api/cases` - 案件一覧
- `POST /api/cases` - 案件作成
- `PUT /api/cases/:id/status` - ステータス更新

## 🚀 デプロイ

### 本番環境へのデプロイ:

1. 環境変数を本番用に設定
2. ビルド実行:
```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

3. AWS ECS/Fargateへデプロイ (推奨)

## 📊 モニタリング

- ヘルスチェック: `GET /health`
- メトリクス: CloudWatch/Datadog統合
- ログ: Winston + CloudWatch Logs

## 🔒 セキュリティ

- JWT認証 (アクセストークン + リフレッシュトークン)
- ロール別アクセス制御 (Admin/Manager/Operator)
- レート制限
- CORS設定
- SQL インジェクション対策
- XSS対策

## 📁 プロジェクト構造

```
franchise-dashboard/
├── backend/
│   ├── src/
│   │   ├── models/       # TypeORM エンティティ
│   │   ├── services/     # ビジネスロジック
│   │   ├── routes/       # APIルート
│   │   ├── middleware/   # Express ミドルウェア
│   │   ├── migrations/   # データベースマイグレーション
│   │   └── utils/        # ユーティリティ
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/        # ページコンポーネント
│   │   ├── components/   # 再利用可能コンポーネント
│   │   ├── services/     # API クライアント
│   │   ├── hooks/        # カスタムフック
│   │   └── contexts/     # React Context
│   └── tests/
└── docker-compose.yml
```

## 👥 開発チーム

- SpecKit仕様駆動開発手法を採用
- TDD (テスト駆動開発) アプローチ
- コードレビュー必須

## 📄 ライセンス

Proprietary - All Rights Reserved

## 🤝 サポート

問題が発生した場合は、GitHubのIssueを作成してください。