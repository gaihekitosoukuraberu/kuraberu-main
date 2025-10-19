# Claude Code セッション引き継ぎドキュメント

## 🤖 Claude向け自動指示

### セッション終了時（自動切り替え前）
```
IMPORTANT: セッションが長くなって自動切り替えが発生する直前に、
以下を自動実行すること：

1. 現在の作業状況をこのファイルの「🔧 現在進行中の作業」セクションに更新
2. git statusの結果を「現在の変更状況」セクションに更新
3. 最新のコミット履歴を更新
4. 最終更新日時とセッション番号を更新
5. 重要な変更があればgitコミット実行

このファイルを必ず最新状態に保ってから切り替えること。
```

### 新セッション開始時（ユーザーからの指示時）
```
ユーザーが「CLAUDE_SESSION_HANDOVER.mdを読んでプロジェクト状況を把握して」
と言った時の自動実行手順：

1. このファイル全体を読み込み
2. 現在のgit status確認
3. 最新コミット履歴確認
4. 作業ディレクトリ確認
5. 前セッションからの継続作業を特定
6. 状況を簡潔にユーザーに報告

必要に応じてTodoWriteで作業リストを復元すること。
```

## 📅 作成日時: 2025-10-18 15:00

## 🎯 現在の状況

### プロジェクト概要
**くらべる** - 外壁塗装マッチングプラットフォーム

### 構成要素
```
franchise-dashboard/           <- メインプロジェクト（現在地）
├── dist/merchant-portal/      <- 加盟店向けポータル（本体）
├── gas-functions/            <- Google Apps Script (10,000行)
├── frontend/                 <- フロントエンド
├── backend/                  <- バックエンド
├── new-features/            <- 新機能開発用
└── gas-html-generator/      <- HTML生成
```

### 最新コミット状況 (2025-10-18 15:00)
```
5f63c87a Update: GAS functions and merchant portal完全保存
466a91f5 Add: CV管理システム（CVSheetSystem.js）実装とAR列変更
038975d6 Save: プロジェクト全体保存
aa8066f7 Add: GASファイルとフロントエンド更新分を追加
5dd091cd Fix: 画像削除機能の完全実装
```

### 現在の変更状況
```
Modified files (未コミット):
- .DS_Store files (複数)
- ../index.html
- env-loader.js
- first-login.html
- login.html
- set-password.html
- gas-functions/systems/merchant/CompanyInfoManager.js

Deleted files:
- image.png
- gas-functions/main.js
- gas-functions/systems/admin/AdminSystem.js
- gas-functions/systems/ai/AISearchSystem.js
- 他複数GASファイル

New files:
- 多数の.gs, .jsファイル
- DEPLOY_INSTRUCTIONS.md
- RANKING_SYSTEM_SPEC.md
- VERSION_1244_ROOT_CAUSE_ANALYSIS.md
```

## 🧭 今後の作業継続方法

### セッション開始時に必ず実行
```bash
cd /Users/ryuryu/franchise-dashboard
pwd
git status
git log --oneline -5
```

### エラー時の対処手順
1. **必ず言うセリフ**:
   ```
   「エラーが出た。CLAUDE.mdを見て全体を理解してから、
   既存の動いている機能を壊さないように修正して。
   テスト用のファイルを別に作って検証してから統合して。」
   ```

2. **安全な作業手順**:
   - CLAUDE.mdを読む
   - test/や new-features/で開発
   - 単体テストを実行
   - 段階的に統合

### 重要な技術制約
- **ファイルサイズ**: 1ファイル最大1,000行
- **フレームワーク**: 使用禁止
- **エラー処理**: try-catch + console.log + alert 必須
- **API**: GAS経由でスプレッドシート操作

## 🔧 現在進行中の作業

### 直近の完了作業
- CV管理システム実装
- 画像削除機能実装
- 明るさスライダー改良
- 文字色カラーピッカー機能

### 継続が必要な作業
- merchant-portal関連のファイル更新
- GAS関数の整理・統合
- テスト機能の充実

## 📋 チェックリスト（新セッション開始時）

- [ ] CLAUDE.mdを確認
- [ ] この引き継ぎファイルを読む
- [ ] 現在のgit statusを確認
- [ ] 最新コミット履歴を確認
- [ ] 作業前にブランチ状況を確認
- [ ] 重要ファイルのバックアップ確認

## ⚠️ 絶対にやってはいけないこと

- 動いているコードの直接編集
- フレームワークの導入
- 大規模リファクタリング
- テストなしの本番デプロイ
- GASの構造変更

## 🚀 推奨作業パターン

### 新機能追加時
```bash
# 1. 新機能用フォルダで開発
cd new-features/
mkdir feature-name
# 2. テスト実装
# 3. 段階的統合
```

### デバッグ時
```javascript
console.log('[ファイル名] 読み込み完了');
try {
  // 処理
} catch (error) {
  console.error('[関数名] エラー:', error);
  alert('処理に失敗しました: ' + error.message);
}
```

## 📞 緊急時連絡
- このファイルを更新して状況を記録
- 重要な変更はgitコミット
- 作業ログをこのファイルに追記

## 🔄 セッション管理プロトコル

### 自動セッション切り替え時のフロー
1. **Claude**: セッション終了前に自動で進捗をこのファイルに更新
2. **Claude**: 重要な変更があればgitコミット実行
3. **システム**: セッション自動切り替え
4. **ユーザー**: 新セッションで「`CLAUDE_SESSION_HANDOVER.mdを読んでプロジェクト状況を把握して`」と入力
5. **新Claude**: 自動で状況把握し継続作業開始

### セッション記録
```
Session #1: 2025-10-18 15:00-15:30
- 引き継ぎシステム構築
- 自動更新プロトコル実装

Session #2: (次回自動更新)
- (自動記録予定)
```

---
**最終更新**: 2025-10-18 15:20
**更新者**: Claude Code Session #1
**セッション番号**: #1
**次回更新**: 自動セッション切り替え時