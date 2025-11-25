/**
 * 自動デプロイテスト
 * このファイルを保存すると、5秒後に自動でclasp pushされます。
 */

function testAutoDeployFunction() {
  console.log('✅ 自動デプロイテスト成功！');
  console.log('作成時刻:', new Date().toISOString());
  return { success: true, message: 'Auto deploy is working!' };
}
