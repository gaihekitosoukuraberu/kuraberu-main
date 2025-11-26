/**
 * ============================================
 * RankingSystem.gs
 * ============================================
 *
 * 目的: LP向けランキング取得システム（AISearchSystemから分離）
 * 依存: 加盟店マスタ、過去データシート
 * 作成: V1713
 * 更新: V1765 - 総合スコア動的参照確認（AC列から読み取り）
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

      // V1830: 気になる箇所（単品 vs 複合工事判定用）
      const concernedArea = params.concernedArea || '';
      console.log('[RankingSystem] 材質・工事内容:', { wallMaterial, roofMaterial, wallWorkType, roofWorkType });
      console.log('[RankingSystem] 築年数:', { buildingAgeMin, buildingAgeMax });
      console.log('[RankingSystem] 気になる箇所:', concernedArea);

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

      // カラムインデックス取得（V1707: 対応築年数追加 / V1713: ボーナス・フラグ追加 / V1750: 3ヶ月データ追加 / V1751: 加盟日追加 / V1754: 総合スコア追加）
      const colIndex = {
        companyName: masterHeaders.indexOf('会社名'),
        prefecture: masterHeaders.indexOf('対応都道府県'),
        cities: masterHeaders.indexOf('対応市区町村'),
        approvalStatus: masterHeaders.indexOf('承認ステータス'),
        deliveryStatus: masterHeaders.indexOf('配信ステータス'),
        avgContractAmount: masterHeaders.indexOf('直近3ヶ月_平均成約金額'),
        rating: masterHeaders.indexOf('総合スコア'),
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
        joinDate: masterHeaders.indexOf('加盟日'),
        // V1766: プレビューHP追加（詳細モーダル用）
        previewHP: masterHeaders.indexOf('プレビューHP'),
        // V1891: 特殊対応項目追加（Admin Dashboardマッチ度計算用）
        specialSupport: masterHeaders.indexOf('特殊対応項目'),
        // V1899: 物件種別・階数追加（マッチ度計算強化）
        maxFloors: masterHeaders.indexOf('最大対応階数')
      };

      // V1713-DEBUG: カラムインデックス検証
      console.log('[V1713-DEBUG] カラムインデックス:', JSON.stringify(colIndex));

      // V1765: 総合スコア列の確認
      console.log('[V1765-DEBUG] 総合スコア列インデックス:', colIndex.rating);
      console.log('[V1765-DEBUG] ヘッダー配列:', JSON.stringify(masterHeaders));

      // V1834-DEBUG: プレビューHP列の詳細デバッグ
      console.log('[V1834-DEBUG] プレビューHP列インデックス:', colIndex.previewHP);
      console.log('[V1834-DEBUG] マスターヘッダー配列長:', masterHeaders.length);
      console.log('[V1834-DEBUG] getLastColumn():', masterSheet.getLastColumn());
      console.log('[V1834-DEBUG] AD列(index 29)のヘッダー:', masterHeaders[29]);
      console.log('[V1834-DEBUG] 列25-35のヘッダー:', JSON.stringify(masterHeaders.slice(25, 35)));

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
      let filtered = [];  // V1833-FIX: フォールバック処理で再代入するためletに変更

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

        // ステータスチェック（承認済み + 配信停止以外 + サイレントフラグOFF）（V1893修正）
        if (approvalStatus !== '承認済み') {
          filterStats.rejectedByApproval++;
          continue;
        }
        if (deliveryStatus === '配信停止' || deliveryStatus === '強制停止') {
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

        // V1830: 工事種別チェック（単品 vs 複合工事対応）
        // constructionTypesには「外壁塗装,屋根塗装（外壁工事含む）,屋根塗装単品」のようにカンマ区切りで格納
        let constructionTypeMatch = true;

        // 単品か複合工事かを判定
        const isCombinedWork = concernedArea === '外壁と屋根';
        const isWallOnly = concernedArea === '外壁';
        const isRoofOnly = concernedArea === '屋根';

        // 外壁工事内容チェック（Q9）
        // concernedArea="屋根"の場合は外壁工事チェックをスキップ
        if (wallWorkType && constructionTypes && constructionTypeMatch && !isRoofOnly) {
          let requiredType = '';

          if (wallWorkType.indexOf('塗装') !== -1) {
            // 外壁塗装は常に標準版（単品なし）
            requiredType = '外壁塗装';
          } else if (wallWorkType.indexOf('張替え') !== -1 || wallWorkType.indexOf('張り替え') !== -1) {
            // 外壁張替えは常に標準版（単品なし）
            requiredType = '外壁張替え';
          } else if (wallWorkType.indexOf('カバー工法') !== -1) {
            // 外壁カバー工法は常に標準版（単品なし）
            requiredType = '外壁カバー工法';
          } else if (wallWorkType.indexOf('補修') !== -1) {
            // 外壁補修: 複合工事なら（外壁工事含む）、単品なら単品
            if (isCombinedWork) {
              requiredType = '外壁補修（外壁工事含む）';
            } else {
              requiredType = '外壁補修単品';
            }
          } else if (wallWorkType.indexOf('不明') !== -1) {
            requiredType = '外壁不明';
          }

          if (requiredType && constructionTypes.indexOf(requiredType) === -1) {
            constructionTypeMatch = false;
          }
        }

        // 屋根工事内容チェック（Q10）
        // concernedArea="外壁"の場合は屋根工事チェックをスキップ
        if (roofWorkType && constructionTypes && constructionTypeMatch && !isWallOnly) {
          let requiredType = '';

          if (roofWorkType.indexOf('塗装') !== -1) {
            // 屋根塗装: 複合工事なら（外壁工事含む）、屋根のみなら単品
            if (isCombinedWork) {
              requiredType = '屋根塗装（外壁工事含む）';
            } else if (isRoofOnly) {
              requiredType = '屋根塗装単品';
            } else {
              // concernedArea="その他"の場合は両方チェック
              if (constructionTypes.indexOf('屋根塗装（外壁工事含む）') === -1 &&
                  constructionTypes.indexOf('屋根塗装単品') === -1) {
                constructionTypeMatch = false;
              }
            }
          } else if (roofWorkType.indexOf('葺き替え') !== -1 || roofWorkType.indexOf('葺替え') !== -1) {
            // 屋根葺き替えは常に標準版（単品なし、「含む」なし）
            // Q7の屋根材質で判定（瓦 or スレート等）
            if (roofMaterial && roofMaterial.indexOf('瓦') !== -1) {
              requiredType = '屋根葺き替え・張り替え※現状が瓦';
            } else {
              requiredType = '屋根葺き替え・張り替え※現状がスレート・ガルバリウム等';
            }
          } else if (roofWorkType.indexOf('カバー工法') !== -1) {
            // 屋根カバー工法は常に標準版（単品なし、「含む」なし）
            requiredType = '屋根カバー工法';
          } else if (roofWorkType.indexOf('補修') !== -1) {
            // 屋根補修: 複合工事なら（外壁工事含む）、屋根のみなら単品
            if (isCombinedWork) {
              requiredType = '屋根補修（外壁工事含む）';
            } else if (isRoofOnly) {
              requiredType = '屋根補修単品';
            } else {
              // concernedArea="その他"の場合は両方チェック
              if (constructionTypes.indexOf('屋根補修（外壁工事含む）') === -1 &&
                  constructionTypes.indexOf('屋根補修単品') === -1) {
                constructionTypeMatch = false;
              }
            }
          } else if (roofWorkType.indexOf('屋上防水') !== -1) {
            // 屋上防水: 複合工事なら（外壁工事含む）、屋根のみなら単品
            if (isCombinedWork) {
              requiredType = '屋上防水（外壁工事含む）';
            } else if (isRoofOnly) {
              requiredType = '屋上防水単品';
            } else {
              // concernedArea="その他"の場合は両方チェック
              if (constructionTypes.indexOf('屋上防水（外壁工事含む）') === -1 &&
                  constructionTypes.indexOf('屋上防水単品') === -1) {
                constructionTypeMatch = false;
              }
            }
          } else if (roofWorkType.indexOf('不明') !== -1) {
            requiredType = '屋根不明';
          }

          if (requiredType && constructionTypes.indexOf(requiredType) === -1) {
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

        // V1765: 総合スコア取得デバッグ
        const ratingValue = row[colIndex.rating];
        console.log('[V1765-DEBUG] 会社:', companyName, '/ colIndex.rating:', colIndex.rating, '/ AC列の値:', ratingValue, '/ 型:', typeof ratingValue);

        // 値が空の場合デフォルト値を設定
        const finalRating = ratingValue || 4.2;

        // V1896: マッチ度計算（LP用 - リクエストパラメータから計算）
        const userParams = {
          prefecture: prefecture,
          city: city,
          wallWorkType: wallWorkType,
          roofWorkType: roofWorkType,
          concernedArea: concernedArea,
          buildingAgeMin: buildingAgeMin,
          buildingAgeMax: buildingAgeMax
          // propertyTypeとfloorsはLPで収集していないため省略（calculateMatchRate内でデフォルト満点処理）
        };
        const matchRate = this.calculateMatchRate({
          prefecture: prefectures,
          cities: cities,
          constructionTypes: constructionTypes,
          buildingAgeMin: merchantAgeMin,
          buildingAgeMax: merchantAgeMax,
          maxFloors: row[colIndex.maxFloors] || ''
        }, userParams);

        // すべての条件を満たした業者を追加（V1751: 加盟日 + データ移行システム / V1896: マッチ度追加）
        filterStats.passed++;
        filtered.push({
          companyName: companyName,
          avgContractAmount: recent3MonthAvgAmount,
          rating: finalRating,
          reviewCount: row[colIndex.reviewCount] || 0,
          prefecture: prefectures, // V1894: 業者の対応都道府県（元データ）を追加
          city: city, // V1894: リクエストから計算された市区町村
          cities: cities, // V1894: 業者の対応市区町村（元データ、カンマ区切り）を追加
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
          specialSupport: row[colIndex.specialSupport] || '',
          maxFloors: row[colIndex.maxFloors] || '', // V1895: 最大対応階数（物件種別と階数を含む）
          matchRate: matchRate, // V1896: マッチ度（0-100）
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
          pastContractCount: pastDataMetrics.contractCount, // V1751: 過去データ件数追加
          // V1751: 加盟日追加
          joinDate: joinDate,
          // V1766: プレビューHP追加
          previewHP: row[colIndex.previewHP] || ''
        });

        // V1834-DEBUG: 最初の3社のプレビューHP値をログ出力
        if (filtered.length <= 3) {
          console.log('[V1834-DEBUG] 会社:', companyName, '/ colIndex.previewHP:', colIndex.previewHP, '/ row長:', row.length, '/ row[29]:', row[29], '/ previewHP値:', row[colIndex.previewHP]);
        }
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

      // V1833: フォールバック処理 - 0件の場合は条件を緩めて再取得
      if (filtered.length === 0 && (city || prefecture)) {
        console.warn('[RankingSystem] ⚠️ フィルタ結果が0件 - フォールバック処理開始');

        // ステップ1: 市区町村条件を外して都道府県のみでフィルタ
        if (city) {
          console.log('[RankingSystem] 🔄 ステップ1: 市区町村条件を外して都道府県のみで再検索');
          const self = this; // V1896: calculateMatchRate用
          filtered = allData.filter(function(row) {
            const merchantPrefecture = row[colIndex.prefecture] || '';
            const approvalStatus = row[colIndex.approvalStatus] || '';
            const deliveryStatus = row[colIndex.deliveryStatus] || '';
            const silentFlag = row[colIndex.silentFlag] || '';

            // 基本条件のみチェック
            if (approvalStatus !== '承認済み') return false;
            if (deliveryStatus === '配信停止' || deliveryStatus === '強制停止') return false;
            if (silentFlag === 'TRUE' || silentFlag === true) return false;
            if (prefecture && merchantPrefecture !== prefecture) return false;

            return true;
          }).map(function(row) {
            const companyName = row[colIndex.companyName] || '';
            const pastDataMetrics = getPastDataMetrics(companyName);
            const priorityArea = row[colIndex.priorityArea] || '';
            const handicap = parseInt(row[colIndex.handicap]) || 0;
            const depositAdvance = row[colIndex.depositAdvance] || '';
            const prioritySupplyFlag = row[colIndex.prioritySupplyFlag] || '';
            const recent3MonthRevenue = parseNumber(row[colIndex.recent3MonthRevenue]);
            const recent3MonthInquiryCount = parseNumber(row[colIndex.recent3MonthInquiryCount]);
            const recent3MonthContractCount = parseNumber(row[colIndex.contractCount]);
            const recent3MonthAvgAmount = parseNumber(row[colIndex.avgContractAmount]);
            const recent3MonthConversionRate = recent3MonthInquiryCount > 0
              ? (recent3MonthContractCount / recent3MonthInquiryCount)
              : 0;

            // V1896: マッチ度計算（フォールバックステップ1）
            const userParams = {
              prefecture: prefecture,
              city: city,
              wallWorkType: wallWorkType,
              roofWorkType: roofWorkType,
              concernedArea: concernedArea,
              buildingAgeMin: buildingAgeMin,
              buildingAgeMax: buildingAgeMax
            };
            const matchRate = self.calculateMatchRate({
              prefecture: row[colIndex.prefecture] || '',
              cities: row[colIndex.cities] || '',
              constructionTypes: row[colIndex.constructionTypes] || '',
              buildingAgeMin: row[colIndex.buildingAgeMin] || 0,
              buildingAgeMax: row[colIndex.buildingAgeMax] || 100,
              maxFloors: row[colIndex.maxFloors] || ''
            }, userParams);

            return {
              companyName: companyName,
              avgContractAmount: recent3MonthAvgAmount,
              rating: row[colIndex.rating] || 4.2,
              reviewCount: row[colIndex.reviewCount] || 0,
              prefecture: row[colIndex.prefecture] || '',
              city: row[colIndex.cities] ? row[colIndex.cities].split(',')[0].trim() : '',
              cities: row[colIndex.cities] || '', // V1894: 対応市区町村（カンマ区切り）を追加
              constructionTypes: row[colIndex.constructionTypes] || '',
              specialSupport: row[colIndex.specialSupport] || '', // V1894: 特殊対応項目を追加
              maxFloors: row[colIndex.maxFloors] || '', // V1895: 最大対応階数（物件種別と階数を含む）
              matchRate: matchRate, // V1896: マッチ度（0-100）
              priorityArea: priorityArea,
              handicap: handicap,
              depositAdvance: depositAdvance,
              prioritySupplyFlag: prioritySupplyFlag,
              contractCount: recent3MonthContractCount,
              recent3MonthRevenue: recent3MonthRevenue,
              recent3MonthInquiryCount: recent3MonthInquiryCount,
              recent3MonthConversionRate: recent3MonthConversionRate,
              pastRank: pastDataMetrics.rank,
              pastGrossUnitAfterReturn: pastDataMetrics.grossUnitAfterReturn,
              pastReturnRate: pastDataMetrics.returnRate,
              pastConversionRate: pastDataMetrics.conversionRate,
              pastContractCount: pastDataMetrics.contractCount,
              riskScore: pastDataMetrics.riskScore,
              isCompleteMatch: false,
              buildingAgeMatchScore: 0,
              joinDate: row[colIndex.joinDate] || '',
              previewHP: row[colIndex.previewHP] || '' // V1894: プレビューHPを追加
            };
          });
          console.log('[RankingSystem] 🔄 ステップ1結果: ' + filtered.length + '件');
        }

        // ステップ2: それでも0件なら全国ではなくエリア未設定の業者を含める
        if (filtered.length === 0 && prefecture) {
          console.log('[RankingSystem] 🔄 ステップ2: 都道府県内で工事種別条件を外して再検索');
          const self = this; // V1896: calculateMatchRate用
          filtered = allData.filter(function(row) {
            const merchantPrefecture = row[colIndex.prefecture] || '';
            const approvalStatus = row[colIndex.approvalStatus] || '';
            const deliveryStatus = row[colIndex.deliveryStatus] || '';
            const silentFlag = row[colIndex.silentFlag] || '';

            // 基本条件のみチェック（都道府県は維持）
            if (approvalStatus !== '承認済み') return false;
            if (deliveryStatus === '配信停止' || deliveryStatus === '強制停止') return false;
            if (silentFlag === 'TRUE' || silentFlag === true) return false;

            // 都道府県が一致するか、空（全国対応）の業者
            if (merchantPrefecture && merchantPrefecture !== prefecture) return false;

            return true;
          }).map(function(row) {
            const companyName = row[colIndex.companyName] || '';
            const pastDataMetrics = getPastDataMetrics(companyName);
            const priorityArea = row[colIndex.priorityArea] || '';
            const handicap = parseInt(row[colIndex.handicap]) || 0;
            const depositAdvance = row[colIndex.depositAdvance] || '';
            const prioritySupplyFlag = row[colIndex.prioritySupplyFlag] || '';
            const recent3MonthRevenue = parseNumber(row[colIndex.recent3MonthRevenue]);
            const recent3MonthInquiryCount = parseNumber(row[colIndex.recent3MonthInquiryCount]);
            const recent3MonthContractCount = parseNumber(row[colIndex.contractCount]);
            const recent3MonthAvgAmount = parseNumber(row[colIndex.avgContractAmount]);
            const recent3MonthConversionRate = recent3MonthInquiryCount > 0
              ? (recent3MonthContractCount / recent3MonthInquiryCount)
              : 0;

            // V1896: マッチ度計算（フォールバックステップ2）
            const userParams = {
              prefecture: prefecture,
              city: city,
              wallWorkType: wallWorkType,
              roofWorkType: roofWorkType,
              concernedArea: concernedArea,
              buildingAgeMin: buildingAgeMin,
              buildingAgeMax: buildingAgeMax
            };
            const matchRate = self.calculateMatchRate({
              prefecture: row[colIndex.prefecture] || '',
              cities: row[colIndex.cities] || '',
              constructionTypes: row[colIndex.constructionTypes] || '',
              buildingAgeMin: row[colIndex.buildingAgeMin] || 0,
              buildingAgeMax: row[colIndex.buildingAgeMax] || 100,
              maxFloors: row[colIndex.maxFloors] || ''
            }, userParams);

            return {
              companyName: companyName,
              avgContractAmount: recent3MonthAvgAmount,
              rating: row[colIndex.rating] || 4.2,
              reviewCount: row[colIndex.reviewCount] || 0,
              prefecture: row[colIndex.prefecture] || '',
              city: row[colIndex.cities] ? row[colIndex.cities].split(',')[0].trim() : '',
              cities: row[colIndex.cities] || '', // V1894: 対応市区町村（カンマ区切り）を追加
              constructionTypes: row[colIndex.constructionTypes] || '',
              specialSupport: row[colIndex.specialSupport] || '', // V1894: 特殊対応項目を追加
              maxFloors: row[colIndex.maxFloors] || '', // V1895: 最大対応階数（物件種別と階数を含む）
              matchRate: matchRate, // V1896: マッチ度（0-100）
              priorityArea: priorityArea,
              handicap: handicap,
              depositAdvance: depositAdvance,
              prioritySupplyFlag: prioritySupplyFlag,
              contractCount: recent3MonthContractCount,
              recent3MonthRevenue: recent3MonthRevenue,
              recent3MonthInquiryCount: recent3MonthInquiryCount,
              recent3MonthConversionRate: recent3MonthConversionRate,
              pastRank: pastDataMetrics.rank,
              pastGrossUnitAfterReturn: pastDataMetrics.grossUnitAfterReturn,
              pastReturnRate: pastDataMetrics.returnRate,
              pastConversionRate: pastDataMetrics.conversionRate,
              pastContractCount: pastDataMetrics.contractCount,
              riskScore: pastDataMetrics.riskScore,
              isCompleteMatch: false,
              buildingAgeMatchScore: 0,
              joinDate: row[colIndex.joinDate] || '',
              previewHP: row[colIndex.previewHP] || '' // V1894: プレビューHPを追加
            };
          });
          console.log('[RankingSystem] 🔄 ステップ2結果: ' + filtered.length + '件（都道府県内・工事種別条件なし）');
        }
      }

      // 4つのソート順で並べ替え（V1828: 優先エリア3箇所選択式に修正）
      const rankings = {
        cheap: this.applyRankBonus(this.sortByPrice(filtered.slice(), city), city).slice(0, 8),
        recommended: this.applyRankBonus(this.sortByMatchScore(filtered.slice(), city), city).slice(0, 8),
        review: this.applyRankBonus(this.sortByReview(filtered.slice(), city), city).slice(0, 8),
        premium: this.applyRankBonus(this.sortByRating(filtered.slice(), city), city).slice(0, 8)
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
   * V1751: 加盟日から経過月数を計算
   * @param {string} joinDate - 加盟日（例: 2025/11/12 0:38:08）
   * @return {number} 経過月数（0〜99）
   */
  calculateDataMonths: function(joinDate) {
    if (!joinDate) return 0;

    try {
      const join = new Date(joinDate);
      const now = new Date();

      // 月数の差分を計算
      const yearDiff = now.getFullYear() - join.getFullYear();
      const monthDiff = now.getMonth() - join.getMonth();
      const totalMonths = yearDiff * 12 + monthDiff;

      return Math.max(0, totalMonths);
    } catch (err) {
      console.error('[V1751] 加盟日パースエラー:', err);
      return 0;
    }
  },

  /**
   * V1751: データ混合スコア計算（完全件数ベース: 実データ×3倍の価値）
   * 例: 過去100件/実30件 → 100 vs 90 = 53%:47%、過去100件/実100件 → 100 vs 300 = 25%:75% (1:3)
   * @param {Object} company - 業者オブジェクト
   * @param {number} recentValue - 3ヶ月データの値
   * @param {number} historicalValue - 過去データの値
   * @param {number} defaultValue - デフォルト値
   * @param {Object} options - オプション（recentCount, historicalCount, minThreshold等）
   * @return {Object} { score, source, recentWeight, historicalWeight }
   */
  calculateMixedScore: function(company, recentValue, historicalValue, defaultValue, options) {
    const RANK_WEIGHT = { 'S': 1.33, 'A': 1.16, 'B': 1.0, 'C': 0.90 };
    const RECENT_MULTIPLIER = 3.0; // 実データは過去データの3倍の価値
    const MIN_DATA_MONTHS = 2; // 加盟2ヶ月未満は実データ使わない（購入データ反映まで約2ヶ月）

    const rankWeight = RANK_WEIGHT[company.pastRank] || 1.0;
    const returnPenalty = options.returnPenalty !== undefined
      ? options.returnPenalty
      : Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3));
    const minThreshold = options.minThreshold || 0;
    const recentCount = options.recentCount || 0; // 実データの件数
    const historicalCount = options.historicalCount || 0; // 過去データの件数

    // 経過月数計算（加盟1ヶ月未満チェック用）
    const dataMonths = this.calculateDataMonths(company.joinDate);
    const canUseRecentData = dataMonths >= MIN_DATA_MONTHS;

    // V1751: 完全件数ベース重み付け（実データ×3倍）
    let finalRecentWeight = 0;
    let finalHistoricalWeight = 1.0;

    const hasRecentData = canUseRecentData && recentValue > minThreshold && recentCount > 0;
    const hasHistoricalData = historicalValue > minThreshold && historicalCount > 0;

    if (hasRecentData && hasHistoricalData) {
      // 両方あり: 完全件数ベース（実データ×3倍）
      const adjustedRecentCount = recentCount * RECENT_MULTIPLIER;
      const totalWeight = adjustedRecentCount + historicalCount;
      if (totalWeight > 0) {
        finalRecentWeight = adjustedRecentCount / totalWeight;
        finalHistoricalWeight = historicalCount / totalWeight;
      }
    } else if (hasRecentData) {
      // 実データのみ: 100%
      finalRecentWeight = 1.0;
      finalHistoricalWeight = 0;
    } else if (hasHistoricalData) {
      // 過去データのみ: 100%
      finalRecentWeight = 0;
      finalHistoricalWeight = 1.0;
    }

    let baseScore = 0;
    let dataSource = '';

    if (hasRecentData && hasHistoricalData) {
      // 両方あり: 件数ベースで重み付けして混合
      const recentScore = recentValue * finalRecentWeight;
      const historicalScore = historicalValue * finalHistoricalWeight * rankWeight * returnPenalty;
      baseScore = recentScore + historicalScore;
      dataSource = 'MIX[R' + recentCount + ':' + Math.round(finalRecentWeight * 100) + '%+H' + historicalCount + ':' + Math.round(finalHistoricalWeight * 100) + '%]';
    } else if (hasRecentData) {
      // 実データのみ
      baseScore = recentValue;
      dataSource = '3M[' + recentCount + '件]';
    } else if (hasHistoricalData) {
      // 過去データのみ
      baseScore = historicalValue * rankWeight * returnPenalty;
      dataSource = 'HIST[' + historicalCount + '件*RANK*RET]';
    } else {
      // どちらもなし: デフォルト
      baseScore = defaultValue * rankWeight;
      dataSource = 'DEFAULT*RANK';
    }

    return {
      score: baseScore,
      source: dataSource,
      recentWeight: finalRecentWeight,
      historicalWeight: finalHistoricalWeight
    };
  },

  /**
   * V1896: マッチ度計算（LP用 - 100点満点）
   * @param {Object} franchise - 業者オブジェクト
   * @param {Object} userParams - ユーザーパラメータ（prefecture, city, wallWorkType, roofWorkType, concernedArea, buildingAgeMin, buildingAgeMax, propertyType, floors）
   * @return {number} マッチ度スコア（0-100）
   */
  calculateMatchRate: function(franchise, userParams) {
    let totalScore = 0;

    // 1. エリアマッチ（20点）
    let areaScore = 0;
    if (userParams.prefecture && franchise.prefecture) {
      const prefectures = franchise.prefecture.split(',').map(function(p) { return p.trim(); });
      if (prefectures.indexOf(userParams.prefecture) !== -1) {
        areaScore = 10; // 都道府県一致で10点

        // 市区町村も一致する場合は+10点
        if (userParams.city && franchise.cities) {
          const cities = franchise.cities.split(',').map(function(c) { return c.trim(); });
          if (cities.indexOf(userParams.city) !== -1) {
            areaScore = 20; // 都道府県+市区町村一致で20点
          }
        }
      }
    }
    totalScore += areaScore;

    // 2. 工事種別マッチ（40点）
    let workScore = 0;
    if (franchise.constructionTypes) {
      const constructionTypes = franchise.constructionTypes;
      let matchCount = 0;
      let totalChecks = 0;

      // 外壁工事チェック
      if (userParams.wallWorkType) {
        totalChecks++;
        if (constructionTypes.indexOf(userParams.wallWorkType) !== -1 ||
            constructionTypes.indexOf('外壁塗装') !== -1 ||
            constructionTypes.indexOf('外壁張替え') !== -1 ||
            constructionTypes.indexOf('外壁カバー工法') !== -1 ||
            constructionTypes.indexOf('外壁補修') !== -1) {
          matchCount++;
        }
      }

      // 屋根工事チェック
      if (userParams.roofWorkType) {
        totalChecks++;
        if (constructionTypes.indexOf(userParams.roofWorkType) !== -1 ||
            constructionTypes.indexOf('屋根塗装') !== -1 ||
            constructionTypes.indexOf('屋根葺き替え') !== -1 ||
            constructionTypes.indexOf('屋根カバー工法') !== -1 ||
            constructionTypes.indexOf('屋根補修') !== -1 ||
            constructionTypes.indexOf('屋上防水') !== -1) {
          matchCount++;
        }
      }

      // マッチ率を計算（工事種別は最大40点）
      if (totalChecks > 0) {
        workScore = Math.floor((matchCount / totalChecks) * 40);
      }
    }
    totalScore += workScore;

    // 3. 築年数マッチ（15点）
    let ageScore = 0;
    if (userParams.buildingAgeMin !== undefined && userParams.buildingAgeMax !== undefined) {
      // 新しいbuildingAgeRange形式を優先的にチェック
      if (franchise.buildingAgeRange) {
        const range = this.parseBuildingAgeRange(franchise.buildingAgeRange);
        const franchiseMin = range.min;
        const franchiseMax = range.max;

        // 範囲の重複チェック
        const overlapMin = Math.max(userParams.buildingAgeMin, franchiseMin);
        const overlapMax = Math.min(userParams.buildingAgeMax, franchiseMax);

        if (overlapMin <= overlapMax) {
          // 重複あり: 重複範囲 / ユーザー範囲 で割合を計算
          const overlapSize = overlapMax - overlapMin;
          const userRangeSize = userParams.buildingAgeMax - userParams.buildingAgeMin;
          const matchRatio = userRangeSize > 0 ? (overlapSize / userRangeSize) : 1;
          ageScore = Math.floor(matchRatio * 15);
        }
      } else if (franchise.buildingAgeMin !== undefined && franchise.buildingAgeMax !== undefined) {
        // 旧形式の築年数範囲
        const franchiseMin = franchise.buildingAgeMin;
        const franchiseMax = franchise.buildingAgeMax;

        const overlapMin = Math.max(userParams.buildingAgeMin, franchiseMin);
        const overlapMax = Math.min(userParams.buildingAgeMax, franchiseMax);

        if (overlapMin <= overlapMax) {
          const overlapSize = overlapMax - overlapMin;
          const userRangeSize = userParams.buildingAgeMax - userParams.buildingAgeMin;
          const matchRatio = userRangeSize > 0 ? (overlapSize / userRangeSize) : 1;
          ageScore = Math.floor(matchRatio * 15);
        }
      }
    }
    totalScore += ageScore;

    // 4. 物件種別マッチ（15点）
    // LPでは物件種別を収集していないため、データがある場合のみチェック
    let propertyScore = 15; // デフォルトは満点（データなし = マッチとみなす）
    if (userParams.propertyType && franchise.maxFloors) {
      const parsed = this.parseMaxFloorsData(franchise.maxFloors);
      if (parsed.propertyTypes.indexOf(userParams.propertyType) !== -1) {
        propertyScore = 15;
      } else {
        propertyScore = 0;
      }
    }
    totalScore += propertyScore;

    // 5. 階数マッチ（10点）
    // LPでは階数を収集していないため、データがある場合のみチェック
    let floorsScore = 10; // デフォルトは満点（データなし = マッチとみなす）
    if (userParams.floors && userParams.propertyType && franchise.maxFloors) {
      const parsed = this.parseMaxFloorsData(franchise.maxFloors);
      const maxFloors = parsed.floorsMap[userParams.propertyType];
      if (maxFloors !== undefined && userParams.floors <= maxFloors) {
        floorsScore = 10;
      } else if (maxFloors === undefined) {
        floorsScore = 10; // 物件種別の階数制限なし = マッチ
      } else {
        floorsScore = 0;
      }
    }
    totalScore += floorsScore;

    return totalScore;
  },

  /**
   * V1896: 築年数範囲パース（buildingAgeRange形式）
   * @param {string} range - "{min=0, max=95}" 形式
   * @return {Object} { min, max }
   */
  parseBuildingAgeRange: function(range) {
    if (!range) return { min: 0, max: 100 };

    const minMatch = range.match(/min=(\d+)/);
    const maxMatch = range.match(/max=(\d+)/);

    return {
      min: minMatch ? parseInt(minMatch[1]) : 0,
      max: maxMatch ? parseInt(maxMatch[1]) : 100
    };
  },

  /**
   * V1896: 最大対応階数パース（maxFloors形式）
   * @param {string} maxFloorsStr - "戸建て住宅(4階以上まで),アパート・マンション(3階まで)" 形式
   * @return {Object} { propertyTypes: [], floorsMap: {} }
   */
  parseMaxFloorsData: function(maxFloorsStr) {
    const propertyTypes = [];
    const floorsMap = {};

    if (!maxFloorsStr) return { propertyTypes: propertyTypes, floorsMap: floorsMap };

    const items = maxFloorsStr.split(',').map(function(item) { return item.trim(); });

    for (var i = 0; i < items.length; i++) {
      const item = items[i];
      const match = item.match(/^(.+?)\((.+?)\)$/);
      if (match) {
        const propertyType = match[1].trim();
        const floorsText = match[2].trim();
        propertyTypes.push(propertyType);

        // "4階以上まで" or "3階まで" のパース
        const floorsMatch = floorsText.match(/(\d+)階/);
        if (floorsMatch) {
          const floors = parseInt(floorsMatch[1]);
          if (floorsText.indexOf('以上') !== -1) {
            // "4階以上まで" = 4階以上対応可能
            floorsMap[propertyType] = 999; // 制限なし
          } else {
            // "3階まで" = 3階まで対応可能
            floorsMap[propertyType] = floors;
          }
        }
      }
    }

    return { propertyTypes: propertyTypes, floorsMap: floorsMap };
  },

  /**
   * V1751: 距離ボーナス計算（同じ市区町村で15%アップ）
   * @param {Object} company - 業者オブジェクト
   * @param {string} userCity - ユーザーの市区町村
   * @return {number} ボーナス係数（1.0 = ボーナスなし、1.15 = 15%アップ）
   */
  calculateDistanceBonus: function(company, userCity) {
    if (!userCity || !company.city) return 1.0;

    // 同じ市区町村の場合15%ボーナス
    if (company.city === userCity) {
      return 1.15;
    }

    return 1.0;
  },

  /**
   * V1751: 日替わりローテーション計算（±10%の揺らぎ）
   * @param {string} companyName - 業者名
   * @return {number} ローテーション係数（0.9〜1.1）
   */
  calculateDailyRotation: function(companyName) {
    if (!companyName) return 1.0;

    // 今日の日付から日数を取得
    const today = new Date();
    const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));

    // 業者名の文字コード合計
    let nameHash = 0;
    for (let i = 0; i < companyName.length; i++) {
      nameHash += companyName.charCodeAt(i);
    }

    // 疑似乱数生成（0〜100の範囲）
    const seed = (nameHash * 31 + dayNumber) % 100;

    // ±10%の範囲に変換（0.9〜1.1）
    const rotation = 0.9 + (seed / 100) * 0.2;

    return rotation;
  },

  /**
   * V1751: 供給数ボーナス計算（月間問合せ数に応じた調整）
   * 問合せ数が少ない業者ほどボーナスを付与してチャンスを与える
   * @param {number} inquiryCount - 月間問合せ件数
   * @return {number} ボーナス係数（1.0〜1.2）
   */
  calculateSupplyBonus: function(inquiryCount) {
    if (inquiryCount === 0) return 1.20;      // 0件: +20%
    if (inquiryCount <= 2) return 1.07;       // 1-2件: +7%
    if (inquiryCount <= 4) return 1.05;       // 3-4件: +5%
    return 1.0;                                // 5件以上: ボーナスなし
  },

  /**
   * V1751: おすすめ順ソート（売上高順 - データ混合システム + 全ボーナス適用）
   */
  sortByMatchScore: function(companies, userCity) {
    const self = this;
    const DEFAULT_REVENUE = 500000; // デフォルト売上: 50万円

    return companies.sort(function(a, b) {
      // V1751: 売上スコア計算（データ混合 + ボーナス）
      const calculateRevenueScore = function(company) {
        // Step 1: データ混合スコア計算（過去データの売上 = 単価 × 成約件数）
        const historicalRevenue = company.pastGrossUnitAfterReturn * (company.pastContractCount || 1);
        const mixedScore = self.calculateMixedScore(
          company,
          company.recent3MonthRevenue,
          historicalRevenue,
          DEFAULT_REVENUE,
          {
            minThreshold: 0,
            returnPenalty: Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3)),
            historicalCount: company.pastContractCount || 0 // V1751: 過去データ件数を渡す
          }
        );

        let finalScore = mixedScore.score;

        // Step 2: 距離ボーナス（15%）
        const distanceBonus = self.calculateDistanceBonus(company, userCity);
        finalScore *= distanceBonus;

        // Step 3: 日替わりローテーション（±10%）
        const rotation = self.calculateDailyRotation(company.companyName);
        finalScore *= rotation;

        // Step 4: 供給数ボーナス（0件+20%, 1-5件+10%, etc.）
        const supplyBonus = self.calculateSupplyBonus(company.recent3MonthInquiryCount);
        finalScore *= supplyBonus;

        return {
          score: finalScore,
          baseScore: mixedScore.score,
          source: mixedScore.source,
          distanceBonus: distanceBonus,
          rotation: rotation,
          supplyBonus: supplyBonus
        };
      };

      const scoreA = calculateRevenueScore(a);
      const scoreB = calculateRevenueScore(b);

      // V1896: 売上スコアで降順ソート（高い方が上位）、同スコアの場合はマッチ度で降順
      if (scoreB.score !== scoreA.score) {
        return scoreB.score - scoreA.score;
      }
      // 同じスコアの場合はマッチ度で降順ソート
      return (b.matchRate || 0) - (a.matchRate || 0);
    });
  },

  /**
   * V1751: 価格順ソート（安い順 - データ混合システム + 全ボーナス適用）
   * 50万円以下除外
   */
  sortByPrice: function(companies, userCity) {
    const self = this;
    const DEFAULT_AMOUNT = 1200000; // デフォルト価格: 120万円
    const MIN_THRESHOLD = 500000; // 50万円以下除外

    return companies.sort(function(a, b) {
      // V1751: 価格スコア計算（安い順なので昇順）
      const calculatePriceScore = function(company) {
        // Step 1: データ混合スコア計算
        const mixedScore = self.calculateMixedScore(
          company,
          company.avgContractAmount,
          company.pastGrossUnitAfterReturn,
          DEFAULT_AMOUNT,
          {
            minThreshold: MIN_THRESHOLD,
            returnPenalty: Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3)),
            historicalCount: company.pastContractCount || 0 // V1751: 過去データ件数を渡す
          }
        );

        let finalScore = mixedScore.score;

        // Step 2: 距離ボーナス（15%）- 安い順なので割り算
        const distanceBonus = self.calculateDistanceBonus(company, userCity);
        finalScore /= distanceBonus; // 安い方が上位なので逆算

        // Step 3: 日替わりローテーション（±10%）
        const rotation = self.calculateDailyRotation(company.companyName);
        finalScore *= rotation;

        // Step 4: 供給数ボーナス（安い順なので割り算）
        const supplyBonus = self.calculateSupplyBonus(company.recent3MonthInquiryCount);
        finalScore /= supplyBonus; // 安い方が上位なので逆算

        return {
          score: finalScore,
          baseScore: mixedScore.score,
          source: mixedScore.source
        };
      };

      const scoreA = calculatePriceScore(a);
      const scoreB = calculatePriceScore(b);

      // V1896: 価格スコアで昇順ソート（安い方が上位）、同スコアの場合はマッチ度で降順
      if (scoreA.score !== scoreB.score) {
        return scoreA.score - scoreB.score;
      }
      // 同じスコアの場合はマッチ度で降順ソート
      return (b.matchRate || 0) - (a.matchRate || 0);
    });
  },

  /**
   * V1751: 口コミ順ソート（成約率順 - データ混合システム + 全ボーナス適用）
   * 問合せ5件以上で信頼できるデータとする
   */
  sortByReview: function(companies, userCity) {
    const self = this;
    const DEFAULT_CONVERSION = 0.20; // デフォルト成約率: 20%

    return companies.sort(function(a, b) {
      // V1751: 成約率スコア計算
      const calculateConversionScore = function(company) {
        // Step 1: データ混合スコア計算（問合せ5件以上で信頼できるデータ）
        const recentConversion = company.recent3MonthInquiryCount >= 5
          ? company.recent3MonthConversionRate
          : 0; // 5件未満は使わない

        const mixedScore = self.calculateMixedScore(
          company,
          recentConversion,
          company.pastConversionRate,
          DEFAULT_CONVERSION,
          {
            minThreshold: 0,
            returnPenalty: 1.0, // 成約率には返品ペナルティ不要
            historicalCount: company.pastContractCount || 0 // V1751: 過去データ件数を渡す
          }
        );

        let finalScore = mixedScore.score;

        // Step 2: 距離ボーナス（15%）
        const distanceBonus = self.calculateDistanceBonus(company, userCity);
        finalScore *= distanceBonus;

        // Step 3: 日替わりローテーション（±10%）
        const rotation = self.calculateDailyRotation(company.companyName);
        finalScore *= rotation;

        // Step 4: 供給数ボーナス
        const supplyBonus = self.calculateSupplyBonus(company.recent3MonthInquiryCount);
        finalScore *= supplyBonus;

        return {
          score: finalScore,
          baseScore: mixedScore.score,
          source: mixedScore.source
        };
      };

      const scoreA = calculateConversionScore(a);
      const scoreB = calculateConversionScore(b);

      // V1896: 成約率スコアで降順ソート（高い方が上位）、同スコアの場合はマッチ度で降順
      if (scoreB.score !== scoreA.score) {
        return scoreB.score - scoreA.score;
      }
      // 同じスコアの場合はマッチ度で降順ソート
      return (b.matchRate || 0) - (a.matchRate || 0);
    });
  },

  /**
   * V1751: 高品質順ソート（高額順 - データ混合システム + 全ボーナス適用）
   * 50万円以下除外
   */
  sortByRating: function(companies, userCity) {
    const self = this;
    const DEFAULT_AMOUNT = 1500000; // デフォルト価格: 150万円
    const MIN_THRESHOLD = 500000; // 50万円以下除外

    return companies.sort(function(a, b) {
      // V1751: 高品質スコア計算（高い順なので降順）
      const calculatePremiumScore = function(company) {
        // Step 1: データ混合スコア計算
        const mixedScore = self.calculateMixedScore(
          company,
          company.avgContractAmount,
          company.pastGrossUnitAfterReturn,
          DEFAULT_AMOUNT,
          {
            minThreshold: MIN_THRESHOLD,
            returnPenalty: Math.max(0.7, 1.0 - (company.pastReturnRate * 0.3)),
            recentCount: company.contractCount || 0, // V1751: 実データ件数
            historicalCount: company.pastContractCount || 0 // V1751: 過去データ件数
          }
        );

        let finalScore = mixedScore.score;

        // Step 2: 距離ボーナス（15%）
        const distanceBonus = self.calculateDistanceBonus(company, userCity);
        finalScore *= distanceBonus;

        // Step 3: 日替わりローテーション（±10%）
        const rotation = self.calculateDailyRotation(company.companyName);
        finalScore *= rotation;

        // Step 4: 供給数ボーナス
        const supplyBonus = self.calculateSupplyBonus(company.recent3MonthInquiryCount);
        finalScore *= supplyBonus;

        return {
          score: finalScore,
          baseScore: mixedScore.score,
          source: mixedScore.source
        };
      };

      const scoreA = calculatePremiumScore(a);
      const scoreB = calculatePremiumScore(b);

      // V1896: 高品質スコアで降順ソート（高い方が上位）、同スコアの場合はマッチ度で降順
      if (scoreB.score !== scoreA.score) {
        return scoreB.score - scoreA.score;
      }
      // 同じスコアの場合はマッチ度で降順ソート
      return (b.matchRate || 0) - (a.matchRate || 0);
    });
  },

  /**
   * V1828: ボーナス調整（ランク位置調整方式）
   * ソート後の配列に対して、優先エリア・デポジット・ハンデに基づいてランク位置を調整
   * @param {Array} companies - ソート済み業者配列
   * @param {string} userCity - ユーザーの市区町村
   * @return {Array} ボーナス調整後の業者配列
   */
  applyRankBonus: function(companies, userCity) {
    if (!companies || companies.length === 0) return companies;

    // 各業者に元の順位とボーナス値を付与
    const companiesWithBonus = companies.map(function(company, index) {
      var bonus = 0;

      // 優先エリア: 3箇所選択式（市区町村と一致したら+1ランク）
      if (company.priorityArea && userCity) {
        const priorityAreas = company.priorityArea.toString().split(',').map(function(area) {
          return area.trim();
        });
        if (priorityAreas.indexOf(userCity) !== -1) {
          bonus += 1;
        }
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
          contractCount: 0, // V1751: 件数追加
          riskScore: 80
        };
      }

      // V1750: 過去データを解析
      const grossUnit = matchedRow[colIndex.grossUnitAfterReturn];
      const returnRateStr = matchedRow[colIndex.returnRate];
      const conversionRateStr = matchedRow[colIndex.conversionRate];
      const contractCountValue = matchedRow[colIndex.contractCount]; // V1751: 成約件数取得

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
      const contractCount = parseNumber(contractCountValue); // V1751: 件数を数値化

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
        contractCount: contractCount, // V1751: 件数を返す
        riskScore: this.calculateRiskScoreV1712(matchedRow, colIndex)
      };

    } catch (err) {
      console.error('[V1750] 過去データ取得エラー:', err);
      return {
        rank: '',
        grossUnitAfterReturn: 0,
        returnRate: 0,
        conversionRate: 0,
        contractCount: 0, // V1751: 件数追加
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
  },

  /**
   * V1899: 特殊対応項目・最大対応階数を加盟店登録から加盟店マスタに同期
   * 加盟店登録シート → 加盟店マスタ
   * - 特殊対応項目 → AE列
   * - 最大対応階数 → AF列
   * 注：築年数はcopyToFranchiseMasterで対応築年数_最小/_最大に分割同期済み（AG列削除）
   */
  syncMatchFieldsToMaster: function() {
    console.log('[RankingSystem] マッチ項目同期開始');

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // 加盟店登録シート取得
      const registerSheet = ss.getSheetByName('加盟店登録');
      if (!registerSheet) {
        console.error('[RankingSystem] 加盟店登録シートが見つかりません');
        return { success: false, error: '加盟店登録シートが見つかりません' };
      }

      // 加盟店マスタシート取得
      const masterSheet = ss.getSheetByName('加盟店マスタ');
      if (!masterSheet) {
        console.error('[RankingSystem] 加盟店マスタシートが見つかりません');
        return { success: false, error: '加盟店マスタシートが見つかりません' };
      }

      // 加盟店登録シートからデータ取得
      const registerData = registerSheet.getDataRange().getValues();
      const registerHeaders = registerData[0];

      // ヘッダーから列インデックスを取得
      const companyNameColIndex = registerHeaders.indexOf('会社名');
      const specialSupportColIndex = registerHeaders.indexOf('特殊対応項目');
      const maxFloorsColIndex = registerHeaders.indexOf('最大対応階数');

      console.log('[V1899-DEBUG] 加盟店登録シート - 列インデックス:', {
        companyName: companyNameColIndex,
        specialSupport: specialSupportColIndex,
        maxFloors: maxFloorsColIndex
      });

      if (companyNameColIndex === -1) {
        console.error('[RankingSystem] 加盟店登録シートに「会社名」列が見つかりません');
        return { success: false, error: '加盟店登録シートに「会社名」列が見つかりません' };
      }

      // データマップ作成
      const dataMap = {};
      for (let i = 1; i < registerData.length; i++) {
        const companyName = String(registerData[i][companyNameColIndex] || '').trim();
        if (!companyName) continue;

        const specialSupport = specialSupportColIndex !== -1 ? String(registerData[i][specialSupportColIndex] || '').trim() : '';
        const maxFloors = maxFloorsColIndex !== -1 ? String(registerData[i][maxFloorsColIndex] || '').trim() : '';

        dataMap[companyName] = {
          specialSupport: specialSupport,
          maxFloors: maxFloors
        };

        console.log('[V1899-DEBUG] 加盟店登録データ:', companyName, '特殊対応:', specialSupport || '(空)', '階数:', maxFloors || '(空)');
      }

      console.log('[RankingSystem] データマップ作成完了:', Object.keys(dataMap).length + '件');

      // 加盟店マスタのヘッダー取得
      const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
      const masterCompanyNameColIndex = masterHeaders.indexOf('会社名');
      const masterSpecialSupportColIndex = masterHeaders.indexOf('特殊対応項目');
      const masterMaxFloorsColIndex = masterHeaders.indexOf('最大対応階数');

      console.log('[V1899-DEBUG] 加盟店マスタ - 列インデックス:', {
        companyName: masterCompanyNameColIndex,
        specialSupport: masterSpecialSupportColIndex,
        maxFloors: masterMaxFloorsColIndex
      });

      if (masterCompanyNameColIndex === -1) {
        console.error('[RankingSystem] 加盟店マスタに「会社名」列が見つかりません');
        return { success: false, error: '加盟店マスタに「会社名」列が見つかりません' };
      }

      // 加盟店マスタを更新
      const masterLastRow = masterSheet.getLastRow();
      let updatedCount = 0;
      let notFoundCount = 0;

      for (let i = 2; i <= masterLastRow; i++) {
        const companyName = String(masterSheet.getRange(i, masterCompanyNameColIndex + 1).getValue() || '').trim();

        if (companyName && dataMap[companyName]) {
          const data = dataMap[companyName];

          // 特殊対応項目を同期
          if (masterSpecialSupportColIndex !== -1) {
            masterSheet.getRange(i, masterSpecialSupportColIndex + 1).setValue(data.specialSupport);
          }

          // 最大対応階数を同期
          if (masterMaxFloorsColIndex !== -1) {
            masterSheet.getRange(i, masterMaxFloorsColIndex + 1).setValue(data.maxFloors);
          }

          console.log('[V1899-DEBUG] ✅ マスタ更新:', companyName, '→',
                      '特殊対応:', (data.specialSupport || '(空)'),
                      '階数:', (data.maxFloors || '(空)'));
          updatedCount++;
        } else if (companyName) {
          console.log('[RankingSystem] ⚠️ 加盟店登録に存在しない:', companyName);
          notFoundCount++;
        }
      }

      console.log('[RankingSystem] 同期完了 - 更新:', updatedCount + '件、未設定:', notFoundCount + '件');

      return {
        success: true,
        updatedCount: updatedCount,
        notFoundCount: notFoundCount,
        totalCompanies: Object.keys(dataMap).length
      };

    } catch (error) {
      console.error('[RankingSystem] 同期エラー:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * V1833: プレビューHPを加盟店登録から加盟店マスタに同期
   * 加盟店登録シートのAX列（プレビューHP）→ 加盟店マスタのAD列（プレビューHP）
   */
  syncPreviewHPToMaster: function() {
    console.log('[RankingSystem] プレビューHP同期開始');

    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

      // 加盟店登録シート取得
      const registerSheet = ss.getSheetByName('加盟店登録');
      if (!registerSheet) {
        console.error('[RankingSystem] 加盟店登録シートが見つかりません');
        return { success: false, error: '加盟店登録シートが見つかりません' };
      }

      // 加盟店マスタシート取得
      const masterSheet = ss.getSheetByName('加盟店マスタ');
      if (!masterSheet) {
        console.error('[RankingSystem] 加盟店マスタシートが見つかりません');
        return { success: false, error: '加盟店マスタシートが見つかりません' };
      }

      // 加盟店登録シートからデータ取得
      const registerData = registerSheet.getDataRange().getValues();
      const registerHeaders = registerData[0];

      // 会社名とプレビューHPのマッピング作成
      // AX列（50列目、インデックス49）= プレビューHP
      const previewHPMap = {};
      const companyNameColIndex = registerHeaders.indexOf('会社名');
      const previewHPColIndex = 49; // AX列（A=0, Z=25, AA=26, AX=49）

      console.log('[RankingSystem] 加盟店登録 - 会社名列:', companyNameColIndex, 'プレビューHP列(AX):', previewHPColIndex);

      if (companyNameColIndex === -1) {
        console.error('[RankingSystem] 加盟店登録シートに「会社名」列が見つかりません');
        return { success: false, error: '加盟店登録シートに「会社名」列が見つかりません' };
      }

      // プレビューHPマップ作成
      for (let i = 1; i < registerData.length; i++) {
        const companyName = String(registerData[i][companyNameColIndex] || '').trim();
        const previewHP = String(registerData[i][previewHPColIndex] || '').trim();

        if (companyName && previewHP) {
          previewHPMap[companyName] = previewHP;
          console.log('[RankingSystem] マップ追加:', companyName, '→', previewHP);
        }
      }

      console.log('[RankingSystem] プレビューHPマップ作成完了:', Object.keys(previewHPMap).length + '件');

      // 加盟店マスタのヘッダー取得
      const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
      const masterCompanyNameColIndex = masterHeaders.indexOf('会社名');
      const masterPreviewHPColIndex = masterHeaders.indexOf('プレビューHP');

      console.log('[RankingSystem] 加盟店マスタ - 会社名列:', masterCompanyNameColIndex, 'プレビューHP列(AD):', masterPreviewHPColIndex);

      if (masterPreviewHPColIndex === -1) {
        console.error('[RankingSystem] 加盟店マスタに「プレビューHP」列が見つかりません');
        return { success: false, error: '加盟店マスタに「プレビューHP」列が見つかりません' };
      }

      // 加盟店マスタを更新
      const masterLastRow = masterSheet.getLastRow();
      let updatedCount = 0;
      let notFoundCount = 0;

      for (let i = 2; i <= masterLastRow; i++) {
        const companyName = String(masterSheet.getRange(i, masterCompanyNameColIndex + 1).getValue() || '').trim();

        if (companyName && previewHPMap[companyName]) {
          // プレビューHPが存在する場合は同期
          const previewHP = previewHPMap[companyName];
          console.log('[RankingSystem] ✅ 同期:', companyName, '→', previewHP);
          masterSheet.getRange(i, masterPreviewHPColIndex + 1).setValue(previewHP);
          updatedCount++;
        } else if (companyName) {
          console.log('[RankingSystem] ⚠️ プレビューHPなし:', companyName);
          notFoundCount++;
        }
      }

      console.log('[RankingSystem] 同期完了 - 更新:', updatedCount + '件、未設定:', notFoundCount + '件');

      return {
        success: true,
        updatedCount: updatedCount,
        notFoundCount: notFoundCount,
        totalPreviewHPs: Object.keys(previewHPMap).length
      };

    } catch (error) {
      console.error('[RankingSystem] 同期エラー:', error);
      return { success: false, error: error.toString() };
    }
  },

  /**
   * GETリクエストハンドラー（main.jsから呼ばれる）
   * @param {Object} params - リクエストパラメータ
   * @return {Object} レスポンス
   */
  handle: function(params) {
    console.log('[RankingSystem] handle called');
    console.log('[RankingSystem] params:', JSON.stringify(params));

    const action = params.action;
    console.log('[RankingSystem] action:', action);

    if (action === 'getRanking') {
      return this.getRanking(params);
    }

    // V1833: プレビューHP同期エンドポイント
    if (action === 'syncPreviewHP') {
      return this.syncPreviewHPToMaster();
    }

    // V1897: マッチ項目同期エンドポイント
    if (action === 'syncMatchFields') {
      return this.syncMatchFieldsToMaster();
    }

    // V1898: デバッグ用 - 加盟店登録シートのヘッダーとデータ確認
    if (action === 'debugRegisterSheet') {
      return this.debugRegisterSheetData(params.companyName);
    }

    return {
      success: false,
      error: 'Unknown action: ' + action
    };
  },

  /**
   * V1899: 加盟店登録シートのヘッダーと指定会社のデータを返す（デバッグ用）
   * 注：築年数はマスタでは対応築年数_最小/_最大に分割されている
   */
  debugRegisterSheetData: function(companyName) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const registerSheet = ss.getSheetByName('加盟店登録');
      const masterSheet = ss.getSheetByName('加盟店マスタ');

      if (!registerSheet || !masterSheet) {
        return { success: false, error: 'シートが見つかりません' };
      }

      // 加盟店登録シートのヘッダー
      const registerData = registerSheet.getDataRange().getValues();
      const registerHeaders = registerData[0];

      // 加盟店マスタのヘッダー
      const masterData = masterSheet.getDataRange().getValues();
      const masterHeaders = masterData[0];

      // 列インデックス
      const regCompanyIdx = registerHeaders.indexOf('会社名');
      const regCitiesIdx = registerHeaders.indexOf('対応市区町村');
      const regSpecialIdx = registerHeaders.indexOf('特殊対応項目');
      const regMaxFloorsIdx = registerHeaders.indexOf('最大対応階数');

      const mstCompanyIdx = masterHeaders.indexOf('会社名');
      const mstCitiesIdx = masterHeaders.indexOf('対応市区町村');
      const mstSpecialIdx = masterHeaders.indexOf('特殊対応項目');
      const mstMaxFloorsIdx = masterHeaders.indexOf('最大対応階数');
      const mstAgeMinIdx = masterHeaders.indexOf('対応築年数_最小');
      const mstAgeMaxIdx = masterHeaders.indexOf('対応築年数_最大');

      let registerRow = null;
      let masterRow = null;

      // 指定会社のデータを検索
      if (companyName) {
        for (let i = 1; i < registerData.length; i++) {
          if (String(registerData[i][regCompanyIdx] || '').trim() === companyName) {
            registerRow = {
              companyName: registerData[i][regCompanyIdx],
              cities: registerData[i][regCitiesIdx] || '(空)',
              specialSupport: registerData[i][regSpecialIdx] || '(空)',
              maxFloors: registerData[i][regMaxFloorsIdx] || '(空)'
            };
            break;
          }
        }

        for (let i = 1; i < masterData.length; i++) {
          if (String(masterData[i][mstCompanyIdx] || '').trim() === companyName) {
            masterRow = {
              companyName: masterData[i][mstCompanyIdx],
              cities: masterData[i][mstCitiesIdx] || '(空)',
              specialSupport: masterData[i][mstSpecialIdx] || '(空)',
              maxFloors: masterData[i][mstMaxFloorsIdx] || '(空)',
              buildingAgeMin: masterData[i][mstAgeMinIdx] || '(空)',
              buildingAgeMax: masterData[i][mstAgeMaxIdx] || '(空)'
            };
            break;
          }
        }
      }

      return {
        success: true,
        registerHeaders: registerHeaders,
        masterHeaders: masterHeaders,
        columnIndexes: {
          register: {
            companyName: regCompanyIdx,
            cities: regCitiesIdx,
            specialSupport: regSpecialIdx,
            maxFloors: regMaxFloorsIdx
          },
          master: {
            companyName: mstCompanyIdx,
            cities: mstCitiesIdx,
            specialSupport: mstSpecialIdx,
            maxFloors: mstMaxFloorsIdx,
            buildingAgeMin: mstAgeMinIdx,
            buildingAgeMax: mstAgeMaxIdx
          }
        },
        registerRow: registerRow,
        masterRow: masterRow
      };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }
};
