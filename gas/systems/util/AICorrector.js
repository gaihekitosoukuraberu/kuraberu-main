/**
 * ============================================
 * AICorrector
 * ============================================
 * V1964: OpenRouter経由でDeepSeek AIを使用してテキスト補正
 * - Admin Dashboard メモモーダルのAI補正ボタン対応
 * - 音声入力の誤字脱字を自動補正
 *
 * 使用方法:
 * GASから: AICorrector.handle(params, null)
 * APIから: POST ?action=correctText&text=補正したいテキスト
 */

const AICorrector = {
  /**
   * メインハンドラー
   * @param {Object} params - リクエストパラメータ
   * @param {Object} context - コンテキスト（使用しない）
   * @return {Object} レスポンス
   */
  handle: function(params, context) {
    try {
      console.log('[AICorrector] テキスト補正リクエスト受信');
      console.log('[AICorrector] Original text:', params.text);

      // パラメータバリデーション
      if (!params.text) {
        return {
          success: false,
          error: 'text パラメータが必要です'
        };
      }

      // OpenRouter API経由でDeepSeekを呼び出し
      const correctedText = this.correctWithDeepSeek(params.text);

      return {
        success: true,
        correctedText: correctedText
      };

    } catch (error) {
      console.error('[AICorrector] エラー:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * OpenRouter API経由でDeepSeekを呼び出してテキスト補正
   * @param {string} text - 補正するテキスト
   * @return {string} 補正後のテキスト
   */
  correctWithDeepSeek: function(text) {
    try {
      // OpenRouter API Key取得
      const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY が未設定です');
      }

      console.log('[AICorrector] OpenRouter API呼び出し開始');

      // OpenRouter API エンドポイント
      const url = 'https://openrouter.ai/api/v1/chat/completions';

      // リクエストペイロード
      const payload = {
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '音声入力で生じた誤字脱字を予測して補正してください。日本語のビジネス文書として自然な文章に修正し、補正後のテキストのみを返してください。説明や追加コメントは不要です。'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      };

      // APIリクエスト
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': 'https://gaihekikuraberu.com',
          'X-Title': 'Admin Dashboard AI Corrector'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const statusCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('[AICorrector] API Response Status:', statusCode);

      if (statusCode !== 200) {
        console.error('[AICorrector] API Error:', responseText);
        throw new Error('OpenRouter API Error: ' + statusCode + ' ' + responseText);
      }

      const data = JSON.parse(responseText);

      if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenRouter APIから有効なレスポンスが返されませんでした');
      }

      const correctedText = data.choices[0].message.content.trim();

      console.log('[AICorrector] 補正完了:', correctedText);

      return correctedText;

    } catch (error) {
      console.error('[AICorrector] correctWithDeepSeek エラー:', error);
      throw error;
    }
  }
};
