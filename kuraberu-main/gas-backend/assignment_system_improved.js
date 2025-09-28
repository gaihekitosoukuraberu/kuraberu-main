/**
 * ファイル名: assignment_system.gs
 * 外壁塗装くらべるAI - 営業担当自動振り分けシステム（改良版）
 * 加盟店子ユーザーへの案件自動割り当て・通知機能
 * 
 * @version 2.0
 * @author Claude Code
 * @description エリア対応・自動割り当て・多様な通知手段対応
 */

// ==================== 初期化関数 ====================

/**
 * 営業担当振り分けシステムの初期化
 * 
 * @returns {Object} 初期化結果
 * @throws {Error} 初期化失敗時
 */
function initializeAssignmentSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log('🏗️ 営業担当振り分けシステム初期化開始');

    // 既存シートの列追加・更新
    ensureAssignmentColumns(ss);
    
    // 加盟店子ユーザー一覧シートの作成・更新
    createFranchiseAgentsSheet(ss);
    
    Logger.log('✅ 営業担当振り分けシステム初期化完了');
    
    // Slack通知
    const notificationResult = sendSystemNotification(
      '🏗️ 営業担当振り分けシステムが初期化されました\n✅ エリア対応・自動割り当て機能が利用可能です'
    );
    
    return {
      success: true,
      message: '営業担当振り分けシステムの初期化が完了しました',
      sheetsUpdated: ['加盟店子ユーザー一覧', 'ユーザー案件'],
      notificationSent: notificationResult.success
    };
    
  } catch (error) {
    Logger.log('❌ 営業担当振り分けシステム初期化エラー:', error);
    logFallbackError('システム初期化', error.message);
    throw new Error(`営業担当振り分けシステム初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 振り分け関連列を既存シートに追加
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - スプレッドシートオブジェクト
 */
function ensureAssignmentColumns(ss) {
  try {
    Logger.log('🔧 振り分け関連列の確認・追加開始');
    
    // ユーザー案件シートに振り分け関連列を追加
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    if (userCasesSheet) {
      const headers = userCasesSheet.getRange(1, 1, 1, userCasesSheet.getLastColumn()).getValues()[0];
      const newColumns = ['住所（市区町村）', '割当営業担当ID', '割当状況', '割当日時', '通知結果ログ'];
      
      let lastCol = userCasesSheet.getLastColumn();
      
      newColumns.forEach(columnName => {
        if (!headers.includes(columnName)) {
          lastCol++;
          userCasesSheet.getRange(1, lastCol).setValue(columnName);
          Logger.log(`✅ ユーザー案件シートに「${columnName}」列を追加`);
        }
      });
    }
    
    // 加盟店子ユーザー一覧シートに対応エリア関連列を追加
    const agentsSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    if (agentsSheet) {
      const headers = agentsSheet.getRange(1, 1, 1, agentsSheet.getLastColumn()).getValues()[0];
      const newColumns = ['対応エリア（市区町村）', '通知手段', '通知先', '現在担当件数', '最終割当日時', '通知成功回数', '通知失敗回数'];
      
      let lastCol = agentsSheet.getLastColumn();
      
      newColumns.forEach(columnName => {
        if (!headers.includes(columnName)) {
          lastCol++;
          agentsSheet.getRange(1, lastCol).setValue(columnName);
          Logger.log(`✅ 加盟店子ユーザー一覧シートに「${columnName}」列を追加`);
        }
      });
    }
    
    Logger.log('✅ 振り分け関連列の確認・追加完了');
    
  } catch (error) {
    Logger.log('❌ 振り分け関連列追加エラー:', error);
    logFallbackError('列追加処理', error.message);
  }
}

/**
 * 加盟店子ユーザー一覧シート作成・更新
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss - スプレッドシートオブジェクト
 */
function createFranchiseAgentsSheet(ss) {
  const sheetName = '加盟店子ユーザー一覧';
  
  let sheet = ss.getSheetByName(sheetName);
  
  // シートが存在しない場合は新規作成
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    
    const headers = [
      '子ユーザーID', '加盟店ID', '名前', 'メールアドレス', '電話番号',
      '権限', 'ステータス', '対応エリア（市区町村）', '通知手段', '通知先',
      '現在担当件数', '最終割当日時', '通知成功回数', '通知失敗回数',
      '作成日', '更新日', '備考'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#9C27B0');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    
    // サンプルデータ
    const sampleData = [
      ['AGENT_001', 'FRANCHISE_001', '田中営業部長', 'tanaka.sales@tokyo-tosou.com', 
        '090-1234-5678', '営業管理者', 'アクティブ', '渋谷区,新宿区,港区', 'LINE', 
        'U_tanaka_line_id_001', 0, '', 0, 0, new Date(), new Date(), 'エリア責任者'],
      ['AGENT_002', 'FRANCHISE_001', '佐藤営業', 'sato.sales@tokyo-tosou.com', 
        '090-2345-6789', '営業担当', 'アクティブ', '世田谷区,目黒区', 'SMS', 
        '090-2345-6789', 0, '', 0, 0, new Date(), new Date(), '新人営業'],
      ['AGENT_003', 'FRANCHISE_002', '山田営業', 'yamada@kanagawa-paint.com', 
        '045-345-6789', '営業担当', 'アクティブ', '横浜市中区,横浜市西区', 'メール', 
        'yamada@kanagawa-paint.com', 0, '', 0, 0, new Date(), new Date(), '神奈川エリア担当']
    ];
    
    sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
    
    Logger.log('✅ 加盟店子ユーザー一覧シート作成完了（サンプルデータ付き）');
  } else {
    Logger.log('✅ 加盟店子ユーザー一覧シート更新完了');
  }
}

// ==================== ユーティリティ関数 ====================

/**
 * 住所から市区町村を抽出
 * 
 * @param {string} address - 住所
 * @returns {string|null} 市区町村名
 */
function extractCityDistrict(address) {
  if (!address || typeof address !== 'string') return null;
  
  // 市区町村パターンのマッチング
  const patterns = [
    /([^都道府県]+?[市区町村])/,  // 基本パターン
    /([^都道府県]+?郡[^町村]+?[町村])/,  // 郡部パターン
    /(横浜市[^区]+区|川崎市[^区]+区|相模原市[^区]+区)/,  // 政令指定都市区
    /(札幌市[^区]+区|仙台市[^区]+区|さいたま市[^区]+区)/,
    /(千葉市[^区]+区|新潟市[^区]+区|静岡市[^区]+区)/,
    /(浜松市[^区]+区|名古屋市[^区]+区|京都市[^区]+区)/,
    /(大阪市[^区]+区|堺市[^区]+区|神戸市[^区]+区)/,
    /(岡山市[^区]+区|広島市[^区]+区|北九州市[^区]+区)/,
    /(福岡市[^区]+区|熊本市[^区]+区)/
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // 東京23区の特別処理
  const tokyoMatch = address.match(/([^都道府県]+?区)/);
  if (tokyoMatch && address.includes('東京')) {
    return tokyoMatch[1];
  }
  
  return null;
}

/**
 * 最適な担当者を選択（件数少ない→最終割当古い順）
 * 
 * @param {Array} agents - 対象営業担当者リスト
 * @returns {Object} 選択された営業担当者
 */
function selectOptimalAgent(agents) {
  if (agents.length === 1) return agents[0];
  
  // ソート: 1) 現在担当件数が少ない順, 2) 最終割当日時が古い順
  agents.sort((a, b) => {
    if (a.currentCases !== b.currentCases) {
      return a.currentCases - b.currentCases;
    }
    return a.lastAssigned.getTime() - b.lastAssigned.getTime();
  });
  
  const selected = agents[0];
  Logger.log(`🎯 最適担当者選択: ${selected.name} (件数: ${selected.currentCases}, 最終割当: ${selected.lastAssigned})`);
  
  return selected;
}

/**
 * フォールバックエラーログ記録
 * 
 * @param {string} operation - 操作名
 * @param {string} errorMessage - エラーメッセージ
 */
function logFallbackError(operation, errorMessage) {
  try {
    Logger.log(`📝 フォールバックログ: [${operation}] ${errorMessage}`);
    // 将来的にはエラーログシートに記録可能
  } catch (e) {
    console.error('フォールバックログ記録失敗:', e);
  }
}

/**
 * 営業日計算（土日を除く）
 * 
 * @param {Date} startDate - 開始日
 * @param {number} businessDays - 営業日数
 * @returns {Date} 計算結果日付
 */
function calculateBusinessDays(startDate, businessDays) {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    
    // 土日をスキップ
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}

// ==================== メインロジック ====================

/**
 * 案件を最適な営業担当に自動割り当て
 * 
 * @param {string} caseId - 案件ID（ユーザーID）
 * @param {string} franchiseId - 加盟店ID
 * @param {string} address - 住所（市区町村抽出用）
 * @returns {Object} 割り当て結果
 */
function autoAssignAgentToCase(caseId, franchiseId, address) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`🎯 案件自動割り当て開始 (案件ID: ${caseId}, 加盟店: ${franchiseId})`);
    
    // 住所から市区町村を抽出
    const cityDistrict = extractCityDistrict(address);
    if (!cityDistrict) {
      const errorDetail = {
        type: 'address_extraction_failed',
        caseId: caseId,
        franchiseId: franchiseId,
        address: address,
        message: '住所から市区町村を抽出できませんでした'
      };
      
      Logger.log(`⚠️ 住所抽出失敗: ${address}`);
      logFallbackError('住所抽出', `案件ID: ${caseId}, 住所: ${address}`);
      
      return {
        success: false,
        error: errorDetail,
        address: address
      };
    }
    
    Logger.log(`📍 抽出された市区町村: ${cityDistrict}`);
    
    // 該当エリアの営業担当者を検索
    const eligibleAgents = findEligibleAgents(franchiseId, cityDistrict);
    
    if (eligibleAgents.length === 0) {
      // 担当者が見つからない場合の詳細エラー
      const errorDetail = {
        type: 'no_eligible_agents',
        caseId: caseId,
        franchiseId: franchiseId,
        cityDistrict: cityDistrict,
        availableAgents: 0,
        message: '該当エリアの営業担当者が見つかりませんでした'
      };
      
      // 詳細警告通知
      const warningMessage = createNoAgentWarningMessage(errorDetail);
      const notificationResult = sendSystemNotification(warningMessage);
      
      logFallbackError('担当者検索', JSON.stringify(errorDetail));
      
      return {
        success: false,
        error: errorDetail,
        notificationSent: notificationResult.success
      };
    }
    
    // 最適な担当者を選択
    const selectedAgent = selectOptimalAgent(eligibleAgents);
    
    // 案件に担当者を割り当て
    const assignResult = assignCaseToAgent(caseId, selectedAgent.agentId, cityDistrict);
    
    if (assignResult.success) {
      // 担当者の件数を更新
      updateAgentAssignmentCount(selectedAgent.agentId, 1);
      
      // 通知送信
      const notificationResult = notifyAssignedAgent(selectedAgent.agentId, caseId);
      
      // 通知結果をユーザー案件シートに記録
      updateNotificationLog(caseId, notificationResult);
      
      Logger.log(`✅ 案件割り当て完了: ${caseId} → ${selectedAgent.name} (${selectedAgent.agentId})`);
      
      return {
        success: true,
        assignedAgent: selectedAgent,
        cityDistrict: cityDistrict,
        notificationSent: notificationResult.success,
        notificationDetails: notificationResult
      };
    } else {
      logFallbackError('案件割り当て', assignResult.error);
      return assignResult;
    }
    
  } catch (error) {
    Logger.log('❌ 案件自動割り当てエラー:', error);
    logFallbackError('案件自動割り当て', error.message);
    return {
      success: false,
      error: {
        type: 'system_error',
        message: error.message
      }
    };
  }
}

/**
 * 該当エリアの営業担当者を検索
 * 
 * @param {string} franchiseId - 加盟店ID
 * @param {string} cityDistrict - 市区町村
 * @returns {Array} 対象営業担当者リスト
 */
function findEligibleAgents(franchiseId, cityDistrict) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const agentsSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!agentsSheet) {
      Logger.log('⚠️ 加盟店子ユーザー一覧シートが見つかりません');
      return [];
    }
    
    const agentsData = agentsSheet.getDataRange().getValues();
    const agentsHeaders = agentsData[0];
    
    const eligibleAgents = [];
    
    for (let i = 1; i < agentsData.length; i++) {
      const row = agentsData[i];
      const agentId = row[agentsHeaders.indexOf('子ユーザーID')];
      const agentFranchiseId = row[agentsHeaders.indexOf('加盟店ID')];
      const agentName = row[agentsHeaders.indexOf('名前')];
      const status = row[agentsHeaders.indexOf('ステータス')];
      const coverageAreas = row[agentsHeaders.indexOf('対応エリア（市区町村）')];
      const currentCases = row[agentsHeaders.indexOf('現在担当件数')] || 0;
      const lastAssigned = row[agentsHeaders.indexOf('最終割当日時')];
      const notificationMethod = row[agentsHeaders.indexOf('通知手段')];
      const notificationTarget = row[agentsHeaders.indexOf('通知先')];
      
      // 条件チェック
      if (agentFranchiseId === franchiseId && 
          status === 'アクティブ' && 
          coverageAreas && 
          coverageAreas.toString().includes(cityDistrict)) {
        
        eligibleAgents.push({
          agentId: agentId,
          name: agentName,
          currentCases: parseInt(currentCases) || 0,
          lastAssigned: lastAssigned ? new Date(lastAssigned) : new Date(0),
          notificationMethod: notificationMethod,
          notificationTarget: notificationTarget
        });
      }
    }
    
    Logger.log(`✅ 該当エリア担当者検索完了: ${eligibleAgents.length}名見つかりました`);
    return eligibleAgents;
    
  } catch (error) {
    Logger.log('❌ 該当エリア担当者検索エラー:', error);
    logFallbackError('担当者検索', error.message);
    return [];
  }
}

/**
 * 案件に担当者を割り当て（ユーザー案件シート更新）
 * 
 * @param {string} caseId - 案件ID
 * @param {string} agentId - 営業担当者ID
 * @param {string} cityDistrict - 市区町村
 * @returns {Object} 割り当て結果
 */
function assignCaseToAgent(caseId, agentId, cityDistrict) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    
    if (!userCasesSheet) {
      throw new Error('ユーザー案件シートが見つかりません');
    }
    
    const userCasesData = userCasesSheet.getDataRange().getValues();
    const userCasesHeaders = userCasesData[0];
    
    // 案件を検索して更新
    for (let i = 1; i < userCasesData.length; i++) {
      const row = userCasesData[i];
      const userId = row[userCasesHeaders.indexOf('ユーザーID')];
      
      if (userId === caseId) {
        const cityIndex = userCasesHeaders.indexOf('住所（市区町村）');
        const agentIndex = userCasesHeaders.indexOf('割当営業担当ID');
        const statusIndex = userCasesHeaders.indexOf('割当状況');
        const dateIndex = userCasesHeaders.indexOf('割当日時');
        
        // データ更新
        if (cityIndex >= 0) userCasesSheet.getRange(i + 1, cityIndex + 1).setValue(cityDistrict);
        if (agentIndex >= 0) userCasesSheet.getRange(i + 1, agentIndex + 1).setValue(agentId);
        if (statusIndex >= 0) userCasesSheet.getRange(i + 1, statusIndex + 1).setValue('割当済み');
        if (dateIndex >= 0) userCasesSheet.getRange(i + 1, dateIndex + 1).setValue(new Date());
        
        Logger.log(`✅ 案件割り当て更新完了: ${caseId} → ${agentId}`);
        return { success: true };
      }
    }
    
    throw new Error(`案件が見つかりませんでした: ${caseId}`);
    
  } catch (error) {
    Logger.log('❌ 案件割り当て更新エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 営業担当者の件数と最終割当日時を更新
 * 
 * @param {string} agentId - 営業担当者ID
 * @param {number} increment - 件数増減（通常は1）
 */
function updateAgentAssignmentCount(agentId, increment) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const agentsSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!agentsSheet) return;
    
    const agentsData = agentsSheet.getDataRange().getValues();
    const agentsHeaders = agentsData[0];
    
    for (let i = 1; i < agentsData.length; i++) {
      const row = agentsData[i];
      const currentAgentId = row[agentsHeaders.indexOf('子ユーザーID')];
      
      if (currentAgentId === agentId) {
        const countIndex = agentsHeaders.indexOf('現在担当件数');
        const dateIndex = agentsHeaders.indexOf('最終割当日時');
        
        if (countIndex >= 0) {
          const currentCount = parseInt(row[countIndex]) || 0;
          agentsSheet.getRange(i + 1, countIndex + 1).setValue(currentCount + increment);
        }
        
        if (dateIndex >= 0) {
          agentsSheet.getRange(i + 1, dateIndex + 1).setValue(new Date());
        }
        
        break;
      }
    }
    
    Logger.log(`✅ 営業担当者件数更新: ${agentId} (+${increment})`);
    
  } catch (error) {
    Logger.log('❌ 営業担当者件数更新エラー:', error);
    logFallbackError('担当者件数更新', error.message);
  }
}

// ==================== 通知関数 ====================

/**
 * 割り当てられた営業担当者に通知送信
 * 
 * @param {string} agentId - 営業担当者ID
 * @param {string} caseId - 案件ID
 * @returns {Object} 通知送信結果
 */
function notifyAssignedAgent(agentId, caseId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const agentsSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!agentsSheet) {
      throw new Error('加盟店子ユーザー一覧シートが見つかりません');
    }
    
    const agentsData = agentsSheet.getDataRange().getValues();
    const agentsHeaders = agentsData[0];
    
    // 営業担当者の通知設定を取得
    let agentInfo = null;
    let agentRowIndex = -1;
    
    for (let i = 1; i < agentsData.length; i++) {
      const row = agentsData[i];
      if (row[agentsHeaders.indexOf('子ユーザーID')] === agentId) {
        agentInfo = {
          name: row[agentsHeaders.indexOf('名前')],
          notificationMethod: row[agentsHeaders.indexOf('通知手段')],
          notificationTarget: row[agentsHeaders.indexOf('通知先')]
        };
        agentRowIndex = i;
        break;
      }
    }
    
    if (!agentInfo) {
      throw new Error(`営業担当者が見つかりません: ${agentId}`);
    }
    
    // 通知手段が未設定の場合は警告ログのみ
    if (!agentInfo.notificationMethod || !agentInfo.notificationTarget) {
      Logger.log(`⚠️ 通知設定未完了のため通知をスキップしました: ${agentInfo.name} (${agentId})`);
      logFallbackError('通知設定未完了', `${agentInfo.name} (${agentId})`);
      
      return {
        success: false,
        skipped: true,
        reason: '通知設定未完了',
        agentName: agentInfo.name
      };
    }
    
    // 通知メッセージ作成（方式別に最適化）
    const message = createNotificationMessage(agentInfo, caseId);
    
    // 通知方式に応じて送信
    let notificationResult = { success: false };
    
    switch (agentInfo.notificationMethod) {
      case 'LINE':
        if (typeof sendLinePushMessage === 'function') {
          notificationResult = sendLinePushMessage(agentInfo.notificationTarget, message.line);
        }
        break;
        
      case 'SMS':
        if (typeof sendSMS === 'function') {
          notificationResult = sendSMS(agentInfo.notificationTarget, message.sms);
        }
        break;
        
      case 'メール':
        if (typeof sendEmail === 'function') {
          notificationResult = sendEmail(
            agentInfo.notificationTarget,
            '【外壁塗装くらべるAI】新規案件割り当てのお知らせ',
            message.email
          );
        }
        break;
        
      default:
        Logger.log(`⚠️ 不明な通知手段: ${agentInfo.notificationMethod}`);
        logFallbackError('不明な通知手段', agentInfo.notificationMethod);
        return {
          success: false,
          error: '不明な通知手段',
          method: agentInfo.notificationMethod
        };
    }
    
    // 通知統計を更新
    updateNotificationStats(agentsSheet, agentRowIndex, agentsHeaders, notificationResult.success);
    
    if (notificationResult.success) {
      Logger.log(`✅ 通知送信完了: ${agentInfo.name} (${agentInfo.notificationMethod})`);
    } else {
      Logger.log(`❌ 通知送信失敗: ${agentInfo.name} (${agentInfo.notificationMethod})`, notificationResult);
      logFallbackError('通知送信失敗', `${agentInfo.name} - ${agentInfo.notificationMethod}`);
    }
    
    return {
      success: notificationResult.success,
      method: agentInfo.notificationMethod,
      target: agentInfo.notificationTarget,
      agentName: agentInfo.name,
      details: notificationResult
    };
    
  } catch (error) {
    Logger.log('❌ 営業担当者通知エラー:', error);
    logFallbackError('営業担当者通知', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 通知メッセージ作成（方式別最適化）
 * 
 * @param {Object} agentInfo - 営業担当者情報
 * @param {string} caseId - 案件ID
 * @returns {Object} 方式別メッセージ
 */
function createNotificationMessage(agentInfo, caseId) {
  const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm');
  
  return {
    line: `🎯 新規案件が割り当てられました！\n\n` +
          `👤 担当者: ${agentInfo.name}様\n` +
          `📋 案件ID: ${caseId}\n` +
          `📅 割当日時: ${timestamp}\n\n` +
          `💡 案件詳細は管理画面でご確認ください。\n` +
          `📞 お客様への初回連絡をお願いいたします。`,
    
    sms: `【外壁塗装くらべるAI】\n` +
         `${agentInfo.name}様に新規案件（${caseId}）が割り当てられました。\n` +
         `管理画面でご確認の上、お客様への初回連絡をお願いします。\n` +
         `割当日時: ${timestamp}`,
    
    email: `${agentInfo.name}様\n\n` +
           `いつもお疲れ様です。\n` +
           `新規案件が割り当てられましたのでお知らせいたします。\n\n` +
           `【案件情報】\n` +
           `案件ID: ${caseId}\n` +
           `担当者: ${agentInfo.name}様\n` +
           `割当日時: ${timestamp}\n\n` +
           `【今後のアクション】\n` +
           `1. 管理画面で案件詳細をご確認ください\n` +
           `2. お客様への初回連絡をお願いいたします\n` +
           `3. 対応状況を適宜システムに記録してください\n\n` +
           `ご不明な点がございましたら、お気軽にお問い合わせください。\n\n` +
           `外壁塗装くらべるAI 運営チーム`
  };
}

/**
 * 通知統計を更新
 * 
 * @param {SpreadsheetApp.Sheet} agentsSheet - 営業担当者シート
 * @param {number} rowIndex - 行インデックス
 * @param {Array} headers - ヘッダー配列
 * @param {boolean} success - 通知成功フラグ
 */
function updateNotificationStats(agentsSheet, rowIndex, headers, success) {
  try {
    const successIndex = headers.indexOf('通知成功回数');
    const failureIndex = headers.indexOf('通知失敗回数');
    
    if (success && successIndex >= 0) {
      const currentCount = parseInt(agentsSheet.getRange(rowIndex + 1, successIndex + 1).getValue()) || 0;
      agentsSheet.getRange(rowIndex + 1, successIndex + 1).setValue(currentCount + 1);
    } else if (!success && failureIndex >= 0) {
      const currentCount = parseInt(agentsSheet.getRange(rowIndex + 1, failureIndex + 1).getValue()) || 0;
      agentsSheet.getRange(rowIndex + 1, failureIndex + 1).setValue(currentCount + 1);
    }
  } catch (error) {
    Logger.log('❌ 通知統計更新エラー:', error);
  }
}

/**
 * システム通知送信（Slack）
 * 
 * @param {string} message - 通知メッセージ
 * @returns {Object} 送信結果
 */
function sendSystemNotification(message) {
  try {
    if (typeof sendSlackNotification === 'function') {
      return sendSlackNotification(message);
    } else {
      Logger.log('⚠️ sendSlackNotification関数が利用できません');
      logFallbackError('システム通知', 'Slack通知関数未定義');
      return { success: false, error: 'Slack通知関数未定義' };
    }
  } catch (error) {
    Logger.log('❌ システム通知エラー:', error);
    logFallbackError('システム通知', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 担当者不在時の警告メッセージ作成
 * 
 * @param {Object} errorDetail - エラー詳細
 * @returns {string} 警告メッセージ
 */
function createNoAgentWarningMessage(errorDetail) {
  return `🚨 *案件割り当て警告*\n\n` +
    `📍 エリア: ${errorDetail.cityDistrict}\n` +
    `🏢 加盟店: ${errorDetail.franchiseId}\n` +
    `📋 案件ID: ${errorDetail.caseId}\n\n` +
    `❌ 該当エリアの営業担当者が見つかりませんでした。\n` +
    `💡 加盟店に連絡し、エリア担当者の設定を確認してください。`;
}

/**
 * 通知結果をユーザー案件シートに記録
 * 
 * @param {string} caseId - 案件ID
 * @param {Object} notificationResult - 通知結果
 */
function updateNotificationLog(caseId, notificationResult) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userCasesSheet = ss.getSheetByName('ユーザー案件');
    
    if (!userCasesSheet) return;
    
    const data = userCasesSheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const userId = row[headers.indexOf('ユーザーID')];
      
      if (userId === caseId) {
        const logIndex = headers.indexOf('通知結果ログ');
        
        if (logIndex >= 0) {
          const logMessage = `${Utilities.formatDate(new Date(), 'JST', 'MM/dd HH:mm')} ${notificationResult.method || 'Unknown'}: ${notificationResult.success ? '成功' : '失敗'}`;
          userCasesSheet.getRange(i + 1, logIndex + 1).setValue(logMessage);
        }
        
        break;
      }
    }
    
  } catch (error) {
    Logger.log('❌ 通知ログ更新エラー:', error);
  }
}

// ==================== テスト関数 ====================

/**
 * 振り分けロジックの総合テスト（改良版）
 */
function testAssignmentLogic() {
  Logger.log('🧪 営業担当振り分けロジックテスト開始（改良版）');
  
  try {
    // 1. 初期化テスト
    Logger.log('--- 初期化テスト ---');
    const initResult = initializeAssignmentSheets();
    Logger.log('初期化結果:', initResult);
    
    // 2. 住所抽出テスト
    Logger.log('--- 住所抽出テスト ---');
    const testAddresses = [
      '東京都渋谷区神宮前1-1-1',
      '神奈川県横浜市中区本町1-1',
      '大阪府大阪市北区梅田1-1-1',
      '愛知県名古屋市中区栄1-1-1',
      '福岡県福岡市博多区博多駅前1-1-1',
      '無効な住所データ'  // 異常系テスト
    ];
    
    const addressResults = [];
    testAddresses.forEach(address => {
      const cityDistrict = extractCityDistrict(address);
      const result = { address: address, extracted: cityDistrict };
      addressResults.push(result);
      Logger.log(`住所: ${address} → 市区町村: ${cityDistrict}`);
    });
    
    // 3. 正常系案件割り当てテスト
    Logger.log('--- 正常系案件割り当てテスト ---');
    const normalTestCases = [
      {
        caseId: 'U_TEST_ASSIGN_001',
        franchiseId: 'FRANCHISE_001',
        address: '東京都渋谷区渋谷1-1-1'
      },
      {
        caseId: 'U_TEST_ASSIGN_002',
        franchiseId: 'FRANCHISE_001',
        address: '東京都世田谷区世田谷1-1-1'
      },
      {
        caseId: 'U_TEST_ASSIGN_003',
        franchiseId: 'FRANCHISE_002',
        address: '神奈川県横浜市中区本町1-1-1'
      }
    ];
    
    const normalResults = [];
    normalTestCases.forEach(testCase => {
      const result = autoAssignAgentToCase(testCase.caseId, testCase.franchiseId, testCase.address);
      normalResults.push({
        testCase: testCase,
        result: result
      });
      Logger.log(`正常系テスト [${testCase.caseId}]:`, result);
    });
    
    // 4. 異常系テスト
    Logger.log('--- 異常系テスト ---');
    const abnormalTestCases = [
      {
        name: '存在しない加盟店',
        caseId: 'U_TEST_ERROR_001',
        franchiseId: 'INVALID_FRANCHISE',
        address: '東京都渋谷区渋谷1-1-1'
      },
      {
        name: '無効な住所',
        caseId: 'U_TEST_ERROR_002',
        franchiseId: 'FRANCHISE_001',
        address: '無効な住所データ'
      },
      {
        name: '対応エリア外',
        caseId: 'U_TEST_ERROR_003',
        franchiseId: 'FRANCHISE_001',
        address: '北海道札幌市中央区北1条西1-1-1'
      }
    ];
    
    const abnormalResults = [];
    abnormalTestCases.forEach(testCase => {
      const result = autoAssignAgentToCase(testCase.caseId, testCase.franchiseId, testCase.address);
      abnormalResults.push({
        testCase: testCase,
        result: result
      });
      Logger.log(`異常系テスト [${testCase.name}]:`, result);
    });
    
    // 5. 通知テスト
    Logger.log('--- 通知テスト ---');
    const notificationTests = [
      { agentId: 'AGENT_001', caseId: 'TEST_NOTIFICATION_001' },
      { agentId: 'INVALID_AGENT', caseId: 'TEST_NOTIFICATION_002' }  // 異常系
    ];
    
    const notificationResults = [];
    notificationTests.forEach(test => {
      const result = notifyAssignedAgent(test.agentId, test.caseId);
      notificationResults.push({
        test: test,
        result: result
      });
      Logger.log(`通知テスト [${test.agentId}]:`, result);
    });
    
    // 6. 統計テスト
    Logger.log('--- 統計確認テスト ---');
    const statsTest = {
      addressExtractionSuccessRate: addressResults.filter(r => r.extracted).length / addressResults.length * 100,
      normalAssignmentSuccessRate: normalResults.filter(r => r.result.success).length / normalResults.length * 100,
      abnormalHandlingSuccessRate: abnormalResults.filter(r => !r.result.success).length / abnormalResults.length * 100,
      notificationSuccessRate: notificationResults.filter(r => r.result.success).length / notificationResults.length * 100
    };
    
    Logger.log('📊 テスト統計:', statsTest);
    
    Logger.log('✅ 営業担当振り分けロジックテスト完了（改良版）');
    
    // 総合結果レポート
    const successfulAssignments = normalResults.filter(ar => ar.result.success).length;
    const totalAssignments = normalResults.length;
    const errorHandlingSuccess = abnormalResults.filter(ar => !ar.result.success).length;
    const totalErrorCases = abnormalResults.length;
    
    const summaryMessage = `🧪 *営業担当振り分けシステム テスト完了（改良版）*\n\n` +
      `📊 *テスト結果サマリー*\n` +
      `✅ 正常割り当て: ${successfulAssignments}/${totalAssignments}件\n` +
      `⚠️ エラーハンドリング: ${errorHandlingSuccess}/${totalErrorCases}件正常\n` +
      `📍 住所抽出成功率: ${statsTest.addressExtractionSuccessRate.toFixed(1)}%\n` +
      `📬 通知成功率: ${statsTest.notificationSuccessRate.toFixed(1)}%\n` +
      `🔧 初期化: ${initResult.success ? '成功' : '失敗'}\n\n` +
      `💡 全機能テスト完了、詳細ログはGASログで確認してください。`;
    
    // Slack通知
    const finalNotification = sendSystemNotification(summaryMessage);
    
    return {
      success: true,
      testResults: {
        initialization: initResult,
        addressExtraction: addressResults,
        normalAssignments: normalResults,
        abnormalCases: abnormalResults,
        notifications: notificationResults,
        statistics: statsTest
      },
      summary: {
        successfulAssignments: successfulAssignments,
        totalAssignments: totalAssignments,
        errorHandlingSuccess: errorHandlingSuccess,
        successRate: totalAssignments > 0 ? (successfulAssignments / totalAssignments * 100).toFixed(1) + '%' : '0%',
        finalNotificationSent: finalNotification.success
      }
    };
    
  } catch (error) {
    Logger.log('❌ 営業担当振り分けロジックテストエラー:', error);
    
    // エラー通知
    const errorNotification = sendSystemNotification(`🚨 営業担当振り分けシステムテストでエラーが発生しました\nエラー: ${error.message}`);
    
    throw error;
  }
}

/**
 * 営業担当の現在件数リセット（月末処理等で使用）
 * 
 * @returns {Object} リセット結果
 */
function resetAgentCaseCounts() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const agentsSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!agentsSheet) {
      Logger.log('⚠️ 加盟店子ユーザー一覧シートが見つかりません');
      return { success: false, error: 'シートが見つかりません' };
    }
    
    const agentsData = agentsSheet.getDataRange().getValues();
    const agentsHeaders = agentsData[0];
    const countIndex = agentsHeaders.indexOf('現在担当件数');
    
    let resetCount = 0;
    
    if (countIndex >= 0) {
      for (let i = 1; i < agentsData.length; i++) {
        agentsSheet.getRange(i + 1, countIndex + 1).setValue(0);
        resetCount++;
      }
    }
    
    Logger.log(`✅ 営業担当の現在件数をリセットしました (${resetCount}名)`);
    
    // Slack通知
    const notificationResult = sendSystemNotification(`🔄 営業担当の現在件数がリセットされました（${resetCount}名、月末処理）`);
    
    return { 
      success: true, 
      message: `営業担当の現在件数をリセットしました (${resetCount}名)`,
      resetCount: resetCount,
      notificationSent: notificationResult.success
    };
    
  } catch (error) {
    Logger.log('❌ 営業担当件数リセットエラー:', error);
    logFallbackError('件数リセット', error.message);
    return { success: false, error: error.message };
  }
}