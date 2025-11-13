/**
 * ====================================
 * テスト関数集
 * ====================================
 * GASエディタで実行して動作確認する
 */

/**
 * 成約データシートを作成
 */
function testCreateContractDataSheet() {
  console.log('===== 成約データシート作成 =====');
  const result = ContractDataSystem.createContractDataSheet();
  console.log('結果:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 日次集計テスト（直近3ヶ月データ更新）
 */
function testUpdateRecent3MonthMetrics() {
  console.log('===== 日次集計テスト =====');
  const result = ContractDataSystem.updateRecent3MonthMetrics();
  console.log('結果:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * 成約データ追加テスト
 * @param {string} cvId - テスト用CV ID（例: 'CV20250101001'）
 */
function testAddContractRecord(cvId) {
  console.log('===== 成約データ追加テスト =====');
  console.log('CV ID:', cvId);

  if (!cvId) {
    console.error('エラー: CV IDを指定してください');
    return { success: false, message: 'CV IDを指定してください' };
  }

  const result = ContractDataSystem.addContractRecord(cvId);
  console.log('結果:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * トリガー設定テスト（初回のみ実行）
 * 成約データ自動登録 + 日次集計の両方のトリガーを設定
 */
function testSetupAllTriggers() {
  console.log('===== 全トリガー設定 =====');

  // 1. onEditトリガー（成約データ自動登録 + ステータス同期）
  console.log('\n1. onEditトリガーを設定中...');
  setupOnEditTrigger();

  // 2. 日次集計トリガー（毎日0時実行）
  console.log('\n2. 日次集計トリガーを設定中...');
  setupDailyMetricsTrigger();

  console.log('\n✅ 全トリガー設定完了');
  console.log('- onEditトリガー: ユーザー登録の管理ステータスが「完了」になったら成約データに自動追加');
  console.log('- 日次集計トリガー: 毎日0時に直近3ヶ月データを集計して加盟店マスタを更新');
}

/**
 * スプレッドシートのヘッダー確認
 */
function checkSpreadsheetHeaders() {
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  console.log('=== スプレッドシートのヘッダー一覧 ===');
  headers.forEach((header, index) => {
    console.log(`Column ${index + 1}: "${header}"`);
  });

  // カナ関連のヘッダーを特定
  const kanaHeaders = headers.filter(h => h.includes('カナ') || h.includes('かな') || h.includes('フリガナ'));
  console.log('\n=== カナ関連のヘッダー ===');
  kanaHeaders.forEach(h => console.log(`- ${h}`));

  // 営業担当者関連のヘッダーを特定
  const salesHeaders = headers.filter(h => h.includes('営業'));
  console.log('\n=== 営業担当者関連のヘッダー ===');
  salesHeaders.forEach(h => console.log(`- ${h}`));

  return headers;
}

/**
 * 1. システム全体の状態を確認
 * これを最初に実行
 */
function testSystemStatus() {
  console.log('===== システム状態チェック =====');

  // DataAccessLayerが存在するか確認
  if (typeof DataAccessLayer === 'undefined') {
    console.error('❌ DataAccessLayer.gsが追加されていません！');
    return;
  }

  const status = DataAccessLayer.checkSystemStatus();
  console.log('設定状況:');
  console.log('- スプレッドシートID:', status.spreadsheetId);
  console.log('- Google検索API:', status.googleSearchApiKey);
  console.log('- 検索エンジンID:', status.googleSearchEngineId);
  console.log('- OpenRouter API:', status.openRouterApiKey);
  console.log('- Slack Webhook:', status.slackWebhookUrl);
  console.log('- 登録シート:', status.registrationSheet);
  console.log('- データ件数:', status.dataCount);

  if (status.spreadsheetId === '✗') {
    console.error('⚠️ スプレッドシートIDを設定してください');
  }

  return status;
}

/**
 * 2. AI検索機能のテスト
 */
function testAISearch() {
  console.log('===== AI検索テスト =====');

  const testData = {
    action: 'searchCompany',
    companyName: '大野建装',
    callback: 'testCallback'
  };

  try {
    const result = AISearchSystem.handle(testData);

    if (result.success) {
      console.log('✅ AI検索成功');
      console.log('会社名:', result.data.company_name);
      console.log('住所:', result.data.address);
      console.log('電話:', result.data.phone);
    } else {
      console.error('❌ AI検索失敗:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ エラー発生:', error.toString());
    return null;
  }
}

/**
 * 3. 管理画面データ取得のテスト
 */
function testAdminData() {
  console.log('===== 管理データ取得テスト =====');

  const testData = {
    action: 'getRegistrationRequests',
    status: 'all'
  };

  try {
    const result = AdminSystem.handle(testData);

    if (result.success) {
      console.log('✅ データ取得成功');
      console.log('総件数:', result.stats.total);
      console.log('申請中:', result.stats.pending);
      console.log('承認済み:', result.stats.approved);
      console.log('却下:', result.stats.rejected);
    } else {
      console.error('❌ データ取得失敗:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ エラー発生:', error.toString());
    return null;
  }
}

/**
 * 4. 加盟店登録のテスト（テストデータを登録）
 */
function testRegistration() {
  console.log('===== 加盟店登録テスト =====');

  const testData = {
    parameter: {
      action: 'submitRegistration',
      companyName: 'テスト株式会社',
      companyNameKana: 'テストカブシキガイシャ',
      representativeName: '田中太郎',
      representativeNameKana: 'タナカタロウ',
      phone: '03-1234-5678',
      email: 'test@example.com',
      address: '東京都千代田区テスト1-2-3'
    }
  };

  try {
    const result = FranchiseSystem.handlePost(testData);

    if (result.success) {
      console.log('✅ 登録成功');
      console.log('登録ID:', result.registrationId);
    } else {
      console.error('❌ 登録失敗:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ エラー発生:', error.toString());
    return null;
  }
}

/**
 * 5. 全機能を順番にテスト
 */
function testAll() {
  console.log('========== 統合テスト開始 ==========\n');

  // 1. システム状態確認
  const status = testSystemStatus();
  console.log('\n');

  // スプレッドシートIDが設定されていない場合は中止
  if (status && status.spreadsheetId === '✗') {
    console.error('テスト中止：スプレッドシートIDを設定してください');
    return;
  }

  // 2. AI検索テスト（APIキーなくても動く）
  testAISearch();
  console.log('\n');

  // 3. 管理データ取得テスト
  testAdminData();
  console.log('\n');

  // 4. 登録テスト（コメントアウトしてもOK）
  // testRegistration();

  console.log('========== 統合テスト完了 ==========');
}

/**
 * 統計データの実際の値を確認
 */
function checkRealStats() {
  console.log('===== 実データ統計確認 =====');

  try {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // カラムインデックスを探す
    const statusIndex = headers.indexOf('承認ステータス');
    const regStatusIndex = headers.indexOf('ステータス');
    const approverIndex = headers.indexOf('承認者');

    console.log('承認ステータスカラム位置:', statusIndex);
    console.log('ステータスカラム位置:', regStatusIndex);
    console.log('承認者カラム位置:', approverIndex);

    // データカウント
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let monthlyApproved = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    rows.forEach((row, index) => {
      const approvalStatus = row[statusIndex] || '';

      if (approvalStatus === '申請中' || approvalStatus === '未審査' || approvalStatus === '') {
        pending++;
      } else if (approvalStatus === '承認済み' || approvalStatus === '一時停止') {
        approved++;

        // 承認者カラムから日付を取得（例: "2025-09-29 ryuryuyamauchi"）
        const approverStr = row[approverIndex] || '';
        if (approverStr) {
          const dateMatch = approverStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            const approvalDate = new Date(dateMatch[1], parseInt(dateMatch[2]) - 1, dateMatch[3]);
            if (approvalDate.getMonth() === currentMonth && approvalDate.getFullYear() === currentYear) {
              monthlyApproved++;
              console.log(`今月承認: ${approverStr}`);
            }
          }
        }
      } else if (approvalStatus === '却下') {
        rejected++;
      }
    });

    const total = rows.length;
    // 承認率 = 承認 / (承認 + 却下) * 100
    const approvalRate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

    console.log('=== 実データ統計 ===');
    console.log('総件数:', total);
    console.log('未審査:', pending);
    console.log('承認済み（一時停止含む）:', approved);
    console.log('却下:', rejected);
    console.log('今月承認:', monthlyApproved);
    console.log('承認率:', approvalRate + '%');
    console.log('==================');

    return {
      total: total,
      pending: pending,
      approved: approved,
      rejected: rejected,
      monthlyApproved: monthlyApproved,
      approvalRate: approvalRate
    };
  } catch (error) {
    console.error('エラー:', error);
    return null;
  }
}

/**
 * 6. エラーが出た時の診断
 */
function diagnoseError() {
  console.log('===== エラー診断 =====');

  // 必要なオブジェクトの存在確認
  const checks = {
    'DataAccessLayer': typeof DataAccessLayer !== 'undefined',
    'AISearchSystem': typeof AISearchSystem !== 'undefined',
    'AdminSystem': typeof AdminSystem !== 'undefined',
    'FranchiseSystem': typeof FranchiseSystem !== 'undefined',
    'PropertiesService': typeof PropertiesService !== 'undefined',
    'SpreadsheetApp': typeof SpreadsheetApp !== 'undefined'
  };

  Object.keys(checks).forEach(key => {
    if (checks[key]) {
      console.log('✅', key, 'は存在します');
    } else {
      console.error('❌', key, 'が見つかりません！');
    }
  });

  // プロパティの確認
  try {
    const props = PropertiesService.getScriptProperties();
    const keys = props.getKeys();
    console.log('\n設定済みプロパティ:', keys.join(', '));
  } catch (e) {
    console.error('プロパティ取得エラー:', e);
  }
}

/**
 * ========================================
 * 🧪 [テスト用] 加盟店登録の完全テスト
 * ========================================
 *
 * 📸 画像URL保存テスト含む
 * 📝 PRテキスト・エリア情報フルテキスト保存テスト含む
 *
 * 【使い方】
 * 1. GASエディタを開く
 * 2. 関数選択で「testFranchiseRegistrationWithImage」を選択
 * 3. 実行ボタンをクリック
 * 4. 実行ログを確認
 *
 * 【確認ポイント】
 * - PRテキストが省略されずにフル保存されているか
 * - 画像URL1、URL2が正しく保存されているか
 * - エラーが発生していないか
 */
function testFranchiseRegistrationWithImage() {
  console.log('========== 加盟店登録完全テスト開始 ==========');

  // 1x1ピクセルの小さなダミーPNG画像（Base64）
  const dummyImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // テストデータ作成
  const testParams = {
    action: 'registerFranchise',
    companyInfo: JSON.stringify({
      companyName: 'テスト株式会社',
      companyNameKana: 'テストカブシキガイシャ',
      businessName: 'テスト塗装',
      businessNameKana: 'テストトソウ',
      representative: '山田太郎',
      representativeKana: 'ヤマダタロウ',
      postalCode: '100-0001',
      fullAddress: '東京都千代田区千代田1-1-1',
      phone: '03-1234-5678',
      websiteUrl: 'https://test-example.com',
      establishedDate: '2010年4月',
      prText: 'テスト株式会社は、地域密着型の外壁塗装専門業者として、高品質な施工とお客様への丁寧な対応を心がけております。豊富な実績と確かな技術力で、お客様の大切な住まいを守ります。創業以来20年以上にわたり、東京・神奈川・埼玉エリアで5000件以上の施工実績を誇り、お客様満足度98%を達成しております。当社の強みは、自社職人による直接施工体制により、中間マージンをカットした適正価格でのご提供と、アフターフォロー10年保証による長期的な安心をお届けできる点です。また、最新のドローン診断技術やAIカラーシミュレーションシステムを導入し、お客様により分かりやすく、納得いただけるご提案を実現しています。外壁塗装・屋根塗装だけでなく、防水工事、リフォーム全般まで幅広く対応可能で、一級塗装技能士をはじめとする有資格者が多数在籍しており、確かな技術でお応えいたします。',
      branches: [
        { name: 'テスト支店1', address: '神奈川県横浜市テスト1-1-1' },
        { name: 'テスト支店2', address: '埼玉県さいたま市テスト2-2-2' }
      ]
    }),
    detailInfo: JSON.stringify({
      billingEmail: 'billing@test-example.com',
      salesEmail: 'sales@test-example.com',
      salesPersonName: '佐藤花子',
      salesPersonKana: 'サトウハナコ',
      employees: '10〜30名',
      revenue: '1億円〜5億円',
      propertyTypes: ['戸建て', 'マンション・アパート'],
      propertyFloors: '3階建てまで',
      buildingAgeRange: '築10年〜築30年',
      constructionTypes: ['外壁塗装', '屋根塗装', '防水工事'],
      specialServices: ['カラーシミュレーション', 'ドローン調査']
    }),
    selectedAreas: JSON.stringify({
      prefectures: '東京都,神奈川県,埼玉県',
      cities: '東京都_千代田区,東京都_中央区,神奈川県_横浜市,埼玉県_さいたま市',
      priorityAreas: '東京都_千代田区,神奈川県_横浜市'
    }),
    identityDocument: JSON.stringify({
      type: 'drivers_license',
      images: [
        { data: dummyImageData, side: 'front' },
        { data: dummyImageData, side: 'back' }
      ]
    }),
    termsAgreed: 'true',
    informationCheck: 'true'
  };

  console.log('📝 テストデータ準備完了');
  console.log('会社名:', JSON.parse(testParams.companyInfo).companyName);
  console.log('画像データ:', JSON.parse(testParams.identityDocument).images.length, '枚');

  try {
    // FranchiseSystem.registerFranchiseを直接呼び出し
    console.log('\n🚀 登録処理開始...');
    const result = FranchiseSystem.registerFranchise(testParams);

    console.log('\n========== 結果 ==========');
    if (result.success) {
      console.log('✅ 登録成功！');
      console.log('登録ID:', result.registrationId);

      // スプレッドシートを確認
      console.log('\n📊 スプレッドシート確認中...');
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      // 最新の行を取得（一番下の行）
      const lastRow = data[data.length - 1];
      console.log('\n最新登録データ:');
      console.log('- タイムスタンプ:', lastRow[0]);
      console.log('- 登録ID:', lastRow[1]);
      console.log('- 会社名:', lastRow[2]);
      console.log('- PRテキスト:', lastRow[13] ? lastRow[13].substring(0, 50) + '...' : '(空)');
      console.log('- 本人確認書類種類:', lastRow[17]);
      console.log('- 本人確認書類URL1:', lastRow[18] || '(空)');
      console.log('- 本人確認書類URL2:', lastRow[19] || '(空)');

      // 画像URLが保存されているかチェック
      if (lastRow[18] && lastRow[18].startsWith('https://')) {
        console.log('\n✅ 画像URL1が正しく保存されました！');
      } else {
        console.error('\n❌ 画像URL1が保存されていません:', lastRow[18]);
      }

      if (lastRow[19] && lastRow[19].startsWith('https://')) {
        console.log('✅ 画像URL2が正しく保存されました！');
      } else {
        console.error('❌ 画像URL2が保存されていません:', lastRow[19]);
      }

    } else {
      console.error('❌ 登録失敗:', result.error);
    }

    console.log('\n========== テスト完了 ==========');
    return result;

  } catch (error) {
    console.error('❌ エラー発生:', error.toString());
    console.error('スタックトレース:', error.stack);
    return { success: false, error: error.toString() };
  }
}

/**
 * ============================================
 * CVシステム マッピング検証テスト関数
 * ============================================
 *
 * 手動実行用：GASエディタで実行してマッピングを検証
 * 1. この関数を選択
 * 2. ▶実行ボタンをクリック
 * 3. ログを確認
 */
function testCVMapping() {
  console.log('=== CV マッピング検証テスト開始 ===\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // ============================================
  // テスト1: ヘッダー配列の要素数チェック
  // ============================================
  console.log('【テスト1】ヘッダー配列の要素数チェック');

  const expectedColumnCount = 71;
  const headers = [
    'CV ID', '登録日時', '氏名', 'フリガナ', '性別', '年齢', '電話番号', 'メールアドレス', '続柄',
    '氏名（2人目）', '電話番号（2人目）', '続柄（2人目）', '備考（2人目）',
    '郵便番号（物件）', '都道府県（物件）', '市区町村（物件）', '住所詳細（物件）',
    '自宅住所フラグ', '郵便番号（自宅）', '都道府県（自宅）', '住所詳細（自宅）',
    '物件種別', '築年数', '建物面積', '階数',
    'Q1_物件種別', 'Q2_階数', 'Q3_築年数', 'Q4_工事歴', 'Q5_前回施工時期',
    'Q6_外壁材質', 'Q7_屋根材質', 'Q8_気になる箇所', 'Q9_希望工事内容_外壁', 'Q10_希望工事内容_屋根',
    'Q11_見積もり保有数', 'Q12_見積もり取得先', 'Q13_訪問業者有無', 'Q14_比較意向', 'Q15_訪問業者名',
    'Q16_現在の劣化状況', 'Q17_業者選定条件',
    '現地調査希望日時', '業者選定履歴', '案件メモ', '連絡時間帯', '見積もり送付先', 'ワードリンク回答',
    '配信ステータス', '配信先加盟店数', '配信日時', '成約フラグ', '成約日時', '成約加盟店ID', '成約金額',
    '流入元URL', '検索キーワード', 'UTMパラメータ',
    '訪問回数', '最終訪問日時', 'ブロックフラグ',
    '架電履歴', '次回架電日時', 'メモ',
    '管理ステータス', '加盟店別ステータス', '初回架電日時', '最終更新日時', '配信予定日時', '担当者名', '最終架電日時'
  ];

  if (headers.length === expectedColumnCount) {
    results.passed.push('ヘッダー配列: ' + headers.length + '列 ✅');
    console.log('✅ PASS: ヘッダー配列は' + expectedColumnCount + '列です');
  } else {
    results.failed.push('ヘッダー配列: ' + headers.length + '列（期待値: ' + expectedColumnCount + '列）');
    console.error('❌ FAIL: ヘッダー配列は' + headers.length + '列です（期待値: ' + expectedColumnCount + '列）');
  }

  // ============================================
  // テスト2: 重要カラムのインデックス検証
  // ============================================
  console.log('\n【テスト2】重要カラムのインデックス検証');

  const columnMapping = {
    'AQ（現地調査希望日時）': { index: 42, expected: '現地調査希望日時' },
    'AR（業者選定履歴）': { index: 43, expected: '業者選定履歴' },
    'AS（案件メモ）': { index: 44, expected: '案件メモ' },
    'AT（連絡時間帯）': { index: 45, expected: '連絡時間帯' },
    'AU（見積もり送付先）': { index: 46, expected: '見積もり送付先' },
    'AV（ワードリンク回答）': { index: 47, expected: 'ワードリンク回答' },
    'BK（次回架電日時）': { index: 62, expected: '次回架電日時' },
    'BR（担当者名）': { index: 69, expected: '担当者名' },
    'BS（最終架電日時）': { index: 70, expected: '最終架電日時' }
  };

  for (const key in columnMapping) {
    const col = columnMapping[key];
    const actualValue = headers[col.index];

    if (actualValue === col.expected) {
      results.passed.push(key + ': ' + actualValue + ' ✅');
      console.log('✅ PASS: ' + key + ' = "' + actualValue + '"');
    } else {
      results.failed.push(key + ': "' + actualValue + '"（期待値: "' + col.expected + '"）');
      console.error('❌ FAIL: ' + key + ' = "' + actualValue + '"（期待値: "' + col.expected + '"）');
    }
  }

  // ============================================
  // テスト3: updateCV2の列番号検証
  // ============================================
  console.log('\n【テスト3】updateCV2の列番号検証');

  const updateCV2Columns = {
    'AQ（現地調査希望日時）': 43,  // インデックス42 + 1
    'AR（業者選定履歴）': 44,
    'AS（案件メモ）': 45,
    'AT（連絡時間帯）': 46,
    'AU（見積もり送付先）': 47
  };

  for (const key in updateCV2Columns) {
    const colNum = updateCV2Columns[key];
    const headerIndex = colNum - 1;  // 列番号からインデックスに変換
    const headerName = headers[headerIndex];
    const expectedName = columnMapping[key].expected;

    if (headerName === expectedName) {
      results.passed.push('updateCV2 ' + key + ': 列番号' + colNum + ' ✅');
      console.log('✅ PASS: updateCV2 ' + key + ' = 列番号' + colNum + ' (' + headerName + ')');
    } else {
      results.failed.push('updateCV2 ' + key + ': 列番号' + colNum + '（ヘッダー: "' + headerName + '"）');
      console.error('❌ FAIL: updateCV2 ' + key + ' = 列番号' + colNum + '（ヘッダー: "' + headerName + '"、期待値: "' + expectedName + '"）');
    }
  }

  // ============================================
  // テスト4: 列番号とインデックスの整合性
  // ============================================
  console.log('\n【テスト4】列番号とインデックスの整合性');

  const exampleMappings = [
    { letter: 'A', index: 0, colNum: 1, name: 'CV ID' },
    { letter: 'G', index: 6, colNum: 7, name: '電話番号' },
    { letter: 'N', index: 13, colNum: 14, name: '郵便番号（物件）' },
    { letter: 'AQ', index: 42, colNum: 43, name: '現地調査希望日時' },
    { letter: 'BR', index: 69, colNum: 70, name: '担当者名' },
    { letter: 'BS', index: 70, colNum: 71, name: '最終架電日時' }
  ];

  for (const mapping of exampleMappings) {
    const actualName = headers[mapping.index];

    if (actualName === mapping.name) {
      results.passed.push(mapping.letter + '列: インデックス' + mapping.index + '、列番号' + mapping.colNum + ' ✅');
      console.log('✅ PASS: ' + mapping.letter + '列 = インデックス' + mapping.index + '、列番号' + mapping.colNum + ' (' + actualName + ')');
    } else {
      results.failed.push(mapping.letter + '列: インデックス' + mapping.index + '（ヘッダー: "' + actualName + '"、期待値: "' + mapping.name + '"）');
      console.error('❌ FAIL: ' + mapping.letter + '列 = インデックス' + mapping.index + '（ヘッダー: "' + actualName + '"、期待値: "' + mapping.name + '"）');
    }
  }

  // ============================================
  // 最終結果
  // ============================================
  console.log('\n=== テスト結果サマリー ===');
  console.log('✅ 成功: ' + results.passed.length + '件');
  console.log('❌ 失敗: ' + results.failed.length + '件');
  console.log('⚠️  警告: ' + results.warnings.length + '件');

  if (results.failed.length === 0) {
    console.log('\n🎉 すべてのテストが成功しました！マッピングは完璧です。');
  } else {
    console.log('\n❌ 以下の問題を修正してください：');
    results.failed.forEach(function(msg) {
      console.log('  - ' + msg);
    });
  }

  return {
    success: results.failed.length === 0,
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    details: results
  };
}

/**
 * ============================================
 * 成約報告機能テスト
 * ============================================
 *
 * 手動実行用：GASエディタで実行して成約報告機能をテスト
 * 1. この関数を選択
 * 2. ▶実行ボタンをクリック
 * 3. ログを確認
 */
function testGetDeliveredCases() {
  console.log('===== 配信済み案件一覧取得テスト =====');

  // テスト用の加盟店IDを指定（実際の加盟店IDを使用してください）
  const testMerchantId = 'F20240001';  // ← ここを実際の加盟店IDに変更

  const result = MerchantContractReport.getDeliveredCases({
    merchantId: testMerchantId
  });

  console.log('\n結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ 取得成功');
    console.log('配信済み案件数:', result.cases.length);

    if (result.cases.length > 0) {
      console.log('\n最初の3件:');
      result.cases.slice(0, 3).forEach((caseData, index) => {
        console.log(`\n[案件 ${index + 1}]`);
        console.log('  CV ID:', caseData.cvId);
        console.log('  顧客名:', caseData.customerName);
        console.log('  電話番号:', caseData.tel);
        console.log('  住所:', caseData.address);
        console.log('  工事種別:', caseData.workCategory);
        console.log('  配信日時:', caseData.deliveredAt);
        console.log('  管理ステータス:', caseData.managementStatus);
      });
    }
  } else {
    console.error('\n❌ 取得失敗:', result.error);
  }

  return result;
}

/**
 * 成約報告登録テスト
 * ⚠️ 実際にデータを更新するため、テスト用データで実行してください
 */
function testSubmitContractReport() {
  console.log('===== 成約報告登録テスト =====');

  // テスト用データを指定（実際のデータに合わせて変更してください）
  const testData = {
    merchantId: 'F20240001',                    // ← 実際の加盟店IDに変更
    merchantName: 'テスト株式会社',              // ← 実際の加盟店名に変更
    cvId: 'CV20250101001',                      // ← 実際のCV IDに変更
    reportType: '成約報告',                      // 成約報告 or 追加工事報告
    currentStatus: '契約後・工事前',             // 契約前・口頭確約済/契約後・工事前/工事中/工事完了後
    contractDate: '2025-01-13',                 // 成約日
    contractAmount: 1200000,                    // 成約金額（円）
    constructionEndDate: '2025-03-31',          // 完工予定日
    paymentDueDate: '2025-02-28',               // 着金予定日
    propertyType: '戸建て',                      // 対象物件種別
    floors: '2階建て',                           // 階数
    workContent: ['外壁塗装', '屋根塗装'],       // 施工内容（配列）
    estimateFileUrl: '',                        // 見積書URL（オプション）
    receiptFileUrl: ''                          // 領収書URL（オプション）
  };

  console.log('\nテストデータ:');
  console.log(JSON.stringify(testData, null, 2));

  const result = MerchantContractReport.submitContractReport(testData);

  console.log('\n結果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ 成約報告登録成功');
    console.log('メッセージ:', result.message);

    // ユーザー登録シートを確認
    console.log('\n📊 ユーザー登録シート確認中...');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName('ユーザー登録');
    const data = userSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const cvIdIdx = headers.indexOf('CV ID');
    const contractMerchantIdIdx = headers.indexOf('成約加盟店ID');
    const contractDateIdx = headers.indexOf('成約日');
    const contractAmountIdx = headers.indexOf('成約金額');
    const managementStatusIdx = headers.indexOf('管理ステータス');
    const constructionStatusIdx = headers.indexOf('工事進捗ステータス');
    const constructionEndDateIdx = headers.indexOf('工事完了予定日');
    const propertyTypeIdx = headers.indexOf('Q1_物件種別');
    const floorsIdx = headers.indexOf('Q2_階数');
    const workContentIdx = headers.indexOf('見積工事内容');

    // CV IDで検索
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][cvIdIdx] === testData.cvId) {
        console.log('\n更新後のデータ:');
        console.log('  CV ID:', rows[i][cvIdIdx]);
        console.log('  成約加盟店ID:', rows[i][contractMerchantIdIdx]);
        console.log('  成約日:', rows[i][contractDateIdx]);
        console.log('  成約金額:', rows[i][contractAmountIdx]);
        console.log('  管理ステータス:', rows[i][managementStatusIdx]);
        console.log('  工事進捗ステータス:', rows[i][constructionStatusIdx]);
        console.log('  完工予定日:', rows[i][constructionEndDateIdx]);
        console.log('  物件種別:', rows[i][propertyTypeIdx]);
        console.log('  階数:', rows[i][floorsIdx]);
        console.log('  施工内容:', rows[i][workContentIdx]);
        break;
      }
    }
  } else {
    console.error('\n❌ 成約報告登録失敗:', result.error);
  }

  return result;
}

/**
 * 成約報告機能の統合テスト
 * 1. 配信済み案件一覧取得
 * 2. 最初の案件で成約報告テスト（コメントアウト推奨）
 */
function testContractReportIntegration() {
  console.log('========== 成約報告機能 統合テスト開始 ==========\n');

  // テスト用の加盟店ID
  const testMerchantId = 'F20240001';  // ← 実際の加盟店IDに変更

  // 1. 配信済み案件一覧取得
  console.log('【ステップ1】配信済み案件一覧取得');
  const casesResult = MerchantContractReport.getDeliveredCases({
    merchantId: testMerchantId
  });

  if (!casesResult.success) {
    console.error('❌ 案件一覧取得失敗:', casesResult.error);
    return;
  }

  console.log('✅ 案件一覧取得成功:', casesResult.cases.length, '件');

  if (casesResult.cases.length === 0) {
    console.log('⚠️ 配信済み案件がありません。テスト終了。');
    return;
  }

  // 最初の案件を表示
  const firstCase = casesResult.cases[0];
  console.log('\n最初の案件:');
  console.log('  CV ID:', firstCase.cvId);
  console.log('  顧客名:', firstCase.customerName);
  console.log('  工事種別:', firstCase.workCategory);

  // 2. 成約報告テスト（実際にデータを更新するためコメントアウト推奨）
  /*
  console.log('\n【ステップ2】成約報告登録テスト');
  const reportResult = MerchantContractReport.submitContractReport({
    merchantId: testMerchantId,
    merchantName: 'テスト株式会社',
    cvId: firstCase.cvId,
    reportType: '成約報告',
    currentStatus: '契約後・工事前',
    contractDate: '2025-01-13',
    contractAmount: 1000000,
    constructionEndDate: '2025-03-31',
    paymentDueDate: '2025-02-28',
    propertyType: '戸建て',
    floors: '2階建て',
    workContent: ['外壁塗装']
  });

  if (reportResult.success) {
    console.log('✅ 成約報告登録成功');
  } else {
    console.error('❌ 成約報告登録失敗:', reportResult.error);
  }
  */

  console.log('\n⚠️ 実際の成約報告テストはコメントアウトされています');
  console.log('テストする場合は、testContractReportIntegration関数内のコメントを外してください');

  console.log('\n========== 統合テスト完了 ==========');
}