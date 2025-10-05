/**
 * 加盟店登録処理ハンドラー
 */

/**
 * 加盟店登録処理
 * @param {Object} data - リクエストデータ
 * @return {ContentService.TextOutput} レスポンス
 */
function handleFranchiseRegister(data) {
  try {
    console.log('=== 加盟店登録開始 ===');
    console.log('会社名:', data.companyInfo?.companyName);

    // スプレッドシートIDの確認
    const scriptProps = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');
    console.log('SPREADSHEET_ID存在確認:', !!spreadsheetId);

    // 受信データの詳細確認
    console.log('=== 受信データ構造 ===');
    console.log('companyInfo keys:', Object.keys(data.companyInfo || {}));
    console.log('companyInfo全体:', JSON.stringify(data.companyInfo));
    console.log('branches data:', data.companyInfo?.branches);
    console.log('identityDocument keys:', Object.keys(data.identityDocument || {}));
    console.log('detailInfo keys:', Object.keys(data.detailInfo || {}));
    console.log('selectedAreas keys:', Object.keys(data.selectedAreas || {}));

    // シートを取得
    const sheet = getFranchiseSheet();
    const headers = getFranchiseHeaders();

    // 登録ID生成（短縮版：FR + 日時6桁）
    const now = new Date();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const hour = ('0' + now.getHours()).slice(-2);
    const min = ('0' + now.getMinutes()).slice(-2);
    const registrationId = 'FR' + month + day + hour + min;

    // データ配列を作成（36列）
    const rowData = [];

    // A: タイムスタンプ
    rowData.push(now);

    // B: 登録ID
    rowData.push(registrationId);

    // C: 会社名
    rowData.push(data.companyInfo?.companyName || '');

    // D: 会社名カナ
    rowData.push(data.companyInfo?.companyNameKana || '');

    // E: 屋号
    rowData.push(data.companyInfo?.businessName || '');

    // F: 屋号カナ
    rowData.push(data.companyInfo?.businessNameKana || '');

    // G: 代表者名
    rowData.push(data.companyInfo?.representative || '');

    // H: 代表者名カナ
    rowData.push(data.companyInfo?.representativeKana || '');

    // I: 郵便番号
    rowData.push(data.companyInfo?.postalCode || '');

    // J: 住所
    rowData.push(data.companyInfo?.fullAddress || '');

    // K: 電話番号
    rowData.push(data.companyInfo?.phone || '');

    // L: ウェブサイトURL
    rowData.push(data.companyInfo?.websiteUrl || '');

    // M: 設立年月
    rowData.push(data.companyInfo?.establishedDate || '');

    // N: PRテキスト（短縮版とフル版の処理）
    let prTextToSave = '';
    if (data.detailInfo?.prTextFull) {
      // 完全版が存在する場合、完全版を保存
      prTextToSave = data.detailInfo.prTextFull;
      console.log('★ PR文完全版を保存:', prTextToSave.length + '文字');
    } else if (data.detailInfo?.prText) {
      // detailInfoのPR文を使用
      prTextToSave = data.detailInfo.prText;
      console.log('★ detailInfoのPR文を保存:', prTextToSave.length + '文字');
    } else if (data.companyInfo?.prText) {
      // companyInfoのPR文を使用（後方互換性）
      prTextToSave = data.companyInfo.prText;
      console.log('★ companyInfoのPR文を保存:', prTextToSave.length + '文字');
    }
    rowData.push(prTextToSave);

    // O: 支店名（カンマ区切り）
    const branches = data.companyInfo?.branches || [];
    console.log('★★★ 支店データ受信:', branches);
    console.log('★★★ 支店データ型:', typeof branches);
    console.log('★★★ 支店データ長:', branches.length);
    console.log('★★★ 支店データ内容:', JSON.stringify(branches));

    const branchNames = Array.isArray(branches)
      ? branches.map(b => b.name || '').filter(name => name).join('、')
      : '';
    rowData.push(branchNames); // インデックス14（O列）
    console.log('★★★ O列[14](支店名):', branchNames || '(空)');

    // P: 支店住所（カンマ区切り）
    const branchAddresses = Array.isArray(branches)
      ? branches.map(b => b.address || '').filter(addr => addr).join('、')
      : '';
    rowData.push(branchAddresses); // インデックス15（P列）
    console.log('★★★ P列[15](支店住所):', branchAddresses || '(空)');

    // Q: 利用規約同意
    rowData.push(data.termsAgreed ? '同意' : '未同意');

    // R: 本人確認書類種類
    const docType = data.identityDocument?.type || '';
    const docTypeJP = {
      'drivers_license': '運転免許証',
      'mynumber': 'マイナンバーカード',
      'passport': 'パスポート',
      'insurance': '健康保険証'
    };
    rowData.push(docTypeJP[docType] || docType);

    // S, T: 本人確認書類URL1, URL2 (Drive保存を実行 - 複数枚対応)
    let documentUrl1 = '';
    let documentUrl2 = '';

    if (data.identityDocument && data.identityDocument.images && data.identityDocument.images.length > 0) {
      // 全ての画像を保存
      for (let i = 0; i < data.identityDocument.images.length; i++) {
        const image = data.identityDocument.images[i];
        const saveResult = saveIdentityDocument(
          {
            data: image.data,
            type: data.identityDocument.type || 'drivers_license',
            side: image.side
          },
          registrationId,
          data.companyInfo?.companyName || ''
        );

        if (saveResult.success) {
          // 1枚目か2枚目かで振り分け
          if (i === 0) {
            documentUrl1 = saveResult.fileInfo.fileUrl;
          } else if (i === 1) {
            documentUrl2 = saveResult.fileInfo.fileUrl;
          }
          console.log('本人確認書類保存成功:', saveResult.fileInfo.fileName);
        }
      }
    }

    // S: 本人確認書類URL1
    rowData.push(documentUrl1);

    // T: 本人確認書類URL2
    rowData.push(documentUrl2);

    // U: 情報確認同意
    rowData.push(data.informationConfirmed ? '確認済' : '未確認');

    // V: 請求用メールアドレス
    rowData.push(data.detailInfo?.billingEmail || '');

    // W: 営業用メールアドレス
    rowData.push(data.detailInfo?.salesEmail || '');

    // X: 営業担当者氏名
    rowData.push(data.detailInfo?.salesPersonName || '');

    // Y: 営業担当者カナ
    rowData.push(data.detailInfo?.salesPersonKana || '');

    // Z: 従業員数
    rowData.push(data.detailInfo?.employees || '');

    // AA: 売上規模
    rowData.push(data.detailInfo?.revenue || '');

    // AB: 対応可能物件種別
    const propertyTypes = data.detailInfo?.propertyTypes;
    if (Array.isArray(propertyTypes)) {
      rowData.push(propertyTypes.join(', '));
    } else {
      rowData.push(propertyTypes || '');
    }

    // AC: 最大対応階数
    const floors = data.detailInfo?.propertyFloors;
    // propertyFloorsは既に"戸建て住宅(3階まで),アパート・マンション(5階まで)"形式の文字列
    rowData.push(floors || '');

    // AD: 築年数対応範囲
    const ageRange = data.detailInfo?.buildingAgeRange;
    if (ageRange && ageRange.min !== undefined && ageRange.max !== undefined) {
      rowData.push('築' + ageRange.min + '年～' + ageRange.max + '年');
    } else {
      rowData.push('');
    }

    // AE: 施工箇所
    rowData.push(data.detailInfo?.constructionTypes || '');

    // AF: 特殊対応項目
    rowData.push(data.detailInfo?.specialServices || '');

    // AG: 対応都道府県（配列チェックして文字列化）
    const prefectures = data.selectedAreas?.prefectures;
    if (typeof prefectures === 'string') {
      rowData.push(prefectures);
    } else if (Array.isArray(prefectures)) {
      rowData.push(prefectures.join(','));
    } else {
      rowData.push('');
    }

    // AH: 対応市区町村（配列チェックして文字列化）
    const cities = data.selectedAreas?.cities;
    if (typeof cities === 'string') {
      rowData.push(cities);
    } else if (Array.isArray(cities)) {
      rowData.push(cities.join(','));
    } else {
      rowData.push('');
    }

    // AI: 優先エリア（配列チェックして文字列化）
    const priorityAreas = data.selectedAreas?.priorityAreas;
    if (typeof priorityAreas === 'string') {
      rowData.push(priorityAreas);
    } else if (Array.isArray(priorityAreas)) {
      rowData.push(priorityAreas.join(','));
    } else {
      rowData.push('');
    }

    // AJ: ステータス
    rowData.push('新規登録');

    // AK: 承認ステータス
    rowData.push('申請中');

    // AL: 登録日時（承認時設定のため空）
    rowData.push('');

    // 列数チェック
    if (rowData.length !== headers.length) {
      throw new Error('データ列数エラー: ヘッダー' + headers.length + '列, データ' + rowData.length + '列');
    }

    // デバッグ出力
    console.log('ヘッダー数:', headers.length);
    console.log('データ数:', rowData.length);
    console.log('=== データ詳細（インデックス確認） ===');

    // 各列のデータを確認（特に13～20列目を重点的に）
    for (let i = 0; i < rowData.length; i++) {
      let value = rowData[i];
      if (value instanceof Date) {
        value = value.toISOString();
      } else if (typeof value === 'string' && value.length > 30) {
        value = value.substring(0, 30) + '...';
      } else if (value === '') {
        value = '(空)';
      }

      // 13列目から20列目は詳細表示
      if (i >= 13 && i <= 20) {
        console.log(`★ ${i}列目[${headers[i]}]: ${value}`);
      } else {
        console.log(`  ${i}列目[${headers[i]}]: ${value}`);
      }
    }

    console.log('=== 重要列の再確認 ===');
    console.log('インデックス13[N列-PRテキスト]:', rowData[13]?.substring(0, 30) || '(空)');
    console.log('インデックス14[O列-支店名]:', rowData[14] || '(空)');
    console.log('インデックス15[P列-支店住所]:', rowData[15] || '(空)');
    console.log('インデックス16[Q列-利用規約]:', rowData[16]);
    console.log('インデックス17[R列-本人確認書類]:', rowData[17]);

    // データをシートに追加
    sheet.appendRow(rowData);

    // Drive保存状態を含めたレスポンス
    const responseData = {
      registrationId: registrationId,
      rowNumber: sheet.getLastRow()
    };

    // Drive保存結果を追加
    if (documentUrl1 && documentUrl1.includes('drive.google.com')) {
      responseData.driveStatus = {
        success: true,
        fileUrl: documentUrl1
      };
    } else if (data.identityDocument && data.identityDocument.images) {
      responseData.driveStatus = {
        success: false,
        message: 'Drive保存に失敗しましたが、登録は完了しました'
      };
    }

    // Slack通知を送信（エラーが発生してもレスポンスは返す）
    try {
      console.log('=== Slack通知処理開始 ===');
      console.log('Slack Webhook URL存在確認:', !!PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL'));

      const notificationData = {
        registrationId: registrationId,
        companyName: data.companyInfo?.companyName || data.companyName || '不明',
        companyInfo: data.companyInfo || {},
        selectedPrefectures: data.selectedAreas?.prefectures ? [data.selectedAreas.prefectures] : []
      };

      console.log('通知データ:', JSON.stringify(notificationData));

      const slackResult = sendSlackRegistrationNotification(notificationData);

      responseData.slackNotification = slackResult.success ? 'sent' : 'failed';
      console.log('Slack通知結果:', slackResult);
    } catch (slackError) {
      console.error('Slack通知エラー（無視して続行）:', slackError);
      console.error('エラー詳細:', slackError.stack);
      responseData.slackNotification = 'error: ' + slackError.toString();
    }

    // 成功レスポンス
    return createSuccessResponse('加盟店登録が完了しました', responseData);

  } catch(error) {
    console.error('=== 加盟店登録エラー ===');
    console.error('エラー内容:', error);
    console.error('エラースタック:', error.stack);
    return createErrorResponse('加盟店登録エラー: ' + error.toString(), error);
  }
}

/**
 * 加盟店一覧取得処理
 * @param {Object} params - リクエストパラメータ
 * @return {ContentService.TextOutput} レスポンス
 */
function handleGetFranchiseList(params) {
  try {
    const sheet = getFranchiseSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return createSuccessResponse('データがありません', []);
    }

    // ヘッダーを除外してデータを返す
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });

      // 圧縮データの展開処理
      // 支店情報（O列:14, P列:15）
      if (row[14] && row[15]) {
        const branchNames = row[14].split('、');
        const branchAddresses = row[15].split('、');
        obj['支店情報'] = branchNames.map((name, i) => ({
          name: name,
          address: branchAddresses[i] || ''
        }));
      } else {
        obj['支店情報'] = [];
      }

      // 対応物件種別（AB列:27）
      if (row[27]) {
        obj['対応物件種別_配列'] = row[27].split(',').map(t => t.trim());
      }

      // 対応都道府県（AG列:32）
      if (row[32]) {
        obj['対応都道府県_配列'] = row[32].split(',').map(p => p.trim());
      }

      // 対応市区町村（AH列:33）
      if (row[33]) {
        obj['対応市区町村_配列'] = row[33].split(',').map(c => c.trim());
      }

      // 優先エリア（AI列:34）
      if (row[34]) {
        obj['優先エリア_配列'] = row[34].split(',').map(a => a.trim());
      }

      return obj;
    });

    return createSuccessResponse('加盟店一覧を取得しました', rows);

  } catch(error) {
    return createErrorResponse('一覧取得エラー', error);
  }
}

/**
 * 加盟店データ取得処理
 * @param {Object} data - リクエストデータ
 * @return {ContentService.TextOutput} レスポンス
 */
function handleGetFranchiseData(data) {
  try {
    const registrationId = data.registrationId;
    if (!registrationId) {
      return createResponse(false, '登録IDが指定されていません');
    }

    const sheet = getFranchiseSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // 登録IDで検索（B列）
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === registrationId) {
        const headers = values[0];
        const franchiseData = {};

        headers.forEach((header, index) => {
          franchiseData[header] = values[i][index];
        });

        return createSuccessResponse('データを取得しました', franchiseData);
      }
    }

    return createResponse(false, '指定された登録IDのデータが見つかりません');

  } catch(error) {
    return createErrorResponse('データ取得エラー', error);
  }
}

/**
 * 加盟店データ更新処理
 * @param {Object} data - リクエストデータ
 * @return {ContentService.TextOutput} レスポンス
 */
function handleFranchiseUpdate(data) {
  try {
    // TODO: 実装
    return createResponse(false, '更新機能は未実装です');
  } catch(error) {
    return createErrorResponse('更新エラー', error);
  }
}