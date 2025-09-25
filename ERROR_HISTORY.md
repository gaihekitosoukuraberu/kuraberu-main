# エラー履歴と解決方法

## 🔴 よくあるエラーと対処法

### 1. GAS URL関連エラー
**症状**: `JSONP読み込みエラー`、API通信失敗
**原因**: GASのデプロイURL不一致
**解決方法**:
```javascript
// 全ファイルのGAS URLを統一
const GAS_URL = 'https://script.google.com/macros/s/最新のID/exec';
```
**該当ファイル**:
- franchise-register/js/gas-config.js
- admin-dashboard/js/dashboard-api.js
- franchise-dashboard/merchant-portal/*.html

### 2. 2000文字制限エラー
**症状**: 加盟店登録時にデータ送信失敗
**原因**: POST制限（2000文字）超過
**解決方法**:
```javascript
// データ圧縮処理
if (data.prText.length > 50) {
  data.prTextFull = data.prText; // 完全版を別保存
  data.prText = data.prText.substring(0, 47) + '...';
}
```

### 3. スプレッドシート列ズレ
**症状**: データが違う列に保存される
**原因**: 列インデックスの不一致
**正しい列マッピング**:
```
A列: ID
B列: 登録日時
C列: 会社名
D列: 代表者名
...
N列: PR文
```

### 4. CORS/JSONP エラー
**症状**: Cross-Origin Request Blocked
**解決方法**: JSONPコールバック使用
```javascript
const callbackName = 'callback_' + Date.now();
window[callbackName] = function(data) {
  // 処理
  delete window[callbackName];
};
```

### 5. 認証トークンエラー
**症状**: 加盟店ログイン失敗
**原因**: トークン有効期限切れ（24時間）
**解決方法**: 再度パスワードリセットメール送信

## 📝 デバッグチェックリスト

- [ ] GAS URLが全ファイルで統一されているか
- [ ] スプレッドシートIDが正しいか
- [ ] JSONPコールバックが正しく設定されているか
- [ ] データ圧縮処理が実装されているか
- [ ] エラーログが出力されているか（console.error）
- [ ] try-catchでエラーハンドリングされているか

## 🚨 緊急時の対処法

### システム全体が動かない
1. 最新のGASデプロイURLを確認
2. スプレッドシートのアクセス権限確認
3. Slackトークン有効性確認

### データが保存されない
1. スプレッドシートの行数制限確認（100万行）
2. GASの実行時間制限確認（6分）
3. トリガー設定の確認

### 本番環境で動かない
1. HTTPSで接続しているか確認
2. LocalStorageが有効か確認
3. サーバーのファイル権限確認（644）

## 💡 予防策

1. **変更前にバックアップ**
```bash
cp file.js file.js.backup_$(date +%Y%m%d)
```

2. **テスト環境で検証**
```javascript
// test-config.js
const IS_TEST = true;
const GAS_URL = IS_TEST ? 'テストURL' : '本番URL';
```

3. **段階的デプロイ**
- Step1: ローカルテスト
- Step2: テスト環境デプロイ
- Step3: 一部ユーザーでテスト
- Step4: 本番全体デプロイ