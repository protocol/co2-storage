import { CommonHelpers } from './Common.js'

export class FGHelpers {
    constructor() {
		this.commonHelpers = new CommonHelpers()
    }

	async signup(host, password, account, refresh) {
		const signupUri = `${host}/co2-storage/api/v1/signup`
		const signupData = {
			"password": password,
			"account": account,
			"refresh": refresh
		}
		const signupMethod = 'POST'
		const signupHeaders = {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const signupResponseType = null

		let signupResponse

		try {
			signupResponse = await this.commonHelpers.rest(signupUri, signupMethod,
				signupHeaders, signupResponseType, signupData)

			if(signupResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: signupResponse,
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
				error: null,
				result: signupResponse
			})
		})
	}

	async authenticate(host, token) {
		const authenticateUri = `${host}/co2-storage/api/v1/authenticate/${token}`
		const authenticateMethod = 'GET'
		const authenticateHeaders = {
			'Accept': 'application/json'
		}
		const authenticateResponseType = null
		let authenticateResponse

		try {
			authenticateResponse = await this.commonHelpers.rest(authenticateUri, authenticateMethod, authenticateHeaders, authenticateResponseType)

			if(authenticateResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: authenticateResponse,
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
				error: null,
				result: authenticateResponse
			})
		})
	}

	async head(host, chainName) {
		const headUri = `${host}/co2-storage/api/v1/head${(chainName != undefined) ? '?chain_name=' + chainName : ''}`
		const headMethod = 'GET'
		const headHeaders = {
			'Accept': 'application/json'
		}
		const headResponseType = null
		let headResponse

		try {
			headResponse = await this.commonHelpers.rest(headUri, headMethod, headHeaders, headResponseType)

			if(headResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: headResponse,
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
				error: null,
				result: headResponse
			})
		})
	}

	async updateHead(chainName, host, parent, head, account, token) {
		const updateHeadUri = `${host}/co2-storage/api/v1/update-head`
		const updateHeadData = {
			"chain_name": (chainName) ? chainName : null,
			"head": parent,
			"new_head": head,
			"account": account,
			"token": token
		}
		const updateHeadMethod = 'PUT'
		const updateHeadHeaders = {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const updateHeadResponseType = null

		let updateHeadResponse

		try {
			updateHeadResponse = await this.commonHelpers.rest(updateHeadUri, updateHeadMethod,
				updateHeadHeaders, updateHeadResponseType, updateHeadData)

			if(updateHeadResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: updateHeadResponse,
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
				error: null,
				result: updateHeadResponse
			})
		})
	}

	async updateHeadWithSignUp(chainName, host, account, head, newHead) {
		let token = process.env.FG_TOKEN
		let signup = null, signedUp = null, updateHead = null, updated = null

		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		// Update head record
		try {
			updateHead = (await this.updateHead(chainName, host, head, newHead, account, token)).result

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

	async estuaryKey(host, account, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const estuaryKeyUri = `${host}/co2-storage/api/v1/estuary-key?account=${account}&token=${token}`
		const estuaryKeyMethod = 'GET'
		const estuaryKeyHeaders = {
			'Accept': 'application/json'
		}
		const estuaryKeyResponseType = null

		let estuaryKeyResponse

		try {
			estuaryKeyResponse = await this.commonHelpers.rest(estuaryKeyUri, estuaryKeyMethod, estuaryKeyHeaders, estuaryKeyResponseType)

			if(estuaryKeyResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: estuaryKeyResponse,
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
				error: null,
				result: estuaryKeyResponse
			})
		})
	}

	async addEstuaryKey(host, account, key, validity, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const addEstuaryKeyUri = `${host}/co2-storage/api/v1/add-estuary-key`
		const addEstuaryKeyData = {
			"account": account,
			"key": key,
			"validity": validity,
			"token": token
		}
		const addEstuaryKeyMethod = 'POST'
		const addEstuaryKeyHeaders = {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const addEstuaryKeyResponseType = null

		let addEstuaryKeyResponse

		try {
			addEstuaryKeyResponse = await this.commonHelpers.rest(addEstuaryKeyUri, addEstuaryKeyMethod,
				addEstuaryKeyHeaders, addEstuaryKeyResponseType, addEstuaryKeyData)

			if(addEstuaryKeyResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: addEstuaryKeyResponse,
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
				error: null,
				result: addEstuaryKeyResponse
			})
		})
	}

	async removeEstuaryKey(host, account, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const removeEstuaryKeyUri = `${host}/co2-storage/api/v1/remove-estuary-key?account=${account}&token=${token}`
		const removeEstuaryKeyMethod = 'DELETE'
		const removeEstuaryKeyHeaders = {
			'Accept': 'application/json'
		}
		const removeEstuaryKeyResponseType = null
		let removeEstuaryKeyResponse

		try {
			removeEstuaryKeyResponse = await this.commonHelpers.rest(removeEstuaryKeyUri, removeEstuaryKeyMethod, removeEstuaryKeyHeaders, removeEstuaryKeyResponseType)

			if(removeEstuaryKeyResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: removeEstuaryKeyResponse,
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
				error: null,
				result: removeEstuaryKeyResponse
			})
		})
	}

	async search(host, chainName, phrases, dataStructure, cid, parent, name, description,
		base, reference, contentCid, creator, createdFrom, createdTo, version, offset, limit, sortBy, sortDir) {
		chainName = (chainName) ? chainName : ''
		phrases = (phrases) ? phrases : ''
		dataStructure = (dataStructure) ? dataStructure : ''
		cid = (cid) ? cid : ''
		parent = (parent) ? parent : ''
		name = (name) ? name : ''
		description = (description) ? description : ''
		base = (base) ? base : ''
		reference = (reference) ? reference : ''
		contentCid = (contentCid) ? contentCid : ''
		creator = (creator) ? creator : ''
		createdFrom = (createdFrom) ? createdFrom : ''
		createdTo = (createdTo) ? createdTo : ''
		version = (version) ? version : ''
		offset = (offset) ? offset : ''
		limit = (limit) ? limit : ''
		sortBy = (sortBy) ? sortBy : ''
		sortDir = (sortDir) ? sortDir : ''

		const searchUri = `${host}/co2-storage/api/v1/search?chain_name=${chainName}&phrases=${phrases}&data_structure=${dataStructure}&cid=${cid}&parent=${parent}&name=${name}&description=${description}&base=${base}&reference=${reference}&content_cid=${contentCid}&creator=${creator}&created_from=${createdFrom}&created_to=${createdTo}&version=${version}&offset=${offset}&limit=${limit}&sort_by=${sortBy}&sort_dir=${sortDir}`
		const searchMethod = 'GET'
		const searchHeaders = {
			'Accept': 'application/json'
		}
		const searchResponseType = null
		let searchResponse

		try {
			searchResponse = await this.commonHelpers.rest(searchUri, searchMethod, searchHeaders, searchResponseType)

			if(searchResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: searchResponse,
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
				error: null,
				result: searchResponse
			})
		})
	}

	async queuePin(host, service, cid, name, account, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const queuePinUri = `${host}/co2-storage/api/v1/queue-pin`
		const queuePinData = {
			"service": service,
			"cid": cid,
			"name": name,
			"account": account,
			"token": token
		}
		const queuePinMethod = 'POST'
		const queuePinHeaders = {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const queuePinResponseType = null

		let queuePinResponse

		try {
			queuePinResponse = await this.commonHelpers.rest(queuePinUri, queuePinMethod,
				queuePinHeaders, queuePinResponseType, queuePinData)

			if(queuePinResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: queuePinResponse,
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
				error: null,
				result: queuePinResponse
			})
		})
	}

	async removeUpdatedContent(host, cid, account, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const removeUpdatedContentUri = `${host}/co2-storage/api/v1/remove-updated-content?cid=${cid}&account=${account}&token=${token}`
		const removeUpdatedContentMethod = 'DELETE'
		const removeUpdatedContentHeaders = {
			'Accept': 'application/json'
		}
		const removeUpdatedContentResponseType = null
		let removeUpdatedContentResponse

		try {
			removeUpdatedContentResponse = await this.commonHelpers.rest(removeUpdatedContentUri, removeUpdatedContentMethod, removeUpdatedContentHeaders, removeUpdatedContentResponseType)

			if(removeUpdatedContentResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: removeUpdatedContentResponse,
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
				error: null,
				result: removeUpdatedContentResponse
			})
		})
	}

	async listDataChains(host, offset, limit) {
		offset = (offset) ? offset : ''
		limit = (limit) ? limit : ''

		const listDataChainsUri = `${host}/co2-storage/api/v1/list-data-chains?offset=${offset}&limit=${limit}`
		const listDataChainsMethod = 'GET'
		const listDataChainsHeaders = {
			'Accept': 'application/json'
		}
		const listDataChainsResponseType = null
		let listDataChainsResponse

		try {
			listDataChainsResponse = await this.commonHelpers.rest(listDataChainsUri, listDataChainsMethod, listDataChainsHeaders, listDataChainsResponseType)

			if(listDataChainsResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: listDataChainsResponse,
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
				error: null,
				result: listDataChainsResponse
			})
		})
	}

	async runBacalhauJob(host, account, job, parameters, inputs, container, commands, swarm, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const runBacalhauJobUri = `${host}/co2-storage/api/v1/run-bacalhau-job`
		const runBacalhauJobData = {
			"token": token,
			"type": job,
			"parameters": parameters,
			"inputs": inputs,
			"container": container,
			"commands": commands,
			"swarm": swarm
		}
		const runBacalhauJobMethod = 'POST'
		const runBacalhauJobHeaders = {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const runBacalhauJobResponseType = null

		let runBacalhauJobResponse

		try {
			runBacalhauJobResponse = await this.commonHelpers.rest(runBacalhauJobUri, runBacalhauJobMethod, runBacalhauJobHeaders,
				runBacalhauJobResponseType, runBacalhauJobData)

			if(runBacalhauJobResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: runBacalhauJobResponse,
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
				error: null,
				result: runBacalhauJobResponse
			})
		})
	}

	async bacalhauJobStatus(host, account, job, token) {
		let signup = null, signedUp = null

		if(token == undefined)
			token = process.env.FG_TOKEN
		
		if(token == undefined) {
			try {
				signup = (await this.signup(host, process.env.MASTER_PASSWORD, account, false)).result

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
			} catch (error) {
				return new Promise((resolve, reject) => {
					reject({
						error: error,
						result: null
					})
				})
			}
		}

		const bacalhauJobStatusUri = `${host}/co2-storage/api/v1/bacalhau-job-status?account=${account}&token=${token}&job=${job}`
		const bacalhauJobStatusMethod = 'GET'
		const bacalhauJobStatusHeaders = {
			'Accept': 'application/json'
		}
		const bacalhauJobStatusResponseType = null

		let bacalhauJobStatusResponse

		try {
			bacalhauJobStatusResponse = await this.commonHelpers.rest(bacalhauJobStatusUri, bacalhauJobStatusMethod, bacalhauJobStatusHeaders, bacalhauJobStatusResponseType)

			if(bacalhauJobStatusResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: bacalhauJobStatusResponse,
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
				error: null,
				result: bacalhauJobStatusResponse
			})
		})
	}
}