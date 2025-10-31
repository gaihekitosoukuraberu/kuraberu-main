// グローバル変数
let currentStep = 1;
let sessionId = null;
let registrationData = {
    companyName: '',
    agreements: {},
    verificationDocs: [],
    companyInfo: {},
    selectedAreas: []
};
// windowオブジェクトに公開（他のJSファイルからアクセス可能にする）
window.registrationData = registrationData;
let aiProcessing = false;
let aiData = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    sessionId = generateSessionId();
    setupEventListeners();
    displayTermsText();
});

// セッションID生成
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// イベントリスナー設定
function setupEventListeners() {
    // Enterキーでの送信防止
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.querySelector('.step-content.active .primary-btn');
                if (btn && !btn.disabled) {
                    btn.click();
                }
            }
        });
    });
}

// ステップ1: 会社名入力から同意画面へ
function proceedToConsent() {
    const companyName = document.getElementById('companyName').value.trim();
    
    if (companyName.length < 2) {
        showError('会社名は2文字以上入力してください');
        return;
    }
    
    registrationData.companyName = companyName;
    goToStep(2);
}

// 同意チェック確認
// 同意チェック（簡素化版 - 利用規約のみ）
function checkAgreement() {
    const termsAgree = document.getElementById('termsAgree');
    const agreeBtn = document.getElementById('agreeBtn');
    
    if (termsAgree && agreeBtn) {
        agreeBtn.disabled = !termsAgree.checked;
    }
}

// 利用規約のテキストを表示
function displayTermsText() {
    const termsContainer = document.getElementById('termsFullText');
    if (termsContainer && CONFIG && CONFIG.TERMS_TEXT) {
        termsContainer.innerHTML = CONFIG.TERMS_TEXT.replace(/\n/g, '<br>');
    }
}

// 利用規約枠クリックでチェック切り替え
function toggleTermsAgreement(event) {
    // チェックボックス自体のクリックの場合は処理しない
    if (event.target.type === 'checkbox' || event.target.classList.contains('checkbox-container')) {
        return;
    }
    
    const checkbox = document.getElementById('termsAgree');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkAgreement();
    }
}

// 同意して進む（簡素化版）
function proceedWithAgreement() {
    registrationData.agreements = {
        terms: true,
        timestamp: new Date().toISOString()
    };
    
    goToStep(3);
    
    // AI処理開始（バックグラウンド）
    startAIProcessing();
}

// 旧関数（互換性のため残す）
function checkAllAgreements() {
    checkAgreement();
}

// ステップ2: 同意から本人確認へ（旧版・未使用）
function proceedToVerification() {
    proceedWithAgreement();
}

// AI処理開始（バックグラウンド）
async function startAIProcessing() {
    aiProcessing = true;
    
    try {
        // モックデータで動作確認（GAS APIは後で実装）
        await new Promise(resolve => setTimeout(resolve, 2000)); // AI処理のシミュレーション
        
        const mockResponse = {
            success: true,
            data: {
                candidates: [{
                    id: 'mock-1',
                    companyName: registrationData.companyName,
                    legalName: registrationData.companyName,
                    legalNameKana: '',
                    tradeName: '',
                    tradeNameKana: '',
                    representative: '山田 太郎',
                    representativeKana: 'ヤマダ タロウ',
                    postalCode: '100-0001',
                    address: '東京都千代田区千代田1-1-1',
                    phone: '03-1234-5678',
                    websiteUrl: 'https://example.com',
                    establishedDate: '2010年4月',
                    branches: '',
                    prText: `${registrationData.companyName}は、地域密着型の外壁塗装専門業者として、高品質な施工とお客様への丁寧な対応を心がけております。豊富な実績と確かな技術力で、お客様の大切な住まいを守ります。無料診断・お見積もりも承っておりますので、お気軽にご相談ください。`,
                    confidenceScore: 0.85
                }]
            }
        };
        
        aiData = mockResponse.data;
        localStorage.setItem('aiData_' + sessionId, JSON.stringify(mockResponse.data));
        console.log('AI処理完了（モック）:', aiData);
    } catch (error) {
        console.error('AI処理エラー:', error);
        aiData = null;
    }
}

// 書類タイプ選択
function updateDocumentSlots(docType) {
    const instruction = document.getElementById('captureInstruction');
    const uploadSlots = document.getElementById('uploadSlots');
    
    let instructions = '';
    let slots = '';
    
    switch(docType) {
        case 'drivers_license':
            instructions = '運転免許証の表面と裏面をアップロードしてください';
            slots = `
                <div class="upload-slot" id="slot_front" data-side="front" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-700">表面</p>
                    <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
                </div>
                <div class="upload-slot" id="slot_back" data-side="back" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-700">裏面</p>
                    <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
                </div>
            `;
            break;
        case 'mynumber':
            instructions = 'マイナンバーカードの表面のみアップロードしてください（裏面は不要）';
            slots = `
                <div class="upload-slot" id="slot_front" data-side="front" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-700">表面</p>
                    <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
                </div>
            `;
            break;
        case 'passport':
            instructions = 'パスポートの顔写真ページをアップロードしてください';
            slots = `
                <div class="upload-slot" id="slot_photo" data-side="photo" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-700">顔写真ページ</p>
                    <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
                </div>
            `;
            break;
        case 'insurance':
            instructions = '健康保険証と住所確認書類をアップロードしてください';
            slots = `
                <div class="upload-slot" id="slot_insurance" data-side="insurance" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-700">健康保険証</p>
                    <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
                </div>
                <div class="upload-slot" id="slot_address" data-side="address" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                    <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p class="text-sm font-medium text-gray-700">住所確認書類</p>
                    <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
                </div>
            `;
            break;
    }
    
    instruction.innerHTML = `<p class="text-sm text-blue-800">${instructions}</p>`;
    instruction.classList.remove('hidden');
    
    uploadSlots.innerHTML = slots;
    uploadSlots.querySelectorAll('.upload-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            currentUploadSlot = slot.id;
            document.getElementById('libraryInput').click();
        });
    });
    
    registrationData.verificationDocs = [];
    checkVerificationComplete();
}

// currentUploadSlot変数はupload-handler.jsで定義済みのため削除

// ドラッグアンドドロップハンドラ
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const slot = event.currentTarget;
    slot.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        currentUploadSlot = slot.id;
        const input = document.getElementById('libraryInput');
        input.files = files;
        processCapture(input);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
}

// 書類撮影
function captureDocument(type) {
    if (type === 'camera') {
        document.getElementById('cameraInput').click();
    } else {
        document.getElementById('libraryInput').click();
    }
}

// ファイル処理
async function processCapture(input) {
    const file = input.files[0];
    if (!file) return;
    
    // ファイルサイズチェック
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showError('ファイルサイズは10MB以下にしてください');
        return;
    }
    
    // ファイルタイプチェック
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        showError('対応していないファイル形式です');
        return;
    }
    
    // 画像圧縮
    const compressedFile = await compressImage(file);
    
    // Base64変換
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = e.target.result;
        
        // スロットに表示
        if (currentUploadSlot) {
            const slot = document.getElementById(currentUploadSlot);
            slot.classList.add('has-file');
            slot.innerHTML = `
                <div class="upload-preview">
                    <img src="${base64Data}" alt="アップロード画像">
                </div>
                <div class="remove-btn" onclick="removeUpload('${currentUploadSlot}')">×</div>
            `;
            
            // データ保存
            registrationData.verificationDocs.push({
                slotId: currentUploadSlot,
                side: slot.dataset.side,
                data: base64Data,
                type: file.type,
                name: file.name
            });
            
            checkVerificationComplete();
        }
    };
    reader.readAsDataURL(compressedFile);
    
    // 入力リセット
    input.value = '';
}

// 画像圧縮
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 最大1920pxにリサイズ
                const maxWidth = 1920;
                const scale = Math.min(1, maxWidth / img.width);
                
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(
                    (blob) => resolve(blob),
                    'image/jpeg',
                    0.8
                );
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// アップロード削除
function removeUpload(slotId) {
    const slot = document.getElementById(slotId);
    slot.classList.remove('has-file');
    slot.innerHTML = `
        <p class="text-sm text-gray-600">${slot.dataset.side === 'front' ? '表面' : slot.dataset.side === 'back' ? '裏面' : 'ファイル'}</p>
        <p class="text-xs text-gray-500">タップして撮影</p>
    `;
    
    // データから削除
    registrationData.verificationDocs = registrationData.verificationDocs.filter(doc => doc.slotId !== slotId);
    checkVerificationComplete();
}

// 本人確認完了チェック
function checkVerificationComplete() {
    const docType = document.querySelector('input[name="docType"]:checked');
    if (!docType) {
        document.getElementById('verifyBtn').disabled = true;
        return;
    }
    
    const requiredSlots = {
        'drivers_license': 2,
        'mynumber': 1,
        'passport': 1,
        'insurance': 2
    };
    
    const required = requiredSlots[docType.value];
    const uploaded = registrationData.verificationDocs.length;
    
    document.getElementById('verifyBtn').disabled = uploaded < required;
}

// 本人確認送信
async function submitVerification() {
    showLoadingOverlay('本人確認書類をアップロード中...');
    
    try {
        const response = await callGASAPI('uploadDocuments', {
            sessionId: sessionId,
            documents: registrationData.verificationDocs
        });
        
        if (response.success) {
            hideLoadingOverlay();
            goToStep(4);
            
            // AI処理が完了していたら情報表示
            if (aiData) {
                displayCompanyInfo();
            } else {
                // AI処理待機
                showLoadingOverlay('企業情報を取得中...');
                const checkInterval = setInterval(() => {
                    if (aiData) {
                        clearInterval(checkInterval);
                        hideLoadingOverlay();
                        displayCompanyInfo();
                    }
                }, 1000);
                
                // タイムアウト
                setTimeout(() => {
                    clearInterval(checkInterval);
                    hideLoadingOverlay();
                    displayManualForm();
                }, 30000);
            }
        }
    } catch (error) {
        hideLoadingOverlay();
        showError('アップロードに失敗しました');
    }
}

// 会社情報表示
function displayCompanyInfo() {
    const form = document.getElementById('confirmationForm');
    
    // 基本情報フィールド（簡素化版）
    const basicFields = [
        { id: 'legalName', label: '会社名', type: 'text', value: aiData?.legalName || registrationData.companyName, required: true, maxlength: 30 },
        { id: 'legalNameKana', label: '会社名（カナ）', type: 'text', value: aiData?.legalNameKana || '', required: true, maxlength: 30, className: 'katakana-input', placeholder: '例: カブシキガイシャエービーシー' },
        { id: 'representative', label: '代表者名', type: 'text', value: aiData?.representative || '', required: true, maxlength: 20 },
        { id: 'representativeKana', label: '代表者名（カナ）', type: 'text', value: aiData?.representativeKana || '', required: true, maxlength: 20, className: 'katakana-input', placeholder: '例: タナカタロウ' },
        { id: 'postalCode', label: '郵便番号', type: 'text', value: aiData?.postalCode || '', required: true, placeholder: '123-4567', maxlength: 8 },
        { id: 'fullAddress', label: '住所', type: 'text', value: aiData?.fullAddress || '', required: true, maxlength: 100, placeholder: '東京都渋谷区渋谷1-2-3 ABCビル4F' },
        { id: 'phone', label: '電話番号', type: 'tel', value: aiData?.phone || '', required: true, placeholder: '03-1234-5678 または 090-1234-5678' },
        { id: 'email', label: 'メールアドレス', type: 'email', value: aiData?.email || '', required: true, maxlength: 50 },
        { id: 'websiteUrl', label: 'ウェブサイトURL', type: 'url', value: aiData?.websiteUrl || '', required: false, maxlength: 50 },
        { id: 'establishedDate', label: '設立年月', type: 'text', value: aiData?.establishedDate || '', required: false, placeholder: '2020年1月', maxlength: 20 }
    ];
    
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    basicFields.forEach(field => {
        html += `
            <div class="form-field">
                <label for="${field.id}">
                    ${field.label}
                    ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                ${renderField(field)}
                ${field.maxlength ? `<span class="text-xs text-gray-500">最大${field.maxlength}文字</span>` : ''}
            </div>
        `;
    });
    html += '</div>';
    
    // PR文を先に追加（全幅）
    html += `
        <div class="form-field mt-4">
            <label for="prText">
                特徴・PR文 <span class="required">*</span>
            </label>
            <textarea id="prText" rows="5" required placeholder="AIが自動生成した内容を確認・編集してください">${aiData?.prText || ''}</textarea>
        </div>
    `;
    
    // 支店情報セクション
    html += `
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">支店情報</label>
            <div id="branchContainer" class="space-y-3">
                <div class="branch-item grid grid-cols-1 md:grid-cols-2 gap-4" data-branch="1">
                    <div class="form-field">
                        <label for="branchName1">支店名</label>
                        <input type="text" id="branchName1" placeholder="例: 渋谷支店" value="${aiData?.branches ? aiData.branches.split('、')[0] || '' : ''}">
                    </div>
                    <div class="form-field">
                        <label for="branchAddress1">支店住所</label>
                        <input type="text" id="branchAddress1" placeholder="例: 東京都渋谷区〇〇">
                    </div>
                </div>
            </div>
            <button type="button" onclick="addBranchInConfirm()" class="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium">
                + 支店を追加
            </button>
        </div>
    `;
    
    html += `
        <div class="flex gap-4 mt-6">
            <button type="button" onclick="goToStep(3)" class="secondary-btn flex-1">
                戻る
            </button>
            <button type="button" onclick="confirmCompanyInfo()" class="primary-btn flex-1">
                確認完了
            </button>
        </div>
    `;
    
    form.innerHTML = html;

    // カナ自動変換設定
    setupKanaConversion();

    // バリデーション設定を適用（郵便番号と電話番号のみ）
    // カナフィールドはAI入力時に制御するため、ここでは適用しない

    // 郵便番号フィールドのみバリデーション
    const postalField = document.getElementById('postalCode');
    if (postalField) {
        postalField.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9０-９]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            value = value.substring(0, 7);
            if (value.length > 3) {
                value = value.substring(0, 3) + '-' + value.substring(3);
            }
            e.target.value = value;
        });
    }

    // 電話番号フィールドのみバリデーション
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9０-９]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            value = value.substring(0, 11);
            // formatPhoneNumber関数を使用
            if (typeof formatPhoneNumber === 'function') {
                e.target.value = formatPhoneNumber(value);
            } else {
                e.target.value = value;
            }
        });
    }

    // 都道府県フィールドに都/道/府/県の補完
    const prefectureField = document.getElementById('prefecture');
    if (prefectureField) {
        prefectureField.addEventListener('blur', function(e) {
            let value = e.target.value.trim();
            if (value && !value.match(/(都|道|府|県)$/)) {
                // 都道府県名の補完
                if (value === '東京' || value === 'とうきょう' || value === 'トウキョウ') {
                    value = '東京都';
                } else if (value === '北海' || value === '北海道') {
                    value = '北海道';
                } else if (value === '大阪' || value === 'おおさか' || value === 'オオサカ') {
                    value = '大阪府';
                } else if (value === '京都' || value === 'きょうと' || value === 'キョウト') {
                    value = '京都府';
                } else if (!value.match(/^(東京|北海道|大阪|京都)/)) {
                    // その他は県を付ける
                    value = value + '県';
                }
                e.target.value = value;
            }
        });
    }

    // URLをリンク化
    const urlField = document.getElementById('websiteUrl');
    if (urlField && urlField.value) {
        const link = document.createElement('a');
        link.href = urlField.value;
        link.target = '_blank';
        link.className = 'text-blue-600 text-sm hover:underline';
        link.textContent = '確認する';
        urlField.parentElement.appendChild(link);
    }
}

// 詳細情報表示
function displayDetailsForm() {
    const form = document.getElementById('detailsForm');
    
    const html = `
        <!-- 連絡先情報 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">連絡先情報</h3>
            <div class="space-y-4">
                <div class="form-field">
                    <label for="billingEmail">請求用メールアドレス <span class="required">*</span></label>
                    <input type="email" id="billingEmail" required placeholder="billing@example.com">
                </div>
                <div class="form-field">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label for="salesEmail">営業用メールアドレス <span class="required">*</span></label>
                        <button type="button" id="sameAsBilling" onclick="toggleSameAsBilling()" style="padding: 0.5rem 1rem; font-size: 0.75rem; color: #374151; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #cbd5e0; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: 500;">
                            <span class="hidden md:inline">請求用と同じ場合はここをクリック</span>
                            <span class="md:hidden">請求用と同じ場合はここをタップ</span>
                        </button>
                    </div>
                    <input type="email" id="salesEmail" required placeholder="sales@company.co.jp">
                </div>
                <div class="form-field">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label for="salesPersonName">営業担当者氏名 <span class="required">*</span></label>
                        <button type="button" id="sameAsRepresentative" onclick="toggleSameAsRepresentative()" style="padding: 0.5rem 1rem; font-size: 0.75rem; color: #374151; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #cbd5e0; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: 500;">
                            <span class="hidden md:inline">代表者と同じ場合はここをクリック</span>
                            <span class="md:hidden">代表者と同じ場合はここをタップ</span>
                        </button>
                    </div>
                    <input type="text" id="salesPersonName" required placeholder="営業担当者の氏名を入力">
                </div>
                <div class="form-field">
                    <label for="salesPersonKana">営業担当者カナ <span class="required">*</span></label>
                    <input type="text" id="salesPersonKana" required placeholder="ヤマダ タロウ">
                </div>
            </div>
        </div>

        <!-- 事業詳細 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">事業詳細</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-field">
                    <label for="employees">従業員数 <span class="required">*</span></label>
                    <select id="employees"  required>
                        <option value="">選択してください</option>
                        <option value="1-2">1〜2名</option>
                        <option value="3-5">3〜5名</option>
                        <option value="6-10">6〜10名</option>
                        <option value="11+">11名以上</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="revenue">売上規模 <span class="required">*</span></label>
                    <select id="revenue"  required>
                        <option value="">選択してください</option>
                        <option value="under-10m">1,000万円未満</option>
                        <option value="10m-30m">1,000万円〜3,000万円</option>
                        <option value="30m-50m">3,000万円〜5,000万円</option>
                        <option value="50m-100m">5,000万円〜1億円</option>
                        <option value="100m-300m">1億円〜3億円</option>
                        <option value="over-300m">3億円以上</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- 対応可能物件種別 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">対応可能物件種別</h3>
            <div class="space-y-4">
                <!-- 対応可能物件 -->
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-3">
                        対応可能物件<span class="text-red-500">*</span>（最大対応階数）
                    </label>
                    <div class="space-y-3">
                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                            <input type="checkbox" class="mr-3" value="house" name="propertyType">
                            <div class="flex-1">
                                <span class="font-medium">🏠 戸建て住宅</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="houseFloors">
                                    <option value="1">1階</option>
                                    <option value="2">2階</option>
                                    <option value="3" selected>3階</option>
                                    <option value="4">4階以上</option>
                                </select>
                                <span class="ml-1 text-sm text-gray-600">まで</span>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                            <input type="checkbox" class="mr-3" value="apartment" name="propertyType" id="apartmentCheckbox" onchange="handleApartmentChange(this)">
                            <div class="flex-1">
                                <span class="font-medium">🏢 アパート・マンション</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="apartmentFloors" onchange="checkAndShowSpecialFeeModal()">
                                    <option value="1">1階</option>
                                    <option value="2">2階</option>
                                    <option value="3" selected>3階</option>
                                    <option value="4">4階</option>
                                    <option value="5">5階</option>
                                    <option value="6">6階</option>
                                    <option value="7">7階</option>
                                    <option value="8">8階</option>
                                    <option value="9">9階</option>
                                    <option value="unlimited">10階以上</option>
                                </select>
                                <span class="ml-1 text-sm text-gray-600">まで</span>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                            <input type="checkbox" class="mr-3" value="commercial" name="propertyType" id="commercialCheckbox" onchange="handleCommercialChange(this)">
                            <div class="flex-1">
                                <span class="font-medium">🏪 店舗・事務所</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="commercialFloors" onchange="checkAndShowSpecialFeeModal('commercial')">
                                    <option value="1">1階</option>
                                    <option value="2">2階</option>
                                    <option value="3" selected>3階</option>
                                    <option value="4">4階以上</option>
                                </select>
                                <span class="ml-1 text-sm text-gray-600">まで</span>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                            <input type="checkbox" class="mr-3" value="factory" name="propertyType" id="factoryCheckbox" onchange="handleFactoryChange(this)">
                            <div class="flex-1">
                                <span class="font-medium">🏭 工場・倉庫</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="factoryFloors" onchange="checkAndShowSpecialFeeModal('factory')">
                                    <option value="1">1階</option>
                                    <option value="2">2階</option>
                                    <option value="3" selected>3階</option>
                                    <option value="4">4階以上</option>
                                </select>
                                <span class="ml-1 text-sm text-gray-600">まで</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <!-- 築年数対応範囲 -->
                <div class="form-field">
                    <label class="block mb-2">築年数対応範囲 <span class="required">*</span></label>
                    <div class="bg-white border rounded-lg p-4">
                        <div class="mb-2">
                            <p class="text-center text-lg font-medium text-gray-800">
                                築<span id="ageRangeMin">0</span>年〜<span id="ageRangeMax">50</span>年まで対応
                            </p>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm text-gray-600">築年数下限</label>
                                <input type="range" id="minBuildingAge" min="0" max="50" value="0" class="w-full" oninput="updateAgeRange()">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>0年</span>
                                    <span>10年</span>
                                    <span>20年</span>
                                    <span>30年</span>
                                    <span>40年</span>
                                    <span>50年</span>
                                </div>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">築年数上限</label>
                                <input type="range" id="maxBuildingAge" min="0" max="100" value="50" class="w-full" oninput="updateAgeRange()">
                                <div class="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>0年</span>
                                    <span>20年</span>
                                    <span>40年</span>
                                    <span>60年</span>
                                    <span>80年</span>
                                    <span>100年</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 施工箇所 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-2 text-gray-800">施工箇所 <span class="required">*</span></h3>
            <p class="text-sm text-gray-600 mb-4">対応可能な工事内容全てにチェックを入れてください<br>
            選択した項目が自動配信の条件に当てはまった場合、記載の料金（※税抜）が適用されます。</p>
            
            <!-- ¥20,000項目 -->
            <div class="mb-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁塗装" class="mr-3">
                        <span class="flex-1">外壁塗装</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁カバー工法" class="mr-3">
                        <span class="flex-1">外壁カバー工法</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁張替え" class="mr-3">
                        <span class="flex-1">外壁張替え</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根塗装（外壁工事含む）" class="mr-3">
                        <span class="flex-1">屋根塗装（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋上防水（外壁工事含む）" class="mr-3">
                        <span class="flex-1">屋上防水（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根葺き替え・張り替え※スレート・ガルバリウム等" class="mr-3">
                        <span class="flex-1 text-sm">屋根葺き替え・張り替え※スレート・ガルバリウム等</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根葺き替え・張り替え※瓦" class="mr-3">
                        <span class="flex-1">屋根葺き替え・張り替え※瓦</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根カバー工法" class="mr-3">
                        <span class="flex-1">屋根カバー工法</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁補修（外壁工事含む）" class="mr-3">
                        <span class="flex-1">外壁補修（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根補修（外壁工事含む）" class="mr-3">
                        <span class="flex-1">屋根補修（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="ベランダ防水（外壁工事含む）" class="mr-3">
                        <span class="flex-1">ベランダ防水（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="内装水回り（バス・キッチン・トイレ）（外壁工事含む）" class="mr-3">
                        <span class="flex-1 text-sm">内装水回り（バス・キッチン・トイレ）（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="内装（フローリングや畳などの床・クロス等）（外壁工事含む）" class="mr-3">
                        <span class="flex-1 text-sm">内装（フローリングや畳などの床・クロス等）（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                </div>
            </div>
            
            <!-- ¥10,000項目 -->
            <div class="mb-4">
                <p class="text-sm text-gray-600 mb-2">※単品項目（但し1社紹介時は定価）</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="屋根塗装単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">屋根塗装単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥10,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="屋上防水単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">屋上防水単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥10,000</span>
                    </label>
                </div>
            </div>
            
            <!-- ¥5,000項目 -->
            <div>
                <p class="text-sm text-gray-600 mb-2">※補修単品項目（但し1社紹介時は定価）</p>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="外壁補修単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">外壁補修単品</span>
                        <span class="text-sm font-semibold text-green-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="屋根補修単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">屋根補修単品</span>
                        <span class="text-sm font-semibold text-green-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="ベランダ防水単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">ベランダ防水単品</span>
                        <span class="text-sm font-semibold text-green-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="外壁雨漏り修繕単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">外壁雨漏り修繕単品</span>
                        <span class="text-sm font-semibold text-green-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer" onclick="showSingleItemWarning(event)">
                        <input type="checkbox" name="constructionTypes" value="屋根雨漏り修繕単品（但し1社紹介時は定価）" class="mr-3">
                        <span class="flex-1">屋根雨漏り修繕単品</span>
                        <span class="text-sm font-semibold text-green-600">¥5,000</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- 特殊対応項目 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">特殊対応項目</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="遮熱・断熱塗料提案可能" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">遮熱・断熱塗料提案可能</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="立ち会いなし・見積もり手渡し希望" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">立ち会いなし・見積もり手渡し希望</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="遠方につき立ち会いなし・見積もり郵送・電話で商談可" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-xs">遠方につき立ち会いなし・見積もり郵送・電話で商談可</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="エクステリア（庭・駐車場・外構）" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">エクステリア（庭・駐車場・外構）</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="太陽光パネル脱着（撤去含む）" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">太陽光パネル脱着（撤去含む）</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="提携先ローン有り" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">提携先ローン有り</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="クレジットカード払い可" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">クレジットカード払い可</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="火災保険申請サポート" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">火災保険申請サポート</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="助成金申請サポート" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">助成金申請サポート</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="外壁雨漏り修繕可" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">外壁雨漏り修繕可</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="屋根雨漏り修繕可" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">屋根雨漏り修繕可</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="建築許可証" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">建築許可証</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="光触媒塗料提案可" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">光触媒塗料提案可</span>
                    </div>
                </div>
                <div class="service-card" onclick="toggleServiceCard(this)">
                    <input type="checkbox" name="specialServices" value="分割払いプラン有" class="hidden">
                    <div class="p-3 bg-white border rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <span class="text-sm">分割払いプラン有</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-4 mt-6">
            <button type="button" onclick="goToStep(4)" class="secondary-btn flex-1">
                戻る
            </button>
            <button type="button" onclick="confirmDetails()" class="primary-btn flex-1">
                次へ進む
            </button>
        </div>
    `;
    
    form.innerHTML = html;
}

// フィールドレンダリング
function renderField(field) {
    if (field.type === 'select') {
        // その他のselect
        return `
            <select id="${field.id}" ${field.required ? 'required' : ''}>
                <option value="">選択してください</option>
                ${field.options?.map(opt => `
                    <option value="${opt}" ${field.value === opt ? 'selected' : ''}>${opt}</option>
                `).join('') || ''}
            </select>
        `;
    } else if (field.type === 'textarea') {
        return `
            <textarea id="${field.id}" rows="${field.rows || 4}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">${field.value}</textarea>
        `;
    } else {
        return `
            <input type="${field.type}" id="${field.id}" value="${field.value}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">
        `;
    }
}

// カナ自動変換
function setupKanaConversion() {
    const conversions = [
        { from: 'legalName', to: 'legalNameKana' },
        { from: 'representative', to: 'representativeKana' }
    ];
    
    conversions.forEach(conv => {
        const fromField = document.getElementById(conv.from);
        const toField = document.getElementById(conv.to);
        
        if (fromField && toField) {
            fromField.addEventListener('input', () => {
                // 簡易的なカナ変換（実際はIMEのAPIやライブラリを使用）
                if (!toField.value) {
                    toField.placeholder = `${fromField.value}のカナを入力`;
                }
            });
        }
    });
}

// 会社情報確認
function confirmCompanyInfo() {
    const form = document.getElementById('confirmationForm');

    // バリデーション
    let hasError = false;
    let errorMessages = [];

    form.querySelectorAll('[required]').forEach(field => {
        const value = field.value.trim();

        // 空チェック
        if (!value) {
            field.classList.add('border-red-500');
            hasError = true;
            const label = field.closest('.form-field')?.querySelector('label')?.textContent.replace('*', '').trim();
            errorMessages.push(`${label || 'フィールド'}を入力してください`);
        } else {
            field.classList.remove('border-red-500');
        }

        // 特定フィールドの追加バリデーション
        if (value && !hasError) {
            // カナフィールドのチェックは省略（AI入力時に制御）

            // 郵便番号のチェック
            if (field.id === 'postalCode') {
                const postalValue = value.replace(/-/g, '');
                if (!/^\d{7}$/.test(postalValue)) {
                    field.classList.add('border-red-500');
                    hasError = true;
                    errorMessages.push('郵便番号は7桁の数字で入力してください');
                }
            }

            // 電話番号のチェック
            if (field.type === 'tel' || field.id === 'phone') {
                const phoneValue = value.replace(/-/g, '');
                if (!/^\d{10,11}$/.test(phoneValue)) {
                    field.classList.add('border-red-500');
                    hasError = true;
                    errorMessages.push('電話番号は10桁または11桁で入力してください');
                }
            }

            // URLのチェック
            if (field.type === 'url' && value) {
                if (!validateURL(value)) {
                    field.classList.add('border-red-500');
                    hasError = true;
                    errorMessages.push('正しいURL形式で入力してください');
                }
            }

            // メールアドレスのチェック
            if (field.type === 'email' && value) {
                if (!validateEmail(value)) {
                    field.classList.add('border-red-500');
                    hasError = true;
                    errorMessages.push('正しいメールアドレス形式で入力してください');
                }
            }
        }
    });

    // エラーメッセージ表示
    if (hasError) {
        // 既存のエラーメッセージを削除
        const existingError = form.querySelector('.error-summary');
        if (existingError) {
            existingError.remove();
        }

        // エラーサマリーを表示
        if (errorMessages.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-summary bg-red-50 border-l-4 border-red-500 p-4 mb-4';
            errorDiv.innerHTML = `
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                        <p class="font-semibold text-red-800 mb-2">入力内容にエラーがあります</p>
                        <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
                            ${errorMessages.map(msg => `<li>${msg}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            form.insertBefore(errorDiv, form.firstChild);

            // スクロールして表示
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return;
    }

    // データ保存
    form.querySelectorAll('input, select, textarea').forEach(field => {
        registrationData.companyInfo[field.id] = field.value;
    });

    goToStep(5);
    displayDetailsForm();
}

// 詳細情報確認
function confirmDetails() {
    const form = document.getElementById('detailsForm');
    
    // バリデーション
    let hasError = false;
    let errorMessages = [];
    
    // 必須フィールドチェック
    form.querySelectorAll('[required]').forEach(field => {
        if (!field.value || field.value.trim() === '') {
            field.classList.add('border-red-500');
            hasError = true;
            // フィールド名を取得してエラーメッセージに追加
            const label = field.previousElementSibling?.textContent || field.placeholder || 'フィールド';
            errorMessages.push(`${label}を入力してください`);
        } else {
            field.classList.remove('border-red-500');
        }
    });
    
    // 物件種別チェック（チェックボックスの状態をチェック）
    const propertyCheckboxes = form.querySelectorAll('input[name="propertyType"]:checked');
    
    if (propertyCheckboxes.length === 0) {
        showError('物件種別を1つ以上選択してください');
        hasError = true;
    }
    
    // 施工種別チェック
    const constructionTypes = form.querySelectorAll('input[name="constructionTypes"]:checked');
    if (constructionTypes.length === 0) {
        showError('施工種別を1つ以上選択してください');
        hasError = true;
    }
    
    if (hasError) {
        if (errorMessages.length > 0) {
            console.error('フォーム検証エラー:', errorMessages);
        }
        return;
    }
    
    // 選択された物件種別を取得
    const selectedPropertyTypes = [];
    propertyCheckboxes.forEach(checkbox => {
        selectedPropertyTypes.push(checkbox.value);
    });
    
    // データ保存
    registrationData.detailsInfo = {
        billingEmail: document.getElementById('billingEmail').value,
        salesEmail: document.getElementById('salesEmail').value,
        salesPerson: {
            name: document.getElementById('salesPersonName').value,
            nameKana: document.getElementById('salesPersonKana').value
        },
        employees: document.getElementById('employees').value,
        revenue: document.getElementById('revenue').value,
        propertyTypes: selectedPropertyTypes,
        ageRange: {
            min: document.getElementById('minBuildingAge').value,
            max: document.getElementById('maxBuildingAge').value
        },
        constructionTypes: Array.from(constructionTypes).map(cb => cb.value),
        specialServices: Array.from(form.querySelectorAll('input[name="specialServices"]:checked')).map(cb => cb.value)
    };
    
    goToStep(6);
    displayAreaSelection();
}

// エリア選択表示
function displayAreaSelection() {
    const container = document.getElementById('areaSelectionContainer');
    
    // エリアデータの初期化
    if (!registrationData.areaSelection) {
        registrationData.areaSelection = {
            prefectures: [],
            cities: {},
            priorityAreas: [],  // prioritiesからpriorityAreasに変更
            totalCount: 0
        };
    }
    
    let html = `
        <!-- 選択状況サマリー -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-center">
                <div>
                    <span class="text-sm text-gray-600">選択済み都道府県:</span>
                    <span id="selectedPrefCount" class="font-bold text-lg ml-2">0</span>
                    <span class="text-sm text-gray-600">/ 10</span>
                </div>
                <div>
                    <span class="text-sm text-gray-600">選択済み市区町村:</span>
                    <span id="selectedCityCount" class="font-bold text-lg ml-2">0</span>
                </div>
            </div>
        </div>
        
        <!-- 都道府県選択 -->
        <div class="border rounded-lg p-4 mb-6">
            <h4 class="font-semibold mb-3">STEP 1: 都道府県を選択（最大5都道府県）</h4>
            <div class="area-grid" id="areaGrid">
    `;
    
    // 都道府県を全て表示
    const allPrefectures = [];
    Object.values(CONFIG.PREFECTURES).forEach(prefectures => {
        allPrefectures.push(...prefectures);
    });
    
    allPrefectures.forEach(pref => {
        html += `
            <div class="area-item" data-prefecture="${pref}" onclick="togglePrefecture('${pref}')">
                ${pref}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <!-- 市区町村選択エリア -->
        <div id="citySelectionArea" class="hidden mb-6">
            <div class="border rounded-lg p-4">
                <h4 class="font-semibold mb-3">STEP 2: 市区町村を選択</h4>
                <div id="cityTabs" class="border-b mb-4">
                    <!-- 都道府県タブがここに生成される -->
                </div>
                <div id="cityListContainer">
                    <!-- 市区町村リストがここに生成される -->
                </div>
            </div>
        </div>
        
        <!-- 優先エリア設定 -->
        <div id="priorityArea" class="hidden mb-6">
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 class="font-semibold mb-3">STEP 3: 優先エリアを設定（最大3エリア）</h4>
                <p class="text-sm text-gray-600 mb-3">特に注力したいエリアを最大3つまで選択できます</p>
                <div id="prioritySelectionList">
                    <!-- 優先エリア選択リストがここに生成される -->
                </div>
            </div>
        </div>
        
        <!-- 選択済みエリア詳細 -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 class="font-semibold mb-3">選択済みエリア詳細</h4>
            <div id="selectedAreaDetails" class="space-y-2">
                <p class="text-gray-400 text-sm">エリアが選択されていません</p>
            </div>
        </div>
        
        <!-- ボタン -->
        <div class="flex gap-4">
            <button onclick="goToStep(5)" class="secondary-btn flex-1">
                戻る
            </button>
            <button id="areaConfirmBtn" onclick="confirmAreaSelection()" class="primary-btn flex-1" disabled>
                エリア選択を完了
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // 既存の選択を復元
    restoreAreaSelection();
}

// 都道府県選択トグル
function togglePrefecture(prefecture) {
    const item = document.querySelector(`[data-prefecture="${prefecture}"]`);
    const isSelected = item.classList.contains('selected');
    const areaData = registrationData.areaSelection;
    
    if (isSelected) {
        // 選択解除
        item.classList.remove('selected');
        areaData.prefectures = areaData.prefectures.filter(p => p !== prefecture);
        delete areaData.cities[prefecture];
        // 優先エリアからも削除
        areaData.priorities = areaData.priorities.filter(p => !p.startsWith(prefecture));
    } else {
        // 選択上限チェック
        if (areaData.prefectures.length >= CONFIG.MAX_PREFECTURES) {
            showError(`最大${CONFIG.MAX_PREFECTURES}都道府県まで選択可能です`);
            return;
        }
        // 選択追加
        item.classList.add('selected');
        areaData.prefectures.push(prefecture);
        // デフォルトで全市区町村を選択
        areaData.cities[prefecture] = getCitiesForPrefecture(prefecture);
    }
    
    updateAreaSelectionUI();
}

// 市区町村の取得（実際にはAPIから取得）
function getCitiesForPrefecture(prefecture) {
    // モックデータ：実際にはAPIから市区町村リストを取得
    const cityData = {
        '東京都': ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', 
                  '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区',
                  '足立区', '葛飾区', '江戸川区', '八王子市', '立川市', '武蔵野市', '三鷹市', '青梅市', '府中市', '昭島市'],
        '大阪府': ['大阪市北区', '大阪市都島区', '大阪市福島区', '大阪市此花区', '大阪市西区', '大阪市港区', 
                  '大阪市大正区', '大阪市天王寺区', '大阪市浪速区', '大阪市西淀川区', '堺市', '岸和田市', '豊中市', 
                  '池田市', '吹田市', '泉大津市', '高槻市', '貝塚市', '守口市', '枚方市'],
        '神奈川県': ['横浜市鶴見区', '横浜市神奈川区', '横浜市西区', '横浜市中区', '横浜市南区', '横浜市保土ケ谷区',
                    '横浜市磯子区', '横浜市金沢区', '横浜市港北区', '横浜市戸塚区', '川崎市川崎区', '川崎市幸区',
                    '川崎市中原区', '川崎市高津区', '川崎市多摩区', '相模原市', '横須賀市', '平塚市', '鎌倉市', '藤沢市'],
        '愛知県': ['名古屋市千種区', '名古屋市東区', '名古屋市北区', '名古屋市西区', '名古屋市中村区', '名古屋市中区',
                  '名古屋市昭和区', '名古屋市瑞穂区', '名古屋市熱田区', '名古屋市中川区', '豊橋市', '岡崎市', '一宮市',
                  '瀬戸市', '半田市', '春日井市', '豊川市', '津島市', '碧南市', '刈谷市'],
        '福岡県': ['福岡市東区', '福岡市博多区', '福岡市中央区', '福岡市南区', '福岡市西区', '福岡市城南区',
                  '福岡市早良区', '北九州市門司区', '北九州市若松区', '北九州市戸畑区', '大牟田市', '久留米市',
                  '直方市', '飯塚市', '田川市', '柳川市', '八女市', '筑後市', '大川市', '行橋市']
    };
    
    return cityData[prefecture] || generateDefaultCities(prefecture);
}

// デフォルトの市区町村リスト生成
function generateDefaultCities(prefecture) {
    // 県庁所在地と主要都市を返す
    const defaultCities = {
        '北海道': ['札幌市', '函館市', '小樽市', '旭川市', '室蘭市', '釧路市', '帯広市', '北見市', '夕張市', '岩見沢市'],
        '青森県': ['青森市', '弘前市', '八戸市', '黒石市', '五所川原市', '十和田市', '三沢市', 'むつ市', 'つがる市', '平川市'],
        '岩手県': ['盛岡市', '宮古市', '大船渡市', '花巻市', '北上市', '久慈市', '遠野市', '一関市', '陸前高田市', '釜石市'],
        '宮城県': ['仙台市青葉区', '仙台市宮城野区', '仙台市若林区', '仙台市太白区', '仙台市泉区', '石巻市', '塩竈市', '気仙沼市', '白石市', '名取市'],
        '秋田県': ['秋田市', '能代市', '横手市', '大館市', '男鹿市', '湯沢市', '鹿角市', '由利本荘市', '潟上市', '大仙市'],
        '山形県': ['山形市', '米沢市', '鶴岡市', '酒田市', '新庄市', '寒河江市', '上山市', '村山市', '長井市', '天童市'],
        '福島県': ['福島市', '会津若松市', '郡山市', 'いわき市', '白河市', '須賀川市', '喜多方市', '相馬市', '二本松市', '田村市']
    };
    
    return defaultCities[prefecture] || ['全域'];
}

// 地域一括選択
function selectRegion(region) {
    const regionMap = {
        'kanto': CONFIG.PREFECTURES['関東'],
        'kansai': CONFIG.PREFECTURES['関西'],
        'tokai': ['愛知県', '岐阜県', '静岡県', '三重県']
    };
    
    const prefectures = regionMap[region];
    if (!prefectures) return;
    
    const areaData = registrationData.areaSelection;
    
    // 選択可能な数を確認
    const availableSlots = CONFIG.MAX_PREFECTURES - areaData.prefectures.length;
    if (availableSlots <= 0) {
        showError('これ以上都道府県を追加できません');
        return;
    }
    
    // 地域の都道府県を追加
    let addedCount = 0;
    prefectures.forEach(pref => {
        if (addedCount < availableSlots && !areaData.prefectures.includes(pref)) {
            togglePrefecture(pref);
            addedCount++;
        }
    });
}

// 既存の選択を復元
function restoreAreaSelection() {
    const areaData = registrationData.areaSelection;
    
    // 都道府県の選択状態を復元
    areaData.prefectures.forEach(pref => {
        const item = document.querySelector(`[data-prefecture="${pref}"]`);
        if (item) {
            item.classList.add('selected');
        }
    });
    
    // UI更新
    updateAreaSelectionUI();
}

// エリア選択UI更新
function updateAreaSelectionUI() {
    const areaData = registrationData.areaSelection;
    
    // カウント更新
    const prefCountEl = document.getElementById('selectedPrefCount');
    const cityCountEl = document.getElementById('selectedCityCount');
    
    if (prefCountEl) {
        prefCountEl.textContent = areaData.prefectures.length;
    }
    
    const totalCities = Object.values(areaData.cities).reduce((sum, cities) => sum + cities.length, 0);
    if (cityCountEl) {
        cityCountEl.textContent = totalCities;
    }
    areaData.totalCount = totalCities;
    
    // 市区町村選択エリアの表示/非表示
    const cityArea = document.getElementById('citySelectionArea');
    if (cityArea) {
        if (areaData.prefectures.length > 0) {
            cityArea.classList.remove('hidden');
            updateCitySelectionArea();
        } else {
            cityArea.classList.add('hidden');
        }
    }
    
    // 優先エリア設定の表示/非表示
    const priorityArea = document.getElementById('priorityArea');
    if (priorityArea) {
        if (totalCities > 0) {
            priorityArea.classList.remove('hidden');
            updatePriorityArea();
        } else {
            priorityArea.classList.add('hidden');
        }
    }
    
    // 選択済みエリア詳細更新
    updateSelectedAreaDetails();
    
    // 確認ボタンの有効/無効
    const confirmBtn = document.getElementById('areaConfirmBtn');
    if (confirmBtn) {
        confirmBtn.disabled = areaData.prefectures.length === 0;
    }
}

// 市区町村選択エリア更新
function updateCitySelectionArea() {
    const areaData = registrationData.areaSelection;
    const tabsContainer = document.getElementById('cityTabs');
    const cityContainer = document.getElementById('cityListContainer');
    
    if (!tabsContainer || !cityContainer) return;
    
    // タブ生成
    tabsContainer.innerHTML = areaData.prefectures.map((pref, index) => `
        <button class="px-4 py-2 ${index === 0 ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}"
                onclick="switchCityTab('${pref}', this)">
            ${pref}
        </button>
    `).join('');
    
    // 最初の都道府県の市区町村を表示
    if (areaData.prefectures.length > 0) {
        displayCitiesForPrefecture(areaData.prefectures[0]);
    }
}

// 市区町村タブ切り替え
function switchCityTab(prefecture, btn) {
    // タブのアクティブ状態を更新
    document.querySelectorAll('#cityTabs button').forEach(b => {
        b.classList.remove('border-b-2', 'border-blue-500', 'text-blue-600');
        b.classList.add('text-gray-600');
    });
    btn.classList.remove('text-gray-600');
    btn.classList.add('border-b-2', 'border-blue-500', 'text-blue-600');
    
    // 市区町村リスト表示
    displayCitiesForPrefecture(prefecture);
}

// 市区町村リスト表示
function displayCitiesForPrefecture(prefecture) {
    const container = document.getElementById('cityListContainer');
    if (!container) return;
    
    const areaData = registrationData.areaSelection;
    const allCities = getCitiesForPrefecture(prefecture);
    const selectedCities = areaData.cities[prefecture] || [];
    
    container.innerHTML = `
        <div class="mb-3 flex justify-between items-center">
            <label class="flex items-center">
                <input type="checkbox" 
                       ${selectedCities.length === allCities.length ? 'checked' : ''}
                       onchange="toggleAllCities('${prefecture}', this.checked)">
                <span class="ml-2 font-medium">すべて選択</span>
            </label>
            <span class="text-sm text-gray-600">
                ${selectedCities.length} / ${allCities.length} 選択中
            </span>
        </div>
        <div class="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            ${allCities.map(city => `
                <label class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" 
                           value="${city}"
                           ${selectedCities.includes(city) ? 'checked' : ''}
                           onchange="toggleCity('${prefecture}', '${city}', this.checked)">
                    <span class="ml-2 text-sm">${city}</span>
                </label>
            `).join('')}
        </div>
    `;
}

// 市区町村選択トグル
function toggleCity(prefecture, city, checked) {
    const areaData = registrationData.areaSelection;
    
    if (!areaData.cities[prefecture]) {
        areaData.cities[prefecture] = [];
    }
    
    if (checked) {
        if (!areaData.cities[prefecture].includes(city)) {
            areaData.cities[prefecture].push(city);
        }
    } else {
        areaData.cities[prefecture] = areaData.cities[prefecture].filter(c => c !== city);
        // 優先エリアからも削除
        const priorityKey = `${prefecture}_${city}`;
        areaData.priorities = areaData.priorities.filter(p => p !== priorityKey);
    }
    
    updateAreaSelectionUI();
}

// 全市区町村選択切り替え
function toggleAllCities(prefecture, checked) {
    const areaData = registrationData.areaSelection;
    const allCities = getCitiesForPrefecture(prefecture);
    
    if (checked) {
        areaData.cities[prefecture] = [...allCities];
    } else {
        areaData.cities[prefecture] = [];
        // 優先エリアからも削除
        areaData.priorities = areaData.priorities.filter(p => !p.startsWith(prefecture));
    }
    
    displayCitiesForPrefecture(prefecture);
    updateAreaSelectionUI();
}

// 優先エリア更新
function updatePriorityArea() {
    const areaData = registrationData.areaSelection;
    const container = document.getElementById('prioritySelectionList');
    
    if (!container) return;
    
    // 選択可能なエリアリストを作成
    const availableAreas = [];
    Object.entries(areaData.cities).forEach(([pref, cities]) => {
        cities.forEach(city => {
            availableAreas.push({
                key: `${pref}_${city}`,
                label: `${pref} - ${city}`
            });
        });
    });
    
    if (availableAreas.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">市区町村を選択してください</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-2">
            ${availableAreas.slice(0, 20).map(area => `
                <label class="flex items-center p-2 hover:bg-yellow-100 rounded cursor-pointer">
                    <input type="checkbox" 
                           value="${area.key}"
                           ${areaData.priorities.includes(area.key) ? 'checked' : ''}
                           onchange="togglePriority('${area.key}', this.checked)">
                    <span class="ml-2 text-sm">${area.label}</span>
                </label>
            `).join('')}
        </div>
        ${availableAreas.length > 20 ? `
            <p class="text-xs text-gray-500 mt-2">他 ${availableAreas.length - 20} エリア</p>
        ` : ''}
    `;
}

// 優先エリア選択トグル
function togglePriority(areaKey, checked) {
    const areaData = registrationData.areaSelection;
    
    if (checked) {
        if (areaData.priorities.length >= 3) {
            showError('優先エリアは最大3つまで選択可能です');
            // チェックボックスを元に戻す
            event.target.checked = false;
            return;
        }
        if (!areaData.priorities.includes(areaKey)) {
            areaData.priorities.push(areaKey);
        }
    } else {
        areaData.priorities = areaData.priorities.filter(p => p !== areaKey);
    }
    
    updateSelectedAreaDetails();
}

// 選択済みエリア詳細更新
function updateSelectedAreaDetails() {
    const areaData = registrationData.areaSelection;
    const container = document.getElementById('selectedAreaDetails');
    
    if (!container) return;
    
    if (areaData.prefectures.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">エリアが選択されていません</p>';
        return;
    }
    
    const html = areaData.prefectures.map(pref => {
        const cities = areaData.cities[pref] || [];
        const prefPriorities = areaData.priorities.filter(p => p.startsWith(pref));
        
        return `
            <div class="border-l-4 border-blue-500 pl-3 py-2">
                <h5 class="font-medium text-gray-800">
                    ${pref}
                    ${prefPriorities.length > 0 ? '<span class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">優先</span>' : ''}
                </h5>
                <p class="text-sm text-gray-600 mt-1">
                    ${cities.length > 5 ? 
                        cities.slice(0, 5).join('、') + ` 他${cities.length - 5}市区町村` :
                        cities.join('、')
                    }
                </p>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// エリア選択クリア
function clearAreaSelection() {
    // 都道府県の選択を解除
    document.querySelectorAll('.area-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    
    // データをリセット
    registrationData.areaSelection = {
        prefectures: [],
        cities: {},
        priorityAreas: [],  // prioritiesからpriorityAreasに変更
        totalCount: 0
    };
    
    updateAreaSelectionUI();
}

// エリア選択確認
async function confirmAreaSelection() {
    const areaData = registrationData.areaSelection;

    if (areaData.prefectures.length === 0) {
        showError('少なくとも1つの都道府県を選択してください');
        return;
    }

    // 市区町村が選択されているか確認
    const hasAnyCities = Object.values(areaData.cities).some(cities => cities.length > 0);
    if (!hasAnyCities) {
        showError('少なくとも1つの市区町村を選択してください');
        return;
    }

    // デバッグ：エリア選択データを確認
    console.log('=== エリア選択完了時のデータ ===');
    console.log('registrationData.areaSelection:', registrationData.areaSelection);
    console.log('都道府県:', areaData.prefectures);
    console.log('市区町村:', areaData.cities);
    console.log('優先エリア:', areaData.priorities || areaData.priorityAreas);

    // Step 7へ進む（GAS送信はproceedToCompletionで処理される）
    goToStep(7);
}

// エリア検索
function filterAreas(query) {
    const items = document.querySelectorAll('.area-item');
    items.forEach(item => {
        const prefecture = item.dataset.prefecture;
        if (prefecture.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// 支店追加
let branchCount = 1;
let branchCountConfirm = 1;

function addBranch() {
    branchCount++;
    const container = document.getElementById('branchContainer');
    const newBranch = document.createElement('div');
    newBranch.className = 'branch-item grid grid-cols-1 md:grid-cols-2 gap-4';
    newBranch.dataset.branch = branchCount;
    newBranch.innerHTML = `
        <div class="form-field">
            <label for="branchName${branchCount}">支店名</label>
            <input type="text" id="branchName${branchCount}" placeholder="例: 渋谷支店">
        </div>
        <div class="form-field">
            <label for="branchAddress${branchCount}">支店住所</label>
            <input type="text" id="branchAddress${branchCount}" placeholder="例: 東京都渋谷区〇〇">
        </div>
    `;
    container.appendChild(newBranch);
}

// 会社情報確認画面での支店追加
function addBranchInConfirm() {
    branchCountConfirm++;
    const container = document.getElementById('branchContainer');
    const newBranch = document.createElement('div');
    newBranch.className = 'branch-item grid grid-cols-1 md:grid-cols-2 gap-4';
    newBranch.dataset.branch = branchCountConfirm;
    newBranch.innerHTML = `
        <div class="form-field">
            <label for="branchName${branchCountConfirm}">支店名</label>
            <input type="text" id="branchName${branchCountConfirm}" placeholder="例: 渋谷支店">
        </div>
        <div class="form-field">
            <label for="branchAddress${branchCountConfirm}">支店住所</label>
            <input type="text" id="branchAddress${branchCountConfirm}" placeholder="例: 東京都渋谷区〇〇">
        </div>
    `;
    container.appendChild(newBranch);
}

// 同一チェック機能
function toggleSameAsBilling() {
    const button = document.getElementById('sameAsBilling');
    const salesEmail = document.getElementById('salesEmail');
    const billingEmail = document.getElementById('billingEmail');
    
    if (button.dataset.active === 'true') {
        button.dataset.active = 'false';
        button.style.background = 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
        button.style.color = '#374151';
        button.style.borderColor = '#cbd5e0';
        salesEmail.readOnly = false;
        salesEmail.value = '';
    } else {
        button.dataset.active = 'true';
        button.style.background = 'linear-gradient(135deg, #667eea, #4299e1)';
        button.style.color = '#ffffff';
        button.style.borderColor = '#667eea';
        salesEmail.value = billingEmail.value;
        salesEmail.readOnly = true;
    }
}

function toggleSameAsRepresentative() {
    const button = document.getElementById('sameAsRepresentative');
    const salesPersonName = document.getElementById('salesPersonName');
    const salesPersonKana = document.getElementById('salesPersonKana');
    
    if (button.dataset.active === 'true') {
        button.dataset.active = 'false';
        button.style.background = 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
        button.style.color = '#374151';
        button.style.borderColor = '#cbd5e0';
        salesPersonName.readOnly = false;
        salesPersonKana.readOnly = false;
        salesPersonName.value = '';
        salesPersonKana.value = '';
    } else {
        button.dataset.active = 'true';
        button.style.background = 'linear-gradient(135deg, #667eea, #4299e1)';
        button.style.color = '#ffffff';
        button.style.borderColor = '#667eea';
        if (registrationData.companyInfo) {
            salesPersonName.value = registrationData.companyInfo.representative || '';
            salesPersonKana.value = registrationData.companyInfo.representativeKana || '';
        }
        salesPersonName.readOnly = true;
        salesPersonKana.readOnly = true;
    }
}

// 単品項目の警告モーダル表示
function showSingleItemWarning(event) {
    // チェックボックスのクリックを取得
    const checkbox = event.target.type === 'checkbox' ? event.target : event.currentTarget.querySelector('input[type="checkbox"]');
    
    if (!checkbox) return;
    
    // チェックを付けるときだけモーダル表示
    if (!checkbox.checked) {
        // チェックを付ける
        checkbox.checked = true;
        
        // モーダル表示
        const modal = document.getElementById('fullTextModal');
        const title = document.getElementById('modalTitle');
        const content = document.getElementById('modalContent');
        
        if (modal && title && content) {
            title.textContent = '単品項目についての注意事項';
            content.innerHTML = `
                <div style="padding: 1rem; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0.5rem;">
                    <p style="font-weight: 600; color: #92400e; margin-bottom: 0.5rem;">⚠️ 重要なお知らせ</p>
                    <p style="color: #78350f;">1社紹介の場合は¥20,000になります。</p>
                </div>
            `;
            modal.classList.remove('hidden');
        }
    } else {
        // チェックを外す（モーダルは表示しない）
        checkbox.checked = false;
    }
}

// 物件種別ボタン切替
function togglePropertyType(type) {
    const button = document.getElementById(`${type}Btn`);
    const floorDiv = document.getElementById(`${type}Floors`);
    
    if (button.dataset.active === 'true') {
        button.dataset.active = 'false';
        button.style.background = 'linear-gradient(135deg, #f8fafc, #e2e8f0)';
        button.style.color = '#374151';
        button.style.borderColor = '#cbd5e0';
        floorDiv.classList.add('hidden');
    } else {
        button.dataset.active = 'true';
        button.style.background = 'linear-gradient(135deg, #667eea, #4299e1)';
        button.style.color = '#ffffff';
        button.style.borderColor = '#667eea';
        floorDiv.classList.remove('hidden');
        
        // アパート・マンション選択時の特別料金モーダルチェック
        if (type === 'apartment') {
            checkAndShowSpecialFeeModal();
        }
    }
}

// 階数オプション表示切替（レガシー）
function toggleFloorOptions(type) {
    const checkbox = document.querySelector(`input[name="propertyTypes"][value="${type}"]`);
    const floorDiv = document.getElementById(`${type}Floors`);
    
    if (checkbox.checked) {
        floorDiv.classList.remove('hidden');
    } else {
        floorDiv.classList.add('hidden');
    }
}

// 築年数対応範囲更新
function updateAgeRange() {
    const minSlider = document.getElementById('minBuildingAge');
    const maxSlider = document.getElementById('maxBuildingAge');
    const minDisplay = document.getElementById('ageRangeMin');
    const maxDisplay = document.getElementById('ageRangeMax');
    
    if (!minSlider || !maxSlider || !minDisplay || !maxDisplay) return;
    
    let minVal = parseInt(minSlider.value);
    let maxVal = parseInt(maxSlider.value);
    
    // 最小値が最大値を超えないように調整
    if (minVal > maxVal) {
        minSlider.value = maxVal;
        minVal = maxVal;
    }
    
    minDisplay.textContent = minVal;
    maxDisplay.textContent = maxVal;
}

// 特殊サービスカードのトグル
function toggleServiceCard(card) {
    const checkbox = card.querySelector('input[type="checkbox"]');
    const cardDiv = card.querySelector('div');
    
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        cardDiv.classList.add('bg-blue-50', 'border-blue-500');
        cardDiv.classList.remove('bg-white');
    } else {
        cardDiv.classList.remove('bg-blue-50', 'border-blue-500');
        cardDiv.classList.add('bg-white');
    }
}


// エリア選択クリア
function clearAreaSelection() {
    document.querySelectorAll('.area-item.selected').forEach(item => {
        item.classList.remove('selected');
    });
    registrationData.selectedAreas = [];
    updateAreaCount();
}

// エリア数更新
function updateAreaCount() {
    document.getElementById('selectedCount').textContent = registrationData.selectedAreas.length;
    document.getElementById('areaConfirmBtn').disabled = registrationData.selectedAreas.length === 0;
}


// 最終登録送信
async function submitRegistration() {
    showLoadingOverlay('登録情報を送信中...');
    
    try {
        const response = await callGASAPI('submitRegistration', {
            sessionId: sessionId,
            companyName: registrationData.companyName,
            agreements: registrationData.agreements,
            verificationDocs: registrationData.verificationDocs.map(doc => ({
                side: doc.side,
                type: doc.type,
                name: doc.name
            })),
            companyInfo: registrationData.companyInfo,
            selectedAreas: registrationData.selectedAreas,
            timestamp: new Date().toISOString()
        });
        
        if (response.success) {
            hideLoadingOverlay();
            goToStep(7);
        } else {
            throw new Error(response.error || '登録に失敗しました');
        }
    } catch (error) {
        hideLoadingOverlay();
        showError('登録に失敗しました。もう一度お試しください。');
        console.error('Registration error:', error);
    }
}

// GAS API呼び出し
async function callGASAPI(action, params) {
    // モック版：ローカルストレージを使用
    console.log('Mock API Call:', action, params);
    
    // 2秒の遅延でAPI呼び出しをシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // アクションに応じたモックレスポンスを返す
    switch(action) {
        case 'startAIHearing':
            return {
                success: true,
                data: {
                    candidates: [{
                        id: 'mock-1',
                        companyName: params.companyName,
                        legalName: params.companyName,
                        representative: '山田 太郎',
                        representativeKana: 'ヤマダ タロウ',
                        postalCode: '100-0001',
                        address: '東京都千代田区千代田1-1-1',
                        phone: '03-1234-5678',
                        establishedDate: '2010年4月'
                    }]
                }
            };
        
        case 'submitRegistration':
            // ローカルストレージに保存
            localStorage.setItem('registration_' + params.sessionId, JSON.stringify(params.data));
            return { success: true, registrationId: 'REG-' + Date.now() };
        
        default:
            return { success: true };
    }
}

// ステップ移動
function goToStep(step) {
    // 現在のステップを非表示
    document.querySelector(`.step-content.active`).classList.remove('active');
    document.querySelector(`.step-item.active`).classList.remove('active');

    // 完了済みマーク
    if (step > currentStep) {
        for (let i = currentStep; i < step; i++) {
            document.querySelector(`.step-item[data-step="${i}"]`).classList.add('completed');
        }
    }

    // 新しいステップを表示
    document.getElementById(`step${step}`).classList.add('active');
    document.querySelector(`.step-item[data-step="${step}"]`).classList.add('active');

    // プログレスバー更新
    const progress = ((step - 1) / 6) * 100;
    document.getElementById('progressBar').style.width = progress + '%';

    currentStep = step;

    // stepChangedイベントを発火（バリデーション再設定用）
    window.dispatchEvent(new Event('stepChanged'));
    
    // スクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 全文表示モーダル
function showFullText(type) {
    const modal = document.getElementById('fullTextModal');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');
    
    const texts = {
        'terms': { title: '利用規約', content: CONFIG.TERMS_TEXT },
        'privacy': { title: 'プライバシーポリシー', content: CONFIG.PRIVACY_TEXT },
        'ai': { title: 'AI情報処理に関する同意', content: CONFIG.AI_AGREEMENT_TEXT }
    };
    
    const text = texts[type];
    if (text) {
        title.textContent = text.title;
        content.innerHTML = text.content.replace(/\n/g, '<br>');
        modal.classList.remove('hidden');
    }
}

// モーダル閉じる
function closeModal() {
    document.getElementById('fullTextModal').classList.add('hidden');
}

// ローディング表示
function showLoadingOverlay(text) {
    const overlay = document.getElementById('loadingOverlay');
    document.getElementById('loadingText').textContent = text || '処理中...';
    overlay.classList.remove('hidden');
}

// ローディング非表示
function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// エラー表示
function showError(message) {
    // 簡易的なトースト通知
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 手動入力フォーム表示（AI取得失敗時）
function displayManualForm() {
    aiData = {};
    displayCompanyInfo();
}

// 特別料金モーダルのチェックと表示
function checkAndShowSpecialFeeModal(propertyType = 'apartment') {
    let checkbox, floorSelect;

    // 物件タイプに応じて要素を取得
    switch(propertyType) {
        case 'apartment':
            checkbox = document.getElementById('apartmentCheckbox');
            floorSelect = document.getElementById('apartmentFloors');
            break;
        case 'commercial':
            checkbox = document.getElementById('commercialCheckbox');
            floorSelect = document.getElementById('commercialFloors');
            break;
        case 'factory':
            checkbox = document.getElementById('factoryCheckbox');
            floorSelect = document.getElementById('factoryFloors');
            break;
        default:
            return;
    }

    if (!checkbox || !checkbox.checked) {
        return;
    }

    if (!floorSelect) {
        return;
    }

    const floorValue = floorSelect.value;
    const isThreeOrMore = parseInt(floorValue) >= 3 || floorValue === 'unlimited' || floorValue === '4' || floorValue.includes('以上');

    // 3階以上の場合、モーダル表示
    if (isThreeOrMore && window.specialFeeModal) {
        // モーダルテキストを更新
        window.specialFeeModal.updateModalText(propertyType);

        // モーダルのコールバックを設定
        window.onSpecialFeeAgreed = function() {
            console.log('特別料金に同意されました');
        };

        window.onSpecialFeeCanceled = function() {
            console.log('特別料金モーダルがキャンセルされました');
            // 階数を2階に戻す
            floorSelect.value = '2';
            // チェックボックスも外す
            checkbox.checked = false;
        };

        // モーダル表示
        window.specialFeeModal.show();
    }
}

// アパート・マンションチェックボックス変更時の処理
function handleApartmentChange(checkbox) {
    if (checkbox.checked) {
        // チェックされた時、モーダルチェック
        checkAndShowSpecialFeeModal('apartment');
    }
}

// 店舗・事務所チェックボックス変更時の処理
function handleCommercialChange(checkbox) {
    if (checkbox.checked) {
        checkAndShowSpecialFeeModal('commercial');
    }
}

// 工場・倉庫チェックボックス変更時の処理
function handleFactoryChange(checkbox) {
    if (checkbox.checked) {
        checkAndShowSpecialFeeModal('factory');
    }
}

// 階数選択変更時のイベントリスナー追加
document.addEventListener('DOMContentLoaded', function() {
    // アパート階数選択の変更を監視
    const apartmentFloorSelect = document.getElementById('apartmentFloors');
    if (apartmentFloorSelect) {
        apartmentFloorSelect.addEventListener('change', function() {
            // アパート・マンションが選択されている場合のみチェック
            const apartmentCheckbox = document.getElementById('apartmentCheckbox');
            if (apartmentCheckbox && apartmentCheckbox.checked) {
                checkAndShowSpecialFeeModal('apartment');
            }
        });
    }

    // 店舗・事務所階数選択の変更を監視
    const commercialFloorSelect = document.getElementById('commercialFloors');
    if (commercialFloorSelect) {
        commercialFloorSelect.addEventListener('change', function() {
            const commercialCheckbox = document.getElementById('commercialCheckbox');
            if (commercialCheckbox && commercialCheckbox.checked) {
                checkAndShowSpecialFeeModal('commercial');
            }
        });
    }

    // 工場・倉庫階数選択の変更を監視
    const factoryFloorSelect = document.getElementById('factoryFloors');
    if (factoryFloorSelect) {
        factoryFloorSelect.addEventListener('change', function() {
            const factoryCheckbox = document.getElementById('factoryCheckbox');
            if (factoryCheckbox && factoryCheckbox.checked) {
                checkAndShowSpecialFeeModal('factory');
            }
        });
    }
});