const methods = {
	async getToken() {
		let token = this.fgApiToken || this.getCookie('storage.co2.token')
		if(token == null || token.length == 0) {
			try {
				token = (await this.fgStorage.getApiToken(false)).result.data.token
				this.setCookie('storage.co2.token', token, 365)
			} catch (error) {
				return {
					result: null,
					error: error
				}
			}
		}
		else {
			try {
				const checkTokenValidity = await this.fgStorage.checkApiTokenValidity(token)
				if(checkTokenValidity.error) {
					return {
						result: null,
						error: checkTokenValidity.error
					}
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
	
		return {
			result: token,
			error: null
		}
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
