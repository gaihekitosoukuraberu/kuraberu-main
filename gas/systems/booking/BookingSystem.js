/**
 * ====================================
 * 予約システム（空き枠管理 & 予約管理）
 * V2091: Phase 2 - スケジューリング機能
 * ====================================
 *
 * 【機能】
 * - 業者の空き枠設定・管理
 * - ユーザーからの予約受付
 * - 予約状況の確認
 *
 * 【依存シート】
 * - 空き枠シート: 業者ごとの空き時間
 * - 予約シート: 確定した予約情報
 */

const BookingSystem = {
  // シート名
  AVAILABILITY_SHEET_NAME: '空き枠マスタ',
  BOOKING_SHEET_NAME: '予約マスタ',

  /**
   * GETリクエスト処理
   */
  handle: function(params) {
    try {
      const action = params.action;
      console.log('[BookingSystem] GET action:', action);

      switch (action) {
        case 'booking_test':
          return { success: true, message: 'Booking system is running' };

        // 空き枠管理
        case 'getContractorAvailability':
          return this.getContractorAvailability(params);

        case 'getAvailableSlotsForCase':
          return this.getAvailableSlotsForCase(params);

        // 予約管理
        case 'getBookings':
          return this.getBookings(params);

        case 'getBookingByCvId':
          return this.getBookingByCvId(params);

        // 公開ページ用（トークン認証）
        case 'getPublicAvailability':
          return this.getPublicAvailability(params);

        case 'createBookingRequest':
          return this.createBookingRequest(params);

        default:
          return { success: false, error: `Unknown booking action: ${action}` };
      }
    } catch (error) {
      console.error('[BookingSystem] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * POSTリクエスト処理
   */
  handlePost: function(e, postData) {
    try {
      const data = postData || JSON.parse(e.postData.contents);
      const action = data.action;
      console.log('[BookingSystem] POST action:', action);

      switch (action) {
        // 空き枠管理
        case 'setContractorAvailability':
          return this.setContractorAvailability(data);

        case 'deleteAvailability':
          return this.deleteAvailability(data);

        case 'updateSlotDuration':
          return this.updateSlotDuration(data);

        // 予約管理
        case 'createBooking':
          return this.createBooking(data);

        case 'cancelBooking':
          return this.cancelBooking(data);

        default:
          return { success: false, error: `Unknown booking POST action: ${action}` };
      }
    } catch (error) {
      console.error('[BookingSystem] POST Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ============================================
  // シート取得・初期化
  // ============================================

  /**
   * スプレッドシートを取得
   */
  getSpreadsheet: function() {
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || CONFIG.SPREADSHEET_ID;
    return SpreadsheetApp.openById(ssId);
  },

  /**
   * 空き枠シートを取得（なければ作成）
   */
  getAvailabilitySheet: function() {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(this.AVAILABILITY_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(this.AVAILABILITY_SHEET_NAME);
      // ヘッダー行を設定
      sheet.getRange(1, 1, 1, 8).setValues([[
        '加盟店ID', '日付', '開始時間', '終了時間',
        'スロット時間（分）', 'ステータス', '更新日時', '予約ID'
      ]]);
      sheet.setFrozenRows(1);
      console.log('[BookingSystem] Created availability sheet');
    }

    return sheet;
  },

  /**
   * 予約シートを取得（なければ作成）
   */
  getBookingSheet: function() {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(this.BOOKING_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(this.BOOKING_SHEET_NAME);
      // ヘッダー行を設定
      sheet.getRange(1, 1, 1, 11).setValues([[
        '予約ID', 'cvId', '加盟店ID', '日付', '時間',
        'ユーザー名', '電話番号', 'ステータス', '作成日時', '更新日時', 'トークン'
      ]]);
      sheet.setFrozenRows(1);
      console.log('[BookingSystem] Created booking sheet');
    }

    return sheet;
  },

  // ============================================
  // 空き枠管理
  // ============================================

  /**
   * 業者の空き枠を設定
   * @param {Object} data - { merchantId, slots: [{ date, startTime, endTime, slotDuration }] }
   */
  setContractorAvailability: function(data) {
    const { merchantId, slots } = data;

    if (!merchantId || !slots || !Array.isArray(slots)) {
      return { success: false, error: 'merchantId and slots array required' };
    }

    const sheet = this.getAvailabilitySheet();
    const now = new Date().toISOString();

    // 既存の空き枠を取得（該当業者の）
    const existingData = sheet.getDataRange().getValues();
    const header = existingData[0];
    const rows = existingData.slice(1);

    // 新規スロットを追加
    const newRows = [];
    for (const slot of slots) {
      // 重複チェック
      const isDuplicate = rows.some(row =>
        row[0] === merchantId &&
        row[1] === slot.date &&
        row[2] === slot.startTime &&
        row[5] !== 'deleted'
      );

      if (!isDuplicate) {
        newRows.push([
          merchantId,
          slot.date,
          slot.startTime,
          slot.endTime,
          slot.slotDuration || 60,
          'available',
          now,
          '' // 予約IDは空
        ]);
      }
    }

    if (newRows.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, newRows.length, 8).setValues(newRows);
    }

    console.log(`[BookingSystem] Added ${newRows.length} availability slots for ${merchantId}`);

    return {
      success: true,
      added: newRows.length,
      message: `${newRows.length}件の空き枠を登録しました`
    };
  },

  /**
   * 業者の空き枠を取得
   * @param {Object} params - { merchantId, startDate?, endDate? }
   */
  getContractorAvailability: function(params) {
    const { merchantId, startDate, endDate } = params;

    if (!merchantId) {
      return { success: false, error: 'merchantId required' };
    }

    const sheet = this.getAvailabilitySheet();
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);

    // フィルタリング
    const slots = rows
      .filter(row => {
        if (row[0] !== merchantId) return false;
        if (row[5] === 'deleted') return false;

        const rowDate = row[1];
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;

        return true;
      })
      .map(row => ({
        merchantId: row[0],
        date: row[1],
        startTime: row[2],
        endTime: row[3],
        slotDuration: row[4],
        status: row[5],
        updatedAt: row[6],
        bookingId: row[7]
      }));

    return { success: true, slots };
  },

  /**
   * 案件向けに全業者の空き枠を取得
   * @param {Object} params - { cvId, merchantIds?, startDate?, endDate? }
   */
  getAvailableSlotsForCase: function(params) {
    const { cvId, merchantIds, startDate, endDate } = params;

    const sheet = this.getAvailabilitySheet();
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);

    // 今日以降のみ
    const today = new Date().toISOString().split('T')[0];
    const filterStartDate = startDate || today;

    // フィルタリング（利用可能なスロットのみ）
    const slots = rows
      .filter(row => {
        if (row[5] !== 'available') return false;

        const rowDate = row[1];
        if (rowDate < filterStartDate) return false;
        if (endDate && rowDate > endDate) return false;

        // merchantIds指定があれば絞り込み
        if (merchantIds && merchantIds.length > 0) {
          if (!merchantIds.includes(row[0])) return false;
        }

        return true;
      })
      .map(row => ({
        merchantId: row[0],
        date: row[1],
        startTime: row[2],
        endTime: row[3],
        slotDuration: row[4]
      }));

    // 日付 × 業者でグループ化
    const grouped = {};
    for (const slot of slots) {
      if (!grouped[slot.date]) {
        grouped[slot.date] = {};
      }
      if (!grouped[slot.date][slot.merchantId]) {
        grouped[slot.date][slot.merchantId] = [];
      }
      grouped[slot.date][slot.merchantId].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: slot.slotDuration
      });
    }

    return { success: true, availability: grouped, totalSlots: slots.length };
  },

  /**
   * 空き枠を削除（論理削除）
   */
  deleteAvailability: function(data) {
    const { merchantId, date, startTime } = data;

    if (!merchantId || !date || !startTime) {
      return { success: false, error: 'merchantId, date, and startTime required' };
    }

    const sheet = this.getAvailabilitySheet();
    const allData = sheet.getDataRange().getValues();
    const rows = allData.slice(1);

    let deleted = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === merchantId &&
          rows[i][1] === date &&
          rows[i][2] === startTime &&
          rows[i][5] === 'available') {
        // ステータスをdeletedに更新
        sheet.getRange(i + 2, 6).setValue('deleted');
        sheet.getRange(i + 2, 7).setValue(new Date().toISOString());
        deleted++;
      }
    }

    return { success: true, deleted };
  },

  /**
   * 公開ページ用の空き枠取得（トークン認証）
   * 業者の空き枠がなくてもリクエスト方式で予約可能
   */
  getPublicAvailability: function(params) {
    const { cvId, token } = params;

    if (!cvId || !token) {
      return { success: false, error: 'cvId and token required' };
    }

    // トークン検証（シンプルなハッシュチェック）
    const expectedToken = this.generateBookingToken(cvId);
    if (token !== expectedToken) {
      return { success: false, error: 'Invalid token' };
    }

    // 案件情報から配信済み業者を取得（なくてもOK）
    const merchantIds = this.getDeliveredMerchantsForCv(cvId);

    // 業者の空き枠を取得（あれば）
    let slots = [];
    if (merchantIds && merchantIds.length > 0) {
      const result = this.getAvailableSlotsForCase({ cvId, merchantIds });
      if (result.success) {
        slots = result.slots || [];
      }
    }

    // 空き枠がなくてもリクエスト方式で予約可能
    return {
      success: true,
      cvId: cvId,
      slots: slots,
      requestMode: slots.length === 0, // 空き枠なし = リクエスト方式
      message: slots.length === 0 ? 'ご希望の日時を選択してください' : '空き枠から選択してください'
    };
  },

  /**
   * 予約リクエスト作成（ユーザーが希望日時を送信）
   * @param {Object} params - { cvId, token, slots }
   */
  createBookingRequest: function(params) {
    const { cvId, token, slots: slotsJson } = params;

    if (!cvId || !token) {
      return { success: false, error: 'cvId and token required' };
    }

    // トークン検証
    const expectedToken = this.generateBookingToken(cvId);
    if (token !== expectedToken) {
      return { success: false, error: 'Invalid token' };
    }

    // slotsをパース
    let slots;
    try {
      slots = typeof slotsJson === 'string' ? JSON.parse(slotsJson) : slotsJson;
    } catch (e) {
      return { success: false, error: 'Invalid slots format' };
    }

    if (!slots || slots.length === 0) {
      return { success: false, error: 'No slots selected' };
    }

    // リクエストIDを生成
    const requestId = 'REQ' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();

    // 予約リクエストシートに保存
    const requestSheet = this.getRequestSheet();

    for (const slot of slots) {
      requestSheet.appendRow([
        requestId,           // A: リクエストID
        cvId,                // B: CV ID
        slot.date,           // C: 希望日
        slot.time,           // D: 希望時間
        'pending',           // E: ステータス（pending/matched/cancelled）
        '',                  // F: マッチした業者ID
        now,                 // G: 作成日時
        ''                   // H: マッチ日時
      ]);
    }

    // 配信済み業者に通知
    const merchantIds = this.getDeliveredMerchantsForCv(cvId);
    if (merchantIds && merchantIds.length > 0) {
      for (const merchantId of merchantIds) {
        this.notifyMerchant(merchantId, {
          type: 'booking_request',
          cvId: cvId,
          requestId: requestId,
          slots: slots,
          message: `新しい現調リクエストがあります。${slots.length}件の希望日時から選択してください。`
        });
      }
    }

    console.log(`[BookingSystem] Created booking request: ${requestId} with ${slots.length} slots`);

    return {
      success: true,
      requestId: requestId,
      slotsCount: slots.length
    };
  },

  /**
   * 予約リクエストシートを取得（なければ作成）
   */
  getRequestSheet: function() {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName('予約リクエスト');

    if (!sheet) {
      sheet = ss.insertSheet('予約リクエスト');
      sheet.getRange(1, 1, 1, 8).setValues([[
        'リクエストID', 'CV ID', '希望日', '希望時間',
        'ステータス', 'マッチ業者ID', '作成日時', 'マッチ日時'
      ]]);
      sheet.setFrozenRows(1);
    }

    return sheet;
  },

  // ============================================
  // 予約管理
  // ============================================

  /**
   * 予約を作成
   * @param {Object} data - { cvId, merchantId, date, time, userName, phone, token }
   */
  createBooking: function(data) {
    const { cvId, merchantId, date, time, userName, phone, token } = data;

    // 必須チェック
    if (!cvId || !merchantId || !date || !time) {
      return { success: false, error: 'cvId, merchantId, date, and time required' };
    }

    // トークン検証
    if (token) {
      const expectedToken = this.generateBookingToken(cvId);
      if (token !== expectedToken) {
        return { success: false, error: 'Invalid token' };
      }
    }

    // 空き枠の確認
    const availSheet = this.getAvailabilitySheet();
    const availData = availSheet.getDataRange().getValues();
    const availRows = availData.slice(1);

    let slotRowIndex = -1;
    for (let i = 0; i < availRows.length; i++) {
      if (availRows[i][0] === merchantId &&
          availRows[i][1] === date &&
          availRows[i][2] === time &&
          availRows[i][5] === 'available') {
        slotRowIndex = i;
        break;
      }
    }

    if (slotRowIndex === -1) {
      return { success: false, error: 'Selected slot is not available' };
    }

    // 予約IDを生成
    const bookingId = 'BK' + Date.now().toString(36).toUpperCase();
    const now = new Date().toISOString();
    const bookingToken = this.generateBookingToken(bookingId);

    // 予約シートに追加
    const bookingSheet = this.getBookingSheet();
    bookingSheet.appendRow([
      bookingId,
      cvId,
      merchantId,
      date,
      time,
      userName || '',
      phone || '',
      'confirmed',
      now,
      now,
      bookingToken
    ]);

    // 空き枠のステータスを更新
    availSheet.getRange(slotRowIndex + 2, 6).setValue('booked');
    availSheet.getRange(slotRowIndex + 2, 7).setValue(now);
    availSheet.getRange(slotRowIndex + 2, 8).setValue(bookingId);

    console.log(`[BookingSystem] Created booking: ${bookingId} for ${cvId}`);

    // 業者に通知（TODO: Slack/メール通知）
    this.notifyMerchant(merchantId, {
      type: 'new_booking',
      bookingId,
      cvId,
      date,
      time,
      userName,
      phone
    });

    return {
      success: true,
      bookingId,
      message: '予約が完了しました',
      booking: {
        bookingId,
        cvId,
        merchantId,
        date,
        time,
        status: 'confirmed'
      }
    };
  },

  /**
   * 予約をキャンセル
   */
  cancelBooking: function(data) {
    const { bookingId, reason } = data;

    if (!bookingId) {
      return { success: false, error: 'bookingId required' };
    }

    const bookingSheet = this.getBookingSheet();
    const bookingData = bookingSheet.getDataRange().getValues();
    const bookingRows = bookingData.slice(1);

    let bookingRowIndex = -1;
    let booking = null;

    for (let i = 0; i < bookingRows.length; i++) {
      if (bookingRows[i][0] === bookingId) {
        bookingRowIndex = i;
        booking = {
          merchantId: bookingRows[i][2],
          date: bookingRows[i][3],
          time: bookingRows[i][4]
        };
        break;
      }
    }

    if (bookingRowIndex === -1) {
      return { success: false, error: 'Booking not found' };
    }

    const now = new Date().toISOString();

    // 予約ステータスを更新
    bookingSheet.getRange(bookingRowIndex + 2, 8).setValue('cancelled');
    bookingSheet.getRange(bookingRowIndex + 2, 10).setValue(now);

    // 空き枠を復活
    if (booking) {
      const availSheet = this.getAvailabilitySheet();
      const availData = availSheet.getDataRange().getValues();
      const availRows = availData.slice(1);

      for (let i = 0; i < availRows.length; i++) {
        if (availRows[i][7] === bookingId) {
          availSheet.getRange(i + 2, 6).setValue('available');
          availSheet.getRange(i + 2, 7).setValue(now);
          availSheet.getRange(i + 2, 8).setValue('');
          break;
        }
      }
    }

    console.log(`[BookingSystem] Cancelled booking: ${bookingId}`);

    return { success: true, message: '予約をキャンセルしました' };
  },

  /**
   * 予約一覧を取得
   */
  getBookings: function(params) {
    const { merchantId, cvId, status } = params;

    const sheet = this.getBookingSheet();
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);

    const bookings = rows
      .filter(row => {
        if (merchantId && row[2] !== merchantId) return false;
        if (cvId && row[1] !== cvId) return false;
        if (status && row[7] !== status) return false;
        return true;
      })
      .map(row => ({
        bookingId: row[0],
        cvId: row[1],
        merchantId: row[2],
        date: row[3],
        time: row[4],
        userName: row[5],
        phone: row[6],
        status: row[7],
        createdAt: row[8],
        updatedAt: row[9]
      }));

    return { success: true, bookings };
  },

  /**
   * 案件の予約を取得
   */
  getBookingByCvId: function(params) {
    const { cvId } = params;

    if (!cvId) {
      return { success: false, error: 'cvId required' };
    }

    const result = this.getBookings({ cvId, status: 'confirmed' });

    if (result.success && result.bookings.length > 0) {
      return { success: true, booking: result.bookings[0], hasBooking: true };
    }

    return { success: true, booking: null, hasBooking: false };
  },

  // ============================================
  // ユーティリティ
  // ============================================

  /**
   * 予約用トークンを生成
   */
  generateBookingToken: function(id) {
    // シンプルなハッシュ生成（本番ではより安全な方法を使用）
    const secret = PropertiesService.getScriptProperties().getProperty('BOOKING_SECRET') || 'kuraberu2024';
    const input = id + secret;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * 予約リンクを生成
   */
  generateBookingLink: function(cvId) {
    const token = this.generateBookingToken(cvId);
    const baseUrl = PropertiesService.getScriptProperties().getProperty('BOOKING_PAGE_URL') || 'https://kuraberu.com/booking/';
    return `${baseUrl}?cvId=${cvId}&token=${token}`;
  },

  /**
   * 案件に配信された業者IDを取得
   */
  getDeliveredMerchantsForCv: function(cvId) {
    try {
      const ss = this.getSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!deliverySheet) {
        console.log('[BookingSystem] 配信管理シートが見つかりません');
        return [];
      }

      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // カラムインデックス取得
      const cvIdIdx = headers.indexOf('CV ID');
      const merchantIdIdx = headers.indexOf('加盟店ID');

      if (cvIdIdx === -1 || merchantIdIdx === -1) {
        console.log('[BookingSystem] 必要なカラムが見つかりません');
        return [];
      }

      const merchantIds = [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][cvIdIdx] === cvId) {
          const mid = rows[i][merchantIdIdx];
          if (mid) merchantIds.push(mid);
        }
      }

      return [...new Set(merchantIds)]; // 重複排除
    } catch (e) {
      console.error('[BookingSystem] Error getting delivered merchants:', e);
      return [];
    }
  },

  /**
   * 業者に通知
   */
  notifyMerchant: function(merchantId, notification) {
    // TODO: Slack/メール通知を実装
    console.log(`[BookingSystem] Notify merchant ${merchantId}:`, JSON.stringify(notification));

    // Slack通知（SlackNotificationSystemがあれば使用）
    try {
      if (typeof SlackNotificationSystem !== 'undefined') {
        SlackNotificationSystem.sendNotification({
          channel: 'booking',
          message: `新規予約: ${notification.bookingId}\n日時: ${notification.date} ${notification.time}\nお客様: ${notification.userName || '未入力'}`
        });
      }
    } catch (e) {
      console.log('[BookingSystem] Slack notification not available');
    }
  },

  /**
   * スロット時間設定を更新
   */
  updateSlotDuration: function(data) {
    const { merchantId, slotDuration } = data;

    if (!merchantId || !slotDuration) {
      return { success: false, error: 'merchantId and slotDuration required' };
    }

    // 業者設定シートに保存（今後の空き枠登録時のデフォルト値）
    // TODO: 業者設定管理の実装

    return {
      success: true,
      message: `スロット時間を${slotDuration}分に設定しました`
    };
  }
};
