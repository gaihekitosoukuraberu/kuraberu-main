/**
 * ====================================
 * 加盟店 キャンセル申請システム
 * ====================================
 *
 * 【機能】
 * - キャンセル申請可能案件一覧取得
 * - キャンセル申請登録
 * - 期限チェック（配信日+7日 or 延長承認済みなら翌月末まで）
 * - フォローアップ履歴チェック
 *
 * 【依存関係】
 * - 配信管理シート（読み取り） ← 主データソース
 * - ユーザー登録シート（読み取り） ← 顧客情報JOIN用
 * - キャンセル申請シート（書き込み）
 * - キャンセル期限延長申請シート（読み取り）
 * - CancelReasons構造定義
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（キャンセル申請メニュー）
 *
 * 【変更時の注意】
 * ⚠️  配信管理シートの「配信ステータス」は「配信済み」（末尾に「み」）
 * ⚠️  加盟店IDは直接比較（includes不要）
 * ⚠️  期限計算ロジックに注意
 * ⚠️  フォローアップ履歴の最低要件に注意
 */

var MerchantCancelReport = {
  /**
   * キャンセル申請可能案件一覧を取得
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success: boolean, cases: Array }
   */
  getCancelableCases: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      console.log('[MerchantCancelReport] getCancelableCases - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');
      const cancelSheet = ss.getSheetByName('キャンセル申請');

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
      const userArchiveStatusIdx = userHeaders.indexOf('アーカイブ状態');
      const userArchiveMerchantIdx = userHeaders.indexOf('アーカイブ加盟店ID');

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
            contractMerchantId: row[userContractMerchantIdIdx] || '',
            archiveStatus: userArchiveStatusIdx >= 0 ? row[userArchiveStatusIdx] : '',
            archiveMerchantId: userArchiveMerchantIdx >= 0 ? row[userArchiveMerchantIdx] : ''
          };
        }
      });

      // 既にキャンセル申請済みのCV IDを取得
      const appliedCvIds = new Set();
      if (cancelSheet) {
        const cancelData = cancelSheet.getDataRange().getValues();
        const cancelHeaders = cancelData[0];
        const cancelRows = cancelData.slice(1);
        const cancelCvIdIdx = cancelHeaders.indexOf('CV ID');
        const cancelMerchantIdIdx = cancelHeaders.indexOf('加盟店ID');

        for (let i = 0; i < cancelRows.length; i++) {
          const cvId = cancelRows[i][cancelCvIdIdx];
          const cancelMerchantId = cancelRows[i][cancelMerchantIdIdx];
          if (cvId && (cancelMerchantId === merchantId || cancelMerchantId === String(merchantId))) {
            appliedCvIds.add(cvId);
          }
        }
      }

      // 配信管理シートから配信済み案件を取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const deliveryRows = deliveryData.slice(1);

      const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
      const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
      const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');
      const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');
      const delDetailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');
      const delContactHistoryIdx = deliveryHeaders.indexOf('連絡履歴JSON');

      // キャンセル申請可能案件を抽出
      const cancelableCases = [];

      for (let i = 0; i < deliveryRows.length; i++) {
        const row = deliveryRows[i];
        const cvId = row[delCvIdIdx];
        const rowMerchantId = row[delMerchantIdIdx];
        const deliveredAt = row[delDeliveredAtIdx];
        const deliveryStatus = row[delStatusIdx];

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

        // すでに成約報告済みの場合はスキップ
        if (userInfo.contractMerchantId && userInfo.contractMerchantId !== '') {
          continue;
        }

        // すでにキャンセル申請済みの場合はスキップ
        if (appliedCvIds.has(cvId)) {
          continue;
        }

        // アーカイブ済み（追客終了BOX）の案件はスキップ
        if (userInfo.archiveStatus === 'archived' &&
            (userInfo.archiveMerchantId === merchantId || userInfo.archiveMerchantId === String(merchantId))) {
          continue;
        }

        // 配信日時からの経過日数を計算
        let daysElapsed = null;
        let isWithinDeadline = null;
        let deadlineDate = null;

        if (deliveredAt) {
          const deliveredDate = new Date(deliveredAt);
          const today = new Date();
          daysElapsed = Math.floor((today - deliveredDate) / (1000 * 60 * 60 * 24));

          // 申請期限（配信日 + 7日）
          deadlineDate = new Date(deliveredDate);
          deadlineDate.setDate(deadlineDate.getDate() + 7);
          deadlineDate.setHours(23, 59, 59, 999);

          // 期限内かどうか
          isWithinDeadline = today <= deadlineDate;
        }

        // 連絡履歴を解析（配信管理シートから）
        let callHistory = [];
        let phoneCallCount = 0;
        let smsCount = 0;
        let lastContactDate = null;

        if (delContactHistoryIdx >= 0 && row[delContactHistoryIdx]) {
          try {
            callHistory = JSON.parse(row[delContactHistoryIdx]);
            if (Array.isArray(callHistory)) {
              phoneCallCount = callHistory.filter(h => h.type === '電話').length;
              smsCount = callHistory.filter(h => h.type === 'SMS').length;

              // 最終連絡日時を取得
              if (callHistory.length > 0) {
                const sortedHistory = callHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
                lastContactDate = sortedHistory[0].date;
              }
            }
          } catch (e) {
            console.error('[MerchantCancelReport] 連絡履歴パースエラー:', e);
          }
        }

        // 案件情報を追加
        cancelableCases.push({
          cvId: cvId,
          customerName: userInfo.customerName,
          customerNameKana: userInfo.customerNameKana,
          tel: userInfo.tel,
          address: userInfo.address,
          addressKana: userInfo.addressKana,
          workCategory: userInfo.workCategory,
          deliveredAt: deliveredAt || '',
          daysElapsed: daysElapsed,
          deadlineDate: deadlineDate,
          isWithinDeadline: isWithinDeadline,
          managementStatus: row[delDetailStatusIdx] || '配信済み', // 詳細ステータスを使用
          callHistory: callHistory,
          phoneCallCount: phoneCallCount,
          smsCount: smsCount,
          lastContactDate: lastContactDate
        });
      }

      console.log('[MerchantCancelReport] getCancelableCases - 取得件数:', cancelableCases.length);

      return {
        success: true,
        cases: cancelableCases
      };

    } catch (error) {
      console.error('[MerchantCancelReport] getCancelableCases error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * キャンセル申請済み案件一覧を取得（ステータス別）
   * @param {Object} params - { merchantId: 加盟店ID, status: 'pending' | 'approved' | 'rejected' }
   * @return {Object} - { success: boolean, cases: Array }
   */
  getCancelAppliedCases: function(params) {
    try {
      const merchantId = params.merchantId;
      const status = params.status;

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return {
          success: false,
          error: 'ステータスが不正です（pending, approved, rejected のいずれか）'
        };
      }

      console.log('[MerchantCancelReport] getCancelAppliedCases - 加盟店ID:', merchantId, 'ステータス:', status);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cancelSheet = ss.getSheetByName('キャンセル申請');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!cancelSheet) {
        return {
          success: false,
          error: 'キャンセル申請シートが見つかりません'
        };
      }

      // ユーザー登録シートから顧客情報マップを作成（動的アサイン）
      let userDataMap = {};
      if (userSheet) {
        const userData = userSheet.getDataRange().getValues();
        const userHeaders = userData[0];
        const userRows = userData.slice(1);

        const userCvIdIdx = userHeaders.indexOf('CV ID');
        const userNameKanaIdx = userHeaders.indexOf('フリガナ');
        const userAddressKanaIdx = userHeaders.indexOf('住所フリガナ');
        const userTelIdx = userHeaders.indexOf('電話番号');
        const userPrefectureIdx = userHeaders.indexOf('都道府県（物件）');
        const userCityIdx = userHeaders.indexOf('市区町村（物件）');
        const userAddressDetailIdx = userHeaders.indexOf('住所詳細（物件）');

        if (userCvIdIdx >= 0) {
          userRows.forEach(userRow => {
            const cvId = userRow[userCvIdIdx];
            if (cvId) {
              const prefecture = userPrefectureIdx >= 0 ? (userRow[userPrefectureIdx] || '') : '';
              const city = userCityIdx >= 0 ? (userRow[userCityIdx] || '') : '';
              const addressDetail = userAddressDetailIdx >= 0 ? (userRow[userAddressDetailIdx] || '') : '';
              const fullAddress = prefecture + city + addressDetail;

              userDataMap[cvId] = {
                nameKana: userNameKanaIdx >= 0 ? (userRow[userNameKanaIdx] || '') : '',
                addressKana: userAddressKanaIdx >= 0 ? (userRow[userAddressKanaIdx] || '') : '',
                tel: userTelIdx >= 0 ? (userRow[userTelIdx] || '') : '',
                address: fullAddress
              };
            }
          });
        }
      }

      // データ取得
      const data = cancelSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // 必要なカラムのインデックス取得
      const cvIdIdx = headers.indexOf('CV ID');
      const customerNameIdx = headers.indexOf('顧客名');
      const telIdx = headers.indexOf('電話番号');
      const addressIdx = headers.indexOf('住所');
      const merchantIdIdx = headers.indexOf('加盟店ID');
      const merchantNameIdx = headers.indexOf('加盟店名');
      const applicantNameIdx = headers.indexOf('申請担当者');
      const deliveredAtIdx = headers.indexOf('配信日時');
      const timestampIdx = headers.indexOf('タイムスタンプ');
      const applicationIdIdx = headers.indexOf('申請ID');
      const statusColIdx = headers.indexOf('承認ステータス');
      const approverIdx = headers.indexOf('承認者');
      const approvedAtIdx = headers.indexOf('承認日時');
      const rejectionReasonIdx = headers.indexOf('却下理由');
      const cancelReasonCategoryIdx = headers.indexOf('キャンセル理由カテゴリ');
      const cancelReasonDetailIdx = headers.indexOf('キャンセル理由詳細');
      const cancelApplicationTextIdx = headers.indexOf('キャンセル申請文');

      // ステータスマッピング
      const statusMapping = {
        'pending': '申請中',
        'approved': '承認済み',
        'rejected': '却下'
      };
      const targetStatus = statusMapping[status];

      // 申請済み案件を抽出
      const appliedCases = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowMerchantId = row[merchantIdIdx];
        const rowStatus = row[statusColIdx];
        const cvId = row[cvIdIdx];

        // 空行スキップ
        if (!cvId) continue;

        // この加盟店の案件で、指定されたステータスのもののみ
        if ((rowMerchantId === merchantId || rowMerchantId === String(merchantId)) &&
            rowStatus === targetStatus) {

          // ユーザー登録シートから動的に顧客情報を取得（住所・電話・フリガナ）
          const userData = userDataMap[cvId] || { nameKana: '', addressKana: '', tel: '', address: '' };

          // 案件情報を追加
          appliedCases.push({
            cvId: cvId,
            applicationId: row[applicationIdIdx] || '',
            customerName: row[customerNameIdx] || '',
            customerNameKana: userData.nameKana,
            tel: userData.tel,  // ユーザー登録シートから取得
            address: userData.address,  // ユーザー登録シートから取得
            addressKana: userData.addressKana,  // ユーザー登録シートから取得
            merchantName: row[merchantNameIdx] || '',
            applicantName: row[applicantNameIdx] || '',
            deliveredAt: row[deliveredAtIdx] || '',
            appliedAt: row[timestampIdx] || '',
            status: rowStatus,
            approver: row[approverIdx] || '',
            approvedAt: row[approvedAtIdx] || '',
            rejectionReason: row[rejectionReasonIdx] || '',
            rejectedAt: rowStatus === '却下済み' ? row[approvedAtIdx] : '', // 却下日は承認日時列と同じ
            cancelReasonCategory: row[cancelReasonCategoryIdx] || '',
            cancelReasonDetail: row[cancelReasonDetailIdx] || '',
            reason: row[cancelApplicationTextIdx] || '' // フロントで申請理由として表示
          });
        }
      }

      console.log('[MerchantCancelReport] getCancelAppliedCases - 取得件数:', appliedCases.length);

      return {
        success: true,
        cases: appliedCases
      };

    } catch (error) {
      console.error('[MerchantCancelReport] getCancelAppliedCases error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * キャンセル申請を登録
   * @param {Object} params - {
   *   merchantId: 加盟店ID,
   *   merchantName: 加盟店名,
   *   applicantName: 申請担当者名（ログイン中ユーザー）,
   *   cvId: CV ID,
   *   cancelReasonCategory: キャンセル理由カテゴリ,
   *   cancelReasonDetail: キャンセル理由詳細,
   *   reasonData: 理由データJSON（階層的選択の完全なデータ）,
   *   additionalInfo1-5: 追加情報1〜5,
   *   phoneCallCount: 電話回数,
   *   smsCount: SMS回数,
   *   lastContactDate: 最終連絡日時,
   *   contactDate: 電話繋がった日時,
   *   otherCompany: 他社業者名,
   *   contractTiming: 契約時期,
   *   customerSentiment: 温度感,
   *   complaintDetail: クレーム内容,
   *   otherDetail: その他詳細
   * }
   * @return {Object} - { success: boolean }
   */
  submitCancelReport: function(params) {
    try {
      const {
        merchantId,
        merchantName,
        applicantName,
        cvId,
        cancelReasonCategory,
        cancelReasonDetail,
        reasonData,
        additionalInfo1,
        additionalInfo2,
        additionalInfo3,
        additionalInfo4,
        additionalInfo5,
        phoneCallCount,
        smsCount,
        lastContactDate,
        contactDate,
        otherCompany,
        contractTiming,
        customerSentiment,
        complaintDetail,
        otherDetail
      } = params;

      // バリデーション
      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '必須パラメータが不足しています（merchantId, cvId）'
        };
      }

      if (!cancelReasonCategory || !cancelReasonDetail) {
        return {
          success: false,
          error: 'キャンセル理由を選択してください'
        };
      }

      console.log('[MerchantCancelReport] submitCancelReport - CV ID:', cvId, '加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');
      const cancelSheet = ss.getSheetByName('キャンセル申請');
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');

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

      if (!cancelSheet) {
        return {
          success: false,
          error: 'キャンセル申請シートが見つかりません'
        };
      }

      // V2109: パラメータで配信日時が渡された場合はそれを使用（ステータスモーダルからの申請）
      let deliveredAt = params.deliveredAt || null;

      // 配信日時がない場合のみ、配信管理シートから取得
      if (!deliveredAt) {
        const deliveryData = deliverySheet.getDataRange().getValues();
        const deliveryHeaders = deliveryData[0];
        const deliveryRows = deliveryData.slice(1);

        const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
        const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
        const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');

        // V2109: CV IDのみで検索（加盟店IDの形式が異なる可能性があるため）
        for (let i = 0; i < deliveryRows.length; i++) {
          if (deliveryRows[i][delCvIdIdx] === cvId) {
            const rowMerchantId = deliveryRows[i][delMerchantIdIdx];
            console.log('[MerchantCancelReport] 配信管理シート検索: CV ID=' + cvId + ', シートの加盟店ID=' + rowMerchantId + ', リクエストの加盟店ID=' + merchantId);

            // 加盟店IDの照合（完全一致、または部分一致）
            if (rowMerchantId === merchantId ||
                rowMerchantId === String(merchantId) ||
                String(rowMerchantId).includes(merchantId) ||
                String(merchantId).includes(rowMerchantId)) {
              deliveredAt = deliveryRows[i][delDeliveredAtIdx];
              break;
            }
          }
        }

        if (!deliveredAt) {
          return {
            success: false,
            error: 'この案件の配信情報が見つかりません（CV ID: ' + cvId + ', 加盟店ID: ' + merchantId + '）'
          };
        }
      }

      // ユーザー登録シートからCV IDで情報取得
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const cvIdIdx = userHeaders.indexOf('CV ID');
      const nameIdx = userHeaders.indexOf('氏名');
      const nameKanaIdx = userHeaders.indexOf('フリガナ');
      const telIdx = userHeaders.indexOf('電話番号');
      const prefectureIdx = userHeaders.indexOf('都道府県（物件）');
      const cityIdx = userHeaders.indexOf('市区町村（物件）');
      const addressDetailIdx = userHeaders.indexOf('住所詳細（物件）');
      const addressKanaIdx = userHeaders.indexOf('住所フリガナ');

      let targetUserRow = -1;
      let customerName = '';
      let customerNameKana = '';
      let tel = '';
      let address = '';
      let addressKana = '';

      for (let i = 0; i < userRows.length; i++) {
        if (userRows[i][cvIdIdx] === cvId) {
          targetUserRow = i + 2; // ヘッダー分+1、0-indexed分+1
          customerName = userRows[i][nameIdx] || '';
          customerNameKana = nameKanaIdx >= 0 ? (userRows[i][nameKanaIdx] || '') : '';
          tel = userRows[i][telIdx] || '';

          // 住所を結合
          const prefecture = prefectureIdx >= 0 ? (userRows[i][prefectureIdx] || '') : '';
          const city = cityIdx >= 0 ? (userRows[i][cityIdx] || '') : '';
          const addressDetail = addressDetailIdx >= 0 ? (userRows[i][addressDetailIdx] || '') : '';
          address = prefecture + city + addressDetail;

          addressKana = addressKanaIdx >= 0 ? (userRows[i][addressKanaIdx] || '') : '';
          break;
        }
      }

      // V2109: ユーザー登録シートに見つからない場合、パラメータから取得（ステータスモーダルからの申請）
      if (targetUserRow === -1) {
        // パラメータに顧客情報がある場合はそれを使用
        if (params.customerName) {
          customerName = params.customerName || '';
          tel = params.tel || '';
          address = params.address || '';
          // targetUserRowは-1のままだが、顧客情報はパラメータから取得済み
          console.log('[MerchantCancelReport] ユーザー登録にCV IDなし、パラメータから顧客情報を使用:', cvId);
        } else {
          return {
            success: false,
            error: '指定されたCV IDが見つかりません: ' + cvId
          };
        }
      }

      const deliveredDate = new Date(deliveredAt);
      const today = new Date();
      const daysElapsed = Math.floor((today - deliveredDate) / (1000 * 60 * 60 * 24));

      // 基本期限（配信日 + 7日）
      const basicDeadline = new Date(deliveredDate);
      basicDeadline.setDate(basicDeadline.getDate() + 7);
      basicDeadline.setHours(23, 59, 59, 999);

      // 期限延長申請チェック
      let extensionApproved = false;
      let extensionId = '';
      let extendedDeadline = null;

      if (extensionSheet) {
        const extData = extensionSheet.getDataRange().getValues();
        const extHeaders = extData[0];
        const extRows = extData.slice(1);

        const extCvIdIdx = extHeaders.indexOf('CV ID');
        const extMerchantIdIdx = extHeaders.indexOf('加盟店ID');
        const extStatusIdx = extHeaders.indexOf('承認ステータス');
        const extIdIdx = extHeaders.indexOf('申請ID');
        const extDeadlineIdx = extHeaders.indexOf('延長後期限');

        for (let i = 0; i < extRows.length; i++) {
          const extCvId = extRows[i][extCvIdIdx];
          const extMerchantId = extRows[i][extMerchantIdIdx];
          const extStatus = extRows[i][extStatusIdx];

          if (extCvId === cvId &&
              (extMerchantId === merchantId || extMerchantId === String(merchantId)) &&
              extStatus === '承認済み') {
            extensionApproved = true;
            extensionId = extRows[i][extIdIdx] || '';
            extendedDeadline = extRows[i][extDeadlineIdx];
            break;
          }
        }
      }

      // 期限チェック
      let isWithinDeadline = false;
      let applicableDeadline = basicDeadline;

      if (extensionApproved && extendedDeadline) {
        // 延長承認済み：翌月末まで
        applicableDeadline = new Date(extendedDeadline);
        isWithinDeadline = today <= applicableDeadline;
      } else {
        // 基本：配信日 + 7日
        isWithinDeadline = today <= basicDeadline;
      }

      if (!isWithinDeadline) {
        return {
          success: false,
          error: 'キャンセル申請期限を過ぎています（期限: ' + Utilities.formatDate(applicableDeadline, 'JST', 'yyyy-MM-dd HH:mm') + '）'
        };
      }

      // フォローアップ履歴チェック（該当カテゴリの場合）
      if (typeof CancelReasons !== 'undefined') {
        const category = CancelReasons.getCategoryById(cancelReasonCategory);
        if (category && category.requiresFollowUp) {
          const minPhoneCalls = category.minPhoneCalls || 0;
          const minSMS = category.minSMS || 0;

          if ((phoneCallCount || 0) < minPhoneCalls) {
            return {
              success: false,
              error: `このキャンセル理由では最低${minPhoneCalls}回の電話が必要です（現在: ${phoneCallCount || 0}回）`
            };
          }

          if ((smsCount || 0) < minSMS) {
            return {
              success: false,
              error: `このキャンセル理由では最低${minSMS}回のSMSが必要です（現在: ${smsCount || 0}回）`
            };
          }
        }
      }

      // 申請IDを生成
      const applicationId = 'CN' + Utilities.formatDate(new Date(), 'JST', 'yyMMddHHmmss');
      const timestamp = new Date();

      // AI申請文生成
      const cancelApplicationText = this.generateCancelApplicationText({
        customerName: customerName,
        cvId: cvId,
        cancelReasonCategory: cancelReasonCategory,
        cancelReasonDetail: cancelReasonDetail,
        additionalInfo1: additionalInfo1,
        additionalInfo2: additionalInfo2,
        additionalInfo3: additionalInfo3,
        phoneCallCount: phoneCallCount,
        smsCount: smsCount,
        lastContactDate: lastContactDate,
        customerSentiment: customerSentiment,
        complaintDetail: complaintDetail,
        otherDetail: otherDetail
      });

      // データ整形（キャンセル申請シートの列順に合わせる）
      const rowData = [
        timestamp,                      // タイムスタンプ
        applicationId,                  // 申請ID
        cvId,                          // CV ID
        customerName,                  // 顧客名
        customerNameKana,              // 顧客名フリガナ
        tel,                           // 電話番号
        address,                       // 住所
        addressKana,                   // 住所フリガナ
        merchantId,                    // 加盟店ID
        merchantName || '',            // 加盟店名
        applicantName || '',           // 申請担当者
        deliveredAt,                   // 配信日時
        daysElapsed,                   // 経過日数
        basicDeadline,                 // 申請期限（基本）
        isWithinDeadline,              // 期限内フラグ
        extensionId,                   // 期限延長申請ID
        extendedDeadline || '',        // 延長後期限
        cancelReasonCategory,          // キャンセル理由カテゴリ
        cancelReasonDetail,            // キャンセル理由詳細
        additionalInfo1 || '',         // 追加情報1
        additionalInfo2 || '',         // 追加情報2
        additionalInfo3 || '',         // 追加情報3
        additionalInfo4 || '',         // 追加情報4
        additionalInfo5 || '',         // 追加情報5
        reasonData ? JSON.stringify(reasonData) : '', // 理由データJSON
        phoneCallCount || 0,           // 電話回数
        smsCount || 0,                 // SMS回数
        lastContactDate || '',         // 最終連絡日時
        contactDate || '',             // 電話繋がった日時
        otherCompany || '',            // 他社業者名
        contractTiming || '',          // 契約時期
        customerSentiment || '',       // 温度感
        complaintDetail || '',         // クレーム内容
        otherDetail || '',             // その他詳細
        cancelApplicationText,         // キャンセル申請文
        '申請中',                       // 承認ステータス
        '',                            // 承認者
        '',                            // 承認日時
        '',                            // 却下理由
        false,                         // 自動不成約追加済
        timestamp                      // 最終更新日時
      ];

      // キャンセル申請シートに追加
      cancelSheet.appendRow(rowData);

      console.log('[MerchantCancelReport] submitCancelReport - キャンセル申請完了:', applicationId);

      // Slack通知
      try {
        if (typeof sendSlackCancelNotification === 'function') {
          sendSlackCancelNotification({
            applicationId: applicationId,
            cvId: cvId,
            customerName: customerName,
            merchantId: merchantId,
            merchantName: merchantName,
            cancelReasonCategory: cancelReasonCategory,
            cancelReasonDetail: cancelReasonDetail,
            cancelApplicationText: cancelApplicationText,
            phoneCallCount: phoneCallCount,
            smsCount: smsCount,
            cancelDeadline: applicableDeadline
          });
          console.log('[MerchantCancelReport] Slack通知送信完了');
        }
      } catch (slackError) {
        console.error('[MerchantCancelReport] Slack通知エラー:', slackError);
      }

      return {
        success: true,
        message: 'キャンセル申請を登録しました',
        data: {
          applicationId: applicationId,
          cvId: cvId,
          isWithinDeadline: isWithinDeadline,
          extensionApproved: extensionApproved
        }
      };

    } catch (error) {
      console.error('[MerchantCancelReport] submitCancelReport error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * AI申請文生成
   * @param {Object} data - 申請データ
   * @return {String} - 生成された申請文
   */
  generateCancelApplicationText: function(data) {
    // AI生成のロジック（現時点ではテンプレートベース）
    // 将来的にOpenAI APIなどで生成可能

    let text = `【キャンセル申請】\n\n`;
    text += `お客様名: ${data.customerName}\n`;
    text += `CV ID: ${data.cvId}\n\n`;
    text += `【キャンセル理由】\n`;
    text += `${data.cancelReasonCategory} - ${data.cancelReasonDetail}\n\n`;

    if (data.additionalInfo1) {
      text += `【詳細情報】\n`;
      text += `${data.additionalInfo1}\n`;
      if (data.additionalInfo2) {
        text += `${data.additionalInfo2}\n`;
      }
      if (data.additionalInfo3) {
        text += `${data.additionalInfo3}\n`;
      }
      text += `\n`;
    }

    if (data.phoneCallCount || data.smsCount) {
      text += `【フォローアップ履歴】\n`;
      if (data.phoneCallCount) {
        text += `電話回数: ${data.phoneCallCount}回\n`;
      }
      if (data.smsCount) {
        text += `SMS回数: ${data.smsCount}回\n`;
      }
      if (data.lastContactDate) {
        text += `最終連絡: ${Utilities.formatDate(new Date(data.lastContactDate), 'JST', 'yyyy-MM-dd HH:mm')}\n`;
      }
      text += `\n`;
    }

    if (data.customerSentiment) {
      text += `【お客様の温度感】\n${data.customerSentiment}\n\n`;
    }

    if (data.complaintDetail) {
      text += `【クレーム内容】\n${data.complaintDetail}\n\n`;
    }

    if (data.otherDetail) {
      text += `【その他詳細】\n${data.otherDetail}\n\n`;
    }

    text += `以上の理由により、キャンセル申請をさせていただきます。`;

    return text;
  },

  /**
   * キャンセル申請を取り消し（削除）
   * @param {Object} params - { merchantId: 加盟店ID, applicationId: 申請ID, cvId: CV ID }
   * @return {Object} - { success: boolean }
   */
  withdrawCancelApplication: function(params) {
    try {
      const merchantId = params.merchantId;
      const applicationId = params.applicationId;
      const cvId = params.cvId;

      if (!merchantId || !applicationId) {
        return {
          success: false,
          error: '必須パラメータが不足しています（merchantId, applicationId）'
        };
      }

      console.log('[MerchantCancelReport] withdrawCancelApplication - 申請ID:', applicationId, '加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const cancelSheet = ss.getSheetByName('キャンセル申請');

      if (!cancelSheet) {
        return {
          success: false,
          error: 'キャンセル申請シートが見つかりません'
        };
      }

      // データ取得
      const data = cancelSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      const applicationIdIdx = headers.indexOf('申請ID');
      const merchantIdIdx = headers.indexOf('加盟店ID');
      const statusIdx = headers.indexOf('承認ステータス');
      const cvIdIdx = headers.indexOf('CV ID');

      // 申請を検索して削除
      let deleted = false;
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        const rowApplicationId = row[applicationIdIdx];
        const rowMerchantId = row[merchantIdIdx];
        const rowStatus = row[statusIdx];
        const rowCvId = row[cvIdIdx];

        // 申請IDと加盟店IDが一致し、かつステータスが「申請中」の場合のみ削除
        if (rowApplicationId === applicationId &&
            (rowMerchantId === merchantId || rowMerchantId === String(merchantId)) &&
            rowStatus === '申請中') {

          // 行を削除（+2は、ヘッダー行+1、0-indexed+1）
          cancelSheet.deleteRow(i + 2);
          deleted = true;
          console.log('[MerchantCancelReport] withdrawCancelApplication - 削除完了: 行', i + 2, 'CV ID:', rowCvId);
          break;
        }
      }

      if (!deleted) {
        return {
          success: false,
          error: '取り消し可能な申請が見つかりませんでした（申請中のステータスのみ取り消し可能です）'
        };
      }

      console.log('[MerchantCancelReport] withdrawCancelApplication - 取り消し完了:', applicationId);

      return {
        success: true,
        message: 'キャンセル申請を取り消しました'
      };

    } catch (error) {
      console.error('[MerchantCancelReport] withdrawCancelApplication error:', error);
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
      case 'getCancelableCases':
        return this.getCancelableCases(params);
      case 'getCancelAppliedCases':
        return this.getCancelAppliedCases(params);
      case 'submitCancelReport':
        return this.submitCancelReport(params);
      case 'withdrawCancelApplication':
        return this.withdrawCancelApplication(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
