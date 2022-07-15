import language from '@/src/mixins/i18n/language.js'

import Web3 from 'web3'
import WalletConnectProvider from "@walletconnect/web3-provider"

const created = function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)
}

const computed = {
	mainClass() {
		return this.theme + '-main-' + this.themeVariety
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
}

const methods = {
	async initMetamask() {
		let web3
		if (window.ethereum) {
			await window.ethereum.request({ method: "eth_requestAccounts" })
			web3 = new Web3(window.ethereum)
			console.log(web3)
		}
		else {
				console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
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
	}
}

const destroyed = function() {
}

export default {
	mixins: [
		language
	],
	components: {
	},
	directives: {
	},
	name: 'Main',
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
