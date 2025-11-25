/**
 * ====================================
 * テストデータ管理システム（開発用）
 * ====================================
 *
 * 【機能】
 * - FR251112004600（大野建装）のテストデータ作成
 * - テストデータの完全削除
 *
 * 【対象シート】
 * - 配信管理シート（データ作成）
 * - キャンセル申請シート（データ削除）
 * - キャンセル期限延長申請シート（データ削除）
 *
 * 【注意】
 * - 本番環境では使用しないこと
 * - テスト加盟店IDのみに限定
 */

var TestDataManager = {
  /**
   * テストデータ再作成（API用）
   * @param {Object} params - { merchantId: 加盟店ID（オプション） }
   * @return {Object} - { success: boolean, message: string, createdCount: number }
   */
  recreateTestData: function(params) {
    try {
      const merchantId = params.merchantId || 'FR251112004600';
      const merchantName = '大野建装';

      console.log('[TestDataManager] テストデータ再作成開始 - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const userSheet = ss.getSheetByName('ユーザー登録');
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!userSheet || !deliverySheet) {
        return {
          success: false,
          error: 'シートが見つかりません'
        };
      }

      // ユーザー登録シートから最初の5件のCV IDを取得
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const cvIdIdx = userHeaders.indexOf('CV ID');
      const nameIdx = userHeaders.indexOf('氏名');
      const contractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');

      // まず未成約のCV IDを探す
      const availableCvIds = [];
      for (let i = 0; i < userRows.length && availableCvIds.length < 5; i++) {
        const row = userRows[i];
        const cvId = row[cvIdIdx];
        const name = row[nameIdx];
        const contractMerchantId = row[contractMerchantIdIdx] || '';

        if (cvId && !contractMerchantId) {
          availableCvIds.push({
            cvId: cvId,
            name: name
          });
          console.log('[TestDataManager]', availableCvIds.length + ':', cvId, '-', name, '（未成約）');
        }
      }

      // 未成約が見つからない場合は、最新の5件を使う（成約済みでも可）
      if (availableCvIds.length === 0) {
        console.log('[TestDataManager] 未成約のCV IDが見つからないため、最新5件を使用します');
        for (let i = userRows.length - 1; i >= 0 && availableCvIds.length < 5; i--) {
          const row = userRows[i];
          const cvId = row[cvIdIdx];
          const name = row[nameIdx];

          if (cvId) {
            availableCvIds.push({
              cvId: cvId,
              name: name
            });
            console.log('[TestDataManager]', availableCvIds.length + ':', cvId, '-', name, '（最新データ使用）');
          }
        }
      }

      if (availableCvIds.length === 0) {
        return {
          success: false,
          error: 'ユーザー登録シートにCV IDが見つかりませんでした'
        };
      }

      // 配信管理シートのヘッダーインデックス取得
      const deliveryHeaders = deliverySheet.getRange(1, 1, 1, deliverySheet.getLastColumn()).getValues()[0];

      const delRecordIdIdx = deliveryHeaders.indexOf('レコードID');
      const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
      const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
      const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');
      const delRankIdx = deliveryHeaders.indexOf('配信順位');
      const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');
      const delDetailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');
      const delStatusUpdateIdx = deliveryHeaders.indexOf('ステータス更新日時');
      const delLastUpdateIdx = deliveryHeaders.indexOf('最終更新日時');

      // 3件の配信データを作成
      const now = new Date();
      const deliveredAt1 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3日前
      const deliveredAt2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5日前
      const deliveredAt3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2日前

      const testData = [
        {
          cvId: availableCvIds[0].cvId,
          name: availableCvIds[0].name,
          deliveredAt: deliveredAt1,
          status: '配信済み',
          detailStatus: '配信済み',
          rank: 1
        },
        {
          cvId: availableCvIds[1] ? availableCvIds[1].cvId : availableCvIds[0].cvId,
          name: availableCvIds[1] ? availableCvIds[1].name : availableCvIds[0].name,
          deliveredAt: deliveredAt2,
          status: '配信済み',
          detailStatus: '配信済み',
          rank: 1
        },
        {
          cvId: availableCvIds[2] ? availableCvIds[2].cvId : availableCvIds[0].cvId,
          name: availableCvIds[2] ? availableCvIds[2].name : availableCvIds[0].name,
          deliveredAt: deliveredAt3,
          status: '配信済み',
          detailStatus: '配信済み',
          rank: 1
        }
      ];

      testData.forEach((data, idx) => {
        const recordId = 'DEL' + Utilities.formatDate(now, 'JST', 'yyMMddHHmmss') + (idx + 1);

        // 新しい行を作成（全列分）
        const newRow = new Array(deliveryHeaders.length).fill('');

        newRow[delRecordIdIdx] = recordId;
        newRow[delCvIdIdx] = data.cvId;
        newRow[delMerchantIdIdx] = merchantId;
        newRow[delDeliveredAtIdx] = data.deliveredAt;
        newRow[delRankIdx] = data.rank;
        newRow[delStatusIdx] = data.status;
        newRow[delDetailStatusIdx] = data.detailStatus;
        newRow[delStatusUpdateIdx] = data.deliveredAt;
        newRow[delLastUpdateIdx] = data.deliveredAt;

        deliverySheet.appendRow(newRow);

        console.log('[TestDataManager]', (idx + 1) + '件目:', data.name, '(CV:', data.cvId + ') - 配信日時:', Utilities.formatDate(data.deliveredAt, 'JST', 'yyyy-MM-dd HH:mm'));
      });

      const resultMessage = `テストデータ作成完了: ${testData.length}件\n` +
        `加盟店ID: ${merchantId}\n\n` +
        `以下のメニューで表示されます:\n` +
        `1. キャンセル申請 > 申請可能: ${testData.length}件\n` +
        `2. 成約報告: ${testData.length}件\n` +
        `3. 期限延長申請 > 延長可能: ${testData.length}件`;

      console.log('[TestDataManager] ✅', resultMessage);

      return {
        success: true,
        message: resultMessage,
        createdCount: testData.length,
        merchantId: merchantId,
        cvIds: testData.map(d => d.cvId)
      };

    } catch (error) {
      console.error('[TestDataManager] recreateTestData error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * テストデータ完全削除（API用）
   * @param {Object} params - { merchantId: 加盟店ID（オプション） }
   * @return {Object} - { success: boolean, message: string, deletedCount: number }
   */
  cleanupAllTestData: function(params) {
    try {
      const merchantId = params.merchantId || 'FR251112004600';

      console.log('[TestDataManager] テストデータ完全削除開始 - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let totalDeleted = 0;
      const details = [];

      // 1. 配信管理シート
      const deliverySheet = ss.getSheetByName('配信管理');
      if (deliverySheet) {
        const deliveryData = deliverySheet.getDataRange().getValues();
        const delMerchantIdIdx = deliveryData[0].indexOf('加盟店ID');
        let count = 0;

        for (let i = deliveryData.length - 1; i >= 1; i--) {
          if (deliveryData[i][delMerchantIdIdx] === merchantId) {
            deliverySheet.deleteRow(i + 1);
            count++;
          }
        }
        console.log('[TestDataManager] 配信管理:', count + '件削除');
        details.push(`配信管理: ${count}件`);
        totalDeleted += count;
      }

      // 2. キャンセル申請シート
      const cancelSheet = ss.getSheetByName('キャンセル申請');
      if (cancelSheet) {
        const cancelData = cancelSheet.getDataRange().getValues();
        const cancelMerchantIdIdx = cancelData[0].indexOf('加盟店ID');
        let count = 0;

        for (let i = cancelData.length - 1; i >= 1; i--) {
          if (cancelData[i][cancelMerchantIdIdx] === merchantId) {
            cancelSheet.deleteRow(i + 1);
            count++;
          }
        }
        console.log('[TestDataManager] キャンセル申請:', count + '件削除');
        details.push(`キャンセル申請: ${count}件`);
        totalDeleted += count;
      }

      // 3. キャンセル期限延長申請シート
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
      if (extensionSheet) {
        const extensionData = extensionSheet.getDataRange().getValues();
        const extMerchantIdIdx = extensionData[0].indexOf('加盟店ID');
        let count = 0;

        for (let i = extensionData.length - 1; i >= 1; i--) {
          if (extensionData[i][extMerchantIdIdx] === merchantId) {
            extensionSheet.deleteRow(i + 1);
            count++;
          }
        }
        console.log('[TestDataManager] 期限延長申請:', count + '件削除');
        details.push(`期限延長申請: ${count}件`);
        totalDeleted += count;
      }

      const resultMessage = `テストデータ削除完了\n` +
        `加盟店ID: ${merchantId}\n` +
        `合計: ${totalDeleted}件\n\n` +
        `詳細:\n` + details.join('\n');

      console.log('[TestDataManager] ✅', resultMessage);

      return {
        success: true,
        message: resultMessage,
        deletedCount: totalDeleted,
        merchantId: merchantId,
        details: details
      };

    } catch (error) {
      console.error('[TestDataManager] cleanupAllTestData error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * アクションルーター
   * @param {Object} params - { action: アクション名, merchantId: 加盟店ID（オプション） }
   * @return {Object} - 実行結果
   */
  handle: function(params) {
    const action = params.action;

    switch(action) {
      case 'recreateTestData':
        return this.recreateTestData(params);
      case 'cleanupAllTestData':
        return this.cleanupAllTestData(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
