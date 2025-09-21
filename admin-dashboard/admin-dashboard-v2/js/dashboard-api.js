/**
 * Dashboard API Integration
 */

// GAS API Endpoint - franchise-register project (最新版)
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzKTN5sGnT7kFY3SB42fFEaTD6gnawsKkJWbnP6HLAIDZbyricKF50IGKFWZ8gkBPVsKA/exec';

/**
 * 加盟店登録申請データを取得
 * @param {string} status - フィルタするステータス（all/pending/approved/rejected）
 * @returns {Promise<Object>} 申請データ
 */
async function fetchRegistrationRequests(status = 'all', daysRange = 30) {
    return new Promise((resolve) => {
        const callbackName = 'jsonpCallback_' + Date.now();
        let timeout;

        // デフォルトデータ
        const defaultData = {
            pending: [],
            approved: [],
            rejected: [],
            stats: {
                pending: 0,
                approved: 0,
                rejected: 0,
                monthlyApproved: 0,
                approvalRate: 0
            }
        };

        // グローバルコールバック関数を最初に定義
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            delete window[callbackName];
            // スクリプトタグをクリーンアップ
            const script = document.querySelector(`script[src*="${callbackName}"]`);
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve(response);
        };

        // スクリプトタグでGASを呼ぶ
        const script = document.createElement('script');
        script.src = `${GAS_API_URL}?action=getRegistrationRequests&status=${status}&limit=100&daysRange=${daysRange}&callback=${callbackName}`;

        // タイムアウト設定（5秒に延長）
        timeout = setTimeout(() => {
            if (window[callbackName]) {
                console.warn('Request timeout, returning default data');
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                resolve(defaultData);
            }
        }, 5000);

        // スクリプトを追加
        document.body.appendChild(script);
    });
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
        let scriptElement = null;
        let resolved = false;

        // グローバルコールバック関数を定義
        window[callbackName] = function(response) {
            resolved = true;
            delete window[callbackName];
            if (scriptElement && scriptElement.parentNode) {
                scriptElement.parentNode.removeChild(scriptElement);
            }
            resolve(response);
        };

        // URLパラメータを直接構築（配列対応）
        const queryParams = [
            `action=${action}`,
            `status=${params.status || 'all'}`,
            `limit=${params.limit || 100}`,
            `callback=${callbackName}`
        ].join('&');

        // スクリプトタグを作成して追加
        scriptElement = document.createElement('script');
        scriptElement.src = `${GAS_API_URL}?${queryParams}`;

        // タイムアウト処理（3秒待つ）
        setTimeout(() => {
            if (!resolved && window[callbackName]) {
                delete window[callbackName];
                if (scriptElement && scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
                reject(new Error('Request timeout'));
            }
        }, 3000);

        // onerrorは設定しない（GASではエラーが誤検知される）
        document.body.appendChild(scriptElement);
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
        // 至急対応の表示制御
        const urgentElement = pendingElement.nextElementSibling;
        if (urgentElement) {
            if (stats.pending > 0) {
                urgentElement.textContent = '至急対応';
                urgentElement.className = 'text-xs text-red-600 mt-1';
            } else {
                urgentElement.textContent = '処理済み';
                urgentElement.className = 'text-xs text-green-600 mt-1';
            }
        }
    }

    // 今月承認数
    const monthlyElement = document.getElementById('monthly-approved');
    if (monthlyElement) {
        monthlyElement.textContent = stats.monthlyApproved + '件';
        // 前月比の計算（仮実装）
        const comparisonElement = monthlyElement.nextElementSibling;
        if (comparisonElement) {
            // TODO: 前月のデータと比較する実装
            comparisonElement.textContent = '前月比 -';
        }
    }

    // 承認率
    const rateElement = document.getElementById('approval-rate');
    if (rateElement) {
        rateElement.textContent = stats.approvalRate + '%';
        // 承認率に応じたステータス表示
        const statusElement = rateElement.nextElementSibling;
        if (statusElement) {
            if (stats.approvalRate >= 80) {
                statusElement.textContent = '高水準';
                statusElement.className = 'text-xs text-green-600 mt-1';
            } else if (stats.approvalRate >= 60) {
                statusElement.textContent = '標準';
                statusElement.className = 'text-xs text-yellow-600 mt-1';
            } else {
                statusElement.textContent = '要改善';
                statusElement.className = 'text-xs text-red-600 mt-1';
            }
        }
    }

    // メニューバッジを更新
    updateMenuBadge(stats.pending);
}

/**
 * メニューバッジを更新
 * @param {number} count - 未審査件数
 */
function updateMenuBadge(count) {
    // IDで直接バッジを取得（サイドバーのメインバッジ）
    const mainBadge = document.getElementById('registrationRequestBadge');
    if (mainBadge) {
        const countSpan = mainBadge.querySelector('.badge-count');
        if (countSpan) {
            countSpan.textContent = count;
        }
        // バッジの表示/非表示
        if (count > 0) {
            mainBadge.style.display = '';
        } else {
            mainBadge.style.display = 'none';
        }
    }

    // その他の既存のregistration-badgeクラスのバッジも更新
    const allBadges = document.querySelectorAll('.registration-badge');
    allBadges.forEach(badge => {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    });
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
                <div class="flex gap-2">
                    ${reg.phone ? `<a href="tel:${reg.phone}" class="text-xl hover:scale-110 transition-transform" title="${reg.phone}">📞</a>` : ''}
                    ${reg.email ? `<a href="mailto:${reg.email}" class="text-xl hover:scale-110 transition-transform" title="${reg.email}">📧</a>` : ''}
                </div>
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

    // モバイル用カード表示も更新
    const mobileId = tableId.replace('-table', '-mobile');
    const mobileContainer = document.getElementById(mobileId);
    if (mobileContainer) {
        updateMobileCards(registrations, mobileContainer);
    }
}

/**
 * モバイル用カード表示を更新
 * @param {Array} registrations - 申請データ配列
 * @param {HTMLElement} container - コンテナ要素
 */
function updateMobileCards(registrations, container) {
    container.innerHTML = '';

    registrations.forEach(reg => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="font-semibold text-gray-900">${reg.companyName || '-'}</div>
                    <div class="text-xs text-gray-500">${reg.registrationId || '-'}</div>
                </div>
                ${renderStatusBadge(reg.status)}
            </div>
            <div class="space-y-2 text-sm">
                <div><span class="text-gray-600">申請日:</span> ${reg.timestamp || '-'}</div>
                <div><span class="text-gray-600">代表者:</span> ${reg.representativeName || '-'}</div>
                <div class="flex items-center gap-3">
                    <span class="text-gray-600">連絡先:</span>
                    ${reg.phone ? `<a href="tel:${reg.phone}" class="text-xl hover:scale-110 transition-transform" title="${reg.phone}">📞</a>` : ''}
                    ${reg.email ? `<a href="mailto:${reg.email}" class="text-xl hover:scale-110 transition-transform" title="${reg.email}">📧</a>` : ''}
                </div>
                <div><span class="text-gray-600">エリア:</span> ${reg.prefectures || '-'}</div>
            </div>
            <div class="mt-4 flex gap-2">
                ${renderActionButtons(reg)}
            </div>
        `;
        container.appendChild(card);
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
    let buttons = `
        <button onclick="showRegistrationDetail('${registration.registrationId}')"
                class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-2">
            詳細
        </button>
    `;

    // ステータスに応じてボタンを表示
    if (registration.status === '承認済み' || registration.status === '承認済') {
        // 承認済みの場合は却下ボタンのみ表示
        buttons += `
            <button onclick="handleReject('${registration.registrationId}')"
                    class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                却下に変更
            </button>
        `;
    } else if (registration.status === '却下' || registration.status === '却下済み') {
        // 却下済みの場合は承認ボタンのみ表示
        buttons += `
            <button onclick="handleApprove('${registration.registrationId}')"
                    class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                承認に変更
            </button>
        `;
    } else {
        // 未審査・申請中の場合は両方表示
        buttons += `
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
    return buttons;
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
        // 期間選択セレクタから値を取得
        const dateRangeSelector = document.getElementById('dateRangeSelector');
        const daysRange = dateRangeSelector ? parseInt(dateRangeSelector.value) : 30;

        const data = await fetchRegistrationRequests('all', daysRange);

        if (data.stats) {
            updateDashboardStats(data.stats);
        }

        if (data.pending) {
            updateRegistrationTable(data.pending, 'pending-table');
        }

        if (data.approved || data.rejected) {
            // 承認済みと却下を審査済み履歴として統合表示
            const historyData = [...(data.approved || []), ...(data.rejected || [])];
            // 日時でソート（新しい順）
            historyData.sort((a, b) => new Date(b.approvalDate || b.timestamp) - new Date(a.approvalDate || a.timestamp));
            updateRegistrationTable(historyData, 'approved-table');
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

/**
 * 登録詳細を表示
 * @param {string} registrationId - 登録ID
 */
function showRegistrationDetail(registrationId) {
    // 現在のデータから該当する登録情報を探す
    const findRegistration = () => {
        const data = window.lastRegistrationData;
        if (!data) return null;

        const allRegistrations = [
            ...(data.pending || []),
            ...(data.approved || []),
            ...(data.rejected || [])
        ];

        return allRegistrations.find(reg => reg.registrationId === registrationId);
    };

    const registration = findRegistration();
    if (!registration) {
        alert('登録情報が見つかりません');
        return;
    }

    // モーダルHTMLを作成
    const modalHTML = `
        <div id="registrationDetailModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900 mb-1">🆕 加盟店登録申請詳細</h2>
                            <p class="text-sm text-gray-600">登録ID: ${registration.registrationId}</p>
                        </div>
                        <button onclick="closeRegistrationDetail()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="p-6 space-y-6">
                    <!-- 基本情報 -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3">基本情報</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-600">会社名</label>
                                <p class="mt-1 text-gray-900">${registration.companyName || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">会社名（カナ）</label>
                                <p class="mt-1 text-gray-900">${registration.companyNameKana || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">代表者名</label>
                                <p class="mt-1 text-gray-900">${registration.representativeName || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">代表者名（カナ）</label>
                                <p class="mt-1 text-gray-900">${registration.representativeNameKana || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">電話番号</label>
                                <p class="mt-1">
                                    ${registration.phone ?
                                        `<a href="tel:${registration.phone}" class="text-blue-600 hover:underline">${registration.phone}</a>` :
                                        '-'}
                                </p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">メールアドレス</label>
                                <p class="mt-1">
                                    ${registration.email ?
                                        `<a href="mailto:${registration.email}" class="text-blue-600 hover:underline">${registration.email}</a>` :
                                        '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 営業担当者情報 -->
                    ${registration.salesPerson ? `
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3">営業担当者情報</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-600">営業担当者名</label>
                                <p class="mt-1 text-gray-900">${registration.salesPerson || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">営業担当者電話番号</label>
                                <p class="mt-1">
                                    ${registration.salesPersonPhone ?
                                        `<a href="tel:${registration.salesPersonPhone}" class="text-blue-600 hover:underline">${registration.salesPersonPhone}</a>` :
                                        '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- 住所情報 -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3">住所情報</h3>
                        <div class="grid grid-cols-1 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-600">住所</label>
                                <p class="mt-1 text-gray-900">${registration.address || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- 対応エリア・条件 -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3">対応エリア・条件</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-600">対応都道府県</label>
                                <p class="mt-1 text-gray-900">${registration.prefectures || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">築年数対応範囲</label>
                                <p class="mt-1 text-gray-900">${registration.buildingAgeRange || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- ステータス情報 -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3">ステータス情報</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-gray-600">申請日時</label>
                                <p class="mt-1 text-gray-900">${registration.timestamp || '-'}</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-gray-600">ステータス</label>
                                <div class="mt-1">${renderStatusBadge(registration.status)}</div>
                            </div>
                            ${registration.approvalDate ? `
                            <div>
                                <label class="text-sm font-medium text-gray-600">承認日時</label>
                                <p class="mt-1 text-gray-900">${registration.approvalDate}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- アクションボタン -->
                <div class="p-6 border-t bg-gray-50 flex justify-between">
                    <button onclick="closeRegistrationDetail()" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                        閉じる
                    </button>
                    <div class="space-x-2">
                        ${(registration.status === '承認済み' || registration.status === '承認済') ? `
                            <button onclick="handleRejectFromModal('${registration.registrationId}')"
                                    class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                                却下に変更
                            </button>
                        ` : (registration.status === '却下' || registration.status === '却下済み') ? `
                            <button onclick="handleApproveFromModal('${registration.registrationId}')"
                                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                                承認に変更
                            </button>
                        ` : `
                            <button onclick="handleApproveFromModal('${registration.registrationId}')"
                                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                                承認する
                            </button>
                            <button onclick="handleRejectFromModal('${registration.registrationId}')"
                                    class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                                却下する
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;

    // モーダルを表示
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * 詳細モーダルを閉じる
 */
function closeRegistrationDetail() {
    const modal = document.getElementById('registrationDetailModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * モーダルから承認処理
 */
async function handleApproveFromModal(registrationId) {
    closeRegistrationDetail();
    await handleApprove(registrationId);
}

/**
 * モーダルから却下処理
 */
async function handleRejectFromModal(registrationId) {
    closeRegistrationDetail();
    await handleReject(registrationId);
}

// データを保存しておく
let originalRefreshDashboard = refreshDashboard;
refreshDashboard = async function() {
    const data = await fetchRegistrationRequests('all');
    window.lastRegistrationData = data; // データを保存

    if (data.stats) {
        updateDashboardStats(data.stats);
    }
    if (data.pending) {
        updateRegistrationTable(data.pending, 'pending-table');
    }
    if (data.approved) {
        updateRegistrationTable(data.approved, 'approved-table');
    }
};

// グローバルに公開
window.dashboardAPI = {
    fetchRegistrationRequests,
    approveRegistration,
    rejectRegistration,
    refreshDashboard,
    handleApprove,
    handleReject,
    showRegistrationDetail,
    closeRegistrationDetail
};