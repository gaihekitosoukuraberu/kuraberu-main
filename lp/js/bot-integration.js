/**
 * ============================================
 * BOT統合スクリプト
 * ============================================
 * estimate-keep-system に zip-word-bot.json ベースのBOTを統合
 */

// ============================================
// BOT UI オブジェクト
// ============================================

const BotUI = {
    elements: {},

    // 初期化
    init() {
        this.elements.messages = document.getElementById('messages');
        this.elements.choices = document.getElementById('choices');
        console.log('✅ BotUI初期化完了');
    },

    // AIメッセージ表示
    showAIMessage(text) {
        const messages = document.getElementById('messages');
        if (!messages) {
            console.error('❌ messagesエレメントが見つかりません');
            return;
        }
        const aiMessageContainer = document.createElement('div');
        aiMessageContainer.className = 'flex items-start gap-2 my-5';
        aiMessageContainer.innerHTML = `
            <img src="https://gaihekikuraberu.com/estimate-keep-system/images/avatars/319260ba-0b3d-47d0-b18f-abf530c2793e.png" alt="AI" class="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow-md">
            <div class="bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-3xl rounded-tl-sm px-5 py-4 max-w-xs md:max-w-md shadow-sm">${text}</div>
        `;
        messages.appendChild(aiMessageContainer);
        this.scrollToBottom();
    },

    // ユーザーメッセージ表示
    showUserMessage(text) {
        const messages = document.getElementById('messages');
        if (!messages) {
            console.error('❌ messagesエレメントが見つかりません');
            return;
        }
        const userMessage = document.createElement('div');
        userMessage.className = 'bg-gray-100 text-gray-800 rounded-3xl rounded-tr-sm px-5 py-4 my-5 ml-auto max-w-xs md:max-w-md shadow-sm';
        userMessage.textContent = text;
        messages.appendChild(userMessage);
        this.scrollToBottom();
    },

    // 選択肢表示
    showChoices(choiceArray, callback) {
        const choices = document.getElementById('choices');
        if (!choices) {
            console.error('❌ choicesエレメントが見つかりません');
            return;
        }
        choices.innerHTML = '';

        choiceArray.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'w-full border-2 border-gray-200 bg-white text-gray-700 px-5 py-4 rounded-xl text-base font-medium cursor-pointer my-2 text-left transition-all duration-300 hover:bg-gray-50 hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md active:bg-blue-50 active:translate-y-0';
            btn.textContent = choice;
            btn.addEventListener('click', function() {
                callback(choice, index);
            });
            choices.appendChild(btn);
        });

        this.scrollToBottom();
    },

    // メッセージクリア
    clearMessages() {
        const messages = document.getElementById('messages');
        if (messages) {
            messages.innerHTML = '';
        }
    },

    // 選択肢クリア
    clearChoices() {
        const choices = document.getElementById('choices');
        if (choices) {
            choices.innerHTML = '';
        }
    },

    // スクロール
    scrollToBottom() {
        if (typeof scrollToBotBottom === 'function') {
            scrollToBotBottom();
        } else {
            const messages = document.getElementById('messages');
            if (messages) {
                messages.scrollTop = messages.scrollHeight;
            }
        }
    },

    // カスタムフォーム表示（郵便番号、電話番号など）
    showCustomForm(config) {
        if (!this.elements.messages) this.init();

        const formContainer = document.createElement('div');
        formContainer.className = 'phone-mini-form';
        formContainer.innerHTML = config.html;
        this.elements.messages.appendChild(formContainer);
        this.scrollToBottom();

        // イベントリスナー設定
        if (config.onSubmit) {
            const submitBtn = formContainer.querySelector(config.submitSelector);
            if (submitBtn) {
                submitBtn.addEventListener('click', config.onSubmit);
            }
        }

        return formContainer;
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotUI = BotUI;
}

// 後方互換性のため、グローバル関数も残す
function showAIMessage(text) {
    BotUI.showAIMessage(text);
}

function showUserMessage(text) {
    BotUI.showUserMessage(text);
}

// ============================================
// BOT Questions オブジェクト
// ============================================

const BotQuestions = {
    // 質問表示
    showQuestion(questionId) {
        const question = BotConfig.state.flowData.mainQuestions[questionId];

        if (!question) {
            console.error('質問が見つかりません:', questionId);
            return;
        }

        BotConfig.state.currentQuestionId = questionId;

        // 特殊な分岐：PHONE
        if (questionId === 'PHONE' || (question.branches && question.branches[0] === 'PHONE')) {
            this.connectToExistingPhoneForm();
            return;
        }

        // AIメッセージ表示
        BotUI.showAIMessage(question.text);

        // 選択肢表示
        setTimeout(() => {
            this.showChoicesFromQuestion(question);
        }, 500);
    },

    // 選択肢表示
    showChoicesFromQuestion(question) {
        const choices = document.getElementById('choices');
        if (!choices) return;

        choices.innerHTML = '';

        question.choices.forEach((choice, index) => {
            const btn = document.createElement('button');
            btn.className = 'w-full border-2 border-gray-200 bg-white text-gray-700 px-5 py-4 rounded-xl text-base font-medium cursor-pointer my-2 text-left transition-all duration-300 hover:bg-gray-50 hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md active:bg-blue-50 active:translate-y-0';
            btn.textContent = choice;
            btn.addEventListener('click', () => {
                this.handleQuestionAnswer(choice, index, question);
            });
            choices.appendChild(btn);
        });

        if (typeof scrollToBotBottom === 'function') {
            scrollToBotBottom();
        }
    },

    // 回答処理
    handleQuestionAnswer(choice, index, question) {
        // ユーザーメッセージ表示
        BotUI.showUserMessage(choice);

        // 回答を保存
        BotConfig.state.userAnswers[BotConfig.state.currentQuestionId] = {
            choice: choice,
            index: index
        };

        // 選択肢をクリア
        const choices = document.getElementById('choices');
        if (choices) {
            choices.innerHTML = '';
        }

        // 進捗更新
        this.updateProgressFromStage(question.stage);

        // 次の質問へ
        const nextQuestionId = question.branches[index];

        setTimeout(() => {
            if (nextQuestionId === 'PHONE') {
                this.connectToExistingPhoneForm();
            } else {
                this.showQuestion(nextQuestionId);
            }
        }, 1000);
    },

    // 進捗更新
    updateProgressFromStage(stage) {
        let percentage = 0;
        switch(stage) {
            case 1: percentage = 25; break;
            case 2: percentage = 50; break;
            case 3: percentage = 75; break;
            case 4: percentage = 100; break;
        }
        this.updateProgress(percentage);
    },

    // 既存のupdateProgress関数を使用
    updateProgress(percentage) {
        // デスクトップ版
        const progressPercentage = document.getElementById('progressPercentage');
        const progressBar = document.getElementById('progressBar');
        if (progressPercentage) {
            progressPercentage.textContent = percentage + '%';
        }
        if (progressBar) {
            progressBar.style.width = percentage + '%';
            progressBar.style.background = 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)';
        }

        // モバイル版
        const mobileProgressPercentage = document.getElementById('mobileProgressPercentage');
        const mobileProgressBar = document.getElementById('mobileProgressBarFill');
        if (mobileProgressPercentage) {
            mobileProgressPercentage.textContent = percentage + '%';
        }
        if (mobileProgressBar) {
            mobileProgressBar.style.width = percentage + '%';
            mobileProgressBar.style.background = 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)';
        }
    },

    // PHONE分岐：既存システムへの接続
    connectToExistingPhoneForm() {
        // BOTを一時停止
        BotConfig.state.botActive = false;

        // AIメッセージで誘導
        BotUI.showAIMessage('ありがとうございました！それでは最適な業者をご紹介するため、最後に電話番号を教えていただけますか？');

        // 選択肢をクリア
        const choices = document.getElementById('choices');
        if (choices) {
            choices.innerHTML = '';
        }

        // 既存のphone-form.jsのshowPhoneInputForm()を呼び出す
        setTimeout(() => {
            if (typeof window.showPhoneInputForm === 'function') {
                window.showPhoneInputForm();
            } else {
                // フォールバック：直接phoneSection表示
                const phoneSection = document.getElementById('phoneSection');
                if (phoneSection) {
                    phoneSection.style.display = 'block';
                    phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 1000);
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotQuestions = BotQuestions;
}

// 郵便番号エントリ用のBOT初期化（後方互換性）
function initBotForZipEntry() {
    if (!BotConfig.state.flowData) {
        console.error('BOTフローデータがロードされていません');
        return;
    }

    BotConfig.state.botActive = true;

    // 郵便番号入力フォームを非表示（別ページ風に）
    const postalCodeSection = document.getElementById('postalCodeSection');
    if (postalCodeSection) {
        postalCodeSection.style.display = 'none';
    }

    // AIメッセージ：相場は既に表示済みなので、直接質問開始
    BotUI.showAIMessage('ありがとうございます。あなたに最適な業者をご紹介するため、いくつか質問させていただきます。');

    // mainQuestions.Q001から開始
    setTimeout(() => {
        BotQuestions.showQuestion('Q001');
    }, 1000);
}

// 後方互換性のため、グローバル関数も残す
function showQuestion(questionId) {
    BotQuestions.showQuestion(questionId);
}

function showChoicesFromQuestion(question) {
    BotQuestions.showChoicesFromQuestion(question);
}

function handleQuestionAnswer(choice, index, question) {
    BotQuestions.handleQuestionAnswer(choice, index, question);
}

function updateProgressFromStage(stage) {
    BotQuestions.updateProgressFromStage(stage);
}

function updateProgress(percentage) {
    BotQuestions.updateProgress(percentage);
}

function connectToExistingPhoneForm() {
    BotQuestions.connectToExistingPhoneForm();
}

// ワードリンクエントリ用のBOT初期化
function initBotForKeywordEntry(keyword) {
    if (!BotConfig.state.flowData) {
        console.error('BOTフローデータがロードされていません');
        return;
    }

    BotConfig.state.botActive = true;
    BotConfig.state.currentEntry = 'keyword';
    BotConfig.state.currentKeyword = keyword;

    const scenario = BotConfig.state.flowData.entryScenarios[keyword];

    if (!scenario) {
        showAIMessage(`申し訳ございません。「${keyword}」は現在準備中です。`);
        return;
    }

    // greeting表示
    showAIMessage(scenario.greeting);

    // immediatePostalの判定
    if (scenario.immediatePostal) {
        // すぐ郵便番号を聞く
        setTimeout(() => {
            showAIMessage('まず、お住まいの地域の相場を確認させてください。');
            setTimeout(() => {
                showPostalFormInBot();
            }, 1000);
        }, 1000);
    } else {
        // カスタムフロー
        setTimeout(() => {
            showAIMessage('少し詳しく教えてください。');
            setTimeout(() => {
                showPostalFormInBot();
            }, 1000);
        }, 1000);
    }
}

// BOT内で郵便番号を聞く
function showPostalFormInBot() {
    const messages = document.getElementById('messages');

    const formContainer = document.createElement('div');
    formContainer.className = 'bg-white p-4 rounded-lg shadow-md my-4';
    formContainer.innerHTML = `
        <div class="text-sm font-medium text-gray-700 mb-3">郵便番号を入力してください</div>
        <input type="text" id="postalInputBot" class="w-full border-2 border-blue-200 rounded-lg px-4 py-3 text-center text-base focus:outline-none focus:border-blue-500 bg-blue-50"
               placeholder="例：100-0001"
               maxlength="8">
        <button id="postalSubmitBtn" class="w-full mt-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 font-bold">
            次へ
        </button>
    `;
    messages.appendChild(formContainer);
    scrollToBotBottom();

    // イベントリスナー
    document.getElementById('postalSubmitBtn').addEventListener('click', function() {
        const postal = document.getElementById('postalInputBot').value.trim();

        if (!postal.match(/^\d{3}-?\d{4}$/)) {
            alert('正しい郵便番号を入力してください（例：100-0001）');
            return;
        }

        // 郵便番号を保存
        BotConfig.state.currentZipcode = postal.replace('-', '');

        // ユーザーメッセージとして表示
        showUserMessage(postal);

        // フォームを非表示
        formContainer.style.display = 'none';

        // 相場表示
        document.getElementById('priceSection').classList.remove('hidden');
        document.getElementById('areaName').textContent = '東京都千代田区の外壁塗装相場';

        // mainQuestionsへ
        setTimeout(() => {
            showQuestion('Q001');
        }, 1500);
    });

    // Enterキーで送信
    document.getElementById('postalInputBot').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('postalSubmitBtn').click();
        }
    });
}

// PHONE分岐：既存システムへの接続
function connectToExistingPhoneForm() {
    // BOTを一時停止
    BotConfig.state.botActive = false;

    // AIメッセージで誘導
    showAIMessage('ありがとうございました！それでは最適な業者をご紹介するため、最後に電話番号を教えていただけますか？');

    // 選択肢をクリア
    document.getElementById('choices').innerHTML = '';

    // 既存のphone-form.jsのshowPhoneInputForm()を呼び出す
    setTimeout(() => {
        if (typeof window.showPhoneInputForm === 'function') {
            window.showPhoneInputForm();
        } else {
            // フォールバック：直接phoneSection表示
            const phoneSection = document.getElementById('phoneSection');
            if (phoneSection) {
                phoneSection.style.display = 'block';
                phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 1000);
}
