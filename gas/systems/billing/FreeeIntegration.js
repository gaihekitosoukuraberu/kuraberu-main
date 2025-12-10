/**
 * ====================================
 * freee API連携モジュール V1.0
 * ====================================
 *
 * 【機能】
 * - 事業所情報取得
 * - 取引先（加盟店）同期
 * - 請求書作成・送信
 * - 入金消込
 *
 * 【必要なScript Properties】
 * - FREEE_CLIENT_ID
 * - FREEE_CLIENT_SECRET
 * - FREEE_ACCESS_TOKEN
 * - FREEE_REFRESH_TOKEN
 * - FREEE_COMPANY_ID（事業所ID）
 */

const FreeeAPI = {
  // API Base URL
  BASE_URL: 'https://api.freee.co.jp',

  /**
   * アクセストークン取得
   */
  getAccessToken: function() {
    return PropertiesService.getScriptProperties().getProperty('FREEE_ACCESS_TOKEN');
  },

  /**
   * 事業所ID取得
   */
  getCompanyId: function() {
    return PropertiesService.getScriptProperties().getProperty('FREEE_COMPANY_ID');
  },

  /**
   * APIリクエスト共通処理
   */
  request: function(method, endpoint, payload) {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('FREEE_ACCESS_TOKENが設定されていません');
    }

    const options = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    };

    if (payload && (method === 'POST' || method === 'PUT')) {
      options.payload = JSON.stringify(payload);
    }

    const url = this.BASE_URL + endpoint;
    console.log('[FreeeAPI] Request:', method, url);

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('[FreeeAPI] Response Code:', responseCode);

    if (responseCode === 401) {
      // トークン期限切れ - リフレッシュ試行
      console.log('[FreeeAPI] Token expired, attempting refresh...');
      if (this.refreshToken()) {
        // リトライ
        options.headers['Authorization'] = 'Bearer ' + this.getAccessToken();
        const retryResponse = UrlFetchApp.fetch(url, options);
        return JSON.parse(retryResponse.getContentText());
      }
      throw new Error('トークンのリフレッシュに失敗しました');
    }

    if (responseCode >= 400) {
      console.error('[FreeeAPI] Error:', responseText);
      throw new Error('freee API Error: ' + responseText);
    }

    return JSON.parse(responseText);
  },

  /**
   * トークンリフレッシュ
   */
  refreshToken: function() {
    const clientId = PropertiesService.getScriptProperties().getProperty('FREEE_CLIENT_ID');
    const clientSecret = PropertiesService.getScriptProperties().getProperty('FREEE_CLIENT_SECRET');
    const refreshToken = PropertiesService.getScriptProperties().getProperty('FREEE_REFRESH_TOKEN');

    if (!refreshToken) {
      console.error('[FreeeAPI] No refresh token available');
      return false;
    }

    const tokenUrl = 'https://accounts.secure.freee.co.jp/public_api/token';
    const payload = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    };

    try {
      const response = UrlFetchApp.fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        payload: Object.keys(payload).map(k => k + '=' + encodeURIComponent(payload[k])).join('&'),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        PropertiesService.getScriptProperties().setProperty('FREEE_ACCESS_TOKEN', data.access_token);
        if (data.refresh_token) {
          PropertiesService.getScriptProperties().setProperty('FREEE_REFRESH_TOKEN', data.refresh_token);
        }
        console.log('[FreeeAPI] Token refreshed successfully');
        return true;
      }
    } catch (e) {
      console.error('[FreeeAPI] Token refresh error:', e);
    }

    return false;
  },

  // ========== 事業所 ==========

  /**
   * 事業所一覧取得
   */
  getCompanies: function() {
    return this.request('GET', '/api/1/companies');
  },

  /**
   * 事業所情報取得
   */
  getCompany: function(companyId) {
    const id = companyId || this.getCompanyId();
    return this.request('GET', '/api/1/companies/' + id);
  },

  // ========== 勘定科目 ==========

  /**
   * 勘定科目一覧取得
   */
  getAccountItems: function(companyId) {
    const id = companyId || this.getCompanyId();
    return this.request('GET', '/api/1/account_items?company_id=' + id);
  },

  /**
   * 売上高の勘定科目IDを取得
   */
  getSalesAccountItemId: function() {
    const result = this.getAccountItems();
    if (result.account_items) {
      // 「売上高」または「売上」を検索
      const salesAccount = result.account_items.find(item =>
        item.name === '売上高' || item.name === '売上' || item.name.includes('売上')
      );
      if (salesAccount) {
        return salesAccount.id;
      }
    }
    return null;
  },

  // ========== 取引先 ==========

  /**
   * 取引先一覧取得
   */
  getPartners: function(companyId) {
    const id = companyId || this.getCompanyId();
    return this.request('GET', '/api/1/partners?company_id=' + id);
  },

  /**
   * 取引先作成
   */
  createPartner: function(partnerData) {
    const companyId = this.getCompanyId();
    const payload = {
      company_id: parseInt(companyId),
      name: partnerData.name,
      shortcut1: partnerData.code || '', // 加盟店ID
      long_name: partnerData.longName || partnerData.name,
      default_title: '御中'
    };

    // 銀行口座情報がある場合のみ追加（nullだとエラー）
    if (partnerData.bankAccount) {
      payload.partner_bank_account_attributes = partnerData.bankAccount;
    }

    // 住所情報がある場合のみ追加
    if (partnerData.address) {
      payload.address_attributes = partnerData.address;
    }

    return this.request('POST', '/api/1/partners', payload);
  },

  /**
   * 取引先検索（コードで）
   */
  findPartnerByCode: function(code) {
    const partners = this.getPartners();
    if (partners.partners) {
      return partners.partners.find(p => p.shortcut1 === code);
    }
    return null;
  },

  // ========== 請求書 ==========

  /**
   * 請求書一覧取得
   */
  getInvoices: function(params) {
    const companyId = this.getCompanyId();
    let url = '/api/1/invoices?company_id=' + companyId;

    if (params) {
      if (params.partner_id) url += '&partner_id=' + params.partner_id;
      if (params.invoice_status) url += '&invoice_status=' + params.invoice_status;
      if (params.start_issue_date) url += '&start_issue_date=' + params.start_issue_date;
      if (params.end_issue_date) url += '&end_issue_date=' + params.end_issue_date;
    }

    return this.request('GET', url);
  },

  /**
   * 請求書作成
   * freee会計では請求書APIは /api/1/invoices
   * ただしテスト事業所では請求書機能が制限されている場合がある
   * 代替として「取引（収入）」を作成する
   * @param {Object} invoiceData - 請求書データ
   */
  createInvoice: function(invoiceData) {
    const companyId = parseInt(this.getCompanyId());

    // 請求日（今日）
    const today = new Date();
    const issueDate = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy-MM-dd');

    // 支払期限（デフォルト: 翌月15日）
    let dueDate;
    if (invoiceData.dueDate) {
      dueDate = Utilities.formatDate(new Date(invoiceData.dueDate), 'Asia/Tokyo', 'yyyy-MM-dd');
    } else {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
      dueDate = Utilities.formatDate(nextMonth, 'Asia/Tokyo', 'yyyy-MM-dd');
    }

    // 請求書番号生成（なければ自動生成）
    const invoiceNumber = invoiceData.invoiceNumber ||
      `INV-${Utilities.formatDate(today, 'Asia/Tokyo', 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 明細データ構築（freee請求書API形式: lines）
    const lines = invoiceData.items.map((item, index) => ({
      type: 'normal',
      description: item.name,
      quantity: String(item.quantity || 1),
      unit: item.unit || '件',
      unit_price: String(item.unitPrice),
      tax_rate: 10,
      is_withholding_tax_target: false
    }));

    // freee請求書API（/iv/invoices）用のペイロード
    const payload = {
      company_id: companyId,
      partner_id: invoiceData.partnerId,
      billing_date: issueDate,
      payment_date: dueDate,
      payment_type: 'transfer',  // 振込
      invoice_number: invoiceNumber,
      subject: invoiceData.title || '請求書',
      tax_entry_method: 'out',  // 税抜（out=外税）
      tax_fraction: 'round',  // 四捨五入
      withholding_tax_entry_method: 'out',
      partner_title: '御中',
      lines: lines,
      invoice_note: invoiceData.message || 'いつもお世話になっております。\n下記の通りご請求申し上げます。',
      memo: invoiceData.notes || ''
    };

    console.log('[FreeeAPI] 請求書作成リクエスト（freee請求書API）:', JSON.stringify(payload, null, 2));

    try {
      // freee請求書API（新）を使用
      const result = this.request('POST', '/iv/invoices', payload);
      console.log('[FreeeAPI] 請求書作成成功:', result.invoice?.id);

      // メール送信フラグがあれば送信
      if (invoiceData.sendEmail && result.invoice?.id) {
        this.sendInvoiceEmail(result.invoice.id, invoiceData.email);
      }

      return result;
    } catch (e) {
      console.error('[FreeeAPI] freee請求書API失敗:', e.message);
      // freee請求書APIが使えない場合は取引（収入）として作成
      console.log('[FreeeAPI] 取引として作成を試行');
      return this.createDeal(invoiceData);
    }
  },

  /**
   * 請求書メール送信
   * @param {number} invoiceId - freee請求書ID
   * @param {string} email - 送信先メールアドレス
   */
  sendInvoiceEmail: function(invoiceId, email) {
    const companyId = parseInt(this.getCompanyId());

    console.log('[FreeeAPI] 請求書メール送信:', invoiceId, '->', email);

    try {
      // freee請求書API - 請求書送信エンドポイント
      const result = this.request('POST', `/iv/invoices/${invoiceId}/delivery`, {
        company_id: companyId,
        sending_method: 'email',  // メール送信
        email_to: email,
        email_subject: '【くらべる】請求書送付のご案内',
        email_body: 'いつもお世話になっております。\n\n請求書をお送りいたします。\nご確認のほど、よろしくお願いいたします。\n\n株式会社くらべる'
      });
      console.log('[FreeeAPI] メール送信成功');
      return result;
    } catch (e) {
      console.error('[FreeeAPI] メール送信失敗:', e.message);
      // freeeメール送信が失敗した場合、Gmailで送信
      this.sendInvoiceEmailViaGmail(invoiceId, email);
    }
  },

  /**
   * Gmail経由で請求書通知メール送信（freee送信失敗時のフォールバック）
   */
  sendInvoiceEmailViaGmail: function(invoiceId, email) {
    if (!email) {
      console.warn('[FreeeAPI] メールアドレスがないためスキップ');
      return;
    }

    try {
      const subject = '【くらべる】請求書発行のお知らせ';
      const body = `
いつもお世話になっております。

請求書を発行いたしましたのでお知らせいたします。

請求書はfreee会計よりご確認いただけます。
ご不明点がございましたら、お気軽にお問い合わせください。

お支払い期限までにお振込みをお願いいたします。

---
株式会社くらべる
`;

      GmailApp.sendEmail(email, subject, body);
      console.log('[FreeeAPI] Gmail経由でメール送信完了:', email);
    } catch (e) {
      console.error('[FreeeAPI] Gmailメール送信失敗:', e.message);
    }
  },

  /**
   * 取引（収入）作成 - 請求書の代替
   */
  createDeal: function(dealData) {
    const companyId = parseInt(this.getCompanyId());
    const today = new Date();
    const issueDate = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy-MM-dd');

    // 支払期限
    const dueDate = dealData.dueDate
      ? Utilities.formatDate(new Date(dealData.dueDate), 'Asia/Tokyo', 'yyyy-MM-dd')
      : Utilities.formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), 'Asia/Tokyo', 'yyyy-MM-dd');

    // 売上高の勘定科目IDを取得
    const salesAccountId = this.getSalesAccountItemId();
    if (!salesAccountId) {
      throw new Error('売上高の勘定科目が見つかりません');
    }
    console.log('[FreeeAPI] 使用する勘定科目ID:', salesAccountId);

    // 管理番号は20文字以内に制限
    let refNumber = dealData.invoiceNumber || '';
    if (refNumber.length > 20) {
      refNumber = refNumber.substring(0, 20);
    }

    const payload = {
      company_id: companyId,
      issue_date: issueDate,
      due_date: dueDate,
      type: 'income', // 収入
      partner_id: dealData.partnerId,
      ref_number: refNumber,
      details: dealData.items.map(item => ({
        account_item_id: salesAccountId, // 売上高
        tax_code: 21, // 課税売上10%
        amount: item.unitPrice * (item.quantity || 1),
        description: item.name + (item.description ? ' - ' + item.description : ''),
        vat: Math.floor(item.unitPrice * (item.quantity || 1) * 0.1) // 消費税10%
      }))
    };

    return this.request('POST', '/api/1/deals', payload);
  },

  /**
   * 請求書ステータス更新（発行）
   */
  issueInvoice: function(invoiceId) {
    const companyId = parseInt(this.getCompanyId());
    return this.request('PUT', '/api/1/invoices/' + invoiceId, {
      company_id: companyId,
      invoice_status: 'issue'
    });
  },

  /**
   * 請求書送信
   */
  sendInvoice: function(invoiceId, email) {
    // freee APIでは直接メール送信機能がないため、
    // 請求書をPDFとして取得し、別途メール送信する
    console.log('[FreeeAPI] Invoice email send not directly supported');
    return { success: false, message: 'freee APIでは直接メール送信は未サポート' };
  }
};

// ========== 請求システム統合 ==========

const FreeeInvoiceManager = {
  /**
   * 加盟店をfreee取引先として同期
   */
  syncMerchantToPartner: function(merchantId, merchantName) {
    try {
      // 既存チェック
      const existing = FreeeAPI.findPartnerByCode(merchantId);
      if (existing) {
        console.log('[FreeeInvoiceManager] Partner already exists:', merchantId);
        return { success: true, partnerId: existing.id, existing: true };
      }

      // 新規作成
      const result = FreeeAPI.createPartner({
        name: merchantName,
        code: merchantId
      });

      console.log('[FreeeInvoiceManager] Partner created:', result);
      return { success: true, partnerId: result.partner.id, existing: false };

    } catch (e) {
      console.error('[FreeeInvoiceManager] syncMerchantToPartner error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 請求管理シートの請求をfreee請求書として作成
   */
  createInvoiceFromBilling: function(billingData) {
    try {
      // 取引先同期
      const partnerResult = this.syncMerchantToPartner(
        billingData.merchantId,
        billingData.merchantName
      );

      if (!partnerResult.success) {
        return partnerResult;
      }

      // 請求書作成
      const invoiceData = {
        partnerId: partnerResult.partnerId,
        invoiceNumber: billingData.invoiceId,
        title: billingData.type === '紹介料' ? '紹介料請求書' : '成約手数料請求書',
        dueDate: billingData.dueDate,
        items: [{
          name: billingData.type,
          quantity: billingData.count || 1,
          unit: billingData.type === '紹介料' ? '件' : '式',
          unitPrice: billingData.taxExcludedAmount,
          description: billingData.period + '分'
        }]
      };

      const result = FreeeAPI.createInvoice(invoiceData);

      return {
        success: true,
        freeeInvoiceId: result.invoice.id,
        invoiceNumber: result.invoice.invoice_number
      };

    } catch (e) {
      console.error('[FreeeInvoiceManager] createInvoiceFromBilling error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 請求管理シートの未発行請求を一括でfreee請求書作成
   */
  createAllPendingInvoices: function() {
    const billingResult = BillingSystem.getInvoices(null, '未発行');
    if (!billingResult.success) {
      return billingResult;
    }

    const results = [];
    for (const billing of billingResult.invoices) {
      const result = this.createInvoiceFromBilling({
        invoiceId: billing['請求ID'],
        merchantId: billing['加盟店ID'],
        merchantName: billing['加盟店名'],
        type: billing['請求種別'],
        period: billing['対象期間'],
        count: billing['対象件数'],
        taxExcludedAmount: billing['税抜金額'],
        dueDate: billing['支払期限']
      });

      results.push({
        invoiceId: billing['請求ID'],
        ...result
      });

      // freee請求書ID更新
      if (result.success) {
        // TODO: 請求管理シートのfreee請求書IDカラムを更新
      }
    }

    return {
      success: true,
      processed: results.length,
      results: results
    };
  }
};

// ========== テスト関数 ==========

/**
 * freee勘定科目一覧取得テスト
 */
function testFreeeGetAccountItems() {
  console.log('========== freee勘定科目一覧取得テスト ==========');
  try {
    const result = FreeeAPI.getAccountItems();
    console.log('勘定科目数:', result.account_items ? result.account_items.length : 0);

    if (result.account_items) {
      // 売上関連のみ表示
      const salesItems = result.account_items.filter(item =>
        item.name.includes('売上') || item.name.includes('収益')
      );
      console.log('\n【売上関連の勘定科目】');
      salesItems.forEach(item => {
        console.log(`- ID: ${item.id}, 名前: ${item.name}, カテゴリ: ${item.account_category}`);
      });
    }

    // 売上高IDを確認
    const salesId = FreeeAPI.getSalesAccountItemId();
    console.log('\n使用する売上高の勘定科目ID:', salesId);

  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * freee接続テスト - 事業所情報取得
 */
function testFreeeGetCompanies() {
  console.log('========== freee事業所一覧取得テスト ==========');
  try {
    const result = FreeeAPI.getCompanies();
    console.log('結果:', JSON.stringify(result, null, 2));

    if (result.companies && result.companies.length > 0) {
      console.log('\n【事業所一覧】');
      result.companies.forEach(c => {
        console.log(`- ID: ${c.id}, 名前: ${c.display_name}`);
      });
      console.log('\n最初の事業所IDをFREEE_COMPANY_IDに設定してください:', result.companies[0].id);
    }
  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * freee取引先一覧取得テスト
 */
function testFreeeGetPartners() {
  console.log('========== freee取引先一覧取得テスト ==========');
  try {
    const result = FreeeAPI.getPartners();
    console.log('結果:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * freee請求書一覧取得テスト
 */
function testFreeeGetInvoices() {
  console.log('========== freee請求書一覧取得テスト ==========');
  try {
    const result = FreeeAPI.getInvoices();
    console.log('結果:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * Script Propertiesにfreee認証情報を設定
 */
function setupFreeeCredentials() {
  const props = PropertiesService.getScriptProperties();

  // ここに認証情報を入力して実行
  props.setProperty('FREEE_CLIENT_ID', '637479117553908');
  props.setProperty('FREEE_CLIENT_SECRET', 'p7rkke077-bbsircvMa9iORiSoy1DYe2bG2I1HwpBdqgvRM4M_pHdJNQFEPcMIRmK_KaspLWdZcIHFtPhHxYcA');
  props.setProperty('FREEE_ACCESS_TOKEN', 'J6FGYTtBbCvUfydauu8j2A0iNI5_qMn23o-vdLqoRRQ');
  // FREEE_REFRESH_TOKEN は後で設定（アクセストークン取得時に取得）
  // FREEE_COMPANY_ID は testFreeeGetCompanies() で取得後に設定

  console.log('freee認証情報を設定しました');
  console.log('次に testFreeeGetCompanies() を実行して事業所IDを取得してください');
}

/**
 * テスト用取引先作成
 */
function testFreeeCreatePartner() {
  console.log('========== freee取引先作成テスト ==========');
  try {
    const result = FreeeAPI.createPartner({
      name: 'テスト加盟店株式会社',
      code: 'TEST001',
      longName: 'テスト加盟店株式会社'
    });
    console.log('結果:', JSON.stringify(result, null, 2));
    console.log('\n作成された取引先ID:', result.partner.id);
  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * テスト用請求書作成
 */
function testFreeeCreateInvoice() {
  console.log('========== freee請求書作成テスト ==========');
  try {
    // まず取引先を取得（デモデータの最初の取引先を使用）
    const partners = FreeeAPI.getPartners();
    if (!partners.partners || partners.partners.length === 0) {
      console.error('取引先がありません');
      return;
    }

    const partnerId = partners.partners[0].id;
    const partnerName = partners.partners[0].name;
    console.log('使用する取引先:', partnerName, '(ID:', partnerId, ')');

    // 請求書作成
    const result = FreeeAPI.createInvoice({
      partnerId: partnerId,
      invoiceNumber: 'INV-TEST-' + Date.now(),
      title: '紹介料請求書（テスト）',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      items: [
        {
          order: 1,
          name: '紹介料（12月分）',
          quantity: 5,
          unit: '件',
          unitPrice: 20000,
          description: 'CV-001, CV-002, CV-003, CV-004, CV-005'
        }
      ]
    });

    console.log('結果:', JSON.stringify(result, null, 2));
    if (result.invoice) {
      console.log('\n作成された請求書ID:', result.invoice.id);
      console.log('請求書番号:', result.invoice.invoice_number);
      console.log('合計金額:', result.invoice.total_amount, '円');
    } else if (result.deal) {
      console.log('\n作成された取引ID:', result.deal.id);
      console.log('金額:', result.deal.amount, '円');
    }

  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * テスト用取引（収入）作成 - 請求書の代替
 */
function testFreeeCreateDeal() {
  console.log('========== freee取引（収入）作成テスト ==========');
  try {
    // 取引先を取得
    const partners = FreeeAPI.getPartners();
    if (!partners.partners || partners.partners.length === 0) {
      console.error('取引先がありません');
      return;
    }

    const partnerId = partners.partners[0].id;
    const partnerName = partners.partners[0].name;
    console.log('使用する取引先:', partnerName, '(ID:', partnerId, ')');

    // 取引作成
    const result = FreeeAPI.createDeal({
      partnerId: partnerId,
      invoiceNumber: 'DEAL-TEST-' + Date.now(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          name: '紹介料（12月分テスト）',
          quantity: 5,
          unitPrice: 20000,
          description: 'テスト取引'
        }
      ]
    });

    console.log('結果:', JSON.stringify(result, null, 2));
    if (result.deal) {
      console.log('\n作成された取引ID:', result.deal.id);
      console.log('発生日:', result.deal.issue_date);
      console.log('金額:', result.deal.amount, '円');
    }

  } catch (e) {
    console.error('エラー:', e.message);
  }
  console.log('========== 完了 ==========');
}

/**
 * 請求管理シートから紹介料請求書を一括生成（テスト）
 */
function testGenerateReferralInvoicesToFreee() {
  console.log('========== 紹介料請求書一括生成テスト ==========');
  try {
    // 1. まず請求管理シートに請求を生成
    console.log('Step 1: 請求管理シートに請求生成...');
    const billingResult = BillingSystem.generateInvoices(null, 'referral');
    console.log('請求生成結果:', JSON.stringify(billingResult, null, 2));

    if (!billingResult.success || !billingResult.invoices || billingResult.invoices.length === 0) {
      console.log('生成する請求がありません');
      return;
    }

    // 2. freeeに請求書作成
    console.log('\nStep 2: freeeに請求書作成...');
    for (const invoice of billingResult.invoices) {
      console.log('\n処理中:', invoice.invoiceId, invoice.merchantId);

      // 取引先同期
      const partnerResult = FreeeInvoiceManager.syncMerchantToPartner(
        invoice.merchantId,
        invoice.merchantId // 会社名がない場合はIDを使用
      );
      console.log('取引先同期:', partnerResult);

      if (partnerResult.success) {
        // 請求書作成
        const invoiceResult = FreeeAPI.createInvoice({
          partnerId: partnerResult.partnerId,
          invoiceNumber: invoice.invoiceId,
          title: '紹介料請求書',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [{
            order: 1,
            name: '紹介料（' + new Date().getMonth() + 1 + '月分）',
            quantity: 1,
            unit: '式',
            unitPrice: invoice.amount,
            description: ''
          }]
        });
        console.log('請求書作成結果:', invoiceResult.invoice ? 'OK - ID:' + invoiceResult.invoice.id : 'NG');
      }
    }

  } catch (e) {
    console.error('エラー:', e.message, e.stack);
  }
  console.log('========== 完了 ==========');
}

/**
 * 統合テスト: 紹介料集計 → freee請求書作成
 */
function testFullBillingFlow() {
  console.log('★★★★★ 請求フロー統合テスト ★★★★★');

  // 1. 紹介料集計
  console.log('\n【1】紹介料集計');
  const referralFees = BillingSystem.getReferralFees();
  console.log('集計結果:', referralFees.summary);

  // 2. 請求書生成（スプシ）
  console.log('\n【2】請求管理シートに請求生成');
  // 既に生成済みの場合があるのでスキップ可能
  // const billingResult = BillingSystem.generateInvoices(null, 'referral');

  // 3. freee請求書作成（1件だけテスト）
  console.log('\n【3】freee請求書作成テスト（1件）');
  if (referralFees.data && referralFees.data.length > 0) {
    const first = referralFees.data[0];
    console.log('対象:', first.merchantName, '金額:', first.totalWithTax);

    // デモ取引先を使用してテスト
    const partners = FreeeAPI.getPartners();
    if (partners.partners && partners.partners.length > 0) {
      const demoPartner = partners.partners[0];
      const invoiceResult = FreeeAPI.createInvoice({
        partnerId: demoPartner.id,
        invoiceNumber: 'INV-REF-TEST-' + Date.now(),
        title: '紹介料請求書',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [{
          order: 1,
          name: '紹介料（12月分）',
          quantity: first.count,
          unit: '件',
          unitPrice: 20000,
          description: first.cvIds.slice(0, 5).join(', ') + (first.cvIds.length > 5 ? '...' : '')
        }]
      });
      console.log('freee請求書作成:', invoiceResult.invoice ? 'SUCCESS' : 'FAILED');
      if (invoiceResult.invoice) {
        console.log('請求書ID:', invoiceResult.invoice.id);
        console.log('合計:', invoiceResult.invoice.total_amount, '円');
      }
    }
  }

  console.log('\n★★★★★ テスト完了 ★★★★★');
}
