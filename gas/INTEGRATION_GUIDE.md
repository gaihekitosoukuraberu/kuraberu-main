# システム統合ガイド

このガイドは、短期・中期対策として実装された統合システムの使い方をまとめたものです。

---

## 🎯 実装完了項目

### ✅ 1. 依存関係の明文化
各Systemファイルにコメントが追加されています。

**場所:**
- `systems/franchise/FranchiseSystem.js`
- `systems/merchant/MerchantSystem.js`
- `systems/admin/AdminSystem.js`

**内容:**
```javascript
/**
 * 【依存関係】
 * - 他のSystemとの依存関係
 *
 * 【影響範囲】
 * - フロントエンド
 * - データ
 *
 * 【変更時の注意】
 * - 変更時に確認すべきこと
 *
 * 【必須テスト】
 * - 実行すべきテスト
 */
```

### ✅ 2. 統合テストスクリプト
全システムの主要機能をテストするスクリプトを作成しました。

**場所:** `test-all-systems.sh`

**使い方:**
```bash
cd franchise-register/gas
bash test-all-systems.sh
```

**テスト内容:**
- ヘルスチェック
- コード品質チェック（構文エラー）
- システム間整合性チェック（SystemRouter登録確認）
- 依存関係ドキュメント確認
- デプロイ準備チェック

### ✅ 3. デプロイ前チェックリスト
デプロイ前に確認すべき項目をまとめたチェックリストです。

**場所:** `DEPLOY_CHECKLIST.md`

**内容:**
- システム変更のチェック（FranchiseSystem, MerchantSystem, AdminSystem）
- データ構造変更のチェック
- テスト実行
- バックアップ
- デプロイ実行手順
- デプロイ後確認

### ✅ 4. 共通DataLayerクラス
データアクセスを統一的に扱うDataLayerクラスを実装しました。

**場所:** `shared/DataLayer.js`

**主な機能:**
- カラムマッピングの一元管理
- 圧縮データの自動展開
- 後方互換性の自動保持
- エラーハンドリングの統一

### ✅ 5. API境界の明確化（SystemRouter）
すべてのアクションをSystemRouterで管理し、システム間の境界を明確化しています。

**場所:** `main.js`

**ルーティング例:**
```javascript
const SystemRouter = {
  routes: {
    'franchise_': { system: 'FranchiseSystem', prefix: true },
    'merchant_': { system: 'MerchantSystem', prefix: true },
    'admin_': { system: 'AdminSystem', prefix: true },
    // ...
  }
};
```

---

## 📚 DataLayerの使い方

### 基本的な使い方

#### 1. 単一フィールドの読み取り
```javascript
const companyName = DataLayer.getField('FR001', 'companyName');
const address = DataLayer.getField('FR001', 'address');
```

#### 2. 全データの読み取り
```javascript
const merchantData = DataLayer.getMerchantData('FR001');
// {
//   companyName: '...',
//   address: '...',
//   phone: '...',
//   ...
// }
```

#### 3. 単一フィールドの更新
```javascript
DataLayer.updateField('FR001', 'companyName', '新しい会社名');
```

#### 4. 複数フィールドの更新
```javascript
DataLayer.updateMerchantData('FR001', {
  companyName: '新しい会社名',
  phone: '03-1234-5678',
  address: '東京都...'
});
```

#### 5. ステータスの更新
```javascript
DataLayer.updateStatus('FR001', '承認済み');
const status = DataLayer.getStatus('FR001');
```

### 圧縮データの自動展開

DataLayerは以下のカラムを自動的に展開します：
- `branchAddress` (支店住所)
- `maxFloors` (最大対応階数)
- `constructionTypes` (施工箇所)
- `specialServices` (特殊対応項目)
- `prefectures` (対応都道府県)
- `cities` (対応市区町村)
- `priorityAreas` (優先エリア)
- `qualifications` (保有資格)
- `insurance` (加入保険)

**使用例:**
```javascript
// 圧縮されたデータでも自動展開される
const branches = DataLayer.getField('FR001', 'branchAddress');
// 自動的に完全なデータが返される
```

### 日本語 → 英語変換

AdminSystemが返す日本語カラム名を英語フィールド名に変換できます。

```javascript
const jpData = {
  '会社名': '株式会社テスト',
  '住所': '東京都...'
};

const enData = DataLayer.convertJapaneseToEnglish(jpData);
// {
//   companyName: '株式会社テスト',
//   address: '東京都...'
// }
```

---

## 🔧 SystemRouterの使い方

### 新しいアクションを追加する場合

1. **SystemRouterに登録**
   `main.js` の `SystemRouter.routes` に追加：

   ```javascript
   'myaction_': {
     system: 'MySystem',
     description: '説明',
     prefix: true,
     actions: ['action1', 'action2']
   }
   ```

2. **Systemファイルに実装**
   該当するSystemファイルに `handle` または `handlePost` メソッドを実装：

   ```javascript
   const MySystem = {
     handle: function(params) {
       const action = params.action;
       switch (action) {
         case 'myaction_action1':
           return this.action1(params);
         // ...
       }
     }
   };
   ```

3. **影響範囲を確認**
   `DEPLOY_CHECKLIST.md` を参照して、変更の影響範囲を確認

---

## 🚀 デプロイ手順

### 1. 変更前の確認
```bash
# 依存関係を確認
grep -A 10 "【依存関係】" systems/franchise/FranchiseSystem.js
```

### 2. テスト実行
```bash
cd franchise-register/gas
bash test-all-systems.sh
```

### 3. デプロイ前チェックリスト確認
```bash
cat DEPLOY_CHECKLIST.md
# チェックリストに従って各項目を確認
```

### 4. バックアップ
```bash
cd ~/
tar -czf gas-backup-$(date +%Y%m%d_%H%M%S).tar.gz franchise-register/gas/
```

### 5. デプロイ
```bash
cd franchise-register/gas
clasp push
clasp deploy -d "V1XXX: 変更内容"
```

### 6. デプロイ後確認
```bash
# ヘルスチェック
curl "https://script.google.com/.../exec?action=health&callback=test"
```

---

## 📖 各Systemの役割

### FranchiseSystem
**役割:** 加盟店登録（データ書き込み）

**主要アクション:**
- `submitRegistration` - 登録フォーム送信
- `registerFranchise` - 加盟店登録処理

**依存:**
- MerchantSystem (データフォーマット)
- AdminSystem (ステータス管理)

**影響:**
- フロント: `franchise-register`
- データ: Spreadsheet書き込み（全列）

### MerchantSystem
**役割:** 加盟店ポータル（データ読み取り・認証）

**主要アクション:**
- `verifyFirstLogin` - 初回ログインURL検証
- `setPassword` - パスワード設定
- `verifyLogin` - ログイン認証
- `getMerchantData` - 加盟店データ取得

**依存:**
- FranchiseSystem (データ書き込み)
- CompanyInfoManager (画像管理)

**影響:**
- フロント: `franchise-dashboard`, `first-login.html`
- データ: Spreadsheet読み取り

### AdminSystem
**役割:** 管理ダッシュボード（承認・管理）

**主要アクション:**
- `getRegistrationRequests` - 登録申請一覧取得
- `approveRegistration` - 承認処理
- `rejectRegistration` - 却下処理
- `updateMerchantData` - 加盟店データ更新

**依存:**
- FranchiseSystem (登録データ)
- MerchantSystem (加盟店データ)
- SlackApprovalSystem (Slack通知)

**影響:**
- フロント: `admin-dashboard`
- データ: Spreadsheet読み書き

---

## 🔍 トラブルシューティング

### テストが失敗する
```bash
# ログを確認
cat test-results-*.log

# 構文エラーの場合
node --check systems/franchise/FranchiseSystem.js
```

### DataLayerが見つからない
```bash
# .claspignoreを確認
cat .claspignore

# shared/DataLayer.js が除外されていないことを確認
```

### SystemRouterでルーティングされない
```javascript
// main.jsでルーティング情報を表示
SystemRouter.printRoutes();
```

---

## 📝 今後の改善提案

### 優先度: 高
1. **各SystemでDataLayerを統一的に使用**
   - 現在はFranchiseSystemのみ
   - MerchantSystem, AdminSystemでも導入

2. **統合テストの拡充**
   - 実際のAPIエンドポイントテスト
   - データ整合性テスト

### 優先度: 中
3. **DataLayerのバージョニング**
   - データフォーマット変更時の自動マイグレーション
   - 後方互換性の保証

4. **エラーログの一元管理**
   - Stackdriverへの統合
   - アラート設定

### 優先度: 低
5. **パフォーマンス最適化**
   - バッチ更新の最適化
   - キャッシング導入

---

## ✅ まとめ

### 短期対策（完了）
- ✅ 依存関係の明文化
- ✅ 統合テストスクリプト
- ✅ デプロイ前チェックリスト

### 中期対策（完了）
- ✅ API境界の明確化（SystemRouter）
- ✅ DataLayerによるデータアクセス統一

### 次のステップ
1. 各SystemファイルでDataLayerの使用を拡大
2. 統合テストの実運用
3. デプロイ前チェックリストの徹底

---

**作成日:** 2025年10月31日
**バージョン:** 1.0
**作成者:** システム統合チーム
