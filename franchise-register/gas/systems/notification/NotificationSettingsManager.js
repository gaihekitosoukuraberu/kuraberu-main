/**
 * ====================================
 * 通知設定管理システム
 * ====================================
 *
 * 【機能】
 * - ユーザーごとの通知設定の読み書き
 * - マスター管理者とサブアカウントの設定管理
 * - 通知チャネル（メール、LINE、ブラウザ）の有効/無効管理
 * - 通知タイプ別の設定（キャンセル、期限延長、アポリマインダーなど）
 *
 * 【データ構造】
 * 通知設定シート（存在しない場合は自動作成）:
 * - ユーザーID | 加盟店ID | メール | LINE | ブラウザ | 設定JSON | 最終更新
 *
 * 【使用例】
 * const settings = NotificationSettingsManager.getSettings('user123');
 * NotificationSettingsManager.updateSettings('user123', { email: true, line: false });
 */

const NotificationSettingsManager = {

  SHEET_NAME: '通知設定',

  /**
   * デフォルト設定
   */
  DEFAULT_SETTINGS: {
    email: true,
    line: false,
    browser: true,
    alerts: {
      cancelApplication: true,
      deadlineExtension: true,
      appointmentReminder: true,
      callReminder: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  },

  /**
   * 通知設定シートを取得（存在しない場合は作成）
   * @return {Sheet} 通知設定シート
   */
  getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(this.SHEET_NAME);

    if (!sheet) {
      console.log('[NotificationSettings] シート作成中:', this.SHEET_NAME);
      sheet = ss.insertSheet(this.SHEET_NAME);

      // ヘッダー設定
      const headers = [
        'ユーザーID',
        '加盟店ID',
        'メール通知',
        'LINE通知',
        'ブラウザ通知',
        '詳細設定JSON',
        '最終更新日時'
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);

      console.log('[NotificationSettings] シート作成完了');
    }

    return sheet;
  },

  /**
   * ユーザーの通知設定を取得
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID（オプション）
   * @return {Object} 通知設定オブジェクト
   */
  getSettings(userId, merchantId = null) {
    try {
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();

      // ヘッダー行をスキップして検索
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowUserId = row[0];
        const rowMerchantId = row[1];

        // ユーザーIDでマッチ（加盟店IDは任意）
        if (rowUserId === userId && (!merchantId || rowMerchantId === merchantId)) {
          const settings = {
            userId: rowUserId,
            merchantId: rowMerchantId,
            email: row[2] === true || row[2] === 'TRUE' || row[2] === 'ON',
            line: row[3] === true || row[3] === 'TRUE' || row[3] === 'ON',
            browser: row[4] === true || row[4] === 'TRUE' || row[4] === 'ON',
            details: row[5] ? this._parseJSON(row[5]) : this.DEFAULT_SETTINGS.alerts,
            lastUpdated: row[6]
          };

          console.log('[NotificationSettings] 設定取得成功:', userId);
          return settings;
        }
      }

      // 設定が見つからない場合はデフォルトを返す
      console.log('[NotificationSettings] デフォルト設定を返します:', userId);
      return {
        userId: userId,
        merchantId: merchantId,
        ...this.DEFAULT_SETTINGS
      };

    } catch (error) {
      console.error('[NotificationSettings] 設定取得エラー:', error);
      return {
        userId: userId,
        merchantId: merchantId,
        ...this.DEFAULT_SETTINGS
      };
    }
  },

  /**
   * ユーザーの通知設定を保存
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @param {Object} settings - 保存する設定
   * @return {Object} 保存結果
   */
  saveSettings(userId, merchantId, settings) {
    try {
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();
      const timestamp = new Date();

      // 既存の設定を探す
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === userId && data[i][1] === merchantId) {
          rowIndex = i + 1; // シートは1始まり
          break;
        }
      }

      const detailsJSON = JSON.stringify(settings.alerts || this.DEFAULT_SETTINGS.alerts);

      const rowData = [
        userId,
        merchantId,
        settings.email === true ? 'ON' : 'OFF',
        settings.line === true ? 'ON' : 'OFF',
        settings.browser === true ? 'ON' : 'OFF',
        detailsJSON,
        timestamp
      ];

      if (rowIndex !== -1) {
        // 既存の行を更新
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        console.log('[NotificationSettings] 設定更新成功:', userId, '行番号:', rowIndex);
      } else {
        // 新規行を追加
        sheet.appendRow(rowData);
        console.log('[NotificationSettings] 新規設定追加成功:', userId);
      }

      return {
        success: true,
        message: '通知設定を保存しました'
      };

    } catch (error) {
      console.error('[NotificationSettings] 設定保存エラー:', error);
      return {
        success: false,
        message: '設定の保存に失敗しました: ' + error.toString()
      };
    }
  },

  /**
   * 特定の通知チャネルが有効かチェック
   * @param {String} userId - ユーザーID
   * @param {String} channel - チャネル名（'email', 'line', 'browser'）
   * @return {Boolean} 有効かどうか
   */
  isChannelEnabled(userId, channel) {
    const settings = this.getSettings(userId);
    return settings[channel] === true;
  },

  /**
   * 特定の通知タイプが有効かチェック
   * @param {String} userId - ユーザーID
   * @param {String} alertType - 通知タイプ（'cancelApplication', 'deadlineExtension'など）
   * @return {Boolean} 有効かどうか
   */
  isAlertTypeEnabled(userId, alertType) {
    const settings = this.getSettings(userId);
    return settings.details?.[alertType] === true || settings.alerts?.[alertType] === true;
  },

  /**
   * 加盟店の全ユーザーの設定を取得
   * @param {String} merchantId - 加盟店ID
   * @return {Array} ユーザー設定の配列
   */
  getMerchantUsers(merchantId) {
    try {
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();
      const users = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[1] === merchantId) {
          users.push({
            userId: row[0],
            merchantId: row[1],
            email: row[2] === 'ON',
            line: row[3] === 'ON',
            browser: row[4] === 'ON',
            details: this._parseJSON(row[5]),
            lastUpdated: row[6]
          });
        }
      }

      console.log('[NotificationSettings] 加盟店ユーザー取得:', merchantId, users.length, '人');
      return users;

    } catch (error) {
      console.error('[NotificationSettings] 加盟店ユーザー取得エラー:', error);
      return [];
    }
  },

  /**
   * JSON文字列を安全にパース
   * @param {String} jsonString - JSON文字列
   * @return {Object} パース結果
   * @private
   */
  _parseJSON(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('[NotificationSettings] JSONパースエラー:', error);
      return this.DEFAULT_SETTINGS.alerts;
    }
  }

};
