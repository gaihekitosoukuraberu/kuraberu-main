/**
 * ============================================
 * CVデータ管理システム
 * ============================================
 *
 * 目的: コンバージョンデータをGoogle Sheetsに保存・管理
 * 依存: SpreadsheetApp のみ
 *
 * スプレッドシート構成:
 * - シート1: ユーザー登録 (47列)
 * - シート2: 不正対策ログ (12列)
 */

const CVSheetSystem = {

  /**
   * スプレッドシートIDを取得
   * 固定ID: 1eHAUiuDbTdv9WC-RfpMUdp9HGlaqd1C7MHtgntKbSIU
   */
  getSpreadsheetId() {
    return '1eHAUiuDbTdv9WC-RfpMUdp9HGlaqd1C7MHtgntKbSIU';
  },

  /**
   * 既存スプレッドシートにシート追加
   * ユーザー登録シート + 不正対策ログシート
   */
  createSpreadsheet() {
    try {
      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);

      console.log('[CVSheetSystem] スプレッドシート取得:', ssId);

      // 既存シートをチェック（重複防止）
      const existingSheets = ss.getSheets().map(s => s.getName());
      console.log('[CVSheetSystem] 既存シート一覧:', existingSheets);

      if (!existingSheets.includes('ユーザー登録')) {
        // ユーザー登録シート作成
        this.createUserRegistrationSheet(ss);
        console.log('[CVSheetSystem] ✅ ユーザー登録シート作成完了');
      } else {
        console.log('[CVSheetSystem] ⚠️ ユーザー登録シートは既に存在');
      }

      if (!existingSheets.includes('不正対策ログ')) {
        // 不正対策ログシート作成
        this.createFraudPreventionSheet(ss);
        console.log('[CVSheetSystem] ✅ 不正対策ログシート作成完了');
      } else {
        console.log('[CVSheetSystem] ⚠️ 不正対策ログシートは既に存在');
      }

      console.log('[CVSheetSystem] シート構築完了');
      return ssId;

    } catch (error) {
      console.error('[CVSheetSystem] スプレッドシート作成エラー:', error);
      throw error;
    }
  },

  /**
   * ユーザー登録シート作成（57列）
   */
  createUserRegistrationSheet(ss) {
    const sheet = ss.insertSheet('ユーザー登録');

    // ヘッダー行（57列）
    const headers = [
      // A-I: 基本個人情報（1人目）
      'CV ID',              // A
      '登録日時',            // B
      '氏名',               // C
      'フリガナ',           // D
      '性別',               // E
      '年齢',               // F
      '電話番号',           // G
      'メールアドレス',      // H
      '続柄',               // I

      // J-M: 2人目情報
      '氏名（2人目）',       // J
      '電話番号（2人目）',   // K
      '続柄（2人目）',       // L
      '備考（2人目）',       // M

      // N-Q: 物件住所
      '郵便番号（物件）',    // N
      '都道府県（物件）',    // O
      '市区町村（物件）',    // P
      '住所詳細（物件）',    // Q

      // R-U: 自宅住所（物件と異なる場合）
      '自宅住所フラグ',      // R
      '郵便番号（自宅）',    // S
      '都道府県（自宅）',    // T
      '住所詳細（自宅）',    // U

      // V-Y: 物件詳細
      '物件種別',           // V
      '築年数',             // W
      '建物面積',           // X
      '階数',               // Y

      // Z-AP: BOT質問回答（Q1〜Q17: 17列）
      'Q1_物件種別',         // Z
      'Q2_階数',             // AA
      'Q3_築年数',           // AB
      'Q4_工事歴',           // AC
      'Q5_前回施工時期',     // AD
      'Q6_外壁材質',         // AE
      'Q7_屋根材質',         // AF
      'Q8_気になる箇所',     // AG
      'Q9_希望工事内容_外壁', // AH
      'Q10_希望工事内容_屋根', // AI
      'Q11_見積もり保有数',   // AJ
      'Q12_見積もり取得先',   // AK
      'Q13_訪問業者有無',     // AL
      'Q14_比較意向',         // AM
      'Q15_訪問業者名',       // AN
      'Q16_現在の劣化状況',   // AO
      'Q17_業者選定条件',     // AP

      // AQ-AR: CV2入力項目
      '現地調査希望日時',    // AQ
      'その他ご要望',        // AR

      // AS-AV: 予備・運用項目
      '予算',               // AS
      '予備項目1',          // AT
      '予備項目2',          // AU
      '予備項目3',          // AV

      // AW-BC: 配信・成約管理
      '配信ステータス',      // AW
      '配信先加盟店数',      // AX
      '配信日時',           // AY
      '成約フラグ',          // AZ
      '成約日時',           // BA
      '成約加盟店ID',        // BB
      '成約金額',           // BC

      // BD-BF: 流入トラッキング
      '流入元URL',          // BD
      '検索キーワード',      // BE
      'UTMパラメータ',       // BF

      // BG-BI: 不正対策（基本）
      '訪問回数',           // BG
      '最終訪問日時',        // BH
      'ブロックフラグ',      // BI

      // BJ-BL: フォローアップ履歴
      '架電履歴',           // BJ
      '最終架電日時',        // BK
      'メモ'                // BL
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 列幅自動調整
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // フリーズ（ヘッダー行固定）
    sheet.setFrozenRows(1);

    console.log('[CVSheetSystem] ユーザー登録シート作成完了 (47列)');
  },

  /**
   * 不正対策ログシート作成（12列）
   */
  createFraudPreventionSheet(ss) {
    const sheet = ss.insertSheet('不正対策ログ');

    // ヘッダー行（12列）
    const headers = [
      'ログID',             // A
      '記録日時',           // B
      'Cookie訪問者ID',     // C
      'IPアドレス',         // D
      'User Agent',        // E
      'リファラー',         // F
      '訪問回数',           // G
      '操作種別',           // H
      '検知内容',           // I
      'ブロック実行',        // J
      'CV ID（紐付け）',    // K
      '備考'                // L
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#EA4335');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 列幅自動調整
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    // フリーズ（ヘッダー行固定）
    sheet.setFrozenRows(1);

    console.log('[CVSheetSystem] 不正対策ログシート作成完了 (12列)');
  },

  /**
   * CVデータ追加（ユーザー登録）
   */
  addUserRegistration(data) {
    try {
      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      // CV ID生成（タイムスタンプベース）
      const cvId = 'CV' + new Date().getTime();
      const timestamp = new Date();

      // データ行構築（57列）
      const row = [
        cvId,                                    // A: CV ID
        timestamp,                               // B: 登録日時
        data.name || '',                         // C: 氏名
        '',                                      // D: フリガナ（空欄）
        '',                                      // E: 性別（空欄）
        '',                                      // F: 年齢（空欄）
        data.phone || '',                        // G: 電話番号
        data.email || '',                        // H: メールアドレス
        '',                                      // I: 続柄（空欄）

        '',                                      // J: 氏名（2人目）
        '',                                      // K: 電話番号（2人目）
        '',                                      // L: 続柄（2人目）
        '',                                      // M: 備考（2人目）

        data.postalCode || '',                   // N: 郵便番号（物件）
        data.prefecture || '',                   // O: 都道府県（物件）
        data.city || '',                         // P: 市区町村（物件）
        data.propertyStreet || '',               // Q: 住所詳細（物件）

        data.isDifferentHome || 'FALSE',         // R: 自宅住所フラグ
        data.homeZip || '',                      // S: 郵便番号（自宅）
        data.homePrefecture || '',               // T: 都道府県（自宅）
        data.homeStreet || '',                   // U: 住所詳細（自宅）

        '',                                      // V: 物件種別（空欄）
        '',                                      // W: 築年数（空欄）
        '',                                      // X: 建物面積（空欄）
        '',                                      // Y: 階数（空欄）

        // Z-AP: BOT質問回答（Q1〜Q17）
        data.q1_propertyType || '',              // Z: Q1_物件種別
        data.q2_floors || '',                    // AA: Q2_階数
        data.q3_buildingAge || '',               // AB: Q3_築年数
        data.q4_constructionHistory || '',       // AC: Q4_工事歴
        data.q5_lastConstructionTime || '',      // AD: Q5_前回施工時期
        data.q6_wallMaterial || '',              // AE: Q6_外壁材質
        data.q7_roofMaterial || '',              // AF: Q7_屋根材質
        data.q8_concernedArea || '',             // AG: Q8_気になる箇所
        data.q9_wallWorkType || '',              // AH: Q9_希望工事内容_外壁
        data.q10_roofWorkType || '',             // AI: Q10_希望工事内容_屋根
        data.q11_quoteCount || '',               // AJ: Q11_見積もり保有数
        data.q12_quoteSource || '',              // AK: Q12_見積もり取得先
        data.q13_doorSalesVisit || '',           // AL: Q13_訪問業者有無
        data.q14_comparisonIntention || '',      // AM: Q14_比較意向
        data.q15_doorSalesCompany || '',         // AN: Q15_訪問業者名
        data.q16_deteriorationStatus || '',      // AO: Q16_現在の劣化状況
        data.q17_selectionCriteria || '',        // AP: Q17_業者選定条件

        // AQ-AR: CV2入力項目
        data.surveyDatePreference || '',         // AQ: 現地調査希望日時
        data.keepInfo || '',                     // AR: キープ業者情報

        // AS-AV: 予備・運用項目
        '',                                      // AS: 予算（空欄）
        '',                                      // AT: 予備項目1
        '',                                      // AU: 予備項目2
        '',                                      // AV: 予備項目3

        // AW-BC: 配信・成約管理
        '未配信',                                 // AW: 配信ステータス
        0,                                       // AX: 配信先加盟店数
        '',                                      // AY: 配信日時
        'FALSE',                                 // AZ: 成約フラグ
        '',                                      // BA: 成約日時
        '',                                      // BB: 成約加盟店ID
        '',                                      // BC: 成約金額

        // BD-BF: 流入トラッキング
        data.referrer || '',                     // BD: 流入元URL
        data.keyword || '',                      // BE: 検索キーワード
        data.utm || '',                          // BF: UTMパラメータ

        // BG-BI: 不正対策
        data.visitCount || 1,                    // BG: 訪問回数
        timestamp,                               // BH: 最終訪問日時
        data.isBlocked || 'FALSE',               // BI: ブロックフラグ

        // BJ-BL: フォローアップ履歴
        '',                                      // BJ: 架電履歴
        '',                                      // BK: 最終架電日時
        ''                                       // BL: メモ
      ];

      // 最終行に追加
      sheet.appendRow(row);

      console.log('[CVSheetSystem] ユーザー登録追加:', cvId);

      return {
        success: true,
        cvId: cvId,
        message: 'CV登録完了'
      };

    } catch (error) {
      console.error('[CVSheetSystem] ユーザー登録エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 不正対策ログ追加
   */
  addFraudLog(data) {
    try {
      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('不正対策ログ');

      if (!sheet) {
        throw new Error('不正対策ログシートが見つかりません');
      }

      // ログID生成
      const logId = 'LOG' + new Date().getTime();
      const timestamp = new Date();

      // データ行構築（12列）
      const row = [
        logId,                          // A: ログID
        timestamp,                      // B: 記録日時
        data.visitorId || '',           // C: Cookie訪問者ID
        data.ipAddress || '',           // D: IPアドレス
        data.userAgent || '',           // E: User Agent
        data.referrer || '',            // F: リファラー
        data.visitCount || 0,           // G: 訪問回数
        data.actionType || '',          // H: 操作種別
        data.detectionResult || '',     // I: 検知内容
        data.blocked || 'FALSE',        // J: ブロック実行
        data.cvId || '',                // K: CV ID（紐付け）
        data.memo || ''                 // L: 備考
      ];

      // 最終行に追加
      sheet.appendRow(row);

      console.log('[CVSheetSystem] 不正対策ログ追加:', logId);

      return {
        success: true,
        logId: logId
      };

    } catch (error) {
      console.error('[CVSheetSystem] 不正対策ログエラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * CV1送信処理（電話番号入力時：即時保存）
   */
  submitCV1(params) {
    try {
      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      // CV ID生成
      const cvId = 'CV' + new Date().getTime();
      const timestamp = new Date();

      // データ行構築（57列）
      const row = [
        cvId,                                    // A: CV ID
        timestamp,                               // B: 登録日時
        '',                                      // C: 氏名（CV2で入力）
        '',                                      // D: フリガナ
        '',                                      // E: 性別
        '',                                      // F: 年齢
        params.phone || '',                      // G: 電話番号
        '',                                      // H: メールアドレス（CV2で入力）
        '',                                      // I: 続柄

        '',                                      // J-M: 2人目情報
        '',
        '',
        '',

        params.postalCode || '',                 // N: 郵便番号（物件）
        '',                                      // O: 都道府県（CV2で入力）
        '',                                      // P: 市区町村（CV2で入力）
        '',                                      // Q: 住所詳細（CV2で入力）

        'FALSE',                                 // R: 自宅住所フラグ
        '',                                      // S-U: 自宅住所
        '',
        '',

        '',                                      // V-Y: 物件詳細
        '',
        '',
        '',

        // Z-AP: BOT質問回答（Q1〜Q17）
        params.q1_propertyType || '',            // Z
        params.q2_floors || '',                  // AA
        params.q3_buildingAge || '',             // AB
        params.q4_constructionHistory || '',     // AC
        params.q5_lastConstructionTime || '',    // AD
        params.q6_wallMaterial || '',            // AE
        params.q7_roofMaterial || '',            // AF
        params.q8_concernedArea || '',           // AG
        params.q9_wallWorkType || '',            // AH
        params.q10_roofWorkType || '',           // AI
        params.q11_quoteCount || '',             // AJ
        params.q12_quoteSource || '',            // AK
        params.q13_doorSalesVisit || '',         // AL
        params.q14_comparisonIntention || '',    // AM
        params.q15_doorSalesCompany || '',       // AN
        params.q16_deteriorationStatus || '',    // AO
        params.q17_selectionCriteria || '',      // AP

        '',                                      // AQ: 現地調査希望日時（CV2で入力）
        '',                                      // AR: その他ご要望（CV2で入力）

        '',                                      // AS-AV: 予備項目
        '',
        '',
        '',

        '未配信',                                 // AW-BC: 配信・成約管理
        0,
        '',
        'FALSE',
        '',
        '',
        '',

        params.referrer || '',                   // BD: 流入元URL
        params.keyword || '',                    // BE: 検索キーワード
        params.utm || '',                        // BF: UTMパラメータ

        params.visitCount || 1,                  // BG: 訪問回数
        timestamp,                               // BH: 最終訪問日時
        'FALSE',                                 // BI: ブロックフラグ

        '',                                      // BJ-BL: フォローアップ
        '',
        ''
      ];

      // 最終行に追加
      sheet.appendRow(row);

      console.log('[CVSheetSystem] CV1保存完了:', cvId);

      // 不正対策ログを記録
      console.log('[CVSheetSystem] 🔍 不正対策ログ記録開始');
      console.log('[CVSheetSystem] 🔍 visitorId:', params.visitorId);
      console.log('[CVSheetSystem] 🔍 userAgent:', params.userAgent);
      try {
        const fraudLogResult = this.addFraudLog({
          visitorId: params.visitorId || '',
          ipAddress: '',  // GASではIPアドレス取得不可
          userAgent: params.userAgent || '',
          referrer: params.referrer || '',
          visitCount: params.visitCount || 0,
          actionType: 'CV1送信',
          detectionResult: '正常',
          blocked: 'FALSE',
          cvId: cvId,
          memo: '電話番号入力完了'
        });
        console.log('[CVSheetSystem] ✅ 不正対策ログ記録結果:', JSON.stringify(fraudLogResult));
      } catch (fraudError) {
        console.error('[CVSheetSystem] ❌ 不正対策ログ記録エラー:', fraudError);
        console.error('[CVSheetSystem] ❌ エラースタック:', fraudError.stack);
        // エラーが発生してもCV1送信は成功とする
      }

      return {
        success: true,
        cvId: cvId,
        message: 'CV1保存完了'
      };

    } catch (error) {
      console.error('[CVSheetSystem] CV1保存エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * CV2送信処理（詳細情報：UPDATE）
   */
  updateCV2(params) {
    try {
      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      const cvId = params.cvId;
      if (!cvId) {
        throw new Error('CV IDが指定されていません');
      }

      // CV IDで行を検索
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
        throw new Error('CV IDが見つかりません: ' + cvId);
      }

      // 更新データを設定
      sheet.getRange(targetRow, 3).setValue(params.name || '');                    // C: 氏名
      sheet.getRange(targetRow, 8).setValue(params.email || '');                   // H: メールアドレス
      sheet.getRange(targetRow, 15).setValue(params.prefecture || '');             // O: 都道府県
      sheet.getRange(targetRow, 16).setValue(params.city || '');                   // P: 市区町村
      sheet.getRange(targetRow, 17).setValue(params.propertyStreet || '');         // Q: 住所詳細

      // 自宅住所
      sheet.getRange(targetRow, 18).setValue(params.isDifferentHome ? 'TRUE' : 'FALSE'); // R: 自宅住所フラグ
      sheet.getRange(targetRow, 19).setValue(params.homeZip || '');                // S: 郵便番号（自宅）
      sheet.getRange(targetRow, 20).setValue(params.homePrefecture || '');         // T: 都道府県（自宅）
      sheet.getRange(targetRow, 21).setValue(params.homeStreet || '');             // U: 住所詳細（自宅）

      // CV2詳細情報
      sheet.getRange(targetRow, 43).setValue(params.surveyDatePreference || '');   // AQ: 現地調査希望日時
      sheet.getRange(targetRow, 44).setValue(params.keepInfo || '');               // AR: キープ業者情報

      console.log('[CVSheetSystem] CV2更新完了:', cvId);

      // 不正対策ログを記録
      console.log('[CVSheetSystem] 🔍 不正対策ログ記録開始（CV2）');
      console.log('[CVSheetSystem] 🔍 visitorId:', params.visitorId);
      console.log('[CVSheetSystem] 🔍 userAgent:', params.userAgent);
      try {
        const fraudLogResult = this.addFraudLog({
          visitorId: params.visitorId || '',
          ipAddress: '',  // GASではIPアドレス取得不可
          userAgent: params.userAgent || '',
          referrer: params.referrer || '',
          visitCount: params.visitCount || 0,
          actionType: 'CV2送信',
          detectionResult: '正常',
          blocked: 'FALSE',
          cvId: cvId,
          memo: '詳細情報入力完了'
        });
        console.log('[CVSheetSystem] ✅ 不正対策ログ記録結果:', JSON.stringify(fraudLogResult));
      } catch (fraudError) {
        console.error('[CVSheetSystem] ❌ 不正対策ログ記録エラー:', fraudError);
        console.error('[CVSheetSystem] ❌ エラースタック:', fraudError.stack);
        // エラーが発生してもCV2送信は成功とする
      }

      return {
        success: true,
        message: 'CV2更新完了'
      };

    } catch (error) {
      console.error('[CVSheetSystem] CV2更新エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ハンドラー（main.jsから呼ばれる）
   */
  handle(params) {
    console.log('[CVSheetSystem] handle called');
    console.log('[CVSheetSystem] params:', JSON.stringify(params));

    const action = params.action;
    console.log('[CVSheetSystem] action:', action);

    try {
      // スプレッドシート初期化・作成
      if (action === 'cv_init') {
        const ssId = this.createSpreadsheet();
        return {
          success: true,
          spreadsheetId: ssId,
          message: 'スプレッドシート準備完了'
        };
      }

      // CV1送信（電話番号入力時：即時保存）
      if (action === 'cv1_submit') {
        return this.submitCV1(params);
      }

      // CV2送信（詳細情報：UPDATE）
      if (action === 'cv2_update') {
        return this.updateCV2(params);
      }

      // ユーザー登録追加（旧API：互換性維持）
      if (action === 'cv_add_user') {
        return this.addUserRegistration(params);
      }

      // 不正対策ログ追加
      if (action === 'cv_add_fraud_log') {
        return this.addFraudLog(params);
      }

      // CV ID指定でデータ取得
      if (action === 'cv_get_user') {
        const cvId = params.cvId;
        // TODO: 実装
        return {
          success: false,
          error: 'Not implemented yet'
        };
      }

      return {
        success: false,
        error: 'Unknown CV action: ' + action
      };

    } catch (error) {
      console.error('[CVSheetSystem] handle error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
};

// グローバルスコープに公開（GASはES6モジュール非対応）
if (typeof global !== 'undefined') {
  global.CVSheetSystem = CVSheetSystem;
}
