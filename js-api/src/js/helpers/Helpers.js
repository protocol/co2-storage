import axios from 'axios'

export class Helpers {
    constructor() {
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

	sleep = ms => new Promise(r => setTimeout(r, ms))

	keyExists(key, keys) {
		return {
			exists: keys.filter((k) => {return k.name == key}).length > 0,
			index: keys.map((k) => {return k.name}).indexOf(key)
		}
	}

	async getEstuaryCollections(host) {
		const getAccountsUri = `${host}/collections/`
		const getAccountsMethod = 'GET'
		const getAccountsHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json'
		}
		const getAccountsResponseType = null
		let getAccountsResponse

		try {
			getAccountsResponse = await this.rest(getAccountsUri, getAccountsMethod, getAccountsHeaders, getAccountsResponseType)

			if(getAccountsResponse.status != 200) {
				return new Promise((resolve, reject) => {
					reject({
						error: getAccountsResponse,
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
				result: getAccountsResponse
			})
		})
	}

	async createEstuaryCollection(host, name, description) {
		const createAccountsCollectionUri = `${host}/collections/`
		const createAccountsCollectionData = {
			"name": name,
			"description": description
		}
		const createAccountsCollectionMethod = 'POST'
		const createAccountsCollectionHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const createAccountsCollectionResponseType = null

		let createAccountsCollectionResponse

		try {
			createAccountsCollectionResponse = await this.rest(createAccountsCollectionUri, createAccountsCollectionMethod,
				createAccountsCollectionHeaders, createAccountsCollectionResponseType, createAccountsCollectionData)

			if(createAccountsCollectionResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: createAccountsCollectionResponse,
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
				result: createAccountsCollectionResponse
			})
		})
	}

	async getEstuaryCollectionContents(host, collectionUUID) {
		const collectionContentsUri = `${host}/collections/${collectionUUID}`
		const collectionContentsMethod = 'GET'
		const collectionContentsHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const collectionContentsResponseType = null

		let collectionContentsResponse

		try {
			collectionContentsResponse = await this.rest(collectionContentsUri, collectionContentsMethod,
				collectionContentsHeaders, collectionContentsResponseType)

			if(collectionContentsResponse.status != 200) {
				return new Promise((resolve, reject) => {
					reject({
						error: collectionContentsResponse,
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
				result: collectionContentsResponse
			})
		})
	}

	async pinEstuary(host, name, cid) {
		const pinUri = `${host}/pinning/pins`
		const pinData = {
			"name": name,
			"cid": cid
		}
		const pinMethod = 'POST'
		const pinHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const pinResponseType = null

		let pinResponse

		try {
			pinResponse = await this.rest(pinUri, pinMethod,
				pinHeaders, pinResponseType, pinData)

			if(pinResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: pinResponse,
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
				result: pinResponse
			})
		})
	}

	async addCidToEstuaryCollection(host, collectionUUID, cid, name, path) {
		const addCidToCollectionUri = `${host}/content/add-ipfs`
		const addCidToCollectionData = {
			"filename": name,
			"root": cid,
			"coluuid": collectionUUID,
			"dir": (path != undefined) ? path : "/"
		}
		const addCidToCollectionMethod = 'POST'
		const addCidToCollectionHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const addCidToCollectionResponseType = null

		let addCidToCollectionResponse

		try {
			addCidToCollectionResponse = await this.rest(addCidToCollectionUri, addCidToCollectionMethod,
				addCidToCollectionHeaders, addCidToCollectionResponseType, addCidToCollectionData)
	
			if(addCidToCollectionResponse.status > 299) {
				return new Promise((resolve, reject) => {
					reject({
						error: addCidToCollectionResponse,
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
				result: addCidToCollectionResponse
			})
		})
	}

	async listEstuaryPins(host) {
		const listPinsUri = `${host}/pinning/pins`
		const listPinsMethod = 'GET'
		const listPinsHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const listPinsResponseType = null

		const listPinsResponse = await this.rest(listPinsUri, listPinsMethod,
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

	async removeEstuaryPin(host, pinId) {
		const removePinUri = `${host}/pinning/pins/${pinId}`
		const removePinMethod = 'DELETE'
		const removePinHeaders = {
			'Authorization': `Bearer ${process.env.ESTUARY_API_KEY}`,
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
		const removePinResponseType = null

		const removePinResponse = await this.rest(removePinUri, removePinMethod,
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
}