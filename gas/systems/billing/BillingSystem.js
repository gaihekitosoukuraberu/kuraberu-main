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
        return this.getInvoices(params.month, params.status);
      case 'billing_updateInvoiceStatus':
        return this.updateInvoiceStatus(params.invoiceId, params.status, params.paymentDate);
      case 'billing_checkPayments':
        return this.checkPayments();
      case 'billing_sendReminders':
        return this.sendReminders();
      case 'billing_setupSheets':
        return this.setupBillingSheets();
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
              '', // freee請求書ID
              '', // 発行日
              '', // 入金確認日
              '', // 入金額
              '未発行',
              0, // 督促回数
              '', // 最終督促日
              '', // 備考
              now,
              now
            ];

            billingSheet.appendRow(row);
            results.push({ type: '紹介料', invoiceId, merchantId: fee.merchantId, amount: fee.totalWithTax });
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
  getInvoices: function(month, status) {
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
   */
  sendReminders: function() {
    try {
      const invoices = this.getInvoices(null, '未入金');
      if (!invoices.success) return invoices;

      const overdue = invoices.invoices.filter(inv => {
        const dueDate = new Date(inv['支払期限']);
        return dueDate < new Date();
      });

      // TODO: Slack/メール通知実装
      return {
        success: true,
        overdueCount: overdue.length,
        message: `${overdue.length}件の未入金請求があります`,
        overdueInvoices: overdue.map(inv => ({
          invoiceId: inv['請求ID'],
          merchantName: inv['加盟店名'],
          amount: inv['税込金額'],
          dueDate: inv['支払期限']
        }))
      };

    } catch (e) {
      console.error('[BillingSystem] sendReminders error:', e);
      return { success: false, error: e.message };
    }
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

    if (paymentMethod === '口座振替') {
      // 翌月27日
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
      const nextYear = monthNum === 12 ? year + 1 : year;
      return new Date(nextYear, nextMonth - 1, 27);
    } else {
      // 翌月15日（振込）
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
      const nextYear = monthNum === 12 ? year + 1 : year;
      return new Date(nextYear, nextMonth - 1, 15);
    }
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
