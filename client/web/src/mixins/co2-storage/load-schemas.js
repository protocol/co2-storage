const methods = {
	async loadSchemas() {
		let wallets = Object.keys(this.wallets)
		wallets.splice(wallets.indexOf("parent"), 1)
		if(!wallets.length)
			return

		this.schemas.length = 0

		// Browse all wallets for stored schamas
		for (const wallet of wallets) {
			const walletKey = this.wallets[wallet]

			const accountSchemasAndAssetsResponse = await this.storage.accountSchemasAndAssets(walletKey)
			if(accountSchemasAndAssetsResponse.error != null) {
				this.$toast.add({severity:'error', summary: this.$t('message.shared.error'), detail: accountSchemasAndAssetsResponse.error, life: 3000})
				continue
			}
	
			const walletChain = accountSchemasAndAssetsResponse.result

			this.schemas = this.schemas.concat(walletChain.templates.map((t) => {
				t.creator = wallet
				return t
			}))
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
