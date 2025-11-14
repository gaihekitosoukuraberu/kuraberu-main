/**
 * ====================================
 * CV配信状況チェックシステム
 * ====================================
 *
 * 【機能】
 * - キャンセル申請時に他社の追客状況をチェック
 * - Slack通知に警告情報を含める
 * - 管理者の判断を支援
 *
 * 【依存関係】
 * - 配信管理シート（読み取り）
 * - 加盟店マスタシート（加盟店名取得）
 */

var CVDeliveryChecker = {
  /**
   * 他社の追客状況をチェック
   * @param {String} cvId - CV ID
   * @param {String} merchantId - キャンセル申請している加盟店ID
   * @return {Object} - {
   *   hasActiveCompetitors: boolean,
   *   competitorDetails: Array,
   *   warningMessage: String
   * }
   */
  checkOtherMerchantsStatus: function(cvId, merchantId) {
    try {
      console.log('[CVDeliveryChecker] チェック開始 - CV ID:', cvId, '申請加盟店:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');

      // 配信管理シートが存在しない場合は警告なし
      if (!deliverySheet) {
        console.log('[CVDeliveryChecker] 配信管理シートが見つかりません（旧データの可能性）');
        return {
          hasActiveCompetitors: false,
          competitorDetails: [],
          warningMessage: ''
        };
      }

      // データ取得
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // カラムインデックス
      const cvIdIdx = headers.indexOf('CV ID');
      const merchantIdIdx = headers.indexOf('加盟店ID');
      const deliveryStatusIdx = headers.indexOf('配信ステータス');
      const detailStatusIdx = headers.indexOf('詳細ステータス');
      const phoneCountIdx = headers.indexOf('電話回数');
      const smsCountIdx = headers.indexOf('SMS回数');
      const lastContactIdx = headers.indexOf('最終連絡日時');
      const appointmentDateIdx = headers.indexOf('アポ予定日時');

      // 他社のレコードを検索
      const alerts = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // 同じCV IDで、申請加盟店以外のレコード
        if (row[cvIdIdx] !== cvId || row[merchantIdIdx] === merchantId) {
          continue;
        }

        const deliveryStatus = row[deliveryStatusIdx];
        const detailStatus = row[detailStatusIdx];
        const phoneCount = row[phoneCountIdx] || 0;
        const smsCount = row[smsCountIdx] || 0;
        const lastContact = row[lastContactIdx];
        const appointmentDate = row[appointmentDateIdx];

        // 既に終了ステータスの場合はスキップ（StatusDefinitionsから取得）
        if (StatusDefinitions.isClosedStatus(detailStatus)) {
          continue;
        }

        // アクティブな追客状況かチェック
        const hasRecentContact = lastContact &&
          (new Date() - new Date(lastContact)) < 7 * 24 * 60 * 60 * 1000;

        const hasActiveStatus = StatusDefinitions.isActiveStatus(detailStatus);

        const hasCallActivity = phoneCount > 0;

        const hasFutureAppointment = appointmentDate &&
          new Date(appointmentDate) > new Date();

        // いずれかの条件に該当する場合は警告対象
        if (hasRecentContact || hasActiveStatus || hasCallActivity || hasFutureAppointment) {
          const merchantName = this.getMerchantName(row[merchantIdIdx]);

          alerts.push({
            merchantId: row[merchantIdIdx],
            merchantName: merchantName,
            phoneCount: phoneCount,
            smsCount: smsCount,
            lastContact: lastContact ? Utilities.formatDate(new Date(lastContact), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '未連絡',
            status: detailStatus,
            appointmentDate: appointmentDate ? Utilities.formatDate(new Date(appointmentDate), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : null
          });
        }
      }

      console.log('[CVDeliveryChecker] 警告対象の他社数:', alerts.length);

      // 警告メッセージ生成
      let warningMessage = '';
      if (alerts.length > 0) {
        warningMessage = '\n\n⚠️ *他社で追客活動が確認されています:*\n';
        alerts.forEach(comp => {
          warningMessage += `• *${comp.merchantName}* (${comp.merchantId})\n`;
          warningMessage += `  - 📞 電話: ${comp.phoneCount}回 | 📱 SMS: ${comp.smsCount}回\n`;
          warningMessage += `  - 最終連絡: ${comp.lastContact}\n`;
          warningMessage += `  - ステータス: ${comp.status}\n`;
          if (comp.appointmentDate) {
            warningMessage += `  - 📅 アポ予定: ${comp.appointmentDate}\n`;
          }
          warningMessage += '\n';
        });
        warningMessage += '*→ 却下を推奨*';
      }

      return {
        hasActiveCompetitors: alerts.length > 0,
        competitorDetails: alerts,
        warningMessage: warningMessage
      };

    } catch (error) {
      console.error('[CVDeliveryChecker] checkOtherMerchantsStatus error:', error);
      return {
        hasActiveCompetitors: false,
        competitorDetails: [],
        warningMessage: '',
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店名を取得
   * @param {String} merchantId - 加盟店ID
   * @return {String} - 加盟店名
   */
  getMerchantName: function(merchantId) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const merchantSheet = ss.getSheetByName('加盟店マスタ');

      if (!merchantSheet) {
        return merchantId; // 加盟店マスタが無い場合はIDをそのまま返す
      }

      const data = merchantSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      const merchantIdIdx = headers.indexOf('加盟店ID');
      const merchantNameIdx = headers.indexOf('会社名');

      if (merchantIdIdx === -1 || merchantNameIdx === -1) {
        return merchantId;
      }

      for (let i = 0; i < rows.length; i++) {
        if (rows[i][merchantIdIdx] === merchantId) {
          return rows[i][merchantNameIdx] || merchantId;
        }
      }

      return merchantId;

    } catch (error) {
      console.error('[CVDeliveryChecker] getMerchantName error:', error);
      return merchantId;
    }
  },

  /**
   * 連絡履歴を追加
   * @param {Object} params - {
   *   cvId: CV ID,
   *   merchantId: 加盟店ID,
   *   contactType: 連絡種別（電話/SMS/メール）,
   *   duration: 通話時間,
   *   result: 結果,
   *   memo: メモ,
   *   recordedBy: 記録者
   * }
   * @return {Object} - { success: boolean }
   */
  addContactHistory: function(params) {
    try {
      const {
        cvId,
        merchantId,
        contactType,
        duration,
        result,
        memo,
        recordedBy
      } = params;

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!deliverySheet) {
        throw new Error('配信管理シートが見つかりません');
      }

      // レコードを検索
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      const cvIdIdx = headers.indexOf('CV ID');
      const merchantIdIdx = headers.indexOf('加盟店ID');
      const phoneCountIdx = headers.indexOf('電話回数');
      const smsCountIdx = headers.indexOf('SMS回数');
      const mailCountIdx = headers.indexOf('メール送信回数');
      const lastContactIdx = headers.indexOf('最終連絡日時');
      const contactHistoryIdx = headers.indexOf('連絡履歴JSON');
      const contactSummaryIdx = headers.indexOf('連絡履歴サマリー');
      const updateTimeIdx = headers.indexOf('最終更新日時');

      let targetRow = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][cvIdIdx] === cvId && data[i][merchantIdIdx] === merchantId) {
          targetRow = i + 1; // スプレッドシートの行番号（1-indexed）
          break;
        }
      }

      if (targetRow === -1) {
        throw new Error('該当するレコードが見つかりません');
      }

      const now = new Date();

      // 連絡履歴JSONに追加
      let contactHistory = [];
      const existingHistory = data[targetRow - 1][contactHistoryIdx];
      if (existingHistory && existingHistory !== '[]') {
        try {
          contactHistory = JSON.parse(existingHistory);
        } catch (e) {
          console.error('既存履歴のパースエラー:', e);
          contactHistory = [];
        }
      }

      const contactId = 'CONTACT' + Date.now();
      const newContact = {
        id: contactId,
        date: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd\'T\'HH:mm:ss'),
        type: contactType,
        duration: duration || '',
        result: result || '',
        memo: memo || '',
        recordedBy: recordedBy || '',
        recordedAt: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd\'T\'HH:mm:ss')
      };

      contactHistory.push(newContact);

      // カウンター更新
      let phoneCount = data[targetRow - 1][phoneCountIdx] || 0;
      let smsCount = data[targetRow - 1][smsCountIdx] || 0;
      let mailCount = data[targetRow - 1][mailCountIdx] || 0;

      if (contactType === '電話') phoneCount++;
      if (contactType === 'SMS') smsCount++;
      if (contactType === 'メール') mailCount++;

      // サマリー生成（最新3件）
      const recent3 = contactHistory.slice(-3).reverse();
      let summary = '';
      recent3.forEach(c => {
        const date = c.date.split('T')[0].replace(/-/g, '/');
        const time = c.date.split('T')[1].substring(0, 5);
        summary += `${date} ${time} ${c.type}: ${c.result || ''}\n`;
      });

      // 更新
      deliverySheet.getRange(targetRow, contactHistoryIdx + 1).setValue(JSON.stringify(contactHistory));
      deliverySheet.getRange(targetRow, contactSummaryIdx + 1).setValue(summary.trim());
      deliverySheet.getRange(targetRow, phoneCountIdx + 1).setValue(phoneCount);
      deliverySheet.getRange(targetRow, smsCountIdx + 1).setValue(smsCount);
      deliverySheet.getRange(targetRow, mailCountIdx + 1).setValue(mailCount);
      deliverySheet.getRange(targetRow, lastContactIdx + 1).setValue(now);
      deliverySheet.getRange(targetRow, updateTimeIdx + 1).setValue(now);

      console.log('[CVDeliveryChecker] 連絡履歴を追加:', contactId);

      return {
        success: true,
        contactId: contactId
      };

    } catch (error) {
      console.error('[CVDeliveryChecker] addContactHistory error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
};
