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
					this.$store.dispatch('main/setFgApiToken', null)
					this.eraseCookie('storage.co2.token')
					return await this.getToken()
				}
			} catch (error) {
				this.$store.dispatch('main/setFgApiToken', null)
				this.eraseCookie('storage.co2.token')
				return await this.getToken()
			}
		}
		this.fgStorage.setApiToken(token)
		this.$store.dispatch('main/setFgApiToken', token)
	
		return token	
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
