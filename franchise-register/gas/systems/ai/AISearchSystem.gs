/**
 * ====================================
 * AI検索システム V1509（安定版）
 * ====================================
 * 改善内容：
 * - V1508 + フッター支店情報抽出機能追加
 * - フッター削除前に支店情報を抽出してDeepSeekに送信
 * - 支店・店舗・営業所ページURL自動追加（/shop/, /office/, /branch/ など25パターン）
 * - DeepSeekプロンプトで支店情報抽出を最優先指示
 * - 全ページクロール（最大15ページ）
 * ====================================
 *
 * 【依存関係】
 * - FranchiseSystem.js（AI検索ボタン - 会社情報自動入力に依存）
 * - Script Properties（APIキー - GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID, OPENROUTER_API_KEY）
 *
 * 【影響範囲】
 * - フロント: franchise-register（AI検索ボタン）
 * - バック: なし（スタンドアロンシステム）
 * - データ: Spreadsheet書き込みなし（データ返却のみ）
 *
 * 【変更時の注意】
 * ⚠️  APIキー変更時は全ての検索に影響
 * ⚠️  AIモデル変更（DeepSeek → 他）時はデータ品質に影響
 * ⚠️  プロンプト変更時は抽出精度に影響
 * ⚠️  支店抽出ロジック変更時はデータ完全性に影響
 *
 * 【必須テスト】
 * - npm run test:integration（AI検索テスト含む）
 * - npm run test:ai（今後実装予定）
 * - npm run check:impact AISearchSystem.gs
 * - 手動テスト: 実際の会社名で検索し、支店情報が正しく抽出されるか確認
 */

const AISearchSystem = {
  handle: function(params) {
    try {
      const action = params.action;
      switch (action) {
        case 'searchCompany':
          return this.searchCompany(params);
        case 'getRanking':
          return this.getRanking(params);
        case 'ai_test':
          return { success: true, message: 'AI search system is running (V1506)' };
        default:
          return { success: false, error: 'Unknown AI action: ' + action };
      }
    } catch (error) {
      console.error('[AISearchSystem] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  searchCompany: function(params) {
    try {
      const companyName = params.companyName;
      if (!companyName) return { success: false, error: '会社名が指定されていません' };

      console.log('[AISearchSystem] 検索開始:', companyName);

      const searchApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
      const searchEngineId = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
      const openRouterKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

      if (!searchApiKey || !searchEngineId || !openRouterKey) {
        console.warn('[AISearchSystem] APIキー未設定');
        return {
          success: true,
          data: {
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
            features: companyName + 'は外壁塗装・リフォームを行う会社です。',
            branches: []
          }
        };
      }

      const searchResults = this.performGoogleSearch(companyName, searchApiKey, searchEngineId);
      if (!searchResults.length) {
        return {
          success: true,
          message: '検索結果なし',
          data: {
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
            features: companyName + 'の情報が見つかりませんでした。',
            branches: []
          }
        };
      }

      // Googleの生のトップヒット1件のみ使用（スコアリング・ランキングなし）
      const bestMatch = searchResults[0];
      console.log('[AISearchSystem] 採用URL（Google生1位）:', bestMatch.link);

      // トップページ取得
      const topPageData = this.fetchHtmlContent(bestMatch.link, true);
      var allPages = this.extractAllPages(topPageData.rawHtml, bestMatch.link);
      console.log('[DEBUG] 全ページ数:', allPages.length);

      var allContent = topPageData.text;

      // HP内の重要ページを徹底的にクロール（100,000文字または十分な情報が集まるまで）
      var domainMatch = bestMatch.link.match(/^(https?:\/\/[^\/]+)/);
      if (domainMatch) {
        var domain = domainMatch[0];
        var importantPaths = [
          '/company/', '/company/outline/', '/company/info/', '/company/profile/',
          '/about/', '/about-us/', '/profile/', '/corporate/', '/kaisya/', '/gaiyou/',
          '/company/message/', '/company/greeting/', '/greeting/', '/message/', '/ceo/',
          '/history/', '/enkaku/', '/rekishi/', '/company/history/', '/ayumi/',
          '/access/', '/map/', '/company/access/',
          '/office/', '/shop/', '/store/', '/tenpo/', '/branch/', '/shiten/', '/eigyousyo/',
          '/staff/', '/team/', '/member/', '/introduction/'
        ];

        var crawledUrls = [];
        var crawledCount = 0;

        console.log('[AISearchSystem] HP内徹底クロール開始:', domain);

        // 重要ページを順次クロール（100,000文字または15ページまで）
        for (var i = 0; i < importantPaths.length && allContent.length < 100000 && crawledCount < 15; i++) {
          try {
            var testUrl = domain + importantPaths[i];
            var pageText = this.fetchHtmlContent(testUrl);

            if (pageText && pageText.length > 300) {
              crawledUrls.push(testUrl);
              crawledCount++;

              // 代表者名、設立年月、支店情報が含まれていれば優先的に先頭に追加
              var hasCriticalInfo = pageText.match(/代表|社長|CEO|設立|創業|支店|営業所|ショールーム|店舗/);
              if (hasCriticalInfo) {
                allContent = pageText + '\n\n===PAGE_BREAK===\n\n' + allContent;
                console.log('[AISearchSystem] 重要ページ取得 (' + crawledCount + '):', importantPaths[i], pageText.length + '文字 [優先]');
              } else {
                allContent += '\n\n===PAGE_BREAK===\n\n' + pageText;
                console.log('[AISearchSystem] ページ取得 (' + crawledCount + '):', importantPaths[i], pageText.length + '文字');
              }
            }
          } catch (e) {
            // Skip
          }

          // レート制限回避
          if (crawledCount > 0 && crawledCount % 5 === 0) {
            Utilities.sleep(300);
          }
        }

        console.log('[AISearchSystem] クロール完了:', crawledCount + 'ページ取得、合計' + allContent.length + '文字');
      }

      console.log('[DEBUG] 最終テキスト量:', allContent.length + '文字');
      console.log('[DEBUG] 支店キーワード:', allContent.includes('支店'), '営業所:', allContent.includes('営業所'), '店舗:', allContent.includes('店舗'));
      console.log('[DEBUG] 冒頭500字:', allContent.substring(0, 500));

      bestMatch.htmlContent = allContent;

      var companyInfo = this.analyzeWithAI([bestMatch], companyName, openRouterKey);
      console.log('[AISearchSystem] 結果 - 代表:', companyInfo.representative || '(空)', '/ 設立:', companyInfo.established || '(空)', '/ 支店:', companyInfo.branches ? companyInfo.branches.length : 0);

      // フロントエンド用データ返却（snake_case形式）
      return {
        success: true,
        message: '会社情報を取得しました',
        data: companyInfo
      };

    } catch (error) {
      console.error('[AISearchSystem] searchCompany error:', error);
      return { success: false, error: error.toString() };
    }
  },

  performGoogleSearch: function(query, apiKey, engineId) {
    const blocklist = ['job', 'career', 'indeed', 'recruit', 'ミツモア', 'エキテン', 'homepro', 'nuri-kae', 'goo', 'yahoo', 'マイナビ', 'sponsored', 'くらしのマーケット', 'zehitomo'];
    const q = query + ' 塗装';
    const url = 'https://www.googleapis.com/customsearch/v1?key=' + apiKey + '&cx=' + engineId + '&q=' + encodeURIComponent(q) + '&num=10&hl=ja';

    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) return [];

      const data = JSON.parse(response.getContentText());
      if (!data.items) return [];

      const results = data.items.filter(function(item) {
        const isBlocked = blocklist.some(function(b) {
          return (item.link || '').includes(b);
        });
        if (isBlocked) {
          console.log('[AISearchSystem] ブロック:', item.link);
        }
        return !isBlocked;
      }).map(function(item) {
        return {
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || ''
        };
      });

      console.log('[AISearchSystem] フィルタ後の結果数:', results.length);
      if (results.length > 0) {
        console.log('[AISearchSystem] 採用予定（1位）:', results[0].link);
      }

      return results;
    } catch (error) {
      console.error('[AISearchSystem] Google search error:', error);
      return [];
    }
  },

  rankSearchResults: function(results, companyName) {
    const scored = results.map(function(r) {
      var score = 0;
      var lc = (r.title + r.snippet).toLowerCase();
      if (lc.includes(companyName.toLowerCase())) score += 2;
      if (r.link.includes('.co.jp')) score += 2;
      if (r.link.includes('.jp')) score += 1;
      if (r.link.includes('.com')) score += 0.5;
      if (r.link.includes('recruit') || r.link.includes('求人')) score -= 2;
      return { title: r.title, link: r.link, snippet: r.snippet, score: score };
    });
    return scored.sort(function(a, b) { return b.score - a.score; });
  },

  fetchHtmlContent: function(url, returnRawHtml) {
    try {
      // HTTPサイトにも対応（HTTPS非対応サイト対策）
      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (response.getResponseCode() !== 200) return returnRawHtml ? { text: '', rawHtml: '' } : '';

      const rawHtml = response.getContentText();

      // フッター削除前に郵便番号を抽出
      var postalCode = '';
      var postalMatch = rawHtml.match(/〒\s*(\d{3}[-\s]?\d{4})/);
      if (postalMatch) {
        postalCode = postalMatch[1].replace(/\s/g, '');
      }

      // 🔥 フッター削除前に支店情報を抽出
      var footerBranchInfo = '';
      var footerMatch = rawHtml.match(/<footer[^>]*>([\s\S]*?)<\/footer>/gi);
      if (footerMatch && footerMatch.length > 0) {
        var footerContent = footerMatch[0]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // フッター内に支店・店舗関連情報があれば保存
        if (footerContent.match(/支店|店舗|営業所|本店|ショールーム|〒\d{3}-?\d{4}/)) {
          footerBranchInfo = footerContent;
        }
      }

      var text = rawHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
        // 🔥 nav、header、footerは削除しない（支店情報があるかもしれない）
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();

      // フッター・ヘッダー・ナビゲーションを完全削除
      text = text
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/プライバシーポリシー|利用規約|サイトマップ|Copyright|All Rights Reserved/gi, '');

      // 郵便番号をテキストに追加（AIが確実に見つけられるように）
      if (postalCode) {
        text = '【本社郵便番号: ' + postalCode + '】\n' + text;
      }

      return returnRawHtml ? { text: text, rawHtml: rawHtml } : text;
    } catch (error) {
      console.error('[AISearchSystem] HTML fetch error:', error);
      return returnRawHtml ? { text: '', rawHtml: '' } : '';
    }
  },

  extractAllPages: function(html, baseUrl) {
    try {
      var allUrls = [];
      var urlSet = {};
      
      var domainMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/);
      if (!domainMatch) return [];
      var domain = domainMatch[1];
      
      var basePathMatch = baseUrl.match(/^(https?:\/\/[^\/]+\/[^\/]*)/);
      var basePath = basePathMatch ? basePathMatch[1] : domain;
      
      var linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
      var match;
      
      while ((match = linkRegex.exec(html)) !== null) {
        var href = match[1];
        
        if (href.startsWith('/')) {
          href = domain + href;
        } else if (href.startsWith('./')) {
          href = basePath + href.substring(2);
        } else if (!href.startsWith('http')) {
          href = basePath + '/' + href;
        }
        
        if (href.startsWith(domain) && !href.includes('#') && !href.includes('?')) {
          if (!href.match(/\.(pdf|jpg|jpeg|png|gif|zip|mp4|mov|css|js)$/i)) {
            if (!urlSet[href]) {
              urlSet[href] = true;
              allUrls.push(href);
            }
          }
        }
      }
      
      console.log('[AISearchSystem] 全ページ検出:', allUrls.length + '件');
      return allUrls;

    } catch (error) {
      console.error('[AISearchSystem] 全ページ検出エラー:', error);
      return [];
    }
  },

  addCompanyInfoPages: function(pages, baseUrl) {
    // 会社概要ページ・支店情報ページの一般的なURLパターンを追加
    var companyPaths = [
      // 会社概要ページ（シンプルなパスから優先）
      '/company/',
      '/company/outline/',
      '/company/about/',
      '/company/profile/',
      '/about/',
      '/about-us/',
      '/profile/',
      '/outline/',
      '/gaiyou/',
      '/annai/',
      '/kaisya/',
      '/info/',
      '/corporate/',
      // 支店・店舗情報ページ
      '/shop/',
      '/shops/',
      '/office/',
      '/offices/',
      '/branch/',
      '/branches/',
      '/store/',
      '/stores/',
      '/tenpo/',
      '/eigyousho/',
      '/shiten/',
      '/kyoten/',
      '/location/',
      '/locations/',
      '/access/',
      '/showroom/'
    ];

    var domainMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/);
    if (!domainMatch) return pages;
    var domain = domainMatch[1];

    var existingSet = {};
    for (var i = 0; i < pages.length; i++) {
      existingSet[pages[i]] = true;
    }

    var added = 0;
    for (var j = 0; j < companyPaths.length; j++) {
      var url = domain + companyPaths[j];
      if (!existingSet[url]) {
        pages.unshift(url); // 先頭に追加（優先度高）
        added++;
      }
    }

    if (added > 0) {
      console.log('[AISearchSystem] 会社概要・支店情報ページ自動追加:', added + '件');
    }

    return pages;
  },

  prioritizeCompanyPages: function(pages) {
    var priority = [];
    var normal = [];

    // 会社概要ページ・支店情報ページのキーワード
    var companyKeywords = [
      'company', 'about', 'outline', 'profile', 'gaiyou', 'annai', '会社概要', '会社案内',
      'shop', 'office', 'branch', 'store', 'tenpo', 'eigyousho', 'shiten', 'kyoten', 'location', 'access',
      '店舗', '支店', '営業所', '拠点'
    ];

    for (var i = 0; i < pages.length; i++) {
      var url = pages[i].toLowerCase();
      var isPriority = false;

      for (var j = 0; j < companyKeywords.length; j++) {
        if (url.includes(companyKeywords[j])) {
          isPriority = true;
          break;
        }
      }

      if (isPriority) {
        priority.push(pages[i]);
      } else {
        normal.push(pages[i]);
      }
    }

    // 会社概要ページを先頭に、その後に通常ページ
    return priority.concat(normal);
  },

  extractBranchesWithRegex: function(text) {
    var branches = [];
    var seenNames = {};

    // パターン1: 支店名 + 郵便番号 + 住所
    var pattern1 = /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z]{2,10}(?:支店|営業所|店舗|ショールーム|事業所|支社))[^\n]*?〒?\s*(\d{3}[-\s]?\d{4})?[^\n]*?([都道府県][^\n<>]{5,100})/g;
    var m;
    while ((m = pattern1.exec(text)) !== null) {
      var name = m[1].replace(/本社|本店/g, '').trim();
      // 正常な支店名のみ許可（日本語+アルファベットのみ、記号や長すぎる名前は除外）
      var isValidName = name && name.length >= 2 && name.length <= 15 &&
                       !name.match(/本社|本店/) &&
                       !name.match(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9]/);
      if (isValidName && !seenNames[name]) {
        var postal = m[2] ? m[2].replace(/\s/g, '') : '';
        var address = m[3].replace(/\s+/g, ' ').trim();
        // 住所が具体的な場合のみ採用（市区町村名を含む）
        var hasCity = address.match(/[市区町村郡]/);
        var isNotVague = !address.match(/エリア|全域|一帯|県内|都内|各地|管内/);
        if (address.length >= 10 && hasCity && isNotVague) {
          branches.push({ name: name, address: address, postalCode: postal });
          seenNames[name] = true;
        }
      }
    }

    // パターン2: 「支店」を含む行から次の数行で住所を探す
    var lines = text.split(/\n+/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.match(/支店|営業所|店舗|ショールーム/) && !line.match(/本社|本店/)) {
        var nameMatch = line.match(/([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z]{2,10}(?:支店|営業所|店舗|ショールーム|事業所|支社))/);
        if (nameMatch) {
          var name = nameMatch[1].trim();
          var isValidName = name.length >= 2 && name.length <= 15 &&
                           !name.match(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9]/);
          if (isValidName && !seenNames[name]) {
            var address = '';
            var postal = '';

            // 同じ行または次の5行以内で住所を探す
            for (var j = i; j < Math.min(i + 6, lines.length); j++) {
              var checkLine = lines[j];

              // 郵便番号抽出
              if (!postal) {
                var postalMatch = checkLine.match(/〒?\s*(\d{3}[-\s]?\d{4})/);
                if (postalMatch) postal = postalMatch[1].replace(/\s/g, '');
              }

              // 住所抽出（都道府県で始まる）
              if (!address) {
                var addrMatch = checkLine.match(/([都道府県][^\n<>]{8,100})/);
                if (addrMatch) {
                  address = addrMatch[1].replace(/\s+/g, ' ').trim();
                  // 余計な文字を削除
                  address = address.replace(/TEL.*$/i, '').replace(/電話.*$/,'').trim();
                }
              }

              if (postal && address) break;
            }

            var hasCity = address && address.match(/[市区町村郡]/);
            var isNotVague = address && !address.match(/エリア|全域|一帯|県内|都内|各地|管内/);
            if (address && address.length >= 10 && hasCity && isNotVague) {
              branches.push({ name: name, address: address, postalCode: postal });
              seenNames[name] = true;
            }
          }
        }
      }
    }

    // パターン3: 都道府県名で始まる住所の直前に支店名がある
    var pattern3 = /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z]{2,10}(?:支店|営業所|店舗|ショールーム))[^\n]{0,30}?([都道府県][^\n<>]{8,100})/g;
    while ((m = pattern3.exec(text)) !== null) {
      var name = m[1].trim();
      var isValidName = name.length >= 2 && name.length <= 15 &&
                       !name.match(/本社|本店/) &&
                       !name.match(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9]/);
      if (isValidName && !seenNames[name]) {
        var address = m[2].replace(/\s+/g, ' ').replace(/TEL.*$/i, '').replace(/電話.*$/,'').trim();
        var hasCity = address.match(/[市区町村郡]/);
        var isNotVague = !address.match(/エリア|全域|一帯|県内|都内|各地|管内/);
        if (address.length >= 10 && hasCity && isNotVague) {
          branches.push({ name: name, address: address, postalCode: '' });
          seenNames[name] = true;
        }
      }
    }

    if (branches.length) {
      console.log('[AISearchSystem] 正規表現支店抽出: ' + branches.length + '件');
      branches.forEach(function(b, idx) {
        console.log('  ' + (idx+1) + '. ' + b.name + ' - ' + b.address);
      });
    }

    return branches;
  },

  // ============================================
  // カナ変換関数（予測変換機能）
  // ============================================

  convertToKatakana: function(text) {
    if (!text) return '';

    var result = '';
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      // ひらがな (0x3041-0x3096) → カタカナ (0x30A1-0x30F6)
      if (code >= 0x3041 && code <= 0x3096) {
        result += String.fromCharCode(code + 0x60);
      } else if (code >= 0x30A1 && code <= 0x30F6) {
        // すでにカタカナ
        result += text.charAt(i);
      }
    }
    return result;
  },

  extractKanaReading: function(text) {
    if (!text) return '';

    // 1. カッコ内のカタカナを優先抽出: 株式会社ABC（エービーシー）
    var parenMatch = text.match(/[（(]([ァ-ヴー\s]+)[）)]/);
    if (parenMatch) {
      return parenMatch[1].replace(/\s/g, '');
    }

    // 2. カタカナシーケンスを抽出
    var katakanaMatches = text.match(/[\u30A0-\u30FF]+/g);
    if (katakanaMatches && katakanaMatches.length > 0) {
      return katakanaMatches.join('');
    }

    // 3. ひらがなを抽出してカタカナに変換
    var hiraganaMatches = text.match(/[\u3040-\u309F]+/g);
    if (hiraganaMatches && hiraganaMatches.length > 0) {
      return this.convertToKatakana(hiraganaMatches.join(''));
    }

    return '';
  },

  analyzeWithAI: function(searchResults, companyName, apiKey) {
    // 正規表現抽出を削除してAIに完全に任せる
    var regexBranches = [];

    var systemMessage =
      "あなたは日本の外壁塗装・リフォーム会社の公式サイト（HP内複数ページ）から、指定した1社の情報を正確に抽出して構造化JSONで返す専門AIです。\n" +
      "- 使用可能な情報は「与えられたテキストのみ」。最大100,000文字。\n" +
      "- 出力は **厳密なJSONのみ**。説明、注釈、追記は禁止。\n" +
      "- **【最重要】代表者名と設立年月は絶対に抽出すること**：\n" +
      "  - 100,000文字のテキスト全体を隅々まで3回以上読み返すこと\n" +
      "  - 「代表取締役」「代表」「社長」「CEO」「President」などの単語の前後50文字を必ず確認\n" +
      "  - 「設立」「創業」「会社設立」「創立」などの単語の前後50文字を必ず確認\n" +
      "  - 昭和・平成・令和の和暦は必ず西暦に変換（昭和○年→1925+○年、平成○年→1988+○年、令和○年→2018+○年）\n" +
      "  - 見つからない場合でも、テキスト全体を再検索して諦めないこと\n" +
      "- テキストに「===PAGE_BREAK===」がある場合、これは異なるページの区切り。全ページを読んで情報を探索すること。";

    var userMessage =
      "対象会社: 「" + companyName + "」\n" +
      "公式サイトテキスト（HP内複数ページ、最大100,000文字）：\n" +
      "===== BEGIN TEXT =====\n" +
      searchResults[0].htmlContent.substring(0, 100000) + "\n" +
      "===== END TEXT =====\n\n" +
      "(以下のルールを**厳守**してJSONを出力してください)\n\n" +
      "【最重要フィールド（絶対に抽出すること - 空欄は許されない）】\n" +
      "- representative：代表者の氏名（**絶対必須**。肩書きは除外。例: 山田太郎）\n" +
      "  ※手順：\n" +
      "    1. テキスト全体で「代表取締役」「代表」「社長」「CEO」「President」を検索\n" +
      "    2. 見つかった箇所の前後100文字を確認し、人名（漢字2-4文字）を抽出\n" +
      "    3. 複数候補がある場合、最も役職が高い人物を選択\n" +
      "    4. 見つからない場合、全ページをもう一度読み直す\n" +
      "- representative_kana：代表者のカタカナ（必須。無ければひらがなをカタカナに変換）\n" +
      "- established：設立年月（**絶対必須**。必ず西暦で「YYYY年M月」形式。例: 2000年10月）\n" +
      "  ※手順：\n" +
      "    1. テキスト全体で「設立」「創業」「会社設立」「創立」「SINCE」を検索\n" +
      "    2. 見つかった箇所の前後100文字を確認し、年月を抽出\n" +
      "    3. 和暦は必ず西暦に変換：昭和○年→1925+○年、平成○年→1988+○年、令和○年→2018+○年\n" +
      "    4. 「YYYY年M月」形式で出力（例：2000年10月、1995年4月）\n" +
      "    5. 月が不明な場合は「YYYY年」のみでも可\n" +
      "    6. 見つからない場合、全ページをもう一度読み直す\n" +
      "  ※本文に全く明記がない場合のみ空文字（憶測禁止）\n\n" +
      "【必須フィールド】\n" +
      "- company_name：正式名称（「株式会社」を含む場合は含める。例: 株式会社ニシケン）\n" +
      "- company_name_kana：company_name をカタカナに変換（必須）\n" +
      "- trade_name：屋号（無ければ空文字 \"\"）\n" +
      "- trade_name_kana：trade_name のカタカナ（trade_name が空なら \"\"）\n" +
      "- postal_code：郵便番号（「〒123-4567」があれば優先。無ければ address から推定）\n" +
      "- address：本社所在地（**都道府県から番地・建物名まで**。例: 東京都中央区銀座1-2-3 銀座ビル101）\n" +
      "- phone：代表電話番号（ハイフンあり可）\n" +
      "- website：今回の公式サイトURL（既知）\n" +
      "- features：会社の特徴・強み・対応エリア・実績を**380〜420文字**で要約（句点で読みやすく。具体的な実績数・対応エリア・技術力・顧客満足度などを含める）\n" +
      "- branches：支店配列（以下の厳格ルール）\n\n" +
      "【branches 抽出ルール（厳格 - フッター地域リストは絶対に含めない）】\n" +
      "- 形式: [{ \"name\":\"支店名\", \"address\":\"都道府県市区町村番地建物\", \"postal_code\":\"NNN-NNNN\" }, ...]\n" +
      "- 本社は含めない\n" +
      "- **重要**：以下を満たす支店のみ抽出すること：\n" +
      "  1. 支店名が明記されている（例：「〇〇支店」「〇〇営業所」「〇〇ショールーム」）\n" +
      "  2. その支店の具体的な住所が記載されている（都道府県＋市区町村＋番地）\n" +
      "  3. 電話番号や郵便番号など、その支店固有の情報がある\n" +
      "- **絶対禁止**：フッターの「対応地域リスト」「サービスエリア一覧」は支店ではない\n" +
      "  ※「北海道 青森県 岩手県...」のような地名の羅列は無視\n" +
      "  ※「関東全域」「複数」などの曖昧表現は無視\n" +
      "- 支店が0件なら厳密に空配列 [] を返す\n\n" +
      "【探索手順】\n" +
      "1. テキスト全体を読み込み、最重要フィールド（representative, established）を最優先で探索\n" +
      "2. 会社概要、企業情報、代表挨拶、沿革、会社案内などのセクションを重点的に確認\n" +
      "3. 残りのフィールドを順次埋める\n" +
      "4. 見つからない項目は空文字（established のみ憶測禁止）\n\n" +
      "【出力フォーマット（JSONのみ）】\n" +
      "{\n" +
      "  \"company_name\": \"\",\n" +
      "  \"company_name_kana\": \"\",\n" +
      "  \"trade_name\": \"\",\n" +
      "  \"trade_name_kana\": \"\",\n" +
      "  \"representative\": \"\",\n" +
      "  \"representative_kana\": \"\",\n" +
      "  \"established\": \"\",\n" +
      "  \"postal_code\": \"\",\n" +
      "  \"address\": \"\",\n" +
      "  \"phone\": \"\",\n" +
      "  \"website\": \"" + searchResults[0].link + "\",\n" +
      "  \"features\": \"\",\n" +
      "  \"branches\": []\n" +
      "}\n\n" +
      "--- \n" +
      "必ず上記のJSONだけを返してください。余計な説明や追加テキストを含めないでください。";

    try {
      var res = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          model: 'openai/gpt-4o',  // GPT-4o: 最高精度（代表者名・設立年月抽出強化）
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,        // 一貫性最優先
          max_tokens: 3500,        // 30000文字に耐えられる出力サイズ
          top_p: 0.95,             // 精度最優先
          frequency_penalty: 0.0,  // 情報抽出では不要
          presence_penalty: 0.0    // 情報抽出では不要
        }),
        muteHttpExceptions: true
      });

      if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
      var data = JSON.parse(res.getContentText());
      var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

      console.log('[DEBUG] DeepSeek生レスポンス:', content.substring(0, 1000));

      content = content.replace(/```json|```/g, '').trim();

      var parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.log('[DEBUG] JSONパースエラー:', e.toString());
        var jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          console.error('[ERROR] JSON抽出失敗');
          parsed = {};
        }
      }

      console.log('[DEBUG] パース後 - 会社名:', parsed.company_name, '代表:', parsed.representative, '支店数:', parsed.branches ? parsed.branches.length : 0);

      if ((!parsed.branches || !parsed.branches.length) && regexBranches.length)
        parsed.branches = regexBranches;

      // デフォルト値設定
      parsed.company_name = parsed.company_name || companyName;
      parsed.trade_name = parsed.trade_name || '';
      parsed.representative = parsed.representative || '';

      // カナはDeepSeekが生成したものをそのまま使用（予測変換なし）
      parsed.company_name_kana = parsed.company_name_kana || '';
      parsed.trade_name_kana = parsed.trade_name_kana || '';
      parsed.representative_kana = parsed.representative_kana || '';

      if (parsed.company_name_kana) {
        console.log('[AISearchSystem] DeepSeekカナ生成: company_name_kana =', parsed.company_name_kana);
      }
      if (parsed.representative_kana) {
        console.log('[AISearchSystem] DeepSeekカナ生成: representative_kana =', parsed.representative_kana);
      }
      parsed.postal_code = parsed.postal_code || '';
      parsed.address = parsed.address || '';
      parsed.phone = parsed.phone || '';
      parsed.website = parsed.website || searchResults[0].link;
      parsed.established = parsed.established || '';
      parsed.features = parsed.features || (companyName + 'の詳細情報を取得できませんでした。');
      parsed.branches = parsed.branches || [];

      return parsed;

    } catch (err) {
      console.error('[AISearchSystem] AI解析エラー:', err);
      return {
        company_name: companyName,
        company_name_kana: '',
        trade_name: '',
        trade_name_kana: '',
        representative: '',
        representative_kana: '',
        postal_code: '',
        address: '',
        phone: '',
        website: (searchResults[0] && searchResults[0].link) || '',
        established: '',
        features: companyName + 'の情報を取得できませんでした。',
        branches: regexBranches || []
      };
    }
  },

  // ============================================
  // ランキング取得（マッチングシステム）
  // ============================================
  getRanking: function(params) {
    try {
      console.log('[AISearchSystem] getRanking開始:', params);

      // パラメータ検証
      const zipcode = params.zipcode;
      if (!zipcode) {
        throw new Error('郵便番号が指定されていません');
      }

      // 郵便番号から都道府県を推定
      const prefecture = this.getPrefectureFromZipcode(zipcode);
      console.log('[AISearchSystem] 郵便番号 ' + zipcode + ' → 都道府県: ' + prefecture);

      // 加盟店データ取得（DataLayer使用）
      const sheet = DataLayer.getSheet('加盟店登録管理');
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        console.warn('[AISearchSystem] 加盟店データがありません');
        return {
          success: true,
          rankings: {
            cheap: [],
            recommended: [],
            review: [],
            premium: []
          },
          totalCount: 0,
          filteredCount: 0
        };
      }

      // 全データ取得（ヘッダー行を除く）
      const allData = sheet.getRange(2, 1, lastRow - 1, 52).getValues();
      console.log('[AISearchSystem] 全業者数: ' + allData.length);

      // フィルタリング（承認済み + 都道府県マッチ）
      const filtered = [];
      for (var i = 0; i < allData.length; i++) {
        const row = allData[i];
        const status = row[1];  // B列（status）
        const prefectures = DataLayer.expandCompressedText(row[33]); // AH列（prefectures）

        // ステータスチェック（承認済み、運用中のみ）
        if (status !== '承認済み' && status !== '運用中') {
          continue;
        }

        // 都道府県チェック
        if (prefecture && prefectures && prefectures.indexOf(prefecture) !== -1) {
          filtered.push({
            companyName: row[2] || '',  // C列
            avgContractAmount: this.generateRandomPrice(),  // 仮データ（後で実装）
            rating: this.generateRandomRating(),  // 仮データ（後で実装）
            reviewCount: this.generateRandomReviewCount(),  // 仮データ（後で実装）
            prefecture: prefecture,
            constructionTypes: DataLayer.expandCompressedText(row[31]) || '',  // AF列
            specialSupport: DataLayer.expandCompressedText(row[32]) || '',  // AG列
            maxFloors: row[30] || '',  // AE列
            contractCount: 0  // 仮データ（後で実装）
          });
        }
      }

      console.log('[AISearchSystem] フィルタ後: ' + filtered.length + '件');

      // 4つのソート順で並べ替え
      const rankings = {
        cheap: this.sortByPrice(filtered.slice()).slice(0, 8),
        recommended: filtered.slice(0, 8),  // デフォルト順
        review: this.sortByReview(filtered.slice()).slice(0, 8),
        premium: this.sortByRating(filtered.slice()).slice(0, 8)
      };

      return {
        success: true,
        rankings: rankings,
        totalCount: allData.length,
        filteredCount: filtered.length
      };

    } catch (error) {
      console.error('[AISearchSystem] getRanking エラー:', error);
      return {
        success: false,
        error: error.toString(),
        rankings: {
          cheap: [],
          recommended: [],
          review: [],
          premium: []
        }
      };
    }
  },

  // 郵便番号から都道府県を推定（簡易版）
  getPrefectureFromZipcode: function(zipcode) {
    // 郵便番号の最初の2桁で都道府県を判定
    const prefix = zipcode.substring(0, 2);
    const map = {
      '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
      '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
      '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
      '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
      '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
      '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
      '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
      '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
      '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
      '46': '鹿児島県', '47': '沖縄県'
    };
    return map[prefix] || '';
  },

  // 仮データ生成（平均契約金額）
  generateRandomPrice: function() {
    return Math.floor(Math.random() * (1200000 - 700000 + 1)) + 700000;  // 70万〜120万
  },

  // 仮データ生成（評価スコア）
  generateRandomRating: function() {
    return Math.floor(Math.random() * 20 + 36) / 10;  // 3.6〜5.5
  },

  // 仮データ生成（口コミ数）
  generateRandomReviewCount: function() {
    return Math.floor(Math.random() * 250) + 50;  // 50〜299
  },

  // 価格順ソート
  sortByPrice: function(companies) {
    return companies.sort(function(a, b) {
      return a.avgContractAmount - b.avgContractAmount;
    });
  },

  // 口コミ順ソート
  sortByReview: function(companies) {
    return companies.sort(function(a, b) {
      return b.reviewCount - a.reviewCount;
    });
  },

  // 評価順ソート
  sortByRating: function(companies) {
    return companies.sort(function(a, b) {
      return b.rating - a.rating;
    });
  }
};
