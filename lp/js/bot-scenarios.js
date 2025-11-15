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

                // ワードリンク回答を保存（AV列: ワードリンク回答）
                const wordLinkAnswer = `${initialStep.message} → ${choice}`;
                BotConfig.saveAnswer('wordLinkAnswer', wordLinkAnswer, index);

                // V1747-UX: 初期質問回答で進捗度を上げる（8%）
                if (typeof window.updateProgress === 'function') {
                    window.updateProgress(8);
                    console.log('📊 進捗更新: 初期質問回答（ワードリンク） → 8%');
                }

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

                // V1747-UX: 初期質問回答で進捗度を上げる（8%）
                if (typeof window.updateProgress === 'function') {
                    window.updateProgress(8);
                    console.log('📊 進捗更新: 初期質問回答（ワードリンク・複数選択） → 8%');
                }

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
                <div class="phone-input-wrapper">
                    <input type="text" id="postalInputBot" class="phone-input"
                           placeholder="例：100-0001" maxlength="8">
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
    async handlePostalSubmit(postalConfig, formContainer) {
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
        BotConfig.state.postalCodeEntered = true;

        // sessionStorageにも保存（データ永続化）
        try {
            sessionStorage.setItem('bot_zipcode', postal.replace('-', ''));
            console.log('✅ 郵便番号をsessionStorageに保存:', postal.replace('-', ''));
        } catch (e) {
            console.warn('⚠️ sessionStorage保存失敗:', e);
        }

        // V1752-FEAT: ZipCloud APIで住所フリガナを取得（同期的に待機）
        await this.fetchAddressKana(postal.replace('-', ''));

        // ユーザーメッセージとして表示
        BotUI.showUserMessage(postal);

        // フォームを非表示
        formContainer.style.display = 'none';

        // 地域名を取得・設定
        if (typeof window.getAreaFromPostalCode === 'function') {
            const areaInfo = window.getAreaFromPostalCode(postal.replace('-', ''));

            // 都道府県と市区町村に分割してwindowプロパティに保存
            const prefectureMatch = areaInfo.match(/(.*?[都道府県])(.*)/);
            if (prefectureMatch) {
                window.propertyPrefecture = prefectureMatch[1];
                window.propertyCity = prefectureMatch[2];

                // V1753-FIX: 町名を市区町村に結合（P列 = 市区町村 + 町名）
                if (window.propertyTown) {
                    window.propertyCity = window.propertyCity + window.propertyTown;
                }

                console.log('✅ 住所情報を保存（シナリオ）:', {
                    prefecture: window.propertyPrefecture,
                    city: window.propertyCity,
                    town: window.propertyTown || ''
                });
            } else {
                window.propertyPrefecture = '';
                window.propertyCity = areaInfo;

                // V1753-FIX: 町名を市区町村に結合
                if (window.propertyTown) {
                    window.propertyCity = window.propertyCity + window.propertyTown;
                }

                console.log('⚠️ 都道府県パターンマッチ失敗（シナリオ）、全体を市区町村として保存:', areaInfo);
            }
        }

        // V1713-FIX: ランキングプレースホルダー表示（即座）
        setTimeout(() => {
            console.log('✅ ランキングプレースホルダー表示（空配列）');

            // mainContentContainerを表示（2カラムレイアウト）
            const mainContentContainer = document.getElementById('mainContentContainer');
            if (mainContentContainer) {
                mainContentContainer.classList.remove('hidden');
                mainContentContainer.style.display = 'flex';
                console.log('✅ mainContentContainer表示（2カラムレイアウト）');
            }

            // ランキングセクションを表示
            const rankingSection = document.getElementById('rankingSection');
            if (rankingSection) {
                rankingSection.classList.remove('hidden');
                console.log('✅ ランキングセクション表示');
            }

            // ランキング表示（プレースホルダー）
            if (typeof window.displayRanking === 'function') {
                window.displayRanking();
            }

            // 相場セクションを表示
            const priceSection = document.getElementById('priceSection');
            if (priceSection) {
                priceSection.classList.remove('hidden');
                priceSection.style.display = 'block';
                console.log('✅ 相場セクション表示完了（郵便番号入力後）');
            }

            // 地域名を市区町村のみで表示（県名なし）
            const areaName = document.getElementById('areaName');
            if (areaName && window.propertyCity) {
                areaName.textContent = `${window.propertyCity}の相場`;
                console.log('✅ areaName更新（シナリオ）:', `${window.propertyCity}の相場`);
            }

            // V1747-UX: 郵便番号入力完了で進捗度を上げる（13%）
            if (typeof window.updateProgress === 'function') {
                window.updateProgress(13);
                console.log('📊 進捗更新: 郵便番号入力完了（シナリオ） → 13%');
            }

            // AIメッセージ表示
            BotUI.showAIMessage('ありがとうございます。あなたに最適な業者をご紹介するため、いくつか質問させていただきます。');

            // mainQuestionsへ（即座に開始）
            setTimeout(() => {
                this.redirectToMainQuestions();
            }, 1000);
        }, 500);

        // V1713-FIX: GASからランキングをバックグラウンドで取得（非ブロッキング）
        console.log('🏆 郵便番号入力後、GASからランキングを取得します（バックグラウンド）');
        if (typeof window.fetchRankingFromGAS === 'function') {
            window.fetchRankingFromGAS().then((success) => {
                if (success) {
                    console.log('✅ ランキング取得成功（バックグラウンド）');
                    // デフォルトはおすすめ順
                    if (typeof window.updateAllCompaniesFromDynamic === 'function') {
                        window.updateAllCompaniesFromDynamic('recommended');
                    }
                    // ランキング再表示
                    if (typeof window.displayRanking === 'function') {
                        window.displayRanking();
                    }
                } else {
                    console.warn('⚠️ ランキング取得失敗、プレースホルダー維持');
                }
            }).catch(err => {
                console.error('❌ ランキング取得エラー（非致命的）:', err);
            });
        }
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
    },

    // ============================================
    // V1752-FEAT: ZipCloud APIで住所フリガナを取得
    // ============================================
    async fetchAddressKana(zipcode) {
        try {
            console.log('📍 ZipCloud APIで住所フリガナ取得開始:', zipcode);

            const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 200 && data.results && data.results.length > 0) {
                const result = data.results[0];

                // 住所フリガナを結合（都道府県カナ + 市区町村カナ + 町域カナ）
                const addressKana = result.kana1 + result.kana2 + result.kana3;

                // V1753-FIX: 町名も保存（P列に市区町村+町名を入れるため）
                const townName = result.address3 || '';

                // windowプロパティに保存（propertyPrefecture/propertyCityと同じパターン）
                window.addressKana = addressKana;
                window.propertyTown = townName;

                // BotConfigにも保存
                BotConfig.state.addressKana = addressKana;
                BotConfig.state.propertyTown = townName;

                // sessionStorageにも保存（データ永続化）
                try {
                    sessionStorage.setItem('bot_addressKana', addressKana);
                    sessionStorage.setItem('bot_propertyTown', townName);
                    console.log('✅ 住所フリガナ・町名をsessionStorageに保存:', { kana: addressKana, town: townName });
                } catch (e) {
                    console.warn('⚠️ sessionStorage保存失敗:', e);
                }

                console.log('✅ ZipCloud API成功:', {
                    prefecture: result.address1,
                    city: result.address2,
                    town: result.address3,
                    kana: addressKana
                });
            } else {
                console.warn('⚠️ ZipCloud API: 該当する住所が見つかりません');
                BotConfig.state.addressKana = '';
            }
        } catch (error) {
            console.error('❌ ZipCloud API エラー:', error);
            BotConfig.state.addressKana = '';
        }
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.BotScenarios = BotScenarios;
}
