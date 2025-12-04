/**
 * 加盟店AI自動振り分けシステム（OpenRouter + DeepSeek）
 *
 * 【目的】
 * - 未振り分け案件をメンバーに自動で振り分け
 * - 成約率、エリア、均等分配などの条件を考慮
 * - コスト効率: DeepSeek使用で激安（$0.14/1M tokens）
 */

const MerchantAIAssign = {
  /**
   * AI自動振り分けを実行
   * @param {Object} params - パラメータ
   * @return {Object} - 振り分け結果
   */
  aiAssignCases: function(params) {
    try {
      console.log('[MerchantAIAssign] AI振り分け開始');

      const { cases, members, settings } = params;

      if (!cases || cases.length === 0) {
        return { success: false, error: '振り分け対象の案件がありません' };
      }

      if (!members || members.length === 0) {
        return { success: false, error: 'メンバーが登録されていません' };
      }

      // APIキー取得
      const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
      if (!apiKey) {
        console.log('[MerchantAIAssign] APIキーなし、フォールバック使用');
        return this.fallbackAssignment(cases, members, settings);
      }

      // プロンプト構築
      const prompt = this.buildPrompt(cases, members, settings);
      console.log('[MerchantAIAssign] Prompt length:', prompt.length);

      // OpenRouter API呼び出し
      const payload = {
        model: 'deepseek/deepseek-chat',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.2, // 低め（確定的な振り分けのため）
        max_tokens: 4000
      };

      const options = {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gaihekikuraberu.com',
          'X-Title': 'Kuraberu AI Assignment'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      console.log('[MerchantAIAssign] Calling OpenRouter API...');
      const response = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', options);
      const responseCode = response.getResponseCode();

      console.log('[MerchantAIAssign] Response code:', responseCode);

      if (responseCode !== 200) {
        console.error('[MerchantAIAssign] API error:', response.getContentText());
        return this.fallbackAssignment(cases, members, settings);
      }

      const result = JSON.parse(response.getContentText());

      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('[MerchantAIAssign] Invalid response structure');
        return this.fallbackAssignment(cases, members, settings);
      }

      const aiResponse = result.choices[0].message.content.trim();
      console.log('[MerchantAIAssign] AI応答:', aiResponse.substring(0, 200) + '...');

      // AIの応答をパース
      return this.parseAIResponse(aiResponse, cases, members);

    } catch (error) {
      console.error('[MerchantAIAssign] Error:', error);
      return this.fallbackAssignment(params.cases, params.members, params.settings);
    }
  },

  /**
   * プロンプト構築
   */
  buildPrompt: function(cases, members, settings) {
    const casesInfo = cases.map(c =>
      `- ID: ${c.cvId}, 顧客: ${c.customerName || '未設定'}, 住所: ${c.address || '未設定'}, 都道府県: ${c.prefecture || '未設定'}`
    ).join('\n');

    const membersInfo = members.map(m =>
      `- ID: ${m.memberId}, 名前: ${m.name}, 役職: ${m.role || 'standard'}`
    ).join('\n');

    // 設定情報を整形
    let criteriaText = [];
    if (settings.criteria.rate) criteriaText.push('成約率が高いメンバーに多く振り分け');
    if (settings.criteria.area) criteriaText.push('エリア・距離を考慮');
    if (settings.criteria.equal) criteriaText.push('できるだけ均等に分配');
    if (criteriaText.length === 0) criteriaText.push('均等に分配');

    // メンバー別分配率
    let ratioText = '';
    if (settings.memberRatios && Object.keys(settings.memberRatios).length > 0) {
      ratioText = '\n【メンバー別分配比率】\n';
      for (const [memberId, ratio] of Object.entries(settings.memberRatios)) {
        const member = members.find(m => m.memberId === memberId);
        if (member) {
          ratioText += `- ${member.name}: ${ratio}%\n`;
        }
      }
    }

    // 特殊ルール
    let rulesText = '';
    if (settings.specialRules && settings.specialRules.length > 0) {
      rulesText = '\n【特殊ルール】\n';
      for (const rule of settings.specialRules) {
        if (rule.startsWith('allInclude_')) {
          const memberId = rule.replace('allInclude_', '');
          const member = members.find(m => m.memberId === memberId);
          if (member) {
            rulesText += `- ${member.name}は全案件に含める\n`;
          }
        }
      }
    }

    const assignCount = settings.count || 1;

    return `あなたは営業案件の振り分けシステムです。以下の案件をメンバーに振り分けてください。

【振り分け基準】
${criteriaText.join('、')}
${ratioText}
${rulesText}

【1案件あたりの担当者数】
${assignCount}人

【案件一覧】
${casesInfo}

【メンバー一覧】
${membersInfo}

【出力形式】
以下のJSON形式で出力してください。説明は不要です。

{
  "assignments": [
    {"cvId": "案件ID", "memberId": "メンバーID", "memberName": "メンバー名"},
    ...
  ],
  "reason": "振り分けの理由（日本語で簡潔に）"
}

全ての案件を必ず振り分けてください。担当者数が${assignCount}人の場合、1つの案件に対して${assignCount}件の割り当てエントリを作成してください。`;
  },

  /**
   * AIの応答をパース
   */
  parseAIResponse: function(aiResponse, cases, members) {
    try {
      // JSON部分を抽出
      let jsonStr = aiResponse;

      // コードブロックで囲まれている場合は取り除く
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // { から始まる部分を抽出
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }

      const parsed = JSON.parse(jsonStr);

      if (!parsed.assignments || !Array.isArray(parsed.assignments)) {
        throw new Error('Invalid assignments format');
      }

      // メンバー名を補完（AIが間違えている可能性があるため）
      const validAssignments = parsed.assignments.map(a => {
        const member = members.find(m => m.memberId === a.memberId);
        return {
          cvId: a.cvId,
          memberId: a.memberId,
          memberName: member ? member.name : a.memberName,
          customerName: cases.find(c => c.cvId === a.cvId)?.customerName || ''
        };
      }).filter(a => a.memberId && a.cvId);

      return {
        success: true,
        assignments: validAssignments,
        reason: parsed.reason || 'AIが最適な振り分けを提案しました'
      };

    } catch (error) {
      console.error('[MerchantAIAssign] Parse error:', error, 'Response:', aiResponse.substring(0, 500));
      // パースに失敗した場合はフォールバック
      return this.fallbackAssignment(cases, members, { count: 1 });
    }
  },

  /**
   * フォールバック: 均等振り分け
   */
  fallbackAssignment: function(cases, members, settings) {
    console.log('[MerchantAIAssign] Using fallback assignment');

    const assignments = [];
    const assignCount = (settings && settings.count) || 1;

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i];

      // 担当者数分のエントリを作成
      for (let j = 0; j < assignCount; j++) {
        const memberIdx = (i + j) % members.length;
        const member = members[memberIdx];

        assignments.push({
          cvId: caseData.cvId,
          memberId: member.memberId,
          memberName: member.name,
          customerName: caseData.customerName || ''
        });
      }
    }

    return {
      success: true,
      assignments: assignments,
      reason: 'メンバーに均等に振り分けました'
    };
  }
};
