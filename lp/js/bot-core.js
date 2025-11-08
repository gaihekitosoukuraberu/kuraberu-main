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

        // モバイルプログレスバーを表示
        if (window.innerWidth < 768) {
            const mobileProgressBar = document.getElementById('mobileProgressBar');
            if (mobileProgressBar) {
                mobileProgressBar.classList.remove('hidden');
                console.log('✅ モバイルプログレスバー表示');
            }
        }

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

        // 全画面モード開始
        this.enterFullscreen();

        // 状態設定
        BotConfig.setZipEntry(zipcode);

        // 地域名の更新
        if (typeof window.getAreaFromPostalCode === 'function') {
            const areaInfo = window.getAreaFromPostalCode(zipcode);
            const areaText = `${areaInfo}の相場`;
            const areaName = document.getElementById('areaName');
            if (areaName) {
                areaName.textContent = areaText;
                console.log('✅ areaName更新:', areaText);
            }

            // 都道府県と市区町村に分割してwindowプロパティに保存
            // 例: "東京都千代田区" → prefecture: "東京都", city: "千代田区"
            const prefectureMatch = areaInfo.match(/(.*?[都道府県])(.*)/);
            if (prefectureMatch) {
                window.propertyPrefecture = prefectureMatch[1]; // "東京都"
                window.propertyCity = prefectureMatch[2]; // "千代田区"
                console.log('✅ 住所情報を保存:', {
                    prefecture: window.propertyPrefecture,
                    city: window.propertyCity
                });
            } else {
                // マッチしない場合は全体を市区町村として扱う
                window.propertyPrefecture = '';
                window.propertyCity = areaInfo;
                console.log('⚠️ 都道府県パターンマッチ失敗、全体を市区町村として保存:', areaInfo);
            }

            // 相場セクションを表示
            const priceSection = document.getElementById('priceSection');
            if (priceSection) {
                priceSection.style.display = 'block';
                priceSection.classList.remove('hidden');
                console.log('✅ 相場セクション表示');
            }
        }

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

        // 特殊処理：郵便番号フォームへ直接遷移
        if (scenario.special === 'direct_postal') {
            console.log('✨ 特殊シナリオ: 郵便番号フォーム直接表示');

            // greetingメッセージ
            BotUI.showAIMessage(scenario.greeting);

            // 郵便番号入力フォームを表示
            setTimeout(() => {
                if (window.BotScenarios && typeof window.BotScenarios.showPostalForm === 'function') {
                    window.BotScenarios.showPostalForm({
                        message: '郵便番号を入力してください',
                        placeholder: '例：123-4567',
                        validation: '^\\d{3}-?\\d{4}$',
                        errorMessage: '正しい郵便番号を入力してください（例：123-4567）',
                        nextAction: 'mainFlow'
                    });
                } else {
                    console.error('❌ BotScenarios.showPostalForm()が見つかりません');
                }
            }, 1000);
            return;
        }

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
    async connectToPhoneSystem() {
        console.log('📞 PHONE分岐 - 既存システムへ接続');

        // BOTを一時停止
        BotConfig.state.botActive = false;

        // 誘導メッセージ
        BotUI.showAIMessage(
            'ありがとうございました！それでは最適な業者をご紹介するため、' +
            '最後に電話番号を教えていただけますか？'
        );

        // GASからランキングデータを取得
        console.log('🏆 ランキングデータ取得開始...');
        if (typeof window.fetchRankingFromGAS === 'function') {
            try {
                const success = await window.fetchRankingFromGAS();
                if (success) {
                    console.log('✅ ランキングデータ取得成功');
                } else {
                    console.warn('⚠️ ランキングデータ取得失敗、デフォルトデータを使用');
                }
            } catch (error) {
                console.error('❌ ランキングデータ取得エラー:', error);
            }
        } else {
            console.warn('⚠️ fetchRankingFromGAS関数が見つかりません');
        }

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
