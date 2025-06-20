<template>
  <div class="container">
    <h1>🏠 外壁塗装くらべるAI</h1>
    <h2>加盟店登録システム</h2>
    
    <p>加盟店登録を開始してください：</p>
    
    <router-link to="/basic-info" class="btn">📝 加盟店登録開始</router-link>
    
    <hr>
    <h3>各ステップ:</h3>
    <ul>
      <li><router-link to="/basic-info">Step 1: 基本情報入力</router-link></li>
      <li><router-link to="/area-selection">Step 2: 対応エリア選択</router-link></li>
      <li><router-link to="/confirmation">Step 3: 確認・送信</router-link></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'Home'
}
</script>

<style scoped>
.container { 
  max-width: 600px; 
  margin: 40px auto; 
  padding: 0 20px;
}

.btn { 
  display: inline-block; 
  padding: 12px 24px; 
  background: #007bff; 
  color: white; 
  text-decoration: none; 
  border-radius: 5px; 
  margin: 10px 0; 
}

.btn:hover { 
  background: #0056b3; 
}

hr {
  margin: 30px 0;
  border: none;
  border-top: 1px solid #eee;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin: 10px 0;
}

li a {
  color: #007bff;
  text-decoration: none;
}

li a:hover {
  text-decoration: underline;
}
</style>