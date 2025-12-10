/**
 * ====================================
 * 加盟店 成約報告システム
 * ====================================
 *
 * 【機能】
 * - 配信済み案件一覧取得
 * - 成約報告登録
 *
 * 【依存関係】
 * - 配信管理シート（読み取り） ← 主データソース
 * - ユーザー登録シート（読み取り・書き込み） ← 顧客情報JOIN用 & 成約情報更新
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（成約報告メニュー）
 *
 * 【変更時の注意】
 * ⚠️  配信管理シートの「配信ステータス」は「配信済み」（末尾に「み」）
 * ⚠️  加盟店IDは直接比較（includes不要）
 * ⚠️  管理ステータスの遷移ロジックに注意
 */

/**
 * 連絡履歴JSONをパースするヘルパー関数
 * @param {string} jsonStr - JSON文字列
 * @return {Array} - パース結果（配列）
 */
function parseCallHistoryJSON(jsonStr) {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[parseCallHistoryJSON] Parse error:', e.message);
    return [];
  }
}

/**
 * V2091: 日付値をフォーマットするヘルパー関数
 * スプレッドシートから取得したDateオブジェクトを日本時間の文字列に変換
 * @param {Date|string} value - 日付値
 * @return {string} - フォーマット済み文字列（yyyy/M/d H:mm形式）
 */
function formatDateValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy/M/d H:mm');
  }
  return String(value);
}

var MerchantContractReport = {
  /**
   * 配信済み案件一覧を取得（成約報告対象）
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success: boolean, cases: Array }
   */
  getDeliveredCases: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      console.log('[MerchantContractReport] getDeliveredCases - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!deliverySheet) {
        return {
          success: false,
          error: '配信管理シートが見つかりません'
        };
      }

      if (!userSheet) {
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // ユーザー登録シートから顧客情報マップを作成（CV ID → 顧客情報）
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const userCvIdIdx = userHeaders.indexOf('CV ID');
      const userNameIdx = userHeaders.indexOf('氏名');
      const userNameKanaIdx = userHeaders.indexOf('フリガナ');
      const userTelIdx = userHeaders.indexOf('電話番号');
      const userPrefectureIdx = userHeaders.indexOf('都道府県（物件）');
      const userCityIdx = userHeaders.indexOf('市区町村（物件）');
      const userAddressDetailIdx = userHeaders.indexOf('住所詳細（物件）');
      const userAddressKanaIdx = userHeaders.indexOf('住所フリガナ');
      const userWorkCategoryIdx = userHeaders.indexOf('工事種別');
      const userContractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');

      // CV ID → ユーザー情報マップ
      const userMap = {};
      userRows.forEach(row => {
        const cvId = row[userCvIdIdx];
        if (cvId) {
          const prefecture = userPrefectureIdx >= 0 ? (row[userPrefectureIdx] || '') : '';
          const city = userCityIdx >= 0 ? (row[userCityIdx] || '') : '';
          const addressDetail = userAddressDetailIdx >= 0 ? (row[userAddressDetailIdx] || '') : '';
          const fullAddress = prefecture + city + addressDetail;

          userMap[cvId] = {
            customerName: row[userNameIdx] || '',
            customerNameKana: userNameKanaIdx >= 0 ? (row[userNameKanaIdx] || '') : '',
            tel: row[userTelIdx] || '',
            address: fullAddress,
            addressKana: userAddressKanaIdx >= 0 ? (row[userAddressKanaIdx] || '') : '',
            workCategory: row[userWorkCategoryIdx] || '',
            contractMerchantId: row[userContractMerchantIdIdx] || ''
          };
        }
      });

      // 配信管理シートから配信済み案件を取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const deliveryRows = deliveryData.slice(1);

      const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
      const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
      const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');
      const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');
      const delDetailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');
      const delSurveyDateIdx = deliveryHeaders.indexOf('現調日時');
      const delEstimateDateIdx = deliveryHeaders.indexOf('商談日時');

      // 配信済み案件を抽出（この加盟店に配信されていて、まだこの加盟店が成約報告していないもの）
      const deliveredCases = [];

      for (let i = 0; i < deliveryRows.length; i++) {
        const row = deliveryRows[i];
        const cvId = row[delCvIdIdx];
        const rowMerchantId = row[delMerchantIdIdx];
        const deliveredAt = row[delDeliveredAtIdx];
        const deliveryStatus = row[delStatusIdx];
        const detailStatus = row[delDetailStatusIdx];

        // 空行スキップ
        if (!cvId) continue;

        // この加盟店に配信されているか確認（完全一致）
        if (rowMerchantId !== merchantId && rowMerchantId !== String(merchantId)) {
          continue;
        }

        // 配信ステータスが「配信済み」（末尾に「み」）
        if (deliveryStatus !== '配信済み') {
          continue;
        }

        // ユーザー情報を取得
        const userInfo = userMap[cvId];
        if (!userInfo) {
          continue; // ユーザー登録シートにない案件はスキップ
        }

        // すでにこの加盟店が成約報告済みの場合はスキップ
        if (userInfo.contractMerchantId === merchantId || userInfo.contractMerchantId === String(merchantId)) {
          continue;
        }

        // 現調日時・商談日時を取得
        const surveyDate = delSurveyDateIdx >= 0 ? (row[delSurveyDateIdx] || '') : '';
        const estimateDate = delEstimateDateIdx >= 0 ? (row[delEstimateDateIdx] || '') : '';

        // 案件情報を追加
        deliveredCases.push({
          cvId: cvId,
          customerName: userInfo.customerName,
          customerNameKana: userInfo.customerNameKana,
          tel: userInfo.tel,
          address: userInfo.address,
          addressKana: userInfo.addressKana,
          workCategory: userInfo.workCategory,
          deliveredAt: deliveredAt || '',
          managementStatus: detailStatus || '配信済み',
          surveyDate: surveyDate,
          estimateDate: estimateDate
        });
      }

      console.log('[MerchantContractReport] getDeliveredCases - 取得件数:', deliveredCases.length);

      return {
        success: true,
        cases: deliveredCases
      };

    } catch (error) {
      console.error('[MerchantContractReport] getDeliveredCases error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 成約報告を登録
   * @param {Object} params - {
   *   merchantId: 加盟店ID,
   *   merchantName: 加盟店名,
   *   cvId: CV ID,
   *   reportType: 報告種別（成約報告/追加工事報告）,
   *   currentStatus: 現在の状況（契約前・口頭確約済/契約後・工事前/工事中/工事完了後）,
   *   contractDate: 成約日,
   *   contractAmount: 成約金額（税込）,
   *   constructionEndDate: 完工予定日,
   *   paymentDueDate: 着金予定日,
   *   propertyType: 対象物件種別,
   *   floors: 階数,
   *   workContent: 施工内容（配列）,
   *   estimateFileUrl: 見積書URL,
   *   receiptFileUrl: 領収書URL
   * }
   * @return {Object} - { success: boolean }
   */
  submitContractReport: function(params) {
    try {
      const {
        merchantId,
        merchantName,
        cvId,
        reportType,
        currentStatus,
        contractDate,
        contractAmount,
        constructionEndDate,
        paymentDueDate,
        propertyType,
        floors,
        workContent,
        estimateFileUrl,
        receiptFileUrl,
        // V2162: 新規パラメータ
        paymentStatus,
        paymentConfirmDate,
        paymentAmount,
        paymentSchedule,
        constructionStatus: constructionStatusParam,
        constructionStartDate,
        constructionScheduleEstimate,
        newStatus,
        contractFileUrl
      } = params;

      // バリデーション
      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '必須パラメータが不足しています（merchantId, cvId）'
        };
      }

      if (!contractAmount) {
        return {
          success: false,
          error: '成約金額は必須です'
        };
      }

      console.log('[MerchantContractReport] submitContractReport - CV ID:', cvId, '加盟店ID:', merchantId, 'V2162 newStatus:', newStatus);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!userSheet) {
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // ヘッダーとデータ取得
      const data = userSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // 必要なカラムのインデックス取得
      const cvIdIdx = headers.indexOf('CV ID');
      const contractMerchantIdIdx = headers.indexOf('成約加盟店ID');
      const contractMerchantNameIdx = headers.indexOf('成約加盟店名');
      const contractDateIdx = headers.indexOf('成約日');
      const contractAmountIdx = headers.indexOf('成約金額');
      const workContentIdx = headers.indexOf('見積工事内容');
      const paymentDueDateIdx = headers.indexOf('入金予定日');
      const managementStatusIdx = headers.indexOf('管理ステータス');
      const constructionEndDateIdx = headers.indexOf('工事完了予定日');
      const constructionStatusIdx = headers.indexOf('工事進捗ステータス');
      const additionalWorkFlagIdx = headers.indexOf('追加工事フラグ');
      const propertyTypeIdx = headers.indexOf('Q1_物件種別');
      const floorsIdx = headers.indexOf('Q2_階数');
      const contractReportDateIdx = headers.indexOf('成約報告日');
      // V2162: 追加カラム
      const paymentConfirmDateIdx = headers.indexOf('入金確認日');
      const paymentAmountIdx = headers.indexOf('入金額');
      const constructionStartDateIdx = headers.indexOf('工事開始予定日');

      // CV IDで行を検索
      let targetRow = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][cvIdIdx] === cvId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定されたCV IDが見つかりません: ' + cvId
        };
      }

      // 報告種別に応じた処理
      const isAdditionalWork = reportType === '追加工事報告';

      // 追加工事報告でない場合のみ成約加盟店IDをチェック
      if (!isAdditionalWork) {
        const currentContractMerchantId = rows[targetRow - 2][contractMerchantIdIdx];
        if (currentContractMerchantId && currentContractMerchantId !== '') {
          return {
            success: false,
            error: 'この案件はすでに成約報告済みです（加盟店ID: ' + currentContractMerchantId + '）'
          };
        }
      }

      // V2162: 管理ステータスを決定（newStatusを優先）
      let newManagementStatus = newStatus || '成約';
      let constructionStatus = '';

      // V2162: 入金済みの場合
      if (paymentStatus === 'paid') {
        newManagementStatus = '入金済';
      } else if (paymentDueDate || paymentSchedule) {
        newManagementStatus = '入金予定';
      }

      // 工事進捗ステータス判定
      if (constructionStatusParam === 'scheduled') {
        constructionStatus = '工事予定';
      } else if (currentStatus === '契約前・口頭確約済') {
        constructionStatus = '契約前';
      } else if (currentStatus === '契約後・工事前') {
        constructionStatus = '工事前';
      } else if (currentStatus === '工事中') {
        constructionStatus = '工事中';
      } else if (currentStatus === '工事完了後') {
        constructionStatus = '工事完了';
      }

      // V2166: データ更新（通常の成約報告の場合）- カラム存在チェック追加
      if (!isAdditionalWork) {
        if (contractMerchantIdIdx !== -1) {
          userSheet.getRange(targetRow, contractMerchantIdIdx + 1).setValue(merchantId);
        }
        if (contractMerchantNameIdx !== -1) {
          userSheet.getRange(targetRow, contractMerchantNameIdx + 1).setValue(merchantName || '');
        }
        if (contractReportDateIdx !== -1) {
          userSheet.getRange(targetRow, contractReportDateIdx + 1).setValue(new Date());
        }
      }

      // 共通項目の更新
      if (contractDate && contractDateIdx !== -1) {
        userSheet.getRange(targetRow, contractDateIdx + 1).setValue(contractDate);
      }

      if (contractAmountIdx !== -1) {
        userSheet.getRange(targetRow, contractAmountIdx + 1).setValue(contractAmount);
      }

      // 施工内容（配列を文字列に変換）
      if (workContentIdx !== -1) {
        if (workContent && Array.isArray(workContent)) {
          const workContentStr = workContent.join('、');
          userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContentStr);
        } else if (workContent) {
          userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContent);
        }
      }

      // V2162: 入金関連
      if (paymentStatus === 'paid') {
        // 入金済み
        if (paymentConfirmDate && paymentConfirmDateIdx !== -1) {
          userSheet.getRange(targetRow, paymentConfirmDateIdx + 1).setValue(paymentConfirmDate);
        }
        if (paymentAmount && paymentAmountIdx !== -1) {
          userSheet.getRange(targetRow, paymentAmountIdx + 1).setValue(paymentAmount);
        }
      } else {
        // 未入金
        if (paymentDueDate && paymentDueDateIdx !== -1) {
          userSheet.getRange(targetRow, paymentDueDateIdx + 1).setValue(paymentDueDate);
        }
      }

      // V2162: 工事予定関連
      if (constructionStartDate && constructionStartDateIdx !== -1) {
        userSheet.getRange(targetRow, constructionStartDateIdx + 1).setValue(constructionStartDate);
      }
      if (constructionEndDate && constructionEndDateIdx !== -1) {
        userSheet.getRange(targetRow, constructionEndDateIdx + 1).setValue(constructionEndDate);
      }

      if (propertyType && propertyTypeIdx !== -1) {
        userSheet.getRange(targetRow, propertyTypeIdx + 1).setValue(propertyType);
      }

      if (floors && floorsIdx !== -1) {
        userSheet.getRange(targetRow, floorsIdx + 1).setValue(floors);
      }

      // 工事進捗ステータス
      if (constructionStatus && constructionStatusIdx !== -1) {
        userSheet.getRange(targetRow, constructionStatusIdx + 1).setValue(constructionStatus);
      }

      // 追加工事フラグ
      if (isAdditionalWork && additionalWorkFlagIdx !== -1) {
        userSheet.getRange(targetRow, additionalWorkFlagIdx + 1).setValue(true);
      }

      // V2166: 管理ステータス更新
      if (managementStatusIdx !== -1) {
        userSheet.getRange(targetRow, managementStatusIdx + 1).setValue(newManagementStatus);
      }

      // V2162: 成約データシートにも登録
      this._saveToContractSheet(ss, {
        cvId,
        merchantId,
        merchantName,
        contractAmount,
        paymentStatus,
        paymentConfirmDate,
        paymentAmount,
        paymentDueDate,
        paymentSchedule,
        constructionStatusParam,
        constructionStartDate,
        constructionEndDate,
        constructionScheduleEstimate,
        propertyType,
        floors,
        workContent,
        contractFileUrl,
        newManagementStatus
      });

      console.log('[MerchantContractReport] submitContractReport - 成約報告完了:', cvId, '報告種別:', reportType, 'ステータス:', newManagementStatus);

      const successMessage = isAdditionalWork ? '追加工事報告を登録しました' : '成約報告を登録しました';

      return {
        success: true,
        message: successMessage,
        data: {
          cvId: cvId,
          managementStatus: newManagementStatus,
          constructionStatus: constructionStatus
        }
      };

    } catch (error) {
      console.error('[MerchantContractReport] submitContractReport error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * V2162: 成約データシートへの保存
   */
  _saveToContractSheet: function(ss, data) {
    try {
      const contractSheet = ss.getSheetByName('成約データ');
      if (!contractSheet) {
        console.log('[MerchantContractReport] 成約データシートが見つかりません');
        return;
      }

      const headers = contractSheet.getRange(1, 1, 1, contractSheet.getLastColumn()).getValues()[0];

      // カラムインデックス取得
      const getIdx = (name) => headers.indexOf(name);

      // CV IDで既存行を検索
      const cvIdIdx = getIdx('CV ID');
      if (cvIdIdx === -1) {
        console.log('[MerchantContractReport] CV IDカラムが見つかりません');
        return;
      }

      const allData = contractSheet.getDataRange().getValues();
      let targetRow = -1;
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][cvIdIdx] === data.cvId) {
          targetRow = i + 1;
          break;
        }
      }

      // 更新するデータを準備
      const updates = {
        'CV ID': data.cvId,
        '成約加盟店ID': data.merchantId,
        '成約加盟店名': data.merchantName || '',
        '成約報告日': new Date(),
        '成約金額': data.contractAmount,
        '管理ステータス': data.newManagementStatus,
        '入金確認日': data.paymentConfirmDate || '',
        '入金額': data.paymentAmount || '',
        '入金予定日': data.paymentDueDate || '',
        '工事開始予定日': data.constructionStartDate || '',
        '工事完了予定日': data.constructionEndDate || '',
        '契約書URL': data.contractFileUrl || ''
      };

      // 施工内容
      if (data.workContent) {
        const workContentStr = Array.isArray(data.workContent) ? data.workContent.join('、') : data.workContent;
        updates['見積工事内容'] = workContentStr;
      }

      if (targetRow === -1) {
        // 新規行追加
        targetRow = contractSheet.getLastRow() + 1;
        console.log('[MerchantContractReport] 成約データ新規追加:', targetRow);
      }

      // 各カラムを更新
      for (const [colName, value] of Object.entries(updates)) {
        const colIdx = getIdx(colName);
        if (colIdx !== -1 && value !== undefined) {
          contractSheet.getRange(targetRow, colIdx + 1).setValue(value);
        }
      }

      console.log('[MerchantContractReport] 成約データシート更新完了:', data.cvId);
    } catch (error) {
      console.error('[MerchantContractReport] _saveToContractSheet error:', error);
    }
  },

  /**
   * V2162: 契約書ファイルをGoogle Driveにアップロード
   * @param {Object} params - { fileName, fileType, fileData, cvId, merchantId }
   * @return {Object} - { success, fileUrl }
   */
  uploadContractFile: function(params) {
    try {
      const { fileName, fileType, fileData, cvId, merchantId } = params;

      if (!fileName || !fileData) {
        return {
          success: false,
          error: 'ファイル名またはファイルデータが不足しています'
        };
      }

      console.log('[MerchantContractReport] uploadContractFile - CV ID:', cvId, 'ファイル名:', fileName);

      // Base64デコード
      const blob = Utilities.newBlob(
        Utilities.base64Decode(fileData),
        fileType || 'application/octet-stream',
        fileName
      );

      // 契約書保存用フォルダを取得または作成
      const folderId = this._getOrCreateContractFolder();
      const folder = DriveApp.getFolderById(folderId);

      // ファイル名にCV IDを付与
      const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss');
      const newFileName = `${cvId}_${timestamp}_${fileName}`;

      // ファイルを作成
      const file = folder.createFile(blob.setName(newFileName));

      // 共有設定（リンクを知っている人は閲覧可能）
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileUrl = file.getUrl();

      console.log('[MerchantContractReport] uploadContractFile - 成功:', fileUrl);

      return {
        success: true,
        fileUrl: fileUrl,
        fileName: newFileName
      };

    } catch (error) {
      console.error('[MerchantContractReport] uploadContractFile error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * V2162: 契約書保存用フォルダを取得または作成
   * @return {string} - フォルダID
   */
  _getOrCreateContractFolder: function() {
    const ROOT_FOLDER_NAME = 'くらべる管理';
    const CONTRACT_FOLDER_NAME = '契約書';

    try {
      // ルートフォルダを検索
      const rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
      let rootFolder;

      if (rootFolders.hasNext()) {
        rootFolder = rootFolders.next();
      } else {
        // ルートフォルダ作成
        rootFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
      }

      // 契約書フォルダを検索
      const contractFolders = rootFolder.getFoldersByName(CONTRACT_FOLDER_NAME);

      if (contractFolders.hasNext()) {
        return contractFolders.next().getId();
      } else {
        // 契約書フォルダ作成
        const newFolder = rootFolder.createFolder(CONTRACT_FOLDER_NAME);
        return newFolder.getId();
      }

    } catch (error) {
      console.error('[MerchantContractReport] _getOrCreateContractFolder error:', error);
      throw error;
    }
  },

  /**
   * V2022: 加盟店向け案件一覧取得（ユーザー登録からの全情報取得対応）
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success, cases, stats }
   */
  getMerchantCases: function(params) {
    const merchantId = params.merchantId;
    console.log('[MerchantContractReport] getMerchantCases V2022 - merchantId:', merchantId);

    if (!merchantId) {
      return { success: false, error: '加盟店IDが必要です' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');
      const cancelSheet = ss.getSheetByName('キャンセル申請');

      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }
      if (!userSheet) {
        return { success: false, error: 'ユーザー登録シートが見つかりません' };
      }

      // ============================================
      // V2153: キャンセル申請シートからCV ID → 申請ステータスマップ作成
      // ============================================
      const cancelMap = {};
      if (cancelSheet) {
        const cancelData = cancelSheet.getDataRange().getValues();
        const cancelHeaders = cancelData[0];
        const cancelCol = {};
        cancelHeaders.forEach((h, i) => { cancelCol[h] = i; });

        for (let i = 1; i < cancelData.length; i++) {
          const row = cancelData[i];
          const cvId = row[cancelCol['CV ID']];
          const rowMerchantId = row[cancelCol['加盟店ID']];
          if (!cvId) continue;
          // この加盟店の申請のみ
          if (String(rowMerchantId) !== String(merchantId)) continue;

          const status = row[cancelCol['承認ステータス']] || '申請中';
          const rejectReason = row[cancelCol['却下理由']] || '';
          const appliedAt = row[cancelCol['タイムスタンプ']];
          const approvedAt = row[cancelCol['承認日時']];

          // 同じCV IDで複数申請がある場合は最新を優先
          if (!cancelMap[cvId] || new Date(appliedAt) > new Date(cancelMap[cvId].appliedAt)) {
            cancelMap[cvId] = {
              cancelStatus: status,
              cancelRejectReason: rejectReason,
              cancelAppliedAt: appliedAt ? Utilities.formatDate(new Date(appliedAt), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '',
              cancelApprovedAt: approvedAt ? Utilities.formatDate(new Date(approvedAt), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : ''
            };
          }
        }
      }
      console.log('[MerchantContractReport] キャンセル申請マップ件数:', Object.keys(cancelMap).length);

      // ============================================
      // 1. ユーザー登録シートからCV ID → 顧客情報マップ作成
      // ============================================
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];

      // ユーザー登録シートのカラムインデックス
      const userCol = {};
      userHeaders.forEach((h, i) => { userCol[h] = i; });

      const userMap = {};
      for (let i = 1; i < userData.length; i++) {
        const row = userData[i];
        const cvId = row[userCol['CV ID']];
        if (!cvId) continue;

        userMap[cvId] = {
          // 基本情報
          name: row[userCol['氏名']] || '',
          nameKana: row[userCol['フリガナ']] || '',
          tel: row[userCol['電話番号']] || '',
          email: row[userCol['メールアドレス']] || '',
          gender: row[userCol['性別']] || '',
          age: row[userCol['年齢']] || '',
          contactTime: row[userCol['連絡時間帯']] || '',
          relationship: row[userCol['続柄']] || '',
          searchKeyword: row[userCol['流入検索ワード']] || '',

          // 物件情報
          postalCode: row[userCol['郵便番号（物件）']] || '',
          prefecture: row[userCol['都道府県（物件）']] || '',
          city: row[userCol['市区町村（物件）']] || '',
          addressDetail: row[userCol['住所詳細（物件）']] || '',
          addressKana: row[userCol['住所フリガナ']] || '',
          propertyType: row[userCol['物件種別']] || row[userCol['Q1_物件種別']] || '',
          floors: row[userCol['階数']] || row[userCol['Q2_階数']] || '',
          buildingAge: row[userCol['築年数']] || row[userCol['Q3_築年数']] || '',
          buildingArea: row[userCol['建物面積']] || '',
          googleMapsLink: row[userCol['Google Mapsリンク']] || '',

          // 工事関連
          workHistory: row[userCol['Q4_工事歴']] || '',
          lastConstructionTime: row[userCol['Q5_前回施工時期']] || '',
          exteriorMaterial: row[userCol['Q6_外壁材質']] || '',
          roofMaterial: row[userCol['Q7_屋根材質']] || '',
          concernedAreas: row[userCol['Q8_気になる箇所']] || '',
          exteriorWorkRequest: row[userCol['Q9_希望工事内容_外壁']] || '',
          roofWorkRequest: row[userCol['Q10_希望工事内容_屋根']] || '',
          deteriorationStatus: row[userCol['Q16_現在の劣化状況']] || '',

          // 希望・意向
          estimateAreas: row[userCol['見積もり希望箇所']] || '',
          constructionTiming: row[userCol['施工時期']] || '',
          desiredCompanies: row[userCol['希望社数']] || '',
          existingEstimates: row[userCol['Q11_見積もり保有数']] || '',
          estimateSource: row[userCol['Q12_見積もり取得先']] || '',
          visitingContractor: row[userCol['Q13_訪問業者有無']] || '',
          comparisonIntent: row[userCol['Q14_比較意向']] || '',
          visitingContractorName: row[userCol['Q15_訪問業者名']] || '',
          selectionCriteria: row[userCol['Q17_業者選定条件']] || '',

          // 現調・立会
          inspectionDate: row[userCol['現地調査希望日時']] || '',
          attendanceStatus: row[userCol['立ち会い可否']] || '',
          attendeeRelation: row[userCol['立ち会い者関係性']] || '',

          // 2人目連絡先
          name2: row[userCol['氏名（2人目）']] || '',
          tel2: row[userCol['電話番号（2人目）']] || '',
          relationship2: row[userCol['続柄（2人目）']] || '',
          remarks2: row[userCol['備考（2人目）']] || '',

          // その他
          specialItems: row[userCol['特殊項目']] || '',
          caseMemo: row[userCol['案件メモ']] || '',
          wordLinkAnswer: row[userCol['ワードリンク回答']] || '',

          // 見積もり送付先（物件と異なる場合）
          estimateDestination: row[userCol['見積もり送付先']] || '',
          homePostalCode: row[userCol['郵便番号（自宅）']] || '',
          homePrefecture: row[userCol['都道府県（自宅）']] || '',
          homeAddressDetail: row[userCol['住所詳細（自宅）']] || '',

          // V2085: 担当者（案件振り分け）
          assignee: row[userCol['担当者名']] || ''
        };
      }

      // ============================================
      // 2. 配信管理シートから配信案件取得
      // ============================================
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];

      const delCol = {};
      deliveryHeaders.forEach((h, i) => { delCol[h] = i; });

      // merchantIdから会社名を取得（後方互換性のため）
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      let merchantCompanyName = '';
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[MerchantContractReport] getMerchantCases - merchantId:', merchantId, ', companyName:', merchantCompanyName);

      // 統計初期化
      const stats = {
        total: 0,
        pending: 0,
        visited: 0,
        quoted: 0,
        contracted: 0,
        cancelled: 0,
        // V2153: キャンセル申請関連
        cancelPending: 0,    // 審査中
        cancelApproved: 0,   // 承認済み
        cancelRejected: 0    // 却下
      };

      const cases = [];

      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        const cvId = row[delCol['CV ID']];
        const rowFranchiseId = row[delCol['加盟店ID']];

        if (!cvId) continue;

        // この加盟店に配信された案件のみ（登録ID or 会社名でマッチ）
        if (String(rowFranchiseId) !== String(merchantId) &&
            String(rowFranchiseId) !== String(merchantCompanyName)) continue;

        const deliveryStatus = row[delCol['配信ステータス']] || '';
        const detailStatus = row[delCol['詳細ステータス']] || '';

        // 配信済み以降のステータスのみ
        if (!['配信済み', '成約', '失注'].includes(deliveryStatus)) continue;

        stats.total++;

        // 詳細ステータスで統計
        if (detailStatus === '成約') {
          stats.contracted++;
        } else if (detailStatus === 'キャンセル') {
          stats.cancelled++;
        } else if (detailStatus === '見積提出済み') {
          stats.quoted++;
        } else if (detailStatus === '訪問済み') {
          stats.visited++;
        } else {
          stats.pending++;
        }

        // V2153: キャンセル申請ステータスで統計
        const cancelInfo = cancelMap[cvId];
        if (cancelInfo) {
          if (cancelInfo.cancelStatus === '申請中') {
            stats.cancelPending++;
          } else if (cancelInfo.cancelStatus === '承認済み') {
            stats.cancelApproved++;
          } else if (cancelInfo.cancelStatus === '却下') {
            stats.cancelRejected++;
          }
        }

        // ユーザー登録から顧客情報取得
        const user = userMap[cvId] || {};

        // 住所を結合
        const fullAddress = [user.prefecture, user.city, user.addressDetail].filter(v => v).join('');

        const caseData = {
          // 識別子
          cvId: cvId,
          rowIndex: i + 1,

          // ステータス
          deliveryStatus: deliveryStatus,
          detailStatus: detailStatus || '未対応',
          deliveredAt: row[delCol['配信日時']] ? Utilities.formatDate(new Date(row[delCol['配信日時']]), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '',
          merchantMemo: row[delCol['加盟店メモ']] || '',
          callHistory: parseCallHistoryJSON(row[delCol['連絡履歴JSON']]),
          // V2091: Dateオブジェクトを文字列に変換（タイムゾーン問題回避）
          nextCallDate: formatDateValue(row[delCol['次回連絡予定日時']]),
          callCount: row[delCol['電話回数']] || 0,

          // === お客様情報 ===
          customerName: user.name,
          customerNameKana: user.nameKana,
          customerTel: user.tel,
          customerEmail: user.email,
          customerGender: user.gender,
          customerAge: user.age,
          contactTime: user.contactTime,
          relationship: user.relationship,
          searchKeyword: user.searchKeyword,

          // === 物件情報 ===
          postalCode: user.postalCode,
          prefecture: user.prefecture,
          city: user.city,
          addressDetail: user.addressDetail,
          fullAddress: fullAddress,
          addressKana: user.addressKana,
          propertyType: user.propertyType,
          floors: user.floors,
          buildingAge: user.buildingAge,
          buildingArea: user.buildingArea,
          googleMapsLink: user.googleMapsLink,

          // === 工事関連 ===
          workHistory: user.workHistory,
          lastConstructionTime: user.lastConstructionTime,
          exteriorMaterial: user.exteriorMaterial,
          roofMaterial: user.roofMaterial,
          concernedAreas: user.concernedAreas,
          exteriorWorkRequest: user.exteriorWorkRequest,
          roofWorkRequest: user.roofWorkRequest,
          deteriorationStatus: user.deteriorationStatus,

          // === 希望・意向 ===
          estimateAreas: user.estimateAreas,
          constructionTiming: user.constructionTiming,
          desiredCompanies: user.desiredCompanies,
          existingEstimates: user.existingEstimates,
          estimateSource: user.estimateSource,
          visitingContractor: user.visitingContractor,
          comparisonIntent: user.comparisonIntent,
          visitingContractorName: user.visitingContractorName,
          selectionCriteria: user.selectionCriteria,

          // === 現調・立会 ===
          inspectionDate: user.inspectionDate,
          attendanceStatus: user.attendanceStatus,
          attendeeRelation: user.attendeeRelation,

          // === 2人目連絡先 ===
          name2: user.name2,
          tel2: user.tel2,
          relationship2: user.relationship2,
          remarks2: user.remarks2,

          // === その他 ===
          specialItems: user.specialItems,
          caseMemo: user.caseMemo,
          wordLinkAnswer: user.wordLinkAnswer,

          // === 見積もり送付先 ===
          estimateDestination: user.estimateDestination,
          homePostalCode: user.homePostalCode,
          homePrefecture: user.homePrefecture,
          homeAddressDetail: user.homeAddressDetail,

          // === 現調・商談日時（配信管理シートから） ===
          // V2091: Dateオブジェクトを文字列に変換（タイムゾーン問題回避）
          surveyDate: formatDateValue(row[delCol['現調日時']]),
          estimateDate: formatDateValue(row[delCol['商談日時']]),

          // === V2085: 担当者（案件振り分け） ===
          assignee: user.assignee || '',

          // === V2153: キャンセル申請ステータス ===
          cancelStatus: cancelMap[cvId]?.cancelStatus || null,
          cancelRejectReason: cancelMap[cvId]?.cancelRejectReason || '',
          cancelAppliedAt: cancelMap[cvId]?.cancelAppliedAt || '',
          cancelApprovedAt: cancelMap[cvId]?.cancelApprovedAt || ''
        };

        cases.push(caseData);
      }

      // 配信日時の新しい順でソート
      cases.sort((a, b) => {
        if (!a.deliveredAt) return 1;
        if (!b.deliveredAt) return -1;
        return new Date(b.deliveredAt) - new Date(a.deliveredAt);
      });

      console.log('[MerchantContractReport] getMerchantCases V2022 - found', cases.length, 'cases');

      return {
        success: true,
        cases: cases,
        stats: stats
      };

    } catch (error) {
      console.error('[MerchantContractReport] getMerchantCases error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * V2007: 案件の詳細ステータス更新
   * @param {Object} params - { merchantId, cvId, status }
   * @return {Object} - { success }
   */
  updateCaseStatus: function(params) {
    const { merchantId, cvId, status, oldStatus } = params;
    console.log('[MerchantContractReport] updateCaseStatus:', { merchantId, cvId, status, oldStatus });

    if (!merchantId || !cvId || !status) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    const validStatuses = [
      '新着', '未アポ', 'アポ済', '現調済', '現調前キャンセル', '現調後失注',
      '見積提出済', '成約', '他社契約済', '別加盟店契約済', '入金予定', '入金済', 'クレーム',
      // V2168: 複合ステータス（入金×工事の組み合わせ）と完了
      '未着工', '施工中', '工事済', '完了',
      '入金予定・未着工', '入金予定・施工中', '入金予定・工事済',
      '入金済・未着工', '入金済・施工中', '入金済・工事済'
    ];
    if (!validStatuses.includes(status)) {
      return { success: false, error: '無効なステータスです: ' + status };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      const colIdx = {
        cvId: headers.indexOf('CV ID'),
        franchiseId: headers.indexOf('加盟店ID'),
        detailStatus: headers.indexOf('詳細ステータス'),
        deliveryStatus: headers.indexOf('配信ステータス'),
        caseMemo: headers.indexOf('加盟店メモ')
      };

      // merchantIdから会社名を取得（getMerchantCasesと同じロジック）
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      let merchantCompanyName = '';
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[updateCaseStatus] merchantId:', merchantId, ', companyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowFranchiseId = row[colIdx.franchiseId];
        // merchantId or 会社名でマッチ
        if (String(row[colIdx.cvId]) === String(cvId) &&
            (String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName))) {

          deliverySheet.getRange(i + 1, colIdx.detailStatus + 1).setValue(status);

          if (status === '成約') {
            deliverySheet.getRange(i + 1, colIdx.deliveryStatus + 1).setValue('成約');
          }

          // ステータス変更履歴をメモに追加（oldStatusが異なる場合のみ）
          if (oldStatus && oldStatus !== status && colIdx.caseMemo >= 0) {
            const now = new Date();
            const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'M/d H:mm');
            const statusChangeNote = `🏷️ ${oldStatus} → ${status} (${dateStr})`;
            const currentMemo = row[colIdx.caseMemo] || '';
            const newMemo = currentMemo ? statusChangeNote + '\n' + currentMemo : statusChangeNote;
            deliverySheet.getRange(i + 1, colIdx.caseMemo + 1).setValue(newMemo);
          }

          console.log('[MerchantContractReport] updateCaseStatus - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません' };

    } catch (error) {
      console.error('[MerchantContractReport] updateCaseStatus error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * V2007: 加盟店メモ更新
   * @param {Object} params - { merchantId, cvId, memo }
   * @return {Object} - { success }
   */
  updateCaseMemo: function(params) {
    const { merchantId, cvId, memo } = params;
    console.log('[MerchantContractReport] updateCaseMemo:', { merchantId, cvId, memoLength: (memo || '').length });

    if (!merchantId || !cvId) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      const colIdx = {
        cvId: headers.indexOf('CV ID'),
        franchiseId: headers.indexOf('加盟店ID'),
        merchantMemo: headers.indexOf('加盟店メモ')
      };

      if (colIdx.merchantMemo === -1) {
        return { success: false, error: '加盟店メモ列が見つかりません' };
      }

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (String(row[colIdx.cvId]) === String(cvId) &&
            String(row[colIdx.franchiseId]) === String(merchantId)) {

          deliverySheet.getRange(i + 1, colIdx.merchantMemo + 1).setValue(memo || '');

          console.log('[MerchantContractReport] updateCaseMemo - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません' };

    } catch (error) {
      console.error('[MerchantContractReport] updateCaseMemo error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 次回架電日更新
   * @param {Object} params - { cvId, nextCallDate }
   * @return {Object} - { success }
   */
  updateNextCallDate: function(params) {
    const { merchantId, cvId, nextCallDate } = params;
    console.log('[MerchantContractReport] updateNextCallDate:', { merchantId, cvId, nextCallDate });

    if (!cvId) {
      return { success: false, error: 'cvIdが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const nextCallDateCol = colIdx['次回連絡予定日時'];

      if (nextCallDateCol === undefined) {
        return { success: false, error: '次回連絡予定日時列が見つかりません' };
      }

      // merchantIdがある場合は会社名も取得（updateCallHistoryと同じロジック）
      let merchantCompanyName = '';
      if (merchantId) {
        const franchiseSheet = ss.getSheetByName('加盟店登録');
        if (franchiseSheet) {
          const franchiseData = franchiseSheet.getDataRange().getValues();
          const franchiseHeaders = franchiseData[0];
          const regIdCol = franchiseHeaders.indexOf('登録ID');
          const companyNameCol = franchiseHeaders.indexOf('会社名');

          for (let i = 1; i < franchiseData.length; i++) {
            if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
              merchantCompanyName = franchiseData[i][companyNameCol];
              break;
            }
          }
        }
      }
      console.log('[MerchantContractReport] updateNextCallDate - merchantCompanyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (merchantIdなし OR 登録ID/会社名でマッチ)
        const cvMatch = String(rowCvId) === String(cvId);
        const merchantMatch = !merchantId || String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName);

        if (cvMatch && merchantMatch) {
          deliverySheet.getRange(i + 1, nextCallDateCol + 1).setValue(nextCallDate || '');
          console.log('[MerchantContractReport] updateNextCallDate - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateNextCallDate error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 現調日時更新
   * @param {Object} params - { merchantId, cvId, surveyDate }
   * @return {Object} - { success }
   */
  updateSurveyDate: function(params) {
    const { merchantId, cvId, surveyDate } = params;
    console.log('[MerchantContractReport] updateSurveyDate:', { merchantId, cvId, surveyDate });

    if (!cvId) {
      return { success: false, error: 'cvIdが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const surveyDateCol = colIdx['現調日時'];

      if (surveyDateCol === undefined) {
        return { success: false, error: '現調日時列が見つかりません' };
      }

      // merchantIdがある場合は会社名も取得
      let merchantCompanyName = '';
      if (merchantId) {
        const franchiseSheet = ss.getSheetByName('加盟店登録');
        if (franchiseSheet) {
          const franchiseData = franchiseSheet.getDataRange().getValues();
          const franchiseHeaders = franchiseData[0];
          const regIdCol = franchiseHeaders.indexOf('登録ID');
          const companyNameCol = franchiseHeaders.indexOf('会社名');

          for (let i = 1; i < franchiseData.length; i++) {
            if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
              merchantCompanyName = franchiseData[i][companyNameCol];
              break;
            }
          }
        }
      }
      console.log('[MerchantContractReport] updateSurveyDate - merchantCompanyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (merchantIdなし OR 登録ID/会社名でマッチ)
        const cvMatch = String(rowCvId) === String(cvId);
        const merchantMatch = !merchantId || String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName);

        if (cvMatch && merchantMatch) {
          deliverySheet.getRange(i + 1, surveyDateCol + 1).setValue(surveyDate || '');
          console.log('[MerchantContractReport] updateSurveyDate - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateSurveyDate error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 商談日時更新
   * @param {Object} params - { merchantId, cvId, estimateDate }
   * @return {Object} - { success }
   */
  updateEstimateDate: function(params) {
    const { merchantId, cvId, estimateDate } = params;
    console.log('[MerchantContractReport] updateEstimateDate:', { merchantId, cvId, estimateDate });

    if (!cvId) {
      return { success: false, error: 'cvIdが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const estimateDateCol = colIdx['商談日時'];

      if (estimateDateCol === undefined) {
        return { success: false, error: '商談日時列が見つかりません（配信管理シートに「商談日時」列を追加してください）' };
      }

      // merchantIdがある場合は会社名も取得
      let merchantCompanyName = '';
      if (merchantId) {
        const franchiseSheet = ss.getSheetByName('加盟店登録');
        if (franchiseSheet) {
          const franchiseData = franchiseSheet.getDataRange().getValues();
          const franchiseHeaders = franchiseData[0];
          const regIdCol = franchiseHeaders.indexOf('登録ID');
          const companyNameCol = franchiseHeaders.indexOf('会社名');

          for (let i = 1; i < franchiseData.length; i++) {
            if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
              merchantCompanyName = franchiseData[i][companyNameCol];
              break;
            }
          }
        }
      }
      console.log('[MerchantContractReport] updateEstimateDate - merchantCompanyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (merchantIdなし OR 登録ID/会社名でマッチ)
        const cvMatch = String(rowCvId) === String(cvId);
        const merchantMatch = !merchantId || String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName);

        if (cvMatch && merchantMatch) {
          deliverySheet.getRange(i + 1, estimateDateCol + 1).setValue(estimateDate || '');
          console.log('[MerchantContractReport] updateEstimateDate - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateEstimateDate error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 通話結果保存（接続/不在、メモ、ステータス、次回架電、電話回数）
   * @param {Object} params - { merchantId, cvId, connectionStatus, memo, newStatus, nextCallDateTime, operatorName }
   * @return {Object} - { success }
   */
  saveCallResult: function(params) {
    const { merchantId, cvId, connectionStatus, memo, newStatus, nextCallDateTime, operatorName } = params;
    console.log('[MerchantContractReport] saveCallResult:', { merchantId, cvId, connectionStatus, newStatus });

    if (!merchantId || !cvId) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const callHistoryCol = colIdx['連絡履歴JSON'];
      const callCountCol = colIdx['電話回数'];
      const statusCol = colIdx['詳細ステータス'];
      const nextCallCol = colIdx['次回架電予定'];

      // 会社名も取得（getMerchantCasesと同じロジック）
      let merchantCompanyName = '';
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[MerchantContractReport] saveCallResult - merchantId:', merchantId, ', companyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (登録ID or 会社名でマッチ)
        if (String(rowCvId) === String(cvId) &&
            (String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName))) {

          // 1. 電話回数をインクリメント
          if (callCountCol !== undefined) {
            const currentCount = parseInt(row[callCountCol] || 0);
            deliverySheet.getRange(i + 1, callCountCol + 1).setValue(currentCount + 1);
          }

          // 2. 連絡履歴に追加
          if (callHistoryCol !== undefined) {
            let existingHistory = [];
            try {
              existingHistory = JSON.parse(row[callHistoryCol] || '[]');
            } catch (e) {
              existingHistory = [];
            }

            const historyEntry = {
              date: new Date().toLocaleString('ja-JP'),
              note: connectionStatus === 'connected'
                ? '📞 接続' + (memo ? ' - ' + memo : '')
                : '📞 不在',
              operator: operatorName || ''
            };
            existingHistory.unshift(historyEntry);

            deliverySheet.getRange(i + 1, callHistoryCol + 1).setValue(JSON.stringify(existingHistory));
          }

          // 3. ステータス更新
          if (newStatus && statusCol !== undefined) {
            deliverySheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
          }

          // 4. 次回架電予定
          if (nextCallDateTime && nextCallCol !== undefined) {
            deliverySheet.getRange(i + 1, nextCallCol + 1).setValue(nextCallDateTime);
          }

          console.log('[MerchantContractReport] saveCallResult - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ', merchantId: ' + merchantId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] saveCallResult error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 通話履歴更新
   * @param {Object} params - { merchantId, cvId, callHistory }
   * @return {Object} - { success }
   */
  updateCallHistory: function(params) {
    const { merchantId, cvId, callHistory, callCount } = params;
    console.log('[MerchantContractReport] updateCallHistory:', { merchantId, cvId, historyLength: (callHistory || []).length, callCount });

    if (!merchantId || !cvId) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成（getMerchantCasesと同じ方式）
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const callHistoryCol = colIdx['連絡履歴JSON'];
      const callCountCol = colIdx['電話回数'];

      if (callHistoryCol === undefined) {
        return { success: false, error: '連絡履歴JSON列が見つかりません' };
      }

      // 会社名も取得（getMerchantCasesと同じロジック）
      let merchantCompanyName = '';
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[MerchantContractReport] updateCallHistory - merchantId:', merchantId, ', companyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (登録ID or 会社名でマッチ)
        if (String(rowCvId) === String(cvId) &&
            (String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName))) {

          const historyJson = JSON.stringify(callHistory || []);
          deliverySheet.getRange(i + 1, callHistoryCol + 1).setValue(historyJson);

          // 電話回数も保存
          if (callCount !== undefined && callCountCol !== undefined) {
            deliverySheet.getRange(i + 1, callCountCol + 1).setValue(callCount);
          }

          console.log('[MerchantContractReport] updateCallHistory - updated row', i + 1, ', callCount:', callCount);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ', merchantId: ' + merchantId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateCallHistory error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * POSTリクエストハンドラー
   * @param {Object} e - イベントオブジェクト
   * @param {Object} postData - main.jsでパース済みのPOSTデータ（オプション）
   * @return {Object} - 実行結果
   */
  handlePost: function(e, postData) {
    try {
      // main.jsから渡されたpostDataを優先、なければe.parameterから取得
      let params = postData || e.parameter || {};

      // postDataがなく、e.postDataがある場合はパース
      if (!postData && e.postData && e.postData.contents) {
        try {
          const parsed = JSON.parse(e.postData.contents);
          params = Object.assign({}, params, parsed);
        } catch (err) {
          console.error('[MerchantContractReport] POST data parse error:', err);
        }
      }

      console.log('[MerchantContractReport] handlePost action:', params.action);
      return this.handle(params);
    } catch (error) {
      console.error('[MerchantContractReport] handlePost error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * アクションルーター
   * @param {Object} params - { action: アクション名, ...その他のパラメータ }
   * @return {Object} - 実行結果
   */
  handle: function(params) {
    const action = params.action;

    switch(action) {
      case 'getDeliveredCases':
        return this.getDeliveredCases(params);
      case 'submitContractReport':
        return this.submitContractReport(params);
      case 'uploadContractFile':
        return this.uploadContractFile(params);
      case 'getMerchantCases':
        return this.getMerchantCases(params);
      case 'updateCaseStatus':
        return this.updateCaseStatus(params);
      case 'updateCaseMemo':
        return this.updateCaseMemo(params);
      case 'updateCallHistory':
        return this.updateCallHistory(params);
      case 'saveCallResult':
        return this.saveCallResult(params);
      case 'updateNextCallDate':
        return this.updateNextCallDate(params);
      case 'updateSurveyDate':
        return this.updateSurveyDate(params);
      case 'updateEstimateDate':
        return this.updateEstimateDate(params);
      // V2094: 成約・入金・工事進捗API
      case 'updateContractPayment':
        return this.updateContractPayment(params);
      case 'updateContractConstruction':
        return this.updateContractConstruction(params);
      case 'reportClaim':
        return this.reportClaim(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  },

  // ============================================
  // V2094: 成約・入金・工事進捗API
  // ============================================

  /**
   * 入金情報を更新
   * @param {Object} params - { cvId, paymentScheduleDate?, paymentConfirmedDate?, paymentAmount?, merchantId }
   * @return {Object} - { success: boolean }
   */
  updateContractPayment: function(params) {
    try {
      const cvId = params.cvId;
      // merchantIdは認証用（将来的に検証追加可能）

      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      console.log('[V2094] updateContractPayment:', params);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      // 配信管理シートから該当案件を検索
      const deliveryData = deliverySheet.getDataRange().getValues();
      const headers = deliveryData[0];

      const cvIdIdx = headers.indexOf('CV ID');
      const paymentScheduleIdx = headers.indexOf('入金予定日');
      const paymentConfirmedIdx = headers.indexOf('入金確認日');
      const paymentAmountIdx = headers.indexOf('入金額');

      // 該当行を検索
      let rowIndex = -1;
      for (let i = 1; i < deliveryData.length; i++) {
        if (String(deliveryData[i][cvIdIdx]) === String(cvId)) {
          rowIndex = i + 1; // 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, error: '案件が見つかりません: ' + cvId };
      }

      // 更新するカラムがシートに存在しない場合は追加
      const updateFields = [];
      if (params.paymentScheduleDate && paymentScheduleIdx >= 0) {
        updateFields.push({ col: paymentScheduleIdx + 1, value: params.paymentScheduleDate });
      }
      if (params.paymentConfirmedDate && paymentConfirmedIdx >= 0) {
        updateFields.push({ col: paymentConfirmedIdx + 1, value: params.paymentConfirmedDate });
      }
      if (params.paymentAmount && paymentAmountIdx >= 0) {
        updateFields.push({ col: paymentAmountIdx + 1, value: params.paymentAmount });
      }

      // 各フィールドを更新
      updateFields.forEach(function(field) {
        deliverySheet.getRange(rowIndex, field.col).setValue(field.value);
      });

      console.log('[V2094] 入金情報更新完了:', { cvId: cvId, rowIndex: rowIndex, updateFields: updateFields.length });

      return { success: true };
    } catch (error) {
      console.error('[V2094] updateContractPayment error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 工事進捗情報を更新
   * @param {Object} params - { cvId, constructionStartDate?, constructionEndDate?, constructionCompletedDate?, constructionStatus?, merchantId }
   * @return {Object} - { success: boolean }
   */
  updateContractConstruction: function(params) {
    try {
      const cvId = params.cvId;

      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      console.log('[V2094] updateContractConstruction:', params);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      // 配信管理シートから該当案件を検索
      const deliveryData = deliverySheet.getDataRange().getValues();
      const headers = deliveryData[0];

      const cvIdIdx = headers.indexOf('CV ID');
      const constructionStartIdx = headers.indexOf('工事開始予定日');
      const constructionEndIdx = headers.indexOf('工事完了予定日');
      const constructionCompletedIdx = headers.indexOf('工事完了日');
      const constructionStatusIdx = headers.indexOf('工事ステータス');

      // 該当行を検索
      let rowIndex = -1;
      for (let i = 1; i < deliveryData.length; i++) {
        if (String(deliveryData[i][cvIdIdx]) === String(cvId)) {
          rowIndex = i + 1; // 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, error: '案件が見つかりません: ' + cvId };
      }

      // 更新するフィールド
      const updateFields = [];
      if (params.constructionStartDate && constructionStartIdx >= 0) {
        updateFields.push({ col: constructionStartIdx + 1, value: params.constructionStartDate });
      }
      if (params.constructionEndDate && constructionEndIdx >= 0) {
        updateFields.push({ col: constructionEndIdx + 1, value: params.constructionEndDate });
      }
      if (params.constructionCompletedDate && constructionCompletedIdx >= 0) {
        updateFields.push({ col: constructionCompletedIdx + 1, value: params.constructionCompletedDate });
      }
      if (params.constructionStatus && constructionStatusIdx >= 0) {
        updateFields.push({ col: constructionStatusIdx + 1, value: params.constructionStatus });
      }

      // 各フィールドを更新
      updateFields.forEach(function(field) {
        deliverySheet.getRange(rowIndex, field.col).setValue(field.value);
      });

      console.log('[V2094] 工事進捗更新完了:', { cvId: cvId, rowIndex: rowIndex, updateFields: updateFields.length });

      return { success: true };
    } catch (error) {
      console.error('[V2094] updateContractConstruction error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * クレーム報告
   * @param {Object} params - { cvId, claimReason, merchantId }
   * @return {Object} - { success: boolean }
   */
  reportClaim: function(params) {
    try {
      const cvId = params.cvId;
      const claimReason = params.claimReason;

      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }
      if (!claimReason) {
        return { success: false, error: 'クレーム内容が指定されていません' };
      }

      console.log('[V2094] reportClaim:', params);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      // 配信管理シートから該当案件を検索
      const deliveryData = deliverySheet.getDataRange().getValues();
      const headers = deliveryData[0];

      const cvIdIdx = headers.indexOf('CV ID');
      const claimReasonIdx = headers.indexOf('クレーム理由');
      const claimDateIdx = headers.indexOf('クレーム報告日');
      const detailStatusIdx = headers.indexOf('詳細ステータス');

      // 該当行を検索
      let rowIndex = -1;
      for (let i = 1; i < deliveryData.length; i++) {
        if (String(deliveryData[i][cvIdIdx]) === String(cvId)) {
          rowIndex = i + 1; // 1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, error: '案件が見つかりません: ' + cvId };
      }

      // クレーム情報を更新
      const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

      if (claimReasonIdx >= 0) {
        deliverySheet.getRange(rowIndex, claimReasonIdx + 1).setValue(claimReason);
      }
      if (claimDateIdx >= 0) {
        deliverySheet.getRange(rowIndex, claimDateIdx + 1).setValue(now);
      }
      if (detailStatusIdx >= 0) {
        deliverySheet.getRange(rowIndex, detailStatusIdx + 1).setValue('クレーム');
      }

      console.log('[V2094] クレーム報告完了:', { cvId: cvId, rowIndex: rowIndex });

      return { success: true };
    } catch (error) {
      console.error('[V2094] reportClaim error:', error);
      return { success: false, error: error.toString() };
    }
  }
};

// deploy 2025年 12月 4日 木曜日 01時58分07秒 JST
