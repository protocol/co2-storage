import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'

import { Auth } from '@co2-storage/js-api'

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
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
	async account() {
		if(this.selectedAddress == undefined) {
			await this.authenticate()
		}
		else {
//			this.navigate('/profile')
		}
	},
	async authenticate() {
		const authResponse = await this.auth.authenticate()
		if(authResponse.error != null) {
			this.$emit('walletError', authResponse.error)
			return
		}
		this.$emit('selectedAddressUpdate', authResponse.result)
	},
	handleAccountsChanged(accounts) {
		this.authenticate()
	},
	handleAccountDisconnect(chain) {
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
		navigate
	],
	components: {
	},
	directives: {
	},
	name: 'Header',
	data () {
		return {
			auth: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
