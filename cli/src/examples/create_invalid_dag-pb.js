import { FGStorage } from '@co2-storage/js-api'
import fs from 'fs'
import path from 'path'

import * as codec from '@ipld/dag-pb'
import { UnixFS } from 'ipfs-unixfs'
import * as Block from 'multiformats/block'
import { sha256 as hasher } from 'multiformats/hashes/sha2'

const { createLink, createNode, prepare, encode } = codec

const authType = "pk"
const ipfsNodeType = "client"
const ipfsNodeAddr = "/ip4/127.0.0.1/tcp/5001"
const fgApiUrl = "http://localhost:3020"
//const ipfsNodeAddr = "/dns4/web1.co2.storage/tcp/5002/https"
//const fgApiUrl = "https://web1.co2.storage"

const fgStorage = new FGStorage({authType: authType, ipfsNodeType: ipfsNodeType, ipfsNodeAddr: ipfsNodeAddr, fgApiHost: fgApiUrl})
const ipfs = await fgStorage.ensureIpfsIsRunning()
const docPath = './assets/test.zip'
let slices = []

function readFileAsPromise(path, options) {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(path, options)

        const chunks = []
        fileStream.on('data', (data) => {
            chunks.push(data)
        })

        fileStream.on('close', () => {
            resolve(chunks)
        })

        fileStream.on('error', (err) => {
            reject(err)
        })
    })
}

// Queue chunk
async function queueChunk(slice) {
    slices.push(await ipfs.add(slice, {
        'cidVersion': 1,
        'hashAlg': 'sha2-256',
        'wrapWithDirectory': false,
        'chunker': `size-1048576`,
//        'rawLeaves': true,
        'progress': (bytes) => {
            console.log(`Adding ${bytes} bytes of slice ${slices.length} to IPFS`)
            }
        }))
}

// Link chunks
async function linkChunks() {
    let results = await Promise.all(slices)
    let links = []

    const node = new UnixFS({ type: 'file' })

    for (const result of results) {
console.log(`${result.cid}: ${result.size}`)
        const link = createLink("", result.size, result.cid)
        //const link = createLink(result.path, result.size, result.cid)
        links.push(link)
        node.addBlockSize(BigInt(result.size))
    }

    const value = createNode(node.marshal(), links)
    const block = await Block.encode({ value, codec, hasher })

    const bcid = block.cid

    const encoded = encode(prepare(value))
    const cid = await ipfs.block.put(encoded)

    console.log(bcid.toString())

    console.dir(await ipfs.object.stat(bcid), { depth: null })
}
/*
const data1 = await readFileAsPromise(docPath, {start: 0, end: 1999999})
const data2 = await readFileAsPromise(docPath, {start: 2000000, end: 3999999})
const data3 = await readFileAsPromise(docPath, {start: 4000000, end: 5999999})
const data4 = await readFileAsPromise(docPath, {start: 6000000})
*/
const data1 = await readFileAsPromise(docPath, {start: 0, end: 1048575})
const data2 = await readFileAsPromise(docPath, {start: 1048576, end: 2097151})
const data3 = await readFileAsPromise(docPath, {start: 2097152, end: 3145727})
const data4 = await readFileAsPromise(docPath, {start: 3145728, end: 4194303})
const data5 = await readFileAsPromise(docPath, {start: 4194302, end: 5242877})
const data6 = await readFileAsPromise(docPath, {start: 5242876, end: 6291451})
const data7 = await readFileAsPromise(docPath, {start: 6291452, end: 7340027})
const data8 = await readFileAsPromise(docPath, {start: 7340028})

await queueChunk(data1)
await queueChunk(data2)
await queueChunk(data3)
await queueChunk(data4)
await queueChunk(data5)
await queueChunk(data6)
await queueChunk(data7)
await queueChunk(data8)

await linkChunks()

await new Promise(resolve => setTimeout(resolve, 1000))
process.exit()