/**
 * ============================================
 * BOT UI制御（完全独立）
 * ============================================
 *
 * 目的: メッセージ表示、スクロール制御、UI更新
 * 依存: なし（DOMのみ）
 * 公開: BotUI オブジェクト
 */

const BotUI = {
    // ============================================
    // DOMエレメント取得（キャッシュ）
    // ============================================
    elements: {
        messages: null,
        choices: null,
        chatSection: null,
        progressBar: null,
        progressPercentage: null,
        mobileProgressBar: null,
        mobileProgressPercentage: null
    },

    // 初期化
    init() {
        this.elements.messages = document.getElementById('messages');
        this.elements.choices = document.getElementById('choices');
        this.elements.chatSection = document.getElementById('chatSection');
        this.elements.progressBar = document.getElementById('progressBar');
        this.elements.progressPercentage = document.getElementById('progressPercentage');
        this.elements.mobileProgressBar = document.getElementById('mobileProgressBarFill');
        this.elements.mobileProgressPercentage = document.getElementById('mobileProgressPercentage');
    },

    // ============================================
    // AIメッセージ表示
    // ============================================
    showAIMessage(text, delay = 800) {
        if (!this.elements.messages) this.init();

        // アバターとタイピングインジケーターのコンテナ
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'ai-message-container';
        avatarContainer.style.display = 'flex';
        avatarContainer.style.alignItems = 'flex-end';
        avatarContainer.style.gap = '12px';

        avatarContainer.innerHTML = `
            <img src="images/avatars/319260ba-0b3d-47d0-b18f-abf530c2793e.png"
                 alt="AI" class="ai-avatar" loading="eager" decoding="async">
            <div style="display: flex; gap: 4px; align-items: flex-end; padding-bottom: 4px;">
                <div style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; animation: typing-bounce 1.4s infinite;"></div>
                <div style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; animation: typing-bounce 1.4s infinite 0.2s;"></div>
                <div style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; animation: typing-bounce 1.4s infinite 0.4s;"></div>
            </div>
        `;
        this.elements.messages.appendChild(avatarContainer);
        this.scrollToBottom();

        // 遅延後にメッセージを表示
        return new Promise(resolve => {
            setTimeout(() => {
                // タイピングインジケーターを削除してメッセージバブルに置き換え
                const typingIndicator = avatarContainer.querySelector('div[style*="gap: 4px"]');
                if (typingIndicator) {
                    typingIndicator.remove();
                }

                // メッセージ表示時は上揃えに戻す
                avatarContainer.style.alignItems = 'flex-start';

                // メッセージバブルを追加
                const messageBubble = document.createElement('div');
                messageBubble.className = 'ai-message';
                messageBubble.innerHTML = text;
                avatarContainer.appendChild(messageBubble);

                this.scrollToBottom();
                resolve();
            }, delay);
        });
    },

    // ============================================
    // ユーザーメッセージ表示
    // ============================================
    showUserMessage(text) {
        if (!this.elements.messages) this.init();

        const message = document.createElement('div');
        message.className = 'user-message';
        message.textContent = text;
        this.elements.messages.appendChild(message);
        this.scrollToBottom();
    },

    // ============================================
    // 選択肢表示
    // ============================================
    showChoices(choices, onSelect) {
        if (!this.elements.choices) this.init();

        this.elements.choices.innerHTML = '';

        // 戻るリンクを選択肢の上に表示（履歴が2つ以上ある場合のみ）
        const history = BotConfig.state.questionHistory || [];
        console.log('🔍 showChoices - 履歴数:', history.length, '履歴:', history.map(h => h.questionId));

        // 履歴が2つ以上あれば戻るリンクを表示（1つ前の質問に戻れる）
        if (history.length >= 2) {
            const backLinkContainer = document.createElement('div');
            backLinkContainer.style.cssText = 'text-align: left; margin-bottom: 8px;';
            const backLink = document.createElement('a');
            backLink.className = 'back-link';
            backLink.textContent = '← 戻る';
            backLink.href = '#';
            backLink.style.cssText = 'color: #9ca3af; font-size: 12px; text-decoration: none; cursor: pointer; transition: color 0.2s;';
            backLink.addEventListener('mouseover', () => backLink.style.color = '#6b7280');
            backLink.addEventListener('mouseout', () => backLink.style.color = '#9ca3af');
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.BotQuestions && typeof window.BotQuestions.goBack === 'function') {
                    window.BotQuestions.goBack();
                }
            });
            backLinkContainer.appendChild(backLink);
            this.elements.choices.appendChild(backLinkContainer);
            console.log('✅ 戻るリンク表示');
        } else {
            console.log('❌ 戻るリンク非表示 - 履歴数不足');
        }

        choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn w-full';
            btn.textContent = choice;
            btn.addEventListener('click', () => {
                onSelect(choice, index);
            });
            this.elements.choices.appendChild(btn);
        });

        this.scrollToBottom();
    },

    // ============================================
    // 選択肢クリア
    // ============================================
    clearChoices() {
        if (!this.elements.choices) this.init();
        this.elements.choices.innerHTML = '';
    },

    // ============================================
    // スライダー表示（V1713-FIX: Q008A築年数入力）
    // ============================================
    showSlider(config, onConfirm, onUnknown = null) {
        if (!this.elements.choices) this.init();

        const { min, max, step, unit } = config;
        const defaultValue = config.default !== undefined ? config.default : Math.floor((min + max) / 2);

        this.elements.choices.innerHTML = `
            <div class="slider-container p-8 bg-white rounded-lg border-2 border-blue-400 shadow-md">
                <div class="mb-8 text-center">
                    <span style="font-size: 40px; line-height: 1;" class="font-bold text-gray-600">築</span>
                    <span style="font-size: 80px; line-height: 1;" class="font-bold text-blue-600" id="sliderValue">${defaultValue}</span>
                    <span style="font-size: 40px; line-height: 1;" class="font-bold text-gray-600">${unit}</span>
                </div>
                <input type="range"
                       id="ageSlider"
                       min="${min}"
                       max="${max}"
                       step="${step}"
                       value="${defaultValue}"
                       class="w-full h-5 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb">
                <div class="flex justify-between text-base text-gray-500 mt-4 font-medium">
                    <span>${min}${unit}</span>
                    <span>${max}${unit}</span>
                </div>
                <div class="mt-8 space-y-3">
                    <button id="sliderConfirm" class="choice-btn w-full">
                        決定
                    </button>
                    ${onUnknown ? `
                    <button id="sliderUnknown" class="choice-btn w-full">
                        不明
                    </button>
                    ` : ''}
                </div>
            </div>
            <style>
                /* スライダーのカスタムスタイル */
                .slider-thumb::-webkit-slider-thumb {
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    background: #3B82F6;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
                }
                .slider-thumb::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    background: #3B82F6;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
                    border: none;
                }
                .slider-thumb::-webkit-slider-thumb:hover {
                    background: #2563EB;
                    transform: scale(1.1);
                }
                .slider-thumb::-moz-range-thumb:hover {
                    background: #2563EB;
                    transform: scale(1.1);
                }
            </style>
        `;

        const slider = document.getElementById('ageSlider');
        const valueDisplay = document.getElementById('sliderValue');
        const confirmBtn = document.getElementById('sliderConfirm');
        const unknownBtn = document.getElementById('sliderUnknown');

        // スライダー値変更時の処理
        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
        });

        // 決定ボタン
        confirmBtn.addEventListener('click', () => {
            const value = parseInt(slider.value);
            onConfirm(value);
        });

        // 不明ボタン
        if (unknownBtn && onUnknown) {
            unknownBtn.addEventListener('click', () => {
                onUnknown();
            });
        }

        this.scrollToBottom();
    },

    // ============================================
    // メッセージクリア
    // ============================================
    clearMessages() {
        if (!this.elements.messages) this.init();
        this.elements.messages.innerHTML = '';
    },

    // ============================================
    // スクロール制御（レスポンシブ対応）
    // ============================================
    scrollToBottom() {
        if (!this.elements.chatSection) this.init();

        const chatSection = this.elements.chatSection;
        if (!chatSection) return;

        // チャットセクション内のスクロール
        chatSection.scrollTop = chatSection.scrollHeight;

        // スマホの場合は、ページ全体もスクロール
        if (window.innerWidth < 768) {
            const rect = chatSection.getBoundingClientRect();
            const currentBottom = rect.bottom;
            const windowHeight = window.innerHeight;

            // BOTフレーム下端が画面外にある場合のみスクロール
            if (currentBottom > windowHeight + 10) {
                setTimeout(() => {
                    const scrollPosition = window.pageYOffset + rect.bottom - windowHeight + 20;
                    window.scrollTo({
                        top: Math.max(0, scrollPosition),
                        behavior: 'smooth'
                    });
                }, 100);
            }
        } else {
            // PCは通常通りスクロール
            setTimeout(() => {
                const rect = chatSection.getBoundingClientRect();
                const scrollPosition = window.pageYOffset + rect.bottom - window.innerHeight + 20;
                window.scrollTo({
                    top: Math.max(0, scrollPosition),
                    behavior: 'smooth'
                });
            }, 100);
        }
    },

    // ============================================
    // 進捗バー更新
    // ============================================
    updateProgress(percentage) {
        if (!this.elements.progressBar) this.init();

        // デスクトップ版
        if (this.elements.progressPercentage) {
            this.elements.progressPercentage.textContent = percentage + '%';
        }
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = percentage + '%';
            this.elements.progressBar.style.background =
                'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)';
        }

        // モバイル版
        if (this.elements.mobileProgressPercentage) {
            this.elements.mobileProgressPercentage.textContent = percentage + '%';
        }
        if (this.elements.mobileProgressBar) {
            this.elements.mobileProgressBar.style.width = percentage + '%';
            this.elements.mobileProgressBar.style.background =
                'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)';
        }
    },

    // ============================================
    // タイピングインジケーター表示/非表示
    // ============================================
    showTyping() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    },

    hideTyping() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    },

    // ============================================
    // フォーム表示（郵便番号、電話番号など）
    // ============================================
    showCustomForm(config) {
        if (!this.elements.messages) this.init();

        const formContainer = document.createElement('div');
        formContainer.className = 'phone-mini-form';
        formContainer.innerHTML = config.html;
        this.elements.messages.appendChild(formContainer);

        // イベントリスナー設定
        if (config.onSubmit) {
            const submitBtn = formContainer.querySelector(config.submitSelector);
            if (submitBtn) {
                submitBtn.addEventListener('click', config.onSubmit);
            }
        }

        // フォームにスクロール（DOMレイアウト更新後に実行）
        setTimeout(() => {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        return formContainer;
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotUI = BotUI;
}
