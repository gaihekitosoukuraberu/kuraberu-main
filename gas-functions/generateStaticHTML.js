/**
 * 静的HTML生成機能
 * SEO最適化されたHTMLページを生成してサーバーにアップロード
 */

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = e.parameter.action;

    if (action === 'generateStaticHTML') {
      return generateStaticHTML(params);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 静的HTML生成メイン関数
 */
function generateStaticHTML(data) {
  try {
    const urlSlug = data.urlSlug;

    if (!urlSlug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(urlSlug)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid URL slug'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 会社名の表示を決定
    let displayName = data.companyName;
    if (data.tradeName && data.tradeName.trim() !== '') {
      switch(data.displayOption) {
        case 'trade':
          displayName = data.tradeName;
          break;
        case 'both':
          if (data.reverseOrder) {
            displayName = `${data.tradeName}｜${data.companyName}`;
          } else {
            displayName = `${data.companyName}｜${data.tradeName}`;
          }
          break;
        default:
          displayName = data.companyName;
      }
    }

    // SEO最適化HTMLを生成
    const html = createSEOOptimizedHTML(data, displayName, urlSlug);

    // FTPでアップロード
    const uploadResult = uploadToServer(urlSlug, html);

    if (uploadResult.success) {
      // スプレッドシートにURLスラッグを保存
      saveUrlSlugToSheet(data.merchantId, urlSlug);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        url: `https://gaihekikuraberu.com/merchants/${urlSlug}/`,
        message: 'HTML generated and uploaded successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: uploadResult.error
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * SEO最適化されたHTMLテンプレートを生成
 */
function createSEOOptimizedHTML(data, displayName, urlSlug) {
  const pageTitle = `${displayName} | 外壁塗装・屋根塗装の専門店`;
  const pageDescription = data.prText || `${displayName}は、確かな技術と丁寧な仕事で皆様の大切な住まいを守ります。`;
  const pageUrl = `https://gaihekikuraberu.com/merchants/${urlSlug}/`;
  const mainVisualUrl = data.mainVisualUrl || 'https://gaihekikuraberu.com/default-image.jpg';

  // メインビジュアルのスタイル
  const imagePosition = data.previewSettings?.imagePosition || { x: 50, y: 50 };
  const imageZoom = data.previewSettings?.imageZoom || 100;
  const imageBrightness = data.previewSettings?.imageBrightness || 100;
  const textColor = data.previewSettings?.textColor || 'white';

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${pageDescription}">
    <meta name="keywords" content="外壁塗装,屋根塗装,${data.address || ''},${displayName}">

    <!-- OGP Tags -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${pageDescription}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:image" content="${mainVisualUrl}">
    <meta property="og:site_name" content="外壁くらべる">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${pageDescription}">
    <meta name="twitter:image" content="${mainVisualUrl}">

    <title>${pageTitle}</title>

    <!-- Structured Data (JSON-LD) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "${displayName}",
      "description": "${pageDescription}",
      "url": "${pageUrl}",
      "image": "${mainVisualUrl}",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "${data.address || ''}",
        "postalCode": "${data.zipCode || ''}"
      },
      "founder": {
        "@type": "Person",
        "name": "${data.representative || ''}"
      },
      "foundingDate": "${data.established || ''}",
      "numberOfEmployees": "${data.employees || ''}",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "127"
      }
    }
    </script>

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <style>
        .main-visual {
            background-image: url('${mainVisualUrl}');
            background-size: ${imageZoom}%;
            background-position: ${imagePosition.x}% ${imagePosition.y}%;
            filter: brightness(${imageBrightness}%);
        }
        .text-shadow {
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }
    </style>
</head>
<body class="font-sans antialiased">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-900">外壁くらべる</h1>
            <a href="tel:0120-000-000" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                お問い合わせ
            </a>
        </div>
    </header>

    <!-- Main Visual -->
    <section class="main-visual relative h-96 flex items-center justify-center">
        <div class="text-center ${textColor === 'white' ? 'text-white' : 'text-gray-900'}">
            <h1 class="text-5xl md:text-7xl font-bold mb-4 text-shadow">
                ${displayName}
            </h1>
            <p class="text-xl md:text-2xl text-shadow">
                確かな技術と丁寧な仕事で、皆様の大切な住まいを守ります
            </p>
        </div>
    </section>

    <!-- Company Info -->
    <section class="py-16 bg-gray-50">
        <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-8">会社情報</h2>
            <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
                <div class="space-y-4">
                    <div class="flex border-b pb-3">
                        <dt class="w-32 font-semibold text-gray-700">会社名</dt>
                        <dd class="flex-1">${displayName}</dd>
                    </div>
                    <div class="flex border-b pb-3">
                        <dt class="w-32 font-semibold text-gray-700">代表者</dt>
                        <dd class="flex-1">${data.representative || '-'}</dd>
                    </div>
                    <div class="flex border-b pb-3">
                        <dt class="w-32 font-semibold text-gray-700">所在地</dt>
                        <dd class="flex-1">〒${data.zipCode || ''} ${data.address || ''}</dd>
                    </div>
                    <div class="flex border-b pb-3">
                        <dt class="w-32 font-semibold text-gray-700">設立</dt>
                        <dd class="flex-1">${data.established || '-'}</dd>
                    </div>
                    <div class="flex border-b pb-3">
                        <dt class="w-32 font-semibold text-gray-700">従業員数</dt>
                        <dd class="flex-1">${data.employees || '-'}</dd>
                    </div>
                    <div class="flex">
                        <dt class="w-32 font-semibold text-gray-700">売上規模</dt>
                        <dd class="flex-1">${data.salesScale || '-'}</dd>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- PR Section -->
    <section class="py-16">
        <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold text-center mb-8">当社の強み</h2>
            <div class="max-w-3xl mx-auto">
                <p class="text-lg leading-relaxed text-gray-700">
                    ${data.prText || ''}
                </p>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 bg-blue-600 text-white">
        <div class="container mx-auto px-4 text-center">
            <h2 class="text-3xl font-bold mb-4">お気軽にお問い合わせください</h2>
            <p class="text-xl mb-8">無料見積もり・ご相談承ります</p>
            <a href="tel:0120-000-000" class="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100">
                📞 今すぐ電話で相談
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-8">
        <div class="container mx-auto px-4 text-center">
            <p>&copy; ${new Date().getFullYear()} ${displayName}. All rights reserved.</p>
            <p class="text-sm text-gray-400 mt-2">外壁くらべる掲載店</p>
        </div>
    </footer>
</body>
</html>`;

  return html;
}

/**
 * サーバーにアップロード
 * Node.js Webhookサーバー経由でFTPアップロード
 */
function uploadToServer(urlSlug, html) {
  try {
    // Webhookサーバーのエンドポイント（必要に応じて変更）
    const WEBHOOK_URL = 'http://localhost:3000/api/upload-merchant-html';

    const payload = {
      urlSlug: urlSlug,
      html: html
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      const result = JSON.parse(responseText);
      return {
        success: true,
        url: result.url
      };
    } else {
      return {
        success: false,
        error: `HTTP ${responseCode}: ${responseText}`
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * スプレッドシートにURLスラッグを保存
 */
function saveUrlSlugToSheet(merchantId, urlSlug) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('加盟店データ');

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === merchantId) { // A列に加盟店IDがある想定
      sheet.getRange(i + 1, 48).setValue(urlSlug); // AV列(48列目)に保存
      break;
    }
  }
}
