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
  const result = BillingSystem.autoGenerateMonthlyInvoices();
  console.log('結果:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 月次請求自動生成テスト（手動実行用）
 */
function testAutoGenerateMonthlyInvoices() {
  console.log('========== 月次請求自動生成テスト ==========');
  const result = BillingSystem.autoGenerateMonthlyInvoices();
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
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
