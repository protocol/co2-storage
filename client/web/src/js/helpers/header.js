import language from '@/src/mixins/i18n/language.js'

import Web3 from 'web3'
import WalletConnectProvider from "@walletconnect/web3-provider"

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
	}
}

const watch = {
}

const mounted = async function() {
	// TODO, enable other login methods
	if(this.requestLogin)
		this.initMetamask()
}

const methods = {
	// TODO, select wallet connection method
	async initMetamask() {
		let web3
		if (window.ethereum) {
			try {
				await window.ethereum.request({ method: "eth_requestAccounts" })
				web3 = new Web3(window.ethereum)
				this.$emit('currentProviderUpdate', web3.currentProvider)
			} catch (error) {
				this.$emit('walletError', error)
			}
		}
		else {
			// TODO, error popup
			console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
			this.$emit('currentProviderUpdate', null)
			this.$emit('walletError', 'Non-Ethereum browser detected. You should consider trying MetaMask!')
		}
	},
	async initWalletConnect() {
		let web3
		const provider = new WalletConnectProvider({
//			infuraId: "d755d0abf17b43ddb4af40e51744c65a",
			rpc: {
				137: "https://polygon-rpc.com/",
//				137: "https://rpc-mumbai.matic.today",
			},
		})

		await provider.enable()

		web3 = new Web3(provider)

		console.log(web3)
	},
	navigate(path) {
		this.$router.push({ path: path })
	}
}

const destroyed = function() {
}

export default {
	props: [
		'requestLogin', 'selectedAddress'
	],
	mixins: [
		language
	],
	components: {
	},
	directives: {
	},
	name: 'Header',
	data () {
		return {
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	destroyed: destroyed
}
