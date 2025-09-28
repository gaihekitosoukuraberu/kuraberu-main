// chatbot-v2-integrated.js - 完全統合版
// CV1→ランキング→CV2フロー完全実装

class IntegratedScenarioManager {
    constructor() {
        this.scenariosData = null;
        this.currentScenario = null;
        this.commonQuestions = null;
        this.rankingData = null;
    }

    async loadScenarios() {
        try {
            const response = await fetch('./bot-scenarios.json');
            const data = await response.json();
            this.scenariosData = data;
            this.entryScenarios = data.entryScenarios;
            this.commonQuestions = data.commonQuestions;
            this.rankingData = data.rankingData;
            this.conversionPoints = data.conversionPoints;
            
            console.log('✅ 統合版シナリオ読み込み成功 v' + data.version);
            return true;
        } catch (error) {
            console.error('❌ シナリオ読み込みエラー:', error);
            return false;
        }
    }

    getScenario(keyword) {
        if (!keyword) return this.entryScenarios['general'];
        
        for (const [key, scenario] of Object.entries(this.entryScenarios)) {
            if (key === keyword || 
                scenario.displayName === keyword || 
                scenario.lpKeyword === keyword ||
                scenario.id === keyword) {
                return scenario;
            }
        }
        
        return this.entryScenarios['general'];
    }

    getQuestionFlow(scenario) {
        // カスタムフローがある場合
        if (scenario.customFlow) {
            return 'custom';
        }
        
        // fastTrack（即座に郵便番号）の場合
        if (scenario.fastTrack) {
            return 'fasttrack';
        }
        
        // 通常の質問フロー
        if (scenario.questionFlow) {
            return scenario.questionFlow;
        }
        
        // デフォルトフロー
        return ['Q001', 'Q004', 'Q004A', 'Q004B', 'Q014', 'Q015'];
    }

    shouldSkipQuestion(scenario, questionId) {
        if (!scenario.skipQuestions) return false;
        return scenario.skipQuestions.includes(questionId);
    }

    getQuestion(questionId) {
        // 全カテゴリから質問を検索
        for (const category of Object.values(this.commonQuestions)) {
            if (category[questionId]) {
                return category[questionId];
            }
        }
        return null;
    }
}

class ChatbotUIIntegrated {
    constructor() {
        this.messageContainer = document.getElementById('messageContainer');
        this.choicesContainer = document.getElementById('choicesContainer');
        this.chatContainer = document.getElementById('chatContainer');
        this.typingSpeed = 20;
        this.avatarUrl = 'https://storage.googleapis.com/msgmate_bucket/kuraberu-gaiheki/kuraberu-chan.png';
    }

    async addAIMessage(text, withTyping = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message-container new-message';
        
        const avatar = document.createElement('img');
        avatar.src = this.avatarUrl;
        avatar.alt = 'くらべるちゃん';
        avatar.className = 'ai-avatar';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'ai-message';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        this.messageContainer.appendChild(messageDiv);
        
        if (withTyping) {
            await this.typeMessage(messageContent, text);
        } else {
            messageContent.textContent = text;
        }
        
        this.scrollToBottom();
    }

    async typeMessage(element, text) {
        element.classList.add('typing-animation');
        
        for (let i = 0; i <= text.length; i++) {
            element.textContent = text.substring(0, i);
            await this.sleep(this.typingSpeed);
        }
        
        element.classList.remove('typing-animation');
    }

    addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.textContent = text;
        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showChoices(choices) {
        this.clearChoices();
        
        choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.textContent = choice.label;
            button.onclick = () => choice.onClick();
            this.choicesContainer.appendChild(button);
        });
    }

    showPostalInput(onSubmit) {
        this.clearChoices();
        
        const container = document.createElement('div');
        container.className = 'postal-input-container';
        
        const title = document.createElement('h3');
        title.textContent = '郵便番号入力';
        title.className = 'text-lg font-semibold mb-3';
        
        const label = document.createElement('label');
        label.textContent = '郵便番号（ハイフンなし7桁）';
        label.className = 'block text-sm font-medium text-gray-700 mb-2';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '1234567';
        input.maxLength = 7;
        input.className = 'postal-input';
        input.pattern = '[0-9]*';
        
        // リアルタイムバリデーション
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        const button = document.createElement('button');
        button.textContent = '次へ進む';
        button.className = 'postal-submit-button';
        button.onclick = () => {
            const value = input.value.replace(/[^0-9]/g, '');
            if (value.length === 7) {
                console.log('📍 郵便番号入力完了', value);
                onSubmit(value);
            } else {
                this.showError('7桁の郵便番号を入力してください');
            }
        };
        
        // Enterキーでも送信
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                button.click();
            }
        });
        
        container.appendChild(title);
        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(button);
        this.choicesContainer.appendChild(container);
        
        input.focus();
    }

    showPhoneInput(onSubmit) {
        this.clearChoices();
        
        const container = document.createElement('div');
        container.className = 'postal-input-container';
        
        const title = document.createElement('h3');
        title.textContent = '電話番号入力（CV1）';
        title.className = 'text-lg font-semibold mb-3';
        title.style.color = '#4CAF50';
        
        const label = document.createElement('label');
        label.textContent = '電話番号（ハイフンなし）';
        label.className = 'block text-sm font-medium text-gray-700 mb-2';
        
        const input = document.createElement('input');
        input.type = 'tel';
        input.placeholder = '09012345678';
        input.maxLength = 11;
        input.className = 'postal-input';
        input.pattern = '[0-9]*';
        
        // リアルタイムバリデーション
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        const button = document.createElement('button');
        button.textContent = '業者ランキングを見る';
        button.className = 'postal-submit-button';
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        button.onclick = () => {
            const value = input.value.replace(/[^0-9]/g, '');
            if (value.length >= 10 && value.length <= 11) {
                console.log('✅ CV1達成: 電話番号入力完了', value);
                onSubmit(value);
            } else {
                this.showError('正しい電話番号を入力してください');
            }
        };
        
        // Enterキーでも送信
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                button.click();
            }
        });
        
        container.appendChild(title);
        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(button);
        this.choicesContainer.appendChild(container);
        
        input.focus();
    }

    showRanking(companies, area) {
        const rankingDiv = document.createElement('div');
        rankingDiv.className = 'ranking-container';
        rankingDiv.innerHTML = `
            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-4">
                <h3 class="text-xl font-bold">🏆 ${area}のおすすめ業者ランキング</h3>
            </div>
        `;
        
        companies.forEach((company, index) => {
            const companyCard = document.createElement('div');
            companyCard.className = 'company-card';
            companyCard.innerHTML = `
                <div style="background: white; border: 2px solid #7B9BF0; border-radius: 12px; padding: 16px; margin: 12px 0; cursor: pointer; transition: all 0.3s;"
                     onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(123,155,240,0.3)';"
                     onmouseout="this.style.transform=''; this.style.boxShadow='';">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: 600; font-size: 18px; color: #2D3748;">
                                ${index + 1}位: ${company.name}
                            </div>
                            <div style="color: #7B9BF0; margin-top: 8px;">
                                ⭐ ${company.rating} (${company.reviews}件のレビュー)
                            </div>
                            <div style="color: #666; font-size: 14px; margin-top: 4px;">
                                得意分野: ${company.specialties.join('・')}
                            </div>
                        </div>
                        <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">
                            おすすめ
                        </div>
                    </div>
                </div>
            `;
            rankingDiv.appendChild(companyCard);
        });
        
        this.messageContainer.appendChild(rankingDiv);
        this.scrollToBottom();
        
        // ランキング表示トラッキング
        console.log('📊 ランキング表示完了');
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'ai-message-container';
        indicator.id = 'typingIndicator';
        
        const avatar = document.createElement('img');
        avatar.src = this.avatarUrl;
        avatar.alt = 'くらべるちゃん';
        avatar.className = 'ai-avatar';
        
        const typing = document.createElement('div');
        typing.className = 'ai-message typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        
        indicator.appendChild(avatar);
        indicator.appendChild(typing);
        this.messageContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    showCV2Buttons() {
        this.clearChoices();
        
        const container = document.createElement('div');
        container.className = 'cv2-container';
        container.innerHTML = `
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); border-radius: 12px; padding: 20px; margin: 16px 0; text-align: center;">
                <h3 style="color: white; font-size: 20px; font-weight: 600; margin-bottom: 16px;">
                    📝 次のステップ
                </h3>
                <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">
                    気になる業者の詳しい見積もりを取得しましょう
                </p>
                <button onclick="window.location.href='/estimate-form.html'" 
                        style="background: white; color: #4CAF50; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin: 8px; transition: all 0.3s;"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)';"
                        onmouseout="this.style.transform=''; this.style.boxShadow='';">
                    無料見積もりを依頼する（CV2）
                </button>
                <button onclick="continueChat()" 
                        style="background: transparent; color: white; border: 2px solid white; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; margin: 8px; transition: all 0.3s;"
                        onmouseover="this.style.background='rgba(255,255,255,0.1)';"
                        onmouseout="this.style.background='transparent';">
                    もっと詳しく相談する
                </button>
            </div>
        `;
        
        this.choicesContainer.appendChild(container);
        
        // CV2表示トラッキング
        console.log('🎯 CV2: 見積もりボタン表示');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #FEE; color: #C00; padding: 8px 12px; border-radius: 4px; margin-top: 8px; font-size: 14px;';
        errorDiv.textContent = message;
        
        const existingError = this.choicesContainer.querySelector('[style*="FEE"]');
        if (existingError) {
            existingError.remove();
        }
        
        this.choicesContainer.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    clearChoices() {
        this.choicesContainer.innerHTML = '';
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class PostalAPIIntegrated {
    async getAddressFromPostal(postalCode) {
        try {
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                return {
                    prefecture: result.address1,
                    city: result.address2,
                    town: result.address3,
                    fullAddress: `${result.address1}${result.address2}${result.address3}`
                };
            }
            return null;
        } catch (error) {
            console.error('郵便番号API エラー:', error);
            return null;
        }
    }
}

class IntegratedChatbot {
    constructor() {
        this.scenarioManager = new IntegratedScenarioManager();
        this.ui = new ChatbotUIIntegrated();
        this.postalAPI = new PostalAPIIntegrated();
        this.currentScenario = null;
        this.currentQuestionIndex = 0;
        this.questionFlow = [];
        this.userData = {
            keyword: null,
            postalCode: null,
            address: null,
            answers: {},
            skippedQuestions: []
        };
    }

    async init() {
        console.log('🚀 統合版Chatbot v2.1.0 初期化開始');
        
        const loaded = await this.scenarioManager.loadScenarios();
        if (!loaded) {
            await this.ui.addAIMessage('申し訳ございません。システムの初期化に失敗しました。');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const keyword = urlParams.get('keyword') || urlParams.get('lp') || 'general';
        this.userData.keyword = keyword;
        
        this.currentScenario = this.scenarioManager.getScenario(keyword);
        console.log('📋 シナリオ:', this.currentScenario.displayName);
        
        await this.startConversation();
    }

    async startConversation() {
        // グリーティング
        await this.ui.addAIMessage(this.currentScenario.greeting);
        
        // フロー判定
        const flow = this.scenarioManager.getQuestionFlow(this.currentScenario);
        
        if (flow === 'fasttrack') {
            // 即座に郵便番号入力（CV1）
            console.log('⚡ FastTrack: 即座に郵便番号入力');
            await this.ui.sleep(1000);
            await this.ui.addAIMessage('お住まいのエリアで対応可能な業者をお探しします。');
            this.showPostalInput();
        } else if (flow === 'custom') {
            // カスタムフロー
            console.log('🔄 カスタムフロー開始');
            await this.handleCustomFlow();
        } else {
            // 通常の質問フロー
            console.log('📝 通常フロー開始');
            this.questionFlow = flow;
            await this.ui.sleep(1000);
            await this.startQuestionFlow();
        }
    }

    async handleCustomFlow() {
        const customFlow = this.currentScenario.customFlow;
        
        if (customFlow.initial.type === 'select') {
            await this.ui.addAIMessage(customFlow.initial.message);
            
            const choices = customFlow.initial.options.map(option => ({
                label: option.label,
                onClick: async () => {
                    this.ui.clearChoices();
                    this.ui.addUserMessage(option.label);
                    this.userData.answers.customInitial = option.value;
                    
                    await this.ui.sleep(500);
                    await this.ui.addAIMessage(option.response);
                    
                    if (customFlow.initial.nextAction === 'mainQuestions') {
                        // メイン質問フローへ
                        this.questionFlow = this.currentScenario.questionFlow || ['Q001', 'Q004B', 'Q014', 'Q015'];
                        await this.ui.sleep(1000);
                        await this.startQuestionFlow();
                    }
                }
            }));
            
            this.ui.showChoices(choices);
        }
    }

    async startQuestionFlow() {
        // 最初に郵便番号を取得（1〜3問目のどこか）
        if (!this.userData.postalCode && this.currentQuestionIndex <= 2) {
            await this.ui.addAIMessage('まずはお住まいの地域を教えてください。');
            this.showPostalInput();
            return;
        }
        
        // 質問完了→電話番号(CV1)入力へ
        if (this.currentQuestionIndex >= this.questionFlow.length) {
            if (!this.userData.phoneNumber) {
                await this.ui.addAIMessage('最後に、連絡先を教えてください。おすすめの業者ランキングをご案内します。');
                this.showPhoneInput();
            } else {
                await this.showRankingAndCV2();
            }
            return;
        }
        
        const questionId = this.questionFlow[this.currentQuestionIndex];
        
        // スキップチェック
        if (this.scenarioManager.shouldSkipQuestion(this.currentScenario, questionId)) {
            console.log(`⏭️ 質問スキップ: ${questionId}`);
            this.userData.skippedQuestions.push(questionId);
            this.currentQuestionIndex++;
            await this.startQuestionFlow();
            return;
        }
        
        const question = this.scenarioManager.getQuestion(questionId);
        if (!question) {
            console.log(`⚠️ 質問が見つかりません: ${questionId}`);
            this.currentQuestionIndex++;
            await this.startQuestionFlow();
            return;
        }
        
        await this.ui.addAIMessage(question.text);
        
        const choices = question.choices.map((choice, index) => ({
            label: choice,
            onClick: async () => {
                this.ui.clearChoices();
                this.ui.addUserMessage(choice);
                this.userData.answers[questionId] = choice;
                
                await this.ui.sleep(500);
                
                // 次の質問へ
                const nextQuestion = question.branches[index];
                if (nextQuestion === 'phone') {
                    // 電話番号(CV1)入力へ
                    await this.ui.addAIMessage('連絡先を教えてください。');
                    this.showPhoneInput();
                } else if (nextQuestion === 'next') {
                    this.currentQuestionIndex++;
                    await this.startQuestionFlow();
                } else {
                    // 特定の質問へジャンプ
                    const nextIndex = this.questionFlow.indexOf(nextQuestion);
                    if (nextIndex !== -1) {
                        this.currentQuestionIndex = nextIndex;
                    } else {
                        this.currentQuestionIndex++;
                    }
                    await this.startQuestionFlow();
                }
            }
        }));
        
        this.ui.showChoices(choices);
    }

    showPostalInput() {
        this.ui.showPostalInput(async (postalCode) => {
            this.ui.clearChoices();
            this.ui.addUserMessage(postalCode);
            
            // 郵便番号保存
            this.userData.postalCode = postalCode;
            console.log('📍 郵便番号入力完了', postalCode);
            
            this.ui.showTypingIndicator();
            const address = await this.postalAPI.getAddressFromPostal(postalCode);
            this.ui.hideTypingIndicator();
            
            if (address) {
                this.userData.address = address;
                await this.ui.addAIMessage(`${address.prefecture}${address.city}にお住まいですね。`);
                
                // 相場表示
                await this.ui.sleep(1000);
                await this.showPriceEstimate();
                
                // 質問フロー続行
                await this.ui.sleep(2000);
                await this.ui.addAIMessage('続いて、いくつか質問させていただきます。');
                await this.ui.sleep(1000);
                await this.startQuestionFlow();
            } else {
                await this.ui.addAIMessage('郵便番号が見つかりませんでした。もう一度入力してください。');
                this.showPostalInput();
            }
        });
    }

    showPhoneInput() {
        this.ui.showPhoneInput(async (phoneNumber) => {
            this.ui.clearChoices();
            this.ui.addUserMessage(phoneNumber);
            
            // CV1達成
            this.userData.phoneNumber = phoneNumber;
            console.log('✅ CV1達成: 電話番号入力完了', phoneNumber);
            
            await this.ui.addAIMessage('ありがとうございます！お住まいのエリアでおすすめの業者をご紹介します。');
            await this.ui.sleep(1000);
            await this.showRankingAndCV2();
        });
    }

    async showPriceEstimate() {
        await this.ui.addAIMessage('お住まいのエリアの相場をお調べしました。');
        await this.ui.sleep(500);
        
        // 相場カード表示
        const priceCard = document.createElement('div');
        priceCard.className = 'price-card';
        priceCard.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 8px;">
                📊 ${this.userData.address ? this.userData.address.prefecture : 'お住まいのエリア'}の外壁塗装相場
            </div>
            <div class="price-amount">60万円 〜 180万円</div>
            <div style="font-size: 14px; opacity: 0.9;">
                ※建物の大きさ・状態により変動します
            </div>
        `;
        this.ui.messageContainer.appendChild(priceCard);
        this.ui.scrollToBottom();
        console.log('💰 相場表示完了');
    }

    async showRankingAndCV2() {
        // ランキング表示
        const companies = this.scenarioManager.rankingData.defaultCompanies;
        const area = this.userData.address ? 
            `${this.userData.address.prefecture}${this.userData.address.city}` : 
            'お住まいのエリア';
        
        this.ui.showRanking(companies, area);
        console.log('✅ ランキング表示完了');
        
        await this.ui.sleep(2000);
        
        // CV2ボタン表示
        await this.ui.addAIMessage('気になる業者はありましたか？詳しい見積もりを取得できます。');
        this.ui.showCV2Buttons();
        console.log('✅ CV2ボタン表示完了');
    }
}

// グローバル関数
window.continueChat = function() {
    const ui = new ChatbotUIIntegrated();
    ui.clearChoices();
    ui.addUserMessage('もっと詳しく相談する');
    ui.addAIMessage('どのような点について詳しく知りたいですか？お気軽にお聞きください。');
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new IntegratedChatbot();
    chatbot.init();
});