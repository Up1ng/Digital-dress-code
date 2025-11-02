import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TemplateEditor from '../views/TemplateEditor.vue'
import EnvironmentEditor from '../views/EnvironmentEditor.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard
  },
  {
    path: '/templates/:id?',
    name: 'template-editor',
    component: TemplateEditor,
    props: true
  },
  {
    path: '/environments/:id?',
    name: 'environment-editor',
    component: EnvironmentEditor,
    props: true
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
