import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'

import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

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
	}
	
	this.loadingMessage = this.$t('message.shared.initializing-ipfs-node')
	this.loading = true
	const ipfs = await this.fgStorage.ensureIpfsIsRunning()
	this.$store.dispatch('main/setIpfs', ipfs)
	this.loading = false
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
	ipfs() {
		return this.$store.getters['main/getIpfs']
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
	fgApiProfileDefaultDataLicense() {
		return this.$store.getters['main/getFgApiProfileDefaultDataLicense']
	},
	fgApiProfileName() {
		return this.$store.getters['main/getFgApiProfileName']
	},
	ipfsChainName() {
		return this.$store.getters['main/getIpfsChainName']
	}
}

const watch = {
}

const mounted = async function() {
	this.auth = new Auth(this.co2StorageAuthType)
	if(this.requestLogin)
		await this.authenticate()

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
				this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: error, life: 3000})
				return
			}
		}
		else {
			try {
				const checkTokenValidity = await this.fgStorage.checkApiTokenValidity(token)
				if(checkTokenValidity.error) {
					this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: checkTokenValidity.error, life: 3000})
					return
				}
				if(checkTokenValidity.result == false) {
					this.fgApiToken = null
					this.eraseCookie('storage.co2.token')
					return await this.getToken()
				}
			} catch (error) {
				this.fgApiToken = null
				this.eraseCookie('storage.co2.token')
				return await this.getToken()
			}
		}
		this.fgStorage.setApiToken(token)
		this.$store.dispatch('main/setFgApiToken', token)
	
		return token	
	},
	async account() {
		if(this.selectedAddress == undefined)
			await this.authenticate()
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
		Button,
		LoadingBlocker
	},
	directives: {
	},
	name: 'Header',
	data () {
		return {
			auth: null,
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
