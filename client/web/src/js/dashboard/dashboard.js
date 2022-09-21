import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import mySchemasAndAssets from '@/src/mixins/co2-storage/my-schemas-and-assets.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'

import { Storage } from '@co2-storage/js-api'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init co2-storage
	this.storage = new Storage(this.co2StorageAuthType, this.co2StorageAddr, this.co2StorageWalletsKey)
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
	walletChain() {
		return this.$store.getters['main/getWalletChain']
	},
	co2StorageAuthType() {
		return this.$store.getters['main/getCO2StorageAuthType']
	},
	co2StorageAddr() {
		return this.$store.getters['main/getCO2StorageAddr']
	},
	co2StorageWalletsKey() {
		return this.$store.getters['main/getCO2StorageWalletsKey']
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
	walletChain: {
		async handler() {
			if(this.walletChain == null)
				return
			await this.loadMySchemasAndAssets()
		},
		deep: true,
		immediate: false
	},
	async selectedAddress() {
		if(this.selectedAddress == null) {
			this.$router.push({ path: '/' })
			return
		}

		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		const initStorageResponse = await this.storage.init()
		if(initStorageResponse.error != null) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: initStorageResponse.error, life: 3000})
			return
		}
		this.ipfs = initStorageResponse.result.ipfs
		this.wallets = initStorageResponse.result.list

		this.loading = false

		await this.loadMySchemasAndAssets()
	}
}

const mounted = async function() {
}

const methods = {
	async loadMySchemasAndAssets() {
		const walletChain = await this.mySchemasAndAssets()

		this.assets = walletChain.assets
		this.assetsLoading = false
		this.schemas = walletChain.templates
		this.schemasLoading = false
	},
	showAsset(assetObj) {
		this.navigate('/assets/' + assetObj.data.cid)
	},
	showSchema(schemaObj) {
		this.navigate('/schemas/' + schemaObj.data.cid)
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language,
		navigate,
		copyToClipboard,
		mySchemasAndAssets
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
			storage: null,
			selectedAddress: null,
			walletError: null,
			wallets: {},
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
			schemas: [],
			schemasFilters: {
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			schemasMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			schemasLoading: true,
			loading: false,
			loadingMessage: ''
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
