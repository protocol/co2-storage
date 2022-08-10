import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'
import JsonEditor from '@/src/components/helpers/JsonEditor.vue'

import { create } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'

import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
import SplitButton from 'primevue/splitbutton'

import Toast from 'primevue/toast'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'


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
		console.dir(this.wallets, {depth: null})
	},
	json: {
		handler(state, before) {
			if(state)
				this.updateForm()

		},
		deep: true,
		immediate: false
	}
}

const mounted = async function() {
	const routeParams = this.$route.params
	if(routeParams['cid']) {
		console.log(routeParams['cid'])
	}

	this.schemasLoading = false

	// Attach to a node
	this.ipfs = await create('/dns4/rqojucgt.co2.storage/tcp/5002/https')

	// Get existing node keys
	this.nodeKeys = await this.ipfs.key.list()
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
	// Update for following json is changed and validated
	updateForm() {
		if(Array.isArray(this.json))
			return
			this.formElements.length = 0
		const keys = Object.keys(this.json)
		for (const key of keys) {
			const val = this.json[key]
			let domElement = {}

			const type = val.type
			switch (type) {
				case 'int':
				case 'integer':
					domElement.type = 'InputNumber'
					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min set
						domElement.min = parseInt(val.min)
					}
					if(val.max != undefined) {
						// Max set
						domElement.max = parseInt(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : 0
					break
				case 'decimal':
				case 'float':
					domElement.type = 'InputDecimal'
					// Fraction digits set
					domElement.fractionDigits = ((val.fractionDigits != undefined)) ? parseInt(val.fractionDigits) : 2

					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min set
						domElement.min = parseFloat(val.min)
					}
					if(val.max != undefined) {
						// Max set
						domElement.max = parseFloat(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : 0.0
					break
				case 'str':
				case 'string':
					domElement.type = 'InputText'
					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min characters
						domElement.min = parseInt(val.min)
					}
					if(val.max != undefined) {
						// Max characters
						domElement.max = parseInt(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : ''
					break
				case 'txt':
				case 'text':
				case 'textarea':
					domElement.type = 'Textarea'
					// Check do we have min/max boudaries set
					if(val.min != undefined) {
						// Min characters
						domElement.min = parseInt(val.min)
					}
					if(val.max != undefined) {
						// Max characters
						domElement.max = parseInt(val.max)
					}
					domElement.name = key
					domElement.value = (val.value != undefined) ? val.value : ''
					break
				case 'bool':
				case 'boolean':
					domElement.type = 'InputSwitch'
					domElement.name = key
					domElement.value = (val.value != undefined) ? (val.value.toLowerCase() === 'true') : false
					break
				case 'array':
					// Multiple or single selection needed
					domElement.type = (val.multiple == true) ? 'MultiSelect' : 'Dropdown'
					domElement.name = key
					domElement.options = (val.options != undefined && Array.isArray(val.options)) ? val.options : []
					domElement.value = (val.value != undefined) ? val.value : null
					break
				default:
					console.log(`Unknown property type '${type}'`)
					break
			}
			this.formElements.push(domElement)
		}
	},
	// Check if IPNS key alsready exists
	keyExists(key, keys) {
		return {
			exists: keys.filter((k) => {return k.name == key}).length > 0,
			index: keys.map((k) => {return k.name}).indexOf(key)
		}
	},
	async getWallets() {
		const walletsChainKeyId = 'co2.storage-wallets'
		const walletsChainKeyCheck = this.keyExists(walletsChainKeyId, this.nodeKeys)
		let walletsChainKey, walletsChainSub, walletsChainCid
		if(!walletsChainKeyCheck.exists) {
			// Create key for wallet chain
			const walletKey = await this.ipfs.key.gen(this.selectedAddress, {
				type: 'ed25519',
				size: 2048
			})
			
			this.wallets[this.selectedAddress] = walletKey

			// Create key for wallets chain
			walletsChainKey = await this.ipfs.key.gen(walletsChainKeyId, {
				type: 'ed25519',
				size: 2048
			})

			// Genesis
			this.wallets.parent = null

			// Create dag struct
			walletsChainCid = await this.ipfs.dag.put(this.wallets, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})
	
			// Publish pubsub
			walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
				lifetime: '87600h',
				key: walletsChainKey.id
			})

			console.log(`Wallets CID: ${walletsChainCid.cid}, Key ${walletsChainKey.id}`)
		}
		else {
			// Get the key
			walletsChainKey = this.nodeKeys[walletsChainKeyCheck.index]
			const walletsChainKeyName = `/ipns/${walletsChainKey.id}`

			// Resolve IPNS name
			for await (const name of this.ipfs.name.resolve(walletsChainKeyName)) {
				walletsChainCid = name.replace('/ipfs/', '')
			}
			walletsChainCid = CID.parse(walletsChainCid)

			// Get last walletsChain block
			this.wallets = await this.ipfs.dag.get(walletsChainCid)

			// Check if wallets list already contains this wallet
			if(this.wallets[this.selectedAddress] == undefined) {
				// Create key for wallet chain
				const walletKey = await this.ipfs.key.gen(this.selectedAddress, {
					type: 'ed25519',
					size: 2048
				})
				this.wallets[this.selectedAddress] = walletKey

				this.wallets.parent = walletsChainCid.cid

				// Create new dag struct
				walletsChainCid = await this.ipfs.dag.put(this.wallets, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})

				// Link key to the latest block
				walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
					lifetime: '87600h',
					key: walletsChainKey.id
				})

				console.log(`Wallets CID: ${walletsChainCid.cid}, Key ${walletsChainKey.id}`)
			}
		}
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language
	],
	components: {
		Header,
		JsonEditor,
		InputText,
		InputNumber,
		Dropdown,
		MultiSelect,
		Textarea,
		InputSwitch,
		SplitButton,
		Toast,
		DataTable,
		Column
	},
	directives: {
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

			schemas: [
				{
					"creator": "0x4d2f165969e5bddc21c31a04626c2acd1283685f",
					"cid": "bafkreigxldrh3lo2spyg424ga4r7srss4f4umm3v7njljod7qvyjtvlg7e",
					"name": "GREEN-E® ENERGY RENEWABLE ATTESTATION FROM WHOLESALE PROVIDER OF ELECTRICITY OR RECS",
					"base": "Verra, Gold Standard",
					"use": 1253,
					"fork": 12
				},
				{
					"creator": "0x4d2f165969e5bddc21c31a04626c2acd1283685f",
					"cid": "bafkreih5bgzxicmu5uck4vteekms3ot4itpvif3tk2uma6ocufo7yd4cii",
					"name": "Statnelt",
					"base": "Verra",
					"use": 12,
					"fork": 1
				},
				{
					"creator": "0x4d2f165969e5bddc21c31a04626c2acd1283685f",
					"cid": "bafkreib5dmwkopgu5fb2a572o6x652shwsf45v74xfdvrnllscgunzqese",
					"name": "The International REC standard",
					"base": null,
					"use": 1,
					"fork": 0
				}
			],
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

			createSchemaOptions: [
				{
					label: 'Modify',
					icon: 'pi pi-refresh',
					command: () => {
						this.$toast.add({severity:'success', summary:'Modified', detail:'Schema is modified', life: 3000});
					}
				}
			],

			schemaName: '',
			ipfs: null,
			nodeKeys: [],
			wallets: {}
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
