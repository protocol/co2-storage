import ensureIpfsIsRunning from '@/src/mixins/ipfs/ensure-ipfs-is-running.js'
import { authentication } from '@/src/mixins/authentication/authentication.js'
import { fgStorage } from '@/src/mixins/ipfs/fg-storage.js'
import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import getToken from '@/src/mixins/api/get-token.js'
import { provenance } from '@/src/mixins/provenance/provenance.js'
import delay from '@/src/mixins/delay/delay.js'
import printError from '@/src/mixins/error/print.js'
import navigate from '@/src/mixins/router/navigate.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'
import Contributor from '@/src/components/helpers/Contributor.vue'

import InputText from 'primevue/inputtext'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import Dialog from 'primevue/dialog'

import Rating from 'primevue/rating'
import Tag from 'primevue/tag'
import DataView from 'primevue/dataview'
import DataViewLayoutOptions from 'primevue/dataviewlayoutoptions'
import Dropdown from 'primevue/dropdown'
import AutoComplete from 'primevue/autocomplete'

import moment from 'moment'

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
	functionsClass() {
		return this.theme + '-functions-' + this.themeVariety
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
	},
	functionTypes() {
		const mapped = this.functions.map((f)=>{return f.function_type})
		const filtered = mapped.filter((f,index) => mapped.indexOf(f) === index)
		return filtered
	},
	createDisabled() {
		return this.functionName == null || !this.functionName.length
			|| this.functionType == null
			|| this.functionContainer == null || !this.functionContainer.length
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
	async functionsSearchCid() {
		if(!this.functionsSearchCid)
			return
		await this.loadFunctions()
		if(!this.functionsSearchCid || !this.functions.length)
			return
		this.formVisible = true
		await this.showFunction(this.functions[0])
	},
	async ipfsChainName() {
		this.functionsSearchCid = null
		await this.init()
	},
	async $route() {
		this.functionsSearchCid = null
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
		this.formVisible = false

		const accounts = await this.accounts()
		if(accounts && accounts.length)
			this.$store.dispatch('main/setSelectedAddress', accounts[0])

		const routeParams = this.$route.params
		if(routeParams['cid']) {
			this.functionsSearchCid = routeParams['cid']
			return
		}
		else {
			this.functionsSearchCid = null
		}

		await this.loadFunctions()

		this.loading = false
	},
	newFunction() {
		this.resetVars()
		this.formVisible = true
	},
	// Retrieve functions
	async loadFunctions() {
		try {
			this.functions = (await this.fgStorage.searchFunctions(this.functionsFullTextSearch, null, null, this.functionsSearchName, null, this.functionsSearchCid, null, null, null, null,
				null, this.functionsSearchCreator, null, null, this.functionsSearchOffset, this.functionsSearchLimit, this.functionsSearchBy, this.functionsSearchDir)).result
			this.functionsSearchResults = (this.functions && this.functions.length) ? this.functions[0].total : 0
			this.loading = false
		} catch (error) {
			this.printError(error, 3000)
			this.loading = false
		}
	},
	async functionsPage(ev) {
		this.functionsSearchLimit = ev.rows
		this.functionsSearchOffset = ev.page * this.functionsSearchLimit
		await this.loadFunctions()
	},
	async showFunction(data) {
		this.formVisible = true
		this.functionName = data.name
		this.functionDescription = data.description
		this.functionType = data.function_type
		this.functionContainer = data.function_container
		this.functionCommands = data.commands
		this.functionJobParameters = data.parameters
		let inputs = []
		for await(const inp of data.input_types) {
			try {
				const input = (await this.fgStorage.search(null, null, 'template', inp)).result[0]
				inputs.push(input)
			} catch (error) {
				console.log(error)
			}
		}
		this.functionInputs = [...inputs]
		let outputs = []
		for await(const outp of data.output_types) {
			try {
				const output = (await this.fgStorage.search(null, null, 'template', outp)).result[0]
				outputs.push(output)
			} catch (error) {
				console.log(error)
			}
		}
		this.functionOutputs = [...outputs]
	},
	async showInterfaces(data, type) {
		this.displayInterface.iface = []
		this.displayInterfacesDialog = true
		this.displayInterface.type = type
		switch (type) {
			case 'inputs':
				await this.readInterfaces(data.input_types)
				break
			case 'outputs':
				await this.readInterfaces(data.output_types)
				break
			default:
				console.log(`Unknown type ${type}`)
			}
	},
	async readInterfaces(ifaces) {
		for await(const iface of ifaces) {
			const payload = await this.fgStorage.getDag(iface)
			if(!this.displayInterface.iface)
				this.displayInterface.iface = []
			this.displayInterface.iface.push({
				name: payload.name,
				description: payload.description,
				cid: iface,
				timestamp: payload.timestamp,
				payload: payload
			})
		}
	},
	async showIpldDialog(cid) {
		const payload = await this.fgStorage.getDag(cid)
		this.ipldDialog.cid = cid
		this.ipldDialog.payload = payload
		this.displayIpldDialog = true
	},
	async functionInputsComplete(io) {
		const query = io.query
		let templates
		const or = true
		try {
			templates = (await this.fgStorage.search(null, query, 'template', query, null, query, query, null, null, query, query, null, null, null, null, null, this.templatesSearchOffset, this.templatesSearchLimit, this.templatesSearchBy, this.templatesSearchDir, or)).result
		} catch (error) {
			console.log(error)
			templates = []
		}
		this.functionInputItems = [...templates]
	},
	async functionOutputsComplete(so) {
		const query = so.query
		let templates
		const or = true
		try {
			templates = (await this.fgStorage.search(null, query, 'template', query, null, query, query, null, null, query, query, null, null, null, null, null, this.templatesSearchOffset, this.templatesSearchLimit, this.templatesSearchBy, this.templatesSearchDir, or)).result
		} catch (error) {
			console.log(error)
			templates = []
		}
		this.functionOutputItems = [...templates]
	},
	async addFunction() {
		const that = this

		if(this.createDisabled) {
			this.printError(this.$t('message.functions.missing-mandatory-inputs'), 3000)
			return
		}

		this.loadingMessage = this.$t('message.functions.adding-new-function', {name: this.functionName})
		this.loading = true

		// Check if function container already exists
		try {
			const myFunctions = (await this.fgStorage.searchFunctions(null, null, null, null, null, null, null, this.functionContainer)).result
			if(myFunctions.length) {
				this.printError(this.$t('message.functions.function-container-exists', {container: this.functionContainer}), 3000)
				this.loading = false
				return
			}
		} catch (error) {
			this.printError(error, 3000)
			this.loading = false
			return
		}

		let addFunctionResponse
		try {
			addFunctionResponse = (await this.fgStorage.addFunction(this.functionName, this.functionDescription, this.functionType,
				this.functionContainer, this.functionInputs.map((fi)=>{return fi.cid}), this.functionOutputs.map((fo)=>{return fo.cid}),
				this.functionCommands, this.functionJobParameters, this.ipfsChainName)).result
			this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.functions.function-created', {name: this.functionName}), life: 3000})
		} catch (error) {
			this.printError(error, 3000)
			this.loading = false
			return
		}

		setTimeout(async () => {
			await that.loadFunctions()
		}, this.indexingInterval)

		this.loading = false
	},
	resetVars() {
		this.functionName = ''
		this.functionDescription = ''
		this.functionType = null
		this.functionContainer = ''
		this.functionCommands = null
		this.functionJobParameters = null
		this.functionInputs.length = 0
		this.functionOutputs.length = 0
		this.functionInputItems.length = 0
		this.functionOutputItems.length = 0
		this.functionCid = null
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

const beforeUnmount = async function() {
}

export default {
	mixins: [
		ensureIpfsIsRunning,
		fgStorage,
		authentication,
		language,
		copyToClipboard,
		getToken,
		provenance,
		delay,
		printError,
		navigate
	],
	components: {
		Header,
		LoadingBlocker,
		Contributor,
		InputText,
		InputSwitch,
		Textarea,
		Button,
		Toast,
		Dialog,
		
		Rating,
		Tag,
		DataView,
		DataViewLayoutOptions,
		Dropdown,
		AutoComplete,

		VueJsonPretty
	},
	directives: {
		Tooltip
	},
	name: 'Functions',
	data () {
		return {
			moment: moment,
			functions: [],
			functionsFullTextSearch: null,
			functionsSearchName: null,
			functionsSearchCid: null,
			functionsSearchCreator: null,
			functionsSearchOffset: 0,
			functionsSearchLimit: 3,
			functionsSearchBy: 'timestamp',
			functionsSearchDir: 'desc',
			functionsLayout: 'list',	// grid
			displayInterfacesDialog: false,
			displayInterface: {},
			functionName: '',
			functionDescription: '',
			functionType: null,
			functionContainer: '',
			functionCommands: null,
			functionJobParameters: null,
			functionInputs: [],
			functionOutputs: [],
			functionInputItems: [],
			functionOutputItems: [],
			functionsSearchResults: 0,
			functionCid: null,
			loading: false,
			loadingMessage: '',
			formVisible: false,
			displayIpldDialog: false,
			ipldDialog: {},
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
