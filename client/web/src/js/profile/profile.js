import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import moment from 'moment'

import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'

import { EstuaryStorage, FGStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init Estuary storage
	if(this.estuaryStorage == null)
		this.$store.dispatch('main/setEstuaryStorage', new EstuaryStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null)
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))
}

const computed = {
	profileClass() {
		return this.theme + '-profile-' + this.themeVariety
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
	themeName() {
		return this.$store.getters['main/getThemeName']
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
	estuaryStorage() {
		return this.$store.getters['main/getEstuaryStorage']
	},
	fgStorage() {
		return this.$store.getters['main/getFGStorage']
	},
	ipldExplorerUrl() {
		return this.$store.getters['main/getIpldExplorerUrl']
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

		await this.init()
	},
	async refresh() {
		if(this.refresh)
			await this.init()
		this.refresh = false
	}
}

const mounted = async function() {
	await this.init()
}

const methods = {
	changeTheme() {
		// TODO
		this.$toast.add({severity: 'info', summary: this.$t('message.profile.no-other-themes-available'), detail: this.walletError, life: 3000})
	},
	async init() {
		const getEstuaryKeyResponse = await this.getEstuaryKey()
		if(!getEstuaryKeyResponse) {
			this.estuaryKey = null
			this.estuaryKeyValidity = null
			return
		}
		this.estuaryKey = getEstuaryKeyResponse.token
		this.estuaryKeyValidity = getEstuaryKeyResponse.expiry
	},
	async getEstuaryKey() {
		let getEstuaryKeyResponse
		try {
			this.loadingMessage = this.$t('message.shared.loading-something', {something: ''})
			this.loading = true

			switch (this.mode) {
				case 'fg':
					getEstuaryKeyResponse = (await this.fgStorage.getEstuaryKey()).result
					break
				case 'estuary':
					getEstuaryKeyResponse = (await this.estuaryStorage.getEstuaryKey()).result
					break
				default:
					this.$store.dispatch('main/setMode', 'fg')
					getEstuaryKeyResponse = (await this.fgStorage.getEstuaryKey()).result
					break
			}

		} catch (error) {
			return null
		} finally {
			this.loading = false
			this.loadingMessage = ''
		}
		return getEstuaryKeyResponse
	},
	async createEstuaryKey() {
		try {
			this.loadingMessage = this.$t('message.shared.loading-something', {something: ''})
			this.loading = true

			let createEstuaryKeyResponse
			switch (this.mode) {
				case 'fg':
					createEstuaryKeyResponse = (await this.fgStorage.createEstuaryKey()).result
					break
				case 'estuary':
					createEstuaryKeyResponse = (await this.estuaryStorage.createEstuaryKey()).result
					break
				default:
					this.$store.dispatch('main/setMode', 'fg')
					createEstuaryKeyResponse = (await this.fgStorage.createEstuaryKey()).result
					break
			}

			if(createEstuaryKeyResponse) {
				this.estuaryKey = createEstuaryKeyResponse.token
				this.estuaryKeyValidity = createEstuaryKeyResponse.expiry
			}
		} catch (error) {
			console.log(error)
		} finally {
			this.loading = false
			this.loadingMessage = ''
		}
	},
	async revokeEstuaryKey() {
		if (this.estuaryKey == null) {
			this.$toast.add({severity: 'error', summary: this.$t('message.profile.no-estuary-key-created'), detail: this.walletError, life: 3000})
			return
		}

		try {
			this.loadingMessage = this.$t('message.shared.loading-something', {something: ''})
			this.loading = true

			let deleteEstuaryKeyResponse
			switch (this.mode) {
				case 'fg':
					deleteEstuaryKeyResponse = (await this.fgStorage.deleteEstuaryKey()).result
					break
				case 'estuary':
					deleteEstuaryKeyResponse = (await this.estuaryStorage.deleteEstuaryKey()).result
					break
				default:
					this.$store.dispatch('main/setMode', 'fg')
					deleteEstuaryKeyResponse = (await this.fgStorage.deleteEstuaryKey()).result
					break
			}

			if(deleteEstuaryKeyResponse) {
				this.estuaryKey = null
				this.estuaryKeyValidity = null
			}
		} catch (error) {
			console.log(error)
		} finally {
			this.loading = false
			this.loadingMessage = ''
		}
	}
}

const beforeUnmount = async function() {
}

export default {
	mixins: [
		language
	],
	components: {
		Header,
		LoadingBlocker,
		Toast
	},
	directives: {
		Tooltip
	},
	name: 'Profile',
	data () {
		return {
			moment: moment,
			dateFormat: 'DD.MM.YYYY HH:mm:ss',
			selectedAddress: null,
			walletError: null,
			loading: false,
			loadingMessage: '',
			estuaryKey: null,
			estuaryKeyValidity: null,
			refresh: false
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
