/**
 * ファイル名: billing_trigger_setup.gs
 * 外壁塗装くらべるAI - 請求リマインダー自動実行トリガー設定
 * 
 * 【機能】
 * - 支払方法別リマインダー（振込・引き落とし対応）
 * - 祝祭日・大型連休自動調整
 * - 2段階通知（5日前・2日前）
 */

/**
 * 請求リマインダートリガー一括登録
 * 4つのトリガーを設定（振込用2回・引き落とし用2回）
 * 
 * @returns {Object} 登録結果
 */
function registerBillingReminderTrigger() {
  try {
    Logger.log('⏰ 請求リマインダートリガー一括登録開始');
    
    // 既存トリガーの確認・削除
    deleteBillingReminderTrigger();
    
    const triggers = [];
    const triggerConfigs = [
      { day: 10, name: 'remindUnpaidInvoices_BankTransfer_First', desc: '振込5日前' },
      { day: 13, name: 'remindUnpaidInvoices_BankTransfer_Final', desc: '振込2日前' },
      { day: 22, name: 'remindUnpaidInvoices_DirectDebit_First', desc: '引き落とし5日前' },
      { day: 25, name: 'remindUnpaidInvoices_DirectDebit_Final', desc: '引き落とし2日前' }
    ];
    
    // 各トリガーを作成
    for (const config of triggerConfigs) {
      const trigger = ScriptApp.newTrigger(config.name)
        .timeBased()
        .everyMonths(1)
        .onMonthDay(config.day)
        .atHour(10)
        .nearMinute(0)
        .create();
      
      triggers.push({
        id: trigger.getUniqueId(),
        function: config.name,
        day: config.day,
        description: config.desc
      });
      
      Logger.log(`✅ トリガー登録: ${config.desc} (${config.day}日)`);
    }
    
    Logger.log(`✅ 請求リマインダートリガー一括登録完了: ${triggers.length}件`);
    
    // Slack通知
    try {
      if (typeof sendSlackNotification === 'function') {
        let message = '⏰ *請求リマインダー自動実行設定完了*\n\n';
        message += '📅 **実行スケジュール**:\n';
        message += '• 振込：毎月10日・13日 10:00\n';
        message += '• 引き落とし：毎月22日・25日 10:00\n\n';
        message += '🎯 **機能**:\n';
        message += '• 祝祭日・大型連休自動調整\n';
        message += '• 支払方法別通知内容\n';
        message += '• 2段階リマインダー\n\n';
        message += '💡 未払い請求の定期チェックが自動化されました。';
        
        sendSlackNotification(message);
      }
    } catch (e) {
      Logger.log('Slack通知スキップ:', e.message);
    }
    
    return {
      success: true,
      message: '請求リマインダートリガーの一括登録が完了しました',
      triggers: triggers,
      nextExecutions: getNextExecutionDates()
    };
    
  } catch (error) {
    Logger.log('❌ 請求リマインダートリガー登録エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 振込用リマインダー（5日前）
 */
function remindUnpaidInvoices_BankTransfer_First() {
  return executeReminder('振込', 5, false);
}

/**
 * 振込用リマインダー（2日前・最終）
 */
function remindUnpaidInvoices_BankTransfer_Final() {
  return executeReminder('振込', 2, true);
}

/**
 * 引き落とし用リマインダー（5日前）
 */
function remindUnpaidInvoices_DirectDebit_First() {
  return executeReminder('引き落とし', 5, false);
}

/**
 * 引き落とし用リマインダー（2日前・最終）
 */
function remindUnpaidInvoices_DirectDebit_Final() {
  return executeReminder('引き落とし', 2, true);
}

/**
 * リマインダー実行本体
 * @param {string} paymentMethod - 支払方法
 * @param {number} daysBefore - 何日前
 * @param {boolean} isFinal - 最終通知かどうか
 */
function executeReminder(paymentMethod, daysBefore, isFinal) {
  try {
    Logger.log(`🔔 ${paymentMethod}リマインダー実行開始 (${daysBefore}日前${isFinal ? '・最終' : ''})`);
    
    // 支払期日を計算
    const paymentInfo = calculatePaymentDueWithHolidays(paymentMethod);
    
    // 該当する未払い請求を取得
    const unpaidInvoices = getUnpaidInvoicesByPaymentMethod(paymentMethod);
    
    if (unpaidInvoices.length === 0) {
      Logger.log(`✅ ${paymentMethod}の未払い請求はありません`);
      return { success: true, message: '未払い請求なし', invoiceCount: 0 };
    }
    
    // 通知メッセージ作成
    const message = createReminderMessage(paymentMethod, daysBefore, isFinal, paymentInfo, unpaidInvoices);
    
    // Slack通知送信
    let notificationSent = false;
    if (typeof sendSlackNotification === 'function') {
      const result = sendSlackNotification(message);
      notificationSent = result && result.success;
    }
    
    Logger.log(`✅ ${paymentMethod}リマインダー完了: ${unpaidInvoices.length}件`);
    
    return {
      success: true,
      paymentMethod: paymentMethod,
      daysBefore: daysBefore,
      isFinal: isFinal,
      invoiceCount: unpaidInvoices.length,
      paymentInfo: paymentInfo,
      notificationSent: notificationSent
    };
    
  } catch (error) {
    Logger.log(`❌ ${paymentMethod}リマインダーエラー:`, error);
    return {
      success: false,
      error: error.message,
      paymentMethod: paymentMethod
    };
  }
}

/**
 * 祝祭日考慮の支払期日計算
 * @param {string} paymentMethod - 支払方法
 * @returns {Object} 支払期日情報
 */
function calculatePaymentDueWithHolidays(paymentMethod) {
  try {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 基本期日設定
    let originalDay;
    if (paymentMethod === '振込') {
      originalDay = 15;
    } else {
      originalDay = 27;
    }
    
    // 当初予定日
    const originalDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), originalDay);
    
    // 営業日調整後の実際の期日
    const adjustedDate = adjustToBusinessDay(originalDate);
    
    // 調整日数計算
    const adjustmentDays = Math.floor((adjustedDate - originalDate) / (1000 * 60 * 60 * 24));
    
    // 大型連休判定
    const isLongHoliday = adjustmentDays >= 3;
    
    return {
      originalDate: originalDate,
      adjustedDate: adjustedDate,
      adjustmentDays: adjustmentDays,
      isLongHoliday: isLongHoliday,
      originalDateStr: Utilities.formatDate(originalDate, 'JST', 'yyyy年MM月dd日（E）'),
      adjustedDateStr: Utilities.formatDate(adjustedDate, 'JST', 'yyyy年MM月dd日（E）'),
      hasAdjustment: adjustmentDays > 0
    };
    
  } catch (error) {
    Logger.log('❌ 支払期日計算エラー:', error);
    return null;
  }
}

/**
 * 営業日調整（土日祝を後ろ倒し）
 * @param {Date} date - 調整前の日付
 * @returns {Date} 調整後の日付
 */
function adjustToBusinessDay(date) {
  const adjusted = new Date(date);
  
  // 簡易祝日判定（主要な祝日のみ）
  const holidays = getJapaneseHolidays(adjusted.getFullYear());
  
  while (isWeekendOrHoliday(adjusted, holidays)) {
    adjusted.setDate(adjusted.getDate() + 1);
  }
  
  return adjusted;
}

/**
 * 土日祝判定
 * @param {Date} date - 判定日
 * @param {Array} holidays - 祝日リスト
 * @returns {boolean} 土日祝かどうか
 */
function isWeekendOrHoliday(date, holidays) {
  // 土日判定
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  
  // 祝日判定
  const dateStr = Utilities.formatDate(date, 'JST', 'MM-dd');
  return holidays.includes(dateStr);
}

/**
 * 日本の祝日取得（簡易版）
 * @param {number} year - 年
 * @returns {Array} 祝日リスト（MM-dd形式）
 */
function getJapaneseHolidays(year) {
  // 固定祝日（主要なもののみ）
  const fixedHolidays = [
    '01-01', // 元日
    '01-02', // 1月2日（銀行休業日）
    '01-03', // 1月3日（銀行休業日）
    '02-11', // 建国記念の日
    '02-23', // 天皇誕生日
    '04-29', // 昭和の日
    '05-03', // 憲法記念日
    '05-04', // みどりの日
    '05-05', // こどもの日
    '07-20', // 海の日（概算）
    '08-11', // 山の日
    '09-15', // 敬老の日（概算）
    '10-10', // スポーツの日（概算）
    '11-03', // 文化の日
    '11-23', // 勤労感謝の日
    '12-29', // 年末（銀行休業日）
    '12-30', // 年末（銀行休業日）
    '12-31'  // 大晦日
  ];
  
  return fixedHolidays;
}

/**
 * 支払方法別の未払い請求取得
 * @param {string} paymentMethod - 支払方法
 * @returns {Array} 未払い請求リスト
 */
function getUnpaidInvoicesByPaymentMethod(paymentMethod) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const billingSheet = ss.getSheetByName('請求管理');
    
    if (!billingSheet) {
      Logger.log('⚠️ 請求管理シートが見つかりません');
      return [];
    }
    
    const data = billingSheet.getDataRange().getValues();
    const headers = data[0];
    
    const unpaidInvoices = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[headers.indexOf('請求ステータス')];
      const method = row[headers.indexOf('支払方法')];
      
      if (status === '未払い' && method === paymentMethod) {
        unpaidInvoices.push({
          franchiseId: row[headers.indexOf('加盟店ID')],
          franchiseName: row[headers.indexOf('加盟店名')],
          targetMonth: row[headers.indexOf('対象月')],
          amount: row[headers.indexOf('手数料合計')],
          caseCount: row[headers.indexOf('請求件数')]
        });
      }
    }
    
    return unpaidInvoices;
    
  } catch (error) {
    Logger.log('❌ 未払い請求取得エラー:', error);
    return [];
  }
}

/**
 * リマインダーメッセージ作成
 * @param {string} paymentMethod - 支払方法
 * @param {number} daysBefore - 何日前
 * @param {boolean} isFinal - 最終通知
 * @param {Object} paymentInfo - 支払期日情報
 * @param {Array} unpaidInvoices - 未払い請求リスト
 * @returns {string} メッセージ
 */
function createReminderMessage(paymentMethod, daysBefore, isFinal, paymentInfo, unpaidInvoices) {
  let message = '';
  
  // ヘッダー（祝日調整の有無で変更）
  if (paymentInfo.hasAdjustment) {
    if (paymentInfo.isLongHoliday) {
      message += '⚠️ *支払期日のお知らせ（大型連休調整あり）*\n\n';
    } else {
      message += '⚠️ *支払期日のお知らせ（祝日調整あり）*\n\n';
    }
  } else {
    message += '🔔 *支払期日のお知らせ*\n\n';
  }
  
  // 支払期日情報
  message += `💳 **支払方法**: ${paymentMethod}\n`;
  message += `📅 **支払期日**: ${paymentInfo.adjustedDateStr}\n`;
  
  if (paymentInfo.hasAdjustment) {
    message += `📋 当初予定: ${paymentInfo.originalDateStr}\n`;
    if (paymentInfo.isLongHoliday) {
      message += `⏰ **${paymentInfo.adjustmentDays}日間延期** (大型連休のため)\n`;
    } else {
      message += `⏰ **${paymentInfo.adjustmentDays}日延期** (土日祝のため)\n`;
    }
  }
  
  message += '\n';
  
  // 通知段階
  if (isFinal) {
    message += '🚨 **最終確認** (支払期日まであと2日)\n\n';
  } else {
    message += `📢 **事前お知らせ** (支払期日まであと${daysBefore}日)\n\n`;
  }
  
  // 未払い詳細
  message += `📊 **未払い件数**: ${unpaidInvoices.length}件\n\n`;
  
  let totalAmount = 0;
  unpaidInvoices.forEach((invoice, index) => {
    message += `${index + 1}. **${invoice.franchiseName}**\n`;
    message += `　🆔 ${invoice.franchiseId}\n`;
    message += `　📅 ${invoice.targetMonth}\n`;
    message += `　📦 ${invoice.caseCount}件\n`;
    message += `　💰 ¥${invoice.amount.toLocaleString()}\n\n`;
    totalAmount += invoice.amount;
  });
  
  message += `💸 **未回収合計**: ¥${totalAmount.toLocaleString()}\n\n`;
  
  // アクション要求
  if (isFinal) {
    message += '🔥 **至急対応をお願いします！**';
  } else {
    message += '💡 事前にご確認・対応をお願いします。';
  }
  
  return message;
}

/**
 * 請求リマインダートリガー削除
 */
function deleteBillingReminderTrigger() {
  try {
    const existingTriggers = ScriptApp.getProjectTriggers();
    const reminderTriggers = existingTriggers.filter(trigger => 
      trigger.getHandlerFunction().startsWith('remindUnpaidInvoices')
    );
    
    let deletedCount = 0;
    reminderTriggers.forEach(trigger => {
      try {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      } catch (deleteError) {
        Logger.log('トリガー削除エラー:', deleteError);
      }
    });
    
    if (deletedCount > 0) {
      Logger.log(`🗑️ 既存トリガー削除: ${deletedCount}件`);
    }
    
    return { success: true, deletedCount: deletedCount };
    
  } catch (error) {
    Logger.log('❌ トリガー削除エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 次回実行日一覧取得
 */
function getNextExecutionDates() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  const schedules = [
    { day: 10, desc: '振込5日前' },
    { day: 13, desc: '振込2日前' },
    { day: 22, desc: '引き落とし5日前' },
    { day: 25, desc: '引き落とし2日前' }
  ];
  
  return schedules.map(schedule => {
    let nextYear = currentYear;
    let nextMonth = currentMonth;
    
    if (currentDay >= schedule.day) {
      nextMonth++;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
      }
    }
    
    const nextDate = new Date(nextYear, nextMonth, schedule.day, 10, 0, 0);
    return {
      description: schedule.desc,
      date: Utilities.formatDate(nextDate, 'JST', 'yyyy年MM月dd日 HH:mm')
    };
  });
}

/**
 * システムテスト
 */
function testBillingReminderSystem() {
  Logger.log('🧪 請求リマインダーシステムテスト開始');
  
  try {
    // 1. 支払期日計算テスト
    Logger.log('--- 支払期日計算テスト ---');
    const bankInfo = calculatePaymentDueWithHolidays('振込');
    const debitInfo = calculatePaymentDueWithHolidays('引き落とし');
    Logger.log('振込期日:', bankInfo);
    Logger.log('引き落とし期日:', debitInfo);
    
    // 2. リマインダー実行テスト
    Logger.log('--- リマインダー実行テスト ---');
    const testResults = [
      executeReminder('振込', 5, false),
      executeReminder('引き落とし', 5, false)
    ];
    
    Logger.log('✅ 請求リマインダーシステムテスト完了');
    
    return {
      success: true,
      testResults: testResults,
      paymentInfo: { bank: bankInfo, debit: debitInfo }
    };
    
  } catch (error) {
    Logger.log('❌ テストエラー:', error);
    return { success: false, error: error.message };
  }
}