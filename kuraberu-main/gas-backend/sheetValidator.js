/**
 * 初期化・動作確認テスト関数群
 * シート構造検証・システム整合性チェック
 */

/**
 * 総合システムチェック - メイン関数
 */
function claude_sheetCheckTest() {
  try {
    console.log('=== Claude Code システム総合チェック開始 ===');
    
    const results = {
      githubSync: false,
      sheetStructure: false,
      dataAccess: false,
      coreSheets: false,
      errors: []
    };
    
    // 1. GitHub連携チェック
    console.log('1️⃣ GitHub連携状態確認...');
    try {
      results.githubSync = claude_checkGitHubSync();
      if (!results.githubSync) {
        console.log('GitHub同期実行中...');
        claude_fetchGitHubMdCache();
        results.githubSync = true;
      }
    } catch (error) {
      results.errors.push(`GitHub連携: ${error.toString()}`);
    }
    
    // 2. 重要シート存在確認
    console.log('2️⃣ 重要シート存在確認...');
    try {
      results.coreSheets = claude_checkCoreSheets();
    } catch (error) {
      results.errors.push(`重要シート: ${error.toString()}`);
    }
    
    // 3. シート構造検証
    console.log('3️⃣ シート構造検証...');
    try {
      const structureResults = claude_verifyAllSheets();
      const failedSheets = structureResults.filter(r => r.status.includes('❌'));
      results.sheetStructure = failedSheets.length === 0;
      
      if (failedSheets.length > 0) {
        results.errors.push(`構造不整合: ${failedSheets.map(s => s.sheet).join(', ')}`);
      }
    } catch (error) {
      results.errors.push(`構造検証: ${error.toString()}`);
    }
    
    // 4. データアクセステスト
    console.log('4️⃣ データアクセステスト...');
    try {
      results.dataAccess = claude_testDataAccess();
    } catch (error) {
      results.errors.push(`データアクセス: ${error.toString()}`);
    }
    
    // 5. 結果サマリー
    console.log('=== Claude Code システム総合チェック結果 ===');
    console.log(`GitHub連携: ${results.githubSync ? '✅' : '❌'}`);
    console.log(`重要シート: ${results.coreSheets ? '✅' : '❌'}`);
    console.log(`シート構造: ${results.sheetStructure ? '✅' : '❌'}`);
    console.log(`データアクセス: ${results.dataAccess ? '✅' : '❌'}`);
    
    if (results.errors.length > 0) {
      console.log('🚨 エラー詳細:');
      results.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    const overallSuccess = results.githubSync && results.sheetStructure && 
                          results.dataAccess && results.coreSheets;
    
    console.log(`📊 総合判定: ${overallSuccess ? '✅ 成功' : '❌ 問題あり'}`);
    
    // システムログに記録
    claude_logEvent(
      overallSuccess ? 'INFO' : 'WARNING',
      'システムチェック',
      '総合チェック',
      `結果: ${overallSuccess ? '成功' : '問題あり'}, エラー数: ${results.errors.length}`
    );
    
    return results;
    
  } catch (error) {
    console.error('システム総合チェックエラー:', error.toString());
    claude_logEvent('ERROR', 'システムチェック', '総合チェック', error.toString());
    throw error;
  }
}

/**
 * 重要シートの存在確認
 */
function claude_checkCoreSheets() {
  try {
    const coreSheets = [
      '加盟店子ユーザー一覧',
      '加盟店情報', 
      '問い合わせ履歴',
      'ユーザー情報',
      'システムログ'
    ];
    
    const results = [];
    
    for (const sheetName of coreSheets) {
      try {
        const sheet = getSheetByName_(sheetName);
        const rowCount = sheet.getDataRange().getNumRows();
        results.push({
          sheet: sheetName,
          status: '✅ 存在',
          rows: rowCount
        });
      } catch (error) {
        results.push({
          sheet: sheetName,
          status: '❌ 未検出',
          error: error.message
        });
      }
    }
    
    console.log('重要シート確認結果:');
    results.forEach(result => {
      console.log(`  ${result.sheet}: ${result.status} ${result.rows ? `(${result.rows}行)` : ''}`);
      if (result.error) {
        console.error(`    エラー: ${result.error}`);
      }
    });
    
    const failedSheets = results.filter(r => r.status.includes('❌'));
    return failedSheets.length === 0;
    
  } catch (error) {
    console.error('重要シート確認エラー:', error.toString());
    throw error;
  }
}

/**
 * データアクセステスト
 */
function claude_testDataAccess() {
  try {
    console.log('データアクセステスト開始...');
    
    const tests = [
      {
        name: '加盟店子ユーザー一覧アクセス',
        test: () => claude_testChildUserAccess()
      },
      {
        name: '加盟店情報アクセス',
        test: () => claude_testPartnerAccess()
      },
      {
        name: 'システムログ書き込み',
        test: () => claude_testLogWrite()
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        const result = test.test();
        results.push({
          name: test.name,
          status: '✅ 成功',
          result: result
        });
      } catch (error) {
        results.push({
          name: test.name,
          status: '❌ 失敗',
          error: error.message
        });
      }
    }
    
    console.log('データアクセステスト結果:');
    results.forEach(result => {
      console.log(`  ${result.name}: ${result.status}`);
      if (result.error) {
        console.error(`    エラー: ${result.error}`);
      }
    });
    
    const failedTests = results.filter(r => r.status.includes('❌'));
    return failedTests.length === 0;
    
  } catch (error) {
    console.error('データアクセステストエラー:', error.toString());
    throw error;
  }
}

/**
 * 加盟店子ユーザー一覧アクセステスト
 */
function claude_testChildUserAccess() {
  try {
    const requiredColumns = [
      '子ユーザーID', '親加盟店ID', '氏名（表示用）', 
      'メールアドレス', '対応エリア（市区町村）'
    ];
    
    const sheetData = claude_getSafeSheetData('加盟店子ユーザー一覧', requiredColumns);
    
    if (sheetData.headers.length === 0) {
      throw new Error('ヘッダー行が空です');
    }
    
    // カラムインデックス取得テスト
    const indexMap = claude_getColumnIndexMap(
      sheetData.headers, 
      requiredColumns, 
      '加盟店子ユーザー一覧'
    );
    
    console.log('加盟店子ユーザー一覧アクセス成功:', {
      headerCount: sheetData.headers.length,
      rowCount: sheetData.rows.length,
      indexMap: indexMap
    });
    
    return true;
    
  } catch (error) {
    console.error('加盟店子ユーザー一覧アクセステストエラー:', error.toString());
    throw error;
  }
}

/**
 * 加盟店情報アクセステスト
 */
function claude_testPartnerAccess() {
  try {
    const requiredColumns = [
      '加盟店ID', '会社名', '担当者名', 'メールアドレス'
    ];
    
    const sheetData = claude_getSafeSheetData('加盟店情報', requiredColumns);
    
    if (sheetData.headers.length === 0) {
      throw new Error('ヘッダー行が空です');
    }
    
    // カラムインデックス取得テスト
    const indexMap = claude_getColumnIndexMap(
      sheetData.headers, 
      requiredColumns, 
      '加盟店情報'
    );
    
    console.log('加盟店情報アクセス成功:', {
      headerCount: sheetData.headers.length,
      rowCount: sheetData.rows.length,
      indexMap: indexMap
    });
    
    return true;
    
  } catch (error) {
    console.error('加盟店情報アクセステストエラー:', error.toString());
    throw error;
  }
}

/**
 * システムログ書き込みテスト
 */
function claude_testLogWrite() {
  try {
    claude_logEvent(
      'INFO',
      'システムテスト',
      'ログ書き込みテスト',
      'claude_sheetCheckTest実行中のテストログ',
      'TEST-001'
    );
    
    console.log('システムログ書き込みテスト成功');
    return true;
    
  } catch (error) {
    console.error('システムログ書き込みテストエラー:', error.toString());
    throw error;
  }
}

/**
 * 個別シート構造確認（デバッグ用）
 * @param {string} sheetName - 確認対象シート名
 */
function claude_debugSheetStructure(sheetName) {
  try {
    console.log(`=== ${sheetName} 構造詳細確認 ===`);
    
    const sheet = getSheetByName_(sheetName);
    const dataRange = sheet.getDataRange();
    const headers = dataRange.getValues()[0];
    
    console.log('シート情報:');
    console.log(`  行数: ${dataRange.getNumRows()}`);
    console.log(`  列数: ${dataRange.getNumColumns()}`);
    console.log(`  ヘッダー数: ${headers.length}`);
    
    console.log('ヘッダー一覧:');
    headers.forEach((header, index) => {
      console.log(`  [${index}] "${header}" (型: ${typeof header})`);
    });
    
    // 標準カラムとの比較
    const standardColumns = claude_getStandardColumns();
    if (standardColumns[sheetName]) {
      const missing = standardColumns[sheetName].filter(col => !headers.includes(col));
      const extra = headers.filter(col => !standardColumns[sheetName].includes(col));
      
      if (missing.length > 0) {
        console.log('不足カラム:', missing);
      }
      if (extra.length > 0) {
        console.log('追加カラム:', extra);
      }
    }
    
    return {
      rowCount: dataRange.getNumRows(),
      columnCount: dataRange.getNumColumns(),
      headers: headers
    };
    
  } catch (error) {
    console.error(`シート構造確認エラー: ${sheetName}`, error.toString());
    throw error;
  }
}

/**
 * 全システム初期化テスト（開発時のみ実行）
 */
function claude_fullSystemInitTest() {
  try {
    console.log('=== 全システム初期化テスト開始 ===');
    console.warn('⚠️ これは開発時のみ実行してください');
    
    // 1. GitHub同期
    console.log('1️⃣ GitHub同期強制実行...');
    claude_fetchGitHubMdCache();
    
    // 2. 全シート構造確認
    console.log('2️⃣ 全シート構造確認...');
    const standardColumns = claude_getStandardColumns();
    
    for (const sheetName of Object.keys(standardColumns)) {
      try {
        claude_debugSheetStructure(sheetName);
      } catch (error) {
        console.error(`シート確認失敗: ${sheetName} - ${error.toString()}`);
      }
    }
    
    // 3. 総合チェック実行
    console.log('3️⃣ 総合チェック実行...');
    const checkResult = claude_sheetCheckTest();
    
    console.log('=== 全システム初期化テスト完了 ===');
    return checkResult;
    
  } catch (error) {
    console.error('全システム初期化テストエラー:', error.toString());
    throw error;
  }
}

/**
 * クイックヘルスチェック（軽量版）
 */
function claude_quickHealthCheck() {
  try {
    console.log('⚡ クイックヘルスチェック実行中...');
    
    const checks = {
      spreadsheetAccess: false,
      coreSheets: false,
      logAccess: false
    };
    
    // スプレッドシートアクセス
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (spreadsheetId) {
        SpreadsheetApp.openById(spreadsheetId);
        checks.spreadsheetAccess = true;
      }
    } catch (error) {
      console.error('スプレッドシートアクセス失敗:', error.toString());
    }
    
    // 重要シート存在確認（軽量）
    try {
      getSheetByName_('システムログ');
      getSheetByName_('加盟店子ユーザー一覧');
      checks.coreSheets = true;
    } catch (error) {
      console.error('重要シート確認失敗:', error.toString());
    }
    
    // ログアクセス
    try {
      claude_logEvent('INFO', 'ヘルスチェック', 'クイックチェック', 'システム正常');
      checks.logAccess = true;
    } catch (error) {
      console.error('ログアクセス失敗:', error.toString());
    }
    
    const overallHealth = Object.values(checks).every(check => check);
    
    console.log(`⚡ クイックヘルスチェック結果: ${overallHealth ? '✅ 正常' : '❌ 問題あり'}`);
    console.log('詳細:', checks);
    
    return checks;
    
  } catch (error) {
    console.error('クイックヘルスチェックエラー:', error.toString());
    throw error;
  }
}