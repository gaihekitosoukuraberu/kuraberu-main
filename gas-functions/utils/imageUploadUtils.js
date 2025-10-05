/**
 * ====================================
 * 画像アップロード共通ユーティリティ
 * ====================================
 * 会社情報画像（メインビジュアル、ギャラリー、施工事例）専用
 * 本人確認証とは別フォルダ構造で管理
 */

const ImageUploadUtils = {
  /**
   * 加盟店の画像フォルダを取得または作成
   * /加盟店画像/{merchantId}/
   */
  getOrCreateMerchantImageFolder: function(merchantId) {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      let rootFolderId = scriptProperties.getProperty('DRIVE_ROOT_FOLDER_ID');

      if (!rootFolderId) {
        throw new Error('DRIVE_ROOT_FOLDER_ID が設定されていません');
      }

      const rootFolder = DriveApp.getFolderById(rootFolderId);

      // /加盟店画像/ フォルダを取得または作成
      let merchantImagesFolder;
      const merchantImagesFolders = rootFolder.getFoldersByName('加盟店画像');
      if (merchantImagesFolders.hasNext()) {
        merchantImagesFolder = merchantImagesFolders.next();
      } else {
        merchantImagesFolder = rootFolder.createFolder('加盟店画像');
        console.log('[ImageUploadUtils] 加盟店画像フォルダ作成');
      }

      // /{merchantId}/ フォルダを取得または作成
      let merchantFolder;
      const merchantFolders = merchantImagesFolder.getFoldersByName(merchantId);
      if (merchantFolders.hasNext()) {
        merchantFolder = merchantFolders.next();
      } else {
        merchantFolder = merchantImagesFolder.createFolder(merchantId);
        console.log('[ImageUploadUtils] 加盟店フォルダ作成:', merchantId);
      }

      return merchantFolder;

    } catch (error) {
      console.error('[ImageUploadUtils] getOrCreateMerchantImageFolder error:', error);
      throw error;
    }
  },

  /**
   * サブフォルダを取得または作成
   * @param {Folder} parentFolder - 親フォルダ
   * @param {string} folderName - フォルダ名
   */
  getOrCreateSubFolder: function(parentFolder, folderName) {
    try {
      const subFolders = parentFolder.getFoldersByName(folderName);
      if (subFolders.hasNext()) {
        return subFolders.next();
      } else {
        const newFolder = parentFolder.createFolder(folderName);
        console.log('[ImageUploadUtils] サブフォルダ作成:', folderName);
        return newFolder;
      }
    } catch (error) {
      console.error('[ImageUploadUtils] getOrCreateSubFolder error:', error);
      throw error;
    }
  },

  /**
   * Base64画像をDriveにアップロード
   * @param {string} base64Data - Base64エンコードされた画像データ
   * @param {string} merchantId - 加盟店ID
   * @param {string} category - カテゴリ (main-visual/gallery/construction-examples)
   * @param {string} fileName - ファイル名（オプション）
   * @return {Object} {success, fileId, url, error}
   */
  uploadBase64Image: function(base64Data, merchantId, category, fileName) {
    try {
      // サイズ制限チェック（10MB）
      const MAX_FILE_SIZE = 10 * 1024 * 1024;

      // Base64データを分離
      const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        throw new Error('無効なBase64データ形式です');
      }

      const mimeType = base64Match[1];
      const base64Content = base64Match[2];

      // 画像形式チェック
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        throw new Error('対応していない画像形式です: ' + mimeType);
      }

      // デコード
      const decoded = Utilities.base64Decode(base64Content);

      // サイズチェック
      if (decoded.length > MAX_FILE_SIZE) {
        throw new Error('ファイルサイズが10MBを超えています');
      }

      // フォルダ取得
      const merchantFolder = this.getOrCreateMerchantImageFolder(merchantId);
      const categoryFolder = this.getOrCreateSubFolder(merchantFolder, category);

      // ファイル名生成
      const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
      const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
      const finalFileName = fileName || `${category}_${timestamp}.${extension}`;

      // Blob作成
      const blob = Utilities.newBlob(decoded, mimeType, finalFileName);

      // アップロード
      const file = categoryFolder.createFile(blob);

      // 公開設定（誰でも閲覧可能）
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileId = file.getId();
      const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

      console.log('[ImageUploadUtils] アップロード成功:', finalFileName, 'DriveID:', fileId);

      return {
        success: true,
        fileId: fileId,
        url: url,
        fileName: finalFileName,
        size: decoded.length
      };

    } catch (error) {
      console.error('[ImageUploadUtils] uploadBase64Image error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Driveからファイルを削除
   * @param {string} fileId - DriveファイルID
   * @return {Object} {success, error}
   */
  deleteFile: function(fileId) {
    try {
      if (!fileId) {
        throw new Error('fileId が指定されていません');
      }

      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);

      console.log('[ImageUploadUtils] ファイル削除成功:', fileId);

      return {
        success: true
      };

    } catch (error) {
      console.error('[ImageUploadUtils] deleteFile error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 複数ファイルを一括削除
   * @param {Array<string>} fileIds - DriveファイルIDの配列
   * @return {Object} {success, deletedCount, errors}
   */
  deleteMultipleFiles: function(fileIds) {
    try {
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return {
          success: true,
          deletedCount: 0
        };
      }

      let deletedCount = 0;
      const errors = [];

      fileIds.forEach(fileId => {
        try {
          const file = DriveApp.getFileById(fileId);
          file.setTrashed(true);
          deletedCount++;
        } catch (err) {
          errors.push({ fileId: fileId, error: err.toString() });
        }
      });

      console.log('[ImageUploadUtils] 一括削除完了:', deletedCount, '件');

      return {
        success: errors.length === 0,
        deletedCount: deletedCount,
        errors: errors
      };

    } catch (error) {
      console.error('[ImageUploadUtils] deleteMultipleFiles error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ファイル存在チェック
   * @param {string} fileId - DriveファイルID
   * @return {boolean}
   */
  fileExists: function(fileId) {
    try {
      if (!fileId) return false;
      DriveApp.getFileById(fileId);
      return true;
    } catch (error) {
      return false;
    }
  }
};
