# くらべる プロジェクト全体像

## 🚀 完成してる機能（絶対触るな）
- [x] 加盟店登録フォーム（franchise-register/）
- [x] Slack承認フロー
- [x] 本番サーバーデプロイ済み
- [x] GAS API基盤（10,000行超）
- [x] スプレッドシート33シート構成

## 🔧 作成中の機能
- [ ] 加盟店ダッシュボード（franchise-dashboard/）
- [ ] 本部運営管理画面（admin-dashboard/）
- [ ] 加盟店データ同期機能

## 📋 これから作る機能
- [ ] 見積もり保持システム（estimate-keep-system/）
- [ ] ワードリンクチャットボット（chatbot-word-link/）
- [ ] 業者ランキング自動生成
- [ ] 案件配信システム
- [ ] 売上レポート機能
- [ ] メール/LINE自動通知

## 🔗 重要URL・情報
- **本番GAS**: https://script.google.com/macros/s/YOUR_ID/exec
- **スプレッドシート**: 33シート構成（加盟店データ、案件管理、ランキング等）
- **GitHubリポジトリ**: https://github.com/gaihekitosoukuraberu/kuraberu-main
- **技術**: GAS + スプレッドシート + フロントエンド（フレームワークレス）

## ⚡ 依存関係マップ
```
franchise-register → GAS API → スプレッドシート
admin-dashboard → GAS API → スプレッドシート → Slack通知
franchise-dashboard → GAS API → スプレッドシート
estimate-keep-system → GAS API → GPT API
chatbot-word-link → GPT API → GAS API
```

## 🎯 マッチングロジック
1. 郵便番号でエリア抽出
2. 配信条件でフィルタリング
3. 4種類ランキング（安い順・おすすめ順・クチコミ順・高品質順）
4. GPT営業BOT → 見積もり許諾
5. 手動配信 → 施工管理 → 評価反映

## 📊 データフロー
```
ユーザー入力 → LP → ChatBot → 見積もり許諾 →
スプレッドシート保存 → Slack通知 →
本部確認 → 加盟店配信 → 施工管理 → 評価更新
```