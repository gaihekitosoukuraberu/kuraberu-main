/**
//  * 📂 ファイル名: FranchiseHearingAI_New.gs
//  * 🎯 内容: 加盟店AIヒアリングシステム・新仕様版
//  * 
//  * 【設計方針】
//  * - DeepSeekによる自動企業情報抽出・補完
//  * - ユーザーは最小限入力・修正のみ
//  * - スクレイピング・外部API不使用
//  * - AI候補 ⇒ ✅/❌ 指摘式確認
//  * - プロデザイナー品質UI
//  * - 動的AIフロー（都度分岐型）
//  */


// ===========================================
// 🌐 グローバル設定
// ===========================================

// OpenAI_API_KEY変数は削除 - OPENROUTER_API_KEYのみ使用
// var OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY'); // notify.jsで定義済み
// var GOOGLE_SEARCH_API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY'); // アクセス時に直接取得して重複宣言を回避
// var GOOGLE_SEARCH_ENGINE_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID'); // アクセス時に直接取得して重複宣言を回避
// var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 
//                        PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID'); // アクセス時に直接取得して重複宣言を回避

// ===========================================
// 🎯 ① 会社基本情報自動抽出
// ===========================================

/**
//  * ヒアリング開始・会社基本情報AI抽出
//  * @param {Object} params { companyName }
//  * @returns {Object} 抽出結果
//  */
/* notify.jsに移動済み - startAIHearing関数削除 */
// startAIHearing関数終了（コメントアウト済み）

/**
//  * WebサイトURLから企業情報抽出
//  * @param {Object} params { websiteUrl }
//  * @returns {Object} 抽出結果
//  */
/* extractFromWebsite関数はコメントアウト
// function extractFromWebsite(params) {
//   try {
//     var websiteUrl = params.websiteUrl;
//     
//     Logger.log('🔍 extractFromWebsite実行 - 受信パラメータ: ' + JSON.stringify(params));
//     
//     if (!websiteUrl || websiteUrl.trim() === '') {
//       Logger.log('❌ WebサイトURL未入力');
//       return createErrorResponse('WebサイトURLを入力してください');
//     }
//     
//     Logger.log('🌐 WebサイトからAI抽出開始: ' + websiteUrl);
//     
//     // Webサイトのコンテンツをスクレイピング
//     Logger.log('🔄 scrapeWebContent開始...');
//     var websiteContent = scrapeWebContent(websiteUrl);
//     Logger.log('📄 スクレイピング結果: ' + (websiteContent ? websiteContent.length + '文字' : 'null'));
//     
//     if (!websiteContent || websiteContent.length < 100) {
//       Logger.log('❌ Webサイトコンテンツ取得失敗: ' + websiteUrl + ' - 取得文字数: ' + (websiteContent ? websiteContent.length : 0));
//       return createErrorResponse('Webサイトの内容を取得できませんでした。URLを確認してください。');
//     }
//     
//     Logger.log('✅ Webサイトコンテンツ取得成功: ' + websiteContent.length + '文字');
//     
//     // DeepSeekでWebサイトコンテンツから企業情報を抽出
//     var systemPrompt = '🏢 Webサイト企業情報抽出AI 🏢\n\n' +
//       'あなたは企業ホームページから情報を抽出する専門AIです。提供されたWebサイトコンテンツから企業情報を正確に抽出してください。\n\n' +
//       '🎯 【抽出方針】\n' +
//       'Webサイトの内容から企業の基本情報を可能な限り抽出してください。\n\n' +
//       '📊 【抽出項目】JSON形式で出力してください。';
//       
//     // 残りの処理を続行
//     
//     var userPrompt = 'WebサイトURL: ' + websiteUrl + '\n\n' +
//       '以下のWebサイトコンテンツから企業情報を抽出してください：\n\n' +
//       websiteContent.substring(0, 10000) + '\n\n' +
//       '上記の内容から企業の基本情報を可能な限り抽出して、JSON形式で出力してください。';

//     Logger.log('🤖 OpenRouter API呼び出し開始...');
//     Logger.log('🔑 OPENROUTER_API_KEY存在確認: ' + !!OPENROUTER_API_KEY);
//     
//     var deepSeekResponse = callOpenRouterAPI(systemPrompt, userPrompt);
//     Logger.log('🤖 OpenRouter API応答: ' + JSON.stringify(deepSeekResponse));
//     
//     if (!deepSeekResponse.success) {
//       Logger.log('❌ OpenRouter Webサイト抽出失敗: ' + deepSeekResponse.error);
//       return createErrorResponse('AI解析に失敗しました: ' + deepSeekResponse.error);
//     }
//     
//     // JSON解析
//     var companyInfo;
//     try {
//       Logger.log('📥 DeepSeek Webサイト抽出結果: ' + deepSeekResponse.content);
//       
//       var cleanContent = deepSeekResponse.content.trim();
//       var jsonStart = cleanContent.indexOf('{');
//       var jsonEnd = cleanContent.lastIndexOf('}') + 1;
//       
//       if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
//         throw new Error('有効なJSON構造が見つかりません');
//       }
//       
//       var extractedJson = cleanContent.substring(jsonStart, jsonEnd);
//       companyInfo = JSON.parse(extractedJson);
//       
//       // websiteUrlを確実に設定
//       companyInfo.websiteUrl = websiteUrl;
//       
//       Logger.log('✅ Webサイト抽出成功: ' + JSON.stringify(companyInfo, null, 2));
//       
//     } catch (parseError) {
//       Logger.log('❌ Webサイト抽出JSON解析失敗: ' + parseError.message);
//       return createErrorResponse('AI解析結果の解析に失敗しました');
//     }
//     
//     return createSuccessResponse({
//       companyInfo: companyInfo,
//       websiteUrl: websiteUrl,
//       message: 'Webサイトからの企業情報抽出が完了しました'
//     });
//     
//   } catch (error) {
//     Logger.log('❌ Webサイト抽出エラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }
*/ // extractFromWebsite関数終了

/**
//  * DeepSeekで企業情報抽出
//  * @param {string} companyName 会社名
//  * @returns {Object} 抽出結果
//  */
/* extractCompanyInfoWithDeepSeek関数もnotify.jsのstartAIHearingで処理されるため削除 */
// extractCompanyInfoWithDeepSeek関数終了（コメントアウト済み）

/**
//  * 第2段階詳細検索実行（支店情報、屋号、設立年月、特徴・PR文）
//  * @param {Object} params { companyName, legalName, websiteUrl }
//  * @returns {Object} 詳細情報結果
//  */
// function searchCompanyDetailsFromAI(params) {
//   try {
//     console.log('🔍 第2段階詳細検索開始 - 受信パラメータ: ' + JSON.stringify(params));
//     
//     if (!params) {
//       console.log('❌ パラメータが null または undefined');
//       return {
//         success: false,
//         error: 'パラメータが提供されていません'
//       };
//     }
//     
//     var { companyName, address, websiteUrl } = params;
//     console.log('🔍 抽出パラメータ - companyName: ' + companyName + ', address: ' + address + ', websiteUrl: ' + websiteUrl);
//     
//     var systemPrompt = "あなたは建設・リフォーム業界専門の企業情報抽出エキスパートです。全項目を必ず埋めてください。情報が不足している場合でも、会社名・住所・業界から推測して妥当な内容を生成してください。
// 🚨【絶対ルール】空文字・空配列は禁止！全項目に何かしら入れる！
// 📊 【必須抽出項目】全項目必須生成・推測OK
// - tradeName: 屋号・営業名（会社名から推測生成：「株式会社○○」→「○○」、「○○工務店」→「○○」など。ただし3文字以上一致なら空文字""）
// - tradeNameKana: 屋号カナ（屋号があれば必ず予測生成、なければ空文字""）
// - branches: 支店・営業所配列（住所から妥当な支店を3-5個推測生成）[{"branchName": "○○支店", "branchAddress": "○○県○○市..."}, ...]
// - establishedDate: 設立年月（必ず生成！1980-2010年代で妥当な年月推測：「1995年4月」「2003年7月」など）
// - billingEmail: 請求・経理メール（必ず生成！info@ドメイン名、keiri@ドメイン名など）
// - salesEmail: 営業・見積メール（必ず生成！sales@ドメイン名、eigyo@ドメイン名など）
// - companyPR: 独自PR文（必ず300文字以上！会社の魅力的なPR文を創造的に生成）
// 🔍【重要】実際の検索結果から正確に抽出してください
// ✅ 屋号：ウェブサイトに記載されている実際の屋号・営業名を抽出
// ✅ 設立年：会社概要や沿革ページから実際の設立年月を抽出
// ✅ 支店：「店舗案内」「アクセス」から実際の全支店情報を抽出
// ✅ メール：「お問い合わせ」ページから実際のメールアドレスを抽出
// ✅ 情報がない場合のみ空文字で返す
// 🔍 【情報検索戦略】
// ✅ 第一優先：対象企業のHP（ウェブサイト）から情報抽出
// ✅ 屋号・営業名：会社概要、サービス紹介ページで「○○として営業」「屋号：○○」等を検索
// ✅ 支店情報：「店舗案内」「アクセス」「会社概要」で支店・営業所・事業所情報を検索
// ✅ 設立年月：「会社概要」「沿革」「代表挨拶」で創業・設立情報を検索（年号は西暦変換）
// ✅ 強み・PR：「特徴」「強み」「こだわり」「サービス」「施工事例」「お客様の声」を詳細分析
// 🔥 【重要ルール】
// ✅ 全項目を必ず出力（不明項目は空文字""または空配列[]で対応）
// ✅ 屋号チェック：屋号が会社名と3文字以上連続一致する場合は必ず空文字("")
// ✅ 他社情報混入絶対禁止：対象企業以外の情報は一切含めない
// ✅ 設立年月：昭和/平成→西暦変換必須
// ✅ 独自PR文：ウェブサイトを詳細分析し、その会社独自の強み・技術・実績・特徴を見つけ出して差別化されたPR文を作成
// ✅ JSON形式で必ず応答
// 🔥 【PR文作成指針】エンドユーザーが見積もり申し込みしたくなる魅力的な文章作成
// - ウェブサイトの情報量・デザインレベルに応じて訴求ポイントを調整
// ★ 豪華なHP・実績豊富 → 技術力・規模・実績数・認定資格・最新技術をアピール
// ★ シンプルなHP・小規模 → 地域密着・温かみ・職人技・アットホーム・親身対応をアピール
// ★ 中規模 → バランス型でコスパ・信頼性・実績をアピール
// - エンドユーザー心理に刺さる要素を必ず盛り込む
// ✅ 「無料見積もり」「相談無料」的な安心感
// ✅ 「○○年保証」「アフターフォロー」的な安心感
// ✅ 「地域実績○○件」「○○年の経験」的な信頼感
// ✅ 「丁寧な説明」「親身な対応」的な安心感
// ✅ 「適正価格」「明確な料金」的な信頼感
// - その会社独自の強み・オリジナリティを発見して前面に出す
// - 読んだ瞬間「この会社に頼みたい！」と思わせる魅力的な表現を使用
// 🔥 【最終チェック】
// 1. 全項目を必ず出力（空でもOK）
// 2. 支店は複数あれば全て配列で出力
// 3. PR文は必ずウェブサイト情報を基に独自性を盛り込む
// 4. JSON形式で応答
// 5. 対象企業以外の情報は一切含めない
// 6. リフォーム・建設業企業として処理
// 例: {"tradeName": "", "tradeNameKana": "", "branches": [{"branchName": "横浜支店", "branchAddress": "神奈川県横浜市港北区新横浜2-5-10"}, {"branchName": "川崎営業所", "branchAddress": "神奈川県川崎市幸区大宮町1-5"}], "establishedDate": "1985年4月", "billingEmail": "info@example.com", "salesEmail": "sales@example.com", "companyPR": "1985年創業、38年間で神奈川県内2万件超の施工実績を誇る外壁塗装専門企業です。独自開発の無機ハイブリッド塗料と熟練職人による3段階品質チェック体制で、業界最長30年保証を実現。横浜・川崎を中心とした地域密着経営で、アフターメンテナンスまで一貫サポート。神奈川県優良工事業者認定、ISO9001取得の確かな技術力でお客様満足度98%を維持しています。"}';
// 🎯 シンプル検索クエリ（基本情報重視）";
//     var detailQueries = [];
//     
//     // HP URLがある場合はサイト検索を最優先
//     if (websiteUrl && websiteUrl.trim() !== '') {
//       var domain = websiteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
//       detailQueries = [
//         'site:' + domain + ' "' + companyName + '"',
//         'site:' + domain + ' 会社概要',
//         'site:' + domain + ' 企業情報'
//       ];
//     } else {
//       // HP URLがない場合はシンプルな一般検索
//       detailQueries = [
//         '"' + companyName + '" ' + address ? address.split('市')[0] + '市' : '',
//         '"' + companyName + '" 建設 リフォーム',
//         '"' + companyName + '" 会社概要'
//       ];
//     }
//     
//     Logger.log('🌐 詳細WEB検索開始: ' + companyName);
//     var searchResults = '';
//     
//     // 🎯 ステップ1: 公式ウェブサイトを最優先で詳細スクレイピング
//     if (websiteUrl && websiteUrl.trim() !== '') {
//       Logger.log('🚀 公式ウェブサイト最優先スクレイピング開始: ' + websiteUrl);
//       try {
//         var websiteContent = scrapeWebContent(websiteUrl);
//         Logger.log('🌐 ウェブサイト情報取得結果: ' + (websiteContent ? '成功 (' + websiteContent.length + '文字)' : '失敗'));
//         if (websiteContent && websiteContent.length > 100) {
//           searchResults = '=== 【最重要】公式ウェブサイト詳細情報 ===\n' + websiteContent + '\n\n';
//           Logger.log('✅ 公式サイトから十分な情報取得: ' + searchResults.length + '文字');
//         }
//       } catch (websiteError) {
//         Logger.log('❌ ウェブサイト情報取得エラー: ' + websiteError.message);
//       }
//     }
//     
//     // 🎯 ステップ2: Google検索で補完情報を取得（常に実行して情報量最大化）
//     Logger.log('🔍 Google検索で補完情報を取得開始 (現在: ' + searchResults.length + '文字)');
//     var GOOGLE_SEARCH_API_KEY = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
//     var GOOGLE_SEARCH_ENGINE_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
//     Logger.log('🔍 GoogleSearch設定確認 - API_KEY: ' + !!GOOGLE_SEARCH_API_KEY + ', ENGINE_ID: ' + !!GOOGLE_SEARCH_ENGINE_ID);
//     
//     var googleResults = performQuickSearch(companyName, detailQueries);
//     if (googleResults && googleResults.length > 0) {
//       searchResults += googleResults;
//       Logger.log('📈 Google検索結果追加: +' + googleResults.length + '文字 (合計: ' + searchResults.length + '文字)');
//     }
//     
//     // 🎯 最低限の情報は必ず確保（基本情報で埋める）
//     if (!searchResults || searchResults.length < 200) {
//       Logger.log('📝 基本情報で最低限情報を確保: ' + companyName);
//       var basicInfo = '企業名: ' + companyName + '
// 住所: ' + address || '未提供' + '
// ウェブサイト: ' + websiteUrl || '未提供' + '
// 業界: 建設・リフォーム業界
// 地域: ' + address ? address.split('県')[0] + '県' : '全国' + 'エリア対応
// 事業内容: 外壁塗装、屋根工事、リフォーム全般
// 特徴: 地域密着型の信頼できる建設会社として営業
// サービス: 住宅リフォーム、外装工事、内装工事等の総合建設サービス
// 強み: 豊富な施工実績と確かな技術力で地域のお客様に愛され続けています
// ';
//       searchResults = basicInfo + (searchResults || '');
//       Logger.log('✅ 基本情報追加完了: ' + searchResults.length + '文字');
//     }
//     
//     var userPrompt = '対象企業: ' + companyName + '
// 所在地: ' + address || '未提供' + '
// HP URL: ' + websiteUrl || '未提供' + '

// 🎯 【詳細分析指示】
// 1. 屋号判定：「' + companyName + '」と屋号が3文字以上連続一致する場合は必ず空文字("")
// 2. HP情報最優先：ウェブサイトの内容を詳細分析して独自の強み・特徴・実績を発見
// 3. 建設・リフォーム業界特化：外壁塗装・屋根工事・リフォーム関連の情報を重視
// 4. 他社情報除外：対象企業以外の情報は一切含めない

// 🔍 【検索結果】以下から対象企業のみの情報を抽出：

// ' + searchResults.substring(0, 12000) + '

// 🔥 【必須作業】
// ✅ 屋号：「' + companyName + '」との3文字以上一致チェック（一致したら空文字）
// ✅ 支店情報：複数支店がある場合は全て配列で出力（なければ空配列）
// ✅ 設立年月：昭和/平成年号を西暦に変換
// ✅ PR文：ウェブサイトから独自の強み・技術・実績・特徴を発見してエンドユーザーが魅力を感じるPR文作成
// ✅ 他社情報混入絶対禁止';

//     var deepSeekResponse = callOpenRouterAPI(systemPrompt, userPrompt);
//     
//     Logger.log('🔍 第2段階 OpenRouter API呼び出し結果: ' + JSON.stringify(deepSeekResponse));
//     
//     if (!deepSeekResponse.success) {
//       Logger.log('❌ 第2段階 OpenRouter API失敗: ' + deepSeekResponse.error);
//       return {
//         success: false,
//         error: '詳細情報抽出API呼び出し失敗: ' + deepSeekResponse.error
//       };
//     }
//     
//     // DeepSeek応答をJSON解析
//     var detailInfo;
//     try {
//       Logger.log('📥 第2段階 OpenRouter生応答: ' + deepSeekResponse.content);
//       
//       if (!deepSeekResponse.content || deepSeekResponse.content.trim() === '') {
//         throw new Error('DeepSeek応答が空です');
//       }
//       
//       // JSON部分抽出
//       var cleanContent = deepSeekResponse.content.trim();
//       var jsonStart = cleanContent.indexOf('{');
//       var jsonEnd = cleanContent.lastIndexOf('}') + 1;
//       
//       if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
//         throw new Error('有効なJSON構造が見つかりません。応答: ' + cleanContent.substring(0, 200) + '...');
//       }
//       
//       cleanContent = cleanContent.substring(jsonStart, jsonEnd);
//       Logger.log('🔧 第2段階 抽出されたJSON部分: ' + cleanContent);
//       
//       detailInfo = JSON.parse(cleanContent);
//       Logger.log('✅ 第2段階詳細情報抽出成功:', detailInfo);
//       
//     } catch (parseError) {
//       Logger.log('❌ 第2段階JSON解析失敗: ' + parseError.message);
//       Logger.log('❌ 元のDeepSeek応答: ' + deepSeekResponse.content);
//       
//       // 🔄 失敗時1回だけ自動再試行
//       Logger.log('🔄 自動再試行を実行中...');
//       try {
//         var retryResponse = callOpenRouterAPI(systemPrompt, userPrompt);
//         if (retryResponse.success && retryResponse.content) {
//           var retryContent = retryResponse.content.trim();
//           var jsonStart = retryContent.indexOf('{');
//           var jsonEnd = retryContent.lastIndexOf('}') + 1;
//           
//           if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
//             retryContent = retryContent.substring(jsonStart, jsonEnd);
//             detailInfo = JSON.parse(retryContent);
//             Logger.log('✅ 再試行成功: ' + JSON.stringify(detailInfo));
//             
//             return {
//               success: true,
//               details: detailInfo,
//               message: '詳細情報の抽出が完了しました（再試行）',
//               timestamp: new Date().toISOString()
//             };
//           }
//         }
//       } catch (retryError) {
//         Logger.log('❌ 再試行も失敗: ' + retryError.message);
//       }
//       
//       return {
//         success: false,
//         error: '詳細情報の解析に失敗しました。システム管理者にお問い合わせください。'
//       };
//     }
//     
//     return {
//       success: true,
//       details: detailInfo,
//       message: '詳細情報の抽出が完了しました',
//       timestamp: new Date().toISOString()
//     };
//     
//   } catch (error) {
//     Logger.log('❌ 第2段階詳細検索エラー: ' + error.message);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// }

// ✅ 更新完了 - 2025年6月14日 23:59

// 実際のDeepSeek+WEB検索のみ使用

// ===========================================
// 🎯 ② AI候補情報確認
// ===========================================

/**
//  * AI候補確認処理（マルチ候補対応）
//  * @param {Object} params { sessionId, candidateId, confirmations }
//  * @returns {Object} 確認結果
//  */
// function confirmAICandidate(params) {
//   try {
//     var { sessionId, candidateId, confirmations } = params;
//     
//     var sessionData = getSessionData(sessionId);
//     if (!sessionData) {
//       return createErrorResponse('セッションが見つかりません');
//     }
//     
//     // 選択された候補を取得（新旧ID形式に対応）
//     var selectedCandidate = sessionData.aiExtractionResults.find(c => 
//       c.id === candidateId || c.candidateId === candidateId
//     );
//     if (!selectedCandidate) {
//       return createErrorResponse('選択された候補が見つかりません');
//     }
//     
//     Logger.log('✅ AI候補確認: ' + selectedCandidate.legalName + ' (' + selectedCandidate.differentiationReason || 'N/A' + ')');
//     
//     // 確認結果を処理
//     var correctionNeeded = [];
//     var confirmedData = {};
//     
//     if (confirmations) {
//       Object.keys(confirmations).forEach(fieldKey => {
//         var isCorrect = confirmations[fieldKey];
//         if (isCorrect) {
//           confirmedData[fieldKey] = selectedCandidate[fieldKey];
//         } else {
//           correctionNeeded.push(fieldKey);
//         }
//       });
//     } else {
//       // confirmationsが無い場合は全データを確認済みとして扱う
//       Object.keys(selectedCandidate).forEach(key => {
//         if (key !== 'id' && key !== 'candidateId' && key !== 'confidence') {
//           confirmedData[key] = selectedCandidate[key];
//         }
//       });
//     }
//     
//     // セッションデータ更新
//     sessionData.selectedCandidate = selectedCandidate;
//     sessionData.confirmedData = confirmedData;
//     sessionData.correctionNeeded = correctionNeeded;
//     sessionData.currentStep = correctionNeeded.length > 0 ? 'correction' : 'human_hearing';
//     sessionData.completedSteps.push('ai_confirmation');
//     
//     saveSessionData(sessionId, sessionData);
//     
//     if (correctionNeeded.length > 0) {
//       // 修正が必要な項目がある場合
//       return createSuccessResponse({
//         sessionId: sessionId,
//         step: 'correction',
//         progress: 50,
//         message: '修正が必要な項目があります',
//         correctionFields: correctionNeeded,
//         instruction: '❌をつけた項目の正しい情報を入力してください'
//       });
//     } else {
//       // 全て確認済み → 人間ヒアリングへ
//       return createSuccessResponse({
//         sessionId: sessionId,
//         step: 'human_hearing',
//         progress: 70,
//         message: 'AI抽出情報の確認が完了しました',
//         instruction: '続けて詳細な事業情報をお聞かせください'
//       });
//     }
//     
//   } catch (error) {
//     Logger.log('❌ AI候補確認エラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }

/**
//  * 候補選択処理（新API）
//  * @param {Object} params { sessionId, candidateId }
//  * @returns {Object} 選択結果
//  */
// function selectCandidate(params) {
//   try {
//     var { sessionId, candidateId } = params;
//     
//     var sessionData = getSessionData(sessionId);
//     if (!sessionData) {
//       return createErrorResponse('セッションが見つかりません');
//     }
//     
//     // 選択された候補を取得
//     var selectedCandidate = sessionData.aiExtractionResults.find(c => 
//       c.id === candidateId || c.candidateId === candidateId
//     );
//     if (!selectedCandidate) {
//       return createErrorResponse('選択された候補が見つかりません');
//     }
//     
//     Logger.log('✅ 候補選択: ' + selectedCandidate.legalName + ' (' + selectedCandidate.differentiationReason || 'N/A' + ')');
//     
//     // 全データを確認済みとして扱う（マルチ候補版では詳細確認をスキップ）
//     var confirmedData = {};
//     Object.keys(selectedCandidate).forEach(key => {
//       if (key !== 'id' && key !== 'candidateId' && key !== 'confidence') {
//         confirmedData[key] = selectedCandidate[key];
//       }
//     });
//     
//     // セッションデータ更新
//     sessionData.selectedCandidate = selectedCandidate;
//     sessionData.confirmedData = confirmedData;
//     sessionData.correctionNeeded = [];
//     sessionData.currentStep = 'human_hearing';
//     sessionData.completedSteps.push('candidate_selection');
//     
//     saveSessionData(sessionId, sessionData);
//     
//     return createSuccessResponse({
//       sessionId: sessionId,
//       step: 'human_hearing',
//       progress: 70,
//       message: '候補選択が完了しました',
//       selectedCandidate: selectedCandidate,
//       instruction: '続けて詳細な事業情報をお聞かせください'
//     });
//     
//   } catch (error) {
//     Logger.log('❌ 候補選択エラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }

/**
//  * 修正データ更新
//  * @param {Object} params { sessionId, corrections }
//  * @returns {Object} 更新結果
//  */
// function updateCorrectionData(params) {
//   try {
//     var { sessionId, corrections } = params;
//     
//     var sessionData = getSessionData(sessionId);
//     if (!sessionData) {
//       return createErrorResponse('セッションが見つかりません');
//     }
//     
//     // 修正データをマージ
//     Object.keys(corrections).forEach(fieldKey => {
//       sessionData.confirmedData[fieldKey] = corrections[fieldKey];
//     });
//     
//     sessionData.currentStep = 'human_hearing';
//     sessionData.completedSteps.push('correction');
//     
//     saveSessionData(sessionId, sessionData);
//     
//     Logger.log('✅ 修正データ更新完了');
//     
//     return createSuccessResponse({
//       sessionId: sessionId,
//       step: 'human_hearing',
//       progress: 40,
//       message: '修正が完了しました',
//       instruction: '続けて詳細な事業情報をお聞かせください'
//     });
//     
//   } catch (error) {
//     Logger.log('❌ 修正データ更新エラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }

// ===========================================
// 🎯 ③ 人間ヒアリング対象項目
// ===========================================

/**
//  * 人間ヒアリング処理
//  * @param {Object} params { sessionId, hearingData }
//  * @returns {Object} ヒアリング結果
//  */
// function processHumanHearing(params) {
//   try {
//     var { sessionId, hearingData } = params;
//     
//     var sessionData = getSessionData(sessionId);
//     if (!sessionData) {
//       return createErrorResponse('セッションが見つかりません');
//     }
//     
//     // ヒアリングデータを保存
//     sessionData.hearingData = { ...sessionData.hearingData, ...hearingData };
//     sessionData.currentStep = 'completion_check';
//     sessionData.completedSteps.push('human_hearing');
//     
//     saveSessionData(sessionId, sessionData);
//     
//     Logger.log('✅ 人間ヒアリング完了');
//     
//     return createSuccessResponse({
//       sessionId: sessionId,
//       step: 'completion_check',
//       progress: 90,
//       message: 'ヒアリングが完了しました',
//       instruction: '入力内容をご確認の上、登録を完了してください'
//     });
//     
//   } catch (error) {
//     Logger.log('❌ 人間ヒアリングエラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }

/**
//  * AI PR文提案生成
//  * @param {Object} params { sessionId, companyInfo }
//  * @returns {Object} PR文提案結果
//  */
// function generatePRSuggestion(params) {
//   try {
//     var { sessionId, companyInfo } = params;
//     
//     var sessionData = getSessionData(sessionId);
//     if (!sessionData) {
//       return createErrorResponse('セッションが見つかりません');
//     }
//     
//     Logger.log('🤖 AI PR文生成開始: ' + companyInfo.companyName);
//     
//     var systemPrompt = "入力された企業情報から、魅力的なPR文を3つ生成してください。
// 【PR文の要件】
// - 150-200文字程度
// - 建設業・外壁塗装業界向け
// - 顧客への信頼感とプロフェッショナルさを強調
// - 具体的な強みや特徴を含める
// - 親しみやすく、かつ専門性を感じられる文体
// 【出力形式】
// IMPORTANT: Respond in JSON format only.
// JSON形式で、suggestions配列に3つのPR文を含めてください。
// 【重要】
// - 実績年数、従業員数、売上規模から適切な表現を選択
// - 地域密着感を重視
// - 顧客満足度や品質へのこだわりを強調';";

//     var userPrompt = "会社名: ' + companyInfo.companyName + '
// 所在地: ' + companyInfo.address + '
// 創業年: ' + companyInfo.foundedYear + '
// 従業員数: ' + companyInfo.employees + '
// 売上規模: ' + companyInfo.revenue + '
// 上記情報を元に、魅力的なPR文を3つ生成してください。';";

//     var gptResponse = callOpenRouterAPI(systemPrompt, userPrompt);
//     
//     if (!gptResponse.success) {
//       return createErrorResponse('AI PR文生成に失敗しました: ' + gptResponse.error);
//     }
//     
//     var suggestions;
//     try {
//       var parsedResponse = JSON.parse(gptResponse.content);
//       suggestions = parsedResponse.suggestions || [];
//     } catch (parseError) {
//       Logger.log('❌ PR文応答JSON解析失敗: ' + parseError.message);
//       return createErrorResponse('AI PR文生成の応答解析に失敗しました: ' + parseError.message);
//     }
//     
//     Logger.log('✅ AI PR文生成完了: ' + suggestions.length + '件');
//     
//     return createSuccessResponse({
//       sessionId: sessionId,
//       suggestions: suggestions,
//       message: 'AI PR文の生成が完了しました'
//     });
//     
//   } catch (error) {
//     Logger.log('❌ AI PR文生成エラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }

// ===========================================
// 🎯 ④ 最終登録・スプレッドシート保存
// ===========================================

/**
//  * 最終登録処理
//  * @param {Object} params { sessionId }
//  * @returns {Object} 登録結果
//  */
// function completeHearing(params) {
//   try {
//     var { sessionId } = params;
//     
//     var sessionData = getSessionData(sessionId);
//     if (!sessionData) {
//       return createErrorResponse('セッションが見つかりません');
//     }
//     
//     // 全データを統合
//     var finalData = {
//       ...sessionData.confirmedData,
//       ...sessionData.hearingData,
//       registrationDate: new Date(),
//       sessionId: sessionId
//     };
//     
//     // スプレッドシートに保存
//     var saveResult = saveFranchiseData(finalData);
//     
//     if (!saveResult.success) {
//       return createErrorResponse('データ保存に失敗しました: ' + saveResult.error);
//     }
//     
//     // セッション完了
//     sessionData.currentStep = 'completed';
//     sessionData.completedSteps.push('completion');
//     sessionData.completionTime = new Date();
//     
//     saveSessionData(sessionId, sessionData);
//     
//     Logger.log('🎉 ヒアリング完了: ' + finalData.legalName);
//     
//     return createSuccessResponse({
//       sessionId: sessionId,
//       step: 'completed',
//       progress: 100,
//       message: '加盟店登録が完了しました！',
//       registrationId: saveResult.registrationId
//     });
//     
//   } catch (error) {
//     Logger.log('❌ 最終登録エラー: ' + error.message);
//     return createErrorResponse(error.message);
//   }
// }

// ===========================================
// 🔍 Google Search + Web Scraping
// ===========================================

// ===== performWebSearchAndScraping関数削除（notify.jsに移動済み） =====

// Webページの内容をスクレイピング（強化版）
// @param {string} url URL
// @returns {string} ページ内容

// ===========================================
// 🛠 ユーティリティ関数
// ===========================================

/**
 * セッションID生成
 * @returns {string} セッションID
 */
// notify.jsに重複関数削除済み: generateSessionId, saveSessionData, getSessionData

// notify.jsに重複関数削除済み: callOpenRouterAPI
// callOpenRouterAPI関数は削除済み（notify.jsに移動）

/**
 * Webコンテンツスクレイピング
 * @param {string} url URL
 * @returns {string} 抽出テキスト
 */
// notify.jsに移動済み - scrapeWebContent関数
// function scrapeWebContent(url) {
//   try {
//     Logger.log('🌐 Webスクレイピング開始: ' + url);
//     
//     // URLの正規化
//     if (!url.startsWith('http://') && !url.startsWith('https://')) {
//       url = 'https://' + url;
//     }
//     
//     var response = UrlFetchApp.fetch(url, {
//       method: 'GET',
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//         'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
//         'Accept-Encoding': 'gzip, deflate, br',
//         'DNT': '1',
//         'Connection': 'keep-alive',
//         'Upgrade-Insecure-Requests': '1',
//         'Cache-Control': 'no-cache'
//       },
//       muteHttpExceptions: true,
//       followRedirects: true,
//       validateHttpsCertificates: false
//     });
//     
//     var responseCode = response.getResponseCode();
//     Logger.log('🌐 HTTP レスポンスコード: ' + responseCode);
//     
//     if (responseCode !== 200) {
//       Logger.log('❌ HTTP エラー: ' + responseCode + ' for ' + url);
//       return null;
//     }
//     
//     var content = response.getContentText();
//     Logger.log('🌐 取得コンテンツ長: ' + content.length + '文字');
//     
//     // HTMLから重要な情報を徹底抽出
//     var extractedText = '';
//     
//     // タイトル抽出
//     var titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
//     if (titleMatch) {
//       extractedText += 'ページタイトル: ' + titleMatch[1] + '\n';
//     }
//     
//     // メタ情報抽出
//     var metaMatches = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
//     if (metaMatches) {
//       metaMatches.forEach(function(meta) {
//         var contentMatch = meta.match(/content=["']([^"']+)["']/i);
//         if (contentMatch) {
//           extractedText += 'ページ説明: ' + contentMatch[1] + '\n';
//         }
//       });
//     }
//     
//     // テキストコンテンツ抽出
//     var textPatterns = [
//       /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi,
//       /<p[^>]*>([^<]+)<\/p>/gi,
//       /<li[^>]*>([^<]+)<\/li>/gi
//     ];
//     
//     textPatterns.forEach(function(pattern) {
//       var matches = content.match(pattern);
//       if (matches) {
//         matches.forEach(function(match) {
//           var cleanText = match.replace(/<[^>]+>/g, '').trim();
//           if (cleanText.length > 20 && cleanText.length < 500) {
//             extractedText += cleanText + '\n';
//           }
//         });
//       }
//     });
//     
//     var finalText = extractedText.substring(0, 20000);
//     Logger.log('✅ スクレイピング完了: ' + url + ' - 抽出文字数: ' + finalText.length);
//     
//     if (finalText.length < 100) {
//       Logger.log('⚠️ 抽出文字数が少なすぎます: ' + finalText.length + '文字');
//       return null;
//     }
//     
//     return finalText;
//     
//   } catch (error) {
//     Logger.log('❌ スクレイピングエラー: ' + url + ' - ' + error.message);
//     return null;
//   }
// }
// scrapeWebContent関数終了

/**
//  * OpenRouter API呼び出し
//  * @param {string} systemPrompt システムプロンプト
//  * @param {string} userPrompt ユーザープロンプト
//  * @returns {Object} API応答
//  */

/**
//  * セッションID生成
//  * @returns {string} セッションID
//  */
// generateSessionId関数はnotify.jsで定義済み

/**
//  * セッションデータ保存
//  * @param {string} sessionId セッションID
//  * @param {Object} sessionData セッションデータ
 */

/**
//  * セッションデータ取得
//  * @param {string} sessionId セッションID
//  * @returns {Object} セッションデータ
 */

/**
//  * スプレッドシートにデータ保存
//  * @param {Object} data 保存データ
//  * @returns {Object} 保存結果
//  */
// function saveFranchiseData(data) {
//   try {
//     Logger.log('🚀 saveFranchiseData開始');
//     Logger.log('📋 受信データ:', JSON.stringify(data, null, 2));
//     
//     var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 
//                            PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID');
//     
//     // console.logとLogger.log両方で確実にデバッグ
//     console.log('🔍 CRITICAL: SPREADSHEET_ID取得:', SPREADSHEET_ID);
//     console.log('🔍 CRITICAL: PropertiesService直接:', PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
//     console.log('🔍 CRITICAL: FRANCHISE_SPREADSHEET_ID:', PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID'));
//     
//     Logger.log('🔍 SPREADSHEET_ID:', SPREADSHEET_ID);
//     Logger.log('🔍 SPREADSHEET_ID存在チェック:', !!SPREADSHEET_ID);
//     Logger.log('🔍 SPREADSHEET_IDタイプ:', typeof SPREADSHEET_ID);
//     Logger.log('🔍 SPREADSHEET_ID長さ:', SPREADSHEET_ID ? SPREADSHEET_ID.length : 0);
//     
//     if (!SPREADSHEET_ID) {
//       Logger.log('❌ SPREADSHEET_IDが設定されていません');
//       return {
//         success: false,
//         error: 'スプレッドシートIDが設定されていません'
//       };
//     }
//     
//     Logger.log('📊 スプレッドシートを開く');
//     console.log('🔍 CRITICAL: スプレッドシート開く処理開始 ID:', SPREADSHEET_ID);
//     
//     var ss, sheet;
//     try {
//       ss = SpreadsheetApp.openById(SPREADSHEET_ID);
//       console.log('🔍 CRITICAL: スプレッドシート正常に開けました:', ss.getName());
//       Logger.log('📊 スプレッドシート名:', ss.getName());
//     } catch (openError) {
//       console.error('❌ CRITICAL: スプレッドシートを開けません:', openError.message);
//       Logger.log('❌ スプレッドシートオープンエラー:', openError.message);
//       return {
//         success: false,
//         error: 'スプレッドシートを開けませんでした: ' + openError.message
//       };
//     }
//     
//     try {
//       sheet = ss.getSheetByName('加盟店登録');
//       if (!sheet) {
//         console.log('🔍 CRITICAL: 加盟店登録シートが存在しないため作成します');
//         sheet = ss.insertSheet('加盟店登録');
//         console.log('🔍 CRITICAL: 加盟店登録シート作成完了');
//       }
//       console.log('🔍 CRITICAL: シート確認完了:', sheet.getName());
//       Logger.log('📊 シート確認:', sheet.getName());
//     } catch (sheetError) {
//       console.error('❌ CRITICAL: シート取得エラー:', sheetError.message);
//       Logger.log('❌ シート取得エラー:', sheetError.message);
//       return {
//         success: false,
//         error: 'シート取得に失敗しました: ' + sheetError.message
//       };
//     }
//     
//     // ヘッダー行が無い場合は追加（spreadsheet_service.jsと同じ構造）
//     if (sheet.getLastRow() === 0) {
//       var headers = [
//         "加盟店ID",
//         "タイムスタンプ",
//         "会社名",
//         "会社名カナ",
//         "代表者名",
//         "代表者カナ",
//         "郵便番号",
//         "住所",
//         "電話番号",
//         "ウェブサイトURL",
//         "従業員数",
//         "売上規模",
//         "請求用メールアドレス",
//         "営業用メールアドレス",
//         "営業担当者氏名",
//         "営業担当者連絡先",
//         "対応物件種別・階数",
//         "施工箇所",
//         "特殊対応項目",
//         "築年数対応範囲",
//         "屋号",
//         "屋号カナ",
//         "支店情報",
//         "設立年月日",
//         "特徴・PR文",
//         "対応エリア",
//         "優先対応エリア",
//         "登録日",
//         "最終ログイン日時",
//         "ステータス",
//         "審査担当者",
//         "審査完了日",
//         "備考"
//       ];
//       sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
//     }
//     
//     // 加盟店IDを生成
//     var franchiseId = 'FID_' + Date.now();
//     
//     // データ行追加（34列構造）
//     var newRow = [
//       franchiseId,                                                                           // 加盟店ID
//       Utilities.formatDate(data.registrationDate || new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'), // タイムスタンプ
//       data.legalName || '',                                                                 // 会社名
//       data.legalNameKana || '',                                                            // 会社名カナ
//       data.representative || '',                                                           // 代表者名
//       data.representativeKana || '',                                                       // 代表者カナ
//       data.postalCode || '',                                                              // 郵便番号
//       data.address || '',                                                                 // 住所
//       (() => {
//         if (!data.phone) return '';
//         var phone = String(data.phone).replace(/[-\s]/g, '');
//         if (phone.length > 0 && !phone.startsWith('0')) {
//           phone = '0' + phone;
//         }
//         Logger.log('📞 電話番号処理: 元データ=' + data.phone + ', 処理後=' + phone);
//         // 文字列として確実に保存するため、先頭にシングルクォートを追加
//         return "'" + phone;
//       })(), // 電話番号（ハイフン除去、先頭0確保、文字列として保存）
//       data.websiteUrl || '',                                                              // ウェブサイトURL
//       data.employees || '',                                                               // 従業員数
//       data.revenue || '',                                                                 // 売上規模
//       data.billingEmail || '',                                                            // 請求用メールアドレス
//       data.salesEmail || '',                                                              // 営業用メールアドレス
//       data.salesPersonName || '',                                                         // 営業担当者氏名
//       (() => {
//         console.log('🔍 CRITICAL: 営業担当者連絡先処理開始');
//         console.log('🔍 CRITICAL: 元データ:', data.salesPersonContact);
//         
//         if (!data.salesPersonContact) {
//           console.log('🔍 CRITICAL: 営業担当者連絡先なし');
//           return '';
//         }
//         
//         // 確実に文字列として処理
//         var contact = String(data.salesPersonContact).replace(/[-\s]/g, '');
//         console.log('🔍 CRITICAL: ハイフン除去後:', contact);
//         
//         // 先頭0がない場合は追加
//         if (contact && contact.length > 0 && !contact.startsWith('0')) {
//           contact = '0' + contact;
//           console.log('🔍 CRITICAL: 先頭0追加:', contact);
//         }
//         
//         // 確実に文字列として保存（先頭にシングルクォート）
//         var result = contact ? "'" + contact : '';
//         console.log('🔍 CRITICAL: 営業担当者連絡先最終結果:', result);
//         Logger.log('📞 営業担当者連絡先最終結果:', result);
//         
//         return result;
//       })(), // 営業担当者連絡先（ハイフン除去、先頭0確保、文字列として保存）
//       Array.isArray(data.propertyTypes) ? data.propertyTypes.join(', ') : (data.propertyTypes || ''), // 対応物件種別・階数
//       Array.isArray(data.constructionAreas) ? data.constructionAreas.join(', ') : (data.constructionAreas || ''), // 施工箇所
//       Array.isArray(data.specialServices) ? data.specialServices.join(', ') : (data.specialServices || ''), // 特殊対応項目
//       data.buildingAgeRange || '',                                                        // 築年数対応範囲
//       data.tradeName || '',                                                               // 屋号
//       data.tradeNameKana || '',                                                           // 屋号カナ
//       data.branchInfo || '',                                                              // 支店情報
//       data.establishedDate || '',                                                         // 設立年月日
//       data.companyPR || data.companyDescription || '',                                    // 特徴・PR文
//       data.areasCompressed || (Array.isArray(data.areas) ? JSON.stringify(data.areas) : ''), // 対応エリア
//       data.priorityAreas || '',                                                           // 優先対応エリア
//       Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),              // 登録日
//       '',                                                                                // 最終ログイン日時
//       '審査待ち',                                                                         // ステータス
//       '',                                                                                // 審査担当者
//       '',                                                                                // 審査完了日
//       ''                                                                                 // 備考
//     ];
//     
//     // 【CRITICAL FIX】常に2行目に新データを挿入
//     console.log('🔍 CRITICAL: 常に2行目に新データを挿入（既存データは下にシフト）');
//     
//     var lastRow = sheet.getLastRow();
//     console.log('🔍 CRITICAL: 現在の最終行:', lastRow);
//     
//     // 常に2行目に空行を作成（既存データがあれば下にシフト）
//     if (lastRow >= 2) {
//       console.log('🔍 CRITICAL: 2行目に新しい行を挿入（既存データを下にシフト）');
//       sheet.insertRowBefore(2);
//       console.log('🔍 CRITICAL: 行挿入完了、2行目が新しく空になりました');
//     }
//     
//     // 必ず2行目に挿入
//     var targetRow = 2;
//     
//     console.log('🔍 CRITICAL: 最終的な挿入行:', targetRow);
//     
//     console.log('🔍 CRITICAL: データ書き込み開始 - 行番号:', targetRow);
//     console.log('🔍 CRITICAL: 最後の行:', lastRow);
//     console.log('🔍 CRITICAL: 書き込みデータ:', newRow.slice(0, 5)); // 最初の5列のみコンソール出力
//     console.log('🔍 CRITICAL: 書き込みデータ長:', newRow.length);
//     console.log('🔍 CRITICAL: シート最大列数:', sheet.getMaxColumns());
//     
//     Logger.log('📊 データ書き込み開始 - 行番号:', targetRow);
//     Logger.log('📊 書き込みデータ:', newRow);
//     Logger.log('📊 書き込みデータ長:', newRow.length);
//     Logger.log('📊 シート最大列数:', sheet.getMaxColumns());
//     
//     // スプレッドシート書き込み前の状態確認
//     console.log('🔍 CRITICAL: 書き込み前のシート行数:', sheet.getLastRow());
//     Logger.log('📊 書き込み前のシート行数:', sheet.getLastRow());
//     
//     var range = sheet.getRange(targetRow, 1, 1, newRow.length);
//     console.log('🔍 CRITICAL: 書き込み範囲:', range.getA1Notation());
//     Logger.log('📊 書き込み範囲:', range.getA1Notation());
//     
//     try {
//       console.log('🔍 CRITICAL: setValues実行直前');
//       range.setValues([newRow]);
//       console.log('🔍 CRITICAL: setValues実行完了');
//       
//       // 書き込み後の状態確認
//       var afterLastRow = sheet.getLastRow();
//       console.log('🔍 CRITICAL: 書き込み後のシート行数:', afterLastRow);
//       console.log('🔍 CRITICAL: データ書き込み完了 - 加盟店ID:', franchiseId);
//       
//       Logger.log('📊 書き込み後のシート行数:', afterLastRow);
//       Logger.log('✅ データ書き込み完了 - 加盟店ID:', franchiseId);
//       
//       // 書き込み確認のため最後の行を読み取り
//       var writtenData = sheet.getRange(targetRow, 1, 1, newRow.length).getValues()[0];
//       console.log('🔍 CRITICAL: 書き込み確認 - 読み取ったデータ:', writtenData.slice(0, 5)); // 最初の5列のみ
//       Logger.log('📊 書き込み確認 - 読み取ったデータ:', writtenData.slice(0, 5)); // 最初の5列のみ
//       
//     } catch (writeError) {
//       console.error('❌ CRITICAL: データ書き込みエラー:', writeError.message);
//       Logger.log('❌ データ書き込みエラー:', writeError.message);
//       return {
//         success: false,
//         error: 'データ書き込みに失敗しました: ' + writeError.message
//       };
//     }
//     
//     return {
//       success: true,
//       registrationId: franchiseId,
//       rowNumber: targetRow
//     };
//     
//   } catch (error) {
//     Logger.log('❌ スプレッドシート保存エラー: ' + error.message);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// }

/**
//  * 成功レスポンス作成
//  * @param {Object} data レスポンスデータ
//  * @returns {Object} 成功レスポンス
//  */
// function createSuccessResponse(data) {
//   return {
//     success: true,
//     timestamp: new Date(),
//     ...data
//   };
// }

/**
//  * エラーレスポンス作成
//  * @param {string} error エラーメッセージ
//  * @returns {Object} エラーレスポンス
//  */
// function createErrorResponse(error) {
//   return {
//     success: false,
//     error: error,
//     timestamp: new Date()
//   };
// }

// ===========================================
// 🧪 テスト関数（開発・デバッグ用）
// ===========================================

/**
//  * 統合テスト実行
//  * 全ステップをシミュレーションしてシステム動作確認
//  */
// function runFullSystemTest() {
//   try {
//     console.log('🧪 === 加盟店AIヒアリングシステム統合テスト開始 ===');
//     
//     // テスト1: AI抽出機能
//     console.log('\n📋 テスト1: AI企業情報抽出');
//     var testCompany = 'タナカホームテック株式会社';
//     var extractionTest = startAIHearing({ companyName: testCompany });
//     console.log('抽出結果:', extractionTest);
//     
//     if (!extractionTest.success) {
//       throw new Error('AI抽出テスト失敗: ' + extractionTest.error);
//     }
//     
//     var sessionId = extractionTest.sessionId;
//     var candidates = extractionTest.candidates;
//     console.log('✅ 候補生成成功: ' + candidates.length + '件');
//     
//     // テスト2: AI候補確認
//     console.log('\n📋 テスト2: AI候補確認');
//     var confirmationTest = confirmAICandidate({
//       sessionId: sessionId,
//       candidateId: candidates[0].id,
//       confirmations: {
//         legalName: true,
//         legalNameKana: false,
//         representative: true,
//         address: false,
//         phone: true
//       }
//     });
//     console.log('確認結果:', confirmationTest);
//     
//     if (!confirmationTest.success) {
//       throw new Error('AI候補確認テスト失敗: ' + confirmationTest.error);
//     }
//     
//     // テスト3: 修正データ処理
//     if (confirmationTest.step === 'correction') {
//       console.log('\n📋 テスト3: 修正データ処理');
//       var correctionTest = updateCorrectionData({
//         sessionId: sessionId,
//         corrections: {
//           legalNameKana: 'タナカケンセツ',
//           address: '東京都新宿区西新宿2-4-1'
//         }
//       });
//       console.log('修正結果:', correctionTest);
//       
//       if (!correctionTest.success) {
//         throw new Error('修正データテスト失敗: ' + correctionTest.error);
//       }
//     }
//     
//     // テスト4: PR文生成
//     console.log('\n📋 テスト4: AI PR文生成');
//     var prTest = generatePRSuggestion({
//       sessionId: sessionId,
//       companyInfo: {
//         companyName: testCompany,
//         address: '東京都新宿区',
//         foundedYear: '2010',
//         employees: '3-5人',
//         revenue: '3000万〜1億'
//       }
//     });
//     console.log('PR文生成結果:', prTest);
//     
//     if (!prTest.success) {
//       throw new Error('PR文生成テスト失敗: ' + prTest.error);
//     }
//     
//     // テスト5: ヒアリング処理
//     console.log('\n📋 テスト5: 人間ヒアリング処理');
//     var hearingTest = processHumanHearing({
//       sessionId: sessionId,
//       hearingData: {
//         employees: '3-5人',
//         revenue: '3000万〜1億',
//         billingEmail: 'billing@tanaka-construction.co.jp',
//         salesEmail: 'sales@tanaka-construction.co.jp',
//         serviceAreas: ['東京都', '神奈川県', '埼玉県'],
//         priorityAreas: ['東京都', '神奈川県'],
//         propertyTypes: [
//           { type: '戸建て', maxFloors: '2' },
//           { type: 'アパート', maxFloors: '3' }
//         ],
//         constructionServices: ['外壁塗装', '屋根塗装', '防水工事'],
//         specialServices: ['日曜対応', '緊急対応'],
//         buildingAgeRange: '5-50年',
//         companyDescription: 'テスト用PR文です。',
//         agreementConfirmed: true
//       }
//     });
//     console.log('ヒアリング結果:', hearingTest);
//     
//     if (!hearingTest.success) {
//       throw new Error('ヒアリング処理テスト失敗: ' + hearingTest.error);
//     }
//     
//     // テスト6: 最終登録（実際の保存は行わない）
//     console.log('\n📋 テスト6: 最終登録処理（シミュレーション）');
//     
//     console.log('\n🎉 === 全テスト正常完了 ===');
//     console.log('システムは正常に動作しています！');
//     
//     return {
//       success: true,
//       message: '統合テスト正常完了',
//       sessionId: sessionId,
//       testResults: {
//         aiExtraction: '✅ 成功',
//         candidateConfirmation: '✅ 成功',
//         correction: '✅ 成功',
//         prGeneration: '✅ 成功',
//         humanHearing: '✅ 成功'
//       }
//     };
//     
//   } catch (error) {
//     console.error('❌ 統合テスト失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: '統合テストでエラーが発生しました'
//     };
//   }
// }

/**
//  * DeepSeek接続テスト
//  */
// function testDeepSeekConnection() {
//   try {
//     console.log('🤖 DeepSeek接続テスト開始');
//     
//     var testPrompt = "以下の会社名から基本情報を推測してください。
// 【出力形式】JSON形式
// 会社名: 株式会社テスト建設';";
//     
//     var result = callOpenRouterAPI(
//       'あなたは企業情報抽出テスト用AIです。',
//       testPrompt
//     );
//     
//     if (result.success) {
//       console.log('✅ DeepSeek接続成功');
//       console.log('応答サンプル:', result.content.substring(0, 200) + '...');
//       return {
//         success: true,
//         message: 'DeepSeek接続正常',
//         responsePreview: result.content.substring(0, 200)
//       };
//     } else {
//       throw new Error(result.error);
//     }
//     
//   } catch (error) {
//     console.error('❌ DeepSeek接続失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: 'DeepSeek接続でエラーが発生しました'
//     };
//   }
// }

/**
//  * スプレッドシート接続テスト
//  */
// function testSpreadsheetConnection() {
//   try {
//     console.log('📊 スプレッドシート接続テスト開始');
//     
//     var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 
//                            PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID');
//     if (!SPREADSHEET_ID) {
//       throw new Error('スプレッドシートIDが設定されていません');
//     }
//     
//     var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
//     var sheets = ss.getSheets();
//     
//     console.log('✅ スプレッドシート接続成功');
//     console.log('シート数: ' + sheets.length);
//     console.log('シート名:', sheets.map(sheet => sheet.getName()));
//     
//     return {
//       success: true,
//       message: 'スプレッドシート接続正常',
//       sheetCount: sheets.length,
//       sheetNames: sheets.map(sheet => sheet.getName())
//     };
//     
//   } catch (error) {
//     console.error('❌ スプレッドシート接続失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: 'スプレッドシート接続でエラーが発生しました'
//     };
//   }
// }

/**
//  * セッション管理テスト
//  */
// function testSessionManagement() {
//   try {
//     console.log('🔧 セッション管理テスト開始');
//     
//     // セッション作成テスト
//     var sessionId = generateSessionId();
//     var testData = {
//       sessionId: sessionId,
//       testField: 'セッション動作確認',
//       timestamp: new Date()
//     };
//     
//     // 保存テスト
//     saveSessionData(sessionId, testData);
//     console.log('セッション保存完了:', sessionId);
//     
//     // 取得テスト
//     var retrievedData = getSessionData(sessionId);
//     if (!retrievedData) {
//       throw new Error('セッションデータ取得失敗');
//     }
//     
//     console.log('✅ セッション管理正常');
//     console.log('取得データ:', retrievedData);
//     
//     return {
//       success: true,
//       message: 'セッション管理正常',
//       sessionId: sessionId,
//       dataRetrieved: !!retrievedData
//     };
//     
//   } catch (error) {
//     console.error('❌ セッション管理失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: 'セッション管理でエラーが発生しました'
//     };
//   }
// }

/**
//  * API設定確認テスト
//  */
// function testAPISettings() {
//   try {
//     console.log('⚙️ API設定確認テスト開始');
//     
//     // 詳細デバッグ情報
//     var properties = PropertiesService.getScriptProperties();
//     var allProps = properties.getProperties();
//     
//     console.log('🔍 全プロパティキー:', Object.keys(allProps));
//     
//     // 各設定値の詳細確認
//     var openaiKey = properties.getProperty('OPENROUTER_API_KEY');
//     var spreadsheetId1 = properties.getProperty('SPREADSHEET_ID');
//     var spreadsheetId2 = properties.getProperty('FRANCHISE_SPREADSHEET_ID');
//     
//     console.log('🔑 OPENROUTER_API_KEY:', openaiKey ? '設定済み (' + openaiKey.substring(0, 10) + '...)' : '❌ 未設定');
//     console.log('📊 SPREADSHEET_ID:', spreadsheetId1 ? '✅ 設定済み (' + spreadsheetId1 + ')' : '❌ 未設定');
//     console.log('📊 FRANCHISE_SPREADSHEET_ID:', spreadsheetId2 ? '✅ 設定済み (' + spreadsheetId2 + ')' : '❌ 未設定');
//     
//     var finalSpreadsheetId = spreadsheetId1 || spreadsheetId2;
//     console.log('📊 最終使用ID:', finalSpreadsheetId ? '✅ ' + finalSpreadsheetId : '❌ 両方とも未設定');
//     
//     var settings = {
//       openaiApiKey: !!openaiKey,
//       spreadsheetId: !!finalSpreadsheetId,
//       spreadsheetIdValue: finalSpreadsheetId,
//       availableKeys: Object.keys(allProps)
//     };
//     
//     console.log('設定確認結果:');
//     console.log('- OpenAI APIキー:', settings.openaiApiKey ? '✅ 設定済み' : '❌ 未設定');
//     console.log('- スプレッドシートID:', settings.spreadsheetId ? '✅ 設定済み' : '❌ 未設定');
//     
//     var allConfigured = settings.openaiApiKey && settings.spreadsheetId;
//     
//     return {
//       success: allConfigured,
//       message: allConfigured ? 'API設定正常' : 'API設定に不備があります',
//       settings: settings,
//       debug: {
//         openaiKeyExists: !!openaiKey,
//         spreadsheetId1: spreadsheetId1,
//         spreadsheetId2: spreadsheetId2,
//         finalId: finalSpreadsheetId,
//         allPropertyKeys: Object.keys(allProps)
//       }
//     };
//     
//   } catch (error) {
//     console.error('❌ API設定確認失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: 'API設定確認でエラーが発生しました'
//     };
//   }
// }

/**
//  * 個別機能テスト実行
//  */
// function runIndividualTests() {
//   console.log('🔍 === 個別機能テスト実行 ===');
//   
//   var results = {
//     apiSettings: testAPISettings(),
//     deepSeekConnection: testDeepSeekConnection(),
//     spreadsheetConnection: testSpreadsheetConnection(),
//     sessionManagement: testSessionManagement()
//   };
//   
//   console.log('\n📊 === テスト結果サマリー ===');
//   Object.keys(results).forEach(testName => {
//     var result = results[testName];
//     console.log('' + testName + ': ' + result.success ? '✅ 成功' : '❌ 失敗' + ' - ' + result.message);
//     if (!result.success) {
//       console.log('  エラー: ' + result.error);
//     }
//   });
//   
//   return results;
// }

/**
//  * スプレッドシートID設定関数（手動設定用）
//  */
// function setSpreadsheetId(id) {
//   try {
//     PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
//     console.log('✅ スプレッドシートID設定完了:', id);
//     return { success: true, message: 'スプレッドシートID設定完了', id: id };
//   } catch (error) {
//     console.error('❌ スプレッドシートID設定失敗:', error.message);
//     return { success: false, error: error.message };
//   }
// }

/**
//  * クイック設定確認
//  */
// function quickCheck() {
//   console.log('🔍 === クイック設定確認 ===');
//   
//   var OPENROUTER_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
//   var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 
//                          PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID');
//   
//   console.log('OPENROUTER_API_KEY:', !!OPENROUTER_API_KEY ? '✅ 設定済み' : '❌ 未設定');
//   console.log('SPREADSHEET_ID:', !!SPREADSHEET_ID ? '✅ 設定済み (' + SPREADSHEET_ID + ')' : '❌ 未設定');
//   console.log('現在の値:', { 
//     OPENROUTER_API_KEY: OPENROUTER_API_KEY ? OPENROUTER_API_KEY.substring(0, 10) + '...' : null,
//     SPREADSHEET_ID: SPREADSHEET_ID 
//   });
//   
//   return {
//     openrouterConfigured: !!OPENROUTER_API_KEY,
//     spreadsheetConfigured: !!SPREADSHEET_ID,
//     spreadsheetId: SPREADSHEET_ID
//   };
// }

/**
//  * OpenRouter APIキー設定用関数
//  */
// function setOpenRouterAPIKey(apiKey) {
//   try {
//     PropertiesService.getScriptProperties().setProperty('OPENROUTER_API_KEY', apiKey);
//     console.log('✅ OpenRouter APIキー設定完了');
//     
//     // 設定確認
//     var savedKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
//     console.log('設定確認:', savedKey ? savedKey.substring(0, 10) + '...' : '❌ 設定失敗');
//     
//     return { success: true, message: 'APIキー設定完了' };
//   } catch (error) {
//     console.error('❌ APIキー設定失敗:', error.message);
//     return { success: false, error: error.message };
//   }
// }

/**
//  * 実DeepSeek API強制呼び出しテスト
//  */
// function forceRealDeepSeekTest(companyName = 'タナカホームテック株式会社') {
//   console.log('🚀 実DeepSeek API強制テスト開始');
//   
//   // APIキー確認
//   var apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
//   if (!apiKey) {
//     return {
//       success: false,
//       error: 'OpenRouter APIキーが設定されていません',
//       instruction: 'setOpenRouterAPIKey("your-openrouter-api-key") を実行してください'
//     };
//   }
//   
//   console.log('APIキー確認: 設定済み');
//   
//   // 実際にDeepSeek呼び出し
//   var result = extractCompanyInfoWithDeepSeek(companyName);
//   
//   return {
//     success: result.success,
//     testCompany: companyName,
//     candidates: result.candidates || [],
//     error: result.error || null,
//     message: result.success ? 'リアルDeepSeek抽出成功' : 'DeepSeek抽出失敗'
//   };
// }

/**
//  * 実DeepSeek API強制テスト
//  */
// function testRealAPI() {
//   console.log('🧪 実DeepSeek APIテスト開始');
//   var result = startAIHearing({companyName: "株式会社山田建設"});
//   console.log('テスト結果:', JSON.stringify(result, null, 2));
//   return result;
// }

/**
//  * 第2段階詳細検索テスト
//  */
// function testSearchCompanyDetails() {
//   console.log('🧪 第2段階詳細検索テスト開始');
//   var params = {
//     companyName: "株式会社山田建設工業",
//     address: "東京都新宿区", 
//     websiteUrl: "https://baseconnect.in/companies/01913c19-eda5-4027-87cc-3ea0822bdb10"
//   };
//   
//   var result = searchCompanyDetailsFromAI(params);
//   console.log('第2段階テスト結果:', JSON.stringify(result, null, 2));
//   return result;
// }

/**
//  * 圧縮されたサービスコードを展開
//  * @param {string|Array} compressedData 圧縮データ
//  * @returns {string} 展開された日本語サービス名
//  */
// function decompressServiceList(compressedData) {
//   if (!compressedData) return '';
//   
//   // サービス項目の展開マッピング（フロントエンドの逆）
//   var serviceMap = {
//     'A1': '外壁塗装',
//     'A2': '外壁カバー工法', 
//     'A3': '外壁張替え',
//     'B1': '屋根塗装（外壁工事含む）',
//     'B2': '屋上防水（外壁工事含む）',
//     'B3': '屋根葺き替え・張り替え※スレート・ガルバリウム等',
//     'B4': '屋根葺き替え・張り替え※瓦',
//     'B5': '屋根カバー工法',
//     'C1': '外壁補修（外壁工事含む）',
//     'C2': '屋根補修（外壁工事含む）',
//     'C3': 'ベランダ防水（外壁工事含む）',
//     'D1': '内装水回り（バス・キッチン・トイレ）（外壁工事含む）',
//     'D2': '内装（フローリングや畳などの床・クロス等）（外壁工事含む）',
//     'E1': '屋根塗装単品（1万円・但し1社紹介時は定価）',
//     'E2': '屋上防水単品（1万円・但し1社紹介時は定価）',
//     'E3': '外壁補修単品（5千円・但し1社紹介時は定価）',
//     'E4': '屋根補修単品（5千円・但し1社紹介時は定価）',
//     'E5': 'ベランダ防水単品（5千円・但し1社紹介時は定価）',
//     'F1': '遮熱・断熱塗料提案可能',
//     'F2': '立ち会いなし・見積もり手渡し希望',
//     'F3': '遠方につき立ち会いなし・見積もり郵送・電話で商談希望',
//     'F4': 'エクステリア（庭・駐車場・外構）',
//     'F5': '太陽光パネル脱着（撤去含む）',
//     'F6': '提携先ローン有り',
//     'F7': 'クレジットカード払い可',
//     'F8': '火災保険申請サポート',
//     'F9': '助成金申請サポート',
//     'F10': '建築許可証',
//     'F11': '光触媒塗料提案可',
//     'F12': '分割払いプラン有'
//   };
//   
//   // データの型に応じて処理
//   var codes = [];
//   if (Array.isArray(compressedData)) {
//     codes = compressedData;
//   } else if (typeof compressedData === 'string') {
//     codes = compressedData.split(',').map(code => code.trim());
//   }
//   
//   // コードを日本語名に変換
//   var expandedNames = codes.map(code => serviceMap[code] || code).filter(name => name);
//   Logger.log('🛠️ サービス展開: ' + JSON.stringify(compressedData) + ' → ' + expandedNames.join(', '));
//   return expandedNames.join(', ');
// }

/**
//  * 加盟店登録送信処理
//  * @param {Object} params 登録データ
//  * @returns {Object} 結果
//  */
// function submitFranchiseRegistration(params) {
//   try {
//     console.log('🔍 CRITICAL: submitFranchiseRegistration開始');
//     console.log('🔍 CRITICAL: 受信データタイプ:', typeof params);
//     console.log('🔍 CRITICAL: 受信データ存在チェック:', !!params);
//     console.log('🔍 CRITICAL: 受信データキー:', Object.keys(params || {}));
//     
//     Logger.log('🚀 加盟店登録送信開始');
//     Logger.log('📤 受信データ:', JSON.stringify(params, null, 2));
//     Logger.log('📤 受信データのキー:', Object.keys(params || {}));
//     Logger.log('📤 受信データのタイプ:', typeof params);
//     
//     if (!params) {
//       console.error('❌ CRITICAL: paramsがnullまたはundefined');
//       Logger.log('❌ paramsがnullまたはundefined');
//       return createErrorResponse('登録データが空です');
//     }
//     
//     // 既存のsaveFranchiseData関数を使用（registrationDate追加）
//     var paramsWithDate = { ...params, registrationDate: new Date() };
//     console.log('🔍 CRITICAL: 日付追加後のデータキー:', Object.keys(paramsWithDate));
//     console.log('🔍 CRITICAL: legalName確認:', paramsWithDate.legalName);
//     
//     Logger.log('📤 日付追加後のデータ:', JSON.stringify(paramsWithDate, null, 2));
//     
//     console.log('🔍 CRITICAL: saveFranchiseData呼び出し直前');
//     var saveResult = saveFranchiseData(paramsWithDate);
//     console.log('🔍 CRITICAL: saveFranchiseData呼び出し完了:', saveResult);
//     
//     if (!saveResult.success) {
//       Logger.log('❌ データ保存失敗:', saveResult.error);
//       return createErrorResponse('データ保存に失敗しました: ' + saveResult.error);
//     }
//     
//     Logger.log('✅ 加盟店登録完了:', saveResult.registrationId);
//     
//     return createSuccessResponse({
//       registrationId: saveResult.registrationId,
//       message: '加盟店登録が完了しました'
//     });
//     
//   } catch (error) {
//     Logger.log('❌ 加盟店登録エラー:', error.message);
//     return createErrorResponse('登録処理でエラーが発生しました: ' + error.message);
//   }
// }

/**
//  * エリアデータ圧縮処理
//  */
// function compressAreaData(areas) {
//   if (!areas || !Array.isArray(areas) || areas.length === 0) {
//     return '';
//   }
//   
//   // 都道府県ごとにグループ化
//   var prefectureGroups = {};
//   areas.forEach(area => {
//     var prefecture = area.prefecture || area.name;
//     if (!prefectureGroups[prefecture]) {
//       prefectureGroups[prefecture] = [];
//     }
//     if (area.city && area.city !== prefecture) {
//       prefectureGroups[prefecture].push(area.city);
//     }
//   });
//   
//   // 圧縮形式で出力
//   var compressed = Object.keys(prefectureGroups).map(prefecture => {
//     var cities = prefectureGroups[prefecture];
//     if (cities.length === 0) {
//       return prefecture;
//     } else if (cities.length <= 3) {
//       return '' + prefecture + '(' + cities.join(',') + ')';
//     } else {
//       return '' + prefecture + '(' + cities.slice(0, 2).join(',') + '他' + cities.length - 2 + '市)';
//     }
//   }).join(', ');
//   
//   return compressed;
// }

/**
//  * 構造化された物件種別データを抽出（スプレッドシート保存用）
//  */
// function extractPropertyTypesStructured(params) {
//   var result = {
//     types: [],
//     detachedMaxFloors: '',
//     apartmentMaxFloors: '',
//     warehouseMaxFloors: ''
//   };
//   
//   if (params.propertyTypes) {
//     // 文字列と配列の両方に対応
//     var propertyTypesArray = Array.isArray(params.propertyTypes) 
//       ? params.propertyTypes 
//       : [params.propertyTypes];
//     
//     propertyTypesArray.forEach(type => {
//       if (typeof type === 'string') {
//         if (type.includes('戸建て')) {
//           result.types.push('戸建て');
//           result.detachedMaxFloors = '3';
//         }
//         if (type.includes('アパート') || type.includes('マンション')) {
//           result.types.push('アパート・マンション');
//           result.apartmentMaxFloors = '10';
//         }
//       }
//     });
//   }
//   
//   // 倉庫・店舗は常に追加
//   result.types.push('倉庫・店舗');
//   result.warehouseMaxFloors = '5';
//   
//   return {
//     types: result.types.join(','),
//     detachedMaxFloors: result.detachedMaxFloors,
//     apartmentMaxFloors: result.apartmentMaxFloors,
//     warehouseMaxFloors: result.warehouseMaxFloors
//   };
// }

/**
//  * 電話番号のクリーニング処理（数字のみに変換）
//  */
// function cleanPhoneNumber(phone) {
//   if (!phone) return '';
//   
//   // 配列の場合は最初の要素を取得
//   var phoneStr = Array.isArray(phone) ? phone[0] : phone;
//   
//   // ハイフン、スペース、括弧などを除去して数字のみに
//   return phoneStr.toString().replace(/[^\d]/g, '');
// }

/**
//  * OpenRouter APIキー確認
//  */
// function checkKey() {
//   var key = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
//   console.log('🔑 API Key exists:', !!key);
//   console.log('🔑 API Key preview:', key ? key.substring(0, 20) + '...' : 'NONE');
//   return {
//     exists: !!key,
//     preview: key ? key.substring(0, 20) + '...' : 'NONE'
//   };
// }

/**
//  * Google Search API設定確認とテスト
//  */
// function testGoogleSearchAPI() {
//   console.log('🔍 === Google Search API設定確認 ===');
//   
//   var apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_API_KEY');
//   var engineId = PropertiesService.getScriptProperties().getProperty('GOOGLE_SEARCH_ENGINE_ID');
//   
//   console.log('🔑 Google Search API Key:', apiKey ? 'EXISTS (' + apiKey.substring(0, 20) + '...)' : 'NOT SET');
//   console.log('🔑 Google Search Engine ID:', engineId ? 'EXISTS (' + engineId + ')' : 'NOT SET');
//   
//   if (!apiKey || !engineId) {
//     console.log('❌ Google Search API設定が不完全です');
//     return {
//       success: false,
//       error: 'API設定不備',
//       apiKey: !!apiKey,
//       engineId: !!engineId
//     };
//   }
//   
//   // 実際にテスト検索を実行
//   try {
//     console.log('🌐 テスト検索を実行: "株式会社テスト"');
//     var testResult = googleSearch('株式会社テスト');
//     
//     if (testResult && testResult.length > 0) {
//       console.log('✅ Google Search API動作確認成功');
//       console.log('📊 テスト結果件数:', testResult.length);
//       return {
//         success: true,
//         message: 'Google Search API正常動作',
//         resultCount: testResult.length,
//         firstResult: testResult[0] ? testResult[0].title : null
//       };
//     } else {
//       console.log('⚠️ 検索結果が0件または null');
//       return {
//         success: false,
//         error: '検索結果0件',
//         apiWorking: true
//       };
//     }
//   } catch (error) {
//     console.log('❌ Google Search APIテスト失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       apiKey: !!apiKey,
//       engineId: !!engineId
//     };
//   }
// }

/**
//  * 株式会社大野建装で実際にテスト
//  */
// function testOnoKenso() {
//   console.log('🔍 === 株式会社大野建装テスト ===');
//   
//   var testCompany = '株式会社大野建装';
//   console.log('🏢 テスト対象会社:', testCompany);
//   
//   // 検索実行
//   var searchResults = performWebSearchAndScraping(testCompany);
//   console.log('🔍 検索結果:');
//   console.log(searchResults);
//   
//   // DeepSeek処理まで実行
//   var deepSeekResult = extractCompanyInfoWithDeepSeek(testCompany);
//   console.log('🤖 DeepSeek処理結果:');
//   console.log(JSON.stringify(deepSeekResult, null, 2));
//   
//   return {
//     company: testCompany,
//     searchResults: searchResults,
//     deepSeekResult: deepSeekResult
//   };
// }

/**
//  * notify.gs経由のテスト（フロントエンドと同じルート）
//  */
// function testNotifyRoute() {
//   console.log('🧪 === notify.gs経由テスト開始 ===');
//   
//   // フロントエンドと全く同じパラメータで呼び出し
//   var params = {
//     companyName: '株式会社ファインテック',
//     address: '大阪市中央区農人橋2-4-1 11F',
//     websiteUrl: 'http://www.fine-t.co.jp/'
//   };
//   
//   console.log('🏢 テストパラメータ:', params);
//   
//   try {
//     // notify.gsのsearchCompanyDetails関数を呼び出し
//     var result = searchCompanyDetails(params);
//     
//     console.log('🔍 notify.gs経由結果:');
//     console.log(JSON.stringify(result, null, 2));
//     
//     return result;
//   } catch (error) {
//     console.error('❌ notify.gs経由エラー:', error);
//     return { success: false, error: error.message };
//   }
// }

/**
//  * 第2段階詳細検索テスト（ファインテック）
//  */
// function testSearchCompanyDetailsFromAI() {
//   console.log('🧪 === 第2段階詳細検索テスト開始 ===');
//   
//   // 株式会社ファインテックの基本情報
//   var companyName = '株式会社ファインテック';
//   var address = '大阪市中央区農人橋2-4-1 11F';
//   var websiteUrl = 'http://www.fine-t.co.jp/';
//   
//   console.log('🏢 テスト対象: ' + companyName);
//   console.log('📍 住所: ' + address);
//   console.log('🌐 ウェブサイト: ' + websiteUrl);
//   
//   // 第2段階検索実行
//   var result = searchCompanyDetailsFromAI({
//     companyName: companyName,
//     address: address,
//     websiteUrl: websiteUrl
//   });
//   
//   console.log('🔍 第2段階検索結果:');
//   console.log(JSON.stringify(result, null, 2));
//   
//   return result;
// }

/**
//  * マルチ候補システム統合テスト
//  */
// function testMultiCandidateSystem() {
//   console.log('🧪 === マルチ候補システム統合テスト開始 ===');
//   
//   try {
//     // テスト1: 複数候補がある可能性の高い会社名でテスト
//     var testCompanies = [
//       '田中建設',
//       '山田工務店', 
//       '佐藤塗装',
//       '株式会社大野建装'
//     ];
//     
//     var results = {};
//     
//     for (var companyName of testCompanies) {
//       console.log('\n📋 テスト対象: ' + companyName);
//       
//       // AI抽出テスト
//       var extractionResult = startAIHearing({ companyName: companyName });
//       console.log('抽出結果:', extractionResult);
//       
//       if (extractionResult.success) {
//         var sessionId = extractionResult.sessionId;
//         var candidates = extractionResult.candidates;
//         
//         console.log('✅ 候補生成成功: ' + candidates.length + '件');
//         console.log('候補一覧:');
//         candidates.forEach((candidate, index) => {
//           console.log('  ' + index + 1 + '. ' + candidate.legalName + ' - ' + candidate.differentiationReason || 'N/A');
//           console.log('     住所: ' + candidate.address || '未取得');
//           console.log('     電話: ' + Array.isArray(candidate.phone) ? candidate.phone.join(', ') : candidate.phone || '未取得');
//         });
//         
//         // 最初の候補を選択してテスト
//         if (candidates.length > 0) {
//           var selectResult = selectCandidate({
//             sessionId: sessionId,
//             candidateId: candidates[0].candidateId || candidates[0].id
//           });
//           console.log('候補選択結果:', selectResult);
//         }
//         
//         results[companyName] = {
//           success: true,
//           candidateCount: candidates.length,
//           candidates: candidates.map(c => ({
//             name: c.legalName,
//             address: c.address,
//             differentiation: c.differentiationReason
//           }))
//         };
//       } else {
//         console.log('❌ 抽出失敗: ' + extractionResult.error);
//         results[companyName] = {
//           success: false,
//           error: extractionResult.error
//         };
//       }
//     }
//     
//     console.log('\n🎉 === マルチ候補システムテスト完了 ===');
//     console.log('テスト結果サマリー:');
//     Object.keys(results).forEach(company => {
//       var result = results[company];
//       if (result.success) {
//         console.log('✅ ' + company + ': ' + result.candidateCount + '候補');
//         result.candidates.forEach((candidate, index) => {
//           console.log('   ' + index + 1 + '. ' + candidate.name + ' (' + candidate.differentiation || 'N/A' + ')');
//         });
//       } else {
//         console.log('❌ ' + company + ': エラー - ' + result.error);
//       }
//     });
//     
//     return {
//       success: true,
//       message: 'マルチ候補システムテスト完了',
//       results: results,
//       testSummary: {
//         totalCompanies: testCompanies.length,
//         successfulExtractions: Object.values(results).filter(r => r.success).length,
//         totalCandidates: Object.values(results)
//           .filter(r => r.success)
//           .reduce((sum, r) => sum + r.candidateCount, 0)
//       }
//     };
//     
//   } catch (error) {
//     console.error('❌ マルチ候補システムテスト失敗:', error.message);
//     return {
//       success: false,
//       error: error.message,
//       message: 'マルチ候補システムテストでエラーが発生しました'
//     };
//   }
// }


/**
//  * 直接DeepSeek呼び出しテスト
//  */
// function testDirectDeepSeek() {
//   console.log('🤖 直接DeepSeek呼び出しテスト');
//   var result = extractCompanyInfoWithDeepSeek('タナカホームテック株式会社');
//   console.log('DeepSeek直接呼び出し結果:', JSON.stringify(result, null, 2));
//   return result;
// }

// 重複削除: searchCompanyDetails関数はnotify.gsに移動済み

// テストデータ関数は削除 - 実DeepSeek APIのみ使用

// ===========================================
// 🌐 API ルーティング用関数（notify.gsから呼び出される）
// ===========================================

// ===========================================
// 🌐 Webアプリケーション エンドポイント
// ===========================================

/**
//  * フランチャイズヒアリング用ルーティング関数
//  * notify.gsのdoPostから呼び出される
//  */
// function handleFranchiseHearing(action, params) {
//   Logger.log('🎯 フランチャイズヒアリング処理: ' + action);
//   Logger.log('📋 パラメータ: ' + JSON.stringify(params));
//   
//   var result;
//   
//   switch (action) {
//     case 'startAIHearing':
//       result = startAIHearing(params);
//       break;
//       
//     case 'confirmAICandidate':
//       result = confirmAICandidate(params);
//       break;
//       
//     case 'selectCandidate':
//       result = selectCandidate(params);
//       break;
//       
//     case 'updateCorrectionData':
//       result = updateCorrectionData(params);
//       break;
//       
//     case 'processHumanHearing':
//       result = processHumanHearing(params);
//       break;
//       
//     case 'generatePRSuggestion':
//       result = generatePRSuggestion(params);
//       break;
//       
//     case 'completeHearing':
//       result = completeHearing(params);
//       break;
//       
//     case 'extractFromWebsite':
//       Logger.log('🌐 extractFromWebsite実行開始');
//       result = extractFromWebsite(params);
//       Logger.log('🌐 extractFromWebsite実行完了: ' + JSON.stringify(result));
//       break;
//       
//     case 'searchCompanyDetails':
//       result = searchCompanyDetails(params);
//       break;
//       
//     case 'performBackgroundDetailSearch':
//       Logger.log('🔍 performBackgroundDetailSearch実行開始');
//       result = performBackgroundDetailSearch(params);
//       Logger.log('🔍 performBackgroundDetailSearch実行完了: ' + JSON.stringify(result));
//       break;
//       
//     case 'submitFranchiseRegistration':
//       Logger.log('📝 submitFranchiseRegistration実行開始');
//       result = submitFranchiseRegistration(params);
//       Logger.log('📝 submitFranchiseRegistration実行完了: ' + JSON.stringify(result));
//       break;
//       
//     default:
//       Logger.log('❌ 未知のアクション: ' + action);
//       result = createErrorResponse('未対応のアクション: ' + action);
//   }
//   
//   Logger.log('✅ アクション ' + action + ' 完了');
//   return result;
// }



/**
//  * JSON レスポンス作成（CORS対応）
//  * @param {Object} data レスポンスデータ
//  * @param {Object} headers HTTPヘッダー
//  * @returns {Object} HTTPレスポンス
//  */
// function createJsonResponse(data, headers = {}) {
//   var output = ContentService
//     .createTextOutput(JSON.stringify(data))
//     .setMimeType(ContentService.MimeType.JSON);
//   
//   // 個別にヘッダーを設定
//   Object.keys(headers).forEach(key => {
//     output.setHeader(key, headers[key]);
//   });
//   
//   return output;
// }

// ===========================================
// 🧪 デバッグ用テスト関数
// ===========================================

/**
//  * 直接関数呼び出しテスト
//  */
// function testDirectCall() {
//   console.log('=== 直接関数呼び出しテスト ===');
//   
//   try {
//     var result = startAIHearing({ companyName: 'テスト株式会社' });
//     console.log('startAIHearing結果:', result);
//     return result;
//   } catch (error) {
//     console.log('エラー:', error.message);
//     console.log('スタックトレース:', error.stack);
//     return { success: false, error: error.message, stack: error.stack };
//   }
// }

/**
//  * doPost関数モックテスト
//  */
// function testDoPost() {
//   console.log('=== doPost関数テスト ===');
//   
//   var mockEvent = {
//     postData: {
//       contents: JSON.stringify({
//         action: 'startAIHearing',
//         companyName: 'テスト株式会社'
//       })
//     }
//   };
//   
//   try {
//     var result = doPost(mockEvent);
//     console.log('doPost結果:', result);
//     return result;
//   } catch (error) {
//     console.log('doPostエラー:', error);
//     return { success: false, error: error.message };
//   }
// }

/**
//  * ルーティング確認テスト
//  */
// function testRouting() {
//   console.log('=== ルーティング確認テスト ===');
//   
//   var actions = [
//     'startAIHearing',
//     'testAPISettings',
//     'confirmAICandidate',
//     'generatePRSuggestion'
//   ];
//   
//   actions.forEach(action => {
//     try {
//       console.log('テスト中: ' + action);
//       // ここで実際のルーティングをテスト
//       console.log('' + action + ': 関数存在確認');
//     } catch (error) {
//       console.log('' + action + ': エラー - ' + error.message);
//     }
//   });
//   
//   return { success: true, message: 'ルーティングテスト完了' };
// }

// テスト用関数：加盟店登録テスト
// function testFranchiseRegistration() {
//   return submitFranchiseRegistration({
//     legalName: "株式会社テスト",
//     companyName: "テスト会社",
//     representative: "テスト太郎",
//     contactName: "テスト太郎",
//     address: "東京都千代田区神田神保町1-1",
//     phone: "09012345678",
//     billingEmail: "billing@example.com",
//     salesEmail: "sales@example.com",
//     salesPersonName: "営業太郎",
//     salesPersonContact: "09012345679",
//     email: "test@example.com",
//     postalCode: "1010001",
//     businessType: "個人事業主",
//     foundedYear: "2020年",
//     capital: "100万円",
//     employees: "1〜10人",
//     website: "https://test.com",
//     services: ["戸建て", "アパート・マンション"],
//     serviceAreas: ["東京都港区", "東京都渋谷区"],
//     priorityAreas: ["東京都港区"],
//     businessHours: "9:00-18:00",
//     annualRevenue: "1000万円〜3000万円未満",
//     notes: "テストデータです"
//   });
// }

// デバッグ用：doPost経由でsubmitFranchiseRegistrationをテスト
// function testDoPost() {
//   var mockEvent = {
//     postData: {
//       contents: JSON.stringify({
//         action: 'submitFranchiseRegistration',
//         params: {
//           legalName: "株式会社テスト",
//           companyName: "テスト会社",
//           representative: "テスト太郎",
//           contactName: "テスト太郎",
//           address: "東京都千代田区神田神保町1-1",
//           phone: "09012345678",
//           billingEmail: "billing@example.com",
//           salesEmail: "sales@example.com",
//           salesPersonName: "営業太郎",
//           salesPersonContact: "09012345679",
//           email: "test@example.com",
//           postalCode: "1010001",
//           businessType: "個人事業主"
//         }
//       })
//     }
//   };
//   
//   return doPost(mockEvent);
// }

/**
//  * スプレッドシート書き込みテスト関数（デバッグ用）
//  */
// function testSpreadsheetWrite() {
//   try {
//     Logger.log('🧪 スプレッドシート書き込みテスト開始');
//     
//     var testData = {
//       legalName: 'テスト会社',
//       representative: 'テスト代表者',
//       phone: '03-1234-5678',
//       address: '東京都テスト区',
//       registrationDate: new Date()
//     };
//     
//     var result = saveFranchiseData(testData);
//     Logger.log('🧪 テスト結果:', JSON.stringify(result, null, 2));
//     
//     return result;
//   } catch (error) {
//     Logger.log('❌ テスト失敗:', error.message);
//     return { success: false, error: error.message };
//   }
// }

/**
//  * SPREADSHEET_ID設定確認テスト
//  */
// function testSpreadsheetConfig() {
//   try {
//     Logger.log('🔍 SPREADSHEET_ID設定確認テスト開始');
//     
//     var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
//     var FRANCHISE_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID');
//     
//     Logger.log('🔍 SPREADSHEET_ID:', SPREADSHEET_ID);
//     Logger.log('🔍 FRANCHISE_SPREADSHEET_ID:', FRANCHISE_SPREADSHEET_ID);
//     
//     var finalId = SPREADSHEET_ID || FRANCHISE_SPREADSHEET_ID;
//     Logger.log('🔍 最終的に使用されるID:', finalId);
//     
//     if (finalId) {
//       try {
//         var ss = SpreadsheetApp.openById(finalId);
//         Logger.log('✅ スプレッドシート正常にアクセス可能:', ss.getName());
//         
//         var sheet = ss.getSheetByName('加盟店登録');
//         if (sheet) {
//           Logger.log('✅ 加盟店登録シート存在確認:', sheet.getName());
//           Logger.log('📊 現在の行数:', sheet.getLastRow());
//         } else {
//           Logger.log('⚠️ 加盟店登録シートが存在しません');
//         }
//         
//         return { success: true, spreadsheetId: finalId, sheetExists: !!sheet };
//       } catch (openError) {
//         Logger.log('❌ スプレッドシートアクセスエラー:', openError.message);
//         return { success: false, error: 'スプレッドシートアクセスエラー: ' + openError.message };
//       }
//     } else {
//       Logger.log('❌ SPREADSHEET_IDが設定されていません');
//       return { success: false, error: 'SPREADSHEET_IDが設定されていません' };
//     }
//   } catch (error) {
//     Logger.log('❌ テスト失敗:', error.message);
//     return { success: false, error: error.message };
//   }
// }

/**
 * 加盟店データをスプレッドシートに保存（実際に動作する関数）
 * @param {Object} data - 保存するデータ（圧縮形式対応）
 * @returns {Object} 保存結果
 */
function saveFranchiseData(data) {
  try {
    console.log('🆕🆕🆕 最新FranchiseHearingAI_New.js - 2025/08/10 21:56更新 🆕🆕🆕');
    Logger.log('🚀 saveFranchiseData開始');
    Logger.log('📋 受信データ:', JSON.stringify(data, null, 2));
    console.log('🚀 saveFranchiseData開始 - console版');
    console.log('📋 受信データ詳細:', JSON.stringify(data, null, 2));
    console.log('📋 データキー:', Object.keys(data || {}));
    console.log('📋 legalName:', data ? data.legalName : 'データなし');
    console.log('📋 phone:', data ? data.phone : 'データなし');
    
    // データが圧縮形式（ln, lk等）の場合は展開、通常はそのまま使用
    var processedData = {};
    
    // 🔍 データ形式を判定して適切に処理
    if (!data) {
      console.log('❌ データがnullまたはundefined');
      Logger.log('❌ データが空です');
      return {
        success: false,
        error: 'データが空です'
      };
    }
    
    // lnキーがある場合のみ圧縮データとして処理
    if (data.ln) {
      Logger.log('🔍 圧縮データを検出、展開中...');
      console.log('🔍 圧縮データ展開開始 - ln検出');
      processedData = {
        legalName: data.ln,
        legalNameKana: data.lk,
        representative: data.rp,
        representativeKana: data.rk,
        postalCode: data.pc,
        address: data.ad,
        phone: data.ph,
        websiteUrl: data.web || data.url,
        employees: data.emp,
        revenue: data.rev,
        billingEmail: data.bem,
        salesEmail: data.sem,
        salesPersonName: data.spn,
        salesPersonContact: data.spc,
        propertyTypes: data.pt,
        constructionAreas: data.ca,
        specialServices: data.ss,
        buildingAgeRange: data.ba,
        tradeName: data.tn,
        tradeNameKana: data.tk,
        branchInfo: data.bi,
        establishedDate: data.ed,
        companyPR: data.cp,
        areasCompressed: data.ac,  // エリア数
        priorityAreas: data.pa      // エリアデータ（圧縮形式）
      };
      Logger.log('✅ データ展開完了');
      console.log('✅ 圧縮データ展開完了');
      console.log('📋 展開後のlegalName:', processedData.legalName);
      console.log('📋 展開後のphone:', processedData.phone);
    } else {
      // legalNameキーがある場合は既に展開済みとして処理
      Logger.log('🔍 通常データ（既に展開済み）をそのまま使用');
      console.log('🔍 データは既に展開済み - doGetで処理済み');
      processedData = data;
      console.log('📋 全データキー:', Object.keys(processedData));
      console.log('📋 legalName:', processedData.legalName);
      console.log('📋 phone:', processedData.phone);
      console.log('📋 areasCompressed:', processedData.areasCompressed ? processedData.areasCompressed.substring(0, 100) + '...' : 'なし');
    }
    
    var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    
    console.log('🔍 CRITICAL: SPREADSHEET_ID取得:', SPREADSHEET_ID);
    console.log('🔍 CRITICAL: PropertiesService直接:', PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    console.log('🔍 CRITICAL: FRANCHISE_SPREADSHEET_ID:', PropertiesService.getScriptProperties().getProperty('FRANCHISE_SPREADSHEET_ID'));
    
    Logger.log('🔍 SPREADSHEET_ID:', SPREADSHEET_ID);
    Logger.log('🔍 SPREADSHEET_ID存在チェック:', !!SPREADSHEET_ID);
    Logger.log('🔍 SPREADSHEET_IDタイプ:', typeof SPREADSHEET_ID);
    Logger.log('🔍 SPREADSHEET_ID長さ:', SPREADSHEET_ID ? SPREADSHEET_ID.length : 0);
    
    if (!SPREADSHEET_ID) {
      return {
        success: false,
        error: 'SPREADSHEET_IDが設定されていません'
      };
    }
    
    Logger.log('📊 スプレッドシートを開く');
    console.log('🔍 CRITICAL: スプレッドシート開く処理開始 ID:', SPREADSHEET_ID);
    
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('🔍 CRITICAL: スプレッドシート正常に開けました:', ss.getName());
    
    Logger.log('📊 スプレッドシート名:', ss.getName());
    
    var sheet = ss.getSheetByName('加盟店登録');
    if (!sheet) {
      Logger.log('⚠️ 加盟店登録シートが存在しないため作成');
      sheet = ss.insertSheet('加盟店登録');
    }
    
    console.log('🔍 CRITICAL: シート確認完了:', sheet.getName());
    Logger.log('📊 シート確認:', sheet.getName());
    
    function cleanPhone(phone) {
      if (!phone) {
        console.log('⚠️ cleanPhone: 電話番号が空');
        return '';
      }
      // シングルクォートを除去してから処理
      var phoneStr = String(phone).replace(/['-\s]/g, '');
      console.log('📞 cleanPhone - 元の値:', phone);
      console.log('📞 cleanPhone - クリーニング後:', phoneStr);
      
      if (phoneStr && !phoneStr.startsWith('0')) {
        phoneStr = '0' + phoneStr;
        console.log('📞 cleanPhone - 先頭0追加:', phoneStr);
      }
      return "'" + phoneStr;
    }
    
    var cleanedPhone = cleanPhone(processedData.phone);
    var cleanedSalesContact = cleanPhone(processedData.salesPersonContact);
    
    console.log('🚨 CRITICAL DEBUG: saveFranchiseData内 - cleanPhone:', cleanedPhone);
    console.log('🚨 CRITICAL DEBUG: saveFranchiseData内 - cleanSalesContact:', cleanedSalesContact);
    
    var now = new Date();
    var franchiseId = 'FC-' + Utilities.formatDate(now, 'JST', 'yyMMdd') + '-' + 
      Math.random().toString(36).substr(2, 4).toUpperCase();
    
    var rowData = [
      franchiseId,
      Utilities.formatDate(now, 'JST', 'yyyy/MM/dd HH:mm:ss'),
      processedData.legalName || '',
      processedData.legalNameKana || '',
      processedData.representative || '',
      processedData.representativeKana || '',
      processedData.postalCode || '',
      processedData.address || '',
      cleanedPhone,
      processedData.websiteUrl || '',
      processedData.employees || '',
      processedData.revenue || '',
      processedData.billingEmail || '',
      processedData.salesEmail || '',
      processedData.salesPersonName || '',
      cleanedSalesContact,
      processedData.propertyTypes || '',
      processedData.constructionAreas || '',
      processedData.specialServices || '',
      processedData.buildingAgeRange || '',
      processedData.tradeName || '',
      processedData.tradeNameKana || '',
      processedData.branchInfo || '',
      processedData.establishedDate || '',
      processedData.companyPR || '',
      processedData.priorityAreas || processedData.pa || '',  // 対応エリア（エリアデータ）
      processedData.areasCompressed || processedData.ac || '', // 優先対応エリア（本来はエリア数）
      Utilities.formatDate(now, 'JST', 'yyyy/MM/dd HH:mm:ss'),
      '',
      '申請中',
      '',
      '',
      'ウェブフォームより申請'
    ];
    
    var lastRow = sheet.getLastRow();
    console.log('🔍 実際の最終データ行:', lastRow);
    console.log('🔍 挿入先行:', lastRow + 1);
    
    console.log('🚨 CRITICAL DEBUG: 挿入する行データ (I列:電話番号):', rowData[8]);
    console.log('🚨 CRITICAL DEBUG: 挿入する行データ (P列:営業担当者連絡先):', rowData[15]);
    
    sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    
    console.log('✅ タイムスタンプ列の書式設定完了');
    console.log('🔍 CRITICAL: データ終了後の挿入先行:', lastRow + 1);
    console.log('🔍 CRITICAL: 挿入データ列数:', rowData.length);
    console.log('✅ 加盟店登録シートに保存完了（2行目に新行挿入）');
    
    // Slack通知はnotify.js内で既に実行されているため、ここでは呼び出さない
    console.log('✅ 【FranchiseHearingAI_New.js】データ保存完了 - Slack通知開始');
    
    // Slack通知を送信（重複チェック済み - notify.jsの処理パスが実行されていないため必要）
    try {
      console.log('📤 Slack通知送信開始:', franchiseId);
      var notificationResult = notifyNewFranchiseRegistrationV2(franchiseId, data);
      console.log('🔥 Slack通知結果:', JSON.stringify(notificationResult));
    } catch (notifyError) {
      console.error('❌ Slack通知エラー（登録は完了済み）:', notifyError.message);
    }
    
    console.log('📝 saveFranchiseData結果:', JSON.stringify({
      success: true,
      franchiseId: franchiseId,
      message: '加盟店登録が完了しました'
    }));
    
    return {
      success: true,
      franchiseId: franchiseId,
      message: '加盟店登録が完了しました'
    };
    
  } catch (error) {
    Logger.log('❌ saveFranchiseData エラー:', error.message);
    Logger.log('❌ エラースタック:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * GAS WebApp URLの一元管理
 * @returns {string} 現在のGAS WebApp URL
 */
function getGasWebappUrl() {
  try {
    var properties = PropertiesService.getScriptProperties();
    var url = properties.getProperty('GAS_WEBAPP_URL');
    
    console.log('🔍 GAS_WEBAPP_URL プロパティ確認:', url);
    console.log('🔍 全プロパティ一覧:', JSON.stringify(properties.getProperties()));
    
    if (!url) {
      console.log('⚠️ GAS_WEBAPP_URL未設定 - フォールバック使用');
      // フォールバック: 現在のWebApp URLを自動取得
      var currentUrl = ScriptApp.getService().getUrl();
      console.log('🔄 自動取得URL:', currentUrl);
      return currentUrl;
    }
    console.log('✅ 設定済みURL使用:', url);
    return url;
  } catch (error) {
    console.error('❌ getGasWebappUrl エラー:', error);
    // プロパティ参照必須 - ハードコード禁止
    throw new Error('GAS_WEBAPP_URLプロパティが設定されていません - プロパティ設定が必要です');
  }
}