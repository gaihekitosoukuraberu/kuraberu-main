/**
 * autoBackup.gs - 自動バックアップ機能
 * スプレッドシートデータとGASコードの定期バックアップを実行します
 */

// 設定値
const BACKUP_CONFIG = {
  // バックアップ保存先
  BACKUP_FOLDER_ID: '1234567890abcdefghijklmnopqrstuvwxyz', // 本番では実際のGoogleドライブフォルダIDに置き換え
  
  // バックアップ設定
  BACKUP_PREFIX: 'kuraberu_backup_',
  DAYS_TO_KEEP: 30, // 保持する日数
  
  // 通知設定
  NOTIFY_EMAIL: 'admin@example.com', // 本番では実際のメールアドレスに置き換え
  SEND_SUCCESS_NOTIFICATION: false, // 成功時も通知するか
  SEND_FAILURE_NOTIFICATION: true   // 失敗時は通知するか
};

/**
 * 日次バックアップを実行（トリガーで定期実行）
 */
function createDailyBackup() {
  try {
    console.log('日次バックアップを開始します');
    
    // アクティブなスプレッドシートを取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    // バックアップフォルダを取得
    const folder = getBackupFolder();
    
    // タイムスタンプ付きのバックアップ名を作成
    const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
    const backupFileName = `${BACKUP_CONFIG.BACKUP_PREFIX}${timestamp}`;
    
    // 新しいバックアップスプレッドシートを作成
    const backupFile = SpreadsheetApp.create(backupFileName);
    const backupId = backupFile.getId();
    
    // 元のスプレッドシートの各シートをコピー
    sheets.forEach(sheet => {
      const sourceRange = sheet.getDataRange();
      const sourceValues = sourceRange.getValues();
      
      // バックアップスプレッドシートに新しいシートを作成
      let targetSheet;
      try {
        targetSheet = backupFile.insertSheet(sheet.getName());
      } catch (e) {
        // 同名のシートが存在する場合は連番をつける
        targetSheet = backupFile.insertSheet(`${sheet.getName()}_${new Date().getTime()}`);
      }
      
      if (sourceValues.length > 0) {
        targetSheet.getRange(1, 1, sourceValues.length, sourceValues[0].length)
          .setValues(sourceValues);
      }
    });
    
    // デフォルトのSheet1を削除（存在する場合）
    try {
      const defaultSheet = backupFile.getSheetByName('Sheet1');
      if (defaultSheet) {
        backupFile.deleteSheet(defaultSheet);
      }
    } catch (e) {
      console.warn('デフォルトシートの削除中にエラー:', e);
    }
    
    // バックアップをフォルダに移動
    const file = DriveApp.getFileById(backupId);
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    
    // CSVエクスポート
    exportSheetsToCSV(sheets, folder, backupFileName);
    
    // GASスクリプトのバックアップも作成
    backupGASScripts(folder, timestamp);
    
    // 古いバックアップの削除
    cleanupOldBackups(folder);
    
    // 実行ログに記録
    logBackupExecution({
      type: 'success',
      timestamp: new Date().toISOString(),
      backupFileName: backupFileName,
      sheetsCount: sheets.length,
      fileId: backupId
    });
    
    // 成功通知（設定されている場合）
    if (BACKUP_CONFIG.SEND_SUCCESS_NOTIFICATION) {
      sendNotificationEmail(
        'バックアップ成功',
        `外壁塗装くらべるのバックアップが正常に完了しました。\n\nファイル名: ${backupFileName}\nタイムスタンプ: ${timestamp}\nシート数: ${sheets.length}`
      );
    }
    
    console.log(`バックアップ完了: ${backupFileName}`);
    
    return {
      success: true,
      message: `バックアップを作成しました: ${backupFileName}`,
      fileId: backupId,
      timestamp: timestamp
    };
    
  } catch (error) {
    console.error('バックアップ作成中にエラーが発生しました:', error);
    
    // 実行ログに記録
    logBackupExecution({
      type: 'error',
      timestamp: new Date().toISOString(),
      error: error.toString(),
      stack: error.stack
    });
    
    // エラー通知（設定されている場合）
    if (BACKUP_CONFIG.SEND_FAILURE_NOTIFICATION) {
      sendNotificationEmail(
        '【緊急】バックアップ失敗',
        `外壁塗装くらべるのバックアップ中にエラーが発生しました。\n\nエラー: ${error.toString()}\n\nスタックトレース: ${error.stack}\n\n手動でのバックアップを至急実行してください。`
      );
    }
    
    return {
      success: false,
      message: `エラー: ${error.message}`
    };
  }
}

/**
 * バックアップ保存用フォルダを取得
 * @returns {GoogleAppsScript.Drive.Folder} バックアップフォルダ
 */
function getBackupFolder() {
  try {
    // 設定されたIDでフォルダを取得
    const folder = DriveApp.getFolderById(BACKUP_CONFIG.BACKUP_FOLDER_ID);
    return folder;
  } catch (e) {
    // フォルダが見つからない場合は新規作成
    console.log('バックアップフォルダが見つかりません。新規作成します。');
    const newFolder = DriveApp.createFolder('Kuraberu_Backups');
    
    // 新しいフォルダIDをログに出力（設定更新用）
    console.log(`新しいバックアップフォルダID: ${newFolder.getId()}`);
    
    return newFolder;
  }
}

/**
 * シートをCSV形式にエクスポート
 * @param {Array} sheets - スプレッドシートの全シート配列
 * @param {GoogleAppsScript.Drive.Folder} folder - 保存先フォルダ
 * @param {string} baseFileName - ベースファイル名
 */
function exportSheetsToCSV(sheets, folder, baseFileName) {
  sheets.forEach(sheet => {
    try {
      const csvContent = convertSheetToCSV(sheet);
      const csvFileName = `${baseFileName}_${sheet.getName()}.csv`;
      folder.createFile(csvFileName, csvContent, MimeType.CSV);
    } catch (e) {
      console.warn(`シート "${sheet.getName()}" のCSVエクスポート中にエラー:`, e);
    }
  });
}

/**
 * シートをCSV形式に変換
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - スプレッドシートのシート
 * @returns {string} CSV形式のテキスト
 */
function convertSheetToCSV(sheet) {
  const data = sheet.getDataRange().getValues();
  return data.map(row => 
    row.map(cell => {
      // セルの内容をCSVエスケープ
      if (cell === null || cell === undefined) {
        return '';
      } else if (typeof cell === 'string') {
        // 文字列の場合はダブルクォートでエスケープ
        return `"${cell.replace(/"/g, '""')}"`;
      } else if (cell instanceof Date) {
        // 日付の場合はISO形式で出力
        return `"${cell.toISOString()}"`;
      } else {
        // その他の型はそのまま出力
        return cell;
      }
    }).join(',')
  ).join('\n');
}

/**
 * GASスクリプトのバックアップを作成
 * @param {GoogleAppsScript.Drive.Folder} folder - 保存先フォルダ
 * @param {string} timestamp - タイムスタンプ文字列
 */
function backupGASScripts(folder, timestamp) {
  try {
    // 現在のプロジェクトのファイルを取得
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_APPS_SCRIPT);
    const scriptBackupContent = {};
    
    // 各スクリプトファイルの情報を収集
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      const fileId = file.getId();
      
      try {
        // スクリプトプロジェクト内の各ファイルの内容を取得
        const scriptProject = ScriptApp.getProjectById(fileId);
        const scriptFiles = scriptProject.getFiles();
        
        const fileContents = {};
        scriptFiles.forEach(scriptFile => {
          fileContents[scriptFile.getName()] = scriptFile.getSource();
        });
        
        scriptBackupContent[fileName] = {
          projectId: fileId,
          files: fileContents
        };
      } catch (e) {
        console.warn(`スクリプト "${fileName}" の内容取得中にエラー:`, e);
      }
    }
    
    // すべてのスクリプト内容をJSONファイルに保存
    if (Object.keys(scriptBackupContent).length > 0) {
      const scriptBackupJson = JSON.stringify(scriptBackupContent, null, 2);
      const backupFileName = `${BACKUP_CONFIG.BACKUP_PREFIX}scripts_${timestamp}.json`;
      folder.createFile(backupFileName, scriptBackupJson, MimeType.PLAIN_TEXT);
    }
  } catch (error) {
    console.error('GASスクリプトのバックアップ中にエラー:', error);
  }
}

/**
 * 古いバックアップファイルを削除
 * @param {GoogleAppsScript.Drive.Folder} folder - バックアップフォルダ
 */
function cleanupOldBackups(folder) {
  try {
    // 保持期間の計算（ミリ秒）
    const retention = BACKUP_CONFIG.DAYS_TO_KEEP * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(new Date().getTime() - retention);
    
    // バックアップファイルの取得
    const backupFiles = folder.getFiles();
    let deletedFiles = 0;
    
    while (backupFiles.hasNext()) {
      const file = backupFiles.next();
      const fileName = file.getName();
      
      // バックアッププレフィックスで始まるファイルか確認
      if (fileName.indexOf(BACKUP_CONFIG.BACKUP_PREFIX) === 0) {
        const createDate = file.getDateCreated();
        
        // 保持期間を過ぎたファイルを削除
        if (createDate < cutoffDate) {
          file.setTrashed(true);
          deletedFiles++;
        }
      }
    }
    
    if (deletedFiles > 0) {
      console.log(`古いバックアップファイル ${deletedFiles} 件を削除しました`);
    }
  } catch (error) {
    console.error('古いバックアップの削除中にエラー:', error);
  }
}

/**
 * バックアップ実行ログを記録
 * @param {Object} logData - ログデータ
 */
function logBackupExecution(logData) {
  try {
    // バックアップ実行ログシートを取得または作成
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('バックアップログ');
    
    if (!logSheet) {
      logSheet = ss.insertSheet('バックアップログ');
      
      // ヘッダー行を設定
      logSheet.appendRow([
        'タイムスタンプ',
        'ステータス',
        'バックアップファイル名',
        'シート数',
        'ファイルID',
        'エラー詳細'
      ]);
      
      // ヘッダー行の書式設定
      logSheet.getRange(1, 1, 1, 6).setBackground('#E0E0E0').setFontWeight('bold');
    }
    
    // ログデータの行を追加
    const logRow = [
      new Date(), // タイムスタンプ
      logData.type === 'success' ? '成功' : 'エラー',
      logData.backupFileName || '',
      logData.sheetsCount || '',
      logData.fileId || '',
      logData.error || ''
    ];
    
    logSheet.appendRow(logRow);
    
    // エラーの場合は行を赤くハイライト
    if (logData.type === 'error') {
      const lastRow = logSheet.getLastRow();
      logSheet.getRange(lastRow, 1, 1, 6).setBackground('#FFCDD2');
    }
  } catch (error) {
    console.error('バックアップログの記録中にエラー:', error);
  }
}

/**
 * 通知メールを送信
 * @param {string} subject - メール件名
 * @param {string} body - メール本文
 */
function sendNotificationEmail(subject, body) {
  if (!BACKUP_CONFIG.NOTIFY_EMAIL) return;
  
  try {
    MailApp.sendEmail({
      to: BACKUP_CONFIG.NOTIFY_EMAIL,
      subject: `【外壁塗装くらべる】${subject}`,
      body: body
    });
  } catch (error) {
    console.error('通知メール送信中にエラー:', error);
  }
}

/**
 * 時間トリガー設定
 * 毎日深夜に自動バックアップを実行するトリガーを設定
 */
function setupBackupTrigger() {
  // 既存のバックアップトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  const backupTriggers = triggers.filter(trigger => 
    trigger.getHandlerFunction() === 'createDailyBackup'
  );
  
  backupTriggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // 新しいトリガーを設定（毎日深夜3時に実行）
  ScriptApp.newTrigger('createDailyBackup')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();
  
  return {
    success: true,
    message: 'バックアップトリガーを設定しました（毎日深夜3時に実行）'
  };
}

/**
 * 手動でバックアップを実行
 * （GASエディタから直接実行可能）
 */
function runBackupManually() {
  const result = createDailyBackup();
  Logger.log(result.message);
  return result;
}