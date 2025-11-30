/**
 * ============================================
 * CV送信API（GAS通信専用）
 * ============================================
 *
 * 目的: CVデータをGASに送信してスプレッドシートに保存
 * 依存: BotConfig
 * 公開: CVAPI オブジェクト
 */

const CVAPI = {
    // GAS Web App URL（ENV経由で取得、フォールバック付き）
    // V2018: フォールバックURLを最新に更新
    get GAS_URL() {
        const url = window.ENV?.GAS_URL || 'https://script.google.com/macros/s/AKfycbzDBLAJZ_jvb78KDLzFh-e-Nx5o9P1NnSjdiSeangSCdPAcurS98nc8G_djW77AkUDVTQ/exec';
        console.log('[CVAPI] GAS_URL:', url, ', ENV存在:', !!window.ENV);
        return url;
    },

    // ============================================
    // 行動トラッキング（V1755）
    // ============================================

    /**
     * 初回訪問時刻を記録（ページロード時に自動実行）
     */
    recordFirstVisit() {
        if (!sessionStorage.getItem('first_visit_time')) {
            const now = new Date().getTime();
            sessionStorage.setItem('first_visit_time', now);
            console.log('⏰ 初回訪問時刻を記録:', new Date(now).toISOString());
        }
    },

    /**
     * サイト滞在時間を計算（秒）
     * @return {number} 滞在時間（秒）
     */
    getSiteStayDuration() {
        const firstVisit = sessionStorage.getItem('first_visit_time');
        if (!firstVisit) return 0;

        const now = new Date().getTime();
        const duration = Math.floor((now - parseInt(firstVisit)) / 1000);
        console.log(`⏱️ サイト滞在時間: ${duration}秒`);
        return duration;
    },

    /**
     * CV1送信時刻を記録
     */
    recordCV1Time() {
        const now = new Date().getTime();
        sessionStorage.setItem('cv1_time', now);
        console.log('📞 CV1送信時刻を記録:', new Date(now).toISOString());
    },

    /**
     * CV1→CV2時間差を計算（秒）
     * @return {number} 時間差（秒）
     */
    getCV1ToCV2Duration() {
        const cv1Time = sessionStorage.getItem('cv1_time');
        if (!cv1Time) return 0;

        const now = new Date().getTime();
        const duration = Math.floor((now - parseInt(cv1Time)) / 1000);
        console.log(`⏱️ CV1→CV2時間差: ${duration}秒`);
        return duration;
    },

    /**
     * デバイス種別を判定
     * @return {string} 'PC' | 'スマホ' | 'タブレット'
     */
    getDeviceType() {
        const ua = navigator.userAgent;

        if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
            return 'タブレット';
        } else if (/Mobile|Android|iPhone/.test(ua)) {
            return 'スマホ';
        } else {
            return 'PC';
        }
    },

    // ============================================
    // CV1送信（電話番号入力時：即時保存）
    // ============================================
    async sendCV1(phoneNumber) {
        try {
            console.log('📞 CV1送信開始:', phoneNumber);

            // sessionStorageから回答を復元
            BotConfig.loadFromSessionStorage();
            console.log('📋 BOT回答復元完了:', Object.keys(BotConfig.state.userAnswers).length + '件');

            // BOT質問回答を取得
            const botAnswers = BotConfig.mapAnswersToSpreadsheet();
            console.log('📋 スプレッドシート形式に変換:', botAnswers);

            // 訪問情報を取得
            const visitorInfo = this.getVisitorInfo();

            // 送信データ構築
            const data = {
                action: 'cv1_submit',  // GASが認識するアクション名 (CV1)
                phone: phoneNumber,
                postalCode: BotConfig.state.currentZipcode || '',

                // 物件住所（郵便番号から取得済み）
                propertyPrefecture: window.propertyPrefecture || '',
                propertyCity: window.propertyCity || '',

                // V1752-FEAT: 住所フリガナ（ZipCloud APIから取得、window.addressKanaを優先）
                addressKana: window.addressKana || BotConfig.state.addressKana || sessionStorage.getItem('bot_addressKana') || '',

                // BOT質問回答（Q1〜Q17）
                ...botAnswers,

                // BOTフロー情報
                entryPoint: BotConfig.state.currentEntry || '',          // エントリーポイント（zip/keyword）
                scenario: BotConfig.state.currentScenario || '',         // シナリオ名
                flowStep: BotConfig.state.currentFlowStep || '',         // フローステップ
                currentQuestionId: BotConfig.state.currentQuestionId || '', // 最後の質問ID
                sortOrder: BotConfig.state.sortOrder || '',              // ソート順（業者選定条件）

                // 訪問情報
                visitCount: visitorInfo.visitCount,
                referrer: visitorInfo.referrer,
                utm: visitorInfo.utm,
                userAgent: visitorInfo.userAgent,
                keyword: BotConfig.state.currentKeyword || '',
                currentUrl: window.location.href,           // 現在のページURL
                pageTitle: document.title,                  // ページタイトル
                screenWidth: window.screen.width,           // 画面幅
                screenHeight: window.screen.height,         // 画面高さ

                // V1755: 行動トラッキング
                siteStayDuration: this.getSiteStayDuration(), // サイト滞在時間（秒）
                deviceType: this.getDeviceType(),             // デバイス種別（PC/スマホ/タブレット）

                // タイムスタンプ
                timestamp: new Date().toISOString(),
                lastVisitDate: new Date().toISOString()  // 最終訪問日時
            };

            console.log('📤 送信データ:', data);

            // JSONP送信（CORS回避）
            const result = await this.sendJSONP(data);

            console.log('📥 CV1レスポンス受信:', result);

            if (result.success) {
                console.log('✅ CV1保存成功:', result.cvId);

                // CV IDをlocalStorageに保存（CV2で使用）
                localStorage.setItem('cv_id', result.cvId);
                console.log('✅ localStorage保存完了 cv_id:', localStorage.getItem('cv_id'));

                // V1755: CV1送信時刻を記録（CV1→CV2時間差計算用）
                this.recordCV1Time();

                // V1754: ハートビート開始（10分間監視）
                this.startHeartbeat(result.cvId);

                return {
                    success: true,
                    cvId: result.cvId
                };
            } else {
                console.error('❌ CV1保存失敗:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            console.error('❌ CV1送信エラー:', error);
            return {
                success: false,
                error: error.toString()
            };
        }
    },

    // ============================================
    // CV2送信（詳細情報：UPDATE）
    // ============================================
    async sendCV2(formData) {
        try {
            console.log('📝 CV2送信開始');
            console.log('📝 localStorage内容:', localStorage);
            console.log('📝 localStorage.cv_id:', localStorage.getItem('cv_id'));

            // CV IDを取得
            const cvId = localStorage.getItem('cv_id');

            // CV IDがない場合は、CV1として全データを新規作成
            const isNewSubmission = !cvId;

            if (isNewSubmission) {
                console.warn('⚠️ CV IDが見つかりません。CV1が失敗した可能性があります。');
                console.warn('⚠️ 新規作成モードで全データを送信します（CV1+CV2統合）');

                // sessionStorageから回答を復元（フォールバック時）
                BotConfig.loadFromSessionStorage();
                console.log('📋 BOT回答復元完了（フォールバック）:', Object.keys(BotConfig.state.userAnswers).length + '件');
            } else {
                console.log('✅ CV ID取得成功:', cvId);
            }

            // 電話番号を取得（CV1失敗時のフォールバック）
            const phone = localStorage.getItem('userPhone') || '';

            // 送信データ構築
            const data = isNewSubmission ? {
                // 新規作成モード: CV1+CV2の全データを送信
                action: 'cv1_submit',  // GASが認識するアクション名
                phone: phone,
                postalCode: BotConfig.state.currentZipcode || '',

                // BOT質問回答
                ...BotConfig.mapAnswersToSpreadsheet(),

                // 訪問情報
                ...this.getVisitorInfo(),

                // ステップ1: 基本情報
                name: formData.name || '',
                email: formData.email || '',

                // 物件住所（V1753-FIX2: propertyCity = 市区町村+町名）
                propertyPrefecture: window.propertyPrefecture || '',
                propertyCity: window.propertyCity || '',
                propertyStreet: formData.propertyStreet || '',

                // V1753-FIX: 住所フリガナ（ZipCloud APIから取得、window.addressKanaを優先）
                addressKana: window.addressKana || BotConfig.state.addressKana || sessionStorage.getItem('bot_addressKana') || '',

                // 自宅住所（物件と異なる場合）（V1753-FIX2: homeCity = 市区町村+町名）
                isDifferentHome: formData.isDifferentHome || false,
                homeZip: formData.homeZip || '',
                homePrefecture: formData.homePrefecture || '',
                homeCity: formData.homeCity || '',
                homeStreet: formData.homeStreet || '',

                // ステップ2: 詳細情報
                surveyDatePreference: formData.surveyDates?.join(', ') || '',
                requests: formData.requests || '',
                selectionHistory: formData.keepInfo || '',  // AR列：業者選定履歴（キープ業者情報）
                contactTimeSlot: formData.contactTimeSlot || '',  // AT列：連絡時間帯
                quoteDestination: formData.quoteDestination || '',  // AV列：見積もり送付先

                // V1755: CV1→CV2時間差（新規作成モード）
                cv1ToCV2Duration: this.getCV1ToCV2Duration(),

                // タイムスタンプ
                timestamp: new Date().toISOString()
            } : {
                // 更新モード: CV2のみ送信
                action: 'cv2_update',
                cvId: cvId,

                // ステップ1: 基本情報
                name: formData.name || '',
                email: formData.email || '',

                // 物件住所（V1753-FIX3: formDataから正しく取得）
                postalCode: formData.propertyZip || BotConfig.state.currentZipcode || '',
                propertyPrefecture: window.propertyPrefecture || '',
                propertyCity: window.propertyCity || '',
                propertyStreet: formData.propertyStreet || '',

                // V1753-FIX3: 住所フリガナ（ZipCloud APIから取得、window.addressKanaを優先）
                addressKana: window.addressKana || BotConfig.state.addressKana || sessionStorage.getItem('bot_addressKana') || '',

                // 自宅住所（物件と異なる場合）（V1753-FIX3: formDataから正しく取得）
                isDifferentHome: formData.isDifferentHome || false,
                homeZip: formData.homeZip || '',
                homePrefecture: formData.homePrefecture || '',
                homeCity: formData.homeCity || '',
                homeStreet: formData.homeStreet || '',

                // ステップ2: 詳細情報
                surveyDatePreference: formData.surveyDates?.join(', ') || '',
                requests: formData.requests || '',
                selectionHistory: formData.keepInfo || '',  // AS列：業者選定履歴（キープ業者情報）
                contactTimeSlot: formData.contactTimeSlot || '',  // AU列：連絡時間帯
                quoteDestination: formData.quoteDestination || '',  // AV列：見積もり送付先

                // 訪問情報
                ...this.getVisitorInfo(),

                // V1755: CV1→CV2時間差（更新モード）
                cv1ToCV2Duration: this.getCV1ToCV2Duration(),

                // タイムスタンプ
                timestamp: new Date().toISOString()
            };

            console.log('📤 送信データ:', data);
            console.log('📤 送信モード:', isNewSubmission ? '新規作成（CV1失敗のフォールバック）' : 'CV2更新');

            // JSONP送信（CORS回避）
            const result = await this.sendJSONP(data);

            if (result.success) {
                console.log('✅ CV2送信成功');

                // sessionStorageのBOT回答データをクリア（BOTセッション終了）
                BotConfig.clearLocalStorage();

                // V1750-FIX: CV2送信が複数回発生する可能性があるため、cv_idは削除しない
                // （見積もりフォーム → クイック予約の2段階送信に対応）
                // 次回のBOTセッション開始時またはページ離脱時にクリアする
                // localStorage.removeItem('cv_id');

                return {
                    success: true
                };
            } else {
                console.error('❌ CV2送信失敗:', result.error);

                return {
                    success: false,
                    error: result.error
                };
            }

        } catch (error) {
            console.error('❌ CV2送信エラー:', error);
            return {
                success: false,
                error: error.toString()
            };
        }
    },

    // ============================================
    // JSONP送信（CORS回避）- V1713-FIX: スマホ対応（グローバル変数方式）
    // ============================================
    sendJSONP(data) {
        return new Promise((resolve, reject) => {
            // V1713-FIX: スマホ対応 - グローバル変数にデータを代入する方式
            // 理由: コールバック不要、CORS不要、スマホでも確実に動作

            // グローバル変数名を生成
            const dataVarName = '__gasData_' + Date.now();
            console.log('🔧 グローバル変数名:', dataVarName);

            // URLパラメータ構築（callbackなし、dataVar指定）
            const params = new URLSearchParams();
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    params.append(key, data[key]);
                }
            }
            params.append('dataVar', dataVarName);  // GASにグローバル変数名を渡す

            const fullUrl = this.GAS_URL + '?' + params.toString();

            console.log('📤 scriptタグ送信（グローバル変数方式）');
            console.log('📤 URL:', fullUrl);
            console.log('📤 URL文字数:', fullUrl.length);

            // scriptタグを動的に生成
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = false;
            script.charset = 'utf-8';

            script.onerror = function(e) {
                console.error('❌ スクリプト読み込みエラー');
                delete window[dataVarName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                reject(new Error('Script load failed'));
            };

            // タイムアウト設定（V1748-FIX: ENV.TIMEOUTを使用、60秒）
            const timeout = (window.ENV && window.ENV.TIMEOUT) || 60000;
            const timeoutId = setTimeout(() => {
                if (window[dataVarName] === undefined) {
                    console.warn(`⏱️ リクエストタイムアウト（${timeout/1000}秒）- 古いリクエストの可能性`);
                    delete window[dataVarName];
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    // 新しいリクエストが成功している場合があるため、静かに失敗させる
                    resolve({ success: false, timeout: true });
                }
            }, timeout);

            script.onload = function() {
                console.log('✅ スクリプト読み込み完了');
                clearTimeout(timeoutId);

                // グローバル変数からデータを取得
                if (window[dataVarName]) {
                    const response = window[dataVarName];
                    console.log('📥 データ取得成功:', response);
                    delete window[dataVarName];
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    resolve(response);
                } else {
                    console.error('❌ グローバル変数が見つかりません:', dataVarName);
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    reject(new Error('Data variable not found'));
                }
            };

            // DOMに追加してからsrcを設定
            const targetElement = document.head || document.getElementsByTagName('head')[0] || document.body;
            if (!targetElement) {
                reject(new Error('No DOM element to append script'));
                return;
            }

            targetElement.appendChild(script);
            script.src = fullUrl;
            console.log('✅ scriptタグ追加完了');
        });
    },

    // ============================================
    // ランキング取得（マッチングシステム）
    // ============================================
    async getRanking(params) {
        try {
            console.log('🏆 ランキング取得開始:', params);
            console.log('🔍 params型チェック:', {
                zipcode: typeof params.zipcode,
                workTypes: typeof params.workTypes,
                isArray: Array.isArray(params.workTypes)
            });

            // パラメータ検証
            if (!params.zipcode) {
                throw new Error('郵便番号が指定されていません');
            }

            // workTypesの変換（配列→文字列）
            let workTypesStr = '';
            if (params.workTypes) {
                if (Array.isArray(params.workTypes)) {
                    workTypesStr = params.workTypes.join(',');
                } else if (typeof params.workTypes === 'string') {
                    workTypesStr = params.workTypes;
                } else {
                    console.warn('⚠️ workTypesが想定外の型:', typeof params.workTypes, params.workTypes);
                    workTypesStr = String(params.workTypes || '');
                }
            }

            // 送信データ構築
            const data = {
                action: 'getRanking',
                zipcode: String(params.zipcode || ''),
                workTypes: workTypesStr,
                buildingAgeMin: String(params.buildingAgeMin || ''),
                buildingAgeMax: String(params.buildingAgeMax || ''),
                wallMaterial: String(params.wallMaterial || ''),
                roofMaterial: String(params.roofMaterial || ''),
                wallWorkType: String(params.wallWorkType || ''),
                roofWorkType: String(params.roofWorkType || ''),
                concernedArea: String(params.concernedArea || '')
            };

            console.log('📤 ランキングリクエスト:', data);
            console.log('📤 データ型確認:', Object.keys(data).map(k => `${k}: ${typeof data[k]}`));

            // JSONP送信（既存メソッド利用）
            const result = await this.sendJSONP(data);

            console.log('📥 ランキングレスポンス:', result);

            if (result.success) {
                console.log('✅ ランキング取得成功');
                console.log('  - 安い順:', result.rankings?.cheap?.length || 0, '件');
                console.log('  - おすすめ順:', result.rankings?.recommended?.length || 0, '件');
                console.log('  - 口コミ順:', result.rankings?.review?.length || 0, '件');
                console.log('  - 高品質順:', result.rankings?.premium?.length || 0, '件');

                return {
                    success: true,
                    rankings: result.rankings || {
                        cheap: [],
                        recommended: [],
                        review: [],
                        premium: []
                    },
                    totalCount: result.totalCount || 0,
                    filteredCount: result.filteredCount || 0
                };
            } else {
                console.error('❌ ランキング取得失敗:', result.error);
                return {
                    success: false,
                    error: result.error || 'ランキング取得に失敗しました',
                    rankings: {
                        cheap: [],
                        recommended: [],
                        review: [],
                        premium: []
                    }
                };
            }

        } catch (error) {
            console.error('❌ ランキング取得エラー:', error);
            return {
                success: false,
                error: error.toString(),
                rankings: {
                    cheap: [],
                    recommended: [],
                    review: [],
                    premium: []
                }
            };
        }
    },

    // ============================================
    // 訪問情報取得
    // ============================================
    getVisitorInfo() {
        // 訪問回数
        let visitCount = parseInt(localStorage.getItem('visit_count') || '0');
        visitCount++;
        localStorage.setItem('visit_count', visitCount.toString());

        // UTMパラメータ
        const urlParams = new URLSearchParams(window.location.search);
        const utm = {
            source: urlParams.get('utm_source') || '',
            medium: urlParams.get('utm_medium') || '',
            campaign: urlParams.get('utm_campaign') || ''
        };
        const utmString = Object.entries(utm)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join('&');

        return {
            visitCount: visitCount,
            referrer: document.referrer || '',
            utm: utmString,
            userAgent: navigator.userAgent
        };
    },

    // ============================================
    // ハートビート機能（V1754: 離脱検知）
    // ============================================
    heartbeatInterval: null,
    heartbeatTimeout: null,

    /**
     * ハートビート開始（CV1成功後に呼び出し）
     * @param {string} cvId - CV ID
     * @param {number} duration - 監視時間（ミリ秒、デフォルト10分）
     */
    startHeartbeat(cvId, duration = 10 * 60 * 1000) {
        if (!cvId) return;

        console.log(`💓 ハートビート開始: CV ID=${cvId}, 期間=${duration / 1000}秒`);

        // 既存のハートビートを停止
        this.stopHeartbeat();

        // 30秒ごとにハートビート送信
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat(cvId);
        }, 30000);

        // 指定時間後に自動停止
        this.heartbeatTimeout = setTimeout(() => {
            console.log('⏱️ ハートビート自動停止（監視期間終了）');
            this.stopHeartbeat();
        }, duration);

        // ページ離脱時に停止
        window.addEventListener('beforeunload', () => this.stopHeartbeat());
    },

    /**
     * ハートビート停止
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    },

    /**
     * ハートビート送信
     * @param {string} cvId - CV ID
     */
    async sendHeartbeat(cvId) {
        if (!cvId) return;

        try {
            const data = {
                action: 'heartbeat',
                cvId: cvId,
                timestamp: new Date().toISOString()
            };

            await this.sendJSONP(data);
            console.log('💓 ハートビート送信:', cvId);
        } catch (error) {
            console.error('❌ ハートビート送信エラー:', error);
        }
    },

};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.CVAPI = CVAPI;

    // V1755: ページロード時に初回訪問時刻を自動記録
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            CVAPI.recordFirstVisit();
        });
    } else {
        // すでにDOMロード済みの場合は即実行
        CVAPI.recordFirstVisit();
    }
}
