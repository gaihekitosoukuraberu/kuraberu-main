# GAS Functions - フランチャイズダッシュボード

## 概要
このディレクトリには、フランチャイズダッシュボードシステムのGoogle Apps Script (GAS) 関数が格納されています。

## ファイル構成

### main.js
**役割:** すべてのdoPost/doGetリクエストの中央ルーティング

複数のシステムが混在していますが、すべてのHTTPリクエストはこのファイルを経由します。

**処理フロー:**
```
リクエスト → doPost/doGet → actionパラメータで分岐 → 各機能関数へ
```

**対応アクション:**
- `generateStaticHTML` → 静的HTML生成
- `saveMerchantData` → 加盟店情報保存
- `savePreviewSettings` → プレビュー設定保存
- `getPreviewSettings` → プレビュー設定読み込み

### merchantPortal.js
**役割:** 加盟店ポータル機能

**機能:**
1. **会社情報の保存** (`saveMerchantData`)
   - 加盟店の基本情報を保存

2. **プレビュー設定の保存** (`savePreviewSettings`)
   - メインビジュアル画像の調整設定を保存
   - スプレッドシート「プレビュー」シートに保存
   - カラム構成:
     - A列: 加盟店ID
     - B列: メインビジュアル位置X (0-100%)
     - C列: メインビジュアル位置Y (0-100%)
     - D列: メインビジュアルズーム (100-150%)
     - E列: メインビジュアル明るさ (20-100%)
     - F列: メインビジュアル文字色 (white/black)
     - G列: 更新日時

3. **プレビュー設定の読み込み** (`loadPreviewSettings`)
   - 保存された画像調整設定を読み込み
   - データがない場合はデフォルト値を返す

### generateStaticHTML.js
**役割:** 静的HTML生成機能

**機能:**
- SEO最適化されたHTMLページを生成
- OGPタグ、構造化データ（JSON-LD）を含む
- プレビュー設定を反映した画像表示
- FTP経由でサーバーにアップロード

## デプロイ手順

### 1. Google Apps Scriptプロジェクトに配置
各`.js`ファイルを以下の順序でGASプロジェクトにコピー:
1. `main.js` (最初に配置)
2. `merchantPortal.js`
3. `generateStaticHTML.js`

### 2. Webアプリとして公開
1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類: Webアプリ
3. 実行ユーザー: 自分
4. アクセスできるユーザー: 全員
5. デプロイ後、URLをコピー

### 3. フロントエンドに設定
`env-loader.js` でGAS URLを設定:
```javascript
window.GAS_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## トラブルシューティング

### エラー: "Unknown action"
- `main.js`の`doPost`/`doGet`関数でactionが正しくルーティングされているか確認
- フロントエンドから送信している`action`パラメータを確認

### エラー: "加盟店データシートが見つかりません"
- スプレッドシートに「加盟店データ」シートが存在するか確認
- シート名が完全一致しているか確認（全角半角、スペースなど）

### プレビュー設定が保存されない
1. スプレッドシートに「プレビュー」シートが自動作成されているか確認
2. GASのログで`savePreviewSettings`が正常に実行されているか確認
3. フロントエンドのコンソールで`merchantId`が正しく設定されているか確認

## 設計思想

### スパゲッティ化の防止
1. **中央ルーティング**: すべてのリクエストは`main.js`を経由
2. **機能分離**: 各システムは独立したファイルに分離
3. **共通関数の最小化**: `createSuccessResponse`/`createErrorResponse`のみ共通化
4. **明確な命名規則**: アクション名は機能を明確に示す

### 拡張性
新しいシステムを追加する場合:
1. 新しいJSファイルを作成 (例: `newSystem.js`)
2. `main.js`にルーティングを追加
3. 独立して動作するように設計

## 更新履歴
- 2025-10-05: プレビュー設定保存機能を追加
- 2025-10-05: main.jsによる中央ルーティング実装
