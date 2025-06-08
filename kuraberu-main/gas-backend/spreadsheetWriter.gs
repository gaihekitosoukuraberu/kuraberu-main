/**
 * spreadsheetWriter.gs - フォームデータをGoogle Spreadsheetsに保存する
 */

/**
 * SpreadsheetWriterオブジェクト - スプレッドシート操作のためのメソッドを提供
 */
const SpreadsheetWriter = {
  /**
   * フォームデータをスプレッドシートに保存する
   * @param {Object} formData - フォームから送信されたデータ
   * @returns {Object} - 保存結果の情報
   */
  saveFormData: function(formData) {
    try {
      // アプリケーション設定を取得
      const config = getAppConfig();

      // スプレッドシートを開く
      const ss = SpreadsheetApp.openById(config.spreadsheetId);
      const sheet = this.getOrCreateSheet(ss, '問い合わせ');

      // ヘッダー行を取得してカラム構造を検証
      const headers = this.getSheetHeaders(sheet);
      const columnValidation = this.validateColumnStructure(headers);

      // 新しいデータ行を作成（列構造の検証結果を渡す）
      const newRow = this.createDataRow(formData, columnValidation);

      // シートに行を追加
      sheet.appendRow(newRow);

      // フォーマットを適用（オプション）
      this.applyFormatting(sheet);

      // 列構造の不整合があれば警告をログに出力
      if (columnValidation.inconsistencies.length > 0) {
        console.warn(`列構造の不整合を検出: ${columnValidation.inconsistencies.join(', ')}`);
        // エラーログシートに記録（存在する場合）
        this.logColumnInconsistencies(ss, columnValidation.inconsistencies, formData);
      }

      return {
        success: true,
        message: 'データがスプレッドシートに保存されました',
        timestamp: new Date().toString(),
        columnValidation: columnValidation // 検証結果も返す
      };

    } catch (error) {
      console.error('スプレッドシートへの保存中にエラーが発生しました:', error);

      return {
        success: false,
        message: `スプレッドシートエラー: ${error.message}`,
        timestamp: new Date().toString()
      };
    }
  },

  /**
   * シートのヘッダー行を取得する
   * @param {Sheet} sheet - ヘッダーを取得するシート
   * @returns {string[]} - ヘッダー行の値の配列
   */
  getSheetHeaders: function(sheet) {
    if (sheet.getLastRow() < 1) {
      return [];
    }

    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    return headerRange.getValues()[0];
  },

  /**
   * スプレッドシートの列構造を検証する
   * @param {string[]} headers - ヘッダー行の値の配列
   * @returns {Object} - 検証結果（マッピングと不整合リスト）
   */
  validateColumnStructure: function(headers) {
    // 期待される必須カラム
    const requiredColumns = [
      'タイムスタンプ', '案件ID', 'ステータス', 'お名前', '電話番号',
      '郵便番号', '住所', 'メールアドレス', '依頼物件種別', '希望施工時期'
    ];

    // 既知のレガシーカラムと新カラムのマッピング
    const columnMappings = {
      '電話': '電話番号',
      '郵便': '郵便番号',
      'メール': 'メールアドレス',
      '物件タイプ': '依頼物件種別',
      '施工時期': '希望施工時期',
      '顧客ID': '案件ID'
    };

    // 結果オブジェクト
    const result = {
      mapping: {}, // インデックス→カラム名のマッピング
      inconsistencies: [] // 不整合のリスト
    };

    // 必須カラムが存在するか確認
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      // 必須カラムが見つからない場合、レガシーカラムを探す
      missingColumns.forEach(missingCol => {
        // レガシーカラム名の逆引きマップを作成
        const legacyNames = Object.entries(columnMappings)
          .filter(([legacy, modern]) => modern === missingCol)
          .map(([legacy]) => legacy);

        // レガシーカラムが存在するか確認
        const foundLegacy = legacyNames.find(legacy => headers.includes(legacy));

        if (foundLegacy) {
          // レガシーカラムが見つかった場合
          const legacyIndex = headers.indexOf(foundLegacy);
          result.mapping[missingCol] = legacyIndex;
          result.inconsistencies.push(`"${missingCol}"の代わりに"${foundLegacy}"が使用されています（列${legacyIndex + 1}）`);
        } else {
          // 代替カラムも見つからなかった場合
          result.inconsistencies.push(`必須カラム"${missingCol}"が見つかりません`);
        }
      });
    }

    // 通常のマッピングを作成
    headers.forEach((header, index) => {
      // 現在のヘッダーが標準カラムの場合
      result.mapping[header] = index;

      // レガシーカラムが使用されている場合
      if (columnMappings[header]) {
        const modernName = columnMappings[header];
        result.mapping[modernName] = index;
        if (!result.inconsistencies.includes(`"${modernName}"の代わりに"${header}"が使用されています（列${index + 1}）`)) {
          result.inconsistencies.push(`"${modernName}"の代わりに"${header}"が使用されています（列${index + 1}）`);
        }
      }
    });

    return result;
  },

  /**
   * 列の不整合をログに記録する
   * @param {Spreadsheet} ss - スプレッドシートオブジェクト
   * @param {string[]} inconsistencies - 不整合リスト
   * @param {Object} formData - 送信されたフォームデータ
   */
  logColumnInconsistencies: function(ss, inconsistencies, formData) {
    try {
      // ログシートを取得または作成
      let logSheet = ss.getSheetByName('システムログ');
      if (!logSheet) {
        logSheet = ss.insertSheet('システムログ');
        logSheet.appendRow(['タイムスタンプ', 'タイプ', 'メッセージ', '詳細']);

        // 書式設定
        logSheet.getRange(1, 1, 1, 4).setBackground('#E0E0E0').setFontWeight('bold');
        logSheet.setColumnWidth(1, 180); // タイムスタンプ
        logSheet.setColumnWidth(2, 100); // タイプ
        logSheet.setColumnWidth(3, 300); // メッセージ
        logSheet.setColumnWidth(4, 400); // 詳細
      }

      // 現在日時
      const now = new Date();

      // 詳細情報（JSONに変換）
      const details = JSON.stringify({
        inconsistencies: inconsistencies,
        form_id: formData.id || 'unknown',
        source: formData.utm_source || 'direct',
        timestamp: now.getTime()
      });

      // ログ行を追加
      logSheet.appendRow([
        now,
        'COLUMN_WARNING',
        '列構造の不整合を検出しました',
        details
      ]);

    } catch (error) {
      console.error('不整合ログの記録中にエラーが発生しました:', error);
    }
  },
  
  /**
   * シートを取得、存在しない場合は作成する
   * @param {Spreadsheet} ss - スプレッドシートオブジェクト
   * @param {string} sheetName - シート名
   * @returns {Sheet} - シートオブジェクト
   */
  getOrCreateSheet: function(ss, sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    
    // シートが存在しない場合は新規作成
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // ヘッダー行を追加（詳細な案件管理向けに拡張）
      const headers = [
        // 基本情報
        'タイムスタンプ',
        '案件ID',
        'ステータス',
        'お名前',
        '電話番号',
        '郵便番号',
        '住所',
        'メールアドレス',

        // 物件情報
        '依頼物件種別',
        '階数',
        '延べ床面積',
        '築年数',
        '施工回数',
        '前回施工時期',
        '外壁材質',
        '屋根材質',
        '見積もり希望箇所',
        '立ち会い可否',
        '立ち会い者関係性',
        '現調希望日時',
        '物件情報リンク',
        '対象物件住所',
        '見積もり送付先住所',

        // 顧客情報
        '氏名（漢字）',
        '氏名（カナ）',
        '性別',
        '年齢',
        '関係性',

        // 紹介先情報 (1〜4社分)
        '紹介社1', '紹介ID1', '進捗1', '対応ステータス1', '加盟店次回荷電日時1', '訪問日時1', '現調写真URL1', '契約予定日1', '契約確度1', '加盟店様向けSMS送信済1', 'SMS送信本文1', '加盟店様向けメール送信済1', '担当者ID1', 'Slack通知済1', 'ステータス通知済1', 'ステータス通知日時1', 'ステータスリマインド済1',
        '紹介社2', '紹介ID2', '進捗2', '対応ステータス2', '加盟店次回荷電日時2', '訪問日時2', '現調写真URL2', '契約予定日2', '契約確度2', '加盟店様向けSMS送信済2', 'SMS送信本文2', '加盟店様向けメール送信済2', '担当者ID2', 'Slack通知済2', 'ステータス通知済2', 'ステータス通知日時2', 'ステータスリマインド済2',
        '紹介社3', '紹介ID3', '進捗3', '対応ステータス3', '加盟店次回荷電日時3', '訪問日時3', '現調写真URL3', '契約予定日3', '契約確度3', '加盟店様向けSMS送信済3', 'SMS送信本文3', '加盟店様向けメール送信済3', '担当者ID3', 'Slack通知済3', 'ステータス通知済3', 'ステータス通知日時3', 'ステータスリマインド済3',
        '紹介社4', '紹介ID4', '進捗4', '対応ステータス4', '加盟店次回荷電日時4', '訪問日時4', '現調写真URL4', '契約予定日4', '契約確度4', '加盟店様向けSMS送信済4', 'SMS送信本文4', '加盟店様向けメール送信済4', '担当者ID4', 'Slack通知済4', 'ステータス通知済4', 'ステータス通知日時4', 'ステータスリマインド済4',

        // 契約情報
        '合計販売金額',
        '想定売上',
        '地域別成約単価マスタ',
        '契約予定日（全体）',
        '契約確度（全体）',
        '契約日',
        '契約金額',
        '工事内容',
        '契約書アップロード',
        '初回接触日時',

        // 営業情報
        '他社見積もり状況',
        '他社見積もり数',
        '希望社数',
        '見積書アップロード',
        '施工時期',
        '立ち会い希望詳細',
        '連絡時間帯',
        'Q&A回答',

        // 対応管理
        '最終対応日',
        '次回荷電日',
        '対応メモ',
        '流入検索ワード',
        '転送日',
        '転送ログ',
        '交換元案件リンク',

        // キャンセル情報
        'キャンセル申請日',
        'キャンセル理由',
        'キャンセル審査ステータス',
        'キャンセル承認日',
        'キャンセル申請者名',
        'キャンセル申請者連絡先',

        // トラッキング情報
        'UTMソース',
        'UTMメディア',
        'UTMキャンペーン',
        'リファラー',
        'GCLID',
        'IPアドレス',
        '送信元ページ',
        'ユーザーエージェント',
        '対応履歴',
        '備考'
      ];
      
      sheet.appendRow(headers);
      
      // ヘッダー行の書式設定
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#E0E0E0')
        .setFontWeight('bold')
        .setFontColor('#000000');
      
      // 列幅の自動調整
      sheet.autoResizeColumns(1, headers.length);
    }
    
    return sheet;
  },
  
  /**
   * フォームデータから新しい行データを作成する
   * @param {Object} formData - フォームから送信されたデータ
   * @param {Object} columnValidation - 列構造の検証結果（省略可）
   * @returns {Array} - スプレッドシートに追加する行データ
   */
  createDataRow: function(formData, columnValidation) {
    // 建物タイプの日本語表記への変換
    const buildingTypeMap = {
      'detached': '戸建て住宅',
      'apartment': 'マンション・アパート',
      'store': '店舗・事務所',
      'other': 'その他'
    };

    // 希望施工時期の日本語表記への変換
    const timeFrameMap = {
      'asap': 'すぐにでも（1ヶ月以内）',
      '3months': '3ヶ月以内',
      '6months': '半年以内',
      'undecided': '検討中・未定'
    };

    // 補助データ
    const ipAddress = formData.ip_address || '';
    const pageUrl = formData.page_url || '';
    const userAgent = formData.user_agent || '';
    const now = new Date();

    // 案件ID生成
    const timestamp = now.getTime();
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const caseId = `KRB-${timestamp.toString().slice(-8)}-${randomPart}`;

    // 建物情報の取り出し（フォームの追加質問から）
    const buildingType = buildingTypeMap[formData.buildingType] || formData.buildingType || '';
    const propertyType = buildingType; // デフォルトで建物タイプを物件種別として使用

    // 物件情報を設定（実際のフォームデータと一致するよう適宜調整）
    const propertyFloors = formData.floors || ''; // 階数
    const propertyArea = formData.area || ''; // 延べ床面積
    const propertyAge = formData.buildingAge || ''; // 築年数
    const pastConstructionCount = formData.pastConstructionCount || ''; // 施工回数
    const lastConstructionDate = formData.lastConstructionDate || ''; // 前回施工時期
    const wallMaterial = formData.wallMaterial || ''; // 外壁材質
    const roofMaterial = formData.roofMaterial || ''; // 屋根材質

    // フォームで指定された希望施工時期
    const desiredTimeFrame = timeFrameMap[formData.timeFrame] || formData.timeFrame || '';

    // 200項目以上のカラム用配列を作成（nullは空セルとして扱われる）
    const rowData = Array(200).fill(''); // 最初に空の配列で初期化

    // カラムマッピングが提供されている場合は使用する
    const mapping = (columnValidation && columnValidation.mapping) || {};

    // カラムの書き込み（マッピングを適用）
    const setColumnValue = (columnName, value) => {
      // マッピングが存在する場合はインデックスを使用
      if (mapping[columnName] !== undefined) {
        rowData[mapping[columnName]] = value;
      } else {
        // 以下は従来の固定インデックスマッピング（後方互換性のため保持）
        const defaultIndexMap = {
          'タイムスタンプ': 0,
          '案件ID': 1,
          'ステータス': 2,
          'お名前': 3,
          '電話番号': 4,
          '郵便番号': 5,
          '住所': 6,
          'メールアドレス': 7,
          '依頼物件種別': 8,
          '階数': 9,
          '延べ床面積': 10,
          '築年数': 11,
          '施工回数': 12,
          '前回施工時期': 13,
          '外壁材質': 14,
          '屋根材質': 15,
          '見積もり希望箇所': 16,
          '立ち会い可否': 17,
          '立ち会い者関係性': 18,
          '現調希望日時': 19,
          '物件情報リンク': 20,
          '対象物件住所': 21,
          '見積もり送付先住所': 22,
          '氏名（漢字）': 25,
          '氏名（カナ）': 26,
          '性別': 27,
          '年齢': 28,
          '関係性': 29
        };

        // デフォルトのインデックスがある場合はそれを使用
        if (defaultIndexMap[columnName] !== undefined) {
          rowData[defaultIndexMap[columnName]] = value;
        }
        // それ以外の場合は値をセットしない（ログには記録済み）
      }
    };

    // 基本情報
    setColumnValue('タイムスタンプ', now);
    setColumnValue('案件ID', caseId);
    setColumnValue('ステータス', '新規');
    setColumnValue('お名前', formData.name || '');
    setColumnValue('電話番号', formData.phone || '');
    setColumnValue('郵便番号', formData.postalCode || '');
    setColumnValue('住所', formData.address || '');
    setColumnValue('メールアドレス', formData.email || '');

    // 物件情報
    setColumnValue('依頼物件種別', propertyType);
    setColumnValue('階数', propertyFloors);
    setColumnValue('延べ床面積', propertyArea);
    setColumnValue('築年数', propertyAge);
    setColumnValue('施工回数', pastConstructionCount);
    setColumnValue('前回施工時期', lastConstructionDate);
    setColumnValue('外壁材質', wallMaterial);
    setColumnValue('屋根材質', roofMaterial);
    setColumnValue('見積もり希望箇所', formData.requestedAreas || '');
    setColumnValue('立ち会い可否', formData.canAttend || '未指定');
    setColumnValue('立ち会い者関係性', formData.attendeeRelation || '');
    setColumnValue('現調希望日時', formData.desiredInspectionDate || '');
    setColumnValue('物件情報リンク', '');
    setColumnValue('対象物件住所', formData.address || '');
    setColumnValue('見積もり送付先住所', formData.mailingAddress || formData.address || '');

    // 顧客情報
    setColumnValue('氏名（漢字）', formData.name || '');
    setColumnValue('氏名（カナ）', formData.nameKana || '');
    setColumnValue('性別', formData.gender || '');
    setColumnValue('年齢', formData.age || '');
    setColumnValue('関係性', formData.relationship || '本人');

    // 紹介先情報は空のままにしておく（1〜4社分）
    // 契約情報
    setColumnValue('合計販売金額', '');
    setColumnValue('想定売上', '');
    setColumnValue('地域別成約単価マスタ', '');
    setColumnValue('契約予定日（全体）', '');
    setColumnValue('契約確度（全体）', '');
    setColumnValue('契約日', '');
    setColumnValue('契約金額', '');
    setColumnValue('工事内容', formData.constructionType || '');
    setColumnValue('契約書アップロード', '');
    setColumnValue('初回接触日時', now.toLocaleString('ja-JP'));

    // 営業情報
    setColumnValue('他社見積もり状況', formData.otherQuotes || '');
    setColumnValue('他社見積もり数', formData.otherQuotesCount || '');
    setColumnValue('希望社数', formData.desiredCompanyCount || '');
    setColumnValue('見積書アップロード', '');
    setColumnValue('施工時期', desiredTimeFrame);
    setColumnValue('立ち会い希望詳細', formData.attendanceDetails || '');
    setColumnValue('連絡時間帯', formData.contactTimePreference || '');
    setColumnValue('Q&A回答', formData.message || '');

    // 対応管理
    setColumnValue('最終対応日', now.toLocaleString('ja-JP'));
    setColumnValue('次回荷電日', '');
    setColumnValue('対応メモ', '初回問い合わせ');
    setColumnValue('流入検索ワード', formData.searchKeyword || '');
    setColumnValue('転送日', '');
    setColumnValue('転送ログ', '');
    setColumnValue('交換元案件リンク', '');

    // キャンセル情報は空のままにしておく

    // トラッキング情報
    setColumnValue('UTMソース', formData.utm_source || '');
    setColumnValue('UTMメディア', formData.utm_medium || '');
    setColumnValue('UTMキャンペーン', formData.utm_campaign || '');
    setColumnValue('リファラー', formData.referrer || '');
    setColumnValue('GCLID', formData.gclid || '');
    setColumnValue('IPアドレス', ipAddress);
    setColumnValue('送信元ページ', pageUrl);
    setColumnValue('ユーザーエージェント', userAgent);
    setColumnValue('対応履歴', `${now.toLocaleString('ja-JP')}: フォーム送信\n`);
    setColumnValue('備考', '');

    // 必要なデータのみのトリミング（末尾の空セルを削除）
    let lastNonEmptyIndex = rowData.length - 1;
    while (lastNonEmptyIndex >= 0 && rowData[lastNonEmptyIndex] === '') {
      lastNonEmptyIndex--;
    }

    return rowData.slice(0, lastNonEmptyIndex + 1);
  },
  
  /**
   * シートに書式設定を適用する
   * @param {Sheet} sheet - フォーマットを適用するシート
   */
  applyFormatting: function(sheet) {
    // ヘッダー行の書式設定
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange.setBackground('#4285F4')
               .setFontColor('#FFFFFF')
               .setFontWeight('bold')
               .setFontSize(11)
               .setVerticalAlignment('middle')
               .setHorizontalAlignment('center');

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) { // ヘッダー行を除く
      // 日付列のフォーマット
      const dateRange = sheet.getRange(2, 1, lastRow - 1, 1);
      dateRange.setNumberFormat('yyyy/MM/dd HH:mm:ss');

      // ステータス列の書式設定（色分け）
      const statusColumn = 18; // ステータス列のインデックス
      const statusRange = sheet.getRange(2, statusColumn, lastRow - 1, 1);
      statusRange.setHorizontalAlignment('center');

      // ステータスに応じて色分け
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, statusColumn).getValue();
        let backgroundColor = '#FFFFFF';
        let fontColor = '#000000';

        switch (status) {
          case '新規':
            backgroundColor = '#E6F4EA';
            fontColor = '#137333';
            break;
          case '対応中':
            backgroundColor = '#FEF7E0';
            fontColor = '#B06000';
            break;
          case '完了':
            backgroundColor = '#E8F0FE';
            fontColor = '#1A73E8';
            break;
          case '失注':
            backgroundColor = '#FCE8E6';
            fontColor = '#C5221F';
            break;
        }

        sheet.getRange(i, statusColumn).setBackground(backgroundColor).setFontColor(fontColor);
      }

      // 全体の罫線
      const dataRange = sheet.getDataRange();
      dataRange.setBorder(true, true, true, true, true, true, '#D9D9D9', SpreadsheetApp.BorderStyle.SOLID);

      // 交互の行の背景色
      for (let i = 2; i <= lastRow; i++) {
        if (i % 2 === 0) {
          sheet.getRange(i, 1, 1, sheet.getLastColumn()).setBackground('#F8F9FA');
        } else {
          sheet.getRange(i, 1, 1, sheet.getLastColumn()).setBackground('#FFFFFF');
        }
      }
    }

    // 列幅の最適化
    const columnWidths = {
      1: 180,  // 送信日時
      2: 120,  // お名前
      3: 130,  // 電話番号
      4: 100,  // 郵便番号
      5: 250,  // 住所
      6: 200,  // メールアドレス
      7: 120,  // 建物タイプ
      8: 150,  // 希望施工時期
      9: 300,  // お問い合わせ内容
      10: 120, // UTMソース
      11: 120, // UTMメディア
      12: 120, // UTMキャンペーン
      13: 150, // リファラー
      14: 120, // GCLID
      15: 120, // IPアドレス
      16: 250, // 送信元ページ
      17: 200, // ユーザーエージェント
      18: 80,  // ステータス
      19: 100, // 担当者
      20: 130, // 顧客ID
      21: 300, // 対応履歴
      22: 250  // 備考
    };

    // 列幅を設定
    for (const [col, width] of Object.entries(columnWidths)) {
      sheet.setColumnWidth(parseInt(col), width);
    }

    // シートの冷凍行（ヘッダー固定）
    sheet.setFrozenRows(1);
  }
};