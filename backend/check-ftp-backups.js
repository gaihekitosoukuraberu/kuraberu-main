#!/usr/bin/env node
const ftp = require('basic-ftp');

const FTP_CONFIG = {
  host: 'sv16424.xserver.jp',
  user: 'xs997058',
  password: 'z9latuup',
  port: 21,
  secure: false
};

async function checkBackups() {
  const client = new ftp.Client();

  try {
    await client.access(FTP_CONFIG);

    // public_html直下のディレクトリ一覧
    await client.cd('/public_html');
    const list = await client.list();

    console.log('\n=== public_html ディレクトリ一覧 ===\n');
    list.forEach(f => {
      if (f.isDirectory && (f.name.includes('franchise') || f.name.includes('backup'))) {
        console.log(`📁 ${f.name} (${f.modifiedAt})`);
      }
    });

    // franchise-dashboard内のバックアップ確認
    await client.cd('/public_html/franchise-dashboard');
    const dashList = await client.list();

    console.log('\n=== franchise-dashboard 内のファイル ===\n');
    dashList.forEach(f => {
      if (f.name.includes('index') || f.name.includes('backup')) {
        console.log(`${f.isDirectory ? '📁' : '📄'} ${f.name} (${f.size} bytes, ${f.modifiedAt})`);
      }
    });

  } catch (err) {
    console.error('エラー:', err);
  } finally {
    client.close();
  }
}

checkBackups();
