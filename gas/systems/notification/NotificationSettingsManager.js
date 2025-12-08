/**
 * ====================================
 * 通知設定管理システム
 * ====================================
 *
 * 【機能】
 * - ユーザーごとの通知設定の読み書き
 * - ユーザープロフィール（氏名、電話番号、メールアドレス）の管理
 * - マスター管理者とサブアカウントの設定管理
 * - 通知チャネル（メール、LINE、ブラウザ）の有効/無効管理
 * - 通知タイプ別の設定（キャンセル、期限延長、アポリマインダーなど）
 *
 * 【データ構造】
 * 通知設定シート（存在しない場合は自動作成）:
 * - ユーザーID | 加盟店ID | 氏名 | 電話番号 | メールアドレス | メール通知 | LINE通知 | ブラウザ通知 | 設定JSON | 最終更新
 *
 * 【使用例】
 * const settings = NotificationSettingsManager.getSettings('user123');
 * NotificationSettingsManager.updateSettings('user123', { email: true, line: false });
 * NotificationSettingsManager.saveProfile('user123', 'M001', { name: '山田太郎', phone: '090-1234-5678', email: 'test@example.com' });
 */

const NotificationSettingsManager = {

  SHEET_NAME: '通知設定',

  // カラムインデックス（0始まり）
  COL: {
    USER_ID: 0,
    MERCHANT_ID: 1,
    NAME: 2,
    PHONE: 3,
    EMAIL_ADDRESS: 4,
    EMAIL_ENABLED: 5,
    LINE_ENABLED: 6,
    BROWSER_ENABLED: 7,
    DETAILS_JSON: 8,
    LAST_UPDATED: 9
  },

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

      // ヘッダー設定（プロフィールカラム追加版）
      const headers = [
        'ユーザーID',
        '加盟店ID',
        '氏名',
        '電話番号',
        'メールアドレス',
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
   * 既存シートにプロフィールカラムを追加（マイグレーション用）
   * 既存データがある場合に呼び出す
   */
  migrateSheet() {
    const sheet = this.getSheet();
    const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];

    // 既に新カラム構造ならスキップ
    if (headers[2] === '氏名') {
      console.log('[NotificationSettings] 既にマイグレーション済み');
      return { success: true, message: '既にマイグレーション済み' };
    }

    // 旧構造（7カラム）から新構造（10カラム）への変換
    // 旧: ユーザーID | 加盟店ID | メール通知 | LINE通知 | ブラウザ通知 | 詳細設定JSON | 最終更新日時
    // 新: ユーザーID | 加盟店ID | 氏名 | 電話番号 | メールアドレス | メール通知 | LINE通知 | ブラウザ通知 | 詳細設定JSON | 最終更新日時

    console.log('[NotificationSettings] マイグレーション開始');

    // C列（3列目）に3列挿入（氏名、電話番号、メールアドレス）
    sheet.insertColumnsAfter(2, 3);

    // 新しいヘッダーを設定
    sheet.getRange(1, 3).setValue('氏名');
    sheet.getRange(1, 4).setValue('電話番号');
    sheet.getRange(1, 5).setValue('メールアドレス');

    console.log('[NotificationSettings] マイグレーション完了');
    return { success: true, message: 'マイグレーション完了' };
  },

  /**
   * ユーザーの通知設定を取得
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID（オプション）
   * @return {Object} 通知設定オブジェクト（プロフィール含む）
   */
  getSettings(userId, merchantId = null) {
    try {
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();
      const COL = this.COL;

      // ヘッダー行をスキップして検索
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowUserId = row[COL.USER_ID];
        const rowMerchantId = row[COL.MERCHANT_ID];

        // ユーザーIDでマッチ（加盟店IDは任意）
        if (rowUserId === userId && (!merchantId || rowMerchantId === merchantId)) {
          const settings = {
            userId: rowUserId,
            merchantId: rowMerchantId,
            // プロフィール
            profile: {
              name: row[COL.NAME] || '',
              phone: row[COL.PHONE] || '',
              email: row[COL.EMAIL_ADDRESS] || ''
            },
            // 通知設定
            email: row[COL.EMAIL_ENABLED] === true || row[COL.EMAIL_ENABLED] === 'TRUE' || row[COL.EMAIL_ENABLED] === 'ON',
            line: row[COL.LINE_ENABLED] === true || row[COL.LINE_ENABLED] === 'TRUE' || row[COL.LINE_ENABLED] === 'ON',
            browser: row[COL.BROWSER_ENABLED] === true || row[COL.BROWSER_ENABLED] === 'TRUE' || row[COL.BROWSER_ENABLED] === 'ON',
            details: row[COL.DETAILS_JSON] ? this._parseJSON(row[COL.DETAILS_JSON]) : this.DEFAULT_SETTINGS.alerts,
            lastUpdated: row[COL.LAST_UPDATED]
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
        profile: { name: '', phone: '', email: '' },
        ...this.DEFAULT_SETTINGS
      };

    } catch (error) {
      console.error('[NotificationSettings] 設定取得エラー:', error);
      return {
        userId: userId,
        merchantId: merchantId,
        profile: { name: '', phone: '', email: '' },
        ...this.DEFAULT_SETTINGS
      };
    }
  },

  /**
   * ユーザーの通知設定を保存（プロフィール含む）
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @param {Object} settings - 保存する設定（profile, email, line, browser, alerts）
   * @return {Object} 保存結果
   */
  saveSettings(userId, merchantId, settings) {
    try {
      const sheet = this.getSheet();
      const data = sheet.getDataRange().getValues();
      const timestamp = new Date();
      const COL = this.COL;

      // 既存の設定を探す
      let rowIndex = -1;
      let existingRow = null;
      for (let i = 1; i < data.length; i++) {
        if (data[i][COL.USER_ID] === userId && data[i][COL.MERCHANT_ID] === merchantId) {
          rowIndex = i + 1; // シートは1始まり
          existingRow = data[i];
          break;
        }
      }

      const detailsJSON = JSON.stringify(settings.alerts || this.DEFAULT_SETTINGS.alerts);

      // プロフィールは既存値をマージ（部分更新対応）
      const profile = settings.profile || {};

      const rowData = [
        userId,
        merchantId,
        profile.name !== undefined ? profile.name : (existingRow ? existingRow[COL.NAME] : ''),
        profile.phone !== undefined ? profile.phone : (existingRow ? existingRow[COL.PHONE] : ''),
        profile.email !== undefined ? profile.email : (existingRow ? existingRow[COL.EMAIL_ADDRESS] : ''),
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
   * プロフィールのみを更新
   * @param {String} userId - ユーザーID
   * @param {String} merchantId - 加盟店ID
   * @param {Object} profile - プロフィール情報 { name, phone, email }
   * @return {Object} 保存結果
   */
  saveProfile(userId, merchantId, profile) {
    try {
      // 既存設定を取得してプロフィールだけ更新
      const currentSettings = this.getSettings(userId, merchantId);
      currentSettings.profile = {
        ...currentSettings.profile,
        ...profile
      };
      return this.saveSettings(userId, merchantId, currentSettings);
    } catch (error) {
      console.error('[NotificationSettings] プロフィール保存エラー:', error);
      return {
        success: false,
        message: 'プロフィールの保存に失敗しました: ' + error.toString()
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
      const COL = this.COL;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[COL.MERCHANT_ID] === merchantId) {
          users.push({
            userId: row[COL.USER_ID],
            merchantId: row[COL.MERCHANT_ID],
            profile: {
              name: row[COL.NAME] || '',
              phone: row[COL.PHONE] || '',
              email: row[COL.EMAIL_ADDRESS] || ''
            },
            email: row[COL.EMAIL_ENABLED] === 'ON',
            line: row[COL.LINE_ENABLED] === 'ON',
            browser: row[COL.BROWSER_ENABLED] === 'ON',
            details: this._parseJSON(row[COL.DETAILS_JSON]),
            lastUpdated: row[COL.LAST_UPDATED]
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
  },

  /**
   * SystemRouterからのリクエストハンドラー
   * @param {Object} params - リクエストパラメータ
   * @param {Object} postData - POSTデータ（未使用）
   * @return {Object} 処理結果
   */
  handle(params, postData) {
    const action = params.action;
    console.log('[NotificationSettingsManager] handle called, action:', action);

    try {
      switch (action) {
        case 'getNotificationSettings':
          return {
            success: true,
            settings: this.getSettings(params.userId, params.merchantId)
          };

        case 'saveNotificationSettings':
          const settingsToSave = {
            email: params.email === 'true' || params.email === true,
            line: params.line === 'true' || params.line === true,
            browser: params.browser === 'true' || params.browser === true,
            alerts: params.alerts ? (typeof params.alerts === 'string' ? JSON.parse(params.alerts) : params.alerts) : undefined,
            profile: params.profile ? (typeof params.profile === 'string' ? JSON.parse(params.profile) : params.profile) : undefined
          };
          return this.saveSettings(params.userId, params.merchantId, settingsToSave);

        case 'saveUserProfile':
          const profileToSave = params.profile
            ? (typeof params.profile === 'string' ? JSON.parse(params.profile) : params.profile)
            : { name: params.name, phone: params.phone, email: params.email };
          return this.saveProfile(params.userId, params.merchantId, profileToSave);

        case 'migrateNotificationSheet':
          return this.migrateSheet();

        default:
          return {
            success: false,
            error: `Unknown notification action: ${action}`
          };
      }
    } catch (error) {
      console.error('[NotificationSettingsManager] handle error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

};
