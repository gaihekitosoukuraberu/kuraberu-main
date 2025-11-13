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
 * - ユーザー登録シート（読み取り）
 * - キャンセル申請シート（書き込み）
 * - キャンセル期限延長申請シート（読み取り）
 * - CancelReasons構造定義
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（キャンセル申請メニュー）
 *
 * 【変更時の注意】
 * ⚠️  ユーザー登録シートのカラム構成に依存
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
      const userSheet = ss.getSheetByName('ユーザー登録');
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
          if (cvId && cancelMerchantId === merchantId) {
            appliedCvIds.add(cvId);
          }
        }
      }

      // キャンセル申請可能案件を抽出
      const cancelableCases = [];

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

        // すでにキャンセル申請済みの場合はスキップ
        if (appliedCvIds.has(cvId)) {
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

        // 案件情報を追加
        cancelableCases.push({
          cvId: cvId,
          customerName: row[nameIdx] || '',
          tel: row[telIdx] || '',
          address: row[addressIdx] || '',
          workCategory: row[workCategoryIdx] || '',
          deliveredAt: deliveredAt || '',
          daysElapsed: daysElapsed,
          deadlineDate: deadlineDate,
          isWithinDeadline: isWithinDeadline,
          managementStatus: managementStatus
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
      const userSheet = ss.getSheetByName('ユーザー登録');
      const cancelSheet = ss.getSheetByName('キャンセル申請');
      const extensionSheet = ss.getSheetByName('キャンセル期限延長申請');

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

      // ユーザー登録シートからCV IDで情報取得
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const cvIdIdx = userHeaders.indexOf('CV ID');
      const nameIdx = userHeaders.indexOf('氏名');
      const telIdx = userHeaders.indexOf('電話番号');
      const addressIdx = userHeaders.indexOf('住所');
      const deliveredAtIdx = userHeaders.indexOf('配信日時');
      const deliveredMerchantsIdx = userHeaders.indexOf('配信先業者一覧');

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
        tel,                           // 電話番号
        address,                       // 住所
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
            smsCount: smsCount
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
  }
};
