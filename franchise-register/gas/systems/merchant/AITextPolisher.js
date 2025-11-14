/**
 * AI文章校正システム（OpenRouter + DeepSeek）
 *
 * 【目的】
 * - お客様の生々しい表現を丁寧なビジネス文書に変換
 * - コスト効率: DeepSeek使用で激安（$0.14/1M tokens）
 *
 * 【使用タイミング】
 * - textarea/textなどの自由記述がある場合のみ
 * - 選択肢や数字のみの場合はテンプレート使用（AI不使用）
 */

const AITextPolisher = {
  /**
   * OpenRouter経由でDeepSeekを使って文章を丁寧に変換
   * @param {Object} rawData - 生データ
   * @return {string} - 丁寧に変換された文章
   */
  polishCancelText: function(rawData) {
    try {
      console.log('[AITextPolisher] 文章生成開始');

      // APIキー取得
      const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
      if (!apiKey) {
        console.error('[AITextPolisher] OPENROUTER_API_KEY not found');
        return this.fallbackToTemplate(rawData);
      }

      // プロンプト構築
      const prompt = this.buildPrompt(rawData);
      console.log('[AITextPolisher] Prompt length:', prompt.length);

      // OpenRouter API呼び出し
      const payload = {
        model: 'deepseek/deepseek-chat', // 非常に安価（$0.14/1M tokens）
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3, // 低め（忠実な校正のため）
        max_tokens: 3000 // 長文対応（1000文字以上でも対応可能）
      };

      const options = {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gaihekikuraberu.com',
          'X-Title': 'Kuraberu Cancel System'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      console.log('[AITextPolisher] Calling OpenRouter API...');
      const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', options);
      const responseCode = response.getResponseCode();

      console.log('[AITextPolisher] Response code:', responseCode);

      if (responseCode !== 200) {
        console.error('[AITextPolisher] API error:', response.getContentText());
        return this.fallbackToTemplate(rawData);
      }

      const result = JSON.parse(response.getContentText());

      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('[AITextPolisher] Invalid response structure');
        return this.fallbackToTemplate(rawData);
      }

      const generatedText = result.choices[0].message.content.trim();
      console.log('[AITextPolisher] 生成成功, length:', generatedText.length);

      return generatedText;

    } catch (error) {
      console.error('[AITextPolisher] Error:', error);
      return this.fallbackToTemplate(rawData);
    }
  },

  /**
   * プロンプト構築
   */
  buildPrompt: function(data) {
    let prompt = `あなたは校正者です。以下のキャンセル申請文を、**必要最小限の修正のみ**で整えてください。

【重要ルール - 絶対厳守】
1. **原文の長さを維持する**（要約しない、省略しない、短くしない）
2. **感情表現やニュアンスをそのまま残す**（キレていたらキレている表現のまま）
3. 修正するのは以下のみ：
   - 誤字脱字の修正
   - 明らかな文法ミス
   - 読みにくい箇所のみ最小限の調整
4. 極端に不適切な表現（侮辱語など）のみ、若干丁寧にするが、温度感は保つ
5. **原文が長ければ長いまま出力する**（1000文字なら1000文字のまま）

【基本情報】
- お客様: ${data.customerName}様
- 電話番号: ${data.tel}
- 住所: ${data.address}
- キャンセル理由カテゴリ: ${data.categoryLabel}
- 詳細理由: ${data.subCategoryLabel}

【詳細情報・回答内容】
`;

    // 回答を見やすく整形
    if (data.answers && Object.keys(data.answers).length > 0) {
      for (const [question, answer] of Object.entries(data.answers)) {
        prompt += `- ${question}: ${answer}\n`;
      }
    }

    prompt += `
【指示】
上記の情報をもとに、ビジネス文書として自然な文章を生成してください。
ただし、**原文を尊重し、全ての情報を含め、修正は誤字脱字と文法のみ**。

【悪い例（要約してしまっている）】
「お客様から強いご不満があり、キャンセルを申請します。」
→ ダメ！詳細が全て省略されている

【良い例（原文を残しつつ最小限の修正）】
原文: 「ふざけんな　繋がってないのにかねとんじゃねーよ泥棒！」
修正後: 「ふざけるな。繋がっていないのに金を取るな、泥棒！」
→ 誤字脱字と句読点を整えただけ、感情はそのまま

【出力】
修正後の文章をそのまま出力してください。説明や前置きは不要です。`;

    return prompt;
  },

  /**
   * フォールバック: テンプレート生成
   */
  fallbackToTemplate: function(data) {
    console.log('[AITextPolisher] Using template fallback');

    let text = `${data.customerName}様（${data.tel}、${data.address}）について、キャンセル申請をいたします。\n\n`;
    text += `フォローアップを実施しましたが、${data.subCategoryLabel}という状況のため、対応が困難と判断いたしました。\n\n`;

    if (data.answers && Object.keys(data.answers).length > 0) {
      text += `【補足事項】\n`;
      for (const [question, answer] of Object.entries(data.answers)) {
        text += `・${question}: ${answer}\n`;
      }
      text += `\n`;
    }

    text += `以上の状況により、本案件のキャンセルを申請させていただきます。`;

    return text;
  },

  /**
   * SystemRouter用のハンドラー
   */
  handle: function(params) {
    const action = params.action;

    switch(action) {
      case 'generateAICancelText':
        // JSON文字列をパース
        let rawData = params.rawData;
        if (typeof rawData === 'string') {
          try {
            rawData = JSON.parse(rawData);
          } catch (e) {
            console.error('[AITextPolisher] Failed to parse rawData:', e);
            return {
              success: false,
              error: 'Invalid rawData format'
            };
          }
        }

        const polishedText = this.polishCancelText(rawData);

        return {
          success: true,
          generatedText: polishedText
        };

      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
