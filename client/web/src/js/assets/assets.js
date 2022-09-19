import language from '@/src/mixins/i18n/language.js'
import loadSchemas from '@/src/mixins/schema/load-schemas.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'
import updateForm from '@/src/mixins/form-elements/update-form.js'
import syncFormFiles from '@/src/mixins/form-elements/sync-form-files.js'
import humanReadableFileSize from '@/src/mixins/file/human-readable-file-size.js'

import Header from '@/src/components/helpers/Header.vue'
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
		const storage = new Storage(this.selectedAddress, null, null)	// default addr: /ip4/127.0.0.1/tcp/5001 (co2.storage local node: /dns4/rqojucgt.co2.storage/tcp/5002/https); default wallets key: 'co2.storage-wallets'
		if(storage.error != null) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: storage.error, life: 3000})
			return
		}
		const accounts = await storage.getAccounts()
		this.ipfs = accounts.result.ipfs
		this.wallets = accounts.result.list

		this.loading = false

		await this.loadSchemas()

		const routeParams = this.$route.params
		if(routeParams['cid'])
			this.assetCid = routeParams['cid']

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
	},
	async assetCid() {
		if(this.assetCid != undefined)
			await this.getAsset(this.assetCid)
	}
}

const mounted = async function() {
}

const methods = {
	async addAsset() {
		// If we have field types Image or Documents
		// add them to IPFS first and remap values with CIDs
		let fileContainingElements = this.formElements
			.filter((f) => {return f.type == 'Images' || f.type == 'Documents'})

		if (fileContainingElements.length) {
			this.loadingMessage = this.$t('message.assets.adding-images-and-documents-to-ipfs')
			this.loading = true
		}

		for (const fileContainingElement of fileContainingElements) {
			if(fileContainingElement.value == null)
				continue
			let newValue = []
			for await (const result of this.ipfs.addAll(fileContainingElement.value, {
				'cidVersion': 1,
				'hashAlg': 'sha2-256',
				'wrapWithDirectory': true,
				'progress': async (bytes, path) => {
					this.loadingMessage = `${this.$t('message.assets.adding-images-and-documents-to-ipfs')} - (${this.humanReadableFileSize(bytes)})`
				}
			})) {
			if(result.path != '')
				newValue.push({
					cid: result.cid.toString(),
					path: result.path,
					size: result.size
				})
			}
			// Map CIDs to asset data structure
			fileContainingElement.value = newValue.map((x) => x)
		}
		this.loadingMessage = this.$t('message.assets.creating-asset')
		this.loading = true

		let dateContainingElements = this.formElements
			.filter((f) => {return f.type == 'Date' || f.type == 'DateTime'})
		for (const dateContainingElement of dateContainingElements) {
			if(dateContainingElement.value == null)
				continue
			dateContainingElement.value = dateContainingElement.value.toISOString()
		}

		let datesContainingElements = this.formElements
			.filter((f) => {return f.type == 'Dates' || f.type == 'DateTimes' || f.type == 'DateRange' || f.type == 'DateTimeRange'})
		for (const datesContainingElement of datesContainingElements) {
			if(datesContainingElement.value == null)
				continue
			datesContainingElement.value = datesContainingElement.value.map((v) => {return v.toISOString()})
		}

		// Cretae asset data structure
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
			this.$toast.add({severity: 'error', summary: this.$t('message.assets.empty-asset'), detail: this.$t('message.assets.enter-environmental-asset-data'), life: 3000})
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

		// Create asset CID
		const assetCid = await this.ipfs.dag.put(assetData, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		this.assetCid = assetCid.toString()

		this.loadingMessage = ''
		this.loading = false

		this.$toast.add({severity: 'success', summary: this.$t('message.shared.created'), detail: this.$t('message.assets.asset-created'), life: 3000})

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

		const topic = this.$t('message.shared.chained-data-updated')
		const message = this.$t('message.shared.chained-data-updated-description')

		// Link key to the latest block
		const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
			lifetime: '87600h',
			key: walletChainKey
		})
		
		this.$toast.add({severity:'success', summary: topic, detail: message, life: 3000})
		this.$store.dispatch('main/setWalletChain', {
			cid: walletChainCid,
			key: walletChainKey,
			sub: walletChainSub
		})
	},
	async setSchema(row, keepAssetCid) {
		// Get schema
		const schemaCid = CID.parse(row.data.cid)
		const schema = (await this.ipfs.dag.get(schemaCid)).value
		this.json = JSON.parse(JSON.stringify(schema))

		if(!this.assetName || !this.assetName.length || !keepAssetCid)
			this.assetName = this.$t('message.assets.generic-asset-name', {template: row.data.name, wallet: this.selectedAddress})
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

		const assets = walletChain.assets
		this.assetName = assets.filter((a) => {return a.cid == cid})[0].name

		this.loading = true
		for await (let element of this.formElements) {
			const key = element.name

			const keys = asset.data.map((a) => {return Object.keys(a)[0]})
			const valIndex = keys.indexOf(key)
			if(valIndex == -1)
				continue
			
			if(element.type == 'Images' || element.type == 'Documents') {
				element.value = []
				const dfiles = asset.data[valIndex][key]
				if(dfiles != null)
					for await (const dfile of dfiles) {
						this.loadingMessage = this.$t('message.shared.loading-something', {something: dfile.path})
						let buffer = []
						const elementValueCid = CID.parse(dfile.cid)
						for await (const buf of this.ipfs.cat(elementValueCid)) {
							buffer.push(buf)
						}
						element.value.push({
							path: dfile.path,
							content: buffer,
							existing: true,
							cid: dfile.cid
						})
					}
			}
			else {
				this.loadingMessage = this.$t('message.shared.loading-something', {something: key})
				element.value = asset.data[valIndex][key]
			}
		}
		this.loading = false
		this.loadingMessage = ''
	},
	filesUploader(event) {
	},
	filesSelected(sync) {
		this.syncFormFiles(sync)
	},
	filesRemoved(sync) {
		this.syncFormFiles(sync)
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
		syncFormFiles,
		humanReadableFileSize
	],
	components: {
		Header,
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
	name: 'Assets',
	data () {
		return {
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
			wallets: {},
			assetCid: null,
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
