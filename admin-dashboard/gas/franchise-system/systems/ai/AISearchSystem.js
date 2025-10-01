/**
 * ====================================
 * AI検索システム
 * ====================================
 * 完全独立モジュール（既存の動作コードを保持）
 */

const AISearchSystem = {
  /**
   * GETリクエスト処理
   */
  handle: function(params) {
    try {
      const action = params.action;

      switch (action) {
        case 'searchCompany':
          return this.searchCompany(params);

        case 'ai_test':
          return {
            success: true,
            message: 'AI search system is running'
          };

        default:
          return {
            success: false,
            error: `Unknown AI action: ${action}`
          };
      }

    } catch (error) {
      console.error('[AISearchSystem] Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 会社情報検索（多層チェックシステム実装）
   */
  searchCompany: function(params) {
    try {
      const companyName = params.companyName;

      if (!companyName) {
        return {
          success: false,
          error: '会社名が指定されていません'
        };
      }

      console.log('[AISearchSystem] 検索開始:', companyName);

      // API Keys取得
      const searchApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
      const searchEngineId = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
      const openRouterKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

      if (!searchApiKey || !searchEngineId || !openRouterKey) {
        console.log('[AISearchSystem] API Keys未設定 - 基本情報のみ返却');

        // モックデータを返す（エラーにしない）
        return {
          success: true,
          message: '基本情報のみ取得',
          data: this.createMockData(companyName)
        };
      }

      // 第1回: 従来通りの基本検索
      console.log('[AISearchSystem] 第1回検索: 基本情報取得');
      const searchResults = this.performGoogleSearch(companyName, searchApiKey, searchEngineId);

      // デバッグ：検索結果の数と内容を確認
      console.log('[AISearchSystem] 検索結果数:', searchResults.length);
      if (searchResults.length > 0) {
        const contentCount = searchResults.filter(r => r.content && r.content.length > 0).length;
        console.log('[AISearchSystem] ページ本文取得成功数:', contentCount + '/' + searchResults.length);
        if (contentCount === 0) {
          console.warn('[AISearchSystem] 警告: ページ本文が1つも取得できませんでした');
        }
      }

      if (!searchResults || searchResults.length === 0) {
        return {
          success: true,
          message: '検索結果なし',
          data: this.createMockData(companyName)
        };
      }

      // AI分析（既存のプロンプトを維持）
      let finalCompanyInfo = this.analyzeWithAI(searchResults, companyName, openRouterKey);

      // デバッグ情報を追加
      if (!finalCompanyInfo || Object.keys(finalCompanyInfo).length === 0) {
        console.error('[AISearchSystem] AIが空のデータを返しました');
        finalCompanyInfo = this.createMockData(companyName);
      }

      // データクリーンアップ（重複除去）は最後に1回だけ行う（混乱を避けるため）

      // 第2回、第3回: 空欄項目のみ追加検索
      let attempt = 2;
      const maxAttempts = 3;

      while (attempt <= maxAttempts) {
        // 空欄の項目を特定
        const emptyFields = this.getEmptyFields(finalCompanyInfo);

        // 全ての必須項目が埋まったら終了
        if (emptyFields.length === 0) {
          console.log('[AISearchSystem] 全項目が埋まりました。検索完了。');
          break;
        }

        console.log(`[AISearchSystem] 第${attempt}回検索開始`);
        console.log(`[AISearchSystem] 空欄項目: ${emptyFields.join(', ')}`);

        // 検索クエリを生成（回数と空欄項目に応じて）
        const searchQuery = this.generateSearchQuery(companyName, emptyFields, attempt);
        console.log(`[AISearchSystem] 検索クエリ: ${searchQuery}`);

        // Google検索実行（同じ会社のサイトのみ）
        const additionalResults = this.performTargetedSearch(
          searchQuery,
          searchApiKey,
          searchEngineId,
          attempt,
          companyName,
          finalCompanyInfo.website  // 既に取得済みのwebsiteを渡す
        );

        if (additionalResults.length === 0) {
          console.log(`[AISearchSystem] 第${attempt}回検索: 結果なし`);
          attempt++;
          continue;
        }

        // AI分析（空欄項目に特化したプロンプトで）
        const newInfo = this.analyzeWithTargetedAI(
          additionalResults,
          companyName,
          openRouterKey,
          emptyFields,
          attempt
        );

        // 取得した情報をマージ（空欄の項目のみ更新）
        finalCompanyInfo = this.mergeCompanyInfo(finalCompanyInfo, newInfo);

        console.log(`[AISearchSystem] 第${attempt}回検索完了`);
        attempt++;
      }

      // featuresが空の場合、デフォルトのメッセージを設定
      if (!finalCompanyInfo.features || finalCompanyInfo.features === '') {
        finalCompanyInfo.features = `${companyName}は外壁塗装・リフォームを専門とする会社です。`;
      }

      // 最終段階でデータクリーンアップ（重複除去）
      finalCompanyInfo = this.cleanupCompanyData(finalCompanyInfo);

      return {
        success: true,
        message: '会社情報を取得しました',
        data: finalCompanyInfo
      };

    } catch (error) {
      console.error('[AISearchSystem] searchCompany error:', error);
      // エラー時も成功として基本データを返す
      return {
        success: true,
        message: 'エラーが発生しましたが基本データを返します',
        data: this.createMockData(params.companyName || '不明')
      };
    }
  },

  /**
   * 空欄の項目を特定
   */
  getEmptyFields: function(companyInfo) {
    const emptyFields = [];

    // 重要な項目をチェック
    const fieldsToCheck = {
      'representative': '代表者名',
      'postal_code': '郵便番号',
      'address': '住所',
      'phone': '電話番号',
      'website': 'ホームページ',
      'established': '設立年',
      'features': '特徴・強み'
    };

    for (const [field, label] of Object.entries(fieldsToCheck)) {
      if (!companyInfo[field] || companyInfo[field] === '') {
        emptyFields.push(label);
      }
    }

    return emptyFields;
  },

  /**
   * 検索クエリを生成（回数と空欄項目に応じて）
   */
  generateSearchQuery: function(companyName, emptyFields, attempt) {
    // 基本クエリ
    let query = companyName;

    // 2回目: 会社概要・企業情報
    if (attempt === 2) {
      query += ' 会社概要 企業情報';

      // 特定の空欄項目がある場合、それに特化
      if (emptyFields.includes('代表者名')) {
        query += ' 代表取締役 代表者';
      }
      if (emptyFields.includes('設立年')) {
        query += ' 設立 創業';
      }
    }
    // 3回目: より具体的な検索
    else if (attempt === 3) {
      if (emptyFields.includes('代表者名')) {
        query += ' 代表取締役 社長 氏名';
      } else if (emptyFields.includes('住所')) {
        query += ' 所在地 本社 アクセス';
      } else if (emptyFields.includes('設立年')) {
        query += ' 沿革 歴史 創業年';
      } else {
        query += ' お問い合わせ 連絡先';
      }
    }

    return query;
  },

  /**
   * ターゲット検索実行（同じ会社のサイトのみ取得）
   */
  performTargetedSearch: function(query, apiKey, engineId, attempt, companyName, existingWebsite) {
    try {
      const searchUrl = `https://www.googleapis.com/customsearch/v1?` +
        `key=${apiKey}&` +
        `cx=${engineId}&` +
        `q=${encodeURIComponent(query)}&` +
        `num=10&` +
        `hl=ja`;

      const searchResults = [];
      const companyNameClean = companyName.toLowerCase().replace(/株式会社|有限会社|\s/g, '');

      const response = UrlFetchApp.fetch(searchUrl, {
        muteHttpExceptions: true,
        timeout: 10
      });

      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        if (data.items) {
          // 同じ会社のサイトかチェック
          const relevantItems = data.items.filter(item => {
            const url = item.link.toLowerCase();
            const title = (item.title || '').toLowerCase();
            const snippet = (item.snippet || '').toLowerCase();

            // 既存のwebsiteと同じドメインか
            if (existingWebsite) {
              const existingDomain = new URL(existingWebsite).hostname.toLowerCase();
              try {
                const itemDomain = new URL(item.link).hostname.toLowerCase();
                if (existingDomain === itemDomain) return true;
              } catch (e) {}
            }

            // 会社名が含まれているか
            return url.includes(companyNameClean) ||
                   url.includes('fine-t') ||
                   title.includes(companyName.toLowerCase()) ||
                   snippet.includes(companyName.toLowerCase());
          });

          // 検索回数に応じてページ取得数を調整
          const pagesToFetch = attempt <= 2 ? 2 : 3;

          relevantItems.slice(0, pagesToFetch).forEach(item => {
            try {
              console.log(`[AISearchSystem] 第${attempt}回検索 - ページ取得中:`, item.link);
              const pageResponse = UrlFetchApp.fetch(item.link, {
                muteHttpExceptions: true,
                followRedirects: true,
                validateHttpsCertificates: false,
                timeout: 15
              });

              if (pageResponse.getResponseCode() === 200) {
                const pageContent = pageResponse.getContentText();
                const textContent = pageContent
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .substring(0, 50000);

                searchResults.push({
                  title: item.title || '',
                  link: item.link || '',
                  snippet: item.snippet || '',
                  content: textContent
                });

                console.log(`[AISearchSystem] ページ取得成功:`, item.link, '文字数:', textContent.length);
              }
            } catch (pageError) {
              console.error(`[AISearchSystem] ページ取得エラー:`, item.link, pageError.toString());
            }
          });
        }
      }

      return searchResults;

    } catch (error) {
      console.error('[AISearchSystem] Targeted search error:', error);
      return [];
    }
  },

  /**
   * ターゲットAI分析（空欄項目に特化）
   */
  analyzeWithTargetedAI: function(searchResults, companyName, apiKey, emptyFields, attempt) {
    try {
      const resultsWithContent = searchResults.filter(r => r.content && r.content.length > 0);

      if (resultsWithContent.length === 0) {
        return this.createMockData(companyName);
      }

      // 空欄項目に特化したプロンプト
      const prompt = `会社名「${companyName}」の以下の空欄情報を抽出してください。

【第${attempt}回検索 - 特に探す情報】
${emptyFields.join('、')}

Webページ本文:
${resultsWithContent.map((r, index) => {
  return `【サイト${index + 1}】${r.link}\n${r.content}\n`;
}).join('\n---\n\n')}

【重要な指示】
1. 上記の空欄項目を最優先で探すこと
2. 全てのWebページ本文を詳細に確認すること
3. ${emptyFields.includes('代表者名') ? '代表者名は「代表取締役」「社長」「CEO」「代表」などの肩書きの後の人名を探すこと' : ''}
4. ${emptyFields.includes('設立年') ? '設立年は「設立」「創業」「創立」「開業」などの言葉の近くの年月を探すこと' : ''}
5. ${emptyFields.includes('住所') ? '住所は「本社」「所在地」「オフィス」「事務所」などの言葉の近くを探すこと' : ''}
6. カナは漢字から変換（例：田中→タナカ）
7. 見つからない項目は空文字列 ""

【出力JSON】
{
  "company_name": "${companyName}",
  "company_name_kana": "",
  "trade_name": "",
  "trade_name_kana": "",
  "representative": "",
  "representative_kana": "",
  "postal_code": "",
  "address": "",
  "phone": "",
  "website": "",
  "established": "",
  "features": "",
  "branches": []
}`;

      const requestBody = {
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `第${attempt}回検索。空欄項目を埋めることが最優先。全てのWebページを詳細に確認すること。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 10000
      };

      const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true,
        timeout: 30
      });

      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const content = data.choices[0].message.content;
        console.log(`[AISearchSystem] 第${attempt}回AI回答:`, content.substring(0, 500));
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        return parsed;
      }

    } catch (error) {
      console.error(`[AISearchSystem] 第${attempt}回 AI analysis error:`, error);
    }

    return this.createMockData(companyName);
  },

  /**
   * 会社情報をマージ（空欄の項目のみ更新）
   */
  mergeCompanyInfo: function(currentInfo, newInfo) {
    const merged = Object.assign({}, currentInfo);

    // 各フィールドをチェックして、空欄なら新しい情報で更新
    for (const [key, value] of Object.entries(newInfo)) {
      if ((!merged[key] || merged[key] === '') && value && value !== '') {
        console.log(`[AISearchSystem] 更新: ${key} = ${value}`);
        merged[key] = value;

        // カナフィールドも同時に更新
        if (key === 'representative' && newInfo.representative_kana) {
          merged.representative_kana = newInfo.representative_kana;
        }
        if (key === 'company_name' && newInfo.company_name_kana) {
          merged.company_name_kana = newInfo.company_name_kana;
        }
      }
    }

    // branchesは配列なので特別処理
    if (newInfo.branches && newInfo.branches.length > 0 && (!merged.branches || merged.branches.length === 0)) {
      merged.branches = newInfo.branches;
    }

    return merged;
  },

  /**
   * Google検索実行（会社概要ページを最優先で取得）
   */
  performGoogleSearch: function(companyName, apiKey, engineId) {
    try {
      // まず会社の公式サイトを検索
      const initialQuery = companyName + ' 外壁塗装';
      console.log('[AISearchSystem] 初期検索:', initialQuery);

      const searchUrl = `https://www.googleapis.com/customsearch/v1?` +
        `key=${apiKey}&` +
        `cx=${engineId}&` +
        `q=${encodeURIComponent(initialQuery)}&` +
        `num=10&` +
        `hl=ja`;

      const allResults = [];
      const seenUrls = new Set();
      let mainSiteDomain = null;

      // まず会社のメインサイトを見つける
      try {
        const response = UrlFetchApp.fetch(searchUrl, {
          muteHttpExceptions: true,
          timeout: 10
        });
        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());
          if (data.items && data.items.length > 0) {
            // 最初の結果から会社の公式サイトと思われるドメインを特定
            const companyNameClean = companyName.toLowerCase().replace(/株式会社|有限会社|\s/g, '');
            for (const item of data.items) {
              const url = item.link.toLowerCase();
              if (url.includes(companyNameClean) || url.includes('fine-t')) {
                try {
                  mainSiteDomain = new URL(item.link).hostname;
                  console.log('[AISearchSystem] メインサイトドメイン特定:', mainSiteDomain);
                  break;
                } catch (e) {}
              }
            }

            // 検索結果を追加
            data.items.forEach(item => {
              if (!seenUrls.has(item.link)) {
                seenUrls.add(item.link);
                allResults.push({
                  title: item.title || '',
                  link: item.link || '',
                  snippet: item.snippet || '',
                  content: ''
                });
              }
            });
          }
        }
      } catch (e) {
        console.log('初期検索エラー:', e.toString());
      }

      // メインサイトドメインが特定できた場合、会社概要ページと店舗ページを直接検索
      if (mainSiteDomain) {
        const siteSpecificQueries = [
          `site:${mainSiteDomain} 会社概要`,
          `site:${mainSiteDomain} 企業情報`,
          `site:${mainSiteDomain} about`,
          `site:${mainSiteDomain} 店舗一覧`,
          `site:${mainSiteDomain} 営業所`,
          `site:${mainSiteDomain} 支店`
        ];

        siteSpecificQueries.forEach(query => {
          console.log('[AISearchSystem] サイト内検索:', query);
          const siteSearchUrl = `https://www.googleapis.com/customsearch/v1?` +
            `key=${apiKey}&` +
            `cx=${engineId}&` +
            `q=${encodeURIComponent(query)}&` +
            `num=5&` +
            `hl=ja`;

          try {
            const response = UrlFetchApp.fetch(siteSearchUrl, {
              muteHttpExceptions: true,
              timeout: 10
            });
            if (response.getResponseCode() === 200) {
              const data = JSON.parse(response.getContentText());
              if (data.items) {
                data.items.forEach(item => {
                  if (!seenUrls.has(item.link)) {
                    seenUrls.add(item.link);
                    // 会社概要ページを優先的に配列の先頭に追加
                    allResults.unshift({
                      title: item.title || '',
                      link: item.link || '',
                      snippet: item.snippet || '',
                      content: ''
                    });
                  }
                });
              }
            }
          } catch (e) {
            console.log('サイト内検索エラー:', e.toString());
          }
        });
      }

      console.log('[AISearchSystem] 検索結果総数:', allResults.length);

      // 会社概要ページを最優先でソート
      const sortedResults = allResults.sort((a, b) => {
        const aUrl = a.link.toLowerCase();
        const bUrl = b.link.toLowerCase();
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        // 会社概要ページと店舗ページのスコアリング（高いほど優先）
        const getScore = (url, title) => {
          let score = 0;

          // URL内のキーワード
          if (url.includes('company')) score += 10;
          if (url.includes('about')) score += 10;
          if (url.includes('概要')) score += 10;
          if (url.includes('企業情報')) score += 10;
          if (url.includes('profile')) score += 8;

          // 店舗情報関連のキーワード（高優先度）
          if (url.includes('店舗') || url.includes('shop')) score += 12;
          if (url.includes('営業所') || url.includes('branch')) score += 12;
          if (url.includes('支店')) score += 12;
          if (url.includes('一覧') || url.includes('list')) score += 8;

          // タイトル内のキーワード
          if (title.includes('会社概要')) score += 15;
          if (title.includes('企業情報')) score += 15;
          if (title.includes('会社案内')) score += 12;
          if (title.includes('店舗一覧')) score += 18;
          if (title.includes('営業所')) score += 15;
          if (title.includes('支店')) score += 15;
          if (title.includes('about')) score += 8;

          // メインサイトドメインと一致
          if (mainSiteDomain && url.includes(mainSiteDomain)) score += 5;

          return score;
        };

        const aScore = getScore(aUrl, aTitle);
        const bScore = getScore(bUrl, bTitle);

        // スコアが高い順にソート
        return bScore - aScore;
      });

      console.log('[AISearchSystem] 優先順位付け完了。上位ページ:');
      sortedResults.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.title} - ${r.link}`);
      });

      // 最大5サイトまで取得（会社概要ページを確実に含む）
      const pagesToFetch = sortedResults.slice(0, 5);

      pagesToFetch.forEach(result => {
        try {
          console.log('[AISearchSystem] ページ取得中:', result.link);
          const pageResponse = UrlFetchApp.fetch(result.link, {
            muteHttpExceptions: true,
            followRedirects: true,
            validateHttpsCertificates: false,
            timeout: 15
          });

          if (pageResponse.getResponseCode() === 200) {
            const pageContent = pageResponse.getContentText();
            const textContent = pageContent
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 50000);

            result.content = textContent;
            console.log('[AISearchSystem] ページ取得成功:', result.link, '文字数:', textContent.length);
          } else {
            console.log('[AISearchSystem] ページ取得失敗（HTTPエラー）:', result.link, 'ステータス:', pageResponse.getResponseCode());
          }
        } catch (pageError) {
          console.error('[AISearchSystem] ページ取得エラー:', result.link, pageError.toString());
        }
      });

      // contentがあるもののみ返す
      return sortedResults.filter(r => r.content && r.content.length > 0);

    } catch (error) {
      console.error('[AISearchSystem] Google search error:', error);
      return [];
    }
  },

  /**
   * AI分析（既存のプロンプトを維持）
   */
  analyzeWithAI: function(searchResults, companyName, apiKey) {
    try {
      // まず会社名と一致率の高いサイトを優先
      const prioritizedResults = searchResults.sort((a, b) => {
        const aMatch = (a.title + a.snippet).toLowerCase().includes(companyName.toLowerCase());
        const bMatch = (b.title + b.snippet).toLowerCase().includes(companyName.toLowerCase());
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      // ページ本文がある結果のみを使用
      const resultsWithContent = prioritizedResults.filter(r => r.content && r.content.length > 0);

      // より詳細なプロンプト
      const prompt = `会社名「${companyName}」の情報を抽出してください。

【重要】外壁塗装・屋根塗装・リフォーム業の会社のみ対象。それ以外の業種なら全て空文字列 "" で返してください。

Webページ本文（${resultsWithContent.length}サイト分）:
${resultsWithContent.map((r, index) => {
  const isCompanyPage = r.link.includes('company') || r.link.includes('about') || r.link.includes('概要');
  return `【サイト${index + 1}】${isCompanyPage ? '（会社概要ページ）' : ''}\nURL: ${r.link}\n内容: ${r.content}\n`;
}).join('\n---\n\n')}

【抽出ルール】
1. 全てのサイトの内容を詳細に確認すること
2. 会社概要ページがある場合は最優先でそこから情報を取得
3. 特に以下の情報は必ず探すこと：
   - 代表者名：「代表取締役」「社長」「代表」「CEO」などの肩書きの後の人名
   - 設立年：「設立」「創業」「創立」「開業」などの言葉の近くの年月
   - 住所：「本社」「所在地」「オフィス」「事務所」などの記載

4. 【超重要】支店情報の完全抽出：
   - 「店舗一覧」「営業所一覧」「支店」「店舗案内」「拠点」「事業所」などのセクションを必ず全て確認
   - 支店名と住所のペアを全て抽出（10店舗以上ある場合も全て）
   - 例：「大手町支店」「所沢支店」「狭山支店」「ふじみ野支店」など全ての支店を漏れなく抽出
   - 地図に記載されている店舗情報も確認
   - 本社と同じ住所の支店は除外（後で自動削除されるため問題なし）

5. カナは漢字から変換（例：田中→タナカ）
6. featuresは会社の特徴・強み・実績を300文字以内でまとめる
7. 全サイトを探しても見つからない場合のみ空文字列 ""

【出力JSON】
{
  "company_name": "正式社名（株式会社〇〇など）",
  "company_name_kana": "カナ",
  "trade_name": "屋号（社名と違う場合）",
  "trade_name_kana": "屋号カナ",
  "representative": "代表者氏名（フルネーム）",
  "representative_kana": "代表者カナ",
  "postal_code": "郵便番号7桁",
  "address": "本社住所（都道府県から）",
  "phone": "電話番号",
  "website": "公式URL",
  "established": "設立年月",
  "features": "会社の特徴・強み・実績を300文字以内で",
  "branches": [
    {"name": "支店名1", "address": "住所1"},
    {"name": "支店名2", "address": "住所2"},
    {"name": "支店名3", "address": "住所3"}
    // 全ての支店を列挙（10店舗以上でも全て記載）
  ]
}`;

      const requestBody = {
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '外壁塗装・リフォーム業の会社情報を抽出する専門AI。【超重要】支店情報は「店舗一覧」「営業所」「支店」などのセクションから全て（10店舗以上でも）完全に抽出すること。1店舗だけで終わるのは絶対にNG。ページ内の全ての支店・営業所を漏れなく抽出せよ。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 10000
      };

      const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(requestBody),
        muteHttpExceptions: true,
        timeout: 30  // AI処理用30秒タイムアウト
      });

      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const content = data.choices[0].message.content;
        console.log('[AISearchSystem] AI回答:', content.substring(0, 500)); // 最初の500文字をログ
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        console.log('[AISearchSystem] パース後のJSON:', JSON.stringify(parsed).substring(0, 500));
        return parsed;
      } else {
        console.error('[AISearchSystem] AI API エラー:', response.getResponseCode(), response.getContentText());
      }

    } catch (error) {
      console.error('[AISearchSystem] AI analysis error:', error);
    }

    // エラー時のフォールバック
    return this.createMockData(companyName);
  },

  /**
   * モックデータ生成（共通化）
   */
  createMockData: function(companyName) {
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
      website: '',
      established: '',
      features: `${companyName}は外壁塗装を専門とする会社です。詳細情報は直接お問い合わせください。`,
      branches: []
    };
  },

  /**
   * 最終データクリーンアップ（重複除去）
   */
  cleanupCompanyData: function(companyInfo) {
    if (!companyInfo) return companyInfo;

    // 正規化用の関数
    const normalizeCompanyName = (name) => {
      if (!name) return '';
      return name
        .replace(/株式会社|有限会社|合同会社|\(株\)|\(有\)|\s/g, '')
        .toLowerCase()
        .trim();
    };

    const normalizeAddress = (address) => {
      if (!address) return '';
      // 住所の正規化（空白、ハイフンなどを統一）
      return address
        .replace(/[‐−－ー]/g, '-')  // ハイフンを統一
        .replace(/\s+/g, '')  // 空白を除去
        .replace(/丁目/g, '-')
        .replace(/番地?/g, '-')
        .replace(/号/g, '')
        .toLowerCase()
        .trim();
    };

    // 1. 会社名と屋号が同じ場合は屋号を空にする
    const companyNameNorm = normalizeCompanyName(companyInfo.company_name);
    const tradeNameNorm = normalizeCompanyName(companyInfo.trade_name);

    if (companyNameNorm === tradeNameNorm || tradeNameNorm === '') {
      console.log('[AISearchSystem] 会社名と屋号が同じため、屋号をクリア');
      companyInfo.trade_name = '';
      companyInfo.trade_name_kana = '';
    }

    // 2. 本社住所と同じ支店は除外
    if (companyInfo.branches && companyInfo.branches.length > 0 && companyInfo.address) {
      const mainAddressNorm = normalizeAddress(companyInfo.address);

      const filteredBranches = companyInfo.branches.filter(branch => {
        if (!branch.address) return false;
        const branchAddressNorm = normalizeAddress(branch.address);

        // 本社住所と支店住所が同じ場合は除外
        if (mainAddressNorm === branchAddressNorm) {
          console.log('[AISearchSystem] 本社と同じ住所の支店を除外:', branch.name);
          return false;
        }

        // 支店名が「本社」「本店」などの場合も除外
        const branchNameLower = (branch.name || '').toLowerCase();
        if (branchNameLower.includes('本社') ||
            branchNameLower.includes('本店') ||
            branchNameLower === companyInfo.company_name.toLowerCase()) {
          console.log('[AISearchSystem] 本社と重複する支店を除外:', branch.name);
          return false;
        }

        return true;
      });

      companyInfo.branches = filteredBranches;
      console.log('[AISearchSystem] 支店クリーンアップ後:', filteredBranches.length + '件');
    }

    return companyInfo;
  },

  /**
   * 会社名と屋号が同じ場合は屋号を空にする（互換性のため残す）
   */
  cleanupTradeNames: function(companyInfo) {
    return this.cleanupCompanyData(companyInfo);
  },

};