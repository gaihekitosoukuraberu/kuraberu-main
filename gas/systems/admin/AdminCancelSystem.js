/**
 * ====================================
 * 管理者 キャンセル申請管理システム
 * ====================================
 *
 * 【機能】
 * - キャンセル申請の承認・却下
 * - 期限延長申請の承認・却下
 * - 承認時の自動処理（ユーザー登録シート更新、配信先業者削除）
 *
 * 【依存関係】
 * - キャンセル申請シート（読み取り・書き込み）
 * - キャンセル期限延長申請シート（読み取り・書き込み）
 * - ユーザー登録シート（書き込み）
 *
 * 【影響範囲】
 * - フロント: admin-dashboard
 * - Slack: インタラクティブボタン
 *
 * 【変更時の注意】
 * ⚠️  承認時のユーザー登録シート更新ロジックに注意
 * ⚠️  配信先業者一覧の削除処理に注意
 * ⚠️  トランザクション的な整合性を保つ
 */

var AdminCancelSystem = {
  /**
   * キャンセル申請を承認
   * @param {Object} params - {
   *   applicationId: 申請ID,
   *   approverName: 承認者名
   * }
   * @return {Object} - { success: boolean }
   */
  approveCancelReport: function(params) {
    try {
      const { applicationId, approverName } = params;

      if (!applicationId) {
        return {
          success: false,
          error: '申請IDが指定されていません'
        };
      }

      console.log('[AdminCancelSystem] approveCancelReport - 申請ID:', applicationId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cancelSheet = ss.getSheetByName('キャンセル申請');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!cancelSheet) {
        return {
          success: false,
          error: 'キャンセル申請シートが見つかりません'
        };
      }

      if (!userSheet) {
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // キャンセル申請シートから申請データを取得
      const cancelData = cancelSheet.getDataRange().getValues();
      const cancelHeaders = cancelData[0];
      const cancelRows = cancelData.slice(1);

      const appIdIdx = cancelHeaders.indexOf('申請ID');
      const cvIdIdx = cancelHeaders.indexOf('CV ID');
      const merchantIdIdx = cancelHeaders.indexOf('加盟店ID');
      const statusIdx = cancelHeaders.indexOf('承認ステータス');
      const approverIdx = cancelHeaders.indexOf('承認者');
      const approvalDateIdx = cancelHeaders.indexOf('承認日時');
      const autoAddedIdx = cancelHeaders.indexOf('自動不成約追加済');
      const lastUpdateIdx = cancelHeaders.indexOf('最終更新日時');

      let targetRow = -1;
      let cvId = '';
      let merchantId = '';

      for (let i = 0; i < cancelRows.length; i++) {
        if (cancelRows[i][appIdIdx] === applicationId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          cvId = cancelRows[i][cvIdIdx];
          merchantId = cancelRows[i][merchantIdIdx];
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定された申請IDが見つかりません: ' + applicationId
        };
      }

      // 承認ステータス更新
      const now = new Date();
      cancelSheet.getRange(targetRow, statusIdx + 1).setValue('承認済み');
      cancelSheet.getRange(targetRow, approverIdx + 1).setValue(approverName || '管理者');
      cancelSheet.getRange(targetRow, approvalDateIdx + 1).setValue(now);
      cancelSheet.getRange(targetRow, lastUpdateIdx + 1).setValue(now);

      console.log('[AdminCancelSystem] キャンセル申請承認完了:', applicationId);

      // ユーザー登録シートの更新
      const userResult = this.updateUserSheetForCancel(userSheet, cvId, merchantId);
      if (!userResult.success) {
        console.error('[AdminCancelSystem] ユーザー登録シート更新失敗:', userResult.error);
        // エラーでも処理は続行（承認は完了している）
      } else {
        // 自動不成約追加済フラグを立てる
        cancelSheet.getRange(targetRow, autoAddedIdx + 1).setValue(true);
        console.log('[AdminCancelSystem] ユーザー登録シート更新完了');
      }

      return {
        success: true,
        message: 'キャンセル申請を承認しました',
        data: {
          applicationId: applicationId,
          cvId: cvId,
          userSheetUpdated: userResult.success
        }
      };

    } catch (error) {
      console.error('[AdminCancelSystem] approveCancelReport error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * キャンセル申請を却下
   * @param {Object} params - {
   *   applicationId: 申請ID,
   *   approverName: 承認者名,
   *   rejectReason: 却下理由
   * }
   * @return {Object} - { success: boolean }
   */
  rejectCancelReport: function(params) {
    try {
      const { applicationId, approverName, rejectReason } = params;

      if (!applicationId) {
        return {
          success: false,
          error: '申請IDが指定されていません'
        };
      }

      if (!rejectReason) {
        return {
          success: false,
          error: '却下理由を入力してください'
        };
      }

      console.log('[AdminCancelSystem] rejectCancelReport - 申請ID:', applicationId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cancelSheet = ss.getSheetByName('キャンセル申請');

      if (!cancelSheet) {
        return {
          success: false,
          error: 'キャンセル申請シートが見つかりません'
        };
      }

      // キャンセル申請シートから申請データを取得
      const cancelData = cancelSheet.getDataRange().getValues();
      const cancelHeaders = cancelData[0];
      const cancelRows = cancelData.slice(1);

      const appIdIdx = cancelHeaders.indexOf('申請ID');
      const cvIdIdx = cancelHeaders.indexOf('CV ID');
      const statusIdx = cancelHeaders.indexOf('承認ステータス');
      const approverIdx = cancelHeaders.indexOf('承認者');
      const approvalDateIdx = cancelHeaders.indexOf('承認日時');
      const rejectReasonIdx = cancelHeaders.indexOf('却下理由');
      const lastUpdateIdx = cancelHeaders.indexOf('最終更新日時');

      let targetRow = -1;
      let cvId = '';

      for (let i = 0; i < cancelRows.length; i++) {
        if (cancelRows[i][appIdIdx] === applicationId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          cvId = cancelRows[i][cvIdIdx];
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定された申請IDが見つかりません: ' + applicationId
        };
      }

      // 却下ステータス更新
      const now = new Date();
      cancelSheet.getRange(targetRow, statusIdx + 1).setValue('却下');
      cancelSheet.getRange(targetRow, approverIdx + 1).setValue(approverName || '管理者');
      cancelSheet.getRange(targetRow, approvalDateIdx + 1).setValue(now);
      cancelSheet.getRange(targetRow, rejectReasonIdx + 1).setValue(rejectReason);
      cancelSheet.getRange(targetRow, lastUpdateIdx + 1).setValue(now);

      console.log('[AdminCancelSystem] キャンセル申請却下完了:', applicationId);

      return {
        success: true,
        message: 'キャンセル申請を却下しました',
        data: {
          applicationId: applicationId,
          cvId: cvId
        }
      };

    } catch (error) {
      console.error('[AdminCancelSystem] rejectCancelReport error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 期限延長申請を承認
   * @param {Object} params - {
   *   extensionId: 申請ID,
   *   approverName: 承認者名
   * }
   * @return {Object} - { success: boolean }
   */
  approveExtensionRequest: function(params) {
    try {
      const { extensionId, approverName } = params;

      if (!extensionId) {
        return {
          success: false,
          error: '申請IDが指定されていません'
        };
      }

      console.log('[AdminCancelSystem] approveExtensionRequest - 申請ID:', extensionId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');

      if (!extensionSheet) {
        return {
          success: false,
          error: 'キャンセル期限延長申請シートが見つかりません'
        };
      }

      // 期限延長申請シートから申請データを取得
      const extData = extensionSheet.getDataRange().getValues();
      const extHeaders = extData[0];
      const extRows = extData.slice(1);

      const extIdIdx = extHeaders.indexOf('申請ID');
      const cvIdIdx = extHeaders.indexOf('CV ID');
      const statusIdx = extHeaders.indexOf('承認ステータス');
      const approverIdx = extHeaders.indexOf('承認者');
      const approvalDateIdx = extHeaders.indexOf('承認日時');
      const lastUpdateIdx = extHeaders.indexOf('最終更新日時');

      let targetRow = -1;
      let cvId = '';

      for (let i = 0; i < extRows.length; i++) {
        if (extRows[i][extIdIdx] === extensionId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          cvId = extRows[i][cvIdIdx];
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定された申請IDが見つかりません: ' + extensionId
        };
      }

      // 承認ステータス更新
      const now = new Date();
      extensionSheet.getRange(targetRow, statusIdx + 1).setValue('承認済み');
      extensionSheet.getRange(targetRow, approverIdx + 1).setValue(approverName || '管理者');
      extensionSheet.getRange(targetRow, approvalDateIdx + 1).setValue(now);
      extensionSheet.getRange(targetRow, lastUpdateIdx + 1).setValue(now);

      console.log('[AdminCancelSystem] 期限延長申請承認完了:', extensionId);

      return {
        success: true,
        message: 'キャンセル期限延長申請を承認しました',
        data: {
          extensionId: extensionId,
          cvId: cvId
        }
      };

    } catch (error) {
      console.error('[AdminCancelSystem] approveExtensionRequest error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 期限延長申請を却下
   * @param {Object} params - {
   *   extensionId: 申請ID,
   *   approverName: 承認者名,
   *   rejectReason: 却下理由
   * }
   * @return {Object} - { success: boolean }
   */
  rejectExtensionRequest: function(params) {
    try {
      const { extensionId, approverName, rejectReason } = params;

      if (!extensionId) {
        return {
          success: false,
          error: '申請IDが指定されていません'
        };
      }

      if (!rejectReason) {
        return {
          success: false,
          error: '却下理由を入力してください'
        };
      }

      console.log('[AdminCancelSystem] rejectExtensionRequest - 申請ID:', extensionId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');

      if (!extensionSheet) {
        return {
          success: false,
          error: 'キャンセル期限延長申請シートが見つかりません'
        };
      }

      // 期限延長申請シートから申請データを取得
      const extData = extensionSheet.getDataRange().getValues();
      const extHeaders = extData[0];
      const extRows = extData.slice(1);

      const extIdIdx = extHeaders.indexOf('申請ID');
      const cvIdIdx = extHeaders.indexOf('CV ID');
      const statusIdx = extHeaders.indexOf('承認ステータス');
      const approverIdx = extHeaders.indexOf('承認者');
      const approvalDateIdx = extHeaders.indexOf('承認日時');
      const rejectReasonIdx = extHeaders.indexOf('却下理由');
      const lastUpdateIdx = extHeaders.indexOf('最終更新日時');

      let targetRow = -1;
      let cvId = '';

      for (let i = 0; i < extRows.length; i++) {
        if (extRows[i][extIdIdx] === extensionId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          cvId = extRows[i][cvIdIdx];
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定された申請IDが見つかりません: ' + extensionId
        };
      }

      // 却下ステータス更新
      const now = new Date();
      extensionSheet.getRange(targetRow, statusIdx + 1).setValue('却下');
      extensionSheet.getRange(targetRow, approverIdx + 1).setValue(approverName || '管理者');
      extensionSheet.getRange(targetRow, approvalDateIdx + 1).setValue(now);
      extensionSheet.getRange(targetRow, rejectReasonIdx + 1).setValue(rejectReason);
      extensionSheet.getRange(targetRow, lastUpdateIdx + 1).setValue(now);

      console.log('[AdminCancelSystem] 期限延長申請却下完了:', extensionId);

      return {
        success: true,
        message: 'キャンセル期限延長申請を却下しました',
        data: {
          extensionId: extensionId,
          cvId: cvId
        }
      };

    } catch (error) {
      console.error('[AdminCancelSystem] rejectExtensionRequest error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * V2039: ユーザー登録シートを更新（キャンセル承認時）
   * - 管理ステータスを「配信後未成約」に更新
   * - 配信管理シートから該当レコードを削除（配信先業者一覧は使わない）
   * @param {Sheet} userSheet - ユーザー登録シート
   * @param {String} cvId - CV ID
   * @param {String} merchantId - 加盟店ID
   * @return {Object} - { success: boolean }
   */
  updateUserSheetForCancel: function(userSheet, cvId, merchantId) {
    try {
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const cvIdIdx = userHeaders.indexOf('CV ID');
      const managementStatusIdx = userHeaders.indexOf('管理ステータス');

      let targetRow = -1;
      for (let i = 0; i < userRows.length; i++) {
        if (userRows[i][cvIdIdx] === cvId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: 'CV IDが見つかりません: ' + cvId
        };
      }

      // 管理ステータスを「配信後未成約」に更新
      userSheet.getRange(targetRow, managementStatusIdx + 1).setValue('配信後未成約');

      // V2039: 配信管理シートから該当レコードを削除（ステータスを「キャンセル承認済み」に更新）
      const ss = userSheet.getParent();
      const deliverySheet = ss.getSheetByName('配信管理');
      if (deliverySheet) {
        const deliveryData = deliverySheet.getDataRange().getValues();
        const deliveryHeaders = deliveryData[0];
        const cvIdColIdx = deliveryHeaders.indexOf('CV ID');
        const franchiseIdColIdx = deliveryHeaders.indexOf('加盟店ID');
        const statusColIdx = deliveryHeaders.indexOf('配信ステータス');

        // 該当レコードを検索してステータス更新
        for (let i = 1; i < deliveryData.length; i++) {
          if (deliveryData[i][cvIdColIdx] === cvId && deliveryData[i][franchiseIdColIdx] === merchantId) {
            deliverySheet.getRange(i + 1, statusColIdx + 1).setValue('キャンセル承認済み');
            console.log('[AdminCancelSystem] 配信管理シート更新: CV', cvId, '加盟店', merchantId, '→ キャンセル承認済み');
            break;
          }
        }
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('[AdminCancelSystem] updateUserSheetForCancel error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
};
