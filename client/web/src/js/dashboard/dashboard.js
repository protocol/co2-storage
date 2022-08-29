import language from '@/src/mixins/i18n/language.js'
import getWallets from '@/src/mixins/wallet/get-wallets.js'
import keyExists from '@/src/mixins/ipfs/key-exists.js'
import navigate from '@/src/mixins/router/navigate.js'

import Header from '@/src/components/helpers/Header.vue'

import { CID } from 'multiformats/cid'

import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'

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
	}
}

const watch = {
	currentProvider: {
		handler() {
			if(this.currentProvider == null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
			}
			else {
				this.selectedAddress = this.currentProvider.selectedAddress
			}
		},
		deep: true,
		immediate: false
	},
	walletError: {
		handler() {
			if(this.walletError != null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
				// TODO, popup error
			}
		},
		deep: true,
		immediate: false
	},
	async selectedAddress() {
		if(this.selectedAddress == null)
			return

		await this.getWallets()
		await this.mySchemasAndAssets()
	}
}

const mounted = async function() {
}

const methods = {
	async mySchemasAndAssets() {
		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary:'Wallet not connected', detail:'Please connect your wallet in order to add environmental asset template', life: 3000})
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
		getWallets,
		keyExists,
		navigate
	],
	components: {
		Header,
		InputText,
		DataTable,
		Column
	},
	directives: {
	},
	name: 'Dasboard',
	data () {
		return {
			currentProvider: null,
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
			schemasLoading: true
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
