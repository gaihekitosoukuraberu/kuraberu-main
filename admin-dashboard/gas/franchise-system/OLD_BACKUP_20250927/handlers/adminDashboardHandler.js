/**
 * 管理ダッシュボード用ハンドラー
 * 管理画面からの加盟店登録申請データ取得・承認・却下処理
 */

/**
 * 加盟店登録申請一覧を取得
 * @param {Object} params - パラメータ
 * @param {string} params.status - ステータスフィルタ（all/pending/approved/rejected）
 * @param {number} params.limit - 取得件数上限
 * @param {number} params.daysRange - 表示期間（日数）デフォルト30日
 * @return {Object} 申請一覧データ
 */
function handleGetRegistrationRequests(params = {}) {
  try {
    // プロパティから直接取得
    const scriptProps = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // 期間フィルタの設定（デフォルト30日）
    const daysRange = params.daysRange || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysRange);

    // ヘッダーのインデックスマッピング（0-indexed）
    const columnIndices = {
      timestamp: 0, // A列: タイムスタンプ
      registrationId: 1, // B列: 登録ID
      companyName: 2, // C列: 会社名
      companyNameKana: 3, // D列: 会社名カナ
      shopName: 4, // E列: 屋号
      shopNameKana: 5, // F列: 屋号カナ
      representativeName: 6, // G列: 代表者名
      representativeNameKana: 7, // H列: 代表者名カナ
      postalCode: 8, // I列: 郵便番号
      address: 9, // J列: 住所
      phone: 10, // K列: 電話番号
      websiteUrl: 11, // L列: ウェブサイトURL
      establishedDate: 12, // M列: 設立年月
      prText: 13, // N列: PRテキスト
      branchName: 14, // O列: 支店名
      branchAddress: 15, // P列: 支店住所
      termsAgreement: 16, // Q列: 利用規約同意
      idDocType: 17, // R列: 本人確認書類種類
      idDocUrl1: 18, // S列: 本人確認書類URL1
      idDocUrl2: 19, // T列: 本人確認書類URL2
      infoConfirmation: 20, // U列: 情報確認同意
      billingEmail: 21, // V列: 請求用メールアドレス
      salesEmail: 22, // W列: 営業用メールアドレス
      salesPerson: 23, // X列: 営業担当者氏名
      salesPersonKana: 24, // Y列: 営業担当者カナ
      employeeCount: 25, // Z列: 従業員数
      salesScale: 26, // AA列: 売上規模
      propertyTypes: 27, // AB列: 対応可能物件種別
      maxFloors: 28, // AC列: 最大対応階数
      buildingAgeRange: 29, // AD列: 築年数対応範囲
      constructionAreas: 30, // AE列: 施工箇所
      specialHandling: 31, // AF列: 特殊対応項目
      selectedPrefectures: 32, // AG列: 対応都道府県
      selectedCities: 33, // AH列: 対応市区町村
      priorityArea: 34, // AI列: 優先エリア
      status: 35, // AJ列: ステータス
      approvalStatus: 36, // AK列: 承認ステータス
      approvalDate: 37, // AL列: 登録日時（承認/却下日時）
      approver: 38, // AM列: 承認者
      rejectReason: 39 // AN列: 却下理由
    };

    const results = {
      pending: [],
      approved: [],
      rejected: [],
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        monthlyApproved: 0,
        approvalRate: 0
      }
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // ヘッダー行をスキップして処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[columnIndices.registrationId]) continue; // 登録IDがない行はスキップ

      // 承認ステータスを優先、なければステータスを使用
      const status = row[columnIndices.approvalStatus] || row[columnIndices.status] || '未審査';
      const timestamp = row[columnIndices.timestamp];

      // 支店情報の展開
      const branchNames = row[14] || ''; // O列
      const branchAddresses = row[15] || ''; // P列
      const branches = branchNames && branchAddresses ?
        branchNames.split('、').map((name, index) => ({
          name: name,
          address: (branchAddresses.split('、')[index] || '')
        })).filter(b => b.name) : [];

      // エリア情報の展開
      const prefectures = row[32] ? row[32].split(',').map(p => p.trim()) : []; // AG列
      const cities = row[33] ? row[33].split(',').map(c => c.trim()) : []; // AH列
      const priorityAreas = row[34] ? row[34].split(',').map(a => a.trim()) : []; // AI列

      // 物件種別の展開
      const propertyTypes = row[27] ? row[27].split(',').map(t => t.trim()) : []; // AB列

      const registration = {
        registrationId: row[columnIndices.registrationId],
        timestamp: timestamp ? formatDate(timestamp) : '',
        companyName: row[columnIndices.companyName] || row[columnIndices.shopName] || '', // 会社名または屋号
        companyNameKana: row[columnIndices.companyNameKana] || '',
        representativeName: row[columnIndices.representativeName] || '',
        representativeNameKana: row[columnIndices.representativeNameKana] || '',
        phone: row[columnIndices.phone] || '',
        email: row[columnIndices.billingEmail] || row[columnIndices.salesEmail] || '', // 請求用または営業用メール
        salesPerson: row[columnIndices.salesPerson] || '',
        salesPersonPhone: row[columnIndices.phone] || '', // 営業担当電話番号がない場合は代表電話を使用
        address: row[columnIndices.address] || '',
        prefectures: prefectures.join(', '), // 配列を文字列に（表示用）
        prefecturesArray: prefectures, // 配列形式も保持
        cities: cities.join(', '), // 配列を文字列に（表示用）
        citiesArray: cities, // 配列形式も保持
        priorityAreas: priorityAreas.join(', '), // 配列を文字列に（表示用）
        priorityAreasArray: priorityAreas, // 配列形式も保持
        propertyTypes: propertyTypes.join(', '), // 配列を文字列に（表示用）
        propertyTypesArray: propertyTypes, // 配列形式も保持
        branches: branches, // 支店情報（配列）
        branchCount: branches.length, // 支店数
        buildingAgeRange: row[columnIndices.buildingAgeRange] || '',
        status: status,
        approvalStatus: row[columnIndices.approvalStatus] || '',
        approvalDate: row[columnIndices.approvalDate] ? formatDate(row[columnIndices.approvalDate]) : '', // 承認日時を追加
        registrationDate: row[columnIndices.approvalDate] ? formatDate(row[columnIndices.approvalDate]) : '',
        prText: row[13] || '', // N列: PRテキスト
        rowIndex: i + 1 // スプレッドシートの行番号（1-indexed）
      };

      // ステータス別に振り分け（「承認済み」または「承認済」を承認として扱う）
      if (status === '承認済み' || status === '承認済') {
        // 承認済みは期間フィルタを適用（承認日ベース）
        if (row[columnIndices.approvalDate]) {
          const approvalDate = new Date(row[columnIndices.approvalDate]);
          if (params.daysRange === -1 || approvalDate >= cutoffDate) {
            results.approved.push(registration);
          }
          // 統計は全期間でカウント
          results.stats.approved++;
          if (approvalDate.getMonth() === currentMonth && approvalDate.getFullYear() === currentYear) {
            results.stats.monthlyApproved++;
          }
        } else {
          // 承認日がない場合は含める（レガシーデータ対応）
          results.approved.push(registration);
          results.stats.approved++;
        }
      } else if (status === '却下' || status === '却下済み' || status === '却下済') {
        // 却下も期間フィルタを適用（却下日または申請日ベース）
        const checkDate = row[columnIndices.approvalDate] || row[columnIndices.timestamp];
        if (checkDate) {
          const rejectionDate = new Date(checkDate);
          if (params.daysRange === -1 || rejectionDate >= cutoffDate) {
            results.rejected.push(registration);
          }
        } else {
          results.rejected.push(registration);
        }
        results.stats.rejected++;
      } else if (status === '申請中' || status === '未審査' || status === '新規登録') {
        // 未審査は常に全件表示（期間フィルタなし）
        results.pending.push(registration);
        results.stats.pending++;
      } else {
        // その他のステータスも未審査として扱う
        results.pending.push(registration);
        results.stats.pending++;
      }

      results.stats.total++;
    }

    // 承認率を計算
    const processed = results.stats.approved + results.stats.rejected;
    if (processed > 0) {
      results.stats.approvalRate = Math.round((results.stats.approved / processed) * 100);
    }

    // 新しい順にソート
    results.pending.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    results.approved.sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate));
    results.rejected.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 制限をかける
    const limit = params.limit || 50;
    if (params.status === 'pending') {
      return {
        registrations: results.pending.slice(0, limit),
        stats: results.stats
      };
    } else if (params.status === 'approved') {
      return {
        registrations: results.approved.slice(0, limit),
        stats: results.stats
      };
    } else if (params.status === 'rejected') {
      return {
        registrations: results.rejected.slice(0, limit),
        stats: results.stats
      };
    } else {
      // all または指定なしの場合
      return {
        pending: results.pending.slice(0, limit),
        approved: results.approved.slice(0, limit),
        rejected: results.rejected.slice(0, limit),
        stats: results.stats
      };
    }

  } catch (error) {
    console.error('[AdminDashboard] 申請データ取得エラー:', error);
    return {
      success: false,
      error: error.toString(),
      message: '申請データの取得に失敗しました'
    };
  }
}

/**
 * 管理画面から申請を承認
 * @param {string} registrationId - 登録ID
 * @param {string} approver - 承認者名
 * @return {Object} 処理結果
 */
function handleApproveFromDashboard(registrationId, approver = '管理者') {
  try {
    // プロパティから直接取得
    const scriptProps = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();

    // 登録IDで該当行を検索（B列）
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === registrationId) { // B列が登録ID
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      throw new Error('指定された登録IDが見つかりません: ' + registrationId);
    }

    const approvalDate = new Date();

    // ステータスと関連情報を更新
    sheet.getRange(targetRow, 36).setValue('準備中'); // AJ列: ステータス（準備中に変更）
    sheet.getRange(targetRow, 37).setValue('承認済み'); // AK列: 承認ステータス
    sheet.getRange(targetRow, 38).setValue(approvalDate); // AL列: 承認日時
    sheet.getRange(targetRow, 39).setValue(approver); // AM列: 承認者

    // Slack通知を送信（slackNotificationHandler.gsの関数を使用）
    try {
      sendApprovalNotification(registrationId, true, approver);
    } catch (slackErr) {
      console.error('Slack通知エラー（無視）:', slackErr);
    }

    // 初回ログインメール送信
    try {
      console.log('[AdminDashboard] 初回ログインメール送信開始');

      // 承認された加盟店の情報を取得
      const rowData = data[targetRow - 1];
      const email = rowData[22]; // W列: 営業用メールアドレス
      const companyName = rowData[2]; // C列: 会社名

      console.log('[AdminDashboard] メール送信先:', email);
      console.log('[AdminDashboard] 会社名:', companyName);

      if (email && companyName) {
        // 初回ログインURL生成
        console.log('[AdminDashboard] URL生成中...');
        const loginUrl = generateFirstLoginUrl(registrationId);
        console.log('[AdminDashboard] 生成されたURL:', loginUrl);

        // メール送信
        console.log('[AdminDashboard] メール送信中...');
        sendWelcomeEmail(email, companyName, loginUrl);
        console.log('[AdminDashboard] 初回ログインメール送信成功:', email, registrationId);
      } else {
        console.error('[AdminDashboard] メールアドレスまたは会社名が見つかりません');
        console.error('[AdminDashboard] Email:', email, 'CompanyName:', companyName, 'ID:', registrationId);
      }
    } catch (emailErr) {
      console.error('[AdminDashboard] 初回ログインメール送信エラー:', emailErr);
      console.error('[AdminDashboard] エラー詳細:', emailErr.stack);
    }

    return {
      success: true,
      message: '承認処理が完了しました',
      registrationId: registrationId
    };

  } catch (error) {
    console.error('[AdminDashboard] 承認処理エラー:', error);
    return {
      success: false,
      error: error.toString(),
      message: '承認処理に失敗しました'
    };
  }
}

/**
 * 管理画面から申請を却下
 * @param {string} registrationId - 登録ID
 * @param {string} reason - 却下理由
 * @param {string} rejector - 却下者名
 * @return {Object} 処理結果
 */
function handleRejectFromDashboard(registrationId, reason = '', rejector = '管理者') {
  try {
    // プロパティから直接取得
    const scriptProps = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();

    // 登録IDで該当行を検索（B列）
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === registrationId) { // B列が登録ID
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      throw new Error('指定された登録IDが見つかりません: ' + registrationId);
    }

    const rejectionDate = new Date();

    // ステータスと関連情報を更新
    sheet.getRange(targetRow, 36).setValue('却下'); // AJ列: ステータス（却下に変更）
    sheet.getRange(targetRow, 37).setValue('却下'); // AK列: 承認ステータス
    sheet.getRange(targetRow, 38).setValue(rejectionDate); // AL列: 却下日時
    sheet.getRange(targetRow, 39).setValue(rejector); // AM列: 却下者
    if (reason) {
      sheet.getRange(targetRow, 40).setValue(reason); // AN列: 却下理由
    }

    // Slack通知を送信（slackNotificationHandler.gsの関数を使用）
    try {
      sendApprovalNotification(registrationId, false, rejector, reason);
    } catch (slackErr) {
      console.error('Slack通知エラー（無視）:', slackErr);
    }

    return {
      success: true,
      message: '却下処理が完了しました',
      registrationId: registrationId
    };

  } catch (error) {
    console.error('[AdminDashboard] 却下処理エラー:', error);
    return {
      success: false,
      error: error.toString(),
      message: '却下処理に失敗しました'
    };
  }
}


/**
 * 日付をフォーマット
 * @param {Date|string} date - 日付
 * @return {string} フォーマットされた日付文字列
 */
function formatDate(date) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}