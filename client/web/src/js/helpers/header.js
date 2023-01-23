import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'

import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

import { Auth, FGStorage } from '@co2-storage/js-api'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null)
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))
}

const computed = {
	headerClass() {
		return this.theme + '-header-' + this.themeVariety
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
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	}
}

const watch = {
	dataChain() {
		if(this.dataChain == null || !this.dataChain.length)
			return

		this.$store.dispatch('main/setIpfsChainName', this.dataChain)
		if(this.dataChains.indexOf(this.ipfsChainName) == -1)
			this.dataChains.unshift(this.ipfsChainName)
		this.addingDataChain = false
		this.newDataChain = null
		this.$emit('refresh', null)
	}
}

const mounted = async function() {
	this.auth = new Auth(this.co2StorageAuthType)
	if(this.requestLogin)
		await this.authenticate()


	await this.loadDataChains()
	if(this.$route.query['chain_name'] != undefined)
		this.setDataChain(this.$route.query['chain_name'])

	this.auth.accountsChanged(this.handleAccountsChanged)
	this.auth.accountDisconnect(this.handleAccountDisconnect)
}

const methods = {
	async account() {
		if(this.selectedAddress == undefined) {
			await this.authenticate()
		}
		else {
			this.navigate('/profile')
		}
	},
	async authenticate() {
		const authResponse = await this.auth.authenticate()
		if(authResponse.error != null) {
			this.$emit('walletError', authResponse.error.message)
			return
		}
		this.$emit('selectedAddressUpdate', authResponse.result)
	},
	handleAccountsChanged(accounts) {
		this.authenticate()
	},
	handleAccountDisconnect(chain) {
		this.$emit('selectedAddressUpdate', null)
	},
	async loadDataChains() {
		try {
			const dataChainsResponse = (await this.fgStorage.listDataChains(this.assetsSearchOffset, this.assetsSearchLimit)).result
			if(dataChainsResponse.length) {
				const total = dataChainsResponse[0].total
				this.totalDataChains = total
				this.dataChains = this.dataChains.concat(dataChainsResponse.map((el)=>{return el.chain_name}))
				if(total > this.dataChains.length)
					await this.loadDataChains(this.dataChains.length)
			}
			else {
				this.totalDataChains = 0
			}
			if(this.dataChains.indexOf(this.ipfsChainName) == -1)
				this.dataChains.unshift(this.ipfsChainName)
			this.dataChain = this.ipfsChainName
		} catch (error) {
			console.log(error)
		}
	},
	setDataChain(dataChain) {
		this.dataChain = dataChain
	}
}

const destroyed = function() {
}

export default {
	props: [
		'requestLogin', 'selectedAddress'
	],
	mixins: [
		language,
		navigate
	],
	components: {
		Dropdown,
		InputText,
		Button
	},
	directives: {
	},
	name: 'Header',
	data () {
		return {
			auth: null,
			dataChains: [],
			totalDataChains: 1000,
			dataChain: 'sandbox',
			addingDataChain: false,
			newDataChain: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
