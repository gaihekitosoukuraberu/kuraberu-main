# 🚫 絶対に触ってはいけないファイル・設定

## ⛔ 絶対変更禁止リスト

### 1. 本番稼働中のファイル
```
franchise-register/
├── index.html          # 本番登録フォーム
├── js/
│   ├── main.js        # メインロジック
│   ├── form-wizard.js # ステップ管理
│   └── validation.js  # バリデーション
└── gas/
    └── main.gs        # GASメイン（10,000行）
```

### 2. スプレッドシート設定
**シートID**: `1TK6cK8ie4QZH1BwYTefUPXej0h-MEwmiJNuC5d3NmsA`
**絶対に変更してはいけないシート**:
- 加盟店リスト（メインデータ）
- 承認済み加盟店
- 案件管理
- ランキングマスタ

### 3. GAS本番デプロイ
```
本番URL: https://script.google.com/macros/s/AKfycbxZTvpnE3Yzold1neDzznWSTUBAjBn73l4lu398Fk0oIP0GoJwznkcMAOfelv38wTZYCQ/exec
```
**注意**: このURLは本番で使用中。変更すると全システム停止。

### 4. Slack設定
```javascript
// 絶対に変更しないこと
const SLACK_WEBHOOK = 'https://hooks.slack.com/services/...';
const SLACK_TOKEN = 'xoxb-...';
```

## 🔒 変更時の必須ルール

### データベース構造
**加盟店テーブル（スプレッドシート）の列順序**:
```
A: ID（自動採番）
B: 登録日時
C: 会社名
D: 代表者名
E: 電話番号
F: メール
G: 住所
H: 対応エリア
I: ステータス
J: 承認日
K: 備考
L: 設立年月日
M: 従業員数
N: PR文
```
**警告**: 列の追加は末尾のみ。既存列の削除・移動は厳禁。

### APIエンドポイント
```javascript
// これらのactionは変更禁止
'submitFranchise'    // 加盟店登録
'approveMerchant'   // 承認処理
'getMerchantData'   // データ取得
'updateStatus'      // ステータス更新
```

## ⚠️ 変更前の確認事項

1. **バックアップ取得済みか？**
```bash
# GASのバックアップ
ファイル > バージョン履歴 > 現在のバージョンに名前を付ける

# スプレッドシートのバックアップ
ファイル > コピーを作成
```

2. **影響範囲の確認**
- [ ] 加盟店登録に影響しないか
- [ ] 既存データが消えないか
- [ ] Slack通知が止まらないか
- [ ] 管理画面が壊れないか

3. **テスト環境での検証**
- [ ] ローカルでテスト完了
- [ ] テスト用GASで動作確認
- [ ] エラーログ確認

## 🛡️ 緊急時の復旧方法

### GASが壊れた場合
1. デプロイ管理 > 以前のデプロイを選択
2. 安定版のデプロイURLに戻す
3. フロントエンドのURL参照を元に戻す

### スプレッドシートが壊れた場合
1. 版の履歴 > 以前の版を復元
2. 最新のバックアップから復元
3. 差分データのみ手動で追加

### システム全体が停止した場合
1. GASを前のバージョンに戻す
2. フロントエンドを前のコミットに戻す
```bash
git log --oneline
git checkout [安定版のコミットID]
```
3. Slackで障害通知

## 📞 緊急連絡先

**システム停止時**:
1. Slack #emergency チャンネル
2. メール: admin@gaihekikuraberu.com
3. 開発責任者に即連絡

**データ消失時**:
1. 即座に全作業停止
2. バックアップ確認
3. 復旧作業は複数人で確認