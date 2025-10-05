/**
 * 加盟店管理画面用ハンドラー
 * スプレッドシートの実データを管理画面のフォーマットに変換
 */

/**
 * 加盟店管理データを取得
 * @param {Object} params - パラメータ
 * @return {Object} 加盟店管理データ
 */
function getFranchiseManagementData(params = {}) {
  try {
    const scriptProps = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    const data = sheet.getDataRange().getValues();

    const franchises = [];

    // ヘッダー行をスキップ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const registrationId = row[1]; // B列: 登録ID

      if (!registrationId) continue;

      // AJ列(index 35)のステータスを取得
      const spreadsheetStatus = row[35] || '新規登録';

      // スプレッドシートのステータスを管理画面用に変換
      const managementStatus = convertToManagementStatus(spreadsheetStatus);

      // 管理画面に表示する加盟店のみ（準備中以降）
      if (shouldShowInManagement(spreadsheetStatus)) {
        franchises.push({
          id: registrationId,
          companyName: row[2] || '',  // C列: 会社名
          area: row[32] || '',        // AG列: 対応都道府県
          contractRate: calculateContractRate(row), // 成約率を計算
          performance: {
            rate: Math.floor(Math.random() * 40) + 40, // 仮データ（40-80%）
            trend: Math.random() > 0.5 ? '+' : '-',
            trendValue: Math.floor(Math.random() * 10) + 1
          },
          deliveryCount: {
            current: Math.floor(Math.random() * 15) + 1,
            total: Math.floor(Math.random() * 100) + 10,
            unit: '¥' + (Math.random() * 5 + 1).toFixed(1) + 'M'
          },
          handicap: 0, // 初期値は0
          status: managementStatus,
          actions: {
            phone: row[10] || '',     // K列: 電話番号
            slack: true,               // Slack連携あり
            notification: true         // 通知ON
          }
        });
      }
    }

    // ステータスでソート（アクティブ→一時停止→その他）
    franchises.sort((a, b) => {
      const statusOrder = {
        'アクティブ': 0,
        '一時停止': 1,
        'サイレント': 2,
        '非アクティブ': 3,
        '休止': 4,
        '退会': 5
      };
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    return {
      success: true,
      data: franchises,
      total: franchises.length,
      stats: {
        active: franchises.filter(f => f.status === 'アクティブ').length,
        paused: franchises.filter(f => f.status === '一時停止').length,
        silent: franchises.filter(f => f.status === 'サイレント').length,
        inactive: franchises.filter(f => f.status === '非アクティブ').length,
        suspended: franchises.filter(f => f.status === '休止').length,
        withdrawn: franchises.filter(f => f.status === '退会').length
      }
    };

  } catch (error) {
    console.error('加盟店管理データ取得エラー:', error);
    return {
      success: false,
      message: error.toString(),
      data: []
    };
  }
}

/**
 * スプレッドシートのステータスを管理画面用に変換
 * @param {string} spreadsheetStatus - スプレッドシートのステータス
 * @return {string} 管理画面用ステータス
 */
function convertToManagementStatus(spreadsheetStatus) {
  const statusMap = {
    '新規登録': null,          // 管理画面には表示しない
    '準備中': '一時停止',      // 準備中は一時停止として開始
    'アクティブ': 'アクティブ',
    '一時停止': '一時停止',
    'サイレント': 'サイレント',
    '非アクティブ': '非アクティブ',
    '休止': '休止',
    '退会': '退会',
    '却下': null               // 管理画面には表示しない
  };

  return statusMap[spreadsheetStatus] || '一時停止';
}

/**
 * 管理画面に表示すべきかチェック
 * @param {string} status - ステータス
 * @return {boolean} 表示すべきか
 */
function shouldShowInManagement(status) {
  // 新規登録と却下以外は管理画面に表示
  const hiddenStatuses = ['新規登録', '却下'];
  return !hiddenStatuses.includes(status);
}

/**
 * 成約率を計算（仮実装）
 * @param {Array} row - 行データ
 * @return {number} 成約率（%）
 */
function calculateContractRate(row) {
  // TODO: 実際の成約データから計算
  return Math.floor(Math.random() * 30) + 50; // 50-80%のランダム値
}

/**
 * 加盟店のステータスを更新
 * @param {string} franchiseId - 加盟店ID
 * @param {string} newStatus - 新しいステータス
 * @param {string} updatedBy - 更新者
 * @return {Object} 更新結果
 */
function updateFranchiseManagementStatus(franchiseId, newStatus, updatedBy = '管理者') {
  try {
    console.log('=== updateFranchiseManagementStatus 開始 ===');
    console.log('受信パラメータ - franchiseId:', franchiseId, 'newStatus:', newStatus, 'updatedBy:', updatedBy);

    const scriptProps = PropertiesService.getScriptProperties();
    const spreadsheetId = scriptProps.getProperty('SPREADSHEET_ID');

    console.log('SPREADSHEET_ID:', spreadsheetId);

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // 管理画面ステータスをスプレッドシートステータスに変換
    console.log('ステータス変換前:', newStatus);
    const spreadsheetStatus = convertFromManagementStatus(newStatus);
    console.log('ステータス変換後:', spreadsheetStatus);

    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === franchiseId) {
        const row = i + 1;
        console.log('対象行発見: 行番号', row);
        console.log('現在のステータス (AJ列):', values[i][35]);

        // ステータス更新（AJ列のみ更新、AK列は承認ステータスなので変更しない）
        console.log(`セル更新: 行${row}, 列36(AJ) に "${spreadsheetStatus}" を書き込み`);
        sheet.getRange(row, 36).setValue(spreadsheetStatus); // AJ列: ステータス

        // AK列（承認ステータス）は変更しない - 承認済みのまま維持
        console.log('AK列（承認ステータス）は変更しません - 現在の値を維持');

        const now = new Date();
        console.log(`セル更新: 行${row}, 列38(AL) に "${now}" を書き込み`);
        sheet.getRange(row, 38).setValue(now);               // AL列: 更新日時

        console.log(`セル更新: 行${row}, 列39(AM) に "${updatedBy}" を書き込み`);
        sheet.getRange(row, 39).setValue(updatedBy);         // AM列: 更新者

        // 強制的にスプレッドシートに書き込み
        SpreadsheetApp.flush();
        console.log('SpreadsheetApp.flush()実行完了');

        // 更新後の値を再度読み取って確認
        const updatedValue = sheet.getRange(row, 36).getValue();
        console.log('更新後のAJ列の値（再読み込み）:', updatedValue);

        // 行全体を再読み取りして確認
        const updatedRow = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
        console.log('更新後のAJ列の値（行データから）:', updatedRow[35]);
        console.log('=== updateFranchiseManagementStatus 完了 ===');

        return {
          success: true,
          message: `ステータス更新完了: ${spreadsheetStatus}`,
          franchiseId: franchiseId,
          previousStatus: values[i][35],
          newStatus: spreadsheetStatus
        };
      }
    }

    return {
      success: false,
      message: '加盟店が見つかりません'
    };

  } catch (error) {
    console.error('ステータス更新エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 管理画面ステータスをスプレッドシートステータスに逆変換
 * @param {string} managementStatus - 管理画面ステータス（日本語）
 * @return {string} スプレッドシートステータス
 */
function convertFromManagementStatus(managementStatus) {
  // 管理画面の日本語ステータスをそのまま使用（既に日本語で送信される）
  // updateFranchiseStatusAPIで既に日本語に変換済み
  console.log('変換前ステータス:', managementStatus);

  // 念のため、英語→日本語の変換も用意
  const statusMap = {
    'active': 'アクティブ',
    'inactive': '非アクティブ',
    'paused': '一時停止',
    'silent': 'サイレント',
    'suspended': '休止',
    'withdrawn': '退会',
    // 日本語の場合はそのまま返す
    'アクティブ': 'アクティブ',
    '非アクティブ': '非アクティブ',
    '一時停止': '一時停止',
    'サイレント': 'サイレント',
    '休止': '休止',
    '退会': '退会'
  };

  const result = statusMap[managementStatus] || managementStatus;
  console.log('変換後ステータス:', result);
  return result;
}