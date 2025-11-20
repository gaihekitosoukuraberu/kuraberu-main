/**
 * ====================================
 * 評価データ管理システム
 * ====================================
 * Google評価、ヌリカエ、リショップナビ、AI評価を統合管理
 */

const EvaluationDataManager = {

  /**
   * 評価データシート取得
   */
  getEvaluationSheet: function() {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('評価データ');

    // シートが存在しない場合は作成
    if (!sheet) {
      console.log('[EvaluationData] 評価データシート作成中...');
      sheet = ss.insertSheet('評価データ');

      // ヘッダー設定
      const headers = [
        '会社名',
        'Google評価',
        'ヌリカエ評価',
        'リショップナビ評価',
        '総合スコア',
        'コストバランス',
        '人柄・対応力',
        '技術・品質',
        'アフターサポート',
        '対応スピード',
        '顧客満足度',
        '最終更新日',
        'データソース',
        'AI評価'
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);

      console.log('[EvaluationData] 評価データシート作成完了');
    }

    return sheet;
  },

  /**
   * 会社の評価データを取得
   */
  getRatingsForCompany: function(companyName) {
    console.log('[EvaluationData] 評価データ取得:', companyName);

    try {
      const sheet = this.getEvaluationSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // 会社名で検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === companyName) {
          const ratings = {
            companyName: data[i][0],
            googleRating: data[i][1] || 0,
            nurikaeRating: data[i][2] || 0,
            reshopnaviRating: data[i][3] || 0,
            overallScore: data[i][4] || 4.2,
            costBalance: data[i][5] || 4.2,
            personality: data[i][6] || 4.3,
            technology: data[i][7] || 4.2,
            afterSupport: data[i][8] || 4.1,
            responseSpeed: data[i][9] || 4.3,
            customerSatisfaction: data[i][10] || 4.2,
            lastUpdated: data[i][11] || '',
            dataSource: data[i][12] || 'デフォルト',
            aiEvaluation: data[i][13] || ''
          };

          console.log('[EvaluationData] 評価データ取得成功:', ratings);
          return { success: true, ratings: ratings };
        }
      }

      console.log('[EvaluationData] 評価データなし:', companyName);
      return { success: false, message: '評価データが見つかりません' };

    } catch (error) {
      console.error('[EvaluationData] エラー:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 評価データを保存・更新
   */
  saveRatings: function(companyName, ratingsData) {
    console.log('[EvaluationData] 評価データ保存:', companyName);

    try {
      const sheet = this.getEvaluationSheet();
      const data = sheet.getDataRange().getValues();

      const now = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss');

      // 新しい行データ
      const newRow = [
        companyName,
        ratingsData.googleRating || 0,
        ratingsData.nurikaeRating || 0,
        ratingsData.reshopnaviRating || 0,
        ratingsData.overallScore || 4.2,
        ratingsData.costBalance || 4.2,
        ratingsData.personality || 4.3,
        ratingsData.technology || 4.2,
        ratingsData.afterSupport || 4.1,
        ratingsData.responseSpeed || 4.3,
        ratingsData.customerSatisfaction || 4.2,
        now,
        ratingsData.dataSource || 'API',
        ratingsData.aiEvaluation || ''
      ];

      // 既存データを検索して更新、なければ追加
      let updated = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === companyName) {
          sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
          updated = true;
          console.log('[EvaluationData] 評価データ更新完了:', companyName);
          break;
        }
      }

      if (!updated) {
        sheet.appendRow(newRow);
        console.log('[EvaluationData] 評価データ追加完了:', companyName);
      }

      return { success: true, message: '評価データ保存完了' };

    } catch (error) {
      console.error('[EvaluationData] 保存エラー:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 外部APIから評価データを収集
   */
  collectRatingsFromAPIs: function(companyName, address = '') {
    console.log('[EvaluationData] API評価収集開始:', companyName);

    try {
      // 3つの評価源から評価取得（詳細項目付き）
      const googleRating = this.getGoogleRating(companyName, address);
      const nurikaeRatings = this.getNurikaeRating(companyName); // オブジェクト（6項目）
      const reshopnaviRatings = this.getReshopnaviRating(companyName); // オブジェクト（6項目）

      console.log('[EvaluationData] 取得した評価 - Google:', googleRating);
      console.log('[EvaluationData] ヌリカエ詳細:', nurikaeRatings);
      console.log('[EvaluationData] リショップナビ詳細:', reshopnaviRatings);

      // 総合スコア計算（3つの評価源の平均を4.2-5.0にマッピング）
      const overallScore = this.calculateOverallScore(googleRating, nurikaeRatings.overall, reshopnaviRatings.overall);

      // AI評価生成
      const aiEvaluation = this.generateAIEvaluation(companyName, googleRating, nurikaeRatings.overall, reshopnaviRatings.overall);

      // 項目別評価を生成（詳細項目から的確にマッピング）
      const detailedRatings = this.generateDetailedRatings(googleRating, nurikaeRatings, reshopnaviRatings);

      const ratingsData = {
        googleRating: googleRating,
        nurikaeRating: nurikaeRatings.overall,
        reshopnaviRating: reshopnaviRatings.overall,
        overallScore: overallScore,
        ...detailedRatings, // コストバランス、人柄・対応力、技術・品質、アフターサポート、対応スピード、顧客満足度
        dataSource: 'Google + ヌリカエ(詳細6項目) + リショップナビ(詳細6項目) + AI',
        aiEvaluation: aiEvaluation
      };

      // 保存
      this.saveRatings(companyName, ratingsData);

      console.log('[EvaluationData] 評価収集完了:', ratingsData);
      return { success: true, ratings: ratingsData };

    } catch (error) {
      console.error('[EvaluationData] 収集エラー:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * ヌリカエ評価取得（Google検索経由 - 6項目詳細）
   */
  getNurikaeRating: function(companyName) {
    console.log('[EvaluationData] ヌリカエ評価取得:', companyName);

    try {
      // Google Custom Search APIで検索
      const searchApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
      const searchEngineId = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');

      if (!searchApiKey || !searchEngineId) {
        console.warn('[EvaluationData] Google Custom Search API未設定');
        return this.getDefaultNurikaeRatings();
      }

      // site:演算子で nuri-kae.jp に限定して検索
      const searchQuery = `site:nuri-kae.jp ${companyName} 口コミ`;
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=1`;

      console.log('[EvaluationData] Custom Search実行:', searchQuery);

      const searchResponse = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
      const searchResult = JSON.parse(searchResponse.getContentText());

      if (!searchResult.items || searchResult.items.length === 0) {
        console.warn('[EvaluationData] ヌリカエページが見つかりません');
        return this.getDefaultNurikaeRatings();
      }

      const nurikaeUrl = searchResult.items[0].link;
      console.log('[EvaluationData] ヌリカエURL取得成功:', nurikaeUrl);

      // ヌリカエページを取得
      const response = UrlFetchApp.fetch(nurikaeUrl, { muteHttpExceptions: true });
      const html = response.getContentText();

      // 総合評価スコアを抽出
      const overallMatch = html.match(/総合評価[^\d]*(\d+\.\d+)/i) ||
                          html.match(/class="rating[^"]*"[^>]*>(\d+\.\d+)/);

      const overallRating = overallMatch ? parseFloat(overallMatch[1]) : 4.1;

      // 各項目の評価を抽出（満足度、提案内容、金額感、工事期間、担当者、仕上がり）
      // 1-5スケールのみを抽出（異常値を防ぐ）
      const extractRating = (pattern, defaultValue) => {
        const match = html.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          // 1.0-5.0の範囲内のみ有効、それ以外はデフォルト
          return (value >= 1.0 && value <= 5.0) ? value : defaultValue;
        }
        return defaultValue;
      };

      const detailedRatings = {
        overall: overallRating,
        satisfaction: extractRating(/満足度[^\d]*([1-5]\.\d+)/i, overallRating),
        proposal: extractRating(/提案内容[^\d]*([1-5]\.\d+)/i, overallRating),
        price: extractRating(/金額感[^\d]*([1-5]\.\d+)/i, overallRating),
        schedule: extractRating(/工事期間[^\d]*([1-5]\.\d+)/i, overallRating),
        staff: extractRating(/担当者[^\d]*([1-5]\.\d+)/i, overallRating),
        finish: extractRating(/仕上がり[^\d]*([1-5]\.\d+)/i, overallRating)
      };

      console.log('[EvaluationData] ヌリカエ詳細評価:', detailedRatings);
      return detailedRatings;

    } catch (error) {
      console.error('[EvaluationData] ヌリカエ評価取得エラー:', error);
      return this.getDefaultNurikaeRatings();
    }
  },

  /**
   * ヌリカエデフォルト評価
   */
  getDefaultNurikaeRatings: function() {
    return {
      overall: 4.1,
      satisfaction: 4.1,
      proposal: 4.1,
      price: 4.0,
      schedule: 4.0,
      staff: 4.1,
      finish: 4.1
    };
  },

  /**
   * リショップナビ評価取得（Google検索経由 - 6項目詳細）
   */
  getReshopnaviRating: function(companyName) {
    console.log('[EvaluationData] リショップナビ評価取得:', companyName);

    try {
      // Google Custom Search APIで検索
      const searchApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
      const searchEngineId = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');

      if (!searchApiKey || !searchEngineId) {
        console.warn('[EvaluationData] Google Custom Search API未設定');
        return this.getDefaultReshopnaviRatings();
      }

      // site:演算子で rehome-navi.com または reform-navi.com に限定して検索
      const searchQuery = `(site:rehome-navi.com OR site:reform-navi.com) ${companyName} 口コミ`;
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=1`;

      console.log('[EvaluationData] Custom Search実行:', searchQuery);

      const searchResponse = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
      const searchResult = JSON.parse(searchResponse.getContentText());

      if (!searchResult.items || searchResult.items.length === 0) {
        console.warn('[EvaluationData] リショップナビページが見つかりません');
        return this.getDefaultReshopnaviRatings();
      }

      const reshopnaviUrl = searchResult.items[0].link;
      console.log('[EvaluationData] リショップナビURL取得成功:', reshopnaviUrl);

      // リショップナビページを取得
      const response = UrlFetchApp.fetch(reshopnaviUrl, { muteHttpExceptions: true });
      const html = response.getContentText();

      // 総合評価スコアを抽出
      const overallMatch = html.match(/総合評価[^\d]*(\d+\.\d+)/i) ||
                          html.match(/評価[^\d]*(\d+\.\d+)/i) ||
                          html.match(/class="score[^"]*"[^>]*>(\d+\.\d+)/);

      const overallRating = overallMatch ? parseFloat(overallMatch[1]) : 4.0;

      // 各項目の評価を抽出（価格、提案力、施工品質、アフターフォロー、対応、満足度）
      // 1-5スケールのみを抽出（異常値を防ぐ）
      const extractRating = (pattern, defaultValue) => {
        const match = html.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          // 1.0-5.0の範囲内のみ有効、それ以外はデフォルト
          return (value >= 1.0 && value <= 5.0) ? value : defaultValue;
        }
        return defaultValue;
      };

      const detailedRatings = {
        overall: overallRating,
        price: extractRating(/価格[^\d]*([1-5]\.\d+)/i, overallRating),
        proposal: extractRating(/提案力[^\d]*([1-5]\.\d+)/i, overallRating),
        quality: extractRating(/施工品質[^\d]*([1-5]\.\d+)/i, overallRating) || extractRating(/品質[^\d]*([1-5]\.\d+)/i, overallRating),
        afterService: extractRating(/アフターフォロー[^\d]*([1-5]\.\d+)/i, overallRating) || extractRating(/フォロー[^\d]*([1-5]\.\d+)/i, overallRating),
        response: extractRating(/対応[^\d]*([1-5]\.\d+)/i, overallRating),
        satisfaction: extractRating(/満足度[^\d]*([1-5]\.\d+)/i, overallRating)
      };

      console.log('[EvaluationData] リショップナビ詳細評価:', detailedRatings);
      return detailedRatings;

    } catch (error) {
      console.error('[EvaluationData] リショップナビ評価取得エラー:', error);
      return this.getDefaultReshopnaviRatings();
    }
  },

  /**
   * リショップナビデフォルト評価
   */
  getDefaultReshopnaviRatings: function() {
    return {
      overall: 4.0,
      price: 4.0,
      proposal: 4.0,
      quality: 4.1,
      afterService: 4.0,
      response: 4.1,
      satisfaction: 4.0
    };
  },

  /**
   * Google評価取得（Places API使用）
   */
  getGoogleRating: function(companyName, address) {
    console.log('[EvaluationData] Google評価取得:', companyName);

    try {
      // GOOGLE_API_KEY または GOOGLE_PLACES_API_KEY を取得
      const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_API_KEY') ||
                     PropertiesService.getScriptProperties().getProperty('GOOGLE_PLACES_API_KEY');
      if (!apiKey) {
        console.warn('[EvaluationData] Google Places API Key未設定');
        return 4.2; // デフォルト値
      }

      // Places API: Text Search
      const searchQuery = encodeURIComponent(companyName + ' ' + address);
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${apiKey}`;

      const response = UrlFetchApp.fetch(searchUrl);
      const result = JSON.parse(response.getContentText());

      if (result.status === 'OK' && result.results.length > 0) {
        const rating = result.results[0].rating || 4.2;
        console.log('[EvaluationData] Google評価取得成功:', rating);
        return rating;
      }

      console.warn('[EvaluationData] Google評価なし、デフォルト使用');
      return 4.2;

    } catch (error) {
      console.error('[EvaluationData] Google評価取得エラー:', error);
      return 4.2;
    }
  },

  /**
   * AI評���生成
   */
  generateAIEvaluation: function(companyName, googleRating, nurikaeRating, reshopnaviRating) {
    console.log('[EvaluationData] AI評価生成（DeepSeek）:', companyName);

    try {
      const openRouterKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
      if (!openRouterKey) {
        console.warn('[EvaluationData] OpenRouter API Key未設定');
        return '施工品質と顧客対応の両面で高い評価を獲得しており、確かな技術力と丁寧な対応が特徴です。安心して依頼できる事業者として実績があります。';
      }

      // DeepSeek用プロンプト（第三者視点で客観的、かつ見積もり依頼を促すポジティブな内容）
      // ※ 具体的なスコア値は表示に使用される独自スコアと異なる可能性があるため削除
      const prompt = `あなたは外壁塗装業界の評価分析AIです。以下の会社について、客観的な第三者視点で、見積もり依頼を検討しているユーザーに安心感を与える総合評価コメントを200文字以内で生成してください。

**絶対に守るべきルール:**
1. **第三者視点の客観的なトーン**（「確認されています」「評価されています」「実績があります」など）
2. **ポジティブで信頼感のある表現**（ユーザーが安心して見積もり依頼できる内容）
3. **ネガティブ表現を一切使わない**（「中堅クラス」「平均的」「やや」「まずまず」などNG）
4. **100社あれば100通り**の違う表現にする（分析の着眼点を変える、パターン化厳禁）
5. **他社サイト名（Google、ヌリカエ、リショップナビ等）は絶対に出さない**
6. **「AI」「独自」「当社」などの表現は使わない** - あくまで客観的な評価として記述
7. **具体的な数字やスコアは一切使わない** - 定性的な表現のみ
8. 会社名の特徴（地域、専門性など）を活かして独自性を出す
9. 語尾は「〜です」「〜ます」「〜されています」など丁寧語
10. 200文字以内で具体的に

**NG表現（絶対に使わない）:**
- 中堅クラス、平均的、標準的、一般的、まずまず
- やや、少し、比較的、それなりに
- 問題なし、特に問題ない、悪くない
- 具体的な数字やスコア（3.9、4.2、5点満点など）

**OK表現（積極的に使う）:**
- 高い評価、優れた、充実した、豊富な、安定した
- 確かな実績、信頼性、丁寧な対応、迅速な対応
- 技術力、施工品質、顧客満足度、アフターサポート

**良い例:**
「施工品質と顧客対応の両面で高い評価を獲得しており、確かな技術力と丁寧な対応が特徴です。アフターサポート体制も充実しており、安心して依頼できる事業者として多くの実績があります。」
「技術力の高さと迅速な対応力が強みで、施工後のサポート体制も整っています。複数の評価項目で安定した実績があり、信頼して任せられる事業者と評価されています。」

**評価データ:**
会社名: ${companyName}
評価項目: 6項目（コスト、対応力、技術、サポート、スピード、満足度）

**出力形式:** 評価コメントのみを出力（説明不要、引用符不要、200文字以内、数字不使用）`;

      const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + openRouterKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gaihekikuraberu.com',
          'X-Title': 'Gaiheki Kuraberu - AI Rating Generator'
        },
        payload: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 500, // 200文字（日本語約100トークン）+ 余裕
          temperature: 0.9, // やや高めで多様性を確保（落ち着いたトーンなので0.95→0.9）
          top_p: 0.95,
          frequency_penalty: 0.6, // パターン化を強く防ぐ
          presence_penalty: 0.4
        }),
        muteHttpExceptions: true
      });

      const result = JSON.parse(response.getContentText());

      if (result.choices && result.choices.length > 0) {
        let aiEvaluation = result.choices[0].message.content.trim();

        // 余計な引用符や改行を削除
        aiEvaluation = aiEvaluation.replace(/^["'「『]|["'」』]$/g, '').replace(/\n/g, '').trim();

        console.log('[EvaluationData] AI評価生成成功:', aiEvaluation);
        return aiEvaluation;
      }

      return '施工品質と顧客対応の両面で高い評価を獲得しており、確かな技術力と丁寧な対応が特徴です。安心して依頼できる事業者として実績があります。';

    } catch (error) {
      console.error('[EvaluationData] AI評価生成エラー:', error);
      return '技術力の高さと迅速な対応力が強みで、施工後のサポート体制も整っています。信頼して任せられる事業者と評価されています。';
    }
  },

  /**
   * 総合スコア計算（3つの評価源の平均を4.2-5.0にマッピング）
   */
  calculateOverallScore: function(googleRating, nurikaeRating, reshopnaviRating) {
    console.log('[EvaluationData] 総合スコア計算:', googleRating, nurikaeRating, reshopnaviRating);

    // 3つの評価の平均を計算（1-5スケール）
    const avgRating = (googleRating + nurikaeRating + reshopnaviRating) / 3;
    console.log('[EvaluationData] 平均評価:', avgRating);

    // まず4.2未満なら4.2に底上げ → その後+0.2〜+0.4ブースト
    const floored = Math.max(4.2, avgRating);
    const boost = 0.2 + Math.random() * 0.2;
    const boostedScore = floored + boost;

    // 最高5.0に制限して0.1単位に丸める
    const finalScore = Math.min(5.0, Math.round(boostedScore * 10) / 10);

    console.log('[EvaluationData] 最終総合スコア:', finalScore);
    return finalScore;
  },

  /**
   * 項目別評価を生成（各評価源の詳細項目から的確にマッピング、欠損データは動的補完）
   */
  generateDetailedRatings: function(googleRating, nurikaeRatings, reshopnaviRatings) {
    console.log('[EvaluationData] 項目別評価生成 - Google:', googleRating, 'ヌリカエ:', nurikaeRatings, 'リショップナビ:', reshopnaviRatings);

    // 自然な評価ブースト（全て最低4.2、ただし4.2ジャストの出現率20%、残り80%は自然分散）
    const applyBoost = (rating, sourceRatings) => {
      // sourceRatingsから最高値を取得
      const maxSourceRating = Math.max(...sourceRatings.filter(r => r > 0));

      // 4.2ジャストを狙うモードの確率を20%に設定
      const shouldTargetExact42 = Math.random() < 0.2;

      console.log('[DEBUG applyBoost] rating:', rating, 'sourceRatings:', sourceRatings, 'maxSource:', maxSourceRating, 'is20%:', shouldTargetExact42);

      if (shouldTargetExact42) {
        // 20%: 4.2ジャスト狙い（4.2フロア → 小さめブースト）
        const floored = Math.max(4.2, rating);
        const smallBoost = 0.0 + Math.random() * 0.15; // 0.0-0.15の小さいブースト
        const result = Math.min(5.0, floored + smallBoost); // 4.2-4.35あたり
        console.log('[DEBUG 20%] floored:', floored, 'smallBoost:', smallBoost, 'result:', result);
        return result;
      } else {
        // 80%: 元データ活かして自然に上振れ（大きめのブーストで4.2超えを狙う）
        // 最高値が高いほど上振れ幅が大きくなる
        let boostedRating;
        let boostAmount;

        if (maxSourceRating >= 4.5) {
          // 最高値が4.5以上 → +0.4~0.7上振れ
          boostAmount = 0.4 + Math.random() * 0.3;
          boostedRating = rating + boostAmount;
        } else if (maxSourceRating >= 4.0) {
          // 最高値が4.0-4.5 → +0.35~0.65上振れ
          boostAmount = 0.35 + Math.random() * 0.3;
          boostedRating = rating + boostAmount;
        } else if (maxSourceRating >= 3.5) {
          // 最高値が3.5-4.0 → +0.3~0.6上振れ
          boostAmount = 0.3 + Math.random() * 0.3;
          boostedRating = rating + boostAmount;
        } else {
          // 最高値が3.5未満 → +0.3~0.6上振れ
          boostAmount = 0.3 + Math.random() * 0.3;
          boostedRating = rating + boostAmount;
        }

        // 全て最低4.2、最高5.0に制限
        const result = Math.min(5.0, Math.max(4.2, boostedRating));
        console.log('[DEBUG 80%] boostAmount:', boostAmount, 'boosted:', boostedRating, 'afterFloor:', result);
        return result;
      }
    };

    // データ取得状況を判定（デフォルト値と一致するか確認）
    const hasNurikaeData = nurikaeRatings.overall !== 4.1 || nurikaeRatings.price !== 4.0;
    const hasReshopnaviData = reshopnaviRatings.overall !== 4.0 || reshopnaviRatings.price !== 4.0;
    const hasGoogleData = googleRating !== 4.2;

    console.log('[EvaluationData] データ取得状況 - Google:', hasGoogleData, 'ヌリカエ:', hasNurikaeData, 'リショップナビ:', hasReshopnaviData);

    // 動的重み付け関数（取得できたデータの割合を増やす）
    const calcWeightedScore = (sources) => {
      let totalWeight = 0;
      let weightedSum = 0;

      sources.forEach(source => {
        if (source.hasData) {
          weightedSum += source.rating * source.weight;
          totalWeight += source.weight;
        }
      });

      // データがある場合は加重平均、ない場合はデフォルト
      return totalWeight > 0 ? weightedSum / totalWeight : 4.0;
    };

    // F: コストバランス（価格・金額感を重視）
    // リショップナビのprice項目は異常値が多いため除外
    const costBalanceSources = [nurikaeRatings.price, googleRating];
    const costBalance = applyBoost(
      calcWeightedScore([
        { rating: nurikaeRatings.price, weight: 0.7, hasData: hasNurikaeData },
        { rating: googleRating, weight: 0.3, hasData: hasGoogleData }
      ]),
      costBalanceSources
    );

    // G: 人柄・対応力（担当者・対応・スタッフ評価）
    const personalitySources = [nurikaeRatings.staff, reshopnaviRatings.response, googleRating];
    const personality = applyBoost(
      calcWeightedScore([
        { rating: nurikaeRatings.staff, weight: 0.4, hasData: hasNurikaeData },
        { rating: reshopnaviRatings.response, weight: 0.4, hasData: hasReshopnaviData },
        { rating: googleRating, weight: 0.2, hasData: hasGoogleData }
      ]),
      personalitySources
    );

    // H: 技術・品質（施工品質・仕上がり）
    const technologySources = [reshopnaviRatings.quality, nurikaeRatings.finish, googleRating];
    const technology = applyBoost(
      calcWeightedScore([
        { rating: reshopnaviRatings.quality, weight: 0.45, hasData: hasReshopnaviData },
        { rating: nurikaeRatings.finish, weight: 0.45, hasData: hasNurikaeData },
        { rating: googleRating, weight: 0.1, hasData: hasGoogleData }
      ]),
      technologySources
    );

    // I: アフターサポート（アフターフォロー項目）
    const afterSupportSources = [reshopnaviRatings.afterService, nurikaeRatings.satisfaction, googleRating];
    const afterSupport = applyBoost(
      calcWeightedScore([
        { rating: reshopnaviRatings.afterService, weight: 0.6, hasData: hasReshopnaviData },
        { rating: nurikaeRatings.satisfaction, weight: 0.3, hasData: hasNurikaeData },
        { rating: googleRating, weight: 0.1, hasData: hasGoogleData }
      ]),
      afterSupportSources
    );

    // J: 対応スピード（工事期間・対応）
    const responseSpeedSources = [nurikaeRatings.schedule, reshopnaviRatings.response, googleRating];
    const responseSpeed = applyBoost(
      calcWeightedScore([
        { rating: nurikaeRatings.schedule, weight: 0.5, hasData: hasNurikaeData },
        { rating: reshopnaviRatings.response, weight: 0.3, hasData: hasReshopnaviData },
        { rating: googleRating, weight: 0.2, hasData: hasGoogleData }
      ]),
      responseSpeedSources
    );

    // K: 顧客満足度（満足度項目を最重視）
    const customerSatisfactionSources = [nurikaeRatings.satisfaction, reshopnaviRatings.satisfaction, googleRating];
    const customerSatisfaction = applyBoost(
      calcWeightedScore([
        { rating: nurikaeRatings.satisfaction, weight: 0.4, hasData: hasNurikaeData },
        { rating: reshopnaviRatings.satisfaction, weight: 0.4, hasData: hasReshopnaviData },
        { rating: googleRating, weight: 0.2, hasData: hasGoogleData }
      ]),
      customerSatisfactionSources
    );

    return {
      costBalance: Math.round(costBalance * 10) / 10,
      personality: Math.round(personality * 10) / 10,
      technology: Math.round(technology * 10) / 10,
      afterSupport: Math.round(afterSupport * 10) / 10,
      responseSpeed: Math.round(responseSpeed * 10) / 10,
      customerSatisfaction: Math.round(customerSatisfaction * 10) / 10
    };
  },

  /**
   * 評価データシートから加盟店マスタのAC列（総合スコア）に同期
   * V1754: 評価データシート → 加盟店マスタ自動同期
   */
  syncRatingsToMaster: function() {
    console.log('[EvaluationData] 総合スコアを加盟店マスタに同期開始');

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      const evaluationSheet = this.getEvaluationSheet();
      const masterSheet = ss.getSheetByName('加盟店マスタ');

      if (!masterSheet) {
        console.error('[EvaluationData] 加盟店マスタシートが見つかりません');
        return { success: false, error: '加盟店マスタシートが見つかりません' };
      }

      // 評価データシートからデータ取得
      const evaluationData = evaluationSheet.getDataRange().getValues();
      const evaluationHeaders = evaluationData[0];

      // 会社名と総合スコアのマッピング作成
      const evaluationMap = {};
      const companyNameColIndex = evaluationHeaders.indexOf('会社名');
      const overallScoreColIndex = evaluationHeaders.indexOf('総合スコア');

      console.log('[EvaluationData] 評価データ列インデックス - 会社名:', companyNameColIndex, '総合スコア:', overallScoreColIndex);

      for (let i = 1; i < evaluationData.length; i++) {
        const companyName = evaluationData[i][companyNameColIndex];
        const overallScore = evaluationData[i][overallScoreColIndex];

        if (companyName && overallScore) {
          evaluationMap[companyName] = overallScore;
        }
      }

      console.log('[EvaluationData] 評価データマップ作成完了:', Object.keys(evaluationMap).length + '件');

      // 加盟店マスタのヘッダー取得
      const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
      const masterCompanyNameColIndex = masterHeaders.indexOf('会社名');
      const masterRatingColIndex = masterHeaders.indexOf('総合スコア');

      console.log('[EvaluationData] 加盟店マスタ列インデックス - 会社名:', masterCompanyNameColIndex, '総合スコア:', masterRatingColIndex);

      if (masterRatingColIndex === -1) {
        console.error('[EvaluationData] 加盟店マスタに「総合スコア」列が見つかりません');
        return { success: false, error: '加盟店マスタに「総合スコア」列が見つかりません' };
      }

      // 加盟店マスタを更新
      const masterLastRow = masterSheet.getLastRow();
      let updatedCount = 0;
      let notFoundCount = 0;

      for (let i = 2; i <= masterLastRow; i++) {
        const companyName = masterSheet.getRange(i, masterCompanyNameColIndex + 1).getValue();

        if (companyName && evaluationMap[companyName] !== undefined) {
          // 評価データが存在する場合は同期
          masterSheet.getRange(i, masterRatingColIndex + 1).setValue(evaluationMap[companyName]);
          updatedCount++;
        } else if (companyName) {
          // 評価データが存在しない場合はデフォルト値4.2を設定
          masterSheet.getRange(i, masterRatingColIndex + 1).setValue(4.2);
          notFoundCount++;
        }
      }

      console.log('[EvaluationData] 同期完了 - 更新:', updatedCount + '件、デフォルト設定:', notFoundCount + '件');

      return {
        success: true,
        updatedCount: updatedCount,
        notFoundCount: notFoundCount,
        totalEvaluations: Object.keys(evaluationMap).length
      };

    } catch (error) {
      console.error('[EvaluationData] 同期エラー:', error);
      return { success: false, error: error.toString() };
    }
  }

};
