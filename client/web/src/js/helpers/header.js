import language from '@/src/mixins/i18n/language.js'
import navigate from '@/src/mixins/router/navigate.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import { fgStorage } from '@/src/mixins/ipfs/fg-storage.js'

import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	await this.initFgStorage()
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
	ipfs() {
		return this.$store.getters['main/getIpfs']
	},
	selectedAddress() {
		return this.$store.getters['main/getSelectedAddress']
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
	ipfsChainName() {
		this.setDataChain(this.ipfsChainName)
	},
	dataChain() {
		if(this.dataChain == null || !this.dataChain.length)
			return

		this.setCookie('storage.co2.chain_name', this.dataChain, 365)

		this.$store.dispatch('main/setIpfsChainName', this.dataChain)

		if(this.dataChains.indexOf(this.ipfsChainName) == -1)
			this.dataChains.unshift(this.ipfsChainName)
		this.addingDataChain = false
		this.newDataChain = null
	}
}

const mounted = async function() {
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
}

const methods = {
	async account() {
		if(this.selectedAddress == undefined) {
			this.$emit('authenticate')
		}
		else {
			this.navigate('/profile')
		}
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
	props: [],
	mixins: [
		language,
		navigate,
		cookie,
		fgStorage
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
