/**
 * ====================================
 * AI却下理由生成システム
 * ====================================
 *
 * 【機能】
 * - OpenRouter APIを使用したAI却下理由の生成
 * - キャンセル申請却下理由の生成
 * - 期限延長申請却下理由の生成
 * - コンテキストに応じた丁寧で建設的な理由文の作成
 *
 * 【依存関係】
 * - PropertiesService (OPENROUTER_API_KEY)
 *
 * 【使用例】
 * const reason = AIReasonGenerator.generateCancelRejectionReason({
 *   customerName: '田中太郎',
 *   phoneCallCount: 2,
 *   smsCount: 1,
 *   cancelReasonCategory: '電話繋がらず'
 * });
 */

const AIReasonGenerator = {

  /**
   * OpenRouter APIエンドポイント
   */
  API_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',

  /**
   * 使用するAIモデル
   * 参考: https://openrouter.ai/docs#models
   */
  MODEL: 'anthropic/claude-3.5-sonnet', // または 'openai/gpt-4-turbo' など

  /**
   * キャンセル申請却下理由を生成
   * @param {Object} data - {
   *   customerName: 顧客名,
   *   phoneCallCount: 電話回数,
   *   smsCount: SMS回数,
   *   cancelReasonCategory: キャンセル理由カテゴリ,
   *   cancelReasonDetail: キャンセル理由詳細,
   *   lastContactDate: 最終連絡日,
   *   hasActiveCompetitors: 他社追客フラグ,
   *   competitorDetails: 他社詳細
   * }
   * @return {Object} { success: Boolean, reason: String, error: String }
   */
  generateCancelRejectionReason(data) {
    try {
      console.log('[AIReasonGenerator] キャンセル却下理由生成開始');

      // プロンプト構築
      const systemPrompt = `あなたは外壁塗装くらべるAIの管理者として、加盟店からのキャンセル申請を却下する際の理由を生成するアシスタントです。

【重要な方針】
1. 丁寧で建設的な表現を使う
2. 具体的な改善提案を含める
3. 加盟店のモチベーションを下げず、前向きな追客を促す
4. 200文字以内で簡潔にまとめる
5. 敬語を使用する`;

      const userPrompt = `以下のキャンセル申請を却下する理由を生成してください。

【顧客情報】
- 顧客名: ${data.customerName}
- キャンセル理由: ${data.cancelReasonCategory} - ${data.cancelReasonDetail}

【追客状況】
- 電話回数: ${data.phoneCallCount || 0}回
- SMS回数: ${data.smsCount || 0}回
- 最終連絡日: ${data.lastContactDate ? this._formatDate(data.lastContactDate) : '不明'}

${data.hasActiveCompetitors ? `【重要】他社で追客活動が確認されています
${data.competitorDetails.map(c => `- ${c.merchantName}: 電話${c.phoneCount}回`).join('\n')}

競合他社が積極的に動いている中、この段階でのキャンセルは時期尚早です。` : ''}

却下理由を200文字以内で生成してください。改善提案を含めてください。`;

      // OpenRouter API呼び出し
      const apiResponse = this._callOpenRouterAPI(systemPrompt, userPrompt);

      if (!apiResponse.success) {
        console.error('[AIReasonGenerator] API呼び出し失敗:', apiResponse.error);
        // フォールバック: デフォルトの却下理由を返す
        return {
          success: true,
          reason: this._getDefaultCancelRejectionReason(data),
          fallback: true
        };
      }

      console.log('[AIReasonGenerator] 却下理由生成成功');

      return {
        success: true,
        reason: apiResponse.content,
        fallback: false
      };

    } catch (error) {
      console.error('[AIReasonGenerator] 却下理由生成エラー:', error);
      return {
        success: true,
        reason: this._getDefaultCancelRejectionReason(data),
        fallback: true,
        error: error.toString()
      };
    }
  },

  /**
   * 期限延長申請却下理由を生成
   * @param {Object} data - {
   *   customerName: 顧客名,
   *   contactDate: 連絡がついた日時,
   *   appointmentDate: アポ予定日,
   *   extensionReason: 延長理由,
   *   currentDeadline: 現在の期限,
   *   phoneCallCount: 電話回数,
   *   smsCount: SMS回数
   * }
   * @return {Object} { success: Boolean, reason: String, error: String }
   */
  generateExtensionRejectionReason(data) {
    try {
      console.log('[AIReasonGenerator] 期限延長却下理由生成開始');

      const systemPrompt = `あなたは外壁塗装くらべるAIの管理者として、加盟店からの期限延長申請を却下する際の理由を生成するアシスタントです。

【重要な方針】
1. 丁寧で建設的な表現を使う
2. 具体的な改善提案を含める
3. 加盟店のモチベーションを下げず、より積極的な追客を促す
4. 200文字以内で簡潔にまとめる
5. 敬語を使用する`;

      const userPrompt = `以下の期限延長申請を却下する理由を生成してください。

【顧客情報】
- 顧客名: ${data.customerName}
- 延長理由: ${data.extensionReason}

【進捗状況】
- 連絡がついた日: ${data.contactDate ? this._formatDate(data.contactDate) : '不明'}
- アポ予定日: ${data.appointmentDate ? this._formatDate(data.appointmentDate) : '未設定'}
- 電話回数: ${data.phoneCallCount || 0}回
- SMS回数: ${data.smsCount || 0}回
- 現在の期限: ${data.currentDeadline ? this._formatDate(data.currentDeadline) : '不明'}

却下理由を200文字以内で生成してください。より積極的な追客を促す内容にしてください。`;

      // OpenRouter API呼び出し
      const apiResponse = this._callOpenRouterAPI(systemPrompt, userPrompt);

      if (!apiResponse.success) {
        console.error('[AIReasonGenerator] API呼び出し失敗:', apiResponse.error);
        return {
          success: true,
          reason: this._getDefaultExtensionRejectionReason(data),
          fallback: true
        };
      }

      console.log('[AIReasonGenerator] 却下理由生成成功');

      return {
        success: true,
        reason: apiResponse.content,
        fallback: false
      };

    } catch (error) {
      console.error('[AIReasonGenerator] 却下理由生成エラー:', error);
      return {
        success: true,
        reason: this._getDefaultExtensionRejectionReason(data),
        fallback: true,
        error: error.toString()
      };
    }
  },

  /**
   * OpenRouter APIを呼び出し
   * @param {String} systemPrompt - システムプロンプト
   * @param {String} userPrompt - ユーザープロンプト
   * @return {Object} { success: Boolean, content: String, error: String }
   * @private
   */
  _callOpenRouterAPI(systemPrompt, userPrompt) {
    try {
      const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

      if (!apiKey) {
        console.error('[AIReasonGenerator] OPENROUTER_API_KEYが設定されていません');
        return {
          success: false,
          error: 'API key not configured'
        };
      }

      const payload = {
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'HTTP-Referer': 'https://kuraberu.ai', // オプション: あなたのサイトURL
          'X-Title': '外壁塗装くらべるAI' // オプション: アプリ名
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      console.log('[AIReasonGenerator] OpenRouter API呼び出し中...');

      const response = UrlFetchApp.fetch(this.API_ENDPOINT, options);
      const responseCode = response.getResponseCode();

      if (responseCode !== 200) {
        const errorText = response.getContentText();
        console.error('[AIReasonGenerator] API Error (Status:', responseCode, '):', errorText);
        return {
          success: false,
          error: `API returned status ${responseCode}: ${errorText}`
        };
      }

      const responseData = JSON.parse(response.getContentText());

      if (!responseData.choices || responseData.choices.length === 0) {
        console.error('[AIReasonGenerator] No choices in response');
        return {
          success: false,
          error: 'No choices in API response'
        };
      }

      const generatedContent = responseData.choices[0].message.content.trim();

      console.log('[AIReasonGenerator] API呼び出し成功');
      console.log('[AIReasonGenerator] 生成されたコンテンツ:', generatedContent);

      return {
        success: true,
        content: generatedContent
      };

    } catch (error) {
      console.error('[AIReasonGenerator] API呼び出しエラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * デフォルトのキャンセル却下理由を取得（API失敗時のフォールバック）
   * @param {Object} data - 申請データ
   * @return {String} 却下理由
   * @private
   */
  _getDefaultCancelRejectionReason(data) {
    const phoneCount = data.phoneCallCount || 0;
    const smsCount = data.smsCount || 0;

    if (data.hasActiveCompetitors) {
      return `他社が積極的に追客活動を行っている状況です。現在の電話回数${phoneCount}回、SMS${smsCount}回では追客努力が不足しています。競合に負けないよう、より積極的な追客をお願いいたします。お客様との接点を増やし、信頼関係を構築することで成約の可能性が高まります。`;
    }

    if (phoneCount < 5) {
      return `現在の追客回数（電話${phoneCount}回、SMS${smsCount}回）では十分とは言えません。お客様との接点を増やすことで、ニーズを引き出せる可能性があります。時間帯を変えて再度架電する、SMSで訪問希望日を提案するなど、工夫した追客をお願いいたします。`;
    }

    return `追客を継続してください。お客様との接点を増やし、信頼関係を構築することで成約の可能性が高まります。時間帯を変えた架電や、具体的な提案を含めたSMSの送信など、工夫した追客をお願いいたします。`;
  },

  /**
   * デフォルトの期限延長却下理由を取得（API失敗時のフォールバック）
   * @param {Object} data - 申請データ
   * @return {String} 却下理由
   * @private
   */
  _getDefaultExtensionRejectionReason(data) {
    const phoneCount = data.phoneCallCount || 0;

    if (!data.appointmentDate) {
      return `アポイントメント日時が未設定のため、延長申請は認められません。まずはお客様とのアポイントを確定させ、具体的な進捗を作ってください。電話回数を増やし、訪問日時の調整を最優先で進めてください。`;
    }

    if (phoneCount < 3) {
      return `現在の進捗状況（電話${phoneCount}回）では延長は認められません。より積極的な追客活動をお願いいたします。お客様との接点を増やし、成約に向けた具体的なアクションを取ってください。`;
    }

    return `現在の進捗状況では延長は認められません。アポイントを確実に実施し、見積もり提示まで進めてください。より積極的な追客活動をお願いいたします。`;
  },

  /**
   * 日時フォーマット
   * @param {Date} date - 日時
   * @return {String} フォーマット済み文字列
   * @private
   */
  _formatDate(date) {
    if (!date) return '不明';

    try {
      if (typeof date === 'string') {
        date = new Date(date);
      }
      return Utilities.formatDate(date, 'JST', 'yyyy年MM月dd日');
    } catch (error) {
      console.error('[AIReasonGenerator] 日時フォーマットエラー:', error);
      return '日時不明';
    }
  }

};
