/**
 * ====================================
 * DataLayer - 統一データアクセス層
 * ====================================
 *
 * 【目的】
 * - システム間の影響を最小化
 * - データフォーマットの一元管理
 * - 後方互換性の自動保持
 * - エラーハンドリングの統一
 *
 * 【ルール】
 * 1. 全てのSpreadsheetアクセスはDataLayerを経由
 * 2. 圧縮データの自動展開
 * 3. データ検証の一元化
 * 4. エラーは必ずログ + 通知
 *
 * 【使用例】
 * ```javascript
 * // 読み取り
 * const data = DataLayer.getMerchantData(merchantId);
 * const branches = DataLayer.getField(merchantId, 'branchAddresses');
 *
 * // 書き込み
 * DataLayer.updateField(merchantId, 'companyName', '新社名');
 * DataLayer.updateMerchantData(merchantId, { companyName: '新社名', ... });
 * ```
 *
 * 【バージョニング】
 * - SCHEMA_VERSION: データスキーマのバージョン
 * - マイグレーション機能により後方互換性を自動保持
 */

class DataLayer {

  /**
   * ====================================
   * スキーマバージョン
   * ====================================
   * データ構造変更時にバージョンを更新
   *
   * バージョン履歴:
   * - v2.1: 完全自動化構築（2025-10-31）
   * - v2.0: DataLayer統合、COLUMN_MAP一元化（2025-10-31）
   * - v1.0: 初期バージョン
   */
  static get SCHEMA_VERSION() {
    return 'v2.1';
  }

  /**
   * バージョン情報を取得
   */
  static getVersionInfo() {
    return {
      schemaVersion: this.SCHEMA_VERSION,
      columnCount: Object.keys(this.COLUMN_MAP).length,
      compressedColumns: this.COMPRESSED_COLUMNS.length,
      lastUpdated: '2025-10-31',
      supportedVersions: ['v1.0', 'v2.0']
    };
  }

  /**
   * Spreadsheet ID（環境変数から取得）
   */
  static getSpreadsheetId() {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) {
      throw new Error('[DataLayer] SPREADSHEET_ID が設定されていません');
    }
    return id;
  }

  /**
   * Spreadsheetオブジェクト取得
   */
  static getSpreadsheet() {
    try {
      return SpreadsheetApp.openById(this.getSpreadsheetId());
    } catch (error) {
      console.error('[DataLayer] Spreadsheetアクセスエラー:', error);
      throw new Error('Spreadsheetにアクセスできません: ' + error.toString());
    }
  }

  /**
   * シート取得（デフォルト: 加盟店登録管理）
   */
  static getSheet(sheetName = '加盟店登録管理') {
    try {
      const ss = this.getSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(`シート "${sheetName}" が見つかりません`);
      }
      return sheet;
    } catch (error) {
      console.error('[DataLayer] シート取得エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * カラムマッピング（一元管理）
   * ====================================
   */
  static get COLUMN_MAP() {
    return {
      // 基本情報
      'timestamp': 1,          // A列
      'status': 2,             // B列
      'companyName': 3,        // C列
      'companyNameKana': 4,    // D列
      'tradeName': 5,          // E列
      'tradeNameKana': 6,      // F列
      'representative': 7,     // G列
      'representativeKana': 8, // H列
      'zipCode': 9,            // I列
      'address': 10,           // J列
      'phone': 11,             // K列
      'email': 12,             // L列
      'website': 13,           // M列
      'established': 14,       // N列
      'prText': 15,            // O列

      // 支店情報
      'branchCount': 16,       // P列
      'branchName': 17,        // Q列
      'branchAddress': 18,     // R列（圧縮対象）

      // 本人確認
      'idDocumentUrl': 19,     // S列
      'idDocumentFileId': 20,  // T列

      // メイン画像
      'mainVisualUrl': 21,     // U列
      'mainVisualFileId': 22,  // V列

      // 写真ギャラリー
      'photoGalleryUrls': 23,  // W列
      'photoGalleryFileIds': 24, // X列

      // 連絡先・事業情報
      'billingEmail': 25,      // Y列
      'salesEmail': 26,        // Z列
      'salesPersonName': 27,   // AA列
      'salesPersonKana': 28,   // AB列
      'employees': 29,         // AC列
      'salesScale': 30,        // AD列
      'maxFloors': 31,         // AE列（圧縮対象）

      // 詳細情報
      'constructionTypes': 32, // AF列（圧縮対象）
      'specialServices': 33,   // AG列（圧縮対象）
      'prefectures': 34,       // AH列（圧縮対象）
      'cities': 35,            // AI列（圧縮対象）
      'priorityAreas': 36,     // AJ列（圧縮対象）

      // 施工事例
      'constructionExamples': 37, // AK列

      // 資格・保険
      'qualifications': 38,    // AL列（圧縮対象）
      'insurance': 39,         // AM列（圧縮対象）

      // 自動配信設定
      'propertyFloors': 40,    // AN列
      'autoPropertyTypes': 41, // AO列
      'autoConstructionTypes': 42, // AP列
      'autoSpecialServices': 43,   // AQ列
      'autoPrefectures': 44,   // AR列
      'autoCities': 45,        // AS列
      'autoPriorityAreas': 46, // AT列

      // URL・ステータス
      'merchantId': 47,        // AU列
      'urlSlug': 48,           // AV列
      'firstLoginUrl': 49,     // AW列
      'password': 50,          // AX列
      'representativeHide': 51, // AY列
      'addressHide': 52        // AZ列
    };
  }

  /**
   * 圧縮対象カラム（後方互換性のため自動展開）
   */
  static get COMPRESSED_COLUMNS() {
    return [
      'branchAddress',
      'maxFloors',
      'constructionTypes',
      'specialServices',
      'prefectures',
      'cities',
      'priorityAreas',
      'qualifications',
      'insurance'
    ];
  }

  /**
   * ====================================
   * データ展開（圧縮データ自動対応）
   * ====================================
   */
  static expandCompressedText(text) {
    if (!text || typeof text !== 'string') return text;

    // JSON形式の圧縮データチェック
    if (text.startsWith('{') && text.includes('"type":"compressed"')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.type === 'compressed' && parsed.full) {
          console.log('[DataLayer] 圧縮データを自動展開:', text.substring(0, 50) + '...');
          // 再帰的に展開（多重圧縮対応）
          return this.expandCompressedText(parsed.full);
        }
      } catch (e) {
        console.warn('[DataLayer] 圧縮データ展開エラー（元データを返却）:', e);
        return text;
      }
    }

    return text;
  }

  /**
   * ====================================
   * 加盟店ID → 行番号の変換
   * ====================================
   */
  static getMerchantRowByEmail(email) {
    try {
      const sheet = this.getSheet();
      const emailCol = this.COLUMN_MAP['email'];
      const data = sheet.getRange(2, emailCol, sheet.getLastRow() - 1, 1).getValues();

      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === email) {
          return i + 2; // ヘッダー行を考慮
        }
      }

      return null;
    } catch (error) {
      console.error('[DataLayer] getMerchantRowByEmail エラー:', error);
      throw error;
    }
  }

  static getMerchantRowByMerchantId(merchantId) {
    try {
      const sheet = this.getSheet();
      const merchantIdCol = this.COLUMN_MAP['merchantId'];
      const data = sheet.getRange(2, merchantIdCol, sheet.getLastRow() - 1, 1).getValues();

      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === merchantId) {
          return i + 2;
        }
      }

      return null;
    } catch (error) {
      console.error('[DataLayer] getMerchantRowByMerchantId エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * 読み取り: 単一フィールド
   * ====================================
   */
  static getField(merchantId, fieldName) {
    try {
      const row = this.getMerchantRowByMerchantId(merchantId);
      if (!row) {
        throw new Error(`MerchantID "${merchantId}" が見つかりません`);
      }

      const col = this.COLUMN_MAP[fieldName];
      if (!col) {
        throw new Error(`フィールド "${fieldName}" は定義されていません`);
      }

      const sheet = this.getSheet();
      let value = sheet.getRange(row, col).getValue();

      // 圧縮対象カラムは自動展開
      if (this.COMPRESSED_COLUMNS.includes(fieldName)) {
        value = this.expandCompressedText(value);
      }

      console.log(`[DataLayer] getField: ${fieldName} = ${value}`);
      return value;

    } catch (error) {
      console.error('[DataLayer] getField エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * 読み取り: 全データ（オブジェクト形式）
   * ====================================
   */
  static getMerchantData(merchantId) {
    try {
      const row = this.getMerchantRowByMerchantId(merchantId);
      if (!row) {
        throw new Error(`MerchantID "${merchantId}" が見つかりません`);
      }

      const sheet = this.getSheet();
      const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

      const merchantData = {};

      // カラムマップに基づいてデータ構築
      for (const [fieldName, colIndex] of Object.entries(this.COLUMN_MAP)) {
        let value = rowData[colIndex - 1]; // 0-indexed

        // 圧縮対象カラムは自動展開
        if (this.COMPRESSED_COLUMNS.includes(fieldName)) {
          value = this.expandCompressedText(value);
        }

        merchantData[fieldName] = value;
      }

      console.log('[DataLayer] getMerchantData 完了:', merchantId);
      return merchantData;

    } catch (error) {
      console.error('[DataLayer] getMerchantData エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * 書き込み: 単一フィールド
   * ====================================
   */
  static updateField(merchantId, fieldName, value) {
    try {
      const row = this.getMerchantRowByMerchantId(merchantId);
      if (!row) {
        throw new Error(`MerchantID "${merchantId}" が見つかりません`);
      }

      const col = this.COLUMN_MAP[fieldName];
      if (!col) {
        throw new Error(`フィールド "${fieldName}" は定義されていません`);
      }

      const sheet = this.getSheet();
      sheet.getRange(row, col).setValue(value);

      console.log(`[DataLayer] updateField 完了: ${fieldName} = ${value}`);
      return { success: true };

    } catch (error) {
      console.error('[DataLayer] updateField エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * 書き込み: 複数フィールド
   * ====================================
   */
  static updateMerchantData(merchantId, dataObj) {
    try {
      const row = this.getMerchantRowByMerchantId(merchantId);
      if (!row) {
        throw new Error(`MerchantID "${merchantId}" が見つかりません`);
      }

      const sheet = this.getSheet();
      const updates = [];

      // dataObjの各フィールドを更新
      for (const [fieldName, value] of Object.entries(dataObj)) {
        const col = this.COLUMN_MAP[fieldName];
        if (col) {
          updates.push({ row, col, value });
        } else {
          console.warn(`[DataLayer] 未定義フィールドをスキップ: ${fieldName}`);
        }
      }

      // 一括更新（効率化）
      updates.forEach(({ row, col, value }) => {
        sheet.getRange(row, col).setValue(value);
      });

      console.log(`[DataLayer] updateMerchantData 完了: ${updates.length}フィールド更新`);
      return { success: true, updatedCount: updates.length };

    } catch (error) {
      console.error('[DataLayer] updateMerchantData エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * 新規登録: 行追加
   * ====================================
   */
  static appendMerchantData(dataArray) {
    try {
      const sheet = this.getSheet();
      sheet.appendRow(dataArray);

      console.log('[DataLayer] appendMerchantData 完了: 新規行追加');
      return { success: true };

    } catch (error) {
      console.error('[DataLayer] appendMerchantData エラー:', error);
      throw error;
    }
  }

  /**
   * ====================================
   * ステータス管理
   * ====================================
   */
  static updateStatus(merchantId, newStatus) {
    return this.updateField(merchantId, 'status', newStatus);
  }

  static getStatus(merchantId) {
    return this.getField(merchantId, 'status');
  }

  /**
   * ====================================
   * 検証・バリデーション
   * ====================================
   */
  static validateMerchantId(merchantId) {
    if (!merchantId || typeof merchantId !== 'string') {
      throw new Error('MerchantIDが不正です');
    }

    const row = this.getMerchantRowByMerchantId(merchantId);
    if (!row) {
      throw new Error(`MerchantID "${merchantId}" は存在しません`);
    }

    return true;
  }

  /**
   * ====================================
   * ユーティリティ
   * ====================================
   */

  /**
   * 日本語カラム名 → 英語フィールド名の変換
   * （MerchantSystemとの互換性のため）
   */
  static get JP_TO_EN_MAP() {
    return {
      '会社名': 'companyName',
      '会社名カナ': 'companyNameKana',
      '屋号': 'tradeName',
      '屋号カナ': 'tradeNameKana',
      '代表者名': 'representative',
      '代表者名カナ': 'representativeKana',
      '郵便番号': 'zipCode',
      '住所': 'address',
      '電話番号': 'phone',
      'メールアドレス': 'email',
      'ウェブサイトURL': 'website',
      '設立年月': 'established',
      'PRテキスト': 'prText',
      '支店数': 'branchCount',
      '支店名': 'branchName',
      '支店住所': 'branchAddress',
      '請求用メールアドレス': 'billingEmail',
      '営業用メールアドレス': 'salesEmail',
      '営業担当者氏名': 'salesPersonName',
      '営業担当者カナ': 'salesPersonKana',
      '従業員数': 'employees',
      '売上規模': 'salesScale',
      '最大対応階数': 'maxFloors',
      '施工箇所': 'constructionTypes',
      '特殊対応項目': 'specialServices',
      '対応都道府県': 'prefectures',
      '対応市区町村': 'cities',
      '優先エリア': 'priorityAreas',
      '保有資格': 'qualifications',
      '加入保険': 'insurance',
      'MerchantID': 'merchantId',
      'URLスラッグ': 'urlSlug',
      '初回ログインURL': 'firstLoginUrl',
      'パスワード': 'password'
    };
  }

  /**
   * AdminSystemの日本語データを英語フィールド名に変換
   */
  static convertJapaneseToEnglish(jpData) {
    const enData = {};
    for (const [jpKey, enKey] of Object.entries(this.JP_TO_EN_MAP)) {
      if (jpData[jpKey] !== undefined) {
        enData[enKey] = jpData[jpKey];
      }
    }
    return enData;
  }
}

// グローバルに公開
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLayer;
}
