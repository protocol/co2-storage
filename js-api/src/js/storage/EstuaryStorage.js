import { create } from 'ipfs-core'
import { CID } from 'multiformats/cid'
import { Helpers } from '../helpers/Helpers'
import { Auth } from '../auth/Auth'

export class EstuaryStorage {
    selectedAddress = null
    ipfs = null
    helpers = null
	auth = null
	apiHost = "https://api.estuary.tech"

    constructor(authType) {
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

	async getAccount() {
		const accounts = await this.getAccounts()
		const accountCid = accounts.result[this.selectedAddress]
		return (await this.ipfs.dag.get(CID.parse(accountCid))).value
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

		let accountsCollections = []
		const getAccountsUri = `${this.apiHost}/collections/`
		const getAccountsMethod = 'GET'
		const getAccountsHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json'
		}
		const getAccountsResponseType = null

		try {
			const getAccountsResponse = await this.helpers.rest(getAccountsUri, getAccountsMethod, getAccountsHeaders, getAccountsResponseType)

			if(getAccountsResponse.status != 200) {
				return new Promise((resolve, reject) => {
					reject({
						error: getAccountsResponse,
						result: null
					})
				})
			}

			const collections = getAccountsResponse.data
			accountsCollections = collections.filter((c) => {return c.name == "Accounts"})

			if(!accountsCollections.length) {
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
		
				const createAccountsCollectionResponse = await this.helpers.rest(createAccountsCollectionUri, createAccountsCollectionMethod,
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
			else if(accountsCollections.length == 1) {
				const accountsCollection = accountsCollections[0]

				// Look for accounts collection contents
				const collectionContentsUri = `${this.apiHost}/collections/${accountsCollection.uuid}`
				const collectionContentsMethod = 'GET'
				const collectionContentsHeaders = {
					'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
				const collectionContentsResponseType = null
		
				const collectionContentsResponse = await this.helpers.rest(collectionContentsUri, collectionContentsMethod,
					collectionContentsHeaders, collectionContentsResponseType)
	
				if(collectionContentsResponse.status != 200) {
					return new Promise((resolve, reject) => {
						reject({
							error: collectionContentsResponse,
							result: null
						})
					})
				}

				if(this.ipfs == null)
					this.ipfs = await create()

				let walletChain = {}, walletsChain = {}
				const accountsCollectionContents = collectionContentsResponse.data
				if(accountsCollectionContents == null) {
					// Create genesis block
					walletChain = {
						"parent": null,
						"timestamp": (new Date()).toISOString(),
						"wallet": this.selectedAddress,
						"templates": [],
						"assets": []
					}
					const walletChainCid = await this.ipfs.dag.put(walletChain, {
						storeCodec: 'dag-cbor',
						hashAlg: 'sha2-256',
						pin: true
					})

					walletsChain["parent"] = null
					walletsChain[this.selectedAddress] = walletChainCid.toString()
				}
				else {
					// Retrieve last block
					let lastBlock = accountsCollectionContents.filter((a) => {return a.name == "last_block"})
					if(lastBlock.length) {
						lastBlock = lastBlock[0]
						// Get last walletsChain block
						walletsChain = (await this.ipfs.dag.get(CID.parse(lastBlock.cid))).value
						// Check is this account already added to accounts
						if(walletsChain[this.selectedAddress] == null) {
							// Add this account
							walletChain = {
								"parent": null,
								"timestamp": (new Date()).toISOString(),
								"wallet": this.selectedAddress,
								"templates": [],
								"assets": []
							}
							const walletChainCid = await this.ipfs.dag.put(walletChain, {
								storeCodec: 'dag-cbor',
								hashAlg: 'sha2-256',
								pin: true
							})
		
							walletsChain["parent"] = lastBlock.cid
							walletsChain[this.selectedAddress] = walletChainCid.toString()
						}
					}
					else {
						// Create genesis block
						walletChain = {
							"parent": null,
							"timestamp": (new Date()).toISOString(),
							"wallet": this.selectedAddress,
							"templates": [],
							"assets": []
						}
						const walletChainCid = await this.ipfs.dag.put(walletChain, {
							storeCodec: 'dag-cbor',
							hashAlg: 'sha2-256',
							pin: true
						})

						walletsChain["parent"] = null
						walletsChain[this.selectedAddress] = walletChainCid.toString()
					}
				}

				const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})

				// Add last block CID to accounts collection
				const createAccountsBlockUri = `${this.apiHost}/content/add-ipfs`
				const createAccountsBlockData = {
					"filename": "last_block",
					"root": walletsChainCid.toString(),
					"coluuid": accountsCollection.uuid,
					"dir": "/"
				}
				const createAccountsBlockMethod = 'POST'
				const createAccountsBlockHeaders = {
					'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
				const createAccountsBlockResponseType = null
		
				const createAccountsBlockResponse = await this.helpers.rest(createAccountsBlockUri, createAccountsBlockMethod,
					createAccountsBlockHeaders, createAccountsBlockResponseType, createAccountsBlockData)
	
				if(createAccountsBlockResponse.status > 299) {
					return new Promise((resolve, reject) => {
						reject({
							error: createAccountsBlockResponse,
							result: null
						})
					})
				}

				return new Promise((resolve, reject) => {
					resolve({
						result: walletsChain,
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
	}
}