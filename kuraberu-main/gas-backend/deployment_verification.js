/**
 * Deployment verification and initialization script
 * Run this manually in GAS editor to verify deployment
 */

function runDeploymentVerification() {
  console.log('🚀 Starting deployment verification...');
  
  try {
    // Run setup functions
    console.log('📋 Running setupSystemProperties...');
    if (typeof setupSystemProperties === 'function') {
      setupSystemProperties();
      console.log('✅ setupSystemProperties completed');
    } else {
      console.log('❌ setupSystemProperties function not found');
    }
    
    console.log('🔍 Running checkDeploymentStatus...');
    if (typeof checkDeploymentStatus === 'function') {
      checkDeploymentStatus();
      console.log('✅ checkDeploymentStatus completed');
    } else {
      console.log('❌ checkDeploymentStatus function not found');
    }
    
    // Test basic endpoints
    console.log('🌐 Testing basic endpoint functions...');
    if (typeof doGet === 'function') {
      console.log('✅ doGet function exists');
    } else {
      console.log('❌ doGet function not found');
    }
    
    if (typeof doPost === 'function') {
      console.log('✅ doPost function exists');
    } else {
      console.log('❌ doPost function not found');
    }
    
    console.log('✅ Deployment verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment verification failed:', error);
  }
}

function testAICompanySearch() {
  console.log('🤖 Testing AI company search functionality...');
  
  try {
    // Simulate a JSONP request for company search
    const testRequest = {
      parameter: {
        action: 'searchCompany',
        query: 'テスト会社',
        callback: 'testCallback'
      }
    };
    
    const response = doGet(testRequest);
    console.log('✅ AI company search test response:', response);
    
  } catch (error) {
    console.error('❌ AI company search test failed:', error);
  }
}