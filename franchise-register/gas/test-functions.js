/**
 * ====================================
 * テスト関数集
 * ====================================
 * GASエディタで実行して動作確認する
 */

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