# 🚨 重要：GASエディタで更新が必要です

## 更新が必要なファイル

### 1. adminDashboardHandler.gs
最新版をコピーしてGASエディタの`adminDashboardHandler.gs`を全て置き換えてください。

**追加された機能：**
- `handleAdminGetRequest()` 関数（JSONP対応のGETリクエスト処理）

### 2. router.gs
以下の部分を更新してください：

#### GETリクエストのルーティング部分（routeGetRequest関数内）に追加：

```javascript
// 管理ダッシュボード用（JSONP対応）
case 'getRegistrationRequests':
  return handleAdminGetRequest(params);
```

`case 'getFranchiseList':` の後、`case 'searchCompany':` の前に追加してください。

## 更新後の手順

1. GASエディタで上記の変更を適用
2. **保存**（Ctrl+S または Cmd+S）
3. **デプロイ** → **デプロイを管理**
4. **編集**ボタンをクリック
5. **バージョン**を「新バージョン」に変更
6. **デプロイ**をクリック

これでJSONPエラーが解決し、管理ダッシュボードからスプレッドシートのデータが取得できるようになります。

## 確認方法

1. 管理ダッシュボードにログイン
2. 「加盟店登録申請管理」を開く
3. ブラウザのコンソールでエラーが出ないことを確認
4. 実際のデータが表示されることを確認