# 🔧 スマホログイン問題 - デプロイ修正手順

## 問題の概要

**症状**: iPhoneからadmin-dashboardにログインできない（エラー: `ネットワークエラー：verifyAdminLogin`）

**原因**: サーバー上の `env-loader.js` に古い（切れた）GAS_URLが保存されている

```
❌ サーバー上の古いURL（問題）:
https://script.google.com/macros/s/AKfycbxGBYjSiaHmFj/exec

✅ 正しいURL（最新版）:
https://script.google.com/macros/s/AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj/exec
```

## 🚀 修正手順

### ステップ1: デプロイ状態の確認

1. `deployment-check.html` をサーバーにアップロード
2. ブラウザで開く: `https://gaihekikuraberu.com/admin-dashboard/deployment-check.html`
3. チェック結果を確認

### ステップ2: サーバー上のファイルを更新

#### Cyberduckを使う場合

1. Cyberduckでサーバーに接続
2. `/admin-dashboard/js/` フォルダを開く
3. **重要**: サーバー上の古い `env-loader.js` を削除
4. ローカルの `admin-dashboard/js/env-loader.js` をアップロード
5. アップロード完了を確認（ファイルサイズとタイムスタンプをチェック）

#### FTPクライアント（FileZilla等）を使う場合

1. FTPでサーバーに接続
2. `/admin-dashboard/js/` フォルダを開く
3. サーバー上の `env-loader.js` を削除
4. ローカルの `env-loader.js` をアップロード（上書きではなく、削除→新規アップロード）

### ステップ3: キャッシュクリア

#### iPhone Safari の場合

1. **設定アプリ** を開く
2. **Safari** を選択
3. **履歴とWebサイトデータを消去** をタップ
4. **Safariアプリを完全終了**:
   - ホームボタン2回押し（またはホーム画面から上スワイプ）
   - マルチタスク画面でSafariを上にスワイプして終了
5. Safariを再起動

#### PCブラウザの場合

- **Chrome**: Ctrl+Shift+Delete → すべてクリア
- **Safari**: 環境設定 → プライバシー → Webサイトデータを管理 → すべて削除
- **Edge**: Ctrl+Shift+Delete → すべてクリア

### ステップ4: 動作確認

1. `deployment-check.html` を再度開く
2. すべてのチェックが✅になっていることを確認
3. `index.html` からログインを試す
4. スマホでもログインできることを確認

## 📋 チェックリスト

デプロイ前に確認してください：

- [ ] ローカルの `env-loader.js` (26行目) が正しいGAS_URLになっている
- [ ] ローカルの `env-loader.js` (49行目) のCACHE_BUSTERが `'1763383833000'` (V1815)
- [ ] サーバー上の古い `env-loader.js` を削除した
- [ ] 新しい `env-loader.js` をアップロードした
- [ ] ファイルサイズが正しい（約2KB程度）
- [ ] `deployment-check.html` でチェックが通る
- [ ] PCでログインできる
- [ ] スマホでログインできる

## 🔍 トラブルシューティング

### Q1: deployment-check.htmlで「GAS_URLが古い」と表示される

**A**: サーバー上のenv-loader.jsが正しく更新されていません
- 対処: サーバー上の古いファイルを削除してから再アップロード
- Cyberduckのキャッシュがある可能性もあるので、FTPクライアントを再起動

### Q2: ファイルをアップロードしても変わらない

**A**: ブラウザキャッシュが残っています
- 対処:
  1. ブラウザのキャッシュを完全削除
  2. シークレットモード/プライベートブラウジングで確認
  3. URLに `?v=1763383833000` を追加してアクセス

### Q3: PCではログインできるがスマホではできない

**A**: スマホのブラウザキャッシュが強力です
- 対処:
  1. Safari完全終了（マルチタスクから終了）
  2. iPhone再起動
  3. WiFi/モバイルデータ切り替え
  4. プライベートブラウジングで試す

### Q4: 「env-loader.jsが見つからない」エラー

**A**: ファイルパスが間違っています
- 確認: サーバー上のパスは `/admin-dashboard/js/env-loader.js`
- index.htmlの読み込みパスは `<script src="js/env-loader.js"></script>`

## 📝 ファイル情報

### 最新版の識別情報

```javascript
// env-loader.js の先頭コメント
// キャッシュバスター（V1815 - 2025-11-17 - スマホログインデバッグ）
CACHE_BUSTER: '1763383833000'

// 正しいGAS_URL
GAS_URL: 'https://script.google.com/macros/s/AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj/exec'
```

### ファイルサイズ参考値

- `env-loader.js`: 約2KB
- `api-client.js`: 約6KB
- `index.html`: 約350KB

## ⚠️ 注意事項

1. **削除→アップロードの順序を守る**: 上書きではなく、必ず削除してからアップロード
2. **Cyberduckのキャッシュ**: FTPクライアントのキャッシュが問題を起こす場合があるため、アップロード後に再接続して確認
3. **タイムスタンプ確認**: サーバー上のファイルのタイムスタンプが最新（2025-11-17 21:50以降）になっているか確認
4. **複数ファイル更新**: env-loader.js, api-client.js, index.html の3ファイルすべて更新する

## 📞 サポート

問題が解決しない場合は、deployment-check.htmlのデバッグ情報（ENV全体の出力）をスクリーンショットで保存して確認してください。
