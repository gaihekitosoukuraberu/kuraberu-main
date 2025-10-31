/**
 * ====================================
 * データアクセス層（DAL）
 * ====================================
 *
 * 【役割】
 * 全システムのデータ操作を一元管理
 * これにより各システムが干渉しなくなる
 *
 * 【重要】
 * このファイルを必ずGASにコピペしてください
 * ====================================
 */

const DataAccessLayer = {

  /**
   * スプレッドシートIDを取得（共通）
   */
  getSpreadsheetId: function() {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) {
      throw new Error('[DAL] SPREADSHEET_IDが設定されていません');
    }
    return id;
  },

  /**
   * スプレッドシートを取得（キャッシュ付き）
   */
  getSpreadsheet: function() {
    if (!this._spreadsheet) {
      this._spreadsheet = SpreadsheetApp.openById(this.getSpreadsheetId());
    }
    return this._spreadsheet;
  },

  /**
   * ===========================
   * 加盟店登録データ操作
   * ===========================
   */

  /**
   * 加盟店登録シートを取得
   */
  getRegistrationSheet: function() {
    const sheet = this.getSpreadsheet().getSheetByName('加盟店登録');
    if (!sheet) {
      throw new Error('[DAL] 加盟店登録シートが見つかりません');
    }
    return sheet;
  },

  /**
   * 全登録データを取得（AdminSystem用）
   */
  getAllRegistrations: function() {
    try {
      const sheet = this.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return { headers: [], rows: [] };
      }

      return {
        headers: data[0],
        rows: data.slice(1)
      };
    } catch (error) {
      console.error('[DAL] getAllRegistrations error:', error);
      return { headers: [], rows: [] };
    }
  },

  /**
   * 新規登録を保存（FranchiseSystem用）
   */
  saveNewRegistration: function(registrationData) {
    try {
      const sheet = this.getRegistrationSheet();

      // 登録ID生成
      const registrationId = 'FR' + Utilities.formatDate(new Date(), 'JST', 'MMddHHmm');
      const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm');

      // 行データ作成
      const rowData = [
        registrationId,
        timestamp,
        registrationData.companyName || '',
        registrationData.companyNameKana || '',
        registrationData.representativeName || '',
        registrationData.representativeNameKana || '',
        registrationData.phone || '',
        registrationData.email || '',
        registrationData.salesPerson || '',
        registrationData.salesPersonPhone || '',
        registrationData.address || '',
        registrationData.prefectures || '',
        registrationData.cities || '',
        registrationData.priorityAreas || '',
        registrationData.propertyTypes || '',
        JSON.stringify(registrationData.branches || []),
        registrationData.branchCount || 0,
        registrationData.buildingAgeRange || '',
        '申請中', // ステータス
        '申請中', // 承認ステータス
        '', // 承認日
        timestamp, // 登録日
        registrationData.prText || ''
      ];

      // 保存
      sheet.appendRow(rowData);

      return {
        success: true,
        registrationId: registrationId
      };

    } catch (error) {
      console.error('[DAL] saveNewRegistration error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 承認ステータス更新（AdminSystem用）
   */
  updateApprovalStatus: function(registrationId, status, approver) {
    try {
      const sheet = this.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('登録ID');
      const statusIndex = headers.indexOf('承認ステータス');
      const dateIndex = headers.indexOf('承認日');

      // 該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          // 更新
          sheet.getRange(i + 1, statusIndex + 1).setValue(status);

          if (status === '承認済み') {
            const approvalDate = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm');
            sheet.getRange(i + 1, dateIndex + 1).setValue(approvalDate);
          }

          return {
            success: true,
            message: `${status}に更新しました`
          };
        }
      }

      return {
        success: false,
        error: '該当する登録が見つかりません'
      };

    } catch (error) {
      console.error('[DAL] updateApprovalStatus error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ===========================
   * プロパティ操作（共通）
   * ===========================
   */

  /**
   * プロパティ取得（エラーハンドリング付き）
   */
  getProperty: function(key) {
    try {
      return PropertiesService.getScriptProperties().getProperty(key);
    } catch (error) {
      console.error('[DAL] getProperty error:', key, error);
      return null;
    }
  },

  /**
   * プロパティ設定
   */
  setProperty: function(key, value) {
    try {
      PropertiesService.getScriptProperties().setProperty(key, value);
      return true;
    } catch (error) {
      console.error('[DAL] setProperty error:', key, error);
      return false;
    }
  },

  /**
   * ===========================
   * ユーティリティ
   * ===========================
   */

  /**
   * 日付フォーマット（共通）
   */
  formatDate: function(date, format) {
    return Utilities.formatDate(date || new Date(), 'JST', format || 'yyyy-MM-dd HH:mm');
  },

  /**
   * 配列を文字列に変換（カンマ区切り）
   */
  arrayToString: function(arr) {
    if (!arr) return '';
    if (typeof arr === 'string') return arr;
    return arr.join(', ');
  },

  /**
   * 文字列を配列に変換（カンマ区切り）
   */
  stringToArray: function(str) {
    if (!str) return [];
    if (Array.isArray(str)) return str;
    return str.split(',').map(s => s.trim()).filter(s => s);
  },

  /**
   * ===========================
   * デバッグ用
   * ===========================
   */

  /**
   * システムステータス確認
   */
  checkSystemStatus: function() {
    const status = {
      spreadsheetId: this.getProperty('SPREADSHEET_ID') ? '✓' : '✗',
      googleSearchApiKey: this.getProperty('GOOGLE_SEARCH_API_KEY') ? '✓' : '✗',
      googleSearchEngineId: this.getProperty('GOOGLE_SEARCH_ENGINE_ID') ? '✓' : '✗',
      openRouterApiKey: this.getProperty('OPENROUTER_API_KEY') ? '✓' : '✗',
      slackWebhookUrl: this.getProperty('SLACK_WEBHOOK_URL') ? '✓' : '✗'
    };

    try {
      const sheet = this.getRegistrationSheet();
      status.registrationSheet = sheet ? '✓' : '✗';
      status.dataCount = sheet ? sheet.getLastRow() - 1 : 0;
    } catch (e) {
      status.registrationSheet = '✗';
      status.dataCount = 0;
    }

    return status;
  }
};