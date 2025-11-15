/**
 * ============================================
 * CVハートビートシステム（V1754）
 * ============================================
 *
 * 目的: CV1送信後のユーザー行動を監視し、離脱を検知
 * 機能:
 * - ハートビート受信・更新
 * - 離脱検知（3分無反応）
 * - Slack通知連携
 */

class CVHeartbeatSystem {
  /**
   * ルーティングハンドラー（main.jsから呼び出される）
   * @param {Object} params - リクエストパラメータ
   * @return {Object} { success, message }
   */
  static handle(params) {
    const action = params.action;

    if (action === 'heartbeat') {
      return this.updateHeartbeat(params);
    }

    return { success: false, error: 'Unknown action' };
  }

  /**
   * ハートビート受信・更新
   * @param {Object} params - { cvId, timestamp }
   * @return {Object} { success, message }
   */
  static updateHeartbeat(params) {
    try {
      const { cvId, timestamp } = params;

      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      console.log(`[CVHeartbeat] 受信: ${cvId}`);

      // CVシート取得
      const sheet = SpreadsheetApp.openById(CONFIG.SHEETS.CV_SHEET_ID).getSheetByName('CV管理');
      if (!sheet) {
        return { success: false, error: 'CVシートが見つかりません' };
      }

      // CV IDで行を検索（A列）
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      let targetRow = -1;

      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === cvId) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow === -1) {
        return { success: false, error: `CV ID ${cvId} が見つかりません` };
      }

      // BV列(74)に最終ハートビート時刻を更新
      const now = new Date(timestamp || new Date());
      sheet.getRange(targetRow, 74).setValue(now);

      console.log(`[CVHeartbeat] 更新完了: ${cvId} at ${now.toISOString()}`);

      return { success: true, message: 'ハートビート更新完了' };

    } catch (error) {
      console.error('[CVHeartbeat] updateHeartbeat エラー:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * 離脱検知チェック（定期実行トリガーから呼び出し）
   * 3分間ハートビートがない場合、Slack通知を送信
   */
  static checkAbandonment() {
    try {
      console.log('[CVHeartbeat] 離脱チェック開始');

      const sheet = SpreadsheetApp.openById(CONFIG.SHEETS.CV_SHEET_ID).getSheetByName('CV管理');
      if (!sheet) {
        console.error('[CVHeartbeat] CVシートが見つかりません');
        return;
      }

      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const now = new Date();
      const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);

      let abandonedCount = 0;

      // 全行をチェック（ヘッダー行を除く）
      for (let i = 1; i < values.length; i++) {
        const cvId = values[i][0];              // A列: CV ID
        const phone = values[i][6];             // G列: 電話番号
        const registrationTime = values[i][1];  // B列: 登録日時
        const lastHeartbeat = values[i][73];    // BV列(74): 最終ハートビート時刻

        // ハートビートがない、または空の場合はスキップ
        if (!lastHeartbeat || lastHeartbeat === '') continue;

        // 登録から10分以上経過している場合はスキップ（監視期間外）
        const registrationDate = new Date(registrationTime);
        const tenMinutesAfterRegistration = new Date(registrationDate.getTime() + 10 * 60 * 1000);
        if (now > tenMinutesAfterRegistration) continue;

        // 最終ハートビートが3分以上前の場合 → 離脱
        const heartbeatDate = new Date(lastHeartbeat);
        if (heartbeatDate < threeMinutesAgo) {
          console.log(`[CVHeartbeat] 離脱検知: ${cvId}`);

          // Slack通知
          const notificationSent = CVSlackNotifier.sendAbandonmentNotification({
            cvId: cvId,
            phone: phone,
            prefecture: values[i][14],  // O列: 都道府県
            city: values[i][15],        // P列: 市区町村
            lastHeartbeat: heartbeatDate
          });

          if (notificationSent) {
            // 離脱通知済みフラグとして、ハートビート時刻をクリア（重複通知防止）
            sheet.getRange(i + 1, 74).setValue('');
            abandonedCount++;
          }
        }
      }

      console.log(`[CVHeartbeat] 離脱チェック完了: ${abandonedCount}件通知`);

    } catch (error) {
      console.error('[CVHeartbeat] checkAbandonment エラー:', error);
    }
  }
}
