/**
 * Dashboard API Integration
 */

// GAS API Endpoint - franchise-register project (最新版)
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbyzg4ya3UOGalQIFysktGqvnLnyLzmjO662a690cp67kSG9ot7anbJYHtbi0Re5vw5oXg/exec';
const GAS_URL = GAS_API_URL; // 互換性のためのエイリアス

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

        // デバッグ用：URLを確認
        console.log('🔍 GAS API Request URL:', script.src);

        // エラーハンドリング追加
        script.onerror = function() {
            console.error('❌ Failed to load GAS script');
            clearTimeout(timeout);
            delete window[callbackName];
            resolve(defaultData);
        };

        // タイムアウト設定（30秒に延長 - GASが遅い場合があるため）
        timeout = setTimeout(() => {
            if (window[callbackName]) {
                console.warn('⏱️ Request timeout after 30 seconds - 前回のデータを保持');
                console.warn('URL was:', script.src);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                // タイムアウトしても前回のデータを保持（0件にしない）
                // resolveしないことで、Promise が永続的に pending になるのを避ける
                resolve(null); // nullを返すことで、呼び出し元で前回のデータを保持
            }
        }, 30000);

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

        // タイムアウト処理（10秒待つ）
        setTimeout(() => {
            if (!resolved && window[callbackName]) {
                delete window[callbackName];
                if (scriptElement && scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
                reject(new Error('Request timeout'));
            }
        }, 10000);

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
    console.log('📤 承認リクエスト送信 - ID:', registrationId);

    return new Promise((resolve) => {
        const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        let scriptElement = null;
        let timeout;

        // グローバルコールバック関数を定義
        window[callbackName] = function(response) {
            console.log('📥 GAS応答受信:', response);
            clearTimeout(timeout);
            delete window[callbackName];
            if (scriptElement && scriptElement.parentNode) {
                scriptElement.parentNode.removeChild(scriptElement);
            }

            // レスポンスが存在しない場合のエラー処理
            if (!response) {
                console.error('⚠️ GASからのレスポンスが空です');
                resolve({ success: false, message: 'レスポンスが空です' });
                return;
            }

            resolve(response);
        };

        // URLパラメータを構築
        const params = new URLSearchParams({
            action: 'approveRegistration',
            registrationId: registrationId,
            approver: approver,
            callback: callbackName
        });

        // スクリプトタグを作成して追加
        const url = `${GAS_API_URL}?${params.toString()}`;
        console.log('🔗 承認URL:', url);
        scriptElement = document.createElement('script');
        scriptElement.src = url;

        // タイムアウト処理（30秒待つ - GASが遅い場合があるため）
        timeout = setTimeout(() => {
            if (window[callbackName]) {
                console.warn('⏱️ 承認リクエストタイムアウト (30秒)');
                delete window[callbackName];
                if (scriptElement && scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
                resolve({ success: false, message: 'Request timeout after 30 seconds' });
            }
        }, 30000);

        document.body.appendChild(scriptElement);
    });
}

/**
 * 申請を却下
 * @param {string} registrationId - 登録ID
 * @param {string} reason - 却下理由
 * @param {string} rejector - 却下者名
 * @returns {Promise<Object>} 処理結果
 */
async function rejectRegistration(registrationId, reason = '', rejector = '管理者') {
    return new Promise((resolve) => {
        const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        let scriptElement = null;
        let timeout;

        // グローバルコールバック関数を定義
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            delete window[callbackName];
            if (scriptElement && scriptElement.parentNode) {
                scriptElement.parentNode.removeChild(scriptElement);
            }
            resolve(response);
        };

        // URLパラメータを構築
        const params = new URLSearchParams({
            action: 'rejectRegistration',
            registrationId: registrationId,
            reason: reason,
            rejector: rejector,
            callback: callbackName
        });

        // スクリプトタグを作成して追加
        scriptElement = document.createElement('script');
        scriptElement.src = `${GAS_API_URL}?${params.toString()}`;

        // タイムアウト処理（30秒待つ - GASが遅い場合があるため）
        timeout = setTimeout(() => {
            if (window[callbackName]) {
                console.warn('⏱️ 却下リクエストタイムアウト (30秒)');
                delete window[callbackName];
                if (scriptElement && scriptElement.parentNode) {
                    scriptElement.parentNode.removeChild(scriptElement);
                }
                resolve({ success: false, message: 'Request timeout after 30 seconds' });
            }
        }, 30000);

        document.body.appendChild(scriptElement);
    });
}

// directPost関数は削除（JSONPで処理するため不要）

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

        if (result && result.success) {
            alert('承認処理が完了しました');
            await refreshDashboard();
        } else {
            alert('承認処理に失敗しました: ' + (result ? result.message || 'エラー' : 'レスポンスなし'));
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

        // nullが返された場合（タイムアウト）は、データを更新しない
        if (data === null) {
            console.log('📊 タイムアウトのため、前回のデータを保持します');
            return;
        }

        // データを保存（詳細表示用）
        window.lastRegistrationData = data;

        if (data.stats) {
            updateDashboardStats(data.stats);
        }

        if (data.pending) {
            updateRegistrationTable(data.pending, 'pending-table');
        }

        // 審査済み履歴（承認済み＋却下）
        if (data.approved || data.rejected) {
            console.log('📊 審査済みデータ - 承認:', data.approved?.length || 0, '件, 却下:', data.rejected?.length || 0, '件');

            // 承認済みと却下を審査済み履歴として統合表示
            const historyData = [...(data.approved || []), ...(data.rejected || [])];
            console.log('📊 統合データ:', historyData.length, '件');

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

    // 定期的な自動更新（60秒ごとに変更 - 頻繁すぎる更新を防ぐ）
    setInterval(() => {
        if (window.location.hash === '#registrationRequests') {
            console.log('🔄 自動更新実行');
            refreshDashboard();
        }
    }, 60000);
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

// データを保存しておく（refreshDashboard関数を上書きしない）
window.lastRegistrationData = null;

// グローバルに公開（即座に実行）
(function() {
    window.dashboardAPI = {
        fetchRegistrationRequests,
        approveRegistration,
        rejectRegistration,
        refreshDashboard,
        handleApprove,
        handleReject,
        showRegistrationDetail,
        closeRegistrationDetail,
        handleApproveFromModal,
        handleRejectFromModal
    };

    // 直接グローバル関数として公開（HTML内のonclickで使用するため）
    window.handleApprove = handleApprove;
    window.handleReject = handleReject;
    window.showRegistrationDetail = showRegistrationDetail;
    window.closeRegistrationDetail = closeRegistrationDetail;
    window.handleApproveFromModal = handleApproveFromModal;
    window.handleRejectFromModal = handleRejectFromModal;
    window.refreshDashboard = refreshDashboard;
})();

/**
 * GAS接続テスト関数
 */
async function testGASConnection() {
    console.log('🔄 Testing GAS connection...');
    const testUrl = `${GAS_API_URL}?action=getRegistrationRequests&callback=testCallback`;
    console.log('Test URL:', testUrl);

    try {
        // 直接fetchでテスト（CORS エラーが予想される）
        const response = await fetch(testUrl, {mode: 'no-cors'});
        console.log('Fetch response:', response);
    } catch(e) {
        console.log('Expected CORS error:', e.message);
    }

    // JSONPでテスト
    const data = await fetchRegistrationRequests('all', 30);
    console.log('JSONP response:', data);
    return data;
}

// テスト実行
if (typeof window !== 'undefined') {
    window.testGAS = testGASConnection;
}

/**
 * 加盟店管理データを取得
 * @param {string} status - ステータスフィルタ（all, active, inactive等）
 * @return {Promise} データ取得のPromise
 */
async function loadFranchiseManagementData(status = 'all') {
    const timestamp = new Date().getTime();
    const callbackName = 'handleFranchiseData_' + timestamp;

    return new Promise((resolve, reject) => {
        window[callbackName] = function(response) {
            console.log('加盟店管理データ取得レスポンス:', response);
            delete window[callbackName];

            if (response.success) {
                resolve(response);
            } else {
                reject(new Error(response.message || '加盟店データ取得に失敗しました'));
            }
        };

        const script = document.createElement('script');
        script.src = `${GAS_URL}?action=getFranchiseManagementData&status=${status}&callback=${callbackName}&_t=${timestamp}`;
        script.onerror = () => {
            delete window[callbackName];
            reject(new Error('通信エラーが発生しました'));
        };

        document.body.appendChild(script);
        setTimeout(() => {
            document.body.removeChild(script);
        }, 30000);
    });
}

/**
 * 加盟店ステータスを更新
 * @param {string} franchiseId - 加盟店ID
 * @param {string} newStatus - 新しいステータス
 * @return {Promise} 更新結果のPromise
 */
async function updateFranchiseStatusAPI(franchiseId, newStatus) {
    const timestamp = new Date().getTime();
    const callbackName = 'handleStatusUpdate_' + timestamp;

    return new Promise((resolve, reject) => {
        window[callbackName] = function(response) {
            delete window[callbackName];

            if (response.success) {
                resolve(response);
            } else {
                reject(new Error(response.message || 'ステータス更新に失敗しました'));
            }
        };

        const script = document.createElement('script');
        script.src = `${GAS_URL}?action=updateFranchiseManagementStatus&franchiseId=${franchiseId}&status=${newStatus}&updatedBy=管理者&callback=${callbackName}&_t=${timestamp}`;
        script.onerror = () => {
            delete window[callbackName];
            reject(new Error('通信エラーが発生しました'));
        };

        document.body.appendChild(script);
        setTimeout(() => {
            document.body.removeChild(script);
        }, 30000);
    });
}

// Export franchise management functions
window.loadFranchiseManagementData = loadFranchiseManagementData;
window.updateFranchiseStatusAPI = updateFranchiseStatusAPI;
