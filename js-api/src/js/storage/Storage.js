import { create } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'
import { Helpers } from '../helpers/Helpers'

export class Storage {
//  '/dns4/rqojucgt.co2.storage/tcp/5002/https'
    addr = '/ip4/127.0.0.1/tcp/5001'
    walletsKey = 'co2.storage-wallets'
    selectedAddress = null
    ipfs = null
    nodeKeys = {}
    accounts = {}
    helpers = new Helpers()

    constructor(selectedAddress, addr, walletsKey) {
        if(selectedAddress == null) {
            return {
                result: null,
                error: 'Account (wallet) address is mandatory parameter.'
            }
        }
        else {
            this.selectedAddress = selectedAddress
        }
        if(addr != null)
            this.addr = addr
        if(walletsKey != null)
            this.walletsKey = walletsKey
    }

	async getAccounts() {
		const that = this
		let walletsChainKey, walletsChainSub, walletsChainCid

        if(this.ipfs == null)
			// Attach to a node
			this.ipfs = await create(this.addr)

		// Get existing node keys
		this.nodeKeys = await this.ipfs.key.list()
		const walletsChainKeyCheck = this.helpers.keyExists(this.walletsKey, this.nodeKeys)
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

			this.accounts[this.selectedAddress] = walletChainKey.id

			// Create key for wallets chain
			walletsChainKey = await this.ipfs.key.gen(this.walletsKey, {
				type: 'ed25519',
				size: 2048
			})

			// Genesis
			this.accounts.parent = null

			// Create dag struct
			walletsChainCid = await this.ipfs.dag.put(this.accounts, {
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
			this.accounts = (await this.ipfs.dag.get(walletsChainCid)).value

            // Check if wallets list already contains this wallet
			if(this.accounts[this.selectedAddress] == undefined) {
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

				this.accounts[this.selectedAddress] = walletChainKey.id

				this.accounts.parent = walletsChainCid.toString()

				// Create new dag struct
				walletsChainCid = await this.ipfs.dag.put(this.accounts, {
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

        return {
            result: {
                ipfs: this.ipfs,
                keys: this.nodeKeys,
                list: this.accounts
            },
            error: null
        }
	}
}