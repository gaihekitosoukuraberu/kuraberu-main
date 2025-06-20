import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import BasicInfo from '../views/BasicInfo.vue'
import AreaSelection from '../views/AreaSelection.vue'
import Confirmation from '../views/Confirmation.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/basic-info',
    name: 'BasicInfo',
    component: BasicInfo
  },
  {
    path: '/area-selection',
    name: 'AreaSelection',
    component: AreaSelection
  },
  {
    path: '/confirmation',
    name: 'Confirmation',
    component: Confirmation
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router