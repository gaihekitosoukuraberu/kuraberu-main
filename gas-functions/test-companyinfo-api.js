/**
 * 会社情報API テストスクリプト
 */

// テスト用のサンプル画像（1x1の透明PNG）
const SAMPLE_BASE64_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * テスト1: メインビジュアルアップロード
 */
function testUploadMainVisual() {
  const merchantId = 'FR250925142700'; // テスト用加盟店ID

  const result = CompanyInfoManager.uploadMainVisual({
    merchantId: merchantId,
    base64Data: SAMPLE_BASE64_IMAGE
  });

  Logger.log('=== メインビジュアルアップロードテスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功: ' + result.url);
    return result.fileId;
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
    return null;
  }
}

/**
 * テスト2: メインビジュアル削除
 */
function testDeleteMainVisual() {
  const merchantId = 'FR250925142700';

  const result = CompanyInfoManager.deleteMainVisual({
    merchantId: merchantId
  });

  Logger.log('=== メインビジュアル削除テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功');
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
  }
}

/**
 * テスト3: ギャラリー写真追加
 */
function testAddGalleryPhoto() {
  const merchantId = 'FR250925142700';

  const result = CompanyInfoManager.addGalleryPhoto({
    merchantId: merchantId,
    base64Data: SAMPLE_BASE64_IMAGE
  });

  Logger.log('=== ギャラリー写真追加テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功: 写真数 ' + result.gallery.length);
    return result.newPhoto.driveId;
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
    return null;
  }
}

/**
 * テスト4: ギャラリー写真削除
 */
function testDeleteGalleryPhoto(fileId) {
  const merchantId = 'FR250925142700';

  if (!fileId) {
    Logger.log('⚠️ fileIdが指定されていません');
    return;
  }

  const result = CompanyInfoManager.deleteGalleryPhoto({
    merchantId: merchantId,
    fileId: fileId
  });

  Logger.log('=== ギャラリー写真削除テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功');
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
  }
}

/**
 * テスト5: 施工事例保存（新規）
 */
function testSaveConstructionExample() {
  const merchantId = 'FR250925142700';

  const result = CompanyInfoManager.saveConstructionExample({
    merchantId: merchantId,
    exampleData: {
      title: 'テスト施工事例',
      age: '築20年',
      cost: '150万円',
      description: 'これはテスト用の施工事例です',
      beforeImage: SAMPLE_BASE64_IMAGE,
      afterImage: SAMPLE_BASE64_IMAGE
    }
  });

  Logger.log('=== 施工事例保存テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功: ' + result.exampleId);
    return result.exampleId;
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
    return null;
  }
}

/**
 * テスト6: 施工事例取得
 */
function testGetConstructionExamples() {
  const merchantId = 'FR250925142700';

  const result = CompanyInfoManager.getConstructionExamples({
    merchantId: merchantId
  });

  Logger.log('=== 施工事例取得テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功: 事例数 ' + result.examples.length);
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
  }
}

/**
 * テスト7: 施工事例削除
 */
function testDeleteConstructionExample(exampleId) {
  const merchantId = 'FR250925142700';

  if (!exampleId) {
    Logger.log('⚠️ exampleIdが指定されていません');
    return;
  }

  const result = CompanyInfoManager.deleteConstructionExample({
    merchantId: merchantId,
    exampleId: exampleId
  });

  Logger.log('=== 施工事例削除テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功');
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
  }
}

/**
 * テスト8: 保有資格保存
 */
function testSaveQualifications() {
  const merchantId = 'FR250925142700';

  const result = CompanyInfoManager.saveQualifications({
    merchantId: merchantId,
    qualifications: {
      standard: ['一級建築士', '二級建築士'],
      custom: ['カスタム資格1', 'カスタム資格2']
    }
  });

  Logger.log('=== 保有資格保存テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功');
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
  }
}

/**
 * テスト9: 加入保険保存
 */
function testSaveInsurances() {
  const merchantId = 'FR250925142700';

  const result = CompanyInfoManager.saveInsurances({
    merchantId: merchantId,
    insurances: {
      standard: ['損害保険', '賠償責任保険'],
      custom: ['カスタム保険1']
    }
  });

  Logger.log('=== 加入保険保存テスト ===');
  Logger.log(JSON.stringify(result, null, 2));

  if (result.success) {
    Logger.log('✅ テスト成功');
  } else {
    Logger.log('❌ テスト失敗: ' + result.error);
  }
}

/**
 * 全テスト実行
 */
function runAllCompanyInfoTests() {
  Logger.log('╔═══════════════════════════════════════╗');
  Logger.log('║  会社情報API 統合テスト開始          ║');
  Logger.log('╚═══════════════════════════════════════╝');
  Logger.log('');

  // 1. メインビジュアルテスト
  const mainVisualFileId = testUploadMainVisual();
  Utilities.sleep(2000);

  // 2. ギャラリーテスト
  const galleryFileId = testAddGalleryPhoto();
  Utilities.sleep(2000);

  // 3. 施工事例テスト
  const exampleId = testSaveConstructionExample();
  Utilities.sleep(2000);

  testGetConstructionExamples();
  Utilities.sleep(2000);

  // 4. 資格・保険テスト
  testSaveQualifications();
  Utilities.sleep(2000);

  testSaveInsurances();
  Utilities.sleep(2000);

  // クリーンアップ（削除テスト）
  Logger.log('');
  Logger.log('=== クリーンアップ開始 ===');

  if (exampleId) {
    testDeleteConstructionExample(exampleId);
    Utilities.sleep(2000);
  }

  if (galleryFileId) {
    testDeleteGalleryPhoto(galleryFileId);
    Utilities.sleep(2000);
  }

  testDeleteMainVisual();

  Logger.log('');
  Logger.log('╔═══════════════════════════════════════╗');
  Logger.log('║  全テスト完了                        ║');
  Logger.log('╚═══════════════════════════════════════╝');
}

/**
 * Drive フォルダ構造確認
 */
function checkDriveFolderStructure() {
  const merchantId = 'FR250925142700';

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const rootFolderId = scriptProperties.getProperty('DRIVE_ROOT_FOLDER_ID');

    Logger.log('=== Drive フォルダ構造確認 ===');
    Logger.log('Root Folder ID: ' + rootFolderId);

    if (!rootFolderId) {
      Logger.log('❌ DRIVE_ROOT_FOLDER_ID が設定されていません');
      return;
    }

    const rootFolder = DriveApp.getFolderById(rootFolderId);
    Logger.log('✅ Root Folder: ' + rootFolder.getName());

    // 加盟店画像フォルダ確認
    const merchantImagesFolder = ImageUploadUtils.getOrCreateMerchantImageFolder(merchantId);
    Logger.log('✅ Merchant Images Folder: ' + merchantImagesFolder.getName());

    // サブフォルダ確認
    const categories = ['main-visual', 'gallery', 'construction-examples'];
    categories.forEach(function(category) {
      const subFolder = ImageUploadUtils.getOrCreateSubFolder(merchantImagesFolder, category);
      Logger.log('  └─ ' + category + ': ' + subFolder.getName());
    });

  } catch (error) {
    Logger.log('❌ エラー: ' + error.toString());
  }
}
