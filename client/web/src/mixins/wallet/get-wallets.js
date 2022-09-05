import { create } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'

const methods = {
	async getWallets() {
		const that = this
		if(this.ipfs == null)
			// Attach to a node
//			this.ipfs = await create('/dns4/rqojucgt.co2.storage/tcp/5002/https')
			this.ipfs = await create('/ip4/127.0.0.1/tcp/5001')

		// Get existing node keys
		this.nodeKeys = await this.ipfs.key.list()

		const walletsChainKeyId = 'co2.storage-wallets'
		const walletsChainKeyCheck = this.keyExists(walletsChainKeyId, this.nodeKeys)
		let walletsChainKey, walletsChainSub, walletsChainCid
		if(!walletsChainKeyCheck.exists) {
			// Create key for wallet chain
			const walletChainKey = await this.ipfs.key.gen(this.selectedAddress, {
				type: 'ed25519',
				size: 2048
			})

			const walletChain = {
				"parent": null,
				"wallet": this.selectedAddress,
				"templates": [],
				"assets": []
			}
			
			const walletChainCid = await this.ipfs.dag.put(walletChain, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})

			window.setTimeout(async () => {
				const walletChainSub = await that.ipfs.name.publish(walletChainCid, {
					lifetime: '87600h',
					key: walletChainKey.id
				})
			}, 0)

			this.wallets[this.selectedAddress] = walletChainKey.id

			// Create key for wallets chain
			walletsChainKey = await this.ipfs.key.gen(walletsChainKeyId, {
				type: 'ed25519',
				size: 2048
			})

			// Genesis
			this.wallets.parent = null

			// Create dag struct
			walletsChainCid = await this.ipfs.dag.put(this.wallets, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})
	
			// Publish pubsub
			walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
				lifetime: '87600h',
				key: walletsChainKey.id
			})
		}
		else {
			// Get the key
			walletsChainKey = this.nodeKeys[walletsChainKeyCheck.index]
			const walletsChainKeyName = `/ipns/${walletsChainKey.id}`

			// Resolve IPNS name
			for await (const name of this.ipfs.name.resolve(walletsChainKeyName)) {
				walletsChainCid = name.replace('/ipfs/', '')
			}
			walletsChainCid = CID.parse(walletsChainCid)

			// Get last walletsChain block
			this.wallets = (await this.ipfs.dag.get(walletsChainCid)).value

			// Check if wallets list already contains this wallet
			if(this.wallets[this.selectedAddress] == undefined) {
				// Create key for wallet chain
				const walletChainKey = await this.ipfs.key.gen(this.selectedAddress, {
					type: 'ed25519',
					size: 2048
				})

				const walletChain = {
					"parent": null,
					"wallet": this.selectedAddress,
					"templates": [],
					"assets": []
				}
				
				const walletChainCid = await this.ipfs.dag.put(walletChain, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})
	
				window.setTimeout(async () => {
					const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
						lifetime: '87600h',
						key: walletChainKey.id
					})
				}, 0)

				this.wallets[this.selectedAddress] = walletChainKey.id

				this.wallets.parent = walletsChainCid.toString()

				// Create new dag struct
				walletsChainCid = await this.ipfs.dag.put(this.wallets, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})

				// Link key to the latest block
				walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
					lifetime: '87600h',
					key: walletsChainKey.id
				})
			}
		}
//		console.dir(walletsChainCid, {depth: null})
//		console.dir(walletsChainKey, {depth: null})
//		console.dir(walletsChainSub, {depth: null})
	}
}

export default {
	data () {
		return {
		}
	},
	methods: methods
}
