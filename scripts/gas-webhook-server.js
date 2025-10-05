#!/usr/bin/env node

/**
 * GAS Webhook Server
 * GASからのHTML生成リクエストを受け取り、FTPアップロードを実行
 */

const express = require('express');
const bodyParser = require('body-parser');
const { uploadMerchantHTML } = require('./upload-merchant-html');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

/**
 * HTML生成・アップロードエンドポイント
 */
app.post('/api/upload-merchant-html', async (req, res) => {
  try {
    const { urlSlug, html } = req.body;

    if (!urlSlug || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing urlSlug or html'
      });
    }

    // URLスラッグ検証
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(urlSlug)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL slug format'
      });
    }

    // FTPアップロード実行
    const result = await uploadMerchantHTML(urlSlug, html);

    if (result.success) {
      return res.json({
        success: true,
        url: result.url,
        message: 'HTML uploaded successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ヘルスチェック
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * サーバー起動
 */
app.listen(PORT, () => {
  console.log(`🚀 GAS Webhook Server running on port ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/upload-merchant-html`);
});

module.exports = app;
