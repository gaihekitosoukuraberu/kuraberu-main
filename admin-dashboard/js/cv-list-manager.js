/**
 * ============================================
 * CV一覧取得・表示マネージャー
 * ============================================
 *
 * GASからCV情報を取得してフロント側のcasesDataにマッピング
 */

const CVListManager = {
  /**
   * 初期化フラグ
   */
  initialized: false,

  /**
   * CV一覧データ（キャッシュ）
   */
  cvListCache: null,

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) {
      console.log('[CVListManager] 既に初期化済み');
      return true;
    }

    if (!window.apiClient) {
      console.error('[CVListManager] ApiClient未初期化');
      return false;
    }

    if (!window.FeeCalculator) {
      console.error('[CVListManager] FeeCalculator未初期化');
      return false;
    }

    this.initialized = true;
    console.log('[CVListManager] 初期化完了');
    return true;
  },

  /**
   * CV一覧を取得（GAS経由）
   * @returns {Promise<Array>} CV一覧
   */
  async fetchCVList() {
    try {
      if (!this.init()) {
        throw new Error('CVListManager初期化失敗');
      }

      console.log('[CVListManager] CV一覧取得開始...');

      // GASに問い合わせ
      const response = await window.apiClient.getRequest('getCVList');

      if (!response || !response.success) {
        throw new Error(response?.error || 'CV一覧取得失敗');
      }

      const cvList = response.data || [];
      console.log('[CVListManager] CV一覧取得成功:', cvList.length, '件');

      // キャッシュに保存
      this.cvListCache = cvList;

      return cvList;

    } catch (error) {
      console.error('[CVListManager] CV一覧取得エラー:', error);
      throw error;
    }
  },

  /**
   * CV一覧をcasesData形式に変換
   * @param {Array} cvList - CV一覧
   * @returns {Object} casesData形式のオブジェクト
   */
  convertToCasesData(cvList) {
    const casesData = {};

    cvList.forEach((cv, index) => {
      // デバッグ：最初の1件のみデータ構造をログ出力
      if (index === 0) {
        console.log('[CVListManager] GASから返ってきたcvオブジェクトの構造:', cv);
        console.log('[CVListManager] 利用可能なキー一覧:', Object.keys(cv));
      }

      // CV IDをキーとして使用
      const caseId = cv.cvId || `CV${index + 1}`;

      // 工事内容を配列に変換
      const workItems = [];
      if (cv.botAnswers && cv.botAnswers.q9_wallWorkType) {
        workItems.push(cv.botAnswers.q9_wallWorkType);
      }
      if (cv.botAnswers && cv.botAnswers.q10_roofWorkType) {
        workItems.push(cv.botAnswers.q10_roofWorkType);
      }

      // 紹介料を計算
      const companiesCount = cv.companiesCount || 1;
      const calculatedFee = window.FeeCalculator.calculate({
        q9_wallWorkType: cv.botAnswers?.q9_wallWorkType || '',
        q10_roofWorkType: cv.botAnswers?.q10_roofWorkType || '',
        propertyType: cv.propertyType || '',
        floors: cv.floors || ''
      }, companiesCount);

      // casesData形式に変換
      casesData[caseId] = {
        // 基本情報（GASから返されるフィールド名を使用）
        name: cv.name || '',
        nameKana: cv.nameKana || '',
        gender: cv.gender || '',
        age: cv.age || '',
        relation: cv.relation || '',
        phone: cv.phone || '',
        email: cv.email || '',

        // 物件情報（GASから返されるフィールド名を使用）
        propertyType: cv.propertyType || '',        // V列: 物件種別
        floors: cv.floors || '',                    // Y列: 階数
        buildingAge: cv.buildingAge || '',          // W列: 築年数
        area: cv.area || '',                        // X列: 建物面積
        floorArea: cv.area || '',                   // X列: 建物面積

        // 工事詳細（botAnswersオブジェクトから取得）
        constructionCount: cv.botAnswers?.q4_constructionHistory || '',        // AC: Q4_工事歴
        previousConstructionTime: cv.botAnswers?.q5_lastConstructionTime || '', // AD: Q5_前回施工時期
        wallMaterial: cv.botAnswers?.q6_wallMaterial || '',                    // AE: Q6_外壁材質
        roofMaterial: cv.botAnswers?.q7_roofMaterial || '',                    // AF: Q7_屋根材質

        // 住所（GASから返されるフィールド名を使用）
        postalCode: cv.postalCode || '',
        address: this.formatAddress(cv),

        // 工事内容・検索
        searchKeyword: cv.searchKeyword || '',
        workItems: workItems,

        // 配信・成約
        companiesCount: companiesCount,
        status: cv.status || '新規',
        deliveryStatus: cv.deliveryStatus || '未配信',
        date: this.parseDate(cv.registeredAt),
        amount: window.FeeCalculator.formatFee(calculatedFee),
        franchiseStatuses: this.parseFranchiseStatuses(cv.franchiseStatuses),

        // 架電履歴
        callHistory: this.parseCallHistory(cv.callHistory),
        nextCallDate: cv.nextCallDate || '',
        lastCallDate: cv.lastCallDate || '',

        // メモ・その他
        memo: cv.memo || '',
        caseMemo: cv.caseMemo || '',

        // 元データを保持（詳細表示用）
        _rawData: cv
      };
    });

    console.log('[CVListManager] casesData変換完了:', Object.keys(casesData).length, '件');
    return casesData;
  },

  /**
   * 住所をフォーマット
   * @param {Object} cv - CVデータ
   * @returns {string} フォーマット済み住所
   */
  formatAddress(cv) {
    const parts = [];

    if (cv.prefecture) parts.push(cv.prefecture);
    if (cv.city) parts.push(cv.city);
    if (cv.propertyStreet) parts.push(cv.propertyStreet);

    return parts.join('');
  },

  /**
   * 日付文字列をDateオブジェクトに変換
   * @param {string} dateStr - 日付文字列
   * @returns {Date} Dateオブジェクト
   */
  parseDate(dateStr) {
    if (!dateStr) return new Date();

    try {
      return new Date(dateStr);
    } catch (error) {
      console.warn('[CVListManager] 日付パース失敗:', dateStr);
      return new Date();
    }
  },

  /**
   * 加盟店別ステータスをパース（JSON文字列 → オブジェクト）
   * @param {string} franchiseStatusesStr - JSON文字列
   * @returns {Object} 加盟店別ステータスオブジェクト
   */
  parseFranchiseStatuses(franchiseStatusesStr) {
    if (!franchiseStatusesStr) return {};

    try {
      return JSON.parse(franchiseStatusesStr);
    } catch (error) {
      console.warn('[CVListManager] 加盟店別ステータスパース失敗:', franchiseStatusesStr);
      return {};
    }
  },

  /**
   * 架電履歴をパース（改行区切り → 配列）
   * @param {string} callHistoryStr - 架電履歴文字列
   * @returns {Array} 架電履歴配列
   */
  parseCallHistory(callHistoryStr) {
    if (!callHistoryStr) return [];

    try {
      // 改行で分割
      const lines = callHistoryStr.split('\n').filter(line => line.trim());

      return lines.map(line => {
        // "2025-01-10 10:30: 初回架電、不在。" のような形式を想定
        const match = line.match(/^([\d-]+\s+[\d:]+):\s*(.+)$/);

        if (match) {
          return {
            date: match[1],
            note: match[2]
          };
        }

        // フォーマットが異なる場合はそのまま
        return {
          date: '',
          note: line
        };
      });
    } catch (error) {
      console.warn('[CVListManager] 架電履歴パース失敗:', callHistoryStr);
      return [];
    }
  },

  /**
   * CV一覧を取得してcasesDataに反映
   * @returns {Promise<Object>} casesData
   */
  async loadAndConvert() {
    try {
      // CV一覧を取得
      const cvList = await this.fetchCVList();

      // casesData形式に変換
      const casesData = this.convertToCasesData(cvList);

      return casesData;

    } catch (error) {
      console.error('[CVListManager] ロード＆変換エラー:', error);
      throw error;
    }
  },

  /**
   * 通知表示
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
};

// グローバルに公開
if (typeof window !== 'undefined') {
  window.CVListManager = CVListManager;
}
