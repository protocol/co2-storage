import { Auth } from '@co2-storage/js-api'

import cookie from '@/src/mixins/cookie/cookie.js'

const computed = {
	co2StorageAuthType() {
		return this.$store.getters['main/getCO2StorageAuthType']
	},
	selectedAddress() {
		return this.$store.getters['main/getSelectedAddress']
	}
}

const methods = {
	async authenticate() {
		const auth = new Auth(this.co2StorageAuthType)
		const authResponse = await auth.authenticate()
		auth.accountConnect(this.handleAccountConnect, this.handleAccountConnectError)
		auth.accountsChanged(this.handleAccountsChanged, this.handleAccountsChangedError)
		auth.accountDisconnect(this.handleAccountDisconnect, this.handleAccountDisconnectError)
		auth.chainChanged(this.handleChainChanged, this.handleChainChangedError)

		if(authResponse.error != null) {
			this.walletError = authResponse.error.message
			this.$store.dispatch('main/setSelectedAddress', null)
			return authResponse
		}
		this.$store.dispatch('main/setSelectedAddress', authResponse.result)
		return authResponse
	},
	handleAccountConnect(connectionInfo) {
	},
	handleAccountConnectError(error) {
	},
	handleAccountsChanged(accounts) {
		this.eraseCookie('storage.co2.token')
		this.eraseCookie('storage.co2.token-validity')
		const selectedAddress = accounts[0]
		if(selectedAddress) {
			this.$store.dispatch('main/setSelectedAddress', selectedAddress)
		}
		else {
			this.$store.dispatch('main/setSelectedAddress', null)
		}
		this.$store.dispatch('main/setFgApiToken', null)
		this.$emit('refresh')

	},
	handleAccountsChangedError(error) {
		console.log(error)
	},
	handleAccountDisconnect(disconnectError) {
		this.eraseCookie('storage.co2.token')
		this.eraseCookie('storage.co2.token-validity')
		this.$store.dispatch('main/setFgApiToken', null)
		this.$store.dispatch('main/setSelectedAddress', null)
		this.$emit('refresh')
	},
	handleAccountDisconnectError(error) {
		console.log(error)
	},
	handleChainChanged(chain) {
		this.eraseCookie('storage.co2.token')
		this.eraseCookie('storage.co2.token-validity')
		this.$store.dispatch('main/setFgApiToken', null)
		this.$store.dispatch('main/setSelectedAddress', null)
		this.$emit('refresh')
	},
	handleChainChangedError(error) {
	},
	async accounts() {
		const auth = new Auth(this.co2StorageAuthType)
		return await auth.connectedAccounts()
	}
}

export const authentication = {
	computed: computed,
	mixins: [
		cookie
	],
	data () {
		return {
		}
	},
	methods: methods
}
