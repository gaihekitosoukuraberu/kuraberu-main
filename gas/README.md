# 📁 GAS（Google Apps Script）ファイル

このフォルダにはGASエディタに追加する必要があるファイルが含まれています。

## 🚀 セットアップ手順

### 1. GASプロジェクトにファイルを追加

GASエディタで以下のファイルを新規作成してください：

#### `adminDashboardHandler.gs`
- このフォルダ内の`adminDashboardHandler.gs`の内容を全てコピー
- GASエディタで新規ファイル作成
- ファイル名を`adminDashboardHandler`に設定
- コピーした内容をペースト

### 2. 既存ファイルの更新

#### `router.gs`の更新
既存の`router.gs`ファイルのswitch文に以下を追加：

```javascript
// 管理ダッシュボード用のアクション
case 'getRegistrationRequests':
  return handleGetRegistrationRequests(data.params || {});

case 'approveRegistration':
  return handleApproveFromDashboard(data.registrationId, data.approver);

case 'rejectRegistration':
  return handleRejectFromDashboard(data.registrationId, data.reason, data.rejector);
```

### 3. プロパティの設定

プロジェクトの設定 → スクリプトプロパティに以下を設定：

| プロパティ名 | 説明 |
|-------------|------|
| `SPREADSHEET_ID` | 加盟店登録データを保存するスプレッドシートのID |
| `SLACK_WEBHOOK_URL` | Slack通知用のWebhook URL |
| `DRIVE_ROOT_FOLDER_ID` | ファイル保存用のDriveフォルダID（オプション） |

### 4. デプロイ

1. デプロイ → 新しいデプロイ
2. 種類: **ウェブアプリ**
3. 実行ユーザー: **自分**
4. アクセスできるユーザー: **全員**
5. デプロイをクリック

### 5. URLの取得と設定

デプロイ後に表示されるURLをコピーして、`dist/js/dashboard-api.js`の6行目を更新：

```javascript
const GAS_API_URL = 'ここにデプロイしたURLを貼り付け';
```

## 📝 ファイル説明

| ファイル名 | 説明 |
|-----------|------|
| `adminDashboardHandler.gs` | 管理画面用のAPIハンドラー（申請取得・承認・却下） |
| `adminMain.gs` | セットアップ手順とインストールガイド |
| `README.md` | このファイル（使用方法の説明） |

## ⚠️ 注意事項

- GASのファイルは直接編集せず、このフォルダのファイルを更新してからコピーしてください
- デプロイ後は必ず新しいURLを`dashboard-api.js`に反映してください
- プロパティの設定を忘れずに行ってください