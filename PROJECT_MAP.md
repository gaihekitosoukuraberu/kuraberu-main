# くらべる プロジェクト全体像
<!-- 最終調査: 2025-09-25 20:45 JST -->

## 🚀 完成してる機能（絶対触るな）
- [x] 加盟店登録フォーム（franchise-register/）
  - HTMLフォーム実装済み
  - JS（11ファイル）完全動作
  - AI企業情報自動入力機能
- [x] Slack承認フロー（GAS内実装）
- [x] 本番サーバーデプロイ済み
- [x] GAS API基盤（6,177行 / 11ファイル）
  - main.gs, router.gs, gas-api.gs
  - auth-manager.gs, email-sender.gs
  - config-provider.gs 他

## 🔧 作成中の機能
- [ ] 加盟店ダッシュボード（franchise-dashboard/）
  - フォルダ構造: frontend/, backend/, dist/
  - merchant-portal/ に初回ログイン機能実装済み
- [ ] 本部運営管理画面（admin-dashboard/）
  - フォルダ構造: frontend/, gas/, dist/
  - dashboard-api.js実装済み
- [ ] 加盟店データ同期機能

## 📋 これから作る機能
- [ ] 見積もり保持システム（estimate-keep-system/）
- [ ] ワードリンクチャットボット（chatbot-word-link/）
- [ ] 業者ランキング自動生成
- [ ] 案件配信システム
- [ ] 売上レポート機能
- [ ] メール/LINE自動通知

## 🔗 重要URL・情報
- **本番GAS**: https://script.google.com/macros/s/AKfycbxZTvpnE3Yzold1neDzznWSTUBAjBn73l4lu398Fk0oIP0GoJwznkcMAOfelv38wTZYCQ/exec
- **スプレッドシート**: 複数シート構成（加盟店データ、案件管理、ランキング等）
- **GitHubリポジトリ**: https://github.com/gaihekitosoukuraberu/kuraberu-main
- **技術**: GAS + スプレッドシート + フロントエンド（フレームワークレス）

## 📁 現在のフォルダ構成
```
kuraberu-main/
├── franchise-register/     # ✅ 完成・本番稼働中
│   ├── dist/              # 本番用ファイル
│   ├── js/                # 開発用JSファイル（11ファイル）
│   ├── gas/               # GASファイル（6,177行）
│   └── css/               # スタイルシート
├── admin-dashboard/        # 🔧 作成中
│   ├── frontend/
│   ├── gas/
│   └── dist/
├── franchise-dashboard/    # 🔧 作成中
│   ├── frontend/
│   ├── backend/
│   ├── merchant-portal/
│   └── dist/
└── その他プロジェクト      # 📋 未着手
    ├── chatbot-word-link/
    └── kuraberu-ai-system/
```

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