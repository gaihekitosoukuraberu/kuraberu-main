/**
 * ============================================
 * CVトリガー設定（V1754）
 * ============================================
 *
 * 目的: CV関連の定期実行トリガーを管理
 * 機能:
 * - 離脱検知トリガーの作成・削除
 * - 既存トリガーの確認・クリーンアップ
 */

/**
 * 離脱検知トリガーをセットアップ（1分間隔）
 * 手動で1回だけ実行してください
 */
function setupAbandonmentCheckTrigger() {
  try {
    console.log('[CVTrigger] トリガー設定開始');

    // 既存の離脱検知トリガーを削除（重複防止）
    const existingTriggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;

    for (const trigger of existingTriggers) {
      if (trigger.getHandlerFunction() === 'runAbandonmentCheck') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log('[CVTrigger] 既存トリガー削除:', trigger.getUniqueId());
      }
    }

    if (deletedCount > 0) {
      console.log(`[CVTrigger] ${deletedCount}件の既存トリガーを削除しました`);
    }

    // 新しいトリガーを作成（1分間隔）
    ScriptApp.newTrigger('runAbandonmentCheck')
      .timeBased()
      .everyMinutes(1)
      .create();

    console.log('[CVTrigger] ✅ トリガー設定完了（1分間隔）');

    return {
      success: true,
      message: '離脱検知トリガーを設定しました（1分間隔）',
      deletedCount: deletedCount
    };

  } catch (error) {
    console.error('[CVTrigger] トリガー設定エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 離脱検知トリガーを削除
 * トリガーを停止したい場合に手動実行
 */
function deleteAbandonmentCheckTrigger() {
  try {
    console.log('[CVTrigger] トリガー削除開始');

    const existingTriggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;

    for (const trigger of existingTriggers) {
      if (trigger.getHandlerFunction() === 'runAbandonmentCheck') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log('[CVTrigger] トリガー削除:', trigger.getUniqueId());
      }
    }

    console.log(`[CVTrigger] ✅ ${deletedCount}件のトリガーを削除しました`);

    return {
      success: true,
      message: `${deletedCount}件のトリガーを削除しました`,
      deletedCount: deletedCount
    };

  } catch (error) {
    console.error('[CVTrigger] トリガー削除エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 全トリガーを確認（デバッグ用）
 */
function listAllTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();

    console.log(`[CVTrigger] 全トリガー数: ${triggers.length}`);

    const triggerList = triggers.map(trigger => ({
      handlerFunction: trigger.getHandlerFunction(),
      triggerId: trigger.getUniqueId(),
      triggerSource: trigger.getTriggerSource().toString(),
      eventType: trigger.getEventType().toString()
    }));

    triggerList.forEach(t => {
      console.log('[CVTrigger] -', t.handlerFunction, '|', t.triggerId);
    });

    return {
      success: true,
      count: triggers.length,
      triggers: triggerList
    };

  } catch (error) {
    console.error('[CVTrigger] トリガー確認エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * トリガーから実行される離脱検知関数（エントリーポイント）
 * ※この関数名がトリガーに登録されます
 */
function runAbandonmentCheck() {
  try {
    console.log('[CVTrigger] ========== 離脱検知実行開始 ==========');
    console.log('[CVTrigger] 実行時刻:', new Date().toISOString());

    CVHeartbeatSystem.checkAbandonment();

    console.log('[CVTrigger] ========== 離脱検知実行完了 ==========');

  } catch (error) {
    console.error('[CVTrigger] ❌ 離脱検知実行エラー:', error);
    console.error('[CVTrigger] エラースタック:', error.stack);

    // エラーをSlackに通知（オプション）
    try {
      CVSlackNotifier.sendToSlack({
        text: '⚠️ 離脱検知システムエラー',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ 離脱検知システムエラー',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*エラー内容:*\n\`\`\`${error.toString()}\`\`\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
              }
            ]
          }
        ]
      });
    } catch (slackError) {
      console.error('[CVTrigger] Slack通知エラー:', slackError);
    }
  }
}
