import { create } from 'ipfs-http-client'
import { create as createCore } from 'ipfs-core'
import { CID } from 'multiformats/cid'
import axios from 'axios'
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
			const createAccountResponse = await this.createAccount(this.selectedAddress)
			walletChainKey = createAccountResponse.key
			walletChainCid = createAccountResponse.cid

			this.accounts[this.selectedAddress] = walletChainKey.id

			// Genesis block
			this.accounts.parent = null

			// Update accounts with newly created account
			const updateAccountsResponse = await this.updateAccounts(this.accounts)
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
				const createAccountResponse = await this.createAccount(this.selectedAddress)
				walletChainKey = createAccountResponse.key
				walletChainCid = createAccountResponse.cid

				this.accounts[this.selectedAddress] = walletChainKey.id

				this.accounts.parent = walletsChainCid.toString()

				// Update accounts (without creating wallets structure)
				const updateAccountsResponse = await this.updateAccounts(this.accounts, walletsChainKey)
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

	async accountSchemasAndAssets(walletChainKey) {
		// Authenticate first since this is public method
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result
		
		const keyPath = `/ipns/${walletChainKey}`

		let walletChain
		try {
			// Resolve IPNS name
			let walletChainCid
			for await (const name of this.ipfs.name.resolve(keyPath)) {
				walletChainCid = name.replace('/ipfs/', '')
			}
			walletChainCid = CID.parse(walletChainCid)

			// Get last walletsChain block
			walletChain = (await this.ipfs.dag.get(walletChainCid)).value
		} catch (error) {
			return {
				result: null,
				error: error
			}
		}

		return {
			result: walletChain,
			error: null
		}
	}

	async getAccountCid(walletChainKey) {
		// Authenticate first since this is public method
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result
		
		const keyPath = `/ipns/${walletChainKey}`
		let walletChainCid

		try {
			// Resolve IPNS name
			for await (const name of this.ipfs.name.resolve(keyPath)) {
				walletChainCid = name.replace('/ipfs/', '')
			}
			walletChainCid = CID.parse(walletChainCid)

		} catch (error) {
			return {
				result: null,
				error: error
			}
		}

		return {
			result: walletChainCid,
			error: null
		}
	}

	async getSchemaByCid(cid) {
		// Authenticate first since this is public method
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result

		let schema
		try {
			const schemaCid = CID.parse(cid)
			schema = (await this.ipfs.dag.get(schemaCid)).value
		} catch (error) {
			return {
				result: null,
				error: error
			}
		}
		return {
			result: schema,
			error: null
		}
	}

	async getAssetByCid(cid) {
		return this.getSchemaByCid(cid)
	}

	async getSchemaByKey(key) {
		// Authenticate first since this is public method
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result

		const keyPath = `/ipns/${key}`

		let schema
		try {
			// Resolve IPNS name
			let schemaCid
			for await (const name of this.ipfs.name.resolve(keyPath)) {
				schemaCid = name.replace('/ipfs/', '')
			}
			schemaCid = CID.parse(schemaCid)

			// Get last walletsChain block
			schema = await this.getSchemaByCid(schemaCid)
		} catch (error) {
			return {
				result: null,
				error: error
			}
		}

		return {
			result: schema,
			error: null
		}
	}

	async getAssetByKey(key) {
		return this.getSchemaByKey(key)
	}

	async createSchema(schema) {
		// Authenticate first since this is public method
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result

		const schemaCid = await this.ipfs.dag.put(schema, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		return {
			result: schemaCid,
			error: null
		}
	}

	async createAsset(asset) {
		return this.createSchema(asset)
	}

	async addSchemaToAccount(cid, name, base, cidCallback, subCallback) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return {
				result: null,
				error: authResponse.error
			}
		this.selectedAddress = authResponse.result

		this.nodeKeys = await this.ipfs.key.list()
		const walletChainKeyCheck = this.helpers.keyExists(this.selectedAddress, this.nodeKeys)
		if(!walletChainKeyCheck.exists) {
			return {
				result: null,
				error: `Account ${this.selectedAddress} is not initialised. You must use "init() method first!"`
			}
		}

		const walletChainKey = this.nodeKeys[walletChainKeyCheck.index].id

		const walletChainResponse = await this.accountSchemasAndAssets(walletChainKey)
		if(walletChainResponse.error != null) {
			return {
				result: null,
				error: walletChainResponse.error
			}
		}

		const walletChain = walletChainResponse.result

		const schema = {
			"creator": this.selectedAddress,
			"cid": cid.toString(),
			"name": name,
			"base": base,
			"use": 0,
			"fork": 0
		}
		walletChain.templates.push(schema)

		const getAccountCidResponse = await this.getAccountCid(walletChainKey)
		if(getAccountCidResponse.error != null) {
			return {
				result: null,
				error: getAccountCidResponse.error
			}
		}

		walletChain.parent = getAccountCidResponse.result.toString()

		const walletChainCid = await this.ipfs.dag.put(walletChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const promise1 = new Promise((resolve) => {
			resolve({
				result: {
					schema: schema,
					cid: walletChainCid.toString(),
					key: walletChainKey
				},
				error: null
			})
		})

		const cidMsg = await promise1
		cidCallback(cidMsg)

		const walletChainSub = await this.ipfs.name.publish(walletChainCid, {
			lifetime: '87600h',
			key: walletChainKey
		})
		
		const promise2 = new Promise((resolve) => {
			resolve({
				result: {
					sub: walletChainSub
				},
				error: null
			})
		})

		const subMsg = await promise2
		subCallback(subMsg)
	}

	async createAccount(wallet) {
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

	async updateAccounts(accounts, walletsChainKey) {
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

export class EstuaryStorage extends Storage {
	bipfs = null
	apiHost = "https://api.estuary.tech"

    constructor() {
		super()
		console.log(process.env.ESTUARY_API_KEY)
    }

	async getAccounts() {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
		return new Promise((resolve, reject) => {
			resolve({
				result: null,
				error: authResponse.error
			})
		})
		this.selectedAddress = authResponse.result

		let accounts = []
		const getAccountsUri = `${this.apiHost}/collections/`
		const getAccountsMethod = 'GET'
		const getAccountsHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json'
		}
		const getAccountsResponseType = null

		try {
			const getAccountsResponse = await this.rest(getAccountsUri, getAccountsMethod, getAccountsHeaders, getAccountsResponseType)

			if(getAccountsResponse.status != 200) {
				return new Promise((resolve, reject) => {
					reject({
						error: getAccountsResponse,
						result: null
					})
				})
			}

			const collections = getAccountsResponse.data
			accounts = collections.filter((c) => {return c.name == "Accounts"})

			if(!accounts.length) {
				// No accounts collection existing => create accounts collection
				const createAccountsCollectionUri = `${this.apiHost}/collections/`
				const createAccountsCollectionData = {
					"name": "Accounts",
					"description": "Collection containing co2.storage accounts"
				}
				const createAccountsCollectionMethod = 'POST'
				const createAccountsCollectionHeaders = {
					'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
				const createAccountsCollectionResponseType = null
		
				const createAccountsCollectionResponse = await this.rest(createAccountsCollectionUri, createAccountsCollectionMethod,
					createAccountsCollectionHeaders, createAccountsCollectionResponseType, createAccountsCollectionData)
	
				if(createAccountsCollectionResponse.status != 200) {
					return new Promise((resolve, reject) => {
						reject({
							error: createAccountsCollectionResponse,
							result: null
						})
					})
				}
				else {
					return await this.getAccounts()
				}
			}
			else if(accounts.length == 1) {
				const account = accounts[0]
console.log(account)

				// Look for accounts collection contents
				const collectionContentsUri = `${this.apiHost}/collections/${account.uuid}`
				const collectionContentsMethod = 'GET'
				const collectionContentsHeaders = {
					'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
				const collectionContentsResponseType = null
		
				const collectionContentsResponse = await this.rest(collectionContentsUri, collectionContentsMethod,
					collectionContentsHeaders, collectionContentsResponseType)
	
				if(collectionContentsResponse.status != 200) {
					return new Promise((resolve, reject) => {
						reject({
							error: collectionContentsResponse,
							result: null
						})
					})
				}
console.log(collectionContentsResponse)
				if(this.bipfs == null)
					this.bipfs = await createCore()

				let walletChain = {
					"parent": null,
					"timestamp": (new Date()).toISOString(),
					"wallet": this.selectedAddress,
					"templates": [],
					"assets": []
				}

				const accountsContents = collectionContentsResponse.data
				if(accountsContents == null) {
					// Create genesis block
				}
				else {

				}

				const walletChainCid = await this.bipfs.dag.put(walletChain, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})

				// Add last block CID to accounts collection
				const createAccountsBlockUri = `${this.apiHost}/content/add-ipfs`
				const createAccountsBlockData = {
					"filename": "last_block",
					"root": walletChainCid.toString(),
					"coluuid": account.uuid,
					"dir": "/"
				}
				const createAccountsBlockMethod = 'POST'
				const createAccountsBlockHeaders = {
					'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
				const createAccountsBlockResponseType = null
		
				const createAccountsBlockResponse = await this.rest(createAccountsBlockUri, createAccountsBlockMethod,
					createAccountsBlockHeaders, createAccountsBlockResponseType, createAccountsBlockData)
	
				if(createAccountsBlockResponse.status > 299) {
					return new Promise((resolve, reject) => {
						reject({
							error: createAccountsBlockResponse,
							result: null
						})
					})
				}
console.log(createAccountsBlockResponse)
				return new Promise((resolve, reject) => {
					resolve({
						result: walletChainCid,
						error: null
					})
				})
		
			}
			else {
				return new Promise((resolve, reject) => {
					reject({
						error: "Multiple collections with name 'Accounts' exists!",
						result: null
					})
				})
			}
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		return new Promise((resolve, reject) => {
			resolve({
				result: accounts,
				error: null
			})
		})
	}

	rest(uri, method, headers, responseType, data) {
		return axios({
			url: uri,
			method: method,
			headers: headers,
			responseType: responseType,
			data: (data != undefined) ? data : null
		})
	}
}