/**
 * ============================================
 * RankingSystem.gs
 * ============================================
 *
 * 目的: LP向けランキング取得システム（AISearchSystemから分離）
 * 依存: 加盟店マスタ、過去データシート
 * 作成: V1713
 */

const RankingSystem = {

  /**
   * ランキング取得メイン処理
   * @param {Object} params - リクエストパラメータ
   * @return {Object} ランキング結果
   */
  getRanking: function(params) {
    try {
      console.log('[RankingSystem] getRanking開始:', params);

      // V1713-FIX: 郵便番号なし = 全国版ランキング
      const zipcode = params.zipcode || '';
      let prefecture = '';
      let city = '';

      if (zipcode) {
        // 郵便番号から都道府県・市区町村を推定（V1705拡張）
        prefecture = this.getPrefectureFromZipcode(zipcode);
        city = this.getCityFromZipcode(zipcode);
        console.log('[RankingSystem] 郵便番号 ' + zipcode + ' → 都道府県: ' + prefecture + ', 市区町村: ' + city);
      } else {
        console.log('[RankingSystem] 全国版ランキング取得（郵便番号なし）');
      }

      // V1705/V1707: BOT回答データ取得
      const wallMaterial = params.wallMaterial || '';
      const roofMaterial = params.roofMaterial || '';
      const wallWorkType = params.wallWorkType || '';
      const roofWorkType = params.roofWorkType || '';
      const buildingAgeMin = params.buildingAgeMin || 0;
      const buildingAgeMax = params.buildingAgeMax || 100;
      console.log('[RankingSystem] 材質・工事内容:', { wallMaterial, roofMaterial, wallWorkType, roofWorkType });
      console.log('[RankingSystem] 築年数:', { buildingAgeMin, buildingAgeMax });

      // 加盟店マスタから取得（V1694）
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const masterSheet = ss.getSheetByName('加盟店マスタ');

      if (!masterSheet) {
        console.warn('[RankingSystem] 加盟店マスタシートが見つかりません');
        return {
          success: true,
          rankings: {
            cheap: [],
            recommended: [],
            review: [],
            premium: []
          },
          totalCount: 0,
          filteredCount: 0
        };
      }

      const lastRow = masterSheet.getLastRow();
      if (lastRow < 2) {
        console.warn('[RankingSystem] 加盟店データがありません');
        return {
          success: true,
          rankings: {
            cheap: [],
            recommended: [],
            review: [],
            premium: []
          },
          totalCount: 0,
          filteredCount: 0
        };
      }

      // ヘッダー取得
      const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
      const allData = masterSheet.getRange(2, 1, lastRow - 1, masterSheet.getLastColumn()).getValues();
      console.log('[RankingSystem] 全業者数: ' + allData.length);

      // V1713-FIX: onEditトリガーで加盟店登録→加盟店マスタが自動同期されるため、
      // マスタシートだけを読めばOK（高速化）

      // カラムインデックス取得（V1707: 対応築年数追加 / V1713: ボーナス・フラグ追加 / V1750: 3ヶ月データ追加 / V1751: 加盟日追加）
      const colIndex = {
        companyName: masterHeaders.indexOf('会社名'),
        prefecture: masterHeaders.indexOf('対応都道府県'),
        cities: masterHeaders.indexOf('対応市区町村'),
        approvalStatus: masterHeaders.indexOf('承認ステータス'),
        deliveryStatus: masterHeaders.indexOf('配信ステータス'),
        avgContractAmount: masterHeaders.indexOf('直近3ヶ月_平均成約金額'),
        rating: masterHeaders.indexOf('評価'),
        reviewCount: masterHeaders.indexOf('口コミ件数'),
        contractCount: masterHeaders.indexOf('直近3ヶ月_成約件数'),
        constructionTypes: masterHeaders.indexOf('対応工事種別'),
        buildingAgeMin: masterHeaders.indexOf('対応築年数_最小'),
        buildingAgeMax: masterHeaders.indexOf('対応築年数_最大'),
        silentFlag: masterHeaders.indexOf('サイレントフラグ'),
        priorityArea: masterHeaders.indexOf('優先エリア'),
        handicap: masterHeaders.indexOf('ハンデ'),
        depositAdvance: masterHeaders.indexOf('デポジット前金'),
        prioritySupplyFlag: masterHeaders.indexOf('最優先供給フラグ'),
        // V1750: 3ヶ月データ追加（新しいスコアリング用）
        recent3MonthRevenue: masterHeaders.indexOf('直近3ヶ月_総売上'),
        recent3MonthInquiryCount: masterHeaders.indexOf('直近3ヶ月_問合せ件数'),
        // V1751: 加盟日追加（データ移行システム用）
        joinDate: masterHeaders.indexOf('加盟日')
      };

      // V1713-DEBUG: カラムインデックス検証
      console.log('[V1713-DEBUG] カラムインデックス:', JSON.stringify(colIndex));

      // V1713-DEBUG: 必須カラムチェック
      const missingColumns = [];
      if (colIndex.companyName === -1) missingColumns.push('会社名');
      if (colIndex.prefecture === -1) missingColumns.push('対応都道府県');
      if (colIndex.approvalStatus === -1) missingColumns.push('承認ステータス');
      if (colIndex.deliveryStatus === -1) missingColumns.push('配信ステータス');

      if (missingColumns.length > 0) {
        console.error('[V1713-ERROR] 必須カラムが見つかりません:', missingColumns.join(', '));
        throw new Error('必須カラムが見つかりません: ' + missingColumns.join(', '));
      }

      // V1713-DEBUG: V1713カラムの存在確認
      const v1713Columns = [];
      if (colIndex.priorityArea === -1) v1713Columns.push('優先エリア');
      if (colIndex.handicap === -1) v1713Columns.push('ハンデ');
      if (colIndex.depositAdvance === -1) v1713Columns.push('デポジット前金');
      if (colIndex.prioritySupplyFlag === -1) v1713Columns.push('最優先供給フラグ');

      if (v1713Columns.length > 0) {
        console.warn('[V1713-WARNING] V1713カラムが見つかりません（機能制限モード）:', v1713Columns.join(', '));
      }

      // フィルタリング（承認済み + 配信中 + 都道府県マッチ + 市区町村マッチ + 工事種別マッチ）（V1705拡張）
      const filtered = [];

      // V1713-DEBUG: フィルタリング統計
      const filterStats = {
        total: allData.length,
        rejectedByApproval: 0,
        rejectedByDelivery: 0,
        rejectedBySilent: 0,
        rejectedByPrefecture: 0,
        rejectedByCity: 0,
        rejectedByConstruction: 0,
        rejectedByBuildingAge: 0,
        passed: 0
      };

      for (var i = 0; i < allData.length; i++) {
        const row = allData[i];
        const companyName = row[colIndex.companyName] || '';
        const approvalStatus = row[colIndex.approvalStatus] || '';
        const deliveryStatus = row[colIndex.deliveryStatus] || '';
        const prefectures = row[colIndex.prefecture] || '';
        const cities = row[colIndex.cities] || '';
        const constructionTypes = row[colIndex.constructionTypes] || '';
        const silentFlag = row[colIndex.silentFlag] || 'FALSE';

        // V1713-DEBUG: 最初の3件のステータスをログ出力
        if (i < 3) {
          console.log('[V1713-DEBUG] 業者' + (i+1) + ': ' + companyName);
          console.log('  承認ステータス: ' + approvalStatus);
          console.log('  配信ステータス: ' + deliveryStatus);
          console.log('  サイレントフラグ: ' + silentFlag);
          console.log('  対応都道府県: ' + prefectures);
          console.log('  対応市区町村: ' + cities);
        }

        // ステータスチェック（承認済み + アクティブ + サイレントフラグOFF）（V1705修正）
        if (approvalStatus !== '承認済み') {
          filterStats.rejectedByApproval++;
          continue;
        }
        if (deliveryStatus !== 'アクティブ') {
          filterStats.rejectedByDelivery++;
          continue;
        }
        if (silentFlag === 'TRUE') {
          filterStats.rejectedBySilent++;
          continue;
        }

        // V1713-FIX: 都道府県チェック（全国版の場合はスキップ）
        if (prefecture && (!prefectures || prefectures.indexOf(prefecture) === -1)) {
          filterStats.rejectedByPrefecture++;
          continue;
        }

        // 市区町村チェック（V1705追加 - cityが取得できた場合のみ）
        if (city && cities && cities.indexOf(city) === -1) {
          filterStats.rejectedByCity++;
          continue;
        }

        // 工事種別チェック（V1705追加 - BOT回答に基づくマッチング）
        // constructionTypesには「外壁塗装,屋根塗装,防水工事」のようにカンマ区切りで格納
        let constructionTypeMatch = true;

        // 外壁材質チェック（Q6）
        if (wallMaterial && constructionTypes) {
          // 材質に応じた工事種別が含まれているかチェック
          // 例: サイディング → 外壁塗装, モルタル → 外壁塗装, など
          if (wallMaterial.indexOf('サイディング') !== -1 || wallMaterial.indexOf('モルタル') !== -1) {
            if (constructionTypes.indexOf('外壁塗装') === -1 && constructionTypes.indexOf('外壁リフォーム') === -1) {
              constructionTypeMatch = false;
            }
          }
        }

        // 屋根材質チェック（Q7）
        if (roofMaterial && constructionTypes && constructionTypeMatch) {
          // 材質に応じた工事種別が含まれているかチェック
          // 例: スレート → 屋根塗装, 瓦 → 屋根葺き替え, など
          if (roofMaterial.indexOf('スレート') !== -1 || roofMaterial.indexOf('コロニアル') !== -1) {
            if (constructionTypes.indexOf('屋根塗装') === -1 && constructionTypes.indexOf('屋根リフォーム') === -1) {
              constructionTypeMatch = false;
            }
          } else if (roofMaterial.indexOf('瓦') !== -1) {
            if (constructionTypes.indexOf('屋根葺き替え') === -1 && constructionTypes.indexOf('屋根リフォーム') === -1) {
              constructionTypeMatch = false;
            }
          }
        }

        // 外壁工事内容チェック（Q9）
        if (wallWorkType && constructionTypes && constructionTypeMatch) {
          if (wallWorkType.indexOf('塗装') !== -1 && constructionTypes.indexOf('外壁塗装') === -1) {
            constructionTypeMatch = false;
          } else if (wallWorkType.indexOf('張り替え') !== -1 && constructionTypes.indexOf('外壁リフォーム') === -1) {
            constructionTypeMatch = false;
          }
        }

        // 屋根工事内容チェック（Q10）
        if (roofWorkType && constructionTypes && constructionTypeMatch) {
          if (roofWorkType.indexOf('塗装') !== -1 && constructionTypes.indexOf('屋根塗装') === -1) {
            constructionTypeMatch = false;
          } else if (roofWorkType.indexOf('葺き替え') !== -1 && constructionTypes.indexOf('屋根葺き替え') === -1 && constructionTypes.indexOf('屋根リフォーム') === -1) {
            constructionTypeMatch = false;
          }
        }

        if (!constructionTypeMatch) {
          filterStats.rejectedByConstruction++;
          continue;
        }

        // 築年数チェック（V1707追加）
        const merchantAgeMin = row[colIndex.buildingAgeMin] || 0;
        const merchantAgeMax = row[colIndex.buildingAgeMax] || 100;

        // 範囲の重複をチェック
        const overlapMin = Math.max(buildingAgeMin, merchantAgeMin);
        const overlapMax = Math.min(buildingAgeMax, merchantAgeMax);

        // 重複がない場合はスキップ
        if (overlapMin > overlapMax) {
          filterStats.rejectedByBuildingAge++;
          continue;
        }

        // マッチ度スコア計算（0-100）
        const overlapSize = overlapMax - overlapMin;
        const userRangeSize = buildingAgeMax - buildingAgeMin;
        const buildingAgeMatchScore = userRangeSize > 0 ? (overlapSize / userRangeSize) * 100 : 100;

        // V1750: 過去データに基づく全メトリクスを取得
        const pastDataMetrics = this.getPastDataMetrics(companyName);

        // V1713: 完全マッチ判定（都道府県 + 市区町村 + 工事種別 + 築年数100%マッチ）
        // 市区町村マッチ: cityがnull（取得できなかった）またはマッチしている場合はtrue
        const cityMatch = !city || (cities && cities.indexOf(city) !== -1);
        // 築年数100%マッチ: ユーザーの希望範囲が業者の対応範囲に完全に含まれる
        const buildingAgeFullMatch = (buildingAgeMatchScore === 100);
        // 完全マッチフラグ: 上記すべてがtrue（都道府県と工事種別は既にフィルタ済み）
        const isCompleteMatch = cityMatch && buildingAgeFullMatch;

        // V1713: ボーナスフィールド取得
        const priorityArea = row[colIndex.priorityArea];
        const handicap = parseFloat(row[colIndex.handicap]) || 0;
        const depositAdvance = row[colIndex.depositAdvance];
        const prioritySupplyFlag = row[colIndex.prioritySupplyFlag];

        // V1750: 3ヶ月データ取得（数値化・カンマ除去）
        const parseNumber = function(value) {
          if (!value) return 0;
          const str = value.toString().replace(/,/g, '');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };

        const recent3MonthRevenue = parseNumber(row[colIndex.recent3MonthRevenue]);
        const recent3MonthInquiryCount = parseNumber(row[colIndex.recent3MonthInquiryCount]);
        const recent3MonthContractCount = parseNumber(row[colIndex.contractCount]);
        const recent3MonthAvgAmount = parseNumber(row[colIndex.avgContractAmount]);

        // V1750: 成約率計算（問合せ件数が0の場合は0%）
        const recent3MonthConversionRate = recent3MonthInquiryCount > 0
          ? (recent3MonthContractCount / recent3MonthInquiryCount)
          : 0;

        // V1751: 加盟日取得（データ移行システム用）
        const joinDate = row[colIndex.joinDate] || '';

        // すべての条件を満たした業者を追加（V1751: 加盟日 + データ移行システム）
        filterStats.passed++;
        filtered.push({
          companyName: companyName,
          avgContractAmount: recent3MonthAvgAmount,
          rating: row[colIndex.rating] || 0,
          reviewCount: row[colIndex.reviewCount] || 0,
          prefecture: prefecture,
          city: city,
          constructionTypes: constructionTypes,
          wallMaterial: wallMaterial,
          roofMaterial: roofMaterial,
          wallWorkType: wallWorkType,
          roofWorkType: roofWorkType,
          buildingAgeMin: merchantAgeMin,
          buildingAgeMax: merchantAgeMax,
          buildingAgeMatchScore: buildingAgeMatchScore,
          riskScore: pastDataMetrics.riskScore,
          isCompleteMatch: isCompleteMatch,
          priorityArea: priorityArea,
          handicap: handicap,
          depositAdvance: depositAdvance,
          prioritySupplyFlag: prioritySupplyFlag,
          specialSupport: '',
          maxFloors: '',
          contractCount: recent3MonthContractCount,
          // V1750: 3ヶ月データ追加
          recent3MonthRevenue: recent3MonthRevenue,
          recent3MonthInquiryCount: recent3MonthInquiryCount,
          recent3MonthConversionRate: recent3MonthConversionRate,
          // V1750: 過去データメトリクスを追加
          pastRank: pastDataMetrics.rank,
          pastGrossUnitAfterReturn: pastDataMetrics.grossUnitAfterReturn,
          pastReturnRate: pastDataMetrics.returnRate,
          pastConversionRate: pastDataMetrics.conversionRate,
          // V1751: 加盟日追加
          joinDate: joinDate
        });
      }

      // V1713-DEBUG: フィルタリング統計を出力
      console.log('[V1713-DEBUG] フィルタリング統計:');
      console.log('  全業者数: ' + filterStats.total);
      console.log('  承認ステータス除外: ' + filterStats.rejectedByApproval);
      console.log('  配信ステータス除外: ' + filterStats.rejectedByDelivery);
      console.log('  サイレントフラグ除外: ' + filterStats.rejectedBySilent);
      console.log('  都道府県除外: ' + filterStats.rejectedByPrefecture);
      console.log('  市区町村除外: ' + filterStats.rejectedByCity);
      console.log('  工事種別除外: ' + filterStats.rejectedByConstruction);
      console.log('  築年数除外: ' + filterStats.rejectedByBuildingAge);
      console.log('  通過: ' + filterStats.passed);

      console.log('[RankingSystem] フィルタ後: ' + filtered.length + '件');

      // 4つのソート順で並べ替え（V1707: おすすめ順もマッチ度優先 / V1713: ボーナス調整追加）
      const rankings = {
        cheap: this.applyRankBonus(this.sortByPrice(filtered.slice())).slice(0, 8),
        recommended: this.applyRankBonus(this.sortByMatchScore(filtered.slice())).slice(0, 8),
        review: this.applyRankBonus(this.sortByReview(filtered.slice())).slice(0, 8),
        premium: this.applyRankBonus(this.sortByRating(filtered.slice())).slice(0, 8)
      };

      return {
        success: true,
        rankings: rankings,
        totalCount: allData.length,
        filteredCount: filtered.length
      };

    } catch (error) {
      console.error('[RankingSystem] getRanking エラー:', error);
      return {
        success: false,
        error: error.toString(),
        rankings: {
          cheap: [],
          recommended: [],
          review: [],
          premium: []
        }
      };
    }
  },

  /**
   * 郵便番号から都道府県を推定（簡易版）
   */
  getPrefectureFromZipcode: function(zipcode) {
    // V1713-FIX: 郵便番号の最初の3桁で都道府県を判定（より正確）
    const zip = zipcode.toString().replace(/[^0-9]/g, ''); // 数字のみ抽出
    const prefix3 = zip.substring(0, 3);
    const prefix2 = zip.substring(0, 2);

    // 3桁プレフィックスマッピング（優先）
    const map3 = {
      '220': '神奈川県', '221': '神奈川県', '222': '神奈川県', '223': '神奈川県',
      '224': '神奈川県', '225': '神奈川県', '226': '神奈川県', '227': '神奈川県',
      '228': '神奈川県', '229': '神奈川県', // 横浜市
      '210': '神奈川県', '211': '神奈川県', '212': '神奈川県', '213': '神奈川県',
      '214': '神奈川県', '215': '神奈川県', '216': '神奈川県', '217': '神奈川県',
      '218': '神奈川県', '219': '神奈川県', // 川崎市
      '230': '神奈川県', '231': '神奈川県', '232': '神奈川県', '233': '神奈川県',
      '234': '神奈川県', '235': '神奈川県', '236': '神奈川県', '237': '神奈川県',
      '238': '神奈川県', '239': '神奈川県', // 横須賀市など
      '240': '神奈川県', '241': '神奈川県', '242': '神奈川県', '243': '神奈川県',
      '244': '神奈川県', '245': '神奈川県', '246': '神奈川県', '247': '神奈川県',
      '248': '神奈川県', '249': '神奈川県', '250': '神奈川県', '251': '神奈川県',
      '252': '神奈川県', '253': '神奈川県', '254': '神奈川県', '255': '神奈川県',
      '256': '神奈川県', '257': '神奈川県', '258': '神奈川県', '259': '神奈川県', // その他神奈川県
      '410': '静岡県', '411': '静岡県', '412': '静岡県', '413': '静岡県',
      '414': '静岡県', '415': '静岡県', '416': '静岡県', '417': '静岡県',
      '418': '静岡県', '419': '静岡県', '420': '静岡県', '421': '静岡県',
      '422': '静岡県', '423': '静岡県', '424': '静岡県', '425': '静岡県',
      '426': '静岡県', '427': '静岡県', '428': '静岡県', '429': '静岡県',
      '430': '静岡県', '431': '静岡県', '432': '静岡県', '433': '静岡県',
      '434': '静岡県', '435': '静岡県', '436': '静岡県', '437': '静岡県',
      '438': '静岡県', '439': '静岡県' // 静岡県
    };

    if (map3[prefix3]) {
      return map3[prefix3];
    }

    // 2桁フォールバック（従来の簡易マッピング）
    const map2 = {
      '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
      '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
      '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
      '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
      '21': '岐阜県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
      '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
      '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
      '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
      '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
      '46': '鹿児島県', '47': '沖縄県'
    };
    return map2[prefix2] || '';
  },

  /**
   * 郵便番号から市区町村を取得（V1706 - Yahoo! API使用）
   */
  getCityFromZipcode: function(zipcode) {
    try {
      // Yahoo! APIを試行
      const appId = PropertiesService.getScriptProperties().getProperty('YAHOO_APP_ID');

      if (appId) {
        // V1713-FIX: 郵便番号にハイフンを挿入（2250024 → 225-0024）
        let formattedZipcode = zipcode.toString().replace(/[^0-9]/g, ''); // 数字のみ抽出
        if (formattedZipcode.length === 7) {
          formattedZipcode = formattedZipcode.substring(0, 3) + '-' + formattedZipcode.substring(3);
        }

        const url = 'https://map.yahooapis.jp/search/zip/V1/zipCodeSearch?appid=' + appId + '&query=' + formattedZipcode + '&output=json';
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

        if (response.getResponseCode() === 200) {
          const data = JSON.parse(response.getContentText());

          if (data.Feature && data.Feature.length > 0) {
            const property = data.Feature[0].Property;
            const city = property.City || '';
            console.log('[RankingSystem] Yahoo! API: ' + formattedZipcode + ' → ' + city);
            return city;
          }
        }
      }

      // APIが使えない場合は簡易マッピングにフォールバック
      console.log('[RankingSystem] Yahoo! API未使用、簡易マッピングにフォールバック');
      return this.getCityFromZipcodeSimple(zipcode);

    } catch (error) {
      console.error('[RankingSystem] getCityFromZipcode エラー:', error);
      // エラー時も簡易マッピングにフォールバック
      return this.getCityFromZipcodeSimple(zipcode);
    }
  },

  /**
   * 郵便番号から市区町村を推定（簡易版 - フォールバック用）
   */
  getCityFromZipcodeSimple: function(zipcode) {
    // 簡易マッピング（主要都市のみ）
    const cityMap = {
      '100': '千代田区', '101': '千代田区', '102': '千代田区', '103': '中央区', '104': '中央区',
      '105': '港区', '106': '港区', '107': '港区', '108': '港区', '150': '渋谷区',
      '151': '渋谷区', '152': '目黒区', '153': '目黒区', '154': '世田谷区', '155': '世田谷区',
      '156': '世田谷区', '157': '世田谷区', '158': '世田谷区', '160': '新宿区', '161': '新宿区',
      '162': '新宿区', '163': '新宿区', '164': '中野区', '165': '中野区', '166': '杉並区',
      '167': '杉並区', '168': '杉並区', '169': '新宿区', '170': '豊島区', '171': '豊島区',
      '530': '大阪市北区', '531': '大阪市北区', '532': '大阪市淀川区', '533': '大阪市東淀川区',
      '534': '大阪市都島区', '535': '大阪市旭区', '536': '大阪市城東区', '537': '大阪市東成区',
      '540': '大阪市中央区', '541': '大阪市中央区', '542': '大阪市中央区', '543': '大阪市天王寺区',
      '450': '名古屋市中村区', '451': '名古屋市西区', '452': '名古屋市西区', '453': '名古屋市中村区',
      '454': '名古屋市中川区', '455': '名古屋市港区', '456': '名古屋市熱田区', '457': '名古屋市南区',
      '460': '名古屋市中区', '461': '名古屋市東区', '462': '名古屋市北区', '463': '名古屋市守山区',
      '810': '福岡市中央区', '811': '福岡市博多区', '812': '福岡市博多区', '813': '福岡市東区',
      '814': '福岡市早良区', '815': '福岡市南区', '816': '福岡市博多区', '819': '福岡市西区'
    };

    const prefix3 = zipcode.substring(0, 3);
    return cityMap[prefix3] || '';
  },

  /**
   * V1750: おすすめ順ソート（売上高順 - 完全リニューアル）
   * データ優先順位: 3ヶ月売上 (100%) > 過去データ (40% × RANK × 返品ペナルティ) > デフォルト
   */
  sortByMatchScore: function(companies) {
    const RANK_WEIGHT = { 'S': 1.33, 'A': 1.16, 'B': 1.0, 'C': 0.90 };
    const HISTORICAL_WEIGHT = 0.4;
    const DEFAULT_REVENUE = 500000; // デフォルト売上: 50万円

    return companies.sort(function(a, b) {
      // V1750: 売上スコア計算
      const calculateRevenueScore = function(company) {
        let baseScore = 0;
        let dataSource = '';

        // Priority 1: Recent 3-month revenue (100% weight)
        if (company.recent3MonthRevenue > 0) {
          baseScore = company.recent3MonthRevenue;
          dataSource = '3M';
        }
        // Priority 2: Historical data (40% weight + RANK + return penalty)
        else if (company.pastGrossUnitAfterReturn > 0 && company.contractCount > 0) {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          const returnPenalty = Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3));
          // 過去データの単価 × 成約件数 × 係数
          baseScore = company.pastGrossUnitAfterReturn * company.contractCount * HISTORICAL_WEIGHT * rankWeight * returnPenalty;
          dataSource = 'HIST*0.4*RANK*RET';
        }
        // Priority 3: Default
        else {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          baseScore = DEFAULT_REVENUE * rankWeight;
          dataSource = 'DEFAULT';
        }

        return { score: baseScore, source: dataSource };
      };

      const scoreA = calculateRevenueScore(a);
      const scoreB = calculateRevenueScore(b);

      // 売上スコアで降順ソート（高い方が上位）
      return scoreB.score - scoreA.score;
    });
  },

  /**
   * V1750: 価格順ソート（安い順 - 完全リニューアル）
   * 50万円以下除外 + データ優先順位: 3ヶ月平均 (100%) > 過去データ (40% × RANK × 返品ペナルティ) > デフォルト
   */
  sortByPrice: function(companies) {
    const RANK_WEIGHT = { 'S': 1.33, 'A': 1.16, 'B': 1.0, 'C': 0.90 };
    const HISTORICAL_WEIGHT = 0.4;
    const DEFAULT_AMOUNT = 1200000; // デフォルト価格: 120万円
    const MIN_THRESHOLD = 500000; // 50万円以下除外

    return companies.sort(function(a, b) {
      // V1750: 価格スコア計算（安い順なので昇順）
      const calculatePriceScore = function(company) {
        let baseScore = 0;
        let dataSource = '';

        // Priority 1: Recent 3-month average (100% weight)
        if (company.avgContractAmount > MIN_THRESHOLD) {
          baseScore = company.avgContractAmount;
          dataSource = '3M';
        }
        // Priority 2: Historical data (40% weight + RANK + return penalty)
        else if (company.pastGrossUnitAfterReturn > MIN_THRESHOLD) {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          const returnPenalty = Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3));
          baseScore = company.pastGrossUnitAfterReturn * HISTORICAL_WEIGHT * rankWeight * returnPenalty;
          dataSource = 'HIST*0.4*RANK*RET';
        }
        // Priority 3: Default
        else {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          baseScore = DEFAULT_AMOUNT * rankWeight;
          dataSource = 'DEFAULT';
        }

        return { score: baseScore, source: dataSource };
      };

      const scoreA = calculatePriceScore(a);
      const scoreB = calculatePriceScore(b);

      // 価格スコアで昇順ソート（安い方が上位）
      return scoreA.score - scoreB.score;
    });
  },

  /**
   * V1750: 口コミ順ソート（成約率順 - 完全リニューアル）
   * データ優先順位: 3ヶ月成約率 (100%) > 過去データ成約率 (40%) > デフォルト
   */
  sortByReview: function(companies) {
    const RANK_WEIGHT = { 'S': 1.33, 'A': 1.16, 'B': 1.0, 'C': 0.90 };
    const HISTORICAL_WEIGHT = 0.4;
    const DEFAULT_CONVERSION = 0.20; // デフォルト成約率: 20%

    return companies.sort(function(a, b) {
      // V1750: 成約率スコア計算
      const calculateConversionScore = function(company) {
        let baseScore = 0;
        let dataSource = '';

        // Priority 1: Recent 3-month conversion rate (100% weight)
        if (company.recent3MonthInquiryCount >= 5) {
          // 問合せ5件以上の場合のみ信頼できるデータとする
          baseScore = company.recent3MonthConversionRate;
          dataSource = '3M';
        }
        // Priority 2: Historical conversion rate (40% weight)
        else if (company.pastConversionRate > 0) {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          baseScore = company.pastConversionRate * HISTORICAL_WEIGHT * rankWeight;
          dataSource = 'HIST*0.4*RANK';
        }
        // Priority 3: Default
        else {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          baseScore = DEFAULT_CONVERSION * rankWeight;
          dataSource = 'DEFAULT';
        }

        return { score: baseScore, source: dataSource };
      };

      const scoreA = calculateConversionScore(a);
      const scoreB = calculateConversionScore(b);

      // 成約率スコアで降順ソート（高い方が上位）
      return scoreB.score - scoreA.score;
    });
  },

  /**
   * V1750: 高品質順ソート（高額順 - 完全リニューアル）
   * 50万円以下除外 + データ優先順位: 3ヶ月平均 (100%) > 過去データ (40% × RANK × 返品ペナルティ) > デフォルト
   */
  sortByRating: function(companies) {
    const RANK_WEIGHT = { 'S': 1.33, 'A': 1.16, 'B': 1.0, 'C': 0.90 };
    const HISTORICAL_WEIGHT = 0.4;
    const DEFAULT_AMOUNT = 1500000; // デフォルト価格: 150万円
    const MIN_THRESHOLD = 500000; // 50万円以下除外

    return companies.sort(function(a, b) {
      // V1750: 高品質スコア計算（高い順なので降順）
      const calculatePremiumScore = function(company) {
        let baseScore = 0;
        let dataSource = '';

        // Priority 1: Recent 3-month average (100% weight)
        if (company.avgContractAmount > MIN_THRESHOLD) {
          baseScore = company.avgContractAmount;
          dataSource = '3M';
        }
        // Priority 2: Historical data (40% weight + RANK + return penalty)
        else if (company.pastGrossUnitAfterReturn > MIN_THRESHOLD) {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          const returnPenalty = Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3));
          baseScore = company.pastGrossUnitAfterReturn * HISTORICAL_WEIGHT * rankWeight * returnPenalty;
          dataSource = 'HIST*0.4*RANK*RET';
        }
        // Priority 3: Default
        else {
          const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
          baseScore = DEFAULT_AMOUNT * rankWeight;
          dataSource = 'DEFAULT';
        }

        return { score: baseScore, source: dataSource };
      };

      const scoreA = calculatePremiumScore(a);
      const scoreB = calculatePremiumScore(b);

      // 高品質スコアで降順ソート（高い方が上位）
      return scoreB.score - scoreA.score;
    });
  },

  /**
   * V1713: ボーナス調整（ランク位置調整方式）
   * ソート後の配列に対して、優先エリア・デポジット・ハンデに基づいてランク位置を調整
   * @param {Array} companies - ソート済み業者配列
   * @return {Array} ボーナス調整後の業者配列
   */
  applyRankBonus: function(companies) {
    if (!companies || companies.length === 0) return companies;

    // 各業者に元の順位とボーナス値を付与
    const companiesWithBonus = companies.map(function(company, index) {
      var bonus = 0;

      // 優先エリア: +1ランク
      if (company.priorityArea === 'TRUE' || company.priorityArea === true) {
        bonus += 1;
      }

      // デポジット前金: +1ランク
      if (company.depositAdvance === 'TRUE' || company.depositAdvance === true) {
        bonus += 1;
      }

      // ハンデ: ±3ランク（数値）
      bonus += company.handicap;

      return {
        company: company,
        originalRank: index,
        bonus: bonus,
        adjustedRank: Math.max(0, index - bonus) // ボーナス分だけランクアップ（インデックスを減らす）
      };
    });

    // 調整後ランクでソート（同じ調整ランクの場合は元の順位を維持）
    companiesWithBonus.sort(function(a, b) {
      const rankDiff = a.adjustedRank - b.adjustedRank;
      if (rankDiff !== 0) return rankDiff;
      return a.originalRank - b.originalRank;
    });

    // company部分のみを返す
    return companiesWithBonus.map(function(item) {
      return item.company;
    });
  },

  /**
   * V1750: 過去データに基づく全メトリクスを取得（拡張版）
   * @param {string} companyName - 業者名
   * @return {Object} 過去データメトリクス
   */
  getPastDataMetrics: function(companyName) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const pastDataSheet = ss.getSheetByName('過去データ');

      if (!pastDataSheet) {
        console.log('[V1750] 過去データシートが見つかりません');
        return {
          rank: '',
          grossUnitAfterReturn: 0,
          returnRate: 0,
          conversionRate: 0,
          riskScore: 80
        };
      }

      const pastData = pastDataSheet.getDataRange().getValues();
      const headers = pastData[0];
      const rows = pastData.slice(1);

      // カラムインデックス（V1750: RANK・グロス単価返品後・返品率・成約率を追加）
      const colIndex = {
        companyName: headers.indexOf('業者名'),
        rank: headers.indexOf('RANK（〜23年6月）'),
        grossUnitAfterReturn: headers.indexOf('グロス単価返品後'),
        returnRate: headers.indexOf('返品率｜件数ベース'),
        conversionRate: headers.indexOf('成約率'),
        bankruptcyFlag: headers.indexOf('貸倒フラグ'),
        warningStatus: headers.indexOf('要注意先ステータス'),
        contractCount: headers.indexOf('成約件数'),
        hiddenContract: headers.indexOf('成約隠し件数'),
        unpaidRate: headers.indexOf('未入金発生率'),
        avgDelayPerInvoice: headers.indexOf('1請求あたり平均遅延日数'),
        complaintCount: headers.indexOf('ユーザークレーム回数')
      };

      // 業者名で検索
      const matchedRow = rows.find(function(row) {
        return row[colIndex.companyName] === companyName;
      });

      if (!matchedRow) {
        // 過去データなし = 新規業者
        return {
          rank: '',
          grossUnitAfterReturn: 0,
          returnRate: 0,
          conversionRate: 0,
          riskScore: 80
        };
      }

      // V1750: 過去データを解析
      const grossUnit = matchedRow[colIndex.grossUnitAfterReturn];
      const returnRateStr = matchedRow[colIndex.returnRate];
      const conversionRateStr = matchedRow[colIndex.conversionRate];

      // 数値変換（カンマ除去、%除去）
      const parseNumber = function(value) {
        if (!value) return 0;
        const str = value.toString().replace(/,/g, '').replace(/%/g, '');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };

      let grossUnitAfterReturn = parseNumber(grossUnit);
      let returnRate = parseNumber(returnRateStr);
      let conversionRate = parseNumber(conversionRateStr);

      // %表記の場合は100で割る（0-1の範囲に変換）
      if (returnRateStr && returnRateStr.toString().indexOf('%') !== -1) {
        returnRate = returnRate / 100;
      }
      if (conversionRateStr && conversionRateStr.toString().indexOf('%') !== -1) {
        conversionRate = conversionRate / 100;
      }

      // V1750: 異常値除外
      if (grossUnitAfterReturn > 200000) {
        // 20万円以上は異常値として0扱い
        grossUnitAfterReturn = 0;
      }
      if (conversionRate > 0.6) {
        // 60%超は異常値として0扱い
        conversionRate = 0;
      }

      return {
        rank: matchedRow[colIndex.rank] || '',
        grossUnitAfterReturn: grossUnitAfterReturn,
        returnRate: returnRate,
        conversionRate: conversionRate,
        riskScore: this.calculateRiskScoreV1712(matchedRow, colIndex)
      };

    } catch (err) {
      console.error('[V1750] 過去データ取得エラー:', err);
      return {
        rank: '',
        grossUnitAfterReturn: 0,
        returnRate: 0,
        conversionRate: 0,
        riskScore: 80
      };
    }
  },

  /**
   * V1712: 過去データに基づくリスクスコアを取得（互換性のため残す）
   * @param {string} companyName - 業者名
   * @return {number} リスクスコア (0-100, 100が最良)
   */
  getPastDataRiskScore: function(companyName) {
    const metrics = this.getPastDataMetrics(companyName);
    return metrics.riskScore;
  },

  /**
   * V1712: リスクスコア計算（V1711閾値に基づく）
   * @param {Array} row - 過去データの行
   * @param {Object} colIndex - カラムインデックス
   * @return {number} リスクスコア (0-100)
   */
  calculateRiskScoreV1712: function(row, colIndex) {
    let score = 100; // 満点からスタート

    // 1. 貸倒フラグ（即座に0点）- V1708
    const bankruptcy = row[colIndex.bankruptcyFlag];
    if (bankruptcy === true || bankruptcy === 'TRUE' || bankruptcy === '○' || bankruptcy === 'YES') {
      return 0;
    }

    // 2. 要注意先ステータス（-20点）- V1708
    const warning = row[colIndex.warningStatus];
    if (warning && warning !== '' && warning !== '-') {
      score -= 20;
    }

    // 3. 平均遅延日数（最優先）- V1711
    const avgDelay = parseFloat(row[colIndex.avgDelayPerInvoice]) || 0;
    if (avgDelay >= 15) {
      score -= 40; // 重大（criticalLevel 3）
    } else if (avgDelay >= 10) {
      score -= 25; // 警告（criticalLevel 2）
    } else if (avgDelay >= 5) {
      score -= 10; // 注意（criticalLevel 1）
    }
    // 5日未満は減点なし（許容範囲）

    // 4. 未入金発生率（参考程度）- V1711
    const unpaidRate = parseFloat(row[colIndex.unpaidRate]) || 0;
    score -= Math.min(unpaidRate / 10, 10); // 最大-10点（100%でも-10点のみ）

    // 5. 成約隠し率（-20点まで）- V1708
    const contractCount = parseFloat(row[colIndex.contractCount]) || 0;
    const hiddenCount = parseFloat(row[colIndex.hiddenContract]) || 0;
    if (contractCount > 0 && hiddenCount > 0) {
      const hiddenRate = (hiddenCount / contractCount) * 100;
      score -= Math.min(hiddenRate / 5, 20); // 100%で-20点
    }

    // 6. クレーム件数（1件で-5点）- V1708
    const complaints = parseFloat(row[colIndex.complaintCount]) || 0;
    score -= complaints * 5;

    // 0点未満にはしない
    return Math.max(score, 0);
  }
};
