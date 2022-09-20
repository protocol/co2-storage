import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import { CID } from 'multiformats/cid'

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
			await this.mySchemasAndAssets()
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

		const authType = null	// default metamask
		const addr = null		// default /ip4/127.0.0.1/tcp/5001 (co2.storage local node: /dns4/rqojucgt.co2.storage/tcp/5002/https)
		const walletsKey = null	// default 'co2.storage-wallets'
		const storage = new Storage(authType, addr, walletsKey)
		const initStorageResponse = await storage.init()
		if(initStorageResponse.error != null) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: initStorageResponse.error, life: 3000})
			return
		}
		this.ipfs = initStorageResponse.result.ipfs
		this.wallets = initStorageResponse.result.list

		this.loading = false

		await this.mySchemasAndAssets()
	}
}

const mounted = async function() {
}

const methods = {
	async mySchemasAndAssets() {
		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary: this.$t('message.shared.wallet-not-connected'), detail: this.$t('message.shared.wallet-not-connected-description'), life: 3000})
			return
		}

		const keyPath = `/ipns/${walletChainKey}`
		let walletChainCid

		// Resolve IPNS name
		for await (const name of this.ipfs.name.resolve(keyPath)) {
			walletChainCid = name.replace('/ipfs/', '')
		}
		walletChainCid = CID.parse(walletChainCid)

		// Get last walletsChain block
		const walletChain = (await this.ipfs.dag.get(walletChainCid)).value

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
