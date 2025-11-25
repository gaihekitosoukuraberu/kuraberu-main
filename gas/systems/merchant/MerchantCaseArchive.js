/**
 * ====================================
 * 加盟店 追客終了BOXシステム
 * ====================================
 *
 * 【機能】
 * - 案件のアーカイブ（追客終了BOXへ移動）
 * - アーカイブ案件の復元
 * - アーカイブ案件一覧取得
 *
 * 【仕様】
 * - ユーザー登録シートに「アーカイブ状態」列を追加
 * - アーカイブしても削除せず、フラグを立てるだけ
 * - いつでも復元可能
 * - アーカイブ日時も記録
 *
 * 【依存関係】
 * - 配信管理シート（読み取り） ← 配信確認用
 * - ユーザー登録シート（読み書き） ← アーカイブフラグ管理
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（追客終了BOXメニュー）
 *
 * 【変更時の注意】
 * ⚠️  配信管理シートで配信確認してからアーカイブ
 * ⚠️  削除ではなくアーカイブ（非破壊）
 */

var MerchantCaseArchive = {
  /**
   * 案件をアーカイブ（追客終了BOXへ移動）
   * @param {Object} params - { merchantId: 加盟店ID, cvId: CV ID }
   * @return {Object} - { success: boolean }
   */
  archiveCase: function(params) {
    try {
      const merchantId = params.merchantId;
      const cvId = params.cvId;

      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '加盟店IDまたはCV IDが指定されていません'
        };
      }

      console.log('[MerchantCaseArchive] archiveCase - 加盟店ID:', merchantId, 'CV ID:', cvId);

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

      // まず配信管理シートでこの加盟店にこの案件が配信されているか確認
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const deliveryRows = deliveryData.slice(1);

      const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
      const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
      const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');

      let isDelivered = false;
      for (let i = 0; i < deliveryRows.length; i++) {
        const row = deliveryRows[i];
        if (row[delCvIdIdx] === cvId &&
            (row[delMerchantIdIdx] === merchantId || row[delMerchantIdIdx] === String(merchantId)) &&
            row[delStatusIdx] === '配信済み') {
          isDelivered = true;
          break;
        }
      }

      if (!isDelivered) {
        return {
          success: false,
          error: 'この案件はこの加盟店に配信されていません'
        };
      }

      // ユーザー登録シートでアーカイブ処理
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      // 必要なカラムのインデックス取得
      const cvIdIdx = userHeaders.indexOf('CV ID');

      // アーカイブ状態列のインデックスを取得（存在しない場合は作成）
      let archiveStatusIdx = userHeaders.indexOf('アーカイブ状態');
      let archiveDateIdx = userHeaders.indexOf('アーカイブ日時');
      let archiveMerchantIdx = userHeaders.indexOf('アーカイブ加盟店ID');

      // 列が存在しない場合は作成
      if (archiveStatusIdx === -1) {
        archiveStatusIdx = userHeaders.length;
        userSheet.getRange(1, archiveStatusIdx + 1).setValue('アーカイブ状態');
      }
      if (archiveDateIdx === -1) {
        archiveDateIdx = userHeaders.length + (archiveStatusIdx === userHeaders.length ? 1 : 0);
        userSheet.getRange(1, archiveDateIdx + 1).setValue('アーカイブ日時');
      }
      if (archiveMerchantIdx === -1) {
        archiveMerchantIdx = userHeaders.length + (archiveStatusIdx === userHeaders.length ? 1 : 0) + (archiveDateIdx === userHeaders.length + 1 ? 1 : 0);
        userSheet.getRange(1, archiveMerchantIdx + 1).setValue('アーカイブ加盟店ID');
      }

      // 対象行を検索
      let targetRow = -1;
      for (let i = 0; i < userRows.length; i++) {
        const row = userRows[i];
        const rowCvId = row[cvIdIdx];

        // CV IDが一致
        if (rowCvId === cvId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定された案件が見つかりません'
        };
      }

      // アーカイブ状態を更新
      const timestamp = new Date();
      userSheet.getRange(targetRow, archiveStatusIdx + 1).setValue('archived');
      userSheet.getRange(targetRow, archiveDateIdx + 1).setValue(timestamp);
      userSheet.getRange(targetRow, archiveMerchantIdx + 1).setValue(merchantId);

      console.log('[MerchantCaseArchive] archiveCase - アーカイブ完了:', cvId);

      return {
        success: true,
        message: '案件を追客終了BOXに移動しました'
      };

    } catch (error) {
      console.error('[MerchantCaseArchive] archiveCase error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * アーカイブ案件を復元
   * @param {Object} params - { merchantId: 加盟店ID, cvId: CV ID }
   * @return {Object} - { success: boolean }
   */
  restoreCase: function(params) {
    try {
      const merchantId = params.merchantId;
      const cvId = params.cvId;

      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '加盟店IDまたはCV IDが指定されていません'
        };
      }

      console.log('[MerchantCaseArchive] restoreCase - 加盟店ID:', merchantId, 'CV ID:', cvId);

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
      const archiveStatusIdx = headers.indexOf('アーカイブ状態');
      const archiveMerchantIdx = headers.indexOf('アーカイブ加盟店ID');

      if (archiveStatusIdx === -1) {
        return {
          success: false,
          error: 'アーカイブ状態列が見つかりません'
        };
      }

      // 対象行を検索
      let targetRow = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowCvId = row[cvIdIdx];
        const archiveStatus = row[archiveStatusIdx];
        const archiveMerchantId = row[archiveMerchantIdx];

        // CV IDが一致し、この加盟店がアーカイブした案件
        if (rowCvId === cvId && archiveStatus === 'archived' &&
            (archiveMerchantId === merchantId || archiveMerchantId === String(merchantId))) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: 'アーカイブされた案件が見つかりません'
        };
      }

      // アーカイブ状態をクリア
      userSheet.getRange(targetRow, archiveStatusIdx + 1).setValue('');

      console.log('[MerchantCaseArchive] restoreCase - 復元完了:', cvId);

      return {
        success: true,
        message: '案件を復元しました'
      };

    } catch (error) {
      console.error('[MerchantCaseArchive] restoreCase error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * アーカイブ案件一覧を取得
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success: boolean, cases: Array }
   */
  getArchivedCases: function(params) {
    try {
      const merchantId = params.merchantId;

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      console.log('[MerchantCaseArchive] getArchivedCases - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!userSheet) {
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // ユーザー登録シートから顧客情報を取得
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      // 必要なカラムのインデックス取得
      const cvIdIdx = userHeaders.indexOf('CV ID');
      const nameIdx = userHeaders.indexOf('氏名');
      const telIdx = userHeaders.indexOf('電話番号');
      const prefectureIdx = userHeaders.indexOf('都道府県（物件）');
      const cityIdx = userHeaders.indexOf('市区町村（物件）');
      const addressDetailIdx = userHeaders.indexOf('住所詳細（物件）');
      const workCategoryIdx = userHeaders.indexOf('工事種別');
      const managementStatusIdx = userHeaders.indexOf('管理ステータス');
      const archiveStatusIdx = userHeaders.indexOf('アーカイブ状態');
      const archiveDateIdx = userHeaders.indexOf('アーカイブ日時');
      const archiveMerchantIdx = userHeaders.indexOf('アーカイブ加盟店ID');

      if (archiveStatusIdx === -1) {
        // アーカイブ列がない場合は空配列を返す
        return {
          success: true,
          cases: []
        };
      }

      // 配信管理シートから配信日時を取得するためのマップを作成
      let deliveryMap = {};
      if (deliverySheet) {
        const deliveryData = deliverySheet.getDataRange().getValues();
        const deliveryHeaders = deliveryData[0];
        const deliveryRows = deliveryData.slice(1);

        const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
        const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
        const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');

        deliveryRows.forEach(row => {
          const cvId = row[delCvIdIdx];
          const delMerchantId = row[delMerchantIdIdx];
          const deliveredAt = row[delDeliveredAtIdx];

          if (cvId && (delMerchantId === merchantId || delMerchantId === String(merchantId))) {
            deliveryMap[cvId] = deliveredAt;
          }
        });
      }

      // アーカイブ案件を抽出
      const archivedCases = [];

      for (let i = 0; i < userRows.length; i++) {
        const row = userRows[i];
        const cvId = row[cvIdIdx];
        const archiveStatus = row[archiveStatusIdx];
        const archiveMerchantId = row[archiveMerchantIdx];

        // 空行スキップ
        if (!cvId) continue;

        // この加盟店がアーカイブした案件のみ
        if (archiveStatus === 'archived' &&
            (archiveMerchantId === merchantId || archiveMerchantId === String(merchantId))) {

          // 住所を結合
          const prefecture = prefectureIdx >= 0 ? (row[prefectureIdx] || '') : '';
          const city = cityIdx >= 0 ? (row[cityIdx] || '') : '';
          const addressDetail = addressDetailIdx >= 0 ? (row[addressDetailIdx] || '') : '';
          const fullAddress = prefecture + city + addressDetail;

          archivedCases.push({
            cvId: cvId,
            customerName: row[nameIdx] || '',
            tel: row[telIdx] || '',
            address: fullAddress,
            workCategory: row[workCategoryIdx] || '',
            deliveredAt: deliveryMap[cvId] || '',
            managementStatus: row[managementStatusIdx] || '',
            archivedAt: row[archiveDateIdx] || ''
          });
        }
      }

      console.log('[MerchantCaseArchive] getArchivedCases - 取得件数:', archivedCases.length);

      return {
        success: true,
        cases: archivedCases
      };

    } catch (error) {
      console.error('[MerchantCaseArchive] getArchivedCases error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * SystemRouter用のハンドラー
   * @param {Object} params - リクエストパラメータ
   * @return {Object} - レスポンス
   */
  handle: function(params) {
    const action = params.action;

    switch(action) {
      case 'archiveCase':
        return this.archiveCase(params);
      case 'restoreCase':
        return this.restoreCase(params);
      case 'getArchivedCases':
        return this.getArchivedCases(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
