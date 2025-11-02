import {createApp} from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import {createPinia} from 'pinia'
import VueKonva from 'vue-konva'
import App from './App.vue'
import router from './router'
import './style.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            cssLayer: {
                name: 'primevue',
                order: 'tailwind-base, primevue, tailwind-utilities'
            },

            darkModeSelector: 'html:where(.primevue-dark)'
        }
    }
})
app.use(createPinia())
app.use(VueKonva)
app.use(router)

app.mount('#app')
