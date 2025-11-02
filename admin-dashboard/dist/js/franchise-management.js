/**
 * 加盟店管理データ読み込み
 */
async function loadFranchiseManagementData(status = 'all') {
  console.log('[FranchiseManagement] データ読み込み開始:', status);

  try {
    const apiClient = window.apiClient || new ApiClient(window.ENV.GAS_URL);

    const response = await apiClient.request('getFranchiseMerchants', {
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
