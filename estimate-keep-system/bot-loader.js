/**
 * ============================================
 * 外壁塗装くらべる - 完全自動生成BOTローダー
 * ============================================
 *
 * FREE WEB HOPE様のLPに以下の3行を追加するだけで全て動作：
 *
 * <script src="https://cdn.tailwindcss.com"></script>
 * <link rel="stylesheet" href="https://gaihekikuraberu.com/estimate-keep-system/bot-loader.css">
 * <script src="https://gaihekikuraberu.com/estimate-keep-system/bot-loader.js"></script>
 *
 * これだけで：
 * - 郵便番号入力フォーム
 * - キーワード45個
 * - BOT画面
 * - ランキング画面
 * - 見積もりフォーム
 * が全て自動生成されます
 */

(function() {
    'use strict';

    const BASE_URL = 'https://gaihekikuraberu.com/estimate-keep-system/';

    // 45個のキーワード
    const KEYWORDS = [
        '塗料', 'クチコミ', 'おすすめ', '最低価格', '助成金',
        '外壁塗装', '外壁張替え', '外壁補修', '外壁＋屋根塗装', '屋根張り替え',
        '遮熱・断熱', '火災保険', 'ひび割れ', '剥がれ', '汚れ',
        'チョーク', 'タイミング', '施工時期', '予算50万円以下', '予算50〜100万円',
        '予算100〜200万円', '予算150万円〜', '安い順', '実績', '設立年数',
        '従業員数', '保有資格', '職人直営', 'ハウスメーカー', 'リフォーム',
        'リフォームローン', 'カバー工法', '張替え', '補修', '訪問業者',
        '高品質・長持ち', '屋根材', 'ガルバリウム', 'アフターフォロー', '各種保険',
        'カラーシミュレーション', '屋上・ベランダ防水', '外壁＋屋根張り替え', '外壁＋屋根補修', '施工時期'
    ];

    // 読み込むJSファイル
    const SCRIPTS = [
        'js/bot-config.js',
        'js/bot-ui.js',
        'js/bot-core.js',
        'js/bot-scenarios.js',
        'js/bot-questions.js',
        'js/phone-form.js',
        'js/ranking.js',
        'js/utils.js'
    ];

    console.log('🚀 外壁塗装くらべる BOTシステム読み込み開始');

    // HTML構造を生成
    function generateHTML() {
        const container = document.body;

        const html = `
            <!-- モバイル用プログレスバー -->
            <div id="mobileProgressBar" class="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 md:hidden hidden">
                <div class="px-4 py-2 flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700">進行度</span>
                    <span id="mobileProgressPercentage" class="text-sm font-bold text-blue-600">0%</span>
                </div>
                <div class="h-1 bg-gray-200">
                    <div id="mobileProgressBarFill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #3B82F6, #8B5CF6); transition: all 0.3s;"></div>
                </div>
            </div>

            <!-- ヘッダー -->
            <header class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
                <div class="max-w-7xl mx-auto px-4 text-center">
                    <h1 class="text-4xl md:text-5xl font-bold mb-4">外壁塗装のことならお任せください</h1>
                    <p class="text-xl md:text-2xl">最適な業者を無料でご紹介</p>
                </div>
            </header>

            <!-- 郵便番号入力フォーム（右上固定） -->
            <div id="postalFormSection" class="fixed top-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-4 z-50 w-80">
                <div class="mb-2 flex items-center justify-between">
                    <span class="bg-cyan-400 text-white rounded-full px-3 py-1 text-xs font-medium">かんたん10秒！</span>
                </div>
                <h2 class="text-base font-bold mb-3 text-center">郵便番号で今すぐ相場チェック！</h2>
                <div class="space-y-2">
                    <input type="text" id="postalCode" placeholder="例：100-0001"
                           class="w-full border-2 border-blue-200 rounded-lg px-4 py-2 text-center text-sm focus:outline-none focus:border-blue-500 bg-blue-50">
                    <button id="searchButton"
                            class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 font-bold text-sm flex items-center justify-center gap-2">
                        🔍 無料で相場を見る
                    </button>
                    <div class="flex items-center justify-center text-xs text-gray-600 gap-1">
                        🔒 個人情報保護・SSL暗号化通信で安全
                    </div>
                </div>
            </div>

            <!-- キーワードセクション -->
            <div id="keywordSection" class="max-w-6xl mx-auto px-4 py-16">
                <h2 class="text-3xl font-bold text-center mb-8 text-gray-800">条件から業者を探す</h2>
                <div class="bg-white rounded-xl shadow-lg p-8">
                    <div class="flex flex-wrap justify-center gap-2">
                        ${KEYWORDS.map(keyword => `
                            <button class="keyword-link" onclick="startScenario('${keyword}')">${keyword}</button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- メインコンテンツ（BOT + ランキング） -->
            <div id="mainContentContainer" class="hidden">
                <!-- 相場表示 -->
                <div id="priceSection" class="hidden bg-white py-8 mb-4">
                    <div class="max-w-7xl mx-auto px-4">
                        <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-300 p-6 shadow-lg">
                            <div class="flex items-center justify-between mb-4">
                                <h2 id="areaName" class="text-2xl font-bold text-gray-800"></h2>
                                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">AI診断済み</button>
                            </div>
                            <div class="text-center">
                                <p class="text-sm text-gray-600 mb-2">戸建て2階建て（延床30坪・築25年）の場合</p>
                                <div class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                    60万円 〜 180万円
                                </div>
                                <p class="text-xs text-gray-500 mt-2">建物の状態・使用材料により価格は変動します</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOT + ランキング 2カラム -->
                <div class="max-w-7xl mx-auto px-4 pb-16">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- BOT側 -->
                        <div class="bg-white rounded-xl shadow-lg p-6">
                            <div id="progressMeter" class="mb-4 hidden">
                                <div class="flex justify-end text-xs text-gray-500 mb-1">
                                    <span id="progressPercentage">0%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div id="progressBar" style="height: 8px; border-radius: 9999px; width: 0%; background: linear-gradient(90deg, #3B82F6, #8B5CF6); transition: all 0.5s;"></div>
                                </div>
                                <p class="text-xs text-blue-600 mt-2 font-medium">AIチャットの質問に答えて下さい</p>
                            </div>
                            <div id="messages"></div>
                            <div id="choices"></div>
                        </div>

                        <!-- ランキング側 -->
                        <div id="rankingContent" class="mosaic">
                            <div class="bg-white rounded-xl shadow-lg p-6 text-center">
                                <h3 class="text-lg font-bold mb-4">オリジナル業者ランキング！</h3>
                                <p class="text-sm text-gray-600 mb-4">AIの質問に答えて、あなただけの条件にマッチした業者を表示します</p>
                                <div class="opacity-30">
                                    <div class="h-32 bg-gray-200 rounded mb-4"></div>
                                    <div class="h-32 bg-gray-200 rounded mb-4"></div>
                                    <div class="h-32 bg-gray-200 rounded mb-4"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
        console.log('✅ HTML構造を生成完了');
    }

    // JSファイルを順次読み込み
    function loadScripts(scripts, callback) {
        let loaded = 0;

        function loadNext() {
            if (loaded >= scripts.length) {
                console.log('✅ 全JSファイル読み込み完了');
                callback();
                return;
            }

            const script = document.createElement('script');
            script.src = BASE_URL + scripts[loaded];
            script.onload = function() {
                console.log('✅ 読み込み完了:', scripts[loaded]);
                loaded++;
                loadNext();
            };
            script.onerror = function() {
                console.error('❌ 読み込み失敗:', scripts[loaded]);
                loaded++;
                loadNext();
            };
            document.head.appendChild(script);
        }

        loadNext();
    }

    // 初期化
    function init() {
        // HTML生成
        generateHTML();

        // JSファイル読み込み
        loadScripts(SCRIPTS, function() {
            console.log('🎉 外壁塗装くらべるシステム初期化完了');

            // BotConfigの初期化
            if (typeof BotConfig !== 'undefined' && typeof BotConfig.loadFlowData === 'function') {
                BotConfig.loadFlowData();
            }

            // グローバル関数を定義
            window.startScenario = function(keyword) {
                console.log('🎯 シナリオ開始:', keyword);

                document.getElementById('keywordSection').style.display = 'none';
                document.querySelector('header').style.display = 'none';
                document.getElementById('postalFormSection').style.display = 'none';
                document.getElementById('mainContentContainer').classList.remove('hidden');
                document.getElementById('mobileProgressBar').classList.remove('hidden');
                document.getElementById('progressMeter').classList.remove('hidden');

                if (window.BotCore && typeof window.BotCore.startFromKeywordEntry === 'function') {
                    window.BotCore.startFromKeywordEntry(keyword);
                } else {
                    console.error('❌ BotCoreが読み込まれていません');
                }
            };

            window.handlePostalCodeSearch = function() {
                const postalCode = document.getElementById('postalCode').value.trim();

                if (!postalCode) {
                    alert('郵便番号を入力してください');
                    return;
                }

                if (!postalCode.match(/^\d{3}-?\d{4}$/)) {
                    alert('正しい郵便番号を入力してください（例：100-0001）');
                    return;
                }

                document.getElementById('keywordSection').style.display = 'none';
                document.querySelector('header').style.display = 'none';
                document.getElementById('postalFormSection').style.display = 'none';
                document.getElementById('priceSection').classList.remove('hidden');
                document.getElementById('areaName').textContent = '東京都千代田区の外壁塗装相場';
                document.getElementById('mainContentContainer').classList.remove('hidden');
                document.getElementById('mobileProgressBar').classList.remove('hidden');
                document.getElementById('progressMeter').classList.remove('hidden');

                if (window.BotCore && typeof window.BotCore.startFromZipEntry === 'function') {
                    window.BotCore.startFromZipEntry(postalCode);
                } else {
                    console.error('❌ BotCoreが読み込まれていません');
                }
            };

            // searchButtonにイベントリスナーを設定
            const searchButton = document.getElementById('searchButton');
            if (searchButton) {
                searchButton.addEventListener('click', window.handlePostalCodeSearch);
            }

            // グローバルAPIを公開
            window.GaihekiSystem = {
                startKeyword: window.startScenario,
                startPostalCode: function(postalCode) {
                    document.getElementById('postalCode').value = postalCode;
                    window.handlePostalCodeSearch();
                }
            };
        });
    }

    // DOMContentLoadedで初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
