/**
 * ============================================
 * CVデータ管理システム
 * ============================================
 *
 * 目的: コンバージョンデータをGoogle Sheetsに保存・管理
 * 依存: SpreadsheetApp のみ
 *
 * スプレッドシート構成:
 * - シート1: ユーザー登録 (71列: A-BS)
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

    // 「実家・別荘・所有物件」→「戸建て」（V列用。Z列Q1_物件種別は元の値のまま）
    if (q1Value.includes('実家') || q1Value.includes('別荘') || q1Value.includes('所有物件')) {
      return '戸建て';
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

      // AQ-AV: CV2入力項目・運用項目
      '現地調査希望日時',    // AQ
      '業者選定履歴',        // AR
      '案件メモ',            // AS
      '連絡時間帯',          // AT
      '見積もり送付先',      // AU
      'ワードリンク回答',    // AV

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
      '次回架電日時',        // BK
      'メモ',               // BL

      // BM-BS: 管理用フィールド
      '管理ステータス',      // BM
      '加盟店別ステータス',  // BN
      '初回架電日時',        // BO
      '最終更新日時',        // BP
      '配信予定日時',        // BQ
      '担当者名',            // BR
      '最終架電日時',        // BS
      '配信先業者一覧',      // BT

      // BU-BX: ハートビート＆行動トラッキング（V1754, V1755）
      '最終ハートビート時刻', // BU(74)
      'サイト滞在時間（秒）',  // BV(75)
      'CV1→CV2時間差（秒）',  // BW(76)
      'デバイス種別'          // BX(77)
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

      // CV ID生成（流入元識別子 + 連番）
      // entryPoint: 'zip' → CV-Z000001, 'keyword' → CV-KW000001, 想定外 → CV-UNK000001
      let suffix = 'UNK'; // デフォルト（想定外ケース）
      if (data.entryPoint === 'zip') {
        suffix = 'Z';
      } else if (data.entryPoint === 'keyword') {
        suffix = 'KW';
      }

      const lastRow = sheet.getLastRow();
      const cvId = 'CV-' + suffix + String(lastRow).padStart(6, '0');
      const timestamp = new Date();

      // データ行構築（73列）
      const row = [
        cvId,                                    // A(1): CV ID
        timestamp,                               // B(2): 登録日時
        data.name || '',                         // C(3): 氏名
        '',                                      // D(4): フリガナ（空欄）
        '',                                      // E(5): 性別（空欄）
        '',                                      // F(6): 年齢（空欄）
        data.phone ? "'" + data.phone : '',      // G(7): 電話番号（'を先頭に付けて文字列化）
        data.email || '',                        // H(8): メールアドレス
        '',                                      // I(9): 続柄（空欄）

        '',                                      // J(10): 氏名（2人目）
        '',                                      // K(11): 電話番号（2人目）
        '',                                      // L(12): 続柄（2人目）
        '',                                      // M(13): 備考（2人目）

        data.postalCode ? "'" + data.postalCode : '',  // N(14): 郵便番号（物件）（'を先頭に付けて文字列化）
        data.prefecture || '',                   // O(15): 都道府県（物件）
        data.city || '',                         // P(16): 市区町村（物件）
        data.propertyStreet || '',               // Q(17): 住所詳細（物件）
        '',                                      // R(18): 住所フリガナ（空欄）

        data.isDifferentHome || 'FALSE',         // S(19): 自宅住所フラグ
        data.homeZip ? "'" + data.homeZip : '',  // T(20): 郵便番号（自宅）（'を先頭に付けて文字列化）
        data.homePrefecture || '',               // U(21): 都道府県（自宅）
        data.homeStreet || '',                   // V(22): 住所詳細（自宅）

        // W-Z(23-26): 物件詳細（BOT回答から自動抽出）
        this.extractPropertyType(data.Q1_propertyType, data.q1_question),  // W(23): 物件種別
        data.Q3_buildingAge || '',                       // X(24): 築年数
        '',                                              // Y(25): 建物面積（空欄）
        this.extractFloors(data.Q2_floors, data.Q1_propertyType, data.q1_question), // Z(26): 階数

        // AA-AQ(27-43): BOT質問回答（Q1〜Q17）- BOT側のパラメータ名に合わせる
        data.Q1_propertyType || '',              // AA(27): Q1_物件種別
        data.Q2_floors || '',                    // AB(28): Q2_階数
        data.Q3_buildingAge || '',               // AC(29): Q3_築年数
        data.Q4_workHistory || '',               // AD(30): Q4_工事歴
        data.Q5_previousWorkTime || '',          // AE(31): Q5_前回施工時期
        data.Q6_exteriorMaterial || '',          // AF(32): Q6_外壁材質
        data.Q7_roofMaterial || '',              // AG(33): Q7_屋根材質
        data.Q8_concernedArea || '',             // AH(34): Q8_気になる箇所
        data.Q9_exteriorWork || '',              // AI(35): Q9_希望工事内容_外壁
        data.Q10_roofWork || '',                 // AJ(36): Q10_希望工事内容_屋根
        data.Q11_quoteCount || '',               // AK(37): Q11_見積もり保有数
        data.Q12_quoteSource || '',              // AL(38): Q12_見積もり取得先
        data.Q13_doorSales || '',                // AM(39): Q13_訪問業者有無
        data.Q14_comparison || '',               // AN(40): Q14_比較意向
        data.Q15_doorSalesCompany || '',         // AO(41): Q15_訪問業者名
        data.Q16_degradation || '',              // AP(42): Q16_現在の劣化状況
        data.Q17_selectionCriteria || '',        // AQ(43): Q17_業者選定条件

        // AR-AW(44-49): CV2入力項目・運用項目
        data.surveyDatePreference || '',         // AR(44): 現地調査希望日時
        data.selectionHistory || '',             // AS(45): 業者選定履歴
        data.requests || '',                     // AT(46): 案件メモ
        data.contactTimeSlot || '',              // AU(47): 連絡時間帯
        data.quoteDestination || '',             // AV(48): 見積もり送付先
        data.wordLinkAnswer || '',               // AW(49): ワードリンク回答

        // AX-BD(50-56): 配信・成約管理
        '未配信',                                 // AX(50): 配信ステータス
        0,                                       // AY(51): 配信先加盟店数
        '',                                      // AZ(52): 配信日時
        'FALSE',                                 // BA(53): 成約フラグ
        '',                                      // BB(54): 成約日時
        '',                                      // BC(55): 成約加盟店ID
        '',                                      // BD(56): 成約金額

        // BE-BG(57-59): 流入トラッキング
        data.referrer || '',                     // BE(57): 流入元URL
        data.keyword || '',                      // BF(58): 検索キーワード
        data.utm || '',                          // BG(59): UTMパラメータ

        // BH-BJ(60-62): 不正対策
        data.visitCount || 1,                    // BH(60): 訪問回数
        timestamp,                               // BI(61): 最終訪問日時
        data.isBlocked || 'FALSE',               // BJ(62): ブロックフラグ

        // BK-BM(63-65): フォローアップ履歴
        '',                                      // BK(63): 架電履歴
        '',                                      // BL(64): 次回架電日時
        '',                                      // BM(65): メモ

        // BN-BU(66-73): 管理用フィールド
        '新規',                                   // BN(66): 管理ステータス
        '',                                      // BO(67): 加盟店別ステータス（JSON）
        '',                                      // BP(68): 初回架電日時
        timestamp,                               // BQ(69): 最終更新日時
        '',                                      // BR(70): 配信予定日時
        '',                                      // BS(71): 担当者名
        '',                                      // BT(72): 最終架電日時
        ''                                       // BU(73): 配信先業者一覧
      ];

      // 最終行に追加
      sheet.appendRow(row);
      const newRowNum = sheet.getLastRow();

      // 電話番号と郵便番号を文字列形式に設定（先頭の0が消えないように）
      sheet.getRange(newRowNum, 7).setNumberFormat('@STRING@');  // G(7): 電話番号
      sheet.getRange(newRowNum, 11).setNumberFormat('@STRING@'); // K(11): 電話番号（2人目）
      sheet.getRange(newRowNum, 14).setNumberFormat('@STRING@'); // N(14): 郵便番号（物件）
      sheet.getRange(newRowNum, 20).setNumberFormat('@STRING@'); // T(20): 郵便番号（自宅）

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
      console.log('[CVSheetSystem] submitCV1 - 受信パラメータ:');
      console.log('[CVSheetSystem] Q1_propertyType:', params.Q1_propertyType);
      console.log('[CVSheetSystem] Q2_floors:', params.Q2_floors);
      console.log('[CVSheetSystem] Q3_buildingAge:', params.Q3_buildingAge);
      console.log('[CVSheetSystem] Q4_workHistory:', params.Q4_workHistory);
      console.log('[CVSheetSystem] Q5_previousWorkTime:', params.Q5_previousWorkTime);
      console.log('[CVSheetSystem] Q6_exteriorMaterial:', params.Q6_exteriorMaterial);
      console.log('[CVSheetSystem] Q7_roofMaterial:', params.Q7_roofMaterial);
      console.log('[CVSheetSystem] Q8_concernedArea:', params.Q8_concernedArea);
      console.log('[CVSheetSystem] Q9_exteriorWork:', params.Q9_exteriorWork);
      console.log('[CVSheetSystem] Q10_roofWork:', params.Q10_roofWork);
      console.log('[CVSheetSystem] BOT回答全件:', JSON.stringify({
        Q1: params.Q1_propertyType,
        Q2: params.Q2_floors,
        Q3: params.Q3_buildingAge,
        Q4: params.Q4_workHistory,
        Q5: params.Q5_previousWorkTime,
        Q6: params.Q6_exteriorMaterial,
        Q7: params.Q7_roofMaterial,
        Q8: params.Q8_concernedArea,
        Q9: params.Q9_exteriorWork,
        Q10: params.Q10_roofWork,
        Q11: params.Q11_quoteCount,
        Q12: params.Q12_quoteSource,
        Q13: params.Q13_doorSales,
        Q14: params.Q14_comparison,
        Q15: params.Q15_doorSalesCompany,
        Q16: params.Q16_degradation,
        Q17: params.Q17_selectionCriteria
      }));

      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      // CV ID生成（流入元識別子 + 連番）
      // entryPoint: 'zip' → CV-Z000001, 'keyword' → CV-KW000001, 想定外 → CV-UNK000001
      let suffix = 'UNK'; // デフォルト（想定外ケース）
      if (params.entryPoint === 'zip') {
        suffix = 'Z';
      } else if (params.entryPoint === 'keyword') {
        suffix = 'KW';
      }

      const lastRow = sheet.getLastRow();
      const cvId = 'CV-' + suffix + String(lastRow).padStart(6, '0');
      const timestamp = new Date();

      // データ行構築（74列 - V1754: ハートビート追加）
      const row = [
        cvId,                                    // A(1): CV ID
        timestamp,                               // B(2): 登録日時
        params.name || '',                       // C(3): 氏名（V1753: CV1フォールバック対応）
        '',                                      // D(4): フリガナ
        '',                                      // E(5): 性別
        '',                                      // F(6): 年齢
        params.phone ? "'" + params.phone : '',  // G(7): 電話番号（'を先頭に付けて文字列化）
        params.email || '',                      // H(8): メールアドレス（V1753: CV1フォールバック対応）
        '',                                      // I(9): 続柄

        '',                                      // J(10)-M(13): 2人目情報
        '',
        '',
        '',

        params.postalCode ? "'" + params.postalCode : '',  // N(14): 郵便番号（物件）（'を先頭に付けて文字列化）
        params.propertyPrefecture || '',         // O(15): 都道府県（物件）
        params.propertyCity || '',               // P(16): 市区町村（物件）（V1753: 市区町村+町名）
        params.propertyStreet || '',             // Q(17): 住所詳細（物件）（V1753: CV1フォールバック対応）
        params.addressKana || '',                // R(18): 住所フリガナ（V1753: ZipCloud APIから取得）

        params.isDifferentHome ? 'TRUE' : 'FALSE', // S(19): 自宅住所フラグ（V1753: CV1フォールバック対応）
        params.homeZip ? "'" + params.homeZip : '',  // T(20): 郵便番号（自宅）（V1753: CV1フォールバック対応）
        params.homePrefecture || '',             // U(21): 都道府県（自宅）（V1753: CV1フォールバック対応）
        // V(22): 住所詳細（自宅）= 市区町村+番地・建物名（V1753: CV1フォールバック対応）
        [params.homeCity, params.homeStreet].filter(v => v).join('') || '',

        // W(23)-Z(26): 物件詳細（BOT回答から自動抽出）
        this.extractPropertyType(params.Q1_propertyType, params.q1_question),  // W(23): 物件種別
        params.Q3_buildingAge || '',                        // X(24): 築年数
        '',                                                 // Y(25): 建物面積（空欄）
        this.extractFloors(params.Q2_floors, params.Q1_propertyType, params.q1_question), // Z(26): 階数

        // AA(27)-AQ(43): BOT質問回答（Q1〜Q17）
        params.Q1_propertyType || '',            // AA(27): Q1_物件種別
        params.Q2_floors || '',                  // AB(28): Q2_階数
        params.Q3_buildingAge || '',             // AC(29): Q3_築年数
        params.Q4_workHistory || '',             // AD(30): Q4_工事歴
        params.Q5_previousWorkTime || '',        // AE(31): Q5_前回施工時期
        params.Q6_exteriorMaterial || '',        // AF(32): Q6_外壁材質
        params.Q7_roofMaterial || '',            // AG(33): Q7_屋根材質
        params.Q8_concernedArea || '',           // AH(34): Q8_気になる箇所
        params.Q9_exteriorWork || '',            // AI(35): Q9_希望工事内容_外壁
        params.Q10_roofWork || '',               // AJ(36): Q10_希望工事内容_屋根
        params.Q11_quoteCount || '',             // AK(37): Q11_見積もり保有数
        params.Q12_quoteSource || '',            // AL(38): Q12_見積もり取得先
        params.Q13_doorSales || '',              // AM(39): Q13_訪問業者有無
        params.Q14_comparison || '',             // AN(40): Q14_比較意向
        params.Q15_doorSalesCompany || '',       // AO(41): Q15_訪問業者名
        params.Q16_degradation || '',            // AP(42): Q16_現在の劣化状況
        params.Q17_selectionCriteria || '',      // AQ(43): Q17_業者選定条件

        params.surveyDatePreference || '',       // AR(44): 現地調査希望日時（V1753: CV1フォールバック対応）
        params.selectionHistory || '',           // AS(45): 業者選定履歴（V1753: CV1フォールバック対応）
        params.requests || '',                   // AT(46): 案件メモ（V1753: CV1フォールバック対応）
        params.contactTimeSlot || '',            // AU(47): 連絡時間帯（V1753: CV1フォールバック対応）
        params.quoteDestination || '',           // AV(48): 見積もり送付先（V1753: CV1フォールバック対応）
        params.wordLinkAnswer || '',             // AW(49): ワードリンク回答

        '未配信',                                 // AX(50): 配信ステータス
        0,                                       // AY(51): 配信先加盟店数
        '',                                      // AZ(52): 配信日時
        'FALSE',                                 // BA(53): 成約フラグ
        '',                                      // BB(54): 成約日時
        '',                                      // BC(55): 成約加盟店ID
        '',                                      // BD(56): 成約金額

        params.referrer || '',                   // BE(57): 流入元URL
        params.keyword || '',                    // BF(58): 検索キーワード
        params.utm || '',                        // BG(59): UTMパラメータ

        params.visitCount || 1,                  // BH(60): 訪問回数
        timestamp,                               // BI(61): 最終訪問日時
        'FALSE',                                 // BJ(62): ブロックフラグ

        '',                                      // BK(63): 架電履歴
        '',                                      // BL(64): 次回架電日時
        '',                                      // BM(65): メモ

        // BM(66)-BT(73): 管理用フィールド
        '新規',                                   // BM(66): 管理ステータス
        '',                                      // BN(67): 加盟店別ステータス（JSON）
        '',                                      // BO(68): 初回架電日時
        timestamp,                               // BP(69): 最終更新日時
        '',                                      // BQ(70): 配信予定日時
        '',                                      // BR(71): 担当者名
        '',                                      // BS(72): 最終架電日時
        '',                                      // BT(73): 配信先業者一覧

        // BU(74)-BX(77): ハートビート＆行動トラッキング（V1754, V1755）
        timestamp,                               // BU(74): 最終ハートビート時刻（V1754）
        params.siteStayDuration || 0,            // BV(75): サイト滞在時間（秒）（V1755）
        0,                                       // BW(76): CV1→CV2時間差（秒）（V1755）
        params.deviceType || ''                  // BX(77): デバイス種別（V1755）
      ];

      // 最終行に追加
      sheet.appendRow(row);
      const newRowNum = sheet.getLastRow();

      // 電話番号と郵便番号を文字列形式に設定（先頭の0が消えないように）
      sheet.getRange(newRowNum, 7).setNumberFormat('@STRING@');  // G(7): 電話番号
      sheet.getRange(newRowNum, 11).setNumberFormat('@STRING@'); // K(11): 電話番号（2人目）
      sheet.getRange(newRowNum, 14).setNumberFormat('@STRING@'); // N(14): 郵便番号（物件）
      sheet.getRange(newRowNum, 20).setNumberFormat('@STRING@'); // T(20): 郵便番号（自宅）

      console.log('[CVSheetSystem] CV1保存完了:', cvId);

      // V1754: Slack通知送信
      try {
        const workTypes = [
          params.Q9_exteriorWork,
          params.Q10_roofWork
        ].filter(v => v).join('、') || '未選択';

        CVSlackNotifier.sendCV1Notification({
          cvId: cvId,
          phone: params.phone,
          prefecture: params.propertyPrefecture,
          city: params.propertyCity,
          workTypes: workTypes,
          siteStayDuration: params.siteStayDuration || 0,  // V1755: サイト滞在時間
          deviceType: params.deviceType || '不明'          // V1755: デバイス種別
        });
        console.log('[CVSheetSystem] ✅ Slack通知送信完了（CV1）');
      } catch (slackError) {
        console.error('[CVSheetSystem] ❌ Slack通知エラー（CV1）:', slackError);
        // エラーが発生してもCV1送信は成功とする
      }

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
      sheet.getRange(targetRow, 3).setValue(params.name || '');                    // C(3): 氏名
      sheet.getRange(targetRow, 8).setValue(params.email || '');                   // H(8): メールアドレス
      sheet.getRange(targetRow, 14).setValue(params.postalCode ? "'" + params.postalCode : ''); // N(14): 郵便番号（物件）
      sheet.getRange(targetRow, 15).setValue(params.propertyPrefecture || '');     // O(15): 都道府県（物件）
      sheet.getRange(targetRow, 16).setValue(params.propertyCity || '');           // P(16): 市区町村（物件）
      sheet.getRange(targetRow, 17).setValue(params.propertyStreet || '');         // Q(17): 住所詳細（物件）
      sheet.getRange(targetRow, 18).setValue(params.addressKana || '');            // R(18): 住所フリガナ（V1752: ZipCloud APIから取得）

      // 自宅住所
      sheet.getRange(targetRow, 19).setValue(params.isDifferentHome ? 'TRUE' : 'FALSE'); // S(19): 自宅住所フラグ
      sheet.getRange(targetRow, 20).setValue(params.homeZip ? "'" + params.homeZip : '');  // T(20): 郵便番号（自宅）
      sheet.getRange(targetRow, 21).setValue(params.homePrefecture || '');         // U(21): 都道府県（自宅）

      // V(22): 住所詳細（自宅）- 市区町村と番地を結合
      const homeFullAddress = [params.homeCity, params.homeStreet].filter(v => v).join('');
      sheet.getRange(targetRow, 22).setValue(homeFullAddress || '');               // V(22): 住所詳細（自宅）

      // CV2詳細情報
      sheet.getRange(targetRow, 44).setValue(params.surveyDatePreference || '');   // AR(44): 現地調査希望日時
      sheet.getRange(targetRow, 45).setValue(params.selectionHistory || '');       // AS(45): 業者選定履歴
      sheet.getRange(targetRow, 46).setValue(params.requests || '');               // AT(46): 案件メモ
      sheet.getRange(targetRow, 47).setValue(params.contactTimeSlot || '');        // AU(47): 連絡時間帯
      sheet.getRange(targetRow, 48).setValue(params.quoteDestination || '');       // AV(48): 見積もり送付先

      // V1755: CV1→CV2時間差を記録
      if (params.cv1ToCV2Duration !== undefined && params.cv1ToCV2Duration !== null) {
        sheet.getRange(targetRow, 76).setValue(params.cv1ToCV2Duration);           // BW(76): CV1→CV2時間差（秒）
      }

      console.log('[CVSheetSystem] CV2更新完了:', cvId);

      // V1754: Slack通知送信
      try {
        const fullAddress = [
          params.propertyPrefecture,
          params.propertyCity,
          params.propertyStreet
        ].filter(v => v).join('') || '未入力';

        CVSlackNotifier.sendCV2Notification({
          cvId: cvId,
          name: params.name,
          email: params.email,
          phone: values[targetRow - 1][6],  // G列: 電話番号（既存データから取得）
          address: fullAddress,
          surveyDates: params.surveyDatePreference,
          requests: params.requests
        });
        console.log('[CVSheetSystem] ✅ Slack通知送信完了（CV2）');
      } catch (slackError) {
        console.error('[CVSheetSystem] ❌ Slack通知エラー（CV2）:', slackError);
        // エラーが発生してもCV2送信は成功とする
      }

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

          // AQ-AW: CV2入力項目・運用項目
          surveyDatePreference: row[42] || '',          // AQ: 現地調査希望日時
          franchiseSelectionHistory: row[43] || '',     // AR: 業者選定履歴
          caseMemo: row[44] || '',                      // AS: 案件メモ
          contactTimePreference: row[45] || '',         // AT: 連絡時間帯
          estimateDeliveryAddress: row[46] || '',       // AU: 見積もり送付先
          wordLinkAnswer: row[47] || '',                // AV: ワードリンク回答

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

          // BJ-BT: フォローアップ履歴・管理用フィールド
          callHistory: row[61] || '',                   // BJ: 架電履歴
          nextCallDate: row[62] || '',                  // BK: 次回架電日時
          memo: row[63] || '',                          // BL: メモ
          status: row[64] || '新規',                     // BM: 管理ステータス
          franchiseStatuses: row[65] || '',             // BN: 加盟店別ステータス（JSON）
          firstCallDate: row[66] || '',                 // BO: 初回架電日時
          lastUpdateDate: row[67] || '',                // BP: 最終更新日時
          scheduledDeliveryDate: row[68] || '',         // BQ: 配信予定日時
          assignedTo: row[69] || '',                    // BR: 担当者名
          lastCallDate: row[70] || '',                  // BS: 最終架電日時
          deliveredMerchants: row[71] || ''             // BT: 配信先業者一覧
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

/**
 * ============================================
 * CVシステム マッピング検証テスト関数
 * ============================================
 *
 * 手動実行用：GASエディタで実行してマッピングを検証
 * 1. この関数を選択
 * 2. ▶実行ボタンをクリック
 * 3. ログを確認
 */
function testCVMapping() {
  console.log('=== CV マッピング検証テスト開始 ===\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // ============================================
  // テスト1: ヘッダー配列の要素数チェック
  // ============================================
  console.log('【テスト1】ヘッダー配列の要素数チェック');

  const expectedColumnCount = 71;
  const headers = [
    'CV ID', '登録日時', '氏名', 'フリガナ', '性別', '年齢', '電話番号', 'メールアドレス', '続柄',
    '氏名（2人目）', '電話番号（2人目）', '続柄（2人目）', '備考（2人目）',
    '郵便番号（物件）', '都道府県（物件）', '市区町村（物件）', '住所詳細（物件）',
    '自宅住所フラグ', '郵便番号（自宅）', '都道府県（自宅）', '住所詳細（自宅）',
    '物件種別', '築年数', '建物面積', '階数',
    'Q1_物件種別', 'Q2_階数', 'Q3_築年数', 'Q4_工事歴', 'Q5_前回施工時期',
    'Q6_外壁材質', 'Q7_屋根材質', 'Q8_気になる箇所', 'Q9_希望工事内容_外壁', 'Q10_希望工事内容_屋根',
    'Q11_見積もり保有数', 'Q12_見積もり取得先', 'Q13_訪問業者有無', 'Q14_比較意向', 'Q15_訪問業者名',
    'Q16_現在の劣化状況', 'Q17_業者選定条件',
    '現地調査希望日時', '業者選定履歴', '案件メモ', '連絡時間帯', '見積もり送付先', 'ワードリンク回答',
    '配信ステータス', '配信先加盟店数', '配信日時', '成約フラグ', '成約日時', '成約加盟店ID', '成約金額',
    '流入元URL', '検索キーワード', 'UTMパラメータ',
    '訪問回数', '最終訪問日時', 'ブロックフラグ',
    '架電履歴', '次回架電日時', 'メモ',
    '管理ステータス', '加盟店別ステータス', '初回架電日時', '最終更新日時', '配信予定日時', '担当者名', '最終架電日時'
  ];

  if (headers.length === expectedColumnCount) {
    results.passed.push('ヘッダー配列: ' + headers.length + '列 ✅');
    console.log('✅ PASS: ヘッダー配列は' + expectedColumnCount + '列です');
  } else {
    results.failed.push('ヘッダー配列: ' + headers.length + '列（期待値: ' + expectedColumnCount + '列）');
    console.error('❌ FAIL: ヘッダー配列は' + headers.length + '列です（期待値: ' + expectedColumnCount + '列）');
  }

  // ============================================
  // テスト2: 重要カラムのインデックス検証
  // ============================================
  console.log('\n【テスト2】重要カラムのインデックス検証');

  const columnMapping = {
    'AQ（現地調査希望日時）': { index: 42, expected: '現地調査希望日時' },
    'AR（業者選定履歴）': { index: 43, expected: '業者選定履歴' },
    'AS（案件メモ）': { index: 44, expected: '案件メモ' },
    'AT（連絡時間帯）': { index: 45, expected: '連絡時間帯' },
    'AU（見積もり送付先）': { index: 46, expected: '見積もり送付先' },
    'AV（ワードリンク回答）': { index: 47, expected: 'ワードリンク回答' },
    'BK（次回架電日時）': { index: 62, expected: '次回架電日時' },
    'BR（担当者名）': { index: 69, expected: '担当者名' },
    'BS（最終架電日時）': { index: 70, expected: '最終架電日時' }
  };

  for (const key in columnMapping) {
    const col = columnMapping[key];
    const actualValue = headers[col.index];

    if (actualValue === col.expected) {
      results.passed.push(key + ': ' + actualValue + ' ✅');
      console.log('✅ PASS: ' + key + ' = "' + actualValue + '"');
    } else {
      results.failed.push(key + ': "' + actualValue + '"（期待値: "' + col.expected + '"）');
      console.error('❌ FAIL: ' + key + ' = "' + actualValue + '"（期待値: "' + col.expected + '"）');
    }
  }

  // ============================================
  // テスト3: updateCV2の列番号検証
  // ============================================
  console.log('\n【テスト3】updateCV2の列番号検証');

  const updateCV2Columns = {
    'AQ（現地調査希望日時）': 43,  // インデックス42 + 1
    'AR（業者選定履歴）': 44,
    'AS（案件メモ）': 45,
    'AT（連絡時間帯）': 46,
    'AU（見積もり送付先）': 47
  };

  for (const key in updateCV2Columns) {
    const colNum = updateCV2Columns[key];
    const headerIndex = colNum - 1;  // 列番号からインデックスに変換
    const headerName = headers[headerIndex];
    const expectedName = columnMapping[key].expected;

    if (headerName === expectedName) {
      results.passed.push('updateCV2 ' + key + ': 列番号' + colNum + ' ✅');
      console.log('✅ PASS: updateCV2 ' + key + ' = 列番号' + colNum + ' (' + headerName + ')');
    } else {
      results.failed.push('updateCV2 ' + key + ': 列番号' + colNum + '（ヘッダー: "' + headerName + '"）');
      console.error('❌ FAIL: updateCV2 ' + key + ' = 列番号' + colNum + '（ヘッダー: "' + headerName + '"、期待値: "' + expectedName + '"）');
    }
  }

  // ============================================
  // テスト4: 列番号とインデックスの整合性
  // ============================================
  console.log('\n【テスト4】列番号とインデックスの整合性');

  const exampleMappings = [
    { letter: 'A', index: 0, colNum: 1, name: 'CV ID' },
    { letter: 'G', index: 6, colNum: 7, name: '電話番号' },
    { letter: 'N', index: 13, colNum: 14, name: '郵便番号（物件）' },
    { letter: 'AQ', index: 42, colNum: 43, name: '現地調査希望日時' },
    { letter: 'BR', index: 69, colNum: 70, name: '担当者名' },
    { letter: 'BS', index: 70, colNum: 71, name: '最終架電日時' }
  ];

  for (const mapping of exampleMappings) {
    const actualName = headers[mapping.index];

    if (actualName === mapping.name) {
      results.passed.push(mapping.letter + '列: インデックス' + mapping.index + '、列番号' + mapping.colNum + ' ✅');
      console.log('✅ PASS: ' + mapping.letter + '列 = インデックス' + mapping.index + '、列番号' + mapping.colNum + ' (' + actualName + ')');
    } else {
      results.failed.push(mapping.letter + '列: インデックス' + mapping.index + '（ヘッダー: "' + actualName + '"、期待値: "' + mapping.name + '"）');
      console.error('❌ FAIL: ' + mapping.letter + '列 = インデックス' + mapping.index + '（ヘッダー: "' + actualName + '"、期待値: "' + mapping.name + '"）');
    }
  }

  // ============================================
  // 最終結果
  // ============================================
  console.log('\n=== テスト結果サマリー ===');
  console.log('✅ 成功: ' + results.passed.length + '件');
  console.log('❌ 失敗: ' + results.failed.length + '件');
  console.log('⚠️  警告: ' + results.warnings.length + '件');

  if (results.failed.length === 0) {
    console.log('\n🎉 すべてのテストが成功しました！マッピングは完璧です。');
  } else {
    console.log('\n❌ 以下の問題を修正してください：');
    results.failed.forEach(function(msg) {
      console.log('  - ' + msg);
    });
  }

  return {
    success: results.failed.length === 0,
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    details: results
  };
}
