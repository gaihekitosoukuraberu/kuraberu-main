/**
 * 加盟店登録システム - メインエントリーポイント（最小化版）
 * 注：このファイルは初期化と調整のみ。各機能はモジュールに分離
 *
 * ファイル構成：
 * - js/modules/init.js - 初期化・共通関数
 * - js/modules/step1-company.js - Step 1
 * - js/modules/step2-agreement.js - Step 2
 * - js/upload-handler.js - Step 3
 * - js/confirmation.js - Step 4
 * - js/details.js - Step 5
 * - js/area-selection.js - Step 6
 * - js/gas-submit.js - GAS送信
 */

// グローバル変数（互換性のため残す）
let currentStep = 1;
let sessionId = null;
let registrationData = {
    companyName: '',
    agreements: {},
    verificationDocs: [],
    companyInfo: {},
    selectedAreas: []
};
let aiProcessing = false;
let aiData = null;

// windowオブジェクトに公開
window.currentStep = currentStep;
window.sessionId = sessionId;
window.registrationData = registrationData;
window.aiProcessing = aiProcessing;
window.aiData = aiData;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // グローバル変数初期化
    if (window.initializeGlobals) {
        window.initializeGlobals();
    }

    // セッションID生成
    window.sessionId = window.generateSessionId ?
        window.generateSessionId() :
        'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // イベントリスナー設定
    if (window.setupEventListeners) {
        window.setupEventListeners();
    }

    // 利用規約テキスト表示
    if (window.displayTermsText) {
        window.displayTermsText();
    }

    console.log('✅ 加盟店登録システム初期化完了');
});