# プロジェクト整理レポート - 2025年9月25日

## 🧹 整理完了

### 📁 アーカイブ済みファイル・フォルダ
**場所**: `/Users/ryuryu/ARCHIVE_OLD_PROJECTS/`

#### 移動したプロジェクト
- admin-app
- admin-dashboard-project
- franchise-admin
- franchise-parent
- gaiheki-admin
- kuraberu（旧フォルダ）
- kuraberu-main（旧フォルダ）
- kuraberu-ai-system
- kuraberu-backend
- kuraberu-complete-system
- spec-kit
- chatbot-word-link
- gas-auto-deploy
- line-webhook-cloud-function
- venv

#### 移動した単体ファイル
- chatbot-word-link.html

#### 移動した古いドキュメント（old_docs/）
- GAS_OLD_FORMAT_CHECK.md
- GAS_URL_COMPLETE_UPDATE_GUIDE.md
- OLD_EMAIL_FORMAT_FIX.md
- REVERT_COMPLETE.md

### ✅ 現在のメインプロジェクト構成
```
/Users/ryuryu/
├── franchise-register/     # ✅ 加盟店登録（メイン・稼働中）
├── admin-dashboard/        # 🔧 管理画面（開発中）
├── franchise-dashboard/    # 🔧 加盟店画面（開発中）
├── estimate-keep-system/   # 📋 見積もりシステム（未着手）
├── privacy-policy-site/    # 📄 プライバシーポリシーサイト
└── tools/                  # 🔧 ユーティリティツール
    └── PROJECT_STATUS_UPDATER.js
```

### 📊 整理結果
- **整理前**: 散在していた多数のプロジェクトフォルダ
- **整理後**: アクティブな5プロジェクト + ツールフォルダ
- **アーカイブ済み**: 15プロジェクト + 5ドキュメント

### 💡 今後の推奨事項
1. 新規プロジェクトは明確な命名規則で作成
2. 古いプロジェクトはARCHIVE_OLD_PROJECTSに移動
3. ドキュメントはプロジェクトルートに配置
4. ユーティリティツールはtools/フォルダで管理

## 📝 メモ
- ARCHIVE_OLD_PROJECTSフォルダは必要に応じて参照可能
- 誤って移動したものがあれば復元可能
- node_modules、google-cloud-sdkは依存関係のため残置