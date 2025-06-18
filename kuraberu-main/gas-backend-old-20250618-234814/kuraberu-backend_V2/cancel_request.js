/**
 * ファイル名: cancel_request.js
 * 外壁塗装くらべるAI - キャンセル申請処理システム
 * 案件キャンセル・理由分析・承認フロー管理
 * 
 * 🔧 GAS V8完全対応版 - async/await エラー完全除去済み
 */

/**
 * キャンセル申請システム初期化
 * @returns {Object} 初期化結果
 */
function initializeCancelRequestSystem() {
  try {
    Logger.log('🚫 キャンセル申請システム初期化開始');
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // キャンセル申請シート作成
    createCancelRequestSheet(ss);
    
    // キャンセル理由マスタシート作成
    createCancelReasonMasterSheet(ss);
    
    // キャンセル承認フローシート作成
    createCancelApprovalFlowSheet(ss);
    
    Logger.log('✅ キャンセル申請システム初期化完了');
    
    return {
      success: true,
      message: 'キャンセル申請システムの初期化が完了しました',
      sheetsCreated: ['キャンセル申請', 'キャンセル理由マスタ', 'キャンセル承認フロー'],
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請システム初期化エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * キャンセル申請シート作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createCancelRequestSheet(ss) {
  try {
    let sheet = ss.getSheetByName('キャンセル申請');
    
    if (!sheet) {
      sheet = ss.insertSheet('キャンセル申請');
      
      const headers = [
        'キャンセル申請ID', '案件ID', '申請者ID', '申請者名', 'キャンセル理由カテゴリ',
        'キャンセル理由詳細', '申請日時', 'ステータス', '承認者ID', '承認者名',
        '承認日時', '承認コメント', '緊急度', '影響度', '備考'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#F44336');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log('✅ キャンセル申請シート作成完了');
    }
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請シート作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * キャンセル理由マスタシート作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createCancelReasonMasterSheet(ss) {
  try {
    let sheet = ss.getSheetByName('キャンセル理由マスタ');
    
    if (!sheet) {
      sheet = ss.insertSheet('キャンセル理由マスタ');
      
      const headers = [
        '理由ID', 'カテゴリ', '理由名', '説明', '緊急度',
        '自動承認可否', '通知必要性', '有効フラグ', '作成日', '更新日'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // サンプルデータ追加
      const sampleData = [
        ['CR001', 'お客様都合', '予算変更', 'お客様の予算変更による', '低', 'true', 'false', 'true', new Date(), new Date()],
        ['CR002', 'お客様都合', '工期変更', 'お客様の工期変更要求', '中', 'false', 'true', 'true', new Date(), new Date()],
        ['CR003', '業者都合', '人員不足', '施工人員確保困難', '高', 'false', 'true', 'true', new Date(), new Date()],
        ['CR004', '業者都合', '材料調達困難', '必要材料の調達困難', '高', 'false', 'true', 'true', new Date(), new Date()],
        ['CR005', '技術的問題', '施工不可', '技術的に施工不可と判明', '最高', 'false', 'true', 'true', new Date(), new Date()],
        ['CR006', 'その他', '天候不良', '長期天候不良による', '中', 'true', 'false', 'true', new Date(), new Date()]
      ];
      
      sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#FF5722');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log('✅ キャンセル理由マスタシート作成完了');
    }
    
  } catch (error) {
    Logger.log(`❌ キャンセル理由マスタシート作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * キャンセル承認フローシート作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 */
function createCancelApprovalFlowSheet(ss) {
  try {
    let sheet = ss.getSheetByName('キャンセル承認フロー');
    
    if (!sheet) {
      sheet = ss.insertSheet('キャンセル承認フロー');
      
      const headers = [
        'フローID', 'キャンセル申請ID', '承認段階', '承認者ID', '承認者名',
        '承認ステータス', '承認日時', 'コメント', '次承認者ID', '完了フラグ'
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#E91E63');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
      
      Logger.log('✅ キャンセル承認フローシート作成完了');
    }
    
  } catch (error) {
    Logger.log(`❌ キャンセル承認フローシート作成エラー: ${error.message}`);
    throw error;
  }
}

/**
 * キャンセル申請処理
 * @param {Object} cancelData キャンセル申請データ
 * @returns {Object} 処理結果
 */
function processCancelRequest(cancelData) {
  try {
    Logger.log('🚫 キャンセル申請処理開始');
    
    // 1. 申請データ検証
    const validationResult = validateCancelRequest(cancelData);
    if (!validationResult.valid) {
      throw new Error(`申請データ検証エラー: ${validationResult.errors.join(', ')}`);
    }
    
    // 2. キャンセル申請ID生成
    const cancelRequestId = generateCancelRequestId();
    
    // 3. 理由カテゴリ判定
    const reasonCategory = determineCancelReasonCategory(cancelData.reason);
    
    // 4. 緊急度・影響度評価
    const assessment = assessCancelRequest(cancelData, reasonCategory);
    
    // 5. 申請データ作成
    const requestData = {
      cancelRequestId: cancelRequestId,
      caseId: cancelData.caseId,
      applicantId: cancelData.applicantId,
      applicantName: cancelData.applicantName || 'Unknown',
      reasonCategory: reasonCategory.category,
      reasonDetail: cancelData.reason,
      requestDate: new Date(),
      status: '申請中',
      urgency: assessment.urgency,
      impact: assessment.impact,
      notes: cancelData.notes || ''
    };
    
    // 6. スプレッドシートに保存
    const saveResult = saveCancelRequest(requestData);
    
    if (saveResult.success) {
      // 7. 承認フロー開始
      const flowResult = startApprovalFlow(cancelRequestId, assessment);
      
      // 8. 通知送信
      notifyCancel(requestData);
      
      Logger.log('✅ キャンセル申請処理完了');
      
      return {
        success: true,
        cancelRequestId: cancelRequestId,
        status: requestData.status,
        urgency: assessment.urgency,
        requiresApproval: !assessment.autoApproval,
        message: 'キャンセル申請を受け付けました',
        timestamp: new Date()
      };
    } else {
      throw new Error(saveResult.error);
    }
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請処理エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * キャンセル申請データ検証
 * @param {Object} cancelData キャンセル申請データ
 * @returns {Object} 検証結果
 */
function validateCancelRequest(cancelData) {
  try {
    const errors = [];
    
    if (!cancelData.caseId) {
      errors.push('案件IDが必要です');
    }
    
    if (!cancelData.applicantId) {
      errors.push('申請者IDが必要です');
    }
    
    if (!cancelData.reason || cancelData.reason.trim().length < 10) {
      errors.push('キャンセル理由は10文字以上で入力してください');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請データ検証エラー: ${error.message}`);
    return {
      valid: false,
      errors: [`検証処理エラー: ${error.message}`]
    };
  }
}

/**
 * キャンセル理由カテゴリ判定
 * @param {string} reason キャンセル理由
 * @returns {Object} カテゴリ情報
 */
function determineCancelReasonCategory(reason) {
  try {
    const reasonLower = reason.toLowerCase();
    
    // キーワードベースの簡易判定
    if (reasonLower.includes('予算') || reasonLower.includes('費用') || reasonLower.includes('金額')) {
      return { category: 'お客様都合', reasonId: 'CR001' };
    }
    
    if (reasonLower.includes('工期') || reasonLower.includes('日程') || reasonLower.includes('スケジュール')) {
      return { category: 'お客様都合', reasonId: 'CR002' };
    }
    
    if (reasonLower.includes('人員') || reasonLower.includes('職人') || reasonLower.includes('スタッフ')) {
      return { category: '業者都合', reasonId: 'CR003' };
    }
    
    if (reasonLower.includes('材料') || reasonLower.includes('資材') || reasonLower.includes('調達')) {
      return { category: '業者都合', reasonId: 'CR004' };
    }
    
    if (reasonLower.includes('技術') || reasonLower.includes('施工不可') || reasonLower.includes('困難')) {
      return { category: '技術的問題', reasonId: 'CR005' };
    }
    
    if (reasonLower.includes('天候') || reasonLower.includes('雨') || reasonLower.includes('気象')) {
      return { category: 'その他', reasonId: 'CR006' };
    }
    
    // デフォルト
    return { category: 'その他', reasonId: 'CR999' };
    
  } catch (error) {
    Logger.log(`❌ キャンセル理由カテゴリ判定エラー: ${error.message}`);
    return { category: 'その他', reasonId: 'CR999' };
  }
}

/**
 * キャンセル申請評価
 * @param {Object} cancelData キャンセル申請データ
 * @param {Object} reasonCategory 理由カテゴリ
 * @returns {Object} 評価結果
 */
function assessCancelRequest(cancelData, reasonCategory) {
  try {
    let urgency = '中';
    let impact = '中';
    let autoApproval = false;
    
    // カテゴリ別評価
    switch (reasonCategory.category) {
      case 'お客様都合':
        urgency = '低';
        impact = '低';
        autoApproval = true;
        break;
        
      case '業者都合':
        urgency = '高';
        impact = '高';
        autoApproval = false;
        break;
        
      case '技術的問題':
        urgency = '最高';
        impact = '最高';
        autoApproval = false;
        break;
        
      case 'その他':
        urgency = '中';
        impact = '中';
        autoApproval = reasonCategory.reasonId === 'CR006'; // 天候のみ自動承認
        break;
        
      default:
        urgency = '中';
        impact = '中';
        autoApproval = false;
    }
    
    // 緊急キーワードチェック
    const reasonLower = cancelData.reason.toLowerCase();
    if (reasonLower.includes('緊急') || reasonLower.includes('至急') || reasonLower.includes('事故')) {
      urgency = '最高';
      impact = '最高';
      autoApproval = false;
    }
    
    Logger.log(`キャンセル申請評価完了: 緊急度=${urgency}, 影響度=${impact}, 自動承認=${autoApproval}`);
    
    return {
      urgency: urgency,
      impact: impact,
      autoApproval: autoApproval,
      requiresManagerApproval: urgency === '最高' || impact === '最高',
      estimatedApprovalTime: autoApproval ? '即時' : urgency === '最高' ? '2時間以内' : '24時間以内'
    };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請評価エラー: ${error.message}`);
    return {
      urgency: '中',
      impact: '中',
      autoApproval: false,
      requiresManagerApproval: true,
      estimatedApprovalTime: '24時間以内'
    };
  }
}

/**
 * キャンセル申請ID生成
 * @returns {string} キャンセル申請ID
 */
function generateCancelRequestId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `CANCEL-${year}${month}${day}-${timestamp}`;
}

/**
 * キャンセル申請保存
 * @param {Object} requestData 申請データ
 * @returns {Object} 保存結果
 */
function saveCancelRequest(requestData) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('キャンセル申請');
    
    if (!sheet) {
      createCancelRequestSheet(ss);
      sheet = ss.getSheetByName('キャンセル申請');
    }
    
    const newRow = [
      requestData.cancelRequestId,
      requestData.caseId,
      requestData.applicantId,
      requestData.applicantName,
      requestData.reasonCategory,
      requestData.reasonDetail,
      requestData.requestDate,
      requestData.status,
      '', // 承認者ID
      '', // 承認者名
      '', // 承認日時
      '', // 承認コメント
      requestData.urgency,
      requestData.impact,
      requestData.notes
    ];
    
    sheet.appendRow(newRow);
    Logger.log(`✅ キャンセル申請保存完了: ${requestData.cancelRequestId}`);
    
    return { success: true, cancelRequestId: requestData.cancelRequestId };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請保存エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 承認フロー開始
 * @param {string} cancelRequestId キャンセル申請ID
 * @param {Object} assessment 評価結果
 * @returns {Object} フロー開始結果
 */
function startApprovalFlow(cancelRequestId, assessment) {
  try {
    Logger.log(`承認フロー開始: ${cancelRequestId}`);
    
    if (assessment.autoApproval) {
      // 自動承認
      const approvalResult = autoApproveCancelRequest(cancelRequestId);
      Logger.log('✅ 自動承認完了');
      return approvalResult;
    } else {
      // 手動承認フロー作成
      const flowResult = createApprovalFlow(cancelRequestId, assessment);
      Logger.log('✅ 承認フロー作成完了');
      return flowResult;
    }
    
  } catch (error) {
    Logger.log(`❌ 承認フロー開始エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 自動承認処理
 * @param {string} cancelRequestId キャンセル申請ID
 * @returns {Object} 承認結果
 */
function autoApproveCancelRequest(cancelRequestId) {
  try {
    // ステータス更新
    updateCancelRequestStatus(cancelRequestId, '自動承認', 'システム', '自動承認条件を満たしています');
    
    // 承認完了通知
    notifyCancelApprovalCompleted(cancelRequestId, '自動承認');
    
    return {
      success: true,
      approvalType: 'auto',
      message: '自動承認が完了しました',
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ 自動承認処理エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 承認フロー作成
 * @param {string} cancelRequestId キャンセル申請ID
 * @param {Object} assessment 評価結果
 * @returns {Object} フロー作成結果
 */
function createApprovalFlow(cancelRequestId, assessment) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('キャンセル承認フロー');
    
    if (!sheet) {
      createCancelApprovalFlowSheet(ss);
      sheet = ss.getSheetByName('キャンセル承認フロー');
    }
    
    // 承認者決定
    const approvers = determineApprovers(assessment);
    
    // フローレコード作成
    approvers.forEach((approverId, index) => {
      const flowId = `FLOW-${cancelRequestId}-${index + 1}`;
      const flowRow = [
        flowId,
        cancelRequestId,
        index + 1, // 承認段階
        approverId,
        getApproverName(approverId),
        '待機中',
        '', // 承認日時
        '', // コメント
        index < approvers.length - 1 ? approvers[index + 1] : '', // 次承認者
        index === approvers.length - 1 // 完了フラグ
      ];
      
      sheet.appendRow(flowRow);
    });
    
    // 初回承認者に通知
    notifyApprovalRequest(cancelRequestId, approvers[0]);
    
    Logger.log(`✅ 承認フロー作成完了: ${approvers.length}段階`);
    
    return {
      success: true,
      approvalType: 'manual',
      approvers: approvers,
      message: '承認フローを開始しました',
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ 承認フロー作成エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 承認者決定
 * @param {Object} assessment 評価結果
 * @returns {Array} 承認者IDリスト
 */
function determineApprovers(assessment) {
  try {
    const approvers = [];
    
    // 一次承認者（営業マネージャー）
    approvers.push('MANAGER_001');
    
    // 高緊急度・高影響度の場合は上位承認者追加
    if (assessment.requiresManagerApproval) {
      approvers.push('DIRECTOR_001');
    }
    
    // 最高緊急度の場合は役員承認追加
    if (assessment.urgency === '最高') {
      approvers.push('EXECUTIVE_001');
    }
    
    return approvers;
    
  } catch (error) {
    Logger.log(`❌ 承認者決定エラー: ${error.message}`);
    return ['MANAGER_001']; // デフォルト
  }
}

/**
 * 承認者名取得
 * @param {string} approverId 承認者ID
 * @returns {string} 承認者名
 */
function getApproverName(approverId) {
  const approverNames = {
    'MANAGER_001': '営業マネージャー',
    'DIRECTOR_001': '営業部長',
    'EXECUTIVE_001': '取締役'
  };
  
  return approverNames[approverId] || '不明';
}

/**
 * キャンセル申請ステータス更新
 * @param {string} cancelRequestId キャンセル申請ID
 * @param {string} status ステータス
 * @param {string} approverId 承認者ID
 * @param {string} comment コメント
 */
function updateCancelRequestStatus(cancelRequestId, status, approverId, comment) {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('キャンセル申請');
    
    if (!sheet) {
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === cancelRequestId) {
        sheet.getRange(i + 1, 8).setValue(status); // ステータス
        sheet.getRange(i + 1, 9).setValue(approverId); // 承認者ID
        sheet.getRange(i + 1, 10).setValue(getApproverName(approverId)); // 承認者名
        sheet.getRange(i + 1, 11).setValue(new Date()); // 承認日時
        sheet.getRange(i + 1, 12).setValue(comment); // 承認コメント
        
        Logger.log(`✅ キャンセル申請ステータス更新完了: ${cancelRequestId} → ${status}`);
        break;
      }
    }
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請ステータス更新エラー: ${error.message}`);
  }
}

/**
 * 承認依頼通知
 * @param {string} cancelRequestId キャンセル申請ID
 * @param {string} approverId 承認者ID
 */
function notifyApprovalRequest(cancelRequestId, approverId) {
  try {
    const message = `📋 **キャンセル承認依頼**

🆔 **申請ID**: ${cancelRequestId}
👤 **承認者**: ${getApproverName(approverId)}
📅 **依頼日時**: ${new Date().toLocaleString()}

キャンセル申請の承認をお願いします。
管理画面から詳細を確認し、承認・否認の判断をお願いします。`;

    // 統合通知システムを使用
    sendIntegratedNotification('approval_request', message, {
      username: 'キャンセル承認システム',
      icon: ':clipboard:',
      channel: '#承認依頼'
    });
    
    Logger.log('✅ 承認依頼通知送信完了');
    
  } catch (error) {
    Logger.log(`❌ 承認依頼通知エラー: ${error.message}`);
  }
}

/**
 * 承認完了通知
 * @param {string} cancelRequestId キャンセル申請ID
 * @param {string} approvalType 承認タイプ
 */
function notifyCancelApprovalCompleted(cancelRequestId, approvalType) {
  try {
    const message = `✅ **キャンセル承認完了**

🆔 **申請ID**: ${cancelRequestId}
✅ **承認タイプ**: ${approvalType}
📅 **完了日時**: ${new Date().toLocaleString()}

キャンセル申請の承認が完了しました。
後続処理を開始してください。`;

    // 統合通知システムを使用
    sendIntegratedNotification('approval_completed', message, {
      username: 'キャンセル承認システム',
      icon: ':white_check_mark:',
      channel: '#承認完了'
    });
    
    Logger.log('✅ 承認完了通知送信完了');
    
  } catch (error) {
    Logger.log(`❌ 承認完了通知エラー: ${error.message}`);
  }
}

/**
 * キャンセル申請システムテスト
 * @returns {Object} テスト結果
 */
function testCancelRequestSystem() {
  try {
    Logger.log('🧪 キャンセル申請システムテスト開始');
    
    const testResults = {
      initialization: false,
      requestProcessing: false,
      reasonCategorization: false,
      approvalFlow: false
    };
    
    // 1. 初期化テスト
    try {
      const initResult = initializeCancelRequestSystem();
      testResults.initialization = initResult.success;
      Logger.log(`初期化テスト: ${initResult.success ? '✅' : '❌'}`);
    } catch (error) {
      Logger.log(`初期化テストエラー: ${error.message}`);
    }
    
    // 2. 申請処理テスト
    try {
      const testRequest = {
        caseId: 'TEST_CASE_001',
        applicantId: 'TEST_USER_001',
        applicantName: 'テスト申請者',
        reason: 'お客様の予算変更により、工事を中止することになりました',
        notes: 'テスト用申請'
      };
      
      const processResult = processCancelRequest(testRequest);
      testResults.requestProcessing = processResult.success;
      Logger.log(`申請処理テスト: ${processResult.success ? '✅' : '❌'}`);
    } catch (error) {
      Logger.log(`申請処理テストエラー: ${error.message}`);
    }
    
    // 3. 理由分類テスト
    try {
      const reasonResult = determineCancelReasonCategory('予算の変更により');
      testResults.reasonCategorization = reasonResult.category === 'お客様都合';
      Logger.log(`理由分類テスト: ${testResults.reasonCategorization ? '✅' : '❌'}`);
    } catch (error) {
      Logger.log(`理由分類テストエラー: ${error.message}`);
    }
    
    const overallSuccess = Object.values(testResults).filter(Boolean).length >= 3;
    
    Logger.log(`✅ キャンセル申請システムテスト完了: ${overallSuccess ? '成功' : '一部失敗'}`);
    
    return {
      success: overallSuccess,
      results: testResults,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請システムテストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}