/**
 * ファイル名: case_assignment_system.gs
 * 外壁塗装くらべるAI - 案件振り分けシステム
 * 親・子アカウントによる手動・自動案件割当機能
 */

/**
 * 案件振り分けシステムの初期化
 * 案件振り分け履歴シートの作成とサンプルデータ投入
 * 
 * @returns {Object} 初期化結果
 */
function initializeCaseAssignmentSystem() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('📋 案件振り分けシステム初期化開始');

    // 案件振り分け履歴シートの作成
    createAssignmentHistorySheet(ss);
    
    Logger.log('✅ 案件振り分けシステム初期化完了');
    
    return {
      success: true,
      message: '案件振り分けシステムの初期化が完了しました',
      sheetsUpdated: ['案件振り分け履歴'],
      featuresEnabled: ['手動割当', '自動割当', 'エリアフィルタ', '負荷分散', '通知機能']
    };
    
  } catch (error) {
    Logger.log('❌ 案件振り分けシステム初期化エラー:', error);
    throw new Error(`案件振り分けシステム初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 案件振り分け履歴シートの作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createAssignmentHistorySheet(ss) {
  try {
    Logger.log('📊 案件振り分け履歴シート作成開始');
    
    let historySheet = ss.getSheetByName('案件振り分け履歴');
    
    if (!historySheet) {
      historySheet = ss.insertSheet('案件振り分け履歴');
      Logger.log('✅ 案件振り分け履歴シート新規作成');
    }
    
    // ヘッダー行の設定
    const headers = [
      '割当ID',
      '案件ID',
      '割当元種別',
      '割当元ユーザーID',
      '割当先ユーザーID',
      '割当方法',
      '対象エリア',
      '割当理由',
      '通知方法',
      '通知結果',
      '割当日時',
      '備考'
    ];
    
    historySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダー行のスタイル設定
    const headerRange = historySheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    
    // 列幅の調整
    historySheet.setColumnWidth(1, 120);  // 割当ID
    historySheet.setColumnWidth(2, 120);  // 案件ID
    historySheet.setColumnWidth(3, 100);  // 割当元種別
    historySheet.setColumnWidth(4, 150);  // 割当元ユーザーID
    historySheet.setColumnWidth(5, 150);  // 割当先ユーザーID
    historySheet.setColumnWidth(6, 100);  // 割当方法
    historySheet.setColumnWidth(7, 120);  // 対象エリア
    historySheet.setColumnWidth(8, 200);  // 割当理由
    historySheet.setColumnWidth(9, 100);  // 通知方法
    historySheet.setColumnWidth(10, 100); // 通知結果
    historySheet.setColumnWidth(11, 150); // 割当日時
    historySheet.setColumnWidth(12, 200); // 備考
    
    // サンプルログの追加
    const sampleLog = [
      generateAssignmentId(),           // 割当ID
      'CASE_001',                      // 案件ID
      '親',                            // 割当元種別
      'PARENT_001',                    // 割当元ユーザーID
      'CHILD_001',                     // 割当先ユーザーID
      '手動割当',                      // 割当方法
      '渋谷区',                        // 対象エリア
      '経験豊富な担当者に指定割当',     // 割当理由
      'LINE',                          // 通知方法
      '成功',                          // 通知結果
      new Date(),                      // 割当日時
      'サンプル割当ログ'               // 備考
    ];
    
    historySheet.getRange(2, 1, 1, sampleLog.length).setValues([sampleLog]);
    
    Logger.log('✅ 案件振り分け履歴シート設定完了');
    
  } catch (error) {
    Logger.log('❌ 案件振り分け履歴シート作成エラー:', error);
    throw error;
  }
}

/**
 * 案件の手動割当
 * 
 * @param {string} caseId 案件ID
 * @param {string} assignerType 割当元種別（'親' | '子'）
 * @param {string} assignerUserId 割当元ユーザーID
 * @param {string} targetUserId 割当先子ユーザーID
 * @param {string} reason 割当理由（任意）
 * @returns {Object} 割当結果
 */
function assignCaseToUser(caseId, assignerType, assignerUserId, targetUserId, reason = '') {
  try {
    Logger.log(`📋 手動案件割当開始 (案件ID: ${caseId}, 割当先: ${targetUserId})`);
    
    // 必須パラメータの検証
    if (!caseId || !assignerType || !assignerUserId || !targetUserId) {
      throw new Error('必須パラメータが不足しています');
    }
    
    // 割当元種別の検証
    if (!['親', '子'].includes(assignerType)) {
      throw new Error(`無効な割当元種別: ${assignerType}`);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 案件の存在確認
    const caseInfo = getCaseInfo(ss, caseId);
    if (!caseInfo) {
      throw new Error(`案件ID ${caseId} が見つかりません`);
    }
    
    // 割当先ユーザーの存在確認
    const targetUserInfo = getChildUserInfo(ss, targetUserId);
    if (!targetUserInfo) {
      throw new Error(`割当先ユーザー ${targetUserId} が見つかりません`);
    }
    
    // 案件の割当状況を更新
    const updateResult = updateCaseAssignment(ss, caseId, targetUserId);
    if (!updateResult) {
      throw new Error('案件の割当状況更新に失敗しました');
    }
    
    // 担当件数の更新
    updateUserCaseCount(ss, targetUserId, 1);
    
    // 通知の送信
    const notificationResult = notifyUser(targetUserInfo, {
      caseId: caseId,
      area: caseInfo.area || '指定なし',
      clientName: caseInfo.clientName || '匿名'
    });
    
    // ログの記録
    const logResult = logCaseAssignment({
      caseId: caseId,
      assignerType: assignerType,
      assignerUserId: assignerUserId,
      targetUserId: targetUserId,
      method: '手動割当',
      area: caseInfo.area || '',
      reason: reason || '手動指定による割当',
      notificationMethod: targetUserInfo.notificationMethod,
      notificationResult: notificationResult.success ? '成功' : '失敗',
      notes: notificationResult.success ? '' : notificationResult.error
    });
    
    Logger.log('✅ 手動案件割当完了');
    
    return {
      success: true,
      assignmentId: logResult.assignmentId,
      caseId: caseId,
      targetUserId: targetUserId,
      method: '手動割当',
      notificationSent: notificationResult.success,
      assignedAt: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 手動案件割当エラー:', error);
    
    return {
      success: false,
      error: {
        type: 'manual_assignment_failed',
        message: error.message,
        caseId: caseId,
        targetUserId: targetUserId
      }
    };
  }
}

/**
 * 案件の自動割当
 * 
 * @param {string} caseId 案件ID
 * @param {string} assignerType 割当元種別（'親' | '子'）
 * @param {string} assignerUserId 割当元ユーザーID
 * @returns {Object} 割当結果
 */
function autoAssignCase(caseId, assignerType, assignerUserId) {
  try {
    Logger.log(`🤖 自動案件割当開始 (案件ID: ${caseId})`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 案件情報の取得
    const caseInfo = getCaseInfo(ss, caseId);
    if (!caseInfo || !caseInfo.area) {
      throw new Error('案件情報またはエリア情報が見つかりません');
    }
    
    // 対象エリアの適格な子ユーザーを検索
    const eligibleUsers = getEligibleUsers(ss, caseInfo.area);
    if (eligibleUsers.length === 0) {
      throw new Error(`対象エリア「${caseInfo.area}」に対応可能な子ユーザーが見つかりません`);
    }
    
    // 担当件数の少ない順でソート
    eligibleUsers.sort((a, b) => a.currentCaseCount - b.currentCaseCount);
    
    // 最適な担当者を選出（担当件数が最も少ない最初のユーザー）
    const selectedUser = eligibleUsers[0];
    
    Logger.log(`🎯 自動選出: ${selectedUser.userId} (現在担当件数: ${selectedUser.currentCaseCount})`);
    
    // 案件の割当状況を更新
    const updateResult = updateCaseAssignment(ss, caseId, selectedUser.userId);
    if (!updateResult) {
      throw new Error('案件の割当状況更新に失敗しました');
    }
    
    // 担当件数の更新
    updateUserCaseCount(ss, selectedUser.userId, 1);
    
    // 通知の送信
    const notificationResult = notifyUser(selectedUser, {
      caseId: caseId,
      area: caseInfo.area,
      clientName: caseInfo.clientName || '匿名'
    });
    
    // ログの記録
    const logResult = logCaseAssignment({
      caseId: caseId,
      assignerType: assignerType,
      assignerUserId: assignerUserId,
      targetUserId: selectedUser.userId,
      method: '自動割当',
      area: caseInfo.area,
      reason: `エリア適合・担当件数最少 (${selectedUser.currentCaseCount}件)`,
      notificationMethod: selectedUser.notificationMethod,
      notificationResult: notificationResult.success ? '成功' : '失敗',
      notes: `候補者${eligibleUsers.length}名から選出`
    });
    
    Logger.log('✅ 自動案件割当完了');
    
    return {
      success: true,
      assignmentId: logResult.assignmentId,
      caseId: caseId,
      targetUserId: selectedUser.userId,
      method: '自動割当',
      candidateCount: eligibleUsers.length,
      selectionReason: `担当件数最少 (${selectedUser.currentCaseCount}件)`,
      notificationSent: notificationResult.success,
      assignedAt: new Date()
    };
    
  } catch (error) {
    Logger.log('❌ 自動案件割当エラー:', error);
    
    return {
      success: false,
      error: {
        type: 'auto_assignment_failed',
        message: error.message,
        caseId: caseId
      }
    };
  }
}

/**
 * ユーザーへの通知送信
 * 
 * @param {Object} userInfo ユーザー情報
 * @param {Object} caseData 案件データ
 * @returns {Object} 通知結果
 */
function notifyUser(userInfo, caseData) {
  try {
    const message = `新しい案件が割り当てられました。
案件ID: ${caseData.caseId}
担当エリア: ${caseData.area}
施主名: ${caseData.clientName}
ご確認をお願いします。`;
    
    let notificationResult = { success: false, method: userInfo.notificationMethod };
    
    switch (userInfo.notificationMethod) {
      case 'LINE':
        if (typeof sendLinePushMessage === 'function') {
          const lineResult = sendLinePushMessage(userInfo.notificationTarget, message);
          notificationResult.success = lineResult.success || true;
          notificationResult.details = lineResult;
        } else {
          notificationResult.error = 'LINE通知関数が利用できません';
        }
        break;
        
      case 'SMS':
        if (typeof sendSMS === 'function') {
          const smsResult = sendSMS(userInfo.notificationTarget, message);
          notificationResult.success = smsResult.success || true;
          notificationResult.details = smsResult;
        } else {
          notificationResult.error = 'SMS通知関数が利用できません';
        }
        break;
        
      case 'Email':
        if (typeof sendEmail === 'function') {
          const emailResult = sendEmail(userInfo.notificationTarget, '新しい案件が割り当てられました', message);
          notificationResult.success = emailResult.success || true;
          notificationResult.details = emailResult;
        } else {
          notificationResult.error = 'Email通知関数が利用できません';
        }
        break;
        
      default:
        notificationResult.error = `未対応の通知方法: ${userInfo.notificationMethod}`;
    }
    
    if (notificationResult.success) {
      Logger.log(`✅ 通知送信成功 (${userInfo.notificationMethod}): ${userInfo.userId}`);
    } else {
      Logger.log(`⚠️ 通知送信失敗 (${userInfo.notificationMethod}): ${notificationResult.error}`);
    }
    
    return notificationResult;
    
  } catch (error) {
    Logger.log('❌ 通知送信エラー:', error);
    return {
      success: false,
      method: userInfo.notificationMethod,
      error: error.message
    };
  }
}

/**
 * 案件割当ログの記録
 * 
 * @param {Object} logData ログデータ
 * @returns {Object} ログ記録結果
 */
function logCaseAssignment(logData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const historySheet = ss.getSheetByName('案件振り分け履歴');
    
    if (!historySheet) {
      throw new Error('案件振り分け履歴シートが見つかりません');
    }
    
    const assignmentId = generateAssignmentId();
    
    const logRow = [
      assignmentId,                    // 割当ID
      logData.caseId,                  // 案件ID
      logData.assignerType,            // 割当元種別
      logData.assignerUserId,          // 割当元ユーザーID
      logData.targetUserId,            // 割当先ユーザーID
      logData.method,                  // 割当方法
      logData.area,                    // 対象エリア
      logData.reason,                  // 割当理由
      logData.notificationMethod,      // 通知方法
      logData.notificationResult,      // 通知結果
      new Date(),                      // 割当日時
      logData.notes || ''              // 備考
    ];
    
    historySheet.appendRow(logRow);
    
    Logger.log(`📝 割当ログ記録完了 (割当ID: ${assignmentId})`);
    
    return {
      success: true,
      assignmentId: assignmentId
    };
    
  } catch (error) {
    Logger.log('❌ 割当ログ記録エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 案件情報の取得（新列構成対応）
 */
function getCaseInfo(ss, caseId) {
  try {
    const caseSheet = ss.getSheetByName('ユーザー案件');
    if (!caseSheet) return null;
    
    const dataRange = caseSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const caseIdColIndex = headers.indexOf('案件ID');
    const areaColIndex = headers.indexOf('住所（市区町村）');
    const clientNameColIndex = headers.indexOf('ユーザー名');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][caseIdColIndex] === caseId) {
        return {
          caseId: caseId,
          area: data[i][areaColIndex],
          clientName: data[i][clientNameColIndex]
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('❌ 案件情報取得エラー:', error);
    return null;
  }
}

/**
 * 子ユーザー情報の取得
 */
function getChildUserInfo(ss, userId) {
  try {
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childSheet) return null;
    
    const dataRange = childSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const userIdColIndex = headers.indexOf('子ユーザーID');
    const notificationMethodColIndex = headers.indexOf('通知手段');
    const notificationTargetColIndex = headers.indexOf('通知先');
    const currentCaseCountColIndex = headers.indexOf('現在担当件数');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === userId) {
        return {
          userId: userId,
          notificationMethod: data[i][notificationMethodColIndex] || 'LINE',
          notificationTarget: data[i][notificationTargetColIndex],
          currentCaseCount: parseInt(data[i][currentCaseCountColIndex]) || 0
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('❌ 子ユーザー情報取得エラー:', error);
    return null;
  }
}

/**
 * エリア対応可能な子ユーザーの検索
 */
function getEligibleUsers(ss, targetArea) {
  try {
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childSheet) return [];
    
    const dataRange = childSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const userIdColIndex = headers.indexOf('子ユーザーID');
    const areaColIndex = headers.indexOf('対応エリア（市区町村）');
    const notificationMethodColIndex = headers.indexOf('通知手段');
    const notificationTargetColIndex = headers.indexOf('通知先');
    const currentCaseCountColIndex = headers.indexOf('現在担当件数');
    
    const eligibleUsers = [];
    
    for (let i = 1; i < data.length; i++) {
      const userArea = data[i][areaColIndex];
      if (userArea && userArea.includes(targetArea)) {
        eligibleUsers.push({
          userId: data[i][userIdColIndex],
          area: userArea,
          notificationMethod: data[i][notificationMethodColIndex] || 'LINE',
          notificationTarget: data[i][notificationTargetColIndex],
          currentCaseCount: parseInt(data[i][currentCaseCountColIndex]) || 0
        });
      }
    }
    
    return eligibleUsers;
  } catch (error) {
    Logger.log('❌ 適格ユーザー検索エラー:', error);
    return [];
  }
}

/**
 * 案件の割当状況更新（新列構成対応）
 */
function updateCaseAssignment(ss, caseId, userId) {
  try {
    const caseSheet = ss.getSheetByName('ユーザー案件');
    if (!caseSheet) return false;
    
    const dataRange = caseSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const caseIdColIndex = headers.indexOf('案件ID');
    const assignedUserColIndex = headers.indexOf('割当営業担当ID');
    const assignmentStatusColIndex = headers.indexOf('割当状況');
    const assignmentDateColIndex = headers.indexOf('割当日時');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][caseIdColIndex] === caseId) {
        if (assignedUserColIndex !== -1) {
          caseSheet.getRange(i + 1, assignedUserColIndex + 1).setValue(userId);
        }
        if (assignmentStatusColIndex !== -1) {
          caseSheet.getRange(i + 1, assignmentStatusColIndex + 1).setValue('割当済');
        }
        if (assignmentDateColIndex !== -1) {
          caseSheet.getRange(i + 1, assignmentDateColIndex + 1).setValue(new Date());
        }
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('❌ 案件割当状況更新エラー:', error);
    return false;
  }
}

/**
 * ユーザーの担当件数更新
 */
function updateUserCaseCount(ss, userId, increment) {
  try {
    const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (!childSheet) return false;
    
    const dataRange = childSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const userIdColIndex = headers.indexOf('子ユーザーID');
    const currentCaseCountColIndex = headers.indexOf('現在担当件数');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === userId) {
        if (currentCaseCountColIndex !== -1) {
          const currentCount = parseInt(data[i][currentCaseCountColIndex]) || 0;
          childSheet.getRange(i + 1, currentCaseCountColIndex + 1).setValue(currentCount + increment);
        }
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('❌ ユーザー担当件数更新エラー:', error);
    return false;
  }
}

/**
 * 割当IDの生成
 */
function generateAssignmentId() {
  return 'ASG_' + Utilities.getUuid().substring(0, 8).toUpperCase();
}

/**
 * 案件振り分けシステムのテスト関数
 */
function testCaseAssignmentSystem() {
  try {
    Logger.log('🧪 案件振り分けシステムテスト開始');
    
    // 1. 初期化テスト
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeCaseAssignmentSystem();
    Logger.log('初期化結果:', initResult);
    
    // 2. 手動割当テスト
    Logger.log('--- 手動割当テスト ---');
    const manualResult = assignCaseToUser(
      'CASE_002',             // 案件ID
      '親',                   // 割当元種別
      'PARENT_001',           // 割当元ユーザーID
      'CHILD_001',            // 割当先ユーザーID
      'テスト用手動割当'      // 割当理由
    );
    Logger.log('手動割当結果:', manualResult);
    
    // 3. 自動割当テスト
    Logger.log('--- 自動割当テスト ---');
    const autoResult = autoAssignCase(
      'CASE_003',             // 案件ID
      '子',                   // 割当元種別
      'CHILD_002'             // 割当元ユーザーID
    );
    Logger.log('自動割当結果:', autoResult);
    
    // 4. 異常系テスト
    Logger.log('--- 異常系テスト ---');
    const errorResult = assignCaseToUser(
      'INVALID_CASE',         // 存在しない案件ID
      '親',
      'PARENT_001',
      'INVALID_USER',         // 存在しないユーザーID
      'エラーテスト'
    );
    Logger.log('異常系テスト結果:', errorResult);
    
    // 5. テスト統計
    const stats = {
      initializationSuccess: initResult.success,
      manualAssignmentSuccess: manualResult.success,
      autoAssignmentSuccess: autoResult.success,
      errorHandlingSuccess: !errorResult.success,
      overallSuccessRate: [initResult, manualResult, autoResult].filter(r => r.success).length / 3 * 100
    };
    
    Logger.log('📊 テスト統計:', stats);
    Logger.log('✅ 案件振り分けシステムテスト完了');
    
    return {
      success: true,
      testResults: {
        initialization: initResult,
        manualAssignment: manualResult,
        autoAssignment: autoResult,
        errorHandling: errorResult,
        statistics: stats
      }
    };
    
  } catch (error) {
    Logger.log('❌ 案件振り分けシステムテストエラー:', error);
    
    return {
      success: false,
      error: {
        type: 'system_test_failed',
        message: error.message
      }
    };
  }
}