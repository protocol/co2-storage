import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'

import { EstuaryStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init Estuary storage
	if(this.estuaryStorage == null)
		this.$store.dispatch('main/setEstuaryStorage', new EstuaryStorage(this.co2StorageAuthType))
}

const computed = {
	dashboardClass() {
		return this.theme + '-dashboard-' + this.themeVariety
	},
	locale() {
		return this.$store.getters['main/getLocale']
	},
	theme() {
		return this.$store.getters['main/getTheme']
	},
	themeVariety() {
		return this.$store.getters['main/getThemeVariety']
	},
	co2StorageAuthType() {
		return this.$store.getters['main/getCO2StorageAuthType']
	},
	estuaryStorage() {
		return this.$store.getters['main/getEstuaryStorage']
	},
	ipldExplorerUrl() {
		return this.$store.getters['main/getIpldExplorerUrl']
	}
}

const watch = {
	walletError: {
		handler() {
			if(this.walletError != null) {
				this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: this.walletError, life: 3000})
				this.selectedAddress = null
			}
		},
		deep: true,
		immediate: false
	},
	async selectedAddress() {
		if(this.selectedAddress == null) {
			this.$router.push({ path: '/' })
			return
		}

		await this.loadMySchemasAndAssets()
	}
}

const mounted = async function() {
}

const methods = {
	async loadMySchemasAndAssets() {
		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		let getAccountTemplatesAndAssetsResponse
		try {
			getAccountTemplatesAndAssetsResponse = await this.estuaryStorage.getAccountTemplatesAndAssets()
		} catch (error) {
			console.log(error)
		}

		this.loading = false

		// Load assets and templates
		this.assets = getAccountTemplatesAndAssetsResponse.result.assets
		this.assetsLoading = false
		this.templates = getAccountTemplatesAndAssetsResponse.result.templates
		this.templatesLoading = false
	},
	showAsset(assetObj) {
		this.navigate('/assets/' + assetObj.data.block)
	},
	showTemplate(templateObj) {
		this.navigate('/templates/' + templateObj.data.block)
	}
}

const beforeUnmount = async function() {
}

export default {
	mixins: [
		language,
		navigate,
		copyToClipboard
	],
	components: {
		Header,
		LoadingBlocker,
		InputText,
		DataTable,
		Column,
		Toast
	},
	directives: {
		Tooltip
	},
	name: 'Dasboard',
	data () {
		return {
			selectedAddress: null,
			walletError: null,
			assets: [],
			assetsFilters: {
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			assetsMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			assetsLoading: true,
			templates: [],
			templatesFilters: {
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			templatesMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			templatesLoading: true,
			loading: false,
			loadingMessage: ''
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
