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
      // V2155: 詳細ステータスも自動更新（現調前→現調前キャンセル、現調済以降→現調後失注）
      const ss = userSheet.getParent();
      const deliverySheet = ss.getSheetByName('配信管理');
      if (deliverySheet) {
        const deliveryData = deliverySheet.getDataRange().getValues();
        const deliveryHeaders = deliveryData[0];
        const cvIdColIdx = deliveryHeaders.indexOf('CV ID');
        const franchiseIdColIdx = deliveryHeaders.indexOf('加盟店ID');
        const statusColIdx = deliveryHeaders.indexOf('配信ステータス');
        const detailStatusColIdx = deliveryHeaders.indexOf('詳細ステータス');

        // 該当レコードを検索してステータス更新
        for (let i = 1; i < deliveryData.length; i++) {
          if (deliveryData[i][cvIdColIdx] === cvId && deliveryData[i][franchiseIdColIdx] === merchantId) {
            deliverySheet.getRange(i + 1, statusColIdx + 1).setValue('キャンセル承認済み');

            // V2155: 詳細ステータスを自動更新
            if (detailStatusColIdx !== -1) {
              const currentStatus = deliveryData[i][detailStatusColIdx] || '';
              // 現調前のステータス（新着、未アポ、アポ済）→ 現調前キャンセル
              // 現調済以降のステータス → 現調後失注
              const preInspectionStatuses = ['新着', '未アポ', '架電済/未アポ', 'アポ済', '未対応'];
              const newDetailStatus = preInspectionStatuses.includes(currentStatus)
                ? '現調前キャンセル'
                : '現調後失注';
              deliverySheet.getRange(i + 1, detailStatusColIdx + 1).setValue(newDetailStatus);
              console.log('[AdminCancelSystem] 詳細ステータス更新:', currentStatus, '→', newDetailStatus);
            }

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
  },

  /**
   * V2146: キャンセル申請一覧を取得（管理者ダッシュボード用）
   * @param {Object} params - {
   *   status: 'pending' | 'approved' | 'rejected' | 'all' (デフォルト: 'all')
   * }
   * @return {Object} - { success: boolean, requests: Array }
   */
  getCancelRequests: function(params) {
    try {
      const status = params?.status || 'all';
      console.log('[AdminCancelSystem] getCancelRequests - ステータス:', status);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cancelSheet = ss.getSheetByName('キャンセル申請');

      if (!cancelSheet) {
        return {
          success: false,
          error: 'キャンセル申請シートが見つかりません'
        };
      }

      const cancelData = cancelSheet.getDataRange().getValues();
      if (cancelData.length <= 1) {
        return {
          success: true,
          requests: [],
          stats: { pending: 0, approved: 0, rejected: 0, total: 0 }
        };
      }

      const headers = cancelData[0];
      const rows = cancelData.slice(1);

      // カラムインデックス取得
      const getIdx = (name) => headers.indexOf(name);
      const appIdIdx = getIdx('申請ID');
      const cvIdIdx = getIdx('CV ID');
      const merchantIdIdx = getIdx('加盟店ID');
      const merchantNameIdx = getIdx('加盟店名');
      const customerNameIdx = getIdx('顧客名');
      const customerAreaIdx = getIdx('住所'); // CSVでは「住所」
      const phoneIdx = getIdx('電話番号');
      const reasonIdx = getIdx('キャンセル理由カテゴリ'); // CSVカラム名に合わせる
      const detailIdx = getIdx('キャンセル理由詳細'); // CSVカラム名に合わせる
      const statusIdx = getIdx('承認ステータス');
      const approverIdx = getIdx('承認者');
      const approvalDateIdx = getIdx('承認日時');
      const rejectReasonIdx = getIdx('却下理由');
      const createdAtIdx = getIdx('タイムスタンプ'); // CSVでは「タイムスタンプ」
      const deliveryDateIdx = getIdx('配信日時');
      const phoneCountIdx = getIdx('電話回数');
      const smsCountIdx = getIdx('SMS回数');
      const lastContactIdx = getIdx('最終連絡日時');
      const cancelTextIdx = getIdx('キャンセル申請文');
      const applicantIdx = getIdx('申請担当者');

      const requests = [];
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      // V2148: 月間統計用
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      let thisMonthTotal = 0;
      let thisMonthApproved = 0;
      let thisMonthRejected = 0;
      let lastMonthTotal = 0;
      let lastMonthApproved = 0;
      let lastMonthRejected = 0;

      rows.forEach(row => {
        const reqStatus = row[statusIdx] || '申請中';
        const createdAt = row[createdAtIdx];
        const createdDate = createdAt ? new Date(createdAt) : null;

        // ステータスカウント
        if (reqStatus === '申請中' || reqStatus === '未処理') {
          pendingCount++;
        } else if (reqStatus === '承認済み') {
          approvedCount++;
        } else if (reqStatus === '却下') {
          rejectedCount++;
        }

        // 月間統計（申請日基準）
        if (createdDate) {
          // 今月
          if (createdDate >= thisMonthStart) {
            thisMonthTotal++;
            if (reqStatus === '承認済み') thisMonthApproved++;
            if (reqStatus === '却下') thisMonthRejected++;
          }
          // 先月
          else if (createdDate >= lastMonthStart && createdDate <= lastMonthEnd) {
            lastMonthTotal++;
            if (reqStatus === '承認済み') lastMonthApproved++;
            if (reqStatus === '却下') lastMonthRejected++;
          }
        }

        // フィルタリング
        if (status !== 'all') {
          if (status === 'pending' && reqStatus !== '申請中' && reqStatus !== '未処理') return;
          if (status === 'approved' && reqStatus !== '承認済み') return;
          if (status === 'rejected' && reqStatus !== '却下') return;
        }

        const approvalDate = row[approvalDateIdx];
        const deliveryDate = row[deliveryDateIdx];
        const lastContact = row[lastContactIdx];

        requests.push({
          applicationId: row[appIdIdx] || '',
          cvId: row[cvIdIdx] || '',
          merchantId: row[merchantIdIdx] || '',
          merchantName: row[merchantNameIdx] || '',
          customerName: row[customerNameIdx] || '',
          customerArea: row[customerAreaIdx] || '',
          phone: row[phoneIdx] || '',
          reason: row[reasonIdx] || '',
          detail: row[detailIdx] || '',
          status: reqStatus,
          approver: row[approverIdx] || '',
          approvalDate: approvalDate ? Utilities.formatDate(new Date(approvalDate), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : '',
          rejectReason: row[rejectReasonIdx] || '',
          createdAt: createdAt ? Utilities.formatDate(new Date(createdAt), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : '',
          // 追加情報
          deliveryDate: deliveryDate ? Utilities.formatDate(new Date(deliveryDate), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : '',
          phoneCount: row[phoneCountIdx] || 0,
          smsCount: row[smsCountIdx] || 0,
          lastContact: lastContact ? Utilities.formatDate(new Date(lastContact), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') : '',
          cancelText: row[cancelTextIdx] || '',
          applicant: row[applicantIdx] || '',
          // 経過時間計算（未処理のみ）
          elapsedMinutes: (reqStatus === '申請中' || reqStatus === '未処理') && createdAt
            ? Math.floor((new Date() - new Date(createdAt)) / (1000 * 60))
            : 0
        });
      });

      // 申請日時の新しい順にソート
      requests.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      console.log('[AdminCancelSystem] getCancelRequests - 取得件数:', requests.length);

      // V2148: 承認率計算（処理済み件数で算出）
      const totalProcessed = approvedCount + rejectedCount;
      const approvalRate = totalProcessed > 0 ? Math.round((approvedCount / totalProcessed) * 100) : 0;
      const thisMonthProcessed = thisMonthApproved + thisMonthRejected;
      const thisMonthApprovalRate = thisMonthProcessed > 0 ? Math.round((thisMonthApproved / thisMonthProcessed) * 100) : 0;
      const lastMonthProcessed = lastMonthApproved + lastMonthRejected;
      const lastMonthApprovalRate = lastMonthProcessed > 0 ? Math.round((lastMonthApproved / lastMonthProcessed) * 100) : 0;

      return {
        success: true,
        requests: requests,
        stats: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: rows.length,
          // V2148: 拡張統計
          approvalRate: approvalRate,
          thisMonth: {
            total: thisMonthTotal,
            approved: thisMonthApproved,
            rejected: thisMonthRejected,
            pending: thisMonthTotal - thisMonthApproved - thisMonthRejected,
            approvalRate: thisMonthApprovalRate
          },
          lastMonth: {
            total: lastMonthTotal,
            approved: lastMonthApproved,
            rejected: lastMonthRejected,
            approvalRate: lastMonthApprovalRate
          }
        }
      };

    } catch (error) {
      console.error('[AdminCancelSystem] getCancelRequests error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * V2146: リクエストハンドラー
   */
  handle: function(params) {
    const action = params.action;

    switch (action) {
      case 'getCancelRequests':
        return this.getCancelRequests(params);
      case 'approveCancelReport':
        return this.approveCancelReport(params);
      case 'rejectCancelReport':
        return this.rejectCancelReport(params);
      case 'approveExtensionRequest':
        return this.approveExtensionRequest(params);
      case 'rejectExtensionRequest':
        return this.rejectExtensionRequest(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
