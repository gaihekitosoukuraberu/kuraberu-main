/**
 * エリア選択機能
 */

// 都道府県選択トグル
function togglePrefecture(prefecture) {
    const item = document.querySelector(`[data-prefecture="${prefecture}"]`);
    const isSelected = item.classList.contains('selected');
    const areaData = window.registrationData.areaSelection;

    if (isSelected) {
        // 選択解除
        item.classList.remove('selected');
        areaData.prefectures = areaData.prefectures.filter(p => p !== prefecture);
        delete areaData.cities[prefecture];
        // 優先エリアからも削除
        areaData.priorities = areaData.priorities.filter(p => !p.startsWith(prefecture));
    } else {
        // 選択上限チェック
        if (areaData.prefectures.length >= window.CONFIG.MAX_PREFECTURES) {
            window.showError(`最大${window.CONFIG.MAX_PREFECTURES}都道府県まで選択可能です`);
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

// 市区町村データベース（主要11都道府県）
const cityDatabase = {
    '東京都': [
        '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区',
        '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区',
        '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区',
        '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区',
        '八王子市', '立川市', '武蔵野市', '三鷹市', '青梅市', '府中市',
        '昭島市', '調布市', '町田市', '小金井市', '小平市', '日野市',
        '東村山市', '国分寺市', '国立市', '福生市', '狛江市', '東大和市',
        '清瀬市', '東久留米市', '武蔵村山市', '多摩市', '稲城市', '羽村市',
        'あきる野市', '西東京市', '瑞穂町', '日の出町', '檜原村', '奥多摩町'
    ],
    '神奈川県': [
        '横浜市鶴見区', '横浜市神奈川区', '横浜市西区', '横浜市中区',
        '横浜市南区', '横浜市保土ケ谷区', '横浜市磯子区', '横浜市金沢区',
        '横浜市港北区', '横浜市戸塚区', '横浜市港南区', '横浜市旭区',
        '横浜市緑区', '横浜市瀬谷区', '横浜市栄区', '横浜市泉区',
        '横浜市青葉区', '横浜市都筑区', '川崎市川崎区', '川崎市幸区',
        '川崎市中原区', '川崎市高津区', '川崎市多摩区', '川崎市宮前区',
        '川崎市麻生区', '相模原市緑区', '相模原市中央区', '相模原市南区',
        '横須賀市', '平塚市', '鎌倉市', '藤沢市', '小田原市', '茅ヶ崎市',
        '逗子市', '三浦市', '秦野市', '厚木市', '大和市', '伊勢原市',
        '海老名市', '座間市', '南足柄市', '綾瀬市'
    ],
    '埼玉県': [
        'さいたま市西区', 'さいたま市北区', 'さいたま市大宮区', 'さいたま市見沼区',
        'さいたま市中央区', 'さいたま市桜区', 'さいたま市浦和区', 'さいたま市南区',
        'さいたま市緑区', 'さいたま市岩槻区', '川越市', '熊谷市', '川口市',
        '行田市', '秩父市', '所沢市', '飯能市', '加須市', '本庄市',
        '東松山市', '春日部市', '狭山市', '羽生市', '鴻巣市', '深谷市',
        '上尾市', '草加市', '越谷市', '蕨市', '戸田市', '入間市',
        '朝霞市', '志木市', '和光市', '新座市', '桶川市', '久喜市',
        '北本市', '八潮市', '富士見市', '三郷市', '蓮田市', '坂戸市',
        '幸手市', '鶴ヶ島市', '日高市', '吉川市', 'ふじみ野市', '白岡市'
    ],
    '千葉県': [
        '千葉市中央区', '千葉市花見川区', '千葉市稲毛区', '千葉市若葉区',
        '千葉市緑区', '千葉市美浜区', '銚子市', '市川市', '船橋市',
        '館山市', '木更津市', '松戸市', '野田市', '茂原市', '成田市',
        '佐倉市', '東金市', '旭市', '習志野市', '柏市', '勝浦市',
        '市原市', '流山市', '八千代市', '我孫子市', '鴨川市', '鎌ケ谷市',
        '君津市', '富津市', '浦安市', '四街道市', '袖ケ浦市', '八街市',
        '印西市', '白井市', '富里市', '南房総市', '匝瑳市', '香取市',
        '山武市', 'いすみ市', '大網白里市'
    ],
    '岐阜県': [
        '岐阜市', '大垣市', '高山市', '多治見市', '関市', '中津川市',
        '美濃市', '瑞浪市', '羽島市', '恵那市', '美濃加茂市', '土岐市',
        '各務原市', '可児市', '山県市', '瑞穂市', '飛騨市', '本巣市',
        '郡上市', '下呂市', '海津市'
    ],
    '愛知県': [
        '名古屋市千種区', '名古屋市東区', '名古屋市北区', '名古屋市西区',
        '名古屋市中村区', '名古屋市中区', '名古屋市昭和区', '名古屋市瑞穂区',
        '名古屋市熱田区', '名古屋市中川区', '名古屋市港区', '名古屋市南区',
        '名古屋市守山区', '名古屋市緑区', '名古屋市名東区', '名古屋市天白区',
        '豊橋市', '岡崎市', '一宮市', '瀬戸市', '半田市', '春日井市',
        '豊川市', '津島市', '碧南市', '刈谷市', '豊田市', '安城市',
        '西尾市', '蒲郡市', '犬山市', '常滑市', '江南市', '小牧市',
        '稲沢市', '新城市', '東海市', '大府市', '知多市', '知立市',
        '尾張旭市', '高浜市', '岩倉市', '豊明市', '日進市', '田原市',
        '愛西市', '清須市', '北名古屋市', '弥富市', 'みよし市', 'あま市',
        '長久手市'
    ],
    '大阪府': [
        '大阪市都島区', '大阪市福島区', '大阪市此花区', '大阪市西区',
        '大阪市港区', '大阪市大正区', '大阪市天王寺区', '大阪市浪速区',
        '大阪市西淀川区', '大阪市東淀川区', '大阪市東成区', '大阪市生野区',
        '大阪市旭区', '大阪市城東区', '大阪市阿倍野区', '大阪市住吉区',
        '大阪市東住吉区', '大阪市西成区', '大阪市淀川区', '大阪市鶴見区',
        '大阪市住之江区', '大阪市平野区', '大阪市北区', '大阪市中央区',
        '堺市堺区', '堺市中区', '堺市東区', '堺市西区', '堺市南区',
        '堺市北区', '堺市美原区', '岸和田市', '豊中市', '池田市',
        '吹田市', '泉大津市', '高槻市', '貝塚市', '守口市', '枚方市',
        '茨木市', '八尾市', '泉佐野市', '富田林市', '寝屋川市', '河内長野市',
        '松原市', '大東市', '和泉市', '箕面市', '柏原市', '羽曳野市',
        '門真市', '摂津市', '高石市', '藤井寺市', '東大阪市', '泉南市',
        '四條畷市', '交野市', '大阪狭山市', '阪南市'
    ],
    '京都府': [
        '京都市北区', '京都市上京区', '京都市左京区', '京都市中京区',
        '京都市東山区', '京都市下京区', '京都市南区', '京都市右京区',
        '京都市伏見区', '京都市山科区', '京都市西京区', '福知山市',
        '舞鶴市', '綾部市', '宇治市', '宮津市', '亀岡市', '城陽市',
        '向日市', '長岡京市', '八幡市', '京田辺市', '京丹後市', '南丹市',
        '木津川市'
    ],
    '兵庫県': [
        '神戸市東灘区', '神戸市灘区', '神戸市兵庫区', '神戸市長田区',
        '神戸市須磨区', '神戸市垂水区', '神戸市北区', '神戸市中央区',
        '神戸市西区', '姫路市', '尼崎市', '明石市', '西宮市', '洲本市',
        '芦屋市', '伊丹市', '相生市', '豊岡市', '加古川市', '赤穂市',
        '西脇市', '宝塚市', '三木市', '高砂市', '川西市', '小野市',
        '三田市', '加西市', '丹波篠山市', '養父市', '丹波市', '南あわじ市',
        '朝来市', '淡路市', '宍粟市', '加東市', 'たつの市'
    ],
    '奈良県': [
        '奈良市', '大和高田市', '大和郡山市', '天理市', '橿原市', '桜井市',
        '五條市', '御所市', '生駒市', '香芝市', '葛城市', '宇陀市'
    ],
    '愛媛県': [
        '松山市', '今治市', '宇和島市', '八幡浜市', '新居浜市', '西条市',
        '大洲市', '伊予市', '四国中央市', '西予市', '東温市'
    ]
};

// 市区町村の取得
function getCitiesForPrefecture(prefecture) {
    return cityDatabase[prefecture] || generateDefaultCities(prefecture);
}

// デフォルトの市区町村リスト生成
function generateDefaultCities(prefecture) {
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

// エリア選択表示
function displayAreaSelection() {
    const container = document.getElementById('areaSelectionContainer');
    if (!container) return;

    // エリアデータの初期化
    if (!window.registrationData.areaSelection) {
        window.registrationData.areaSelection = {
            prefectures: [],
            cities: {},
            priorities: [],  // 優先エリア
            totalCount: 0
        };
    }
    
    let html = `
        <!-- 選択状況サマリー -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; text-align: center;">
                <div>
                    <div style="font-size: 0.75rem; color: #4b5563; margin-bottom: 0.25rem;">都道府県</div>
                    <div style="font-weight: bold; font-size: 1.125rem;">
                        <span id="selectedPrefCount">0</span>
                        <span style="font-size: 0.75rem; color: #6b7280; font-weight: normal;"> / ${window.CONFIG.MAX_PREFECTURES}</span>
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: #4b5563; margin-bottom: 0.25rem;">市区町村</div>
                    <div style="font-weight: bold; font-size: 1.125rem;">
                        <span id="selectedCityCount">0</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 都道府県選択 -->
        <div class="border rounded-lg p-4 mb-6">
            <h4 class="font-semibold mb-3">STEP 1: 都道府県を選択<br class="mobile-break"> (最大${window.CONFIG.MAX_PREFECTURES}件)</h4>
            <div class="area-grid" id="areaGrid">
    `;
    // 都道府県を全て表示
    const allPrefectures = [];
    Object.values(window.CONFIG.PREFECTURES).forEach(prefectures => {
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
                <div id="cityListContainer" class="space-y-4 overflow-y-auto scrollable-area">
                    <!-- 各都道府県の市区町村リストが縦に表示される -->
                </div>
            </div>
        </div>

        <!-- 優先エリア設定 -->
        <div id="priorityArea" class="hidden mb-6">
            <div id="priorityAreaSection" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-semibold">優先エリア設定</h4>
                    <span class="text-orange-500 font-semibold">0 / 3 選択中</span>
                </div>
                <p class="text-sm text-gray-600 mb-3">注力エリアを最大3件選択</p>
                <div id="prioritySelectionList">
                    <!-- 優先エリア選択リストがここに生成される -->
                </div>
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


// 既存の選択を復元
function restoreAreaSelection() {
    const areaData = window.registrationData.areaSelection;

    // 都道府県の選択状態を復元
    areaData.prefectures.forEach(pref => {
        const item = document.querySelector(`[data-prefecture="${pref}"]`);
        if (item) {
            item.classList.add('selected');
        }
    });

    // UI更新
    updateAreaSelectionUI();

    // 市区町村が選択されていれば優先エリアも更新
    if (Object.keys(areaData.cities).length > 0) {
        updatePriorityArea();
    }
}

// エリア選択UI更新
function updateAreaSelectionUI() {
    const areaData = window.registrationData.areaSelection;

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

    // 確認ボタンの有効/無効
    const confirmBtn = document.getElementById('areaConfirmBtn');
    if (confirmBtn) {
        confirmBtn.disabled = areaData.prefectures.length === 0;
    }
}

// 市区町村選択エリア更新
function updateCitySelectionArea() {
    const areaData = window.registrationData.areaSelection;
    const cityContainer = document.getElementById('cityListContainer');

    if (!cityContainer) return;

    if (areaData.prefectures.length === 0) {
        cityContainer.innerHTML = '';
        return;
    }

    // 各都道府県の市区町村リストを縦に表示
    cityContainer.innerHTML = areaData.prefectures.map(prefecture => {
        const allCities = getCitiesForPrefecture(prefecture);
        const selectedCities = areaData.cities[prefecture] || [];

        return `
            <div class="border rounded-lg p-4">
                <div class="mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <h5 class="font-medium text-lg">${prefecture}</h5>
                        <span class="text-sm text-gray-600">
                            ${selectedCities.length} / ${allCities.length} 選択中
                        </span>
                    </div>
                    <label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox"
                               ${selectedCities.length === allCities.length ? 'checked' : ''}
                               onchange="toggleAllCities('${prefecture}', this.checked)">
                        <span class="ml-2 text-sm font-medium">すべて選択</span>
                    </label>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
            </div>
        `;
    }).join('');
}


// 市区町村選択トグル
function toggleCity(prefecture, city, checked) {
    const areaData = window.registrationData.areaSelection;

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
    const areaData = window.registrationData.areaSelection;
    const allCities = getCitiesForPrefecture(prefecture);

    if (checked) {
        areaData.cities[prefecture] = [...allCities];
    } else {
        areaData.cities[prefecture] = [];
        // 優先エリアからも削除
        areaData.priorities = areaData.priorities.filter(p => !p.startsWith(prefecture));
    }

    // 縦表示を更新
    updateCitySelectionArea();
    updateAreaSelectionUI();
}

// 優先エリア更新
function updatePriorityArea() {
    const areaData = window.registrationData.areaSelection;
    const container = document.getElementById('prioritySelectionList');

    if (!container) return;

    // カウンターも更新
    updatePriorityCount();

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

    // 都道府県ごとにグループ化
    const groupedAreas = {};
    availableAreas.forEach(area => {
        const [pref, city] = area.label.split(' - ');
        if (!groupedAreas[pref]) {
            groupedAreas[pref] = [];
        }
        groupedAreas[pref].push({
            key: area.key,
            city: city,
            label: area.label
        });
    });

    container.innerHTML = `
        <div class="bg-white border-2 border-yellow-200 rounded-lg overflow-hidden">
            <!-- 検索ボックス（固定ヘッダー） -->
            <div class="sticky top-0 bg-white z-20 p-4 border-b border-yellow-200">
                <div class="mb-2">
                    <span class="text-sm font-semibold">選択可能エリア (全${availableAreas.length}件)</span>
                </div>
                <input type="text"
                       id="priorityAreaSearch"
                       placeholder="エリア名で絞り込み（例: 横浜）"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                       oninput="filterPriorityAreas(this.value)">
            </div>

            <!-- エリアリスト -->
            <div class="max-h-96 overflow-y-auto scrollable-area p-4" id="priorityAreasListContent">
                ${Object.entries(groupedAreas).map(([prefecture, areas]) => `
                    <div class="mb-4 priority-area-group" data-prefecture="${prefecture}">
                        <h4 class="font-semibold text-sm text-gray-700 mb-2 bg-white p-2 rounded sticky top-0 z-10 border-b border-gray-200">
                            📍 ${prefecture}
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${areas.map(area => `
                                <label class="flex items-center p-2 bg-white border border-gray-200 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 cursor-pointer transition-all priority-area-item ${areaData.priorities.includes(area.key) ? 'border-yellow-400 bg-yellow-50' : ''}" data-area-label="${area.label.toLowerCase()}">
                                    <input type="checkbox"
                                           value="${area.key}"
                                           ${areaData.priorities.includes(area.key) ? 'checked' : ''}
                                           onchange="togglePriority('${area.key}', this.checked)"
                                           class="mr-2">
                                    <span class="text-sm ${areaData.priorities.includes(area.key) ? 'font-semibold text-yellow-700' : ''}">${area.city}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // 優先エリア選択数を更新
    updatePriorityCount();
}

// 優先エリア選択トグル
function togglePriority(areaKey, checked) {
    const areaData = window.registrationData.areaSelection;

    if (checked) {
        if (areaData.priorities.length >= 3) {
            window.showError('優先エリアは最大3つまで選択可能です');
            // チェックボックスを元に戻す
            const checkbox = document.querySelector(`input[value="${areaKey}"]`);
            if (checkbox) checkbox.checked = false;
            return;
        }
        if (!areaData.priorities.includes(areaKey)) {
            areaData.priorities.push(areaKey);
        }
    } else {
        areaData.priorities = areaData.priorities.filter(p => p !== areaKey);
    }

    // 選択数カウンターを更新
    updatePriorityCount();
}

// 優先エリア選択数を更新
function updatePriorityCount() {
    const areaData = window.registrationData.areaSelection;
    const count = areaData.priorities.length;

    // カウンター表示を探して更新
    const counterElement = document.querySelector('#priorityAreaSection .text-orange-500');
    if (counterElement) {
        counterElement.textContent = `${count} / 3 選択中`;
    }
}

// 優先エリア検索フィルター
function filterPriorityAreas(searchText) {
    const normalizedSearch = searchText.toLowerCase().trim();
    const groups = document.querySelectorAll('.priority-area-group');

    groups.forEach(group => {
        const items = group.querySelectorAll('.priority-area-item');
        let hasVisibleItems = false;

        items.forEach(item => {
            const areaLabel = item.getAttribute('data-area-label') || '';
            if (normalizedSearch === '' || areaLabel.includes(normalizedSearch)) {
                item.style.display = '';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });

        // 都道府県グループ全体の表示/非表示
        if (hasVisibleItems) {
            group.style.display = '';
        } else {
            group.style.display = 'none';
        }
    });
}

// 選択済みエリア詳細更新
function updateSelectedAreaDetails() {
    const areaData = window.registrationData.areaSelection;
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
    window.registrationData.areaSelection = {
        prefectures: [],
        cities: {},
        priorities: [],
        totalCount: 0
    };

    updateAreaSelectionUI();
}

// エリア選択確認
async function confirmAreaSelection() {
    const areaData = window.registrationData.areaSelection;

    if (areaData.prefectures.length === 0) {
        window.showError('少なくとも1つの都道府県を選択してください');
        return;
    }

    // 市区町村が選択されているか確認
    const hasAnyCities = Object.values(areaData.cities).some(cities => cities.length > 0);
    if (!hasAnyCities) {
        window.showError('少なくとも1つの市区町村を選択してください');
        return;
    }

    // Step 7へ進む
    window.goToStep(7);

    // Step 7に移動してからGAS送信
    setTimeout(() => {
        if (window.submitToGAS) {
            window.submitToGAS();
        }
    }, 100);
}

// 初期化関数
function initializeAreaSelection() {
    displayAreaSelection();
}

// 関数をwindowに公開
window.displayAreaSelection = displayAreaSelection;
window.togglePrefecture = togglePrefecture;
window.getCitiesForPrefecture = getCitiesForPrefecture;
window.generateDefaultCities = generateDefaultCities;
window.restoreAreaSelection = restoreAreaSelection;
window.updateAreaSelectionUI = updateAreaSelectionUI;
window.updateCitySelectionArea = updateCitySelectionArea;
window.toggleCity = toggleCity;
window.toggleAllCities = toggleAllCities;
window.updatePriorityArea = updatePriorityArea;
window.togglePriority = togglePriority;
window.updateSelectedAreaDetails = updateSelectedAreaDetails;
window.updatePriorityCount = updatePriorityCount;
window.clearAreaSelection = clearAreaSelection;
window.confirmAreaSelection = confirmAreaSelection;
window.initializeAreaSelection = initializeAreaSelection;