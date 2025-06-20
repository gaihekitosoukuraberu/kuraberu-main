import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

console.log('🏠 [franchise-hearing] Application starting...')

const app = createApp(App)

// Pinia (状態管理)
app.use(createPinia())

// Vue Router
app.use(router)

app.mount('#app')