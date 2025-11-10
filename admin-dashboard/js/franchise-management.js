/**
 * 加盟店管理データ読み込み
 */
async function loadFranchiseManagementData(status = 'all') {
  console.log('[FranchiseManagement] データ読み込み開始:', status);

  try {
    // APIクライアントの初期化確認
    if (!window.apiClient) {
      console.log('[FranchiseManagement] APIクライアント初期化中...');
      if (window.ApiClient && window.ENV) {
        window.apiClient = new ApiClient();
        console.log('[FranchiseManagement] APIクライアント初期化完了');
      } else {
        throw new Error('APIクライアントを初期化できません');
      }
    }

    const response = await window.apiClient.jsonpRequest('getFranchiseManagementData', {
      status: status
    });

    console.log('[FranchiseManagement] データ取得成功:', response);
    return response;

  } catch (error) {
    console.error('[FranchiseManagement] データ取得エラー:', error);

    // フォールバック：空データを返す
    return {
      success: true,
      data: [],
      message: 'データ読み込み中...'
    };
  }
}

// グローバルに公開
window.loadFranchiseManagementData = loadFranchiseManagementData;
