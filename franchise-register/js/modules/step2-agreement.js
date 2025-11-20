/**
 * Step 2: 利用規約同意
 */

/**
 * 同意チェック確認
 */
function checkAgreement() {
    const termsAgree = document.getElementById('termsAgree');
    const agreeBtn = document.getElementById('agreeBtn');

    if (termsAgree && agreeBtn) {
        agreeBtn.disabled = !termsAgree.checked;

        // チェックされたら最下部までスムーズスクロール
        if (termsAgree.checked) {
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }
}

/**
 * 利用規約のテキスト表示
 */
function displayTermsText() {
    const termsFullText = document.getElementById('termsFullText');
    if (termsFullText) {
        // CONFIGがまだ読み込まれていない場合は少し待つ
        if (window.CONFIG && window.CONFIG.TERMS_TEXT) {
            termsFullText.innerHTML = window.CONFIG.TERMS_TEXT.replace(/\n/g, '<br>');
        } else {
            // 100ms後に再試行
            setTimeout(() => {
                if (window.CONFIG && window.CONFIG.TERMS_TEXT) {
                    termsFullText.innerHTML = window.CONFIG.TERMS_TEXT.replace(/\n/g, '<br>');
                }
            }, 100);
        }
    }
}

/**
 * 利用規約クリックで同意
 */
function toggleTermsAgreement(event) {
    event.stopPropagation();
    const checkbox = document.getElementById('termsAgree');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkAgreement();
    }
}

/**
 * 同意して次へ進む
 */
function proceedWithAgreement() {
    if (!document.getElementById('termsAgree').checked) {
        showError('利用規約に同意してください');
        return;
    }

    registrationData.agreements = {
        terms: true,
        timestamp: new Date().toISOString()
    };

    goToStep(3);

    // AI処理開始（バックグラウンド）
    if (window.startAIProcessing) {
        startAIProcessing();
    }
}

// 関数をwindowに公開
window.checkAgreement = checkAgreement;
window.displayTermsText = displayTermsText;
window.toggleTermsAgreement = toggleTermsAgreement;
window.proceedWithAgreement = proceedWithAgreement;
window.checkAllAgreements = checkAgreement; // 互換性のため