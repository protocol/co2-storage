import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'

import { create } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'

import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import {FilterMatchMode,FilterService} from 'primevue/api'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	dashboardClass() {
		return this.theme + '-dashboard-' + this.themeVariety
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
		await this.mySchemasAndAssets()
	}
}

const mounted = async function() {
}

const methods = {
	navigate(path) {
		this.$router.push({ path: path })
	},
	// Check if IPNS key alsready exists
	keyExists(key, keys) {
		return {
			exists: keys.filter((k) => {return k.name == key}).length > 0,
			index: keys.map((k) => {return k.name}).indexOf(key)
		}
	},
	async getWallets() {
		if(this.ipfs == null)
			// Attach to a node
			this.ipfs = await create('/dns4/rqojucgt.co2.storage/tcp/5002/https')

		// Get existing node keys
		this.nodeKeys = await this.ipfs.key.list()

		const walletsChainKeyId = 'co2.storage-wallets'
		const walletsChainKeyCheck = this.keyExists(walletsChainKeyId, this.nodeKeys)
		let walletsChainKey, walletsChainSub, walletsChainCid
		if(!walletsChainKeyCheck.exists) {
			// Create key for wallet chain
			const walletChainKey = await this.ipfs.key.gen(this.selectedAddress, {
				type: 'ed25519',
				size: 2048
			})

			const walletChain = {
				"parent": null,
				"wallet": this.selectedAddress,
				"templates": [],
				"assets": []
			}
			
			const walletChainCid = await this.ipfs.dag.put(walletChain, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})

			const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
				lifetime: '87600h',
				key: walletChainKey.id
			})

			this.wallets[this.selectedAddress] = walletChainKey.id

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
			this.wallets = (await this.ipfs.dag.get(walletsChainCid)).value

			// Check if wallets list already contains this wallet
			if(this.wallets[this.selectedAddress] == undefined) {
				// Create key for wallet chain
				const walletChainKey = await this.ipfs.key.gen(this.selectedAddress, {
					type: 'ed25519',
					size: 2048
				})

				const walletChain = {
					"parent": null,
					"wallet": this.selectedAddress,
					"templates": [],
					"assets": []
				}
				
				const walletChainCid = await this.ipfs.dag.put(walletChain, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})
	
				const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
					lifetime: '87600h',
					key: walletChainKey.id
				})

				this.wallets[this.selectedAddress] = walletChainKey.id

				this.wallets.parent = walletsChainCid.toString()

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
			}
		}
//		console.dir(walletsChainCid, {depth: null})
//		console.dir(walletsChainKey, {depth: null})
//		console.dir(walletsChainSub, {depth: null})
	},
	async mySchemasAndAssets() {
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

		this.assets = walletChain.assets
		this.assetsLoading = false
		this.schemas = walletChain.templates
		this.schemasLoading = false
	},
	showAsset(assetObj) {
		this.navigate('/assets/' + assetObj.data.cid)
	},
	showSchema(schemaObj) {
		this.navigate('/schemas/' + schemaObj.data.cid)
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
		InputText,
		DataTable,
		Column
	},
	directives: {
	},
	name: 'Dasboard',
	data () {
		return {
			currentProvider: null,
			selectedAddress: null,
			walletError: null,
			wallets: {},
			assets: [],
			assetsFilters: {
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			assetsMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			assetsLoading: true,
			schemas: [],
			schemasFilters: {
				'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
				'cid': {value: null, matchMode: FilterMatchMode.CONTAINS}
			},
			schemasMatchModeOptions: [
				{label: 'Contains', value: FilterMatchMode.CONTAINS},
				{label: 'Contains', value: FilterMatchMode.CONTAINS}
			],
			schemasLoading: true
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
