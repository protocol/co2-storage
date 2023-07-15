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

const Main = () => import('@/src/components/main/Main.vue')
const About = () => import('@/src/components/about/About.vue')
const Profile = () => import('@/src/components/profile/Profile.vue')
const Dashboard = () => import('@/src/components/dashboard/Dashboard.vue')
const Templates = () => import('@/src/components/templates/Templates.vue')
const Assets = () => import('@/src/components/assets/Assets.vue')
const Functions = () => import('@/src/components/functions/Functions.vue')
const Pipelines = () => import('@/src/components/pipelines/Pipelines.vue')
const CreatePipeline = () => import('@/src/components/pipelines/CreatePipeline.vue')

const routes = [
	{
		path: '/',
		name: 'main',
		title: 'Main',
		component: Main
	},
	{
		path: '/about',
		name: 'about',
		title: 'About',
		component: About
	},
	{
		path: '/profile',
		name: 'profile',
		title: 'Profile',
		component: Profile
	},
	{
		path: '/dashboard',
		name: 'dashboard',
		title: 'Dashboard',
		component: Dashboard
	},
	{
		path: '/templates',
		name: 'templates',
		title: 'Templates',
		component: Templates,
		children: [
			{
				path: ':cid',
				component: Templates
			}
		]
	},
	{
		path: '/assets',
		name: 'assets',
		title: 'Assets',
		component: Assets,
		children: [
			{
				path: ':cid',
				component: Assets
			}
		]
	},
	{
		path: '/functions',
		name: 'functions',
		title: 'Functions',
		component: Functions,
		children: [
			{
				path: ':cid',
				component: Functions
			}
		]
	},
	{
		path: '/pipelines',
		name: 'pipelines',
		title: 'Pipelines',
		component: Pipelines,
		children: [
			{
				path: ':cid',
				component: Pipelines
			}
		]
	},
	{
		path: '/pipelines/create',
		name: 'pipelines-create',
		component: CreatePipeline,
		children: [
			{
				path: ':cid',
				component: CreatePipeline
			}
		]
	}
]

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
