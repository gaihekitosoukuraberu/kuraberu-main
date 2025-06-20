<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --warning-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --card-shadow: 0 10px 40px rgba(0,0,0,0.1);
  --card-shadow-hover: 0 20px 60px rgba(0,0,0,0.15);
  --border-radius: 16px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --text-primary: #1a202c;
  --text-secondary: #718096;
  --bg-primary: #ffffff;
  --bg-secondary: #f7fafc;
}

body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Noto Sans JP', sans-serif; 
  margin: 0;
  padding: 0;
  background: var(--bg-secondary);
  color: var(--text-primary);
}

#app {
  min-height: 100vh;
}
</style>