import language from '@/src/mixins/i18n/language.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import navigate from '@/src/mixins/router/navigate.js'

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

import { EstuaryStorage, FGStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init Estuary storage
	if(this.estuaryStorage == null)
		this.$store.dispatch('main/setEstuaryStorage', new EstuaryStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null)
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))
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
	mode() {
		return this.$store.getters['main/getMode']
	},
	estuaryStorage() {
		return this.$store.getters['main/getEstuaryStorage']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	ipldExplorerUrl() {
		return this.$store.getters['main/getIpldExplorerUrl']
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
			location.reload(true)
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
	async templateBlockCid() {
		if(this.templateBlockCid != undefined)
			await this.getTemplate(this.templateBlockCid)
	}
}

const mounted = async function() {
	const that = this

	window.setTimeout(async () => {
		await that.getTemplates()
	}, 0)

	const routeParams = this.$route.params
	if(routeParams['cid'])
		this.templateBlockCid = routeParams['cid']
}

const methods = {
	// Retrieve templates
	async getTemplates() {
		let getTemplatesResponse, skip = 0, limit = 10
		try {
			do {
				switch (this.mode) {
					case 'fg':
						getTemplatesResponse = await this.fgStorage.getTemplates(skip, limit)
						break
					case 'estuary':
						getTemplatesResponse = await this.estuaryStorage.getTemplates(skip, limit)
						break
					default:
						this.$store.dispatch('main/setMode', 'fg')
						getTemplatesResponse = await this.fgStorage.getTemplates(skip, limit)
						break
				}

				this.templates = this.templates.concat(getTemplatesResponse.result.list)
				skip = getTemplatesResponse.result.skip
				limit = getTemplatesResponse.result.limit
				skip += limit
			} while (skip <= getTemplatesResponse.result.total)
		} catch (error) {
			console.log(error)
		}
		this.templatesLoading = false
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
			switch (this.mode) {
				case 'fg':
					addTemplateResponse = await this.fgStorage.addTemplate(this.json, this.templateName,
						this.base, this.templateDescription, (this.newVersion) ? this.templateParent : null)
					break
				case 'estuary':
					addTemplateResponse = await this.estuaryStorage.addTemplate(this.json, this.templateName,
						this.base, this.templateDescription, (this.newVersion) ? this.templateParent : null)
					break
				default:
					this.$store.dispatch('main/setMode', 'fg')
					addTemplateResponse = await this.fgStorage.addTemplate(this.json, this.templateName,
						this.base, this.templateDescription, (this.newVersion) ? this.templateParent : null)
					break
			}

			this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.schemas.template-created'), life: 3000})
		} catch (error) {
			console.log(error)			
		}
		this.templates.unshift(addTemplateResponse.result)

		this.loading = false
	},
	async setTemplate(row) {
		const template = row.data.template
		const templateBlock = row.data.templateBlock
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
		if(templateBlock.name != undefined)
			this.base = templateBlock.name

		if(templateBlock.cid != undefined)
			this.templateParent = templateBlock.cid
	},
	async getTemplate(templateBlockCid) {
		this.loadingMessage = this.$t('message.schemas.loading-schema')
		this.loading = true

		let getTemplateResponse
		try {
			switch (this.mode) {
				case 'fg':
					getTemplateResponse = await this.fgStorage.getTemplate(templateBlockCid)
					break
				case 'estuary':
					getTemplateResponse = await this.estuaryStorage.getTemplate(templateBlockCid)
					break
				default:
					this.$store.dispatch('main/setMode', 'fg')
					getTemplateResponse = await this.fgStorage.getTemplate(templateBlockCid)
					break
			}
		} catch (error) {
			console.log(error)			
		}

		this.loading = false

		const template = getTemplateResponse.result.template
		this.templateName = getTemplateResponse.result.templateBlock.name
		this.base = getTemplateResponse.result.templateBlock.base
	
		await this.setTemplate({"data": getTemplateResponse.result})
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

const beforeUnmount = async function() {
}

export default {
	mixins: [
		language,
		copyToClipboard,
		updateForm,
		syncFormFiles,
		navigate
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
		Column
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
			jsonEditorMode: 'tree',
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
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			templatesLoading: true,
			base: null,
			templateName: '',
			templateDescription: '',
			templateParent: null,
			templateBlockCid: null,
			newVersion: false,
			loading: false,
			loadingMessage: ''
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
