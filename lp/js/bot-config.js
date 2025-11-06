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

        // sessionStorageもクリア
        try {
            sessionStorage.removeItem('bot_answers');
            sessionStorage.removeItem('bot_zipcode');
            sessionStorage.removeItem('bot_keyword');
        } catch (e) {
            console.warn('[BotConfig] sessionStorageクリア失敗:', e);
        }
    },

    // ============================================
    // sessionStorageから復元
    // ============================================
    loadFromSessionStorage() {
        try {
            const savedAnswers = sessionStorage.getItem('bot_answers');
            const savedZipcode = sessionStorage.getItem('bot_zipcode');
            const savedKeyword = sessionStorage.getItem('bot_keyword');

            if (savedAnswers) {
                this.state.userAnswers = JSON.parse(savedAnswers);
                console.log('[BotConfig] 回答を復元:', Object.keys(this.state.userAnswers).length + '件');
            }

            if (savedZipcode) {
                this.state.currentZipcode = savedZipcode;
                console.log('[BotConfig] 郵便番号を復元:', savedZipcode);
            }

            if (savedKeyword) {
                this.state.currentKeyword = savedKeyword;
                console.log('[BotConfig] キーワードを復元:', savedKeyword);
            }

            return true;
        } catch (e) {
            console.warn('[BotConfig] sessionStorage復元失敗:', e);
            return false;
        }
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

        // sessionStorageに永続化
        try {
            sessionStorage.setItem('bot_answers', JSON.stringify(this.state.userAnswers));
            if (this.state.currentZipcode) {
                sessionStorage.setItem('bot_zipcode', this.state.currentZipcode);
            }
            if (this.state.currentKeyword) {
                sessionStorage.setItem('bot_keyword', this.state.currentKeyword);
            }
        } catch (e) {
            console.warn('[BotConfig] sessionStorage保存失敗:', e);
        }
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
