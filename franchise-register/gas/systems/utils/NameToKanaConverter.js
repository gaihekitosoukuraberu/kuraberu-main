/**
 * 名前→カナ変換ユーティリティ
 * Yahoo! ルビ振りAPIを使用して漢字名前をカタカナに変換
 */

const NameToKanaConverter = {

  /**
   * 名前をカタカナに変換
   * @param {string} name - 漢字の名前（例: 田中太郎）
   * @return {Object} - { success: boolean, kana: string, error?: string }
   */
  convertToKana(name) {
    try {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return {
          success: false,
          error: '名前が指定されていません'
        };
      }

      // Yahoo! APIキーを取得
      const scriptProperties = PropertiesService.getScriptProperties();
      const appId = scriptProperties.getProperty('YAHOO_APP_ID');

      if (!appId) {
        console.log('[NameToKanaConverter] Yahoo APP IDが設定されていません。OpenAIフォールバックを使用します。');
        return this.openAIFallback(name);
      }

      // Yahoo! ルビ振りAPIを呼び出し
      const url = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana';

      const payload = {
        id: '1',
        jsonrpc: '2.0',
        method: 'jlp.furiganaservice.furigana',
        params: {
          q: name,
          grade: 1 // 1=すべての漢字にルビを振る
        }
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'User-Agent': 'Yahoo AppID: ' + appId
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (statusCode !== 200) {
        console.error('[NameToKanaConverter] Yahoo API エラー:', statusCode, responseText);
        return this.openAIFallback(name);
      }

      const result = JSON.parse(responseText);

      if (!result.result || !result.result.word) {
        console.error('[NameToKanaConverter] 不正なレスポンス:', responseText);
        return this.openAIFallback(name);
      }

      // ルビ（読み仮名）を結合
      let kana = '';
      result.result.word.forEach(word => {
        if (word.furigana) {
          kana += word.furigana;
        } else {
          kana += word.surface; // ルビがない場合は元のテキスト
        }
      });

      // ひらがなをカタカナに変換
      const katakana = this.hiraganaToKatakana(kana);

      console.log(`[NameToKanaConverter] Yahoo API 変換成功: ${name} → ${katakana}`);

      return {
        success: true,
        kana: katakana
      };

    } catch (error) {
      console.error('[NameToKanaConverter] エラー:', error);
      return this.openAIFallback(name);
    }
  },

  /**
   * ひらがなをカタカナに変換
   */
  hiraganaToKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
      const chr = match.charCodeAt(0) + 0x60;
      return String.fromCharCode(chr);
    });
  },

  /**
   * OpenAI APIフォールバック（Yahoo APIが使えない場合）
   */
  openAIFallback(name) {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const apiKey = scriptProperties.getProperty('OPENAI_API_KEY');

      if (!apiKey) {
        console.log('[NameToKanaConverter] OpenAI APIキーもありません。簡易変換を使用します。');
        return this.fallbackConversion(name);
      }

      const url = 'https://api.openai.com/v1/chat/completions';

      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '日本人の名前の読み方を全角カタカナのみで返してください。説明不要、カタカナのみ。'
          },
          {
            role: 'user',
            content: name
          }
        ],
        temperature: 0.3,
        max_tokens: 30
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const statusCode = response.getResponseCode();

      if (statusCode !== 200) {
        console.error('[NameToKanaConverter] OpenAI API エラー:', statusCode);
        return this.fallbackConversion(name);
      }

      const result = JSON.parse(response.getContentText());
      const kana = result.choices[0].message.content.trim().replace(/[^ァ-ヴー]/g, '');

      console.log(`[NameToKanaConverter] OpenAI 変換成功: ${name} → ${kana}`);

      return {
        success: true,
        kana: kana,
        fallback: true
      };

    } catch (error) {
      console.error('[NameToKanaConverter] OpenAI フォールバックエラー:', error);
      return this.fallbackConversion(name);
    }
  },

  /**
   * フォールバック変換（APIが使えない場合）
   * 既にカタカナが含まれている場合はそれを返す、なければ空文字
   */
  fallbackConversion(name) {
    // カタカナのみを抽出
    const kana = name.replace(/[^ァ-ヴー]/g, '');

    if (kana) {
      return {
        success: true,
        kana: kana,
        fallback: true
      };
    }

    // カタカナが含まれていない場合は空文字を返す
    return {
      success: false,
      error: 'カタカナ変換APIが設定されていません',
      kana: '',
      fallback: true
    };
  }

};
