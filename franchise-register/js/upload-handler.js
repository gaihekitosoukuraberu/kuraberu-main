// ファイルアップロード処理専用モジュール

// グローバル変数
let currentUploadSlot = null;
let uploadedFiles = {};

// ドキュメントスロット更新
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
            instructions = '健康保険証の表面と裏面をアップロードしてください';
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

    window.registrationData.verificationDocs = [];
    checkVerificationComplete();
}

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

// ドキュメント撮影処理
function captureDocument(method) {
    const inputId = method === 'camera' ? 'cameraInput' : 'libraryInput';
    const input = document.getElementById(inputId);

    if (!input) {
        console.error('Input element not found:', inputId);
        return;
    }

    // モバイルデバイスの判定
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (method === 'camera' && isMobile) {
        // モバイルでカメラを直接起動
        input.setAttribute('capture', 'camera');
    } else {
        // PCまたはライブラリ選択の場合はcaptureを削除
        input.removeAttribute('capture');
    }

    input.click();
}

// ファイル処理
async function processCapture(input) {
    const file = input.files[0];
    if (!file) return;

    // ファイルサイズチェック
    if (file.size > window.CONFIG.MAX_FILE_SIZE) {
        window.showError('ファイルサイズは10MB以下にしてください');
        input.value = '';
        return;
    }

    // ファイルタイプチェック
    if (!window.CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        window.showError('対応していないファイル形式です');
        input.value = '';
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
            window.registrationData.verificationDocs.push({
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
    // PDFの場合は圧縮しない
    if (file.type === 'application/pdf') {
        return file;
    }

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
    const side = slot.dataset.side;
    slot.innerHTML = `
        <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <p class="text-sm font-medium text-gray-700">${side === 'front' ? '表面' : side === 'back' ? '裏面' : side === 'photo' ? '顔写真ページ' : ''}</p>
        <p class="text-xs text-gray-500">クリックまたはドラッグ&ドロップ</p>
    `;

    // データから削除
    window.registrationData.verificationDocs = window.registrationData.verificationDocs.filter(doc => doc.slotId !== slotId);
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
    const uploaded = window.registrationData.verificationDocs.length;

    document.getElementById('verifyBtn').disabled = uploaded < required;
}

// 本人確認送信
async function submitVerification() {
    window.showLoadingOverlay('本人確認書類をアップロード中...');

    try {
        // AI検索完了待ち
        if (window.aiAssistant && window.aiAssistant.isSearching) {
            window.showLoadingOverlay('AI情報取得中...少々お待ちください');

            await new Promise(resolve => {
                let waitCount = 0;
                const checkInterval = setInterval(() => {
                    waitCount++;
                    // AI検索完了 または タイムアウト（30秒）
                    if (!window.aiAssistant.isSearching || waitCount > 60) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 500);
            });
        }

        // Step 4へ
        window.hideLoadingOverlay();
        window.goToStep(4);
    } catch (error) {
        window.hideLoadingOverlay();
        window.showError('アップロードに失敗しました');
    }
}

// 関数をwindowに公開
window.updateDocumentSlots = updateDocumentSlots;
window.handleDrop = handleDrop;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.captureDocument = captureDocument;
window.processCapture = processCapture;
window.removeUpload = removeUpload;
window.submitVerification = submitVerification;
window.checkVerificationComplete = checkVerificationComplete;