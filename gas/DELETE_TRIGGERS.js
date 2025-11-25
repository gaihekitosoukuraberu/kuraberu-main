/**
 * 離脱検知トリガーを削除する専用スクリプト
 *
 * 【実行方法】
 * 1. GASエディタで このファイルを開く
 * 2. deleteTriggers関数を選択
 * 3. 実行ボタンをクリック
 *
 * これで時間主導型トリガーが削除され、@HEADも削除可能になります
 */

function deleteTriggers() {
  try {
    console.log('===== トリガー削除開始 =====');

    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;

    for (const trigger of triggers) {
      const functionName = trigger.getHandlerFunction();
      const triggerType = trigger.getEventType();

      console.log(`発見: ${functionName} (${triggerType})`);

      // runAbandonmentCheck トリガーを削除
      if (functionName === 'runAbandonmentCheck') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`✅ 削除: ${functionName}`);
      }
    }

    console.log(`===== 完了: ${deletedCount}件削除 =====`);

    // 削除結果を返す
    return {
      success: true,
      message: `${deletedCount}件のトリガーを削除しました`,
      deletedCount: deletedCount
    };

  } catch (error) {
    console.error('❌ エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// すべてのトリガーを確認する（削除はしない）
function listAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();

  console.log('===== 現在のトリガー一覧 =====');

  if (triggers.length === 0) {
    console.log('トリガーは設定されていません');
    return;
  }

  triggers.forEach((trigger, index) => {
    console.log(`\n[${index + 1}]`);
    console.log('関数名:', trigger.getHandlerFunction());
    console.log('タイプ:', trigger.getEventType());
    console.log('ID:', trigger.getUniqueId());

    // タイムベースの場合は詳細情報
    if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      console.log('トリガータイプ: 時間主導型');
    }
  });

  console.log(`\n合計: ${triggers.length}件のトリガー`);
  console.log('=========================');
}