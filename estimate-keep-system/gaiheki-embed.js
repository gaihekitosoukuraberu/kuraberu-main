/**
 * ============================================
 * 外壁塗装くらべる - 埋め込みシステム
 * ============================================
 * バージョン: 1.0.0
 * 最終更新: 2025-10-07
 *
 * このファイルをFREE WEB HOPE様のLPに埋め込むことで、
 * 郵便番号入力フォーム、BOT、ランキング、見積もりフォームが動作します。
 *
 * 必須ファイル:
 * - gaiheki-embed.css
 * - gaiheki-embed.js（このファイル）
 * - zip-word-bot.json
 */

(function() {
    'use strict';

    const BASE_URL = 'https://gaihekikuraberu.com/estimate-keep-system/';

    // ============================================
    // 統合JSファイル開始
    // ============================================

/**
 * ============================================
 * BOT設定ファイル（完全独立）
 * ============================================
 *
 * 目的: JSONデータとBOTグローバル変数の定義
 * 依存: なし
 * 公開: BotConfig オブジェクト
 */

const BotConfig = {
    // ============================================
    // グローバル状態（外部から参照可能）
    // ============================================
    state: {
        flowData: null,           // JSONデータ
        currentEntry: null,       // 'zip' or 'keyword'
        currentZipcode: null,     // 郵便番号（7桁）
        currentKeyword: null,     // ワード名
        currentQuestionId: null,  // 現在の質問ID
        userAnswers: {},          // ユーザーの回答履歴
        botActive: false,         // BOT起動状態
        currentScenario: null,    // 現在のシナリオ
        currentFlowStep: null,    // 現在のフローステップ
        questionHistory: []       // 質問履歴（戻る機能用）
    },

    // ============================================
    // JSON読み込み
    // ============================================
    async loadFlowData() {
        try {
            // 現在のスクリプトパスから相対的にJSONを読み込む
            const scriptPath = document.currentScript ? document.currentScript.src : window.location.href;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
            const jsonUrl = basePath.replace('/js', '') + '/zip-word-bot.json';

            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error('JSON読み込み失敗');
            this.state.flowData = await response.json();
            console.log('✅ BOTフロー読み込み完了:', this.state.flowData.version);
            return true;
        } catch (error) {
            console.error('❌ JSONファイルの読み込みエラー:', error);
            console.warn('既存の質問フローで動作します');
            return false;
        }
    },

    // ============================================
    // 状態リセット
    // ============================================
    resetState() {
        this.state.currentEntry = null;
        this.state.currentZipcode = null;
        this.state.currentKeyword = null;
        this.state.currentQuestionId = null;
        this.state.userAnswers = {};
        this.state.botActive = false;
        this.state.currentScenario = null;
        this.state.currentFlowStep = null;
        this.state.questionHistory = [];
    },

    // ============================================
    // シナリオ取得
    // ============================================
    getScenario(keyword) {
        if (!this.state.flowData || !this.state.flowData.entryScenarios) {
            return null;
        }
        return this.state.flowData.entryScenarios[keyword] || null;
    },

    // ============================================
    // 質問取得
    // ============================================
    getQuestion(questionId) {
        if (!this.state.flowData || !this.state.flowData.mainQuestions) {
            return null;
        }
        return this.state.flowData.mainQuestions[questionId] || null;
    },

    // ============================================
    // エントリポイント設定
    // ============================================
    setZipEntry(zipcode) {
        this.state.currentEntry = 'zip';
        this.state.currentZipcode = zipcode.replace('-', '');
        this.state.botActive = true;
    },

    setKeywordEntry(keyword) {
        this.state.currentEntry = 'keyword';
        this.state.currentKeyword = keyword;
        this.state.botActive = true;
    },

    // ============================================
    // 回答保存
    // ============================================
    saveAnswer(questionId, choice, index) {
        this.state.userAnswers[questionId] = {
            choice: choice,
            index: index,
            timestamp: Date.now()
        };
    },

    // ============================================
    // 進捗計算
    // ============================================
    calculateProgress(stage) {
        const progressMap = {
            1: 25,
            2: 50,
            3: 75,
            4: 100
        };
        return progressMap[stage] || 0;
    }
};

// グローバルに公開（window.BotConfigとして参照可能）
if (typeof window !== 'undefined') {
    window.BotConfig = BotConfig;
}
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
    showAIMessage(text) {
        if (!this.elements.messages) this.init();

        const container = document.createElement('div');
        container.className = 'ai-message-container new-message';
        container.innerHTML = `
            <img src="images/avatars/319260ba-0b3d-47d0-b18f-abf530c2793e.png"
                 alt="AI" class="ai-avatar">
            <div class="ai-message">${text}</div>
        `;
        this.elements.messages.appendChild(container);

        // 最初の質問（履歴が1つ以下）の場合はスクロールしない
        const history = BotConfig.state.questionHistory || [];
        if (history.length > 1) {
            this.scrollToBottom();
        }
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

        // 最初の質問（履歴が1つ以下）の場合はスクロールしない
        if (history.length > 1) {
            this.scrollToBottom();
        }
    },

    // ============================================
    // 選択肢クリア
    // ============================================
    clearChoices() {
        if (!this.elements.choices) this.init();
        this.elements.choices.innerHTML = '';
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
/**
 * ============================================
 * BOTコアエンジン（完全独立）
 * ============================================
 *
 * 目的: BOTの起動、停止、フロー制御
 * 依存: BotConfig, BotUI
 * 公開: BotCore オブジェクト
 */

const BotCore = {
    // ============================================
    // 初期化
    // ============================================
    async init() {
        console.log('🤖 BOTコアエンジン初期化中...');

        // JSON読み込み
        const success = await BotConfig.loadFlowData();
        if (!success) {
            console.warn('⚠️ BOTフローデータの読み込みに失敗。既存システムを使用します。');
            return false;
        }

        // UI初期化
        BotUI.init();

        // ブラウザバック対応
        this.setupHistoryHandler();

        console.log('✅ BOTコアエンジン初期化完了');
        return true;
    },

    // ============================================
    // ブラウザバック対応
    // ============================================
    setupHistoryHandler() {
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.botActive) {
                // BOT状態に戻る（通常は使わない）
            } else {
                // LPに戻る
                this.exitFullscreen();
            }
        });
    },

    // ============================================
    // 全画面モード開始
    // ============================================
    enterFullscreen() {
        console.log('🚀 全画面モード開始...');

        // 履歴に追加（ブラウザバックで戻れるようにする）
        history.pushState({ botActive: true }, '', '#bot-active');

        console.log('✅ 全画面モード完了');
    },

    // ============================================
    // 全画面モード終了
    // ============================================
    exitFullscreen() {
        const container = document.getElementById('gaiheki-bot-container');
        if (container) {
            container.classList.remove('fullscreen-mode');
        }

        // LP本体を再表示
        const lpContent = document.body.children;
        for (let i = 0; i < lpContent.length; i++) {
            const element = lpContent[i];
            if (element.id !== 'gaiheki-bot-container') {
                element.style.display = '';
            }
        }

        // bodyのスクロールを有効化
        document.body.style.overflow = '';

        // BOT停止
        this.stop();
    },

    // ============================================
    // 郵便番号エントリーでBOT起動
    // ============================================
    startFromZipEntry(zipcode) {
        console.log('📍 郵便番号エントリー:', zipcode);
        console.log('🔍 DEBUG: bot-core-20250106.js が読み込まれています');
        console.log('🔍 DEBUG: priceSection =', document.getElementById('priceSection'));
        console.log('🔍 DEBUG: mainContentContainer =', document.getElementById('mainContentContainer'));
        console.log('🔍 DEBUG: botParentContainer =', document.getElementById('botParentContainer'));
        console.log('🔍 DEBUG: messages =', document.getElementById('messages'));
        console.log('🔍 DEBUG: chatSection =', document.getElementById('chatSection'));

        // 全画面モード開始
        this.enterFullscreen();

        // 状態設定
        BotConfig.setZipEntry(zipcode);

        // UI初期化を確実に実行（Safari対応）
        if (!BotUI.elements.messages) {
            BotUI.init();
        }

        // メッセージクリア
        BotUI.clearMessages();
        BotUI.clearChoices();

        // 開始メッセージ
        BotUI.showAIMessage(
            'ありがとうございます。あなたに最適な業者をご紹介するため、いくつか質問させていただきます。'
        );

        // mainQuestions.Q001から開始（Safari対応：遅延を長めに）
        setTimeout(() => {
            console.log('🔍 BotQuestions確認:', window.BotQuestions ? '存在' : '未定義');
            if (window.BotQuestions && typeof window.BotQuestions.showQuestion === 'function') {
                console.log('✅ Q001を表示します');
                window.BotQuestions.showQuestion('Q001');
            } else {
                console.error('❌ BotQuestionsが読み込まれていません');
                console.error('window.BotQuestions:', window.BotQuestions);
            }
        }, 1500);
    },

    // ============================================
    // ワードリンクエントリーでBOT起動
    // ============================================
    startFromKeywordEntry(keyword) {
        console.log('🔗 ワードリンクエントリー:', keyword);

        // 全画面モード開始
        this.enterFullscreen();

        // 状態設定
        BotConfig.setKeywordEntry(keyword);

        // シナリオ取得
        const scenario = BotConfig.getScenario(keyword);
        if (!scenario) {
            BotUI.showAIMessage(
                `申し訳ございません。「${keyword}」は現在準備中です。`
            );
            setTimeout(() => {
                BotUI.showAIMessage(
                    '他のキーワードをお試しいただくか、郵便番号から始めることもできます。'
                );
            }, 1000);
            return;
        }

        // メッセージクリア
        BotUI.clearMessages();
        BotUI.clearChoices();

        // greetingメッセージ
        BotUI.showAIMessage(scenario.greeting);

        // フロー開始
        setTimeout(() => {
            if (window.BotScenarios && typeof window.BotScenarios.executeScenario === 'function') {
                window.BotScenarios.executeScenario(scenario);
            } else {
                console.error('❌ BotScenariosが読み込まれていません');
            }
        }, 1000);
    },

    // ============================================
    // BOT停止
    // ============================================
    stop() {
        console.log('🛑 BOT停止');
        BotConfig.state.botActive = false;
        BotUI.clearChoices();
    },

    // ============================================
    // BOT再起動（ランキング出現後の補助モード）
    // ============================================
    restartAsAssistant() {
        console.log('🔄 BOT再起動（補助モード）');
        BotConfig.state.botActive = true;

        BotUI.showAIMessage(
            'おすすめの業者をランキングでご紹介しました！<br>' +
            'ご不明点や気になることがあれば、いつでもお声がけください。'
        );

        setTimeout(() => {
            const choices = [
                'ランキングの見方を教えて',
                '見積もりの流れを知りたい',
                '業者の選び方のコツは？',
                '特にありません'
            ];

            BotUI.showChoices(choices, (choice, index) => {
                this.handleAssistantChoice(choice, index);
            });
        }, 1000);
    },

    // ============================================
    // 補助モードの選択肢処理
    // ============================================
    handleAssistantChoice(choice, index) {
        BotUI.showUserMessage(choice);
        BotUI.clearChoices();

        const responses = {
            0: 'ランキングは、あなたの条件に合った業者を上位に表示しています。<br>' +
               '価格・口コミ・品質など、気になる項目で並び替えもできますよ！<br>' +
               '「キープ」ボタンで気になる業者を保存しておくと便利です。',
            1: '見積もりの流れは以下の通りです：<br>' +
               '1. 気になる業者の「無料見積もり」ボタンをクリック<br>' +
               '2. 現地調査の日程調整<br>' +
               '3. 業者が訪問して建物を確認<br>' +
               '4. 正式な見積もりを受け取る<br><br>' +
               '複数の業者に依頼して比較することをおすすめします！',
            2: '業者選びのコツは3つあります：<br>' +
               '1. 複数の業者から見積もりを取って比較する<br>' +
               '2. 口コミや実績をしっかり確認する<br>' +
               '3. 保証内容とアフターフォローを確認する<br><br>' +
               '焦らず、納得できる業者を選んでくださいね！',
            3: 'かしこまりました！<br>' +
               '何かあればいつでもお声がけください。<br>' +
               '素敵な業者が見つかりますように！'
        };

        setTimeout(() => {
            BotUI.showAIMessage(responses[index]);

            if (index !== 3) {
                setTimeout(() => {
                    BotUI.showChoices(['ありがとうございました'], () => {
                        this.stop();
                    });
                }, 2000);
            } else {
                this.stop();
            }
        }, 500);
    },

    // ============================================
    // PHONE分岐（既存システムへ接続）
    // ============================================
    connectToPhoneSystem() {
        console.log('📞 PHONE分岐 - 既存システムへ接続');

        // BOTを一時停止
        BotConfig.state.botActive = false;

        // 誘導メッセージ
        BotUI.showAIMessage(
            'ありがとうございました！それでは最適な業者をご紹介するため、' +
            '最後に電話番号を教えていただけますか？'
        );

        // 選択肢をクリア
        BotUI.clearChoices();

        // 既存のshowPhoneMiniForm()を呼び出す
        setTimeout(() => {
            if (typeof window.showPhoneMiniForm === 'function') {
                window.showPhoneMiniForm();
            } else {
                console.error('❌ showPhoneMiniForm()が見つかりません');
            }
        }, 1000);
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotCore = BotCore;
}
/**
 * ============================================
 * BOTシナリオ実行エンジン（完全独立）
 * ============================================
 *
 * 目的: ワードリンクからのシナリオフロー実行
 * 依存: BotConfig, BotUI, BotQuestions
 * 公開: BotScenarios オブジェクト
 */

const BotScenarios = {
    // 現在実行中のシナリオ
    currentScenario: null,
    currentStep: null,

    // ============================================
    // シナリオ実行
    // ============================================
    executeScenario(scenario) {
        this.currentScenario = scenario;
        console.log('🎬 シナリオ実行:', scenario.displayName);

        // immediatePostalの判定
        if (scenario.immediatePostal) {
            // すぐ郵便番号を聞く
            this.executeImmediatePostalFlow(scenario);
        } else {
            // カスタムフロー（select/multiselectなど）
            this.executeCustomFlow(scenario.flow);
        }
    },

    // ============================================
    // immediatePostal=trueのフロー
    // ============================================
    executeImmediatePostalFlow(scenario) {
        // initialメッセージがあれば表示
        if (scenario.flow.initial && scenario.flow.initial.message) {
            BotUI.showAIMessage(scenario.flow.initial.message);
            setTimeout(() => {
                this.showPostalForm(scenario.flow.requestPostal);
            }, 1000);
        } else {
            this.showPostalForm(scenario.flow.requestPostal);
        }
    },

    // ============================================
    // カスタムフロー実行
    // ============================================
    executeCustomFlow(flow) {
        if (!flow || !flow.initial) {
            console.error('❌ フロー定義が不正です');
            return;
        }

        const initialStep = flow.initial;

        switch (initialStep.type) {
            case 'select':
                this.showSelectFlow(initialStep, flow.requestPostal);
                break;
            case 'multiselect':
                this.showMultiselectFlow(initialStep, flow.requestPostal);
                break;
            case 'message':
                BotUI.showAIMessage(initialStep.message);
                setTimeout(() => {
                    if (initialStep.nextAction === 'requestPostal') {
                        this.showPostalForm(flow.requestPostal);
                    }
                }, 1000);
                break;
            case 'redirect':
                if (initialStep.target === 'mainQuestions') {
                    this.redirectToMainQuestions();
                }
                break;
            default:
                console.error('❌ 不明なフロータイプ:', initialStep.type);
        }
    },

    // ============================================
    // SELECT フロー（単一選択）
    // ============================================
    showSelectFlow(initialStep, requestPostal) {
        BotUI.showAIMessage(initialStep.message);

        setTimeout(() => {
            const choices = initialStep.options.map(opt => opt.label);

            BotUI.showChoices(choices, (choice, index) => {
                const selected = initialStep.options[index];
                BotUI.showUserMessage(choice);
                BotUI.clearChoices();

                // responseがあれば表示
                if (selected.response) {
                    setTimeout(() => {
                        BotUI.showAIMessage(selected.response);
                        setTimeout(() => {
                            this.showPostalForm(requestPostal);
                        }, 1000);
                    }, 500);
                } else {
                    setTimeout(() => {
                        this.showPostalForm(requestPostal);
                    }, 500);
                }
            });
        }, 500);
    },

    // ============================================
    // MULTISELECT フロー（複数選択）
    // ============================================
    showMultiselectFlow(initialStep, requestPostal) {
        BotUI.showAIMessage(initialStep.message);

        setTimeout(() => {
            const choices = document.getElementById('choices');
            if (!choices) return;

            choices.innerHTML = '';
            const selectedValues = [];

            // チェックボックス生成
            initialStep.options.forEach(option => {
                const label = document.createElement('label');
                label.className = 'flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer mb-2';
                label.innerHTML = `
                    <input type="checkbox" value="${option.value}" class="form-checkbox w-5 h-5">
                    <span class="text-sm">${option.label}</span>
                `;
                choices.appendChild(label);

                label.querySelector('input').addEventListener('change', function() {
                    if (this.checked) {
                        selectedValues.push(option.value);
                    } else {
                        const idx = selectedValues.indexOf(option.value);
                        if (idx > -1) selectedValues.splice(idx, 1);
                    }
                });
            });

            // 決定ボタン
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'choice-btn w-full mt-4';
            confirmBtn.textContent = '決定';
            confirmBtn.addEventListener('click', () => {
                if (selectedValues.length === 0) {
                    alert('1つ以上選択してください');
                    return;
                }

                const selectedLabels = selectedValues.map(v =>
                    initialStep.options.find(o => o.value === v).label
                ).join('、');

                BotUI.showUserMessage(selectedLabels);
                BotUI.clearChoices();

                setTimeout(() => {
                    this.showPostalForm(requestPostal);
                }, 500);
            });
            choices.appendChild(confirmBtn);

            BotUI.scrollToBottom();
        }, 500);
    },

    // ============================================
    // 郵便番号フォーム表示（BOT内）
    // ============================================
    showPostalForm(postalConfig) {
        BotUI.showAIMessage(postalConfig.message);

        setTimeout(() => {
            const formHtml = `
                <div class="form-title">郵便番号を入力してください</div>
                <div class="phone-input-wrapper" style="border-color: #EF4444;">
                    <input type="text" id="postalInputBot" class="phone-input"
                           placeholder="〒 100-0001" maxlength="8">
                </div>
                <div class="phone-error" id="postalError" style="display:none;">
                    ${postalConfig.errorMessage || '正しい郵便番号を入力してください'}
                </div>
                <button id="postalSubmitBtn" class="phone-submit-btn">次へ</button>
            `;

            const formContainer = BotUI.showCustomForm({
                html: formHtml,
                submitSelector: '#postalSubmitBtn',
                onSubmit: () => this.handlePostalSubmit(postalConfig, formContainer)
            });

            // Enterキー対応
            const input = formContainer.querySelector('#postalInputBot');
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        formContainer.querySelector('#postalSubmitBtn').click();
                    }
                });
            }
        }, 500);
    },

    // ============================================
    // 郵便番号送信処理
    // ============================================
    handlePostalSubmit(postalConfig, formContainer) {
        const input = formContainer.querySelector('#postalInputBot');
        const errorDiv = formContainer.querySelector('#postalError');
        const postal = input.value.trim();

        // バリデーション
        const validation = new RegExp(postalConfig.validation || '^\\d{3}-?\\d{4}$');
        if (!validation.test(postal)) {
            errorDiv.style.display = 'block';
            return;
        }

        // 郵便番号を保存
        BotConfig.state.currentZipcode = postal.replace('-', '');

        // ユーザーメッセージとして表示
        BotUI.showUserMessage(postal);

        // フォームを非表示
        formContainer.style.display = 'none';

        // 相場表示（既存システムとの連携）
        const priceSection = document.getElementById('priceSection');
        if (priceSection) {
            priceSection.classList.remove('hidden');
            const areaName = document.getElementById('areaName');
            if (areaName) {
                areaName.textContent = '東京都千代田区の外壁塗装相場';
            }
        }

        // mainQuestionsへ
        setTimeout(() => {
            this.redirectToMainQuestions();
        }, 1500);
    },

    // ============================================
    // mainQuestionsへリダイレクト
    // ============================================
    redirectToMainQuestions() {
        console.log('🔀 mainQuestionsへリダイレクト');
        if (window.BotQuestions && typeof window.BotQuestions.showQuestion === 'function') {
            window.BotQuestions.showQuestion('Q001');
        } else {
            console.error('❌ BotQuestionsが読み込まれていません');
        }
    }
};

// ============================================
// 電話番号ミニフォーム表示（グローバル関数）
// ============================================
window.showPhoneMiniForm = function() {
    console.log('📞 電話番号ミニフォーム表示');

    const messages = document.getElementById('messages');
    if (!messages) {
        console.error('❌ #messages が見つかりません');
        return;
    }

    // フォームHTML
    const formHtml = `
        <div class="phone-mini-form">
            <div class="form-title">📞 最後に、お電話番号を教えてください</div>
            <div class="phone-input-wrapper">
                <input type="tel" id="phoneInputMini" class="phone-input" placeholder="例: 090-1234-5678" maxlength="13">
            </div>
            <div class="phone-error" id="phoneErrorMini">正しい電話番号を入力してください</div>
            <button class="phone-submit-btn" id="phoneSubmitMini">送信する</button>
        </div>
    `;

    messages.insertAdjacentHTML('beforeend', formHtml);

    // イベントリスナー
    const submitBtn = document.getElementById('phoneSubmitMini');
    const input = document.getElementById('phoneInputMini');
    const error = document.getElementById('phoneErrorMini');

    submitBtn.addEventListener('click', function() {
        const phone = input.value.trim();

        // 電話番号バリデーション
        if (!phone.match(/^0\d{1,4}-?\d{1,4}-?\d{4}$/)) {
            error.classList.add('show');
            return;
        }

        error.classList.remove('show');
        console.log('✅ 電話番号送信:', phone);

        // 成功メッセージ表示
        const formDiv = document.querySelector('.phone-mini-form');
        if (formDiv) {
            formDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 18px; font-weight: 600; color: #10B981;">送信完了！</div>
                    <div style="margin-top: 10px; color: #6B7280;">ご登録ありがとうございました。</div>
                </div>
            `;
        }
    });

    // Enterキーで送信
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitBtn.click();
        }
    });
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotScenarios = BotScenarios;
}
/**
 * ============================================
 * BOT質問フローエンジン（完全独立）
 * ============================================
 *
 * 目的: mainQuestions（Q001〜Q903）の実行
 * 依存: BotConfig, BotUI, BotCore
 * 公開: BotQuestions オブジェクト
 */

const BotQuestions = {
    // ============================================
    // 質問表示
    // ============================================
    showQuestion(questionId, skipHistory = false) {
        const question = BotConfig.getQuestion(questionId);

        if (!question) {
            console.error('❌ 質問が見つかりません:', questionId);
            return;
        }

        console.log('❓ 質問表示:', questionId, question.text);

        // 履歴に追加（戻る時はスキップ）
        if (!skipHistory) {
            BotConfig.state.questionHistory.push({
                questionId: questionId,
                question: question
            });
        }

        // 現在の質問IDを保存
        BotConfig.state.currentQuestionId = questionId;

        // 特殊な分岐：PHONE
        if (questionId === 'PHONE' || this.isPHONEBranch(question)) {
            BotCore.connectToPhoneSystem();
            return;
        }

        // AIメッセージ表示
        BotUI.showAIMessage(question.text);

        // 選択肢表示
        setTimeout(() => {
            BotUI.showChoices(question.choices, (choice, index) => {
                this.handleAnswer(question, choice, index);
            });
        }, 500);
    },

    // ============================================
    // PHONE分岐判定
    // ============================================
    isPHONEBranch(question) {
        if (!question.branches || question.branches.length === 0) {
            return false;
        }
        // すべてのbranchesが'PHONE'の場合
        return question.branches.every(b => b === 'PHONE');
    },

    // ============================================
    // 回答処理
    // ============================================
    handleAnswer(question, choice, index) {
        console.log('✅ 回答:', choice, 'index:', index);

        // ユーザーメッセージ表示
        BotUI.showUserMessage(choice);

        // 回答を保存
        BotConfig.saveAnswer(question.id || BotConfig.state.currentQuestionId, choice, index);

        // 選択肢をクリア
        BotUI.clearChoices();

        // 進捗更新
        if (question.stage) {
            const percentage = BotConfig.calculateProgress(question.stage);
            BotUI.updateProgress(percentage);
        }

        // 複数選択の場合
        if (question.multipleChoice) {
            // TODO: 複数選択の実装（現状は単一選択として処理）
            console.warn('⚠️ 複数選択は未実装です');
        }

        // 次の質問へ
        const nextQuestionId = question.branches[index];

        if (!nextQuestionId) {
            console.error('❌ 次の質問IDが見つかりません');
            return;
        }

        setTimeout(() => {
            if (nextQuestionId === 'PHONE') {
                BotCore.connectToPhoneSystem();
            } else {
                this.showQuestion(nextQuestionId);
            }
        }, 1000);
    },

    // ============================================
    // 特定の質問タイプ処理
    // ============================================

    // Q009のような条件分岐質問
    handleConditionalQuestion(question) {
        // TODO: conditional属性を持つ質問の特別処理
        this.showQuestion(question);
    },

    // Q016のような複数選択質問
    handleMultipleChoiceQuestion(question) {
        BotUI.showAIMessage(question.text);

        setTimeout(() => {
            const choices = document.getElementById('choices');
            if (!choices) return;

            choices.innerHTML = '';
            const selectedIndexes = [];

            // チェックボックス生成
            question.choices.forEach((choice, index) => {
                const label = document.createElement('label');
                label.className = 'flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer mb-2';
                label.innerHTML = `
                    <input type="checkbox" value="${index}" class="form-checkbox w-5 h-5">
                    <span class="text-sm">${choice}</span>
                `;
                choices.appendChild(label);

                label.querySelector('input').addEventListener('change', function() {
                    if (this.checked) {
                        selectedIndexes.push(index);
                    } else {
                        const idx = selectedIndexes.indexOf(index);
                        if (idx > -1) selectedIndexes.splice(idx, 1);
                    }
                });
            });

            // 決定ボタン
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'choice-btn w-full mt-4';
            confirmBtn.textContent = '決定';
            confirmBtn.addEventListener('click', () => {
                if (selectedIndexes.length === 0) {
                    alert('1つ以上選択してください');
                    return;
                }

                // 選択された選択肢をテキストで表示
                const selectedChoices = selectedIndexes.map(i => question.choices[i]).join('、');
                BotUI.showUserMessage(selectedChoices);

                // 回答を保存（最初のindexを使用）
                const firstIndex = selectedIndexes[0];
                BotConfig.saveAnswer(
                    question.id || BotConfig.state.currentQuestionId,
                    selectedChoices,
                    firstIndex
                );

                BotUI.clearChoices();

                // 進捗更新
                if (question.stage) {
                    const percentage = BotConfig.calculateProgress(question.stage);
                    BotUI.updateProgress(percentage);
                }

                // 次の質問へ（最初の選択肢のbranchを使用）
                const nextQuestionId = question.branches[firstIndex];
                setTimeout(() => {
                    if (nextQuestionId === 'PHONE') {
                        BotCore.connectToPhoneSystem();
                    } else {
                        this.showQuestion(nextQuestionId);
                    }
                }, 1000);
            });
            choices.appendChild(confirmBtn);

            BotUI.scrollToBottom();
        }, 500);
    },

    // ============================================
    // Q900シリーズ（終了質問）の処理
    // ============================================
    handleClosingQuestion(question) {
        BotUI.showAIMessage(question.text);

        setTimeout(() => {
            BotUI.showChoices(question.choices, (choice, index) => {
                BotUI.showUserMessage(choice);
                BotUI.clearChoices();

                // PHONE分岐
                const nextQuestionId = question.branches[index];
                setTimeout(() => {
                    if (nextQuestionId === 'PHONE') {
                        BotCore.connectToPhoneSystem();
                    } else {
                        this.showQuestion(nextQuestionId);
                    }
                }, 1000);
            });
        }, 500);
    },

    // ============================================
    // 戻る機能
    // ============================================
    goBack() {
        const history = BotConfig.state.questionHistory;

        console.log('🔙🔙🔙 戻る実行 - 現在の履歴数:', history.length);
        console.log('🔙 履歴の内容:', history.map(h => h.questionId));

        // 履歴が2つ未満の場合は戻れない（最初の質問の状態）
        if (history.length < 2) {
            console.log('⚠️ これ以上戻れません（最初の質問です）');
            alert('これ以上戻れません（最初の質問です）');
            return;
        }

        // 現在の質問を履歴から削除
        const removed = history.pop();
        console.log('🗑️ 履歴から削除:', removed.questionId);

        // 1つ前の質問を取得
        const previousEntry = history[history.length - 1];
        console.log('📌 1つ前の質問に戻ります:', previousEntry.questionId);
        console.log('📌 戻った後の履歴:', history.map(h => h.questionId));

        // 選択肢をクリア
        BotUI.clearChoices();

        // メッセージエリアから最後の2つだけ削除（現在の質問AI + ユーザー回答）
        // 前の質問のAIメッセージは残すことで、重複を防ぐ
        const messages = document.getElementById('messages');
        if (!messages) {
            console.error('❌ messages要素が見つかりません');
            return;
        }

        const removeCount = Math.min(2, messages.children.length);
        for (let i = 0; i < removeCount; i++) {
            if (messages.children.length > 0) {
                messages.children[messages.children.length - 1].remove();
            }
        }

        // 選択肢だけを再表示（AIメッセージは既に表示されているので表示しない）
        setTimeout(() => {
            const question = previousEntry.question;
            BotUI.showChoices(question.choices, (choice, index) => {
                this.handleAnswer(question, choice, index);
            });
        }, 100);
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotQuestions = BotQuestions;
}
/**
 * ============================================
 * BOT統合スクリプト
 * ============================================
 * estimate-keep-system に zip-word-bot.json ベースのBOTを統合
 */

// ============================================
// BOT UI関数
// ============================================

// AIメッセージ表示
function showAIMessage(text) {
    const messages = document.getElementById('messages');
    const aiMessageContainer = document.createElement('div');
    aiMessageContainer.className = 'ai-message-container new-message';
    aiMessageContainer.innerHTML = `
        <img src="images/avatars/319260ba-0b3d-47d0-b18f-abf530c2793e.png" alt="AI" class="ai-avatar">
        <div class="ai-message">${text}</div>
    `;
    messages.appendChild(aiMessageContainer);
    scrollToBotBottom();
}

// ユーザーメッセージ表示
function showUserMessage(text) {
    const messages = document.getElementById('messages');
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = text;
    messages.appendChild(userMessage);
    scrollToBotBottom();
}

// 郵便番号エントリ用のBOT初期化
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

    const messages = document.getElementById('messages');

    // AIメッセージ：相場は既に表示済みなので、直接質問開始
    showAIMessage('ありがとうございます。あなたに最適な業者をご紹介するため、いくつか質問させていただきます。');

    // mainQuestions.Q001から開始
    setTimeout(() => {
        showQuestion('Q001');
    }, 1000);
}

// 質問表示
function showQuestion(questionId) {
    const question = BotConfig.state.flowData.mainQuestions[questionId];

    if (!question) {
        console.error('質問が見つかりません:', questionId);
        return;
    }

    BotConfig.state.currentQuestionId = questionId;

    // 特殊な分岐：PHONE
    if (questionId === 'PHONE' || (question.branches && question.branches[0] === 'PHONE')) {
        connectToExistingPhoneForm();
        return;
    }

    // AIメッセージ表示
    showAIMessage(question.text);

    // 選択肢表示
    setTimeout(() => {
        showChoicesFromQuestion(question);
    }, 500);
}

// 選択肢表示
function showChoicesFromQuestion(question) {
    const choices = document.getElementById('choices');
    choices.innerHTML = '';

    question.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn w-full';
        btn.textContent = choice;
        btn.addEventListener('click', function() {
            handleQuestionAnswer(choice, index, question);
        });
        choices.appendChild(btn);
    });

    scrollToBotBottom();
}

// 回答処理
function handleQuestionAnswer(choice, index, question) {
    // ユーザーメッセージ表示
    showUserMessage(choice);

    // 回答を保存
    BotConfig.state.userAnswers[BotConfig.state.currentQuestionId] = {
        choice: choice,
        index: index
    };

    // 選択肢をクリア
    document.getElementById('choices').innerHTML = '';

    // 進捗更新
    updateProgressFromStage(question.stage);

    // 次の質問へ
    const nextQuestionId = question.branches[index];

    setTimeout(() => {
        if (nextQuestionId === 'PHONE') {
            connectToExistingPhoneForm();
        } else {
            showQuestion(nextQuestionId);
        }
    }, 1000);
}

// 進捗更新
function updateProgressFromStage(stage) {
    let percentage = 0;
    switch(stage) {
        case 1: percentage = 25; break;
        case 2: percentage = 50; break;
        case 3: percentage = 75; break;
        case 4: percentage = 100; break;
    }
    updateProgress(percentage);
}

// 既存のupdateProgress関数を使用
function updateProgress(percentage) {
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
/**
 * 電話番号入力フォーム機能
 * estimate-app専用
 */

// 電話番号入力フォームを表示する関数
function showPhoneInputForm() {
  const phoneSection = document.getElementById('phoneSection');
  if (phoneSection) {
    // スムーズにスクロールして表示
    phoneSection.style.display = 'block';
    phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    console.log('📱 電話番号フォーム表示完了');
    
    // フォーカスを電話番号入力欄に移動
    setTimeout(() => {
      const phoneInput = document.getElementById('phoneNumber');
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 500);
  }
}

// 電話番号自動フォーマット関数
function formatPhoneNumber(input) {
  let value = input.value.replace(/[^0-9]/g, ''); // 数字以外を削除
  
  if (value.length >= 3 && value.length <= 7) {
    value = value.slice(0, 3) + '-' + value.slice(3);
  } else if (value.length > 7) {
    value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
  }
  
  input.value = value;
}

// 業者名をイニシャルから実名に変更する関数
function revealCompanyNames() {
  console.log('revealCompanyNames実行開始');
  
  // グローバルフラグを設定（イニシャルに戻ることを防ぐ）
  window.namesRevealed = true;
  console.log('window.namesRevealed =', window.namesRevealed);
  
  // T社、S社などを実名に変更
  const companyNameElements = document.querySelectorAll('.company-name, h4, h3');
  console.log('会社名要素数:', companyNameElements.length);
  
  companyNameElements.forEach(element => {
    const text = element.textContent;
    if (text.includes('T社')) {
      element.textContent = text.replace('T社', '田中ホームテック');
      console.log('T社を田中ホームテックに変更');
    } else if (text.includes('S社')) {
      element.textContent = text.replace('S社', '佐藤建装');
      console.log('S社を佐藤建装に変更');
    } else if (text.includes('Y社')) {
      element.textContent = text.replace('Y社', '山田塗装工業');
      console.log('Y社を山田塗装工業に変更');
    } else if (text.includes('H社')) {
      element.textContent = text.replace('H社', 'ハート工務店');
      console.log('H社をハート工務店に変更');
    } else if (text.includes('M社')) {
      element.textContent = text.replace('M社', '松本リフォーム');
      console.log('M社を松本リフォームに変更');
    } else if (text.includes('K社')) {
      element.textContent = text.replace('K社', '加藤建設');
      console.log('K社を加藤建設に変更');
    } else if (text.includes('W社')) {
      element.textContent = text.replace('W社', '渡辺塗装店');
      console.log('W社を渡辺塗装店に変更');
    } else if (text.includes('N社')) {
      element.textContent = text.replace('N社', '中村ペイント');
      console.log('N社を中村ペイントに変更');
    }
  });
  
  // 「※電話番号入力後に詳細開示」の文言を削除
  const noteElements = document.querySelectorAll('p, span');
  noteElements.forEach(element => {
    if (element.textContent.includes('※電話番号入力後に詳細開示')) {
      element.style.display = 'none';
    }
  });
  
  // 「業者名を見る」ボタンを「無料見積もり」に変更
  const companyButtons = document.querySelectorAll('button');
  companyButtons.forEach(button => {
    if (button.textContent.includes('業者名を見る')) {
      button.innerHTML = button.innerHTML.replace('業者名を見る', '無料見積もり');
    }
  });
  
  console.log('revealCompanyNames実行完了');
}

// 電話番号入力フォームのイベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
  // 「業者名を見る」ボタンのイベントリスナー
  const showCompanyBtn = document.getElementById('showCompanyNamesFloatingBtn');
  if (showCompanyBtn) {
    showCompanyBtn.addEventListener('click', function() {
      // 電話番号入力セクションに自動スクロール
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 「もう一度見る」ボタンのイベントリスナー
  const showAgainBtn = document.getElementById('showCompanyNamesAgainBtn');
  if (showAgainBtn) {
    showAgainBtn.addEventListener('click', function() {
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 電話番号入力の「表示する」ボタンのイベントリスナー
  const showCompanyNamesBtn = document.getElementById('showCompanyNamesBtn');
  if (showCompanyNamesBtn) {
    showCompanyNamesBtn.addEventListener('click', function() {
      const phoneInput = document.getElementById('phoneNumber');
      const phoneNumber = phoneInput.value.trim();
      
      console.log('入力された電話番号:', phoneNumber, '文字数:', phoneNumber.length);
      
      if (phoneNumber.length < 8) {
        alert('正しい電話番号を入力してください');
        return;
      }
      
      console.log('電話番号検証OK、業者名を表示中...');
      
      // 電話番号入力フォームをサンクスメッセージに切り替え
      const phoneSection = document.getElementById('phoneSection');
      if (phoneSection) {
        phoneSection.innerHTML = `
          <div class="container mx-auto px-4">
            <div class="max-w-2xl mx-auto">
              <div class="bg-green-50 p-8 rounded-2xl border-2 border-green-300 shadow-lg text-center">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="font-bold text-lg sm:text-xl md:text-xl lg:text-xl text-green-800 mb-2 whitespace-nowrap">おめでとうございます！</h3>
                <p class="text-sm sm:text-base md:text-base lg:text-base text-green-700 whitespace-nowrap">無料見積もりが可能になりました！</p>
              </div>
            </div>
          </div>
        `;
      }
      
      // 業者名をイニシャルから実名に変更
      revealCompanyNames();
      
      // 下部ボタンを「無料見積もり」に変更
      const showCompanyBtn = document.getElementById('showCompanyNamesFloatingBtn');
      if (showCompanyBtn) {
        showCompanyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          業者名を見る
        `;
      }
      
      // ランキングを再描画して「無料見積もり」ボタンに更新
      if (typeof window.displayRanking === 'function') {
        window.displayRanking();
      } else {
        console.log('displayRanking関数がまだ定義されていません');
      }
      
      // 1秒後にランキングセクション上部へ素早くスクロール
      setTimeout(() => {
        const rankingSection = document.getElementById('rankingSection') || document.getElementById('companyRanking');
        if (rankingSection) {
          // 相場カードの上部に少し余白が見えるようにスクロール調整
          const areaPrice = document.getElementById('areaPrice');
          if (areaPrice) {
            const offsetPosition = areaPrice.offsetTop + 10;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          } else {
            // フォールバック：ランキングセクションにスクロール
            const offsetPosition = rankingSection.offsetTop + 10;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
      }, 1000);
      
      // 電話番号入力完了後、第4段階（最終確認）に進む
      setTimeout(() => {
        if (typeof window.proceedToStage4 === 'function') {
          window.proceedToStage4();
        } else {
          console.log('proceedToStage4関数がまだ定義されていません');
        }
      }, 3000);
    });
  }

  // キープボタン関連のイベントリスナー
  const viewKeptCompaniesTop = document.getElementById('viewKeptCompaniesTop');
  if (viewKeptCompaniesTop) {
    viewKeptCompaniesTop.addEventListener('click', function() {
      if (typeof window.showKeepBox === 'function') {
        window.showKeepBox();
      } else {
        console.log('showKeepBox関数がまだ定義されていません');
      }
    });
  }
  
  // キープボックス閉じるボタン
  const closeKeepBox = document.getElementById('closeKeepBox');
  if (closeKeepBox) {
    closeKeepBox.addEventListener('click', function() {
      if (typeof window.hideKeepBox === 'function') {
        window.hideKeepBox();
      } else {
        console.log('hideKeepBox関数がまだ定義されていません');
      }
    });
  }
  
  // モーダル背景クリックで閉じる
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.addEventListener('click', function(e) {
      if (e.target === keepBoxModal) {
        if (typeof window.hideKeepBox === 'function') {
          window.hideKeepBox();
        } else {
          console.log('hideKeepBox関数がまだ定義されていません');
        }
      }
    });
  }
});

// グローバル関数としてエクスポート
window.showPhoneInputForm = showPhoneInputForm;
window.revealCompanyNames = revealCompanyNames;
window.formatPhoneNumber = formatPhoneNumber;/**
 * ランキング表示機能
 * estimate-app専用
 */

// サンプル会社データ（モザイク処理済み）
const allCompanies = [
  { rank: 1, name: 'T社', price: '78万円〜', rating: 4.9, reviews: 245, features: ['地元密着', '保証充実', '即日対応'] },
  { rank: 2, name: 'S社', price: '83万円〜', rating: 4.7, reviews: 189, features: ['最低価格保証', '職人直営'] },
  { rank: 3, name: 'K社', price: '85万円〜', rating: 4.5, reviews: 156, features: ['定期点検付', '環境配慮'] },
  { rank: 4, name: 'P社', price: '92万円〜', rating: 4.3, reviews: 123, features: ['10年保証', '高級塗料使用'] },
  { rank: 5, name: 'M社', price: '94万円〜', rating: 4.2, reviews: 98, features: ['無料保証', '迅速対応'] },
  { rank: 6, name: 'A社', price: '96万円〜', rating: 4.1, reviews: 87, features: ['高品質塗料', '技術力'] },
  { rank: 7, name: 'B社', price: '98万円〜', rating: 4.0, reviews: 76, features: ['老舗企業', '安心実績'] },
  { rank: 8, name: 'C社', price: '99万円〜', rating: 3.9, reviews: 65, features: ['価格重視', '短期施工'] }
];

let showingAll = false;
let namesRevealed = false;

// ヒアリング段階の管理
let currentHearingStage = 0; // 0: 未開始, 1: 第1段階完了, 2: 第2段階完了, 3: 第3段階完了, 4: 第4段階完了
const realCompanies = ['田中塗装', '山田ペイント', '佐藤工業', '鈴木建装', '松本塗装', '高橋ペイント', '伊藤建装', '渡辺塗装'];

// キープリスト管理（ページ読み込み時にクリア）
let keepList = [];

// キープボタンの状態をチェックする関数（淡い色に変更）
function getKeepButtonState(companyRank) {
  const isKept = keepList.some(item => item.id === companyRank.toString());
  return {
    text: isKept ? 'キープ中！' : 'キープ',
    classes: isKept 
      ? 'keep-btn bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs flex-1'
      : 'keep-btn bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded text-xs flex-1'
  };
}

// ランキングセクション表示（モザイク付き）
function showRankingSection() {
  const rankingSection = document.getElementById('rankingSection');
  const phoneSection = document.getElementById('phoneSection');
  
  if (rankingSection) {
    rankingSection.classList.remove('hidden');
    
    // サンプルランキングデータを表示
    displayRanking();
    console.log('ランキング表示完了');
    
    // 相場セクションまでスクロール
    const areaPrice = document.getElementById('areaPrice');
    if (areaPrice) {
      // 相場カードの上部に少し余白が見えるようにスクロール調整
      const offsetPosition = areaPrice.offsetTop + 10;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    
    // 表示後にモザイクをかけるとメッセージを追加
    setTimeout(() => {
      console.log('モザイクをかけています...');
      
      // h2タイトル以外の部分にモザイクをかける（並び替えも含む）
      const rankingList = document.getElementById('rankingList');
      const sortingContainer = document.getElementById('sortingContainer');
      const sortingSection = sortingContainer ? sortingContainer.parentElement : null;
      const toggleButton = document.getElementById('toggleAllCompanies');
      
      if (rankingList) rankingList.classList.add('mosaic-blur');
      if (sortingSection) sortingSection.classList.add('mosaic-blur');
      if (toggleButton) toggleButton.parentElement.classList.add('mosaic-blur');
      
      // 不要なメッセージは削除済み（オリジナルランキングメッセージは静的HTMLで表示）
      
      // 電話番号フォームは表示しない（質問回答後または業者名クリック後に表示）
    }, 100);
  }
  
  // ソートボタンを無効化（おすすめ順以外）
  disableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
}

// 星レーティング生成関数（5つ星）
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // 満ちた星
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '★';
  }
  
  // 半分の星
  if (hasHalfStar) {
    starsHtml += '☆'; // または半分の星を表現
  }
  
  // 空の星
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '☆';
  }
  
  return `<span class="text-sm">${starsHtml}</span><span class="text-xs ml-1">${rating}</span>`;
}

// ランキング表示（正しい仕様に復元）
function displayRanking() {
  try {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) {
      console.error('rankingList要素が見つかりません');
      return;
    }
  
  // 表示する会社数を決定（初期4社、もっと見るで5~8位まで）
  const companiesToShow = showingAll ? allCompanies : allCompanies.slice(0, 4);
  
  // ランキングカードを動的生成
  rankingList.innerHTML = companiesToShow.map(company => {
    const companyName = window.namesRevealed && realCompanies[company.rank - 1] ? 
      realCompanies[company.rank - 1] : company.name;
    
    const keepButtonState = getKeepButtonState(company.rank);
    
    // 1,2,3位の数字を金銀銅色に
    let rankColorClass = 'bg-blue-500';
    if (company.rank === 1) rankColorClass = 'bg-yellow-400 text-yellow-900'; // 金
    else if (company.rank === 2) rankColorClass = 'bg-gray-400 text-gray-900'; // 銀
    else if (company.rank === 3) rankColorClass = 'bg-yellow-600 text-yellow-100'; // 銅
    
    return `
      <div class="ranking-card bg-white rounded-lg border border-gray-200 p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <div class="w-6 h-6 md:w-8 md:h-8 ${rankColorClass} rounded-full flex items-center justify-center text-xs md:text-sm font-bold mr-2 md:mr-3">
                  ${company.rank}
                </div>
                <h3 class="company-name font-bold text-sm md:text-base text-gray-900">${companyName}</h3>
              </div>
              <div class="flex items-center text-yellow-500">
                ${generateStarRating(company.rating)}
              </div>
            </div>
            
            <div class="flex items-center justify-between mb-2">
              <span class="text-orange-500 text-lg md:text-xl font-bold">${company.price}</span>
              <span class="text-xs md:text-sm text-gray-600">クチコミ(${company.reviews}件)</span>
            </div>
            
            <div class="flex flex-wrap gap-1 mb-3">
              ${company.features.map(feature => 
                `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${feature}</span>`
              ).join('')}
            </div>
            
          </div>
        </div>
        
        <!-- 3つのボタン：詳細を見る、キープ、業者名を見る -->
        <div class="flex gap-1 md:gap-2 mt-3">
          <button 
            onclick="showCompanyDetail(${company.rank})" 
            class="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 md:px-3 py-2 rounded text-xs md:text-sm font-medium flex-1"
          >
            詳細を見る
          </button>
          <button 
            onclick="toggleKeep(${company.rank}, '${companyName}')"
            class="${keepButtonState.classes} px-2 md:px-3 py-2 rounded text-xs md:text-sm font-medium flex-1"
          >
            ${keepButtonState.text}
          </button>
          <button 
            onclick="scrollToPhoneForm()" 
            class="${window.namesRevealed ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-pink-200 hover:bg-pink-300 text-pink-700'} px-2 md:px-3 py-2 rounded text-xs md:text-sm font-medium flex-1"
          >
            ${window.namesRevealed ? '無料見積もり' : '業者名を見る'}
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  console.log('ランキング表示完了（正しい仕様に復元）');
  
  } catch (error) {
    console.error('❌ ランキング表示でエラーが発生しました:', error);
    // フォールバック表示
    if (rankingList) {
      rankingList.innerHTML = '<div class="text-center py-4 text-gray-500">ランキングの読み込みに失敗しました</div>';
    }
  }
}

// 業者名の開示状態を更新（動的生成のためランキングを再描画）
function updateCompanyNames() {
  // 動的生成の場合はランキングを再描画するだけ
  // displayRanking()関数内でwindow.namesRevealedの状態をチェックして適切な表示を行う
  console.log('業者名更新処理省略（動的生成のため）');
}

// キープ機能
function toggleKeep(companyRank, companyName) {
  const existingIndex = keepList.findIndex(item => item.id === companyRank.toString());
  
  if (existingIndex > -1) {
    // 既にキープされている場合は削除
    keepList.splice(existingIndex, 1);
  } else {
    // キープされていない場合は追加
    keepList.push({
      id: companyRank.toString(),
      name: companyName,
      rank: companyRank
    });
  }
  
  // localStorageに保存
  localStorage.setItem('keepList', JSON.stringify(keepList));
  
  // 表示を更新
  displayRanking();
  updateKeepCountBadge();
  
  // キープボタンの表示制御
  const keepButton = document.getElementById('keepButton');
  if (keepButton) {
    if (keepList.length > 0) {
      keepButton.classList.remove('hidden');
    } else {
      keepButton.classList.add('hidden');
    }
  }
}

// キープ数バッジ更新
function updateKeepCountBadge() {
  const keepCountBadge = document.getElementById('keepCountBadge');
  const keepCountBadgeTop = document.getElementById('keepCountBadgeTop');
  
  if (keepList.length > 0) {
    if (keepCountBadge) {
      keepCountBadge.textContent = keepList.length;
      keepCountBadge.classList.remove('hidden');
    }
    if (keepCountBadgeTop) {
      keepCountBadgeTop.textContent = keepList.length;
      keepCountBadgeTop.classList.remove('hidden');
    }
  } else {
    if (keepCountBadge) {
      keepCountBadge.classList.add('hidden');
    }
    if (keepCountBadgeTop) {
      keepCountBadgeTop.classList.add('hidden');
    }
  }
}

// 会社詳細表示
function showCompanyDetail(companyRank) {
  const company = allCompanies.find(c => c.rank === companyRank);
  if (!company) return;
  
  const companyName = window.namesRevealed && realCompanies[company.rank - 1] ? 
    realCompanies[company.rank - 1] : company.name;
  
  // モーダル作成
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">${companyName}</h3>
        <button id="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-3">
        <div><strong>料金:</strong> ${company.price}</div>
        <div><strong>評価:</strong> ${company.rating} (${company.reviews}件)</div>
        <div><strong>特徴:</strong> ${company.features.join(', ')}</div>
        <div class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-600">この業者の詳細情報や口コミをご確認いただけます。</p>
        </div>
      </div>
      <div class="mt-4 flex gap-2">
        <button class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex-1">
          見積もり依頼
        </button>
        <button id="closeModalBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded flex-1">
          閉じる
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // モーダル閉じるイベント
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// もっと見る切り替え（簡略表示は無し）
function toggleAllCompanies() {
  if (!showingAll) {
    // もっと見るを押した時のみ5~8位まで表示
    showingAll = true;
    displayRanking();
    
    // ボタンを非表示
    const toggleButton = document.getElementById('toggleAllCompanies');
    if (toggleButton) {
      toggleButton.style.display = 'none';
    }
  }
}

// キープボックス表示
function showKeepBox() {
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.classList.remove('hidden');
    updateKeepBoxContent();
  }
}

// キープボックス非表示
function hideKeepBox() {
  const keepBoxModal = document.getElementById('keepBoxModal');
  if (keepBoxModal) {
    keepBoxModal.classList.add('hidden');
  }
}

// キープボックス内容更新
function updateKeepBoxContent() {
  const keepBoxContent = document.getElementById('keepBoxContent');
  if (!keepBoxContent) return;
  
  if (keepList.length === 0) {
    keepBoxContent.innerHTML = '<p class="text-gray-500 text-center py-4">キープ中の業者はありません</p>';
    return;
  }
  
  keepBoxContent.innerHTML = keepList.map(company => `
    <div class="border border-gray-200 rounded-lg p-3 mb-2">
      <div class="flex justify-between items-center">
        <div>
          <h4 class="font-medium">${company.name}</h4>
          <p class="text-sm text-gray-500">ランキング${company.rank}位</p>
        </div>
        <button class="text-red-500 hover:text-red-700" onclick="removeFromKeepList('${company.id}')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// キープリストから削除
function removeFromKeepList(companyId) {
  keepList = keepList.filter(item => item.id !== companyId);
  localStorage.setItem('keepList', JSON.stringify(keepList));
  
  // 表示を更新
  displayRanking();
  updateKeepCountBadge();
  updateKeepBoxContent();
  
  // キープが0になったら右上ボタンを非表示
  if (keepList.length === 0) {
    const keepButton = document.getElementById('keepButton');
    if (keepButton) {
      keepButton.classList.add('hidden');
    }
    hideKeepBox();
  }
}

// キープリストの実名更新
function updateKeepListWithRealNames() {
  keepList.forEach(item => {
    const companyIndex = parseInt(item.id) - 1;
    if (realCompanies[companyIndex]) {
      item.name = realCompanies[companyIndex];
    }
  });
  localStorage.setItem('keepList', JSON.stringify(keepList));
}

// 業者名を見るボタンで電話番号フォームにスクロール
function scrollToPhoneForm() {
  const phoneSection = document.getElementById('phoneSection');
  if (phoneSection) {
    phoneSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // フォーカスを電話番号入力欄に移動
    setTimeout(() => {
      const phoneInput = document.getElementById('phoneNumber');
      if (phoneInput) {
        phoneInput.focus();
      }
    }, 500);
  }
}

// 並び替えタブの処理（段階制限付き）
function switchSortTab(tabType) {
  console.log('ソートタブ切り替え:', tabType, 'ヒアリング段階:', currentHearingStage);
  
  // ヒアリング段階チェック（第1段階完了でソート機能解放）
  if (tabType !== 'tabRecommend' && currentHearingStage < 1) {
    console.log('第1ヒアリング段階が完了していないため、このタブは利用できません');
    return;
  }
  
  // すべてのタブの背景色をリセット（無効化されていないもののみ）
  const tabs = ['tabRecommend', 'tabCheap', 'tabReview', 'tabQuality'];
  tabs.forEach(tabId => {
    const tab = document.getElementById(tabId);
    if (tab && !tab.classList.contains('sort-tab-disabled')) {
      tab.className = tab.className.replace(/bg-\w+-\d+/g, 'bg-white');
      tab.className = tab.className.replace(/text-\w+-\d+/g, '');
      tab.classList.remove('border-blue-300', 'border-yellow-300', 'border-green-300', 'border-purple-300');
      tab.classList.add('border-gray-200', 'text-gray-700');
    }
  });
  
  // 選択されたタブの背景色を変更（無効化されていない場合のみ）
  const activeTab = document.getElementById(tabType);
  console.log('選択されたタブ:', tabType, 'ボタン要素:', activeTab);
  console.log('無効化クラス確認:', activeTab ? activeTab.classList.contains('sort-tab-disabled') : 'ボタンなし');
  console.log('現在のクラス:', activeTab ? activeTab.className : 'ボタンなし');
  
  if (activeTab && !activeTab.classList.contains('sort-tab-disabled')) {
    console.log('ボタン背景色変更を実行中...');
    activeTab.classList.remove('bg-white', 'border-gray-200');
    
    switch(tabType) {
      case 'tabRecommend':
        activeTab.classList.add('bg-blue-100', 'border-blue-300', 'text-blue-800');
        console.log('おすすめ順: 青色背景適用');
        break;
      case 'tabCheap':
        activeTab.classList.add('bg-yellow-100', 'border-yellow-300', 'text-yellow-800');
        console.log('安い順: 黄色背景適用');
        break;
      case 'tabReview':
        activeTab.classList.add('bg-green-100', 'border-green-300', 'text-green-800');
        console.log('クチコミ順: 緑色背景適用');
        break;
      case 'tabQuality':
        activeTab.classList.add('bg-purple-100', 'border-purple-300', 'text-purple-800');
        console.log('高品質順: 紫色背景適用');
        break;
    }
    console.log('変更後のクラス:', activeTab.className);
  } else {
    console.log('ボタン背景色変更をスキップ - 理由:', !activeTab ? 'ボタンが存在しない' : 'sort-tab-disabledクラスが付いている');
  }
  
  // sortingContainer（ボタンのすぐ外側）は白のまま
  const sortingContainer = document.getElementById('sortingContainer');
  const rankingSection = document.getElementById('rankingSection');
  
  if (sortingContainer) {
    // sortingContainerは常に白
    sortingContainer.className = sortingContainer.className.replace(/bg-\w+-\d+/g, '');
    sortingContainer.classList.add('bg-white');
  }
  
  // ランキングセクション全体（紫の外側エリア）の背景を変更
  console.log('ランキングセクション背景色変更開始:', rankingSection);
  if (rankingSection) {
    console.log('変更前のランキングセクションクラス:', rankingSection.className);
    
    // 既存の背景色クラスを削除
    rankingSection.className = rankingSection.className.replace(/bg-gray-\d+/g, '');
    rankingSection.className = rankingSection.className.replace(/bg-\w+-\d+/g, '');
    rankingSection.className = rankingSection.className.replace(/ranking-section-\w+/g, '');
    
    // インラインスタイルもリセット
    rankingSection.style.backgroundColor = '';
    
    let backgroundColor = '';
    let customClass = '';
    
    switch(tabType) {
      case 'tabRecommend':
        rankingSection.classList.add('bg-blue-50');
        rankingSection.classList.add('ranking-section-blue');
        backgroundColor = '#eff6ff';
        customClass = 'ranking-section-blue';
        console.log('ランキング背景: 青色適用');
        break;
      case 'tabCheap':
        rankingSection.classList.add('bg-yellow-50');
        rankingSection.classList.add('ranking-section-yellow');
        backgroundColor = '#fefce8';
        customClass = 'ranking-section-yellow';
        console.log('ランキング背景: 黄色適用');
        break;
      case 'tabReview':
        rankingSection.classList.add('bg-green-50');
        rankingSection.classList.add('ranking-section-green');
        backgroundColor = '#f0fdf4';
        customClass = 'ranking-section-green';
        console.log('ランキング背景: 緑色適用');
        break;
      case 'tabQuality':
        rankingSection.classList.add('bg-purple-50');
        rankingSection.classList.add('ranking-section-purple');
        backgroundColor = '#faf5ff';
        customClass = 'ranking-section-purple';
        console.log('ランキング背景: 紫色適用');
        break;
      default:
        rankingSection.classList.add('bg-blue-50');
        rankingSection.classList.add('ranking-section-blue');
        backgroundColor = '#eff6ff';
        customClass = 'ranking-section-blue';
        console.log('ランキング背景: デフォルト青色適用');
    }
    
    // 最終手段: インラインスタイルで直接設定
    setTimeout(() => {
      rankingSection.style.backgroundColor = backgroundColor;
      console.log('インラインスタイル設定:', backgroundColor);
      console.log('最終的な背景色:', window.getComputedStyle(rankingSection).backgroundColor);
    }, 50);
    
    console.log('変更後のランキングセクションクラス:', rankingSection.className);
    console.log('追加されたカスタムクラス:', customClass);
  } else {
    console.log('⚠️ ランキングセクションが見つかりません');
  }
}

// ソートボタンの無効化関数
function disableSortButtons(buttonIds) {
  buttonIds.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add('sort-tab-disabled');
    }
  });
}

// ソートボタンの有効化関数
function enableSortButtons(buttonIds) {
  console.log('🎯 ソートボタン有効化開始:', buttonIds);
  buttonIds.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    console.log('ボタン確認:', buttonId, 'ボタン要素:', button);
    if (button) {
      console.log('有効化前のクラス:', button.className);
      button.classList.remove('sort-tab-disabled');
      console.log('有効化後のクラス:', button.className);
    } else {
      console.log('⚠️ ボタンが見つかりません:', buttonId);
    }
  });
}

// ヒアリング段階完了処理
function completeHearingStage(stage) {
  currentHearingStage = stage;
  
  if (stage >= 1) {
    // 第1ヒアリング完了: 派手なモザイク解除エフェクト
    const rankingSection = document.getElementById('rankingSection');
    const phoneSection = document.getElementById('phoneSection');
    const overlayMessage = document.getElementById('rankingOverlayMessage');
    const rankingList = document.getElementById('rankingList');
    const sortingContainer = document.getElementById('sortingContainer');
    const toggleButton = document.getElementById('toggleAllCompanies');
    const sortingSection = document.getElementById('sortingContainer')?.parentElement;
    
    // 派手なスパークルエフェクトを作成
    const createSparkles = () => {
      const sparkleContainer = document.createElement('div');
      sparkleContainer.style.position = 'absolute';
      sparkleContainer.style.top = '0';
      sparkleContainer.style.left = '0';
      sparkleContainer.style.width = '100%';
      sparkleContainer.style.height = '100%';
      sparkleContainer.style.pointerEvents = 'none';
      sparkleContainer.style.zIndex = '1500';
      
      // 複数のスパークルを生成
      for (let i = 0; i < 15; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle-effect';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 0.5 + 's';
        sparkleContainer.appendChild(sparkle);
      }
      
      if (rankingSection) {
        rankingSection.appendChild(sparkleContainer);
        // 2秒後にスパークルコンテナを削除
        setTimeout(() => {
          if (sparkleContainer.parentNode) {
            sparkleContainer.parentNode.removeChild(sparkleContainer);
          }
        }, 2000);
      }
    };
    
    // フラッシュエフェクトを適用
    if (rankingSection) {
      rankingSection.classList.add('flash-reveal');
    }
    
    // スパークルエフェクトを開始
    createSparkles();
    
    // モザイクエフェクトを段階的に削除
    const elementsToRemoveMosaic = [
      rankingList,
      sortingSection,
      toggleButton?.parentElement,
      phoneSection
    ].filter(Boolean);
    
    elementsToRemoveMosaic.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add('mosaic-removing');
        // アニメーション完了後にモザイククラスを削除
        setTimeout(() => {
          element.classList.remove('mosaic-blur', 'mosaic-removing');
        }, 1000);
      }, index * 200); // 段階的に削除
    });
    
    // オーバーレイメッセージを派手に削除
    if (overlayMessage) {
      overlayMessage.style.animation = 'sparkleExplosion 1s ease-out forwards';
      setTimeout(() => {
        overlayMessage.remove();
      }, 1000);
    }
    
    console.log('第1ヒアリング完了: 派手なモザイク解除エフェクト実行');
    
    // 第1段階完了時にソートボタンを有効化
    enableSortButtons(['tabCheap', 'tabReview', 'tabQuality']);
    console.log('第1段階完了: 全ソートボタン有効化');
  }
  
  // 第2段階以降の処理は、chatbot.jsのtriggerSortEnableで制御
}

// グローバル関数としてエクスポート
window.displayRanking = displayRanking;
window.toggleKeep = toggleKeep;
window.showCompanyDetail = showCompanyDetail;
window.toggleAllCompanies = toggleAllCompanies;
window.showKeepBox = showKeepBox;
window.hideKeepBox = hideKeepBox;
window.removeFromKeepList = removeFromKeepList;
window.showRankingSection = showRankingSection;
window.scrollToPhoneForm = scrollToPhoneForm;
window.switchSortTab = switchSortTab;
window.completeHearingStage = completeHearingStage;
window.disableSortButtons = disableSortButtons;
window.enableSortButtons = enableSortButtons;

// 初期化時にキープリストをクリア
document.addEventListener('DOMContentLoaded', function() {
  // ページ読み込み時にlocalStorageとキープリストをクリア
  localStorage.removeItem('keepList');
  keepList = [];
  
  // キープ数バッジを更新
  updateKeepCountBadge();
  
  // キープボタンを非表示
  const keepButton = document.getElementById('keepButton');
  if (keepButton) {
    keepButton.classList.add('hidden');
  }
});/**
 * 共通ユーティリティ関数
 * estimate-app専用
 */

// チャットセッション関連
function initializeChatSession() {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  console.log('チャットセッション初期化: ', sessionId);
  
  // 簡単な検索キーワード取得（URLパラメータから）
  const urlParams = new URLSearchParams(window.location.search);
  const keyword = urlParams.get('q') || '';
  console.log('検索キーワード: ', keyword);
  
  return sessionId;
}

// 相場表示関数
function showPriceResult(postalCode) {
  // 相場セクションを表示
  const areaPrice = document.getElementById('areaPrice');
  if (areaPrice) {
    areaPrice.classList.remove('hidden');
  }
  
  // モザイクランキングも表示
  showRankingSection();
  
  console.log(`郵便番号 ${postalCode} の相場を表示しました`);
}

// ランキングセクション表示関数（ranking.jsに移行済み）

// 郵便番号検索関数（スプレッドシート連携）
async function searchByPostalCode() {
  try {
    console.time('🔍 郵便番号検索全体');
    
    const postalInput = document.getElementById('postalCode');
    if (!postalInput) {
      console.error('郵便番号入力フィールドが見つかりません');
      return;
    }
    
    const postalValue = postalInput.value.trim().replace(/[^0-9]/g, ''); // 数字のみ抽出
    console.log('🚀 郵便番号検索開始:', postalValue);
    
    if (postalValue.length < 7) {
      alert('郵便番号を正しく入力してください（7桁）');
      return;
    }
    
    // 🚀 即座にローディング開始
    console.time('🎨 UI更新処理');
    startImmediateLoading();
    console.timeEnd('🎨 UI更新処理');
    
    // 🚀 ハイブリッド検索：主要都市はローカル、その他はAPI
    console.time('🔍 ハイブリッド郵便番号検索');
    
    // 主要都市判定（東京・神奈川・千葉・埼玉・大阪・兵庫・奈良・京都・愛知・岐阜・愛媛）
    const code3 = postalValue.substring(0, 3);
    const majorCities = [
      // 東京都
      '100', '101', '102', '103', '104', '105', '106', '107', '108', '150', '151', '152', '153', '154', '155', '156', '157', '158', '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', '170', '171', '172', '173', '174', '175', '176', '177', '178', '179', '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', '190', '191', '192', '193', '194', '195', '196', '197', '198', '199',
      // 神奈川県
      '210', '211', '212', '213', '214', '215', '220', '221', '222', '223', '224', '225', '226', '227', '228', '230', '231', '232', '233', '234', '235', '236', '240', '241', '242', '243', '244', '245', '246', '247', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '259',
      // 千葉県
      '260', '261', '262', '263', '264', '265', '266', '267', '270', '271', '272', '273', '274', '275', '276', '277', '278', '279', '280', '281', '282', '283', '284', '285', '286', '287', '288', '289', '290', '291', '292', '293', '294', '295', '296', '297', '298', '299',
      // 埼玉県
      '330', '331', '332', '333', '334', '335', '336', '337', '338', '339', '340', '341', '342', '343', '344', '345', '346', '347', '348', '349', '350', '351', '352', '353', '354', '355', '356', '357', '358', '359', '360', '361', '362', '363', '364', '365', '366', '367', '368', '369',
      // 大阪府
      '530', '531', '532', '533', '534', '535', '536', '537', '538', '540', '541', '542', '543', '544', '545', '546', '547', '548', '549', '550', '551', '552', '553', '554', '555', '556', '557', '558', '559', '560', '561', '562', '563', '564', '565', '566', '567', '568', '569', '570', '571', '572', '573', '574', '575', '576', '577', '578', '579', '580', '581', '582', '583', '584', '585', '586', '587', '588', '589', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599',
      // 兵庫県
      '650', '651', '652', '653', '654', '655', '656', '657', '658', '659', '660', '661', '662', '663', '664', '665', '666', '667', '668', '669', '670', '671', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '682', '683', '684', '685', '686', '687', '688', '689', '690', '691', '692', '693', '694', '695', '696', '697', '698', '699',
      // 奈良県
      '630', '631', '632', '633', '634', '635', '636', '637', '638', '639',
      // 京都府
      '600', '601', '602', '603', '604', '605', '606', '607', '608', '610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '621', '622', '623', '624', '625', '626', '627', '628', '629',
      // 愛知県
      '440', '441', '442', '443', '444', '445', '446', '447', '448', '449', '450', '451', '452', '453', '454', '455', '456', '457', '458', '459', '460', '461', '462', '463', '464', '465', '466', '467', '468', '469', '470', '471', '472', '473', '474', '475', '476', '477', '478', '479', '480', '481', '482', '483', '484', '485', '486', '487', '488', '489', '490', '491', '492', '493', '494', '495', '496', '497', '498', '499',
      // 岐阜県
      '500', '501', '502', '503', '504', '505', '506', '507', '508', '509',
      // 愛媛県
      '790', '791', '792', '793', '794', '795', '796', '797', '798', '799'
    ];
    
    if (majorCities.includes(code3)) {
      // ⚡ 主要都市：ローカル検索（超高速）
      const localArea = getAreaFromPostalCode(postalValue);
      const areaText = `${localArea}の相場`;
      console.timeEnd('🔍 ハイブリッド郵便番号検索');
      console.log('⚡ ローカル検索成功:', areaText);
      
      console.time('🎨 結果表示処理');
      showAreaPriceWithData(areaText);
      console.timeEnd('🎨 結果表示処理');
    } else {
      // 🌐 その他地域：API検索
      console.log('🌐 その他地域 - API検索開始:', postalValue);
      console.time('📡 GAS API呼び出し');
      const addressData = await getAddressFromPostalCode(postalValue);
      console.timeEnd('📡 GAS API呼び出し');
      console.timeEnd('🔍 ハイブリッド郵便番号検索');
      
      if (addressData && addressData.success && addressData.prefecture && addressData.city) {
        const areaText = `${addressData.prefecture}${addressData.city}の相場`;
        console.log('🌐 API検索成功:', areaText);
        
        console.time('🎨 結果表示処理');
        showAreaPriceWithData(areaText);
        console.timeEnd('🎨 結果表示処理');
      } else {
        // API失敗時のフォールバック
        const fallbackArea = getAreaFromPostalCode(postalValue);
        const areaText = `${fallbackArea}の相場`;
        console.log('🔄 API失敗 - フォールバック成功:', areaText);
        
        console.time('🎨 結果表示処理');
        showAreaPriceWithData(areaText);
        console.timeEnd('🎨 結果表示処理');
      }
    }
    
    console.timeEnd('🔍 郵便番号検索全体');
  } catch (error) {
    console.error('郵便番号検索関数でエラーが発生しました:', error);
    // エラー時もフォールバック：ローカルマッピングを使用
    const fallbackArea = getAreaFromPostalCode(postalValue);
    const areaText = `${fallbackArea}の相場`;
    console.log('🔄 エラー時フォールバック検索:', areaText);
    
    console.time('🎨 結果表示処理');
    showAreaPriceWithData(areaText);
    console.timeEnd('🎨 結果表示処理');
  }
}

// 🚀 即座にローディング開始
function startImmediateLoading() {
  // 相場セクションを表示
  const areaPrice = document.getElementById('areaPrice');
  if (areaPrice) {
    areaPrice.classList.remove('hidden');
  }
  
  // 既存のローディングセクションを表示
  const priceRevealAnimation = document.getElementById('priceRevealAnimation');
  if (priceRevealAnimation) {
    priceRevealAnimation.style.display = 'block';
  }
  
  // 結果セクションを非表示
  const priceResult = document.getElementById('priceResult');
  if (priceResult) {
    priceResult.classList.add('hidden');
  }
  
  // プログレスバーの滑らかなアニメーション
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)';
    progressBar.style.transition = 'width 0.3s ease-out';
    
    // 段階的に滑らかに進行（高速化）
    setTimeout(() => { progressBar.style.width = '50%'; }, 50);
    setTimeout(() => { progressBar.style.width = '80%'; }, 150);
    setTimeout(() => { progressBar.style.width = '95%'; }, 300);
    
    // インターバルIDをクリア用に保存（実際には使用しない）
    window.currentProgressInterval = null;
  }
}

// データ取得完了後の表示（ローディング既に表示済み）
function showAreaPriceWithData(areaText = '東京都千代田区の相場') {
  console.log('showAreaPriceWithData呼び出し:', areaText);
  
  // 即座にareaNameを更新（setTimeoutの前に）
  const areaName = document.getElementById('areaName');
  if (areaName) {
    areaName.textContent = areaText;
    console.log('✅ 即座にareaName更新:', areaText);
  } else {
    console.log('❌ areaName要素が見つかりません（即座更新時）');
  }
  
  // プログレスバーを100%にして完了
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.transition = 'width 0.1s ease-in-out'; // より高速
    progressBar.style.width = '100%';
    
    // 1秒後に背景を透明に戻す
    setTimeout(() => {
      progressBar.style.background = 'transparent';
      progressBar.style.width = '0%';
    }, 1000);
  }
  
  // プログレスインターバルをクリア（新方式では不要だが念のため）
  if (window.currentProgressInterval) {
    clearInterval(window.currentProgressInterval);
  }
  
  // 少し待ってから結果を表示
  setTimeout(() => {
    // ローディングアニメーションを非表示
    const priceRevealAnimation = document.getElementById('priceRevealAnimation');
    if (priceRevealAnimation) {
      priceRevealAnimation.style.display = 'none';
    }
    
    // areaNameも更新
    const areaName = document.getElementById('areaName');
    if (areaName) {
      areaName.textContent = areaText;
      console.log('✅ areaName更新:', areaText);
    } else {
      console.log('❌ areaName要素が見つかりません');
    }
    
    // 結果セクションを表示
    const priceResult = document.getElementById('priceResult');
    if (priceResult) {
      // 結果の内容を更新
      priceResult.innerHTML = `
        <h2 class="text-center text-lg font-bold mb-3 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-kuraberu-blue mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span id="locationHeading">${areaText}</span>
        </h2>
        
        <div class="bg-white p-4 rounded-xl mb-4 border border-blue-200">
          <p class="text-sm text-gray-600 mb-1 text-center" id="buildingInfo">2F建て戸建て築25年の場合（30坪）</p>
          <div class="relative">
            <div class="text-3xl font-extrabold text-center mb-2">
              <span class="text-kuraberu-blue" id="priceRange">60万円〜180万円</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 text-center mb-2">※建物の状態や使用材料により価格は変動します</p>
        </div>
      `;
      priceResult.classList.remove('hidden');
    }
    
    // 後続処理
    completeAreaPriceDisplay();
  }, 20); // 0.02秒に短縮
}

// エリア価格表示完了後の処理
function completeAreaPriceDisplay() {
  // 電話番号入力フォームは表示しない（質問回答後またはランキング業者名クリック後に表示）
  
  // 相場セクションを表示
  const areaPrice = document.getElementById('areaPrice');
  if (areaPrice) {
    areaPrice.classList.remove('hidden');
  }
  
  // ランキングセクションを表示（モザイク付き）
  if (typeof window.showRankingSection === 'function') {
    window.showRankingSection();
  } else {
    console.log('showRankingSection関数がまだ定義されていません');
    const rankingSection = document.getElementById('rankingSection');
    if (rankingSection) {
      rankingSection.classList.remove('hidden');
      if (typeof window.displayRanking === 'function') {
        window.displayRanking();
      }
    }
  }
  
  // JSONハードコードBOTは継続使用、GPT使用BOTのみ削除
}

// 郵便番号から地域を推測する関数
function getAreaFromPostalCode(postalCode) {
  const code = postalCode.substring(0, 3); // 最初の3桁で判定
  
  // 主要な郵便番号と地域のマッピング
  const postalCodeMap = {
    // 東京都
    '100': '東京都千代田区', '101': '東京都千代田区', '102': '東京都千代田区',
    '103': '東京都中央区', '104': '東京都中央区', '105': '東京都港区',
    '106': '東京都港区', '107': '東京都港区', '108': '東京都港区',
    '150': '東京都渋谷区', '151': '東京都渋谷区', '152': '東京都目黒区',
    '153': '東京都目黒区', '154': '東京都世田谷区', '155': '東京都世田谷区',
    '156': '東京都世田谷区', '157': '東京都世田谷区', '158': '東京都世田谷区',
    '160': '東京都新宿区', '161': '東京都新宿区', '162': '東京都新宿区',
    '163': '東京都新宿区', '164': '東京都中野区', '165': '東京都中野区',
    '166': '東京都杉並区', '167': '東京都杉並区', '168': '東京都杉並区',
    '169': '東京都新宿区', '170': '東京都豊島区', '171': '東京都豊島区',
    
    // 神奈川県
    '210': '神奈川県川崎市川崎区', '211': '神奈川県川崎市中原区', '212': '神奈川県川崎市幸区',
    '213': '神奈川県川崎市高津区', '214': '神奈川県川崎市多摩区', '215': '神奈川県川崎市麻生区',
    '220': '神奈川県横浜市西区', '221': '神奈川県横浜市神奈川区', '222': '神奈川県横浜市港北区',
    '223': '神奈川県横浜市港北区', '224': '神奈川県横浜市都筑区', '225': '神奈川県横浜市青葉区',
    '226': '神奈川県横浜市緑区', '227': '神奈川県横浜市青葉区', '228': '神奈川県座間市',
    '230': '神奈川県横浜市鶴見区', '231': '神奈川県横浜市中区', '232': '神奈川県横浜市南区',
    '233': '神奈川県横浜市港南区', '234': '神奈川県横浜市港南区', '235': '神奈川県横浜市磯子区',
    '236': '神奈川県横浜市金沢区', '240': '神奈川県横浜市保土ケ谷区', '241': '神奈川県横浜市旭区',
    '242': '神奈川県横浜市旭区', '244': '神奈川県横浜市戸塚区', '245': '神奈川県横浜市戸塚区',
    '246': '神奈川県横浜市瀬谷区', '247': '神奈川県横浜市栄区', '248': '神奈川県鎌倉市',
    '249': '神奈川県逗子市', '250': '神奈川県小田原市', '251': '神奈川県藤沢市',
    '252': '神奈川県相模原市中央区', '253': '神奈川県茅ヶ崎市', '254': '神奈川県平塚市',
    
    // 千葉県
    '260': '千葉県千葉市中央区', '261': '千葉県千葉市美浜区', '262': '千葉県千葉市花見川区',
    '263': '千葉県千葉市稲毛区', '264': '千葉県千葉市若葉区', '265': '千葉県千葉市若葉区',
    '266': '千葉県千葉市緑区', '270': '千葉県松戸市', '271': '千葉県松戸市',
    '272': '千葉県市川市', '273': '千葉県船橋市', '274': '千葉県船橋市',
    
    // 埼玉県
    '330': '埼玉県さいたま市浦和区', '331': '埼玉県さいたま市西区', '332': '埼玉県川口市',
    '333': '埼玉県川口市', '334': '埼玉県川口市', '335': '埼玉県蕨市',
    '336': '埼玉県さいたま市浦和区', '337': '埼玉県さいたま市見沼区', '338': '埼玉県さいたま市中央区',
    '339': '埼玉県さいたま市岩槻区', '340': '埼玉県草加市', '341': '埼玉県三郷市',
    '342': '埼玉県吉川市', '343': '埼玉県越谷市', '344': '埼玉県春日部市',
    '345': '埼玉県南埼玉郡', '346': '埼玉県久喜市', '347': '埼玉県加須市',
    '348': '埼玉県羽生市', '349': '埼玉県蓮田市', '350': '埼玉県川越市',
    '351': '埼玉県朝霞市', '352': '埼玉県新座市', '353': '埼玉県志木市',
    '354': '埼玉県富士見市', '355': '埼玉県東松山市', '356': '埼玉県ふじみ野市',
    '357': '埼玉県飯能市', '358': '埼玉県入間市', '359': '埼玉県所沢市',
    '360': '埼玉県熊谷市', '361': '埼玉県行田市', '362': '埼玉県上尾市',
    '363': '埼玉県桶川市', '364': '埼玉県北本市', '365': '埼玉県鴻巣市',
    '366': '埼玉県深谷市', '367': '埼玉県本庄市', '368': '埼玉県秩父市', '369': '埼玉県秩父郡',
    
    // 大阪府
    '530': '大阪府大阪市北区', '531': '大阪府大阪市北区', '532': '大阪府大阪市淀川区',
    '533': '大阪府大阪市東淀川区', '534': '大阪府大阪市都島区', '535': '大阪府大阪市旭区',
    '536': '大阪府大阪市城東区', '537': '大阪府大阪市東成区', '538': '大阪府大阪市鶴見区',
    '540': '大阪府大阪市中央区', '541': '大阪府大阪市中央区', '542': '大阪府大阪市中央区',
    '543': '大阪府大阪市天王寺区', '544': '大阪府大阪市生野区', '545': '大阪府大阪市阿倍野区',
    '546': '大阪府大阪市東住吉区', '547': '大阪府大阪市平野区', '548': '大阪府大阪市西成区',
    '549': '大阪府大阪市西区', '550': '大阪府大阪市西区', '551': '大阪府大阪市大正区',
    '552': '大阪府大阪市港区', '553': '大阪府大阪市福島区', '554': '大阪府大阪市此花区',
    '555': '大阪府大阪市西淀川区', '556': '大阪府大阪市浪速区', '557': '大阪府大阪市西成区',
    '558': '大阪府大阪市住吉区', '559': '大阪府大阪市住之江区', '560': '大阪府豊中市',
    '561': '大阪府豊中市', '562': '大阪府箕面市', '563': '大阪府池田市',
    '564': '大阪府吹田市', '565': '大阪府吹田市', '566': '大阪府摂津市',
    '567': '大阪府茨木市', '568': '大阪府高槻市', '569': '大阪府高槻市',
    '570': '大阪府守口市', '571': '大阪府門真市', '572': '大阪府寝屋川市',
    '573': '大阪府枚方市', '574': '大阪府大東市', '575': '大阪府四條畷市',
    '576': '大阪府交野市', '577': '大阪府東大阪市', '578': '大阪府東大阪市',
    '579': '大阪府東大阪市', '580': '大阪府松原市', '581': '大阪府八尾市',
    '582': '大阪府柏原市', '583': '大阪府藤井寺市', '584': '大阪府富田林市',
    '585': '大阪府南河内郡', '586': '大阪府河内長野市', '587': '大阪府堺市美原区',
    '588': '大阪府大阪狭山市', '589': '大阪府大阪狭山市', '590': '大阪府堺市堺区',
    '591': '大阪府堺市北区', '592': '大阪府堺市西区', '593': '大阪府堺市南区',
    '594': '大阪府和泉市', '595': '大阪府泉大津市', '596': '大阪府岸和田市',
    '597': '大阪府貝塚市', '598': '大阪府泉佐野市', '599': '大阪府堺市中区',
    
    // 兵庫県
    '650': '兵庫県神戸市中央区', '651': '兵庫県神戸市中央区', '652': '兵庫県神戸市兵庫区',
    '653': '兵庫県神戸市長田区', '654': '兵庫県神戸市須磨区', '655': '兵庫県神戸市垂水区',
    '656': '兵庫県神戸市垂水区', '657': '兵庫県神戸市灘区', '658': '兵庫県神戸市東灘区',
    '659': '兵庫県芦屋市', '660': '兵庫県尼崎市', '661': '兵庫県尼崎市',
    '662': '兵庫県西宮市', '663': '兵庫県西宮市', '664': '兵庫県伊丹市',
    '665': '兵庫県宝塚市', '666': '兵庫県川西市', '667': '兵庫県養父市',
    '668': '兵庫県豊岡市', '669': '兵庫県丹波市', '670': '兵庫県姫路市',
    '671': '兵庫県姫路市', '672': '兵庫県姫路市', '673': '兵庫県三木市',
    '674': '兵庫県明石市', '675': '兵庫県加古川市', '676': '兵庫県高砂市',
    '677': '兵庫県西脇市', '678': '兵庫県赤穂市', '679': '兵庫県加西市',
    
    // 奈良県
    '630': '奈良県奈良市', '631': '奈良県奈良市', '632': '奈良県天理市',
    '633': '奈良県桜井市', '634': '奈良県橿原市', '635': '奈良県大和高田市',
    '636': '奈良県生駒郡', '637': '奈良県五條市', '638': '奈良県吉野郡',
    '639': '奈良県北葛城郡',
    
    // 京都府
    '600': '京都府京都市下京区', '601': '京都府京都市南区', '602': '京都府京都市上京区',
    '603': '京都府京都市北区', '604': '京都府京都市中京区', '605': '京都府京都市東山区',
    '606': '京都府京都市左京区', '607': '京都府京都市山科区', '608': '京都府京都市南区',
    '610': '京都府城陽市', '611': '京都府宇治市', '612': '京都府京都市伏見区',
    '613': '京都府久世郡', '614': '京都府八幡市', '615': '京都府京都市右京区',
    '616': '京都府京都市右京区', '617': '京都府長岡京市', '618': '京都府乙訓郡',
    '619': '京都府木津川市', '620': '京都府福知山市', '621': '京都府亀岡市',
    '622': '京都府南丹市', '623': '京都府綾部市', '624': '京都府舞鶴市',
    '625': '京都府舞鶴市', '626': '京都府宮津市', '627': '京都府京丹後市',
    '628': '京都府京丹後市', '629': '京都府綾部市',
    
    // 愛知県
    '440': '愛知県豊橋市', '441': '愛知県豊橋市', '442': '愛知県豊川市',
    '443': '愛知県蒲郡市', '444': '愛知県岡崎市', '445': '愛知県西尾市',
    '446': '愛知県安城市', '447': '愛知県碧南市', '448': '愛知県刈谷市',
    '449': '愛知県知立市', '450': '愛知県名古屋市中村区', '451': '愛知県名古屋市西区',
    '452': '愛知県名古屋市西区', '453': '愛知県名古屋市中区', '454': '愛知県名古屋市中川区',
    '455': '愛知県名古屋市港区', '456': '愛知県名古屋市熱田区', '457': '愛知県名古屋市南区',
    '458': '愛知県名古屋市緑区', '459': '愛知県名古屋市緑区', '460': '愛知県名古屋市中区',
    '461': '愛知県名古屋市東区', '462': '愛知県名古屋市北区', '463': '愛知県名古屋市守山区',
    '464': '愛知県名古屋市千種区', '465': '愛知県名古屋市名東区', '466': '愛知県名古屋市昭和区',
    '467': '愛知県名古屋市瑞穂区', '468': '愛知県名古屋市天白区', '470': '愛知県豊田市',
    '471': '愛知県豊田市', '472': '愛知県知立市', '473': '愛知県豊田市',
    '474': '愛知県大府市', '475': '愛知県半田市', '476': '愛知県東海市',
    '477': '愛知県東海市', '478': '愛知県知多市', '479': '愛知県常滑市',
    '480': '愛知県愛西市', '481': '愛知県北名古屋市', '482': '愛知県岩倉市',
    '483': '愛知県江南市', '484': '愛知県犬山市', '485': '愛知県小牧市',
    '486': '愛知県春日井市', '487': '愛知県春日井市', '488': '愛知県尾張旭市',
    '489': '愛知県瀬戸市', '490': '愛知県一宮市', '491': '愛知県一宮市',
    '492': '愛知県稲沢市', '493': '愛知県一宮市', '494': '愛知県一宮市',
    '495': '愛知県愛西市', '496': '愛知県津島市', '497': '愛知県海部郡',
    '498': '愛知県弥富市', '499': '愛知県愛西市',
    
    // 岐阜県
    '500': '岐阜県岐阜市', '501': '岐阜県岐阜市', '502': '岐阜県岐阜市',
    '503': '岐阜県大垣市', '504': '岐阜県各務原市', '505': '岐阜県美濃加茂市',
    '506': '岐阜県高山市', '507': '岐阜県多治見市', '508': '岐阜県中津川市',
    '509': '岐阜県恵那市',
    
    // 愛媛県
    '790': '愛媛県松山市', '791': '愛媛県松山市', '792': '愛媛県新居浜市',
    '793': '愛媛県西条市', '794': '愛媛県今治市', '795': '愛媛県大洲市',
    '796': '愛媛県八幡浜市', '797': '愛媛県宇和島市', '798': '愛媛県宇和島市',
    '799': '愛媛県四国中央市'
  };
  
  return postalCodeMap[code] || '東京都千代田区'; // デフォルト値
}

// 郵便番号DBスプレッドシートから住所を取得（シンプル版）
async function getAddressFromPostalCode(postalCode) {
  try {
    // 統一されたGASエンドポイントのURL（元のexec URL）
    const gasUrl = 'https://script.google.com/macros/s/AKfycbzYC8oyQjjcENCdqKbCtapUKskn7aFpIaxslR-UaW7WgdSqftdq_852R6JgEdRvffjhQA/exec';
    
    console.log('🔍 郵便番号検索:', postalCode);
    
    // notify.jsのdoGetに合わせたパラメータ形式
    const url = `${gasUrl}?action=getAddressByPostalCode&postalCode=${encodeURIComponent(postalCode)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ 郵便番号APIレスポンス詳細:', JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.log('⚠️ 郵便番号API呼び出しエラー:', error.message);
    return { success: false, error: error.toString() };
  }
}

// グローバル関数としてエクスポート
window.showAreaPrice = showAreaPrice;
window.showAreaPriceWithData = showAreaPriceWithData;
window.startImmediateLoading = startImmediateLoading;
window.showPriceResult = showPriceResult;
// window.showRankingSection = showRankingSection; // ranking.jsに移行済み
window.formatPostalCode = formatPostalCode;
// チャットボット関数は削除済み
window.searchByPostalCode = searchByPostalCode;
window.completeAreaPriceDisplay = completeAreaPriceDisplay;

// エリア価格表示（showAreaPriceWithDataから統合）
function showAreaPrice(areaText = '東京都千代田区の相場') {
  console.log('showAreaPrice呼び出し:', areaText);
  
  // すでにローディングが表示されている場合は結果表示のみ行う
  const priceRevealAnimation = document.getElementById('priceRevealAnimation');
  const isLoadingVisible = priceRevealAnimation && priceRevealAnimation.style.display !== 'none';
  
  if (isLoadingVisible) {
    // ローディングが既に表示されている場合は、showAreaPriceWithDataの処理を実行
    showAreaPriceWithData(areaText);
    return;
  }
  
  // 新規のローディング開始処理
  startImmediateLoading();
  
  // データ表示処理を少し遅延して実行
  setTimeout(() => {
    showAreaPriceWithData(areaText);
  }, 400);
}

// 検索回数制限チェック（テスト用にコメントアウト）
function checkSearchLimit() {
  // const today = new Date().toDateString();
  // const searchData = JSON.parse(localStorage.getItem('priceSearchData') || '{}');
  
  // if (searchData.date !== today) {
  //   // 新しい日付の場合、カウントをリセット
  //   searchData.date = today;
  //   searchData.count = 0;
  // }
  
  // if (searchData.count >= 5) {
  //   alert('本日の検索回数の上限に達しました。明日再度お試しください。');
  //   return false;
  // }
  
  // // 検索回数を増加
  // searchData.count++;
  // localStorage.setItem('priceSearchData', JSON.stringify(searchData));
  
  // テスト用：常にtrue
  return true;
}

// チャットボット制御関数は削除済み

// 郵便番号自動フォーマット関数（大文字→小文字、自動ハイフン）
function formatPostalCode(input) {
  // 大文字を小文字に、英数字以外を削除
  let value = input.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
  
  // アルファベットを数字に変換（郵便番号でよくある間違い）
  value = value.replace(/[A-Z]/g, function(match) {
    const alphaToNum = {
      'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2',
      'B': '8', 'G': '6', 'T': '7', 'A': '4'
    };
    return alphaToNum[match] || match;
  });
  
  // 数字のみを抽出
  value = value.replace(/[^0-9]/g, '');
  
  // 7桁で制限
  if (value.length > 7) {
    value = value.substring(0, 7);
  }
  
  // 3桁目と4桁目の間にハイフンを自動挿入
  if (value.length >= 4) {
    value = value.substring(0, 3) + '-' + value.substring(3);
  }
  
  input.value = value;
}

// ページ初期化
function initializePage() {
  // チャットセッション初期化
  const sessionId = initializeChatSession();
  
  // 基本的なイベントリスナー設定
  const postalInput = document.getElementById('postalCode');
  if (postalInput) {
    // 郵便番号入力時の自動フォーマット
    postalInput.addEventListener('input', function() {
      formatPostalCode(this);
    });
    
    postalInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (checkSearchLimit()) {
          searchByPostalCode();
        }
      }
    });
  }
  
  const searchBtn = document.getElementById('searchButton');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      if (checkSearchLimit()) {
        searchByPostalCode();
      }
    });
  }
  
  // チャットボット制御は削除済み
  
  return sessionId;
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
  initializePage();
  
  // チャットボット余白調整は削除済み
  
  console.log('estimate-app初期化完了');
});        // ============================================
        // キープ管理システム
        // ============================================
        class KeepManager {
            constructor() {
                localStorage.removeItem('keeps');
                this.keeps = [];
            }

            toggle(id, name, button) {
                const keepData = { id, name };
                const index = this.keeps.findIndex(k => k.id === id);

                if (index > -1) {
                    this.keeps.splice(index, 1);
                    button.classList.remove('active');
                } else {
                    if (this.keeps.length >= 4) {
                        alert('キープは最大4社までです');
                        return;
                    }
                    this.keeps.push(keepData);
                    button.classList.add('active');
                }

                this.save();
                this.updateBadge();
            }

            save() {
                localStorage.setItem('keeps', JSON.stringify(this.keeps));
            }

            updateBadge() {
                const badges = document.querySelectorAll('.notification-badge');
                const estimateBtnContainer = document.getElementById('estimateBtnContainer');

                badges.forEach(badge => {
                    badge.textContent = this.keeps.length;
                });

                if (estimateBtnContainer) {
                    if (this.keeps.length > 0) {
                        estimateBtnContainer.classList.remove('hidden');
                    } else {
                        estimateBtnContainer.classList.add('hidden');
                    }
                }
            }

            updateUI() {
                this.updateBadge();

                document.querySelectorAll('.keep-btn').forEach(btn => {
                    const onclickAttr = btn.getAttribute('onclick');
                    if (onclickAttr) {
                        const match = onclickAttr.match(/'([^']+)'/);
                        if (match) {
                            const btnId = match[1];
                            const isKept = this.keeps.some(k => k.id === btnId);
                            if (isKept) {
                                btn.classList.add('active');
                            } else {
                                btn.classList.remove('active');
                            }
                        }
                    }
                });
            }

            getList() {
                return this.keeps;
            }
        }

        const keepManager = new KeepManager();

        // ============================================
        // モーダル制御
        // ============================================
        function showKeepModal() {
            const modal = document.getElementById('keepModal');
            const keepList = document.getElementById('keepList');

            if (!modal || !keepList) {
                console.error('モーダル要素が見つかりません');
                return;
            }

            const keeps = keepManager.getList();
            keepList.innerHTML = keeps.map(keep => `
                <div class="p-3 border rounded-lg flex items-center justify-between">
                    <span class="font-medium">${keep.name}</span>
                    <span class="text-sm text-gray-500">キープ中</span>
                </div>
            `).join('');

            modal.classList.remove('hidden');
        }

        function closeKeepModal() {
            document.getElementById('keepModal').classList.add('hidden');
        }

        // ============================================
        // 並び替え機能
        // ============================================
        function changeSortType(type) {
            const rankingSection = document.getElementById('rankingSection');
            const rankingTitle = document.getElementById('rankingTitle');

            document.querySelectorAll('[id^="sort"]').forEach(b => {
                b.className = 'bg-white border border-gray-300 text-gray-700 py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 h-16 min-h-16';
            });

            switch(type) {
                case 'recommended':
                    document.getElementById('sortRecommended').className = 'bg-blue-100 text-blue-800 py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 h-16 min-h-16';
                    rankingSection.setAttribute('data-theme', 'blue');
                    rankingTitle.textContent = 'おすすめ業者ランキング';
                    break;
                case 'cheap':
                    document.getElementById('sortCheap').className = 'bg-orange-100 text-orange-800 py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 h-16 min-h-16';
                    rankingSection.setAttribute('data-theme', 'orange');
                    rankingTitle.textContent = 'コスパ上位ランキング';
                    break;
                case 'review':
                    document.getElementById('sortReview').className = 'bg-green-100 text-green-800 py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 h-16 min-h-16';
                    rankingSection.setAttribute('data-theme', 'green');
                    rankingTitle.textContent = 'クチコミスコアランキング';
                    break;
                case 'quality':
                    document.getElementById('sortQuality').className = 'bg-purple-100 text-purple-800 py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 h-16 min-h-16';
                    rankingSection.setAttribute('data-theme', 'purple');
                    rankingTitle.textContent = '高品質保証ランキング';
                    break;
            }
        }

        // ============================================
        // グローバル関数（BOTシステムへの接続）
        // ============================================
        function startScenario(keyword) {
            console.log('🎯 シナリオ開始:', keyword);

            // キーワードセクションを非表示
            const keywordSection = document.getElementById('keywordSection');
            if (keywordSection) {
                keywordSection.style.display = 'none';
            }

            // ヘッダーを非表示
            const header = document.querySelector('header');
            if (header) {
                header.style.display = 'none';
            }

            // 郵便番号フォームを非表示
            const postalFormSection = document.getElementById('postalFormSection');
            if (postalFormSection) {
                postalFormSection.style.display = 'none';
            }

            // メインコンテンツを表示
            const mainContentContainer = document.getElementById('mainContentContainer');
            if (mainContentContainer) {
                mainContentContainer.classList.remove('hidden');
            }

            // モバイルプログレスバーを表示
            const mobileProgressBar = document.getElementById('mobileProgressBar');
            if (mobileProgressBar) {
                mobileProgressBar.classList.remove('hidden');
            }

            // 進捗メーターを表示
            const progressMeter = document.getElementById('progressMeter');
            if (progressMeter) {
                progressMeter.classList.remove('hidden');
            }

            // BOTシステムに接続
            if (window.BotCore && typeof window.BotCore.startFromKeywordEntry === 'function') {
                window.BotCore.startFromKeywordEntry(keyword);
            } else {
                console.error('❌ BotCoreが読み込まれていません');
            }
        }

        function handlePostalCodeSearch() {
            const postalCode = document.getElementById('postalCode').value.trim();

            if (!postalCode) {
                alert('郵便番号を入力してください');
                return;
            }

            if (!postalCode.match(/^\d{3}-?\d{4}$/)) {
                alert('正しい郵便番号を入力してください（例：100-0001）');
                return;
            }

            // キーワードセクションを非表示
            const keywordSection = document.getElementById('keywordSection');
            if (keywordSection) {
                keywordSection.style.display = 'none';
            }

            // ヘッダーを非表示
            const header = document.querySelector('header');
            if (header) {
                header.style.display = 'none';
            }

            // 郵便番号フォームを非表示
            const postalFormSection = document.getElementById('postalFormSection');
            if (postalFormSection) {
                postalFormSection.style.display = 'none';
            }

            // 相場表示
            const priceSection = document.getElementById('priceSection');
            const areaName = document.getElementById('areaName');
            if (priceSection) priceSection.classList.remove('hidden');
            if (areaName) areaName.textContent = '東京都千代田区の外壁塗装相場';

            // メインコンテンツを表示
            const mainContentContainer = document.getElementById('mainContentContainer');
            if (mainContentContainer) {
                mainContentContainer.classList.remove('hidden');
            }

            // モバイルプログレスバーを表示
            const mobileProgressBar = document.getElementById('mobileProgressBar');
            if (mobileProgressBar) {
                mobileProgressBar.classList.remove('hidden');
            }

            // 進捗メーターを表示
            const progressMeter = document.getElementById('progressMeter');
            if (progressMeter) {
                progressMeter.classList.remove('hidden');
            }

            // BOTシステムに接続
            if (window.BotCore && typeof window.BotCore.startFromZipEntry === 'function') {
                window.BotCore.startFromZipEntry(postalCode);
            } else {
                console.error('❌ BotCoreが読み込まれていません');
            }
        }

        // ============================================
        // 見積もりフォーム関連の関数
        // ============================================

        // 見積もりフォームを開始
        function startEstimateForm() {
            closeKeepModal();

            // 固定の見積もりボタンを非表示
            const estimateBtnContainer = document.getElementById('estimateBtnContainer');
            if (estimateBtnContainer) {
                estimateBtnContainer.classList.add('hidden');
            }

            document.getElementById('estimateFormModal').classList.remove('hidden');

            // 郵便番号を自動セット
            const savedPostalCode = localStorage.getItem('userPostalCode') || document.getElementById('postalCode')?.value;
            if (savedPostalCode) {
                document.getElementById('propertyZip').value = savedPostalCode;
                fetchAddress(savedPostalCode, 'property');
            }
        }

        // 見積もりフォームを閉じる
        function closeEstimateForm() {
            document.getElementById('estimateFormModal').classList.add('hidden');
            // Step1に戻す
            document.getElementById('step1').classList.remove('hidden');
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('currentStep').textContent = '1';
            document.getElementById('stepPercent').textContent = '50';
            document.getElementById('stepProgress').style.width = '50%';

            // 固定の見積もりボタンを再表示
            const estimateBtnContainer = document.getElementById('estimateBtnContainer');
            if (estimateBtnContainer) {
                estimateBtnContainer.classList.remove('hidden');
            }
        }

        // 自宅住所の表示切り替え
        function toggleHomeAddress() {
            const checkbox = document.getElementById('differentHome');
            const homeAddressFields = document.getElementById('homeAddressSection');
            if (checkbox.checked) {
                homeAddressFields.classList.remove('hidden');
            } else {
                homeAddressFields.classList.add('hidden');
            }
        }

        // 次のステップへ
        function nextStep() {
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');

            // バリデーション
            const name = document.getElementById('userName').value.trim();
            const street = document.getElementById('propertyStreet').value.trim();

            if (!name) {
                alert('お名前を入力してください');
                return;
            }

            if (!street) {
                alert('番地を入力してください');
                return;
            }

            // 自宅住所が異なる場合のバリデーション
            if (document.getElementById('differentHome').checked) {
                const homePostal = document.getElementById('homeZip').value.trim();
                const homeStreet = document.getElementById('homeStreet').value.trim();

                if (!homePostal) {
                    alert('自宅の郵便番号を入力してください');
                    return;
                }

                if (!homeStreet) {
                    alert('自宅の番地を入力してください');
                    return;
                }
            }

            // ステップ切り替え
            step1.classList.add('hidden');
            step2.classList.remove('hidden');

            // プログレスバー更新
            document.getElementById('currentStep').textContent = '2';
            document.getElementById('stepPercent').textContent = '100';
            document.getElementById('stepProgress').style.width = '100%';

            // 現地調査希望日時の動的生成
            generateSurveyDates();
        }

        // 前のステップへ
        function prevStep() {
            const step1 = document.getElementById('step1');
            const step2 = document.getElementById('step2');

            step2.classList.add('hidden');
            step1.classList.remove('hidden');

            // プログレスバー更新
            document.getElementById('currentStep').textContent = '1';
            document.getElementById('stepPercent').textContent = '50';
            document.getElementById('stepProgress').style.width = '50%';
        }

        // 郵便番号から住所を取得
        async function fetchAddress(postalCode, type = 'property') {
            // ハイフンを除去
            const cleanPostalCode = postalCode.replace(/-/g, '');

            try {
                const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const address = `${result.address1}${result.address2}${result.address3}`;

                    if (type === 'property') {
                        document.getElementById('propertyAddress').value = address;
                    } else {
                        document.getElementById('homeAddress').value = address;
                    }
                }
            } catch (error) {
                console.error('住所の取得に失敗しました:', error);
            }
        }

        // 現地調査希望日時の生成
        function generateSurveyDates() {
            const container = document.getElementById('surveyDates');

            // 曜日と時間帯のオプション
            const options = [
                { value: '月曜_午前', label: '月曜日 午前' },
                { value: '月曜_午後', label: '月曜日 午後' },
                { value: '火曜_午前', label: '火曜日 午前' },
                { value: '火曜_午後', label: '火曜日 午後' },
                { value: '水曜_午前', label: '水曜日 午前' },
                { value: '水曜_午後', label: '水曜日 午後' },
                { value: '木曜_午前', label: '木曜日 午前' },
                { value: '木曜_午後', label: '木曜日 午後' },
                { value: '金曜_午前', label: '金曜日 午前' },
                { value: '金曜_午後', label: '金曜日 午後' },
                { value: '土曜_午前', label: '土曜日 午前' },
                { value: '土曜_午後', label: '土曜日 午後' },
                { value: '日曜_午前', label: '日曜日 午前' },
                { value: '日曜_午後', label: '日曜日 午後' },
                { value: '未定', label: '未定' }
            ];

            // チェックボックスを生成
            let html = '';
            for (let i = 0; i < options.length - 1; i += 2) {
                html += `<div class="grid grid-cols-2 gap-2">`;
                html += `
                    <label class="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" name="surveyDate" value="${options[i].value}" class="form-checkbox">
                        <span class="text-sm">${options[i].label}</span>
                    </label>
                `;
                if (i + 1 < options.length - 1) {
                    html += `
                        <label class="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" name="surveyDate" value="${options[i+1].value}" class="form-checkbox">
                            <span class="text-sm">${options[i+1].label}</span>
                        </label>
                    `;
                }
                html += `</div>`;
            }
            // 未定は別枠で表示
            html += `
                <label class="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer mt-2">
                    <input type="checkbox" name="surveyDate" value="${options[options.length-1].value}" class="form-checkbox">
                    <span class="text-sm">${options[options.length-1].label}</span>
                </label>
            `;
            container.innerHTML = html;
        }

        // フォーム送信
        async function submitForm() {
            // 選択された日時を取得
            const selectedDates = Array.from(document.querySelectorAll('input[name="surveyDate"]:checked'))
                .map(cb => cb.value);

            if (selectedDates.length === 0) {
                alert('現地調査希望日時を1つ以上選択してください');
                return;
            }

            // フォームデータを収集
            const formData = {
                // ステップ1
                name: document.getElementById('userName').value,
                propertyAddress: {
                    postalCode: document.getElementById('propertyZip').value,
                    city: document.getElementById('propertyAddress').value,
                    street: document.getElementById('propertyStreet').value
                },
                isDifferentHome: document.getElementById('differentHome').checked,
                email: document.getElementById('userEmail').value,

                // ステップ2
                surveyDates: selectedDates,
                requests: document.getElementById('requests').value,

                // キープ業者
                keepCompanies: keepManager.getList()
            };

            // 自宅住所が異なる場合
            if (formData.isDifferentHome) {
                formData.homeAddress = {
                    postalCode: document.getElementById('homeZip').value,
                    city: document.getElementById('homeAddress').value,
                    street: document.getElementById('homeStreet').value
                };
            }

            console.log('送信データ:', formData);

            // 完了画面を表示
            showCompletionScreen();
        }

        // 完了画面を表示
        function showCompletionScreen() {
            const modal = document.getElementById('estimateFormModal');

            modal.innerHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[3000]">
                    <div class="bg-white rounded-lg max-w-md w-full p-6">
                        <div class="text-center">
                            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h2 class="text-2xl font-bold mb-2">送信完了しました！</h2>
                            <p class="text-gray-600 mb-4">
                                見積もり依頼を受け付けました。
                            </p>
                            <div class="bg-orange-50 border border-orange-300 p-4 rounded-lg mb-4">
                                <p class="font-semibold text-orange-800 mb-2">重要なお知らせ</p>
                                <p class="text-sm text-gray-700">
                                    弊社オペレーターから3分ほどで終わる内容確認のお電話が入ります（平均10分以内）<br>
                                    ご対応よろしくお願いします。
                                </p>
                                <p class="text-lg font-bold text-orange-800 mt-2">
                                    電話番号：090-1994-7162
                                </p>
                            </div>
                            <div class="text-left bg-blue-50 p-4 rounded-lg mb-6">
                                <p class="font-semibold mb-2">今後の流れ</p>
                                <ol class="text-sm space-y-1">
                                    <li>1. 業者から連絡が入ります</li>
                                    <li>2. 現地調査の日程を調整</li>
                                    <li>3. 正式な見積もりをご提出</li>
                                </ol>
                            </div>
                            <button onclick="window.close();" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition w-full font-bold">
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // 電話番号フォーム用の関数（既存システムとの互換性）
        function showPhoneMiniForm() {
            console.log('📞 電話番号フォーム表示');

            const messages = document.getElementById('messages');
            if (!messages) {
                console.error('❌ messages要素が見つかりません');
                return;
            }

            const formContainer = document.createElement('div');
            formContainer.className = 'phone-mini-form';
            formContainer.innerHTML = `
                <div class="form-title">
                    電話番号（ショートメッセージ）
                </div>
                <div class="phone-input-wrapper">
                    <input type="tel" id="phoneInput" class="phone-input"
                           placeholder="08012345678"
                           maxlength="11"
                           inputmode="numeric"
                           pattern="[0-9]*">
                </div>
                <div class="phone-error" id="phoneError">
                    正しい電話番号を入力してください
                </div>
                <button id="phoneSubmitBtn" class="phone-submit-btn" disabled>
                    結果を受け取る
                </button>
            `;
            messages.appendChild(formContainer);

            // スクロール
            if (window.BotUI && typeof window.BotUI.scrollToBottom === 'function') {
                window.BotUI.scrollToBottom();
            }

            // イベントリスナー設定
            const phoneInput = document.getElementById('phoneInput');
            const submitBtn = document.getElementById('phoneSubmitBtn');
            const phoneError = document.getElementById('phoneError');

            phoneInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');

                if (/^0[0-9]{9,10}$/.test(this.value)) {
                    submitBtn.disabled = false;
                    phoneError.classList.remove('show');
                } else {
                    submitBtn.disabled = true;
                    if (this.value.length >= 10) {
                        phoneError.classList.add('show');
                    }
                }
            });

            submitBtn.addEventListener('click', () => {
                const phone = phoneInput.value;
                if (/^0[0-9]{9,10}$/.test(phone)) {
                    submitPhoneNumber(phone);
                }
            });
        }

        function submitPhoneNumber(phone) {
            console.log('📞 電話番号送信:', phone);
            localStorage.setItem('userPhone', phone);

            const formElements = document.querySelectorAll('.phone-mini-form');
            formElements.forEach(el => {
                el.style.opacity = '0.5';
                const btn = el.querySelector('button');
                const input = el.querySelector('input');
                if (btn) btn.disabled = true;
                if (input) input.disabled = true;
            });

            setTimeout(() => {
                // モザイク解除
                const rankingContent = document.getElementById('rankingContent');
                if (rankingContent) {
                    rankingContent.classList.remove('mosaic');
                }

                const mosaicMessage = document.getElementById('mosaicMessage');
                if (mosaicMessage) {
                    mosaicMessage.style.display = 'none';
                }

                // AIメッセージ
                if (window.BotUI && typeof window.BotUI.showAIMessage === 'function') {
                    window.BotUI.showAIMessage('分析が完了しました！<br>あなたの条件に最適な業者をランキング形式でご紹介します。');
                }

                // 進捗100%
                if (window.BotUI && typeof window.BotUI.updateProgress === 'function') {
                    window.BotUI.updateProgress(100);
                }
            }, 1000);
        }

        // ============================================
        // 初期化
        // ============================================
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('🚀 システム初期化開始');

            // BOTシステム初期化
            if (window.BotCore && typeof window.BotCore.init === 'function') {
                await window.BotCore.init();
            } else {
                console.error('❌ BotCoreが読み込まれていません');
            }

            const estimateBtnContainer = document.getElementById('estimateBtnContainer');
            if (estimateBtnContainer) {
                estimateBtnContainer.classList.add('hidden');
            }

            const badges = document.querySelectorAll('.notification-badge');
            badges.forEach(badge => {
                badge.textContent = '0';
            });

            // 検索ボタンイベント
            const searchButton = document.getElementById('searchButton');
            if (searchButton) {
                searchButton.addEventListener('click', handlePostalCodeSearch);
            }

            // Enterキー対応
            const postalCode = document.getElementById('postalCode');
            if (postalCode) {
                postalCode.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        handlePostalCodeSearch();
                    }
                });
            }

            keepManager.updateUI();

            console.log('✅ システム初期化完了');
        });

    // ============================================
    // グローバルAPI公開
    // ============================================

    window.GaihekiSystem = {
        /**
         * キーワードからBOTを起動
         * @param {string} keyword - キーワード（例: '塗料', 'クチコミ'）
         */
        startKeyword: function(keyword) {
            console.log('🎯 キーワードエントリー:', keyword);
            if (typeof startKeywordFlow === 'function') {
                startKeywordFlow(keyword);
            } else {
                console.error('startKeywordFlow関数が見つかりません');
            }
        },

        /**
         * 郵便番号から検索を開始
         * @param {string} postalCode - 郵便番号（例: '100-0001'）
         */
        startPostalCode: function(postalCode) {
            console.log('📍 郵便番号エントリー:', postalCode);
            if (typeof searchPostalCode === 'function') {
                searchPostalCode(postalCode);
            } else {
                console.error('searchPostalCode関数が見つかりません');
            }
        },

        /**
         * システム初期化
         */
        init: function() {
            console.log('🚀 外壁塗装くらべるシステム初期化');

            // zip-word-bot.jsonを読み込み
            if (typeof BotConfig !== 'undefined' && typeof BotConfig.loadFlowData === 'function') {
                BotConfig.loadFlowData();
            }
        }
    };

    // 自動初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            GaihekiSystem.init();
        });
    } else {
        GaihekiSystem.init();
    }

})();

// ============================================
// グローバル関数を追加公開（後方互換性）
// ============================================
if (typeof startScenario !== 'undefined') {
    window.startScenario = startScenario;
}
