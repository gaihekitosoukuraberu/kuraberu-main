/**
 * 初期化モジュール
 */

// グローバル変数の初期化と公開
function initializeGlobals() {
    // グローバル変数（既存データがあれば保持）
    if (!window.currentStep) window.currentStep = 1;
    if (!window.sessionId) window.sessionId = null;
    if (!window.registrationData) {
        window.registrationData = {
            companyName: '',
            agreements: {},
            verificationDocs: [],
            companyInfo: {},
            selectedAreas: []
        };
    }
    if (!window.aiProcessing) window.aiProcessing = false;
    if (!window.aiData) window.aiData = null;

    // セッションID生成（未設定の場合のみ）
    if (!window.sessionId) window.sessionId = generateSessionId();
}

/**
 * セッションID生成
 */
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    // Enterキーでの送信防止
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.querySelector('.step-content.active .primary-btn');
                if (btn && !btn.disabled) {
                    btn.click();
                }
            }
        });
    });
}

/**
 * ステップ移動
 */
function goToStep(step) {
    // 現在のステップを非表示
    document.querySelector(`.step-content.active`)?.classList.remove('active');
    document.querySelector(`.step-item.active`)?.classList.remove('active');

    // 完了済みマーク
    if (step > window.currentStep) {
        for (let i = window.currentStep; i < step; i++) {
            document.querySelector(`.step-item[data-step="${i}"]`)?.classList.add('completed');
        }
    }

    // 新しいステップを表示
    document.querySelector(`#step${step}`)?.classList.add('active');
    document.querySelector(`.step-item[data-step="${step}"]`)?.classList.add('active');

    // プログレスバー更新
    const progress = ((step - 1) / 6) * 100;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }

    window.currentStep = step;

    // ステップごとの初期化処理
    if (step === 2 && window.displayTermsText) {
        setTimeout(() => window.displayTermsText(), 100);
    } else if (step === 4 && window.displayCompanyInfo) {
        setTimeout(() => window.displayCompanyInfo(), 100);
    } else if (step === 5 && window.initializeDetailsForm) {
        setTimeout(() => window.initializeDetailsForm(), 100);
    } else if (step === 6 && window.initializeAreaSelection) {
        setTimeout(() => window.initializeAreaSelection(), 100);
    }

    // スクロールトップ
    window.scrollTo(0, 0);
}

/**
 * エラー表示
 */
function showError(message) {
    alert(message);
}

/**
 * ローディング表示
 */
function showLoadingOverlay(title, text) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        const titleEl = document.getElementById('loadingTitle');
        const textEl = document.getElementById('loadingText');
        if (titleEl) titleEl.textContent = title || '処理中...';
        if (textEl) textEl.textContent = text || '';
        overlay.classList.remove('hidden');
    }
}

/**
 * ローディング非表示
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// 関数をwindowに公開
window.initializeGlobals = initializeGlobals;
window.generateSessionId = generateSessionId;
window.setupEventListeners = setupEventListeners;
window.goToStep = goToStep;
window.showError = showError;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;