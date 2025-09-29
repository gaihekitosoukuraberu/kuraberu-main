/**
 * 加盟店登録申請管理モジュール
 * 完全独立実装（他システムに影響しない）
 */

/**
 * 日付フォーマット関数
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '-';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch (e) {
        console.error('Date formatting error:', e);
        return dateStr; // フォーマットできない場合は元の文字列を返す
    }
}

// グローバル変数
let currentRegistrationData = [];
let pendingRequests = [];
let approvedRequests = [];
let rejectedRequests = [];

/**
 * 登録申請データをロード
 */
async function loadRegistrationRequestsData() {
    console.log('[RegistrationRequests] データロード開始');

    // ローディング表示
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }

    try {
        // APIクライアントの初期化確認
        if (!window.apiClient) {
            console.log('[RegistrationRequests] APIクライアント初期化中...');
            if (window.ApiClient && window.ENV) {
                window.apiClient = new ApiClient();
                console.log('[RegistrationRequests] APIクライアント初期化完了');
            } else {
                throw new Error('APIクライアントを初期化できません');
            }
        }

        // fetchRegistrationRequests関数が存在する場合は使用
        let result;
        if (typeof fetchRegistrationRequests === 'function') {
            console.log('[RegistrationRequests] fetchRegistrationRequestsを使用');
            result = await fetchRegistrationRequests('all');
        } else {
            console.log('[RegistrationRequests] 直接API呼び出し');
            result = await window.apiClient.jsonpRequest('getRegistrationRequests', {
                status: 'all',
                limit: 100
            });
        }

        console.log('[RegistrationRequests] APIレスポンス:', result);

        // データ構造をデバッグ
        if (result && result.data && result.data.length > 0) {
            console.log('[DEBUG] サンプルデータ:', result.data[0]);
        }

        if (result && result.success !== false) {
            // データを保存
            currentRegistrationData = result.data || [];
            pendingRequests = result.pending || [];
            approvedRequests = result.approved || [];
            rejectedRequests = result.rejected || [];

            // 統計情報を更新
            if (result.stats) {
                updateRegistrationStats(result.stats);
            }

            // テーブルを更新
            updatePendingTable(pendingRequests);
            updateApprovedTable(approvedRequests);

            console.log('[RegistrationRequests] データロード完了');
            console.log('  - 全件:', currentRegistrationData.length);
            console.log('  - 未審査:', pendingRequests.length);
            console.log('  - 承認済み:', approvedRequests.length);
            console.log('  - 却下:', rejectedRequests.length);

        } else {
            console.error('[RegistrationRequests] APIエラー:', result?.error || 'Unknown error');
            showNoDataMessage();
        }

    } catch (error) {
        console.error('[RegistrationRequests] エラー:', error);
        showErrorMessage(error.message);

    } finally {
        // ローディング非表示
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * 統計情報を更新
 */
function updateRegistrationStats(stats) {
    console.log('[RegistrationRequests] 統計情報更新:', stats);

    // 未審査申請数
    const pendingCount = document.getElementById('pending-count');
    if (pendingCount) {
        pendingCount.textContent = stats.pending || 0;
    }

    // 今月承認数
    const monthlyApproved = document.getElementById('monthly-approved');
    if (monthlyApproved) {
        monthlyApproved.textContent = stats.monthlyApproved || 0;
    }

    // 承認率
    const approvalRate = document.getElementById('approval-rate');
    if (approvalRate) {
        approvalRate.textContent = `${stats.approvalRate || 0}%`;
    }

    // バッジ更新
    updateRegistrationBadge(stats.pending || 0);
}

/**
 * バッジ更新
 */
function updateRegistrationBadge(count) {
    const badge = document.getElementById('registrationRequestBadge');
    if (badge) {
        if (count > 0) {
            badge.style.display = 'inline-flex';
            const badgeCount = badge.querySelector('.badge-count');
            if (badgeCount) {
                badgeCount.textContent = count;
            }
        } else {
            badge.style.display = 'none';
        }
    }
}

/**
 * 未審査テーブルを更新
 */
function updatePendingTable(data) {
    console.log('[RegistrationRequests] 未審査テーブル更新:', data.length, '件');

    // デスクトップ用テーブル
    const tbody = document.querySelector('#pending-table tbody');
    if (tbody) {
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p class="text-lg font-medium">未審査の申請はありません</p>
                            <p class="text-sm text-gray-400 mt-1">新しい申請が届くとここに表示されます</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            data.forEach(item => {
                console.log('[Pending Table] Processing item:', item);
                const row = createRegistrationRow(item, 'pending');
                tbody.appendChild(row);
            });
        }
    }

    // モバイル用カード
    const mobileContainer = document.getElementById('pending-mobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = '';

        if (data.length === 0) {
            mobileContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p class="text-lg font-medium">未審査の申請はありません</p>
                </div>
            `;
        } else {
            data.forEach(item => {
                const card = createRegistrationCard(item, 'pending');
                mobileContainer.appendChild(card);
            });
        }
    }
}

/**
 * 審査済みテーブルを更新
 */
function updateApprovedTable(data) {
    console.log('[RegistrationRequests] 審査済みテーブル更新:', data.length, '件');

    // デスクトップ用テーブル
    const tbody = document.querySelector('#approved-table tbody');
    if (tbody) {
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                        審査済みの申請はありません
                    </td>
                </tr>
            `;
        } else {
            data.forEach(item => {
                console.log('[Approved Table] Processing item:', item);
                const row = createRegistrationRow(item, 'approved');
                tbody.appendChild(row);
            });
        }
    }

    // モバイル用カード
    const mobileContainer = document.getElementById('approved-mobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = '';

        if (data.length === 0) {
            mobileContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    審査済みの申請はありません
                </div>
            `;
        } else {
            data.forEach(item => {
                const card = createRegistrationCard(item, 'approved');
                mobileContainer.appendChild(card);
            });
        }
    }
}

/**
 * テーブル行を作成
 */
function createRegistrationRow(item, type) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';

    // 日時フォーマット
    const dateStr = item.timestamp ? formatDate(item.timestamp) : '-';

    // エリア表示（最大3件）
    const areas = item.prefecturesArray || [];
    const areaDisplay = areas.slice(0, 3).join(', ') + (areas.length > 3 ? `他${areas.length - 3}件` : '');

    // ステータスバッジ
    const statusBadge = type === 'pending'
        ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">未審査</span>'
        : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">承認済み</span>';

    // アクションボタン
    const actionButtons = type === 'pending'
        ? `<button onclick="viewRegistrationDetails('${item.registrationId}')" class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 mr-2">詳細</button>
           <button onclick="approveRegistration('${item.registrationId}')" class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 mr-2">承認</button>
           <button onclick="rejectRegistration('${item.registrationId}')" class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">却下</button>`
        : `<button onclick="revertRegistration('${item.registrationId}')" class="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600">差し戻し</button>`;

    // デバッグログ - データ構造確認
    console.log('[Registration Row] Item data:', item);

    tr.innerHTML = `
        <td class="px-6 py-4 text-sm text-gray-900">${dateStr}</td>
        <td class="px-6 py-4 text-sm font-medium text-gray-900">${item.companyName || '-'}</td>
        <td class="px-6 py-4 text-sm text-gray-900">${item.representativeName || '-'}</td>
        <td class="px-6 py-4 text-sm text-gray-900">
            ${item.salesPersonPhone || item.phone || '-'}<br>
            <span class="text-xs text-gray-500">${item.salesPersonEmail || item.email || '-'}</span>
        </td>
        <td class="px-6 py-4 text-sm text-gray-900">${areaDisplay || '-'}</td>
        <td class="px-6 py-4">${statusBadge}</td>
        <td class="px-6 py-4 text-sm">
            <div class="flex gap-2">
                ${actionButtons}
            </div>
        </td>
    `;

    return tr;
}

/**
 * モバイル用カードを作成
 */
function createRegistrationCard(item, type) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-lg p-4';

    // 日時フォーマット
    const dateStr = item.timestamp ? formatDate(item.timestamp) : '-';

    // エリア表示
    const areas = item.prefecturesArray || [];
    const areaDisplay = areas.slice(0, 2).join(', ') + (areas.length > 2 ? `他${areas.length - 2}件` : '');

    // ステータスバッジ
    const statusBadge = type === 'pending'
        ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">未審査</span>'
        : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">承認済み</span>';

    div.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-semibold text-gray-900">${item.companyName || '-'}</h4>
                <p class="text-xs text-gray-500 mt-1">${dateStr}</p>
            </div>
            ${statusBadge}
        </div>
        <div class="space-y-2 text-sm">
            <div class="flex">
                <span class="text-gray-500 w-20">代表者:</span>
                <span class="text-gray-900">${item.representativeName || '-'}</span>
            </div>
            <div class="flex">
                <span class="text-gray-500 w-20">電話:</span>
                <span class="text-gray-900">${item.salesPersonPhone || item.phone || '-'}</span>
            </div>
            <div class="flex">
                <span class="text-gray-500 w-20">エリア:</span>
                <span class="text-gray-900">${areaDisplay || '-'}</span>
            </div>
        </div>
        ${type === 'pending' ? `
            <div class="flex gap-2 mt-4">
                <button onclick="viewRegistrationDetails('${item.registrationId}')" class="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                    詳細
                </button>
                <button onclick="approveRegistration('${item.registrationId}')" class="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                    承認
                </button>
                <button onclick="rejectRegistration('${item.registrationId}')" class="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                    却下
                </button>
            </div>
        ` : `
            <button onclick="revertRegistration('${item.registrationId}')" class="w-full mt-4 px-3 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600">
                差し戻し
            </button>
        `}
    `;

    return div;
}

/**
 * エラーメッセージ表示
 */
function showErrorMessage(message) {
    const tbody = document.querySelector('#pending-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-red-500">
                    エラー: ${message}
                </td>
            </tr>
        `;
    }
}

/**
 * データなしメッセージ表示
 */
function showNoDataMessage() {
    const tbody = document.querySelector('#pending-table tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    データがありません
                </td>
            </tr>
        `;
    }
}

/**
 * 承認処理
 */
async function approveRegistration(registrationId) {
    if (!confirm('この申請を承認しますか？')) return;

    try {
        const result = await window.apiClient.postRequest('approveRegistration', {
            registrationId: registrationId
        });

        if (result && result.success) {
            alert('承認しました');
            loadRegistrationRequestsData(); // データ再読み込み
        } else {
            alert('承認に失敗しました: ' + (result?.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('[RegistrationRequests] 承認エラー:', error);
        alert('エラーが発生しました');
    }
}

/**
 * 却下処理
 */
async function rejectRegistration(registrationId) {
    const reason = prompt('却下理由を入力してください：');
    if (!reason) return;

    try {
        const result = await window.apiClient.postRequest('rejectRegistration', {
            registrationId: registrationId,
            reason: reason
        });

        if (result && result.success) {
            alert('却下しました');
            loadRegistrationRequestsData(); // データ再読み込み
        } else {
            alert('却下に失敗しました: ' + (result?.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('[RegistrationRequests] 却下エラー:', error);
        alert('エラーが発生しました');
    }
}

/**
 * 詳細表示モーダル
 */
function viewRegistrationDetails(registrationId) {
    console.log('[RegistrationRequests] 詳細表示:', registrationId);

    // データを検索
    const allData = [...pendingRequests, ...approvedRequests, ...rejectedRequests];
    const item = allData.find(r => r.registrationId === registrationId);

    if (!item) {
        alert('データが見つかりません');
        return;
    }

    // モーダル作成
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

    // エリア表示
    const prefecturesDisplay = (item.prefecturesArray || []).join('、') || '-';
    const citiesDisplay = (item.citiesArray || []).join('、') || '-';
    const priorityAreasDisplay = item.priorityAreas || '-';

    // 物件種別表示
    const propertyTypesDisplay = item.propertyTypes || '-';
    const buildingAgeDisplay = item.buildingAgeRange || '-';

    // 支店情報
    let branchesHTML = '';
    if (item.branches && item.branches.length > 0) {
        branchesHTML = `
            <div class="border-t pt-4">
                <h4 class="font-semibold text-gray-700 mb-2">支店情報</h4>
                ${item.branches.map((branch, idx) => `
                    <div class="bg-gray-50 p-3 rounded mb-2">
                        <div class="text-sm">
                            <div><strong>支店${idx + 1}:</strong> ${branch.name || '-'}</div>
                            <div><strong>住所:</strong> ${branch.address || '-'}</div>
                            <div><strong>電話:</strong> ${branch.phone || '-'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-2xl font-bold">加盟店登録申請詳細</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="space-y-6">
                    <!-- 基本情報 -->
                    <div>
                        <h4 class="font-semibold text-gray-700 mb-3">基本情報</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">登録ID</label>
                                <div class="font-medium">${item.registrationId || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">申請日時</label>
                                <div class="font-medium">${formatDate(item.timestamp)}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">会社名（法人名）</label>
                                <div class="font-medium">${item.companyName || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">会社名（カナ）</label>
                                <div class="font-medium">${item.companyNameKana || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 代表者情報 -->
                    <div class="border-t pt-4">
                        <h4 class="font-semibold text-gray-700 mb-3">代表者情報</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">代表者名</label>
                                <div class="font-medium">${item.representativeName || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">代表者名（カナ）</label>
                                <div class="font-medium">${item.representativeNameKana || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">電話番号</label>
                                <div class="font-medium">${item.phone || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">メールアドレス</label>
                                <div class="font-medium">${item.email || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 営業担当者情報 -->
                    <div class="border-t pt-4">
                        <h4 class="font-semibold text-gray-700 mb-3">営業担当者情報</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">営業担当者名</label>
                                <div class="font-medium">${item.salesPerson || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">営業担当者電話</label>
                                <div class="font-medium">${item.salesPersonPhone || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 住所情報 -->
                    <div class="border-t pt-4">
                        <h4 class="font-semibold text-gray-700 mb-3">住所情報</h4>
                        <div class="grid grid-cols-1 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">住所</label>
                                <div class="font-medium">${item.address || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 対応エリア -->
                    <div class="border-t pt-4">
                        <h4 class="font-semibold text-gray-700 mb-3">対応エリア</h4>
                        <div class="space-y-3">
                            <div>
                                <label class="text-sm text-gray-500">対応都道府県</label>
                                <div class="font-medium">${prefecturesDisplay}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">対応市区町村</label>
                                <div class="font-medium">${citiesDisplay}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">優先エリア</label>
                                <div class="font-medium">${priorityAreasDisplay}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 物件情報 -->
                    <div class="border-t pt-4">
                        <h4 class="font-semibold text-gray-700 mb-3">対応物件情報</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">対応物件種別</label>
                                <div class="font-medium">${propertyTypesDisplay}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">対応建物築年数</label>
                                <div class="font-medium">${buildingAgeDisplay}</div>
                            </div>
                        </div>
                    </div>

                    ${branchesHTML}

                    <!-- ステータス情報 -->
                    <div class="border-t pt-4">
                        <h4 class="font-semibold text-gray-700 mb-3">ステータス</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-gray-500">承認ステータス</label>
                                <div class="font-medium">${item.approvalStatus || '-'}</div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-500">営業ステータス</label>
                                <div class="font-medium">${item.businessStatus || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button onclick="closeModal()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * 差し戻し処理
 */
async function revertRegistration(registrationId) {
    if (!confirm('この申請を未審査に差し戻しますか？')) return;

    try {
        const result = await window.apiClient.postRequest('revertRegistration', {
            registrationId: registrationId,
            status: '申請中'
        });

        if (result && result.success) {
            alert('差し戻しました');
            loadRegistrationRequestsData(); // データ再読み込み
        } else {
            alert('差し戻しに失敗しました: ' + (result?.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('[RegistrationRequests] 差し戻しエラー:', error);
        alert('エラーが発生しました');
    }
}

/**
 * モーダルを閉じる
 */
function closeModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
}

// グローバル関数として公開
window.loadRegistrationRequestsData = loadRegistrationRequestsData;
window.approveRegistration = approveRegistration;
window.rejectRegistration = rejectRegistration;
window.viewRegistrationDetails = viewRegistrationDetails;
window.revertRegistration = revertRegistration;
window.closeModal = closeModal;