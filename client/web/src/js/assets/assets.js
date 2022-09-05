import language from '@/src/mixins/i18n/language.js'
import getWallets from '@/src/mixins/wallet/get-wallets.js'
import loadSchemas from '@/src/mixins/schema/load-schemas.js'
import keyExists from '@/src/mixins/ipfs/key-exists.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'

import Header from '@/src/components/helpers/Header.vue'
import FormElements from '@/src/components/helpers/FormElements.vue'

import { CID } from 'multiformats/cid'

import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Textarea from 'primevue/textarea'
import InputSwitch from 'primevue/inputswitch'
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
			
			// If schema content is deleted reset schema
			if(this.json && Object.keys(this.json).length === 0 && Object.getPrototypeOf(this.json) === Object.prototype)
				this.schema = null
		},
		deep: true,
		immediate: false
	}
}

const mounted = async function() {
	const routeParams = this.$route.params
	if(routeParams['cid']) {
		this.assetCid = routeParams['cid']

		await this.getWallets()
		await this.getAsset(this.assetCid)
	}
}

const methods = {
	async addAsset() {
		const assetData = {
			"schema": this.schema,
			"date": (new Date()).toISOString(),
			"data": this.formElements
				.filter((f) => {
					return f && Object.keys(f).length > 0 && Object.getPrototypeOf(f) === Object.prototype
				})
				.map((f) => {
				return {
					[f.name] : f.value
				}
			}),
			"links": []
		}

		if(!assetData.data.length) {
			this.$toast.add({severity:'error', summary:'Empty asset', detail:'Please add environmental assets', life: 3000})
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

		// Create asset CID
		const assetCid = await this.ipfs.dag.put(assetData, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		this.assetCid = assetCid.toString()

		this.$toast.add({severity:'success', summary:'Created', detail:'Environmental asset is created', life: 3000})

		const asset = {
			"creator": this.selectedAddress,
			"cid": assetCid.toString(),
			"name": this.assetName,
			"schema": this.schema
		}

		walletChain.assets.push(asset)
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
		
		this.$toast.add({severity:'success', summary:'Chain updated', detail:'Environmental asset chain is updated', life: 3000})
		
//		console.dir(walletChainCid, {depth: null})
//		console.dir(walletChainKey, {depth: null})
//		console.dir(walletChainSub, {depth: null})
	},
	async setSchema(row, keepAssetCid) {
		// Get schema
		const schemaCid = CID.parse(row.data.cid)
		const schema = (await this.ipfs.dag.get(schemaCid)).value
		this.json = JSON.parse(JSON.stringify(schema))

		if(!this.assetName || !this.assetName.length || !keepAssetCid)
			this.assetName = `Asset based on ${row.data.name} template created by ${this.selectedAddress}`
		this.schema = row.data.cid

		if(!keepAssetCid)
			this.assetCid = null
	},
	async getAsset(cid) {
		const assetCid = CID.parse(cid)
		const asset = (await this.ipfs.dag.get(assetCid)).value

		await this.setSchema({"data": {"cid": asset.schema}}, true)

		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary:'Wallet not connected', detail:'Please connect your wallet in order to see your environmental assets', life: 3000})
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

		const assets = walletChain.assets
		this.assetName = assets.filter((a) => {return a.cid == cid})[0].name

		for (let element of this.formElements) {
			const key = element.name

			const keys = asset.data.map((a) => {return Object.keys(a)[0]})
			const valIndex = keys.indexOf(key)
			if(valIndex == -1)
				continue
			
			element.value = asset.data[valIndex][key]
		}
	},
	filesUploader(event) {
		this.$toast.add({severity:'warn', summary: this.$t('message.schemas.upload-not-allowed'), detail:  this.$t('message.schemas.upload-not-allowed-description'), life: 3000})
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
		console.log(sync)
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
	name: 'Assets',
	data () {
		return {
			currentProvider: null,
			selectedAddress: null,
			walletError: null,
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
			schema: null,
			assetName: '',
			ipfs: null,
			nodeKeys: [],
			wallets: {},
			assetCid: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
