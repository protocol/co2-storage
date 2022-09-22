import language from '@/src/mixins/i18n/language.js'
import loadSchemas from '@/src/mixins/co2-storage/load-schemas.js'
import mySchemasAndAssets from '@/src/mixins/co2-storage/my-schemas-and-assets.js'
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

import { Storage } from '@co2-storage/js-api'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init co2-storage
	this.storage = new Storage(this.co2StorageAuthType, this.co2StorageAddr, this.co2StorageWalletsKey)
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
	walletChain() {
		return this.$store.getters['main/getWalletChain']
	},
	co2StorageAuthType() {
		return this.$store.getters['main/getCO2StorageAuthType']
	},
	co2StorageAddr() {
		return this.$store.getters['main/getCO2StorageAddr']
	},
	co2StorageWalletsKey() {
		return this.$store.getters['main/getCO2StorageWalletsKey']
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

		this.loadingMessage = this.$t('message.shared.initial-loading')
		this.loading = true

		const initStorageResponse = await this.storage.init()
		if(initStorageResponse.error != null) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: initStorageResponse.error, life: 3000})
			return
		}
		this.ipfs = initStorageResponse.result.ipfs
		this.wallets = initStorageResponse.result.list

		this.loading = false

		await this.loadSchemas()

		const routeParams = this.$route.params
		if(routeParams['cid'])
			this.schemaCid = routeParams['cid']

		this.schemasLoading = false
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
			await this.getSchemaMetadata(this.schemaCid)
		}
}

const mounted = async function() {
}

const methods = {
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

		const that = this
		let walletChainCid, walletChainKey, walletChainSub

		const createSchemaResponse = await this.storage.createSchema(this.json)
		if(createSchemaResponse.error != null) {
			return {
				result: null,
				error: createSchemaResponse.error
			}
		}
		const schemaCid = createSchemaResponse.result
		await this.storage.addSchemaToAccount(schemaCid.toString(), this.schemaName, this.base,
			(cidResponse) => {
				const schema = cidResponse.result.schema
				walletChainCid = cidResponse.result.cid
				walletChainKey= cidResponse.result.key
				that.schemas.unshift(schema)
				that.$toast.add({severity:'success', summary: that.$t('message.shared.created'), detail: that.$t('message.schemas.template-created'), life: 3000})
			},(subResponse) => {
				walletChainSub = subResponse.result.sub
				const topic = that.$t('message.shared.chained-data-updated')
				const message = that.$t('message.shared.chained-data-updated-description')
				that.$toast.add({severity: 'success', summary: topic, detail: message, life: 3000})

				that.$store.dispatch('main/setWalletChain', {
					cid: walletChainCid,
					key: walletChainKey,
					sub: walletChainSub
				})
			})
	},
	async setSchema(row) {
		// Get schema
		const schema = (await this.storage.getSchemaByCid(row.data.cid)).result

		switch (this.jsonEditorMode) {
			case 'code':
				this.jsonEditorContent = {
					text: JSON.stringify(schema),
					json: null
				}
				this.$refs.jsonEditor.setContent({"text": this.jsonEditorContent.text})
				break
			case 'tree':
				this.jsonEditorContent = {
					json: JSON.parse(JSON.stringify(schema)),
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
	async getSchemaMetadata(cid) {
		const walletChain = await this.mySchemasAndAssets()

		const schemas = walletChain.templates

		try {
			const schema = schemas.filter((s) => {return s.cid == cid})[0]
			this.schemaName = schema.name
			this.base = schema.base
		} catch (error) {
			this.schemaName = `${this.$t('message.schemas.new-schema')} - cloned by ${this.selectedAddress}`
			this.base = cid
		}
	
		await this.setSchema({"data": {"cid": cid}})
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
		loadSchemas,
		mySchemasAndAssets,
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
			storage: null,
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
