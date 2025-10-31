/**
 * GAS エンドポイント設定
 * CONFIG.GAS_ENDPOINTから取得、なければデフォルト値を使用
 */
let GAS_ENDPOINT = null;

// GAS_ENDPOINTを取得する関数
function getGasEndpoint() {
    if (GAS_ENDPOINT) return GAS_ENDPOINT;

    // env-loader.js一元管理（ハードコード禁止）
    GAS_ENDPOINT = window.ENV?.GAS_URL;

    console.log('[gas-submit] GAS_ENDPOINT設定:', GAS_ENDPOINT);
    return GAS_ENDPOINT;
}

/**
 * フォームデータ収集用のストレージ
 */
let formData = {
    companyInfo: {
        branches: []  // 支店データを必ず初期化
    },
    termsAgreed: false,
    selectedAreas: {
        prefectures: '',
        cities: '',
        priorityAreas: ''
    },
    identityDocument: {},
    informationConfirmed: false,
    detailInfo: {}
};

/**
 * Step 1: 会社名データを保存
 */
function saveCompanyName() {
    const companyName = document.getElementById('companyName').value;
    if (companyName) {
        formData.companyInfo.companyName = companyName;
        console.log('会社名保存:', companyName);
    }
}

/**
 * Step 2: 利用規約同意を保存
 */
function saveTermsAgreement() {
    const termsAgree = document.getElementById('termsAgree').checked;
    formData.termsAgreed = termsAgree;
    console.log('利用規約同意:', termsAgree);
}

/**
 * Step 3: 本人確認書類情報を保存
 */
function saveIdentityDocument() {
    const docType = document.querySelector('input[name="docType"]:checked');
    if (docType) {
        formData.identityDocument.type = docType.value;

        // window.registrationData.verificationDocsから画像データを取得
        if (window.registrationData && window.registrationData.verificationDocs && window.registrationData.verificationDocs.length > 0) {
            // 全ての画像データを配列として保存
            formData.identityDocument.images = window.registrationData.verificationDocs.map(doc => ({
                data: doc.data,
                side: doc.side || 'front',
                type: doc.type || 'image/jpeg'
            }));
            console.log('本人確認書類データ取得:', formData.identityDocument.images.length + '枚');
        } else {
            formData.identityDocument.images = [];
            console.log('本人確認書類データなし');
        }

        console.log('本人確認書類タイプ:', docType.value);
    }
}

/**
 * Step 4: 会社情報確認データを保存（簡素化版）
 */
function saveCompanyInfo() {
    console.log('=== saveCompanyInfo 開始 ===');
    console.log('window.registrationData:', window.registrationData);
    console.log('window.registrationData.companyInfo:', window.registrationData?.companyInfo);

    // registrationDataから取得し、フィールド名を変換
    if (window.registrationData?.companyInfo) {
        const src = window.registrationData.companyInfo;
        console.log('=== saveCompanyInfo デバッグ ===');
        console.log('src.branches:', src.branches);
        console.log('src.branches length:', src.branches ? src.branches.length : 0);

        formData.companyInfo = {
            companyName: src.legalName || src.companyName || '',
            companyNameKana: src.legalNameKana || '',
            businessName: src.businessName || '',
            businessNameKana: src.businessNameKana || '',
            representative: src.representative || '',
            representativeKana: src.representativeKana || '',
            postalCode: src.postalCode || '',
            fullAddress: src.fullAddress || '',
            phone: src.phone || '',
            websiteUrl: src.websiteUrl || '',
            establishedDate: src.establishedDate || '',
            prText: src.prText || '',
            branches: src.branches || []
        };

        console.log('formData.companyInfo.branches:', formData.companyInfo.branches);
        console.log('formData.companyInfo.branches length:', formData.companyInfo.branches.length);
    } else {
        console.log('⚠️ window.registrationData.companyInfoが存在しません！');
    }
    formData.informationConfirmed = true;
    console.log('=== saveCompanyInfo 終了 ===');
}

/**
 * Step 5: 詳細情報を保存
 */
function saveDetailInfo() {
    // 請求用メールアドレス - 最大50文字
    const billingEmail = document.getElementById('billingEmail');
    if (billingEmail) formData.detailInfo.billingEmail = billingEmail.value.substring(0, 50);

    // 営業用メールアドレス - 最大50文字
    const salesEmail = document.getElementById('salesEmail');
    if (salesEmail) formData.detailInfo.salesEmail = salesEmail.value.substring(0, 50);

    // 営業担当者氏名 - 最大20文字
    const salesPersonName = document.getElementById('salesPersonName');
    if (salesPersonName) formData.detailInfo.salesPersonName = salesPersonName.value.substring(0, 20);

    // 営業担当者カナ - 最大20文字
    const salesPersonKana = document.getElementById('salesPersonKana');
    if (salesPersonKana) formData.detailInfo.salesPersonKana = salesPersonKana.value.substring(0, 20);

    // 従業員数
    const employees = document.getElementById('employees');
    if (employees) formData.detailInfo.employees = employees.value;

    // 売上規模
    const revenue = document.getElementById('revenue');
    if (revenue) formData.detailInfo.revenue = revenue.value;

    // 対応可能物件種別と最大階数を保存
    const propertyTypes = [];
    const propertyWithFloors = [];

    // 戸建て住宅
    const houseCheckbox = document.querySelector('input[name="propertyType"][value="house"]:checked');
    if (houseCheckbox) {
        propertyTypes.push('戸建て住宅');
        const houseFloors = document.getElementById('houseFloors');
        const floorValue = houseFloors ? houseFloors.value : '3';
        const floorText = floorValue === '4' ? '4階以上' : `${floorValue}階`;
        propertyWithFloors.push(`戸建て住宅(${floorText}まで)`);
    }

    // アパート・マンション
    const apartmentCheckbox = document.querySelector('input[name="propertyType"][value="apartment"]:checked');
    if (apartmentCheckbox) {
        propertyTypes.push('アパート・マンション');
        const apartmentFloors = document.getElementById('apartmentFloors');
        const floorValue = apartmentFloors ? apartmentFloors.value : '3';
        const floorText = floorValue === 'unlimited' ? '10階以上' : `${floorValue}階`;
        propertyWithFloors.push(`アパート・マンション(${floorText}まで)`);
    }

    // 店舗・事務所
    const commercialCheckbox = document.querySelector('input[name="propertyType"][value="commercial"]:checked');
    if (commercialCheckbox) {
        propertyTypes.push('店舗・事務所');
        const commercialFloors = document.getElementById('commercialFloors');
        const floorValue = commercialFloors ? commercialFloors.value : '3';
        const floorText = floorValue === '4' ? '4階以上' : `${floorValue}階`;
        propertyWithFloors.push(`店舗・事務所(${floorText}まで)`);
    }

    // 工場・倉庫
    const factoryCheckbox = document.querySelector('input[name="propertyType"][value="factory"]:checked');
    if (factoryCheckbox) {
        propertyTypes.push('工場・倉庫');
        const factoryFloors = document.getElementById('factoryFloors');
        const floorValue = factoryFloors ? factoryFloors.value : '3';
        const floorText = floorValue === '4' ? '4階以上' : `${floorValue}階`;
        propertyWithFloors.push(`工場・倉庫(${floorText}まで)`);
    }

    // 物件種別は通常形式、最大対応階数は統合形式で保存
    formData.detailInfo.propertyTypes = propertyTypes.join(',');
    formData.detailInfo.propertyFloors = propertyWithFloors.join(',');

    // 築年数対応範囲
    const minBuildingAge = document.getElementById('minBuildingAge');
    const maxBuildingAge = document.getElementById('maxBuildingAge');
    if (minBuildingAge && maxBuildingAge) {
        formData.detailInfo.buildingAgeRange = {
            min: minBuildingAge.value,
            max: maxBuildingAge.value
        };
    }

    // 施工箇所（対応可能工事）- すべての施工タイプを収集
    const constructionTypes = [];
    // ¥20,000項目
    document.querySelectorAll('input[name="constructionTypes"]:checked').forEach(checkbox => {
        constructionTypes.push(checkbox.value);
    });
    // ¥10,000項目
    document.querySelectorAll('input[name="constructionTypes10k"]:checked').forEach(checkbox => {
        constructionTypes.push(checkbox.value);
    });
    // ¥5,000項目
    document.querySelectorAll('input[name="constructionTypes5k"]:checked').forEach(checkbox => {
        constructionTypes.push(checkbox.value);
    });
    // カンマ区切りで結合
    formData.detailInfo.constructionTypes = constructionTypes.join(',');

    // 特殊対応項目 - value値から取得（nameがspecialServiceになっているので注意）
    const specialServices = [];
    document.querySelectorAll('input[name="specialService"]:checked').forEach(checkbox => {
        specialServices.push(checkbox.value);
    });
    // カンマ区切りで結合（文字数制限は後で確認）
    formData.detailInfo.specialServices = specialServices.join(',');

    console.log('詳細情報保存完了:', formData.detailInfo);
}

/**
 * Step 6: エリア選択を保存
 */
function saveAreaSelection() {
    console.log('=== saveAreaSelection開始 ===');
    console.log('window.registrationData:', window.registrationData);

    // registrationData.areaSelectionからデータを取得（area-selection.jsで管理されている）
    if (window.registrationData && window.registrationData.areaSelection) {
        const areaData = window.registrationData.areaSelection;
        console.log('areaData取得成功:', areaData);

        // 都道府県 - 必ず文字列として保存
        const prefecturesArray = areaData.prefectures || [];
        if (Array.isArray(prefecturesArray) && prefecturesArray.length > 0) {
            formData.selectedAreas.prefectures = prefecturesArray.join(',');
        } else {
            formData.selectedAreas.prefectures = '';
        }

        // 市区町村 - シンプルにカンマ区切りの文字列
        const citiesArray = [];
        if (areaData.cities) {
            Object.keys(areaData.cities).forEach(prefecture => {
                if (areaData.cities[prefecture] && areaData.cities[prefecture].length > 0) {
                    areaData.cities[prefecture].forEach(city => {
                        citiesArray.push(city);
                    });
                }
            });
        }
        formData.selectedAreas.cities = citiesArray.length > 0 ? citiesArray.join(',') : '';

        // 優先エリア - prioritiesを正しく読み取る（area-selection.jsではprioritiesとして保存）
        const prioritiesArray = areaData.priorities || areaData.priorityAreas || [];
        if (Array.isArray(prioritiesArray) && prioritiesArray.length > 0) {
            formData.selectedAreas.priorityAreas = prioritiesArray.join(',');
        } else {
            formData.selectedAreas.priorityAreas = '';
        }
    } else {
        // データがない場合は空文字列を設定
        formData.selectedAreas.prefectures = '';
        formData.selectedAreas.cities = '';
        formData.selectedAreas.priorityAreas = '';
    }

    console.log('エリア選択保存完了:', formData.selectedAreas);
    console.log('都道府県データ:', formData.selectedAreas.prefectures);
    console.log('市区町村データ:', formData.selectedAreas.cities);
    console.log('優先エリアデータ:', formData.selectedAreas.priorityAreas);
}

/**
 * データの文字数チェックと圧縮
 */
function compressDataIfNeeded(data) {
    // JSON文字列化して全体の文字数をチェック
    const jsonStr = JSON.stringify(data);
    const totalChars = jsonStr.length;

    console.log('=== データサイズ確認 ===');
    console.log('総文字数:', totalChars);

    if (totalChars > 2000) {
        console.warn('⚠️ データが2000文字を超えています。圧縮を適用します。');

        // 長いテキストフィールドを圧縮
        if (data.companyInfo?.prText && data.companyInfo.prText.length > 50) {
            data.companyInfo.prText = data.companyInfo.prText.substring(0, 47) + '...';
        }

        // 施工箇所を圧縮（各項目を短縮）
        if (data.detailInfo?.constructionTypes) {
            const types = data.detailInfo.constructionTypes.split(',');
            const shortened = types.map(type => {
                // 括弧内の補足を削除して短縮
                return type.replace(/（.*?）/g, '')
                          .replace(/のみ$/g, '')
                          .replace(/単品$/g, '')
                          .substring(0, 10);
            });
            data.detailInfo.constructionTypes = shortened.join(',');
        }

        // 特殊対応項目を圧縮
        if (data.detailInfo?.specialServices) {
            const services = data.detailInfo.specialServices.split(',');
            const shortened = services.map(service => {
                // 括弧内の補足を削除して短縮
                return service.replace(/（.*?）/g, '')
                             .replace(/・/g, '')
                             .substring(0, 12);
            });
            data.detailInfo.specialServices = shortened.join(',');
        }

        // エリア情報を圧縮
        if (data.selectedAreas?.cities && data.selectedAreas.cities.length > 500) {
            const cities = data.selectedAreas.cities.split(',');
            // 市区町村数を制限して文字数を削減
            const limitedCities = cities.slice(0, 20);
            data.selectedAreas.cities = limitedCities.join(',') + `他${cities.length - 20}`;
        }

        // 優先エリアを圧縮（都道府県_市区町村の形式を短縮）
        if (data.selectedAreas?.priorityAreas && data.selectedAreas.priorityAreas.length > 100) {
            const priorities = data.selectedAreas.priorityAreas.split(',');
            const shortened = priorities.map(p => {
                // 都道府県_市区町村 -> 最初の数文字のみ
                const parts = p.split('_');
                if (parts.length === 2) {
                    return parts[0].substring(0, 3) + '_' + parts[1].substring(0, 3);
                }
                return p.substring(0, 6);
            });
            data.selectedAreas.priorityAreas = shortened.join(',');
        }

        const compressedJsonStr = JSON.stringify(data);
        console.log('圧縮後文字数:', compressedJsonStr.length);
    }

    return data;
}

/**
 * GASへデータ送信
 */
async function submitToGAS() {
    // ローディング表示
    showLoadingOverlay('データ送信中', '加盟店情報を登録しています...');

    try {
        // データ収集（各ステップのデータを確認保存）
        console.log('=== submitToGAS: データ収集開始 ===');

        try {
            console.log('1. saveCompanyName呼び出し');
            saveCompanyName();
        } catch(e) {
            console.error('saveCompanyName エラー:', e);
        }

        try {
            console.log('2. saveTermsAgreement呼び出し');
            saveTermsAgreement();
        } catch(e) {
            console.error('saveTermsAgreement エラー:', e);
        }

        try {
            console.log('3. saveIdentityDocument呼び出し');
            saveIdentityDocument();
        } catch(e) {
            console.error('saveIdentityDocument エラー:', e);
        }

        try {
            console.log('4. saveCompanyInfo呼び出し');
            saveCompanyInfo();
        } catch(e) {
            console.error('saveCompanyInfo エラー:', e);
        }

        try {
            console.log('5. saveDetailInfo呼び出し');
            saveDetailInfo();
        } catch(e) {
            console.error('saveDetailInfo エラー:', e);
        }

        try {
            console.log('6. saveAreaSelection呼び出し');
            saveAreaSelection();
        } catch(e) {
            console.error('saveAreaSelection エラー:', e);
        }

        console.log('=== submitToGAS: データ収集完了 ===');

        // GASに送信するデータ
        let submitData = {
            action: 'registerFranchise',
            companyInfo: formData.companyInfo,
            termsAgreed: formData.termsAgreed,
            selectedAreas: formData.selectedAreas,
            identityDocument: formData.identityDocument,
            detailInfo: formData.detailInfo,
            informationCheck: formData.informationCheck
        };

        console.log('=== 圧縮前のbranches確認 ===');
        console.log('submitData.companyInfo.branches:', submitData.companyInfo?.branches);

        // データサイズチェックと圧縮
        submitData = compressDataIfNeeded(submitData);

        console.log('=== 圧縮後のbranches確認 ===');
        console.log('submitData.companyInfo.branches:', submitData.companyInfo?.branches);

        console.log('送信データ:', submitData);
        console.log('送信データJSON:', JSON.stringify(submitData, null, 2));

        // データ順序の詳細確認
        console.log('=== 送信データ構造確認 ===');
        console.log('companyInfo keys:', Object.keys(submitData.companyInfo || {}));
        console.log('branches data:', submitData.companyInfo?.branches);
        console.log('identityDocument keys:', Object.keys(submitData.identityDocument || {}));
        console.log('detailInfo keys:', Object.keys(submitData.detailInfo || {}));
        console.log('selectedAreas keys:', Object.keys(submitData.selectedAreas || {}));

        // デバッグ：各フィールドを確認
        console.log('=== データマッピング確認 ===');
        console.log('1. 会社名:', submitData.companyInfo?.companyName);
        console.log('2. 会社名カナ:', submitData.companyInfo?.companyNameKana);
        console.log('3. 屋号:', submitData.companyInfo?.businessName);
        console.log('4. 屋号カナ:', submitData.companyInfo?.businessNameKana);
        console.log('5. 代表者名:', submitData.companyInfo?.representative);
        console.log('6. 代表者名カナ:', submitData.companyInfo?.representativeKana);
        console.log('7. 郵便番号:', submitData.companyInfo?.postalCode);
        console.log('8. 住所:', submitData.companyInfo?.fullAddress);
        console.log('9. 電話番号:', submitData.companyInfo?.phone);
        console.log('10. ウェブサイト:', submitData.companyInfo?.websiteUrl);
        console.log('11. 設立年月:', submitData.companyInfo?.establishedDate);
        console.log('12. PRテキスト:', submitData.companyInfo?.prText);
        console.log('13. 支店データ(生):', submitData.companyInfo?.branches);
        const branchNames = submitData.companyInfo?.branches?.map(b => b.name || '').filter(n => n).join('、') || '';
        const branchAddresses = submitData.companyInfo?.branches?.map(b => b.address || '').filter(a => a).join('、') || '';
        console.log('14. 支店名(処理後):', branchNames || '(空)');
        console.log('15. 支店住所(処理後):', branchAddresses || '(空)');
        console.log('16. 利用規約:', submitData.termsAgreed);
        console.log('17. 本人確認書類種類:', submitData.identityDocument?.type);
        console.log('18. 情報確認:', submitData.informationConfirmed);
        console.log('19. 請求メール:', submitData.detailInfo?.billingEmail);
        console.log('20. 営業メール:', submitData.detailInfo?.salesEmail);
        console.log('21. 営業担当者:', submitData.detailInfo?.salesPersonName);
        console.log('22. 営業担当者カナ:', submitData.detailInfo?.salesPersonKana);
        console.log('23. 従業員数:', submitData.detailInfo?.employees);
        console.log('24. 売上規模:', submitData.detailInfo?.revenue);
        console.log('25. 物件種別:', submitData.detailInfo?.propertyTypes);
        console.log('26. 最大対応階数:', submitData.detailInfo?.propertyFloors);
        console.log('27. 築年数:', submitData.detailInfo?.buildingAgeRange);
        console.log('28. 施工箇所:', submitData.detailInfo?.constructionTypes);
        console.log('29. 特殊対応:', submitData.detailInfo?.specialServices);
        console.log('30. 都道府県:', submitData.selectedAreas?.prefectures);
        console.log('31. 市区町村:', submitData.selectedAreas?.cities);
        console.log('32. 優先エリア:', submitData.selectedAreas?.priorityAreas);

        // GASへPOST送信（画像データも含む）
        const endpoint = getGasEndpoint();
        console.log('=== GAS送信開始（POST） ===');
        console.log('送信先URL:', endpoint);
        console.log('登録アクション:', submitData.action);
        console.log('画像データ数:', submitData.identityDocument?.images?.length || 0);

        // FormDataを作成してPOST送信
        const postFormData = new FormData();
        postFormData.append('action', submitData.action);
        postFormData.append('companyInfo', JSON.stringify(submitData.companyInfo));
        postFormData.append('detailInfo', JSON.stringify(submitData.detailInfo));
        postFormData.append('selectedAreas', JSON.stringify(submitData.selectedAreas));
        postFormData.append('identityDocument', JSON.stringify(submitData.identityDocument));
        postFormData.append('termsAgreed', submitData.termsAgreed);
        postFormData.append('informationCheck', submitData.informationCheck || 'true');

        // POST送信
        fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors', // CORSエラー回避
            body: postFormData
        })
        .then(() => {
            console.log('POST送信完了（FormData使用）');

            // 成功処理
            hideLoadingOverlay();

            // Step 7（完了画面）へ遷移
            goToStep(7);

            // フォームデータをリセット
            formData = {
                companyInfo: {
                    branches: []
                },
                termsAgreed: false,
                selectedAreas: {
                    prefectures: '',
                    cities: '',
                    priorityAreas: ''
                },
                detailInfo: {},
                identityDocument: {
                    type: null,
                    images: []
                },
                informationConfirmed: false
            };
            window.registrationData = null;

            console.log('登録処理完了');
        })
        .catch((error) => {
            console.error('POST送信エラー:', error);
            hideLoadingOverlay();
            alert('送信に失敗しました。もう一度お試しください。');
        });

        return true;

    } catch (error) {
        console.error('送信エラー:', error);
        hideLoadingOverlay();

        // エラーメッセージ表示
        alert('送信中にエラーが発生しました。\nもう一度お試しください。\n\nエラー: ' + error.message);

        return false;
    }
}

// Loading機能はinit.jsのshowLoadingOverlay/hideLoadingOverlayを使用

/**
 * 既存の関数をオーバーライド（Step 6完了時にGAS送信）
 */
const originalProceedToCompletion = window.proceedToCompletion;
window.proceedToCompletion = async function() {
    // エリア選択データを保存
    saveAreaSelection();

    // GASへ送信
    const success = await submitToGAS();

    if (!success) {
        // エラーの場合は処理中断
        return;
    }

    // 元の処理があれば実行
    if (typeof originalProceedToCompletion === 'function') {
        originalProceedToCompletion();
    }
};

// submitToGAS関数をwindowオブジェクトに公開
window.submitToGAS = submitToGAS;

/**
 * デバッグ用：現在のフォームデータを確認
 */
window.debugFormData = function() {
    console.log('=== 現在のフォームデータ ===');
    console.log(JSON.stringify(formData, null, 2));
    return formData;
};

/**
 * テスト用：ダミーデータで送信テスト
 */
window.testGASSubmit = async function() {
    // テストデータ
    formData = {
        companyInfo: {
            companyName: 'テスト株式会社',
            representativeName: '田中太郎',
            postalCode: '123-4567',
            prefecture: '東京都',
            city: '渋谷区',
            address: '渋谷1-2-3',
            phone: '03-1234-5678',
            website: 'https://test.example.com'
        },
        termsAgreed: true,
        selectedAreas: {
            prefectures: ['東京都', '神奈川県'],
            cities: ['渋谷区', '新宿区', '横浜市']
        },
        identityDocument: {
            type: 'drivers_license',
            url: ''
        },
        informationConfirmed: true,
        detailInfo: {
            qualifications: ['一級建築士', '二級建築士'],
            supportedWorks: ['外壁塗装', '屋根工事'],
            notes: 'テスト送信です'
        }
    };

    console.log('テストデータで送信開始...');
    const result = await submitToGAS();
    console.log('送信結果:', result ? '成功' : '失敗');
    return result;
};