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
        console.log('[CVListManager] botAnswers詳細:', cv.botAnswers);
        console.log('[CVListManager] q9_wallWorkType:', cv.botAnswers?.q9_wallWorkType);
        console.log('[CVListManager] q10_roofWorkType:', cv.botAnswers?.q10_roofWorkType);
        console.log('[CVListManager] q11_quoteCount:', cv.botAnswers?.q11_quoteCount);
        console.log('[CVListManager] q12_quoteSource:', cv.botAnswers?.q12_quoteSource);
      }

      // CV IDをキーとして使用
      const caseId = cv.cvId || `CV${index + 1}`;

      // 工事内容を配列に変換
      // V1827: 新カラム「見積もり希望箇所」を優先、なければQ9/Q10から変換
      let workItems = [];

      if (cv.workItems && typeof cv.workItems === 'string') {
        // 新カラムから読み取り（カンマ区切り文字列を配列に変換）
        workItems = cv.workItems.split(', ').map(item => item.trim()).filter(item => item);
        if (index === 0) {
          console.log('[CVListManager] 見積もり希望箇所（新カラム）:', workItems);
        }
      } else if (cv.botAnswers && (cv.botAnswers.q9_wallWorkType || cv.botAnswers.q10_roofWorkType)) {
        // 後方互換性: Q9/Q10から変換
        if (cv.botAnswers.q9_wallWorkType) {
          const wallWork = cv.botAnswers.q9_wallWorkType;
          switch (wallWork) {
            case '塗装':
              workItems.push('外壁塗装');
              break;
            case '張替え':
              workItems.push('外壁張替え');
              break;
            case 'カバー工法':
              workItems.push('外壁カバー工法');
              break;
            case '補修':
              workItems.push('外壁補修');
              break;
            case '不明':
              workItems.push('外壁不明');
              break;
            default:
              workItems.push(wallWork);
          }
        }
        if (cv.botAnswers.q10_roofWorkType) {
          const roofWork = cv.botAnswers.q10_roofWorkType;
          switch (roofWork) {
            case '塗装':
              workItems.push('屋根塗装');
              break;
            case '葺き替え':
              const roofMaterial = cv.botAnswers?.q7_roofMaterial || '';
              if (roofMaterial === '瓦') {
                workItems.push('屋根葺き替え（瓦）');
              } else {
                workItems.push('屋根葺き替え（スレート）');
              }
              break;
            case 'カバー工法':
              workItems.push('屋根カバー工法');
              break;
            case '補修':
              workItems.push('屋根補修');
              break;
            case '屋上防水':
              workItems.push('屋上防水');
              break;
            case '不明':
              workItems.push('屋根不明');
              break;
            default:
              workItems.push(roofWork);
          }
        }
        if (index === 0) {
          console.log('[CVListManager] 見積もり希望箇所（Q9/Q10から変換）:', workItems);
        }
      }

      // 紹介料を計算
      // V1832: companiesCount に統一（CVSheetSystem.js と整合）
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
        addressKana: cv.addressKana || '',

        // 工事内容・検索
        searchKeyword: cv.searchKeyword || '',
        workItems: workItems,

        // 見積もり・工事に関するご要望
        quoteSource: cv.botAnswers?.q12_quoteSource || '',           // Q12: 見積もり取得先
        constructionTiming: cv.constructionTiming || '',               // V1827: 施工時期（新カラム）
        quoteStatus: '',                                               // TODO: 他社見積もり状況（BOTで未質問）
        quoteCount: cv.botAnswers?.q11_quoteCount || '',              // Q11: 見積もり保有数
        doorSalesVisit: cv.botAnswers?.q13_doorSalesVisit || '',      // Q13: 訪問業者の状況
        comparisonIntention: cv.botAnswers?.q14_comparisonIntention || '',  // Q14: 比較意向
        doorSalesCompany: cv.botAnswers?.q15_doorSalesCompany || '',  // Q15: 訪問業者名
        deteriorationStatus: cv.botAnswers?.q16_deteriorationStatus || '',   // Q16: 劣化状況
        selectionCriteria: cv.botAnswers?.q17_selectionCriteria || '',       // Q17: 業者選定条件

        // V1827: 新規フィールド
        surveyAttendance: cv.surveyAttendance || '',                   // 立ち会い可否
        attendanceRelation: cv.attendanceRelation || '',               // 立ち会い者関係性
        specialItems: cv.specialItems ? cv.specialItems.split(', ').map(item => item.trim()).filter(item => item) : [], // 特殊項目（配列）

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
        caseMemo: this.buildCaseMemo(cv),

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
   * 案件メモを構築（既存メモ + BOTデータ自動追記）
   * V1832: 毎回上書き - 既存のBOT取得情報を削除して最新情報で置き換え
   * @param {Object} cv - CVデータ
   * @returns {string} 案件メモ
   */
  buildCaseMemo(cv) {
    const memoLines = [];

    // 既存の案件メモがある場合、BOT取得情報の前までを抽出
    if (cv.caseMemo) {
      const botInfoIndex = cv.caseMemo.indexOf('─────────────────────');
      if (botInfoIndex !== -1) {
        // BOT取得情報の前までを保持（手動で書いたメモ部分）
        const manualMemo = cv.caseMemo.substring(0, botInfoIndex).trim();
        if (manualMemo) {
          memoLines.push(manualMemo);
        }
      } else {
        // BOT取得情報がない場合は全体を保持
        memoLines.push(cv.caseMemo);
      }
    }

    // BOTデータの自動追記部分（毎回上書き）
    const botDataLines = [];

    // 訪問業者名（Q15）
    if (cv.botAnswers?.q15_doorSalesCompany) {
      botDataLines.push(`【訪問業者名】${cv.botAnswers.q15_doorSalesCompany}`);
    }

    // 業者選定条件（Q17）
    if (cv.botAnswers?.q17_selectionCriteria) {
      botDataLines.push(`【業者選定条件】${cv.botAnswers.q17_selectionCriteria}`);
    }

    // BOTデータがあれば区切り線と共に追加（毎回新しく生成）
    if (botDataLines.length > 0) {
      if (memoLines.length > 0) {
        memoLines.push(''); // 空行
        memoLines.push('─────────────────────');
        memoLines.push('【BOT取得情報】');
      }
      memoLines.push(...botDataLines);
    }

    return memoLines.join('\n');
  },

  /**
   * デバッグ：実際のスプレッドシート構造を確認
   */
  async debugSpreadsheetStructure() {
    try {
      console.log('[CVListManager] スプレッドシート構造デバッグ開始...');

      const response = await window.apiClient.getRequest('debugSpreadsheetStructure');

      if (!response || !response.success) {
        throw new Error(response?.error || 'デバッグ失敗');
      }

      console.log('========================================');
      console.log('[CVListManager] スプレッドシート構造デバッグ結果');
      console.log('========================================');
      console.log('総列数:', response.totalColumns);
      console.log('');
      console.log('【V, W, X, Y列の情報】');
      console.log('V列（index 21）:', response.vwxyColumns.V.header, '=', response.vwxyColumns.V.value);
      console.log('W列（index 22）:', response.vwxyColumns.W.header, '=', response.vwxyColumns.W.value);
      console.log('X列（index 23）:', response.vwxyColumns.X.header, '=', response.vwxyColumns.X.value);
      console.log('Y列（index 24）:', response.vwxyColumns.Y.header, '=', response.vwxyColumns.Y.value);
      console.log('');
      console.log('【全ヘッダー】');
      response.headers.forEach((header, index) => {
        console.log(`[${index}] ${header}`);
      });
      console.log('========================================');

      return response;

    } catch (error) {
      console.error('[CVListManager] デバッグエラー:', error);
      throw error;
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
