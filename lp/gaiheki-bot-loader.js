/**
 * 外壁塗装くらべる BOT埋め込みローダー（本番環境用）
 * LP業者がこのスクリプトを読み込むだけでBOTシステムが動作
 *
 * FWH側の実装:
 * <script src="https://gaihekikuraberu.com/gaiheki-bot-loader.js"></script>
 * <div id="gaiheki-bot-container"></div>
 *
 * キーワードボタン:
 * <button onclick="startScenario('塗料')">塗料</button>
 */

(function() {
    'use strict';

    console.log('🚀 外壁塗装くらべる BOTローダー起動');

    // ============================================
    // 設定
    // ============================================
    const CONFIG = {
        BOT_SCRIPTS: [
            // env-loader.jsはindex.htmlで直接ロード済み
            'js/utils.js',
            'js/bot-config.js',
            'js/bot-ui.js',
            'js/bot-core.js',
            'js/bot-scenarios.js',
            'js/bot-questions.js',
            'js/bot-integration.js',
            'js/phone-form.js',
            'js/cv-api.js',
            'js/ranking.js'
        ],
        // アバター画像をプリロード（キャッシュ）
        AVATAR_IMAGE: 'images/avatars/319260ba-0b3d-47d0-b18f-abf530c2793e.png'
    };

    // ============================================
    // BOTシステムの初期化を待つ
    // ============================================
    function waitForBotSystem() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.BotCore && window.BotCore.init) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    // ============================================
    // 郵便番号フォームをDOM生成
    // ============================================
    function createZipForm() {
        const zipFormContainer = document.createElement('div');
        zipFormContainer.id = 'gaiheki-zip-form-container';
        zipFormContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;';

        zipFormContainer.innerHTML = `
            <div style="background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 2px solid #93C5FD; padding: 16px;">
                <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="background: #22D3EE; color: white; border-radius: 9999px; padding: 4px 12px; font-size: 12px; font-weight: 500;">かんたん10秒！</span>
                </div>
                <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 12px; text-align: center; color: #1F2937;">
                    郵便番号で今すぐ相場チェック！
                </h2>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" id="gaihekiPostalCode" placeholder="例：100-0001"
                           style="width: 100%; border: 2px solid #BFDBFE; border-radius: 8px; padding: 8px 16px; text-align: center; font-size: 14px; outline: none; background: #EFF6FF;">
                    <button id="gaihekiSearchButton"
                            style="width: 100%; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; padding: 8px; border-radius: 8px; font-weight: bold; font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        🔍 無料で相場を見る
                    </button>
                    <div style="display: flex; align-items: center; justify-content: center; font-size: 12px; color: #4B5563; gap: 4px;">
                        🔒 個人情報保護・SSL暗号化通信で安全
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(zipFormContainer);

        // イベント設定
        const searchButton = document.getElementById('gaihekiSearchButton');
        const postalCodeInput = document.getElementById('gaihekiPostalCode');

        function handleSearch() {
            const postalCode = postalCodeInput.value.trim();

            if (!postalCode) {
                alert('郵便番号を入力してください');
                return;
            }

            if (!postalCode.match(/^\d{3}-?\d{4}$/)) {
                alert('正しい郵便番号を入力してください（例：100-0001）');
                return;
            }

            // 郵便番号フォームを非表示
            zipFormContainer.style.display = 'none';

            // BOT起動
            startBotSystem('zip', postalCode);
        }

        searchButton.addEventListener('click', handleSearch);
        postalCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });

        console.log('✅ 郵便番号フォーム生成完了');
    }

    // ============================================
    // BOTシステム起動（LPコンテンツを非表示）
    // ============================================
    async function startBotSystem(type, data) {
        console.log('🎯 BOTシステム起動:', type, data);

        // LP の font-size をリセット（LP は html { font-size: 100px; } なので）
        document.documentElement.style.fontSize = '16px';
        document.body.style.fontSize = '16px';
        console.log('✅ font-size を 16px にリセット');

        // BOTシステムの読み込みを待つ
        await waitForBotSystem();

        // BOT用のコンテナを表示
        showBotContainer(type);

        // LPコンテンツを非表示
        const wrapper = document.querySelector('.wrapper');
        if (wrapper) {
            wrapper.style.display = 'none';
            console.log('✅ LP wrapper を非表示');
        }

        // body直下の最初の要素以外を非表示にする簡易実装
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(el => {
            if (el.id !== 'gaiheki-bot-container' &&
                el.id !== 'gaiheki-zip-form-container' &&
                el.id !== 'botParentContainer' &&
                el.id !== 'estimateBtnContainer' &&
                el.id !== 'mobileProgressBar') {
                el.style.display = 'none';
            }
        });

        // bodyのスクロールを有効化（スマホでのスクロール問題対策）
        document.body.style.overflow = 'auto';
        document.body.style.position = 'static';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.position = 'static';
        document.documentElement.style.height = 'auto';
        console.log('✅ bodyスクロール有効化');

        // BOTシステムを初期化
        if (window.BotCore) {
            await window.BotCore.init();

            if (type === 'zip') {
                if (typeof window.BotCore.startFromZipEntry === 'function') {
                    window.BotCore.startFromZipEntry(data);
                }
            } else if (type === 'keyword') {
                if (typeof window.BotCore.startFromKeywordEntry === 'function') {
                    window.BotCore.startFromKeywordEntry(data);
                }
            }
        }

        console.log('✅ BOTシステム起動完了');
    }

    // ============================================
    // BOTコンテナを表示
    // ============================================
    function showBotContainer(type) {
        let botContainer = document.getElementById('gaiheki-bot-container');

        // LP に既存の BOT DOM がある場合はそれを使う
        const existingPriceSection = document.getElementById('priceSection');
        const existingChatSection = document.getElementById('chatSection');

        if (botContainer && existingPriceSection && existingChatSection) {
            console.log('✅ 既存のBOT DOM構造を検出、表示します');

            // コンテナを表示
            botContainer.style.display = 'block';

            // hidden クラスを削除
            const progressMeter = document.getElementById('progressMeter');
            if (progressMeter) {
                progressMeter.classList.remove('hidden');
                console.log('✅ 進捗メーター表示');
            }

            // メインコンテナは常に表示
            const mainContainer = document.getElementById('mainContentContainer');
            if (mainContainer) {
                mainContainer.classList.remove('hidden');
                mainContainer.style.display = 'flex';
                console.log('✅ メインコンテナ表示');
            }

            // チャットセクションは常に表示
            if (existingChatSection) {
                existingChatSection.classList.remove('hidden');
                console.log('✅ チャットセクション表示');
            }

            // ランキングセクションは常に表示（モザイク状態）（V1691 - デバッグログ強化）
            console.log(`🔍 エントリータイプ: ${type}`);
            const rankingSection = document.getElementById('rankingSection');
            console.log('🔍 rankingSection要素:', rankingSection);
            if (rankingSection) {
                console.log('🔍 rankingSection hiddenクラス削除前:', rankingSection.classList.contains('hidden'));
                rankingSection.classList.remove('hidden');
                console.log('✅ ランキングセクション表示（モザイク付き）');
                console.log('🔍 rankingSection hiddenクラス削除後:', rankingSection.classList.contains('hidden'));
            } else {
                console.log('❌ rankingSection要素が見つかりません');
            }

            // ランキングを初期表示（デフォルトデータ）
            if (typeof window.displayRanking === 'function') {
                console.log('🔍 displayRanking関数を呼び出します');
                window.displayRanking();
                console.log('✅ BOT起動時にランキング初期表示（デフォルトデータ）');
            } else {
                console.log('❌ displayRanking関数が見つかりません');
            }

            // キーワードからの起動時は相場セクションのみ非表示
            if (type === 'zip') {
                if (existingPriceSection) {
                    existingPriceSection.classList.remove('hidden');
                    console.log('✅ 相場セクション表示（郵便番号入力から）');
                }
            } else if (type === 'keyword') {
                console.log('⏸️ キーワードからの起動のため、相場セクションは質問完了後に表示します');
            }

            // BOT画面表示時にスクロール位置を最上部にリセット
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            return;
        }

        // 既存のDOM構造がない場合は新規作成
        if (!botContainer) {
            botContainer = document.createElement('div');
            botContainer.id = 'gaiheki-bot-container';
            document.body.appendChild(botContainer);
        }

        console.log('🔧 BOT DOM構造を新規作成');

        // lp-test.htmlからBOT部分のHTMLを挿入
        botContainer.innerHTML = `
            <div style="background: #F9FAFB; min-height: 100vh; padding: 20px 0; padding-bottom: 160px;">
                <!-- モバイル用固定プログレスバー -->
                <div id="mobileProgressBar" style="display: none; position: fixed; top: 0; left: 0; right: 0; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); z-index: 50;">
                    <div style="padding: 8px 16px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 14px; font-weight: 500; color: #374151;">進行度</span>
                        <span id="mobileProgressPercentage" style="font-size: 14px; font-weight: bold; color: #2563EB;">0%</span>
                    </div>
                    <div style="height: 4px; background: #E5E7EB;">
                        <div id="mobileProgressBarFill" style="height: 100%; width: 0%; background: transparent; transition: all 0.3s;"></div>
                    </div>
                </div>

                <!-- 相場表示 -->
                <div id="priceSection" style="display: none; max-width: 1200px; margin: 0 auto; padding: 0 16px 24px;">
                    <div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); padding: 2px;">
                        <div style="background: white; border-radius: 14px; padding: 24px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                                <h2 id="areaName" style="font-size: 20px; font-weight: bold; color: #1F2937;">検索中...</h2>
                                <span style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px;">
                                    AI診断済み
                                </span>
                            </div>
                            <div style="background: linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%); border-radius: 20px; padding: 24px 16px; box-shadow: 0 20px 60px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);">
                                <div style="text-align: center;">
                                    <p style="font-size: clamp(12px, 3vw, 15px); font-weight: 600; color: #4B5563; margin-bottom: 16px; letter-spacing: 0.02em;">
                                        戸建て2階建て（延床30坪・築25年）の場合
                                    </p>
                                    <div style="display: flex; align-items: center; justify-content: center; gap: clamp(8px, 2vw, 14px); margin-bottom: 16px; flex-wrap: nowrap;">
                                        <div style="font-size: clamp(32px, 7vw, 52px); font-weight: 700; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; letter-spacing: -0.01em; line-height: 1.1;">
                                            60万円
                                        </div>
                                        <span style="font-size: clamp(20px, 4.5vw, 36px); color: #9CA3AF; white-space: nowrap; font-weight: 400; line-height: 1.1;">〜</span>
                                        <div style="font-size: clamp(32px, 7vw, 52px); font-weight: 700; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; letter-spacing: -0.01em; line-height: 1.1;">
                                            180万円
                                        </div>
                                    </div>
                                    <p style="font-size: clamp(11px, 2.5vw, 13px); color: #6B7280; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500;">
                                        <svg style="width: 14px; height: 14px; opacity: 0.7; flex-shrink: 0;" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                                        </svg>
                                        建物の状態・使用材料により価格は変動します
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOT + ランキング -->
                <div id="mainContentContainer" style="max-width: 1200px; margin: 0 auto; padding: 0 16px; display: flex; gap: 24px; flex-wrap: wrap;">
                    <!-- AIチャットボット -->
                    <div id="chatSection" style="background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 24px; flex: 1; min-width: 300px; min-height: 500px;">
                        <div id="messages"></div>
                        <div id="choices" class="choices-container" style="margin-top: 16px;"></div>
                        <div id="typingIndicator" class="hidden" style="margin-top: 16px;">
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <div style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; animation: typing-bounce 1.4s infinite;"></div>
                                <div style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; animation: typing-bounce 1.4s infinite 0.2s;"></div>
                                <div style="width: 8px; height: 8px; background: #9CA3AF; border-radius: 50%; animation: typing-bounce 1.4s infinite 0.4s;"></div>
                            </div>
                        </div>
                        <style>
                            @keyframes typing-bounce {
                                0%, 60%, 100% { transform: translateY(0); }
                                30% { transform: translateY(-8px); }
                            }
                        </style>
                    </div>

                    <!-- ランキングセクション -->
                    <div id="rankingSection" style="display: none; background: #EBF8FF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 16px; flex: 1; min-width: 300px; position: relative;" data-theme="blue">
                        <h2 id="rankingTitle" style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">おすすめ業者ランキング</h2>

                        <!-- モザイク時のメッセージ -->
                        <div id="mosaicMessage" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: none;">
                            <div style="background: white; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                                <div style="color: #3B82F6; margin-bottom: 16px;">
                                    🔒
                                </div>
                                <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #2563EB; white-space: nowrap;">質問に答えるとランキング表示！</h3>
                                <div style="color: #6B7280; margin-bottom: 16px; font-size: 10px;">
                                    <p style="display: flex; align-items: flex-start; flex-wrap: nowrap; margin-bottom: 4px;">
                                        <span style="color: #10B981; margin-right: 4px; flex-shrink: 0;">✅</span>
                                        <span style="white-space: nowrap;">AI診断で最適マッチング！</span>
                                    </p>
                                    <p style="display: flex; align-items: flex-start; flex-wrap: nowrap; margin-bottom: 4px;">
                                        <span style="color: #10B981; margin-right: 4px; flex-shrink: 0;">✅</span>
                                        <span style="white-space: nowrap;">実績データで信頼できる！</span>
                                    </p>
                                    <p style="display: flex; align-items: flex-start; flex-wrap: nowrap; margin-bottom: 4px;">
                                        <span style="color: #10B981; margin-right: 4px; flex-shrink: 0;">✅</span>
                                        <span style="white-space: nowrap;">4社まで無料見積もり可能！</span>
                                    </p>
                                </div>
                                <div id="progressMeter">
                                    <div style="display: flex; justify-content: flex-end; font-size: 12px; color: #6B7280; margin-bottom: 4px;">
                                        <span id="progressPercentage">0%</span>
                                    </div>
                                    <div style="width: 100%; background: #E5E7EB; border-radius: 9999px; height: 8px;">
                                        <div id="progressBar" style="height: 100%; border-radius: 9999px; width: 0%; background: transparent; transition: all 0.5s;"></div>
                                    </div>
                                    <p style="font-size: 12px; color: #2563EB; margin-top: 8px; font-weight: 500;">AIチャットの質問に答えて下さい</p>
                                </div>
                            </div>
                        </div>

                        <!-- ランキング内容 -->
                        <div id="rankingContent" class="mosaic" style="position: relative;">
                            <!-- 透明オーバーレイ（電話番号入力前はクリックブロック） V1689 -->
                            <div id="rankingClickBlocker" style="position: absolute; inset: 0; z-index: 20; background: transparent; cursor: not-allowed;"></div>
                            <div id="rankingList"></div>
                        </div>
                    </div>
                </div>

                <!-- 見積もりボタン（固定位置） -->
                <div id="estimateBtnContainer" style="display: none; position: fixed; bottom: 0; left: 0; right: 0; background: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); padding: 16px; z-index: 9999;">
                    <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
                        <button onclick="showKeepModal();" style="background: #FB923C; color: white; font-weight: bold; padding: 16px 80px; border-radius: 9999px; font-size: 18px; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(251,146,60,0.4); position: relative;">
                            無料見積もり
                            <span class="notification-badge" style="position: absolute; top: -12px; right: -12px; background: #EF4444; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">0</span>
                        </button>
                    </div>
                </div>

                <!-- フッター -->
                <footer style="padding: 33px 0 16px; text-align: center; color: #fff; background: linear-gradient(135deg, #3B82F6, #2563EB); margin-top: 40px;">
                    <small style="font-size: 12px; display: block; font-weight: 400;">&copy;外壁塗装くらべる All Rights Reserved.</small>
                </footer>
            </div>
        `;

        botContainer.style.display = 'block';
        console.log('✅ BOTコンテナを表示しました');

        // BOT画面表示時にスクロール位置を最上部にリセット
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }

    // ============================================
    // グローバル関数: キーワードからBOT起動
    // ============================================
    window.startScenario = function(keyword) {
        console.log('🎯 シナリオ開始:', keyword);

        // 郵便番号フォームを非表示
        const zipFormContainer = document.getElementById('gaiheki-zip-form-container');
        if (zipFormContainer) {
            zipFormContainer.style.display = 'none';
        }

        startBotSystem('keyword', keyword);
    };

    // ============================================
    // BOTスタイル読み込み
    // ============================================
    function loadBotStyles() {
        // Tailwind CSS
        const tailwind = document.createElement('script');
        tailwind.src = 'https://cdn.tailwindcss.com';
        document.head.appendChild(tailwind);

        // Google Fonts
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(fontLink);

        // カスタムスタイル
        const customStyle = document.createElement('style');
        customStyle.textContent = `
            @keyframes bounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
            }

            body {
                font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
                margin: 0;
                padding: 0;
            }

            .ai-message {
                background: linear-gradient(135deg, #7B9BF0 0%, #9EBDFD 100%);
                color: white;
                border-radius: 24px 24px 24px 4px;
                padding: 16px 20px;
                margin: 20px 0;
                max-width: 80%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            }

            .ai-message-container {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                margin: 20px 0;
            }

            .ai-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            }

            .user-message {
                background: #F5F5F5;
                color: #2D3748;
                border-radius: 24px 24px 4px 24px;
                padding: 16px 20px;
                margin: 20px 0 20px auto;
                max-width: 80%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            }

            .choice-btn {
                border: 2px solid #E2E8F0;
                background: white;
                color: #4A5568;
                padding: 16px 20px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                margin: 8px 0;
                width: 100%;
                text-align: left;
                transition: all 0.3s ease;
            }

            .choice-btn:hover {
                background: #F7FAFC;
                border-color: #7B9BF0;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(123, 155, 240, 0.15);
            }

            .choice-btn:active {
                background: rgba(123, 155, 240, 0.1);
                transform: translateY(0);
            }

            .mosaic {
                filter: blur(8px);
                transition: filter 0.5s ease;
            }

            .phone-mini-form {
                background: linear-gradient(135deg, #EBF8FF, #DBEAFE);
                border-radius: 16px;
                padding: 24px;
                margin: 20px 0;
            }

            .phone-input-wrapper {
                background: white !important;
                border: 3px solid #7DD3FC !important;
                border-radius: 12px;
                padding: 4px;
                margin-bottom: 12px;
            }

            .phone-input {
                width: 100%;
                padding: 12px;
                font-size: 18px;
                border: none;
                outline: none;
                text-align: center;
                font-weight: 500;
            }

            .phone-submit-btn {
                width: 100%;
                background: linear-gradient(135deg, #7B9BF0, #9EBDFD);
                color: white;
                padding: 14px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                border: none;
            }

            .phone-submit-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            @media (max-width: 768px) {
                #gaiheki-zip-form-container {
                    position: static !important;
                    max-width: 100% !important;
                    padding: 16px;
                }
            }
        `;
        document.head.appendChild(customStyle);

        console.log('✅ スタイル読み込み完了');
    }

    // ============================================
    // BOTスクリプト読み込み（直列）
    // ============================================
    function loadBotScripts() {
        const totalScripts = CONFIG.BOT_SCRIPTS.length;
        let loadedCount = 0;

        // スクリプトを1つずつ順番にロード
        function loadNextScript(index) {
            if (index >= totalScripts) {
                console.log('✅ 全スクリプト読み込み完了');
                return;
            }

            const src = CONFIG.BOT_SCRIPTS[index];
            const script = document.createElement('script');
            script.src = src + '?v=' + (window.ENV ? window.ENV.CACHE_BUSTER : Date.now());

            script.onload = () => {
                loadedCount++;
                console.log(`✅ スクリプト読み込み完了 (${loadedCount}/${totalScripts}): ${src}`);

                // 次のスクリプトをロード
                loadNextScript(index + 1);
            };

            script.onerror = () => {
                console.error(`❌ スクリプト読み込み失敗: ${src}`);
                // エラーでも次のスクリプトをロード
                loadNextScript(index + 1);
            };

            document.body.appendChild(script);
        }

        // 最初のスクリプトから開始
        loadNextScript(0);
    }

    // ============================================
    // アバター画像をプリロード（キャッシュ）
    // ============================================
    function preloadAvatarImage() {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = CONFIG.AVATAR_IMAGE;
        document.head.appendChild(link);

        // Imageオブジェクトでも事前ロード（ブラウザキャッシュに確実に保存）
        const img = new Image();
        img.onload = () => {
            console.log('✅ アバター画像プリロード完了:', CONFIG.AVATAR_IMAGE);
        };
        img.onerror = () => {
            console.warn('⚠️ アバター画像プリロード失敗:', CONFIG.AVATAR_IMAGE);
        };
        img.src = CONFIG.AVATAR_IMAGE;
    }

    // ============================================
    // 初期化
    // ============================================
    window.addEventListener('DOMContentLoaded', function() {
        console.log('📋 DOM読み込み完了');

        // スタイル読み込み
        loadBotStyles();

        // アバター画像をプリロード（チャットメッセージとの時差をなくす）
        preloadAvatarImage();

        // BOTスクリプト読み込み
        loadBotScripts();

        // 郵便番号フォーム生成（LPには既存フォームがあるためコメントアウト）
        // setTimeout(() => {
        //     createZipForm();
        // }, 500);

        // LP の既存郵便番号フォームに対応
        const lpPostalCode = document.getElementById('postalCode');
        const lpSearchButton = document.getElementById('searchButton');

        if (lpPostalCode && lpSearchButton) {
            console.log('📍 LP郵便番号フォーム検出');

            const handleLPSearch = function() {
                const postal = lpPostalCode.value.trim();

                if (!postal) {
                    alert('郵便番号を入力してください');
                    return;
                }

                if (!postal.match(/^\d{3}-?\d{4}$/)) {
                    alert('正しい郵便番号を入力してください（例：100-0001）');
                    return;
                }

                console.log('🚀 LP郵便番号フォームから起動:', postal);

                // BOT起動
                waitForBotSystem().then(() => {
                    startBotSystem('zip', postal);
                });
            };

            lpSearchButton.addEventListener('click', handleLPSearch);
            lpPostalCode.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLPSearch();
                }
            });

            console.log('✅ LP郵便番号フォームイベント設定完了');
        }

        console.log('✅ 外壁塗装くらべる BOTローダー初期化完了');
    });

    // ============================================
    // グローバル関数: キーワードからBOT起動
    // ============================================
    window.startScenario = function(keyword) {
        console.log('🎯 キーワードからBOT起動:', keyword);
        waitForBotSystem().then(() => {
            startBotSystem('keyword', keyword);
        });
    };

})();
