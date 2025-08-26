// GAS設定ファイル - 中央管理版（2025-08-25）
// ⚠️ 重要: 新しいデプロイ後は必ずここを更新してください
(function() {
    console.log('🔍 gas_config.js 開始 - 最新V3デプロイ (2025-08-25 17:10)');
    
    // ========================================
    // 🎯 デプロイURL管理（ここだけ変更すればOK）
    // ========================================
    var GAS_CONFIG = {
        // 最新デプロイURL（2025-08-26 20:35更新 - 承認ボタン動作修正）
        CURRENT_URL: 'https://script.google.com/macros/s/AKfycbxXbiu-0jyhwTNT43tVMYwvrpDI2aCIVGGkDx2yJHq4xQHesJzCC-CId1Ds9VI-c5NjZQ/exec',
        
        // デプロイ履歴（デバッグ用）
        DEPLOY_VERSION: 'V9-2025-08-26-2035-APPROVAL-FIX',
        SCRIPT_ID: '1VALw14wYqzPq_lBaJZxboFkrG5FTJ_2X2XFaBxisK3lQZ5ppQFYxpHMg',
        
        // 以前のURL（ロールバック時のため）
        PREVIOUS_URL: 'https://script.google.com/macros/s/DISABLED_OLD_URL/exec'
    };
    
    // グローバル変数に設定（すべての場所で参照される）
    window.GAS_WEBAPP_URL = GAS_CONFIG.CURRENT_URL;
    
    console.log('✅ GAS URL設定完了:', GAS_CONFIG.CURRENT_URL);
    console.log('📌 デプロイバージョン:', GAS_CONFIG.DEPLOY_VERSION);
    console.log('📝 スクリプトID:', GAS_CONFIG.SCRIPT_ID);
    console.log('🔥 【重要】古いURL AKfycbwi1fG70eBeJdIxUCQxrJeHOW が表示される場合はキャッシュ問題です');
    console.log('🔥 【確認】window.GAS_WEBAPP_URL =', window.GAS_WEBAPP_URL);
})();

