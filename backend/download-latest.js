#!/usr/bin/env node

/**
 * 本番環境から最新のindex.htmlをダウンロード
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

async function downloadLatest() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log('🚀 FTP接続中...');
    await client.access(FTP_CONFIG);

    const remoteDir = '/public_html/franchise-dashboard';
    const localBackup = '/Users/ryuryu/franchise-dashboard/backup-from-server.html';

    console.log(`📥 ${remoteDir}/index.html をダウンロード中...`);

    await client.cd(remoteDir);
    await client.downloadTo(localBackup, 'index.html');

    console.log(`✅ ダウンロード完了: ${localBackup}`);
    console.log('\n次のコマンドで確認してください:');
    console.log(`open ${localBackup}`);

  } catch (err) {
    console.error('❌ ダウンロード失敗:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

downloadLatest();
