import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import cookie from '@/src/mixins/cookie/cookie.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'
import Contributor from '@/src/components/helpers/Contributor.vue'

import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

import VueJsonPretty from 'vue-json-pretty'

import { EstuaryStorage, FGStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init Estuary storage
	if(this.estuaryStorage == null)
		this.$store.dispatch('main/setEstuaryStorage', new EstuaryStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr, fgApiHost: this.fgApiUrl}))

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null)
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr, fgApiHost: this.fgApiUrl, fgApiToken: this.fgApiToken}))

	// get api token
	await this.getToken()
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
	fgApiUrl() {
		return this.$store.getters['main/getFgApiUrl']
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
	fgApiToken() {
		return this.$store.getters['main/getFgApiToken']
	},
	fgApiProfileDefaultDataLicense() {
		return this.$store.getters['main/getFgApiProfileDefaultDataLicense']
	},
	fgApiProfileName() {
		return this.$store.getters['main/getFgApiProfileName']
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
		await this.init()
	},
	async assetsFullTextSearch() {
		await this.loadMyAssets()
	},
	async templatesFullTextSearch() {
		await this.loadMyTemplates()
	},
	async refresh() {
		if(this.refresh)
			await this.init()
		this.refresh = false
	}
}

const mounted = async function() {
}

const methods = {
	async getToken() {
		let token = this.fgApiToken || this.getCookie('storage.co2.token')
		if(token == null || token.length == 0) {
			try {
				token = (await this.fgStorage.getApiToken(false)).result.data.token
				this.setCookie('storage.co2.token', token, 365)
			} catch (error) {
				console.log(error)
			}
		}
		else {
			this.fgStorage.fgApiToken = token
			this.$store.dispatch('main/setFgApiToken', token)
		}

		return token	
	},
	async init() {
		if(this.selectedAddress == null) {
			this.$router.push({ path: '/' })
			return
		}

		this.hasMySignature = {}
		
		await this.loadMyAssets()
		await this.loadMyTemplates()

		if(this.fgApiProfileName == null && this.fgApiProfileDefaultDataLicense == null)
			await this.getApiProfile()
	},
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
	sign(cid){
		this.contributionCid = cid
		this.displayContributorDialog = true
	},
	async signRequest(contribution) {
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		try {
			let response = await this.fgStorage.addProvenanceMessage(contribution.cid, contribution.contributorName,
				contribution.dataLicense, contribution.notes, this.ipfsChainName)
			await this.signResponse(response)
		} catch (error) {
			this.loading = false
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: error, life: 3000})
		}
	},
	async signResponse(response) {
		const that = this
		this.signDialog = response
		this.displaySignDialog = true
		setTimeout(async () => {
			that.templatesSearchOffset = 0
			await that.loadMyTemplates()
			that.assetsSearchOffset = 0
			await that.loadMyAssets()
		}, this.indexingInterval)
		this.loading = false
	},
	async loadSignatures(cid) {
		let entities = await this.provenanceMessages(cid)
		if(entities.error)
			return

		if(entities.result.length == 0) {
			const record = await this.fgStorage.search(this.ipfsChainName, null, null, cid)
			if(record.error) {
				this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: record.error, life: 3000})
				return
			}
			if(record.result.length == 0) {
				this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: this.$t('message.shared.empty-recordset'), life: 3000})
				return
			}
			let entity = record.result[0]
			await this.printSignature(entity)
		}

		this.signedDialogs.length = 0
		for await(let entity of entities.result) {
			entity.signed = entity.signature && entity.signature.length
			const provenanceMessageSignature = await this.fgStorage.getDag(entity.cid)
			entity.provenanceMessageSignature = provenanceMessageSignature
			const provenanceMessage = await this.fgStorage.getDag(entity.provenanceMessageSignature.provenance_message)
			entity.provenanceMessage = provenanceMessage
			await this.printSignature(entity)
		}
	},
	async printSignature(entity) {
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		const verifyCidSignatureResponse = await this.fgStorage.verifyCidSignature(entity.signature_account,
			entity.signature_cid, entity.signature_v, entity.signature_r, entity.signature_s)
		entity.verified = verifyCidSignatureResponse.result
		this.signedDialogs.push(entity)
		this.hasMySignature[entity.reference] = this.hasMySignature[entity.reference] || (entity.signature_account == this.selectedAddress)
		this.displaySignedDialog = true
		this.loading = false
	},
	async provenanceMessages(cid) {
		const provenance = await this.fgStorage.search(this.ipfsChainName, null, 'provenance', null, null, null, null, null, cid)
		if(provenance.error) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: provenance.error, life: 3000})
			return {
				result: null,
				error: provenance.error
			}
		}
		return {
			result: provenance.result,
			error: null
		}
	},
	async hasProvenance(cid) {
		const provenance = await this.fgStorage.search(this.ipfsChainName, null, 'provenance', null, null, null, null, null, cid)
		this.provenanceExist[cid] = provenance.result && provenance.result.length > 0
		return provenance.result && provenance.result.length > 0
	},
	async showIpldDialog(cid) {
		const payload = await this.fgStorage.getDag(cid)
		this.ipldDialog.cid = cid
		this.ipldDialog.payload = payload
		this.displayIpldDialog = true
	},
	async getApiProfile() {
		const getApiProfileResponse = await this.fgStorage.getApiProfile()
		if(!getApiProfileResponse || getApiProfileResponse.error)
			return
		this.$store.dispatch('main/setFgApiProfileDefaultDataLicense', getApiProfileResponse.result.data.default_data_license)
		this.$store.dispatch('main/setFgApiProfileName', getApiProfileResponse.result.data.name)
	}
}

const beforeUnmount = async function() {
}

export default {
	mixins: [
		language,
		navigate,
		copyToClipboard,
		cookie
	],
	components: {
		Header,
		LoadingBlocker,
		Contributor,
		InputText,
		DataTable,
		Column,
		Toast,
		Button,
		Dialog,
		VueJsonPretty
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
			signedDialogs: [],
			hasMySignature: {},
			indexingInterval: 5000,
			refresh: false,
			provenanceExist: {},
			displayIpldDialog: false,
			ipldDialog: {},
			displayContributorDialog: false,
			contributionCid: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
