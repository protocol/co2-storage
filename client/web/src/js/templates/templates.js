import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import normalizeSchemaFields from '@/src/mixins/ipfs/normalize-schema-fields.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

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
		if(this.templateBlockCid != undefined)
			await this.setTemplate({data: {block: this.templateBlockCid}})
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
			await that.loadTemplates()
		}, 0)
	
		const routeParams = this.$route.params
		if(routeParams['cid'])
			this.templateBlockCid = routeParams['cid']
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
		if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype) {
			this.$toast.add({severity:'error', summary: this.$t('message.schemas.empty-schema'), detail: this.$t('message.schemas.empty-schema-definition'), life: 3000})
			return
		}

		this.loadingMessage = this.$t('message.schemas.adding-new-schema')
		this.loading = true

		let addTemplateResponse
		try {
			addTemplateResponse = (await this.fgStorage.addTemplate(this.json, this.templateName,
				this.base, this.templateDescription, (this.newVersion) ? this.templateParent : null, this.ipfsChainName)).result
			this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.schemas.template-created'), life: 3000})
		} catch (error) {
			this.$toast.add({severity:'error', summary: this.$t('message.shared.error'), detail: this.$t('message.shared.error_', {err: error.error}), life: 3000})
			this.loading = false
			return
		}

		const addedTemplate = {
			block: addTemplateResponse.block.toString(),
			template: addTemplateResponse.templateBlock
		}

		this.templates.unshift(addedTemplate)

		this.setTemplate({data: addedTemplate})

		this.loading = false
	},
	selectTemplate(cid) {
		this.$router.push({ path: `/templates/${cid}` })
		this.templateBlockCid = cid
	},
	async setTemplate(row) {
		this.newVersion = false
		const block = row.data.block
		this.formVisible = true

		let templateResponse
		try {
			templateResponse = (await this.fgStorage.getTemplate(block)).result
		} catch (error) {
			this.$toast.add({severity:'error', summary: this.$t('message.shared.error'), detail: this.$t('message.shared.error_', {err: error.error}), life: 3000})
			this.loading = false
			return
		}

		let template = templateResponse.template
		template = this.normalizeSchemaFields(template)
		const templateBlock = templateResponse.templateBlock

		this.isOwner = templateBlock.creator == this.selectedAddress

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

//		if(!this.templateName || !this.templateName.length)
			this.templateName = `${templateBlock.name} - cloned by ${this.selectedAddress}`
		if(templateBlock.base != undefined)
			this.base = {
				title: templateBlock.name,
				reference: (templateBlock.reference) ? templateBlock.reference : null
			}

		if(templateBlock.cid != undefined)
			this.templateParent = templateBlock.cid

		if(templateBlock.description != undefined)
			this.templateDescription = templateBlock.description
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

const beforeUnmount = async function() {
}

export default {
	mixins: [
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles,
		navigate,
		cookie,
		normalizeSchemaFields
	],
	components: {
		Header,
		JsonEditor,
		FormElements,
		LoadingBlocker,
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
			selectedAddress: null,
			walletError: null,
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
