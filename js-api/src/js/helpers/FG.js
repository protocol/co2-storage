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
		const headUri = `${host}/co2-storage/api/v1/authenticate/${token}`
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

	async head(host) {
		const headUri = `${host}/co2-storage/api/v1/head`
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

	async updateHead(host, parent, head, account, token) {
		const updateHeadUri = `${host}/co2-storage/api/v1/update-head`
		const updateHeadData = {
			"head": parent,
			"new_head": head,
			"account": account,
			"token": token
		}
		const updateHeadMethod = 'POST'
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
}