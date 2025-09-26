#!/usr/bin/env node

/**
 * DYNAMIC PROJECT STATUS CHECKER
 * プロジェクトの現状を動的に調査・報告するスクリプト
 *
 * 実行方法: node DYNAMIC_PROJECT_STATUS.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectStatusChecker {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            gitStatus: {},
            projects: {},
            issues: [],
            recommendations: []
        };
    }

    // Git状態をチェック
    checkGitStatus() {
        console.log('📊 Checking Git status...');
        try {
            const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
            const status = execSync('git status --porcelain', { encoding: 'utf8' });
            const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();

            this.results.gitStatus = {
                branch,
                hasUncommittedChanges: status.length > 0,
                modifiedFiles: status.split('\n').filter(line => line).length,
                lastCommit
            };

            console.log(`  ✓ Branch: ${branch}`);
            console.log(`  ✓ Modified files: ${this.results.gitStatus.modifiedFiles}`);
        } catch (error) {
            this.results.issues.push(`Git status check failed: ${error.message}`);
        }
    }

    // プロジェクトディレクトリをチェック
    checkProjectDirectory(projectPath, projectName) {
        console.log(`📁 Checking ${projectName}...`);

        if (!fs.existsSync(projectPath)) {
            this.results.issues.push(`${projectName} directory not found`);
            return;
        }

        const project = {
            exists: true,
            files: {},
            hasPackageJson: false,
            hasClaspJson: false,
            hasEnv: false
        };

        // 重要ファイルの存在確認
        const importantFiles = [
            'package.json',
            '.clasp.json',
            '.env',
            'README.md'
        ];

        importantFiles.forEach(file => {
            const filePath = path.join(projectPath, file);
            if (fs.existsSync(filePath)) {
                project.files[file] = true;
                if (file === 'package.json') project.hasPackageJson = true;
                if (file === '.clasp.json') project.hasClaspJson = true;
                if (file === '.env') project.hasEnv = true;
                console.log(`  ✓ ${file} found`);
            } else {
                project.files[file] = false;
                if (file !== '.env') { // .envは任意
                    console.log(`  ✗ ${file} missing`);
                }
            }
        });

        // GASプロジェクトのチェック
        if (project.hasClaspJson) {
            const gasPath = path.join(projectPath, 'gas');
            if (fs.existsSync(gasPath)) {
                const gasFiles = fs.readdirSync(gasPath)
                    .filter(file => file.endsWith('.gs'));
                project.gasFiles = gasFiles;
                console.log(`  ✓ GAS files: ${gasFiles.length}`);
            }
        }

        // distディレクトリのチェック
        const distPath = path.join(projectPath, 'dist');
        if (fs.existsSync(distPath)) {
            const distFiles = fs.readdirSync(distPath);
            project.hasDistFiles = distFiles.length > 0;
            console.log(`  ✓ Dist files: ${distFiles.length}`);
        }

        this.results.projects[projectName] = project;
    }

    // 全プロジェクトをチェック
    checkAllProjects() {
        const projects = {
            'admin-dashboard': './admin-dashboard',
            'franchise-dashboard': './franchise-dashboard',
            'franchise-register': './franchise-register'
        };

        Object.entries(projects).forEach(([name, path]) => {
            this.checkProjectDirectory(path, name);
        });
    }

    // 推奨事項を生成
    generateRecommendations() {
        console.log('\n💡 Generating recommendations...');

        // Git関連の推奨事項
        if (this.results.gitStatus.hasUncommittedChanges) {
            this.results.recommendations.push(
                '⚠️  コミットされていない変更があります。作業内容を確認してコミットしてください。'
            );
        }

        // プロジェクト関連の推奨事項
        Object.entries(this.results.projects).forEach(([name, project]) => {
            if (project.exists) {
                if (project.hasClaspJson && !project.hasDistFiles) {
                    this.results.recommendations.push(
                        `📦 ${name}: ビルドが必要かもしれません (distディレクトリが空)`
                    );
                }
                if (!project.files['README.md']) {
                    this.results.recommendations.push(
                        `📝 ${name}: README.mdファイルを作成することを推奨`
                    );
                }
            }
        });
    }

    // レポート出力
    outputReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PROJECT STATUS REPORT');
        console.log('='.repeat(60));

        console.log(`\n🕐 Timestamp: ${this.results.timestamp}`);

        console.log('\n📌 Git Status:');
        console.log(`  Branch: ${this.results.gitStatus.branch}`);
        console.log(`  Modified files: ${this.results.gitStatus.modifiedFiles}`);
        console.log(`  Last commit: ${this.results.gitStatus.lastCommit}`);

        console.log('\n📁 Project Status:');
        Object.entries(this.results.projects).forEach(([name, project]) => {
            if (project.exists) {
                console.log(`\n  ${name}:`);
                console.log(`    - Package.json: ${project.hasPackageJson ? '✅' : '❌'}`);
                console.log(`    - Clasp.json: ${project.hasClaspJson ? '✅' : '❌'}`);
                console.log(`    - .env: ${project.hasEnv ? '✅' : '⚠️  (optional)'}`);
                if (project.gasFiles) {
                    console.log(`    - GAS files: ${project.gasFiles.length}`);
                }
                if (project.hasDistFiles !== undefined) {
                    console.log(`    - Built files: ${project.hasDistFiles ? '✅' : '⚠️'}`);
                }
            } else {
                console.log(`  ${name}: ❌ Not found`);
            }
        });

        if (this.results.issues.length > 0) {
            console.log('\n⚠️  Issues Found:');
            this.results.issues.forEach(issue => {
                console.log(`  - ${issue}`);
            });
        }

        if (this.results.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            this.results.recommendations.forEach(rec => {
                console.log(`  ${rec}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Status check completed!');
        console.log('='.repeat(60) + '\n');

        // PROJECT_MAP.mdの更新を推奨
        console.log('💡 Tip: Run this script regularly and update PROJECT_MAP.md accordingly.');
    }

    // メイン実行
    run() {
        console.log('🚀 Starting Dynamic Project Status Check...\n');

        this.checkGitStatus();
        this.checkAllProjects();
        this.generateRecommendations();
        this.outputReport();

        // 結果をJSONファイルとして保存（オプション）
        const outputPath = './project-status.json';
        fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved to: ${outputPath}`);
    }
}

// スクリプトを実行
if (require.main === module) {
    const checker = new ProjectStatusChecker();
    checker.run();
}

module.exports = ProjectStatusChecker;