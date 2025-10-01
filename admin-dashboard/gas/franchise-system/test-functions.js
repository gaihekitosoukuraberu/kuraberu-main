/**
 * テスト関数（デバッグ後に削除）
 */

// テスト1: URL生成と検証の往復テスト
function testUrlGeneration() {
  console.log('=== URL生成と検証テスト ===');

  const testMerchantId = 'TEST12345';

  // URL生成
  console.log('1. URL生成開始...');
  const url = generateFirstLoginUrl(testMerchantId);
  console.log('生成URL:', url);

  // URLからパラメータ抽出
  const urlObj = new URL(url);
  const data = urlObj.searchParams.get('data');
  const sig = urlObj.searchParams.get('sig');

  console.log('data:', data);
  console.log('sig:', sig);

  // 検証
  console.log('\n2. URL検証開始...');
  const verifiedId = verifySignedUrl(data, sig);

  console.log('\n3. 結果:');
  console.log('元のID:', testMerchantId);
  console.log('検証後ID:', verifiedId);
  console.log('成功:', verifiedId === testMerchantId);

  return {
    success: verifiedId === testMerchantId,
    original: testMerchantId,
    verified: verifiedId,
    url: url
  };
}

// テスト2: 実際のmerchantIdでURL生成
function testRealMerchantId() {
  console.log('=== 実際のmerchantId テスト ===');

  // 実際の加盟店IDを使用
  const merchantId = 'FR09262228'; // 最新の登録ID

  const url = generateFirstLoginUrl(merchantId);
  console.log('生成URL:', url);

  // URLからパラメータ抽出
  const urlObj = new URL(url);
  const data = urlObj.searchParams.get('data');
  const sig = urlObj.searchParams.get('sig');

  console.log('\nパラメータ:');
  console.log('data:', data);
  console.log('sig:', sig);

  // 検証
  const verifiedId = verifySignedUrl(data, sig);
  console.log('\n検証結果:', verifiedId);

  return {
    merchantId: merchantId,
    url: url,
    data: data,
    sig: sig,
    verified: verifiedId,
    success: verifiedId === merchantId
  };
}

// テスト3: MerchantSystem.verifyFirstLoginUrlの直接テスト
function testMerchantSystemVerify() {
  console.log('=== MerchantSystem.verifyFirstLoginUrl テスト ===');

  const merchantId = 'FR09262228';

  // URL生成
  const url = generateFirstLoginUrl(merchantId);
  const urlObj = new URL(url);
  const data = urlObj.searchParams.get('data');
  const sig = urlObj.searchParams.get('sig');

  console.log('パラメータ:');
  console.log('data:', data);
  console.log('sig:', sig);

  // MerchantSystemで検証
  const result = MerchantSystem.verifyFirstLoginUrl({
    data: data,
    sig: sig
  });

  console.log('\nMerchantSystem結果:', JSON.stringify(result, null, 2));

  return result;
}

// テスト4: 全体フローテスト
function testFullFlow() {
  console.log('=== 全体フローテスト ===');

  const merchantId = 'FR09262228';

  // 1. URL生成
  console.log('1. URL生成...');
  const url = generateFirstLoginUrl(merchantId);
  console.log('URL:', url);

  // 2. URLからパラメータ抽出（正規表現で）
  const dataMatch = url.match(/data=([^&]+)/);
  const sigMatch = url.match(/sig=([^&]+)/);

  const data = dataMatch ? decodeURIComponent(dataMatch[1]) : null;
  const sig = sigMatch ? decodeURIComponent(sigMatch[1]) : null;

  console.log('\n2. 抽出されたパラメータ:');
  console.log('data:', data);
  console.log('sig:', sig);

  // 3. doGetのシミュレーション
  console.log('\n3. doGet シミュレーション...');
  const getParams = {
    action: 'verifyFirstLogin',
    data: data,
    sig: sig,
    callback: 'testCallback'
  };

  // 4. main.jsのルーティング
  console.log('\n4. MerchantSystem.handle実行...');

  try {
    const result = MerchantSystem.handle(getParams);
    console.log('\n5. 結果:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('エラー:', error.toString());
    return { success: false, error: error.toString() };
  }
}
