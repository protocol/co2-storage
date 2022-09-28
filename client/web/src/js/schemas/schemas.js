import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'

import { EstuaryStorage } from '@co2-storage/js-api'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init co2-storage
	this.estuaryStorage = new EstuaryStorage(this.co2StorageAuthType)
}

const computed = {
	schemasClass() {
		return this.theme + '-schemas-' + this.themeVariety
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
	async selectedAddress() {
		if(this.selectedAddress == null) {
			this.$router.push({ path: '/' })
			return
		}
	},
	json: {
		handler(state, before) {
			if(state)
				this.updateForm()
			
			// If schema content is deleted reset base
			if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype)
				this.base = null
		},
		deep: true,
		immediate: false
	},
	async schemaCid() {
		if(this.schemaCid != undefined)
			await this.getTemplateBlock(this.schemaCid)
		}
}

const mounted = async function() {
	await this.getTemplates()

	const routeParams = this.$route.params
	if(routeParams['cid'])
		this.schemaCid = routeParams['cid']
}

const methods = {
	// Retrieve templates
	async getTemplates() {
		await this.estuaryStorage.startIpfs()
		let getTemplatesResponse, skip = 0, limit = 10
		try {
			do {
				getTemplatesResponse = await this.estuaryStorage.getTemplates(skip, limit)
				this.schemas = this.schemas.concat(getTemplatesResponse.result.list)
				skip = getTemplatesResponse.result.skip
				limit = getTemplatesResponse.result.limit
				skip += limit
			} while (getTemplatesResponse.result.length)
		} catch (error) {
			console.log(error)
		}
		await this.estuaryStorage.stopIpfs()
	
		this.schemasLoading = false
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
	async addSchema() {
		if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype) {
			this.$toast.add({severity:'error', summary: this.$t('message.schemas.empty-schema'), detail: this.$t('message.schemas.empty-schema-definition'), life: 3000})
			return
		}

		this.loadingMessage = this.$t('message.schemas.adding-new-schema')
		this.loading = true

		await this.estuaryStorage.startIpfs()
		let addTemplateResponse
		try {
			addTemplateResponse = await this.estuaryStorage.addTemplate(this.json, this.schemaName, this.base, this.schemaParent)
			this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.schemas.template-created'), life: 3000})
		} catch (error) {
			console.log(error)			
		}
		this.schemas.unshift(addTemplateResponse.result.value)
		await this.estuaryStorage.stopIpfs()

		this.loading = false
	},
	async setSchema(row) {
		this.loadingMessage = this.$t('message.schemas.loading-schema')
		this.loading = true

		await this.estuaryStorage.startIpfs()
		let getTemplateResponse
		try {
			getTemplateResponse = await this.estuaryStorage.getTemplate(row.data.cid)
		} catch (error) {
			console.log(error)			
		}
		await this.estuaryStorage.stopIpfs()

		this.loading = false
		const template = getTemplateResponse.result

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

		if(!this.schemaName || !this.schemaName.length)
			this.schemaName = `${row.data.name} - cloned by ${this.selectedAddress}`
		if(row.data.name != undefined)
			this.base = row.data.name
	},
	async getTemplateBlock(cid) {
		this.loadingMessage = this.$t('message.schemas.loading-schema')
		this.loading = true

		await this.estuaryStorage.startIpfs()
		let getTemplateBlockResponse
		try {
			getTemplateBlockResponse = await this.estuaryStorage.getTemplateBlock(cid)
		} catch (error) {
			console.log(error)			
		}
		await this.estuaryStorage.stopIpfs()

		this.loading = false

		const schema = getTemplateBlockResponse.result
		this.schemaName = schema.name
		this.base = schema.base
	
		await this.setSchema({"data": schema})
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
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles
	],
	components: {
		Header,
		JsonEditor,
		FormElements,
		LoadingBlocker,
		InputText,
		Button,
		Toast,
		DataTable,
		Column
	},
	directives: {
		Tooltip
	},
	name: 'Schemas',
	data () {
		return {
			estuaryStorage: null,
			selectedAddress: null,
			walletError: null,
			jsonEditorContent: {
				text: undefined,
				json: {}
			},
			jsonEditorMode: 'tree',
			validJson: false,
			json: null,
			formElements: [],
			schemas: [],
			schemasFilters: {
				'creator': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'base': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			schemasMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			schemasLoading: true,
			base: null,
			schemaName: '',
			schemaParent: null,
			ipfs: null,
			wallets: {},
			schemaCid: null,
			loading: false,
			loadingMessage: ''
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
