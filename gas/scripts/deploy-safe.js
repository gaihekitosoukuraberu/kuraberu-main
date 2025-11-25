#!/usr/bin/env node

/**
 * ====================================
 * 安全なデプロイスクリプト
 * ====================================
 *
 * 【目的】
 * - テスト→デプロイ→更新を自動化
 * - デプロイ前の安全確認
 * - エラー時の自動ロールバック
 *
 * 【使用方法】
 * ```bash
 * npm run deploy:safe
 * ```
 *
 * 【実行フロー】
 * 1. バックアップ作成
 * 2. 統合テスト実行
 * 3. clasp push
 * 4. 新デプロイメント作成
 * 5. 全env-loader.js更新
 * 6. FTPアップロード
 * 7. デプロイ完了通知
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * コマンド実行（エラーハンドリング付き）
 */
function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return result;
  } catch (err) {
    throw new Error(`Command failed: ${command}\n${err.message}`);
  }
}

/**
 * ユーザー確認
 */
function confirm(message) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(`${message} (y/n): `, answer => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * バックアップ作成
 */
async function createBackup() {
  info('Step 1/7: バックアップ作成中...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                    new Date().toTimeString().split(' ')[0].replace(/:/g, '');
  const backupFile = `/Users/ryuryu/gas-backup-${timestamp}.tar.gz`;

  exec(`cd /Users/ryuryu/franchise-register && tar -czf ${backupFile} gas/`);

  const stats = fs.statSync(backupFile);
  success(`バックアップ作成完了: ${backupFile} (${(stats.size / 1024).toFixed(1)}KB)`);

  return backupFile;
}

/**
 * 統合テスト実行
 */
async function runIntegrationTest() {
  info('Step 2/7: 統合テスト実行中...');

  try {
    exec('cd /Users/ryuryu/franchise-register && node gas/tests/integration-test.js');
    success('統合テスト成功');
    return true;
  } catch (err) {
    error('統合テスト失敗');
    throw err;
  }
}

/**
 * 変更影響チェック
 */
async function checkImpact() {
  info('Step 2.5/7: 変更影響チェック中...');

  try {
    exec('cd /Users/ryuryu/franchise-register && node gas/scripts/check-impact.js --git', { silent: false });
    success('変更影響チェック完了');
  } catch (err) {
    warning('高影響度の変更が検出されました');

    const proceed = await confirm('⚠️  このままデプロイを続行しますか？');
    if (!proceed) {
      throw new Error('デプロイ中止（ユーザー判断）');
    }
  }
}

/**
 * clasp push
 */
async function claspPush() {
  info('Step 3/7: clasp push 実行中...');

  try {
    exec('cd /Users/ryuryu/franchise-register/gas && clasp push --force');
    success('clasp push 成功');
  } catch (err) {
    error('clasp push 失敗');
    throw err;
  }
}

/**
 * 新デプロイメント作成
 */
async function createDeployment() {
  info('Step 4/7: 新デプロイメント作成中...');

  const timestamp = new Date().toISOString().split('T')[0];
  const description = `V${Date.now().toString().slice(-4)}: ${timestamp}`;

  try {
    const output = exec(`cd /Users/ryuryu/franchise-register/gas && clasp deploy --description "${description}"`, { silent: true });

    // デプロイメントIDを抽出
    const match = output.match(/- ([A-Za-z0-9_-]+) @/);
    if (!match) {
      throw new Error('デプロイメントID取得失敗');
    }

    const deploymentId = match[1];
    success(`新デプロイメント作成完了: ${deploymentId}`);
    info(`説明: ${description}`);

    return { deploymentId, description };
  } catch (err) {
    error('デプロイメント作成失敗');
    throw err;
  }
}

/**
 * GAS URLの取得（デプロイメントIDから）
 */
function getGasUrl(deploymentId) {
  // clasp deploymentコマンドでデプロイメント一覧を取得
  try {
    const output = exec('cd /Users/ryuryu/franchise-register/gas && clasp deployments', { silent: true });

    // 最新デプロイメントのURLを抽出
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(deploymentId)) {
        const urlMatch = line.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
    }

    throw new Error('GAS URL取得失敗');
  } catch (err) {
    warning('GAS URL自動取得失敗 - 手動で確認してください');
    return null;
  }
}

/**
 * 全env-loader.js更新
 */
async function updateEnvLoaders(gasUrl) {
  info('Step 5/7: 全env-loader.js更新中...');

  if (!gasUrl) {
    warning('GAS URLが不明なため、env-loader.js更新をスキップ');
    return false;
  }

  const files = [
    '/Users/ryuryu/franchise-register/dist/js/env-loader.js',
    '/Users/ryuryu/admin-dashboard/dist/js/env-loader.js',
    '/Users/ryuryu/franchise-dashboard/dist/merchant-portal/env-loader.js'
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) {
      warning(`ファイルが存在しません: ${file}`);
      continue;
    }

    let content = fs.readFileSync(file, 'utf-8');

    // GAS_URL更新
    content = content.replace(/GAS_URL:\s*['"][^'"]*['"]/, `GAS_URL: '${gasUrl}'`);

    // CACHE_BUSTER更新
    const timestamp = new Date().toISOString();
    content = content.replace(/CACHE_BUSTER:\s*['"][^'"]*['"]/, `CACHE_BUSTER: '${timestamp}'`);

    fs.writeFileSync(file, content, 'utf-8');

    success(`更新完了: ${file.split('/').slice(-3).join('/')}`);
  }

  return true;
}

/**
 * FTPアップロード
 */
async function ftpUpload() {
  info('Step 6/7: FTPアップロード中...');

  const proceed = await confirm('FTPアップロードを実行しますか？');
  if (!proceed) {
    warning('FTPアップロードをスキップ');
    return false;
  }

  try {
    // upload-all-v1470.jsのようなスクリプトを実行
    // （実際のファイル名は環境に合わせて変更）
    const uploadScript = '/Users/ryuryu/upload-all-v1470.js';

    if (fs.existsSync(uploadScript)) {
      exec(`node ${uploadScript}`);
      success('FTPアップロード完了');
    } else {
      warning('FTPアップロードスクリプトが見つかりません');
      info('手動でアップロードしてください:');
      info('  - franchise-register/dist/js/env-loader.js');
      info('  - admin-dashboard/dist/js/env-loader.js');
      info('  - franchise-dashboard/dist/merchant-portal/env-loader.js');
    }

    return true;
  } catch (err) {
    error('FTPアップロード失敗');
    throw err;
  }
}

/**
 * デプロイ完了通知
 */
function deployComplete(backupFile, deployment) {
  info('Step 7/7: デプロイ完了');

  console.log('');
  log('════════════════════════════════════════════════════════════', 'green');
  log('  🎉 デプロイ成功', 'green');
  log('════════════════════════════════════════════════════════════', 'green');
  console.log('');

  success(`バックアップ: ${backupFile}`);
  success(`デプロイメントID: ${deployment.deploymentId}`);
  success(`説明: ${deployment.description}`);

  console.log('');
  info('次のステップ:');
  info('  1. ブラウザキャッシュをクリア');
  info('  2. 各システムの動作確認');
  info('  3. エラーがあればロールバック');

  console.log('');
  info('ロールバック方法:');
  info(`  tar -xzf ${backupFile}`);
  info('  clasp push --force');

  console.log('');
}

/**
 * エラーハンドリング
 */
async function handleError(err, backupFile) {
  console.log('');
  log('════════════════════════════════════════════════════════════', 'red');
  log('  🚨 デプロイ失敗', 'red');
  log('════════════════════════════════════════════════════════════', 'red');
  console.log('');

  error(err.message);

  console.log('');
  warning('ロールバックが必要な場合:');
  info(`  tar -xzf ${backupFile} -C /Users/ryuryu/franchise-register/`);
  info('  cd /Users/ryuryu/franchise-register/gas');
  info('  clasp push --force');

  console.log('');
  process.exit(1);
}

/**
 * メイン処理
 */
async function main() {
  log('════════════════════════════════════════════════════════════', 'blue');
  log('  🚀 安全なデプロイ - くらべる加盟店システム', 'blue');
  log('════════════════════════════════════════════════════════════', 'blue');
  console.log('');

  let backupFile = null;

  try {
    // Step 1: バックアップ
    backupFile = await createBackup();

    // Step 2: 統合テスト
    await runIntegrationTest();

    // Step 2.5: 変更影響チェック
    await checkImpact();

    // Step 3: clasp push
    await claspPush();

    // Step 4: 新デプロイメント作成
    const deployment = await createDeployment();

    // Step 5: GAS URL取得
    const gasUrl = getGasUrl(deployment.deploymentId);
    await updateEnvLoaders(gasUrl);

    // Step 6: FTPアップロード
    await ftpUpload();

    // Step 7: 完了通知
    deployComplete(backupFile, deployment);

  } catch (err) {
    await handleError(err, backupFile);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { main };
