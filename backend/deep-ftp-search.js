#!/usr/bin/env node
const ftp = require('basic-ftp');

const FTP_CONFIG = {
  host: 'sv16424.xserver.jp',
  user: 'xs997058',
  password: 'z9latuup',
  port: 21,
  secure: false
};

async function deepSearch(client, path = '/public_html', depth = 0) {
  if (depth > 3) return;

  try {
    await client.cd(path);
    const list = await client.list();

    for (const item of list) {
      if (item.isDirectory && !item.name.startsWith('.') && !item.name.includes('node_modules')) {
        const subPath = `${path}/${item.name}`;
        console.log(`${'  '.repeat(depth)}📁 ${subPath}`);

        await deepSearch(client, subPath, depth + 1);
        await client.cd(path);
      } else if (!item.isDirectory) {
        const sizeKB = Math.round(item.size / 1024);
        if (sizeKB > 800 || item.name.includes('backup') || item.name.includes('index')) {
          console.log(`${'  '.repeat(depth)}📄 ${item.name} (${sizeKB}KB) ${item.modifiedAt}`);

          if (sizeKB > 800) {
            const fileName = item.name.replace(/[\/\\]/g, '_');
            const localPath = `/Users/ryuryu/franchise-dashboard/ftp-deep-${path.replace(/\//g, '_')}-${fileName}`;
            console.log(`${'  '.repeat(depth)}   ⬇️ ダウンロード中...`);
            await client.downloadTo(localPath, item.name);
            console.log(`${'  '.repeat(depth)}   ✅ ${localPath}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error in ${path}:`, err.message);
  }
}

async function main() {
  const client = new ftp.Client();

  try {
    await client.access(FTP_CONFIG);
    console.log('🔍 FTPサーバー全体を深く検索中...\n');
    await deepSearch(client);
    console.log('\n✅ 検索完了');
  } catch (err) {
    console.error('エラー:', err);
  } finally {
    client.close();
  }
}

main();
