/**
 * Step 1: 会社名入力
 */

/**
 * 会社名入力から同意画面へ
 */
function proceedToConsent() {
    const companyName = document.getElementById('companyName').value.trim();
    console.log('proceedToConsent called with:', companyName);

    if (companyName.length < 2) {
        showError('会社名は2文字以上入力してください');
        return;
    }

    registrationData.companyName = companyName;

    // AI検索をバックグラウンドで開始
    console.log('aiAssistant exists?', !!window.aiAssistant);
    if (window.aiAssistant) {
        console.log('Starting background search for:', companyName);
        window.aiAssistant.startBackgroundSearch(companyName);
    } else {
        console.warn('aiAssistant not found!');
    }

    goToStep(2);
}

// 関数をwindowに公開
window.proceedToConsent = proceedToConsent;