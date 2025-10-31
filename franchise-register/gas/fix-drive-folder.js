/**
 * Google Driveフォルダを再作成してScript Propertiesを更新
 */
function fixDriveFolderSetup() {
  const props = PropertiesService.getScriptProperties();

  // 既存のフォルダIDを確認
  const oldFolderId = props.getProperty('DRIVE_ROOT_FOLDER_ID');
  console.log('Old DRIVE_ROOT_FOLDER_ID:', oldFolderId);

  try {
    // マイドライブのルートを取得
    const myDrive = DriveApp.getRootFolder();

    // 「くらべる加盟店システム」フォルダを探す
    let systemFolder;
    const systemFolders = myDrive.getFoldersByName('くらべる加盟店システム');

    if (systemFolders.hasNext()) {
      systemFolder = systemFolders.next();
      console.log('✅ 既存フォルダ発見:', systemFolder.getName());
    } else {
      // 新規作成
      systemFolder = myDrive.createFolder('くらべる加盟店システム');
      console.log('✅ 新規フォルダ作成:', systemFolder.getName());
    }

    const newFolderId = systemFolder.getId();
    console.log('New Folder ID:', newFolderId);
    console.log('Folder URL:', 'https://drive.google.com/drive/folders/' + newFolderId);

    // Script Propertiesを更新
    props.setProperty('DRIVE_ROOT_FOLDER_ID', newFolderId);
    console.log('✅ DRIVE_ROOT_FOLDER_ID updated');

    // サブフォルダ構造を確認/作成
    const subFolders = ['加盟店画像', '本人確認書類', '施工事例'];
    subFolders.forEach(folderName => {
      const existingFolders = systemFolder.getFoldersByName(folderName);
      if (existingFolders.hasNext()) {
        console.log('✅ サブフォルダ存在:', folderName);
      } else {
        systemFolder.createFolder(folderName);
        console.log('✅ サブフォルダ作成:', folderName);
      }
    });

    // テスト：フォルダにアクセスできるか確認
    const testFolder = DriveApp.getFolderById(newFolderId);
    console.log('✅ アクセステスト成功:', testFolder.getName());

    return {
      success: true,
      oldFolderId: oldFolderId,
      newFolderId: newFolderId,
      folderUrl: 'https://drive.google.com/drive/folders/' + newFolderId
    };

  } catch (error) {
    console.error('❌ エラー:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}
