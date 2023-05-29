import ensureIpfsIsRunning from '@/src/mixins/ipfs/ensure-ipfs-is-running.js'
import { authentication } from '@/src/mixins/authentication/authentication.js'
import { fgStorage } from '@/src/mixins/ipfs/fg-storage.js'
import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import navigate from '@/src/mixins/router/navigate.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'
import getToken from '@/src/mixins/api/get-token.js'
import { provenance } from '@/src/mixins/provenance/provenance.js'
import delay from '@/src/mixins/delay/delay.js'
import printError from '@/src/mixins/error/print.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'
import Contributor from '@/src/components/helpers/Contributor.vue'

import InputText from 'primevue/inputtext'
import InputSwitch from 'primevue/inputswitch'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

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
	json: {
		handler(state, before) {
			if(state)
				this.formElements = this.updateForm(this.json)
			
			// If schema content is deleted reset base
			if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype)
				this.base = {
					title: null,
					reference: null
				}
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
			this.templateBlockCid = routeParams['cid']

		const accounts = await this.accounts()
		if(accounts && accounts.length)
			this.$store.dispatch('main/setSelectedAddress', accounts[0])
		
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
	// Json editor onChange event handler
	jsonEditorChange(change) {
		switch (this.jsonEditorMode) {
			case 'code':
				this.jsonEditorContent = {
					text: change.updatedContent.text,
					json: null
				}
				if(this.isValidJson(change.updatedContent.text))
					this.json = JSON.parse(change.updatedContent.text)
				break
			case 'tree':
				this.jsonEditorContent = {
					json: change.updatedContent.json,
					text: null
				}
				this.json = JSON.parse(JSON.stringify(change.updatedContent.json))
				break
			default:
				console.log(`Unknown JSON editor mode '${this.jsonEditorMode}'`)
				break
		}
	},
	// Json editor onChangeMode event handler
	jsonEditorModeChange(mode) {
		this.jsonEditorMode = mode
	},
    // Workaround for svelte onError
    isValidJson(input) {
		let str
        try{
			if(typeof input == 'string')
				str = input
			else
				str = JSON.stringify(input) 
            JSON.parse(str);
        }
        catch (e){
            return false
        }
        return true
    },
	async addTemplate() {
		const that = this
		
		if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype) {
			this.printError(this.$t('message.schemas.empty-schema-definition'), 3000)
			return
		}

		this.loadingMessage = this.$t('message.schemas.adding-new-schema')
		this.loading = true

		let addTemplateResponse
		try {
			addTemplateResponse = (await this.fgStorage.addTemplate(this.json, this.templateName,
				this.base, this.templateDescription, (this.newVersion) ? this.templateParent : null, this.ipfsChainName)).result
			this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.schemas.template-created'), life: 3000})
			this.templatesSearchCid = null
			this.templatesSearchOffset = 0
			this.templatesFilters.cid.value = null
		} catch (error) {
			this.printError(error, 3000)
			this.loading = false
			return
		}

		const addedTemplate = {
			block: addTemplateResponse.block.toString(),
			template: addTemplateResponse.templateBlock
		}

		this.templates.unshift(addedTemplate)

		setTimeout(async () => {
			that.templatesSearchOffset = 0
			await that.loadTemplates()
		}, this.indexingInterval)

		this.loading = false
	},
	selectTemplate(cid) {
		this.$router.push({ path: `/templates/${cid}` })
		this.templateBlockCid = cid
	},
	async setTemplate(cid) {
		this.newVersion = false
		this.formVisible = true

		if(this.templateData == null)
			this.templateData = await this.validateTemplate(cid)
		if(this.templateData.error) {
			this.printError(this.templateData.error, 3000)
			await this.init()
			this.loading = false
			return
		}

		if(this.ipfsChainName != this.templateData.result.indexChain) {
			this.$store.dispatch('main/setIpfsChainName', this.templateData.result.indexChain)
			return
		}

		let template = this.templateData.result.template
		template = this.normalizeSchemaFields(template)
		const metadata = this.templateData.result.metadata

		this.isOwner = metadata.creator == this.selectedAddress

		while(!this.$refs.jsonEditor || !this.$refs.jsonEditor.setContent) {
			await this.delay(100)
		}

		switch (this.jsonEditorMode) {
			case 'code':
				this.jsonEditorContent = {
					text: JSON.stringify(template),
					json: null
				}
				this.$refs.jsonEditor.setContent({"text": this.jsonEditorContent.text})
				break
			case 'tree':
				this.jsonEditorContent = {
					json: JSON.parse(JSON.stringify(template)),
					text: null
				}
				this.$refs.jsonEditor.setContent({"json": this.jsonEditorContent.json})
				break
			default:
				console.log(`Unknown JSON editor mode '${this.jsonEditorMode}'`)
				break
		}

		this.templateName = `${metadata.name}`
		if(metadata.base != undefined)
			this.base = {
				title: metadata.name,
				reference: (metadata.reference) ? metadata.reference : null
			}

		if(metadata.cid != undefined)
			this.templateParent = metadata.cid

		if(metadata.description != undefined)
			this.templateDescription = metadata.description
	},
	filesUploader(event) {
	},
	filesSelected(sync) {
		this.syncFormFiles(sync)
	},
	filesRemoved(sync) {
		const event = sync.event
		let element = sync.element
		element.value = null
	},
	fileRemoved(sync) {
		this.syncFormFiles(sync)
	},
	filesError(sync) {
	},
	async showIpldDialog(cid) {
		const payload = await this.fgStorage.getDag(cid)
		this.ipldDialog.cid = cid
		this.ipldDialog.payload = payload
		this.displayIpldDialog = true
	},
	resetVars() {
		this.jsonEditorContent = {
			text: undefined,
			json: {}
		}
		this.jsonEditorMode = 'code'
		this.validJson = false
		this.json = null
		this.formElements = []
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
		this.templatesSearchCreator = null
		this.templatesSearchBase = null
		this.templatesSearchName = null
		this.templatesSearchCid = null
		this.templatesSearchBy = 'timestamp'
		this.templatesSearchDir = 'desc'
		this.base = {
			title: null,
			reference: null
		}
		this.templateName = ''
		this.templateDescription = ''
		this.templateParent = null
		this.templateBlockCid = null
		this.newVersion = false
		this.loading = false
		this.loadingMessage = ''
		this.displaySignedDialog = false
		this.signedDialog = {}
		this.displaySignDialog = false
		this.signedDialogs = []
		this.formVisible = false
		this.isOwner = false
		this.refresh = false
		this.provenanceExist = {}
		this.displayIpldDialog = false
		this.ipldDialog = {}
		this.hasMySignature = {}
		this.displayContributorDialog = false
		this.contributionCid = null
		this.obtainingApiToken = false
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

const beforeUnmount = async function() {
}

export default {
	mixins: [
		ensureIpfsIsRunning,
		fgStorage,
		authentication,
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles,
		navigate,
		normalizeSchemaFields,
		getToken,
		provenance,
		delay,
		printError
	],
	components: {
		Header,
		JsonEditor,
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
		Dialog,
		VueJsonPretty
	},
	directives: {
		Tooltip
	},
	name: 'Templates',
	data () {
		return {
			jsonEditorContent: {
				text: undefined,
				json: {}
			},
			jsonEditorMode: 'code',
			validJson: false,
			json: null,
			formElements: [],
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
			templatesSearchCreator: null,
			templatesSearchBase: null,
			templatesSearchName: null,
			templatesSearchCid: null,
			templatesSearchBy: 'timestamp',
			templatesSearchDir: 'desc',
			base: {
				title: null,
				reference: null
			},
			templateName: '',
			templateDescription: '',
			templateParent: null,
			templateBlockCid: null,
			newVersion: false,
			loading: false,
			loadingMessage: '',
			displaySignedDialog: false,
			signedDialog: {},
			displaySignDialog: false,
			signedDialogs: [],
			formVisible: false,
			isOwner: false,
			refresh: false,
			provenanceExist: {},
			displayIpldDialog: false,
			ipldDialog: {},
			hasMySignature: {},
			indexingInterval: 5000,
			displayContributorDialog: false,
			contributionCid: null,
			obtainingApiToken: false,
			templateData: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
