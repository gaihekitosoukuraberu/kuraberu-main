// ブラウザのコンソールで実行するか、ブックマークレットとして使用
javascript:(function(){
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.clear();
    sessionStorage.clear();
    alert('認証情報をクリアしました。ページを再読み込みします。');
    window.location.reload();
})();