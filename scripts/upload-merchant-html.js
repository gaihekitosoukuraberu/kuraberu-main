#!/usr/bin/env node

/**
 * 加盟店静的HTMLアップロードスクリプト
 * Google DriveからHTMLを取得してFTPでアップロード
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

/**
 * メイン処理
 */
async function uploadMerchantHTML(urlSlug, htmlContent) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    // FTP接続
    await client.access(FTP_CONFIG);

    // リモートディレクトリを作成
    const remoteDir = `/public_html/merchants/${urlSlug}`;

    try {
      await client.ensureDir(remoteDir);
    } catch (err) {
      console.log('Directory already exists or created');
    }

    // 一時ファイルに保存
    const tempFile = path.join('/tmp', `${urlSlug}.html`);
    fs.writeFileSync(tempFile, htmlContent, 'utf8');

    // index.htmlとしてアップロード
    await client.uploadFrom(tempFile, `${remoteDir}/index.html`);

    // 一時ファイル削除
    fs.unlinkSync(tempFile);

    console.log(`✅ Successfully uploaded: https://gaihekikuraberu.com/merchants/${urlSlug}/`);

    return {
      success: true,
      url: `https://gaihekikuraberu.com/merchants/${urlSlug}/`
    };

  } catch (err) {
    console.error('❌ Upload failed:', err);
    return {
      success: false,
      error: err.message
    };
  } finally {
    client.close();
  }
}

/**
 * コマンドライン実行
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node upload-merchant-html.js <urlSlug> <htmlFile>');
    process.exit(1);
  }

  const urlSlug = args[0];
  const htmlFile = args[1];

  if (!fs.existsSync(htmlFile)) {
    console.error(`File not found: ${htmlFile}`);
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(htmlFile, 'utf8');

  uploadMerchantHTML(urlSlug, htmlContent)
    .then(result => {
      if (result.success) {
        console.log('Upload completed successfully!');
        process.exit(0);
      } else {
        console.error('Upload failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { uploadMerchantHTML };
