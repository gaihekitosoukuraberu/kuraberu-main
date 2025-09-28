# 管理ダッシュボード デプロイメント手順

## 本番環境へのデプロイ

### 1. アップロードするファイル
```
admin-dashboard/
├── index.html
└── js/
    └── dashboard-api.js
```

### 2. サーバー設定
- **アップロード先**: Webサーバーの公開ディレクトリ
- **URL例**: https://yourdomain.com/admin-dashboard/

### 3. デプロイコマンド（FTP/SFTP使用の場合）
```bash
# サーバーにディレクトリを作成
ssh user@server "mkdir -p /var/www/html/admin-dashboard/js"

# ファイルをアップロード
scp /Users/ryuryu/admin-dashboard/dist/index.html user@server:/var/www/html/admin-dashboard/
scp /Users/ryuryu/admin-dashboard/dist/js/dashboard-api.js user@server:/var/www/html/admin-dashboard/js/
```

### 4. 権限設定
```bash
ssh user@server "chmod 644 /var/www/html/admin-dashboard/index.html"
ssh user@server "chmod 644 /var/www/html/admin-dashboard/js/dashboard-api.js"
ssh user@server "chmod 755 /var/www/html/admin-dashboard"
ssh user@server "chmod 755 /var/www/html/admin-dashboard/js"
```

## 重要な注意事項

### GAS API エンドポイント
現在の設定:
- **GAS URL**: `https://script.google.com/macros/s/AKfycbw0qhIq5wd1Ioem-gHoqvodpl2FxzBY-F5AHePrWbnG5DtNIdeRPKRlFppAiUv5gx39Hg/exec`
- この URL は Google Apps Script の本番デプロイメント URL です
- 変更が必要な場合は `js/dashboard-api.js` の6行目を更新してください

### セキュリティ設定
1. HTTPSを使用すること（必須）
2. 適切なアクセス制限を設定
3. ログイン機能が含まれているため、セキュアな環境で運用

### 確認事項
デプロイ後、以下を確認してください：
1. ログイン機能が正常に動作するか
2. 加盟店登録申請データが正しく表示されるか
3. 承認・却下ボタンが正常に動作するか
4. Google Sheetsへのデータ反映が正常か

## トラブルシューティング

### データが表示されない場合
1. ブラウザの開発者ツールでコンソールエラーを確認
2. GAS APIへのアクセスが可能か確認
3. CORSエラーが発生していないか確認

### ログインできない場合
1. LocalStorageが有効になっているか確認
2. HTTPSで接続しているか確認