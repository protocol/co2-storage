import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import humanReadableFileSize from '@/src/mixins/file/human-readable-file-size.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'

import Header from '@/src/components/helpers/Header.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

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
	templatesClass() {
		return this.theme + '-templates-' + this.themeVariety
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
	co2StorageIpfsNodeType() {
		return this.$store.getters['main/getCO2StorageIpfsNodeType']
	},
	co2StorageIpfsNodeAddr() {
		return this.$store.getters['main/getCO2StorageIpfsNodeAddr']
	},
	fgApiUrl() {
		return this.$store.getters['main/getFgApiUrl']
	},
	ipfs() {
		return this.$store.getters['main/getIpfs']
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
	async selectedAddress(current, before) {
		if(this.selectedAddress == null) {
			this.$router.push({ path: '/' })
			return
		}

		if(before != null)
			await this.init()
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
	async assetBlockCid() {
		if(this.assetBlockCid != undefined)
			await this.getAsset(this.assetBlockCid)
	},
	async refresh() {
		if(this.refresh)
			await this.init()
		this.refresh = false
	}
}

const mounted = async function() {
	await this.init()
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
		const that = this

		this.hasMySignature = {}

		window.setTimeout(async () => {
			await that.loadAssets()
			await that.loadTemplates()
		}, 0)
	
		const routeParams = this.$route.params
		if(routeParams['cid'])
			this.assetBlockCid = routeParams['cid']

		const routeQuery = this.$route.query
		if(routeQuery['template']) {
			this.activeTab = 1
			this.setTemplate({data: {block: routeQuery['template']}})
		}
	},
	// Retrieve templates
	async loadTemplates() {
		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		let templates
		try {
			const myTemplates = (await this.fgStorage.search(this.ipfsChainName, this.templatesFullTextSearch, 'template', this.templatesSearchCid, null, this.templatesSearchName, null, this.templatesSearchBase, null, null, this.templatesSearchCreator, null, null, null, this.templatesSearchOffset, this.templatesSearchLimit, this.templatesSearchBy, this.templatesSearchDir)).result
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
	async setTemplate(row) {
		const that = this

		this.formElementsWithSubformElements.length = 0
		this.newVersion = false
		this.isOwner = false
		const block = row.data.block.toString()
		let templateResponse
		try {
			templateResponse = (await this.fgStorage.getTemplate(block)).result
		} catch (error) {
			console.log(error)
		}

		let template = templateResponse.template
		template = this.normalizeSchemaFields(template)
		const templateBlock = templateResponse.templateBlock

		this.json = JSON.parse(JSON.stringify(template))
		this.assetName = this.$t('message.assets.generic-asset-name', {template: templateBlock.name, wallet: this.selectedAddress})
		this.template = block

		this.$nextTick(() => {
			that.$refs.formElements.formElementsOccurrences = {}
			that.$refs.formElements.subformElements = {}
		})
	},
	// Retrieve assets
	async loadAssets() {
		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		let assets
		try {
			const myAssets = (await this.fgStorage.search(this.ipfsChainName, this.assetsFullTextSearch, 'asset', this.assetsSearchCid, null, this.assetsSearchName, null, this.assetsSearchBase, null, null, this.assetsSearchCreator, null, null, null, this.assetsSearchOffset, this.assetsSearchLimit, this.assetsSearchBy, this.assetsSearchDir)).result
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

		this.loading = false

		this.assetBlockCid = addAssetResponse.result.block
		this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.assets.asset-created'), life: 3000})
	},
	selectAsset(cid) {
		this.newVersion = false
		this.$router.push({ path: `/assets/${cid}` })
		this.assetBlockCid = cid
	},
	async getAsset(assetBlockCid) {
		this.loadingMessage = this.$t('message.assets.loading-asset')
		this.loading = true

		let getAssetResponse
		try {
			getAssetResponse = await this.fgStorage.getAsset(assetBlockCid)
		} catch (error) {
			console.log(error)			
		}

		this.loading = false

		let asset = getAssetResponse.result.asset
		const assetBlock = getAssetResponse.result.assetBlock
		const templateBlockCid = getAssetResponse.result.assetBlock.template.toString()

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

		this.loadingMessage = this.$t('message.schemas.loading-schema')
		this.loading = true

		let getTemplateResponse
		try {
			getTemplateResponse = await this.fgStorage.getTemplate(templateBlockCid)
		} catch (error) {
			console.log(error)			
		}
		await this.setTemplate({"data": getTemplateResponse.result})
		
		this.loading = false

		this.isOwner = assetBlock.creator == this.selectedAddress

		this.assetName = assetBlock.name
		this.assetDescription = assetBlock.description

		this.loadingMessage = this.$t('message.assets.loading-asset')
		this.loading = true

		await this._assignFormElementsValues(asset, this.formElements)

		this.loading = false
		this.loadingMessage = ''
	},
	async _assignFormElementsValues(asset, formElements) {
		const that = this
		for await (let element of formElements) {
			const key = element.name
			const keys = asset.map((a) => {return Object.keys(a)[0]})
			const valIndex = keys.indexOf(key)

			if(valIndex == -1)
				continue
			
			if(element.type == 'Images' || element.type == 'Documents') {
				element.value = []
				const dfiles = asset[valIndex][key]
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
				for (const k in asset[valIndex][key]) {
					if (asset[valIndex][key].hasOwnProperty(k)) {
						element.value[k] = asset[valIndex][key][k]
					}
				}

				if(element.value.job_uuid && (!element.value.job_cid || (element.value.job_cid && element.value.job_cid.toLowerCase() == 'error'))) {
					this.bacalhauJobStatus(element.value.job_uuid, `${key}-${valIndex}`, element)
					this.intervalId[`${key}-${valIndex}`] = setInterval(this.bacalhauJobStatus, 5000, element.value.job_uuid, `${key}-${valIndex}`, element)
				}
			}
			else if(element.type == 'JSON') {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset[valIndex][key]

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
				setTimeout(async() => {
					await that._assignFormElementsValues(asset[valIndex][key], formElements[valIndex].value)
				}, 500)
			}
			else {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset[valIndex][key]
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
	async printSignature(entity) {
		this.signedDialog = entity
		this.displaySignedDialog = true
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		const verifyCidSignatureResponse = await this.fgStorage.verifyCidSignature(entity.signature_account,
			entity.signature_cid, entity.signature_v, entity.signature_r, entity.signature_s)
		this.signedDialog.verified = verifyCidSignatureResponse.result
		this.loading = false
	},
	async bacalhauJobStatus(jobUuid, intervalId, element) {
		const bacalhauJobStatusResponse = await this.fgStorage.bacalhauJobStatus(jobUuid)
		if(bacalhauJobStatusResponse.result.cid) {
			element.value.job_cid = bacalhauJobStatusResponse.result.cid
			element.value.message = bacalhauJobStatusResponse.result.message
			clearInterval(this.intervalId[intervalId])
		}
	},
	async sign(cid){
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		try {
			let response = await this.fgStorage.signCid(cid, this.ipfsChainName)
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
			await that.loadTemplates()
			that.assetsSearchOffset = 0
			await that.loadAssets()
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
			const provenanceMessage = await this.fgStorage.getDag(entity.cid)
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
		this.hasMySignature[entity.signature_cid] = this.hasMySignature[entity.signature_cid] || (entity.signature_account == this.selectedAddress)
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
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles,
		humanReadableFileSize,
		navigate,
		cookie,
		normalizeSchemaFields
	],
	components: {
		Header,
		FormElements,
		LoadingBlocker,
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
			selectedAddress: null,
			walletError: null,
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
			indexingInterval: 5000
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
