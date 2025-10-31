/**
 * Step 4: AI確認画面
 */

// 会社情報表示
function displayCompanyInfo() {
    const form = document.getElementById('confirmationForm');

    // AIデータの取得を待つ（最大5秒）
    if (!window.aiData && window.aiAssistant && window.aiAssistant.isSearching) {
        console.log('AI検索中...待機します');
        let waitCount = 0;
        const checkInterval = setInterval(() => {
            waitCount++;
            if (!window.aiAssistant.isSearching || window.aiData || waitCount > 50) {
                clearInterval(checkInterval);
                displayCompanyInfoInternal();
            }
        }, 100);
        return;
    }

    displayCompanyInfoInternal();
}

function displayCompanyInfoInternal() {
    const form = document.getElementById('confirmationForm');

    // 基本情報フィールド（簡素化版）- 保存済みデータを優先して表示
    const savedData = window.registrationData.companyInfo || {};
    const basicFields = [
        { id: 'legalName', label: '会社名', type: 'text', value: savedData.legalName || window.aiData?.legalName || window.registrationData.companyName, required: true, maxlength: 30 },
        { id: 'legalNameKana', label: '会社名（カナ）', type: 'text', value: savedData.legalNameKana || window.aiData?.legalNameKana || '', required: true, maxlength: 30, className: 'katakana-input', placeholder: '例: カブシキガイシャエービーシー' },
        { id: 'businessName', label: '屋号', type: 'text', value: savedData.businessName || window.aiData?.businessName || '', required: false, maxlength: 30, placeholder: '例: ペイントプロ' },
        { id: 'businessNameKana', label: '屋号（カナ）', type: 'text', value: savedData.businessNameKana || window.aiData?.businessNameKana || '', required: false, maxlength: 30, className: 'katakana-input', placeholder: '例: ペイントプロ' },
        { id: 'representative', label: '代表者名', type: 'text', value: savedData.representative || window.aiData?.representative || '', required: true, maxlength: 20 },
        { id: 'representativeKana', label: '代表者名（カナ）', type: 'text', value: savedData.representativeKana || window.aiData?.representativeKana || '', required: true, maxlength: 20, className: 'katakana-input', placeholder: '例: タナカタロウ' },
        { id: 'postalCode', label: '郵便番号', type: 'text', value: savedData.postalCode || window.aiData?.postalCode || '', required: true, placeholder: '123-4567', maxlength: 8 },
        { id: 'fullAddress', label: '住所', type: 'text', value: savedData.fullAddress || window.aiData?.fullAddress || '', required: true, maxlength: 100, placeholder: '東京都渋谷区渋谷1-2-3 ABCビル4F' },
        { id: 'phone', label: '電話番号', type: 'tel', value: savedData.phone || window.aiData?.phone || '', required: true, placeholder: '03-1234-5678 または 090-1234-5678', maxlength: 15 },
        { id: 'websiteUrl', label: 'ウェブサイトURL', type: 'url', value: savedData.websiteUrl || window.aiData?.websiteUrl || '', required: false, maxlength: 100 },
        { id: 'establishedDate', label: '設立年月', type: 'text', value: savedData.establishedDate || window.aiData?.establishedDate || '', required: false, placeholder: '2020年1月', maxlength: 20 }
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
            <textarea id="prText" rows="5" required maxlength="500" placeholder="AIが自動生成した内容を確認・編集してください（最大500文字）">${savedData.prText || window.aiData?.prText || ''}</textarea>
            <div class="text-right mt-1">
                <span id="prTextCounter" class="text-xs text-gray-500">0 / 500</span>
            </div>
        </div>
    `;

    // 支店情報セクション - 複数ソースから確実に取得
    let branches = [];

    // ソース1: window.aiDataから取得
    if (window.aiData && window.aiData.branches && window.aiData.branches.length > 0) {
        branches = window.aiData.branches;
        console.log('[Confirmation] window.aiDataから支店情報を取得:', branches.length, '件');
    }
    // ソース2: localStorageから取得（window.aiDataがないか、branchesが空の場合）
    else {
        try {
            const storedData = localStorage.getItem('aiSearchData');
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (parsedData.branches && parsedData.branches.length > 0) {
                    branches = parsedData.branches;
                    // window.aiDataも復元
                    if (!window.aiData) {
                        window.aiData = parsedData;
                    }
                    console.log('[Confirmation] localStorageから支店情報を復元:', branches.length, '件');
                } else {
                    console.log('[Confirmation] localStorageに支店情報なし');
                }
            } else {
                console.log('[Confirmation] localStorageにAIデータなし');
            }
        } catch (error) {
            console.error('[Confirmation] localStorage復元エラー:', error);
        }
    }

    // デバッグ: 支店情報の詳細を出力
    console.log('=== Step 4 支店情報デバッグ ===');
    console.log('支店数:', branches.length);
    if (branches.length > 0) {
        branches.forEach((branch, index) => {
            console.log(`  支店${index + 1}:`, branch.name || '(名前なし)', '/', branch.address || '(住所なし)');
        });
    } else {
        console.warn('⚠️ 支店情報が見つかりません！');
        console.log('window.aiData:', window.aiData);
        console.log('localStorage.aiSearchData:', localStorage.getItem('aiSearchData'));
    }
    console.log('==============================');
    let branchHtml = '';

    // AIデータから最大10件の支店を表示（最低1件は表示）
    const displayCount = Math.max(1, Math.min(10, branches.length));
    for (let i = 0; i < displayCount; i++) {
        const branch = branches[i] || { name: '', address: '' };
        branchHtml += `
            <div class="branch-item grid grid-cols-1 md:grid-cols-2 gap-4" data-branch="${i + 1}">
                <div class="form-field">
                    <label for="branchName${i + 1}">支店名</label>
                    <input type="text" id="branchName${i + 1}" placeholder="例: 渋谷支店" value="${branch.name || ''}" maxlength="50">
                </div>
                <div class="form-field">
                    <label for="branchAddress${i + 1}">支店住所</label>
                    <input type="text" id="branchAddress${i + 1}" placeholder="例: 東京都渋谷区渋谷1-2-3" value="${branch.address || ''}" maxlength="100">
                </div>
            </div>
        `;
    }

    html += `
        <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">支店情報</label>
            <div id="branchContainer" class="space-y-3">
                ${branchHtml}
            </div>
            ${branches.length < 10 ? `
            <button type="button" onclick="addBranchInConfirm()" class="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium">
                + 支店を追加
            </button>
            ` : ''}
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
    if (window.setupKanaConversion) {
        window.setupKanaConversion();
    }

    // PR文の文字数カウンター設定
    const prTextArea = document.getElementById('prText');
    const prTextCounter = document.getElementById('prTextCounter');
    if (prTextArea && prTextCounter) {
        // 初期カウント表示
        prTextCounter.textContent = `${prTextArea.value.length} / 500`;

        // 入力時にカウント更新
        prTextArea.addEventListener('input', function() {
            const length = this.value.length;
            prTextCounter.textContent = `${length} / 500`;

            // 残り文字数に応じて色を変更
            if (length > 450) {
                prTextCounter.classList.add('text-red-500');
                prTextCounter.classList.remove('text-gray-500');
            } else {
                prTextCounter.classList.remove('text-red-500');
                prTextCounter.classList.add('text-gray-500');
            }
        });
    }

    // 郵便番号フィールドのバリデーション
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

    // 電話番号フィールドのバリデーション
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9０-９-]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            // ハイフンが既にある場合はそのまま、ない場合はフォーマット
            if (!value.includes('-') && value.length >= 10) {
                const numbers = value.replace(/[^0-9]/g, '');
                if (numbers.length === 10) {
                    if (numbers.startsWith('03') || numbers.startsWith('06')) {
                        value = numbers.substring(0, 2) + '-' + numbers.substring(2, 6) + '-' + numbers.substring(6);
                    } else {
                        value = numbers.substring(0, 3) + '-' + numbers.substring(3, 7) + '-' + numbers.substring(7);
                    }
                } else if (numbers.length === 11) {
                    value = numbers.substring(0, 3) + '-' + numbers.substring(3, 7) + '-' + numbers.substring(7);
                }
            }
            e.target.value = value;
        });
    }

    // ウェブサイトURLフィールドの変更を監視してリンクを更新
    const websiteUrlField = document.getElementById('websiteUrl');
    const websiteUrlLink = document.getElementById('websiteUrlLink');
    if (websiteUrlField) {
        websiteUrlField.addEventListener('input', function(e) {
            const url = e.target.value;
            if (websiteUrlLink) {
                if (url) {
                    websiteUrlLink.href = url.startsWith('http') ? url : 'https://' + url;
                    websiteUrlLink.style.display = 'inline-flex';
                } else {
                    websiteUrlLink.style.display = 'none';
                }
            }
        });
    }
}

// フィールドレンダリング
function renderField(field) {
    if (field.type === 'textarea') {
        return `<textarea id="${field.id}" rows="${field.rows || 3}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">${field.value}</textarea>`;
    } else if (field.id === 'websiteUrl') {
        // ウェブサイトURLの場合は入力フィールドとリンクボタンを表示
        const hasValue = field.value && field.value.trim() !== '';
        return `
            <div class="flex gap-2">
                <input type="${field.type}" id="${field.id}" value="${field.value}" ${field.required ? 'required' : ''} ${field.maxlength ? `maxlength="${field.maxlength}"` : ''} placeholder="${field.placeholder || ''}" class="flex-1 ${field.className || ''}">
                <a href="${hasValue ? (field.value.startsWith('http') ? field.value : 'https://' + field.value) : '#'}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                   id="websiteUrlLink"
                   style="${hasValue ? '' : 'display: none;'}">
                    開く
                </a>
            </div>
        `;
    } else {
        return `<input type="${field.type}" id="${field.id}" value="${field.value}" ${field.required ? 'required' : ''} ${field.maxlength ? `maxlength="${field.maxlength}"` : ''} placeholder="${field.placeholder || ''}" class="${field.className || ''}">`;
    }
}

// 支店追加（確認画面用）
function addBranchInConfirm() {
    const container = document.getElementById('branchContainer');
    const branchCount = container.querySelectorAll('.branch-item').length;

    if (branchCount >= 10) {
        window.showError('支店は最大10件まで追加できます');
        return;
    }

    const newBranch = branchCount + 1;
    const branchHtml = `
        <div class="branch-item grid grid-cols-1 md:grid-cols-2 gap-4" data-branch="${newBranch}">
            <div class="form-field">
                <label for="branchName${newBranch}">支店名</label>
                <input type="text" id="branchName${newBranch}" placeholder="例: 渋谷支店" maxlength="50">
            </div>
            <div class="form-field">
                <label for="branchAddress${newBranch}">支店住所</label>
                <input type="text" id="branchAddress${newBranch}" placeholder="例: 東京都渋谷区渋谷1-2-3" maxlength="100">
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', branchHtml);
}

// 会社情報確認完了
function confirmCompanyInfo() {
    const form = document.getElementById('confirmationForm');
    const formData = new FormData(form);

    // 必須フィールドチェック
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    if (!isValid) {
        window.showError('必須項目を入力してください');
        return;
    }

    // データ保存
    window.registrationData.companyInfo = {
        legalName: document.getElementById('legalName').value,
        legalNameKana: document.getElementById('legalNameKana').value,
        businessName: document.getElementById('businessName').value || '',
        businessNameKana: document.getElementById('businessNameKana').value || '',
        representative: document.getElementById('representative').value,
        representativeKana: document.getElementById('representativeKana').value,
        postalCode: document.getElementById('postalCode').value,
        fullAddress: document.getElementById('fullAddress').value,
        phone: document.getElementById('phone').value,
        websiteUrl: document.getElementById('websiteUrl').value || '',
        establishedDate: document.getElementById('establishedDate').value || '',
        prText: document.getElementById('prText').value,
        branches: []
    };

    // 支店情報収集
    document.querySelectorAll('.branch-item').forEach((item, index) => {
        const branchName = document.getElementById(`branchName${index + 1}`).value;
        const branchAddress = document.getElementById(`branchAddress${index + 1}`).value;
        if (branchName || branchAddress) {
            window.registrationData.companyInfo.branches.push({
                name: branchName,
                address: branchAddress
            });
        }
    });

    // Step 5へ
    window.goToStep(5);
    if (window.initializeDetailsForm) {
        window.initializeDetailsForm();
    }
}


// 関数をwindowに公開
window.displayCompanyInfo = displayCompanyInfo;
window.confirmCompanyInfo = confirmCompanyInfo;
window.addBranchInConfirm = addBranchInConfirm;