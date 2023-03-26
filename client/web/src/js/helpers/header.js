import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'

import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

import { Auth, FGStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null) {
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr, fgApiHost: this.fgApiUrl, fgApiToken: this.fgApiToken}))
		let ipfs = await this.fgStorage.ensureIpfsIsRunning()
	}
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
	fgApiUrl() {
		return this.$store.getters['main/getFgApiUrl']
	},
	mode() {
		return this.$store.getters['main/getMode']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	fgApiToken() {
		return this.$store.getters['main/getFgApiToken']
	},
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	}
}

const watch = {
	dataChain() {
		if(this.dataChain == null || !this.dataChain.length)
			return

		this.setCookie('storage.co2.chain_name', this.dataChain, 365)

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
	let chainName = null
	if(this.$route.query['chain_name'] != undefined) {
		chainName = this.$route.query['chain_name']
		this.setDataChain(chainName)
	}
	else {
		chainName = this.getCookie('storage.co2.chain_name')
		if(chainName != null)
			this.setDataChain(chainName)
	}

	this.auth.accountsChanged(this.handleAccountsChanged)
	this.auth.accountDisconnect(this.handleAccountDisconnect)
}

const methods = {
	async getToken() {
		let token = this.fgApiToken || this.getCookie('storage.co2.token')
		if(token == null || token.length == 0) {
			try {
				token = (await this.fgStorage.getApiToken(false)).result.data.token
				this.setCookie('storage.co2.token', token, 365)
			} catch (error) {
				console.log(error)
			}
		}
		else {
			this.fgStorage.fgApiToken = token
			this.$store.dispatch('main/setFgApiToken', token)
		}
		return token	
	},
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
	async handleAccountsChanged(accounts) {
		this.eraseCookie('storage.co2.token')
		this.eraseCookie('storage.co2.token-validity')
		this.fgStorage.fgApiToken = null
		this.$store.dispatch('main/setFgApiToken', null)
		await this.getToken()
		this.authenticate()
	},
	handleAccountDisconnect(chain) {
		this.eraseCookie('storage.co2.token')
		this.eraseCookie('storage.co2.token-validity')
		this.fgStorage.fgApiToken = null
		this.$store.dispatch('main/setFgApiToken', null)
		this.$emit('selectedAddressUpdate', null)
	},
	async loadDataChains(offset, limit) {
		if(offset == undefined && limit == undefined) {
			offset = 0
			limit = 10
			this.dataChains.length = 0
		}
		try {
			const dataChainsResponse = (await this.fgStorage.listDataChains(offset, limit)).result
			if(dataChainsResponse.length) {
				const total = dataChainsResponse[0].total
				this.totalDataChains = total
				this.dataChains = this.dataChains.concat(dataChainsResponse.map((el)=>{return el.chain_name}))
				if(total > this.dataChains.length)
					await this.loadDataChains(offset + limit, limit)
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
		navigate,
		cookie
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
