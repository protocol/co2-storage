import { create } from 'ipfs-core'
import { create as createClient } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'
import { CommonHelpers } from '../helpers/Common.js'
import { FGHelpers } from '../helpers/FG.js'
import { EstuaryHelpers } from '../helpers/Estuary.js'
import { Auth } from '../auth/Auth.js'

export class FGStorage {
	ipfsNodeAddr = (process.env.NODE_ENV == 'production') ? '/dns4/co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001'
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
	estuaryApiHost = "https://api.estuary.tech"
	verifyingSignatureContractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"getChainId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"geteip712DomainHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"cid","type":"string"}],"name":"gethashStruct","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"cid","type":"string"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
	verifyingSignatureContractAddress = "0x7c75AA9001c4E35EDfb5466d3fdBdd3729dd4Ee7"
	ethereumChainId = "0x1"

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
			error: null,
			web3: authResponse.web3
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
				this.ipfs = await createClient({url: this.ipfsNodeAddr, timeout: '1w'})
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
				this.ipfs = await createClient({url: this.ipfsNodeAddr, timeout: '1w'})
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

	async getApiToken(issueNewToken) {
		let result
		try {
			result = (await this.fgHelpers.signup(this.fgApiHost, process.env.MASTER_PASSWORD, this.selectedAddress, (issueNewToken == true))).result
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
				result: result
			})
		})
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

	async getAccounts(chainName) {
		const that = this
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
			head = (await this.fgHelpers.head(this.fgApiHost, chainName)).result
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

			window.setTimeout(async () => {
				try {
					await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `wallet_chain_${that.selectedAddress}`, walletChainCid.toString())
				} catch (error) {
					that.fgHelpers.queuePin(that.fgApiHost, "estuary", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress)
				}
			}, 0)

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

				window.setTimeout(async () => {
					try {
						await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `wallet_chain_${that.selectedAddress}`, walletChainCid.toString())
					} catch (error) {
						that.fgHelpers.queuePin(that.fgApiHost, "estuary", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress)
					}
				}, 0)
	
				walletsChain["parent"] = walletsCid
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

		// Update head record (and signup for a token if needed)
		if(walletsChainCid.toString() != walletsCid) {
			try {
				const result = this.fgHelpers.updateHeadWithSignUp(chainName, this.fgApiHost, this.selectedAddress, walletsChain["parent"], walletsChainCid.toString())
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

	async getAccount(chainName) {
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
			accounts = await this.getAccounts(chainName)
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
		const walletsCid = accounts.result.cid
		const list = accounts.result.list

		return new Promise((resolve, reject) => {
			resolve({
				result: {
					accounts: {
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

	async getAccountTemplatesAndAssets(chainName) {
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
			account = await this.getAccount(chainName)
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

	async updateAccount(assets, templates, chainName) {
		const that = this
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
			account = await this.getAccount(chainName)
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

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `wallet_chain_${that.selectedAddress}`, walletChainCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress)
			}
		}, 0)

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
			const result = this.fgHelpers.updateHeadWithSignUp(chainName, this.fgApiHost, this.selectedAddress, walletsChain["parent"], walletsChainCid.toString())
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

	async getTemplates(chainName, skip, limit) {
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
			getAccountsResponse = await this.getAccounts(chainName)
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

	async addTemplate(template, name, base, description, parent, chainName) {
		const that = this
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
			account = await this.getAccount(chainName)
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

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `template_${name}_${templateCid.toString()}`, templateCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateCid.toString(), `template_${name}_${templateCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		const templateBlock = {
			"parent": (parent) ? parent : null,
			"timestamp": (new Date()).toISOString(),
			"version": this.commonHelpers.templateBlockVersion,
			"creator": this.selectedAddress,
			"cid": templateCid.toString(),
			"name": name,
			"base": (base && base.title) ? base.title : null,
			"reference": (base && base.reference) ? base.reference : null,
			"description": description
		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `template_block_${name}_${templateBlockCid.toString()}`, templateBlockCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateBlockCid.toString(), `template_block_${name}_${templateBlockCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		templates.push(templateBlockCid.toString())

		try {
			await this.updateAccount(null, templates, chainName)
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

	async signTemplate(cid, signature, chainName) {
		const that = this
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
			account = await this.getAccount(chainName)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		let templates = account.result.value.templates

		let getTemplateResponse
		try {
			getTemplateResponse = (await this.getTemplate(cid)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let template = getTemplateResponse.template
		const block = getTemplateResponse.templateBlock

		const templateCid = await this.ipfs.dag.put(template, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `template_${block.name}_${templateCid.toString()}`, templateCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateCid.toString(), `template_${block.name}_${templateCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		const templateBlock = {
			"parent": (block.parent) ? block.parent : null,
			"timestamp": (new Date()).toISOString(),
			"version": this.commonHelpers.templateBlockVersion,
			"creator": this.selectedAddress,
			"cid": templateCid.toString(),
			"name": (block.name) ? block.name : null,
			"base": (block.base && block.base.title) ? block.base.title : null,
			"reference": (block.base && block.base.reference) ? block.base.reference : null,
			"description": (block.description) ? block.description : null,
			"signed": signature
		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `template_block_${block.name}_${templateBlockCid.toString()}`, templateBlockCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateBlockCid.toString(), `template_block_${block.name}_${templateBlockCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		try {
			this.fgHelpers.removeUpdatedContent(this.fgApiHost, cid, this.selectedAddress)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		templates.splice(templates.indexOf(cid), 1, templateBlockCid.toString())

		try {
			await this.updateAccount(null, templates, chainName)
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

	async addAsset(assetElements, parameters, chainName) {
		const that = this
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
			account = await this.getAccount(chainName)
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
			let newValue = [], folder

			let ipfsAdditions = []
			for (const file of fileContainingElement.value) {
				ipfsAdditions.push(this.ipfs.add(file, {
					'cidVersion': 1,
					'hashAlg': 'sha2-256',
					'wrapWithDirectory': false,
					'progress': async (bytes, path) => {
						await parameters.filesUpload(bytes, path, file)
					}
				}))
			}
			let results = await Promise.all(ipfsAdditions)
			for (const result of results) {
				if(result.path != '')
					newValue.push({
						cid: result.cid.toString(),
						path: result.path,
						size: result.size
					})

				window.setTimeout(async () => {
					try {
						await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `file_${result.path}_${result.cid.toString()}`, result.cid.toString())
					} catch (error) {
						that.fgHelpers.queuePin(that.fgApiHost, "estuary", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress)
					}
				}, 0)
			}
/*
			for await (const result of this.ipfs.addAll(fileContainingElement.value, {
				'cidVersion': 1,
				'hashAlg': 'sha2-256',
				'wrapWithDirectory': true,
				'progress': async (bytes, path) => {
					await parameters.filesUpload(bytes, path)
				}
			})) {
				if(result.path != '') {
					newValue.push({
						cid: result.cid.toString(),
						path: result.path,
						size: result.size
					})
				}
				else {
					folder = result.cid.toString()
				}

				window.setTimeout(async () => {
					try {
						await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `file_${result.path}_${result.cid.toString()}`, result.cid.toString())
					} catch (error) {
						that.fgHelpers.queuePin(that.fgApiHost, "estuary", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress)
					}
				}, 0)
			}
*/
			// Map CIDs to asset data structure
			fileContainingElement.value = newValue.map((x) => {
				if (folder) x.folder = folder
				return x
			})
		}
		parameters.filesUploadEnd()

		// If we have field types Bacalhau***
		// run Bacalhau job first and remap values with job UUID
		let bacalhauJobElements = assetElements
			.filter((f) => {return f.type == 'BacalhauUrlDataset'})

//		if (bacalhauJobElements.length)
//			parameters.filesUploadStart()

		for (const bacalhauJobElement of bacalhauJobElements) {
			if(bacalhauJobElement.value == null)
				continue

			const type = 'url-dataset'
			const inputs = bacalhauJobElement.value.inputs.join(',')
			const container = 'ghcr.io/bacalhau-project/examples/upload:v1'
			const commands = ''
			const runBacalhauJobResponse = await this.runBacalhauJob(type, inputs, container, commands)

			bacalhauJobElement.value = {
				inputs: bacalhauJobElement.value.inputs,
				job_uuid: runBacalhauJobResponse.result.job_uuid
			}
		}

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

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `asset_${parameters.name}_${assetCid.toString()}`, assetCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetCid.toString(), `asset_${parameters.name}_${assetCid.toString()}`, that.selectedAddress)
			}
		}, 0)

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

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `asset_block_${parameters.name}_${assetBlockCid.toString()}`, assetBlockCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetBlockCid.toString(), `asset_block_${parameters.name}_${assetBlockCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		assets.push(assetBlockCid.toString())

		try {
			await this.updateAccount(assets, null, chainName)
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

	async signAsset(cid, signature, chainName) {
		const that = this
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
			account = await this.getAccount(chainName)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		let assets = account.result.value.assets

		let getAssetResponse
		try {
			getAssetResponse = (await this.getAsset(cid)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let asset = getAssetResponse.asset
		const block = getAssetResponse.assetBlock

		const assetCid = await this.ipfs.dag.put(asset, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `asset_${block.name}_${assetCid.toString()}`, assetCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetCid.toString(), `asset_${block.name}_${assetCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		const assetBlock = {
			"parent": (block.parent) ? block.parent : null,
			"timestamp": (new Date()).toISOString(),
			"version": this.commonHelpers.assetBlockVersion,
			"creator": this.selectedAddress,
			"cid": assetCid.toString(),
			"name": (block.name) ? block.name : null,
			"description": (block.description) ? block.description : null,
			"template": (block.template) ? block.template : null,
			"signed": signature
		}

		const assetBlockCid = await this.ipfs.dag.put(assetBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		window.setTimeout(async () => {
			try {
				await that.estuaryHelpers.pinEstuary(that.estuaryApiHost, `asset_block_${block.name}_${assetBlockCid.toString()}`, assetBlockCid.toString())
			} catch (error) {
				that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetBlockCid.toString(), `asset_block_${block.name}_${assetBlockCid.toString()}`, that.selectedAddress)
			}
		}, 0)

		try {
			this.fgHelpers.removeUpdatedContent(this.fgApiHost, cid, this.selectedAddress)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		assets.splice(assets.indexOf(cid), 1, assetBlockCid.toString())

		try {
			await this.updateAccount(assets, null, chainName)
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

		let estuaryKeyResponse
		try {
			estuaryKeyResponse = (await this.fgHelpers.estuaryKey(this.fgApiHost, this.selectedAddress)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(estuaryKeyResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: estuaryKeyResponse,
					result: null
				})
			})
		}

		const key = estuaryKeyResponse.data.key
		const expiry = estuaryKeyResponse.data.validity

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: {
					token: key,
					expiry: expiry
				}
			})
		})
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
			await this.deleteEstuaryKey()
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
			createKeyResponse = (await this.estuaryHelpers.createEstuaryApiKey(this.estuaryApiHost, "upload", "87600h")).result.data
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

		let addEstuaryKeyResponse
		try {
			addEstuaryKeyResponse = (await this.fgHelpers.addEstuaryKey(this.fgApiHost, this.selectedAddress, key, expiry)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(addEstuaryKeyResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: addEstuaryKeyResponse,
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

		let estuaryKey
		try {
			estuaryKey = (await this.getEstuaryKey()).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		const key = estuaryKey.token
		try {
			await this.estuaryHelpers.deleteEstuaryApiKey(this.estuaryApiHost, key)
		} catch (error) {
// Estuary API is throwing CORS error (even on estuary.tech) when revoking existing key
// keeping this commented to alow deleting the key from the database
/* 
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
*/
		}

		let removeEstuaryKeyResponse
		try {
			removeEstuaryKeyResponse = (await this.fgHelpers.removeEstuaryKey(this.fgApiHost, this.selectedAddress)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(removeEstuaryKeyResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: removeEstuaryKeyResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: true
			})
		})
	}

	async search(chainName, phrases, dataStructure, cid, parent, name, description, base, reference, contentCid, creator, createdFrom, createdTo, version, offset, limit, sortBy, sortDir) {
		let search
		try {
			search = (await this.fgHelpers.search(this.fgApiHost, chainName, phrases, dataStructure, cid, parent, name, description, base, reference, contentCid, creator, createdFrom, createdTo, version, offset, limit, sortBy, sortDir)).result.data
		} catch (searchResponse) {
			if(searchResponse.error.response.status != 404) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
		}

		return new Promise((resolve, reject) => {
			resolve({
				result: search,
				error: null
			})
		})
	}

	async switchNetwork(chainId) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		const web3 = authResponse.web3
		if(web3.eth.getChainId() != chainId) {
			try {
				await web3.currentProvider.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: chainId}],
				})
				return new Promise((resolve, reject) => {
					resolve({
						result: web3.eth.getChainId(),
						error: null
					})
				})
			} catch (switchError) {
				// This error code indicates that the chain has not been added to MetaMask.
				if (switchError.code === 4902) {
					// TODO, add network to metamask
				}
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: switchError
					})
				})
			}
		}
	}

	async verifyCidSignature(signer, cid, v, r, s) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		const web3 = authResponse.web3

		if(web3.currentProvider.chainId != this.ethereumChainId) {
			try {
				const switchNetworkResponse = await this.switchNetwork(this.ethereumChainId)
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
		}

		let verifySignatureResponse
		try {
			const contract = new web3.eth.Contract(this.verifyingSignatureContractABI, this.verifyingSignatureContractAddress)
			verifySignatureResponse = await contract.methods.verifySignature(signer, cid, v, r, s).call()
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}
		return new Promise((resolve, reject) => {
			resolve({
				result: verifySignatureResponse,
				error: null
			})
		})
	}

	async signCid(cid, blockCid, type, chainName, callback) {
		const that = this
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			callback({
				result: null,
				error: authResponse.error
			})
		const web3 = authResponse.web3

		if(web3.currentProvider.chainId != this.ethereumChainId) {
			try {
				const switchNetworkResponse = await this.switchNetwork(this.ethereumChainId)
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
		}

		const from = authResponse.result;
		const msgParams = {
			domain: {
			  name: 'CO2.storage Record',
			  version: '1',
			  chainId: await web3.eth.getChainId(),
			  verifyingContract: this.verifyingSignatureContractAddress,
			},
			message: {
			  signer: from,
			  cid: cid
			},
			primaryType: 'Record',
			types: {
			  EIP712Domain: [
				{ name: 'name', type: 'string' },
				{ name: 'version', type: 'string' },
				{ name: 'chainId', type: 'uint256' },
				{ name: 'verifyingContract', type: 'address' },
			  ],
			  Record: [
				{ name: 'signer', type: 'address' },
				{ name: 'cid', type: 'string' }
			  ],
			},
		}

		const params = [from, JSON.stringify(msgParams)];
		var method = 'eth_signTypedData_v4';
		
		web3.currentProvider.sendAsync({
				method,
				params,
				from,
			},
			async function (err, result) {
				if (err) {
					callback({
						result: null,
						error: err
					})
					return
				}
				if (result.error) {
					callback({
						result: null,
						error: result
					})
					return
				}
				try {
					const signatureResponse = result.result
					const signature = signatureResponse.substring(2)
					const r = "0x" + signature.substring(0, 64)
					const s = "0x" + signature.substring(64, 128)
					const v = parseInt(signature.substring(128, 130), 16)
					const resp = {
						method: method,
						account: from,
						verifyingContract: that.verifyingSignatureContractAddress,
						chainId: web3.currentProvider.chainId,
						cid: cid,
						signature: signatureResponse,
						r: r,
						s: s,
						v: v
					}
					let signResponse
					switch (type) {
						case "template":
							signResponse = await that.signTemplate(blockCid, resp, chainName)
							break
						case "asset":
							signResponse = await that.signAsset(blockCid, resp, chainName)
							break
						default:
							break
					}
					callback({
						result: {
							type: type,
							signed: resp,
							signedObj: signResponse
						},
						error: null
					})
				} catch (error) {
					callback({
						result: null,
						error: error
					})
				}
			}
		)
	}

	async listDataChains(offset, limit) {
		let search
		try {
			search = (await this.fgHelpers.listDataChains(this.fgApiHost, offset, limit)).result.data
		} catch (searchResponse) {
			if(searchResponse.error.response.status != 404) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
		}

		return new Promise((resolve, reject) => {
			resolve({
				result: search,
				error: null
			})
		})
	}

	async runBacalhauJob(job, inputs, container, commands) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let runBacalhauJobResponse
		try {
			runBacalhauJobResponse = (await this.fgHelpers.runBacalhauJob(this.fgApiHost, this.selectedAddress, job, inputs, container, commands)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(runBacalhauJobResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: runBacalhauJobResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: {
					job_uuid: runBacalhauJobResponse.data.job_uuid
				}
			})
		})
	}

	async bacalhauJobStatus(job) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let bacalhauJobStatusResponse
		try {
			bacalhauJobStatusResponse = (await this.fgHelpers.bacalhauJobStatus(this.fgApiHost, this.selectedAddress, job)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(bacalhauJobStatusResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: bacalhauJobStatusResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: {
					job: bacalhauJobStatusResponse.data.job,
					cid: bacalhauJobStatusResponse.data.cid
				}
			})
		})
	}
}