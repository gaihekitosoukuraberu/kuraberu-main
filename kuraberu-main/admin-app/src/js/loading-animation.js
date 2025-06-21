/**
 * ローディングアニメーション管理
 * iframe埋め込み対応
 */

class LoadingAnimation {
    constructor() {
        this.loadingOverlay = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        // DOMが読み込まれてから実行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // 初回ローディング開始
        this.show();
        
        // 初期化完了後にローディング終了
        setTimeout(() => {
            this.hide();
        }, 1500); // 1.5秒後に自動で隠す
    }

    show(text = 'チャット起動中...') {
        if (!this.loadingOverlay) return;
        
        this.isLoading = true;
        this.loadingOverlay.classList.remove('hidden');
        
        const loadingText = this.loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        // アクセシビリティ
        this.loadingOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.loadingOverlay || !this.isLoading) return;
        
        this.isLoading = false;
        this.loadingOverlay.classList.add('hidden');
        
        // アクセシビリティ
        this.loadingOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        
        // アニメーション完了後に要素を完全に非表示
        setTimeout(() => {
            if (!this.isLoading && this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
        }, 500);
    }

    showWithMessage(message, duration = 2000) {
        this.show(message);
        
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    // AI処理中のローディング
    showAIProcessing() {
        this.showWithMessage('AI が回答を生成中...', 0); // 手動で hide() を呼ぶまで表示
    }

    // データ読み込み中のローディング
    showDataLoading() {
        this.showWithMessage('データを読み込み中...', 3000);
    }

    // エラー時のメッセージ表示
    showError(errorMessage, duration = 3000) {
        if (!this.loadingOverlay) return;
        
        const loadingSpinner = this.loadingOverlay.querySelector('.loading-spinner');
        const loadingText = this.loadingOverlay.querySelector('.loading-text');
        
        // スピナーを隠してエラーアイコンに変更
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        // エラーメッセージを表示
        if (loadingText) {
            loadingText.innerHTML = `❌ ${errorMessage}`;
            loadingText.style.color = '#dc3545';
        }
        
        this.loadingOverlay.classList.remove('hidden');
        this.loadingOverlay.style.background = 'rgba(255, 255, 255, 0.98)';
        
        // 指定時間後に非表示
        setTimeout(() => {
            this.hide();
            this.resetUI();
        }, duration);
    }

    // UI をリセット
    resetUI() {
        if (!this.loadingOverlay) return;
        
        const loadingSpinner = this.loadingOverlay.querySelector('.loading-spinner');
        const loadingText = this.loadingOverlay.querySelector('.loading-text');
        
        // スピナーを表示に戻す
        if (loadingSpinner) {
            loadingSpinner.style.display = 'block';
        }
        
        // テキストスタイルをリセット
        if (loadingText) {
            loadingText.textContent = 'チャット起動中...';
            loadingText.style.color = '#666';
        }
        
        this.loadingOverlay.style.background = 'rgba(255, 255, 255, 0.95)';
    }

    // ローディング状態の確認
    isShowing() {
        return this.isLoading;
    }
}

// グローバルインスタンス
window.loadingAnimation = new LoadingAnimation();

// 外部から使用可能な関数をエクスポート
window.showLoading = (text) => window.loadingAnimation.show(text);
window.hideLoading = () => window.loadingAnimation.hide();
window.showLoadingWithMessage = (message, duration) => window.loadingAnimation.showWithMessage(message, duration);
window.showAIProcessing = () => window.loadingAnimation.showAIProcessing();
window.showDataLoading = () => window.loadingAnimation.showDataLoading();
window.showLoadingError = (message, duration) => window.loadingAnimation.showError(message, duration);