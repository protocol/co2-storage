import axios from 'axios'
import { CID } from 'multiformats/cid'
import multihash from 'multihashes'

export class CommonHelpers {
	walletsVersion = "1.0.1"
	walletVersion = "1.0.1"
	templateBlockVersion = "1.0.1"
	assetBlockVersion = "1.0.1"
	typeChecking = 2.0
	provenanceProtocolVersion = "1.0.0"

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

	upload(file, host, callback) {
		const that = this
		const blockSize = 1024 * 1024;
		let ws = new WebSocket(host)
		let filePos = 0
		let reader = new FileReader()
		let cancel = false
		let blob

		ws.binaryType = 'arraybuffer'

		// Send filename and size to the server when the connection is opened
		ws.onopen = function(evt) {
			const header = '{"filename":"' + file.name + '","size":' + file.size + '}'
			ws.send(header)

			// Initiate the file transfer by reading the first block from disk
			blob = that.readBlob(file, reader, filePos, blockSize)
		}


		// Send the next file block to the server once it's read from disk
		reader.onloadend = function(evt) {
			if (evt.target.readyState == FileReader.DONE) {
				ws.send(blob)
				filePos += blob.size
				callback({
					code: null,
					status: 'uploading',
					progress: (filePos / file.size) * 100.0,
					filename: file.name
				})
				if (filePos >= file.size) {
					callback({
						code: 200,
						status: 'uploaded',
						progress: 100.0,
						filename: file.name
					})
				}
				if (cancel) {
					callback({
						code: 400,
						status: 'cancelled',
						progress: null,
						filename: file.name
					})
				}
			}
		}

		// Process message sent from server
		ws.onmessage = function(e) {
			// Server only sends text messages
			if (typeof e.data === "string") {
				// "NEXT" message confirms the server received the last block
				if (e.data === "NEXT") {
					// If we're not cancelling the upload, read the next file block from disk
					if (cancel) {
						callback({
							code: 400,
							status: 'cancelled',
							progress: null,
							filename: file.name
						})
					} else {
						blob = that.readBlob(file, reader, filePos, blockSize)
					}
				// Otherwise, message is a status update (json)
				} else {
					callback(JSON.parse(e.data))
				}
			}
		}

		ws.onclose = function(evt) {
			ws = null
		}

		ws.onerror = function(evt) {
			ws.close()
			ws = null
			return false
		}
	}

	readBlob(file, reader, filePos, blockSize) {
		let first = filePos
		let last = first + blockSize
		if (last > file.size) {
			last == file.size
		}
		let blob = file.slice(first, last)
		reader.readAsArrayBuffer(blob)
		return blob
	}

	cidObjToCid(cidObj){
		const bytes = Uint8Array.from(Object.values(cidObj.hash))
		let encoded
		try {
			encoded = multihash.encode(bytes, 'sha2-256')
		} catch (error) {
			try {
				encoded = multihash.encode(Buffer.from(bytes), 'sha2-256')
			} catch (error1) {
				return null
			}
		}
		encoded.bytes = bytes
		const cid = CID.createV1(cidObj.code, encoded)
		return cid
	}
}