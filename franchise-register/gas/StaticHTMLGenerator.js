/**
 * ============================================
 * 🔥 新生：静的HTML生成システム（プレビュー完全一致版）
 * ============================================
 *
 * generateStaticHTML.jsの新しい関数をラップして
 * 既存のAdminSystemとの互換性を保つ
 */

var StaticHTMLGenerator = {

  /**
   * 🔥 新しいgenerateStaticHTML関数をラップ
   * AdminSystemから呼ばれる既存インターフェース
   */
  generateAndDeployWithSlugs(merchantId, merchantData, citySlug, companySlug) {
    try {
      console.log('[StaticHTML] 🔥 新生版でHTML生成開始:', merchantId);
      console.log('[StaticHTML] 受信データ:', JSON.stringify(merchantData, null, 2));

      // 新しいgenerateStaticHTML関数を呼び出し
      if (typeof generateStaticHTML === 'function') {
        const html = generateStaticHTML(merchantData);

        console.log('[StaticHTML] ✅ 新生版HTML生成完了');
        console.log('[StaticHTML] HTMLサイズ:', Math.round(html.length / 1024) + 'KB');

        // GoogleドライブにHTMLファイルを保存
        const saveResult = this.saveToGoogleDrive(html, citySlug, companySlug, merchantData);

        // 従来通りのレスポンス形式で返す
        return {
          success: true,
          url: `https://gaihekikuraberu.com/${citySlug}/${companySlug}/`,
          citySlug: citySlug,
          companySlug: companySlug,
          html: html,
          deployResult: saveResult
        };
      } else {
        console.error('[StaticHTML] ❌ generateStaticHTML関数が見つかりません');
        return {
          success: false,
          error: 'generateStaticHTML function not found'
        };
      }

    } catch (error) {
      console.error('[StaticHTML] ❌ エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 🔥 直接HTML生成（互換性用）
   */
  generateHTML(merchantData, score, citySlug, companySlug) {
    try {
      console.log('[StaticHTML] 🔥 generateHTML（互換性用）呼び出し');

      if (typeof generateStaticHTML === 'function') {
        return generateStaticHTML(merchantData);
      } else {
        throw new Error('generateStaticHTML function not found');
      }
    } catch (error) {
      console.error('[StaticHTML] generateHTML エラー:', error);
      throw error;
    }
  },

  /**
   * くらべるスコア取得（既存システムとの互換性）
   */
  getCompareScore(merchantId) {
    // デフォルト値を返す（くらべるスコアはgenerateStaticHTML内で処理）
    return 4.2;
  },

  /**
   * 🔥 AdminSystemから呼ばれる古いメソッド（互換性用）
   */
  generateAndDeploy(merchantId, merchantData) {
    try {
      console.log('[StaticHTML] 🔥 generateAndDeploy（互換性用）呼び出し');
      console.log('[StaticHTML] merchantId:', merchantId);
      console.log('[StaticHTML] merchantData:', JSON.stringify(merchantData, null, 2));

      if (typeof generateStaticHTML === 'function') {
        const html = generateStaticHTML(merchantData);

        console.log('[StaticHTML] ✅ 新生版HTML生成完了（generateAndDeploy）');
        console.log('[StaticHTML] HTMLサイズ:', Math.round(html.length / 1024) + 'KB');

        return {
          success: true,
          html: html,
          merchantId: merchantId,
          companyName: merchantData['会社名'] || '不明',
          webhookSent: false,
          message: '新生版HTML生成完了（generateAndDeploy）'
        };
      } else {
        console.error('[StaticHTML] ❌ generateStaticHTML関数が見つかりません');
        return {
          success: false,
          error: 'generateStaticHTML function not found'
        };
      }

    } catch (error) {
      console.error('[StaticHTML] generateAndDeploy エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * FTPデプロイ（ダミー実装）
   */
  deployToFTP(html, citySlug, companySlug, merchantData) {
    return {
      success: true,
      message: '新生版: FTPデプロイスキップ（HTML生成のみ）'
    };
  },

  /**
   * GoogleドライブにHTMLファイルを保存
   */
  saveToGoogleDrive(html, citySlug, companySlug, merchantData) {
    try {
      console.log('[StaticHTML] 🚀 Google Drive保存開始');

      const fileName = 'index.html';
      const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss');

      console.log('[StaticHTML] 📁 ファイル名:', fileName);
      console.log('[StaticHTML] 📄 HTMLサイズ:', Math.round(html.length / 1024) + 'KB');
      console.log('[StaticHTML] 🔗 目標パス:', `${citySlug}/${companySlug}/`);

      // デプロイ情報
      const deploymentInfo = {
        citySlug: citySlug,
        companySlug: companySlug,
        fileName: fileName,
        targetPath: `/${citySlug}/${companySlug}`,
        finalUrl: `https://gaihekikuraberu.com/${citySlug}/${companySlug}/`,
        timestamp: timestamp,
        merchantId: merchantData['加盟店ID'] || merchantData['登録ID'] || '',
        companyName: merchantData['会社名'] || merchantData['会社名（法人名）'] || ''
      };

      console.log('[StaticHTML] 📊 デプロイ情報:', deploymentInfo);

      // Google Driveのフォルダを取得または作成
      let driveFolder;
      try {
        const folders = DriveApp.getFoldersByName('gaihekikuraberu-hp-files');
        if (folders.hasNext()) {
          driveFolder = folders.next();
        } else {
          driveFolder = DriveApp.createFolder('gaihekikuraberu-hp-files');
          console.log('[StaticHTML] 📁 フォルダ作成:', 'gaihekikuraberu-hp-files');
        }
      } catch (folderError) {
        console.error('[StaticHTML] フォルダ取得エラー:', folderError);
        driveFolder = DriveApp.getRootFolder();
      }

      // HTMLファイルをGoogle Driveに保存
      const targetFileName = `${citySlug}-${companySlug}-${fileName}`;
      const existingFiles = driveFolder.getFilesByName(targetFileName);
      let file;

      if (existingFiles.hasNext()) {
        // 既存ファイルを更新
        file = existingFiles.next();
        file.setContent(html);
        console.log('[StaticHTML] 📝 既存ファイル更新:', targetFileName);
      } else {
        // 新規ファイル作成
        file = driveFolder.createFile(targetFileName, html, 'text/html');
        console.log('[StaticHTML] ✨ 新規ファイル作成:', targetFileName);
      }

      // ファイルを共有可能に設定
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // GitHub Actions用のメタデータファイルも作成
      const metadataFileName = `${citySlug}-${companySlug}-metadata.json`;
      const metadataContent = JSON.stringify(deploymentInfo, null, 2);

      const existingMetadataFiles = driveFolder.getFilesByName(metadataFileName);
      let metadataFile;

      if (existingMetadataFiles.hasNext()) {
        metadataFile = existingMetadataFiles.next();
        metadataFile.setContent(metadataContent);
        console.log('[StaticHTML] 📝 メタデータファイル更新:', metadataFileName);
      } else {
        metadataFile = driveFolder.createFile(metadataFileName, metadataContent, 'application/json');
        console.log('[StaticHTML] ✨ メタデータファイル作成:', metadataFileName);
      }

      metadataFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      console.log('[StaticHTML] ✅ Google Drive保存完了（メタデータ付き）');
      console.log('[StaticHTML] 📄 HTMLファイルID:', file.getId());
      console.log('[StaticHTML] 📋 メタデータファイルID:', metadataFile.getId());

      return {
        success: true,
        driveFileId: file.getId(),
        metadataFileId: metadataFile.getId(),
        deploymentInfo: deploymentInfo,
        message: 'Google Drive保存完了'
      };

    } catch (error) {
      console.error('[StaticHTML] Google Drive保存エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

};