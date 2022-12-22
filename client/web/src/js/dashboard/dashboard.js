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
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import { EstuaryStorage, FGStorage } from '@co2-storage/js-api'
import { ControlCameraOutlined } from '@material-ui/icons'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init Estuary storage
	if(this.estuaryStorage == null)
		this.$store.dispatch('main/setEstuaryStorage', new EstuaryStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null)
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))
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
	co2StorageIpfsNodeType() {
		return this.$store.getters['main/getCO2StorageIpfsNodeType']
	},
	co2StorageIpfsNodeAddr() {
		return this.$store.getters['main/getCO2StorageIpfsNodeAddr']
	},
	mode() {
		return this.$store.getters['main/getMode']
	},
	estuaryStorage() {
		return this.$store.getters['main/getEstuaryStorage']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	ipldExplorerUrl() {
		return this.$store.getters['main/getIpldExplorerUrl']
	},
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
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

		await this.loadMyAssets()
		await this.loadMyTemplates()
	},
	async assetsFullTextSearch() {
		await this.loadMyAssets()
	},
	async templatesFullTextSearch() {
		await this.loadMyTemplates()
	}
}

const mounted = async function() {
}

const methods = {
	async loadMyAssets() {
		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		let assets
		try {
			//	const searchResult = (await this.fgStorage.search(chainName, phrases, dataStructure, cid, parent, name, description, base, reference, contentCid, creator, createdFrom, createdTo, version, offset, limit, sortBy, sortDir)).result
			const myAssets = (await this.fgStorage.search(this.ipfsChainName, this.assetsFullTextSearch, 'asset', this.assetsSearchCid, null, this.assetsSearchName, null, null, null, null, this.selectedAddress, null, null, null, this.assetsSearchOffset, this.assetsSearchLimit, this.assetsSearchBy, this.assetsSearchDir)).result
			assets = myAssets.map((asset) => {
				return {
					asset: asset,
					block: asset.cid
				}
			})
			this.assetsSearchResults = (assets.length) ? assets[0].asset.total : 0
		} catch (error) {
			console.log(error)
		}

		this.loading = false

		// Load assets
		this.assets = assets
		this.assetsLoading = false
	},
	async assetsPage(ev) {
		this.assetsSearchLimit = ev.rows
		this.assetsSearchOffset = ev.page * this.assetsSearchLimit
		await this.loadMyAssets()
	},
	async assetsFilter(ev) {
		this.assetsSearchOffset = 0
		this.assetsSearchName = ev.filters.name.value
		this.assetsSearchCid = ev.filters.cid.value
		await this.loadMyAssets()
	},
	async assetsSort(ev) {
		this.assetsSearchOffset = 0
		this.assetsSearchBy = ev.sortField
		this.assetsSearchDir = (ev.sortOrder > 0) ? 'asc' : 'desc'
		await this.loadMyAssets()
	},
	async loadMyTemplates() {
		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		let templates
		try {
			const myTemplates = (await this.fgStorage.search(this.ipfsChainName, this.templatesFullTextSearch, 'template', this.templatesSearchCid, null, this.templatesSearchName, null, null, null, null, this.selectedAddress, null, null, null, this.templatesSearchOffset, this.templatesSearchLimit, this.templatesSearchBy, this.templatesSearchDir)).result
			templates = myTemplates.map((template) => {
				return {
					template: template,
					block: template.cid
				}
			})
			this.templatesSearchResults = (templates.length) ? templates[0].template.total : 0
		} catch (error) {
			console.log(error)
		}

		this.loading = false

		// Load templates
		this.templates = templates
		this.templatesLoading = false
	},
	async templatesPage(ev) {
		this.templatesSearchLimit = ev.rows
		this.templatesSearchOffset = ev.page * this.templatesSearchLimit
		await this.loadMyTemplates()
	},
	async templatesFilter(ev) {
		this.templatesSearchOffset = 0
		this.templatesSearchName = ev.filters.name.value
		this.templatesSearchCid = ev.filters.cid.value
		await this.loadMyTemplates()
	},
	async templatesSort(ev) {
		this.templatesSearchOffset = 0
		this.templatesSearchBy = ev.sortField
		this.templatesSearchDir = (ev.sortOrder > 0) ? 'asc' : 'desc'
		await this.loadMyTemplates()
	},
	showAsset(assetObj) {
		this.navigate('/assets/' + assetObj.data.block)
	},
	showTemplate(templateObj) {
		this.navigate('/templates/' + templateObj.data.block)
	},
	async sign(entity, type){
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		switch (type) {
			case 'template':
				await this.fgStorage.signCid(entity.content_cid, entity.cid, "template", this.ipfsChainName, this.signResponse)
				break
			case 'asset':
				await this.fgStorage.signCid(entity.content_cid, entity.cid, "asset", this.ipfsChainName, this.signResponse)
				break
			default:
				break
		}
    },
	async signResponse(response) {
		const that = this
		this.signDialog = response
		this.displaySignDialog = true
		const type = (response.result && response.result.type) ? response.result.type : null
		switch (type) {
			case 'template':
				window.setTimeout(async () => {
					that.templatesSearchOffset = 0
					await that.loadMyTemplates()
				}, this.indexingInterval)
				this.templatesSearchOffset = 0
				await this.loadMyTemplates()
				break
			case 'asset':
				window.setTimeout(async () => {
					that.assetsSearchOffset = 0
					await that.loadMyAssets()
				}, this.indexingInterval)
				this.assetsSearchOffset = 0
				await this.loadMyAssets()
				break
			default:
				break
		}
		this.loading = false
	},
    async printSignature(entity) {
		this.signedDialog = entity
		this.displaySignedDialog = true
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		const verifyCidSignatureResponse = await this.fgStorage.verifyCidSignature(entity.signature_account,
			entity.signature_cid, entity.signature_v, entity.signature_r, entity.signature_s)
		this.signedDialog.verified = verifyCidSignatureResponse.result
		this.loading = false
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
		Toast,
		Button,
		Dialog
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
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
			},
			assetsMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			assetsLoading: true,
			templates: [],
			templatesFilters: {
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			templatesMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			templatesLoading: true,
			loading: false,
			loadingMessage: '',
			templatesSearchOffset: 0,
			templatesSearchLimit: 3,
			templatesSearchResults: 0,
			templatesFullTextSearch: null,
			templatesSearchName: null,
			templatesSearchCid: null,
			templatesSearchBy: 'timestamp',
			templatesSearchDir: 'desc',
			assetsSearchOffset: 0,
			assetsSearchLimit: 3,
			assetsSearchResults: 0,
			assetsFullTextSearch: null,
			assetsSearchName: null,
			assetsSearchCid: null,
			assetsSearchBy: 'timestamp',
			assetsSearchDir: 'desc',
			displaySignDialog: false,
			signDialog: {},
			displaySignedDialog: false,
			signedDialog: {},
			indexingInterval: 5000
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
