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
    get GAS_URL() {
        return window.ENV?.GAS_URL || 'https://script.google.com/macros/s/AKfycbyYyvnqHXEZNSLu2NbbRSP4cRu46_9qD3QSoXMWF9qnzF3fKoVRHd_zYlXoFXuJgNUULQ/exec';
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
                deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop', // デバイスタイプ

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

                // 物件住所
                propertyPrefecture: window.propertyPrefecture || '',
                propertyCity: window.propertyCity || '',
                propertyStreet: formData.propertyAddress?.street || '',

                // 自宅住所（物件と異なる場合）
                isDifferentHome: formData.isDifferentHome || false,
                homeZip: formData.homeAddress?.postalCode || '',
                homePrefecture: window.homePrefecture || '',
                homeCity: window.homeCity || '',
                homeStreet: formData.homeAddress?.street || '',

                // ステップ2: 詳細情報
                surveyDatePreference: formData.surveyDates?.join(', ') || '',
                requests: formData.requests || '',
                selectionHistory: formData.keepInfo || '',  // AR列：業者選定履歴（キープ業者情報）
                contactTimeSlot: formData.contactTimeSlot || '',  // AT列：連絡時間帯
                quoteDestination: formData.quoteDestination || '',  // AU列：見積もり送付先

                // タイムスタンプ
                timestamp: new Date().toISOString()
            } : {
                // 更新モード: CV2のみ送信
                action: 'cv2_update',
                cvId: cvId,

                // ステップ1: 基本情報
                name: formData.name || '',
                email: formData.email || '',

                // 物件住所
                postalCode: formData.propertyAddress?.postalCode || '',
                propertyPrefecture: window.propertyPrefecture || '',
                propertyCity: window.propertyCity || '',
                propertyStreet: formData.propertyAddress?.street || '',

                // 自宅住所（物件と異なる場合）
                isDifferentHome: formData.isDifferentHome || false,
                homeZip: formData.homeAddress?.postalCode || '',
                homePrefecture: window.homePrefecture || '',
                homeCity: window.homeCity || '',
                homeStreet: formData.homeAddress?.street || '',

                // ステップ2: 詳細情報
                surveyDatePreference: formData.surveyDates?.join(', ') || '',
                requests: formData.requests || '',
                selectionHistory: formData.keepInfo || '',  // AR列：業者選定履歴（キープ業者情報）
                contactTimeSlot: formData.contactTimeSlot || '',  // AT列：連絡時間帯
                quoteDestination: formData.quoteDestination || '',  // AU列：見積もり送付先

                // タイムスタンプ
                timestamp: new Date().toISOString()
            };

            console.log('📤 送信データ:', data);
            console.log('📤 送信モード:', isNewSubmission ? '新規作成（CV1失敗のフォールバック）' : 'CV2更新');

            // JSONP送信（CORS回避）
            const result = await this.sendJSONP(data);

            if (result.success) {
                console.log('✅ CV2送信成功');

                // localStorage クリア
                BotConfig.clearLocalStorage();
                localStorage.removeItem('cv_id');

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
    // JSONP送信（CORS回避）
    // ============================================
    sendJSONP(data) {
        return new Promise((resolve, reject) => {
            // コールバック関数名を生成
            const callbackName = 'cvCallback_' + Date.now();
            console.log('🔧 コールバック関数名:', callbackName);

            // グローバルにコールバック関数を定義
            window[callbackName] = function(response) {
                console.log('✅ コールバック関数が実行されました');
                // コールバック実行後にクリーンアップ
                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                console.log('📥 JSONP レスポンス受信:', response);
                resolve(response);
            };

            // URLパラメータ構築（オブジェクトを平坦化）
            const params = new URLSearchParams();
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    params.append(key, data[key]);
                }
            }
            params.append('callback', callbackName);

            // scriptタグを動的に生成
            const script = document.createElement('script');
            const fullUrl = this.GAS_URL + '?' + params.toString();
            script.src = fullUrl;

            console.log('📤 JSONP リクエスト送信');
            console.log('📤 URL:', fullUrl);
            console.log('📤 URL文字数:', fullUrl.length);

            // ブラウザでURLをコピーできるようにする
            console.log('📋 URL(コピー用):');
            console.log(fullUrl);

            script.onerror = function(e) {
                console.error('❌ JSONP スクリプト読み込みエラー');
                console.error('❌ エラーイベント:', e);
                console.error('❌ script.src:', script.src);
                console.error('❌ GAS_URL:', this.GAS_URL);

                // URLを直接ブラウザで開いてテスト
                console.error('🔍 以下のURLをブラウザで直接開いてテスト:');
                console.error(fullUrl);

                delete window[callbackName];
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                reject(new Error('JSONP request failed'));
            }.bind(this);

            script.onload = function() {
                console.log('✅ スクリプトタグ読み込み完了');
            };

            // タイムアウト設定（30秒）
            setTimeout(() => {
                if (window[callbackName]) {
                    console.error('❌ JSONP タイムアウト（30秒）');
                    console.error('❌ コールバック関数が呼ばれませんでした');
                    delete window[callbackName];
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('JSONP request timeout'));
                }
            }, 30000);

            document.body.appendChild(script);
            console.log('📤 scriptタグをDOMに追加しました');
        });
    },

    // ============================================
    // ランキング取得（マッチングシステム）
    // ============================================
    async getRanking(params) {
        try {
            console.log('🏆 ランキング取得開始:', params);

            // パラメータ検証
            if (!params.zipcode) {
                throw new Error('郵便番号が指定されていません');
            }

            // 送信データ構築
            const data = {
                action: 'getRanking',
                zipcode: params.zipcode,
                workTypes: Array.isArray(params.workTypes) ? params.workTypes.join(',') : (params.workTypes || ''),
                buildingAgeMin: params.buildingAgeMin || '',
                buildingAgeMax: params.buildingAgeMax || ''
            };

            console.log('📤 ランキングリクエスト:', data);

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

};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.CVAPI = CVAPI;
}
