function testGitHubToken() {
  const token = PropertiesService.getScriptProperties().getProperty('GH_PAT');
  
  if (!token) {
    console.log('❌ GH_PAT not found');
    return;
  }
  
  console.log('✅ GH_PAT found:', token.substring(0, 10) + '...');
  console.log('Token length:', token.length);
  console.log('Starts with ghp_:', token.startsWith('ghp_'));
}
