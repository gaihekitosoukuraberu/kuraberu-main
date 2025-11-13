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
 * - ユーザー登録シート（読み取り）
 * - キャンセル期限延長申請シート（書き込み）
 * - キャンセル申請シート（読み取り - 重複チェック）
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（期限延長申請メニュー）
 *
 * 【変更時の注意】
 * ⚠️  ユーザー登録シートのカラム構成に依存
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
      const userSheet = ss.getSheetByName('ユーザー登録');
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');
      const cancelSheet = ss.getSheetByName('キャンセル申請');

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
          if (cvId && extMerchantId === merchantId) {
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
          if (cvId && cancelMerchantId === merchantId) {
            appliedCancelCvIds.add(cvId);
          }
        }
      }

      // 期限延長申請可能案件を抽出
      const eligibleCases = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cvId = row[cvIdIdx];
        const deliveredMerchants = row[deliveredMerchantsIdx];
        const managementStatus = row[managementStatusIdx];
        const contractMerchantId = row[contractMerchantIdIdx];
        const deliveredAt = row[deliveredAtIdx];

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

        // すでに成約報告済みの場合はスキップ
        if (contractMerchantId && contractMerchantId !== '') {
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
          customerName: row[nameIdx] || '',
          tel: row[telIdx] || '',
          address: row[addressIdx] || '',
          workCategory: row[workCategoryIdx] || '',
          deliveredAt: deliveredAt,
          daysElapsed: daysElapsed,
          applicationDeadline: applicationDeadline,
          extendedDeadline: extendedDeadline,
          managementStatus: managementStatus
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
      const userSheet = ss.getSheetByName('ユーザー登録');
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');

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

      // ユーザー登録シートからCV IDで情報取得
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const cvIdIdx = userHeaders.indexOf('CV ID');
      const nameIdx = userHeaders.indexOf('氏名');
      const telIdx = userHeaders.indexOf('電話番号');
      const addressIdx = userHeaders.indexOf('住所');
      const deliveredAtIdx = userHeaders.indexOf('配信日時');

      let targetUserRow = -1;
      let customerName = '';
      let tel = '';
      let address = '';
      let deliveredAt = null;

      for (let i = 0; i < userRows.length; i++) {
        if (userRows[i][cvIdIdx] === cvId) {
          targetUserRow = i + 2; // ヘッダー分+1、0-indexed分+1
          customerName = userRows[i][nameIdx] || '';
          tel = userRows[i][telIdx] || '';
          address = userRows[i][addressIdx] || '';
          deliveredAt = userRows[i][deliveredAtIdx];
          break;
        }
      }

      if (targetUserRow === -1) {
        return {
          success: false,
          error: '指定されたCV IDが見つかりません: ' + cvId
        };
      }

      // 配信日時チェック
      if (!deliveredAt) {
        return {
          success: false,
          error: 'この案件には配信日時が設定されていません'
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
  }
};
