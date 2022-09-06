import language from '@/src/mixins/i18n/language.js'
import getWallets from '@/src/mixins/wallet/get-wallets.js'
import loadSchemas from '@/src/mixins/schema/load-schemas.js'
import keyExists from '@/src/mixins/ipfs/key-exists.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'

import { CID } from 'multiformats/cid'

import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'
import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'

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
	}
}

const watch = {
	currentProvider: {
		handler() {
			if(this.currentProvider == null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
			}
			else {
				this.selectedAddress = this.currentProvider.selectedAddress
			}
		},
		deep: true,
		immediate: false
	},
	walletError: {
		handler() {
			if(this.walletError != null) {
				this.selectedAddress = null
				this.$router.push({ path: '/' })
				// TODO, popup error
			}
		},
		deep: true,
		immediate: false
	},
	async selectedAddress() {
		if(this.selectedAddress == null)
			return

		await this.getWallets()
		await this.loadSchemas()
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
	}
}

const mounted = async function() {
	const routeParams = this.$route.params
	if(routeParams['cid'])  {
		this.schemaCid = routeParams['cid']

		await this.getWallets()
		await this.getSchema(this.schemaCid)
	}
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
			this.$toast.add({severity:'error', summary:'Empty schema', detail:'Please add environmental asset template definition', life: 3000})
			return
		}

		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary:'Wallet not connected', detail:'Please connect your wallet in order to add environmental asset template', life: 3000})
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

		this.$toast.add({severity:'success', summary:'Created', detail:'Environmental asset template is created', life: 3000})

		walletChain.templates.push(schema)
		walletChain.parent = walletChainCid.toString()

		// Create new dag struct
		walletChainCid = await this.ipfs.dag.put(walletChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		// Link key to the latest block
		const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
			lifetime: '87600h',
			key: walletChainKey
		})
		
		this.$toast.add({severity:'success', summary:'Chain updated', detail:'Environmental asset template chain is updated', life: 3000})
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
		const event = sync.event
		let element = sync.element
		element.value = event.files
	},
	filesRemoved(sync) {
		const event = sync.event
		let element = sync.element
		element.value = null
	},
	fileRemoved(sync) {
		const event = sync.event
		let element = sync.element
		element.value = event.files
	},
	filesError(sync) {
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language,
		getWallets,
		loadSchemas,
		keyExists,
		copyToClipboard,
		updateForm
	],
	components: {
		Header,
		JsonEditor,
		FormElements,
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
			currentProvider: null,
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
			nodeKeys: [],
			wallets: {},
			schemaCid: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
