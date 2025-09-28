# チャットボット実装ガイド

## 📁 ファイル構成
```
/Users/ryuryu/chatbot-word-link/
├── chatbot.html          # メインHTML
├── chatbot.js           # JavaScript実装
├── bot-scenarios.json   # シナリオデータ
└── IMPLEMENTATION_GUIDE.md # このファイル
```

## 🔄 フロー概要
1. **キーワード流入** → グリーティング
2. **1〜3問目** → 郵便番号ヒアリング
3. **相場表示** → 60〜180万円（即座に表示）
4. **質問続行** → questions-data.jsonベースの詳細質問
5. **CV1** → 電話番号ヒアリング（コンバージョン1）
6. **ランキング表示** → 業者一覧
7. **CV2** → 見積もり依頼（コンバージョン2）

## 🎯 URLパラメータ
```
chatbot.html?keyword=塗料        # 塗料シナリオ
chatbot.html?keyword=予算50万円以下 # 予算シナリオ
chatbot.html?keyword=general     # デフォルト
```

## ⚠️ 本番実装時の修正箇所

### 1. 外部ランキング連携
**現在（テスト）:**
```javascript
// 内部でランキング表示
this.ui.showRanking(companies, area);
```

**本番実装:**
```javascript
// 外部システムにデータ送信
const rankingData = {
    postalCode: this.userData.postalCode,
    phoneNumber: this.userData.phoneNumber,
    answers: this.userData.answers,
    scenario: this.currentScenario.id
};
await sendToExternalRanking(rankingData);
```

### 2. フォーム表示制御
**現在（テスト）:**
```javascript
// 直接フォームページへリダイレクト
window.location.href='/estimate-form.html'
```

**本番実装:**
```javascript
// キープボタンからサイト下部にフォーム表示
showEstimateForm({
    companies: selectedCompanies,
    userData: this.userData
});
```

### 3. questions-data.json完全実装
**現在（テスト）:**
- 簡略版の質問フロー（Q001→Q004→Q014→Q015）

**本番実装:**
- questions-data.jsonの分岐ロジック完全実装
- 条件分岐、スキップロジック、動的質問生成

## 🔗 API連携

### 郵便番号API
```javascript
// 既に実装済み
https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}
```

### 外部システム連携（要実装）
```javascript
// 業者ランキングAPI
POST /api/ranking
{
    "postalCode": "1234567",
    "phoneNumber": "09012345678",
    "scenario": "paint",
    "answers": {...}
}

// GAS連携
POST https://script.google.com/macros/s/YOUR_ID/exec
{
    "action": "submitChatbotData",
    "data": {...}
}
```

## 🎨 デザイン要件

### 既存システム完全準拠
- estimate-keep-systemと同一のUI/UX
- カラーパレット: #7B9BF0（メインブルー）
- フォント: Noto Sans JP
- アニメーション: fadeIn, typing効果

### レスポンシブ対応
```css
@media (max-width: 640px) {
    /* モバイル対応 */
}
```

## 📊 トラッキング

### イベント計測
```javascript
// 郵便番号入力
console.log('📍 郵便番号入力完了', postalCode);

// CV1達成
console.log('✅ CV1達成: 電話番号入力完了', phoneNumber);

// ランキング表示
console.log('✅ ランキング表示完了');

// CV2達成
console.log('✅ CV2ボタン表示完了');
```

### Google Analytics連携（要実装）
```javascript
// GTM連携例
dataLayer.push({
    'event': 'chatbot_cv1',
    'scenario': scenarioId,
    'postal_code': postalCode
});
```

## 🔧 カスタマイズ

### 新シナリオ追加
1. `bot-scenarios.json`の`entryScenarios`に追加
2. 必要に応じて`skipQuestions`設定
3. カスタムフローが必要な場合は`customFlow`定義

### 質問内容変更
- `commonQuestions`セクションで質問内容修正
- 分岐ロジックは`branches`配列で制御

## 🚀 デプロイ

### 本番環境
1. ファイル一式をWebサーバーにアップロード
2. HTTPSで配信
3. CORS設定（API連携用）

### テスト環境
```bash
cd /Users/ryuryu/chatbot-word-link
python3 -m http.server 8765
```

## 🐛 既知の制限事項

1. **質問フロー簡略版** - 本番ではquestions-data.jsonの完全実装が必要
2. **内部ランキング表示** - 外部システム連携が必要  
3. **CV2フォーム** - キープボタン→下部表示ロジック要実装

## 📞 サポート

実装で不明な点があれば、このガイドを参照してください。
外部システム連携の詳細仕様は別途打ち合わせが必要です。