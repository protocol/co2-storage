import { create } from 'ipfs-core'
import { CID } from 'multiformats/cid'
import { Helpers } from '../helpers/Helpers'
import { Auth } from '../auth/Auth'

export class EstuaryStorage {
    selectedAddress = null
    ipfs = null
	ipfsStarting = false
	ipfsStarted = false
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

	async destroy() {
		await this.ipfs.stop()
	}

	async startIpfs(repo) {
		this.ipfsStarting = true
		this.ipfsStarted = false
		if(repo == undefined)
			this.ipfs = await create()
		else
			this.ipfs = await create(repo)
		this.ipfsStarted = true
		this.ipfsStarting = false
		return this.ipfs
	}

	async stopIpfs() {
		if(this.ipfs != null) {
			await this.ipfs.stop()
			this.ipfs = null
			this.ipfsStarted = false
			this.ipfsStarting = false
		}
	}

	async listPins() {
		const listPinsUri = `${this.apiHost}/pinning/pins`
		const listPinsMethod = 'GET'
		const listPinsHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const listPinsResponseType = null

		const listPinsResponse = await this.helpers.rest(listPinsUri, listPinsMethod,
			listPinsHeaders, listPinsResponseType)

		if(listPinsResponse.status != 200) {
			return new Promise((resolve, reject) => {
				reject({
					error: listPinsResponse,
					result: null
				})
			})
		}
		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: listPinsResponse.data.results
			})
		})
	}
/*
	async removePin(pinId) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
		return new Promise((resolve, reject) => {
			resolve({
				result: null,
				error: authResponse.error
			})
		})
		this.selectedAddress = authResponse.result

		const removePinUri = `${this.apiHost}/pinning/pins/${pinId}`
		const removePinMethod = 'DELETE'
		const removePinHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const removePinResponseType = null

		const removePinResponse = await this.helpers.rest(removePinUri, removePinMethod,
			removePinHeaders, removePinResponseType)

		if(removePinResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: removePinResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: removePinResponse
			})
		})
	}
*/
	async ensureIpfsIsRunning() {
		if(!this.ipfsStarted && !this.ipfsStarting) {
			try {
				this.ipfs = await this.startIpfs()
			} catch (error) {
				this.ipfs = await this.startIpfs({repo: "ok" + Math.random()})
			}
		}
		else if(!this.ipfsStarted) {
			while(!this.ipfsStarted) {
				await this.helpers.sleep(1000)
			}
		}
		return this.ipfs
	}

	async getAccounts() {
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		const authResponse = await this.authenticate()
		if(authResponse.error != null)
		return new Promise((resolve, reject) => {
			resolve({
				result: null,
				error: authResponse.error
			})
		})
		this.selectedAddress = authResponse.result

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

					const pinWalletChainCidUri = `${this.apiHost}/pinning/pins`
					const pinWalletChainCidData = {
						"name": `wallet_chain_${this.selectedAddress}`,
						"cid": walletChainCid.toString()
					}
					const pinWalletChainCidMethod = 'POST'
					const pinWalletChainCidHeaders = {
						'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					}
					const pinWalletChainCidResponseType = null
			
					const pinWalletChainCidResponse = await this.helpers.rest(pinWalletChainCidUri, pinWalletChainCidMethod,
						pinWalletChainCidHeaders, pinWalletChainCidResponseType, pinWalletChainCidData)
		
					if(pinWalletChainCidResponse.status > 299) {
						return new Promise((resolve, reject) => {
							reject({
								error: pinWalletChainCidResponse,
								result: null
							})
						})
					}

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

							const pinWalletChainCidUri = `${this.apiHost}/pinning/pins`
							const pinWalletChainCidData = {
								"name": `wallet_chain_${this.selectedAddress}`,
								"cid": walletChainCid.toString()
							}
							const pinWalletChainCidMethod = 'POST'
							const pinWalletChainCidHeaders = {
								'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
								'Accept': 'application/json',
								'Content-Type': 'application/json'
							}
							const pinWalletChainCidResponseType = null
					
							const pinWalletChainCidResponse = await this.helpers.rest(pinWalletChainCidUri, pinWalletChainCidMethod,
								pinWalletChainCidHeaders, pinWalletChainCidResponseType, pinWalletChainCidData)
				
							if(pinWalletChainCidResponse.status > 299) {
								return new Promise((resolve, reject) => {
									reject({
										error: pinWalletChainCidResponse,
										result: null
									})
								})
							}

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

						const pinWalletChainCidUri = `${this.apiHost}/pinning/pins`
						const pinWalletChainCidData = {
							"name": `wallet_chain_${this.selectedAddress}`,
							"cid": walletChainCid.toString()
						}
						const pinWalletChainCidMethod = 'POST'
						const pinWalletChainCidHeaders = {
							'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						}
						const pinWalletChainCidResponseType = null
				
						const pinWalletChainCidResponse = await this.helpers.rest(pinWalletChainCidUri, pinWalletChainCidMethod,
							pinWalletChainCidHeaders, pinWalletChainCidResponseType, pinWalletChainCidData)
			
						if(pinWalletChainCidResponse.status > 299) {
							return new Promise((resolve, reject) => {
								reject({
									error: pinWalletChainCidResponse,
									result: null
								})
							})
						}
	
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
				if(walletsChainCid.toString() != walletsCid) {
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
				}

				walletsCid = walletsChainCid.toString()

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
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

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

	async getAccountTemplatesAndAssets() {
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

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

		let templates = [], assets = []
		for await (const templateBlockCid of account.result.value.templates) {
			const template =  (await this.ipfs.dag.get(CID.parse(templateBlockCid))).value
			templates.push({
				block: templateBlockCid,
				template: template
			})
		}

		for await (const assetBlockCid of account.result.value.assets) {
			const asset =  (await this.ipfs.dag.get(CID.parse(assetBlockCid))).value
			assets.push({
				block: assetBlockCid,
				asset: asset
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				result: {
					templates: templates,
					assets: assets
				},
				error: null
			})
		})
	}

	async updateAccount(assets, templates) {
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

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

		const pinWalletChainCidUri = `${this.apiHost}/pinning/pins`
		const pinWalletChainCidData = {
			"name": `wallet_chain_${this.selectedAddress}`,
			"cid": walletChainCid.toString()
		}
		const pinWalletChainCidMethod = 'POST'
		const pinWalletChainCidHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const pinWalletChainCidResponseType = null

		const pinWalletChainCidResponse = await this.helpers.rest(pinWalletChainCidUri, pinWalletChainCidMethod,
			pinWalletChainCidHeaders, pinWalletChainCidResponseType, pinWalletChainCidData)

		if(pinWalletChainCidResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: pinWalletChainCidResponse,
					result: null
				})
			})
		}

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
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

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
			const accountBlock =  (await this.ipfs.dag.get(CID.parse(accountCid))).value
			for (const templateBlockCid of accountBlock.templates) {
				const templateBlock =  (await this.ipfs.dag.get(CID.parse(templateBlockCid))).value
				const template =  (await this.ipfs.dag.get(CID.parse(templateBlock.cid))).value
				templates = templates.concat({
					block: templateBlockCid,
					templateBlock: templateBlock,
					template: template
				})
			}
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
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

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

		const pinTemplateCidUri = `${this.apiHost}/pinning/pins`
		const pinTemplateCidData = {
			"name": `template_${name}_${templateCid.toString()}`,
			"cid": templateCid.toString()
		}
		const pinTemplateCidMethod = 'POST'
		const pinTemplateCidHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const pinTemplateCidResponseType = null

		const pinTemplateCidResponse = await this.helpers.rest(pinTemplateCidUri, pinTemplateCidMethod,
			pinTemplateCidHeaders, pinTemplateCidResponseType, pinTemplateCidData)

		if(pinTemplateCidResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: pinTemplateCidResponse,
					result: null
				})
			})
		}

		const templateBlock = {
			"parent": (parent) ? parent : null,
			"timestamp": (new Date()).toISOString(),
			"creator": this.selectedAddress,
			"cid": templateCid.toString(),
			"name": name,
			"base": base
		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const pinTemplateBlockCidUri = `${this.apiHost}/pinning/pins`
		const pinTemplateBlockCidData = {
			"name": `template_block_${name}_${templateBlockCid.toString()}`,
			"cid": templateBlockCid.toString()
		}
		const pinTemplateBlockCidMethod = 'POST'
		const pinTemplateBlockCidHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const pinTemplateBlockCidResponseType = null

		const pinTemplateBlockCidResponse = await this.helpers.rest(pinTemplateBlockCidUri, pinTemplateBlockCidMethod,
			pinTemplateBlockCidHeaders, pinTemplateBlockCidResponseType, pinTemplateBlockCidData)

		if(pinTemplateBlockCidResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: pinTemplateBlockCidResponse,
					result: null
				})
			})
		}

		templates.push(templateBlockCid.toString())

		try {
			const updateAccountResponse = await this.updateAccount(null, templates)
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
					templateBlock: templateBlock,
					block: templateBlockCid,
					template: template
				}
			})
		})
	}

	async getTemplate(templateBlockCid) {
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		let templateBlock, template
		try {
			templateBlockCid = CID.parse(templateBlockCid)
			templateBlock = (await this.ipfs.dag.get(templateBlockCid)).value
			template = (await this.ipfs.dag.get(CID.parse(templateBlock.cid))).value
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
				result: {
					block: templateBlockCid,
					templateBlock: templateBlock,
					template: template
				},
				error: null
			})
		})
	}

	async addAsset(assetElements, parameters) {
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

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
		let assets = account.result.value.assets

		// If we have field types Image or Documents
		// add them to IPFS first and remap values with CIDs
		let fileContainingElements = assetElements
			.filter((f) => {return f.type == 'Images' || f.type == 'Documents'})

		if (fileContainingElements.length)
			parameters.filesUploadStart()

		for (const fileContainingElement of fileContainingElements) {
			if(fileContainingElement.value == null)
				continue
			let newValue = []
			for await (const result of this.ipfs.addAll(fileContainingElement.value, {
				'cidVersion': 1,
				'hashAlg': 'sha2-256',
				'wrapWithDirectory': true,
				'progress': async (bytes, path) => {
					await parameters.filesUpload(bytes, path)
				}
			})) {
			if(result.path != '')
				newValue.push({
					cid: result.cid.toString(),
					path: result.path,
					size: result.size
				})

			const pinFileCidUri = `${this.apiHost}/pinning/pins`
			const pinFileCidData = {
				"name": `file_${result.path}_${result.cid.toString()}`,
				"cid": result.cid.toString()
			}
			const pinFileCidMethod = 'POST'
			const pinFileCidHeaders = {
				'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			}
			const pinFileCidResponseType = null
	
			const pinFileCidResponse = await this.helpers.rest(pinFileCidUri, pinFileCidMethod,
				pinFileCidHeaders, pinFileCidResponseType, pinFileCidData)
	
			if(pinFileCidResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: pinFileCidResponse,
						result: null
					})
				})
			}
		}
			// Map CIDs to asset data structure
			fileContainingElement.value = newValue.map((x) => x)
		}
		parameters.filesUploadEnd()

		parameters.createAssetStart()
		let dateContainingElements = assetElements
			.filter((f) => {return f.type == 'Date' || f.type == 'DateTime'})
		for (const dateContainingElement of dateContainingElements) {
			if(dateContainingElement.value == null)
				continue
			try {
				dateContainingElement.value = dateContainingElement.value.toISOString()
			} catch (error) {
				
			}
		}

		let datesContainingElements = assetElements
			.filter((f) => {return f.type == 'Dates' || f.type == 'DateTimes' || f.type == 'DateRange' || f.type == 'DateTimeRange'})
		for (const datesContainingElement of datesContainingElements) {
			if(datesContainingElement.value == null)
				continue
			try {
				datesContainingElement.value = datesContainingElement.value.map((v) => {return v.toISOString()})
			} catch (error) {
				
			}
		}

		// Cretae asset data structure
		const asset = {
			"template": parameters.template,
			"data": assetElements
				.filter((f) => {
					return f && Object.keys(f).length > 0 && Object.getPrototypeOf(f) === Object.prototype
				})
				.map((f) => {
				return {
					[f.name] : f.value
				}
			})
		}

		const assetCid = await this.ipfs.dag.put(asset, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const pinAssetCidUri = `${this.apiHost}/pinning/pins`
		const pinAssetCidData = {
			"name": `asset_${parameters.name}_${assetCid.toString()}`,
			"cid": assetCid.toString()
		}
		const pinAssetCidMethod = 'POST'
		const pinAssetCidHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const pinAssetCidResponseType = null

		const pinAssetCidResponse = await this.helpers.rest(pinAssetCidUri, pinAssetCidMethod,
			pinAssetCidHeaders, pinAssetCidResponseType, pinAssetCidData)

		if(pinAssetCidResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: pinAssetCidResponse,
					result: null
				})
			})
		}

		const assetBlock = {
			"parent": parameters.parent,
			"timestamp": (new Date()).toISOString(),
			"creator": this.selectedAddress,
			"cid": assetCid.toString(),
			"name": parameters.name,
			"template": parameters.template
		}

		const assetBlockCid = await this.ipfs.dag.put(assetBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		const pinAssetBlockCidUri = `${this.apiHost}/pinning/pins`
		const pinAssetBlockCidData = {
			"name": `asset_block_${parameters.name}_${assetBlockCid.toString()}`,
			"cid": assetBlockCid.toString()
		}
		const pinAssetBlockCidMethod = 'POST'
		const pinAssetBlockCidHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const pinAssetBlockCidResponseType = null

		const pinAssetBlockCidResponse = await this.helpers.rest(pinAssetBlockCidUri, pinAssetBlockCidMethod,
			pinAssetBlockCidHeaders, pinAssetBlockCidResponseType, pinAssetBlockCidData)

		if(pinAssetBlockCidResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: pinAssetBlockCidResponse,
					result: null
				})
			})
		}

		assets.push(assetBlockCid.toString())

		try {
			const updateAccountResponse = await this.updateAccount(assets, null)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		parameters.createAssetEnd()

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: {
					assetBlock: assetBlock,
					block: assetBlockCid.toString(),
					asset: asset
				}
			})
		})
	}

	async getAsset(assetBlockCid) {
		try {
			await this.ensureIpfsIsRunning()
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		let assetBlock, asset
		try {
			assetBlockCid = CID.parse(assetBlockCid)
			assetBlock = (await this.ipfs.dag.get(assetBlockCid)).value
			asset = (await this.ipfs.dag.get(CID.parse(assetBlock.cid))).value
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
				result: {
					block: assetBlockCid.toString(),
					assetBlock: assetBlock,
					asset: asset
				},
				error: null
			})
		})
	}

	async getRawData(cid) {
		let buffer = []
		for await (const buf of this.ipfs.cat(CID.parse(cid))) {
			buffer.push(buf)
		}
		return buffer
	}
}