# Research Document: 加盟店管理画面（管理者版）

## Real-time Updates Architecture

**Decision**: Server-Sent Events (SSE)  
**Rationale**: 
- 単方向通信（サーバー→クライアント）で十分な要件
- WebSocketより実装がシンプル
- 自動再接続機能が組み込まれている
- 100同時接続程度なら負荷問題なし

**Alternatives considered**:
- WebSocket: 双方向通信が不要なためオーバースペック
- Polling: リアルタイム性が劣る、サーバー負荷が高い

## Session Management Strategy

**Decision**: JWT with Refresh Tokens  
**Rationale**:
- ステートレスでスケーラブル
- Redis不要でセッション管理可能
- リフレッシュトークンで長期ログイン実現
- Access Token: 15分、Refresh Token: 30日

**Alternatives considered**:
- Server sessions (Redis): インフラ複雑化
- Cookie sessions: データサイズ制限あり

## File Storage Solution

**Decision**: AWS S3互換ストレージ（MinIO for development）  
**Rationale**:
- スケーラブル、コスト効率的
- 画像最適化・CDN配信可能
- MinIOで開発環境統一
- 1年自動削除のライフサイクル設定可能

**Alternatives considered**:
- Local storage: スケーラビリティなし
- Database BLOB: パフォーマンス問題

## SMS/LINE Notification Providers

**Decision**: Twilio (SMS) + LINE Messaging API  
**Rationale**:
- Twilio: 日本国内SMS配信実績豊富、APIシンプル
- LINE: 公式API、無料枠あり、日本市場で必須
- 両方とも信頼性高く、ドキュメント充実

**Alternatives considered**:
- AWS SNS: 日本のSMS配信に制限
- SendGrid SMS: 日本未対応

## Database Schema Strategy

**Decision**: PostgreSQL with TypeORM  
**Rationale**:
- JSONB型で柔軟なデータ構造
- 全文検索機能（メモ検索用）
- TypeORMでTypeScript型安全性確保
- マイグレーション管理容易

**Alternatives considered**:
- MongoDB: トランザクション要件に不向き
- MySQL: JSONB型なし、全文検索弱い

## Frontend State Management

**Decision**: Zustand + React Query  
**Rationale**:
- Zustand: 軽量、TypeScript親和性高い
- React Query: サーバー状態管理、キャッシュ最適化
- Redux不要でシンプル維持

**Alternatives considered**:
- Redux Toolkit: オーバースペック
- Context API only: パフォーマンス課題

## Testing Strategy

**Decision**: Vitest + Playwright + MSW  
**Rationale**:
- Vitest: Jest互換、高速、ESM対応
- Playwright: クロスブラウザE2E
- MSW: APIモック、契約テスト

**Alternatives considered**:
- Jest: Vitest より遅い
- Cypress: Playwrightより制限多い

## UI Component Library

**Decision**: Tailwind CSS + Headless UI + Custom Components  
**Rationale**:
- レスポンシブ対応容易
- カスタマイズ性高い
- バンドルサイズ最適化可能
- 加盟店登録画面と統一感

**Alternatives considered**:
- Material-UI: カスタマイズ困難
- Ant Design: 中国製、日本語対応弱い

## Deployment Architecture

**Decision**: Docker + Docker Compose (Development), ECS/Fargate (Production)  
**Rationale**:
- 開発環境統一
- 本番環境の自動スケーリング
- インフラ管理最小化

**Alternatives considered**:
- Kubernetes: 運用複雑
- Heroku: コスト高、日本リージョンなし

## Monitoring & Logging

**Decision**: Winston (Backend) + Sentry (Error) + CloudWatch (Metrics)  
**Rationale**:
- Winston: 構造化ログ、ログレベル管理
- Sentry: エラー追跡、ユーザー影響分析
- CloudWatch: AWSネイティブ、コスト効率的

**Alternatives considered**:
- ELK Stack: 運用負荷高い
- Datadog: コスト高い

---

All technical decisions resolved. No NEEDS CLARIFICATION items remaining.