/**
 * ============================================
 * 紹介料自動計算ロジック
 * ============================================
 *
 * 希望工事内容と物件種別・階数から紹介料を自動計算
 */

const FeeCalculator = {
  /**
   * 基本項目（20,000円）
   */
  basicItems: [
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
    '内装（フローリングや畳などの床・クロス等）（外壁工事含む）',
    '外壁雨漏り修繕（外壁工事含む）',
    '屋根雨漏り修繕（屋根工事含む）'
  ],

  /**
   * 単品項目（相見積もり時の料金設定）
   */
  singleItems: {
    '屋根塗装単品': { multi: 10000, single: 20000 },
    '屋上防水単品': { multi: 10000, single: 20000 },
    '外壁補修単品': { multi: 5000, single: 20000 },
    '屋根補修単品': { multi: 5000, single: 20000 },
    'ベランダ防水単品': { multi: 5000, single: 20000 },
    '外壁雨漏り修繕単品': { multi: 5000, single: 20000 },
    '屋根雨漏り修繕単品': { multi: 5000, single: 20000 }
  },

  /**
   * 特別料金対象物件（3階以上）
   */
  specialPropertyTypes: [
    'アパート・マンション',
    '店舗・事務所',
    '工場・倉庫'
  ],

  /**
   * 紹介料を計算
   * @param {Object} cvData - CV案件データ
   * @param {string} cvData.q9_wallWorkType - Q9_希望工事内容_外壁
   * @param {string} cvData.q10_roofWorkType - Q10_希望工事内容_屋根
   * @param {string} cvData.propertyType - 物件種別
   * @param {string} cvData.floors - 階数
   * @param {number} companiesCount - 配信先加盟店数（1社 or 複数）
   * @returns {number} 紹介料（円）
   */
  calculate(cvData, companiesCount = 1) {
    try {
      // 工事内容を取得
      const workItems = this.getWorkItems(cvData);

      if (!workItems || workItems.length === 0) {
        console.warn('[FeeCalculator] 工事内容が未設定');
        return 0;
      }

      // 各工事内容の料金を計算
      const fees = workItems.map(item => {
        return this.calculateItemFee(item, companiesCount, cvData.propertyType, cvData.floors);
      });

      // 最高額を適用（足し算ではない）
      const maxFee = Math.max(...fees);

      console.log('[FeeCalculator] 計算結果:', {
        workItems,
        fees,
        maxFee,
        companiesCount,
        propertyType: cvData.propertyType,
        floors: cvData.floors
      });

      return maxFee;

    } catch (error) {
      console.error('[FeeCalculator] 計算エラー:', error);
      return 0;
    }
  },

  /**
   * V1931: workItems配列から直接計算（BZ列対応）
   * @param {Array<string>} workItems - 工事内容配列（例: ['外壁塗装', '屋根塗装']）
   * @param {number} companiesCount - 配信先加盟店数
   * @param {string} propertyType - 物件種別
   * @param {string} floors - 階数
   * @returns {number} 紹介料（円）
   */
  calculateFromWorkItems(workItems, companiesCount = 1, propertyType = '', floors = '') {
    try {
      if (!workItems || workItems.length === 0) {
        console.warn('[FeeCalculator] 工事内容が未設定');
        return 0;
      }

      // 各工事内容の料金を計算
      const fees = workItems.map(item => {
        return this.calculateItemFee(item, companiesCount, propertyType, floors);
      });

      // 最高額を適用（足し算ではない）
      const maxFee = Math.max(...fees, 0);

      console.log('[FeeCalculator] 計算結果:', {
        workItems,
        fees,
        maxFee,
        companiesCount,
        propertyType,
        floors
      });

      return maxFee;

    } catch (error) {
      console.error('[FeeCalculator] 計算エラー:', error);
      return 0;
    }
  },

  /**
   * CV案件データから工事内容リストを取得
   * @param {Object} cvData - CV案件データ
   * @returns {Array<string>} 工事内容リスト
   */
  getWorkItems(cvData) {
    const items = [];

    // Q9（外壁）とQ10（屋根）を取得
    const wallWork = cvData.q9_wallWorkType || '';
    const roofWork = cvData.q10_roofWorkType || '';

    if (wallWork) items.push(wallWork);
    if (roofWork) items.push(roofWork);

    return items;
  },

  /**
   * V1930: 短い工事名をフルネームに正規化
   * q9/q10の値（「塗装」「補修」等）を正式名称に変換
   */
  normalizeWorkItem(item) {
    if (!item) return '';

    // 既にフルネームならそのまま返す
    if (this.basicItems.includes(item) || this.singleItems[item]) {
      return item;
    }

    // 短い名前→フルネームのマッピング
    const wallMappings = {
      '塗装': '外壁塗装',
      '張替え': '外壁張替え',
      'カバー工法': '外壁カバー工法',
      '補修': '外壁補修（外壁工事含む）',
      '不明': '外壁塗装'  // 不明は外壁塗装扱い
    };

    const roofMappings = {
      '塗装': '屋根塗装（外壁工事含む）',
      '葺き替え': '屋根葺き替え・張り替え※スレート・ガルバリウム等',
      'カバー工法': '屋根カバー工法',
      '補修': '屋根補修（外壁工事含む）',
      '防水': '屋上防水（外壁工事含む）',
      '不明': '屋根塗装（外壁工事含む）'  // 不明は屋根塗装扱い
    };

    // itemが「外壁」を含むか「屋根」を含むかで判断
    if (item.includes('外壁')) {
      // 既に外壁が含まれているならbasicItemsから部分一致検索
      const found = this.basicItems.find(bi => bi.includes(item) || item.includes(bi.replace(/（.*）/, '')));
      return found || item;
    }
    if (item.includes('屋根') || item.includes('屋上')) {
      const found = this.basicItems.find(bi => bi.includes(item) || item.includes(bi.replace(/（.*）/, '')));
      return found || item;
    }

    // 短い名前の場合（外壁系として扱う、ただし後で屋根用にも使う）
    return wallMappings[item] || item;
  },

  /**
   * 個別工事内容の料金を計算
   * @param {string} item - 工事内容
   * @param {number} companiesCount - 配信先加盟店数
   * @param {string} propertyType - 物件種別
   * @param {string} floors - 階数
   * @returns {number} 料金（円）
   */
  calculateItemFee(item, companiesCount, propertyType, floors) {
    // V1930: 短い名前を正規化
    const normalizedItem = this.normalizeWorkItem(item);

    // 基本項目かチェック
    if (this.basicItems.includes(normalizedItem)) {
      return this.calculateBasicFee(propertyType, floors);
    }

    // 単品項目かチェック
    if (this.singleItems[normalizedItem]) {
      const pricing = this.singleItems[normalizedItem];
      return companiesCount === 1 ? pricing.single : pricing.multi;
    }

    // V1930: 部分一致でも基本項目として扱う（外壁塗装、屋根塗装等）
    const isWallWork = item.includes('外壁') || item.includes('塗装') || item.includes('張替') || item.includes('カバー');
    const isRoofWork = item.includes('屋根') || item.includes('葺き替え') || item.includes('防水');
    if (isWallWork || isRoofWork) {
      return this.calculateBasicFee(propertyType, floors);
    }

    // 不明な項目
    console.warn('[FeeCalculator] 不明な工事内容:', item, '→', normalizedItem);
    return 0;
  },

  /**
   * 基本項目の料金を計算
   * @param {string} propertyType - 物件種別
   * @param {string} floors - 階数
   * @returns {number} 料金（円）
   */
  calculateBasicFee(propertyType, floors) {
    // 3階以上かチェック
    const isHighFloor = this.isHighFloor(floors);

    // V1954: 実際のスプレッドシート値に基づく戸建て判定
    // 戸建て扱い: "2階建て以外の自宅", "実家・別荘・所有物件"
    const isDetachedHouse = propertyType && (
      propertyType.includes('自宅') ||
      propertyType.includes('実家') ||
      propertyType.includes('別荘') ||
      propertyType.includes('所有物件')
    );

    // 戸建て以外 かつ 3階以上 → 30,000円
    if (!isDetachedHouse && isHighFloor) {
      return 30000;
    }

    // 基本料金 20,000円
    return 20000;
  },

  /**
   * 3階以上かどうかを判定
   * @param {string} floors - 階数（例: "3階建て", "10階以上まで"）
   * @returns {boolean} 3階以上ならtrue
   */
  isHighFloor(floors) {
    if (!floors) return false;

    // 数値を抽出
    const match = floors.match(/(\d+)/);
    if (!match) return false;

    const floorNumber = parseInt(match[1], 10);
    return floorNumber >= 3;
  },

  /**
   * 料金を表示用フォーマットに変換
   * @param {number} fee - 料金（円）
   * @returns {string} フォーマット済み料金（例: "¥20,000"）
   */
  formatFee(fee) {
    if (fee === 0) return '¥0';
    return '¥' + fee.toLocaleString('ja-JP');
  }
};

// グローバルに公開
if (typeof window !== 'undefined') {
  window.FeeCalculator = FeeCalculator;
}
