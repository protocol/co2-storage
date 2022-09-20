import language from '@/src/mixins/i18n/language.js'
import loadSchemas from '@/src/mixins/schema/load-schemas.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import { CID } from 'multiformats/cid'

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

		const authType = null	// default metamask
		const addr = null		// default /ip4/127.0.0.1/tcp/5001 (co2.storage local node: /dns4/rqojucgt.co2.storage/tcp/5002/https)
		const walletsKey = null	// default 'co2.storage-wallets'
		const storage = new Storage(authType, addr, walletsKey)
		const initStorageResponse = await storage.init()
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
			await this.getSchema(this.schemaCid)
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

		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary: this.$t('message.shared.wallet-not-connected'), detail: this.$t('message.shared.wallet-not-connected-description'), life: 3000})
			return
		}

		const keyPath = `/ipns/${walletChainKey}`
		let walletChainCid

		// Resolve IPNS name
		for await (const name of this.ipfs.name.resolve(keyPath)) {
			walletChainCid = name.replace('/ipfs/', '')
		}
		walletChainCid = CID.parse(walletChainCid)

		// Get last walletsChain block
		const walletChain = (await this.ipfs.dag.get(walletChainCid)).value

		// Create schema CID
		const schemaCid = await this.ipfs.dag.put(this.json, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const schema = {
			"creator": this.selectedAddress,
			"cid": schemaCid.toString(),
			"name": this.schemaName,
			"base": this.base,
			"use": 0,
			"fork": 0
		}

		this.schemas.unshift(schema)

		this.$toast.add({severity:'success', summary: this.$t('message.shared.created'), detail: this.$t('message.schemas.template-created'), life: 3000})

		walletChain.templates.push(schema)
		walletChain.parent = walletChainCid.toString()

		// Create new dag struct
		walletChainCid = await this.ipfs.dag.put(walletChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const topic = this.$t('message.shared.chained-data-updated')
		const message = this.$t('message.shared.chained-data-updated-description')

		// Link key to the latest block
		const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
			lifetime: '87600h',
			key: walletChainKey
		})
		
		this.$toast.add({severity: 'success', summary: topic, detail: message, life: 3000})

		this.$store.dispatch('main/setWalletChain', {
			cid: walletChainCid,
			key: walletChainKey,
			sub: walletChainSub
		})
	},
	async setSchema(row) {
		// Get schema
		const schemaCid = CID.parse(row.data.cid)
		const schema = (await this.ipfs.dag.get(schemaCid)).value

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
		this.base = row.data.name
	},
	async getSchema(cid) {
		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity: 'error', summary: this.$t('meassage.shared.wallet-not-connected'), detail: this.$t('meassage.shared.wallet-not-connected-description'), life: 3000})
			return
		}

		const keyPath = `/ipns/${walletChainKey}`
		let walletChainCid

		// Resolve IPNS name
		for await (const name of this.ipfs.name.resolve(keyPath)) {
			walletChainCid = name.replace('/ipfs/', '')
		}
		walletChainCid = CID.parse(walletChainCid)

		// Get last walletsChain block
		const walletChain = (await this.ipfs.dag.get(walletChainCid)).value
		const schemas = walletChain.templates
		const schema = schemas.filter((s) => {return s.cid == cid})[0]
		this.schemaName = schema.name
		this.base = schema.base
		await this.setSchema({"data": {"cid": schema.cid}})
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
