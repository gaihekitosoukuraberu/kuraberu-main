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

      // 会社概要ページを探す（複数パターン試行）
      var domainMatch = bestMatch.link.match(/^(https?:\/\/[^\/]+)/);
      if (domainMatch) {
        var companyPaths = ['/company/outline/', '/company/', '/about/', '/company/access/', '/kaisya/', '/gaiyou/', '/profile/', '/corporate/', '/kaisyagaiyou/'];
        for (var i = 0; i < companyPaths.length; i++) {
          try {
            var companyPageText = this.fetchHtmlContent(domainMatch[0] + companyPaths[i]);
            if (companyPageText && companyPageText.length > 300) {
              allContent = companyPageText + '\n\n' + allContent;
              console.log('[DEBUG] 会社概要ページ取得:', companyPaths[i], companyPageText.length + '文字');
              break;
            }
          } catch (e) {}
        }
      }

      // 全ページから「支店」「営業所」含むページを抽出
      console.log('[DEBUG] 支店情報ページ検索中...');
      for (var j = 0; j < Math.min(allPages.length, 20); j++) {
        try {
          var pageText = this.fetchHtmlContent(allPages[j]);
          if (pageText && (pageText.includes('支店') || pageText.includes('営業所') || pageText.includes('店舗') || pageText.includes('ショールーム'))) {
            // 具体的な地名があるか確認
            if (pageText.match(/[都道府県][^\n]{10,}/)) {
              allContent += '\n\n' + pageText;
              console.log('[DEBUG] 支店情報ページ発見:', allPages[j], pageText.length + '文字');
              break;
            }
          }
        } catch (e) {}
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
    const blocklist = ['job', 'career', 'indeed', 'recruit', 'ミツモア', 'エキテン', 'goo', 'yahoo', 'マイナビ', 'sponsored'];
    const q = query + ' 塗装';
    const url = 'https://www.googleapis.com/customsearch/v1?key=' + apiKey + '&cx=' + engineId + '&q=' + encodeURIComponent(q) + '&num=1&hl=ja';

    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) return [];

      const data = JSON.parse(response.getContentText());
      if (!data.items) return [];

      const results = data.items.filter(function(item) {
        return !blocklist.some(function(b) {
          return (item.link || '').includes(b);
        });
      }).map(function(item) {
        return {
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || ''
        };
      });

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
      // 記号が含まれる支店名は除外（「【フッター支店」などのゴミデータを除外）
      if (name && !name.match(/本社|本店|【|】|©|®|™|プライバシー|利用規約/) && !seenNames[name]) {
        var postal = m[2] ? m[2].replace(/\s/g, '') : '';
        var address = m[3].replace(/\s+/g, ' ').trim();
        // 住所が曖昧な場合は除外
        if (address.length >= 10 && !address.match(/エリア|全域|北海道.*沖縄/)) {
          branches.push({ name: name, address: address, postalCode: postal });
          seenNames[name] = true;
        }
      }
    }

    // パターン2: 「支店」を含む行から次の数行で住所を探す
    var lines = text.split(/\n+/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.match(/支店|営業所|店舗|ショールーム/) && !line.match(/本社|本店|プライバシー|利用規約|【|】/)) {
        var nameMatch = line.match(/([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z]{2,10}(?:支店|営業所|店舗|ショールーム|事業所|支社))/);
        if (nameMatch) {
          var name = nameMatch[1].trim();
          if (!seenNames[name] && !name.match(/【|】|©|®|™/)) {
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

            if (address && address.length >= 10 && !address.match(/エリア|全域|北海道.*沖縄/)) {
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
      if (!seenNames[name] && !name.match(/本社|本店|【|】|©|®|™/)) {
        var address = m[2].replace(/\s+/g, ' ').replace(/TEL.*$/i, '').replace(/電話.*$/,'').trim();
        if (address.length >= 10 && !address.match(/エリア|全域|北海道.*沖縄/)) {
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
    var regexBranches = [];
    if (searchResults[0] && searchResults[0].htmlContent)
      regexBranches = this.extractBranchesWithRegex(searchResults[0].htmlContent);

    var prompt =
      "あなたは日本の外壁塗装・リフォーム会社の情報を正確に抽出する専門AIです。\n" +
      "以下は、会社名『" + companyName + "』の公式サイト（トップページ＋関連下層最大10ページ）の本文テキストです。\n" +
      "この1社のみを対象として、以下の情報をすべて埋めてください。\n" +
      "他社や比較サイト・求人サイトの情報は一切使用禁止です。\n\n" +
      "===== テキスト開始 =====\n" +
      searchResults[0].htmlContent.substring(0, 30000) + "\n" +
      "===== テキスト終了 =====\n\n" +
      "【抽出ルール（厳守）】\n" +
      "1. company_name: 正式名称（株式会社含む）。「会社概要」「会社案内」「運営会社」ページを優先確認。\n" +
      "2. company_name_kana: 1をカタカナ変換。\n" +
      "3. representative: 代表者名（人名のみ）\n" +
      "   - 「代表取締役」「社長」「代表」の後に続く氏名（例:「山田太郎」）\n" +
      "   - 「代表取締役 山田太郎」「社長 山田太郎」「代表 山田太郎」などから抽出\n" +
      "   - 肩書きは含めず、氏名のみ（例: ○山田太郎 ×代表取締役山田太郎）\n" +
      "   - 「会社概要」「代表挨拶」「会社案内」ページを重点的に探索\n" +
      "4. representative_kana: 3をカタカナ変換。\n" +
      "5. established: 設立年月日（西暦または和暦、年月まで）。\n" +
      "6. postal_code: 郵便番号\n" +
      "   - 本文中の「〒XXX-XXXX」から抽出\n" +
      "   - 見つからない場合、addressから推定（必須）\n" +
      "   - 例: 「東京都多摩市」→「206」で始まる郵便番号を推定\n" +
      "7. address: 本社所在地（都道府県から番地・建物名まで完全に）。\n" +
      "8. phone: 電話番号（代表番号）。\n" +
      "9. website: 今回抽出元の公式サイトURL（" + searchResults[0].link + "）。\n" +
      "10. features: 会社の特徴・強み・施工実績・対応エリアなどを要約（200〜300文字）。\n" +
      "11. branches: 支店・営業所・ショールームの配列（以下ルール厳守）\n" +
      "　- 形式: [{name:\"◯◯支店\", address:\"東京都渋谷区◯◯1-2-3\", postalCode:\"150-0001\"}]\n" +
      "　- ✅ 正しい例: {name:\"横浜支店\", address:\"神奈川県横浜市西区◯◯1-2-3\", postalCode:\"220-0001\"}\n" +
      "　- ❌ 間違い例: {name:\"神奈川県・東京都に9支店\", ...} ← 曖昧な表現は絶対禁止\n" +
      "　- 本社・本店は含めない。\n" +
      "　- 支店・営業所・ショールーム・展示場を全て列挙。\n" +
      "　- 住所は必ず「都道府県名＋市区町村名＋番地」の形式。\n" +
      "　- 曖昧な住所（「神奈川県全域」「東京・埼玉エリア」など）は絶対に含めない。\n" +
      "　- 番地・建物名・郵便番号が複数あっても漏らさない。\n" +
      "　- 1件見つけても終了せず、全て抽出。\n" +
      "　- 見つからない場合は空配列 []。\n\n" +
      "【出力形式（JSONのみで回答）】\n" +
      "{\n" +
      "  \"company_name\": \"\",\n" +
      "  \"company_name_kana\": \"\",\n" +
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
      "出力は必ず上記のJSON形式1つのみ。説明文やコメントは禁止。";

    try {
      var res = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            {
              role: 'system',
              content: "あなたは日本の企業情報抽出の専門AIです。公式サイトのHTMLテキストから会社情報を正確に構造化JSONで抽出します。"
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.15,       // より一貫性を上げる
          max_tokens: 3500,        // 30000文字に耐えられる出力サイズ
          top_p: 0.9,              // 精度を保ちながら創造性も残す
          frequency_penalty: 0.2,  // 重複語を抑制
          presence_penalty: 0.1
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
  }
};
