/**
 * areaResolver.gs
 * 郵便番号から住所情報を取得するスクリプト
 */

/**
 * 郵便番号から住所情報を取得する関数
 * ZipCloud API (https://zipcloud.ibsnet.co.jp/doc/api) を使用
 * 
 * @param {string} postalCode - 郵便番号（例: '150-0001'）
 * @return {Object} 都道府県、市区町村、町域の情報を含むオブジェクト
 */
function resolvePostalCode(postalCode) {
  // 郵便番号からハイフンを削除し、7桁の数字のみにする
  const cleanedPostalCode = postalCode.replace(/-/g, '');
  
  // 入力値チェック
  if (!/^\d{7}$/.test(cleanedPostalCode)) {
    throw new Error('郵便番号は7桁の数字で入力してください（例: 150-0001 または 1500001）');
  }
  
  // ZipCloud APIのURLを構築
  const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanedPostalCode}`;
  
  try {
    // APIリクエストを送信
    const response = UrlFetchApp.fetch(url);
    const responseData = JSON.parse(response.getContentText());
    
    // APIのエラーチェック
    if (responseData.status !== 200) {
      throw new Error(`API Error: ${responseData.message}`);
    }
    
    // 該当する住所が見つからない場合
    if (!responseData.results || responseData.results.length === 0) {
      return {
        prefecture: '',
        city: '',
        town: '',
        found: false,
        message: '指定された郵便番号に対応する住所が見つかりませんでした'
      };
    }
    
    // 最初の結果を使用
    const addressData = responseData.results[0];
    
    // 結果を返す
    return {
      prefecture: addressData.address1,  // 都道府県
      city: addressData.address2,        // 市区町村
      town: addressData.address3,        // 町域
      found: true,
      message: '住所が正常に解決されました'
    };
  } catch (error) {
    // ネットワークエラーなどの例外処理
    if (error.message.includes('API Error:')) {
      throw error;
    } else {
      throw new Error(`ネットワークエラーが発生しました: ${error.message}`);
    }
  }
}

// 郵便番号を正規化する関数（ハイフンの追加や削除を行う）
function normalizePostalCode(postalCode) {
  // ハイフンを削除
  const digitsOnly = postalCode.replace(/-/g, '');
  
  // 7桁でない場合はそのまま返す
  if (!/^\d{7}$/.test(digitsOnly)) {
    return postalCode;
  }
  
  // XXX-XXXX形式に整形して返す
  return digitsOnly.substring(0, 3) + '-' + digitsOnly.substring(3);
}

// Node.js環境でテストするためのエクスポート（実際のGASでは不要）
if (typeof module !== 'undefined') {
  module.exports = {
    resolvePostalCode,
    normalizePostalCode
  };
}