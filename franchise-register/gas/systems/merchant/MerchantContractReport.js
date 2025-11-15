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
 * - ユーザー登録シート（読み取り・書き込み）
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（成約報告メニュー）
 *
 * 【変更時の注意】
 * ⚠️  ユーザー登録シートのカラム構成に依存
 * ⚠️  管理ステータスの遷移ロジックに注意
 */

const MerchantContractReport = {
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
      const deliveredMerchantsIdx = headers.indexOf('配信先業者一覧');
      const managementStatusIdx = headers.indexOf('管理ステータス');
      const nameIdx = headers.indexOf('氏名');
      const nameKanaIdx = headers.indexOf('フリガナ');
      const telIdx = headers.indexOf('電話番号');
      const prefectureIdx = headers.indexOf('都道府県（物件）');
      const cityIdx = headers.indexOf('市区町村（物件）');
      const addressDetailIdx = headers.indexOf('住所詳細（物件）');
      const addressKanaIdx = headers.indexOf('住所フリガナ');
      const workCategoryIdx = headers.indexOf('工事種別');
      const deliveredAtIdx = headers.indexOf('配信日時');
      const contractMerchantIdIdx = headers.indexOf('成約加盟店ID');

      // 配信済み案件を抽出（この加盟店に配信されていて、まだこの加盟店が成約報告していないもの）
      const deliveredCases = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cvId = row[cvIdIdx];
        const deliveredMerchants = row[deliveredMerchantsIdx];
        const managementStatus = row[managementStatusIdx];
        const contractMerchantId = row[contractMerchantIdIdx];

        // 空行スキップ
        if (!cvId) continue;

        // この加盟店に配信されているか確認
        const isDelivered = deliveredMerchants &&
                           (deliveredMerchants.toString().includes(merchantId) ||
                            deliveredMerchants.toString().includes(String(merchantId)));

        if (!isDelivered) continue;

        // 管理ステータスが「配信済」「対応中」「見積提出済」「商談中」のいずれか
        const validStatuses = ['配信済', '対応中', '見積提出済', '商談中'];
        if (!validStatuses.includes(managementStatus)) continue;

        // すでにこの加盟店が成約報告済みの場合はスキップ
        if (contractMerchantId === merchantId || contractMerchantId === String(merchantId)) {
          continue;
        }

        // 住所を結合
        const prefecture = prefectureIdx >= 0 ? (row[prefectureIdx] || '') : '';
        const city = cityIdx >= 0 ? (row[cityIdx] || '') : '';
        const addressDetail = addressDetailIdx >= 0 ? (row[addressDetailIdx] || '') : '';
        const fullAddress = prefecture + city + addressDetail;

        // 案件情報を追加
        deliveredCases.push({
          cvId: cvId,
          customerName: row[nameIdx] || '',
          customerNameKana: nameKanaIdx >= 0 ? (row[nameKanaIdx] || '') : '',
          tel: row[telIdx] || '',
          address: fullAddress,
          addressKana: addressKanaIdx >= 0 ? (row[addressKanaIdx] || '') : '',
          workCategory: row[workCategoryIdx] || '',
          deliveredAt: row[deliveredAtIdx] || '',
          managementStatus: managementStatus
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
        receiptFileUrl
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

      console.log('[MerchantContractReport] submitContractReport - CV ID:', cvId, '加盟店ID:', merchantId);

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

      // 現在の状況から管理ステータスと工事進捗ステータスを判定
      let newManagementStatus = '入金予定';
      let constructionStatus = '';

      if (currentStatus === '契約前・口頭確約済') {
        newManagementStatus = '商談中';
        constructionStatus = '契約前';
      } else if (currentStatus === '契約後・工事前') {
        newManagementStatus = '入金予定';
        constructionStatus = '工事前';
      } else if (currentStatus === '工事中') {
        newManagementStatus = '入金予定';
        constructionStatus = '工事中';
      } else if (currentStatus === '工事完了後') {
        newManagementStatus = '完了';
        constructionStatus = '工事完了';
      }

      // データ更新（通常の成約報告の場合）
      if (!isAdditionalWork) {
        userSheet.getRange(targetRow, contractMerchantIdIdx + 1).setValue(merchantId);
        userSheet.getRange(targetRow, contractMerchantNameIdx + 1).setValue(merchantName || '');
        userSheet.getRange(targetRow, contractReportDateIdx + 1).setValue(new Date());
      }

      // 共通項目の更新
      if (contractDate) {
        userSheet.getRange(targetRow, contractDateIdx + 1).setValue(contractDate);
      }

      userSheet.getRange(targetRow, contractAmountIdx + 1).setValue(contractAmount);

      // 施工内容（配列を文字列に変換）
      if (workContent && Array.isArray(workContent)) {
        const workContentStr = workContent.join('、');
        userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContentStr);
      } else if (workContent) {
        userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContent);
      }

      if (paymentDueDate) {
        userSheet.getRange(targetRow, paymentDueDateIdx + 1).setValue(paymentDueDate);
      }

      if (constructionEndDate) {
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

      // 管理ステータス更新
      userSheet.getRange(targetRow, managementStatusIdx + 1).setValue(newManagementStatus);

      console.log('[MerchantContractReport] submitContractReport - 成約報告完了:', cvId, '報告種別:', reportType);

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
  }
};
