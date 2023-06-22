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
import { RFC_2822 } from 'moment'

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
			this.functionCid = routeParams['cid']
			this.findFunctionByCid(this.functionCid)
		}
		else {
			this.noFunction = true
			this.template = null
		}

		this.cn = this.fgApiProfileName || this.getCookie('contributor.storage.co2.token')
		this.dl = this.fgApiProfileDefaultDataLicense || this.getCookie('license.storage.co2.token')
	},
	async findFunctionByCid(functionCid) {
console.log(functionCid)
		let results = []
		try {
			results = (await this.fgStorage.searchFunctions(null, null, null, null, null, functionCid)).result
console.log(results)
			if(!results.length) {
				this.noFunction = true
				this.template = null
				return
			}
		} catch (error) {
			this.noFunction = true
			this.template = null
			return
		}

		// Set function definition object
		this.functionDefinition = results[0]

		// Set the function container value
		this.functionContainer = this.functionDefinition.function_container

		// Check for function inputs
		await this.checkFunctionInputs(this.functionDefinition)
	},
	async checkFunctionInputs(fnct) {
		// Get function name
		this.functionName = fnct.name
		this.functionInputTypes = fnct.input_types
		this.functionOutputTypes = fnct.output_types

		if(!this.functionInputTypes || !this.functionInputTypes.length) {
			this.noInputs = true
			this.template = null
			return
		}

		// For travel decarbonization demo we use
		// a function which has one input type
		await this.setTemplate(this.functionInputTypes[0])
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
						}, this.errorMessageReadingInterval)
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
						}, this.errorMessageReadingInterval)
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
			this.printError(error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		if(addAssetResponse.error) {
			this.printError(addAssetResponse.error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.assets.asset-created'), life: this.successMessageReadingInterval})

		let blockCid = addAssetResponse.result.block

		this.loadingMessage = this.$t('message.travel-decarbonization.signing-input-travel-data')
		this.loading = true
		const inputSigned = await this.signRequest(blockCid)
		if (!inputSigned) {
			this.printError(this.$t('message.travel-decarbonization.must-sign-input-travel-data'), this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		// Prepare inputs for running the Bacalhau job
		this.loadingMessage = this.$t('message.travel-decarbonization.preparing-job')
		this.loading = true
		let jobInputCid
		try {
			jobInputCid = (await this.fgStorage.prepareBacalhauJobInputs(blockCid)).result
		} catch (error) {
			this.printError(error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}
console.log(jobInputCid)
		this.loadingMessage = this.$t('message.travel-decarbonization.running-job')
		this.loading = true
		let runFunctionResponse
		try {
			runFunctionResponse = await this.runFunction(jobInputCid, this.functionDefinition)
		} catch (error) {
			this.printError(error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		this.$toast.add({severity:'success', summary: this.$t('message.travel-decarbonization.started'), detail: this.$t('message.travel-decarbonization.job-started', {uuid: runFunctionResponse.result.job_uuid}), life: this.successMessageReadingInterval})

		this.intervalId[runFunctionResponse.result.job_uuid] = setInterval(this.bacalhauJobStatus, 1000, runFunctionResponse.result.job_uuid, blockCid)
	},
	async runFunction(jobInputCid, functionDefinition) {
		const type = functionDefinition.function_type
		const parameters = (functionDefinition.parameters) ? functionDefinition.parameters : ''
		const inputs = [`ipfs://${jobInputCid}`]
		const container = functionDefinition.function_container
		const commands = (functionDefinition.commands) ? functionDefinition.commands : ''
		let swarm = []
		if(functionDefinition.swarm) {
			swarm = functionDefinition.swarm.split(',')
			for (let swarmItem of swarm) {
				swarmItem = swarmItem.trim()
			}
		}

		return await this.fgStorage.runBacalhauJob(type, parameters, inputs, container, commands, swarm)
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
	async bacalhauJobStatus(jobUuid, assetCid) {
		const bacalhauJobStatusResponse = await this.fgStorage.bacalhauJobStatus(jobUuid)
		if(bacalhauJobStatusResponse.result.cid || bacalhauJobStatusResponse.result.message)
			await this.jobDone(jobUuid, bacalhauJobStatusResponse, assetCid)
	},
	async jobDone(jobUuid, bacalhauJobStatusResponse, assetCid) {
		clearInterval(this.intervalId[jobUuid])
		if(bacalhauJobStatusResponse.result.cid == 'Error' || bacalhauJobStatusResponse.result.cid == 'Cancelled') {
			this.printError(this.$t('message.travel-decarbonization.job-error'), {reason: bacalhauJobStatusResponse.result.message}, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
		}

		await this.createOutput(bacalhauJobStatusResponse.result.cid, assetCid)
	},
	async createOutput(jobCid, assetCid) {
		const outputAsset = [{
			name: "Output",
			value: jobCid
		}]
		let outputAssetResponse
		try {
			outputAssetResponse = await this.fgStorage.addAsset(outputAsset,
				{
					parent: null,
					name: this.$t('message.travel-decarbonization.asset-created-with', {functionName: this.functionName, createdBy: this.selectedAddress, createdFrom: assetCid}),
					description: this.functionDefinition.description,
					// Decarbonize travel function has one output type
					// BUT THIS NEEDS TO BE CHANGED WITH INTERIM / SERIAL OUTPUT TEMPLATE
					template: this.functionOutputTypes[0]
				},
				this.ipfsChainName
			)
		} catch (error) {
			this.printError(error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		if(outputAssetResponse.error) {
			this.printError(outputAssetResponse.error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}
console.log(outputAssetResponse)
		this.loading = false
		this.$router.push(`/asset/${assetCid}?provenance=true&metadata=false`)
	},
	async signRequest(cid) {
		this.loadingMessage = this.$t('message.shared.signing-message', {message: cid})
		this.loading = true
		try {
			this.cn = this.formElements[0].value
		} catch (error) {
			console.error(error)
		}
		if(!this.notes)
			this.notes = this.$t('message.travel-decarbonization.i-verify')
		try {
			await this.fgStorage.addProvenanceMessage(cid, this.cn,
				this.dl, this.notes, this.ipfsChainName)
			this.$toast.add({severity:'success', summary: this.$t('message.shared.signed'), detail: this.$t('message.shared.message-signed'), life: this.successMessageReadingInterval})
		}
		catch (error) {
			this.loading = false
			this.printError(error, this.errorMessageReadingInterval)
			return false
		}
		this.loading = false
		return true
	},
	async doAuth() {
		try {
			const authenticated = await this.authenticate()
			if(authenticated.error)
				this.printError(authenticated.error, this.errorMessageReadingInterval)
		} catch (error) {
			this.printError(error, this.errorMessageReadingInterval)
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
			functionCid: null,
			functionContainer: null,
			functionDefinition: null,
			functionName: '',
			template: null,
			noFunction: false,
			noInputs: false,
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
			nonEthereumBrowserDetected: false,
			errorMessageReadingInterval: 5000,
			successMessageReadingInterval: 5000,
			intervalId: {},
			functionInputTypes: null,
			functionOutputTypes: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
