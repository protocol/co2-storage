import { createApp } from 'vue/dist/vue.esm-bundler'
import { createWebHistory, createRouter } from 'vue-router'
import { createI18n } from 'vue-i18n/dist/vue-i18n.cjs'
import { createStore  } from 'vuex'

import Locale_en_GB from '@/src/locales/en_GB.js'
import MainStore from '@/src/stores/main.js'

import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'

const store = createStore({
	modules: {
		main: MainStore
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

const Template = () => import('@/src/components/template/Template.vue')
const Asset = () => import('@/src/components/asset/Asset.vue')

const routes = [
	{
		path: '/',
		name: 'template',
		title: 'Template',
		component: Template,
		children: [
			{
				path: ':cid',
				component: Template
			}
		]
	},
	{
		path: '/asset',
		name: 'asset',
		title: 'Asset',
		component: Asset,
		children: [
			{
				path: ':cid',
				component: Asset
			}
		]
	}];

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
