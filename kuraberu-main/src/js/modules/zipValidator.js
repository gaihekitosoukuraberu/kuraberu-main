/**
 * 郵便番号バリデーションモジュール
 * 
 * 郵便番号の形式を検証する機能を提供します。
 */

export const zipValidator = {
  /**
   * 郵便番号の形式を検証します
   * @param {string} zipCode - 検証する郵便番号
   * @returns {boolean} 検証結果
   */
  validate(zipCode) {
    if (!zipCode) return false;
    
    // ハイフンありの場合: 123-4567 形式
    const zipWithHyphen = /^\d{3}-\d{4}$/;
    // ハイフンなしの場合: 1234567 形式
    const zipWithoutHyphen = /^\d{7}$/;
    
    return zipWithHyphen.test(zipCode) || zipWithoutHyphen.test(zipCode);
  },
  
  /**
   * 郵便番号を標準形式（123-4567）に整形します
   * @param {string} zipCode - 整形する郵便番号
   * @returns {string} 整形された郵便番号
   */
  format(zipCode) {
    if (!zipCode) return '';
    
    // 数字以外を削除
    const digitsOnly = zipCode.replace(/\D/g, '');
    
    // 7桁未満の場合はそのまま返す
    if (digitsOnly.length < 7) return zipCode;
    
    // 3桁-4桁の形式に整形
    return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 7)}`;
  },
  
  /**
   * 郵便番号から地域情報を取得します（スタブ実装）
   * @param {string} zipCode - 郵便番号
   * @returns {Promise<Object>} 地域情報
   */
  async getRegionInfo(zipCode) {
    // 実際の実装では外部APIから取得する
    return new Promise((resolve) => {
      setTimeout(() => {
        // スタブデータ
        const zipRegions = {
          '100': { prefecture: '東京都', city: '千代田区' },
          '150': { prefecture: '東京都', city: '渋谷区' },
          '160': { prefecture: '東京都', city: '新宿区' },
          '220': { prefecture: '神奈川県', city: '横浜市西区' },
          '231': { prefecture: '神奈川県', city: '横浜市中区' },
          '330': { prefecture: '埼玉県', city: 'さいたま市浦和区' },
          '530': { prefecture: '大阪府', city: '大阪市北区' },
          '600': { prefecture: '京都府', city: '京都市下京区' },
          '650': { prefecture: '兵庫県', city: '神戸市中央区' },
          '810': { prefecture: '福岡県', city: '福岡市中央区' },
          '980': { prefecture: '宮城県', city: '仙台市青葉区' }
        };
        
        // 郵便番号の上3桁を取得
        const prefix = zipCode.replace(/\D/g, '').substring(0, 3);
        
        // 地域情報を返す
        if (zipRegions[prefix]) {
          resolve({
            zipCode,
            ...zipRegions[prefix],
            found: true
          });
        } else {
          // デフォルト（東京都新宿区）を返す
          resolve({
            zipCode,
            prefecture: '東京都',
            city: '新宿区',
            found: false
          });
        }
      }, 500); // 遅延を模倣
    });
  }
};