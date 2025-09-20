/**
 * Initialize Functions - DOMContentLoaded統合
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== アプリケーション初期化開始 ===');

    try {
        // 1. 基本初期化
        console.log('✓ DOM読み込み完了');

        // 2. ハッシュベースの初期表示
        const hash = window.location.hash;
        if (hash === '#assignment' || !hash) {
            console.log('✓ 案件管理画面を初期表示');
        }

        // 3. データ読み込み
        if (typeof loadCasesData === 'function') {
            loadCasesData();
            console.log('✓ 実データ読み込み開始');
        } else {
            if (typeof loadDemoData === 'function') {
                loadDemoData();
                console.log('✓ デモデータ読み込み');
            }
        }

        // 4. 検索とフィルター初期化
        if (typeof initializeSearchAndFilter === 'function') {
            initializeSearchAndFilter();
            console.log('✓ 検索・フィルター初期化完了');
        } else {
            console.warn('⚠ initializeSearchAndFilter not found');
        }

        // 5. リストビュー初期化
        if (typeof initializeListView === 'function') {
            initializeListView();
            console.log('✓ リストビュー初期化完了');
        }

        // 6. ページネーション初期化
        if (typeof setupPagination === 'function') {
            setupPagination();
            console.log('✓ ページネーション初期化完了');
        }

        // 7. ダッシュボード表示確認
        if (window.location.hash === '#registrationRequests') {
            if (typeof refreshDashboard === 'function') {
                refreshDashboard();
                console.log('✓ 登録申請ダッシュボード更新');
            }
        }

        // 8. 管理者メニューにログアウトボタン追加
        const adminSection = document.querySelector('.text-gray-700');
        if (adminSection && adminSection.textContent === '管理者') {
            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = 'ログアウト';
            logoutBtn.className = 'ml-4 text-sm text-red-600 hover:text-red-800';
            logoutBtn.onclick = function() {
                if (typeof logout === 'function') {
                    logout();
                } else {
                    alert('ログアウト機能は未実装です');
                }
            };
            adminSection.parentElement.appendChild(logoutBtn);
            console.log('✓ ログアウトボタン追加');
        }

        // 9. メニュークリックイベント
        document.addEventListener('click', function(e) {
            const menu = document.getElementById('sideMenu');
            const menuButton = document.querySelector('[onclick="toggleMenu()"]');

            // クリックがメニュー外でかつメニューボタン以外の場合
            if (menu && menuButton && !menu.contains(e.target) && e.target !== menuButton && !menuButton.contains(e.target)) {
                menu.classList.add('-translate-x-full');
            }
        });

        console.log('=== 初期化完了 ===');

    } catch(e) {
        console.error('初期化エラー:', e);
    }
});

// ログイン処理
function handleLogin(event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;

    // 簡単な認証チェック（実際の実装では適切な認証システムを使用）
    if (userId === 'admin' && password === 'admin123') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        console.log('ログイン成功');
    } else {
        alert('ユーザーIDまたはパスワードが正しくありません');
    }
}

function logout() {
    if (confirm('ログアウトしますか？')) {
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('userId').value = '';
        document.getElementById('password').value = '';
        console.log('ログアウト');
    }
}