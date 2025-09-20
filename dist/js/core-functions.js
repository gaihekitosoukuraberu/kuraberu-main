/**
 * Core Functions - メインアプリケーション用基本関数群
 */

// ビュー切り替え
let currentView = 'list';
let currentCaseId = '001';

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    menu.classList.toggle('-translate-x-full');
}

function switchView(view) {
    console.log('switchView called with view:', view);
    if (view === 'list') {
        document.getElementById('listView').classList.remove('hidden');
        document.getElementById('crmView').classList.add('hidden');
        document.getElementById('listViewBtn').classList.add('bg-white', 'text-gray-900');
        document.getElementById('listViewBtn').classList.remove('text-gray-600');
        document.getElementById('crmViewBtn').classList.remove('bg-white', 'text-gray-900');
        document.getElementById('crmViewBtn').classList.add('text-gray-600');
        currentView = 'list';
        if (typeof initializeListView === 'function') {
            initializeListView();
        }
        // リスト表示時は選択件数の表示を更新
        if (typeof updateSelectedCount === 'function') {
            updateSelectedCount();
        }
    } else {
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('crmView').classList.remove('hidden');
        document.getElementById('crmViewBtn').classList.add('bg-white', 'text-gray-900');
        document.getElementById('crmViewBtn').classList.remove('text-gray-600');
        document.getElementById('listViewBtn').classList.remove('bg-white', 'text-gray-900');
        document.getElementById('listViewBtn').classList.add('text-gray-600');
        currentView = 'crm';
        // CRM表示時は選択件数を非表示
        const selectionDisplay = document.getElementById('selectionCountDisplay');
        if (selectionDisplay) {
            selectionDisplay.classList.add('hidden');
        }
        if (typeof loadCRMContent === 'function') {
            loadCRMContent(currentCaseId);
        }
    }
}

// セクション切り替え機能
function showSection(sectionName) {
    // メニューを閉じる
    document.getElementById('sideMenu').classList.add('-translate-x-full');

    // セクションに応じたコンテンツを表示
    if (sectionName === 'assignment') {
        // 案件管理を表示（ページリロード）
        window.location.href = window.location.pathname + '#assignment';
        location.reload();
    } else if (sectionName === 'dashboard') {
        // 現在のコンテンツを非表示
        const mainContent = document.querySelector('main');
        window.location.href = '#dashboard';
        mainContent.innerHTML = `
            <div class="pt-20 px-6 max-w-7xl mx-auto">
                <div class="mb-8">
                    <h1 class="text-4xl font-bold text-gray-800 mb-2">ダッシュボード</h1>
                    <p class="text-gray-600">リアルタイムモニター</p>
                </div>

                <!-- KPIカード -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500">未振分案件</span>
                            <span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">要対応</span>
                        </div>
                        <p class="text-3xl font-bold text-gray-800 mt-2">23件</p>
                        <p class="text-xs text-gray-500 mt-1">対前日 +5件</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500">今日の案件</span>
                            <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">進行中</span>
                        </div>
                        <p class="text-3xl font-bold text-gray-800 mt-2">87件</p>
                        <p class="text-xs text-gray-500 mt-1">対前日 +12件</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500">今月完了案件</span>
                            <span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">完了</span>
                        </div>
                        <p class="text-3xl font-bold text-gray-800 mt-2">1,234件</p>
                        <p class="text-xs text-gray-500 mt-1">対前月 +156件</p>
                    </div>
                    <div class="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-500">売上</span>
                            <span class="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">予測値</span>
                        </div>
                        <p class="text-3xl font-bold text-gray-800 mt-2">¥8.5M</p>
                        <p class="text-xs text-gray-500 mt-1">対前月 +18%</p>
                    </div>
                </div>

                <div class="text-center py-12">
                    <p class="text-gray-500">ダッシュボード機能開発中</p>
                </div>
            </div>
        `;
    } else if (sectionName === 'registrationRequests') {
        // 加盟店登録申請管理を表示
        window.location.href = '#registrationRequests';
        if (typeof refreshDashboard === 'function') {
            refreshDashboard();
        }
    } else {
        // その他のセクション（開発中）
        const mainContent = document.querySelector('main');
        window.location.href = '#' + sectionName;
        mainContent.innerHTML = `
            <div class="pt-20 px-6 max-w-7xl mx-auto">
                <div class="text-center py-24">
                    <h1 class="text-4xl font-bold text-gray-800 mb-4">${getSectionTitle(sectionName)}</h1>
                    <p class="text-gray-600">この機能は開発中です</p>
                </div>
            </div>
        `;
    }
}

function getSectionTitle(sectionName) {
    const titles = {
        'franchise': '加盟店管理',
        'cancelRequests': '解約申請管理',
        'financial': '財務管理',
        'ranking': 'ランキング管理'
    };
    return titles[sectionName] || 'Unknown Section';
}