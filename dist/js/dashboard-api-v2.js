/**
 * 管理ダッシュボード API v2
 * 新アーキテクチャ対応版
 */

// APIクライアント初期化
let apiClient = null;

// 即座に初期化を試行（DOMContentLoadedを待たない）
function initializeApiClient() {
  try {
    if (window.ApiClient && window.ENV) {
      apiClient = new ApiClient();
      console.log('[Dashboard API v2] APIクライアント初期化完了');
      return true;
    } else {
      console.warn('[Dashboard API v2] ApiClient or ENV not available yet');
      return false;
    }
  } catch (error) {
    console.error('[Dashboard API v2] 初期化エラー:', error);
    return false;
  }
}

// 即座に試行
if (!initializeApiClient()) {
  // 失敗した場合はDOMContentLoadedで再試行
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Dashboard API v2] DOMContentLoaded - API初期化再試行');
    initializeApiClient();
  });
}

// さらにフォールバック：1秒後に再試行
setTimeout(() => {
  if (!apiClient) {
    console.log('[Dashboard API v2] 1秒後のフォールバック初期化');
    initializeApiClient();
  }
}, 1000);

/**
 * 登録申請データ取得
 */
async function fetchRegistrationRequests(status = 'all') {
  try {
    console.log('[fetchRegistrationRequests] Starting with status:', status);

    if (!apiClient) {
      console.error('[fetchRegistrationRequests] APIクライアントが初期化されていません');
      throw new Error('APIクライアントが初期化されていません');
    }

    console.log('[fetchRegistrationRequests] Making API call...');
    const result = await apiClient.jsonpRequest('getRegistrationRequests', {
      status: status,
      limit: 100
    });

    console.log('[fetchRegistrationRequests] Raw API response:', result);

    // レスポンス構造をチェック
    if (result) {
      console.log('[fetchRegistrationRequests] Response keys:', Object.keys(result));
      if (result.data) {
        console.log('[fetchRegistrationRequests] result.data length:', result.data.length);
        console.log('[fetchRegistrationRequests] result.data sample:', result.data.slice(0, 2));
      }
      if (result.pending) {
        console.log('[fetchRegistrationRequests] result.pending length:', result.pending.length);
      }
      if (result.approved) {
        console.log('[fetchRegistrationRequests] result.approved length:', result.approved.length);
      }
      if (result.stats) {
        console.log('[fetchRegistrationRequests] result.stats:', result.stats);
      }
    }

    return result;

  } catch (error) {
    console.error('[fetchRegistrationRequests] Error:', error);
    throw error;
  }
}

/**
 * 加盟店管理データ取得
 */
async function loadFranchiseManagementData(filter = 'all') {
  try {
    console.log('[loadFranchiseManagementData] Starting with filter:', filter);

    if (!apiClient) {
      console.log('[loadFranchiseManagementData] APIクライアントが未初期化、初期化を試行...');
      if (!initializeApiClient()) {
        console.error('[loadFranchiseManagementData] APIクライアント初期化失敗、テストデータを返す');

        // フォールバック：テストデータを返す
        const testFranchiseData = [];
        for (let i = 0; i < 5; i++) {
          testFranchiseData.push({
            id: `TEST_FR${1000 + i}`,
            companyName: `テスト加盟店${i + 1}`,
            area: i % 2 === 0 ? '東京都,神奈川県' : '大阪府,兵庫県',
            contractRate: Math.floor(Math.random() * 30) + 50,
            performance: {
              rate: Math.floor(Math.random() * 40) + 40,
              trend: Math.random() > 0.5 ? '+' : '-',
              trendValue: Math.floor(Math.random() * 10) + 1
            },
            deliveryCount: {
              current: Math.floor(Math.random() * 15) + 1,
              total: Math.floor(Math.random() * 100) + 10,
              unit: `¥${(Math.random() * 5 + 1).toFixed(1)}M`
            },
            handicap: 0,
            status: i === 0 ? 'アクティブ' : '一時停止',
            actions: {
              phone: '0120-000-000',
              slack: true,
              notification: true
            }
          });
        }

        return {
          success: true,
          data: testFranchiseData,
          stats: {
            active: 1,
            paused: testFranchiseData.length - 1,
            silent: 0,
            inactive: 0,
            suspended: 0,
            withdrawn: 0
          }
        };
      }
    }

    const result = await apiClient.jsonpRequest('getFranchiseManagementData', {
      status: filter,
      limit: 100
    });

    console.log('[loadFranchiseManagementData] Raw result:', result);

    if (result && result.success && result.data) {
      console.log('[loadFranchiseManagementData] Success, data length:', result.data.length);
      return {
        success: true,
        data: result.data,
        stats: result.stats || {}
      };
    }

    console.log('[loadFranchiseManagementData] No valid data found, returning empty array');
    return {
      success: true,
      data: [],
      stats: {}
    };

  } catch (error) {
    console.error('加盟店データ取得エラー:', error);
    return {
      success: false,
      data: [],
      error: error.toString()
    };
  }
}

/**
 * 申請承認
 */
async function approveRegistration(registrationId, approver = '管理者') {
  try {
    if (!apiClient) {
      throw new Error('APIクライアントが初期化されていません');
    }

    const result = await apiClient.postRequest('approveRegistration', {
      registrationId: registrationId,
      approver: approver
    });

    return result;

  } catch (error) {
    console.error('Approval error:', error);
    throw error;
  }
}

/**
 * 申請却下
 */
async function rejectRegistration(registrationId, reason = '', rejector = '管理者') {
  try {
    if (!apiClient) {
      throw new Error('APIクライアントが初期化されていません');
    }

    const result = await apiClient.postRequest('rejectRegistration', {
      registrationId: registrationId,
      reason: reason,
      rejector: rejector
    });

    return result;

  } catch (error) {
    console.error('Rejection error:', error);
    throw error;
  }
}

/**
 * ダッシュボード更新
 */
async function refreshDashboard() {
  try {
    console.log('[refreshDashboard] Starting dashboard refresh...');

    // APIクライアント初期化チェック
    if (!apiClient) {
      console.log('[refreshDashboard] APIクライアントが未初期化、初期化を試行...');
      if (!initializeApiClient()) {
        console.error('[refreshDashboard] APIクライアント初期化失敗');

        // フォールバック：テストデータを表示
        const testData = {
          success: true,
          pending: [
            {
              registrationId: 'TEST001',
              companyName: 'テスト会社1',
              representativeName: '山田太郎',
              email: 'test1@example.com',
              phone: '03-1234-5678',
              prefectures: '東京都',
              timestamp: '2025-01-12 10:00',
              status: '未審査',
              approvalStatus: '未審査'
            }
          ],
          approved: [
            {
              registrationId: 'TEST002',
              companyName: 'テスト会社2',
              representativeName: '佐藤花子',
              email: 'test2@example.com',
              phone: '03-8765-4321',
              prefectures: '神奈川県',
              timestamp: '2025-01-11 15:30',
              status: '承認済み',
              approvalStatus: '承認済み'
            },
            {
              registrationId: 'TEST003',
              companyName: 'テスト会社3',
              representativeName: '田中一郎',
              email: 'test3@example.com',
              phone: '03-5555-1234',
              prefectures: '大阪府',
              timestamp: '2025-01-10 14:20',
              status: '承認済み',
              approvalStatus: '承認済み'
            }
          ],
          stats: {
            pending: 1,
            approved: 2,
            monthlyApproved: 2,
            approvalRate: 67
          }
        };

        console.log('[refreshDashboard] フォールバック：テストデータ使用');
        updateDashboardWithData(testData);
        return;
      }
    }

    const data = await fetchRegistrationRequests('all');
    console.log('[refreshDashboard] Received data:', data);
    updateDashboardWithData(data);

  } catch (error) {
    console.error('Failed to refresh dashboard:', error);
    // エラー時はテーブルをクリア
    updateRegistrationTable([], 'pending-table');
    updateRegistrationTable([], 'approved-table');
  }
}

function updateDashboardWithData(data) {
  console.log('[updateDashboardWithData] Starting with data:', data);

  if (data.stats) {
    console.log('[updateDashboardWithData] Updating stats:', data.stats);
    updateDashboardStats(data.stats);
  }

  // データ分類の強化版
  let pendingData = [];
  let approvedData = [];

  // 直接provided的なpending/approvedデータを使用
  if (data.pending && Array.isArray(data.pending)) {
    pendingData = data.pending;
    console.log('[updateDashboardWithData] Using direct pending data:', pendingData.length);
  }

  if (data.approved && Array.isArray(data.approved)) {
    approvedData = data.approved;
    console.log('[updateDashboardWithData] Using direct approved data:', approvedData.length);
  }

  // 全体データから分類（フォールバック）
  if (data.data && Array.isArray(data.data) && data.data.length > 0) {
    console.log('[updateDashboardWithData] Processing all data:', data.data.length, 'items');

    const allItems = data.data;

    // pending/approvedが直接提供されていない場合は全データから分類
    if (pendingData.length === 0 && approvedData.length === 0) {
      console.log('[updateDashboardWithData] Classifying all items...');

      allItems.forEach((item, index) => {
        const status1 = item.status || '';
        const status2 = item.approvalStatus || '';
        const computed = status1 || status2 || '未審査';

        console.log(`[Item ${index}] ID: ${item.registrationId}, status: "${status1}", approvalStatus: "${status2}", computed: "${computed}"`);

        const isPending = computed === '未審査' || computed === '申請中' || computed === '';
        const isApproved = computed === '承認済み';

        if (isPending) {
          pendingData.push(item);
        } else if (isApproved) {
          approvedData.push(item);
        }
      });

      console.log('[updateDashboardWithData] After classification - pending:', pendingData.length, 'approved:', approvedData.length);
    }
  }

  // テーブル更新を必ず実行
  console.log('[updateDashboardWithData] Final data counts - pending:', pendingData.length, 'approved:', approvedData.length);

  updateRegistrationTable(pendingData, 'pending-table');
  updateRegistrationTable(approvedData, 'approved-table');

  // デバッグ用：実際にテーブル要素が存在するかチェック
  const pendingTable = document.querySelector('#pending-table tbody');
  const approvedTable = document.querySelector('#approved-table tbody');
  console.log('[updateDashboardWithData] Table elements found - pending:', !!pendingTable, 'approved:', !!approvedTable);

  if (approvedTable) {
    console.log('[updateDashboardWithData] Approved table current content length:', approvedTable.innerHTML.length);
  }
}

/**
 * 統計更新（既存の関数を使用）
 */
function updateDashboardStats(stats) {
  const pendingElement = document.getElementById('pending-count');
  if (pendingElement) {
    pendingElement.textContent = stats.pending + '件';
  }

  const monthlyElement = document.getElementById('monthly-approved');
  if (monthlyElement) {
    monthlyElement.textContent = stats.monthlyApproved + '件';
  }

  const rateElement = document.getElementById('approval-rate');
  if (rateElement) {
    rateElement.textContent = stats.approvalRate + '%';
  }
}

/**
 * テーブル更新（モバイル対応版）
 */
function updateRegistrationTable(registrations, tableId) {
  console.log(`[updateRegistrationTable] Updating ${tableId} with ${registrations.length} items`);

  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) {
    console.warn(`[updateRegistrationTable] Table body not found for ${tableId}`);
    return;
  }

  tbody.innerHTML = '';

  if (registrations.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="7" class="px-6 py-8 text-center text-gray-500">
        データがありません
      </td>
    `;
    tbody.appendChild(emptyRow);

    // モバイル用カード表示も更新
    const mobileContainerId = tableId.replace('-table', '-mobile');
    updateMobileCards([], mobileContainerId);
    return;
  }

  registrations.forEach(reg => {
    console.log(`[updateRegistrationTable] Processing registration:`, reg);
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-6 py-4 text-sm text-gray-900">${reg.timestamp || '-'}</td>
      <td class="px-6 py-4">
        <div class="text-sm font-medium text-gray-900">${reg.companyName || '-'}</div>
        <div class="text-xs text-gray-500">${reg.registrationId || '-'}</div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${reg.representativeName || '-'}</td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${reg.email || '-'}</div>
        <div class="text-xs text-gray-500">${reg.phone || '-'}</div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900">${reg.prefectures || '-'}</td>
      <td class="px-6 py-4">
        ${renderStatusBadge(reg.status || reg.approvalStatus)}
      </td>
      <td class="px-6 py-4">
        ${renderActionButtons(reg)}
      </td>
    `;
    tbody.appendChild(row);
  });

  // モバイル用カード表示も更新
  const mobileContainerId = tableId.replace('-table', '-mobile');
  updateMobileCards(registrations, mobileContainerId);
}

/**
 * モバイル用カード表示を更新
 * @param {Array} registrations - 申請データ配列
 * @param {string} containerId - カードコンテナのID
 */
function updateMobileCards(registrations, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[updateMobileCards] Container not found: ${containerId}`);
    return;
  }

  console.log(`[updateMobileCards] Updating ${containerId} with ${registrations.length} cards`);

  if (registrations.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-gray-500">データがありません</div>';
    return;
  }

  container.innerHTML = registrations.map(reg => {
    const status = reg.status || reg.approvalStatus || '未審査';
    const isUnreviewed = status === '未審査' || status === '申請中' || !status;

    return `
      <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h4 class="font-medium text-gray-900 text-sm">${reg.companyName || '-'}</h4>
            <p class="text-xs text-gray-500 mt-1">${reg.registrationId || '-'}</p>
          </div>
          <div class="ml-2">
            ${renderStatusBadge(status)}
          </div>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">代表者:</span>
            <span class="text-gray-900">${reg.representativeName || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">メール:</span>
            <span class="text-gray-900 text-xs">${reg.email || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">電話:</span>
            <span class="text-gray-900">${reg.phone || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">エリア:</span>
            <span class="text-gray-900 text-xs">${reg.prefectures || '-'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">申請日:</span>
            <span class="text-gray-900 text-xs">${reg.timestamp || '-'}</span>
          </div>
        </div>

        ${isUnreviewed ? `
          <div class="flex gap-2 mt-4">
            <button onclick="showDetail('${reg.registrationId}')"
                    class="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 whitespace-nowrap">
              詳細
            </button>
            <button onclick="handleApprove('${reg.registrationId}')"
                    class="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 whitespace-nowrap">
              承認
            </button>
            <button onclick="handleReject('${reg.registrationId}')"
                    class="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 whitespace-nowrap">
              却下
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * ステータスバッジ
 */
function renderStatusBadge(status) {
  const statusMap = {
    '未審査': '<span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">未審査</span>',
    '承認済み': '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">承認済み</span>',
    '却下': '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">却下</span>'
  };
  return statusMap[status] || statusMap['未審査'];
}

/**
 * アクションボタン
 */
function renderActionButtons(registration) {
  // ステータスチェック: status または approvalStatus のいずれかが未審査の場合
  const status = registration.status || registration.approvalStatus || '未審査';
  const isUnreviewed = status === '未審査' || status === '申請中' || !status;

  console.log(`[renderActionButtons] ID: ${registration.registrationId}, status: ${registration.status}, approvalStatus: ${registration.approvalStatus}, isUnreviewed: ${isUnreviewed}`);

  if (isUnreviewed) {
    return `
      <div class="flex gap-1">
        <button onclick="showDetail('${registration.registrationId}')"
                class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 whitespace-nowrap">
          詳細
        </button>
        <button onclick="handleApprove('${registration.registrationId}')"
                class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap">
          承認
        </button>
        <button onclick="handleReject('${registration.registrationId}')"
                class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 whitespace-nowrap">
          却下
        </button>
      </div>
    `;
  }
  return '<span class="text-xs text-gray-500">-</span>';
}

/**
 * 承認処理
 */
async function handleApprove(registrationId) {
  if (!confirm(`登録ID: ${registrationId} を承認しますか？`)) {
    return;
  }

  try {
    showLoading();
    const result = await approveRegistration(registrationId);

    if (result.success) {
      alert('承認処理が完了しました');
      await refreshDashboard();
    } else {
      alert('承認処理に失敗しました: ' + (result.message || ''));
    }
  } catch (error) {
    console.error('Approval error:', error);
    alert('承認処理中にエラーが発生しました');
  } finally {
    hideLoading();
  }
}

/**
 * 却下処理
 */
async function handleReject(registrationId) {
  const reason = prompt(`登録ID: ${registrationId} を却下する理由を入力してください（任意）:`);

  if (reason === null) {
    return;
  }

  try {
    showLoading();
    const result = await rejectRegistration(registrationId, reason);

    if (result.success) {
      alert('却下処理が完了しました');
      await refreshDashboard();
    } else {
      alert('却下処理に失敗しました: ' + (result.message || ''));
    }
  } catch (error) {
    console.error('Rejection error:', error);
    alert('却下処理中にエラーが発生しました');
  } finally {
    hideLoading();
  }
}

/**
 * ローディング表示
 */
function showLoading() {
  const loader = document.getElementById('loading-indicator');
  if (loader) {
    loader.style.display = 'block';
  }
}

/**
 * ローディング非表示
 */
function hideLoading() {
  const loader = document.getElementById('loading-indicator');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * 詳細表示
 * @param {string} registrationId - 登録ID
 */
function showDetail(registrationId) {
  // 詳細表示のモーダルまたはページ遷移を実装
  // 現在は簡易的にアラート表示
  alert(`詳細表示: ${registrationId}\n\n詳細表示機能は実装予定です。`);
}

// グローバル公開（互換性維持）
window.dashboardAPI = {
  fetchRegistrationRequests,
  approveRegistration,
  rejectRegistration,
  refreshDashboard,
  handleApprove,
  handleReject,
  showDetail,
  loadFranchiseManagementData,
  updateRegistrationTable,
  updateMobileCards
};

window.loadFranchiseManagementData = loadFranchiseManagementData;
window.refreshDashboard = refreshDashboard;
window.handleApprove = handleApprove;
window.handleReject = handleReject;
window.showDetail = showDetail;