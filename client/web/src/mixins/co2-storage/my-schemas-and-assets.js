const methods = {
	async mySchemasAndAssets() {
		let walletChainKey = this.wallets[this.selectedAddress]
		if(walletChainKey == undefined) {
			this.$toast.add({severity:'error', summary: this.$t('message.shared.wallet-not-connected'), detail: this.$t('message.shared.wallet-not-connected-description'), life: 3000})
			return null
		}

		const accountSchemasAndAssetsResponse = await this.storage.accountSchemasAndAssets(walletChainKey)
		if(accountSchemasAndAssetsResponse.error != null) {
			this.$toast.add({severity:'error', summary: this.$t('message.shared.error'), detail: accountSchemasAndAssetsResponse.error, life: 3000})
			return null
		}

		return accountSchemasAndAssetsResponse.result
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
