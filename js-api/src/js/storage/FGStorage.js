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
		'/dns4/green.filecoin.space/tcp/5004/wss/p2p/12D3KooWJmYbQp2sgKX22vZgSRVURkpMQ5YCSc8vf3toHesJc5Y9',
		'/dns4/proxy.co2.storage/tcp/5004/wss/p2p/12D3KooWGWHSrAxr6sznTpdcGuqz6zfQ2Y43PZQzhg22uJmGP9n1',
/*		'/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
		'/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
		'/dns4/node2.preload.ipfs.io/tcp/443/wss/p2p/QmV7gnbW5VTcJ3oyM2Xk1rdFBJ3kTkvxc87UFGsun29STS',
		'/dns4/node3.preload.ipfs.io/tcp/443/wss/p2p/QmY7JB6MQXhxHvq7dBDh4HpbH29v4yE9JRadAVpndvzySN',*/
	]
//	ipfsRepoName = './ipfs_repo_' + Math.random()
	ipfsRepoName = './.ipfs'
	ipfsNodeAddr = (process.env.NODE_ENV == 'production') ? '/dns4/web1.co2.storage/tcp/5002/https' : '/ip4/127.0.0.1/tcp/5001'
	ipfsNodeType = 'client'
	ipfsNodeOpts = {
		config: {},
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
	verifyingCidSignatureContractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"getChainId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"geteip712DomainHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"cid","type":"string"}],"name":"gethashStruct","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"cid","type":"string"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
	verifyingCidSignatureContractAddress = "0x7c75AA9001c4E35EDfb5466d3fdBdd3729dd4Ee7"
	verifyingMessageSignatureContractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"getChainId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getContractAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"geteip712DomainHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"message","type":"string"}],"name":"gethashStruct","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"signer","type":"address"},{"internalType":"string","name":"message","type":"string"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
	verifyingMessageSignatureContractAddress = "0x3cF60d94C95965D20E904e28fCf2DD0a14DB384f"
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

		const config = await this.ipfs.config.getAll()
		const hostPeerId = config.Identity.PeerID
		for (const peer of this.peers) {
			if(peer.indexOf(hostPeerId) == -1)
				try {
					const ma = multiaddr(peer)
					await this.ipfs.bootstrap.add(ma)
					await this.ipfs.swarm.connect(ma)
				} catch (error) {
					console.log(peer, error)
				}
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

	async getDag(cid) {
		return (await this.ipfs.dag.get(CID.parse(cid))).value
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
		try {
			signedTokenRequest = (await this.signMessage(`Filecoin Green token request made on ${(new Date()).toISOString()}`)).result
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

	async setApiToken(token) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		this.fgApiToken = token
	}

	async checkApiTokenValidity(token) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		let response, result = false
		try {
			response = (await this.fgHelpers.authenticate(this.fgApiHost, token)).result
			const validity = new Date(response.data.validity)
			if(validity > new Date())
				result = true
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: false
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

	async getApiProfile() {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let result
		try {
			result = (await this.fgHelpers.authenticate(this.fgApiHost, this.fgApiToken)).result
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

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

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
				"assets": [],
				"provenance": []
			}
			const walletChainCid = await this.ipfs.dag.put(walletChain, {
				storeCodec: 'dag-cbor',
				hashAlg: 'sha2-256',
				pin: true
			})

			let cidw
			try {
				cidw = (await this.fgHelpers.addCborDag(this.fgApiHost, walletChain, this.fgApiToken)).result.data.cid
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}
			if(walletChainCid.toString() != cidw)
				await this.ipfs.pin.add(CID.parse(cidw))

			setTimeout(async () => {
				try {
					await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidw, `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken)
					await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidw, `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken)
				} catch (error) {
					console.log(error)
				}
			}, 0)

			walletsChain["parent"] = null
			walletsChain["timestamp"] = (new Date()).toISOString()
			walletsChain["version"] = this.commonHelpers.walletsVersion
			walletsChain[this.selectedAddress] = cidw
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
					"assets": [],
					"provenance": []
				}
				const walletChainCid = await this.ipfs.dag.put(walletChain, {
					storeCodec: 'dag-cbor',
					hashAlg: 'sha2-256',
					pin: true
				})

				let cidw
				try {
					cidw = (await this.fgHelpers.addCborDag(this.fgApiHost, walletChain, this.fgApiToken)).result.data.cid
				} catch (error) {
					return new Promise((resolve, reject) => {
						reject({
							result: null,
							error: error
						})
					})
				}
				if(walletChainCid.toString() != cidw)
					await this.ipfs.pin.add(CID.parse(cidw))
				
				setTimeout(async () => {
					try {
						await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidw, `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken)
						await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidw, `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken)
					} catch (error) {
						console.log(error)
					}
				}, 0)
	
				walletsChain["parent"] = walletsCid
				walletsChain["timestamp"] = (new Date()).toISOString()
				walletsChain["version"] = this.commonHelpers.walletsVersion
				walletsChain[this.selectedAddress] = cidw
			}
		}

		const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidws
		try {
			cidws = (await this.fgHelpers.addCborDag(this.fgApiHost, walletsChain, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}
		if(walletsChainCid.toString() != cidws)
			await this.ipfs.pin.add(CID.parse(cidws))

		// Update head record (and signup for a token if needed)
		if(cidws != walletsCid) {
			try {
				await this.fgHelpers.updateHead(chainName, this.fgApiHost, walletsChain["parent"], cidws, this.selectedAddress, this.fgApiToken)
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		walletsCid = cidws

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
			const myTemplates = (await this.search(chainName, phrases, 'template', cid, null, name, null, base, null, null, account, null, null, null, null, null, offset, limit, sortBy, sortDir)).result
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

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
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

		// Search for template / schema types in provided template
		if(Array.isArray(template)) {
			// Template is a list
			if(Array.isArray(template[0])) {
				// Template is a list of lists
				let templateVals = template.map((el)=>{return el[1]})
				for (let templateVal of templateVals) {
					const templateType = templateVal['type']
					const subTemplate = templateVal['value']
					if(templateType.toLowerCase() == 'template' || templateType.toLowerCase() == 'schema' || templateType.toLowerCase() == 'template-list' || templateType.toLowerCase() == 'schema-list') {
						const subTemplateCid = this.makeCid(subTemplate)
						if(subTemplateCid == null)
							return new Promise((resolve, reject) => {
								reject({
									error: `Provided template CID ${subTemplate} is invalid.`,
									result: null
								})
							})
							templateVal['value'] = subTemplateCid
					}
				}
			}
			else {
				// Template is a list of objects
				let templateVals = template.map((el)=>{return el[Object.keys(el)[0]]})
				for (let templateVal of templateVals) {
					const templateType = templateVal['type']
					const subTemplate = templateVal['value']
					if(templateType.toLowerCase() == 'template' || templateType.toLowerCase() == 'schema' || templateType.toLowerCase() == 'template-list' || templateType.toLowerCase() == 'schema-list') {
						const subTemplateCid = this.makeCid(subTemplate)
						if(subTemplateCid == null)
							return new Promise((resolve, reject) => {
								reject({
									error: `Provided template CID ${subTemplate} is invalid.`,
									result: null
								})
							})
						templateVal['value'] = subTemplateCid
					}
				}
			}
		}
		else {
			// Template is an object
			const templateKeys = Object.keys(template)
			for (const templateKey of templateKeys) {
				const templateKeyType = template[templateKey]['type']
				const subTemplate = template[templateKey]['value']
				if(templateKeyType.toLowerCase() == 'template' || templateKeyType.toLowerCase() == 'schema' || templateKeyType.toLowerCase() == 'template-list' || templateKeyType.toLowerCase() == 'schema-list') {
					const subTemplateCid = this.makeCid(subTemplate)
					if(subTemplateCid == null)
						return new Promise((resolve, reject) => {
							reject({
								error: `Provided template CID ${subTemplate} is invalid.`,
								result: null
							})
						})
					template[templateKey]['value'] = subTemplateCid
				}
			}
		}

		const templateCid = await this.ipfs.dag.put(template, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidt
		try {
			cidt = (await this.fgHelpers.addCborDag(this.fgApiHost, template, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}
		if(templateCid.toString() != cidt)
			await this.ipfs.pin.add(CID.parse(cidt))

		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidt, `template_${name}_${cidt}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidt, `template_${name}_${cidt}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		const templateBlock = {
			"parent": (parent) ? parent : null,
			"timestamp": (new Date()).toISOString(),
			"version": this.commonHelpers.templateBlockVersion,
			"creator": this.selectedAddress,
			"cid": cidt,
			"name": name,
			"base": (base && base.title) ? base.title : null,
			"reference": (base && base.reference) ? base.reference : null,
			"description": description,
			"protocol_name" : "transform.storage",
			"type_checking": this.commonHelpers.typeChecking
		}

		const templateBlockCid = await this.ipfs.dag.put(templateBlock, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidtb
		try {
			cidtb = (await this.fgHelpers.addCborDag(this.fgApiHost, templateBlock, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}
		if(templateBlockCid.toString() != cidtb)
			await this.ipfs.pin.add(CID.parse(cidtb))

		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidtb, `template_block_${name}_${cidtb}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidtb, `template_block_${name}_${cidtb}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		templates.push(cidtb)

		try {
			await this.updateAccount(null, templates, null, chainName)
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
					block: cidtb,
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

	async searchAssets(chainName, phrases, cid, name, base, account, offset, limit, sortBy, sortDir) {
		let assets = [], total = 0
		if(offset == undefined)
			offset = 0
		if(limit == undefined)
			limit = 10
		try {
			const myAssets = (await this.search(chainName, phrases, 'asset', cid, null, name, null, base, null, null, account, null, null, null, null, null, offset, limit, sortBy, sortDir)).result
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

	async addAsset(assetElements, parameters, chainName, uploadCallback) {
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

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
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
		let template
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

		template = await this._extractNestedTemplates(template)

		// Prepare non trivial asset elements to be stored on IPFS
		let prepareAsset = await this._prepareAssetElements(assetElements, template, parameters, uploadCallback)
		if(prepareAsset.error != null)
			return new Promise((resolve, reject) => {
				reject({
					error: prepareAsset.error,
					result: null
				})
			})

		assetElements = prepareAsset.assetElements

		if (parameters.hasOwnProperty('createAssetStart') && typeof parameters.createAssetStart == 'function')
			parameters.createAssetStart()

		// Create asset data structure
		const asset = this._createAssetDataStructure(assetElements)

		const assetCid = await this.ipfs.dag.put(asset, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cida
		try {
			cida = (await this.fgHelpers.addCborDag(this.fgApiHost, asset, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		if(assetCid.toString() != cida)
			await this.ipfs.pin.add(CID.parse(cida))
	
		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cida, `asset_${parameters.name}_${cida}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cida, `asset_${parameters.name}_${cida}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		const assetBlock = {
			"parent": parameters.parent,
			"timestamp": (new Date()).toISOString(),
			"version": this.commonHelpers.assetBlockVersion,
			"creator": this.selectedAddress,
			"cid": cida,
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

		let cidab
		try {
			cidab = (await this.fgHelpers.addCborDag(this.fgApiHost, assetBlock, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		if(assetBlockCid.toString() != cidab)
			await this.ipfs.pin.add(CID.parse(cidab))

		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidab, `asset_block_${parameters.name}_${cidab}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidab, `asset_block_${parameters.name}_${cidab}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		assets.push(cidab)

		try {
			await this.updateAccount(assets, null, null, chainName)
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
					block: cidab,
					asset: asset
				}
			})
		})
	}

	_createAssetDataStructure(assetElements) {
		let asset = assetElements
			.filter((f) => {
				return f && Object.keys(f).length > 0 && Object.getPrototypeOf(f) === Object.prototype
			})
			.map((f) => {
				if((f.type == 'schema' || f.type == 'schema-list' || f.type == 'template' || f.type == 'template-list') && typeof f.value == 'object') {
					f.value = this._createAssetDataStructure(f.value)
				}
				return {
					[f.name] : f.value
				}
		})
		return asset
	}

	_determineTemplateTypeAndRetrieveKeys(template) {
		let templateKeys = []
		let templateType = 'object'
		if(Array.isArray(template)) {
			// Template is a list
			if(Array.isArray(template[0])) {
				// Template is a list of lists
				templateKeys = template.map((el)=>{return el[0]})
				templateType = 'list_of_lists'
			}
			else {
				// Template is a list of objects
				templateKeys = template.map((el)=>{return Object.keys(el)[0]})
				templateType = 'list_of_objects'
			}
		}
		else {
			// Template is an object
			templateKeys = Object.keys(template)
		}
		return {
			templateType: templateType,
			templateKeys: templateKeys
		}
	}

	async _assignTypesToAssetElements(assetElements, template) {
		let result

		template = await this._extractNestedTemplates(template)

		const templateTypeAndKeys = this._determineTemplateTypeAndRetrieveKeys(template)
		const templateType = templateTypeAndKeys.templateType
		const templateKeys = templateTypeAndKeys.templateKeys
		for (let assetElement of assetElements) {
			const key = assetElement.name
			const index = templateKeys.indexOf(key)
			if(index == -1) {
				return {
					assetElements: null,
					error: "Provided asset is not matching with a template."
				}
			}
			switch (templateType) {
				case 'list_of_lists':
				case 'list_of_objects':
					if(templateType == 'list_of_lists') {
						assetElement.type = template[index][1].type
						if((assetElement.type == 'schema' || assetElement.type == 'schema-list' || assetElement.type == 'template' || assetElement.type == 'template-list') && typeof assetElement.value == 'object')
							result = await this._assignTypesToAssetElements(assetElement.value, template[index][1].value)
					}
					else if(templateType == 'list_of_objects') {
						assetElement.type = template[index][key].type
						if((assetElement.type == 'schema' || assetElement.type == 'schema-list' || assetElement.type == 'template' || assetElement.type == 'template-list') && typeof assetElement.value == 'object')
							result = await this._assignTypesToAssetElements(assetElement.value, template[index][key].value)
					}
					break
				default:
					assetElement.type = template[key].type
					if((assetElement.type == 'schema' || assetElement.type == 'schema-list' || assetElement.type == 'template' || assetElement.type == 'template-list') && typeof assetElement.value == 'object')
						result = await this._assignTypesToAssetElements(assetElement.value, template[key].value)
			}
		}

		result = {
			assetElements: assetElements,
			error: null
		}

		return result
	}

	async _prepareAssetElements(assetElements, template, parameters, uploadCallback) {
		const that  = this
		let typesAssignment = await this._assignTypesToAssetElements(assetElements, template)
		if(typesAssignment.error != null)
			return {
				assetElements: null,
				error: typesAssignment.error
			}

		// If we have field types Schame or SchemaList
		let schemaContainingElements = assetElements
			.filter((f) => {return f.type == 'schema' || f.type == 'schema-list' || f.type == 'template' || f.type == 'template-list'})

		for (let schemaContainingElement of schemaContainingElements) {
			// Treat subforms
			const templateTypeAndKeys = this._determineTemplateTypeAndRetrieveKeys(template)
			const templateType = templateTypeAndKeys.templateType
			const templateKeys = templateTypeAndKeys.templateKeys
			const key = schemaContainingElement.name
			let subTemplate
			switch (templateType) {
				case 'list_of_lists':
				case 'list_of_objects':
					const index = templateKeys.indexOf(key)
					if(index == -1)
						continue
					if(templateType == 'list_of_lists') {
						subTemplate = template[index][1].value
					}
					else if(templateType == 'list_of_objects') {
						subTemplate = template[index][key].value
					}
					break
				default:
					if(template[key] == undefined)
						continue
					subTemplate = template[key].value
			}

			let prepareSubAsset = await this._prepareAssetElements(schemaContainingElement.value, subTemplate, parameters, uploadCallback)
			if(prepareSubAsset.error != null)
				return new Promise((resolve, reject) => {
					reject({
						error: prepareSubAsset.error,
						result: null
					})
				})

			schemaContainingElement.value = prepareSubAsset.assetElements
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
				// Upload file
				const uploadCountent = (file.content instanceof File) ? file.content : new File(file.content, file.path)
				if(uploadCallback == undefined || !(uploadCallback instanceof Function))
					uploadCallback = (response) => {
						console.log(response)
					}
				this.commonHelpers.upload(uploadCountent,
						`${this.fgApiHost.replace(/https/gi, "wss")}/co2-storage/api/v1/add-file?token=${this.fgApiToken}`,
							uploadCallback)

				// Add it to attached IPFS node
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
					try {
						await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress, that.fgApiToken)
						await that.fgHelpers.queuePin(that.fgApiHost, "estuary", result.cid.toString(), `file_${result.path}_${result.cid.toString()}`, that.selectedAddress, that.fgApiToken)
					} catch (error) {
						console.log(error)
					}
				}, 0)
			}

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

		// date, datetime
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

		// dates, datetimes, daterange(s)
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

		return {
			assetElements: assetElements,
			error: null
		}
	}

	async _extractNestedTemplates(template) {
		if(Array.isArray(template)) {
			for (let el of template) {
				if(Array.isArray(el)) {
					let val = el[1]
					if((val.type.toLowerCase() == 'schema' || val.type.toLowerCase() == 'template' || val.type.toLowerCase() == 'schema-list' || val.type.toLowerCase() == 'template-list') && val.value && typeof val.value != 'string') {
						try {
							const cid = this.commonHelpers.cidObjToCid(val.value)
							const subTemplate = (await this.ipfs.dag.get(cid)).value
							val.value = subTemplate
							for (const subTemplateKey of Object.keys(subTemplate)) {
								if((subTemplate[subTemplateKey].type.toLowerCase() == 'schema' || subTemplate[subTemplateKey].type.toLowerCase() == 'template' || subTemplate[subTemplateKey].type.toLowerCase() == 'schema-list' || subTemplate[subTemplateKey].type.toLowerCase() == 'template-list') && subTemplate[subTemplateKey].value)
									val.value = await this._extractNestedTemplates(val.value)
							}
						} catch (error) {
							
						}
					}
				}
				else {
					const key = Object.keys(el)[0]
					let val = el[key]
					if((val.type.toLowerCase() == 'schema' || val.type.toLowerCase() == 'template' || val.type.toLowerCase() == 'schema-list' || val.type.toLowerCase() == 'template-list') && val.value && typeof val.value != 'string') {
						try {
							const cid = this.commonHelpers.cidObjToCid(val.value)
							let subTemplate = (await this.ipfs.dag.get(cid)).value
							val.value = subTemplate
							for (const subTemplateKey of Object.keys(subTemplate)) {
								if((subTemplate[subTemplateKey].type.toLowerCase() == 'schema' || subTemplate[subTemplateKey].type.toLowerCase() == 'template' || subTemplate[subTemplateKey].type.toLowerCase() == 'schema-list' || subTemplate[subTemplateKey].type.toLowerCase() == 'template-list') && subTemplate[subTemplateKey].value)
									val.value = await this._extractNestedTemplates(val.value)
							}
						} catch (error) {
							
						}
					}
				}
			}
		}
		else {
			const keys = Object.keys(template)
			for (const key of keys) {
				let val = template[key]
				if((val.type.toLowerCase() == 'schema' || val.type.toLowerCase() == 'template' || val.type.toLowerCase() == 'schema-list' || val.type.toLowerCase() == 'template-list') && val.value && typeof val.value != 'string') {
					try {
						const cid = this.commonHelpers.cidObjToCid(val.value)
						let subTemplate = (await this.ipfs.dag.get(cid)).value
						val.value = subTemplate
						for (const subTemplateKey of Object.keys(subTemplate)) {
							if((subTemplate[subTemplateKey].type.toLowerCase() == 'schema' || subTemplate[subTemplateKey].type.toLowerCase() == 'template' || subTemplate[subTemplateKey].type.toLowerCase() == 'schema-list' || subTemplate[subTemplateKey].type.toLowerCase() == 'template-list') && subTemplate[subTemplateKey].value)
								val.value = await this._extractNestedTemplates(val.value)
						}
					} catch (error) {
						
					}
				}
			}
		}

		return template
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

	async updateAccount(assets, templates, provenance, chainName) {
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

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
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
			"templates": (templates != undefined) ? templates : ((current.templates != undefined) ? current.templates : []),
			"assets": (assets != undefined) ? assets : ((current.assets != undefined) ? current.assets : []),
			"provenance": (provenance != undefined) ? provenance : ((current.provenance != undefined) ? current.provenance : [])
		}
		const walletChainCid = await this.ipfs.dag.put(walletChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidw
		try {
			cidw = (await this.fgHelpers.addCborDag(this.fgApiHost, walletChain, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		if(walletChainCid.toString() != cidw)
			await this.ipfs.pin.add(CID.parse(cidw))

		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidw, `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidw, `wallet_chain_${that.selectedAddress}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		walletsChain["parent"] = walletsCid
		walletsChain["timestamp"] = (new Date()).toISOString()
		walletsChain["version"] = this.commonHelpers.walletsVersion
		walletsChain[this.selectedAddress] = cidw

		const walletsChainCid = await this.ipfs.dag.put(walletsChain, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidws
		try {
			cidws = (await this.fgHelpers.addCborDag(this.fgApiHost, walletsChain, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}
		if(walletsChainCid.toString() != cidws)
			await this.ipfs.pin.add(CID.parse(cidws))

		try {
			await this.fgHelpers.updateHead(chainName, this.fgApiHost, walletsChain["parent"], cidws, this.selectedAddress, this.fgApiToken)
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
						cid: cidws,
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

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let estuaryKeyResponse
		try {
			estuaryKeyResponse = (await this.fgHelpers.estuaryKey(this.fgApiHost, this.selectedAddress, this.fgApiToken)).result
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

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let addEstuaryKeyResponse
		try {
			addEstuaryKeyResponse = (await this.fgHelpers.addEstuaryKey(this.fgApiHost, this.selectedAddress, key, expiry, this.fgApiToken)).result
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

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let removeEstuaryKeyResponse
		try {
			removeEstuaryKeyResponse = (await this.fgHelpers.removeEstuaryKey(this.fgApiHost, this.selectedAddress, this.fgApiToken)).result
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

	async search(chainName, phrases, dataStructure, cid, parent, name, description, base, reference, contentCid,
		creator, createdFrom, createdTo, protocol, license, version, offset, limit, sortBy, sortDir) {
		let search
		try {
			search = (await this.fgHelpers.search(this.fgApiHost, chainName, phrases, dataStructure, cid,
				parent, name, description, base, reference, contentCid, creator, createdFrom, createdTo, protocol, license,
				version, offset, limit, sortBy, sortDir)).result.data
		} catch (searchResponse) {
			if(searchResponse.error.response.status != 404) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: searchResponse.error.response
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
		const web3Request = this.auth.initWeb3()
		if(web3Request.error)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: web3Request.error
				})
			})
		const web3 = web3Request.web3
		if(!web3.currentProvider && !web3.givenProvider)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: 'No valid web3 provider is found!'
				})
			})
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
			const contract = new web3.eth.Contract(this.verifyingCidSignatureContractABI, this.verifyingCidSignatureContractAddress)
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

	makeCid(cid) {
		let cids = cid
		if(typeof cid == 'object' && !Array.isArray(cid) && Object.keys(cid)[0] == "/") {
			cids = cid[Object.keys(cid)[0]]
		}
		else if(typeof cid == 'object' && !Array.isArray(cid) && Object.keys(cid)[0] == "code" && Object.keys(cid)[1] == "hash") {
			return cid
		}

		try {
			return CID.parse(cids)
		} catch (error) {
			return null
		}
	}

	async signCid(cid) {
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

		const from = authResponse.result;
		const msgParams = {
			domain: {
			  name: 'CO2.storage Record',
			  version: '1',
			  chainId: chainId,
			  verifyingContract: this.verifyingCidSignatureContractAddress,
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
					verifyingContract: that.verifyingCidSignatureContractAddress,
					chainId: chainId,
					cid: cid,
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

	async provenanceMessages(cid, indexingChain) {
		let provenance
		try {
			provenance = await this.search(indexingChain, null, 'provenance', null, null, null, null, null, cid)
			if(provenance.error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: provenance.error
					})
				})
			}
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
				error: null,
				result: provenance.result
			})
		})
	}

	async addProvenanceMessage(cid, contributor, licence, notes, indexingChain) {
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

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		let account
		try {
			account = await this.getAccount(indexingChain)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		let provenanceMessages = (account.result.value.provenance) ? account.result.value.provenance : []

		const timestamp = (new Date()).toISOString()

		const provenanceMessage = {
			"protocol" : "provenance protocol",
			"version" : this.commonHelpers.provenanceProtocolVersion,
			"data_license" : licence,
			"provenance_community": indexingChain,
			"contributor_name" : contributor,
			"contributor_key" : this.selectedAddress,     
			"payload" : cid,
			"notes": notes,
			"timestamp": timestamp
		}

		const provenanceMessageCid = await this.ipfs.dag.put(provenanceMessage, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidtb
		try {
			cidtb = (await this.fgHelpers.addCborDag(this.fgApiHost, provenanceMessage, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}
		if(provenanceMessageCid.toString() != cidtb)
			await this.ipfs.pin.add(CID.parse(cidtb))

		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidtb, `provenance_message_${cidtb}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidtb, `provenance_message_${cidtb}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		let signatureResponse
		try {
			signatureResponse = await this.signCid(cidtb)
			if(signatureResponse.error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: signatureResponse.error
					})
				})
			}
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		const provenanceMessageSignature = {
			"protocol" : "provenance protocol",
			"version" : this.commonHelpers.provenanceProtocolVersion,
			"provenance_message": cidtb,
			"signature" : signatureResponse.result.signature,
			"contributor_key" : signatureResponse.result.account,     
			"method" : signatureResponse.result.method,
			"verifying_contract" : signatureResponse.result.verifyingContract,
			"chain_id" : signatureResponse.result.chainId,
			"timestamp": timestamp
		}

		const provenanceMessageSignatureCid = await this.ipfs.dag.put(provenanceMessageSignature, {
			storeCodec: 'dag-cbor',
			hashAlg: 'sha2-256',
			pin: true
		})

		let cidtbs
		try {
			cidtbs = (await this.fgHelpers.addCborDag(this.fgApiHost, provenanceMessageSignature, this.fgApiToken)).result.data.cid
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}
		if(provenanceMessageSignatureCid.toString() != cidtbs)
			await this.ipfs.pin.add(CID.parse(cidtbs))

		setTimeout(async () => {
			try {
				await that.fgHelpers.queuePin(that.fgApiHost, "filecoin-green", cidtbs, `provenance_message_signature_${cidtbs}`, that.selectedAddress, that.fgApiToken)
				await that.fgHelpers.queuePin(that.fgApiHost, "estuary", cidtbs, `provenance_message_signature_${cidtbs}`, that.selectedAddress, that.fgApiToken)
			} catch (error) {
				console.log(error)
			}
		}, 0)

		provenanceMessages.push(cidtbs)

		try {
			await this.updateAccount(null, null, provenanceMessages, indexingChain)
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		const responseMessage = {
			"protocol" : "provenance protocol",
			"version" : this.commonHelpers.provenanceProtocolVersion,
			"data_license" : licence,
			"provenance_community": indexingChain,
			"contributor_name" : contributor,
			"contributor_key" : this.selectedAddress,     
			"payload" : cid,
			"notes": notes,
			"provenance_message": cidtb,
			"signature" : signatureResponse.result.signature,
			"method" : signatureResponse.result.method,
			"verifying_contract" : signatureResponse.result.verifyingContract,
			"chain_id" : signatureResponse.result.chainId,
			"timestamp": timestamp
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: responseMessage
			})
		})
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
			  name: 'CO2.storage Message',
			  version: '1',
			  chainId: chainId,
			  verifyingContract: this.verifyingMessageSignatureContractAddress,
			},
			message: {
			  signer: from,
			  message: message
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
				{ name: 'message', type: 'string' }
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
					verifyingContract: that.verifyingMessageSignatureContractAddress,
					chainId: chainId,
					message: message,
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
						error: searchResponse.error
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

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		let runBacalhauJobResponse
		try {
			runBacalhauJobResponse = (await this.fgHelpers.runBacalhauJob(this.fgApiHost, this.selectedAddress, job,
				parameters, inputs, container, commands, swarm, this.fgApiToken)).result
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

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		let bacalhauJobStatusResponse
		try {
			bacalhauJobStatusResponse = (await this.fgHelpers.bacalhauJobStatus(this.fgApiHost, this.selectedAddress, job, this.fgApiToken)).result
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

	async updateProfileName(name) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let updateProfileNameResponse
		try {
			updateProfileNameResponse = (await this.fgHelpers.updateProfileName(this.fgApiHost, name, this.selectedAddress, this.fgApiToken)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(updateProfileNameResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: updateProfileNameResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: updateProfileNameResponse
			})
		})
	}

	async updateProfileDefaultDataLicense(license) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let updateProfileDefaultDataLicenseResponse
		try {
			updateProfileDefaultDataLicenseResponse = (await this.fgHelpers.updateProfileDefaultDataLicense(this.fgApiHost, license, this.selectedAddress, this.fgApiToken)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(updateProfileDefaultDataLicenseResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: updateProfileDefaultDataLicenseResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: updateProfileDefaultDataLicenseResponse
			})
		})
	}

	async getAccountDataSize() {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		if(this.fgApiToken == undefined)
			try {
				this.fgApiToken = (await this.getApiToken(true)).result.data.token
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: error
					})
				})
			}

		let accountDataSizeResponse
		try {
			accountDataSizeResponse = (await this.fgHelpers.accountDataSize(this.fgApiHost, this.selectedAddress, this.fgApiToken)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(accountDataSizeResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: accountDataSizeResponse,
					result: null
				})
			})
		}

		const creator = accountDataSizeResponse.data.creator
		const size = accountDataSizeResponse.data.size

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: {
					creator: creator,
					size: size
				}
			})
		})
	}

	async addFunction(name, description, functionType, functionContainer, inputType, outputType) {
		const authResponse = await this.authenticate()
		if(authResponse.error != null)
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: authResponse.error
				})
			})
		this.selectedAddress = authResponse.result		

		if(this.fgApiToken == undefined)
		try {
			this.fgApiToken = (await this.getApiToken(true)).result.data.token
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					result: null,
					error: error
				})
			})
		}

		let addFunctionResponse
		try {
			addFunctionResponse = (await this.fgHelpers.addFunction(this.fgApiHost, this.selectedAddress,
				name, description, functionType, functionContainer, inputType, outputType, this.fgApiToken)).result
		} catch (error) {
			return new Promise((resolve, reject) => {
				reject({
					error: error,
					result: null
				})
			})
		}

		if(addFunctionResponse.status > 299) {
			return new Promise((resolve, reject) => {
				reject({
					error: addFunctionResponse,
					result: null
				})
			})
		}

		return new Promise((resolve, reject) => {
			resolve({
				error: null,
				result: addFunctionResponse.data
			})
		})
	}

	async searchFunctions(phrases, name, description, functionType, functionContainer, inputType, outputType,
		retired, creator, createdFrom, createdTo, offset, limit, sortBy, sortDir) {
		let search
		try {
			search = (await this.fgHelpers.searchFunctions(this.fgApiHost, phrases, name, description,
				functionType, functionContainer, inputType, outputType, creator, createdFrom, createdTo,
				offset, limit, sortBy, sortDir)).result.data
		} catch (searchResponse) {
			if(searchResponse.error.response.status != 404) {
				return new Promise((resolve, reject) => {
					reject({
						result: null,
						error: searchResponse.error.response
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
}