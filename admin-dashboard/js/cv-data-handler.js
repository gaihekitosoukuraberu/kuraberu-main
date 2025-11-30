/**
 * ============================================
 * CVデータ送信ハンドラー
 * ============================================
 *
 * 目的: admin-dashboardからGASにCVデータを送信
 * 依存: ApiClient（api-client.js）
 *
 * CRMで入力されたデータをGoogle Sheetsに保存します
 */

const CVDataHandler = {

  /**
   * 初期化
   */
  init() {
    if (!window.apiClient) {
      console.error('[CVDataHandler] ApiClient未初期化');
      return false;
    }
    console.log('[CVDataHandler] 初期化完了');
    return true;
  },

  /**
   * CRMフォームからデータ収集
   * @param {string} caseId - 案件ID
   * @returns {Object} CV登録用データ
   */
  collectFormData(caseId) {
    try {
      const crmContent = document.getElementById('crmContent');
      if (!crmContent) {
        throw new Error('CRMコンテンツが見つかりません');
      }

      // 基本個人情報（1人目）
      const name = crmContent.querySelector('input[type="text"]')?.value || '';
      const nameKana = crmContent.querySelectorAll('input[type="text"]')[1]?.value || '';
      const phone = crmContent.querySelector('input[type="tel"]')?.value || '';
      const email = crmContent.querySelector('input[type="email"]')?.value || '';

      // セレクトボックス（性別、年齢、続柄）
      const gender = this.getSelectValue('性別');
      const age = this.getSelectValue('年齢');
      const relation = this.getSelectValue('関係性');

      // 2人目の情報（表示されている場合のみ）
      let name2 = '';
      let phone2 = '';
      let relationship2 = '';
      let memo2 = '';

      const secondPersonSection = document.getElementById('secondPersonSection');
      if (secondPersonSection && !secondPersonSection.classList.contains('hidden')) {
        name2 = document.getElementById('name2Input')?.value || '';
        phone2 = document.getElementById('phone2Input')?.value || '';
        relationship2 = document.getElementById('relationship2Input')?.value || '';
        memo2 = document.getElementById('memo2Input')?.value || '';
      }

      // 物件情報
      const propertyType = this.getSelectValue('依頼物件種別');
      const floors = this.getSelectValue('階数');
      const buildingAge = this.getInputValue('築年数');
      const lastConstructionTime = this.getInputValue('前回施工時期');

      // 郵便番号・住所（物件）
      const postalCode = crmContent.querySelector('input[placeholder*="150-"], input[placeholder*="160-"], input[placeholder*="140-"]')?.value || '';
      const address = crmContent.querySelector('input[placeholder*="東京都"], input[placeholder*="渋谷区"]')?.value || '';

      // 別住所（表示されている場合のみ）- 2つまで対応、スプシはTUV列にカンマ区切りで保存
      let homeZip = '';
      let homePref = '';
      let homeAddress = '';
      let homeAddressFlag = '';
      let quoteDestination = '';

      const homeAddressSection = document.getElementById('homeAddressSection');
      if (homeAddressSection && !homeAddressSection.classList.contains('hidden')) {
        // 見積もり送付先
        quoteDestination = document.getElementById('quoteDestinationSelect')?.value || '';

        // 別住所1
        const zip1 = document.getElementById('homeZipInput')?.value || '';
        const pref1 = document.getElementById('homePrefInput')?.value || '';
        const addr1 = document.getElementById('homeAddressInput')?.value || '';

        // 別住所2
        const zip2 = document.getElementById('homeZipInput2')?.value || '';
        const pref2 = document.getElementById('homePrefInput2')?.value || '';
        const addr2 = document.getElementById('homeAddressInput2')?.value || '';

        // カンマ区切りで保存（空の場合は省略）
        const zips = [zip1, zip2].filter(v => v);
        const prefs = [pref1, pref2].filter(v => v);
        const addrs = [addr1, addr2].filter(v => v);

        homeZip = zips.join(', ');
        homePref = prefs.join(', ');
        homeAddress = addrs.join(', ');

        if (homeZip || homePref || homeAddress) {
          homeAddressFlag = '有';
        }
      }

      // 施工回数・材質
      const constructionCount = this.getSelectValue('施工回数');
      const wallMaterial = this.getSelectValue('外壁材質');
      const roofMaterial = this.getSelectValue('屋根材質');

      // 見積もり希望箇所（選択されたボタン）
      const workItems = [];
      crmContent.querySelectorAll('.option-button.selected').forEach(btn => {
        workItems.push(btn.textContent.trim());
      });

      // 流入検索ワード
      const keyword = crmContent.querySelector('input[placeholder*="外壁塗装"]')?.value || '';

      // 連絡希望時間帯
      const contactTimePreference = document.getElementById('contactTimeInput')?.value || '';

      return {
        // 基本情報
        name,
        nameKana,
        gender,
        age,
        phone,
        email,
        relation,

        // 2人目
        name2,
        phone2,
        relationship2,
        memo2,

        // 物件住所
        postalCode,
        address,

        // 別住所・見積もり送付先
        homeAddressFlag,
        homeZip,
        homePref,
        homeAddress,
        quoteDestination,

        // 物件詳細
        propertyType,
        floors,
        buildingAge,
        lastConstructionTime,

        // 質問回答
        q1_workItems: workItems.join(', '),
        q2_constructionCount: constructionCount,
        q3_wallMaterial: wallMaterial,
        q4_roofMaterial: roofMaterial,

        // 流入情報
        keyword,

        // 連絡時間帯
        contactTimePreference,

        // メタ情報
        caseId: caseId,
        registeredAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[CVDataHandler] データ収集エラー:', error);
      return null;
    }
  },

  /**
   * セレクトボックスの値を取得
   */
  getSelectValue(labelText) {
    const labels = document.querySelectorAll('label');
    for (let label of labels) {
      if (label.textContent.includes(labelText)) {
        const select = label.parentElement?.querySelector('select');
        if (select) {
          return select.options[select.selectedIndex]?.text || '';
        }
        break;
      }
    }
    return '';
  },

  /**
   * 入力フィールドの値を取得
   */
  getInputValue(labelText) {
    const labels = document.querySelectorAll('label');
    for (let label of labels) {
      if (label.textContent.includes(labelText)) {
        const input = label.parentElement?.querySelector('input[type="text"]');
        if (input) {
          return input.value || '';
        }
        break;
      }
    }
    return '';
  },

  /**
   * CVデータをGASに送信
   * @param {string} caseId - 案件ID
   * @returns {Promise<Object>} 送信結果
   */
  async saveToCVSheet(caseId) {
    try {
      if (!this.init()) {
        throw new Error('CVDataHandler初期化失敗');
      }

      // フォームデータ収集
      const formData = this.collectFormData(caseId);
      if (!formData) {
        throw new Error('フォームデータ収集失敗');
      }

      console.log('[CVDataHandler] 送信データ:', formData);

      // GASにPOST送信
      const response = await window.apiClient.postRequest('cv_add_user', formData);

      if (response.success) {
        console.log('[CVDataHandler] CV登録成功:', response.cvId);

        // 成功通知
        this.showNotification('✅ CVデータをスプレッドシートに保存しました', 'success');

        return {
          success: true,
          cvId: response.cvId
        };
      } else {
        throw new Error(response.error || 'CV登録失敗');
      }

    } catch (error) {
      console.error('[CVDataHandler] 送信エラー:', error);
      this.showNotification('❌ CVデータ保存に失敗しました', 'error');
      return {
        success: false,
        error: error.message
      };
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

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.CVDataHandler = CVDataHandler;
}
