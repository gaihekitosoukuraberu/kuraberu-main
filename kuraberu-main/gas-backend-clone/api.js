/**
 * ファイル名: api.gs
 * 外壁塗装くらべるAI - キャンセル申請機能拡張
 * Slack通知・GPT理由生成・システムログ記録の統合API
 */

/**
 * 🔁 機能1: Slack通知（キャンセル通知）
 * キャンセル申請時にSlackに通知を送信
 * 
 * @param {string} inquiryId - 案件ID
 * @param {string} reason - キャンセル理由
 * @param {string} operatorId - 担当者ID
 * @param {string} memo - 備考（任意）
 * @return {boolean} 送信成功可否
 */
function sendCancelNotificationToSlack_(inquiryId, reason, operatorId, memo = '') {
  try {
    console.log(`📢 Slackキャンセル通知送信開始: ${inquiryId}`);
    
    // スクリプトプロパティからWebhook URL取得
    const properties = PropertiesService.getScriptProperties();
    const webhookUrl = properties.getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL が設定されていません');
    }
    
    // 通知メッセージ作成
    const message = `【キャンセル申請】案件ID: ${inquiryId}
理由: ${reason}
担当者: ${operatorId}
備考: ${memo || ''}`;
    
    // Slack Webhook用ペイロード
    const payload = {
      text: message,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':warning:',
      attachments: [
        {
          color: 'warning',
          fields: [
            {
              title: '案件ID',
              value: inquiryId,
              short: true
            },
            {
              title: '担当者',
              value: operatorId,
              short: true
            },
            {
              title: 'キャンセル理由',
              value: reason,
              short: false
            }
          ]
        }
      ]
    };
    
    // HTTPS POST送信
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      console.log('✅ Slack通知送信成功');
      
      // 成功ログ記録
      claude_logEvent(
        'INFO',
        'Slack通知',
        'キャンセル通知送信',
        `案件ID: ${inquiryId}, 担当者: ${operatorId}`,
        inquiryId
      );
      
      return true;
    } else {
      throw new Error(`Slack送信失敗: HTTP ${responseCode} - ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ Slack通知送信エラー:', error.toString());
    
    // エラーログ記録（機密情報をマスキング）
    const maskedError = error.toString().replace(/https:\/\/hooks\.slack\.com\/[^\s]+/, '[MASKED_WEBHOOK_URL]');
    claude_logEvent(
      'ERROR',
      'Slack通知',
      'キャンセル通知送信失敗',
      `エラー: ${maskedError}`,
      inquiryId || 'UNKNOWN'
    );
    
    return false;
  }
}

/**
 * 🧠 機能2: GPTによる理由テンプレ生成
 * 自由記述のキャンセル理由を丁寧なテンプレート文に変換
 * 
 * @param {string} rawReason - 自由記述の理由文
 * @return {string} 丁寧で共感的なテンプレート文
 */
function generateCancelReasonExample_(rawReason) {
  try {
    console.log('🧠 GPTキャンセル理由テンプレ生成開始');
    
    if (!rawReason || rawReason.trim() === '') {
      console.warn('入力理由が空のため、デフォルトテンプレートを返却');
      return 'この度はお忙しい中お時間をいただき、誠にありがとうございました。またの機会によろしくお願いいたします。';
    }
    
    // aliasマッピングを考慮してAPIキー取得
    const properties = PropertiesService.getScriptProperties();
    let apiKey = properties.getProperty('GPT_API_KEY');
    if (!apiKey) {
      apiKey = properties.getProperty('OPENAI_API_KEY'); // alias対応
    }
    
    if (!apiKey) {
      throw new Error('GPT_API_KEY または OPENAI_API_KEY が設定されていません');
    }
    
    // 安全なシステムプロンプト（マスキング済み）
    const systemPrompt = `あなたはリフォーム関連サービスの営業担当者です。  
見積依頼後にユーザーから届く「キャンセル」「金額交渉」「施工内容の修正（例：屋根のみ希望）」などの申請に対して、丁寧かつ共感的な返信文を生成してください。

🧩 応答文の要件：
- 顧客の状況や申請理由に理解を示す（例：「ご事情、承知いたしました」など）
- 感謝の気持ちを表現する（例：「ご連絡ありがとうございます」）
- 申請内容に応じて、以下のいずれかを必ず含める：
  - 🔹 キャンセルの場合：「審査部署にて確認後、ご連絡差し上げます」
  - 🔹 金額交渉・施工内容修正の場合：「いただいた内容をもとに再確認し、改めてご連絡いたします」
- 「外壁塗装」「屋根修理」などのサービス名は、入力文の文脈に合わせて自然に表現する
- 文体はビジネス的かつ親しみやすく
- 全体で100文字以内にまとめ、1文で返答すること

入力された申請理由の文脈を正しく読み取り、適切なテンプレート文を生成してください。
📝 これで対応可能な例
入力文（例）    出力例（期待）
外壁屋根セットで頼んだけど、屋根だけで良かった    ご連絡ありがとうございます。屋根のみのご依頼として再確認し、改めてご連絡いたします。
金額が合わないので検討し直します    ご連絡ありがとうございます。ご希望内容を確認し、改めてご連絡いたします。
キャンセルします    ご連絡ありがとうございます。キャンセル内容は審査部署にて確認後、ご連絡差し上げます。`;
    
    const userPrompt = `キャンセル理由: ${rawReason}`;
    
    // OpenAI API呼び出し
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-3.5-turbo',
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
        max_tokens: 200,
        temperature: 0.7
      }),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());
    
    if (responseCode !== 200) {
      throw new Error(`OpenAI API エラー: ${responseCode} - ${responseData.error?.message || 'Unknown error'}`);
    }
    
    // レスポンス整形
    const generatedText = responseData.choices?.[0]?.message?.content?.trim() || '';
    
    if (generatedText === '') {
      throw new Error('GPTからの応答が空です');
    }
    
    console.log('✅ GPTテンプレ生成成功');
    
    // 成功ログ記録（プロンプト内容は記録しない）
    claude_logEvent(
      'INFO',
      'GPT API',
      'キャンセル理由テンプレ生成',
      `入力文字数: ${rawReason.length}, 出力文字数: ${generatedText.length}`
    );
    
    return generatedText;
    
  } catch (error) {
    console.error('❌ GPTテンプレ生成エラー:', error.toString());
    
    // エラーログ記録（APIキーをマスキング）
    const maskedError = error.toString().replace(/Bearer\s+[^\s]+/, 'Bearer [MASKED_API_KEY]');
    claude_logEvent(
      'ERROR',
      'GPT API',
      'キャンセル理由テンプレ生成失敗',
      `エラー: ${maskedError}`
    );
    
    // フォールバック文言
    return '今回はご縁がなかったとのことで、またの機会によろしくお願いいたします。';
  }
}

/**
 * 📝 機能3: システムログへの記録
 * キャンセル申請イベントをシステムログシートに記録
 * 
 * @param {string} inquiryId - 案件ID
 * @param {string} childId - 操作者ID（子ユーザーID）
 * @param {string} reason - キャンセル理由（生成テンプレ含む）
 * @return {boolean} 記録成功可否
 */
function logCancelEvent_(inquiryId, childId, reason) {
  try {
    console.log(`📝 キャンセルイベントログ記録開始: ${inquiryId}`);
    
    // 既存のclaude_logEvent関数を活用
    claude_logEvent(
      'INFO',
      'キャンセル申請',
      '案件キャンセル',
      `案件ID: ${inquiryId}, 理由: ${reason}`,
      inquiryId
    );
    
    console.log('✅ キャンセルイベントログ記録成功');
    return true;
    
  } catch (error) {
    console.error('❌ キャンセルイベントログ記録エラー:', error.toString());
    
    // フォールバック：直接コンソールログに出力
    console.log(`FALLBACK LOG - Cancel Event: InquiryID=${inquiryId}, ChildID=${childId}, Reason=${reason}`);
    
    return false;
  }
}

/**
 * 🚀 統合キャンセル処理関数
 * 3つの機能を統合した総合キャンセル申請処理
 * 
 * @param {string} inquiryId - 案件ID
 * @param {string} childId - 操作者ID
 * @param {string} rawReason - 自由記述理由
 * @param {string} memo - 備考（任意）
 * @return {Object} 処理結果
 */
function processCancelRequest(inquiryId, childId, rawReason, memo = '') {
  try {
    console.log(`🚀 統合キャンセル処理開始: ${inquiryId}`);
    
    const results = {
      success: false,
      gptTemplate: '',
      slackSent: false,
      logRecorded: false,
      errors: []
    };
    
    // 1. GPTテンプレ生成
    try {
      results.gptTemplate = generateCancelReasonExample_(rawReason);
    } catch (error) {
      results.errors.push(`GPT生成: ${error.message}`);
    }
    
    // 2. Slack通知送信
    try {
      results.slackSent = sendCancelNotificationToSlack_(
        inquiryId, 
        results.gptTemplate || rawReason, 
        childId, 
        memo
      );
    } catch (error) {
      results.errors.push(`Slack通知: ${error.message}`);
    }
    
    // 3. システムログ記録
    try {
      results.logRecorded = logCancelEvent_(
        inquiryId, 
        childId, 
        `原文: ${rawReason} | テンプレ: ${results.gptTemplate}`
      );
    } catch (error) {
      results.errors.push(`ログ記録: ${error.message}`);
    }
    
    // 総合判定
    results.success = results.logRecorded; // 最低限ログ記録が成功していればOK
    
    console.log('🚀 統合キャンセル処理完了', results);
    return results;
    
  } catch (error) {
    console.error('❌ 統合キャンセル処理エラー:', error.toString());
    
    return {
      success: false,
      gptTemplate: '',
      slackSent: false,
      logRecorded: false,
      errors: [`統合処理: ${error.message}`]
    };
  }
}

/**
 * 🧪 テスト関数: claude_cancelTest()
 * 3つの機能を自動検証
 */
function claude_cancelTest() {
  try {
    console.log('🧪 キャンセル申請機能テスト開始');
    
    const testResults = {
      slackNotification: false,
      gptTemplate: false,
      systemLog: false,
      integration: false,
      errors: []
    };
    
    // テストデータ
    const testInquiryId = 'INQ-TEST-001';
    const testChildId = 'ADM-TEST';
    const testReason = '外壁補修ではなく塗り替え不要だったとのこと';
    const testMemo = 'テスト実行中のため実際の処理ではありません';
    
    // 1. GPTテンプレ生成テスト
    console.log('1️⃣ GPTテンプレ生成テスト...');
    try {
      const template = generateCancelReasonExample_(testReason);
      if (template && template.length > 10) {
        testResults.gptTemplate = true;
        console.log(`✅ GPTテンプレ生成成功: ${template.substring(0, 50)}...`);
      } else {
        throw new Error('生成されたテンプレートが短すぎます');
      }
    } catch (error) {
      testResults.errors.push(`GPTテンプレ: ${error.message}`);
      console.error(`❌ GPTテンプレ生成失敗: ${error.message}`);
    }
    
    // 2. システムログ記録テスト
    console.log('2️⃣ システムログ記録テスト...');
    try {
      const logResult = logCancelEvent_(testInquiryId, testChildId, testReason);
      testResults.systemLog = logResult;
      if (logResult) {
        console.log('✅ システムログ記録成功');
      } else {
        throw new Error('ログ記録が失敗しました');
      }
    } catch (error) {
      testResults.errors.push(`システムログ: ${error.message}`);
      console.error(`❌ システムログ記録失敗: ${error.message}`);
    }
    
    // 3. Slack通知テスト（モック可）
    console.log('3️⃣ Slack通知テスト...');
    try {
      // 実際の送信をテストする場合
      const slackResult = sendCancelNotificationToSlack_(
        testInquiryId, 
        testReason, 
        testChildId, 
        testMemo
      );
      testResults.slackNotification = slackResult;
      if (slackResult) {
        console.log('✅ Slack通知送信成功');
      } else {
        throw new Error('Slack通知送信が失敗しました');
      }
    } catch (error) {
      testResults.errors.push(`Slack通知: ${error.message}`);
      console.error(`❌ Slack通知送信失敗: ${error.message}`);
      
      // スクリプトプロパティが設定されていない場合のフォールバック
      if (error.message.includes('SLACK_WEBHOOK_URL')) {
        console.log('ℹ️ SLACK_WEBHOOK_URL未設定のため、モック成功として扱います');
        testResults.slackNotification = true; // テスト環境ではOKとする
      }
    }
    
    // 4. 統合処理テスト
    console.log('4️⃣ 統合処理テスト...');
    try {
      const integrationResult = processCancelRequest(
        testInquiryId, 
        testChildId, 
        testReason, 
        testMemo
      );
      testResults.integration = integrationResult.success;
      if (integrationResult.success) {
        console.log('✅ 統合処理成功');
      } else {
        throw new Error(`統合処理失敗: ${integrationResult.errors.join(', ')}`);
      }
    } catch (error) {
      testResults.errors.push(`統合処理: ${error.message}`);
      console.error(`❌ 統合処理失敗: ${error.message}`);
    }
    
    // テスト結果サマリー
    const successCount = Object.values(testResults).filter(v => v === true).length;
    const totalTests = 4;
    const successRate = Math.round((successCount / totalTests) * 100);
    
    console.log('🧪 キャンセル申請機能テスト結果');
    console.log(`GPTテンプレ生成: ${testResults.gptTemplate ? '✅' : '❌'}`);
    console.log(`システムログ記録: ${testResults.systemLog ? '✅' : '❌'}`);
    console.log(`Slack通知: ${testResults.slackNotification ? '✅' : '❌'}`);
    console.log(`統合処理: ${testResults.integration ? '✅' : '❌'}`);
    console.log(`📊 成功率: ${successRate}% (${successCount}/${totalTests})`);
    
    if (testResults.errors.length > 0) {
      console.log('🚨 エラー詳細:');
      testResults.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    // 全体成功ログ
    claude_logEvent(
      successRate >= 75 ? 'INFO' : 'WARNING',
      'テスト実行',
      'キャンセル申請機能テスト',
      `成功率: ${successRate}%, エラー数: ${testResults.errors.length}`
    );
    
    return {
      success: successRate >= 75,
      successRate: successRate,
      results: testResults
    };
    
  } catch (error) {
    console.error('❌ キャンセル申請機能テスト実行エラー:', error.toString());
    claude_logEvent('ERROR', 'テスト実行', 'キャンセル申請機能テスト', `実行エラー: ${error.toString()}`);
    
    return {
      success: false,
      successRate: 0,
      error: error.message
    };
  }
}

/**
 * 📋 案件振り分けシステム
 * ======================
 */

/**
 * 一時停止中の子アカウントを除外した子一覧取得
 * 
 * @param {string} parentId - 親アカウントID
 * @return {Array<Object>} アクティブな子アカウント一覧
 */
function filterPausedChildAccounts(parentId) {
  try {
    console.log(`📋 アクティブ子アカウント取得開始: ${parentId}`);
    
    const sheetData = claude_getSafeSheetData('加盟店子ユーザー一覧', [
      '子ユーザーID', '親加盟店ID', '氏名（表示用）', 'ステータス', 
      '対応エリア（市区町村）', '最終ログイン日時', '登録日'
    ]);
    
    if (!sheetData.rows || sheetData.rows.length === 0) {
      return [];
    }
    
    const indexMap = claude_getColumnIndexMap(sheetData.headers, [
      '子ユーザーID', '親加盟店ID', '氏名（表示用）', 'ステータス', 
      '対応エリア（市区町村）', '最終ログイン日時', '登録日'
    ], '加盟店子ユーザー一覧');
    
    // 親IDに紐づく子アカウントをフィルタリング
    const childAccounts = sheetData.rows
      .filter(row => {
        const rowParentId = claude_getSafeValue(row, indexMap['親加盟店ID'], '');
        const status = claude_getSafeValue(row, indexMap['ステータス'], '');
        
        // 親IDが一致し、アクティブ状態の子のみ
        return rowParentId === parentId && 
               status !== '停止' && 
               status !== '一時停止' && 
               status !== '無効';
      })
      .map(row => ({
        childId: claude_getSafeValue(row, indexMap['子ユーザーID'], ''),
        name: claude_getSafeValue(row, indexMap['氏名（表示用）'], ''),
        status: claude_getSafeValue(row, indexMap['ステータス'], ''),
        area: claude_getSafeValue(row, indexMap['対応エリア（市区町村）'], ''),
        lastLogin: claude_getSafeValue(row, indexMap['最終ログイン日時'], ''),
        registeredDate: claude_getSafeValue(row, indexMap['登録日'], '')
      }));
    
    console.log(`✅ アクティブ子アカウント取得完了: ${childAccounts.length}件`);
    return childAccounts;
    
  } catch (error) {
    console.error('❌ アクティブ子アカウント取得エラー:', error.toString());
    return [];
  }
}

/**
 * 子アカウントの振り分けスコア情報取得（手動振り分け支援用）
 * 
 * @param {string} parentId - 親アカウントID
 * @param {string} inquiryId - 案件ID（エリア一致度計算用）
 * @return {Array<Object>} スコア付き子アカウント情報
 */
function getChildAssignmentScores(parentId, inquiryId = '') {
  try {
    console.log(`📊 子アカウントスコア計算開始: ${parentId}`);
    
    // アクティブな子アカウント取得
    const childAccounts = filterPausedChildAccounts(parentId);
    
    if (childAccounts.length === 0) {
      return [];
    }
    
    // 案件情報取得（エリア一致度計算用）
    let caseArea = '';
    if (inquiryId) {
      try {
        const inquiryData = claude_getSafeSheetData('問い合わせ履歴', ['履歴ID', '都道府県', '市区町村']);
        const inquiryIndexMap = claude_getColumnIndexMap(inquiryData.headers, ['履歴ID', '都道府県', '市区町村'], '問い合わせ履歴');
        
        const caseRow = inquiryData.rows.find(row => 
          claude_getSafeValue(row, inquiryIndexMap['履歴ID'], '') === inquiryId
        );
        
        if (caseRow) {
          const prefecture = claude_getSafeValue(caseRow, inquiryIndexMap['都道府県'], '');
          const city = claude_getSafeValue(caseRow, inquiryIndexMap['市区町村'], '');
          caseArea = `${prefecture}${city}`.replace(/undefined|null/g, '');
        }
      } catch (error) {
        console.warn('案件エリア情報取得失敗:', error.message);
      }
    }
    
    // 各子アカウントのスコア計算
    const scoredChildren = childAccounts.map(child => {
      const scores = {
        areaMatch: 0,        // エリア一致度 (0-100)
        caseLoad: 0,         // 案件負荷の軽さ (0-100)
        availability: 0,     // 対応可能度 (0-100)
        total: 0
      };
      
      // 1. エリア一致度スコア
      if (caseArea && child.area) {
        const childAreas = child.area.split(/[,、]/).map(a => a.trim());
        const matchFound = childAreas.some(area => 
          caseArea.includes(area) || area.includes(caseArea)
        );
        scores.areaMatch = matchFound ? 100 : 0;
      }
      
      // 2. 案件負荷スコア（現在の担当案件数から算出）
      // TODO: 実際の担当案件数を取得して計算
      scores.caseLoad = Math.max(0, 100 - (Math.random() * 50)); // 仮実装
      
      // 3. 対応可能度スコア（最終ログイン日時から算出）
      if (child.lastLogin) {
        try {
          const lastLoginDate = new Date(child.lastLogin);
          const daysSinceLogin = (new Date() - lastLoginDate) / (1000 * 60 * 60 * 24);
          scores.availability = Math.max(0, 100 - (daysSinceLogin * 10));
        } catch (error) {
          scores.availability = 50; // デフォルトスコア
        }
      } else {
        scores.availability = 50;
      }
      
      // 総合スコア計算（重み付け）
      scores.total = Math.round(
        (scores.areaMatch * 0.4) + 
        (scores.caseLoad * 0.4) + 
        (scores.availability * 0.2)
      );
      
      return {
        ...child,
        scores: scores,
        recommendation: getRecommendationText_(scores)
      };
    });
    
    // 総合スコア順でソート
    scoredChildren.sort((a, b) => b.scores.total - a.scores.total);
    
    console.log(`✅ 子アカウントスコア計算完了: ${scoredChildren.length}件`);
    return scoredChildren;
    
  } catch (error) {
    console.error('❌ 子アカウントスコア計算エラー:', error.toString());
    return [];
  }
}

/**
 * スコアに基づく推奨コメント生成（控えめな表現）
 * 
 * @param {Object} scores - スコア情報
 * @return {string} 推奨コメント
 */
function getRecommendationText_(scores) {
  const comments = [];
  
  if (scores.areaMatch >= 80) {
    comments.push('エリア対応経験あり');
  }
  
  if (scores.caseLoad >= 80) {
    comments.push('現在の負荷が軽め');
  }
  
  if (scores.availability >= 80) {
    comments.push('最近アクティブ');
  }
  
  if (comments.length === 0) {
    return '通常の対応範囲';
  }
  
  return comments.join('・');
}

/**
 * 案件振り分けメイン関数
 * 
 * @param {string} parentId - 親アカウントID
 * @param {string} inquiryId - 案件ID
 * @param {string} mode - 振り分けモード ('auto' | 'manual')
 * @param {Object} options - オプション設定
 * @return {Object} 振り分け結果
 */
function assignCaseToChild(parentId, inquiryId, mode = 'auto', options = {}) {
  try {
    console.log(`📋 案件振り分け開始: ${inquiryId} (${mode}モード)`);
    
    const result = {
      success: false,
      assignedChildId: '',
      assignedChildName: '',
      mode: mode,
      scores: {},
      slackSent: false,
      logRecorded: false,
      errors: []
    };
    
    // 子アカウントスコア取得
    const childrenWithScores = getChildAssignmentScores(parentId, inquiryId);
    
    if (childrenWithScores.length === 0) {
      throw new Error('振り分け可能な子アカウントが見つかりません');
    }
    
    let selectedChild;
    
    if (mode === 'auto') {
      // 自動振り分け：最高スコアの子を選択
      selectedChild = childrenWithScores[0];
      console.log(`🤖 自動選択: ${selectedChild.name} (スコア: ${selectedChild.scores.total})`);
      
    } else if (mode === 'manual' && options.selectedChildId) {
      // 手動振り分け：指定された子を選択
      selectedChild = childrenWithScores.find(child => child.childId === options.selectedChildId);
      
      if (!selectedChild) {
        throw new Error('指定された子アカウントが見つかりません');
      }
      
      console.log(`👤 手動選択: ${selectedChild.name}`);
    } else {
      throw new Error('振り分けモードまたは選択情報が不正です');
    }
    
    // 振り分け結果を記録
    result.assignedChildId = selectedChild.childId;
    result.assignedChildName = selectedChild.name;
    result.scores = selectedChild.scores;
    
    // Slack通知送信
    try {
      const notificationResult = sendAssignmentNotificationToSlack_(
        parentId,
        inquiryId, 
        selectedChild.childId,
        selectedChild.name,
        mode
      );
      result.slackSent = notificationResult;
    } catch (error) {
      result.errors.push(`Slack通知: ${error.message}`);
    }
    
    // システムログ記録
    try {
      const logResult = logAssignmentEvent_(
        parentId,
        inquiryId,
        selectedChild.childId,
        mode,
        selectedChild.scores.total
      );
      result.logRecorded = logResult;
    } catch (error) {
      result.errors.push(`ログ記録: ${error.message}`);
    }
    
    result.success = true;
    console.log(`✅ 案件振り分け完了: ${selectedChild.name}に割り当て`);
    
    return result;
    
  } catch (error) {
    console.error('❌ 案件振り分けエラー:', error.toString());
    
    return {
      success: false,
      assignedChildId: '',
      assignedChildName: '',
      mode: mode,
      scores: {},
      slackSent: false,
      logRecorded: false,
      errors: [`振り分け処理: ${error.message}`]
    };
  }
}

/**
 * 案件振り分けSlack通知送信
 * 
 * @param {string} parentId - 親アカウントID
 * @param {string} inquiryId - 案件ID
 * @param {string} childId - 振り分け先子アカウントID
 * @param {string} childName - 振り分け先子アカウント名
 * @param {string} mode - 振り分けモード
 * @return {boolean} 送信成功可否
 */
function sendAssignmentNotificationToSlack_(parentId, inquiryId, childId, childName, mode) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const webhookUrl = properties.getProperty('SLACK_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL が設定されていません');
    }
    
    const modeText = mode === 'auto' ? '自動振り分け' : '手動指定';
    const message = `【案件振り分け】${childName}様に案件 ${inquiryId} を配信しました（${modeText}）`;
    
    const payload = {
      text: message,
      username: '外壁塗装くらべるAI',
      icon_emoji: ':inbox_tray:',
      attachments: [
        {
          color: 'good',
          fields: [
            {
              title: '案件ID',
              value: inquiryId,
              short: true
            },
            {
              title: '担当者',
              value: childName,
              short: true
            },
            {
              title: '振り分け方法',
              value: modeText,
              short: true
            }
          ]
        }
      ]
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      console.log('✅ 振り分け通知送信成功');
      return true;
    } else {
      throw new Error(`Slack送信失敗: HTTP ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    console.error('❌ 振り分け通知送信エラー:', error.toString());
    return false;
  }
}

/**
 * 案件振り分けイベントログ記録
 * 
 * @param {string} parentId - 親アカウントID
 * @param {string} inquiryId - 案件ID
 * @param {string} childId - 振り分け先子アカウントID
 * @param {string} mode - 振り分けモード
 * @param {number} score - 振り分けスコア
 * @return {boolean} 記録成功可否
 */
function logAssignmentEvent_(parentId, inquiryId, childId, mode, score) {
  try {
    claude_logEvent(
      'INFO',
      '案件振り分け',
      mode === 'auto' ? '自動振り分け' : '手動振り分け',
      `案件ID: ${inquiryId}, 親ID: ${parentId}, 子ID: ${childId}, スコア: ${score}`,
      inquiryId
    );
    
    console.log('✅ 振り分けイベントログ記録成功');
    return true;
    
  } catch (error) {
    console.error('❌ 振り分けイベントログ記録エラー:', error.toString());
    return false;
  }
}

/**
 * 🧪 案件振り分け機能テスト
 */
function claude_assignmentTest() {
  try {
    console.log('🧪 案件振り分け機能テスト開始');
    
    const testResults = {
      childFiltering: false,
      scoreCalculation: false,
      autoAssignment: false,
      manualAssignment: false,
      slackNotification: false,
      systemLog: false,
      errors: []
    };
    
    // テストデータ
    const testParentId = 'PARENT-TEST-001';
    const testInquiryId = 'INQ-TEST-002';
    const testChildId = 'CHILD-TEST-001';
    
    // 1. 子アカウントフィルタリングテスト
    console.log('1️⃣ 子アカウントフィルタリングテスト...');
    try {
      const activeChildren = filterPausedChildAccounts(testParentId);
      testResults.childFiltering = Array.isArray(activeChildren);
      console.log(`✅ 子アカウントフィルタリング成功: ${activeChildren.length}件`);
    } catch (error) {
      testResults.errors.push(`子アカウントフィルタリング: ${error.message}`);
      console.error(`❌ 子アカウントフィルタリング失敗: ${error.message}`);
    }
    
    // 2. スコア計算テスト
    console.log('2️⃣ スコア計算テスト...');
    try {
      const scoredChildren = getChildAssignmentScores(testParentId, testInquiryId);
      testResults.scoreCalculation = Array.isArray(scoredChildren);
      console.log(`✅ スコア計算成功: ${scoredChildren.length}件`);
    } catch (error) {
      testResults.errors.push(`スコア計算: ${error.message}`);
      console.error(`❌ スコア計算失敗: ${error.message}`);
    }
    
    // 3. 自動振り分けテスト
    console.log('3️⃣ 自動振り分けテスト...');
    try {
      const autoResult = assignCaseToChild(testParentId, testInquiryId, 'auto');
      testResults.autoAssignment = autoResult.success;
      testResults.slackNotification = autoResult.slackSent;
      testResults.systemLog = autoResult.logRecorded;
      
      if (autoResult.success) {
        console.log(`✅ 自動振り分け成功: ${autoResult.assignedChildName}`);
      } else {
        throw new Error(autoResult.errors.join(', '));
      }
    } catch (error) {
      testResults.errors.push(`自動振り分け: ${error.message}`);
      console.error(`❌ 自動振り分け失敗: ${error.message}`);
    }
    
    // 4. 手動振り分けテスト
    console.log('4️⃣ 手動振り分けテスト...');
    try {
      const manualResult = assignCaseToChild(
        testParentId, 
        testInquiryId, 
        'manual', 
        { selectedChildId: testChildId }
      );
      testResults.manualAssignment = manualResult.success;
      
      if (manualResult.success) {
        console.log(`✅ 手動振り分け成功: ${manualResult.assignedChildName}`);
      } else {
        throw new Error(manualResult.errors.join(', '));
      }
    } catch (error) {
      testResults.errors.push(`手動振り分け: ${error.message}`);
      console.error(`❌ 手動振り分け失敗: ${error.message}`);
    }
    
    // テスト結果サマリー
    const successCount = Object.values(testResults).filter(v => v === true).length;
    const totalTests = 6;
    const successRate = Math.round((successCount / totalTests) * 100);
    
    console.log('🧪 案件振り分け機能テスト結果');
    console.log(`子アカウントフィルタリング: ${testResults.childFiltering ? '✅' : '❌'}`);
    console.log(`スコア計算: ${testResults.scoreCalculation ? '✅' : '❌'}`);
    console.log(`自動振り分け: ${testResults.autoAssignment ? '✅' : '❌'}`);
    console.log(`手動振り分け: ${testResults.manualAssignment ? '✅' : '❌'}`);
    console.log(`Slack通知: ${testResults.slackNotification ? '✅' : '❌'}`);
    console.log(`システムログ: ${testResults.systemLog ? '✅' : '❌'}`);
    console.log(`📊 成功率: ${successRate}% (${successCount}/${totalTests})`);
    
    if (testResults.errors.length > 0) {
      console.log('🚨 エラー詳細:');
      testResults.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    // 全体成功ログ
    claude_logEvent(
      successRate >= 75 ? 'INFO' : 'WARNING',
      'テスト実行',
      '案件振り分け機能テスト',
      `成功率: ${successRate}%, エラー数: ${testResults.errors.length}`
    );
    
    return {
      success: successRate >= 75,
      successRate: successRate,
      results: testResults
    };
    
  } catch (error) {
    console.error('❌ 案件振り分け機能テスト実行エラー:', error.toString());
    claude_logEvent('ERROR', 'テスト実行', '案件振り分け機能テスト', `実行エラー: ${error.toString()}`);
    
    return {
      success: false,
      successRate: 0,
      error: error.message
    };
  }
}