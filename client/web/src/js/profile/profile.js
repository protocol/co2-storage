import language from '@/src/mixins/i18n/language.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import moment from 'moment'

import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'

import { EstuaryStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init Estuary storage
	if(this.estuaryStorage == null)
		this.$store.dispatch('main/setEstuaryStorage', new EstuaryStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr}))
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
	estuaryStorage() {
		return this.$store.getters['main/getEstuaryStorage']
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
			getEstuaryKeyResponse = (await this.estuaryStorage.getEstuaryKey()).result
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
			const createEstuaryKeyResponse = (await this.estuaryStorage.createEstuaryKey()).result
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
			const deleteEstuaryKeyResponse = (await this.estuaryStorage.deleteEstuaryKey()).result
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
			estuaryKeyValidity: null
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
