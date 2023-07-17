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

import { regen, getSigningRegenClient } from '@regen-network/api'
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing'

// Source: https://www.epa.gov/system/files/documents/2023-05/420f23014.pdf
const DRIVING_EMISSIONS_AVERAGE_INTENSITY = 400.00 // g/mile

// Source https://theicct.org/wp-content/uploads/2021/06/ICCT_CO2-commercl-aviation-2018_20190918.pdf
const FLYING_EMISSIONS_AVERAGE_INTENSITY_LOW_MILES = 251.0576609  // g/mile
const FLYING_EMISSIONS_AVERAGE_INTENSITY_HIGH_MILES = 136.7942383 // g/mile
const LOW_DISTANCE_BOUNDARY = 609.5651472                         // miles

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
	fgWebUrl() {
		return this.$store.getters['main/getFgWebUrl']
	},
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	},
	fgApiProfileDefaultDataLicense() {
		return this.$store.getters['main/getFgApiProfileDefaultDataLicense']
	},
	fgApiProfileName() {
		return this.$store.getters['main/getFgApiProfileName']
	},
	regenRpcEndpoint() {
		return this.$store.getters['main/getRegenRpcEndpoint']
	},
	regenRestEndpoint() {
		return this.$store.getters['main/getRegenRestEndpoint']
	},
	regenRegistryServer() {
		return this.$store.getters['main/getRegenRegistryServer']
	},
	defaultFunction() {
		return this.$store.getters['main/getDefaultFunction']
	},
	canRun() {
		const needed = [0, 1, 2, 3, 5, 6]
		let result = true
		for (let i = 0; i < needed.length; i++) {
			const element = needed[i];
			result = result && this.formElements[element].value != undefined && this.formElements[element].value != ''
		}
		return result
	},
	f0() {
		return (this.formElements[0]) ? this.formElements[0].value : ''
	},
	f1() {
		return (this.formElements[1]) ? this.formElements[1].value : ''
	},
	f4() {
		return (this.formElements[4]) ? this.formElements[4].value : ''
	},
	f5() {
		return (this.formElements[5]) ? this.formElements[5].value : 0.00
	},
	f6() {
		return (this.formElements[6]) ? this.formElements[6].value : 0.00
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
	},
	f0() {
		this.formElements[9].value = `Event ${this.f1} travel decarbonization for ${this.f0}.`
		this.assetName = `Event ${this.f1} travel decarbonization for ${this.f0}.`
	},
	f1() {
		this.formElements[9].value = `Event ${this.f1} travel decarbonization for ${this.f0}.`
		this.assetName = `Event ${this.f1} travel decarbonization for ${this.f0}.`
	},
	f4() {
		this.assetDescription = this.f4
	},
	f5() {
		if(this.f5>0 && this.f6>0)
			this.formElements[8].value = Math.ceil(this.calculateOffsetAmount()/1000)*1000
	},
	f6() {
		if(this.f5>0 && this.f6>0)
			this.formElements[8].value = Math.ceil(this.calculateOffsetAmount()/1000)*1000
	}
}

const mounted = async function() {
	await this.init()
}

const methods = {
	async init() {
		const that = this
/*
const addFunctionResponse = await this.fgStorage.addFunction(
	'Travel Decarbonization Function v0',
	'Simple travel decarbonization algorithm based on following emissions calculation model https://docs.google.com/spreadsheets/d/1thLhacDWWOpC4Nf21FBoGvihVUMPmTUAbili-1ZysSk/edit#gid=0',
	'bacalhau wasm', 'bafybeic7f2e4lmfkbnn2o677p5aayuf3wq47yqlli5dcoh6sn2vdwnyaea',
	['bafyreic3dwoar3bm2bbuxtwcfio2mffr7yeqdcw2u4advtydsakehzo5xm'],
	['bafyreidwk556gyi2aulqxcitaity2a4pwn67mrmjtnr5qt4unm3hmwrm5m'],
	'main', '', 'decarbonize.travel')
console.log(addFunctionResponse)
//https://decarbonize.travel/bafyreigamkgxinaphtivvgapfg7qbe4do4innzporgphuzszyuvohw5ygu?provenance=false&metadata=false
*/
/*
const addFunctionResponse = await this.fgStorage.addFunction(
	'Travel Decarbonization Function v1',
	'Simple travel decarbonization algorithm using automated offset amount calculation and credits purchase',
	'bacalhau wasm', 'bafybeidmbiy2eo7azv3pstq5dcik4ma4cgkhbzubfbpocqo7j2kply5ok4',
	['bafyreieavkw3aoidtedsewyzjzzl55wvqqbsbrvyx2szc5i75qwgwuhhsy'],
	['bafyreihlwbzs4zdge6d4u3q5f3s7niljtppkyxxcc43nka3pe4bpvta34q'],
	'main', '', 'decarbonize.travel')
console.log(addFunctionResponse)
//https://decarbonize.travel/bafyreiezzybzqcxodiyhxqpjj42c4bnhnsr6ut56ezwdio673ulku7xeka?provenance=false&metadata=false
*/
/*
const addFunctionResponse = await this.fgStorage.addFunction(
	'Travel Decarbonization Function v0',
	'Simple travel decarbonization algorithm based on following emissions calculation model https://docs.google.com/spreadsheets/d/1thLhacDWWOpC4Nf21FBoGvihVUMPmTUAbili-1ZysSk/edit#gid=0',
	'bacalhau wasm', 'bafybeic7f2e4lmfkbnn2o677p5aayuf3wq47yqlli5dcoh6sn2vdwnyaea',
	['bafyreiasxxmzh3ccjcbrphjvudvpfr6vbh5gwpfdwx22iju2pfe43buvyy'],
	['bafyreiejy2c3swn5sdz4p2q3v46ugnvgss63qqkk3ee4vuurdo3yov63hy'],
	'main', '', 'decarbonize.travel')
console.log(addFunctionResponse)
//http://localhost:3002/bafyreic672rvly3wwjx3qlxxlwdeynblomzived6snpnauf6wxyll6znq4?provenance=false&metadata=false
*/
/*
const addFunctionResponse = await this.fgStorage.addFunction(
	'Travel Decarbonization Function v1',
	'Simple travel decarbonization algorithm using automated offset amount calculation and credits purchase',
	'bacalhau wasm', 'bafybeidmbiy2eo7azv3pstq5dcik4ma4cgkhbzubfbpocqo7j2kply5ok4',
	['bafyreib3jibpigbypv4g4az5a7ossdtxxmduofk2z53owx24oyvyjafrt4'],
	['bafyreidubw5qjfhmj5lbn3favjtvbuexlgv4qcwodz2ds3hjjtjdzjgbxu'],
	'main', '', 'decarbonize.travel')
console.log(addFunctionResponse)
//http://localhost:3002/bafyreidcgdgby4gnuygpcpaglhfclsw4szwic5ob2dbcwvlqpagr7xyb2i?provenance=false&metadata=false
*/
		this.hasMySignature = {}

		const accounts = await this.accounts()
		if(accounts && accounts.length) {
			this.$store.dispatch('main/setSelectedAddress', accounts[0])
		}
		this.nonEthereumBrowserDetected = accounts == null

		const routeParams = this.$route.params
		const queryParams = this.$route.query

		if(queryParams['provenance'] != undefined && queryParams['provenance'].toLowerCase() == 'true')
			this.requireProvenance = true

		if(queryParams['metadata'] != undefined && queryParams['metadata'].toLowerCase() == 'true')
			this.requireMetadata = true

		if(routeParams['cid']) {
			this.functionCid = routeParams['cid']
		}
		else {
			this.functionCid = this.defaultFunction
		}
		this.findFunctionByCid(this.functionCid)

		this.cn = this.fgApiProfileName || this.getCookie('contributor.storage.co2.token')
		this.dl = this.fgApiProfileDefaultDataLicense || this.getCookie('license.storage.co2.token')
	},
	async findFunctionByCid(functionCid) {
		let results = []
		try {
			results = (await this.fgStorage.searchFunctions(null, null, null, null, null, functionCid)).result
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
		if(!this.assetName.length)
			this.assetName = this.$t('message.travel-decarbonization.event-asset-name', {template: this.templateName, wallet: this.selectedAddress})
		this.template = cid

		this.$nextTick(() => {
			try {
				that.$refs.formElements.formElementsOccurrences = {}
				that.$refs.formElements.subformElements = {}
			} catch (error) {
				
			}
		})
	},
	calculateOffsetAmount() {
		let drivingEmissions = 0.00
		let flyingEmissions = 0.00
		let totalEmissions = 0.00
	
		// Check input parameters
		let oneWayDrivingDistance = this.formElements[5].value
		let oneWayFlyingDistance = this.formElements[6].value
		if (oneWayDrivingDistance <= 0 && oneWayFlyingDistance <= 0) {
			const message = "Either One way driving distance or One way flying distance (or both) must be greater than zero!"
			this.printError(message, this.errorMessageReadingInterval)
			return null
		}
	
		// Calculate driving emissions
		if (oneWayDrivingDistance > 0) {
			drivingEmissions = (oneWayDrivingDistance * 2 * DRIVING_EMISSIONS_AVERAGE_INTENSITY) / 1000
		}
	
		// Calculate driving emissions
		if (oneWayFlyingDistance > 0) {
			if (oneWayFlyingDistance <= LOW_DISTANCE_BOUNDARY) {
				flyingEmissions = (oneWayFlyingDistance * 2 * FLYING_EMISSIONS_AVERAGE_INTENSITY_LOW_MILES) / 1000
			} else {
				flyingEmissions = (oneWayFlyingDistance * 2 * FLYING_EMISSIONS_AVERAGE_INTENSITY_HIGH_MILES) / 1000
			}
		}
	
		// Calculate total emissions
		totalEmissions = drivingEmissions + flyingEmissions

		return totalEmissions
	},
	async buyOffsets(emissions, token) {
		try {
			let sellOrder
			const metricTons = Math.ceil(emissions/1000)

			// Select and enable chain
			const chainId = "regen-1"
//			await window.keplr.enable(chainId)

			// Get signer
//			const signer = window.getOfflineSigner(chainId)
			let cosmosPk = process.env.COSMOS_PK
			const signer1 = await DirectSecp256k1Wallet.fromKey(this.fromHexString(cosmosPk), 'regen')

			// Fetch the balance of the signer address.
			const [firstAccount] = await signer1.getAccounts()
			const myAddress = firstAccount.address

			// Offset chain
			this.formElements[7].value = chainId

			// Offset amount
			this.formElements[8].value = metricTons * 1000

			// Offset description
			this.formElements[9].value = `Event ${this.formElements[1].value} travel decarbonization for ${this.formElements[0].value}.`

			// Create regen LCDC client
			const { createLCDClient } = regen.ClientFactory
			const lcdcClient = await createLCDClient({ restEndpoint: this.regenRestEndpoint })

			// Search sell orders, regen
			let sellOrders = (await lcdcClient.regen.ecocredit.marketplace.v1.sellOrders()).sell_orders
			sellOrders = sellOrders.filter((so)=>{return so.ask_denom == token && so.quantity >= metricTons})
			sellOrders.sort((a, b) => {return parseFloat(a.ask_amount) - parseFloat(b.ask_amount)})
			if(!sellOrders.length) {
				const message = `Can find sell order with required offset amount "${emissions}"`
				this.printError(message, this.errorMessageReadingInterval)
				return null
			}
			sellOrder = sellOrders[0]

			// Get project details for the selected sell order
			const offsetProjectIdChunks = sellOrder.batch_denom.split('-')
			const offsetProjectId = [offsetProjectIdChunks[0], offsetProjectIdChunks[1]].join('-')
			let offsetProject = await lcdcClient.regen.ecocredit.v1.project({projectId: offsetProjectId})
			sellOrder.project = offsetProject

			// Initialize signing client
			const signingClient = await getSigningRegenClient({
				rpcEndpoint: this.regenRpcEndpoint,
			//	signer: signer,
				signer: signer1,
			})

			const buyDirect = regen.ecocredit.marketplace.v1.MessageComposer.withTypeUrl.buyDirect({
				buyer: myAddress,
				orders: [
					{
						sellOrderId: sellOrder.id,
						quantity: metricTons.toString(),
						bidPrice: {
							denom: token,
							amount: sellOrder.ask_amount
						},
						disableAutoRetire: false,
						retirementJurisdiction: sellOrder.project.project.jurisdiction,
						retirementReason: this.formElements[9].value
					}
				]
			})

			// Define default fee
			const fee = {
				amount: [
					{
					denom: 'uregen',
					amount: '5000',
					},
				],
				gas: '150000',
			}
	
			let response
			// Sign and broadcast transaction that includes message
			await signingClient
				.signAndBroadcast(myAddress, [buyDirect], fee)
				.then((r)=>{response = {
					error: null,
					result: r
				}})
				.catch((e)=>{response = {
					error: e,
					result: null
				}})
	
			return response
		} catch (error) {
			this.printError(error, this.errorMessageReadingInterval)
			return null
		}
	},
	async addAsset() {
		const that = this
		
		this.loadingMessage = this.$t('message.travel-decarbonization.calculating-offset-amount')
		this.loading = true

		const totalEmissions = this.calculateOffsetAmount()
		if(totalEmissions == null) {
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		this.loadingMessage = this.$t('message.travel-decarbonization.buying-offsets', {amount: Math.ceil(totalEmissions/1000)})

		const response = await this.buyOffsets(totalEmissions, 'uregen')
		if(response.error != null) {
			this.printError(response.error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		if(response.result.code != 0) {
			this.printError(response.error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		// Get transaction hash
		this.formElements[10].value = response.result.transactionHash

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

		this.inputs.push(blockCid)

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
		let outputAsset = [
			{
				name: "Offset Chain",
				value: new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Offset Chain`))[0])
			},
			{
				name: "Emissions Description",
				value: new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Emissions Description`))[0])
			},
			{
				name: "Offset Transaction Hash",
				value: new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Offset Transaction Hash`))[0])
			},
			{
				name: "Offset Amount (kg CO2e)",
				value: parseFloat(new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Offset Amount (kg CO2e)`))[0]))
			},
			{
				name: "Driving Emissions (kg CO2)",
				value: parseFloat(new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Driving Emissions (kg CO2)`))[0]))
			},
			{
				name: "Flying Emissions (kg CO2)",
				value: parseFloat(new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Flying Emissions (kg CO2)`))[0]))
			},
			{
				name: "Total Emissions (kg CO2)",
				value: parseFloat(new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Total Emissions (kg CO2)`))[0]))
			},
			{
				name: "Net Zero",
				value: (new TextDecoder().decode((await this.fgStorage.getRawDataWithPath(`${jobCid}/outputs/Net Zero`))[0])).toLowerCase() === "true"
			}
		]

		let outputAssetResponse
		try {
			outputAssetResponse = await this.fgStorage.addAsset(outputAsset,
				{
					parent: null,
					name: this.$t('message.travel-decarbonization.asset-created-with', {functionName: this.functionName, createdBy: this.selectedAddress, createdFrom: assetCid}),
					description: this.functionDefinition.description,
					// Decarbonize travel function has one output type
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

		this.outputs.push(outputAssetResponse.result.block)

		// Create pipeline
		const addPipelineResponse = await this.createPipeline()

		// Sign pipeline with a system actor
		this.loadingMessage = this.$t('message.travel-decarbonization.signing-pipeline')
		this.loading = true
		try {
			const cntrbtr = 'System Actor'
			const nts = this.$t('message.travel-decarbonization.pipeline-signature-note')
			const addPipelineProvenanceMessage = await this.fgStorage.addProvenanceMessage(addPipelineResponse.result.cid, cntrbtr, this.licenseOptions[0], nts, this.ipfsChainName, true)
		} catch (error) {
			this.printError(error, this.errorMessageReadingInterval)
			await this.delay(this.errorMessageReadingInterval)
			this.loading = false
			location.reload()
			return
		}

		this.loading = false
		this.$router.push(`/asset/${assetCid}?output_cid=${outputAssetResponse.result.block}&pipeline_cid=${addPipelineResponse.result.cid}&provenance=true&pipeline=true&metadata=false`)
	},
	async createPipeline() {
		const name = 'dWeb Camp Travel Decarbonization'
		const description = 'Proof of travel decarbonization'
		const functionGrid = [
			[
				{
					fn: this.functionDefinition.cid,
					h: Math.max(this.functionDefinition.input_types.length, this.functionDefinition.output_types.length)
				}
			]
		]
		let gridInputs = []
		for (const input of this.inputs) {
			gridInputs.push({
				asset: input,
				h: this.inputs.length
			})
		}
		let gridOutputs = []
		for (const output of this.outputs) {
			gridOutputs.push({
				asset: output,
				h: this.outputs.length
			})
		}
		const dataGrid = [
			[gridInputs, gridOutputs]
		]
		return await this.fgStorage.addPipeline(name, description, functionGrid, dataGrid, this.ipfsChainName)
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
	},
	fromHexString(hexString) {
		return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))
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
			requireProvenance: false,
			requireMetadata: false,
			nonEthereumBrowserDetected: false,
			errorMessageReadingInterval: 5000,
			successMessageReadingInterval: 5000,
			intervalId: {},
			functionInputTypes: null,
			functionOutputTypes: null,
			inputs: [],
			outputs: []
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
