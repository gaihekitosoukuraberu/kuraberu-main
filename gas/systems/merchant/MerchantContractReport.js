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
          managementStatus: detailStatus || '配信済み'
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
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
