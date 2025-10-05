/**
 * ====================================
 * 会社情報管理システム
 * ====================================
 * 加盟店の会社情報（画像・資格・保険等）を管理
 *
 * 担当カラム：
 * - AR: メインビジュアル (44列目)
 * - AS: 写真ギャラリー（JSON配列） (45列目)
 * - AT: 保有資格（JSON） (46列目)
 * - AU: 加入保険（JSON） (47列目)
 *
 * 注: 施工事例は別シート「施工事例」で管理
 */

const CompanyInfoManager = {

  /**
   * ====================================
   * メインビジュアル管理
   * ====================================
   */

  /**
   * メインビジュアル画像をアップロード
   */
  uploadMainVisual: function(params) {
    try {
      const merchantId = params.merchantId;
      const base64Data = params.base64Data;

      if (!merchantId || !base64Data) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      // 既存画像を削除
      const existingData = this.getMerchantData(merchantId);
      if (existingData && existingData.mainVisual) {
        const oldFileId = this.extractFileIdFromUrl(existingData.mainVisual);
        if (oldFileId) {
          ImageUploadUtils.deleteFile(oldFileId);
        }
      }

      // 新規アップロード
      const uploadResult = ImageUploadUtils.uploadBase64Image(
        base64Data,
        merchantId,
        'main-visual',
        null
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // スプレッドシート更新（AR列）
      const updateResult = this.updateMainVisual(merchantId, uploadResult.url);

      if (updateResult.success) {
        return {
          success: true,
          url: uploadResult.url,
          fileId: uploadResult.fileId
        };
      } else {
        return updateResult;
      }

    } catch (error) {
      console.error('[CompanyInfoManager] uploadMainVisual error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * メインビジュアル画像を削除
   */
  deleteMainVisual: function(params) {
    try {
      const merchantId = params.merchantId;

      if (!merchantId) {
        return { success: false, error: 'merchantIdが必要です' };
      }

      // 既存データ取得
      const existingData = this.getMerchantData(merchantId);
      if (!existingData || !existingData.mainVisual) {
        return { success: true, message: '削除する画像がありません' };
      }

      // Drive削除
      const fileId = this.extractFileIdFromUrl(existingData.mainVisual);
      if (fileId) {
        ImageUploadUtils.deleteFile(fileId);
      }

      // スプレッドシート更新（AR列をクリア）
      return this.updateMainVisual(merchantId, '');

    } catch (error) {
      console.error('[CompanyInfoManager] deleteMainVisual error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ====================================
   * 写真ギャラリー管理
   * ====================================
   */

  /**
   * ギャラリー写真を追加
   */
  addGalleryPhoto: function(params) {
    try {
      const merchantId = params.merchantId;
      const base64Data = params.base64Data;

      if (!merchantId || !base64Data) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      // 既存ギャラリー取得
      const existingData = this.getMerchantData(merchantId);
      let gallery = [];

      if (existingData && existingData.photoGallery) {
        try {
          gallery = JSON.parse(existingData.photoGallery);
        } catch (e) {
          gallery = [];
        }
      }

      // 上限チェック（20枚）
      if (gallery.length >= 20) {
        return {
          success: false,
          error: 'ギャラリーは最大20枚までです'
        };
      }

      // アップロード
      const uploadResult = ImageUploadUtils.uploadBase64Image(
        base64Data,
        merchantId,
        'gallery',
        null
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // ギャラリー配列に追加
      gallery.push({
        url: uploadResult.url,
        driveId: uploadResult.fileId,
        uploadDate: new Date().toISOString(),
        order: gallery.length
      });

      // スプレッドシート更新（AS列に直接保存）
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：登録ID
          const jsonStr = JSON.stringify(gallery);
          sheet.getRange(i + 1, 45).setValue(jsonStr); // AS列 = 45列目
          console.log('[CompanyInfoManager] addGalleryPhoto - Saved', gallery.length, 'photos');

          return {
            success: true,
            url: uploadResult.url,
            gallery: gallery,
            newPhoto: gallery[gallery.length - 1]
          };
        }
      }

      return { success: false, error: '加盟店が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] addGalleryPhoto error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ギャラリーデータを保存
   */
  saveGalleryData: function(params) {
    try {
      const merchantId = params.merchantId;
      const galleryData = params.galleryData;

      if (!merchantId) {
        return { success: false, error: '加盟店IDが必要です' };
      }

      // CONFIG設定
      const CONFIG = {
        SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
        SHEET_NAME: '加盟店登録'
      };

      // スプレッドシート更新
      const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
      const data = sheet.getDataRange().getValues();

      // B列で加盟店IDを検索
      const rowIndex = data.findIndex((row, idx) => idx > 0 && row[1] === merchantId);

      if (rowIndex === -1) {
        return { success: false, error: '加盟店が見つかりません' };
      }

      // ギャラリーデータをJSON文字列として保存（適切な列に）
      const galleryJson = JSON.stringify(galleryData || []);
      // AX列（50列目）など適切な列に保存 - 実際の列番号は要確認
      sheet.getRange(rowIndex + 1, 50).setValue(galleryJson);

      return {
        success: true,
        message: 'ギャラリーデータを保存しました'
      };

    } catch (error) {
      console.error('[CompanyInfoManager] saveGalleryData error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ギャラリー写真を削除
   */
  deleteGalleryPhoto: function(params) {
    try {
      const merchantId = params.merchantId;
      const fileId = params.fileId || params.driveId;

      if (!merchantId || !fileId) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      // 既存ギャラリー取得
      const existingData = this.getMerchantData(merchantId);
      if (!existingData || !existingData.photoGallery) {
        return { success: true, message: '削除する画像がありません' };
      }

      let gallery;
      try {
        gallery = JSON.parse(existingData.photoGallery);
      } catch (parseError) {
        // 古い形式（カンマ区切りURL文字列）の可能性があるので、新形式に変換
        console.log('[CompanyInfoManager] deleteGalleryPhoto - Converting old format to new format');
        const urls = existingData.photoGallery.split(',').map(function(url) { return url.trim(); }).filter(function(url) { return url; });

        gallery = urls.map(function(url, index) {
          // URLからファイルIDを抽出
          let fileIdMatch = url.match(/\/d\/([^\/\?]+)/);
          if (!fileIdMatch) {
            fileIdMatch = url.match(/[?&]id=([^&]+)/);
          }
          const extractedFileId = fileIdMatch ? fileIdMatch[1] : null;

          return {
            url: url,
            driveId: extractedFileId,
            uploadDate: new Date().toISOString(),
            order: index
          };
        });
      }

      // 対象画像を削除
      gallery = gallery.filter(function(photo) {
        return photo.driveId !== fileId;
      });

      // orderを再調整
      gallery.forEach(function(photo, index) {
        photo.order = index;
      });

      // Drive削除
      ImageUploadUtils.deleteFile(fileId);

      // スプレッドシート更新（AS列に直接保存）
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：登録ID
          const jsonStr = JSON.stringify(gallery);
          sheet.getRange(i + 1, 45).setValue(jsonStr); // AS列 = 45列目
          console.log('[CompanyInfoManager] deleteGalleryPhoto - Saved', gallery.length, 'photos');
          return { success: true, gallery: gallery };
        }
      }

      return { success: false, error: '加盟店が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] deleteGalleryPhoto error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ギャラリー写真の順序を変更
   */
  reorderGalleryPhotos: function(params) {
    try {
      const merchantId = params.merchantId;
      const photoOrder = params.photoOrder; // [{driveId, order}, ...]

      if (!merchantId || !photoOrder) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      // 既存ギャラリー取得
      const existingData = this.getMerchantData(merchantId);
      if (!existingData || !existingData.photoGallery) {
        return { success: false, error: 'ギャラリーデータがありません' };
      }

      let gallery = JSON.parse(existingData.photoGallery);

      // orderを更新
      photoOrder.forEach(function(orderItem) {
        const photo = gallery.find(function(p) {
          return p.driveId === orderItem.driveId;
        });
        if (photo) {
          photo.order = orderItem.order;
        }
      });

      // order順にソート
      gallery.sort(function(a, b) {
        return a.order - b.order;
      });

      // スプレッドシート更新
      return this.updatePhotoGallery(merchantId, gallery);

    } catch (error) {
      console.error('[CompanyInfoManager] reorderGalleryPhotos error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ====================================
   * 施工事例管理
   * ====================================
   */

  /**
   * 施工事例を保存（新規 or 更新）
   */
  saveConstructionExample: function(params) {
    try {
      const merchantId = params.merchantId;
      let exampleData = params.exampleData;

      // exampleDataが文字列の場合はパース
      if (typeof exampleData === 'string') {
        try {
          exampleData = JSON.parse(exampleData);
        } catch (e) {
          console.error('[CompanyInfoManager] Failed to parse exampleData:', e);
          return { success: false, error: 'Invalid exampleData format' };
        }
      }

      // exampleData: {exampleId?, title, age, cost, description, beforeImage, afterImage}
      if (!merchantId || !exampleData) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('施工事例');

      if (!sheet) {
        return { success: false, error: '施工事例シートが見つかりません' };
      }

      // Before/After画像アップロード
      let beforeUrl = '';
      let afterUrl = '';

      if (exampleData.beforeImage && exampleData.beforeImage.startsWith('data:')) {
        const beforeResult = ImageUploadUtils.uploadBase64Image(
          exampleData.beforeImage,
          merchantId,
          'construction-examples',
          'before_' + new Date().getTime()
        );
        if (beforeResult.success) {
          beforeUrl = beforeResult.url;
        }
      } else {
        beforeUrl = exampleData.beforeImage || '';
      }

      if (exampleData.afterImage && exampleData.afterImage.startsWith('data:')) {
        const afterResult = ImageUploadUtils.uploadBase64Image(
          exampleData.afterImage,
          merchantId,
          'construction-examples',
          'after_' + new Date().getTime()
        );
        if (afterResult.success) {
          afterUrl = afterResult.url;
        }
      } else {
        afterUrl = exampleData.afterImage || '';
      }

      const now = new Date();

      if (exampleData.exampleId) {
        // 更新
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === merchantId && data[i][1] === exampleData.exampleId) { // A列：merchantId, B列：事例ID
            sheet.getRange(i + 1, 3).setValue(exampleData.title || '');
            sheet.getRange(i + 1, 4).setValue(exampleData.age || '');
            sheet.getRange(i + 1, 5).setValue(exampleData.cost || '');
            sheet.getRange(i + 1, 6).setValue(exampleData.description || '');
            sheet.getRange(i + 1, 7).setValue(beforeUrl);
            sheet.getRange(i + 1, 8).setValue(afterUrl);

            return {
              success: true,
              exampleId: exampleData.exampleId,
              beforeUrl: beforeUrl,
              afterUrl: afterUrl
            };
          }
        }
        return { success: false, error: '指定された事例IDが見つかりません' };

      } else {
        // 新規追加
        const exampleId = 'EX' + merchantId + '_' + now.getTime();
        sheet.appendRow([
          merchantId,
          exampleId,
          exampleData.title || '',
          exampleData.age || '',
          exampleData.cost || '',
          exampleData.description || '',
          beforeUrl,
          afterUrl,
          now
        ]);

        return {
          success: true,
          exampleId: exampleId,
          beforeUrl: beforeUrl,
          afterUrl: afterUrl
        };
      }

    } catch (error) {
      console.error('[CompanyInfoManager] saveConstructionExample error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 施工事例を取得
   */
  getConstructionExamples: function(params) {
    try {
      const merchantId = params.merchantId;

      if (!merchantId) {
        return { success: false, error: 'merchantIdが必要です' };
      }

      console.log('[CompanyInfoManager] ===== 施工事例取得 =====');
      console.log('[CompanyInfoManager] 対象merchantId:', merchantId);

      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('施工事例');

      if (!sheet) {
        return { success: false, error: '施工事例シートが見つかりません' };
      }

      const data = sheet.getDataRange().getValues();
      const examples = [];
      let totalRows = 0;
      let matchedRows = 0;

      for (let i = 1; i < data.length; i++) {
        totalRows++;
        const rowMerchantId = data[i][0]; // A列：加盟店ID

        console.log(`[CompanyInfoManager] 行${i+1}: A列のmerchantId="${rowMerchantId}" (型:${typeof rowMerchantId}), 比較対象="${merchantId}" (型:${typeof merchantId}), 一致:${rowMerchantId === merchantId}`);

        if (rowMerchantId === merchantId) {
          matchedRows++;
          examples.push({
            exampleId: data[i][1],   // B列：事例ID
            title: data[i][2],       // C列：タイトル
            ageRange: data[i][3],    // D列：築年数
            price: data[i][4],       // E列：施工金額
            content: data[i][5],     // F列：説明
            beforeUrl: data[i][6],   // G列：施工前画像
            afterUrl: data[i][7],    // H列：施工後画像
            createdAt: data[i][8]    // I列：作成日時
          });
          console.log(`[CompanyInfoManager] ✓ 一致: タイトル="${data[i][2]}"`);
        }
      }

      console.log(`[CompanyInfoManager] 合計行数: ${totalRows}, 一致した行数: ${matchedRows}`);
      console.log('[CompanyInfoManager] ===========================');

      return {
        success: true,
        examples: examples
      };

    } catch (error) {
      console.error('[CompanyInfoManager] getConstructionExamples error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 施工事例を削除
   */
  deleteConstructionExample: function(params) {
    try {
      const merchantId = params.merchantId;
      const exampleId = params.exampleId;

      if (!merchantId || !exampleId) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('施工事例');

      if (!sheet) {
        return { success: false, error: '施工事例シートが見つかりません' };
      }

      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === merchantId && data[i][1] === exampleId) { // A列：merchantId, B列：exampleId
          // 画像削除
          const beforeUrl = data[i][6];
          const afterUrl = data[i][7];

          if (beforeUrl) {
            const beforeFileId = this.extractFileIdFromUrl(beforeUrl);
            if (beforeFileId) {
              ImageUploadUtils.deleteFile(beforeFileId);
            }
          }

          if (afterUrl) {
            const afterFileId = this.extractFileIdFromUrl(afterUrl);
            if (afterFileId) {
              ImageUploadUtils.deleteFile(afterFileId);
            }
          }

          // 行削除
          sheet.deleteRow(i + 1);

          return { success: true };
        }
      }

      return { success: false, error: '指定された事例が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] deleteConstructionExample error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ====================================
   * 保有資格・加入保険管理
   * ====================================
   */

  /**
   * 保有資格を保存
   */
  saveQualifications: function(params) {
    try {
      const merchantId = params.merchantId;
      const qualifications = params.qualifications;
      // qualifications: {standard: [...], custom: [...]}

      if (!merchantId || !qualifications) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      // JSON文字列化
      const jsonStr = JSON.stringify(qualifications);

      // スプレッドシート更新（AT列 = 保有資格）
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：登録ID
          sheet.getRange(i + 1, 46).setValue(jsonStr); // AT列 = 46列目（保有資格）
          return { success: true };
        }
      }

      return { success: false, error: '加盟店が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] saveQualifications error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加入保険を保存
   */
  saveInsurances: function(params) {
    try {
      const merchantId = params.merchantId;
      const insurances = params.insurances;
      // insurances: {standard: [...], custom: [...]}

      if (!merchantId || !insurances) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      // JSON文字列化
      const jsonStr = JSON.stringify(insurances);

      // スプレッドシート更新（AU列 = 加入保険）
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：登録ID
          sheet.getRange(i + 1, 47).setValue(jsonStr); // AU列 = 47列目（加入保険）
          return { success: true };
        }
      }

      return { success: false, error: '加盟店が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] saveInsurances error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ====================================
   * ヘルパー関数
   * ====================================
   */

  /**
   * 加盟店データを取得
   */
  getMerchantData: function(merchantId) {
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：登録ID
          return {
            mainVisual: data[i][43] || '',     // AR列 (44列目)
            photoGallery: data[i][44] || '',   // AS列 (45列目)
            qualifications: data[i][45] || '', // AT列 (46列目)
            insurances: data[i][46] || ''      // AU列 (47列目)
          };
        }
      }

      return null;

    } catch (error) {
      console.error('[CompanyInfoManager] getMerchantData error:', error);
      return null;
    }
  },

  /**
   * メインビジュアルを更新（AR列）
   */
  updateMainVisual: function(merchantId, url) {
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：加盟店ID
          sheet.getRange(i + 1, 44).setValue(url); // AR列 = 44列目
          return { success: true };
        }
      }

      return { success: false, error: '加盟店が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] updateMainVisual error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 写真ギャラリーを更新（AS列）
   * base64データをDriveにアップロードしてURLに変換
   */
  updatePhotoGallery: function(params) {
    try {
      const merchantId = params.merchantId || params;
      let gallery = params.gallery;

      // gallery が文字列の場合はパース
      if (typeof gallery === 'string') {
        try {
          gallery = JSON.parse(gallery);
        } catch (e) {
          console.error('[CompanyInfoManager] Failed to parse gallery JSON:', e);
        }
      }

      if (!Array.isArray(gallery)) {
        return { success: false, error: 'gallery must be an array' };
      }

      // base64データをDriveにアップロードしてURLに変換
      const uploadedGallery = [];
      for (let i = 0; i < gallery.length; i++) {
        const img = gallery[i];

        // すでにURLの場合はそのまま使用
        if (img.src && img.src.startsWith('https://')) {
          uploadedGallery.push({
            id: img.id,
            src: img.src,
            name: img.name
          });
        }
        // base64データの場合はDriveにアップロード
        else if (img.src && img.src.startsWith('data:')) {
          const uploadResult = ImageUploadUtils.uploadBase64Image(
            img.src,
            merchantId,
            'photo-gallery',
            img.name || 'gallery_' + Date.now() + '_' + i
          );

          if (uploadResult.success) {
            uploadedGallery.push({
              id: img.id,
              src: uploadResult.url,
              name: img.name
            });
          } else {
            console.error('[CompanyInfoManager] Failed to upload gallery image:', uploadResult.error);
          }
        }
      }

      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ss.getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      const jsonStr = JSON.stringify(uploadedGallery);

      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列：登録ID
          sheet.getRange(i + 1, 45).setValue(jsonStr); // AS列 = 45列目（写真ギャラリー）
          console.log('[CompanyInfoManager] updatePhotoGallery - Saved', uploadedGallery.length, 'photos');
          return { success: true, gallery: uploadedGallery };
        }
      }

      return { success: false, error: '加盟店が見つかりません' };

    } catch (error) {
      console.error('[CompanyInfoManager] updatePhotoGallery error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * URLからDriveファイルIDを抽出
   */
  extractFileIdFromUrl: function(url) {
    try {
      if (!url) return null;

      // https://drive.google.com/uc?export=view&id=FILE_ID
      const match = url.match(/[?&]id=([^&]+)/);
      return match ? match[1] : null;

    } catch (error) {
      console.error('[CompanyInfoManager] extractFileIdFromUrl error:', error);
      return null;
    }
  },

  /**
   * 汎用画像アップロード
   */
  uploadImage: function(params) {
    try {
      const { merchantId, base64Data, imageType } = params;

      if (!merchantId || !base64Data || !imageType) {
        return { success: false, error: '必須パラメータが不足しています' };
      }

      if (imageType === 'main-visual') {
        return this.uploadMainVisual({ merchantId, base64Data });
      } else if (imageType === 'gallery') {
        return this.addGalleryPhoto({ merchantId, base64Data });
      } else {
        return { success: false, error: '不明なimageType: ' + imageType };
      }
    } catch (error) {
      console.error('[CompanyInfoManager] uploadImage error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ルーティングハンドラー
   */
  handle: function(params) {
    const action = params.action;

    switch (action) {
      // 汎用画像アップロード
      case 'companyinfo_uploadImage':
        return this.uploadImage(params);

      // メインビジュアル
      case 'companyinfo_uploadMainVisual':
        return this.uploadMainVisual(params);
      case 'companyinfo_deleteMainVisual':
        return this.deleteMainVisual(params);

      // 写真ギャラリー
      case 'companyinfo_addGalleryPhoto':
        return this.addGalleryPhoto(params);
      case 'companyinfo_deleteGalleryPhoto':
        return this.deleteGalleryPhoto(params);
      case 'companyinfo_reorderGalleryPhotos':
        return this.reorderGalleryPhotos(params);
      case 'companyinfo_updatePhotoGallery':
        return this.updatePhotoGallery(params);

      // 施工事例
      case 'companyinfo_saveConstructionExample':
        return this.saveConstructionExample(params);
      case 'companyinfo_getConstructionExamples':
        return this.getConstructionExamples(params);
      case 'companyinfo_deleteConstructionExample':
        return this.deleteConstructionExample(params);

      // 保有資格・加入保険
      case 'companyinfo_saveQualifications':
        return this.saveQualifications(params);
      case 'companyinfo_saveInsurances':
        return this.saveInsurances(params);

      default:
        return {
          success: false,
          error: '不明なアクション: ' + action
        };
    }
  }
};
