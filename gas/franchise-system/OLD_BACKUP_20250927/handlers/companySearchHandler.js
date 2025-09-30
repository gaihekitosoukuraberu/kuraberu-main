/**
 * 会社情報検索ハンドラー
 */

/**
 * 会社情報検索処理
 * @param {Object} data - リクエストデータ
 * @return {Object|ContentService.TextOutput} レスポンス
 */
function handleSearchCompany(data) {
  try {
    const companyName = data.companyName;

    if (!companyName) {
      return {
        success: false,
        message: '会社名が指定されていません',
        data: null
      };
    }

    console.log('会社情報検索開始:', companyName);

    // 検索実行
    let searchResults;
    try {
      searchResults = searchCompanyInfo(companyName);
    } catch (searchError) {
      console.error('検索処理エラー:', searchError);
      return {
        success: false,
        message: '検索エラー: ' + searchError.toString(),
        data: null,
        error: searchError.toString()
      };
    }

    if (!searchResults || searchResults.length === 0) {
      console.log('検索結果なし、基本情報で対応');
      // 検索結果がない場合は基本的な会社情報を返す
      const basicInfo = {
        company_name: companyName,
        company_name_kana: '',
        trade_name: '',
        trade_name_kana: '',
        representative: '',
        representative_kana: '',
        postal_code: '',
        address: '',
        phone: '',
        website: '',
        established: '',
        features: companyName + 'は外壁塗装を専門とする会社です。詳細情報は直接お問い合わせください。',
        branches: []
      };

      return {
        success: true,
        message: '基本情報のみ取得',
        data: basicInfo
      };
    }

    console.log('検索結果数:', searchResults.length);

    // 会社名の一致度とサービス関連度でスコアリング
    const sortedResults = searchResults.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      const aSnippet = (a.snippet || '').toLowerCase();
      const bSnippet = (b.snippet || '').toLowerCase();
      const searchName = companyName.toLowerCase();

      // スコア計算
      let aScore = 0;
      let bScore = 0;

      // タイトルに会社名が含まれているか
      if (aTitle.includes(searchName)) aScore += 10;
      if (bTitle.includes(searchName)) bScore += 10;

      // サービス関連キーワード
      const serviceKeywords = ['塗装', 'リフォーム', '外壁', '屋根', '防水', '工事', '施工'];
      serviceKeywords.forEach(keyword => {
        if (aTitle.includes(keyword) || aSnippet.includes(keyword)) aScore += 2;
        if (bTitle.includes(keyword) || bSnippet.includes(keyword)) bScore += 2;
      });

      // 会社名のみの検索結果を優先
      if (a.searchQuery === companyName) aScore += 5;
      if (b.searchQuery === companyName) bScore += 5;

      return bScore - aScore;
    });

    console.log('最も関連性の高いサイト:', sortedResults[0]?.link);

    // 上位サイトを徹底的に取得
    const enrichedResults = [];

    // 最初の3サイトを詳細に取得
    for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
      const result = sortedResults[i];
      const isMain = i === 0; // 最初の1件がメイン

      console.log(`${isMain ? 'メイン' : 'サブ'}ページ取得[${i+1}]: ${result.link}`);

      try {
        // メインサイトは詳細取得、それ以外は通常取得
        const pageContent = isMain ?
          fetchPageContentDetailed(result.link) :
          fetchPageContent(result.link);

        console.log(`ページ内容取得: ${pageContent ? pageContent.length + '文字' : '失敗'}`);

        enrichedResults.push({
          ...result,
          pageContent: pageContent || '',
          isMainSite: isMain
        });
      } catch (e) {
        console.log('ページ取得エラー:', e.toString());
        enrichedResults.push({
          ...result,
          pageContent: '',
          isMainSite: isMain
        });
      }
    }

    // 残りの結果も含める（ページ取得なし）
    if (sortedResults.length > 3) {
      enrichedResults.push(...sortedResults.slice(3).map(r => ({...r, pageContent: '', isMainSite: false})));
    }

    console.log('AI解析開始');
    // AI解析（ページ内容も含めて詳細に）
    let companyInfo;
    try {
      companyInfo = analyzeWithAI(enrichedResults, companyName);
    } catch (aiError) {
      console.error('AI処理エラー:', aiError);
      return {
        success: false,
        message: 'AI処理エラー: ' + aiError.toString(),
        data: null,
        error: aiError.toString()
      };
    }

    if (!companyInfo) {
      console.error('AI解析失敗: 結果がnull');
      return {
        success: false,
        message: 'AI解析に失敗しました（結果なし）',
        data: null
      };
    }

    console.log('会社情報取得成功:', companyInfo.company_name);

    return {
      success: true,
      message: '会社情報を取得しました',
      data: companyInfo
    };

  } catch (error) {
    console.error('handleSearchCompany エラー:', error);
    console.error('エラースタックトレース:', error.stack);
    return {
      success: false,
      message: 'サーバーエラーが発生しました',
      data: null,
      error: error.toString(),
      stack: error.stack
    };
  }
}

/**
 * 会社情報を検索して取得
 * @param {string} companyName - 会社名または屋号
 * @return {array} 検索結果の配列
 */
function searchCompanyInfo(companyName) {
  try {
    const searchApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
    const searchEngineId = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');

    console.log('API Keys存在チェック:', {
      searchApiKey: !!searchApiKey,
      searchEngineId: !!searchEngineId
    });

    if (!searchApiKey || !searchEngineId) {
      console.error('Google Search API設定なし');
      throw new Error('Google Search APIキーが設定されていません');
    }

    const allResults = [];
    const queries = [
      companyName, // 会社名のみ
      companyName + ' 外壁塗装', // サービス関連
      companyName + ' リフォーム' // サービス関連
    ];

    // 3つの検索を実行
    for (const query of queries) {
      console.log('検索実行:', query);
      const searchUrl = `https://www.googleapis.com/customsearch/v1?` +
        `key=${searchApiKey}&` +
        `cx=${searchEngineId}&` +
        `q=${encodeURIComponent(query)}&` +
        `num=5&` + // 各検索5件
        `hl=ja`;

      try {
        const response = UrlFetchApp.fetch(searchUrl, {
          muteHttpExceptions: true
        });

        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();

        if (responseCode === 200) {
          const data = JSON.parse(responseText);
          console.log(`API応答 (${query}):`, {
            totalResults: data.searchInformation?.totalResults || 0,
            itemsCount: data.items ? data.items.length : 0
          });

          if (data.items && data.items.length > 0) {
            const results = data.items.map(item => ({
              title: item.title || '',
              link: item.link || '',
              snippet: item.snippet || '',
              searchQuery: query // どの検索で取得したか記録
            }));
            allResults.push(...results);
          } else {
            console.log(`検索結果0件 (${query})`);
          }
        } else {
          console.error(`API エラー ${responseCode} (${query}):`, responseText);
        }
      } catch (e) {
        console.log('検索エラー(' + query + '):', e.toString());
      }
    }

    // 重複URLを除去
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const result of allResults) {
      if (!seenUrls.has(result.link)) {
        seenUrls.add(result.link);
        uniqueResults.push(result);
      }
    }

    console.log('全検索結果:', uniqueResults.length + '件');
    return uniqueResults;

  } catch (error) {
    console.error('検索エラー:', error.toString());
    throw error; // エラーを上位に伝播
  }
}

/**
 * ページコンテンツを取得して会社情報を抽出
 * @param {string} url - 取得するURL
 * @return {string} ページのテキスト内容
 */
function fetchPageContent(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5
    });

    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      return extractTextFromHTML(html, 10000);
    }
    return '';
  } catch (e) {
    console.log('ページ取得エラー:', url, e.toString());
    return '';
  }
}

/**
 * メインサイトを詳細に取得
 * @param {string} url - 取得するURL
 * @return {string} より詳細なページ内容
 */
function fetchPageContentDetailed(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10 // メインサイトは10秒まで待つ
    });

    if (response.getResponseCode() === 200) {
      const html = response.getContentText();

      // 会社概要ページなどの関連ページも探す
      const companyInfoUrls = extractCompanyInfoUrls(html, url);
      console.log('関連ページ発見:', companyInfoUrls.length + '件');

      // メインページの内容
      let allContent = extractTextFromHTML(html, 30000);

      // フッター部分を重点的に抽出（支店情報が多い）
      const footerContent = extractFooterBranchInfo(html);
      if (footerContent) {
        allContent += ' [フッター支店情報] ' + footerContent;
      }

      // 支店情報を重点的に探すため、関連ページを全部チェック
      let foundBranchPage = false;
      for (let i = 0; i < companyInfoUrls.length; i++) {
        try {
          const pageUrl = companyInfoUrls[i];
          console.log(`関連ページ取得[${i+1}/${companyInfoUrls.length}]:`, pageUrl);

          // URLに支店関連キーワードがあるかチェック
          const isBranchUrl = /支店|営業所|店舗|拠点|branch|office|store|tenpo|eigyousho/i.test(pageUrl);

          const subResponse = UrlFetchApp.fetch(pageUrl, {
            muteHttpExceptions: true,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: isBranchUrl ? 8 : 5  // 支店ページは長めにタイムアウト
          });

          if (subResponse.getResponseCode() === 200) {
            const subHtml = subResponse.getContentText();
            const subContent = extractTextFromHTML(subHtml, isBranchUrl ? 25000 : 20000);

            // 支店キーワードが含まれているページは重要なので強調
            if (subContent.match(/(支店|営業所|事業所|店舗|拠点|ショールーム|〒\d{3}-\d{4}.*?(支店|営業所|店))/)) {
              console.log('🎯 支店情報ページ発見！URL:', pageUrl);
              foundBranchPage = true;
              allContent += ' 【重要：支店一覧ページ】 ' + subContent;
            } else if (subContent.match(/(会社概要|企業情報|Company)/)) {
              console.log('会社概要ページ取得');
              allContent += ' 【会社概要】 ' + subContent;
            } else {
              allContent += ' ' + subContent;
            }
          }
        } catch (e) {
          console.log('関連ページ取得失敗:', e.toString());
        }
      }

      if (foundBranchPage) {
        console.log('✅ 支店情報ページから詳細を取得済み');
      }

      return allContent;
    }
    return '';
  } catch (e) {
    console.log('詳細ページ取得エラー:', url, e.toString());
    return '';
  }
}

/**
 * HTMLからテキストを抽出（支店情報を優先的に取得）
 */
function extractTextFromHTML(html, maxLength) {
  let text = html;

  // scriptとstyleタグを除去
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 改行タグをスペースに
  text = text.replace(/<br\s*\/?>/gi, ' ');
  text = text.replace(/<\/p>/gi, ' ');
  text = text.replace(/<\/div>/gi, ' ');
  text = text.replace(/<\/td>/gi, ' ');
  text = text.replace(/<\/li>/gi, ' ');
  text = text.replace(/<\/h[1-6]>/gi, ' ');

  // 残りのHTMLタグを除去
  text = text.replace(/<[^>]+>/g, ' ');

  // エンティティをデコード
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 複数の空白を1つに
  text = text.replace(/\s+/g, ' ');

  // 支店情報の効率的な抽出（末尾重視）
  if (text.length > maxLength) {
    // HTMLの末尾から支店情報を探す
    const tailText = text.substring(text.length - Math.min(15000, text.length));
    const branchKeywords = /(支店|営業所|事業所|店舗|拠点|ショールーム|出張所)/;

    if (branchKeywords.test(tailText)) {
      // 支店情報が含まれる場合は末尾を優先
      const headText = text.substring(0, Math.max(0, maxLength - 10000));
      return headText + ' [支店情報部分] ' + tailText.substring(0, 10000);
    }
  }

  return text.substring(0, maxLength);
}

/**
 * フッターから支店情報を抽出
 */
function extractFooterBranchInfo(html) {
  try {
    // フッターマーカーを探す
    const footerMarkers = ['footer', 'Copyright', '©', 'All Rights Reserved', '</body>'];
    let footerPosition = html.length;

    for (const marker of footerMarkers) {
      const pos = html.lastIndexOf(marker);
      if (pos > 0 && pos < footerPosition) {
        footerPosition = pos;
      }
    }

    // フッター前の10000文字を取得
    const footerSection = html.substring(Math.max(0, footerPosition - 10000), html.length);

    // 支店キーワードチェック
    const branchKeywords = /(支店|営業所|事業所|店舗|拠点|ショールーム|〒\d{3}-\d{4})/;
    if (branchKeywords.test(footerSection)) {
      // HTMLタグを除去して返す
      return extractTextFromHTML(footerSection, 10000);
    }

    return '';
  } catch (e) {
    console.log('フッター抽出エラー:', e.toString());
    return '';
  }
}

/**
 * 会社概要・支店情報ページのURLを抽出（優先度付き）
 */
function extractCompanyInfoUrls(html, baseUrl) {
  const urls = [];
  const highPriorityPatterns = [
    // 支店情報専用ページを最優先
    /href=["']([^"']*(?:branch|tenpo|eigyousho|shiten|kyoten)[^"']*)["']/gi,
    /href=["']([^"']*(?:支店|営業所|店舗|拠点|事業所)[^"']*)["']/gi,
    /href=["']([^"']*(?:一覧|list|map)[^"']*)["']/gi,
  ];

  const normalPatterns = [
    // 会社概要ページ
    /href=["']([^"']*(?:company|about|corporate|kaisya|gaiyou|profile|outline)[^"']*)["']/gi,
    /href=["']([^"']*(?:会社|概要|企業情報|アクセス)[^"']*)["']/gi,
    /href=["']([^"']*(?:office|shop|store)[^"']*)["']/gi,
  ];

  const baseHost = baseUrl.match(/^https?:\/\/[^\/]+/)[0];

  // 優先度の高いパターンから先に処理
  const allPatterns = [...highPriorityPatterns, ...normalPatterns];

  allPatterns.forEach(pattern => {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let url = match[1];

      // 相対URLを絶対URLに変換
      if (url.startsWith('/')) {
        url = baseHost + url;
      } else if (!url.startsWith('http')) {
        continue;
      }

      // 同じドメインのURLのみ、重複除外
      if (url.startsWith(baseHost) && !urls.includes(url)) {
        urls.push(url);
      }
    }
  });

  // 支店関連ページを優先的に返す（最大15件に増やす）
  return urls.slice(0, 15);
}

/**
 * AIで検索結果を解析して会社情報を抽出
 * @param {array} searchResults - 検索結果の配列
 * @param {string} companyName - 会社名
 * @return {object} 抽出された会社情報
 */
function analyzeWithAI(searchResults, companyName) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

    if (!apiKey) {
      console.error('OpenRouter APIキーが設定されていません');
      throw new Error('OpenRouter APIキーが未設定');
    }

    console.log('OpenRouter API呼び出し開始');

    // 検索結果をテキストに整形
    const searchText = searchResults.map(r => {
      // ページコンテンツがある場合のみ追加
      const pageInfo = (r && r.pageContent) ? `\nページ内容（抜粋）: ${r.pageContent.substring(0, 10000)}` : '';
      return `URL: ${r.link || ''}\nタイトル: ${r.title || ''}\n概要: ${r.snippet || ''}${pageInfo}`;
    }).join('\n\n---\n\n');

    const prompt = `
【加盟店情報抽出】会社名: ${companyName}

検索結果:
${searchText}

【情報抽出ルール】
1. 会社基本情報
- company_name: 株式会社等の法的表記を含む正式名称（役職は除外）
- representative: 代表者氏名のみ（「代表取締役」「代表」「社長」の後の氏名、会社概要ページの代表者欄、挨拶・メッセージページの署名から抽出）
- address: 都道府県から番地、建物名・階数まで完全に記載
- phone: ハイフン付き（03-1234-5678形式）
- website: httpまたはhttpsから始まる完全URL

2. 支店情報の網羅的抽出
- 「支店」「営業所」「事業所」「店舗」「拠点」「ショールーム」を全て探索
- 複数の〒や電話番号がある場合、本社以外は全て支店として抽出
- フッター情報も必ず確認
- 見つかった全ての拠点を記載
- 記載がある支店は多くても全て反映すること

3. PR文作成（250-350文字厳守）
必須要素:
- 創業年数または設立年
- 具体的な施工実績（数値があれば記載）
- 専門分野（外壁塗装、屋根工事、防水工事等）
- 地域密着性または対応エリア
- 保証制度や資格情報（あれば）
- 特徴的なサービス

4. 品質検証
- 基本項目に空欄がないか確認（必須項目で空欄になる場合は2番目・3番目の候補サイトも確認して情報を探すこと）
- 住所は番地まで含まれているか
- 支店を見逃していないか確認
- 電話番号の市外局番は住所と一致するか

【出力JSON】
{
  "company_name": "正式会社名",
  "company_name_kana": "カナ（不明なら空文字）",
  "trade_name": "屋号（会社名と同じなら空文字）",
  "trade_name_kana": "カナ（不明なら空文字）",
  "representative": "代表者名（肩書きなし）",
  "representative_kana": "カナ（不明なら空文字）",
  "postal_code": "123-4567",
  "address": "都道府県から番地・建物名まで完全記載",
  "phone": "ハイフン付き電話番号",
  "website": "URL",
  "established": "設立年月",
  "features": "250-350文字のPR文。創業年数、施工実績、専門分野、地域密着性、保証制度、特徴を含む",
  "branches": [
    {"name": "支店名", "address": "完全な住所"}
  ]
}`;

    const requestBody = {
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '日本の会社情報を正確に抽出するアシスタントです。JSON形式で応答します。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };

    const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kuraberu-tosou.com',
        'X-Title': 'Kuraberu Franchise System'
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    console.log('OpenRouter APIレスポンスコード:', responseCode);

    if (responseCode === 200) {
      const data = JSON.parse(response.getContentText());
      const content = data.choices[0].message.content;
      console.log('AI応答受信成功');

      // JSONを抽出（マークダウンコードブロックを除去）
      let jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const companyInfo = JSON.parse(jsonStr);

        // 屋号チェック（会社名と実質同じなら空に）
        const normalizeCompanyName = (name) => {
          return name.replace(/[株式会社|有限会社|合同会社|合資会社|（）()\s]/g, '').toLowerCase();
        };
        const cn = normalizeCompanyName(companyInfo.company_name || companyName);
        const tn = normalizeCompanyName(companyInfo.trade_name || '');
        const tradeName = (cn === tn || !companyInfo.trade_name) ? '' : companyInfo.trade_name;

        // PR文調整（250-350文字）
        let features = companyInfo.features || '';
        if (features.length < 250) {
          features += '。地域に根ざした信頼できる塗装業者として、お客様の満足を追求します。';
        }
        features = features.substring(0, 350);

        // 支店情報を処理
        const branches = companyInfo.branches || [];

        return {
          company_name: companyInfo.company_name || companyName,
          company_name_kana: companyInfo.company_name_kana || '',
          trade_name: tradeName,
          trade_name_kana: tradeName ? companyInfo.trade_name_kana || '' : '',
          representative: companyInfo.representative || '',
          representative_kana: companyInfo.representative_kana || '',
          postal_code: companyInfo.postal_code || '',
          address: companyInfo.address || '',
          phone: companyInfo.phone || '',
          website: companyInfo.website || '',
          established: companyInfo.established || '',
          features: features,
          branches: branches
        };

      } catch (parseError) {
        console.error('JSON解析エラー:', parseError);
        return null;
      }
    } else {
      const errorText = response.getContentText();
      console.error('OpenRouter APIエラー:', responseCode, errorText);
      throw new Error(`OpenRouter API失敗 (${responseCode}): ${errorText}`);
    }

  } catch (error) {
    console.error('analyzeWithAI エラー:', error);
    console.error('エラースタック:', error.stack);
    return null;
  }
}

/**
 * テスト関数
 */
function testCompanySearch() {
  const testData = {
    companyName: '株式会社サンプル塗装'
  };

  const result = handleSearchCompany(testData);
  console.log('テスト結果:', result.getContent());
}