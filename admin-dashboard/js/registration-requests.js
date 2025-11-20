/**
 * 加盟店登録申請管理モジュール
 * 完全独立実装（他システムに影響しない）
 * Version: 2.0 - Fixed display format and modal fields
 */

console.log('[Registration Requests Module] v2.1 loaded - Empty response handling fixed');

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

// ページング関連の変数（名前空間を分離）
let regCurrentPage = 1;
let regItemsPerPage = 10;
let regTotalPages = 1;

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

        // 直接API呼び出し（dashboard-api-v2.jsを削除したため）
        console.log('[RegistrationRequests] 直接API呼び出し');
        const result = await window.apiClient.jsonpRequest('getRegistrationRequests', {
            status: 'all',
            limit: 100
        });

        console.log('[RegistrationRequests] APIレスポンス:', result);

        // データ構造をデバッグ
        if (result && result.data && result.data.length > 0) {
            console.log('[DEBUG] サンプルデータ:', result.data[0]);

            // データマッピング強化（フロントエンド側で処理）
            result.data = result.data.map(item => {
                return {
                    ...item,
                    // 営業担当者情報の補完
                    '営業担当者氏名': item['営業担当者氏名'] || item['営業担当者名'] || item.salesPerson || item.salesPersonName || '',
                    '営業担当者カナ': item['営業担当者カナ'] || item['営業担当者フリガナ'] || item.salesPersonKana || '',
                    '営業担当者電話番号': item['営業担当者電話番号'] || item.salesPersonPhone || '',
                    '営業担当者メールアドレス': item['営業担当者メールアドレス'] || item.salesPersonEmail || '',
                    // 施工情報の補完
                    '対応可能施工内容': item['対応可能施工内容'] || item.constructionCapabilities || '',
                    '施工箇所': item['施工箇所'] || item.constructionLocation || '',
                    // 特殊対応の補完
                    '特殊対応': item['特殊対応'] || item.specialHandling || '',
                    '特殊対応項目': item['特殊対応項目'] || item.specialHandlingItems || ''
                };
            });
        }

        if (result && result.success !== false) {
            // データマッピング関数
            const enhanceData = (items) => {
                if (!items || !Array.isArray(items)) return [];
                return items.map(item => ({
                    ...item,
                    // 営業担当者情報の補完
                    '営業担当者氏名': item['営業担当者氏名'] || item['営業担当者名'] || item.salesPerson || item.salesPersonName || '',
                    '営業担当者カナ': item['営業担当者カナ'] || item['営業担当者フリガナ'] || item.salesPersonKana || '',
                    '営業担当者電話番号': item['営業担当者電話番号'] || item.salesPersonPhone || '',
                    '営業担当者メールアドレス': item['営業担当者メールアドレス'] || item.salesPersonEmail || '',
                    // 施工情報の補完
                    '対応可能施工内容': item['対応可能施工内容'] || item.constructionCapabilities || '',
                    '施工箇所': item['施工箇所'] || item.constructionLocation || '',
                    // 特殊対応の補完
                    '特殊対応': item['特殊対応'] || item.specialHandling || '',
                    '特殊対応項目': item['特殊対応項目'] || item.specialHandlingItems || ''
                }));
            };

            // データを保存
            currentRegistrationData = enhanceData(result.data) || [];
            pendingRequests = enhanceData(result.pending) || [];
            approvedRequests = enhanceData(result.approved) || [];
            rejectedRequests = enhanceData(result.rejected) || [];

            // 統計情報を計算して更新（全データから計算）
            const stats = calculateRegistrationStats(currentRegistrationData);
            updateRegistrationStats(stats);

            // テーブルを更新
            updatePendingTable(pendingRequests);
            // 審査済みテーブルには承認済みと却下の両方を含める
            const reviewedRequests = [...approvedRequests, ...rejectedRequests];
            updateApprovedTable(reviewedRequests);

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
 * 統計情報を計算
 */
function calculateRegistrationStats(allData) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 前月の年月
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    console.log('[Stats] 統計計算開始:', {
        currentMonth: currentMonth + 1,
        currentYear: currentYear,
        allDataTotal: allData.length
    });

    // 全データから「承認ステータス（AK列）」が「承認済み」のものだけをフィルタ
    const approvedItems = allData.filter(item => {
        const status = item['承認ステータス'] || item.approvalStatus || '';
        const isApproved = status === '承認済み' || status === '承認' || status === 'approved';
        if (isApproved) {
            console.log('[Stats] 承認済みアイテム:', {
                id: item.registrationId,
                status: status,
                registrationDate: item['登録日時']
            });
        }
        return isApproved;
    });

    console.log('[Stats] 承認済み件数（ステータスでフィルタ後）:', approvedItems.length);

    // 今月承認数（タイムスタンプが今月のもの）
    const monthlyApproved = approvedItems.filter(item => {
        // タイムスタンプ、登録日時、承認日など複数のフィールドを確認
        const registrationDate = item['タイムスタンプ'] || item.timestamp || item['登録日時'] || item.registrationDate || item.approvalDate || item['承認日時'];
        if (!registrationDate) {
            console.log('[Stats] 日時なし:', item.registrationId, 'キー:', Object.keys(item).filter(k => k.includes('日') || k.includes('時') || k.includes('タイム')));
            return false;
        }
        const date = new Date(registrationDate);
        const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        console.log('[Stats] 承認済みアイテムの日付チェック:', {
            id: item.registrationId,
            date: registrationDate,
            parsed: date,
            isThisMonth: isThisMonth
        });
        return isThisMonth;
    }).length;

    // 前月承認数
    const lastMonthApproved = approvedItems.filter(item => {
        const registrationDate = item['タイムスタンプ'] || item.timestamp || item['登録日時'] || item.registrationDate || item.approvalDate || item['承認日時'];
        if (!registrationDate) return false;
        const date = new Date(registrationDate);
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;

    // 前月比
    const monthlyChange = monthlyApproved - lastMonthApproved;

    console.log('[Stats] 計算結果:', {
        monthlyApproved: monthlyApproved,
        lastMonthApproved: lastMonthApproved,
        monthlyChange: monthlyChange
    });

    // 承認率（全体）- 承認済みと却下の合計から計算
    const totalApproved = approvedItems.length;
    const totalRejected = allData.filter(item => {
        const status = item['承認ステータス'] || item.approvalStatus || '';
        return status === '却下' || status === '却下済み' || status === 'rejected';
    }).length;
    const total = totalApproved + totalRejected;
    const approvalRate = total > 0 ? Math.round((totalApproved / total) * 100) : 0;

    return {
        pending: pendingRequests.length,
        monthlyApproved: monthlyApproved,
        monthlyChange: monthlyChange,
        approvalRate: approvalRate
    };
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

    // 前月比を更新
    const monthlyChangeElement = monthlyApproved?.parentElement?.querySelector('.text-xs');
    if (monthlyChangeElement) {
        const change = stats.monthlyChange || 0;
        const changeText = change >= 0 ? `+${change}` : change;
        monthlyChangeElement.textContent = `前月比 ${changeText}`;
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

    // ページング計算
    regTotalPages = Math.ceil(data.length / regItemsPerPage) || 1;
    const startIndex = (regCurrentPage - 1) * regItemsPerPage;
    const endIndex = startIndex + regItemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    console.log(`[Paging] ページ ${regCurrentPage}/${regTotalPages}, 表示: ${startIndex + 1}-${Math.min(endIndex, data.length)} of ${data.length}`);

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
            pageData.forEach(item => {
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
            pageData.forEach(item => {
                const card = createRegistrationCard(item, 'pending');
                mobileContainer.appendChild(card);
            });
        }
    }

    // ページング情報を更新
    updatePageInfo();
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
    let statusBadge = '';
    if (type === 'pending') {
        statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">未審査</span>';
    } else {
        // 承認ステータスフィールドを確認
        const approvalStatus = item['承認ステータス'] || item.approvalStatus;
        const status = item['ステータス'] || item.status;

        // 再審査判定：ステータスが「再審査」の場合
        if (status === '再審査') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">再審査</span>';
        }
        // 却下判定：承認ステータスが「却下」または「却下済み」の場合
        else if (approvalStatus === '却下' || approvalStatus === '却下済み' || status === '却下' || status === '却下済み') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">却下</span>';
        } else {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">承認済み</span>';
        }
    }

    // アクションボタン
    const actionButtons = type === 'pending'
        ? `<button onclick="viewRegistrationDetails('${item.registrationId}')" class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 mr-2">詳細</button>
           <button id="approve-btn-${item.registrationId}" onclick="approveRegistration('${item.registrationId}')" class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 mr-2 relative inline-flex items-center justify-center">
               <span class="btn-text">承認</span>
               <span class="btn-spinner hidden absolute inset-0 flex items-center justify-center">
                   <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                       <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
               </span>
           </button>
           <button onclick="rejectRegistration('${item.registrationId}')" class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">却下</button>`
        : `<button onclick="viewRegistrationDetails('${item.registrationId}')" class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 mr-2">詳細</button>
           <button onclick="revertRegistration('${item.registrationId}')" class="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600">差し戻し</button>`;


    // 会社名フィールドの特定と取得
    const companyNameFields = [
        '会社名（法人名）',
        '会社名',
        '法人名',
        'businessName',
        'companyName',
        'company_name',
        'business_name',
        '企業名',
        '店舗名',
        'name'
    ];

    let companyName = '-';
    for (const field of companyNameFields) {
        if (item[field] && item[field] !== '') {  // 空文字列もチェック
            companyName = item[field];
            break;
        }
    }

    // 会社名が空または見つからない場合の対処
    if (companyName === '-' || companyName === '') {
        // PRテキストから会社名を推測（最初の部分を取得）
        if (item.prText) {
            // 「は」の前を会社名として取得
            const match = item.prText.match(/^([^は]+)は/);
            if (match) {
                companyName = match[1];
                console.log('[Registration Row] PRテキストから会社名を取得:', companyName);
            } else {
                // 「は」がない場合は最初の20文字を取得
                companyName = item.prText.substring(0, 20) + '...';
            }
        }
        // それでもダメなら代表者名を使用
        if (companyName === '-' || companyName === '') {
            if (item.representativeName) {
                companyName = item.representativeName + '様';
                console.log('[Registration Row] 代表者名を会社名として使用:', companyName);
            }
        }
    }

    // 見つからない場合は実際のキーをログに出力
    if (companyName === '-') {
        const actualCompanyKeys = Object.keys(item).filter(k =>
            k.toLowerCase().includes('company') ||
            k.toLowerCase().includes('business') ||
            k.includes('会社') ||
            k.includes('法人') ||
            k.includes('企業') ||
            k.includes('店舗') ||
            k.toLowerCase().includes('name')
        );
        console.log('[Registration Row] 会社名が見つかりません。候補キー:', actualCompanyKeys);
        console.log('[Registration Row] 全データ:', JSON.stringify(item, null, 2));
    }

    tr.innerHTML = `
        <td class="px-6 py-4 text-sm text-gray-900">${dateStr}</td>
        <td class="px-6 py-4">
            <div class="text-sm font-medium text-gray-900">${companyName}</div>
            <div class="text-xs text-gray-500 mt-1">ID: ${item.registrationId || '-'}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-900">${item.representativeName || item['代表者名'] || item['担当者名'] || '-'}</td>
        <td class="px-6 py-4 text-sm text-gray-900">${item.phone || item.tel || item['電話番号'] || item.salesPersonPhone || item.contactPhone || '-'}</td>
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
    let statusBadge = '';
    if (type === 'pending') {
        statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">未審査</span>';
    } else {
        // 承認ステータスフィールドを確認
        const approvalStatus = item['承認ステータス'] || item.approvalStatus;
        const status = item['ステータス'] || item.status;

        // 再審査判定：ステータスが「再審査」の場合
        if (status === '再審査') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">再審査</span>';
        }
        // 却下判定：承認ステータスが「却下」または「却下済み」の場合
        else if (approvalStatus === '却下' || approvalStatus === '却下済み' || status === '却下' || status === '却下済み') {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">却下</span>';
        } else {
            statusBadge = '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">承認済み</span>';
        }
    }

    // 会社名フィールドの特定と取得（モバイル用）
    const companyNameFields = [
        '会社名（法人名）',
        '会社名',
        '法人名',
        'businessName',
        'companyName',
        'company_name',
        'business_name',
        '企業名',
        '店舗名',
        'name'
    ];

    let companyName = '-';
    for (const field of companyNameFields) {
        if (item[field] && item[field] !== '') {
            companyName = item[field];
            break;
        }
    }

    // 会社名が空または見つからない場合の対処（モバイル版）
    if (companyName === '-' || companyName === '') {
        if (item.prText) {
            const match = item.prText.match(/^([^は]+)は/);
            if (match) {
                companyName = match[1];
            } else {
                companyName = item.prText.substring(0, 20) + '...';
            }
        }
        if (companyName === '-' || companyName === '') {
            if (item.representativeName) {
                companyName = item.representativeName + '様';
            }
        }
    }

    div.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-semibold text-gray-900">${companyName}</h4>
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
                <span class="text-gray-900">${item.phone || item.salesPersonPhone || '-'}</span>
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
                <button id="approve-btn-mobile-${item.registrationId}" onclick="approveRegistration('${item.registrationId}')" class="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 relative inline-flex items-center justify-center">
                    <span class="btn-text">承認</span>
                    <span class="btn-spinner hidden absolute inset-0 flex items-center justify-center">
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </span>
                </button>
                <button onclick="rejectRegistration('${item.registrationId}')" class="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                    却下
                </button>
            </div>
        ` : `
            <div class="flex gap-2 mt-4">
                <button onclick="viewRegistrationDetails('${item.registrationId}')" class="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                    詳細
                </button>
                <button onclick="revertRegistration('${item.registrationId}')" class="flex-1 px-3 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600">
                    差し戻し
                </button>
            </div>
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
    console.log('[approveRegistration] 開始:', registrationId);

    if (!confirm('この申請を承認しますか？\n\n承認後、初回ログインメールが送信されます。')) return;

    // ローディングスピナーを表示
    const desktopBtn = document.getElementById(`approve-btn-${registrationId}`);
    const mobileBtn = document.getElementById(`approve-btn-mobile-${registrationId}`);

    const buttons = [desktopBtn, mobileBtn].filter(btn => btn !== null);

    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
        const btnText = btn.querySelector('.btn-text');
        const btnSpinner = btn.querySelector('.btn-spinner');
        if (btnText) btnText.classList.add('hidden');
        if (btnSpinner) btnSpinner.classList.remove('hidden');
    });

    try {
        console.log('[approveRegistration] JSONPリクエスト送信中...');
        // JSONP方式でGETリクエスト（POST権限問題を回避）
        const result = await window.apiClient.jsonpRequest('approveRegistration', {
            registrationId: registrationId
        });

        console.log('[approveRegistration] Result:', result);
        console.log('[approveRegistration] Result詳細:', JSON.stringify(result, null, 2));
        console.log('[approveRegistration] result.success:', result?.success);
        console.log('[approveRegistration] result.error:', result?.error);
        console.log('[approveRegistration] resultのタイプ:', typeof result);

        // レスポンスが空オブジェクトの場合は成功とみなす（GAS側の問題を回避）
        if (result && (result.success === true || (typeof result === 'object' && Object.keys(result).length === 0))) {
            alert('承認処理を実行しました。データを再読み込みします。');
            loadRegistrationRequestsData(); // データ再読み込み
        } else if (result && result.success === false) {
            alert('承認に失敗しました: ' + (result?.error || result?.message || 'Unknown error'));
        } else {
            // レスポンスがない、または不正な形式の場合
            alert('承認処理を実行しました。結果を確認するためデータを再読み込みします。');
            console.warn('[approveRegistration] 予期しないレスポンス形式。データ再読み込みして確認します');
            loadRegistrationRequestsData(); // データ再読み込み
        }
    } catch (error) {
        console.error('[RegistrationRequests] 承認エラー:', error);
        alert('エラーが発生しました: ' + error.message);

        // エラー時はボタンを元に戻す
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            const btnText = btn.querySelector('.btn-text');
            const btnSpinner = btn.querySelector('.btn-spinner');
            if (btnText) btnText.classList.remove('hidden');
            if (btnSpinner) btnSpinner.classList.add('hidden');
        });
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

    // デバッグログ - 実際のデータ構造を確認（詳細）
    console.log('[DEBUG] 詳細モーダルデータ:', item);
    console.log('[DEBUG] データキー:', Object.keys(item));
    console.log('[DEBUG] 全フィールド確認:');
    Object.keys(item).forEach(key => {
        console.log(`  ${key}: ${item[key]}`);
    });
    console.log('[DEBUG] 重要フィールド確認:', {
        '会社名カナ': item['会社名カナ'] || item['会社名（カナ）'] || item.companyNameKana || item['会社名（フリガナ）'],
        'メール': item['メールアドレス'] || item.email || item.mail,
        '営業担当者': item['営業担当者氏名'] || item['営業担当者名'] || item.salesPerson,
        '営業担当者カナ': item['営業担当者カナ'] || item.salesPersonKana,
        '対応物件種別': item['対応物件種別'] || item.propertyTypes,
        '築年数': item['対応建物築年数'] || item.buildingAgeRange || item['築年数'],
        '施工内容': item['対応可能施工内容'] || item.constructionCapabilities,
        '施工箇所': item['施工箇所'] || item.constructionLocation,
        '特殊対応': item['特殊対応'] || item.specialHandling,
        '特殊対応項目': item['特殊対応項目'] || item.specialHandlingItems
    });

    // モーダル作成
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

    // エリア表示の準備
    let prefecturesDisplay = '-';
    let citiesDisplay = '-';
    let priorityAreasDisplay = '-';

    // 都道府県の処理
    if (item.prefectures) {
        if (Array.isArray(item.prefectures)) {
            prefecturesDisplay = item.prefectures.join('、');
        } else if (typeof item.prefectures === 'string') {
            prefecturesDisplay = item.prefectures;
        }
    } else if (item.prefecturesArray) {
        prefecturesDisplay = item.prefecturesArray.join('、');
    } else if (item['対応都道府県']) {
        prefecturesDisplay = item['対応都道府県'];
    }

    // 市区町村の処理
    if (item.cities) {
        if (Array.isArray(item.cities)) {
            citiesDisplay = item.cities.join('、');
        } else if (typeof item.cities === 'string') {
            citiesDisplay = item.cities;
        }
    } else if (item.citiesArray) {
        citiesDisplay = item.citiesArray.join('、');
    } else if (item['対応市区町村']) {
        citiesDisplay = item['対応市区町村'];
    }

    // 優先エリアの処理
    priorityAreasDisplay = item.priorityAreas || item.priorityArea || item['優先エリア'] || '-';

    // 物件種別表示の準備
    let propertyTypesDisplay = '-';
    let buildingAgeDisplay = '-';

    // 物件種別の処理
    if (item.propertyTypes) {
        if (Array.isArray(item.propertyTypes)) {
            propertyTypesDisplay = item.propertyTypes.join('、');
        } else if (typeof item.propertyTypes === 'string') {
            propertyTypesDisplay = item.propertyTypes;
        }
    } else if (item.propertyType) {
        propertyTypesDisplay = item.propertyType;
    } else if (item['対応物件種別']) {
        propertyTypesDisplay = item['対応物件種別'];
    }

    // 築年数の処理
    buildingAgeDisplay = item.buildingAgeRange || item.buildingAge || item['対応築年数'] || '-';

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
        <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <!-- ヘッダー -->
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-2xl font-bold mb-2">加盟店登録申請詳細</h3>
                        <div class="flex items-center space-x-4 text-blue-100">
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                ID: ${item.registrationId || '-'}
                            </span>
                            <span class="flex items-center">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                ${formatDate(item.timestamp)}
                            </span>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="text-white/80 hover:text-white transition-colors">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- コンテンツ -->
            <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 120px);">
                <div class="space-y-6">
                    <!-- 基本情報カード -->
                    <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-blue-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">会社情報</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">会社名</label>
                                <div class="mt-1 text-lg font-medium text-gray-900">${(() => {
                                    const fields = ['会社名（法人名）', '会社名', '法人名', 'businessName', 'companyName',
                                                   'company_name', 'business_name', '企業名', '店舗名', 'name'];
                                    for (const field of fields) {
                                        if (item[field] && item[field] !== '') return item[field];
                                    }
                                    if (item.prText) {
                                        const match = item.prText.match(/^([^は]+)は/);
                                        if (match) return match[1];
                                    }
                                    if (item.representativeName && item.representativeName !== '') {
                                        return item.representativeName + '様';
                                    }
                                    return '-';
                                })()}</div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">会社名（カナ）</label>
                                <div class="mt-1 text-lg font-medium text-gray-900">${item['会社名（カナ）'] || item.companyNameKana || item.businessNameKana || item['会社名（フリガナ）'] || item['会社名カナ'] || item.companyKana || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 代表者・連絡先情報カード -->
                    <div class="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-6 shadow-sm border border-indigo-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-indigo-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">連絡先情報</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">代表者名</label>
                                    <div class="mt-1 text-base font-medium text-gray-900">${item.representativeName || item.repName || item['代表者名'] || '-'}</div>
                                    <div class="text-sm text-gray-500">${item.representativeNameKana || item.repNameKana || item['代表者名（フリガナ）'] || ''}</div>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        電話番号
                                    </label>
                                    <div class="mt-1 text-base font-medium text-gray-900">${item.phone || item.tel || item['電話番号'] || ''}</div>
                                </div>
                            </div>
                        </div>

                        <!-- 営業担当者情報（代表者と別の場合） -->
                        ${(item.salesPerson || item.salesPersonName || item['営業担当者名'] || item['営業担当者'] ||
                           item['営業用メールアドレス'] || item.salesEmail ||
                           item.salesPersonEmail || item.salesPersonMail || item['営業担当者メールアドレス']) ? `
                        <div class="mt-6 pt-6 border-t border-indigo-100">
                            <h5 class="text-sm font-bold text-gray-700 mb-3">営業担当者</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs text-gray-500">営業担当者名</label>
                                    <div class="text-sm font-medium text-gray-900">${item.salesPerson || item.salesPersonName || item['営業担当者名'] || item['営業担当者氏名'] || item['営業担当者'] || '-'}</div>
                                    <div class="text-xs text-gray-500 mt-1">${item.salesPersonKana || item['営業担当者カナ'] || item['営業担当者フリガナ'] || ''}</div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-500">営業用メールアドレス</label>
                                    <div class="text-sm font-medium text-gray-900 break-all">${item['営業用メールアドレス'] || item.salesEmail || item.salesPersonEmail || item.salesPersonMail || ''}</div>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <!-- 住所情報カード -->
                    <div class="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 shadow-sm border border-green-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-green-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">所在地</h4>
                        </div>
                        <div class="space-y-2">
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">住所</label>
                                <div class="mt-1 text-base font-medium text-gray-900">${item.address || item.fullAddress || item['住所'] || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 対応エリアカード -->
                    <div class="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 shadow-sm border border-purple-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-purple-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">対応エリア</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">対応都道府県</label>
                                <div class="mt-2 flex flex-wrap gap-2">
                                    ${prefecturesDisplay.split('、').map(pref =>
                                        `<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">${pref}</span>`
                                    ).join('')}
                                </div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">対応市区町村</label>
                                <div class="mt-2 flex flex-wrap gap-2">
                                    ${citiesDisplay !== '-' ? citiesDisplay.split('、').slice(0, 10).map(city =>
                                        `<span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">${city}</span>`
                                    ).join('') + (citiesDisplay.split('、').length > 10 ? `<span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">他${citiesDisplay.split('、').length - 10}件</span>` : '') : '<span class="text-gray-500">-</span>'}
                                </div>
                            </div>
                            <div class="md:col-span-2">
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">優先エリア</label>
                                <div class="mt-1 text-base font-medium text-gray-900 bg-yellow-50 p-3 rounded-lg border border-yellow-200">${priorityAreasDisplay}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 物件情報カード -->
                    <div class="bg-gradient-to-br from-orange-50 to-white rounded-xl p-6 shadow-sm border border-orange-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-orange-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">対応物件情報</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">対応物件種別</label>
                                <div class="mt-1 text-base font-medium text-gray-900">${item['最大対応階数'] || item.maxFloors || propertyTypesDisplay || item['対応可能物件種別'] || item['対応物件種別'] || item.propertyTypes || item.propertyType || item['物件種別'] || ''}</div>
                            </div>
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">対応建物築年数</label>
                                <div class="mt-1 text-base font-medium text-gray-900">${buildingAgeDisplay || item['対応建物築年数'] || item['築年数対応範囲'] || item['築年数'] || item.buildingAgeRange || item.buildingAge || ''}</div>
                            </div>
                        </div>
                    </div>

                    <!-- 対応可能施工内容カード -->
                    ${(item['対応可能施工内容'] || item.constructionCapabilities || item.workTypes || item['施工内容'] || item['施工箇所']) ? `
                    <div class="bg-gradient-to-br from-cyan-50 to-white rounded-xl p-6 shadow-sm border border-cyan-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-cyan-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">対応可能施工内容</h4>
                        </div>
                        <div class="space-y-4">
                            ${item['対応可能施工内容'] ? `
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">施工内容</label>
                                <div class="mt-1 text-base font-medium text-gray-900 whitespace-pre-wrap">${item['対応可能施工内容']}</div>
                            </div>
                            ` : ''}
                            ${item['施工箇所'] ? `
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">施工箇所</label>
                                <div class="mt-1 text-base font-medium text-gray-900">${item['施工箇所']}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    <!-- 特殊対応項目カード -->
                    ${(item['特殊対応'] || item.specialHandling || item.specialCapabilities || item['特殊対応項目']) ? `
                    <div class="bg-gradient-to-br from-pink-50 to-white rounded-xl p-6 shadow-sm border border-pink-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-pink-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">特殊対応項目</h4>
                        </div>
                        <div class="space-y-4">
                            ${item['特殊対応'] ? `
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">特殊対応</label>
                                <div class="mt-1 text-base font-medium text-gray-900 whitespace-pre-wrap">${item['特殊対応']}</div>
                            </div>
                            ` : ''}
                            ${item['特殊対応項目'] ? `
                            <div>
                                <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">特殊対応項目</label>
                                <div class="mt-1 text-base font-medium text-gray-900">${item['特殊対応項目']}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}

                    ${branchesHTML ? `
                    <!-- 支店情報カード -->
                    <div class="bg-gradient-to-br from-teal-50 to-white rounded-xl p-6 shadow-sm border border-teal-100">
                        <div class="flex items-center mb-4">
                            <div class="bg-teal-100 rounded-lg p-2 mr-3">
                                <svg class="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h4 class="text-lg font-bold text-gray-800">支店情報</h4>
                        </div>
                        ${item.branches.map((branch, idx) => `
                            <div class="bg-teal-50/50 rounded-lg p-4 mb-3">
                                <div class="font-semibold text-gray-700 mb-2">支店${idx + 1}</div>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <label class="text-xs text-gray-500">支店名</label>
                                        <div class="font-medium text-gray-900">${branch.name || '-'}</div>
                                    </div>
                                    <div>
                                        <label class="text-xs text-gray-500">住所</label>
                                        <div class="font-medium text-gray-900">${branch.address || '-'}</div>
                                    </div>
                                    <div>
                                        <label class="text-xs text-gray-500">電話</label>
                                        <div class="font-medium text-gray-900">${branch.phone || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>

                <!-- アクションボタン -->
                <div class="mt-8 flex justify-end">
                    <button onclick="closeModal()" class="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
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

/**
 * ページング機能
 */
function updatePageInfo() {
    const currentPageElement = document.getElementById('currentPage');
    const totalPagesElement = document.getElementById('totalPages');

    if (currentPageElement) currentPageElement.textContent = regCurrentPage;
    if (totalPagesElement) totalPagesElement.textContent = regTotalPages;

    // ボタンの有効/無効を設定
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.disabled = regCurrentPage <= 1;
        prevBtn.classList.toggle('opacity-50', regCurrentPage <= 1);
        prevBtn.classList.toggle('cursor-not-allowed', regCurrentPage <= 1);
    }

    if (nextBtn) {
        nextBtn.disabled = regCurrentPage >= regTotalPages;
        nextBtn.classList.toggle('opacity-50', regCurrentPage >= regTotalPages);
        nextBtn.classList.toggle('cursor-not-allowed', regCurrentPage >= regTotalPages);
    }
}

function previousPage() {
    if (regCurrentPage > 1) {
        regCurrentPage--;
        updatePendingTable(pendingRequests);
        updatePageInfo();
    }
}

function nextPage() {
    if (regCurrentPage < regTotalPages) {
        regCurrentPage++;
        updatePendingTable(pendingRequests);
        updatePageInfo();
    }
}

// グローバル関数として公開
window.loadRegistrationRequestsData = loadRegistrationRequestsData;
window.approveRegistration = approveRegistration;
window.rejectRegistration = rejectRegistration;
window.viewRegistrationDetails = viewRegistrationDetails;
window.revertRegistration = revertRegistration;
window.closeModal = closeModal;
window.previousPage = previousPage;
window.nextPage = nextPage;