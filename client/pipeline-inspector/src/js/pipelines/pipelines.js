import { authentication } from '@/src/mixins/authentication/authentication.js'
import { fgStorage } from '@/src/mixins/ipfs/fg-storage.js'
import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import getToken from '@/src/mixins/api/get-token.js'
import { provenance } from '@/src/mixins/provenance/provenance.js'
import delay from '@/src/mixins/delay/delay.js'
import printError from '@/src/mixins/error/print.js'
import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'
import Button from 'primevue/button'
import moment from 'moment'
import VueJsonPretty from 'vue-json-pretty'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	await this.initFgStorage()
}

const computed = {
	pipelinesClass() {
		return this.theme + '-pipelines-' + this.themeVariety
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
		immediate: false
	},
	async pipelinesSearchCid() {
		if(!this.pipelinesSearchCid)
			return
		await this.loadPipelines()
		if(!this.pipelinesSearchCid || !this.pipelines.length) {
			this.pipelinesSearchCid = null
			return
		}
		this.formVisible = true
		this.showPipeline(this.pipelines[0])
	},
	async ipfsChainName() {
		this.pipelinesSearchCid = null
		await this.init()
	},
	async $route() {
		this.pipelinesSearchCid = null
		await this.init()
	},
	gridLayer: {
		handler() {
			this.showSelectedCellData()
		},
		deep: true,
		immediate: false
	},
	activeCell: {
		handler() {
			this.showSelectedCellData()
		},
		deep: true,
		immediate: false
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

		this.formVisible = false

		const accounts = await this.accounts()
		if(accounts && accounts.length)
			this.$store.dispatch('main/setSelectedAddress', accounts[0])

		this.nonEthereumBrowserDetected = accounts == null
		if(this.nonEthereumBrowserDetected) {
			this.loading = false
			return
		}

		const routeParams = this.$route.params
		if(routeParams['cid']) {
			this.pipelinesSearchCid = routeParams['cid']
			return
		}
		else {
			this.pipelinesSearchCid = null
		}

		this.loading = false
	},
	// Retrieve functions
	async loadPipelines() {
		try {
			this.pipelines = (await this.fgStorage.searchPipelines(this.pipelinesFullTextSearch, null, null, this.pipelinesSearchName, null, this.pipelinesSearchCid,
				this.pipelinesSearchCreator, null, null, this.pipelinesSearchOffset, this.pipelinesSearchLimit, this.pipelinesSearchBy, this.pipelinesSearchDir)).result
			this.pipelinesSearchResults = (this.pipelines && this.pipelines.length) ? this.pipelines[0].total : 0
			this.loading = false
		} catch (error) {
			this.printError(error, 3000)
			this.loading = false
		}
	},
	async pipelinesPage(ev) {
		this.pipelinesSearchLimit = ev.rows
		this.pipelinesSearchOffset = ev.page * this.pipelinesSearchLimit
		await this.loadPipelines()
	},
	totalInterfaces(data, interfaceType) {
		let columns = 0
		let total = 0
		switch (interfaceType) {
			case 'inputs':
				columns = data.data_grid.length
				for (let index = 0; index < columns; index++) {
					const column = data.data_grid[index]
//					total += column[0].map((i)=>{return i.h}).reduce((partialSum, a) => partialSum + a, 0)
					total += column[0].length
				}
				break
			case 'outputs':
				columns = data.data_grid.length
				for (let index = 0; index < columns; index++) {
					const column = data.data_grid[index]
//					total += column[1].map((i)=>{return i.h}).reduce((partialSum, a) => partialSum + a, 0)
					total += column[1].length
				}
				break
			case 'functions':
				columns = data.function_grid.length
				for (let index = 0; index < columns; index++) {
					const column = data.function_grid[index]
//					total += column.map((i)=>{return i.h}).reduce((partialSum, a) => partialSum + a, 0)
					total += column.length
				}
				break
			default:
				this.printError(`Unknown interface type ${interfaceType}`, 3000)
				break
		}
		return total.toString()
	},
	showPipeline(data) {
		this.formVisible = true
		this.pipelineCid = data.cid
		let grid = []
		// Grid column 0 are inputs from data_grid column 0
		// Grid column 1 are functions from function_grid column 0
		// Grid column 2 are outputs from data_grid column 0
		// etc... it comes in pairs of 3 as above

		// Extract inputs and outputs
		let inputs = [], outputs = []
		for (const column of data.data_grid) {
			inputs.push(column[0])
			outputs.push(column[1])
		}

		// Extract functions
		let functions = []
		for (const column of data.function_grid) {
			functions.push(column)
		}

		// Generate grid
		for (let i = 0; i < inputs.length; i++) {
			const input = inputs[i];
			grid[i*3] = input
		}
		for (let i = 0; i < functions.length; i++) {
			const fnct = functions[i];
			grid[i*3+1] = fnct
		}
		for (let i = 0; i < outputs.length; i++) {
			const output = outputs[i];
			grid[i*3+2] = output
		}

		this.pipelineGrid = [...grid]
	},
	setActiveCell(columnIndex, cellIndex) {
		if(this.activeColumnIndex == columnIndex && this.activeCellIndex == cellIndex) {
			this.activeColumnIndex = null
			this.activeCellIndex = null
			this.activeCell = null
			return
		}
		this.activeColumnIndex = columnIndex
		this.activeCellIndex = cellIndex
		this.activeCell = this.pipelineGrid[this.activeColumnIndex][this.activeCellIndex]
	},
	showSelectedCellData() {
		this.dataVisible = false
		if(this.activeCellIndex == null)
			return
		// Determine selected cell data type
		switch (this.gridLayer) {
			case 'data':
				if(this.activeCell.asset != undefined) {
					// Show asset
					this.showCellData(this.activeCell.asset, 'asset')
				}
				else if(this.activeCell.fn != undefined) {
					// Show pipeline
					this.showCellData(this.pipelineCid, 'pipeline')
				}
				else {
					// Print error
					this.printError(`Invalid cell data`, 3000)
					this.loading = false
				}
				break
			case 'function':
				if(this.activeCell.asset != undefined) {
					// Show type
					this.showCellData(this.activeCell.asset, 'type')
				}
				else if(this.activeCell.fn != undefined) {
					// Show function
					this.showCellData(this.activeCell.fn, 'function')
				}
				else {
					// Print error
					this.printError(`Invalid cell data`, 3000)
					this.loading = false
				}
				break
			case 'provenance':
				if(this.activeCell.asset != undefined) {
					// Show asset provenance data
					this.showCellData(this.activeCell.asset, 'provenance')
				}
				else if(this.activeCell.fn != undefined) {
					// Show pipeline provenance data
					this.showCellData(this.pipelineCid, 'provenance')
				}
				else {
					// Print error
					this.printError(`Invalid cell data`, 3000)
					this.loading = false
				}
				break
			default:
				this.printError(`Unknown grid layer ${this.gridLayer}`, 3000)
				this.loading = false
				break
		}
	},
	async showCellData(data, type) {
		let payload, payloadCid
		this.displayInterface.iface = []

		this.loadingMessage = this.$t('message.pipelines.loading-pipeline-data')
		this.loading = true

		switch (type) {
			case 'asset':
				payload = await this.fgStorage.getDag(data)
				if(!this.displayInterface.iface)
					this.displayInterface.iface = []
				this.displayInterface.iface.push({
					endpoint: '/assets',
					name: payload.name,
					description: payload.description,
					cid: data,
					timestamp: payload.timestamp,
					payload: payload
				})

				payloadCid = payload.cid
				payload = await this.fgStorage.getDag(payloadCid)
				this.displayInterface.iface.push({
					endpoint: null,
					name: null,
					description: null,
					cid: payloadCid,
					timestamp: null,
					payload: payload
				})

				this.dataVisible = true
				break
			case 'pipeline':
				payload = await this.fgStorage.getDag(data)
				if(!this.displayInterface.iface)
					this.displayInterface.iface = []
				this.displayInterface.iface.push({
					endpoint: '/pipelines',
					name: payload.name,
					description: payload.description,
					cid: data,
					timestamp: payload.timestamp,
					payload: payload
				})
				this.dataVisible = true
				break
			case 'type':
				const asset = await this.fgStorage.getDag(data)
				payload = await this.fgStorage.getDag(asset.template)
				if(!this.displayInterface.iface)
					this.displayInterface.iface = []
				this.displayInterface.iface.push({
					endpoint: '/templates',
					name: payload.name,
					description: payload.description,
					cid: asset.template,
					timestamp: payload.timestamp,
					payload: payload
				})

				payloadCid = payload.cid
				payload = await this.fgStorage.getDag(payloadCid)
				this.displayInterface.iface.push({
					endpoint: null,
					name: null,
					description: null,
					cid: payloadCid,
					timestamp: null,
					payload: payload
				})

				this.dataVisible = true
				break
			case 'function':
				payload = await this.fgStorage.getDag(data)
				if(!this.displayInterface.iface)
					this.displayInterface.iface = []
				this.displayInterface.iface.push({
					endpoint: '/functions',
					name: payload.name,
					description: payload.description,
					cid: data,
					timestamp: payload.timestamp,
					payload: payload
				})
				this.dataVisible = true
				break
			case 'provenance':
				const provenanceMessages = await this.provenanceMessages(data, true)
				if(provenanceMessages.error) {
					this.printError(error, 3000)
					return
				}
				if(!provenanceMessages.result.length) {
					if(!this.displayInterface.iface)
						this.displayInterface.iface = []
					this.displayInterface.iface.push({
						endpoint: null,
						name: this.$t('message.shared.no-provenance-found-for', {record: data}),
						description: null,
						cid: data,
						timestamp: null,
						payload: null
					})
					this.dataVisible = true
					this.loading = false
					return
				}
				for (const provenanceMessage of provenanceMessages.result) {
					let cid = provenanceMessage.cid
					payload = await this.fgStorage.getDag(cid)
					if(!this.displayInterface.iface)
						this.displayInterface.iface = []
					this.displayInterface.iface.push({
						endpoint: null,
						name: provenanceMessage.name,
						description: provenanceMessage.description,
						cid: cid,
						timestamp: payload.timestamp,
						payload: payload
					})

					cid = provenanceMessage.signature_cid
					payload = await this.fgStorage.getDag(cid)
					if(!this.displayInterface.iface)
						this.displayInterface.iface = []
					this.displayInterface.iface.push({
						endpoint: null,
						name: null,
						description: null,
						cid: cid,
						timestamp: null,
						payload: payload
					})

				}
				this.dataVisible = true
				break
			default:
				console.log(`Unknown cell data type ${type}`)
				break
		}
		this.loading = false
	},
	async showInterfaces(data, type) {
		this.displayInterface.iface = []
		this.displayInterfacesDialog = true
		this.displayInterface.type = type
		switch (type) {
			case 'inputs':
				await this.readInterfaces(data.data_grid, type, 0)
				break
			case 'outputs':
				await this.readInterfaces(data.data_grid, type, 1)
				break
			case 'functions':
				await this.readInterfaces(data.function_grid, type)
				break
			default:
				console.log(`Unknown type ${type}`)
			}
	},
	async readInterfaces(ifaces, type, index) {
		let columns = ifaces.length
		let property, endpoint
		switch (type) {
			case 'inputs':
			case 'outputs':
				property = 'asset'
				endpoint = '/assets'
				break
			case 'functions':
				property = 'fn'
				endpoint = '/functions'
				break
			default:
				console.log(`Unknown type ${type}`)
				return
		}
		for (let i = 0; i < columns; i++) {
			const column = ifaces[i]
			const iface = (index != undefined) ? column[index] : column
			for await(const ifc of iface) {
				const payload = await this.fgStorage.getDag(ifc[property])
				if(!this.displayInterface.iface)
					this.displayInterface.iface = []
				this.displayInterface.iface.push({
					endpoint: endpoint,
					name: payload.name,
					description: payload.description,
					cid: ifc[property],
					timestamp: payload.timestamp,
					payload: payload
				})
			}
		}
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
		fgStorage,
		authentication,
		language,
		copyToClipboard,
		getToken,
		provenance,
		delay,
		printError
	],
	components: {
		Header,
		LoadingBlocker,
		Button,
		VueJsonPretty
	},
	directives: {
	},
	name: 'Pipelines',
	data () {
		return {
			moment: moment,

			pipelines: [],
			pipelinesFullTextSearch: null,
			pipelinesSearchName: null,
			pipelinesSearchCid: null,
			pipelinesSearchCreator: null,
			pipelinesSearchOffset: 0,
			pipelinesSearchLimit: 3,
			pipelinesSearchBy: 'timestamp',
			pipelinesSearchDir: 'desc',
			pipelinesLayout: 'list',	// grid
			pipelinesSearchResults: 0,
			displayInterfacesDialog: false,
			displayInterface: {},
			pipelineGrid: [],
			gridLayer: 'data',	// function, provenance
			activeColumnIndex: null,
			activeCellIndex: null,
			activeCell: null,
			pipelineCid: null,
			dataVisible: false,
			loading: false,
			loadingMessage: '',
			indexingInterval: 5000,
			nonEthereumBrowserDetected: false
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
