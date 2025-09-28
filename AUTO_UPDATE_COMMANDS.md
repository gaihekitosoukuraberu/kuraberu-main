# 自動更新コマンド集

## 🔄 Claude Codeで実行するコマンド

### **1. プロジェクト状況の完全更新**
```bash
# 作業開始前に必ず実行
"node PROJECT_STATUS_UPDATER.js を実行して、
現在のGAS行数、スプレッドシートシート数、実装済み機能を調査し、
PROJECT_MAP.mdを最新情報で自動更新して。
その後、git add . && git commit -m 'Auto-update project status' && git push"
```

### **2. GAS情報のみ更新**
```bash
# GAS修正後に実行
"GASの現在の行数とファイル構成を調査して、
PROJECT_MAP.mdのGAS情報部分のみ更新。
他の部分は変更しない。"
```

### **3. 機能実装状況のチェック**
```bash
# 新機能完成時に実行
"各プロジェクトフォルダ（franchise-register, admin-dashboard等）の
実装状況をチェックして、PROJECT_MAP.mdの機能ステータスを更新。
完成してる機能/作成中の機能/これから作る機能を正確に分類。"
```

## 🎯 定期実行スケジュール

### **毎日の作業開始時**
```bash
"プロジェクト状況を更新してから作業開始"
→ PROJECT_STATUS_UPDATER.js実行
→ PROJECT_MAP.md自動更新
→ 最新情報でClaude Codeが判断
```

### **大きな変更後**
```bash
"重要な実装完了後の状況更新"
→ 機能ステータス再チェック
→ ドキュメント自動更新
→ Git commit
```

### **週次レビュー**
```bash
"週次で全体チェック"
→ 全情報を再取得
→ 不整合がないか確認
→ ドキュメント品質チェック
```

## 📋 実装チェックリスト

### **各機能の実装度チェック**
```javascript
// 自動判定ロジック
function checkImplementationLevel(projectPath) {
  const checks = {
    hasHTML: existsSync(`${projectPath}/index.html`),
    hasJS: existsSync(`${projectPath}/script.js`),
    hasCSS: existsSync(`${projectPath}/style.css`),
    hasGASConnection: testAPIConnection(projectPath),
    hasTests: existsSync(`${projectPath}/test/`)
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (score >= 4) return 'implemented';
  if (score >= 2) return 'in-progress';
  return 'planned';
}
```

## 🔧 技術的な仕組み

### **1. GAS情報取得**
- GAS APIでスクリプト情報取得
- ファイル毎の行数カウント
- 最終更新日時記録

### **2. スプレッドシート情報取得**
- Google Sheets APIでシート一覧取得
- 各シートのデータ量確認
- 使用状況分析

### **3. GitHub情報取得**
- GitHub APIでコミット履歴取得
- ファイル構造分析
- 最終更新情報収集

### **4. 自動判定ロジック**
```javascript
// 機能完成度の自動判定
const COMPLETION_CRITERIA = {
  implemented: {
    hasMainFiles: true,
    hasGASConnection: true,
    hasTests: true,
    noMajorErrors: true
  },
  inProgress: {
    hasMainFiles: true,
    hasGASConnection: false,
    hasTests: false
  },
  planned: {
    hasMainFiles: false
  }
};
```

## 💡 運用のコツ

### **1. 作業前の習慣**
```bash
# 毎回これを実行
"最新状況を確認してから作業開始"
```

### **2. 変更後の更新**
```bash
# 大きな変更の後は必ず
"実装状況を再チェックして更新"
```

### **3. 整合性チェック**
```bash
# 週1回程度
"ドキュメントと実際の実装の整合性をチェック"
```

これにより、**常に最新で正確な情報**に基づいてClaude Codeが判断できるようになります！