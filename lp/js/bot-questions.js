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

        // スライダー入力の質問の場合（V1713-FIX: Q008A対応）
        if (question.inputType === 'slider') {
            this.handleSliderQuestion(question);
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

        // V1713-UX: Q004回答時にランキング事前取得（バックグラウンド）- Q015より早く開始
        const currentQuestionId = question.id || BotConfig.state.currentQuestionId;
        if (currentQuestionId === 'Q004' && typeof window.fetchRankingFromGAS === 'function') {
            console.log('🚀 Q004回答 → ランキング事前取得開始（バックグラウンド・超早期）');
            window.fetchRankingFromGAS().then(() => {
                console.log('✅ ランキング事前取得完了（Q016到達前に十分な時間確保）');
            }).catch(err => {
                console.warn('⚠️ ランキング事前取得エラー（非致命的）:', err);
            });
        }

        // V1713-FIX: 回答後にランキングを動的更新（非同期・非ブロッキング）
        if (typeof window.updateRankingDynamically === 'function') {
            window.updateRankingDynamically().catch(err => {
                console.warn('⚠️ ランキング動的更新エラー（非致命的）:', err);
            });
        }

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

        // Q016の回答後：回答に応じてソート順を変更（currentQuestionIdは90行目で既に宣言済み）
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

            // 次の質問へ（ソート処理はconnectToPhoneSystemで行う）
            setTimeout(() => {
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

                    // 次の質問へ（ソート処理はconnectToPhoneSystemで行う）
                    const nextQuestionId = question.branches[firstIndex];
                    setTimeout(() => {
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
    // スライダー入力質問（V1713-FIX: Q008A対応）
    // ============================================
    handleSliderQuestion(question) {
        BotUI.showAIMessage(question.text);

        setTimeout(() => {
            if (typeof BotUI.showSlider === 'function') {
                const currentQuestionId = question.id || BotConfig.state.currentQuestionId;

                // 「不明」ボタンのコールバック（unknownBranchがある場合のみ）
                const onUnknown = question.unknownBranch ? () => {
                    BotUI.showUserMessage('不明');
                    BotUI.clearChoices();

                    // 進捗更新
                    if (question.stage) {
                        const percentage = BotConfig.calculateProgress(question.stage);
                        BotUI.updateProgress(percentage);
                    }

                    // 不明の場合はunknownBranchへ
                    setTimeout(() => {
                        this.showQuestion(question.unknownBranch);
                    }, 1000);
                } : null;

                // スライダー表示（「決定」と「不明」の両方）
                BotUI.showSlider(question.sliderConfig, (value) => {
                    // ユーザーメッセージ表示
                    BotUI.showUserMessage(`${value}${question.sliderConfig.unit}`);

                    // 回答を保存
                    BotConfig.saveAnswer(currentQuestionId, value, 0);

                    // V1713-FIX: 築年数の正確な値を保存
                    if (currentQuestionId === 'Q008' || currentQuestionId === 'Q008_SLIDER' || currentQuestionId === 'Q008A') {
                        BotConfig.state.exactBuildingAge = value;
                        console.log('✅ 築年数（正確）:', value + '年');
                    }

                    // 選択肢をクリア
                    BotUI.clearChoices();

                    // 進捗更新
                    if (question.stage) {
                        const percentage = BotConfig.calculateProgress(question.stage);
                        BotUI.updateProgress(percentage);
                    }

                    // 値に応じた分岐処理
                    let nextQuestionId;
                    if ((currentQuestionId === 'Q008' || currentQuestionId === 'Q008_SLIDER') && question.branchLogic === 'byValue') {
                        // 築年数の値に応じて分岐（V1713-UX: 10年以下 = 訪問業者リスク高）
                        // 0-10年 → branches[0], 11-15年 → branches[1], 16年以上 → branches[2]
                        let branchIndex = 0;
                        if (value >= 1 && value <= 10) {
                            branchIndex = 0;
                        } else if (value >= 11 && value <= 15) {
                            branchIndex = 1;
                        } else if (value >= 16) {
                            branchIndex = 2;
                        }
                        nextQuestionId = question.branches[branchIndex];
                        console.log('📍 築年数:', value + '年', '→ 分岐index:', branchIndex, '→ 次の質問:', nextQuestionId);
                    } else if (currentQuestionId === 'Q008A') {
                        // 旧Q008Aの場合（後方互換性のため残す）
                        const q008Answer = BotConfig.state.userAnswers.Q008;
                        const q008Index = q008Answer ? q008Answer.index : 0;
                        nextQuestionId = question.branches[q008Index];
                        console.log('📍 Q008の選択:', q008Index, '→ 次の質問:', nextQuestionId);
                    } else {
                        nextQuestionId = question.branches[0];
                    }

                    // 次の質問へ
                    setTimeout(() => {
                        this.showQuestion(nextQuestionId);
                    }, 1000);
                }, onUnknown);
            } else {
                console.error('❌ BotUI.showSliderが見つかりません');
            }
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

                // V1713-UX: ローディング表示
                const loadingHtml = `
                    <div id="botLoadingIndicator" class="flex items-center justify-center py-4">
                        <div class="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                            <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span class="text-sm text-blue-600 font-medium">最適な業者を検索中...</span>
                        </div>
                    </div>
                `;

                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    const loadingDiv = document.createElement('div');
                    loadingDiv.innerHTML = loadingHtml;
                    chatMessages.appendChild(loadingDiv.firstElementChild);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }

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
        const currentQuestionId = removed.questionId;
        console.log('🗑️ 履歴から削除:', currentQuestionId);

        // userAnswersから削除
        if (BotConfig.state.userAnswers[currentQuestionId]) {
            delete BotConfig.state.userAnswers[currentQuestionId];
            console.log('🗑️ 回答を削除:', currentQuestionId);
        }

        // 残っている質問IDのセットを作成
        const remainingQuestionIds = new Set(
            BotConfig.state.questionHistory.map(entry => entry.questionId)
        );

        // 残っていない質問の回答を全て削除
        Object.keys(BotConfig.state.userAnswers).forEach(questionId => {
            if (!remainingQuestionIds.has(questionId)) {
                delete BotConfig.state.userAnswers[questionId];
                console.log('🗑️ 後続の回答を削除:', questionId);
            }
        });

        // sessionStorageを更新
        try {
            sessionStorage.setItem('bot_answers', JSON.stringify(BotConfig.state.userAnswers));
            console.log('💾 sessionStorage更新完了');
        } catch (e) {
            console.warn('[goBack] sessionStorage更新失敗:', e);
        }

        // 1つ前の質問を取得
        const previousEntry = history[history.length - 1];
        console.log('📌 1つ前の質問に戻ります:', previousEntry.questionId);
        console.log('📌 戻った後の履歴:', history.map(h => h.questionId));

        // ✅ 現在の質問IDを更新（重要：これがないと回答が間違ったIDで保存される）
        BotConfig.state.currentQuestionId = previousEntry.questionId;
        console.log('✅ currentQuestionIdを更新:', previousEntry.questionId);

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
