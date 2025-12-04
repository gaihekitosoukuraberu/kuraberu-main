/**
 * ====================================
 * 加盟店 成約報告システム
 * ====================================
 *
 * 【機能】
 * - 配信済み案件一覧取得
 * - 成約報告登録
 *
 * 【依存関係】
 * - 配信管理シート（読み取り） ← 主データソース
 * - ユーザー登録シート（読み取り・書き込み） ← 顧客情報JOIN用 & 成約情報更新
 *
 * 【影響範囲】
 * - フロント: franchise-dashboard（成約報告メニュー）
 *
 * 【変更時の注意】
 * ⚠️  配信管理シートの「配信ステータス」は「配信済み」（末尾に「み」）
 * ⚠️  加盟店IDは直接比較（includes不要）
 * ⚠️  管理ステータスの遷移ロジックに注意
 */

/**
 * 連絡履歴JSONをパースするヘルパー関数
 * @param {string} jsonStr - JSON文字列
 * @return {Array} - パース結果（配列）
 */
function parseCallHistoryJSON(jsonStr) {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[parseCallHistoryJSON] Parse error:', e.message);
    return [];
  }
}

var MerchantContractReport = {
  /**
   * 配信済み案件一覧を取得（成約報告対象）
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success: boolean, cases: Array }
   */
  getDeliveredCases: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      console.log('[MerchantContractReport] getDeliveredCases - 加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!deliverySheet) {
        return {
          success: false,
          error: '配信管理シートが見つかりません'
        };
      }

      if (!userSheet) {
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // ユーザー登録シートから顧客情報マップを作成（CV ID → 顧客情報）
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const userCvIdIdx = userHeaders.indexOf('CV ID');
      const userNameIdx = userHeaders.indexOf('氏名');
      const userNameKanaIdx = userHeaders.indexOf('フリガナ');
      const userTelIdx = userHeaders.indexOf('電話番号');
      const userPrefectureIdx = userHeaders.indexOf('都道府県（物件）');
      const userCityIdx = userHeaders.indexOf('市区町村（物件）');
      const userAddressDetailIdx = userHeaders.indexOf('住所詳細（物件）');
      const userAddressKanaIdx = userHeaders.indexOf('住所フリガナ');
      const userWorkCategoryIdx = userHeaders.indexOf('工事種別');
      const userContractMerchantIdIdx = userHeaders.indexOf('成約加盟店ID');

      // CV ID → ユーザー情報マップ
      const userMap = {};
      userRows.forEach(row => {
        const cvId = row[userCvIdIdx];
        if (cvId) {
          const prefecture = userPrefectureIdx >= 0 ? (row[userPrefectureIdx] || '') : '';
          const city = userCityIdx >= 0 ? (row[userCityIdx] || '') : '';
          const addressDetail = userAddressDetailIdx >= 0 ? (row[userAddressDetailIdx] || '') : '';
          const fullAddress = prefecture + city + addressDetail;

          userMap[cvId] = {
            customerName: row[userNameIdx] || '',
            customerNameKana: userNameKanaIdx >= 0 ? (row[userNameKanaIdx] || '') : '',
            tel: row[userTelIdx] || '',
            address: fullAddress,
            addressKana: userAddressKanaIdx >= 0 ? (row[userAddressKanaIdx] || '') : '',
            workCategory: row[userWorkCategoryIdx] || '',
            contractMerchantId: row[userContractMerchantIdIdx] || ''
          };
        }
      });

      // 配信管理シートから配信済み案件を取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const deliveryRows = deliveryData.slice(1);

      const delCvIdIdx = deliveryHeaders.indexOf('CV ID');
      const delMerchantIdIdx = deliveryHeaders.indexOf('加盟店ID');
      const delDeliveredAtIdx = deliveryHeaders.indexOf('配信日時');
      const delStatusIdx = deliveryHeaders.indexOf('配信ステータス');
      const delDetailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');
      const delSurveyDateIdx = deliveryHeaders.indexOf('現調日時');

      // 配信済み案件を抽出（この加盟店に配信されていて、まだこの加盟店が成約報告していないもの）
      const deliveredCases = [];

      for (let i = 0; i < deliveryRows.length; i++) {
        const row = deliveryRows[i];
        const cvId = row[delCvIdIdx];
        const rowMerchantId = row[delMerchantIdIdx];
        const deliveredAt = row[delDeliveredAtIdx];
        const deliveryStatus = row[delStatusIdx];
        const detailStatus = row[delDetailStatusIdx];

        // 空行スキップ
        if (!cvId) continue;

        // この加盟店に配信されているか確認（完全一致）
        if (rowMerchantId !== merchantId && rowMerchantId !== String(merchantId)) {
          continue;
        }

        // 配信ステータスが「配信済み」（末尾に「み」）
        if (deliveryStatus !== '配信済み') {
          continue;
        }

        // ユーザー情報を取得
        const userInfo = userMap[cvId];
        if (!userInfo) {
          continue; // ユーザー登録シートにない案件はスキップ
        }

        // すでにこの加盟店が成約報告済みの場合はスキップ
        if (userInfo.contractMerchantId === merchantId || userInfo.contractMerchantId === String(merchantId)) {
          continue;
        }

        // 現調日時を取得
        const surveyDate = delSurveyDateIdx >= 0 ? (row[delSurveyDateIdx] || '') : '';

        // 案件情報を追加
        deliveredCases.push({
          cvId: cvId,
          customerName: userInfo.customerName,
          customerNameKana: userInfo.customerNameKana,
          tel: userInfo.tel,
          address: userInfo.address,
          addressKana: userInfo.addressKana,
          workCategory: userInfo.workCategory,
          deliveredAt: deliveredAt || '',
          managementStatus: detailStatus || '配信済み',
          surveyDate: surveyDate
        });
      }

      console.log('[MerchantContractReport] getDeliveredCases - 取得件数:', deliveredCases.length);

      return {
        success: true,
        cases: deliveredCases
      };

    } catch (error) {
      console.error('[MerchantContractReport] getDeliveredCases error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 成約報告を登録
   * @param {Object} params - {
   *   merchantId: 加盟店ID,
   *   merchantName: 加盟店名,
   *   cvId: CV ID,
   *   reportType: 報告種別（成約報告/追加工事報告）,
   *   currentStatus: 現在の状況（契約前・口頭確約済/契約後・工事前/工事中/工事完了後）,
   *   contractDate: 成約日,
   *   contractAmount: 成約金額（税込）,
   *   constructionEndDate: 完工予定日,
   *   paymentDueDate: 着金予定日,
   *   propertyType: 対象物件種別,
   *   floors: 階数,
   *   workContent: 施工内容（配列）,
   *   estimateFileUrl: 見積書URL,
   *   receiptFileUrl: 領収書URL
   * }
   * @return {Object} - { success: boolean }
   */
  submitContractReport: function(params) {
    try {
      const {
        merchantId,
        merchantName,
        cvId,
        reportType,
        currentStatus,
        contractDate,
        contractAmount,
        constructionEndDate,
        paymentDueDate,
        propertyType,
        floors,
        workContent,
        estimateFileUrl,
        receiptFileUrl
      } = params;

      // バリデーション
      if (!merchantId || !cvId) {
        return {
          success: false,
          error: '必須パラメータが不足しています（merchantId, cvId）'
        };
      }

      if (!contractAmount) {
        return {
          success: false,
          error: '成約金額は必須です'
        };
      }

      console.log('[MerchantContractReport] submitContractReport - CV ID:', cvId, '加盟店ID:', merchantId);

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!userSheet) {
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // ヘッダーとデータ取得
      const data = userSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // 必要なカラムのインデックス取得
      const cvIdIdx = headers.indexOf('CV ID');
      const contractMerchantIdIdx = headers.indexOf('成約加盟店ID');
      const contractMerchantNameIdx = headers.indexOf('成約加盟店名');
      const contractDateIdx = headers.indexOf('成約日');
      const contractAmountIdx = headers.indexOf('成約金額');
      const workContentIdx = headers.indexOf('見積工事内容');
      const paymentDueDateIdx = headers.indexOf('入金予定日');
      const managementStatusIdx = headers.indexOf('管理ステータス');
      const constructionEndDateIdx = headers.indexOf('工事完了予定日');
      const constructionStatusIdx = headers.indexOf('工事進捗ステータス');
      const additionalWorkFlagIdx = headers.indexOf('追加工事フラグ');
      const propertyTypeIdx = headers.indexOf('Q1_物件種別');
      const floorsIdx = headers.indexOf('Q2_階数');
      const contractReportDateIdx = headers.indexOf('成約報告日');

      // CV IDで行を検索
      let targetRow = -1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][cvIdIdx] === cvId) {
          targetRow = i + 2; // ヘッダー分+1、0-indexed分+1
          break;
        }
      }

      if (targetRow === -1) {
        return {
          success: false,
          error: '指定されたCV IDが見つかりません: ' + cvId
        };
      }

      // 報告種別に応じた処理
      const isAdditionalWork = reportType === '追加工事報告';

      // 追加工事報告でない場合のみ成約加盟店IDをチェック
      if (!isAdditionalWork) {
        const currentContractMerchantId = rows[targetRow - 2][contractMerchantIdIdx];
        if (currentContractMerchantId && currentContractMerchantId !== '') {
          return {
            success: false,
            error: 'この案件はすでに成約報告済みです（加盟店ID: ' + currentContractMerchantId + '）'
          };
        }
      }

      // 現在の状況から管理ステータスと工事進捗ステータスを判定
      let newManagementStatus = '入金予定';
      let constructionStatus = '';

      if (currentStatus === '契約前・口頭確約済') {
        newManagementStatus = '商談中';
        constructionStatus = '契約前';
      } else if (currentStatus === '契約後・工事前') {
        newManagementStatus = '入金予定';
        constructionStatus = '工事前';
      } else if (currentStatus === '工事中') {
        newManagementStatus = '入金予定';
        constructionStatus = '工事中';
      } else if (currentStatus === '工事完了後') {
        newManagementStatus = '完了';
        constructionStatus = '工事完了';
      }

      // データ更新（通常の成約報告の場合）
      if (!isAdditionalWork) {
        userSheet.getRange(targetRow, contractMerchantIdIdx + 1).setValue(merchantId);
        userSheet.getRange(targetRow, contractMerchantNameIdx + 1).setValue(merchantName || '');
        userSheet.getRange(targetRow, contractReportDateIdx + 1).setValue(new Date());
      }

      // 共通項目の更新
      if (contractDate) {
        userSheet.getRange(targetRow, contractDateIdx + 1).setValue(contractDate);
      }

      userSheet.getRange(targetRow, contractAmountIdx + 1).setValue(contractAmount);

      // 施工内容（配列を文字列に変換）
      if (workContent && Array.isArray(workContent)) {
        const workContentStr = workContent.join('、');
        userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContentStr);
      } else if (workContent) {
        userSheet.getRange(targetRow, workContentIdx + 1).setValue(workContent);
      }

      if (paymentDueDate) {
        userSheet.getRange(targetRow, paymentDueDateIdx + 1).setValue(paymentDueDate);
      }

      if (constructionEndDate) {
        userSheet.getRange(targetRow, constructionEndDateIdx + 1).setValue(constructionEndDate);
      }

      if (propertyType && propertyTypeIdx !== -1) {
        userSheet.getRange(targetRow, propertyTypeIdx + 1).setValue(propertyType);
      }

      if (floors && floorsIdx !== -1) {
        userSheet.getRange(targetRow, floorsIdx + 1).setValue(floors);
      }

      // 工事進捗ステータス
      if (constructionStatus && constructionStatusIdx !== -1) {
        userSheet.getRange(targetRow, constructionStatusIdx + 1).setValue(constructionStatus);
      }

      // 追加工事フラグ
      if (isAdditionalWork && additionalWorkFlagIdx !== -1) {
        userSheet.getRange(targetRow, additionalWorkFlagIdx + 1).setValue(true);
      }

      // 管理ステータス更新
      userSheet.getRange(targetRow, managementStatusIdx + 1).setValue(newManagementStatus);

      console.log('[MerchantContractReport] submitContractReport - 成約報告完了:', cvId, '報告種別:', reportType);

      const successMessage = isAdditionalWork ? '追加工事報告を登録しました' : '成約報告を登録しました';

      return {
        success: true,
        message: successMessage,
        data: {
          cvId: cvId,
          managementStatus: newManagementStatus,
          constructionStatus: constructionStatus
        }
      };

    } catch (error) {
      console.error('[MerchantContractReport] submitContractReport error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * V2022: 加盟店向け案件一覧取得（ユーザー登録からの全情報取得対応）
   * @param {Object} params - { merchantId: 加盟店ID }
   * @return {Object} - { success, cases, stats }
   */
  getMerchantCases: function(params) {
    const merchantId = params.merchantId;
    console.log('[MerchantContractReport] getMerchantCases V2022 - merchantId:', merchantId);

    if (!merchantId) {
      return { success: false, error: '加盟店IDが必要です' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }
      if (!userSheet) {
        return { success: false, error: 'ユーザー登録シートが見つかりません' };
      }

      // ============================================
      // 1. ユーザー登録シートからCV ID → 顧客情報マップ作成
      // ============================================
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];

      // ユーザー登録シートのカラムインデックス
      const userCol = {};
      userHeaders.forEach((h, i) => { userCol[h] = i; });

      const userMap = {};
      for (let i = 1; i < userData.length; i++) {
        const row = userData[i];
        const cvId = row[userCol['CV ID']];
        if (!cvId) continue;

        userMap[cvId] = {
          // 基本情報
          name: row[userCol['氏名']] || '',
          nameKana: row[userCol['フリガナ']] || '',
          tel: row[userCol['電話番号']] || '',
          email: row[userCol['メールアドレス']] || '',
          gender: row[userCol['性別']] || '',
          age: row[userCol['年齢']] || '',
          contactTime: row[userCol['連絡時間帯']] || '',
          relationship: row[userCol['続柄']] || '',
          searchKeyword: row[userCol['流入検索ワード']] || '',

          // 物件情報
          postalCode: row[userCol['郵便番号（物件）']] || '',
          prefecture: row[userCol['都道府県（物件）']] || '',
          city: row[userCol['市区町村（物件）']] || '',
          addressDetail: row[userCol['住所詳細（物件）']] || '',
          addressKana: row[userCol['住所フリガナ']] || '',
          propertyType: row[userCol['物件種別']] || row[userCol['Q1_物件種別']] || '',
          floors: row[userCol['階数']] || row[userCol['Q2_階数']] || '',
          buildingAge: row[userCol['築年数']] || row[userCol['Q3_築年数']] || '',
          buildingArea: row[userCol['建物面積']] || '',
          googleMapsLink: row[userCol['Google Mapsリンク']] || '',

          // 工事関連
          workHistory: row[userCol['Q4_工事歴']] || '',
          lastConstructionTime: row[userCol['Q5_前回施工時期']] || '',
          exteriorMaterial: row[userCol['Q6_外壁材質']] || '',
          roofMaterial: row[userCol['Q7_屋根材質']] || '',
          concernedAreas: row[userCol['Q8_気になる箇所']] || '',
          exteriorWorkRequest: row[userCol['Q9_希望工事内容_外壁']] || '',
          roofWorkRequest: row[userCol['Q10_希望工事内容_屋根']] || '',
          deteriorationStatus: row[userCol['Q16_現在の劣化状況']] || '',

          // 希望・意向
          estimateAreas: row[userCol['見積もり希望箇所']] || '',
          constructionTiming: row[userCol['施工時期']] || '',
          desiredCompanies: row[userCol['希望社数']] || '',
          existingEstimates: row[userCol['Q11_見積もり保有数']] || '',
          estimateSource: row[userCol['Q12_見積もり取得先']] || '',
          visitingContractor: row[userCol['Q13_訪問業者有無']] || '',
          comparisonIntent: row[userCol['Q14_比較意向']] || '',
          visitingContractorName: row[userCol['Q15_訪問業者名']] || '',
          selectionCriteria: row[userCol['Q17_業者選定条件']] || '',

          // 現調・立会
          inspectionDate: row[userCol['現地調査希望日時']] || '',
          attendanceStatus: row[userCol['立ち会い可否']] || '',
          attendeeRelation: row[userCol['立ち会い者関係性']] || '',

          // 2人目連絡先
          name2: row[userCol['氏名（2人目）']] || '',
          tel2: row[userCol['電話番号（2人目）']] || '',
          relationship2: row[userCol['続柄（2人目）']] || '',
          remarks2: row[userCol['備考（2人目）']] || '',

          // その他
          specialItems: row[userCol['特殊項目']] || '',
          caseMemo: row[userCol['案件メモ']] || '',
          wordLinkAnswer: row[userCol['ワードリンク回答']] || '',

          // 見積もり送付先（物件と異なる場合）
          estimateDestination: row[userCol['見積もり送付先']] || '',
          homePostalCode: row[userCol['郵便番号（自宅）']] || '',
          homePrefecture: row[userCol['都道府県（自宅）']] || '',
          homeAddressDetail: row[userCol['住所詳細（自宅）']] || ''
        };
      }

      // ============================================
      // 2. 配信管理シートから配信案件取得
      // ============================================
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];

      const delCol = {};
      deliveryHeaders.forEach((h, i) => { delCol[h] = i; });

      // merchantIdから会社名を取得（後方互換性のため）
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      let merchantCompanyName = '';
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[MerchantContractReport] getMerchantCases - merchantId:', merchantId, ', companyName:', merchantCompanyName);

      // 統計初期化
      const stats = {
        total: 0,
        pending: 0,
        visited: 0,
        quoted: 0,
        contracted: 0,
        cancelled: 0
      };

      const cases = [];

      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        const cvId = row[delCol['CV ID']];
        const rowFranchiseId = row[delCol['加盟店ID']];

        if (!cvId) continue;

        // この加盟店に配信された案件のみ（登録ID or 会社名でマッチ）
        if (String(rowFranchiseId) !== String(merchantId) &&
            String(rowFranchiseId) !== String(merchantCompanyName)) continue;

        const deliveryStatus = row[delCol['配信ステータス']] || '';
        const detailStatus = row[delCol['詳細ステータス']] || '';

        // 配信済み以降のステータスのみ
        if (!['配信済み', '成約', '失注'].includes(deliveryStatus)) continue;

        stats.total++;

        // 詳細ステータスで統計
        if (detailStatus === '成約') {
          stats.contracted++;
        } else if (detailStatus === 'キャンセル') {
          stats.cancelled++;
        } else if (detailStatus === '見積提出済み') {
          stats.quoted++;
        } else if (detailStatus === '訪問済み') {
          stats.visited++;
        } else {
          stats.pending++;
        }

        // ユーザー登録から顧客情報取得
        const user = userMap[cvId] || {};

        // 住所を結合
        const fullAddress = [user.prefecture, user.city, user.addressDetail].filter(v => v).join('');

        const caseData = {
          // 識別子
          cvId: cvId,
          rowIndex: i + 1,

          // ステータス
          deliveryStatus: deliveryStatus,
          detailStatus: detailStatus || '未対応',
          deliveredAt: row[delCol['配信日時']] ? Utilities.formatDate(new Date(row[delCol['配信日時']]), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '',
          merchantMemo: row[delCol['加盟店メモ']] || '',
          callHistory: parseCallHistoryJSON(row[delCol['連絡履歴JSON']]),
          nextCallDate: row[delCol['次回連絡予定日時']] || '',
          callCount: row[delCol['電話回数']] || 0,

          // === お客様情報 ===
          customerName: user.name,
          customerNameKana: user.nameKana,
          customerTel: user.tel,
          customerEmail: user.email,
          customerGender: user.gender,
          customerAge: user.age,
          contactTime: user.contactTime,
          relationship: user.relationship,
          searchKeyword: user.searchKeyword,

          // === 物件情報 ===
          postalCode: user.postalCode,
          prefecture: user.prefecture,
          city: user.city,
          addressDetail: user.addressDetail,
          fullAddress: fullAddress,
          addressKana: user.addressKana,
          propertyType: user.propertyType,
          floors: user.floors,
          buildingAge: user.buildingAge,
          buildingArea: user.buildingArea,
          googleMapsLink: user.googleMapsLink,

          // === 工事関連 ===
          workHistory: user.workHistory,
          lastConstructionTime: user.lastConstructionTime,
          exteriorMaterial: user.exteriorMaterial,
          roofMaterial: user.roofMaterial,
          concernedAreas: user.concernedAreas,
          exteriorWorkRequest: user.exteriorWorkRequest,
          roofWorkRequest: user.roofWorkRequest,
          deteriorationStatus: user.deteriorationStatus,

          // === 希望・意向 ===
          estimateAreas: user.estimateAreas,
          constructionTiming: user.constructionTiming,
          desiredCompanies: user.desiredCompanies,
          existingEstimates: user.existingEstimates,
          estimateSource: user.estimateSource,
          visitingContractor: user.visitingContractor,
          comparisonIntent: user.comparisonIntent,
          visitingContractorName: user.visitingContractorName,
          selectionCriteria: user.selectionCriteria,

          // === 現調・立会 ===
          inspectionDate: user.inspectionDate,
          attendanceStatus: user.attendanceStatus,
          attendeeRelation: user.attendeeRelation,

          // === 2人目連絡先 ===
          name2: user.name2,
          tel2: user.tel2,
          relationship2: user.relationship2,
          remarks2: user.remarks2,

          // === その他 ===
          specialItems: user.specialItems,
          caseMemo: user.caseMemo,
          wordLinkAnswer: user.wordLinkAnswer,

          // === 見積もり送付先 ===
          estimateDestination: user.estimateDestination,
          homePostalCode: user.homePostalCode,
          homePrefecture: user.homePrefecture,
          homeAddressDetail: user.homeAddressDetail
        };

        cases.push(caseData);
      }

      // 配信日時の新しい順でソート
      cases.sort((a, b) => {
        if (!a.deliveredAt) return 1;
        if (!b.deliveredAt) return -1;
        return new Date(b.deliveredAt) - new Date(a.deliveredAt);
      });

      console.log('[MerchantContractReport] getMerchantCases V2022 - found', cases.length, 'cases');

      return {
        success: true,
        cases: cases,
        stats: stats
      };

    } catch (error) {
      console.error('[MerchantContractReport] getMerchantCases error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * V2007: 案件の詳細ステータス更新
   * @param {Object} params - { merchantId, cvId, status }
   * @return {Object} - { success }
   */
  updateCaseStatus: function(params) {
    const { merchantId, cvId, status, oldStatus } = params;
    console.log('[MerchantContractReport] updateCaseStatus:', { merchantId, cvId, status, oldStatus });

    if (!merchantId || !cvId || !status) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    const validStatuses = [
      '新着', '未アポ', 'アポ済', '現調済', '現調前キャンセル', '現調後失注',
      '見積提出済', '成約', '他社契約済', '別加盟店契約済', '入金予定', '入金済', 'クレーム'
    ];
    if (!validStatuses.includes(status)) {
      return { success: false, error: '無効なステータスです: ' + status };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      const colIdx = {
        cvId: headers.indexOf('CV ID'),
        franchiseId: headers.indexOf('加盟店ID'),
        detailStatus: headers.indexOf('詳細ステータス'),
        deliveryStatus: headers.indexOf('配信ステータス'),
        caseMemo: headers.indexOf('加盟店メモ')
      };

      // merchantIdから会社名を取得（getMerchantCasesと同じロジック）
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      let merchantCompanyName = '';
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[updateCaseStatus] merchantId:', merchantId, ', companyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowFranchiseId = row[colIdx.franchiseId];
        // merchantId or 会社名でマッチ
        if (String(row[colIdx.cvId]) === String(cvId) &&
            (String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName))) {

          deliverySheet.getRange(i + 1, colIdx.detailStatus + 1).setValue(status);

          if (status === '成約') {
            deliverySheet.getRange(i + 1, colIdx.deliveryStatus + 1).setValue('成約');
          }

          // ステータス変更履歴をメモに追加（oldStatusが異なる場合のみ）
          if (oldStatus && oldStatus !== status && colIdx.caseMemo >= 0) {
            const now = new Date();
            const dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'M/d H:mm');
            const statusChangeNote = `🏷️ ${oldStatus} → ${status} (${dateStr})`;
            const currentMemo = row[colIdx.caseMemo] || '';
            const newMemo = currentMemo ? statusChangeNote + '\n' + currentMemo : statusChangeNote;
            deliverySheet.getRange(i + 1, colIdx.caseMemo + 1).setValue(newMemo);
          }

          console.log('[MerchantContractReport] updateCaseStatus - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません' };

    } catch (error) {
      console.error('[MerchantContractReport] updateCaseStatus error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * V2007: 加盟店メモ更新
   * @param {Object} params - { merchantId, cvId, memo }
   * @return {Object} - { success }
   */
  updateCaseMemo: function(params) {
    const { merchantId, cvId, memo } = params;
    console.log('[MerchantContractReport] updateCaseMemo:', { merchantId, cvId, memoLength: (memo || '').length });

    if (!merchantId || !cvId) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      const colIdx = {
        cvId: headers.indexOf('CV ID'),
        franchiseId: headers.indexOf('加盟店ID'),
        merchantMemo: headers.indexOf('加盟店メモ')
      };

      if (colIdx.merchantMemo === -1) {
        return { success: false, error: '加盟店メモ列が見つかりません' };
      }

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (String(row[colIdx.cvId]) === String(cvId) &&
            String(row[colIdx.franchiseId]) === String(merchantId)) {

          deliverySheet.getRange(i + 1, colIdx.merchantMemo + 1).setValue(memo || '');

          console.log('[MerchantContractReport] updateCaseMemo - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません' };

    } catch (error) {
      console.error('[MerchantContractReport] updateCaseMemo error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 次回架電日更新
   * @param {Object} params - { cvId, nextCallDate }
   * @return {Object} - { success }
   */
  updateNextCallDate: function(params) {
    const { merchantId, cvId, nextCallDate } = params;
    console.log('[MerchantContractReport] updateNextCallDate:', { merchantId, cvId, nextCallDate });

    if (!cvId) {
      return { success: false, error: 'cvIdが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const nextCallDateCol = colIdx['次回連絡予定日時'];

      if (nextCallDateCol === undefined) {
        return { success: false, error: '次回連絡予定日時列が見つかりません' };
      }

      // merchantIdがある場合は会社名も取得（updateCallHistoryと同じロジック）
      let merchantCompanyName = '';
      if (merchantId) {
        const franchiseSheet = ss.getSheetByName('加盟店登録');
        if (franchiseSheet) {
          const franchiseData = franchiseSheet.getDataRange().getValues();
          const franchiseHeaders = franchiseData[0];
          const regIdCol = franchiseHeaders.indexOf('登録ID');
          const companyNameCol = franchiseHeaders.indexOf('会社名');

          for (let i = 1; i < franchiseData.length; i++) {
            if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
              merchantCompanyName = franchiseData[i][companyNameCol];
              break;
            }
          }
        }
      }
      console.log('[MerchantContractReport] updateNextCallDate - merchantCompanyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (merchantIdなし OR 登録ID/会社名でマッチ)
        const cvMatch = String(rowCvId) === String(cvId);
        const merchantMatch = !merchantId || String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName);

        if (cvMatch && merchantMatch) {
          deliverySheet.getRange(i + 1, nextCallDateCol + 1).setValue(nextCallDate || '');
          console.log('[MerchantContractReport] updateNextCallDate - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateNextCallDate error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 現調日時更新
   * @param {Object} params - { merchantId, cvId, surveyDate }
   * @return {Object} - { success }
   */
  updateSurveyDate: function(params) {
    const { merchantId, cvId, surveyDate } = params;
    console.log('[MerchantContractReport] updateSurveyDate:', { merchantId, cvId, surveyDate });

    if (!cvId) {
      return { success: false, error: 'cvIdが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const surveyDateCol = colIdx['現調日時'];

      if (surveyDateCol === undefined) {
        return { success: false, error: '現調日時列が見つかりません' };
      }

      // merchantIdがある場合は会社名も取得
      let merchantCompanyName = '';
      if (merchantId) {
        const franchiseSheet = ss.getSheetByName('加盟店登録');
        if (franchiseSheet) {
          const franchiseData = franchiseSheet.getDataRange().getValues();
          const franchiseHeaders = franchiseData[0];
          const regIdCol = franchiseHeaders.indexOf('登録ID');
          const companyNameCol = franchiseHeaders.indexOf('会社名');

          for (let i = 1; i < franchiseData.length; i++) {
            if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
              merchantCompanyName = franchiseData[i][companyNameCol];
              break;
            }
          }
        }
      }
      console.log('[MerchantContractReport] updateSurveyDate - merchantCompanyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (merchantIdなし OR 登録ID/会社名でマッチ)
        const cvMatch = String(rowCvId) === String(cvId);
        const merchantMatch = !merchantId || String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName);

        if (cvMatch && merchantMatch) {
          deliverySheet.getRange(i + 1, surveyDateCol + 1).setValue(surveyDate || '');
          console.log('[MerchantContractReport] updateSurveyDate - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateSurveyDate error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 通話結果保存（接続/不在、メモ、ステータス、次回架電、電話回数）
   * @param {Object} params - { merchantId, cvId, connectionStatus, memo, newStatus, nextCallDateTime, operatorName }
   * @return {Object} - { success }
   */
  saveCallResult: function(params) {
    const { merchantId, cvId, connectionStatus, memo, newStatus, nextCallDateTime, operatorName } = params;
    console.log('[MerchantContractReport] saveCallResult:', { merchantId, cvId, connectionStatus, newStatus });

    if (!merchantId || !cvId) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const callHistoryCol = colIdx['連絡履歴JSON'];
      const callCountCol = colIdx['電話回数'];
      const statusCol = colIdx['詳細ステータス'];
      const nextCallCol = colIdx['次回架電予定'];

      // 会社名も取得（getMerchantCasesと同じロジック）
      let merchantCompanyName = '';
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[MerchantContractReport] saveCallResult - merchantId:', merchantId, ', companyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (登録ID or 会社名でマッチ)
        if (String(rowCvId) === String(cvId) &&
            (String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName))) {

          // 1. 電話回数をインクリメント
          if (callCountCol !== undefined) {
            const currentCount = parseInt(row[callCountCol] || 0);
            deliverySheet.getRange(i + 1, callCountCol + 1).setValue(currentCount + 1);
          }

          // 2. 連絡履歴に追加
          if (callHistoryCol !== undefined) {
            let existingHistory = [];
            try {
              existingHistory = JSON.parse(row[callHistoryCol] || '[]');
            } catch (e) {
              existingHistory = [];
            }

            const historyEntry = {
              date: new Date().toLocaleString('ja-JP'),
              note: connectionStatus === 'connected'
                ? '📞 接続' + (memo ? ' - ' + memo : '')
                : '📞 不在',
              operator: operatorName || ''
            };
            existingHistory.unshift(historyEntry);

            deliverySheet.getRange(i + 1, callHistoryCol + 1).setValue(JSON.stringify(existingHistory));
          }

          // 3. ステータス更新
          if (newStatus && statusCol !== undefined) {
            deliverySheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
          }

          // 4. 次回架電予定
          if (nextCallDateTime && nextCallCol !== undefined) {
            deliverySheet.getRange(i + 1, nextCallCol + 1).setValue(nextCallDateTime);
          }

          console.log('[MerchantContractReport] saveCallResult - updated row', i + 1);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ', merchantId: ' + merchantId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] saveCallResult error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * 通話履歴更新
   * @param {Object} params - { merchantId, cvId, callHistory }
   * @return {Object} - { success }
   */
  updateCallHistory: function(params) {
    const { merchantId, cvId, callHistory, callCount } = params;
    console.log('[MerchantContractReport] updateCallHistory:', { merchantId, cvId, historyLength: (callHistory || []).length, callCount });

    if (!merchantId || !cvId) {
      return { success: false, error: 'パラメータが不足しています' };
    }

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const deliverySheet = ss.getSheetByName('配信管理');
      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];

      // ヘッダーマップ作成（getMerchantCasesと同じ方式）
      const colIdx = {};
      headers.forEach((h, i) => { colIdx[h] = i; });

      const cvIdCol = colIdx['CV ID'];
      const franchiseIdCol = colIdx['加盟店ID'];
      const callHistoryCol = colIdx['連絡履歴JSON'];
      const callCountCol = colIdx['電話回数'];

      if (callHistoryCol === undefined) {
        return { success: false, error: '連絡履歴JSON列が見つかりません' };
      }

      // 会社名も取得（getMerchantCasesと同じロジック）
      let merchantCompanyName = '';
      const franchiseSheet = ss.getSheetByName('加盟店登録');
      if (franchiseSheet) {
        const franchiseData = franchiseSheet.getDataRange().getValues();
        const franchiseHeaders = franchiseData[0];
        const regIdCol = franchiseHeaders.indexOf('登録ID');
        const companyNameCol = franchiseHeaders.indexOf('会社名');

        for (let i = 1; i < franchiseData.length; i++) {
          if (String(franchiseData[i][regIdCol]) === String(merchantId)) {
            merchantCompanyName = franchiseData[i][companyNameCol];
            break;
          }
        }
      }
      console.log('[MerchantContractReport] updateCallHistory - merchantId:', merchantId, ', companyName:', merchantCompanyName);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowCvId = row[cvIdCol];
        const rowFranchiseId = row[franchiseIdCol];

        // CV IDが一致 AND (登録ID or 会社名でマッチ)
        if (String(rowCvId) === String(cvId) &&
            (String(rowFranchiseId) === String(merchantId) || String(rowFranchiseId) === String(merchantCompanyName))) {

          const historyJson = JSON.stringify(callHistory || []);
          deliverySheet.getRange(i + 1, callHistoryCol + 1).setValue(historyJson);

          // 電話回数も保存
          if (callCount !== undefined && callCountCol !== undefined) {
            deliverySheet.getRange(i + 1, callCountCol + 1).setValue(callCount);
          }

          console.log('[MerchantContractReport] updateCallHistory - updated row', i + 1, ', callCount:', callCount);
          return { success: true };
        }
      }

      return { success: false, error: '該当する案件が見つかりません (cvId: ' + cvId + ', merchantId: ' + merchantId + ')' };

    } catch (error) {
      console.error('[MerchantContractReport] updateCallHistory error:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * アクションルーター
   * @param {Object} params - { action: アクション名, ...その他のパラメータ }
   * @return {Object} - 実行結果
   */
  handle: function(params) {
    const action = params.action;

    switch(action) {
      case 'getDeliveredCases':
        return this.getDeliveredCases(params);
      case 'submitContractReport':
        return this.submitContractReport(params);
      case 'getMerchantCases':
        return this.getMerchantCases(params);
      case 'updateCaseStatus':
        return this.updateCaseStatus(params);
      case 'updateCaseMemo':
        return this.updateCaseMemo(params);
      case 'updateCallHistory':
        return this.updateCallHistory(params);
      case 'saveCallResult':
        return this.saveCallResult(params);
      case 'updateNextCallDate':
        return this.updateNextCallDate(params);
      case 'updateSurveyDate':
        return this.updateSurveyDate(params);
      default:
        return {
          success: false,
          error: 'Unknown action: ' + action
        };
    }
  }
};

// deploy 2025年 12月 4日 木曜日 01時58分07秒 JST
