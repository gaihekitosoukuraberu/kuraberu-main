/**
 * Google Drive ユーティリティ
 * 本人確認書類の保存と管理
 */

/**
 * Drive設定の初期化
 */
function initializeDriveSettings() {
  const scriptProperties = PropertiesService.getScriptProperties();

  // ルートフォルダIDがなければ作成
  let rootFolderId = scriptProperties.getProperty('DRIVE_ROOT_FOLDER_ID');
  if (!rootFolderId) {
    const rootFolder = DriveApp.createFolder('kuraberu');
    rootFolderId = rootFolder.getId();
    scriptProperties.setProperty('DRIVE_ROOT_FOLDER_ID', rootFolderId);
    console.log('ルートフォルダ作成:', rootFolderId);
  }

  // 各サブフォルダを作成
  const rootFolder = DriveApp.getFolderById(rootFolderId);

  // merchants フォルダ
  let merchantsFolderId = scriptProperties.getProperty('MERCHANTS_FOLDER_ID');
  if (!merchantsFolderId) {
    const merchantsFolder = rootFolder.createFolder('merchants');
    merchantsFolderId = merchantsFolder.getId();
    scriptProperties.setProperty('MERCHANTS_FOLDER_ID', merchantsFolderId);
    console.log('merchantsフォルダ作成:', merchantsFolderId);
  }

  // projects フォルダ
  let projectsFolderId = scriptProperties.getProperty('PROJECTS_FOLDER_ID');
  if (!projectsFolderId) {
    const projectsFolder = rootFolder.createFolder('projects');
    projectsFolderId = projectsFolder.getId();
    scriptProperties.setProperty('PROJECTS_FOLDER_ID', projectsFolderId);
    console.log('projectsフォルダ作成:', projectsFolderId);
  }

  // archives フォルダ
  let archivesFolderId = scriptProperties.getProperty('ARCHIVES_FOLDER_ID');
  if (!archivesFolderId) {
    const archivesFolder = rootFolder.createFolder('archives');
    archivesFolderId = archivesFolder.getId();
    scriptProperties.setProperty('ARCHIVES_FOLDER_ID', archivesFolderId);
    console.log('archivesフォルダ作成:', archivesFolderId);
  }

  return {
    rootFolderId,
    merchantsFolderId,
    projectsFolderId,
    archivesFolderId
  };
}

/**
 * 加盟店フォルダを取得または作成
 * @param {string} registrationId - 登録ID (例: FR011712)
 * @param {string} companyName - 会社名
 * @return {GoogleAppsScript.Drive.Folder} フォルダオブジェクト
 */
function getOrCreateMerchantFolder(registrationId, companyName) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const merchantsFolderId = scriptProperties.getProperty('MERCHANTS_FOLDER_ID');

  if (!merchantsFolderId) {
    initializeDriveSettings();
    merchantsFolderId = scriptProperties.getProperty('MERCHANTS_FOLDER_ID');
  }

  const merchantsFolder = DriveApp.getFolderById(merchantsFolderId);

  // 加盟店コードを生成 (m + 登録IDの数字部分)
  const merchantCode = 'm' + registrationId.replace('FR', '');
  const folderName = merchantCode + '_' + companyName;

  // 既存フォルダを検索
  const folders = merchantsFolder.getFoldersByName(folderName);
  let merchantFolder;

  if (folders.hasNext()) {
    merchantFolder = folders.next();
  } else {
    merchantFolder = merchantsFolder.createFolder(folderName);

    // サブフォルダ作成
    merchantFolder.createFolder('documents');  // 本人確認書類
    merchantFolder.createFolder('contracts');  // 契約書
    merchantFolder.createFolder('photos');     // 施工写真

    console.log('加盟店フォルダ作成:', folderName);
  }

  return merchantFolder;
}

/**
 * 本人確認書類を保存
 * @param {Object} documentData - ドキュメントデータ
 * @param {string} registrationId - 登録ID
 * @param {string} companyName - 会社名
 * @return {Object} 保存結果
 */
function saveIdentityDocument(documentData, registrationId, companyName) {
  try {
    // ファイルサイズ制限チェック（10MB）
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Base64データをBlobに変換
    const base64Data = documentData.data.split(',')[1];
    const decoded = Utilities.base64Decode(base64Data);

    // サイズチェック
    if (decoded.length > MAX_FILE_SIZE) {
      throw new Error('ファイルサイズが10MBを超えています');
    }

    // 加盟店フォルダ取得
    const merchantFolder = getOrCreateMerchantFolder(registrationId, companyName);
    const documentsFolder = merchantFolder.getFoldersByName('documents').next();

    // ファイル名生成（サニタイズ）
    const date = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
    const merchantCode = 'm' + registrationId.replace('FR', '');
    const safeCompanyName = companyName.replace(/[\/\\:*?"<>|]/g, '_'); // 不正な文字を置換

    // ドキュメントタイプの日本語変換
    const docTypeMap = {
      'drivers_license': '運転免許証',
      'mynumber': 'マイナンバーカード',
      'passport': 'パスポート',
      'insurance': '健康保険証'
    };
    const docTypeJp = docTypeMap[documentData.type] || documentData.type;
    const sideJp = documentData.side === 'front' ? '表' :
                   documentData.side === 'back' ? '裏' :
                   documentData.side === 'photo' ? '写真' : documentData.side;

    const fileName = `${date}_${merchantCode}_${safeCompanyName}_${docTypeJp}_${sideJp}.jpg`;

    // MIME typeの検証
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    let mimeType = 'image/jpeg'; // デフォルト

    if (documentData.data.includes('data:')) {
      const mimeMatch = documentData.data.match(/data:([^;]+);/);
      if (mimeMatch && allowedTypes.includes(mimeMatch[1])) {
        mimeType = mimeMatch[1];
      }
    }

    // Blob作成
    const blob = Utilities.newBlob(decoded, mimeType, fileName);

    // ファイル保存
    const file = documentsFolder.createFile(blob);

    // ファイル情報を記録
    const fileInfo = {
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      mimeType: file.getMimeType(),
      fileSize: file.getSize(),
      merchantId: registrationId,
      companyName: companyName,
      documentType: documentData.type,
      documentSide: documentData.side,
      createdAt: new Date()
    };

    // ファイルインデックスに記録
    saveFileIndex(fileInfo);

    return {
      success: true,
      fileInfo: fileInfo
    };

  } catch (error) {
    console.error('Document save error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * ファイルインデックスシートを取得（なければ作成）
 * @return {GoogleAppsScript.Spreadsheet.Sheet} シートオブジェクト
 */
function getFileIndexSheet() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_IDが設定されていません');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  let sheet = spreadsheet.getSheetByName('ファイルインデックス');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('ファイルインデックス');

    // ヘッダー設定
    const headers = [
      'ファイルID',
      'ファイル名',
      'ファイルURL',
      '加盟店ID',
      '会社名',
      '書類種別',
      '書類面',
      'サイズ(MB)',
      '登録日時'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // ヘッダー装飾
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 列幅調整
    sheet.autoResizeColumns(1, headers.length);
  }

  return sheet;
}

/**
 * ファイル情報をインデックスシートに保存
 * @param {Object} fileInfo - ファイル情報
 */
function saveFileIndex(fileInfo) {
  try {
    const sheet = getFileIndexSheet();

    const rowData = [
      fileInfo.fileId,
      fileInfo.fileName,
      fileInfo.fileUrl,
      fileInfo.merchantId,
      fileInfo.companyName,
      fileInfo.documentType,
      fileInfo.documentSide,
      (fileInfo.fileSize / 1024 / 1024).toFixed(2), // MB単位
      fileInfo.createdAt
    ];

    sheet.appendRow(rowData);
    console.log('ファイルインデックス保存:', fileInfo.fileName);

  } catch (error) {
    console.error('File index save error:', error);
  }
}

/**
 * ストレージ使用状況レポート生成
 * @return {Object} レポート情報
 */
function generateStorageReport() {
  try {
    const about = Drive.About.get();
    const usedBytes = about.quotaBytesUsed;
    const totalBytes = about.quotaBytesByService
      ? about.quotaBytesByService.find(s => s.serviceName === 'DRIVE').bytesUsed
      : usedBytes;

    const usedGB = (usedBytes / 1024 / 1024 / 1024).toFixed(2);
    const totalGB = 2000; // Google Workspace Business Standardの上限

    // ファイルインデックスから統計取得
    const sheet = getFileIndexSheet();
    const data = sheet.getDataRange().getValues();

    let documentCount = 0;
    let totalSizeMB = 0;

    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        documentCount++;
        totalSizeMB += parseFloat(data[i][7]) || 0;
      }
    }

    return {
      usedGB: parseFloat(usedGB),
      totalGB: totalGB,
      percentUsed: (usedGB / totalGB * 100).toFixed(1),
      documentCount: documentCount,
      documentSizeGB: (totalSizeMB / 1024).toFixed(2),
      remainingGB: (totalGB - usedGB).toFixed(2)
    };

  } catch (error) {
    console.error('Storage report error:', error);
    return {
      error: error.toString()
    };
  }
}

/**
 * Drive初期設定実行（一度だけ実行）
 */
function setupDrive() {
  const result = initializeDriveSettings();
  console.log('Drive設定完了:', result);
  return result;
}