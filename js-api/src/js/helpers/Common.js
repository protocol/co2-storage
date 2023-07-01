import axios from 'axios'
import { CID } from 'multiformats/cid'
import multihash from 'multihashes'
import * as codec from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import * as Block from 'multiformats/block'
import { sha256 as hasher } from 'multiformats/hashes/sha2'

const { createLink, createNode, prepare, encode, decode } = codec

export class CommonHelpers {
	walletsVersion = "1.0.1"
	walletVersion = "1.0.1"
	templateBlockVersion = "1.0.1"
	assetBlockVersion = "1.0.1"
	typeChecking = 2.0
	provenanceProtocolVersion = "1.0.0"
	functionProtocolVersion = "1.0.0"
	pipelineProtocolVersion = "1.0.0"

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

	async upload(file, host, callback) {
		const that = this
		const blockSize = 1024 * 1024
		host = host.replace('http', 'ws')
		host = host.replace('https', 'wss')
		let ws = new WebSocket(host, {
			headers: {
				"Connection": "upgrade",
				"Upgrade": "websocket"
			}})

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
				ws.send(blob.Buffer)
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
						progress: 0,
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
							progress: 0,
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

	async addFileUsingReadStream(readStream, fileName, ipfs, callback) {
		const that = this
		const blockSize = 1024 * 1024
		let docChunk = []
		let docChunkBytes = 0
		let ipfsAdditions = []
		let completed = false
		let result = null

		readStream.on('error', (error) => {
			console.log(error.message)
			readStream.close()
			readStream.destroy()
			completed = true
		})
		readStream.on('data', async (chunk) => {
			// Concatenate received chunks until
			// min file chunk size is achieved
			docChunk.push(chunk)
			docChunkBytes += chunk.byteLength
			// When mine file chunk is achieved
			// pause read stream and add ipfs file chunk
			if(docChunkBytes >= blockSize) {
				readStream.pause()
				// Queue chunk to be added to ipfs
				await this.queueChunk(ipfs, docChunk, ipfsAdditions, fileName, callback)
				docChunk.length = 0
				docChunkBytes = 0
				// read next chunk
				readStream.resume()
			}
		})
		readStream.on('end', async() => {
			// Queue chunk to be added to ipfs
			await this.queueChunk(ipfs, docChunk, ipfsAdditions, fileName, callback)
			// Link chunks into a final block
			result = await that.linkChunks(ipfs, ipfsAdditions, fileName, callback)
			completed = true
			readStream.close()
			readStream.destroy()
		})

		while(!completed) {
			await new Promise(resolve => setTimeout(resolve, 1000))
		}

		return result
	}

	async addFileUsingFileReader(file, ipfs, callback) {
		const that = this
		const blockSize = 1024 * 1024
		let filePos = 0
		let reader = new FileReader()
		let ipfsAdditions = []
		let blob
		let completed = false
		let result = null

		// Initiate the file transfer by reading the first block from disk
		blob = this.readBlob(file, reader, filePos, blockSize)

		// Add the next file slice to the ipfs once it's read from disk
		reader.onloadend = async function(evt) {
			if (evt.target.readyState == FileReader.DONE) {
				await that.queueChunk(ipfs, blob, ipfsAdditions, file.name, callback)
				filePos += blob.size
				if (filePos >= file.size) {
					result = await that.linkChunks(ipfs, ipfsAdditions, file.name, callback)
					completed = true
					return
				}

				// Read the next file slice
				blob = that.readBlob(file, reader, filePos, blockSize)
			}
		}

		reader.onabort = function() {
			callback({
				code: 400,
				status: 'aborted',
				progress: 0,
				filename: file.name,
				cid: null
			})
			completed = true
		}

		reader.onerror = function() {
			callback({
				code: 500,
				status: 'error',
				progress: 0,
				filename: file.name,
				cid: null
			})
			completed = true
		}

		while(!completed) {
			await new Promise(resolve => setTimeout(resolve, 1000))
		}

		return result
	}

	// Read a slice using FileReader
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

	// Queue chunk to be added to ipfs
	async queueChunk(ipfs, slice, ipfsAdditions, fileName, callback) {
		if(slice.length || slice.size)
			ipfsAdditions.push(await ipfs.add(slice, {
				'cidVersion': 1,
				'hashAlg': 'sha2-256',
				'wrapWithDirectory': false,
				'progress': async (bytes, path) => {
					if(callback) {
						callback({
							code: null,
							status: `Adding ${fileName} slice ${ipfsAdditions.length} to IPFS`,
							progress: bytes,
							filename: fileName,
							cid: null
						})
					}
				}
			}))
	}

	// Link chunks in final ipfs file
	async linkChunks(ipfs, ipfsAdditions, fileName, callback) {
		// Add ipfs chunks as future dag-pb links
		let results = await Promise.all(ipfsAdditions)
		let links = []

		// Create UnixFS node
		const node = new UnixFS({ type: 'file' })

		for (const result of results) {
			if(result.path != '') {
				// Create links from queued chunks
				const link = createLink("", result.size, result.cid)
				//const link = createLink(result.path, result.size, result.cid)
				links.push(link)
				// Increase final node block size for added block
				node.addBlockSize(BigInt(result.size))
				// Invoke callback if existing
				if(callback) {
					callback({
						code: null,
						status: `Linked ${result.cid} to final IPFS node of ${fileName}`,
						progress: node.fileSize(),
						filename: fileName,
						cid: result.cid
					})
				}
			}
		}

		// Build a dag-pb node with links to the chunks
		const value = createNode(node.marshal(), links)
		const block = await Block.encode({ value, codec, hasher })

		// This is a final CID
		const bcid = block.cid

		// Make sure to pin it to IPFS
		const encoded = encode(prepare(value))
		const cid = await ipfs.block.put(encoded)

		if(callback)
			callback({
				code: 200,
				status: `All CID leaves are linked to final IPFS block for ${fileName}`,
				progress: (await ipfs.object.stat(bcid)).CumulativeSize,
				filename: fileName,
				cid: bcid
			})

		return bcid
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