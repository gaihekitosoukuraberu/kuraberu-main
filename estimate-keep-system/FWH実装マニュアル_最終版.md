# 🚨 【最終版】外壁塗装くらべる - FWH LP実装マニュアル

## ⚠️ 超重要：これまでの修正について

現在のデモサイトでは **別ページ遷移** になっていますが、正しくは **同ページ内でBOT起動** です。

### ❌ 現在の間違った動作
```
LP → lp-test.html（別ページ遷移） → BOT起動
```

### ✅ 正しい動作
```
LP → 【同ページ内で】BOT起動（URLそのまま）
```

---

## 🙏 **修正作業のお詫びと実装内容**

この度は、当初お渡しした実装方法に不備があり、修正作業をお願いすることとなり、大変申し訳ございません。

### **修正が必要な作業内容**
1. **BOTシステムローダーの追加**（1行のスクリプト追加）
2. **全キーワードボタンの修正**（44個のボタン修正作業）

お手数をおかけしますが、以下の手順で確実に動作する実装に修正いただけますでしょうか。

---

## 📋 **実装手順**

### **ステップ1: 郵便番号フォームの差し替え**

#### **現在の実装（削除対象）**
現在、以下のような大量のHTMLコードが埋め込まれていると思われます：

```html
<!-- ❌ 現在の実装（この部分を全て削除してください） -->
<div id="postalFormSection" style="position: fixed; bottom: 16px; right: 16px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 2px solid #93C5FD; padding: 24px; z-index: 50; width: 384px; animation: glow 3s ease-in-out infinite;">
    <style>
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1); }
            50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.2); }
        }
        #postalFormSection:hover {
            transform: scale(1.05);
            transition: transform 0.3s ease;
        }
    </style>
    <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span style="background: #22D3EE; color: white; border-radius: 9999px; padding: 4px 12px; font-size: 12px; font-weight: 500;">かんたん10秒！</span>
    </div>
    <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px; text-align: center; white-space: nowrap;">
        郵便番号で今すぐ相場チェック！
    </h2>
    <div style="display: flex; flex-direction: column; gap: 12px;">
        <input type="text" id="postalCode" placeholder="〒100-0001"
               style="width: 100%; border: 2px solid #FBBF24; border-radius: 8px; padding: 12px 16px; text-align: center; font-size: 16px; outline: none; background: #EFF6FF;">
        <button onclick="location.href='https://gaihekikuraberu.com/estimate-keep-system/lp-test.html?zip=' + encodeURIComponent(document.getElementById('postalCode').value) + '#bot-active'"
                style="width: 100%; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;">
            🔍 無料で相場を見る
        </button>
        <div style="display: flex; align-items: center; justify-content: center; font-size: 14px; color: #4B5563; gap: 4px;">
            🔒 個人情報保護・SSL暗号化通信で安全
        </div>
    </div>
</div>
<!-- ❌ ここまでを全て削除 -->
```

#### **新しい実装（差し替え）**
上記の大量HTMLを**全て削除**して、代わりに `</body>` タグの**直前**に以下の**1行だけ**追加してください：

```html
<!-- ✅ 新しい実装（1行のみ） -->
<!-- 外壁塗装くらべる BOTシステム（完全自動） -->
<script src="https://gaihekikuraberu.com/estimate-keep-system/gaiheki-bot-loader.js"></script>
</body>
</html>
```

**この1行で以下が自動実行されます：**
- ✅ 郵便番号フォームの自動生成・配置
- ✅ 必要なJSファイル10個の自動読み込み
- ✅ BOTシステムの初期化
- ✅ 全ての機能が動作可能状態

#### **郵便番号フォームの位置・サイズ調整**
自動生成される郵便番号フォームをカスタマイズしたい場合は、以下のCSSを追加してください：

```html
<!-- ✅ フォームカスタマイズ用CSS（必要に応じて追加） -->
<style>
#gaiheki-zip-form-container {
    /* 位置調整 */
    top: 20px !important;           /* 上からの距離 */
    right: 20px !important;         /* 右からの距離 */
    /* bottom: 20px !important; */   /* 下に配置したい場合 */
    /* left: 20px !important; */    /* 左に配置したい場合 */

    /* サイズ調整 */
    max-width: 350px !important;    /* 幅を小さくしたい場合 */
    /* max-width: 450px !important; */ /* 幅を大きくしたい場合 */

    /* 非表示にしたい場合 */
    /* display: none !important; */
}

/* スマホ対応 */
@media (max-width: 768px) {
    #gaiheki-zip-form-container {
        position: relative !important;
        max-width: 100% !important;
        margin: 16px;
    }
}
</style>
```

**カスタマイズ例：**
- **右下に配置**: `top` を `bottom: 20px` に変更
- **左上に配置**: `right` を `left: 20px` に変更
- **幅を小さく**: `max-width: 300px` に変更
- **一時的に非表示**: `display: none` を追加（デザイン調整時など）

---

### **ステップ2: キーワードボタンの修正**

#### **現在の状況確認**
現在、キーワードボタンは以下のような実装になっていると思われます：

```html
<!-- ❌ 現在の状況（間違い） -->
<a href="https://gaihekikuraberu.com/estimate-keep-system/lp-test.html?keyword=助成金#bot-active">
    <button class="keyword-btn">助成金</button>
</a>
<a href="https://gaihekikuraberu.com/estimate-keep-system/lp-test.html?keyword=外壁塗装#bot-active">
    <button class="keyword-btn">外壁塗装</button>
</a>
<a href="https://gaihekikuraberu.com/estimate-keep-system/lp-test.html?keyword=クチコミ#bot-active">
    <button class="keyword-btn">クチコミ</button>
</a>
```

#### **以下のように修正してください**
**手順:**
1. **`<a href="...">` と `</a>` を削除**
2. **`<button>` タグに `onclick` 属性を追加**

```html
<!-- ✅ 修正後（正解） -->
<button class="keyword-btn" onclick="startScenario('助成金')">助成金</button>
<button class="keyword-btn" onclick="startScenario('外壁塗装')">外壁塗装</button>
<button class="keyword-btn" onclick="startScenario('クチコミ')">クチコミ</button>
```

**重要:**
- `<button>` タグ自体は変更せず、**`onclick` 属性を追加するだけ**
- `<a href="...">` タグは **完全に削除**

---

## 🔗 **全44個のキーワードボタン設定（コピペ用）**

以下は**全44個**のキーワードボタンのコピペ用コードです。
**現在の `<a href="...">` を削除**して、以下をそのままコピペしてください：

### **🎯 各ボタンの動作説明**
- **クリック一発で同ページ内BOT起動**
- **キーワードごとに専用の質問フロー開始**
  - 「助成金」→ "外壁塗装に助成金を活用できると嬉しいですよね..."
  - 「クチコミ」→ "口コミの良い業者をお探しですね！"
  - 「最低価格」→ "「できるだけ安くしたい」というご希望ですね！"
- **最終的に：郵便番号入力→業者ランキング→見積もり依頼**

```html
<!-- ✅ 全44個のキーワードボタン（コピペ用） -->
<button onclick="startScenario('塗料')">塗料</button>
<button onclick="startScenario('クチコミ')">クチコミ</button>
<button onclick="startScenario('おすすめ')">おすすめ</button>
<button onclick="startScenario('最低価格')">最低価格</button>
<button onclick="startScenario('助成金')">助成金</button>
<button onclick="startScenario('外壁塗装')">外壁塗装</button>
<button onclick="startScenario('外壁張替え')">外壁張替え</button>
<button onclick="startScenario('外壁補修')">外壁補修</button>
<button onclick="startScenario('外壁＋屋根塗装')">外壁＋屋根塗装</button>
<button onclick="startScenario('屋根張り替え')">屋根張り替え</button>
<button onclick="startScenario('遮熱・断熱')">遮熱・断熱</button>
<button onclick="startScenario('火災保険')">火災保険</button>
<button onclick="startScenario('ひび割れ')">ひび割れ</button>
<button onclick="startScenario('剥がれ')">剥がれ</button>
<button onclick="startScenario('汚れ')">汚れ</button>
<button onclick="startScenario('チョーク')">チョーク</button>
<button onclick="startScenario('タイミング')">タイミング</button>
<button onclick="startScenario('施工時期')">施工時期</button>
<button onclick="startScenario('予算50万円以下')">予算50万円以下</button>
<button onclick="startScenario('予算50〜100万円')">予算50〜100万円</button>
<button onclick="startScenario('予算100〜200万円')">予算100〜200万円</button>
<button onclick="startScenario('予算150万円〜')">予算150万円〜</button>
<button onclick="startScenario('安い順')">安い順</button>
<button onclick="startScenario('実績')">実績</button>
<button onclick="startScenario('設立年数')">設立年数</button>
<button onclick="startScenario('従業員数')">従業員数</button>
<button onclick="startScenario('保有資格')">保有資格</button>
<button onclick="startScenario('職人直営')">職人直営</button>
<button onclick="startScenario('ハウスメーカー')">ハウスメーカー</button>
<button onclick="startScenario('リフォーム')">リフォーム</button>
<button onclick="startScenario('リフォームローン')">リフォームローン</button>
<button onclick="startScenario('カバー工法')">カバー工法</button>
<button onclick="startScenario('張替え')">張替え</button>
<button onclick="startScenario('補修')">補修</button>
<button onclick="startScenario('訪問業者')">訪問業者</button>
<button onclick="startScenario('高品質・長持ち')">高品質・長持ち</button>
<button onclick="startScenario('屋根材')">屋根材</button>
<button onclick="startScenario('ガルバリウム')">ガルバリウム</button>
<button onclick="startScenario('アフターフォロー')">アフターフォロー</button>
<button onclick="startScenario('各種保険')">各種保険</button>
<button onclick="startScenario('カラーシミュレーション')">カラーイメージ</button>
<button onclick="startScenario('屋上・ベランダ防水')">屋上・ベランダ防水</button>
<button onclick="startScenario('外壁＋屋根張り替え')">外壁＋屋根張り替え</button>
<button onclick="startScenario('外壁＋屋根補修')">外壁＋屋根補修</button>
<button onclick="startScenario('雨漏り')">雨漏り</button>
<button onclick="startScenario('general')">その他の相談</button>
```

**重要:**
- 上記は44個の専用キーワードボタンです
- `class` や `style` 属性が必要な場合は、`onclick` 属性の後に追加してください
- 例: `<button class="keyword-btn" onclick="startScenario('塗料')">塗料</button>`
- **「その他の相談」ボタンについて**: `general`キーワードは汎用相談用です。業者側で「その他」「一般相談」等の文言を使う場合は表示テキストのみ変更してください

---

## ✅ **実装完了後の動作確認**

修正後、以下のように動作することを確認してください：

### **1. 郵便番号フォームのテスト**
- ページを開くと、**右下に郵便番号フォーム**が自動表示される
- 郵便番号を入力（例: 1000001）
- 「無料で相場を見る」ボタンをクリック
- ✅ **同ページ内で**AIチャットとランキングが表示される
- ✅ URLが変わらない

### **2. キーワードボタンのテスト**
- 任意のキーワードボタン（例: 「クチコミ」）をクリック
- ✅ **同ページ内で**AIチャットとランキングが表示される
- ✅ URLが変わらない
- ✅ **キーワード専用の質問フロー**が開始される
  - 「クチコミ」→"口コミの良い業者をお探しですね！"から開始
  - 「助成金」→"外壁塗装に助成金を活用できると..."から開始

### **3. レスポンシブ確認**
- **PC**: 郵便番号フォームが右下に固定表示
- **スマホ**: 郵便番号フォームが適切にリサイズされる

---

## 🎯 **重要なポイント**

### **やること**
- ✅ 1行のスクリプト追加（`gaiheki-bot-loader.js`）
- ✅ 44個のキーワードボタンに `onclick` 属性追加

### **やらないこと（自動で実行される）**
- ❌ 個別JSファイルの読み込み（自動）
- ❌ 郵便番号フォームのHTML記述（自動生成）
- ❌ CSSやスタイルの追加（自動）
- ❌ 複雑な設定（不要）

---

## 📋 **実装作業まとめ**

### **作業1: 郵便番号フォーム差し替え**
- ❌ **削除**: 大量のHTMLコード（上記の `<div id="postalFormSection">...</div>` 全体）
- ✅ **追加**: 1行のスクリプト（`</body>` 直前）

### **作業2: キーワードボタン修正**
- ❌ **現在**: `<a href="...lp-test.html..."><button>キーワード</button></a>`
- ✅ **修正後**: `<button onclick="startScenario('キーワード')">キーワード</button>`

**結果：同ページ内BOT起動・URL変更なし・44種類の専用質問フロー**

---

## 📱 **レスポンシブ対応**

### **自動対応されます**
- PC・スマホ・タブレット全てで最適表示
- 郵便番号フォームの配置も自動調整
- 追加のCSS設定は不要

---

## 🔧 **トラブルシューティング**

### **Q. ボタンをクリックしても何も起こらない**
**A.** 以下を確認してください：
1. `gaiheki-bot-loader.js` が正しく読み込まれているか
2. `onclick="startScenario('...')"` が正しく記述されているか
3. ブラウザの開発者ツール（F12）でエラーが出ていないか

### **Q. 郵便番号フォームが表示されない**
**A.** `gaiheki-bot-loader.js` が読み込まれていない可能性があります。スクリプトのURLを確認してください。

### **Q. 別ページに遷移してしまう**
**A.** 古い実装（`href="...lp-test.html"`）が残っている可能性があります。これらを削除してください。

---

## ✅ **最終チェックリスト**

実装前に、以下を確認してください：

- [ ] `gaiheki-bot-loader.js` を `</body>` 直前に追加
- [ ] 全てのキーワードボタンに対応する `onclick` を追加
- [ ] 古い別ページリンク（`href="...lp-test.html"`）を削除
- [ ] PC・スマホで動作確認
- [ ] 郵便番号フォームが右下に表示される
- [ ] ボタンクリック後、同ページ内でBOTが起動する
- [ ] URLが変わらない

---

## 📞 **サポート**

実装でご不明な点がございましたら、以下までお気軽にお問い合わせください：

- **Email**: info@gaihekikuraberu.com
- **件名**: 【FWH様】LP実装について

---

## 🎉 **実装完了**

修正作業完了後、完璧な同ページ内BOTシステムが実現します。
お手数をおかけして誠に申し訳ございませんでした。

**最終更新日**: 2025-10-16
**バージョン**: 最終版 v3.0
**作成者**: 外壁塗装くらべる 開発チーム