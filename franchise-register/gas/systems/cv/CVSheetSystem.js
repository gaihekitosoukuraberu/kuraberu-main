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
   * Q1（物件種別）からV列用の値を抽出
   * V列の最終選択肢: 戸建て、アパート・マンション、実家・別荘・所有物件、店舗・事務所、工場・倉庫、その他
   *
   * 例: 「はい」(Q001の質問が「戸建て2階建てのご自宅ですか？」) → 「戸建て」
   * 例: 「戸建て2階建て」→「戸建て」
   * 例: 「アパート・マンション」→「アパート・マンション」
   * 例: 「2階建て以外の自宅」→「戸建て」
   */
  extractPropertyType(q1Value, q1Question) {
    if (!q1Value) return '';

    // 「はい」の場合は質問文から抽出
    if (q1Value === 'はい' || q1Value.includes('はい')) {
      if (q1Question) {
        if (q1Question.includes('戸建て')) return '戸建て';
        if (q1Question.includes('マンション')) return 'アパート・マンション';
        if (q1Question.includes('アパート')) return 'アパート・マンション';
      }
      return '';
    }

    // 「いいえ」の場合は空（次の質問で決まる）
    if (q1Value === 'いいえ') {
      return '';
    }

    // 「2階建て以外の自宅」→「戸建て」
    if (q1Value.includes('自宅')) {
      return '戸建て';
    }

    // 「アパート・マンション」はそのまま
    if (q1Value.includes('アパート') || q1Value.includes('マンション')) {
      return 'アパート・マンション';
    }

    // 「実家・別荘・所有物件」はそのまま
    if (q1Value.includes('実家') || q1Value.includes('別荘') || q1Value.includes('所有物件')) {
      return '実家・別荘・所有物件';
    }

    // 「店舗・事務所」はそのまま
    if (q1Value.includes('店舗') || q1Value.includes('事務所')) {
      return '店舗・事務所';
    }

    // 「工場・倉庫」はそのまま
    if (q1Value.includes('工場') || q1Value.includes('倉庫')) {
      return '工場・倉庫';
    }

    // 「戸建て2階建て」→「戸建て」（階数を除去）
    let cleaned = q1Value.replace(/\d+階建て?/g, '').trim();
    if (cleaned.includes('戸建て')) {
      return '戸建て';
    }

    // その他
    return 'その他';
  },

  /**
   * Q2（階数）からY列用の値を抽出
   * 例: 「戸建て2階建て」→「2階建て」
   * 例: 「2階建て」→「2階建て」
   * 例: 「3階」→「3階建て」
   * 例: 「5F」→「5階建て」
   */
  extractFloors(q2Value, q1Value, q1Question) {
    // Q2に値がある場合はそれを優先、なければQ1を使用
    let source = q2Value || q1Value || '';
    if (!source) return '';

    // 既に「○階建て」形式の場合はそのまま抽出
    const floorMatch = source.match(/(\d+)階建て?/);
    if (floorMatch) {
      return floorMatch[1] + '階建て';
    }

    // 「○階」形式の場合（例: 2階 → 2階建て）
    const floorOnlyMatch = source.match(/(\d+)階/);
    if (floorOnlyMatch) {
      return floorOnlyMatch[1] + '階建て';
    }

    // 「○F」形式の場合（例: 2F → 2階建て）
    const fMatch = source.match(/(\d+)[Ff]/);
    if (fMatch) {
      return fMatch[1] + '階建て';
    }

    // 「平屋」→「1階建て」
    if (source.includes('平屋')) {
      return '1階建て';
    }

    // 「10階建て以上」のようなパターンはそのまま返す
    if (source.includes('以上')) {
      return source;
    }

    // マッチしない場合は空文字
    return '';
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
        data.phone ? "'" + data.phone : '',      // G: 電話番号（'を先頭に付けて文字列化）
        data.email || '',                        // H: メールアドレス
        '',                                      // I: 続柄（空欄）

        '',                                      // J: 氏名（2人目）
        '',                                      // K: 電話番号（2人目）
        '',                                      // L: 続柄（2人目）
        '',                                      // M: 備考（2人目）

        data.postalCode ? "'" + data.postalCode : '',  // N: 郵便番号（物件）（'を先頭に付けて文字列化）
        data.prefecture || '',                   // O: 都道府県（物件）
        data.city || '',                         // P: 市区町村（物件）
        data.propertyStreet || '',               // Q: 住所詳細（物件）

        data.isDifferentHome || 'FALSE',         // R: 自宅住所フラグ
        data.homeZip ? "'" + data.homeZip : '',  // S: 郵便番号（自宅）（'を先頭に付けて文字列化）
        data.homePrefecture || '',               // T: 都道府県（自宅）
        data.homeStreet || '',                   // U: 住所詳細（自宅）

        // V-Y: 物件詳細（BOT回答から自動抽出）
        this.extractPropertyType(data.Q1_propertyType, data.q1_question),  // V: 物件種別
        data.Q3_buildingAge || '',                       // W: 築年数
        '',                                              // X: 建物面積（空欄）
        this.extractFloors(data.Q2_floors, data.Q1_propertyType, data.q1_question), // Y: 階数

        // Z-AP: BOT質問回答（Q1〜Q17）- BOT側のパラメータ名に合わせる
        data.Q1_propertyType || '',              // Z: Q1_物件種別
        data.Q2_floors || '',                    // AA: Q2_階数
        data.Q3_buildingAge || '',               // AB: Q3_築年数
        data.Q4_workHistory || '',               // AC: Q4_工事歴
        data.Q5_previousWorkTime || '',          // AD: Q5_前回施工時期
        data.Q6_exteriorMaterial || '',          // AE: Q6_外壁材質
        data.Q7_roofMaterial || '',              // AF: Q7_屋根材質
        data.Q8_concernedArea || '',             // AG: Q8_気になる箇所
        data.Q9_exteriorWork || '',              // AH: Q9_希望工事内容_外壁
        data.Q10_roofWork || '',                 // AI: Q10_希望工事内容_屋根
        data.Q11_quoteCount || '',               // AJ: Q11_見積もり保有数
        data.Q12_quoteSource || '',              // AK: Q12_見積もり取得先
        data.Q13_doorSales || '',                // AL: Q13_訪問業者有無
        data.Q14_comparison || '',               // AM: Q14_比較意向
        data.Q15_doorSalesCompany || '',         // AN: Q15_訪問業者名
        data.Q16_degradation || '',              // AO: Q16_現在の劣化状況
        data.Q17_selectionCriteria || '',        // AP: Q17_業者選定条件

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
        '',                                      // BL: メモ

        // BM-BS: 管理用フィールド（新規追加）
        '新規',                                   // BM: 管理ステータス
        '',                                      // BN: 加盟店別ステータス（JSON）
        '',                                      // BO: 初回架電日時
        timestamp,                               // BP: 最終更新日時
        '',                                      // BQ: 配信予定日時
        ''                                       // BS: 担当者名
      ];

      // 最終行に追加
      const lastRow = sheet.getLastRow() + 1;
      sheet.appendRow(row);

      // 電話番号と郵便番号を文字列形式に設定（先頭の0が消えないように）
      sheet.getRange(lastRow, 7).setNumberFormat('@STRING@');  // G: 電話番号
      sheet.getRange(lastRow, 11).setNumberFormat('@STRING@'); // K: 電話番号（2人目）
      sheet.getRange(lastRow, 14).setNumberFormat('@STRING@'); // N: 郵便番号（物件）
      sheet.getRange(lastRow, 19).setNumberFormat('@STRING@'); // S: 郵便番号（自宅）

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
        params.phone ? "'" + params.phone : '',  // G: 電話番号（'を先頭に付けて文字列化）
        '',                                      // H: メールアドレス（CV2で入力）
        '',                                      // I: 続柄

        '',                                      // J-M: 2人目情報
        '',
        '',
        '',

        params.postalCode ? "'" + params.postalCode : '',  // N: 郵便番号（物件）（'を先頭に付けて文字列化）
        params.propertyPrefecture || '',         // O: 都道府県（物件）
        params.propertyCity || '',               // P: 市区町村（物件）
        '',                                      // Q: 住所詳細（CV2で入力）

        'FALSE',                                 // R: 自宅住所フラグ
        '',                                      // S: 郵便番号（自宅）（CV2で入力）
        '',                                      // T: 都道府県（自宅）（CV2で入力）
        '',                                      // U: 住所詳細（自宅）（CV2で入力）

        // V-Y: 物件詳細（BOT回答から自動抽出）
        this.extractPropertyType(params.Q1_propertyType, params.q1_question),  // V: 物件種別
        params.Q3_buildingAge || '',                        // W: 築年数
        '',                                                 // X: 建物面積（空欄）
        this.extractFloors(params.Q2_floors, params.Q1_propertyType, params.q1_question), // Y: 階数

        // Z-AP: BOT質問回答（Q1〜Q17）- BOT側のパラメータ名に合わせる
        params.Q1_propertyType || '',            // Z: Q1_物件種別
        params.Q2_floors || '',                  // AA: Q2_階数
        params.Q3_buildingAge || '',             // AB: Q3_築年数
        params.Q4_workHistory || '',             // AC: Q4_工事歴
        params.Q5_previousWorkTime || '',        // AD: Q5_前回施工時期
        params.Q6_exteriorMaterial || '',        // AE: Q6_外壁材質
        params.Q7_roofMaterial || '',            // AF: Q7_屋根材質
        params.Q8_concernedArea || '',           // AG: Q8_気になる箇所
        params.Q9_exteriorWork || '',            // AH: Q9_希望工事内容_外壁
        params.Q10_roofWork || '',               // AI: Q10_希望工事内容_屋根
        params.Q11_quoteCount || '',             // AJ: Q11_見積もり保有数
        params.Q12_quoteSource || '',            // AK: Q12_見積もり取得先
        params.Q13_doorSales || '',              // AL: Q13_訪問業者有無
        params.Q14_comparison || '',             // AM: Q14_比較意向
        params.Q15_doorSalesCompany || '',       // AN: Q15_訪問業者名
        params.Q16_degradation || '',            // AO: Q16_現在の劣化状況
        params.Q17_selectionCriteria || '',      // AP: Q17_業者選定条件

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

        '',                                      // BJ: 架電履歴
        '',                                      // BK: 最終架電日時
        '',                                      // BL: メモ

        // BM-BS: 管理用フィールド（新規追加）
        '新規',                                   // BM: 管理ステータス
        '',                                      // BN: 加盟店別ステータス（JSON）
        '',                                      // BO: 初回架電日時
        timestamp,                               // BP: 最終更新日時
        '',                                      // BQ: 配信予定日時
        ''                                       // BS: 担当者名
      ];

      // 最終行に追加
      const lastRow = sheet.getLastRow() + 1;
      sheet.appendRow(row);

      // 電話番号と郵便番号を文字列形式に設定（先頭の0が消えないように）
      sheet.getRange(lastRow, 7).setNumberFormat('@STRING@');  // G: 電話番号
      sheet.getRange(lastRow, 11).setNumberFormat('@STRING@'); // K: 電話番号（2人目）
      sheet.getRange(lastRow, 14).setNumberFormat('@STRING@'); // N: 郵便番号（物件）
      sheet.getRange(lastRow, 19).setNumberFormat('@STRING@'); // S: 郵便番号（自宅）

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
      sheet.getRange(targetRow, 14).setValue(params.postalCode ? "'" + params.postalCode : ''); // N: 郵便番号（物件）（'を先頭に付けて文字列化）
      sheet.getRange(targetRow, 15).setValue(params.propertyPrefecture || '');     // O: 都道府県（物件）
      sheet.getRange(targetRow, 16).setValue(params.propertyCity || '');           // P: 市区町村（物件）
      sheet.getRange(targetRow, 17).setValue(params.propertyStreet || '');         // Q: 住所詳細（物件）

      // 自宅住所
      sheet.getRange(targetRow, 18).setValue(params.isDifferentHome ? 'TRUE' : 'FALSE'); // R: 自宅住所フラグ
      sheet.getRange(targetRow, 19).setValue(params.homeZip ? "'" + params.homeZip : '');  // S: 郵便番号（自宅）（'を先頭に付けて文字列化）
      sheet.getRange(targetRow, 20).setValue(params.homePrefecture || '');         // T: 都道府県（自宅）

      // U: 住所詳細（自宅）- 市区町村と番地を結合
      const homeFullAddress = [params.homeCity, params.homeStreet].filter(v => v).join('');
      sheet.getRange(targetRow, 21).setValue(homeFullAddress || '');               // U: 住所詳細（自宅）

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
   * 全CV取得（アドミンダッシュボード用）
   */
  getAllCVs() {
    try {
      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      // 全データ取得（ヘッダー行を除く）
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const headers = values[0]; // ヘッダー行
      const dataRows = values.slice(1); // データ行（2行目以降）

      console.log('[CVSheetSystem] 全CV取得:', dataRows.length, '件');

      // データ行を配列に変換
      const cvList = dataRows.map((row, index) => {
        // 空行をスキップ
        if (!row[0]) return null;

        return {
          // A-I: 基本個人情報
          cvId: row[0] || '',                           // A: CV ID
          registeredAt: row[1] || '',                   // B: 登録日時
          name: row[2] || '',                           // C: 氏名
          nameKana: row[3] || '',                       // D: フリガナ
          gender: row[4] || '',                         // E: 性別
          age: row[5] || '',                            // F: 年齢
          phone: row[6] || '',                          // G: 電話番号
          email: row[7] || '',                          // H: メールアドレス
          relation: row[8] || '',                       // I: 続柄

          // J-M: 2人目情報
          secondPerson: {
            name: row[9] || '',                         // J: 氏名（2人目）
            phone: row[10] || '',                       // K: 電話番号（2人目）
            relation: row[11] || '',                    // L: 続柄（2人目）
            memo: row[12] || ''                         // M: 備考（2人目）
          },

          // N-Q: 物件住所
          postalCode: row[13] || '',                    // N: 郵便番号（物件）
          prefecture: row[14] || '',                    // O: 都道府県（物件）
          city: row[15] || '',                          // P: 市区町村（物件）
          propertyStreet: row[16] || '',                // Q: 住所詳細（物件）

          // R-U: 自宅住所
          isDifferentHome: row[17] === 'TRUE',          // R: 自宅住所フラグ
          homeAddress: {
            postalCode: row[18] || '',                  // S: 郵便番号（自宅）
            prefecture: row[19] || '',                  // T: 都道府県（自宅）
            street: row[20] || ''                       // U: 住所詳細（自宅）
          },

          // V-Y: 物件詳細（BOT回答から自動抽出される）
          propertyType: row[21] || '',                  // V: 物件種別
          buildingAge: row[22] || '',                   // W: 築年数
          area: row[23] || '',                          // X: 建物面積
          floors: row[24] || '',                        // Y: 階数

          // Z-AP: BOT質問回答（Q1〜Q17）
          botAnswers: {
            q1_propertyType: row[25] || '',             // Z: Q1_物件種別
            q2_floors: row[26] || '',                   // AA: Q2_階数
            q3_buildingAge: row[27] || '',              // AB: Q3_築年数
            q4_constructionHistory: row[28] || '',      // AC: Q4_工事歴
            q5_lastConstructionTime: row[29] || '',     // AD: Q5_前回施工時期
            q6_wallMaterial: row[30] || '',             // AE: Q6_外壁材質
            q7_roofMaterial: row[31] || '',             // AF: Q7_屋根材質
            q8_concernedArea: row[32] || '',            // AG: Q8_気になる箇所
            q9_wallWorkType: row[33] || '',             // AH: Q9_希望工事内容_外壁
            q10_roofWorkType: row[34] || '',            // AI: Q10_希望工事内容_屋根
            q11_quoteCount: row[35] || '',              // AJ: Q11_見積もり保有数
            q12_quoteSource: row[36] || '',             // AK: Q12_見積もり取得先
            q13_doorSalesVisit: row[37] || '',          // AL: Q13_訪問業者有無
            q14_comparisonIntention: row[38] || '',     // AM: Q14_比較意向
            q15_doorSalesCompany: row[39] || '',        // AN: Q15_訪問業者名
            q16_deteriorationStatus: row[40] || '',     // AO: Q16_現在の劣化状況
            q17_selectionCriteria: row[41] || ''        // AP: Q17_業者選定条件
          },

          // AQ-AR: CV2入力項目
          surveyDatePreference: row[42] || '',          // AQ: 現地調査希望日時
          keepInfo: row[43] || '',                      // AR: その他ご要望

          // AS-AV: 予備・運用項目
          budget: row[44] || '',                        // AS: 予算
          reserve1: row[45] || '',                      // AT: 予備項目1
          reserve2: row[46] || '',                      // AU: 予備項目2
          reserve3: row[47] || '',                      // AV: 予備項目3

          // AW-BC: 配信・成約管理
          deliveryStatus: row[48] || '',                // AW: 配信ステータス
          companiesCount: row[49] || 0,                 // AX: 配信先加盟店数
          deliveryDate: row[50] || '',                  // AY: 配信日時
          contractFlag: row[51] === 'TRUE',             // AZ: 成約フラグ
          contractDate: row[52] || '',                  // BA: 成約日時
          contractFranchiseId: row[53] || '',           // BB: 成約加盟店ID
          contractAmount: row[54] || '',                // BC: 成約金額

          // BD-BF: 流入トラッキング
          referrer: row[55] || '',                      // BD: 流入元URL
          searchKeyword: row[56] || '',                 // BE: 検索キーワード
          utmParams: row[57] || '',                     // BF: UTMパラメータ

          // BG-BI: 不正対策
          visitCount: row[58] || 0,                     // BG: 訪問回数
          lastVisitDate: row[59] || '',                 // BH: 最終訪問日時
          isBlocked: row[60] === 'TRUE',                // BI: ブロックフラグ

          // BJ-BL: フォローアップ履歴
          callHistory: row[61] || '',                   // BJ: 架電履歴
          lastCallDate: row[62] || '',                  // BK: 最終架電日時
          memo: row[63] || '',                          // BL: メモ

          // BM-BS: 管理用フィールド（新規追加）
          status: row[64] || '新規',                     // BM: 管理ステータス
          franchiseStatuses: row[65] || '',             // BN: 加盟店別ステータス（JSON）
          firstCallDate: row[66] || '',                 // BO: 初回架電日時
          lastUpdateDate: row[67] || '',                // BP: 最終更新日時
          scheduledDeliveryDate: row[68] || '',         // BQ: 配信予定日時
          assignedTo: row[69] || ''                     // BS: 担当者名
        };
      }).filter(cv => cv !== null); // 空行を除外

      console.log('[CVSheetSystem] CV変換完了:', cvList.length, '件');

      return {
        success: true,
        data: cvList,
        count: cvList.length
      };

    } catch (error) {
      console.error('[CVSheetSystem] 全CV取得エラー:', error);
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

      // 全CV取得（アドミンダッシュボード用）
      if (action === 'getCVList') {
        return this.getAllCVs();
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
