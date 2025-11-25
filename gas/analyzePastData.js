/**
 * 過去データ統計分析ツール（V1709改善版）
 *
 * 目的：
 * 1. 加盟店審査のリスク判定基準を最適化
 * 2. ランキング表示での信頼度スコア算出
 * 3. 新規加盟店の扱い方を決定
 * 4. 過去業者リストとの照合機能
 *
 * 使い方：
 * GASエディタで analyzePastDataStats() を実行してログを確認
 */

/**
 * 過去データの統計分析を実行（改善版）
 * @return {Object} 分析結果
 */
function analyzePastDataStats() {
  try {
    console.log('=== 過去データ統計分析開始（V1709改善版） ===');

    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const pastDataSheet = ss.getSheetByName('過去データ');

    if (!pastDataSheet) {
      console.error('過去データシートが見つかりません');
      return { success: false, error: 'シート未検出' };
    }

    const data = pastDataSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    console.log(`総データ数: ${rows.length}件`);
    console.log(`スプレッドシートID: ${SPREADSHEET_ID}`);
    console.log(`シート名: 過去データ`);
    console.log('');

    // カラムインデックス取得
    const colIndex = {
      businessName: headers.indexOf('業者名'),
      bankruptcyFlag: headers.indexOf('貸倒フラグ'),
      warningStatus: headers.indexOf('要注意先ステータス'),
      contractCount: headers.indexOf('成約件数'),
      hiddenContract: headers.indexOf('成約隠し件数'),
      unpaidRate: headers.indexOf('未入金発生率'),
      avgDelayPerInvoice: headers.indexOf('1請求あたり平均遅延日数'),
      complaintCount: headers.indexOf('ユーザークレーム回数'),
      delayTotal: headers.indexOf('遅延日数合計')
    };

    // 統計データ収集
    const stats = {
      total: rows.length,
      bankruptcy: { count: 0, rate: 0 },
      warningStatus: { count: 0, rate: 0 },
      hiddenContract: {
        values: [],
        rates: [],
        avg: 0,
        median: 0,
        max: 0
      },
      unpaidRate: {
        values: [],
        avg: 0,
        median: 0,
        max: 0
      },
      avgDelayPerInvoice: {
        values: [],
        avg: 0,
        median: 0,
        max: 0
      },
      complaintCount: {
        values: [],
        avg: 0,
        median: 0,
        max: 0
      },
      delayTotal: {
        values: [],
        avg: 0,
        median: 0,
        max: 0
      }
    };

    // データ収集
    rows.forEach(function(row) {
      // 貸倒フラグ
      const bankruptcy = row[colIndex.bankruptcyFlag];
      if (bankruptcy === true || bankruptcy === 'TRUE' || bankruptcy === '○' || bankruptcy === 'YES') {
        stats.bankruptcy.count++;
      }

      // 要注意先ステータス
      const warning = row[colIndex.warningStatus];
      if (warning && warning !== '' && warning !== '-') {
        stats.warningStatus.count++;
      }

      // 成約隠し率
      const contractCount = parseFloat(row[colIndex.contractCount]) || 0;
      const hiddenCount = parseFloat(row[colIndex.hiddenContract]) || 0;
      if (contractCount > 0 && hiddenCount > 0) {
        const hiddenRate = (hiddenCount / contractCount) * 100;
        stats.hiddenContract.values.push(hiddenCount);
        stats.hiddenContract.rates.push(hiddenRate);
      }

      // 未入金発生率
      const unpaidRate = parseFloat(row[colIndex.unpaidRate]) || 0;
      if (unpaidRate > 0) {
        stats.unpaidRate.values.push(unpaidRate);
      }

      // 平均遅延日数
      const avgDelay = parseFloat(row[colIndex.avgDelayPerInvoice]) || 0;
      if (avgDelay > 0) {
        stats.avgDelayPerInvoice.values.push(avgDelay);
      }

      // クレーム件数
      const complaints = parseFloat(row[colIndex.complaintCount]) || 0;
      if (complaints > 0) {
        stats.complaintCount.values.push(complaints);
      }

      // 遅延日数合計
      const delayTotal = parseFloat(row[colIndex.delayTotal]) || 0;
      if (delayTotal > 0) {
        stats.delayTotal.values.push(delayTotal);
      }
    });

    // 統計計算
    stats.bankruptcy.rate = (stats.bankruptcy.count / stats.total * 100).toFixed(1);
    stats.warningStatus.rate = (stats.warningStatus.count / stats.total * 100).toFixed(1);

    // 各指標の統計値を計算
    calculateStats(stats.hiddenContract.rates, stats.hiddenContract);
    calculateStats(stats.unpaidRate.values, stats.unpaidRate);
    calculateStats(stats.avgDelayPerInvoice.values, stats.avgDelayPerInvoice);
    calculateStats(stats.complaintCount.values, stats.complaintCount);
    calculateStats(stats.delayTotal.values, stats.delayTotal);

    // 結果出力
    console.log('=== 統計分析結果 ===\n');

    console.log('【最重要指標】');
    console.log(`貸倒フラグ: ${stats.bankruptcy.count}件 (${stats.bankruptcy.rate}%)`);
    console.log(`要注意先ステータス: ${stats.warningStatus.count}件 (${stats.warningStatus.rate}%)`);
    console.log('');

    console.log('【成約隠し率】');
    console.log(`件数: ${stats.hiddenContract.rates.length}件`);
    console.log(`平均: ${stats.hiddenContract.avg}%`);
    console.log(`中央値: ${stats.hiddenContract.median}%`);
    console.log(`最大値: ${stats.hiddenContract.max}%`);
    console.log(`分布: ${getDistribution(stats.hiddenContract.rates, [15, 30])}`);
    console.log('');

    console.log('【未入金発生率】');
    console.log(`件数: ${stats.unpaidRate.values.length}件`);
    console.log(`平均: ${stats.unpaidRate.avg}%`);
    console.log(`中央値: ${stats.unpaidRate.median}%`);
    console.log(`最大値: ${stats.unpaidRate.max}%`);
    console.log(`分布: ${getDistribution(stats.unpaidRate.values, [5, 15, 30])}`);
    console.log('');

    console.log('【平均遅延日数】');
    console.log(`件数: ${stats.avgDelayPerInvoice.values.length}件`);
    console.log(`平均: ${stats.avgDelayPerInvoice.avg}日`);
    console.log(`中央値: ${stats.avgDelayPerInvoice.median}日`);
    console.log(`最大値: ${stats.avgDelayPerInvoice.max}日`);
    console.log(`分布: ${getDistribution(stats.avgDelayPerInvoice.values, [5, 10, 15])}`);
    console.log('');

    console.log('【ユーザークレーム】');
    console.log(`件数: ${stats.complaintCount.values.length}件`);
    console.log(`平均: ${stats.complaintCount.avg}件`);
    console.log(`中央値: ${stats.complaintCount.median}件`);
    console.log(`最大値: ${stats.complaintCount.max}件`);
    console.log(`分布: ${getDistribution(stats.complaintCount.values, [1, 2, 3])}`);
    console.log('');

    console.log('【遅延日数合計】');
    console.log(`件数: ${stats.delayTotal.values.length}件`);
    console.log(`平均: ${stats.delayTotal.avg}日`);
    console.log(`中央値: ${stats.delayTotal.median}日`);
    console.log(`最大値: ${stats.delayTotal.max}日`);
    console.log(`分布: ${getDistribution(stats.delayTotal.values, [30, 60])}`);
    console.log('');

    // リスクスコア提案
    console.log('=== リスクスコア設計提案 ===\n');
    console.log('【現在のV1708閾値の妥当性】');
    console.log(`成約隠し率 30%以上: ${stats.hiddenContract.rates.filter(r => r >= 30).length}件`);
    console.log(`未入金発生率 30%以上: ${stats.unpaidRate.values.filter(r => r >= 30).length}件`);
    console.log(`平均遅延 15日以上: ${stats.avgDelayPerInvoice.values.filter(d => d >= 15).length}件`);
    console.log('');

    console.log('【ランキング信頼度スコア提案】');
    console.log('100点満点で以下を減点：');
    console.log('- 貸倒フラグ: -100点（即座に0点、表示除外）');
    console.log('- 要注意先: -30点');
    console.log(`- 成約隠し率: -${Math.round(stats.hiddenContract.avg)}点（平均値基準）`);
    console.log(`- 未入金発生率: -${Math.round(stats.unpaidRate.avg / 2)}点（平均値の半分）`);
    console.log(`- 平均遅延日数: -${Math.round(stats.avgDelayPerInvoice.avg / 2)}点（2日で-1点）`);
    console.log(`- クレーム件数: -${Math.round(stats.complaintCount.avg * 5)}点（1件で-5点）`);
    console.log('');

    console.log('【新規加盟店の扱い】');
    console.log('提案1: 新規ボーナス方式 → 初期スコア80点（実績がないため若干控えめ）');
    console.log('提案2: 中立方式 → 初期スコア50点（平均的な評価）');
    console.log('提案3: 表示分離 → 「実績あり」「新規」でタブ分け');
    console.log('');

    // V1709改善: 直接データサンプル表示
    console.log('=== データ検証サンプル（V1709改善版） ===\n');
    displayDataSamples(rows, headers, colIndex);

    // V1709改善: 過去業者リストとの照合
    console.log('\n=== 過去業者リスト照合 ===\n');
    const crossRefResult = checkPastMerchantsList(ss, rows, headers, colIndex);

    console.log('\n=== 分析完了 ===');

    return {
      success: true,
      stats: stats
    };

  } catch (error) {
    console.error('分析エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 統計値を計算（平均、中央値、最大値）
 */
function calculateStats(values, statsObj) {
  if (values.length === 0) {
    statsObj.avg = 0;
    statsObj.median = 0;
    statsObj.max = 0;
    return;
  }

  // 平均
  const sum = values.reduce(function(a, b) { return a + b; }, 0);
  statsObj.avg = (sum / values.length).toFixed(1);

  // 中央値
  const sorted = values.slice().sort(function(a, b) { return a - b; });
  const mid = Math.floor(sorted.length / 2);
  statsObj.median = sorted.length % 2 === 0
    ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1)
    : sorted[mid].toFixed(1);

  // 最大値
  statsObj.max = Math.max.apply(null, values).toFixed(1);
}

/**
 * 分布を取得（閾値ごとの件数）
 */
function getDistribution(values, thresholds) {
  const dist = thresholds.map(function(threshold) {
    const count = values.filter(function(v) { return v >= threshold; }).length;
    return threshold + '以上: ' + count + '件';
  });
  return dist.join(', ');
}

/**
 * リスク総合スコアを計算（100点満点）
 * ランキング表示用
 *
 * @param {Object} pastDataRow - 過去データの1行
 * @return {number} リスクスコア（0-100）
 */
function calculateRiskScore(pastDataRow) {
  let score = 100; // 満点からスタート

  const headers = pastDataRow.headers || [];
  const row = pastDataRow.values || [];

  // カラムインデックス
  const colIndex = {
    bankruptcyFlag: headers.indexOf('貸倒フラグ'),
    warningStatus: headers.indexOf('要注意先ステータス'),
    contractCount: headers.indexOf('成約件数'),
    hiddenContract: headers.indexOf('成約隠し件数'),
    unpaidRate: headers.indexOf('未入金発生率'),
    avgDelayPerInvoice: headers.indexOf('1請求あたり平均遅延日数'),
    complaintCount: headers.indexOf('ユーザークレーム回数')
  };

  // 1. 貸倒フラグ（即座に0点）
  const bankruptcy = row[colIndex.bankruptcyFlag];
  if (bankruptcy === true || bankruptcy === 'TRUE' || bankruptcy === '○' || bankruptcy === 'YES') {
    return 0;
  }

  // 2. 要注意先ステータス（-30点）
  const warning = row[colIndex.warningStatus];
  if (warning && warning !== '' && warning !== '-') {
    score -= 30;
  }

  // 3. 成約隠し率（比率に応じて減点）
  const contractCount = parseFloat(row[colIndex.contractCount]) || 0;
  const hiddenCount = parseFloat(row[colIndex.hiddenContract]) || 0;
  if (contractCount > 0 && hiddenCount > 0) {
    const hiddenRate = (hiddenCount / contractCount) * 100;
    score -= Math.min(hiddenRate, 40); // 最大40点減点
  }

  // 4. 未入金発生率（-15点まで）
  const unpaidRate = parseFloat(row[colIndex.unpaidRate]) || 0;
  score -= Math.min(unpaidRate / 2, 15);

  // 5. 平均遅延日数（2日で-1点、最大-10点）
  const avgDelay = parseFloat(row[colIndex.avgDelayPerInvoice]) || 0;
  score -= Math.min(avgDelay / 2, 10);

  // 6. クレーム件数（1件で-5点）
  const complaints = parseFloat(row[colIndex.complaintCount]) || 0;
  score -= complaints * 5;

  // 0点未満にはしない
  return Math.max(score, 0);
}

/**
 * データサンプルを表示（V1709改善: 直接検証用）
 * 成約隠し率が高い業者を実際に表示して検証
 */
function displayDataSamples(rows, headers, colIndex) {
  console.log('【成約隠し率100%超えの実例】');

  // 成約隠し率が100%以上の業者を抽出
  const highHiddenRateMerchants = [];
  rows.forEach(function(row, index) {
    const contractCount = parseFloat(row[colIndex.contractCount]) || 0;
    const hiddenCount = parseFloat(row[colIndex.hiddenContract]) || 0;
    if (contractCount > 0 && hiddenCount > 0) {
      const hiddenRate = (hiddenCount / contractCount) * 100;
      if (hiddenRate >= 100) {
        highHiddenRateMerchants.push({
          rowNum: index + 2, // +2 because of header and 0-indexed
          businessName: row[colIndex.businessName] || '不明',
          contractCount: contractCount,
          hiddenCount: hiddenCount,
          hiddenRate: hiddenRate.toFixed(1)
        });
      }
    }
  });

  // 上位5件を表示
  highHiddenRateMerchants
    .sort(function(a, b) { return parseFloat(b.hiddenRate) - parseFloat(a.hiddenRate); })
    .slice(0, 5)
    .forEach(function(merchant) {
      console.log(`業者: ${merchant.businessName}`);
      console.log(`  成約件数: ${merchant.contractCount}件 / 成約隠し: ${merchant.hiddenCount}件`);
      console.log(`  成約隠し率: ${merchant.hiddenRate}% (行番号: ${merchant.rowNum})`);
      console.log('');
    });

  console.log(`✓ 成約隠し率100%以上の業者: ${highHiddenRateMerchants.length}件`);
  console.log('→ データ確認: 成約隠し件数 > 成約件数 は正常（実際に隠してる件数の方が多い）\n');

  // 要注意先サンプル表示
  console.log('【要注意先ステータスの実例（上位5件）】');
  const warningMerchants = [];
  rows.forEach(function(row, index) {
    const warning = row[colIndex.warningStatus];
    if (warning && warning !== '' && warning !== '-') {
      warningMerchants.push({
        rowNum: index + 2,
        businessName: row[colIndex.businessName] || '不明',
        warningStatus: warning,
        unpaidRate: parseFloat(row[colIndex.unpaidRate]) || 0,
        avgDelay: parseFloat(row[colIndex.avgDelayPerInvoice]) || 0
      });
    }
  });

  warningMerchants.slice(0, 5).forEach(function(merchant) {
    console.log(`業者: ${merchant.businessName}`);
    console.log(`  要注意先: ${merchant.warningStatus}`);
    console.log(`  未入金率: ${merchant.unpaidRate.toFixed(1)}% / 平均遅延: ${merchant.avgDelay.toFixed(1)}日`);
    console.log('');
  });

  // 未入金率の分布確認
  console.log('【未入金発生率の実態（業界平均46.6%の検証）】');
  const unpaidRateRanges = {
    '0-30%': 0,
    '30-60%': 0,
    '60-100%': 0
  };

  rows.forEach(function(row) {
    const unpaidRate = parseFloat(row[colIndex.unpaidRate]) || 0;
    if (unpaidRate > 0) {
      if (unpaidRate < 30) {
        unpaidRateRanges['0-30%']++;
      } else if (unpaidRate < 60) {
        unpaidRateRanges['30-60%']++;
      } else {
        unpaidRateRanges['60-100%']++;
      }
    }
  });

  console.log(`  0-30%未満: ${unpaidRateRanges['0-30%']}件`);
  console.log(`  30-60%未満: ${unpaidRateRanges['30-60%']}件`);
  console.log(`  60-100%: ${unpaidRateRanges['60-100%']}件`);
  console.log('→ V1708の30%閾値は厳しすぎる可能性（業界平均46.6%）\n');
}

/**
 * 過去業者リストとの照合（V1709改善: 名前変更業者の検出）
 * 電話番号・住所で照合し、会社名が異なる場合は要注意
 */
function checkPastMerchantsList(ss, pastDataRows, pastDataHeaders, pastColIndex) {
  try {
    const pastMerchantsListSheet = ss.getSheetByName('過去業者リスト');

    if (!pastMerchantsListSheet) {
      console.log('⚠️ 過去業者リストシートが見つかりません');
      return { success: false, error: 'シート未検出' };
    }

    const listData = pastMerchantsListSheet.getDataRange().getValues();
    const listHeaders = listData[0];
    const listRows = listData.slice(1);

    console.log(`過去業者リスト件数: ${listRows.length}件`);

    // カラムインデックス取得
    const listColIndex = {
      clientName: listHeaders.indexOf('クライアント名'),
      address: listHeaders.indexOf('住所'),
      mainPhone: listHeaders.indexOf('代表電話'),
      contactPhone1: listHeaders.indexOf('担当電話番号1'),
      contactPhone2: listHeaders.indexOf('担当電話番号2'),
      email: listHeaders.indexOf('E-Mail'),
      warningStatus: listHeaders.indexOf('要注意先'),
      salesStatus: listHeaders.indexOf('販売ステータス')
    };

    // 過去データのカラムインデックス（電話番号・住所）を追加取得
    const pastPhoneIndex = pastDataHeaders.indexOf('代表電話番号') !== -1
      ? pastDataHeaders.indexOf('代表電話番号')
      : pastDataHeaders.indexOf('電話番号');
    const pastAddressIndex = pastDataHeaders.indexOf('住所');

    if (pastPhoneIndex === -1 || pastAddressIndex === -1) {
      console.log('⚠️ 過去データに電話番号または住所のカラムが見つかりません');
      console.log('利用可能なカラム:', pastDataHeaders.join(', '));
      return { success: false, error: '必要カラム未検出' };
    }

    // 照合処理
    const matches = [];

    pastDataRows.forEach(function(pastRow, pastIndex) {
      const pastBusinessName = pastRow[pastColIndex.businessName] || '';
      const pastPhone = normalizePhone(pastRow[pastPhoneIndex]);
      const pastAddress = normalizeAddress(pastRow[pastAddressIndex]);

      if (!pastPhone && !pastAddress) return; // 電話番号も住所もない場合はスキップ

      listRows.forEach(function(listRow, listIndex) {
        const listClientName = listRow[listColIndex.clientName] || '';
        const listMainPhone = normalizePhone(listRow[listColIndex.mainPhone]);
        const listContactPhone1 = normalizePhone(listRow[listColIndex.contactPhone1]);
        const listContactPhone2 = normalizePhone(listRow[listColIndex.contactPhone2]);
        const listAddress = normalizeAddress(listRow[listColIndex.address]);
        const listWarningStatus = listRow[listColIndex.warningStatus];

        // 電話番号マッチング
        const phoneMatch = pastPhone && (
          pastPhone === listMainPhone ||
          pastPhone === listContactPhone1 ||
          pastPhone === listContactPhone2
        );

        // 住所マッチング（部分一致）
        const addressMatch = pastAddress && listAddress &&
          (pastAddress.indexOf(listAddress) !== -1 || listAddress.indexOf(pastAddress) !== -1);

        // マッチング検出
        if (phoneMatch || addressMatch) {
          const nameMatch = pastBusinessName === listClientName;

          matches.push({
            pastBusinessName: pastBusinessName,
            pastRowNum: pastIndex + 2,
            listClientName: listClientName,
            listRowNum: listIndex + 2,
            matchType: phoneMatch ? '電話番号' : '住所',
            matchedValue: phoneMatch ? pastPhone : pastAddress,
            nameChanged: !nameMatch,
            listWarningStatus: listWarningStatus,
            criticalLevel: !nameMatch ? 4 : 2 // 名前が違う場合は最高レベル
          });
        }
      });
    });

    // 結果出力
    console.log(`\n照合結果: ${matches.length}件のマッチング検出\n`);

    // 名前が異なるケース（最重要）
    const nameChangedMatches = matches.filter(function(m) { return m.nameChanged; });
    if (nameChangedMatches.length > 0) {
      console.log(`🔴 【重要警告】名前変更の疑いあり: ${nameChangedMatches.length}件\n`);
      nameChangedMatches.slice(0, 10).forEach(function(match) {
        console.log(`⚠️ 過去データ: ${match.pastBusinessName} (行${match.pastRowNum})`);
        console.log(`   過去業者リスト: ${match.listClientName} (行${match.listRowNum})`);
        console.log(`   照合方法: ${match.matchType} (${match.matchedValue})`);
        if (match.listWarningStatus) {
          console.log(`   要注意先: ${match.listWarningStatus}`);
        }
        console.log('');
      });
    }

    // 名前が同じケース（通常の照合）
    const sameNameMatches = matches.filter(function(m) { return !m.nameChanged; });
    if (sameNameMatches.length > 0) {
      console.log(`✓ 同一業者の照合: ${sameNameMatches.length}件（正常）\n`);
    }

    return {
      success: true,
      totalMatches: matches.length,
      nameChangedMatches: nameChangedMatches.length,
      sameNameMatches: sameNameMatches.length,
      matches: matches
    };

  } catch (error) {
    console.error('過去業者リスト照合エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 電話番号の正規化（比較用）
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone)
    .replace(/[^0-9]/g, '') // 数字以外を削除
    .replace(/^0+/, ''); // 先頭の0を削除
}

/**
 * 住所の正規化（比較用）
 */
function normalizeAddress(address) {
  if (!address) return '';
  return String(address)
    .replace(/\s+/g, '') // 空白削除
    .replace(/[０-９]/g, function(s) { // 全角数字を半角に
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}
