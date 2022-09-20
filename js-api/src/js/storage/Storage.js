import { create } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'
import { Helpers } from '../helpers/Helpers'
import { Auth } from '../auth/Auth'

export class Storage {
//  '/dns4/rqojucgt.co2.storage/tcp/5002/https'
    addr = '/ip4/127.0.0.1/tcp/5001'
    walletsKey = 'co2.storage-wallets'
    selectedAddress = null
    ipfs = null
    nodeKeys = {}
    accounts = {}
    helpers = null
	auth = null

    constructor(authType, addr, walletsKey) {
        if(addr != null)
            this.addr = addr
        if(walletsKey != null)
            this.walletsKey = walletsKey

		this.helpers = new Helpers()

		this.auth = new Auth(authType)
    }

	async authenticate() {
		const authResponse = await this.auth.authenticate()
		if(authResponse.error != null) {
			return {
				result: null,
				error: authResponse.error
			}
		}
		return {
			result: authResponse.result,
			error: null
		}
	}

	async init() {
		let walletChainKey, walletChainCid
		let walletsChainKey, walletsChainSub, walletsChainCid

		// Authenticate first
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result

		// Attach to a node
		if(this.ipfs == null)
			this.ipfs = await create(this.addr)

		// Get existing node keys
		this.nodeKeys = await this.ipfs.key.list()
		const walletsChainKeyCheck = this.helpers.keyExists(this.walletsKey, this.nodeKeys)

		// Check do we have an entry for authenticated wallet
		if(!walletsChainKeyCheck.exists) {
			// Create account
			const createAccountResponse = await this.#createAccount(this.selectedAddress)
			walletChainKey = createAccountResponse.key
			walletChainCid = createAccountResponse.cid

			this.accounts[this.selectedAddress] = walletChainKey.id

			// Genesis block
			this.accounts.parent = null

			// Update accounts with newly created account
			const updateAccountsResponse = await this.#updateAccounts(this.accounts)
			walletsChainKey = updateAccountsResponse.key
			walletsChainCid = updateAccountsResponse.cid
			walletsChainSub = updateAccountsResponse.sub
		}
		else {
			// Get the key
			walletsChainKey = this.nodeKeys[walletsChainKeyCheck.index]

			// Get accounts
			const getAccountsResponse = await this.getAccounts(walletsChainKey.id)
			if(getAccountsResponse.error != null)
				return {
					result: null,
					error: getAccountsResponse.error
				}
			walletsChainCid = getAccountsResponse.result.cid
			this.accounts = getAccountsResponse.result.accounts

			// Check if wallets list already contains this wallet
			if(this.accounts[this.selectedAddress] == undefined) {
				// Create account
				const createAccountResponse = await this.#createAccount(this.selectedAddress)
				walletChainKey = createAccountResponse.key
				walletChainCid = createAccountResponse.cid

				this.accounts[this.selectedAddress] = walletChainKey.id

				this.accounts.parent = walletsChainCid.toString()

				// Update accounts (without creating wallets structure)
				const updateAccountsResponse = await this.#updateAccounts(this.accounts, walletsChainKey)
				walletsChainKey = updateAccountsResponse.key
				walletsChainCid = updateAccountsResponse.cid
				walletsChainSub = updateAccountsResponse.sub
			}
		}

        return {
            result: {
                "ipfs": this.ipfs,
                "keys": this.nodeKeys,
                "list": this.accounts,
				"wallet-chain-key": walletChainKey,
				"wallet-chain-cid": walletChainCid,
				"wallets-chain-key": walletsChainKey,
				"wallets-chain-cid": walletsChainCid
            },
            error: null
        }
	}

	async getAccounts(walletsChainKey) {
		// Authenticate first since method is public
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result

		// Get the key
		const walletsChainKeyName = `/ipns/${walletsChainKey}`

		// Resolve IPNS name
		let walletsChainCid
		for await (const name of this.ipfs.name.resolve(walletsChainKeyName)) {
			walletsChainCid = name.replace('/ipfs/', '')
		}
		walletsChainCid = CID.parse(walletsChainCid)

		// Get last walletsChain block
		const accounts = (await this.ipfs.dag.get(walletsChainCid)).value

		return {
			result: {
				accounts: accounts,
				cid: walletsChainCid
			},
			error: null
		}
	}

	async #createAccount(wallet) {
		const that = this
		let walletChainKey
		try {
			// Create key for wallet chain
			walletChainKey = await this.ipfs.key.gen(wallet, {
				type: 'ed25519',
				size: 2048
			})
		} catch (error) {
			walletChainKey = await this.ipfs.key.rm(wallet)
			walletChainKey = await this.ipfs.key.gen(wallet, {
				type: 'ed25519',
				size: 2048
			})

		}

		const walletChain = {
			"parent": null,
			"wallet": wallet,
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

		return {
			key: walletChainKey,
			cid: walletChainCid
		}
	}

	async #updateAccounts(accounts, walletsChainKey) {
		if(walletsChainKey == undefined) {
			// Create key for wallets chain
			try {
				walletsChainKey = await this.ipfs.key.gen(this.walletsKey, {
					type: 'ed25519',
					size: 2048
				})
			} catch (error) {
				walletsChainKey = await this.ipfs.key.rm(this.walletsKey)
				walletsChainKey = await this.ipfs.key.gen(this.walletsKey, {
					type: 'ed25519',
					size: 2048
				})
			}
		}

		// Create dag struct
		const walletsChainCid = await this.ipfs.dag.put(accounts, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		// Publish pubsub
		const walletsChainSub = await this.ipfs.name.publish(walletsChainCid, {
			lifetime: '87600h',
			key: walletsChainKey.id
		})

		return {
			key: walletsChainKey,
			cid: walletsChainCid,
			sub: walletsChainSub
		}
	}
}