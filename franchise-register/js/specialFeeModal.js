// 特別料金モーダル管理クラス
class SpecialFeeModal {
    constructor() {
        this.modal = null;
        this.isAgreed = false;
        this.specialFeeItems = new Set([
            '外壁塗装',
            '外壁カバー工法',
            '外壁張替え',
            '屋根塗装（外壁工事含む）',
            '屋上防水（外壁工事含む）',
            '屋根葺き替え・張り替え※スレート・ガルバリウム等',
            '屋根葺き替え・張り替え※瓦',
            '屋根カバー工法',
            '外壁補修（外壁工事含む）',
            '屋根補修（外壁工事含む）',
            'ベランダ防水（外壁工事含む）',
            '内装水回り（バス・キッチン・トイレ）（外壁工事含む）',
            '内装（フローリングや畳などの床・クロス等）（外壁工事含む）'
        ]);
        this.init();
    }

    init() {
        // モーダルHTML要素を作成
        this.createModal();
        // イベントリスナー設定
        this.setupEventListeners();
    }

    createModal() {
        const modalHTML = `
            <div id="specialFeeModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <!-- ヘッダー -->
                    <div class="px-6 py-4 flex items-center justify-between">
                        <div class="flex items-center">
                            <span style="font-size: 28px; margin-right: 12px;">📢</span>
                            <h2 class="text-xl font-bold">大型物件の紹介料について</h2>
                        </div>
                        <button class="text-gray-400 hover:text-gray-600 p-1" onclick="window.specialFeeModal.close()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- 本文 -->
                    <div class="px-6 py-4">
                        <!-- 黄色の背景セクション -->
                        <div class="bg-yellow-50 rounded-lg p-4 mb-4">
                            <p class="text-base font-semibold text-gray-800 mb-4">アパート・マンション、店舗・事務所、工場・倉庫の紹介料体系</p>
                        </div>

                        <!-- 3階以上を選択した場合 -->
                        <div class="bg-blue-50 rounded-lg p-4 mb-4">
                            <div class="flex items-start">
                                <span class="text-yellow-500 mr-2 text-xl">⚠️</span>
                                <div>
                                    <p class="font-bold text-base mb-2">3階以上を選択した場合</p>
                                    <p class="text-sm">基本紹介料が <span class="text-red-500 line-through font-semibold">¥20,000</span> から <span class="text-red-600 font-bold text-lg">¥30,000</span> になります</p>
                                </div>
                            </div>
                        </div>

                        <!-- 3階以上を選択していると -->
                        <div class="bg-yellow-50 rounded-lg p-4 mb-4">
                            <div class="flex items-start">
                                <span class="text-yellow-500 mr-2 text-xl">⚠️</span>
                                <div>
                                    <p class="font-bold text-base mb-2">3階以上を選択していると</p>
                                    <p class="text-sm mb-2">2階以下でも大型と判断されれば自動で紹介料が<span class="text-red-600 font-bold text-lg">¥30,000</span>になります</p>
                                    <p class="text-xs text-gray-600">（3階以上でも見積もり希望箇所が小さい場合、自動的に減額されて自動配信される事がありますが、最終的な金額設定は株式会社外壁塗装くらべる運営本部の判断によるものとし、加盟店はこれに同意するものとします）</p>
                                </div>
                            </div>
                        </div>

                        <!-- 2階以下を選択していれば -->
                        <div class="bg-green-50 rounded-lg p-4">
                            <div class="flex items-start">
                                <span class="text-yellow-500 mr-2 text-xl">⚠️</span>
                                <div>
                                    <p class="font-bold text-base mb-2">2階以下を選択していれば</p>
                                    <p class="text-sm">通常の戸建で料金適用となり、<span class="text-green-600 font-bold">¥30,000で自動配信されることはありません</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- フッター -->
                    <div class="px-6 py-6">
                        <button id="modalAgree" class="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                            理解しました
                        </button>
                    </div>
                </div>
            </div>
        `;

        // モーダルをbodyに追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('specialFeeModal');
    }

    setupEventListeners() {
        // 同意ボタン
        document.getElementById('modalAgree').addEventListener('click', () => {
            this.handleAgree();
        });

        // ESCキーでキャンセル
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.handleCancel();
            }
        });

        // 背景クリックでキャンセル
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.handleCancel();
            }
        });
    }

    show() {
        this.modal.classList.remove('hidden');
        this.modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        // フォーカスを同意ボタンに設定
        setTimeout(() => {
            document.getElementById('modalAgree').focus();
        }, 100);
    }

    hide() {
        this.modal.classList.add('hidden');
        this.modal.classList.remove('flex');
        document.body.style.overflow = '';
    }

    close() {
        this.hide();
    }

    isModalOpen() {
        return this.modal.classList.contains('flex');
    }

    handleAgree() {
        this.isAgreed = true;
        sessionStorage.setItem('specialFeeAgreed', 'true');
        this.hide();
        
        // 同意後の処理を継続
        if (window.onSpecialFeeAgreed) {
            window.onSpecialFeeAgreed();
        }
    }

    handleCancel() {
        this.hide();
        
        // キャンセル時の処理
        if (window.onSpecialFeeCanceled) {
            window.onSpecialFeeCanceled();
        }
    }

    // 特別料金が必要かチェック
    isSpecialFeeRequired(propertyType, floors, constructionItems) {
        // 特別料金対象の物件タイプかチェック
        const isSpecialPropertyType = propertyType === 'apartment' ||
                                      propertyType === 'commercial' ||
                                      propertyType === 'factory' ||
                                      propertyType === 'アパート・マンション' ||
                                      propertyType === '店舗・事務所' ||
                                      propertyType === '工場・倉庫' ||
                                      propertyType.includes('マンション') ||
                                      propertyType.includes('アパート') ||
                                      propertyType.includes('店舗') ||
                                      propertyType.includes('事務所') ||
                                      propertyType.includes('工場') ||
                                      propertyType.includes('倉庫');

        // 3階以上かチェック
        const isHighRise = floors === '3' ||
                          floors === '4' ||
                          floors === '5' ||
                          floors === '6' ||
                          floors === '7' ||
                          floors === '8' ||
                          floors === '9' ||
                          floors === 'unlimited' ||
                          floors === '3階以上' ||
                          floors === '4階以上' ||
                          parseInt(floors) >= 3;

        // 特別料金対象の施工項目があるかチェック
        const hasSpecialItem = constructionItems.some(item => {
            // アイテムのラベルテキストから判定
            const itemText = typeof item === 'object' ? item.label : item;
            return Array.from(this.specialFeeItems).some(specialItem =>
                itemText.includes(specialItem)
            );
        });

        return isSpecialPropertyType && isHighRise && hasSpecialItem;
    }

    // モーダルのテキストを更新
    updateModalText(propertyType) {
        const descElement = document.getElementById('modalPropertyDescription');
        if (!descElement) return;

        let propertyTypeText = '3階建て以上の物件';
        if (propertyType === 'apartment') {
            propertyTypeText = '3階建て以上のアパート・マンション';
        } else if (propertyType === 'commercial') {
            propertyTypeText = '3階建て以上の店舗・事務所';
        } else if (propertyType === 'factory') {
            propertyTypeText = '3階建て以上の工場・倉庫';
        }

        descElement.innerHTML = `お客様が選択された物件は<span class="font-bold text-red-600">${propertyTypeText}</span>のため、選択された施工項目の紹介料が特別料金となります。`;
    }

    // モーダル表示判定と表示
    checkAndShow(formData) {
        // 物件種別を取得
        const propertyTypeCheckbox = document.querySelector('input[name="propertyType"][value="apartment"]:checked');
        if (!propertyTypeCheckbox) return true; // アパート・マンション以外なら処理続行
        
        // 階数を取得
        const floorsSelect = document.getElementById('apartmentFloors');
        const floors = floorsSelect ? floorsSelect.value : '3';
        
        // 施工項目を取得
        const constructionItems = [];
        document.querySelectorAll('input[name="constructionType"]:checked').forEach(checkbox => {
            const label = checkbox.parentElement.querySelector('.font-medium')?.textContent || '';
            constructionItems.push(label);
        });
        
        // 特別料金が必要かチェック
        if (this.isSpecialFeeRequired('apartment', floors, constructionItems)) {
            // 既に同意済みかチェック
            if (sessionStorage.getItem('specialFeeAgreed') !== 'true') {
                this.show();
                return false; // 処理を中断
            }
        }
        
        return true; // 処理を継続
    }

    // 料金計算
    calculateFee(propertyType, floors, constructionItems) {
        if (this.isSpecialFeeRequired(propertyType, floors, constructionItems)) {
            return 30000; // 特別料金
        }
        
        // 通常料金の計算
        let totalFee = 0;
        constructionItems.forEach(item => {
            const itemText = typeof item === 'object' ? item.label : item;
            
            // 通常料金項目の判定
            if (itemText.includes('屋根塗装単品') || itemText.includes('屋上防水単品')) {
                totalFee += 10000;
            } else if (itemText.includes('外壁補修単品') || 
                      itemText.includes('屋根補修単品') || 
                      itemText.includes('ベランダ防水単品')) {
                totalFee += 5000;
            } else if (this.specialFeeItems.has(itemText)) {
                totalFee += 20000; // 通常の2万円項目
            }
        });
        
        return totalFee;
    }
}

// 初期化
let specialFeeModal = null;

document.addEventListener('DOMContentLoaded', () => {
    specialFeeModal = new SpecialFeeModal();
    
    // グローバル関数として公開
    window.specialFeeModal = specialFeeModal;
});// Updated: 2025年 9月22日 月曜日 00時22分13秒 JST
