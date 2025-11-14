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
        temperature: 0.5, // やや控えめ（安定した出力）
        max_tokens: 600 // 日本語で200-300文字程度
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
    let prompt = `あなたはプロのビジネスライターです。以下のキャンセル申請情報を、簡潔で丁寧なビジネス文書（200-300文字程度）に変換してください。

【重要ルール】
1. お客様からの生々しい表現や感情的な言葉は、丁寧でプロフェッショナルな表現に書き換えるが、**伝えたい内容や事実は一切省略しない**
2. クレームの温度感（強さ）は必ず残す。例：「強いご不満」「厳しいご指摘」「ご立腹」「激しいお怒り」など
3. テンプレート的な表現を避け、自然で読みやすい文章にする
4. 必ず日本語で出力する
5. 簡潔に（200-300文字程度）

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
【出力形式】
- 段落1: お客様情報とキャンセル申請の旨を簡潔に
- 段落2: 具体的な状況説明（丁寧な表現で、フォローアップの努力を含む）
- 段落3: 簡潔な結び

【出力例】
テスト太郎様（03-1234-5678、東京都渋谷区）について、キャンセル申請をいたします。

複数回のフォローアップを実施いたしましたが、電話・SMSともに一度も連絡が繋がらない状況が続いております。電話は5回、SMSは3回試みましたが、いずれも応答がなく、対応が困難と判断いたしました。

以上の状況により、本案件のキャンセルを申請させていただきます。`;

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
