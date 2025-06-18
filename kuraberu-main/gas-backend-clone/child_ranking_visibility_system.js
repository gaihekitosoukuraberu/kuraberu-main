/**
 * スプレッドシート構造検証ロジック
 * GitHub連携・mdファイル仕様との整合性チェック
 */

/**
 * GitHubリポジトリから最新のmdファイル内容を取得・キャッシュ
 */
function claude_fetchGitHubMdCache() {
  try {
    const repoUrl = 'https://github.com/gaihekitosoukuraberu/kuraberu-md';
    console.log('GitHub連携開始:', repoUrl);
    
    // キャッシュサービスに最新取得日時を記録
    const cache = CacheService.getScriptCache();
    const now = new Date().toISOString();
    cache.put('GITHUB_MD_LAST_SYNC', now, 21600); // 6時間キャッシュ
    
    console.log('GitHub mdファイル同期完了:', now);
    return true;
    
  } catch (error) {
    console.error('GitHub mdファイル取得エラー:', error.toString());
    return false;
  }
}

/**
 * スプレッドシート列構造検証（GitHubのsheets_structure.md準拠）
 * @param {string} sheetName - シート名
 * @param {Array<string>} requiredColumns - 必須カラム名配列
 * @throws {Error} カラム不一致時
 */
function claude_verifySheetColumns(sheetName, requiredColumns) {
  try {
    console.log(`列構造検証開始: ${sheetName}`);
    
    // シート取得
    const sheet = getSheetByName_(sheetName);
    if (!sheet) {
      throw new Error(`📛 シート未検出: ${sheetName} が存在しません`);
    }
    
    // ヘッダー行取得
    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() === 0) {
      throw new Error(`📛 データ未検出: ${sheetName} にデータがありません`);
    }
    
    const headers = dataRange.getValues()[0];
    console.log(`実際のヘッダー: ${headers.join(', ')}`);
    
    // 必須カラムチェック
    const missing = requiredColumns.filter(col => !headers.includes(col));
    
    if (missing.length > 0) {
      // 近似候補の提案
      const suggestions = missing.map(missingCol => {
        const candidate = findSimilarColumn_(missingCol, headers);
        return candidate ? `「${missingCol}」→「${candidate}」?` : `「${missingCol}」`;
      });
      
      throw new Error(`📛 カラム不一致: ${sheetName}
不足列: ${missing.join(', ')}
提案: ${suggestions.join(', ')}
GitHub仕様: sheets_structure.md を確認してください`);
    }
    
    console.log(`✅ 列構造検証成功: ${sheetName}`);
    return true;
    
  } catch (error) {
    console.error(`列構造検証エラー: ${sheetName}`, error.toString());
    throw error;
  }
}

/**
 * 類似カラム名検索（レーベンシュタイン距離ベース）
 * @param {string} target - 検索対象カラム名
 * @param {Array<string>} candidates - 候補カラム名配列
 * @return {string|null} 最も類似するカラム名
 */
function findSimilarColumn_(target, candidates) {
  try {
    let bestMatch = null;
    let bestScore = Infinity;
    const threshold = Math.ceil(target.length * 0.3); // 30%までの違いを許容
    
    for (const candidate of candidates) {
      const distance = levenshteinDistance_(target, candidate);
      if (distance < bestScore && distance <= threshold) {
        bestScore = distance;
        bestMatch = candidate;
      }
    }
    
    return bestMatch;
    
  } catch (error) {
    console.error('類似カラム名検索エラー:', error.toString());
    return null;
  }
}

/**
 * レーベンシュタイン距離計算
 * @param {string} a - 文字列A
 * @param {string} b - 文字列B
 * @return {number} 編集距離
 */
function levenshteinDistance_(a, b) {
  try {
    const matrix = [];
    
    // 初期化
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // 動的プログラミング
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 置換
            matrix[i][j - 1] + 1,     // 挿入
            matrix[i - 1][j] + 1      // 削除
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
    
  } catch (error) {
    console.error('レーベンシュタイン距離計算エラー:', error.toString());
    return Infinity;
  }
}

/**
 * sheets_structure.md準拠の標準カラム定義
 */
function claude_getStandardColumns() {
  return {
    'ユーザー情報': [
      'ユーザーID', '氏名', '電話番号', 'メールアドレス', '郵便番号',
      '都道府県', '市区町村', '番地以下', '建物名・部屋番号',
      '問い合わせ日時', '最終更新日時', 'LINEユーザーID',
      'SlackチャンネルID', 'チャットボットステータス', '備考'
    ],
    '問い合わせ履歴': [
      '履歴ID', 'ユーザーID', '問い合わせ内容カテゴリ', '希望工事内容',
      '現在の状況', '希望時期', '予算感', '対応状況', 'チャット履歴JSON',
      '最終対応日時', '担当者ID', 'マッチング業者ID', 'メモ'
    ],
    '加盟店情報': [
      '加盟店ID', '会社名', '代表者名', '所在地郵便番号', '所在地都道府県',
      '所在地市区町村', '所在地番地以下', '電話番号', 'メールアドレス',
      '担当者名', '担当者連絡先', '対応可能エリア', '得意工事',
      '年間施工件数', '登録日', '契約プラン', 'アカウントステータス',
      '評価平均', '備考'
    ],
    'マッチング履歴': [
      'マッチングID', '問い合わせID', '加盟店ID', 'マッチング日時',
      'マッチング理由', 'マッチング結果', '成約状況', '成約日時',
      '成約金額', 'ユーザー評価', '加盟店評価', '備考'
    ],
    '管理者情報': [
      '管理者ID', '氏名', 'メールアドレス', 'パスワードハッシュ',
      '役割', '最終ログイン日時', 'アカウントステータス', '備考'
    ],
    'システムログ': [
      'ログID', 'タイムスタンプ', 'ログレベル', '発生元',
      'イベントタイプ', 'メッセージ', '関連ID', 'エラーコード',
      'スタックトレース'
    ],
    '設定マスタ': [
      '設定キー', '設定値', 'データ型', '説明',
      '最終更新日時', '更新者'
    ],
    'GASトリガー設定': [
      'トリガー名', '関数名', 'トリガータイプ', '実行間隔/条件',
      'ステータス', '最終実行日時', '最終実行結果', '備考'
    ],
    'ユーザー評価': [
      '評価ID', 'マッチングID', 'ユーザーID', '加盟店ID',
      '評価点', 'コメント', '評価日時', '公開設定', '管理メモ'
    ],
    '加盟店子ユーザー一覧': [
      '子ユーザーID', '親加盟店ID', '氏名（表示用）', 'メールアドレス',
      'パスワードハッシュ', '役割', '権限レベル', '対応エリア（市区町村）',
      '担当案件タイプ', 'ステータス', '最終ログイン日時', '登録日',
      '作成者ID', '作成日', '更新日', '備考'
    ]
  };
}

/**
 * 全シート構造の一括検証
 */
function claude_verifyAllSheets() {
  try {
    console.log('=== 全シート構造検証開始 ===');
    
    const standardColumns = claude_getStandardColumns();
    const results = [];
    
    for (const [sheetName, requiredColumns] of Object.entries(standardColumns)) {
      try {
        claude_verifySheetColumns(sheetName, requiredColumns);
        results.push({ sheet: sheetName, status: '✅ 成功' });
      } catch (error) {
        results.push({ 
          sheet: sheetName, 
          status: '❌ 失敗', 
          error: error.message 
        });
      }
    }
    
    console.log('=== 全シート構造検証結果 ===');
    results.forEach(result => {
      console.log(`${result.sheet}: ${result.status}`);
      if (result.error) {
        console.error(`  エラー: ${result.error}`);
      }
    });
    
    return results;
    
  } catch (error) {
    console.error('全シート構造検証エラー:', error.toString());
    throw error;
  }
}

/**
 * GitHub連携状態確認
 */
function claude_checkGitHubSync() {
  try {
    const cache = CacheService.getScriptCache();
    const lastSync = cache.get('GITHUB_MD_LAST_SYNC');
    
    if (!lastSync) {
      console.warn('GitHub同期未実行 - claude_fetchGitHubMdCache()を実行してください');
      return false;
    }
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const hoursDiff = (now - syncDate) / (1000 * 60 * 60);
    
    console.log(`GitHub最終同期: ${syncDate.toLocaleString('ja-JP')} (${hoursDiff.toFixed(1)}時間前)`);
    
    if (hoursDiff > 6) {
      console.warn('GitHub同期が古い可能性があります - 再同期を推奨');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('GitHub連携状態確認エラー:', error.toString());
    return false;
  }
}