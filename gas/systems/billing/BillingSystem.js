/**
 * ====================================
 * 請求管理システム V1.0
 * ====================================
 *
 * 【機能】
 * 1. 紹介料（配信手数料）月次集計
 * 2. 成約手数料集計
 * 3. 請求管理シートへの書き込み
 * 4. freee連携（請求書自動作成）
 * 5. GMOあおぞら連携（振込・口座振替・入金確認）
 * 6. 自動通知（未入金督促・入金確認）
 *
 * 【シート構成】
 * - 請求管理シート: 全請求データ管理
 * - 配信管理シート: 紹介料の元データ
 * - 成約データシート: 成約手数料の元データ
 * - 加盟店マスタ: 支払方法・手数料率設定
 */

const BillingSystem = {
  // 定数
  SHEETS: {
    BILLING: '請求管理',
    DELIVERY: '配信管理',
    CONTRACT: '成約データ',
    MERCHANT_MASTER: '加盟店マスタ',
    MERCHANT_REGISTRATION: '加盟店登録'
  },

  // デフォルト値
  DEFAULTS: {
    REFERRAL_FEE: 20000, // 紹介料デフォルト（税抜）
    COMMISSION_RATE: 10, // 成約手数料率デフォルト（%）
    TAX_RATE: 10 // 消費税率（%）
  },

  /**
   * メインハンドラー
   */
  handle: function(params) {
    const action = params.action;
    console.log('[BillingSystem] Action:', action);

    switch (action) {
      case 'billing_getReferralFees':
        return this.getReferralFees(params.month);
      case 'billing_getCommissionFees':
        return this.getCommissionFees(params.month);
      case 'billing_generateInvoices':
        return this.generateInvoices(params.month, params.type);
      case 'billing_getInvoices':
        return this.getInvoices(params.month, params.status, params.merchantId);
      case 'billing_updateInvoiceStatus':
        return this.updateInvoiceStatus(params.invoiceId, params.status, params.paymentDate);
      case 'billing_checkPayments':
        return this.checkPayments();
      case 'billing_sendReminders':
        return this.sendReminders();
      case 'billing_confirmPayment':
        return this.confirmPayment(params.invoiceId, params.paymentAmount, params.paymentDate);
      case 'billing_setupSheets':
        return this.setupBillingSheets();
      case 'billing_sendPdf':
        return this.sendInvoicePdf(params.invoiceId);
      case 'billing_autoGenerateMonthly':
        return this.autoGenerateMonthlyInvoices();
      // フランチャイズダッシュボード向けAPI
      case 'billing_getReferralHistory':
        return this.getReferralHistory(params.merchantId, params.month);
      case 'billing_getFinancialSummary':
        return this.getFinancialSummary(params.merchantId);
      case 'billing_getCommissionHistory':
        return this.getCommissionHistory(params.merchantId, params.month);
      case 'billing_getPaymentHistory':
        return this.getPaymentHistory(params.merchantId, params.month, params.statusFilter);
      case 'billing_getProfitAnalysis':
        return this.getProfitAnalysis(params.merchantId, params.month);
      case 'billing_bulkUpdateDueDate':
        return this.bulkUpdateDueDate(params.targetMonth, params.newDueDate, params.reason);
      case 'billing_getDashboardStats':
        return this.getDashboardStats(params.merchantId);
      case 'billing_getScheduleEvents':
        return this.getScheduleEvents(params.merchantId, params.month);
      // デポジット管理API
      case 'deposit_setup':
        return this.setupDepositSheet();
      case 'deposit_getPlans':
        return this.getDepositPlans();
      case 'deposit_getInfo':
        return this.getDepositInfo(params.merchantId);
      case 'deposit_purchase':
        return this.requestDepositPurchase(params.merchantId, params.count);
      case 'deposit_confirmPayment':
        return this.confirmDepositPayment(params.invoiceId, params.paymentAmount);
      case 'deposit_consume':
        return this.consumeDeposit(params.merchantId, params.cvId, params.deliveryAmount);
      case 'deposit_updateSetting':
        return this.updateDepositSetting(params.merchantId, params.setting);
      case 'deposit_getAllInfo':
        return this.getAllDepositInfo();
      default:
        return { success: false, error: 'Unknown billing action: ' + action };
    }
  },

  /**
   * 請求管理シート初期セットアップ
   */
  setupBillingSheets: function() {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 請求管理シート作成
      let billingSheet = ss.getSheetByName(this.SHEETS.BILLING);
      if (!billingSheet) {
        billingSheet = ss.insertSheet(this.SHEETS.BILLING);
        const headers = [
          '請求ID',
          '加盟店ID',
          '加盟店名',
          '請求種別',
          '対象期間',
          '対象CV ID',
          '対象件数',
          '税抜金額',
          '消費税',
          '税込金額',
          '手数料率',
          '支払方法',
          '支払期限',
          'freee請求書ID',
          '発行日',
          '入金確認日',
          '入金額',
          'ステータス',
          '督促回数',
          '最終督促日',
          '備考',
          '作成日時',
          '最終更新日時'
        ];
        billingSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        billingSheet.setFrozenRows(1);

        // 列幅調整
        billingSheet.setColumnWidth(1, 150); // 請求ID
        billingSheet.setColumnWidth(3, 200); // 加盟店名

        console.log('[BillingSystem] 請求管理シート作成完了');
      }

      // 加盟店マスタに支払関連カラム追加確認
      const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);
      if (masterSheet) {
        const headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
        const newColumns = [];

        if (headers.indexOf('支払方法') === -1) newColumns.push('支払方法');
        if (headers.indexOf('口座振替登録日') === -1) newColumns.push('口座振替登録日');
        if (headers.indexOf('デフォルト手数料率') === -1) newColumns.push('デフォルト手数料率');
        if (headers.indexOf('請求先メールアドレス') === -1) newColumns.push('請求先メールアドレス');

        if (newColumns.length > 0) {
          const lastCol = masterSheet.getLastColumn();
          masterSheet.getRange(1, lastCol + 1, 1, newColumns.length).setValues([newColumns]);
          console.log('[BillingSystem] 加盟店マスタに追加カラム:', newColumns);
        }
      }

      // 成約データシートに手数料率カラム追加確認
      const contractSheet = ss.getSheetByName(this.SHEETS.CONTRACT);
      if (contractSheet) {
        const headers = contractSheet.getRange(1, 1, 1, contractSheet.getLastColumn()).getValues()[0];
        const newColumns = [];

        if (headers.indexOf('手数料率') === -1) newColumns.push('手数料率');
        if (headers.indexOf('手数料金額') === -1) newColumns.push('手数料金額');
        if (headers.indexOf('請求ID') === -1) newColumns.push('請求ID');

        if (newColumns.length > 0) {
          const lastCol = contractSheet.getLastColumn();
          contractSheet.getRange(1, lastCol + 1, 1, newColumns.length).setValues([newColumns]);
          console.log('[BillingSystem] 成約データシートに追加カラム:', newColumns);
        }
      }

      // 配信管理シートに請求IDカラム追加確認
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      if (deliverySheet) {
        const headers = deliverySheet.getRange(1, 1, 1, deliverySheet.getLastColumn()).getValues()[0];

        if (headers.indexOf('請求ID') === -1) {
          const lastCol = deliverySheet.getLastColumn();
          deliverySheet.getRange(1, lastCol + 1).setValue('請求ID');
          console.log('[BillingSystem] 配信管理シートに請求IDカラム追加');
        }
      }

      return {
        success: true,
        message: '請求管理シートのセットアップ完了'
      };

    } catch (e) {
      console.error('[BillingSystem] setupBillingSheets error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 紹介料（配信手数料）月次集計
   * @param {string} month - 対象月（YYYY-MM形式）
   */
  getReferralFees: function(month) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);

      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // カラムインデックス
      const merchantIdIdx = headers.indexOf('加盟店ID');
      const deliveryDateIdx = headers.indexOf('配信日時');
      const deliveryStatusIdx = headers.indexOf('配信ステータス');
      const deliveryAmountIdx = headers.indexOf('配信金額');
      const cvIdIdx = headers.indexOf('CV ID');

      // 対象月でフィルタ
      const targetMonth = month || this._getCurrentMonth();
      const [year, monthNum] = targetMonth.split('-').map(Number);

      // V2183: キャンセル承認済みCVリストを取得（二重チェック用）
      const cancelledCVs = this._getCancelledCVs(ss);
      console.log('[BillingSystem] キャンセル承認済みCV数:', cancelledCVs.size);

      const merchantFees = {};

      for (const row of rows) {
        const deliveryDate = row[deliveryDateIdx];
        if (!deliveryDate) continue;

        const date = new Date(deliveryDate);
        if (date.getFullYear() !== year || (date.getMonth() + 1) !== monthNum) continue;

        // 配信済みのみカウント
        const status = row[deliveryStatusIdx];
        if (status !== '配信済み' && status !== '成約') continue;

        const merchantId = row[merchantIdIdx];
        const amount = row[deliveryAmountIdx] || this.DEFAULTS.REFERRAL_FEE;
        const cvId = row[cvIdIdx];

        // V2183: キャンセル承認済みCVは除外（二重チェック）
        if (cancelledCVs.has(cvId)) {
          console.log('[BillingSystem] キャンセル済みCV除外:', cvId);
          continue;
        }

        if (!merchantFees[merchantId]) {
          merchantFees[merchantId] = {
            merchantId: merchantId,
            count: 0,
            totalAmount: 0,
            cvIds: []
          };
        }

        merchantFees[merchantId].count++;
        merchantFees[merchantId].totalAmount += Number(amount);
        merchantFees[merchantId].cvIds.push(cvId);
      }

      // 加盟店名を取得
      const merchantNames = this._getMerchantNames(ss);
      const result = Object.values(merchantFees).map(fee => ({
        ...fee,
        merchantName: merchantNames[fee.merchantId] || fee.merchantId,
        tax: Math.floor(fee.totalAmount * this.DEFAULTS.TAX_RATE / 100),
        totalWithTax: fee.totalAmount + Math.floor(fee.totalAmount * this.DEFAULTS.TAX_RATE / 100)
      }));

      return {
        success: true,
        month: targetMonth,
        type: '紹介料',
        data: result,
        summary: {
          totalMerchants: result.length,
          totalCount: result.reduce((sum, r) => sum + r.count, 0),
          totalAmount: result.reduce((sum, r) => sum + r.totalAmount, 0),
          totalWithTax: result.reduce((sum, r) => sum + r.totalWithTax, 0)
        }
      };

    } catch (e) {
      console.error('[BillingSystem] getReferralFees error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 成約手数料集計
   * @param {string} month - 対象月（YYYY-MM形式）、省略時は入金確認済み全件
   */
  getCommissionFees: function(month) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const contractSheet = ss.getSheetByName(this.SHEETS.CONTRACT);

      if (!contractSheet) {
        return { success: false, error: '成約データシートが見つかりません' };
      }

      const data = contractSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // カラムインデックス
      const cvIdIdx = headers.indexOf('CV ID');
      const merchantIdIdx = headers.indexOf('成約加盟店ID');
      const merchantNameIdx = headers.indexOf('成約加盟店名');
      const contractAmountIdx = headers.indexOf('成約金額');
      const paymentConfirmDateIdx = headers.indexOf('入金確認日');
      const paymentAmountIdx = headers.indexOf('入金額');
      const commissionRateIdx = headers.indexOf('手数料率');
      const billingIdIdx = headers.indexOf('請求ID');

      const merchantFees = {};

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const paymentConfirmDate = row[paymentConfirmDateIdx];

        // 入金確認済みのみ
        if (!paymentConfirmDate) continue;

        // 既に請求済みならスキップ
        if (billingIdIdx !== -1 && row[billingIdIdx]) continue;

        // 月指定がある場合はフィルタ
        if (month) {
          const date = new Date(paymentConfirmDate);
          const [year, monthNum] = month.split('-').map(Number);
          if (date.getFullYear() !== year || (date.getMonth() + 1) !== monthNum) continue;
        }

        const cvId = row[cvIdIdx];
        const merchantId = row[merchantIdIdx];
        const merchantName = row[merchantNameIdx];
        const contractAmount = Number(row[contractAmountIdx]) || 0;
        const paymentAmount = Number(row[paymentAmountIdx]) || contractAmount;

        // 手数料率（カラムがあれば使用、なければデフォルト10%）
        let commissionRate = this.DEFAULTS.COMMISSION_RATE;
        if (commissionRateIdx !== -1 && row[commissionRateIdx]) {
          commissionRate = Number(row[commissionRateIdx]);
        }

        const commissionAmount = Math.floor(paymentAmount * commissionRate / 100);

        if (!merchantFees[merchantId]) {
          merchantFees[merchantId] = {
            merchantId: merchantId,
            merchantName: merchantName,
            count: 0,
            totalContractAmount: 0,
            totalPaymentAmount: 0,
            totalCommission: 0,
            details: []
          };
        }

        merchantFees[merchantId].count++;
        merchantFees[merchantId].totalContractAmount += contractAmount;
        merchantFees[merchantId].totalPaymentAmount += paymentAmount;
        merchantFees[merchantId].totalCommission += commissionAmount;
        merchantFees[merchantId].details.push({
          cvId: cvId,
          contractAmount: contractAmount,
          paymentAmount: paymentAmount,
          commissionRate: commissionRate,
          commissionAmount: commissionAmount,
          paymentConfirmDate: paymentConfirmDate,
          rowIndex: i + 2 // シート上の行番号
        });
      }

      const result = Object.values(merchantFees).map(fee => ({
        ...fee,
        tax: Math.floor(fee.totalCommission * this.DEFAULTS.TAX_RATE / 100),
        totalWithTax: fee.totalCommission + Math.floor(fee.totalCommission * this.DEFAULTS.TAX_RATE / 100)
      }));

      return {
        success: true,
        month: month || '全期間（未請求分）',
        type: '成約手数料',
        data: result,
        summary: {
          totalMerchants: result.length,
          totalCount: result.reduce((sum, r) => sum + r.count, 0),
          totalContractAmount: result.reduce((sum, r) => sum + r.totalContractAmount, 0),
          totalCommission: result.reduce((sum, r) => sum + r.totalCommission, 0),
          totalWithTax: result.reduce((sum, r) => sum + r.totalWithTax, 0)
        }
      };

    } catch (e) {
      console.error('[BillingSystem] getCommissionFees error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 請求書生成（請求管理シートに書き込み）
   * @param {string} month - 対象月
   * @param {string} type - 'referral'（紹介料）or 'commission'（成約手数料）or 'all'
   */
  generateInvoices: function(month, type) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません。setupBillingSheetsを実行してください。' };
      }

      const results = [];
      const now = new Date();
      const targetMonth = month || this._getCurrentMonth();

      // 支払方法マップ取得
      const paymentMethods = this._getPaymentMethods(ss);

      // 紹介料請求
      if (type === 'referral' || type === 'all') {
        const referralData = this.getReferralFees(targetMonth);
        if (referralData.success && referralData.data.length > 0) {
          for (const fee of referralData.data) {
            const invoiceId = this._generateInvoiceId('REF', targetMonth);
            const paymentMethod = paymentMethods[fee.merchantId] || '振込';
            const dueDate = this._calculateDueDate(paymentMethod, targetMonth);

            // freee請求書作成（明細付き）
            let freeeInvoiceId = '';
            try {
              const freeeResult = this._createFreeeInvoiceWithDetails(fee, targetMonth, invoiceId, dueDate);
              freeeInvoiceId = freeeResult?.invoice?.id || '';
            } catch (e) {
              console.error('[BillingSystem] freee請求書作成失敗:', e.message);
            }

            const row = [
              invoiceId,
              fee.merchantId,
              fee.merchantName,
              '紹介料',
              targetMonth,
              fee.cvIds.join(', '),
              fee.count,
              fee.totalAmount,
              fee.tax,
              fee.totalWithTax,
              '', // 手数料率（紹介料は不要）
              paymentMethod,
              dueDate,
              freeeInvoiceId, // freee請求書ID
              freeeInvoiceId ? now : '', // 発行日（freee作成成功なら発行済み）
              '', // 入金確認日
              '', // 入金額
              freeeInvoiceId ? '発行済み' : '未発行', // freee作成成功なら発行済み
              0, // 督促回数
              '', // 最終督促日
              '', // 備考
              now,
              now
            ];

            billingSheet.appendRow(row);
            results.push({ type: '紹介料', invoiceId, merchantId: fee.merchantId, amount: fee.totalWithTax, freeeInvoiceId });
          }
        }
      }

      // 成約手数料請求
      if (type === 'commission' || type === 'all') {
        const commissionData = this.getCommissionFees(month);
        if (commissionData.success && commissionData.data.length > 0) {
          for (const fee of commissionData.data) {
            const invoiceId = this._generateInvoiceId('COM', targetMonth);
            const paymentMethod = paymentMethods[fee.merchantId] || '振込';
            // 成約手数料は入金確認後3営業日
            const dueDate = this._addBusinessDays(now, 3);

            const row = [
              invoiceId,
              fee.merchantId,
              fee.merchantName,
              '成約手数料',
              targetMonth,
              fee.details.map(d => d.cvId).join(', '),
              fee.count,
              fee.totalCommission,
              fee.tax,
              fee.totalWithTax,
              this.DEFAULTS.COMMISSION_RATE + '%', // デフォルト手数料率
              paymentMethod,
              dueDate,
              '', // freee請求書ID
              '', // 発行日
              '', // 入金確認日
              '', // 入金額
              '未発行',
              0,
              '',
              '',
              now,
              now
            ];

            billingSheet.appendRow(row);
            results.push({ type: '成約手数料', invoiceId, merchantId: fee.merchantId, amount: fee.totalWithTax });

            // 成約データシートの請求IDを更新
            this._updateContractBillingId(ss, fee.details, invoiceId);
          }
        }
      }

      return {
        success: true,
        message: `${results.length}件の請求を生成しました`,
        invoices: results
      };

    } catch (e) {
      console.error('[BillingSystem] generateInvoices error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 請求一覧取得
   */
  getInvoices: function(month, status, merchantId) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません' };
      }

      const data = billingSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      let invoices = rows.map((row, idx) => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        obj.rowIndex = idx + 2;
        return obj;
      });

      // フィルタ
      if (month) {
        invoices = invoices.filter(inv => inv['対象期間'] === month);
      }
      if (status) {
        invoices = invoices.filter(inv => inv['ステータス'] === status);
      }
      // フランチャイズ用: 加盟店IDでフィルタ
      if (merchantId) {
        invoices = invoices.filter(inv => inv['加盟店ID'] === merchantId);
      }

      return {
        success: true,
        invoices: invoices,
        count: invoices.length
      };

    } catch (e) {
      console.error('[BillingSystem] getInvoices error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 請求ステータス更新
   */
  updateInvoiceStatus: function(invoiceId, status, paymentDate) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません' };
      }

      const data = billingSheet.getDataRange().getValues();
      const headers = data[0];
      const invoiceIdIdx = headers.indexOf('請求ID');
      const statusIdx = headers.indexOf('ステータス');
      const paymentDateIdx = headers.indexOf('入金確認日');
      const lastUpdateIdx = headers.indexOf('最終更新日時');

      for (let i = 1; i < data.length; i++) {
        if (data[i][invoiceIdIdx] === invoiceId) {
          billingSheet.getRange(i + 1, statusIdx + 1).setValue(status);
          if (paymentDate) {
            billingSheet.getRange(i + 1, paymentDateIdx + 1).setValue(paymentDate);
          }
          billingSheet.getRange(i + 1, lastUpdateIdx + 1).setValue(new Date());

          return {
            success: true,
            message: `請求 ${invoiceId} のステータスを ${status} に更新しました`
          };
        }
      }

      return { success: false, error: '請求IDが見つかりません: ' + invoiceId };

    } catch (e) {
      console.error('[BillingSystem] updateInvoiceStatus error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 入金確認チェック（GMOあおぞらAPI連携用プレースホルダー）
   */
  checkPayments: function() {
    // TODO: GMOあおぞらAPI連携
    return {
      success: true,
      message: 'GMOあおぞらAPI連携は未実装です',
      hint: 'GMO_AOZORA_API_KEYをScript Propertiesに設定してください'
    };
  },

  /**
   * 未入金督促送信
   * 支払期限超過の請求に対して督促メール/Slack通知を送信
   */
  sendReminders: function() {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません' };
      }

      // 発行済み or 未入金 の請求を取得
      const invoicesResult = this.getInvoices();
      if (!invoicesResult.success) return invoicesResult;

      const now = new Date();
      const overdueInvoices = [];
      const sentReminders = [];

      for (const inv of invoicesResult.invoices) {
        const status = inv['ステータス'];
        // 発行済み or 未入金 のみ対象
        if (status !== '発行済み' && status !== '未入金') continue;

        const dueDate = new Date(inv['支払期限']);
        if (dueDate >= now) continue; // まだ期限内

        const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        const reminderCount = inv['督促回数'] || 0;
        const lastReminderDate = inv['最終督促日'] ? new Date(inv['最終督促日']) : null;

        // 督促ルール
        // 1回目: 期限翌日
        // 2回目: 期限3日後
        // 3回目: 期限7日後
        // 以降: 7日ごと
        let shouldRemind = false;
        if (reminderCount === 0 && daysPastDue >= 1) {
          shouldRemind = true;
        } else if (reminderCount === 1 && daysPastDue >= 3) {
          shouldRemind = true;
        } else if (reminderCount === 2 && daysPastDue >= 7) {
          shouldRemind = true;
        } else if (reminderCount >= 3) {
          // 前回から7日経過
          if (lastReminderDate) {
            const daysSinceLastReminder = Math.floor((now - lastReminderDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastReminder >= 7) {
              shouldRemind = true;
            }
          }
        }

        overdueInvoices.push({
          ...inv,
          daysPastDue: daysPastDue,
          reminderCount: reminderCount,
          shouldRemind: shouldRemind
        });

        if (shouldRemind) {
          // 督促送信
          const reminderResult = this._sendReminderNotification(inv, reminderCount + 1, daysPastDue);

          if (reminderResult.success) {
            // シート更新: 督促回数++、最終督促日更新、ステータスを未入金に
            this._updateReminderStatus(billingSheet, inv.rowIndex, reminderCount + 1, now);

            sentReminders.push({
              invoiceId: inv['請求ID'],
              merchantName: inv['加盟店名'],
              amount: inv['税込金額'],
              daysPastDue: daysPastDue,
              reminderNumber: reminderCount + 1
            });
          }
        }
      }

      // 管理者へサマリー通知
      if (overdueInvoices.length > 0) {
        this._sendAdminSummary(overdueInvoices, sentReminders);
      }

      return {
        success: true,
        overdueCount: overdueInvoices.length,
        sentRemindersCount: sentReminders.length,
        message: `${overdueInvoices.length}件の未入金請求、${sentReminders.length}件の督促を送信`,
        overdueInvoices: overdueInvoices.map(inv => ({
          invoiceId: inv['請求ID'],
          merchantName: inv['加盟店名'],
          amount: inv['税込金額'],
          dueDate: inv['支払期限'],
          daysPastDue: inv.daysPastDue,
          reminderCount: inv.reminderCount
        })),
        sentReminders: sentReminders
      };

    } catch (e) {
      console.error('[BillingSystem] sendReminders error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 督促通知送信（メール + Slack）
   */
  _sendReminderNotification: function(invoice, reminderNumber, daysPastDue) {
    try {
      const merchantEmail = invoice['請求先メールアドレス'] || this._getMerchantEmail(invoice['加盟店ID']);

      // メール送信
      if (merchantEmail) {
        const subject = reminderNumber === 1
          ? `【ご確認】お支払い期限超過のご案内 - ${invoice['請求ID']}`
          : `【${reminderNumber}回目】お支払いのお願い - ${invoice['請求ID']}`;

        const urgencyText = reminderNumber >= 3 ? '【至急】' : '';
        const body = `
${invoice['加盟店名']} 御中

${urgencyText}下記請求について、お支払い期限を${daysPastDue}日経過しておりますのでご確認をお願いいたします。

━━━━━━━━━━━━━━━━━━━━
■ 請求内容
━━━━━━━━━━━━━━━━━━━━
請求ID: ${invoice['請求ID']}
請求種別: ${invoice['請求種別']}
対象期間: ${invoice['対象期間']}
ご請求金額: ${Number(invoice['税込金額']).toLocaleString()}円（税込）
お支払期限: ${this._formatDate(invoice['支払期限'])}
━━━━━━━━━━━━━━━━━━━━

${reminderNumber >= 3 ? '※ 本メールは3回目以上の督促となります。\nお早めのご対応をお願いいたします。\n\n' : ''}
既にお支払い済みの場合は、本メールは行き違いとなりますのでご容赦ください。

ご不明点がございましたら、下記までお問い合わせください。

━━━━━━━━━━━━━━━━━━━━
くらべる 運営事務局
━━━━━━━━━━━━━━━━━━━━
`;

        GmailApp.sendEmail(merchantEmail, subject, body);
        console.log('[BillingSystem] 督促メール送信:', invoice['請求ID'], merchantEmail);
      }

      // Slack通知（社内向け）
      this._sendSlackNotification({
        type: 'reminder_sent',
        invoiceId: invoice['請求ID'],
        merchantName: invoice['加盟店名'],
        amount: invoice['税込金額'],
        daysPastDue: daysPastDue,
        reminderNumber: reminderNumber
      });

      return { success: true };

    } catch (e) {
      console.error('[BillingSystem] _sendReminderNotification error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 督促ステータス更新
   */
  _updateReminderStatus: function(sheet, rowIndex, newReminderCount, reminderDate) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusIdx = headers.indexOf('ステータス');
    const reminderCountIdx = headers.indexOf('督促回数');
    const lastReminderIdx = headers.indexOf('最終督促日');
    const lastUpdateIdx = headers.indexOf('最終更新日時');

    if (statusIdx !== -1) {
      sheet.getRange(rowIndex, statusIdx + 1).setValue('未入金');
    }
    if (reminderCountIdx !== -1) {
      sheet.getRange(rowIndex, reminderCountIdx + 1).setValue(newReminderCount);
    }
    if (lastReminderIdx !== -1) {
      sheet.getRange(rowIndex, lastReminderIdx + 1).setValue(reminderDate);
    }
    if (lastUpdateIdx !== -1) {
      sheet.getRange(rowIndex, lastUpdateIdx + 1).setValue(reminderDate);
    }
  },

  /**
   * 管理者へのサマリー通知
   */
  _sendAdminSummary: function(overdueInvoices, sentReminders) {
    const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv['税込金額'] || 0), 0);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '💰 未入金請求サマリー',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*未入金件数:* ${overdueInvoices.length}件`
          },
          {
            type: 'mrkdwn',
            text: `*未入金合計:* ¥${totalOverdueAmount.toLocaleString()}`
          },
          {
            type: 'mrkdwn',
            text: `*本日督促送信:* ${sentReminders.length}件`
          }
        ]
      }
    ];

    // 高額または長期未入金をハイライト
    const critical = overdueInvoices.filter(inv => inv.daysPastDue >= 14 || Number(inv['税込金額']) >= 100000);
    if (critical.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*⚠️ 要注意（14日以上 or 10万円以上）:*\n' + critical.map(inv =>
            `• ${inv['加盟店名']} - ¥${Number(inv['税込金額']).toLocaleString()} (${inv.daysPastDue}日超過)`
          ).join('\n')
        }
      });
    }

    this._sendSlackNotification({
      type: 'admin_summary',
      blocks: blocks
    });
  },

  /**
   * 入金確認時の通知
   */
  confirmPayment: function(invoiceId, paymentAmount, paymentDate) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません' };
      }

      const data = billingSheet.getDataRange().getValues();
      const headers = data[0];
      const invoiceIdIdx = headers.indexOf('請求ID');
      const statusIdx = headers.indexOf('ステータス');
      const paymentDateIdx = headers.indexOf('入金確認日');
      const paymentAmountIdx = headers.indexOf('入金額');
      const lastUpdateIdx = headers.indexOf('最終更新日時');
      const merchantNameIdx = headers.indexOf('加盟店名');
      const taxAmountIdx = headers.indexOf('税込金額');

      for (let i = 1; i < data.length; i++) {
        if (data[i][invoiceIdIdx] === invoiceId) {
          const merchantName = data[i][merchantNameIdx];
          const expectedAmount = Number(data[i][taxAmountIdx]);
          const actualAmount = Number(paymentAmount);
          const pDate = paymentDate || new Date();

          // ステータス判定
          let newStatus = '入金済み';
          let note = '';
          if (actualAmount < expectedAmount) {
            newStatus = '一部入金';
            note = `差額: ¥${(expectedAmount - actualAmount).toLocaleString()}`;
          } else if (actualAmount > expectedAmount) {
            note = `過入金: ¥${(actualAmount - expectedAmount).toLocaleString()}`;
          }

          // シート更新
          billingSheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
          billingSheet.getRange(i + 1, paymentDateIdx + 1).setValue(pDate);
          billingSheet.getRange(i + 1, paymentAmountIdx + 1).setValue(actualAmount);
          billingSheet.getRange(i + 1, lastUpdateIdx + 1).setValue(new Date());

          // 通知
          this._sendPaymentConfirmNotification({
            invoiceId: invoiceId,
            merchantName: merchantName,
            expectedAmount: expectedAmount,
            actualAmount: actualAmount,
            status: newStatus,
            note: note
          });

          return {
            success: true,
            message: `請求 ${invoiceId} の入金を確認しました`,
            status: newStatus,
            note: note
          };
        }
      }

      return { success: false, error: '請求IDが見つかりません: ' + invoiceId };

    } catch (e) {
      console.error('[BillingSystem] confirmPayment error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 入金確認通知
   */
  _sendPaymentConfirmNotification: function(data) {
    const emoji = data.status === '入金済み' ? '✅' : '⚠️';
    const color = data.status === '入金済み' ? 'good' : 'warning';

    this._sendSlackNotification({
      type: 'payment_confirmed',
      text: `${emoji} 入金確認: ${data.merchantName}`,
      attachments: [{
        color: color,
        fields: [
          { title: '請求ID', value: data.invoiceId, short: true },
          { title: 'ステータス', value: data.status, short: true },
          { title: '請求金額', value: `¥${data.expectedAmount.toLocaleString()}`, short: true },
          { title: '入金額', value: `¥${data.actualAmount.toLocaleString()}`, short: true }
        ],
        footer: data.note || ''
      }]
    });
  },

  /**
   * Slack通知送信
   */
  _sendSlackNotification: function(data) {
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_BILLING_WEBHOOK_URL')
        || PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

      if (!webhookUrl) {
        console.log('[BillingSystem] Slack webhook URLが設定されていません');
        return;
      }

      let payload = {};

      if (data.type === 'admin_summary' && data.blocks) {
        payload = { blocks: data.blocks };
      } else if (data.type === 'payment_confirmed') {
        payload = {
          text: data.text,
          attachments: data.attachments
        };
      } else if (data.type === 'reminder_sent') {
        payload = {
          text: `📨 督促送信（${data.reminderNumber}回目）`,
          attachments: [{
            color: data.reminderNumber >= 3 ? 'danger' : 'warning',
            fields: [
              { title: '請求ID', value: data.invoiceId, short: true },
              { title: '加盟店', value: data.merchantName, short: true },
              { title: '金額', value: `¥${Number(data.amount).toLocaleString()}`, short: true },
              { title: '超過日数', value: `${data.daysPastDue}日`, short: true }
            ]
          }]
        };
      }

      UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      console.log('[BillingSystem] Slack通知送信完了:', data.type);

    } catch (e) {
      console.error('[BillingSystem] Slack通知エラー:', e);
    }
  },

  /**
   * 加盟店のメールアドレス取得
   */
  _getMerchantEmail: function(merchantId) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);

      if (!masterSheet) return null;

      const data = masterSheet.getDataRange().getValues();
      const headers = data[0];
      const idIdx = headers.indexOf('加盟店ID');
      const emailIdx = headers.indexOf('請求先メールアドレス');
      const contactEmailIdx = headers.indexOf('メールアドレス'); // フォールバック

      if (idIdx === -1) return null;

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === merchantId) {
          if (emailIdx !== -1 && data[i][emailIdx]) {
            return data[i][emailIdx];
          }
          if (contactEmailIdx !== -1 && data[i][contactEmailIdx]) {
            return data[i][contactEmailIdx];
          }
        }
      }
      return null;

    } catch (e) {
      console.error('[BillingSystem] _getMerchantEmail error:', e);
      return null;
    }
  },

  /**
   * 日付フォーマット
   */
  _formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  // ========== ヘルパー関数 ==========

  _getCurrentMonth: function() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  _generateInvoiceId: function(prefix, month) {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${prefix}-${month.replace('-', '')}-${timestamp}`;
  },

  _getMerchantNames: function(ss) {
    const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);
    if (!masterSheet) return {};

    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('加盟店ID');
    const nameIdx = headers.indexOf('会社名');

    const names = {};
    for (let i = 1; i < data.length; i++) {
      names[data[i][idIdx]] = data[i][nameIdx];
    }
    return names;
  },

  /**
   * V2183: キャンセル承認済みCVリストを取得
   * @param {Spreadsheet} ss - スプレッドシート
   * @return {Set} キャンセル承認済みCV IDのSet
   */
  _getCancelledCVs: function(ss) {
    const cancelledCVs = new Set();

    try {
      const cancelSheet = ss.getSheetByName('キャンセル申請');
      if (!cancelSheet) return cancelledCVs;

      const data = cancelSheet.getDataRange().getValues();
      if (data.length <= 1) return cancelledCVs;

      const headers = data[0];
      const cvIdIdx = headers.indexOf('CV ID');
      const statusIdx = headers.indexOf('承認ステータス');

      if (cvIdIdx === -1 || statusIdx === -1) return cancelledCVs;

      for (let i = 1; i < data.length; i++) {
        // 承認済みのキャンセル申請のCV IDを収集
        if (data[i][statusIdx] === '承認済み') {
          cancelledCVs.add(data[i][cvIdIdx]);
        }
      }

      return cancelledCVs;
    } catch (e) {
      console.error('[BillingSystem] _getCancelledCVs error:', e);
      return cancelledCVs;
    }
  },

  _getPaymentMethods: function(ss) {
    const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);
    if (!masterSheet) return {};

    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('加盟店ID');
    const methodIdx = headers.indexOf('支払方法');

    if (methodIdx === -1) return {};

    const methods = {};
    for (let i = 1; i < data.length; i++) {
      methods[data[i][idIdx]] = data[i][methodIdx] || '振込';
    }
    return methods;
  },

  _calculateDueDate: function(paymentMethod, month) {
    const [year, monthNum] = month.split('-').map(Number);
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;

    let dueDate;
    if (paymentMethod === '口座振替') {
      // 翌月27日
      dueDate = new Date(nextYear, nextMonth - 1, 27);
    } else {
      // 翌月15日（振込）
      dueDate = new Date(nextYear, nextMonth - 1, 15);
    }

    // 土日祝なら翌営業日に調整
    return this._adjustToBusinessDay(dueDate);
  },

  /**
   * 土日祝なら翌営業日に調整
   */
  _adjustToBusinessDay: function(date) {
    const result = new Date(date);
    const holidays = this._getJapaneseHolidays(result.getFullYear());

    // 土日または祝日の間はずらす
    while (this._isWeekend(result) || this._isHoliday(result, holidays)) {
      result.setDate(result.getDate() + 1);
      // 年をまたぐ場合は祝日リストを更新
      if (result.getFullYear() !== date.getFullYear()) {
        holidays.push(...this._getJapaneseHolidays(result.getFullYear()));
      }
    }
    return result;
  },

  _isWeekend: function(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 日曜=0, 土曜=6
  },

  _isHoliday: function(date, holidays) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.includes(dateStr);
  },

  /**
   * 日本の祝日リスト（簡易版）
   * 実運用では祝日APIを使うべき
   */
  _getJapaneseHolidays: function(year) {
    // 固定祝日
    const holidays = [
      `${year}-01-01`, // 元日
      `${year}-02-11`, // 建国記念の日
      `${year}-02-23`, // 天皇誕生日
      `${year}-04-29`, // 昭和の日
      `${year}-05-03`, // 憲法記念日
      `${year}-05-04`, // みどりの日
      `${year}-05-05`, // こどもの日
      `${year}-08-11`, // 山の日
      `${year}-11-03`, // 文化の日
      `${year}-11-23`, // 勤労感謝の日
    ];

    // ハッピーマンデー（第2月曜など）
    holidays.push(this._getNthMonday(year, 1, 2));  // 成人の日: 1月第2月曜
    holidays.push(this._getNthMonday(year, 7, 3));  // 海の日: 7月第3月曜
    holidays.push(this._getNthMonday(year, 9, 3));  // 敬老の日: 9月第3月曜
    holidays.push(this._getNthMonday(year, 10, 2)); // スポーツの日: 10月第2月曜

    // 春分の日・秋分の日（近似計算）
    holidays.push(`${year}-03-${Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4)}`);
    holidays.push(`${year}-09-${Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4)}`);

    return holidays;
  },

  _getNthMonday: function(year, month, n) {
    const firstDay = new Date(year, month - 1, 1);
    const firstMonday = 1 + (8 - firstDay.getDay()) % 7;
    const nthMonday = firstMonday + (n - 1) * 7;
    return `${year}-${String(month).padStart(2, '0')}-${String(nthMonday).padStart(2, '0')}`;
  },

  _addBusinessDays: function(date, days) {
    const result = new Date(date);
    let count = 0;
    while (count < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }
    return result;
  },

  _updateContractBillingId: function(ss, details, invoiceId) {
    const contractSheet = ss.getSheetByName(this.SHEETS.CONTRACT);
    if (!contractSheet) return;

    const headers = contractSheet.getRange(1, 1, 1, contractSheet.getLastColumn()).getValues()[0];
    const billingIdIdx = headers.indexOf('請求ID');
    if (billingIdIdx === -1) return;

    for (const detail of details) {
      contractSheet.getRange(detail.rowIndex, billingIdIdx + 1).setValue(invoiceId);
    }
  },

  /**
   * freee請求書を明細付きで作成
   * @param {Object} fee - 請求データ（getReferralFees/getCommissionFeesの結果）
   * @param {string} targetMonth - 対象月（YYYY-MM）
   * @param {string} invoiceId - 請求ID（スプシ管理用）
   * @param {Date} dueDate - 支払期限
   * @returns {Object} freeeAPIの結果
   */
  _createFreeeInvoiceWithDetails: function(fee, targetMonth, invoiceId, dueDate) {
    // FreeeAPIがグローバルで存在するか確認
    if (typeof FreeeAPI === 'undefined') {
      console.warn('[BillingSystem] FreeeAPIが定義されていません');
      return null;
    }

    // 加盟店のfreee取引先IDを取得
    let partnerId = this._getFreeePartnerId(fee.merchantId);
    if (!partnerId) {
      console.warn('[BillingSystem] freee取引先IDが見つかりません:', fee.merchantName);
      // 取引先が存在しない場合は作成
      const newPartner = this._createFreeePartner(fee.merchantId, fee.merchantName);
      if (!newPartner?.partner?.id) {
        console.error('[BillingSystem] freee取引先作成失敗');
        return null;
      }
      partnerId = newPartner.partner.id;
      console.log('[BillingSystem] freee取引先作成成功 ID:', partnerId);
    }

    // 加盟店のメールアドレス取得
    const merchantEmail = this._getMerchantEmail(fee.merchantId);

    // 明細データ構築（紹介料の場合）
    const items = [];
    if (fee.cvIds && fee.cvIds.length > 0) {
      // CV明細（顧客名は取得できれば追加）
      const cvDetails = this._getCvDetails(fee.cvIds);

      for (let i = 0; i < fee.cvIds.length; i++) {
        const cvId = fee.cvIds[i];
        const cvDetail = cvDetails[cvId] || {};
        const customerName = cvDetail.customerName || '';
        const itemName = customerName
          ? `紹介料（${cvId}: ${customerName}様）`
          : `紹介料（${cvId}）`;

        items.push({
          name: itemName,
          quantity: 1,
          unit: '件',
          unitPrice: this.DEFAULTS.REFERRAL_FEE,
          description: cvDetail.workContent || ''
        });
      }
    } else if (fee.details && fee.details.length > 0) {
      // 成約手数料の場合
      for (const detail of fee.details) {
        items.push({
          name: `成約手数料（${detail.cvId}）`,
          quantity: 1,
          unit: '件',
          unitPrice: detail.commissionAmount,
          description: `成約金額: ¥${Number(detail.contractAmount).toLocaleString()}`
        });
      }
    }

    if (items.length === 0) {
      // 明細がない場合は一括で
      items.push({
        name: fee.type === 'commission' ? '成約手数料' : '紹介料',
        quantity: fee.count,
        unit: '件',
        unitPrice: fee.type === 'commission'
          ? Math.floor(fee.totalCommission / fee.count)
          : this.DEFAULTS.REFERRAL_FEE,
        description: `${targetMonth}分`
      });
    }

    // freee請求書作成
    const invoiceData = {
      partnerId: partnerId,
      invoiceNumber: invoiceId,
      title: `${targetMonth} ${fee.type === 'commission' ? '成約手数料' : '紹介料'}請求書`,
      dueDate: dueDate,
      items: items,
      sendEmail: !!merchantEmail,
      email: merchantEmail,
      message: `${fee.merchantName} 御中\n\nいつもお世話になっております。\n${targetMonth}分の${fee.type === 'commission' ? '成約手数料' : '紹介料'}をご請求申し上げます。`
    };

    console.log('[BillingSystem] freee請求書作成:', invoiceData.invoiceNumber);

    try {
      const result = FreeeAPI.createInvoice(invoiceData);
      return result;
    } catch (e) {
      console.error('[BillingSystem] freee請求書作成エラー:', e.message);
      return null;
    }
  },

  /**
   * 加盟店のfreee取引先IDを取得
   */
  _getFreeePartnerId: function(merchantId) {
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(ssId);
    const merchantSheet = ss.getSheetByName(this.SHEETS.MERCHANTS);
    if (!merchantSheet) return null;

    const data = merchantSheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('加盟店ID');
    const freeeIdIdx = headers.indexOf('freee取引先ID');

    if (idIdx === -1 || freeeIdIdx === -1) return null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === merchantId) {
        return data[i][freeeIdIdx] || null;
      }
    }
    return null;
  },

  /**
   * freee取引先を新規作成し、スプシに保存
   * 既存の場合は検索してIDを取得
   */
  _createFreeePartner: function(merchantId, merchantName) {
    if (typeof FreeeAPI === 'undefined') return null;

    try {
      const result = FreeeAPI.createPartner({
        name: merchantName,
        code: merchantId,
        longName: merchantName
      });

      if (result?.partner?.id) {
        // スプシに保存
        this._saveFreeePartnerId(merchantId, result.partner.id);
      }

      return result;
    } catch (e) {
      console.error('[BillingSystem] freee取引先作成エラー:', e.message);

      // 「既に使用されています」エラーの場合、既存の取引先を検索
      if (e.message && e.message.includes('既に使用されています')) {
        console.log('[BillingSystem] 既存の取引先を検索:', merchantName);
        try {
          const existing = FreeeAPI.findPartnerByName(merchantName);
          if (existing?.id) {
            console.log('[BillingSystem] 既存取引先ID取得成功:', existing.id);
            this._saveFreeePartnerId(merchantId, existing.id);
            return { partner: existing };
          }
        } catch (searchError) {
          console.error('[BillingSystem] 取引先検索エラー:', searchError.message);
        }
      }

      return null;
    }
  },

  /**
   * freee取引先IDをスプシに保存
   */
  _saveFreeePartnerId: function(merchantId, partnerId) {
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(ssId);
    const merchantSheet = ss.getSheetByName(this.SHEETS.MERCHANTS);
    if (!merchantSheet) return;

    const data = merchantSheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf('加盟店ID');
    let freeeIdIdx = headers.indexOf('freee取引先ID');

    // カラムがなければ追加
    if (freeeIdIdx === -1) {
      merchantSheet.getRange(1, headers.length + 1).setValue('freee取引先ID');
      freeeIdIdx = headers.length;
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === merchantId) {
        merchantSheet.getRange(i + 1, freeeIdIdx + 1).setValue(partnerId);
        break;
      }
    }
  },

  /**
   * CV詳細情報を取得（顧客名など）
   */
  _getCvDetails: function(cvIds) {
    const details = {};
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(ssId);
    const cvSheet = ss.getSheetByName('配信管理');
    if (!cvSheet) return details;

    const data = cvSheet.getDataRange().getValues();
    const headers = data[0];
    const cvIdIdx = headers.indexOf('CV ID');
    const nameIdx = headers.indexOf('お名前') !== -1 ? headers.indexOf('お名前') : headers.indexOf('顧客名');
    const workIdx = headers.indexOf('工事内容') !== -1 ? headers.indexOf('工事内容') : headers.indexOf('希望工事');

    for (let i = 1; i < data.length; i++) {
      const cvId = data[i][cvIdIdx];
      if (cvIds.includes(cvId)) {
        details[cvId] = {
          customerName: nameIdx !== -1 ? data[i][nameIdx] : '',
          workContent: workIdx !== -1 ? data[i][workIdx] : ''
        };
      }
    }
    return details;
  },

  /**
   * 個別請求書PDF送信
   * @param {string} invoiceId - 請求ID
   */
  sendInvoicePdf: function(invoiceId) {
    try {
      console.log('[BillingSystem] PDF送信開始:', invoiceId);

      // 請求データ取得
      const invoices = this.getInvoices(null, null, null);
      if (!invoices.success) {
        return { success: false, error: '請求データ取得失敗' };
      }

      const invoice = invoices.invoices.find(inv => inv['請求ID'] === invoiceId);
      if (!invoice) {
        return { success: false, error: '請求が見つかりません: ' + invoiceId };
      }

      // 加盟店のメールアドレス取得
      const email = this._getMerchantEmail(invoice['加盟店ID']);
      if (!email) {
        return { success: false, error: '加盟店のメールアドレスが未登録です' };
      }

      // CV明細を取得
      const cvIds = invoice['対象CV ID'] ? invoice['対象CV ID'].split(', ') : [];
      const items = cvIds.map(cvId => ({
        name: `紹介料（${cvId}）`,
        quantity: 1,
        unitPrice: 20000
      }));

      // PDF生成用データ作成
      const invoiceData = InvoicePdfGenerator.createInvoiceDataFromBilling(invoice, items);

      // PDF生成＆メール送信
      const result = InvoicePdfGenerator.generateAndSendPdf(invoiceData, email);

      if (result.success) {
        // 請求管理シートのPDF送信日を更新
        this._updatePdfSentDate(invoiceId);
      }

      return {
        success: result.success,
        sentTo: email,
        fileName: result.fileName || `請求書_${invoiceId}.pdf`,
        pdfUrl: result.pdfUrl,
        error: result.error
      };

    } catch (e) {
      console.error('[BillingSystem] sendInvoicePdf error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 加盟店メールアドレス取得
   */
  _getMerchantEmail: function(merchantId) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 加盟店登録シートからメール取得
      const sheet = ss.getSheetByName(this.SHEETS.MERCHANT_REGISTRATION);
      if (!sheet) return null;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIdx = headers.indexOf('登録ID');
      const emailIdx = headers.indexOf('請求用メールアドレス');

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === merchantId) {
          return data[i][emailIdx];
        }
      }
      return null;
    } catch (e) {
      console.error('[BillingSystem] _getMerchantEmail error:', e);
      return null;
    }
  },

  /**
   * PDF送信日を更新
   */
  _updatePdfSentDate: function(invoiceId) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const sheet = ss.getSheetByName(this.SHEETS.BILLING);
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIdx = headers.indexOf('請求ID');
      let pdfSentIdx = headers.indexOf('PDF送信日');

      // PDF送信日カラムがなければ追加
      if (pdfSentIdx === -1) {
        pdfSentIdx = headers.length;
        sheet.getRange(1, pdfSentIdx + 1).setValue('PDF送信日');
      }

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === invoiceId) {
          sheet.getRange(i + 1, pdfSentIdx + 1).setValue(new Date());
          break;
        }
      }
    } catch (e) {
      console.error('[BillingSystem] _updatePdfSentDate error:', e);
    }
  },

  /**
   * 月次自動請求生成（毎月1日にトリガーで実行）
   * - 前月の紹介料を集計
   * - freeeに売上登録
   * - 請求管理シートに記録
   * - PDF生成＆メール送信
   * - Slack通知
   */
  autoGenerateMonthlyInvoices: function() {
    console.log('========== 月次自動請求生成 開始 ==========');
    const results = {
      success: true,
      invoicesGenerated: 0,
      pdfsSent: 0,
      errors: []
    };

    try {
      // 1. 前月の請求生成（freee登録 + スプシ記録）
      const genResult = this.generateInvoices(null, 'referral');
      if (!genResult.success) {
        results.errors.push('請求生成失敗: ' + genResult.error);
        this._sendSlackNotification('請求生成エラー', genResult.error, 'error');
        return results;
      }

      results.invoicesGenerated = genResult.invoices?.length || 0;
      console.log('請求生成完了:', results.invoicesGenerated, '件');

      // 2. 生成した請求書のPDF送信
      if (genResult.invoices && genResult.invoices.length > 0) {
        for (const inv of genResult.invoices) {
          try {
            const pdfResult = this.sendInvoicePdf(inv.invoiceId);
            if (pdfResult.success) {
              results.pdfsSent++;
              console.log('PDF送信成功:', inv.invoiceId, '→', pdfResult.sentTo);
            } else {
              results.errors.push(`${inv.invoiceId}: ${pdfResult.error}`);
            }
          } catch (e) {
            results.errors.push(`${inv.invoiceId}: ${e.message}`);
          }
        }
      }

      // 3. 完了通知
      const message = `請求生成: ${results.invoicesGenerated}件\nPDF送信: ${results.pdfsSent}件` +
        (results.errors.length > 0 ? `\n\nエラー:\n${results.errors.join('\n')}` : '');

      this._sendSlackNotification(
        results.errors.length === 0 ? '月次請求生成完了' : '月次請求生成完了（一部エラー）',
        message,
        results.errors.length === 0 ? 'success' : 'warning'
      );

      console.log('========== 月次自動請求生成 完了 ==========');
      return results;

    } catch (e) {
      console.error('[BillingSystem] autoGenerateMonthlyInvoices error:', e);
      results.success = false;
      results.errors.push(e.message);
      this._sendSlackNotification('月次請求生成 致命的エラー', e.message, 'error');
      return results;
    }
  },

  /**
   * Slack通知
   */
  _sendSlackNotification: function(title, message, type) {
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
      if (!webhookUrl) {
        console.log('[BillingSystem] Slack Webhook未設定、通知スキップ');
        return;
      }

      const colors = {
        success: '#36a64f',
        warning: '#ff9800',
        error: '#d32f2f'
      };

      const payload = {
        attachments: [{
          color: colors[type] || '#2196f3',
          title: `【請求システム】${title}`,
          text: message,
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload)
      });

    } catch (e) {
      console.error('[BillingSystem] Slack通知エラー:', e);
    }
  },

  // ========================================
  // フランチャイズダッシュボード向けAPI
  // ========================================

  /**
   * 紹介料履歴取得（加盟店向け）
   * 配信管理シート + ユーザー登録シートから案件単位のデータを取得
   */
  getReferralHistory: function(merchantId, month) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 配信管理シート
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      // ユーザー登録シート（CV情報）
      const userSheet = ss.getSheetByName('ユーザー登録');
      if (!userSheet) {
        return { success: false, error: 'ユーザー登録シートが見つかりません' };
      }

      // 請求管理シート（支払状況）
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      // 配信管理データ取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const dIdx = {
        cvId: deliveryHeaders.indexOf('CV ID'),
        merchantId: deliveryHeaders.indexOf('加盟店ID'),
        deliveryDate: deliveryHeaders.indexOf('配信日時'),
        deliveryStatus: deliveryHeaders.indexOf('配信ステータス'),
        deliveryAmount: deliveryHeaders.indexOf('配信金額'),
        contractAmount: deliveryHeaders.indexOf('成約金額'),
        contractDate: deliveryHeaders.indexOf('成約日時')
      };

      // ユーザー登録データ取得（CV情報用）
      const userData = userSheet.getDataRange().getValues();
      const userHeaders = userData[0];
      const uIdx = {
        cvId: userHeaders.indexOf('CV ID'),
        name: userHeaders.indexOf('氏名'),
        propertyType: userHeaders.indexOf('物件種別'),
        workContent: userHeaders.indexOf('Q9_希望工事内容_外壁')
      };

      // CV情報をマップ化
      const cvInfoMap = {};
      for (let i = 1; i < userData.length; i++) {
        const cvId = userData[i][uIdx.cvId];
        if (cvId) {
          cvInfoMap[cvId] = {
            customerName: userData[i][uIdx.name] || '名前なし',
            propertyType: userData[i][uIdx.propertyType] || '-',
            workContent: userData[i][uIdx.workContent] || '-'
          };
        }
      }

      // 請求データをマップ化（CV ID → 支払状況）
      const paymentStatusMap = {};
      if (billingSheet) {
        const billingData = billingSheet.getDataRange().getValues();
        const billingHeaders = billingData[0];
        const bIdx = {
          merchantId: billingHeaders.indexOf('加盟店ID'),
          cvIds: billingHeaders.indexOf('対象CV ID'),
          status: billingHeaders.indexOf('ステータス'),
          paymentDue: billingHeaders.indexOf('支払期限')
        };

        for (let i = 1; i < billingData.length; i++) {
          const bMerchantId = billingData[i][bIdx.merchantId];
          if (bMerchantId !== merchantId) continue;

          const cvIdsStr = billingData[i][bIdx.cvIds] || '';
          const status = billingData[i][bIdx.status];
          const paymentDue = billingData[i][bIdx.paymentDue];

          cvIdsStr.split(', ').forEach(cvId => {
            if (cvId) {
              paymentStatusMap[cvId] = {
                status: status,
                paymentDue: paymentDue
              };
            }
          });
        }
      }

      // 対象月のフィルタ
      let targetYear, targetMonth;
      if (month) {
        const parts = month.split('-');
        targetYear = parseInt(parts[0]);
        targetMonth = parseInt(parts[1]);
      }

      // 紹介料履歴を構築
      const history = [];
      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        const rowMerchantId = row[dIdx.merchantId];

        // 加盟店IDでフィルタ
        if (rowMerchantId !== merchantId) continue;

        // 配信済みのみ
        const status = row[dIdx.deliveryStatus];
        if (status !== '配信済み' && status !== '成約') continue;

        const deliveryDate = row[dIdx.deliveryDate];
        if (!deliveryDate) continue;

        // 月フィルタ
        const date = new Date(deliveryDate);
        if (targetYear && targetMonth) {
          if (date.getFullYear() !== targetYear || (date.getMonth() + 1) !== targetMonth) continue;
        }

        const cvId = row[dIdx.cvId];
        const cvInfo = cvInfoMap[cvId] || {};
        const paymentInfo = paymentStatusMap[cvId] || {};

        const referralFee = row[dIdx.deliveryAmount] || this.DEFAULTS.REFERRAL_FEE;
        const contractAmount = row[dIdx.contractAmount] || 0;
        const contractDate = row[dIdx.contractDate];

        // ROI計算（成約時のみ）
        let roi = null;
        if (contractAmount && referralFee) {
          roi = Math.round((contractAmount / referralFee) * 100);
        }

        history.push({
          cvId: cvId,
          referralDate: this._formatDateForApi(date),
          customerName: cvInfo.customerName || '名前なし',
          propertyType: cvInfo.propertyType,
          workContent: cvInfo.workContent,
          referralFee: referralFee,
          paymentDue: this._formatDateForApi(paymentInfo.paymentDue),
          paymentStatus: paymentInfo.status || '請求待ち',
          contractAmount: contractAmount,
          contractDate: this._formatDateForApi(contractDate),
          roi: roi
        });
      }

      // 日付降順でソート
      history.sort((a, b) => new Date(b.referralDate) - new Date(a.referralDate));

      return {
        success: true,
        merchantId: merchantId,
        month: month || 'all',
        count: history.length,
        history: history
      };

    } catch (e) {
      console.error('[BillingSystem] getReferralHistory error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 財務サマリー取得（加盟店向け）
   */
  getFinancialSummary: function(merchantId) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 配信管理シートから紹介料・成約を集計（V2198: 請求管理→配信管理に変更）
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      const data = deliverySheet.getDataRange().getValues();
      const headers = data[0];
      const idx = {
        merchantId: headers.indexOf('加盟店ID'),
        deliveryDate: headers.indexOf('配信日時'),
        deliveryAmount: headers.indexOf('配信金額'),
        contractDate: headers.indexOf('成約日時'),
        contractAmount: headers.indexOf('成約金額')
      };

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-based

      let monthlyReferral = 0;
      let monthlyReferralCount = 0;
      let monthlyCommission = 0;
      let monthlyCommissionCount = 0;
      let yearlyProfit = 0;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idx.merchantId] !== merchantId) continue;

        const deliveryDate = row[idx.deliveryDate];
        const deliveryAmount = Number(row[idx.deliveryAmount]) || 0;
        const contractDate = row[idx.contractDate];
        const contractAmount = Number(row[idx.contractAmount]) || 0;

        // 今月の紹介料（配信日ベース）
        if (deliveryDate && deliveryAmount > 0) {
          const d = new Date(deliveryDate);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            monthlyReferral += deliveryAmount;
            monthlyReferralCount++;
          }
          // 年間の紹介料
          if (d.getFullYear() === currentYear) {
            yearlyProfit += deliveryAmount;
          }
        }

        // 今月の成約（成約日ベース）
        if (contractDate && contractAmount > 0) {
          const c = new Date(contractDate);
          if (c.getFullYear() === currentYear && c.getMonth() === currentMonth) {
            monthlyCommission += contractAmount;
            monthlyCommissionCount++;
          }
        }
      }

      const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

      return {
        success: true,
        merchantId: merchantId,
        currentMonth: currentMonthStr,
        summary: {
          monthlyReferral: monthlyReferral,
          monthlyReferralCount: monthlyReferralCount,
          monthlyCommission: monthlyCommission,
          monthlyCommissionCount: monthlyCommissionCount,
          yearlyProfit: yearlyProfit,
          totalPaid: 0, // 請求管理シートからは別途取得が必要
          roi: monthlyReferral > 0 ? Math.round((monthlyCommission / monthlyReferral) * 100) : 0
        }
      };

    } catch (e) {
      console.error('[BillingSystem] getFinancialSummary error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 日付をAPI用にフォーマット
   */
  _formatDateForApi: function(date) {
    if (!date) return null;
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      // V2200: YYYY-MM-DD形式に統一（カレンダーUIとの互換性）
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return null;
    }
  },

  /**
   * 名前をマスク（プライバシー保護）
   */
  _maskName: function(name) {
    if (!name || name.length < 2) return name || '名前なし';
    return name.charAt(0) + '○様';
  },

  /**
   * 成約手数料履歴取得（フランチャイズダッシュボード用）
   */
  getCommissionHistory: function(merchantId, month) {
    console.log('[BillingSystem] getCommissionHistory:', merchantId, month);

    if (!merchantId) {
      return { success: false, error: '加盟店IDが指定されていません' };
    }

    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 配信管理シートから成約データ取得
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      if (!deliverySheet) {
        return { success: true, history: [], count: 0 };
      }

      const deliveryData = deliverySheet.getDataRange().getValues();
      const dHeaders = deliveryData[0];
      const dMerchantIdIdx = dHeaders.indexOf('加盟店ID');
      const dCvIdIdx = dHeaders.indexOf('CV ID');
      const dContractDateIdx = dHeaders.indexOf('成約日時');
      const dContractAmountIdx = dHeaders.indexOf('成約金額');

      // ユーザー登録シートから顧客名取得
      const userSheet = ss.getSheetByName(this.SHEETS.USER_REGISTRATION);
      const userData = userSheet ? userSheet.getDataRange().getValues() : [];
      const uHeaders = userData[0] || [];
      const uCvIdIdx = uHeaders.indexOf('CV ID');
      const uNameIdx = uHeaders.indexOf('氏名');

      const userMap = {};
      for (let i = 1; i < userData.length; i++) {
        const cvId = userData[i][uCvIdIdx];
        if (cvId) {
          userMap[cvId] = { customerName: userData[i][uNameIdx] || '' };
        }
      }

      // 請求管理シートから支払状況取得
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);
      const billingData = billingSheet ? billingSheet.getDataRange().getValues() : [];
      const bHeaders = billingData[0] || [];
      const bInvoiceIdIdx = bHeaders.indexOf('請求ID');
      const bTypeIdx = bHeaders.indexOf('種別');
      const bCvIdsIdx = bHeaders.indexOf('CV ID');
      const bStatusIdx = bHeaders.indexOf('ステータス');
      const bDueDateIdx = bHeaders.indexOf('支払期限');
      const bPdfUrlIdx = bHeaders.indexOf('PDF URL');

      // 成約手数料請求のマップを作成
      const commissionInvoiceMap = {};
      for (let i = 1; i < billingData.length; i++) {
        const type = billingData[i][bTypeIdx];
        if (type === '成約手数料') {
          const cvIds = String(billingData[i][bCvIdsIdx] || '').split(',').map(s => s.trim());
          cvIds.forEach(cvId => {
            if (cvId) {
              commissionInvoiceMap[cvId] = {
                invoiceId: billingData[i][bInvoiceIdIdx],
                status: billingData[i][bStatusIdx],
                dueDate: billingData[i][bDueDateIdx],
                pdfUrl: billingData[i][bPdfUrlIdx] || ''
              };
            }
          });
        }
      }

      const history = [];
      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        if (row[dMerchantIdIdx] !== merchantId) continue;

        const contractDate = row[dContractDateIdx];
        const contractAmount = Number(row[dContractAmountIdx]) || 0;

        // 成約データのみ
        if (!contractDate || !contractAmount) continue;

        const cvId = row[dCvIdIdx];
        const userInfo = userMap[cvId] || {};
        const invoiceInfo = commissionInvoiceMap[cvId] || {};

        // 月フィルタ
        if (month && month !== 'all') {
          const d = new Date(contractDate);
          const rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (rowMonth !== month) continue;
        }

        const commissionRate = 0.10; // 10%
        const commissionAmount = Math.floor(contractAmount * commissionRate * 1.10); // 税込

        history.push({
          cvId: cvId,
          contractDate: this._formatDateForApi(contractDate),
          customerName: userInfo.customerName || '名前なし',
          contractAmount: contractAmount,
          commissionRate: '10%',
          commissionAmount: commissionAmount,
          dueDate: invoiceInfo.dueDate ? this._formatDateForApi(invoiceInfo.dueDate) : '-',
          paymentStatus: invoiceInfo.status || '未請求',
          invoiceId: invoiceInfo.invoiceId || '',
          pdfUrl: invoiceInfo.pdfUrl || ''
        });
      }

      // 成約日で降順ソート
      history.sort((a, b) => new Date(b.contractDate) - new Date(a.contractDate));

      return {
        success: true,
        merchantId: merchantId,
        month: month || 'all',
        count: history.length,
        history: history
      };
    } catch (e) {
      console.error('[BillingSystem] getCommissionHistory error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 支払履歴取得（フランチャイズダッシュボード用）
   */
  getPaymentHistory: function(merchantId, month, statusFilter) {
    console.log('[BillingSystem] getPaymentHistory:', merchantId, month, statusFilter);

    if (!merchantId) {
      return { success: false, error: '加盟店IDが指定されていません' };
    }

    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: true, history: [], count: 0 };
      }

      const data = billingSheet.getDataRange().getValues();
      const headers = data[0];

      const invoiceIdIdx = headers.indexOf('請求ID');
      const merchantIdIdx = headers.indexOf('加盟店ID');
      const typeIdx = headers.indexOf('種別');
      const targetMonthIdx = headers.indexOf('対象月');
      const cvIdsIdx = headers.indexOf('CV ID');
      const amountIdx = headers.indexOf('請求金額（税込）');
      const statusIdx = headers.indexOf('ステータス');
      const dueDateIdx = headers.indexOf('支払期限');
      const paidDateIdx = headers.indexOf('入金日');
      const paymentMethodIdx = headers.indexOf('支払方法');
      const pdfUrlIdx = headers.indexOf('PDF URL');

      // ユーザー登録シートから顧客名取得（内容表示用）
      const userSheet = ss.getSheetByName(this.SHEETS.USER_REGISTRATION);
      const userData = userSheet ? userSheet.getDataRange().getValues() : [];
      const uHeaders = userData[0] || [];
      const uCvIdIdx = uHeaders.indexOf('CV ID');
      const uNameIdx = uHeaders.indexOf('氏名');
      const uPropertyTypeIdx = uHeaders.indexOf('物件種別') !== -1 ? uHeaders.indexOf('物件種別') : uHeaders.indexOf('Q1_物件種別');
      const uWorkContentIdx = uHeaders.indexOf('Q9_希望工事内容_外壁');

      const userMap = {};
      for (let i = 1; i < userData.length; i++) {
        const cvId = userData[i][uCvIdIdx];
        if (cvId) {
          userMap[cvId] = {
            customerName: userData[i][uNameIdx] || '',
            propertyType: userData[i][uPropertyTypeIdx] || '',
            workContent: userData[i][uWorkContentIdx] || ''
          };
        }
      }

      const history = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[merchantIdIdx] !== merchantId) continue;

        const status = row[statusIdx];

        // ステータスフィルタ
        if (statusFilter && statusFilter !== '全て') {
          if (statusFilter === '完了' && status !== '入金済み') continue;
          if (statusFilter === '未完了' && status === '入金済み') continue;
        }

        // 月フィルタ（支払日または支払期限ベース）
        if (month && month !== 'all') {
          const paidDate = row[paidDateIdx];
          const dueDate = row[dueDateIdx];
          const targetDate = paidDate || dueDate;
          if (targetDate) {
            const d = new Date(targetDate);
            const rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (rowMonth !== month) continue;
          }
        }

        // 内容生成（CV IDから顧客情報取得）
        const cvIds = String(row[cvIdsIdx] || '').split(',').map(s => s.trim()).filter(Boolean);
        let description = '';
        if (cvIds.length === 1) {
          const userInfo = userMap[cvIds[0]] || {};
          const type = row[typeIdx];
          description = `案件${cvIds[0]} ${userInfo.customerName || ''}（${userInfo.workContent || type}）`;
        } else if (cvIds.length > 1) {
          description = `${row[typeIdx]} ${cvIds.length}件分`;
        } else {
          description = row[typeIdx] || '';
        }

        history.push({
          invoiceId: row[invoiceIdIdx],
          paidDate: row[paidDateIdx] ? this._formatDateForApi(row[paidDateIdx]) : '-',
          type: row[typeIdx],
          description: description,
          amount: Number(row[amountIdx]) || 0,
          paymentMethod: row[paymentMethodIdx] || '銀行振込',
          status: status,
          pdfUrl: row[pdfUrlIdx] || ''
        });
      }

      // 支払日/支払期限で降順ソート
      history.sort((a, b) => {
        const dateA = a.paidDate !== '-' ? new Date(a.paidDate) : new Date(0);
        const dateB = b.paidDate !== '-' ? new Date(b.paidDate) : new Date(0);
        return dateB - dateA;
      });

      return {
        success: true,
        merchantId: merchantId,
        month: month || 'all',
        count: history.length,
        history: history
      };
    } catch (e) {
      console.error('[BillingSystem] getPaymentHistory error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 収支分析取得（フランチャイズダッシュボード用）
   */
  getProfitAnalysis: function(merchantId, month) {
    console.log('[BillingSystem] getProfitAnalysis:', merchantId, month);

    if (!merchantId) {
      return { success: false, error: '加盟店IDが指定されていません' };
    }

    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 配信管理シートから成約・売上データ取得
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      const deliveryData = deliverySheet ? deliverySheet.getDataRange().getValues() : [];
      const dHeaders = deliveryData[0] || [];
      const dMerchantIdIdx = dHeaders.indexOf('加盟店ID');
      const dCvIdIdx = dHeaders.indexOf('CV ID');
      const dContractDateIdx = dHeaders.indexOf('成約日時');
      const dContractAmountIdx = dHeaders.indexOf('成約金額');
      const dReferralFeeIdx = dHeaders.indexOf('配信金額');

      // 請求管理シートから支払データ取得
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);
      const billingData = billingSheet ? billingSheet.getDataRange().getValues() : [];
      const bHeaders = billingData[0] || [];
      const bMerchantIdIdx = bHeaders.indexOf('加盟店ID');
      const bTypeIdx = bHeaders.indexOf('種別');
      const bAmountIdx = bHeaders.indexOf('請求金額（税込）');
      const bStatusIdx = bHeaders.indexOf('ステータス');
      const bTargetMonthIdx = bHeaders.indexOf('対象月');

      // ユーザー登録シートから顧客名取得
      const userSheet = ss.getSheetByName(this.SHEETS.USER_REGISTRATION);
      const userData = userSheet ? userSheet.getDataRange().getValues() : [];
      const uHeaders = userData[0] || [];
      const uCvIdIdx = uHeaders.indexOf('CV ID');
      const uNameIdx = uHeaders.indexOf('氏名');

      const userMap = {};
      for (let i = 1; i < userData.length; i++) {
        const cvId = userData[i][uCvIdIdx];
        if (cvId) userMap[cvId] = userData[i][uNameIdx] || '';
      }

      let totalRevenue = 0;      // 売上高（成約金額合計）
      let totalReferralFee = 0;  // 紹介料支出
      let totalCommission = 0;   // 成約手数料支出
      const caseData = {};       // 案件別データ

      // 配信管理から成約データ集計
      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        if (row[dMerchantIdIdx] !== merchantId) continue;

        const contractDate = row[dContractDateIdx];
        const contractAmount = Number(row[dContractAmountIdx]) || 0;
        const referralFee = Number(row[dReferralFeeIdx]) || 0;
        const cvId = row[dCvIdIdx];

        // 月フィルタ（成約日ベース）
        if (month && month !== 'all' && contractDate) {
          const d = new Date(contractDate);
          const rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (rowMonth !== month) continue;
        }

        if (contractAmount > 0) {
          totalRevenue += contractAmount;

          // 案件別データ
          const customerName = userMap[cvId] || cvId;
          if (!caseData[cvId]) {
            caseData[cvId] = {
              name: customerName + '様案件',
              referralFee: 0,
              revenue: 0,
              commission: 0
            };
          }
          caseData[cvId].revenue = contractAmount;
        }

        if (referralFee > 0) {
          // 月フィルタなしで紹介料も集計（または配信日ベースでフィルタ）
          if (!caseData[cvId]) {
            const customerName = userMap[cvId] || cvId;
            caseData[cvId] = {
              name: customerName + '様案件',
              referralFee: 0,
              revenue: 0,
              commission: 0
            };
          }
          caseData[cvId].referralFee = referralFee;
        }
      }

      // 請求管理から支出（入金済み）集計
      for (let i = 1; i < billingData.length; i++) {
        const row = billingData[i];
        if (row[bMerchantIdIdx] !== merchantId) continue;

        const status = row[bStatusIdx];
        if (status !== '入金済み') continue;

        // 月フィルタ
        if (month && month !== 'all') {
          const targetMonth = row[bTargetMonthIdx];
          if (targetMonth !== month) continue;
        }

        const type = row[bTypeIdx];
        const amount = Number(row[bAmountIdx]) || 0;

        if (type === '紹介料') {
          totalReferralFee += amount;
        } else if (type === '成約手数料') {
          totalCommission += amount;
        }
      }

      // 案件別TOP5算出
      const caseList = Object.entries(caseData)
        .filter(([_, data]) => data.revenue > 0)
        .map(([cvId, data]) => {
          const commission = Math.floor(data.revenue * 0.10 * 1.10); // 手数料10% + 税10%
          const profit = data.revenue - data.referralFee - commission;
          const roi = data.referralFee > 0 ? Math.round((profit / data.referralFee) * 100) : 0;
          return {
            name: data.name,
            referralFee: data.referralFee,
            revenue: data.revenue,
            commission: commission,
            profit: profit,
            roi: roi
          };
        })
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);

      const totalExpense = totalReferralFee + totalCommission;
      const grossProfit = totalRevenue - totalExpense;
      const roi = totalExpense > 0 ? Math.round((grossProfit / totalExpense) * 100) : 0;

      // 前月比（簡易実装：前月データも取得して比較）
      let prevMonthData = { revenue: 0, expense: 0, profit: 0 };
      if (month && month !== 'all') {
        const [y, m] = month.split('-').map(Number);
        const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
        // 簡易的に前月比は固定値（本実装では再帰呼び出しが必要）
      }

      return {
        success: true,
        merchantId: merchantId,
        month: month || 'all',
        summary: {
          revenue: totalRevenue,
          revenueChange: '+12%', // TODO: 実際の計算
          expense: totalExpense,
          expenseChange: '+8%',  // TODO: 実際の計算
          expenseBreakdown: {
            referralFee: totalReferralFee,
            commission: totalCommission
          },
          grossProfit: grossProfit,
          profitChange: '+14%',  // TODO: 実際の計算
          roi: roi,
          roiLabel: roi >= 400 ? '優良' : roi >= 200 ? '良好' : '普通'
        },
        topCases: caseList
      };
    } catch (e) {
      console.error('[BillingSystem] getProfitAnalysis error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 支払期限一括変更（管理者用）
   */
  bulkUpdateDueDate: function(targetMonth, newDueDate, reason) {
    console.log('[BillingSystem] bulkUpdateDueDate:', targetMonth, newDueDate, reason);

    if (!targetMonth || !newDueDate) {
      return { success: false, error: '対象月と新しい支払期限を指定してください' };
    }

    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);

      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません' };
      }

      const data = billingSheet.getDataRange().getValues();
      const headers = data[0];

      const targetMonthIdx = headers.indexOf('対象月');
      const dueDateIdx = headers.indexOf('支払期限');
      const statusIdx = headers.indexOf('ステータス');

      if (dueDateIdx === -1) {
        return { success: false, error: '支払期限カラムが見つかりません' };
      }

      let updatedCount = 0;
      const newDate = new Date(newDueDate);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowTargetMonth = row[targetMonthIdx];
        const status = row[statusIdx];

        // 対象月が一致 かつ 未入金のもののみ
        if (rowTargetMonth === targetMonth && status !== '入金済み') {
          billingSheet.getRange(i + 1, dueDateIdx + 1).setValue(newDate);
          updatedCount++;
        }
      }

      // 変更ログをSlack通知（任意）
      if (updatedCount > 0 && reason) {
        this._sendSlackNotification('支払期限一括変更', `対象月: ${targetMonth}\n新支払期限: ${newDueDate}\n変更件数: ${updatedCount}件\n理由: ${reason}`);
      }

      return {
        success: true,
        updatedCount: updatedCount,
        targetMonth: targetMonth,
        newDueDate: newDueDate
      };
    } catch (e) {
      console.error('[BillingSystem] bulkUpdateDueDate error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * ダッシュボード統計取得（加盟店向け）
   * - 新規案件数（今月の配信件数）
   * - 成約率（成約/配信）
   * - 対応中（ステータスが配信済み・ヒアリング中など）
   * - 最近の案件（直近5件）
   */
  getDashboardStats: function(merchantId) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 配信管理シート
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      // ユーザー登録シート（顧客名取得用）
      const userSheet = ss.getSheetByName('ユーザー登録');

      // 配信管理データ取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const dIdx = {
        cvId: deliveryHeaders.indexOf('CV ID'),
        merchantId: deliveryHeaders.indexOf('加盟店ID'),
        deliveryDate: deliveryHeaders.indexOf('配信日時'),
        deliveryStatus: deliveryHeaders.indexOf('配信ステータス'),
        deliveryAmount: deliveryHeaders.indexOf('配信金額'),
        contractAmount: deliveryHeaders.indexOf('成約金額'),
        contractDate: deliveryHeaders.indexOf('成約日時')
      };

      // ユーザー情報マップ作成
      const cvInfoMap = {};
      if (userSheet) {
        const userData = userSheet.getDataRange().getValues();
        const userHeaders = userData[0];
        const uIdx = {
          cvId: userHeaders.indexOf('CV ID'),
          name: userHeaders.indexOf('氏名')
        };
        for (let i = 1; i < userData.length; i++) {
          const cvId = userData[i][uIdx.cvId];
          if (cvId) {
            cvInfoMap[cvId] = userData[i][uIdx.name] || '名前なし';
          }
        }
      }

      // 今月の期間
      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonth = now.getMonth(); // 0-based

      // V2200: 詳細ステータスを使用して正確に分類
      // アクティブステータス（対応中）
      const activeStatuses = ['架電済/未アポ', 'アポ済', '現調済', '見積提出済'];
      // 終了成功ステータス
      const closedSuccessStatuses = ['成約', '入金予定', '入金済'];
      // 終了失敗ステータス
      const closedFailedStatuses = ['現調前キャンセル', '現調後失注', '他社契約済', '別加盟店契約済', 'クレーム or 失注'];
      // 全終了ステータス
      const allClosedStatuses = [...closedSuccessStatuses, ...closedFailedStatuses];

      // 統計変数
      let newCases = 0;      // 未対応の案件数（ステータスが「未対応」）
      let totalCases = 0;    // 加盟店の全案件
      let contractedCases = 0; // 成約成功件数
      let closedFailedCases = 0; // 終了失敗件数
      let inProgressCases = 0; // 対応中（アクティブ）
      let thisMonthRevenue = 0; // 今月の売上
      let thisMonthCost = 0;    // 今月の紹介料支出
      const recentCases = []; // 最近の案件

      // 詳細ステータスカラムのインデックス
      const detailStatusIdx = deliveryHeaders.indexOf('詳細ステータス');

      // データ走査
      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        const rowMerchantId = row[dIdx.merchantId];

        // 加盟店IDでフィルタ
        if (rowMerchantId !== merchantId) continue;

        totalCases++;
        const status = row[dIdx.deliveryStatus];
        const detailStatus = detailStatusIdx >= 0 ? row[detailStatusIdx] : status;
        const deliveryDate = row[dIdx.deliveryDate];
        const contractDate = row[dIdx.contractDate];
        const cvId = row[dIdx.cvId];
        const contractAmount = Number(row[dIdx.contractAmount]) || 0;
        const deliveryAmount = Number(row[dIdx.deliveryAmount]) || 0;

        // 今月の紹介料支出（配信日ベース）
        if (deliveryDate && deliveryAmount > 0) {
          const date = new Date(deliveryDate);
          if (date.getFullYear() === thisYear && date.getMonth() === thisMonth) {
            thisMonthCost += deliveryAmount;
          }
        }

        // 今月の売上（成約日ベース）
        if (contractDate && contractAmount > 0) {
          const cDate = new Date(contractDate);
          if (cDate.getFullYear() === thisYear && cDate.getMonth() === thisMonth) {
            thisMonthRevenue += contractAmount;
          }
        }

        // V2200: ステータス別カウント（詳細ステータスベース）
        if (detailStatus === '未対応') {
          newCases++;
        } else if (activeStatuses.includes(detailStatus)) {
          inProgressCases++;
        } else if (closedSuccessStatuses.includes(detailStatus)) {
          contractedCases++;
        } else if (closedFailedStatuses.includes(detailStatus)) {
          closedFailedCases++;
        } else {
          // フォールバック: 配信ステータスで判定
          if (status === '成約') {
            contractedCases++;
          } else if (status === '辞退' || status === 'キャンセル') {
            closedFailedCases++;
          } else {
            inProgressCases++; // デフォルトは対応中
          }
        }

        // 最近の案件リストに追加（後で日付ソート）
        recentCases.push({
          cvId: cvId,
          customerName: cvInfoMap[cvId] || '名前なし',
          status: detailStatus || status || '未対応',
          deliveryDate: deliveryDate,
          contractAmount: contractAmount
        });
      }

      // V2200: 成約率計算（終了した案件のうち成功の割合）
      const totalClosed = contractedCases + closedFailedCases;
      const contractRate = totalClosed > 0 ? Math.round((contractedCases / totalClosed) * 100) : 0;

      // 最近の案件を日付降順ソート、上位5件
      recentCases.sort((a, b) => {
        const dateA = a.deliveryDate ? new Date(a.deliveryDate) : new Date(0);
        const dateB = b.deliveryDate ? new Date(b.deliveryDate) : new Date(0);
        return dateB - dateA;
      });
      const top5Cases = recentCases.slice(0, 5).map((c) => ({
        id: c.cvId,
        customerName: c.customerName,
        status: c.status || '新規',
        updatedAt: this._formatDateForApi(c.deliveryDate)
      }));

      // メンバー数を取得（認証情報シートから）
      // 管理者（1列目が加盟店ID）+ 招待メンバー（6列目が親加盟店ID）をカウント
      let memberCount = 1;
      try {
        const authSheet = ss.getSheetByName('認証情報');
        if (authSheet) {
          const authData = authSheet.getDataRange().getValues();
          const authHeaders = authData[0];
          const merchantIdIdx = authHeaders.indexOf('加盟店ID');
          const parentMerchantIdIdx = 5; // 6列目（0始まり）= 親の加盟店ID
          if (merchantIdIdx >= 0) {
            // 管理者（1列目が一致）または招待メンバー（6列目が一致）
            memberCount = authData.filter((row, i) => {
              if (i === 0) return false; // ヘッダー行除外
              return row[merchantIdIdx] === merchantId || row[parentMerchantIdIdx] === merchantId;
            }).length;
            if (memberCount === 0) memberCount = 1;
          }
        }
      } catch (e) {
        console.log('[BillingSystem] メンバー数取得エラー（デフォルト1）:', e);
      }

      return {
        success: true,
        stats: {
          newCases: newCases,
          contractRate: contractRate,
          inProgress: inProgressCases,
          memberCount: memberCount,
          thisMonthRevenue: thisMonthRevenue,
          thisMonthCost: thisMonthCost,
          thisMonthProfit: thisMonthRevenue - thisMonthCost
        },
        recentCases: top5Cases
      };
    } catch (e) {
      console.error('[BillingSystem] getDashboardStats error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * スケジュールイベント取得（カレンダー表示用）
   * 配信管理シートから予定日時を取得
   */
  getScheduleEvents: function(merchantId, month) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 配信管理シート
      const deliverySheet = ss.getSheetByName(this.SHEETS.DELIVERY);
      if (!deliverySheet) {
        return { success: false, error: '配信管理シートが見つかりません' };
      }

      // ユーザー登録シート（顧客名取得用）
      const userSheet = ss.getSheetByName('ユーザー登録');

      // 配信管理データ取得
      const deliveryData = deliverySheet.getDataRange().getValues();
      const deliveryHeaders = deliveryData[0];
      const dIdx = {
        cvId: deliveryHeaders.indexOf('CV ID'),
        merchantId: deliveryHeaders.indexOf('加盟店ID'),
        staffName: deliveryHeaders.indexOf('担当者'), // 担当者カラム
        nextContactDate: deliveryHeaders.indexOf('次回連絡予定日時'),
        surveyDate: deliveryHeaders.indexOf('現調日時'),
        meetingDate: deliveryHeaders.indexOf('商談日時')
      };

      // ユーザー情報マップ作成
      const cvInfoMap = {};
      if (userSheet) {
        const userData = userSheet.getDataRange().getValues();
        const userHeaders = userData[0];
        const uIdx = {
          cvId: userHeaders.indexOf('CV ID'),
          name: userHeaders.indexOf('氏名')
        };
        for (let i = 1; i < userData.length; i++) {
          const cvId = userData[i][uIdx.cvId];
          if (cvId) {
            cvInfoMap[cvId] = userData[i][uIdx.name] || '名前なし';
          }
        }
      }

      // 対象月のフィルタ
      let targetYear, targetMonth;
      if (month) {
        const parts = month.split('-');
        targetYear = parseInt(parts[0]);
        targetMonth = parseInt(parts[1]);
      } else {
        const now = new Date();
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
      }

      // イベント収集
      const events = [];
      const eventTypes = [
        { key: 'nextContactDate', label: '連絡予定', color: 'blue' },
        { key: 'surveyDate', label: '現調', color: 'green' },
        { key: 'meetingDate', label: '商談', color: 'purple' }
      ];

      for (let i = 1; i < deliveryData.length; i++) {
        const row = deliveryData[i];
        const rowMerchantId = row[dIdx.merchantId];

        // 加盟店IDでフィルタ
        if (rowMerchantId !== merchantId) continue;

        const cvId = row[dIdx.cvId];
        const customerName = cvInfoMap[cvId] || '名前なし';
        const staffName = dIdx.staffName >= 0 ? (row[dIdx.staffName] || '') : '';

        // 各予定タイプをチェック
        for (const type of eventTypes) {
          const dateVal = row[dIdx[type.key]];
          if (!dateVal) continue;

          const date = new Date(dateVal);
          if (isNaN(date.getTime())) continue;

          // 月フィルタ
          if (date.getFullYear() !== targetYear || (date.getMonth() + 1) !== targetMonth) continue;

          events.push({
            id: `${cvId}_${type.key}`,
            cvId: cvId,
            customerName: customerName,
            staffName: staffName,
            type: type.label,
            color: type.color,
            date: this._formatDateForApi(date),
            time: date.getHours() > 0 ? `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}` : null,
            day: date.getDate()
          });
        }
      }

      // 日付順にソート
      events.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        success: true,
        events: events,
        month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`
      };
    } catch (e) {
      console.error('[BillingSystem] getScheduleEvents error:', e);
      return { success: false, error: e.message };
    }
  },

  // =====================================
  // デポジット管理機能
  // =====================================

  DEPOSIT_SHEET: 'デポジット管理',
  DEPOSIT_PRICE_PER_CASE: 22000, // 1件あたり税込金額
  DEPOSIT_PLANS: [
    { id: 'trial', name: 'お試し', count: 1, price: 22000, firstTimeOnly: true },
    { id: 'light', name: 'ライト', count: 3, price: 66000, firstTimeOnly: false },
    { id: 'standard', name: 'スタンダード', count: 5, price: 110000, firstTimeOnly: false },
    { id: 'premium', name: 'プレミアム', count: 10, price: 220000, firstTimeOnly: false }
  ],

  /**
   * デポジット管理シート初期セットアップ
   */
  setupDepositSheet: function() {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      let depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
      if (!depositSheet) {
        depositSheet = ss.insertSheet(this.DEPOSIT_SHEET);

        // ヘッダー設定
        const headers = [
          '加盟店ID',
          '加盟店名',
          'デポジット残件数',
          'デポジット総件数',
          '最終入金日',
          '有効期限',
          '設定',           // 繰越 or 返金
          '設定更新日',
          '返金状況',       // 未返金 / 返金予定 / 返金済
          '返金予定日',
          '返金処理日',
          '返金額',
          '適用履歴',       // CV IDカンマ区切り
          '作成日時',
          '更新日時'
        ];
        depositSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

        // ヘッダー書式
        depositSheet.getRange(1, 1, 1, headers.length)
          .setBackground('#4285f4')
          .setFontColor('#ffffff')
          .setFontWeight('bold');

        // 列幅調整
        depositSheet.setColumnWidth(1, 120);  // 加盟店ID
        depositSheet.setColumnWidth(2, 150);  // 加盟店名
        depositSheet.setColumnWidth(3, 100);  // 残件数
        depositSheet.setColumnWidth(4, 100);  // 総件数
        depositSheet.setColumnWidth(5, 120);  // 最終入金日
        depositSheet.setColumnWidth(6, 120);  // 有効期限
        depositSheet.setColumnWidth(7, 80);   // 設定
        depositSheet.setColumnWidth(13, 300); // 適用履歴

        console.log('[BillingSystem] デポジット管理シート作成完了');
      }

      return { success: true, message: 'デポジット管理シートセットアップ完了' };
    } catch (e) {
      console.error('[BillingSystem] setupDepositSheet error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * デポジット購入申請（自由入力）
   * @param {string} merchantId - 加盟店ID
   * @param {number} count - 購入件数
   * @returns {Object} 申請結果（請求書ID含む）
   */
  requestDepositPurchase: function(merchantId, count) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      const depositCount = parseInt(count) || 0;
      if (depositCount <= 0) {
        return { success: false, error: '購入件数を1以上で指定してください' };
      }

      // 金額計算
      const totalPrice = depositCount * this.DEPOSIT_PRICE_PER_CASE;
      const taxExcluded = Math.floor(totalPrice / 1.1);
      const tax = totalPrice - taxExcluded;

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 加盟店名取得
      const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);
      const masterData = masterSheet.getDataRange().getValues();
      const masterHeaders = masterData[0];
      const mIdIdx = masterHeaders.indexOf('加盟店ID');
      const mNameIdx = masterHeaders.indexOf('加盟店名');

      let merchantName = '';
      let merchantEmail = '';
      const emailIdx = masterHeaders.indexOf('メールアドレス');
      for (let i = 1; i < masterData.length; i++) {
        if (masterData[i][mIdIdx] === merchantId) {
          merchantName = masterData[i][mNameIdx];
          merchantEmail = emailIdx >= 0 ? masterData[i][emailIdx] : '';
          break;
        }
      }

      if (!merchantName) {
        return { success: false, error: '加盟店が見つかりません' };
      }

      // 請求書番号生成
      const now = new Date();
      const invoiceId = 'DEP-' + Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMddHHmmss') + '-' + merchantId.slice(-4);

      // 請求管理シートに追加
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);
      if (!billingSheet) {
        return { success: false, error: '請求管理シートが見つかりません' };
      }

      const billingHeaders = billingSheet.getRange(1, 1, 1, billingSheet.getLastColumn()).getValues()[0];
      const newRow = [];

      for (const header of billingHeaders) {
        switch (header) {
          case '請求ID': newRow.push(invoiceId); break;
          case '加盟店ID': newRow.push(merchantId); break;
          case '加盟店名': newRow.push(merchantName); break;
          case '請求種別': newRow.push('デポジット'); break;
          case '対象月': newRow.push(Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM')); break;
          case '対象CV ID': newRow.push(''); break;
          case '税抜金額': newRow.push(taxExcluded); break;
          case '消費税': newRow.push(tax); break;
          case '税込金額': newRow.push(totalPrice); break;
          case 'ステータス': newRow.push('入金待ち'); break;
          case '発行日': newRow.push(Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd')); break;
          case '支払期限':
            const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2週間後
            newRow.push(Utilities.formatDate(dueDate, 'Asia/Tokyo', 'yyyy-MM-dd'));
            break;
          case '入金日': newRow.push(''); break;
          case '入金額': newRow.push(''); break;
          case '備考': newRow.push(`デポジット${depositCount}件`); break;
          case '作成日時': newRow.push(now); break;
          case '更新日時': newRow.push(now); break;
          default: newRow.push('');
        }
      }

      billingSheet.appendRow(newRow);

      // TODO: 請求書PDFメール送信

      console.log('[BillingSystem] デポジット購入申請:', invoiceId, merchantId, depositCount + '件');

      return {
        success: true,
        invoiceId: invoiceId,
        merchantId: merchantId,
        merchantName: merchantName,
        count: depositCount,
        totalPrice: totalPrice,
        message: `デポジット${depositCount}件の請求書を発行しました`
      };
    } catch (e) {
      console.error('[BillingSystem] requestDepositPurchase error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * デポジット入金確認・反映
   * @param {string} invoiceId - 請求ID
   * @param {number} paymentAmount - 入金額
   * @returns {Object} 反映結果
   */
  confirmDepositPayment: function(invoiceId, paymentAmount) {
    try {
      if (!invoiceId) {
        return { success: false, error: '請求IDが指定されていません' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 請求管理シートから請求情報取得
      const billingSheet = ss.getSheetByName(this.SHEETS.BILLING);
      const billingData = billingSheet.getDataRange().getValues();
      const billingHeaders = billingData[0];
      const bIdx = {
        invoiceId: billingHeaders.indexOf('請求ID'),
        merchantId: billingHeaders.indexOf('加盟店ID'),
        merchantName: billingHeaders.indexOf('加盟店名'),
        type: billingHeaders.indexOf('請求種別'),
        amount: billingHeaders.indexOf('税込金額'),
        status: billingHeaders.indexOf('ステータス'),
        paymentDate: billingHeaders.indexOf('入金日'),
        paymentAmount: billingHeaders.indexOf('入金額'),
        note: billingHeaders.indexOf('備考'),
        updatedAt: billingHeaders.indexOf('更新日時')
      };

      let invoiceRowIndex = -1;
      let invoiceData = null;
      for (let i = 1; i < billingData.length; i++) {
        if (billingData[i][bIdx.invoiceId] === invoiceId) {
          invoiceRowIndex = i + 1;
          invoiceData = billingData[i];
          break;
        }
      }

      if (!invoiceData) {
        return { success: false, error: '請求が見つかりません' };
      }

      if (invoiceData[bIdx.type] !== 'デポジット') {
        return { success: false, error: 'この請求はデポジットではありません' };
      }

      if (invoiceData[bIdx.status] === '入金済み') {
        return { success: false, error: 'この請求は既に入金済みです' };
      }

      const merchantId = invoiceData[bIdx.merchantId];
      const merchantName = invoiceData[bIdx.merchantName];
      const amount = invoiceData[bIdx.amount];
      const depositCount = Math.floor(amount / this.DEPOSIT_PRICE_PER_CASE);

      const now = new Date();

      // 請求管理シート更新
      billingSheet.getRange(invoiceRowIndex, bIdx.status + 1).setValue('入金済み');
      billingSheet.getRange(invoiceRowIndex, bIdx.paymentDate + 1).setValue(Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd'));
      billingSheet.getRange(invoiceRowIndex, bIdx.paymentAmount + 1).setValue(paymentAmount || amount);
      billingSheet.getRange(invoiceRowIndex, bIdx.updatedAt + 1).setValue(now);

      // デポジット管理シート更新
      this._updateDepositBalance(merchantId, merchantName, depositCount, now);

      // 加盟店マスタのデポジット前金フラグをTRUEに
      this._setDepositFlag(merchantId, true);

      console.log('[BillingSystem] デポジット入金確認:', invoiceId, merchantId, depositCount + '件');

      return {
        success: true,
        invoiceId: invoiceId,
        merchantId: merchantId,
        depositCount: depositCount,
        message: `デポジット${depositCount}件を反映しました`
      };
    } catch (e) {
      console.error('[BillingSystem] confirmDepositPayment error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * デポジット残高更新（内部メソッド）
   */
  _updateDepositBalance: function(merchantId, merchantName, addCount, paymentDate) {
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(ssId);

    let depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
    if (!depositSheet) {
      this.setupDepositSheet();
      depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
    }

    const depositData = depositSheet.getDataRange().getValues();
    const headers = depositData[0];
    const dIdx = {
      merchantId: headers.indexOf('加盟店ID'),
      merchantName: headers.indexOf('加盟店名'),
      remaining: headers.indexOf('デポジット残件数'),
      total: headers.indexOf('デポジット総件数'),
      lastPayment: headers.indexOf('最終入金日'),
      expiry: headers.indexOf('有効期限'),
      setting: headers.indexOf('設定'),
      settingDate: headers.indexOf('設定更新日'),
      refundStatus: headers.indexOf('返金状況'),
      history: headers.indexOf('適用履歴'),
      createdAt: headers.indexOf('作成日時'),
      updatedAt: headers.indexOf('更新日時')
    };

    // 有効期限計算（翌々月末）
    const expiryDate = new Date(paymentDate);
    expiryDate.setMonth(expiryDate.getMonth() + 2);
    expiryDate.setDate(0); // 翌々月末
    const expiryStr = Utilities.formatDate(expiryDate, 'Asia/Tokyo', 'yyyy-MM-dd');

    let existingRowIndex = -1;
    for (let i = 1; i < depositData.length; i++) {
      if (depositData[i][dIdx.merchantId] === merchantId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    const now = new Date();

    if (existingRowIndex > 0) {
      // 既存レコード更新
      const currentRemaining = parseInt(depositData[existingRowIndex - 1][dIdx.remaining]) || 0;
      const currentTotal = parseInt(depositData[existingRowIndex - 1][dIdx.total]) || 0;

      depositSheet.getRange(existingRowIndex, dIdx.remaining + 1).setValue(currentRemaining + addCount);
      depositSheet.getRange(existingRowIndex, dIdx.total + 1).setValue(currentTotal + addCount);
      depositSheet.getRange(existingRowIndex, dIdx.lastPayment + 1).setValue(Utilities.formatDate(paymentDate, 'Asia/Tokyo', 'yyyy-MM-dd'));
      depositSheet.getRange(existingRowIndex, dIdx.expiry + 1).setValue(expiryStr);
      depositSheet.getRange(existingRowIndex, dIdx.updatedAt + 1).setValue(now);
    } else {
      // 新規レコード追加
      const newRow = [];
      for (const header of headers) {
        switch (header) {
          case '加盟店ID': newRow.push(merchantId); break;
          case '加盟店名': newRow.push(merchantName); break;
          case 'デポジット残件数': newRow.push(addCount); break;
          case 'デポジット総件数': newRow.push(addCount); break;
          case '最終入金日': newRow.push(Utilities.formatDate(paymentDate, 'Asia/Tokyo', 'yyyy-MM-dd')); break;
          case '有効期限': newRow.push(expiryStr); break;
          case '設定': newRow.push('繰越'); break;
          case '設定更新日': newRow.push(Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd')); break;
          case '返金状況': newRow.push('未返金'); break;
          case '返金予定日': newRow.push(''); break;
          case '返金処理日': newRow.push(''); break;
          case '返金額': newRow.push(''); break;
          case '適用履歴': newRow.push(''); break;
          case '作成日時': newRow.push(now); break;
          case '更新日時': newRow.push(now); break;
          default: newRow.push('');
        }
      }
      depositSheet.appendRow(newRow);
    }
  },

  /**
   * 加盟店マスタのデポジット前金フラグ更新（内部メソッド）
   */
  _setDepositFlag: function(merchantId, value) {
    const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(ssId);

    const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);
    const masterData = masterSheet.getDataRange().getValues();
    const headers = masterData[0];
    const mIdIdx = headers.indexOf('加盟店ID');
    const depositFlagIdx = headers.indexOf('デポジット前金');

    if (depositFlagIdx < 0) {
      console.warn('[BillingSystem] デポジット前金カラムが見つかりません');
      return;
    }

    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][mIdIdx] === merchantId) {
        masterSheet.getRange(i + 1, depositFlagIdx + 1).setValue(value ? 'TRUE' : 'FALSE');
        break;
      }
    }
  },

  /**
   * デポジット残高0通知送信（内部メソッド）
   * @param {string} merchantId - 加盟店ID
   * @param {string} lastCvId - 最後に消化したCV ID
   */
  _sendDepositZeroNotification: function(merchantId, lastCvId) {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      // 加盟店情報取得
      const masterSheet = ss.getSheetByName(this.SHEETS.MERCHANT_MASTER);
      const masterData = masterSheet.getDataRange().getValues();
      const masterHeaders = masterData[0];
      const mIdIdx = masterHeaders.indexOf('加盟店ID');
      const mNameIdx = masterHeaders.indexOf('加盟店名');
      const emailIdx = masterHeaders.indexOf('メールアドレス');

      let merchantName = '';
      let merchantEmail = '';
      for (let i = 1; i < masterData.length; i++) {
        if (masterData[i][mIdIdx] === merchantId) {
          merchantName = masterData[i][mNameIdx];
          merchantEmail = masterData[i][emailIdx] || '';
          break;
        }
      }

      // 管理者メール
      const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');

      const subject = '【くらべる】デポジット残高0のお知らせ - ' + merchantName;
      const body = `
${merchantName} 様

デポジットの残高が0になりました。

■ 対象案件
CV ID: ${lastCvId}

■ 今後の配信について
デポジット残高がなくなったため、通常配信に切り替わりました。
表示ランクの優遇特典も一時停止となります。

引き続きデポジットをご利用いただく場合は、
加盟店管理ページより追加購入をお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━
外壁塗装くらべる 運営事務局
━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      // 加盟店にメール送信
      if (merchantEmail) {
        MailApp.sendEmail({
          to: merchantEmail,
          subject: subject,
          body: body
        });
        console.log('[BillingSystem] デポジット残高0通知送信（加盟店）:', merchantEmail);
      }

      // 管理者にメール送信
      if (adminEmail) {
        MailApp.sendEmail({
          to: adminEmail,
          subject: '【管理者】' + subject,
          body: `管理者様\n\n以下の加盟店のデポジット残高が0になりました。\n\n加盟店ID: ${merchantId}\n加盟店名: ${merchantName}\n最終消化CV: ${lastCvId}\n\n通常配信に切り替わりました。`
        });
        console.log('[BillingSystem] デポジット残高0通知送信（管理者）:', adminEmail);
      }
    } catch (e) {
      console.error('[BillingSystem] _sendDepositZeroNotification error:', e);
      // 通知エラーでも処理は続行
    }
  },

  /**
   * デポジット消化（配信時に呼び出し）
   * @param {string} merchantId - 加盟店ID
   * @param {string} cvId - CV ID
   * @param {number} deliveryAmount - 配信金額（税抜）
   * @returns {Object} 消化結果
   */
  consumeDeposit: function(merchantId, cvId, deliveryAmount) {
    try {
      // 定価案件（税抜20000円）のみ消化可能
      if (deliveryAmount !== 20000) {
        return { success: false, consumed: false, reason: '値引き案件のためデポジット消化対象外' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      const depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
      if (!depositSheet) {
        return { success: false, consumed: false, reason: 'デポジット管理シートがありません' };
      }

      const depositData = depositSheet.getDataRange().getValues();
      const headers = depositData[0];
      const dIdx = {
        merchantId: headers.indexOf('加盟店ID'),
        remaining: headers.indexOf('デポジット残件数'),
        history: headers.indexOf('適用履歴'),
        updatedAt: headers.indexOf('更新日時')
      };

      let rowIndex = -1;
      let remaining = 0;
      let history = '';
      for (let i = 1; i < depositData.length; i++) {
        if (depositData[i][dIdx.merchantId] === merchantId) {
          rowIndex = i + 1;
          remaining = parseInt(depositData[i][dIdx.remaining]) || 0;
          history = depositData[i][dIdx.history] || '';
          break;
        }
      }

      if (rowIndex < 0 || remaining <= 0) {
        return { success: true, consumed: false, reason: 'デポジット残高なし' };
      }

      // デポジット消化
      const newRemaining = remaining - 1;
      const newHistory = history ? history + ',' + cvId : cvId;
      const now = new Date();

      depositSheet.getRange(rowIndex, dIdx.remaining + 1).setValue(newRemaining);
      depositSheet.getRange(rowIndex, dIdx.history + 1).setValue(newHistory);
      depositSheet.getRange(rowIndex, dIdx.updatedAt + 1).setValue(now);

      // 残高0になった場合
      if (newRemaining === 0) {
        // デポジット前金フラグをFALSEに
        this._setDepositFlag(merchantId, false);

        // V2231: 残高0通知送信（管理者・加盟店）
        this._sendDepositZeroNotification(merchantId, cvId);
      }

      console.log('[BillingSystem] デポジット消化:', merchantId, cvId, '残り' + newRemaining + '件');

      return {
        success: true,
        consumed: true,
        remaining: newRemaining,
        cvId: cvId
      };
    } catch (e) {
      console.error('[BillingSystem] consumeDeposit error:', e);
      return { success: false, consumed: false, error: e.message };
    }
  },

  /**
   * デポジット情報取得
   * @param {string} merchantId - 加盟店ID
   * @returns {Object} デポジット情報
   */
  getDepositInfo: function(merchantId) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      const depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
      if (!depositSheet) {
        return {
          success: true,
          deposit: {
            remaining: 0,
            total: 0,
            lastPayment: null,
            expiry: null,
            setting: '繰越',
            refundStatus: null,
            history: []
          }
        };
      }

      const depositData = depositSheet.getDataRange().getValues();
      const headers = depositData[0];

      for (let i = 1; i < depositData.length; i++) {
        if (depositData[i][headers.indexOf('加盟店ID')] === merchantId) {
          const row = depositData[i];
          const historyStr = row[headers.indexOf('適用履歴')] || '';

          return {
            success: true,
            deposit: {
              remaining: parseInt(row[headers.indexOf('デポジット残件数')]) || 0,
              total: parseInt(row[headers.indexOf('デポジット総件数')]) || 0,
              lastPayment: row[headers.indexOf('最終入金日')] || null,
              expiry: row[headers.indexOf('有効期限')] || null,
              setting: row[headers.indexOf('設定')] || '繰越',
              settingDate: row[headers.indexOf('設定更新日')] || null,
              refundStatus: row[headers.indexOf('返金状況')] || '未返金',
              history: historyStr ? historyStr.split(',') : []
            }
          };
        }
      }

      // 未登録の場合
      return {
        success: true,
        deposit: {
          remaining: 0,
          total: 0,
          lastPayment: null,
          expiry: null,
          setting: '繰越',
          refundStatus: null,
          history: []
        }
      };
    } catch (e) {
      console.error('[BillingSystem] getDepositInfo error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * V2235: 全加盟店のデポジット情報一括取得（管理画面用）
   * @returns {Object} 加盟店名をキーとするデポジットマップ
   */
  getAllDepositInfo: function() {
    try {
      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      const depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
      if (!depositSheet) {
        console.log('[BillingSystem] デポジット管理シートが存在しません');
        return { success: true, depositMap: {} };
      }

      const depositData = depositSheet.getDataRange().getValues();
      if (depositData.length <= 1) {
        return { success: true, depositMap: {} };
      }

      const headers = depositData[0];
      const nameIdx = headers.indexOf('加盟店名');
      const remainingIdx = headers.indexOf('デポジット残件数');
      const totalIdx = headers.indexOf('デポジット総件数');

      const depositMap = {};
      for (let i = 1; i < depositData.length; i++) {
        const row = depositData[i];
        const name = row[nameIdx];
        if (name) {
          const remaining = parseInt(row[remainingIdx]) || 0;
          const total = parseInt(row[totalIdx]) || 0;
          // 残件数または総件数が1以上の場合のみ登録
          if (remaining > 0 || total > 0) {
            depositMap[name] = {
              remaining: remaining,
              total: total
            };
          }
        }
      }

      console.log('[BillingSystem] getAllDepositInfo:', Object.keys(depositMap).length, '件');
      return { success: true, depositMap: depositMap };
    } catch (e) {
      console.error('[BillingSystem] getAllDepositInfo error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * デポジット設定変更（繰越/返金）
   * @param {string} merchantId - 加盟店ID
   * @param {string} setting - 設定（繰越 or 返金）
   * @returns {Object} 更新結果
   */
  updateDepositSetting: function(merchantId, setting) {
    try {
      if (!merchantId) {
        return { success: false, error: '加盟店IDが指定されていません' };
      }

      if (setting !== '繰越' && setting !== '返金') {
        return { success: false, error: '無効な設定値です（繰越 or 返金）' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      const depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
      if (!depositSheet) {
        return { success: false, error: 'デポジット管理シートがありません' };
      }

      const depositData = depositSheet.getDataRange().getValues();
      const headers = depositData[0];
      const settingIdx = headers.indexOf('設定');
      const settingDateIdx = headers.indexOf('設定更新日');
      const refundStatusIdx = headers.indexOf('返金状況');
      const updatedAtIdx = headers.indexOf('更新日時');
      const merchantIdIdx = headers.indexOf('加盟店ID');

      for (let i = 1; i < depositData.length; i++) {
        if (depositData[i][merchantIdIdx] === merchantId) {
          const rowIndex = i + 1;
          const now = new Date();

          depositSheet.getRange(rowIndex, settingIdx + 1).setValue(setting);
          depositSheet.getRange(rowIndex, settingDateIdx + 1).setValue(Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd'));
          depositSheet.getRange(rowIndex, updatedAtIdx + 1).setValue(now);

          // 返金に変更した場合、返金状況を「返金予定」に
          if (setting === '返金') {
            depositSheet.getRange(rowIndex, refundStatusIdx + 1).setValue('返金予定');
          } else {
            depositSheet.getRange(rowIndex, refundStatusIdx + 1).setValue('未返金');
          }

          console.log('[BillingSystem] デポジット設定変更:', merchantId, setting);

          return {
            success: true,
            merchantId: merchantId,
            setting: setting,
            message: `デポジット設定を「${setting}」に変更しました`
          };
        }
      }

      return { success: false, error: 'デポジット情報が見つかりません' };
    } catch (e) {
      console.error('[BillingSystem] updateDepositSetting error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * デポジット単価情報取得（プラン廃止後）
   */
  getDepositPlans: function() {
    return {
      success: true,
      pricePerCase: this.DEPOSIT_PRICE_PER_CASE
    };
  },

  /**
   * キャンセル承諾時にデポジットを1件戻す
   * @param {string} merchantId - 加盟店ID
   * @param {string} cvId - CV ID
   * @returns {Object} 処理結果
   */
  refundDepositOnCancel: function(merchantId, cvId) {
    try {
      if (!merchantId || !cvId) {
        return { success: false, refunded: false, reason: 'パラメータ不足' };
      }

      const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(ssId);

      const depositSheet = ss.getSheetByName(this.DEPOSIT_SHEET);
      if (!depositSheet) {
        return { success: true, refunded: false, reason: 'デポジット管理シートなし' };
      }

      const depositData = depositSheet.getDataRange().getValues();
      const headers = depositData[0];
      const dIdx = {
        merchantId: headers.indexOf('加盟店ID'),
        remaining: headers.indexOf('デポジット残件数'),
        history: headers.indexOf('適用履歴'),
        updatedAt: headers.indexOf('更新日時')
      };

      // 該当加盟店のデポジットレコードを検索
      for (let i = 1; i < depositData.length; i++) {
        if (depositData[i][dIdx.merchantId] === merchantId) {
          const history = depositData[i][dIdx.history] || '';
          const historyArray = history ? history.split(',') : [];

          // このCV IDがデポジットで消化されていたか確認
          const cvIndex = historyArray.indexOf(cvId);
          if (cvIndex === -1) {
            return { success: true, refunded: false, reason: 'このCVはデポジット消化されていない' };
          }

          // デポジット戻し処理
          const rowIndex = i + 1;
          const currentRemaining = parseInt(depositData[i][dIdx.remaining]) || 0;
          const newRemaining = currentRemaining + 1;

          // 適用履歴からCV IDを削除
          historyArray.splice(cvIndex, 1);
          const newHistory = historyArray.join(',');

          const now = new Date();

          depositSheet.getRange(rowIndex, dIdx.remaining + 1).setValue(newRemaining);
          depositSheet.getRange(rowIndex, dIdx.history + 1).setValue(newHistory);
          depositSheet.getRange(rowIndex, dIdx.updatedAt + 1).setValue(now);

          // デポジット前金フラグをTRUEに戻す（残高が1以上になったため）
          if (newRemaining > 0) {
            this._setDepositFlag(merchantId, true);
          }

          console.log('[BillingSystem] キャンセルでデポジット戻し:', merchantId, cvId, '残り' + newRemaining + '件');

          return {
            success: true,
            refunded: true,
            remaining: newRemaining,
            cvId: cvId,
            message: 'デポジット1件を戻しました'
          };
        }
      }

      return { success: true, refunded: false, reason: '加盟店のデポジットレコードなし' };
    } catch (e) {
      console.error('[BillingSystem] refundDepositOnCancel error:', e);
      return { success: false, refunded: false, error: e.message };
    }
  }
};

// freee連携モジュール
const FreeeIntegration = {
  /**
   * freee APIアクセストークン取得
   */
  getAccessToken: function() {
    // OAuth2.0フロー実装が必要
    // Script Propertiesから取得
    return PropertiesService.getScriptProperties().getProperty('FREEE_ACCESS_TOKEN');
  },

  /**
   * 請求書作成
   */
  createInvoice: function(invoiceData) {
    const token = this.getAccessToken();
    if (!token) {
      return { success: false, error: 'freeeアクセストークンが設定されていません' };
    }

    const companyId = PropertiesService.getScriptProperties().getProperty('FREEE_COMPANY_ID');
    if (!companyId) {
      return { success: false, error: 'freee会社IDが設定されていません' };
    }

    // TODO: freee API呼び出し実装
    // https://developer.freee.co.jp/docs/accounting/reference#/Invoices/create_invoice

    return {
      success: true,
      message: 'freee請求書作成（未実装）',
      hint: 'FREEE_ACCESS_TOKEN, FREEE_COMPANY_IDをScript Propertiesに設定してください'
    };
  }
};

// GMOあおぞら銀行連携モジュール
const GmoAozoraIntegration = {
  /**
   * APIトークン取得
   */
  getApiToken: function() {
    return PropertiesService.getScriptProperties().getProperty('GMO_AOZORA_API_TOKEN');
  },

  /**
   * 振込依頼作成
   */
  createTransferRequest: function(transferData) {
    const token = this.getApiToken();
    if (!token) {
      return { success: false, error: 'GMOあおぞらAPIトークンが設定されていません' };
    }

    // TODO: GMOあおぞらAPI呼び出し実装
    // https://gmo-aozora.com/api/

    return {
      success: true,
      message: 'GMOあおぞら振込依頼（未実装）',
      hint: 'GMO_AOZORA_API_TOKENをScript Propertiesに設定してください'
    };
  },

  /**
   * 入金確認
   */
  checkDeposits: function(accountId, fromDate, toDate) {
    const token = this.getApiToken();
    if (!token) {
      return { success: false, error: 'GMOあおぞらAPIトークンが設定されていません' };
    }

    // TODO: 入金明細取得API実装

    return {
      success: true,
      message: 'GMOあおぞら入金確認（未実装）',
      deposits: []
    };
  }
};

// ========== トリガー設定・テスト関数 ==========

/**
 * 月次請求自動生成トリガーを設定
 * GASスクリプトエディタで1回だけ実行
 */
function setupMonthlyBillingTrigger() {
  console.log('========== 月次請求トリガー設定 ==========');

  // 既存トリガー削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runMonthlyBillingAuto') {
      ScriptApp.deleteTrigger(trigger);
      console.log('既存トリガー削除');
    }
  });

  // 毎月1日 9:00 に実行
  ScriptApp.newTrigger('runMonthlyBillingAuto')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();

  console.log('トリガー設定完了: 毎月1日 9:00');
  console.log('========== 完了 ==========');
}

/**
 * 月次請求自動生成（トリガーから呼ばれる）
 */
function runMonthlyBillingAuto() {
  console.log('========== トリガー実行: 月次請求自動生成 ==========');
  return BillingSystem.autoGenerateMonthlyInvoices();
}

/**
 * 月次請求生成テスト（手動実行用）
 */
function testAutoGenerateMonthlyInvoices() {
  console.log('========== 月次自動請求生成テスト ==========');
  return BillingSystem.autoGenerateMonthlyInvoices();
}

/**
 * 個別PDF送信テスト
 */
function testSendInvoicePdf() {
  console.log('========== 個別PDF送信テスト ==========');

  // テスト用請求ID（実在するものを指定）
  const testInvoiceId = 'INV-REF-202412-TESTHOUSEKAI'; // 変更してください

  const result = BillingSystem.sendInvoicePdf(testInvoiceId);
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}
