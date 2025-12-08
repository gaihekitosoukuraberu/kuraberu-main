# 現在の作業TODO - 通知設定 & プロフィールスプシ連携

**作業開始**: 2025-12-08
**完了**: 2025-12-08

---

## 全体構成
```
Phase 1: 通知設定シートにプロフィールカラム追加 ✅完了
Phase 2: GAS APIルーティング追加 ✅完了
Phase 3: フロントエンドAPI連携 ✅完了
```

---

## Phase 1: 通知設定シートにプロフィールカラム追加 ✅完了
- [x] 1-1. NotificationSettingsManager.js 修正
  - COLインデックス定義追加（10カラム対応）
  - getSheet(): 新カラム構造でシート作成
  - migrateSheet(): 既存シートのマイグレーション関数
  - getSettings(): プロフィール含むデータ取得
  - saveSettings(): プロフィール含むデータ保存
  - saveProfile(): プロフィールのみ更新
  - getMerchantUsers(): 新カラム構造対応
  - handle(): SystemRouter用エントリーポイント

## Phase 2: GAS APIルーティング追加 ✅完了
- [x] 2-1. main.js SystemRouterに4アクション追加
  - getNotificationSettings: 通知設定取得
  - saveNotificationSettings: 通知設定保存
  - saveUserProfile: プロフィール保存
  - migrateNotificationSheet: シートマイグレーション

## Phase 3: フロントエンドAPI連携 ✅完了
- [x] 3-1. franchise-dashboard/index.html 修正
  - saveProfile(): API連携（ローカル+サーバー同期）
  - saveNotificationSettings(): API連携
  - loadUserSettings(): 設定画面表示時にAPIから読み込み
  - loadSettingsFromLocalStorage(): オフラインフォールバック
  - showSection('settings')時にloadUserSettings()呼び出し

---

## 新しいシート構造（通知設定シート）
```
| ユーザーID | 加盟店ID | 氏名 | 電話番号 | メールアドレス | メール通知 | LINE通知 | ブラウザ通知 | 詳細設定JSON | 最終更新 |
```

## マイグレーション方法
既存シートがある場合、以下のAPIを1回実行：
```
GAS_URL?action=migrateNotificationSheet
```

---

## 過去の作業履歴

### スケジューリング & SMS機能 (2025-12-07完了)
- Phase 1: SMS送信機能（テンプレート）
- Phase 2: データ構造 & GASバックエンド
- Phase 3: 業者側 - 空き枠管理UI
- Phase 4: ユーザー側 - 予約ページ
- Phase 5: 統合

---

## ファイル構成（今回の変更）
```
/gas/
  systems/
    notification/
      NotificationSettingsManager.js  ← プロフィール対応追加
  main.js              ← ルーティング追加

/franchise-dashboard/
  index.html          ← API連携追加
```
