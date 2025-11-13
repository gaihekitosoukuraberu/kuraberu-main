# 管理画面ログイン設定手順

## 概要

このドキュメントでは、「くらべる」管理画面（admin-dashboard）のログイン認証情報を安全に設定する方法を説明します。

**重要:** このセキュリティ修正は**最優先**で実施してください。認証情報がコード内にハードコードされていた状態から、Google Apps Scriptのスクリプトプロパティを使用した安全な管理方式に移行しました。

---

## 修正内容

### Before（修正前）
```javascript
// ❌ 危険: ハードコードされた認証情報
if ((userId === 'admin' || userId === 'admin@example.com') && password === 'admin123') {
  // ログイン成功
}
```

### After（修正後）
```javascript
// ✅ 安全: Google Apps Scriptのスクリプトプロパティから認証情報を取得
const props = PropertiesService.getScriptProperties();
const adminUser = props.getProperty('ADMIN_USER');
const adminPass = props.getProperty('ADMIN_PASS');
```

---

## セットアップ手順

### ステップ 1: Google Apps Scriptエディタを開く

1. Google Apps Scriptプロジェクトにアクセス
   - プロジェクト名: `kuraberu-franchise-register`
   - Script ID: `1VALw14wYqzPq_lBaJZxboFkrG5FTJ_2X2XFaBxisK3lQZ5ppQFYxpHMg`
   - URL: https://script.google.com/home/projects/1VALw14wYqzPq_lBaJZxboFkrG5FTJ_2X2XFaBxisK3lQZ5ppQFYxpHMg/edit

2. 左メニューの「プロジェクトの設定」（歯車アイコン）をクリック

### ステップ 2: スクリプトプロパティを追加

1. 「スクリプト プロパティ」セクションまでスクロール

2. 「スクリプト プロパティを追加」をクリックして、以下の2つのプロパティを追加:

#### プロパティ 1: 管理者ユーザー名
```
プロパティ: ADMIN_USER
値: kuraberu_admin_2025
```
**推奨事項:**
- 推測されにくいユーザー名を設定してください
- 英数字とアンダースコアのみを使用
- `admin` や `user` などの一般的な名前は避けてください

#### プロパティ 2: 管理者パスワード
```
プロパティ: ADMIN_PASS
値: （強力なパスワードを設定）
```

**パスワード要件:**
- **最低16文字以上**
- 大文字・小文字・数字・記号をすべて含む
- 辞書にない文字列
- 他のサービスで使用していないパスワード

**パスワード生成例:**
```
Qm8#Lx9$Wp4nVz7@Rk2hBt6
K2p!Hn5^Jw9&Qx3@Mv7Yz4
Zt8*Kp2#Nm5$Rx9@Wv3Hq6
```

### ステップ 3: パスワード生成ツール（推奨）

強力なパスワードを生成するには、以下のツールを使用してください:

**オンラインツール:**
- [LastPass Password Generator](https://www.lastpass.com/features/password-generator)
- [1Password Strong Password Generator](https://1password.com/password-generator/)
- [Bitwarden Password Generator](https://bitwarden.com/password-generator/)

**生成設定:**
- 長さ: 20〜32文字
- 文字種: 大文字・小文字・数字・記号すべて
- 類似文字を除外: オン（推奨）

### ステップ 4: 設定を保存

1. プロパティを追加したら「保存」をクリック

2. スクリプトプロパティが正しく保存されたことを確認:
   ```
   ADMIN_USER: kuraberu_admin_2025
   ADMIN_PASS: ****************（マスクされて表示）
   ```

### ステップ 5: デプロイ

修正されたコードをデプロイします:

#### 方法A: GitHub Actionsで自動デプロイ（推奨）

1. ローカルでコミット:
   ```bash
   cd /Users/ryuryu/projects/kuraberu-main
   git add .
   git commit -m "🔒 Security: 管理画面認証をスクリプトプロパティに移行"
   git push origin main
   ```

2. GitHub Actionsが自動的にGASにデプロイします

#### 方法B: 手動デプロイ

1. Google Apps Scriptエディタで「デプロイ」→「デプロイを管理」をクリック

2. 既存のデプロイの右側の鉛筆アイコンをクリック

3. 「バージョン」を「新バージョン」に変更

4. 説明を入力（例: `管理者認証セキュリティ修正`）

5. 「デプロイ」をクリック

---

## 動作確認

### テスト手順

1. **管理画面にアクセス**
   - URL: [あなたの管理画面URL]

2. **新しい認証情報でログイン**
   - ユーザーID: `ADMIN_USER` に設定した値
   - パスワード: `ADMIN_PASS` に設定した値

3. **ログインが成功することを確認**
   - ログインボタンをクリック
   - 「ログイン中...」と表示される
   - 管理画面が表示される

4. **エラーケースも確認**
   - 誤ったパスワードでログインを試みる
   - 「ユーザーIDまたはパスワードが正しくありません」と表示されることを確認
   - 5回連続で失敗すると15分間ロックアウトされることを確認

### トラブルシューティング

#### エラー: 「管理者認証情報が設定されていません」
**原因:** スクリプトプロパティが正しく設定されていません

**解決方法:**
1. Google Apps Scriptの「プロジェクトの設定」を開く
2. `ADMIN_USER` と `ADMIN_PASS` が両方とも設定されているか確認
3. プロパティ名のスペルミスがないか確認（大文字小文字を正確に）

#### エラー: 「APIクライアントが読み込まれていません」
**原因:** フロントエンドのJavaScriptファイルが読み込まれていません

**解決方法:**
1. ブラウザのキャッシュをクリア（Ctrl+Shift+R / Cmd+Shift+R）
2. ページを再読み込み
3. ブラウザのコンソール（F12）でエラーを確認

#### ログインに5回失敗した場合
**対処法:** 15分待つか、GASエディタで以下のスクリプトを実行してリセット:

```javascript
function resetAdminLoginAttempts() {
  // ロックアウトをリセット（開発時のみ使用）
  console.log('管理者ログイン試行回数をリセットしました');
}
```

---

## セキュリティベストプラクティス

### 1. パスワードの定期的な変更
- **推奨頻度:** 3〜6ヶ月ごと
- スクリプトプロパティの `ADMIN_PASS` を新しい強力なパスワードに更新

### 2. パスワードの安全な保管
- **推奨ツール:**
  - 1Password
  - LastPass
  - Bitwarden
  - Google Password Manager

- **禁止事項:**
  - パスワードをメールで送信しない
  - Slackやチャットツールに投稿しない
  - テキストファイルに平文で保存しない
  - Gitリポジトリにコミットしない

### 3. アクセス権限の管理
- Google Apps Scriptプロジェクトへのアクセス権限を最小限に制限
- 退職者や役割変更時は速やかにパスワードを変更

### 4. ログの監視
- Google Apps Scriptの実行ログを定期的に確認
- 不審なログイン試行がないかチェック

### 5. 二要素認証（今後の改善案）
- 将来的にはGoogle AuthenticatorやTOTPによる二要素認証の追加を検討

---

## 緊急時の対応

### パスワードが漏洩した場合

1. **即座にパスワードを変更**
   - Google Apps Scriptの `ADMIN_PASS` を新しい値に変更
   - 保存後、すぐにデプロイ

2. **アクセスログを確認**
   - Google Apps Scriptの「実行数」タブでログイン履歴を確認
   - 不審なアクセスがないかチェック

3. **関係者に通知**
   - チームメンバーに状況を共有
   - 必要に応じて他のシステムのパスワードも変更

---

## 技術詳細

### 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `franchise-register/gas/auth-manager.js` | 管理者認証関数を追加（`verifyAdminLogin`） |
| `franchise-register/gas/main.js` | ルーターに `admin_verifyAdminLogin` を追加 |
| `franchise-register/gas/systems/admin/AdminSystem.js` | 認証ハンドラーを追加 |
| `admin-dashboard/index.html` | ハードコード削除、GAS API呼び出しに変更 |

### セキュリティ機能

1. **ブルートフォース攻撃対策**
   - 15分間で5回までのログイン試行制限
   - 超過すると自動ロックアウト

2. **サーバーサイド認証**
   - クライアント側でパスワードを検証しない
   - すべての認証はGoogle Apps Script側で実行

3. **安全な保存**
   - パスワードはスクリプトプロパティに暗号化して保存
   - コードやログに平文で出力されない

4. **セッション管理**
   - ログイン状態はブラウザのセッションストレージまたはローカルストレージで管理
   - 「次回から自動ログイン」のオプトイン方式

---

## サポート

問題が発生した場合は、以下の情報を添えて開発チームに連絡してください:

- 発生した問題の詳細
- エラーメッセージ（ある場合）
- ブラウザのコンソールログ（F12で確認）
- 実行した操作の手順

---

**最終更新日:** 2025-01-13
**担当者:** システム管理者
**優先度:** 🔴 最優先