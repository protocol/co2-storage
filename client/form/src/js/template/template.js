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
import determineTemplateTypeAndKeys from '@/src/mixins/ipfs/determine-template-type-and-keys.js'
import delay from '@/src/mixins/delay/delay.js'
import printError from '@/src/mixins/error/print.js'

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
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	},
	fgApiProfileDefaultDataLicense() {
		return this.$store.getters['main/getFgApiProfileDefaultDataLicense']
	},
	fgApiProfileName() {
		return this.$store.getters['main/getFgApiProfileName']
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
	cn() {
		this.$store.dispatch('main/setFgApiProfileName', this.cn)
		this.setCookie('contributor.storage.co2.token', this.cn, 365)
	},
	dl() {
		this.$store.dispatch('main/setFgApiProfileDefaultDataLicense', this.dl)
		this.setCookie('license.storage.co2.token', this.dl, 365)
	}
}

const mounted = async function() {
	await this.init()
}

const methods = {
	async init() {
		const that = this

		this.hasMySignature = {}

		const accounts = await this.accounts()
		if(accounts && accounts.length) {
			this.$store.dispatch('main/setSelectedAddress', accounts[0])
		}
		this.nonEthereumBrowserDetected = accounts == null

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

		this.cn = this.fgApiProfileName || this.getCookie('contributor.storage.co2.token')
		this.dl = this.fgApiProfileDefaultDataLicense || this.getCookie('license.storage.co2.token')
	},
	async setTemplate(cid) {
		const that = this

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

		try {
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
		} catch (error) {
			this.loading = false
			this.printError(error, 3000)
			return
		}

		this.loading = false

		if(addAssetResponse.error) {
			this.printError(addAssetResponse.error, 3000)
			return
		}

		this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.assets.asset-created'), life: 3000})

		let blockCid = addAssetResponse.result.block
		if(this.requireProvenance)
			await this.signRequest(blockCid)

		this.$router.push(`/asset/${blockCid}?provenance=${this.requireProvenance}&metadata=${this.requireMetadata}&thank-you=true`)
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
		this.loadingMessage = this.$t('message.shared.signing-message', {message: cid})
		this.loading = true
		try {
			await this.fgStorage.addProvenanceMessage(cid, this.cn,
				this.dl, this.notes, this.ipfsChainName)
			this.$toast.add({severity:'success', summary: this.$t('message.shared.signed'), detail: this.$t('message.shared.message-signed'), life: 3000})
			} catch (error) {
			this.loading = false
			this.printError(error, 3000)
		}
		this.loading = false
	},
	async doAuth() {
		try {
			const authenticated = await this.authenticate()
			if(authenticated.error)
				this.printError(authenticated.error, 3000)
		} catch (error) {
			this.printError(error, 3000)
		}
	},
	open(link) {
		window.open(link)
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
		determineTemplateTypeAndKeys,
		delay,
		printError
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
			requireMetadata: true,
			nonEthereumBrowserDetected: false
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
