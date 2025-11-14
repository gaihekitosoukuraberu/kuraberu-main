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
 * - ユーザー登録シート（読み書き）
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（追客終了BOXメニュー）
 *
 * 【変更時の注意】
 * ⚠️  ユーザー登録シートのカラム構成に依存
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

      // アーカイブ状態列のインデックスを取得（存在しない場合は作成）
      let archiveStatusIdx = headers.indexOf('アーカイブ状態');
      let archiveDateIdx = headers.indexOf('アーカイブ日時');
      let archiveMerchantIdx = headers.indexOf('アーカイブ加盟店ID');

      // 列が存在しない場合は作成
      if (archiveStatusIdx === -1) {
        archiveStatusIdx = headers.length;
        userSheet.getRange(1, archiveStatusIdx + 1).setValue('アーカイブ状態');
      }
      if (archiveDateIdx === -1) {
        archiveDateIdx = headers.length + (archiveStatusIdx === headers.length ? 1 : 0);
        userSheet.getRange(1, archiveDateIdx + 1).setValue('アーカイブ日時');
      }
      if (archiveMerchantIdx === -1) {
        archiveMerchantIdx = headers.length + (archiveStatusIdx === headers.length ? 1 : 0) + (archiveDateIdx === headers.length + 1 ? 1 : 0);
        userSheet.getRange(1, archiveMerchantIdx + 1).setValue('アーカイブ加盟店ID');
      }

      // 対象行を検索
      let targetRow = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowCvId = row[cvIdIdx];
        const deliveredMerchants = row[deliveredMerchantsIdx];

        // CV IDが一致し、この加盟店に配信されている案件
        if (rowCvId === cvId && deliveredMerchants &&
            (deliveredMerchants.toString().includes(merchantId) ||
             deliveredMerchants.toString().includes(String(merchantId)))) {
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
      const nameIdx = headers.indexOf('氏名');
      const telIdx = headers.indexOf('電話番号');
      const addressIdx = headers.indexOf('住所');
      const workCategoryIdx = headers.indexOf('工事種別');
      const deliveredAtIdx = headers.indexOf('配信日時');
      const managementStatusIdx = headers.indexOf('管理ステータス');
      const archiveStatusIdx = headers.indexOf('アーカイブ状態');
      const archiveDateIdx = headers.indexOf('アーカイブ日時');
      const archiveMerchantIdx = headers.indexOf('アーカイブ加盟店ID');

      if (archiveStatusIdx === -1) {
        // アーカイブ列がない場合は空配列を返す
        return {
          success: true,
          cases: []
        };
      }

      // アーカイブ案件を抽出
      const archivedCases = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cvId = row[cvIdIdx];
        const archiveStatus = row[archiveStatusIdx];
        const archiveMerchantId = row[archiveMerchantIdx];

        // 空行スキップ
        if (!cvId) continue;

        // この加盟店がアーカイブした案件のみ
        if (archiveStatus === 'archived' &&
            (archiveMerchantId === merchantId || archiveMerchantId === String(merchantId))) {

          archivedCases.push({
            cvId: cvId,
            customerName: row[nameIdx] || '',
            tel: row[telIdx] || '',
            address: row[addressIdx] || '',
            workCategory: row[workCategoryIdx] || '',
            deliveredAt: row[deliveredAtIdx] || '',
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
