/**
 * ====================================
 * V2088: 通知トリガーシステム
 * ====================================
 *
 * 【機能】
 * - まとめ通知（前日18:00、当日09:00）
 * - 直前リマインダー（架電10分前、現調・商談30分前）
 * - トリガーの自動設定・管理
 *
 * 【トリガー設定】
 * setupNotificationTriggers() を手動で1回実行してトリガーを設定
 */

const NotificationTriggerSystem = {

  /**
   * トリガーを設定（初回のみ実行）
   */
  setupTriggers() {
    // 既存のトリガーを削除
    this.deleteTriggers();

    // 毎日08:00に実行（当日まとめ通知）
    ScriptApp.newTrigger('sendMorningSummary')
      .timeBased()
      .atHour(8)
      .everyDays(1)
      .create();

    // 毎日18:00に実行（翌日まとめ通知）
    ScriptApp.newTrigger('sendEveningSummary')
      .timeBased()
      .atHour(18)
      .everyDays(1)
      .create();

    // 毎分実行（直前リマインダーチェック）
    ScriptApp.newTrigger('checkImmediateReminders')
      .timeBased()
      .everyMinutes(1)
      .create();

    console.log('[NotificationTrigger] トリガー設定完了');
    return { success: true, message: 'トリガーを設定しました' };
  },

  /**
   * 既存のトリガーを削除
   */
  deleteTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    const targetFunctions = ['sendMorningSummary', 'sendEveningSummary', 'checkImmediateReminders'];

    triggers.forEach(trigger => {
      if (targetFunctions.includes(trigger.getHandlerFunction())) {
        ScriptApp.deleteTrigger(trigger);
        console.log('[NotificationTrigger] トリガー削除:', trigger.getHandlerFunction());
      }
    });
  },

  /**
   * 当日朝まとめ通知（09:00）
   */
  sendMorningSummary() {
    console.log('[NotificationTrigger] 当日まとめ通知開始');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 全加盟店のユーザーに対して通知
    this._sendSummaryNotifications(today, tomorrow, '本日');
  },

  /**
   * 前日夕方まとめ通知（18:00）
   */
  sendEveningSummary() {
    console.log('[NotificationTrigger] 翌日まとめ通知開始');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // 全加盟店のユーザーに対して通知
    this._sendSummaryNotifications(tomorrow, dayAfterTomorrow, '明日');
  },

  /**
   * まとめ通知を送信
   */
  _sendSummaryNotifications(startDate, endDate, label) {
    try {
      // 配信管理シートから案件を取得
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      if (!deliverySheet) {
        console.log('[NotificationTrigger] 配信管理シートが見つかりません');
        return;
      }

      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // カラムインデックスを取得
      const colIndex = {
        merchantId: headers.indexOf('加盟店ID'),
        customerName: headers.indexOf('お客様名'),
        nextCallDate: headers.indexOf('次回架電日時'),
        surveyDate: headers.indexOf('現調予定日時'),
        estimateDate: headers.indexOf('商談予定日時'),
        status: headers.indexOf('配信ステータス')
      };

      // 加盟店ごとにタスクを集計
      const merchantTasks = {};

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const merchantId = row[colIndex.merchantId];
        const status = row[colIndex.status];

        // 成約・失注は除外
        if (status === '成約' || status === '失注') continue;

        if (!merchantTasks[merchantId]) {
          merchantTasks[merchantId] = { calls: [], surveys: [], meetings: [] };
        }

        // 次回架電
        const callDate = this._parseDate(row[colIndex.nextCallDate]);
        if (callDate && callDate >= startDate && callDate < endDate) {
          merchantTasks[merchantId].calls.push({
            customerName: row[colIndex.customerName] || '---',
            time: this._formatTime(callDate)
          });
        }

        // 現調
        const surveyDate = this._parseDate(row[colIndex.surveyDate]);
        if (surveyDate && surveyDate >= startDate && surveyDate < endDate) {
          merchantTasks[merchantId].surveys.push({
            customerName: row[colIndex.customerName] || '---',
            time: this._formatTime(surveyDate)
          });
        }

        // 商談
        const meetingDate = this._parseDate(row[colIndex.estimateDate]);
        if (meetingDate && meetingDate >= startDate && meetingDate < endDate) {
          merchantTasks[merchantId].meetings.push({
            customerName: row[colIndex.customerName] || '---',
            time: this._formatTime(meetingDate)
          });
        }
      }

      // 各加盟店のユーザーに通知送信
      Object.keys(merchantTasks).forEach(merchantId => {
        const tasks = merchantTasks[merchantId];
        const totalTasks = tasks.calls.length + tasks.surveys.length + tasks.meetings.length;

        if (totalTasks === 0) return;

        // 通知内容を構築
        let message = `【${label}の予定】\n`;

        if (tasks.calls.length > 0) {
          message += `\n📞 架電: ${tasks.calls.length}件\n`;
          tasks.calls.forEach(t => {
            message += `  ・${t.time} ${t.customerName}様\n`;
          });
        }

        if (tasks.surveys.length > 0) {
          message += `\n🏠 現調: ${tasks.surveys.length}件\n`;
          tasks.surveys.forEach(t => {
            message += `  ・${t.time} ${t.customerName}様\n`;
          });
        }

        if (tasks.meetings.length > 0) {
          message += `\n📋 商談: ${tasks.meetings.length}件\n`;
          tasks.meetings.forEach(t => {
            message += `  ・${t.time} ${t.customerName}様\n`;
          });
        }

        // 加盟店のユーザーに通知送信
        this._sendNotificationToMerchant(merchantId, `${label}の予定（${totalTasks}件）`, message);
      });

      console.log('[NotificationTrigger] まとめ通知完了');
    } catch (error) {
      console.error('[NotificationTrigger] まとめ通知エラー:', error);
    }
  },

  /**
   * 直前リマインダーをチェック（毎分実行）
   */
  checkImmediateReminders() {
    console.log('[NotificationTrigger] 直前リマインダーチェック開始');
    const now = new Date();

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      if (!deliverySheet) return;

      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      const colIndex = {
        cvId: headers.indexOf('CV ID'),
        merchantId: headers.indexOf('加盟店ID'),
        customerName: headers.indexOf('お客様名'),
        customerTel: headers.indexOf('電話番号'),
        nextCallDate: headers.indexOf('次回架電日時'),
        surveyDate: headers.indexOf('現調予定日時'),
        estimateDate: headers.indexOf('商談予定日時'),
        status: headers.indexOf('配信ステータス')
      };

      // 送信済みリマインダーを管理（PropertiesService）
      const props = PropertiesService.getScriptProperties();
      const sentReminders = JSON.parse(props.getProperty('sentReminders') || '{}');

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const status = row[colIndex.status];
        if (status === '成約' || status === '失注') continue;

        const cvId = row[colIndex.cvId];
        const merchantId = row[colIndex.merchantId];
        const customerName = row[colIndex.customerName] || '---';
        const customerTel = row[colIndex.customerTel] || '';

        // 架電リマインダー（10分前）
        const callDate = this._parseDate(row[colIndex.nextCallDate]);
        if (callDate) {
          const minutesUntil = Math.floor((callDate - now) / (1000 * 60));
          const reminderKey = `call-${cvId}-${callDate.getTime()}`;

          if (minutesUntil <= 10 && minutesUntil > 0 && !sentReminders[reminderKey]) {
            this._sendNotificationToMerchant(
              merchantId,
              `📞 架電リマインダー`,
              `${minutesUntil}分後に${customerName}様への架電予定です\n📱 ${customerTel}`
            );
            sentReminders[reminderKey] = now.getTime();
          }
        }

        // 現調リマインダー（30分前）
        const surveyDate = this._parseDate(row[colIndex.surveyDate]);
        if (surveyDate) {
          const minutesUntil = Math.floor((surveyDate - now) / (1000 * 60));
          const reminderKey = `survey-${cvId}-${surveyDate.getTime()}`;

          if (minutesUntil <= 30 && minutesUntil > 0 && !sentReminders[reminderKey]) {
            this._sendNotificationToMerchant(
              merchantId,
              `🏠 現調リマインダー`,
              `${minutesUntil}分後に${customerName}様の現調予定です\n📱 ${customerTel}`
            );
            sentReminders[reminderKey] = now.getTime();
          }
        }

        // 商談リマインダー（30分前）
        const meetingDate = this._parseDate(row[colIndex.estimateDate]);
        if (meetingDate) {
          const minutesUntil = Math.floor((meetingDate - now) / (1000 * 60));
          const reminderKey = `meeting-${cvId}-${meetingDate.getTime()}`;

          if (minutesUntil <= 30 && minutesUntil > 0 && !sentReminders[reminderKey]) {
            this._sendNotificationToMerchant(
              merchantId,
              `📋 商談リマインダー`,
              `${minutesUntil}分後に${customerName}様との商談予定です\n📱 ${customerTel}`
            );
            sentReminders[reminderKey] = now.getTime();
          }
        }
      }

      // 古いリマインダー履歴を削除（24時間以上前）
      const cutoff = now.getTime() - (24 * 60 * 60 * 1000);
      Object.keys(sentReminders).forEach(key => {
        if (sentReminders[key] < cutoff) {
          delete sentReminders[key];
        }
      });

      props.setProperty('sentReminders', JSON.stringify(sentReminders));
      console.log('[NotificationTrigger] 直前リマインダーチェック完了');

    } catch (error) {
      console.error('[NotificationTrigger] 直前リマインダーエラー:', error);
    }
  },

  /**
   * 加盟店のユーザーに通知を送信
   */
  _sendNotificationToMerchant(merchantId, title, message) {
    try {
      // 加盟店のユーザー設定を取得
      const users = NotificationSettingsManager.getMerchantUsers(merchantId);

      users.forEach(user => {
        // 通知制限時間をチェック
        if (this._isQuietHours(user)) {
          console.log('[NotificationTrigger] 通知制限時間中のためスキップ:', user.userId);
          return;
        }

        // メール通知
        if (user.email && user.profile?.email) {
          try {
            MailApp.sendEmail({
              to: user.profile.email,
              subject: `[くらべる] ${title}`,
              body: message
            });
            console.log('[NotificationTrigger] メール送信:', user.profile.email);
          } catch (e) {
            console.error('[NotificationTrigger] メール送信エラー:', e);
          }
        }

        // ブラウザ通知（WebPush）は別途実装が必要
        // LINE通知は別途LINEWebhookHandlerで実装
      });
    } catch (error) {
      console.error('[NotificationTrigger] 通知送信エラー:', merchantId, error);
    }
  },

  /**
   * 通知制限時間中かどうかをチェック
   */
  _isQuietHours(user) {
    if (!user.details?.quietHours?.enabled) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const start = user.details.quietHours.start || '21:00';
    const end = user.details.quietHours.end || '08:00';

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // 夜間をまたぐ場合（例: 21:00 - 08:00）
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    // 同日の場合（例: 12:00 - 13:00）
    return currentTime >= startTime && currentTime < endTime;
  },

  /**
   * 日付文字列をパース
   */
  _parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;

    try {
      const match = String(dateStr).match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
      if (match) {
        return new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3]),
          match[4] ? parseInt(match[4]) : 9,
          match[5] ? parseInt(match[5]) : 0
        );
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * 時刻をフォーマット
   */
  _formatTime(date) {
    if (!date) return '--:--';
    const h = date.getHours();
    const m = date.getMinutes();
    return `${h}:${String(m).padStart(2, '0')}`;
  }
};

// グローバル関数として公開（トリガーから呼び出し用）
function setupNotificationTriggers() {
  return NotificationTriggerSystem.setupTriggers();
}

function sendMorningSummary() {
  return NotificationTriggerSystem.sendMorningSummary();
}

function sendEveningSummary() {
  return NotificationTriggerSystem.sendEveningSummary();
}

function checkImmediateReminders() {
  return NotificationTriggerSystem.checkImmediateReminders();
}
