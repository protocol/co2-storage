import cookie from '@/src/mixins/cookie/cookie.js'

const computed = {
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
	}
}

const methods = {
	async loadApiProfile() {
		if(this.fgApiProfileName == null && this.fgApiProfileDefaultDataLicense == null)
			try {
				await this.getApiProfile()
			} catch (error) {
				let tkn = (await this.fgStorage.getApiToken(true)).result.data.token
				this.fgStorage.fgApiToken = tkn
				this.$store.dispatch('main/setFgApiToken', tkn)
				this.setCookie('storage.co2.token', tkn, 365)
				await this.getApiProfile()
			}
	},
	async getApiProfile() {
		const getApiProfileResponse = await this.fgStorage.getApiProfile()
		if(!getApiProfileResponse || getApiProfileResponse.error)
			return
		this.$store.dispatch('main/setFgApiProfileDefaultDataLicense', getApiProfileResponse.result.data.default_data_license)
		this.$store.dispatch('main/setFgApiProfileName', getApiProfileResponse.result.data.name)
	}
}

export const apiProfile = {
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
