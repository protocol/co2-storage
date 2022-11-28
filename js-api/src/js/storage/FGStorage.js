import { create } from 'ipfs-core'
import { create as createClient } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'
import { CommonHelpers } from '../helpers/Common.js'
import { FGHelpers } from '../helpers/FG.js'
import { EstuaryHelpers } from '../helpers/Estuary.js'
import { Auth } from '../auth/Auth.js'

export class FGStorage {
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
    commonHelpers = null
	fgHelpers = null
	estuaryHelpers = null
	authType = null
	auth = null
	fgApiHost = (process.env.NODE_ENV == 'production') ? "https://co2.storage" : "http://localhost:3020"
	etuaryApiHost = "https://api.estuary.tech"

    constructor(options) {
		if(options.authType != undefined)
			this.authType = options.authType
		if(options.ipfsNodeType != undefined)
			this.ipfsNodeType = options.ipfsNodeType
		if(options.ipfsNodeConfig != undefined)
			this.ipfsNodeConfig = options.ipfsNodeConfig
		if(options.ipfsNodeAddr != undefined)
			this.ipfsNodeAddr = options.ipfsNodeAddr

		this.commonHelpers = new CommonHelpers()
		this.fgHelpers = new FGHelpers()
		this.estuaryHelpers = new EstuaryHelpers()
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
				await this.commonHelpers.sleep(1000)
			}
		}
		return this.ipfs
	}

	async getAccounts() {
		let walletChain = {}, walletsChain = {}
		let walletsCid = null, head = null

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

		try {
			head = (await this.fgHelpers.head(this.fgApiHost)).result
		} catch (headResponse) {
			if(headResponse.error.response.status != 404) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
			head = null
		}

		if(head == null) {
			// Create genesis block
			walletChain = {
				"parent": null,
				"version": this.commonHelpers.walletVersion,
				"name": null,
				"description": null,
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
				const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
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
			walletsChain["version"] = this.commonHelpers.walletsVersion
			walletsChain[this.selectedAddress] = walletChainCid.toString()
		}
		else {
			// Retrieve last block / head
			walletsCid = head.data.head

			// Get last walletsChain block
			walletsChain = (await this.ipfs.dag.get(CID.parse(walletsCid))).value

			// Check is this account already added to accounts
			if(walletsChain[this.selectedAddress] == null) {
				// Add this account
				walletChain = {
					"parent": null,
					"version": this.commonHelpers.walletVersion,
					"name": null,
					"description": null,
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
					const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
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
				walletsChain["version"] = this.commonHelpers.walletsVersion
				walletsChain[this.selectedAddress] = walletChainCid.toString()
			}
		}

		const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		// Signup for a token and update head record
		if(walletsChainCid.toString() != walletsCid) {
			let token = null, signup = null, signedUp = null, updateHead = null, updated = null

			try {
				signup = (await this.fgHelpers.signup(this.fgApiHost, process.env.MASTER_PASSWORD, this.selectedAddress, true)).result

				// Check if signup was successfull
				signedUp = signup.data.signedup
				if(signedUp != true) {
					return new Promise((resolve, reject) => {
						reject({
							error: signup.data,
							result: null
						})
					})
				}

				// Get token
				token = signup.data.token

				updateHead = (await this.fgHelpers.updateHead(this.fgApiHost, walletsChain["parent"], walletsChainCid.toString(), this.selectedAddress, token)).result

				// Check if head update was successfull
				updated = updateHead.data.updated
				if(updated != true) {
					return new Promise((resolve, reject) => {
						reject({
							error: updateHead.data,
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

		walletsCid = walletsChainCid.toString()

		return new Promise((resolve, reject) => {
			resolve({
				result: {
					list: walletsChain,
					cid: walletsCid
				},
				error: null
			})
		})
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
			"version": this.commonHelpers.walletVersion,
			"name": (current.name != undefined) ? current.name : null,
			"description": (current.description != undefined) ? current.description : null,
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
			const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `wallet_chain_${this.selectedAddress}`, walletChainCid.toString())
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
		walletsChain["version"] = this.commonHelpers.walletsVersion
		walletsChain[this.selectedAddress] = walletChainCid.toString()
		const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		try {
			const addCidToEstuaryCollection = await this.estuaryHelpers.addCidToEstuaryCollection(this.etuaryApiHost, collection, walletsChainCid.toString(), "last_block")
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
		const total = accountsKeys.length
		accountsKeys.splice(accountsKeys.indexOf("parent"), 1)
		accountsKeys.splice(accountsKeys.indexOf("timestamp"), 1)
		accountsKeys.splice(accountsKeys.indexOf("version"), 1)
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
					limit: limit,
					total: total
				}
			})
		})
	}

	async addTemplate(template, name, base, description, parent) {
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
			const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `template_${name}_${templateCid.toString()}`, templateCid.toString())
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
			"version": this.commonHelpers.templateBlockVersion,
			"creator": this.selectedAddress,
			"cid": templateCid.toString(),
			"name": name,
			"base": base,
			"description": description
		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		try {
			const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `template_block_${name}_${templateBlockCid.toString()}`, templateBlockCid.toString())
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
				const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `file_${result.path}_${result.cid.toString()}`, result.cid.toString())
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

		// TODO, check does asset data structure matches the template
		
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
			const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `asset_${parameters.name}_${assetCid.toString()}`, assetCid.toString())
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
			"version": this.commonHelpers.assetBlockVersion,
			"creator": this.selectedAddress,
			"cid": assetCid.toString(),
			"name": parameters.name,
			"description": parameters.description,
			"template": parameters.template
		}

		const assetBlockCid = await this.ipfs.dag.put(assetBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})


		try {
			const pinEstuary = await this.estuaryHelpers.pinEstuary(this.etuaryApiHost, `asset_block_${parameters.name}_${assetBlockCid.toString()}`, assetBlockCid.toString())
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

	async getEstuaryKey() {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let collections
		try {
			collections = (await this.estuaryHelpers.getEstuaryCollections(this.etuaryApiHost)).result.data
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let keyCollection = collections.filter((c) => {return c.name.indexOf(`key::${this.selectedAddress}`) > -1})

		if(!keyCollection.length) {
			return new Promise((resolve, reject) => {
				reject({
					error: {code: 404, message: `Key for account ${this.selectedAddress} does not exists!`},
					result: null
				})
			})
		}
		else if(keyCollection.length == 1) {
			const keyColl = keyCollection[0]
			try {
				const keyCollectionChunks = keyColl.name.split("::")
				const key = keyCollectionChunks[2]
				const expiry = keyCollectionChunks[3]
				return new Promise((resolve, reject) => {
					resolve({
						error: null,
						result: {
							token: key,
							expiry: expiry
						}
					})
				})
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: {code: 500, message: `Key for account ${this.selectedAddress} has wrong structure!`},
						result: null
					})
				})
			}
		}
		else {
			return new Promise((resolve, reject) => {
				reject({
					error: {code: 500, message: `Multiple collections with the same key exists! Account: ${this.selectedAddress}`},
					result: null
				})
			})
		}
	}

	async createEstuaryKey() {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		try {
			const deleteEstuaryKeyResponse = await this.deleteEstuaryKey()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let createKeyResponse
		try {
			createKeyResponse = (await this.estuaryHelpers.createEstuaryApiKey(this.etuaryApiHost, "upload", "87600h")).result.data
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		const key = createKeyResponse.token
		const expiry = createKeyResponse.expiry

		let createKeyCollectionResponse
		try {
			createKeyCollectionResponse = (await this.estuaryHelpers.createEstuaryCollection(this.etuaryApiHost, `key::${this.selectedAddress}::${key}::${expiry}`, `Collection containing co2.storage key for account ${this.selectedAddress}`))
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
				result: createKeyResponse
			})
		})
	}

	async deleteEstuaryKey() {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let collections
		try {
			collections = (await this.estuaryHelpers.getEstuaryCollections(this.etuaryApiHost)).result.data
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let keyCollection = collections.filter((c) => {return c.name.indexOf(`key::${this.selectedAddress}`) > -1})

		for await (const keyColl of keyCollection) {
			let key
			try {
				const keyCollectionChunks = keyColl.name.split("::")
				key = keyCollectionChunks[2]
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: {code: 500, message: `Error whilst retrieving key for ${this.selectedAddress}!`},
						result: null
					})
				})
			}

			try {
				const deleteKeyResponse = await this.estuaryHelpers.deleteEstuaryApiKey(this.etuaryApiHost, key)
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

			try {
				const deleteKeyCollectionResponse = await this.estuaryHelpers.deleteEstuaryCollection(this.etuaryApiHost, keyColl.uuid)
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: true
			})
		})
	}
}