/**
 * 成約データ管理システム
 * 成約データシートの作成・管理・集計を行う
 */

const ContractDataSystem = {

  /**
   * 成約データシートを作成（ヘッダー行含む）
   */
  createContractDataSheet: function() {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // 既存シートがあれば削除（テスト用）
      const existingSheet = ss.getSheetByName('成約データ');
      if (existingSheet) {
        console.log('[ContractDataSystem] 既存の成約データシートを削除します');
        ss.deleteSheet(existingSheet);
      }

      // 新しいシートを作成
      const sheet = ss.insertSheet('成約データ');

      // ヘッダー行を作成
      const headers = [
        'CV ID',
        '登録日時',
        '管理ステータス',
        '配信日時',
        '配信先業者一覧',
        '成約加盟店ID',
        '成約加盟店名',
        '加盟店ステータス',
        '成約報告日',
        '成約日',
        '成約金額',
        '見積工事内容',
        '実施工事内容',
        '追加工事フラグ',
        '追加工事内容',
        '追加工事金額',
        '入金予定日',
        '入金確認日',
        '入金額',
        '返品フラグ',
        '返品日',
        '返品理由',
        '工事開始予定日',
        '工事完了予定日',
        '工事完了日',
        '工事進捗ステータス',
        'クレームフラグ',
        'クレーム内容',
        'クレーム発生日',
        'クレーム対応ステータス',
        'クレーム対応履歴',
        '不成約業者一覧',
        '不成約業者通知済フラグ',
        '不成約業者通知日時',
        '備考',
        '登録者',
        '最終更新日時'
      ];

      // ヘッダー行を書き込み
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // ヘッダー行をフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');

      // 列幅を自動調整
      for (let i = 1; i <= headers.length; i++) {
        sheet.autoResizeColumn(i);
      }

      // 1行目を固定
      sheet.setFrozenRows(1);

      console.log('[ContractDataSystem] 成約データシートを作成しました（カラム数: ' + headers.length + '）');

      return {
        success: true,
        message: '成約データシートを作成しました',
        columnCount: headers.length
      };

    } catch (err) {
      console.error('[ContractDataSystem] シート作成エラー:', err);
      return {
        success: false,
        message: 'エラー: ' + err.message
      };
    }
  },

  /**
   * 成約データを追加（管理ステータス「完了」時に自動実行）
   * @param {string} cvId - CV ID
   * @return {Object} 実行結果
   */
  addContractRecord: function(cvId) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      const contractSheet = ss.getSheetByName('成約データ');
      const userSheet = ss.getSheetByName('ユーザー登録');

      if (!contractSheet) {
        console.error('[ContractDataSystem] 成約データシートが見つかりません');
        return { success: false, message: '成約データシートが見つかりません' };
      }

      if (!userSheet) {
        console.error('[ContractDataSystem] ユーザー登録シートが見つかりません');
        return { success: false, message: 'ユーザー登録シートが見つかりません' };
      }

      // CV IDで既に成約データに登録されていないかチェック
      const contractData_all = contractSheet.getDataRange().getValues();
      const contractHeaders = contractData_all[0];
      const contractRows = contractData_all.slice(1);
      const cvIdIndex = contractHeaders.indexOf('CV ID');

      const existingRecord = contractRows.find(function(row) {
        return row[cvIdIndex] === cvId;
      });

      if (existingRecord) {
        console.log('[ContractDataSystem] CV ID ' + cvId + ' は既に成約データに登録されています');
        return { success: false, message: 'CV ID ' + cvId + ' は既に登録済みです' };
      }

      // ユーザー登録シートから該当行を取得
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      const userColIndex = {
        cvId: userHeaders.indexOf('CV ID'),
        registrationDate: userHeaders.indexOf('登録日時'),
        managementStatus: userHeaders.indexOf('管理ステータス'),
        deliveryDate: userHeaders.indexOf('配信日時'),
        deliveredMerchants: userHeaders.indexOf('配信先業者一覧'),
        contractMerchantId: userHeaders.indexOf('成約加盟店ID'),
        contractMerchantName: userHeaders.indexOf('成約加盟店名'),
        merchantStatus: userHeaders.indexOf('加盟店ステータス'),
        contractReportDate: userHeaders.indexOf('成約報告日'),
        contractDate: userHeaders.indexOf('成約日'),
        contractAmount: userHeaders.indexOf('成約金額'),
        estimateWorkContent: userHeaders.indexOf('見積工事内容'),
        actualWorkContent: userHeaders.indexOf('実施工事内容'),
        additionalWorkFlag: userHeaders.indexOf('追加工事フラグ'),
        additionalWorkContent: userHeaders.indexOf('追加工事内容'),
        additionalWorkAmount: userHeaders.indexOf('追加工事金額'),
        paymentDueDate: userHeaders.indexOf('入金予定日'),
        paymentConfirmDate: userHeaders.indexOf('入金確認日'),
        paymentAmount: userHeaders.indexOf('入金額'),
        returnFlag: userHeaders.indexOf('返品フラグ'),
        returnDate: userHeaders.indexOf('返品日'),
        returnReason: userHeaders.indexOf('返品理由'),
        constructionStartDate: userHeaders.indexOf('工事開始予定日'),
        constructionEndDate: userHeaders.indexOf('工事完了予定日'),
        constructionCompletedDate: userHeaders.indexOf('工事完了日'),
        constructionStatus: userHeaders.indexOf('工事進捗ステータス'),
        complaintFlag: userHeaders.indexOf('クレームフラグ'),
        complaintContent: userHeaders.indexOf('クレーム内容'),
        complaintDate: userHeaders.indexOf('クレーム発生日'),
        complaintStatus: userHeaders.indexOf('クレーム対応ステータス'),
        complaintHistory: userHeaders.indexOf('クレーム対応履歴'),
        nonContractMerchants: userHeaders.indexOf('不成約業者一覧'),
        nonContractNotified: userHeaders.indexOf('不成約業者通知済フラグ'),
        nonContractNotifyDate: userHeaders.indexOf('不成約業者通知日時'),
        remarks: userHeaders.indexOf('備考'),
        registrant: userHeaders.indexOf('登録者')
      };

      const userRow = userRows.find(function(row) {
        return row[userColIndex.cvId] === cvId;
      });

      if (!userRow) {
        console.error('[ContractDataSystem] CV ID ' + cvId + ' がユーザー登録シートに見つかりません');
        return { success: false, message: 'CV ID ' + cvId + ' が見つかりません' };
      }

      // 成約データシートに追加する行を作成（37カラム）
      const now = new Date();
      const newRow = [
        cvId, // 1. CV ID
        userRow[userColIndex.registrationDate] || '', // 2. 登録日時
        userRow[userColIndex.managementStatus] || '', // 3. 管理ステータス
        userRow[userColIndex.deliveryDate] || '', // 4. 配信日時
        userRow[userColIndex.deliveredMerchants] || '', // 5. 配信先業者一覧
        userRow[userColIndex.contractMerchantId] || '', // 6. 成約加盟店ID
        userRow[userColIndex.contractMerchantName] || '', // 7. 成約加盟店名
        userRow[userColIndex.merchantStatus] || '', // 8. 加盟店ステータス
        userRow[userColIndex.contractReportDate] || '', // 9. 成約報告日
        userRow[userColIndex.contractDate] || '', // 10. 成約日
        userRow[userColIndex.contractAmount] || '', // 11. 成約金額
        userRow[userColIndex.estimateWorkContent] || '', // 12. 見積工事内容
        userRow[userColIndex.actualWorkContent] || '', // 13. 実施工事内容
        userRow[userColIndex.additionalWorkFlag] || false, // 14. 追加工事フラグ
        userRow[userColIndex.additionalWorkContent] || '', // 15. 追加工事内容
        userRow[userColIndex.additionalWorkAmount] || '', // 16. 追加工事金額
        userRow[userColIndex.paymentDueDate] || '', // 17. 入金予定日
        userRow[userColIndex.paymentConfirmDate] || '', // 18. 入金確認日
        userRow[userColIndex.paymentAmount] || '', // 19. 入金額
        userRow[userColIndex.returnFlag] || false, // 20. 返品フラグ
        userRow[userColIndex.returnDate] || '', // 21. 返品日
        userRow[userColIndex.returnReason] || '', // 22. 返品理由
        userRow[userColIndex.constructionStartDate] || '', // 23. 工事開始予定日
        userRow[userColIndex.constructionEndDate] || '', // 24. 工事完了予定日
        userRow[userColIndex.constructionCompletedDate] || '', // 25. 工事完了日
        userRow[userColIndex.constructionStatus] || '', // 26. 工事進捗ステータス
        userRow[userColIndex.complaintFlag] || false, // 27. クレームフラグ
        userRow[userColIndex.complaintContent] || '', // 28. クレーム内容
        userRow[userColIndex.complaintDate] || '', // 29. クレーム発生日
        userRow[userColIndex.complaintStatus] || '', // 30. クレーム対応ステータス
        userRow[userColIndex.complaintHistory] || '', // 31. クレーム対応履歴
        userRow[userColIndex.nonContractMerchants] || '', // 32. 不成約業者一覧
        userRow[userColIndex.nonContractNotified] || false, // 33. 不成約業者通知済フラグ
        userRow[userColIndex.nonContractNotifyDate] || '', // 34. 不成約業者通知日時
        userRow[userColIndex.remarks] || '', // 35. 備考
        userRow[userColIndex.registrant] || '', // 36. 登録者
        now // 37. 最終更新日時
      ];

      // 成約データシートに追加
      contractSheet.appendRow(newRow);

      console.log('[ContractDataSystem] CV ID ' + cvId + ' の成約データを追加しました');

      return {
        success: true,
        message: '成約データを追加しました',
        cvId: cvId
      };

    } catch (err) {
      console.error('[ContractDataSystem] 成約データ追加エラー:', err);
      return {
        success: false,
        message: 'エラー: ' + err.message
      };
    }
  },

  /**
   * 日次集計: 直近3ヶ月データを集計して加盟店マスタを更新
   */
  updateRecent3MonthMetrics: function() {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      const contractSheet = ss.getSheetByName('成約データ');
      const userSheet = ss.getSheetByName('ユーザー登録');
      const masterSheet = ss.getSheetByName('加盟店マスタ');

      if (!contractSheet) {
        console.error('[ContractDataSystem] 成約データシートが見つかりません');
        return { success: false, message: '成約データシートが見つかりません' };
      }

      if (!userSheet) {
        console.error('[ContractDataSystem] ユーザー登録シートが見つかりません');
        return { success: false, message: 'ユーザー登録シートが見つかりません' };
      }

      if (!masterSheet) {
        console.error('[ContractDataSystem] 加盟店マスタシートが見つかりません');
        return { success: false, message: '加盟店マスタシートが見つかりません' };
      }

      // 現在日時と3ヶ月前の日付
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

      console.log('[ContractDataSystem] 集計期間: ' + threeMonthsAgo.toLocaleDateString() + ' 〜 ' + now.toLocaleDateString());

      // 成約データを取得
      const contractData = contractSheet.getDataRange().getValues();
      const contractHeaders = contractData[0];
      const contractRows = contractData.slice(1);

      // ユーザー登録データを取得（問合せ件数計算用）
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const userRows = userData.slice(1);

      // 加盟店マスタを取得
      const masterData = masterSheet.getDataRange().getValues();
      const masterHeaders = masterData[0];
      const masterRows = masterData.slice(1);

      // カラムインデックス取得
      const contractColIndex = {
        cvId: contractHeaders.indexOf('CV ID'),
        contractMerchantId: contractHeaders.indexOf('成約加盟店ID'),
        contractMerchantName: contractHeaders.indexOf('成約加盟店名'),
        contractDate: contractHeaders.indexOf('成約日'),
        contractAmount: contractHeaders.indexOf('成約金額'),
        paymentConfirmDate: contractHeaders.indexOf('入金確認日'),
        paymentAmount: contractHeaders.indexOf('入金額'),
        returnFlag: contractHeaders.indexOf('返品フラグ')
      };

      const userColIndex = {
        cvId: userHeaders.indexOf('CV ID'),
        registrationDate: userHeaders.indexOf('登録日時'),
        deliveredMerchants: userHeaders.indexOf('配信先加盟店数') // TODO: 実際のカラム名に修正
      };

      const masterColIndex = {
        companyName: masterHeaders.indexOf('会社名'),
        merchantId: masterHeaders.indexOf('加盟店ID'), // TODO: 実際のカラム名に修正
        recent3MonthRevenue: masterHeaders.indexOf('直近3ヶ月_総売上'),
        recent3MonthAvgAmount: masterHeaders.indexOf('直近3ヶ月_平均成約金額'),
        recent3MonthContractCount: masterHeaders.indexOf('直近3ヶ月_成約件数'),
        recent3MonthInquiryCount: masterHeaders.indexOf('直近3ヶ月_問合せ件数')
      };

      // 加盟店ごとに集計
      const merchantMetrics = {};

      // 1. 成約データから売上・成約金額・成約件数を集計
      contractRows.forEach(function(row) {
        const merchantName = row[contractColIndex.contractMerchantName];
        const contractDate = new Date(row[contractColIndex.contractDate]);
        const contractAmount = parseFloat(row[contractColIndex.contractAmount]) || 0;
        const paymentConfirmDate = row[contractColIndex.paymentConfirmDate] ? new Date(row[contractColIndex.paymentConfirmDate]) : null;
        const paymentAmount = parseFloat(row[contractColIndex.paymentAmount]) || 0;
        const returnFlag = row[contractColIndex.returnFlag];

        // 返品は除外
        if (returnFlag === true || returnFlag === 'TRUE') {
          return;
        }

        if (!merchantName) return;

        if (!merchantMetrics[merchantName]) {
          merchantMetrics[merchantName] = {
            totalRevenue: 0,
            totalContractAmount: 0,
            contractCount: 0,
            inquiryCount: 0
          };
        }

        // 成約日が3ヶ月以内
        if (contractDate >= threeMonthsAgo) {
          merchantMetrics[merchantName].totalContractAmount += contractAmount;
          merchantMetrics[merchantName].contractCount++;
        }

        // 入金確認日が3ヶ月以内
        if (paymentConfirmDate && paymentConfirmDate >= threeMonthsAgo) {
          merchantMetrics[merchantName].totalRevenue += paymentAmount;
        }
      });

      // 2. ユーザー登録データから問合せ件数を集計
      // TODO: 実際の配信先業者一覧カラムに合わせて修正
      userRows.forEach(function(row) {
        const registrationDate = new Date(row[userColIndex.registrationDate]);

        // 3ヶ月以内の登録のみ
        if (registrationDate < threeMonthsAgo) return;

        // TODO: 配信先業者一覧から各業者の問合せ件数をカウント
        // 現時点では仮実装（実際のデータ構造に合わせて修正必要）
      });

      // 3. 加盟店マスタを更新
      let updateCount = 0;
      masterRows.forEach(function(row, index) {
        const companyName = row[masterColIndex.companyName];

        if (!companyName || !merchantMetrics[companyName]) return;

        const metrics = merchantMetrics[companyName];
        const avgAmount = metrics.contractCount > 0 ? metrics.totalContractAmount / metrics.contractCount : 0;

        // 加盟店マスタの該当行を更新
        const rowIndex = index + 2; // ヘッダー行+1（1-indexed）

        masterSheet.getRange(rowIndex, masterColIndex.recent3MonthRevenue + 1).setValue(metrics.totalRevenue);
        masterSheet.getRange(rowIndex, masterColIndex.recent3MonthAvgAmount + 1).setValue(Math.round(avgAmount));
        masterSheet.getRange(rowIndex, masterColIndex.recent3MonthContractCount + 1).setValue(metrics.contractCount);
        masterSheet.getRange(rowIndex, masterColIndex.recent3MonthInquiryCount + 1).setValue(metrics.inquiryCount);

        updateCount++;
      });

      console.log('[ContractDataSystem] 加盟店マスタを更新しました（更新件数: ' + updateCount + '）');

      return {
        success: true,
        message: '集計完了',
        updateCount: updateCount,
        period: {
          from: threeMonthsAgo.toLocaleDateString(),
          to: now.toLocaleDateString()
        }
      };

    } catch (err) {
      console.error('[ContractDataSystem] 集計エラー:', err);
      return {
        success: false,
        message: 'エラー: ' + err.message
      };
    }
  }
};
