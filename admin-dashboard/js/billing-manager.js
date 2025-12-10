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
            <td colspan="8" class="py-8 text-center text-gray-500">
              今月の紹介料データがありません
            </td>
          </tr>
        `;
      }
      return;
    }

    let totalTaxExcluded = 0;
    let totalTax = 0;
    let totalWithTax = 0;

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
            <button onclick="BillingManager.createInvoice('${item.merchantId}', 'referral')" class="text-blue-600 hover:text-blue-800 text-sm">請求書作成</button>
          </td>
        </tr>
      `;
    }).join('');

    const tbody = document.getElementById('referral-table-body');
    if (tbody) {
      tbody.innerHTML = rows;
    }

    // 合計更新
    const totalContainer = document.getElementById('referral-total');
    if (totalContainer) {
      totalContainer.innerHTML = `
        紹介料合計: <span class="font-bold text-blue-600 mr-4">¥${totalTaxExcluded.toLocaleString()}</span>
        消費税: <span class="font-bold text-gray-600 mr-4">¥${totalTax.toLocaleString()}</span>
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
      return;
    }

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

    if (status === '未発行') {
      return `<button onclick="BillingManager.issueInvoice('${invoiceId}')" class="text-blue-600 hover:text-blue-800 text-sm">発行する</button>`;
    } else if (status === '発行済み' || status === '未入金') {
      return `<button onclick="BillingManager.confirmPayment('${invoiceId}')" class="text-green-600 hover:text-green-800 text-sm">入金確認</button>`;
    } else if (status === '入金済み') {
      return `<span class="text-gray-400 text-sm">完了</span>`;
    }
    return '';
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
  }
};

// グローバルに公開
window.BillingManager = BillingManager;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  BillingManager.init();
});
