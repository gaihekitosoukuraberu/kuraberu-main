/**
 * フランチャイズダッシュボード 請求・財務管理モジュール
 * スプレッドシートAPIと連携してリアルタイムデータを表示
 */
const FranchiseBillingManager = {
  // GAS APIのエンドポイント
  API_URL: null,

  // 現在の加盟店ID（ログイン情報から取得）
  merchantId: null,

  /**
   * 初期化
   */
  init: function() {
    console.log('[FranchiseBillingManager] init');

    // GAS URLを取得（グローバルから）
    if (typeof GAS_URL !== 'undefined') {
      this.API_URL = GAS_URL;
    } else if (typeof window.GAS_URL !== 'undefined') {
      this.API_URL = window.GAS_URL;
    }

    // 加盟店IDを取得（ログイン情報から）
    this.merchantId = this.getMerchantId();

    if (!this.merchantId) {
      console.warn('[FranchiseBillingManager] 加盟店IDが取得できません');
    }
  },

  /**
   * 加盟店IDを取得
   */
  getMerchantId: function() {
    // ローカルストレージから取得
    const loginData = localStorage.getItem('franchiseLoginData');
    if (loginData) {
      try {
        const parsed = JSON.parse(loginData);
        return parsed.merchantId || parsed.id;
      } catch (e) {
        console.error('[FranchiseBillingManager] ログインデータ解析エラー:', e);
      }
    }

    // グローバル変数から取得
    if (typeof currentMerchantId !== 'undefined') {
      return currentMerchantId;
    }

    // デモ用
    return null;
  },

  /**
   * APIコール（JSONP）
   */
  callApi: function(action, params) {
    return new Promise((resolve, reject) => {
      if (!this.API_URL) {
        reject(new Error('API URL not configured'));
        return;
      }

      const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      window[callbackName] = function(response) {
        delete window[callbackName];
        const script = document.getElementById(callbackName);
        if (script) script.remove();
        resolve(response);
      };

      const queryParams = new URLSearchParams({
        action: action,
        callback: callbackName,
        ...params
      });

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = this.API_URL + '?' + queryParams.toString();
      script.onerror = function() {
        delete window[callbackName];
        script.remove();
        reject(new Error('API request failed'));
      };

      document.body.appendChild(script);

      // タイムアウト
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          const s = document.getElementById(callbackName);
          if (s) s.remove();
          reject(new Error('API request timeout'));
        }
      }, 30000);
    });
  },

  /**
   * 財務セクションのデータ読み込み
   */
  loadFinancialSection: async function() {
    console.log('[FranchiseBillingManager] loadFinancialSection');

    if (!this.merchantId) {
      console.warn('[FranchiseBillingManager] 加盟店IDなし - デモモード');
      return;
    }

    try {
      // 請求データ取得
      const invoices = await this.callApi('billing_getInvoices', {
        merchantId: this.merchantId
      });

      if (invoices.success) {
        this.updateBillingSummary(invoices.invoices);
        this.updateInvoiceTable(invoices.invoices);
      } else {
        console.error('[FranchiseBillingManager] 請求データ取得エラー:', invoices.error);
      }

    } catch (e) {
      console.error('[FranchiseBillingManager] loadFinancialSection error:', e);
    }
  },

  /**
   * サマリーカード更新
   */
  updateBillingSummary: function(invoices) {
    // 今月の紹介料請求
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const referralInvoices = invoices.filter(inv =>
      inv['請求種別'] === '紹介料' && inv['対象期間'] === currentMonth
    );
    const commissionInvoices = invoices.filter(inv =>
      inv['請求種別'] === '成約手数料' && inv['対象期間'] === currentMonth
    );

    // 紹介料合計
    const referralTotal = referralInvoices.reduce((sum, inv) => sum + (inv['税込金額'] || 0), 0);
    // 成約手数料合計
    const commissionTotal = commissionInvoices.reduce((sum, inv) => sum + (inv['税込金額'] || 0), 0);
    // 累計（全期間の入金済み）
    const paidTotal = invoices
      .filter(inv => inv['ステータス'] === '入金済み')
      .reduce((sum, inv) => sum + (inv['税込金額'] || 0), 0);

    // DOM更新
    const monthLabel = now.getMonth() + 1 + '月';

    // 紹介料
    const referralMonthEl = document.getElementById('referralFeeMonth');
    const referralAmountEl = document.getElementById('referralFeeAmount');
    const referralCasesEl = document.getElementById('referralFeeCases');
    if (referralMonthEl) referralMonthEl.textContent = monthLabel + '紹介料';
    if (referralAmountEl) referralAmountEl.textContent = this.formatCurrency(referralTotal);
    if (referralCasesEl) referralCasesEl.textContent = `案件${referralInvoices.length}件分`;

    // 成約手数料
    const commissionMonthEl = document.getElementById('commissionMonth');
    const commissionAmountEl = document.getElementById('commissionAmount');
    const commissionCasesEl = document.getElementById('commissionCases');
    if (commissionMonthEl) commissionMonthEl.textContent = monthLabel + '成約手数料';
    if (commissionAmountEl) commissionAmountEl.textContent = this.formatCurrency(commissionTotal);
    if (commissionCasesEl) commissionCasesEl.textContent = `成約${commissionInvoices.length}件分`;

    // 累計利益
    const profitAmountEl = document.getElementById('profitAmount');
    if (profitAmountEl) profitAmountEl.textContent = this.formatCurrency(paidTotal);
  },

  /**
   * 請求テーブル更新（紹介料タブ）
   */
  updateInvoiceTable: function(invoices) {
    const purchaseTab = document.getElementById('purchaseTab');
    if (!purchaseTab) return;

    // 紹介料のみフィルタ
    const referralInvoices = invoices.filter(inv => inv['請求種別'] === '紹介料');

    if (referralInvoices.length === 0) {
      purchaseTab.innerHTML = `
        <div class="p-6 text-center text-gray-500">
          <p>紹介料の請求データがありません</p>
        </div>
      `;
      return;
    }

    // PC用テーブル
    const tableHtml = `
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">対象期間</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">件数</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">税抜金額</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">税込金額</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払期限</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${referralInvoices.map(inv => `
              <tr class="hover:bg-gray-50 ${inv['ステータス'] === '入金済み' ? 'bg-green-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${inv['請求ID'] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${inv['対象期間'] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${inv['件数'] || '-'}件</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(inv['税抜金額'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${this.formatCurrency(inv['税込金額'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(inv['支払期限'])}</td>
                <td class="px-6 py-4 whitespace-nowrap">${this.getStatusBadge(inv['ステータス'])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // スマホ用カード
    const cardsHtml = `
      <div class="md:hidden space-y-3">
        ${referralInvoices.map(inv => `
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${inv['ステータス'] === '入金済み' ? 'border-l-4 border-l-green-500' : ''}">
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="font-semibold text-gray-800">${inv['請求ID'] || '請求'}</div>
                <div class="text-xs text-gray-500">${inv['対象期間'] || '-'} / ${inv['件数'] || 0}件</div>
              </div>
              ${this.getStatusBadge(inv['ステータス'])}
            </div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <div>
                <div class="text-xs text-gray-500">支払期限</div>
                <div class="text-sm text-gray-700">${this.formatDate(inv['支払期限'])}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500">請求金額（税込）</div>
                <div class="text-lg font-bold text-gray-900">${this.formatCurrency(inv['税込金額'])}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    purchaseTab.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">紹介料請求一覧</h3>
      </div>
      ${tableHtml}
      ${cardsHtml}
    `;

    // 成約手数料タブも更新
    this.updateCommissionTable(invoices);
  },

  /**
   * 成約手数料テーブル更新
   */
  updateCommissionTable: function(invoices) {
    const commissionTab = document.getElementById('commissionTab');
    if (!commissionTab) return;

    const commissionInvoices = invoices.filter(inv => inv['請求種別'] === '成約手数料');

    if (commissionInvoices.length === 0) {
      // 空の場合は既存のデモデータを残す
      return;
    }

    // PC用テーブル
    const tableHtml = `
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">対象期間</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">成約金額</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手数料（税込）</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払期限</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${commissionInvoices.map(inv => `
              <tr class="hover:bg-gray-50 ${inv['ステータス'] === '入金済み' ? 'bg-green-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${inv['請求ID'] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${inv['対象期間'] || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${this.formatCurrency(inv['税抜金額'] / 0.1)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${this.formatCurrency(inv['税込金額'])}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${this.formatDate(inv['支払期限'])}</td>
                <td class="px-6 py-4 whitespace-nowrap">${this.getStatusBadge(inv['ステータス'])}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // スマホ用カード
    const cardsHtml = `
      <div class="md:hidden space-y-3">
        ${commissionInvoices.map(inv => `
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${inv['ステータス'] === '入金済み' ? 'border-l-4 border-l-green-500' : ''}">
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="font-semibold text-gray-800">${inv['請求ID'] || '成約手数料'}</div>
                <div class="text-xs text-gray-500">${inv['対象期間'] || '-'}</div>
              </div>
              ${this.getStatusBadge(inv['ステータス'])}
            </div>
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <div>
                <div class="text-xs text-gray-500">支払期限</div>
                <div class="text-sm text-gray-700">${this.formatDate(inv['支払期限'])}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500">手数料（税込）</div>
                <div class="text-lg font-bold text-gray-900">${this.formatCurrency(inv['税込金額'])}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    commissionTab.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">成約手数料請求一覧</h3>
      </div>
      <div class="bg-yellow-50 p-3 rounded-lg mb-4 text-sm">
        <span class="font-medium text-yellow-800">支払条件:</span>
        <span class="text-yellow-700">請求書発行から3営業日以内</span>
      </div>
      ${tableHtml}
      ${cardsHtml}
    `;
  },

  /**
   * ステータスバッジ生成
   */
  getStatusBadge: function(status) {
    const statusMap = {
      '未発行': { bg: 'bg-gray-100', text: 'text-gray-700' },
      '発行済み': { bg: 'bg-blue-100', text: 'text-blue-700' },
      '未入金': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      '入金済み': { bg: 'bg-green-100', text: 'text-green-700' },
      '督促中': { bg: 'bg-red-100', text: 'text-red-700' }
    };

    const style = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return `<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${style.bg} ${style.text}">${status || '不明'}</span>`;
  },

  /**
   * 金額フォーマット
   */
  formatCurrency: function(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '¥0';
    return '¥' + Math.floor(amount).toLocaleString();
  },

  /**
   * 日付フォーマット
   */
  formatDate: function(date) {
    if (!date) return '-';
    if (date instanceof Date) {
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
    // 文字列の場合
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    } catch (e) {
      return String(date);
    }
  }
};

// 財務セクション表示時にデータ読み込み
function loadFranchiseBillingData() {
  if (!FranchiseBillingManager.API_URL) {
    FranchiseBillingManager.init();
  }
  FranchiseBillingManager.loadFinancialSection();
}

// グローバルに公開
window.FranchiseBillingManager = FranchiseBillingManager;
window.loadFranchiseBillingData = loadFranchiseBillingData;
