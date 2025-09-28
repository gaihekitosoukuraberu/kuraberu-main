# AI検索機能 JSONPエラー修正ガイド

## 🔴 現在のエラー状況
加盟店登録ページでAI検索機能がJSONPエラーで動作しない

## 🔧 修正手順

### 1. GAS側の確認（最優先）
```javascript
// GAS側で確認すべきポイント
function doGet(e) {
  // searchCompanyアクションの処理を確認
  if (e.parameter.action === 'searchCompany') {
    const companyName = e.parameter.companyName;
    const callback = e.parameter.callback; // 重要: callbackパラメータを受け取っているか

    // データ取得処理
    const data = searchCompanyData(companyName);

    // JSONP形式で返す（ここが重要）
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}
```

### 2. フロントエンド側の確認
```javascript
// ai-assistant.js の修正ポイント
async searchCompanyInfo(companyName) {
  return new Promise((resolve) => {
    const callbackName = 'aiCallback_' + Date.now();

    // 1. コールバック関数を先に定義
    window[callbackName] = (data) => {
      console.log('AI検索レスポンス受信:', data); // デバッグ用
      // 処理
      delete window[callbackName];
      resolve(data);
    };

    // 2. スクリプトタグでリクエスト
    const script = document.createElement('script');
    const params = new URLSearchParams({
      action: 'searchCompany',
      companyName: companyName,
      callback: callbackName // 重要: コールバック名を送信
    });

    // 3. URL確認
    console.log('AI検索リクエストURL:', this.gasUrl + '?' + params);

    script.src = this.gasUrl + '?' + params;
    script.onerror = () => {
      console.error('JSONP読み込みエラー');
      delete window[callbackName];
      resolve(null);
    };

    document.body.appendChild(script);
  });
}
```

### 3. デバッグ手順
```bash
# 1. ブラウザのコンソールで直接テスト
window.testCallback = function(data) { console.log('Response:', data); };
const script = document.createElement('script');
script.src = 'https://script.google.com/macros/s/[GAS_ID]/exec?action=searchCompany&companyName=テスト&callback=testCallback';
document.body.appendChild(script);

# 2. ネットワークタブで確認
- レスポンスが返ってきているか
- レスポンスの形式が正しいか（callback(data)形式）
```

### 4. 一時的な回避策
```javascript
// JSONP失敗時のフォールバック
async searchCompanyInfoWithFallback(companyName) {
  try {
    // まずJSONPを試す
    const result = await this.searchCompanyInfo(companyName);
    if (result) return result;

    // 失敗したら手動入力を促す
    alert('AI検索が一時的に利用できません。手動で入力してください。');
    return null;
  } catch (error) {
    console.error('AI検索エラー:', error);
    return null;
  }
}
```

## 📝 チェックリスト
- [ ] GAS URLが正しいか確認（最新: AKfycbxZTvpnE3Yzold1neDzznWSTUBAjBn73l4lu398Fk0oIP0GoJwznkcMAOfelv38wTZYCQ）
- [ ] GAS側でcallbackパラメータを受け取っているか
- [ ] GAS側でJSONP形式（callback(data)）で返しているか
- [ ] フロントエンドでcallbackパラメータを送信しているか
- [ ] コールバック関数が先に定義されているか
- [ ] タイムアウト設定が適切か（60秒）

## 🚨 緊急対応
もしすぐに修正できない場合：
1. ai-assistant.jsのisEnabledをfalseに設定
2. 手動入力のみで運用
3. ユーザーに通知（「AI検索機能は現在メンテナンス中」）