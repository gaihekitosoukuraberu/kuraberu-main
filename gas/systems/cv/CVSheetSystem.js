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
   * PropertiesServiceから取得、フォールバック付き
   */
  getSpreadsheetId() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      // フォールバック: デフォルト値
      console.log('[CVSheetSystem] SPREADSHEET_IDプロパティが見つかりません。デフォルト値を使用します。');
      return '1eHAUiuDbTdv9WC-RfpMUdp9HGlaqd1C7MHtgntKbSIU';
    }

    return spreadsheetId;
  },

  /**
   * Q1（物件種別）からV列用の値を抽出
   * V列の最終選択肢: 戸建て、アパート・マンション、店舗・事務所、工場・倉庫、その他
   *
   * BOTの選択肢とマッピング:
   * - 「2階建て以外の自宅」→「戸建て」
   * - 「実家・別荘・所有物件」→「戸建て」（戸建てと同じ扱い）
   * - 「アパート・マンション」→「アパート・マンション」
   * - 「店舗・事務所」→「店舗・事務所」
   * - 「工場・倉庫」→「工場・倉庫」
   * - 「その他」→「その他」
   *
   * 例: 「はい」(Q001の質問が「戸建て2階建てのご自宅ですか？」) → 「戸建て」
   * 例: 「戸建て2階建て」→「戸建て」
   * 例: 「アパート・マンション」→「アパート・マンション」
   * 例: 「2階建て以外の自宅」→「戸建て」
   * 例: 「実家・別荘・所有物件」→「戸建て」
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
   * V1902: 工事項目を正式名称に正規化 + 重複排除
   * Q9（外壁工事）とQ10（屋根工事）を個別に受け取り、正式名称に変換
   *
   * @param {string} q9ExteriorWork - Q9_希望工事内容_外壁（例：塗装、カバー工法）
   * @param {string} q10RoofWork - Q10_希望工事内容_屋根（例：塗装、葺き替え）
   * @param {string} wallMaterial - Q6_外壁材質（例：サイディング、モルタル）
   * @param {string} roofMaterial - Q7_屋根材質（例：スレート、瓦、ガルバリウム）
   * @return {string} 正規化された工事項目（、区切り）
   *
   * 【正式名称15種類】
   * 外壁塗装, 外壁カバー工法, 外壁張替え, 屋根塗装, 屋上防水,
   * 屋根葺き替え（スレート）, 屋根葺き替え（瓦）, 屋根カバー工法,
   * 外壁補修, 屋根補修, 外壁不明, 屋根不明, ベランダ防水,
   * 内装水回り, 内装（床・クロス等）
   */
  normalizeWorkItems(q9ExteriorWork, q10RoofWork, wallMaterial, roofMaterial) {
    const normalized = new Set();

    /**
     * 単一の工事項目を正式名称に変換するヘルパー関数
     * @param {string} item - 工事項目
     * @param {string} partType - 'exterior'（外壁）または 'roof'（屋根）
     */
    const normalizeItem = (item, partType) => {
      if (!item) return;

      const trimmed = item.trim();
      if (!trimmed) return;

      // 塗装
      if (trimmed.includes('塗装')) {
        if (partType === 'exterior' || trimmed.includes('外壁')) {
          normalized.add('外壁塗装');
        }
        if (partType === 'roof' || trimmed.includes('屋根')) {
          normalized.add('屋根塗装');
        }
        // 部位指定なし＋partType指定なしの場合は両方
        if (!trimmed.includes('外壁') && !trimmed.includes('屋根') && !partType) {
          normalized.add('外壁塗装');
          normalized.add('屋根塗装');
        }
        return;
      }

      // カバー工法
      if (trimmed.includes('カバー')) {
        if (partType === 'exterior' || trimmed.includes('外壁')) {
          normalized.add('外壁カバー工法');
        }
        if (partType === 'roof' || trimmed.includes('屋根')) {
          normalized.add('屋根カバー工法');
        }
        return;
      }

      // 張替え（外壁のみ）
      if (trimmed.includes('張替') || trimmed.includes('張り替え')) {
        normalized.add('外壁張替え');
        return;
      }

      // 葺き替え（屋根のみ - 材質により判定）
      if (trimmed.includes('葺き替え') || trimmed.includes('ふき替え')) {
        // 瓦
        if (roofMaterial && roofMaterial.includes('瓦')) {
          normalized.add('屋根葺き替え（瓦）');
        }
        // スレート・コロニアル
        else if (roofMaterial && (roofMaterial.includes('スレート') || roofMaterial.includes('コロニアル'))) {
          normalized.add('屋根葺き替え（スレート）');
        }
        // ガルバリウム・トタン・金属系 → スレートと同じ扱い
        else if (roofMaterial && (roofMaterial.includes('ガルバ') || roofMaterial.includes('トタン') || roofMaterial.includes('金属'))) {
          normalized.add('屋根葺き替え（スレート）');
        }
        // 屋上・陸屋根 → 屋上防水が適切
        else if (roofMaterial && (roofMaterial.includes('屋上') || roofMaterial.includes('陸屋根'))) {
          normalized.add('屋上防水');
        }
        // 材質不明の場合はスレートをデフォルト
        else {
          normalized.add('屋根葺き替え（スレート）');
        }
        return;
      }

      // 防水
      if (trimmed.includes('防水')) {
        if (trimmed.includes('屋上')) {
          normalized.add('屋上防水');
        } else if (trimmed.includes('ベランダ') || trimmed.includes('バルコニー')) {
          normalized.add('ベランダ防水');
        } else {
          // Q7が屋上の場合は屋上防水、それ以外はベランダ防水
          if (roofMaterial && roofMaterial.includes('屋上')) {
            normalized.add('屋上防水');
          } else {
            normalized.add('ベランダ防水');
          }
        }
        return;
      }

      // 補修
      if (trimmed.includes('補修')) {
        if (partType === 'exterior' || trimmed.includes('外壁')) {
          normalized.add('外壁補修');
        }
        if (partType === 'roof' || trimmed.includes('屋根')) {
          normalized.add('屋根補修');
        }
        return;
      }

      // 不明
      if (trimmed.includes('不明') || trimmed.includes('わからない')) {
        if (partType === 'exterior' || trimmed.includes('外壁')) {
          normalized.add('外壁不明');
        }
        if (partType === 'roof' || trimmed.includes('屋根')) {
          normalized.add('屋根不明');
        }
        return;
      }

      // 内装水回り
      if (trimmed.includes('内装') && (trimmed.includes('水回り') || trimmed.includes('水まわり'))) {
        normalized.add('内装水回り');
        return;
      }
      if (trimmed.includes('水回り') || trimmed.includes('水まわり')) {
        normalized.add('内装水回り');
        return;
      }

      // 内装（床・クロス等）
      if (trimmed.includes('内装') || trimmed.includes('床') || trimmed.includes('クロス')) {
        normalized.add('内装（床・クロス等）');
        return;
      }
    };

    // Q9（外壁工事）を処理
    if (q9ExteriorWork) {
      const exteriorItems = q9ExteriorWork.split(/[,、]/).map(s => s.trim()).filter(s => s);
      exteriorItems.forEach(item => normalizeItem(item, 'exterior'));
    }

    // Q10（屋根工事）を処理
    if (q10RoofWork) {
      const roofItems = q10RoofWork.split(/[,、]/).map(s => s.trim()).filter(s => s);
      roofItems.forEach(item => normalizeItem(item, 'roof'));
    }

    // Setを配列に変換し、「、」で結合
    return Array.from(normalized).join('、');
  },

  /**
   * V1900: 住所からGoogle Mapsリンクを生成
   * @param {string} address - 完全な住所
   * @return {string} Google Mapsリンク
   */
  generateGoogleMapsLink(address) {
    if (!address) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
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
      '最終ハートビート時刻', // BU (74)
      'サイト滞在時間',       // BV (75)
      'CV1→CV2時間差',       // BW (76)
      'デバイス種別',         // BX (77)

      // BY-CF: V1902 CSVヘッダー準拠84列
      '見積もり希望箇所',      // BY (78)
      '施工時期',             // BZ (79)
      '希望社数',             // CA (80)
      '立ち会い可否',         // CB (81)
      '立ち会い者関係性',      // CC (82)
      '特殊項目',             // CD (83)
      'Google Mapsリンク'      // CE (84)
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

    console.log('[CVSheetSystem] ユーザー登録シート作成完了 (84列: A-CE, V1902 CSVヘッダー準拠)');
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
        params.name || '未入力',                  // C(3): 氏名（デフォルト値設定）
        params.nameKana || '',                   // D(4): フリガナ
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

        params.surveyDatePreference || '未定',    // AR(44): 現地調査希望日時（デフォルト値）
        params.selectionHistory || this.generateSelectionHistory(params), // AS(45): 業者選定履歴（自動生成）
        params.requests || this.generateCaseMemo(params),  // AT(46): 案件メモ（自動生成）
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
        params.deviceType || '',                 // 77列目: デバイス種別（index 76）

        // 78列目〜84列目: V1902 CSVヘッダー準拠（84列構成）
        // 78列目: 見積もり希望箇所 - V1902: Q9(外壁)+Q10(屋根)から正式名称に正規化
        this.normalizeWorkItems(
          params.Q9_exteriorWork || '',          // Q9_希望工事内容_外壁
          params.Q10_roofWork || '',             // Q10_希望工事内容_屋根
          params.Q6_exteriorMaterial || '',      // Q6_外壁材質
          params.Q7_roofMaterial || ''           // Q7_屋根材質
        ),
        params.constructionTiming || '',         // 79列目: 施工時期（index 78）
        params.companiesCount || '',             // 80列目: 希望社数（index 79）
        params.surveyAttendance || '',           // 81列目: 立ち会い可否（index 80）
        params.attendanceRelation || '',         // 82列目: 立ち会い者関係性（index 81）
        params.specialItems || '',               // 83列目: 特殊項目（index 82）
        // 84列目: Google Mapsリンク - V1902: 住所から生成
        this.generateGoogleMapsLink(
          [params.propertyPrefecture, params.propertyCity, params.propertyStreet].filter(v => v).join('')
        )
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

      // V1902: 選択業者数を80列目（希望社数）に保存
      if (params.selectionHistory) {
        const companies = params.selectionHistory.split(',').map(s => s.trim()).filter(s => s);
        const companyCount = companies.length;
        sheet.getRange(targetRow, 80).setValue(companyCount);                      // 80列目: 希望社数
        console.log('[CVSheetSystem] V1902: 選択業者数を80列目（希望社数）に保存:', companyCount);
      }

      // V1991: Google Mapsリンクを生成して84列目に保存（短縮URL使用）
      const fullAddress = [
        params.propertyPrefecture,
        params.propertyCity,
        params.propertyStreet
      ].filter(v => v).join('');
      if (fullAddress) {
        const longUrl = this.generateGoogleMapsLink(fullAddress);
        // V1991: UrlShortenerで短縮（失敗時は元URLをそのまま使用）
        let googleMapsLink = longUrl;
        try {
          const shortResult = UrlShortener.shortenUrl({ url: longUrl });
          if (shortResult.success && shortResult.shortUrl) {
            googleMapsLink = shortResult.shortUrl;
            console.log('[CVSheetSystem] V1991: 短縮URL生成成功:', googleMapsLink);
          }
        } catch (shortErr) {
          console.warn('[CVSheetSystem] V1991: URL短縮失敗、元URLを使用:', shortErr);
        }
        sheet.getRange(targetRow, 84).setValue(googleMapsLink);                    // 84列目: Google Mapsリンク
        console.log('[CVSheetSystem] V1991: Google Mapsリンクを保存:', googleMapsLink);
      }

      console.log('[CVSheetSystem] CV2更新完了:', cvId);

      // V1754: Slack通知送信
      try {
        CVSlackNotifier.sendCV2Notification({
          cvId: cvId,
          name: params.name,
          email: params.email,
          phone: values[targetRow - 1][6],  // G列: 電話番号（既存データから取得）
          address: fullAddress || '未入力',
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

      // 配信管理シートから転送数をカウント
      const transferCountMap = {};
      const deliverySheet = ss.getSheetByName('配信管理');
      if (deliverySheet) {
        const deliveryData = deliverySheet.getDataRange().getValues();
        const deliveryRows = deliveryData.slice(1); // ヘッダー除く
        deliveryRows.forEach(row => {
          const cvId = row[1]; // 2列目: CV ID
          const status = row[5]; // 6列目: 配信ステータス
          if (cvId && status === '配信済み') {
            transferCountMap[cvId] = (transferCountMap[cvId] || 0) + 1;
          }
        });
        console.log('[CVSheetSystem] 配信管理シートから転送数集計完了');
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

        // デバッグ: CV-KW000138の生データをログ出力
        if (row[0] === 'CV-KW000138') {
          console.log('[getAllCVs] CV-KW000138 生データ確認:');
          console.log('  workItems (index 77):', row[77]);
          console.log('  specialItems (index 82):', row[82]);
          console.log('  name (index 2):', row[2]);
        }

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
          addressKana: row[17] || '',                   // R: 住所フリガナ（物件）

          // S-V: 自宅住所
          isDifferentHome: row[18] === 'TRUE',          // S: 自宅住所フラグ
          homeAddress: {
            postalCode: row[19] || '',                  // T: 郵便番号（自宅）
            prefecture: row[20] || '',                  // U: 都道府県（自宅）
            street: row[21] || ''                       // V: 住所詳細（自宅）
          },

          // W-Z: 物件詳細（BOT回答から自動抽出される）
          propertyType: row[22] || '',                  // W: 物件種別（index 22）
          buildingAge: row[23] || '',                   // X: 築年数（index 23）
          area: row[24] || '',                          // Y: 建物面積（index 24）
          floors: row[25] || '',                        // Z: 階数（index 25）

          // AA-AQ: BOT質問回答（Q1〜Q17）
          botAnswers: {
            q1_propertyType: row[26] || '',             // AA: Q1_物件種別（index 26）
            q2_floors: row[27] || '',                   // AB: Q2_階数（index 27）
            q3_buildingAge: row[28] || '',              // AC: Q3_築年数（index 28）
            q4_constructionHistory: row[29] || '',      // AD: Q4_工事歴（index 29）
            q5_lastConstructionTime: row[30] || '',     // AE: Q5_前回施工時期（index 30）
            q6_wallMaterial: row[31] || '',             // AF: Q6_外壁材質（index 31）
            q7_roofMaterial: row[32] || '',             // AG: Q7_屋根材質（index 32）
            q8_concernedArea: row[33] || '',            // AH: Q8_気になる箇所（index 33）
            q9_wallWorkType: row[34] || '',             // AI: Q9_希望工事内容_外壁（index 34）
            q10_roofWorkType: row[35] || '',            // AJ: Q10_希望工事内容_屋根（index 35）
            q11_quoteCount: row[36] || '',              // AK: Q11_見積もり保有数（index 36）
            q12_quoteSource: row[37] || '',             // AL: Q12_見積もり取得先（index 37）
            q13_doorSalesVisit: row[38] || '',          // AM: Q13_訪問業者有無（index 38）
            q14_comparisonIntention: row[39] || '',     // AN: Q14_比較意向（index 39）
            q15_doorSalesCompany: row[40] || '',        // AO: Q15_訪問業者名（index 40）
            q16_deteriorationStatus: row[41] || '',     // AP: Q16_現在の劣化状況（index 41）
            q17_selectionCriteria: row[42] || ''        // AQ: Q17_業者選定条件（index 42）
          },

          // AR-AX: CV2入力項目・運用項目
          surveyDatePreference: row[43] || '',          // AR: 現地調査希望日時（index 43）
          franchiseSelectionHistory: row[44] || '',     // AS: 業者選定履歴（index 44）
          caseMemo: row[45] || '',                      // AT: 案件メモ（index 45）
          contactTimePreference: row[46] || '',         // AU: 連絡時間帯（index 46）
          estimateDeliveryAddress: row[47] || '',       // AV: 見積もり送付先（index 47）
          wordLinkAnswer: row[48] || '',                // AW: ワードリンク回答（index 48）

          // AX-BD: 配信・成約管理
          deliveryStatus: row[49] || '',                // AX: 配信ステータス（index 49）
          companiesCount: row[50] || 0,                 // AY: 配信先加盟店数（index 50）
          deliveryDate: row[51] || '',                  // AZ: 配信日時（index 51）
          contractFlag: row[52] === 'TRUE',             // BA: 成約フラグ（index 52）
          contractDate: row[53] || '',                  // BB: 成約日時（index 53）
          contractFranchiseId: row[54] || '',           // BC: 成約加盟店ID（index 54）
          contractAmount: row[55] || '',                // BD: 成約金額（index 55）

          // BE-BG: 流入トラッキング
          referrer: row[56] || '',                      // BE: 流入元URL（index 56）
          searchKeyword: row[57] || '',                 // BF: 検索キーワード（index 57）
          utmParams: row[58] || '',                     // BG: UTMパラメータ（index 58）

          // BH-BJ: 不正対策
          visitCount: row[59] || 0,                     // BH: 訪問回数（index 59）
          lastVisitDate: row[60] || '',                 // BI: 最終訪問日時（index 60）
          isBlocked: row[61] === 'TRUE',                // BJ: ブロックフラグ（index 61）

          // BK-BU: フォローアップ履歴・管理用フィールド
          callHistory: row[62] || '',                   // BK: 架電履歴（index 62）
          nextCallDate: row[63] || '',                  // BL: 次回架電日時（index 63）
          memo: row[64] || '',                          // BM: メモ（index 64）
          status: row[65] || '新規',                     // BN: 管理ステータス（index 65）
          franchiseStatuses: row[66] || '',             // BO: 加盟店別ステータス（JSON）（index 66）
          firstCallDate: row[67] || '',                 // BP: 初回架電日時（index 67）
          lastUpdateDate: row[68] || '',                // BQ: 最終更新日時（index 68）
          scheduledDeliveryDate: row[69] || '',         // BR: 配信予定日時（index 69）
          assignedTo: row[70] || '',                    // BS: 担当者名（index 70）
          lastCallDate: row[71] || '',                  // BT: 最終架電日時（index 71）
          deliveredMerchants: row[72] || '',            // BU: 配信先業者一覧（index 72）

          // BU-BX: ハートビート＆行動トラッキング（V1754, V1755）
          lastHeartbeat: row[73] || '',                 // BU: 最終ハートビート時刻（index 73）
          siteStayDuration: row[74] || 0,               // BV: サイト滞在時間（秒）（index 74）
          cv1ToCV2Duration: row[75] || 0,               // BW: CV1→CV2時間差（秒）（index 75）
          deviceType: row[76] || '',                    // BX: デバイス種別（index 76）

          // 78列目〜84列目: 新規フィールド（CSVヘッダー準拠）
          workItems: row[77] || '',                     // 78列目: 見積もり希望箇所（index 77）
          constructionTiming: row[78] || '',            // 79列目: 施工時期（index 78）
          companiesCountPreference: row[79] || '',     // 80列目: 希望社数（index 79）
          surveyAttendance: row[80] || '',              // 81列目: 立ち会い可否（index 80）
          attendanceRelation: row[81] || '',            // 82列目: 立ち会い者関係性（index 81）
          specialItems: row[82] || '',                  // 83列目: 特殊項目（index 82）
          googleMapsLink: row[83] || '',               // 84列目: Google Mapsリンク（index 83）

          // CG列: 案件メール配信済みフラグ（index 84）
          broadcastSent: row[84] === true || row[84] === 'TRUE',

          // 配信管理シートからの転送数
          transferCount: transferCountMap[row[0]] || 0,

          // V1832: BOT回答カラムを直接フィールドとしても読み込み（空文字列保持のため）
          quoteCount: row[36] || '',                    // AK: Q11_見積もり保有数（index 36）
          quoteSource: row[37] || '',                   // AL: Q12_見積もり取得先（index 37）
          doorSalesVisit: row[38] || '',                // AM: Q13_訪問業者有無（index 38）
          deteriorationStatus: row[41] || '',           // AP: Q16_現在の劣化状況（index 41）
          comparisonIntention: row[39] || '',           // AN: Q14_比較意向（index 39）
          doorSalesCompany: row[40] || '',              // AO: Q15_訪問業者名（index 40）
          selectionCriteria: row[42] || ''              // AQ: Q17_業者選定条件（index 42）
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
   * CVステータス更新（アドミンダッシュボード用）
   * @param {Object} params - { cvId, status, memo }
   * @return {Object} - { success, message }
   */
  updateCVStatus(params) {
    try {
      const { cvId, status, memo } = params;

      if (!cvId || !status) {
        return {
          success: false,
          error: 'cvId と status は必須です'
        };
      }

      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
      }

      // CV IDで行を検索
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      let targetRow = -1;

      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === cvId) { // A列: CV ID
          targetRow = i + 1; // シート行番号（1始まり）
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: `CV ID ${cvId} が見つかりません`
        };
      }

      // BN列(66): 管理ステータスを更新（index 66）
      sheet.getRange(targetRow, 67).setValue(status);

      // BM列(65): メモに追記（index 65）
      if (memo) {
        const currentMemo = sheet.getRange(targetRow, 66).getValue() || '';
        const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
        const newMemo = currentMemo
          ? `${currentMemo}\n[${timestamp}] ${memo}`
          : `[${timestamp}] ${memo}`;
        sheet.getRange(targetRow, 66).setValue(newMemo);
      }

      // BQ列(69): 最終更新日時を更新（index 69）
      const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(targetRow, 70).setValue(now);

      console.log(`[CVSheetSystem] ステータス更新完了: ${cvId} → ${status}`);

      return {
        success: true,
        message: 'ステータス更新完了',
        cvId: cvId,
        newStatus: status
      };

    } catch (error) {
      console.error('[CVSheetSystem] updateCVStatus エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 名前をカタカナに変換（アドミンダッシュボード用）
   * @param {Object} params - { name }
   * @return {Object} - { success, kana }
   */
  convertNameToKana(params) {
    try {
      const { name } = params;

      if (!name) {
        return {
          success: false,
          error: '名前が指定されていません'
        };
      }

      // NameToKanaConverterを使用
      const result = NameToKanaConverter.convertToKana(name);

      return result;

    } catch (error) {
      console.error('[CVSheetSystem] convertNameToKana エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * CV全項目データ更新（アドミンダッシュボード用）
   * @param {Object} params - { cvId, data }
   * @return {Object} - { success, message }
   */
  updateCVData(params) {
    try {
      const { cvId, data } = params;

      if (!cvId) {
        return {
          success: false,
          error: 'cvId は必須です'
        };
      }

      const ssId = this.getSpreadsheetId();
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        throw new Error('ユーザー登録シートが見つかりません');
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
        return {
          success: false,
          error: `CV ID ${cvId} が見つかりません`
        };
      }

      // 各項目を更新（値が存在する場合のみ）
      if (data.name !== undefined) sheet.getRange(targetRow, 3).setValue(data.name); // C列: 氏名
      if (data.nameKana !== undefined) sheet.getRange(targetRow, 4).setValue(data.nameKana); // D列: フリガナ
      if (data.gender !== undefined) sheet.getRange(targetRow, 5).setValue(data.gender); // E列: 性別
      if (data.age !== undefined) sheet.getRange(targetRow, 6).setValue(data.age); // F列: 年齢
      if (data.phone !== undefined) sheet.getRange(targetRow, 7).setValue(data.phone); // G列: 電話番号
      if (data.email !== undefined) sheet.getRange(targetRow, 8).setValue(data.email); // H列: メールアドレス
      if (data.relation !== undefined) sheet.getRange(targetRow, 9).setValue(data.relation); // I列: 続柄

      // 住所（物件）
      if (data.postalCode !== undefined) sheet.getRange(targetRow, 14).setValue(data.postalCode); // N列: 郵便番号（物件）
      if (data.prefecture !== undefined) sheet.getRange(targetRow, 15).setValue(data.prefecture); // O列: 都道府県（物件）
      if (data.city !== undefined) sheet.getRange(targetRow, 16).setValue(data.city); // P列: 市区町村（物件）
      if (data.address !== undefined) sheet.getRange(targetRow, 17).setValue(data.address); // Q列: 住所詳細（物件）

      // 物件情報
      if (data.propertyType !== undefined) sheet.getRange(targetRow, 23).setValue(data.propertyType); // W列: 物件種別（index 23）
      if (data.floors !== undefined) sheet.getRange(targetRow, 26).setValue(data.floors); // Z列: 階数（index 26）

      // 工事希望箇所（配列の場合は結合） - V1902: CSVヘッダー準拠84列
      if (data.workItems !== undefined) {
        const workItemsStr = Array.isArray(data.workItems) ? data.workItems.join('、') : data.workItems;
        sheet.getRange(targetRow, 78).setValue(workItemsStr); // 78列目: 見積もり希望箇所（BZ）
      }

      // V1902: CSVヘッダー準拠84列
      if (data.constructionTiming !== undefined) sheet.getRange(targetRow, 79).setValue(data.constructionTiming); // 79列目: 施工時期（CA）
      if (data.companiesCount !== undefined) sheet.getRange(targetRow, 80).setValue(data.companiesCount); // 80列目: 希望社数（CB）
      if (data.surveyAttendance !== undefined) sheet.getRange(targetRow, 81).setValue(data.surveyAttendance); // 81列目: 立ち会い可否（CC）

      // V1901: 業者選択履歴（双方向同期）
      if (data.businessHistory !== undefined) sheet.getRange(targetRow, 45).setValue(data.businessHistory); // AS列: 業者選定履歴
      if (data.attendanceRelation !== undefined) sheet.getRange(targetRow, 82).setValue(data.attendanceRelation); // 82列目: 立ち会い者関係性（CD）
      if (data.specialItems !== undefined) {
        const specialItemsStr = Array.isArray(data.specialItems) ? data.specialItems.join('、') : data.specialItems;
        sheet.getRange(targetRow, 83).setValue(specialItemsStr); // 83列目: 特殊項目（CE）
      }

      // 管理情報
      if (data.status !== undefined) sheet.getRange(targetRow, 67).setValue(data.status); // BN列: 管理ステータス（index 67）
      if (data.memo !== undefined) {
        const currentMemo = sheet.getRange(targetRow, 66).getValue() || '';
        const timestamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
        const newMemo = currentMemo
          ? `${currentMemo}\n[${timestamp}] ${data.memo}`
          : `[${timestamp}] ${data.memo}`;
        sheet.getRange(targetRow, 66).setValue(newMemo); // BM列: メモ（index 66）
      }

      // 最終更新日時を更新
      const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
      sheet.getRange(targetRow, 69).setValue(now); // BQ列: 最終更新日時（index 69）

      console.log(`[CVSheetSystem] CV全項目更新完了: ${cvId}`);

      return {
        success: true,
        message: 'CV全項目更新完了',
        cvId: cvId
      };

    } catch (error) {
      console.error('[CVSheetSystem] updateCVData エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ハンドラー（main.jsから呼ばれる）
   * V1854: main.jsから e.parameter が直接渡されるため、引数名を params に変更
   */
  handle(params, postData) {
    console.log('[CVSheetSystem] handle called');
    console.log('[CVSheetSystem] params:', params ? JSON.stringify(params) : 'params is null');
    console.log('[CVSheetSystem] postData:', JSON.stringify(postData));

    // パラメータ取得（GET/POSTの両方に対応）
    // main.jsから handler(e.parameter, null) で呼ばれるため、params は既にパラメータオブジェクト
    if (!params) {
      params = {};
    }

    if (postData) {
      // postDataは既にパース済みのオブジェクト（main.jsで処理済み）
      if (typeof postData === 'object') {
        params = Object.assign({}, params, postData);
      } else {
        console.log('[CVSheetSystem] Unexpected postData format:', typeof postData);
      }
    }

    console.log('[CVSheetSystem] final params:', JSON.stringify(params));

    // cv_プレフィックスを削除（SystemRouterからcv_付きで来る場合があるため）
    let action = params.action;
    if (action && action.startsWith('cv_')) {
      action = action.substring(3); // 'cv_' を削除
      console.log('[CVSheetSystem] Removed cv_ prefix, new action:', action);
    }
    console.log('[CVSheetSystem] action:', action);

    try {
      // スプレッドシート初期化・作成
      if (action === 'init') {
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
      if (action === 'add_user') {
        return this.addUserRegistration(params);
      }

      // 不正対策ログ追加
      if (action === 'add_fraud_log') {
        return this.addFraudLog(params);
      }

      // CV ID指定でデータ取得
      if (action === 'get_user') {
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

      // CVステータス更新（アドミンダッシュボード用）
      if (action === 'updateCVStatus') {
        return this.updateCVStatus(params);
      }

      // 名前→カナ変換（アドミンダッシュボード用）
      if (action === 'convertNameToKana') {
        return this.convertNameToKana(params);
      }

      // CV全項目データ更新（アドミンダッシュボード用）
      if (action === 'updateCVData') {
        return this.updateCVData(params);
      }

      // デバッグ：実際のスプレッドシート構造を確認（一時的）
      if (action === 'debugSpreadsheetStructure') {
        try {
          const ssId = this.getSpreadsheetId();
          const ss = SpreadsheetApp.openById(ssId);
          const sheet = ss.getSheetByName('ユーザー登録');

          if (!sheet) {
            return {
              success: false,
              error: 'ユーザー登録シートが見つかりません'
            };
          }

          // ヘッダー行を取得
          const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

          // 最初のデータ行を取得（あれば）
          let firstDataRow = null;
          if (sheet.getLastRow() > 1) {
            firstDataRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
          }

          // V, W, X, Y列の情報を明示的に取得
          const vColumn = { index: 21, header: headers[21], value: firstDataRow ? firstDataRow[21] : null };
          const wColumn = { index: 22, header: headers[22], value: firstDataRow ? firstDataRow[22] : null };
          const xColumn = { index: 23, header: headers[23], value: firstDataRow ? firstDataRow[23] : null };
          const yColumn = { index: 24, header: headers[24], value: firstDataRow ? firstDataRow[24] : null };

          return {
            success: true,
            totalColumns: headers.length,
            headers: headers,
            firstDataRow: firstDataRow,
            vwxyColumns: {
              V: vColumn,
              W: wColumn,
              X: xColumn,
              Y: yColumn
            }
          };
        } catch (error) {
          return {
            success: false,
            error: error.toString()
          };
        }
      }

      // AI添削（DeepSeek API使用）
      if (action === 'aiCorrectMemo') {
        try {
          const memo = params.memo;
          if (!memo || memo.trim() === '') {
            return {
              success: false,
              error: 'メモが空です'
            };
          }

          console.log('[CVSheetSystem] AI添削リクエスト:', memo.substring(0, 50) + '...');

          // プロパティからOpenRouter APIキーを取得
          const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
          if (!apiKey) {
            return {
              success: false,
              error: 'OPENROUTER_API_KEY が設定されていません'
            };
          }

          // OpenRouter API経由でDeepSeek呼び出し
          const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
          const requestBody = {
            model: 'deepseek/deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'あなたは建築・リフォーム業界の専門家です。案件メモを読みやすく、分かりやすく整理してください。重要な情報は残し、冗長な表現は簡潔にしてください。箇条書きを使って整理し、ビジネス文書として適切な形式にしてください。'
              },
              {
                role: 'user',
                content: '以下の案件メモを整理して、読みやすく分かりやすくしてください：\n\n' + memo
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          };

          const response = UrlFetchApp.fetch(apiUrl, {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + apiKey,
              'HTTP-Referer': 'https://gaihekikuraberu.com',
              'X-Title': 'Kuraberu Admin Dashboard'
            },
            payload: JSON.stringify(requestBody),
            muteHttpExceptions: true
          });

          const responseCode = response.getResponseCode();
          const responseText = response.getContentText();

          if (responseCode !== 200) {
            console.error('[CVSheetSystem] DeepSeek APIエラー:', responseCode, responseText);
            return {
              success: false,
              error: 'AI添削に失敗しました: ' + responseText
            };
          }

          const result = JSON.parse(responseText);
          const correctedMemo = result.choices[0].message.content;

          console.log('[CVSheetSystem] AI添削成功');

          return {
            success: true,
            correctedMemo: correctedMemo
          };

        } catch (error) {
          console.error('[CVSheetSystem] AI添削エラー:', error);
          return {
            success: false,
            error: 'AI添削エラー: ' + error.toString()
          };
        }
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
  },

  /**
   * 業者選定履歴を自動生成（AS列用）
   * ランキング選択やソート条件から生成
   */
  generateSelectionHistory(params) {
    const history = [];

    // ランキングから選択した業者がある場合
    if (params.selectedMerchants) {
      try {
        const merchants = JSON.parse(params.selectedMerchants);
        if (Array.isArray(merchants) && merchants.length > 0) {
          history.push(`ランキングから${merchants.length}社選択`);
          merchants.forEach(m => {
            if (m.name) history.push(`- ${m.name}`);
          });
        }
      } catch (e) {
        console.log('[generateSelectionHistory] selectedMerchants parse error:', e);
      }
    }

    // ソート条件がある場合
    if (params.sortPreference) {
      const sortMap = {
        'price': '価格重視',
        'quality': '品質重視',
        'speed': '工期重視',
        'reputation': '評判重視',
        'distance': '距離重視'
      };
      const sortText = sortMap[params.sortPreference] || params.sortPreference;
      history.push(`選定基準: ${sortText}`);
    }

    // Q17_業者選定条件
    if (params.Q17_selectionCriteria) {
      history.push(`重視項目: ${params.Q17_selectionCriteria}`);
    }

    // Q14_比較意向
    if (params.Q14_comparison) {
      if (params.Q14_comparison.includes('比較')) {
        history.push('複数社比較希望');
      }
    }

    // 希望社数
    if (params.companiesCount) {
      history.push(`希望社数: ${params.companiesCount}`);
    }

    return history.length > 0 ? history.join('\n') : '未選択';
  },

  /**
   * 案件メモを自動生成（AT列用）
   * BOT回答と劣化状況から生成
   */
  generateCaseMemo(params) {
    const memo = [];

    // 物件情報
    if (params.Q1_propertyType) {
      memo.push(`物件: ${params.Q1_propertyType}`);
    }
    if (params.Q2_floors) {
      memo.push(`階数: ${params.Q2_floors}`);
    }
    if (params.Q3_buildingAge) {
      memo.push(`築年数: ${params.Q3_buildingAge}`);
    }

    // 工事内容
    const workTypes = [];
    if (params.Q9_exteriorWork) workTypes.push(`外壁(${params.Q9_exteriorWork})`);
    if (params.Q10_roofWork) workTypes.push(`屋根(${params.Q10_roofWork})`);
    if (workTypes.length > 0) {
      memo.push(`希望工事: ${workTypes.join('、')}`);
    }

    // 劣化状況（重要）
    if (params.Q16_degradation) {
      memo.push(`【劣化状況】${params.Q16_degradation}`);
    }

    // 気になる箇所
    if (params.Q8_concernedArea) {
      memo.push(`気になる箇所: ${params.Q8_concernedArea}`);
    }

    // 訪問業者情報
    if (params.Q13_doorSales === 'はい' && params.Q15_doorSalesCompany) {
      memo.push(`訪問業者あり: ${params.Q15_doorSalesCompany}`);
    }

    // 見積もり状況
    if (params.Q11_quoteCount) {
      memo.push(`見積もり: ${params.Q11_quoteCount}`);
      if (params.Q12_quoteSource) {
        memo.push(`取得先: ${params.Q12_quoteSource}`);
      }
    }

    // 施工時期
    if (params.constructionTiming) {
      memo.push(`施工時期: ${params.constructionTiming}`);
    }

    // 立ち会い
    if (params.surveyAttendance) {
      memo.push(`立ち会い: ${params.surveyAttendance}`);
      if (params.attendanceRelation) {
        memo.push(`立会者: ${params.attendanceRelation}`);
      }
    }

    // 特殊要望
    if (params.requests) {
      memo.push(`【要望】${params.requests}`);
    }
    if (params.specialItems) {
      memo.push(`【特記】${params.specialItems}`);
    }

    return memo.length > 0 ? memo.join(' / ') : '';
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

// V1902: migrateAddCFColumn関数は削除（CSVは84列構成、選択業者数列は存在しない）
