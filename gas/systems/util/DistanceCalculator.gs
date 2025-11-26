/**
 * ============================================
 * DistanceCalculator
 * ============================================
 * V1882: Google Maps Distance Matrix API統合
 * - Admin Dashboard 業者選択「距離順」ソート対応
 * - 自動車ルートベースの距離計算
 *
 * 使用方法:
 * GASから: DistanceCalculator.handle(params, null)
 * APIから: GET ?action=calculateDistances&origin=住所&destinations=["住所1","住所2"]
 */

const DistanceCalculator = {
  /**
   * メインハンドラー
   * @param {Object} params - リクエストパラメータ
   * @param {Object} context - コンテキスト（使用しない）
   * @return {Object} レスポンス
   */
  handle: function(params, context) {
    try {
      console.log('[DistanceCalculator] 距離計算リクエスト受信');
      console.log('[DistanceCalculator] Origin:', params.origin);
      console.log('[DistanceCalculator] Destinations:', params.destinations);

      // パラメータバリデーション
      if (!params.origin) {
        return {
          success: false,
          error: 'origin パラメータが必要です'
        };
      }

      if (!params.destinations) {
        return {
          success: false,
          error: 'destinations パラメータが必要です'
        };
      }

      // destinationsが文字列の場合はJSON.parse
      let destinations = params.destinations;
      if (typeof destinations === 'string') {
        try {
          destinations = JSON.parse(destinations);
        } catch (e) {
          return {
            success: false,
            error: 'destinations パラメータのJSONパースに失敗しました: ' + e.toString()
          };
        }
      }

      // 配列であることを確認
      if (!Array.isArray(destinations)) {
        return {
          success: false,
          error: 'destinations は配列である必要があります'
        };
      }

      // Google Maps Distance Matrix APIで距離を計算
      const distances = this.calculateDistances(params.origin, destinations);

      return {
        success: true,
        distances: distances
      };

    } catch (error) {
      console.error('[DistanceCalculator] エラー:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * Google Maps Distance Matrix APIで距離を計算
   * @param {string} origin - 起点住所
   * @param {Array<string>} destinations - 目的地住所の配列
   * @return {Array<Object>} 距離情報の配列
   */
  calculateDistances: function(origin, destinations) {
    try {
      // Google Maps API Key取得
      const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_DISTANCE_KEY');

      if (!apiKey) {
        console.warn('[DistanceCalculator] GOOGLE_MAPS_DISTANCE_KEY が未設定です');
        // APIキーがない場合はデフォルト値を返す
        return destinations.map(() => ({
          distanceValue: 999999, // 距離不明 = 最大値
          distanceText: '距離計算不可',
          durationText: '-'
        }));
      }

      console.log('[DistanceCalculator] Google Maps API呼び出し開始');
      console.log('[DistanceCalculator] Origin:', origin);
      console.log('[DistanceCalculator] Destinations count:', destinations.length);

      // Google Maps Distance Matrix API エンドポイント
      // 参考: https://developers.google.com/maps/documentation/distance-matrix/overview
      const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';

      // 一度に最大25件まで計算可能（origins 1 × destinations 25 = 25）
      const results = [];
      const batchSize = 25;

      for (let i = 0; i < destinations.length; i += batchSize) {
        const batch = destinations.slice(i, i + batchSize);

        // APIリクエストパラメータ
        const params = {
          origins: origin,
          destinations: batch.join('|'),
          mode: 'driving', // 自動車ルート
          language: 'ja', // 日本語
          key: apiKey
        };

        // URLエンコード
        const queryString = Object.keys(params)
          .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
          .join('&');

        const url = baseUrl + '?' + queryString;

        console.log('[DistanceCalculator] API URL構築完了');

        // APIリクエスト
        const response = UrlFetchApp.fetch(url, {
          muteHttpExceptions: true
        });

        const statusCode = response.getResponseCode();
        const responseText = response.getContentText();

        console.log('[DistanceCalculator] API Response Status:', statusCode);

        if (statusCode !== 200) {
          console.error('[DistanceCalculator] API Error:', responseText);
          // エラー時はデフォルト値を返す
          batch.forEach(() => {
            results.push({
              distanceValue: 999999,
              distanceText: 'API エラー',
              durationText: '-'
            });
          });
          continue;
        }

        const data = JSON.parse(responseText);

        console.log('[DistanceCalculator] API Status:', data.status);

        if (data.status !== 'OK') {
          console.error('[DistanceCalculator] API返却ステータス異常:', data.status);
          console.error('[DistanceCalculator] Error message:', data.error_message);
          // エラー時はデフォルト値を返す
          batch.forEach(() => {
            results.push({
              distanceValue: 999999,
              distanceText: 'ルート検索失敗',
              durationText: '-'
            });
          });
          continue;
        }

        // 各目的地の距離を抽出
        if (data.rows && data.rows.length > 0 && data.rows[0].elements) {
          data.rows[0].elements.forEach((element, index) => {
            if (element.status === 'OK') {
              results.push({
                distanceValue: element.distance.value, // メートル単位
                distanceText: element.distance.text,    // "10.5 km" など
                durationText: element.duration.text     // "15 分" など
              });
              console.log('[DistanceCalculator] 距離計算成功:', batch[index], '->', element.distance.text);
            } else {
              console.warn('[DistanceCalculator] 距離計算失敗:', batch[index], 'Status:', element.status);
              results.push({
                distanceValue: 999999,
                distanceText: '計算不可',
                durationText: '-'
              });
            }
          });
        }

        // APIレート制限対策（100ms待機）
        if (i + batchSize < destinations.length) {
          Utilities.sleep(100);
        }
      }

      console.log('[DistanceCalculator] 距離計算完了:', results.length, '件');
      return results;

    } catch (error) {
      console.error('[DistanceCalculator] calculateDistances エラー:', error);
      // エラー時はデフォルト値を返す
      return destinations.map(() => ({
        distanceValue: 999999,
        distanceText: 'システムエラー',
        durationText: '-'
      }));
    }
  }
};
