#!/usr/bin/env node
/**
 * ローカルファイル検証スクリプト
 * デプロイ前にローカルファイルが正しいことを確認
 */

const fs = require('fs');
const path = require('path');

// 期待される値
const EXPECTED = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzAoTXkkw6vltB2uNAsEsFUQ_sToWKOuraH7Zr3d9yZeaV_ncrEWbIjUtVJ7DqQg93FQw/exec',
  CACHE_BUSTER: '1731855720000',
  VERSION: 'V1816'
};

console.log('========================================');
console.log('📋 ローカルファイル検証');
console.log('========================================\n');

let allGood = true;

// 1. env-loader.js のチェック
console.log('1️⃣  env-loader.js をチェック...');
const envLoaderPath = path.join(__dirname, 'js', 'env-loader.js');

if (!fs.existsSync(envLoaderPath)) {
  console.log('❌ env-loader.js が見つかりません:', envLoaderPath);
  allGood = false;
} else {
  const content = fs.readFileSync(envLoaderPath, 'utf8');

  // GAS_URL チェック
  const oldUrls = [
    'AKfycbxGBYjSiaHmFj',  // 切れているURL
    'AKfycbxGBYjSiaHG2W7RrRyBBwRldeDDlbC0ILnCu75T-mFj',  // 旧バージョン
    'AKfycbwBOj5KN_lIXxopGqRukr9GqHbPmxbENMttY0FTfZgc'  // 更に古いバージョン
  ];

  if (content.includes(EXPECTED.GAS_URL)) {
    console.log('✅ GAS_URL: 正しい');
  } else if (oldUrls.some(oldUrl => content.includes(oldUrl))) {
    console.log('❌ GAS_URL: 古い');
    console.log('   現在のファイルに古いURLが含まれています');
    allGood = false;
  } else {
    console.log('⚠️  GAS_URL: 確認できません');
    console.log('   手動でファイルを確認してください');
    allGood = false;
  }

  // CACHE_BUSTER チェック
  if (content.includes(`CACHE_BUSTER: '${EXPECTED.CACHE_BUSTER}'`)) {
    console.log('✅ CACHE_BUSTER: 最新 (V1816)');
  } else {
    console.log('❌ CACHE_BUSTER: 古い');
    allGood = false;
  }

  // ファイルサイズチェック
  const stats = fs.statSync(envLoaderPath);
  console.log(`ℹ️  ファイルサイズ: ${stats.size} bytes`);
}

console.log('');

// 2. api-client.js のチェック
console.log('2️⃣  api-client.js をチェック...');
const apiClientPath = path.join(__dirname, 'js', 'api-client.js');

if (!fs.existsSync(apiClientPath)) {
  console.log('❌ api-client.js が見つかりません');
  allGood = false;
} else {
  const content = fs.readFileSync(apiClientPath, 'utf8');

  // デバッグコードの存在確認
  if (content.includes('スマホデバッグ用：詳細なエラーメッセージ')) {
    console.log('✅ デバッグコード: 含まれている');
  } else {
    console.log('⚠️  デバッグコード: 見つかりません（古いバージョンかも）');
  }

  const stats = fs.statSync(apiClientPath);
  console.log(`ℹ️  ファイルサイズ: ${stats.size} bytes`);
}

console.log('');

// 3. index.html のチェック
console.log('3️⃣  index.html をチェック...');
const indexPath = path.join(__dirname, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.log('❌ index.html が見つかりません');
  allGood = false;
} else {
  const content = fs.readFileSync(indexPath, 'utf8');

  // デバッグコードの存在確認
  if (content.includes('スマホデバッグ用：環境情報をアラート表示')) {
    console.log('✅ デバッグコード: 含まれている');
  } else {
    console.log('⚠️  デバッグコード: 見つかりません');
  }

  const stats = fs.statSync(indexPath);
  console.log(`ℹ️  ファイルサイズ: ${stats.size} bytes`);
}

console.log('');

// 4. deployment-check.html の存在確認
console.log('4️⃣  deployment-check.html をチェック...');
const deployCheckPath = path.join(__dirname, 'deployment-check.html');

if (!fs.existsSync(deployCheckPath)) {
  console.log('❌ deployment-check.html が見つかりません');
  allGood = false;
} else {
  console.log('✅ deployment-check.html: 存在する');
}

console.log('');
console.log('========================================');

if (allGood) {
  console.log('🎉 すべてのファイルが正しいです！');
  console.log('');
  console.log('📦 次のステップ:');
  console.log('1. DEPLOY-NOW.txt を開いて手順を確認');
  console.log('2. Cyberduckで以下のファイルをアップロード:');
  console.log('   - js/env-loader.js （削除→アップロード）');
  console.log('   - js/api-client.js');
  console.log('   - index.html');
  console.log('   - deployment-check.html');
  console.log('3. deployment-check.html で確認');
} else {
  console.log('⚠️  問題が見つかりました');
  console.log('上記のエラーを修正してから再度実行してください');
  process.exit(1);
}

console.log('========================================');
