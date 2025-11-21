#!/usr/bin/env node

/**
 * マスターenv-loader.jsを最新のGAS URLに同期（単一ソース）
 *
 * 使い方:
 *   node sync-master-env-loader.js <DEPLOYMENT_ID>
 *
 * 例:
 *   node sync-master-env-loader.js AKfycbx8zH0Af6u0BkbPgxTSqg3eG7O24Wnev3kr1ro8nsGsl7Nkajls4JIf6gRFdd82v4no1Q
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数からDeployment IDを取得
const deploymentId = process.argv[2];

if (!deploymentId) {
  console.error('❌ エラー: Deployment IDを指定してください');
  console.error('使い方: node sync-master-env-loader.js <DEPLOYMENT_ID>');
  process.exit(1);
}

const NEW_GAS_URL = `https://script.google.com/macros/s/${deploymentId}/exec`;
const TIMESTAMP = new Date().toISOString();
const CACHE_BUSTER = Date.now();

console.log('🔄 マスターenv-loader.jsを最新GAS URLに同期中...\n');
console.log(`📦 Deployment ID: ${deploymentId}`);
console.log(`🔗 新しいURL: ${NEW_GAS_URL}`);
console.log(`⏰ タイムスタンプ: ${TIMESTAMP}\n`);

// マスターenv-loader.jsのパス
const masterEnvLoader = {
  path: path.join(__dirname, 'js/env-loader.js'),
  name: 'Master env-loader.js'
};

// マスターenv-loader.jsを更新
try {
  if (!fs.existsSync(masterEnvLoader.path)) {
    console.error(`❌ ${masterEnvLoader.name}: ファイルが存在しません - ${masterEnvLoader.path}`);
    process.exit(1);
  }

  let content = fs.readFileSync(masterEnvLoader.path, 'utf8');

  // GAS_URLを更新（メインURL）
  content = content.replace(
    /GAS_URL:\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g,
    `GAS_URL: '${NEW_GAS_URL}'`
  );

  // FALLBACK_GAS_URLを更新
  content = content.replace(
    /FALLBACK_GAS_URL:\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g,
    `FALLBACK_GAS_URL: '${NEW_GAS_URL}'`
  );

  // EMERGENCY_GAS_URLを更新
  content = content.replace(
    /EMERGENCY_GAS_URL:\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g,
    `EMERGENCY_GAS_URL: '${NEW_GAS_URL}'`
  );

  // キャッシュバスターを更新
  content = content.replace(
    /CACHE_BUSTER:\s*['"][^'"]*['"]/g,
    `CACHE_BUSTER: '${CACHE_BUSTER}'`
  );

  // タイムスタンプコメントを追加/更新
  const timestampComment = `// Auto-synced: ${TIMESTAMP} - Deployment: ${deploymentId}`;
  if (content.includes('// Auto-synced:')) {
    content = content.replace(/\/\/ Auto-synced:.*/, timestampComment);
  } else {
    content = timestampComment + '\n' + content;
  }

  fs.writeFileSync(masterEnvLoader.path, content, 'utf8');
  console.log(`✅ ${masterEnvLoader.name}`);
  console.log(`   ${masterEnvLoader.path}`);
  console.log(`   キャッシュバスター: ${CACHE_BUSTER}\n`);
} catch (err) {
  console.error(`❌ ${masterEnvLoader.name}: ${err.message}`);
  process.exit(1);
}

// ============================================
// フォールバックURL更新（cv-api.js, utils.js）
// ============================================
console.log('🔄 フォールバックURL更新中...\n');

const fallbackFiles = [
  {
    path: path.join(__dirname, 'lp/js/cv-api.js'),
    name: 'LP CV-API (fallback)',
    pattern: /\|\|\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g,
    replacement: `|| '${NEW_GAS_URL}'`
  },
  {
    path: path.join(__dirname, 'lp/js/utils.js'),
    name: 'LP Utils (fallback)',
    pattern: /\|\|\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g,
    replacement: `|| '${NEW_GAS_URL}'`
  }
];

let fallbackSuccess = 0;
fallbackFiles.forEach(file => {
  try {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️  ${file.name}: ファイルが存在しません`);
      return;
    }

    let content = fs.readFileSync(file.path, 'utf8');

    if (file.pattern.test(content)) {
      content = content.replace(file.pattern, file.replacement);
      fs.writeFileSync(file.path, content, 'utf8');
      console.log(`✅ ${file.name}`);
      console.log(`   ${file.path}`);
      fallbackSuccess++;
    } else {
      console.warn(`⚠️  ${file.name}: フォールバックURLパターンが見つかりません`);
    }
  } catch (err) {
    console.error(`❌ ${file.name}: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✅ 同期完了`);
console.log(`   マスターenv-loader.js: 1件`);
console.log(`   フォールバックファイル: ${fallbackSuccess}件`);
console.log('='.repeat(50));
