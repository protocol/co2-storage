import ensureIpfsIsRunning from '@/src/mixins/ipfs/ensure-ipfs-is-running.js'
import { authentication } from '@/src/mixins/authentication/authentication.js'
import { fgStorage } from '@/src/mixins/ipfs/fg-storage.js'
import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import humanReadableFileSize from '@/src/mixins/file/human-readable-file-size.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'
import getToken from '@/src/mixins/api/get-token.js'
import { provenance } from '@/src/mixins/provenance/provenance.js'
import delay from '@/src/mixins/delay/delay.js'
import printError from '@/src/mixins/error/print.js'

import Header from '@/src/components/helpers/Header.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'
import Contributor from '@/src/components/helpers/Contributor.vue'

import InputText from 'primevue/inputtext'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import Dialog from 'primevue/dialog'

import VueJsonPretty from 'vue-json-pretty'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	await this.initFgStorage()

	// Ensure IPFS is running
	await this.ensureIpfsIsRunning(this.fgStorage)
}

const computed = {
	assetsClass() {
		return this.theme + '-assets-' + this.themeVariety
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
	ipfs() {
		return this.$store.getters['main/getIpfs']
	},
	selectedAddress() {
		return this.$store.getters['main/getSelectedAddress']
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
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	}
}

const watch = {
	fgApiToken: {
		handler() {
			this.fgStorage.fgApiToken = this.fgApiToken
		},
		deep: true,
		immediate:false
	},
	async templatesFullTextSearch() {
		this.templatesSearchOffset = 0
		await this.loadTemplates()
	},
	async assetsFullTextSearch() {
		this.assetsSearchOffset = 0
		await this.loadAssets()
	},
	json: {
		handler(state, before) {
			if(state)
				this.formElements = this.updateForm(this.json)
			
			// If schema content is deleted reset schema
			if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype)
				this.template = null
		},
		deep: true,
		immediate: false
	},
	async templateBlockCid() {
		const cid = this.templateBlockCid
		this.templatesSearchCid = null
		if(!cid)
			return
		this.templateData = await this.validateTemplate(cid)
		if(this.templateData.error) {
			this.printError(this.templateData.error, 3000)
			this.templateBlockCid = null
			this.loading = false
			return
		}

		if(this.ipfsChainName != this.templateData.result.indexChain) {
			this.templateBlockCid = null
			this.$store.dispatch('main/setIpfsChainName', this.templateData.result.indexChain)
			this.loading = false
			return
		}

		this.templatesSearchCid = this.templateData.result.cid
		this.templatesSearchOffset = 0
		this.templatesFilters.cid.value = this.templatesSearchCid
		await this.setTemplate(cid)
		await this.loadTemplates()
	},
	async assetBlockCid() {
		if(this.assetBlockCid != undefined)
			await this.getAsset(this.assetBlockCid)
	},
	async ipfsChainName() {
		await this.init()
	}
}

const mounted = async function() {
	await this.init()
}

const methods = {
	async init() {
		const that = this
		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		this.resetVars()
		this.hasMySignature = {}

		const routeParams = this.$route.params
		if(routeParams['cid'])
			this.assetBlockCid = routeParams['cid']

		const routeQuery = this.$route.query
		if(routeQuery['template']) {
			this.activeTab = 1
			this.templateBlockCid = routeQuery['template']
		}

		const accounts = await this.accounts()
		if(accounts && accounts.length)
			this.$store.dispatch('main/setSelectedAddress', accounts[0])
		
		await this.loadAssets()
		await this.loadTemplates()

		this.loading = false
	},
	// Retrieve templates
	async loadTemplates() {
		let templates
		try {
			const myTemplates = (await this.fgStorage.search(this.ipfsChainName, this.templatesFullTextSearch, 'template', this.templatesSearchCid, null, this.templatesSearchName, null, this.templatesSearchBase, null, null, this.templatesSearchCreator, null, null, null, null, null, this.templatesSearchOffset, this.templatesSearchLimit, this.templatesSearchBy, this.templatesSearchDir)).result
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

		// Load templates
		this.templates = templates
		this.templatesLoading = false
	},
	async templatesPage(ev) {
		this.templatesSearchLimit = ev.rows
		this.templatesSearchOffset = ev.page * this.templatesSearchLimit
		await this.loadTemplates()
	},
	async templatesFilter(ev) {
		this.templatesSearchOffset = 0
		this.templatesSearchCreator = ev.filters.creator.value
		this.templatesSearchBase = ev.filters.base.value
		this.templatesSearchName = ev.filters.name.value
		this.templatesSearchCid = ev.filters.cid.value
		await this.loadTemplates()
	},
	async templatesSort(ev) {
		this.templatesSearchOffset = 0
		this.templatesSearchBy = ev.sortField
		this.templatesSearchDir = (ev.sortOrder > 0) ? 'asc' : 'desc'
		await this.loadTemplates()
	},
	selectTemplate(cid) {
		this.templateBlockCid = cid
	},
	async setTemplate(cid) {
		const that = this

		this.templateSet = false
		this.formElementsWithSubformElements.length = 0
		this.newVersion = false
		this.isOwner = false

		if(this.templateData == null)
			this.templateData = await this.validateTemplate(cid)
		if(this.templateData.error) {
			this.printError(this.templateData.error, 3000)
			this.loading = false
			return
		}

		if(this.ipfsChainName != this.templateData.result.indexChain) {
			this.$store.dispatch('main/setIpfsChainName', this.templateData.result.indexChain)
			return
		}

		let template = this.templateData.result.template
		template = this.normalizeSchemaFields(template)
		const templateBlock = this.templateData.result.metadata

		this.json = JSON.parse(JSON.stringify(template))
		this.assetName = this.$t('message.assets.generic-asset-name', {template: templateBlock.name, wallet: (this.selectedAddress) ? this.selectedAddress : ''})
		this.template = cid

		this.$nextTick(() => {
			that.$refs.formElements.formElementsOccurrences = {}
			that.$refs.formElements.subformElements = {}
		})

		this.templateSet = true
	},
	// Retrieve assets
	async loadAssets() {
		let assets
		try {
			const myAssets = (await this.fgStorage.search(this.ipfsChainName, this.assetsFullTextSearch, 'asset', this.assetsSearchCid, null, this.assetsSearchName, null, this.assetsSearchBase, null, null, this.assetsSearchCreator, null, null, null, null, null, this.assetsSearchOffset, this.assetsSearchLimit, this.assetsSearchBy, this.assetsSearchDir)).result
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

		// Load assets
		this.assets = assets
		this.assetsLoading = false
	},
	async assetsPage(ev) {
		this.assetsSearchLimit = ev.rows
		this.assetsSearchOffset = ev.page * this.assetsSearchLimit
		await this.loadAssets()
	},
	async assetsFilter(ev) {
		this.assetsSearchOffset = 0
		this.assetsSearchCreator = ev.filters.creator.value
		this.assetsSearchName = ev.filters.name.value
		this.assetsSearchCid = ev.filters.cid.value
		await this.loadAssets()
	},
	async assetsSort(ev) {
		this.assetsSearchOffset = 0
		this.assetsSearchBy = ev.sortField
		this.assetsSearchDir = (ev.sortOrder > 0) ? 'asc' : 'desc'
		await this.loadAssets()
	},
	async addAsset() {
		const that = this
		
		this.loadingMessage = this.$t('message.assets.creating-asset')
		this.loading = true

		let addAssetResponse

		this.loading = true
		this.loadingMessage = `${that.$t('message.assets.uploading-images-and-documents')}`

		addAssetResponse = await this.fgStorage.addAsset(this.formElements,
			{
				parent: (this.newVersion) ? this.assetBlockCid : null,
				name: this.assetName,
				description: this.assetDescription,
				template: this.template.toString(),
				filesUploadStart: () => {
					that.loadingMessage = that.$t('message.assets.adding-images-and-documents-to-ipfs')
					that.loading = true
				},
				filesUpload: async (bytes, path, file) => {
					that.loadingMessage = `${that.$t('message.assets.adding-images-and-documents-to-ipfs')} - (${file.path}: ${that.humanReadableFileSize(bytes)})`
				},
				filesUploadEnd: () => {
					that.loading = false
				},
				waitingBacalhauJobStart: () => {
					that.loadingMessage = that.$t('message.assets.waiting-bacalhau-job-start')
					that.loading = true
				},
				bacalhauJobStarted: () => {
					that.loadingMessage = that.$t('message.assets.bacalhau-job-started')
					window.setTimeout(()=>{
						that.loading = false
					}, 3000)
				},
				createAssetStart: () => {
					that.loadingMessage = that.$t('message.assets.creating-asset')
					that.loading = true
				},
				createAssetEnd: () => {
					that.loading = false
				},
				error: (err) => {
					that.loadingMessage = that.$t('message.shared.error_', err.toString())
					window.setTimeout(()=>{
						that.loading = false
					}, 3000)
					return
				}
			},
			this.ipfsChainName,
			(response) => {
				if(response.status == 'uploading') {
					that.loading = true
					that.loadingMessage = `${that.$t('message.assets.uploading-images-and-documents')} - ${response.filename}: ${response.progress.toFixed(2)}%`
				}
				else {
					that.loading = false
				}
			}
		)

		setTimeout(async () => {
			this.activeTab = 0
			this.templatesSearchCid = null
			this.templatesFilters.cid.value = null
			that.templatesSearchOffset = 0
			await that.loadTemplates()
			this.assetsSearchCid = null
			this.assetsFilters.cid.value = null
			that.assetsSearchOffset = 0
			await that.loadAssets()
		}, this.indexingInterval)

		this.template = null
		this.loading = false

		this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.assets.asset-created'), life: 3000})

	},
	selectAsset(cid) {
		this.newVersion = false
		this.$router.push({ path: `/assets/${cid}` })
		this.assetBlockCid = cid
	},
	async getAsset(assetBlockCid) {
		try {
			this.loadingMessage = this.$t('message.assets.loading-asset')
			this.loading = true
	
			this.templateBlockCid = null

			try {
				const results = (await this.fgStorage.search(null, null, 'asset', assetBlockCid)).result
				if(!results.length || results[0].chain_name == undefined){
					this.printError(`Can not find asset ${assetBlockCid}`, 3000)
					this.loading = false
					this.loadingMessage = ''
					return
				}
			} catch (error) {
				this.printError(error, 3000)
				this.loading = false
				this.loadingMessage = ''
				return
			}
	
			let getAssetResponse
			try {
				getAssetResponse = await this.fgStorage.getAsset(assetBlockCid)
			} catch (error) {
				console.log(error)			
			}
	
			this.loading = false
	
			let asset = getAssetResponse.result.asset
			const assetBlock = getAssetResponse.result.assetBlock

			this.templateSet = false
			this.templateBlockCid = getAssetResponse.result.assetBlock.template.toString()
	
			const assetBlockVersion = assetBlock.version
			switch (assetBlockVersion) {
				case "1.0.0":
					asset = asset.data
					break
				case "1.0.1":
					// do nothing (it is raw asset already)
					break
				default:
					// consider it being version 1.0.0
					asset = asset.data
					break
			}
	
			this.isOwner = assetBlock.creator == this.selectedAddress
	
			this.assetName = assetBlock.name
			this.assetDescription = assetBlock.description
	
			this.loadingMessage = this.$t('message.assets.loading-asset')
			this.loading = true

			while(!this.formElements.length || !this.templateSet) {
				await this.delay(100)
			}
			await this._assignFormElementsValues(asset, this.formElements)

			this.assetsSearchCid = getAssetResponse.result.block
			this.assetsSearchOffset = 0
			this.assetsFilters.cid.value = this.assetsSearchCid
			this.loadAssets()
	
			this.loading = false
			this.loadingMessage = ''
		} catch (error) {
			this.printError(error, 3000)
			this.assetsSearchCid = null
			this.assetsSearchOffset = 0
			this.assetsFilters.cid.value = null
			this.loadAssets()
			this.loading = false
			this.loadingMessage = ''
		}
	},
	async _assignFormElementsValues(asset, formElements) {
		const that = this
		for await (let element of formElements) {
			const key = element.name
			const assetKeys = asset.map((a) => {return Object.keys(a)[0]})
			const assetValIndex = assetKeys.indexOf(key)
			const formElementsKeys = formElements.map((fe) => {return fe.name})
			const formElementsValIndex = formElementsKeys.indexOf(key)
			if(assetValIndex == -1 || formElementsValIndex == -1)
				continue
			
			if(element.type == 'Images' || element.type == 'Documents') {
				element.value = []
				const dfiles = asset[assetValIndex][key]
				if(dfiles != null)
					for await (const dfile of dfiles) {
						this.loadingMessage = this.$t('message.shared.loading-something', {something: dfile.path})

						const buffer = await this.fgStorage.getRawData(dfile.cid)

						element.value.push({
							path: dfile.path,
							content: buffer,
							existing: true,
							cid: dfile.cid
						})
					}
			}
			else if(element.type == 'BacalhauUrlDataset' || element.type == 'BacalhauCustomDockerJobWithUrlInputs'
				|| element.type == 'BacalhauCustomDockerJobWithCidInputs' || element.type == 'BacalhauCustomDockerJobWithoutInputs') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				for (const k in asset[assetValIndex][key]) {
					if (asset[assetValIndex][key].hasOwnProperty(k)) {
						element.value[k] = asset[assetValIndex][key][k]
					}
				}

				if(element.value.job_uuid && (!element.value.job_cid || (element.value.job_cid && element.value.job_cid.toLowerCase() == 'error'))) {
					this.bacalhauJobStatus(element.value.job_uuid, `${key}-${assetValIndex}`, element)
					this.intervalId[`${key}-${assetValIndex}`] = setInterval(this.bacalhauJobStatus, 5000, element.value.job_uuid, `${key}-${assetValIndex}`, element)
				}
			}
			else if(element.type == 'JSON') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset[assetValIndex][key]

				if(this.$refs.formElements.formElementsJsonEditorMode[element.name] == undefined)
					this.$refs.formElements.formElementsJsonEditorMode[element.name] = 'code'
				switch (this.$refs.formElements.formElementsJsonEditorMode[element.name]) {
					case 'code':
						this.$refs.formElements.formElementsJsonEditorContent[element.name] = {
							text: JSON.stringify(element.value),
							json: undefined
						}
						this.$refs.formElements.$refs[`jsonEditor-${element.name}`][0].setContent({"text": this.$refs.formElements.formElementsJsonEditorContent[element.name].text})
						break
					case 'tree':
						this.$refs.formElements.formElementsJsonEditorContent[element.name] = {
							json: JSON.parse(JSON.stringify(element.value)),
							text: undefined
						}
						this.$refs.formElements.$refs[`jsonEditor-${element.name}`][0].setContent({"json": this.$refs.formElements.formElementsJsonEditorContent[element.name].json})
						break
					default:
						console.log(`Unknown JSON editor mode '${this.$refs.formElements.formElementsJsonEditorMode[element.name]}'`)
						break
				}
			}
			else if(element.type == 'Template' || element.type == 'TemplateList') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				while(typeof formElements[formElementsValIndex].value != 'object') {
					await this.delay(100)
				}
				await this._assignFormElementsValues(asset[assetValIndex][key], formElements[formElementsValIndex].value)
			}
			else {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset[assetValIndex][key]
			}
		}
	},
	filesUploader(event) {
	},
	filesSelected(sync) {
		this.syncFormFiles(sync)
	},
	filesRemoved(sync) {
		this.syncFormFiles(sync)
	},
	fileRemoved(sync) {
		this.syncFormFiles(sync)
	},
	filesError(sync) {
	},
	async bacalhauJobStatus(jobUuid, intervalId, element) {
		const bacalhauJobStatusResponse = await this.fgStorage.bacalhauJobStatus(jobUuid)
		if(bacalhauJobStatusResponse.result.cid) {
			element.value.job_cid = bacalhauJobStatusResponse.result.cid
			element.value.message = bacalhauJobStatusResponse.result.message
			clearInterval(this.intervalId[intervalId])
		}
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
	},
	resetVars() {
		this.json = null
		this.formElements = []
		this.formElementsWithSubformElements = []
		this.templates = []
		this.templatesFilters = {
			'creator': {value: null, matchMode: FilterMatchMode.CONTAINS},
			'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
			'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
			'base': {value: null, matchMode: FilterMatchMode.CONTAINS}
		}
		this.templatesMatchModeOptions = [
			{label: 'Contains', value: FilterMatchMode.CONTAINS}
		]
		this.templatesLoading = true
		this.templatesSearchOffset = 0
		this.templatesSearchLimit = 3
		this.templatesSearchResults = 0
		this.templatesFullTextSearch = null
		this.templatesSearchName = null
		this.templatesSearchCid = null
		this.templatesSearchCreator = null
		this.templatesSearchBase = null
		this.templatesSearchBy = 'timestamp'
		this.templatesSearchDir = 'desc'
		this.template = null
		this.assets = []
		this.assetsFilters = {
			'creator': {value: null, matchMode: FilterMatchMode.CONTAINS},
			'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
			'name': {value: null, matchMode: FilterMatchMode.CONTAINS}
		}
		this.assetsMatchModeOptions = [
			{label: 'Contains', value: FilterMatchMode.CONTAINS}
		]
		this.assetsLoading = true
		this.assetsSearchOffset = 0
		this.assetsSearchLimit = 3
		this.assetsSearchResults = 0
		this.assetsFullTextSearch = null
		this.assetsSearchName = null
		this.assetsSearchCid = null
		this.assetsSearchCreator = null
		this.assetsSearchBy = 'timestamp'
		this.assetsSearchDir = 'desc'
		this.assetName = ''
		this.assetDescription = ''
		this.wallets = {}
		this.assetBlockCid = null
		this.templateBlockCid = null
		this.newVersion = false
		this.loading = false
		this.loadingMessage = ''
		this.activeTab = 0
		this.displaySignedDialog = false
		this.displaySignDialog = false
		this.signedDialogs = []
		this.formVisible = false
		this.isOwner = false
		this.refresh = false
		this.intervalId = {}
		this.provenanceExist = {}
		this.displayIpldDialog = false
		this.ipldDialog = {}
		this.hasMySignature = {}
		this.indexingInterval = 5000
		this.displayContributorDialog = false
		this.contributionCid = null
		this.templateData = null
	},
	async doAuth() {
		try {
			const authenticated = await this.authenticate()
			if(authenticated.error)
				this.printError(authenticated.error, 3000)
		} catch (error) {
			this.printError(error, 3000)
		}
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		ensureIpfsIsRunning,
		authentication,
		fgStorage,
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles,
		humanReadableFileSize,
		navigate,
		cookie,
		normalizeSchemaFields,
		getToken,
		provenance,
		delay,
		printError
	],
	components: {
		Header,
		FormElements,
		LoadingBlocker,
		Contributor,
		InputText,
		InputSwitch,
		Textarea,
		Button,
		Toast,
		DataTable,
		Column,
		TabView,
		TabPanel,
		Dialog,
		VueJsonPretty
	},
	directives: {
		Tooltip
	},
	name: 'Assets',
	data () {
		return {
			json: null,
			formElements: [],
			formElementsWithSubformElements: [],
			templates: [],
			templatesFilters: {
				'creator': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'base': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			templatesMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			templatesLoading: true,
			templatesSearchOffset: 0,
			templatesSearchLimit: 3,
			templatesSearchResults: 0,
			templatesFullTextSearch: null,
			templatesSearchName: null,
			templatesSearchCid: null,
			templatesSearchCreator: null,
			templatesSearchBase: null,
			templatesSearchBy: 'timestamp',
			templatesSearchDir: 'desc',
			template: null,
			assets: [],
			assetsFilters: {
				'creator': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			assetsMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			assetsLoading: true,
			assetsSearchOffset: 0,
			assetsSearchLimit: 3,
			assetsSearchResults: 0,
			assetsFullTextSearch: null,
			assetsSearchName: null,
			assetsSearchCid: null,
			assetsSearchCreator: null,
			assetsSearchBy: 'timestamp',
			assetsSearchDir: 'desc',
			assetName: '',
			assetDescription: '',
			wallets: {},
			assetBlockCid: null,
			templateBlockCid: null,
			newVersion: false,
			loading: false,
			loadingMessage: '',
			activeTab: 0,
			displaySignedDialog: false,
			displaySignDialog: false,
			signedDialogs: [],
			formVisible: false,
			isOwner: false,
			refresh: false,
			intervalId: {},
			provenanceExist: {},
			displayIpldDialog: false,
			ipldDialog: {},
			hasMySignature: {},
			indexingInterval: 5000,
			displayContributorDialog: false,
			contributionCid: null,
			templateData: null,
			templateSet: false
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
