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
            const jsonUrl = basePath.replace('/js', '') + '/zip-word-bot.json?v=' + (window.ENV ? window.ENV.CACHE_BUSTER : Date.now());

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

        // 物件種別 (基本情報): Q001が「はい」なら「戸建て2階建て」、Q002の回答
        if (answers.Q001 && answers.Q001.choice === 'はい') {
            mapped['物件種別'] = '戸建て2階建て';
        } else if (answers.Q002) {
            mapped['物件種別'] = answers.Q002.choice || '';
        }

        // 階数 (基本情報): Q003, Q003A, Q003B
        if (answers.Q003) {
            mapped['階数'] = answers.Q003.choice || '';
        } else if (answers.Q003A) {
            mapped['階数'] = answers.Q003A.choice || '';
        } else if (answers.Q003B) {
            mapped['階数'] = answers.Q003B.choice || '';
        }

        // 築年数 (基本情報): Q008
        if (answers.Q008) {
            mapped['築年数'] = answers.Q008.choice || '';
        }

        // 建物面積 (基本情報): 現在BOTで収集していないのでNULL
        mapped['建物面積'] = '';

        // Q1_物件種別: Q001が「はい」なら「戸建て2階建て」、Q002の回答
        if (answers.Q001 && answers.Q001.choice === 'はい') {
            mapped['Q1_物件種別'] = '戸建て2階建て';
        } else if (answers.Q002) {
            mapped['Q1_物件種別'] = answers.Q002.choice || '';
        }

        // Q2_階数: Q003, Q003A, Q003B
        if (answers.Q003) {
            mapped['Q2_階数'] = answers.Q003.choice || '';
        } else if (answers.Q003A) {
            mapped['Q2_階数'] = answers.Q003A.choice || '';
        } else if (answers.Q003B) {
            mapped['Q2_階数'] = answers.Q003B.choice || '';
        }

        // Q3_築年数: Q008
        if (answers.Q008) {
            mapped['Q3_築年数'] = answers.Q008.choice || '';
        }

        // Q4_工事歴: Q009系列（Q009, Q009_1to9, Q009_10to15, Q009_15plus）
        if (answers.Q009) {
            mapped['Q4_工事歴'] = answers.Q009.choice || '';
        } else if (answers.Q009_1to9) {
            mapped['Q4_工事歴'] = answers.Q009_1to9.choice || '';
        } else if (answers.Q009_10to15) {
            mapped['Q4_工事歴'] = answers.Q009_10to15.choice || '';
        } else if (answers.Q009_15plus) {
            mapped['Q4_工事歴'] = answers.Q009_15plus.choice || '';
        }

        // Q5_前回施工時期: Q009A系列（Q009A, Q009A_1to9, Q009A_10to15, Q009A_15plus）
        if (answers.Q009A) {
            mapped['Q5_前回施工時期'] = answers.Q009A.choice || '';
        } else if (answers.Q009A_1to9) {
            mapped['Q5_前回施工時期'] = answers.Q009A_1to9.choice || '';
        } else if (answers.Q009A_10to15) {
            mapped['Q5_前回施工時期'] = answers.Q009A_10to15.choice || '';
        } else if (answers.Q009A_15plus) {
            mapped['Q5_前回施工時期'] = answers.Q009A_15plus.choice || '';
        }

        // Q6_外壁材質: Q004
        if (answers.Q004) {
            mapped['Q6_外壁材質'] = answers.Q004.choice || '';
        }

        // Q7_屋根材質: Q004A
        if (answers.Q004A) {
            mapped['Q7_屋根材質'] = answers.Q004A.choice || '';
        }

        // Q8_気になる箇所: Q004B or Q007 (multiselect)
        if (answers.Q004B) {
            mapped['Q8_気になる箇所'] = answers.Q004B.choice || '';
        } else if (answers.Q007) {
            mapped['Q8_気になる箇所'] = answers.Q007.choice || '';
        }

        // Q9_希望工事内容_外壁: Q005 or Q006
        if (answers.Q005) {
            mapped['Q9_希望工事内容_外壁'] = answers.Q005.choice || '';
        } else if (answers.Q006) {
            mapped['Q9_希望工事内容_外壁'] = answers.Q006.choice || '';
        }

        // Q10_希望工事内容_屋根: Q006A
        if (answers.Q006A) {
            mapped['Q10_希望工事内容_屋根'] = answers.Q006A.choice || '';
        }

        // Q11_見積もり保有数: Q009B or Q014
        if (answers.Q009B) {
            mapped['Q11_見積もり保有数'] = answers.Q009B.choice || '';
        } else if (answers.Q014) {
            mapped['Q11_見積もり保有数'] = answers.Q014.choice || '';
        }

        // Q12_見積もり取得先: Q009C or Q014B (multiselect)
        if (answers.Q009C) {
            mapped['Q12_見積もり取得先'] = answers.Q009C.choice || '';
        } else if (answers.Q014B) {
            mapped['Q12_見積もり取得先'] = answers.Q014B.choice || '';
        }

        // Q13_訪問業者有無: Q010
        if (answers.Q010) {
            mapped['Q13_訪問業者有無'] = answers.Q010.choice || '';
        }

        // Q14_比較意向: Q011
        if (answers.Q011) {
            mapped['Q14_比較意向'] = answers.Q011.choice || '';
        }

        // Q15_訪問業者名: Q012
        if (answers.Q012) {
            mapped['Q15_訪問業者名'] = answers.Q012.choice || '';
        }

        // Q16_現在の劣化状況: Q015
        if (answers.Q015) {
            mapped['Q16_現在の劣化状況'] = answers.Q015.choice || '';
        }

        // Q17_業者選定条件: Q016 (multiselect)
        if (answers.Q016) {
            mapped['Q17_業者選定条件'] = answers.Q016.choice || '';
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
