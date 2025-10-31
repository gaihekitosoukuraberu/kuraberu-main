#!/usr/bin/env node

/**
 * ====================================
 * 完全自動化ウォッチャー
 * ====================================
 *
 * 【目的】
 * - ファイル保存を検知して自動でGAS更新
 * - ユーザーは何もしなくてOK
 *
 * 【動作フロー】
 * ファイル保存
 *   ↓
 * 変更検知（5秒待機でバッチ処理）
 *   ↓
 * 自動バックアップ
 *   ↓
 * clasp push（自動）
 *   ↓
 * 完了通知
 *
 * 【使用方法】
 * ```bash
 * npm run watch
 * ```
 *
 * バックグラウンド実行:
 * ```bash
 * npm run watch:bg
 * ```
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 監視対象ディレクトリ
const WATCH_DIRS = [
  path.join(__dirname, '..'),  // gas/
];

// 除外パターン
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.DS_Store/,
  /\.backup/,
  /OLD_BACKUP/,
  /dist/,
  /tests/,
  /scripts/
];

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString('ja-JP');
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// 変更検知のデバウンス用
let changeTimer = null;
let changedFiles = new Set();

/**
 * バックアップ作成
 */
function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    const backupFile = `/Users/ryuryu/gas-backup-auto-${timestamp}.tar.gz`;

    execSync(`cd /Users/ryuryu/franchise-register && tar -czf ${backupFile} gas/`, { stdio: 'pipe' });

    const stats = fs.statSync(backupFile);
    log(`✅ バックアップ作成: ${path.basename(backupFile)} (${(stats.size / 1024).toFixed(1)}KB)`, 'green');

    return backupFile;
  } catch (error) {
    log(`❌ バックアップ失敗: ${error.message}`, 'red');
    return null;
  }
}

/**
 * clasp push実行
 */
function claspPush() {
  try {
    log('🚀 clasp push 実行中...', 'blue');

    execSync('cd /Users/ryuryu/franchise-register/gas && clasp push --force', {
      stdio: 'pipe',
      encoding: 'utf-8'
    });

    log('✅ clasp push 完了', 'green');
    return true;
  } catch (error) {
    log(`❌ clasp push 失敗: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 変更処理
 */
function handleChanges() {
  if (changedFiles.size === 0) return;

  const files = Array.from(changedFiles);
  changedFiles.clear();

  log('', 'reset');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log(`📝 ${files.length}個のファイル変更を検知`, 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');

  files.forEach(file => {
    log(`   - ${file}`, 'reset');
  });

  log('', 'reset');

  // バックアップ
  const backup = createBackup();

  if (!backup) {
    log('⚠️  バックアップ失敗のため処理を中断', 'yellow');
    return;
  }

  // clasp push
  const pushSuccess = claspPush();

  if (pushSuccess) {
    log('', 'reset');
    log('🎉 自動更新完了！GASに反映されました', 'green');
    log(`📦 バックアップ: ${path.basename(backup)}`, 'cyan');
    log('', 'reset');
  } else {
    log('', 'reset');
    log('⚠️  clasp push失敗 - 手動で確認してください', 'yellow');
    log(`🔄 ロールバック: tar -xzf ${backup}`, 'yellow');
    log('', 'reset');
  }
}

/**
 * ファイル変更検知
 */
function onFileChange(filePath) {
  // 除外パターンチェック
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(filePath)) {
      return;
    }
  }

  // .jsと.gsファイルのみ
  if (!/\.(js|gs)$/.test(filePath)) {
    return;
  }

  const relativePath = path.relative('/Users/ryuryu/franchise-register/gas', filePath);
  changedFiles.add(relativePath);

  // デバウンス: 5秒待機してバッチ処理
  if (changeTimer) {
    clearTimeout(changeTimer);
  }

  changeTimer = setTimeout(() => {
    handleChanges();
  }, 5000);
}

/**
 * ディレクトリ監視（再帰的）
 */
function watchDirectory(dirPath) {
  try {
    const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const fullPath = path.join(dirPath, filename);

      // ファイル存在チェック
      if (!fs.existsSync(fullPath)) return;

      // ディレクトリはスキップ
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) return;

      onFileChange(fullPath);
    });

    log(`👀 監視開始: ${dirPath}`, 'cyan');

    return watcher;
  } catch (error) {
    log(`❌ 監視開始エラー: ${error.message}`, 'red');
    return null;
  }
}

/**
 * メイン処理
 */
function main() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  🤖 完全自動化ウォッチャー起動', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('', 'reset');
  log('ℹ️  GASファイルを保存すると自動でpushされます', 'blue');
  log('ℹ️  変更後5秒でバッチ処理されます', 'blue');
  log('ℹ️  停止: Ctrl+C', 'blue');
  log('', 'reset');

  // 監視開始
  const watchers = WATCH_DIRS.map(dir => watchDirectory(dir)).filter(w => w !== null);

  if (watchers.length === 0) {
    log('❌ 監視開始失敗', 'red');
    process.exit(1);
  }

  // Ctrl+C処理
  process.on('SIGINT', () => {
    log('', 'reset');
    log('👋 監視を停止しています...', 'yellow');
    watchers.forEach(w => w.close());
    process.exit(0);
  });

  // 初回メッセージ
  setTimeout(() => {
    log('✅ 監視中... ファイルを編集してください', 'green');
    log('', 'reset');
  }, 1000);
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { main };
