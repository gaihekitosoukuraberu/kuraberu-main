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