/**
 * ====================================
 * 加盟店 キャンセル期限延長申請システム
 * ====================================
 *
 * 【機能】
 * - 期限延長申請可能案件一覧取得
 * - 期限延長申請登録
 * - 申請期限チェック（配信日+7日以内）
 * - 延長後期限自動計算（配信日の翌月末）
 *
 * 【依存関係】
 * - 配信管理シート（読み取り） ← 主データソース
 * - ユーザー登録シート（読み取り） ← 顧客情報JOIN用
 * - キャンセル期限延長申請シート（書き込み）
 * - キャンセル申請シート（読み取り - 重複チェック）
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（期限延長申請メニュー）
 *
 * 【変更時の注意】
 * ⚠️  配信管理シートの「配信ステータス」は「配信済み」（末尾に「み」）
 * ⚠️  加盟店IDは直接比較（includes不要）
 * ⚠️  期限計算ロジック（翌月末）に注意
 * ⚠️  申請期限（7日以内）の厳密な判定に注意
 */

var MerchantDeadlineExtension = {
  /**
   * 期限延長申請可能案件一覧を取得
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success: boolean, cases: Array }
   */
  getExtensionEligibleCases: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      console.log('[MerchantDeadlineExtension] getExtensionEligibleCases - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
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

      // 既に期限延長申請済みのCV IDを取得
      const appliedExtensionCvIds = new Set();
      if (extensionSheet) {
        const extData = extensionSheet.getDataRange().getValues();
        const extHeaders = extData[0];
        const extRows = extData.slice(1);
        const extCvIdIdx = extHeaders.indexOf('CV ID');
        const extMerchantIdIdx = extHeaders.indexOf('加盟店ID');

        for (let i = 0; i < extRows.length; i++) {
          const cvId = extRows[i][extCvIdIdx];
          const extMerchantId = extRows[i][extMerchantIdIdx];
          if (cvId && (extMerchantId === merchantId || extMerchantId === String(merchantId))) {
            appliedExtensionCvIds.add(cvId);
          }
        }
      }

      // 既にキャンセル申請済みのCV IDを取得
      const appliedCancelCvIds = new Set();
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
            appliedCancelCvIds.add(cvId);
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

      // 期限延長申請可能案件を抽出
      const eligibleCases = [];

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

        // すでに期限延長申請済みの場合はスキップ
        if (appliedExtensionCvIds.has(cvId)) {
          continue;
        }

        // すでにキャンセル申請済みの場合はスキップ
        if (appliedCancelCvIds.has(cvId)) {
          continue;
        }

        // 配信日時チェック
        if (!deliveredAt) {
          continue; // 配信日時がない案件はスキップ
        }

        // 配信日時からの経過日数を計算
        const deliveredDate = new Date(deliveredAt);
        const today = new Date();
        const daysElapsed = Math.floor((today - deliveredDate) / (1000 * 60 * 60 * 24));

        // 申請期限（配信日 + 7日）
        const applicationDeadline = new Date(deliveredDate);
        applicationDeadline.setDate(applicationDeadline.getDate() + 7);
        applicationDeadline.setHours(23, 59, 59, 999);

        // 期限内かどうか（7日以内）
        const isWithinApplicationPeriod = today <= applicationDeadline;

        // 7日以内の案件のみ対象
        if (!isWithinApplicationPeriod) {
          continue;
        }

        // 延長後期限を計算（配信日の翌月末）
        const extendedDeadline = this.calculateExtendedDeadline(deliveredDate);

        // 案件情報を追加
        eligibleCases.push({
          cvId: cvId,
          customerName: userInfo.customerName,
          customerNameKana: userInfo.customerNameKana,
          tel: userInfo.tel,
          address: userInfo.address,
          addressKana: userInfo.addressKana,
          workCategory: userInfo.workCategory,
          deliveredAt: deliveredAt,
          daysElapsed: daysElapsed,
          applicationDeadline: applicationDeadline,
          extendedDeadline: extendedDeadline,
          managementStatus: row[delDetailStatusIdx] || '配信済み'
        });
      }

      console.log('[MerchantDeadlineExtension] getExtensionEligibleCases - 取得件数:', eligibleCases.length);

      return {
        success: true,
        cases: eligibleCases
      };

    } catch (error) {
      console.error('[MerchantDeadlineExtension] getExtensionEligibleCases error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 期限延長申請を登録
   * @param {Object} params - {
   *   merchantId: 加盟店ID,
   *   merchantName: 加盟店名,
   *   applicantName: 申請担当者名（ログイン中ユーザー）,
   *   cvId: CV ID,
   *   contactDate: 連絡がついた日時,
   *   appointmentDate: アポ予定日,
   *   extensionReason: 延長理由
   * }
   * @return {Object} - { success: boolean }
   */
  submitExtensionRequest: function(params) {
    try {
      const {
        merchantId,
        merchantName,
        applicantName,
        cvId,
        contactDate,
        appointmentDate,
        extensionReason
      } = params;

      // バリデーション
      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '必須パラメータが不足しています（merchantId, cvId）'
        };
      }

      if (!contactDate || !appointmentDate || !extensionReason) {
        return {
          success: false,
          error: '連絡日時、アポ予定日、延長理由は必須です'
        };
      }

      console.log('[MerchantDeadlineExtension] submitExtensionRequest - CV ID:', cvId, '加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');
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

      if (!extensionSheet) {
        return {
          success: false,
          error: 'キャンセル期限延長申請シートが見つかりません'
        };
      }

      // 配信管理シートから配信日時を取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const deliveryRows = deliveryData.slice(1);

      const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
      const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
      const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');

      let deliveredAt = null;
      for (let i = 0; i < deliveryRows.length; i++) {
        if (deliveryRows[i][delCvIdIdx] === cvId &&
            (deliveryRows[i][delMerchantIdIdx] === merchantId || deliveryRows[i][delMerchantIdIdx] === String(merchantId))) {
          deliveredAt = deliveryRows[i][delDeliveredAtIdx];
          break;
        }
      }

      if (!deliveredAt) {
        return {
          success: false,
          error: 'この案件の配信情報が見つかりません'
        };
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

      if (targetUserRow === -1) {
        return {
          success: false,
          error: '指定されたCV IDが見つかりません: ' + cvId
        };
      }

      const deliveredDate = new Date(deliveredAt);
      const today = new Date();
      const daysElapsed = Math.floor((today - deliveredDate) / (1000 * 60 * 60 * 24));

      // 申請期限（配信日 + 7日）
      const applicationDeadline = new Date(deliveredDate);
      applicationDeadline.setDate(applicationDeadline.getDate() + 7);
      applicationDeadline.setHours(23, 59, 59, 999);

      // 期限内かどうか
      const isWithinDeadline = today <= applicationDeadline;

      if (!isWithinDeadline) {
        return {
          success: false,
          error: '期限延長申請の期限を過ぎています（配信日から7日以内に申請する必要があります）'
        };
      }

      // 延長後期限を計算（配信日の翌月末）
      const extendedDeadline = this.calculateExtendedDeadline(deliveredDate);

      // 申請IDを生成
      const extensionId = 'DE' + Utilities.formatDate(new Date(), 'JST', 'yyMMddHHmmss');
      const timestamp = new Date();

      // データ整形（キャンセル期限延長申請シートの列順に合わせる）
      const rowData = [
        timestamp,                      // タイムスタンプ
        extensionId,                   // 申請ID
        cvId,                          // CV ID
        customerName,                  // 顧客名
        tel,                           // 電話番号
        address,                       // 住所
        merchantId,                    // 加盟店ID
        merchantName || '',            // 加盟店名
        applicantName || '',           // 申請担当者
        deliveredAt,                   // 配信日時
        daysElapsed,                   // 経過日数
        applicationDeadline,           // 申請期限
        isWithinDeadline,              // 期限内フラグ
        contactDate,                   // 連絡がついた日時
        appointmentDate,               // アポ予定日
        extensionReason,               // 延長理由
        extendedDeadline,              // 延長後期限
        '申請中',                       // 承認ステータス
        '',                            // 承認者
        '',                            // 承認日時
        '',                            // 却下理由
        timestamp                      // 最終更新日時
      ];

      // キャンセル期限延長申請シートに追加
      extensionSheet.appendRow(rowData);

      console.log('[MerchantDeadlineExtension] submitExtensionRequest - 期限延長申請完了:', extensionId);

      // Slack通知
      try {
        if (typeof sendSlackExtensionNotification === 'function') {
          sendSlackExtensionNotification({
            extensionId: extensionId,
            cvId: cvId,
            customerName: customerName,
            merchantId: merchantId,
            merchantName: merchantName,
            contactDate: contactDate,
            appointmentDate: appointmentDate,
            extensionReason: extensionReason,
            extendedDeadline: extendedDeadline
          });
          console.log('[MerchantDeadlineExtension] Slack通知送信完了');
        }
      } catch (slackError) {
        console.error('[MerchantDeadlineExtension] Slack通知エラー:', slackError);
      }

      return {
        success: true,
        message: 'キャンセル期限延長申請を登録しました',
        data: {
          extensionId: extensionId,
          cvId: cvId,
          extendedDeadline: extendedDeadline,
          isWithinDeadline: isWithinDeadline
        }
      };

    } catch (error) {
      console.error('[MerchantDeadlineExtension] submitExtensionRequest error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 延長後期限を計算（配信日の翌月末23:59:59）
   * @param {Date} deliveredDate - 配信日
   * @return {Date} - 延長後期限（翌月末）
   */
  calculateExtendedDeadline: function(deliveredDate) {
    const date = new Date(deliveredDate);
    // 翌月の0日目 = 当月の最終日なので、+2ヶ月して0日目にする
    const nextMonthEnd = new Date(date.getFullYear(), date.getMonth() + 2, 0);
    nextMonthEnd.setHours(23, 59, 59, 999);
    return nextMonthEnd;
  },

  /**
   * SystemRouter用のハンドラー
   * @param {Object} params - リクエストパラメータ
   * @return {Object} - レスポンス
   */
  handle: function(params) {
    const action = params.action;

    switch(action) {
      case 'getExtensionEligibleCases':
        return this.getExtensionEligibleCases(params);
      case 'submitExtensionRequest':
        return this.submitExtensionRequest(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};
