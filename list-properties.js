/**
 * スクリプトプロパティ一覧を取得するユーティリティ
 *
 * 使い方:
 * 1. このコードをGoogle Apps Scriptエディタにコピー
 * 2. 実行ボタンをクリック
 * 3. ログでプロパティ一覧を確認
 */
function listAllProperties() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const keys = Object.keys(allProps);

  console.log('=== スクリプトプロパティ一覧 ===');
  console.log(`合計: ${keys.length} / 50個`);
  console.log('');

  // アルファベット順にソート
  keys.sort().forEach((key, index) => {
    const value = allProps[key];
    const maskedValue = value ?
      (value.length > 50 ? value.substring(0, 50) + '...' : value) :
      '(空)';

    console.log(`${index + 1}. ${key}: ${maskedValue}`);
  });

  console.log('');
  console.log('=== 推奨アクション ===');
  if (keys.length >= 50) {
    console.log('⚠️ 上限に達しています。不要なプロパティを削除してください。');
  } else if (keys.length >= 45) {
    console.log('⚠️ あと ' + (50 - keys.length) + ' 個で上限です。');
  } else {
    console.log('✅ まだ ' + (50 - keys.length) + ' 個追加できます。');
  }

  return allProps;
}

/**
 * プロパティを削除（注意: 元に戻せません）
 */
function deleteProperty(propertyKey) {
  const props = PropertiesService.getScriptProperties();

  // 確認
  const value = props.getProperty(propertyKey);
  if (!value) {
    console.log('❌ プロパティが見つかりません: ' + propertyKey);
    return;
  }

  console.log('削除対象: ' + propertyKey);
  console.log('値: ' + (value.length > 100 ? value.substring(0, 100) + '...' : value));

  // 削除実行（コメントを外して実行）
  // props.deleteProperty(propertyKey);
  // console.log('✅ 削除完了: ' + propertyKey);

  console.log('⚠️ 削除するには、上記のコメントを外して再実行してください');
}

/**
 * 使用されていないプロパティを検出
 */
function findUnusedProperties() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const keys = Object.keys(allProps);

  // よく使われるプロパティ
  const commonKeys = [
    'SPREADSHEET_ID',
    'SECRET_KEY',
    'SLACK_WEBHOOK_URL',
    'FIRST_LOGIN_URL',
    'PASSWORD_RESET_URL',
    'ADMIN_USER',
    'ADMIN_PASS'
  ];

  console.log('=== 一般的なプロパティの使用状況 ===');
  commonKeys.forEach(key => {
    const exists = keys.includes(key);
    console.log(`${exists ? '✅' : '❌'} ${key}`);
  });

  console.log('');
  console.log('=== 削除候補（古いプロパティ） ===');

  // 古そうなプロパティ（例: テスト用、バックアップなど）
  const oldPatterns = [
    /test/i,
    /tmp/i,
    /backup/i,
    /old/i,
    /deprecated/i,
    /_v\d+$/i  // バージョン番号付き
  ];

  keys.forEach(key => {
    const isOld = oldPatterns.some(pattern => pattern.test(key));
    if (isOld) {
      console.log('🗑️  ' + key);
    }
  });
}
