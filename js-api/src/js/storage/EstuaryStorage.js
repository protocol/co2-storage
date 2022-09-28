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

	async startIpfs() {
		if(this.ipfs == null)
			this.ipfs = await create()
	}

	async stopIpfs() {
		if(this.ipfs != null) {
			await this.ipfs.stop()
			this.ipfs = null
		}
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

		await this.startIpfs()

		let walletsCid = null
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
						walletsCid = lastBlock.cid
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
						result: {
							uuid: accountsCollection.uuid,
							list: walletsChain,
							cid: walletsCid
						},
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

	async getAccount() {
		await this.startIpfs()

		let accounts
		try {
			accounts = await this.getAccounts()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		const accountCid = accounts.result.list[this.selectedAddress]
		const value =  (await this.ipfs.dag.get(CID.parse(accountCid))).value
		const accountsCollection = accounts.result.uuid
		const walletsCid = accounts.result.cid
		const list = accounts.result.list

		return new Promise((resolve, reject) => {
			resolve({
				result: {
					accounts: {
						collection: accountsCollection,
						cid: walletsCid,
						list: list
					},
					value: value,
					cid: accountCid
				},
				error: null
			})
		})
	}

	async updateAccount(assets, templates) {
		await this.startIpfs()

		let account
		try {
			account = await this.getAccount()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		const accountCid = account.result.cid
		const current = account.result.value
		const walletsCid = account.result.accounts.cid
		const collection = account.result.accounts.collection
		let walletsChain = account.result.accounts.list

		const walletChain = {
			"parent": accountCid,
			"timestamp": (new Date()).toISOString(),
			"wallet": this.selectedAddress,
			"templates": (templates != undefined) ? templates : current.templates,
			"assets": (assets != undefined) ? assets : current.assets
		}
		const walletChainCid = await this.ipfs.dag.put(walletChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		walletsChain["parent"] = walletsCid
		walletsChain[this.selectedAddress] = walletChainCid.toString()
		const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const createAccountsBlockUri = `${this.apiHost}/content/add-ipfs`
		const createAccountsBlockData = {
			"filename": "last_block",
			"root": walletsChainCid.toString(),
			"coluuid": collection,
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
				result: {
					accounts: {
						collection: collection,
						cid: walletsChainCid.toString(),
						list: walletsChain
					},
					value: walletChain,
					cid: walletChainCid.toString()
				},
				error: null
			})
		})
	}

	async getTemplates(skip, limit) {
		if(skip == undefined)
			skip = 0
		if(limit == undefined)
			limit = 10
		let templates = []
		let getAccountsResponse
		try {
			getAccountsResponse = await this.getAccounts()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		const accounts = getAccountsResponse.result.list
		const accountsKeys = Object.keys(accounts)
		accountsKeys.splice(accountsKeys.indexOf("parent"), 1)
		accountsKeys.splice(0, skip)
		accountsKeys.splice(limit)

		for (const account of accountsKeys) {
			const accountCid = accounts[account]
			const value =  (await this.ipfs.dag.get(CID.parse(accountCid))).value
			templates = templates.concat(value.templates)
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: {
					list: templates,
					skip: skip,
					limit: limit
				}
			})
		})
	}

	async addTemplate(template, name, base, parent) {
		await this.startIpfs()

		let account
		try {
			account = await this.getAccount()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		let templates = account.result.value.templates

		const templateCid = await this.ipfs.dag.put(template, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const templateBlock = {
			"parent": (parent) ? parent : null,
			"timestamp": (new Date()).toISOString(),
			"creator": this.selectedAddress,
			"cid": templateCid.toString(),
			"name": name,
			"base": base
		}
		templates.push(templateBlock)

		let updateAccountResponse
		try {
			updateAccountResponse = await this.updateAccount(null, templates)
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
				error: null,
				result: {
					value: templateBlock,
					cid: templateCid
				}
			})
		})
	}

	async getTemplate(cid) {
		await this.startIpfs()

		let template
		try {
			const templateCid = CID.parse(cid)
			template = (await this.ipfs.dag.get(templateCid)).value
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
				result: template,
				error: null
			})
		})
	}

	async getTemplateBlock(cid) {
		let template
		let getAccountsResponse
		try {
			getAccountsResponse = await this.getAccounts()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		const accounts = getAccountsResponse.result.list
		const accountsKeys = Object.keys(accounts)
		accountsKeys.splice(accountsKeys.indexOf("parent"), 1)

		for (const account of accountsKeys) {
			const accountCid = accounts[account]
			const value =  (await this.ipfs.dag.get(CID.parse(accountCid))).value
			const match = value.templates.filter((t) => {return t.cid == cid})
			if(match.length) {
				template = match[0]
				break
			}
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: template
			})
		})
	}
}