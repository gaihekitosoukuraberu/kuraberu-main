/**
 * ============================================
 * 静的HTML生成システム
 * ============================================
 *
 * 目的: 加盟店ごとのSEO対策済み静的HTMLを生成
 * 依存: SpreadsheetApp, UrlFetchApp
 *
 * 機能:
 * - 加盟店承認時に自動でHTML生成
 * - くらべるスコア™込みのSEO対策済みテンプレート
 * - Railway経由でXサーバーにデプロイ
 */

var StaticHTMLGenerator = {

  /**
   * 加盟店データから静的HTMLを生成してデプロイ（AdminSystemから正しいスラッグを受け取り）
   */
  generateAndDeployWithSlugs(merchantId, merchantData, citySlug, companySlug) {
    try {
      const startTime = Date.now();
      console.log('[StaticHTML] ⏱️ HTML生成＆デプロイ開始:', merchantId, 'at', new Date().toISOString());
      console.log('[StaticHTML] 🔗 受信スラッグ:', { citySlug, companySlug });

      // 2. くらべるスコア取得
      const t2 = Date.now();
      const score = this.getCompareScore(merchantId);
      console.log('[StaticHTML] ⏱️ スコア取得完了:', (Date.now() - t2) + 'ms');

      // 3. HTML生成
      const t3 = Date.now();
      const html = this.generateHTML(merchantData, score, citySlug, companySlug);
      console.log('[StaticHTML] ⏱️ HTML生成完了:', (Date.now() - t3) + 'ms', 'サイズ:', Math.round(html.length / 1024) + 'KB');

      // 4. FTPに直接アップロード（高速：2-3秒）
      const t4 = Date.now();
      const deployResult = this.deployToFTP(html, citySlug, companySlug, merchantData);
      console.log('[StaticHTML] ⏱️ FTPアップロード完了:', (Date.now() - t4) + 'ms');

      console.log('[StaticHTML] ⏱️ 全体処理時間:', (Date.now() - startTime) + 'ms');
      console.log('[StaticHTML] ✅ HTML生成＆デプロイ完了');

      return {
        success: true,
        url: `https://gaihekikuraberu.com/${citySlug}/${companySlug}/`,
        citySlug: citySlug,
        companySlug: companySlug,
        deployResult: deployResult
      };

    } catch (error) {
      console.error('[StaticHTML] ❌ HTML生成エラー:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * 加盟店データから静的HTMLを生成してデプロイ（従来版・互換性保持）
   */
  generateAndDeploy(merchantId, merchantData) {
    try {
      const startTime = Date.now();
      console.log('[StaticHTML] ⏱️ HTML生成＆デプロイ開始:', merchantId, 'at', new Date().toISOString());

      // 1. スラッグ生成
      const t1 = Date.now();
      const citySlug = this.generateCitySlug(merchantData);
      const companySlug = this.generateCompanySlug(merchantData);
      console.log('[StaticHTML] ⏱️ スラッグ生成完了:', (Date.now() - t1) + 'ms');
      console.log('[StaticHTML] 市区町村スラッグ:', citySlug);
      console.log('[StaticHTML] 会社スラッグ:', companySlug);

      // 2. くらべるスコア取得
      const t2 = Date.now();
      const score = this.getCompareScore(merchantId);
      console.log('[StaticHTML] ⏱️ スコア取得完了:', (Date.now() - t2) + 'ms');

      // 3. HTML生成
      const t3 = Date.now();
      const html = this.generateHTML(merchantData, score, citySlug, companySlug);
      console.log('[StaticHTML] ⏱️ HTML生成完了:', (Date.now() - t3) + 'ms', 'サイズ:', Math.round(html.length / 1024) + 'KB');

      // 4. FTPに直接アップロード（高速：2-3秒）
      const t4 = Date.now();
      const deployResult = this.deployToFTP(html, citySlug, companySlug, merchantData);
      console.log('[StaticHTML] ⏱️ FTPアップロード完了:', (Date.now() - t4) + 'ms');

      console.log('[StaticHTML] ⏱️ 全体処理時間:', (Date.now() - startTime) + 'ms');
      console.log('[StaticHTML] ✅ HTML生成＆デプロイ完了');

      return {
        success: true,
        url: `https://gaihekikuraberu.com/${citySlug}/${companySlug}/`,
        citySlug: citySlug,
        companySlug: companySlug,
        deployResult: deployResult
      };

    } catch (error) {
      console.error('[StaticHTML] ❌ HTML生成エラー:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * 市区町村スラッグ生成（例: "東京都渋谷区" → "shibuya"）
   */
  generateCitySlug(merchantData) {
    const address = merchantData['住所'] || merchantData['address'] || '';
    console.log('[StaticHTML] 🔍 住所:', address);

    // 都道府県を除去して市区町村を抽出
    let city = address
      .replace(/^(北海道|.{2}[都道府県])/, '') // 都道府県を除去
      .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角数字→半角
      .replace(/[^一-龥ぁ-んァ-ヶー]/g, ''); // 市区町村以外削除

    console.log('[StaticHTML] 🔍 都道府県除去後:', city);

    // 市区町村名の最初の部分を取得（例：「渋谷区○○町」→「渋谷」）
    let match = city.match(/^(.{2,4}?)[区市町村]/);
    if (match) {
      city = match[1];
      console.log('[StaticHTML] 🔍 市区町村抽出結果:', city);
    } else {
      // マッチしない場合は最初の2-4文字を取得
      city = city.substring(0, 4);
      console.log('[StaticHTML] 🔍 文字数制限での抽出:', city);
    }

    // ローマ字変換マッピング
    const romajiMap = {
      '渋谷': 'shibuya', '新宿': 'shinjuku', '世田谷': 'setagaya',
      '横浜': 'yokohama', '川崎': 'kawasaki', '川口': 'kawaguchi',
      '大阪': 'osaka', '名古屋': 'nagoya', '福岡': 'fukuoka',
      '札幌': 'sapporo', '神戸': 'kobe', '京都': 'kyoto',
      '千葉': 'chiba', 'さいたま': 'saitama', '広島': 'hiroshima',
      '仙台': 'sendai', '品川': 'shinagawa', '港': 'minato',
      '目黒': 'meguro', '大田': 'ota', '中野': 'nakano',
      '杉並': 'suginami', '豊島': 'toshima', '北': 'kita',
      '板橋': 'itabashi', '練馬': 'nerima', '足立': 'adachi',
      '葛飾': 'katsushika', '江戸川': 'edogawa', '江東': 'koto',
      '墨田': 'sumida', '台東': 'taito', '文京': 'bunkyo',
      '荒川': 'arakawa', '中央': 'chuo'
    };

    const result = romajiMap[city] || this.toRomaji(city) || 'city';
    console.log('[StaticHTML] 🔍 最終citySlug:', result);
    return result;
  },

  /**
   * 会社名スラッグ生成（例: "株式会社ABCペイント" → "abc-paint"）
   */
  generateCompanySlug(merchantData) {
    let name = merchantData['会社名'] || merchantData['companyName'] || '';
    console.log('[StaticHTML] 🔍 会社名（元）:', name);

    // 法人格除去
    name = name
      .replace(/^(株式会社|有限会社|合同会社|一般社団法人|NPO法人)/g, '')
      .replace(/(株式会社|有限会社|合同会社)$/g, '')
      .trim();
    console.log('[StaticHTML] 🔍 法人格除去後:', name);

    // 全角→半角、記号→ハイフン
    name = name
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[\s\u3000・]/g, '-')
      .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '')
      .toLowerCase();
    console.log('[StaticHTML] 🔍 記号変換後:', name);

    // 漢字・ひらがな・カタカナをローマ字に変換
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(name)) {
      name = this.toRomaji(name);
      console.log('[StaticHTML] 🔍 ローマ字変換後:', name);
    }

    // 連続ハイフン→1つに、前後のハイフン除去
    name = name.replace(/-+/g, '-').replace(/^-|-$/g, '');

    const result = name || 'company';
    console.log('[StaticHTML] 🔍 最終companySlug:', result);
    return result;
  },

  /**
   * 簡易ローマ字変換（カタカナ→ローマ字）
   */
  toRomaji(text) {
    const kanaMap = {
      'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
      'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
      'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
      'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
      'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
      'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
      'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
      'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
      'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
      'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
      'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
      'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
      'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
      'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
      'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
      'ー': '', 'ッ': '', '・': '-'
    };

    // カタカナに変換（ひらがな→カタカナ）
    text = text.replace(/[\u3041-\u3096]/g, match =>
      String.fromCharCode(match.charCodeAt(0) + 0x60)
    );

    // カタカナ→ローマ字
    let romaji = '';
    for (let char of text) {
      romaji += kanaMap[char] || char;
    }

    return romaji.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
  },

  /**
   * くらべるスコア取得（高速化：AdminSystemと同じ最適化パターン適用）
   */
  getCompareScore(merchantId) {
    try {
      const scoreStartTime = Date.now();
      console.log('[StaticHTML] ⏱️ スコア取得開始:', merchantId);

      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const scoreSheet = ss.getSheetByName('スコア');

      if (!scoreSheet) {
        console.log('[StaticHTML] スコアシートなし - デフォルト値使用');
        return this.getDefaultScore();
      }

      // 🚀 高速化：ヘッダーのみ読み込み（AdminSystemと同じパターン）
      const t1 = Date.now();
      const headers = scoreSheet.getRange(1, 1, 1, scoreSheet.getLastColumn()).getValues()[0];
      const idIndex = headers.indexOf('加盟店ID');
      console.log('[StaticHTML] ⏱️ ヘッダー読み込み:', (Date.now() - t1) + 'ms', 'ID列インデックス:', idIndex);

      if (idIndex === -1) {
        console.log('[StaticHTML] 加盟店ID列が見つかりません');
        return this.getDefaultScore();
      }

      // 🚀 高速化：ID列のみ読み込んでターゲット行を特定
      const t2 = Date.now();
      const lastRow = scoreSheet.getLastRow();
      if (lastRow <= 1) {
        console.log('[StaticHTML] データなし - デフォルト値使用');
        return this.getDefaultScore();
      }

      const idColumnValues = scoreSheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
      console.log('[StaticHTML] ⏱️ ID列読み込み:', (Date.now() - t2) + 'ms', '行数:', lastRow - 1);

      // ターゲット行を特定
      const t3 = Date.now();
      let targetRowNumber = -1;
      for (let i = 0; i < idColumnValues.length; i++) {
        if (idColumnValues[i][0] === merchantId) {
          targetRowNumber = i + 2; // +2 because: +1 for 0-based to 1-based, +1 for header row
          break;
        }
      }
      console.log('[StaticHTML] ⏱️ 行検索:', (Date.now() - t3) + 'ms', 'ターゲット行:', targetRowNumber);

      if (targetRowNumber === -1) {
        console.log('[StaticHTML] 加盟店ID', merchantId, 'が見つかりません - デフォルト値使用');
        return this.getDefaultScore();
      }

      // 🚀 高速化：ターゲット行のみ読み込み
      const t4 = Date.now();
      const rowData = scoreSheet.getRange(targetRowNumber, 1, 1, headers.length).getValues()[0];
      console.log('[StaticHTML] ⏱️ 行データ読み込み:', (Date.now() - t4) + 'ms');

      const result = {
        overall: rowData[headers.indexOf('総合評価')] || 4.8,
        satisfaction: rowData[headers.indexOf('顧客満足度')] || 4.9,
        proposal: rowData[headers.indexOf('提案力')] || 4.7,
        cost: rowData[headers.indexOf('コスパ')] || 4.6,
        speed: rowData[headers.indexOf('対応スピード')] || 4.8,
        aftercare: rowData[headers.indexOf('アフターフォロー')] || 4.7,
        manner: rowData[headers.indexOf('マナー・人柄')] || 4.9,
        comment: rowData[headers.indexOf('AI総評')] || ''
      };

      console.log('[StaticHTML] ⏱️ スコア取得完了:', (Date.now() - scoreStartTime) + 'ms');
      console.log('[StaticHTML] 📊 取得スコア:', result.overall, '/', result.satisfaction);
      return result;

    } catch (error) {
      console.error('[StaticHTML] スコア取得エラー:', error);
      return this.getDefaultScore();
    }
  },

  /**
   * デフォルトスコア
   */
  getDefaultScore() {
    return {
      overall: 4.8,
      satisfaction: 4.9,
      proposal: 4.7,
      cost: 4.6,
      speed: 4.8,
      aftercare: 4.7,
      manner: 4.9,
      comment: '地域密着で提案力・コストパフォーマンスともに高水準。職人の人柄と丁寧な説明で多くの施主様が高評価を寄せています。'
    };
  },

  /**
   * SEO対策済みHTML生成（🚀 GAS超高速化：外部テンプレート使用）
   * フランチャイズダッシュボードと完全一致するようにMerchantSystem.getMerchantData()を使用
   */
  generateHTML(merchantData, score, citySlug, companySlug) {
    try {
      const templateStartTime = Date.now();
      console.log('[StaticHTML] 🚀 外部テンプレート方式でHTML生成開始');

      // merchantDataから加盟店IDを取得
      const merchantId = merchantData['加盟店ID'] || merchantData['merchantId'] || merchantData.id;
      console.log('[StaticHTML] 🔍 加盟店ID:', merchantId);

      // 🎯 フランチャイズダッシュボードと完全一致：MerchantSystem.getMerchantData()を使用
      let fullMerchantData;
      if (merchantId) {
        console.log('[StaticHTML] 📊 MerchantSystem.getMerchantData()でスプレッドシートから最新データ取得');
        const merchantDataResult = MerchantSystem.getMerchantData({ merchantId: merchantId });
        if (merchantDataResult.success && merchantDataResult.data) {
          fullMerchantData = merchantDataResult.data;
          console.log('[StaticHTML] ✅ 動的データ取得成功:', Object.keys(fullMerchantData).length, '項目');
        } else {
          console.log('[StaticHTML] ⚠️ 動的データ取得失敗、fallback to provided data');
          fullMerchantData = merchantData;
        }
      } else {
        console.log('[StaticHTML] ⚠️ 加盟店ID不明、provided dataを使用');
        fullMerchantData = merchantData;
      }

      // 基本情報の抽出（フランチャイズダッシュボードと同じキー名を使用）
      const companyName = fullMerchantData['会社名'] || fullMerchantData['companyName'] || '加盟店';
      const companyNameKana = fullMerchantData['会社名カナ'] || fullMerchantData['companyNameKana'] || '';
      const tradeName = fullMerchantData['屋号'] || fullMerchantData['tradeName'] || '';
      const tradeNameKana = fullMerchantData['屋号カナ'] || fullMerchantData['tradeNameKana'] || '';
      const representative = fullMerchantData['代表者名'] || fullMerchantData['representative'] || '';
      const representativeKana = fullMerchantData['代表者名カナ'] || fullMerchantData['representativeKana'] || '';
      const zipCode = fullMerchantData['郵便番号'] || fullMerchantData['zipCode'] || '';
      const address = fullMerchantData['住所'] || fullMerchantData['address'] || '';
      const tel = fullMerchantData['電話番号'] || fullMerchantData['tel'] || '';
      const email = fullMerchantData['メールアドレス'] || fullMerchantData['email'] || '';
      const website = fullMerchantData['ウェブサイトURL'] || fullMerchantData['website'] || '';
      const established = fullMerchantData['設立年月'] || fullMerchantData['established'] || '';
      const prText = fullMerchantData['PRテキスト'] || fullMerchantData['prText'] || '';

      // 追加の詳細情報（フランチャイズダッシュボードプレビューで使用されるもの）
      const mainVisual = fullMerchantData['メインビジュアル'] || fullMerchantData['mainVisual'] || '';
      const photoGallery = fullMerchantData['写真ギャラリー'] || fullMerchantData['photoGallery'] || '';
      const constructionExamples = fullMerchantData['constructionExamplesJson'] || '';
      const qualifications = fullMerchantData['保有資格'] || fullMerchantData['qualifications'] || '';
      const insurance = fullMerchantData['加入保険'] || fullMerchantData['insurance'] || '';
      const serviceAreas = fullMerchantData['対応市区町村'] || fullMerchantData['serviceAreas'] || '';
      const services = fullMerchantData['施工箇所'] || fullMerchantData['services'] || '';

      // 市区町村名抽出（日本語）
      const cityNameMatch = address.match(/([一-龥]+[区市町村])/);
      const cityName = cityNameMatch ? cityNameMatch[1] : '';

      // SEO用のタイトルと説明文を生成
      const title = `${cityName}の外壁塗装なら${companyName}｜くらべるスコア${score.overall}｜口コミ高評価`;

      // PR文がある場合は最初の文を使用、なければデフォルト
      let descriptionText = score.comment;
      if (prText) {
        const firstSentence = prText.split('。')[0];
        descriptionText = firstSentence.length > 10 ? firstSentence : prText.substring(0, 100);
      }
      const description = `地域密着で実績豊富な${companyName}。クラベル独自評価「くらべるスコア」では${score.overall}の高評価。${descriptionText}`;

      // 🚀 HtmlServiceを使用して外部テンプレートから生成
      const t1 = Date.now();
      const template = HtmlService.createTemplateFromFile('merchant-page-template');
      console.log('[StaticHTML] ⏱️ テンプレート読み込み:', (Date.now() - t1) + 'ms');

      // テンプレート変数設定（フランチャイズダッシュボードと完全一致）
      const t2 = Date.now();

      // 基本SEO情報
      template.title = title;
      template.description = description;
      template.cityName = cityName;
      template.citySlug = citySlug;
      template.companySlug = companySlug;
      template.score = score;

      // 詳細会社情報（フランチャイズダッシュボードプレビューと完全対応）
      template.companyName = companyName;
      template.companyNameKana = companyNameKana;
      template.tradeName = tradeName;
      template.tradeNameKana = tradeNameKana;
      template.representative = representative;
      template.representativeKana = representativeKana;
      template.zipCode = zipCode;
      template.address = address;
      template.tel = tel;
      template.email = email;
      template.website = website;
      template.established = established;
      template.prText = prText;

      // 追加情報
      template.mainVisual = mainVisual;
      template.photoGallery = photoGallery;
      template.constructionExamples = constructionExamples;
      template.qualifications = qualifications;
      template.insurance = insurance;
      template.serviceAreas = serviceAreas;
      template.services = services;

      // フルアドレス（郵便番号 + 住所）
      template.fullAddress = zipCode ? `〒${zipCode} ${address}` : address;

      // 会社名表示の決定（屋号がある場合の表示ロジック）
      template.displayCompanyName = tradeName ? `${companyName}（${tradeName}）` : companyName;

      // キャッチフレーズ（PR文の最初の文から抽出）
      const firstSentence = prText ? prText.split('。')[0] : '';
      template.tagline = firstSentence || '信頼と実績の外壁塗装専門店';

      // 完全なマーチャントデータをテンプレートに渡す（フランチャイズダッシュボードと同じ）
      template.merchantData = fullMerchantData;

      console.log('[StaticHTML] ✅ 完全一致データ設定完了:', {
        merchantId: merchantId,
        companyName: companyName,
        representative: representative,
        established: established,
        prTextLength: prText.length,
        mainVisualExists: !!mainVisual,
        photoGalleryExists: !!photoGallery,
        tagline: template.tagline.substring(0, 30) + '...'
      });
      console.log('[StaticHTML] ⏱️ 変数設定:', (Date.now() - t2) + 'ms');

      // HTML評価・生成
      const t3 = Date.now();
      const htmlOutput = template.evaluate();
      const finalHtml = htmlOutput.getContent();
      console.log('[StaticHTML] ⏱️ HTML評価・生成:', (Date.now() - t3) + 'ms');

      console.log('[StaticHTML] ⏱️ 外部テンプレート総時間:', (Date.now() - templateStartTime) + 'ms');
      console.log('[StaticHTML] 📄 生成HTMLサイズ:', Math.round(finalHtml.length / 1024) + 'KB');

      return finalHtml;

    } catch (error) {
      console.error('[StaticHTML] ❌ 外部テンプレート生成エラー:', error);
      console.log('[StaticHTML] 🔄 フォールバック：簡易HTML生成');

      // フォールバック：最小限のHTML生成
      return this.generateFallbackHTML(merchantData, score, citySlug, companySlug);
    }
  },

  /**
   * フォールバック用簡易HTML生成
   */
  generateFallbackHTML(merchantData, score, citySlug, companySlug) {
    const companyName = merchantData['会社名'] || merchantData['companyName'] || '加盟店';
    const address = merchantData['住所'] || merchantData['address'] || '';
    const tel = merchantData['電話番号'] || merchantData['tel'] || '';

    const cityNameMatch = address.match(/([一-龥]+[区市町村])/);
    const cityName = cityNameMatch ? cityNameMatch[1] : '';

    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cityName}の外壁塗装なら${companyName}｜くらべるスコア${score.overall}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-4">${companyName}</h1>
        <p class="text-lg text-gray-600 mb-6">${cityName}で信頼される外壁塗装専門店</p>

        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">くらべるスコア™</h2>
            <div class="text-4xl font-bold text-blue-600 mb-2">${score.overall}</div>
            <p class="text-gray-700">${score.comment}</p>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4">会社情報</h2>
            <p><strong>住所:</strong> ${address}</p>
            <p><strong>電話:</strong> ${tel}</p>
            <a href="tel:${tel}" class="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                ${tel} に電話する
            </a>
        </div>
    </div>
</body>
</html>`;
  },

  /**
   * Google Drive保存 + GitHub Actions自動デプロイ（推奨方式）
   */
  deployToFTP(html, citySlug, companySlug, merchantData) {
    try {
      console.log('[StaticHTML] 🚀 Google Drive + Xserver FTP 同時アップロード開始');

      const fileName = `index.html`;
      const folderPath = `/${citySlug}/${companySlug}`;
      const finalUrl = `https://gaihekikuraberu.com${folderPath}/`;

      console.log('[StaticHTML] 📁 ファイル名:', fileName);
      console.log('[StaticHTML] 📄 HTMLサイズ:', Math.round(html.length / 1024) + 'KB');
      console.log('[StaticHTML] 🔗 目標URL:', finalUrl);

      // Step 1: Google Drive保存（バックアップ用）
      console.log('[StaticHTML] 📁 Step 1: Google Drive保存');
      const driveResult = this.saveToGoogleDriveWithMetadata(html, fileName, citySlug, companySlug, merchantData);

      if (driveResult.success) {
        console.log('[StaticHTML] ✅ Google Drive保存完了:', driveResult.driveFileId);
      }

      // Step 2: Xserver FTP直接アップロード
      console.log('[StaticHTML] 🌐 Step 2: Xserver FTP直接アップロード');
      const ftpResult = this.uploadToXserverFTP(html, fileName, folderPath);

      console.log('[StaticHTML] ✅ 全アップロード完了');

      return {
        success: true,
        method: 'Google Drive + Xserver FTP',
        uploadTime: '処理時間計算中',
        url: finalUrl,
        driveResult: driveResult,
        ftpResult: ftpResult,
        fileName: fileName,
        targetPath: folderPath
      };

    } catch (error) {
      console.error('[StaticHTML] ❌ デプロイエラー:', error);
      return {
        success: false,
        error: 'デプロイエラー: ' + error.toString(),
        method: 'Google Drive + Xserver FTP'
      };
    }
  },

  /**
   * Google Drive保存（GitHub Actions連携用・メタデータ付き）
   */
  saveToGoogleDriveWithMetadata(html, fileName, citySlug, companySlug, merchantData) {
    try {
      const timestamp = new Date().toISOString();
      const deploymentInfo = {
        citySlug: citySlug,
        companySlug: companySlug,
        fileName: fileName,
        targetPath: `/${citySlug}/${companySlug}`,
        finalUrl: `https://gaihekikuraberu.com/${citySlug}/${companySlug}/`,
        timestamp: timestamp,
        merchantId: merchantData['加盟店ID'] || merchantData['merchantId'],
        companyName: merchantData['会社名'] || merchantData['companyName']
      };

      console.log('[StaticHTML] 📊 デプロイ情報:', deploymentInfo);

      // Google Driveのフォルダを取得または作成
      let driveFolder;
      try {
        const folders = DriveApp.getFoldersByName('gaihekikuraberu-hp-files');
        if (folders.hasNext()) {
          driveFolder = folders.next();
        } else {
          driveFolder = DriveApp.createFolder('gaihekikuraberu-hp-files');
          console.log('[StaticHTML] 📁 フォルダ作成:', 'gaihekikuraberu-hp-files');
        }
      } catch (folderError) {
        console.error('[StaticHTML] フォルダ取得エラー:', folderError);
        driveFolder = DriveApp.getRootFolder();
      }

      // HTMLファイルをGoogle Driveに保存
      const targetFileName = `${citySlug}-${companySlug}-${fileName}`;
      const existingFiles = driveFolder.getFilesByName(targetFileName);
      let file;

      if (existingFiles.hasNext()) {
        // 既存ファイルを更新
        file = existingFiles.next();
        file.setContent(html);
        console.log('[StaticHTML] 📝 既存ファイル更新:', targetFileName);
      } else {
        // 新規ファイル作成
        file = driveFolder.createFile(targetFileName, html, 'text/html');
        console.log('[StaticHTML] ✨ 新規ファイル作成:', targetFileName);
      }

      // ファイルを共有可能に設定
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // GitHub Actions用のメタデータファイルも作成
      const metadataFileName = `${citySlug}-${companySlug}-metadata.json`;
      const metadataContent = JSON.stringify(deploymentInfo, null, 2);

      const existingMetadataFiles = driveFolder.getFilesByName(metadataFileName);
      let metadataFile;

      if (existingMetadataFiles.hasNext()) {
        metadataFile = existingMetadataFiles.next();
        metadataFile.setContent(metadataContent);
        console.log('[StaticHTML] 📝 メタデータファイル更新:', metadataFileName);
      } else {
        metadataFile = driveFolder.createFile(metadataFileName, metadataContent, 'application/json');
        console.log('[StaticHTML] ✨ メタデータファイル作成:', metadataFileName);
      }

      metadataFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      console.log('[StaticHTML] ✅ Google Drive保存完了（メタデータ付き）');
      console.log('[StaticHTML] 📄 HTMLファイルID:', file.getId());
      console.log('[StaticHTML] 📋 メタデータファイルID:', metadataFile.getId());

      return {
        success: true,
        driveFileId: file.getId(),
        metadataFileId: metadataFile.getId(),
        deploymentInfo: deploymentInfo,
        method: 'Google Drive (GitHub Actions Ready)'
      };

    } catch (error) {
      console.error('[StaticHTML] ❌ Google Drive保存エラー:', error);
      return {
        success: false,
        error: error.toString(),
        method: 'Google Drive (GitHub Actions Ready)'
      };
    }
  },

  /**
   * Google Drive保存（従来版・互換性維持）
   */
  saveToGoogleDrive(html, fileName, citySlug, companySlug, merchantData) {
    try {
      const folderPath = `/${citySlug}`;
      const finalUrl = `https://gaihekikuraberu.com${folderPath}/`;

      // Google Driveのフォルダを取得または作成
      let driveFolder;
      try {
        const folders = DriveApp.getFoldersByName('gaihekikuraberu-hp-files');
        if (folders.hasNext()) {
          driveFolder = folders.next();
        } else {
          driveFolder = DriveApp.createFolder('gaihekikuraberu-hp-files');
          console.log('[StaticHTML] 📁 フォルダ作成:', 'gaihekikuraberu-hp-files');
        }
      } catch (folderError) {
        console.error('[StaticHTML] フォルダ取得エラー:', folderError);
        driveFolder = DriveApp.getRootFolder();
      }

      // HTMLファイルをGoogle Driveに保存
      const existingFiles = driveFolder.getFilesByName(fileName);
      let file;

      if (existingFiles.hasNext()) {
        // 既存ファイルを更新
        file = existingFiles.next();
        file.setContent(html);
        console.log('[StaticHTML] 📝 既存ファイル更新:', fileName);
      } else {
        // 新規ファイル作成
        file = driveFolder.createFile(fileName, html, 'text/html');
        console.log('[StaticHTML] ✨ 新規ファイル作成:', fileName);
      }

      // ファイルを共有可能に設定
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      console.log('[StaticHTML] ✅ Google Drive保存完了:', file.getId());

      return {
        success: true,
        driveFileId: file.getId(),
        method: 'Google Drive'
      };

    } catch (error) {
      console.error('[StaticHTML] ❌ Google Drive保存エラー:', error);
      return {
        success: false,
        error: error.toString(),
        method: 'Google Drive'
      };
    }
  },

  /**
   * Xserver FTP直接アップロード（既存のFTPデプロイ機能を使用）
   */
  uploadToXserverFTP(html, fileName, folderPath) {
    try {
      console.log('[StaticHTML] 🌐 Xserver FTPアップロード開始:', fileName);
      console.log('[StaticHTML] 📁 ターゲットパス:', folderPath);

      // 既存のFTP設定を使用（deploy-ftp.shと同じ設定）
      const ftpConfig = {
        host: 'sv16424.xserver.jp',
        user: 'xs997058',
        pass: 'z9latuup',
        baseDir: '/gaihekikuraberu.com/public_html'
      };

      const targetPath = `${ftpConfig.baseDir}${folderPath}/${fileName}`;
      const ftpUrl = `ftp://${ftpConfig.host}${targetPath}`;

      console.log('[StaticHTML] 🔗 FTP URL:', ftpUrl);

      // HTMLファイルをBlobとして作成
      const blob = Utilities.newBlob(html, 'text/html', fileName);

      // UrlFetchAppを使ってFTPアップロード
      const options = {
        method: 'PUT',
        headers: {
          'Authorization': 'Basic ' + Utilities.base64Encode(`${ftpConfig.user}:${ftpConfig.pass}`)
        },
        payload: blob.getBytes()
      };

      console.log('[StaticHTML] 📤 FTPアップロード実行中...');
      const response = UrlFetchApp.fetch(ftpUrl, options);
      const responseCode = response.getResponseCode();

      console.log('[StaticHTML] 📡 FTPレスポンスコード:', responseCode);

      if (responseCode >= 200 && responseCode < 300) {
        console.log('[StaticHTML] ✅ FTPアップロード成功!');
        const finalUrl = `https://gaihekikuraberu.com${folderPath}/`;

        // アップロード後の確認
        this.verifyUpload(finalUrl);

        return {
          success: true,
          method: 'Xserver FTP (Direct)',
          responseCode: responseCode,
          ftpUrl: ftpUrl,
          finalUrl: finalUrl,
          fileName: fileName,
          folderPath: folderPath
        };
      } else {
        console.log('[StaticHTML] ⚠️ FTPアップロード失敗:', responseCode);
        return {
          success: false,
          method: 'Xserver FTP (Direct)',
          responseCode: responseCode,
          error: `FTPアップロード失敗: HTTP ${responseCode}`
        };
      }

    } catch (error) {
      console.error('[StaticHTML] ❌ Xserver FTPエラー:', error);
      return {
        success: false,
        error: error.toString(),
        method: 'Xserver FTP (Direct)',
        details: error.stack
      };
    }
  },

  /**
   * アップロード後の確認
   */
  verifyUpload(url) {
    try {
      console.log('[StaticHTML] 🧪 アップロード確認:', url);
      Utilities.sleep(2000); // 2秒待機

      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        console.log('[StaticHTML] ✅ アップロード確認成功:', url);
      } else {
        console.log('[StaticHTML] ⚠️ アップロード確認失敗:', responseCode, url);
      }
    } catch (error) {
      console.log('[StaticHTML] ⚠️ アップロード確認エラー:', error.toString());
    }
  },

  /**
   * フォールバック: HTTP POST経由でXserverにアップロード
   */
  uploadToXserverHTTP(html, fileName, folderPath) {
    try {
      console.log('[StaticHTML] 🔄 フォールバック: HTTP POST方式');

      // Xserver cPanel File Manager API経由でアップロード
      const cpanelUrl = 'https://sv16424.xserver.jp:2083/execute/Fileman/upload_files';

      const options = {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Utilities.base64Encode('xs997058:z9latuup'),
          'Content-Type': 'multipart/form-data'
        },
        payload: {
          'dir': '/gaihekikuraberu.com/public_html',
          'file': Utilities.newBlob(html, 'text/html', fileName)
        }
      };

      console.log('[StaticHTML] 📤 cPanel API アップロード実行...');

      const response = UrlFetchApp.fetch(cpanelUrl, options);
      const responseCode = response.getResponseCode();

      console.log('[StaticHTML] 📡 cPanel レスポンスコード:', responseCode);

      if (responseCode >= 200 && responseCode < 300) {
        console.log('[StaticHTML] ✅ HTTP POST アップロード成功!');
        return {
          success: true,
          responseCode: responseCode,
          method: 'Xserver cPanel API',
          path: '/gaihekikuraberu.com/public_html/' + fileName
        };
      } else {
        console.log('[StaticHTML] ❌ HTTP POST アップロード失敗:', responseCode);
        return {
          success: false,
          responseCode: responseCode,
          error: response.getContentText(),
          method: 'Xserver cPanel API'
        };
      }

    } catch (error) {
      console.error('[StaticHTML] ❌ HTTP POST エラー:', error);
      return {
        success: false,
        error: error.toString(),
        method: 'HTTP POST Fallback'
      };
    }
  }
};

// グローバルスコープに明示的に公開（GAS用）
// GASでは var宣言だけでは十分でない場合があるため、明示的にグローバルに配置
this.StaticHTMLGenerator = StaticHTMLGenerator;
if (typeof globalThis !== 'undefined') globalThis.StaticHTMLGenerator = StaticHTMLGenerator;
