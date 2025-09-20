/**
 * 管理ダッシュボード用API連携
 */

// GAS APIエンドポイント（プロパティから取得するか環境変数を使用）
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycby0vcRBoKHiVVu6Z6EcZ6Vh2FBbDiBLv6OXHzxCXjWhpRZmYaxpU9_zZfme9n8QM8dwBg/exec';

/**
 * 加盟店登録申請データを取得
 * @param {string} status - フィルタするステータス（all/pending/approved/rejected）
 * @returns {Promise<Object>} 申請データ
 */
async function fetchRegistrationRequests(status = 'all') {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            mode: 'no-cors', // CORSエラー回避
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'getRegistrationRequests',
                params: {
                    status: status,
                    limit: 100
                }
            })
        });

        // no-corsモードでは応答本文が取得できないため、JSONPを使用
        return await fetchWithJSONP('getRegistrationRequests', {
            status: status,
            limit: 100
        });

    } catch (error) {
        console.error('Error fetching registration requests:', error);
        throw error;
    }
}

/**
 * JSONP形式でGAS APIを呼び出す
 * @param {string} action - アクション名
 * @param {Object} params - パラメータ
 * @returns {Promise<Object>} レスポンスデータ
 */
function fetchWithJSONP(action, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

        // グローバルコールバック関数を定義
        window[callbackName] = function(response) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(response);
        };

        // URLパラメータを構築
        const urlParams = new URLSearchParams({
            action: action,
            ...params,
            callback: callbackName
        });

        // スクリプトタグを作成して追加
        const script = document.createElement('script');
        script.src = `${GAS_API_URL}?${urlParams.toString()}`;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('Failed to load JSONP'));
        };
        document.body.appendChild(script);
    });
}

/**
 * 申請を承認
 * @param {string} registrationId - 登録ID
 * @param {string} approver - 承認者名
 * @returns {Promise<Object>} 処理結果
 */
async function approveRegistration(registrationId, approver = '管理者') {
    try {
        const formData = new FormData();
        formData.append('action', 'approveRegistration');
        formData.append('registrationId', registrationId);
        formData.append('approver', approver);

        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Error approving registration:', error);

        // フォールバック: 直接POSTを試みる
        return await directPost({
            action: 'approveRegistration',
            registrationId: registrationId,
            approver: approver
        });
    }
}

/**
 * 申請を却下
 * @param {string} registrationId - 登録ID
 * @param {string} reason - 却下理由
 * @param {string} rejector - 却下者名
 * @returns {Promise<Object>} 処理結果
 */
async function rejectRegistration(registrationId, reason = '', rejector = '管理者') {
    try {
        const formData = new FormData();
        formData.append('action', 'rejectRegistration');
        formData.append('registrationId', registrationId);
        formData.append('reason', reason);
        formData.append('rejector', rejector);

        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('Error rejecting registration:', error);

        // フォールバック: 直接POSTを試みる
        return await directPost({
            action: 'rejectRegistration',
            registrationId: registrationId,
            reason: reason,
            rejector: rejector
        });
    }
}

/**
 * 直接POST送信（CORSエラー回避用）
 * @param {Object} data - 送信データ
 * @returns {Promise<Object>} レスポンス
 */
async function directPost(data) {
    return new Promise((resolve, reject) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GAS_API_URL;
        form.target = 'hiddenFrame';
        form.style.display = 'none';

        // データをフォームフィールドとして追加
        Object.keys(data).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
            form.appendChild(input);
        });

        // 隠しiframeを作成
        const iframe = document.createElement('iframe');
        iframe.name = 'hiddenFrame';
        iframe.style.display = 'none';

        // iframeの読み込み完了を監視
        iframe.onload = function() {
            setTimeout(() => {
                document.body.removeChild(form);
                document.body.removeChild(iframe);
                resolve({ success: true, message: '処理を実行しました' });
            }, 1000);
        };

        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
    });
}

/**
 * 統計データを更新
 * @param {Object} stats - 統計データ
 */
function updateDashboardStats(stats) {
    // 未審査申請数
    const pendingElement = document.getElementById('pending-count');
    if (pendingElement) {
        pendingElement.textContent = stats.pending + '件';
    }

    // 今月承認数
    const monthlyElement = document.getElementById('monthly-approved');
    if (monthlyElement) {
        monthlyElement.textContent = stats.monthlyApproved + '件';
    }

    // 承認率
    const rateElement = document.getElementById('approval-rate');
    if (rateElement) {
        rateElement.textContent = stats.approvalRate + '%';
    }
}

/**
 * 申請テーブルを更新
 * @param {Array} registrations - 申請データ配列
 * @param {string} tableId - テーブル要素のID
 */
function updateRegistrationTable(registrations, tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    tbody.innerHTML = '';

    registrations.forEach(reg => {
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
                ${renderStatusBadge(reg.status)}
            </td>
            <td class="px-6 py-4">
                ${renderActionButtons(reg)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * ステータスバッジをレンダリング
 * @param {string} status - ステータス
 * @returns {string} HTMLテキスト
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
 * アクションボタンをレンダリング
 * @param {Object} registration - 申請データ
 * @returns {string} HTMLテキスト
 */
function renderActionButtons(registration) {
    if (registration.status === '未審査' || !registration.status) {
        return `
            <button onclick="handleApprove('${registration.registrationId}')"
                    class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mr-2">
                承認
            </button>
            <button onclick="handleReject('${registration.registrationId}')"
                    class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                却下
            </button>
        `;
    }
    return '-';
}

/**
 * 承認処理
 * @param {string} registrationId - 登録ID
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
 * @param {string} registrationId - 登録ID
 */
async function handleReject(registrationId) {
    const reason = prompt(`登録ID: ${registrationId} を却下する理由を入力してください（任意）:`);

    if (reason === null) {
        return; // キャンセル
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
 * ダッシュボードを更新
 */
async function refreshDashboard() {
    try {
        const data = await fetchRegistrationRequests('all');

        if (data.stats) {
            updateDashboardStats(data.stats);
        }

        if (data.pending) {
            updateRegistrationTable(data.pending, 'pending-table');
        }

        if (data.approved) {
            updateRegistrationTable(data.approved, 'approved-table');
        }

    } catch (error) {
        console.error('Failed to refresh dashboard:', error);
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

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
    // ダッシュボードが表示されたら自動的にデータを取得
    if (window.location.hash === '#registrationRequests') {
        refreshDashboard();
    }

    // 定期的な自動更新（30秒ごと）
    setInterval(() => {
        if (window.location.hash === '#registrationRequests') {
            refreshDashboard();
        }
    }, 30000);
});

// グローバルに公開
window.dashboardAPI = {
    fetchRegistrationRequests,
    approveRegistration,
    rejectRegistration,
    refreshDashboard,
    handleApprove,
    handleReject
};