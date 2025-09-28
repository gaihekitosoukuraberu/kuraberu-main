# 開発ルール - 外壁塗装くらべるAI システム構築

## 🚨 絶対ルール（破ったら即修正）
1. **doPost/doGet は main.gs にのみ存在**（他に作ったら即削除）
2. **1ファイル500行まで**（超えたら分割）
3. **30分ごとにGit保存**（Claude Codeに「Git保存して」と指示）

## 📁 GASファイル構成（これ以外作らない）
```
GAS/
├── main.gs          # doPost/doGet専用（100行以内）
├── router.gs        # 振り分け処理（200行以内）
├── handlers/        # 各機能の処理（各500行以内）
│   ├── form.gs      # フォーム処理
│   ├── admin.gs     # 管理画面処理
│   ├── notify.gs    # 通知処理
│   └── franchise.gs # 加盟店処理
├── utils/           # 共通関数
│   ├── sheet.gs     # スプシ操作
│   └── validate.gs  # バリデーション
└── config.gs        # 設定値のみ
```

## 🔥 高速開発フロー

### 1. エンドポイント設計（main.gs は変更禁止）
```javascript
// main.gs - これ以外にdoPost/doGet作らない
function doPost(e) {
  const action = e.parameter.action || 'default';
  return router.handlePost(action, e);
}

function doGet(e) {
  const action = e.parameter.action || 'default';
  return router.handleGet(action, e);
}
```

### 2. 新機能追加の手順
1. **追加前チェック**
   - [ ] 似た機能が既にないか確認
   - [ ] どのファイルに追加するか決定
   - [ ] ファイルが400行超えてないか確認

2. **実装**
   ```javascript
   // handlers/新機能.gs
   function handle新機能(params) {
     try {
       // 処理
       return {success: true, data: result};
     } catch(e) {
       console.error('新機能エラー:', e);
       return {success: false, error: e.toString()};
     }
   }
   ```

3. **テスト → Git保存**
   - ブラウザで動作確認
   - 動いたら即「Git保存して」

## 📝 Claude Code への指示テンプレート

```
【現在の作業】
追加する機能：[具体的に1つ]
編集ファイル：[handlers/○○.gs]
現在の行数：[○○○行]

【禁止事項】
- doPost/doGet の新規作成
- 500行超え
- main.gs の編集
```

## ⏰ タイムスケジュール

### 30分サイクル
1. 機能実装（20分）
2. テスト（5分）
3. Git保存指示（5分）

### エラー時の対処
```bash
# 最後に動いた状態を確認
git log --oneline -5

# 動いてた状態に戻す
git reset --hard [コミットID]
```

## 🆘 緊急時のリカバリー

### ファイルが巨大化した場合
1. Git保存
2. 「このファイルを機能ごとに分割して」と指示
3. 分割後に再度Git保存

### doPost/doGetが複数できた場合
1. main.gs 以外のdoPost/doGetを全削除
2. router.gs で振り分け処理に変更

## 📊 進捗管理

### STATE.md を更新（1時間ごと）
```markdown
## 2025/01/17 15:00 現在
✅ 完成：郵便番号フォーム
✅ 完成：GAS基本設定
🔧 作業中：管理画面
❌ 未着手：通知機能

## 最後に動いたコミット
abc123def - 郵便番号フォーム完成
```

---
最終更新：2025/01/17