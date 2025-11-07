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
    },

    // ============================================
    // BOT回答をスプレッドシート形式にマッピング
    // ============================================
    mapAnswersToSpreadsheet() {
        const answers = this.state.userAnswers || {};
        const mapped = {};

        // Q1_building_type: 建物種別 (Q001 or Q002)
        if (answers.Q001) {
            mapped.Q1_building_type = answers.Q001.choice || '';
        } else if (answers.Q002) {
            mapped.Q1_building_type = answers.Q002.choice || '';
        }

        // Q2_floors: 建物階数 (Q003, Q003A, Q003B)
        if (answers.Q003) {
            mapped.Q2_floors = answers.Q003.choice || '';
        } else if (answers.Q003A) {
            mapped.Q2_floors = answers.Q003A.choice || '';
        } else if (answers.Q003B) {
            mapped.Q2_floors = answers.Q003B.choice || '';
        }

        // Q3_building_age: 築年数 (Q008)
        if (answers.Q008) {
            mapped.Q3_building_age = answers.Q008.choice || '';
        }

        // Q4_work_location: 施工箇所・気になる箇所 (Q004B or Q007)
        if (answers.Q004B) {
            mapped.Q4_work_location = answers.Q004B.choice || '';
        } else if (answers.Q007) {
            // Q007 is multiselect - join with commas
            mapped.Q4_work_location = answers.Q007.choice || '';
        } else if (answers.Q004) {
            // Fallback to Q004 wall material if Q004B not answered
            mapped.Q4_work_location = answers.Q004.choice || '';
        }

        // Q5_building_condition: 工事種別 (Q005 or Q006)
        if (answers.Q005) {
            mapped.Q5_building_condition = answers.Q005.choice || '';
        } else if (answers.Q006) {
            mapped.Q5_building_condition = answers.Q006.choice || '';
        }

        // Q6_degradation: 劣化状況 (Q015)
        if (answers.Q015) {
            mapped.Q6_degradation = answers.Q015.choice || '';
        }

        // Q7_roof_material: 屋根材質 (Q004A)
        if (answers.Q004A) {
            mapped.Q7_roof_material = answers.Q004A.choice || '';
        }

        // Q8_budget: 予算 (not found in current question flow - leave empty for now)
        // Note: This might need to be added to CV2 form or future questions
        mapped.Q8_budget = '';

        // Q9_work_content: 工事歴 (Q009)
        if (answers.Q009) {
            mapped.Q9_work_content = answers.Q009.choice || '';
        }

        // Q10_roof_work: 屋根工事種別 (Q006A)
        if (answers.Q006A) {
            mapped.Q10_roof_work = answers.Q006A.choice || '';
        }

        // Q11_quote_count: 見積もり数 (Q009B or Q014)
        if (answers.Q009B) {
            mapped.Q11_quote_count = answers.Q009B.choice || '';
        } else if (answers.Q014) {
            mapped.Q11_quote_count = answers.Q014.choice || '';
        }

        // Q12_quote_source: 見積もり取得先 (Q009C or Q014B - multiselect)
        if (answers.Q009C) {
            mapped.Q12_quote_source = answers.Q009C.choice || '';
        } else if (answers.Q014B) {
            mapped.Q12_quote_source = answers.Q014B.choice || '';
        }

        // Q13_door_sales: 訪問業者 (Q010)
        if (answers.Q010) {
            mapped.Q13_door_sales = answers.Q010.choice || '';
        }

        // Q14_comparison: 比較意向 (Q011)
        if (answers.Q011) {
            mapped.Q14_comparison = answers.Q011.choice || '';
        }

        // Q15_answer: 現在の気になる点 (Q015)
        if (answers.Q015) {
            mapped.Q15_answer = answers.Q015.choice || '';
        }

        // Q16_answer: 重視ポイント (Q016 - multiselect)
        if (answers.Q016) {
            mapped.Q16_answer = answers.Q016.choice || '';
        }

        // Q17_selection: 選定条件 (Q016 - same as Q16 or could be handled separately)
        if (answers.Q016) {
            mapped.Q17_selection = answers.Q016.choice || '';
        }

        console.log('📋 スプレッドシート形式に変換:', mapped);
        console.log('📋 変換された項目数:', Object.keys(mapped).filter(k => mapped[k]).length);
        return mapped;
    },

    // ============================================
    // localStorage クリア
    // ============================================
    clearLocalStorage() {
        try {
            sessionStorage.removeItem('bot_answers');
            sessionStorage.removeItem('bot_zipcode');
            sessionStorage.removeItem('bot_keyword');
            console.log('✅ sessionStorageクリア完了');
        } catch (e) {
            console.warn('[BotConfig] sessionStorageクリア失敗:', e);
        }
    }
};

// グローバルに公開（window.BotConfigとして参照可能）
if (typeof window !== 'undefined') {
    window.BotConfig = BotConfig;
}
