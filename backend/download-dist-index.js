#!/usr/bin/env node
const ftp = require('basic-ftp');

const FTP_CONFIG = {
  host: 'sv16424.xserver.jp',
  user: 'xs997058',
  password: 'z9latuup',
  port: 21,
  secure: false
};

async function downloadDistIndex() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access(FTP_CONFIG);
    await client.cd('/public_html/franchise-dashboard/dist');

    console.log('📥 dist/index.html (776KB, 10月3日) をダウンロード中...');
    await client.downloadTo('/Users/ryuryu/franchise-dashboard/index-dist-oct3-776kb.html', 'index.html');

    console.log('✅ ダウンロード完了: /Users/ryuryu/franchise-dashboard/index-dist-oct3-776kb.html');

  } catch (err) {
    console.error('❌ エラー:', err);
  } finally {
    client.close();
  }
}

downloadDistIndex();
