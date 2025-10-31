/**
 * ====================================
 * COLUMN_MAP自動生成スクリプト
 * ====================================
 *
 * Spreadsheetのヘッダー行を読み取って、
 * DataLayer.jsのCOLUMN_MAPを自動生成します。
 *
 * 使い方:
 *   node generate-column-map.js
 *
 * 実行すると:
 *   shared/DataLayer.js の COLUMN_MAP getter が自動更新されます
 */

const fs = require('fs');
const path = require('path');

// 日本語 → 英語フィールド名のマッピング
const JP_TO_EN_MAPPING = {
  'タイムスタンプ': 'timestamp',
  'ステータス': 'status',
  '会社名': 'companyName',
  '会社名カナ': 'companyNameKana',
  '屋号': 'tradeName',
  '屋号カナ': 'tradeNameKana',
  '代表者名': 'representative',
  '代表者名カナ': 'representativeKana',
  '郵便番号': 'zipCode',
  '住所': 'address',
  '電話番号': 'phone',
  'メールアドレス': 'email',
  'ウェブサイトURL': 'website',
  '設立年月': 'established',
  'PRテキスト': 'prText',
  '支店数': 'branchCount',
  '支店名': 'branchName',
  '支店住所': 'branchAddress',
  '本人確認書類URL': 'idDocumentUrl',
  '本人確認書類FileID': 'idDocumentFileId',
  'メインビジュアルURL': 'mainVisualUrl',
  'メインビジュアルFileID': 'mainVisualFileId',
  '写真ギャラリーURL': 'photoGalleryUrls',
  '写真ギャラリーFileID': 'photoGalleryFileIds',
  '請求用メールアドレス': 'billingEmail',
  '営業用メールアドレス': 'salesEmail',
  '営業担当者氏名': 'salesPersonName',
  '営業担当者カナ': 'salesPersonKana',
  '従業員数': 'employees',
  '売上規模': 'salesScale',
  '最大対応階数': 'maxFloors',
  '施工箇所': 'constructionTypes',
  '特殊対応項目': 'specialServices',
  '対応都道府県': 'prefectures',
  '対応市区町村': 'cities',
  '優先エリア': 'priorityAreas',
  '施工事例': 'constructionExamples',
  '保有資格': 'qualifications',
  '加入保険': 'insurance',
  '物件階数': 'propertyFloors',
  '自動配信_物件種別': 'autoPropertyTypes',
  '自動配信_施工箇所': 'autoConstructionTypes',
  '自動配信_特殊対応': 'autoSpecialServices',
  '自動配信_都道府県': 'autoPrefectures',
  '自動配信_市区町村': 'autoCities',
  '自動配信_優先エリア': 'autoPriorityAreas',
  'MerchantID': 'merchantId',
  'URLスラッグ': 'urlSlug',
  '初回ログインURL': 'firstLoginUrl',
  'パスワード': 'password',
  '代表者名非表示': 'representativeHide',
  '住所非表示': 'addressHide'
};

// 圧縮対象カラム
const COMPRESSED_COLUMNS = [
  'branchAddress',
  'maxFloors',
  'constructionTypes',
  'specialServices',
  'prefectures',
  'cities',
  'priorityAreas',
  'qualifications',
  'insurance'
];

/**
 * Spreadsheetヘッダー行を模擬的に読み込む
 * （実際のSpreadsheet接続は不要 - 既知のマッピングを使用）
 */
function generateColumnMap() {
  console.log('🔧 COLUMN_MAP自動生成開始...');

  const columnMap = {};
  let colIndex = 1;

  // JP_TO_EN_MAPPINGの順序でCOLUMN_MAPを生成
  for (const [jpName, enName] of Object.entries(JP_TO_EN_MAPPING)) {
    columnMap[enName] = colIndex;
    console.log(`  ${enName}: ${colIndex} (${jpName})`);
    colIndex++;
  }

  return columnMap;
}

/**
 * DataLayer.jsのCOLUMN_MAP getterを更新
 */
function updateDataLayerFile(columnMap) {
  const dataLayerPath = path.join(__dirname, 'shared', 'DataLayer.js');

  if (!fs.existsSync(dataLayerPath)) {
    console.error('❌ DataLayer.jsが見つかりません:', dataLayerPath);
    process.exit(1);
  }

  console.log('\n📝 DataLayer.jsを読み込み中...');
  let content = fs.readFileSync(dataLayerPath, 'utf-8');

  // COLUMN_MAP getterを生成
  const columnMapCode = generateColumnMapCode(columnMap);

  // 既存のCOLUMN_MAP getterを置換
  const columnMapRegex = /static get COLUMN_MAP\(\) \{[\s\S]*?\n  \}/;

  if (columnMapRegex.test(content)) {
    content = content.replace(columnMapRegex, columnMapCode);
    console.log('✅ COLUMN_MAP getterを更新しました');
  } else {
    console.error('❌ COLUMN_MAP getterが見つかりませんでした');
    process.exit(1);
  }

  // ファイルに書き込み
  fs.writeFileSync(dataLayerPath, content, 'utf-8');
  console.log('✅ DataLayer.jsを保存しました\n');
}

/**
 * COLUMN_MAP getterのコードを生成
 */
function generateColumnMapCode(columnMap) {
  const lines = ['  static get COLUMN_MAP() {', '    return {'];

  // カテゴリごとにグループ化
  const categories = {
    '基本情報': ['timestamp', 'status', 'companyName', 'companyNameKana', 'tradeName', 'tradeNameKana', 'representative', 'representativeKana', 'zipCode', 'address', 'phone', 'email', 'website', 'established', 'prText'],
    '支店情報': ['branchCount', 'branchName', 'branchAddress'],
    '本人確認': ['idDocumentUrl', 'idDocumentFileId'],
    'メイン画像': ['mainVisualUrl', 'mainVisualFileId'],
    '写真ギャラリー': ['photoGalleryUrls', 'photoGalleryFileIds'],
    '連絡先・事業情報': ['billingEmail', 'salesEmail', 'salesPersonName', 'salesPersonKana', 'employees', 'salesScale', 'maxFloors'],
    '詳細情報': ['constructionTypes', 'specialServices', 'prefectures', 'cities', 'priorityAreas'],
    '施工事例': ['constructionExamples'],
    '資格・保険': ['qualifications', 'insurance'],
    '自動配信設定': ['propertyFloors', 'autoPropertyTypes', 'autoConstructionTypes', 'autoSpecialServices', 'autoPrefectures', 'autoCities', 'autoPriorityAreas'],
    'URL・ステータス': ['merchantId', 'urlSlug', 'firstLoginUrl', 'password', 'representativeHide', 'addressHide']
  };

  for (const [category, fields] of Object.entries(categories)) {
    lines.push(`      // ${category}`);
    for (const field of fields) {
      if (columnMap[field]) {
        const compressed = COMPRESSED_COLUMNS.includes(field) ? '（圧縮対象）' : '';
        const colLetter = getColumnLetter(columnMap[field]);
        lines.push(`      '${field}': ${columnMap[field]},${' '.repeat(Math.max(1, 25 - field.length))}// ${colLetter}列${compressed}`);
      }
    }
    lines.push('');
  }

  // 最後の空行と閉じ括弧を削除
  lines.pop();
  const lastLine = lines[lines.length - 1];
  lines[lines.length - 1] = lastLine.replace(/,$/, ''); // 最後のカンマを削除

  lines.push('    };');
  lines.push('  }');

  return lines.join('\n');
}

/**
 * 列番号をA1形式の列文字に変換
 */
function getColumnLetter(colNumber) {
  let letter = '';
  while (colNumber > 0) {
    const remainder = (colNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letter;
}

/**
 * 自動生成されたCOLUMN_MAPを表示
 */
function displaySummary(columnMap) {
  console.log('========================================');
  console.log('📊 COLUMN_MAP生成サマリー');
  console.log('========================================');
  console.log(`総カラム数: ${Object.keys(columnMap).length}`);
  console.log(`圧縮対象: ${COMPRESSED_COLUMNS.length}`);
  console.log('');
  console.log('次のステップ:');
  console.log('  1. shared/DataLayer.js を確認');
  console.log('  2. clasp push でGASにプッシュ');
  console.log('  3. clasp deploy で新デプロイメント作成');
  console.log('========================================');
}

// メイン実行
if (require.main === module) {
  console.log('========================================');
  console.log('🚀 COLUMN_MAP自動生成ツール');
  console.log('========================================\n');

  const columnMap = generateColumnMap();
  updateDataLayerFile(columnMap);
  displaySummary(columnMap);
}

module.exports = { generateColumnMap, updateDataLayerFile };
