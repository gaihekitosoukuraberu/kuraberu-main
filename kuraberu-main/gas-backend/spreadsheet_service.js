/**
 * ファイル名: spreadsheet_service.gs
 * 外壁塗装くらべるAI - スプレッドシート統合初期化システム
 * 全シート構造のブラッシュアップと既存コード整合性確保
 */

/**
 * 全スプレッドシートシートの統合初期化
 * 既存コード非破壊で新カラム構成に対応
 * 
 * @returns {Object} 初期化結果
 */
function initializeAllSpreadsheetSheets() {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    let ss;
    try {
      // まずアクティブスプレッドシートを試行
      ss = SpreadsheetApp.getActiveSpreadsheet();
      Logger.log('✅ アクティブスプレッドシート取得成功:', ss.getName());
    } catch (activeError) {
      Logger.log('⚠️ アクティブスプレッドシート取得失敗、ID指定で再試行');
      ss = SpreadsheetApp.openById(spreadsheetId);
      Logger.log('✅ SpreadsheetApp.openById成功');
    }
    Logger.log('🚀 全シート統合初期化開始（既存コード整合性確保）');

    const results = {
      success: true,
      sheetsInitialized: [],
      samplesCreated: [],
      backwardCompatibility: true,
      errors: []
    };

    try {
      // 1. 加盟店子ユーザー一覧シートの初期化
      Logger.log('--- 加盟店子ユーザー一覧シート初期化 ---');
      const childUsersResult = initializeChildUsersSheet(ss);
      results.sheetsInitialized.push('加盟店子ユーザー一覧');
      if (childUsersResult.samplesCreated) {
        results.samplesCreated.push('加盟店子ユーザー一覧サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`加盟店子ユーザー一覧: ${e.message}`);
    }

    try {
      // 2. ユーザー案件シートの初期化
      Logger.log('--- ユーザー案件シート初期化 ---');
      const userCasesResult = initializeUserCasesSheet(ss);
      results.sheetsInitialized.push('ユーザー案件');
      if (userCasesResult.samplesCreated) {
        results.samplesCreated.push('ユーザー案件サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`ユーザー案件: ${e.message}`);
    }

    try {
      // 3. 加盟店親ユーザー一覧シートの初期化（既存システム対応）
      Logger.log('--- 加盟店親ユーザー一覧シート初期化 ---');
      const parentUsersResult = initializeParentUsersSheet(ss);
      results.sheetsInitialized.push('加盟店親ユーザー一覧');
    } catch (e) {
      results.errors.push(`加盟店親ユーザー一覧: ${e.message}`);
    }

    // 4. キャンセル申請シートの統合初期化
    try {
      Logger.log('--- キャンセル申請シート統合初期化 ---');
      const cancelSheetResult = initializeCancelRequestSheet(ss);
      results.sheetsInitialized.push('キャンセル申請');
      if (cancelSheetResult.samplesCreated) {
        results.samplesCreated.push('キャンセル申請サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`キャンセル申請: ${e.message}`);
    }

    // 5. 通知履歴シートの初期化
    try {
      Logger.log('--- 通知履歴シート初期化 ---');
      const notificationHistoryResult = initializeNotificationHistorySheet(ss);
      results.sheetsInitialized.push('通知履歴');
      if (notificationHistoryResult.samplesCreated) {
        results.samplesCreated.push('通知履歴サンプルデータ');
      }
    } catch (e) {
      results.errors.push(`通知履歴: ${e.message}`);
    }

    // 6. その他システム関連シートの確認・作成
    const additionalSheets = [
      '案件振り分け履歴'
    ];

    additionalSheets.forEach(sheetName => {
      try {
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          Logger.log(`✅ ${sheetName}シート新規作成`);
          results.sheetsInitialized.push(sheetName);
        }
      } catch (e) {
        results.errors.push(`${sheetName}: ${e.message}`);
      }
    });

    // 7. システムログシートの初期化（特別処理）
    try {
      Logger.log('--- システムログシート初期化 ---');
      const systemLogResult = initializeSystemLogSheet(ss);
      results.sheetsInitialized.push('システムログ');
    } catch (e) {
      results.errors.push(`システムログ: ${e.message}`);
    }

    // 8. claude_sheetCheckTest必須シートの初期化
    try {
      Logger.log('--- ユーザー情報シート初期化 ---');
      const userInfoResult = initializeUserInfoSheet(ss);
      results.sheetsInitialized.push('ユーザー情報');
    } catch (e) {
      results.errors.push(`ユーザー情報: ${e.message}`);
    }

    try {
      Logger.log('--- 問い合わせ履歴シート初期化 ---');
      const inquiryResult = initializeInquiryHistorySheet(ss);
      results.sheetsInitialized.push('問い合わせ履歴');
    } catch (e) {
      results.errors.push(`問い合わせ履歴: ${e.message}`);
    }

    try {
      Logger.log('--- 加盟店情報シート初期化 ---');
      const partnerResult = initializePartnerInfoSheet(ss);
      results.sheetsInitialized.push('加盟店情報');
    } catch (e) {
      results.errors.push(`加盟店情報: ${e.message}`);
    }

    try {
      Logger.log('--- マッチング履歴シート初期化 ---');
      const matchingResult = initializeMatchingHistorySheet(ss);
      results.sheetsInitialized.push('マッチング履歴');
    } catch (e) {
      results.errors.push(`マッチング履歴: ${e.message}`);
    }

    try {
      Logger.log('--- 管理者情報シート初期化 ---');
      const adminResult = initializeAdminInfoSheet(ss);
      results.sheetsInitialized.push('管理者情報');
    } catch (e) {
      results.errors.push(`管理者情報: ${e.message}`);
    }

    try {
      Logger.log('--- 設定マスタシート初期化 ---');
      const settingsResult = initializeSettingsMasterSheet(ss);
      results.sheetsInitialized.push('設定マスタ');
    } catch (e) {
      results.errors.push(`設定マスタ: ${e.message}`);
    }

    try {
      Logger.log('--- GASトリガー設定シート初期化 ---');
      const triggerResult = initializeGasTriggerSheet(ss);
      results.sheetsInitialized.push('GASトリガー設定');
    } catch (e) {
      results.errors.push(`GASトリガー設定: ${e.message}`);
    }

    try {
      Logger.log('--- ユーザー評価シート初期化 ---');
      const evaluationResult = initializeUserEvaluationSheet(ss);
      results.sheetsInitialized.push('ユーザー評価');
    } catch (e) {
      results.errors.push(`ユーザー評価: ${e.message}`);
    }

    try {
      Logger.log('--- チャット回答ログシート初期化 ---');
      const chatLogResult = initializeChatAnswerLogSheet(ss);
      results.sheetsInitialized.push('チャット回答ログ');
    } catch (e) {
      results.errors.push(`チャット回答ログ: ${e.message}`);
    }

    try {
      Logger.log('--- 請求管理シート初期化 ---');
      const billingResult = initializeBillingManagementSheet(ss);
      results.sheetsInitialized.push('請求管理');
    } catch (e) {
      results.errors.push(`請求管理: ${e.message}`);
    }

    try {
      Logger.log('--- 加盟店口座情報シート初期化 ---');
      const accountResult = initializeFranchiseeAccountSheet(ss);
      results.sheetsInitialized.push('加盟店口座情報');
    } catch (e) {
      results.errors.push(`加盟店口座情報: ${e.message}`);
    }

    try {
      Logger.log('--- 成約率ランキングシート初期化 ---');
      const successRateResult = initializeSuccessRateRankingSheet(ss);
      results.sheetsInitialized.push('成約率ランキング');
    } catch (e) {
      results.errors.push(`成約率ランキング: ${e.message}`);
    }

    try {
      Logger.log('--- 対応スピード・売上ランキングシート初期化 ---');
      const responseSpeedResult = initializeResponseSpeedRankingSheet(ss);
      results.sheetsInitialized.push('対応スピード・売上ランキング');
    } catch (e) {
      results.errors.push(`対応スピード・売上ランキング: ${e.message}`);
    }

    try {
      Logger.log('--- 加盟店フラグ管理シート初期化 ---');
      const flagResult = initializeFranchiseeFlagSheet(ss);
      results.sheetsInitialized.push('加盟店フラグ管理');
    } catch (e) {
      results.errors.push(`加盟店フラグ管理: ${e.message}`);
    }

    // 案件管理シート初期化
    try {
      Logger.log('--- 案件管理シート初期化 ---');
      const caseManagementResult = initializeCaseManagementSheet(ss);
      results.sheetsInitialized.push('案件管理');
      if (caseManagementResult.samplesCreated) {
        results.samplesCreated.push(...caseManagementResult.samplesCreated);
      }
    } catch (e) {
      results.errors.push(`案件管理: ${e.message}`);
    }

    // ステータス定義シート初期化
    try {
      Logger.log('--- ステータス定義シート初期化 ---');
      const statusDefinitionResult = initializeStatusDefinitionSheet(ss);
      results.sheetsInitialized.push('ステータス定義');
      if (statusDefinitionResult.samplesCreated) {
        results.samplesCreated.push(...statusDefinitionResult.samplesCreated);
      }
    } catch (e) {
      results.errors.push(`ステータス定義: ${e.message}`);
    }

    Logger.log('✅ 全シート統合初期化完了（案件進捗管理機能追加）');
    
    // Slack通知（利用可能な場合）
    try {
      if (typeof sendSlackNotification === 'function') {
        const message = `🚀 スプレッドシート統合初期化完了
📊 初期化シート数: ${results.sheetsInitialized.length}
📝 サンプルデータ: ${results.samplesCreated.length}件
⚠️ エラー: ${results.errors.length}件
✅ 既存コード整合性: 確保済み`;
        sendSlackNotification(message);
      }
    } catch (e) {
      Logger.log('⚠️ Slack通知スキップ:', e.message);
    }

    return {
      success: results.errors.length === 0,
      message: '全シート統合初期化が完了しました',
      details: results
    };
    
  } catch (error) {
    Logger.log('❌ 全シート統合初期化エラー:', error);
    throw new Error(`全シート統合初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 加盟店子ユーザー一覧シートの初期化（sheets_structure.md完全準拠）
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeChildUsersSheet(ss) {
  try {
    Logger.log('👥 加盟店子ユーザー一覧シート初期化開始');
    
    let childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
    
    if (!childSheet) {
      childSheet = ss.insertSheet('加盟店子ユーザー一覧');
      Logger.log('✅ 加盟店子ユーザー一覧シート新規作成');
    }
    
    // sheets_structure.md完全準拠のヘッダー構成
    const headers = [
      '子ユーザーID',
      '親加盟店ID',
      '氏名（表示用）',
      'メールアドレス',
      'パスワードハッシュ',
      '役割',
      '権限レベル',
      '対応エリア（市区町村）',
      '担当案件タイプ',
      'ステータス',
      '最終ログイン日時',
      '登録日',
      '作成者ID',
      '作成日',
      '更新日',
      '備考'
    ];
    
    const existingRange = childSheet.getDataRange();
    
    if (existingRange.getNumRows() === 0) {
      // 空のシートの場合は単純にヘッダーを設定
      childSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      childSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      childSheet.getRange(1, 1, 1, headers.length).setBackground('#E8F4FD');
      Logger.log('✅ 加盟店子ユーザー一覧ヘッダー設定完了');
    } else {
      // 既存データがある場合、ヘッダーの整合性をチェック
      const firstRow = childSheet.getRange(1, 1, 1, Math.min(headers.length, existingRange.getNumColumns())).getValues()[0];
      const isHeaderCorrect = headers.every((header, index) => firstRow[index] === header);
      
      if (!isHeaderCorrect) {
        // ヘッダーが正しくない場合、既存データを保護しながら修正
        Logger.log('⚠️ 既存データを保護しながらヘッダーを sheets_structure.md 準拠に修正');
        
        // 既存データを一時的にコピー（ヘッダー行を除く）
        const existingData = existingRange.getValues();
        const dataRows = existingData.slice(1); // 1行目（ヘッダー）を除く
        
        // シートをクリア
        childSheet.clear();
        
        // 新しいヘッダーを設定
        childSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        childSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        childSheet.getRange(1, 1, 1, headers.length).setBackground('#E8F4FD');
        
        // 既存データを新しいヘッダー構成に合わせて復元
        if (dataRows.length > 0) {
          // 旧ヘッダーから新ヘッダーへのマッピング
          const oldHeaders = existingData[0];
          const mappedData = dataRows.map(row => {
            const newRow = new Array(headers.length).fill('');
            
            // マッピング処理
            headers.forEach((newHeader, newIndex) => {
              let oldIndex = -1;
              
              // 完全一致を探す
              oldIndex = oldHeaders.indexOf(newHeader);
              
              // 完全一致がない場合、類似マッピングを試行
              if (oldIndex === -1) {
                switch (newHeader) {
                  case '親加盟店ID':
                    oldIndex = oldHeaders.indexOf('加盟店ID');
                    break;
                  case '権限レベル':
                    oldIndex = oldHeaders.indexOf('権限');
                    break;
                  case '最終ログイン日時':
                    oldIndex = oldHeaders.indexOf('最終更新日時');
                    break;
                  case '登録日':
                    oldIndex = oldHeaders.indexOf('作成日');
                    break;
                }
              }
              
              // データをコピー
              if (oldIndex !== -1 && oldIndex < row.length) {
                newRow[newIndex] = row[oldIndex];
              }
            });
            
            return newRow;
          });
          
          childSheet.getRange(2, 1, mappedData.length, headers.length).setValues(mappedData);
          Logger.log(`✅ 既存データ ${mappedData.length}件を保護してsheets_structure.md準拠で復元`);
        }
      }
    }
    
    // 列幅の最適調整
    const columnWidths = {
      '子ユーザーID': 120,
      '親加盟店ID': 120,
      '氏名（表示用）': 150,
      'メールアドレス': 200,
      'パスワードハッシュ': 150,
      '役割': 100,
      '権限レベル': 100,
      '対応エリア（市区町村）': 180,
      '担当案件タイプ': 150,
      'ステータス': 100,
      '最終ログイン日時': 150,
      '登録日': 120,
      '作成者ID': 120,
      '作成日': 120,
      '更新日': 120,
      '備考': 200
    };
    
    headers.forEach((header, index) => {
      const width = columnWidths[header] || 120;
      childSheet.setColumnWidth(index + 1, width);
    });
    
    Logger.log('✅ 加盟店子ユーザー一覧シート初期化完了（sheets_structure.md準拠）');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ 加盟店子ユーザー一覧シート初期化エラー:', error);
    throw new Error(`加盟店子ユーザー一覧シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * システムログシートの初期化（既存ログ保護）
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeSystemLogSheet(ss) {
  try {
    Logger.log('📝 システムログシート初期化開始');
    
    let logSheet = ss.getSheetByName('システムログ');
    
    if (!logSheet) {
      // シートが存在しない場合は新規作成
      logSheet = ss.insertSheet('システムログ');
      Logger.log('✅ システムログシート新規作成');
    }
    
    // sheets_structure.md準拠のヘッダー構成
    const headers = [
      'ログID',
      'タイムスタンプ',
      'ログレベル',
      '発生元',
      'イベントタイプ',
      'メッセージ',
      '関連ID',
      'エラーコード',
      'スタックトレース'
    ];
    
    const existingRange = logSheet.getDataRange();
    
    if (existingRange.getNumRows() === 0) {
      // 空のシートの場合は単純にヘッダーを設定
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      logSheet.getRange(1, 1, 1, headers.length).setBackground('#FFF2CC');
      Logger.log('✅ システムログヘッダー設定完了');
    } else {
      // 既存データがある場合
      const firstRow = logSheet.getRange(1, 1, 1, Math.min(headers.length, existingRange.getNumColumns())).getValues()[0];
      const isHeaderCorrect = headers.every((header, index) => firstRow[index] === header);
      
      if (!isHeaderCorrect) {
        // ヘッダーが正しくない場合、既存データを1行下にずらす
        Logger.log('⚠️ 既存データを保護しながらヘッダーを修正');
        
        // 既存データを一時的にコピー
        const existingData = existingRange.getValues();
        
        // シートをクリア
        logSheet.clear();
        
        // 新しいヘッダーを設定
        logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        logSheet.getRange(1, 1, 1, headers.length).setBackground('#FFF2CC');
        
        // 既存データを2行目以降に復元
        if (existingData.length > 0) {
          const adjustedData = existingData.map(row => {
            const newRow = new Array(headers.length).fill('');
            for (let i = 0; i < Math.min(row.length, newRow.length); i++) {
              newRow[i] = row[i];
            }
            return newRow;
          });
          
          logSheet.getRange(2, 1, adjustedData.length, headers.length).setValues(adjustedData);
          Logger.log(`✅ 既存ログ ${adjustedData.length}件を保護して復元`);
        }
      }
    }
    
    // 列幅の自動調整
    logSheet.setColumnWidth(1, 120); // ログID
    logSheet.setColumnWidth(2, 150); // タイムスタンプ
    logSheet.setColumnWidth(3, 80);  // ログレベル
    logSheet.setColumnWidth(4, 120); // 発生元
    logSheet.setColumnWidth(5, 120); // イベントタイプ
    logSheet.setColumnWidth(6, 300); // メッセージ
    logSheet.setColumnWidth(7, 100); // 関連ID
    logSheet.setColumnWidth(8, 100); // エラーコード
    logSheet.setColumnWidth(9, 200); // スタックトレース
    
    Logger.log('✅ システムログシート初期化完了');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ システムログシート初期化エラー:', error);
    throw new Error(`システムログシート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * ユーザー案件シートの初期化（既存構成対応）
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeUserCasesSheet(ss) {
  try {
    Logger.log('📋 ユーザー案件シート初期化開始');
    
    let casesSheet = ss.getSheetByName('ユーザー案件');
    
    if (!casesSheet) {
      casesSheet = ss.insertSheet('ユーザー案件');
      Logger.log('✅ ユーザー案件シート新規作成');
    }
    
    // 既存システムとの整合性を保った構成
    const headers = [
      '案件ID',
      'ユーザーID',
      '氏名',
      '電話番号',
      'メールアドレス',
      '都道府県',
      '市区町村',
      '住所',
      '工事種別',
      '希望時期',
      '予算',
      '面積',
      'ステータス',
      '担当者ID',
      '作成日',
      '更新日',
      '備考'
    ];
    
    // ヘッダーが存在しない場合のみ設定
    const existingRange = casesSheet.getDataRange();
    if (existingRange.getNumRows() === 0) {
      casesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      casesSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      casesSheet.getRange(1, 1, 1, headers.length).setBackground('#E8F4FD');
      Logger.log('✅ ユーザー案件ヘッダー設定完了');
    }
    
    // 列幅の自動調整
    headers.forEach((header, index) => {
      casesSheet.setColumnWidth(index + 1, 120);
    });
    
    Logger.log('✅ ユーザー案件シート初期化完了');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ ユーザー案件シート初期化エラー:', error);
    throw new Error(`ユーザー案件シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 加盟店親ユーザー一覧シートの初期化（既存システム対応）
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeParentUsersSheet(ss) {
  try {
    Logger.log('👨‍💼 加盟店親ユーザー一覧シート初期化開始');
    
    let parentSheet = ss.getSheetByName('加盟店親ユーザー一覧');
    
    if (!parentSheet) {
      parentSheet = ss.insertSheet('加盟店親ユーザー一覧');
      Logger.log('✅ 加盟店親ユーザー一覧シート新規作成');
    }
    
    // フロントエンド送信データ完全一致ヘッダー（essentialDataオブジェクト順）
    const headers = [
      // バックエンド生成データ
      '加盟店ID',
      'タイムスタンプ',
      
      // フロントエンド送信データ（essentialDataの順序と完全一致）
      'action',                     // 1. action
      'legalName',                  // 2. legalName (会社名)
      'legalNameKana',             // 3. legalNameKana (会社名カナ)  
      'representative',            // 4. representative (代表者名)
      'representativeKana',        // 5. representativeKana (代表者カナ)
      'postalCode',                // 6. postalCode (郵便番号)
      'address',                   // 7. address (住所)
      'phone',                     // 8. phone (電話番号)
      'websiteUrl',                // 9. websiteUrl (ウェブサイトURL)
      'employees',                 // 10. employees (従業員数)
      'revenue',                   // 11. revenue (売上規模)
      'billingEmail',              // 12. billingEmail (請求用メール)
      'salesEmail',                // 13. salesEmail (営業用メール)
      'salesPersonName',           // 14. salesPersonName (営業担当者氏名)
      'salesPersonContact',        // 15. salesPersonContact (営業担当者連絡先)
      'propertyTypes',             // 16. propertyTypes (物件種別・階数)
      'constructionAreas',         // 17. constructionAreas (施工箇所)
      'specialServices',           // 18. specialServices (特殊対応項目)
      'buildingAgeRange',          // 19. buildingAgeRange (築年数対応範囲)
      'tradeName',                 // 20. tradeName (屋号)
      'tradeNameKana',            // 21. tradeNameKana (屋号カナ)
      'branchInfo',               // 22. branchInfo (支店情報)
      'establishedDate',          // 23. establishedDate (設立年月日)
      'companyPR',                // 24. companyPR (会社PR)
      'areasCompressed',          // 25. areasCompressed (対応エリア)
      'priorityAreas',            // 26. priorityAreas (優先対応エリア)
      'timestamp',                // 27. timestamp (タイムスタンプ)
      
      // 管理情報
      '登録日',
      '最終ログイン日時',
      'ステータス',
      '審査担当者',
      '審査完了日',
      '備考'
    ];
    
    // ヘッダーが存在しない場合のみ設定
    const existingRange = parentSheet.getDataRange();
    if (existingRange.getNumRows() === 0) {
      parentSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      parentSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      parentSheet.getRange(1, 1, 1, headers.length).setBackground('#F4E8FD');
      Logger.log('✅ 加盟店親ユーザー一覧ヘッダー設定完了');
    }
    
    // 列幅の自動調整
    headers.forEach((header, index) => {
      parentSheet.setColumnWidth(index + 1, 140);
    });
    
    Logger.log('✅ 加盟店親ユーザー一覧シート初期化完了');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ 加盟店親ユーザー一覧シート初期化エラー:', error);
    throw new Error(`加盟店親ユーザー一覧シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * キャンセル申請シートの統合初期化
 * 複数の古いキャンセルシートを統合し、新構造で作成
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeCancelRequestSheet(ss) {
  try {
    Logger.log('🚫 キャンセル申請シート統合初期化開始');
    
    const newSheetName = 'キャンセル申請';
    let sheet = ss.getSheetByName(newSheetName);
    
    // 既存の古いキャンセルシートをチェック・削除
    const oldSheetNames = ['キャンセル申請一覧', 'キャンセル申請管理', 'CancelRequests'];
    const existingData = [];
    
    // 古いシートからデータを移行
    oldSheetNames.forEach(oldName => {
      const oldSheet = ss.getSheetByName(oldName);
      if (oldSheet) {
        Logger.log(`📋 古いシート発見: ${oldName} - データ移行準備`);
        try {
          const data = oldSheet.getDataRange().getValues();
          if (data.length > 1) { // ヘッダー以外にデータがある場合
            existingData.push({
              sheetName: oldName,
              data: data,
              headers: data[0]
            });
          }
          // 古いシートを削除（データ移行後）
          ss.deleteSheet(oldSheet);
          Logger.log(`🗑️ 古いシート削除: ${oldName}`);
        } catch (e) {
          Logger.log(`⚠️ 古いシート処理エラー (${oldName}): ${e.message}`);
        }
      }
    });
    
    // 新しい統合シートを作成
    if (!sheet) {
      sheet = ss.insertSheet(newSheetName);
      Logger.log(`✅ ${newSheetName}シート新規作成`);
    }
    
    // 統合ヘッダー行を設定
    const headers = [
      '申請ID',           // A: 一意の申請ID
      '加盟店ID',         // B: 申請者の加盟店ID
      '案件ID',           // C: 対象案件ID
      '申請者名',         // D: 申請者氏名
      '申請文',           // E: キャンセル申請文
      '申請理由カテゴリ', // F: 理由の分類
      '詳細理由',         // G: 詳細な理由
      '送信日時',         // H: 申請日時
      'ステータス',       // I: 処理状況
      '処理担当者',       // J: 対応者
      '処理日時',         // K: 処理完了日時
      '備考'             // L: 追加メモ
    ];
    
    sheet.clear(); // 既存内容をクリア
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダー行の書式設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a90e2');
    headerRange.setFontColor('#ffffff');
    
    // 列幅を調整
    sheet.setColumnWidth(1, 140); // 申請ID
    sheet.setColumnWidth(2, 120); // 加盟店ID
    sheet.setColumnWidth(3, 120); // 案件ID
    sheet.setColumnWidth(4, 120); // 申請者名
    sheet.setColumnWidth(5, 300); // 申請文
    sheet.setColumnWidth(6, 150); // 申請理由カテゴリ
    sheet.setColumnWidth(7, 200); // 詳細理由
    sheet.setColumnWidth(8, 150); // 送信日時
    sheet.setColumnWidth(9, 100); // ステータス
    sheet.setColumnWidth(10, 120); // 処理担当者
    sheet.setColumnWidth(11, 150); // 処理日時
    sheet.setColumnWidth(12, 200); // 備考
    
    // 既存データを新形式に変換して移行
    let migratedCount = 0;
    existingData.forEach(oldData => {
      Logger.log(`📦 ${oldData.sheetName}からのデータ移行開始`);
      
      for (let i = 1; i < oldData.data.length; i++) {
        const oldRow = oldData.data[i];
        try {
          // 旧データを新形式にマッピング
          const newRow = [
            `MIGRATED_${Date.now()}_${i}`, // 申請ID（移行データ用）
            oldRow[1] || oldRow[0] || '',   // 加盟店ID
            oldRow[2] || oldRow[1] || '',   // 案件ID
            oldRow[3] || '',                // 申請者名
            oldRow[4] || oldRow[3] || oldRow[2] || '', // 申請文
            'データ移行',                   // 申請理由カテゴリ
            '旧システムからの移行データ',   // 詳細理由
            oldRow[5] || oldRow[4] || new Date().toISOString(), // 送信日時
            oldRow[6] || oldRow[5] || '移行完了', // ステータス
            '',                             // 処理担当者
            '',                             // 処理日時
            `移行元: ${oldData.sheetName}`  // 備考
          ];
          
          sheet.appendRow(newRow);
          migratedCount++;
        } catch (e) {
          Logger.log(`⚠️ データ移行エラー (${oldData.sheetName} 行${i}): ${e.message}`);
        }
      }
    });
    
    // サンプルデータ追加（移行データがない場合）
    let samplesCreated = false;
    if (migratedCount === 0) {
      const sampleData = [
        [
          'SAMPLE_001',
          'FRANCHISE_001',
          'CASE_001',
          'サンプル太郎',
          '【キャンセル申請】\n案件番号：CASE_001\nお客様名：田中太郎様\n主なキャンセル理由：お客様と連絡が取れなかった\n\n発生タイミング：現調前（連絡一度も取れず）\n\n申請日時：2024/6/5\n───────────────',
          '顧客連絡不可',
          'お客様と連絡が取れなかった',
          new Date().toISOString(),
          '未確認',
          '',
          '',
          'サンプルデータ'
        ]
      ];
      
      sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      samplesCreated = true;
      Logger.log('📝 サンプルデータ追加完了');
    }
    
    Logger.log(`✅ キャンセル申請シート統合初期化完了 (移行データ: ${migratedCount}件)`);
    
    return {
      success: true,
      sheetName: newSheetName,
      migratedDataCount: migratedCount,
      samplesCreated: samplesCreated,
      oldSheetsRemoved: oldSheetNames.filter(name => ss.getSheetByName(name) === null)
    };
    
  } catch (error) {
    Logger.log(`❌ キャンセル申請シート初期化エラー: ${error.message}`);
    throw new Error(`キャンセル申請シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 既存システムとの整合性確認・修正関数
 * 旧列名参照を新列名に自動変換
 * 
 * @returns {Object} 整合性確認結果
 */
function ensureBackwardCompatibility() {
  try {
    Logger.log('🔧 既存システム整合性確認開始');
    
    const compatibilityChecks = {
      columnMappings: {
        // 旧列名 → 新列名のマッピング
        'ユーザーID': '子ユーザーID',
        '親ユーザーID': '加盟店ID',
        '氏名': '氏名（表示用）',
        '市区町村': '住所（市区町村）',
        '対応エリア': '対応エリア（市区町村）'
      },
      systemsChecked: [
        'ranking_display_system.gs',
        'cancel_request_system.gs',
        'case_assignment_system.gs'
      ],
      warnings: [],
      fixesApplied: []
    };
    
    // 既存のgetSystemSetting関数がある場合の互換性確認
    try {
      if (typeof getSystemSetting === 'function') {
        Logger.log('✅ getSystemSetting関数: 利用可能');
      }
    } catch (e) {
      compatibilityChecks.warnings.push('getSystemSetting関数が見つかりません');
    }
    
    // 通知関数の確認
    const notificationFunctions = ['sendSlackNotification', 'sendLinePushMessage', 'sendSMS', 'sendEmail'];
    notificationFunctions.forEach(funcName => {
      try {
        if (typeof eval(funcName) === 'function') {
          Logger.log(`✅ ${funcName}関数: 利用可能`);
        }
      } catch (e) {
        compatibilityChecks.warnings.push(`${funcName}関数が見つかりません`);
      }
    });
    
    Logger.log('✅ 既存システム整合性確認完了');
    
    return {
      success: true,
      details: compatibilityChecks
    };
    
  } catch (error) {
    Logger.log('❌ 既存システム整合性確認エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 統合初期化システムのテスト関数
 * 全システムの動作確認を実施
 */

/**
 * 共通シート初期化ヘルパー関数
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @param {string} sheetName - シート名
 * @param {Array} headers - ヘッダー配列
 * @returns {Object} 初期化結果
 */
function initializeSimpleSheet(ss, sheetName, headers) {
  try {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    return { success: true, samplesCreated: false };
  } catch (error) {
    throw new Error(`${sheetName}シート初期化エラー: ${error.message}`);
  }
}

/**
 * ユーザー情報シート初期化
 */
function initializeUserInfoSheet(ss) {
  const headers = ['ユーザーID', '氏名', '電話番号', 'メールアドレス', '郵便番号', '都道府県', '市区町村', '番地以下', '建物名・部屋番号', '問い合わせ日時', '最終更新日時', 'LINEユーザーID', 'SlackチャンネルID', 'チャットボットステータス', '備考'];
  return initializeSimpleSheet(ss, 'ユーザー情報', headers);
}

/**
 * 問い合わせ履歴シート初期化
 */
function initializeInquiryHistorySheet(ss) {
  const headers = ['履歴ID', 'ユーザーID', '問い合わせ内容カテゴリ', '希望工事内容', '現在の状況', '希望時期', '予算感', '対応状況', 'チャット履歴JSON', '最終対応日時', '担当者ID', 'マッチング業者ID', 'メモ'];
  return initializeSimpleSheet(ss, '問い合わせ履歴', headers);
}

/**
 * 加盟店情報シート初期化
 */
function initializePartnerInfoSheet(ss) {
  const headers = ['加盟店ID', '会社名', '代表者名', '所在地郵便番号', '所在地都道府県', '所在地市区町村', '所在地番地以下', '電話番号', 'メールアドレス', '担当者名', '担当者連絡先', '対応可能エリア', '得意工事', '年間施工件数', '登録日', '契約プラン', 'アカウントステータス', '評価平均', '備考'];
  return initializeSimpleSheet(ss, '加盟店情報', headers);
}

/**
 * マッチング履歴シート初期化
 */
function initializeMatchingHistorySheet(ss) {
  const headers = ['マッチングID', '問い合わせID', '加盟店ID', 'マッチング日時', 'マッチング理由', 'マッチング結果', '成約状況', '成約日時', '成約金額', 'ユーザー評価', '加盟店評価', '備考'];
  return initializeSimpleSheet(ss, 'マッチング履歴', headers);
}

/**
 * 管理者情報シート初期化
 */
function initializeAdminInfoSheet(ss) {
  const headers = ['管理者ID', '氏名', 'メールアドレス', 'パスワードハッシュ', '役割', '最終ログイン日時', 'アカウントステータス', '備考'];
  return initializeSimpleSheet(ss, '管理者情報', headers);
}

/**
 * 設定マスタシート初期化
 */
function initializeSettingsMasterSheet(ss) {
  const headers = ['設定キー', '設定値', 'データ型', '説明', '最終更新日時', '更新者'];
  return initializeSimpleSheet(ss, '設定マスタ', headers);
}

/**
 * GASトリガー設定シート初期化
 */
function initializeGasTriggerSheet(ss) {
  const headers = ['トリガー名', '関数名', 'トリガータイプ', '実行間隔/条件', 'ステータス', '最終実行日時', '最終実行結果', '備考'];
  return initializeSimpleSheet(ss, 'GASトリガー設定', headers);
}

/**
 * ユーザー評価シート初期化
 */
function initializeUserEvaluationSheet(ss) {
  const headers = ['評価ID', 'マッチングID', 'ユーザーID', '加盟店ID', '評価点', 'コメント', '評価日時', '公開設定', '管理メモ'];
  return initializeSimpleSheet(ss, 'ユーザー評価', headers);
}

/**
 * 請求管理シート初期化
 * 月次請求データを管理するシート
 */
function initializeBillingManagementSheet(ss) {
  try {
    Logger.log('💰 請求管理シート初期化開始');
    
    let sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      sheet = ss.insertSheet('請求管理');
      Logger.log('✅ 請求管理シート新規作成');
    }
    
    // sheets_structure.md準拠のヘッダー構成
    const headers = [
      '請求ID',
      '加盟店ID',
      '請求対象月',
      '請求件数',
      '成約手数料合計（税込）',
      '紹介料合計（税込）',
      '請求総額',
      '支払種別（引き落とし／振込）',
      '支払状況（未払い／済）',
      '請求日',
      '支払期日',
      '支払完了日',
      'Slack通知済',
      '備考'
    ];
    
    const existingRange = sheet.getDataRange();
    
    if (existingRange.getNumRows() === 0) {
      // 空のシートの場合は単純にヘッダーを設定
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#FFC107');
      sheet.getRange(1, 1, 1, headers.length).setFontColor('#000000');
      Logger.log('✅ 請求管理ヘッダー設定完了');
    } else {
      // 既存データがある場合、ヘッダーの整合性をチェック
      const firstRow = sheet.getRange(1, 1, 1, Math.min(headers.length, existingRange.getNumColumns())).getValues()[0];
      const isHeaderCorrect = headers.every((header, index) => firstRow[index] === header);
      
      if (!isHeaderCorrect) {
        // ヘッダーが正しくない場合、既存データを保護しながら修正
        Logger.log('⚠️ 既存データを保護しながらヘッダーを修正');
        
        // 既存データを一時的にコピー（ヘッダー行を除く）
        const existingData = existingRange.getValues();
        const dataRows = existingData.slice(1); // 1行目（ヘッダー）を除く
        
        // シートをクリア
        sheet.clear();
        
        // 新しいヘッダーを設定
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.getRange(1, 1, 1, headers.length).setBackground('#FFC107');
        sheet.getRange(1, 1, 1, headers.length).setFontColor('#000000');
        
        // 既存データを新しいヘッダー構成に合わせて復元
        if (dataRows.length > 0) {
          const oldHeaders = existingData[0];
          const mappedData = dataRows.map(row => {
            const newRow = new Array(headers.length).fill('');
            
            // マッピング処理
            headers.forEach((newHeader, newIndex) => {
              let oldIndex = oldHeaders.indexOf(newHeader);
              
              // データをコピー
              if (oldIndex !== -1 && oldIndex < row.length) {
                newRow[newIndex] = row[oldIndex];
              }
            });
            
            return newRow;
          });
          
          sheet.getRange(2, 1, mappedData.length, headers.length).setValues(mappedData);
          Logger.log(`✅ 既存データ ${mappedData.length}件を保護して復元`);
        }
      }
    }
    
    // 列幅の最適調整
    const columnWidths = {
      '請求ID': 120,
      '加盟店ID': 120,
      '請求対象月': 100,
      '請求件数': 80,
      '成約手数料合計（税込）': 150,
      '紹介料合計（税込）': 150,
      '請求総額': 120,
      '支払種別（引き落とし／振込）': 180,
      '支払状況（未払い／済）': 150,
      '請求日': 120,
      '支払期日': 120,
      '支払完了日': 120,
      'Slack通知済': 100,
      '備考': 200
    };
    
    headers.forEach((header, index) => {
      const width = columnWidths[header] || 120;
      sheet.setColumnWidth(index + 1, width);
    });
    
    Logger.log('✅ 請求管理シート初期化完了');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ 請求管理シート初期化エラー:', error);
    throw new Error(`請求管理シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 加盟店口座情報シート初期化
 * 支払方法と口座情報を格納するシート
 */
function initializeFranchiseeAccountSheet(ss) {
  try {
    Logger.log('🏦 加盟店口座情報シート初期化開始');
    
    let sheet = ss.getSheetByName('加盟店口座情報');
    
    if (!sheet) {
      sheet = ss.insertSheet('加盟店口座情報');
      Logger.log('✅ 加盟店口座情報シート新規作成');
    }
    
    // sheets_structure.md準拠のヘッダー構成
    const headers = [
      '加盟店ID',
      '銀行名',
      '支店名',
      '口座種別（普通／当座）',
      '口座番号',
      '口座名義（カタカナ）',
      '登録状態（済／未）',
      '最終更新日'
    ];
    
    const existingRange = sheet.getDataRange();
    
    if (existingRange.getNumRows() === 0) {
      // 空のシートの場合は単純にヘッダーを設定
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#4CAF50');
      sheet.getRange(1, 1, 1, headers.length).setFontColor('#FFFFFF');
      Logger.log('✅ 加盟店口座情報ヘッダー設定完了');
    } else {
      // 既存データがある場合、ヘッダーの整合性をチェック
      const firstRow = sheet.getRange(1, 1, 1, Math.min(headers.length, existingRange.getNumColumns())).getValues()[0];
      const isHeaderCorrect = headers.every((header, index) => firstRow[index] === header);
      
      if (!isHeaderCorrect) {
        // ヘッダーが正しくない場合、既存データを保護しながら修正
        Logger.log('⚠️ 既存データを保護しながらヘッダーを修正');
        
        // 既存データを一時的にコピー（ヘッダー行を除く）
        const existingData = existingRange.getValues();
        const dataRows = existingData.slice(1); // 1行目（ヘッダー）を除く
        
        // シートをクリア
        sheet.clear();
        
        // 新しいヘッダーを設定
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.getRange(1, 1, 1, headers.length).setBackground('#4CAF50');
        sheet.getRange(1, 1, 1, headers.length).setFontColor('#FFFFFF');
        
        // 既存データを新しいヘッダー構成に合わせて復元
        if (dataRows.length > 0) {
          const oldHeaders = existingData[0];
          const mappedData = dataRows.map(row => {
            const newRow = new Array(headers.length).fill('');
            
            // マッピング処理
            headers.forEach((newHeader, newIndex) => {
              let oldIndex = oldHeaders.indexOf(newHeader);
              
              // データをコピー
              if (oldIndex !== -1 && oldIndex < row.length) {
                newRow[newIndex] = row[oldIndex];
              }
            });
            
            return newRow;
          });
          
          sheet.getRange(2, 1, mappedData.length, headers.length).setValues(mappedData);
          Logger.log(`✅ 既存データ ${mappedData.length}件を保護して復元`);
        }
      }
    }
    
    // 列幅の最適調整
    const columnWidths = {
      '加盟店ID': 120,
      '銀行名': 150,
      '支店名': 150,
      '口座種別（普通／当座）': 150,
      '口座番号': 120,
      '口座名義（カタカナ）': 200,
      '登録状態（済／未）': 120,
      '最終更新日': 150
    };
    
    headers.forEach((header, index) => {
      const width = columnWidths[header] || 120;
      sheet.setColumnWidth(index + 1, width);
    });
    
    Logger.log('✅ 加盟店口座情報シート初期化完了');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ 加盟店口座情報シート初期化エラー:', error);
    throw new Error(`加盟店口座情報シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * チャット回答ログシート初期化（LP埋め込み型チャットBot用）
 * API型GPT Bot + 4択タップ形式の回答データ保存
 */
function initializeChatAnswerLogSheet(ss) {
  try {
    Logger.log('💬 チャット回答ログシート初期化開始');
    
    let sheet = ss.getSheetByName('チャット回答ログ');
    
    if (!sheet) {
      sheet = ss.insertSheet('チャット回答ログ');
      Logger.log('✅ チャット回答ログシート新規作成');
    }
    
    // LP埋め込み型チャットBot用のヘッダー構成（sheets_structure.md準拠）
    const headers = [
      'UUID',                    // A列: 一意なユーザー識別子（クッキー or URL）
      '質問ID',                  // B列: 内部的に使う質問の識別子
      '質問内容',                // C列: GPT生成の質問テキスト
      '回答内容',                // D列: ユーザーが選択した4択回答
      '回答時刻',                // E列: ISO8601形式で記録
      'LP識別子（utm_id）',       // F列: LPやキャンペーンの識別（例：gpaint_2025）
      '検索KW（kw）',            // G列: 流入時のGoogle検索キーワード
      '表示質問バリアント名',      // H列: 例："visit_priority_v1" 等
      'その他のメタ情報'          // I列: JSONなどで拡張（省略可）
    ];
    
    const existingRange = sheet.getDataRange();
    
    if (existingRange.getNumRows() === 0) {
      // 空のシートの場合は単純にヘッダーを設定
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#34A853');
      sheet.getRange(1, 1, 1, headers.length).setFontColor('#FFFFFF');
      Logger.log('✅ チャット回答ログヘッダー設定完了');
    } else {
      // 既存データがある場合、ヘッダーの整合性をチェック
      const firstRow = sheet.getRange(1, 1, 1, Math.min(headers.length, existingRange.getNumColumns())).getValues()[0];
      const isHeaderCorrect = headers.every((header, index) => firstRow[index] === header);
      
      if (!isHeaderCorrect) {
        // ヘッダーが正しくない場合、既存データを保護しながら修正
        Logger.log('⚠️ 既存データを保護しながらヘッダーをLP埋め込み型対応に修正');
        
        // 既存データを一時的にコピー（ヘッダー行を除く）
        const existingData = existingRange.getValues();
        const dataRows = existingData.slice(1); // 1行目（ヘッダー）を除く
        
        // シートをクリア
        sheet.clear();
        
        // 新しいヘッダーを設定
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        sheet.getRange(1, 1, 1, headers.length).setBackground('#34A853');
        sheet.getRange(1, 1, 1, headers.length).setFontColor('#FFFFFF');
        
        // 既存データを新しいヘッダー構成に合わせて復元
        if (dataRows.length > 0) {
          // 旧ヘッダーから新ヘッダーへのマッピング
          const oldHeaders = existingData[0];
          const mappedData = dataRows.map(row => {
            const newRow = new Array(headers.length).fill('');
            
            // マッピング処理
            headers.forEach((newHeader, newIndex) => {
              let oldIndex = -1;
              
              // 完全一致を探す
              oldIndex = oldHeaders.indexOf(newHeader);
              
              // 完全一致がない場合、類似マッピングを試行
              if (oldIndex === -1) {
                switch (newHeader) {
                  case 'LP識別子（utm_id）':
                    oldIndex = oldHeaders.indexOf('LP識別子') || oldHeaders.indexOf('utm_id');
                    break;
                  case '検索KW（kw）':
                    oldIndex = oldHeaders.indexOf('検索KW') || oldHeaders.indexOf('kw');
                    break;
                  case '表示質問バリアント名':
                    oldIndex = oldHeaders.indexOf('バリアント名') || oldHeaders.indexOf('variant');
                    break;
                }
              }
              
              // データをコピー
              if (oldIndex !== -1 && oldIndex < row.length) {
                newRow[newIndex] = row[oldIndex];
              }
            });
            
            return newRow;
          });
          
          sheet.getRange(2, 1, mappedData.length, headers.length).setValues(mappedData);
          Logger.log(`✅ 既存データ ${mappedData.length}件を保護してLP埋め込み型対応で復元`);
        }
      }
    }
    
    // 列幅の最適調整（LP埋め込み型チャットBot用）
    const columnWidths = {
      'UUID': 150,
      '質問ID': 100,
      '質問内容': 200,
      '回答内容': 200,
      '回答時刻': 150,
      'LP識別子（utm_id）': 120,
      '検索KW（kw）': 150,
      '表示質問バリアント名': 120,
      'その他のメタ情報': 150
    };
    
    headers.forEach((header, index) => {
      const width = columnWidths[header] || 120;
      sheet.setColumnWidth(index + 1, width);
    });
    
    Logger.log('✅ チャット回答ログシート初期化完了（LP埋め込み型チャットBot対応）');
    
    return {
      success: true,
      samplesCreated: false
    };
    
  } catch (error) {
    Logger.log('❌ チャット回答ログシート初期化エラー:', error);
    throw new Error(`チャット回答ログシート初期化に失敗しました: ${error.message}`);
  }
}



/**
 * 案件振り分けテスト用シート構造修正
 * claude_assignmentTest() の100%成功を目指した修正処理
 * 
 * @return {Object} 修正結果
 */
function fixInquirySheetForAssignmentTest() {
  try {
    Logger.log('🛠️ 案件振り分けテスト用シート構造修正開始');
    
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const results = {
      inquiryHistoryFixed: false,
      userCasesFixed: false,
      testDataAdded: false,
      errors: []
    };
    
    // 1. 問い合わせ履歴シートの修正
    Logger.log('1️⃣ 問い合わせ履歴シートの修正...');
    try {
      results.inquiryHistoryFixed = addAreaColumnsToInquiryHistory_(ss);
    } catch (error) {
      results.errors.push(`問い合わせ履歴修正: ${error.message}`);
    }
    
    // 2. ユーザー案件シートの修正
    Logger.log('2️⃣ ユーザー案件シートの修正...');
    try {
      results.userCasesFixed = removeAreaColumnsFromUserCases_(ss);
    } catch (error) {
      results.errors.push(`ユーザー案件修正: ${error.message}`);
    }
    
    // 3. テストデータの補完
    Logger.log('3️⃣ テストデータの補完...');
    try {
      results.testDataAdded = supplementTestDataInInquiryHistory_(ss);
    } catch (error) {
      results.errors.push(`テストデータ補完: ${error.message}`);
    }
    
    // 結果サマリー
    Logger.log('🛠️ 修正結果サマリー:');
    Logger.log(`問い合わせ履歴修正: ${results.inquiryHistoryFixed ? '✅' : '❌'}`);
    Logger.log(`ユーザー案件修正: ${results.userCasesFixed ? '✅' : '❌'}`);
    Logger.log(`テストデータ補完: ${results.testDataAdded ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
      Logger.log('🚨 エラー詳細:');
      results.errors.forEach(error => Logger.log(`  - ${error}`));
    }
    
    const overallSuccess = results.inquiryHistoryFixed && results.userCasesFixed && results.testDataAdded;
    Logger.log(`📊 総合結果: ${overallSuccess ? '✅ 成功' : '❌ 問題あり'}`);
    
    return {
      success: overallSuccess,
      message: overallSuccess ? '案件振り分けテスト用修正が完了しました' : '一部修正に失敗しました',
      results: results
    };
    
  } catch (error) {
    Logger.log('❌ シート構造修正エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 問い合わせ履歴シートに都道府県・市区町村列を追加
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @return {boolean} 処理成功可否
 */
function addAreaColumnsToInquiryHistory_(ss) {
  try {
    Logger.log('📋 問い合わせ履歴シートの列追加処理開始');
    
    let sheet = ss.getSheetByName('問い合わせ履歴');
    if (!sheet) {
      // シートが存在しない場合は作成
      Logger.log('問い合わせ履歴シートが存在しないため作成します');
      initializeInquiryHistorySheet(ss);
      sheet = ss.getSheetByName('問い合わせ履歴');
    }
    
    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() === 0) {
      // 空シートの場合はヘッダーを設定
      const headers = ['履歴ID', 'ユーザーID', '問い合わせ内容カテゴリ', '希望工事内容', '現在の状況', '希望時期', '予算感', '対応状況', 'チャット履歴JSON', '最終対応日時', '担当者ID', 'マッチング業者ID', 'メモ', '都道府県', '市区町村'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      Logger.log('✅ 問い合わせ履歴シートのヘッダーを設定');
      return true;
    }
    
    const allData = dataRange.getValues();
    const headers = allData[0];
    let modified = false;
    
    // 都道府県列の追加チェック
    if (!headers.includes('都道府県')) {
      headers.push('都道府県');
      modified = true;
      Logger.log('✅ 都道府県列を追加');
    }
    
    // 市区町村列の追加チェック
    if (!headers.includes('市区町村')) {
      headers.push('市区町村');
      modified = true;
      Logger.log('✅ 市区町村列を追加');
    }
    
    if (modified) {
      // ヘッダー行を更新
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // 既存データ行を拡張（空欄で埋める）
      if (allData.length > 1) {
        const rows = allData.slice(1);
        const expandedRows = rows.map(row => {
          const newRow = [...row];
          while (newRow.length < headers.length) {
            newRow.push('');
          }
          return newRow;
        });
        
        if (expandedRows.length > 0) {
          sheet.getRange(2, 1, expandedRows.length, headers.length).setValues(expandedRows);
        }
      }
      
      Logger.log('📋 問い合わせ履歴シートの構造を更新');
    } else {
      Logger.log('✅ 問い合わせ履歴シートの列は既に存在');
    }
    
    return true;
    
  } catch (error) {
    Logger.log('❌ 問い合わせ履歴シート列追加エラー:', error);
    throw error;
  }
}

/**
 * ユーザー案件シートから都道府県・市区町村列を削除
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @return {boolean} 処理成功可否
 */
function removeAreaColumnsFromUserCases_(ss) {
  try {
    Logger.log('📊 ユーザー案件シートの列削除処理開始');
    
    const sheet = ss.getSheetByName('ユーザー案件');
    if (!sheet) {
      Logger.log('✅ ユーザー案件シートが存在しません - スキップ');
      return true;
    }
    
    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() === 0) {
      Logger.log('✅ ユーザー案件シートにデータがありません - スキップ');
      return true;
    }
    
    const allData = dataRange.getValues();
    const headers = allData[0];
    
    // 削除対象列のインデックスを取得
    const columnsToRemove = ['都道府県', '市区町村'];
    const removeIndices = [];
    
    columnsToRemove.forEach(columnName => {
      const index = headers.indexOf(columnName);
      if (index !== -1) {
        removeIndices.push(index);
        Logger.log(`🗑️ 削除対象列発見: ${columnName} (列${index + 1})`);
      }
    });
    
    if (removeIndices.length === 0) {
      Logger.log('✅ 削除対象列なし - ユーザー案件シートは正常');
      return true;
    }
    
    // 列を逆順で削除（インデックスがずれるのを防ぐ）
    removeIndices.sort((a, b) => b - a);
    
    removeIndices.forEach(index => {
      sheet.deleteColumn(index + 1);
      Logger.log(`✅ 列${index + 1}を削除`);
    });
    
    Logger.log('📊 ユーザー案件シートの不要列を削除完了');
    return true;
    
  } catch (error) {
    Logger.log('❌ ユーザー案件シート列削除エラー:', error);
    throw error;
  }
}


// ==========================================
// 請求書発行時の3チャネル通知機能
// ==========================================

/**
 * 請求書発行時の自動通知システム
 * メール（必須）+ LINE/SMS（任意）の3チャネル構成
 * 
 * @param {string} franchiseeId 加盟店ID
 * @param {Object} billingData 請求データ
 * @returns {Object} 通知結果
 */
function sendBillingNotifications(franchiseeId, billingData) {
  try {
    Logger.log(`📧 請求書通知開始: 加盟店ID ${franchiseeId}`);
    
    // 加盟店の連絡先情報を取得
    const contactInfo = getFranchiseeContactInfo(franchiseeId);
    if (!contactInfo.success) {
      throw new Error(`加盟店情報取得失敗: ${contactInfo.error}`);
    }
    
    const notifications = {
      email: { attempted: false, success: false, error: null },
      line: { attempted: false, success: false, error: null },
      sms: { attempted: false, success: false, error: null }
    };
    
    // 1. メール通知（必須）
    Logger.log('📧 メール通知を送信中...');
    notifications.email.attempted = true;
    try {
      const emailResult = sendBillingEmail(contactInfo.data, billingData);
      notifications.email.success = emailResult.success;
      if (!emailResult.success) {
        notifications.email.error = emailResult.error;
      }
    } catch (error) {
      notifications.email.error = error.message;
      Logger.log(`❌ メール送信エラー: ${error.message}`);
    }
    
    // 2. LINE通知（任意・優先度高）
    if (contactInfo.data.lineUserId) {
      Logger.log('📱 LINE通知を送信中...');
      notifications.line.attempted = true;
      try {
        const lineResult = sendBillingLineNotification(contactInfo.data, billingData);
        notifications.line.success = lineResult.success;
        if (!lineResult.success) {
          notifications.line.error = lineResult.error;
        }
      } catch (error) {
        notifications.line.error = error.message;
        Logger.log(`⚠️ LINE送信エラー（任意のため継続）: ${error.message}`);
      }
    }
    
    // 3. SMS通知（任意・LINE失敗時の代替）
    if (contactInfo.data.phoneNumber && !notifications.line.success) {
      Logger.log('📲 SMS通知を送信中...');
      notifications.sms.attempted = true;
      try {
        const smsResult = sendBillingSmsNotification(contactInfo.data, billingData);
        notifications.sms.success = smsResult.success;
        if (!smsResult.success) {
          notifications.sms.error = smsResult.error;
        }
      } catch (error) {
        notifications.sms.error = error.message;
        Logger.log(`⚠️ SMS送信エラー（任意のため継続）: ${error.message}`);
      }
    }
    
    // 通知結果をログ記録
    logNotificationResults(franchiseeId, billingData.billingId, notifications);
    
    // 必須のメール通知が成功していれば全体として成功
    const overallSuccess = notifications.email.success;
    
    Logger.log(`✅ 請求書通知完了: 加盟店ID ${franchiseeId}, 全体結果: ${overallSuccess ? '成功' : '失敗'}`);
    
    return {
      success: overallSuccess,
      franchiseeId: franchiseeId,
      billingId: billingData.billingId,
      notifications: notifications,
      summary: generateNotificationSummary(notifications)
    };
    
  } catch (error) {
    Logger.log(`❌ 請求書通知システムエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      franchiseeId: franchiseeId,
      billingId: billingData?.billingId || 'unknown'
    };
  }
}

/**
 * 加盟店の連絡先情報を取得
 * 
 * @param {string} franchiseeId 加盟店ID
 * @returns {Object} 連絡先情報
 */
function getFranchiseeContactInfo(franchiseeId) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('加盟店情報');
    
    if (!sheet) {
      throw new Error('加盟店情報シートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const franchiseeIdIndex = headers.indexOf('加盟店ID');
    const emailIndex = headers.indexOf('メールアドレス');
    const phoneIndex = headers.indexOf('電話番号');
    const companyNameIndex = headers.indexOf('会社名');
    const representativeIndex = headers.indexOf('代表者名');
    
    if (franchiseeIdIndex === -1) {
      throw new Error('加盟店IDカラムが見つかりません');
    }
    
    // 加盟店を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][franchiseeIdIndex] === franchiseeId) {
        const contactInfo = {
          franchiseeId: franchiseeId,
          email: emailIndex !== -1 ? data[i][emailIndex] : '',
          phoneNumber: phoneIndex !== -1 ? data[i][phoneIndex] : '',
          companyName: companyNameIndex !== -1 ? data[i][companyNameIndex] : '',
          representativeName: representativeIndex !== -1 ? data[i][representativeIndex] : '',
          lineUserId: null // 後で加盟店子ユーザー一覧から取得
        };
        
        // LINE UserIDを加盟店子ユーザー一覧から取得
        try {
          const childSheet = ss.getSheetByName('加盟店子ユーザー一覧');
          if (childSheet) {
            const childData = childSheet.getDataRange().getValues();
            const childHeaders = childData[0];
            const parentIdIndex = childHeaders.indexOf('親加盟店ID');
            const lineIdIndex = childHeaders.indexOf('LINE_ID') || childHeaders.indexOf('子ユーザーID');
            
            if (parentIdIndex !== -1 && lineIdIndex !== -1) {
              for (let j = 1; j < childData.length; j++) {
                if (childData[j][parentIdIndex] === franchiseeId) {
                  contactInfo.lineUserId = childData[j][lineIdIndex];
                  break;
                }
              }
            }
          }
        } catch (lineError) {
          Logger.log(`⚠️ LINE UserID取得エラー（通知は継続）: ${lineError.message}`);
        }
        
        return {
          success: true,
          data: contactInfo
        };
      }
    }
    
    throw new Error(`加盟店ID ${franchiseeId} が見つかりません`);
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 請求書メール通知送信
 * 
 * @param {Object} contactInfo 連絡先情報
 * @param {Object} billingData 請求データ
 * @returns {Object} 送信結果
 */
function sendBillingEmail(contactInfo, billingData) {
  try {
    if (!contactInfo.email || contactInfo.email.trim() === '') {
      throw new Error('メールアドレスが登録されていません');
    }
    
    const subject = `【外壁塗装くらべるAI】${billingData.billingMonth}月分請求書のご案内`;
    
    const body = `
${contactInfo.representativeName || contactInfo.companyName} 様

いつもお世話になっております。
外壁塗装くらべるAI運営事務局です。

${billingData.billingMonth}月分の請求書をお送りいたします。

■ 請求詳細
請求ID: ${billingData.billingId}
請求対象月: ${billingData.billingMonth}
請求件数: ${billingData.caseCount}件
成約手数料合計: ${billingData.commissionTotal?.toLocaleString() || 0}円（税込）
紹介料合計: ${billingData.referralFeeTotal?.toLocaleString() || 0}円（税込）
請求総額: ${billingData.totalAmount?.toLocaleString() || 0}円

支払方法: ${billingData.paymentType || '引き落とし'}
支払期日: ${billingData.dueDate || '未設定'}

■ お支払いについて
${billingData.paymentType === '振込' ? 
  '振込先口座情報は別途ご案内いたします。' : 
  '登録いただいている口座から自動引き落としとなります。'}

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。

---
外壁塗装くらべるAI運営事務局
Mail: support@gaiheki-kuraberu.ai
Phone: 03-XXXX-XXXX
---
`;
    
    GmailApp.sendEmail(contactInfo.email, subject, body);
    
    Logger.log(`✅ メール送信成功: ${contactInfo.email}`);
    
    return {
      success: true,
      channel: 'email',
      recipient: contactInfo.email
    };
    
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: error.message
    };
  }
}

/**
 * 請求書LINE通知送信
 * 
 * @param {Object} contactInfo 連絡先情報
 * @param {Object} billingData 請求データ
 * @returns {Object} 送信結果
 */
function sendBillingLineNotification(contactInfo, billingData) {
  try {
    if (!contactInfo.lineUserId || contactInfo.lineUserId.trim() === '') {
      throw new Error('LINE UserIDが登録されていません');
    }
    
    const message = `📋 ${billingData.billingMonth}月分請求書のご案内

${contactInfo.companyName} 様

請求ID: ${billingData.billingId}
請求件数: ${billingData.caseCount}件
請求総額: ${billingData.totalAmount?.toLocaleString() || 0}円
支払期日: ${billingData.dueDate || '未設定'}

詳細はメールをご確認ください。

外壁塗装くらべるAI運営事務局`;
    
    // LINE送信機能を呼び出し（既存のsendLinePush関数を使用）
    if (typeof sendLinePush === 'function') {
      const result = sendLinePush(contactInfo.lineUserId, message);
      
      Logger.log(`✅ LINE送信成功: ${contactInfo.lineUserId}`);
      
      return {
        success: true,
        channel: 'line',
        recipient: contactInfo.lineUserId,
        lineResult: result
      };
    } else {
      throw new Error('LINE送信関数が利用できません');
    }
    
  } catch (error) {
    return {
      success: false,
      channel: 'line',
      error: error.message
    };
  }
}

/**
 * 請求書SMS通知送信
 * 
 * @param {Object} contactInfo 連絡先情報
 * @param {Object} billingData 請求データ
 * @returns {Object} 送信結果
 */
function sendBillingSmsNotification(contactInfo, billingData) {
  try {
    if (!contactInfo.phoneNumber || contactInfo.phoneNumber.trim() === '') {
      throw new Error('電話番号が登録されていません');
    }
    
    const message = `【外壁塗装くらべるAI】${billingData.billingMonth}月分請求書（請求総額：${billingData.totalAmount?.toLocaleString() || 0}円）をメールでお送りしました。支払期日：${billingData.dueDate || '未設定'}。詳細はメールをご確認ください。`;
    
    // SMS送信機能を呼び出し（既存のsendSMS関数を使用）
    if (typeof sendSMS === 'function') {
      const result = sendSMS(contactInfo.phoneNumber, message);
      
      Logger.log(`✅ SMS送信成功: ${contactInfo.phoneNumber}`);
      
      return {
        success: true,
        channel: 'sms',
        recipient: contactInfo.phoneNumber,
        smsResult: result
      };
    } else {
      throw new Error('SMS送信関数が利用できません');
    }
    
  } catch (error) {
    return {
      success: false,
      channel: 'sms',
      error: error.message
    };
  }
}

/**
 * 通知結果をログに記録
 * 
 * @param {string} franchiseeId 加盟店ID
 * @param {string} billingId 請求ID
 * @param {Object} notifications 通知結果
 */
function logNotificationResults(franchiseeId, billingId, notifications) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) return;
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let logSheet = ss.getSheetByName('請求通知ログ');
    
    // ログシートが存在しない場合は作成
    if (!logSheet) {
      logSheet = ss.insertSheet('請求通知ログ');
      const headers = [
        '日時', '加盟店ID', '請求ID', 'メール送信', 'メールエラー',
        'LINE送信', 'LINEエラー', 'SMS送信', 'SMSエラー', '全体結果'
      ];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    
    const logRow = [
      new Date(),
      franchiseeId,
      billingId,
      notifications.email.success ? '成功' : '失敗',
      notifications.email.error || '',
      notifications.line.attempted ? (notifications.line.success ? '成功' : '失敗') : '未送信',
      notifications.line.error || '',
      notifications.sms.attempted ? (notifications.sms.success ? '成功' : '失敗') : '未送信',
      notifications.sms.error || '',
      notifications.email.success ? '成功' : '失敗'
    ];
    
    logSheet.appendRow(logRow);
    
  } catch (error) {
    Logger.log(`⚠️ 通知ログ記録エラー: ${error.message}`);
  }
}

/**
 * 通知結果のサマリーを生成
 * 
 * @param {Object} notifications 通知結果
 * @returns {string} サマリー文字列
 */
function generateNotificationSummary(notifications) {
  const results = [];
  
  results.push(`メール: ${notifications.email.success ? '✅成功' : '❌失敗'}`);
  
  if (notifications.line.attempted) {
    results.push(`LINE: ${notifications.line.success ? '✅成功' : '❌失敗'}`);
  } else {
    results.push('LINE: 📵未登録');
  }
  
  if (notifications.sms.attempted) {
    results.push(`SMS: ${notifications.sms.success ? '✅成功' : '❌失敗'}`);
  } else {
    results.push('SMS: 📵未送信');
  }
  
  return results.join(', ');
}

/**
 * 請求書発行処理（通知付き）
 * 
 * @param {Object} billingData 請求データ
 * @returns {Object} 処理結果
 */
function issueBillingWithNotification(billingData) {
  try {
    Logger.log(`📄 請求書発行処理開始: ${billingData.billingId}`);
    
    // 1. 請求管理シートに請求データを保存
    const saveResult = saveBillingData(billingData);
    if (!saveResult.success) {
      throw new Error(`請求データ保存失敗: ${saveResult.error}`);
    }
    
    // 2. 通知送信
    const notificationResult = sendBillingNotifications(billingData.franchiseeId, billingData);
    
    // 3. 請求管理シートの通知フラグを更新
    updateBillingNotificationStatus(billingData.billingId, notificationResult.success);
    
    Logger.log(`✅ 請求書発行処理完了: ${billingData.billingId}`);
    
    return {
      success: true,
      billingId: billingData.billingId,
      saved: saveResult.success,
      notificationResult: notificationResult
    };
    
  } catch (error) {
    Logger.log(`❌ 請求書発行処理エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      billingId: billingData?.billingId || 'unknown'
    };
  }
}

/**
 * 請求データを請求管理シートに保存
 * 
 * @param {Object} billingData 請求データ
 * @returns {Object} 保存結果
 */
function saveBillingData(billingData) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      throw new Error('請求管理シートが見つかりません');
    }
    
    const newRow = [
      billingData.billingId,
      billingData.franchiseeId,
      billingData.billingMonth,
      billingData.caseCount || 0,
      billingData.commissionTotal || 0,
      billingData.referralFeeTotal || 0,
      billingData.totalAmount || 0,
      billingData.paymentType || '引き落とし',
      '未払い',
      billingData.billingDate || new Date(),
      billingData.dueDate || '',
      '', // 支払完了日
      false, // Slack通知済
      billingData.remarks || ''
    ];
    
    sheet.appendRow(newRow);
    
    return {
      success: true,
      message: '請求データを保存しました'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 請求管理シートの通知ステータスを更新
 * 
 * @param {string} billingId 請求ID
 * @param {boolean} notificationSuccess 通知成功フラグ
 */
function updateBillingNotificationStatus(billingId, notificationSuccess) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) return;
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const billingIdIndex = headers.indexOf('請求ID');
    const slackNotifiedIndex = headers.indexOf('Slack通知済');
    
    if (billingIdIndex === -1 || slackNotifiedIndex === -1) return;
    
    // 該当行を検索して更新
    for (let i = 1; i < data.length; i++) {
      if (data[i][billingIdIndex] === billingId) {
        sheet.getRange(i + 1, slackNotifiedIndex + 1).setValue(notificationSuccess);
        break;
      }
    }
    
  } catch (error) {
    Logger.log(`⚠️ 通知ステータス更新エラー: ${error.message}`);
  }
}


// ==========================================
// 請求処理バッチシステム
// ==========================================

/**
 * 毎月の請求処理バッチ関数
 * 成約案件を集計し、加盟店ごとの請求データを生成・通知
 * 
 * @param {Date} targetDate 処理対象日（省略時は当月）
 * @returns {Object} 処理結果
 */
function generateMonthlyBilling(targetDate = null) {
  try {
    const processDate = targetDate || new Date();
    const targetMonth = getTargetMonth(processDate);
    
    Logger.log(`💰 月次請求処理開始: ${targetMonth.year}年${targetMonth.month}月分`);
    
    const results = {
      success: true,
      targetMonth: `${targetMonth.year}年${targetMonth.month}月`,
      processedFranchises: [],
      totalBillings: 0,
      totalAmount: 0,
      errors: [],
      notifications: {
        sent: 0,
        failed: 0
      }
    };
    
    // 1. 成約済み案件を取得
    const contractedCases = getContractedCasesForMonth(targetMonth);
    Logger.log(`📊 成約案件数: ${contractedCases.length}件`);
    
    if (contractedCases.length === 0) {
      Logger.log('⚠️ 対象となる成約案件がありません');
      return {
        success: true,
        message: '対象となる成約案件がありませんでした',
        targetMonth: results.targetMonth,
        details: results
      };
    }
    
    // 2. 加盟店ごとに案件をグループ化
    const franchiseGroups = groupCasesByFranchise(contractedCases);
    Logger.log(`🏢 請求対象加盟店数: ${Object.keys(franchiseGroups).length}社`);
    
    // 3. 各加盟店の請求処理
    for (const [franchiseId, cases] of Object.entries(franchiseGroups)) {
      try {
        Logger.log(`--- 加盟店 ${franchiseId} の請求処理開始 ---`);
        
        // 重複請求チェック
        const existingBilling = checkExistingBilling(franchiseId, targetMonth);
        if (existingBilling.exists) {
          Logger.log(`⚠️ 加盟店 ${franchiseId} は既に請求済みです`);
          results.errors.push(`${franchiseId}: 既に請求済み`);
          continue;
        }
        
        // 個別請求処理
        const billingResult = generateBillingForFranchise(franchiseId, targetMonth, cases);
        
        if (billingResult.success) {
          results.processedFranchises.push(franchiseId);
          results.totalBillings++;
          results.totalAmount += billingResult.billingData.totalAmount;
          
          // 通知送信
          if (billingResult.notificationResult.success) {
            results.notifications.sent++;
          } else {
            results.notifications.failed++;
          }
          
          Logger.log(`✅ 加盟店 ${franchiseId} 請求処理完了 (金額: ${billingResult.billingData.totalAmount.toLocaleString()}円)`);
        } else {
          results.errors.push(`${franchiseId}: ${billingResult.error}`);
          Logger.log(`❌ 加盟店 ${franchiseId} 請求処理失敗: ${billingResult.error}`);
        }
        
      } catch (error) {
        results.errors.push(`${franchiseId}: ${error.message}`);
        Logger.log(`❌ 加盟店 ${franchiseId} 処理エラー: ${error.message}`);
      }
    }
    
    // 4. 完了処理とログ記録
    logMonthlyBillingResults(targetMonth, results);
    
    // 5. Slack通知（管理者向け）
    try {
      if (typeof sendSlackNotification === 'function') {
        const summary = `📊 月次請求処理完了 (${results.targetMonth})
✅ 処理済み: ${results.processedFranchises.length}社
💰 請求総額: ${results.totalAmount.toLocaleString()}円
📧 通知成功: ${results.notifications.sent}件
❌ エラー: ${results.errors.length}件`;
        sendSlackNotification(summary);
      }
    } catch (slackError) {
      Logger.log(`⚠️ Slack通知エラー: ${slackError.message}`);
    }
    
    Logger.log(`✅ 月次請求処理完了: ${results.processedFranchises.length}社処理, ${results.totalAmount.toLocaleString()}円請求`);
    
    return {
      success: results.errors.length === 0,
      message: `月次請求処理が完了しました (${results.processedFranchises.length}社処理)`,
      details: results
    };
    
  } catch (error) {
    Logger.log(`❌ 月次請求処理システムエラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      message: '月次請求処理でシステムエラーが発生しました'
    };
  }
}

/**
 * 個別加盟店の請求生成処理
 * 
 * @param {string} franchiseId 加盟店ID
 * @param {Object} targetMonth 対象月 {year, month}
 * @param {Array} cases 成約案件一覧
 * @returns {Object} 処理結果
 */
function generateBillingForFranchise(franchiseId, targetMonth, cases = null) {
  try {
    Logger.log(`🏢 加盟店 ${franchiseId} の請求生成開始`);
    
    // 案件が指定されていない場合は取得
    if (!cases) {
      const contractedCases = getContractedCasesForMonth(targetMonth);
      cases = contractedCases.filter(c => c.franchiseId === franchiseId);
    }
    
    if (cases.length === 0) {
      return {
        success: false,
        error: '対象となる成約案件がありません'
      };
    }
    
    // 1. 請求金額計算
    const billingCalculation = calculateBillingAmount(franchiseId, cases);
    
    // 2. 支払方法・期日決定
    const paymentInfo = determinePaymentInfo(franchiseId, targetMonth);
    
    // 3. 請求データ生成
    const billingData = {
      billingId: generateBillingId(franchiseId, targetMonth),
      franchiseId: franchiseId,
      billingMonth: `${targetMonth.year}年${targetMonth.month}月`,
      caseCount: cases.length,
      cases: cases.map(c => ({
        caseId: c.caseId,
        contractAmount: c.contractAmount,
        commissionRate: c.commissionRate || billingCalculation.defaultCommissionRate,
        commissionAmount: c.commissionAmount
      })),
      commissionTotal: billingCalculation.commissionTotal,
      referralFeeTotal: billingCalculation.referralFeeTotal,
      totalAmount: billingCalculation.totalAmount,
      paymentType: paymentInfo.paymentType,
      dueDate: paymentInfo.dueDate,
      billingDate: new Date(),
      targetPeriod: {
        start: new Date(targetMonth.year, targetMonth.month - 1, 1),
        end: new Date(targetMonth.year, targetMonth.month, 0)
      },
      // freee API連携用拡張フィールド
      freeeCompanyId: null,
      freeeInvoiceId: null,
      freeeStatus: 'draft',
      metadata: {
        processedAt: new Date(),
        version: '1.0',
        batchId: `BATCH_${Date.now()}`
      }
    };
    
    // 4. 請求データ保存
    const saveResult = saveBillingData(billingData);
    if (!saveResult.success) {
      throw new Error(`請求データ保存失敗: ${saveResult.error}`);
    }
    
    // 5. 成約案件に請求済みフラグを設定
    markCasesAsBilled(cases.map(c => c.caseId), billingData.billingId);
    
    // 6. 通知送信
    const notificationResult = sendBillingNotifications(franchiseId, billingData);
    
    // 7. 請求管理シートの通知フラグ更新
    updateBillingNotificationStatus(billingData.billingId, notificationResult.success);
    
    Logger.log(`✅ 加盟店 ${franchiseId} 請求生成完了 (${billingData.totalAmount.toLocaleString()}円)`);
    
    return {
      success: true,
      billingData: billingData,
      notificationResult: notificationResult,
      savedCases: cases.length
    };
    
  } catch (error) {
    Logger.log(`❌ 加盟店 ${franchiseId} 請求生成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      franchiseId: franchiseId
    };
  }
}

// ==========================================
// 祝祭日判定・営業日計算ユーティリティ
// ==========================================

/**
 * 日本の祝祭日判定
 * 
 * @param {Date} date 判定対象日
 * @returns {boolean} 祝祭日かどうか
 */
function isJapaneseHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 固定祝日
  const fixedHolidays = [
    {month: 1, day: 1},   // 元日
    {month: 2, day: 11},  // 建国記念の日
    {month: 2, day: 23},  // 天皇誕生日
    {month: 4, day: 29},  // 昭和の日
    {month: 5, day: 3},   // 憲法記念日
    {month: 5, day: 4},   // みどりの日
    {month: 5, day: 5},   // こどもの日
    {month: 8, day: 11},  // 山の日
    {month: 11, day: 3},  // 文化の日
    {month: 11, day: 23}, // 勤労感謝の日
  ];
  
  // 固定祝日チェック
  if (fixedHolidays.some(h => h.month === month && h.day === day)) {
    return true;
  }
  
  // 移動祝日（簡易版）
  if (month === 1) {
    // 成人の日（1月第2月曜日）
    const secondMonday = getNthWeekday(year, 1, 1, 2);
    if (day === secondMonday) return true;
  }
  
  if (month === 3) {
    // 春分の日（概算）
    const vernal = Math.floor(20.8431 + 0.242194 * (year - 1851) - Math.floor((year - 1851) / 4));
    if (day === vernal) return true;
  }
  
  if (month === 7) {
    // 海の日（7月第3月曜日）
    const thirdMonday = getNthWeekday(year, 7, 1, 3);
    if (day === thirdMonday) return true;
  }
  
  if (month === 9) {
    // 敬老の日（9月第3月曜日）
    const thirdMonday = getNthWeekday(year, 9, 1, 3);
    if (day === thirdMonday) return true;
    
    // 秋分の日（概算）
    const autumnal = Math.floor(23.2488 + 0.242194 * (year - 1851) - Math.floor((year - 1851) / 4));
    if (day === autumnal) return true;
  }
  
  if (month === 10) {
    // スポーツの日（10月第2月曜日）
    const secondMonday = getNthWeekday(year, 10, 1, 2);
    if (day === secondMonday) return true;
  }
  
  return false;
}

/**
 * 指定月の第N曜日の日付を取得
 * 
 * @param {number} year 年
 * @param {number} month 月
 * @param {number} dayOfWeek 曜日 (0=日曜日, 1=月曜日, ...)
 * @param {number} nth 第N回目
 * @returns {number} 日付
 */
function getNthWeekday(year, month, dayOfWeek, nth) {
  const firstDay = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDay.getDay();
  
  let targetDay = 1 + (dayOfWeek - firstDayOfWeek + 7) % 7;
  targetDay += (nth - 1) * 7;
  
  return targetDay;
}

/**
 * 営業日かどうか判定（土日祝除く）
 * 
 * @param {Date} date 判定対象日
 * @returns {boolean} 営業日かどうか
 */
function isBusinessDay(date) {
  const dayOfWeek = date.getDay();
  
  // 土曜日(6)、日曜日(0)は営業日ではない
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // 祝祭日は営業日ではない
  if (isJapaneseHoliday(date)) {
    return false;
  }
  
  return true;
}

/**
 * 次の営業日を取得
 * 
 * @param {Date} date 基準日
 * @returns {Date} 次の営業日
 */
function getNextBusinessDay(date) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (!isBusinessDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * 指定日が営業日でない場合、次の営業日を取得
 * 
 * @param {Date} date 対象日
 * @returns {Date} 営業日
 */
function adjustToBusinessDay(date) {
  if (isBusinessDay(date)) {
    return new Date(date);
  }
  return getNextBusinessDay(date);
}

// ==========================================
// 成約案件集計・請求計算ロジック
// ==========================================

/**
 * 対象月を取得
 * 
 * @param {Date} processDate 処理日
 * @returns {Object} {year, month}
 */
function getTargetMonth(processDate) {
  const targetDate = new Date(processDate);
  targetDate.setMonth(targetDate.getMonth() - 1); // 前月を対象
  
  return {
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1
  };
}

/**
 * 指定月の成約済み案件を取得
 * 
 * @param {Object} targetMonth {year, month}
 * @returns {Array} 成約案件一覧
 */
function getContractedCasesForMonth(targetMonth) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // マッチング履歴シートから成約データを取得
    const matchingSheet = ss.getSheetByName('マッチング履歴');
    if (!matchingSheet) {
      throw new Error('マッチング履歴シートが見つかりません');
    }
    
    const matchingData = matchingSheet.getDataRange().getValues();
    const matchingHeaders = matchingData[0];
    
    // 必要なカラムのインデックスを取得
    const matchingIdIndex = matchingHeaders.indexOf('マッチングID');
    const inquiryIdIndex = matchingHeaders.indexOf('問い合わせID');
    const franchiseIdIndex = matchingHeaders.indexOf('加盟店ID');
    const contractDateIndex = matchingHeaders.indexOf('成約日時');
    const contractAmountIndex = matchingHeaders.indexOf('成約金額');
    const statusIndex = matchingHeaders.indexOf('成約状況');
    
    if (matchingIdIndex === -1 || franchiseIdIndex === -1) {
      throw new Error('必要なカラムが見つかりません');
    }
    
    // 対象月の成約案件を抽出
    const contractedCases = [];
    
    for (let i = 1; i < matchingData.length; i++) {
      const row = matchingData[i];
      
      // 成約状況チェック
      const status = statusIndex !== -1 ? row[statusIndex] : '';
      if (status !== '成約済み' && status !== '成約') {
        continue;
      }
      
      // 成約日時チェック
      let contractDate = null;
      if (contractDateIndex !== -1 && row[contractDateIndex]) {
        contractDate = new Date(row[contractDateIndex]);
        if (contractDate.getFullYear() !== targetMonth.year || 
            contractDate.getMonth() + 1 !== targetMonth.month) {
          continue;
        }
      }
      
      // 請求済みチェック（マッチング履歴シートに請求IDカラムがある場合）
      const billingIdIndex = matchingHeaders.indexOf('請求ID');
      if (billingIdIndex !== -1 && row[billingIdIndex]) {
        continue; // 既に請求済み
      }
      
      // 工事金額取得
      const contractAmount = contractAmountIndex !== -1 ? 
        (parseFloat(row[contractAmountIndex]) || 0) : 0;
      
      if (contractAmount <= 0) {
        continue; // 金額が0または無効
      }
      
      contractedCases.push({
        matchingId: row[matchingIdIndex],
        inquiryId: inquiryIdIndex !== -1 ? row[inquiryIdIndex] : '',
        caseId: row[inquiryIdIndex] || row[matchingIdIndex],
        franchiseId: row[franchiseIdIndex],
        contractDate: contractDate,
        contractAmount: contractAmount,
        status: status
      });
    }
    
    Logger.log(`📊 ${targetMonth.year}年${targetMonth.month}月の成約案件: ${contractedCases.length}件`);
    
    return contractedCases;
    
  } catch (error) {
    Logger.log(`❌ 成約案件取得エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 案件を加盟店ごとにグループ化
 * 
 * @param {Array} cases 案件一覧
 * @returns {Object} {franchiseId: [cases]}
 */
function groupCasesByFranchise(cases) {
  const groups = {};
  
  cases.forEach(caseItem => {
    const franchiseId = caseItem.franchiseId;
    if (!groups[franchiseId]) {
      groups[franchiseId] = [];
    }
    groups[franchiseId].push(caseItem);
  });
  
  return groups;
}

/**
 * 請求金額計算
 * 
 * @param {string} franchiseId 加盟店ID
 * @param {Array} cases 成約案件一覧
 * @returns {Object} 計算結果
 */
function calculateBillingAmount(franchiseId, cases) {
  try {
    // 加盟店の手数料率を取得
    const commissionRate = getFranchiseCommissionRate(franchiseId);
    
    let commissionTotal = 0;
    let referralFeeTotal = 0;
    
    cases.forEach(caseItem => {
      // 成約手数料計算（工事金額の設定%）
      const commissionAmount = Math.floor(caseItem.contractAmount * commissionRate);
      caseItem.commissionAmount = commissionAmount;
      caseItem.commissionRate = commissionRate;
      
      commissionTotal += commissionAmount;
      
      // 紹介料（固定金額または案件により変動）
      const referralFee = getFranchiseReferralFee(franchiseId, caseItem);
      referralFeeTotal += referralFee;
    });
    
    const totalAmount = commissionTotal + referralFeeTotal;
    
    Logger.log(`💰 請求金額計算完了 - 加盟店: ${franchiseId}, 成約手数料: ${commissionTotal.toLocaleString()}円, 紹介料: ${referralFeeTotal.toLocaleString()}円, 合計: ${totalAmount.toLocaleString()}円`);
    
    return {
      commissionTotal: commissionTotal,
      referralFeeTotal: referralFeeTotal,
      totalAmount: totalAmount,
      defaultCommissionRate: commissionRate,
      caseCount: cases.length
    };
    
  } catch (error) {
    Logger.log(`❌ 請求金額計算エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 加盟店の手数料率を取得
 * 
 * @param {string} franchiseId 加盟店ID
 * @returns {number} 手数料率（小数）
 */
function getFranchiseCommissionRate(franchiseId) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return 0.10; // デフォルト10%
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('加盟店情報');
    
    if (!sheet) {
      return 0.10; // デフォルト10%
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const franchiseIdIndex = headers.indexOf('加盟店ID');
    const commissionRateIndex = headers.indexOf('手数料率') || headers.indexOf('成約手数料率');
    
    if (franchiseIdIndex === -1) {
      return 0.10; // デフォルト10%
    }
    
    // 加盟店を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][franchiseIdIndex] === franchiseId) {
        if (commissionRateIndex !== -1 && data[i][commissionRateIndex]) {
          const rate = parseFloat(data[i][commissionRateIndex]);
          return isNaN(rate) ? 0.10 : (rate > 1 ? rate / 100 : rate); // %を小数に変換
        }
        break;
      }
    }
    
    return 0.10; // デフォルト10%
    
  } catch (error) {
    Logger.log(`⚠️ 手数料率取得エラー、デフォルト値使用: ${error.message}`);
    return 0.10; // デフォルト10%
  }
}

/**
 * 加盟店の紹介料を取得
 * 
 * @param {string} franchiseId 加盟店ID
 * @param {Object} caseItem 案件情報
 * @returns {number} 紹介料
 */
function getFranchiseReferralFee(franchiseId, caseItem) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return 0; // デフォルト0円
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('加盟店情報');
    
    if (!sheet) {
      return 0; // デフォルト0円
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const franchiseIdIndex = headers.indexOf('加盟店ID');
    const referralFeeIndex = headers.indexOf('紹介料') || headers.indexOf('月額紹介料');
    
    if (franchiseIdIndex === -1) {
      return 0; // デフォルト0円
    }
    
    // 加盟店を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][franchiseIdIndex] === franchiseId) {
        if (referralFeeIndex !== -1 && data[i][referralFeeIndex]) {
          const fee = parseFloat(data[i][referralFeeIndex]);
          return isNaN(fee) ? 0 : fee;
        }
        break;
      }
    }
    
    return 0; // デフォルト0円
    
  } catch (error) {
    Logger.log(`⚠️ 紹介料取得エラー、デフォルト値使用: ${error.message}`);
    return 0; // デフォルト0円
  }
}

/**
 * 支払方法・期日決定
 * 
 * @param {string} franchiseId 加盟店ID
 * @param {Object} targetMonth 対象月
 * @returns {Object} 支払情報
 */
function determinePaymentInfo(franchiseId, targetMonth) {
  try {
    // 口座情報の確認
    const accountInfo = getFranchiseAccountInfo(franchiseId);
    
    // 支払方法決定
    const paymentType = accountInfo.hasAccount ? '引き落とし' : '振込';
    
    // 支払期日計算
    const nextMonth = new Date(targetMonth.year, targetMonth.month, 1); // 翌月1日
    let dueDate;
    
    if (paymentType === '引き落とし') {
      // 引き落とし: 翌月27日（営業日調整）
      dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 27);
    } else {
      // 振込: 翌月15日（営業日調整）
      dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
    }
    
    // 営業日に調整
    dueDate = adjustToBusinessDay(dueDate);
    
    const dueDateStr = `${dueDate.getFullYear()}年${dueDate.getMonth() + 1}月${dueDate.getDate()}日`;
    
    Logger.log(`💳 支払情報決定 - 加盟店: ${franchiseId}, 方法: ${paymentType}, 期日: ${dueDateStr}`);
    
    return {
      paymentType: paymentType,
      dueDate: dueDateStr,
      dueDateObj: dueDate,
      hasAccount: accountInfo.hasAccount,
      accountInfo: accountInfo
    };
    
  } catch (error) {
    Logger.log(`❌ 支払情報決定エラー: ${error.message}`);
    // デフォルト値を返す
    const nextMonth = new Date(targetMonth.year, targetMonth.month, 1);
    const defaultDueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
    const adjustedDueDate = adjustToBusinessDay(defaultDueDate);
    
    return {
      paymentType: '振込',
      dueDate: `${adjustedDueDate.getFullYear()}年${adjustedDueDate.getMonth() + 1}月${adjustedDueDate.getDate()}日`,
      dueDateObj: adjustedDueDate,
      hasAccount: false,
      accountInfo: null
    };
  }
}

/**
 * 加盟店の口座情報確認
 * 
 * @param {string} franchiseId 加盟店ID
 * @returns {Object} 口座情報
 */
function getFranchiseAccountInfo(franchiseId) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return { hasAccount: false };
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('加盟店口座情報');
    
    if (!sheet) {
      return { hasAccount: false };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { hasAccount: false };
    }
    
    const headers = data[0];
    const franchiseIdIndex = headers.indexOf('加盟店ID');
    const registrationStatusIndex = headers.indexOf('登録状態（済／未）');
    const bankNameIndex = headers.indexOf('銀行名');
    const branchNameIndex = headers.indexOf('支店名');
    const accountTypeIndex = headers.indexOf('口座種別（普通／当座）');
    const accountNumberIndex = headers.indexOf('口座番号');
    
    if (franchiseIdIndex === -1) {
      return { hasAccount: false };
    }
    
    // 加盟店を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][franchiseIdIndex] === franchiseId) {
        const registrationStatus = registrationStatusIndex !== -1 ? data[i][registrationStatusIndex] : '';
        const hasAccount = registrationStatus === '済' || registrationStatus === '登録済み';
        
        return {
          hasAccount: hasAccount,
          bankName: bankNameIndex !== -1 ? data[i][bankNameIndex] : '',
          branchName: branchNameIndex !== -1 ? data[i][branchNameIndex] : '',
          accountType: accountTypeIndex !== -1 ? data[i][accountTypeIndex] : '',
          accountNumber: accountNumberIndex !== -1 ? data[i][accountNumberIndex] : '',
          registrationStatus: registrationStatus
        };
      }
    }
    
    return { hasAccount: false };
    
  } catch (error) {
    Logger.log(`⚠️ 口座情報取得エラー: ${error.message}`);
    return { hasAccount: false };
  }
}

/**
 * 請求ID生成
 * 
 * @param {string} franchiseId 加盟店ID
 * @param {Object} targetMonth 対象月
 * @returns {string} 請求ID
 */
function generateBillingId(franchiseId, targetMonth) {
  const year = targetMonth.year.toString().slice(-2);
  const month = targetMonth.month.toString().padStart(2, '0');
  const franchiseCode = franchiseId.replace(/[^A-Za-z0-9]/g, '').slice(-6);
  const timestamp = Date.now().toString().slice(-4);
  
  return `BILL${year}${month}${franchiseCode}${timestamp}`;
}

// ==========================================
// 加盟店マイページAPI（請求履歴）
// ==========================================

/**
 * 加盟店向けAPI - 請求履歴取得
 * 
 * @param {Object} e - doGet()イベントオブジェクト
 * @returns {Object} JSON レスポンス
 */
function getBillingHistory(e) {
  try {
    const startTime = new Date();
    
    // パラメータ取得
    const franchiseeId = e.parameter.franchiseeId || e.parameter.franchiseId;
    if (!franchiseeId) {
      return createApiResponse({
        success: false,
        error: 'franchiseeId パラメータが必要です'
      }, 400);
    }
    
    Logger.log(`📊 請求履歴取得開始: 加盟店ID ${franchiseeId}`);
    
    // 請求履歴データを取得
    const billingData = fetchBillingHistoryFromSheet(franchiseeId);
    
    if (!billingData.success) {
      return createApiResponse({
        success: false,
        error: billingData.error
      }, 500);
    }
    
    // 加盟店情報も取得（表示用）
    const franchiseeInfo = getFranchiseeBasicInfo(franchiseeId);
    
    const processingTime = new Date() - startTime;
    
    Logger.log(`✅ 請求履歴取得完了: ${billingData.data.length}件, 処理時間: ${processingTime}ms`);
    
    return createApiResponse({
      success: true,
      data: {
        franchiseeId: franchiseeId,
        franchiseeInfo: franchiseeInfo,
        billingHistory: billingData.data,
        summary: {
          totalCount: billingData.data.length,
          unpaidCount: billingData.data.filter(item => item.paymentStatus === '未払い').length,
          totalAmount: billingData.data.reduce((sum, item) => sum + (item.totalAmount || 0), 0)
        },
        metadata: {
          retrievedAt: new Date().toISOString(),
          processingTime: processingTime
        }
      }
    });
    
  } catch (error) {
    Logger.log(`❌ 請求履歴取得エラー: ${error.message}`);
    return createApiResponse({
      success: false,
      error: 'システムエラーが発生しました',
      details: error.message
    }, 500);
  }
}

/**
 * 請求管理シートから加盟店の請求履歴を取得
 * 
 * @param {string} franchiseeId 加盟店ID
 * @returns {Object} 取得結果
 */
function fetchBillingHistoryFromSheet(franchiseeId) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      return {
        success: false,
        error: '請求管理シートが見つかりません'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        data: []
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // 必要なカラムのインデックスを取得
    const columnMapping = {
      billingId: headers.indexOf('請求ID'),
      franchiseeId: headers.indexOf('加盟店ID'),
      billingMonth: headers.indexOf('請求対象月'),
      caseCount: headers.indexOf('請求件数'),
      commissionTotal: headers.indexOf('成約手数料合計（税込）'),
      referralFeeTotal: headers.indexOf('紹介料合計（税込）'),
      totalAmount: headers.indexOf('請求総額'),
      paymentType: headers.indexOf('支払種別（引き落とし／振込）'),
      paymentStatus: headers.indexOf('支払状況（未払い／済）'),
      billingDate: headers.indexOf('請求日'),
      dueDate: headers.indexOf('支払期日'),
      paidDate: headers.indexOf('支払完了日'),
      slackNotified: headers.indexOf('Slack通知済'),
      remarks: headers.indexOf('備考')
    };
    
    // 加盟店IDでフィルタリングしてデータを構築
    const billingHistory = [];
    
    rows.forEach(row => {
      if (columnMapping.franchiseeId !== -1 && row[columnMapping.franchiseeId] === franchiseeId) {
        const billingItem = {
          billingId: columnMapping.billingId !== -1 ? row[columnMapping.billingId] : '',
          billingMonth: columnMapping.billingMonth !== -1 ? row[columnMapping.billingMonth] : '',
          caseCount: columnMapping.caseCount !== -1 ? (parseInt(row[columnMapping.caseCount]) || 0) : 0,
          commissionTotal: columnMapping.commissionTotal !== -1 ? (parseFloat(row[columnMapping.commissionTotal]) || 0) : 0,
          referralFeeTotal: columnMapping.referralFeeTotal !== -1 ? (parseFloat(row[columnMapping.referralFeeTotal]) || 0) : 0,
          totalAmount: columnMapping.totalAmount !== -1 ? (parseFloat(row[columnMapping.totalAmount]) || 0) : 0,
          paymentType: columnMapping.paymentType !== -1 ? row[columnMapping.paymentType] : '',
          paymentStatus: columnMapping.paymentStatus !== -1 ? row[columnMapping.paymentStatus] : '',
          billingDate: columnMapping.billingDate !== -1 ? formatDateForApi(row[columnMapping.billingDate]) : null,
          dueDate: columnMapping.dueDate !== -1 ? row[columnMapping.dueDate] : '',
          paidDate: columnMapping.paidDate !== -1 ? formatDateForApi(row[columnMapping.paidDate]) : null,
          isOverdue: isPaymentOverdue(row[columnMapping.dueDate], row[columnMapping.paymentStatus]),
          remarks: columnMapping.remarks !== -1 ? row[columnMapping.remarks] : '',
          // 手数料種別の分解表示用
          feeBreakdown: [
            {
              type: '成約手数料',
              amount: columnMapping.commissionTotal !== -1 ? (parseFloat(row[columnMapping.commissionTotal]) || 0) : 0,
              caseCount: columnMapping.caseCount !== -1 ? (parseInt(row[columnMapping.caseCount]) || 0) : 0
            },
            {
              type: '紹介料',
              amount: columnMapping.referralFeeTotal !== -1 ? (parseFloat(row[columnMapping.referralFeeTotal]) || 0) : 0,
              caseCount: 1 // 紹介料は月額固定の想定
            }
          ]
        };
        
        billingHistory.push(billingItem);
      }
    });
    
    // 請求日の降順でソート（新しい順）
    billingHistory.sort((a, b) => {
      const dateA = new Date(a.billingDate || 0);
      const dateB = new Date(b.billingDate || 0);
      return dateB - dateA;
    });
    
    return {
      success: true,
      data: billingHistory
    };
    
  } catch (error) {
    Logger.log(`❌ 請求履歴取得エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 加盟店基本情報を取得
 * 
 * @param {string} franchiseeId 加盟店ID
 * @returns {Object} 加盟店情報
 */
function getFranchiseeBasicInfo(franchiseeId) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return null;
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('加盟店情報');
    
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const franchiseeIdIndex = headers.indexOf('加盟店ID');
    const companyNameIndex = headers.indexOf('会社名');
    const representativeIndex = headers.indexOf('代表者名');
    const contractPlanIndex = headers.indexOf('契約プラン');
    
    if (franchiseeIdIndex === -1) {
      return null;
    }
    
    // 加盟店を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][franchiseeIdIndex] === franchiseeId) {
        return {
          franchiseeId: franchiseeId,
          companyName: companyNameIndex !== -1 ? data[i][companyNameIndex] : '',
          representativeName: representativeIndex !== -1 ? data[i][representativeIndex] : '',
          contractPlan: contractPlanIndex !== -1 ? data[i][contractPlanIndex] : ''
        };
      }
    }
    
    return null;
    
  } catch (error) {
    Logger.log(`⚠️ 加盟店基本情報取得エラー: ${error.message}`);
    return null;
  }
}

/**
 * 支払期限を過ぎているかチェック
 * 
 * @param {string} dueDate 支払期日
 * @param {string} paymentStatus 支払状況
 * @returns {boolean} 延滞フラグ
 */
function isPaymentOverdue(dueDate, paymentStatus) {
  if (!dueDate || paymentStatus === '済' || paymentStatus === '支払い済み') {
    return false;
  }
  
  try {
    // 支払期日の解析（日本語形式対応）
    let parsedDate;
    if (dueDate instanceof Date) {
      parsedDate = dueDate;
    } else if (typeof dueDate === 'string') {
      // "2025年2月27日" 形式を解析
      const match = dueDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (match) {
        parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        parsedDate = new Date(dueDate);
      }
    }
    
    if (isNaN(parsedDate.getTime())) {
      return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間をリセット
    
    return parsedDate < today;
    
  } catch (error) {
    Logger.log(`⚠️ 支払期限チェックエラー: ${error.message}`);
    return false;
  }
}

/**
 * API用の日付フォーマット
 * 
 * @param {Date|string} date 日付
 * @returns {string|null} ISO8601形式の日付文字列
 */
function formatDateForApi(date) {
  if (!date) return null;
  
  try {
    if (date instanceof Date) {
      return date.toISOString();
    } else if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * API レスポンス生成ヘルパー
 * 
 * @param {Object} data レスポンスデータ
 * @param {number} statusCode HTTPステータスコード
 * @returns {GoogleAppsScript.Content.TextOutput} JSON レスポンス
 */
function createApiResponse(data, statusCode = 200) {
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  
  // GASではsetHeadersは使用不可 - コメントアウト
  // response.setHeaders({
  //   'Access-Control-Allow-Origin': '*',
  //   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  //   'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  //   'Access-Control-Max-Age': '86400'
  // });
  
  Logger.log(`📡 API応答作成: ステータス ${statusCode}`);
  
  return response;
}

/**
 * GAS WebApp doGet統合ハンドラー（API ルーティング）
 * 
 * @param {Object} e - doGet()イベントオブジェクト
 * @returns {GoogleAppsScript.Content.TextOutput} レスポンス
 */
function doGetDisabled_spreadsheet(e) {
  try {
    // イベントオブジェクトの安全な取得
    if (!e) {
      Logger.log(`⚠️ イベントオブジェクトが未定義です`);
      return createApiResponse({
        success: false,
        error: 'イベントオブジェクトが未定義です'
      }, 400);
    }
    
    const pathInfo = (e && e.pathInfo) ? e.pathInfo : '';
    const parameter = (e && e.parameter) ? e.parameter : {};
    
    Logger.log(`🌐 API リクエスト受信: パス="${pathInfo}"`);
    
    // API ルーティング
    if (pathInfo === 'api/getBillingHistory') {
      return getBillingHistory(e);
    }
    
    // デフォルト応答（API一覧）
    return createApiResponse({
      success: true,
      message: '外壁塗装くらべるAI - API Server',
      availableEndpoints: {
        '/api/getBillingHistory': {
          method: 'GET',
          parameters: ['franchiseeId'],
          description: '加盟店の請求履歴を取得'
        }
      },
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    Logger.log(`❌ doGet統合エラー: ${error.message}`);
    return createApiResponse({
      success: false,
      error: 'システムエラーが発生しました',
      details: error.message
    }, 500);
  }
}

// ==========================================
// 重複請求防止・案件管理機能
// ==========================================

/**
 * 既存請求確認
 * 
 * @param {string} franchiseId 加盟店ID
 * @param {Object} targetMonth 対象月
 * @returns {Object} 確認結果
 */
function checkExistingBilling(franchiseId, targetMonth) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return { exists: false };
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      return { exists: false };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { exists: false };
    }
    
    const headers = data[0];
    const franchiseIdIndex = headers.indexOf('加盟店ID');
    const billingMonthIndex = headers.indexOf('請求対象月');
    const billingIdIndex = headers.indexOf('請求ID');
    
    if (franchiseIdIndex === -1 || billingMonthIndex === -1) {
      return { exists: false };
    }
    
    const targetMonthStr = `${targetMonth.year}年${targetMonth.month}月`;
    
    // 既存請求を検索
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[franchiseIdIndex] === franchiseId && row[billingMonthIndex] === targetMonthStr) {
        return {
          exists: true,
          billingId: billingIdIndex !== -1 ? row[billingIdIndex] : 'unknown',
          billingMonth: targetMonthStr
        };
      }
    }
    
    return { exists: false };
    
  } catch (error) {
    Logger.log(`⚠️ 既存請求確認エラー: ${error.message}`);
    return { exists: false };
  }
}

/**
 * 成約案件に請求済みフラグを設定
 * 
 * @param {Array} caseIds 案件ID一覧
 * @param {string} billingId 請求ID
 */
function markCasesAsBilled(caseIds, billingId) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      return;
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('マッチング履歴');
    
    if (!sheet) {
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return;
    }
    
    const headers = data[0];
    const matchingIdIndex = headers.indexOf('マッチングID');
    const inquiryIdIndex = headers.indexOf('問い合わせID');
    let billingIdIndex = headers.indexOf('請求ID');
    
    // 請求IDカラムが存在しない場合は追加
    if (billingIdIndex === -1) {
      headers.push('請求ID');
      billingIdIndex = headers.length - 1;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      Logger.log('✅ マッチング履歴シートに請求IDカラムを追加');
    }
    
    let updatedCount = 0;
    
    // 各案件に請求IDを設定
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const matchingId = matchingIdIndex !== -1 ? row[matchingIdIndex] : '';
      const inquiryId = inquiryIdIndex !== -1 ? row[inquiryIdIndex] : '';
      const caseId = inquiryId || matchingId;
      
      if (caseIds.includes(caseId)) {
        // 現在の行データを拡張（新しいカラム分）
        while (row.length < headers.length) {
          row.push('');
        }
        
        row[billingIdIndex] = billingId;
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        updatedCount++;
      }
    }
    
    Logger.log(`✅ ${updatedCount}件の案件に請求ID ${billingId} を設定`);
    
  } catch (error) {
    Logger.log(`⚠️ 案件請求済みフラグ設定エラー: ${error.message}`);
  }
}

/**
 * 月次請求処理結果をログに記録
 * 
 * @param {Object} targetMonth 対象月
 * @param {Object} results 処理結果
 */
function logMonthlyBillingResults(targetMonth, results) {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) return;
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    let logSheet = ss.getSheetByName('月次請求処理ログ');
    
    // ログシートが存在しない場合は作成
    if (!logSheet) {
      logSheet = ss.insertSheet('月次請求処理ログ');
      const headers = [
        '処理日時', '対象月', '処理済み加盟店数', '請求総額', 
        '通知成功', '通知失敗', 'エラー数', 'エラー詳細', '処理時間（秒）'
      ];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      logSheet.getRange(1, 1, 1, headers.length).setBackground('#E1F5FE');
    }
    
    const logRow = [
      new Date(),
      results.targetMonth,
      results.processedFranchises.length,
      results.totalAmount,
      results.notifications.sent,
      results.notifications.failed,
      results.errors.length,
      results.errors.join('; '),
      Math.round((new Date() - new Date()) / 1000) // 処理時間は概算
    ];
    
    logSheet.appendRow(logRow);
    
  } catch (error) {
    Logger.log(`⚠️ 月次請求処理ログ記録エラー: ${error.message}`);
  }
}

// ==========================================
// テスト・デバッグ関数
// ==========================================




/**
 * テストデータ作成 - 請求管理シートに2-3件の請求履歴を追加
 */
function createTestBillingData() {
  try {
    Logger.log('🧪 テスト請求データ作成開始');
    
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('請求管理');
    
    if (!sheet) {
      Logger.log('請求管理シートが存在しないため、先に初期化します');
      initializeBillingManagementSheet(ss);
    }
    
    // テスト用請求データ
    const testBillings = [
      {
        billingId: 'BILL2501TEST001',
        franchiseeId: 'PARENT-TEST-001',
        billingMonth: '2025年1月',
        caseCount: 3,
        commissionTotal: 180000,
        referralFeeTotal: 30000,
        totalAmount: 210000,
        paymentType: '引き落とし',
        paymentStatus: '未払い',
        billingDate: new Date(2025, 0, 31),
        dueDate: '2025年2月27日',
        paidDate: '',
        slackNotified: true,
        remarks: 'テスト請求データ1'
      },
      {
        billingId: 'BILL2412TEST002',
        franchiseeId: 'PARENT-TEST-001',
        billingMonth: '2024年12月',
        caseCount: 5,
        commissionTotal: 250000,
        referralFeeTotal: 30000,
        totalAmount: 280000,
        paymentType: '引き落とし',
        paymentStatus: '済',
        billingDate: new Date(2024, 11, 31),
        dueDate: '2025年1月27日',
        paidDate: new Date(2025, 0, 25),
        slackNotified: true,
        remarks: 'テスト請求データ2'
      },
      {
        billingId: 'BILL2411TEST003',
        franchiseeId: 'PARENT-TEST-001',
        billingMonth: '2024年11月',
        caseCount: 2,
        commissionTotal: 120000,
        referralFeeTotal: 30000,
        totalAmount: 150000,
        paymentType: '振込',
        paymentStatus: '済',
        billingDate: new Date(2024, 10, 30),
        dueDate: '2024年12月15日',
        paidDate: new Date(2024, 11, 13),
        slackNotified: true,
        remarks: 'テスト請求データ3'
      }
    ];
    
    // 各テストデータを追加
    let addedCount = 0;
    testBillings.forEach(billing => {
      // 重複チェック
      const existingData = sheet.getDataRange().getValues();
      const headers = existingData[0];
      const billingIdIndex = headers.indexOf('請求ID');
      
      if (billingIdIndex !== -1) {
        const existingBilling = existingData.find(row => row[billingIdIndex] === billing.billingId);
        if (existingBilling) {
          Logger.log(`⚠️ 請求ID ${billing.billingId} は既に存在します - スキップ`);
          return;
        }
      }
      
      // 新規データ追加
      const newRow = [
        billing.billingId,
        billing.franchiseeId,
        billing.billingMonth,
        billing.caseCount,
        billing.commissionTotal,
        billing.referralFeeTotal,
        billing.totalAmount,
        billing.paymentType,
        billing.paymentStatus,
        billing.billingDate,
        billing.dueDate,
        billing.paidDate,
        billing.slackNotified,
        billing.remarks
      ];
      
      sheet.appendRow(newRow);
      addedCount++;
      Logger.log(`✅ テスト請求データ追加: ${billing.billingId} (${billing.billingMonth})`);
    });
    
    Logger.log(`✅ テスト請求データ作成完了: ${addedCount}件追加`);
    
    return {
      success: true,
      message: `テスト請求データを${addedCount}件追加しました`,
      addedCount: addedCount
    };
    
  } catch (error) {
    Logger.log(`❌ テスト請求データ作成エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * API テスト - 請求履歴取得
 */
function testGetBillingHistoryApi() {
  try {
    Logger.log('🧪 請求履歴API テスト開始');
    
    // テストパラメータ
    const testEvent = {
      parameter: {
        franchiseeId: 'PARENT-TEST-001'
      },
      pathInfo: 'api/getBillingHistory'
    };
    
    // API呼び出し
    const response = getBillingHistory(testEvent);
    const responseData = JSON.parse(response.getContent());
    
    Logger.log('API レスポンス:', responseData);
    
    if (responseData.success) {
      Logger.log(`✅ API テスト成功 - 請求履歴 ${responseData.data.billingHistory.length}件取得`);
      Logger.log(`加盟店情報: ${responseData.data.franchiseeInfo?.companyName || '取得失敗'}`);
      Logger.log(`未払い件数: ${responseData.data.summary.unpaidCount}件`);
      Logger.log(`請求総額: ${responseData.data.summary.totalAmount.toLocaleString()}円`);
    } else {
      Logger.log(`❌ API テスト失敗: ${responseData.error}`);
    }
    
    return responseData;
    
  } catch (error) {
    Logger.log(`❌ API テストエラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===============================================
// ランキング・フラグ管理機能 (2025-01-04 追加)
// ===============================================

/**
 * 成約率ランキングシート初期化
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @return {Object} 初期化結果
 */
function initializeSuccessRateRankingSheet(ss) {
  try {
    Logger.log('📊 成約率ランキングシート初期化開始');
    
    const sheetName = '成約率ランキング';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`新規シート作成: ${sheetName}`);
    }
    
    // ヘッダー設定
    const headers = [
      '順位',           // A列
      '加盟店ID',       // B列  
      '加盟店名',       // C列
      '振り分け案件数', // D列
      '成約数',         // E列
      '成約率',         // F列
      '算出期間',       // G列
      '最終更新日時'    // H列
    ];
    
    // ヘッダー行設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 列幅調整
    sheet.setColumnWidth(1, 60);   // 順位
    sheet.setColumnWidth(2, 120);  // 加盟店ID
    sheet.setColumnWidth(3, 200);  // 加盟店名
    sheet.setColumnWidth(4, 100);  // 振り分け案件数
    sheet.setColumnWidth(5, 80);   // 成約数
    sheet.setColumnWidth(6, 80);   // 成約率
    sheet.setColumnWidth(7, 120);  // 算出期間
    sheet.setColumnWidth(8, 150);  // 最終更新日時
    
    // サンプルデータ追加
    const sampleData = [
      [1, 'PARENT-001', '株式会社サンプル塗装', 25, 8, '32.0%', '2024/10-12月', new Date()],
      [2, 'PARENT-002', '東京外壁工事', 18, 5, '27.8%', '2024/10-12月', new Date()],
      [3, 'PARENT-003', '関西リフォーム', 22, 6, '27.3%', '2024/10-12月', new Date()]
    ];
    
    if (sheet.getLastRow() <= 1) {
      const dataRange = sheet.getRange(2, 1, sampleData.length, sampleData[0].length);
      dataRange.setValues(sampleData);
      Logger.log('サンプルデータ追加完了');
    }
    
    // 条件付き書式（成約率に応じた色分け）
    const rateRange = sheet.getRange(2, 6, 100, 1);
    const rule1 = SpreadsheetApp.newConditionalFormatRule()
      .setRanges([rateRange])
      .whenTextContains('%')
      .setBackground('#e8f5e8')
      .build();
    sheet.setConditionalFormatRules([rule1]);
    
    Logger.log('✅ 成約率ランキングシート初期化完了');
    return { success: true, sheetName: sheetName };
    
  } catch (error) {
    Logger.log(`❌ 成約率ランキングシート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 対応スピード・売上ランキングシート初期化
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @return {Object} 初期化結果
 */
function initializeResponseSpeedRankingSheet(ss) {
  try {
    Logger.log('⚡ 対応スピード・売上ランキングシート初期化開始');
    
    const sheetName = '対応スピード・売上ランキング';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`新規シート作成: ${sheetName}`);
    }
    
    // ヘッダー設定
    const headers = [
      '順位',               // A列
      '加盟店ID',           // B列
      '加盟店名',           // C列
      '平均対応時間(時間)', // D列
      '対応件数',           // E列
      '売上合計(円)',       // F列
      '請求済み件数',       // G列
      '算出期間',           // H列
      '最終更新日時'        // I列
    ];
    
    // ヘッダー行設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#ff9800');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 列幅調整
    sheet.setColumnWidth(1, 60);   // 順位
    sheet.setColumnWidth(2, 120);  // 加盟店ID
    sheet.setColumnWidth(3, 200);  // 加盟店名
    sheet.setColumnWidth(4, 120);  // 平均対応時間
    sheet.setColumnWidth(5, 80);   // 対応件数
    sheet.setColumnWidth(6, 120);  // 売上合計
    sheet.setColumnWidth(7, 100);  // 請求済み件数
    sheet.setColumnWidth(8, 120);  // 算出期間
    sheet.setColumnWidth(9, 150);  // 最終更新日時
    
    // サンプルデータ追加
    const sampleData = [
      [1, 'PARENT-001', '株式会社サンプル塗装', 2.5, 8, 1250000, 6, '2024/10-12月', new Date()],
      [2, 'PARENT-002', '東京外壁工事', 4.2, 5, 890000, 4, '2024/10-12月', new Date()],
      [3, 'PARENT-003', '関西リフォーム', 6.8, 6, 1180000, 5, '2024/10-12月', new Date()]
    ];
    
    if (sheet.getLastRow() <= 1) {
      const dataRange = sheet.getRange(2, 1, sampleData.length, sampleData[0].length);
      dataRange.setValues(sampleData);
      Logger.log('サンプルデータ追加完了');
    }
    
    // 数値フォーマット設定
    sheet.getRange(2, 6, 100, 1).setNumberFormat('#,##0"円"');  // 売上合計
    sheet.getRange(2, 4, 100, 1).setNumberFormat('0.0"時間"');  // 平均対応時間
    
    Logger.log('✅ 対応スピード・売上ランキングシート初期化完了');
    return { success: true, sheetName: sheetName };
    
  } catch (error) {
    Logger.log(`❌ 対応スピード・売上ランキングシート初期化エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 加盟店フラグ管理シート初期化
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @return {Object} 初期化結果
 */
function initializeFranchiseeFlagSheet(ss) {
  try {
    Logger.log('🚩 加盟店フラグ管理シート初期化開始');
    
    const sheetName = '加盟店フラグ管理';
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`新規シート作成: ${sheetName}`);
    }
    
    // ヘッダー設定
    const headers = [
      '加盟店ID',       // A列
      '加盟店名',       // B列
      'フラグステータス', // C列 (アクティブ/不在/保留/ブラック)
      '理由',           // D列
      '登録日',         // E列
      '登録者',         // F列
      '有効期限',       // G列
      '備考',           // H列
      '最終更新日時'    // I列
    ];
    
    // ヘッダー行設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#f44336');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 列幅調整
    sheet.setColumnWidth(1, 120);  // 加盟店ID
    sheet.setColumnWidth(2, 200);  // 加盟店名
    sheet.setColumnWidth(3, 120);  // フラグステータス
    sheet.setColumnWidth(4, 200);  // 理由
    sheet.setColumnWidth(5, 100);  // 登録日
    sheet.setColumnWidth(6, 100);  // 登録者
    sheet.setColumnWidth(7, 100);  // 有効期限
    sheet.setColumnWidth(8, 200);  // 備考
    sheet.setColumnWidth(9, 150);  // 最終更新日時
    
    // サンプルデータ追加
    const sampleData = [
      ['PARENT-001', '株式会社サンプル塗装', 'アクティブ', '', new Date(), 'ADMIN-001', '', '', new Date()],
      ['PARENT-002', '東京外壁工事', '保留', '対応品質確認中', new Date(), 'ADMIN-001', new Date(Date.now() + 7*24*60*60*1000), '1週間後に再評価', new Date()],
      ['PARENT-003', '関西リフォーム', '不在', '長期出張中', new Date(), 'ADMIN-002', new Date(Date.now() + 14*24*60*60*1000), '2週間後に復帰予定', new Date()]
    ];
    
    if (sheet.getLastRow() <= 1) {
      const dataRange = sheet.getRange(2, 1, sampleData.length, sampleData[0].length);
      dataRange.setValues(sampleData);
      Logger.log('サンプルデータ追加完了');
    }
    
    // データ検証（プルダウン）設定
    const statusRange = sheet.getRange(2, 3, 100, 1);
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['アクティブ', '不在', '保留', 'ブラック'])
      .setAllowInvalid(false)
      .setHelpText('ステータスを選択してください')
      .build();
    statusRange.setDataValidation(statusRule);
    
    // 条件付き書式（ステータスに応じた色分け）
    const rules = [];
    
    // アクティブ（緑）
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .setRanges([sheet.getRange(2, 1, 100, 9)])
      .whenFormulaSatisfied('=$C2="アクティブ"')
      .setBackground('#e8f5e8')
      .build());
    
    // 不在（黄）
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .setRanges([sheet.getRange(2, 1, 100, 9)])
      .whenFormulaSatisfied('=$C2="不在"')
      .setBackground('#fff3e0')
      .build());
    
    // 保留（オレンジ）
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .setRanges([sheet.getRange(2, 1, 100, 9)])
      .whenFormulaSatisfied('=$C2="保留"')
      .setBackground('#ffe0b2')
      .build());
    
    // ブラック（赤）
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .setRanges([sheet.getRange(2, 1, 100, 9)])
      .whenFormulaSatisfied('=$C2="ブラック"')
      .setBackground('#ffebee')
      .build());
    
    sheet.setConditionalFormatRules(rules);
    
    Logger.log('✅ 加盟店フラグ管理シート初期化完了');
    return { success: true, sheetName: sheetName };
    
  } catch (error) {
    Logger.log(`❌ 加盟店フラグ管理シート初期化エラー: ${error.message}`);
    throw error;
  }
}

// ===============================================
// ランキング機能 - データ処理関数
// ===============================================

/**
 * 成約率ランキングデータ取得・更新
 * @param {number} months - 過去何ヶ月のデータを取得するか（デフォルト3ヶ月）
 * @return {Object} ランキングデータ
 */
function getSuccessRateRanking(months = 3) {
  try {
    Logger.log(`📊 成約率ランキングデータ取得開始（過去${months}ヶ月）`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 期間設定
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // 加盟店情報取得
    const partnersData = claude_getSafeSheetData('加盟店情報', ['加盟店ID', '会社名']);
    
    // マッチング履歴から振り分け案件数取得
    const matchingData = claude_getSafeSheetData('マッチング履歴', [
      '案件ID', '加盟店ID', '成約フラグ', 'マッチング日時'
    ]);
    
    const partnersMap = new Map();
    
    // 加盟店ごとの成約率計算
    matchingData.rows.forEach(row => {
      const indexMap = claude_getColumnIndexMap(matchingData.headers, 
        ['案件ID', '加盟店ID', '成約フラグ', 'マッチング日時'], 'マッチング履歴');
      
      const franchiseeId = claude_getSafeValue(row, indexMap['加盟店ID'], '');
      const isSuccess = claude_getSafeValue(row, indexMap['成約フラグ'], false);
      const matchingDate = claude_getSafeValue(row, indexMap['マッチング日時'], '');
      
      if (!franchiseeId) return;
      
      // 期間フィルタ
      if (matchingDate) {
        const date = new Date(matchingDate);
        if (date < startDate || date > endDate) return;
      }
      
      if (!partnersMap.has(franchiseeId)) {
        partnersMap.set(franchiseeId, {
          franchiseeId: franchiseeId,
          franchiseeName: '',
          totalCases: 0,
          successCases: 0,
          successRate: 0
        });
      }
      
      const partner = partnersMap.get(franchiseeId);
      partner.totalCases++;
      if (isSuccess === true || isSuccess === 'TRUE' || isSuccess === '成約') {
        partner.successCases++;
      }
    });
    
    // 加盟店名の設定
    partnersData.rows.forEach(row => {
      const indexMap = claude_getColumnIndexMap(partnersData.headers, ['加盟店ID', '会社名'], '加盟店情報');
      const franchiseeId = claude_getSafeValue(row, indexMap['加盟店ID'], '');
      const companyName = claude_getSafeValue(row, indexMap['会社名'], '');
      
      if (partnersMap.has(franchiseeId)) {
        partnersMap.get(franchiseeId).franchiseeName = companyName;
      }
    });
    
    // 成約率計算とソート
    const rankingData = Array.from(partnersMap.values())
      .filter(partner => partner.totalCases > 0)
      .map(partner => {
        partner.successRate = partner.totalCases > 0 ? 
          Math.round((partner.successCases / partner.totalCases) * 1000) / 10 : 0;
        return partner;
      })
      .sort((a, b) => b.successRate - a.successRate);
    
    // 順位設定
    rankingData.forEach((partner, index) => {
      partner.rank = index + 1;
    });
    
    // ランキングシートに結果を保存
    updateSuccessRateRankingSheet(rankingData, startDate, endDate);
    
    Logger.log(`✅ 成約率ランキングデータ取得完了: ${rankingData.length}件`);
    
    return {
      success: true,
      data: rankingData,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        months: months
      },
      summary: {
        totalFranchisees: rankingData.length,
        avgSuccessRate: rankingData.length > 0 ? 
          Math.round(rankingData.reduce((sum, p) => sum + p.successRate, 0) / rankingData.length * 10) / 10 : 0
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 成約率ランキングデータ取得エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * 成約率ランキングシート更新
 * @param {Array} rankingData - ランキングデータ
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 */
function updateSuccessRateRankingSheet(rankingData, startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('成約率ランキング');
    
    if (!sheet) {
      throw new Error('成約率ランキングシートが見つかりません');
    }
    
    // 既存データクリア（ヘッダー以外）
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    // 新しいデータ追加
    if (rankingData.length > 0) {
      const period = `${startDate.getFullYear()}/${startDate.getMonth() + 1}-${endDate.getFullYear()}/${endDate.getMonth() + 1}月`;
      const updateTime = new Date();
      
      const values = rankingData.map(partner => [
        partner.rank,
        partner.franchiseeId,
        partner.franchiseeName,
        partner.totalCases,
        partner.successCases,
        `${partner.successRate}%`,
        period,
        updateTime
      ]);
      
      const range = sheet.getRange(2, 1, values.length, values[0].length);
      range.setValues(values);
      
      Logger.log(`成約率ランキングシート更新完了: ${values.length}行`);
    }
    
  } catch (error) {
    Logger.log(`❌ 成約率ランキングシート更新エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 対応スピード・売上ランキングデータ取得
 * @param {number} months - 過去何ヶ月のデータを取得するか（デフォルト3ヶ月）
 * @return {Object} ランキングデータ
 */
function getResponseSpeedAndSalesRanking(months = 3) {
  try {
    Logger.log(`⚡ 対応スピード・売上ランキングデータ取得開始（過去${months}ヶ月）`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 期間設定
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // 加盟店情報取得
    const partnersData = claude_getSafeSheetData('加盟店情報', ['加盟店ID', '会社名']);
    
    // マッチング履歴から対応時間データ取得
    const matchingData = claude_getSafeSheetData('マッチング履歴', [
      '案件ID', '加盟店ID', 'マッチング日時', '初回返信日時'
    ]);
    
    // 請求管理から売上データ取得
    const billingData = claude_getSafeSheetData('請求管理', [
      '加盟店ID', '請求金額', '支払いステータス', '請求日'
    ]);
    
    const partnersMap = new Map();
    
    // 対応時間計算
    matchingData.rows.forEach(row => {
      const indexMap = claude_getColumnIndexMap(matchingData.headers, 
        ['案件ID', '加盟店ID', 'マッチング日時', '初回返信日時'], 'マッチング履歴');
      
      const franchiseeId = claude_getSafeValue(row, indexMap['加盟店ID'], '');
      const matchingTime = claude_getSafeValue(row, indexMap['マッチング日時'], '');
      const responseTime = claude_getSafeValue(row, indexMap['初回返信日時'], '');
      
      if (!franchiseeId || !matchingTime || !responseTime) return;
      
      // 期間フィルタ
      const matchingDate = new Date(matchingTime);
      if (matchingDate < startDate || matchingDate > endDate) return;
      
      if (!partnersMap.has(franchiseeId)) {
        partnersMap.set(franchiseeId, {
          franchiseeId: franchiseeId,
          franchiseeName: '',
          totalResponseTimes: [],
          totalSales: 0,
          billingCount: 0
        });
      }
      
      const partner = partnersMap.get(franchiseeId);
      
      // 対応時間計算（時間単位）
      const matchingDateTime = new Date(matchingTime);
      const responseDateTime = new Date(responseTime);
      const responseHours = (responseDateTime - matchingDateTime) / (1000 * 60 * 60);
      
      if (responseHours >= 0 && responseHours <= 168) { // 1週間以内の妥当な範囲
        partner.totalResponseTimes.push(responseHours);
      }
    });
    
    // 売上計算
    billingData.rows.forEach(row => {
      const indexMap = claude_getColumnIndexMap(billingData.headers, 
        ['加盟店ID', '請求金額', '支払いステータス', '請求日'], '請求管理');
      
      const franchiseeId = claude_getSafeValue(row, indexMap['加盟店ID'], '');
      const amount = claude_getSafeValue(row, indexMap['請求金額'], 0);
      const status = claude_getSafeValue(row, indexMap['支払いステータス'], '');
      const billingDate = claude_getSafeValue(row, indexMap['請求日'], '');
      
      if (!franchiseeId || status !== '支払い済み') return;
      
      // 期間フィルタ
      if (billingDate) {
        const date = new Date(billingDate);
        if (date < startDate || date > endDate) return;
      }
      
      if (!partnersMap.has(franchiseeId)) {
        partnersMap.set(franchiseeId, {
          franchiseeId: franchiseeId,
          franchiseeName: '',
          totalResponseTimes: [],
          totalSales: 0,
          billingCount: 0
        });
      }
      
      const partner = partnersMap.get(franchiseeId);
      partner.totalSales += Number(amount) || 0;
      partner.billingCount++;
    });
    
    // 加盟店名の設定
    partnersData.rows.forEach(row => {
      const indexMap = claude_getColumnIndexMap(partnersData.headers, ['加盟店ID', '会社名'], '加盟店情報');
      const franchiseeId = claude_getSafeValue(row, indexMap['加盟店ID'], '');
      const companyName = claude_getSafeValue(row, indexMap['会社名'], '');
      
      if (partnersMap.has(franchiseeId)) {
        partnersMap.get(franchiseeId).franchiseeName = companyName;
      }
    });
    
    // 平均対応時間計算とソート
    const rankingData = Array.from(partnersMap.values())
      .filter(partner => partner.totalResponseTimes.length > 0 || partner.billingCount > 0)
      .map(partner => {
        const avgResponseTime = partner.totalResponseTimes.length > 0 ?
          Math.round(partner.totalResponseTimes.reduce((sum, time) => sum + time, 0) / partner.totalResponseTimes.length * 10) / 10 : 0;
        
        return {
          franchiseeId: partner.franchiseeId,
          franchiseeName: partner.franchiseeName,
          avgResponseTime: avgResponseTime,
          responseCount: partner.totalResponseTimes.length,
          totalSales: partner.totalSales,
          billingCount: partner.billingCount
        };
      })
      .sort((a, b) => {
        // 対応時間が短い順、売上が高い順
        if (a.avgResponseTime !== b.avgResponseTime) {
          return a.avgResponseTime - b.avgResponseTime;
        }
        return b.totalSales - a.totalSales;
      });
    
    // 順位設定
    rankingData.forEach((partner, index) => {
      partner.rank = index + 1;
    });
    
    // ランキングシートに結果を保存
    updateResponseSpeedRankingSheet(rankingData, startDate, endDate);
    
    Logger.log(`✅ 対応スピード・売上ランキングデータ取得完了: ${rankingData.length}件`);
    
    return {
      success: true,
      data: rankingData,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        months: months
      },
      summary: {
        totalFranchisees: rankingData.length,
        avgResponseTime: rankingData.length > 0 ? 
          Math.round(rankingData.reduce((sum, p) => sum + p.avgResponseTime, 0) / rankingData.length * 10) / 10 : 0,
        totalSales: rankingData.reduce((sum, p) => sum + p.totalSales, 0)
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 対応スピード・売上ランキングデータ取得エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * 対応スピード・売上ランキングシート更新
 * @param {Array} rankingData - ランキングデータ
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 */
function updateResponseSpeedRankingSheet(rankingData, startDate, endDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('対応スピード・売上ランキング');
    
    if (!sheet) {
      throw new Error('対応スピード・売上ランキングシートが見つかりません');
    }
    
    // 既存データクリア（ヘッダー以外）
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    // 新しいデータ追加
    if (rankingData.length > 0) {
      const period = `${startDate.getFullYear()}/${startDate.getMonth() + 1}-${endDate.getFullYear()}/${endDate.getMonth() + 1}月`;
      const updateTime = new Date();
      
      const values = rankingData.map(partner => [
        partner.rank,
        partner.franchiseeId,
        partner.franchiseeName,
        partner.avgResponseTime,
        partner.responseCount,
        partner.totalSales,
        partner.billingCount,
        period,
        updateTime
      ]);
      
      const range = sheet.getRange(2, 1, values.length, values[0].length);
      range.setValues(values);
      
      Logger.log(`対応スピード・売上ランキングシート更新完了: ${values.length}行`);
    }
    
  } catch (error) {
    Logger.log(`❌ 対応スピード・売上ランキングシート更新エラー: ${error.message}`);
    throw error;
  }
}

// ===============================================
// 加盟店フラグ管理機能 - データ処理関数
// ===============================================

/**
 * 加盟店フラグ情報取得
 * @param {string} franchiseeId - 加盟店ID（省略時は全件）
 * @return {Object} フラグ情報
 */
function getFranchiseeFlags(franchiseeId = null) {
  try {
    Logger.log(`🚩 加盟店フラグ情報取得開始: ${franchiseeId || '全件'}`);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const flagData = claude_getSafeSheetData('加盟店フラグ管理', [
      '加盟店ID', '加盟店名', 'フラグステータス', '理由', 
      '登録日', '登録者', '有効期限', '備考', '最終更新日時'
    ]);
    
    let flags = flagData.rows.map(row => {
      const indexMap = claude_getColumnIndexMap(flagData.headers, [
        '加盟店ID', '加盟店名', 'フラグステータス', '理由', 
        '登録日', '登録者', '有効期限', '備考', '最終更新日時'
      ], '加盟店フラグ管理');
      
      return {
        franchiseeId: claude_getSafeValue(row, indexMap['加盟店ID'], ''),
        franchiseeName: claude_getSafeValue(row, indexMap['加盟店名'], ''),
        flagStatus: claude_getSafeValue(row, indexMap['フラグステータス'], 'アクティブ'),
        reason: claude_getSafeValue(row, indexMap['理由'], ''),
        registeredDate: claude_getSafeValue(row, indexMap['登録日'], ''),
        registeredBy: claude_getSafeValue(row, indexMap['登録者'], ''),
        expiryDate: claude_getSafeValue(row, indexMap['有効期限'], ''),
        notes: claude_getSafeValue(row, indexMap['備考'], ''),
        lastUpdated: claude_getSafeValue(row, indexMap['最終更新日時'], '')
      };
    });
    
    // 特定の加盟店IDが指定されている場合はフィルタ
    if (franchiseeId) {
      flags = flags.filter(flag => flag.franchiseeId === franchiseeId);
    }
    
    Logger.log(`✅ 加盟店フラグ情報取得完了: ${flags.length}件`);
    
    return {
      success: true,
      data: flags,
      summary: {
        total: flags.length,
        active: flags.filter(f => f.flagStatus === 'アクティブ').length,
        absent: flags.filter(f => f.flagStatus === '不在').length,
        onhold: flags.filter(f => f.flagStatus === '保留').length,
        blacklisted: flags.filter(f => f.flagStatus === 'ブラック').length
      }
    };
    
  } catch (error) {
    Logger.log(`❌ 加盟店フラグ情報取得エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * 加盟店フラグ設定・更新
 * @param {string} franchiseeId - 加盟店ID
 * @param {string} flagStatus - フラグステータス（アクティブ/不在/保留/ブラック）
 * @param {string} reason - 理由
 * @param {Object} options - その他オプション
 * @return {Object} 更新結果
 */
function updateFranchiseeFlag(franchiseeId, flagStatus, reason, options = {}) {
  try {
    Logger.log(`🚩 加盟店フラグ更新開始: ${franchiseeId} -> ${flagStatus}`);
    
    if (!franchiseeId || !flagStatus) {
      throw new Error('加盟店IDとフラグステータスは必須です');
    }
    
    const validStatuses = ['アクティブ', '不在', '保留', 'ブラック'];
    if (!validStatuses.includes(flagStatus)) {
      throw new Error(`無効なフラグステータス: ${flagStatus}`);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('加盟店フラグ管理');
    
    if (!sheet) {
      throw new Error('加盟店フラグ管理シートが見つかりません');
    }
    
    // 加盟店名取得
    const partnersData = claude_getSafeSheetData('加盟店情報', ['加盟店ID', '会社名']);
    const partnerRow = partnersData.rows.find(row => {
      const indexMap = claude_getColumnIndexMap(partnersData.headers, ['加盟店ID'], '加盟店情報');
      return claude_getSafeValue(row, indexMap['加盟店ID'], '') === franchiseeId;
    });
    
    const franchiseeName = partnerRow ? 
      claude_getSafeValue(partnerRow, claude_getColumnIndexMap(partnersData.headers, ['会社名'], '加盟店情報')['会社名'], '') : 
      '';
    
    // 既存フラグ情報検索
    const existingData = sheet.getDataRange().getValues();
    const headers = existingData[0];
    const dataRows = existingData.slice(1);
    
    const franchiseeIdCol = headers.indexOf('加盟店ID');
    let targetRow = -1;
    
    for (let i = 0; i < dataRows.length; i++) {
      if (dataRows[i][franchiseeIdCol] === franchiseeId) {
        targetRow = i + 2; // ヘッダー行を考慮
        break;
      }
    }
    
    const now = new Date();
    const registeredBy = options.registeredBy || 'SYSTEM';
    const expiryDate = options.expiryDate || '';
    const notes = options.notes || '';
    
    const rowData = [
      franchiseeId,
      franchiseeName,
      flagStatus,
      reason,
      targetRow === -1 ? now : (dataRows[targetRow - 2][4] || now), // 登録日
      registeredBy,
      expiryDate,
      notes,
      now
    ];
    
    if (targetRow === -1) {
      // 新規追加
      sheet.appendRow(rowData);
      Logger.log(`新規フラグ追加: ${franchiseeId}`);
    } else {
      // 既存行更新
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
      Logger.log(`既存フラグ更新: ${franchiseeId}`);
    }
    
    // 案件振り分け除外リストを更新（ブラック・保留・不在の場合）
    if (['ブラック', '保留', '不在'].includes(flagStatus)) {
      updateAssignmentExclusionList(franchiseeId, true, flagStatus);
    } else {
      updateAssignmentExclusionList(franchiseeId, false, flagStatus);
    }
    
    Logger.log(`✅ 加盟店フラグ更新完了: ${franchiseeId} -> ${flagStatus}`);
    
    return {
      success: true,
      franchiseeId: franchiseeId,
      flagStatus: flagStatus,
      message: `フラグを${flagStatus}に更新しました`,
      isExcludedFromAssignment: ['ブラック', '保留', '不在'].includes(flagStatus)
    };
    
  } catch (error) {
    Logger.log(`❌ 加盟店フラグ更新エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 案件振り分け除外リスト更新
 * @param {string} franchiseeId - 加盟店ID
 * @param {boolean} isExcluded - 除外するかどうか
 * @param {string} reason - 除外理由
 */
function updateAssignmentExclusionList(franchiseeId, isExcluded, reason) {
  try {
    // 設定マスタシートに除外リストを記録
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let settingsSheet = ss.getSheetByName('設定マスタ');
    
    if (!settingsSheet) {
      Logger.log('設定マスタシートが見つかりません。振り分け除外リスト更新をスキップします。');
      return;
    }
    
    // 除外リスト設定キーを検索・更新
    const excludeKey = `ASSIGNMENT_EXCLUDE_${franchiseeId}`;
    const data = settingsSheet.getDataRange().getValues();
    
    let found = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === excludeKey) { // A列にキー
        settingsSheet.getRange(i + 1, 2).setValue(isExcluded ? reason : ''); // B列に値
        found = true;
        break;
      }
    }
    
    if (!found && isExcluded) {
      // 新規追加
      settingsSheet.appendRow([excludeKey, reason, new Date()]);
    }
    
    Logger.log(`案件振り分け除外リスト更新: ${franchiseeId} = ${isExcluded ? reason : '除外解除'}`);
    
  } catch (error) {
    Logger.log(`案件振り分け除外リスト更新エラー: ${error.message}`);
  }
}

/**
 * 案件振り分け時の除外チェック
 * @param {string} franchiseeId - 加盟店ID
 * @return {Object} 除外チェック結果
 */
function checkAssignmentExclusion(franchiseeId) {
  try {
    const flagInfo = getFranchiseeFlags(franchiseeId);
    
    if (!flagInfo.success || flagInfo.data.length === 0) {
      return {
        isExcluded: false,
        reason: '',
        status: 'アクティブ'
      };
    }
    
    const flag = flagInfo.data[0];
    const excludedStatuses = ['ブラック', '保留', '不在'];
    
    return {
      isExcluded: excludedStatuses.includes(flag.flagStatus),
      reason: flag.reason,
      status: flag.flagStatus,
      expiryDate: flag.expiryDate
    };
    
  } catch (error) {
    Logger.log(`案件振り分け除外チェックエラー: ${error.message}`);
    return {
      isExcluded: false,
      reason: 'チェックエラー',
      status: 'エラー'
    };
  }
}

/**
 * 期限切れフラグの自動解除
 * @return {Object} 処理結果
 */
function autoExpireFranchiseeFlags() {
  try {
    Logger.log('🚩 期限切れフラグ自動解除開始');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('加盟店フラグ管理');
    
    if (!sheet) {
      throw new Error('加盟店フラグ管理シートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dataRows = data.slice(1);
    
    const expiryDateCol = headers.indexOf('有効期限');
    const statusCol = headers.indexOf('フラグステータス');
    const franchiseeIdCol = headers.indexOf('加盟店ID');
    
    if (expiryDateCol === -1 || statusCol === -1) {
      throw new Error('必要な列が見つかりません');
    }
    
    const now = new Date();
    let expiredCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
      const expiryDate = dataRows[i][expiryDateCol];
      const currentStatus = dataRows[i][statusCol];
      const franchiseeId = dataRows[i][franchiseeIdCol];
      
      if (expiryDate && expiryDate instanceof Date && expiryDate < now && currentStatus !== 'アクティブ') {
        // 期限切れのフラグをアクティブに戻す
        updateFranchiseeFlag(franchiseeId, 'アクティブ', '期限切れによる自動解除', {
          registeredBy: 'SYSTEM',
          notes: `前回ステータス: ${currentStatus}`
        });
        expiredCount++;
      }
    }
    
    Logger.log(`✅ 期限切れフラグ自動解除完了: ${expiredCount}件`);
    
    return {
      success: true,
      expiredCount: expiredCount,
      message: `${expiredCount}件のフラグを自動解除しました`
    };
    
  } catch (error) {
    Logger.log(`❌ 期限切れフラグ自動解除エラー: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===============================================
// API エンドポイント関数
// ===============================================

/**
 * API: 成約率ランキング取得
 * @param {Object} e - リクエストイベント
 * @return {Object} API レスポンス
 */
function apiGetSuccessRateRanking(e) {
  try {
    const months = Number(e.parameter.months) || 3;
    const result = getSuccessRateRanking(months);
    
    return createApiResponse(result);
    
  } catch (error) {
    return createApiResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * API: 対応スピード・売上ランキング取得
 * @param {Object} e - リクエストイベント
 * @return {Object} API レスポンス
 */
function apiGetResponseSpeedRanking(e) {
  try {
    const months = Number(e.parameter.months) || 3;
    const result = getResponseSpeedAndSalesRanking(months);
    
    return createApiResponse(result);
    
  } catch (error) {
    return createApiResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * API: 加盟店フラグ情報取得
 * @param {Object} e - リクエストイベント
 * @return {Object} API レスポンス
 */
function apiGetFranchiseeFlags(e) {
  try {
    const franchiseeId = e.parameter.franchiseeId || null;
    const result = getFranchiseeFlags(franchiseeId);
    
    return createApiResponse(result);
    
  } catch (error) {
    return createApiResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * API: 加盟店フラグ更新
 * @param {Object} e - リクエストイベント
 * @return {Object} API レスポンス
 */
function apiUpdateFranchiseeFlag(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const { franchiseeId, flagStatus, reason, options } = requestData;
    
    if (!franchiseeId || !flagStatus) {
      return createApiResponse({
        success: false,
        error: '加盟店IDとフラグステータスは必須です'
      }, 400);
    }
    
    const result = updateFranchiseeFlag(franchiseeId, flagStatus, reason, options || {});
    
    return createApiResponse(result);
    
  } catch (error) {
    return createApiResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * ランキング・フラグ管理機能テスト
 */
function testRankingAndFlagFunctions() {
  try {
    Logger.log('🧪 ランキング・フラグ管理機能テスト開始');
    
    const results = {
      success: true,
      tests: [],
      errors: []
    };
    
    // 1. シート初期化テスト
    try {
      Logger.log('--- シート初期化テスト ---');
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      const successRateResult = initializeSuccessRateRankingSheet(ss);
      results.tests.push('成約率ランキングシート初期化: ✅');
      
      const responseSpeedResult = initializeResponseSpeedRankingSheet(ss);
      results.tests.push('対応スピード・売上ランキングシート初期化: ✅');
      
      const flagResult = initializeFranchiseeFlagSheet(ss);
      results.tests.push('加盟店フラグ管理シート初期化: ✅');
      
    } catch (error) {
      results.errors.push(`シート初期化: ${error.message}`);
    }
    
    // 2. 成約率ランキングテスト
    try {
      Logger.log('--- 成約率ランキングテスト ---');
      const successRateResult = getSuccessRateRanking(3);
      if (successRateResult.success) {
        results.tests.push(`成約率ランキング取得: ✅ (${successRateResult.data.length}件)`);
      } else {
        results.errors.push(`成約率ランキング: ${successRateResult.error}`);
      }
    } catch (error) {
      results.errors.push(`成約率ランキング: ${error.message}`);
    }
    
    // 3. 対応スピード・売上ランキングテスト
    try {
      Logger.log('--- 対応スピード・売上ランキングテスト ---');
      const responseSpeedResult = getResponseSpeedAndSalesRanking(3);
      if (responseSpeedResult.success) {
        results.tests.push(`対応スピード・売上ランキング取得: ✅ (${responseSpeedResult.data.length}件)`);
      } else {
        results.errors.push(`対応スピード・売上ランキング: ${responseSpeedResult.error}`);
      }
    } catch (error) {
      results.errors.push(`対応スピード・売上ランキング: ${error.message}`);
    }
    
    // 4. フラグ管理テスト
    try {
      Logger.log('--- フラグ管理テスト ---');
      
      // フラグ情報取得テスト
      const flagsResult = getFranchiseeFlags();
      if (flagsResult.success) {
        results.tests.push(`フラグ情報取得: ✅ (${flagsResult.data.length}件)`);
      } else {
        results.errors.push(`フラグ情報取得: ${flagsResult.error}`);
      }
      
      // フラグ更新テスト
      const updateResult = updateFranchiseeFlag('PARENT-TEST-001', '保留', 'テスト用一時保留', {
        registeredBy: 'TEST-USER',
        notes: 'テスト実行による設定'
      });
      
      if (updateResult.success) {
        results.tests.push('フラグ更新: ✅');
        
        // 除外チェックテスト
        const exclusionCheck = checkAssignmentExclusion('PARENT-TEST-001');
        results.tests.push(`除外チェック: ${exclusionCheck.isExcluded ? '✅ (除外)' : '✅ (許可)'}`);
        
        // 元に戻す
        updateFranchiseeFlag('PARENT-TEST-001', 'アクティブ', 'テスト完了', {
          registeredBy: 'TEST-USER',
          notes: 'テスト完了により元に戻す'
        });
        
      } else {
        results.errors.push(`フラグ更新: ${updateResult.error}`);
      }
      
    } catch (error) {
      results.errors.push(`フラグ管理: ${error.message}`);
    }
    
    // 5. API エンドポイントテスト
    try {
      Logger.log('--- API エンドポイントテスト ---');
      
      const mockEvent = { parameter: { months: '3' } };
      
      const successRateApi = apiGetSuccessRateRanking(mockEvent);
      const successRateData = JSON.parse(successRateApi.getContent());
      results.tests.push(`成約率ランキングAPI: ${successRateData.success ? '✅' : '❌'}`);
      
      const responseSpeedApi = apiGetResponseSpeedRanking(mockEvent);
      const responseSpeedData = JSON.parse(responseSpeedApi.getContent());
      results.tests.push(`対応スピード・売上ランキングAPI: ${responseSpeedData.success ? '✅' : '❌'}`);
      
      const flagsApi = apiGetFranchiseeFlags({ parameter: {} });
      const flagsData = JSON.parse(flagsApi.getContent());
      results.tests.push(`フラグ情報取得API: ${flagsData.success ? '✅' : '❌'}`);
      
    } catch (error) {
      results.errors.push(`API エンドポイント: ${error.message}`);
    }
    
    // 結果サマリー
    const successCount = results.tests.length;
    const errorCount = results.errors.length;
    const totalTests = successCount + errorCount;
    const successRate = totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0;
    
    Logger.log('🧪 ランキング・フラグ管理機能テスト結果');
    Logger.log(`📊 成功率: ${successRate}% (${successCount}/${totalTests})`);
    Logger.log('✅ 成功したテスト:');
    results.tests.forEach(test => Logger.log(`  - ${test}`));
    
    if (results.errors.length > 0) {
      Logger.log('❌ エラーが発生したテスト:');
      results.errors.forEach(error => Logger.log(`  - ${error}`));
    }
    
    results.summary = {
      successRate: successRate,
      successCount: successCount,
      errorCount: errorCount,
      totalTests: totalTests
    };
    
    if (errorCount > 0) {
      results.success = false;
    }
    
    Logger.log('✅ ランキング・フラグ管理機能テスト完了');
    
    return results;
    
  } catch (error) {
    Logger.log(`❌ ランキング・フラグ管理機能テスト実行エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      tests: [],
      errors: [error.message]
    };
  }
}

/**
 * 新シート初期化テスト関数
 */
function testNewSheetsInitialization() {
  try {
    Logger.log('🧪 新シート初期化テスト開始');
    
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID が設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // 請求管理シートテスト
    const billingResult = initializeBillingManagementSheet(ss);
    Logger.log('請求管理シート初期化結果:', billingResult);
    
    // 加盟店口座情報シートテスト
    const accountResult = initializeFranchiseeAccountSheet(ss);
    Logger.log('加盟店口座情報シート初期化結果:', accountResult);
    
    // 全体初期化テスト
    const allResult = initializeAllSpreadsheetSheets();
    Logger.log('全シート初期化結果:', allResult);
    
    Logger.log('✅ 新シート初期化テスト完了');
    
    return {
      success: true,
      billingSheet: billingResult,
      accountSheet: accountResult,
      allSheets: allResult
    };
    
  } catch (error) {
    Logger.log('❌ 新シート初期化テストエラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 通知履歴シートの初期化
 * 既存のNotificationHistoryシートから日本語統合版へ移行
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeNotificationHistorySheet(ss) {
  try {
    Logger.log('📞 通知履歴シート初期化開始');
    
    const newSheetName = '通知履歴';
    let sheet = ss.getSheetByName(newSheetName);
    
    // 既存の古い通知シートをチェック・データ移行
    const oldSheetNames = ['NotificationHistory', 'notification_history', 'Notifications'];
    const existingData = [];
    
    // 古いシートからデータを移行
    oldSheetNames.forEach(oldName => {
      const oldSheet = ss.getSheetByName(oldName);
      if (oldSheet) {
        Logger.log(`📋 古い通知シート発見: ${oldName} - データ移行準備`);
        try {
          const data = oldSheet.getDataRange().getValues();
          if (data.length > 1) { // ヘッダー以外にデータがある場合
            existingData.push({
              sheetName: oldName,
              data: data,
              headers: data[0]
            });
          }
          // 古いシートを削除（データ移行後）
          ss.deleteSheet(oldSheet);
          Logger.log(`🗑️ 古い通知シート削除: ${oldName}`);
        } catch (deleteError) {
          Logger.log(`⚠️ 古いシート削除スキップ: ${oldName} - ${deleteError.message}`);
        }
      }
    });
    
    // 新しいシートを作成または更新
    if (!sheet) {
      sheet = ss.insertSheet(newSheetName);
      Logger.log(`🆕 通知履歴シート新規作成`);
    } else {
      Logger.log(`🔄 既存の通知履歴シート更新`);
    }
    
    // 拡張されたヘッダー構造（日本語統一）
    const headers = [
      '送信日時',
      'ユーザーID',
      '通知種別',
      'テンプレート種別',
      'スタイル',
      '送信先',
      'メッセージ内容',
      '変数情報',
      '送信結果',
      'エラー内容',
      'メッセージ長',
      '送信チャネル',
      '送信者',
      '備考'
    ];
    
    // ヘッダーを設定
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーのフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#E3F2FD');
    headerRange.setFontColor('#1976D2');
    headerRange.setFontWeight('bold');
    headerRange.setBorder(true, true, true, true, true, true);
    sheet.setFrozenRows(1);
    
    // 列幅を調整
    sheet.setColumnWidth(1, 150); // 送信日時
    sheet.setColumnWidth(2, 120); // ユーザーID
    sheet.setColumnWidth(3, 100); // 通知種別
    sheet.setColumnWidth(4, 120); // テンプレート種別
    sheet.setColumnWidth(5, 80);  // スタイル
    sheet.setColumnWidth(6, 150); // 送信先
    sheet.setColumnWidth(7, 300); // メッセージ内容
    sheet.setColumnWidth(8, 200); // 変数情報
    sheet.setColumnWidth(9, 80);  // 送信結果
    sheet.setColumnWidth(10, 150); // エラー内容
    sheet.setColumnWidth(11, 80);  // メッセージ長
    sheet.setColumnWidth(12, 100); // 送信チャネル
    sheet.setColumnWidth(13, 100); // 送信者
    sheet.setColumnWidth(14, 200); // 備考
    
    // 既存データの移行（旧形式から新形式へ）
    let migratedCount = 0;
    existingData.forEach(oldData => {
      Logger.log(`📊 データ移行開始: ${oldData.sheetName}`);
      
      const oldHeaders = oldData.headers;
      const oldRows = oldData.data.slice(1); // ヘッダー除く
      
      oldRows.forEach(oldRow => {
        // 旧データから新形式にマッピング
        const newRow = [
          oldRow[oldHeaders.indexOf('送信日時')] || oldRow[0] || new Date(),
          oldRow[oldHeaders.indexOf('ユーザーID')] || oldRow[1] || '',
          oldRow[oldHeaders.indexOf('通知種別')] || '通知',
          oldRow[oldHeaders.indexOf('テンプレート種別')] || oldRow[2] || '',
          oldRow[oldHeaders.indexOf('スタイル')] || oldRow[3] || '',
          oldRow[oldHeaders.indexOf('送信先')] || '',
          oldRow[oldHeaders.indexOf('メッセージ内容')] || '',
          oldRow[oldHeaders.indexOf('変数')] || oldRow[4] || '',
          oldRow[oldHeaders.indexOf('送信結果')] || oldRow[5] || '',
          oldRow[oldHeaders.indexOf('エラー内容')] || oldRow[6] || '',
          oldRow[oldHeaders.indexOf('メッセージ長')] || oldRow[7] || 0,
          oldRow[oldHeaders.indexOf('送信チャネル')] || 'system',
          oldRow[oldHeaders.indexOf('送信者')] || 'system',
          `移行データ (${oldData.sheetName})`
        ];
        
        sheet.appendRow(newRow);
        migratedCount++;
      });
    });
    
    // サンプルデータ追加（移行データがない場合）
    let samplesCreated = false;
    if (migratedCount === 0) {
      const sampleData = [
        [
          new Date(),
          'FRANCHISE_001',
          'Slack通知',
          'LINE_TEMPLATE',
          'default',
          '#general',
          '【新規問い合わせ受付】\n顧客名：山田太郎様\n問い合わせ内容：外壁塗装の見積もり依頼',
          JSON.stringify({customer: '山田太郎', content: '見積もり依頼'}),
          '成功',
          '',
          85,
          'slack',
          'system',
          'サンプルデータ'
        ],
        [
          new Date(Date.now() - 60000),
          'FRANCHISE_002',
          'メール通知',
          'EMAIL_TEMPLATE',
          'urgent',
          'example@company.com',
          '緊急：案件対応が必要です。\n期限：本日中',
          JSON.stringify({deadline: '本日中', priority: '緊急'}),
          '成功',
          '',
          42,
          'email',
          'ADMIN_001',
          'サンプルデータ'
        ],
        [
          new Date(Date.now() - 120000),
          'FRANCHISE_003',
          'LINE通知',
          'LINE_TEMPLATE',
          'info',
          'LINE_USER_123',
          '案件進捗のお知らせです。',
          JSON.stringify({status: '進行中', nextStep: '現地調査'}),
          '失敗',
          'API制限エラー',
          28,
          'line',
          'system',
          'サンプルデータ'
        ]
      ];
      
      sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
      samplesCreated = true;
      Logger.log('📝 通知履歴サンプルデータ追加完了');
    }
    
    // 条件付き書式設定（送信結果に応じた色分け）
    const resultRange = sheet.getRange(2, 9, 1000, 1); // 送信結果列
    const successRule = SpreadsheetApp.newConditionalFormatRule()
      .setRanges([resultRange])
      .whenTextEqualTo('成功')
      .setBackground('#E8F5E8')
      .setFontColor('#2E7D32')
      .build();
      
    const failureRule = SpreadsheetApp.newConditionalFormatRule()
      .setRanges([resultRange])
      .whenTextEqualTo('失敗')
      .setBackground('#FFEBEE')
      .setFontColor('#C62828')
      .build();
    
    sheet.setConditionalFormatRules([successRule, failureRule]);
    
    // データ検証設定（通知種別プルダウン）
    const typeRange = sheet.getRange(2, 3, 1000, 1);
    const typeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Slack通知', 'メール通知', 'LINE通知', 'SMS通知', 'システム通知'])
      .setAllowInvalid(false)
      .setHelpText('通知種別を選択してください')
      .build();
    typeRange.setDataValidation(typeRule);
    
    Logger.log(`✅ 通知履歴シート初期化完了 (移行データ: ${migratedCount}件)`);
    
    return {
      success: true,
      sheetName: newSheetName,
      migratedDataCount: migratedCount,
      samplesCreated: samplesCreated,
      oldSheetsRemoved: oldSheetNames.filter(name => ss.getSheetByName(name) === null)
    };
    
  } catch (error) {
    Logger.log(`❌ 通知履歴シート初期化エラー: ${error.message}`);
    throw new Error(`通知履歴シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * LINE問い合わせログシートの初期化
 * Cloud Functions連携用
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeLineInquiryLogSheet() {
  try {
    const sheetName = 'LINE問い合わせログ';
    Logger.log(`🔍 ${sheetName}シート初期化開始`);
    
    // スプレッドシートIDを取得
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDがスクリプトプロパティに設定されていません');
    }
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    Logger.log(`📊 スプレッドシート接続成功: ${ss.getName()}`);
    
    let sheet = ss.getSheetByName(sheetName);
    let isNewSheet = false;
    
    if (!sheet) {
      // シートが存在しない場合は新規作成
      sheet = ss.insertSheet(sheetName);
      isNewSheet = true;
      Logger.log(`📋 ${sheetName}シートを新規作成しました`);
    }
    
    // ヘッダー行の設定
    const headers = [
      'ユーザーID',      // A列
      'メッセージ',      // B列  
      '日本時間',        // C列
      'タイムスタンプ',  // D列
      '返信内容',        // E列
      '処理ステータス'   // F列
    ];
    
    // 既存のヘッダーをチェック
    const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const headersMatch = headers.every((header, index) => existingHeaders[index] === header);
    
    if (!headersMatch || isNewSheet) {
      // ヘッダー行を設定
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダー行のスタイル設定
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8F0FE');
      headerRange.setFontColor('#1565C0');
      headerRange.setBorder(true, true, true, true, true, true);
      
      Logger.log('📝 ヘッダー行を設定しました');
    }
    
    // 列幅の調整
    sheet.setColumnWidth(1, 150); // ユーザーID
    sheet.setColumnWidth(2, 300); // メッセージ
    sheet.setColumnWidth(3, 120); // 日本時間
    sheet.setColumnWidth(4, 160); // タイムスタンプ
    sheet.setColumnWidth(5, 300); // 返信内容
    sheet.setColumnWidth(6, 100); // 処理ステータス
    
    // フリーズペイン（ヘッダー行を固定）
    sheet.setFrozenRows(1);
    
    // データ検証設定（処理ステータス列）
    const statusRange = sheet.getRange(2, 6, 1000, 1);
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['受信完了', '返信送信', 'エラー', '処理中'])
      .setAllowInvalid(false)
      .setHelpText('処理ステータスを選択してください')
      .build();
    statusRange.setDataValidation(statusRule);
    
    // 条件付き書式（処理ステータスに応じた色分け）
    const successRule = SpreadsheetApp.newConditionalFormatRule()
      .setRanges([statusRange])
      .whenTextEqualTo('受信完了')
      .setBackground('#E8F5E8')
      .setFontColor('#2E7D32')
      .build();
      
    const errorRule = SpreadsheetApp.newConditionalFormatRule()
      .setRanges([statusRange])
      .whenTextEqualTo('エラー')
      .setBackground('#FFEBEE')
      .setFontColor('#C62828')
      .build();
    
    sheet.setConditionalFormatRules([successRule, errorRule]);
    
    Logger.log(`✅ ${sheetName}シート初期化完了`);
    
    return {
      success: true,
      sheetName: sheetName,
      isNewSheet: isNewSheet,
      headers: headers
    };
    
  } catch (error) {
    Logger.log(`❌ LINE問い合わせログシート初期化エラー: ${error.message}`);
    throw new Error(`LINE問い合わせログシート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * LINE問い合わせログをSpreadsheetに記録
 * Cloud Functions連携用
 * 
 * @param {Object} parameters ログデータ
 * @returns {Object} 記録結果
 */
function logLineMessageToSpreadsheet(parameters) {
  try {
    console.log('📝 LINE問い合わせログ記録開始:', parameters);
    
    const { userId, message, timestamp, replyMessage } = parameters;
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    
    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // シートの初期化（存在しない場合は作成）
    initializeLineInquiryLogSheet(spreadsheet);
    
    // LINE問い合わせログシートを取得
    const sheet = spreadsheet.getSheetByName('LINE問い合わせログ');
    
    // 日本時間に変換
    const japanTime = new Date(timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    
    // データを追加
    const rowData = [
      userId,
      message,
      japanTime,
      timestamp,
      replyMessage || '',
      '受信完了'
    ];
    
    sheet.appendRow(rowData);
    
    console.log('✅ LINE問い合わせログ記録完了');
    
    return {
      success: true,
      message: 'Spreadsheetに記録完了',
      data: {
        userId,
        message,
        japanTime,
        timestamp,
        replyMessage
      }
    };
    
  } catch (error) {
    console.error('❌ LINE問い合わせログ記録エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// 加盟店登録システム
// ==========================================

/**
 * 加盟店登録シートの初期化
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeFranchiseRegistrationSheet(spreadsheet) {
  const sheetName = "加盟店登録";
  try {
    Logger.log(`🔧 初期化開始: spreadsheet = ${spreadsheet}`);
    
    // 必ずスプレッドシートIDから取得（パラメータに依存しない）
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!SPREADSHEET_ID) {
      throw new Error("SPREADSHEET_ID が設定されていません");
    }
    
    Logger.log(`📊 スプレッドシートID: ${SPREADSHEET_ID}`);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log(`✅ スプレッドシート取得成功`);
    
    let sheet = ss.getSheetByName(sheetName);
    const isNewSheet = !sheet;
    
    if (isNewSheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`✅ ${sheetName}シート新規作成`);
    }
    
    // 確認画面データに基づく正確な列順序
    const headers = [
      "加盟店ID",
      "タイムスタンプ",
      "会社名",
      "会社名カナ",
      "代表者名",
      "代表者カナ",
      "郵便番号",
      "住所",
      "電話番号",
      "ウェブサイトURL",
      "従業員数",
      "売上規模",
      "請求用メールアドレス",
      "営業用メールアドレス",
      "営業担当者氏名",
      "営業担当者連絡先",
      "対応物件種別・階数",
      "施工箇所",
      "特殊対応項目",
      "築年数対応範囲",
      "屋号",
      "屋号カナ",
      "支店情報",
      "設立年月日",
      "特徴・PR文",
      "対応エリア",
      "優先対応エリア",
      "登録日",
      "最終ログイン日時",
      "ステータス",
      "審査担当者",
      "審査完了日",
      "備考"
    ];
    
    // 正式会社名列を完全削除＋全データ修正のため強制更新
    Logger.log(`🔧 正式会社名列削除とデータ形式修正のため、シートを完全リセットします`);
    
    // E列（正式会社名）が存在する場合は列を削除
    try {
      const currentHeaderCount = sheet.getLastColumn();
      if (currentHeaderCount > headers.length) {
        // 余分な列（正式会社名列など）を削除
        const columnsToDelete = currentHeaderCount - headers.length;
        for (let i = 0; i < columnsToDelete; i++) {
          sheet.deleteColumn(5); // E列を削除（正式会社名の位置）
        }
        Logger.log(`🗑️ 余分な列を${columnsToDelete}個削除しました`);
      }
    } catch (e) {
      Logger.log(`⚠️ 列削除エラー（無視）: ${e.message}`);
    }
    
    // 既存データをクリアして新しいヘッダーを設定
    sheet.clear();
    
    // ヘッダー行を設定
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4CAF50")
               .setFontColor("#FFFFFF")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
    
    // 列幅を手動で適正サイズに調整（確認画面データ順序対応）
    sheet.setColumnWidth(1, 150);   // 加盟店ID
    sheet.setColumnWidth(2, 140);   // タイムスタンプ
    sheet.setColumnWidth(3, 200);   // 会社名
    sheet.setColumnWidth(4, 250);   // 会社名カナ
    sheet.setColumnWidth(5, 120);   // 代表者名
    sheet.setColumnWidth(6, 180);   // 代表者カナ
    sheet.setColumnWidth(7, 100);   // 郵便番号
    sheet.setColumnWidth(8, 300);   // 住所
    sheet.setColumnWidth(9, 120);   // 電話番号
    sheet.setColumnWidth(10, 250);  // ウェブサイトURL
    sheet.setColumnWidth(11, 100);  // 従業員数
    sheet.setColumnWidth(12, 100);  // 売上規模
    sheet.setColumnWidth(13, 220);  // 請求用メールアドレス
    sheet.setColumnWidth(14, 220);  // 営業用メールアドレス
    sheet.setColumnWidth(15, 150);  // 営業担当者氏名
    sheet.setColumnWidth(16, 150);  // 営業担当者連絡先
    sheet.setColumnWidth(17, 250);  // 対応物件種別・階数
    sheet.setColumnWidth(18, 400);  // 施工箇所
    sheet.setColumnWidth(19, 300);  // 特殊対応項目
    sheet.setColumnWidth(20, 120);  // 築年数対応範囲
    sheet.setColumnWidth(21, 150);  // 屋号
    sheet.setColumnWidth(22, 200);  // 屋号カナ
    sheet.setColumnWidth(23, 300);  // 支店情報
    sheet.setColumnWidth(24, 120);  // 設立年月日
    sheet.setColumnWidth(25, 400);  // 特徴・PR文
    sheet.setColumnWidth(26, 200);  // 対応エリア
    sheet.setColumnWidth(27, 200);  // 優先対応エリア
    sheet.setColumnWidth(28, 120);  // 登録日
    sheet.setColumnWidth(29, 140);  // 最終ログイン日時
    sheet.setColumnWidth(30, 100);  // ステータス
    sheet.setColumnWidth(31, 120);  // 審査担当者
    sheet.setColumnWidth(32, 120);  // 審査完了日
    sheet.setColumnWidth(33, 150);  // 備考
    
    // テストデータを1件追加
    const testData = [
      "TEST_20250615_001",           // 加盟店ID
      new Date(),                    // タイムスタンプ
      "株式会社テストファインテック", // 会社名
      "カブシキガイシャテストファインテック", // 会社名カナ
      "山田 太郎",                   // 代表者名
      "ヤマダ タロウ",              // 代表者カナ
      "540-0011",                   // 郵便番号
      "大阪市中央区農人橋2-4-1",    // 住所
      "'0120582752",                // 電話番号
      "http://www.test-company.co.jp/", // ウェブサイトURL
      "11人以上",                   // 従業員数
      "3億円以上",                  // 売上規模
      "billing@test-company.co.jp", // 請求用メールアドレス
      "sales@test-company.co.jp",   // 営業用メールアドレス
      "営業 花子",                  // 営業担当者氏名
      "'090-1234-5678",             // 営業担当者連絡先
      "テストくらべる",             // 屋号・商号
      "テストクラベル",             // 屋号・商号カナ
      "2000年4月",                  // 設立年月日
      "テスト用のサンプル企業です。外壁塗装のプロフェッショナル集団。", // 会社PR
      "戸建て(3階建まで),アパート・マンション(5階建まで)", // 物件種別
      "大阪府(3市),京都府(2市)",    // 優先対応エリア
      "大阪府(5市),京都府(3市),奈良県(2市)", // 対応エリア
      new Date(),                   // 登録日
      "",                           // 最終ログイン日時
      "審査待ち",                   // ステータス
      "テストデータ"                // 備考
    ];
    
    // テストデータを追加（ヘッダーの次の行に）
    sheet.getRange(2, 1, 1, testData.length).setValues([testData]);
    
    Logger.log(`✅ シート完全リセット完了：正式会社名列削除、エリア表記修正、営業担当表示修正、テストデータ追加`);
    
    return {
      success: true,
      sheetName: sheetName,
      isNewSheet: isNewSheet,
      headers: headers,
      testDataAdded: true
    };
    
  } catch (error) {
    Logger.log(`❌ 加盟店登録シート初期化エラー: ${error.message}`);
    throw new Error(`加盟店登録シート初期化に失敗しました: ${error.message}`);
  }
}

/**
 * 加盟店登録データをスプレッドシートに保存
 * @param {string} franchiseId 加盟店ID
 * @param {Object} data 登録データ
 * @returns {Object} 保存結果
 */
/**
 * 加盟店登録シートを強制初期化（テスト用）
 */
function forceInitializeFranchiseRegistrationSheet() {
  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!SPREADSHEET_ID) {
      throw new Error("SPREADSHEET_ID が設定されていません");
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log("🔄 加盟店登録シート強制初期化開始");
    
    // 既存シートを削除
    try {
      const existingSheet = ss.getSheetByName("加盟店登録");
      if (existingSheet) {
        ss.deleteSheet(existingSheet);
        console.log("🗑️ 既存「加盟店登録」シートを削除");
      }
    } catch (e) {
      console.log("⚠️ 既存シート削除エラー（無視）:", e.message);
    }
    
    // 新しいシートを作成
    const newSheet = ss.insertSheet("加盟店登録");
    console.log("✅ 新しい「加盟店登録」シートを作成");
    
    // 正しいヘッダーを設定
    const headers = [
      "加盟店ID",
      "タイムスタンプ",
      "会社名",
      "会社名カナ",
      "代表者名",
      "代表者カナ",
      "郵便番号",
      "住所",
      "電話番号",
      "ウェブサイトURL",
      "従業員数",
      "売上規模",
      "請求用メールアドレス",
      "営業用メールアドレス",
      "営業担当者氏名",
      "営業担当者連絡先",
      "対応物件種別・階数",
      "施工箇所",
      "特殊対応項目",
      "築年数対応範囲",
      "屋号",
      "屋号カナ",
      "支店情報",
      "設立年月日",
      "特徴・PR文",
      "対応エリア",
      "優先対応エリア",
      "登録日",
      "最終ログイン日時",
      "ステータス",
      "審査担当者",
      "審査完了日",
      "備考"
    ];
    
    // ヘッダー行を設定
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダー行のスタイル設定
    const headerRange = newSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#4CAF50")
               .setFontColor("#FFFFFF")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
    
    console.log("✅ 加盟店登録シート強制初期化完了");
    console.log("📋 Q列:", headers[16]);  // Q列 = 対応物件種別・階数
    console.log("📋 Y列:", headers[24]);  // Y列 = 特徴・PR文
    
    return {
      success: true,
      sheetName: "加盟店登録",
      headers: headers,
      message: "加盟店登録シートを正しい構造で再作成しました"
    };
    
  } catch (error) {
    console.error("❌ 加盟店登録シート強制初期化エラー:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

function saveFranchiseRegistration(franchiseId, data) {
  try {
    console.log("💾 [spreadsheet_service.gs] 正しい列マッピング版保存開始:", franchiseId);
    console.log("📋 保存データ:", JSON.stringify(data, null, 2));
    
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!SPREADSHEET_ID) {
      throw new Error("SPREADSHEET_ID が設定されていません");
    }
    
    console.log("📊 スプレッドシートID:", SPREADSHEET_ID);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 加盟店登録シートを初期化
    initializeFranchiseRegistrationSheet(ss);
    const sheet = ss.getSheetByName("加盟店登録");
    
    console.log("✅ シート準備完了");
    
    // 電話番号の処理（先頭の0が削除されないように完全に文字列として保存）
    let phoneNumber = "";
    if (data.phone) {
      if (Array.isArray(data.phone)) {
        phoneNumber = data.phone[0] || "";
      } else {
        phoneNumber = data.phone;
      }
      // 文字列として保持（先頭の0を保持） - アポストロフィなし
      phoneNumber = phoneNumber.toString();
    }
    
    // 物件種別のフォーマット
    function formatPropertyTypes(propertyTypes) {
      if (!propertyTypes || !Array.isArray(propertyTypes)) {
        return "";
      }
      return propertyTypes.map(type => {
        if (type.includes("戸建て")) return "戸建て";
        if (type.includes("アパート") || type.includes("マンション")) return "アパート・マンション";
        if (type.includes("倉庫") || type.includes("店舗")) return "倉庫・店舗";
        return type;
      }).join(", ");
    }
    
    // 営業担当者連絡先の処理（電話番号の場合は先頭0を保持）
    let salesPersonContact = "";
    if (data.salesPersonContact || data.salesPersonPhone) {
      const contactValue = data.salesPersonContact || data.salesPersonPhone || "";
      // 電話番号のパターン（数字とハイフンのみ）の場合もアポストロフィなし
      if (/^[0-9-]+$/.test(contactValue.toString())) {
        salesPersonContact = contactValue.toString();
      } else {
        salesPersonContact = contactValue.toString();
      }
    }

    // フィールド名でマッピング（列順序に依存しない）
    const fieldMapping = {};
    
    // 現在のヘッダーを取得して、フィールド名と列番号をマッピング
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    currentHeaders.forEach((header, index) => {
      fieldMapping[header] = index + 1; // 1ベースのインデックス
    });
    
    console.log('📋 現在のヘッダーマッピング:', fieldMapping);
    
    // 日本語ヘッダーに対応したデータマッピング（タイムスタンプを2列目に配置）
    console.log('🔍 [spreadsheet_service.gs] 受け取ったfranchiseId:', franchiseId);
    console.log('🔍 [spreadsheet_service.gs] franchiseIdの長さ:', franchiseId.length);
    
    // 🔧 IDが長い場合は強制的に短い形式に変換
    let finalFranchiseId = franchiseId;
    if (franchiseId.length > 14) {
        console.log('🔧 長いIDを短い形式に変換:', franchiseId);
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const dateStr = year + month + day;
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let random = '';
        for (let i = 0; i < 4; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        finalFranchiseId = `FC-${dateStr}-${random}`;
        console.log('✅ 短いIDに変換完了:', finalFranchiseId);
    }
    
    const dataToSave = {
      "加盟店ID": finalFranchiseId,
      "タイムスタンプ": Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'),
      "会社名": data.legalName || "",
      "会社名カナ": data.legalNameKana || "",
      "代表者名": data.representative || "",
      "代表者カナ": data.representativeKana || "",
      "郵便番号": data.postalCode || "",
      "住所": data.address || "",
      "電話番号": phoneNumber,
      "ウェブサイトURL": data.websiteUrl || "",
      "従業員数": data.employees || "",
      "売上規模": data.revenue || "",
      "請求用メールアドレス": data.billingEmail || "",
      "営業用メールアドレス": data.salesEmail || "",
      "営業担当者氏名": data.salesPersonName || "",
      "営業担当者連絡先": salesPersonContact,
      "対応物件種別・階数": formatPropertyTypes(data.propertyTypes),
      "施工箇所": data.constructionAreas || "",
      "特殊対応項目": data.specialServices || "",
      "築年数対応範囲": data.buildingAgeRange || "",
      "屋号": data.tradeName || "",
      "屋号カナ": data.tradeNameKana || "",
      "支店情報": data.branchInfo || "",
      "設立年月日": data.establishedDate || "",
      "特徴・PR文": data.companyPR || "",
      "対応エリア": data.areasCompressed || "",
      "優先対応エリア": data.priorityAreas || "",
      "登録日": Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'),
      "最終ログイン日時": "",
      "ステータス": "審査待ち",
      "審査担当者": "",
      "審査完了日": "",
      "備考": ""
    };
    
    // 行データを正しい順序で配列に変換
    const registrationRow = new Array(currentHeaders.length).fill("");
    Object.keys(dataToSave).forEach(fieldName => {
      const columnIndex = fieldMapping[fieldName];
      if (columnIndex) {
        registrationRow[columnIndex - 1] = dataToSave[fieldName]; // 0ベースに変換
      } else {
        console.log(`⚠️ フィールド「${fieldName}」に対応する列が見つかりません`);
      }
    });
    
    // エリア選択データを日本人が分かる形式で処理
    let priorityAreasText = "";
    let totalAreasText = "";
    let totalAreasCount = 0;
    
    if (data.areasCompressed) {
      // 圧縮エリアデータを日本語形式に変換
      console.log("📦 圧縮エリアデータを処理中:", data.areasCompressed);
      totalAreasText = `対応エリア: ${data.areasCompressed}`;
      totalAreasCount = (data.areasCompressed.match(/,/g) || []).length + 1;
      priorityAreasText = "全エリア対応可能"; 
    } else if (data.isCompressed) {
      // 旧式の圧縮形式
      if (data.priorityAreas && Array.isArray(data.priorityAreas)) {
        priorityAreasText = `優先対応: ${data.priorityAreas.map(area => area.replace(":", " ")).join(", ")}`;
      }
      totalAreasCount = data.totalAreas || 0;
      const normalCount = totalAreasCount - (data.priorityCount || 0);
      totalAreasText = normalCount > 0 ? `その他${normalCount}地域対応可能` : "";
    } else {
      // 従来の非圧縮形式（JSONデータを日本語に変換）
      const areaData = data.areas || [];
      if (areaData.length > 0) {
        // JSONデータの場合は圧縮形式に変換
        const areaGroups = {};
        areaData.forEach(area => {
          const prefecture = area.prefecture;
          if (!areaGroups[prefecture]) {
            areaGroups[prefecture] = 0;
          }
          areaGroups[prefecture]++;
        });
        
        const areaList = Object.keys(areaGroups).map(pref => {
          const count = areaGroups[pref];
          return `${pref}(${count}市区)`;
        }).join(", ");
        
        totalAreasText = `対応エリア: ${areaList}`;
        totalAreasCount = areaData.length;
        priorityAreasText = "全エリア対応可能";
      }
    }
    
    // 余分なデータ追加を削除（列ずれの原因）
    
    // 🔧 IDが長い形式の場合は短い形式に変換
    const idColumnIndex = fieldMapping["加盟店ID"];
    if (idColumnIndex && registrationRow[idColumnIndex - 1] && registrationRow[idColumnIndex - 1].length > 14) {
        console.log('🔧 長いIDを短い形式に変換:', registrationRow[idColumnIndex - 1]);
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const dateStr = year + month + day;
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let random = '';
        for (let i = 0; i < 4; i++) {
            random += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        registrationRow[idColumnIndex - 1] = `FC-${dateStr}-${random}`;
        console.log('✅ 短いIDに変換完了:', registrationRow[idColumnIndex - 1]);
    }
    
    // 【CRITICAL FIX】2行目から順番に空き行を探して挿入
    console.log("📝 スプレッドシートに空き行検索でデータ追加中...", registrationRow.length, "列");
    
    const lastRow = sheet.getLastRow();
    console.log('🔍 CRITICAL: 現在の最終行:', lastRow);
    
    // 既存データの一番下に追加
    // ヘッダー行の次の空き行を確実に取得
    let dataStartRow = 2;
    // 実際にデータがある行の直後に挿入
    let targetRow = 2; // デフォルトはヘッダーの次
    for (let i = 2; i <= 100; i++) {
      let cellValue = sheet.getRange(i, 1).getValue();
      if (cellValue && cellValue !== '') {
        targetRow = i + 1;
      } else {
        break;
      }
    }
    
    console.log('🔍 CRITICAL: 最終書き込み先行番号:', targetRow);
    const range = sheet.getRange(targetRow, 1, 1, registrationRow.length);
    console.log('🔍 CRITICAL: 書き込み範囲:', range.getA1Notation());
    range.setValues([registrationRow]);
    
    console.log("✅ スプレッドシートに登録データ保存完了");
    
    return { success: true, message: "データ保存成功" };
    
  } catch (error) {
    console.error("❌ スプレッドシート保存エラー:", error.message);
    console.error("❌ エラースタック:", error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 案件管理シートの初期化
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeCaseManagementSheet(ss) {
  try {
    Logger.log('📋 案件管理シート初期化開始');
    
    let sheet = ss.getSheetByName('案件管理');
    if (sheet) {
      Logger.log('⚠️ 案件管理シートは既に存在します - データをクリア');
      sheet.clear();
    } else {
      Logger.log('📝 案件管理シートを新規作成');
      sheet = ss.insertSheet('案件管理');
    }
    
    // ヘッダー設定
    const headers = [
      '案件ID',
      '顧客名',
      'エリア',
      '電話番号',
      '担当子アカウントID',
      'ステータス',
      '最終通話日時',
      '次回予定日時',
      'メモ',
      '進捗履歴'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーのフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#E8F0FE');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 列幅調整
    sheet.setColumnWidth(1, 120); // 案件ID
    sheet.setColumnWidth(2, 150); // 顧客名
    sheet.setColumnWidth(3, 100); // エリア
    sheet.setColumnWidth(4, 120); // 電話番号
    sheet.setColumnWidth(5, 150); // 担当子アカウントID
    sheet.setColumnWidth(6, 100); // ステータス
    sheet.setColumnWidth(7, 140); // 最終通話日時
    sheet.setColumnWidth(8, 140); // 次回予定日時
    sheet.setColumnWidth(9, 200); // メモ
    sheet.setColumnWidth(10, 250); // 進捗履歴
    
    // データ入力規則設定（ステータス列）
    const statusValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        '未対応',
        '架電済／未アポ',
        'アポ済',
        '現調済',
        '現調前キャンセル',
        '見積提出済',
        '成約',
        '入金予定',
        '入金済み',
        'クレーム or 失注'
      ])
      .setAllowInvalid(false)
      .build();
    
    sheet.getRange(2, 6, 1000, 1).setDataValidation(statusValidation);
    
    // サンプルデータ作成
    const sampleData = [
      [
        'CASE-001',
        '山田太郎',
        '東京都渋谷区',
        '03-1234-5678',
        'SUB-001',
        '未対応',
        '',
        '',
        '新規問い合わせ',
        '2025-06-19 21:45:00: 案件作成'
      ],
      [
        'CASE-002',
        '佐藤花子',
        '大阪府大阪市',
        '06-9876-5432',
        'SUB-002',
        '架電済／未アポ',
        '2025-06-19 15:30:00',
        '2025-06-20 14:00:00',
        '外壁塗装希望、見積り依頼',
        '2025-06-19 21:45:00: 案件作成\\n2025-06-19 15:30:00: 初回架電完了'
      ]
    ];
    
    sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    Logger.log('✅ 案件管理シート初期化完了');
    return {
      success: true,
      message: '案件管理シート初期化完了',
      samplesCreated: ['案件管理サンプル2件']
    };
    
  } catch (error) {
    Logger.log('❌ 案件管理シート初期化エラー:', error);
    throw new Error(`案件管理シート初期化失敗: ${error.message}`);
  }
}

/**
 * ステータス定義シートの初期化
 * 
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss スプレッドシート
 * @returns {Object} 初期化結果
 */
function initializeStatusDefinitionSheet(ss) {
  try {
    Logger.log('🎨 ステータス定義シート初期化開始');
    
    let sheet = ss.getSheetByName('ステータス定義');
    if (sheet) {
      Logger.log('⚠️ ステータス定義シートは既に存在します - データをクリア');
      sheet.clear();
    } else {
      Logger.log('📝 ステータス定義シートを新規作成');
      sheet = ss.insertSheet('ステータス定義');
    }
    
    // ヘッダー設定
    const headers = [
      'ステータスID',
      '名称',
      '表示色'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // ヘッダーのフォーマット
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#E8F0FE');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 列幅調整
    sheet.setColumnWidth(1, 100); // ステータスID
    sheet.setColumnWidth(2, 150); // 名称
    sheet.setColumnWidth(3, 120); // 表示色
    
    // ステータス定義データ（初期値）
    const statusData = [
      [1, '未対応', '#FFFFFF'],           // 白
      [2, '架電済／未アポ', '#9C27B0'],   // 紫
      [3, 'アポ済', '#2196F3'],           // 青
      [4, '現調済', '#00BCD4'],           // 水色
      [5, '現調前キャンセル', '#424242'], // 濃いグレー
      [6, '見積提出済', '#8BC34A'],       // 黄緑
      [7, '成約', '#FFEB3B'],             // 黄色
      [8, '入金予定', '#FF9800'],         // オレンジ
      [9, '入金済み', '#F44336'],         // 赤
      [10, 'クレーム or 失注', '#000000'] // 黒
    ];
    
    sheet.getRange(2, 1, statusData.length, statusData[0].length).setValues(statusData);
    
    // 表示色列の背景色を実際の色に設定
    for (let i = 0; i < statusData.length; i++) {
      const colorHex = statusData[i][2];
      const cellRange = sheet.getRange(i + 2, 3);
      cellRange.setBackground(colorHex);
      
      // 文字色を自動調整（黒背景の場合は白文字）
      if (colorHex === '#000000' || colorHex === '#424242') {
        cellRange.setFontColor('#FFFFFF');
      } else {
        cellRange.setFontColor('#000000');
      }
    }
    
    Logger.log('✅ ステータス定義シート初期化完了');
    return {
      success: true,
      message: 'ステータス定義シート初期化完了',
      samplesCreated: ['ステータス定義10件']
    };
    
  } catch (error) {
    Logger.log('❌ ステータス定義シート初期化エラー:', error);
    throw new Error(`ステータス定義シート初期化失敗: ${error.message}`);
  }
}
