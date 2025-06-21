// 認証チェック用のスクリプト
(function() {
    'use strict';
    
    console.log('認証チェック開始 - 現在のパス:', window.location.pathname);
    
    // ログインページかどうかチェック
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (!isLoginPage) {
        const token = localStorage.getItem('admin_token');
        const user = localStorage.getItem('admin_user');
        
        console.log('認証情報チェック - token:', !!token, 'user:', !!user);
        
        if (!token || !user) {
            console.log('認証情報なし - ログインページにリダイレクト');
            window.location.href = './login.html';
            return;
        }
        
        try {
            const userData = JSON.parse(user);
            console.log('認証済みユーザー:', userData.email);
        } catch (e) {
            console.log('ユーザーデータ破損 - ログインページにリダイレクト');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            window.location.href = './login.html';
        }
    } else {
        console.log('ログインページです');
    }
})();