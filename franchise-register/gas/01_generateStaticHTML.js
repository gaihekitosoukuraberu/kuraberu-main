/**
 * =====================================
 * 🔥 プレビュー完全一致版 - 静的HTML生成機能 🔥
 * =====================================
 *
 * プレビューHTML構造を一字一句完全コピー
 * スプレッドシートデータ動的バインディング対応
 * レスポンシブ挙動まで完全一致
 */

/**
 * 🔥 Gemini広告テキスト完全除去機能
 */
function removeGeminiText(text) {
  if (!text) return text;

  const geminiPatterns = [
    /お気に入りのアプリの中から\s*AI\s*を直接お試しください。[^。]*Gemini\s*を使用して[^。]*。*/gi,
    /\s*Gemini\s*を使用して[^。]*。*/gi,
    /AI\s*を直接お試しください[^。]*。*/gi,
    /お気に入りのアプリの中から[^。]*。*/gi
  ];

  let cleanText = text;
  geminiPatterns.forEach(function(pattern) {
    cleanText = cleanText.replace(pattern, '');
  });

  return cleanText.replace(/\s+/g, ' ').trim();
}

/**
 * 🔥 Google Drive URL を thumbnail 形式に変換
 */
function convertToThumbnailUrl(url, size) {
  if (!url) return '';
  size = size || 'w1000';

  // 既に thumbnail 形式の場合はそのまま返す
  if (url.includes('drive.google.com/thumbnail')) {
    return url;
  }

  // uc?export=view 形式から ID を抽出
  let fileId = '';
  if (url.includes('id=')) {
    const match = url.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
  } else if (url.includes('/d/')) {
    const match = url.match(/\/d\/([^/]+)/);
    if (match) fileId = match[1];
  }

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
  }

  return url;
}

/**
 * 🔥 メイン関数：静的HTML生成（V1402: Radar chart + branch maps fixed）
 */
function generateStaticHTML(data) {
  console.log('[generateStaticHTML] 🎯 V1402: レーダーチャート・支店マップ修正版 - HTML生成開始');
  console.log('[generateStaticHTML] データ:', JSON.stringify(data, null, 2));

  try {
    // Google Maps APIキーを取得
    const googleMapsApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      console.warn('[generateStaticHTML] ⚠️ GOOGLE_MAPS_API_KEYが設定されていません。マップ機能は無効になります。');
    }

    // 基本データの安全な取得とGeminiテキスト除去
    const companyName = removeGeminiText(data['会社名'] || '株式会社サンプル');
    const tradeName = removeGeminiText(data['屋号'] || '');
    const prText = removeGeminiText(data['PRテキスト'] || '');
    const establishedYear = data['設立年月'] || '';
    const representativeName = data['代表者名'] || '';
    // 🔥 電話番号とメールアドレスは統一ハードコード
    const phone = '090-1994-7162';
    const email = 'info@gaihekikuraberu.com';
    const address = data['住所'] || '';
    const websiteUrl = data['ウェブサイトURL'] || '';
    const kuraberuScore = parseFloat(data['くらべるスコア'] || '4.2');

    // 🔥 メインビジュアルURLは「加盟店登録」シートから取得し、thumbnail形式に変換
    const mainVisualUrl = convertToThumbnailUrl(data['メインビジュアル'] || '', 'w1200');
    console.log('[generateStaticHTML] 🔥 メインビジュアルURL:', mainVisualUrl);
    console.log('[generateStaticHTML] 🔥 会社名:', companyName);

    // 🔥 編集パネル設定は「プレビュー」シートから取得
    const merchantId = data['加盟店ID'] || data['登録ID'] || '';
    console.log('[generateStaticHTML] 🔥 取得したmerchantId:', merchantId);
    let previewSettings = {
      positionX: 50,
      positionY: 50,
      zoom: 100,
      brightness: 100,
      textColor: '#1f2937',
      companyNameDisplay: 'company'
    };

    if (merchantId) {
      try {
        const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        const previewSheet = ss.getSheetByName('プレビュー');

        if (previewSheet) {
          const previewData = previewSheet.getDataRange().getValues();
          const previewHeaders = previewData[0];
          const merchantRow = previewData.slice(1).find(row => row[0] === merchantId);

          if (merchantRow) {
            console.log('[generateStaticHTML] 🔥 プレビューシートから設定取得成功');
            const getColumnValue = (columnName) => {
              const colIndex = previewHeaders.indexOf(columnName);
              return colIndex >= 0 ? merchantRow[colIndex] : null;
            };

            // 0値を正しく扱うため、明示的にチェック
            const getBrightnessValue = () => {
              const val = getColumnValue('メインビジュアル明るさ');
              if (val !== null && val !== undefined && val !== '') {
                return parseFloat(val);
              }
              return 100;
            };

            const getPositionValue = (columnName, defaultVal) => {
              const val = getColumnValue(columnName);
              if (val !== null && val !== undefined && val !== '') {
                return parseFloat(val);
              }
              return defaultVal;
            };

            previewSettings = {
              positionX: getPositionValue('メインビジュアル位置X', 50),
              positionY: getPositionValue('メインビジュアル位置Y', 50),
              zoom: getPositionValue('メインビジュアルズーム', 100),
              brightness: getBrightnessValue(),
              textColor: getColumnValue('メインビジュアル文字色') || '#1f2937',
              companyNameDisplay: getColumnValue('会社名表示') || getColumnValue('支店表示') || 'company'
            };
            console.log('[generateStaticHTML] 🔥 編集パネル設定:', previewSettings);
          } else {
            console.log('[generateStaticHTML] ⚠️ プレビューシートに該当行なし、デフォルト使用');
          }
        } else {
          console.log('[generateStaticHTML] ⚠️ プレビューシートなし、デフォルト使用');
        }
      } catch (error) {
        console.error('[generateStaticHTML] プレビュー設定取得エラー:', error);
      }
    }

    const mainVisualPositionX = previewSettings.positionX;
    const mainVisualPositionY = previewSettings.positionY;
    const mainVisualZoom = previewSettings.zoom;
    const mainVisualBrightness = previewSettings.brightness;
    const mainVisualTextColor = previewSettings.textColor;

    const galleryImages = parseGalleryData(data['写真ギャラリー'] || '');
    const qualifications = parseListData(data['保有資格'] || '');
    const insurance = parseListData(data['加入保険'] || '');
    const branchNames = parseListData(data['支店名'] || '');
    const branchAddresses = parseListData(data['支店住所'] || '');

    // レーダーチャート用評価データの処理（評価データシートから動的取得）
    let finalRatings;
    let ratingsResult = { success: false };

    try {
      // EvaluationDataManagerが存在する場合は評価データシートから取得
      if (typeof EvaluationDataManager !== 'undefined') {
        ratingsResult = EvaluationDataManager.getRatingsForCompany(companyName);

        if (ratingsResult.success && ratingsResult.ratings) {
          console.log('[generateStaticHTML] 評価データシート取得成功:', companyName);
          finalRatings = {
            pricing: ratingsResult.ratings.costBalance,
            communication: ratingsResult.ratings.personality,
            technology: ratingsResult.ratings.technology,
            schedule: ratingsResult.ratings.responseSpeed,
            service: ratingsResult.ratings.afterSupport,
            quality: ratingsResult.ratings.customerSatisfaction
          };
        } else {
          console.log('[generateStaticHTML] 評価データなし、フォールバック:', companyName);
          finalRatings = calculateRatings(data);
        }
      } else {
        console.log('[generateStaticHTML] EvaluationDataManager未定義、フォールバック使用');
        finalRatings = calculateRatings(data);
      }
    } catch (error) {
      console.error('[generateStaticHTML] 評価データ取得エラー:', error);
      finalRatings = calculateRatings(data);
    }

    // 会社名表示形式の決定（プレビュー設定に基づく）
    let displayCompanyName = companyName;
    const companyNameDisplayMode = previewSettings.companyNameDisplay || 'company';

    switch (companyNameDisplayMode) {
      case 'company':
        displayCompanyName = companyName;
        break;
      case 'trade':
        displayCompanyName = tradeName || companyName;
        break;
      case 'both_company_priority':
        displayCompanyName = tradeName ? `${companyName}（${tradeName}）` : companyName;
        break;
      case 'both_trade_priority':
        displayCompanyName = tradeName ? `${tradeName}（${companyName}）` : companyName;
        break;
      case 'both_reverse_smaller':
        displayCompanyName = tradeName ? `${companyName} ${tradeName}` : companyName;
        break;
      default:
        displayCompanyName = companyName;
    }

    console.log('[generateStaticHTML] 🔥 会社名表示モード:', companyNameDisplayMode, '→', displayCompanyName);

    // PRテキストの最初の文を取得
    const firstSentence = prText ? prText.split('。')[0] + '。' : '';

    // 設立年月の表示形式調整
    const establishedDisplay = formatEstablishedDate(establishedYear);

    console.log('[generateStaticHTML] 🔥 各セクションHTML生成開始');

    // 🔥 各セクションHTML生成（プレビュー完全一致）
    const heroSectionHtml = generateHeroSectionHtml(displayCompanyName, firstSentence, establishedDisplay, mainVisualUrl, {
      positionX: mainVisualPositionX,
      positionY: mainVisualPositionY,
      zoom: mainVisualZoom,
      brightness: mainVisualBrightness,
      textColor: mainVisualTextColor
    });
    const prTextHtml = generatePrTextHtml(prText);
    const examplesHtml = generateConstructionExamplesHtml(data);
    const kuraberuScoreHtml = generateKuraberuScoreHtml(kuraberuScore, finalRatings, ratingsResult);
    const nineBenefitsHtml = generateNineBenefitsHtml();
    const contactHtml = generateContactHtml(phone, email);
    const areasHtml = generateAreasHtml(data);
    const servicesHtml = generateServicesHtml();
    const qualificationsHtml = generateQualificationsHtml(qualifications);
    const insuranceHtml = generateInsuranceHtml(insurance);
    const strengthsHtml = generateCompanyStrengthsHtml();
    const galleryHtml = generateGalleryHtml(galleryImages);
    const basicInfoHtml = generateBasicInfoHtml(companyName, representativeName, address, establishedDisplay, googleMapsApiKey);
    const branchMapsHtml = generateBranchMapsHtml(branchNames, branchAddresses, googleMapsApiKey);

    // 🔥 完全なHTML構造（プレビュー完全一致）
    const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName} | 外壁塗装・屋根塗装の専門店</title>
    <meta name="description" content="${firstSentence}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        gray: {
                            50: '#f9fafb',
                            100: '#f3f4f6',
                            200: '#e5e7eb',
                            300: '#d1d5db',
                            400: '#9ca3af',
                            500: '#6b7280',
                            600: '#4b5563',
                            700: '#374151',
                            800: '#1f2937',
                            900: '#111827'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .glass { backdrop-filter: blur(12px); }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="max-w-4xl mx-auto bg-white shadow-lg min-h-screen">
        <div class="p-8">
            ${heroSectionHtml}
            ${prTextHtml}
            ${examplesHtml}
            ${kuraberuScoreHtml}
            ${contactHtml}
            ${nineBenefitsHtml}
            ${areasHtml}
            ${servicesHtml}
            ${qualificationsHtml}
            ${insuranceHtml}
            ${strengthsHtml}
            ${galleryHtml}
            ${basicInfoHtml}
            ${branchMapsHtml}
            ${contactHtml}
        </div>
    </div>

    <script>
        // ギャラリー機能
        let currentGalleryIndex = 0;
        function goToGalleryImage(index) {
            currentGalleryIndex = index;
            const container = document.getElementById('galleryContainer');
            const items = document.querySelectorAll('#galleryContainer > div');
            if (container && items[index]) {
                const item = items[index];
                const containerWidth = container.offsetWidth;
                const itemLeft = item.offsetLeft;
                const itemWidth = item.offsetWidth;
                const scrollLeft = itemLeft - (containerWidth - itemWidth) / 2;
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });

                // インジケーター更新
                document.querySelectorAll('.gallery-dot').forEach((dot, i) => {
                    dot.className = i === index ? 'w-2 h-2 rounded-full transition gallery-dot bg-blue-600' : 'w-2 h-2 rounded-full transition gallery-dot bg-gray-300';
                });
            }
        }

        function scrollGallery(direction) {
            const gallery = document.querySelectorAll('#galleryContainer > div');
            if (direction === 'left' && currentGalleryIndex > 0) {
                goToGalleryImage(currentGalleryIndex - 1);
            } else if (direction === 'right' && currentGalleryIndex < gallery.length - 1) {
                goToGalleryImage(currentGalleryIndex + 1);
            }
        }

        // 施工事例機能
        let currentExampleIndex = 0;
        function goToExample(index) {
            currentExampleIndex = index;
            const container = document.getElementById('examplesContainer');
            const items = document.querySelectorAll('#examplesContainer > div');
            if (container && items[index]) {
                const item = items[index];
                const containerWidth = container.offsetWidth;
                const itemLeft = item.offsetLeft;
                const itemWidth = item.offsetWidth;
                const scrollLeft = itemLeft - (containerWidth - itemWidth) / 2;
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });

                // インジケーター更新
                document.querySelectorAll('.example-dot').forEach((dot, i) => {
                    dot.className = i === index ? 'w-2 h-2 rounded-full transition example-dot bg-blue-600' : 'w-2 h-2 rounded-full transition example-dot bg-gray-300';
                });
            }
        }

        function scrollExamples(direction) {
            const examples = document.querySelectorAll('#examplesContainer > div');
            if (direction === 'left' && currentExampleIndex > 0) {
                goToExample(currentExampleIndex - 1);
            } else if (direction === 'right' && currentExampleIndex < examples.length - 1) {
                goToExample(currentExampleIndex + 1);
            }
        }
    </script>
</body>
</html>`;

    console.log('[generateStaticHTML] ✅ HTML生成完了');
    return fullHtml;

  } catch (error) {
    console.error('[generateStaticHTML] ❌ エラー:', error);
    throw error;
  }
}

/**
 * 🔥 ヒーローセクション生成（プレビュー完全一致・メインビジュアル対応）
 */
function generateHeroSectionHtml(companyName, tagline, established, mainVisualUrl, visualSettings) {
  if (mainVisualUrl && mainVisualUrl.trim() !== '') {
    // 編集パネル設定のデフォルト値
    const settings = visualSettings || {
      positionX: 50,
      positionY: 50,
      zoom: 100,
      brightness: 100,
      textColor: '#1f2937'
    };

    // 🔥 背景画像の位置とズームを計算（プレビュー完全一致）
    const scale = settings.zoom / 100;
    const translateX = (settings.positionX - 50) * 2;
    const translateY = (settings.positionY - 50) * 2;
    const transformStyle = `scale(${scale}) translate(${translateX}%, ${translateY}%)`;

    // 🔥 明るさオーバーレイの計算（0-100 → 黒から白へのグラデーション）
    // プレビューと完全一致: transparent → rgba(color, opacity * 0.7)
    const brightnessValue = settings.brightness;
    let overlayStyle = '';
    if (brightnessValue < 50) {
      // 暗く（黒オーバーレイ）
      const opacity = (50 - brightnessValue) / 50 * 0.7;
      overlayStyle = `background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, ${opacity}));`;
    } else if (brightnessValue === 50) {
      // 透明（グラデーションなし）
      overlayStyle = `background: linear-gradient(to bottom, transparent, transparent);`;
    } else {
      // 明るく（白オーバーレイ）
      const opacity = (brightnessValue - 50) / 50 * 0.7;
      overlayStyle = `background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, ${opacity}));`;
    }

    // メインビジュアルがある場合
    return `
    <div class="relative rounded-2xl overflow-hidden mb-12 min-h-[400px]">
        <div class="relative h-[500px] overflow-hidden">
            <img src="${mainVisualUrl}" alt="" class="w-full h-full object-cover" style="transform: ${transformStyle};">
            <div class="absolute bottom-0 left-0 right-0 h-[30%]" style="${overlayStyle} pointer-events: none;"></div>

            <!-- 会社名と情報をオーバーレイ -->
            <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-8" style="color: ${settings.textColor};">
                <h1 class="text-3xl sm:text-5xl md:text-6xl font-bold mb-2 drop-shadow-lg text-center sm:text-left break-words" style="color: ${settings.textColor}; line-height: 1.2; word-break: break-word; overflow-wrap: break-word;">${companyName}</h1>
                <p class="text-lg sm:text-3xl mb-4 drop-shadow-md text-center sm:text-left" style="color: ${settings.textColor};">${tagline}</p>
                ${established ? `
                <div class="flex flex-wrap gap-4" style="color: ${settings.textColor};">
                    <div class="flex items-center bg-white/20 backdrop-blur px-4 py-2 rounded-full" style="color: ${settings.textColor};">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" style="color: ${settings.textColor};">
                            <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"></path>
                        </svg>
                        <span style="color: ${settings.textColor};">${established}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>`;
  } else {
    // メインビジュアルがない場合（従来通り）
    return `
    <div id="heroSection" class="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 mb-12 text-white overflow-hidden">
        <div class="absolute inset-0 bg-black opacity-10"></div>
        <div class="relative z-10">
            <h1 id="previewCompanyNameHero" class="text-2xl sm:text-4xl font-bold mb-2 text-center sm:text-left">${companyName}</h1>
            <p id="previewTaglineHero" class="text-base sm:text-lg opacity-90 text-center sm:text-left">${tagline}</p>
            ${established ? `
            <div class="flex flex-wrap gap-4 mt-6">
                <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"></path>
                    </svg>
                    <span id="previewEstablishedHero">${established}</span>
                </div>
            </div>
            ` : ''}
        </div>
    </div>`;
  }
}

/**
 * 🔥 会社の特徴・強み生成（プレビュー完全一致）
 */
function generatePrTextHtml(prText) {
  if (!prText) return '';

  return `
    <div id="preview-prText" class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-yellow-500 mr-3 rounded"></span>
            会社の特徴・強み
        </h3>
        <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-8 border border-yellow-200">
            <p id="previewPrText" class="text-gray-700 leading-relaxed">${prText}</p>
        </div>
    </div>`;
}

/**
 * 🔥 施工事例生成（プレビュー完全一致）
 */
function generateConstructionExamplesHtml(data) {
  // 施工事例データの取得（スプレッドシートから）
  const examples = parseConstructionExamples(data);

  // 🔥 空の場合はセクションごと非表示
  if (examples.length === 0) {
    return '';
  }

  const examplesHtml = examples.map((example) => `
    <div class="flex-shrink-0 w-full md:w-80 lg:w-96 bg-white rounded-lg shadow-lg border overflow-hidden snap-center">
        <div class="grid grid-cols-2 gap-1 p-2">
            ${example.beforeImage ? `
            <div class="relative">
                <img src="${example.beforeImage}" alt="施工前" class="w-full h-40 md:h-48 object-cover rounded">
                <div class="absolute top-1 left-1 bg-black bg-opacity-70 text-white px-2 py-1 text-xs rounded">BEFORE</div>
            </div>
            ` : ''}
            ${example.afterImage ? `
            <div class="relative">
                <img src="${example.afterImage}" alt="施工後" class="w-full h-40 md:h-48 object-cover rounded">
                <div class="absolute top-1 right-1 bg-green-600 text-white px-2 py-1 text-xs rounded">AFTER</div>
            </div>
            ` : ''}
        </div>
        <div class="p-4">
            <h4 class="font-bold text-gray-900 mb-2">${example.title || '施工事例'}</h4>
            ${example.age ? `<p class="text-sm text-gray-600 mb-1">築年数: ${example.age}</p>` : ''}
            ${example.cost ? `<p class="text-lg font-bold text-red-600 mb-2">${example.cost}</p>` : ''}
            ${example.description ? `<p class="text-sm text-gray-600">${example.description}</p>` : ''}
        </div>
    </div>
  `).join('');

  return `
    <div id="preview-examples" class="mb-12" style="display: block;">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-pink-600 mr-3 rounded"></span>
            施工事例
        </h3>
        <div class="relative">
            <button onclick="scrollExamples('left')" class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </button>
            <div id="examplesCarousel" class="overflow-hidden px-2" style="min-height: 400px;">
                <div id="examplesContainer" class="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide" style="-webkit-overflow-scrolling: touch; scroll-behavior: smooth; scroll-snap-type: x mandatory;">
                    ${examplesHtml}
                </div>
            </div>
            <button onclick="scrollExamples('right')" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        </div>
        <div id="examplesIndicators" class="flex justify-center gap-1 mt-4">
            ${examples.map((_, index) => `
                <button onclick="goToExample(${index})" class="w-2 h-2 rounded-full transition example-dot ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}"></button>
            `).join('')}
        </div>
    </div>`;
}

/**
 * 🔥 くらべるスコア生成（プレビュー完全一致・レーダーチャート付き）
 */
function generateKuraberuScoreHtml(scoreValue, finalRatings, ratingsResult) {
  const radarChartHtml = generateRadarChartHTML(finalRatings);

  // AI評価セクション（独立した格好良いデザイン）
  const aiEvaluationSectionHtml = (ratingsResult && ratingsResult.success && ratingsResult.ratings && ratingsResult.ratings.aiEvaluation) ? `
    <div class="mt-8 sm:mt-10 mb-12 sm:mb-16 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border-2 border-indigo-100">
        <div class="mb-4 sm:mb-6">
            <div class="flex items-center mb-2 sm:mb-3">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shadow-md">
                    <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                </div>
                <div>
                    <h3 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 inline-flex items-center">
                        総合評価
                    </h3>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl p-4 sm:p-5 lg:p-6 shadow-inner border border-indigo-100">
            <p class="text-sm sm:text-base text-gray-700 leading-relaxed">${ratingsResult.ratings.aiEvaluation}</p>
        </div>
    </div>
  ` : '';

  return `
    <div id="preview-rating" class="mb-8 sm:mb-12 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 rounded-2xl p-4 sm:p-6 lg:p-8" style="display: block;">
        <div class="mb-4 sm:mb-6">
            <h3 class="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 inline-flex items-center">
                <span class="w-1 h-5 sm:h-6 bg-gradient-to-b from-amber-500 to-orange-600 mr-2 sm:mr-3 rounded"></span>
                くらべるスコア
            </h3>
            <p class="text-sm sm:text-base text-gray-600">当社独自の総合評価スコア</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <!-- 総合評価 -->
            <div class="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-4 sm:p-5 lg:p-6">
                <div class="text-center mb-4 sm:mb-5">
                    <h4 class="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-2 sm:mb-3">総合評価</h4>
                    <div class="flex items-center justify-center mb-2 sm:mb-3">
                        <span class="text-3xl sm:text-4xl lg:text-5xl font-bold text-amber-600" id="overallRating">${scoreValue.toFixed(1)}</span>
                        <span class="text-base sm:text-lg lg:text-xl text-gray-500 ml-1">/5.0</span>
                    </div>
                    <div class="flex justify-center mb-2 sm:mb-3 gap-1" id="overallStars">
                        ${generateStarsHtml(scoreValue)}
                    </div>
                    <p class="text-xs sm:text-sm text-gray-500">当社独自算出スコア</p>
                </div>

                <!-- 項目別評価 -->
                <div class="space-y-2 sm:space-y-3">
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm sm:text-base font-medium text-gray-700">コストバランス</span>
                        <div class="flex items-center">
                            <div class="flex text-amber-400 mr-2 gap-0.5">
                                ${generateDetailStarsHtml(finalRatings.pricing)}
                            </div>
                            <span class="text-sm sm:text-base font-medium text-gray-800" id="pricingRating">${finalRatings.pricing.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm sm:text-base font-medium text-gray-700">人柄・対応力</span>
                        <div class="flex items-center">
                            <div class="flex text-amber-400 mr-2">
                                ${generateDetailStarsHtml(finalRatings.communication)}
                            </div>
                            <span class="text-sm sm:text-base font-medium text-gray-800" id="communicationRating">${finalRatings.communication.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm sm:text-base font-medium text-gray-700">技術・品質</span>
                        <div class="flex items-center">
                            <div class="flex text-amber-400 mr-2">
                                ${generateDetailStarsHtml(finalRatings.technology)}
                            </div>
                            <span class="text-sm sm:text-base font-medium text-gray-800" id="technologyRating">${finalRatings.technology.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm sm:text-base font-medium text-gray-700">対応スピード</span>
                        <div class="flex items-center">
                            <div class="flex text-amber-400 mr-2">
                                ${generateDetailStarsHtml(finalRatings.schedule)}
                            </div>
                            <span class="text-sm sm:text-base font-medium text-gray-800" id="scheduleRating">${finalRatings.schedule.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm sm:text-base font-medium text-gray-700">アフターサポート</span>
                        <div class="flex items-center">
                            <div class="flex text-amber-400 mr-2">
                                ${generateDetailStarsHtml(finalRatings.service)}
                            </div>
                            <span class="text-sm sm:text-base font-medium text-gray-800" id="serviceRating">${finalRatings.service.toFixed(1)}</span>
                        </div>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-sm sm:text-base font-medium text-gray-700">顧客満足度</span>
                        <div class="flex items-center">
                            <div class="flex text-amber-400 mr-2">
                                ${generateDetailStarsHtml(finalRatings.quality)}
                            </div>
                            <span class="text-sm sm:text-base font-medium text-gray-800" id="qualityRating">${finalRatings.quality.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            </div>

            ${radarChartHtml}
        </div>
    </div>

    ${aiEvaluationSectionHtml}`;
}

/**
 * 🔥 詳細評価用小さい星生成
 */
function generateDetailStarsHtml(score) {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;
  let html = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<svg class="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
    } else if (i === fullStars && hasHalfStar) {
      html += '<svg class="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 20 20"><defs><linearGradient id="half"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="#e5e7eb"/></linearGradient></defs><path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
    } else {
      html += '<svg class="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
    }
  }

  return html;
}

/**
 * 🔥 総合評価用大きい星生成
 */
function generateStarsHtml(score) {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;
  let html = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      html += '<svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
    } else if (i === fullStars && hasHalfStar) {
      html += '<svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-amber-400 fill-current" viewBox="0 0 20 20"><defs><linearGradient id="half"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="#e5e7eb"/></linearGradient></defs><path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
    } else {
      html += '<svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-300 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
    }
  }

  return html;
}

/**
 * 🔥 レーダーチャート生成（プレビュー完全一致）
 */
function generateRadarChartHTML(finalRatings) {
  const maxValue = 5;
  const centerX = 250;
  const centerY = 250;
  const maxRadius = 130;

  const points = [
    { label: 'コストバランス', value: finalRatings.pricing, angle: -90 },
    { label: '人柄・対応力', value: finalRatings.communication, angle: -30 },
    { label: '技術・品質', value: finalRatings.technology, angle: 30 },
    { label: 'アフターサポート', value: finalRatings.service, angle: 90 },
    { label: '対応スピード', value: finalRatings.schedule, angle: 150 },
    { label: '顧客満足度', value: finalRatings.quality, angle: 210 }
  ];

  const polygonPoints = points.map(point => {
    const radius = (point.value / maxValue) * maxRadius;
    const radians = (point.angle * Math.PI) / 180;
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    return `${x},${y}`;
  }).join(' ');

  // 🔥 プレビューから完全コピー：レーダーチャート構造
  return `
    <div class="bg-white rounded-xl shadow-lg border-2 border-amber-100 p-4 sm:p-5 lg:p-6">
        <h4 class="text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">項目別評価チャート</h4>
        <div class="flex justify-center overflow-hidden">
            <svg width="100%" height="480" viewBox="0 0 500 500" class="radarChart max-w-md sm:max-w-lg lg:max-w-xl" style="width: min(100%, 500px); height: auto;">
                <!-- 背景グリッド -->
                <g id="radarGrid" transform="translate(250,250)">
                    <!-- 5段階のグリッド円 -->
                    <circle cx="0" cy="0" r="26" fill="none" stroke="#f3f4f6" stroke-width="1"/>
                    <circle cx="0" cy="0" r="52" fill="none" stroke="#e5e7eb" stroke-width="1"/>
                    <circle cx="0" cy="0" r="78" fill="none" stroke="#d1d5db" stroke-width="1"/>
                    <circle cx="0" cy="0" r="104" fill="none" stroke="#9ca3af" stroke-width="1"/>
                    <circle cx="0" cy="0" r="130" fill="none" stroke="#6b7280" stroke-width="2"/>

                    <!-- 軸線 -->
                    <line x1="0" y1="-130" x2="0" y2="130" stroke="#e5e7eb" stroke-width="1"/>
                    <line x1="-112.6" y1="-65" x2="112.6" y2="65" stroke="#e5e7eb" stroke-width="1"/>
                    <line x1="-112.6" y1="65" x2="112.6" y2="-65" stroke="#e5e7eb" stroke-width="1"/>
                </g>

                <!-- データポリゴン -->
                <g id="radarData" transform="translate(250,250)">
                    <polygon id="ratingPolygon" class="chart-data"
                        points="${polygonPoints}"
                        fill="rgba(245, 158, 11, 0.3)"
                        stroke="#f59e0b"
                        stroke-width="3"
                        stroke-linejoin="round"/>

                    <!-- データポイント -->
                    ${points.map((point, index) => {
                      const radius = (point.value / maxValue) * maxRadius;
                      const radians = (point.angle * Math.PI) / 180;
                      const x = Math.cos(radians) * radius;
                      const y = Math.sin(radians) * radius;
                      return `<circle cx="${x}" cy="${y}" r="5" fill="#f59e0b" class="data-point-${index}"/>`;
                    }).join('')}
                </g>

                <!-- ラベル -->
                <g id="radarLabels" transform="translate(250,250)">
                    <text x="0" y="-145" text-anchor="middle" class="text-sm sm:text-base lg:text-lg font-bold fill-gray-800" style="font-size: 16px;">コストバランス</text>
                    <text x="135" y="-25" text-anchor="start" class="text-sm sm:text-base lg:text-lg font-bold fill-gray-800" style="font-size: 16px;">人柄・対応力</text>
                    <text x="135" y="75" text-anchor="start" class="text-sm sm:text-base lg:text-lg font-bold fill-gray-800" style="font-size: 16px;">技術・品質</text>
                    <text x="0" y="165" text-anchor="middle" class="text-sm sm:text-base lg:text-lg font-bold fill-gray-800" style="font-size: 16px;">アフターサポート</text>
                    <text x="-135" y="75" text-anchor="end" class="text-sm sm:text-base lg:text-lg font-bold fill-gray-800" style="font-size: 16px;">対応スピード</text>
                    <text x="-135" y="-35" text-anchor="end" class="text-sm sm:text-base lg:text-lg font-bold fill-gray-800" style="font-size: 16px;">顧客満足度</text>
                </g>
            </svg>
        </div>
    </div>`;
}

/**
 * 🔥 お問い合わせセクション生成（プレビュー完全一致）
 */
function generateContactHtml(phone, email) {
  // 🔥 プレビューから完全コピー：お問い合わせセクション
  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-purple-600 mr-3 rounded"></span>
            お問い合わせ
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white border rounded-xl p-4 hover:shadow-lg transition">
                <div class="flex items-center mb-2">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">お電話でのお問い合わせ</p>
                        <a href="tel:${phone}" class="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">${phone}</a>
                        <p class="text-xs text-gray-500">受付時間: 9:00-18:00（年中無休）</p>
                    </div>
                </div>
            </div>
            <div class="bg-white border rounded-xl p-4 hover:shadow-lg transition">
                <div class="flex items-center mb-2">
                    <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                    <div class="overflow-hidden min-w-0">
                        <p class="text-sm text-gray-600">メールでのお問い合わせ</p>
                        <a href="mailto:${email}" class="text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-800 break-all cursor-pointer transition-colors">${email}</a>
                        <p class="text-xs text-gray-500">24時間受付中</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * 🔥 9つの無料特典生成（プレビュー完全一致）
 */
function generateNineBenefitsHtml() {
  return `
    <div class="mb-8 sm:mb-12 bg-gradient-to-br from-orange-50 via-orange-100 to-red-50 rounded-2xl p-4 sm:p-6 lg:p-10">
        <div class="text-center mb-4 sm:mb-6">
            <h3 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">🎁 今だけ！9つの無料特典</h3>
            <p class="text-sm sm:text-base text-gray-600">期間限定キャンペーン実施中！</p>
        </div>

        <div class="max-w-4xl mx-auto mb-4 sm:mb-6 px-2 sm:px-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <!-- 特典1: 無料点検 -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">🔍</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">無料点検</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">プロの目で外壁・屋根を徹底チェック！お家の状態を詳細に報告</p>
                        </div>
                    </div>
                </div>

                <!-- 特典2: エリア最低価格保証 -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">💰</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">エリア最低価格保証</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">地域最安値をお約束！他社より高ければ値引き対応</p>
                        </div>
                    </div>
                </div>

                <!-- 特典3: お値引き交渉代行 -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">🤝</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">お値引き交渉代行</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">他社見積もりをお持ちなら、代わりに交渉して最安値を実現</p>
                        </div>
                    </div>
                </div>

                <!-- 特典4: 助成金申請サポート -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">📝</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">助成金申請サポート</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">最大10～70万円！各種助成金の申請手続きを完全サポート</p>
                        </div>
                    </div>
                </div>

                <!-- 特典5: 火災保険申請サポート -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">🏛️</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">火災保険申請サポート</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">台風・雪害等の損害に火災保険適用可能！無料で調査</p>
                        </div>
                    </div>
                </div>

                <!-- 特典6: お断り代行サービス -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">🚫</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">お断り代行サービス</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">成約時の他社へのお断りも代行可能！面倒なやり取り不要</p>
                        </div>
                    </div>
                </div>

                <!-- 特典7: 無料お電話サポート -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">📞</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">無料お電話サポート</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">工事完了後も安心！365日電話サポートでお悩み解決</p>
                        </div>
                    </div>
                </div>

                <!-- 特典8: 訪問業者マニュアル進呈 -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">📖</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">訪問業者マニュアル進呈</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">悪徳業者の手口や対処法を完全解説！安心ガイド</p>
                        </div>
                    </div>
                </div>

                <!-- 特典9: お友達紹介キャンペーン -->
                <div class="bg-white rounded-lg p-3 sm:p-4 lg:p-5 shadow-md border-l-4 border-orange-500 hover:shadow-lg transition">
                    <div class="flex items-start">
                        <span class="text-2xl sm:text-3xl mr-2 sm:mr-3 flex-shrink-0">👥</span>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-orange-600 mb-1 sm:mb-2 text-sm sm:text-base lg:text-lg">お友達紹介キャンペーン</h4>
                            <p class="text-xs sm:text-sm text-gray-600 leading-relaxed">紹介で双方に特典！最大30,000円分のギフトカード</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- CTA -->
        <div class="text-center">
            <button class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors shadow-lg">
                今すぐ無料見積もりを依頼
            </button>
        </div>
    </div>`;
}

/**
 * 🔥 対応エリア生成（プレビュー完全一致）
 */
function generateAreasHtml(data) {
  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-blue-600 mr-3 rounded"></span>
            対応エリア
        </h3>

        <!-- 神奈川県 -->
        <div class="mb-6">
            <h4 class="text-lg font-bold text-blue-600 mb-3">神奈川県</h4>
            <div class="bg-blue-50 rounded-lg p-4">
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市鶴見区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市神奈川区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市西区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市中区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市南区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市港南区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市旭区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市磯子区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市金沢区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市港北区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市緑区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市青葉区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市都筑区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市戸塚区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市栄区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市泉区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横浜市瀬谷区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市川崎区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市幸区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市中原区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市高津区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市多摩区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市宮前区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川崎市麻生区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">相模原市緑区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">相模原市中央区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">相模原市南区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">横須賀市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">平塚市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">鎌倉市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">藤沢市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">小田原市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">茅ヶ崎市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">逗子市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">三浦市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">秦野市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">厚木市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">大和市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">伊勢原市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">海老名市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">座間市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">南足柄市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">綾瀬市</span>
                </div>
            </div>
        </div>

        <!-- 埼玉県 -->
        <div class="mb-6">
            <h4 class="text-lg font-bold text-green-600 mb-3">埼玉県</h4>
            <div class="bg-green-50 rounded-lg p-4">
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市西区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市北区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市大宮区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市見沼区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市中央区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市桜区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市浦和区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市南区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">さいたま市緑区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川口市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">熊谷市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">川越市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">行田市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">秩父市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">所沢市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">飯能市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">加須市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">本庄市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">東松山市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">春日部市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">狭山市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">羽生市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">鴻巣市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">深谷市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">上尾市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">草加市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">越谷市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">蕨市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">戸田市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">入間市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">朝霞市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">志木市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">和光市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">新座市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">桶川市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">久喜市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">北本市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">八潮市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">富士見市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">三郷市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">蓮田市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">坂戸市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">幸手市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">鶴ヶ島市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">日高市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">吉川市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">ふじみ野市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">白岡市</span>
                </div>
            </div>
        </div>

        <!-- 東京都 -->
        <div class="mb-6">
            <h4 class="text-lg font-bold text-red-600 mb-3">東京都</h4>
            <div class="bg-red-50 rounded-lg p-4">
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                    <span class="px-2 py-1 bg-white rounded shadow-sm">千代田区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">中央区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">港区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">新宿区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">文京区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">台東区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">墨田区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">江東区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">品川区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">目黒区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">大田区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">世田谷区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">渋谷区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">中野区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">杉並区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">豊島区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">北区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">荒川区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">板橋区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">練馬区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">足立区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">葛飾区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">江戸川区</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">八王子市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">立川市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">武蔵野市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">三鷹市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">青梅市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">府中市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">昭島市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">調布市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">町田市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">小金井市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">小平市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">日野市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">東村山市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">国分寺市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">国立市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">福生市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">狛江市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">東大和市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">清瀬市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">東久留米市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">武蔵村山市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">多摩市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">稲城市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">羽村市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">あきる野市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">西東京市</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">瑞穂町</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">日の出町</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">檜原村</span>
                    <span class="px-2 py-1 bg-white rounded shadow-sm">奥多摩町</span>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * 🔥 対応可能な工事生成（プレビュー完全一致）
 */
function generateServicesHtml() {
  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-green-600 mr-3 rounded"></span>
            対応可能な工事
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
                <div class="text-3xl mb-2">🏠</div>
                <h4 class="font-semibold text-gray-800 text-sm">外壁塗装</h4>
            </div>
            <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-center border border-red-200">
                <div class="text-3xl mb-2">🏗️</div>
                <h4 class="font-semibold text-gray-800 text-sm">外壁カバー工法</h4>
            </div>
            <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 text-center border border-yellow-200">
                <div class="text-3xl mb-2">🔧</div>
                <h4 class="font-semibold text-gray-800 text-sm">外壁張替え</h4>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border border-green-200">
                <div class="text-3xl mb-2">👨‍🔧</div>
                <h4 class="font-semibold text-gray-800 text-sm">屋根塗装</h4>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border border-purple-200">
                <div class="text-3xl mb-2">💧</div>
                <h4 class="font-semibold text-gray-800 text-sm">屋上防水</h4>
            </div>
            <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 text-center border border-indigo-200">
                <div class="text-3xl mb-2">🏗️</div>
                <h4 class="font-semibold text-gray-800 text-sm">レート・ガルバリウム等</h4>
            </div>
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center border border-gray-200">
                <div class="text-3xl mb-2">🛠️</div>
                <h4 class="font-semibold text-gray-800 text-sm">屋根基材替え・張り替え工法</h4>
            </div>
            <div class="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 text-center border border-teal-200">
                <div class="text-3xl mb-2">🔧</div>
                <h4 class="font-semibold text-gray-800 text-sm">屋根カバー工法</h4>
            </div>
            <div class="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 text-center border border-pink-200">
                <div class="text-3xl mb-2">🔨</div>
                <h4 class="font-semibold text-gray-800 text-sm">外壁補修</h4>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center border border-orange-200">
                <div class="text-3xl mb-2">🔧</div>
                <h4 class="font-semibold text-gray-800 text-sm">屋根補修</h4>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
                <div class="text-3xl mb-2">🌊</div>
                <h4 class="font-semibold text-gray-800 text-sm">ベランダ防水</h4>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center border border-green-200">
                <div class="text-3xl mb-2">✅</div>
                <h4 class="font-semibold text-gray-800 text-sm">外壁雨漏り修繕</h4>
            </div>
        </div>
    </div>`;
}

/**
 * 🔥 保有資格生成（プレビュー完全一致）
 */
function generateQualificationsHtml(qualifications) {
  if (!qualifications || qualifications.length === 0) {
    return '';
  }

  const qualificationCards = qualifications.map(qual => `
    <div class="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200 text-center">
        <div class="text-3xl mb-2">🏅</div>
        <h4 class="font-bold text-yellow-800 text-sm">${qual}</h4>
    </div>
  `).join('');

  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-yellow-600 mr-3 rounded"></span>
            保有資格
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            ${qualificationCards}
        </div>
    </div>`;
}

/**
 * 🔥 加入保険生成（プレビュー完全一致）
 */
function generateInsuranceHtml(insurance) {
  // 🔥 空の場合はセクションごと非表示
  if (!insurance || insurance.length === 0) {
    return '';
  }

  const insuranceCards = insurance.map(ins => `
    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 text-center">
        <div class="text-3xl mb-2">🛡️</div>
        <h4 class="font-bold text-blue-800 text-sm">${ins}</h4>
    </div>
  `).join('');

  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-blue-600 mr-3 rounded"></span>
            加入保険
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            ${insuranceCards}
        </div>
    </div>`;
}

/**
 * 🔥 当社の強み生成（プレビュー完全一致）
 */
function generateCompanyStrengthsHtml() {
  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-purple-600 mr-3 rounded"></span>
            当社の強み
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                <div class="text-4xl mb-3 text-center">🌡️</div>
                <h4 class="font-bold text-red-800 mb-2 text-center">遮熱・断熱塗料対応可能</h4>
                <p class="text-sm text-red-700 text-center">夏涼しく冬暖かい快適な住環境を実現</p>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div class="text-4xl mb-3 text-center">🏡</div>
                <h4 class="font-bold text-green-800 mb-2 text-center">エクステリア（庭・駐車場・外構）</h4>
                <p class="text-sm text-green-700 text-center">外壁塗装と合わせて外観を総合プロデュース</p>
            </div>
            <div class="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                <div class="text-4xl mb-3 text-center">☀️</div>
                <h4 class="font-bold text-yellow-800 mb-2 text-center">太陽光パネル設置（蓄電合わせ）</h4>
                <p class="text-sm text-yellow-700 text-center">エコでお得な住まいづくりをトータルサポート</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <div class="text-4xl mb-3 text-center">🏠</div>
                <h4 class="font-bold text-purple-800 mb-2 text-center">提携先ローン有り</h4>
                <p class="text-sm text-purple-700 text-center">無理のない支払いプランをご提案</p>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-6 border border-blue-200">
                <div class="text-4xl mb-3 text-center">💳</div>
                <h4 class="font-bold text-blue-800 mb-2 text-center">クレジットカード払い可</h4>
                <p class="text-sm text-blue-700 text-center">お支払い方法も柔軟に対応いたします</p>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                <div class="text-4xl mb-3 text-center">🔥</div>
                <h4 class="font-bold text-orange-800 mb-2 text-center">火災保険申請サポート</h4>
                <p class="text-sm text-orange-700 text-center">台風・雪害などの損害を保険でカバー</p>
            </div>
            <div class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200">
                <div class="text-4xl mb-3 text-center">💰</div>
                <h4 class="font-bold text-teal-800 mb-2 text-center">助成金申請サポート</h4>
                <p class="text-sm text-teal-700 text-center">最大70万円の助成金申請を完全サポート</p>
            </div>
            <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                <div class="text-4xl mb-3 text-center">🏗️</div>
                <h4 class="font-bold text-indigo-800 mb-2 text-center">建築許可証</h4>
                <p class="text-sm text-indigo-700 text-center">法令遵守で安心・確実な施工をお約束</p>
            </div>
            <div class="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-200">
                <div class="text-4xl mb-3 text-center">✨</div>
                <h4 class="font-bold text-pink-800 mb-2 text-center">光触媒塗料対応可能</h4>
                <p class="text-sm text-pink-700 text-center">セルフクリーニング効果で美しさ長持ち</p>
            </div>
        </div>
    </div>`;
}

/**
 * 🔥 写真ギャラリー生成（プレビュー完全一致）
 */
function generateGalleryHtml(galleryImages) {
  // 🔥 空の場合はセクションごと非表示
  if (!galleryImages || galleryImages.length === 0) {
    return '';
  }

  const galleryHtml = galleryImages.map((img, index) => `
    <div class="flex-shrink-0 w-full md:w-72 aspect-square overflow-hidden rounded-lg cursor-pointer snap-center">
        <img src="${img.src}" alt="${img.name || 'ギャラリー画像'}" class="w-full h-full object-cover hover:scale-110 transition-transform duration-300">
    </div>
  `).join('');

  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-green-600 mr-3 rounded"></span>
            写真ギャラリー
        </h3>
        <div class="relative">
            <button onclick="scrollGallery('left')" class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </button>
            <div class="overflow-hidden px-2">
                <div id="galleryContainer" class="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide" style="-webkit-overflow-scrolling: touch; scroll-behavior: smooth; scroll-snap-type: x mandatory;">
                    ${galleryHtml}
                </div>
            </div>
            <button onclick="scrollGallery('right')" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        </div>
        <div class="flex justify-center gap-1 mt-4" id="galleryIndicators">
            ${galleryImages.map((_, index) => `
                <button onclick="goToGalleryImage(${index})" class="w-2 h-2 rounded-full transition gallery-dot ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}"></button>
            `).join('')}
        </div>
    </div>`;
}

/**
 * 🔥 会社概要生成（プレビュー完全一致）
 */
function generateBasicInfoHtml(companyName, representativeName, address, established, googleMapsApiKey) {
  // 🔥 Google Maps用のエンコード済みアドレス
  const encodedAddress = address ? encodeURIComponent(address) : '';

  return `
    <div class="mb-12">
        <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span class="w-1 h-6 bg-indigo-600 mr-3 rounded"></span>
            会社概要
        </h3>
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div class="divide-y divide-gray-200">
                <div class="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="font-medium text-gray-700">会社名</div>
                    <div class="md:col-span-2 text-gray-900">${companyName}</div>
                </div>
                ${representativeName ? `
                <div class="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="font-medium text-gray-700">代表者</div>
                    <div class="md:col-span-2 text-gray-900">${representativeName}</div>
                </div>
                ` : ''}
                ${address ? `
                <div class="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="font-medium text-gray-700">住所</div>
                    <div class="md:col-span-2 text-gray-900">${address}</div>
                </div>
                ` : ''}
                ${established ? `
                <div class="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="font-medium text-gray-700">設立</div>
                    <div class="md:col-span-2 text-gray-900">${established}</div>
                </div>
                ` : ''}
            </div>
        </div>
        ${address && googleMapsApiKey ? `
        <!-- 🔥 Googleマップ埋め込み（プレビュー完全一致） -->
        <div class="mt-4">
            <h4 class="text-sm font-medium text-gray-600 mb-2">アクセス</h4>
            <div class="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
                <iframe width="100%" height="100%" frameborder="0" style="border:0"
                    src="https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}&center=${encodedAddress}&zoom=16"
                    allowfullscreen="">
                </iframe>
            </div>
        </div>
        ` : ''}
    </div>`;
}

/**
 * 🔥 支店・店舗マップ生成（プレビュー完全一致）
 */
function generateBranchMapsHtml(branchNames, branchAddresses, googleMapsApiKey) {
  if (!branchNames || branchNames.length === 0 || !branchAddresses || branchAddresses.length === 0) {
    return '';
  }

  // 🔥 プレビューから完全コピー：支店マップ構造
  const branchHtml = branchNames.map((name, index) => {
    const address = branchAddresses[index] || '';
    if (!name && !address) return '';

    // Google Maps用のエンコード済みアドレス（郵便番号込みでより正確に）
    const encodedAddress = encodeURIComponent(address);

    return `
    <div class="border rounded-lg p-4 bg-gray-50 mb-4">
        <h5 class="text-lg font-semibold text-gray-800 mb-2">${name}</h5>
        <p class="text-sm text-gray-600 mb-3">
            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            ${address}
        </p>
        ${googleMapsApiKey ? `
        <div class="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
            <iframe width="100%" height="100%" frameborder="0" style="border:0"
                src="https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodedAddress}&center=${encodedAddress}&zoom=16"
                allowfullscreen="">
            </iframe>
        </div>
        ` : ''}
    </div>`;
  }).filter(html => html).join('');

  if (!branchHtml) return '';

  return `
    <div class="mt-6">
        <h4 class="text-sm font-medium text-gray-600 mb-3 mt-4">支店情報</h4>
        ${branchHtml}
    </div>`;
}

/**
 * データ解析・変換ヘルパー関数群
 */
function parseGalleryData(galleryString) {
  if (!galleryString) return [];
  try {
    const parsed = JSON.parse(galleryString);
    const images = Array.isArray(parsed) ? parsed : [];
    // 🔥 全ての画像URLをthumbnail形式に変換
    return images.map(img => ({
      ...img,
      src: convertToThumbnailUrl(img.src || '', 'w800')
    }));
  } catch (e) {
    // カンマ区切りの場合の処理
    const urls = galleryString.split(',').map(url => url.trim()).filter(url => url);
    return urls.map(url => ({
      src: convertToThumbnailUrl(url, 'w800')
    }));
  }
}

function parseListData(listString) {
  if (!listString) return [];
  // 日本語読点「、」と英語カンマ「,」の両方に対応
  return listString.split(/[、,]/).map(item => item.trim()).filter(item => item);
}

function parseConstructionExamples(data) {
  // 施工事例データを別シート「施工事例」から取得
  const examples = [];
  const merchantId = data['加盟店ID'] || data['登録ID'];

  if (!merchantId) {
    console.log('[parseConstructionExamples] 加盟店IDなし');
    return examples;
  }

  console.log('[parseConstructionExamples] 🔥 merchantId:', merchantId);

  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const examplesSheet = ss.getSheetByName('施工事例');

    if (!examplesSheet) {
      console.log('[parseConstructionExamples] 施工事例シートなし');
      return examples;
    }

    const sheetData = examplesSheet.getDataRange().getValues();
    const headers = sheetData[0];
    const rows = sheetData.slice(1);

    // 加盟店IDでフィルタ
    const merchantExamples = rows.filter(row => row[0] === merchantId);

    console.log(`[parseConstructionExamples] ${merchantId}の施工事例: ${merchantExamples.length}件`);

    merchantExamples.forEach(row => {
      const example = {
        exampleId: row[1] || '',
        title: row[2] || '',
        age: row[3] ? `築${row[3]}年` : '',
        cost: row[4] ? `${row[4]}万円` : '',
        description: row[5] || '',
        beforeImage: convertToThumbnailUrl(row[6] || '', 'w800'),
        afterImage: convertToThumbnailUrl(row[7] || '', 'w800')
      };

      // Before/After画像が少なくとも1つある場合のみ追加
      if (example.beforeImage || example.afterImage) {
        examples.push(example);
      }
    });

    console.log(`[parseConstructionExamples] 有効な施工事例: ${examples.length}件`);
    return examples;

  } catch (error) {
    console.error('[parseConstructionExamples] エラー:', error);
    return examples;
  }
}

function calculateRatings(data) {
  // くらべるスコアから項目別評価を算出
  const baseScore = parseFloat(data['くらべるスコア'] || '4.2');

  return {
    pricing: Math.min(5, Math.max(1, baseScore + (Math.random() - 0.5) * 0.6)),
    communication: Math.min(5, Math.max(1, baseScore + (Math.random() - 0.5) * 0.6)),
    technology: Math.min(5, Math.max(1, baseScore + (Math.random() - 0.5) * 0.6)),
    schedule: Math.min(5, Math.max(1, baseScore + (Math.random() - 0.5) * 0.6)),
    service: Math.min(5, Math.max(1, baseScore + (Math.random() - 0.5) * 0.6)),
    quality: Math.min(5, Math.max(1, baseScore + (Math.random() - 0.5) * 0.6))
  };
}

function formatEstablishedDate(establishedYear) {
  if (!establishedYear) return '';

  // Date型を文字列に変換
  var yearStr = String(establishedYear);

  // ISO日付形式（2012-06-30T15:00:00.000Z）の場合、年月を抽出
  if (yearStr.indexOf('T') !== -1) {
    var date = new Date(establishedYear);
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月設立';
  }

  // 「2012年7月1日設立」形式に変換
  if (yearStr.indexOf('年') !== -1 && yearStr.indexOf('月') !== -1) {
    return yearStr.indexOf('設立') !== -1 ? yearStr : yearStr + '設立';
  }

  return yearStr;
}