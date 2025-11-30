/**
 * ====================================
 * V2006: 案件一斉配信システム（オークション式）
 * ====================================
 *
 * 【機能】
 * - エリア内の全加盟店にメール送信
 * - メール内に「購入」「気になる」ボタン（GAS doGetへのリンク）
 * - 「購入」クリック → 残枠チェック → 空きあれば自動転送 & 管理者通知
 * - 「気になる」クリック → 管理者にメール通知
 *
 * 【データ構造】
 * - 「一斉配信」シート: 配信履歴
 * - 「一斉配信レスポンス」シート: 購入/気になるの応答履歴
 */

// V1903: 工事種別料金マッピング
var WORK_TYPE_PRICES = {
  // 通常料金 ¥20,000
  '外壁塗装': 20000,
  '外壁カバー工法': 20000,
  '外壁張替え': 20000,
  '屋根塗装（外壁工事含む）': 20000,
  '屋上防水（外壁工事含む）': 20000,
  '屋根葺き替え・張り替え※スレート・ガルバリウム等': 20000,
  '屋根葺き替え・張り替え※瓦': 20000,
  '屋根カバー工法': 20000,
  '外壁補修（外壁工事含む）': 20000,
  '屋根補修（外壁工事含む）': 20000,
  'ベランダ防水（外壁工事含む）': 20000,
  '内装水回り（バス・キッチン・トイレ）（外壁工事含む）': 20000,
  '内装（フローリングや畳などの床・クロス等）（外壁工事含む）': 20000,
  '外壁雨漏り修繕（外壁工事含む）': 20000,
  '屋根雨漏り修繕（屋根工事含む）': 20000,
  // 単品料金
  '屋根塗装単品': 10000,
  '屋上防水単品': 10000,
  '外壁補修単品': 5000,
  '屋根補修単品': 5000,
  'ベランダ防水単品': 5000,
  '外壁雨漏り修繕単品': 5000,
  '屋根雨漏り修繕単品': 5000
};

var SINGLE_ITEM_WORKS = [
  '屋根塗装単品', '屋上防水単品', '外壁補修単品', '屋根補修単品',
  'ベランダ防水単品', '外壁雨漏り修繕単品', '屋根雨漏り修繕単品'
];

var BroadcastSystem = {
  /**
   * GETリクエスト処理
   */
  handle: function(params) {
    const action = params.action;

    switch (action) {
      case 'broadcast_purchase':
        return this.handlePurchase(params);
      case 'broadcast_interest':
        return this.handleInterest(params);
      case 'getBroadcastTargets':
        return this.getBroadcastTargets(params);
      case 'getBroadcastPreview':
        return this.getBroadcastPreview(params);
      case 'sendBroadcast':
        return this.sendBroadcast(params);
      case 'getAppliedFranchises':
        return this.getAppliedFranchises(params);
      default:
        return { success: false, error: 'Unknown broadcast action: ' + action };
    }
  },

  /**
   * 一斉配信の対象加盟店数を取得（確認用）
   * @param {Object} params - { cvId }
   */
  getBroadcastTargets: function(params) {
    try {
      const cvId = params.cvId;
      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const userSheet = ss.getSheetByName('ユーザー登録');
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      const deliverySheet = ss.getSheetByName('配信管理');

      if (!userSheet) return { success: false, error: 'ユーザー登録シートが見つかりません' };
      if (!franchiseSheet) return { success: false, error: '加盟店登録シートが見つかりません' };

      // CV情報取得
      const cvData = this.getCVData(userSheet, cvId);
      if (!cvData) {
        return { success: false, error: 'CV情報が見つかりません' };
      }

      // デバッグ: cvDataのキーを確認
      console.log('[getBroadcastTargets] cvData keys:', Object.keys(cvData));
      console.log('[getBroadcastTargets] cvData都道府県関連:', JSON.stringify({
        '都道府県（物件）': cvData['都道府県（物件）'],
        '都道府県': cvData['都道府県'],
        'prefecture': cvData.prefecture,
        '住所詳細（物件）': cvData['住所詳細（物件）'],
        '住所詳細': cvData['住所詳細'],
        'address': cvData.address
      }));

      // エリア情報取得（カラム名: 都道府県（物件）、市区町村（物件）、住所詳細（物件））
      const prefecture = cvData['都道府県（物件）'] || cvData['都道府県'] || cvData.prefecture || this.extractPrefecture(cvData['住所詳細（物件）'] || cvData['住所詳細'] || cvData.address || '');
      const city = cvData['市区町村（物件）'] || cvData['市区町村'] || cvData.city || this.extractCity(cvData['住所詳細（物件）'] || cvData['住所詳細'] || cvData.address || '');

      console.log('[getBroadcastTargets] 抽出結果: prefecture=', prefecture, ', city=', city);

      if (!prefecture) {
        return { success: false, error: '都道府県情報がありません。cvDataキー: ' + Object.keys(cvData).join(', ') };
      }

      // エリア内の加盟店を取得
      const targetFranchises = this.getAreaFranchises(franchiseSheet, prefecture, city);

      // 既に転送済みの加盟店を除外
      const deliveredIds = this.getDeliveredFranchiseIds(deliverySheet, cvId);
      const availableFranchises = targetFranchises.filter(f => !deliveredIds.includes(f.id));

      // 残枠計算
      const maxCompanies = parseInt(cvData.companiesCount) || 4;
      const deliveredCount = deliveredIds.length;
      const remainingSlots = Math.max(0, maxCompanies - deliveredCount);

      return {
        success: true,
        cvId: cvId,
        area: `${prefecture} ${city || ''}`.trim(),
        totalTargets: availableFranchises.length,
        maxCompanies: maxCompanies,
        deliveredCount: deliveredCount,
        remainingSlots: remainingSlots,
        franchises: availableFranchises.map(f => ({
          id: f.id,
          name: f.name
        }))
      };
    } catch (error) {
      console.error('[getBroadcastTargets] エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 一斉配信メールプレビュー取得
   */
  getBroadcastPreview: function(params) {
    try {
      const cvId = params.cvId;
      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const userSheet = ss.getSheetByName('ユーザー登録');

      const cvData = this.getCVData(userSheet, cvId);
      if (!cvData) {
        return { success: false, error: 'CV情報が見つかりません' };
      }

      // 個人情報を含まないプレビュー用テンプレート生成
      const prefecture = cvData['都道府県（物件）'] || cvData['都道府県'] || this.extractPrefecture(cvData['住所詳細（物件）'] || cvData['住所詳細'] || '');
      const city = cvData['市区町村（物件）'] || cvData['市区町村'] || this.extractCity(cvData['住所詳細（物件）'] || cvData['住所詳細'] || '');
      const propertyType = cvData['依頼物件種別'] || cvData['物件種別'] || '';
      const buildingAge = cvData['築年数'] || '';
      const workItems = cvData['見積もり希望箇所'] || cvData['workItems'] || '';
      const maxCompanies = parseInt(cvData['companiesCount']) || 4;
      const fee = this.calculateFee(cvData, maxCompanies);

      const previewText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【外壁塗装くらべる】案件のご案内
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

○○○○ 御中

平素よりお世話になっております。
外壁塗装くらべる運営事務局でございます。

下記案件がございます。ご検討ください。

-------------------------------------------
【案件概要】
-------------------------------------------
エリア: ${prefecture} ${city}
物件種別: ${propertyType}
築年数: ${buildingAge}年
希望工事: ${workItems}
紹介料: ¥${fee.toLocaleString()}（税別）
残り枠: ${maxCompanies}社

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼ この案件に申し込む
[申し込みボタンURL]

▼ 気になる（担当者に通知）
[気になるボタンURL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※ 申し込み後、枠があれば自動で転送されます。

外壁塗装くらべる運営事務局`;

      // 含まれている情報・含まれていない情報を明示
      return {
        success: true,
        cvId: cvId,
        preview: previewText,
        includedInfo: [
          'エリア（市区町村まで）',
          '物件種別',
          '築年数',
          '希望工事',
          '紹介料',
          '残り枠'
        ],
        excludedInfo: [
          '氏名',
          '電話番号',
          '詳細住所',
          'メールアドレス'
        ]
      };
    } catch (error) {
      console.error('[getBroadcastPreview] エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 一斉配信メール送信
   * @param {Object} params - { cvId }
   */
  sendBroadcast: function(params) {
    try {
      console.log('[sendBroadcast] V2006 開始:', params);

      const cvId = params.cvId;
      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const userSheet = ss.getSheetByName('ユーザー登録');
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      const deliverySheet = ss.getSheetByName('配信管理');

      // 一斉配信シート取得（なければ作成）
      let broadcastSheet = ss.getSheetByName('一斉配信');
      if (!broadcastSheet) {
        broadcastSheet = ss.insertSheet('一斉配信');
        broadcastSheet.appendRow(['配信ID', 'CV ID', '配信日時', '対象加盟店数', '希望社数', '転送済み社数', '残枠', '購入済み加盟店', 'ステータス']);
      }

      // 一斉配信レスポンスシート取得（なければ作成）
      let responseSheet = ss.getSheetByName('一斉配信レスポンス');
      if (!responseSheet) {
        responseSheet = ss.insertSheet('一斉配信レスポンス');
        responseSheet.appendRow(['レスポンスID', '配信ID', '加盟店ID', '加盟店名', 'アクション', 'クリック日時', '結果', 'トークン', 'トークン使用済み']);
      }

      // CV情報取得
      const cvData = this.getCVData(userSheet, cvId);
      if (!cvData) {
        return { success: false, error: 'CV情報が見つかりません' };
      }

      // エリア情報取得（カラム名: 都道府県（物件）、市区町村（物件）、住所詳細（物件））
      const prefecture = cvData['都道府県（物件）'] || cvData['都道府県'] || cvData.prefecture || this.extractPrefecture(cvData['住所詳細（物件）'] || cvData['住所詳細'] || cvData.address || '');
      const city = cvData['市区町村（物件）'] || cvData['市区町村'] || cvData.city || this.extractCity(cvData['住所詳細（物件）'] || cvData['住所詳細'] || cvData.address || '');

      if (!prefecture) {
        return { success: false, error: '都道府県情報がありません' };
      }

      // エリア内の加盟店を取得
      const targetFranchises = this.getAreaFranchises(franchiseSheet, prefecture, city);

      // 既に転送済みの加盟店を除外
      const deliveredIds = this.getDeliveredFranchiseIds(deliverySheet, cvId);
      const availableFranchises = targetFranchises.filter(f => !deliveredIds.includes(f.id));

      if (availableFranchises.length === 0) {
        return { success: false, error: '配信対象の加盟店がありません' };
      }

      // 残枠計算
      const maxCompanies = parseInt(cvData.companiesCount) || 4;
      const deliveredCount = deliveredIds.length;
      const remainingSlots = Math.max(0, maxCompanies - deliveredCount);

      if (remainingSlots === 0) {
        return { success: false, error: '残り枠がありません' };
      }

      // 配信ID生成
      const now = new Date();
      const broadcastId = 'BC' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyMMddHHmmss');
      const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

      // 紹介料計算（残り枠数を使用）
      const fee = this.calculateFee(cvData, remainingSlots);

      // GAS WebアプリURL取得
      const scriptUrl = ScriptApp.getService().getUrl();

      // 各加盟店にメール送信 & レスポンスシートにトークン記録
      let sentCount = 0;
      const sentFranchises = [];

      availableFranchises.forEach((franchise, index) => {
        if (!franchise.email) {
          console.warn('[sendBroadcast] メールなし:', franchise.name);
          return;
        }

        // トークン生成
        const purchaseToken = Utilities.getUuid();
        const interestToken = Utilities.getUuid();

        // レスポンスシートにトークン記録（購入用）
        responseSheet.appendRow([
          'RSP' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyMMddHHmmss') + String(index).padStart(3, '0') + 'P',
          broadcastId,
          franchise.id,
          franchise.name,
          '購入',
          '',
          '',
          purchaseToken,
          false
        ]);

        // レスポンスシートにトークン記録（気になる用）
        responseSheet.appendRow([
          'RSP' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyMMddHHmmss') + String(index).padStart(3, '0') + 'I',
          broadcastId,
          franchise.id,
          franchise.name,
          '気になる',
          '',
          '',
          interestToken,
          false
        ]);

        // メール本文生成
        const emailBody = this.generateBroadcastEmail(
          cvData,
          franchise,
          fee,
          remainingSlots,
          scriptUrl,
          purchaseToken,
          interestToken,
          broadcastId
        );

        // メール送信
        try {
          GmailApp.sendEmail(
            franchise.email,
            `【外壁塗装くらべる】案件のご案内 - ${prefecture}${city || ''} (${cvId})`,
            emailBody,
            { name: '外壁塗装くらべる運営事務局' }
          );
          sentCount++;
          sentFranchises.push(franchise.name);
          console.log('[sendBroadcast] 送信成功:', franchise.name, franchise.email);
        } catch (emailError) {
          console.error('[sendBroadcast] 送信失敗:', franchise.name, emailError);
        }
      });

      // 一斉配信シートに記録
      broadcastSheet.appendRow([
        broadcastId,
        cvId,
        timestamp,
        sentCount,
        maxCompanies,
        deliveredCount,
        remainingSlots,
        '',
        '配信中'
      ]);

      console.log('[sendBroadcast] 完了:', sentCount, '件送信');

      return {
        success: true,
        broadcastId: broadcastId,
        sentCount: sentCount,
        remainingSlots: remainingSlots,
        message: `${sentCount}社に案件を配信しました`
      };
    } catch (error) {
      console.error('[sendBroadcast] エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 購入ボタンクリック処理（doGetから呼び出し）
   * V2007: 即転送ではなく申込記録のみ。管理者が手動で転送する。
   * @param {Object} params - { token, broadcastId }
   */
  handlePurchase: function(params) {
    try {
      console.log('[handlePurchase] V2007 申込記録モード:', params);

      const token = params.token;
      const broadcastId = params.broadcastId;

      if (!token) {
        return this.createHtmlResponse('エラー', 'トークンが無効です', 'error');
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const responseSheet = ss.getSheetByName('一斉配信レスポンス');
      const broadcastSheet = ss.getSheetByName('一斉配信');

      if (!responseSheet) {
        return this.createHtmlResponse('エラー', 'システムエラーが発生しました', 'error');
      }

      // トークン検証
      const responseData = responseSheet.getDataRange().getValues();
      const headers = responseData[0];
      const tokenIdx = headers.indexOf('トークン');
      const usedIdx = headers.indexOf('トークン使用済み');
      const franchiseIdIdx = headers.indexOf('加盟店ID');
      const franchiseNameIdx = headers.indexOf('加盟店名');
      const broadcastIdIdx = headers.indexOf('配信ID');
      const clickTimeIdx = headers.indexOf('クリック日時');
      const resultIdx = headers.indexOf('結果');

      let targetRow = -1;
      let franchiseId = '';
      let franchiseName = '';
      let foundBroadcastId = '';

      for (let i = 1; i < responseData.length; i++) {
        if (responseData[i][tokenIdx] === token) {
          // 使用済みチェック
          if (responseData[i][usedIdx] === true || responseData[i][usedIdx] === 'TRUE') {
            return this.createHtmlResponse('申込済み', 'このリンクは既に使用されています', 'warning');
          }
          targetRow = i + 1;
          franchiseId = responseData[i][franchiseIdIdx];
          franchiseName = responseData[i][franchiseNameIdx];
          foundBroadcastId = responseData[i][broadcastIdIdx];
          break;
        }
      }

      if (targetRow === -1) {
        return this.createHtmlResponse('エラー', '無効なリンクです', 'error');
      }

      // 配信情報からCV ID取得
      const broadcastData = broadcastSheet.getDataRange().getValues();
      const bHeaders = broadcastData[0];
      const bIdIdx = bHeaders.indexOf('配信ID');
      const bCvIdIdx = bHeaders.indexOf('CV ID');
      const bAppliedIdx = bHeaders.indexOf('申込済み加盟店');

      let broadcastRow = -1;
      let cvId = '';
      let appliedList = '';

      for (let i = 1; i < broadcastData.length; i++) {
        if (broadcastData[i][bIdIdx] === foundBroadcastId) {
          broadcastRow = i + 1;
          cvId = broadcastData[i][bCvIdIdx];
          appliedList = broadcastData[i][bAppliedIdx] || '';
          break;
        }
      }

      if (!cvId) {
        return this.createHtmlResponse('エラー', '案件情報が見つかりません', 'error');
      }

      const now = new Date();
      const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

      // V2007: 申込記録のみ（転送は実行しない）
      responseSheet.getRange(targetRow, clickTimeIdx + 1).setValue(timestamp);
      responseSheet.getRange(targetRow, resultIdx + 1).setValue('申込済み');
      responseSheet.getRange(targetRow, usedIdx + 1).setValue(true);

      // 一斉配信シートの申込済み加盟店を更新
      if (broadcastRow !== -1) {
        // 申込済み加盟店カラムがなければ購入済み加盟店カラムを使う
        let appliedColIdx = bAppliedIdx;
        if (appliedColIdx === -1) {
          appliedColIdx = bHeaders.indexOf('購入済み加盟店');
        }
        if (appliedColIdx !== -1) {
          const newApplied = appliedList ? appliedList + ',' + franchiseName : franchiseName;
          broadcastSheet.getRange(broadcastRow, appliedColIdx + 1).setValue(newApplied);
        }
      }

      // 管理者に通知（手動転送を促す）
      this.notifyAdmin(`【申込通知】${franchiseName}が案件${cvId}への転送を希望しています`, cvId, franchiseName, 'application');

      console.log('[handlePurchase] 申込記録完了:', cvId, franchiseName);

      return this.createHtmlResponse('申込完了', `${franchiseName}様、案件への申込を受け付けました。運営事務局より確認後、案件詳細をお送りいたします。`, 'success');
    } catch (error) {
      console.error('[handlePurchase] エラー:', error);
      return this.createHtmlResponse('エラー', 'システムエラーが発生しました', 'error');
    }
  },

  /**
   * 気になるボタンクリック処理
   * @param {Object} params - { token }
   */
  handleInterest: function(params) {
    try {
      console.log('[handleInterest] V2006 開始:', params);

      const token = params.token;

      if (!token) {
        return this.createHtmlResponse('エラー', 'トークンが無効です', 'error');
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const responseSheet = ss.getSheetByName('一斉配信レスポンス');
      const broadcastSheet = ss.getSheetByName('一斉配信');

      if (!responseSheet) {
        return this.createHtmlResponse('エラー', 'システムエラーが発生しました', 'error');
      }

      // トークン検証
      const responseData = responseSheet.getDataRange().getValues();
      const headers = responseData[0];
      const tokenIdx = headers.indexOf('トークン');
      const usedIdx = headers.indexOf('トークン使用済み');
      const franchiseIdIdx = headers.indexOf('加盟店ID');
      const franchiseNameIdx = headers.indexOf('加盟店名');
      const broadcastIdIdx = headers.indexOf('配信ID');
      const clickTimeIdx = headers.indexOf('クリック日時');
      const resultIdx = headers.indexOf('結果');

      let targetRow = -1;
      let franchiseName = '';
      let foundBroadcastId = '';

      for (let i = 1; i < responseData.length; i++) {
        if (responseData[i][tokenIdx] === token) {
          if (responseData[i][usedIdx] === true || responseData[i][usedIdx] === 'TRUE') {
            return this.createHtmlResponse('送信済み', 'このリンクは既に使用されています', 'warning');
          }
          targetRow = i + 1;
          franchiseName = responseData[i][franchiseNameIdx];
          foundBroadcastId = responseData[i][broadcastIdIdx];
          break;
        }
      }

      if (targetRow === -1) {
        return this.createHtmlResponse('エラー', '無効なリンクです', 'error');
      }

      // CV ID取得
      let cvId = '';
      if (broadcastSheet) {
        const bData = broadcastSheet.getDataRange().getValues();
        const bHeaders = bData[0];
        const bIdIdx = bHeaders.indexOf('配信ID');
        const bCvIdIdx = bHeaders.indexOf('CV ID');
        for (let i = 1; i < bData.length; i++) {
          if (bData[i][bIdIdx] === foundBroadcastId) {
            cvId = bData[i][bCvIdIdx];
            break;
          }
        }
      }

      const now = new Date();
      const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

      // 記録
      responseSheet.getRange(targetRow, clickTimeIdx + 1).setValue(timestamp);
      responseSheet.getRange(targetRow, resultIdx + 1).setValue('通知済み');
      responseSheet.getRange(targetRow, usedIdx + 1).setValue(true);

      // 管理者に通知
      this.notifyAdmin(`【気になる通知】${franchiseName}が案件${cvId}に興味を示しています`, cvId, franchiseName, 'interest');

      return this.createHtmlResponse('送信完了', `${franchiseName}様、ご関心をいただきありがとうございます。担当者より改めてご連絡いたします。`, 'success');
    } catch (error) {
      console.error('[handleInterest] エラー:', error);
      return this.createHtmlResponse('エラー', 'システムエラーが発生しました', 'error');
    }
  },

  /**
   * CV情報取得
   */
  getCVData: function(userSheet, cvId) {
    const data = userSheet.getDataRange().getValues();
    const headers = data[0];
    const cvIdIdx = headers.indexOf('CV ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][cvIdIdx] === cvId) {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = data[i][idx];
        });
        return obj;
      }
    }
    return null;
  },

  /**
   * 都道府県を抽出
   */
  extractPrefecture: function(address) {
    if (!address) return '';
    const match = address.match(/^(.{2,3}[都道府県])/);
    return match ? match[1] : '';
  },

  /**
   * 市区町村を抽出
   */
  extractCity: function(address) {
    if (!address) return '';
    const match = address.match(/[都道府県](.+?[市区町村])/);
    return match ? match[1] : '';
  },

  /**
   * エリア内の加盟店を取得（都道府県のみでマッチング、全加盟店対象）
   */
  getAreaFranchises: function(franchiseSheet, prefecture, city) {
    const data = franchiseSheet.getDataRange().getValues();
    const headers = data[0];

    console.log('[getAreaFranchises] headers:', headers);

    const idIdx = headers.indexOf('登録ID');
    const nameIdx = headers.indexOf('会社名');
    const emailIdx = headers.indexOf('営業用メールアドレス') !== -1 ? headers.indexOf('営業用メールアドレス') : headers.indexOf('メールアドレス');
    const statusIdx = headers.indexOf('ステータス');
    const citiesIdx = headers.indexOf('対応市区町村');

    console.log('[getAreaFranchises] indexes:', { idIdx, nameIdx, emailIdx, statusIdx, citiesIdx });
    console.log('[getAreaFranchises] 検索条件: city=', city);

    const franchises = [];
    let totalRows = 0;
    let activeCount = 0;

    for (let i = 1; i < data.length; i++) {
      // 空行スキップ
      if (!data[i][idIdx]) continue;
      totalRows++;

      const status = data[i][statusIdx];
      // アクティブな加盟店のみ
      if (status !== 'アクティブ') {
        continue;
      }
      activeCount++;

      const cities = data[i][citiesIdx] || '';
      // エリアマッチング: 対応市区町村に案件の市区町村が含まれている
      const isMatch = city && cities.includes(city);

      if (isMatch) {
        franchises.push({
          id: data[i][idIdx],
          name: data[i][nameIdx],
          email: data[i][emailIdx]
        });
      }
    }

    console.log('[getAreaFranchises] 結果: totalRows=', totalRows, ', activeCount=', activeCount, ', matched=', franchises.length);

    return franchises;
  },

  /**
   * 転送済み加盟店IDリストを取得
   */
  getDeliveredFranchiseIds: function(deliverySheet, cvId) {
    if (!deliverySheet) return [];

    const data = deliverySheet.getDataRange().getValues();
    const headers = data[0];
    const cvIdIdx = headers.indexOf('CV ID');
    const franchiseIdIdx = headers.indexOf('加盟店ID');

    const ids = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][cvIdIdx] === cvId) {
        ids.push(data[i][franchiseIdIdx]);
      }
    }
    return ids;
  },

  /**
   * V1904: 紹介料計算（動的ルール対応）
   * ルール:
   * 1. 1社紹介 → ¥20,000 固定
   * 2. 複数社 + 3F以上 + 戸建て以外 → ¥30,000（単品のみは除外）
   * 3. 複数社 + (戸建てまたは2F以下) → 工事種別の最高料金
   * 4. 複数社 + 単品のみ → 単品料金
   */
  calculateFee: function(cvData, franchiseCount) {
    franchiseCount = franchiseCount || 1;

    // 1社紹介の場合は必ず¥20,000
    if (franchiseCount === 1) {
      return 20000;
    }

    // 工事種別を取得
    const workItemsStr = cvData['見積もり希望箇所'] || cvData['workItems'] || '';
    const workTypes = workItemsStr.split(/[,、\n]/).map(function(s) { return s.trim(); }).filter(function(s) { return s; });

    if (workTypes.length === 0) {
      return 20000;
    }

    // 全て単品かチェック
    var allSingleItems = workTypes.every(function(work) {
      return SINGLE_ITEM_WORKS.indexOf(work) !== -1;
    });

    // 物件種別と階数を取得
    var propertyType = cvData['依頼物件種別'] || cvData['物件種別'] || '';
    var floors = parseInt(cvData['階数'] || cvData['floors'] || 0);

    // 複数社紹介 + 3階以上 + 戸建て以外 → ¥30,000（単品のみは除外）
    if (franchiseCount > 1 && floors >= 3 && propertyType !== '戸建て' && !allSingleItems) {
      return 30000;
    }

    // 通常ケース: 最高料金を返す
    var maxPrice = 0;
    workTypes.forEach(function(workType) {
      var price = WORK_TYPE_PRICES[workType] || 20000;
      if (price > maxPrice) {
        maxPrice = price;
      }
    });

    return maxPrice || 20000;
  },

  /**
   * V2007: 指定CV IDの申込済み加盟店リストを取得
   * 業者カードに「申込済」バッジ表示用
   * @param {Object} params - { cvId }
   */
  getAppliedFranchises: function(params) {
    try {
      const cvId = params.cvId;
      if (!cvId) {
        return { success: false, error: 'CV IDが指定されていません' };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const responseSheet = ss.getSheetByName('一斉配信レスポンス');
      const broadcastSheet = ss.getSheetByName('一斉配信');

      if (!responseSheet || !broadcastSheet) {
        return { success: true, appliedFranchises: [] };
      }

      // まず一斉配信シートから該当CVの配信IDを取得
      const broadcastData = broadcastSheet.getDataRange().getValues();
      const bHeaders = broadcastData[0];
      const bIdIdx = bHeaders.indexOf('配信ID');
      const bCvIdIdx = bHeaders.indexOf('CV ID');

      const broadcastIds = [];
      for (let i = 1; i < broadcastData.length; i++) {
        if (broadcastData[i][bCvIdIdx] === cvId) {
          broadcastIds.push(broadcastData[i][bIdIdx]);
        }
      }

      if (broadcastIds.length === 0) {
        return { success: true, appliedFranchises: [] };
      }

      // レスポンスシートから申込済みの加盟店を取得
      const responseData = responseSheet.getDataRange().getValues();
      const rHeaders = responseData[0];
      const rBroadcastIdIdx = rHeaders.indexOf('配信ID');
      const rFranchiseIdIdx = rHeaders.indexOf('加盟店ID');
      const rFranchiseNameIdx = rHeaders.indexOf('加盟店名');
      const rActionIdx = rHeaders.indexOf('アクション');
      const rResultIdx = rHeaders.indexOf('結果');
      const rClickTimeIdx = rHeaders.indexOf('クリック日時');

      const appliedFranchises = [];
      for (let i = 1; i < responseData.length; i++) {
        const broadcastId = responseData[i][rBroadcastIdIdx];
        const result = responseData[i][rResultIdx];
        const action = responseData[i][rActionIdx];

        // 該当CV、申込済み（購入アクション）のみ
        if (broadcastIds.includes(broadcastId) && action === '購入' && result === '申込済み') {
          appliedFranchises.push({
            franchiseId: responseData[i][rFranchiseIdIdx],
            franchiseName: responseData[i][rFranchiseNameIdx],
            appliedAt: responseData[i][rClickTimeIdx] || ''
          });
        }
      }

      console.log('[getAppliedFranchises] CV:', cvId, '申込:', appliedFranchises.length, '件');

      return {
        success: true,
        cvId: cvId,
        appliedFranchises: appliedFranchises
      };
    } catch (error) {
      console.error('[getAppliedFranchises] エラー:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 一斉配信メール本文生成
   */
  generateBroadcastEmail: function(cvData, franchise, fee, remainingSlots, scriptUrl, purchaseToken, interestToken, broadcastId) {
    const prefecture = cvData['都道府県（物件）'] || cvData['都道府県'] || this.extractPrefecture(cvData['住所詳細（物件）'] || cvData['住所詳細'] || '');
    const city = cvData['市区町村（物件）'] || cvData['市区町村'] || this.extractCity(cvData['住所詳細（物件）'] || cvData['住所詳細'] || '');
    const propertyType = cvData['依頼物件種別'] || cvData['物件種別'] || '';
    const buildingAge = cvData['築年数'] || '';
    const workItems = cvData['見積もり希望箇所'] || cvData['workItems'] || '';

    const purchaseUrl = `${scriptUrl}?action=broadcast_purchase&token=${purchaseToken}&broadcastId=${broadcastId}`;
    const interestUrl = `${scriptUrl}?action=broadcast_interest&token=${interestToken}`;

    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【外壁塗装くらべる】案件のご案内
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${franchise.name} 御中

平素よりお世話になっております。
外壁塗装くらべる運営事務局でございます。

下記案件がございます。ご検討ください。

-------------------------------------------
【案件概要】
-------------------------------------------
エリア: ${prefecture} ${city}
物件種別: ${propertyType}
築年数: ${buildingAge}年
希望工事: ${workItems}
紹介料: ¥${fee.toLocaleString()}（税別）
残り枠: ${remainingSlots}社

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼ この案件に申し込む
${purchaseUrl}

▼ 気になる（担当者に通知）
${interestUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※ 申し込み後、枠があれば自動で転送されます。

外壁塗装くらべる運営事務局
`;
  },

  /**
   * 管理者に通知メール
   */
  notifyAdmin: function(subject, cvId, franchiseName, actionType) {
    try {
      const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
      if (!adminEmail) {
        console.warn('[notifyAdmin] ADMIN_EMAIL未設定');
        return;
      }

      const body = `
案件ID: ${cvId}
加盟店名: ${franchiseName}
アクション: ${actionType === 'purchase' ? '申し込み' : '気になる'}
日時: ${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')}
`;

      GmailApp.sendEmail(adminEmail, subject, body, {
        name: '外壁塗装くらべる システム通知'
      });
    } catch (error) {
      console.error('[notifyAdmin] エラー:', error);
    }
  },

  /**
   * HTMLレスポンス生成
   */
  createHtmlResponse: function(title, message, type) {
    const colorMap = {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444'
    };
    const color = colorMap[type] || '#3b82f6';

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 外壁塗装くらべる</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${color};
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.6;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      ${type === 'success' ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' :
        type === 'warning' ? '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>' :
        '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>'}
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="footer">外壁塗装くらべる</div>
  </div>
</body>
</html>`;

    return HtmlService.createHtmlOutput(html)
      .setTitle(title)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
};
