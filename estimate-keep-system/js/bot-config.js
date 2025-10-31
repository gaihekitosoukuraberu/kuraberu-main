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
            // グローバル変数BOT_FLOW_DATAが存在する場合はそれを使用
            if (typeof BOT_FLOW_DATA !== 'undefined') {
                this.state.flowData = BOT_FLOW_DATA;
                console.log('✅ BOTフロー読み込み完了（JSファイル）:', this.state.flowData.version);
                return true;
            }

            // フォールバック: JSONファイルをfetchで読み込み
            const scriptPath = document.currentScript ? document.currentScript.src : window.location.href;
            const basePath = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
            const jsonUrl = basePath.replace('/js', '') + '/zip-word-bot.json';

            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error('JSON読み込み失敗');
            this.state.flowData = await response.json();
            console.log('✅ BOTフロー読み込み完了（JSON fetch）:', this.state.flowData.version);
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
    // 回答保存（メモリ + localStorage）
    // ============================================
    saveAnswer(questionId, choice, index, questionText) {
        this.state.userAnswers[questionId] = {
            choice: choice,
            index: index,
            question: questionText || '',
            timestamp: Date.now()
        };

        // localStorageにも保存（途中離脱対策）
        this.saveToLocalStorage();
    },

    // ============================================
    // localStorage管理
    // ============================================
    saveToLocalStorage() {
        try {
            const data = {
                userAnswers: this.state.userAnswers,
                currentZipcode: this.state.currentZipcode,
                currentKeyword: this.state.currentKeyword,
                currentEntry: this.state.currentEntry,
                timestamp: Date.now()
            };
            localStorage.setItem('bot_session_data', JSON.stringify(data));
        } catch (error) {
            console.error('❌ localStorage保存エラー:', error);
        }
    },

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('bot_session_data');
            if (data) {
                const parsed = JSON.parse(data);
                // 24時間以内のデータのみ復元
                if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                    this.state.userAnswers = parsed.userAnswers || {};
                    this.state.currentZipcode = parsed.currentZipcode;
                    this.state.currentKeyword = parsed.currentKeyword;
                    this.state.currentEntry = parsed.currentEntry;
                    console.log('✅ セッションデータ復元:', Object.keys(this.state.userAnswers).length, '件');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('❌ localStorage読み込みエラー:', error);
            return false;
        }
    },

    clearLocalStorage() {
        try {
            localStorage.removeItem('bot_session_data');
        } catch (error) {
            console.error('❌ localStorageクリアエラー:', error);
        }
    },

    // ============================================
    // BOT質問回答をスプシ用にマッピング
    // ============================================
    mapAnswersToSpreadsheet() {
        const answers = this.state.userAnswers;

        // Q1_物件種別: Q001 or Q002
        let q1 = '';
        let q1_question = '';
        if (answers['Q001']) {
            q1 = answers['Q001'].choice === 'はい' ? '戸建て2階建て' : '';
            q1_question = answers['Q001'].question || '';
        }
        if (answers['Q002']) {
            q1 = answers['Q002'].choice;
            q1_question = answers['Q002'].question || '';
        }

        // Q2_階数: Q003系
        let q2 = answers['Q003']?.choice || answers['Q003A']?.choice || answers['Q003B']?.choice || '';

        // Q3_築年数: Q008
        let q3 = answers['Q008']?.choice || '';

        // Q4_工事歴: Q009 or Q009_OLD
        let q4 = answers['Q009']?.choice || answers['Q009_OLD']?.choice || '';

        // Q5_前回施工時期: Q009A or Q009A_OLD
        let q5 = answers['Q009A']?.choice || answers['Q009A_OLD']?.choice || '';

        // Q6_外壁材質: Q004
        let q6 = answers['Q004']?.choice || '';

        // Q7_屋根材質: Q004A
        let q7 = answers['Q004A']?.choice || '';

        // Q8_気になる箇所: Q004B
        let q8 = answers['Q004B']?.choice || '';

        // Q9_希望工事内容_外壁: Q005 or Q006
        let q9 = answers['Q005']?.choice || answers['Q006']?.choice || '';

        // Q10_希望工事内容_屋根: Q006A or Q007
        let q10 = answers['Q006A']?.choice || answers['Q007']?.choice || '';

        // Q11_見積もり保有数: Q009B or Q009B_OLD or Q014
        let q11 = answers['Q009B']?.choice || answers['Q009B_OLD']?.choice || answers['Q014']?.choice || '';

        // Q12_見積もり取得先: Q009C or Q009C_OLD or Q014B（複数選択）
        let q12 = answers['Q009C']?.choice || answers['Q009C_OLD']?.choice || answers['Q014B']?.choice || '';

        // Q13_訪問業者有無: Q010
        let q13 = answers['Q010']?.choice || '';

        // Q14_比較意向: Q011
        let q14 = answers['Q011']?.choice || '';

        // Q15_訪問業者名: Q009D or Q012
        let q15 = answers['Q009D']?.choice || answers['Q012']?.choice || '';

        // Q16_現在の劣化状況: Q015
        let q16 = answers['Q015']?.choice || '';

        // Q17_業者選定条件: Q016（複数選択）
        let q17 = answers['Q016']?.choice || '';

        return {
            q1_propertyType: q1,
            q1_question: q1_question,
            q2_floors: q2,
            q3_buildingAge: q3,
            q4_constructionHistory: q4,
            q5_lastConstructionTime: q5,
            q6_wallMaterial: q6,
            q7_roofMaterial: q7,
            q8_concernedArea: q8,
            q9_wallWorkType: q9,
            q10_roofWorkType: q10,
            q11_quoteCount: q11,
            q12_quoteSource: q12,
            q13_doorSalesVisit: q13,
            q14_comparisonIntention: q14,
            q15_doorSalesCompany: q15,
            q16_deteriorationStatus: q16,
            q17_selectionCriteria: q17
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
