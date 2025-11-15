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
async function initBotForZipEntry() {
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

    // mainContentContainerを表示（flexレイアウトを維持）
    const mainContentContainer = document.getElementById('mainContentContainer');
    if (mainContentContainer) {
        mainContentContainer.classList.remove('hidden');
        mainContentContainer.style.display = 'flex';
        console.log('✅ BOT開始時にmainContentContainer表示（2カラムレイアウト）');
    }

    // ランキングセクションを表示
    const rankingSection = document.getElementById('rankingSection');
    if (rankingSection) {
        rankingSection.classList.remove('hidden');
        console.log('✅ BOT開始時にランキングセクション表示');
    }

    // V1713-FIX: ランキング表示（プレースホルダー）を即座に表示
    if (typeof window.displayRanking === 'function') {
        window.displayRanking();
        console.log('✅ ランキングプレースホルダー表示（空配列）');
    }

    // V1713-FIX: GASからランキングをバックグラウンドで取得（非ブロッキング）
    console.log('🏆 郵便番号入力後、GASからランキングを取得します（バックグラウンド）');

    if (typeof window.fetchRankingFromGAS === 'function') {
        // awaitせずにバックグラウンドで実行
        window.fetchRankingFromGAS().then((success) => {
            if (success) {
                console.log('✅ ランキング取得成功、デフォルト（おすすめ順）で表示');
                // デフォルトはおすすめ順
                if (typeof window.updateAllCompaniesFromDynamic === 'function') {
                    window.updateAllCompaniesFromDynamic('recommended');
                }
                // 再表示
                if (typeof window.displayRanking === 'function') {
                    window.displayRanking();
                }
            } else {
                console.warn('⚠️ ランキング取得失敗、プレースホルダー表示維持');
            }
        }).catch(err => {
            console.error('❌ ランキング取得エラー（非致命的）:', err);
        });
    }

    // V1747-UX: 郵便番号入力完了で進捗度を上げる（13%）
    if (typeof window.updateProgress === 'function') {
        window.updateProgress(13);
        console.log('📊 進捗更新: 郵便番号入力完了 → 13%');
    }

    // AIメッセージ：相場は既に表示済みなので、直接質問開始
    showAIMessage('ありがとうございます。あなたに最適な業者をご紹介するため、いくつか質問させていただきます。');

    // mainQuestions.Q001から開始（ランキング取得を待たない）
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

// V1738-FIX: updateProgress関数はindex.htmlで定義済み（ガード節付き）
// ここでは再定義せず、グローバルのwindow.updateProgressを使用
// 重複定義を削除して、進捗度が絶対に下がらない機能を保持

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

    // ランキングセクションを表示
    const rankingSection = document.getElementById('rankingSection');
    if (rankingSection) {
        rankingSection.classList.remove('hidden');
        console.log('✅ キーワード検索BOT開始時にランキングセクション表示');
    }

    // ランキングを初期表示（デフォルトデータ）
    if (typeof window.displayRanking === 'function') {
        window.displayRanking();
        console.log('✅ ランキング初期表示（デフォルトデータ: T社、S社など）');
    }

    // V1747-UX: ワードリンク流入時は0%スタート（進捗更新なし）
    // 削除: updateProgress(3) - 初期は0%のまま

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

        // sessionStorageにも保存（データ永続化）
        try {
            sessionStorage.setItem('bot_zipcode', postal.replace('-', ''));
            console.log('✅ 郵便番号をsessionStorageに保存:', postal.replace('-', ''));
        } catch (e) {
            console.warn('⚠️ sessionStorage保存失敗:', e);
        }

        // ユーザーメッセージとして表示
        showUserMessage(postal);

        // フォームを非表示
        formContainer.style.display = 'none';

        // 郵便番号を保存したことを記録
        BotConfig.state.postalCodeEntered = true;

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

            const areaName = document.getElementById('areaName');
            if (areaName) {
                areaName.textContent = '東京都千代田区の外壁塗装相場';
            }
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

        // V1747-UX: 郵便番号入力完了で進捗度を上げる（13%）
        if (typeof window.updateProgress === 'function') {
            window.updateProgress(13);
            console.log('📊 進捗更新: 郵便番号入力完了（ワードリンク） → 13%');
        }

        // mainQuestionsへ（即座に開始）
        showAIMessage('ありがとうございます。あなたに最適な業者をご紹介するため、いくつか質問させていただきます。');

        setTimeout(() => {
            showQuestion('Q001');
        }, 1000);
    });

    // Enterキーで送信
    document.getElementById('postalInputBot').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('postalSubmitBtn').click();
        }
    });
}

// PHONE分岐：電話番号フォーム表示
function connectToExistingPhoneForm() {
    // BOTを一時停止
    BotConfig.state.botActive = false;

    // 選択肢をクリア
    document.getElementById('choices').innerHTML = '';

    // キーワード検索経由でBOT内で郵便番号を入力した場合のみ相場セクションを表示
    if (BotConfig.state.postalCodeEntered) {
        console.log('✅ キーワード検索経由のため、質問完了後に相場セクション表示');

        // 相場表示
        const priceSection = document.getElementById('priceSection');
        if (priceSection) {
            priceSection.classList.remove('hidden');
            priceSection.style.display = 'block';
            console.log('✅ 相場セクション表示完了');
        }

        const areaName = document.getElementById('areaName');
        if (areaName) {
            areaName.textContent = '東京都千代田区の外壁塗装相場';
        }

        // ランキングセクション表示（flexレイアウトを維持）
        const mainContentContainer = document.getElementById('mainContentContainer');
        if (mainContentContainer) {
            mainContentContainer.classList.remove('hidden');
            mainContentContainer.style.display = 'flex';
            console.log('✅ メインコンテナ表示（2カラムレイアウト）');
        }

        // ランキングセクションも明示的に表示
        const rankingSection = document.getElementById('rankingSection');
        if (rankingSection) {
            rankingSection.classList.remove('hidden');
            console.log('✅ ランキングセクション表示');
        }

        // デフォルトはおすすめ順
        if (typeof window.updateAllCompaniesFromDynamic === 'function') {
            window.updateAllCompaniesFromDynamic('recommended');
        }

        // ランキング表示（モザイク付き）
        if (typeof window.displayRanking === 'function') {
            window.displayRanking();
            console.log('✅ ランキング表示完了（モザイク付き）');
        }
    }

    // showPhoneMiniForm()を呼び出す（index.htmlで定義）
    setTimeout(() => {
        if (typeof window.showPhoneMiniForm === 'function') {
            window.showPhoneMiniForm();
        } else {
            console.error('❌ showPhoneMiniForm が見つかりません');
        }
    }, 500);
}
