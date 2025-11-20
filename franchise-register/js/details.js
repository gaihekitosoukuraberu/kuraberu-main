/**
 * Step 5: 詳細情報入力
 */

// 詳細情報フォーム初期化
function initializeDetailsForm() {
    displayDetailsForm();
}

// 詳細情報表示
function displayDetailsForm() {
    const form = document.getElementById('detailsForm');
    // 保存済みデータを取得
    const savedData = window.registrationData.detailInfo || {};

    const html = `
        <!-- 連絡先情報 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">連絡先情報</h3>
            <div class="space-y-4">
                <div class="form-field">
                    <label for="billingEmail">請求用メールアドレス <span class="required">*</span></label>
                    <input type="email" id="billingEmail" required placeholder="billing@example.com" value="${savedData.billingEmail || ''}">
                </div>
                <div class="form-field">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label for="salesEmail">営業用メールアドレス <span class="required">*</span></label>
                        <button type="button" id="sameAsBilling" onclick="toggleSameAsBilling()" style="padding: 0.5rem 1rem; font-size: 0.75rem; color: #374151; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #cbd5e0; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: 500;">
                            <span class="hidden md:inline">請求用と同じ場合はここをクリック</span>
                            <span class="md:hidden">請求用と同じ場合は<br>ここをタップ</span>
                        </button>
                    </div>
                    <input type="email" id="salesEmail" required placeholder="sales@company.co.jp" value="${savedData.salesEmail || ''}">
                </div>
                <div class="form-field">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <label for="salesPersonName">営業担当者氏名 <span class="required">*</span></label>
                        <button type="button" id="sameAsRepresentative" onclick="toggleSameAsRepresentative()" style="padding: 0.5rem 1rem; font-size: 0.75rem; color: #374151; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #cbd5e0; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-weight: 500;">
                            <span class="hidden md:inline">代表者と同じ場合はここをクリック</span>
                            <span class="md:hidden">代表者と同じ場合は<br>ここをタップ</span>
                        </button>
                    </div>
                    <input type="text" id="salesPersonName" required placeholder="営業担当者の氏名を入力" value="${savedData.salesPersonName || ''}">
                </div>
                <div class="form-field">
                    <label for="salesPersonKana">営業担当者カナ <span class="required">*</span></label>
                    <input type="text" id="salesPersonKana" required placeholder="ヤマダ タロウ" value="${savedData.salesPersonKana || ''}">
                </div>
            </div>
        </div>

        <!-- 事業詳細 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">事業詳細</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-field">
                    <label for="employees">従業員数 <span class="required">*</span></label>
                    <select id="employees" required>
                        <option value="">選択してください</option>
                        <option value="1-2">1〜2名</option>
                        <option value="3-5">3〜5名</option>
                        <option value="6-10">6〜10名</option>
                        <option value="11+">11名以上</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="revenue">売上規模 <span class="required">*</span></label>
                    <select id="revenue" required>
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
                            <div class="flex-1 flex items-center">
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
                            <input type="checkbox" class="mr-3" value="apartment" name="propertyType" id="apartmentCheckbox" onchange="checkLargeProperty(this)">
                            <div class="flex-1 flex items-center">
                                <span class="font-medium">🏢 アパート・マンション</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="apartmentFloors" onchange="checkFloorSelection(this)">
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
                            <input type="checkbox" class="mr-3" value="commercial" name="propertyType" id="commercialCheckbox" onchange="checkLargeProperty(this)">
                            <div class="flex-1 flex items-center">
                                <span class="font-medium">🏪 店舗・事務所</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="commercialFloors" onchange="checkFloorSelection(this)">
                                    <option value="1">1階</option>
                                    <option value="2">2階</option>
                                    <option value="3" selected>3階</option>
                                    <option value="4">4階以上</option>
                                </select>
                                <span class="ml-1 text-sm text-gray-600">まで</span>
                            </div>
                        </label>
                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
                            <input type="checkbox" class="mr-3" value="factory" name="propertyType" id="factoryCheckbox" onchange="checkLargeProperty(this)">
                            <div class="flex-1 flex items-center">
                                <span class="font-medium">🏭 工場・倉庫</span>
                                <select class="ml-auto text-sm border rounded px-2 py-1" id="factoryFloors" onchange="checkFloorSelection(this)">
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
                        <input type="checkbox" name="constructionTypes" value="外壁塗装" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">外壁塗装</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁カバー工法" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">外壁カバー工法</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁張替え" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">外壁張替え</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根塗装（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">屋根塗装（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋上防水（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">屋上防水（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根葺き替え・張り替え※スレート・ガルバリウム等" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1 text-sm">屋根葺き替え・張り替え※スレート・ガルバリウム等</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根葺き替え・張り替え※瓦" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">屋根葺き替え・張り替え※瓦</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根カバー工法" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">屋根カバー工法</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁補修（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">外壁補修（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根補修（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">屋根補修（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="ベランダ防水（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">ベランダ防水（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="内装水回り（バス・キッチン・トイレ）（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1 text-sm">内装水回り（バス・キッチン・トイレ）（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="内装（フローリングや畳などの床・クロス等）（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1 text-sm">内装（フローリングや畳などの床・クロス等）（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="外壁雨漏り修繕（外壁工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">外壁雨漏り修繕（外壁工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes" value="屋根雨漏り修繕（屋根工事含む）" class="mr-3" onchange="updateConstructionFee()">
                        <span class="flex-1">屋根雨漏り修繕（屋根工事含む）</span>
                        <span class="text-sm font-semibold text-blue-600">¥20,000</span>
                    </label>
                </div>
            </div>

            <!-- 単品工事項目 -->
            <div class="mb-4">
                <p class="text-sm text-gray-600 mb-2">以下の単品依頼は相見積もり時の料金を税抜き表示しております。</p>
                <p class="text-xs text-gray-500 mb-3">※1社紹介時はすべて¥20,000となります</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <!-- ¥10,000項目 -->
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes10k" value="屋根塗装単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">屋根塗装単品</span>
                        <span class="text-sm font-semibold text-green-600">¥10,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes10k" value="屋上防水単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">屋上防水単品</span>
                        <span class="text-sm font-semibold text-green-600">¥10,000</span>
                    </label>

                    <!-- ¥5,000項目 -->
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes5k" value="外壁補修単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">外壁補修単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes5k" value="屋根補修単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">屋根補修単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes5k" value="ベランダ防水単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">ベランダ防水単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes5k" value="外壁雨漏り修繕単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">外壁雨漏り修繕単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥5,000</span>
                    </label>
                    <label class="flex items-center p-3 bg-white border rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" name="constructionTypes5k" value="屋根雨漏り修繕単品" class="mr-3" onchange="handleSingleItemChange(this); updateConstructionFee()">
                        <span class="flex-1">屋根雨漏り修繕単品</span>
                        <span class="text-sm font-semibold text-orange-600">¥5,000</span>
                    </label>

                    <!-- ¥10,000項目（内装系） -->
                </div>
            </div>
        </div>

        <!-- 特殊対応項目 -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-800">特殊対応項目（任意）</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="遮熱・断熱塗料提案可能" class="mr-3">
                    <span class="text-sm">🌡️ 遮熱・断熱塗料提案可能</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="立ち会いなし・見積もり手渡し希望" class="mr-3">
                    <span class="text-sm">👀 立ち会いなし・見積もり手渡し希望</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="遠方につき立ち会いなし・見積もり郵送・電話で商談可" class="mr-3">
                    <span class="text-sm">📮 遠方につき立ち会いなし・見積もり郵送・電話で商談可</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="エクステリア（庭・駐車場・外構）" class="mr-3">
                    <span class="text-sm">🏡 エクステリア（庭・駐車場・外構）</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="太陽光パネル脱着（撤去含む）" class="mr-3">
                    <span class="text-sm">☀️ 太陽光パネル脱着（撤去含む）</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="提携先ローン有り" class="mr-3">
                    <span class="text-sm">🏦 提携先ローン有り</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="クレジットカード払い可" class="mr-3">
                    <span class="text-sm">💳 クレジットカード払い可</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="火災保険申請サポート" class="mr-3">
                    <span class="text-sm">🔥 火災保険申請サポート</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="助成金申請サポート" class="mr-3">
                    <span class="text-sm">💰 助成金申請サポート</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="建築許可証" class="mr-3">
                    <span class="text-sm">🏗 建築許可証</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="光触媒塗料提案可" class="mr-3">
                    <span class="text-sm">✨ 光触媒塗料提案可</span>
                </label>
                <label class="flex items-center p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                    <input type="checkbox" name="specialService" value="分割払いプラン有" class="mr-3">
                    <span class="text-sm">💴 分割払いプラン有</span>
                </label>
            </div>
        </div>

        <div class="flex gap-4 mt-6">
            <button type="button" onclick="goToStep(4)" class="secondary-btn flex-1">
                戻る
            </button>
            <button type="button" onclick="confirmDetailsInfo()" class="primary-btn flex-1">
                詳細確認完了
            </button>
        </div>
    `;

    form.innerHTML = html;

    // 保存データから選択状態を復元
    if (savedData) {
        // 従業員数
        if (savedData.employees) {
            const employeesSelect = document.getElementById('employees');
            if (employeesSelect) employeesSelect.value = savedData.employees;
        }

        // 売上規模
        if (savedData.revenue) {
            const revenueSelect = document.getElementById('revenue');
            if (revenueSelect) revenueSelect.value = savedData.revenue;
        }

        // 対応可能物件種別
        if (savedData.propertyTypes) {
            const types = savedData.propertyTypes.split(',');
            types.forEach(type => {
                const mappings = {
                    '戸建て住宅': 'house',
                    'アパート・マンション': 'apartment',
                    '店舗・事務所': 'commercial',
                    '工場・倉庫': 'factory'
                };
                const value = mappings[type.trim()];
                if (value) {
                    const checkbox = document.querySelector(`input[name="propertyType"][value="${value}"]`);
                    if (checkbox) checkbox.checked = true;
                }
            });
        }

        // 施工箇所
        if (savedData.constructionTypes) {
            const types = savedData.constructionTypes.split(',');
            types.forEach(type => {
                const trimmedType = type.trim();
                const checkbox = document.querySelector(`input[name="construction"][value="${trimmedType}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // 特殊対応項目
        if (savedData.specialServices) {
            const services = savedData.specialServices.split(',');
            services.forEach(service => {
                const trimmedService = service.trim();
                const checkbox = document.querySelector(`input[name="specialService"][value="${trimmedService}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // 築年数対応範囲
        if (savedData.buildingAgeRange) {
            const minAge = document.getElementById('minBuildingAge');
            const maxAge = document.getElementById('maxBuildingAge');
            if (minAge) minAge.value = savedData.buildingAgeRange.min || '';
            if (maxAge) maxAge.value = savedData.buildingAgeRange.max || '';
        }
    }
}

// 請求用と同じボタン
function toggleSameAsBilling() {
    const billingEmail = document.getElementById('billingEmail');
    const salesEmail = document.getElementById('salesEmail');

    if (billingEmail && salesEmail) {
        salesEmail.value = billingEmail.value;
    }
}

// 代表者と同じボタン
function toggleSameAsRepresentative() {
    const salesPersonName = document.getElementById('salesPersonName');
    const salesPersonKana = document.getElementById('salesPersonKana');

    if (window.registrationData.companyInfo) {
        salesPersonName.value = window.registrationData.companyInfo.representative || '';
        salesPersonKana.value = window.registrationData.companyInfo.representativeKana || '';
    }
}


// 大型物件モーダル表示
function showLargePropertyModal() {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('largePropertyModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <!-- 大型物件の紹介料についてのモーダル -->
        <div id="largePropertyModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.5);">
            <!-- モーダル本体 -->
            <div style="position: relative; background-color: white; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); width: 90%; max-width: 42rem; max-height: 90vh; display: flex; flex-direction: column;">
                <!-- 閉じるボタン -->
                <button onclick="closeLargePropertyModal()" style="position: absolute; top: 1rem; right: 1rem; color: #9ca3af; background: transparent; border: none; cursor: pointer; font-size: 1.5rem; line-height: 1; width: 2rem; height: 2rem; z-index: 10; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>

                <!-- ヘッダー -->
                <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 1.5rem 2rem; border-radius: 1rem 1rem 0 0; flex-shrink: 0;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #1f2937; margin: 0; display: flex; align-items: center;">
                        🔊 大型物件の紹介料について
                    </h3>
                </div>

                <!-- コンテンツ -->
                <div style="padding: 1.5rem 2rem; overflow-y: auto; flex: 1;">
                    <!-- 3階以上を選択した場合 -->
                    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #f59e0b; margin-right: 0.5rem; font-size: 1.25rem;">⚠️</span>
                            <div>
                                <h4 style="font-weight: 700; color: #1f2937; margin: 0 0 0.5rem 0; font-size: 1rem;">3階以上を選択した場合</h4>
                                <p style="color: #374151; margin: 0; font-size: 0.875rem;">
                                    基本紹介料が <span style="text-decoration: line-through; color: #6b7280;">¥20,000</span> から <span style="font-weight: 700; color: #16a34a; font-size: 1.125rem;">¥30,000</span> になります
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 3階以上を選択していると -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #f59e0b; margin-right: 0.5rem; font-size: 1.25rem;">⚠️</span>
                            <div>
                                <h4 style="font-weight: 700; color: #1f2937; margin: 0 0 0.5rem 0; font-size: 1rem;">3階以上を選択していると</h4>
                                <p style="color: #374151; margin: 0 0 0.5rem 0; font-size: 0.875rem;">
                                    2階以下でも大型と判断されれば自動で紹介料が<span style="font-weight: 700; color: #dc2626;">¥30,000</span>になります
                                </p>
                                <p style="font-size: 0.75rem; color: #6b7280; margin: 0;">
                                    （3階以上でも見積もり希望箇所が小さい場合、自動的に減額されて自動配信される事がありますが、最終的な金額設定は株式会社外壁塗装くらべる運営本部の判断によるものとし、加盟店はこれに同意するものとします）
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 2階以下を選択していれば -->
                    <div style="background-color: #d1fae5; border-left: 4px solid #16a34a; padding: 1rem; border-radius: 0.5rem;">
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #f59e0b; margin-right: 0.5rem; font-size: 1.25rem;">⚠️</span>
                            <div>
                                <h4 style="font-weight: 700; color: #1f2937; margin: 0 0 0.5rem 0; font-size: 1rem;">2階以下を選択していれば</h4>
                                <p style="color: #374151; margin: 0; font-size: 0.875rem;">
                                    通常の戸建で料金適用となり、<span style="font-weight: 700; color: #16a34a;">¥30,000で自動配信されることはありません</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- フッター -->
                <div style="padding: 1rem 2rem 1.5rem 2rem; flex-shrink: 0;">
                    <button onclick="closeLargePropertyModal()" style="width: 100%; background-color: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 600; font-size: 1rem;">
                        理解しました
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

// 大型物件モーダルを閉じる
function closeLargePropertyModal() {
    const modal = document.getElementById('largePropertyModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
    document.body.style.overflow = '';
}

// チェックボックス選択時の処理（戸建て以外のチェック時は必ずモーダル表示）
function checkLargeProperty(checkbox) {
    // チェックを入れた時のみ判定
    if (!checkbox.checked) {
        return;
    }

    // 物件種別を取得
    const propertyType = checkbox.value;

    // 戸建ては何もしない
    if (propertyType === 'house') {
        return;
    }

    // 戸建て以外（アパート・マンション、店舗・事務所、工場・倉庫）はモーダル表示
    showLargePropertyModal();
}

// 階数選択変更時の処理（何もしない - 階数変更ではモーダルを出さない）
function checkFloorSelection(selectElement) {
    // 何もしない - チェックをつける時だけモーダルを出す
}

// 施工料金更新
function updateConstructionFee() {
    const checked20k = document.querySelectorAll('input[name="constructionTypes"]:checked');
    const checked10k = document.querySelectorAll('input[name="constructionTypes10k"]:checked');
    const checked5k = document.querySelectorAll('input[name="constructionTypes5k"]:checked');
    const total = (checked20k.length * 20000) + (checked10k.length * 10000) + (checked5k.length * 5000);

    const totalElement = document.getElementById('totalConstructionFee');
    if (totalElement) {
        totalElement.textContent = total.toLocaleString();
    }
}

// 単品項目チェックボックスの変更処理
function handleSingleItemChange(checkbox) {
    // チェックされた時のみモーダルを表示
    if (checkbox.checked) {
        showSingleCompanyPriceNotice();
    }
}

// 1社紹介時価格通知
function showSingleCompanyPriceNotice() {
    // 既存の通知があれば削除
    const existingNotice = document.getElementById('singleCompanyNotice');
    if (existingNotice) {
        existingNotice.remove();
    }

    const noticeHtml = `
        <div id="singleCompanyNotice" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.5);">
            <div style="background-color: white; border-radius: 1rem; max-width: 500px; width: 90%; padding: 2rem; position: relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); border: 2px solid #cbd5e0;">
                <button onclick="closeSingleCompanyNotice()" style="position: absolute; top: 1rem; right: 1rem; color: #9ca3af; background: transparent; border: none; cursor: pointer; font-size: 1.5rem; line-height: 1;">×</button>
                <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: #1f2937;">💰 1社紹介時の料金について</h3>
                <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <p style="font-size: 0.875rem; color: #1f2937; margin-bottom: 0.5rem;">単品項目は相見積もり時の料金です。</p>
                    <p style="font-size: 0.875rem; color: #1f2937;"><strong>1社紹介時はすべて¥20,000</strong>となります。</p>
                </div>
                <button onclick="closeSingleCompanyNotice()" style="width: 100%; background: linear-gradient(135deg, #667eea, #4299e1); color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 600; font-size: 1rem;">
                    確認しました
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', noticeHtml);
}

// 1社紹介通知を閉じる
function closeSingleCompanyNotice() {
    const notice = document.getElementById('singleCompanyNotice');
    if (notice) {
        notice.style.display = 'none';
        notice.remove();
    }
}

// 築年数範囲更新
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

// 詳細情報確認完了
function confirmDetailsInfo() {
    // 必須フィールドチェック
    const requiredFields = document.querySelectorAll('#detailsForm [required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    // 物件種別チェック
    const propertyTypes = document.querySelectorAll('input[name="propertyType"]:checked');
    if (propertyTypes.length === 0) {
        isValid = false;
        window.showError('対応可能物件を選択してください');
        return;
    }

    // 施工種別チェック
    const constructionTypes = document.querySelectorAll('input[name="constructionTypes"]:checked, input[name="constructionTypes10k"]:checked');
    if (constructionTypes.length === 0) {
        isValid = false;
        window.showError('施工箇所を選択してください');
        return;
    }

    if (!isValid) {
        window.showError('必須項目を入力してください');
        return;
    }

    // データ保存
    window.registrationData.detailInfo = {
        billingEmail: document.getElementById('billingEmail').value,
        salesEmail: document.getElementById('salesEmail').value,
        salesPersonName: document.getElementById('salesPersonName').value,
        salesPersonKana: document.getElementById('salesPersonKana').value,
        employees: document.getElementById('employees').value,
        revenue: document.getElementById('revenue').value,
        propertyTypes: Array.from(propertyTypes).map(checkbox => {
            const type = checkbox.value;
            let floors = '';
            if (type === 'house') {
                floors = document.getElementById('houseFloors').value;
            } else if (type === 'apartment') {
                floors = document.getElementById('apartmentFloors').value;
            } else if (type === 'commercial') {
                floors = document.getElementById('commercialFloors').value;
            } else if (type === 'factory') {
                floors = document.getElementById('factoryFloors').value;
            }
            return { type, floors };
        }),
        constructionTypes: Array.from(document.querySelectorAll('input[name="constructionTypes"]:checked')).map(checkbox => checkbox.value),
        constructionTypes10k: Array.from(document.querySelectorAll('input[name="constructionTypes10k"]:checked')).map(checkbox => checkbox.value),
        constructionTypes5k: Array.from(document.querySelectorAll('input[name="constructionTypes5k"]:checked')).map(checkbox => checkbox.value),
        specialServices: Array.from(document.querySelectorAll('input[name="specialService"]:checked')).map(checkbox => checkbox.value),
        buildingAge: {
            min: document.getElementById('minBuildingAge').value,
            max: document.getElementById('maxBuildingAge').value
        }
    };

    // Step 6へ
    window.goToStep(6);
    if (window.initializeAreaSelection) {
        window.initializeAreaSelection();
    }
}

// 関数をwindowに公開
window.initializeDetailsForm = initializeDetailsForm;
window.toggleSameAsBilling = toggleSameAsBilling;
window.toggleSameAsRepresentative = toggleSameAsRepresentative;
window.checkLargeProperty = checkLargeProperty;
window.checkFloorSelection = checkFloorSelection;
window.showLargePropertyModal = showLargePropertyModal;
window.closeLargePropertyModal = closeLargePropertyModal;
window.updateConstructionFee = updateConstructionFee;
window.handleSingleItemChange = handleSingleItemChange;
window.showSingleCompanyPriceNotice = showSingleCompanyPriceNotice;
window.closeSingleCompanyNotice = closeSingleCompanyNotice;
window.updateAgeRange = updateAgeRange;
window.confirmDetailsInfo = confirmDetailsInfo;