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
        // V1903: 新カラムから読み取り（「、」日本語読点区切り文字列を配列に変換）
        // GASは「外壁張替え、屋根葺き替え（スレート）」のように「、」で区切って返す
        workItems = cv.workItems.split('、').map(item => item.trim()).filter(item => item);
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
      // V1927: companiesCountPreference（CB列・希望社数）を優先使用
      // V1928: 数値でも文字列でも対応（スプシは数字のみで保存）
      let desiredCompanyCount = 1;
      const preferenceValue = cv.companiesCountPreference;
      if (preferenceValue !== undefined && preferenceValue !== null && preferenceValue !== '') {
        // 数値の場合はそのまま使用、文字列の場合は数字を抽出
        if (typeof preferenceValue === 'number') {
          desiredCompanyCount = preferenceValue;
        } else {
          const preferenceStr = String(preferenceValue);
          const match = preferenceStr.match(/(\d+)/);
          if (match) {
            desiredCompanyCount = parseInt(match[1], 10);
          }
        }
      }
      // フォールバック: companiesCountPreferenceがない場合はcompaniesCountを使用
      if (desiredCompanyCount <= 0) {
        desiredCompanyCount = cv.companiesCount || 1;
      }

      const calculatedFee = window.FeeCalculator.calculate({
        q9_wallWorkType: cv.botAnswers?.q9_wallWorkType || '',
        q10_roofWorkType: cv.botAnswers?.q10_roofWorkType || '',
        propertyType: cv.propertyType || '',
        floors: cv.floors || ''
      }, desiredCompanyCount);

      // V1927: 合計紹介料 = 1社あたり紹介料 × 希望社数
      const totalFee = calculatedFee * desiredCompanyCount;
      const formattedAmount = this.formatCompactFee(totalFee);

      // V1929: デバッグログ（最初の5件のみ）
      if (index < 5) {
        console.log(`[FeeDebug] ${cv.name}:`, {
          companiesCountPreference: cv.companiesCountPreference,
          preferenceValue: preferenceValue,
          desiredCompanyCount: desiredCompanyCount,
          q9: cv.botAnswers?.q9_wallWorkType,
          q10: cv.botAnswers?.q10_roofWorkType,
          calculatedFee: calculatedFee,
          totalFee: totalFee
        });
      }

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
        prefecture: cv.prefecture || '',        // V1963: 距離計算用に都道府県を追加
        city: cv.city || '',                    // V1963: 距離計算用に市区町村を追加
        propertyStreet: cv.propertyStreet || '', // V1963: 距離計算用に住所詳細を追加
        address: this.formatAddress(cv),
        addressKana: cv.addressKana || '',

        // 工事内容・検索
        searchKeyword: cv.searchKeyword || '',
        workItems: workItems,

        // 見積もり・工事に関するご要望（V1832: ?? 演算子で空文字列も保持）
        quoteSource: cv.quoteSource ?? cv.botAnswers?.q12_quoteSource ?? '',           // Q12: 見積もり取得先
        constructionTiming: cv.constructionTiming ?? '',               // V1827: 施工時期（新カラム）
        quoteStatus: '',                                               // TODO: 他社見積もり状況（BOTで未質問）
        quoteCount: cv.quoteCount ?? cv.botAnswers?.q11_quoteCount ?? '',              // Q11: 見積もり保有数
        doorSalesVisit: cv.doorSalesVisit ?? cv.botAnswers?.q13_doorSalesVisit ?? '',      // Q13: 訪問業者の状況
        comparisonIntention: cv.comparisonIntention ?? cv.botAnswers?.q14_comparisonIntention ?? '',  // Q14: 比較意向
        doorSalesCompany: cv.doorSalesCompany ?? cv.botAnswers?.q15_doorSalesCompany ?? '',  // Q15: 訪問業者名
        deteriorationStatus: cv.deteriorationStatus ?? cv.botAnswers?.q16_deteriorationStatus ?? '',   // Q16: 劣化状況
        selectionCriteria: cv.selectionCriteria ?? cv.botAnswers?.q17_selectionCriteria ?? '',       // Q17: 業者選定条件

        // V1827: 新規フィールド（V1832: ?? 演算子で空文字列も保持）
        surveyAttendance: cv.surveyAttendance ?? '',                   // 立ち会い可否
        attendanceRelation: cv.attendanceRelation ?? '',               // 立ち会い者関係性
        specialItems: cv.specialItems ? cv.specialItems.split('、').map(item => item.trim()).filter(item => item) : [], // V1903: 特殊項目（「、」区切り配列）

        // 配信・成約
        companiesCount: desiredCompanyCount,  // V1927: 希望社数を使用
        status: cv.status || '新規',
        deliveryStatus: cv.deliveryStatus || '未配信',
        date: this.parseDate(cv.registeredAt),
        amount: formattedAmount,
        franchiseStatuses: this.parseFranchiseStatuses(cv.franchiseStatuses),

        // 業者選定履歴（AS列）V1879
        businessHistory: cv.franchiseSelectionHistory || '',
        franchiseSelectionHistory: cv.franchiseSelectionHistory || '', // V1903: 別名キーも追加

        // V1903: 現調希望日時・希望社数（CRM詳細バインディング用）
        surveyDatePreference: cv.surveyDatePreference || '',           // AR列: 現調希望日時
        companiesCountPreference: cv.companiesCountPreference || '',   // CB列: 希望社数

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
   * 紹介料をコンパクト表記に変換
   * V1952: ¥60,000 → ¥60K のように表示
   * @param {number} fee - 紹介料（円）
   * @returns {string} コンパクト表記（例: "¥60K", "¥15K"）
   */
  formatCompactFee(fee) {
    if (fee === 0) return '¥0';

    // 千円単位に変換
    if (fee >= 1000) {
      const kValue = fee / 1000;
      // 整数の場合は小数点なし、小数の場合は小数点1桁まで表示
      const formattedK = kValue % 1 === 0 ? kValue : kValue.toFixed(1);
      return `¥${formattedK}K`;
    }

    // 1000円未満の場合はそのまま表示
    return `¥${fee}`;
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
      // Check if it's JSON format (new format from V1893+)
      const trimmed = callHistoryStr.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(callHistoryStr);
        // Ensure it's an array
        const array = Array.isArray(parsed) ? parsed : [parsed];
        return array.map(item => ({
          date: item.date || item.timestamp || '',
          note: item.note || '',
          nextCallDate: item.nextCallDate || ''
        }));
      }

      // Legacy format: newline-delimited text
      const lines = callHistoryStr.split('\n').filter(line => line.trim());

      return lines.map(line => {
        // "2025-01-10 10:30: 初回架電、不在。" のような形式を想定
        const match = line.match(/^([\d-]+\s+[\d:]+):\s*(.+)$/);

        if (match) {
          return {
            date: match[1],
            note: match[2],
            nextCallDate: ''
          };
        }

        // フォーマットが異なる場合はそのまま
        return {
          date: '',
          note: line,
          nextCallDate: ''
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
