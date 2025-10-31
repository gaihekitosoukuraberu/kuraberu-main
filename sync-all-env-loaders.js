#!/usr/bin/env node

/**
 * 全env-loader.jsを最新のGAS URLに同期
 *
 * 使い方:
 *   node sync-all-env-loaders.js <DEPLOYMENT_ID>
 *
 * 例:
 *   node sync-all-env-loaders.js AKfycbx-4ciHOeL5XqDIA9OC1qbq7gyh14ZMLQBY0VCIdmaYnnpzkAUzJW4LGtyxPV-OPTYDcA
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数からDeployment IDを取得
const deploymentId = process.argv[2];

if (!deploymentId) {
  console.error('❌ エラー: Deployment IDを指定してください');
  console.error('使い方: node sync-all-env-loaders.js <DEPLOYMENT_ID>');
  process.exit(1);
}

const NEW_GAS_URL = `https://script.google.com/macros/s/${deploymentId}/exec`;
const TIMESTAMP = new Date().toISOString();
const CACHE_BUSTER = Date.now();

console.log('🔄 全env-loader.jsを最新GAS URLに同期中...\n');
console.log(`📦 Deployment ID: ${deploymentId}`);
console.log(`🔗 新しいURL: ${NEW_GAS_URL}`);
console.log(`⏰ タイムスタンプ: ${TIMESTAMP}\n`);

// 全システムのenv-loader.jsパス
const files = [
  {
    path: path.join(__dirname, 'franchise-register/js/env-loader.js'),
    name: 'Franchise Register'
  }
];

let successCount = 0;
let errorCount = 0;

files.forEach(file => {
  try {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️  ${file.name}: ファイルが存在しません - ${file.path}`);
      errorCount++;
      return;
    }

    let content = fs.readFileSync(file.path, 'utf8');

    // GAS_URLを更新（複数のパターンに対応）
    const urlPatterns = [
      /GAS_URL:\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g,
      /const\s+GAS_URL\s*=\s*['"]https:\/\/script\.google\.com\/macros\/s\/[^'"]+\/exec['"]/g
    ];

    urlPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, `GAS_URL: '${NEW_GAS_URL}'`);
      }
    });

    // キャッシュバスターを更新（動的に生成）
    const cacheBusterPatterns = [
      /CACHE_BUSTER:\s*['"][^'"]*['"]/g,
      /const\s+CACHE_BUSTER\s*=\s*['"][^'"]*['"]/g,
      /\?v=[^&'"\s]+/g
    ];

    cacheBusterPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          if (match.startsWith('?v=')) {
            return `?v=${CACHE_BUSTER}`;
          } else if (match.includes('CACHE_BUSTER')) {
            return `CACHE_BUSTER: '${CACHE_BUSTER}'`;
          }
          return match;
        });
      }
    });

    // タイムスタンプコメントを追加/更新
    const timestampComment = `// Auto-synced: ${TIMESTAMP} - Deployment: ${deploymentId}`;
    if (content.includes('// Auto-synced:')) {
      content = content.replace(/\/\/ Auto-synced:.*/, timestampComment);
    } else {
      content = timestampComment + '\n' + content;
    }

    fs.writeFileSync(file.path, content, 'utf8');
    console.log(`✅ ${file.name}`);
    console.log(`   ${file.path}`);
    successCount++;
  } catch (err) {
    console.error(`❌ ${file.name}: ${err.message}`);
    console.error(`   ${file.path}`);
    errorCount++;
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✅ 成功: ${successCount}件`);
console.log(`⚠️  警告: ${errorCount}件（存在しないファイル）`);
console.log('='.repeat(50));

// 存在しないファイルは警告のみで、エラー終了しない
// 少なくとも1つ成功していればOK
if (successCount === 0) {
  console.error('❌ エラー: 更新可能なファイルが1つもありませんでした');
  process.exit(1);
}
