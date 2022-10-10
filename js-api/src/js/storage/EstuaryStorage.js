import { create } from 'ipfs-core'
import { create as createClient } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'
import { Helpers } from '../helpers/Helpers.js'
import { Auth } from '../auth/Auth.js'

export class EstuaryStorage {
	ipfsNodeAddr = (process.env.NODE_ENV == 'production') ? '/dns4/sandbox.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001'
	ipfsNodeType = 'browser'
	ipfsNodeConfig = {
		Addresses: {
			Swarm: [
//				'/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
//				'/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/'
			],
			Delegates: [
//				'/ip4/127.0.0.1/tcp/5001'
			]
		}
	}
	selectedAddress = null
    ipfs = null
	ipfsStarting = false
	ipfsStarted = false
    helpers = null
	authType = null
	auth = null
	apiHost = "https://api.estuary.tech"

    constructor(options) {
		if(options.authType != undefined)
			this.authType = options.authType
		if(options.ipfsNodeType != undefined)
			this.ipfsNodeType = options.ipfsNodeType
		if(options.ipfsNodeConfig != undefined)
			this.ipfsNodeConfig = options.ipfsNodeConfig
		if(options.ipfsNodeAddr != undefined)
			this.ipfsNodeAddr = options.ipfsNodeAddr

		this.helpers = new Helpers()
		this.auth = new Auth(this.authType)
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
/*
	async listPins() {
		return this.helpers.listEstuaryPins(this.apiHost)
	}

	async removePin(pinId) {
		return this.helpers.removeEstuaryPin(this.apiHost, pinId)
	}
*/
	async startIpfs() {
		this.ipfsStarting = true
		this.ipfsStarted = false

		switch (this.ipfsNodeType) {
			case 'client':
				this.ipfs = await createClient(this.ipfsNodeAddr)
				break
			case 'browser':
				this.ipfs = await create({
//					repo: "./ipfs_repo_" + Math.random(),
					repo: "./ipfs_repo",
					config: this.ipfsNodeConfig,
					EXPERIMENTAL: {
						ipnsPubsub: true
					}
				})
				break
			default:
				this.ipfs = await createClient(this.addr)
				break
		}
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

	async ensureIpfsIsRunning() {
		if(!this.ipfsStarted && !this.ipfsStarting) {
			this.ipfs = await this.startIpfs()
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
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let walletsCid = null
		let collections = []

		try {
			collections = (await this.helpers.getEstuaryCollections(this.apiHost)).result.data
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let accountsCollections = collections.filter((c) => {return c.name == "Accounts"})

		if(!accountsCollections.length) {
			// No accounts collection existing => create accounts collection
			try {
				const createEstuaryCollectionResponse = await this.helpers.createEstuaryCollection(this.apiHost, "Accounts", "Collection containing co2.storage accounts")
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
	
			// Once created get accounts again
			return await this.getAccounts()
		}
		else if(accountsCollections.length == 1) {
			const accountsCollection = accountsCollections[0]

			// Look for accounts collection contents
			let accountsCollectionContents = null
			let walletChain = {}, walletsChain = {}

			try {
				accountsCollectionContents = (await this.helpers.getEstuaryCollectionContents(this.apiHost, accountsCollection.uuid)).result.data
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

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

				try {
					const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
				} catch (error) {
					return new Promise((resolve, reject) => {
						reject({
							error: error,
							result: null
						})
					})
				}
	
				walletsChain["parent"] = null
				walletsChain["timestamp"] = (new Date()).toISOString()
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

						try {
							const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
						} catch (error) {
							return new Promise((resolve, reject) => {
								reject({
									error: error,
									result: null
								})
							})
						}
		
						walletsChain["parent"] = lastBlock.cid
						walletsChain["timestamp"] = (new Date()).toISOString()
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

					try {
						const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
					} catch (error) {
						return new Promise((resolve, reject) => {
							reject({
								error: error,
								result: null
							})
						})
					}

					walletsChain["parent"] = null
					walletsChain["timestamp"] = (new Date()).toISOString()
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
				try {
					const addCidToEstuaryCollection = await this.helpers.addCidToEstuaryCollection(this.apiHost, accountsCollection.uuid, walletsChainCid.toString(), "last_block")
				} catch (error) {
					return new Promise((resolve, reject) => {
						reject({
							error: error,
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

		try {
			const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		walletsChain["parent"] = walletsCid
		walletsChain["timestamp"] = (new Date()).toISOString()
		walletsChain[this.selectedAddress] = walletChainCid.toString()
		const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		try {
			const addCidToEstuaryCollection = await this.helpers.addCidToEstuaryCollection(this.apiHost, collection, walletsChainCid.toString(), "last_block")
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
		accountsKeys.splice(accountsKeys.indexOf("timestamp"), 1)
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

		try {
			const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `template_${name}_${templateCid.toString()}`, templateCid.toString())
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
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

		try {
			const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `template_block_${name}_${templateBlockCid.toString()}`, templateBlockCid.toString())
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
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

			try {
				const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `file_${result.path}_${result.cid.toString()}`, result.cid.toString())
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
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


		try {
			const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `asset_${parameters.name}_${assetCid.toString()}`, assetCid.toString())
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
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


		try {
			const pinEstuary = await this.helpers.pinEstuary(this.apiHost, `asset_block_${parameters.name}_${assetBlockCid.toString()}`, assetBlockCid.toString())
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
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