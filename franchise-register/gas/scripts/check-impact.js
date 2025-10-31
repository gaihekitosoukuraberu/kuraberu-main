#!/usr/bin/env node

/**
 * ====================================
 * 変更影響チェックスクリプト
 * ====================================
 *
 * 【目的】
 * - 変更したファイルの影響範囲を自動検知
 * - 必要なテストを提案
 * - 他システムへの影響を警告
 *
 * 【使用方法】
 * ```bash
 * node gas/scripts/check-impact.js FranchiseSystem.js
 * node gas/scripts/check-impact.js MerchantSystem.js
 * node gas/scripts/check-impact.js --git  # git diffから自動検知
 * ```
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 影響マップ（依存関係の定義）
const IMPACT_MAP = {
  'FranchiseSystem.js': {
    location: 'gas/systems/franchise/FranchiseSystem.js',
    description: '加盟店登録システム（データ書き込み）',
    affectedSystems: [
      'MerchantSystem.js（データ読み取り）',
      'AdminSystem.js（管理機能）',
      'franchise-register（フロント）'
    ],
    dataFormat: [
      '支店住所（P列）',
      '対応市区町村（AI列）',
      'PRテキスト（O列）',
      '保有資格（AL列）',
      '加入保険（AM列）'
    ],
    criticalPoints: [
      'データフォーマット変更',
      '圧縮/展開ロジック変更',
      'Spreadsheet書き込み列の変更'
    ],
    requiredTests: [
      'integration-test',
      'merchant-test',
      'admin-test'
    ],
    warningLevel: '🔴 HIGH'
  },

  'MerchantSystem.js': {
    location: 'gas/systems/merchant/MerchantSystem.js',
    description: '加盟店ポータル（データ読み取り・認証）',
    affectedSystems: [
      'franchise-dashboard（フロント）',
      'first-login.html'
    ],
    dataFormat: [
      'window.merchantData構造',
      'JSONP レスポンス形式',
      '圧縮データ自動展開'
    ],
    criticalPoints: [
      'データ読み取りロジック変更',
      '認証ロジック変更',
      'レスポンス形式変更'
    ],
    requiredTests: [
      'integration-test',
      'merchant-test'
    ],
    warningLevel: '🟠 MEDIUM'
  },

  'AdminSystem.js': {
    location: 'gas/systems/admin/AdminSystem.js',
    description: '管理者ダッシュボード',
    affectedSystems: [
      'admin-dashboard（フロント）'
    ],
    dataFormat: [
      '申請一覧データ形式',
      '承認/却下レスポンス'
    ],
    criticalPoints: [
      'ステータス更新ロジック',
      'パスワード生成',
      '初回ログインURL生成'
    ],
    requiredTests: [
      'integration-test',
      'admin-test'
    ],
    warningLevel: '🟠 MEDIUM'
  },

  'AISearchSystem.gs': {
    location: 'gas/systems/ai/AISearchSystem.gs',
    description: 'AI検索システム',
    affectedSystems: [
      'franchise-register（フロント）'
    ],
    dataFormat: [
      'AI検索レスポンス形式',
      '会社情報抽出結果'
    ],
    criticalPoints: [
      'プロンプト変更',
      'レスポンス形式変更',
      'エラーハンドリング'
    ],
    requiredTests: [
      'integration-test',
      'ai-test'
    ],
    warningLevel: '🟢 LOW'
  },

  'DataLayer.js': {
    location: 'gas/shared/DataLayer.js',
    description: '統一データアクセス層',
    affectedSystems: [
      '全システム（FranchiseSystem, MerchantSystem, AdminSystem）'
    ],
    dataFormat: [
      'COLUMN_MAP',
      '圧縮データ展開ロジック',
      'データ読み書きAPI'
    ],
    criticalPoints: [
      'カラムマップ変更',
      'データ展開ロジック変更',
      'APIシグネチャ変更'
    ],
    requiredTests: [
      'integration-test',
      'data-layer-test',
      'merchant-test',
      'admin-test',
      'franchise-test'
    ],
    warningLevel: '🔴 CRITICAL'
  },

  'main.js': {
    location: 'gas/main.js',
    description: 'GASエントリーポイント',
    affectedSystems: [
      '全システム'
    ],
    dataFormat: [
      'ルーティングロジック',
      'doGet/doPost'
    ],
    criticalPoints: [
      'ルーティング変更',
      'エラーハンドリング変更'
    ],
    requiredTests: [
      'integration-test'
    ],
    warningLevel: '🔴 CRITICAL'
  },

  'env-loader.js': {
    location: [
      'franchise-register/dist/js/env-loader.js',
      'admin-dashboard/dist/js/env-loader.js',
      'franchise-dashboard/dist/merchant-portal/env-loader.js'
    ],
    description: '環境変数ローダー（全システム共通）',
    affectedSystems: [
      '全フロントエンド'
    ],
    dataFormat: [
      'GAS_URL',
      'CACHE_BUSTER'
    ],
    criticalPoints: [
      'GAS_URL変更',
      '全env-loader.jsの同期確認必須'
    ],
    requiredTests: [
      'integration-test'
    ],
    warningLevel: '🔴 CRITICAL'
  },

  'ScriptProperties': {
    location: 'GAS Script Properties',
    description: 'GAS設定（DRIVE_ROOT_FOLDER_ID等）',
    affectedSystems: [
      '全システム'
    ],
    dataFormat: [
      'DRIVE_ROOT_FOLDER_ID',
      'SPREADSHEET_ID',
      'FIRST_LOGIN_URL'
    ],
    criticalPoints: [
      'Driveフォルダ変更',
      'Spreadsheet変更'
    ],
    requiredTests: [
      'integration-test'
    ],
    warningLevel: '🔴 CRITICAL'
  }
};

/**
 * Git diffから変更ファイルを検出
 */
function getChangedFiles() {
  try {
    const diff = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    const stagedDiff = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    const allChanges = (diff + stagedDiff).split('\n').filter(f => f.trim());

    return [...new Set(allChanges)]; // 重複除去
  } catch (error) {
    console.error('❌ Git diff取得エラー:', error.message);
    return [];
  }
}

/**
 * ファイル名から影響マップを検索
 */
function findImpact(fileName) {
  for (const [key, impact] of Object.entries(IMPACT_MAP)) {
    if (fileName.includes(key) || fileName.endsWith(key)) {
      return { key, ...impact };
    }
  }
  return null;
}

/**
 * 影響レポート表示
 */
function displayImpact(fileName, impact) {
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  ${impact.warningLevel} ${impact.description}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log(`📄 変更ファイル: ${fileName}`);
  console.log('');

  console.log('⚠️  影響を受けるシステム:');
  impact.affectedSystems.forEach(system => {
    console.log(`   - ${system}`);
  });
  console.log('');

  console.log('🔍 データフォーマット:');
  impact.dataFormat.forEach(format => {
    console.log(`   - ${format}`);
  });
  console.log('');

  console.log('🚨 注意点:');
  impact.criticalPoints.forEach(point => {
    console.log(`   - ${point}`);
  });
  console.log('');

  console.log('✅ 必須テスト:');
  impact.requiredTests.forEach(test => {
    console.log(`   npm run test:${test.replace('-test', '')}`);
  });
  console.log('');

  // 警告レベルに応じた推奨アクション
  if (impact.warningLevel.includes('CRITICAL') || impact.warningLevel.includes('HIGH')) {
    console.log('🚨 推奨アクション:');
    console.log('   1. 全env-loader.jsの同期確認');
    console.log('   2. 統合テスト実行（npm run test:integration）');
    console.log('   3. 新デプロイメント作成');
    console.log('   4. FTPアップロード確認');
    console.log('');
  }
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);

  console.log('════════════════════════════════════════════════════════════');
  console.log('  変更影響チェック - くらべる加盟店システム');
  console.log('════════════════════════════════════════════════════════════');

  let filesToCheck = [];

  // --gitオプション: Git diffから自動検知
  if (args.includes('--git')) {
    console.log('📝 Git diff から変更ファイルを検出中...');
    filesToCheck = getChangedFiles();

    if (filesToCheck.length === 0) {
      console.log('✅ 変更ファイルなし（全てコミット済み）');
      return;
    }

    console.log(`🔍 ${filesToCheck.length}個の変更ファイルを検出:`);
    filesToCheck.forEach(f => console.log(`   - ${f}`));
  }
  // 引数指定: 特定ファイルのチェック
  else if (args.length > 0) {
    filesToCheck = args;
  }
  // 引数なし: ヘルプ表示
  else {
    console.log('');
    console.log('使用方法:');
    console.log('  node gas/scripts/check-impact.js FranchiseSystem.js');
    console.log('  node gas/scripts/check-impact.js MerchantSystem.js');
    console.log('  node gas/scripts/check-impact.js --git  # Git diffから自動検知');
    console.log('');
    console.log('利用可能なファイル:');
    Object.keys(IMPACT_MAP).forEach(key => {
      console.log(`  - ${key}`);
    });
    return;
  }

  // 影響チェック実行
  let hasHighImpact = false;
  filesToCheck.forEach(fileName => {
    const impact = findImpact(fileName);
    if (impact) {
      displayImpact(fileName, impact);

      if (impact.warningLevel.includes('CRITICAL') || impact.warningLevel.includes('HIGH')) {
        hasHighImpact = true;
      }
    } else {
      console.log(`ℹ️  ${fileName}: 影響マップに登録されていません（影響なし）`);
    }
  });

  // 最終警告
  if (hasHighImpact) {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  🚨 高影響度の変更が検出されました');
    console.log('════════════════════════════════════════════════════════════');
    console.log('⚠️  必ず以下を実行してください:');
    console.log('   1. npm run test:integration');
    console.log('   2. 全env-loader.jsの確認');
    console.log('   3. 関連システムの動作確認');
    console.log('');
    process.exit(1);
  } else {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  ✅ 影響範囲を確認しました');
    console.log('════════════════════════════════════════════════════════════');
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { IMPACT_MAP, findImpact };
