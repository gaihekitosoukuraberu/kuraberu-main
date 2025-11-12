# V1711 - 平均遅延日数優先調整

## 実装日時
2025-11-12 18:00

## 目的
**1請求あたり平均遅延日数を最優先した閾値調整**

V1709の分析結果に基づき、未入金発生率よりも**支払いの早さ（平均遅延日数）**を重視するように閾値を調整しました。

## 背景

### V1709分析結果の重要な発見

```
【未入金発生率】
件数: 2290件
平均: 46.6%
中央値: 35.7%
分布: 0-30%未満 962件 (42%), 30-60%未満 585件 (26%), 60-100% 743件 (32%)

→ 業界的に未入金はよくあること（平均46.6%）

【平均遅延日数】
件数: 1792件
平均: 72.7日
中央値: 3.0日  ← 重要！
最大値: 992.0日
分布: 5以上 728件, 10以上 546件, 15以上 476件

→ 中央値3.0日 = ほとんどの業者はすぐに払っている
→ 一部の悪質業者が平均を引き上げている
```

### ユーザーの要望
> "未入金は結構な確率でみんな出してくるのでそこまで気にしないが、すぐに払わない業者は困るので、1請求あたり平均遅延日数フラグを見て、５日以内なら許容するので、そこを重視して。"

**結論**: 未入金発生率は参考程度にし、**平均遅延日数を最優先**する。

## 新しい閾値（V1711）

### 判定基準

| 平均遅延日数 | 評価 | criticalLevel | Slack表示 |
|-------------|------|---------------|-----------|
| 15日以上 | 重大 | 3 | 🔴 *平均遅延日数: XX日* (未入金率: YY%) |
| 10日以上 | 警告 | 2 | 🟠 *平均遅延日数: XX日* (未入金率: YY%) |
| 5日以上 | 注意 | 1 | 🟡 平均遅延日数: XX日 (未入金率: YY%) |
| **5日未満** | **許容** | 0 | ℹ️ 未入金率: YY% (平均遅延: XX日 - 許容範囲) |

### 重要な変更点

1. **平均遅延日数が5日未満なら警告レベルなし**
   - 未入金があっても、すぐに払う業者は問題なし
   - 参考情報として未入金率を表示するが、criticalLevelは上げない

2. **未入金発生率は括弧内に移動**
   - 主要な指標ではなく、参考情報として扱う
   - 平均遅延日数とセットで表示

3. **criticalLevelの決定は平均遅延日数のみ**
   - V1708では `unpaidRate >= 30 && avgDelayPerInvoice >= 15` のAND条件
   - V1711では `avgDelayPerInvoice >= 15` のみで判定

## 実装内容

### 修正箇所
[slackNotificationHandler.js:114-134](franchise-register/gas/slackNotificationHandler.js#L114-L134)

### Before (V1708)
```javascript
// V1708 Priority 4: 未入金分析（発生率＋平均遅延日数）
if (unpaidRate >= 30 && avgDelayPerInvoice >= 15) {
  unpaidWarning = `🔴 *未入金リスク高:* 発生率 ${unpaidRate.toFixed(1)}% / 平均遅延 ${avgDelayPerInvoice.toFixed(1)}日`;
  criticalLevel = Math.max(criticalLevel, 3);
} else if (unpaidRate >= 15 || avgDelayPerInvoice >= 10) {
  unpaidWarning = `🟠 *未入金リスク中:* 発生率 ${unpaidRate.toFixed(1)}% / 平均遅延 ${avgDelayPerInvoice.toFixed(1)}日`;
  criticalLevel = Math.max(criticalLevel, 2);
} else if (unpaidRate >= 5 || avgDelayPerInvoice >= 5) {
  unpaidWarning = `🟡 未入金あり: 発生率 ${unpaidRate.toFixed(1)}% / 平均遅延 ${avgDelayPerInvoice.toFixed(1)}日`;
  criticalLevel = Math.max(criticalLevel, 1);
}
```

### After (V1711)
```javascript
// V1711: 平均遅延日数を最優先（未入金発生率は参考程度）
if (avgDelayPerInvoice >= 15) {
  warningMessages.push(`🔴 *平均遅延日数: ${avgDelayPerInvoice.toFixed(1)}日* (未入金率: ${unpaidRate.toFixed(1)}%)`);
  criticalLevel = Math.max(criticalLevel, 3);
} else if (avgDelayPerInvoice >= 10) {
  warningMessages.push(`🟠 *平均遅延日数: ${avgDelayPerInvoice.toFixed(1)}日* (未入金率: ${unpaidRate.toFixed(1)}%)`);
  criticalLevel = Math.max(criticalLevel, 2);
} else if (avgDelayPerInvoice >= 5) {
  warningMessages.push(`🟡 平均遅延日数: ${avgDelayPerInvoice.toFixed(1)}日 (未入金率: ${unpaidRate.toFixed(1)}%)`);
  criticalLevel = Math.max(criticalLevel, 1);
} else if (unpaidRate > 0) {
  // 遅延5日未満だが未入金はある場合（参考情報として表示のみ）
  warningMessages.push(`ℹ️ 未入金率: ${unpaidRate.toFixed(1)}% (平均遅延: ${avgDelayPerInvoice.toFixed(1)}日 - 許容範囲)`);
  // criticalLevelは上げない
}
```

## Slack通知の表示例

### ケース1: 平均遅延15日以上（重大）
```
⚠️ 過去データ警告
🔴 平均遅延日数: 23.5日 (未入金率: 52.3%)

⚠️ 【推奨アクション】サイレント承認 + 厳重監視
```

### ケース2: 平均遅延10日以上（警告）
```
⚠️ 過去データ警告
🟠 平均遅延日数: 12.3日 (未入金率: 38.7%)

⚠️ 【推奨アクション】サイレント承認を推奨
```

### ケース3: 平均遅延5日以上（注意）
```
⚠️ 過去データ警告
🟡 平均遅延日数: 7.2日 (未入金率: 28.9%)

ℹ️ 注意事項あり - 要確認
```

### ケース4: 平均遅延5日未満（許容）✨ NEW!
```
⚠️ 過去データ警告
ℹ️ 未入金率: 35.2% (平均遅延: 2.1日 - 許容範囲)
✅ 過去データあり（問題なし）
```
→ **criticalLevel = 0** なので、他の警告がなければ「問題なし」扱い

### ケース5: 遅延4日 + 未入金率60%（許容）
```
⚠️ 過去データ警告
ℹ️ 未入金率: 60.5% (平均遅延: 4.3日 - 許容範囲)
✅ 過去データあり（問題なし）
```
→ 未入金率が高くても、**すぐに払えばOK**

## 影響範囲の分析

V1709の分析結果から、新しい閾値での影響を推定：

| 平均遅延日数 | 該当件数 | V1708での扱い | V1711での扱い |
|-------------|---------|--------------|--------------|
| 5日未満 | 1064件 | 未入金率次第で警告 | **許容（警告なし）** ✨ |
| 5-10日 | 182件 | 🟡または🟠 | 🟡 注意 |
| 10-15日 | 70件 | 🟠または🔴 | 🟠 警告 |
| 15日以上 | 476件 | 🔴 重大 | 🔴 重大 |

**重要**: 約1064件の業者が、V1711では警告なしになる可能性があります。これは正常な業者を誤って警告していたケースです。

## データ品質への対応

- 遅延日数が0日でも未入金率がある場合
  - → 「許容範囲」として表示
  - これは「未入金はあるが遅延していない」= 支払い予定日内のケース

- 未入金率が0%でも遅延日数がある場合
  - → 通常通り平均遅延日数で判定
  - これは「最終的には全額回収したが、遅延があった」ケース

## 他の警告との組み合わせ

V1711は未入金判定のみを変更。他の警告は変更なし：

1. **貸倒フラグ**: criticalLevel 4（最優先）- V1708
2. **名前変更の疑い**: criticalLevel 4 - V1710
3. **成約隠し率30%以上**: criticalLevel 3 - V1708
4. **平均遅延15日以上**: criticalLevel 3 - V1711 ✨ NEW
5. **ユーザークレーム3件以上**: criticalLevel 3 - V1708
6. **要注意先ステータス**: criticalLevel 2 - V1708
7. **平均遅延10日以上**: criticalLevel 2 - V1711 ✨ NEW
8. **平均遅延5日以上**: criticalLevel 1 - V1711 ✨ NEW
9. **平均遅延5日未満**: criticalLevel 0 - V1711 ✨ NEW（許容）

## 次のステップ

### V1712予定: リスクスコアのランキング統合
- calculateRiskScore()をAISearchSystemに統合
- 過去データに基づく信頼度スコアでランキングソート
- 新規加盟店の初期スコア決定（80点 or 50点）
- V1711の新しい閾値を反映

### V1713予定: 統計レポート自動生成
- 定期的にV1709スクリプトを実行
- 閾値の妥当性を継続的に検証
- 業界平均の変化を追跡

## 関連ファイル
- [slackNotificationHandler.js](franchise-register/gas/slackNotificationHandler.js) - V1711実装
- [V1708-README.md](franchise-register/gas/V1708-README.md) - V1708ドキュメント
- [V1709-README.md](franchise-register/gas/V1709-README.md) - V1709分析結果
- [V1710-README.md](franchise-register/gas/V1710-README.md) - V1710名前変更検出
- [env-loader.js](lp/js/env-loader.js) - V1711キャッシュバスター更新
