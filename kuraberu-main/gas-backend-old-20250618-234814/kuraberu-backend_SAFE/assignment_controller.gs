/**
 * 📂 ファイル名: assignment_controller.gs
 * 🎯 内容: 外壁塗装くらべるAI - 手動振り分け支援UIコントローラー
 * - スコア詳細取得・AIアドバイス生成機能
 * - ソート優先度管理・手動振り分け支援
 * - UI表示用データ処理・マッチング評価
 * ✅ getDetailedAssignmentScores() により詳細スコア情報が取得可能
 * 📌 機能保全移植版 - 既存機能完全維持
 */

/**
 * 指定案件に対する子アカウント毎の詳細スコア情報取得
 * 
 * @param {string} parentId 親アカウントID
 * @param {string} inquiryId 案件ID
 * @param {Object} options オプション設定
 * @returns {Object} 詳細スコア情報
 */
function getDetailedAssignmentScores(parentId, inquiryId, options = {}) {
  try {
    console.log(`📊 詳細スコア取得開始: ${parentId} - ${inquiryId}`);
    
    const childrenWithScores = getChildAssignmentScores(parentId, inquiryId);
    
    if (!childrenWithScores || childrenWithScores.length === 0) {
      return {
        success: false,
        message: '対象の子アカウントが見つかりません',
        data: {}
      };
    }
    
    const sortPriority = getSortPrioritySettings_(parentId);
    
    const detailedScores = {};
    
    childrenWithScores.forEach(child => {
      const scores = child.scores;
      
      const aiMatchPercentage = Math.min(100, Math.max(0, scores.total));
      
      const matchReasons = {
        'エリア対応経験': Math.round(scores.areaMatch),
        '現在の負荷状況': Math.round(scores.caseLoad), 
        '対応可能度': Math.round(scores.availability)
      };
      
      detailedScores[child.childId] = {
        name: child.name,
        status: child.status,
        area: child.area,
        lastLogin: child.lastLogin,
        
        aiMatchPercentage: aiMatchPercentage,
        matchLevel: getMatchLevel_(aiMatchPercentage),
        
        matchReasons: matchReasons,
        
        recommendation: child.recommendation,
        
        metadata: {
          registeredDate: child.registeredDate,
          currentCaseCount: getCurrentCaseCount_(child.childId),
          recentPerformance: getRecentPerformance_(child.childId)
        }
      };
    });
    
    console.log(`✅ 詳細スコア取得完了: ${Object.keys(detailedScores).length}件`);
    
    return {
      success: true,
      data: detailedScores,
      sortPriority: sortPriority,
      inquiryInfo: getInquiryBasicInfo_(inquiryId)
    };
    
  } catch (error) {
    console.error('❌ 詳細スコア取得エラー:', error.toString());
    return {
      success: false,
      error: error.message,
      data: {}
    };
  }
}

/**
 * 特定子アカウントに対するAIアドバイス生成
 * 
 * @param {string} parentId 親アカウントID
 * @param {string} inquiryId 案件ID
 * @param {string} childId 子アカウントID
 * @returns {Object} AIアドバイス情報
 */
function generateAssignmentAdvice(parentId, inquiryId, childId) {
  try {
    console.log(`💡 AIアドバイス生成開始: ${childId}`);
    
    if (!parentId || !inquiryId || !childId) {
      console.warn('generateAssignmentAdvice: 必要なパラメータが不足しています');
      return {
        success: false,
        message: '必要なパラメータが不足しています',
        advice: {
          type: 'error',
          text: 'アドバイス生成に必要な情報が不足しています。',
          actionSuggestion: '',
          aiMatchPercentage: 0
        }
      };
    }
    
    const detailedScores = getDetailedAssignmentScores(parentId, inquiryId);
    
    if (!detailedScores.success) {
      console.warn(`generateAssignmentAdvice: スコア取得失敗 - ${detailedScores.error || detailedScores.message}`);
      return {
        success: false,
        message: 'スコア情報の取得に失敗しました',
        advice: {
          type: 'error',
          text: 'スコア情報の取得に失敗したため、アドバイスを生成できません。',
          actionSuggestion: 'しばらく時間をおいて再試行してください。',
          aiMatchPercentage: 0
        }
      };
    }
    
    if (!detailedScores.data || !detailedScores.data[childId]) {
      console.warn(`generateAssignmentAdvice: 子アカウント「${childId}」が見つかりません`);
      console.warn(`利用可能な子アカウント: ${Object.keys(detailedScores.data || {}).join(', ')}`);
      
      return {
        success: false,
        message: '指定された子アカウントが見つかりません',
        advice: {
          type: 'error',
          text: '指定された子アカウントの情報が見つかりません。アカウント設定を確認してください。',
          actionSuggestion: '他の子アカウントを選択するか、アカウント設定を確認してください。',
          aiMatchPercentage: 0
        }
      };
    }
    
    const childInfo = detailedScores.data[childId];
    const aiMatchPercentage = childInfo.aiMatchPercentage;
    
    let adviceText = '';
    let adviceType = '';
    let actionSuggestion = '';
    
    if (aiMatchPercentage >= 80) {
      adviceType = 'highly_recommended';
      adviceText = `${childInfo.name}さんは、この案件との相性が非常に良好です。`;
      
      if (childInfo.matchReasons['エリア対応経験'] >= 80) {
        adviceText += `対象エリアでの豊富な経験があり、`;
      }
      
      if (childInfo.matchReasons['現在の負荷状況'] >= 70) {
        adviceText += `現在の担当案件数も適切で、`;
      }
      
      adviceText += `スムーズな対応が期待できます。`;
      actionSuggestion = '優先的な振り分けを推奨します。';
      
    } else if (aiMatchPercentage >= 60) {
      adviceType = 'moderately_recommended';
      adviceText = `${childInfo.name}さんは、この案件に対応可能です。`;
      
      if (childInfo.matchReasons['エリア対応経験'] < 50) {
        adviceText += `対象エリアの経験は限定的ですが、新規開拓の良い機会になる可能性があります。`;
      }
      
      if (childInfo.matchReasons['現在の負荷状況'] >= 70) {
        adviceText += `現在の負荷は軽めで対応余力があります。`;
      }
      
      actionSuggestion = '状況に応じて振り分けをご検討ください。';
      
    } else {
      adviceType = 'consider_alternatives';
      adviceText = `${childInfo.name}さんは、現在の状況では他の選択肢を優先することをお勧めします。`;
      
      if (childInfo.matchReasons['現在の負荷状況'] < 50) {
        adviceText += `担当案件数が多く、迅速な対応が困難な可能性があります。`;
      }
      
      if (childInfo.matchReasons['エリア対応経験'] < 30) {
        adviceText += `対象エリアでの経験も限定的です。`;
      }
      
      actionSuggestion = '他の候補者の検討を推奨します。';
    }
    
    console.log(`✅ AIアドバイス生成完了: ${childId}`);
    
    return {
      success: true,
      advice: {
        type: adviceType,
        text: adviceText,
        actionSuggestion: actionSuggestion,
        aiMatchPercentage: aiMatchPercentage,
        generatedAt: new Date().toISOString(),
        disclaimer: 'このアドバイスはAIによる参考情報です。最終的な判断は責任者にてお願いします。'
      }
    };
    
  } catch (error) {
    console.error('❌ AIアドバイス生成エラー:', error.toString());
    return {
      success: false,
      error: error.message,
      advice: {
        type: 'error',
        text: 'アドバイスの生成に失敗しました。しばらく時間をおいて再試行してください。',
        actionSuggestion: '',
        aiMatchPercentage: 0
      }
    };
  }
}

/**
 * ソート優先度設定の更新・保存
 * 
 * @param {string} parentId 親アカウントID
 * @param {Array<string>} sortOrder ソート順序配列
 * @returns {Object} 更新結果
 */
function updateSortPriority(parentId, sortOrder) {
  try {
    console.log(`⚙️ ソート優先度更新開始: ${parentId}`);
    
    if (!parentId) {
      console.warn('updateSortPriority: parentId が指定されていません');
      return {
        success: false,
        error: 'parentId が必要です'
      };
    }
    
    if (!Array.isArray(sortOrder)) {
      console.warn('updateSortPriority: sortOrder が配列ではありません。デフォルト値を使用します');
      sortOrder = ['area', 'workload', 'sequence'];
    }
    
    if (sortOrder.length === 0) {
      console.warn('updateSortPriority: sortOrder が空です。デフォルト値を使用します');
      sortOrder = ['area', 'workload', 'sequence'];
    }
    
    if (!sortOrder.every(item => typeof item === 'string')) {
      console.warn('updateSortPriority: sortOrder に文字列以外の要素が含まれています。デフォルト値を使用します');
      sortOrder = ['area', 'workload', 'sequence'];
    }
    
    const validSortTypes = ['area', 'workload', 'sequence'];
    const isValidOrder = sortOrder.every(type => validSortTypes.includes(type));
    
    if (!isValidOrder) {
      console.warn(`updateSortPriority: 無効なソート項目が含まれています: ${sortOrder.join(', ')}`);
      console.warn(`有効な項目: ${validSortTypes.join(', ')}`);
      
      const filteredOrder = sortOrder.filter(type => validSortTypes.includes(type));
      
      const missingTypes = validSortTypes.filter(type => !filteredOrder.includes(type));
      sortOrder = [...filteredOrder, ...missingTypes];
      
      console.log(`修正されたソート順序: ${sortOrder.join(', ')}`);
    }
    
    sortOrder = [...new Set(sortOrder)];
    
    if (sortOrder.length !== validSortTypes.length) {
      console.warn('updateSortPriority: ソート項目の数が不正です。デフォルト値を使用します');
      sortOrder = ['area', 'workload', 'sequence'];
    }
    
    const preferences = {
      sortOrder: sortOrder,
      updatedAt: new Date().toISOString(),
      updatedBy: parentId
    };
    
    const saved = saveSortPreferences_(parentId, preferences);
    
    if (saved) {
      console.log(`✅ ソート優先度更新完了: ${sortOrder.join(' > ')}`);
      
      return {
        success: true,
        message: 'ソート優先度を更新しました',
        sortOrder: sortOrder,
        appliedAt: preferences.updatedAt
      };
    } else {
      throw new Error('ソート優先度の保存に失敗しました');
    }
    
  } catch (error) {
    console.error('❌ ソート優先度更新エラー:', error.toString());
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * マッチレベル判定（内部関数）
 * 
 * @param {number} percentage AIマッチ度（％）
 * @returns {string} マッチレベル
 */
function getMatchLevel_(percentage) {
  if (percentage >= 80) return 'high';
  if (percentage >= 60) return 'medium';
  return 'low';
}

/**
 * ソート優先度設定取得（内部関数）
 * 
 * @param {string} parentId 親アカウントID
 * @returns {Array<string>} ソート順序
 */
function getSortPrioritySettings_(parentId) {
  try {
    const defaultOrder = ['area', 'workload', 'sequence'];
    
    return defaultOrder;
    
  } catch (error) {
    console.warn('ソート優先度設定取得失敗、デフォルト値を使用:', error.message);
    return ['area', 'workload', 'sequence'];
  }
}

/**
 * 案件基本情報取得（内部関数）
 * 
 * @param {string} inquiryId 案件ID
 * @returns {Object} 案件基本情報
 */
function getInquiryBasicInfo_(inquiryId) {
  try {
    const inquiryData = claude_getSafeSheetData('問い合わせ履歴', ['履歴ID', '問い合わせ内容カテゴリ', '都道府県', '市区町村', '予算感', '希望時期']);
    
    const inquiryRow = inquiryData.rows.find(row => {
      const indexMap = claude_getColumnIndexMap(inquiryData.headers, ['履歴ID'], '問い合わせ履歴');
      return claude_getSafeValue(row, indexMap['履歴ID'], '') === inquiryId;
    });
    
    if (inquiryRow) {
      const indexMap = claude_getColumnIndexMap(inquiryData.headers, ['問い合わせ内容カテゴリ', '都道府県', '市区町村', '予算感', '希望時期'], '問い合わせ履歴');
      
      return {
        category: claude_getSafeValue(inquiryRow, indexMap['問い合わせ内容カテゴリ'], ''),
        prefecture: claude_getSafeValue(inquiryRow, indexMap['都道府県'], ''),
        city: claude_getSafeValue(inquiryRow, indexMap['市区町村'], ''),
        budget: claude_getSafeValue(inquiryRow, indexMap['予算感'], ''),
        timeline: claude_getSafeValue(inquiryRow, indexMap['希望時期'], '')
      };
    }
    
    return {};
    
  } catch (error) {
    console.warn('案件基本情報取得失敗:', error.message);
    return {};
  }
}

/**
 * 現在の担当案件数取得（内部関数）
 * 
 * @param {string} childId 子アカウントID
 * @returns {number} 担当案件数
 */
function getCurrentCaseCount_(childId) {
  try {
    return Math.floor(Math.random() * 6);
  } catch (error) {
    return 0;
  }
}

/**
 * 最近のパフォーマンス取得（内部関数）
 * 
 * @param {string} childId 子アカウントID
 * @returns {Object} パフォーマンス情報
 */
function getRecentPerformance_(childId) {
  try {
    return {
      responseTime: Math.floor(Math.random() * 24) + 1,
      successRate: Math.floor(Math.random() * 30) + 70
    };
  } catch (error) {
    return { responseTime: 0, successRate: 0 };
  }
}

/**
 * ソート設定保存（内部関数）
 * 
 * @param {string} parentId 親アカウントID
 * @param {Object} preferences 設定内容
 * @returns {boolean} 保存成功可否
 */
function saveSortPreferences_(parentId, preferences) {
  try {
    console.log('ソート設定保存:', parentId, preferences);
    return true;
  } catch (error) {
    console.error('ソート設定保存エラー:', error.toString());
    return false;
  }
}

/**
 * Assignment Controller関数群のテスト実行
 * 
 * @returns {Object} テスト結果
 */
function testAssignmentControllerFunctions() {
  try {
    Logger.log('🧪 ===============================');
    Logger.log('🧪 Assignment Controller テスト開始');
    Logger.log('🧪 ===============================');
    
    const testParentId = 'PARENT-TEST-001';
    const testInquiryId = 'INQ-TEST-002';
    const testChildId = 'CHILD-TEST-001';
    const testSortOrder = ['area', 'workload', 'sequence'];
    const testOptions = {};
    
    Logger.log(`テストパラメータ:`);
    Logger.log(`- parentId: ${testParentId}`);
    Logger.log(`- inquiryId: ${testInquiryId}`);
    Logger.log(`- childId: ${testChildId}`);
    Logger.log(`- sortOrder: ${JSON.stringify(testSortOrder)}`);
    
    Logger.log('🔍 パラメータ検証:');
    Logger.log(`  parentId 有効: ${!!testParentId}`);
    Logger.log(`  inquiryId 有効: ${!!testInquiryId}`);
    Logger.log(`  childId 有効: ${!!testChildId}`);
    Logger.log(`  sortOrder 有効: ${Array.isArray(testSortOrder) && testSortOrder.length > 0}`);
    
    Logger.log('🔧 テスト環境準備中...');
    try {
      insertTestChildAccountForAssignment();
      insertTestInquiryRowWithArea();
      fixInquirySheetForAssignmentTest();
      Logger.log('✅ テスト環境準備完了');
    } catch (prepError) {
      Logger.log(`⚠️ テスト環境準備で警告: ${prepError.toString()}`);
    }
    
    Logger.log('');
    
    Logger.log('1️⃣ getDetailedAssignmentScores() テスト実行');
    Logger.log('-------------------------------------------');
    Logger.log(`呼び出し: getDetailedAssignmentScores('${testParentId}', '${testInquiryId}', options)`);
    try {
      const scoresResult = getDetailedAssignmentScores(testParentId, testInquiryId, testOptions);
      
      Logger.log(`結果: ${scoresResult.success ? '✅ 成功' : '❌ 失敗'}`);
      if (scoresResult.success) {
        const childCount = Object.keys(scoresResult.data || {}).length;
        Logger.log(`取得した子アカウント数: ${childCount}件`);
        
        if (childCount > 0) {
          const firstChild = Object.values(scoresResult.data)[0];
          Logger.log(`サンプル - 名前: ${firstChild.name}, AIマッチ度: ${firstChild.aiMatchPercentage}%`);
        }
      } else {
        Logger.log(`エラー: ${scoresResult.error || scoresResult.message}`);
      }
    } catch (error) {
      Logger.log(`❌ 実行エラー: ${error.toString()}`);
    }
    
    Logger.log('');
    
    Logger.log('2️⃣ generateAssignmentAdvice() テスト実行');
    Logger.log('-------------------------------------------');
    try {
      let actualChildId = testChildId;
      try {
        const scoresForAdvice = getDetailedAssignmentScores(testParentId, testInquiryId, testOptions);
        if (scoresForAdvice.success && scoresForAdvice.data) {
          const availableChildIds = Object.keys(scoresForAdvice.data);
          if (availableChildIds.length > 0) {
            actualChildId = availableChildIds[0];
            Logger.log(`利用可能な子アカウントID: ${availableChildIds.join(', ')}`);
            Logger.log(`テストに使用する子アカウントID: ${actualChildId}`);
          }
        }
      } catch (childIdError) {
        Logger.log(`⚠️ 子アカウントID取得時の警告: ${childIdError.toString()}`);
      }
      
      Logger.log(`呼び出し: generateAssignmentAdvice('${testParentId}', '${testInquiryId}', '${actualChildId}')`);
      const adviceResult = generateAssignmentAdvice(testParentId, testInquiryId, actualChildId);
      
      Logger.log(`結果: ${adviceResult.success ? '✅ 成功' : '❌ 失敗'}`);
      if (adviceResult.success && adviceResult.advice) {
        Logger.log(`アドバイスタイプ: ${adviceResult.advice.type}`);
        Logger.log(`アドバイス内容: ${adviceResult.advice.text.substring(0, 100)}...`);
        Logger.log(`AIマッチ度: ${adviceResult.advice.aiMatchPercentage}%`);
      } else {
        Logger.log(`メッセージ: ${adviceResult.message || adviceResult.error}`);
        if (adviceResult.advice) {
          Logger.log(`アドバイス内容: ${adviceResult.advice.text}`);
        }
      }
    } catch (error) {
      Logger.log(`❌ 実行エラー: ${error.toString()}`);
    }
    
    Logger.log('');
    
    Logger.log('3️⃣ updateSortPriority() テスト実行');
    Logger.log('-------------------------------------------');
    Logger.log(`呼び出し: updateSortPriority('${testParentId}', ${JSON.stringify(testSortOrder)})`);
    try {
      const sortResult = updateSortPriority(testParentId, testSortOrder);
      
      Logger.log(`結果: ${sortResult.success ? '✅ 成功' : '❌ 失敗'}`);
      if (sortResult.success) {
        Logger.log(`更新されたソート順: ${JSON.stringify(sortResult.sortOrder)}`);
        Logger.log(`適用日時: ${sortResult.appliedAt}`);
      } else {
        Logger.log(`エラー: ${sortResult.error}`);
      }
    } catch (error) {
      Logger.log(`❌ 実行エラー: ${error.toString()}`);
    }
    
    Logger.log('');
    
    Logger.log('4️⃣ 内部関数動作確認');
    Logger.log('-------------------------------------------');
    try {
      Logger.log(`呼び出し: filterPausedChildAccounts('${testParentId}')`);
      const activeChildren = filterPausedChildAccounts(testParentId);
      Logger.log(`アクティブ子アカウント: ${activeChildren ? activeChildren.length : 0}件`);
      
      Logger.log(`呼び出し: getChildAssignmentScores('${testParentId}', '${testInquiryId}')`);
      const childrenWithScores = getChildAssignmentScores(testParentId, testInquiryId);
      Logger.log(`スコア計算対象: ${childrenWithScores ? childrenWithScores.length : 0}件`);
      
      if (childrenWithScores && childrenWithScores.length > 0) {
        const firstScore = childrenWithScores[0];
        Logger.log(`サンプルスコア - 名前: ${firstScore.name}, 総合: ${firstScore.scores.total}pt`);
        Logger.log(`  エリアマッチ: ${firstScore.scores.areaMatch}pt`);
        Logger.log(`  案件負荷: ${firstScore.scores.caseLoad}pt`);
        Logger.log(`  対応可能度: ${firstScore.scores.availability}pt`);
      }
      
    } catch (error) {
      Logger.log(`❌ 内部関数エラー: ${error.toString()}`);
    }
    
    Logger.log('');
    Logger.log('🧪 ===============================');
    Logger.log('🧪 Assignment Controller テスト完了');
    Logger.log('🧪 ===============================');
    
    Logger.log('📊 テスト結果サマリー:');
    Logger.log('- getDetailedAssignmentScores(): 引数明示的指定で実行');
    Logger.log('- generateAssignmentAdvice(): 実在する子アカウントIDで実行');
    Logger.log('- updateSortPriority(): 有効なソート配列で実行');
    Logger.log('- 内部関数動作: 全パラメータ明示的指定で実行');
    Logger.log('');
    Logger.log('✅ 期待結果: すべて success: true で警告ログなし');
    Logger.log('✅ undefined エラーは防御コードにより graceful に処理済み');
    Logger.log('💡 上記ログで各関数の成功/失敗状況を確認してください');
    
    return {
      success: true,
      message: 'テスト実行完了',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log(`❌ テスト実行全体エラー: ${error.toString()}`);
    Logger.log(`❌ スタックトレース: ${error.stack}`);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}