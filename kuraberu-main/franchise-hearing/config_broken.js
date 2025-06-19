/**
 * 外壁塗装くらべるAI - フランチャイズ登録システム設定
 * 
 * 重要: GAS WebAppをデプロイした後、API_URLを実際のURLに更新してください
 */

// API設定
const FRANCHISE_CONFIG = {
    // GAS WebApp URL（デプロイ後に更新が必要）
    API_URL: 'https://script.google.com/macros/s/AKfycbyGobvzp6tV1j-C48_-YK_pL0pVtVEFNOFbwvhs0ZBeVevye0Wudfa8Je3303XjehPjTg/exec',
    
    // APIタイムアウト設定（ミリ秒）
    API_TIMEOUT: 30000,
    
    // デバッグモード
    DEBUG_MODE: true,
    
    // エラーメッセージ
    ERROR_MESSAGES: {
        NETWORK_ERROR: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        VALIDATION_ERROR: 'フォームの入力に不備があります。前のページに戻って確認してください。',
        SERVER_ERROR: 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。',
        TIMEOUT_ERROR: 'タイムアウトが発生しました。しばらく待ってから再度お試しください。'
    }
};

/**
 * スマートなハイブリッドGAS API呼び出し（データサイズに応じて自動選択）
 * @param {string} action - APIアクション
 * @param {Object} parameters - パラメータ
 * @returns {Promise<Object>} レスポンス
 */
async function callFranchiseAPI(action, parameters) {
    try {
        const requestData = {
            action: action,
            ...parameters
        };
        
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('🔗 スマートAPI呼び出し:', { action, parameters });
        }
        
        // データサイズをチェックして送信方式を自動選択
        const jsonData = JSON.stringify(requestData);
        const encodedData = encodeURIComponent(jsonData);
        const estimatedUrlLength = FRANCHISE_CONFIG.API_URL.length + encodedData.length + 200; // callback名など
        
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('📊 データサイズ:', jsonData.length, 'bytes');
            console.log('📊 推定URL長:', estimatedUrlLength, 'bytes');
        }
        
        // すべてのブラウザでJSONP優先（Safari問題回避）
        console.log('🔄 全ブラウザでJSONP方式を使用（安定化）');
        
        // すべてのデータサイズでJSONPを使用（安定化）
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('📡 JSONP方式を選択（全ブラウザ対応）');
        }
        return await callWithJSONPStable(requestData);
        
    } catch (error) {
        console.error('❌ API呼び出しエラー:', error);
        throw error;
    }
}

/**
 * Safari専用ワークアラウンド方式
 */
async function callWithSafariWorkaround(requestData) {
    console.log('🍎 Safari専用AI処理開始...');
    
    // Safari 用の複数戦略を順次試行
    const strategies = [
        { name: 'POST with CORS', method: 'safariPOST' },
        { name: 'JSONP with延長', method: 'safariJSONP' },
        { name: 'Form送信', method: 'safariForm' }
    ];
    
    for (const strategy of strategies) {
        try {
            console.log(`🍎 Safari戦略試行: ${strategy.name}`);
            
            let result;
            switch (strategy.method) {
                case 'safariPOST':
                    result = await safariCORSFetch(requestData);
                    break;
                case 'safariJSONP':
                    result = await callWithJSONPSafariUltraSimple(requestData);
                    break;
                case 'safariForm':
                    result = await safariFormSubmission(requestData);
                    break;
            }
            
            if (result && result.success) {
                console.log(`✅ Safari戦略成功: ${strategy.name}`, result);
                return result;
            }
            
        } catch (error) {
            console.warn(`⚠️ Safari戦略失敗: ${strategy.name}`, error.message);
        }
    }
    
    throw new Error('Safari: すべての通信戦略が失敗しました');
}

/**
 * Safari CORS対応fetch
 */
async function safariCORSFetch(requestData) {
    const response = await fetch(FRANCHISE_CONFIG.API_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`Safari CORS fetch failed: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Safari Form送信方式
 */
async function safariFormSubmission(requestData) {
    return new Promise((resolve, reject) => {
        // 隠しiframeを作成
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'safariForm_' + Date.now();
        
        // フォームを作成
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = FRANCHISE_CONFIG.API_URL;
        form.target = iframe.name;
        form.style.display = 'none';
        
        // データを隠しフィールドに設定
        const dataInput = document.createElement('input');
        dataInput.type = 'hidden';
        dataInput.name = 'data';
        dataInput.value = JSON.stringify(requestData);
        form.appendChild(dataInput);
        
        // Safari識別フィールド
        const safariInput = document.createElement('input');
        safariInput.type = 'hidden';
        safariInput.name = 'safari';
        safariInput.value = '1';
        form.appendChild(safariInput);
        
        // レスポンス監視
        iframe.onload = function() {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                const responseText = doc.body.textContent || doc.body.innerText;
                
                console.log('🍎 Safari Form応答:', responseText);
                
                const result = JSON.parse(responseText);
                
                // クリーンアップ
                document.body.removeChild(iframe);
                document.body.removeChild(form);
                
                resolve(result);
            } catch (error) {
                console.error('🍎 Safari Form解析エラー:', error);
                document.body.removeChild(iframe);
                document.body.removeChild(form);
                reject(error);
            }
        };
        
        iframe.onerror = function() {
            document.body.removeChild(iframe);
            document.body.removeChild(form);
            reject(new Error('Safari form submission failed'));
        };
        
        // DOM に追加して送信
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
        
        // タイムアウト
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
                document.body.removeChild(form);
                reject(new Error('Safari form submission timeout'));
            }
        }, 30000);
    });
}

/**
 * Safari超シンプルJSONP方式でAPI呼び出し
 */
async function callWithJSONPSafariUltraSimple(requestData) {
    console.log('🍎 Safari超シンプルJSONP開始...');
    
    return await new Promise((resolve, reject) => {
        const callbackName = 'safari' + Date.now();
        
        // グローバルコールバック（最もシンプル）
        window[callbackName] = function(result) {
            console.log('🍎 Safari超シンプル応答:', result);
            delete window[callbackName];
            resolve(result);
        };
        
        // 最小限のスクリプト要素
        const script = document.createElement('script');
        
        // 最短URLを作成
        const minData = {
            action: requestData.action,
            companyName: requestData.companyName
        };
        
        script.src = FRANCHISE_CONFIG.API_URL + 
                    '?callback=' + callbackName + 
                    '&data=' + encodeURIComponent(JSON.stringify(minData));
        
        console.log('🍎 Safari超シンプルURL:', script.src.length, 'bytes');
        
        // エラー処理（最小限）
        script.onerror = function() {
            console.error('🍎 Safari超シンプルJSONP失敗');
            delete window[callbackName];
            reject(new Error('Safari ultra simple JSONP failed'));
        };
        
        document.head.appendChild(script);
        
        // 長めのタイムアウト（120秒）
        setTimeout(() => {
            if (window[callbackName]) {
                console.warn('🍎 Safari超シンプル タイムアウト');
                delete window[callbackName];
                reject(new Error('Safari ultra simple timeout'));
            }
        }, 120000);
    });
}

/**
 * Safari拡張タイムアウトJSONP方式でAPI呼び出し
 */
async function callWithJSONPSafariExtended(requestData) {
    console.log('🍎 Safari拡張JSONP開始...');
    
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'safariExt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        window[callbackName] = function(result) {
            console.log('🍎 Safari拡張JSONP応答受信:', result);
            
            try {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
                
                if (result && result.success === false) {
                    reject(new Error(result.message || result.error || 'Safari API処理エラー'));
                    return;
                }
                
                resolve(result);
            } catch (cleanupError) {
                console.warn('🍎 Safari クリーンアップエラー:', cleanupError);
                resolve(result);
            }
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(requestData));
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodedData}`;
        
        console.log('🍎 Safari拡張URL長:', url.length, 'bytes');
        
        script.onerror = function(event) {
            console.error('🍎 Safari拡張JSONP エラー:', event);
            
            try {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                console.warn('🍎 Safari エラー時クリーンアップエラー:', cleanupError);
            }
            
            reject(new Error('Safari extended JSONP failed'));
        };
        
        script.src = url;
        document.head.appendChild(script);
        
        // Safari用拡張タイムアウト（90秒）
        setTimeout(() => {
            if (window[callbackName]) {
                console.warn('🍎 Safari拡張JSONP タイムアウト（90秒）');
                try {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                    }
                    delete window[callbackName];
                } catch (cleanupError) {
                    console.warn('🍎 Safari タイムアウト時クリーンアップエラー:', cleanupError);
                }
                reject(new Error('Safari extended JSONP timeout after 90s'));
            }
        }, 90000);
    });
}

/**
 * Safari簡単JSONP方式でAPI呼び出し（フォールバック用）
 */
async function callWithJSONPSafariSimple(requestData) {
    console.log('🍎 Safari簡単JSONP試行...');
    
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'safariSimple_' + Date.now();
        
        // 極めてシンプルなコールバック
        window[callbackName] = function(result) {
            console.log('🍎 Safari簡単JSONP応答:', result);
            
            // クリーンアップ
            try {
                document.head.removeChild(script);
                delete window[callbackName];
            } catch (e) {
                // 無視
            }
            
            resolve(result);
        };
        
        // 最小限のデータ
        const minimalData = {
            action: requestData.action,
            companyName: requestData.companyName
        };
        
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodeURIComponent(JSON.stringify(minimalData))}`;
        
        console.log('🍎 Safari簡単URL:', url.length, 'bytes');
        
        script.onerror = function() {
            console.error('🍎 Safari簡単JSONP失敗');
            try {
                document.head.removeChild(script);
                delete window[callbackName];
            } catch (e) {
                // 無視
            }
            reject(new Error('Safari simple JSONP failed'));
        };
        
        script.src = url;
        document.head.appendChild(script);
        
        // 短いタイムアウト
        setTimeout(() => {
            if (window[callbackName]) {
                try {
                    document.head.removeChild(script);
                    delete window[callbackName];
                } catch (e) {
                    // 無視
                }
                reject(new Error('Safari simple JSONP timeout'));
            }
        }, 15000);
    });
}

/**
 * Safari超最適化JSONP方式でAPI呼び出し（即座失敗対策）
 */
async function callWithJSONPSafariUltraOptimized(requestData) {
    console.log('🍎 Safari超最適化処理開始');
    
    // Safari用の複数戦略でリトライ
    const strategies = [
        { name: 'ミニマル', timeout: 10000, simplify: true },
        { name: '標準', timeout: 30000, simplify: false },
        { name: '拡張', timeout: 60000, simplify: false }
    ];
    
    for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i];
        
        try {
            console.log(`🍎 Safari戦略${i + 1}: ${strategy.name} (タイムアウト: ${strategy.timeout}ms)`);
            
            let dataToSend = requestData;
            
            // ミニマル戦略：データを最小限に圧縮
            if (strategy.simplify) {
                dataToSend = {
                    action: requestData.action,
                    companyName: requestData.companyName,
                    userAgent: 'Safari-Optimized',
                    timestamp: new Date().getTime()
                };
                console.log('🍎 データ最小化:', dataToSend);
            }
            
            const result = await callWithJSONPSafariStrict(dataToSend, strategy.timeout);
            
            console.log(`✅ Safari戦略${i + 1}成功:`, result);
            return result;
            
        } catch (error) {
            console.warn(`⚠️ Safari戦略${i + 1}失敗:`, error.message);
            
            // 最後の戦略でない場合は少し待機
            if (i < strategies.length - 1) {
                console.log('⏳ Safari: 1秒待機後に次の戦略を試行...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    // 最後の手段：Fetch試行（Safari 14+対応）
    console.log('🍎 最後の手段: Safari Fetch試行...');
    try {
        const fetchResult = await callWithPOSTSafari(requestData);
        console.log('✅ Safari Fetch成功:', fetchResult);
        return fetchResult;
    } catch (fetchError) {
        console.error('❌ Safari Fetch失敗:', fetchError);
    }
    
    // すべての戦略が失敗した場合
    console.error('❌ Safari: すべての戦略が失敗');
    throw new Error('Safari環境でAI抽出に失敗しました。ネットワーク設定を確認してください。');
}

/**
 * Safari厳格モードJSONP呼び出し
 */
async function callWithJSONPSafariStrict(requestData, timeout = 30000) {
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'safari_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        console.log(`🍎 Safari厳格モード: コールバック名 = ${callbackName}`);
        
        // Safari用のグローバルコールバック（厳格設定）
        window[callbackName] = function(result) {
            try {
                console.log('🍎 Safari応答受信:', result);
                
                // スクリプト削除
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
                
                if (result && result.success === false) {
                    reject(new Error(result.message || result.error || 'Safari API処理エラー'));
                    return;
                }
                
                resolve(result);
            } catch (cleanupError) {
                console.warn('🍎 Safari クリーンアップエラー:', cleanupError);
                resolve(result);
            }
        };
        
        // Safari用URL生成（シンプル化）
        const jsonData = JSON.stringify(requestData);
        const encodedData = encodeURIComponent(jsonData);
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodedData}&safari=1`;
        
        console.log('🍎 Safari URL生成完了:', url.length, 'bytes');
        console.log('🍎 Safari 完全URL（先頭200文字）:', url.substring(0, 200));
        
        // Safari用エラーハンドリング（即座検出）
        script.onerror = function(event) {
            console.error('🍎 Safari スクリプトエラー即座検出:', event);
            
            try {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                console.warn('🍎 Safari エラー時クリーンアップエラー:', cleanupError);
            }
            
            reject(new Error('Safari JSONP script loading failed immediately'));
        };
        
        // Safari用ロードハンドリング
        script.onload = function() {
            console.log('🍎 Safari スクリプト読み込み完了');
        };
        
        // Safari用タイムアウト
        const timeoutId = setTimeout(() => {
            console.warn(`🍎 Safari タイムアウト発生 (${timeout}ms)`);
            
            if (window[callbackName]) {
                try {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                    }
                    delete window[callbackName];
                } catch (cleanupError) {
                    console.warn('🍎 Safari タイムアウト時クリーンアップエラー:', cleanupError);
                }
                reject(new Error(`Safari JSONP timeout after ${timeout}ms`));
            }
        }, timeout);
        
        // スクリプト実行
        script.src = url;
        console.log('🍎 Safari スクリプトをDOMに追加...');
        document.head.appendChild(script);
        
        // 成功時はタイムアウトをクリア
        const originalCallback = window[callbackName];
        window[callbackName] = function(result) {
            clearTimeout(timeoutId);
            originalCallback(result);
        };
    });
}

/**
 * Safari最適化JSONP方式でAPI呼び出し
 */
async function callWithJSONPSafariOptimized(requestData) {
    const maxRetries = 3;
    let lastError;
    
    for (let retry = 0; retry < maxRetries; retry++) {
        try {
            if (FRANCHISE_CONFIG.DEBUG_MODE) {
                console.log(`🍎 Safari最適化JSONP試行${retry + 1}/${maxRetries}`);
            }
            
            // Safari用の拡張タイムアウト
            const result = await callWithJSONPWithTimeout(requestData, 45000 + (retry * 15000));
            
            if (FRANCHISE_CONFIG.DEBUG_MODE) {
                console.log('✅ Safari JSONP成功:', result);
            }
            
            return result;
            
        } catch (error) {
            lastError = error;
            
            if (FRANCHISE_CONFIG.DEBUG_MODE) {
                console.warn(`⚠️ Safari JSONP試行${retry + 1}失敗:`, error.message);
            }
            
            // 最後の試行でない場合は待機
            if (retry < maxRetries - 1) {
                const waitTime = 2000 * (retry + 1); // 段階的に待機時間を増加
                if (FRANCHISE_CONFIG.DEBUG_MODE) {
                    console.log(`⏳ ${waitTime}ms待機後にリトライ...`);
                }
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    // すべての試行が失敗した場合
    console.error('❌ Safari JSONP全試行失敗:', lastError);
    throw new Error(`Safari環境でのAPI呼び出しが失敗しました: ${lastError.message}`);
}

/**
 * タイムアウト指定可能なJSONP呼び出し
 */
async function callWithJSONPWithTimeout(requestData, timeout = 30000) {
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'gasCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        window[callbackName] = function(result) {
            try {
                document.head.removeChild(script);
                delete window[callbackName];
                
                if (FRANCHISE_CONFIG.DEBUG_MODE) {
                    console.log('📥 JSONP応答:', result);
                }
                
                if (result && result.success === false) {
                    reject(new Error(result.message || result.error || 'API処理エラー'));
                    return;
                }
                
                resolve(result);
            } catch (cleanupError) {
                console.warn('クリーンアップエラー:', cleanupError);
                resolve(result);
            }
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(requestData));
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodedData}`;
        
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('🔗 JSONP URL生成:', url.substring(0, 200) + '...');
            console.log('📏 URL長:', url.length);
        }
        
        script.src = url;
        
        script.onerror = function(event) {
            console.error('❌ JSONP スクリプトエラー:', event);
            
            try {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                console.warn('エラー時クリーンアップエラー:', cleanupError);
            }
            reject(new Error(`JSONP request failed: ${script.src.substring(0, 100)}...`));
        };
        
        document.head.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                try {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                    }
                    delete window[callbackName];
                } catch (cleanupError) {
                    console.warn('タイムアウト時クリーンアップエラー:', cleanupError);
                }
                reject(new Error(`JSONP timeout after ${timeout}ms`));
            }
        }, timeout);
    });
}

/**
 * JSONP方式でAPI呼び出し（小容量データ用）
 */
async function callWithJSONP(requestData) {
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'gasCallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        window[callbackName] = function(result) {
            try {
                document.head.removeChild(script);
                delete window[callbackName];
                
                if (FRANCHISE_CONFIG.DEBUG_MODE) {
                    console.log('📥 JSONP応答:', result);
                }
                
                if (result && result.success === false) {
                    reject(new Error(result.message || result.error || 'API処理エラー'));
                    return;
                }
                
                resolve(result);
            } catch (cleanupError) {
                console.warn('クリーンアップエラー:', cleanupError);
                resolve(result);
            }
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(requestData));
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodedData}`;
        
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('🔗 JSONP URL生成:', url.substring(0, 200) + '...');
            console.log('📏 最終URL長:', url.length);
            console.log('🌐 完全なJSONP URL（デバッグ用）:', url);
            console.log('🔧 ブラウザで以下URLを開いてGASの応答を確認:', url);
        }
        
        script.src = url;
        
        script.onerror = function(event) {
            console.error('❌ JSONP スクリプトエラー詳細:', {
                event: event,
                src: script.src,
                readyState: script.readyState,
                status: script.status
            });
            
            try {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                console.warn('エラー時クリーンアップエラー:', cleanupError);
            }
            reject(new Error(`JSONP request failed. URL: ${script.src.substring(0, 100)}...`));
        };
        
        document.head.appendChild(script);
        
        setTimeout(() => {
            if (window[callbackName]) {
                try {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                    }
                    delete window[callbackName];
                } catch (cleanupError) {
                    console.warn('タイムアウト時クリーンアップエラー:', cleanupError);
                }
                reject(new Error(FRANCHISE_CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR));
            }
        }, FRANCHISE_CONFIG.API_TIMEOUT);
    });
}

/**
 * Safari専用POST方式でAPI呼び出し
 */
async function callWithPOSTSafari(requestData) {
    console.log('🍎 Safari POST試行開始...');
    
    // Safari用のより基本的なfetch設定
    try {
        const response = await fetch(FRANCHISE_CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('🍎 Safari POST応答受信:', response.status);
        
        if (!response.ok) {
            throw new Error(`Safari HTTP エラー: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('🍎 Safari POST 成功:', result);
        
        return result;
        
    } catch (error) {
        console.error('🍎 Safari POST エラー:', error.message);
        
        // より具体的なエラー情報
        if (error.message.includes('TypeError')) {
            throw new Error('Safari ネットワーク接続エラー');
        } else if (error.message.includes('CORS')) {
            throw new Error('Safari CORS エラー');
        } else {
            throw new Error(`Safari POST エラー: ${error.message}`);
        }
    }
}

/**
 * POST方式でAPI呼び出し（大容量データ用）
 */
async function callWithPOST(requestData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FRANCHISE_CONFIG.API_TIMEOUT);
    
    try {
        const response = await fetch(FRANCHISE_CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP エラー: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('📥 POST応答:', result);
        }
        
        return result;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error(FRANCHISE_CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR);
        } else if (error.message.includes('fetch')) {
            throw new Error(FRANCHISE_CONFIG.ERROR_MESSAGES.NETWORK_ERROR);
        } else {
            throw error;
        }
    }
}

/**
 * データ圧縮JSONP方式でAPI呼び出し（大容量データのフォールバック用）
 */
async function callWithJSONPCompressed(requestData) {
    // 大容量データを圧縮して送信
    const compressedData = compressRegistrationData(requestData);
    
    if (FRANCHISE_CONFIG.DEBUG_MODE) {
        const originalSize = JSON.stringify(requestData).length;
        const compressedSize = JSON.stringify(compressedData).length;
        console.log('🗜️ データ圧縮:', originalSize, '→', compressedSize, 'bytes (', Math.round((1 - compressedSize/originalSize) * 100), '% 削減)');
    }
    
    return await callWithJSONP(compressedData);
}

/**
 * 登録データを圧縮（重要データのみ残す）
 */
function compressRegistrationData(data) {
    // 必須フィールドのみ抽出
    const compressed = {
        action: data.action,
        // 会社基本情報（必須）
        companyName: data.companyName,
        legalName: data.legalName,
        legalNameKana: data.legalNameKana,
        representative: data.representative,
        representativeKana: data.representativeKana,
        address: data.address,
        phone: data.phone,
        postalCode: data.postalCode,
        websiteUrl: data.websiteUrl,
        
        // 連絡先（必須）
        billingEmail: data.billingEmail,
        salesEmail: data.salesEmail,
        salesPersonName: data.salesPersonName,
        salesPersonContact: data.salesPersonContact,
        representativeAsSales: data.representativeAsSales,
        
        // 事業情報（必須、圧縮）
        employees: data.employees,
        revenue: data.revenue,
        propertyTypes: Array.isArray(data.propertyTypes) ? data.propertyTypes.slice(0, 3) : data.propertyTypes,
        constructionAreas: Array.isArray(data.constructionAreas) ? data.constructionAreas.slice(0, 5) : data.constructionAreas,
        specialServices: Array.isArray(data.specialServices) ? data.specialServices.slice(0, 3) : data.specialServices,
        
        // 築年数範囲
        minBuildingAge: data.minBuildingAge,
        maxBuildingAge: data.maxBuildingAge,
        
        // エリア情報（優先エリアのみ、さらに圧縮）
        priorityAreas: (data.areas || []).filter(area => area.isPriority).map(area => 
            `${area.city}:${area.prefecture}`
        ).slice(0, 5), // 最大5つまでに制限
        
        // エリア数のみ保持
        totalAreas: (data.areas || []).length,
        priorityCount: (data.areas || []).filter(area => area.isPriority).length,
        
        // オプション情報
        tradeName: data.tradeName,
        tradeNameKana: data.tradeNameKana,
        establishedDate: data.establishedDate,
        companyPR: data.companyPR ? data.companyPR.substring(0, 200) + '...' : '', // PR文は200文字まで
        
        // 支店情報（最大3つまで）
        branches: Array.isArray(data.branches) ? data.branches.slice(0, 3) : data.branches,
        
        // メタ情報
        timestamp: data.timestamp,
        isCompressed: true
    };
    
    return compressed;
}

/**
 * GAS WebApp接続テスト
 */
async function testGASConnection() {
    const testData = {
        action: 'connectionTest',
        timestamp: new Date().toISOString()
    };
    
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'gasTest_' + Date.now();
        
        window[callbackName] = function(result) {
            try {
                document.head.removeChild(script);
                delete window[callbackName];
                
                if (FRANCHISE_CONFIG.DEBUG_MODE) {
                    console.log('✅ GAS接続テスト成功:', result);
                }
                resolve(result);
            } catch (error) {
                resolve(result);
            }
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(testData));
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodedData}`;
        script.src = url;
        
        script.onerror = function() {
            try {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                // ignore
            }
            reject(new Error('GAS WebApp connection test failed'));
        };
        
        document.head.appendChild(script);
        
        // 短いタイムアウト（10秒）
        setTimeout(() => {
            if (window[callbackName]) {
                try {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                    }
                    delete window[callbackName];
                } catch (cleanupError) {
                    // ignore
                }
                reject(new Error('Connection test timeout'));
            }
        }, 10000);
    });
}

/**
 * 設定情報の表示（デバッグ用）
 */
function showFranchiseConfig() {
    if (FRANCHISE_CONFIG.DEBUG_MODE) {
        console.log('🔧 フランチャイズ登録システム設定:', FRANCHISE_CONFIG);
    }
}

/**
 * 安定したJSONP呼び出し（全ブラウザ対応）
 */
async function callWithJSONPStable(requestData) {
    return await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'stableCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        
        // グローバルコールバック関数を定義
        window[callbackName] = function(result) {
            if (FRANCHISE_CONFIG.DEBUG_MODE) {
                console.log('📥 安定JSONP応答:', result);
            }
            
            // クリーンアップ
            try {
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                console.warn('⚠️ クリーンアップエラー（無視）:', cleanupError);
            }
            
            if (result && result.success === false) {
                reject(new Error(result.message || result.error || 'API処理エラー'));
                return;
            }
            
            resolve(result);
        };
        
        // データを最小限に圧縮
        const minData = {
            action: requestData.action,
            companyName: requestData.companyName
        };
        
        const encodedData = encodeURIComponent(JSON.stringify(minData));
        const url = `${FRANCHISE_CONFIG.API_URL}?callback=${callbackName}&data=${encodedData}`;
        
        if (FRANCHISE_CONFIG.DEBUG_MODE) {
            console.log('🔗 安定JSONP URL:', url.length, 'bytes');
        }
        
        script.src = url;
        
        script.onerror = function() {
            console.error('❌ GAS通信エラー');
            
            // クリーンアップ
            try {
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            } catch (cleanupError) {
                // ignore
            }
            
            reject(new Error('GAS通信失敗'));
        };
        
        document.head.appendChild(script);
        
        // 30秒タイムアウト
        setTimeout(() => {
            if (window[callbackName]) {
                console.error('❌ GAS通信タイムアウト');
                
                try {
                    if (script && script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    delete window[callbackName];
                } catch (cleanupError) {
                    // ignore
                }
                
                reject(new Error('GAS通信タイムアウト'));
            }
        }, 30000);
    });
}

// ローカルモック関数は削除済み

// 初期化時に設定を表示
showFranchiseConfig();