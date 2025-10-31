/**
 * データフォーマット用ユーティリティ
 * スプレッドシートから取得した圧縮データを展開して表示用に整形
 */

/**
 * カンマ区切りデータを配列に展開
 * @param {string} data - カンマ区切りの文字列
 * @returns {Array} 展開された配列
 */
function expandCommaData(data) {
    if (!data || typeof data !== 'string') return [];
    return data.split(',').map(item => item.trim()).filter(item => item);
}

/**
 * 都道府県・市区町村データを展開して表示用HTML生成
 * @param {string} prefectures - カンマ区切りの都道府県
 * @param {string} cities - カンマ区切りの市区町村
 * @param {string} priorities - カンマ区切りの優先エリア
 * @returns {string} 表示用HTML
 */
function formatAreaDisplay(prefectures, cities, priorities) {
    const prefList = expandCommaData(prefectures);
    const cityList = expandCommaData(cities);
    const priorityList = expandCommaData(priorities);

    if (prefList.length === 0) {
        return '<span class="text-gray-400">未設定</span>';
    }

    let html = '<div class="area-display">';

    // 都道府県表示
    html += '<div class="mb-2">';
    html += '<strong>都道府県:</strong> ';
    html += `<span class="text-blue-600">${prefList.join('、')}</span>`;
    html += '</div>';

    // 市区町村表示（展開可能）
    if (cityList.length > 0) {
        const displayId = 'city-' + Date.now() + Math.random().toString(36).substr(2, 9);
        html += '<div class="mb-2">';
        html += '<strong>市区町村:</strong> ';

        if (cityList.length > 5) {
            html += `<span id="${displayId}-collapsed">`;
            html += cityList.slice(0, 5).join('、');
            html += `<button onclick="toggleDataExpansion('${displayId}')" class="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium">`;
            html += `他${cityList.length - 5}件を表示 ▼`;
            html += '</button></span>';

            html += `<span id="${displayId}-expanded" style="display: none;">`;
            html += cityList.join('、');
            html += `<button onclick="toggleDataExpansion('${displayId}')" class="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium">`;
            html += '折りたたむ ▲';
            html += '</button></span>';
        } else {
            html += cityList.join('、');
        }
        html += '</div>';
    }

    // 優先エリア表示
    if (priorityList.length > 0) {
        html += '<div>';
        html += '<strong>優先エリア:</strong> ';
        html += `<span class="text-orange-600 font-medium">${priorityList.join('、')}</span>`;
        html += '</div>';
    }

    html += '</div>';
    return html;
}

/**
 * 施工項目データを展開して表示用HTML生成
 * @param {string} constructionTypes - カンマ区切りの施工項目
 * @returns {string} 表示用HTML
 */
function formatConstructionDisplay(constructionTypes) {
    const items = expandCommaData(constructionTypes);

    if (items.length === 0) {
        return '<span class="text-gray-400">未設定</span>';
    }

    const displayId = 'const-' + Date.now() + Math.random().toString(36).substr(2, 9);
    let html = '<div class="construction-display">';

    if (items.length > 3) {
        html += `<span id="${displayId}-collapsed">`;
        html += items.slice(0, 3).map(item =>
            `<span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1 mb-1">${item}</span>`
        ).join('');
        html += `<button onclick="toggleDataExpansion('${displayId}')" class="ml-1 text-blue-600 hover:text-blue-800 text-sm font-medium">`;
        html += `他${items.length - 3}項目 ▼`;
        html += '</button></span>';

        html += `<span id="${displayId}-expanded" style="display: none;">`;
        html += items.map(item =>
            `<span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1 mb-1">${item}</span>`
        ).join('');
        html += `<button onclick="toggleDataExpansion('${displayId}')" class="ml-1 text-blue-600 hover:text-blue-800 text-sm font-medium">`;
        html += '折りたたむ ▲';
        html += '</button></span>';
    } else {
        html += items.map(item =>
            `<span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1 mb-1">${item}</span>`
        ).join('');
    }

    html += '</div>';
    return html;
}

/**
 * 特殊サービスデータを展開して表示用HTML生成
 * @param {string} specialServices - カンマ区切りの特殊サービス
 * @returns {string} 表示用HTML
 */
function formatSpecialServiceDisplay(specialServices) {
    const items = expandCommaData(specialServices);

    if (items.length === 0) {
        return '<span class="text-gray-400">なし</span>';
    }

    const displayId = 'special-' + Date.now() + Math.random().toString(36).substr(2, 9);
    let html = '<div class="special-service-display">';

    if (items.length > 2) {
        html += `<span id="${displayId}-collapsed">`;
        html += items.slice(0, 2).map(item =>
            `<span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mr-1 mb-1">${item}</span>`
        ).join('');
        html += `<button onclick="toggleDataExpansion('${displayId}')" class="ml-1 text-blue-600 hover:text-blue-800 text-sm font-medium">`;
        html += `他${items.length - 2}項目 ▼`;
        html += '</button></span>';

        html += `<span id="${displayId}-expanded" style="display: none;">`;
        html += items.map(item =>
            `<span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mr-1 mb-1">${item}</span>`
        ).join('');
        html += `<button onclick="toggleDataExpansion('${displayId}')" class="ml-1 text-blue-600 hover:text-blue-800 text-sm font-medium">`;
        html += '折りたたむ ▲';
        html += '</button></span>';
    } else {
        html += items.map(item =>
            `<span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded mr-1 mb-1">${item}</span>`
        ).join('');
    }

    html += '</div>';
    return html;
}

/**
 * 物件種別データを展開して表示用HTML生成
 * @param {string} propertyTypes - カンマ区切りの物件種別
 * @param {string} propertyFloors - カンマ区切りの物件種別と階数
 * @returns {string} 表示用HTML
 */
function formatPropertyDisplay(propertyTypes, propertyFloors) {
    const types = expandCommaData(propertyTypes);
    const floors = expandCommaData(propertyFloors);

    if (types.length === 0 && floors.length === 0) {
        return '<span class="text-gray-400">未設定</span>';
    }

    let html = '<div class="property-display">';

    // 階数情報がある場合は詳細表示
    if (floors.length > 0) {
        html += floors.map(item => {
            // "戸建て(2階まで)" のような形式を解析
            const match = item.match(/(.+)\((.+)\)/);
            if (match) {
                return `<span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mr-1 mb-1">${match[1]} <small>(${match[2]})</small></span>`;
            }
            return `<span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mr-1 mb-1">${item}</span>`;
        }).join('');
    } else {
        // 階数情報がない場合は物件種別のみ
        html += types.map(type =>
            `<span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mr-1 mb-1">${type}</span>`
        ).join('');
    }

    html += '</div>';
    return html;
}

/**
 * 展開・折りたたみトグル
 * @param {string} displayId - 表示要素のID
 */
function toggleDataExpansion(displayId) {
    const collapsedEl = document.getElementById(`${displayId}-collapsed`);
    const expandedEl = document.getElementById(`${displayId}-expanded`);

    if (collapsedEl && expandedEl) {
        if (collapsedEl.style.display === 'none') {
            collapsedEl.style.display = 'inline';
            expandedEl.style.display = 'none';
        } else {
            collapsedEl.style.display = 'none';
            expandedEl.style.display = 'inline';
        }
    }
}

/**
 * 加盟店データテーブル用にフォーマット
 * @param {Object} registration - 加盟店登録データ
 * @returns {Object} フォーマット済みデータ
 */
function formatRegistrationData(registration) {
    const formatted = { ...registration };

    // エリア情報のフォーマット
    if (registration.prefectures || registration.cities) {
        formatted.areaDisplay = formatAreaDisplay(
            registration.prefectures,
            registration.cities,
            registration.priorityAreas
        );
    }

    // 施工項目のフォーマット
    if (registration.constructionTypes) {
        formatted.constructionDisplay = formatConstructionDisplay(registration.constructionTypes);
    }

    // 特殊サービスのフォーマット
    if (registration.specialServices) {
        formatted.specialServiceDisplay = formatSpecialServiceDisplay(registration.specialServices);
    }

    // 物件種別のフォーマット
    if (registration.propertyTypes || registration.propertyFloors) {
        formatted.propertyDisplay = formatPropertyDisplay(
            registration.propertyTypes,
            registration.propertyFloors
        );
    }

    return formatted;
}

// グローバルに公開
window.dataFormatter = {
    expandCommaData,
    formatAreaDisplay,
    formatConstructionDisplay,
    formatSpecialServiceDisplay,
    formatPropertyDisplay,
    formatRegistrationData,
    toggleDataExpansion
};

// toggleDataExpansion関数を直接グローバルに公開（onclick用）
window.toggleDataExpansion = toggleDataExpansion;

console.log('[Data Formatter] 初期化完了');