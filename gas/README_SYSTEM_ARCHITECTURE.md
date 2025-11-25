# 加盟店登録システム - アーキテクチャ概要

このドキュメントは、加盟店登録システムの全体アーキテクチャと、短期・中期対策として実装された統合システムについて説明します。

---

## 📁 システム構成

```
franchise-register/gas/
├── main.js                      # メインエントリーポイント（SystemRouter実装）
├── systems/                     # 各システムモジュール
│   ├── franchise/
│   │   └── FranchiseSystem.js  # 加盟店登録システム
│   ├── merchant/
│   │   ├── MerchantSystem.js   # 加盟店ポータルシステム
│   │   └── CompanyInfoManager.js # 会社情報管理
│   ├── admin/
│   │   └── AdminSystem.js      # 管理ダッシュボードシステム
│   ├── ai/
│   │   └── AISearchSystem.gs   # AI検索システム
│   ├── slack/
│   │   └── SlackApprovalSystem.js # Slack承認システム
│   └── evaluation/
│       └── EvaluationDataManager.js # 評価データ管理
├── shared/                      # 共通モジュール
│   └── DataLayer.js            # 統一データアクセス層（NEW!）
├── test-all-systems.sh         # 統合テストスクリプト（NEW!）
├── DEPLOY_CHECKLIST.md         # デプロイ前チェックリスト（NEW!）
├── INTEGRATION_GUIDE.md        # システム統合ガイド（NEW!）
└── README_SYSTEM_ARCHITECTURE.md # このファイル
```

---

## 🎯 システムアーキテクチャの目標

### 課題
- システム間の依存関係が不明瞭
- データフォーマット変更時の影響範囲が広範囲
- デプロイ時のリスクが高い
- テストが不十分

### 対策（実装完了）

#### 短期対策（今すぐ実施可能） ✅
1. **変更影響範囲の明文化**
   - 各Systemファイルに依存関係コメントを追加
   - システム変更時の影響範囲を明確化

2. **統合テストスクリプト作成**
   - 全システムの主要機能をテスト
   - デプロイ前の品質保証

3. **デプロイ前チェックリスト**
   - 変更時に確認すべき項目を体系化
   - デプロイリスクの最小化

#### 中期対策（実装完了） ✅
1. **API境界の明確化（SystemRouter）**
   - すべてのアクションをSystemRouterで一元管理
   - システム間の境界を明確化

2. **データレイヤー統一（DataLayer）**
   - 統一データアクセス層の実装
   - 圧縮データの自動展開
   - 後方互換性の自動保持

---

## 🔧 主要コンポーネント

### 1. SystemRouter（main.js）

**役割:** すべてのAPIリクエストをルーティング

**主な機能:**
- アクション → システムのマッピング
- doGet / doPost の統一的な処理
- エラーハンドリングの一元化

**ルーティング例:**
```javascript
// GET/POST: /exec?action=franchise_submitRegistration
→ FranchiseSystem.handlePost()

// GET/POST: /exec?action=merchant_verifyLogin
→ MerchantSystem.handle()

// GET/POST: /exec?action=admin_getRegistrationRequests
→ AdminSystem.handle()
```

**新規アクション追加方法:**
1. `SystemRouter.routes` に登録
2. 該当Systemファイルに実装
3. テスト実行
4. デプロイ

### 2. DataLayer（shared/DataLayer.js）

**役割:** 統一データアクセス層

**主な機能:**
- カラムマッピングの一元管理
- 圧縮データの自動展開
- 後方互換性の保持
- エラーハンドリングの統一

**使用例:**
```javascript
// 読み取り
const data = DataLayer.getMerchantData('FR001');
const name = DataLayer.getField('FR001', 'companyName');

// 書き込み
DataLayer.updateField('FR001', 'companyName', '新社名');
DataLayer.updateMerchantData('FR001', {
  companyName: '新社名',
  phone: '03-1234-5678'
});
```

**圧縮データの自動展開:**
```javascript
// 圧縮されていても自動展開される
const branches = DataLayer.getField('FR001', 'branchAddress');
// → 完全なデータが返される
```

### 3. FranchiseSystem

**役割:** 加盟店登録（データ書き込み）

**主要API:**
- `submitRegistration` - 登録フォーム送信
- `registerFranchise` - 加盟店登録処理

**依存関係:**
```
FranchiseSystem
  ↓ データフォーマット
MerchantSystem（読み取り）
  ↓ ステータス管理
AdminSystem（承認/却下）
```

**フロントエンド:**
- `franchise-register` (登録フォーム)

### 4. MerchantSystem

**役割:** 加盟店ポータル（データ読み取り・認証）

**主要API:**
- `verifyFirstLogin` - 初回ログインURL検証
- `setPassword` - パスワード設定
- `verifyLogin` - ログイン認証
- `getMerchantData` - 加盟店データ取得

**依存関係:**
```
MerchantSystem
  ↓ データ書き込み
FranchiseSystem
  ↓ 画像管理
CompanyInfoManager
```

**フロントエンド:**
- `franchise-dashboard` (加盟店ポータル)
- `first-login.html` (初回ログイン)

### 5. AdminSystem

**役割:** 管理ダッシュボード（承認・管理）

**主要API:**
- `getRegistrationRequests` - 登録申請一覧取得
- `approveRegistration` - 承認処理
- `rejectRegistration` - 却下処理
- `updateMerchantData` - 加盟店データ更新

**依存関係:**
```
AdminSystem
  ↓ 登録データ
FranchiseSystem
  ↓ 加盟店データ
MerchantSystem
  ↓ Slack通知
SlackApprovalSystem
```

**フロントエンド:**
- `admin-dashboard` (管理者ダッシュボード)

---

## 🚀 開発ワークフロー

### 新機能追加の流れ

#### 1. 設計フェーズ
```bash
# 依存関係を確認
grep -A 10 "【依存関係】" systems/franchise/FranchiseSystem.js

# 影響範囲を特定
cat DEPLOY_CHECKLIST.md
```

#### 2. 実装フェーズ
```javascript
// SystemRouterに登録
'myaction_': {
  system: 'MySystem',
  description: '説明',
  prefix: true
}

// Systemファイルに実装
const MySystem = {
  handle: function(params) {
    // DataLayerを使用
    const data = DataLayer.getMerchantData(params.merchantId);
    // ...
  }
};
```

#### 3. テストフェーズ
```bash
# 統合テスト実行
cd franchise-register/gas
bash test-all-systems.sh
```

#### 4. デプロイフェーズ
```bash
# チェックリスト確認
cat DEPLOY_CHECKLIST.md

# バックアップ
tar -czf gas-backup-$(date +%Y%m%d_%H%M%S).tar.gz franchise-register/gas/

# デプロイ
clasp push
clasp deploy -d "V1XXX: 変更内容"
```

---

## 📊 データフロー

### 登録フロー
```
1. ユーザーがフォーム送信
   ↓
2. FranchiseSystem.submitRegistration()
   ↓
3. DataLayer.appendMerchantData() (Spreadsheet書き込み)
   ↓
4. SlackApprovalSystem.sendNotification() (Slack通知)
   ↓
5. AdminSystem.approveRegistration() (管理者承認)
   ↓
6. MerchantSystem.verifyFirstLogin() (初回ログインURL発行)
```

### ログインフロー
```
1. 初回ログインURLをクリック
   ↓
2. MerchantSystem.verifyFirstLogin() (URL検証)
   ↓
3. MerchantSystem.setPassword() (パスワード設定)
   ↓
4. MerchantSystem.verifyLogin() (ログイン認証)
   ↓
5. MerchantSystem.getMerchantData() (データ取得)
   ↓ DataLayer経由
6. Spreadsheetから圧縮データを自動展開して返却
```

---

## 🔒 セキュリティ

### 認証
- 初回ログイン: 署名付きURL（SHA256）
- 通常ログイン: パスワードハッシュ（SHA256）
- セッション: ��し（ステートレス）

### データ保護
- Script Properties: 環境変数（SPREADSHEET_ID等）
- パスワード: ハッシュ化（SHA256）
- ファイルアップロード: Google Driveに保存

### アクセス制御
- 管理者: AdminSystem経由でのみアクセス
- 加盟店: MerchantSystem経由で自社データのみアクセス
- 公開API: なし（すべて認証必須）

---

## 📈 パフォーマンス

### 最適化ポイント
1. **DataLayer.getMerchantData()**
   - 一度に全データを取得（複数回のSpreadsheetアクセスを回避）

2. **圧縮データの自動展開**
   - 読み取り時のみ展開（書き込みは圧縮のまま）

3. **SystemRouter**
   - アクションマッピングはメモリ上（高速）

### 制限事項
- Google Apps Script実行時間: 最大6分
- Spreadsheet読み書き: 同時実行数に制限あり
- Drive API: クォータ制限あり

---

## 🧪 テスト戦略

### 統合テスト（test-all-systems.sh）
- ヘルスチェック
- 構文チェック
- SystemRouter登録確認
- 依存関係ドキュメント確認

### 手動テスト（デプロイ後）
- 登録フォーム送信テスト
- ログインテスト
- 管理ダッシュボードテスト

### 推奨追加テスト
- ユニットテスト（各System）
- E2Eテスト（フロントエンド含む）
- パフォーマンステスト

---

## 🔧 トラブルシューティング

### よくある問題

#### 1. "DataLayer is not defined"
**原因:** .claspignoreで除外されている

**解決:**
```bash
# .claspignoreを確認
grep "DataLayer" .claspignore

# 除外されている場合は削除
```

#### 2. "Unknown action"
**原因:** SystemRouterに登録されていない

**解決:**
```javascript
// main.jsのSystemRouter.routesに追加
'myaction_': {
  system: 'MySystem',
  prefix: true
}
```

#### 3. 圧縮データが展開されない
**原因:** DataLayerを使用していない

**解決:**
```javascript
// 直接Spreadsheetアクセス（NG）
const value = sheet.getRange(row, col).getValue();

// DataLayer使用（OK）
const value = DataLayer.getField(merchantId, 'branchAddress');
```

---

## 📚 参考資料

### ドキュメント
- **INTEGRATION_GUIDE.md** - システム統合ガイド（使い方詳細）
- **DEPLOY_CHECKLIST.md** - デプロイ前チェックリスト
- **ARCHITECTURE.md** - 旧アーキテクチャドキュメント
- **AUTO_MODE.md** - 自動デプロイガイド
- **QUICK_START.md** - クイックスタートガイド

### コード
- **main.js** - SystemRouter実装
- **shared/DataLayer.js** - DataLayer実装
- **systems/** - 各Systemの実装

---

## 🎉 まとめ

### 実装完了内容

#### ✅ 短期対策
1. 依存関係の明文化（各Systemファイル）
2. 統合テストスクリプト（test-all-systems.sh）
3. デプロイ前チェックリスト（DEPLOY_CHECKLIST.md）

#### ✅ 中期対策
1. API境界の明確化（SystemRouter in main.js）
2. データレイヤー統一（DataLayer in shared/）

### 今後の改善

#### 優先度: 高
- 各SystemでDataLayerを統一的に使用
- 統合テストの実運用と拡充

#### 優先度: 中
- DataLayerのバージョニング機能
- エラーログの一元管理

#### 優先度: 低
- パフォーマンス最適化
- キャッシング導入

---

## 📞 サポート

### 問題が発生した場合
1. **INTEGRATION_GUIDE.md** のトラブルシューティングを確認
2. **test-all-systems.sh** を実行して問題を特定
3. ログファイル（test-results-*.log）を確認
4. 必要に応じてロールバック（DEPLOY_CHECKLIST.md参照）

---

**作成日:** 2025年10月31日
**バージョン:** 1.0
**最終更新:** 2025年10月31日
**作成者:** システム統合チーム
