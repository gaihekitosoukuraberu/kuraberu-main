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
            // connectToPhoneSystemはasync関数だが、ここではawaitしない（バックグラウンドで実行）
            BotCore.connectToPhoneSystem();
            return;
        }

        // 複数選択の質問の場合
        if (question.multipleChoice) {
            this.handleMultipleChoiceQuestion(question);
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

        // Q016の回答後：回答に応じてソート順を変更
        const currentQuestionId = question.id || BotConfig.state.currentQuestionId;
        if (currentQuestionId === 'Q016') {
            console.log('🏆 Q016回答後、選択内容に応じてソート順を変更します');

            // Q016の選択肢とソートタイプのマッピング
            // 0: "なるべく安く" → cheap
            // 1: "口コミや評判が気になる" → review
            // 2: "品質や保証が大事" → premium
            // 3: "親身になってくれる・人柄の良さ" → recommended
            const sortTypeMap = ['cheap', 'review', 'premium', 'recommended'];
            const sortType = sortTypeMap[index] || 'recommended';

            // BotConfigに保存（connectToPhoneSystemで使用）
            BotConfig.state.sortOrder = sortType;

            console.log(`📊 選択: "${choice}" (index: ${index}) → ソートタイプ: ${sortType} (保存完了)`);

            setTimeout(async () => {
                // ランキング取得
                if (typeof window.fetchRankingFromGAS === 'function') {
                    const success = await window.fetchRankingFromGAS();
                    if (success) {
                        console.log('✅ ランキング取得成功、スプシの会社名でallCompaniesを更新');

                        // GASから取得したデータでallCompaniesを更新（選択されたソート順で）
                        if (typeof window.updateAllCompaniesFromDynamic === 'function') {
                            window.updateAllCompaniesFromDynamic(sortType);
                            console.log(`✅ allCompanies更新完了、${sortType}順で表示`);
                        }

                        // ランキング表示を更新
                        if (typeof window.displayRanking === 'function') {
                            window.displayRanking();
                        }

                        // ソートタブの背景色も変更
                        if (typeof window.switchSortTab === 'function') {
                            const tabMap = {
                                'recommended': 'tabRecommend',
                                'cheap': 'tabCheap',
                                'review': 'tabReview',
                                'premium': 'tabQuality'
                            };
                            const tabId = tabMap[sortType];
                            if (tabId) {
                                window.switchSortTab(tabId);
                                console.log(`🎨 ソートタブの背景色を変更: ${tabId}`);
                            }
                        }
                    } else {
                        console.warn('⚠️ ランキング取得失敗、デフォルトデータで表示');

                        // ランキング表示を更新
                        if (typeof window.displayRanking === 'function') {
                            window.displayRanking();
                        }

                        // 失敗時でもソートタブの背景色を変更
                        if (typeof window.switchSortTab === 'function') {
                            const tabMap = {
                                'recommended': 'tabRecommend',
                                'cheap': 'tabCheap',
                                'review': 'tabReview',
                                'premium': 'tabQuality'
                            };
                            const tabId = tabMap[sortType];
                            if (tabId) {
                                window.switchSortTab(tabId);
                                console.log(`🎨 ソートタブの背景色を変更（失敗時）: ${tabId}`);
                            }
                        }
                    }
                }

                // 次の質問へ
                if (nextQuestionId === 'PHONE') {
                    BotCore.connectToPhoneSystem();
                } else {
                    this.showQuestion(nextQuestionId);
                }
            }, 1000);
        } else {
            // Q016以外：通常の処理
            setTimeout(() => {
                if (nextQuestionId === 'PHONE') {
                    BotCore.connectToPhoneSystem();
                } else {
                    this.showQuestion(nextQuestionId);
                }
            }, 1000);
        }
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

                // Q016の回答後：回答に応じてソート順を変更
                const currentQuestionId = question.id || BotConfig.state.currentQuestionId;
                if (currentQuestionId === 'Q016') {
                    console.log('🏆 Q016回答後、選択内容に応じてソート順を変更します');

                    // Q016の選択肢とソートタイプのマッピング（最初の選択を優先）
                    // 0: "なるべく安く" → cheap
                    // 1: "口コミや評判が気になる" → review
                    // 2: "品質や保証が大事" → premium
                    // 3: "親身になってくれる・人柄の良さ" → recommended
                    const sortTypeMap = ['cheap', 'review', 'premium', 'recommended'];
                    const sortType = sortTypeMap[firstIndex] || 'recommended';

                    // BotConfigに保存（connectToPhoneSystemで使用）
                    BotConfig.state.sortOrder = sortType;

                    console.log(`📊 選択: "${selectedChoices}" (first index: ${firstIndex}) → ソートタイプ: ${sortType} (保存完了)`);

                    // 次の質問へ（最初の選択肢のbranchを使用）
                    const nextQuestionId = question.branches[firstIndex];

                    setTimeout(async () => {
                        // ランキング取得
                        if (typeof window.fetchRankingFromGAS === 'function') {
                            const success = await window.fetchRankingFromGAS();
                            if (success) {
                                console.log('✅ ランキング取得成功、スプシの会社名でallCompaniesを更新');

                                // GASから取得したデータでallCompaniesを更新（選択されたソート順で）
                                if (typeof window.updateAllCompaniesFromDynamic === 'function') {
                                    window.updateAllCompaniesFromDynamic(sortType);
                                    console.log(`✅ allCompanies更新完了、${sortType}順で表示`);
                                }

                                // ランキング表示を更新
                                if (typeof window.displayRanking === 'function') {
                                    window.displayRanking();
                                }

                                // ソートタブの背景色も変更
                                if (typeof window.switchSortTab === 'function') {
                                    const tabMap = {
                                        'recommended': 'tabRecommend',
                                        'cheap': 'tabCheap',
                                        'review': 'tabReview',
                                        'premium': 'tabQuality'
                                    };
                                    const tabId = tabMap[sortType];
                                    if (tabId) {
                                        window.switchSortTab(tabId);
                                        console.log(`🎨 ソートタブの背景色を変更: ${tabId}`);
                                    }
                                }
                            } else {
                                console.warn('⚠️ ランキング取得失敗、デフォルトデータで表示');

                                // ランキング表示を更新
                                if (typeof window.displayRanking === 'function') {
                                    window.displayRanking();
                                }

                                // 失敗時でもソートタブの背景色を変更
                                if (typeof window.switchSortTab === 'function') {
                                    const tabMap = {
                                        'recommended': 'tabRecommend',
                                        'cheap': 'tabCheap',
                                        'review': 'tabReview',
                                        'premium': 'tabQuality'
                                    };
                                    const tabId = tabMap[sortType];
                                    if (tabId) {
                                        window.switchSortTab(tabId);
                                        console.log(`🎨 ソートタブの背景色を変更（失敗時・複数選択）: ${tabId}`);
                                    }
                                }
                            }
                        }

                        // 次の質問へ
                        if (nextQuestionId === 'PHONE') {
                            BotCore.connectToPhoneSystem();
                        } else {
                            this.showQuestion(nextQuestionId);
                        }
                    }, 1000);
                } else {
                    // Q016以外：通常の処理
                    const nextQuestionId = question.branches[firstIndex];
                    setTimeout(() => {
                        if (nextQuestionId === 'PHONE') {
                            BotCore.connectToPhoneSystem();
                        } else {
                            this.showQuestion(nextQuestionId);
                        }
                    }, 1000);
                }
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

        // Q900シリーズごとにランキングソート順を設定して保存
        const sortMap = {
            'Q900': 'cheap',         // なるべく安く → 安い順
            'Q901': 'review',        // 口コミや評判 → 口コミ順
            'Q902': 'premium',       // 品質や保証 → 高品質順
            'Q903': 'recommended'    // 親身になってくれる → おすすめ順
        };

        const sortOrder = sortMap[BotConfig.state.currentQuestionId];
        if (sortOrder) {
            // ソート順を保存（connectToPhoneSystemで使用）
            BotConfig.state.sortOrder = sortOrder;
            console.log(`📊 ランキングソート順を保存: ${sortOrder}`);
        }

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
