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
      const telIdx = headers.indexOf('電話番号');
      const addressIdx = headers.indexOf('住所');
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

        // 案件情報を追加
        deliveredCases.push({
          cvId: cvId,
          customerName: row[nameIdx] || '',
          tel: row[telIdx] || '',
          address: row[addressIdx] || '',
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
   *   contractDate: 成約日,
   *   contractAmount: 成約金額,
   *   workContent: 見積工事内容,
   *   paymentDueDate: 入金予定日
   * }
   * @return {Object} - { success: boolean }
   */
  submitContractReport: function(params) {
    try {
      const { merchantId, merchantName, cvId, contractDate, contractAmount, workContent, paymentDueDate } = params;

      // バリデーション
      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '必須パラメータが不足しています（merchantId, cvId）'
        };
      }

      if (!contractDate || !contractAmount) {
        return {
          success: false,
          error: '成約日と成約金額は必須です'
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

      // すでに成約報告済みかチェック
      const currentContractMerchantId = rows[targetRow - 2][contractMerchantIdIdx];
      if (currentContractMerchantId && currentContractMerchantId !== '') {
        return {
          success: false,
          error: 'この案件はすでに成約報告済みです（加盟店ID: ' + currentContractMerchantId + '）'
        };
      }

      // データ更新
      userSheet.getRange(targetRow, contractMerchantIdIdx + 1).setValue(merchantId);
      userSheet.getRange(targetRow, contractMerchantNameIdx + 1).setValue(merchantName || '');
      userSheet.getRange(targetRow, contractDateIdx + 1).setValue(contractDate);
      userSheet.getRange(targetRow, contractAmountIdx + 1).setValue(contractAmount);

      if (workContent) {
        userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContent);
      }

      if (paymentDueDate) {
        userSheet.getRange(targetRow, paymentDueDateIdx + 1).setValue(paymentDueDate);
      }

      // 管理ステータスを「入金予定」に更新
      userSheet.getRange(targetRow, managementStatusIdx + 1).setValue('入金予定');

      console.log('[MerchantContractReport] submitContractReport - 成約報告完了:', cvId);

      return {
        success: true,
        message: '成約報告を登録しました'
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
