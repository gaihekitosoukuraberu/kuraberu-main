#!/usr/bin/env node

/**
 * franchise-dashboardを本番環境にデプロイ
 */

const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// FTP設定
const FTP_CONFIG = {
  host: 'sv16424.xserver.jp',
  user: 'xs997058',
  password: 'z9latuup',
  port: 21,
  secure: false
};

async function deployFranchiseDashboard() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('🚀 FTP接続中...');
    await client.access(FTP_CONFIG);

    const localDir = '/Users/ryuryu/franchise-dashboard/dist';
    const remoteDir = '/public_html/franchise-dashboard';

    console.log(`📦 ${localDir} → ${remoteDir}`);

    // リモートディレクトリに移動
    await client.cd(remoteDir);

    // index.htmlをアップロード
    const indexPath = path.join(localDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log('📤 index.html をアップロード中...');
      await client.uploadFrom(indexPath, 'index.html');
      console.log('✅ index.html アップロード完了');
    }

    // merchant-portalディレクトリのファイルもアップロード
    const merchantPortalLocal = path.join(localDir, 'merchant-portal');
    if (fs.existsSync(merchantPortalLocal)) {
      console.log('📤 merchant-portal をアップロード中...');
      await client.ensureDir('merchant-portal');
      await client.uploadFromDir(merchantPortalLocal, 'merchant-portal');
      console.log('✅ merchant-portal アップロード完了');
    }

    console.log('\n✅ デプロイ完了！');
    console.log('🔗 https://gaihekikuraberu.com/franchise-dashboard/');

  } catch (err) {
    console.error('❌ デプロイ失敗:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

deployFranchiseDashboard();
