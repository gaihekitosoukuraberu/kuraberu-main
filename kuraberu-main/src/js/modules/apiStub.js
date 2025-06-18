/**
 * API連携スタブモジュール
 * 
 * 実際のAPI連携を模倣するスタブモジュールです。
 * 実際の開発では、このモジュールをサーバーAPIに接続するコードに置き換えます。
 */

export const apiStub = {
  /**
   * 業者データの取得（スタブ）
   * @param {string} postalCode - 郵便番号
   * @param {Object} criteria - 検索条件
   * @returns {Promise<Array>} 業者リスト
   */
  async getCompanies(postalCode, criteria = {}) {
    // TODO: callGPT() でAIによる診断結果を取得
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // デモ用に固定の業者リストを返却
        resolve([
          {
            id: 'company1',
            name: '匠塗装工房',
            address: '東京都新宿区西新宿1-1-1',
            rating: 5,
            areas: ['東京都', '神奈川県', '埼玉県', '千葉県'],
            features: ['自社施工', '10年保証', '定期点検無料'],
            description: '創業30年の実績ある塗装専門店。職人の技術と品質にこだわり、長持ちする外壁塗装を提供しています。',
            foundedYear: '1991年',
            employees: '25名',
            warranty: '最長10年保証（工事内容により異なる）',
            image: 'src/img/company1.jpg',
            works: [
              { image: 'src/img/work1-1.jpg', description: '東京都新宿区の一戸建て施工例' },
              { image: 'src/img/work1-2.jpg', description: '神奈川県横浜市のマンション施工例' }
            ]
          },
          {
            id: 'company2',
            name: '大和塗装',
            address: '東京都世田谷区桜丘2-2-2',
            rating: 4,
            areas: ['東京都', '神奈川県'],
            features: ['低価格', '5年保証', '丁寧な施工'],
            description: 'コストパフォーマンスに優れた塗装サービスを提供。リーズナブルながらも品質にこだわった施工を行います。',
            foundedYear: '2005年',
            employees: '12名',
            warranty: '5年保証（全工事対象）',
            image: 'src/img/company2.jpg',
            works: [
              { image: 'src/img/work2-1.jpg', description: '東京都世田谷区の一戸建て施工例' }
            ]
          },
          {
            id: 'company3',
            name: '日本ペイント株式会社',
            address: '東京都中央区銀座3-3-3',
            rating: 4,
            areas: ['全国対応'],
            features: ['大手メーカー直営', '15年保証', '最新塗料使用'],
            description: '国内大手塗料メーカーの直営施工部門。自社開発の最新塗料を使用した高品質な塗装工事を提供します。',
            foundedYear: '1978年',
            employees: '120名',
            warranty: '最長15年保証（工事内容により異なる）',
            image: 'src/img/company3.jpg',
            works: [
              { image: 'src/img/work3-1.jpg', description: '東京都港区のオフィスビル施工例' },
              { image: 'src/img/work3-2.jpg', description: '大阪府大阪市のマンション施工例' },
              { image: 'src/img/work3-3.jpg', description: '福岡県福岡市の商業施設施工例' }
            ]
          }
        ]);
      }, 800); // 800ms遅延
    });
  },
  
  /**
   * 見積もり依頼の送信（スタブ）
   * @param {Object} formData - フォームデータ
   * @returns {Promise<Object>} 送信結果
   */
  async submitQuoteRequest(formData) {
    // TODO: callGPT() で依頼内容のサマリー処理
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // 成功レスポンスを返却
        resolve({
          success: true,
          requestId: `req-${Date.now()}`,
          message: '見積もり依頼を受け付けました。担当スタッフより折り返しご連絡いたします。'
        });
      }, 1000); // 1000ms遅延
    });
  },
  
  /**
   * 地域相場データの取得（スタブ）
   * @param {string} postalCode - 郵便番号
   * @returns {Promise<Object>} 相場データ
   */
  async getAreaPriceData(postalCode) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 郵便番号から地域を判定（実際はAPIで取得）
        let region = '関東';
        if (postalCode.startsWith('5') || postalCode.startsWith('6')) {
          region = '関西';
        } else if (postalCode.startsWith('4')) {
          region = '中部';
        } else if (postalCode.startsWith('8') || postalCode.startsWith('9')) {
          region = '九州';
        }
        
        // 地域別の相場データ
        const priceData = {
          '関東': {
            averagePrice: 120,  // 坪単価（万円）
            minPrice: 80,
            maxPrice: 180,
            details: {
              small: { size: '30坪未満', price: '80〜120万円' },
              medium: { size: '30〜50坪', price: '120〜180万円' },
              large: { size: '50坪以上', price: '180〜280万円' }
            }
          },
          '関西': {
            averagePrice: 110,
            minPrice: 70,
            maxPrice: 160,
            details: {
              small: { size: '30坪未満', price: '70〜110万円' },
              medium: { size: '30〜50坪', price: '110〜160万円' },
              large: { size: '50坪以上', price: '160〜250万円' }
            }
          },
          '中部': {
            averagePrice: 115,
            minPrice: 75,
            maxPrice: 170,
            details: {
              small: { size: '30坪未満', price: '75〜115万円' },
              medium: { size: '30〜50坪', price: '115〜170万円' },
              large: { size: '50坪以上', price: '170〜260万円' }
            }
          },
          '九州': {
            averagePrice: 100,
            minPrice: 65,
            maxPrice: 150,
            details: {
              small: { size: '30坪未満', price: '65〜100万円' },
              medium: { size: '30〜50坪', price: '100〜150万円' },
              large: { size: '50坪以上', price: '150〜230万円' }
            }
          }
        };
        
        // 対象地域の相場を返却
        resolve({
          postalCode,
          region,
          ...priceData[region]
        });
      }, 600); // 600ms遅延
    });
  }
};