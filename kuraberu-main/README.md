# 外壁塗装くらべる - AIで最適な業者を無料で比較

外壁塗装業者の比較サイトのランディングページです。コンポーネントベースのモジュラーアーキテクチャで構築されています。

## プロジェクト構造

```
lp_project/
  index.html               # 300行未満。読み込むだけの薄いシェル
  src/
    components/            # header, hero, priceForm, wizard, footer など
    css/                   # 各 component 用 CSS。BEM 命名、≤300行
    js/
      main.js              # 入口（300行未満、ESM import）
      modules/             # priceCard.js, wizard.js, apiStub.js, zipValidator.js など
  tests/                   # Jest テストファイル
```

## 技術スタック

- HTML5
- CSS3 (BEM命名規則)
- JavaScript (ES Modules)
- Tailwind CSS
- Jest (テストフレームワーク)

## 特徴

- コンポーネントベースのアーキテクチャ
- BEM命名規則に準拠したCSS
- ES Modulesパターンを採用したJavaScript
- 郵便番号による地域判定機能
- 複数ステップのウィザードフォーム
- APIスタブを利用したモック連携
- Jest によるユニットテスト

## セットアップ手順

1. リポジトリをクローン
   ```
   git clone <repository-url>
   cd lp_project
   ```

2. 依存関係をインストール
   ```
   npm install
   ```

3. 開発サーバーを起動
   ```
   npm start
   ```

4. テストを実行
   ```
   npm test
   ```

## コンポーネント

### 1. ヘッダー (header.html)
サイトのヘッダーセクション。ロゴ、ナビゲーション、CTAボタンを含みます。

### 2. ヒーロー (hero.html)
メインビジュアルとキャッチフレーズ、簡単な説明を含むヒーローセクション。

### 3. 価格フォーム (priceForm.html)
郵便番号入力による地域ごとの相場価格を表示するセクション。

### 4. ウィザード (wizard.html)
複数ステップのウィザード式質問フォームで、最適な業者を診断します。

### 5. フッター (footer.html)
サイトのフッターセクション。各種リンク、コピーライト情報を含みます。

## JavaScript モジュール

### main.js
アプリケーションのエントリーポイント。コンポーネントのロードと初期化を行います。

### componentLoader.js
HTMLコンポーネントを動的にロードするモジュール。

### formValidator.js
フォームのバリデーションを行うモジュール。

### priceForm.js
価格フォームの機能を提供するモジュール。

### wizard.js
ウィザード式質問フォームの機能を提供するモジュール。

### zipValidator.js
郵便番号のバリデーションと地域情報の取得を行うモジュール。

### apiStub.js
API連携のスタブ実装を提供するモジュール。本番環境では実際のAPIに置き換えます。