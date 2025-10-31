/**
 * AI Assistant 初期化 v2専用
 * 依存: api-client.js, ai-assistant-v2.js
 */

(function() {
  'use strict';

  /**
   * AIアシスタントを初期化
   */
  function initAIAssistant() {
    // 必須: ApiClient が読み込まれているか確認
    if (!window.ApiClient) {
      console.error('[AI Init] ApiClient が見つかりません。api-client.js を先に読み込んでください');
      // 100ms後に再試行
      setTimeout(initAIAssistant, 100);
      return;
    }

    // 必須: AIAssistantV2 が読み込まれているか確認
    if (!window.AIAssistantV2) {
      console.error('[AI Init] AIAssistantV2 が見つかりません。ai-assistant-v2.js を先に読み込んでください');
      // 100ms後に再試行
      setTimeout(initAIAssistant, 100);
      return;
    }

    // 既に初期化済みの場合はスキップ
    if (window.aiAssistant) {
      console.log('[AI Init] 既に初期化済みです');
      return;
    }

    try {
      // AIAssistantV2 のインスタンス作成
      window.aiAssistant = new window.AIAssistantV2();
      console.log('[AI Init] AIAssistantV2 初期化完了');

      // 互換性のため、旧システムのメソッド名も追加
      if (!window.aiAssistant.startBackgroundSearch) {
        window.aiAssistant.startBackgroundSearch = function(companyName) {
          return this.searchCompany(companyName);
        };
      }

    } catch (error) {
      console.error('[AI Init] 初期化エラー:', error);
    }
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIAssistant);
  } else {
    // DOMは既に読み込まれている
    initAIAssistant();
  }

})();
