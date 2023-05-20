import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import humanReadableFileSize from '@/src/mixins/file/human-readable-file-size.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'
import determineTemplateTypeAndKeys from '@/src/mixins/ipfs/determine-template-type-and-keys.js'

import Header from '@/src/components/helpers/Header.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import InputText from 'primevue/inputtext'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import Dialog from 'primevue/dialog'

import VueJsonPretty from 'vue-json-pretty'

import { FGStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

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
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	fgApiToken() {
		return this.$store.getters['main/getFgApiToken']
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
		await this.init()
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
//				console.log(error)
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

		const routeParams = this.$route.params
		const queryParams = this.$route.query

		if(queryParams['provenance'] != undefined && queryParams['provenance'].toLowerCase() == 'false')
			this.requireProvenance = false

		if(queryParams['metadata'] != undefined && queryParams['metadata'].toLowerCase() == 'false')
			this.requireMetadata = false

		if(routeParams['cid']) {
			this.template = routeParams['cid']
			this.setTemplate(this.template)
		}
		else {
			this.validatedTemplate = true
			this.template = null
		}
	},
	async setTemplate(cid) {
		const that = this

		this.formElementsWithSubformElements.length = 0
		let templateResponse
		try {
			templateResponse = (await this.fgStorage.getTemplate(cid)).result
		} catch (error) {
			this.validatedTemplate = true
			this.template = null
			return
		}

		let template = templateResponse.template
		const templateTypeAndKeys = this.determineTemplateTypeAndKeys(template)
		const templateType = templateTypeAndKeys.templateType
		const templateKeys = templateTypeAndKeys.templateKeys
		const key = templateKeys[0]
		const index = 0

		if(key == undefined) {
			this.validatedTemplate = true
			this.template = null
			return
		}

		switch (templateType) {
			case 'list_of_lists':
			case 'list_of_objects':
				if(templateType == 'list_of_lists') {
					if(template[index][1].type == undefined) {
						this.validatedTemplate = true
						this.template = null
						return
					}
				}
				else if(templateType == 'list_of_objects') {
					if(template[index][key].type == undefined) {
						this.validatedTemplate = true
						this.template = null
						return
					}
				}
				break
			default:
				if(template[key].type == undefined) {
					this.validatedTemplate = true
					this.template = null
					return
				}
		}

		try {
			const results = (await this.fgStorage.search(null, null, 'template', cid)).result
			if(!results.length || results[0].chain_name == undefined) {
				this.validatedTemplate = true
				this.template = null
				return
			}
			this.$store.dispatch('main/setIpfsChainName', results[0].chain_name)
		} catch (error) {
			this.validatedTemplate = true
			this.template = null
			return
		}

		this.validatedTemplate = true

		template = this.normalizeSchemaFields(template)
		this.json = JSON.parse(JSON.stringify(template))

		const templateBlock = templateResponse.templateBlock
		this.templateName = templateBlock.name
		this.templateDescription = templateBlock.description
		this.assetName = this.$t('message.assets.generic-asset-name', {template: this.templateName, wallet: this.selectedAddress})
		this.template = cid

		this.$nextTick(() => {
			try {
				that.$refs.formElements.formElementsOccurrences = {}
				that.$refs.formElements.subformElements = {}
			} catch (error) {
				
			}
		})
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
				parent: null,
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

console.log(addAssetResponse)
		this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.assets.asset-created'), life: 3000})
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
	async signRequest(cid) {
		this.loadingMessage = this.$t('message.shared.loading-something', {something: "..."})
		this.loading = true
		try {
			let response = await this.fgStorage.addProvenanceMessage(cid, cn,
				dl, notes, this.ipfsChainName)
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
		this.loading = false
	},
	async loadSignatures(cid) {
		let entities = await this.provenanceMessages(cid)
		if(entities.error)
			return

		this.signedDialogs.length = 0

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
			entity.reference = entity.cid
			await this.printSignature(entity)
			return
		}

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
		normalizeSchemaFields,
		determineTemplateTypeAndKeys
	],
	components: {
		Header,
		FormElements,
		LoadingBlocker,
		InputText,
		InputSwitch,
		Textarea,
		Dropdown,
		Button,
		Toast,
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
			template: null,
			validatedTemplate: false,
			assetName: '',
			assetDescription: '',
			loading: false,
			loadingMessage: '',
			intervalId: {},
			provenanceExist: {},
			hasMySignature: {},
			templateName: null,
			templateDescription: null,
			licenseOptions: [
				"CC0 (No Rights Reserved, Public Domain)",
				"CC-BY (Attribution)",
				"CC BY-SA (Attribution-ShareAlike)",
				"CC BY-NC (Attribution-NonCommercial)",
				"Reserved"
			],
			cn: null,
			dl: null,
			notes: null,
			requireProvenance: true,
			requireMetadata: true
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
