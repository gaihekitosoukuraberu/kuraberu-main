# キャンセル申請システム 統合ガイド

## 概要
既存の`index.html`に以下の変更を加えて、完全なキャンセル申請・期限延長申請システムを統合します。

## 必要な変更

### 1. メニューに期限延長申請を追加

**場所**: 行316〜327 (キャンセル申請メニューと成約報告メニューの間)

**現在**:
```html
<a href="#cancel" onclick="showSection('cancel'); return false;" class="flex items-center px-4 py-3...">
    ...
    キャンセル申請
</a>
<a href="#contract" onclick="showSection('contract'); return false;" class="flex items-center px-4 py-3...">
    ...
    成約報告
</a>
```

**変更後**:
```html
<a href="#cancel" onclick="showSection('cancel'); return false;" class="flex items-center px-4 py-3...">
    ...
    キャンセル申請
</a>
<a href="#extension" onclick="showSection('extension'); return false;" class="flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-100">
    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    期限延長申請
</a>
<a href="#contract" onclick="showSection('contract'); return false;" class="flex items-center px-4 py-3...">
    ...
    成約報告
</a>
```

### 2. キャンセル申請セクションを置き換え

**場所**: 行4982〜5059 (キャンセル申請セクション全体)

**削除**: 既存のキャンセル申請セクション全体

**追加**: `cancel-sections.html`の「キャンセル申請セクション」部分をコピー

### 3. 期限延長申請セクションを追加

**場所**: キャンセル申請セクションの直後（成約報告セクションの前）

**追加**: `cancel-sections.html`の「期限延長申請セクション」部分をコピー

### 4. JavaScriptを置き換え

**場所**: 行18180〜18300あたり (既存のキャンセル申請関連JavaScript)

**削除または置き換え**:
- `openCancelRequest()` 関数
- `createCancelCaseCard()` 関数
- `setCancelDateRange()` 関数
- `searchCancelCases()` 関数

**追加**: `cancel-sections.js`の内容を`<script>`タグの中に追加

### 5. showSection関数に期限延長を追加

**場所**: `showSection()`関数内

**追加**:
```javascript
if (sectionName === 'extension') {
    loadExtensionEligibleCases();
}
```

## 手順

### ステップ1: GASでスプレッドシート作成

```javascript
// GASエディタで実行
setupCancelSheets();
```

これで以下のシートが作成されます：
- キャンセル申請
- キャンセル期限延長申請

### ステップ2: HTMLの統合

1. `index.html`をバックアップ
2. 上記の変更を適用
3. `cancel-sections.html`の内容を参照して統合

### ステップ3: JavaScriptの統合

1. `cancel-sections.js`の内容を`index.html`の`<script>`タグ内に追加
2. 既存のキャンセル申請関連関数を削除または置き換え
3. API_URLとcurrentMerchantIdが定義されていることを確認

### ステップ4: 動作確認

1. ブラウザで`index.html`を開く
2. 「キャンセル申請」メニューをクリック
3. 申請可能案件が表示されることを確認
4. 「期限延長申請」メニューをクリック
5. 申請可能案件が表示されることを確認

## トラブルシューティング

### 案件が表示されない

1. GASのAPIエンドポイントが正しいか確認
2. `currentMerchantId`が正しく設定されているか確認
3. ブラウザのコンソールでエラーを確認

### Slack通知が届かない

1. GASのスクリプトプロパティで`SLACK_WEBHOOK_URL`が設定されているか確認
2. `SlackCancelNotifications.js`がGASプロジェクトに含まれているか確認

### 申請が失敗する

1. スプレッドシートのシート名が正しいか確認（「キャンセル申請」「キャンセル期限延長申請」）
2. カラム構成が設計書通りか確認
3. GASのログでエラーメッセージを確認

## APIエンドポイント

以下のアクションをサポートする必要があります：

### GET
- `getCancelableCases` - キャンセル申請可能案件取得
- `getExtensionEligibleCases` - 期限延長申請可能案件取得

### POST
- `submitCancelReport` - キャンセル申請登録
- `submitExtensionRequest` - 期限延長申請登録

## 参考ファイル

- `CANCEL_SYSTEM_IMPLEMENTATION.md` - 完全な実装ドキュメント
- `CANCEL_REASONS_STRUCTURE.js` - キャンセル理由の階層構造定義
- `test-cancel-functions.js` - テスト関数

## 完了後の確認事項

- [ ] メニューに「期限延長申請」が表示される
- [ ] キャンセル申請セクションで案件が表示される
- [ ] キャンセル申請の階層的質問フローが動作する
- [ ] 期限延長申請フォームが動作する
- [ ] Slack通知が正しく送信される
- [ ] 承認/却下がSlackボタンから実行できる
