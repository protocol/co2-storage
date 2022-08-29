import { CID } from 'multiformats/cid'

const methods = {
	async loadSchemas() {
		let wallets = Object.keys(this.wallets)
		wallets.splice(wallets.indexOf("parent"), 1)
		if(!wallets.length)
			return

		this.schemas.length = 0

		// Browse all wallets for stored schamas
		for (const wallet of wallets) {
			const key = this.wallets[wallet]
			const keyPath = `/ipns/${key}`
			let walletChainCid

			// Resolve IPNS name
			for await (const name of this.ipfs.name.resolve(keyPath)) {
				walletChainCid = name.replace('/ipfs/', '')
			}
			walletChainCid = CID.parse(walletChainCid)

			// Get last walletsChain block
			const walletChain = (await this.ipfs.dag.get(walletChainCid)).value
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
