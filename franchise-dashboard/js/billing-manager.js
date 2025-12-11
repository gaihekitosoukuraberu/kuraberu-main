/**
 * フランチャイズダッシュボード 請求・財務管理モジュール
 * スプレッドシートAPIと連携してリアルタイムデータを表示
 * スマホファースト・レスポンシブ対応
 */
const FranchiseBillingManager = {
  // GAS APIのエンドポイント
  API_URL: null,

  // 現在の加盟店ID（ログイン情報から取得）
  merchantId: null,

  // キャッシュ
  cache: {
    referralHistory: null,
    financialSummary: null,
    lastFetch: null
  },

  // 現在選択中の月
  selectedMonth: null,

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

    // 現在の月をデフォルトに
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * 加盟店IDを取得
   */
  getMerchantId: function() {
    // window.merchantDataから取得（最優先）
    if (window.merchantData) {
      const id = window.merchantData['登録ID'] || window.merchantData.registrationId || window.merchantData.merchantId;
      if (id) {
        console.log('[FranchiseBillingManager] merchantDataから取得:', id);
        return id;
      }
    }

    // グローバル変数から取得
    if (typeof currentMerchantId !== 'undefined' && currentMerchantId) {
      console.log('[FranchiseBillingManager] currentMerchantIdから取得:', currentMerchantId);
      return currentMerchantId;
    }

    // ローカルストレージから取得
    const loginData = localStorage.getItem('franchiseLoginData');
    if (loginData) {
      try {
        const parsed = JSON.parse(loginData);
        const id = parsed.merchantId || parsed.id || parsed.registrationId;
        if (id) {
          console.log('[FranchiseBillingManager] localStorageから取得:', id);
          return id;
        }
      } catch (e) {
        console.error('[FranchiseBillingManager] ログインデータ解析エラー:', e);
      }
    }

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
   * 財務セクション全体のデータ読み込み
   */
  loadFinancialSection: async function() {
    console.log('[FranchiseBillingManager] loadFinancialSection');

    // 毎回最新の加盟店IDを取得（ページロード後にmerchantDataが設定される場合があるため）
    const merchantId = this.getMerchantId();
    if (!merchantId) {
      console.warn('[FranchiseBillingManager] 加盟店IDなし - デモモード');
      this.showDemoData();
      return;
    }
    this.merchantId = merchantId;

    this.showLoading(true);

    try {
      // 並列でデータ取得
      const [summaryResult, historyResult] = await Promise.all([
        this.callApi('billing_getFinancialSummary', { merchantId: this.merchantId }),
        this.callApi('billing_getReferralHistory', { merchantId: this.merchantId, month: this.selectedMonth })
      ]);

      if (summaryResult.success) {
        this.cache.financialSummary = summaryResult.summary;
        this.updateSummaryCards(summaryResult.summary);
      }

      if (historyResult.success) {
        this.cache.referralHistory = historyResult.history;
        this.updateReferralHistoryTable(historyResult.history);
      }

      this.cache.lastFetch = new Date();

    } catch (e) {
      console.error('[FranchiseBillingManager] loadFinancialSection error:', e);
      this.showError('データの読み込みに失敗しました');
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * 紹介料履歴のみ再読み込み（月変更時）
   */
  loadReferralHistory: async function(month) {
    if (!this.merchantId) return;

    this.selectedMonth = month;
    this.showLoading(true);

    try {
      const result = await this.callApi('billing_getReferralHistory', {
        merchantId: this.merchantId,
        month: month
      });

      if (result.success) {
        this.cache.referralHistory = result.history;
        this.updateReferralHistoryTable(result.history);
      }
    } catch (e) {
      console.error('[FranchiseBillingManager] loadReferralHistory error:', e);
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * サマリーカード更新
   */
  updateSummaryCards: function(summary) {
    const now = new Date();
    const monthLabel = (now.getMonth() + 1) + '月';

    // 紹介料
    this.updateElement('referralFeeMonth', monthLabel + '紹介料');
    this.updateElement('referralFeeAmount', this.formatCurrency(summary.monthlyReferral));
    this.updateElement('referralFeeCases', `案件${summary.monthlyReferralCount}件分`);

    // 成約手数料
    this.updateElement('commissionMonth', monthLabel + '成約手数料');
    this.updateElement('commissionAmount', this.formatCurrency(summary.monthlyCommission));
    this.updateElement('commissionCases', `成約${summary.monthlyCommissionCount}件分`);

    // 累計利益
    this.updateElement('profitAmount', this.formatCurrency(summary.yearlyProfit));
    this.updateElement('profitPeriod', now.getFullYear() + '年度');

    // ROI
    this.updateElement('roiValue', summary.roi + '%');
  },

  /**
   * 紹介料履歴テーブル更新（スマホファースト）
   */
  updateReferralHistoryTable: function(history) {
    const container = document.getElementById('purchaseTab');
    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-sm">この期間の紹介料データがありません</p>
        </div>
      `;
      return;
    }

    // スマホ用カードリスト
    const mobileCards = history.map(item => this.createMobileCard(item)).join('');

    // PC用テーブル
    const pcTable = this.createPcTable(history);

    container.innerHTML = `
      <!-- 月選択 -->
      <div class="flex items-center justify-between mb-4 px-1">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">デポジット残高:</span>
          <span class="font-bold text-green-600">${this.formatCurrency(this.calculateDeposit(history))}</span>
          <span class="text-xs text-gray-400">(${history.length}件分)</span>
        </div>
        <div class="flex items-center gap-2">
          <input type="month" id="referralMonthPicker" value="${this.selectedMonth}"
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onchange="FranchiseBillingManager.loadReferralHistory(this.value)">
        </div>
      </div>

      <!-- 支払条件 -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
        <span class="font-medium text-blue-800">支払条件:</span>
        <span class="text-blue-700">月末締め</span>
        <span class="ml-4 text-blue-600">振込: 翌月15日 / 口座引落: 翌月27日（土日祝は翌営業日）</span>
      </div>

      <!-- スマホ用カードリスト -->
      <div class="md:hidden space-y-3">
        ${mobileCards}
      </div>

      <!-- PC用テーブル -->
      <div class="hidden md:block overflow-x-auto">
        ${pcTable}
      </div>
    `;
  },

  /**
   * スマホ用カード生成
   */
  createMobileCard: function(item) {
    const statusStyle = this.getStatusStyle(item.paymentStatus);
    const hasContract = item.contractAmount && item.contractAmount > 0;

    return `
      <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:bg-gray-50 transition-colors">
        <!-- ヘッダー行 -->
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="font-semibold text-gray-900">${item.cvId}</div>
            <div class="text-xs text-gray-500 mt-0.5">${item.referralDate}</div>
          </div>
          <span class="px-2.5 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}">
            ${item.paymentStatus}
          </span>
        </div>

        <!-- 案件情報 -->
        <div class="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span class="text-gray-500">顧客:</span>
            <span class="ml-1 text-gray-900">${item.customerName}</span>
          </div>
          <div>
            <span class="text-gray-500">物件:</span>
            <span class="ml-1 text-gray-900">${item.propertyType || '-'}</span>
          </div>
          <div class="col-span-2">
            <span class="text-gray-500">工事:</span>
            <span class="ml-1 text-gray-900">${item.workContent || '-'}</span>
          </div>
        </div>

        <!-- 金額行 -->
        <div class="flex justify-between items-center pt-3 border-t border-gray-100">
          <div>
            <div class="text-xs text-gray-500">紹介料</div>
            <div class="text-lg font-bold text-gray-900">${this.formatCurrency(item.referralFee)}</div>
          </div>
          ${hasContract ? `
            <div class="text-right">
              <div class="text-xs text-gray-500">成約額/ROI</div>
              <div class="text-sm font-medium text-green-600">${this.formatCurrency(item.contractAmount)}</div>
              <div class="text-xs font-bold text-green-500">${item.roi}%</div>
            </div>
          ` : `
            <div class="text-right">
              <div class="text-xs text-gray-500">支払予定</div>
              <div class="text-sm text-gray-700">${item.paymentDue || '-'}</div>
            </div>
          `}
        </div>

        <!-- 詳細ボタン -->
        <div class="mt-3 pt-3 border-t border-gray-100">
          <button onclick="FranchiseBillingManager.showDetail('${item.cvId}')"
            class="w-full py-2 text-sm text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors">
            詳細を見る
          </button>
        </div>
      </div>
    `;
  },

  /**
   * PC用テーブル生成
   */
  createPcTable: function(history) {
    const rows = history.map(item => {
      const statusStyle = this.getStatusStyle(item.paymentStatus);
      const hasContract = item.contractAmount && item.contractAmount > 0;

      return `
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${item.referralDate}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">${item.cvId}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${item.customerName}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${item.propertyType || '-'}</td>
          <td class="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">${item.workContent || '-'}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">${this.formatCurrency(item.referralFee)}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">${item.paymentDue || '-'}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}">
              ${item.paymentStatus}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">
            ${hasContract ? `
              <div class="text-green-600 font-medium">${this.formatCurrency(item.contractAmount)}</div>
              <div class="text-xs text-green-500">${item.roi}%</div>
            ` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm">
            <button onclick="FranchiseBillingManager.showDetail('${item.cvId}')"
              class="text-blue-600 hover:text-blue-800 font-medium">
              詳細
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">紹介日</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">案件ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客名</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">物件種別</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工事内容</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">紹介料</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支払予定日</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支払状況</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成約額/ROI</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">詳細</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${rows}
        </tbody>
      </table>
    `;
  },

  /**
   * ステータスのスタイルを取得
   */
  getStatusStyle: function(status) {
    const styles = {
      '入金済み': { bg: 'bg-green-100', text: 'text-green-700' },
      '支払済': { bg: 'bg-green-100', text: 'text-green-700' },
      '請求待ち': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      '未入金': { bg: 'bg-orange-100', text: 'text-orange-700' },
      '督促中': { bg: 'bg-red-100', text: 'text-red-700' },
      '発行済み': { bg: 'bg-blue-100', text: 'text-blue-700' }
    };
    return styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  },

  /**
   * デポジット残高計算
   */
  calculateDeposit: function(history) {
    return history.reduce((sum, item) => {
      if (item.paymentStatus !== '入金済み' && item.paymentStatus !== '支払済') {
        return sum + (item.referralFee || 0);
      }
      return sum;
    }, 0);
  },

  /**
   * 案件詳細表示
   */
  showDetail: function(cvId) {
    const item = this.cache.referralHistory?.find(h => h.cvId === cvId);
    if (!item) return;

    // モーダル表示（簡易版）
    alert(`案件詳細: ${cvId}\n\n顧客: ${item.customerName}\n物件: ${item.propertyType}\n工事: ${item.workContent}\n紹介料: ${this.formatCurrency(item.referralFee)}\nステータス: ${item.paymentStatus}`);
  },

  /**
   * ローディング表示
   */
  showLoading: function(show) {
    const loader = document.getElementById('billingLoader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  },

  /**
   * エラー表示
   */
  showError: function(message) {
    const container = document.getElementById('purchaseTab');
    if (container) {
      container.innerHTML = `
        <div class="p-8 text-center">
          <svg class="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-red-600 font-medium">${message}</p>
          <button onclick="FranchiseBillingManager.loadFinancialSection()"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            再読み込み
          </button>
        </div>
      `;
    }
  },

  /**
   * デモデータ表示
   */
  showDemoData: function() {
    console.log('[FranchiseBillingManager] デモデータ表示');
    // 既存のHTML内のデモデータをそのまま表示
  },

  /**
   * 要素のテキスト更新（存在チェック付き）
   */
  updateElement: function(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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
