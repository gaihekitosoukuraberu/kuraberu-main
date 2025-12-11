/**
 * 請求・財務管理 API連携モジュール
 * admin-dashboard/index.html の財務セクションをスプシデータで動的に表示
 *
 * @version 1.0
 * @date 2025-12-11
 */

const BillingManager = {
  apiClient: null,

  // キャッシュ
  cache: {
    referralFees: null,
    commissionFees: null,
    invoices: null,
    lastFetch: null
  },

  /**
   * 初期化
   */
  init: function() {
    if (!window.ApiClient) {
      console.error('[BillingManager] ApiClient not found');
      return;
    }
    this.apiClient = new ApiClient();
    console.log('[BillingManager] 初期化完了');
  },

  /**
   * 財務セクションを読み込み
   */
  async loadFinancialSection() {
    console.log('[BillingManager] 財務セクション読み込み開始');

    try {
      // ローディング表示
      this.showLoading();

      // データ並列取得
      const [referralResult, invoicesResult] = await Promise.all([
        this.apiClient.getRequest('billing_getReferralFees'),
        this.apiClient.getRequest('billing_getInvoices')
      ]);

      console.log('[BillingManager] 紹介料データ:', referralResult);
      console.log('[BillingManager] 請求一覧:', invoicesResult);

      // キャッシュに保存
      this.cache.referralFees = referralResult;
      this.cache.invoices = invoicesResult;
      this.cache.lastFetch = new Date();

      // UI更新
      this.updateSummaryCards(referralResult, invoicesResult);
      this.updateReferralTable(referralResult);
      this.updateInvoicesTable(invoicesResult);

      this.hideLoading();

    } catch (error) {
      console.error('[BillingManager] データ取得エラー:', error);
      this.hideLoading();
      this.showError('データの取得に失敗しました');
    }
  },

  /**
   * 概要カードを更新
   */
  updateSummaryCards: function(referralData, invoicesData) {
    // 今月請求額（紹介料集計）
    const monthlyTotal = referralData?.summary?.totalWithTax || 0;
    const monthlyCount = referralData?.summary?.totalCount || 0;

    // 請求ステータス別集計
    const invoices = invoicesData?.invoices || [];
    const unpaid = invoices.filter(inv => inv['ステータス'] === '未発行' || inv['ステータス'] === '発行済み');
    const pending = invoices.filter(inv => inv['ステータス'] === '未入金');
    const paid = invoices.filter(inv => inv['ステータス'] === '入金済み');

    const unpaidTotal = unpaid.reduce((sum, inv) => sum + Number(inv['税込金額'] || 0), 0);
    const pendingTotal = pending.reduce((sum, inv) => sum + Number(inv['税込金額'] || 0), 0);
    const paidTotal = paid.reduce((sum, inv) => sum + Number(inv['税込金額'] || 0), 0);

    // DOM更新（概要カード）
    const summaryHTML = `
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <div class="text-sm text-gray-500 mb-2">今月請求額</div>
          <div class="text-2xl font-bold text-gray-800">¥${monthlyTotal.toLocaleString()}</div>
          <div class="text-xs text-gray-500 mt-1">${monthlyCount}件</div>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <div class="text-sm text-gray-500 mb-2">未処理請求</div>
          <div class="text-2xl font-bold text-yellow-600">${unpaid.length}件</div>
          <div class="text-xs text-gray-500 mt-1">合計 ¥${unpaidTotal.toLocaleString()}</div>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <div class="text-sm text-gray-500 mb-2">入金待ち</div>
          <div class="text-2xl font-bold text-blue-600">${pending.length}件</div>
          <div class="text-xs text-gray-500 mt-1">合計 ¥${pendingTotal.toLocaleString()}</div>
        </div>
        <div class="bg-white rounded-xl p-6 border border-gray-200">
          <div class="text-sm text-gray-500 mb-2">今月入金済</div>
          <div class="text-2xl font-bold text-green-600">¥${paidTotal.toLocaleString()}</div>
          <div class="text-xs text-gray-500 mt-1">${paid.length}件完了</div>
        </div>
      </div>
    `;

    const summaryContainer = document.getElementById('billing-summary-cards');
    if (summaryContainer) {
      summaryContainer.innerHTML = summaryHTML;
    }
  },

  /**
   * 紹介料タブのサマリーカード更新
   */
  updateReferralSummary: function(referralData, invoicesData) {
    const invoices = invoicesData?.invoices || [];
    const referral = referralData?.summary || {};

    const monthlyPending = referral.totalWithTax || 0;
    const monthlyCount = referral.totalCount || 0;

    const paidInvoices = invoices.filter(inv => inv['ステータス'] === '入金済み' && inv['請求種別'] === '紹介料');
    const unpaidInvoices = invoices.filter(inv => inv['ステータス'] === '未入金' && inv['請求種別'] === '紹介料');

    const paidTotal = paidInvoices.reduce((sum, inv) => sum + Number(inv['税込金額'] || 0), 0);
    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv['税込金額'] || 0), 0);

    return `
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">今月請求予定</div>
          <div class="text-2xl font-bold text-blue-600">¥${monthlyPending.toLocaleString()}</div>
          <div class="text-xs text-gray-500">税込（${monthlyCount}件）</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">入金済み</div>
          <div class="text-2xl font-bold text-green-600">¥${paidTotal.toLocaleString()}</div>
          <div class="text-xs text-gray-500">${paidInvoices.length}件</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">未入金</div>
          <div class="text-2xl font-bold text-yellow-600">¥${unpaidTotal.toLocaleString()}</div>
          <div class="text-xs text-gray-500">${unpaidInvoices.length}件</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
          <div class="text-sm text-gray-600">今月紹介数</div>
          <div class="text-2xl font-bold text-purple-600">${monthlyCount}件</div>
          <div class="text-xs text-gray-500">配信済み</div>
        </div>
      </div>
    `;
  },

  /**
   * 紹介料テーブルを更新
   */
  updateReferralTable: function(referralData) {
    const data = referralData?.data || [];

    if (data.length === 0) {
      const tbody = document.getElementById('referral-table-body');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="py-8 text-center text-gray-500">
              今月の紹介料データがありません
            </td>
          </tr>
        `;
      }
      const mobileContainer = document.getElementById('referral-cards-mobile');
      if (mobileContainer) {
        mobileContainer.innerHTML = `<div class="text-center text-gray-500 py-8">今月の紹介料データがありません</div>`;
      }
      return;
    }

    let totalTaxExcluded = 0;
    let totalTax = 0;
    let totalWithTax = 0;

    // PC用テーブル行
    const rows = data.map((item, index) => {
      totalTaxExcluded += item.totalAmount || 0;
      totalTax += item.tax || 0;
      totalWithTax += item.totalWithTax || 0;

      const statusClass = 'bg-yellow-100 text-yellow-700';
      const statusText = '未請求';

      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="py-3 px-4">
            <input type="checkbox" class="rounded invoice-checkbox" data-merchant="${item.merchantId}">
          </td>
          <td class="py-3 px-4 font-medium">${item.merchantName || item.merchantId}</td>
          <td class="py-3 px-4">${item.count}件</td>
          <td class="py-3 px-4 text-xs text-gray-500 max-w-xs truncate" title="${item.cvIds?.join(', ')}">${item.cvIds?.slice(0, 3).join(', ')}${item.cvIds?.length > 3 ? '...' : ''}</td>
          <td class="text-right py-3 px-4 font-semibold">¥${(item.totalAmount || 0).toLocaleString()}</td>
          <td class="text-right py-3 px-4 text-gray-600">¥${(item.tax || 0).toLocaleString()}</td>
          <td class="text-right py-3 px-4 font-bold text-blue-600">¥${(item.totalWithTax || 0).toLocaleString()}</td>
          <td class="text-center py-3 px-4">
            <span class="px-2 py-1 ${statusClass} rounded text-xs">${statusText}</span>
          </td>
          <td class="text-center py-3 px-4">
            <button onclick="BillingManager.showReferralDetail('${item.merchantId}')" class="text-gray-600 hover:text-gray-800 text-sm"><i class="fas fa-eye mr-1"></i>詳細</button>
          </td>
        </tr>
      `;
    }).join('');

    const tbody = document.getElementById('referral-table-body');
    if (tbody) {
      tbody.innerHTML = rows;
    }

    // スマホ用カード
    const cards = data.map(item => `
      <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="font-semibold text-gray-800">${item.merchantName || item.merchantId}</div>
            <div class="text-xs text-gray-500">${item.count}件</div>
          </div>
          <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">未請求</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <div class="text-gray-500 text-xs">紹介料（税抜）</div>
            <div class="font-semibold">¥${(item.totalAmount || 0).toLocaleString()}</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">請求額（税込）</div>
            <div class="font-bold text-blue-600">¥${(item.totalWithTax || 0).toLocaleString()}</div>
          </div>
        </div>
        <div class="text-xs text-gray-400 mb-3 truncate">CV: ${item.cvIds?.slice(0, 2).join(', ')}${item.cvIds?.length > 2 ? '...' : ''}</div>
        <button onclick="BillingManager.showReferralDetail('${item.merchantId}')" class="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
          <i class="fas fa-eye mr-1"></i>詳細
        </button>
      </div>
    `).join('');

    const mobileContainer = document.getElementById('referral-cards-mobile');
    if (mobileContainer) {
      mobileContainer.innerHTML = cards;
    }

    // 合計更新
    const totalContainer = document.getElementById('referral-total');
    if (totalContainer) {
      totalContainer.innerHTML = `
        紹介料合計: <span class="font-bold text-blue-600 mr-2">¥${totalTaxExcluded.toLocaleString()}</span>
        請求総額: <span class="font-bold text-purple-600 text-lg">¥${totalWithTax.toLocaleString()}</span>
      `;
    }
  },

  /**
   * 請求書一覧テーブルを更新
   */
  updateInvoicesTable: function(invoicesData) {
    const invoices = invoicesData?.invoices || [];

    if (invoices.length === 0) {
      const tbody = document.getElementById('invoices-table-body');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="py-8 text-center text-gray-500">
              請求データがありません
            </td>
          </tr>
        `;
      }
      const mobileContainer = document.getElementById('invoices-cards-mobile');
      if (mobileContainer) {
        mobileContainer.innerHTML = `<div class="text-center text-gray-500 py-8">請求データがありません</div>`;
      }
      return;
    }

    // PC用テーブル
    const rows = invoices.map(inv => {
      const status = inv['ステータス'] || '未発行';
      const statusClass = this.getStatusClass(status);
      const dueDate = inv['支払期限'] ? new Date(inv['支払期限']).toLocaleDateString('ja-JP') : '-';
      const issuedDate = inv['発行日'] ? new Date(inv['発行日']).toLocaleDateString('ja-JP') : '-';

      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="py-3 px-4 font-mono text-sm">${inv['請求ID']}</td>
          <td class="py-3 px-4 font-medium">${inv['加盟店名']}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 ${inv['請求種別'] === '紹介料' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} rounded text-xs">
              ${inv['請求種別']}
            </span>
          </td>
          <td class="py-3 px-4">${inv['対象期間']}</td>
          <td class="text-right py-3 px-4 font-bold">¥${Number(inv['税込金額'] || 0).toLocaleString()}</td>
          <td class="py-3 px-4">${dueDate}</td>
          <td class="py-3 px-4">${issuedDate}</td>
          <td class="text-center py-3 px-4">
            <span class="px-2 py-1 ${statusClass} rounded text-xs">${status}</span>
          </td>
          <td class="text-center py-3 px-4">
            ${this.getActionButton(inv)}
          </td>
        </tr>
      `;
    }).join('');

    const tbody = document.getElementById('invoices-table-body');
    if (tbody) {
      tbody.innerHTML = rows;
    }

    // スマホ用カード
    const cards = invoices.map(inv => {
      const status = inv['ステータス'] || '未発行';
      const statusClass = this.getStatusClass(status);
      const dueDate = inv['支払期限'] ? new Date(inv['支払期限']).toLocaleDateString('ja-JP') : '-';
      const invoiceId = inv['請求ID'];

      return `
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-semibold text-gray-800">${inv['加盟店名']}</div>
              <div class="text-xs text-gray-500 font-mono">${invoiceId}</div>
            </div>
            <span class="px-2 py-1 ${statusClass} rounded text-xs">${status}</span>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="px-2 py-1 ${inv['請求種別'] === '紹介料' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} rounded text-xs">
              ${inv['請求種別']}
            </span>
            <div class="text-right">
              <div class="font-bold text-lg text-blue-600">¥${Number(inv['税込金額'] || 0).toLocaleString()}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
            <div>対象: ${inv['対象期間']}</div>
            <div>期限: ${dueDate}</div>
          </div>
          ${this.getMobileActionButton(inv)}
        </div>
      `;
    }).join('');

    const mobileContainer = document.getElementById('invoices-cards-mobile');
    if (mobileContainer) {
      mobileContainer.innerHTML = cards;
    }
  },

  /**
   * スマホ用アクションボタン
   */
  getMobileActionButton: function(invoice) {
    const status = invoice['ステータス'];
    const invoiceId = invoice['請求ID'];
    const pdfSent = invoice['PDF送信日'];

    // PDF送信ボタン
    const pdfBtn = !pdfSent
      ? `<button onclick="BillingManager.sendPdf('${invoiceId}')" class="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"><i class="fas fa-paper-plane mr-1"></i>PDF送信</button>`
      : `<div class="flex-1 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm text-center"><i class="fas fa-check mr-1"></i>送信済</div>`;

    if (status === '未発行') {
      return `<div class="flex gap-2">${pdfBtn}<button onclick="BillingManager.issueInvoice('${invoiceId}')" class="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">発行する</button></div>`;
    } else if (status === '発行済み' || status === '未入金') {
      return `<div class="flex gap-2">${pdfBtn}<button onclick="BillingManager.confirmPayment('${invoiceId}')" class="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">入金確認</button></div>`;
    } else if (status === '入金済み') {
      return `<div class="flex gap-2">${pdfBtn}<div class="flex-1 text-center text-gray-400 text-sm py-2">完了</div></div>`;
    }
    return pdfBtn;
  },

  /**
   * ステータスに応じたCSSクラスを取得
   */
  getStatusClass: function(status) {
    const classes = {
      '未発行': 'bg-gray-100 text-gray-700',
      '発行済み': 'bg-blue-100 text-blue-700',
      '未入金': 'bg-yellow-100 text-yellow-700',
      '入金済み': 'bg-green-100 text-green-700',
      '一部入金': 'bg-orange-100 text-orange-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  },

  /**
   * アクションボタンを取得
   */
  getActionButton: function(invoice) {
    const status = invoice['ステータス'];
    const invoiceId = invoice['請求ID'];
    const pdfSent = invoice['PDF送信日'];

    // PDF送信ボタン（未送信の場合）
    const pdfBtn = !pdfSent
      ? `<button onclick="BillingManager.sendPdf('${invoiceId}')" class="text-purple-600 hover:text-purple-800 text-sm mr-2" title="PDF送信"><i class="fas fa-paper-plane"></i></button>`
      : `<span class="text-gray-400 text-sm mr-2" title="送信済: ${pdfSent}"><i class="fas fa-check"></i></span>`;

    if (status === '未発行') {
      return pdfBtn + `<button onclick="BillingManager.issueInvoice('${invoiceId}')" class="text-blue-600 hover:text-blue-800 text-sm">発行する</button>`;
    } else if (status === '発行済み' || status === '未入金') {
      return pdfBtn + `<button onclick="BillingManager.confirmPayment('${invoiceId}')" class="text-green-600 hover:text-green-800 text-sm">入金確認</button>`;
    } else if (status === '入金済み') {
      return pdfBtn + `<span class="text-gray-400 text-sm">完了</span>`;
    }
    return pdfBtn;
  },

  /**
   * 請求書発行
   */
  async issueInvoice(invoiceId) {
    if (!confirm(`請求書 ${invoiceId} を発行しますか？`)) return;

    try {
      const result = await this.apiClient.getRequest('billing_updateInvoiceStatus', {
        invoiceId: invoiceId,
        status: '発行済み'
      });

      if (result.success) {
        alert('請求書を発行しました');
        this.loadFinancialSection(); // リロード
      } else {
        alert('エラー: ' + (result.error || '発行に失敗しました'));
      }
    } catch (error) {
      console.error('[BillingManager] 発行エラー:', error);
      alert('エラーが発生しました');
    }
  },

  /**
   * 入金確認
   */
  async confirmPayment(invoiceId) {
    const amount = prompt('入金額を入力してください（税込）:');
    if (!amount) return;

    try {
      const result = await this.apiClient.getRequest('billing_confirmPayment', {
        invoiceId: invoiceId,
        paymentAmount: amount
      });

      if (result.success) {
        alert(`入金を確認しました\nステータス: ${result.status}\n${result.note || ''}`);
        this.loadFinancialSection(); // リロード
      } else {
        alert('エラー: ' + (result.error || '入金確認に失敗しました'));
      }
    } catch (error) {
      console.error('[BillingManager] 入金確認エラー:', error);
      alert('エラーが発生しました');
    }
  },

  /**
   * 請求書一括生成
   */
  async generateInvoices(type = 'referral') {
    if (!confirm(`${type === 'referral' ? '紹介料' : '成約手数料'}の請求書を一括生成しますか？`)) return;

    try {
      const result = await this.apiClient.getRequest('billing_generateInvoices', {
        type: type
      });

      if (result.success) {
        alert(`${result.invoices?.length || 0}件の請求書を生成しました`);
        this.loadFinancialSection(); // リロード
      } else {
        alert('エラー: ' + (result.error || '生成に失敗しました'));
      }
    } catch (error) {
      console.error('[BillingManager] 請求書生成エラー:', error);
      alert('エラーが発生しました');
    }
  },

  /**
   * ローディング表示
   */
  showLoading: function() {
    const loader = document.getElementById('billing-loading');
    if (loader) loader.style.display = 'block';
  },

  /**
   * ローディング非表示
   */
  hideLoading: function() {
    const loader = document.getElementById('billing-loading');
    if (loader) loader.style.display = 'none';
  },

  /**
   * エラー表示
   */
  showError: function(message) {
    const errorDiv = document.getElementById('billing-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  },

  /**
   * PDF送信
   */
  async sendPdf(invoiceId) {
    if (!confirm(`請求書 ${invoiceId} のPDFを送信しますか？\n加盟店のメールアドレスにPDFが添付されます。`)) return;

    try {
      this.showLoading();
      const result = await this.apiClient.getRequest('billing_sendPdf', {
        invoiceId: invoiceId
      });

      this.hideLoading();

      if (result.success) {
        alert(`PDF送信完了\n\n送信先: ${result.sentTo}\nファイル: ${result.fileName}`);
        this.loadFinancialSection(); // リロード
      } else {
        alert('エラー: ' + (result.error || 'PDF送信に失敗しました'));
      }
    } catch (error) {
      this.hideLoading();
      console.error('[BillingManager] PDF送信エラー:', error);
      alert('エラーが発生しました');
    }
  },

  /**
   * 紹介料詳細表示
   */
  showReferralDetail: function(merchantId) {
    const data = this.cache.referralFees?.data || [];
    const item = data.find(d => d.merchantId === merchantId);

    if (!item) {
      alert('データが見つかりません');
      return;
    }

    const cvList = item.cvIds?.map((cv, i) => `${i + 1}. ${cv}`).join('\n') || 'なし';

    alert(`【${item.merchantName || merchantId}】紹介料詳細\n\n` +
      `件数: ${item.count}件\n` +
      `紹介料（税抜）: ¥${(item.totalAmount || 0).toLocaleString()}\n` +
      `消費税: ¥${(item.tax || 0).toLocaleString()}\n` +
      `請求額（税込）: ¥${(item.totalWithTax || 0).toLocaleString()}\n\n` +
      `【対象CV】\n${cvList}`);
  },

  /**
   * 一括PDF送信（請求書一覧タブ用）
   */
  async sendAllPdfs() {
    const invoices = this.cache.invoices?.invoices || [];
    const unsent = invoices.filter(inv => !inv['PDF送信日'] && inv['ステータス'] !== '入金済み');

    if (unsent.length === 0) {
      alert('送信対象の請求書がありません');
      return;
    }

    if (!confirm(`${unsent.length}件の請求書PDFを一括送信しますか？`)) return;

    try {
      this.showLoading();
      let successCount = 0;
      let errorCount = 0;

      for (const inv of unsent) {
        try {
          const result = await this.apiClient.getRequest('billing_sendPdf', {
            invoiceId: inv['請求ID']
          });
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (e) {
          errorCount++;
        }
      }

      this.hideLoading();
      alert(`一括送信完了\n\n成功: ${successCount}件\n失敗: ${errorCount}件`);
      this.loadFinancialSection();
    } catch (error) {
      this.hideLoading();
      console.error('[BillingManager] 一括PDF送信エラー:', error);
      alert('エラーが発生しました');
    }
  },

  /**
   * 支払期限一括変更モーダル表示
   */
  showBulkDueDateModal: function() {
    // モーダルが存在しなければ作成
    let modal = document.getElementById('bulkDueDateModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bulkDueDateModal';
      modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 hidden';
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div class="p-6 border-b">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-bold">支払期限一括変更</h3>
              <button onclick="BillingManager.closeBulkDueDateModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="p-6">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">対象月</label>
              <input type="month" id="bulkDueDateTargetMonth" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value="${new Date().toISOString().slice(0, 7)}">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">新しい支払期限</label>
              <input type="date" id="bulkDueDateNewDate" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">変更理由（任意）</label>
              <input type="text" id="bulkDueDateReason" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="例: 年末年始休暇のため前倒し">
            </div>
            <div class="bg-yellow-50 p-3 rounded-lg mb-4">
              <p class="text-sm text-yellow-800">
                <strong>注意:</strong> 選択した対象月の全請求（未入金分）の支払期限が変更されます。
              </p>
            </div>
          </div>
          <div class="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
            <button onclick="BillingManager.closeBulkDueDateModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">キャンセル</button>
            <button onclick="BillingManager.executeBulkDueDateChange()" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">変更を実行</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // デフォルト日付を設定（来月15日）
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(15);
    document.getElementById('bulkDueDateNewDate').value = nextMonth.toISOString().slice(0, 10);

    modal.classList.remove('hidden');
  },

  closeBulkDueDateModal: function() {
    const modal = document.getElementById('bulkDueDateModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  /**
   * 支払期限一括変更を実行
   */
  executeBulkDueDateChange: async function() {
    const targetMonth = document.getElementById('bulkDueDateTargetMonth').value;
    const newDate = document.getElementById('bulkDueDateNewDate').value;
    const reason = document.getElementById('bulkDueDateReason').value;

    if (!targetMonth || !newDate) {
      alert('対象月と新しい支払期限を入力してください');
      return;
    }

    if (!confirm(`${targetMonth}の全請求の支払期限を${newDate}に変更します。\n\n本当によろしいですか？`)) {
      return;
    }

    this.showLoading();

    try {
      const result = await this.callApi('billing_bulkUpdateDueDate', {
        targetMonth: targetMonth,
        newDueDate: newDate,
        reason: reason
      });

      this.hideLoading();

      if (result.success) {
        alert(`支払期限を変更しました\n\n変更件数: ${result.updatedCount}件`);
        this.closeBulkDueDateModal();
        this.loadFinancialSection();
      } else {
        alert('エラー: ' + (result.error || '変更に失敗しました'));
      }
    } catch (error) {
      this.hideLoading();
      console.error('[BillingManager] 一括変更エラー:', error);
      alert('エラーが発生しました');
    }
  }
};

// グローバルに公開
window.BillingManager = BillingManager;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  BillingManager.init();
});
