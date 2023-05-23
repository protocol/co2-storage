import language from '@/src/mixins/i18n/language.js'
import cookie from '@/src/mixins/cookie/cookie.js'
import copyToClipboard from '@/src/mixins/clipboard/copy-to-clipboard.js'

import Header from '@/src/components/helpers/Header.vue'
import LoadingBlocker from '@/src/components/helpers/LoadingBlocker.vue'

import moment from 'moment'

import Toast from 'primevue/toast'
import Tooltip from 'primevue/tooltip'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'

import { FGStorage } from '@co2-storage/js-api'

const created = async function() {
	const that = this
	
	// set language
	this.setLanguage(this.$route)

	// init FG storage
	if(this.mode == 'fg' && this.fgStorage == null)
		this.$store.dispatch('main/setFGStorage', new FGStorage({authType: this.co2StorageAuthType, ipfsNodeType: this.co2StorageIpfsNodeType, ipfsNodeAddr: this.co2StorageIpfsNodeAddr, fgApiHost: this.fgApiUrl, fgApiToken: this.fgApiToken}))
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
	},
	dl() {
		this.$store.dispatch('main/setFgApiProfileDefaultDataLicense', this.dl)
	},
	cn() {
		this.$store.dispatch('main/setFgApiProfileName', this.cn)
	}
}

const mounted = async function() {
}

const methods = {
	async init() {
		this.apiToken = this.fgApiToken || this.getCookie('storage.co2.token')
		if(this.apiToken == null || this.apiToken.length == 0) {
			await this.getApiToken()
		}
		else {
			try {
				const checkTokenValidity = await this.fgStorage.checkApiTokenValidity(this.apiToken)
				if(checkTokenValidity.error || checkTokenValidity.result == false) {
					this.fgApiToken = null
					this.eraseCookie('storage.co2.token')
					await this.getApiToken(true)
				}
			} catch (error) {
				this.fgApiToken = null
				this.eraseCookie('storage.co2.token')
				await this.getApiToken(true)
			}

			this.apiTokenValidity = this.getCookie('storage.co2.token-validity')
			if(!this.fgApiToken) {
				this.$store.dispatch('main/setFgApiToken', this.apiToken)
				this.fgStorage.setApiToken(this.fgApiToken)
			}
		}

		const getEstuaryKeyResponse = await this.getEstuaryKey()
		if(!getEstuaryKeyResponse) {
			this.estuaryKey = null
			this.estuaryKeyValidity = null
			return
		}
		this.estuaryKey = getEstuaryKeyResponse.token
		this.estuaryKeyValidity = getEstuaryKeyResponse.expiry

		this.cn = this.fgApiProfileName
		this.dl = this.fgApiProfileDefaultDataLicense
		if(this.cn == null && this.dl == null)
			try {
				await this.getApiProfile()
			} catch (error) {
				await this.getApiToken(true)
				await this.getApiProfile()
			}
	},
	async getApiProfile() {
		const getApiProfileResponse = await this.fgStorage.getApiProfile()
		if(!getApiProfileResponse || getApiProfileResponse.error) {
			this.dl = null
			this.cn = null
			return
		}
		this.dl = getApiProfileResponse.result.data.default_data_license
		this.cn = getApiProfileResponse.result.data.name
	},
	async getApiToken(issueNew) {
		const getApiTokenResponse = await this.fgStorage.getApiToken(issueNew)
		if(!getApiTokenResponse || getApiTokenResponse.error) {
			this.apiToken = null
			this.apiTokenValidity = null
			return
		}
		this.apiToken = getApiTokenResponse.result.data.token
		this.apiTokenValidity = getApiTokenResponse.result.data.validity

		this.setCookie('storage.co2.token', this.apiToken, 365)
		this.setCookie('storage.co2.token-validity', this.apiTokenValidity, 365)
		this.$store.dispatch('main/setFgApiToken', this.apiToken)
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
	},
	async saveContributorName() {
		try {
			const updateProfileNameResponse = await this.fgStorage.updateProfileName(this.cn)
			if(updateProfileNameResponse.result.data.updated) {
				this.$toast.add({severity: 'success', summary: this.$t('message.shared.success'), detail: this.$t('message.profile.profile-updated'), life: 3000})
			}
			else {
				this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: this.$t('message.profile.profile-not-updated'), life: 3000})
			}
		} catch (error) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: error, life: 3000})
		}
	},
	async saveDefaultLicense() {
		try {
			const updateProfileDefaultDataLicenseResponse = await this.fgStorage.updateProfileDefaultDataLicense(this.dl)
			if(updateProfileDefaultDataLicenseResponse.result.data.updated) {
				this.$toast.add({severity: 'success', summary: this.$t('message.shared.success'), detail: this.$t('message.profile.profile-updated'), life: 3000})
			}
			else {
				this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: this.$t('message.profile.profile-not-updated'), life: 3000})
			}
		} catch (error) {
			this.$toast.add({severity: 'error', summary: this.$t('message.shared.error'), detail: error, life: 3000})
		}
	}
}

const beforeUnmount = async function() {
}

export default {
	mixins: [
		language,
		cookie,
		copyToClipboard
	],
	components: {
		Header,
		LoadingBlocker,
		Toast,
		InputText,
		Dropdown
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
			apiToken: null,
			apiTokenValidity: null,
			refresh: false,
			dl: null,
			cn: null,
			licenseOptions: [
				"CC0 (No Rights Reserved, Public Domain)",
				"CC-BY (Attribution)",
				"CC BY-SA (Attribution-ShareAlike)",
				"CC BY-NC (Attribution-NonCommercial)",
				"Reserved"
			]
		}
	},
	created: created,
	computed: computed,
	watch: watch,
	mounted: mounted,
	methods: methods,
	beforeUnmount: beforeUnmount
}
