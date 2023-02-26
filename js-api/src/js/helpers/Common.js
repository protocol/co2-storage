import axios from 'axios'

export class CommonHelpers {
	walletsVersion = "1.0.1"
	walletVersion = "1.0.1"
	templateBlockVersion = "1.0.1"
	assetBlockVersion = "1.0.1"

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
}