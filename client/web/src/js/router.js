import { createApp } from 'vue/dist/vue.esm-bundler'
import { createWebHistory, createRouter } from 'vue-router'
import { createI18n } from 'vue-i18n/index'
import { createStore  } from 'vuex'

import Locale_en_GB from '@/src/locales/en_GB.js'
import SchemasStore from '@/src/stores/schemas.js'

import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

const store = createStore({
	modules: {
		schemas: SchemasStore
	}
});

const messages = {
	'en_GB': Locale_en_GB
}

const i18n = createI18n({
	locale: 'en_GB',
	fallbackLocale: 'en_GB',
	messages
})

const Schemas = () => import('@/src/components/schemas/Schemas.vue')

const routes = [
	{
		path: '/schemas',
		name: 'schemas',
		title: 'Schemas',
		component: Schemas,
		children: [
			{
				path: ':lang',
				component: Schemas
			}
		]
	}
];

const router = createRouter({
	history: createWebHistory(),
	routes
})

const routerApp = createApp(router)
routerApp.use(router)
routerApp.use(i18n)
routerApp.use(store)
routerApp.use(PrimeVue, {ripple: true})
routerApp.use(ConfirmationService)
routerApp.use(ToastService)
routerApp.mount('#router_app')
