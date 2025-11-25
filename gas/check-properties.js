/**
 * スクリプトプロパティ一覧を取得
 *
 * Google Apps Scriptエディタで実行してください：
 * https://script.google.com/home/projects/1VALw14wYqzPq_lBaJZxboFkrG5FTJ_2X2XFaBxisK3lQZ5ppQFYxpHMg/edit
 */

function listAllProperties() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const keys = Object.keys(allProps);

  console.log('=== スクリプトプロパティ一覧 ===');
  console.log('合計: ' + keys.length + ' / 50個');
  console.log('');

  keys.sort().forEach((key, index) => {
    const value = allProps[key];
    const maskedValue = value ? 
      (value.length > 50 ? value.substring(0, 50) + '...' : value) : 
      '(空)';
    console.log((index + 1) + '. ' + key + ': ' + maskedValue);
  });

  if (keys.length >= 50) {
    console.log('\n⚠️ 上限に達しています！');
  } else if (keys.length >= 45) {
    console.log('\n⚠️ あと ' + (50 - keys.length) + ' 個で上限です');
  }
}

function findUnusedProperties() {
  const props = PropertiesService.getScriptProperties();
  const keys = Object.keys(props.getProperties());

  console.log('=== 削除候補 ===');
  const patterns = [/test/i, /tmp/i, /backup/i, /old/i, /demo/i];

  keys.forEach(key => {
    if (patterns.some(p => p.test(key))) {
      console.log('🗑️  ' + key);
    }
  });
}

/**
 * Web経由でプロパティ一覧を取得（一時的なエンドポイント）
 */
function getPropertiesForAPI() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const keys = Object.keys(allProps).sort();

  const deleteCandidates = [];
  const patterns = [/test/i, /tmp/i, /backup/i, /old/i, /demo/i];

  keys.forEach(key => {
    if (patterns.some(p => p.test(key))) {
      deleteCandidates.push(key);
    }
  });

  return {
    success: true,
    total: keys.length,
    limit: 50,
    remaining: 50 - keys.length,
    keys: keys,
    deleteCandidates: deleteCandidates,
    requiredForAdmin: ['ADMIN_USER', 'ADMIN_PASS'],
    message: keys.length >= 50 ? '⚠️ 上限に達しています！' :
             keys.length >= 45 ? `⚠️ あと ${50 - keys.length} 個で上限です` :
             `✅ まだ ${50 - keys.length} 個追加できます`
  };
}
