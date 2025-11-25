#!/usr/bin/env node

/**
 * 🔄 GAS URL同期スクリプト（GitHub Actions専用）
 *
 * @HEAD デプロイメントIDを受け取り、全てのenv-loader系ファイルを自動更新
 * Single Source of Truth: /js/env-loader.js
 *
 * Usage: node sync-master-env-loader.js <DEPLOYMENT_ID>
 */

const fs = require('fs');
const path = require('path');

const DEPLOYMENT_ID = process.argv[2];

if (!DEPLOYMENT_ID) {
  console.error('❌ ERROR: デプロイメントIDが指定されていません');
  console.error('Usage: node sync-master-env-loader.js <DEPLOYMENT_ID>');
  process.exit(1);
}

const GAS_URL = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;
const TIMESTAMP = new Date().toISOString();

console.log('🔄 GAS URL同期開始');
console.log(`📍 Deployment ID: ${DEPLOYMENT_ID}`);
console.log(`📍 GAS URL: ${GAS_URL}`);
console.log('');

// ============================================
// 1️⃣ マスターenv-loader.js を更新
// ============================================
const MASTER_ENV_LOADER_PATH = path.join(__dirname, 'js', 'env-loader.js');

try {
  let content = fs.readFileSync(MASTER_ENV_LOADER_PATH, 'utf8');

  // 1行目のコメントを更新
  content = content.replace(
    /^\/\/ Auto-synced: .* - Deployment: .*/,
    `// Auto-synced: ${TIMESTAMP} - Deployment: ${DEPLOYMENT_ID}`
  );

  // GAS_URL を更新
  content = content.replace(
    /GAS_URL: 'https:\/\/script\.google\.com\/macros\/s\/[^']+'/,
    `GAS_URL: '${GAS_URL}'`
  );

  // FALLBACK_GAS_URL を更新
  content = content.replace(
    /FALLBACK_GAS_URL: 'https:\/\/script\.google\.com\/macros\/s\/[^']+'/,
    `FALLBACK_GAS_URL: '${GAS_URL}'`
  );

  // EMERGENCY_GAS_URL を更新
  content = content.replace(
    /EMERGENCY_GAS_URL: 'https:\/\/script\.google\.com\/macros\/s\/[^']+'/,
    `EMERGENCY_GAS_URL: '${GAS_URL}'`
  );

  // CACHE_BUSTER を更新
  const cacheBuster = Date.now().toString();
  content = content.replace(
    /CACHE_BUSTER: '[^']+'/,
    `CACHE_BUSTER: '${cacheBuster}'`
  );

  fs.writeFileSync(MASTER_ENV_LOADER_PATH, content, 'utf8');
  console.log('✅ マスターenv-loader.js 更新完了');
  console.log(`   📍 ${MASTER_ENV_LOADER_PATH}`);
} catch (error) {
  console.error('❌ マスターenv-loader.js 更新失敗:', error.message);
  process.exit(1);
}

// ============================================
// 2️⃣ LP フォールバックファイルを更新（存在する場合）
// ============================================
const LP_FILES = [
  'lp/js/cv-api.js',
  'lp/js/utils.js'
];

LP_FILES.forEach(relativePath => {
  const filePath = path.join(__dirname, relativePath);

  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // URLを更新（複数のパターンに対応）
      content = content.replace(
        /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g,
        GAS_URL
      );

      // フォールバックURL定数を更新
      content = content.replace(
        /const\s+FALLBACK_GAS_URL\s*=\s*['"][^'"]+['"]/,
        `const FALLBACK_GAS_URL = '${GAS_URL}'`
      );

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${relativePath} 更新完了`);
    } catch (error) {
      console.warn(`⚠️ ${relativePath} 更新スキップ:`, error.message);
    }
  } else {
    console.log(`ℹ️ ${relativePath} は存在しません（スキップ）`);
  }
});

// ============================================
// 3️⃣ LP mail.php のフォールバックURLを更新
// ============================================
const MAIL_PHP_PATH = path.join(__dirname, 'lp', 'mail.php');

if (fs.existsSync(MAIL_PHP_PATH)) {
  try {
    let content = fs.readFileSync(MAIL_PHP_PATH, 'utf8');

    // $fallbackUrl 変数を更新
    content = content.replace(
      /\$fallbackUrl\s*=\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+['"]/,
      `$fallbackUrl = '${GAS_URL}'`
    );

    fs.writeFileSync(MAIL_PHP_PATH, content, 'utf8');
    console.log('✅ lp/mail.php フォールバックURL更新完了');
  } catch (error) {
    console.warn('⚠️ lp/mail.php 更新スキップ:', error.message);
  }
} else {
  console.log('ℹ️ lp/mail.php は存在しません（スキップ）');
}

// ============================================
// 4️⃣ 各ディレクトリのenv-loader.jsをマスターからコピー
// ============================================
const ENV_LOADER_COPIES = [
  'admin-dashboard/js/env-loader.js',
  'franchise-register/js/env-loader.js',
  'franchise-dashboard/merchant-portal/env-loader.js',
  'estimate-keep-system/js/env-loader.js'
];

console.log('');
console.log('📋 各ディレクトリのenv-loader.jsを同期中...');

ENV_LOADER_COPIES.forEach(relativePath => {
  const destPath = path.join(__dirname, relativePath);
  const destDir = path.dirname(destPath);

  try {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // マスターファイルをコピー
    const masterContent = fs.readFileSync(MASTER_ENV_LOADER_PATH, 'utf8');
    fs.writeFileSync(destPath, masterContent, 'utf8');
    console.log(`✅ ${relativePath} 同期完了`);
  } catch (error) {
    console.error(`❌ ${relativePath} 同期失敗:`, error.message);
  }
});

console.log('');
console.log('🎉 全ての同期が完了しました');
console.log(`📍 GAS URL: ${GAS_URL}`);
console.log(`📍 Deployment ID: ${DEPLOYMENT_ID}`);
console.log('');
