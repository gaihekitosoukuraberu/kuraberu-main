# くらべる 強制的フォルダ構成システム

## 🎯 **絶対ルール（例外なし）**

### **📁 必須フォルダ構成**
```
kuraberu-main/
├── 📋 PROJECT_MAP.md          # プロジェクト管理
├── 🤖 CLAUDE.md              # AI用ルール
├── 🚨 FOLDER_RULES.md         # フォルダルール（このファイル）
├──
├── 🔧 gas/                   # GAS専用（Google Apps Scriptにデプロイ）
│   ├── Code.gs              # メイン処理
│   ├── Merchants.gs         # 加盟店関連
│   ├── Notifications.gs     # 通知処理
│   ├── Utils.gs             # 共通関数
│   └── appsscript.json      # GAS設定
├──
├── 🌐 dist/                  # サーバーデプロイ専用
│   ├── franchise-register/   # 加盟店登録
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   ├── admin-dashboard/      # 管理画面
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   ├── franchise-dashboard/  # 加盟店画面
│   └── chatbot-word-link/    # チャットボット
├──
├── 🧪 test/                  # テスト専用
│   ├── gas-test/            # GAS機能テスト
│   └── frontend-test/       # フロントエンドテスト
└──
└── 📚 docs/                  # ドキュメント専用
    ├── api-spec.md
    └── deployment.md
```

---

## 🚫 **絶対禁止事項**

### **❌ やってはいけないこと**
1. **ルートにHTMLファイル配置** → 必ずdist/内に
2. **ルートにJSファイル配置** → gas/かdist/内のみ
3. **GASファイルをdist/に配置** → gas/フォルダのみ
4. **フロントエンドをgas/に配置** → dist/フォルダのみ
5. **テストファイルを本番フォルダに混入** → test/フォルダのみ

### **⚠️ 判断基準**
```
ファイルの配置先判断フロー：

1. Google Apps Scriptで実行する？
   Yes → gas/ フォルダ

2. ブラウザで実行する？
   Yes → dist/ フォルダ

3. テスト用？
   Yes → test/ フォルダ

4. ドキュメント？
   Yes → docs/ フォルダ
```

---

## 🔧 **自動チェックシステム**

### **フォルダ構成違反を自動検出**
```javascript
// FOLDER_STRUCTURE_CHECKER.js
function checkFolderStructure() {
  console.log('🔍 フォルダ構成チェック開始...');

  const violations = [];

  // ルートの禁止ファイルをチェック
  const rootFiles = fs.readdirSync('./');
  const prohibitedInRoot = ['.html', '.js', '.css'];

  rootFiles.forEach(file => {
    const ext = path.extname(file);
    if (prohibitedInRoot.includes(ext)) {
      violations.push({
        type: 'PROHIBITED_IN_ROOT',
        file: file,
        message: `${file} はルートに置けません。dist/フォルダに移動してください`,
        solution: `mv ${file} dist/appropriate-folder/`
      });
    }
  });

  // GASフォルダのチェック
  if (fs.existsSync('./gas')) {
    const gasFiles = fs.readdirSync('./gas', { recursive: true });
    gasFiles.forEach(file => {
      const ext = path.extname(file);
      if (!['.gs', '.json'].includes(ext)) {
        violations.push({
          type: 'WRONG_FILE_IN_GAS',
          file: `gas/${file}`,
          message: `${file} はGASフォルダに置けません。dist/に移動してください`
        });
      }
    });
  }

  // distフォルダのチェック
  if (fs.existsSync('./dist')) {
    const distFiles = fs.readdirSync('./dist', { recursive: true });
    distFiles.forEach(file => {
      const ext = path.extname(file);
      if (ext === '.gs') {
        violations.push({
          type: 'GAS_FILE_IN_DIST',
          file: `dist/${file}`,
          message: `${file} はdistフォルダに置けません。gas/に移動してください`
        });
      }
    });
  }

  // 結果表示
  if (violations.length > 0) {
    console.log('❌ フォルダ構成違反が見つかりました:');
    violations.forEach(v => {
      console.log(`  - ${v.message}`);
      if (v.solution) console.log(`    解決方法: ${v.solution}`);
    });
    return false;
  } else {
    console.log('✅ フォルダ構成は正常です');
    return true;
  }
}
```

---

## 🎯 **Claude Code用の強制指示**

### **新ファイル作成時の必須テンプレート**
```bash
"""
@FOLDER_RULES.md を必ず読んでからファイル作成。

【ファイル配置チェック】
1. Google Apps Scriptで実行するファイル？ → gas/フォルダ
2. ブラウザで実行するファイル？ → dist/フォルダ
3. テスト用ファイル？ → test/フォルダ
4. ドキュメント？ → docs/フォルダ

【禁止事項】
- ルートディレクトリにHTML/JS/CSSファイル作成禁止
- GASファイル（.gs）をdist/に配置禁止
- フロントエンドファイルをgas/に配置禁止

ファイル作成前に配置先を明確に確認してから実行して。
"""
```

### **既存ファイル整理の指示**
```bash
"""
現在のぐちゃぐちゃなファイル配置を整理：

1. FOLDER_STRUCTURE_CHECKER.js を実行
2. 違反しているファイルを特定
3. 正しいフォルダに移動
4. 移動後、リンクやimportパスを修正
5. テストして動作確認

整理順序：
- 段階1: ルートの不要ファイルをdist/に移動
- 段階2: GASファイル（.gs）をgas/に集約
- 段階3: フロントエンドファイルをdist/内で整理
- 段階4: テストファイルをtest/に移動
"""
```

---

## 🔍 **ローカル状態把握システム**

### **現状調査スクリプト**
```javascript
// LOCAL_STATUS_CHECKER.js
function analyzeLocalStructure() {
  console.log('📊 ローカル構成分析中...');

  const analysis = {
    rootFiles: [],      // ルートの不正ファイル
    gasFiles: [],       // GAS関連ファイル
    distFiles: [],      // フロントエンド関連
    testFiles: [],      // テストファイル
    violations: [],     // 構成違反
    suggestions: []     // 改善提案
  };

  // 全ファイルスキャン
  const allFiles = getAllFiles('./');

  allFiles.forEach(file => {
    const category = categorizeFile(file);
    const currentLocation = path.dirname(file);
    const correctLocation = getCorrectLocation(category);

    if (currentLocation !== correctLocation) {
      analysis.violations.push({
        file: file,
        current: currentLocation,
        correct: correctLocation,
        category: category
      });
    }
  });

  // 改善提案生成
  analysis.suggestions = generateReorganizationPlan(analysis.violations);

  return analysis;
}
```

---

## 💡 **実装の優先順序**

### **Phase 1: 緊急整理（今すぐ）**
1. **FOLDER_RULES.md をGitに追加**
2. **FOLDER_STRUCTURE_CHECKER.js を実行**
3. **違反ファイルを正しい場所に移動**
4. **Claude Codeに強制ルールを適用**

### **Phase 2: 自動化（今週中）**
1. **pre-commit hookでフォルダチェック**
2. **CI/CDでデプロイ前チェック**
3. **Claude Code作業時の自動検証**

### **Phase 3: 完全管理（継続）**
1. **週次の構成チェック**
2. **新メンバー向けルール教育**
3. **ツールによる完全自動化**

---

## 🎯 **成功の鍵**

### **絶対に妥協しない**
- **例外は作らない** → 一度例外を認めると崩壊
- **自動チェック必須** → 人間のチェックは限界
- **強制力を持たせる** → ルール違反だとcommitできない

### **Claude Codeを完全制御**
- **必ずFOLDER_RULES.mdを読ませる**
- **ファイル作成前に配置先確認**
- **違反時は即座に修正指示**

この仕組みがないと、**どんな優秀なAIでも必ず混乱します。**
今すぐ実装すべき最重要課題です！