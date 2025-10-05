#!/usr/bin/env node
const ftp = require('basic-ftp');

const FTP_CONFIG = {
  host: 'sv16424.xserver.jp',
  user: 'xs997058',
  password: 'z9latuup',
  port: 21,
  secure: false
};

async function searchAllBackups() {
  const client = new ftp.Client();

  try {
    await client.access(FTP_CONFIG);

    console.log('\n=== public_html 全ファイル検索 ===\n');

    // franchise-dashboard内の全ファイル
    await client.cd('/public_html/franchise-dashboard');
    const allFiles = await client.list();

    console.log('全ファイル一覧:');
    allFiles.forEach(f => {
      const size = Math.round(f.size / 1024);
      console.log(`${f.isDirectory ? '📁' : '📄'} ${f.name.padEnd(40)} ${size}KB (${f.modifiedAt})`);
    });

    // 800KB以上のファイルをダウンロード
    console.log('\n\n=== 800KB以上のファイル ===\n');
    for (const file of allFiles) {
      if (!file.isDirectory && file.size > 800000) {
        const sizeKB = Math.round(file.size / 1024);
        console.log(`🎯 ${file.name} (${sizeKB}KB) - ダウンロードしています...`);

        const localPath = `/Users/ryuryu/franchise-dashboard/ftp-${file.name}`;
        await client.downloadTo(localPath, file.name);
        console.log(`   ✅ 保存: ${localPath}`);
      }
    }

  } catch (err) {
    console.error('エラー:', err);
  } finally {
    client.close();
  }
}

searchAllBackups();
