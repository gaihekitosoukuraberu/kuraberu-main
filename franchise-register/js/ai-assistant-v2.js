/**
 * ====================================
 * AI検索機能 v2
 * ====================================
 * 統一APIクライアント使用版
 */

class AIAssistantV2 {
  constructor() {
    // APIクライアント初期化
    if (!window.ApiClient) {
      throw new Error('ApiClient not loaded. api-client.jsを先に読み込んでください');
    }

    this.api = new ApiClient();
    this.isSearching = false;
    this.lastSearchedName = '';

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    // Step 1の会社名入力フィールド（バックグラウンド検索用）
    const companyNameField = document.getElementById('companyName');
    if (companyNameField) {
      // Enterキーで「次へ進む」ボタンをトリガー（検索は自動実行）
      companyNameField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const button = document.querySelector('button[onclick="proceedToConsent()"]');
          if (button) {
            button.click();
          }
        }
      });
    }

    // Step 4の会社名入力フィールド（手動検索用）
    const legalNameField = document.getElementById('legalName');
    if (legalNameField) {
      legalNameField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const companyName = e.target.value.trim();
          if (companyName) {
            this.searchCompany(companyName);
          }
        }
      });
    }

    // Step 4表示時にlocalStorageから自動読み込み
    this.observeStep4();

    console.log('[AIAssistantV2] 初期化完了');
  }

  /**
   * Step 4の表示を監視して自動的にデータを読み込む
   */
  observeStep4() {
    const step4Element = document.getElementById('step4');
    if (!step4Element) {
      console.warn('[AIAssistantV2] Step 4要素が見つかりません');
      return;
    }

    // MutationObserverでStep 4の表示を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isActive = step4Element.classList.contains('active');
          if (isActive) {
            console.log('[AIAssistantV2] 📋 Step 4表示検出 - データ自動読み込み開始');
            this.autoLoadDataToStep4();
          }
        }
      });
    });

    observer.observe(step4Element, { attributes: true });
    console.log('[AIAssistantV2] Step 4監視開始');
  }

  /**
   * localStorageからデータを読み込んでStep 4に自動入力
   */
  autoLoadDataToStep4() {
    try {
      const savedData = localStorage.getItem('aiSearchData');
      if (!savedData) {
        console.log('[AIAssistantV2] localStorageにデータなし');
        return;
      }

      const parsed = JSON.parse(savedData);
      console.log('[AIAssistantV2] ✅ localStorage読み込み成功:', {
        company: parsed.legalName || '(なし)',
        branches: parsed.branches?.length || 0
      });

      // window.aiDataに設定
      window.aiData = parsed;

      // フォームに入力
      this.populateStep4Form();

    } catch (error) {
      console.error('[AIAssistantV2] localStorage読み込みエラー:', error);
    }
  }

  /**
   * バックグラウンドで会社情報検索を開始（Step 1から呼ばれる）
   * @param {string} companyName - 会社名
   */
  async startBackgroundSearch(companyName) {
    if (!companyName) {
      console.log('[AIAssistantV2] バックグラウンド検索スキップ: 会社名なし');
      return;
    }

    // 既に検索中または同じ会社名で検索済み
    if (this.isSearching) {
      console.log('[AIAssistantV2] バックグラウンド検索スキップ: 既に検索中');
      return;
    }

    if (this.lastSearchedName === companyName) {
      console.log('[AIAssistantV2] バックグラウンド検索スキップ: 既に検索済み (' + companyName + ')');
      return;
    }

    console.log('[AIAssistantV2] 🚀 バックグラウンド検索開始:', companyName);

    // 🔥 古いlocalStorageデータをクリア（新しい会社の検索開始）
    localStorage.removeItem('aiSearchData');
    console.log('[AIAssistantV2] 古いデータをクリア');

    // ローディング表示（Step 1のai-loading）
    const loadingElement = document.getElementById('ai-loading');
    if (loadingElement) {
      loadingElement.style.display = 'block';
      loadingElement.textContent = '🤖 AI情報取得中...';
    }

    this.isSearching = true;
    this.lastSearchedName = companyName;

    try {
      const result = await this.api.jsonpRequest('searchCompany', {
        companyName: companyName
      });

      if (result.success && result.data) {
        console.log('[AIAssistantV2] ✅ バックグラウンド検索成功');

        // fillFormDataを呼び出してlocalStorageに保存
        this.fillFormData(result.data);

        if (loadingElement) {
          loadingElement.textContent = '✅ AI情報取得完了';
          setTimeout(() => {
            loadingElement.style.display = 'none';
          }, 2000);
        }
      } else {
        console.warn('[AIAssistantV2] ⚠️ バックグラウンド検索: データなし');
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }
      }

    } catch (error) {
      console.error('[AIAssistantV2] ❌ バックグラウンド検索エラー:', error);
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * 会社情報検索
   * @param {string} companyName - 会社名
   */
  async searchCompany(companyName) {
    // 重複検索防止
    if (this.isSearching || this.lastSearchedName === companyName) {
      console.log('[AIAssistantV2] 検索スキップ: 既に検索中または検索済み');
      return;
    }

    // 🔥 古いlocalStorageデータをクリア（新しい会社の検索開始）
    localStorage.removeItem('aiSearchData');
    console.log('[AIAssistantV2] 古いデータをクリア');

    this.isSearching = true;
    this.lastSearchedName = companyName;

    console.log('[AIAssistantV2] 検索開始:', companyName);
    this.debugLog('=== AI検索デバッグ開始 ===');
    this.debugLog(`会社名: ${companyName}`);
    this.debugLog(`GAS URL: ${this.api.baseUrl}`);

    try {
      // APIコール（統一クライアント使用）
      this.debugLog('APIリクエスト送信中...');
      const result = await this.api.jsonpRequest('searchCompany', {
        companyName: companyName
      });

      this.debugLog('APIレスポンス受信:', JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        console.log('[AIAssistantV2] 会社情報取得成功');
        this.debugLog('=== 取得データ詳細 ===');
        this.debugLog(`会社名: ${result.data.company_name || 'なし'}`);
        this.debugLog(`代表者: ${result.data.representative || 'なし'}`);
        this.debugLog(`住所: ${result.data.address || 'なし'}`);
        this.debugLog(`電話: ${result.data.phone || 'なし'}`);
        this.debugLog(`設立: ${result.data.established || 'なし'}`);
        this.debugLog(`HP: ${result.data.website || 'なし'}`);
        this.debugLog(`特徴: ${result.data.features || 'なし'}`);
        this.debugLog(`支店数: ${result.data.branches ? result.data.branches.length : 0}`);

        // 🔥 支店情報の詳細デバッグ
        if (result.data.branches && result.data.branches.length > 0) {
          this.debugLog('=== 支店情報詳細 ===');
          result.data.branches.forEach((branch, index) => {
            this.debugLog(`  支店${index + 1}: ${branch.name || '(名前なし)'} / ${branch.address || '(住所なし)'}`);
          });
        } else {
          this.debugLog('⚠️ GASから支店情報が返ってきていません！');
        }

        this.fillFormData(result.data);

        // 🔥 全フィールド入力完了後にローディング解除（DOM更新を待つ）
        await this.waitForDOMUpdate();
        this.isSearching = false;

        this.showNotification('AI情報を自動入力しました', 'success');
        this.debugLog('=== AI検索デバッグ終了 ===');
      } else {
        this.debugLog('=== エラー: データなし ===');
        this.debugLog('result.success:', result.success);
        this.debugLog('result.data:', result.data);
        console.log('[AIAssistantV2] 会社情報が見つかりませんでした');
        this.showNotification('会社情報が見つかりませんでした', 'warning');
        this.isSearching = false;
        this.debugLog('=== AI検索デバッグ終了 ===');
      }

    } catch (error) {
      this.debugLog('=== 検索エラー ===');
      this.debugLog('エラー内容:', error.toString());
      console.error('[AIAssistantV2] 検索エラー:', error);
      this.showNotification('検索中にエラーが発生しました', 'error');
      this.isSearching = false;
      this.debugLog('=== AI検索デバッグ終了 ===');
    }
  }

  /**
   * デバッグログ出力
   * @param {string} message - ログメッセージ
   * @param {*} data - 追加データ
   */
  debugLog(message, data = null) {
    console.log(`[AI Debug] ${message}`, data || '');

    // デバッグエリアに表示
    const debugElement = document.getElementById('ai-debug');
    if (debugElement) {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${message}${data ? ': ' + (typeof data === 'object' ? JSON.stringify(data) : data) : ''}\n`;
      debugElement.textContent += logEntry;
      debugElement.scrollTop = debugElement.scrollHeight;
    }
  }

  /**
   * ひらがなをカタカナに変換
   * @param {string} str - ひらがな文字列
   * @returns {string} カタカナ文字列
   */
  hiraganaToKatakana(str) {
    if (!str) return '';
    return str.replace(/[\u3041-\u3096]/g, match => {
      const chr = match.charCodeAt(0) + 0x60;
      return String.fromCharCode(chr);
    });
  }

  /**
   * 漢字から予測カナを生成（拡張版）
   * @param {string} name - 会社名または代表者名
   * @param {string} type - 'company' or 'representative'
   * @returns {string} カタカナ文字列
   */
  generatePredictedKana(name, type = 'company') {
    if (!name) return '';

    // 会社名用の変換マップ（優先順位順）
    const companyKanaMap = {
      '株式会社': 'カブシキガイシャ',
      '有限会社': 'ユウゲンガイシャ',
      '合同会社': 'ゴウドウガイシャ',
      '合資会社': 'ゴウシガイシャ',
      '合名会社': 'ゴウメイガイシャ',
      '建設': 'ケンセツ',
      '建築': 'ケンチク',
      '工業': 'コウギョウ',
      '工務店': 'コウムテン',
      '工務': 'コウム',
      '塗装': 'トソウ',
      '塗料': 'トリョウ',
      '工事': 'コウジ',
      '外壁': 'ガイヘキ',
      '屋根': 'ヤネ',
      '防水': 'ボウスイ',
      '住宅': 'ジュウタク',
      '住建': 'ジュウケン',
      '店': 'テン',
      '商会': 'ショウカイ',
      '商店': 'ショウテン',
      '商事': 'ショウジ',
      'ホーム': 'ホーム',
      'ハウス': 'ハウス',
      'リフォーム': 'リフォーム',
      'ペイント': 'ペイント',
      'テック': 'テック',
      'テクノ': 'テクノ'
    };

    // 代表者名用の変換マップ（姓＋名の一般的な読み）
    const nameKanaMap = {
      // 頻出の姓
      '佐藤': 'サトウ',
      '鈴木': 'スズキ',
      '高橋': 'タカハシ',
      '田中': 'タナカ',
      '伊藤': 'イトウ',
      '渡辺': 'ワタナベ',
      '山本': 'ヤマモト',
      '中村': 'ナカムラ',
      '小林': 'コバヤシ',
      '加藤': 'カトウ',
      '吉田': 'ヨシダ',
      '山田': 'ヤマダ',
      '佐々木': 'ササキ',
      '山口': 'ヤマグチ',
      '松本': 'マツモト',
      '井上': 'イノウエ',
      '木村': 'キムラ',
      '林': 'ハヤシ',
      '斎藤': 'サイトウ',
      '清水': 'シミズ',
      '坂本': 'サカモト',
      '大野': 'オオノ',
      '藤田': 'フジタ',
      '小川': 'オガワ',
      '岡田': 'オカダ',
      '前田': 'マエダ',
      '長谷川': 'ハセガワ',
      '近藤': 'コンドウ',
      '石川': 'イシカワ',
      '大塚': 'オオツカ',
      // よくある名前の部分
      '敏文': 'トシフミ',
      '敬文': 'タカフミ',
      '一郎': 'イチロウ',
      '太郎': 'タロウ',
      '次郎': 'ジロウ',
      '三郎': 'サブロウ',
      '健一': 'ケンイチ',
      '健二': 'ケンジ',
      '健太': 'ケンタ',
      '修': 'オサム',
      '博': 'ヒロシ',
      '明': 'アキラ',
      '清': 'キヨシ',
      '誠': 'マコト',
      '勇': 'イサム',
      '隆': 'タカシ',
      '豊': 'ユタカ',
      '正': 'タダシ',
      '浩': 'ヒロシ',
      '和夫': 'カズオ',
      '幸雄': 'ユキオ',
      '信夫': 'ノブオ'
    };

    // 一般的な漢字の読み（単漢字）
    const singleKanjiMap = {
      '田': 'タ',
      '中': 'ナカ',
      '山': 'ヤマ',
      '川': 'カワ',
      '木': 'キ',
      '林': 'ハヤシ',
      '森': 'モリ',
      '水': 'ミズ',
      '金': 'キン',
      '土': 'ツチ',
      '石': 'イシ',
      '大': 'オオ',
      '小': 'コ',
      '高': 'タカ',
      '松': 'マツ',
      '竹': 'タケ',
      '梅': 'ウメ',
      '鶴': 'ツル',
      '亀': 'カメ',
      '龍': 'リュウ',
      '東': 'ヒガシ',
      '西': 'ニシ',
      '南': 'ミナミ',
      '北': 'キタ',
      '新': 'シン',
      '本': 'ホン',
      '上': 'カミ',
      '下': 'シモ',
      '内': 'ウチ',
      '外': 'ソト'
    };

    let result = name;

    if (type === 'company') {
      // 会社名の場合 - 長い語句から順に変換
      const sortedEntries = Object.entries(companyKanaMap).sort((a, b) => b[0].length - a[0].length);
      sortedEntries.forEach(([kanji, kana]) => {
        result = result.replace(new RegExp(kanji, 'g'), kana);
      });

      // 残った漢字を単漢字マップで変換
      Object.entries(singleKanjiMap).forEach(([kanji, kana]) => {
        result = result.replace(new RegExp(kanji, 'g'), kana);
      });

    } else {
      // 代表者名の場合 - 姓名の変換を試みる
      const sortedNameEntries = Object.entries(nameKanaMap).sort((a, b) => b[0].length - a[0].length);
      sortedNameEntries.forEach(([kanji, kana]) => {
        result = result.replace(new RegExp(kanji, 'g'), kana);
      });

      // 代表者名以外のみ単漢字変換（代表者名は精度低いためスキップ）
      if (type !== 'representative') {
        Object.entries(singleKanjiMap).forEach(([kanji, kana]) => {
          result = result.replace(new RegExp(kanji, 'g'), kana);
        });
      }
    }

    // まだ漢字が残っているかチェック
    if (/[\u4e00-\u9faf]/.test(result)) {
      // 漢字が残っている場合
      // 代表者名：空文字を返す（間違った予測より空の方がマシ）
      if (type === 'representative') {
        return '';
      }
      // 会社名：カタカナ部分のみ返す
      const katakanaOnly = result.match(/[\u30A1-\u30FA\u30FC]+/g);
      if (katakanaOnly && katakanaOnly.length > 0) {
        return katakanaOnly.join('');
      }
      // カタカナが全くない場合は空文字
      return '';
    }

    return result;
  }

  /**
   * フォームにデータを入力
   * @param {Object} data - 会社情報データ
   */
  fillFormData(data) {
    if (!data) return;

    // カナ変換は完全にDeepSeekに任せる（フロントエンド側では変換しない）
    let companyKana = data.company_name_kana || '';
    let businessKana = data.trade_name_kana || '';
    let representativeKana = data.representative_kana || '';

    // 屋号がない場合は屋号カナも空にする
    if (!data.trade_name) {
      businessKana = '';
    }

    console.log('[AIAssistantV2] DeepSeek提供カナ:', {
      company: companyKana || '(空)',
      business: businessKana || '(空)',
      representative: representativeKana || '(空)'
    });

    // データマッピング
    const fieldMappings = {
      'legalName': data.company_name || '',
      'legalNameKana': companyKana,
      'businessName': data.trade_name || '',
      'businessNameKana': businessKana,
      'representative': data.representative || '',
      'representativeKana': representativeKana,
      'postalCode': data.postal_code || '',
      'fullAddress': data.address || '',
      'phone': data.phone || '',
      'websiteUrl': data.website || '',
      'establishedDate': data.established || '',
      'prText': data.features || '',
      'branches': data.branches || []
    };

    // グローバルに保存（Step 4で使用）
    window.aiData = fieldMappings;

    // 🔥 支店情報保存の確認ログ
    console.log('[AIAssistantV2] window.aiDataに保存完了');
    console.log('  支店数:', fieldMappings.branches.length);
    if (fieldMappings.branches.length > 0) {
      console.log('  支店詳細:');
      fieldMappings.branches.forEach((branch, index) => {
        console.log(`    ${index + 1}. ${branch.name || '(名前なし)'} - ${branch.address || '(住所なし)'}`);
      });
    } else {
      console.warn('  ⚠️ 支店情報が空です！data.branchesを確認してください');
    }

    // localStorageにも保存（Step4でデータが消える問題対策）
    try {
      const jsonString = JSON.stringify(fieldMappings);
      localStorage.setItem('aiSearchData', jsonString);
      console.log('[AIAssistantV2] localStorageに保存完了');
      console.log('  保存データサイズ:', jsonString.length, 'バイト');

      // 保存確認
      const saved = localStorage.getItem('aiSearchData');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[AIAssistantV2] localStorage保存確認: 支店数', parsed.branches?.length || 0);
      }
    } catch (error) {
      console.error('[AIAssistantV2] localStorage保存エラー:', error);
    }

    // 現在のステップに応じて入力
    if (window.currentStep === 4) {
      this.populateStep4Form();
    }

    console.log('[AIAssistantV2] フォームデータ設定完了');
  }

  /**
   * Step 4のフォームに入力
   */
  populateStep4Form() {
    if (!window.aiData) return;

    const data = window.aiData;

    // 各フィールドに値を設定（🔥 V1484: 空欄のみ補完）
    const setFieldValue = (id, value, forceOverride = false) => {
      const field = document.getElementById(id);
      if (field && value) {
        // forceOverride=trueの場合は既存値も上書き
        if (!forceOverride && field.value && field.value.trim() !== '') {
          console.log(`[AIAssistant] ${id}: 既存値を保持 (${field.value})`);
          return;
        }
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`[AIAssistant] ${id}: 補完 (${value})`);
      }
    };

    // 基本情報（会社名・カナは強制上書き：正式名称優先）
    setFieldValue('legalName', data.legalName, true);
    setFieldValue('legalNameKana', data.legalNameKana, true);
    setFieldValue('businessName', data.businessName);
    setFieldValue('businessNameKana', data.businessNameKana);
    setFieldValue('representative', data.representative);
    setFieldValue('representativeKana', data.representativeKana);
    setFieldValue('postalCode', data.postalCode);
    setFieldValue('fullAddress', data.fullAddress);
    setFieldValue('phone', data.phone);
    setFieldValue('websiteUrl', data.websiteUrl);
    setFieldValue('establishedDate', data.establishedDate);
    setFieldValue('prText', data.prText);

    // PR文カウンター更新
    const prTextArea = document.getElementById('prText');
    const prTextCounter = document.getElementById('prTextCounter');
    if (prTextArea && prTextCounter) {
      prTextCounter.textContent = `${prTextArea.value.length} / 500`;
    }

    // 支店情報
    if (data.branches && data.branches.length > 0) {
      data.branches.forEach((branch, index) => {
        if (index < 10) { // 最大10支店
          setFieldValue(`branchName${index + 1}`, branch.name || '');
          setFieldValue(`branchAddress${index + 1}`, branch.address || '');
        }
      });
    }
  }

  /**
   * DOM更新完了を待つ（ブラウザの次の描画サイクルまで待機）
   * @returns {Promise<void>}
   */
  waitForDOMUpdate() {
    return new Promise(resolve => {
      // requestAnimationFrameを2回実行してDOM更新を確実に待つ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('[AIAssistantV2] DOM更新完了');
          resolve();
        });
      });
    });
  }

  /**
   * 通知表示
   * @param {string} message - メッセージ
   * @param {string} type - success/warning/error/info
   */
  showNotification(message, type = 'info') {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3秒後に削除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

// CSS アニメーション追加
if (!document.getElementById('ai-assistant-styles')) {
  const style = document.createElement('style');
  style.id = 'ai-assistant-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// グローバルに公開
window.AIAssistantV2 = AIAssistantV2;