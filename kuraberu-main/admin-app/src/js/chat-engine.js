/**
 * チャットエンジン - iframe埋め込み対応版
 * 外壁塗装くらべるAI
 */

class ChatEngine {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.chatMessages = null;
        this.chatInput = null;
        this.sendButton = null;
        this.chatContainer = null;
        this.resizeObserver = null;
        
        // iframe関連
        this.isInIframe = window.self !== window.top;
        this.lastHeight = 0;
        
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // DOM要素を取得
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatContainer = document.getElementById('chatContainer');

        if (!this.chatMessages || !this.chatInput || !this.sendButton) {
            console.error('チャット要素が見つかりません');
            return;
        }

        // イベントリスナーを設定
        this.setupEventListeners();
        
        // iframe自動リサイズの設定
        this.setupIframeResize();
        
        // 初期メッセージを表示
        setTimeout(() => {
            this.addBotMessage('こんにちは！外壁塗装に関するご質問にお答えします。どのようなことでお困りですか？', [
                '見積もりについて',
                '業者の選び方',
                '工事の流れ',
                'その他の質問'
            ]);
        }, 500);
    }

    setupEventListeners() {
        // 送信ボタン
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enterキーで送信（Shift+Enterで改行）
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 入力フィールドの変更監視
        this.chatInput.addEventListener('input', () => {
            this.updateSendButton();
            this.autoResizeTextarea();
        });
        
        // 背景切り替え（開発用）
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                this.toggleBackground();
            }
        });
    }

    setupIframeResize() {
        if (!this.isInIframe) {
            console.log('通常モードで動作中（iframe外）');
            return;
        }

        console.log('iframeモードで動作中');

        // ResizeObserverでコンテンツサイズの変化を監視
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const newHeight = entry.contentRect.height;
                    this.notifyParentResize(newHeight);
                }
            });
            
            this.resizeObserver.observe(this.chatContainer);
        }

        // MutationObserverでDOM変更も監視
        const mutationObserver = new MutationObserver(() => {
            setTimeout(() => this.checkAndNotifyResize(), 100);
        });
        
        mutationObserver.observe(this.chatMessages, {
            childList: true,
            subtree: true
        });

        // 初期サイズを通知
        setTimeout(() => this.checkAndNotifyResize(), 1000);
    }

    notifyParentResize(height) {
        if (!this.isInIframe) return;
        
        // 最小・最大高さの制限
        const minHeight = 400;
        const maxHeight = 600;
        const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);
        
        // 前回と変化がある場合のみ通知
        if (Math.abs(clampedHeight - this.lastHeight) > 5) {
            this.lastHeight = clampedHeight;
            
            try {
                window.parent.postMessage({
                    type: 'resize',
                    height: clampedHeight,
                    source: 'gaiheki-chat-bot'
                }, '*');
                
                console.log(`親ページに高さ変更を通知: ${clampedHeight}px`);
            } catch (error) {
                console.warn('親ページへの通知に失敗:', error);
            }
        }
    }

    checkAndNotifyResize() {
        if (this.chatContainer) {
            const currentHeight = this.chatContainer.scrollHeight;
            this.notifyParentResize(currentHeight);
        }
    }

    updateSendButton() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isTyping;
    }

    autoResizeTextarea() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
        
        // テキストエリアのサイズ変更後にiframe高さも調整
        setTimeout(() => this.checkAndNotifyResize(), 50);
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;

        // ユーザーメッセージを追加
        this.addUserMessage(message);
        
        // 入力フィールドをクリア
        this.chatInput.value = '';
        this.updateSendButton();
        this.autoResizeTextarea();

        // AI応答を生成
        await this.generateAIResponse(message);
    }

    addUserMessage(text) {
        const messageDiv = this.createMessageElement('user', text, '👤');
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // メッセージ追加後にサイズ調整
        setTimeout(() => this.checkAndNotifyResize(), 100);
    }

    addBotMessage(text, quickReplies = null) {
        const messageDiv = this.createMessageElement('bot', text, '🤖');
        
        // クイック返信ボタンを追加
        if (quickReplies && quickReplies.length > 0) {
            const quickRepliesDiv = document.createElement('div');
            quickRepliesDiv.className = 'quick-replies';
            
            quickReplies.forEach(reply => {
                const button = document.createElement('button');
                button.className = 'quick-reply-btn';
                button.textContent = reply;
                button.addEventListener('click', () => {
                    this.handleQuickReply(reply);
                });
                quickRepliesDiv.appendChild(button);
            });
            
            messageDiv.querySelector('.message-content').appendChild(quickRepliesDiv);
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // メッセージ追加後にサイズ調整
        setTimeout(() => this.checkAndNotifyResize(), 100);
    }

    createMessageElement(type, text, avatar) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = avatar;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        return messageDiv;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = 'typing-indicator';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.textContent = '🤖';
        
        const typingContent = document.createElement('div');
        typingContent.className = 'typing-indicator';
        
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'typing-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            dotsDiv.appendChild(dot);
        }
        
        typingContent.appendChild(dotsDiv);
        typingDiv.appendChild(avatarDiv);
        typingDiv.appendChild(typingContent);
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
        
        // タイピング表示後にサイズ調整
        setTimeout(() => this.checkAndNotifyResize(), 100);
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
            setTimeout(() => this.checkAndNotifyResize(), 100);
        }
    }

    async generateAIResponse(userMessage) {
        this.isTyping = true;
        this.updateSendButton();
        
        // タイピングインジケーターを表示
        this.showTypingIndicator();
        
        try {
            // AI処理のシミュレート（実際のAPI呼び出しに置き換え）
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const response = this.getAIResponse(userMessage);
            
            this.hideTypingIndicator();
            this.addBotMessage(response.text, response.quickReplies);
            
        } catch (error) {
            console.error('AI応答生成エラー:', error);
            this.hideTypingIndicator();
            this.addBotMessage('申し訳ございません。一時的なエラーが発生しました。もう一度お試しください。');
        } finally {
            this.isTyping = false;
            this.updateSendButton();
        }
    }

    getAIResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // 簡単なパターンマッチング（実際のAIロジックに置き換え）
        if (lowerMessage.includes('見積') || lowerMessage.includes('価格') || lowerMessage.includes('費用')) {
            return {
                text: '外壁塗装の見積もりについてご質問ですね。一般的に30坪の住宅で80-150万円程度が相場です。正確な見積もりには現地調査が必要です。無料見積もりサービスをご利用いただけます。',
                quickReplies: ['無料見積もりを依頼', '相場について詳しく', '他の質問をする']
            };
        } else if (lowerMessage.includes('業者') || lowerMessage.includes('選び方')) {
            return {
                text: '良い業者選びのポイントをお教えします。①複数社での相見積もり②施工実績の確認③アフターサービスの内容④適正な価格設定。信頼できる業者をご紹介することも可能です。',
                quickReplies: ['業者を紹介してもらう', '見積もり比較のコツ', '施工実績を見る']
            };
        } else if (lowerMessage.includes('工事') || lowerMessage.includes('流れ')) {
            return {
                text: '外壁塗装工事の流れをご説明します。①現地調査・見積もり②契約③近隣挨拶④足場設置⑤高圧洗浄⑥下地処理⑦塗装作業⑧仕上げ確認⑨足場撤去。通常10-14日程度かかります。',
                quickReplies: ['工期について詳しく', '工事中の注意点', '費用の支払い方法']
            };
        } else {
            return {
                text: 'ご質問ありがとうございます。外壁塗装に関することなら何でもお聞きください。具体的にはどのような点について知りたいですか？',
                quickReplies: ['見積もりについて', '業者の選び方', '工事の流れ', 'メンテナンス']
            };
        }
    }

    handleQuickReply(reply) {
        // クイック返信をユーザーメッセージとして送信
        this.chatInput.value = reply;
        this.sendMessage();
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    // 背景切り替え（開発用）
    toggleBackground() {
        const body = document.body;
        if (body.classList.contains('bg-white')) {
            body.classList.remove('bg-white');
            body.classList.add('bg-transparent');
            console.log('背景: 透明に変更');
        } else {
            body.classList.remove('bg-transparent');
            body.classList.add('bg-white');
            console.log('背景: 白に変更');
        }
    }

    // デバッグ用メソッド
    getInfo() {
        return {
            isInIframe: this.isInIframe,
            messagesCount: this.messages.length,
            containerHeight: this.chatContainer ? this.chatContainer.scrollHeight : 0,
            lastNotifiedHeight: this.lastHeight
        };
    }
}

// チャットエンジンを初期化
window.chatEngine = new ChatEngine();

// デバッグ用のグローバル関数
window.getChatInfo = () => window.chatEngine.getInfo();
window.toggleChatBackground = () => window.chatEngine.toggleBackground();

// 親ページ向けのサンプルコード（コンソールに出力）
console.log(`
🏠 外壁塗装くらべるAI - iframe埋め込み用チャットBot

【親ページでの埋め込み例】
<iframe 
    id="gaiheki-bot" 
    src="https://yourdomain.com/index.html" 
    width="100%" 
    height="400"
    frameborder="0"
    style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
</iframe>

【親ページでの高さ自動調整コード】
<script>
window.addEventListener('message', (event) => {
    if (event.data?.type === 'resize' && event.data?.source === 'gaiheki-chat-bot') {
        const iframe = document.getElementById('gaiheki-bot');
        if (iframe && typeof event.data.height === 'number') {
            iframe.style.height = event.data.height + 'px';
            console.log('チャットBotの高さを調整:', event.data.height + 'px');
        }
    }
});
</script>

【開発用コマンド】
- Ctrl+B: 背景切り替え（白⇔透明）
- getChatInfo(): チャット情報取得
- toggleChatBackground(): 背景切り替え
`);