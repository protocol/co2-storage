import { create } from 'ipfs-core'
import { create as createClient } from 'ipfs-http-client'
import { CID } from 'multiformats/cid'
import { CommonHelpers } from '../helpers/Common.js'
import { FGHelpers } from '../helpers/FG.js'
import { EstuaryHelpers } from '../helpers/Estuary.js'
import { Auth } from '../auth/Auth.js'
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util'

import { multiaddr } from '@multiformats/multiaddr'
import { webSockets } from '@libp2p/websockets'

const ws = new webSockets()

export class FGStorage {
	peers = [
		'/dns4/web1.co2.storage/tcp/5004/wss/p2p/12D3KooWCPzmui9TSQQG8HTNcZeFiHz6AGS19aaCwxJdjykVqq7f',
		'/dns4/web2.co2.storage/tcp/5004/wss/p2p/12D3KooWFBCcWEDW9GYr9Aw8D2QL7hZakPAw1DGfeZCwfsrjd43b',
//		'/dns4/green.filecoin.space/tcp/5003/wss/p2p/12D3KooWJmYbQp2sgKX22vZgSRVURkpMQ5YCSc8vf3toHesJc5Y9',
//		'/dns4/proxy.co2.storage/tcp/5003/wss/p2p/12D3KooWGWHSrAxr6sznTpdcGuqz6zfQ2Y43PZQzhg22uJmGP9n1',
		'/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
		'/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
		'/dns4/node2.preload.ipfs.io/tcp/443/wss/p2p/QmV7gnbW5VTcJ3oyM2Xk1rdFBJ3kTkvxc87UFGsun29STS',
		'/dns4/node3.preload.ipfs.io/tcp/443/wss/p2p/QmY7JB6MQXhxHvq7dBDh4HpbH29v4yE9JRadAVpndvzySN',
//		'/dns4/nrt-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
//		'/dns4/sjc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
//		'/dns4/sjc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
//		'/dns4/ams-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
//		'/dns4/ewr-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
	]
//	ipfsRepoName = './ipfs_repo_' + Math.random()
	ipfsRepoName = './.ipfs'
	ipfsNodeAddr = (process.env.NODE_ENV == 'production') ? '/dns4/web1.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001'
	ipfsNodeType = 'client'
	ipfsNodeOpts = {
		config: {
			Bootstrap: []
		},
		libp2p: {
			transports: [ws],
			connectionManager: {
				autoDial: false
			}
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
	fgApiToken = null
	estuaryApiHost = "https://api.estuary.tech"
	verifyingSignatureContractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"getChainId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"geteip712DomainHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"cid","type":"string"}],"name":"gethashStruct","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"cid","type":"string"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
	verifyingSignatureContractAddress = "0x7c75AA9001c4E35EDfb5466d3fdBdd3729dd4Ee7"
	ethereumChainId = 1

    constructor(options) {
		if(options.authType != undefined)
			this.authType = options.authType
		if(options.ipfsNodeType != undefined)
			this.ipfsNodeType = options.ipfsNodeType
		if(options.ipfsRepoName != undefined)
			this.ipfsRepoName = options.ipfsRepoName
		if(options.ipfsNodeOpts != undefined)
			this.ipfsNodeOpts = Object.assign(this.ipfsNodeOpts, options.ipfsNodeOpts)
		if(options.ipfsNodeAddr != undefined)
			this.ipfsNodeAddr = options.ipfsNodeAddr
		if(options.fgApiHost != undefined)
			this.fgApiHost = options.fgApiHost
		if(options.fgApiToken != undefined)
			this.fgApiToken = options.fgApiToken

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
		const that = this
		this.ipfsStarting = true
		this.ipfsStarted = false

		let ipfsOpts = {}

		switch (this.ipfsNodeType) {
			case 'client':
				ipfsOpts = Object.assign({url: this.ipfsNodeAddr, timeout: '1w'}, this.ipfsNodeOpts)
				this.ipfs = await createClient(ipfsOpts)
				break
			case 'browser':
				ipfsOpts = Object.assign({
					repo: this.ipfsRepoName,
					EXPERIMENTAL: {
						ipnsPubsub: true
					}
				}, this.ipfsNodeOpts)
				this.ipfs = await create(ipfsOpts)
				break
			default:
				ipfsOpts = Object.assign({url: this.ipfsNodeAddr, timeout: '1w'}, this.ipfsNodeOpts)
				this.ipfs = await createClient(ipfsOpts)
				break
		}

		setTimeout(async () => {
			for (const peer of that.peers) {
				try {
					await that.ipfs.swarm.connect(multiaddr(peer))
				} catch (error) {
					console.log(peer, error)
				}
			}
		}, 0)
		
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
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		let result
		try {
			result = (await this.fgHelpers.signup(this.fgApiHost, signedTokenRequest, (issueNewToken == true))).result
			this.fgApiToken = result.data.token
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

			setTimeout(async () => {
				let signedTokenRequest
				if(that.fgApiToken == undefined)
					try {
						signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
						await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
						await that.fgHelpers.queuePin(that.fgApiHost, "estuary", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					} catch (error) {
						console.log(error)
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

				setTimeout(async () => {
					let signedTokenRequest
					if(that.fgApiToken == undefined)
						try {
							signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
							await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
							await that.fgHelpers.queuePin(that.fgApiHost, "estuary", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
						} catch (error) {
							console.log(error)
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
			let signedTokenRequest
			if(this.fgApiToken == undefined)
				try {
					signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
				} catch (error) {
					return new Promise((resolve, reject) => {
						reject({
							error: error,
							result: null
						})
					})
				}

			try {
				const updateHeadWithSignUpResponse = (await this.fgHelpers.updateHeadWithSignUp(chainName, this.fgApiHost, this.selectedAddress, walletsChain["parent"], walletsChainCid.toString(), this.fgApiToken, signedTokenRequest)).result
				this.fgApiToken = updateHeadWithSignUpResponse.token
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

	async searchTemplates(chainName, phrases, cid, name, base, account, offset, limit, sortBy, sortDir) {
		let templates = [], total = 0
		if(offset == undefined)
			offset = 0
		if(limit == undefined)
			limit = 10
		try {
			const myTemplates = (await this.search(chainName, phrases, 'template', cid, null, name, null, base, null, null, account, null, null, null, offset, limit, sortBy, sortDir)).result
			templates = myTemplates.map((template) => {
				return {
					template: template,
					block: template.cid,
					cid: template.content_cid
				}
			})
			total = (templates.length) ? templates[0].template.total : 0
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
					templates: templates,
					offset: offset,
					limit: limit,
					total: total
				},
				error: null
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

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", templateCid.toString(), `template_${name}_${templateCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateCid.toString(), `template_${name}_${templateCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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
			"description": description,
			"protocol_name" : "transform.storage",
			"type_checking": 1

		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", templateBlockCid.toString(), `template_block_${name}_${templateBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateBlockCid.toString(), `template_block_${name}_${templateBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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
					block: templateBlockCid.toString(),
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
					block: templateBlockCid.toString(),
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

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", templateCid.toString(), `template_${block.name}_${templateCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateCid.toString(), `template_${block.name}_${templateCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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
			"protocol_name" : "transform.storage",
			"type_checking": 1,
			"signed": signature
		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
	
		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", templateBlockCid.toString(), `template_block_${block.name}_${templateBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", templateBlockCid.toString(), `template_block_${block.name}_${templateBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		try {
			this.fgHelpers.removeUpdatedContent(this.fgApiHost, cid, this.selectedAddress, this.fgApiToken, signedTokenRequest)
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
					block: templateBlockCid.toString(),
					template: template
				}
			})
		})
	}

	async searchAssets(chainName, phrases, cid, name, base, account, offset, limit, sortBy, sortDir) {
		let assets = [], total = 0
		if(offset == undefined)
			offset = 0
		if(limit == undefined)
			limit = 10
		try {
			const myAssets = (await this.search(chainName, phrases, 'asset', cid, null, name, null, base, null, null, account, null, null, null, offset, limit, sortBy, sortDir)).result
			assets = myAssets.map((asset) => {
				return {
					asset: asset,
					block: asset.cid,
					cid: asset.content_cid
				}
			})
			total = (assets.length) ? assets[0].asset.total : 0
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
					assets: assets,
					offset: offset,
					limit: limit,
					total: total
				},
				error: null
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

		// Map asset elements with provided template
		let template, templateKeys
		try {
			const templateBlockCid = CID.parse(parameters.template)
			const templateBlock = (await this.ipfs.dag.get(templateBlockCid)).value
			template = (await this.ipfs.dag.get(CID.parse(templateBlock.cid))).value
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		templateKeys = Object.keys(template)
		if(templateKeys.length != assetElements.length) {
			return new Promise((resolve, reject) => {
				reject({
					error: "Provided asset is not matching with a template.",
					result: null
				})
			})
		}

		for (let assetElement of assetElements) {
			if(template[assetElement.name] == undefined) {
				return new Promise((resolve, reject) => {
					reject({
						error: "Provided asset is not matching with a template.",
						result: null
					})
				})
			}
			assetElement.type = template[assetElement.name].type
		}

		// If we have field types Image or Documents
		// add them to IPFS first and remap values with CIDs
		let fileContainingElements = assetElements
			.filter((f) => {return f.type == 'images' || f.type == 'documents'})

		if (fileContainingElements.length)
			if (parameters.hasOwnProperty('filesUploadStart') && typeof parameters.filesUploadStart == 'function')
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
						if (parameters.hasOwnProperty('filesUpload') && typeof parameters.filesUpload == 'function')
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

				setTimeout(async () => {
					let signedTokenRequest
					if(that.fgApiToken == undefined)
						try {
							signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
							await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
							await that.fgHelpers.queuePin(that.fgApiHost, "estuary", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
						} catch (error) {
							console.log(error)
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

				setTimeout(async () => {
					let signedTokenRequest
					if(that.fgApiToken == undefined)
						try {
							signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
							await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
							await that.fgHelpers.queuePin(that.fgApiHost, "estuary", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
						} catch (error) {
							console.log(error)
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
		if (parameters.hasOwnProperty('filesUploadEnd') && typeof parameters.filesUploadEnd == 'function')
			parameters.filesUploadEnd()

		// If we have field types BacalhauUrlDataset
		// run Bacalhau job first and remap values with job UUID
		let bacalhauJobElements = assetElements
			.filter((f) => {return f.type == 'bacalhau-url-dataset'})

		if (bacalhauJobElements.length)
			if (parameters.hasOwnProperty('waitingBacalhauJobStart') && typeof parameters.waitingBacalhauJobStart == 'function')
				parameters.waitingBacalhauJobStart()

		for (const bacalhauJobElement of bacalhauJobElements) {
			if(bacalhauJobElement.value == null)
				continue

			const type = 'url-dataset'
			const parameters = ''
			const inputs = bacalhauJobElement.value.inputs
			const container = 'ghcr.io/bacalhau-project/examples/upload:v1'
			const commands = ''
			const swarm = []
			let runBacalhauJobResponse
			try {
				runBacalhauJobResponse = await this.runBacalhauJob(type, parameters, inputs, container, commands, swarm)
			} catch (error) {
				if (parameters.hasOwnProperty('error') && typeof parameters.error == 'function')
					parameters.error(error)
				return
			}

			bacalhauJobElement.value = {
				type: (bacalhauJobElement.value.type) ? bacalhauJobElement.value.type : null,
				inputs: (bacalhauJobElement.value.inputs) ? bacalhauJobElement.value.inputs : null,
				swarm: (bacalhauJobElement.value.swarm) ? bacalhauJobElement.value.swarm : null,
				job_uuid: (runBacalhauJobResponse.result.job_uuid) ? runBacalhauJobResponse.result.job_uuid : null
			}
		}

		if (bacalhauJobElements.length)
			if (parameters.hasOwnProperty('bacalhauJobStarted') && typeof parameters.bacalhauJobStarted == 'function')
				parameters.bacalhauJobStarted()

		// If we have field types BacalhauCustomDockerJob
		// run Bacalhau job first and remap values with job UUID
		let bacalhauCustomDockerJobElements = assetElements
			.filter((f) => {return f.type == 'bacalhau-custom-docker-job-with-url-inputs'
				|| f.type == 'bacalhau-custom-docker-job-with-cid-inputs' || f.type == 'bacalhau-custom-docker-job-without-inputs'})

		if (bacalhauCustomDockerJobElements.length)
			if (parameters.hasOwnProperty('waitingBacalhauJobStart') && typeof parameters.waitingBacalhauJobStart == 'function')
				parameters.waitingBacalhauJobStart()
	
		for (const bacalhauCustomDockerJobElement of bacalhauCustomDockerJobElements) {
			if(bacalhauCustomDockerJobElement.value == null)
				continue

			const type = bacalhauCustomDockerJobElement.value.type
			const parameters = bacalhauCustomDockerJobElement.value.parameters
			const inputs = bacalhauCustomDockerJobElement.value.inputs
			const container = bacalhauCustomDockerJobElement.value.container
			const commands = bacalhauCustomDockerJobElement.value.commands
			const swarm = bacalhauCustomDockerJobElement.value.swarm
			let runBacalhauCustomDockerJobResponse
			try {
				runBacalhauCustomDockerJobResponse = await this.runBacalhauJob(type, parameters, inputs, container, commands, swarm)
			} catch (error) {
				if (parameters.hasOwnProperty('error') && typeof parameters.error == 'function')
					parameters.error(error)
				return
			}

			bacalhauCustomDockerJobElement.value = {
				type: (bacalhauCustomDockerJobElement.value.type) ? bacalhauCustomDockerJobElement.value.type : null,
				parameters: (bacalhauCustomDockerJobElement.value.parameters) ? bacalhauCustomDockerJobElement.value.parameters : null,
				inputs: (bacalhauCustomDockerJobElement.value.inputs) ? bacalhauCustomDockerJobElement.value.inputs : null,
				container: (bacalhauCustomDockerJobElement.value.container) ? bacalhauCustomDockerJobElement.value.container : null,
				commands: (bacalhauCustomDockerJobElement.value.commands) ? bacalhauCustomDockerJobElement.value.commands : null,
				swarm: (bacalhauCustomDockerJobElement.value.swarm) ? bacalhauCustomDockerJobElement.value.swarm : null,
				job_uuid: (runBacalhauCustomDockerJobResponse.result.job_uuid) ? runBacalhauCustomDockerJobResponse.result.job_uuid : null
			}
		}

		if (bacalhauCustomDockerJobElements.length)
			if (parameters.hasOwnProperty('bacalhauJobStarted') && typeof parameters.bacalhauJobStarted == 'function')
				parameters.bacalhauJobStarted()

		if (parameters.hasOwnProperty('createAssetStart') && typeof parameters.createAssetStart == 'function')
			parameters.createAssetStart()
		let dateContainingElements = assetElements
			.filter((f) => {return f.type == 'date' || f.type == 'datetime'})
		for (const dateContainingElement of dateContainingElements) {
			if(dateContainingElement.value == null)
				continue
			try {
				dateContainingElement.value = dateContainingElement.value.toISOString()
			} catch (error) {
				
			}
		}

		let datesContainingElements = assetElements
			.filter((f) => {return f.type == 'dates' || f.type == 'datetimes' || f.type == 'daterange' || f.type == 'datetimerange'})
		for (const datesContainingElement of datesContainingElements) {
			if(datesContainingElement.value == null)
				continue
			try {
				datesContainingElement.value = datesContainingElement.value.map((v) => {return v.toISOString()})
			} catch (error) {
				
			}
		}
		
		// Cretae asset data structure
		const asset = assetElements
				.filter((f) => {
					return f && Object.keys(f).length > 0 && Object.getPrototypeOf(f) === Object.prototype
				})
				.map((f) => {
				return {
					[f.name] : f.value
				}
			})

		const assetCid = await this.ipfs.dag.put(asset, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", assetCid.toString(), `asset_${parameters.name}_${assetCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetCid.toString(), `asset_${parameters.name}_${assetCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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
			"template": parameters.template,
			"protocol_name" : "transform.storage"
		}

		const assetBlockCid = await this.ipfs.dag.put(assetBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", assetBlockCid.toString(), `asset_block_${parameters.name}_${assetBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetBlockCid.toString(), `asset_block_${parameters.name}_${assetBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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

		if (parameters.hasOwnProperty('createAssetEnd') && typeof parameters.createAssetEnd == 'function')
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

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", assetCid.toString(), `asset_${block.name}_${assetCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetCid.toString(), `asset_${block.name}_${assetCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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
			"protocol_name" : "transform.storage",
			"signed": signature
		}

		const assetBlockCid = await this.ipfs.dag.put(assetBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
	
		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", assetBlockCid.toString(), `asset_block_${block.name}_${assetBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", assetBlockCid.toString(), `asset_block_${block.name}_${assetBlockCid.toString()}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		try {
			this.fgHelpers.removeUpdatedContent(this.fgApiHost, cid, this.selectedAddress, this.fgApiToken, signedTokenRequest)
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

		setTimeout(async () => {
			let signedTokenRequest
			if(that.fgApiToken == undefined)
				try {
					signedTokenRequest = (await that.signMessage((new Date()).toISOString())).result
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", walletChainCid.toString(), `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken, signedTokenRequest)
				} catch (error) {
					console.log(error)
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

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		try {
			const updateHeadWithSignUpResponse = (await this.fgHelpers.updateHeadWithSignUp(chainName, this.fgApiHost, this.selectedAddress, walletsChain["parent"], walletsChainCid.toString(), this.fgApiToken, signedTokenRequest)).result
			this.fgApiToken = updateHeadWithSignUpResponse.token
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

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		let estuaryKeyResponse
		try {
			estuaryKeyResponse = (await this.fgHelpers.estuaryKey(this.fgApiHost, this.selectedAddress, this.fgApiToken, signedTokenRequest)).result
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

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		let addEstuaryKeyResponse
		try {
			addEstuaryKeyResponse = (await this.fgHelpers.addEstuaryKey(this.fgApiHost, this.selectedAddress, key, expiry, this.fgApiToken, signedTokenRequest)).result
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

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		let removeEstuaryKeyResponse
		try {
			removeEstuaryKeyResponse = (await this.fgHelpers.removeEstuaryKey(this.fgApiHost, this.selectedAddress, this.fgApiToken, signedTokenRequest)).result
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

		if(typeof chainId == "string" && chainId.indexOf("0x") != 0) {
			chainId = `0x${chainId}`
		}
		else {
			chainId = `0x${chainId.toString(16)}`
		}

		try {
			const rpcRequest = {
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: chainId}],
			}

			if(web3.currentProvider.request) {
				await web3.currentProvider.request(rpcRequest)
			}
			else {
				await web3.currentProvider.send(rpcRequest)
			}

			chainId = await web3.eth.getChainId()

			return new Promise((resolve, reject) => {
				resolve({
					result: chainId,
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
		const chainId = await web3.eth.getChainId()

		if(chainId != this.ethereumChainId) {
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

	async signCid(blockCid) {
		const that = this
		let cid, type, chainName

		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		
		const web3 = authResponse.web3
		let chainId = await web3.eth.getChainId()

		if(chainId != this.ethereumChainId) {
			try {
				const switchNetworkResponse = await this.switchNetwork(this.ethereumChainId)
				chainId = await switchNetworkResponse.result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
		}

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

		try {
			const block = (await this.ipfs.dag.get(CID.parse(blockCid))).value
			cid = block.cid
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		try {
			const blockMetadata = (await this.fgHelpers.search(this.fgApiHost, null, null, null, blockCid, null, null, null,
				null, null, null, null, null, null, null, null, null, null, null)).result.data
			if(blockMetadata.length != 1) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: `Multiple or no results found for block CID ${blockCid}.` 
					})
				})
			}
			chainName = blockMetadata[0].chain_name
			type = blockMetadata[0].data_structure
		}
		catch(error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		const from = authResponse.result;
		const msgParams = {
			domain: {
			  name: 'CO2.storage Record',
			  version: '1',
			  chainId: chainId,
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

		const rpcRequest = {
			method,
			params,
			from,
		}
		const rpcResponse = async function (err, result) {
			if (err) {
				return {
					result: null,
					error: err
				}
			}
			if (result.error) {
				return {
					result: null,
					error: result
				}
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
					chainId: chainId,
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

				return {
					result: {
						type: type,
						signed: resp,
						signedObj: signResponse
					},
					error: null
				}
			} catch (error) {
				return {
					result: null,
					error: error
				}
			}
		}

		if(web3.currentProvider.sendAsync) {
//			web3.currentProvider.sendAsync(rpcRequest, rpcResponse)
			let rsp = await web3.currentProvider.request(rpcRequest)
			let response = await rpcResponse(null, {
				result: rsp,
				error: null
			})
			return new Promise((resolve, reject) => {
				resolve(response)
			}) 
		}
		else {
			const pk = process.env.PK
			const signature = signTypedData({
				privateKey: pk,
				data: msgParams,
				version: SignTypedDataVersion.V4,
			})

			let response = await rpcResponse(null, {
				result: signature,
				error: null
			})
			return new Promise((resolve, reject) => {
				resolve(response)
			})
		}
	}

	async signMessage(message) {
		const that = this

		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
	
		const web3 = authResponse.web3
		let chainId = await web3.eth.getChainId()

		if(chainId != this.ethereumChainId) {
			try {
				const switchNetworkResponse = await this.switchNetwork(this.ethereumChainId)
				chainId = await switchNetworkResponse.result
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
			  chainId: chainId,
			  verifyingContract: this.verifyingSignatureContractAddress,
			},
			message: {
			  signer: from,
			  cid: message
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

		const rpcRequest = {
			method,
			params,
			from,
		}
		const rpcResponse = function (err, result) {
			if (err) {
				return {
					result: null,
					error: err
				}
			}
			if (result.error) {
				return {
					result: null,
					error: result
				}
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
					chainId: chainId,
					cid: message,
					signature: signatureResponse,
					r: r,
					s: s,
					v: v
				}

				return {
					result: resp,
					error: null
				}
			} catch (error) {
				return {
					result: null,
					error: error
				}
			}
		}

		if(web3.currentProvider.sendAsync) {
//			web3.currentProvider.sendAsync(rpcRequest, rpcResponse)
			let rsp = await web3.currentProvider.request(rpcRequest)
			let response = rpcResponse(null, {
				result: rsp,
				error: null
			})
			return new Promise((resolve, reject) => {
				resolve(response)
			}) 
		}
		else {
			const pk = process.env.PK
			const signature = signTypedData({
				privateKey: pk,
				data: msgParams,
				version: SignTypedDataVersion.V4,
			})

			let response = rpcResponse(null, {
				result: signature,
				error: null
			})
			return new Promise((resolve, reject) => {
				resolve(response)
			})
		}
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

	async runBacalhauJob(job, parameters, inputs, container, commands, swarm) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		let runBacalhauJobResponse
		try {
			runBacalhauJobResponse = (await this.fgHelpers.runBacalhauJob(this.fgApiHost, this.selectedAddress, job, parameters, inputs, container, commands, swarm, this.fgApiToken, signedTokenRequest)).result
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

		let signedTokenRequest
		if(this.fgApiToken == undefined)
			try {
				signedTokenRequest = (await this.signMessage((new Date()).toISOString())).result
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}

		let bacalhauJobStatusResponse
		try {
			bacalhauJobStatusResponse = (await this.fgHelpers.bacalhauJobStatus(this.fgApiHost, this.selectedAddress, job, this.fgApiToken, signedTokenRequest)).result
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
					cid: bacalhauJobStatusResponse.data.cid,
					message: bacalhauJobStatusResponse.data.message
				}
			})
		})
	}
}